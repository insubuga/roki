import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Clock, Truck, Wind, Sparkles, PackageCheck, Timer } from 'lucide-react';

const STAGES = [
  {
    key: 'awaiting_pickup',
    label: 'Gear Dropped',
    sublabel: 'Locker secured',
    icon: PackageCheck,
    color: 'green',
  },
  {
    key: 'washing',
    label: 'Washing',
    sublabel: 'Deep clean cycle',
    icon: Sparkles,
    color: 'blue',
  },
  {
    key: 'drying',
    label: 'Drying',
    sublabel: 'Fresh & dry',
    icon: Wind,
    color: 'purple',
  },
  {
    key: 'ready',
    label: 'Ready',
    sublabel: 'Back in your locker',
    icon: Truck,
    color: 'green',
  },
];

const STATUS_ORDER = ['awaiting_pickup', 'washing', 'drying', 'ready'];

// Estimated hours per stage
const STAGE_DURATIONS = {
  awaiting_pickup: 4,
  washing: 16,
  drying: 8,
  ready: 0,
};

function getStageIndex(status) {
  return STATUS_ORDER.indexOf(status);
}

function getEtaMinutes(status, createdDate) {
  const idx = getStageIndex(status);
  if (idx === -1 || status === 'ready') return null;

  const hoursRemaining = STATUS_ORDER.slice(idx + 1).reduce((acc, s) => acc + (STAGE_DURATIONS[s] || 0), 0) + STAGE_DURATIONS[status];
  const created = new Date(createdDate);
  const eta = new Date(created.getTime() + hoursRemaining * 60 * 60 * 1000);
  const diff = eta - new Date();
  return Math.max(0, Math.round(diff / 60000));
}

function formatEta(minutes) {
  if (minutes === null) return null;
  if (minutes <= 0) return 'Soon';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const colorMap = {
  green: {
    ring: 'ring-green-500',
    bg: 'bg-green-500',
    text: 'text-green-500',
    glow: 'shadow-green-500/40',
    light: 'bg-green-50 text-green-700',
    line: 'bg-green-500',
  },
  blue: {
    ring: 'ring-blue-500',
    bg: 'bg-blue-500',
    text: 'text-blue-500',
    glow: 'shadow-blue-500/40',
    light: 'bg-blue-50 text-blue-700',
    line: 'bg-blue-500',
  },
  purple: {
    ring: 'ring-purple-500',
    bg: 'bg-purple-500',
    text: 'text-purple-500',
    glow: 'shadow-purple-500/40',
    light: 'bg-purple-50 text-purple-700',
    line: 'bg-purple-500',
  },
};

export default function CycleTracker({ cycle }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  if (!cycle) return null;

  const currentIdx = getStageIndex(cycle.status);
  const etaMinutes = getEtaMinutes(cycle.status, cycle.created_date);
  const etaFormatted = formatEta(etaMinutes);
  const isComplete = cycle.status === 'ready';
  const isPrepared = cycle.status === 'prepared';

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${isComplete ? 'bg-green-500' : 'bg-gradient-to-r from-slate-800 to-slate-900'}`}>
        <div>
          <p className="text-white text-xs font-mono uppercase tracking-wider opacity-70">Cycle Tracker</p>
          <p className="text-white font-bold text-sm">{cycle.order_number}</p>
        </div>
        {!isComplete && etaFormatted && (
          <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
            <Timer className="w-3.5 h-3.5 text-white" />
            <span className="text-white font-mono font-bold text-sm">{etaFormatted}</span>
            <span className="text-white/60 text-xs">ETA</span>
          </div>
        )}
        {isComplete && (
          <div className="flex items-center gap-1.5 bg-white/20 rounded-lg px-3 py-1.5">
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span className="text-white font-bold text-sm">Ready!</span>
          </div>
        )}
      </div>

      {/* Pipeline */}
      <div className="px-4 py-5">
        <div className="relative flex items-start justify-between">
          {/* Progress line background */}
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-border" />

          {/* Progress line fill */}
          {currentIdx > 0 && (
            <div
              className="absolute top-5 left-5 h-0.5 bg-green-500 transition-all duration-1000"
              style={{
                width: `calc(${(currentIdx / (STAGES.length - 1)) * 100}% - 2.5rem + ${currentIdx === STAGES.length - 1 ? '1.25rem' : '0px'})`,
              }}
            />
          )}

          {STAGES.map((stage, idx) => {
            const isCompleted = currentIdx > idx;
            const isActive = currentIdx === idx;
            const isPending = currentIdx < idx;
            const Icon = stage.icon;
            const colors = colorMap[stage.color];

            return (
              <div key={stage.key} className="flex flex-col items-center z-10" style={{ width: `${100 / STAGES.length}%` }}>
                {/* Circle */}
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500
                  ${isCompleted ? `${colors.bg} shadow-lg ${colors.glow}` : ''}
                  ${isActive ? `bg-card ring-2 ${colors.ring} shadow-lg ${colors.glow}` : ''}
                  ${isPending ? 'bg-muted ring-1 ring-border' : ''}
                `}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  ) : isActive ? (
                    <Icon className={`w-5 h-5 ${colors.text} animate-pulse`} />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground/40" />
                  )}
                </div>

                {/* Label */}
                <div className="mt-2 text-center px-0.5">
                  <p className={`text-xs font-semibold leading-tight ${
                    isActive ? colors.text : isCompleted ? 'text-foreground' : 'text-muted-foreground/50'
                  }`}>
                    {stage.label}
                  </p>
                  {(isActive || isCompleted) && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{stage.sublabel}</p>
                  )}
                </div>

                {/* Active pulse badge */}
                {isActive && (
                  <div className={`mt-1.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${colors.light}`}>
                    Live
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer status message */}
      <div className="border-t border-border px-4 py-2.5 bg-muted/40">
        {isComplete ? (
          <p className="text-green-600 font-semibold text-xs text-center">
            🎉 Your gear is clean and waiting in your locker. Access code sent!
          </p>
        ) : isPrepared ? (
          <p className="text-muted-foreground text-xs text-center">Drop your gear in the locker to start your cycle.</p>
        ) : cycle.status === 'awaiting_pickup' ? (
          <p className="text-muted-foreground text-xs text-center">Gear confirmed — driver collecting on next route window.</p>
        ) : cycle.status === 'washing' ? (
          <p className="text-muted-foreground text-xs text-center">Deep cleaning in progress at processing facility.</p>
        ) : cycle.status === 'drying' ? (
          <p className="text-muted-foreground text-xs text-center">Almost done — gear drying and being prepped for delivery.</p>
        ) : null}
      </div>
    </div>
  );
}