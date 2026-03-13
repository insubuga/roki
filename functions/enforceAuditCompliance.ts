import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Scheduled automation to enforce data retention & compliance policies
 * Runs daily to: archive old logs, flag for deletion, generate compliance reports
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    console.log('[COMPLIANCE] Enforcing retention policies...');

    // Get expired audit logs
    const expiredLogs = await base44.asServiceRole.entities.AuditLog.filter({
      retention_until: { $lt: new Date().toISOString() }
    }, 'retention_until', 1000);

    console.log(`[COMPLIANCE] Found ${expiredLogs.length} expired log entries`);

    let archived = 0;
    let deleted = 0;

    for (const log of expiredLogs) {
      try {
        // For GDPR compliance: delete PII-heavy logs after retention period
        const hasPersonalData = log.compliance_flags?.includes('GDPR');
        
        if (hasPersonalData && log.retention_until < new Date().toISOString()) {
          // Delete personal data logs
          await base44.asServiceRole.entities.AuditLog.delete(log.id);
          deleted++;
          console.log(`[COMPLIANCE] Deleted expired GDPR log: ${log.event_id}`);
        } else {
          // Archive non-personal logs (anonymize PII)
          const archivedLog = {
            ...log,
            ip_address: 'ARCHIVED',
            user_agent: 'ARCHIVED',
            actor_email: 'ARCHIVED'
          };
          await base44.asServiceRole.entities.AuditLog.update(log.id, archivedLog);
          archived++;
        }
      } catch (error) {
        console.error(`[COMPLIANCE] Failed to process log ${log.event_id}: ${error.message}`);
      }
    }

    // Generate daily compliance snapshot
    const today = new Date().toISOString().split('T')[0];
    const dailyLogs = await base44.asServiceRole.entities.AuditLog.filter({
      timestamp: { $gte: `${today}T00:00:00Z` }
    }, '-timestamp', 10000);

    const complianceSnapshot = {
      date: today,
      total_events: dailyLogs.length,
      by_type: {},
      by_actor: {},
      critical_events: 0,
      failed_operations: 0
    };

    for (const log of dailyLogs) {
      complianceSnapshot.by_type[log.event_type] = (complianceSnapshot.by_type[log.event_type] || 0) + 1;
      complianceSnapshot.by_actor[log.actor_email] = (complianceSnapshot.by_actor[log.actor_email] || 0) + 1;
      
      if (log.severity === 'critical') complianceSnapshot.critical_events++;
      if (log.status === 'failed') complianceSnapshot.failed_operations++;
    }

    console.log(`[COMPLIANCE] Daily snapshot: ${complianceSnapshot.total_events} events, ${complianceSnapshot.critical_events} critical`);

    return Response.json({
      success: true,
      archived,
      deleted,
      snapshot: complianceSnapshot,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`[COMPLIANCE] Enforcement failed: ${error.message}`);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});