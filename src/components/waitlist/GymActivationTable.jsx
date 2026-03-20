import React from 'react';
import { ChevronRight, Zap } from 'lucide-react';

function getStatus(count) {
  if (count >= 20) return { label: 'Ready', color: 'bg-green-500/20 text-green-400 border-green-500/40', dot: 'bg-green-400' };
  if (count >= 10) return { label: 'Close', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40', dot: 'bg-yellow-400' };
  return { label: 'Not Ready', color: 'bg-white/5 text-gray-500 border-white/10', dot: 'bg-gray-600' };
}

function getTrend(new24h, new48h) {
  if (new24h > new48h) return { icon: '↑', color: 'text-green-400', label: 'growing' };
  if (new24h === new48h && new24h === 0) return { icon: '→', color: 'text-gray-500', label: 'stable' };
  if (new24h < new48h) return { icon: '↓', color: 'text-red-400', label: 'slowing' };
  return { icon: '→', color: 'text-gray-500', label: 'stable' };
}

export default function GymActivationTable({ gyms, onSelectGym, isLoading }) {
  if (isLoading) return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-8 text-center text-gray-600 font-mono text-sm">
      Loading gym data...
    </div>
  );

  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-white/[0.06] text-gray-600 text-xs font-mono uppercase tracking-wider">
        <div className="col-span-4">Gym</div>
        <div className="col-span-2 text-right">Signups</div>
        <div className="col-span-2 text-right">Referrals</div>
        <div className="col-span-1 text-center">24h</div>
        <div className="col-span-1 text-center">Trend</div>
        <div className="col-span-2 text-right">Status</div>
      </div>

      {gyms.length === 0 && (
        <div className="px-5 py-10 text-center text-gray-600 text-sm">No gym data yet.</div>
      )}

      {gyms.map((gym, i) => {
        const status = getStatus(gym.entries.length);
        const trend = getTrend(gym.new24h, gym.new48h);
        const isReady = gym.entries.length >= 20;
        const hasConsistentGrowth = gym.new7d >= 5;

        return (
          <div
            key={gym.name}
            onClick={() => onSelectGym(gym)}
            className={`grid grid-cols-12 gap-2 px-5 py-4 items-center border-b border-white/[0.04] cursor-pointer transition-all hover:bg-white/[0.04] last:border-0 ${isReady ? 'bg-green-500/[0.03]' : ''}`}
          >
            <div className="col-span-4 flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status.dot}`} />
              <div>
                <p className="text-white font-semibold text-sm flex items-center gap-2">
                  {gym.name}
                  {isReady && hasConsistentGrowth && (
                    <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-400 text-[10px] font-mono px-2 py-0.5 rounded-full border border-green-500/30">
                      <Zap className="w-2.5 h-2.5" /> ACTIVATE
                    </span>
                  )}
                </p>
                <p className="text-gray-600 text-xs">#{i + 1} by demand</p>
              </div>
            </div>

            <div className="col-span-2 text-right">
              <span className="text-white font-bold">{gym.entries.length}</span>
            </div>

            <div className="col-span-2 text-right">
              <span className="text-blue-400 font-semibold">{gym.referrals}</span>
            </div>

            <div className="col-span-1 text-center">
              <span className={`text-sm font-semibold ${gym.new24h > 0 ? 'text-green-400' : 'text-gray-600'}`}>
                +{gym.new24h}
              </span>
            </div>

            <div className="col-span-1 text-center">
              <span className={`text-base font-bold ${trend.color}`} title={trend.label}>{trend.icon}</span>
            </div>

            <div className="col-span-2 flex justify-end items-center gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${status.color}`}>
                {status.label}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-700" />
            </div>
          </div>
        );
      })}
    </div>
  );
}