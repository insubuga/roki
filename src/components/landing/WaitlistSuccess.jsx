import React, { useState } from 'react';
import { CheckCircle, Copy, Check, Users, Zap, Star, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TIERS = [
  { count: 3,  label: 'Priority Access',      icon: Zap,   color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30' },
  { count: 5,  label: 'First Cycle Free',      icon: Star,  color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30' },
  { count: 10, label: 'Founding Member Status',icon: Crown, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
];

export default function WaitlistSuccess({ entry, position, gymRank }) {
  const [copied, setCopied] = useState(false);
  const referralUrl = `${window.location.origin}/?ref=${entry.referral_code}`;
  const count = entry.referral_count || 0;

  const nextTier = TIERS.find(t => count < t.count);
  const currentTier = [...TIERS].reverse().find(t => count >= t.count);

  const copyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* System moment header */}
      <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-7 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#06b6d4 1px, transparent 1px), linear-gradient(90deg, #06b6d4 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
        <div className="relative z-10">
          <div className="w-14 h-14 bg-cyan-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-cyan-400" />
          </div>
          <h3 className="text-white font-black text-xl sm:text-2xl leading-tight mb-2">
            You're in. Your gym is now<br />on the Roki network map.
          </h3>
          <p className="text-gray-500 text-xs font-mono mt-3">CHECK YOUR INBOX — CONFIRMATION SENT</p>
        </div>
      </div>

      {/* Gym status card */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
        <div className="flex items-center justify-between text-sm mb-4">
          <span className="text-gray-500 font-mono uppercase text-xs">Network Node</span>
          <span className="text-cyan-400 font-mono text-xs flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            PENDING ACTIVATION
          </span>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Gym</span>
            <span className="text-white font-semibold text-sm">{entry.gym_name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Your Position</span>
            <span className="text-white font-mono font-bold">#{position}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Gym Rank</span>
            <span className="text-cyan-400 font-mono font-bold">#{gymRank} at {entry.gym_name}</span>
          </div>
          {currentTier && (
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Status</span>
              <span className={`font-semibold text-sm ${currentTier.color}`}>{currentTier.label}</span>
            </div>
          )}
        </div>
      </div>

      {/* Referral engine */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 space-y-4">
        <div>
          <p className="text-white font-bold text-sm mb-1 flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            Move your gym up the list
          </p>
          <p className="text-gray-500 text-xs">Invite people from your gym to unlock access tiers.</p>
        </div>

        {/* Tier progress */}
        <div className="space-y-2">
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            const unlocked = count >= tier.count;
            const isNext = nextTier?.count === tier.count;
            return (
              <div key={tier.count}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  unlocked ? `${tier.bg} ${tier.border}` : isNext ? 'border-white/15 bg-white/[0.02]' : 'border-white/5 opacity-50'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${unlocked || isNext ? tier.color : 'text-gray-600'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${unlocked ? 'text-white' : 'text-gray-400'}`}>{tier.label}</p>
                </div>
                <span className={`text-xs font-mono font-bold flex-shrink-0 ${unlocked ? tier.color : 'text-gray-600'}`}>
                  {unlocked ? '✓' : `${count}/${tier.count}`}
                </span>
              </div>
            );
          })}
        </div>

        {/* Count display */}
        <div className="text-center py-1">
          <span className="text-3xl font-black text-white">{count}</span>
          <span className="text-gray-500 text-sm ml-2">invite{count !== 1 ? 's' : ''} so far</span>
          {nextTier && (
            <p className="text-gray-600 text-xs mt-1">{nextTier.count - count} more to unlock <span className={nextTier.color}>{nextTier.label}</span></p>
          )}
        </div>

        {/* Referral link */}
        <div className="flex gap-2">
          <div className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-gray-400 text-xs font-mono truncate">
            {referralUrl}
          </div>
          <Button
            onClick={copyLink}
            className={`flex-shrink-0 h-10 px-4 rounded-xl font-semibold text-xs transition-all ${
              copied ? 'bg-cyan-600 text-white' : 'bg-white/10 hover:bg-white/15 text-white'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}