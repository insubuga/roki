import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { MapPin } from 'lucide-react';

export default function ScarcitySection() {
  const [gymRankings, setGymRankings] = useState([]);

  useEffect(() => {
    const FALLBACK_GYMS = [
      '24 Hour Fitness',
      'Equinox',
      'Planet Fitness',
      'Lifetime Fitness',
      'Anytime Fitness',
    ];

    const load = async () => {
      const entries = await base44.entities.Waitlist.list('-created_date', 500);
      // Count entries per gym (case-insensitive dedup, preserve first seen casing)
      const counts = {};
      const displayNames = {};
      entries.forEach(e => {
        if (!e.gym_name) return;
        const key = e.gym_name.trim().toLowerCase();
        if (!displayNames[key]) displayNames[key] = e.gym_name.trim();
        counts[key] = (counts[key] || 0) + 1;
      });

      let sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([key, count], i) => ({ name: displayNames[key], count, rank: i + 1 }));

      // If fewer than 5 real gyms, pad with fallbacks
      const realNames = new Set(sorted.map(g => g.name.toLowerCase()));
      let fallbackIdx = 0;
      while (sorted.length < 5 && fallbackIdx < FALLBACK_GYMS.length) {
        const fb = FALLBACK_GYMS[fallbackIdx];
        if (!realNames.has(fb.toLowerCase())) {
          sorted.push({ name: fb, count: null, rank: sorted.length + 1 });
        }
        fallbackIdx++;
      }

      setGymRankings(sorted);
    };
    load().catch(() => {});
  }, []);

  const rankColors = ['text-yellow-400', 'text-gray-300', 'text-orange-400', 'text-gray-500', 'text-gray-600'];
  const rankBg = ['bg-yellow-400/10 border-yellow-400/25', 'bg-gray-300/10 border-gray-300/20', 'bg-orange-400/10 border-orange-400/20', 'bg-white/[0.04] border-white/10', 'bg-white/[0.03] border-white/[0.07]'];

  return (
    <section id="gym-rankings" className="py-24 px-4">
      <div className="max-w-2xl mx-auto">
        <p className="text-green-400 font-mono text-xs uppercase tracking-widest mb-4 text-center">
          Infrastructure Rollout
        </p>

        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
            We activate gyms<br />based on demand.
          </h2>
          <p className="text-gray-400 text-base max-w-lg mx-auto leading-relaxed">
            Only the top gyms in each city go live first. Every person who joins the waitlist votes their gym up the list.
          </p>
        </div>

        {/* Rankings */}
        {gymRankings.length > 0 ? (
          <div className="space-y-3 mb-10">
            {gymRankings.map((gym) => (
              <div
                key={gym.name}
                className={`flex items-center gap-4 px-5 py-4 rounded-xl border ${rankBg[gym.rank - 1]} transition-all`}
              >
                <span className={`font-black text-lg w-6 text-center ${rankColors[gym.rank - 1]}`}>
                  #{gym.rank}
                </span>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                  <span className="text-white font-semibold text-sm truncate">{gym.name}</span>
                </div>
                {gym.count !== null && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-green-400 font-mono text-xs">{gym.count} member{gym.count !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3 mb-10">
            {/* Placeholder skeleton rows */}
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 rounded-xl border border-white/[0.07] bg-white/[0.03]">
                <div className="w-6 h-5 bg-white/10 rounded animate-pulse" />
                <div className="flex-1 h-4 bg-white/10 rounded animate-pulse" />
                <div className="w-20 h-4 bg-white/5 rounded animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* CTA nudge */}
        <div className="text-center">
          <p className="text-gray-500 text-sm">
            Don't see your gym?{' '}
            <span className="text-white font-semibold">Join the waitlist and push it up the rankings.</span>
          </p>
        </div>
      </div>
    </section>
  );
}