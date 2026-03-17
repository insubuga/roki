import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ChevronDown, ChevronUp, AlertTriangle, Zap, CheckCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';

export const CYCLE_ENHANCEMENTS = [
  // Recovery
  { id: 'att_fish_oil',       name: 'Fish Oil',         weight_impact: 0.1, load_impact: 2, category: 'Recovery',      emoji: '🐟' },
  { id: 'att_magnesium',      name: 'Magnesium',        weight_impact: 0.1, load_impact: 2, category: 'Recovery',      emoji: '💊' },
  { id: 'att_electrolyte',    name: 'Electrolyte Pack', weight_impact: 0.3, load_impact: 3, category: 'Recovery',      emoji: '⚡' },
  // Workout Fuel
  { id: 'att_protein_shake',  name: 'Protein Shake',    weight_impact: 1.2, load_impact: 8, category: 'Workout Fuel',  emoji: '🥤' },
  { id: 'att_energy_bar',     name: 'Energy Bar',       weight_impact: 0.2, load_impact: 2, category: 'Workout Fuel',  emoji: '🍫' },
  { id: 'att_pre_workout',    name: 'Pre-Workout',      weight_impact: 0.3, load_impact: 3, category: 'Workout Fuel',  emoji: '⚗️' },
  // Gym Essentials
  { id: 'att_grip_chalk',     name: 'Grip Chalk',       weight_impact: 0.1, load_impact: 1, category: 'Gym Essentials', emoji: '🤸' },
  { id: 'att_athletic_tape',  name: 'Athletic Tape',    weight_impact: 0.1, load_impact: 1, category: 'Gym Essentials', emoji: '🩹' },
  { id: 'att_resistance_band',name: 'Resistance Band',  weight_impact: 0.2, load_impact: 2, category: 'Gym Essentials', emoji: '🔴' },
  // Hygiene / Recovery
  { id: 'att_cooling_towel',  name: 'Cooling Towel',    weight_impact: 0.2, load_impact: 2, category: 'Hygiene',       emoji: '🧊' },
  { id: 'att_shower_wipes',   name: 'Shower Wipes',     weight_impact: 0.1, load_impact: 1, category: 'Hygiene',       emoji: '🧴' },
];

const CATEGORIES = ['Recovery', 'Workout Fuel', 'Gym Essentials', 'Hygiene'];

// embedded = true → no card wrapper, always expanded (used inside CycleEnhancementsBanner)
export default function DispatchAttachments({ user, activeCycle, embedded = false }) {
  const [expanded, setExpanded] = useState(embedded);
  const [selectedAttachments, setSelectedAttachments] = useState({});
  const queryClient = useQueryClient();

  const isLocked = !activeCycle || activeCycle.status === 'ready';

  const { data: existingAttachmentsRaw } = useQuery({
    queryKey: ['cycleAttachments', activeCycle?.id],
    queryFn: () => base44.entities.AttachmentLog.filter({ cycle_id: activeCycle.id }),
    enabled: !!activeCycle?.id,
  });

  const existingAttachments = Array.isArray(existingAttachmentsRaw) ? existingAttachmentsRaw : [];

  const attachMutation = useMutation({
    mutationFn: async (selections) => {
      const promises = Object.entries(selections).map(([id, qty]) => {
        const item = CYCLE_ENHANCEMENTS.find(a => a.id === id);
        if (!item || qty === 0) return null;
        return base44.entities.AttachmentLog.create({
          cycle_id: activeCycle.id,
          user_email: user.email,
          attachment_name: item.name,
          quantity: qty,
          weight_impact_kg: parseFloat((item.weight_impact * qty).toFixed(2)),
          route_load_impact: item.load_impact * qty,
          locker_load_impact: Math.ceil(item.load_impact * qty * 0.5),
          dispatch_route_id: `RT${Math.floor(Math.random() * 899) + 100}B`,
          status: 'scheduled',
        });
      }).filter(Boolean);
      return Promise.all(promises);
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries(['cycleAttachments', activeCycle?.id]);
      toast.success(`${results.length} enhancement(s) added to cycle`);
      setSelectedAttachments({});
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const handleQty = (id, delta) => {
    setSelectedAttachments(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, Math.min(5, current + delta));
      if (next === 0) { const { [id]: _, ...rest } = prev; return rest; }
      return { ...prev, [id]: next };
    });
  };

  const totalWeight = Object.entries(selectedAttachments).reduce((s, [id, qty]) => {
    const a = CYCLE_ENHANCEMENTS.find(x => x.id === id);
    return s + (a?.weight_impact || 0) * qty;
  }, 0);
  const totalLoad = Object.entries(selectedAttachments).reduce((s, [id, qty]) => {
    const a = CYCLE_ENHANCEMENTS.find(x => x.id === id);
    return s + (a?.load_impact || 0) * qty;
  }, 0);
  const hasSelections = Object.keys(selectedAttachments).length > 0;
  const scheduled = existingAttachments.filter(a => a.status === 'scheduled');

  const innerContent = (
    <div className={embedded ? '' : 'mt-4 space-y-4 pt-3 border-t border-border'}>
      {/* Already scheduled */}
      {scheduled.length > 0 && (
        <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-3 space-y-1">
          <p className="text-green-600 font-mono text-xs font-bold uppercase flex items-center gap-1.5">
            <CheckCircle className="w-3 h-3" /> {scheduled.length} Enhancement{scheduled.length > 1 ? 's' : ''} Scheduled
          </p>
          {scheduled.map(a => (
            <div key={a.id} className="flex justify-between text-xs">
              <span className="text-foreground font-mono">{a.attachment_name} × {a.quantity}</span>
              <span className="text-muted-foreground font-mono">{a.dispatch_route_id}</span>
            </div>
          ))}
        </div>
      )}

      {isLocked ? (
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <p className="text-muted-foreground font-mono text-xs">
            Enhancements locked — cycle is in delivery phase
          </p>
        </div>
      ) : (
        <>
          {/* Items grouped by category */}
          {CATEGORIES.map(cat => {
            const items = CYCLE_ENHANCEMENTS.filter(i => i.category === cat);
            return (
              <div key={cat}>
                <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest mb-2">{cat}</p>
                <div className="space-y-2">
                  {items.map(item => {
                    const qty = selectedAttachments[item.id] || 0;
                    return (
                      <div key={item.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border bg-muted/30 transition-colors ${qty > 0 ? 'border-green-600/50 bg-green-600/5' : 'border-border'}`}
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <span className="text-base flex-shrink-0">{item.emoji}</span>
                          <div>
                            <p className="text-foreground font-mono text-xs font-semibold">{item.name}</p>
                            <p className="text-muted-foreground font-mono text-[10px]">+{item.weight_impact}kg · load +{item.load_impact}%</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 ml-2">
                          <Button variant="outline" size="icon" className="h-6 w-6 text-xs"
                            onClick={() => handleQty(item.id, -1)} disabled={qty === 0}>−</Button>
                          <span className="text-foreground font-mono font-bold w-4 text-center text-xs">{qty}</span>
                          <Button variant="outline" size="icon" className="h-6 w-6 text-xs"
                            onClick={() => handleQty(item.id, 1)} disabled={qty >= 5}>+</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Impact summary */}
          {hasSelections && (
            <div className="bg-muted rounded-lg p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-mono">Total Weight</span>
                <span className="text-foreground font-mono font-bold">+{totalWeight.toFixed(1)}kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-mono">Route Load</span>
                <span className={`font-mono font-bold ${totalLoad > 20 ? 'text-orange-500' : 'text-green-600'}`}>+{totalLoad}%</span>
              </div>
            </div>
          )}

          {hasSelections && totalLoad > 20 && (
            <div className="flex items-start gap-2 bg-orange-950/20 border border-orange-800/40 rounded-lg p-2">
              <AlertTriangle className="w-3 h-3 text-orange-500 mt-0.5" />
              <p className="text-orange-500 font-mono text-xs">High load — dispatch may be delayed up to 2h</p>
            </div>
          )}

          <Button
            onClick={() => attachMutation.mutate(selectedAttachments)}
            disabled={!hasSelections || attachMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-mono text-xs disabled:opacity-40"
          >
            {attachMutation.isPending ? (
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Adding to Cycle...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Zap className="w-3 h-3" />
                {hasSelections ? `Add ${Object.values(selectedAttachments).reduce((s, n) => s + n, 0)} Item(s) to Cycle` : 'Select Items Above'}
              </span>
            )}
          </Button>
        </>
      )}
    </div>
  );

  if (embedded) return <div className="space-y-3">{innerContent}</div>;

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between text-left">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-green-500" />
            <div>
              <h3 className="text-foreground font-mono font-semibold text-sm uppercase">Cycle Enhancements</h3>
              <p className="text-muted-foreground font-mono text-xs mt-0.5">
                {scheduled.length > 0 ? `${scheduled.length} scheduled` : 'Add items to your return'} · {activeCycle?.order_number || '—'}
              </p>
            </div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {expanded && innerContent}
      </CardContent>
    </Card>
  );
}