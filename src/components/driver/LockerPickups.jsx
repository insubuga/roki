import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock, KeyRound, CheckCircle2, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function LockerPickups({ user }) {
  const queryClient = useQueryClient();

  // Cycles where gear has been dropped (awaiting_pickup + assignment.status=dropped)
  const { data: pendingCycles = [], isLoading } = useQuery({
    queryKey: ['driver-locker-pickups'],
    queryFn: () => base44.entities.Cycle.filter({ status: 'awaiting_pickup' }),
    enabled: !!user,
  });

  // CycleLockerAssignments for cycles with dropped gear (ready for pickup)
  const { data: cycleAssignments = [] } = useQuery({
    queryKey: ['driver-cycle-assignments'],
    queryFn: () => base44.entities.CycleLockerAssignment.filter({ status: 'dropped' }),
    enabled: pendingCycles.length > 0,
  });

  const { data: lockers = [] } = useQuery({
    queryKey: ['all-dropped-lockers'],
    queryFn: () => base44.entities.Locker.filter({ status: 'dropped' }),
    enabled: cycleAssignments.length > 0,
  });

  const confirmPickupMutation = useMutation({
    mutationFn: async (cycle) => {
      const assignment = cycleAssignments.find(a => a.cycle_id === cycle.id);
      await base44.entities.Cycle.update(cycle.id, { status: 'washing' });
      if (assignment) {
        await base44.entities.CycleLockerAssignment.update(assignment.id, { status: 'pickedUp' });
        // Set resetPending — locker will be released to available after driver confirms route departure
        await base44.entities.Locker.update(assignment.locker_id, { status: 'resetPending' });
      }
    },
    onSuccess: () => {
      toast.success('Pickup confirmed · Locker set to reset-pending');
      queryClient.invalidateQueries({ queryKey: ['driver-locker-pickups'] });
      queryClient.invalidateQueries({ queryKey: ['driver-cycle-assignments'] });
    },
    onError: () => toast.error('Failed to confirm pickup'),
  });

  if (isLoading) return null;
  if (pendingCycles.length === 0) return null;

  return (
    <div className="px-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Lock className="w-4 h-4 text-green-600" />
        <h2 className="text-base font-bold text-gray-900 font-mono">Locker Access</h2>
        <Badge className="bg-green-600 text-white text-xs">{pendingCycles.length}</Badge>
      </div>

      <div className="space-y-3">
        {pendingCycles.map((cycle) => {
          const assignment = cycleAssignments.find(a => a.cycle_id === cycle.id);
          if (!assignment) return null; // only show cycles where gear is physically dropped
          const locker = lockers.find(l => l.id === assignment?.locker_id);
          const displayCode = assignment?.access_code || '----';

          return (
            <Card key={cycle.id} className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-green-600" />
                    <span className="font-mono font-bold text-gray-900 text-sm">
                      Locker #{locker?.locker_number || '—'}
                    </span>
                  </div>
                  <Badge className="bg-orange-100 text-orange-700 border border-orange-300 font-mono text-xs">
                    Awaiting Pickup
                  </Badge>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                  <p className="text-green-700 font-mono text-xs mb-1">Access Code</p>
                  <span className="text-green-700 font-mono font-bold text-2xl tracking-[0.3em]">
                    {displayCode}
                  </span>
                </div>

                {cycle.gym_location && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 font-mono mb-1">
                    <MapPin className="w-3 h-3" />
                    <span>{cycle.gym_location}</span>
                  </div>
                )}
                <p className="text-gray-400 text-xs font-mono mb-3">
                  Member: {cycle.user_email}
                </p>

                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-mono text-sm font-bold"
                  onClick={() => confirmPickupMutation.mutate(cycle)}
                  disabled={confirmPickupMutation.isPending}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Pickup · Gear Collected
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}