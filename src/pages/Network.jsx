import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, TrendingUp, Lock, Map } from 'lucide-react';
import MobileHeader from '../components/mobile/MobileHeader';

export default function Network() {
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

  const { data: assignedLocker } = useQuery({
    queryKey: ['assignedLocker', preferences?.assigned_locker_id],
    queryFn: async () => {
      if (!preferences?.assigned_locker_id) return null;
      return await base44.entities.Locker.get(preferences.assigned_locker_id);
    },
    enabled: !!preferences?.assigned_locker_id,
  });

  const { data: gym } = useQuery({
    queryKey: ['lockerGym', assignedLocker?.gym_id],
    queryFn: () => base44.entities.Gym.get(assignedLocker?.gym_id),
    enabled: !!assignedLocker?.gym_id,
  });

  const { data: clusterStats = {} } = useQuery({
    queryKey: ['clusterStats', assignedLocker?.gym_id],
    queryFn: async () => {
      if (!assignedLocker?.gym_id) return {};
      const totalLockers = await base44.entities.Locker.filter({ gym_id: assignedLocker.gym_id });
      const claimedLockers = totalLockers.filter(l => l.status === 'claimed');
      return {
        total: totalLockers.length,
        claimed: claimedLockers.length,
        utilization: Math.round((claimedLockers.length / totalLockers.length) * 100)
      };
    },
    enabled: !!assignedLocker?.gym_id,
  });

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
        title="Network Infrastructure"
        subtitle="Distribution node status"
        icon={Map}
        iconColor="text-purple-600"
      />

      {/* Assigned Node */}
      {assignedLocker && gym ? (
        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-600" />
              Assigned Node
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-gray-500 text-xs uppercase mb-1">Location</p>
              <p className="text-gray-900 font-bold text-lg">{gym.name}</p>
              <p className="text-gray-600 text-sm">{gym.address}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 border border-purple-200">
                <p className="text-gray-500 text-xs uppercase mb-1">Bay ID</p>
                <p className="text-gray-900 font-mono font-bold">{assignedLocker.locker_number}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-purple-200">
                <p className="text-gray-500 text-xs uppercase mb-1">Access Code</p>
                <p className="text-green-600 font-mono font-bold">{assignedLocker.access_code}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-6 text-center">
            <Lock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No node assigned</p>
            <p className="text-gray-500 text-sm mt-1">Configure in Profile</p>
          </CardContent>
        </Card>
      )}

      {/* Cluster Health */}
      {clusterStats.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Cluster Density
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{clusterStats.claimed}</p>
                <p className="text-gray-500 text-xs">Active Nodes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{clusterStats.total}</p>
                <p className="text-gray-500 text-xs">Total Capacity</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{clusterStats.utilization}%</p>
                <p className="text-gray-500 text-xs">Utilization</p>
              </div>
            </div>
            <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-600 h-full transition-all"
                style={{ width: `${clusterStats.utilization}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Network Effect */}
      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-gray-900 font-bold">Density Advantage Active</p>
              <p className="text-gray-600 text-sm">Route efficiency: {preferences?.route_density_contribution || 0}% contribution</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}