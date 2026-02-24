import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PullToRefresh from '../components/mobile/PullToRefresh';
import MobileHeader from '../components/mobile/MobileHeader';
import { Search, Filter, ShoppingCart, Plus, Check, ArrowUpDown, Tag, Star, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

const ITEMS_PER_PAGE = 12;

export default function Shop() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [currentPage, setCurrentPage] = useState(1);
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
    onMutate: async (product) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['cartItems'] });
      
      // Snapshot previous value
      const previousCart = queryClient.getQueryData(['cartItems', user?.email]);
      
      // Optimistically update
      setAddedItems(prev => ({ ...prev, [product.id]: true }));
      
      return { previousCart };
    },
    onSuccess: (_, product) => {
      queryClient.invalidateQueries({ queryKey: ['cartItems'] });
      toast.success('Added to supply queue');
      setTimeout(() => {
        setAddedItems(prev => ({ ...prev, [product.id]: false }));
      }, 2000);
    },
    onError: (err, product, context) => {
      // Rollback on error
      if (context?.previousCart) {
        queryClient.setQueryData(['cartItems', user?.email], context.previousCart);
      }
      setAddedItems(prev => ({ ...prev, [product.id]: false }));
      toast.error('Failed to add');
    },
  });

  const filteredAndSortedProducts = (() => {
    // Filter
    let filtered = products.filter(product => {
      const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'featured':
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          if (a.on_sale && !b.on_sale) return -1;
          if (!a.on_sale && b.on_sale) return 1;
          return 0;
        case 'price-low':
          const priceA = a.on_sale && a.sale_price ? a.sale_price : a.price;
          const priceB = b.on_sale && b.sale_price ? b.sale_price : b.price;
          return priceA - priceB;
        case 'price-high':
          const priceA2 = a.on_sale && a.sale_price ? a.sale_price : a.price;
          const priceB2 = b.on_sale && b.sale_price ? b.sale_price : b.price;
          return priceB2 - priceA2;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  })();

  // Pagination
  const paginatedProducts = filteredAndSortedProducts;

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortBy]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Loading modules...</p>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-6">
      {/* Header */}
      <MobileHeader 
        title="Optimization Modules" 
        subtitle="Performance enhancement catalog"
        icon={Sparkles}
        iconColor="text-purple-500"
      />

      {/* Personalized First */}
      {recommendedProducts.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h3 className="text-foreground font-semibold text-base mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-600" />
              Auto-Optimized
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recommendedProducts.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  addedItems={addedItems}
                  addToCartMutation={addToCartMutation}
                />
              ))}
            </div>
          </CardContent>
        </Card>
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
      ) : filteredAndSortedProducts.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg shadow-sm border border-border">
          <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No products found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {paginatedProducts.map((product) => (
                <ProductCard 
                  key={product.id}
                  product={product}
                  addedItems={addedItems}
                  addToCartMutation={addToCartMutation}
                />
              ))}
            </AnimatePresence>
          </div>


        </>
      )}
    </div>
    </PullToRefresh>
  );
}

// Product Card Component
function ProductCard({ product, addedItems, addToCartMutation }) {
  const displayPrice = product.on_sale && product.sale_price ? product.sale_price : product.price;
  const hasDiscount = product.on_sale && product.sale_price && product.sale_price < product.price;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-card rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all group border border-border relative"
    >
      {/* Badges */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        {product.featured && (
          <Badge className="bg-yellow-500 text-white border-none font-medium shadow-md">
            <Star className="w-3 h-3 mr-1 fill-white" />
            Featured
          </Badge>
        )}
        {product.on_sale && (
          <Badge className="bg-red-500 text-white border-none font-medium shadow-md">
            <Tag className="w-3 h-3 mr-1" />
            Sale
          </Badge>
        )}
      </div>

      <div className="aspect-square bg-gradient-to-br from-muted to-accent overflow-hidden">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCart className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="p-4">
        <Badge className="bg-green-600/20 text-green-700 border-none mb-2 font-medium">
          {product.category?.replace('-', ' ')}
        </Badge>
        <h3 className="text-foreground font-semibold text-base line-clamp-2 mb-2 min-h-[48px]">{product.name}</h3>
        <p className="text-muted-foreground text-sm line-clamp-2 mb-3 min-h-[40px]">{product.description}</p>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-muted-foreground text-xs">Price</span>
            <div className="flex items-center gap-2">
              {hasDiscount && (
                <span className="text-muted-foreground line-through text-sm">${product.price?.toFixed(2)}</span>
              )}
              <div className={`${hasDiscount ? 'text-red-600' : 'text-green-600'} font-bold text-xl`}>
                ${displayPrice?.toFixed(2)}
              </div>
            </div>
          </div>
          <Button 
            size="sm"
            className={`${addedItems[product.id] ? 'bg-green-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'} font-semibold shadow-sm px-4`}
            onClick={() => addToCartMutation.mutate(product)}
            disabled={addToCartMutation.isPending}
          >
            {addedItems[product.id] ? (
              <><Check className="w-4 h-4 mr-1" /> Added</>
            ) : (
              <>Add</>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}