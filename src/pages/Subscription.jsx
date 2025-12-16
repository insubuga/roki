import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { CreditCard, ArrowLeft, Check, Zap, Shirt, Lock, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      '2 laundry credits/month',
      'Standard delivery',
      'Basic locker access',
      'Community access',
    ],
    color: 'border-gray-600',
    buttonClass: 'bg-gray-600 hover:bg-gray-700',
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 9.99,
    features: [
      '5 laundry credits/month',
      '1 free rush delivery/month',
      'Priority locker selection',
      '10% off supplements',
    ],
    color: 'border-blue-500',
    buttonClass: 'bg-blue-500 hover:bg-blue-600',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19.99,
    popular: true,
    features: [
      '10 laundry credits/month',
      '3 free rush deliveries/month',
      'VIP locker zones',
      '15% off supplements',
      'Priority VantaBot support',
    ],
    color: 'border-[#7cfc00]',
    buttonClass: 'bg-[#7cfc00] hover:bg-[#6be600] text-black',
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 49.99,
    features: [
      'Unlimited laundry',
      'Unlimited rush deliveries',
      'Premium locker locations',
      '25% off supplements',
      'Personal VantaBot assistant',
      'Early access to new features',
    ],
    color: 'border-purple-500',
    buttonClass: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
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
      return subs[0];
    },
    enabled: !!user?.email,
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async (planId) => {
      const plan = plans.find(p => p.id === planId);
      const laundryCredits = planId === 'elite' ? 999 : planId === 'pro' ? 10 : planId === 'basic' ? 5 : 2;
      const rushDeliveries = planId === 'elite' ? 999 : planId === 'pro' ? 3 : planId === 'basic' ? 1 : 0;
      
      if (subscription) {
        return base44.entities.Subscription.update(subscription.id, {
          plan: planId,
          monthly_price: plan.price,
          laundry_credits: laundryCredits,
          laundry_credits_used: 0,
          rush_deliveries_included: rushDeliveries,
          rush_deliveries_used: 0,
          priority_locker: planId !== 'free',
        });
      } else {
        return base44.entities.Subscription.create({
          user_email: user.email,
          plan: planId,
          monthly_price: plan.price,
          laundry_credits: laundryCredits,
          laundry_credits_used: 0,
          rush_deliveries_included: rushDeliveries,
          rush_deliveries_used: 0,
          priority_locker: planId !== 'free',
        });
      }
    },
    onSuccess: () => {
      toast.success('Subscription updated!');
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });

  const currentPlan = subscription?.plan || 'free';

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
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-indigo-500" />
            Subscription
          </h1>
          <p className="text-gray-400 mt-1">Manage your plan</p>
        </div>
      </div>

      {/* Current Plan */}
      {subscription && (
        <div className="bg-gradient-to-r from-[#7cfc00]/20 to-teal-500/20 rounded-xl p-6 border border-[#7cfc00]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Current Plan</p>
              <p className="text-white text-2xl font-bold capitalize">{currentPlan}</p>
            </div>
            <Crown className="w-10 h-10 text-[#7cfc00]" />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-[#0d1320] rounded-lg p-3 text-center">
              <Shirt className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
              <p className="text-white font-bold">{subscription.laundry_credits - subscription.laundry_credits_used}</p>
              <p className="text-gray-400 text-xs">Laundry Credits</p>
            </div>
            <div className="bg-[#0d1320] rounded-lg p-3 text-center">
              <Zap className="w-5 h-5 text-orange-400 mx-auto mb-1" />
              <p className="text-white font-bold">{subscription.rush_deliveries_included - subscription.rush_deliveries_used}</p>
              <p className="text-gray-400 text-xs">Rush Deliveries</p>
            </div>
            <div className="bg-[#0d1320] rounded-lg p-3 text-center">
              <Lock className="w-5 h-5 text-purple-400 mx-auto mb-1" />
              <p className="text-white font-bold">{subscription.priority_locker ? 'Yes' : 'No'}</p>
              <p className="text-gray-400 text-xs">Priority Locker</p>
            </div>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            className={`bg-[#1a2332] rounded-xl p-6 border-2 ${plan.color} relative ${currentPlan === plan.id ? 'ring-2 ring-[#7cfc00]' : ''}`}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#7cfc00] text-black">
                Most Popular
              </Badge>
            )}
            {currentPlan === plan.id && (
              <Badge className="absolute -top-3 right-4 bg-green-500 text-white">
                Current
              </Badge>
            )}
            <h3 className="text-white text-xl font-bold mb-2">{plan.name}</h3>
            <div className="mb-4">
              <span className="text-3xl font-bold text-white">${plan.price}</span>
              <span className="text-gray-400">/mo</span>
            </div>
            <ul className="space-y-3 mb-6">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-[#7cfc00] flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">{feature}</span>
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