import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, TrendingUp, Clock, DollarSign, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RouteOptimizer({ deliveries, onRouteSelect }) {
  const [optimizedRoute, setOptimizedRoute] = useState([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  useEffect(() => {
    if (deliveries.length > 0) {
      optimizeRoute();
    }
  }, [deliveries]);

  const optimizeRoute = () => {
    // Priority sorting: Rush orders first, then by proximity (mock implementation)
    const sorted = [...deliveries].sort((a, b) => {
      // Rush orders priority
      if (a.delivery_type === 'rush' && b.delivery_type !== 'rush') return -1;
      if (a.delivery_type !== 'rush' && b.delivery_type === 'rush') return 1;
      
      // Then by estimated earnings (higher first)
      const earningsA = a.driver_earnings || (a.total * 0.15);
      const earningsB = b.driver_earnings || (b.total * 0.15);
      return earningsB - earningsA;
    });

    // Calculate totals
    const distance = sorted.reduce((sum, d) => sum + (d.distance_miles || Math.random() * 5 + 2), 0);
    const earnings = sorted.reduce((sum, d) => sum + (d.driver_earnings || (d.total * 0.15)), 0);
    const time = sorted.reduce((sum, d) => sum + (d.estimated_duration_minutes || 20), 0);

    setOptimizedRoute(sorted);
    setTotalDistance(distance);
    setTotalEarnings(earnings);
    setTotalTime(time);
  };

  if (deliveries.length === 0) return null;

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Optimized Route</h3>
              <p className="text-xs text-gray-600">{optimizedRoute.length} stops</p>
            </div>
          </div>
          <Button 
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              const waypoints = optimizedRoute
                .map(d => d.delivery_location)
                .filter(Boolean)
                .join('|');
              window.open(`https://www.google.com/maps/dir/?api=1&waypoints=${encodeURIComponent(waypoints)}`, '_blank');
            }}
          >
            Start Route
          </Button>
        </div>

        {/* Route Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-xs text-gray-600">Earnings</span>
            </div>
            <p className="text-lg font-bold text-green-700">${totalEarnings.toFixed(2)}</p>
          </div>

          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-gray-600">Distance</span>
            </div>
            <p className="text-lg font-bold text-blue-700">{totalDistance.toFixed(1)} mi</p>
          </div>

          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-xs text-gray-600">Time</span>
            </div>
            <p className="text-lg font-bold text-orange-700">{totalTime} min</p>
          </div>
        </div>

        {/* Route List */}
        <div className="space-y-2">
          {optimizedRoute.slice(0, 3).map((delivery, index) => (
            <motion.div
              key={delivery.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg p-3 border border-gray-200 hover:border-blue-300 transition-all cursor-pointer"
              onClick={() => onRouteSelect(delivery)}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-blue-700">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {delivery.delivery_location?.split(',')[0] || 'Location'}
                    </p>
                    {delivery.delivery_type === 'rush' && (
                      <Badge className="bg-red-500 text-white text-xs h-5 px-2">
                        <Zap className="w-3 h-3" />
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span>{delivery.distance_miles?.toFixed(1) || '2.5'} mi</span>
                    <span>•</span>
                    <span>${(delivery.driver_earnings || delivery.total * 0.15).toFixed(2)}</span>
                  </div>
                </div>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
            </motion.div>
          ))}
          
          {optimizedRoute.length > 3 && (
            <p className="text-xs text-center text-gray-500 py-2">
              +{optimizedRoute.length - 3} more stops
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}