import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOptimisticUpdate } from '@/components/hooks/useOptimisticUpdate';
import { Shirt, CheckCircle, Lock, Key, Star, Sparkles } from 'lucide-react';
import LockerQRCode from './LockerQRCode';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function ReturnLockerPanel({ returnAssignment, locker, gym, cycleId }) {
  const queryClient = useQueryClient();
  const [confirmed, setConfirmed] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);

  const handleCollect = async () => {
    // Optimistic: show success immediately
    setConfirmed(true);
    setShowRating(true);
    setIsPending(true);
    try {
      await base44.entities.ReturnLockerAssignment.update(returnAssignment.id, { status: 'collected' });
      await base44.entities.Locker.update(locker.id, { status: 'resetPending' });
      if (cycleId) await base44.entities.Cycle.update(cycleId, { status: 'picked_up' });
      queryClient.invalidateQueries({ queryKey: ['returnAssignment'] });
      queryClient.invalidateQueries({ queryKey: ['activeCycle'] });
    } catch {
      // rollback
      setConfirmed(false);
      setShowRating(false);
      toast.error('Failed to confirm collection');
    } finally {
      setIsPending(false);
    }
  };

  // Keep collectMutation alias for isPending check in UI
  const collectMutation = { isPending };

  const submitRatingMutation = useMutation({
    mutationFn: async (stars) => {
      await base44.entities.MemberHistory.create({
        user_email: returnAssignment.user_email,
        event_type: 'cleanliness_rated',
        cleanliness_rating: stars,
        locker_id: locker.id,
        event_data: { cycle_id: cycleId, rating: stars },
      });
    },
    onSuccess: () => {
      toast.success('Thanks for your feedback!');
      setShowRating(false);
      queryClient.invalidateQueries({ queryKey: ['returnAssignment'] });
    },
  });

  if (!returnAssignment || !locker) return null;

  const { status, access_code } = returnAssignment;

  // ── COLLECTED ── (post-confirmation delight moment)
  if (status === 'collected' || confirmed) {
    if (showRating) {
      return (
        <div className="bg-green-600/10 border border-green-600/30 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-green-600 font-mono font-bold text-sm">Gear Collected!</p>
              <p className="text-muted-foreground font-mono text-xs">How clean was your gear?</p>
            </div>
          </div>
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`transition-transform hover:scale-110 ${rating >= star ? 'text-yellow-400' : 'text-muted-foreground'}`}
              >
                <Star className={`w-8 h-8 ${rating >= star ? 'fill-yellow-400' : ''}`} />
              </button>
            ))}
          </div>
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white font-mono text-sm h-10"
            disabled={rating === 0 || submitRatingMutation.isPending}
            onClick={() => submitRatingMutation.mutate(rating)}
          >
            {submitRatingMutation.isPending ? 'Submitting...' : 'Submit Rating'}
          </Button>
          <button
            onClick={() => setShowRating(false)}
            className="w-full text-muted-foreground font-mono text-xs hover:text-foreground transition-colors"
          >
            Skip
          </button>
        </div>
      );
    }
    return (
      <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-4 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        <div>
          <p className="text-green-600 font-mono text-xs font-bold">Gear Collected · Cycle Complete</p>
          <p className="text-muted-foreground font-mono text-xs mt-0.5">Locker #{locker.locker_number} reset in progress</p>
        </div>
      </div>
    );
  }

  // ── DELIVERED (clean gear waiting in locker) ──
  if (status === 'delivered') {
    return (
      <div className="space-y-3">
        {/* Hero: clean gear ready */}
        <div className="bg-gradient-to-br from-green-600/20 to-green-600/5 border border-green-600/40 rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center">
                <Shirt className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-green-600 font-mono font-bold text-sm tracking-wide">CLEAN GEAR READY</p>
                <p className="text-muted-foreground font-mono text-xs">Locker #{locker.locker_number} · {gym?.name || 'Your Gym'}</p>
              </div>
            </div>
            <Badge className="bg-green-600 text-white font-mono text-[10px]">READY</Badge>
          </div>

          <div className="flex items-center justify-between bg-background/50 rounded-lg px-4 py-3 border border-green-600/20">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-green-600" />
              <span className="text-muted-foreground font-mono text-xs">Access Code</span>
            </div>
            <span className="text-green-600 font-mono font-bold text-3xl tracking-[0.3em]">{access_code}</span>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-muted/30 border border-border rounded-lg p-3 space-y-1.5">
          <p className="text-muted-foreground font-mono text-xs"><span className="text-foreground font-semibold">1.</span> Head to {gym?.name || 'your gym'}</p>
          <p className="text-muted-foreground font-mono text-xs"><span className="text-foreground font-semibold">2.</span> Enter code to open locker #{locker.locker_number}</p>
          <p className="text-muted-foreground font-mono text-xs"><span className="text-foreground font-semibold">3.</span> Collect your fresh gear & confirm below</p>
        </div>

        <LockerQRCode accessCode={access_code} lockerNumber={locker.locker_number} />

        <Button
          className="w-full bg-green-600 hover:bg-green-700 text-white font-mono text-sm font-bold h-11"
          onClick={() => collectMutation.mutate()}
          disabled={collectMutation.isPending}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          {collectMutation.isPending ? 'Confirming...' : 'I\'ve Collected My Gear ✓'}
        </Button>
      </div>
    );
  }

  // ── ASSIGNED (driver hasn't delivered yet) ──
  if (status === 'assigned') {
    return (
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-center gap-3">
        <Lock className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <div>
          <p className="text-blue-500 font-mono text-xs font-bold">Return Delivery In Progress</p>
          <p className="text-muted-foreground font-mono text-xs mt-0.5">Driver is loading your clean gear — you'll be notified when it's ready</p>
        </div>
      </div>
    );
  }

  return null;
}