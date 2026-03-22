import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Compute advanced analytics: churn risk, LTV, user segments, demand forecasts
 * Runs weekly to generate predictive intelligence
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('[ANALYTICS] Computing advanced metrics...');

    // Fetch all users with activity history
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 10000);
    const memberPrefs = await base44.asServiceRole.entities.MemberPreferences.list('-created_date', 10000);
    const cycles = await base44.asServiceRole.entities.Cycle.list('-created_date', 10000);
    const subscriptions = await base44.asServiceRole.entities.Subscription.list('-created_date', 10000);

    const analytics = {
      timestamp: new Date().toISOString(),
      total_users: allUsers.length,
      total_cycles: cycles.length,
      active_subscribers: subscriptions.filter(s => s.status === 'active').length,
      churn_risks: [],
      high_value_users: [],
      segment_distribution: {
        heavy_users: 0,
        regular_users: 0,
        light_users: 0,
        dormant_users: 0
      },
      ltv_analysis: {
        average_ltv: 0,
        by_plan: {}
      },
      growth_metrics: {
        wau: 0, // Weekly active users
        mau: 0, // Monthly active users
        retention_d7: 0,
        retention_d30: 0
      }
    };

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Process each user
    for (const user of allUsers) {
      const userCycles = cycles.filter(c => c.user_email === user.email);
      const userSub = subscriptions.find(s => s.user_email === user.email);
      const userPref = memberPrefs.find(p => p.user_email === user.email);

      if (!userSub) continue; // Skip non-subscribers

      const cycleCount = userCycles.length;
      const lastCycleDate = userCycles.length > 0 
        ? new Date(userCycles[0].created_date)
        : null;
      const daysSinceLastCycle = lastCycleDate 
        ? Math.floor((now - lastCycleDate) / (24 * 60 * 60 * 1000))
        : null;

      // Segment users
      if (cycleCount >= 8) {
        analytics.segment_distribution.heavy_users++;
      } else if (cycleCount >= 4) {
        analytics.segment_distribution.regular_users++;
      } else if (cycleCount >= 1) {
        analytics.segment_distribution.light_users++;
      } else {
        analytics.segment_distribution.dormant_users++;
      }

      // Churn risk calculation
      const churnScore = calculateChurnScore(
        cycleCount,
        daysSinceLastCycle,
        userSub.status,
        userCycles.filter(c => new Date(c.created_date) > ninetyDaysAgo).length
      );

      if (churnScore > 0.6) {
        analytics.churn_risks.push({
          user_email: user.email,
          churn_score: churnScore,
          last_activity_days: daysSinceLastCycle,
          total_cycles: cycleCount,
          subscription_status: userSub.status,
          intervention: getChurnIntervention(churnScore)
        });
      }

      // LTV Calculation (simplified: revenue per user per year)
      const monthlyValue = userSub.monthly_price || 49;
      const ltv = monthlyValue * 12; // 1-year LTV
      if (ltv > 588) { // Top tier: 2x avg
        analytics.high_value_users.push({
          user_email: user.email,
          ltv,
          plan: userSub.plan,
          cycles_per_month: cycleCount / Math.max(1, Math.floor((now - new Date(userSub.created_date)) / (30 * 24 * 60 * 60 * 1000)))
        });
      }

      // Growth metrics
      const recentCycles = userCycles.filter(c => new Date(c.created_date) > thirtyDaysAgo);
      if (recentCycles.length > 0) analytics.growth_metrics.mau++;

      const weeklyCycles = userCycles.filter(c => new Date(c.created_date) > sevenDaysAgo);
      if (weeklyCycles.length > 0) analytics.growth_metrics.wau++;

      // LTV by plan
      if (!analytics.ltv_analysis.by_plan[userSub.plan]) {
        analytics.ltv_analysis.by_plan[userSub.plan] = { count: 0, total_ltv: 0 };
      }
      analytics.ltv_analysis.by_plan[userSub.plan].count++;
      analytics.ltv_analysis.by_plan[userSub.plan].total_ltv += ltv;
    }

    // Calculate retention
    analytics.growth_metrics.retention_d7 = allUsers.length > 0
      ? Math.round((analytics.growth_metrics.wau / allUsers.length) * 100)
      : 0;

    analytics.growth_metrics.retention_d30 = allUsers.length > 0
      ? Math.round((analytics.growth_metrics.mau / allUsers.length) * 100)
      : 0;

    // Average LTV
    const totalLTV = Object.values(analytics.ltv_analysis.by_plan)
      .reduce((sum, p) => sum + p.total_ltv, 0);
    const totalSubCount = Object.values(analytics.ltv_analysis.by_plan)
      .reduce((sum, p) => sum + p.count, 0);
    analytics.ltv_analysis.average_ltv = totalSubCount > 0
      ? Math.round(totalLTV / totalSubCount)
      : 0;

    // Sort and limit results
    analytics.churn_risks = analytics.churn_risks
      .sort((a, b) => b.churn_score - a.churn_score)
      .slice(0, 50);

    analytics.high_value_users = analytics.high_value_users
      .sort((a, b) => b.ltv - a.ltv)
      .slice(0, 50);

    console.log(`[ANALYTICS] Computed: ${analytics.churn_risks.length} churn risks, ${analytics.high_value_users.length} high-value users`);

    return Response.json({
      success: true,
      analytics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`[ANALYTICS] Computation failed: ${error.message}`);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});

function calculateChurnScore(cycleCount, daysSinceLastCycle, status, recent90DayCycles) {
  let score = 0;

  // Low engagement (0-0.3)
  if (cycleCount < 3) score += 0.3;
  if (cycleCount < 1) score += 0.2;

  // Recency decay (0-0.4)
  if (daysSinceLastCycle === null) {
    score += 0.4;
  } else if (daysSinceLastCycle > 60) {
    score += 0.4;
  } else if (daysSinceLastCycle > 30) {
    score += 0.2;
  }

  // Subscription health (0-0.3)
  if (status === 'canceling' || status === 'past_due') score += 0.3;
  if (status === 'canceled') score += 0.5;

  // Recent momentum (negative score)
  if (recent90DayCycles > 5) score -= 0.2;

  return Math.max(0, Math.min(1, score)); // Clamp 0-1
}

function getChurnIntervention(score) {
  if (score > 0.8) return 'CRITICAL: Immediate win-back campaign';
  if (score > 0.7) return 'HIGH: Send re-engagement offer';
  if (score > 0.6) return 'MEDIUM: Notify of retention offer';
  return 'LOW: Monitor closely';
}