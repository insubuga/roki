import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCycleSubscription, useLockerAssignmentSubscription } from '@/components/hooks/useCycleSubscription';
import { Lock, Navigation, CheckCircle, Clock, AlertTriangle, MapPin, Zap } from 'lucide-react';
import LockerQRCode from './LockerQRCode';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const GEO_RADIUS_METERS = 100;

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function LockerPanel({ assignment, locker, gym, onStatusChange }) {
  const queryClient = useQueryClient();
  const [checkingGeo, setCheckingGeo] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [localAssignmentOverride, setLocalAssignment] = useState(null);

  // Real-time subscription for assignment status changes
  const { assignment: liveAssignment } = useLockerAssignmentSubscription(assignment?.cycle_id, assignment?.user_id);
  const localAssignment = localAssignmentOverride || liveAssignment || assignment;

  // Check expiration on mount / every minute
  const [isExpired, setIsExpired] = useState(false);
  useEffect(() => {
    const check = () => {
      if (localAssignment?.status === 'softReserved' && localAssignment?.expires_at) {
        setIsExpired(new Date() > new Date(localAssignment.expires_at));
      } else {
        setIsExpired(false);
      }
    };
    check();
    const t = setInterval(check, 60000);
    return () => clearInterval(t);
  }, [localAssignment]);

  const activateMutation = useMutation({
    mutationFn: async () => {
      // Optimistic update
      setLocalAssignment(prev => ({ ...prev, status: 'activated', activated_at: new Date().toISOString() }));
      
      await base44.entities.CycleLockerAssignment.update(assignment.id, {
        status: 'activated',
        activated_at: new Date().toISOString(),
      });
      await base44.entities.Locker.update(locker.id, { status: 'activated' });
    },
    onSuccess: () => {
      toast.success('Locker Activated — You may now drop your gear');
      queryClient.invalidateQueries({ queryKey: ['cycleAssignment'] });
      if (onStatusChange) onStatusChange('activated');
    },
    onError: () => {
      setLocalAssignment(assignment);
      toast.error('Activation failed');
    },
  });

  const confirmDropMutation = useMutation({
    mutationFn: async () => {
      // Optimistic update
      setLocalAssignment(prev => ({ ...prev, status: 'dropped', dropped_at: new Date().toISOString() }));
      
      await base44.entities.CycleLockerAssignment.update(assignment.id, {
        status: 'dropped',
        dropped_at: new Date().toISOString(),
      });
      await base44.entities.Locker.update(locker.id, { status: 'dropped' });
      await base44.entities.Cycle.update(assignment.cycle_id, { status: 'awaiting_pickup' });
      // Cycle enters active logistics on drop confirmation
    },
    onSuccess: () => {
      toast.success('Drop confirmed · Driver notified for pickup');
      queryClient.invalidateQueries({ queryKey: ['cycleAssignment'] });
      queryClient.invalidateQueries({ queryKey: ['activeCycle'] });
      if (onStatusChange) onStatusChange('dropped');
    },
    onError: () => {
      setLocalAssignment(assignment);
      toast.error('Failed to confirm drop');
    },
  });

  const handleGeofenceCheck = () => {
    setGeoError(null);
    setCheckingGeo(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCheckingGeo(false);
        if (!gym?.latitude || !gym?.longitude) {
          // No gym coords — allow manual activation
          activateMutation.mutate();
          return;
        }
        const dist = haversineMeters(pos.coords.latitude, pos.coords.longitude, gym.latitude, gym.longitude);
        if (dist <= GEO_RADIUS_METERS) {
          activateMutation.mutate();
        } else {
          setGeoError(`You are ${Math.round(dist)}m from ${gym.name}. Get within ${GEO_RADIUS_METERS}m to activate.`);
        }
      },
      () => {
        setCheckingGeo(false);
        // Location denied — allow manual activation fallback
        activateMutation.mutate();
      },
      { timeout: 8000 }
    );
  };

  if (!localAssignment || !locker) return null;

  const { status, access_code, expires_at } = localAssignment;
  const expiryTime = expires_at ? new Date(expires_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : null;

  // ── EXPIRED ──
  if (isExpired) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <p className="text-red-500 font-mono text-xs font-bold uppercase">Reservation Expired</p>
        </div>
        <p className="text-muted-foreground font-mono text-xs">
          Your soft reservation timed out. Start a new cycle to get a locker assigned.
        </p>
      </div>
    );
  }

  // ── SOFT RESERVED ──
  if (status === 'softReserved') {
    return (
      <div className="space-y-3">
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="text-orange-500 font-mono text-xs font-bold uppercase">Locker Soft Reserved</span>
            </div>
            <Badge className="bg-orange-500/20 text-orange-500 border border-orange-500/40 font-mono text-xs">
              #{locker.locker_number}
            </Badge>
          </div>
          <p className="text-muted-foreground font-mono text-xs">
            Head to {gym?.name || 'your gym'} and tap Activate when you arrive.
          </p>
          {expiryTime && (
            <p className="text-muted-foreground font-mono text-xs mt-1">
              Reservation expires at {expiryTime}
            </p>
          )}
        </div>

        {geoError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-red-500 font-mono text-xs">{geoError}</p>
          </div>
        )}

        {gym && (
          <div className="flex items-center gap-2 p-3 bg-muted/30 border border-border rounded-lg">
            <MapPin className="w-3 h-3 text-green-600 flex-shrink-0" />
            <p className="text-muted-foreground font-mono text-xs">{gym.name}{gym.address ? ` · ${gym.address}` : ''}</p>
          </div>
        )}

        <Button
          className="w-full bg-green-600 hover:bg-green-700 text-white font-mono text-sm font-bold h-10"
          onClick={handleGeofenceCheck}
          disabled={checkingGeo || activateMutation.isPending}
        >
          <Navigation className={`w-4 h-4 mr-2 ${checkingGeo ? 'animate-pulse' : ''}`} />
          {checkingGeo ? 'Checking Location...' : activateMutation.isPending ? 'Activating...' : 'I\'m At The Gym — Activate Locker'}
        </Button>
      </div>
    );
  }

  // ── ACTIVATED ──
  if (status === 'activated') {
    return (
      <div className="space-y-3">
        <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-600" />
              <span className="text-green-600 font-mono text-xs font-bold uppercase">Locker Activated</span>
            </div>
            <Badge className="bg-green-600/20 text-green-600 border border-green-600/40 font-mono text-xs">
              #{locker.locker_number}
            </Badge>
          </div>
          <p className="text-muted-foreground font-mono text-xs mb-3">Use the code below to unlock your locker and drop your gear.</p>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground font-mono text-xs">Access Code</p>
            <span className="text-green-600 font-mono font-bold text-3xl tracking-[0.3em]">{access_code}</span>
          </div>
        </div>

        <div className="bg-muted/30 border border-border rounded-lg p-3 space-y-1.5">
          <p className="text-muted-foreground font-mono text-xs"><span className="text-foreground font-semibold">1.</span> Enter code to unlock locker #{locker.locker_number}</p>
          <p className="text-muted-foreground font-mono text-xs"><span className="text-foreground font-semibold">2.</span> Place your gear inside</p>
          <p className="text-muted-foreground font-mono text-xs"><span className="text-foreground font-semibold">3.</span> Re-lock and tap Confirm Drop below</p>
        </div>

        <LockerQRCode accessCode={access_code} lockerNumber={locker.locker_number} />

        <Button
          className="w-full bg-green-600 hover:bg-green-700 text-white font-mono text-sm font-bold h-10"
          onClick={() => confirmDropMutation.mutate()}
          disabled={confirmDropMutation.isPending}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          {confirmDropMutation.isPending ? 'Confirming...' : 'Confirm Drop — Gear Secured'}
        </Button>
      </div>
    );
  }

  // ── DROPPED ──
  if (status === 'dropped') {
    return (
      <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-4 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        <div>
          <p className="text-green-600 font-mono text-xs font-bold">Gear Secured · Driver En Route</p>
          <p className="text-muted-foreground font-mono text-xs mt-0.5">Locker #{locker.locker_number} — pickup scheduled</p>
        </div>
      </div>
    );
  }

  // ── PICKED UP / RETURNED ──
  return (
    <div className="bg-muted/30 border border-border rounded-lg p-4 flex items-center gap-3">
      <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <p className="text-muted-foreground font-mono text-xs capitalize">Locker {status} · Cycle in processing</p>
    </div>
  );
}