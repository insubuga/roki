import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Activity, Clock, MapPin, AlertTriangle, TrendingUp, Database, Radio, BarChart3, ArrowLeft } from 'lucide-react';
import CycleTracker from '@/components/cycle/CycleTracker';
import LockerQRCode from '@/components/locker/LockerQRCode';
import DispatchAttachments from '@/components/cycle/DispatchAttachments';
import LockerPanel from '@/components/locker/LockerPanel';
import ReturnLockerPanel from '@/components/locker/ReturnLockerPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MobileSelect from '@/components/mobile/MobileSelect';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

const cycleStates = {
  queued: { label: 'QUEUED', color: 'bg-gray-500', textColor: 'text-gray-400' },
  collected: { label: 'COLLECTED', color: 'bg-blue-500', textColor: 'text-blue-400' },
  processing: { label: 'PROCESSING', color: 'bg-blue-500', textColor: 'text-blue-400' },
  quality_check: { label: 'QUALITY CHECK', color: 'bg-purple-500', textColor: 'text-purple-400' },
  dispatched: { label: 'DISPATCHED', color: 'bg-orange-500', textColor: 'text-orange-400' },
  delivered: { label: 'DELIVERED', color: 'bg-green-500', textColor: 'text-green-400' },
};

const gearVolumeOptions = [
  { value: 'light', label: '3-5 Units', itemCount: 4 },
  { value: 'standard', label: '6-10 Units', itemCount: 8 },
  { value: 'heavy', label: '11-15 Units', itemCount: 12 },
];

export default function ActiveCycle() {
  const [user, setUser] = useState(null);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [gearVolume, setGearVolume] = useState('standard');
  const [operationsView, setOperationsView] = useState(false);
  const queryClient = useQueryClient();

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

  const { data: preferredGym } = useQuery({
    queryKey: ['preferredGym', user?.preferred_gym],
    queryFn: () => base44.entities.Gym.get(user.preferred_gym),
    enabled: !!user?.preferred_gym,
  });

  const { data: cycleAssignment } = useQuery({
    queryKey: ['cycleAssignment', activeCycle?.id],
    queryFn: () => base44.entities.CycleLockerAssignment.filter({ cycle_id: activeCycle.id }).then(r => r[0] || null),
    enabled: !!activeCycle?.id,
  });

  const { data: cycleLocker } = useQuery({
    queryKey: ['cycleLocker', cycleAssignment?.locker_id],
    queryFn: () => base44.entities.Locker.get(cycleAssignment.locker_id),
    enabled: !!cycleAssignment?.locker_id,
  });

  const { data: allLockers = [] } = useQuery({
    queryKey: ['allLockers'],
    queryFn: () => base44.entities.Locker.list(),
    enabled: !!user && operationsView,
  });

  const { data: allActiveCycles = [] } = useQuery({
    queryKey: ['allActiveCycles'],
    queryFn: () => base44.entities.Cycle.filter({
      status: { $in: ['awaiting_pickup', 'washing', 'drying', 'ready'] }
    }),
    enabled: !!user && operationsView,
  });

  const { data: reliabilityLogs = [] } = useQuery({
    queryKey: ['reliabilityLogs', user?.email],
    queryFn: () => base44.entities.ReliabilityLog.filter({ user_email: user.email }, '-created_date', 30),
    enabled: !!user?.email,
  });

  const { data: reliabilityScore } = useQuery({
    queryKey: ['reliabilityScore', user?.email],
    queryFn: () => base44.entities.ReliabilityScore.filter({ entity_id: user.email }),
    enabled: !!user?.email,
    select: (d) => d?.[0],
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription', user?.email],
    queryFn: () => base44.entities.Subscription.filter({ user_email: user.email }),
    enabled: !!user?.email,
    select: (d) => d?.[0],
  });

  const activateCycleMutation = useMutation({
    mutationFn: async () => {
      if (!user?.preferred_gym) throw new Error('Set your home gym in Profile first');
      const res = await base44.functions.invoke('atomicAssignLocker', {
        gymId: user.preferred_gym,
        gearVolume,
        preferredGymName: preferredGym?.name || 'Node Assigned',
      });
      if (!res.data?.success) throw new Error(res.data?.error || 'Activation failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['activeCycle']);
      queryClient.invalidateQueries(['cycleAssignment']);
      queryClient.invalidateQueries(['subscription']);
      toast.success('Cycle Activated — Locker Soft Reserved');
      setShowActivateDialog(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const activateRecoveryMutation = useMutation({
    mutationFn: async () => {
      if (!activeCycle) return;
      await base44.entities.Cycle.update(activeCycle.id, { ...activeCycle, status: 'drying' });
      await base44.entities.ReliabilityLog.create({
        user_email: user.email,
        event_type: 'rush_activated',
        order_id: activeCycle.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['activeCycle']);
      toast.success('Recovery Protocol Activated');
      setShowRecoveryDialog(false);
    },
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries(['activeCycle']);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalCycles = preferences?.total_cycles_completed || 0;
  const reliabilityScoreVal = reliabilityScore?.score ?? null;
  const onTimeLogs = reliabilityLogs.filter(l => l.event_type === 'on_time_delivery');
  const totalLogged = reliabilityLogs.filter(l => ['on_time_delivery', 'delayed_delivery'].includes(l.event_type)).length;
  const slaAdherence = totalLogged > 0 ? Math.round((onTimeLogs.length / totalLogged) * 100) : null;
  const avgTurnaround = subscription?.laundry_turnaround_hours ? subscription.laundry_turnaround_hours * 60 : 2880;
  const incidentCount = reliabilityLogs.filter(l => l.event_type !== 'on_time_delivery').length;
  const nodeUtilization = allLockers.length > 0 ? Math.round((allLockers.filter(l => l.status !== 'available').length / allLockers.length) * 100) : 0;

  const getCycleState = (status) => {
    const stateMap = {
      'awaiting_pickup': 'queued',
      'washing': 'processing',
      'drying': 'dispatched',
      'ready': 'delivered',
    };
    return stateMap[status] || 'queued';
  };

  const currentState = activeCycle ? cycleStates[getCycleState(activeCycle.status)] : null;
  const pickupTime = activeCycle ? new Date(activeCycle.created_date) : null;
  const expectedDelivery = pickupTime ? new Date(pickupTime.getTime() + avgTurnaround * 60 * 1000) : null;
  const variance = activeCycle && expectedDelivery ? Math.round((expectedDelivery - new Date()) / 60000) : 0;

  // Build turnaround trend from real reliability logs (deviation_minutes relative to avgTurnaround)
  const turnaroundTrend = reliabilityLogs.length > 0
    ? reliabilityLogs.slice(0, 7).reverse().map((log) => ({
        value: avgTurnaround + (log.deviation_minutes ?? 0),
      }))
    : [{ value: avgTurnaround }];

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-background pb-6">
        {/* System State Band */}
        <div className="bg-card border-b border-border px-4 py-3 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white -ml-2">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Active Cycle</h1>
            {user.role === 'admin' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOperationsView(!operationsView)}
                className="text-xs text-yellow-400 hover:text-yellow-300"
              >
                {operationsView ? 'User View' : 'Operations View'}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground uppercase">Status</p>
              <p className="text-green-600 font-mono font-bold">{activeCycle ? 'PROCESSING' : 'READY'}</p>
            </div>
            <div>
              <p className="text-muted-foreground uppercase">Route ID</p>
              <p className="text-foreground font-mono font-bold">{activeCycle ? `RT${activeCycle.id?.slice(-4).toUpperCase() || '—'}` : '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground uppercase">Turnaround ETA</p>
              <p className="text-foreground font-mono font-bold">{activeCycle ? `${(avgTurnaround / 60).toFixed(0)}h` : '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground uppercase">SLA Status</p>
              <p className="text-green-600 font-mono font-bold">{activeCycle ? 'ON TRACK' : 'READY'}</p>
            </div>
          </div>
        </div>

        <div className="px-4 space-y-4">
          {/* Active Cycle Monitor */}
          {activeCycle ? (
            <Card className={`bg-card border-2 ${currentState?.color.replace('bg-', 'border-')}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Radio className="w-4 h-4" />
                    ACTIVE CYCLE MONITOR
                  </span>
                  <Badge className={`${currentState?.color} text-white text-xs font-mono`}>
                    {currentState?.label}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Live Cycle Tracker */}
                <CycleTracker cycle={activeCycle} />

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted p-2 rounded">
                    <p className="text-muted-foreground uppercase mb-1">Cycle ID</p>
                    <p className="text-foreground font-mono">{activeCycle.order_number}</p>
                  </div>
                  <div className="bg-muted p-2 rounded">
                   <p className="text-muted-foreground uppercase mb-1">Route ID</p>
                   <p className="text-foreground font-mono">RT{activeCycle.id?.slice(-4).toUpperCase()}</p>
                  </div>
                  <div className="bg-muted p-2 rounded">
                    <p className="text-muted-foreground uppercase mb-1">Node</p>
                    <p className="text-foreground font-mono">{cycleLocker?.locker_number || '—'}</p>
                  </div>
                  <div className="bg-muted p-2 rounded">
                    <p className="text-muted-foreground uppercase mb-1">Batch Volume</p>
                    <p className="text-foreground font-mono">{activeCycle.items?.length || 0} units</p>
                  </div>
                </div>
                
                {cycleAssignment && cycleLocker && (
                  <LockerPanel
                    assignment={cycleAssignment}
                    locker={cycleLocker}
                    gym={preferredGym}
                    onStatusChange={() => {
                      queryClient.invalidateQueries(['cycleAssignment']);
                      queryClient.invalidateQueries(['activeCycle']);
                    }}
                  />
                )}

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pickup Timestamp</span>
                    <span className="text-foreground font-mono">{pickupTime?.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expected Delivery</span>
                    <span className="text-foreground font-mono">{expectedDelivery?.toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SLA Commitment</span>
                    <span className="text-green-600 font-mono font-bold">{subscription?.laundry_turnaround_hours ?? 48}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Variance</span>
                    <span className={`font-mono font-bold ${variance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {variance > 0 ? '+' : ''}{variance}min
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="p-6 text-center">
                <Database className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm mb-4">No active cycle</p>
                <Button
                  onClick={() => setShowActivateDialog(true)}
                  className="bg-green-600 hover:bg-green-700 text-white font-mono text-sm"
                  disabled={!user?.preferred_gym}
                >
                  ACTIVATE NEW CYCLE
                </Button>
                {!user?.preferred_gym && (
                  <p className="text-xs text-muted-foreground mt-2">Set your home gym in Profile to activate</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Route & Node Allocation */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                ROUTE & NODE ALLOCATION
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground uppercase mb-1">Route Window</p>
                  <p className="text-foreground font-mono">{preferences?.preferred_pickup_window?.replace('_', ' ').toUpperCase() || 'NOT SET'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase mb-1">Route Code</p>
                  <p className="text-foreground font-mono">{activeCycle ? `RT${activeCycle.id?.slice(-4).toUpperCase()}` : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase mb-1">Route Load</p>
                  <p className="text-foreground font-mono font-bold">{nodeUtilization}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase mb-1">Cluster Density</p>
                  <p className="text-green-600 font-mono font-bold">{preferences?.route_density_contribution || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Node Status */}
          {cycleLocker && preferredGym && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  NODE STATUS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-muted-foreground uppercase">Node ID</p>
                    <p className="text-foreground font-mono">{cycleLocker.locker_number}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground uppercase">Location</p>
                    <p className="text-foreground">{preferredGym.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground uppercase">Phase</p>
                    <p className="text-green-600 font-mono font-bold capitalize">{cycleAssignment?.status || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground uppercase">Drop Window</p>
                    <p className="text-foreground font-mono">
                      {cycleAssignment?.expires_at
                        ? new Date(cycleAssignment.expires_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Metrics */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                PERFORMANCE METRICS (30-DAY)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600 font-mono">{reliabilityScoreVal !== null ? `${reliabilityScoreVal}` : '—'}</p>
                  <p className="text-muted-foreground uppercase mt-1">Reliability</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground font-mono">{totalCycles}</p>
                  <p className="text-muted-foreground uppercase mt-1">Cycles</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground font-mono">{incidentCount}</p>
                  <p className="text-muted-foreground uppercase mt-1">Incidents</p>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Avg Turnaround</span>
                  <span className="text-foreground font-mono">{avgTurnaround / 60}h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">SLA Adherence</span>
                  <span className="text-green-600 font-mono font-bold">{slaAdherence !== null ? `${slaAdherence}%` : '—'}</span>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase mb-2">Turnaround Trend</p>
                <ResponsiveContainer width="100%" height={40}>
                  <LineChart data={turnaroundTrend}>
                    <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <DispatchAttachments user={user} activeCycle={activeCycle} />

          {/* Recovery Protocol */}
          {activeCycle && variance < -60 && (
            <Card className="bg-gradient-to-br from-red-950/50 to-orange-950/50 border-red-800">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <p className="text-white font-bold text-sm">VARIANCE DETECTED</p>
                    <p className="text-gray-400 text-xs mt-1">SLA breach risk — recovery protocol available</p>
                  </div>
                </div>
                <div className="space-y-2 text-xs mb-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Root Cause</span>
                    <span className="text-red-400 font-mono">Route Congestion</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Revised ETA</span>
                    <span className="text-white font-mono">+12h</span>
                  </div>
                </div>
                <Button
                  onClick={() => setShowRecoveryDialog(true)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-mono"
                >
                  ENGAGE RECOVERY PROTOCOL
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Operations View */}
          {operationsView && (
            <Card className="bg-card border-yellow-600/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-yellow-400 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  OPERATIONS SNAPSHOT
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground uppercase mb-1">Active Cycles</p>
                    <p className="text-foreground text-xl font-bold font-mono">{allActiveCycles.length}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground uppercase mb-1">Node Utilization</p>
                    <p className="text-foreground text-xl font-bold font-mono">{nodeUtilization}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground uppercase mb-1">Route Efficiency</p>
                    <p className="text-green-600 text-xl font-bold font-mono">{nodeUtilization}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground uppercase mb-1">Active Cycles</p>
                    <p className="text-foreground text-xl font-bold font-mono">{allActiveCycles.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Activate Cycle Dialog */}
        <Dialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground font-mono text-sm">ACTIVATE NEW CYCLE</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <p className="text-muted-foreground text-xs uppercase mb-2">Batch Volume</p>
                <MobileSelect
                  options={gearVolumeOptions.map(opt => ({ value: opt.value, label: opt.label }))}
                  value={gearVolume}
                  onValueChange={setGearVolume}
                  placeholder="Select Batch Volume"
                  trigger={
                    <Select value={gearVolume} onValueChange={setGearVolume}>
                      <SelectTrigger className="bg-muted border-border text-foreground font-mono text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {gearVolumeOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value} className="text-foreground font-mono text-sm">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  }
                />
              </div>
              <div className="bg-muted rounded p-3 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Home Gym</span>
                  <span className="text-foreground font-mono">{preferredGym?.name || 'Not Set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Route Capacity</span>
                  <span className="text-green-400 font-mono">Available</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SLA Impact</span>
                  <span className="text-green-400 font-mono">+0h</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-border text-muted-foreground text-xs"
                  onClick={() => setShowActivateDialog(false)}
                >
                  CANCEL
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-mono"
                  onClick={() => activateCycleMutation.mutate()}
                  disabled={activateCycleMutation.isPending || !user?.preferred_gym}
                >
                  {activateCycleMutation.isPending ? 'VALIDATING...' : 'ACTIVATE'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Recovery Protocol Dialog */}
        <Dialog open={showRecoveryDialog} onOpenChange={setShowRecoveryDialog}>
          <DialogContent className="bg-card border-red-700/50">
            <DialogHeader>
              <DialogTitle className="text-red-400 font-mono text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                RECOVERY PROTOCOL
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-red-950/30 dark:bg-red-950/50 border border-red-800 rounded p-3">
                <p className="text-red-400 font-bold text-xs mb-2">PRIORITY DISPATCH ENGAGED</p>
                <p className="text-gray-400 text-xs">Route queue reprioritized. Backup allocation assigned.</p>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Revised ETA</span>
                  <span className="text-foreground font-mono">12h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recovery Cost</span>
                  <span className="text-foreground font-mono">1 credit</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reliability Impact</span>
                  <span className="text-yellow-400 font-mono">-2%</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-border text-muted-foreground text-xs"
                  onClick={() => setShowRecoveryDialog(false)}
                >
                  CANCEL
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-mono"
                  onClick={() => activateRecoveryMutation.mutate()}
                  disabled={activateRecoveryMutation.isPending}
                >
                  {activateRecoveryMutation.isPending ? 'ACTIVATING...' : 'CONFIRM'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PullToRefresh>
  );
}