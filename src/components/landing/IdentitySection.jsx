import React from 'react';

const profiles = [
  {
    label: 'The Busy Professional',
    description: "You're in back-to-back meetings until 7pm. Somehow you still make it to the gym. You don't have time to babysit your laundry too.",
  },
  {
    label: 'The Parent',
    description: "Your laundry pile has a laundry pile. You train to stay sane. The last thing you need is one more thing to remember.",
  },
  {
    label: 'The Rebuilder',
    description: 'You're getting back into it. Consistency is fragile right now. Anything that removes friction between you and the gym stays.',
  },
];

export default function IdentitySection() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-green-400 font-mono text-xs uppercase tracking-widest mb-4">Built For</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-5">
            People who don't have time<br className="hidden sm:block" /> to think about laundry.
          </h2>
          <p className="text-gray-400 text-base max-w-md mx-auto">
            Not fitness influencers. Not people with spare afternoons. You.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {profiles.map((p) => (
            <div
              key={p.label}
              className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 hover:border-white/[0.14] hover:bg-white/[0.05] transition-all"
            >
              <div className="w-1 h-8 bg-green-500 rounded-full mb-5" />
              <h3 className="text-white font-bold text-base mb-3">{p.label}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{p.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}