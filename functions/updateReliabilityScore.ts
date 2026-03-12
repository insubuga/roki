import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Score delta per event type (negative = degrades score)
const EVENT_DELTAS = {
  cycle_delay:           -3,
  locker_failure:        -5,
  driver_delay:          -2,
  route_variance:        -2,
  pickup_missed:         -8,
  node_capacity_breach:  -4,
  on_time_delivery:      +1,
  system_recovery:       +2,
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { event_type, entity_type, entity_id, order_id, notes } = await req.json();

    if (!event_type || !entity_type || !entity_id) {
      return Response.json({ error: 'event_type, entity_type, entity_id required' }, { status: 400 });
    }

    const delta = EVENT_DELTAS[event_type];
    if (delta === undefined) {
      return Response.json({ error: `Unknown event_type: ${event_type}` }, { status: 400 });
    }

    // 1. Log the event
    await base44.asServiceRole.entities.ReliabilityLog.create({
      user_email: entity_type === 'user' ? entity_id : null,
      event_type,
      order_id: order_id || null,
      impact_score: Math.abs(delta),
      recovery_action: delta > 0 ? 'positive_event' : null,
    });

    console.log(`ReliabilityLog created: ${event_type} for ${entity_type}:${entity_id}`);

    // 2. Fetch or init the ReliabilityScore record
    const existing = await base44.asServiceRole.entities.ReliabilityScore.filter({
      entity_type,
      entity_id,
    });

    const now = new Date().toISOString();

    if (existing.length > 0) {
      const record = existing[0];
      const currentScore = record.overall_score ?? 100;
      const newScore = Math.max(0, Math.min(100, currentScore + delta));

      // Recalculate SLA adherence rate from recent logs
      const recentLogs = await base44.asServiceRole.entities.ReliabilityLog.filter(
        entity_type === 'user' ? { user_email: entity_id } : {}
      );
      const onTimeCount = recentLogs.filter(l => l.event_type === 'on_time_delivery').length;
      const totalCount = recentLogs.length || 1;
      const slaRate = Math.round((onTimeCount / totalCount) * 100);

      const trend = newScore > currentScore ? 'improving' : newScore < currentScore ? 'declining' : 'stable';

      await base44.asServiceRole.entities.ReliabilityScore.update(record.id, {
        overall_score: newScore,
        sla_adherence_rate: slaRate,
        incident_count_30d: (record.incident_count_30d || 0) + (delta < 0 ? 1 : 0),
        trend,
        last_calculated: now,
      });

      console.log(`ReliabilityScore updated: ${currentScore} → ${newScore} (${trend})`);
      return Response.json({ success: true, previous: currentScore, new: newScore, trend });
    } else {
      // Create initial record
      const initialScore = Math.max(0, 100 + delta);
      await base44.asServiceRole.entities.ReliabilityScore.create({
        entity_type,
        entity_id,
        overall_score: initialScore,
        sla_adherence_rate: delta >= 0 ? 100 : 80,
        on_time_delivery_rate: delta >= 0 ? 100 : 80,
        incident_count_30d: delta < 0 ? 1 : 0,
        trend: delta < 0 ? 'declining' : 'stable',
        last_calculated: now,
      });

      console.log(`ReliabilityScore created: ${initialScore}`);
      return Response.json({ success: true, previous: 100, new: initialScore, trend: 'new' });
    }
  } catch (error) {
    console.error('updateReliabilityScore error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});