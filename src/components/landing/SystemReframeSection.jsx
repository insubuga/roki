import React from 'react';

const contrasts = [
  { left: 'A laundry service', right: 'A readiness system' },
  { left: 'Something you manage', right: 'Something that runs itself' },
  { left: 'Another errand', right: 'Zero mental load' },
];

export default function SystemReframeSection() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Label */}
        <p className="text-green-400 font-mono text-xs uppercase tracking-widest mb-6 text-center">
          This isn't laundry
        </p>

        {/* Main statement */}
        <div className="text-center mb-14">
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-6">
            ROKI is a system that runs<br />in the background of your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">
              training life.
            </span>
          </h2>

          <div className="space-y-3 text-xl sm:text-2xl font-bold text-gray-500 leading-relaxed">
            <p>You don't think about laundry.</p>
            <p>You don't plan for gear.</p>
            <p className="text-white">You just show up.</p>
          </div>
        </div>

        {/* Contrast table */}
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <div className="grid grid-cols-2 border-b border-white/10">
            <div className="px-5 py-3 text-gray-600 text-xs font-mono uppercase tracking-widest">Other services</div>
            <div className="px-5 py-3 text-green-400 text-xs font-mono uppercase tracking-widest border-l border-white/10">ROKI</div>
          </div>
          {contrasts.map((row, i) => (
            <div
              key={i}
              className={`grid grid-cols-2 ${i < contrasts.length - 1 ? 'border-b border-white/10' : ''}`}
            >
              <div className="px-5 py-4 flex items-center gap-2.5 text-gray-500 text-sm">
                <span className="text-red-500/60 text-base leading-none">✕</span>
                {row.left}
              </div>
              <div className="px-5 py-4 flex items-center gap-2.5 text-white text-sm font-medium border-l border-white/10 bg-green-500/[0.04]">
                <span className="text-green-400 text-base leading-none">✓</span>
                {row.right}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}