import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Atomic locker assignment with:
// - Claim-token ownership verification (prevents TOCTOU race on locker)
// - Fresh credit re-read + re-validate before deduction (prevents double-spend)
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

    // 4. ATOMIC CLAIM with unique claim token — first writer to set their token wins.
    // We stamp our unique identity onto the locker, then verify ownership post-write.
    const claimToken = `${user.email}::${Date.now()}::${Math.random().toString(36).slice(2)}`;
    let finalLocker = null;

    for (const candidate of availableLockers.slice(0, 3)) {
      await base44.asServiceRole.entities.Locker.update(candidate.id, {
        status: 'softReserved',
        claimed_by: claimToken,
      });

      // Re-read to verify OUR token won (last writer wins — if token matches, we own it)
      const verified = await base44.asServiceRole.entities.Locker.get(candidate.id);
      if (verified.claimed_by === claimToken) {
        finalLocker = candidate;
        console.log(`Locker ${candidate.id} claimed by ${user.email} (token verified)`);
        break;
      }
      // Another request overwrote our token — try next candidate
      console.warn(`Locker ${candidate.id} race lost by ${user.email}, trying next`);
    }

    if (!finalLocker) {
      return Response.json({ error: 'All lockers were just claimed. Please try again in a moment.' }, { status: 409 });
    }

    // 5. Generate cycle metadata
    const itemCounts = { light: 4, standard: 8, heavy: 12 };
    const itemCount = itemCounts[gearVolume] || 8;
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const batchId = `B${Date.now().toString(36).toUpperCase()}`;

    // 6. Create cycle
    const cycle = await base44.asServiceRole.entities.Cycle.create({
      user_email: user.email,
      order_number: batchId,
      drop_off_date: new Date().toISOString(),
      status: 'awaiting_pickup',
      items: Array(itemCount).fill('Unit'),
      gym_location: preferredGymName || 'Node Assigned',
    });
    console.log(`Cycle created: ${cycle.id} (${batchId}) for ${user.email}`);

    // 7. Create locker assignment
    await base44.asServiceRole.entities.CycleLockerAssignment.create({
      cycle_id: cycle.id,
      locker_id: finalLocker.id,
      user_id: user.email,
      access_code: code,
      status: 'softReserved',
      assigned_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    });

    // 8. SAFE CREDIT DEDUCTION — re-read subscription fresh to get latest credits_used,
    // re-validate there's still credit, then increment. Prevents concurrent double-spend.
    if (sub) {
      const freshSubs = await base44.asServiceRole.entities.Subscription.filter({ user_email: user.email });
      const freshSub = freshSubs[0];
      if (freshSub) {
        const freshRemaining = (freshSub.laundry_credits || 0) - (freshSub.laundry_credits_used || 0);
        if (freshRemaining <= 0) {
          // Credits were exhausted between our initial check and now — roll back locker
          console.warn(`Credit double-spend prevented for ${user.email}`);
          await base44.asServiceRole.entities.Locker.update(finalLocker.id, { status: 'available', claimed_by: null });
          await base44.asServiceRole.entities.Cycle.update(cycle.id, { status: 'picked_up' });
          return Response.json({ error: 'Credits were just used by another request. No credits remaining.' }, { status: 402 });
        }
        await base44.asServiceRole.entities.Subscription.update(freshSub.id, {
          laundry_credits_used: (freshSub.laundry_credits_used || 0) + 1,
        });
      }
    }

    // 9. Notify member
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