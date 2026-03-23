import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import WaitlistSuccess from './WaitlistSuccess';

const FREQUENCIES = ['1-2x/week', '3-4x/week', '5-6x/week', 'Every day'];

export default function WaitlistSection({ sectionRef }) {
  const [email, setEmail] = useState('');
  const [gym, setGym] = useState('');
  const [frequency, setFrequency] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null); // { entry, position, gymRank }

  // Read referral code from URL
  const [referredBy, setReferredBy] = useState('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) setReferredBy(ref);
  }, []);

  // Normalize gym name: title case each word, trim whitespace
  const normalizeGym = (name) =>
    name.trim().replace(/\s+/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError('Email is required.'); return; }
    if (!gym) { setError('Gym name is required.'); return; }
    setLoading(true);
    setError('');

    try {
      // 0. Check for duplicate email
      const existing = await base44.entities.Waitlist.filter({ email: email.toLowerCase().trim() });
      if (existing.length > 0) {
        setError('This email is already on the waitlist!');
        setLoading(false);
        return;
      }

      const normalizedGym = normalizeGym(gym);

      // 1. Create entry
      const entry = await base44.entities.Waitlist.create({
        email: email.toLowerCase().trim(),
        gym_name: normalizedGym,
        ...(frequency ? { workout_frequency: frequency } : {}),
        ...(referredBy ? { referred_by: referredBy } : {}),
        referral_count: 0,
        tier: 'standard',
        status: 'pending',
      });

      // 2. Generate referral code from ID and update entry
      const referralCode = entry.id.slice(-10).toUpperCase();
      await base44.entities.Waitlist.update(entry.id, { referral_code: referralCode });

      // 3. If referred, increment referrer's count and update tier (fire and forget — non-blocking)
      if (referredBy) {
        base44.entities.Waitlist.filter({ referral_code: referredBy }).then((referrers) => {
          if (referrers.length > 0) {
            const referrer = referrers[0];
            const newCount = (referrer.referral_count || 0) + 1;
            const tier = newCount >= 10 ? 'founding_member'
              : newCount >= 5 ? 'first_cycle_free'
              : newCount >= 3 ? 'priority'
              : 'standard';
            return base44.entities.Waitlist.update(referrer.id, { referral_count: newCount, tier });
          }
        }).catch(() => {});
      }

      // 4. Get position using ascending order so each entry gets its true rank
      const allEntries = await base44.entities.Waitlist.list('created_date', 5000);
      const position = allEntries.findIndex(e => e.id === entry.id) + 1 || allEntries.length;
      const gymEntries = allEntries.filter(e => e.gym_name?.toLowerCase() === normalizedGym.toLowerCase());
      const gymRank = gymEntries.findIndex(e => e.id === entry.id) + 1 ?? gymEntries.length;

      // 5. Send email 1 (fire and forget)
      base44.functions.invoke('sendWaitlistEmail', {
        waitlist_id: entry.id,
        email_type: 'email_1',
      }).catch(() => {});

      // 6. Show success
      setSuccessData({
        entry: { ...entry, referral_code: referralCode, gym_name: normalizedGym },
        position,
        gymRank,
      });
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error('[waitlist submit]', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section ref={sectionRef} className="py-24 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-cyan-400 font-mono text-xs uppercase tracking-widest mb-3">Early Access</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
            Claim your spot.
          </h2>
          <p className="text-gray-400 text-base">
            We're launching gym by gym. Join the waitlist and we'll notify you when ROKI arrives at your gym.
          </p>
        </div>

        {successData ? (
          <WaitlistSuccess
            entry={successData.entry}
            position={successData.position}
            gymRank={successData.gymRank}
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {referredBy && (
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-2.5 text-cyan-400 text-xs font-mono text-center">
                ✓ Joining via referral — you'll both move up the list
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-white text-sm font-medium">Email address *</label>
              <Input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-[#1a1f2e] border-[#2a2f3e] text-white placeholder:text-gray-600 h-12 rounded-xl focus:border-cyan-500/50"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-white text-sm font-medium">Gym name *</label>
              <Input
                placeholder="e.g. CrossFit West Loop"
                value={gym}
                onChange={e => setGym(e.target.value)}
                className="bg-[#1a1f2e] border-[#2a2f3e] text-white placeholder:text-gray-600 h-12 rounded-xl focus:border-cyan-500/50"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-white text-sm font-medium">How often do you train? <span className="text-gray-500 font-normal">(optional)</span></label>
              <div className="grid grid-cols-2 gap-2">
                {FREQUENCIES.map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrequency(freq => freq === f ? '' : f)}
                    className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                      frequency === f
                        ? 'bg-cyan-500 border-cyan-500 text-black'
                        : 'bg-[#1a1f2e] border-[#2a2f3e] text-gray-300 hover:border-cyan-500/40 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold h-13 rounded-xl text-base transition-all"
              style={{ height: '52px' }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join the Waitlist →'}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}