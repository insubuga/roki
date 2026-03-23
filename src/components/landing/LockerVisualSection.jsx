import React from 'react';

export default function LockerVisualSection() {
  return (
    <section className="py-24 px-4 overflow-hidden">
      <div className="max-w-4xl mx-auto text-center">
        {/* Label */}
        <p className="text-cyan-400 font-mono text-xs uppercase tracking-widest mb-4">
          The Experience
        </p>
        <h2 className="text-4xl sm:text-5xl font-black text-white mb-12 leading-tight">
          Your gear. Clean.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-300">
            Waiting for you.
          </span>
        </h2>

        {/* Bag Image */}
        <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] mb-12">
          <img
            src="https://media.base44.com/images/public/6940c15ef41e4f2a833c9405/664eec3ba_Rokibags.png"
            alt="ROKI gear bags"
            className="w-full object-cover max-h-[480px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080d14]/70 via-transparent to-transparent" />
          <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-4">
            <span className="bg-white/10 border border-white/20 backdrop-blur-sm text-white text-xs font-mono px-4 py-2 rounded-full">GEAR IN TRANSIT</span>
            <span className="text-gray-600">→</span>
            <span className="bg-cyan-500/20 border border-cyan-500/40 backdrop-blur-sm text-cyan-400 text-xs font-mono px-4 py-2 rounded-full">✓ CLEAN & READY</span>
          </div>
        </div>

        {/* Flow Steps */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-0">
          {[
            { step: 'Drop dirty gear', color: 'text-gray-400' },
            { step: 'ROKI picks up & washes', color: 'text-blue-400' },
            { step: 'Clean gear back in locker', color: 'text-cyan-400' },
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