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
    <p style="color:#1f2937;font-size:10px;margin:8px 0 0;">© 2026 ROKI. Built for athletes who don't stop.</p>
  </div>
`;

const EMAIL_TEMPLATES = {
  email_1: (entry) => ({
    subject: 'Your gym just entered the Roki network',
    body: `
<div style="font-family:monospace;background:#0a0f1a;max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #1a2332;">
  ${emailHeader()}
  <div style="padding:32px;">
    <h1 style="font-size:24px;font-weight:900;margin:0 0 8px;color:#fff;">You're confirmed.</h1>
    <p style="color:#10b981;font-size:13px;margin:0 0 28px;letter-spacing:1px;text-transform:uppercase;">${entry.gym_name} is now on the network map.</p>

    <p style="color:#9ca3af;line-height:1.7;margin:0 0 12px;">Right now, gym bags pile up on locker room floors. Gear doesn't get washed until Sunday. Workouts get skipped because the kit isn't ready.</p>
    <p style="color:#9ca3af;line-height:1.7;margin:0;">ROKI fixes that at the gym level — lockers, logistics, laundry. Automated.</p>

    <div style="border:1px solid #1f2937;border-radius:12px;padding:20px;margin:28px 0;">
      <p style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;">What happens next</p>
      <div style="color:#d1d5db;font-size:14px;line-height:2.2;">
        ✓ Your spot is reserved at position #${entry.position || '—'}<br/>
        → We'll notify you when ROKI activates at ${entry.gym_name}<br/>
        → Invite gym members to move up the list
      </div>
    </div>

    <a href="${entry.referralUrl}" style="display:block;background:#10b981;color:black;font-weight:bold;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-size:15px;margin-bottom:20px;">
      Share your referral link →
    </a>

    <p style="color:#374151;font-size:11px;text-align:center;margin:0;">Invite 3 → Priority Access &nbsp;|&nbsp; Invite 5 → First Cycle Free &nbsp;|&nbsp; Invite 10 → Founding Member</p>
  </div>
  ${emailFooter()}
</div>
    `.trim(),
  }),

  email_2: (entry) => ({
    subject: 'Your next workout, already handled',
    body: `
<div style="font-family:monospace;background:#0a0f1a;max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #1a2332;">
  ${emailHeader()}
  <div style="padding:32px;">
    <h1 style="font-size:24px;font-weight:900;margin:0 0 24px;color:#fff;">Picture this.</h1>

    <div style="border-left:3px solid #10b981;padding-left:20px;margin-bottom:28px;">
      <p style="color:#d1d5db;line-height:2;margin:0;">You arrive at ${entry.gym_name}.<br/>The locker opens with your code.<br/>Your gear is clean, folded, ready.<br/>You drop your dirty kit on the way out.<br/>That's it. You don't think about laundry again.</p>
    </div>

    <p style="color:#9ca3af;line-height:1.7;margin:0 0 12px;">That's the ROKI cycle. It runs automatically, every week, timed to your schedule. No pickups. No drop-offs at home. No dragging a bag across the city.</p>
    <p style="color:#9ca3af;line-height:1.7;margin:0;">We're activating gyms based on demand. You're at position #${entry.position || '—'}. Invite your gym crew to move up.</p>

    <a href="${entry.referralUrl}" style="display:block;background:#10b981;color:black;font-weight:bold;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-size:15px;margin-top:28px;">
      Invite ${entry.gym_name} members →
    </a>
  </div>
  ${emailFooter()}
</div>
    `.trim(),
  }),

  email_3: (entry) => ({
    subject: "We're activating gyms soon",
    body: `
<div style="font-family:monospace;background:#0a0f1a;max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #1a2332;">
  ${emailHeader()}
  <div style="padding:32px;">
    <div style="background:#10b981;color:black;text-align:center;padding:8px;border-radius:8px;font-size:12px;font-weight:bold;letter-spacing:2px;margin-bottom:28px;">⚡ LIMITED ROLLOUT IN PROGRESS</div>

    <h1 style="font-size:24px;font-weight:900;margin:0 0 16px;color:#fff;">Activation is starting.</h1>

    <p style="color:#9ca3af;line-height:1.7;margin:0 0 24px;">We're rolling out to the first wave of gyms this quarter. Activation order is determined by demand — the gyms with the most waitlist members go first.</p>

    <div style="border:1px solid #1f2937;border-radius:12px;padding:20px;margin-bottom:24px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
        <span style="color:#6b7280;font-size:12px;">Your gym</span>
        <span style="color:#fff;font-weight:bold;">${entry.gym_name}</span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="color:#6b7280;font-size:12px;">Your position</span>
        <span style="color:#10b981;font-weight:bold;font-size:16px;">#${entry.position || '—'}</span>
      </div>
    </div>

    <p style="color:#9ca3af;line-height:1.7;margin:0;">Every person from your gym who joins moves ${entry.gym_name} up the activation queue. Share your link.</p>

    <a href="${entry.referralUrl}" style="display:block;background:#10b981;color:black;font-weight:bold;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-size:15px;margin-top:20px;">
      Move ${entry.gym_name} up the list →
    </a>
  </div>
  ${emailFooter()}
</div>
    `.trim(),
  }),

  email_4: (entry) => ({
    subject: 'Move your gym up the list',
    body: `
<div style="font-family:monospace;background:#0a0f1a;max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #1a2332;">
  ${emailHeader()}
  <div style="padding:32px;">
    <h1 style="font-size:24px;font-weight:900;margin:0 0 8px;color:#fff;">You have ${entry.referral_count || 0} referral${(entry.referral_count || 0) !== 1 ? 's' : ''}.</h1>

    ${(entry.referral_count || 0) < 3 ? `<p style="color:#10b981;font-size:14px;margin:0 0 24px;">${3 - (entry.referral_count || 0)} more to unlock Priority Access.</p>` : ''}
    ${(entry.referral_count || 0) >= 3 && (entry.referral_count || 0) < 5 ? `<p style="color:#f59e0b;font-size:14px;margin:0 0 24px;">${5 - (entry.referral_count || 0)} more to unlock First Cycle Free.</p>` : ''}
    ${(entry.referral_count || 0) >= 5 && (entry.referral_count || 0) < 10 ? `<p style="color:#a855f7;font-size:14px;margin:0 0 24px;">${10 - (entry.referral_count || 0)} more to unlock Founding Member status.</p>` : ''}
    ${(entry.referral_count || 0) >= 10 ? `<p style="color:#a855f7;font-size:14px;margin:0 0 24px;">You're a Founding Member. 🏆</p>` : ''}

    <div style="border:1px solid #1f2937;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;">Tier Milestones</p>
      <div style="color:#d1d5db;font-size:13px;line-height:2.2;">
        ${(entry.referral_count || 0) >= 3 ? '✅' : '○'} 3 invites → <strong>Priority Access</strong><br/>
        ${(entry.referral_count || 0) >= 5 ? '✅' : '○'} 5 invites → <strong>First Cycle Free</strong><br/>
        ${(entry.referral_count || 0) >= 10 ? '✅' : '○'} 10 invites → <strong>Founding Member Status</strong>
      </div>
    </div>

    <a href="${entry.referralUrl}" style="display:block;background:#10b981;color:black;font-weight:bold;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-size:15px;">
      Your referral link →
    </a>

    <p style="color:#374151;font-size:11px;text-align:center;margin-top:16px;word-break:break-all;">${entry.referralUrl}</p>
  </div>
  ${emailFooter()}
</div>
    `.trim(),
  }),
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { waitlist_id, email_type } = await req.json();

    if (!waitlist_id || !email_type) {
      return Response.json({ error: 'Missing waitlist_id or email_type' }, { status: 400 });
    }

    const entry = await base44.asServiceRole.entities.Waitlist.get(waitlist_id);
    if (!entry) return Response.json({ error: 'Entry not found' }, { status: 404 });

    if (entry[email_type + '_sent']) {
      return Response.json({ skipped: true, reason: 'Already sent' });
    }

    const appUrl = req.headers.get('origin') || 'https://rokicyclenetwork.com';
    const referralUrl = entry.referral_code
      ? `${appUrl}/?ref=${entry.referral_code}`
      : appUrl;

    // Calculate global waitlist position (how many signed up before this entry)
    const allEntries = await base44.asServiceRole.entities.Waitlist.list('created_date', 10000);
    const position = allEntries.findIndex(e => e.id === entry.id) + 1;

    const enriched = { ...entry, referralUrl, position: position || '—' };
    const template = EMAIL_TEMPLATES[email_type]?.(enriched);

    if (!template) return Response.json({ error: 'Unknown email type' }, { status: 400 });

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: entry.email,
      subject: template.subject,
      body: template.body,
    });

    await base44.asServiceRole.entities.Waitlist.update(waitlist_id, {
      [`${email_type}_sent`]: true,
    });

    console.log(`[waitlist] Sent ${email_type} to ${entry.email}`);
    return Response.json({ success: true, email_type, to: entry.email });
  } catch (error) {
    console.error('[waitlist email error]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});