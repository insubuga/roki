import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'What items do you wash?',
    a: 'Gym gear: shirts, shorts, leggings, joggers, hoodies, sports bras, tank tops, and socks. Priority members also get premium sneaker cleaning included.',
  },
  {
    q: 'Is my gear safe in the locker?',
    a: 'Yes. Every locker is secured with a unique 4-digit access code generated per cycle. Only you get the code — it resets after each pickup.',
  },
  {
    q: 'What gyms and cities are live?',
    a: "We're launching city by city. Join the waitlist and we'll notify you the moment ROKI arrives at your gym. The more members from your gym, the faster we activate it.",
  },
  {
    q: 'What happens if my 48h SLA is missed?',
    a: 'We take SLAs seriously. If we miss your guaranteed turnaround window, you receive credits toward your next cycle automatically — no need to ask.',
  },
  {
    q: 'Do I need to be at the gym at a specific time?',
    a: "No. Drop off before your workout, pick up when you're back — anytime during gym hours. Your locker stays reserved until you retrieve your clean gear.",
  },
  {
    q: 'Can I cancel my subscription?',
    a: 'Yes, anytime. No contracts, no cancellation fees. Your plan stays active until the end of the billing period.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Founding members who join via referral and hit milestones unlock a free first cycle. Watch your tier progress after signing up.',
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.07]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4"
      >
        <span className="text-white font-medium text-sm sm:text-base">{q}</span>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="text-gray-400 text-sm leading-relaxed pb-5">{a}</p>
      )}
    </div>
  );
}

export default function FAQSection() {
  return (
    <section id="faq" className="py-24 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-cyan-400 font-mono text-xs uppercase tracking-widest mb-3">FAQ</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            Got questions?
          </h2>
        </div>
        <div>
          {faqs.map((item) => (
            <FAQItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}