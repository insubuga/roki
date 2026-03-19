import React from 'react';

export default function SimpleByDesignSection() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-green-400 font-mono text-xs uppercase tracking-widest mb-8">Simple by design</p>
          <div className="space-y-2">
            <p className="text-4xl sm:text-5xl font-black text-white leading-tight">Drop your gear.</p>
            <p className="text-4xl sm:text-5xl font-black text-gray-500 leading-tight">We handle the rest.</p>
            <p className="text-4xl sm:text-5xl font-black text-white leading-tight">Your next workout is already prepared.</p>
          </div>
        </div>

        {/* Bag image */}
        <div className="relative rounded-2xl overflow-hidden border border-white/[0.06]">
          <img
            src="https://media.base44.com/images/public/6940c15ef41e4f2a833c9405/664eec3ba_Rokibags.png"
            alt="ROKI gear bags — Gear in Transit and Ready"
            className="w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080d14]/80 via-transparent to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
            <div>
              <p className="text-white font-black text-xl sm:text-2xl leading-tight">Two bags. Two states.</p>
              <p className="text-gray-400 text-sm mt-1">Dirty goes in. Clean comes back.</p>
            </div>
            <div className="hidden sm:flex gap-3">
              <span className="bg-white/10 border border-white/20 backdrop-blur-sm text-white text-xs font-mono px-3 py-1.5 rounded-full">GEAR IN TRANSIT</span>
              <span className="bg-green-500/20 border border-green-500/40 backdrop-blur-sm text-green-400 text-xs font-mono px-3 py-1.5 rounded-full">READY</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}