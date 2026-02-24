import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Zap, MapPin, Clock, AlertTriangle, Package, Bot, Search, ShoppingBag, Plus, Minus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MobileHeader from '../components/mobile/MobileHeader';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MobileSelect from '@/components/mobile/MobileSelect';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { NotificationTriggers } from '../components/notifications/NotificationHelper';

export default function RushMode() {
  const [user, setUser] = useState(null);
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]); // Array of {product, quantity}
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectionMode, setSelectionMode] = useState('quick'); // 'quick' or 'browse'
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        // Smart defaults: prefill location if available
        if (userData.gym_location) {
          setDeliveryLocation(userData.gym_location);
        }
      } catch (e) {
        console.error('Auth error:', e);
        setUser(null);
      }
    };
    loadUser();
  }, []);

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cartItems', user?.email],
    queryFn: async () => {
      const data = await base44.entities.CartItem.filter({ user_email: user?.email });
      return data || [];
    },
    enabled: !!user?.email,
  });

  const { data: recentOrders = [] } = useQuery({
    queryKey: ['recentOrders', user?.email],
    queryFn: async () => {
      const data = await base44.entities.Order.filter({ user_email: user?.email }, '-created_date', 5);
      return data || [];
    },
    enabled: !!user?.email,
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({ user_email: user?.email });
      if (subs.length > 0) return subs[0];
      return {
        plan: 'free',
        rush_deliveries_included: 0,
        rush_deliveries_used: 0,
        rush_delivery_fee: 15,
        priority_dispatch: false
      };
    },
    enabled: !!user?.email,
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.filter({ in_stock: true }),
    enabled: !!user,
  });

  const createRushOrderMutation = useMutation({
    mutationFn: async () => {
      let orderItems = [];
      let itemsTotal = 0;

      // Handle multiple selected products from browse mode
      if (selectedProducts.length > 0) {
        orderItems = selectedProducts.map(sp => ({
          product_id: sp.product.id,
          product_name: sp.product.name,
          quantity: sp.quantity,
          price: sp.product.price
        }));
        itemsTotal = selectedProducts.reduce((sum, sp) => sum + (sp.product.price * sp.quantity), 0);
      } 
      // Handle single item from quick select
      else if (selectedItem) {
        const product = cartItems.find(item => item.product_id === selectedItem) ||
          recentOrders.flatMap(o => o.items || []).find(i => i.product_id === selectedItem);
        orderItems = [{
          product_id: product?.product_id || selectedItem,
          product_name: product?.product_name || 'Rush Item',
          quantity: 1,
          price: product?.price || 0
        }];
        itemsTotal = product?.price || 0;
      }
      
      const rushFee = subscription.rush_delivery_fee || 15;
      const freeRushesRemaining = (subscription.rush_deliveries_included || 0) - (subscription.rush_deliveries_used || 0);
      const actualRushFee = freeRushesRemaining > 0 ? 0 : rushFee;
      
      const order = await base44.entities.Order.create({
        user_email: user.email,
        items: orderItems,
        total: itemsTotal + actualRushFee,
        delivery_type: 'rush',
        delivery_location: deliveryLocation,
        special_instructions: specialInstructions,
        status: 'confirmed',
        estimated_delivery: new Date(Date.now() + 30 * 60000).toISOString()
      });

      // Update rush delivery usage if applicable
      if (freeRushesRemaining > 0 && subscription.id) {
        await base44.entities.Subscription.update(subscription.id, {
          rush_deliveries_used: (subscription.rush_deliveries_used || 0) + 1
        });
      }

      return order;
    },
    onSuccess: async (data) => {
      toast.success("We've got it. Delivery in ~30 minutes.");
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      
      // Create notifications
      if (user?.email && data.order_number) {
        await NotificationTriggers.deliveryDispatched(user.email, data.order_number);
        
        // Simulate "arriving soon" notification after 20 minutes
        setTimeout(async () => {
          await NotificationTriggers.deliveryArriving(user.email);
        }, 20 * 60 * 1000);
      }
      
      setSelectedItem('');
      setSelectedProducts([]);
      setSpecialInstructions('');
      setSelectionMode('quick');
    },
  });

  const toggleProductSelection = (product) => {
    setSelectedProducts(prev => {
      const existing = prev.find(p => p.product.id === product.id);
      if (existing) {
        return prev.filter(p => p.product.id !== product.id);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateProductQuantity = (productId, delta) => {
    setSelectedProducts(prev => 
      prev.map(p => {
        if (p.product.id === productId) {
          const newQuantity = Math.max(1, p.quantity + delta);
          return { ...p, quantity: newQuantity };
        }
        return p;
      })
    );
  };

  const getTotalItems = () => selectedProducts.reduce((sum, sp) => sum + sp.quantity, 0);
  const getTotalPrice = () => selectedProducts.reduce((sum, sp) => sum + (sp.product.price * sp.quantity), 0);

  const allItems = [
    ...cartItems.map(item => ({ id: item.product_id, name: item.product_name, source: 'cart' })),
    ...recentOrders.flatMap(o => (o.items || []).map(i => ({ id: i.product_id, name: i.product_name, source: 'recent' })))
  ];

  // Deduplicate
  const uniqueItems = allItems.filter((item, index, self) =>
    index === self.findIndex(t => t.id === item.id)
  );

  // Filter products by search and category
  const filteredProducts = allProducts.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Group by category
  const productsByCategory = filteredProducts.reduce((acc, product) => {
    const category = product.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(product);
    return acc;
  }, {});

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--color-text-secondary)] text-sm">Loading rush mode...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <MobileHeader
        title="Recovery Protocol"
        subtitle="Activate emergency redundancy systems"
        icon={Zap}
        iconColor="text-orange-500"
      />

      {/* Recovery Protocol Banner */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-xl p-6 border border-orange-200 dark:border-orange-900/50 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-foreground font-bold text-lg">Recovery Mode</h2>
            <p className="text-muted-foreground text-sm">When standard protocols fail, backup systems engage automatically.</p>
          </div>
        </div>
        
        {/* System Redundancy Notice */}
        <div className="mt-4 bg-card rounded-lg p-4 border border-orange-200 dark:border-orange-900/50 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Check className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-foreground text-sm font-semibold mb-1">Built-in Redundancy</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Recovery protocols automatically allocate backup resources and re-prioritize dispatch queues when standard logistics encounter disruptions.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
          {/* Select Item */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-500" />
                <h3 className="text-foreground font-semibold">Select Items</h3>
              </div>
              {(selectedItem || selectedProducts.length > 0) && (
                <Badge className="bg-green-500 text-white">
                  {selectionMode === 'browse' ? `${getTotalItems()} items` : 'Selected'}
                </Badge>
              )}
            </div>

            {/* Selected Items Summary for Browse Mode */}
            {selectedProducts.length > 0 && selectionMode === 'browse' && (
              <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-foreground">Your Rush Order</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedProducts([])}
                    className="h-7 text-xs text-red-600 hover:bg-red-50"
                  >
                    Clear All
                  </Button>
                </div>
                {selectedProducts.map(({ product, quantity }) => (
                  <div key={product.id} className="flex items-center gap-2 bg-card rounded p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">${product.price?.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateProductQuantity(product.id, -1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">{quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateProductQuantity(product.id, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-600 hover:bg-red-50"
                        onClick={() => toggleProductSelection(product)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-orange-200 dark:border-orange-900/50">
                  <span className="font-semibold text-foreground">Subtotal</span>
                  <span className="font-bold text-green-600">${getTotalPrice().toFixed(2)}</span>
                </div>
              </div>
            )}

            <Tabs value={selectionMode} onValueChange={setSelectionMode} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="quick">Quick Select</TabsTrigger>
                <TabsTrigger value="browse">Browse All</TabsTrigger>
              </TabsList>

              <TabsContent value="quick" className="space-y-3">
                <p className="text-muted-foreground text-sm mb-3">Choose from your cart or recent orders</p>
                {uniqueItems.length === 0 ? (
                  <div className="bg-muted rounded-lg p-6 text-center">
                    <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground text-sm">No recent items found</p>
                    <Button 
                      variant="link" 
                      className="mt-2 text-orange-600"
                      onClick={() => setSelectionMode('browse')}
                    >
                      Browse all products →
                    </Button>
                  </div>
                ) : (
                  <MobileSelect
                    options={uniqueItems.map(item => ({
                      value: item.id,
                      label: item.name,
                      subtitle: item.source
                    }))}
                    value={selectedItem}
                    onValueChange={(val) => {
                      setSelectedItem(val);
                      setSelectedProducts([]);
                    }}
                    placeholder="Select from recent items or cart"
                    trigger={
                      <Select value={selectedItem} onValueChange={(val) => {
                        setSelectedItem(val);
                        setSelectedProducts([]);
                      }}>
                        <SelectTrigger className="bg-muted border-border text-foreground hover:bg-accent focus:ring-2 focus:ring-orange-500">
                          <SelectValue placeholder="Select from recent items or cart" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border max-h-[300px]">
                          {uniqueItems.map((item) => (
                            <SelectItem key={item.id} value={item.id} className="text-foreground">
                              {item.name} <span className="text-muted-foreground text-xs">({item.source})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    }
                  />
                )}
              </TabsContent>

              <TabsContent value="browse" className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-muted border-border"
                  />
                </div>

                {/* Products Grid */}
                <div className="max-h-[500px] overflow-y-auto space-y-4">
                  {Object.keys(productsByCategory).length === 0 ? (
                    <div className="bg-muted rounded-lg p-6 text-center">
                      <Package className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground text-sm">No products found</p>
                    </div>
                  ) : (
                    Object.entries(productsByCategory).map(([category, products]) => (
                      <div key={category}>
                        <h4 className="text-sm font-semibold text-foreground mb-2 capitalize sticky top-0 bg-background py-2">
                          {category.replace('-', ' ')}
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                          {products.map((product) => {
                            const isSelected = selectedProducts.some(sp => sp.product.id === product.id);
                            const selectedItem = selectedProducts.find(sp => sp.product.id === product.id);
                            
                            return (
                              <Card 
                                key={product.id}
                                className={`cursor-pointer transition-all hover:shadow-md ${
                                  isSelected ? 'ring-2 ring-orange-500 bg-orange-50' : ''
                                }`}
                                onClick={() => {
                                  toggleProductSelection(product);
                                  setSelectedItem('');
                                }}
                              >
                                <CardContent className="p-3 flex items-center gap-3">
                                  {product.image_url && (
                                    <img 
                                      src={product.image_url} 
                                      alt={product.name}
                                      className="w-12 h-12 object-cover rounded"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-foreground text-sm truncate">{product.name}</h4>
                                    <p className="text-muted-foreground text-xs truncate">{product.description}</p>
                                  </div>
                                  <div className="text-right flex flex-col items-end gap-1">
                                    <p className="font-bold text-green-600">${product.price?.toFixed(2)}</p>
                                    {isSelected ? (
                                      <Badge className="bg-orange-500 text-white text-xs">
                                        ✓ Qty: {selectedItem?.quantity}
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-xs">
                                        Tap to add
                                      </Badge>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Delivery Details */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-orange-500" />
              <h3 className="text-foreground font-semibold">Delivery Details</h3>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-foreground mb-2 block font-medium">Delivery Location *</Label>
                <Input
                  placeholder="e.g., Gym locker #45, Office building reception..."
                  value={deliveryLocation}
                  onChange={(e) => setDeliveryLocation(e.target.value)}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-muted-foreground text-xs mt-1">Provide specific location details for faster delivery</p>
              </div>
              <div>
                <Label className="text-foreground mb-2 block font-medium">Special Instructions (Optional)</Label>
                <Textarea
                  placeholder="Any special delivery instructions or access codes..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-24 focus:ring-2 focus:ring-orange-500"
                  maxLength={200}
                />
                <p className="text-muted-foreground text-xs mt-1 text-right">{specialInstructions.length}/200</p>
              </div>
            </div>
          </div>

          {/* Recovery Protocol Status */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <h3 className="text-foreground font-semibold">Recovery Protocol Status</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-lg p-3 border border-orange-200 dark:border-orange-900/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                  <span className="text-foreground text-sm font-medium">Priority Dispatch</span>
                </div>
                <span className="text-orange-600 font-bold text-xs uppercase">Engaged</span>
              </div>
              <div className="flex items-center justify-between bg-muted rounded-lg p-3">
                <span className="text-muted-foreground text-sm">Revised ETA</span>
                <span className="text-foreground font-mono font-bold">30 min</span>
              </div>
              <div className="flex items-center justify-between bg-muted rounded-lg p-3">
                <span className="text-muted-foreground text-sm">Backup Allocation</span>
                <span className="text-green-600 font-mono font-bold">Available</span>
              </div>
            </div>
          </div>

        {/* Activate Recovery Protocol */}
        <Button 
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-7 text-lg hover:from-orange-600 hover:to-orange-700 shadow-lg"
          onClick={() => createRushOrderMutation.mutate()}
          disabled={(!selectedItem && selectedProducts.length === 0) || !deliveryLocation || createRushOrderMutation.isPending}
        >
          <Zap className="w-5 h-5 mr-2" />
          {createRushOrderMutation.isPending ? 'Activating Protocol...' : 
            (() => {
              const rushFee = subscription?.rush_delivery_fee || 15;
              const freeRushesRemaining = (subscription?.rush_deliveries_included || 0) - (subscription?.rush_deliveries_used || 0);
              const actualRushFee = freeRushesRemaining > 0 ? 0 : rushFee;
              const itemsTotal = selectedProducts.length > 0 ? getTotalPrice() : 0;
              const total = itemsTotal + actualRushFee;
              
              if (selectedProducts.length > 0) {
                return actualRushFee === 0 
                  ? `Activate Recovery Mode - $${total.toFixed(2)}` 
                  : `Activate Recovery Mode - $${total.toFixed(2)}`;
              }
              
              return actualRushFee === 0 ? 'Activate Recovery Mode - Included' : `Activate Recovery Mode - $${actualRushFee.toFixed(2)}`;
            })()
          }
        </Button>
      </div>
    </div>
  );
}