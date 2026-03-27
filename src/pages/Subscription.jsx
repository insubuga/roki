import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { SUBSCRIPTION_PLANS } from '@/components/subscription/planConfig';
import {
  CreditCard, ArrowLeft, Check, Zap, Lock, Crown, Clock,
  Shield, Star, AlertTriangle, RefreshCw, ArrowUpCircle, ArrowDownCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useConfirmDialog } from '@/components/hooks/useConfirmDialog';

const PLANS = Object.values(SUBSCRIPTION_PLANS).map(plan => ({
  ...plan,
  emergencyCredits: plan.rushDeliveries === 999 ? 3 : 1,
  features: plan.features.map(text => ({ text })),
  accentColor: plan.id === 'priority' ? 'border-green-500' : 'border-border',
}));

const STAT_ITEMS = [
  { key: 'turnaround', label: 'Turnaround', icon: Clock, iconColor: 'text-green-600', getValue: (s) => `${s.laundry_turnaround_hours || 48}h` },
  { key: 'rush', label: 'Rush Deliveries', icon: Zap, iconColor: 'text-orange-500', getValue: (s) => s.rush_deliveries_included === 999 ? 'Unlimited' : `${s.rush_deliveries_included || 1}/mo` },
  { key: 'dispatch', label: 'Dispatch', icon: Shield, iconColor: 'text-purple-500', getValue: (s) => s.priority_dispatch ? 'Priority' : 'Standard' },
  { key: 'credits', label: 'Credits Left', icon: Zap, iconColor: 'text-green-600', getValue: (s) => `${(s.laundry_credits || 1) - (s.laundry_credits_used || 0)} / ${s.laundry_credits || 1}` },
];

export default function Subscription() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();
  const { confirm, Dialog } = useConfirmDialog();
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin());
  }, []);

  // Show toast based on payment redirect result
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('payment') === 'success') {
      toast.success('Subscription activated! Welcome to ROKI.');
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    } else if (params.get('payment') === 'cancelled') {
      toast.info('Checkout cancelled.');
    }
  }, []);

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({ user_email: user.email });
      return subs[0] || null;
    },
    enabled: !!user?.email,
  });

  const selectPlanMutation = useMutation({
    mutationFn: async (planId) => {
      if (window.self !== window.top) {
        toast.error('Checkout only works from the published app — not inside the builder preview.');
        return;
      }
      const response = await base44.functions.invoke('createSubscriptionCheckout', { plan_id: planId });

      // Upgrade/downgrade — no redirect needed
      if (response.data?.upgraded) {
        return response.data;
      }

      // New subscription — redirect to Stripe checkout
      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    },
    onSuccess: (data) => {
      if (data?.upgraded) {
        toast.success(`Plan updated to ${data.plan_id === 'priority' ? 'Priority Readiness' : 'Core Readiness'}!`);
        queryClient.invalidateQueries({ queryKey: ['subscription'] });
      }
    },
    onError: (err) => toast.error('Could not update plan. Please try again.'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => base44.functions.invoke('manageSubscription', { action: 'cancel' }),
    onSuccess: () => {
      toast.success('Subscription will cancel at period end.');
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
    onError: () => toast.error('Failed to cancel subscription'),
  });

  const reactivateMutation = useMutation({
    mutationFn: () => base44.functions.invoke('manageSubscription', { action: 'reactivate' }),
    onSuccess: () => {
      toast.success('Subscription reactivated!');
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
    onError: () => toast.error('Failed to reactivate subscription'),
  });

  const handleCancelClick = async () => {
    const confirmed = await confirm(
      'Cancel Subscription?',
      "Your plan will remain active until the next renewal date, then end. You'll lose access to priority dispatch and emergency credits.",
      'Yes, Cancel Plan',
      true
    );
    if (confirmed) cancelMutation.mutate();
  };

  const handleSelectPlan = async (planId) => {
    const hasActiveSub = subscription?.status === 'active' || subscription?.status === 'canceling';
    const isUpgrade = planId === 'priority' && subscription?.plan === 'core';
    const isDowngrade = planId === 'core' && subscription?.plan === 'priority';

    if (hasActiveSub && (isUpgrade || isDowngrade)) {
      const label = isUpgrade ? 'Upgrade to Priority Readiness?' : 'Downgrade to Core Readiness?';
      const msg = isUpgrade
        ? 'You\'ll be upgraded immediately. Your billing will be prorated for the remainder of this period.'
        : 'You\'ll be downgraded immediately. Your billing will be prorated for the remainder of this period.';
      const confirmed = await confirm(label, msg, isUpgrade ? 'Upgrade Now' : 'Downgrade Now', isDowngrade);
      if (!confirmed) return;
    }

    selectPlanMutation.mutate(planId);
  };

  const currentPlanId = subscription?.plan || null;
  const currentPlanDef = PLANS.find(p => p.id === currentPlanId);
  const isCanceling = subscription?.status === 'canceling';
  const isCanceled = subscription?.status === 'canceled' || !subscription;

  if (!user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Dialog />

      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Link to={createPageUrl('Configuration')}>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground font-mono tracking-tight uppercase">Subscription</h1>
          <p className="text-muted-foreground text-xs font-mono mt-0.5">READINESS COVERAGE · PLAN MANAGEMENT</p>
        </div>
      </div>

      {/* Current Plan Banner */}
      {subscription && subscription.status !== 'canceled' ? (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">Current Plan</p>
              <p className="text-foreground text-3xl font-bold font-mono mt-1 capitalize">
                {currentPlanDef?.name || subscription.plan}
              </p>
              {isCanceling && (
                <Badge className="mt-2 bg-yellow-900/30 text-yellow-500 border border-yellow-700 font-mono text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Cancels {subscription.renewal_date}
                </Badge>
              )}
              {subscription.renewal_date && !isCanceling && (
                <p className="text-muted-foreground text-xs font-mono mt-1">
                  Renews · {new Date(subscription.renewal_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isCanceling ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => reactivateMutation.mutate()}
                  disabled={reactivateMutation.isPending}
                  className="border-green-700 text-green-600 hover:bg-green-950/30 font-mono text-xs"
                >
                  {reactivateMutation.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Reactivate'}
                </Button>
              ) : subscription.stripe_subscription_id ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelClick}
                  disabled={cancelMutation.isPending}
                  className="border-red-700 text-red-500 hover:bg-red-950/30 font-mono text-xs"
                >
                  {cancelMutation.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Cancel Plan'}
                </Button>
              ) : null}
              <div className="w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STAT_ITEMS.map(({ key, label, icon: Icon, iconColor, getValue }) => (
              <div key={key} className="bg-muted/50 rounded-lg p-3 border border-border">
                <Icon className={`w-4 h-4 ${iconColor} mb-2`} />
                <p className="text-foreground font-bold font-mono text-base">{getValue(subscription)}</p>
                <p className="text-muted-foreground font-mono text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-5 text-center">
          <Crown className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-foreground font-mono font-semibold">No active plan</p>
          <p className="text-muted-foreground font-mono text-xs mt-1">Select a plan below to activate your readiness coverage</p>
        </div>
      )}

      {/* Plan Cards */}
      <div>
        <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest mb-4">Available Plans</p>
        <div className="grid md:grid-cols-2 gap-5">
          {PLANS.map((plan) => {
            const isCurrent = currentPlanId === plan.id && subscription?.status !== 'canceled';
            const isActiveAndSame = isCurrent && !isCanceling;
            const hasOtherActivePlan = subscription && subscription.status !== 'canceled' && currentPlanId !== plan.id;
            const isUpgrade = plan.id === 'priority' && hasOtherActivePlan;
            const isDowngrade = plan.id === 'core' && hasOtherActivePlan;
            const isLoading = selectPlanMutation.isPending;

            let btnLabel, btnIcon, btnClass;
            if (isActiveAndSame) {
              btnLabel = 'Current Plan';
              btnClass = 'bg-muted text-muted-foreground cursor-not-allowed';
            } else if (isCurrent && isCanceling) {
              btnLabel = 'Keep This Plan';
              btnClass = 'bg-green-600 hover:bg-green-700 text-white';
            } else if (isUpgrade) {
              btnLabel = 'Upgrade';
              btnIcon = <ArrowUpCircle className="w-4 h-4" />;
              btnClass = 'bg-green-600 hover:bg-green-700 text-white';
            } else if (isDowngrade) {
              btnLabel = 'Downgrade';
              btnIcon = <ArrowDownCircle className="w-4 h-4" />;
              btnClass = 'bg-muted text-foreground hover:bg-muted/80 border border-border';
            } else {
              btnLabel = 'Select Plan';
              btnClass = 'bg-green-600 hover:bg-green-700 text-white';
            }

            return (
              <div
                key={plan.id}
                className={`relative bg-card rounded-xl border-2 ${plan.accentColor} p-6 flex flex-col transition-all ${
                  isActiveAndSame ? 'ring-2 ring-green-600 ring-offset-2 ring-offset-background' : ''
                }`}
              >
                {/* Badges */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-2">
                  {plan.popular && !isActiveAndSame && (
                    <span className="bg-green-500 text-white text-xs font-mono font-bold px-3 py-1 rounded-full shadow">
                      Most Popular
                    </span>
                  )}
                  {isActiveAndSame && (
                    <span className="bg-green-600 text-white text-xs font-mono font-bold px-3 py-1 rounded-full shadow">
                      Current
                    </span>
                  )}
                  {isCurrent && isCanceling && (
                    <span className="bg-yellow-600 text-white text-xs font-mono font-bold px-3 py-1 rounded-full shadow">
                      Canceling
                    </span>
                  )}
                </div>

                {/* Name + Price */}
                <div className="mb-5 mt-2">
                  <h3 className="text-foreground font-bold font-mono text-lg">{plan.name}</h3>
                  <div className="flex items-end gap-1 mt-2">
                    <span className="text-foreground font-bold text-4xl font-mono">${plan.price}</span>
                    <span className="text-muted-foreground font-mono text-sm mb-1">/mo</span>
                  </div>
                </div>

                {/* Feature List */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map(({ text }, idx) => (
                    <li key={idx} className="flex items-center gap-2.5 text-sm">
                      <div className="w-5 h-5 rounded-full bg-green-600/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                      <span className="text-foreground font-mono text-xs">{text}</span>
                    </li>
                  ))}
                </ul>

                {/* Meta row */}
                <div className="flex gap-2 mb-4 flex-wrap">
                  <Badge className="bg-muted text-muted-foreground font-mono text-xs border border-border">
                    {plan.rushDeliveries === 999 ? 'Unlimited' : plan.rushDeliveries} rush/mo
                  </Badge>
                  <Badge className="bg-muted text-muted-foreground font-mono text-xs border border-border">
                    {plan.turnaroundHours}h SLA
                  </Badge>
                  {plan.priorityDispatch && (
                    <Badge className="bg-green-600/20 text-green-600 font-mono text-xs border border-green-700">
                      Priority Dispatch
                    </Badge>
                  )}
                </div>

                {/* CTA */}
                <Button
                  className={`w-full font-mono text-sm font-bold h-11 flex items-center justify-center gap-2 ${btnClass}`}
                  disabled={isActiveAndSame || isLoading}
                  onClick={() => {
                    if (isCurrent && isCanceling) {
                      reactivateMutation.mutate();
                    } else {
                      handleSelectPlan(plan.id);
                    }
                  }}
                >
                  {isLoading && !isActiveAndSame ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : (
                    <>{btnIcon}{btnLabel}</>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer note */}
      <p className="text-center text-muted-foreground font-mono text-xs pb-2">
        Payments are processed securely via Stripe · Cancel anytime · Upgrades are prorated
      </p>
    </div>
  );
}