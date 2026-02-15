import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_email, type, title, message, action_url, priority } = await req.json();

    if (!user_email || !type || !title || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create notification
    const notification = await base44.asServiceRole.entities.Notification.create({
      user_email,
      type,
      title,
      message,
      action_url: action_url || null,
      priority: priority || 'normal',
      read: false,
    });

    console.log('Notification created:', notification.id, 'for:', user_email);

    return Response.json({ 
      success: true,
      notification_id: notification.id 
    });
  } catch (error) {
    console.error('Send notification error:', error);
    return Response.json({ 
      error: 'Failed to send notification',
      details: error.message 
    }, { status: 500 });
  }
});