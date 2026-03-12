import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Package, 
  Shirt, 
  MapPin, 
  Navigation,
  Clock,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Circle,
  Zap,
  Phone,
  MessageSquare,
  ChevronRight,
  Star,
  Award
} from 'lucide-react';
import { toast } from 'sonner';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import { motion, AnimatePresence } from 'framer-motion';
import RouteOptimizer from '@/components/driver/RouteOptimizer';
import PerformanceStats from '@/components/driver/PerformanceStats';
import DriverSupportChat from '@/components/driver/SupportChat';
import LockerPickups from '@/components/driver/LockerPickups';

export default function DriverDashboard() {
  const [user, setUser] = useState(null);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        if (userData.role !== 'driver' && userData.role !== 'admin') {
          toast.error('Access denied. Driver role required.');
          window.location.href = '/';
        }
      } catch (e) {
        console.error('Auth error:', e);
        window.location.href = '/';
      }
    };
    loadUser();
  }, []);

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['driver-orders'],
    queryFn: () => base44.entities.Order.list('-created_date'),
    enabled: !!user,
  });

  const { data: laundryOrders = [], isLoading: laundryLoading } = useQuery({
    queryKey: ['driver-laundry-orders'],
    queryFn: () => base44.entities.LaundryOrder.list('-created_date'),
    enabled: !!user,
  });

  const { data: driverStats } = useQuery({
    queryKey: ['driver-stats', user?.email],
    queryFn: async () => {
      const stats = await base44.entities.DriverStats.filter({ driver_email: user.email });
      return stats[0] || {
        driver_email: user.email,
        total_deliveries: 0,
        total_earnings: 0,
        average_rating: 0,
        total_ratings: 0,
        on_time_percentage: 0,
        acceptance_rate: 0,
        completion_rate: 0
      };
    },
    enabled: !!user?.email,
  });

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const unsubOrders = base44.entities.Order.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
      if (event.type === 'create') {
        toast.success('🚨 New delivery available!', {
          description: 'Check your dashboard for details',
        });
      }
    });

    const unsubLaundry = base44.entities.LaundryOrder.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ['driver-laundry-orders'] });
      if (event.type === 'create') {
        toast.success('🚨 New laundry pickup available!');
      }
    });

    return () => {
      unsubOrders();
      unsubLaundry();
    };
  }, [user, queryClient]);

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, status, location }) => {
      const updateData = { 
        status,
        driver_email: user.email,
      };
      
      // Add driver location for real-time tracking
      if (location) {
        updateData.driver_latitude = location.latitude;
        updateData.driver_longitude = location.longitude;
        updateData.driver_last_update = new Date().toISOString();
      }
      
      await base44.entities.Order.update(id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
      queryClient.invalidateQueries({ queryKey: ['driver-stats'] });
      toast.success('✓ Status updated');
    },
    onError: () => toast.error('Failed to update'),
  });



  const updateLaundryMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.LaundryOrder.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-laundry-orders'] });
      toast.success('✓ Status updated');
    },
    onError: () => toast.error('Failed to update'),
  });

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['driver-orders'] }),
      queryClient.invalidateQueries({ queryKey: ['driver-laundry-orders'] })
    ]);
  };

  const activeOrders = orders.filter(o => o.status !== 'delivered');
  const activeLaundry = laundryOrders.filter(o => o.status !== 'picked_up');
  const completedToday = orders.filter(o => o.status === 'delivered').length + 
                         laundryOrders.filter(o => o.status === 'picked_up').length;

  // Calculate earnings (mock calculation)
  const todayEarnings = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.total * 0.15), 0) + 
    laundryOrders
    .filter(o => o.status === 'picked_up')
    .reduce((sum, o) => sum + (o.total_cost * 0.20 || 15), 0);

  const allActiveDeliveries = [
    ...activeOrders.map(o => ({ ...o, type: 'order' })),
    ...activeLaundry.map(o => ({ ...o, type: 'laundry' }))
  ].sort((a, b) => {
    const rushA = a.delivery_type === 'rush' ? 0 : 1;
    const rushB = b.delivery_type === 'rush' ? 0 : 1;
    return rushA - rushB;
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-6">
        {/* Header Stats */}
        <div className="bg-gradient-to-br from-green-600 to-green-700 px-4 py-6 rounded-b-3xl shadow-lg mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Hey, {user.full_name?.split(' ')[0]}!</h1>
              <p className="text-green-100 text-sm">Ready to deliver?</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Star className="w-6 h-6 text-yellow-300 fill-yellow-300" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/20"
            >
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-200 mb-1" />
              <p className="text-xl sm:text-2xl font-bold text-white">${todayEarnings.toFixed(0)}</p>
              <p className="text-[10px] sm:text-xs text-green-100">Today</p>
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/20"
            >
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-200 mb-1" />
              <p className="text-xl sm:text-2xl font-bold text-white">{completedToday}</p>
              <p className="text-[10px] sm:text-xs text-green-100">Completed</p>
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/20"
            >
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-200 mb-1" />
              <p className="text-xl sm:text-2xl font-bold text-white">{allActiveDeliveries.length}</p>
              <p className="text-[10px] sm:text-xs text-green-100">Active</p>
            </motion.div>
          </div>
        </div>

        {/* Performance Stats */}
        {driverStats && (
          <div className="px-4 mb-4">
            <PerformanceStats stats={driverStats} />
          </div>
        )}

        {/* Route Optimizer */}
        {allActiveDeliveries.length > 1 && (
          <div className="px-4 mb-4">
            <RouteOptimizer 
              deliveries={allActiveDeliveries} 
              onRouteSelect={(delivery) => setSelectedDelivery(delivery)}
            />
          </div>
        )}

        {/* Locker Pickups */}
        <LockerPickups user={user} />

        {/* Active Deliveries */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Active Deliveries</h2>
            {allActiveDeliveries.length > 0 && (
              <Badge className="bg-red-500 text-white animate-pulse">
                {allActiveDeliveries.length} active
              </Badge>
            )}
          </div>

          {ordersLoading || laundryLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto" />
              <p className="text-gray-500 mt-4">Loading deliveries...</p>
            </div>
          ) : allActiveDeliveries.length === 0 ? (
            <Card className="border-dashed border-2 border-gray-200">
              <CardContent className="py-16 text-center">
                <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Package className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No active deliveries</h3>
                <p className="text-gray-500 text-sm">Pull down to refresh and check for new orders</p>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence>
              <div className="space-y-3">
                {allActiveDeliveries.map((delivery, index) => (
                  <DeliveryCardModern
                    key={delivery.id}
                    delivery={delivery}
                    index={index}
                    onUpdate={(status, location) => {
                      if (delivery.type === 'order') {
                        updateOrderMutation.mutate({ id: delivery.id, status, location });
                      } else {
                        updateLaundryMutation.mutate({ id: delivery.id, status });
                      }
                    }}
                    onSelect={() => setSelectedDelivery(delivery)}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>

        {/* Delivery Detail Modal */}
        <AnimatePresence>
          {selectedDelivery && (
            <DeliveryDetailModal 
              delivery={selectedDelivery}
              driverStats={driverStats}
              onClose={() => setSelectedDelivery(null)}
              onUpdate={(status) => {
                if (selectedDelivery.type === 'order') {
                  updateOrderMutation.mutate({ id: selectedDelivery.id, status });
                } else {
                  updateLaundryMutation.mutate({ id: selectedDelivery.id, status });
                }
                setSelectedDelivery(null);
              }}
            />
          )}
        </AnimatePresence>



        {/* Driver Support Chat */}
        <DriverSupportChat user={user} />
      </div>
    </PullToRefresh>
  );
}

function DeliveryCardModern({ delivery, index, onUpdate, onSelect }) {
  const isRush = delivery.delivery_type === 'rush';
  const isOrder = delivery.type === 'order';

  const updateWithLocation = async (status) => {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });
      
      onUpdate(status, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
    } catch (error) {
      console.log('Location unavailable, updating without it');
      onUpdate(status);
    }
  };

  const getNextAction = () => {
    if (isOrder) {
      if (delivery.status === 'pending' || delivery.status === 'confirmed') return { label: 'En Route', status: 'in_transit' };
      if (delivery.status === 'in_transit') return { label: 'Delivered', status: 'delivered' };
    } else {
      if (delivery.status === 'awaiting_pickup' || delivery.status === 'washing') return { label: 'En Route', status: 'in_transit' };
      if (delivery.status === 'ready') return { label: 'Delivered', status: 'picked_up' };
    }
    return null;
  };

  const nextAction = getNextAction();
  const location = delivery.delivery_location || delivery.gym_location || 'No location specified';
  
  // Calculate estimated earnings
  const earnings = delivery.driver_earnings || (isOrder ? delivery.total * 0.15 : 15);
  const distance = delivery.distance_miles || 2.5;
  const duration = delivery.estimated_duration_minutes || 20;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className={`overflow-hidden border-l-4 ${
        isRush ? 'border-l-red-500 bg-red-50/50' : 'border-l-green-500'
      } hover:shadow-lg transition-all cursor-pointer`}
      onClick={onSelect}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3 flex-1">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isOrder ? 'bg-green-100' : 'bg-blue-100'
              }`}>
                {isOrder ? (
                  <Package className="w-6 h-6 text-green-700" />
                ) : (
                  <Shirt className="w-6 h-6 text-blue-700" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-900 truncate">
                    {isOrder ? 'Shop Delivery' : 'Laundry Service'}
                  </h3>
                  {isRush && (
                    <Badge className="bg-red-500 text-white text-xs px-2 py-0.5 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      RUSH
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Circle className="w-3 h-3" />
                  <span>Order #{delivery.order_number || delivery.id.slice(0, 8)}</span>
                </div>

                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                  <span className="line-clamp-1">{location}</span>
                </div>

                {delivery.estimated_delivery && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                    <Clock className="w-3 h-3" />
                    <span>ETA: {new Date(delivery.estimated_delivery).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="text-right">
                <div className="font-bold text-green-700 text-lg">
                  +${earnings.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">
                  {distance.toFixed(1)} mi • {duration} min
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </div>

          {nextAction && (
            <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  updateWithLocation(nextAction.status);
                }}
              >
                <CheckCircle2 className="w-3 h-3 mr-2" />
                {nextAction.label}
              </Button>
              
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-0.5 sm:gap-1 text-[10px] sm:text-xs px-2 h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`https://maps.google.com/?q=${encodeURIComponent(location)}`, '_blank');
                  }}
                >
                  <Navigation className="w-3 h-3" />
                  <span className="hidden xs:inline">Navigate</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-0.5 sm:gap-1 text-[10px] sm:text-xs px-2 h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `tel:${delivery.user_email}`;
                  }}
                >
                  <Phone className="w-3 h-3" />
                  <span className="hidden xs:inline">Call</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-0.5 sm:gap-1 text-[10px] sm:text-xs px-2 h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `sms:${delivery.user_email}`;
                  }}
                >
                  <MessageSquare className="w-3 h-3" />
                  <span className="hidden xs:inline">Text</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DeliveryDetailModal({ delivery, driverStats, onClose, onUpdate }) {
  const isOrder = delivery.type === 'order';
  const earnings = delivery.driver_earnings || (isOrder ? delivery.total * 0.15 : 15);

  const getNextStatus = () => {
    if (isOrder) {
      if (delivery.status === 'pending') return 'confirmed';
      if (delivery.status === 'confirmed') return 'in_transit';
      if (delivery.status === 'in_transit') return 'delivered';
    } else {
      if (delivery.status === 'awaiting_pickup') return 'washing';
      if (delivery.status === 'washing') return 'drying';
      if (delivery.status === 'drying') return 'ready';
      if (delivery.status === 'ready') return 'picked_up';
    }
    return null;
  };

  const nextStatus = getNextStatus();
  const location = delivery.delivery_location || delivery.gym_location;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center md:justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isOrder ? 'bg-green-100' : 'bg-blue-100'
              }`}>
                {isOrder ? (
                  <Package className="w-6 h-6 text-green-700" />
                ) : (
                  <Shirt className="w-6 h-6 text-blue-700" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {isOrder ? 'Shop Order' : 'Laundry Service'}
                </h2>
                <p className="text-sm text-gray-500">#{delivery.order_number || delivery.id.slice(0, 8)}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-700">+${earnings.toFixed(2)}</div>
              <p className="text-xs text-gray-500">Your earnings</p>
            </div>
          </div>

          {/* Driver Performance Badge */}
          {driverStats && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Your Rating</p>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold text-gray-900">{driverStats.average_rating?.toFixed(1) || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600">Total Deliveries</p>
                <p className="text-lg font-bold text-gray-900">{driverStats.total_deliveries || 0}</p>
              </div>
            </div>
          )}

          {/* Customer Info */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Customer</h3>
            <p className="text-gray-700 mb-2">{delivery.user_email}</p>
            <div className="flex gap-2">
              <Button 
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => window.location.href = `tel:${delivery.user_email}`}
              >
                <Phone className="w-4 h-4 mr-2" />
                Call Customer
              </Button>
              <Button 
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => window.location.href = `sms:${delivery.user_email}`}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Message
              </Button>
            </div>
          </div>

          {/* Location */}
          {location && (
            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-3">Delivery Location</h3>
              <div className="flex items-start gap-3 mb-3">
                <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
                <p className="text-gray-700 flex-1">{location}</p>
              </div>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(location)}`, '_blank')}
              >
                <Navigation className="w-4 h-4 mr-2" />
                Open in Maps
              </Button>
            </div>
          )}

          {/* Order Items */}
          {isOrder && delivery.items && (
            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
              <div className="space-y-2">
                {delivery.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                    <span className="text-gray-700">{item.product_name} ×{item.quantity}</span>
                    <span className="font-medium">${item.price.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 font-bold text-lg">
                  <span>Total</span>
                  <span className="text-green-700">${delivery.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Laundry Items */}
          {!isOrder && delivery.items && (
            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
              <div className="flex flex-wrap gap-2">
                {delivery.items.map((item, idx) => (
                  <Badge key={idx} variant="outline" className="bg-white">{item}</Badge>
                ))}
              </div>
              {delivery.includes_sneakers && (
                <Badge className="bg-purple-100 text-purple-800 mt-3">
                  + Premium Sneaker Cleaning
                </Badge>
              )}
            </div>
          )}

          {/* Special Instructions */}
          {delivery.special_instructions && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-4">
              <div className="flex gap-2">
                <Zap className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-1">Special Instructions</h3>
                  <p className="text-yellow-800 text-sm">{delivery.special_instructions}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          {nextStatus && (
            <Button 
              className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
              onClick={() => onUpdate(nextStatus)}
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Mark as {nextStatus.replace(/_/g, ' ').toUpperCase()}
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}