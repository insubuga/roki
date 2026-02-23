import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function SmartSuggestions({ user }) {
  const navigate = useNavigate();

  const { data: suggestions = [] } = useQuery({
    queryKey: ['smartSuggestions', user?.email],
    queryFn: async () => {
      const result = await base44.functions.invoke('autoSuggestSupplements', {});
      return result.data.suggestions || [];
    },
    enabled: !!user?.email,
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const handleAddToCart = async (product) => {
    try {
      const existingCart = await base44.entities.CartItem.filter({
        user_email: user.email,
        product_id: product.id
      });

      if (existingCart.length > 0) {
        await base44.entities.CartItem.update(existingCart[0].id, {
          quantity: existingCart[0].quantity + 1
        });
      } else {
        await base44.entities.CartItem.create({
          user_email: user.email,
          product_id: product.id,
          product_name: product.name,
          price: product.price,
          quantity: 1,
          image_url: product.image_url
        });
      }
      toast.success('Scheduled for replenishment');
    } catch (error) {
      toast.error('Failed to schedule');
    }
  };

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const topSuggestion = suggestions[0];

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-gray-900 font-bold">System Recommendation</h3>
              <Badge className="bg-green-500 text-white border-none text-xs">Auto-optimized</Badge>
            </div>
            <p className="text-gray-700 text-sm mb-3">Signal analysis: {topSuggestion.product.name}</p>
            
            <div className="flex items-center gap-3 mb-4">
              {topSuggestion.product.image_url && (
                <img 
                  src={topSuggestion.product.image_url} 
                  alt={topSuggestion.product.name}
                  className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                />
              )}
              <div>
                <p className="text-gray-900 font-semibold">{topSuggestion.product.name}</p>
                <p className="text-green-600 font-bold text-lg">${topSuggestion.product.price}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700"
                onClick={() => handleAddToCart(topSuggestion.product)}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Schedule
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-gray-300 text-gray-700"
                onClick={() => navigate(createPageUrl('Shop'))}
              >
                Configure
              </Button>
            </div>

            {suggestions.length > 1 && (
              <p className="text-gray-600 text-xs mt-3">
                + {suggestions.length - 1} more suggestion{suggestions.length > 2 ? 's' : ''} available
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}