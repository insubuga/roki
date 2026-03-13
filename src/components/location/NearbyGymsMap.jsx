import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Navigation } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * Display nearby gyms sorted by distance
 */
export default function NearbyGymsMap({ userLocation = null }) {
  const [sortedGyms, setSortedGyms] = useState([]);

  const { data: gyms = [] } = useQuery({
    queryKey: ['gyms'],
    queryFn: () => base44.entities.Gym.list('-created_date', 100),
  });

  const { data: geofences = [] } = useQuery({
    queryKey: ['geofences'],
    queryFn: () => base44.entities.GymGeofence.list('-created_date', 100),
  });

  useEffect(() => {
    if (!userLocation || gyms.length === 0) {
      setSortedGyms(gyms);
      return;
    }

    // Calculate distances and sort
    const withDistances = gyms.map(gym => {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        gym.latitude,
        gym.longitude
      );
      return { ...gym, distance: Math.round(distance) };
    });

    setSortedGyms(withDistances.sort((a, b) => a.distance - b.distance));
  }, [userLocation, gyms]);

  const handleNavigate = (gym) => {
    const mapsUrl = `https://maps.google.com/?q=${gym.latitude},${gym.longitude}`;
    window.open(mapsUrl, '_blank');
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-sm font-mono">Nearby Gyms</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedGyms.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No gyms found</p>
        ) : (
          sortedGyms.map(gym => {
            const geofence = geofences.find(g => g.gym_id === gym.id);
            const distance = gym.distance;
            const isNearby = distance && distance < 1000; // Within 1km

            return (
              <div key={gym.id} className="border border-border rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-foreground">{gym.name}</h3>
                    {gym.city && (
                      <p className="text-xs text-muted-foreground">{gym.city}</p>
                    )}
                  </div>
                  {isNearby && (
                    <Badge className="bg-green-100 text-green-700 text-[10px]">
                      NEARBY
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {distance !== undefined ? `${distance > 1000 ? (distance / 1000).toFixed(1) + 'km' : distance + 'm'}` : '—'}
                  </div>
                  {geofence && geofence.is_active && (
                    <Badge className="bg-blue-100 text-blue-700 text-[10px]">
                      GEOFENCED
                    </Badge>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs h-8"
                  onClick={() => handleNavigate(gym)}
                >
                  <Navigation className="w-3 h-3 mr-1" />
                  Open Map
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}