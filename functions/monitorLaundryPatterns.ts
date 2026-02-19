import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const results = [];
    
    // Get all active users with subscriptions
    const subscriptions = await base44.asServiceRole.entities.Subscription.list();
    
    for (const subscription of subscriptions) {
      const userEmail = subscription.user_email;
      
      // Get user's laundry history
      const laundryOrders = await base44.asServiceRole.entities.LaundryOrder.filter(
        { user_email: userEmail },
        '-created_date',
        10
      );
      
      if (laundryOrders.length === 0) continue;
      
      // Calculate days since last pickup
      const lastOrder = laundryOrders[0];
      const daysSinceLastPickup = Math.floor(
        (Date.now() - new Date(lastOrder.created_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Get wearable data for activity level
      const wearableData = await base44.asServiceRole.entities.WearableData.filter(
        { user_email: userEmail },
        '-created_date',
        7
      );
      
      const avgSteps = wearableData.length > 0
        ? wearableData.reduce((sum, d) => sum + (d.steps || 0), 0) / wearableData.length
        : 0;
      
      const highIntensityDays = wearableData.filter(
        d => d.workout_intensity === 'high' || d.workout_intensity === 'extreme'
      ).length;
      
      // Determine if user needs laundry pickup
      const hasCredits = subscription.laundry_credits > subscription.laundry_credits_used;
      const needsPickup = daysSinceLastPickup >= 7 || (daysSinceLastPickup >= 5 && highIntensityDays >= 3);
      
      if (needsPickup) {
        if (hasCredits) {
          // Auto-schedule for users with credits
          results.push({
            user: userEmail,
            action: 'auto_scheduled',
            reason: `${daysSinceLastPickup} days, ${highIntensityDays} high-intensity workouts`,
            credits: `${subscription.laundry_credits_used}/${subscription.laundry_credits}`
          });
          
          // Create notification for RokiBot to act on
          await base44.asServiceRole.entities.Notification.create({
            user_email: userEmail,
            type: 'vantabot',
            title: 'Laundry Pickup Needed',
            message: `It's been ${daysSinceLastPickup} days since your last pickup. ${highIntensityDays} high-intensity workouts detected. Time to schedule laundry.`,
            priority: 'high'
          });
        } else {
          // Suggest upgrade for users without credits
          const adHocCount = laundryOrders.length;
          const adHocCost = adHocCount * 15;
          
          if (adHocCount >= 3) {
            results.push({
              user: userEmail,
              action: 'suggest_upgrade',
              reason: `${adHocCount} ad-hoc pickups ($${adHocCost} spent)`,
              recommendation: 'Basic plan ($9.99) or Pro plan ($19.99)'
            });
            
            await base44.asServiceRole.entities.Notification.create({
              user_email: userEmail,
              type: 'vantabot',
              title: 'Optimize Your Laundry Plan',
              message: `You've used ${adHocCount} ad-hoc pickups ($${adHocCost}). Basic plan ($9.99) includes 5 monthly pickups—significant savings.`,
              priority: 'normal'
            });
          }
        }
      }
      
      // Check for users overusing their plan
      if (subscription.laundry_credits_used > subscription.laundry_credits) {
        const overage = subscription.laundry_credits_used - subscription.laundry_credits;
        results.push({
          user: userEmail,
          action: 'suggest_upgrade',
          reason: `Over limit by ${overage} pickups`,
          recommendation: 'Upgrade to next tier'
        });
        
        await base44.asServiceRole.entities.Notification.create({
          user_email: userEmail,
          type: 'vantabot',
          title: 'Subscription Optimization',
          message: `You've exceeded your laundry credits by ${overage}. Upgrading saves on overage fees.`,
          priority: 'normal'
        });
      }
      
      // Check for users underusing their plan
      if (subscription.plan !== 'free' && subscription.laundry_credits > 0) {
        const usageRate = subscription.laundry_credits_used / subscription.laundry_credits;
        if (usageRate < 0.5 && daysSinceLastPickup > 30) {
          results.push({
            user: userEmail,
            action: 'suggest_downgrade',
            reason: `Using only ${Math.round(usageRate * 100)}% of credits`,
            recommendation: 'Consider lower tier to save money'
          });
          
          await base44.asServiceRole.entities.Notification.create({
            user_email: userEmail,
            type: 'subscription',
            title: 'Save Money',
            message: `You're using less than half your laundry credits. A lower tier could save you money.`,
            priority: 'low'
          });
        }
      }
    }
    
    return Response.json({
      success: true,
      processed: subscriptions.length,
      actions: results.length,
      details: results
    });
    
  } catch (error) {
    console.error('Laundry pattern monitoring error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});