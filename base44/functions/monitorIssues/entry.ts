import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get issues from the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const issues = await base44.asServiceRole.entities.LockerIssue.list('-created_date', 100);
    
    const recentOpenIssues = issues.filter(i => 
      i.status === 'open' && 
      new Date(i.created_date) > new Date(oneHourAgo)
    );

    // Alert if more than 5 open issues in the last hour
    if (recentOpenIssues.length >= 5) {
      // Get all admin users
      const allUsers = await base44.asServiceRole.entities.User.list();
      const admins = allUsers.filter(u => u.role === 'admin');

      // Create notifications for all admins
      for (const admin of admins) {
        await base44.asServiceRole.entities.Notification.create({
          user_email: admin.email,
          type: 'system',
          title: '⚠️ High Issue Volume Alert',
          message: `${recentOpenIssues.length} new issues reported in the last hour. Immediate attention may be required.`,
          priority: 'high'
        });

        // Send email notification
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: 'URGENT: High Issue Volume Detected',
          body: `
            <h2>High Issue Volume Alert</h2>
            <p><strong>${recentOpenIssues.length} new issues</strong> have been reported in the last hour.</p>
            <p>Please review the issues in your admin dashboard immediately.</p>
            <h3>Recent Issues:</h3>
            <ul>
              ${recentOpenIssues.slice(0, 5).map(i => `<li>${i.issue_type}: ${i.description || 'No description'}</li>`).join('')}
            </ul>
          `
        });
      }

      console.log(`Alert sent: ${recentOpenIssues.length} issues in last hour`);
      return Response.json({ 
        alerted: true, 
        issueCount: recentOpenIssues.length,
        adminsNotified: admins.length
      });
    }

    return Response.json({ 
      alerted: false, 
      issueCount: recentOpenIssues.length 
    });

  } catch (error) {
    console.error('Monitor issues error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});