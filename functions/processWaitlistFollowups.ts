import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Runs daily. Sends follow-up emails based on how long ago each entry was created.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const results = { email_2: 0, email_3: 0, email_4: 0, errors: 0 };

    const entries = await base44.asServiceRole.entities.Waitlist.list('-created_date', 1000);

    for (const entry of entries) {
      if (!entry.email) continue;
      const createdAt = new Date(entry.created_date);
      const hoursAgo = (now - createdAt) / (1000 * 60 * 60);

      const appUrl = 'https://app.base44.com';
      const referralUrl = entry.referral_code ? `${appUrl}/?ref=${entry.referral_code}` : appUrl;

      // Email 2: ~24h after signup
      if (hoursAgo >= 22 && hoursAgo < 48 && !entry.email_2_sent) {
        await base44.asServiceRole.functions.invoke('sendWaitlistEmail', {
          waitlist_id: entry.id,
          email_type: 'email_2',
        });
        results.email_2++;
      }

      // Email 3: ~3 days after signup
      if (hoursAgo >= 68 && hoursAgo < 96 && !entry.email_3_sent) {
        await base44.asServiceRole.functions.invoke('sendWaitlistEmail', {
          waitlist_id: entry.id,
          email_type: 'email_3',
        });
        results.email_3++;
      }

      // Email 4: ~7 days after signup
      if (hoursAgo >= 162 && hoursAgo < 192 && !entry.email_4_sent) {
        await base44.asServiceRole.functions.invoke('sendWaitlistEmail', {
          waitlist_id: entry.id,
          email_type: 'email_4',
        });
        results.email_4++;
      }
    }

    console.log('[waitlist followups]', JSON.stringify(results));
    return Response.json({ success: true, processed: results });
  } catch (error) {
    console.error('[waitlist followup error]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});