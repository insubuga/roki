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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError('Email is required.'); return; }
    if (!gym) { setError('Gym name is required.'); return; }
    setLoading(true);
    setError('');

    // 1. Create entry
    const entry = await base44.entities.Waitlist.create({
      email,
      gym_name: gym,
      ...(frequency ? { workout_frequency: frequency } : {}),
      ...(referredBy ? { referred_by: referredBy } : {}),
      referral_count: 0,
      tier: 'standard',
      status: 'pending',
    });

    // 2. Generate referral code from ID and update entry
    const referralCode = entry.id.slice(-10).toUpperCase();
    await base44.entities.Waitlist.update(entry.id, { referral_code: referralCode });

    // 3. If referred, increment referrer's count and update tier
    if (referredBy) {
      const referrers = await base44.entities.Waitlist.filter({ referral_code: referredBy });
      if (referrers.length > 0) {
        const referrer = referrers[0];
        const newCount = (referrer.referral_count || 0) + 1;
        const tier = newCount >= 10 ? 'founding_member'
          : newCount >= 5 ? 'first_cycle_free'
          : newCount >= 3 ? 'priority'
          : 'standard';
        await base44.entities.Waitlist.update(referrer.id, { referral_count: newCount, tier });
      }
    }

    // 4. Get position (total entries) and gym rank (rank within this gym)
    const allEntries = await base44.entities.Waitlist.list('-created_date', 500);
    const position = allEntries.length;
    const gymEntries = allEntries.filter(e => e.gym_name?.toLowerCase() === gym.toLowerCase());
    const gymRank = gymEntries.findIndex(e => e.id === entry.id) + 1 || gymEntries.length;

    // 5. Show success
    setSuccessData({
      entry: { ...entry, referral_code: referralCode, gym_name: gym },
      position,
      gymRank,
    });
    setLoading(false);
  };

  return (
    <section ref={sectionRef} className="py-24 px-4">
      <div className="max-w-xl mx-auto">
        <div className="w-px h-16 bg-gradient-to-b from-transparent to-green-500/50 mx-auto mb-16" />

        <div className="text-center mb-10">
          <p className="text-green-400 font-mono text-xs uppercase tracking-widest mb-3">Early Access</p>
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
          <form onSubmit={handleSubmit} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-8 space-y-4">
            {referredBy && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2.5 text-green-400 text-xs font-mono text-center">
                ✓ Joining via referral — you'll both move up the list
              </div>
            )}
            <Input
              type="email"
              placeholder="Email address *"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-white/[0.05] border-white/10 text-white placeholder:text-gray-600 h-12 rounded-xl"
              required
            />
            <Input
              placeholder="Gym name *"
              value={gym}
              onChange={e => setGym(e.target.value)}
              className="bg-white/[0.05] border-white/10 text-white placeholder:text-gray-600 h-12 rounded-xl"
              required
            />
            <div>
              <p className="text-gray-500 text-xs mb-2 font-mono">How often do you train? <span className="text-gray-600">(optional)</span></p>
              <div className="flex flex-wrap gap-2">
                {FREQUENCIES.map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrequency(freq => freq === f ? '' : f)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      frequency === f
                        ? 'bg-green-500 border-green-500 text-black'
                        : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
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
              className="w-full bg-green-500 hover:bg-green-400 text-black font-bold h-12 rounded-xl shadow-lg shadow-green-500/20 text-base transition-all hover:scale-[1.02]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join the Waitlist →'}
            </Button>
            <p className="text-gray-600 text-xs text-center">No spam. No credit card. Just your spot in line.</p>
          </form>
        )}
      </div>
    </section>
  );
}