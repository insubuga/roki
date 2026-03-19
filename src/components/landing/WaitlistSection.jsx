import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const FREQUENCIES = ['1-2x/week', '3-4x/week', '5-6x/week', 'Every day'];

export default function WaitlistSection({ sectionRef }) {
  const [email, setEmail] = useState('');
  const [gym, setGym] = useState('');
  const [frequency, setFrequency] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError('Email is required.'); return; }
    if (!gym) { setError('Gym name is required.'); return; }
    setLoading(true);
    setError('');
    await base44.entities.Waitlist.create({
      email,
      gym_name: gym,
      ...(frequency ? { workout_frequency: frequency } : {}),
      status: 'pending',
    });
    setDone(true);
    setLoading(false);
  };

  return (
    <section ref={sectionRef} className="py-24 px-4">
      <div className="max-w-xl mx-auto">
        {/* Top divider glow */}
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

        {done ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-10 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-white font-bold text-xl mb-2">You're on the list.</h3>
            <p className="text-gray-400 text-sm">We'll reach out as soon as ROKI is live at a gym near you.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-8 space-y-4">
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

            {/* Workout frequency — optional pill select */}
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