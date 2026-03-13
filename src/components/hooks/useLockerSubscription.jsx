import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Real-time locker status subscription
 * Watches for locker state changes (available → assigned → maintenance, etc)
 */
export function useLockerSubscription(lockerId) {
  const [locker, setLocker] = useState(null);
  const [statusChange, setStatusChange] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!lockerId) return;

    let unsubscribe;

    const subscribe = async () => {
      try {
        console.log(`[LOCKER_SUB] Subscribing to locker ${lockerId}`);
        
        unsubscribe = base44.entities.Locker.subscribe((event) => {
          if (event.id === lockerId) {
            const oldStatus = locker?.status;
            const newStatus = event.data?.status;
            
            console.log(`[LOCKER_SUB] Update: ${oldStatus} → ${newStatus}`);
            setLocker(event.data);
            
            // Notify on significant changes
            if (oldStatus && oldStatus !== newStatus) {
              setStatusChange({
                from: oldStatus,
                to: newStatus,
                timestamp: Date.now()
              });
            }
          }
        });

        setIsSubscribed(true);
      } catch (error) {
        console.error(`[LOCKER_SUB] Failed to subscribe: ${error.message}`);
      }
    };

    subscribe();

    return () => {
      if (unsubscribe) unsubscribe();
      setIsSubscribed(false);
    };
  }, [lockerId]);

  const clearStatusChange = () => setStatusChange(null);

  return { locker, statusChange, clearStatusChange, isSubscribed };
}

/**
 * Real-time gym locker availability
 * Shows available locker count at a gym in real-time
 */
export function useGymLockerAvailability(gymId) {
  const [availableCount, setAvailableCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!gymId) return;

    let unsubscribe;

    const subscribe = async () => {
      try {
        console.log(`[GYM_LOCKER_SUB] Subscribing to gym ${gymId} locker availability`);
        
        unsubscribe = base44.entities.Locker.subscribe((event) => {
          if (event.data?.gym_id === gymId) {
            // Recalculate available count
            const status = event.data?.status;
            if (status === 'available') {
              setAvailableCount(prev => prev + (event.type === 'create' ? 1 : 0));
            } else if (event.type === 'delete') {
              setAvailableCount(prev => Math.max(0, prev - 1));
            }
            
            console.log(`[GYM_LOCKER_SUB] Gym ${gymId}: status=${status}`);
          }
        });

        setIsSubscribed(true);
      } catch (error) {
        console.error(`[GYM_LOCKER_SUB] Failed to subscribe: ${error.message}`);
      }
    };

    subscribe();

    return () => {
      if (unsubscribe) unsubscribe();
      setIsSubscribed(false);
    };
  }, [gymId]);

  return { availableCount, totalCount, isSubscribed };
}