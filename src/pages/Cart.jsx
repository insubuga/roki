import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ShoppingCart, Trash2, Plus, Minus, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MobileHeader from '../components/mobile/MobileHeader';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function Cart() {
  const [user, setUser] = useState(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

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

  // Handle payment status from URL
  useEffect(() => {
    const status = searchParams.get('payment');
    if (status === 'success') {
      toast.success('Order placed successfully! Check your deliveries.');
      // Clear the URL params
      window.history.replaceState({}, '', createPageUrl('Cart'));
    } else if (status === 'cancelled') {
      toast.error('Payment cancelled. Your cart is still here.');
      window.history.replaceState({}, '', createPageUrl('Cart'));
    }
  }, [searchParams]);

  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['cartItems', user?.email],
    queryFn: async () => {
      const data = await base44.entities.CartItem.filter({ user_email: user?.email });
      return data || [];
    },
    enabled: !!user?.email,
  });

  const updateQuantityMutation = useMutation({
    mutationFn: ({ id, quantity }) => base44.entities.CartItem.update(id, { quantity }),
    onMutate: async ({ id, quantity }) => {
      await queryClient.cancelQueries({ queryKey: ['cartItems', user?.email] });
      const previousItems = queryClient.getQueryData(['cartItems', user?.email]);

      queryClient.setQueryData(['cartItems', user?.email], (old) =>
        old?.map((item) => (item.id === id ? { ...item, quantity } : item))
      );

      return { previousItems };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['cartItems', user?.email], context.previousItems);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cartItems'] }),
  });

  const removeItemMutation = useMutation({
    mutationFn: (id) => base44.entities.CartItem.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['cartItems', user?.email] });
      const previousItems = queryClient.getQueryData(['cartItems', user?.email]);

      queryClient.setQueryData(['cartItems', user?.email], (old) =>
        old?.filter((item) => item.id !== id)
      );

      return { previousItems };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['cartItems', user?.email], context.previousItems);
      toast.error('Failed to remove item');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartItems'] });
      toast.success('Item removed from cart');
    },
  });

  const handleCheckout = async (deliveryType = 'standard') => {
    if (cartItems.length === 0) return;

    // Check if running in iframe (preview mode)
    if (window.self !== window.top) {
      toast.error('Checkout is not available in preview mode. Please publish your app to test payments.', {
        duration: 5000,
      });
      return;
    }

    setIsCheckingOut(true);
    try {
      console.log('Starting checkout with items:', cartItems.length);
      
      const { data } = await base44.functions.invoke('createCartCheckout', {
        cartItems: cartItems.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity || 1,
          price: item.price,
          image_url: item.image_url,
        })),
        deliveryType,
      });

      console.log('Checkout response:', data);

      if (data?.url) {
        console.log('Redirecting to Stripe:', data.url);
        toast.success('Redirecting to secure checkout...');
        setTimeout(() => {
          window.location.href = data.url;
        }, 500);
      } else {
        console.error('No URL in response:', data);
        toast.error(data?.details || 'Failed to create checkout session');
        setIsCheckingOut(false);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error.response?.data?.details || 'Failed to proceed to checkout');
      setIsCheckingOut(false);
    }
  };

  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * (item.quantity || 1)), 0);
  const deliveryFee = subtotal > 50 ? 0 : 4.99;
  const total = subtotal + deliveryFee;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--color-text-secondary)] text-sm">Loading cart...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <MobileHeader
        title="Cart"
        subtitle="Review your items"
        icon={ShoppingCart}
        iconColor="text-amber-500"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#7cfc00] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : cartItems.length === 0 ? (
        <div className="bg-[#1a2332] rounded-xl p-12 text-center border border-gray-800">
          <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl text-white font-semibold mb-2">Your cart is empty</h2>
          <p className="text-gray-400 mb-6">Add some supplements to get started</p>
          <Link to={createPageUrl('Shop')}>
            <Button className="bg-[#7cfc00] text-black hover:bg-[#6be600]">
              Browse Shop
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {cartItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="bg-[#1a2332] rounded-xl p-4 border border-gray-800 flex gap-4"
                >
                  <div className="w-24 h-24 bg-[#0d1320] rounded-lg overflow-hidden flex-shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingCart className="w-8 h-8 text-gray-700" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">{item.product_name}</h3>
                    <p className="text-[#7cfc00] font-bold mt-1">${item.price?.toFixed(2)}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-gray-700 text-gray-400 select-none"
                        onClick={() => {
                          if ((item.quantity || 1) > 1) {
                            updateQuantityMutation.mutate({ id: item.id, quantity: (item.quantity || 1) - 1 });
                          }
                        }}
                      >
                        <Minus className="w-4 h-4 select-none" />
                      </Button>
                      <span className="text-white font-medium w-8 text-center">{item.quantity || 1}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-gray-700 text-gray-400 select-none"
                        onClick={() => updateQuantityMutation.mutate({ id: item.id, quantity: (item.quantity || 1) + 1 })}
                      >
                        <Plus className="w-4 h-4 select-none" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-red-500 select-none"
                      onClick={() => removeItemMutation.mutate(item.id)}
                    >
                      <Trash2 className="w-5 h-5 select-none" />
                    </Button>
                    <p className="text-white font-bold">${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-[#1a2332] rounded-xl p-6 border border-gray-800 sticky top-24">
              <h2 className="text-xl font-bold text-white mb-4">Order Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Delivery</span>
                  <span>{deliveryFee === 0 ? 'FREE' : `$${deliveryFee.toFixed(2)}`}</span>
                </div>
                {subtotal < 50 && (
                  <p className="text-xs text-gray-500">Add ${(50 - subtotal).toFixed(2)} more for free delivery</p>
                )}
                <div className="border-t border-gray-700 pt-3 flex justify-between text-white font-bold text-lg">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
              <Button 
                className="w-full mt-6 bg-[#7cfc00] text-black hover:bg-[#6be600] font-semibold select-none"
                onClick={() => handleCheckout('standard')}
                disabled={isCheckingOut}
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin select-none" />
                    Processing...
                  </>
                ) : (
                  <>
                    Checkout
                    <ArrowRight className="w-4 h-4 ml-2 select-none" />
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                className="w-full mt-3 border-orange-500 text-orange-500 hover:bg-orange-500/10 select-none"
                onClick={() => handleCheckout('rush')}
                disabled={isCheckingOut}
              >
                <Zap className="w-4 h-4 mr-2 select-none" />
                Rush Delivery - $15
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}