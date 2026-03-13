import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, CheckCircle2, Lock, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function ReturnLockerLoad({ user }) {
  const queryClient = useQueryClient();

  const { data: readyCycles = [] } = useQuery({
    queryKey: ['driver-ready-cycles'],
    queryFn: () => base44.entities.Cycle.filter({ status: 'ready' }),
    enabled: !!user,
  });

  const { data: returnAssignments = [] } = useQuery({
    queryKey: ['driver-return-assignments-load'],
    queryFn: () => base44.entities.ReturnLockerAssignment.filter({ status: 'assigned' }),
    enabled: readyCycles.length > 0,
  });

  const { data: allLockers = [] } = useQuery({
    queryKey: ['return-lockers-load'],
    queryFn: () => base44.entities.Locker.list(),
    enabled: returnAssignments.length > 0,
  });

  const confirmLoadMutation = useMutation({
    mutationFn: async ({ cycle, assignment }) => {
      await base44.entities.ReturnLockerAssignment.update(assignment.id, {
        status: 'delivered',
      });
      await base44.entities.Locker.update(assignment.locker_id, { status: 'dropped' });
      await base44.entities.Notification.create({
        user_email: cycle.user_email,
        type: 'cycle_ready',
        title: '✅ Clean gear in your locker',
        message: `Order ${cycle.order_number} has been loaded into your return locker. Access code: ${assignment.access_code}. Head to ${cycle.gym_location || 'your gym'} to collect.`,
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

  const cyclesWithAssignment = readyCycles
    .map(cycle => ({
      cycle,
      assignment: returnAssignments.find(a => a.cycle_id === cycle.id),
    }))
    .filter(({ assignment }) => !!assignment);

  if (cyclesWithAssignment.length === 0) return null;

  return (
    <div className="px-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Package className="w-4 h-4 text-blue-600" />
        <h2 className="text-base font-bold text-gray-900 font-mono">Clean Gear — Load Return Lockers</h2>
        <Badge className="bg-blue-600 text-white text-xs">{cyclesWithAssignment.length}</Badge>
      </div>

      <div className="space-y-3">
        {cyclesWithAssignment.map(({ cycle, assignment }) => {
          const locker = allLockers.find(l => l.id === assignment.locker_id);

          return (
            <Card key={cycle.id} className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono font-bold text-gray-900 text-sm">
                    Order #{cycle.order_number}
                  </span>
                  <Badge className="bg-blue-100 text-blue-700 border border-blue-300 font-mono text-xs">
                    Load Pending
                  </Badge>
                </div>

                {/* Return locker code */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <p className="text-blue-700 font-mono text-xs mb-1">Return Locker Code</p>
                  <span className="text-blue-700 font-mono font-bold text-2xl tracking-[0.3em]">
                    {assignment.access_code}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500 font-mono mb-3">
                  <Lock className="w-3 h-3" />
                  <span>Locker #{locker?.locker_number || '—'}</span>
                  {cycle.gym_location && (
                    <>
                      <span>·</span>
                      <MapPin className="w-3 h-3" />
                      <span>{cycle.gym_location}</span>
                    </>
                  )}
                </div>

                <p className="text-xs text-gray-400 font-mono mb-3">Member: {cycle.user_email}</p>

                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-mono text-sm font-bold"
                  onClick={() => confirmLoadMutation.mutate({ cycle, assignment })}
                  disabled={confirmLoadMutation.isPending}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm — Clean Gear Loaded
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}