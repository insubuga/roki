import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PullToRefresh from '../components/mobile/PullToRefresh';
import MobileHeader from '../components/mobile/MobileHeader';
import { Search, Filter, ShoppingCart, Plus, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'pre-workout', label: 'Pre-Workout' },
  { value: 'protein', label: 'Protein' },
  { value: 'bcaa', label: 'BCAAs' },
  { value: 'creatine', label: 'Creatine' },
  { value: 'vitamins', label: 'Vitamins' },
  { value: 'hydration', label: 'Hydration' },
  { value: 'energy', label: 'Energy' },
  { value: 'recovery', label: 'Recovery' },
];

export default function Shop() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [addedItems, setAddedItems] = useState({});
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries(['products', 'cartItems', 'pastOrders', 'wearableData']);
  };

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

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: pastOrders = [] } = useQuery({
    queryKey: ['pastOrders', user?.email],
    queryFn: () => base44.entities.Order.filter({ user_email: user?.email }, '-created_date', 10),
    enabled: !!user?.email,
  });

  const { data: wearableData } = useQuery({
    queryKey: ['wearableData', user?.email],
    queryFn: async () => {
      const data = await base44.entities.WearableData.filter({ user_email: user?.email }, '-created_date', 1);
      return data[0] || null;
    },
    enabled: !!user?.email,
  });

  // Generate personalized recommendations
  const getRecommendations = () => {
    if (!products.length) return [];
    
    const recommendations = [];
    const purchasedProductIds = new Set(
      pastOrders.flatMap(order => (order.items || []).map(item => item.product_id))
    );

    // Based on wearable data
    if (wearableData) {
      if (wearableData.recovery_score < 70) {
        const recoveryProducts = products.filter(p => p.category === 'recovery' && !purchasedProductIds.has(p.id));
        recommendations.push(...recoveryProducts.slice(0, 2));
      }
      
      if (wearableData.heart_rate > 85 || wearableData.workout_intensity === 'high' || wearableData.workout_intensity === 'extreme') {
        const hydrationProducts = products.filter(p => p.category === 'hydration' && !purchasedProductIds.has(p.id));
        const bcaaProducts = products.filter(p => p.category === 'bcaa' && !purchasedProductIds.has(p.id));
        recommendations.push(...hydrationProducts.slice(0, 1), ...bcaaProducts.slice(0, 1));
      }

      if (wearableData.workout_type === 'legs' || wearableData.workout_type === 'strength') {
        const creatineProducts = products.filter(p => p.category === 'creatine' && !purchasedProductIds.has(p.id));
        recommendations.push(...creatineProducts.slice(0, 1));
      }

      if (wearableData.workout_type) {
        const proteinProducts = products.filter(p => p.category === 'protein' && !purchasedProductIds.has(p.id));
        recommendations.push(...proteinProducts.slice(0, 1));
      }
    }

    // Based on past purchases - reorder popular items
    if (pastOrders.length > 0) {
      const productFrequency = {};
      pastOrders.forEach(order => {
        (order.items || []).forEach(item => {
          productFrequency[item.product_id] = (productFrequency[item.product_id] || 0) + 1;
        });
      });

      const frequentProducts = Object.entries(productFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 2)
        .map(([productId]) => products.find(p => p.id === productId))
        .filter(Boolean);

      recommendations.push(...frequentProducts);
    }

    // Remove duplicates and limit
    const seen = new Set();
    return recommendations.filter(p => {
      if (!p || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    }).slice(0, 4);
  };

  const recommendedProducts = getRecommendations();

  const addToCartMutation = useMutation({
    mutationFn: async (product) => {
      const existingItems = await base44.entities.CartItem.filter({
        user_email: user.email,
        product_id: product.id
      });
      
      if (existingItems.length > 0) {
        return base44.entities.CartItem.update(existingItems[0].id, {
          quantity: (existingItems[0].quantity || 1) + 1
        });
      } else {
        return base44.entities.CartItem.create({
          user_email: user.email,
          product_id: product.id,
          product_name: product.name,
          price: product.price,
          quantity: 1,
          image_url: product.image_url
        });
      }
    },
    onSuccess: (_, product) => {
      queryClient.invalidateQueries({ queryKey: ['cartItems'] });
      setAddedItems(prev => ({ ...prev, [product.id]: true }));
      toast.success('Added to cart');
      setTimeout(() => {
        setAddedItems(prev => ({ ...prev, [product.id]: false }));
      }, 2000);
    },
  });

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--color-text-secondary)] text-sm">Loading shop...</p>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-6">
      {/* Header */}
      <MobileHeader 
        title="Shop Supplements" 
        subtitle="Premium supplements delivered to your locker"
        icon={ShoppingCart}
        iconColor="text-amber-500"
      />

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search supplements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#7cfc00] focus:border-transparent"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="overflow-x-auto pb-2">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="bg-white border border-gray-200 shadow-sm">
            {CATEGORIES.map((cat) => (
              <TabsTrigger 
                key={cat.value} 
                value={cat.value}
                className="data-[state=active]:bg-[#7cfc00] data-[state=active]:text-black text-gray-700"
              >
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Personalized Recommendations */}
      {recommendedProducts.length > 0 && selectedCategory === 'all' && !searchQuery && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-gray-900 font-bold text-xl">Recommended for You</h2>
              <p className="text-gray-600 text-sm">Based on your activity and orders</p>
            </div>
            <Badge className="bg-[#FF9900] text-white border-none font-medium">Personalized</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recommendedProducts.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all group border border-gray-200"
              >
                <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingCart className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <Badge className="bg-[#7cfc00]/20 text-[#059669] border-none mb-2 font-medium">
                    {product.category?.replace('-', ' ')}
                  </Badge>
                  <h3 className="text-gray-900 font-semibold text-base line-clamp-2 mb-2 min-h-[48px]">{product.name}</h3>
                  <p className="text-gray-600 text-sm line-clamp-2 mb-3 min-h-[40px]">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-gray-500 text-xs">Price</span>
                      <div className="text-[#059669] font-bold text-xl">${product.price?.toFixed(2)}</div>
                    </div>
                    <Button 
                      size="sm"
                      className={`${addedItems[product.id] ? 'bg-green-600' : 'bg-[#FFD814] hover:bg-[#F7CA00]'} text-black font-semibold shadow-sm px-4`}
                      onClick={() => addToCartMutation.mutate(product)}
                      disabled={addToCartMutation.isPending}
                    >
                      {addedItems[product.id] ? (
                        <><Check className="w-4 h-4 mr-1" /> Added</>
                      ) : (
                        <>Add to Cart</>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* All Products */}
      {selectedCategory === 'all' && !searchQuery && recommendedProducts.length > 0 && (
        <div className="pt-4 border-t border-gray-200">
          <h2 className="text-gray-900 font-bold text-xl mb-4">All Products</h2>
        </div>
      )}

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-[#1a2332] rounded-xl p-4 animate-pulse">
              <div className="aspect-square bg-gray-700 rounded-lg mb-4" />
              <div className="h-4 bg-gray-700 rounded mb-2" />
              <div className="h-3 bg-gray-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all group border border-gray-200"
              >
                <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingCart className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <Badge className="bg-[#7cfc00]/20 text-[#059669] border-none mb-2 font-medium">
                    {product.category?.replace('-', ' ')}
                  </Badge>
                  <h3 className="text-gray-900 font-semibold text-base line-clamp-2 mb-2 min-h-[48px]">{product.name}</h3>
                  <p className="text-gray-600 text-sm line-clamp-2 mb-3 min-h-[40px]">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-gray-500 text-xs">Price</span>
                      <div className="text-[#059669] font-bold text-xl">${product.price?.toFixed(2)}</div>
                    </div>
                    <Button 
                      size="sm"
                      className={`${addedItems[product.id] ? 'bg-green-600' : 'bg-[#FFD814] hover:bg-[#F7CA00]'} text-black font-semibold shadow-sm px-4`}
                      onClick={() => addToCartMutation.mutate(product)}
                      disabled={addToCartMutation.isPending}
                    >
                      {addedItems[product.id] ? (
                        <><Check className="w-4 h-4 mr-1" /> Added</>
                      ) : (
                        <>Add to Cart</>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}