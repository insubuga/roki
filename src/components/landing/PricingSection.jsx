import React from 'react';
import { Check, Minus } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: 19,
    tagline: 'Try it. No commitment.',
    color: 'text-gray-400',
    border: 'border-white/10',
    bg: 'bg-white/[0.02]',
    badge: null,
    features: [
      { text: '2 laundry cycles/month', included: true },
      { text: '48h turnaround SLA', included: true },
      { text: 'Gym-based locker access', included: true },
      { text: 'Cycle history & tracking', included: true },
      { text: 'Mobile app access', included: true },
      { text: 'Auto-scheduled cycles', included: false },
      { text: 'Sneaker cleaning', included: false },
      { text: 'Rush deliveries', included: false },
    ],
  },
  {
    name: 'Core',
    price: 29,
    tagline: 'For athletes who train consistently.',
    color: 'text-cyan-400',
    border: 'border-white/10',
    bg: 'bg-white/[0.03]',
    badge: null,
    features: [
      { text: '4 laundry cycles/month', included: true },
      { text: '48h turnaround SLA — or we credit you', included: true },
      { text: 'Gym-based locker access', included: true },
      { text: 'Auto-scheduled weekly cycles', included: true },
      { text: 'Cycle history & readiness tracking', included: true },
      { text: '20% off sneaker cleaning', included: true },
      { text: 'Rush delivery ($15/use)', included: true },
      { text: 'Priority locker & dispatch', included: false },
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
      { text: '8 laundry cycles/month', included: true },
      { text: '24h turnaround SLA — or we credit you', included: true },
      { text: 'Priority locker assignment', included: true },
      { text: 'Auto-scheduled cycles + forecast', included: true },
      { text: 'Premium sneaker cleaning included', included: true },
      { text: '2 free rush deliveries/month', included: true },
      { text: '12h emergency rush option', included: true },
      { text: 'Priority dispatch + dedicated support', included: true },
    ],
  },
];

export default function PricingSection({ onJoinClick }) {
  return (
    <section id="pricing" className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-cyan-400 font-mono text-xs uppercase tracking-widest mb-3">Pricing</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
            Simple, honest pricing.
          </h2>
          <p className="text-gray-400 text-base max-w-xl mx-auto">
            A single drop-off at a laundry service runs $20–40. ROKI gives you recurring cycles, a dedicated locker, and guaranteed turnaround — for less per month.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border ${plan.border} ${plan.bg} p-7 flex flex-col`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-black text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full whitespace-nowrap">
                  {plan.badge}
                </span>
              )}
              <div className="mb-6">
                <p className={`font-mono text-xs uppercase tracking-widest mb-1 ${plan.color}`}>{plan.name}</p>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-4xl font-black text-white">${plan.price}</span>
                  <span className="text-gray-500 text-sm mb-1">/month</span>
                </div>
                <p className="text-gray-400 text-sm leading-snug">{plan.tagline}</p>
              </div>

              <ul className="space-y-2.5 flex-1 mb-7">
                {plan.features.map((f) => (
                  <li key={f.text} className={`flex items-start gap-2.5 text-sm ${f.included ? 'text-gray-300' : 'text-gray-600'}`}>
                    {f.included
                      ? <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.color}`} />
                      : <Minus className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-700" />
                    }
                    {f.text}
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