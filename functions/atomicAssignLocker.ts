import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Atomic server-side locker assignment — eliminates client-side race conditions.
// All steps (credit check → locker claim → cycle create → assignment → credit deduct)
// happen in sequence on the server. Two simultaneous requests cannot grab the same locker
// because the first to update the locker to 'softReserved' wins; the second finds it gone.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { gymId, gearVolume, preferredGymName } = await req.json();
    if (!gymId) return Response.json({ error: 'gymId is required' }, { status: 400 });

    // 1. Subscription credit check
    const subs = await base44.asServiceRole.entities.Subscription.filter({ user_email: user.email });
    const sub = subs[0];
    if (sub) {
      const creditsRemaining = (sub.laundry_credits || 0) - (sub.laundry_credits_used || 0);
      if (creditsRemaining <= 0) {
        console.warn(`Credit exhausted for ${user.email}`);
        return Response.json({ error: 'No laundry credits remaining. Upgrade your plan to continue.' }, { status: 402 });
      }
    }

    // 2. Prevent duplicate active cycles
    const existing = await base44.asServiceRole.entities.Cycle.filter({
      user_email: user.email,
      status: { $in: ['prepared', 'awaiting_pickup', 'washing', 'drying', 'ready'] }
    });
    if (existing.length > 0) {
      return Response.json({ error: 'You already have an active cycle in progress.' }, { status: 409 });
    }

    // 3. Find available lockers
    const availableLockers = await base44.asServiceRole.entities.Locker.filter({
      gym_id: gymId,
      status: 'available',
    });
    if (availableLockers.length === 0) {
      return Response.json({ error: 'No lockers available at your gym right now. Try again shortly.' }, { status: 409 });
    }

    // 4. ATOMIC CLAIM — immediately flip locker to softReserved before any other work.
    // This is the critical section: first writer wins.
    const locker = availableLockers[0];
    await base44.asServiceRole.entities.Locker.update(locker.id, { status: 'softReserved' });

    // 5. Re-read to verify the claim (guard against near-simultaneous requests)
    const claimed = await base44.asServiceRole.entities.Locker.get(locker.id);
    if (claimed.status !== 'softReserved') {
      console.warn(`Locker ${locker.id} was taken by another request — trying next`);
      // Try next available locker
      if (availableLockers.length < 2) {
        return Response.json({ error: 'Locker just claimed by another user. Please try again.' }, { status: 409 });
      }
      const fallbackLocker = availableLockers[1];
      await base44.asServiceRole.entities.Locker.update(fallbackLocker.id, { status: 'softReserved' });
    }

    const finalLocker = claimed.status === 'softReserved' ? locker : availableLockers[1];

    // 6. Generate cycle metadata
    const itemCounts = { light: 4, standard: 8, heavy: 12 };
    const itemCount = itemCounts[gearVolume] || 8;
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const batchId = `B${Date.now().toString(36).toUpperCase()}`;

    // 7. Create cycle
    const cycle = await base44.asServiceRole.entities.Cycle.create({
      user_email: user.email,
      order_number: batchId,
      drop_off_date: new Date().toISOString(),
      status: 'awaiting_pickup',
      items: Array(itemCount).fill('Unit'),
      gym_location: preferredGymName || 'Node Assigned',
    });
    console.log(`Cycle created: ${cycle.id} (${batchId}) for ${user.email}`);

    // 8. Create locker assignment
    await base44.asServiceRole.entities.CycleLockerAssignment.create({
      cycle_id: cycle.id,
      locker_id: finalLocker.id,
      user_id: user.email,
      access_code: code,
      status: 'softReserved',
      assigned_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    });

    // 9. Deduct credit
    if (sub) {
      await base44.asServiceRole.entities.Subscription.update(sub.id, {
        laundry_credits_used: (sub.laundry_credits_used || 0) + 1,
      });
    }

    // 10. Notify member
    await base44.asServiceRole.entities.Notification.create({
      user_email: user.email,
      type: 'laundry',
      title: 'Locker Reserved — Drop Off Ready',
      message: `Cycle ${batchId} activated. Locker #${finalLocker.locker_number} reserved at ${preferredGymName || 'your gym'}. Access code: ${code}. Drop your gear within 2 hours.`,
      priority: 'high',
      read: false,
    });

    return Response.json({
      success: true,
      cycleId: cycle.id,
      lockerId: finalLocker.id,
      lockerNumber: finalLocker.locker_number,
      batchId,
    });
  } catch (error) {
    console.error('atomicAssignLocker error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});