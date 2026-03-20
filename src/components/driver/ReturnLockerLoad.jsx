import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, CheckCircle2, Lock, MapPin, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

function generateCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default function ReturnLockerLoad({ user }) {
  const queryClient = useQueryClient();

  const { data: readyCycles = [] } = useQuery({
    queryKey: ['driver-ready-cycles'],
    queryFn: () => base44.entities.Cycle.filter({ status: 'ready' }),
    enabled: !!user,
  });

  const { data: returnAssignments = [] } = useQuery({
    queryKey: ['driver-return-assignments-load'],
    queryFn: () => base44.entities.ReturnLockerAssignment.filter({
      status: { $in: ['assigned', 'en_route'] }
    }),
    enabled: readyCycles.length > 0,
  });

  const { data: availableLockers = [] } = useQuery({
    queryKey: ['driver-available-lockers'],
    queryFn: () => base44.entities.Locker.filter({ status: 'available' }),
    enabled: readyCycles.length > 0,
  });

  const { data: allLockers = [] } = useQuery({
    queryKey: ['return-lockers-load'],
    queryFn: () => base44.entities.Locker.list(),
    enabled: returnAssignments.length > 0,
  });

  // Fetch all scheduled enhancements for ready cycles
  const readyCycleIds = readyCycles.map(c => c.id);
  const { data: allEnhancements = [] } = useQuery({
    queryKey: ['driver-enhancements', readyCycleIds.join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        readyCycleIds.map(id => base44.entities.AttachmentLog.filter({ cycle_id: id, status: 'scheduled' }))
      );
      return results.flat();
    },
    enabled: readyCycleIds.length > 0,
  });

  // Assign a locker to a ready cycle (driver at facility, picking up gear)
  const assignLockerMutation = useMutation({
    mutationFn: async (cycle) => {
      const locker = availableLockers[0];
      if (!locker) throw new Error('No lockers available at this gym');
      const code = generateCode();

      await base44.entities.ReturnLockerAssignment.create({
        cycle_id: cycle.id,
        locker_id: locker.id,
        user_email: cycle.user_email,
        access_code: code,
        status: 'assigned',
        assigned_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      await base44.entities.Locker.update(locker.id, { status: 'softReserved' });
    },
    onSuccess: () => {
      toast.success('Locker assigned — deliver gear and confirm load');
      queryClient.invalidateQueries({ queryKey: ['driver-ready-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['driver-return-assignments-load'] });
      queryClient.invalidateQueries({ queryKey: ['driver-available-lockers'] });
    },
    onError: (e) => toast.error(e.message || 'Failed to assign locker'),
  });

  // Confirm gear has been physically loaded into the locker
  const confirmLoadMutation = useMutation({
    mutationFn: async ({ cycle, assignment }) => {
      await base44.entities.ReturnLockerAssignment.update(assignment.id, {
        status: 'delivered',
      });
      await base44.entities.Locker.update(assignment.locker_id, { status: 'dropped' });
      // In-app notification (email also fires via returnLockerNotifier automation)
      await base44.entities.Notification.create({
        user_email: cycle.user_email,
        type: 'laundry',
        title: '✅ Clean gear in your locker!',
        message: `Your gear is ready. Access code: ${assignment.access_code}. Head to ${cycle.gym_location || 'your gym'} to collect.`,
        priority: 'high',
        read: false,
      });
    },
    onSuccess: () => {
      toast.success('Delivery confirmed · Member notified');
      queryClient.invalidateQueries({ queryKey: ['driver-ready-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['driver-return-assignments-load'] });
    },
    onError: () => toast.error('Failed to confirm delivery'),
  });

  // Split cycles into: needs locker assigned vs. has assignment ready to load
  const unassignedCycles = readyCycles.filter(
    c => !returnAssignments.find(a => a.cycle_id === c.id)
  );
  const assignedPairs = readyCycles
    .map(cycle => ({
      cycle,
      assignment: returnAssignments.find(a => a.cycle_id === cycle.id),
    }))
    .filter(({ assignment }) => !!assignment);

  if (readyCycles.length === 0) return null;

  return (
    <div className="px-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Package className="w-4 h-4 text-blue-600" />
        <h2 className="text-base font-bold text-gray-900 font-mono">Clean Gear Returns</h2>
        <Badge className="bg-blue-600 text-white text-xs">{readyCycles.length}</Badge>
      </div>

      <div className="space-y-3">
        {/* Step 1: Unassigned cycles — driver needs to claim a locker */}
        {unassignedCycles.map((cycle) => {
          const cycleEnhancements = allEnhancements.filter(e => e.cycle_id === cycle.id);
          return (
          <Card key={cycle.id} className="border-l-4 border-l-orange-400">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-sm text-gray-900">
                  Order #{cycle.order_number}
                </span>
                <Badge className="bg-orange-100 text-orange-700 border border-orange-300 font-mono text-xs">
                  Needs Locker
                </Badge>
              </div>
              {cycle.gym_location && (
                <div className="flex items-center gap-1 text-xs text-gray-500 font-mono mb-3">
                  <MapPin className="w-3 h-3" />
                  <span>{cycle.gym_location}</span>
                </div>
              )}
              <p className="text-gray-400 font-mono text-xs mb-3">Member: {cycle.user_email}</p>
              {cycleEnhancements.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-3 h-3 text-green-600" />
                    <p className="text-green-700 font-mono text-xs font-bold uppercase">Pack with gear ({cycleEnhancements.length} item{cycleEnhancements.length > 1 ? 's' : ''})</p>
                  </div>
                  <div className="space-y-1">
                    {cycleEnhancements.map(e => (
                      <div key={e.id} className="flex items-center justify-between text-xs font-mono">
                        <span className="text-gray-700">{e.attachment_name}</span>
                        <span className="text-gray-500">× {e.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-mono text-sm font-bold"
                onClick={() => assignLockerMutation.mutate(cycle)}
                disabled={assignLockerMutation.isPending || availableLockers.length === 0}
              >
                <Lock className="w-4 h-4 mr-2" />
                {availableLockers.length === 0 ? 'No Lockers Available' : 'Assign Return Locker'}
              </Button>
            </CardContent>
          </Card>
          );
        })}

        {/* Step 2: Locker assigned — driver loads gear and confirms */}
        {assignedPairs.map(({ cycle, assignment }) => {
          const locker = allLockers.find(l => l.id === assignment.locker_id);
          return (
            <Card key={cycle.id} className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono font-bold text-gray-900 text-sm">
                    Order #{cycle.order_number}
                  </span>
                  <Badge className="bg-blue-100 text-blue-700 border border-blue-300 font-mono text-xs">
                    Load Gear
                  </Badge>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <p className="text-blue-600 font-mono text-xs mb-1">
                    Locker #{locker?.locker_number || '—'} — Enter this code to open:
                  </p>
                  <span className="text-blue-700 font-mono font-bold text-2xl tracking-[0.3em]">
                    {assignment.access_code}
                  </span>
                </div>

                {cycle.gym_location && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 font-mono mb-3">
                    <MapPin className="w-3 h-3" />
                    <span>{cycle.gym_location}</span>
                  </div>
                )}
                <p className="text-xs text-gray-400 font-mono mb-3">Member: {cycle.user_email}</p>

                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-mono text-sm font-bold"
                  onClick={() => confirmLoadMutation.mutate({ cycle, assignment })}
                  disabled={confirmLoadMutation.isPending}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm — Gear Loaded in Locker
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}