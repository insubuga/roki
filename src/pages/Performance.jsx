import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, CheckCircle, Calendar, Zap, Clock, Activity, DollarSign, Users, Percent } from 'lucide-react';
import MobileHeader from '../components/mobile/MobileHeader';

export default function Performance() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        setUser(null);
      }
    };
    loadUser();
  }, []);

  const { data: preferences } = useQuery({
    queryKey: ['memberPreferences', user?.email],
    queryFn: async () => {
      const prefs = await base44.entities.MemberPreferences.filter({ user_email: user?.email });
      return prefs[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: completedCycles = [] } = useQuery({
    queryKey: ['completedCycles', user?.email],
    queryFn: async () => {
      const delivered = await base44.entities.Order.filter({
        user_email: user?.email,
        status: 'delivered'
      });
      const laundry = await base44.entities.LaundryOrder.filter({
        user_email: user?.email,
        status: 'picked_up'
      });
      return [...delivered, ...laundry];
    },
    enabled: !!user?.email,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['memberHistory', user?.email],
    queryFn: () => base44.entities.MemberHistory.filter({ user_email: user?.email }, '-created_date', 100),
    enabled: !!user?.email,
  });

  const { data: allPreferences = [] } = useQuery({
    queryKey: ['allMemberPreferences'],
    queryFn: () => base44.entities.MemberPreferences.list(),
    enabled: !!user,
  });

  const { data: allGyms = [] } = useQuery({
    queryKey: ['allGyms'],
    queryFn: () => base44.entities.Gym.list(),
    enabled: !!user,
  });

  const { data: allLockers = [] } = useQuery({
    queryKey: ['allLockers'],
    queryFn: () => base44.entities.Locker.list(),
    enabled: !!user,
  });

  const { data: allOrders = [] } = useQuery({
    queryKey: ['allOrders'],
    queryFn: () => base44.entities.Order.list('-created_date', 200),
    enabled: !!user,
  });

  // Calculate metrics
  const totalCycles = preferences?.total_cycles_completed || 0;
  const avgCleanliness = preferences?.average_cleanliness_score || 0;
  const reliabilityScore = completedCycles.length > 0 ? 96 : 0;
  const onTimeStreak = Math.min(completedCycles.length, 12);
  const estimatedMinutesSaved = totalCycles * 45;
  const workoutsCovered = totalCycles * 3;

  // Density Engine Calculations
  const gymClusters = allGyms.reduce((clusters, gym) => {
    const gymLockers = allLockers.filter(l => l.gym_id === gym.id);
    const activeMembers = allPreferences.filter(p => p.assigned_locker_id && gymLockers.some(l => l.id === p.assigned_locker_id));
    const utilization = gymLockers.length > 0 
      ? (gymLockers.filter(l => l.status === 'claimed').length / gymLockers.length) * 100
      : 0;
    
    clusters.push({
      gym,
      members: activeMembers.length,
      lockers: gymLockers.length,
      activeLockers: gymLockers.filter(l => l.status === 'claimed').length,
      utilization: Math.round(utilization)
    });
    return clusters;
  }, []);

  // Network-wide density metrics
  const totalMembers = allPreferences.filter(p => p.assigned_locker_id).length;
  const totalActiveLockers = allLockers.filter(l => l.status === 'claimed').length;
  const totalLockers = allLockers.length;
  const networkUtilization = totalLockers > 0 ? Math.round((totalActiveLockers / totalLockers) * 100) : 0;
  const avgMembersPerCluster = allGyms.length > 0 ? (totalMembers / allGyms.length).toFixed(1) : 0;

  // Route overlap efficiency (mock calculation based on cluster density)
  const routeOverlapEfficiency = Math.min(95, 60 + (networkUtilization * 0.35));

  // Cost per pickup calculation
  const baseCostPerPickup = 12.50;
  const densityDiscount = (networkUtilization / 100) * 0.40; // Up to 40% discount at 100% density
  const costPerPickup = (baseCostPerPickup * (1 - densityDiscount)).toFixed(2);

  // Density health score
  const densityHealthScore = Math.round((networkUtilization + routeOverlapEfficiency) / 2);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MobileHeader
        title="SYSTEM PERFORMANCE"
        subtitle="Reliability metrics and operational insights"
        icon={Activity}
        iconColor="text-green-600"
      />

      {/* Primary Metrics */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-900/50">
        <CardHeader>
          <CardTitle className="text-base font-mono uppercase flex items-center gap-2">
            <Target className="w-5 h-5 text-green-600" />
            30-Day Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <p className="text-muted-foreground text-xs uppercase font-mono">Reliability</p>
              </div>
              <p className="text-3xl font-bold text-green-600 font-mono">{reliabilityScore}%</p>
            </div>
            <div className="bg-card rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-orange-500" />
                <p className="text-muted-foreground text-xs uppercase font-mono">On-Time Streak</p>
              </div>
              <p className="text-3xl font-bold text-foreground font-mono">{onTimeStreak}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coverage Stats */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-mono uppercase flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-600" />
            Coverage Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-mono text-sm">Total Cycles Completed</span>
              <span className="text-foreground font-bold text-lg font-mono">{totalCycles}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-mono text-sm">Workouts Covered</span>
              <span className="text-green-600 font-bold text-lg font-mono">{workoutsCovered}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-mono text-sm">Total Deliveries</span>
              <span className="text-foreground font-bold text-lg font-mono">{preferences?.total_deliveries_received || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Savings */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-900/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-foreground font-bold text-lg font-mono">{Math.floor(estimatedMinutesSaved / 60)} HOURS SAVED</p>
              <p className="text-muted-foreground text-xs font-mono">Time recovered from cycle automation</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Density Engine */}
      <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border-purple-200 dark:border-purple-900/50">
        <CardHeader>
          <CardTitle className="text-base font-mono uppercase flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-600" />
            Density Engine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Density Health Score */}
            <div className="bg-card rounded-lg p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm font-mono uppercase">Cluster Density Health</span>
                <Badge className={`${densityHealthScore >= 80 ? 'bg-green-600' : densityHealthScore >= 60 ? 'bg-yellow-600' : 'bg-orange-600'} text-white border-none font-mono`}>
                  {densityHealthScore}%
                </Badge>
              </div>
              <div className="bg-muted rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full transition-all ${densityHealthScore >= 80 ? 'bg-gradient-to-r from-green-500 to-green-600' : densityHealthScore >= 60 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 'bg-gradient-to-r from-orange-500 to-orange-600'}`}
                  style={{ width: `${densityHealthScore}%` }}
                />
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-lg p-3 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-3 h-3 text-purple-600" />
                  <p className="text-muted-foreground text-xs uppercase font-mono">Members/Cluster</p>
                </div>
                <p className="text-foreground font-bold text-xl font-mono">{avgMembersPerCluster}</p>
              </div>
              <div className="bg-card rounded-lg p-3 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Percent className="w-3 h-3 text-green-600" />
                  <p className="text-muted-foreground text-xs uppercase font-mono">Utilization</p>
                </div>
                <p className="text-foreground font-bold text-xl font-mono">{networkUtilization}%</p>
              </div>
              <div className="bg-card rounded-lg p-3 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-3 h-3 text-blue-600" />
                  <p className="text-muted-foreground text-xs uppercase font-mono">Route Efficiency</p>
                </div>
                <p className="text-foreground font-bold text-xl font-mono">{routeOverlapEfficiency.toFixed(1)}%</p>
              </div>
              <div className="bg-card rounded-lg p-3 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-3 h-3 text-green-600" />
                  <p className="text-muted-foreground text-xs uppercase font-mono">Cost/Pickup</p>
                </div>
                <p className="text-foreground font-bold text-xl font-mono">${costPerPickup}</p>
              </div>
            </div>

            {/* Density Insight */}
            <div className="bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-950/50 dark:to-violet-950/50 rounded-lg p-4 border border-purple-200 dark:border-purple-900/50">
              <p className="text-foreground text-sm font-bold font-mono mb-1">INFRASTRUCTURE SCALES WITH DENSITY</p>
              <p className="text-muted-foreground text-xs leading-relaxed font-mono">
                At {networkUtilization}% network utilization, operational efficiency improves by {(densityDiscount * 100).toFixed(0)}%. 
                Higher cluster density drives down per-unit costs and increases route optimization.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cluster Breakdown */}
      {gymClusters.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-mono uppercase flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-600" />
              Cluster Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {gymClusters
                .sort((a, b) => b.utilization - a.utilization)
                .map((cluster, idx) => (
                  <div key={idx} className="bg-muted rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground font-semibold text-sm truncate font-mono">{cluster.gym.name}</p>
                        <p className="text-muted-foreground text-xs font-mono">{cluster.members} members • {cluster.activeLockers}/{cluster.lockers} bays</p>
                      </div>
                      <Badge className={`${cluster.utilization >= 70 ? 'bg-green-600' : cluster.utilization >= 40 ? 'bg-yellow-600' : 'bg-gray-600'} text-white text-xs ml-2 font-mono`}>
                        {cluster.utilization}%
                      </Badge>
                    </div>
                    <div className="bg-card rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full transition-all ${cluster.utilization >= 70 ? 'bg-green-600' : cluster.utilization >= 40 ? 'bg-yellow-600' : 'bg-gray-600'}`}
                        style={{ width: `${cluster.utilization}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Health */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-mono uppercase">System Health Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm font-mono">Avg Quality Score</span>
              <Badge className="bg-green-600 text-white border-none font-mono">{avgCleanliness.toFixed(1)}/5.0</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm font-mono">Data Points Tracked</span>
              <span className="text-foreground font-semibold font-mono">{history.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm font-mono">Route Optimization</span>
              <span className="text-green-600 font-semibold font-mono">+{preferences?.route_density_contribution || 0}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}