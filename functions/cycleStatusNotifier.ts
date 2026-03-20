import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const LOGO_URL = 'https://media.base44.com/images/public/6940c15ef41e4f2a833c9405/c37d16942_LogoROKI.png';

const emailHeader = () => `
  <div style="background:#080d14;padding:24px 32px;border-bottom:1px solid #1a2332;text-align:center;">
    <img src="${LOGO_URL}" alt="ROKI" style="height:48px;width:48px;object-fit:contain;display:inline-block;vertical-align:middle;margin-right:10px;"/>
    <span style="color:#ffffff;font-weight:900;font-size:22px;letter-spacing:3px;vertical-align:middle;">ROKI</span>
    <p style="color:#10b981;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:4px 0 0;">Readiness Infrastructure</p>
  </div>
`;

const emailFooter = () => `
  <div style="background:#040810;border-top:1px solid #1a2332;padding:20px 32px;text-align:center;">
    <img src="${LOGO_URL}" alt="ROKI" style="height:24px;width:24px;object-fit:contain;display:inline-block;vertical-align:middle;margin-right:6px;opacity:0.6;"/>
    <span style="color:#374151;font-size:11px;vertical-align:middle;letter-spacing:2px;">ROKI · Readiness OS</span>
    <p style="color:#1f2937;font-size:10px;margin:8px 0 0;">You're receiving this because you have an active ROKI subscription. Visit the app to manage preferences.</p>
  </div>
`;

const STATUS_LABELS = {
  ready: 'Gear Ready for Pickup',
  awaiting_pickup: 'Gear Ready for Pickup',
  washing: 'Gear In Transit',
  drying: 'Gear Processing',
  picked_up: 'Cycle Complete — Reset Ready',
  cancelled: 'Cycle Cancelled',
};

const NOTIFY_ON_TRANSITIONS = new Set([
  'ready', 'awaiting_pickup', 'washing', 'drying', 'picked_up', 'cancelled',
]);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data } = body;

    if (event?.type !== 'update') {
      return Response.json({ skipped: 'not an update event' });
    }

    const newStatus = data?.status;
    const oldStatus = old_data?.status;

    if (!newStatus || newStatus === oldStatus || !NOTIFY_ON_TRANSITIONS.has(newStatus)) {
      return Response.json({ skipped: `no notification needed (${oldStatus} → ${newStatus})` });
    }

    const userEmail = data?.user_email;
    const orderNumber = data?.order_number || event?.entity_id;
    const gymLocation = data?.gym_location || 'your gym';

    if (!userEmail) return Response.json({ skipped: 'no user_email on cycle' });

    const statusLabel = STATUS_LABELS[newStatus] || newStatus;

    let title = '';
    let message = '';
    let emailBody = '';

    if (newStatus === 'ready' || newStatus === 'awaiting_pickup') {
      title = '🎯 Your gear is reset and ready!';
      message = `Order ${orderNumber} is reset and ready at ${gymLocation}. Head to your locker to collect your gear.`;
      emailBody = `
        <h2 style="color:#fff;font-size:22px;font-weight:900;margin:0 0 12px;">Your gear is reset and ready!</h2>
        <p style="color:#9ca3af;line-height:1.7;margin:0 0 16px;">Your ROKI cycle <strong style="color:#10b981;">${orderNumber}</strong> has been processed. Your fresh gear is waiting in your locker at <strong style="color:#fff;">${gymLocation}</strong>.</p>
        <div style="background:#0d1a2a;border:1px solid #10b981;border-radius:10px;padding:16px;margin:20px 0;">
          <p style="color:#10b981;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;">Order Receipt</p>
          <p style="color:#fff;font-weight:bold;font-size:16px;margin:0;">${orderNumber}</p>
          <p style="color:#6b7280;font-size:12px;margin:4px 0 0;">📍 ${gymLocation}</p>
        </div>
        <p style="color:#6b7280;font-size:12px;">Your locker access code is available in the ROKI app under Active Cycle.</p>
      `;
    } else if (newStatus === 'washing') {
      title = '🚀 Your gear is in transit';
      message = `Order ${orderNumber} has been picked up and is now in the Roki Network.`;
      emailBody = `
        <h2 style="color:#fff;font-size:22px;font-weight:900;margin:0 0 12px;">Your gear is in the Roki Network</h2>
        <p style="color:#9ca3af;line-height:1.7;margin:0 0 16px;">Order <strong style="color:#10b981;">${orderNumber}</strong> has been picked up from ${gymLocation} and is currently being cleaned.</p>
        <div style="background:#0d1a2a;border:1px solid #1f2937;border-radius:10px;padding:16px;margin:20px 0;">
          <p style="color:#6b7280;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;">Status</p>
          <p style="color:#f59e0b;font-weight:bold;margin:0;">⚡ In Transit</p>
        </div>
        <p style="color:#6b7280;font-size:12px;">We'll notify you when your gear is ready for pickup.</p>
      `;
    } else if (newStatus === 'drying') {
      title = '⚡ Gear processing — almost ready';
      message = `Order ${orderNumber} is in final processing. Almost reset.`;
      emailBody = `
        <h2 style="color:#fff;font-size:22px;font-weight:900;margin:0 0 12px;">Almost ready.</h2>
        <p style="color:#9ca3af;line-height:1.7;margin:0 0 16px;">Order <strong style="color:#10b981;">${orderNumber}</strong> is in final processing. We'll send you a notification when it's back at <strong style="color:#fff;">${gymLocation}</strong>.</p>
        <div style="background:#0d1a2a;border:1px solid #1f2937;border-radius:10px;padding:16px;margin:20px 0;">
          <p style="color:#6b7280;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;">Status</p>
          <p style="color:#a855f7;font-weight:bold;margin:0;">🔄 Final Processing</p>
        </div>
      `;
    } else if (newStatus === 'picked_up') {
      title = '✅ Cycle complete — reset ready';
      message = `Order ${orderNumber} collected. Your reset cycle is complete.`;
      emailBody = `
        <h2 style="color:#fff;font-size:22px;font-weight:900;margin:0 0 12px;">Reset cycle complete!</h2>
        <p style="color:#9ca3af;line-height:1.7;margin:0 0 16px;">You've successfully collected order <strong style="color:#10b981;">${orderNumber}</strong>. Your locker is now ready for your next reset cycle.</p>
        <div style="background:#0d1a2a;border:1px solid #10b981;border-radius:10px;padding:16px;margin:20px 0;text-align:center;">
          <p style="color:#10b981;font-size:28px;margin:0;">✓</p>
          <p style="color:#10b981;font-weight:bold;margin:4px 0 0;">Cycle Complete</p>
          <p style="color:#6b7280;font-size:12px;margin:4px 0 0;">${orderNumber}</p>
        </div>
        <p style="color:#6b7280;font-size:12px;">Thanks for using ROKI Readiness OS. See you next cycle.</p>
      `;
    } else if (newStatus === 'cancelled') {
      title = '⚠️ Cycle cancelled';
      message = `Order ${orderNumber} has been cancelled.`;
      emailBody = `
        <h2 style="color:#fff;font-size:22px;font-weight:900;margin:0 0 12px;">Your reset cycle was cancelled</h2>
        <p style="color:#9ca3af;line-height:1.7;margin:0 0 16px;">Order <strong style="color:#f59e0b;">${orderNumber}</strong> has been cancelled. If you did not request this, please contact ROKI support immediately.</p>
        <div style="background:#1a0a0a;border:1px solid #7f1d1d;border-radius:10px;padding:16px;margin:20px 0;">
          <p style="color:#ef4444;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;">Cancellation Notice</p>
          <p style="color:#fff;font-weight:bold;margin:0;">${orderNumber}</p>
          <p style="color:#6b7280;font-size:12px;margin:4px 0 0;">📍 ${gymLocation}</p>
        </div>
      `;
    }

    // 1. Create in-app notification
    await base44.asServiceRole.entities.Notification.create({
      user_email: userEmail,
      type: 'laundry',
      title,
      message,
      action_url: '/ActiveCycle',
      priority: (newStatus === 'ready' || newStatus === 'awaiting_pickup') ? 'high' : 'normal',
      read: false,
    });

    console.log(`In-app notification created for ${userEmail}: ${oldStatus} → ${newStatus}`);

    // 2. Send branded email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: userEmail,
      subject: `ROKI: ${statusLabel} — Order ${orderNumber}`,
      body: `
        <div style="font-family:monospace;background:#0a0f1a;max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #1a2332;">
          ${emailHeader()}
          <div style="padding:32px;">
            ${emailBody}
          </div>
          ${emailFooter()}
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