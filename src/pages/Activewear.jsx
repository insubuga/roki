import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Shirt, ArrowLeft, Clock, MapPin, Star, CheckCircle, CreditCard, Footprints, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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

const availableItems = [
  'Gym Shirt', 'Tank Top', 'Sports Bra', 'Leggings', 'Shorts', 
  'Joggers', 'Hoodie', 'Sweatpants', 'Compression Wear', 'Gym Towel'
];

export default function Activewear() {
  const [user, setUser] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [includeSneakers, setIncludeSneakers] = useState(false);
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
      return subs[0] || { 
        plan: 'free', 
        laundry_credits: 2, 
        laundry_credits_used: 0,
        laundry_turnaround_hours: 48,
        sneaker_cleaning_discount: 0,
        premium_sneaker_cleaning: false
      };
    },
    enabled: !!user?.email,
  });

  const createLaundryOrderMutation = useMutation({
    mutationFn: async () => {
      if (selectedItems.length === 0) {
        throw new Error('Please select at least one item');
      }

      const creditsRemaining = subscription.laundry_credits - subscription.laundry_credits_used;
      if (creditsRemaining <= 0) {
        throw new Error('No laundry credits remaining');
      }
      
      const orderNumber = Math.random().toString(36).substring(2, 10).toUpperCase();
      let sneakerFee = 0;
      
      if (includeSneakers) {
        if (subscription.premium_sneaker_cleaning) {
          sneakerFee = 0;
        } else {
          const originalPrice = 15;
          const discount = subscription.sneaker_cleaning_discount || 0;
          sneakerFee = originalPrice * (1 - discount / 100);
        }
      }
      
      const order = await base44.entities.LaundryOrder.create({
        user_email: user.email,
        order_number: orderNumber,
        drop_off_date: new Date().toISOString().split('T')[0],
        status: 'awaiting_pickup',
        gym_location: 'Gym Counter',
        items: selectedItems,
        includes_sneakers: includeSneakers,
        sneaker_fee: sneakerFee,
        total_cost: sneakerFee
      });

      if (subscription.id) {
        await base44.entities.Subscription.update(subscription.id, {
          laundry_credits_used: subscription.laundry_credits_used + 1
        });
      }

      return order;
    },
    onSuccess: () => {
      toast.success('Laundry drop-off scheduled!');
      queryClient.invalidateQueries({ queryKey: ['laundryOrders'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      setSelectedItems([]);
      setIncludeSneakers(false);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const toggleItem = (item) => {
    setSelectedItems(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  const creditsRemaining = subscription?.plan === 'elite' 
    ? '∞' 
    : (subscription?.laundry_credits || 2) - (subscription?.laundry_credits_used || 0);

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
          {/* Active Orders Header */}
          <div className="bg-[#1a2332] rounded-xl p-6 border border-gray-800 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Active Orders</h3>
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
              <div className="space-y-4">
                {laundryOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border-b border-gray-800 last:border-0 pb-4 last:pb-0"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                          <Shirt className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                          <p className="text-white font-semibold">Order #{order.order_number}</p>
                          <p className="text-gray-400 text-sm">{order.items?.length || 0} items</p>
                        </div>
                      </div>
                      <Clock className="w-5 h-5 text-gray-500" />
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#7cfc00] to-cyan-500 transition-all duration-500"
                          style={{ 
                            width: order.status === 'awaiting_pickup' ? '25%' : 
                                   order.status === 'washing' ? '50%' :
                                   order.status === 'drying' ? '75%' : '100%'
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {(order.items || []).map((item, idx) => (
                          <Badge key={idx} variant="outline" className="bg-gray-800/50 text-gray-300 border-gray-700">
                            {item}
                          </Badge>
                        ))}
                        {order.includes_sneakers && (
                          <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                           <Footprints className="w-3 h-3 mr-1" />
                           Sneakers {order.sneaker_fee === 0 ? '(Free)' : `+$${order.sneaker_fee.toFixed(2)}`}
                          </Badge>
                        )}
                      </div>
                      <Badge className="bg-amber-500/20 text-amber-400 border-none ml-2">
                        {statusLabels[order.status]}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Schedule Drop-off */}
          <div className="bg-[#1a2332] rounded-xl p-6 border border-gray-800">
            <h3 className="text-white font-bold mb-4">Schedule New Drop-Off</h3>
            
            {/* Select Items */}
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-3">Select items for cleaning:</p>
              <div className="grid grid-cols-2 gap-2">
                {availableItems.map((item) => (
                  <motion.button
                    key={item}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleItem(item)}
                    className={`p-3 rounded-lg border transition-all text-left ${
                      selectedItems.includes(item)
                        ? 'border-[#7cfc00] bg-[#7cfc00]/10'
                        : 'border-gray-700 bg-[#0d1320]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm">{item}</span>
                      {selectedItems.includes(item) && (
                        <CheckCircle className="w-4 h-4 text-[#7cfc00]" />
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Sneaker Cleaning Option */}
            <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-lg p-4 border border-orange-500/30 mb-6">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="sneakers"
                  checked={includeSneakers}
                  onCheckedChange={setIncludeSneakers}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label htmlFor="sneakers" className="text-white font-semibold cursor-pointer flex items-center gap-2">
                    <Footprints className="w-4 h-4 text-orange-400" />
                    Add Sneaker Cleaning
                  </label>
                  <p className="text-gray-400 text-sm mt-1">
                    Professional sneaker cleaning and deodorizing service
                  </p>
                  <p className="text-orange-400 font-bold text-sm mt-2">
                    {subscription?.premium_sneaker_cleaning ? (
                      <>✓ Free (Elite)</>
                    ) : subscription?.sneaker_cleaning_discount > 0 ? (
                      <>+ ${(15 * (1 - subscription.sneaker_cleaning_discount / 100)).toFixed(2)} ({subscription.sneaker_cleaning_discount}% off)</>
                    ) : (
                      <>+ $15.00</>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-[#0d1320] rounded-lg p-4 mb-4 border border-gray-700">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Items selected:</span>
                <span className="text-white font-semibold">{selectedItems.length}</span>
              </div>
              {includeSneakers && (
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Sneaker cleaning:</span>
                  <span className="text-orange-400 font-semibold">
                    {subscription?.premium_sneaker_cleaning ? (
                      'Free'
                    ) : (
                      `$${(15 * (1 - (subscription?.sneaker_cleaning_discount || 0) / 100)).toFixed(2)}`
                    )}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-700">
                <span className="text-white font-semibold">Total cost:</span>
                <span className="text-[#7cfc00] font-bold">
                  ${includeSneakers ? (
                    subscription?.premium_sneaker_cleaning ? '0.00' : 
                    (15 * (1 - (subscription?.sneaker_cleaning_discount || 0) / 100)).toFixed(2)
                  ) : '0.00'}
                </span>
              </div>
            </div>

            <Button 
              className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold"
              onClick={() => createLaundryOrderMutation.mutate()}
              disabled={selectedItems.length === 0 || (creditsRemaining !== '∞' && creditsRemaining <= 0) || createLaundryOrderMutation.isPending}
            >
              <Shirt className="w-5 h-5 mr-2" />
              Schedule Drop-Off
            </Button>
            {creditsRemaining !== '∞' && creditsRemaining <= 0 && (
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
            <div className="mb-4">
              <div className="text-center mb-2">
                <p className="text-gray-400 text-sm mb-1">Laundry Credits</p>
                <p className="text-5xl font-bold text-[#7cfc00]">{creditsRemaining === 999 ? '∞' : creditsRemaining}</p>
              </div>
              {subscription?.plan === 'elite' && (
                <div className="text-center">
                  <Badge className="bg-purple-500/20 text-purple-400 border-none">Elite</Badge>
                </div>
              )}
            </div>
            {subscription?.plan !== 'elite' && (
              <div className="mb-4 bg-gray-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-[#7cfc00] h-full transition-all"
                  style={{ 
                    width: `${((subscription?.laundry_credits - subscription?.laundry_credits_used) / subscription?.laundry_credits * 100)}%` 
                  }}
                />
              </div>
            )}
            {subscription?.plan === 'elite' && (
              <div className="h-2 bg-gradient-to-r from-[#7cfc00] to-cyan-500 rounded-full mb-4" />
            )}
            <div className="space-y-2 text-sm border-t border-gray-700 pt-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Plan:</span>
                <span className="text-white capitalize">{subscription?.plan || 'Free'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Used This Month:</span>
                <span className="text-white">
                  {subscription?.laundry_credits_used || 0} / {subscription?.laundry_credits === 999 ? '∞' : (subscription?.laundry_credits || 2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Turnaround:</span>
                <span className="text-[#7cfc00]">{subscription?.laundry_turnaround_hours || 48}h</span>
              </div>
              {subscription?.sneaker_cleaning_discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Sneaker Discount:</span>
                  <span className="text-[#7cfc00]">{subscription.sneaker_cleaning_discount}% off</span>
                </div>
              )}
              {subscription?.premium_sneaker_cleaning && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Premium Sneaker:</span>
                  <span className="text-[#7cfc00]">Free</span>
                </div>
              )}
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
                <span className="text-white font-semibold">{subscription?.laundry_turnaround_hours || 48} hours</span>
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