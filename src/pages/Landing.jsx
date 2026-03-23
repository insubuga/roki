import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Menu, X } from 'lucide-react';

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
import IdentitySection from '@/components/landing/IdentitySection';
import PricingSection from '@/components/landing/PricingSection';
import FAQSection from '@/components/landing/FAQSection';

export default function Landing() {
  const waitlistRef = useRef(null);

  useEffect(() => {
    const hideEditWidget = () => {
      // Target the Base44 edit widget by its known text content or fixed bottom-right position
      document.querySelectorAll('body > *').forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' && el !== document.getElementById('root')) {
          el.style.setProperty('display', 'none', 'important');
        }
      });
    };

    hideEditWidget();
    const observer = new MutationObserver(hideEditWidget);
    observer.observe(document.body, { childList: true });

    return () => {
      observer.disconnect();
      // Restore hidden elements when leaving landing page
      document.querySelectorAll('body > *').forEach(el => {
        if (el !== document.getElementById('root')) {
          el.style.removeProperty('display');
        }
      });
    };
  }, []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToWaitlist = () => {
    waitlistRef.current?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { href: '#how-it-works', label: 'How It Works' },
    { href: '#features', label: 'Features' },
    { href: '#gym-rankings', label: 'Gym Rankings' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#faq', label: 'FAQ' },
  ];

  return (
    <div className="h-screen overflow-y-auto bg-[#080d14] text-white" style={{ overscrollBehavior: 'contain' }}>

      {/* Sticky mobile CTA */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#080d14]/95 backdrop-blur-md border-t border-white/[0.07] px-4 py-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <Button
          onClick={scrollToWaitlist}
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold h-12 rounded-xl text-base shadow-lg shadow-cyan-500/20"
        >
          Join the Waitlist →
        </Button>
      </div>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#080d14]/80 backdrop-blur-md border-b border-white/[0.05]">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="https://media.base44.com/images/public/6940c15ef41e4f2a833c9405/c6fc7fe29_LogoROKI2.png"
              alt="ROKI"
              className="w-8 h-8 object-contain"
              style={{ mixBlendMode: 'screen', filter: 'sepia(1) saturate(5) hue-rotate(155deg) brightness(1.2)' }}
            />
            <span className="text-white font-bold text-lg">ROKI</span>
          </div>
          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-7">
            {navLinks.map(l => (
              <a key={l.href} href={l.href} className="text-gray-400 hover:text-white text-sm transition-colors">{l.label}</a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => base44.auth.redirectToLogin()}
              className="hidden md:block text-gray-400 hover:text-white text-sm h-9 px-3 transition-colors"
            >
              Sign In
            </button>
            <Button
              onClick={scrollToWaitlist}
              className="hidden md:inline-flex bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-sm h-9 px-5 rounded-full shadow-md shadow-cyan-400/20"
            >
              Join Waitlist
            </Button>
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(o => !o)}
              className="md:hidden text-gray-400 hover:text-white p-1"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/[0.05] bg-[#080d14]/95 backdrop-blur-md">
            <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col gap-1">
              {navLinks.map(l => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-300 hover:text-white text-base py-3 border-b border-white/[0.05] last:border-0 transition-colors"
                >
                  {l.label}
                </a>
              ))}
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="text-gray-400 hover:text-white text-base py-3 text-left transition-colors"
              >
                Sign In
              </button>
              <Button
                onClick={scrollToWaitlist}
                className="mt-2 bg-cyan-400 hover:bg-cyan-300 text-black font-bold rounded-full"
              >
                Join Waitlist
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Sections */}
      <div className="pt-16">
        <HeroSection onJoinClick={scrollToWaitlist} />
        <ScenarioSection onJoinClick={scrollToWaitlist} />
        <IdentitySection />
        <HowItWorksSection />
        <LockerVisualSection />
        <SystemReframeSection />
        <ScarcitySection />
        <FeaturesSection />
        <PricingSection onJoinClick={scrollToWaitlist} />
        <TestimonialsSection />
        <FAQSection />
        <WaitlistSection sectionRef={waitlistRef} />
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] bg-[#080d14] py-8 px-4"
        style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src="https://media.base44.com/images/public/6940c15ef41e4f2a833c9405/c6fc7fe29_LogoROKI2.png"
              alt="ROKI"
              className="w-6 h-6 object-contain"
              style={{ mixBlendMode: 'screen', filter: 'sepia(1) saturate(5) hue-rotate(155deg) brightness(1.2)' }}
            />
            <span className="text-white font-semibold text-sm">ROKI</span>
          </div>
          <p className="text-gray-600 text-xs">© 2026 ROKI. Readiness infrastructure for athletes.</p>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="text-gray-600 hover:text-gray-400 text-xs transition-colors">Privacy Policy</a>
            <a href="/terms" className="text-gray-600 hover:text-gray-400 text-xs transition-colors">Terms of Service</a>
            <button
              onClick={() => base44.auth.redirectToLogin()}
              className="text-gray-500 hover:text-white text-xs transition-colors"
            >
              Member Login →
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}