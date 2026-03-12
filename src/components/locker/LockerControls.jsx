import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock, KeyRound, RefreshCw, CheckCircle, MapPin, Info, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { addHours, format } from 'date-fns';

function generateCode() {
  // 4-digit, never starts with 0
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default function LockerControls({ locker, gym }) {
  const queryClient = useQueryClient();

  // Fetch active access code for this locker
  const { data: accessCode, isLoading } = useQuery({
    queryKey: ['lockerAccessCode', locker?.id],
    queryFn: () =>
      base44.entities.LockerAccessCode.filter({ locker_id: locker.id, status: 'active' })
        .then(r => r[0] || null),
    enabled: !!locker?.id,
  });

  // Fetch the active cycle for this user
  const { data: activeCycle } = useQuery({
    queryKey: ['activeCycle', locker?.user_email],
    queryFn: () =>
      base44.entities.Cycle.filter({ user_email: locker.user_email })
        .then(r => r.find(c => !['completed', 'delivered'].includes(c.status)) || null),
    enabled: !!locker?.user_email,
  });

  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      // Expire any existing active codes for this locker
      if (accessCode) {
        await base44.entities.LockerAccessCode.update(accessCode.id, { status: 'expired' });
      }
      const code = generateCode();
      return base44.entities.LockerAccessCode.create({
        locker_id: locker.id,
        cycle_id: activeCycle?.id || null,
        user_email: locker.user_email,
        code,
        expires_at: addHours(new Date(), 48).toISOString(),
        status: 'active',
      });
    },
    onSuccess: () => {
      toast.success('New access code generated');
      queryClient.invalidateQueries({ queryKey: ['lockerAccessCode', locker.id] });
    },
    onError: () => toast.error('Failed to generate code'),
  });

  const confirmDropOffMutation = useMutation({
    mutationFn: async () => {
      if (!activeCycle) throw new Error('No active cycle found');
      await base44.entities.Cycle.update(activeCycle.id, { status: 'pickup_pending' });
    },
    onSuccess: () => {
      toast.success('Drop-off confirmed! Driver notified for pickup.');
      queryClient.invalidateQueries({ queryKey: ['activeCycle'] });
    },
    onError: (err) => toast.error(err.message || 'Failed to confirm drop-off'),
  });

  const displayCode = accessCode?.code || locker?.access_code || '----';
  const isExpiringSoon = locker?.booking_end &&
    new Date(locker.booking_end) - new Date() < 24 * 60 * 60 * 1000;

  const cycleStatus = activeCycle?.status;
  const isDropped = cycleStatus === 'pickup_pending' || cycleStatus === 'in_processing';

  return (
    <div className="space-y-3">
      {/* MVP Onboarding Notice */}
      <div className="bg-muted/50 border border-border rounded-lg p-3 flex gap-2">
        <Info className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
        <p className="text-muted-foreground font-mono text-xs leading-relaxed">
          Roki lockers currently use secure access codes. Drop your gear using the code shown — your driver will collect it using the same code.
        </p>
      </div>

      {/* Access Code Display */}
      <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-green-600" />
            <span className="text-foreground font-mono text-xs font-semibold uppercase tracking-wider">
              Locker Access
            </span>
          </div>
          {accessCode && (
            <Badge className="bg-green-600/20 text-green-600 border border-green-600/40 font-mono text-xs">
              Active
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between mt-3">
          <div>
            <p className="text-muted-foreground font-mono text-xs mb-1">
              Locker #{locker.locker_number} · Access Code
            </p>
            {isLoading ? (
              <div className="w-24 h-8 bg-muted rounded animate-pulse" />
            ) : (
              <span className="text-green-600 font-mono font-bold text-3xl tracking-[0.3em]">
                {displayCode}
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-green-600 font-mono text-xs h-8"
            onClick={() => generateCodeMutation.mutate()}
            disabled={generateCodeMutation.isPending}
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${generateCodeMutation.isPending ? 'animate-spin' : ''}`} />
            Rotate
          </Button>
        </div>

        {accessCode?.expires_at && (
          <p className="text-muted-foreground font-mono text-xs mt-2">
            Expires · {format(new Date(accessCode.expires_at), 'MMM d, h:mm a')}
          </p>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-muted/30 border border-border rounded-lg p-3 space-y-1.5">
        <p className="text-muted-foreground font-mono text-xs">
          <span className="text-foreground font-semibold">1.</span> Use this code to unlock your locker when dropping gear.
        </p>
        <p className="text-muted-foreground font-mono text-xs">
          <span className="text-foreground font-semibold">2.</span> Re-lock the locker after placing your items.
        </p>
        <p className="text-muted-foreground font-mono text-xs">
          <span className="text-foreground font-semibold">3.</span> Tap <span className="text-green-600 font-semibold">Confirm Drop-Off</span> so your driver knows to pick up.
        </p>
        <p className="text-muted-foreground font-mono text-xs">
          <span className="text-foreground font-semibold">4.</span> Codes rotate each cycle for security.
        </p>
      </div>

      {/* Confirm Drop-Off CTA */}
      {activeCycle && !isDropped && (
        <Button
          className="w-full bg-green-600 hover:bg-green-700 text-white font-mono text-sm font-bold h-10"
          onClick={() => confirmDropOffMutation.mutate()}
          disabled={confirmDropOffMutation.isPending}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          {confirmDropOffMutation.isPending ? 'Confirming...' : 'Confirm Drop-Off'}
        </Button>
      )}

      {isDropped && (
        <div className="flex items-center gap-2 justify-center p-3 bg-green-600/10 border border-green-600/30 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <p className="text-green-600 font-mono text-xs font-semibold">
            Gear dropped · Driver en route for pickup
          </p>
        </div>
      )}

      {/* Location */}
      {gym && (
        <div className="flex items-start gap-2 p-3 bg-muted/30 border border-border rounded-lg">
          <MapPin className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-foreground font-mono text-xs font-semibold">{gym.name}</p>
            <p className="text-muted-foreground font-mono text-xs">{gym.address}</p>
          </div>
        </div>
      )}

      {/* Booking expiry warning */}
      {isExpiringSoon && (
        <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
          <Calendar className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <p className="text-orange-500 font-mono text-xs">Locker assignment expires within 24 hours</p>
        </div>
      )}
    </div>
  );
}