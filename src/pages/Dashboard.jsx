import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import PullToRefresh from '../components/mobile/PullToRefresh';
import { 
  ShoppingCart, 
  Zap, 
  Shirt, 
  Truck, 
  Watch,
  Settings,
  CreditCard,
  Package,
  ChevronRight,
  Sparkles,
  MessageCircle,
  Activity,
  Radio,
  CheckCircle,
  Clock,
  MapPin,
  TrendingUp,
  Shield,
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CycleForecastWidget from '../components/dashboard/CycleForecastWidget';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries();
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.error('Auth error:', e);
        // If auth fails, redirect to login
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
        status: { $in: ['awaiting_pickup', 'washing', 'drying', 'ready'] }
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm font-mono">Authenticating...</p>
      </div>
    );
  }

  // Readiness Status Logic
  const getReadinessStatus = () => {
    if (!activeCycle) return { state: 'READY', color: 'bg-green-600', textColor: 'text-green-600', description: 'System idle — ready for activation' };
    
    const statusMap = {
      'awaiting_pickup': { state: 'PROCESSING', color: 'bg-blue-600', textColor: 'text-blue-600', description: 'Cycle initiated — awaiting collection' },
      'washing': { state: 'IN TRANSIT', color: 'bg-purple-600', textColor: 'text-purple-600', description: 'Processing facility — turnaround in progress' },
      'drying': { state: 'IN TRANSIT', color: 'bg-purple-600', textColor: 'text-purple-600', description: 'Processing facility — turnaround in progress' },
      'ready': { state: 'DELIVERED', color: 'bg-green-600', textColor: 'text-green-600', description: 'Cycle complete — ready for collection' },
    };
    
    return statusMap[activeCycle.status] || { state: 'READY', color: 'bg-green-600', textColor: 'text-green-600', description: 'System idle — ready for activation' };
  };

  const readinessStatus = getReadinessStatus();
  
  // Calculate metrics
  const onTimeDeliveryRate = reliabilityScore?.on_time_delivery_rate || 100;
  const incidentFreeStreak = preferences?.total_cycles_completed || 0;
  const networkPerformance = reliabilityScore?.network_contribution_score || 0;
  
  // Backup coverage
  const rushCreditsRemaining = (subscription?.rush_deliveries_included || 0) - (subscription?.rush_deliveries_used || 0);
  const coverageLevel = subscription?.priority_dispatch ? 'Priority Readiness' : 'Core Readiness';
  
  // Gear rotation
  const weeklyCycles = Math.round((preferences?.total_cycles_completed || 0) / 4);
  const cleanCycleFrequency = preferences?.laundry_schedule?.replace('weekly_', '').toUpperCase() || 'NOT SET';

  const adminActions = user?.role === 'admin' ? [
    { icon: Settings, title: 'Operations Dashboard', page: 'OperationsView' },
  ] : [];

  // Calculate system metrics
  const clusterLoad = Math.min(85, (preferences?.total_cycles_completed || 0) * 8);
  const routeCapacity = 100 - 92; // 92% route efficiency = 8% capacity remaining
  const slaTarget = 48;
  
  // System status logic
  const getSystemStatus = () => {
    const load = clusterLoad;
    if (load > 90) return { state: 'SLA RISK', color: 'bg-red-600', textColor: 'text-red-600' };
    if (load > 70) return { state: 'HIGH LOAD', color: 'bg-orange-600', textColor: 'text-orange-600' };
    return { state: 'STABLE', color: 'bg-green-600', textColor: 'text-green-600' };
  };

  const systemStatus = getSystemStatus();
  const activeAlerts = incidentFreeStreak === 0 || rushCreditsRemaining === 0 ? 1 : 0;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4">
        {/* Control Center Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground text-xl font-bold font-mono">CONTROL CENTER</h1>
            <p className="text-muted-foreground text-xs font-mono">System State Overview</p>
          </div>
          {adminActions.length > 0 && (
            <Link to={createPageUrl('OperationsView')}>
              <Button variant="outline" size="sm" className="text-xs font-mono">
                OPS VIEW
              </Button>
            </Link>
          )}
        </div>

        {/* System Status - PRIMARY MONITOR */}
        <Card className={`border-2 ${systemStatus.color.replace('bg-', 'border-')} bg-card`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Radio className={`w-5 h-5 ${systemStatus.textColor} animate-pulse`} />
                <span className="text-muted-foreground text-xs font-mono uppercase">System Status</span>
              </div>
              <Badge className={`${systemStatus.color} text-white font-mono text-sm px-3 py-1`}>
                {systemStatus.state}
              </Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground font-mono">{clusterLoad}%</p>
                <p className="text-muted-foreground font-mono uppercase mt-1">Cluster Load</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground font-mono">{routeCapacity}%</p>
                <p className="text-muted-foreground font-mono uppercase mt-1">Route Cap</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground font-mono">{slaTarget}h</p>
                <p className="text-muted-foreground font-mono uppercase mt-1">SLA Target</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Cycle */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-foreground font-mono font-semibold text-sm uppercase">Next Cycle</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-mono">Scheduled Pickup</span>
                <span className="text-foreground font-mono font-bold">{cleanCycleFrequency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-mono">Route Window</span>
                <span className="text-foreground font-mono font-bold">
                  {preferences?.preferred_pickup_window?.replace('_', ' ').toUpperCase() || 'NOT SET'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-mono">Node Location</span>
                <span className="text-foreground font-mono font-bold">
                  {preferredGym?.name || 'NOT SET'}
                </span>
              </div>
            </div>
            {!user?.preferred_gym && !preferences && (
              <Link to={createPageUrl('Initialize')}>
                <Button className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white font-mono text-xs">
                  INITIALIZE SYSTEM
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Reliability Score */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <h3 className="text-foreground font-mono font-semibold text-sm uppercase">Reliability Score</h3>
              </div>
              <Badge className={`${onTimeDeliveryRate >= 95 ? 'bg-green-600' : 'bg-orange-600'} text-white font-mono`}>
                {onTimeDeliveryRate >= 95 ? 'EXCELLENT' : 'GOOD'}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs text-center">
              <div>
                <p className="text-2xl font-bold text-green-600 font-mono">{onTimeDeliveryRate}%</p>
                <p className="text-muted-foreground font-mono uppercase mt-1">On-Time</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground font-mono">{incidentFreeStreak}</p>
                <p className="text-muted-foreground font-mono uppercase mt-1">Streak</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground font-mono">{networkPerformance}%</p>
                <p className="text-muted-foreground font-mono uppercase mt-1">Network</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Predictive Cycle Forecast */}
        <CycleForecastWidget user={user} preferences={preferences} preferredGym={preferredGym} />

        {/* Active Alerts */}
        <Card className={`border-2 ${activeAlerts > 0 ? 'border-orange-600' : 'border-border'} bg-card`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${activeAlerts > 0 ? 'text-orange-600' : 'text-muted-foreground'}`} />
                <h3 className="text-foreground font-mono font-semibold text-sm uppercase">Active Alerts</h3>
              </div>
              <Badge className={`${activeAlerts > 0 ? 'bg-orange-600' : 'bg-green-600'} text-white font-mono`}>
                {activeAlerts} ACTIVE
              </Badge>
            </div>
            {activeAlerts > 0 ? (
              <div className="space-y-2">
                {rushCreditsRemaining === 0 && (
                  <div className="bg-orange-600/10 border border-orange-600/30 rounded p-2">
                    <p className="text-orange-600 font-mono text-xs font-bold">LOW BACKUP COVERAGE</p>
                    <p className="text-muted-foreground font-mono text-xs mt-1">
                      No emergency credits remaining
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-2">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-muted-foreground font-mono text-xs">All systems operational</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Navigation - View Only */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h3 className="text-foreground font-mono font-semibold text-sm uppercase mb-3">System Modules</h3>
            <div className="space-y-2">
              <Link to={createPageUrl('LaundryOrder')} className="block">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground font-mono text-xs">Active Cycle</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
              <Link to={createPageUrl('Network')} className="block">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground font-mono text-xs">Network</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
              <Link to={createPageUrl('RiskRecovery')} className="block">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-orange-600" />
                    <span className="text-foreground font-mono text-xs">Risk & Recovery</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
              <Link to={createPageUrl('Performance')} className="block">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground font-mono text-xs">Performance</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
              <Link to={createPageUrl('Configuration')} className="block">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground font-mono text-xs">Configuration</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PullToRefresh>
  );
}