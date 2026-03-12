import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export default function ConfirmRouteDeparture({ user }) {
  const queryClient = useQueryClient();

  const { data: resetPendingLockers = [] } = useQuery({
    queryKey: ['reset-pending-lockers'],
    queryFn: () => base44.entities.Locker.filter({ status: 'resetPending' }),
    enabled: !!user,
  });

  const confirmDepartureMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        resetPendingLockers.map((locker) =>
          base44.entities.Locker.update(locker.id, { status: 'available' })
        )
      );
    },
    onSuccess: () => {
      toast.success(`${resetPendingLockers.length} locker(s) released — available for next cycle`);
      queryClient.invalidateQueries({ queryKey: ['reset-pending-lockers'] });
    },
    onError: () => toast.error('Failed to confirm route departure'),
  });

  if (resetPendingLockers.length === 0) return null;

  return (
    <div className="px-4 mb-4">
      <Card className="border-l-4 border-l-yellow-500 bg-yellow-50/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-yellow-600" />
              <span className="font-mono font-bold text-sm text-gray-900">Lockers Awaiting Reset</span>
            </div>
            <Badge className="bg-yellow-500 text-white text-xs">{resetPendingLockers.length}</Badge>
          </div>
          <p className="text-gray-500 font-mono text-xs mb-3">
            Confirm route departure to release picked-up lockers back to the available pool.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {resetPendingLockers.map((l) => (
              <Badge key={l.id} variant="outline" className="font-mono text-xs">
                #{l.locker_number}
              </Badge>
            ))}
          </div>
          <Button
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-mono text-sm font-bold"
            onClick={() => confirmDepartureMutation.mutate()}
            disabled={confirmDepartureMutation.isPending}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {confirmDepartureMutation.isPending ? 'Releasing...' : 'Confirm Route Departure · Release Lockers'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}