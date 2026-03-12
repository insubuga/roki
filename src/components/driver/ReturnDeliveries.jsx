import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Lock, KeyRound, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

function generateCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default function ReturnDeliveries({ user }) {
  const queryClient = useQueryClient();

  // GarmentBatches that are ready but have no return assignment yet
  const { data: readyBatches = [] } = useQuery({
    queryKey: ['ready-batches'],
    queryFn: () => base44.entities.GarmentBatch.filter({ processing_status: 'ready' }),
    enabled: !!user,
  });

  // Existing return assignments assigned to driver (status: assigned)
  const { data: returnAssignments = [] } = useQuery({
    queryKey: ['return-assignments'],
    queryFn: () => base44.entities.ReturnLockerAssignment.filter({ status: 'assigned' }),
    enabled: !!user,
  });

  const { data: availableLockers = [] } = useQuery({
    queryKey: ['available-lockers-return'],
    queryFn: () => base44.entities.Locker.filter({ status: 'available' }),
    enabled: !!user,
  });

  const { data: lockers = [] } = useQuery({
    queryKey: ['all-lockers-return'],
    queryFn: () => base44.entities.Locker.list(),
    enabled: returnAssignments.length > 0,
  });

  const assignReturnMutation = useMutation({
    mutationFn: async (batch) => {
      const locker = availableLockers[0];
      if (!locker) throw new Error('No lockers available');
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24hr

      await base44.entities.ReturnLockerAssignment.create({
        cycle_id: batch.cycle_id,
        locker_id: locker.id,
        user_email: batch.user_email,
        access_code: code,
        assigned_at: new Date().toISOString(),
        expires_at: expiresAt,
        status: 'assigned',
      });

      await base44.entities.Locker.update(locker.id, { status: 'softReserved' });

      // Notify member
      await base44.integrations.Core.SendEmail({
        to: batch.user_email,
        subject: 'Your Clean Gear Is Ready 🎉',
        body: `Your laundry is clean and ready for pickup!\n\nLocker: #${locker.locker_number}\nAccess Code: ${code}\n\nYour driver will deliver it shortly.`,
      });
    },
    onSuccess: () => {
      toast.success('Return locker assigned · Member notified');
      queryClient.invalidateQueries({ queryKey: ['ready-batches', 'return-assignments', 'available-lockers-return'] });
    },
    onError: (e) => toast.error(e.message || 'Failed to assign return locker'),
  });

  const confirmDeliveryMutation = useMutation({
    mutationFn: async (assignment) => {
      await base44.entities.ReturnLockerAssignment.update(assignment.id, { status: 'delivered' });
      const locker = lockers.find((l) => l.id === assignment.locker_id);
      if (locker) {
        await base44.entities.Locker.update(locker.id, { status: 'dropped' }); // gear is in locker, waiting for member
      }
    },
    onSuccess: () => {
      toast.success('Return delivery confirmed · Member can now collect');
      queryClient.invalidateQueries({ queryKey: ['return-assignments'] });
    },
    onError: () => toast.error('Failed to confirm return delivery'),
  });

  const hasWork = readyBatches.length > 0 || returnAssignments.length > 0;
  if (!hasWork) return null;

  return (
    <div className="px-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Package className="w-4 h-4 text-blue-600" />
        <h2 className="text-base font-bold text-gray-900 font-mono">Return Deliveries</h2>
        <Badge className="bg-blue-600 text-white text-xs">{readyBatches.length + returnAssignments.length}</Badge>
      </div>

      <div className="space-y-3">
        {/* Ready batches needing locker assignment */}
        {readyBatches.map((batch) => (
          <Card key={batch.id} className="border-l-4 border-l-blue-400">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-sm text-gray-900">Batch Ready</span>
                <Badge className="bg-blue-100 text-blue-700 border border-blue-300 font-mono text-xs">
                  {batch.item_count} items
                </Badge>
              </div>
              <p className="text-gray-500 font-mono text-xs mb-3">Member: {batch.user_email}</p>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-mono text-sm font-bold"
                onClick={() => assignReturnMutation.mutate(batch)}
                disabled={assignReturnMutation.isPending || availableLockers.length === 0}
              >
                <Lock className="w-4 h-4 mr-2" />
                {availableLockers.length === 0 ? 'No Lockers Available' : 'Assign Return Locker'}
              </Button>
            </CardContent>
          </Card>
        ))}

        {/* Assigned returns ready for driver delivery */}
        {returnAssignments.map((assignment) => {
          const locker = lockers.find((l) => l.id === assignment.locker_id);
          return (
            <Card key={assignment.id} className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-purple-600" />
                    <span className="font-mono font-bold text-sm text-gray-900">
                      Deliver to Locker #{locker?.locker_number || '—'}
                    </span>
                  </div>
                  <Badge className="bg-purple-100 text-purple-700 border border-purple-300 font-mono text-xs">
                    Return
                  </Badge>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                  <p className="text-purple-700 font-mono text-xs mb-1">Locker Code</p>
                  <span className="text-purple-700 font-mono font-bold text-2xl tracking-[0.3em]">
                    {assignment.access_code}
                  </span>
                </div>
                <p className="text-gray-500 font-mono text-xs mb-3">Member: {assignment.user_email}</p>
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-mono text-sm font-bold"
                  onClick={() => confirmDeliveryMutation.mutate(assignment)}
                  disabled={confirmDeliveryMutation.isPending}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Gear Delivered to Locker
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}