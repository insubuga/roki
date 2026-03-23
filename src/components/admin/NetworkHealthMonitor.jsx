import React from 'react';
import { Activity, AlertTriangle, TrendingUp, Zap, Clock, BarChart2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const metrics = {
  nodeUtilization: 72,
  slaAdherence: 94.2,
  routeCapacity: 8.5,
  activeIncidents: 3,
  mttr: 12.5,
  trend: 'stable',
};

const historicalData = [
  { time: '00:00', Utilization: 45, SLA: 96 },
  { time: '04:00', Utilization: 32, SLA: 98 },
  { time: '08:00', Utilization: 68, SLA: 93 },
  { time: '12:00', Utilization: 85, SLA: 89 },
  { time: '16:00', Utilization: 72, SLA: 94 },
  { time: '20:00', Utilization: 58, SLA: 95 },
];

const getHealthStatus = () => {
  if (metrics.nodeUtilization > 90 || metrics.slaAdherence < 90)
    return { state: 'CRITICAL', dot: 'bg-red-500', text: 'text-red-600', ring: 'ring-red-200' };
  if (metrics.nodeUtilization > 75 || metrics.slaAdherence < 92)
    return { state: 'WARNING', dot: 'bg-orange-500', text: 'text-orange-600', ring: 'ring-orange-200' };
  return { state: 'HEALTHY', dot: 'bg-green-500', text: 'text-green-600', ring: 'ring-green-200' };
};

const health = getHealthStatus();

const kpis = [
  {
    icon: Activity,
    iconColor: 'text-blue-500',
    accent: 'border-l-blue-500',
    label: 'Node Utilization',
    value: `${metrics.nodeUtilization}%`,
    sub: metrics.nodeUtilization > 75 ? 'High load' : 'Normal',
    subColor: metrics.nodeUtilization > 75 ? 'text-orange-500' : 'text-green-600',
    badge: health.state,
    badgeDot: health.dot,
    badgeText: health.text,
    badgeRing: health.ring,
  },
  {
    icon: Zap,
    iconColor: 'text-green-500',
    accent: 'border-l-green-500',
    label: 'SLA Adherence',
    value: `${metrics.slaAdherence}%`,
    sub: metrics.slaAdherence >= 95 ? 'On target' : 'Below target',
    subColor: metrics.slaAdherence >= 95 ? 'text-green-600' : 'text-orange-500',
  },
  {
    icon: TrendingUp,
    iconColor: 'text-purple-500',
    accent: 'border-l-purple-500',
    label: 'Route Cost/Day',
    value: `$${metrics.routeCapacity}k`,
    sub: 'Operational spend',
    subColor: 'text-muted-foreground',
  },
  {
    icon: AlertTriangle,
    iconColor: metrics.activeIncidents > 0 ? 'text-red-500' : 'text-green-500',
    accent: metrics.activeIncidents > 0 ? 'border-l-red-500' : 'border-l-green-500',
    label: 'Active Incidents',
    value: metrics.activeIncidents,
    sub: metrics.activeIncidents === 0 ? 'All clear' : 'Needs attention',
    subColor: metrics.activeIncidents === 0 ? 'text-green-600' : 'text-red-500',
  },
  {
    icon: Clock,
    iconColor: 'text-cyan-500',
    accent: 'border-l-cyan-500',
    label: 'Mean Time to Recovery',
    value: `${metrics.mttr}m`,
    sub: 'MTTR',
    subColor: 'text-muted-foreground',
  },
  {
    icon: BarChart2,
    iconColor: metrics.trend === 'improving' ? 'text-green-500' : 'text-orange-500',
    accent: metrics.trend === 'improving' ? 'border-l-green-500' : 'border-l-orange-500',
    label: '30-Day Trajectory',
    value: metrics.trend.charAt(0).toUpperCase() + metrics.trend.slice(1),
    sub: 'Network trend',
    subColor: metrics.trend === 'improving' ? 'text-green-600' : 'text-orange-500',
  },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}%</span>
        </p>
      ))}
    </div>
  );
};

export default function NetworkHealthMonitor() {
  return (
    <div className="space-y-4">
      {/* KPI Grid — 6 cards, 2 rows on mobile, 3 cols on md, 6 on xl */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className={`border-l-4 ${kpi.accent} shadow-sm hover:shadow-md transition-shadow`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-4 h-4 ${kpi.iconColor}`} />
                  {kpi.badge && (
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-1 ${kpi.badgeRing} ${kpi.badgeText} bg-white`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${kpi.badgeDot} animate-pulse`} />
                      {kpi.badge}
                    </span>
                  )}
                </div>
                <p className="text-xl font-bold text-foreground leading-none">{kpi.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{kpi.label}</p>
                <p className={`text-[10px] font-semibold mt-1 ${kpi.subColor}`}>{kpi.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chart */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">24h Network Trend</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block rounded" /> Utilization</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-500 inline-block rounded" /> SLA</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={historicalData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="Utilization" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="SLA" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}