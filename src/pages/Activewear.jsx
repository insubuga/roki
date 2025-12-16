import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Shirt, ArrowLeft, Clock, MapPin, Star, CheckCircle, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';

const statusColors = {
  awaiting_pickup: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  washing: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  drying: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  ready: 'bg-green-500/20 text-green-400 border-green-500/30',
  picked_up: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const statusLabels = {
  awaiting_pickup: 'Awaiting Pickup',
  washing: 'Washing',
  drying: 'Drying',
  ready: 'Ready',
  picked_up: 'Picked Up',
};

export default function Activewear() {
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

  const { data: laundryOrders = [], isLoading } = useQuery({
    queryKey: ['laundryOrders', user?.email],
    queryFn: () => base44.entities.LaundryOrder.filter({ user_email: user?.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({ user_email: user?.email });
      return subs[0] || { plan: 'free', laundry_credits: 2, laundry_credits_used: 0 };
    },
    enabled: !!user?.email,
  });

  const createLaundryOrderMutation = useMutation({
    mutationFn: async () => {
      const orderNumber = Math.random().toString(36).substring(2, 10);
      return base44.entities.LaundryOrder.create({
        user_email: user.email,
        order_number: orderNumber,
        drop_off_date: new Date().toISOString().split('T')[0],
        status: 'awaiting_pickup',
        gym_location: 'Gym Counter'
      });
    },
    onSuccess: () => {
      toast.success('Laundry drop-off scheduled!');
      queryClient.invalidateQueries({ queryKey: ['laundryOrders'] });
    },
  });

  const creditsRemaining = (subscription?.laundry_credits || 2) - (subscription?.laundry_credits_used || 0);

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
            <Shirt className="w-8 h-8 text-cyan-500" />
            Activewear Laundry
          </h1>
          <p className="text-gray-400 mt-1">Premium cleaning service for your fitness gear</p>
        </div>
      </div>

      {/* Premium Banner */}
      <div className="bg-gradient-to-r from-cyan-500/20 to-teal-500/20 rounded-xl p-6 border border-cyan-500/30 flex items-center gap-4">
        <div className="w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
          <Shirt className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-white font-bold text-lg">Professional Activewear Cleaning</h2>
          <p className="text-gray-300 text-sm">Specialized cleaning for technical fabrics, moisture-wicking materials, and athletic gear.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Laundry Status */}
        <div className="lg:col-span-2">
          <div className="bg-[#1a2332] rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-2 mb-6">
              <Shirt className="w-5 h-5 text-[#7cfc00]" />
              <h3 className="text-white font-semibold">Current Laundry Status</h3>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-[#0d1320] rounded-lg p-4 animate-pulse">
                    <div className="h-4 bg-gray-700 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-gray-700 rounded w-1/4" />
                  </div>
                ))}
              </div>
            ) : laundryOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Shirt className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <p>No laundry orders yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {laundryOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#0d1320] rounded-lg p-4 border border-gray-800"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-blue-400" />
                        <div>
                          <p className="text-white font-semibold">Laundry Order #{order.order_number}</p>
                          <p className="text-gray-400 text-sm">
                            Dropped off: {order.drop_off_date ? format(new Date(order.drop_off_date), 'MM/dd/yyyy') : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <Badge className={`${statusColors[order.status]} border`}>
                        {statusLabels[order.status]}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Schedule Drop-off */}
          <div className="bg-[#1a2332] rounded-xl p-6 border border-gray-800 mt-6">
            <h3 className="text-white font-bold text-center mb-6">Schedule Drop-Off</h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-[#0d1320] rounded-lg p-4 text-center">
                <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Shirt className="w-5 h-5 text-cyan-400" />
                </div>
                <p className="text-white font-semibold text-sm">Drop Off</p>
                <p className="text-gray-400 text-xs">At your gym</p>
              </div>
              <div className="bg-[#0d1320] rounded-lg p-4 text-center">
                <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Star className="w-5 h-5 text-amber-400" />
                </div>
                <p className="text-white font-semibold text-sm">Professional Clean</p>
                <p className="text-gray-400 text-xs">24-48 hours</p>
              </div>
              <div className="bg-[#0d1320] rounded-lg p-4 text-center">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-white font-semibold text-sm">Pick Up</p>
                <p className="text-gray-400 text-xs">Gym counter</p>
              </div>
            </div>
            <Button 
              className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold"
              onClick={() => createLaundryOrderMutation.mutate()}
              disabled={creditsRemaining <= 0 || createLaundryOrderMutation.isPending}
            >
              <Shirt className="w-5 h-5 mr-2" />
              Schedule Activewear Drop-Off
            </Button>
            {creditsRemaining <= 0 && (
              <p className="text-red-400 text-sm text-center mt-2">No credits remaining. Upgrade your plan!</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Laundry Credits */}
          <div className="bg-[#1a2332] rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-amber-500" />
              <h3 className="text-white font-semibold">Laundry Credits</h3>
            </div>
            <div className="text-center mb-4">
              <p className="text-5xl font-bold text-[#7cfc00]">{creditsRemaining}</p>
              <p className="text-gray-400">Credits Remaining</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Plan:</span>
                <span className="text-white capitalize">{subscription?.plan || 'Free'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Monthly Allowance:</span>
                <span className="text-white">{subscription?.laundry_credits || 2}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Used This Month:</span>
                <span className="text-white">{subscription?.laundry_credits_used || 0}</span>
              </div>
            </div>
          </div>

          {/* Service Details */}
          <div className="bg-[#1a2332] rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-gray-400" />
              <h3 className="text-white font-semibold">Service Details</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Processing Time:</span>
                <span className="text-white font-semibold">24-48 hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Pick-up Location:</span>
                <span className="text-white">Gym Counter</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Fabric Care:</span>
                <span className="text-[#7cfc00]">Specialized</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-white font-semibold mb-2">What We Clean:</p>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• Athletic shirts & tanks</li>
                <li>• Workout shorts & leggings</li>
                <li>• Sports bras & compression wear</li>
                <li>• Gym towels & accessories</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}