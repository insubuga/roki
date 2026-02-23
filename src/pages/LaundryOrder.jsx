import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shirt, Clock, MapPin, Plus, Package, X, ChevronDown, ChevronUp, Sparkles, Truck, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import MobileHeader from '@/components/mobile/MobileHeader';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

const itemOptions = [
  'Gym Shirt', 'Tank Top', 'Leggings', 'Joggers', 'Hoodie', 
  'Sports Bra', 'Shorts', 'Socks', 'Towel', 'Jacket'
];

const statusColors = {
  awaiting_pickup: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  washing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  drying: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  ready: 'bg-green-500/20 text-green-400 border-green-500/30',
  picked_up: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const statusLabels = {
  awaiting_pickup: 'Awaiting Pickup',
  washing: 'Washing',
  drying: 'Drying',
  ready: 'Ready for Pickup',
  picked_up: 'Picked Up',
};

const statusIcons = {
  awaiting_pickup: Clock,
  washing: Sparkles,
  drying: Sparkles,
  ready: CheckCircle,
  picked_up: Package,
};

const getStatusProgress = (status) => {
  const progressMap = {
    awaiting_pickup: 25,
    washing: 50,
    drying: 75,
    ready: 90,
    picked_up: 100,
  };
  return progressMap[status] || 0;
};

export default function LaundryOrder() {
  const [user, setUser] = useState(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [includeSneakers, setIncludeSneakers] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState('active');
  const [orderToCancel, setOrderToCancel] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.error('Auth error:', e);
        setUser(null);
      }
    };
    loadUser();
  }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['laundryOrders', user?.email],
    queryFn: () => base44.entities.LaundryOrder.filter({ user_email: user?.email }),
    enabled: !!user?.email,
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription', user?.email],
    queryFn: () => base44.entities.Subscription.filter({ user_email: user?.email }).then(s => s[0]),
    enabled: !!user?.email,
  });

  const createOrderMutation = useMutation({
    mutationFn: (orderData) => base44.entities.LaundryOrder.create(orderData),
    onSuccess: () => {
      queryClient.invalidateQueries(['laundryOrders']);
      toast.success('🎉 Laundry order created! We\'ll notify you once it\'s ready.');
      setShowNewOrder(false);
      setSelectedItems([]);
      setIncludeSneakers(false);
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId) => {
      await base44.entities.LaundryOrder.delete(orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['laundryOrders']);
      toast.success('Order cancelled successfully');
      setOrderToCancel(null);
    },
    onError: () => {
      toast.error('Failed to cancel order');
    },
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries(['laundryOrders']);
  };

  const toggleItem = (item) => {
    setSelectedItems(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleCreateOrder = () => {
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item');
      return;
    }

    const sneakerFee = includeSneakers ? (subscription?.sneaker_cleaning_discount 
      ? 15 * (1 - subscription.sneaker_cleaning_discount / 100) 
      : 15) : 0;
    
    const baseCost = selectedItems.length * 2.5;
    const totalCost = baseCost + sneakerFee;

    createOrderMutation.mutate({
      user_email: user.email,
      order_number: `LO-${Date.now()}`,
      drop_off_date: new Date().toISOString().split('T')[0],
      status: 'awaiting_pickup',
      items: selectedItems,
      includes_sneakers: includeSneakers,
      sneaker_fee: sneakerFee,
      total_cost: totalCost,
      gym_location: user.preferred_gym || 'Not specified',
    });
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--color-text-secondary)] text-sm">Loading laundry...</p>
      </div>
    );
  }

  const activeOrders = orders.filter(o => o.status !== 'picked_up');
  
  const canCancelOrder = (order) => {
    return order.status === 'awaiting_pickup' || order.status === 'washing';
  };

  const displayedOrders = activeOrders;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">
        <MobileHeader 
          title="Clean Gear Guarantee" 
          subtitle="You'll never miss because your gear isn't ready"
          icon={Shirt}
          iconColor="text-blue-400"
        />

        {/* Readiness Promise */}
        <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 border-0 shadow-xl">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-base mb-1">Always Ready</p>
                <p className="text-blue-50 text-sm leading-relaxed">
                  Skip the excuses. We automate your laundry so your gear is always fresh and ready at your locker. Zero prep needed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>



        {/* New Order Button */}
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={() => setShowNewOrder(!showNewOrder)}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 py-6 text-lg font-semibold shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Laundry Order
          </Button>
        </motion.div>



        {/* New Order Form */}
        <AnimatePresence>
          {showNewOrder && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="bg-[var(--color-bg-card)] border-[var(--color-border)] shadow-xl">
                <CardHeader className="border-b border-[var(--color-border)]">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[var(--color-text-primary)]">Select Items</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowNewOrder(false)}
                      className="text-[var(--color-text-secondary)]"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-2">
                    {itemOptions.map(item => (
                      <motion.div key={item} whileTap={{ scale: 0.95 }}>
                        <Button
                          variant={selectedItems.includes(item) ? 'default' : 'outline'}
                          onClick={() => toggleItem(item)}
                          className={`w-full ${selectedItems.includes(item) 
                            ? 'bg-[var(--color-primary)] text-black border-[var(--color-primary)]' 
                            : 'border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)]'}`}
                        >
                          {item}
                        </Button>
                      </motion.div>
                    ))}
                  </div>

              <div className="flex items-center justify-between p-4 bg-[var(--color-bg-secondary)] rounded-lg">
                <div>
                  <p className="text-[var(--color-text-primary)] font-medium">Add Sneaker Cleaning</p>
                  {subscription?.sneaker_cleaning_discount > 0 && (
                    <p className="text-sm text-[var(--color-primary)]">
                      {subscription.sneaker_cleaning_discount}% discount
                    </p>
                  )}
                </div>
                <Button
                  variant={includeSneakers ? 'default' : 'outline'}
                  onClick={() => setIncludeSneakers(!includeSneakers)}
                  className={includeSneakers ? 'bg-[var(--color-primary)] text-black' : ''}
                >
                  {includeSneakers ? 'Added' : 'Add +$15'}
                </Button>
              </div>

              <div className="border-t border-[var(--color-border)] pt-4">
                <div className="flex justify-between text-[var(--color-text-primary)] mb-2">
                  <span>Items ({selectedItems.length})</span>
                  <span>${(selectedItems.length * 2.5).toFixed(2)}</span>
                </div>
                {includeSneakers && (
                  <div className="flex justify-between text-[var(--color-text-primary)] mb-2">
                    <span>Sneaker Cleaning</span>
                    <span>${(subscription?.sneaker_cleaning_discount 
                      ? 15 * (1 - subscription.sneaker_cleaning_discount / 100) 
                      : 15).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-[var(--color-text-primary)]">
                  <span>Total</span>
                  <span>${((selectedItems.length * 2.5) + (includeSneakers 
                    ? (subscription?.sneaker_cleaning_discount 
                      ? 15 * (1 - subscription.sneaker_cleaning_discount / 100) 
                      : 15) 
                    : 0)).toFixed(2)}</span>
                </div>
              </div>

                  <Button
                    onClick={handleCreateOrder}
                    disabled={selectedItems.length === 0 || createOrderMutation.isPending}
                    className="w-full bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary-hover)] py-6 text-lg font-semibold"
                  >
                    {createOrderMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        Creating...
                      </div>
                    ) : (
                      'Place Order'
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Orders Display */}
        <AnimatePresence mode="wait">
          {displayedOrders.length > 0 ? (
            <motion.div
              key={filterStatus}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              {displayedOrders.map(order => {
                const StatusIcon = statusIcons[order.status];
                const isExpanded = expandedOrder === order.id;
                
                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <Card className="bg-[var(--color-bg-card)] border-[var(--color-border)] hover:border-[var(--color-primary)]/50 transition-all overflow-hidden">
                      <CardContent className="p-0">
                        {/* Header */}
                        <div
                          className="p-4 cursor-pointer"
                          onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <StatusIcon className="w-4 h-4 text-[var(--color-primary)]" />
                                <p className="text-[var(--color-text-primary)] font-bold">{order.order_number}</p>
                              </div>
                              <p className="text-[var(--color-text-secondary)] text-xs">
                                {new Date(order.drop_off_date).toLocaleDateString('en-US', { 
                                  weekday: 'short', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`${statusColors[order.status]} border`}>
                                {statusLabels[order.status]}
                              </Badge>
                              {isExpanded ? 
                                <ChevronUp className="w-4 h-4 text-[var(--color-text-secondary)]" /> : 
                                <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
                              }
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-2">
                            <Progress 
                              value={getStatusProgress(order.status)} 
                              className="h-2 bg-[var(--color-bg-secondary)]"
                            />
                            <div className="flex justify-between text-xs text-[var(--color-text-secondary)]">
                              <span>{order.items?.length || 0} items</span>
                              <span className="text-[var(--color-text-primary)] font-bold">
                                ${order.total_cost?.toFixed(2) || '0.00'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-[var(--color-border)]"
                            >
                              <div className="p-4 space-y-3 bg-[var(--color-bg-secondary)]">
                                {/* Items List */}
                                <div>
                                  <p className="text-xs text-[var(--color-text-secondary)] mb-2">Items:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {order.items?.map((item, idx) => (
                                      <Badge key={idx} variant="outline" className="text-[var(--color-text-primary)]">
                                        {item}
                                      </Badge>
                                    ))}
                                    {order.includes_sneakers && (
                                      <Badge variant="outline" className="text-blue-400 border-blue-400">
                                        🧹 Sneakers
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                {/* Location & Time */}
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-[var(--color-text-secondary)] text-sm">
                                    <MapPin className="w-4 h-4" />
                                    <span>{order.gym_location}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[var(--color-text-secondary)] text-sm">
                                    <Clock className="w-4 h-4" />
                                    <span>
                                      {order.status === 'ready' 
                                        ? '✅ Ready for pickup now!' 
                                        : `Est. ${subscription?.laundry_turnaround_hours || 48}h`}
                                    </span>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                {canCancelOrder(order) && (
                                  <Button
                                    variant="outline"
                                    className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
                                    onClick={() => setOrderToCancel(order)}
                                  >
                                    <X className="w-4 h-4 mr-2" />
                                    Cancel Order
                                  </Button>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="bg-[var(--color-bg-card)] border-[var(--color-border)]">
                <CardContent className="p-12 text-center">
                  <Shirt className="w-16 h-16 text-[var(--color-text-muted)] mx-auto mb-4" />
                  <p className="text-[var(--color-text-primary)] font-medium mb-2">
                    {filterStatus === 'active' ? 'No Active Orders' : 'No Order History'}
                  </p>
                  <p className="text-[var(--color-text-secondary)] text-sm">
                    {filterStatus === 'active' 
                      ? 'Create your first order to get fresh gym wear delivered'
                      : 'Completed orders will appear here'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cancel Order Dialog */}
        <Dialog open={!!orderToCancel} onOpenChange={() => setOrderToCancel(null)}>
          <DialogContent className="bg-[var(--color-bg-card)] border-[var(--color-border)]">
            <DialogHeader>
              <DialogTitle className="text-[var(--color-text-primary)]">Cancel Order?</DialogTitle>
              <DialogDescription className="text-[var(--color-text-secondary)]">
                Are you sure you want to cancel order {orderToCancel?.order_number}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setOrderToCancel(null)}
              >
                Keep Order
              </Button>
              <Button
                variant="destructive"
                className="flex-1 bg-red-500 hover:bg-red-600"
                onClick={() => {
                  if (orderToCancel) {
                    cancelOrderMutation.mutate(orderToCancel.id);
                  }
                }}
                disabled={cancelOrderMutation.isPending}
              >
                {cancelOrderMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PullToRefresh>
  );
}