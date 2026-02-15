import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock, Unlock, Calendar, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function LockerControls({ locker, gym }) {
  const [isToggling, setIsToggling] = useState(false);
  const queryClient = useQueryClient();

  const toggleLockMutation = useMutation({
    mutationFn: async (action) => {
      setIsToggling(true);
      // Simulate lock control delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return base44.entities.Locker.update(locker.id, {
        is_locked: action === 'lock',
        last_unlocked: action === 'unlock' ? new Date().toISOString() : locker.last_unlocked
      });
    },
    onMutate: async (action) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['userLocker'] });

      // Snapshot the previous value
      const previousLocker = queryClient.getQueryData(['userLocker', locker.user_email]);

      // Optimistically update to the new value
      queryClient.setQueryData(['userLocker', locker.user_email], (old) => {
        if (!old) return old;
        return [{
          ...old[0],
          is_locked: action === 'lock',
          last_unlocked: action === 'unlock' ? new Date().toISOString() : old[0].last_unlocked
        }];
      });

      return { previousLocker };
    },
    onSuccess: (data, action) => {
      setIsToggling(false);
      queryClient.invalidateQueries({ queryKey: ['userLocker'] });
      toast.success(action === 'lock' ? 'Locker secured' : 'Locker unlocked');
    },
    onError: (err, action, context) => {
      setIsToggling(false);
      // Rollback to the previous value
      queryClient.setQueryData(['userLocker', locker.user_email], context.previousLocker);
      toast.error('Failed to control locker');
    }
  });

  const isExpiringSoon = locker.booking_end && 
    new Date(locker.booking_end) - new Date() < 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-4">
      {/* Lock Status */}
      <div className={`bg-gradient-to-br rounded-lg p-4 border ${
        locker.is_locked 
          ? 'from-[#7cfc00]/10 to-teal-500/10 border-[#7cfc00]/30' 
          : 'from-orange-500/10 to-amber-500/10 border-orange-500/30'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {locker.is_locked ? (
              <Lock className="w-5 h-5 text-[#7cfc00]" />
            ) : (
              <Unlock className="w-5 h-5 text-orange-500" />
            )}
            <span className="text-white font-semibold">
              {locker.is_locked ? 'Locked' : 'Unlocked'}
            </span>
          </div>
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            locker.is_locked ? 'bg-green-500' : 'bg-orange-500'
          }`} />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => toggleLockMutation.mutate('unlock')}
            disabled={!locker.is_locked || isToggling}
            className="bg-orange-500 hover:bg-orange-600 text-white select-none"
          >
            <Unlock className="w-4 h-4 mr-1 select-none" />
            {isToggling ? 'Processing...' : 'Unlock'}
          </Button>
          <Button
            onClick={() => toggleLockMutation.mutate('lock')}
            disabled={locker.is_locked || isToggling}
            className="bg-[#7cfc00] hover:bg-[#6be600] text-black select-none"
          >
            <Lock className="w-4 h-4 mr-1 select-none" />
            {isToggling ? 'Processing...' : 'Lock'}
          </Button>
        </div>

        {locker.last_unlocked && (
          <p className="text-gray-400 text-xs mt-3">
            Last unlocked: {format(new Date(locker.last_unlocked), 'MMM d, h:mm a')}
          </p>
        )}
      </div>

      {/* Booking Info */}
      {locker.booking_end && (
        <div className={`bg-[#0d1320] rounded-lg p-4 border ${
          isExpiringSoon ? 'border-orange-500/50' : 'border-gray-700'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className={`w-4 h-4 ${isExpiringSoon ? 'text-orange-500' : 'text-gray-400'}`} />
            <span className="text-white text-sm font-semibold">Booking Details</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Expires:</span>
              <span className={isExpiringSoon ? 'text-orange-500' : 'text-white'}>
                {format(new Date(locker.booking_end), 'MMM d, h:mm a')}
              </span>
            </div>
            {isExpiringSoon && (
              <div className="flex items-center gap-1 text-orange-500 mt-2">
                <AlertCircle className="w-3 h-3" />
                <span>Expires within 24 hours</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Location Info */}
      {gym && (
        <div className="bg-[#0d1320] rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-xs mb-1">Location</p>
          <p className="text-white font-semibold">{gym.name}</p>
          <p className="text-gray-500 text-xs mt-1">{gym.address}</p>
        </div>
      )}
    </div>
  );
}