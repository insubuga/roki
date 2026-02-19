import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all users with existing locker bookings to detect patterns
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentHour = now.getHours();

    // Get all users
    const users = await base44.asServiceRole.entities.User.list();

    for (const user of users) {
      try {
        // Check if user already has an active locker
        const activeLockers = await base44.asServiceRole.entities.Locker.filter({
          user_email: user.email,
          status: 'claimed'
        });

        if (activeLockers.length > 0) {
          continue; // Already has a locker
        }

        // Check user's subscription plan - only auto-book for premium users
        const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
          user_email: user.email,
          status: 'active'
        });

        if (!subscriptions || subscriptions.length === 0) {
          continue; // No active subscription
        }

        const subscription = subscriptions[0];
        if (subscription.plan === 'free') {
          continue; // Don't auto-book for free users
        }

        // Get user's past locker bookings to detect patterns
        const pastLockers = await base44.asServiceRole.entities.Locker.filter({
          user_email: user.email
        }, '-created_date', 50);

        if (pastLockers.length < 3) {
          continue; // Need at least 3 bookings to detect pattern
        }

        // Analyze patterns: which days and times user typically books
        const dayPattern = {};
        const hourPattern = {};
        
        pastLockers.forEach(locker => {
          if (locker.booking_start) {
            const bookingDate = new Date(locker.booking_start);
            const day = bookingDate.getDay();
            const hour = bookingDate.getHours();
            
            dayPattern[day] = (dayPattern[day] || 0) + 1;
            hourPattern[hour] = (hourPattern[hour] || 0) + 1;
          }
        });

        // Check if today/hour matches user's typical pattern
        const todayFrequency = dayPattern[dayOfWeek] || 0;
        const hourFrequency = hourPattern[currentHour] || 0;

        // Auto-book if strong pattern detected (user books on this day/hour often)
        if (todayFrequency >= 2 && hourFrequency >= 2) {
          // Get user's preferred gym (most frequent)
          const gymFrequency = {};
          pastLockers.forEach(locker => {
            if (locker.gym_id) {
              gymFrequency[locker.gym_id] = (gymFrequency[locker.gym_id] || 0) + 1;
            }
          });

          const preferredGymId = Object.keys(gymFrequency).sort((a, b) => 
            gymFrequency[b] - gymFrequency[a]
          )[0];

          if (preferredGymId) {
            // Find available locker at preferred gym
            const availableLockers = await base44.asServiceRole.entities.Locker.filter({
              gym_id: preferredGymId,
              status: 'available'
            }, '', 1);

            if (availableLockers.length > 0) {
              const locker = availableLockers[0];
              
              // Book locker for 3 hours
              const bookingStart = new Date();
              const bookingEnd = new Date(bookingStart.getTime() + 3 * 60 * 60 * 1000);

              await base44.asServiceRole.entities.Locker.update(locker.id, {
                status: 'claimed',
                user_email: user.email,
                booking_start: bookingStart.toISOString(),
                booking_end: bookingEnd.toISOString()
              });

              // Notify user - silent, preparatory
              await base44.asServiceRole.entities.Notification.create({
                user_email: user.email,
                type: 'system',
                title: 'You\'re covered',
                message: `Locker #${locker.locker_number} ready until ${bookingEnd.toLocaleTimeString()}`,
                action_url: 'Profile',
                priority: 'low'
              });

              console.log(`Auto-booked locker for ${user.email}`);
            }
          }
        }
      } catch (userError) {
        console.error(`Error processing user ${user.email}:`, userError);
      }
    }

    return Response.json({ success: true, message: 'Auto-booking check completed' });
  } catch (error) {
    console.error('Auto-book error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});