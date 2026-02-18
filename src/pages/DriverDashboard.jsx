import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  Shirt, 
  MapPin, 
  Phone, 
  User,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import PullToRefresh from '@/components/mobile/PullToRefresh';

export default function DriverDashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
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
    queryFn: () => base44.entities.Order.list(),
    enabled: !!user,
  });

  const { data: laundryOrders = [], isLoading: laundryLoading } = useQuery({
    queryKey: ['driver-laundry-orders'],
    queryFn: () => base44.entities.LaundryOrder.list(),
    enabled: !!user,
  });

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const unsubOrders = base44.entities.Order.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
      if (event.type === 'update') {
        toast.info('Order status updated');
      }
    });

    const unsubLaundry = base44.entities.LaundryOrder.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ['driver-laundry-orders'] });
      if (event.type === 'update') {
        toast.info('Laundry order status updated');
      }
    });

    return () => {
      unsubOrders();
      unsubLaundry();
    };
  }, [user, queryClient]);

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Order.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
      toast.success('Order status updated');
    },
    onError: () => toast.error('Failed to update order'),
  });

  const updateLaundryMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.LaundryOrder.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-laundry-orders'] });
      toast.success('Laundry order status updated');
    },
    onError: () => toast.error('Failed to update order'),
  });

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['driver-orders'] }),
      queryClient.invalidateQueries({ queryKey: ['driver-laundry-orders'] })
    ]);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      in_transit: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      awaiting_pickup: 'bg-orange-100 text-orange-800',
      washing: 'bg-blue-100 text-blue-800',
      drying: 'bg-cyan-100 text-cyan-800',
      ready: 'bg-green-100 text-green-800',
      picked_up: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getNextStatus = (currentStatus, type) => {
    if (type === 'order') {
      const flow = { pending: 'confirmed', confirmed: 'in_transit', in_transit: 'delivered' };
      return flow[currentStatus];
    } else {
      const flow = { 
        awaiting_pickup: 'washing', 
        washing: 'drying', 
        drying: 'ready', 
        ready: 'picked_up' 
      };
      return flow[currentStatus];
    }
  };

  const activeOrders = orders.filter(o => o.status !== 'delivered');
  const activeLaundry = laundryOrders.filter(o => o.status !== 'picked_up');

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Truck className="w-8 h-8 text-green-600" />
            Driver Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Manage your active deliveries</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Package className="w-8 h-8 mx-auto text-green-600 mb-2" />
                <p className="text-2xl font-bold text-gray-900">{activeOrders.length}</p>
                <p className="text-sm text-gray-600">Active Orders</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Shirt className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                <p className="text-2xl font-bold text-gray-900">{activeLaundry.length}</p>
                <p className="text-sm text-gray-600">Active Laundry</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {orders.filter(o => o.status === 'delivered').length}
                </p>
                <p className="text-sm text-gray-600">Completed Today</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Truck className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {orders.filter(o => o.status === 'in_transit').length}
                </p>
                <p className="text-sm text-gray-600">In Transit</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Deliveries Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="all">All Active</TabsTrigger>
            <TabsTrigger value="orders">Shop Orders</TabsTrigger>
            <TabsTrigger value="laundry">Laundry</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {ordersLoading || laundryLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto" />
              </div>
            ) : activeOrders.length === 0 && activeLaundry.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No active deliveries</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {activeOrders.map(order => (
                  <DeliveryCard
                    key={order.id}
                    delivery={order}
                    type="order"
                    onUpdate={(status) => updateOrderMutation.mutate({ id: order.id, status })}
                    getStatusColor={getStatusColor}
                    getNextStatus={getNextStatus}
                  />
                ))}
                {activeLaundry.map(order => (
                  <DeliveryCard
                    key={order.id}
                    delivery={order}
                    type="laundry"
                    onUpdate={(status) => updateLaundryMutation.mutate({ id: order.id, status })}
                    getStatusColor={getStatusColor}
                    getNextStatus={getNextStatus}
                  />
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            {activeOrders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No active shop orders</p>
                </CardContent>
              </Card>
            ) : (
              activeOrders.map(order => (
                <DeliveryCard
                  key={order.id}
                  delivery={order}
                  type="order"
                  onUpdate={(status) => updateOrderMutation.mutate({ id: order.id, status })}
                  getStatusColor={getStatusColor}
                  getNextStatus={getNextStatus}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="laundry" className="space-y-4">
            {activeLaundry.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Shirt className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No active laundry orders</p>
                </CardContent>
              </Card>
            ) : (
              activeLaundry.map(order => (
                <DeliveryCard
                  key={order.id}
                  delivery={order}
                  type="laundry"
                  onUpdate={(status) => updateLaundryMutation.mutate({ id: order.id, status })}
                  getStatusColor={getStatusColor}
                  getNextStatus={getNextStatus}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PullToRefresh>
  );
}

function DeliveryCard({ delivery, type, onUpdate, getStatusColor, getNextStatus }) {
  const [expanded, setExpanded] = useState(false);
  const nextStatus = getNextStatus(delivery.status, type);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {type === 'order' ? (
              <Package className="w-6 h-6 text-green-600" />
            ) : (
              <Shirt className="w-6 h-6 text-blue-600" />
            )}
            <div>
              <CardTitle className="text-lg">
                {type === 'order' ? 'Shop Order' : 'Laundry Order'} #{delivery.order_number || delivery.id.slice(0, 8)}
              </CardTitle>
              <Badge className={`${getStatusColor(delivery.status)} mt-1`}>
                {delivery.status.replace(/_/g, ' ').toUpperCase()}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Hide' : 'Details'}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Customer Info */}
          <div className="flex items-center gap-2 text-gray-700">
            <User className="w-4 h-4" />
            <span className="font-medium">{delivery.user_email}</span>
          </div>

          {/* Delivery Location */}
          {delivery.delivery_location && (
            <div className="flex items-start gap-2 text-gray-700">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{delivery.delivery_location}</span>
            </div>
          )}

          {delivery.gym_location && (
            <div className="flex items-start gap-2 text-gray-700">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{delivery.gym_location}</span>
            </div>
          )}

          {/* Special Instructions */}
          {delivery.special_instructions && (
            <div className="flex items-start gap-2 text-gray-700 bg-yellow-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-600" />
              <div>
                <p className="font-medium text-sm text-yellow-800">Special Instructions:</p>
                <p className="text-sm">{delivery.special_instructions}</p>
              </div>
            </div>
          )}

          {/* Expanded Details */}
          {expanded && (
            <div className="border-t pt-4 space-y-3">
              {type === 'order' && delivery.items && (
                <div>
                  <p className="font-medium text-sm text-gray-700 mb-2">Items:</p>
                  <ul className="space-y-1">
                    {delivery.items.map((item, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex justify-between">
                        <span>{item.product_name} x{item.quantity}</span>
                        <span>${item.price.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t mt-2 pt-2 flex justify-between font-medium">
                    <span>Total:</span>
                    <span>${delivery.total.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {type === 'laundry' && delivery.items && (
                <div>
                  <p className="font-medium text-sm text-gray-700 mb-2">Items:</p>
                  <div className="flex flex-wrap gap-2">
                    {delivery.items.map((item, idx) => (
                      <Badge key={idx} variant="outline">{item}</Badge>
                    ))}
                  </div>
                  {delivery.includes_sneakers && (
                    <Badge className="bg-purple-100 text-purple-800 mt-2">
                      Includes Sneaker Cleaning
                    </Badge>
                  )}
                </div>
              )}

              {delivery.delivery_type === 'rush' && (
                <Badge className="bg-red-100 text-red-800 flex items-center gap-1 w-fit">
                  <Clock className="w-3 h-3" />
                  RUSH DELIVERY
                </Badge>
              )}

              {delivery.estimated_delivery && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Est. Delivery: {new Date(delivery.estimated_delivery).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          {nextStatus && (
            <Button
              onClick={() => onUpdate(nextStatus)}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Mark as {nextStatus.replace(/_/g, ' ').toUpperCase()}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}