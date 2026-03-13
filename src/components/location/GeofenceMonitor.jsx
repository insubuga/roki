import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { MapPin, AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

/**
 * Geofence monitoring component
 * Continuously monitors user location and triggers locker activation
 * 
 * Add to pages that need location awareness
 */
export default function GeofenceMonitor({ userEmail, gymId, enabled = true }) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastLocation, setLastLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, tracking, activated
  const [error, setError] = useState(null);
  const watchId = useRef(null);

  useEffect(() => {
    if (!enabled || !userEmail || !gymId) return;

    const startMonitoring = async () => {
      if (!navigator.geolocation) {
        setError('Geolocation not supported');
        return;
      }

      setIsMonitoring(true);
      setStatus('tracking');

      // Request continuous location updates
      watchId.current = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;

          setLastLocation({ latitude, longitude });
          setAccuracy(Math.round(accuracy));

          try {
            const response = await base44.functions.invoke('processGeofenceEvent', {
              user_latitude: latitude,
              user_longitude: longitude,
              gym_id: gymId,
              gps_accuracy_meters: Math.round(accuracy)
            });

            setDistance(response.data?.distance_meters);

            if (response.data?.action_triggered === 'locker_activated') {
              setStatus('activated');
              toast.success('🔓 Locker activated! Access code sent.');
            } else {
              setStatus('tracking');
            }

            setError(null);
          } catch (e) {
            console.error('Geofence processing error:', e);
            setError(e.message);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          let errorMsg = 'Location access denied';
          if (error.code === 1) errorMsg = 'Permission denied. Enable location in settings.';
          if (error.code === 2) errorMsg = 'Position unavailable';
          if (error.code === 3) errorMsg = 'Location request timeout';
          setError(errorMsg);
          setStatus('idle');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000
        }
      );
    };

    startMonitoring();

    return () => {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [enabled, userEmail, gymId]);

  if (!enabled) return null;

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className={`w-4 h-4 ${
              status === 'activated' ? 'text-green-600' :
              status === 'tracking' ? 'text-blue-600' :
              'text-gray-400'
            }`} />
            <span className="text-xs font-mono font-semibold">LOCATION SERVICE</span>
          </div>
          <Badge className={`${
            status === 'activated' ? 'bg-green-600' :
            status === 'tracking' ? 'bg-blue-600' :
            'bg-gray-500'
          } text-white text-[10px]`}>
            {status === 'activated' ? 'ACTIVATED' : 
             status === 'tracking' ? 'TRACKING' : 
             'IDLE'}
          </Badge>
        </div>

        {isMonitoring && (
          <div className="space-y-2 text-xs">
            {distance !== null && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Distance</span>
                <span className="font-mono font-bold">
                  {distance}m {distance < 150 ? '⬅️' : ''}
                </span>
              </div>
            )}

            {accuracy !== null && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Accuracy</span>
                <span className={`font-mono font-bold ${
                  accuracy <= 50 ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {accuracy}m
                </span>
              </div>
            )}

            {lastLocation && (
              <div className="text-[10px] text-muted-foreground">
                {lastLocation.latitude.toFixed(4)}, {lastLocation.longitude.toFixed(4)}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 mt-2">
            <AlertCircle className="w-3 h-3" />
            {error}
          </div>
        )}

        {status === 'activated' && (
          <div className="flex items-center gap-2 text-xs text-green-600 mt-2">
            <CheckCircle2 className="w-3 h-3" />
            Locker ready for drop-off
          </div>
        )}
      </CardContent>
    </Card>
  );
}