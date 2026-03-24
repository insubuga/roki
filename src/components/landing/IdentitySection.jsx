import React from 'react';

const profiles = [
  {
    label: 'The Daily Lifter',
    description: "You train 5–6 days a week. Your clothes are soaked every session. Laundry piles up fast. Sometimes you're not even sure what's clean. Roki makes sure you always have fresh gear ready.",
  },
  {
    label: 'The Consistent One',
    description: "You don't skip workouts. Even when life gets busy. The last thing you need is laundry slowing you down. Roki keeps your routine uninterrupted.",
  },
  {
    label: 'The Gym Regular',
    description: "You're always there. Same time. Same work. But dealing with sweaty clothes every day gets old. Roki handles it so you don't have to.",
  },
];

export default function IdentitySection() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-cyan-400 font-mono text-xs uppercase tracking-widest mb-4">Built For</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-5">
            Built for people who train<br className="hidden sm:block" /> almost every day.
          </h2>
          <p className="text-gray-400 text-base max-w-md mx-auto">
            For people who show up, sweat hard, and do it again tomorrow.<br className="hidden sm:block" /> Always have clean gear ready for your next session.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {profiles.map((p) => (
            <div
              key={p.label}
              className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 hover:border-white/[0.14] hover:bg-white/[0.05] transition-all"
            >
              <div className="w-1 h-8 bg-cyan-500 rounded-full mb-5" />
              <h3 className="text-white font-bold text-base mb-3">{p.label}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{p.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}