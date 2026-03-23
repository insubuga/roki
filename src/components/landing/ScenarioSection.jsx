import React from 'react';
import { Button } from '@/components/ui/button';

export default function ScenarioSection({ onJoinClick }) {
  return (
    <section className="py-24 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Label */}
        <p className="text-cyan-400 font-mono text-xs uppercase tracking-widest mb-10 text-center">
          You know this moment
        </p>

        {/* Story */}
        <div className="space-y-4 mb-10">
          {[
            "You get to the gym.",
            "You realize your clothes aren't clean.",
            "Or you forgot your gear.",
            "You debate going home.",
            <span key="skip" className="text-gray-500">Sometimes… you skip the workout.</span>,
          ].map((line, i) => (
            <p
              key={i}
              className="text-2xl sm:text-3xl font-bold text-white leading-snug"
            >
              {line}
            </p>
          ))}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 my-10">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-gray-600 text-sm font-mono uppercase tracking-widest">Then</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Resolution */}
        <div className="bg-cyan-500/10 border border-cyan-500/25 rounded-2xl p-8 text-center">
          <p className="text-2xl sm:text-3xl font-black text-white leading-snug mb-2">
            ROKI removes that moment
          </p>
          <p className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-300 leading-snug mb-6">
            completely.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed mb-8">
            Clean gear. In a locker at your gym. Every time you show up.
          </p>
          <Button
            onClick={onJoinClick}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-base px-8 h-12 rounded-xl shadow-lg shadow-cyan-500/30 transition-all hover:shadow-cyan-400/40 hover:scale-105"
          >
            Join the Waitlist
          </Button>
        </div>
      </div>
    </section>
  );
}