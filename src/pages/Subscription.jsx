import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { CreditCard, ArrowLeft, Check, Zap, Shirt, Lock, Crown, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const plans = [
  {
    id: 'basic',
    name: 'Core Readiness',
    price: 39,
    laundryCredits: 5,
    laundryTurnaround: 48,
    sneakerCleaning: 30,
    premiumSneaker: false,
    rushDeliveries: 1,
    rushFee: 12,
    priorityDispatch: false,
    features: [
      'Clean workout gear guaranteed',
      '48h turnaround',
      '1 emergency rush per month',
      'Locker or pickup logistics',
      'Sneaker care included',
    ],
    color: 'border-blue-300',
    buttonClass: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md',
  },
  {
    id: 'pro',
    name: 'Priority Readiness',
    price: 59,
    popular: true,
    laundryCredits: 10,
    laundryTurnaround: 24,
    sneakerCleaning: 50,
    premiumSneaker: false,
    rushDeliveries: 999,
    rushFee: 0,
    priorityDispatch: true,
    features: [
      '24h turnaround',
      'Unlimited rush deliveries',
      'Priority dispatch',
      'Premium locker zones',
      'Personal readiness assistant',
    ],
    color: 'border-green-300',
    buttonClass: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md',
  },
];

export default function Subscription() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({ user_email: user?.email });
      return subs[0] || null;
    },
    enabled: !!user?.email,
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async (planId) => {
      // Redirect to Stripe checkout for all plans
      const response = await base44.functions.invoke('createSubscriptionCheckout', {
        plan_id: planId
      });
      
      if (response.data.url) {
        window.location.href = response.data.url;
      }
      return null;
      
      if (subscription) {
        return base44.entities.Subscription.update(subscription.id, {
          plan: planId,
          monthly_price: plan.price,
          laundry_credits: plan.laundryCredits,
          laundry_credits_used: 0,
          laundry_turnaround_hours: plan.laundryTurnaround,
          premium_sneaker_cleaning: plan.premiumSneaker,
          sneaker_cleaning_discount: plan.sneakerCleaning,
          rush_deliveries_included: plan.rushDeliveries,
          rush_deliveries_used: 0,
          rush_delivery_fee: plan.rushFee,
          priority_dispatch: plan.priorityDispatch,
          priority_locker: planId !== 'free',
        });
      } else {
        return base44.entities.Subscription.create({
          user_email: user.email,
          plan: planId,
          monthly_price: plan.price,
          laundry_credits: plan.laundryCredits,
          laundry_credits_used: 0,
          laundry_turnaround_hours: plan.laundryTurnaround,
          premium_sneaker_cleaning: plan.premiumSneaker,
          sneaker_cleaning_discount: plan.sneakerCleaning,
          rush_deliveries_included: plan.rushDeliveries,
          rush_deliveries_used: 0,
          rush_delivery_fee: plan.rushFee,
          priority_dispatch: plan.priorityDispatch,
          priority_locker: planId !== 'free',
        });
      }
    },
    onSuccess: async () => {
      // User will be redirected to Stripe
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: () => base44.functions.invoke('manageSubscription', {
      action: 'cancel'
    }),
    onSuccess: () => {
      toast.success('Subscription will cancel at period end');
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
    onError: () => {
      toast.error('Failed to cancel subscription');
    },
  });

  const currentPlan = subscription?.plan || 'basic';

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#7cfc00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={createPageUrl('Dashboard')}>
          <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-indigo-500" />
            Subscription
          </h1>
          <p className="text-gray-600 mt-1">Stop thinking about laundry. Choose your plan.</p>
        </div>
      </div>

      {/* Current Plan */}
      {subscription && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Current Plan</p>
              <p className="text-gray-900 text-2xl font-bold capitalize">{currentPlan}</p>
              {subscription.status === 'canceling' && (
                <Badge className="mt-2 bg-yellow-100 text-yellow-700 border-yellow-300">
                  Cancels on {subscription.renewal_date}
                </Badge>
              )}
              {subscription.renewal_date && subscription.status === 'active' && currentPlan !== 'free' && (
                <p className="text-gray-600 text-sm mt-1">
                  Renews on {new Date(subscription.renewal_date).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {subscription.stripe_subscription_id && subscription.status !== 'canceling' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cancelSubscriptionMutation.mutate()}
                  disabled={cancelSubscriptionMutation.isPending}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  Cancel
                </Button>
              )}
              <Crown className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
              <Clock className="w-5 h-5 text-green-500 mb-1" />
              <p className="text-gray-900 font-bold text-lg">{subscription.laundry_turnaround_hours || 48}h</p>
              <p className="text-gray-600 text-xs">Laundry Turnaround</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
              <Zap className="w-5 h-5 text-orange-500 mb-1" />
              <p className="text-gray-900 font-bold text-lg">
                {subscription.rush_deliveries_included === 999 ? 'Unlimited' : `${subscription.rush_deliveries_included}/mo`}
              </p>
              <p className="text-gray-600 text-xs">Rush Deliveries</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
              <Lock className="w-5 h-5 text-purple-500 mb-1" />
              <p className="text-gray-900 font-bold text-lg">{subscription.priority_dispatch ? 'Yes' : 'No'}</p>
              <p className="text-gray-600 text-xs">Priority Dispatch</p>
            </div>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {plans.map((plan) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            className={`bg-white rounded-xl p-6 border-2 ${plan.color} relative shadow-lg hover:shadow-xl transition-shadow ${currentPlan === plan.id ? 'ring-2 ring-green-500' : ''}`}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold shadow-md">
                Most Popular
              </Badge>
            )}
            {currentPlan === plan.id && (
              <Badge className="absolute -top-3 right-4 bg-green-500 text-white font-semibold shadow-md">
                Current
              </Badge>
            )}
            <h3 className="text-gray-900 text-xl font-bold mb-2">{plan.name}</h3>
            <div className="mb-4">
              <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
              <span className="text-gray-600">/mo</span>
            </div>
            <ul className="space-y-3 mb-6">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
            <Button
              className={`w-full ${plan.buttonClass}`}
              disabled={currentPlan === plan.id || updateSubscriptionMutation.isPending}
              onClick={() => updateSubscriptionMutation.mutate(plan.id)}
            >
              {currentPlan === plan.id ? 'Current Plan' : 'Select Plan'}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}