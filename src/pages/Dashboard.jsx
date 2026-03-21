import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import PullToRefresh from '../components/mobile/PullToRefresh';
import {
  Zap,
  Settings,
  ChevronRight,
  Activity,
  Radio,
  CheckCircle,
  Clock,
  MapPin,
  TrendingUp,
  Shield,
  AlertTriangle,
  BarChart3,
  Package,
  Wifi
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import CycleForecastWidget from '../components/dashboard/CycleForecastWidget';
import InfrastructureMetrics from '../components/dashboard/InfrastructureMetrics';
import SubscriptionUsageCard from '../components/dashboard/SubscriptionUsageCard';
import OnboardingGate from '../components/dashboard/OnboardingGate';

const MODULE_NAV = [
  { icon: Activity,  label: 'Active Cycle',    page: 'ActiveCycle',   color: 'text-blue-500',   bg: 'bg-blue-500/10' },
  { icon: MapPin,    label: 'Network',          page: 'Network',       color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { icon: Shield,    label: 'Risk & Recovery',  page: 'RiskRecovery',  color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { icon: BarChart3, label: 'Performance',      page: 'Performance',   color: 'text-green-500',  bg: 'bg-green-500/10' },
  { icon: Settings,  label: 'Configuration',    page: 'Configuration', color: 'text-slate-400',  bg: 'bg-slate-500/10' },
];

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  const handleRefresh = async () => { await queryClient.invalidateQueries(); };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: activeCycle } = useQuery({
    queryKey: ['activeCycle', user?.email],
    queryFn: async () => {
      const cycles = await base44.entities.Cycle.filter({
        user_email: user?.email,
        status: { $in: ['prepared', 'awaiting_pickup', 'washing', 'drying', 'ready'] }
      }, '-created_date', 1);
      return cycles[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: preferences } = useQuery({
    queryKey: ['memberPreferences', user?.email],
    queryFn: async () => {
      const prefs = await base44.entities.MemberPreferences.filter({ user_email: user?.email });
      return prefs[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({ user_email: user?.email });
      return subs[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: reliabilityScore } = useQuery({
    queryKey: ['reliabilityScore', user?.email],
    queryFn: async () => {
      const scores = await base44.entities.ReliabilityScore.filter({
        entity_type: 'user',
        entity_id: user?.email
      });
      return scores[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: preferredGym } = useQuery({
    queryKey: ['preferredGym', user?.preferred_gym],
    queryFn: () => base44.entities.Gym.get(user.preferred_gym),
    enabled: !!user?.preferred_gym,
  });

  if (!user) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
    );
  }

  // --- Logic (unchanged) ---
  const getReadinessStatus = () => {
    if (!activeCycle) return { state: 'READY', color: 'bg-green-600', textColor: 'text-green-500', pulse: false };
    const map = {
      'awaiting_pickup': { state: 'IN NETWORK', color: 'bg-blue-600', textColor: 'text-blue-500', pulse: true },
      'washing':         { state: 'IN TRANSIT',         color: 'bg-purple-600', textColor: 'text-purple-500', pulse: true },
      'drying':          { state: 'PROCESSING',           color: 'bg-purple-600', textColor: 'text-purple-500', pulse: true },
      'ready':           { state: 'READY FOR RESET', color: 'bg-green-600', textColor: 'text-green-500', pulse: false },
    };
    return map[activeCycle.status] || { state: 'READY', color: 'bg-green-600', textColor: 'text-green-500', pulse: false };
  };

  const readinessStatus = getReadinessStatus();
  const onTimeDeliveryRate = reliabilityScore?.on_time_delivery_rate || 100;
  const incidentFreeStreak = preferences?.total_cycles_completed || 0;
  const networkPerformance = reliabilityScore?.network_contribution_score || 0;
  const rushCreditsRemaining = (subscription?.rush_deliveries_included || 0) - (subscription?.rush_deliveries_used || 0);
  const clusterLoad = Math.min(85, (preferences?.total_cycles_completed || 0) * 8);
  const routeCapacity = 100 - 92;
  const slaTarget = subscription?.laundry_turnaround_hours ?? 48;
  const resetCycleFrequency = preferences?.laundry_schedule?.replace('weekly_', '').toUpperCase() || 'NOT SET';
  const activeAlerts = incidentFreeStreak === 0 || rushCreditsRemaining === 0 ? 1 : 0;

  const getSystemStatus = () => {
    if (clusterLoad > 90) return { state: 'SLA RISK', color: 'bg-red-600', textColor: 'text-red-500', border: 'border-red-500/40' };
    if (clusterLoad > 70) return { state: 'HIGH LOAD', color: 'bg-orange-600', textColor: 'text-orange-500', border: 'border-orange-500/40' };
    return { state: 'STABLE', color: 'bg-green-600', textColor: 'text-green-500', border: 'border-green-500/30' };
  };
  const systemStatus = getSystemStatus();

  const firstName = user?.full_name?.split(' ')[0] || 'Operator';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-5 pb-4">

        {/* ── GREETING HEADER ── */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="text-muted-foreground text-xs font-mono uppercase tracking-widest">{greeting}</p>
            <h1 className="text-foreground text-2xl font-bold mt-0.5">{firstName}</h1>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${systemStatus.color} ${readinessStatus.pulse ? 'animate-pulse' : ''}`} />
              <span className={`text-xs font-mono font-bold ${systemStatus.textColor}`}>{systemStatus.state}</span>
            </div>
            <span className="text-muted-foreground text-[10px] font-mono uppercase">RCN · {new Date().toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
          </div>
        </div>

        {/* ── ACTIVE CYCLE HERO ── */}
        <Link to={createPageUrl('ActiveCycle')}>
          <Card className={`border ${activeCycle ? readinessStatus.color.replace('bg-', 'border-') + '/40' : 'border-border'} bg-gradient-to-br ${activeCycle ? 'from-card to-card/60' : 'from-card to-muted/20'} hover:shadow-lg transition-shadow cursor-pointer`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg ${activeCycle ? readinessStatus.color.replace('bg-', 'bg-') + '/15' : 'bg-green-500/10'} flex items-center justify-center`}>
                    <Radio className={`w-4 h-4 ${activeCycle ? readinessStatus.textColor : 'text-green-500'} ${readinessStatus.pulse ? 'animate-pulse' : ''}`} />
                  </div>
                  <span className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">Active Cycle</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${activeCycle ? readinessStatus.color : 'bg-green-600'} text-white font-mono text-[10px] px-2`}>
                    {readinessStatus.state}
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              {activeCycle ? (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-foreground text-lg font-bold font-mono">{activeCycle.order_number?.slice(-6) || '—'}</p>
                    <p className="text-muted-foreground text-[10px] font-mono uppercase mt-0.5">Order ID</p>
                  </div>
                  <div>
                    <p className="text-foreground text-lg font-bold font-mono">{activeCycle.items?.length || 0}</p>
                    <p className="text-muted-foreground text-[10px] font-mono uppercase mt-0.5">Units</p>
                  </div>
                  <div>
                    <p className="text-foreground text-lg font-bold font-mono">{slaTarget}h</p>
                    <p className="text-muted-foreground text-[10px] font-mono uppercase mt-0.5">SLA</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">No active cycle — tap to start one</p>
                  <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-green-500" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* ── METRICS ROW ── */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold font-mono text-green-500">{onTimeDeliveryRate}%</p>
              <p className="text-muted-foreground text-[10px] font-mono uppercase mt-1">On-Time</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold font-mono text-foreground">{incidentFreeStreak}</p>
              <p className="text-muted-foreground text-[10px] font-mono uppercase mt-1">Cycles</p>
            </CardContent>
          </Card>
          <Card className={`border ${systemStatus.border} bg-card`}>
            <CardContent className="p-3 text-center">
              <p className={`text-xl font-bold font-mono ${systemStatus.textColor}`}>{clusterLoad}%</p>
              <p className="text-muted-foreground text-[10px] font-mono uppercase mt-1">Node Load</p>
            </CardContent>
          </Card>
        </div>

        {/* ── NEXT CYCLE + ALERTS (2-col on md) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-foreground font-semibold text-sm">Next Cycle</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Schedule</span>
                  <span className="text-foreground font-mono font-medium">{resetCycleFrequency}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Window</span>
                  <span className="text-foreground font-mono font-medium">
                    {preferences?.preferred_pickup_window?.replace(/_/g, ' ').toUpperCase() || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Node</span>
                  <span className="text-foreground font-mono font-medium truncate max-w-[120px]">
                    {preferredGym?.name || '—'}
                  </span>
                </div>
              </div>
              {!user?.preferred_gym && (
                <Link to={createPageUrl('Initialize')}>
                  <Button className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white font-mono text-xs h-8">
                    INITIALIZE
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card className={`border ${activeAlerts > 0 ? 'border-orange-500/40' : 'border-border'} bg-card`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 ${activeAlerts > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
                  <h3 className="text-foreground font-semibold text-sm">Alerts</h3>
                </div>
                <Badge className={`${activeAlerts > 0 ? 'bg-orange-600' : 'bg-green-600'} text-white font-mono text-[10px]`}>
                  {activeAlerts} ACTIVE
                </Badge>
              </div>
              {activeAlerts > 0 ? (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                  <p className="text-orange-500 font-mono text-xs font-bold">LOW BACKUP COVERAGE</p>
                  <p className="text-muted-foreground text-xs mt-1">No emergency credits remaining</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-2 gap-2">
                  <CheckCircle className="w-7 h-7 text-green-500" />
                  <p className="text-muted-foreground text-xs">All systems nominal</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── ONBOARDING / SUBSCRIPTION / INFRA ── */}
        <OnboardingGate user={user} subscription={subscription} preferences={preferences} />
        {subscription && <SubscriptionUsageCard subscription={subscription} />}
        <InfrastructureMetrics userEmail={user?.email} />
        <CycleForecastWidget user={user} preferences={preferences} preferredGym={preferredGym} subscription={subscription} />

        {/* ── MODULE NAVIGATION GRID ── */}
        <div>
          <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest mb-3 px-0.5">Modules</p>
          <div className="grid grid-cols-2 gap-3">
            {MODULE_NAV.map(({ icon: Icon, label, page, color, bg }) => (
              <Link key={page} to={createPageUrl(page)}>
                <Card className="bg-card border-border hover:border-border/80 hover:shadow-md transition-all cursor-pointer group">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-xs font-semibold leading-tight">{label}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
            {user?.role === 'admin' && (
              <Link to={createPageUrl('OperationsView')}>
                <Card className="bg-card border-yellow-600/30 hover:border-yellow-600/60 hover:shadow-md transition-all cursor-pointer group">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Wifi className="w-4 h-4 text-yellow-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-xs font-semibold leading-tight">Operations</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </div>

      </div>
    </PullToRefresh>
  );
}