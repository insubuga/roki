import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, Activity, TrendingUp, Route } from 'lucide-react';

export default function InfrastructureMetrics({ userEmail }) {
  const { data: allLockers = [] } = useQuery({
    queryKey: ['infra-lockers'],
    queryFn: () => base44.entities.Locker.list(),
  });

  const { data: activeCycles = [] } = useQuery({
    queryKey: ['infra-cycles'],
    queryFn: () => base44.entities.Cycle.filter({
      status: { $in: ['prepared', 'awaiting_pickup', 'washing', 'drying', 'ready'] }
    }),
  });

  const { data: routes = [] } = useQuery({
    queryKey: ['infra-routes'],
    queryFn: () => base44.entities.Route.filter({ status: { $in: ['planned', 'active'] } }),
  });

  const { data: reliabilityScore } = useQuery({
    queryKey: ['infra-reliability', userEmail],
    queryFn: async () => {
      const scores = await base44.entities.ReliabilityScore.filter({
        entity_type: 'network',
        entity_id: 'global',
      });
      return scores[0] || null;
    },
  });

  const occupiedLockers = allLockers.filter(l =>
    ['softReserved', 'activated', 'dropped', 'pickedUp', 'resetPending'].includes(l.status)
  ).length;
  const lockerCapacityPct = allLockers.length > 0
    ? Math.round((occupiedLockers / allLockers.length) * 100)
    : 0;

  const routeLoadPct = routes.length > 0
    ? Math.round((routes.filter(r => r.status === 'active').length / routes.length) * 100)
    : 0;

  const reliabilityPct = reliabilityScore?.overall_score ?? 100;

  const metrics = [
    {
      label: 'Locker Capacity',
      value: `${lockerCapacityPct}%`,
      sub: `${occupiedLockers}/${allLockers.length} in use`,
      icon: Lock,
      color: lockerCapacityPct > 80 ? 'text-red-500' : lockerCapacityPct > 60 ? 'text-orange-500' : 'text-green-600',
    },
    {
      label: 'Active Cycles',
      value: activeCycles.length,
      sub: 'in progress',
      icon: Activity,
      color: 'text-blue-600',
    },
    {
      label: 'Route Load',
      value: `${routeLoadPct}%`,
      sub: `${routes.filter(r => r.status === 'active').length} active routes`,
      icon: Route,
      color: routeLoadPct > 80 ? 'text-orange-500' : 'text-purple-600',
    },
    {
      label: 'Reliability',
      value: `${reliabilityPct}%`,
      sub: reliabilityScore?.trend ? reliabilityScore.trend.charAt(0).toUpperCase() + reliabilityScore.trend.slice(1) : 'Stable',
      icon: TrendingUp,
      color: reliabilityPct >= 90 ? 'text-green-600' : reliabilityPct >= 70 ? 'text-yellow-500' : 'text-red-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {metrics.map(({ label, value, sub, icon: Icon, color }) => (
        <Card key={label} className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-muted-foreground font-mono text-xs uppercase">{label}</span>
            </div>
            <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
            <p className="text-muted-foreground font-mono text-xs mt-0.5">{sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}