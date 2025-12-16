import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
  });

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#7cfc00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Shop Supplements</h1>
        <p className="text-gray-400 mt-1">Premium supplements delivered to your locker</p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <Input
            placeholder="Search supplements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#1a2332] border-gray-700 text-white placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="overflow-x-auto pb-2">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="bg-[#1a2332] border border-gray-700">
            {CATEGORIES.map((cat) => (
              <TabsTrigger 
                key={cat.value} 
                value={cat.value}
                className="data-[state=active]:bg-[#7cfc00] data-[state=active]:text-black"
              >
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

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
        <div className="text-center py-12">
          <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No products found</p>
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
                className="bg-[#1a2332] rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition-all group"
              >
                <div className="aspect-square bg-[#0d1320] rounded-lg mb-4 overflow-hidden">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingCart className="w-12 h-12 text-gray-700" />
                    </div>
                  )}
                </div>
                <Badge className="bg-[#7cfc00]/20 text-[#7cfc00] border-none mb-2">
                  {product.category?.replace('-', ' ')}
                </Badge>
                <h3 className="text-white font-semibold text-lg line-clamp-1">{product.name}</h3>
                <p className="text-gray-400 text-sm line-clamp-2 mt-1 h-10">{product.description}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-[#7cfc00] font-bold text-xl">${product.price?.toFixed(2)}</span>
                  <Button 
                    size="sm"
                    className={`${addedItems[product.id] ? 'bg-green-600' : 'bg-[#7cfc00]'} text-black hover:bg-[#6be600]`}
                    onClick={() => addToCartMutation.mutate(product)}
                    disabled={addToCartMutation.isPending}
                  >
                    {addedItems[product.id] ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}