import React from 'react';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Core',
    price: 29,
    tagline: 'Everything you need to stay ready.',
    color: 'text-cyan-400',
    border: 'border-white/10',
    bg: 'bg-white/[0.03]',
    badge: null,
    features: [
      '48h turnaround SLA',
      'Gym-based locker access',
      'Auto-scheduled cycles',
      'Cycle history & tracking',
      'Mobile app access',
    ],
  },
  {
    name: 'Priority',
    price: 59,
    tagline: 'For athletes who never compromise.',
    color: 'text-cyan-300',
    border: 'border-cyan-500/40',
    bg: 'bg-cyan-500/[0.05]',
    badge: 'Most Popular',
    features: [
      'Everything in Core',
      '24h priority turnaround',
      'Premium sneaker cleaning',
      '2 rush deliveries/month',
      'Priority locker assignment',
      'Priority dispatch',
      'Dedicated support',
    ],
  },
];

export default function PricingSection({ onJoinClick }) {
  return (
    <section id="pricing" className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-cyan-400 font-mono text-xs uppercase tracking-widest mb-3">Pricing</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
            Simple, honest pricing.
          </h2>
          <p className="text-gray-400 text-base max-w-xl mx-auto">
            No hidden fees. No per-item charges. A flat monthly plan that covers your gear, your locker, and your peace of mind.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border ${plan.border} ${plan.bg} p-7 flex flex-col`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-black text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  {plan.badge}
                </span>
              )}
              <div className="mb-6">
                <p className={`font-mono text-xs uppercase tracking-widest mb-1 ${plan.color}`}>{plan.name}</p>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-4xl font-black text-white">${plan.price}</span>
                  <span className="text-gray-500 text-sm mb-1">/month</span>
                </div>
                <p className="text-gray-400 text-sm">{plan.tagline}</p>
              </div>

              <ul className="space-y-2.5 flex-1 mb-7">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                    <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.color}`} />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={onJoinClick}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                  plan.badge
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/20'
                    : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                }`}
              >
                Join Waitlist — Lock In This Price
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Early waitlist members lock in launch pricing. Prices may increase at public launch.
        </p>
      </div>
    </section>
  );
}