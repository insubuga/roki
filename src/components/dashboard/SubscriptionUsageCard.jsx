import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Zap, Calendar, RotateCcw } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';

export default function SubscriptionUsageCard({ subscription }) {
  if (!subscription) return null;

  const creditsUsed = subscription.laundry_credits_used || 0;
  const creditsTotal = subscription.laundry_credits || 4;
  const creditsRemaining = Math.max(0, creditsTotal - creditsUsed);
  const creditsPct = Math.round((creditsUsed / creditsTotal) * 100);

  const rushUsed = subscription.rush_deliveries_used || 0;
  const rushTotal = subscription.rush_deliveries_included || 0;
  const rushRemaining = Math.max(0, rushTotal - rushUsed);

  const renewalDateStr = subscription.renewal_date || 
    (subscription.created_date ? new Date(new Date(subscription.created_date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null);
  const daysUntilRenewal = renewalDateStr
    ? Math.max(0, differenceInDays(parseISO(renewalDateStr), new Date()))
    : null;

  const planLabel = subscription.plan === 'priority' ? 'PRIORITY' : 'CORE';
  const planColor = subscription.plan === 'priority' ? 'bg-orange-600' : 'bg-blue-600';

  const barColor = creditsPct > 80 ? 'bg-red-500' : creditsPct > 60 ? 'bg-orange-500' : 'bg-green-600';

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-foreground font-mono font-semibold text-sm uppercase">Cycle Credits</h3>
          </div>
          <Badge className={`${planColor} text-white font-mono text-xs`}>{planLabel}</Badge>
        </div>

        {/* Credits usage bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground font-mono">
              {creditsRemaining} remaining
            </span>
            <span className="text-foreground font-mono font-bold">{creditsUsed} / {creditsTotal} used</span>
          </div>
          <div className="bg-muted rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${Math.min(100, creditsPct)}%` }}
            />
          </div>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-muted rounded-lg p-2 text-center">
            <RotateCcw className="w-3 h-3 text-green-600 mx-auto mb-1" />
            <p className="text-foreground font-bold font-mono">{creditsRemaining}</p>
            <p className="text-muted-foreground font-mono leading-tight">Credits Left</p>
          </div>
          <div className="bg-muted rounded-lg p-2 text-center">
            <Zap className="w-3 h-3 text-orange-600 mx-auto mb-1" />
            <p className="text-foreground font-bold font-mono">{rushTotal > 0 ? rushRemaining : '—'}</p>
            <p className="text-muted-foreground font-mono leading-tight">Rush Left</p>
          </div>
          <div className="bg-muted rounded-lg p-2 text-center">
            <Calendar className="w-3 h-3 text-blue-600 mx-auto mb-1" />
            <p className="text-foreground font-bold font-mono">{daysUntilRenewal !== null ? `${daysUntilRenewal}d` : '—'}</p>
            <p className="text-muted-foreground font-mono leading-tight">Renewal</p>
          </div>
        </div>

        {creditsRemaining === 0 && (
          <div className="mt-3 bg-red-600/10 border border-red-600/30 rounded-lg p-2 space-y-1">
            <p className="text-red-600 font-mono text-xs font-bold text-center">NO CREDITS REMAINING</p>
            <p className="text-muted-foreground font-mono text-xs text-center">
              {renewalDateStr
                ? daysUntilRenewal === 0
                  ? 'Credits renew today!'
                  : `Credits renew ${format(parseISO(renewalDateStr), 'MMMM d, yyyy')}`
                : 'Upgrade your plan to get more credits'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}