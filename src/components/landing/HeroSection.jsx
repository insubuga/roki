import React from 'react';
import { ArrowDown } from 'lucide-react';

const LOGO_URL = "https://media.base44.com/images/public/6940c15ef41e4f2a833c9405/c37d16942_LogoROKI.png";
import { Button } from '@/components/ui/button';

export default function HeroSection({ onJoinClick }) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-2xl font-bold tracking-tight">ROKI</span>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-1.5 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-xs font-mono font-semibold uppercase tracking-wider">Now accepting waitlist</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
          Your gear.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">
            Always ready.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
          ROKI is the locker-based readiness network that handles your gym gear — pick up clean, drop off dirty, repeat automatically. Zero effort. Zero excuses.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
          <Button
            onClick={onJoinClick}
            className="bg-green-500 hover:bg-green-400 text-black font-bold text-base px-8 h-12 rounded-xl shadow-lg shadow-green-500/30 transition-all hover:shadow-green-400/40 hover:scale-105"
          >
            Join the Waitlist
          </Button>
          <Button
            className="bg-white/10 border border-white/25 text-white hover:bg-white/20 hover:border-white/40 h-12 px-8 rounded-xl font-medium backdrop-blur-sm transition-all"
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
          >
            See How It Works
          </Button>
        </div>

        {/* Scroll hint */}
        <div className="mt-20 flex flex-col items-center gap-2 text-gray-600 animate-bounce">
          <ArrowDown className="w-4 h-4" />
        </div>
      </div>
    </section>
  );
}