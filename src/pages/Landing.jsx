import React, { useRef } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import HeroSection from '@/components/landing/HeroSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import WaitlistSection from '@/components/landing/WaitlistSection';
import ScenarioSection from '@/components/landing/ScenarioSection';
import LockerVisualSection from '@/components/landing/LockerVisualSection';
import SystemReframeSection from '@/components/landing/SystemReframeSection';
import ScarcitySection from '@/components/landing/ScarcitySection';

export default function Landing() {
  const waitlistRef = useRef(null);

  const scrollToWaitlist = () => {
    waitlistRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#080d14] text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#080d14]/80 backdrop-blur-md border-b border-white/[0.05]">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="https://media.base44.com/images/public/6940c15ef41e4f2a833c9405/c37d16942_LogoROKI.png"
              alt="ROKI"
              className="w-8 h-8 object-contain"
              style={{ mixBlendMode: 'screen' }}
            />
            <span className="text-white font-bold text-lg">ROKI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/Dashboard">
              <Button variant="ghost" className="text-gray-400 hover:text-white text-sm h-9">
                Sign In
              </Button>
            </Link>
            <Button
              onClick={scrollToWaitlist}
              className="bg-green-500 hover:bg-green-400 text-black font-bold text-sm h-9 px-5 rounded-lg shadow-md shadow-green-500/20"
            >
              Join Waitlist
            </Button>
          </div>
        </div>
      </nav>

      {/* Sections */}
      <div className="pt-16">
        <HeroSection onJoinClick={scrollToWaitlist} />
        <ScenarioSection onJoinClick={scrollToWaitlist} />
        <HowItWorksSection />
        <LockerVisualSection />
        <SystemReframeSection />
        <FeaturesSection />
        <TestimonialsSection />
        <WaitlistSection sectionRef={waitlistRef} />
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src="https://media.base44.com/images/public/6940c15ef41e4f2a833c9405/c37d16942_LogoROKI.png"
              alt="ROKI"
              className="w-6 h-6 object-contain"
              style={{ mixBlendMode: 'screen' }}
            />
            <span className="text-white font-semibold text-sm">ROKI</span>
          </div>
          <p className="text-gray-600 text-xs">© 2026 ROKI. Readiness infrastructure for athletes.</p>
          <Link to="/Dashboard" className="text-gray-500 hover:text-white text-xs transition-colors">
            Member Login →
          </Link>
        </div>
      </footer>
    </div>
  );
}