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
        title="Rush Mode Delivery"
        subtitle="Get what you need delivered within 30 minutes"
        icon={Zap}
        iconColor="text-orange-500"
      />

      {/* Premium Rush Banner */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-gray-900 font-bold text-lg">Emergency Fulfillment</h2>
            <p className="text-gray-600 text-sm">Select what you need. A courier will deliver to your gym within minutes.</p>
          </div>
        </div>
        
        {/* RokiBot Assistant */}
        <div className="mt-4 bg-white rounded-lg p-3 flex items-start gap-3 border border-orange-200 shadow-sm">
          <div className="w-8 h-8 bg-gradient-to-br from-[#7cfc00] to-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-black" />
          </div>
          <div className="flex-1">
            <p className="text-gray-900 text-sm font-semibold">Need help?</p>
            <p className="text-gray-600 text-xs">RokiBot can handle Rush Mode for you via chat.</p>
          </div>
          <Link to={createPageUrl('RokiBot')}>
            <Button size="sm" className="bg-[#FFD814] hover:bg-[#F7CA00] text-black font-semibold">
              Chat
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Select Item */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-500" />
                <h3 className="text-gray-900 font-semibold">Select Items</h3>
              </div>
              {(selectedItem || selectedProducts.length > 0) && (
                <Badge className="bg-green-500 text-white">
                  {selectionMode === 'browse' ? `${getTotalItems()} items` : 'Selected'}
                </Badge>
              )}
            </div>

            {/* Selected Items Summary for Browse Mode */}
            {selectedProducts.length > 0 && selectionMode === 'browse' && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900">Your Rush Order</span>
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
                  <div key={product.id} className="flex items-center gap-2 bg-white rounded p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                      <p className="text-xs text-gray-600">${product.price?.toFixed(2)} each</p>
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
                <div className="flex justify-between items-center pt-2 border-t border-orange-200">
                  <span className="font-semibold text-gray-900">Subtotal</span>
                  <span className="font-bold text-green-700">${getTotalPrice().toFixed(2)}</span>
                </div>
              </div>
            )}

            <Tabs value={selectionMode} onValueChange={setSelectionMode} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="quick">Quick Select</TabsTrigger>
                <TabsTrigger value="browse">Browse All</TabsTrigger>
              </TabsList>

              <TabsContent value="quick" className="space-y-3">
                <p className="text-gray-600 text-sm mb-3">Choose from your cart or recent orders</p>
                {uniqueItems.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <ShoppingBag className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600 text-sm">No recent items found</p>
                    <Button 
                      variant="link" 
                      className="mt-2 text-orange-600"
                      onClick={() => setSelectionMode('browse')}
                    >
                      Browse all products →
                    </Button>
                  </div>
                ) : (
                  <Select value={selectedItem} onValueChange={(val) => {
                    setSelectedItem(val);
                    setSelectedProducts([]);
                  }}>
                    <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900 hover:bg-gray-100 focus:ring-2 focus:ring-orange-500">
                      <SelectValue placeholder="Select from recent items or cart" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 max-h-[300px]">
                      {uniqueItems.map((item) => (
                        <SelectItem key={item.id} value={item.id} className="text-gray-900">
                          {item.name} <span className="text-gray-500 text-xs">({item.source})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </TabsContent>

              <TabsContent value="browse" className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-50 border-gray-300"
                  />
                </div>

                {/* Products Grid */}
                <div className="max-h-[500px] overflow-y-auto space-y-4">
                  {Object.keys(productsByCategory).length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <Package className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-600 text-sm">No products found</p>
                    </div>
                  ) : (
                    Object.entries(productsByCategory).map(([category, products]) => (
                      <div key={category}>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2 capitalize sticky top-0 bg-white py-2">
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
                                    <h4 className="font-medium text-gray-900 text-sm truncate">{product.name}</h4>
                                    <p className="text-gray-500 text-xs truncate">{product.description}</p>
                                  </div>
                                  <div className="text-right flex flex-col items-end gap-1">
                                    <p className="font-bold text-green-700">${product.price?.toFixed(2)}</p>
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
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-orange-500" />
              <h3 className="text-gray-900 font-semibold">Delivery Details</h3>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-900 mb-2 block font-medium">Delivery Location *</Label>
                <Input
                  placeholder="e.g., Gym locker #45, Office building reception..."
                  value={deliveryLocation}
                  onChange={(e) => setDeliveryLocation(e.target.value)}
                  className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-gray-500 text-xs mt-1">Provide specific location details for faster delivery</p>
              </div>
              <div>
                <Label className="text-gray-900 mb-2 block font-medium">Special Instructions (Optional)</Label>
                <Textarea
                  placeholder="Any special delivery instructions or access codes..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500 h-24 focus:ring-2 focus:ring-orange-500"
                  maxLength={200}
                />
                <p className="text-gray-500 text-xs mt-1 text-right">{specialInstructions.length}/200</p>
              </div>
            </div>
          </div>

          {/* Delivery Time */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-orange-500" />
              <h3 className="text-gray-900 font-semibold">Delivery Time</h3>
            </div>
            <div className="flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200">
              <div>
                <p className="text-gray-900 font-semibold">Rush Delivery</p>
                <p className="text-gray-600 text-sm">Within 30 minutes</p>
              </div>
              <span className="text-orange-600 font-bold text-lg">Now</span>
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-7 text-lg hover:from-orange-600 hover:to-orange-700 shadow-lg"
            onClick={() => createRushOrderMutation.mutate()}
            disabled={(!selectedItem && selectedProducts.length === 0) || !deliveryLocation || createRushOrderMutation.isPending}
          >
            <Zap className="w-5 h-5 mr-2" />
            {createRushOrderMutation.isPending ? 'Processing...' : 
              (() => {
                const rushFee = subscription?.rush_delivery_fee || 15;
                const freeRushesRemaining = (subscription?.rush_deliveries_included || 0) - (subscription?.rush_deliveries_used || 0);
                const actualRushFee = freeRushesRemaining > 0 ? 0 : rushFee;
                const itemsTotal = selectedProducts.length > 0 ? getTotalPrice() : 0;
                const total = itemsTotal + actualRushFee;
                
                if (selectedProducts.length > 0) {
                  return actualRushFee === 0 
                    ? `Confirm ${getTotalItems()} Items - $${total.toFixed(2)} (Rush Free)` 
                    : `Confirm ${getTotalItems()} Items - $${total.toFixed(2)}`;
                }
                
                return actualRushFee === 0 ? 'Confirm Rush - Free (Included)' : `Confirm Rush - $${actualRushFee.toFixed(2)}`;
              })()
            }
          </Button>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* How it Works */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-md">
            <h3 className="text-gray-900 font-bold text-center mb-6">How It Works</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm">1</div>
                <div>
                  <p className="text-gray-900 font-semibold">Select</p>
                  <p className="text-gray-600 text-sm">Pick your item</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm">2</div>
                <div>
                  <p className="text-gray-900 font-semibold">Confirm</p>
                  <p className="text-gray-600 text-sm">We've got it</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm">3</div>
                <div>
                  <p className="text-gray-900 font-semibold">Delivered</p>
                  <p className="text-gray-600 text-sm">~30 minutes</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rush Pricing & Benefits */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-md">
            <h3 className="text-gray-900 font-bold text-center mb-4">Your Rush Benefits</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Plan</span>
                <span className="text-gray-900 capitalize font-medium">{subscription?.plan || 'free'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Free Rushes</span>
                <span className="text-green-600 font-bold">
                  {((subscription?.rush_deliveries_included || 0) - (subscription?.rush_deliveries_used || 0)) === 999 ? '∞' : 
                   ((subscription?.rush_deliveries_included || 0) - (subscription?.rush_deliveries_used || 0))} remaining
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rush Fee After</span>
                <span className="text-gray-900 font-medium">${subscription?.rush_delivery_fee?.toFixed(2) || '15.00'}</span>
              </div>
              {subscription?.priority_dispatch && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Priority Dispatch</span>
                  <span className="text-green-600 font-semibold">✓ Enabled</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-3 mt-3">
                <span className="text-gray-900 font-semibold">Delivery Time</span>
                <span className="text-orange-600 font-bold">
                  {subscription?.priority_dispatch ? '≤ 20 min' : '≤ 30 min'}
                </span>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-amber-50 rounded-xl p-6 border border-amber-200 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="text-gray-900 font-bold">Important Notes</h3>
            </div>
            <ul className="text-gray-700 text-sm space-y-2">
              <li>• Available 6 AM - 10 PM</li>
              <li>• Local stock only</li>
              <li>• High demand may extend window</li>
              <li>• Remote locations may incur extra fees</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}