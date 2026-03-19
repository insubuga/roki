import React from 'react';
import { Package, RefreshCw, Zap } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Zap,
    title: 'Activate a Cycle',
    description: 'Open the app, hit activate. A locker at your gym is instantly reserved under your name.',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
  },
  {
    number: '02',
    icon: Package,
    title: 'Drop & Go',
    description: 'After your workout, drop your dirty gear into the locker using your access code. That\'s it — you\'re done.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  {
    number: '03',
    icon: RefreshCw,
    title: 'Pick Up Clean',
    description: 'Within 48h your gear is washed, dried, and back in a locker ready for your next session.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-green-400 font-mono text-xs uppercase tracking-widest mb-3">How It Works</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            Three steps.<br />Zero friction.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className={`relative rounded-2xl border ${step.border} ${step.bg} p-7`}>
                <span className="text-6xl font-black text-white/5 absolute top-4 right-5 select-none">{step.number}</span>
                <div className={`w-11 h-11 rounded-xl ${step.bg} border ${step.border} flex items-center justify-center mb-5`}>
                  <Icon className={`w-5 h-5 ${step.color}`} />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}