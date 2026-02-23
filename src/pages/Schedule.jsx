import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Shirt, Package, AlertCircle } from 'lucide-react';
import MobileHeader from '../components/mobile/MobileHeader';

export default function Schedule() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        setUser(null);
      }
    };
    loadUser();
  }, []);

  const { data: preferences } = useQuery({
    queryKey: ['memberPreferences', user?.email],
    queryFn: async () => {
      const prefs = await base44.entities.MemberPreferences.filter({ user_email: user?.email });
      return prefs[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: activeCycles = [] } = useQuery({
    queryKey: ['activeCycles', user?.email],
    queryFn: async () => {
      const laundry = await base44.entities.LaundryOrder.filter({
        user_email: user?.email,
        status: { $in: ['awaiting_pickup', 'washing', 'drying', 'ready'] }
      });
      const orders = await base44.entities.Order.filter({
        user_email: user?.email,
        status: { $in: ['pending', 'confirmed', 'in_transit'] }
      });
      return [...laundry, ...orders];
    },
    enabled: !!user?.email,
  });

  const scheduleLabels = {
    weekly_monday: 'Every Monday',
    weekly_tuesday: 'Every Tuesday',
    weekly_wednesday: 'Every Wednesday',
    weekly_thursday: 'Every Thursday',
    weekly_friday: 'Every Friday',
    biweekly: 'Every 2 Weeks',
    custom: 'Custom Schedule',
  };

  const pickupWindowLabels = {
    early_morning: '5-8 AM',
    morning: '8-11 AM',
    midday: '11 AM-2 PM',
    afternoon: '2-5 PM',
    evening: '5-8 PM',
    night: '8-11 PM',
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MobileHeader
        title="Cycle Schedule"
        subtitle="Automated pickup and delivery"
        icon={Calendar}
        iconColor="text-blue-600"
      />

      {/* Active Configuration */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Active Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <p className="text-gray-500 text-xs uppercase mb-1">Cycle Frequency</p>
              <p className="text-gray-900 font-semibold">
                {scheduleLabels[preferences?.laundry_schedule] || 'Not configured'}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <p className="text-gray-500 text-xs uppercase mb-1">Pickup Window</p>
              <p className="text-gray-900 font-semibold">
                {pickupWindowLabels[preferences?.preferred_pickup_window] || 'Not set'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Cycles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4" />
            Active Cycles ({activeCycles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeCycles.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No active cycles</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeCycles.map((cycle) => (
                <div key={cycle.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {cycle.status ? (
                        <Shirt className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Package className="w-4 h-4 text-green-600" />
                      )}
                      <p className="font-semibold text-gray-900">
                        {cycle.order_number ? `Cycle #${cycle.order_number}` : `Delivery #${cycle.id?.slice(-6)}`}
                      </p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 border-none">
                      {cycle.status || 'Processing'}
                    </Badge>
                  </div>
                  {cycle.estimated_delivery && (
                    <p className="text-gray-600 text-sm">ETA: {cycle.estimated_delivery}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Guarantee */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-gray-900 font-bold">95% On-Time Guarantee</p>
              <p className="text-gray-600 text-sm">System maintained reliability standard</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}