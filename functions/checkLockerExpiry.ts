import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();

    // Find soft-reserved or activated assignments that have passed their drop window end
    const softReserved = await base44.asServiceRole.entities.CycleLockerAssignment.filter({
      status: { $in: ['softReserved', 'activated'] }
    });

    let expired = 0;

    for (const assignment of softReserved) {
      if (!assignment.expires_at) continue;
      const windowEnd = new Date(assignment.expires_at);
      if (now < windowEnd) continue;

      console.log(`Expiring assignment ${assignment.id} — window ended at ${assignment.expires_at}`);

      // Mark assignment expired
      await base44.asServiceRole.entities.CycleLockerAssignment.update(assignment.id, {
        status: 'expired',
      });

      // Release locker back to available (soft reservation expired — not yet activated/dropped)
      await base44.asServiceRole.entities.Locker.update(assignment.locker_id, {
        status: 'available',
      });
      // Note: if status was pickedUp/resetPending at expiry, the driver flow handles reset separately

      // Cancel the cycle
      if (assignment.cycle_id) {
        await base44.asServiceRole.entities.Cycle.update(assignment.cycle_id, {
          status: 'cancelled',
        });
      }

      // Notify the member
      await base44.asServiceRole.entities.Notification.create({
        user_email: assignment.user_id,
        type: 'laundry',
        title: 'Locker Reservation Expired',
        message: 'Your drop window has passed. Locker released — start a new cycle when ready.',
        priority: 'high',
        read: false,
      });

      expired++;
    }

    console.log(`Expiry check complete — ${expired} assignment(s) expired`);
    return Response.json({ success: true, expired });
  } catch (error) {
    console.error('checkLockerExpiry error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});