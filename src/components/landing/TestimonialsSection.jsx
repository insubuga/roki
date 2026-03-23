import React from 'react';
import { Star } from 'lucide-react';

const testimonials = [
  {
    quote: "I used to skip Monday workouts because I didn't have clean gear after the weekend. ROKI literally fixed that. My routine hasn't broken in 3 months.",
    name: 'Marcus T.',
    role: 'Powerlifter · CrossFit Chicago',
    initials: 'MT',
    color: 'from-cyan-500 to-cyan-700',
  },
  {
    quote: "The locker is right next to the exit. I drop off, tap out, and my stuff is fresh by Wednesday. It's not even something I think about anymore.",
    name: 'Priya K.',
    role: 'HIIT athlete · 5x/week',
    initials: 'PK',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    quote: "I was skeptical but the 48h SLA is real. Missed it once — they issued a credit automatically. That kind of accountability from a service is rare.",
    name: 'Jordan W.',
    role: 'Marathon runner · Chicago',
    initials: 'JW',
    color: 'from-purple-500 to-pink-600',
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-cyan-400 font-mono text-xs uppercase tracking-widest mb-3">Testimonials</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            Athletes who never<br />skip anymore.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 flex flex-col gap-5">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-gray-300 text-sm leading-relaxed flex-1">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                  {t.initials}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{t.name}</p>
                  <p className="text-gray-500 text-xs">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}