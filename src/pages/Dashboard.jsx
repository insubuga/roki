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
        setUser(null);
      }
    };
    loadUser();
  }, []);

  const { data: activeCycle } = useQuery({
    queryKey: ['activeCycle', user?.email],
    queryFn: async () => {
      const cycles = await base44.entities.LaundryOrder.filter({ 
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

  const { data: assignedLocker } = useQuery({
    queryKey: ['assignedLocker', preferences?.assigned_locker_id],
    queryFn: () => base44.entities.Locker.get(preferences?.assigned_locker_id),
    enabled: !!preferences?.assigned_locker_id,
  });

  const { data: gym } = useQuery({
    queryKey: ['lockerGym', assignedLocker?.gym_id],
    queryFn: () => base44.entities.Gym.get(assignedLocker?.gym_id),
    enabled: !!assignedLocker?.gym_id,
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Initializing system...</p>
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

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4">
        {/* System Console Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground text-xl font-bold font-mono">SYSTEM CONSOLE</h1>
            <p className="text-muted-foreground text-xs font-mono">{user.full_name}</p>
          </div>
          {adminActions.length > 0 && (
            <Link to={createPageUrl('OperationsView')}>
              <Button variant="outline" size="sm" className="text-xs font-mono">
                OPS VIEW
              </Button>
            </Link>
          )}
        </div>

        {/* Readiness Status - PRIMARY CARD */}
        <Card className={`border-2 ${readinessStatus.color.replace('bg-', 'border-')} bg-card`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Radio className={`w-5 h-5 ${readinessStatus.textColor} animate-pulse`} />
                <span className="text-muted-foreground text-xs font-mono uppercase">Readiness Status</span>
              </div>
              <Badge className={`${readinessStatus.color} text-white font-mono text-sm px-3 py-1`}>
                {readinessStatus.state}
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs font-mono">{readinessStatus.description}</p>
            
            {activeCycle && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground font-mono uppercase">Cycle ID</p>
                    <p className="text-foreground font-mono font-bold">{activeCycle.order_number}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-mono uppercase">ETA</p>
                    <p className="text-foreground font-mono font-bold">48h</p>
                  </div>
                </div>
              </div>
            )}
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
                  {assignedLocker?.locker_number || 'NOT ASSIGNED'}
                </span>
              </div>
            </div>
            {!assignedLocker && (
              <Link to={createPageUrl('Onboarding')}>
                <Button className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white font-mono text-xs">
                  COMPLETE SETUP
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Reliability Score */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <h3 className="text-foreground font-mono font-semibold text-sm uppercase">Reliability Score</h3>
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

        {/* Backup Coverage */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-orange-600" />
              <h3 className="text-foreground font-mono font-semibold text-sm uppercase">Backup Coverage</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-mono">Emergency Credits</span>
                <Badge className={`${rushCreditsRemaining > 0 ? 'bg-orange-600' : 'bg-gray-600'} text-white font-mono`}>
                  {rushCreditsRemaining} REMAINING
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-mono">Coverage Level</span>
                <Badge className="bg-purple-600 text-white font-mono">
                  {coverageLevel.toUpperCase()}
                </Badge>
              </div>
            </div>
            <Link to={createPageUrl('Subscription')}>
              <Button variant="outline" className="w-full mt-3 border-border text-foreground font-mono text-xs">
                UPGRADE COVERAGE
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Gear Rotation Health */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <h3 className="text-foreground font-mono font-semibold text-sm uppercase">Gear Rotation Health</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-mono">Weekly Usage</span>
                <span className="text-foreground font-mono font-bold">{weeklyCycles} cycles/wk</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-mono">Clean Cycle Frequency</span>
                <span className="text-foreground font-mono font-bold">{cleanCycleFrequency}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-mono">Supply Status</span>
                <Badge className="bg-green-600 text-white font-mono text-xs">
                  OPTIMAL
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Access */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h3 className="text-foreground font-mono font-semibold text-sm uppercase mb-3">Quick Access</h3>
            <div className="grid grid-cols-2 gap-2">
              <Link to={createPageUrl('LaundryOrder')}>
                <Button variant="outline" className="w-full border-border font-mono text-xs h-12">
                  <Shirt className="w-4 h-4 mr-2" />
                  Execute Cycle
                </Button>
              </Link>
              <Link to={createPageUrl('RushMode')}>
                <Button variant="outline" className="w-full border-orange-600 text-orange-600 font-mono text-xs h-12">
                  <Zap className="w-4 h-4 mr-2" />
                  Recovery
                </Button>
              </Link>
              <Link to={createPageUrl('Network')}>
                <Button variant="outline" className="w-full border-border font-mono text-xs h-12">
                  <MapPin className="w-4 h-4 mr-2" />
                  Network
                </Button>
              </Link>
              <Link to={createPageUrl('Performance')}>
                <Button variant="outline" className="w-full border-border font-mono text-xs h-12">
                  <Activity className="w-4 h-4 mr-2" />
                  Metrics
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="space-y-1">
              <Link to={createPageUrl('Profile')} className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors">
                <span className="text-foreground text-xs font-mono">Profile & Node Config</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
              <Link to={createPageUrl('Subscription')} className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors">
                <span className="text-foreground text-xs font-mono">Subscription Settings</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
              <Link to={createPageUrl('Schedule')} className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors">
                <span className="text-foreground text-xs font-mono">Schedule Management</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PullToRefresh>
  );
}