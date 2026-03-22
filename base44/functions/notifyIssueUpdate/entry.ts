import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { event, data } = await req.json();

    if (!event || !data) {
      return Response.json({ error: 'Missing event data' }, { status: 400 });
    }

    // Handle issue status updates
    if (event.type === 'update' && event.entity_name === 'LockerIssue') {
      const issue = data;
      
      if (issue.status === 'resolved') {
        await base44.asServiceRole.entities.Notification.create({
          user_email: issue.user_email,
          type: 'system',
          title: '✅ Issue Resolved',
          message: `Your reported locker issue has been resolved: ${issue.issue_type.replace(/_/g, ' ')}`,
          action_url: 'Profile',
          priority: 'normal',
          read: false,
        });

        console.log('Issue resolution notification sent to:', issue.user_email);
      } else if (issue.status === 'in_progress') {
        await base44.asServiceRole.entities.Notification.create({
          user_email: issue.user_email,
          type: 'system',
          title: '🔧 Issue In Progress',
          message: `Your reported issue is being worked on: ${issue.issue_type.replace(/_/g, ' ')}`,
          action_url: 'Profile',
          priority: 'normal',
          read: false,
        });

        console.log('Issue progress notification sent to:', issue.user_email);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Issue notification error:', error);
    return Response.json({ 
      error: 'Failed to send issue notification',
      details: error.message 
    }, { status: 500 });
  }
});