import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const STATUS_LABELS = {
  ready: 'Gear Ready for Pickup',
  awaiting_pickup: 'Gear Ready for Pickup',
  washing: 'Gear In Transit',
  drying: 'Gear Processing',
  picked_up: 'Cycle Complete — Reset Ready',
  cancelled: 'Cycle Cancelled',
};

const NOTIFY_ON_TRANSITIONS = new Set([
  'ready',
  'awaiting_pickup',
  'washing',
  'drying',
  'picked_up',
  'cancelled',
]);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data, old_data } = body;

    // Only handle update events
    if (event?.type !== 'update') {
      return Response.json({ skipped: 'not an update event' });
    }

    const newStatus = data?.status;
    const oldStatus = old_data?.status;

    // Skip if status didn't change or not a notifiable transition
    if (!newStatus || newStatus === oldStatus || !NOTIFY_ON_TRANSITIONS.has(newStatus)) {
      return Response.json({ skipped: `no notification needed (${oldStatus} → ${newStatus})` });
    }

    const userEmail = data?.user_email;
    const orderNumber = data?.order_number || event?.entity_id;
    const gymLocation = data?.gym_location || 'your gym';

    if (!userEmail) {
      return Response.json({ skipped: 'no user_email on cycle' });
    }

    const statusLabel = STATUS_LABELS[newStatus] || newStatus;

    let title = '';
    let message = '';
    let emailBody = '';

    if (newStatus === 'ready' || newStatus === 'awaiting_pickup') {
      title = '🎯 Your gear is reset and ready!';
      message = `Order ${orderNumber} is reset and ready at ${gymLocation}. Head to your locker to collect your gear.`;
      emailBody = `
        <h2>Your gear is reset and ready!</h2>
        <p>Your ROKI cycle <strong>${orderNumber}</strong> has been processed and reset. Your gear is waiting in your locker at <strong>${gymLocation}</strong>.</p>
        <p>Head to your locker at your next visit to collect your gear.</p>
        <p style="color:#666;font-size:12px;">Your access code is available in the ROKI app under Active Cycle.</p>
      `;
    } else if (newStatus === 'washing') {
      title = '🚀 Your gear is in transit';
      message = `Order ${orderNumber} has been picked up and is now in the Roki Network. Expected delivery within your turnaround window.`;
      emailBody = `
        <h2>Your gear is in the Roki Network</h2>
        <p>Order <strong>${orderNumber}</strong> has been picked up and is currently being processed.</p>
        <p>We'll notify you when it's ready for reset.</p>
      `;
    } else if (newStatus === 'drying') {
      title = '⚡ Gear processing — almost ready';
      message = `Order ${orderNumber} is in final processing — almost reset. We'll notify you when it's back at ${gymLocation}.`;
      emailBody = `
        <h2>Your gear is almost reset</h2>
        <p>Order <strong>${orderNumber}</strong> is in final processing. We'll send you a notification when it's ready at <strong>${gymLocation}</strong>.</p>
      `;
    } else if (newStatus === 'picked_up') {
      title = '✅ Cycle complete — reset ready';
      message = `Order ${orderNumber} has been collected. Your reset cycle is complete.`;
      emailBody = `
        <h2>Reset cycle complete!</h2>
        <p>You've successfully collected order <strong>${orderNumber}</strong>. Your locker is now ready for your next reset cycle.</p>
        <p>Thanks for using ROKI Readiness OS.</p>
      `;
    } else if (newStatus === 'cancelled') {
      title = '⚠️ Cycle cancelled';
      message = `Order ${orderNumber} has been cancelled. Contact support if this was unexpected.`;
      emailBody = `
        <h2>Your reset cycle was cancelled</h2>
        <p>Order <strong>${orderNumber}</strong> has been cancelled. If you did not request this, please contact ROKI support.</p>
      `;
    }

    // 1. Create in-app notification
    await base44.asServiceRole.entities.Notification.create({
      user_email: userEmail,
      type: 'cycle',
      title,
      message,
      action_url: '/ActiveCycle',
      priority: (newStatus === 'ready' || newStatus === 'awaiting_pickup') ? 'high' : 'normal',
      read: false,
    });

    console.log(`In-app notification created for ${userEmail}: ${oldStatus} → ${newStatus}`);

    // 2. Send email notification
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: userEmail,
      subject: `ROKI: ${statusLabel} — Order ${orderNumber}`,
      body: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:8px;">
          <div style="background:#16a34a;padding:12px 20px;border-radius:6px;margin-bottom:20px;">
            <span style="color:white;font-weight:bold;font-size:18px;letter-spacing:2px;">ROKI</span>
          </div>
          ${emailBody}
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"/>
          <p style="color:#9ca3af;font-size:11px;">You're receiving this because you have an active ROKI subscription. 
          Visit the app to manage your notification preferences.</p>
        </div>
      `,
    });

    console.log(`Email sent to ${userEmail} for cycle status: ${newStatus}`);

    return Response.json({ success: true, notified: userEmail, transition: `${oldStatus} → ${newStatus}` });
  } catch (error) {
    console.error('cycleStatusNotifier error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});