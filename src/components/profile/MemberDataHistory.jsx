import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Clock, Star, TrendingUp, Package, Shirt } from 'lucide-react';

export default function MemberDataHistory({ user }) {
  const { data: preferences } = useQuery({
    queryKey: ['memberPreferences', user?.email],
    queryFn: async () => {
      const prefs = await base44.entities.MemberPreferences.filter({ user_email: user?.email });
      return prefs[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['memberHistory', user?.email],
    queryFn: () => base44.entities.MemberHistory.filter({ user_email: user?.email }, '-created_date', 50),
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

  const pickupWindowLabels = {
    early_morning: '5-8 AM',
    morning: '8-11 AM',
    midday: '11 AM-2 PM',
    afternoon: '2-5 PM',
    evening: '5-8 PM',
    night: '8-11 PM',
  };

  const scheduleLabels = {
    weekly_monday: 'Every Monday',
    weekly_tuesday: 'Every Tuesday',
    weekly_wednesday: 'Every Wednesday',
    weekly_thursday: 'Every Thursday',
    weekly_friday: 'Every Friday',
    biweekly: 'Every 2 Weeks',
    custom: 'Custom Schedule',
  };

  const cleanlinessHistory = history.filter(h => h.event_type === 'cleanliness_rated');
  const avgCleanliness = cleanlinessHistory.length > 0
    ? (cleanlinessHistory.reduce((sum, h) => sum + (h.cleanliness_rating || 0), 0) / cleanlinessHistory.length).toFixed(1)
    : preferences?.average_cleanliness_score || 0;

  return (
    <div className="space-y-4">
      {/* Member ID Card */}
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 text-white">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            Member Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-xs uppercase mb-1">Member Since</p>
              <p className="text-white font-semibold">{preferences?.member_since_formatted || new Date(user.created_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase mb-1">Total Cycles</p>
              <p className="text-white font-semibold">{preferences?.total_cycles_completed || 0} completed</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase mb-1">Deliveries</p>
              <p className="text-white font-semibold">{preferences?.total_deliveries_received || 0} received</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase mb-1">Avg Rating</p>
              <div className="flex items-center gap-2">
                <p className="text-yellow-400 font-semibold text-lg">{avgCleanliness}</p>
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assigned Infrastructure */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Assigned Infrastructure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {assignedLocker && gym ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-xs uppercase">Locker Node</p>
                <Badge className="bg-green-500 text-white border-none text-xs">Active</Badge>
              </div>
              <p className="text-gray-900 font-bold">{gym.name}</p>
              <p className="text-gray-600 text-sm">Bay {assignedLocker.locker_number} • {gym.city}</p>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-gray-500 text-sm">No assigned locker</p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <p className="text-gray-600 text-xs uppercase">Pickup Window</p>
            </div>
            <p className="text-gray-900 font-semibold">
              {pickupWindowLabels[preferences?.preferred_pickup_window] || 'Not set'}
            </p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <p className="text-gray-600 text-xs uppercase">Laundry Schedule</p>
            </div>
            <p className="text-gray-900 font-semibold">
              {scheduleLabels[preferences?.laundry_schedule] || 'Not configured'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Historical Performance */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Historical Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {history.length > 0 ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Data points tracked</span>
                  <span className="font-semibold text-gray-900">{history.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Cleanliness ratings</span>
                  <span className="font-semibold text-gray-900">{cleanlinessHistory.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Route optimization</span>
                  <span className="font-semibold text-green-600">+{preferences?.route_density_contribution || 0}%</span>
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-sm">Building your history...</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}