import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Calendar, Clock, CheckCircle, SkipForward, RefreshCw, Loader2, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const WINDOW_HOURS = {
  early_morning: { label: '5–8 AM', start: 5, end: 8 },
  morning: { label: '8–11 AM', start: 8, end: 11 },
  midday: { label: '11 AM–2 PM', start: 11, end: 14 },
  afternoon: { label: '2–5 PM', start: 14, end: 17 },
  evening: { label: '4–8 PM', start: 16, end: 20 },
  night: { label: '7–10 PM', start: 19, end: 22 },
};

const SCHEDULE_DAY_MAP = {
  weekly_monday: 1, weekly_tuesday: 2, weekly_wednesday: 3,
  weekly_thursday: 4, weekly_friday: 5,
};

function buildForecast(user, preferences) {
  const now = new Date();
  const window = WINDOW_HOURS[preferences?.preferred_pickup_window] || WINDOW_HOURS.evening;
  const targetDay = SCHEDULE_DAY_MAP[preferences?.laundry_schedule] ?? 2; // default Tuesday
  const totalCycles = preferences?.total_cycles_completed || 0;

  // Find next occurrence of target day
  const daysUntil = (targetDay - now.getDay() + 7) % 7 || 7;
  const predictedDate = new Date(now);
  predictedDate.setDate(now.getDate() + daysUntil);
  predictedDate.setHours(window.start, 0, 0, 0);

  const windowEnd = new Date(predictedDate);
  windowEnd.setHours(window.end, 0, 0, 0);

  // Confidence based on history + schedule set
  let confidence = 60;
  if (preferences?.laundry_schedule && preferences.laundry_schedule !== 'custom') confidence += 15;
  if (preferences?.preferred_pickup_window) confidence += 10;
  if (totalCycles >= 3) confidence += 10;
  if (totalCycles >= 10) confidence += 5;

  const dayName = DAY_NAMES[predictedDate.getDay()];
  const basis = [
    preferences?.laundry_schedule ? 'workout schedule' : null,
    preferences?.preferred_pickup_window ? 'route window preference' : null,
    totalCycles > 0 ? 'historical cycle pattern' : null,
  ].filter(Boolean).join(', ') || 'default schedule';

  return {
    user_id: user.email,
    predicted_date: predictedDate.toISOString().split('T')[0],
    predicted_drop_window: `${dayName} ${window.label}`,
    predicted_drop_window_start: predictedDate.toISOString(),
    predicted_drop_window_end: windowEnd.toISOString(),
    confidence_score: Math.min(confidence, 95),
    status: 'pending',
    basis,
  };
}

export default function CycleForecastWidget({ user, preferences, preferredGym }) {
  const queryClient = useQueryClient();

  const { data: forecast, isLoading } = useQuery({
    queryKey: ['cycleForecast', user?.email],
    queryFn: async () => {
      const forecasts = await base44.entities.CycleForecast.filter({
        user_id: user.email,
        status: 'pending',
      }, '-created_date', 1);
      return forecasts[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: activeCycle } = useQuery({
    queryKey: ['activeCycle', user?.email],
    queryFn: async () => {
      const cycles = await base44.entities.Cycle.filter({
        user_email: user.email,
        status: { $in: ['prepared', 'awaiting_pickup', 'washing', 'drying', 'ready'] }
      }, '-created_date', 1);
      return cycles[0] || null;
    },
    enabled: !!user?.email,
  });

  // Auto-generate forecast if none exists and no active cycle
  const generateForecastMutation = useMutation({
    mutationFn: async () => {
      const data = buildForecast(user, preferences);
      return base44.entities.CycleForecast.create(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cycleForecast'] }),
  });

  useEffect(() => {
    if (!isLoading && !forecast && !activeCycle && user && preferences) {
      generateForecastMutation.mutate();
    }
  }, [isLoading, forecast, activeCycle, user, preferences]);

  // Expire stale forecasts
  useEffect(() => {
    if (forecast?.status === 'pending' && forecast?.predicted_drop_window_end) {
      if (new Date() > new Date(forecast.predicted_drop_window_end)) {
        base44.entities.CycleForecast.update(forecast.id, { status: 'expired' })
          .then(() => queryClient.invalidateQueries({ queryKey: ['cycleForecast'] }));
      }
    }
  }, [forecast]);

  const confirmCycleMutation = useMutation({
    mutationFn: async () => {
      if (!user?.preferred_gym) throw new Error('Set your home gym in Profile first');

      const available = await base44.entities.Locker.filter({
        gym_id: user.preferred_gym,
        status: 'available',
      });
      if (available.length === 0) throw new Error('Locker Capacity Reached — Please wait for next route window.');

      const locker = available[0];
      const code = String(Math.floor(1000 + Math.random() * 9000));
      const batchId = `B${Date.now().toString(36).toUpperCase()}`;

      const cycle = await base44.entities.Cycle.create({
        user_email: user.email,
        order_number: batchId,
        drop_off_date: new Date().toISOString(),
        status: 'prepared',
        items: Array(8).fill('Unit'),
        gym_location: preferredGym?.name || 'Node Assigned',
      });

      await base44.entities.CycleLockerAssignment.create({
        cycle_id: cycle.id,
        locker_id: locker.id,
        user_id: user.email,
        access_code: code,
        status: 'softReserved',
        assigned_at: new Date().toISOString(),
        expires_at: forecast.predicted_drop_window_end,
      });

      await base44.entities.Locker.update(locker.id, { status: 'softReserved' });
      await base44.entities.CycleForecast.update(forecast.id, { status: 'confirmed' });

      // Notify member with access code and reservation window
      await base44.entities.Notification.create({
        user_email: user.email,
        type: 'cycle_activated',
        title: 'Locker Reserved — Drop Off Ready',
        message: `Cycle confirmed for ${forecast.predicted_drop_window}. Locker reserved at ${preferredGym?.name || 'your gym'}. Access code: ${code}. Drop gear before your window ends.`,
        priority: 'high',
        read: false,
      });

      await base44.entities.ReliabilityLog.create({
        user_email: user.email,
        event_type: 'on_time_delivery',
        promised_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      });
    },
    onSuccess: () => {
      toast.success('Cycle confirmed · Locker soft reserved');
      queryClient.invalidateQueries({ queryKey: ['cycleForecast'] });
      queryClient.invalidateQueries({ queryKey: ['activeCycle'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const skipMutation = useMutation({
    mutationFn: () => base44.entities.CycleForecast.update(forecast.id, { status: 'skipped' }),
    onSuccess: () => {
      toast.success('Forecast skipped');
      queryClient.invalidateQueries({ queryKey: ['cycleForecast'] });
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.CycleForecast.update(forecast.id, { status: 'skipped' });
      // Push 1 week out
      const shiftedPrefs = { ...preferences };
      const data = buildForecast(user, shiftedPrefs);
      const nextDate = new Date(data.predicted_drop_window_start);
      nextDate.setDate(nextDate.getDate() + 7);
      const nextEnd = new Date(data.predicted_drop_window_end);
      nextEnd.setDate(nextEnd.getDate() + 7);
      const dayName = DAY_NAMES[nextDate.getDay()];
      const window = WINDOW_HOURS[preferences?.preferred_pickup_window] || WINDOW_HOURS.evening;
      return base44.entities.CycleForecast.create({
        ...data,
        predicted_date: nextDate.toISOString().split('T')[0],
        predicted_drop_window: `${dayName} ${window.label}`,
        predicted_drop_window_start: nextDate.toISOString(),
        predicted_drop_window_end: nextEnd.toISOString(),
        status: 'pending',
      });
    },
    onSuccess: () => {
      toast.success('Cycle rescheduled to next week');
      queryClient.invalidateQueries({ queryKey: ['cycleForecast'] });
    },
  });

  // Don't show widget if cycle is already active
  if (activeCycle) return null;
  if (isLoading) return null;
  if (!forecast) return null;

  const confidence = forecast.confidence_score || 0;
  const confidenceColor = confidence >= 80 ? 'text-green-600' : confidence >= 60 ? 'text-yellow-500' : 'text-orange-500';

  return (
    <Card className="bg-card border-2 border-purple-600/40">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <h3 className="text-foreground font-mono font-semibold text-sm uppercase">Next Cycle Forecast</h3>
          </div>
          <Badge className="bg-purple-600/20 text-purple-400 border border-purple-600/40 font-mono text-xs">
            {confidence}% confidence
          </Badge>
        </div>

        <div className="bg-muted/50 rounded-lg p-3 mb-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3 text-purple-500" />
            <p className="text-foreground font-mono text-sm font-bold">{forecast.predicted_drop_window}</p>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-3 h-3 text-muted-foreground" />
            <p className="text-muted-foreground font-mono text-xs">Locker Reservation: Pending Confirmation</p>
          </div>
          {forecast.basis && (
            <p className="text-muted-foreground font-mono text-xs">Based on: {forecast.basis}</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            className="bg-green-600 hover:bg-green-700 text-white font-mono text-xs h-9 col-span-1"
            onClick={() => confirmCycleMutation.mutate()}
            disabled={confirmCycleMutation.isPending || !user?.preferred_gym}
          >
            {confirmCycleMutation.isPending
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <><CheckCircle className="w-3 h-3 mr-1" />Confirm</>}
          </Button>
          <Button
            variant="outline"
            className="border-border text-muted-foreground font-mono text-xs h-9"
            onClick={() => rescheduleMutation.mutate()}
            disabled={rescheduleMutation.isPending}
          >
            {rescheduleMutation.isPending
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <><RefreshCw className="w-3 h-3 mr-1" />Reschedule</>}
          </Button>
          <Button
            variant="ghost"
            className="text-muted-foreground font-mono text-xs h-9"
            onClick={() => skipMutation.mutate()}
            disabled={skipMutation.isPending}
          >
            {skipMutation.isPending
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <><SkipForward className="w-3 h-3 mr-1" />Skip</>}
          </Button>
        </div>

        {!user?.preferred_gym && (
          <p className="text-orange-500 font-mono text-xs mt-2 text-center">Set your home gym in Profile to confirm</p>
        )}
      </CardContent>
    </Card>
  );
}