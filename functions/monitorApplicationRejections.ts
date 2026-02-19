import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get applications from the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const applications = await base44.asServiceRole.entities.DriverApplication.list('-created_date', 100);
    
    const recentApplications = applications.filter(a => 
      new Date(a.created_date) > new Date(oneDayAgo)
    );

    const recentRejections = recentApplications.filter(a => a.status === 'rejected');
    const rejectionRate = recentApplications.length > 0 
      ? (recentRejections.length / recentApplications.length) * 100 
      : 0;

    // Alert if rejection rate is above 50% and at least 5 applications were reviewed
    if (rejectionRate > 50 && recentApplications.length >= 5) {
      // Get all admin users
      const allUsers = await base44.asServiceRole.entities.User.list();
      const admins = allUsers.filter(u => u.role === 'admin');

      for (const admin of admins) {
        await base44.asServiceRole.entities.Notification.create({
          user_email: admin.email,
          type: 'system',
          title: '⚠️ High Application Rejection Rate',
          message: `${rejectionRate.toFixed(0)}% of driver applications were rejected in the last 24 hours (${recentRejections.length}/${recentApplications.length}). Review application criteria.`,
          priority: 'high'
        });

        // Send email notification
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: 'High Driver Application Rejection Rate',
          body: `
            <h2>Application Rejection Alert</h2>
            <p>An unusually high rejection rate has been detected:</p>
            <ul>
              <li>Rejection Rate: <strong>${rejectionRate.toFixed(1)}%</strong></li>
              <li>Rejected: ${recentRejections.length}</li>
              <li>Total Applications (24h): ${recentApplications.length}</li>
            </ul>
            <p>This may indicate issues with application quality or overly strict criteria.</p>
            <h3>Recent Rejection Reasons:</h3>
            <ul>
              ${recentRejections.slice(0, 5).map(a => `<li>${a.full_name}: ${a.admin_notes || 'No notes provided'}</li>`).join('')}
            </ul>
          `
        });
      }

      console.log(`Alert sent: ${rejectionRate.toFixed(1)}% rejection rate`);
      return Response.json({ 
        alerted: true,
        rejectionRate: rejectionRate,
        rejected: recentRejections.length,
        total: recentApplications.length,
        adminsNotified: admins.length
      });
    }

    return Response.json({ 
      alerted: false,
      rejectionRate: rejectionRate,
      rejected: recentRejections.length,
      total: recentApplications.length
    });

  } catch (error) {
    console.error('Monitor application rejections error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});