import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Clock, Star, TrendingUp } from 'lucide-react';

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
    queryFn: () => base44.entities.Locker.get(preferences.assigned_locker_id),
    enabled: !!preferences?.assigned_locker_id,
  });

  const { data: gym } = useQuery({
    queryKey: ['lockerGym', assignedLocker?.gym_id],
    queryFn: () => base44.entities.Gym.get(assignedLocker?.gym_id),
    enabled: !!assignedLocker?.gym_id,
  });

  const pickupWindowLabels = {
    early_morning: '5–8 AM', morning: '8–11 AM', midday: '11 AM–2 PM',
    afternoon: '2–5 PM', evening: '5–8 PM', night: '8–11 PM',
  };

  const scheduleLabels = {
    weekly_monday: 'Every Monday', weekly_tuesday: 'Every Tuesday',
    weekly_wednesday: 'Every Wednesday', weekly_thursday: 'Every Thursday',
    weekly_friday: 'Every Friday', biweekly: 'Every 2 Weeks', custom: 'Custom',
  };

  const cleanlinessHistory = history.filter(h => h.event_type === 'cleanliness_rated');
  const avgCleanliness = cleanlinessHistory.length > 0
    ? (cleanlinessHistory.reduce((sum, h) => sum + (h.cleanliness_rating || 0), 0) / cleanlinessHistory.length).toFixed(1)
    : preferences?.average_cleanliness_score || 0;

  const memberSince = preferences?.member_since_formatted
    || new Date(user.created_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return (
    <div className="space-y-4">
      {/* Member Stats Card */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground flex items-center gap-2 font-mono text-sm uppercase">
            <Star className="w-4 h-4 text-green-600" />
            Member Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <p className="text-muted-foreground font-mono text-xs uppercase tracking-wider mb-1">Member Since</p>
              <p className="text-foreground font-mono font-semibold">{memberSince}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-mono text-xs uppercase tracking-wider mb-1">Total Cycles</p>
              <p className="text-foreground font-mono font-semibold">{preferences?.total_cycles_completed || 0} completed</p>
            </div>
            <div>
              <p className="text-muted-foreground font-mono text-xs uppercase tracking-wider mb-1">Deliveries</p>
              <p className="text-foreground font-mono font-semibold">{preferences?.total_deliveries_received || 0} received</p>
            </div>
            <div>
              <p className="text-muted-foreground font-mono text-xs uppercase tracking-wider mb-1">Avg Rating</p>
              <div className="flex items-center gap-1.5">
                <p className="text-foreground font-mono font-semibold">{avgCleanliness}</p>
                <Star className="w-3.5 h-3.5 text-green-600 fill-green-600" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assigned Infrastructure */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground flex items-center gap-2 font-mono text-sm uppercase">
            <MapPin className="w-4 h-4 text-green-600" />
            Assigned Infrastructure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Locker */}
          {assignedLocker && gym ? (
            <div className="flex items-center justify-between p-3 bg-green-600/10 border border-green-600/30 rounded-lg">
              <div>
                <p className="text-foreground font-mono text-sm font-semibold">{gym.name}</p>
                <p className="text-muted-foreground font-mono text-xs">Bay {assignedLocker.locker_number} · {gym.city}</p>
              </div>
              <Badge className="bg-green-600/20 text-green-600 border border-green-600/40 font-mono text-xs">Active</Badge>
            </div>
          ) : (
            <div className="p-3 bg-muted/50 border border-border rounded-lg">
              <p className="text-muted-foreground font-mono text-xs">No assigned locker</p>
            </div>
          )}

          {/* Pickup Window */}
          <div className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-green-600" />
              <p className="text-muted-foreground font-mono text-xs uppercase tracking-wider">Pickup Window</p>
            </div>
            <p className="text-foreground font-mono text-sm font-semibold">
              {pickupWindowLabels[preferences?.preferred_pickup_window] || '—'}
            </p>
          </div>

          {/* Laundry Schedule */}
          <div className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-600" />
              <p className="text-muted-foreground font-mono text-xs uppercase tracking-wider">Laundry Schedule</p>
            </div>
            <p className="text-foreground font-mono text-sm font-semibold">
              {scheduleLabels[preferences?.laundry_schedule] || '—'}
            </p>
          </div>

          {/* Historical Data inline */}
          {history.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <p className="text-muted-foreground font-mono text-xs uppercase tracking-wider">Route Contribution</p>
              </div>
              <p className="text-green-600 font-mono text-sm font-semibold">
                +{preferences?.route_density_contribution || 0}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}