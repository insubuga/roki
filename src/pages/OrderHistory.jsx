import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Package, ShoppingCart, Truck, CheckCircle, Clock, RefreshCw, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MobileHeader from '../components/mobile/MobileHeader';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function OrderHistory() {
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

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.email],
    queryFn: async () => {
      try {
        const data = await base44.entities.Cycle.filter({ user_email: user?.email }, '-created_date', 50);
        return data || [];
      } catch {
        return [];
      }
    },
    enabled: !!user?.email,
    retry: false,
  });

  const reorderMutation = useMutation({
    mutationFn: async (order) => {
      const promises = order.items.map(item =>
        base44.entities.CartItem.create({
          user_email: user.email,
          product_id: item.product_id,
          product_name: item.product_name,
          price: item.price,
          quantity: item.quantity,
          image_url: item.image_url || '',
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartItems'] });
      toast.success('Items added to cart!');
    },
    onError: () => {
      toast.error('Failed to reorder items');
    },
  });

  const statusConfig = {
    pending: { icon: Clock, color: 'bg-yellow-500/20 text-yellow-400', label: 'Pending' },
    confirmed: { icon: CheckCircle, color: 'bg-blue-500/20 text-blue-400', label: 'Confirmed' },
    in_transit: { icon: Truck, color: 'bg-purple-500/20 text-purple-400', label: 'In Transit' },
    delivered: { icon: CheckCircle, color: 'bg-green-500/20 text-green-400', label: 'Delivered' },
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MobileHeader
        title="Order History"
        subtitle="Track your supplement orders"
        icon={Package}
        iconColor="text-emerald-500"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <Card className="bg-[var(--color-bg-card)] border-[var(--color-border)]">
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 text-[var(--color-text-secondary)] mx-auto mb-4 opacity-50" />
            <h2 className="text-xl text-[var(--color-text-primary)] font-semibold mb-2">No orders yet</h2>
            <p className="text-[var(--color-text-secondary)] mb-6">Start shopping to see your order history</p>
            <Link to={createPageUrl('Shop')}>
              <Button className="bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary-hover)]">
                Browse Supplements
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = status.icon;

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-[var(--color-bg-card)] border-[var(--color-border)] overflow-hidden">
                  <CardHeader className="border-b border-[var(--color-border)]">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-[var(--color-text-primary)] text-base mb-1">
                          Order #{order.id.slice(-8).toUpperCase()}
                        </CardTitle>
                        <p className="text-[var(--color-text-secondary)] text-sm">
                          {format(new Date(order.created_date), 'MMM dd, yyyy • h:mm a')}
                        </p>
                      </div>
                      <Badge className={`${status.color} border-none`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4">
                    {/* Order Items */}
                    <div className="space-y-3 mb-4">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-[var(--color-bg-secondary)] rounded-lg flex-shrink-0 flex items-center justify-center">
                            <Package className="w-6 h-6 text-[var(--color-text-secondary)]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[var(--color-text-primary)] font-medium text-sm truncate">
                              {item.product_name}
                            </p>
                            <p className="text-[var(--color-text-secondary)] text-xs">
                              Qty: {item.quantity} × ${item.price.toFixed(2)}
                            </p>
                          </div>
                          <p className="text-[var(--color-text-primary)] font-semibold text-sm">
                            ${(item.quantity * item.price).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Order Summary */}
                    <div className="border-t border-[var(--color-border)] pt-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[var(--color-text-secondary)] text-sm">Delivery Type</span>
                        <Badge variant="outline" className="text-xs">
                          {order.delivery_type === 'rush' ? (
                            <>
                              <Truck className="w-3 h-3 mr-1" />
                              Rush
                            </>
                          ) : (
                            'Standard'
                          )}
                        </Badge>
                      </div>
                      {order.estimated_delivery && (
                        <div className="flex justify-between items-center">
                          <span className="text-[var(--color-text-secondary)] text-sm">Estimated Delivery</span>
                          <span className="text-[var(--color-text-primary)] text-sm">
                            {format(new Date(order.estimated_delivery), 'MMM dd, h:mm a')}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-[var(--color-text-primary)] font-bold">Total</span>
                        <span className="text-[var(--color-primary)] font-bold text-lg">
                          ${order.total?.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        className="flex-1 border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] select-none"
                        onClick={() => reorderMutation.mutate(order)}
                        disabled={reorderMutation.isPending}
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 select-none ${reorderMutation.isPending ? 'animate-spin' : ''}`} />
                        Reorder
                      </Button>
                      {order.status !== 'delivered' && (
                        <Link to={createPageUrl('Deliveries')} className="flex-1">
                          <Button className="w-full bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary-hover)] select-none">
                            Track Order
                            <ChevronRight className="w-4 h-4 ml-2 select-none" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}