import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This function should be called by scheduled automation
    // Check for lockers expiring soon (within 2 hours)
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const claimedLockers = await base44.asServiceRole.entities.Locker.filter({
      status: 'claimed'
    });

    let notificationsSent = 0;

    for (const locker of claimedLockers) {
      if (!locker.booking_end || !locker.user_email) continue;

      const bookingEnd = new Date(locker.booking_end);
      
      // Check if expiring within 2 hours
      if (bookingEnd > now && bookingEnd <= twoHoursFromNow) {
        const timeLeft = Math.round((bookingEnd.getTime() - now.getTime()) / (60 * 1000));
        
        // Check if notification already sent recently
        const recentNotifications = await base44.asServiceRole.entities.Notification.filter({
          user_email: locker.user_email,
          type: 'system',
        });

        const alreadyNotified = recentNotifications.some(n => 
          n.message.includes('Locker booking expires') && 
          new Date(n.created_date) > new Date(now.getTime() - 60 * 60 * 1000) // Within last hour
        );

        if (!alreadyNotified) {
          await base44.asServiceRole.entities.Notification.create({
            user_email: locker.user_email,
            type: 'system',
            title: '⏰ Locker Expiring Soon',
            message: `Locker booking expires in ${timeLeft} minutes. Extend now to avoid losing access.`,
            action_url: 'Profile',
            priority: 'high',
            read: false,
          });

          notificationsSent++;
          console.log('Expiry notification sent to:', locker.user_email);
        }
      }

      // Auto-release expired lockers
      if (bookingEnd <= now) {
        await base44.asServiceRole.entities.Locker.update(locker.id, {
          status: 'available',
          user_email: null,
          booking_start: null,
          booking_end: null,
          is_locked: true,
        });

        await base44.asServiceRole.entities.Notification.create({
          user_email: locker.user_email,
          type: 'system',
          title: '🔒 Locker Released',
          message: `Your locker booking has expired and been released.`,
          action_url: 'Profile',
          priority: 'normal',
          read: false,
        });

        notificationsSent++;
        console.log('Locker released and notification sent:', locker.id);
      }
    }

    return Response.json({ 
      success: true,
      notifications_sent: notificationsSent,
      checked_lockers: claimedLockers.length
    });
  } catch (error) {
    console.error('Check locker expiry error:', error);
    return Response.json({ 
      error: 'Failed to check locker expiry',
      details: error.message 
    }, { status: 500 });
  }
});