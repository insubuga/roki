import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const STATUS_LABELS = {
  ready: 'Ready for Pickup',
  awaiting_pickup: 'Ready for Pickup',
  washing: 'Now Washing',
  drying: 'Now Drying',
  picked_up: 'Picked Up — Cycle Complete',
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
      title = '🧺 Your laundry is ready!';
      message = `Order ${orderNumber} is ready for pickup at ${gymLocation}. Head to your locker to collect your clean gear.`;
      emailBody = `
        <h2>Your laundry is ready for pickup!</h2>
        <p>Great news — your ROKI order <strong>${orderNumber}</strong> has been cleaned, folded, and placed back in your locker at <strong>${gymLocation}</strong>.</p>
        <p>Head to your locker at your next gym visit to collect your gear.</p>
        <p style="color:#666;font-size:12px;">You can check your access code in the ROKI app under Locker.</p>
      `;
    } else if (newStatus === 'washing') {
      title = '🫧 Your laundry is being washed';
      message = `Order ${orderNumber} has been picked up and is now in the wash. Expected back within your turnaround window.`;
      emailBody = `
        <h2>Your laundry cycle is underway</h2>
        <p>Order <strong>${orderNumber}</strong> has been picked up and is currently being washed at our facility.</p>
        <p>We'll notify you again when it's ready for pickup.</p>
      `;
    } else if (newStatus === 'drying') {
      title = '💨 Your laundry is drying';
      message = `Order ${orderNumber} is in the dryer — almost ready. We'll notify you when it's back at ${gymLocation}.`;
      emailBody = `
        <h2>Your laundry is almost done</h2>
        <p>Order <strong>${orderNumber}</strong> is currently drying. We'll send you a final notification when it's back at your locker at <strong>${gymLocation}</strong>.</p>
      `;
    } else if (newStatus === 'picked_up') {
      title = '✅ Cycle complete';
      message = `Order ${orderNumber} has been collected. Your cycle is complete.`;
      emailBody = `
        <h2>Cycle complete!</h2>
        <p>You've successfully picked up order <strong>${orderNumber}</strong>. Your locker is now reset for your next cycle.</p>
        <p>Thanks for using ROKI.</p>
      `;
    } else if (newStatus === 'cancelled') {
      title = '⚠️ Cycle cancelled';
      message = `Order ${orderNumber} has been cancelled. Contact support if this was unexpected.`;
      emailBody = `
        <h2>Your cycle was cancelled</h2>
        <p>Order <strong>${orderNumber}</strong> has been cancelled. If you did not request this, please contact ROKI support.</p>
      `;
    }

    // 1. Create in-app notification
    await base44.asServiceRole.entities.Notification.create({
      user_email: userEmail,
      type: 'cycle_update',
      title,
      message,
      action_url: '/LaundryOrder',
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