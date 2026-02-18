import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shirt, Clock, MapPin, Plus, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import MobileHeader from '@/components/mobile/MobileHeader';
import PullToRefresh from '@/components/mobile/PullToRefresh';

const itemOptions = [
  'Gym Shirt', 'Tank Top', 'Leggings', 'Joggers', 'Hoodie', 
  'Sports Bra', 'Shorts', 'Socks', 'Towel', 'Jacket'
];

const statusColors = {
  awaiting_pickup: 'bg-yellow-500/20 text-yellow-400',
  washing: 'bg-blue-500/20 text-blue-400',
  drying: 'bg-purple-500/20 text-purple-400',
  ready: 'bg-green-500/20 text-green-400',
  picked_up: 'bg-gray-500/20 text-gray-400',
};

const statusLabels = {
  awaiting_pickup: 'Awaiting Pickup',
  washing: 'Washing',
  drying: 'Drying',
  ready: 'Ready for Pickup',
  picked_up: 'Picked Up',
};

export default function LaundryOrder() {
  const [user, setUser] = useState(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [includeSneakers, setIncludeSneakers] = useState(false);
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
      toast.success('Laundry order created!');
      setShowNewOrder(false);
      setSelectedItems([]);
      setIncludeSneakers(false);
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
  const pastOrders = orders.filter(o => o.status === 'picked_up');

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">
        <MobileHeader 
          title="Laundry Service" 
          subtitle="Freshly cleaned gym wear delivered to your locker"
          icon={Shirt}
          iconColor="text-blue-400"
        />

        {/* New Order Button */}
        <Button
          onClick={() => setShowNewOrder(!showNewOrder)}
          className="w-full bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary-hover)]"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Laundry Order
        </Button>

        {/* New Order Form */}
        {showNewOrder && (
          <Card className="bg-[var(--color-bg-card)] border-[var(--color-border)]">
            <CardHeader>
              <CardTitle className="text-[var(--color-text-primary)]">Select Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {itemOptions.map(item => (
                  <Button
                    key={item}
                    variant={selectedItems.includes(item) ? 'default' : 'outline'}
                    onClick={() => toggleItem(item)}
                    className={selectedItems.includes(item) 
                      ? 'bg-[var(--color-primary)] text-black' 
                      : 'border-[var(--color-border)] text-[var(--color-text-primary)]'}
                  >
                    {item}
                  </Button>
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
                className="w-full bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary-hover)]"
              >
                {createOrderMutation.isPending ? 'Creating...' : 'Place Order'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Active Orders</h2>
            {activeOrders.map(order => (
              <Card key={order.id} className="bg-[var(--color-bg-card)] border-[var(--color-border)]">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-[var(--color-text-primary)] font-bold">{order.order_number}</p>
                      <p className="text-[var(--color-text-secondary)] text-sm">
                        {new Date(order.drop_off_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={statusColors[order.status]}>
                      {statusLabels[order.status]}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                      <Package className="w-4 h-4" />
                      <span className="text-sm">{order.items?.length || 0} items</span>
                      {order.includes_sneakers && (
                        <span className="text-sm">+ Sneakers</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{order.gym_location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">
                        {order.status === 'ready' ? 'Ready for pickup' : `Estimated: ${subscription?.laundry_turnaround_hours || 48}h`}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex justify-between items-center">
                    <span className="text-[var(--color-text-primary)] font-bold">
                      ${order.total_cost?.toFixed(2) || '0.00'}
                    </span>
                    {order.status === 'ready' && (
                      <Badge className="bg-[var(--color-primary)] text-black">
                        Ready in your locker!
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Past Orders */}
        {pastOrders.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Order History</h2>
            {pastOrders.slice(0, 5).map(order => (
              <Card key={order.id} className="bg-[var(--color-bg-card)] border-[var(--color-border)] opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[var(--color-text-primary)] font-medium">{order.order_number}</p>
                      <p className="text-[var(--color-text-secondary)] text-sm">
                        {new Date(order.drop_off_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[var(--color-text-primary)] font-bold">
                        ${order.total_cost?.toFixed(2) || '0.00'}
                      </p>
                      <Badge className={statusColors[order.status]}>
                        Completed
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {orders.length === 0 && !showNewOrder && (
          <Card className="bg-[var(--color-bg-card)] border-[var(--color-border)]">
            <CardContent className="p-12 text-center">
              <Shirt className="w-16 h-16 text-[var(--color-text-muted)] mx-auto mb-4" />
              <p className="text-[var(--color-text-primary)] font-medium mb-2">No Laundry Orders Yet</p>
              <p className="text-[var(--color-text-secondary)] text-sm">
                Create your first order to get fresh gym wear delivered to your locker
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </PullToRefresh>
  );
}