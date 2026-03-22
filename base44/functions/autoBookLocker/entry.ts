import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Scheduled automation — no user auth context, use service role directly

    const results = [];

    // Get all priority subscriptions (premium users)
    const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
      plan: 'priority',
      status: 'active'
    });

    for (const subscription of subscriptions) {
      const userEmail = subscription.user_email;

      // Get user preferences to find assigned locker
      const prefs = await base44.asServiceRole.entities.MemberPreferences.filter({ user_email: userEmail });
      const pref = prefs[0];
      if (!pref?.assigned_locker_id) continue;

      // Get their current locker
      const locker = await base44.asServiceRole.entities.Locker.get(pref.assigned_locker_id);
      if (!locker || locker.status === 'maintenance') continue;

      // Check if locker is already booked into the future
      const now = new Date();
      const bookingEnd = locker.booking_end ? new Date(locker.booking_end) : null;

      if (bookingEnd && bookingEnd > now) {
        // Already has an active booking, skip
        continue;
      }

      // Auto-book for next 7 days based on preferred pickup window
      const bookingStart = now.toISOString();
      const bookingEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      await base44.asServiceRole.entities.Locker.update(locker.id, {
        booking_start: bookingStart,
        booking_end: bookingEndDate,
        status: 'claimed',
        user_email: userEmail
      });

      // Notify the user
      await base44.asServiceRole.entities.Notification.create({
        user_email: userEmail,
        type: 'delivery',
        title: 'Locker Auto-Booked',
        message: `Your locker #${locker.locker_number} has been automatically reserved for the next 7 days as part of your Priority plan.`,
        priority: 'normal'
      });

      results.push({ user: userEmail, locker: locker.locker_number, action: 'auto_booked' });
    }

    return Response.json({
      success: true,
      processed: subscriptions.length,
      booked: results.length,
      details: results
    });

  } catch (error) {
    console.error('Auto-book locker error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});