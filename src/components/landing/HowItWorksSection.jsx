import React, { useEffect, useRef, useState } from 'react';

// ── Inline SVG illustrations ──────────────────────────────────────────────────

function PhoneActivateIllustration() {
  return (
    <svg viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Phone body */}
      <rect x="25" y="10" width="70" height="120" rx="12" fill="#0f1a0f" stroke="#22c55e" strokeWidth="1.5"/>
      {/* Screen */}
      <rect x="32" y="22" width="56" height="96" rx="6" fill="#0a120a"/>
      {/* Notch */}
      <rect x="46" y="14" width="28" height="5" rx="2.5" fill="#22c55e" opacity="0.3"/>
      {/* App header */}
      <rect x="36" y="26" width="48" height="8" rx="2" fill="#1a2e1a"/>
      <text x="60" y="33" textAnchor="middle" fill="#22c55e" fontSize="5" fontFamily="monospace">ROKI</text>
      {/* Locker icon big */}
      <rect x="44" y="44" width="32" height="36" rx="4" fill="#1a2e1a" stroke="#22c55e" strokeWidth="1"/>
      <circle cx="60" cy="60" r="5" fill="none" stroke="#22c55e" strokeWidth="1.2"/>
      <line x1="60" y1="65" x2="60" y2="69" stroke="#22c55e" strokeWidth="1.2"/>
      {/* Activate button */}
      <rect x="38" y="88" width="44" height="12" rx="6" fill="#22c55e"/>
      <text x="60" y="97" textAnchor="middle" fill="#000" fontSize="5.5" fontFamily="monospace" fontWeight="bold">ACTIVATE</text>
      {/* Pulse rings */}
      <circle cx="60" cy="60" r="18" stroke="#22c55e" strokeWidth="0.5" opacity="0.3"/>
      <circle cx="60" cy="60" r="24" stroke="#22c55e" strokeWidth="0.3" opacity="0.15"/>
      {/* Status dots */}
      <circle cx="40" cy="108" r="2" fill="#22c55e"/>
      <rect x="44" y="106.5" width="20" height="3" rx="1.5" fill="#1a3a1a"/>
      <rect x="44" y="111" width="14" height="3" rx="1.5" fill="#1a3a1a"/>
    </svg>
  );
}

function LockerDropIllustration() {
  return (
    <svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Locker unit */}
      <rect x="20" y="30" width="60" height="100" rx="4" fill="#0d1a2e" stroke="#3b82f6" strokeWidth="1.5"/>
      {/* Locker door */}
      <rect x="26" y="36" width="48" height="88" rx="3" fill="#0a1520" stroke="#3b82f6" strokeWidth="1"/>
      {/* Lock mechanism */}
      <rect x="62" y="78" width="8" height="10" rx="2" fill="#3b82f6" opacity="0.8"/>
      <circle cx="66" cy="77" r="4" fill="none" stroke="#3b82f6" strokeWidth="1.5"/>
      {/* Vent lines */}
      <line x1="32" y1="50" x2="68" y2="50" stroke="#3b82f6" strokeWidth="0.5" opacity="0.4"/>
      <line x1="32" y1="55" x2="68" y2="55" stroke="#3b82f6" strokeWidth="0.5" opacity="0.4"/>
      {/* Locker number */}
      <text x="50" y="46" textAnchor="middle" fill="#3b82f6" fontSize="7" fontFamily="monospace" opacity="0.7">#12</text>
      {/* Access code display */}
      <rect x="30" y="100" width="36" height="16" rx="3" fill="#0d1f3a" stroke="#3b82f6" strokeWidth="0.8"/>
      <text x="48" y="111" textAnchor="middle" fill="#3b82f6" fontSize="8" fontFamily="monospace" letterSpacing="3">4 2 7</text>
      {/* Gear bag being dropped */}
      <rect x="92" y="10" width="30" height="36" rx="8" fill="#1a2030" stroke="#64748b" strokeWidth="1"/>
      <line x1="107" y1="10" x2="107" y2="5" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M103 5 Q107 2 111 5" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Shirt inside bag */}
      <path d="M98 18 Q107 15 116 18 L114 36 Q107 38 100 36 Z" fill="#374151" opacity="0.6"/>
      {/* Arrow showing drop direction */}
      <line x1="107" y1="50" x2="107" y2="68" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.6"/>
      <path d="M103 65 L107 72 L111 65" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
      {/* Person silhouette */}
      <circle cx="107" cy="38" r="6" fill="#1e293b" stroke="#64748b" strokeWidth="1"/>
      <path d="M101 54 Q107 48 113 54" stroke="#64748b" strokeWidth="1" fill="none"/>
    </svg>
  );
}

function CleanGearIllustration() {
  return (
    <svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Locker open */}
      <rect x="15" y="30" width="60" height="100" rx="4" fill="#0d1a1f" stroke="#a855f7" strokeWidth="1.5"/>
      {/* Door open (angled) */}
      <rect x="10" y="35" width="48" height="88" rx="3" fill="#0a1218" stroke="#a855f7" strokeWidth="1" transform="rotate(-15 15 79)"/>
      {/* Clean folded clothes inside */}
      <rect x="24" y="70" width="38" height="10" rx="2" fill="#1a1030" stroke="#a855f7" strokeWidth="0.8"/>
      <rect x="26" y="82" width="34" height="8" rx="2" fill="#1e1235" stroke="#a855f7" strokeWidth="0.6" opacity="0.8"/>
      <rect x="28" y="92" width="30" height="8" rx="2" fill="#1a0f2e" stroke="#a855f7" strokeWidth="0.6" opacity="0.6"/>
      {/* Sparkle stars - clean! */}
      <text x="72" y="45" fill="#a855f7" fontSize="10">✦</text>
      <text x="100" y="30" fill="#a855f7" fontSize="7" opacity="0.7">✦</text>
      <text x="85" y="60" fill="#a855f7" fontSize="5" opacity="0.5">✦</text>
      {/* 48h badge */}
      <rect x="82" y="70" width="44" height="24" rx="8" fill="#2d1050" stroke="#a855f7" strokeWidth="1"/>
      <text x="104" y="80" textAnchor="middle" fill="#a855f7" fontSize="8" fontFamily="monospace" fontWeight="bold">48h</text>
      <text x="104" y="89" textAnchor="middle" fill="#c084fc" fontSize="5" fontFamily="monospace">READY</text>
      {/* Checkmark circle */}
      <circle cx="104" cy="110" r="12" fill="#1a0535" stroke="#a855f7" strokeWidth="1.5"/>
      <path d="M98 110 L102 114 L111 106" stroke="#a855f7" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Notification ping */}
      <circle cx="104" cy="110" r="18" stroke="#a855f7" strokeWidth="0.5" opacity="0.2"/>
      <circle cx="104" cy="110" r="24" stroke="#a855f7" strokeWidth="0.3" opacity="0.1"/>
    </svg>
  );
}

// ── Arrow connector ───────────────────────────────────────────────────────────

function FlowArrow({ color }) {
  return (
    <div className="hidden md:flex items-center justify-center flex-1 px-2">
      <svg viewBox="0 0 60 20" fill="none" className="w-16 h-6" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="10" x2="48" y2="10" stroke={color} strokeWidth="1.5" strokeDasharray="4 2"/>
        <path d="M44 5 L52 10 L44 15" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

// ── Step card ─────────────────────────────────────────────────────────────────

const steps = [
  {
    number: '01',
    label: 'Activate a Cycle',
    sublabel: 'Takes 10 seconds',
    description: 'Open the app, tap Activate. A locker at your gym is instantly reserved and your access code is generated.',
    color: '#22c55e',
    glow: 'rgba(34,197,94,0.15)',
    border: 'rgba(34,197,94,0.25)',
    tag: 'In the app',
    Illustration: PhoneActivateIllustration,
  },
  {
    number: '02',
    label: 'Drop & Go',
    sublabel: 'Post-workout',
    description: 'Enter your code at the locker, drop your dirty gear inside, and walk out. No bag to carry, no errand to run.',
    color: '#3b82f6',
    glow: 'rgba(59,130,246,0.15)',
    border: 'rgba(59,130,246,0.25)',
    tag: 'At the gym',
    Illustration: LockerDropIllustration,
  },
  {
    number: '03',
    label: 'Pick Up Clean',
    sublabel: 'Within 48 hours',
    description: 'Your gear is washed, dried, and returned to your locker. A notification tells you the moment it\'s ready.',
    color: '#a855f7',
    glow: 'rgba(168,85,247,0.15)',
    border: 'rgba(168,85,247,0.25)',
    tag: 'Next visit',
    Illustration: CleanGearIllustration,
  },
];

// ── Intersection observer hook ────────────────────────────────────────────────

function useInView(threshold = 0.2) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

// ── Main section ──────────────────────────────────────────────────────────────

export default function HowItWorksSection() {
  const [sectionRef, inView] = useInView(0.1);

  return (
    <section id="how-it-works" className="py-24 px-4" ref={sectionRef}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-green-400 font-mono text-xs uppercase tracking-widest mb-3">How It Works</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            Three steps.<br />Zero friction.
          </h2>
          <p className="text-gray-500 text-sm mt-4 max-w-md mx-auto">
            From activation to clean gear — the whole process happens in the background.
          </p>
        </div>

        {/* Steps row */}
        <div className="flex flex-col md:flex-row items-stretch gap-4 md:gap-0">
          {steps.map((step, i) => {
            const { Illustration } = step;
            return (
              <React.Fragment key={step.number}>
                <div
                  className="flex-1 rounded-2xl overflow-hidden flex flex-col transition-all duration-700"
                  style={{
                    border: `1px solid ${step.border}`,
                    background: `radial-gradient(ellipse at top, ${step.glow} 0%, transparent 70%), #080d14`,
                    opacity: inView ? 1 : 0,
                    transform: inView ? 'translateY(0)' : 'translateY(28px)',
                    transitionDelay: `${i * 150}ms`,
                  }}
                >
                  {/* Illustration area */}
                  <div
                    className="relative flex items-center justify-center"
                    style={{ height: 180, background: `radial-gradient(ellipse at center, ${step.glow} 0%, transparent 75%)` }}
                  >
                    {/* Step number watermark */}
                    <span
                      className="absolute top-3 right-4 text-5xl font-black select-none"
                      style={{ color: step.color, opacity: 0.07 }}
                    >
                      {step.number}
                    </span>
                    {/* Tag pill */}
                    <span
                      className="absolute top-3 left-3 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ color: step.color, background: `${step.glow}`, border: `1px solid ${step.border}` }}
                    >
                      {step.tag}
                    </span>
                    <div className="w-32 h-32">
                      <Illustration />
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ height: 1, background: step.border }} />

                  {/* Text area */}
                  <div className="p-6 flex flex-col gap-2 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                        style={{ color: step.color, background: step.glow }}
                      >
                        {step.number}
                      </span>
                      <span className="text-gray-600 text-xs">{step.sublabel}</span>
                    </div>
                    <h3 className="text-white font-bold text-lg">{step.label}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
                  </div>
                </div>

                {/* Arrow between steps */}
                {i < steps.length - 1 && (
                  <FlowArrow color={steps[i + 1].color} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Bottom timeline bar */}
        <div className="mt-10 flex items-center gap-0 relative">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-white/5" />
          {steps.map((step, i) => (
            <React.Fragment key={step.number}>
              <div className="flex flex-col items-center gap-2 flex-1 relative z-10">
                <div
                  className="w-3 h-3 rounded-full transition-all duration-700"
                  style={{
                    background: step.color,
                    boxShadow: `0 0 10px ${step.color}`,
                    opacity: inView ? 1 : 0,
                    transitionDelay: `${300 + i * 150}ms`,
                  }}
                />
                <span className="text-[10px] text-gray-600 font-mono uppercase tracking-wider text-center">
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className="flex-1 h-px transition-all duration-1000"
                  style={{
                    background: `linear-gradient(to right, ${step.color}60, ${steps[i+1].color}60)`,
                    opacity: inView ? 1 : 0,
                    transitionDelay: `${400 + i * 150}ms`,
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>

      </div>
    </section>
  );
}