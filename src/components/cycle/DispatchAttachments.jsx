import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, ChevronDown, ChevronUp, AlertTriangle, Zap, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const DISPATCH_ATTACHMENTS = [
  { id: 'att_fish_oil', name: 'Fish Oil', weight_impact: 0.3, load_impact: 3, category: 'recovery' },
  { id: 'att_protein_shake', name: 'Protein Shake', weight_impact: 1.2, load_impact: 12, category: 'protein' },
  { id: 'att_electrolyte_pack', name: 'Electrolyte Pack', weight_impact: 0.5, load_impact: 5, category: 'hydration' },
  { id: 'att_pre_workout', name: 'Pre-Workout', weight_impact: 0.4, load_impact: 4, category: 'protein' },
];

export default function DispatchAttachments({ user, activeCycle }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState({});
  const queryClient = useQueryClient();

  const { data: existingAttachments = [] } = useQuery({
    queryKey: ['cycleAttachments', activeCycle?.id],
    queryFn: () => base44.entities.AttachmentLog.filter({ cycle_id: activeCycle.id }),
    enabled: !!activeCycle?.id,
  });

  const attachMutation = useMutation({
    mutationFn: async (selections) => {
      // Fire all attachment creates in parallel
      const promises = Object.entries(selections).map(([id, qty]) => {
        const attachment = DISPATCH_ATTACHMENTS.find(a => a.id === id);
        if (!attachment || qty === 0) return null;
        return base44.entities.AttachmentLog.create({
          cycle_id: activeCycle.id,
          user_email: user.email,
          attachment_name: attachment.name,
          quantity: qty,
          weight_impact_kg: parseFloat((attachment.weight_impact * qty).toFixed(2)),
          route_load_impact: attachment.load_impact * qty,
          locker_load_impact: Math.ceil(attachment.load_impact * qty * 0.5),
          dispatch_route_id: `RT${Math.floor(Math.random() * 899) + 100}B`,
          status: 'scheduled',
        });
      }).filter(Boolean);

      return Promise.all(promises);
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries(['cycleAttachments', activeCycle?.id]);
      toast.success(`${results.length} attachment(s) linked to cycle ${activeCycle.order_number}`);
      setSelectedAttachments({});
    },
    onError: (error) => {
      toast.error(`Attachment failed: ${error.message}`);
    },
  });

  const handleQuantityChange = (attachmentId, delta) => {
    setSelectedAttachments(prev => {
      const current = prev[attachmentId] || 0;
      const newValue = Math.max(0, Math.min(5, current + delta));
      if (newValue === 0) {
        const { [attachmentId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [attachmentId]: newValue };
    });
  };

  const totalSelectedWeight = Object.entries(selectedAttachments).reduce((sum, [id, qty]) => {
    const a = DISPATCH_ATTACHMENTS.find(x => x.id === id);
    return sum + (a?.weight_impact || 0) * qty;
  }, 0);

  const totalLoadImpact = Object.entries(selectedAttachments).reduce((sum, [id, qty]) => {
    const a = DISPATCH_ATTACHMENTS.find(x => x.id === id);
    return sum + (a?.load_impact || 0) * qty;
  }, 0);

  const hasSelections = Object.keys(selectedAttachments).length > 0;
  const alreadyScheduled = existingAttachments.filter(a => a.status === 'scheduled');

  if (!activeCycle) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-4 text-center">
          <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-xs font-mono uppercase">
            Attachments require an active cycle.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        {/* Header toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <Package className="w-4 h-4 text-muted-foreground" />
            <div>
              <h3 className="text-foreground font-mono font-semibold text-sm uppercase">
                Dispatch Attachments
              </h3>
              <div className="flex items-center gap-3 mt-1 text-xs">
                <span className="text-muted-foreground font-mono">
                  Status: {alreadyScheduled.length > 0 ? `${alreadyScheduled.length} Scheduled` : 'None'}
                </span>
                <span className="text-muted-foreground font-mono">
                  Cycle: {activeCycle.order_number}
                </span>
              </div>
            </div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {/* Expanded */}
        {expanded && (
          <div className="mt-4 space-y-3 pt-3 border-t border-border">

            {/* Already scheduled */}
            {alreadyScheduled.length > 0 && (
              <div className="bg-green-600/10 border border-green-600/30 rounded p-3 space-y-1">
                <p className="text-green-600 font-mono text-xs font-bold uppercase flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Scheduled Attachments
                </p>
                {alreadyScheduled.map(a => (
                  <div key={a.id} className="flex justify-between text-xs">
                    <span className="text-foreground font-mono">{a.attachment_name} × {a.quantity}</span>
                    <span className="text-muted-foreground font-mono">{a.dispatch_route_id}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Attachment list */}
            <div className="space-y-2">
              {DISPATCH_ATTACHMENTS.map(attachment => {
                const selectedQty = selectedAttachments[attachment.id] || 0;
                return (
                  <div
                    key={attachment.id}
                    className={`flex items-center justify-between p-3 rounded-lg border bg-muted/30 transition-colors ${
                      selectedQty > 0 ? 'border-green-600/50' : 'border-border'
                    }`}
                  >
                    <div className="flex-1">
                      <p className="text-foreground font-mono text-sm font-semibold">{attachment.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-muted text-muted-foreground font-mono text-xs">
                          +{attachment.weight_impact}kg
                        </Badge>
                        <span className="text-muted-foreground font-mono text-xs">
                          Load: +{attachment.load_impact}%/unit
                        </span>
                        <Badge className="bg-muted text-muted-foreground font-mono text-xs capitalize">
                          {attachment.category}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-3">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleQuantityChange(attachment.id, -1)}
                        disabled={selectedQty === 0}
                      >
                        -
                      </Button>
                      <span className="text-foreground font-mono font-bold w-4 text-center text-sm">
                        {selectedQty}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleQuantityChange(attachment.id, 1)}
                        disabled={selectedQty >= 5}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Impact preview */}
            {hasSelections && (
              <div className="bg-muted rounded p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-mono">Total Weight</span>
                  <span className="text-foreground font-mono font-bold">+{totalSelectedWeight.toFixed(1)}kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-mono">Route Load Impact</span>
                  <span className={`font-mono font-bold ${totalLoadImpact > 20 ? 'text-orange-600' : 'text-green-600'}`}>
                    +{totalLoadImpact}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-mono">SLA Impact</span>
                  <span className="text-green-600 font-mono font-bold">+0h</span>
                </div>
              </div>
            )}

            {/* High load warning (non-blocking) */}
            {hasSelections && totalLoadImpact > 20 && (
              <div className="bg-orange-950/20 border border-orange-800/50 rounded p-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-3 h-3 text-orange-500 mt-0.5" />
                  <p className="text-orange-500 font-mono text-xs">
                    High route load impact. Dispatch may be delayed by up to 2h.
                  </p>
                </div>
              </div>
            )}

            {/* Attach button */}
            <Button
              onClick={() => attachMutation.mutate(selectedAttachments)}
              disabled={!hasSelections || attachMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-mono text-xs disabled:opacity-40"
            >
              {attachMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  LINKING TO CYCLE...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Zap className="w-3 h-3" />
                  {hasSelections
                    ? `ATTACH TO CYCLE ${activeCycle.order_number}`
                    : 'SELECT ATTACHMENTS ABOVE'}
                </span>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}