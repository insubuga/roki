import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, ChevronDown, ChevronUp, AlertTriangle, Zap } from 'lucide-react';
import { toast } from 'sonner';

// Curated attachment list with weight/load impact
const DISPATCH_ATTACHMENTS = [
  { id: 'att_fish_oil', name: 'Fish Oil', weight_impact: 0.3, category: 'hydration' },
  { id: 'att_protein_shake', name: 'Protein Shake', weight_impact: 1.2, category: 'protein' },
  { id: 'att_electrolyte_pack', name: 'Electrolyte Pack', weight_impact: 0.5, category: 'hydration' },
];

export default function DispatchAttachments({ user, activeCycle, routeLoad, lockerCapacity }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState({});
  const queryClient = useQueryClient();

  // Fetch existing attachments for this cycle
  const { data: existingAttachments = [] } = useQuery({
    queryKey: ['cycleAttachments', activeCycle?.id],
    queryFn: async () => {
      if (!activeCycle?.id) return [];
      const logs = await base44.entities.AttachmentLog.filter({
        cycle_id: activeCycle.id,
      });
      return logs;
    },
    enabled: !!activeCycle?.id && !!user?.email,
  });

  const attachMutation = useMutation({
    mutationFn: async ({ attachment, quantity }) => {
      const totalWeight = attachment.weight_impact * quantity;
      const newRouteLoad = routeLoad + (totalWeight * 10); // Scale impact
      const newLockerLoad = lockerCapacity + (totalWeight * 5); // Scale impact

      // Validate capacity
      if (newRouteLoad > 95) {
        throw new Error('Route Saturation Risk: Load exceeds threshold');
      }
      if (newLockerLoad > 100) {
        throw new Error('Locker Node Capacity exceeded');
      }

      // Create attachment log linked to cycle
      await base44.entities.AttachmentLog.create({
        cycle_id: activeCycle.id,
        user_email: user.email,
        attachment_name: attachment.name,
        quantity: quantity,
        weight_impact_kg: totalWeight,
        route_load_impact: newRouteLoad - routeLoad,
        locker_load_impact: newLockerLoad - lockerCapacity,
        dispatch_route_id: `RT${Math.floor(Math.random() * 899) + 100}B`,
        status: 'scheduled',
      });

      return { attachment, quantity, newRouteLoad, newLockerLoad };
    },
    onSuccess: ({ attachment, quantity, newRouteLoad, newLockerLoad }) => {
      queryClient.invalidateQueries(['cycleAttachments']);
      toast.success(`Attachment Linked to Cycle ID ${activeCycle.order_number} — Route ${Math.floor(Math.random() * 899) + 100}B`);
      
      if (newRouteLoad > 85) {
        toast.warning('Route Saturation Risk: Load approaching threshold', {
          duration: 5000,
        });
      }
      
      setSelectedAttachments({});
      setExpanded(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Attachment failed');
    },
  });

  const handleQuantityChange = (attachmentId, delta) => {
    setSelectedAttachments(prev => {
      const current = prev[attachmentId] || 0;
      const newValue = Math.max(0, Math.min(3, current + delta));
      if (newValue === 0) {
        const { [attachmentId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [attachmentId]: newValue };
    });
  };

  const totalSelectedWeight = Object.entries(selectedAttachments).reduce((sum, [id, qty]) => {
    const attachment = DISPATCH_ATTACHMENTS.find(a => a.id === id);
    return sum + (attachment?.weight_impact || 0) * qty;
  }, 0);

  const attachmentCount = existingAttachments.length;
  const nextDispatchRoute = `RT${Math.floor(Math.random() * 899) + 100}B`;

  const hasCapacity = routeLoad < 90 && lockerCapacity < 90;

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
        {/* Collapsed View */}
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
                  Status: {attachmentCount > 0 ? `${attachmentCount} Scheduled` : 'None'}
                </span>
                <span className="text-muted-foreground font-mono">
                  Next Route: {nextDispatchRoute}
                </span>
              </div>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {/* Expanded View */}
        {expanded && (
          <div className="mt-4 space-y-3 pt-3 border-t border-border">
            {!hasCapacity && (
              <div className="bg-red-950/20 border border-red-800/50 rounded p-2 mb-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-red-500 font-mono text-xs font-bold">CAPACITY EXCEEDED</p>
                    <p className="text-muted-foreground font-mono text-xs">
                      Route capacity ({routeLoad}%) or locker space ({lockerCapacity}%) insufficient
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Attachment List */}
            <div className="space-y-2">
              {DISPATCH_ATTACHMENTS.map(attachment => {
                const selectedQty = selectedAttachments[attachment.id] || 0;
                const estimatedLoad = attachment.weight_impact * 10;
                
                return (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex-1">
                      <p className="text-foreground font-mono text-sm font-semibold">
                        {attachment.name}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge className="bg-muted text-muted-foreground font-mono text-xs">
                          +{attachment.weight_impact}kg
                        </Badge>
                        <span className="text-muted-foreground font-mono text-xs">
                          Load: +{estimatedLoad}%
                        </span>
                        {hasCapacity ? (
                          <Badge className="bg-green-600/20 text-green-600 font-mono text-xs">
                            ✓ Eligible
                          </Badge>
                        ) : (
                          <Badge className="bg-red-600/20 text-red-600 font-mono text-xs">
                            ✗ Over Capacity
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={() => handleQuantityChange(attachment.id, -1)}
                        disabled={selectedQty === 0}
                      >
                        -
                      </Button>
                      <span className="text-foreground font-mono font-bold w-4 text-center">
                        {selectedQty}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={() => handleQuantityChange(attachment.id, 1)}
                        disabled={selectedQty >= 3}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Impact Preview */}
            {Object.keys(selectedAttachments).length > 0 && (
              <div className="bg-muted rounded p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-mono">Total Weight</span>
                  <span className="text-foreground font-mono font-bold">
                    +{totalSelectedWeight.toFixed(1)}kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-mono">Route Load Impact</span>
                  <span className={`font-mono font-bold ${
                    routeLoad + (totalSelectedWeight * 10) > 85 ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {routeLoad}% → {Math.round(routeLoad + (totalSelectedWeight * 10))}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-mono">Locker Load Impact</span>
                  <span className="text-foreground font-mono font-bold">
                    {lockerCapacity}% → {Math.round(lockerCapacity + (totalSelectedWeight * 5))}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-mono">SLA Impact</span>
                  <span className="text-green-600 font-mono font-bold">+0h</span>
                </div>
              </div>
            )}

            {/* Attach Button */}
            {Object.keys(selectedAttachments).length > 0 && (
              <Button
                onClick={() => {
                  Object.entries(selectedAttachments).forEach(([id, qty]) => {
                    const attachment = DISPATCH_ATTACHMENTS.find(a => a.id === id);
                    if (attachment) {
                      attachMutation.mutate({ attachment, quantity: qty });
                    }
                  });
                }}
                disabled={!hasCapacity || attachMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-mono text-xs"
              >
                {attachMutation.isPending ? (
                  'LINKING...'
                ) : (
                  <>
                    <Zap className="w-3 h-3 mr-2" />
                    ATTACH TO CYCLE {activeCycle.order_number}
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}