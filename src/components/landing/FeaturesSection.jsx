import React from 'react';
import { Clock, Shield, MapPin, Zap, Star, BarChart3 } from 'lucide-react';

const features = [
  {
    icon: Clock,
    title: '48h Turnaround SLA',
    description: 'Your gear is cleaned and back in the locker within 48 hours — guaranteed by your plan.',
    color: 'text-green-400',
  },
  {
    icon: MapPin,
    title: 'Gym-Native Network',
    description: 'Lockers live inside your gym. No pickups at home, no scheduling — it fits your existing routine.',
    color: 'text-blue-400',
  },
  {
    icon: Shield,
    title: 'Emergency Credits',
    description: 'Need gear back faster? Emergency credits trigger a priority 12h rush dispatch, no questions asked.',
    color: 'text-purple-400',
  },
  {
    icon: Zap,
    title: 'Auto-Scheduled Cycles',
    description: 'Set your preferred laundry day once. ROKI auto-forecasts and pre-reserves your locker every week.',
    color: 'text-amber-400',
  },
  {
    icon: Star,
    title: 'Sneaker Cleaning',
    description: 'Priority members get premium sneaker cleaning included. Keep your kicks as sharp as your lifts.',
    color: 'text-pink-400',
  },
  {
    icon: BarChart3,
    title: 'Readiness Tracking',
    description: 'See your on-time rate, cycle history, and SLA adherence — because performance data matters.',
    color: 'text-cyan-400',
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-4 bg-white/[0.02]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-green-400 font-mono text-xs uppercase tracking-widest mb-3">Features</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            Built for athletes<br />
            <span className="text-gray-500">who don't stop.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 hover:bg-white/[0.05] transition-colors">
                <Icon className={`w-5 h-5 ${feature.color} mb-4`} />
                <h3 className="text-white font-semibold text-base mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}