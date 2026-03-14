import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, CreditCard, Calendar, ChevronRight, Radio } from 'lucide-react';

export default function OnboardingGate({ user, subscription, preferences }) {
  const hasGym = !!user?.preferred_gym;
  const hasSub = !!subscription;
  const hasPrefs = !!preferences;

  // All good — don't show gate
  if (hasGym && hasSub && hasPrefs) return null;

  const steps = [
    {
      id: 'gym',
      done: hasGym,
      icon: MapPin,
      title: 'Select Your Gym',
      desc: 'Assign yourself to an RCN node location',
    },
    {
      id: 'sub',
      done: hasSub,
      icon: CreditCard,
      title: 'Choose a Plan',
      desc: 'Core ($29/mo) or Priority ($59/mo)',
    },
    {
      id: 'schedule',
      done: hasPrefs,
      icon: Calendar,
      title: 'Set Your Schedule',
      desc: 'Configure your preferred pickup window',
    },
  ];

  const completedCount = steps.filter(s => s.done).length;

  return (
    <Card className="border-2 border-purple-600/60 bg-gradient-to-br from-purple-950/20 to-indigo-950/20">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Radio className="w-4 h-4 text-purple-600 animate-pulse" />
          <h3 className="text-foreground font-mono font-bold text-sm uppercase">System Setup Required</h3>
          <span className="ml-auto text-muted-foreground font-mono text-xs">{completedCount}/3 complete</span>
        </div>

        {/* Progress bar */}
        <div className="bg-muted rounded-full h-1.5 mb-4 overflow-hidden">
          <div
            className="h-full bg-purple-600 rounded-full transition-all"
            style={{ width: `${(completedCount / 3) * 100}%` }}
          />
        </div>

        <div className="space-y-2 mb-4">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-2.5 rounded-lg ${
                  step.done ? 'bg-green-600/10 border border-green-600/20' : 'bg-muted border border-border'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  step.done ? 'bg-green-600' : 'bg-muted-foreground/20'
                }`}>
                  <Icon className={`w-3.5 h-3.5 ${step.done ? 'text-white' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-mono font-bold ${step.done ? 'text-green-600' : 'text-foreground'}`}>
                    {step.done ? '✓ ' : ''}{step.title}
                  </p>
                  {!step.done && (
                    <p className="text-muted-foreground text-[10px] font-mono">{step.desc}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <Link to="/Initialize">
          <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-mono text-sm gap-2">
            {completedCount === 0 ? 'START SYSTEM SETUP' : 'CONTINUE SETUP'}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}