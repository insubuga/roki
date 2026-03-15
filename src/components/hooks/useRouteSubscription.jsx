import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Real-time route assignment subscription for drivers
 * Instantly notifies driver when new route is assigned
 */
export function useRouteSubscription(driverEmail) {
  const [routes, setRoutes] = useState([]);
  const [newRouteAlert, setNewRouteAlert] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!driverEmail) return;

    let unsubscribe;

    const subscribe = async () => {
      try {
        console.log(`[ROUTE_SUB] Driver ${driverEmail} subscribing to route updates`);
        
        unsubscribe = base44.entities.Route.subscribe((event) => {
          // Only track routes assigned to this driver
          if (event.data?.driver_email === driverEmail) {
            console.log(`[ROUTE_SUB] ${event.type} - route=${event.data?.route_id}, status=${event.data?.status}`);
            
            if (event.type === 'create') {
              // New route assigned → show alert
              setNewRouteAlert({
                route_id: event.data.route_id,
                stops: event.data.total_stops,
                distance: event.data.total_distance_miles,
                timestamp: Date.now()
              });
              setRoutes(prev => [event.data, ...prev]);
            } else if (event.type === 'update') {
              // Route status changed (e.g., planned → active)
              setRoutes(prev => 
                prev.map(r => r.id === event.id ? event.data : r)
              );
            } else if (event.type === 'delete') {
              // Route cancelled
              setRoutes(prev => prev.filter(r => r.id !== event.id));
            }
          }
        });

        setIsSubscribed(true);
      } catch (error) {
        console.error(`[ROUTE_SUB] Failed to subscribe: ${error.message}`);
      }
    };

    subscribe();

    return () => {
      if (unsubscribe) unsubscribe();
      setIsSubscribed(false);
    };
  }, [driverEmail]);

  const clearNewRouteAlert = () => setNewRouteAlert(null);

  return { routes, newRouteAlert, clearNewRouteAlert, isSubscribed };
}

/**
 * Real-time cycle delivery updates for drivers
 * Shows when new pickups/deliveries are ready
 */
export function useDeliverySubscription(driverEmail) {
  const [deliveries, setDeliveries] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!driverEmail) return;

    let unsubscribe;

    const subscribe = async () => {
      try {
        console.log(`[DELIVERY_SUB] Driver ${driverEmail} subscribing to deliveries`);
        
        unsubscribe = base44.entities.Cycle.subscribe((event) => {
          const activeStatuses = ['awaiting_pickup', 'washing', 'drying', 'ready'];
          const isActive = activeStatuses.includes(event.data?.status);
          
          if (event.type === 'create' || event.type === 'update') {
            if (isActive) {
              // Signal the query to refresh — pendingCount used as trigger
              setPendingCount(prev => prev + 1);
            }
          }
        });

        setIsSubscribed(true);
      } catch (error) {
        console.error(`[DELIVERY_SUB] Failed to subscribe: ${error.message}`);
      }
    };

    subscribe();

    return () => {
      if (unsubscribe) unsubscribe();
      setIsSubscribed(false);
    };
  }, [driverEmail]);

  return { deliveries, pendingCount, isSubscribed };
}