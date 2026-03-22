import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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

    // Only notify when driver delivers clean gear
    if (newStatus !== 'delivered' || oldStatus === 'delivered') {
      return Response.json({ skipped: `no notification needed (${oldStatus} → ${newStatus})` });
    }

    const userEmail = data?.user_email;
    const accessCode = data?.access_code;

    if (!userEmail) {
      return Response.json({ skipped: 'no user_email' });
    }

    // Look up the locker number for a friendlier message
    let lockerNumber = '—';
    if (data?.locker_id) {
      try {
        const locker = await base44.asServiceRole.entities.Locker.get(data.locker_id);
        lockerNumber = locker?.locker_number || '—';
      } catch (_) {}
    }

    // 1. In-app notification
    await base44.asServiceRole.entities.Notification.create({
      user_email: userEmail,
      type: 'laundry',
      title: '✅ Clean gear is ready!',
      message: `Your freshly cleaned gear is waiting in locker #${lockerNumber}. Use code ${accessCode} to collect.`,
      action_url: '/ActiveCycle',
      priority: 'high',
      read: false,
    });

    console.log(`Return delivery notification sent to ${userEmail}, locker #${lockerNumber}`);

    // 2. Email notification
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: userEmail,
      subject: 'ROKI: Your clean gear is ready for pickup! 👕',
      body: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:8px;">
          <div style="background:#16a34a;padding:12px 20px;border-radius:6px;margin-bottom:20px;">
            <span style="color:white;font-weight:bold;font-size:18px;letter-spacing:2px;">ROKI</span>
          </div>
          <h2 style="color:#111827;">Your clean gear is ready! ✅</h2>
          <p style="color:#374151;">Great news — your freshly cleaned gear has been placed back in your locker.</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0;text-align:center;">
            <p style="color:#15803d;font-size:13px;margin:0 0 8px 0;font-weight:600;">LOCKER #${lockerNumber}</p>
            <p style="color:#111827;font-size:36px;font-weight:bold;letter-spacing:0.3em;margin:0;">${accessCode}</p>
            <p style="color:#6b7280;font-size:12px;margin:8px 0 0 0;">Your access code</p>
          </div>
          <p style="color:#374151;">Head to your gym to collect your gear at your convenience.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"/>
          <p style="color:#9ca3af;font-size:11px;">ROKI Readiness OS — keeping your gear clean and ready.</p>
        </div>
      `,
    });

    console.log(`Return delivery email sent to ${userEmail}`);

    return Response.json({ success: true, notified: userEmail });
  } catch (error) {
    console.error('returnLockerNotifier error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});