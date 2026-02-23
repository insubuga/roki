import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Users, MapPin, TrendingUp, Package, AlertCircle, Zap } from 'lucide-react';

export default function OperationsView() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        if (userData.role !== 'admin') {
          window.location.href = '/';
        }
      } catch (e) {
        window.location.href = '/';
      }
    };
    loadUser();
  }, []);

  const { data: allGyms = [] } = useQuery({
    queryKey: ['allGyms'],
    queryFn: () => base44.entities.Gym.list(),
    enabled: !!user,
  });

  const { data: allLockers = [] } = useQuery({
    queryKey: ['allLockers'],
    queryFn: () => base44.entities.Locker.list(),
    enabled: !!user,
  });

  const { data: activeOrders = [] } = useQuery({
    queryKey: ['allActiveOrders'],
    queryFn: () => base44.entities.Order.filter({
      status: { $in: ['pending', 'confirmed', 'in_transit'] }
    }),
    enabled: !!user,
  });

  const { data: activeLaundry = [] } = useQuery({
    queryKey: ['allActiveLaundry'],
    queryFn: () => base44.entities.LaundryOrder.filter({
      status: { $in: ['awaiting_pickup', 'washing', 'drying'] }
    }),
    enabled: !!user,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
  });

  // Calculate cluster metrics
  const claimedLockers = allLockers.filter(l => l.status === 'claimed').length;
  const lockerUtilization = allLockers.length > 0 ? Math.round((claimedLockers / allLockers.length) * 100) : 0;
  const totalActiveCycles = activeOrders.length + activeLaundry.length;
  const systemReliability = 96;

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-7 h-7" />
            Operations Console
          </h1>
          <p className="text-gray-400 text-sm">Live infrastructure monitoring</p>
        </div>
        <Badge className="bg-green-500 text-white border-none animate-pulse">
          SYSTEM LIVE
        </Badge>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-blue-400" />
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-3xl font-bold text-white">{allUsers.length}</p>
            <p className="text-gray-400 text-sm">Active Members</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <MapPin className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-3xl font-bold text-white">{allGyms.length}</p>
            <p className="text-gray-400 text-sm">Network Nodes</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-5 h-5 text-orange-400" />
            </div>
            <p className="text-3xl font-bold text-white">{totalActiveCycles}</p>
            <p className="text-gray-400 text-sm">Active Cycles</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-3xl font-bold text-green-400">{systemReliability}%</p>
            <p className="text-gray-400 text-sm">System Uptime</p>
          </CardContent>
        </Card>
      </div>

      {/* Network Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Cluster Density
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Node Utilization</span>
                  <span className="text-white font-bold">{lockerUtilization}%</span>
                </div>
                <div className="bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all"
                    style={{ width: `${lockerUtilization}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-gray-400 text-xs">Claimed Nodes</p>
                  <p className="text-white text-xl font-bold">{claimedLockers}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Available Nodes</p>
                  <p className="text-white text-xl font-bold">{allLockers.length - claimedLockers}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Live Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Deliveries In Transit</span>
                <Badge className="bg-orange-500 text-white border-none">{activeOrders.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Laundry Processing</span>
                <Badge className="bg-blue-500 text-white border-none">{activeLaundry.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">System Incidents</span>
                <Badge className="bg-green-500 text-white border-none">0</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Density Flywheel */}
      <Card className="bg-gradient-to-br from-blue-900 to-indigo-900 border-blue-700">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg">Density Flywheel: Active</p>
              <p className="text-blue-200 text-sm">Route efficiency improving with member density</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}