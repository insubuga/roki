import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const driverStats = await base44.asServiceRole.entities.DriverStats.list();
    const allUsers = await base44.asServiceRole.entities.User.list();
    const drivers = allUsers.filter(u => u.role === 'driver' || u.role === 'admin');

    const alerts = [];

    for (const stat of driverStats) {
      // Alert if rating drops below 3.5 and driver has at least 10 ratings
      if (stat.average_rating < 3.5 && stat.total_ratings >= 10) {
        const driver = drivers.find(d => d.email === stat.driver_email);
        if (!driver) continue;

        alerts.push({
          driver_email: stat.driver_email,
          driver_name: driver.full_name,
          rating: stat.average_rating,
          total_ratings: stat.total_ratings
        });

        // Get all admin users
        const admins = allUsers.filter(u => u.role === 'admin');

        for (const admin of admins) {
          await base44.asServiceRole.entities.Notification.create({
            user_email: admin.email,
            type: 'system',
            title: '📉 Driver Performance Alert',
            message: `Driver ${driver.full_name} (${stat.driver_email}) has a low rating of ${stat.average_rating.toFixed(2)} stars. Review required.`,
            priority: 'high'
          });

          // Send email notification
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: admin.email,
            subject: 'Driver Performance Alert',
            body: `
              <h2>Driver Performance Alert</h2>
              <p>Driver <strong>${driver.full_name}</strong> (${stat.driver_email}) requires attention:</p>
              <ul>
                <li>Current Rating: <strong>${stat.average_rating.toFixed(2)} / 5.0</strong></li>
                <li>Total Ratings: ${stat.total_ratings}</li>
                <li>Total Deliveries: ${stat.total_deliveries}</li>
                <li>On-Time Rate: ${stat.on_time_percentage?.toFixed(1)}%</li>
                <li>Completion Rate: ${stat.completion_rate?.toFixed(1)}%</li>
              </ul>
              <p>Please review this driver's performance in the admin dashboard.</p>
            `
          });
        }
      }
    }

    if (alerts.length > 0) {
      console.log(`Performance alerts sent for ${alerts.length} drivers`);
    }

    return Response.json({ 
      alerted: alerts.length > 0,
      alertCount: alerts.length,
      drivers: alerts
    });

  } catch (error) {
    console.error('Monitor driver performance error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});