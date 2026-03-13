import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, ChevronRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_TRANSITIONS = {
  awaiting_pickup: 'washing',
  washing: 'drying',
  drying: 'ready',
};

const STATUS_LABELS = {
  awaiting_pickup: 'Awaiting Pickup',
  washing: 'Washing',
  drying: 'Drying',
  ready: 'Ready',
};

const STATUS_COLORS = {
  awaiting_pickup: 'bg-blue-600',
  washing: 'bg-purple-600',
  drying: 'bg-orange-500',
};

export default function BulkCycleProcessor() {
  const queryClient = useQueryClient();
  const [advancing, setAdvancing] = useState(null);

  const { data: allCycles = [], isLoading, refetch } = useQuery({
    queryKey: ['bulk-all-cycles'],
    queryFn: () => base44.entities.Cycle.filter({
      status: { $in: ['awaiting_pickup', 'washing', 'drying'] }
    }),
  });

  const grouped = Object.keys(STATUS_TRANSITIONS).reduce((acc, status) => {
    acc[status] = allCycles.filter(c => c.status === status);
    return acc;
  }, {});

  const advanceBatch = async (fromStatus) => {
    const toStatus = STATUS_TRANSITIONS[fromStatus];
    const cycles = grouped[fromStatus];
    if (!cycles.length) return;

    setAdvancing(fromStatus);
    try {
      await Promise.all(cycles.map(c => base44.entities.Cycle.update(c.id, { status: toStatus })));
      toast.success(`${cycles.length} cycle${cycles.length !== 1 ? 's' : ''} advanced → ${STATUS_LABELS[toStatus]}`);
      queryClient.invalidateQueries({ queryKey: ['bulk-all-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['allActiveLaundry'] });
    } catch (e) {
      toast.error('Batch advance failed');
    } finally {
      setAdvancing(null);
    }
  };

  const totalCycles = allCycles.length;

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Zap className="w-5 h-5 text-yellow-400" />
            Bulk Cycle Processor
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="bg-gray-600 text-gray-200 font-mono text-xs">
              {totalCycles} active
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              className="h-7 w-7 text-gray-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="text-center py-4">
            <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          Object.keys(STATUS_TRANSITIONS).map(status => {
            const count = grouped[status]?.length || 0;
            const nextStatus = STATUS_TRANSITIONS[status];
            const isAdvancing = advancing === status;

            return (
              <div key={status} className="flex items-center justify-between bg-gray-700 rounded-xl p-3 gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Badge className={`${STATUS_COLORS[status]} text-white font-mono text-sm min-w-[2rem] justify-center`}>
                    {count}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-mono font-semibold truncate">{STATUS_LABELS[status]}</p>
                    <div className="flex items-center gap-1 text-gray-400 text-xs font-mono">
                      <span>Advance to</span>
                      <ChevronRight className="w-3 h-3" />
                      <span className="text-yellow-400">{STATUS_LABELS[nextStatus]}</span>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-mono text-xs font-bold shrink-0"
                  onClick={() => advanceBatch(status)}
                  disabled={count === 0 || !!advancing}
                >
                  {isAdvancing ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    `ADVANCE ${count > 0 ? `(${count})` : ''}`
                  )}
                </Button>
              </div>
            );
          })
        )}

        {!isLoading && totalCycles === 0 && (
          <p className="text-gray-400 text-sm font-mono text-center py-4">
            No cycles currently in processing pipeline
          </p>
        )}
      </CardContent>
    </Card>
  );
}