import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const LOGO_URL = 'https://media.base44.com/images/public/6940c15ef41e4f2a833c9405/c37d16942_LogoROKI.png';

const emailHeader = () => `
  <div style="background:#111827;padding:28px 32px;text-align:center;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
      <img src="${LOGO_URL}" alt="ROKI" width="52" height="52" style="display:inline-block;vertical-align:middle;margin-right:12px;border:0;"/>
      <span style="color:#ffffff;font-weight:900;font-size:26px;letter-spacing:4px;vertical-align:middle;font-family:Arial,sans-serif;">ROKI</span>
    </td></tr><tr><td align="center">
      <p style="color:#10b981;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:6px 0 0;font-family:Arial,sans-serif;">Readiness Infrastructure</p>
    </td></tr></table>
  </div>
  <div style="height:4px;background:linear-gradient(90deg,#10b981,#059669);"></div>
`;

const emailFooter = () => `
  <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 32px;text-align:center;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
      <img src="${LOGO_URL}" alt="ROKI" width="28" height="28" style="display:inline-block;vertical-align:middle;margin-right:8px;border:0;opacity:0.7;"/>
      <span style="color:#6b7280;font-size:12px;vertical-align:middle;font-family:Arial,sans-serif;letter-spacing:2px;font-weight:bold;">ROKI · Readiness OS</span>
    </td></tr><tr><td align="center">
      <p style="color:#9ca3af;font-size:11px;margin:10px 0 0;font-family:Arial,sans-serif;line-height:1.6;">You're receiving this because you have an active ROKI subscription.<br/>Visit the app to manage your notification preferences.</p>
    </td></tr></table>
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
        <h2 style="color:#111827;font-size:22px;font-weight:900;margin:0 0 12px;font-family:Arial,sans-serif;">Your gear is reset and ready! 🎯</h2>
        <p style="color:#4b5563;line-height:1.7;margin:0 0 16px;font-family:Arial,sans-serif;">Your ROKI cycle <strong style="color:#059669;">${orderNumber}</strong> has been processed. Your fresh gear is waiting in your locker at <strong style="color:#111827;">${gymLocation}</strong>.</p>
        <div style="background:#f0fdf4;border:1px solid #10b981;border-radius:10px;padding:16px;margin:20px 0;">
          <p style="color:#059669;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;font-family:Arial,sans-serif;font-weight:bold;">Order</p>
          <p style="color:#111827;font-weight:bold;font-size:18px;margin:0;font-family:Arial,sans-serif;letter-spacing:1px;">${orderNumber}</p>
          <p style="color:#6b7280;font-size:12px;margin:6px 0 0;font-family:Arial,sans-serif;">📍 ${gymLocation}</p>
        </div>
        <p style="color:#6b7280;font-size:12px;font-family:Arial,sans-serif;">Your locker access code is available in the ROKI app under Active Cycle.</p>
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
        <!DOCTYPE html>
        <html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
        <body style="margin:0;padding:20px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
            <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
              <tr><td>${emailHeader()}</td></tr>
              <tr><td style="padding:32px 36px;background:#ffffff;">${emailBody}</td></tr>
              <tr><td>${emailFooter()}</td></tr>
            </table>
          </td></tr></table>
        </body></html>
      `,
    });

    console.log(`Email sent to ${userEmail} for cycle status: ${newStatus}`);
    return Response.json({ success: true, notified: userEmail, transition: `${oldStatus} → ${newStatus}` });
  } catch (error) {
    console.error('cycleStatusNotifier error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});