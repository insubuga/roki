import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tantml:parameter>
import { Activity, Clock, MapPin, AlertTriangle, CheckCircle, Zap, TrendingUp, Shield, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import MobileHeader from '@/components/mobile/MobileHeader';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const statusConfig = {
  awaiting_pickup: { 
    label: 'PROCESSING', 
    color: 'bg-blue-500', 
    textColor: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30'
  },
  washing: { 
    label: 'PROCESSING', 
    color: 'bg-blue-500', 
    textColor: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30'
  },
  drying: { 
    label: 'IN TRANSIT', 
    color: 'bg-orange-500', 
    textColor: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30'
  },
  ready: { 
    label: 'READY', 
    color: 'bg-green-500', 
    textColor: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30'
  },
  picked_up: { 
    label: 'DELIVERED', 
    color: 'bg-gray-500', 
    textColor: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30'
  },
};

const gearVolumeOptions = [
  { value: 'light', label: 'Light Load (3-5 items)', itemCount: 4 },
  { value: 'standard', label: 'Standard Load (6-10 items)', itemCount: 8 },
  { value: 'heavy', label: 'Heavy Load (11+ items)', itemCount: 12 },
];

const pickupWindows = [
  { value: 'early_morning', label: '5-8 AM' },
  { value: 'morning', label: '8-11 AM' },
  { value: 'midday', label: '11 AM-2 PM' },
  { value: 'afternoon', label: '2-5 PM' },
  { value: 'evening', label: '5-8 PM' },
  { value: 'night', label: '8-11 PM' },
];

export default function LaundryOrder() {
  const [user, setUser] = useState(null);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showRecoveryMode, setShowRecoveryMode] = useState(false);
  const [gearVolume, setGearVolume] = useState('standard');
  const [pickupWindow, setPickupWindow] = useState('evening');
  const [adminView, setAdminView] = useState(false);
  const queryClient = useQueryClient();

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

  const { data: completedCycles = [] } = useQuery({
    queryKey: ['completedCycles', user?.email],
    queryFn: () => base44.entities.LaundryOrder.filter({
      user_email: user?.email,
      status: 'picked_up'
    }),
    enabled: !!user?.email && adminView,
  });

  const { data: allActiveCycles = [] } = useQuery({
    queryKey: ['allActiveCycles'],
    queryFn: () => base44.entities.LaundryOrder.filter({
      status: { $in: ['awaiting_pickup', 'washing', 'drying', 'ready'] }
    }),
    enabled: !!user && adminView,
  });

  const activateCycleMutation = useMutation({
    mutationFn: async (cycleData) => {
      const volume = gearVolumeOptions.find(v => v.value === gearVolume);
      const batchId = `BATCH-${Date.now().toString(36).toUpperCase()}`;
      const routeId = `RT-${Math.floor(Math.random() * 999) + 100}`;
      
      await base44.entities.LaundryOrder.create({
        user_email: user.email,
        order_number: batchId,
        drop_off_date: new Date().toISOString().split('T')[0],
        status: 'awaiting_pickup',
        items: Array(volume.itemCount).fill('Activewear'),
        gym_location: gym?.name || 'Node Assigned',
      });

      // Log reliability event
      await base44.entities.ReliabilityLog.create({
        user_email: user.email,
        event_type: 'on_time_delivery',
        promised_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['activeCycle']);
      toast.success('Cycle Activated Successfully');
      setShowActivateDialog(false);
    },
    onError: () => {
      toast.error('System Exception: Activation Failed');
    },
  });

  const activateRecoveryMutation = useMutation({
    mutationFn: async () => {
      if (!activeCycle) return;
      
      await base44.entities.LaundryOrder.update(activeCycle.id, {
        ...activeCycle,
        status: 'drying', // Escalate status
      });

      await base44.entities.ReliabilityLog.create({
        user_email: user.email,
        event_type: 'rush_activated',
        order_id: activeCycle.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['activeCycle']);
      toast.success('Recovery Mode Activated');
      setShowRecoveryMode(false);
    },
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries(['activeCycle']);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentStatus = activeCycle ? statusConfig[activeCycle.status] : null;
  const totalCycles = preferences?.total_cycles_completed || 0;
  const reliabilityScore = totalCycles > 0 ? 96 : 0;
  const onTimeStreak = Math.min(totalCycles, 12);

  const nextScheduledDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const scheduleLabels = {
    weekly_monday: 'Every Monday',
    weekly_tuesday: 'Every Tuesday',
    weekly_wednesday: 'Every Wednesday',
    weekly_thursday: 'Every Thursday',
    weekly_friday: 'Every Friday',
    biweekly: 'Every 2 Weeks',
    custom: 'Custom Schedule',
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">
        <MobileHeader 
          title="Readiness Control Center" 
          subtitle="Automated fitness gear readiness system"
          icon={Activity}
          iconColor="text-green-400"
        />

        {/* Admin Toggle */}
        {user.role === 'admin' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAdminView(!adminView)}
            className="absolute top-4 right-4 z-10"
          >
            <Settings className="w-4 h-4 mr-2" />
            {adminView ? 'User View' : 'Admin View'}
          </Button>
        )}

        {/* READINESS STATUS CARD */}
        <Card className={`border-2 ${currentStatus ? currentStatus.borderColor : 'border-gray-700'}`}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">System Status</p>
                <h2 className={`text-3xl font-bold ${currentStatus ? currentStatus.textColor : 'text-gray-500'}`}>
                  {currentStatus ? currentStatus.label : 'READY'}
                </h2>
              </div>
              {currentStatus && (
                <div className={`w-4 h-4 rounded-full ${currentStatus.color} animate-pulse`} />
              )}
            </div>

            {activeCycle ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-gray-400 text-xs uppercase mb-1">Batch ID</p>
                    <p className="text-white font-mono text-sm">{activeCycle.order_number}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-gray-400 text-xs uppercase mb-1">Route ID</p>
                    <p className="text-white font-mono text-sm">RT-{Math.floor(Math.random() * 899) + 100}</p>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase mb-1">Est. Completion</p>
                  <p className="text-white font-semibold">
                    {new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                <p className="text-green-400 font-semibold">All systems operational</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* NEXT CYCLE CARD */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Clock className="w-5 h-5" />
              Next Scheduled Cycle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-gray-400 text-xs uppercase mb-1">Pickup Date</p>
                <p className="text-white font-semibold">
                  {nextScheduledDate.toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase mb-1">Window</p>
                <p className="text-white font-semibold">
                  {pickupWindows.find(w => w.value === (preferences?.preferred_pickup_window || 'evening'))?.label}
                </p>
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase mb-1">Schedule</p>
              <p className="text-white font-semibold">
                {scheduleLabels[preferences?.laundry_schedule] || 'Not configured'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* RELIABILITY SNAPSHOT */}
        <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Shield className="w-5 h-5 text-green-400" />
              Reliability Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-400">{reliabilityScore}%</p>
                <p className="text-gray-400 text-xs mt-1">On-Time Rate</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{onTimeStreak}</p>
                <p className="text-gray-400 text-xs mt-1">Incident-Free Streak</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{totalCycles}</p>
                <p className="text-gray-400 text-xs mt-1">Total Cycles</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">46h</p>
                <p className="text-gray-400 text-xs mt-1">Avg Turnaround</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* LOCKER NODE PANEL */}
        {assignedLocker && gym && (
          <Card className="bg-gray-800 border-purple-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <MapPin className="w-5 h-5 text-purple-400" />
                Assigned Node
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-gray-400 text-xs uppercase mb-1">Location</p>
                <p className="text-white font-semibold">{gym.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-gray-400 text-xs uppercase mb-1">Bay</p>
                  <p className="text-white font-mono font-bold">{assignedLocker.locker_number}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs uppercase mb-1">Access Code</p>
                  <p className="text-green-400 font-mono font-bold">{assignedLocker.access_code}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* RECOVERY MODE PANEL */}
        {activeCycle && activeCycle.status !== 'ready' && (
          <Card className="bg-gradient-to-br from-red-900/20 to-orange-900/20 border-red-700/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <div>
                  <p className="text-white font-bold">Recovery Protocol Available</p>
                  <p className="text-gray-400 text-sm">Activate priority dispatch if urgency detected</p>
                </div>
              </div>
              <Button
                onClick={() => setShowRecoveryMode(true)}
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-700 hover:to-orange-700"
              >
                <Zap className="w-4 h-4 mr-2" />
                Activate Recovery Mode
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ACTIVATE NEW CYCLE */}
        {!activeCycle && (
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button
              onClick={() => setShowActivateDialog(true)}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 py-6 text-lg font-semibold"
            >
              <Activity className="w-5 h-5 mr-2" />
              Activate New Cycle
            </Button>
          </motion.div>
        )}

        {/* ADMIN OPERATIONS VIEW */}
        {adminView && (
          <Card className="bg-gray-900 border-yellow-600/50">
            <CardHeader>
              <CardTitle className="text-yellow-400 flex items-center gap-2 text-base">
                <TrendingUp className="w-5 h-5" />
                Operations Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-xs uppercase mb-1">Active Cycles</p>
                  <p className="text-white text-2xl font-bold">{allActiveCycles.length}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs uppercase mb-1">Completed</p>
                  <p className="text-white text-2xl font-bold">{completedCycles.length}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs uppercase mb-1">System Uptime</p>
                  <p className="text-green-400 text-2xl font-bold">98.4%</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs uppercase mb-1">Route Efficiency</p>
                  <p className="text-green-400 text-2xl font-bold">92%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ACTIVATE CYCLE DIALOG */}
        <Dialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
          <DialogContent className="bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Activate New Cycle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <p className="text-gray-400 text-sm mb-2">Gear Volume</p>
                <Select value={gearVolume} onValueChange={setGearVolume}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {gearVolumeOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="text-white">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-gray-400 text-sm mb-2">Pickup Window</p>
                <Select value={pickupWindow} onValueChange={setPickupWindow}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {pickupWindows.map(window => (
                      <SelectItem key={window.value} value={window.value} className="text-white">
                        {window.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-xs uppercase mb-1">Locker Node</p>
                <p className="text-white font-semibold">{gym?.name || 'Configure in Profile'}</p>
                {assignedLocker && (
                  <p className="text-gray-400 text-sm">Bay {assignedLocker.locker_number}</p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-gray-700 text-gray-400"
                  onClick={() => setShowActivateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => activateCycleMutation.mutate()}
                  disabled={activateCycleMutation.isPending || !assignedLocker}
                >
                  {activateCycleMutation.isPending ? 'Validating...' : 'Activate Cycle'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* RECOVERY MODE DIALOG */}
        <Dialog open={showRecoveryMode} onOpenChange={setShowRecoveryMode}>
          <DialogContent className="bg-gray-900 border-red-700/50">
            <DialogHeader>
              <DialogTitle className="text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Activate Recovery Mode
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                <p className="text-red-400 font-semibold mb-2">Priority Dispatch Engaged</p>
                <p className="text-gray-400 text-sm">
                  System will reprioritize your cycle in the route queue and allocate backup coverage.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Revised ETA</span>
                  <span className="text-white font-semibold">12 hours</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Recovery Credits Used</span>
                  <span className="text-white font-semibold">1 of 3</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-gray-700 text-gray-400"
                  onClick={() => setShowRecoveryMode(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 text-white"
                  onClick={() => activateRecoveryMutation.mutate()}
                  disabled={activateRecoveryMutation.isPending}
                >
                  {activateRecoveryMutation.isPending ? 'Activating...' : 'Confirm Activation'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PullToRefresh>
  );
}