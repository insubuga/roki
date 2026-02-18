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
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-300',
  in_transit: 'bg-purple-100 text-purple-700 border-purple-300',
  delivered: 'bg-green-100 text-green-700 border-green-300',
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
            <div key={i} className="bg-white rounded-xl p-6 animate-pulse border border-gray-200 shadow-md">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200 shadow-lg">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-orange-600" />
          </div>
          <h2 className="text-xl text-gray-900 font-semibold mb-2">No deliveries yet</h2>
          <p className="text-gray-600 mb-6">Place an order to see your deliveries here</p>
          <Link to={createPageUrl('Shop')}>
            <Button className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-md">
              Start Shopping
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Orders */}
          {activeOrders.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-2 h-8 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full"></div>
                Active Deliveries
              </h2>
              <div className="space-y-4">
                {activeOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-gray-900 font-semibold text-lg">Order #{order.id.slice(-8)}</p>
                        <p className="text-gray-600 text-sm">
                          {format(new Date(order.created_date), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      <Badge className={`${statusColors[order.status]} border font-medium`}>
                        {order.delivery_type === 'rush' && '⚡ '}
                        {statusLabels[order.status]}
                      </Badge>
                    </div>

                    {/* Items */}
                    <div className="space-y-2 mb-4 bg-gray-50 rounded-lg p-4">
                      {(order.items || []).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-700 font-medium">{item.product_name} x{item.quantity}</span>
                          <span className="text-gray-900 font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-200 pt-4 space-y-2">
                      <div className="flex items-center gap-2 text-gray-600 text-sm">
                        <MapPin className="w-4 h-4 text-orange-500" />
                        <span>{order.delivery_location || 'Locker delivery'}</span>
                      </div>
                      {order.estimated_delivery && (
                        <div className="flex items-center gap-2 text-gray-600 text-sm">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <span>ETA: {format(new Date(order.estimated_delivery), 'h:mm a')}</span>
                        </div>
                      )}
                      {order.tracking_number && (
                        <div className="flex items-center gap-2 text-gray-600 text-sm">
                          <Package className="w-4 h-4 text-purple-500" />
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{order.tracking_number}</span>
                          {order.tracking_url && (
                            <a 
                              href={order.tracking_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                      <span className="text-gray-600 font-medium">Total</span>
                      <span className="text-green-600 font-bold text-xl">${order.total?.toFixed(2)}</span>
                    </div>

                    {/* Track Shipment Button */}
                    {order.tracking_number && order.status === 'in_transit' && (
                      <>
                        <Button
                          className="w-full mt-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 select-none shadow-md"
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
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-2 h-8 bg-gradient-to-b from-green-500 to-green-600 rounded-full"></div>
                Past Deliveries
              </h2>
              <div className="space-y-4">
                {pastOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white rounded-xl p-6 border border-gray-200 shadow-md hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-900 font-semibold">Order #{order.id.slice(-8)}</p>
                        <p className="text-gray-600 text-sm">
                          {format(new Date(order.created_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-green-700 font-medium">Delivered</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                      <span className="text-gray-600">{(order.items || []).length} items</span>
                      <span className="text-gray-900 font-bold">${order.total?.toFixed(2)}</span>
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