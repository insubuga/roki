import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Zap, ArrowLeft, MapPin, Clock, AlertTriangle, Package, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function RushMode() {
  const [user, setUser] = useState(null);
  const [selectedItem, setSelectedItem] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
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
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cartItems', user?.email],
    queryFn: () => base44.entities.CartItem.filter({ user_email: user?.email }),
    enabled: !!user?.email,
  });

  const { data: recentOrders = [] } = useQuery({
    queryKey: ['recentOrders', user?.email],
    queryFn: () => base44.entities.Order.filter({ user_email: user?.email }, '-created_date', 5),
    enabled: !!user?.email,
  });

  const createRushOrderMutation = useMutation({
    mutationFn: async () => {
      const selectedProduct = cartItems.find(item => item.product_id === selectedItem) ||
        recentOrders.flatMap(o => o.items || []).find(i => i.product_id === selectedItem);
      
      return base44.entities.Order.create({
        user_email: user.email,
        items: [{
          product_id: selectedItem,
          product_name: selectedProduct?.product_name || 'Rush Item',
          quantity: 1,
          price: selectedProduct?.price || 0
        }],
        total: (selectedProduct?.price || 0) + 15,
        delivery_type: 'rush',
        delivery_location: deliveryLocation,
        special_instructions: specialInstructions,
        status: 'confirmed',
        estimated_delivery: new Date(Date.now() + 30 * 60000).toISOString()
      });
    },
    onSuccess: () => {
      toast.success('We've got it. Delivery in ~30 minutes.');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setSelectedItem('');
      setSpecialInstructions('');
    },
  });

  const allItems = [
    ...cartItems.map(item => ({ id: item.product_id, name: item.product_name, source: 'cart' })),
    ...recentOrders.flatMap(o => (o.items || []).map(i => ({ id: i.product_id, name: i.product_name, source: 'recent' })))
  ];

  // Deduplicate
  const uniqueItems = allItems.filter((item, index, self) =>
    index === self.findIndex(t => t.id === item.id)
  );

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
            <Zap className="w-8 h-8 text-orange-500" />
            Rush Mode Delivery
          </h1>
          <p className="text-gray-400 mt-1">Get what you need delivered within 30 minutes</p>
        </div>
      </div>

      {/* Premium Rush Banner */}
      <div className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-xl p-6 border border-orange-500/30">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-white font-bold text-lg">Emergency Fulfillment</h2>
            <p className="text-gray-300 text-sm">Select what you need. A courier will deliver to your gym within minutes.</p>
          </div>
        </div>
        
        {/* VantaBot Assistant */}
        <div className="mt-4 bg-black/20 rounded-lg p-3 flex items-start gap-3 border border-orange-500/20">
          <div className="w-8 h-8 bg-gradient-to-br from-[#7cfc00] to-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-black" />
          </div>
          <div className="flex-1">
            <p className="text-white text-sm font-semibold">Need help?</p>
            <p className="text-gray-300 text-xs">VantaBot can handle Rush Mode for you via chat.</p>
          </div>
          <Link to={createPageUrl('VantaBot')}>
            <Button size="sm" variant="outline" className="border-[#7cfc00] text-[#7cfc00] hover:bg-[#7cfc00] hover:text-black">
              Chat
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Select Item */}
          <div className="bg-[#1a2332] rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-[#7cfc00]" />
              <h3 className="text-white font-semibold">Select Item</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4 text-center">Choose from recent items or cart</p>
            <Select value={selectedItem} onValueChange={setSelectedItem}>
              <SelectTrigger className="bg-[#0d1320] border-gray-700 text-white">
                <SelectValue placeholder="Select an item for rush delivery" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2332] border-gray-700">
                {uniqueItems.length === 0 ? (
                  <SelectItem value="none" disabled className="text-gray-500">No items available</SelectItem>
                ) : (
                  uniqueItems.map((item) => (
                    <SelectItem key={item.id} value={item.id} className="text-white">
                      {item.name} ({item.source})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Delivery Details */}
          <div className="bg-[#1a2332] rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-[#7cfc00]" />
              <h3 className="text-white font-semibold">Delivery Details</h3>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-white mb-2 block">Delivery Location *</Label>
                <Input
                  placeholder="e.g., Gym locker #45, Office building reception..."
                  value={deliveryLocation}
                  onChange={(e) => setDeliveryLocation(e.target.value)}
                  className="bg-[#0d1320] border-gray-700 text-white placeholder:text-gray-500"
                />
                <p className="text-gray-500 text-xs mt-1">Provide specific location details for faster delivery</p>
              </div>
              <div>
                <Label className="text-white mb-2 block">Special Instructions (Optional)</Label>
                <Textarea
                  placeholder="Any special delivery instructions or access codes..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="bg-[#0d1320] border-gray-700 text-white placeholder:text-gray-500 h-24"
                  maxLength={200}
                />
                <p className="text-gray-500 text-xs mt-1 text-right">{specialInstructions.length}/200</p>
              </div>
            </div>
          </div>

          {/* Delivery Time */}
          <div className="bg-[#1a2332] rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-[#7cfc00]" />
              <h3 className="text-white font-semibold">Delivery Time</h3>
            </div>
            <div className="flex items-center justify-between bg-[#0d1320] rounded-lg p-4">
              <div>
                <p className="text-white font-semibold">Rush Delivery</p>
                <p className="text-gray-400 text-sm">Within 30 minutes</p>
              </div>
              <span className="text-[#7cfc00] font-bold">Now</span>
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-6 text-lg hover:from-orange-600 hover:to-amber-600"
            onClick={() => createRushOrderMutation.mutate()}
            disabled={!selectedItem || !deliveryLocation || createRushOrderMutation.isPending}
          >
            <Zap className="w-5 h-5 mr-2" />
            {createRushOrderMutation.isPending ? 'Handling...' : 'Confirm Rush - $15.00'}
          </Button>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* How it Works */}
          <div className="bg-[#1a2332] rounded-xl p-6 border border-gray-800">
            <h3 className="text-white font-bold text-center mb-6">How It Works</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">1</div>
                <div>
                  <p className="text-white font-semibold">Select</p>
                  <p className="text-gray-400 text-sm">Pick your item</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-[#7cfc00] rounded-full flex items-center justify-center text-black font-bold flex-shrink-0">2</div>
                <div>
                  <p className="text-white font-semibold">Confirm</p>
                  <p className="text-gray-400 text-sm">We've got it</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">3</div>
                <div>
                  <p className="text-white font-semibold">Delivered</p>
                  <p className="text-gray-400 text-sm">~30 minutes</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rush Pricing */}
          <div className="bg-[#1a2332] rounded-xl p-6 border border-gray-800">
            <h3 className="text-white font-bold text-center mb-4">Rush Pricing</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Base Item Price</span>
                <span className="text-white">Varies</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Rush Delivery Fee</span>
                <span className="text-[#7cfc00] font-bold">$15.00</span>
              </div>
              <div className="flex justify-between border-t border-gray-700 pt-3">
                <span className="text-white font-semibold">Delivery Time</span>
                <span className="text-[#7cfc00] font-bold">≤ 30 min</span>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-[#1a2332] rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="text-white font-bold">Notes</h3>
            </div>
            <ul className="text-gray-400 text-sm space-y-2">
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