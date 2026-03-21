import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Calendar, Clock, CheckCircle, SkipForward, RefreshCw, Loader2, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import RescheduleForecastDialog from './RescheduleForecastDialog';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

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

export default function CycleForecastWidget({ user, preferences, preferredGym, subscription }) {
  const queryClient = useQueryClient();
  const [showReschedule, setShowReschedule] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showEnhancementNudge, setShowEnhancementNudge] = useState(false);

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

  const creditsRemaining = subscription
    ? Math.max(0, (subscription.laundry_credits || 0) - (subscription.laundry_credits_used || 0))
    : null;
  const outOfCredits = !subscription || creditsRemaining === 0;

  const confirmCycleMutation = useMutation({
    mutationFn: async () => {
      if (!user?.preferred_gym) throw new Error('Set your home gym in Profile first');
      const res = await base44.functions.invoke('atomicAssignLocker', {
        gymId: user.preferred_gym,
        gearVolume: 'standard',
        preferredGymName: preferredGym?.name || 'Node Assigned',
      });
      if (!res.data?.success) throw new Error(res.data?.error || 'Activation failed');
      // Mark forecast confirmed
      if (forecast?.id) {
        await base44.entities.CycleForecast.update(forecast.id, { status: 'confirmed' });
      }
    },
    onSuccess: () => {
      toast.success('Cycle confirmed · Locker soft reserved');
      queryClient.invalidateQueries({ queryKey: ['cycleForecast'] });
      queryClient.invalidateQueries({ queryKey: ['activeCycle'] });
      setShowEnhancementNudge(true);
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
    mutationFn: async (newSlot) => {
      await base44.entities.CycleForecast.update(forecast.id, { status: 'skipped' });
      return base44.entities.CycleForecast.create({
        user_id: user.email,
        ...newSlot,
        confidence_score: forecast.confidence_score,
        basis: forecast.basis,
        status: 'pending',
      });
    },
    onSuccess: () => {
      toast.success('Cycle rescheduled');
      setShowReschedule(false);
      queryClient.invalidateQueries({ queryKey: ['cycleForecast'] });
    },
    onError: () => toast.error('Failed to reschedule'),
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
            disabled={confirmCycleMutation.isPending || !user?.preferred_gym || outOfCredits}
          >
            {confirmCycleMutation.isPending
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <><CheckCircle className="w-3 h-3 mr-1" />Confirm</>}
          </Button>
          <Button
            variant="outline"
            className="border-border text-muted-foreground font-mono text-xs h-9"
            onClick={() => setShowReschedule(true)}
            disabled={rescheduleMutation.isPending}
          >
            <RefreshCw className="w-3 h-3 mr-1" />Reschedule
          </Button>
          <Button
            variant="ghost"
            className="text-muted-foreground font-mono text-xs h-9"
            onClick={() => setShowSkipConfirm(true)}
            disabled={skipMutation.isPending}
          >
            <SkipForward className="w-3 h-3 mr-1" />Skip
          </Button>
        </div>

        {!user?.preferred_gym && (
          <p className="text-orange-500 font-mono text-xs mt-2 text-center">Set your home gym in Profile to confirm</p>
        )}

        {/* Post-confirm enhancement nudge */}
        {showEnhancementNudge && (
          <div className="mt-3 bg-green-600/10 border border-green-600/30 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 font-mono text-xs font-bold">✓ Cycle Confirmed</p>
                <p className="text-muted-foreground font-mono text-xs mt-0.5">Want to add gear essentials to this cycle?</p>
              </div>
              <div className="flex gap-2">
                <Link to={createPageUrl('ActiveCycle')}>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-mono text-xs h-7">
                    Add Items
                  </Button>
                </Link>
                <Button size="sm" variant="ghost" className="font-mono text-xs h-7 text-muted-foreground"
                  onClick={() => setShowEnhancementNudge(false)}>
                  Skip
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <RescheduleForecastDialog
        open={showReschedule}
        onClose={() => setShowReschedule(false)}
        onConfirm={(slot) => rescheduleMutation.mutate(slot)}
        isPending={rescheduleMutation.isPending}
        currentForecast={forecast}
      />

      <AlertDialog open={showSkipConfirm} onOpenChange={setShowSkipConfirm}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground font-mono text-sm uppercase">Skip This Cycle?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-mono text-xs">
              This will dismiss the forecast for <span className="text-foreground font-semibold">{forecast?.predicted_drop_window}</span>. A new forecast will be generated for the following week.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted text-foreground border-border font-mono text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white font-mono text-xs"
              onClick={() => { skipMutation.mutate(); setShowSkipConfirm(false); }}
            >
              Yes, Skip Cycle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}