import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Scheduled automation: advances cycles through facility processing states
// washing (8h+) → drying, drying (4h+) → ready
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const washingCutoff = new Date(now.getTime() - 8 * 60 * 60 * 1000);  // 8 hours
    const dryingCutoff  = new Date(now.getTime() - 4 * 60 * 60 * 1000);  // 4 hours

    // --- washing → drying ---
    const washingCycles = await base44.asServiceRole.entities.Cycle.filter({ status: 'washing' });
    const advancedToDrying = [];
    for (const cycle of washingCycles) {
      const lastUpdate = new Date(cycle.updated_date || cycle.created_date);
      if (lastUpdate < washingCutoff) {
        await base44.asServiceRole.entities.Cycle.update(cycle.id, { status: 'drying' });
        advancedToDrying.push(cycle.id);
        console.log(`Cycle ${cycle.id} (${cycle.order_number}) advanced: washing → drying`);
      }
    }

    // --- drying → ready ---
    const dryingCycles = await base44.asServiceRole.entities.Cycle.filter({ status: 'drying' });
    const advancedToReady = [];
    for (const cycle of dryingCycles) {
      const lastUpdate = new Date(cycle.updated_date || cycle.created_date);
      if (lastUpdate < dryingCutoff) {
        await base44.asServiceRole.entities.Cycle.update(cycle.id, { status: 'ready' });
        advancedToReady.push(cycle.id);
        console.log(`Cycle ${cycle.id} (${cycle.order_number}) advanced: drying → ready`);

        // Notify member — gear is ready for collection
        await base44.asServiceRole.entities.Notification.create({
          user_email: cycle.user_email,
          type: 'cycle_ready',
          title: 'Clean Gear Ready',
          message: `Cycle ${cycle.order_number} is complete. Check your return locker access code to collect your gear.`,
          priority: 'high',
          read: false,
        });
        console.log(`Notification sent to ${cycle.user_email} for cycle ${cycle.order_number}`);
      }
    }

    return Response.json({
      success: true,
      processed_at: now.toISOString(),
      advanced_to_drying: advancedToDrying.length,
      advanced_to_ready: advancedToReady.length,
    });
  } catch (error) {
    console.error('advanceCycleProcessing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});