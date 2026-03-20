import React from 'react';

export default function TopReferrers({ entries }) {
  const referrers = entries
    .filter(e => (e.referral_count || 0) > 0)
    .sort((a, b) => (b.referral_count || 0) - (a.referral_count || 0))
    .slice(0, 10);

  if (referrers.length === 0) return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-8 text-center text-gray-600 font-mono text-sm">
      No referral activity yet.
    </div>
  );

  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
      <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-white/[0.06] text-gray-600 text-xs font-mono uppercase tracking-wider">
        <div className="col-span-1">#</div>
        <div className="col-span-5">Email</div>
        <div className="col-span-4">Gym</div>
        <div className="col-span-2 text-right">Referrals</div>
      </div>

      {referrers.map((r, i) => (
        <div key={r.id} className="grid grid-cols-12 gap-2 px-5 py-3.5 items-center border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
          <div className="col-span-1">
            <span className={`text-xs font-mono font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-gray-600'}`}>
              {i + 1}
            </span>
          </div>
          <div className="col-span-5">
            <p className="text-white text-sm font-medium truncate">{r.email}</p>
          </div>
          <div className="col-span-4">
            <p className="text-gray-400 text-sm truncate">{r.gym_name || '—'}</p>
          </div>
          <div className="col-span-2 text-right">
            <span className="text-green-400 font-bold text-sm">{r.referral_count}</span>
          </div>
        </div>
      ))}
    </div>
  );
}