import React, { useEffect, useState } from 'react';

export default function LockerVisualSection() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Auto-trigger the open animation after mount
    const t = setTimeout(() => setOpen(true), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="py-24 px-4 overflow-hidden">
      <div className="max-w-4xl mx-auto text-center">
        {/* Label */}
        <p className="text-green-400 font-mono text-xs uppercase tracking-widest mb-4">
          The Experience
        </p>
        <h2 className="text-4xl sm:text-5xl font-black text-white mb-16 leading-tight">
          Your gear. Clean.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">
            Waiting for you.
          </span>
        </h2>

        {/* Locker Scene */}
        <div className="relative flex items-end justify-center gap-4 sm:gap-6 mb-16">
          {/* Side lockers (closed, dimmed) */}
          {[-1, 1].map((side) => (
            <div
              key={side}
              className="hidden sm:flex flex-col w-20 h-48 rounded-xl border border-white/10 bg-white/[0.03] items-center justify-center gap-3 opacity-30"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10" />
              <div className="w-4 h-4 rounded-full border border-white/20" />
            </div>
          ))}

          {/* Hero Locker */}
          <div className="relative flex flex-col items-center">
            {/* Locker Body */}
            <div
              className={`relative w-52 sm:w-64 rounded-2xl border-2 transition-all duration-700 overflow-hidden
                ${open
                  ? 'border-green-500/60 shadow-[0_0_60px_rgba(34,197,94,0.25)]'
                  : 'border-white/20 shadow-none'
                }
              `}
              style={{ background: open ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)' }}
            >
              {/* Door — slides up to open */}
              <div
                className={`absolute inset-0 z-10 bg-[#111b26] border-b-2 transition-all duration-700 ease-in-out rounded-2xl flex flex-col items-center justify-center gap-3
                  ${open ? '-translate-y-full' : 'translate-y-0'}
                `}
                style={{ borderColor: 'rgba(255,255,255,0.12)' }}
              >
                {/* Locker number plate */}
                <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-1.5">
                  <span className="text-white/60 font-mono text-sm font-bold">#14</span>
                </div>
                {/* Handle */}
                <div className="w-6 h-6 rounded-full border-2 border-white/20 bg-white/5" />
                {/* Keypad dots */}
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-white/15" />
                  ))}
                </div>
              </div>

              {/* Interior — revealed when open */}
              <div className="px-6 pt-8 pb-8 flex flex-col items-center gap-5 min-h-[240px] justify-center">
                {/* ROKI Sleeve / Bag */}
                <div
                  className={`w-28 h-36 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-500 delay-300 shadow-xl
                    ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}
                  `}
                  style={{
                    background: 'linear-gradient(145deg, #1a2e1a, #0f1f0f)',
                    border: '2px solid rgba(34,197,94,0.4)',
                    boxShadow: open ? '0 0 30px rgba(34,197,94,0.2)' : 'none',
                  }}
                >
                  {/* ROKI Logo on sleeve */}
                  <img
                    src="https://media.base44.com/images/public/6940c15ef41e4f2a833c9405/c37d16942_LogoROKI.png"
                    alt="ROKI"
                    className="w-10 h-10 object-contain"
                    style={{ mixBlendMode: 'screen' }}
                  />
                  <span className="text-green-400 font-bold text-xs tracking-widest font-mono">ROKI</span>
                  <div className="flex gap-1 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400/60" />
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400/40" />
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400/20" />
                  </div>
                </div>

                {/* Clean badge */}
                <div
                  className={`flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 rounded-full px-3 py-1 transition-all duration-500 delay-500
                    ${open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
                  `}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400 font-mono text-[10px] font-semibold uppercase tracking-wider">Clean & Ready</span>
                </div>
              </div>
            </div>

            {/* Locker number below */}
            <div className={`mt-4 text-gray-500 font-mono text-xs transition-all duration-500 delay-700 ${open ? 'opacity-100' : 'opacity-0'}`}>
              Locker #14 · CrossFit Midtown
            </div>
          </div>

          {/* Side lockers (closed, dimmed) */}
          {[-1, 1].map((side) => (
            <div
              key={`b${side}`}
              className="hidden sm:flex flex-col w-20 h-48 rounded-xl border border-white/10 bg-white/[0.03] items-center justify-center gap-3 opacity-30"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10" />
              <div className="w-4 h-4 rounded-full border border-white/20" />
            </div>
          ))}
        </div>

        {/* Flow Steps below the locker */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-0">
          {[
            { step: 'Drop dirty gear', color: 'text-gray-400' },
            { step: 'ROKI picks up & washes', color: 'text-blue-400' },
            { step: 'Clean gear back in locker', color: 'text-green-400' },
          ].map((item, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                <span className={`w-1.5 h-1.5 rounded-full ${item.color === 'text-green-400' ? 'bg-green-400' : item.color === 'text-blue-400' ? 'bg-blue-400' : 'bg-gray-400'}`} />
                <span className={`text-sm font-medium ${item.color}`}>{item.step}</span>
              </div>
              {i < 2 && (
                <div className="text-gray-700 text-xl sm:mx-3 rotate-90 sm:rotate-0">→</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}