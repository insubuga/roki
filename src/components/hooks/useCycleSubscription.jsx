import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Real-time cycle status subscription
 * Automatically updates UI when cycle status changes (washing → drying → ready, etc)
 * No polling, pure push via WebSocket
 */
export function useCycleSubscription(cycleId) {
  const [cycle, setCycle] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!cycleId) return;

    let unsubscribe;

    const subscribe = async () => {
      try {
        console.log(`[CYCLE_SUB] Subscribing to cycle ${cycleId}`);
        
        // Subscribe to ANY changes on this specific cycle
        unsubscribe = base44.entities.Cycle.subscribe((event) => {
          // Only update if this is the cycle we care about
          if (event.id === cycleId) {
            console.log(`[CYCLE_SUB] Update: ${event.type} - status=${event.data?.status}`);
            setCycle(event.data);
          }
        });

        setIsSubscribed(true);
      } catch (error) {
        console.error(`[CYCLE_SUB] Failed to subscribe: ${error.message}`);
      }
    };

    subscribe();

    return () => {
      if (unsubscribe) unsubscribe();
      setIsSubscribed(false);
    };
  }, [cycleId]);

  return { cycle, isSubscribed };
}

/**
 * Real-time locker assignment subscription
 * Watches for locker state changes (reserved → activated → dropped → returned)
 */
export function useLockerAssignmentSubscription(cycleId, userId) {
  const [assignment, setAssignment] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!cycleId || !userId) return;

    let unsubscribe;

    const subscribe = async () => {
      try {
        console.log(`[LOCKER_SUB] Subscribing to assignment for cycle ${cycleId}`);
        
        unsubscribe = base44.entities.CycleLockerAssignment.subscribe((event) => {
          // Only update if this is the assignment we care about
          if (event.data?.cycle_id === cycleId && event.data?.user_id === userId) {
            console.log(`[LOCKER_SUB] Update: ${event.type} - status=${event.data?.status}`);
            setAssignment(event.data);
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
  }, [cycleId, userId]);

  return { assignment, isSubscribed };
}

/**
 * Real-time cycle collection status
 * Watches for when clean gear is ready to collect
 */
export function useReturnLockerSubscription(cycleId) {
  const [returnLocker, setReturnLocker] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!cycleId) return;

    let unsubscribe;

    const subscribe = async () => {
      try {
        console.log(`[RETURN_SUB] Subscribing to return locker for cycle ${cycleId}`);
        
        unsubscribe = base44.entities.ReturnLockerAssignment.subscribe((event) => {
          if (event.data?.cycle_id === cycleId) {
            console.log(`[RETURN_SUB] Update: ${event.type} - status=${event.data?.status}`);
            setReturnLocker(event.data);
          }
        });

        setIsSubscribed(true);
      } catch (error) {
        console.error(`[RETURN_SUB] Failed to subscribe: ${error.message}`);
      }
    };

    subscribe();

    return () => {
      if (unsubscribe) unsubscribe();
      setIsSubscribed(false);
    };
  }, [cycleId]);

  return { returnLocker, isSubscribed };
}