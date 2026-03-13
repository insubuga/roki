import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { SUBSCRIPTION_PLANS } from '@/components/subscription/planConfig';
import {
  CreditCard, ArrowLeft, Check, Zap, Lock, Crown, Clock,
  Shield, Package, Shirt, Star, AlertTriangle, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const PLANS = Object.values(SUBSCRIPTION_PLANS).map(plan => ({
  ...plan,
  laundryTurnaround: plan.turnaroundHours,
  sneakerCleaningDiscount: plan.sneakerCleaningDiscount,
  premiumSneaker: plan.premiumSneakerCleaning,
  rushDeliveries: plan.rushDeliveries,
  rushFee: plan.rushDeliveryFee,
  emergencyCredits: plan.rushDeliveries === 999 ? 3 : 1,
  features: plan.features.map(text => ({
    text,
    icon: text.includes('turnaround') ? Clock : 
          text.includes('rush') ? Zap :
          text.includes('dispatch') ? Shield :
          text.includes('locker') ? Lock :
          text.includes('Sneaker') ? Star :
          Crown
  })),
  accentColor: plan.id === 'core' ? 'border-green-600' : 'border-green-500',
  badgeBg: plan.id === 'core' ? 'bg-green-600' : 'bg-green-500',
}));

const STAT_ITEMS = [
  {
    key: 'turnaround',
    label: 'Laundry Turnaround',
    icon: Clock,
    iconColor: 'text-green-600',
    getValue: (sub) => `${sub.laundry_turnaround_hours || 48}h`,
  },
  {
    key: 'rush',
    label: 'Rush Deliveries',
    icon: Zap,
    iconColor: 'text-orange-500',
    getValue: (sub) => sub.rush_deliveries_included === 999 ? 'Unlimited' : `${sub.rush_deliveries_included || 1}/mo`,
  },
  {
    key: 'dispatch',
    label: 'Priority Dispatch',
    icon: Shield,
    iconColor: 'text-purple-500',
    getValue: (sub) => sub.priority_dispatch ? 'Active' : 'Standard',
  },
  {
    key: 'credits',
    label: 'Emergency Credits',
    icon: Zap,
    iconColor: 'text-green-600',
    getValue: (sub) => {
      const used = sub.laundry_credits_used || 0;
      const total = sub.laundry_credits || 1;
      return `${total - used} / ${total}`;
    },
  },
];

export default function Subscription() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin());
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
      const response = await base44.functions.invoke('createSubscriptionCheckout', { plan_id: planId });
      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    },
    onError: () => toast.error('Could not initiate checkout. Please try again.'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => base44.functions.invoke('manageSubscription', { action: 'cancel' }),
    onSuccess: () => {
      toast.success('Subscription will cancel at period end');
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
    onError: () => toast.error('Failed to cancel subscription'),
  });

  const currentPlanId = subscription?.plan || null;
  const currentPlanDef = PLANS.find(p => p.id === currentPlanId);

  if (!user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Link to="/Configuration">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground font-mono tracking-tight uppercase">
            Subscription
          </h1>
          <p className="text-muted-foreground text-xs font-mono mt-0.5">
            READINESS COVERAGE · PLAN MANAGEMENT
          </p>
        </div>
      </div>

      {/* Current Plan Banner */}
      {subscription ? (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">Current Plan</p>
              <p className="text-foreground text-3xl font-bold font-mono mt-1 capitalize">
                {currentPlanDef?.name || subscription.plan}
              </p>
              {subscription.status === 'canceling' && (
                <Badge className="mt-2 bg-yellow-900/30 text-yellow-500 border border-yellow-700 font-mono text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Cancels {subscription.renewal_date}
                </Badge>
              )}
              {subscription.renewal_date && subscription.status === 'active' && (
                <p className="text-muted-foreground text-xs font-mono mt-1">
                  Renews · {new Date(subscription.renewal_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {subscription.stripe_subscription_id && subscription.status !== 'canceling' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  className="border-red-700 text-red-500 hover:bg-red-950/30 font-mono text-xs"
                >
                  {cancelMutation.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Cancel Plan'}
                </Button>
              )}
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
            const isCurrent = currentPlanId === plan.id;
            const isLoading = selectPlanMutation.isPending;

            return (
              <div
                key={plan.id}
                className={`relative bg-card rounded-xl border-2 ${plan.accentColor} p-6 flex flex-col transition-all ${
                  isCurrent ? 'ring-2 ring-green-600 ring-offset-2 ring-offset-background' : ''
                }`}
              >
                {/* Badges */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-2">
                  {plan.popular && !isCurrent && (
                    <span className={`${plan.badgeBg} text-white text-xs font-mono font-bold px-3 py-1 rounded-full shadow`}>
                      Most Popular
                    </span>
                  )}
                  {isCurrent && (
                    <span className="bg-green-600 text-white text-xs font-mono font-bold px-3 py-1 rounded-full shadow">
                      Current
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
                  {plan.features.map(({ text, icon: Icon }, idx) => (
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
                    {plan.emergencyCredits} emergency credit{plan.emergencyCredits > 1 ? 's' : ''}/mo
                  </Badge>
                  <Badge className="bg-muted text-muted-foreground font-mono text-xs border border-border">
                    {plan.laundryTurnaround}h SLA
                  </Badge>
                  {plan.priorityDispatch && (
                    <Badge className="bg-green-600/20 text-green-600 font-mono text-xs border border-green-700">
                      Priority Dispatch
                    </Badge>
                  )}
                </div>

                {/* CTA */}
                <Button
                  className={`w-full font-mono text-sm font-bold h-11 ${
                    isCurrent
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                  disabled={isCurrent || isLoading}
                  onClick={() => selectPlanMutation.mutate(plan.id)}
                >
                  {isLoading && !isCurrent ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Redirecting...
                    </span>
                  ) : isCurrent ? (
                    'Current Plan'
                  ) : (
                    'Select Plan'
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer note */}
      <p className="text-center text-muted-foreground font-mono text-xs pb-2">
        Payments are processed securely via Stripe · Cancel anytime
      </p>
    </div>
  );
}