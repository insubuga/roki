import React from 'react';

export default function SimpleByDesignSection() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-green-400 font-mono text-xs uppercase tracking-widest mb-8">Simple by design</p>

        <div className="space-y-2">
          <p className="text-4xl sm:text-5xl font-black text-white leading-tight">Drop your gear.</p>
          <p className="text-4xl sm:text-5xl font-black text-gray-500 leading-tight">We handle the rest.</p>
          <p className="text-4xl sm:text-5xl font-black text-white leading-tight">Your next workout is<br className="sm:hidden" /> already prepared.</p>
        </div>
      </div>
    </section>
  );
}