import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Check for subscriptions renewing within 3 days
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const activeSubscriptions = await base44.asServiceRole.entities.Subscription.filter({
      status: 'active'
    });

    let notificationsSent = 0;

    for (const sub of activeSubscriptions) {
      if (!sub.renewal_date || sub.plan === 'free') continue;

      const renewalDate = new Date(sub.renewal_date);
      
      // Check if renewing within 3 days
      if (renewalDate > now && renewalDate <= threeDaysFromNow) {
        // Check if notification already sent
        const recentNotifications = await base44.asServiceRole.entities.Notification.filter({
          user_email: sub.user_email,
          type: 'subscription',
        });

        const alreadyNotified = recentNotifications.some(n => 
          n.message.includes('subscription renews') && 
          new Date(n.created_date) > new Date(now.getTime() - 24 * 60 * 60 * 1000) // Within last 24 hours
        );

        if (!alreadyNotified) {
          const daysLeft = Math.ceil((renewalDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
          
          await base44.asServiceRole.entities.Notification.create({
            user_email: sub.user_email,
            type: 'subscription',
            title: '💳 Subscription Renewal',
            message: `Your ${sub.plan.toUpperCase()} subscription renews in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
            action_url: 'Subscription',
            priority: 'normal',
            read: false,
          });

          notificationsSent++;
          console.log('Renewal reminder sent to:', sub.user_email);
        }
      }
    }

    return Response.json({ 
      success: true,
      notifications_sent: notificationsSent,
      checked_subscriptions: activeSubscriptions.length
    });
  } catch (error) {
    console.error('Check subscription renewal error:', error);
    return Response.json({ 
      error: 'Failed to check subscription renewals',
      details: error.message 
    }, { status: 500 });
  }
});