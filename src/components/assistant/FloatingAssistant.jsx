import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Bot, X, AlertCircle, TrendingUp, Zap, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function FloatingAssistant({ user }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const location = useLocation();

  const { data: wearableData } = useQuery({
    queryKey: ['wearableData', user?.email],
    queryFn: async () => {
      const data = await base44.entities.WearableData.filter({ user_email: user?.email }, '-created_date', 1);
      return data[0] || null;
    },
    enabled: !!user?.email,
    refetchInterval: 60000,
  });

  const { data: activeOrders } = useQuery({
    queryKey: ['activeOrders', user?.email],
    queryFn: async () => {
      const data = await base44.entities.Order.filter({ 
        user_email: user?.email,
        status: { $ne: 'delivered' }
      }, '-created_date', 3);
      return data || [];
    },
    enabled: !!user?.email,
  });

  const { data: activeLaundry } = useQuery({
    queryKey: ['activeLaundry', user?.email],
    queryFn: async () => {
      const data = await base44.entities.LaundryOrder.filter({ 
        user_email: user?.email,
        status: { $ne: 'picked_up' }
      }, '-created_date', 1);
      return data || [];
    },
    enabled: !!user?.email,
  });

  // Generate contextual suggestions based on page and data
  useEffect(() => {
    if (!user) return;

    const generateSuggestion = () => {
      // Shop page - wearable-based recommendations
      if (location.pathname.includes('Shop') && wearableData) {
        if (wearableData.recovery_score < 70) {
          return {
            icon: AlertCircle,
            color: 'text-blue-500',
            title: 'Recovery is low',
            message: 'Recovery supplements ready at shop.',
            action: 'Ask RokiBot',
            query: 'What supplements can help with recovery?'
          };
        }
        if (wearableData.heart_rate > 90 || wearableData.workout_intensity === 'high') {
          return {
            icon: Zap,
            color: 'text-cyan-500',
            title: 'Elevated activity detected',
            message: 'Hydration support available.',
            action: 'Ask RokiBot',
            query: 'What hydration products do you recommend?'
          };
        }
      }

      // Cart page - rush delivery suggestion
      if (location.pathname.includes('Cart')) {
        return {
          icon: Zap,
          color: 'text-orange-500',
          title: 'Need it fast?',
          message: 'Rush delivery can arrive in 30 minutes.',
          action: 'View Rush Mode',
          link: 'RushMode'
        };
      }

      // Dashboard - active orders/laundry
      if (location.pathname.includes('Dashboard')) {
        if (activeOrders?.length > 0) {
          return {
            icon: TrendingUp,
            color: 'text-green-500',
            title: 'Active deliveries',
            message: `${activeOrders.length} ${activeOrders.length === 1 ? 'order' : 'orders'} in progress.`,
            action: 'Track Orders',
            link: 'Deliveries'
          };
        }
        if (activeLaundry?.length > 0) {
          const status = activeLaundry[0].status;
          if (status === 'ready') {
            return {
              icon: AlertCircle,
              color: 'text-green-500',
              title: 'Laundry ready',
              message: 'Your clothes are ready for pickup.',
              action: 'View Details',
              link: 'LaundryOrder'
            };
          }
        }
      }

      // Profile page - wearable connection reminder
      if (location.pathname.includes('Profile') && !wearableData) {
        return {
          icon: Heart,
          color: 'text-pink-500',
          title: 'Connect your wearable',
          message: 'Get personalized supplement suggestions.',
          action: 'Connect Device',
          link: 'Wearables'
        };
      }

      return null;
    };

    const newSuggestion = generateSuggestion();
    if (newSuggestion) {
      setSuggestion(newSuggestion);
      setShowSuggestion(true);
    } else {
      setShowSuggestion(false);
    }
  }, [location.pathname, wearableData, activeOrders, activeLaundry, user]);

  if (!user) return null;

  // Don't show on RokiBot page itself
  if (location.pathname.includes('RokiBot')) return null;

  const handleActionClick = () => {
    if (suggestion?.query) {
      // Navigate to RokiBot with query parameter
      window.location.href = createPageUrl('RokiBot') + '?q=' + encodeURIComponent(suggestion.query);
    } else if (suggestion?.link) {
      window.location.href = createPageUrl(suggestion.link);
    }
    setShowSuggestion(false);
    setIsExpanded(false);
  };

  return (
    <>
      {/* Floating Button */}
      <motion.div
        className="fixed bottom-24 md:bottom-8 right-6 z-40"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
      >
        <Button
          onClick={() => {
            if (showSuggestion) {
              setIsExpanded(!isExpanded);
            } else {
              window.location.href = createPageUrl('RokiBot');
            }
          }}
          className="h-14 w-14 rounded-full bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-xl hover:shadow-2xl transition-all"
        >
          <Bot className="w-6 h-6 text-white" />
        </Button>
        {showSuggestion && !isExpanded && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </motion.div>

      {/* Suggestion Card */}
      <AnimatePresence>
        {showSuggestion && isExpanded && suggestion && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-44 md:bottom-28 right-6 z-40 w-80 max-w-[calc(100vw-3rem)]"
          >
            <Card className="bg-white border-gray-200 shadow-2xl">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`${suggestion.color} mt-1`}>
                    <suggestion.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-gray-900 font-semibold text-sm">{suggestion.title}</p>
                      <button
                        onClick={() => {
                          setIsExpanded(false);
                          setShowSuggestion(false);
                        }}
                        className="text-gray-400 hover:text-gray-600 -mr-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-gray-600 text-xs mb-3">{suggestion.message}</p>
                    <Button
                      onClick={handleActionClick}
                      size="sm"
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700"
                    >
                      {suggestion.action}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}