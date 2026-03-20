import React from 'react';
import { X } from 'lucide-react';

export default function GymDetailModal({ gym, entries, onClose }) {
  const now = Date.now();
  const h24 = now - 24 * 60 * 60 * 1000;
  const d7  = now - 7 * 24 * 60 * 60 * 1000;

  const recent24h = entries
    .filter(e => new Date(e.created_date).getTime() > h24)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const topReferrers = entries
    .filter(e => (e.referral_count || 0) > 0)
    .sort((a, b) => (b.referral_count || 0) - (a.referral_count || 0))
    .slice(0, 5);

  const new7d = entries.filter(e => new Date(e.created_date).getTime() > d7).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#0d1520] border border-white/[0.1] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/[0.06]">
          <div>
            <h3 className="text-white font-black text-xl">{gym.name}</h3>
            <p className="text-gray-500 text-sm mt-0.5">
              {gym.entries.length} total · {gym.new24h} new today · {new7d} this week
            </p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Signups', value: gym.entries.length, color: 'text-white' },
              { label: 'Total Referrals', value: gym.referrals, color: 'text-blue-400' },
              { label: 'Last 7 days', value: `+${new7d}`, color: 'text-green-400' },
            ].map(s => (
              <div key={s.label} className="bg-white/[0.04] rounded-xl p-3 text-center">
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-gray-600 text-xs mt-1 font-mono">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Top referrers */}
          {topReferrers.length > 0 && (
            <div>
              <p className="text-gray-400 text-xs font-mono uppercase tracking-wider mb-3">Top Referrers</p>
              <div className="space-y-2">
                {topReferrers.map(r => (
                  <div key={r.id} className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-2.5">
                    <span className="text-white text-sm">{r.email}</span>
                    <span className="text-green-400 font-bold text-sm">{r.referral_count} refs</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent signups */}
          <div>
            <p className="text-gray-400 text-xs font-mono uppercase tracking-wider mb-3">
              Recent Signups (24h) — {recent24h.length} new
            </p>
            {recent24h.length === 0 ? (
              <p className="text-gray-600 text-sm">No new signups in the last 24 hours.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {recent24h.map(e => (
                  <div key={e.id} className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-2.5">
                    <span className="text-white text-sm">{e.email}</span>
                    <div className="flex items-center gap-3">
                      {e.referred_by && <span className="text-green-400 text-xs font-mono">referred</span>}
                      <span className="text-gray-600 text-xs">{new Date(e.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}