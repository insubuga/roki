import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { CYCLE_ENHANCEMENTS } from './DispatchAttachments';
import DispatchAttachments from './DispatchAttachments';

const FEATURED = ['att_electrolyte', 'att_protein_shake', 'att_pre_workout'];

export default function CycleEnhancementsBanner({ user, activeCycle }) {
  const [expanded, setExpanded] = useState(false);

  const { data: existingCount = 0 } = useQuery({
    queryKey: ['cycleAttachments', activeCycle?.id],
    queryFn: async () => {
      const logs = await base44.entities.AttachmentLog.filter({ cycle_id: activeCycle.id });
      return logs.filter(l => l.status === 'scheduled').length;
    },
    enabled: !!activeCycle?.id,
  });

  const featuredItems = CYCLE_ENHANCEMENTS.filter(i => FEATURED.includes(i.id));

  // Only show for active cycles before delivery phase
  if (!activeCycle || activeCycle.status === 'ready' || activeCycle.status === 'picked_up') return null;

  return (
    <Card className="bg-gradient-to-br from-green-950/30 to-card border-green-600/40">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-green-500" />
            <div>
              <h3 className="text-foreground font-mono font-semibold text-sm">Enhance Your Return</h3>
              <p className="text-muted-foreground font-mono text-xs">
                {existingCount > 0 ? `${existingCount} item(s) added` : 'Add gear essentials to this cycle'}
              </p>
            </div>
          </div>
          {existingCount > 0 && (
            <span className="w-5 h-5 bg-green-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {existingCount}
            </span>
          )}
        </div>

        {/* Featured trio */}
        {!expanded && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {featuredItems.map(item => (
              <div key={item.id} className="bg-muted/60 rounded-lg p-2 text-center border border-border">
                <span className="text-lg block mb-0.5">{item.emoji}</span>
                <p className="text-foreground font-mono text-[10px] font-semibold leading-tight">{item.name}</p>
                <p className="text-muted-foreground font-mono text-[9px]">{item.category}</p>
              </div>
            ))}
          </div>
        )}

        {/* Expand/collapse full catalog */}
        {expanded && (
          <div className="mt-2 mb-3">
            <DispatchAttachments user={user} activeCycle={activeCycle} embedded={true} />
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full border-green-600/40 text-green-600 hover:bg-green-600/10 font-mono text-xs h-8"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <><ChevronUp className="w-3 h-3 mr-1" />Show Less</>
          ) : (
            <><ChevronDown className="w-3 h-3 mr-1" />View All Enhancements ({CYCLE_ENHANCEMENTS.length})</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}