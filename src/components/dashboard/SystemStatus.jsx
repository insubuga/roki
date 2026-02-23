import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Package, MapPin, TrendingUp, Zap, Shirt } from 'lucide-react';

export default function SystemStatus({ user }) {
  const { data: subscription } = useQuery({
    queryKey: ['subscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({ user_email: user?.email });
      return subs[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: activeOrders = [] } = useQuery({
    queryKey: ['activeOrders', user?.email],
    queryFn: () => base44.entities.Order.filter({ 
      user_email: user?.email,
      status: { $in: ['pending', 'confirmed', 'in_transit'] }
    }),
    enabled: !!user?.email,
  });

  const { data: activeLaundry = [] } = useQuery({
    queryKey: ['activeLaundry', user?.email],
    queryFn: () => base44.entities.LaundryOrder.filter({
      user_email: user?.email,
      status: { $in: ['awaiting_pickup', 'washing', 'drying'] }
    }),
    enabled: !!user?.email,
  });

  const { data: locker } = useQuery({
    queryKey: ['userLocker', user?.email],
    queryFn: async () => {
      const lockers = await base44.entities.Locker.filter({ user_email: user?.email, status: 'claimed' });
      return lockers[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: gym } = useQuery({
    queryKey: ['gym', locker?.gym_id],
    queryFn: () => base44.entities.Gym.get(locker?.gym_id),
    enabled: !!locker?.gym_id,
  });

  // Calculate readiness status
  const getReadinessStatus = () => {
    if (activeLaundry.length > 0) {
      const hasWashing = activeLaundry.some(l => l.status === 'washing' || l.status === 'drying');
      if (hasWashing) return { status: 'PROCESSING', color: 'bg-yellow-500', icon: Clock };
    }
    if (activeOrders.length > 0) {
      return { status: 'IN TRANSIT', color: 'bg-blue-500', icon: Package };
    }
    return { status: 'READY', color: 'bg-green-500', icon: CheckCircle };
  };

  const readiness = getReadinessStatus();
  const StatusIcon = readiness.icon;

  // Calculate next cycle
  const getNextCycle = () => {
    if (!subscription?.renewal_date) return 'Not scheduled';
    const date = new Date(subscription.renewal_date);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${dayName} ${time}`;
  };

  // Calculate reliability score
  const { data: completedOrders = [] } = useQuery({
    queryKey: ['completedOrders', user?.email],
    queryFn: () => base44.entities.Order.filter({ 
      user_email: user?.email,
      status: 'delivered'
    }),
    enabled: !!user?.email,
  });

  const reliabilityScore = completedOrders.length > 0 
    ? Math.round((completedOrders.length / (completedOrders.length + activeOrders.length + 1)) * 100)
    : 96;

  return (
    <div className="space-y-4">
      {/* Main Status Card */}
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${readiness.color} animate-pulse`} />
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide">System Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <StatusIcon className="w-5 h-5" />
                  <h2 className="text-2xl font-bold">{readiness.status}</h2>
                </div>
              </div>
            </div>
            <Badge className="bg-gray-700 text-white border-none text-sm px-3 py-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              {reliabilityScore}% Uptime
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Next Cycle */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <p className="text-gray-400 text-xs uppercase">Next Cycle</p>
              </div>
              <p className="text-white font-semibold text-sm">{getNextCycle()}</p>
            </div>

            {/* Backup Credits */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-orange-400" />
                <p className="text-gray-400 text-xs uppercase">Rush Available</p>
              </div>
              <p className="text-white font-semibold text-sm">
                {subscription?.rush_deliveries_included - (subscription?.rush_deliveries_used || 0) || 0} Remaining
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Infrastructure Status */}
      <div className="grid grid-cols-2 gap-3">
        {/* Locker Node */}
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <p className="text-gray-500 text-xs uppercase">Locker Node</p>
            </div>
            {locker && gym ? (
              <div>
                <p className="text-gray-900 font-semibold text-sm">{gym.name}</p>
                <p className="text-gray-600 text-xs">Bay {locker.locker_number}</p>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Not configured</p>
            )}
          </CardContent>
        </Card>

        {/* Active Operations */}
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shirt className="w-4 h-4 text-gray-500" />
              <p className="text-gray-500 text-xs uppercase">Operations</p>
            </div>
            <div className="space-y-1">
              {activeLaundry.length > 0 && (
                <p className="text-gray-900 text-sm font-medium">{activeLaundry.length} Execution cycle</p>
              )}
              {activeOrders.length > 0 && (
                <p className="text-gray-600 text-xs">{activeOrders.length} in transit</p>
              )}
              {activeLaundry.length === 0 && activeOrders.length === 0 && (
                <p className="text-gray-400 text-sm">Idle</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}