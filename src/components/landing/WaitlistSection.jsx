import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function WaitlistSection({ sectionRef }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [gym, setGym] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError('Email is required'); return; }
    setLoading(true);
    setError('');
    await base44.entities.Waitlist.create({ email, name, gym_name: gym, status: 'pending' });
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="bg-white/[0.05] border-white/10 text-white placeholder:text-gray-600 h-12 rounded-xl"
              />
              <Input
                placeholder="Your gym (optional)"
                value={gym}
                onChange={e => setGym(e.target.value)}
                className="bg-white/[0.05] border-white/10 text-white placeholder:text-gray-600 h-12 rounded-xl"
              />
            </div>
            <Input
              type="email"
              placeholder="Email address *"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-white/[0.05] border-white/10 text-white placeholder:text-gray-600 h-12 rounded-xl"
              required
            />
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