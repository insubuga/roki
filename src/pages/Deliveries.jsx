import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PullToRefresh from '../components/mobile/PullToRefresh';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Truck, Package, Clock, CheckCircle, MapPin, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MobileHeader from '../components/mobile/MobileHeader';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import TrackingTimeline from '../components/delivery/TrackingTimeline';
import { toast } from 'sonner';

const statusColors = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  confirmed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  in_transit: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  delivered: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const statusLabels = {
  pending: 'Pending',
  confirmed: "We've got it",
  in_transit: 'On the way',
  delivered: 'Handled',
};

export default function Deliveries() {
  const [user, setUser] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [trackingData, setTrackingData] = useState({});
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries(['orders']);
    setTrackingData({});
  };

  const fetchTracking = async (order) => {
    if (!order.tracking_number || !order.carrier) {
      toast.error('No tracking information available');
      return;
    }

    if (trackingData[order.id]) {
      setExpandedOrder(expandedOrder === order.id ? null : order.id);
      return;
    }

    try {
      const { data } = await base44.functions.invoke('getShipmentTracking', {
        tracking_number: order.tracking_number,
        carrier: order.carrier,
      });

      setTrackingData(prev => ({ ...prev, [order.id]: data }));
      setExpandedOrder(order.id);
    } catch (error) {
      console.error('Tracking fetch error:', error);
      toast.error('Failed to load tracking information');
    }
  };

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
      const data = await base44.entities.Order.filter({ user_email: user?.email }, '-created_date');
      return data || [];
    },
    enabled: !!user?.email,
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#7cfc00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeOrders = orders.filter(o => o.status !== 'delivered');
  const pastOrders = orders.filter(o => o.status === 'delivered');

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-6">
      {/* Header */}
      <MobileHeader
        title="Deliveries"
        subtitle="Track your packages"
        icon={Truck}
        iconColor="text-orange-500"
      />

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#1a2332] rounded-xl p-6 animate-pulse border border-gray-800">
              <div className="h-4 bg-gray-700 rounded w-1/3 mb-4" />
              <div className="h-3 bg-gray-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-[#1a2332] rounded-xl p-12 text-center border border-gray-800">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl text-white font-semibold mb-2">No deliveries yet</h2>
          <p className="text-gray-400 mb-6">Place an order to see your deliveries here</p>
          <Link to={createPageUrl('Shop')}>
            <Button className="bg-[#7cfc00] text-black hover:bg-[#6be600]">
              Start Shopping
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Orders */}
          {activeOrders.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Active Deliveries</h2>
              <div className="space-y-4">
                {activeOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#1a2332] rounded-xl p-6 border border-gray-800"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-white font-semibold">Order #{order.id.slice(-8)}</p>
                        <p className="text-gray-400 text-sm">
                          {format(new Date(order.created_date), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      <Badge className={`${statusColors[order.status]} border`}>
                        {order.delivery_type === 'rush' && '⚡ '}
                        {statusLabels[order.status]}
                      </Badge>
                    </div>

                    {/* Items */}
                    <div className="space-y-2 mb-4">
                      {(order.items || []).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-300">{item.product_name} x{item.quantity}</span>
                          <span className="text-white">${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-700 pt-4">
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <MapPin className="w-4 h-4" />
                        <span>{order.delivery_location || 'Locker delivery'}</span>
                      </div>
                      {order.estimated_delivery && (
                        <div className="flex items-center gap-2 text-gray-400 text-sm mt-2">
                          <Clock className="w-4 h-4" />
                          <span>ETA: {format(new Date(order.estimated_delivery), 'h:mm a')}</span>
                        </div>
                      )}
                      {order.tracking_number && (
                        <div className="flex items-center gap-2 text-gray-400 text-sm mt-2">
                          <Package className="w-4 h-4" />
                          <span className="font-mono text-xs">{order.tracking_number}</span>
                          {order.tracking_url && (
                            <a 
                              href={order.tracking_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-700">
                      <span className="text-gray-400">Total</span>
                      <span className="text-[#7cfc00] font-bold text-lg">${order.total?.toFixed(2)}</span>
                    </div>

                    {/* Track Shipment Button */}
                    {order.tracking_number && order.status === 'in_transit' && (
                      <>
                        <Button
                          variant="outline"
                          className="w-full mt-4 border-gray-700 text-gray-300 hover:bg-gray-800 select-none"
                          onClick={() => fetchTracking(order)}
                        >
                          <Truck className="w-4 h-4 mr-2 select-none" />
                          {expandedOrder === order.id ? 'Hide' : 'View'} Live Tracking
                          {expandedOrder === order.id ? <ChevronUp className="w-4 h-4 ml-2 select-none" /> : <ChevronDown className="w-4 h-4 ml-2 select-none" />}
                        </Button>

                        <AnimatePresence>
                          {expandedOrder === order.id && trackingData[order.id] && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4"
                            >
                              <TrackingTimeline trackingData={trackingData[order.id]} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Past Orders */}
          {pastOrders.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Past Deliveries</h2>
              <div className="space-y-4">
                {pastOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-[#1a2332] rounded-xl p-6 border border-gray-800 opacity-75"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">Order #{order.id.slice(-8)}</p>
                        <p className="text-gray-400 text-sm">
                          {format(new Date(order.created_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-green-400 font-medium">Delivered</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-gray-400">{(order.items || []).length} items</span>
                      <span className="text-white font-bold">${order.total?.toFixed(2)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}