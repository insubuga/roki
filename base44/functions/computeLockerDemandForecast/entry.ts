import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const gyms = await base44.asServiceRole.entities.Gym.list();
    const allLockers = await base44.asServiceRole.entities.Locker.list();

    // Get pending CycleForecasts for the next 7 days
    const today = new Date();
    const forecasts = await base44.asServiceRole.entities.CycleForecast.filter({
      status: { $in: ['pending', 'confirmed'] },
    });

    const results = [];

    for (const gym of gyms) {
      const gymLockers = allLockers.filter(l => l.gym_id === gym.id);
      const totalLockers = gymLockers.length || gym.total_lockers || 10;

      // Group forecasts by date — member forecasts don't have gym_id directly,
      // but we can use all forecasts as a proxy for network-wide demand per day
      // In a full impl you'd join via MemberPreferences.assigned_locker → gym
      const forecastsByDate = {};
      forecasts.forEach(f => {
        const date = f.predicted_date;
        if (!forecastsByDate[date]) forecastsByDate[date] = 0;
        forecastsByDate[date]++;
      });

      for (const [date, count] of Object.entries(forecastsByDate)) {
        // Distribute demand proportionally across gyms
        const gymShare = Math.round(count / (gyms.length || 1));
        const saturationPct = Math.round((gymShare / totalLockers) * 100);
        const saturationRisk =
          saturationPct >= 90 ? 'critical' :
          saturationPct >= 70 ? 'high' :
          saturationPct >= 50 ? 'medium' : 'low';

        // Upsert — delete existing then create
        const existing = await base44.asServiceRole.entities.LockerDemandForecast.filter({
          gym_id: gym.id,
          forecast_date: date,
        });
        if (existing.length > 0) {
          await base44.asServiceRole.entities.LockerDemandForecast.update(existing[0].id, {
            predicted_cycles: gymShare,
            predicted_locker_usage: gymShare,
            total_lockers: totalLockers,
            saturation_risk: saturationRisk,
            saturation_pct: saturationPct,
          });
        } else {
          await base44.asServiceRole.entities.LockerDemandForecast.create({
            gym_id: gym.id,
            forecast_date: date,
            predicted_cycles: gymShare,
            predicted_locker_usage: gymShare,
            total_lockers: totalLockers,
            saturation_risk: saturationRisk,
            saturation_pct: saturationPct,
          });
        }
        results.push({ gym: gym.name, date, gymShare, saturationPct, saturationRisk });
      }
    }

    console.log(`LockerDemandForecast computed: ${results.length} records`);
    return Response.json({ success: true, records: results.length });
  } catch (error) {
    console.error('computeLockerDemandForecast error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});