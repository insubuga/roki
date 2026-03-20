import React from 'react';

const steps = [
  { number: '01', action: 'Drop dirty gear', detail: 'In your gym locker. Takes 10 seconds.' },
  { number: '02', action: 'We pick up & wash', detail: 'Professional clean. 24–48h turnaround.' },
  { number: '03', action: 'Gear back in locker', detail: 'Fresh, folded, ready for your next session.' },
];

export default function SimpleByDesignSection() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-green-400 font-mono text-xs uppercase tracking-widest mb-6">Simple by design</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            Drop your gear.<br />
            <span className="text-gray-500">We handle the rest.</span>
          </h2>
          <p className="text-gray-500 text-base mt-4 max-w-md mx-auto">
            Your next workout is already prepared.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {steps.map((s, i) => (
            <div
              key={i}
              className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 relative overflow-hidden"
            >
              {/* Step number watermark */}
              <span className="absolute top-3 right-4 text-5xl font-black text-white/[0.04] leading-none select-none">
                {s.number}
              </span>
              <div className="relative">
                <p className="text-white font-bold text-lg mb-1">{s.action}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{s.detail}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 text-gray-700 text-lg z-10">→</div>
              )}
            </div>
          ))}
        </div>

        {/* Time callout */}
        <div className="mt-8 text-center">
          <span className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-5 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-sm font-semibold">Average drop-off time: under 60 seconds</span>
          </span>
        </div>
      </div>
    </section>
  );
}