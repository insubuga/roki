import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Navigation, 
  MapPin, 
  ArrowRight, 
  Phone, 
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Custom icons
const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapController({ center, route }) {
  const map = useMap();
  
  useEffect(() => {
    if (route && route.length > 0) {
      const bounds = L.latLngBounds(route);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (center) {
      map.setView(center, 13);
    }
  }, [map, center, route]);

  return null;
}

export default function NavigationMap({ delivery, onClose }) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [route, setRoute] = useState(null);
  const [directions, setDirections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);

  useEffect(() => {
    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const current = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(current);
          fetchRoute(current);
        },
        (error) => {
          console.error('Location error:', error);
          setError('Unable to get your location. Please enable location services.');
          setLoading(false);
          toast.error('Location access denied');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
    }
  }, []);

  const fetchRoute = async (start) => {
    try {
      const destination = {
        lat: delivery.delivery_latitude,
        lng: delivery.delivery_longitude
      };

      // Call backend function to get route from Mapbox
      const response = await base44.functions.invoke('getMapboxRoute', {
        start: [start.lng, start.lat],
        end: [destination.lng, destination.lat]
      });

      if (response.data.route && response.data.route.length > 0) {
        setRoute(response.data.route);
        setDirections(response.data.steps || []);
        setDistance(response.data.distance);
        setDuration(response.data.duration);
      } else {
        setError('Could not find a route to destination');
      }
    } catch (err) {
      console.error('Route error:', err);
      setError('Failed to load route. Please try again.');
      toast.error('Failed to load navigation');
    } finally {
      setLoading(false);
    }
  };

  const openExternalNavigation = () => {
    const lat = delivery.delivery_latitude;
    const lng = delivery.delivery_longitude;
    
    // Try Google Maps first, fallback to Apple Maps on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      window.open(`http://maps.apple.com/?daddr=${lat},${lng}`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }
  };

  if (loading) {
    return (
      <Card className="border-gray-200">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading navigation...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-900">Navigation</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-700 mb-4">{error}</p>
            <Button onClick={openExternalNavigation} className="bg-blue-600 text-white">
              Open in External Maps
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const destination = {
    lat: delivery.delivery_latitude,
    lng: delivery.delivery_longitude
  };

  return (
    <Card className="border-gray-200 shadow-xl">
      <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-gray-900">Navigation</CardTitle>
              {distance && duration && (
                <p className="text-sm text-gray-600">
                  {(distance / 1000).toFixed(1)} km · {Math.round(duration / 60)} min
                </p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Map */}
        <div className="h-[400px] relative">
          <MapContainer
            center={currentLocation || destination}
            zoom={13}
            className="h-full w-full"
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {currentLocation && (
              <Marker position={[currentLocation.lat, currentLocation.lng]} icon={startIcon}>
                <Popup>Your Location</Popup>
              </Marker>
            )}
            
            <Marker position={[destination.lat, destination.lng]} icon={endIcon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{delivery.delivery_location}</p>
                </div>
              </Popup>
            </Marker>

            {route && (
              <Polyline 
                positions={route} 
                color="#3b82f6" 
                weight={4}
                opacity={0.7}
              />
            )}

            <MapController center={currentLocation} route={route} />
          </MapContainer>

          <Button
            onClick={openExternalNavigation}
            className="absolute top-4 right-4 z-[1000] bg-white text-gray-900 hover:bg-gray-100 shadow-lg"
            size="sm"
          >
            <Navigation className="w-4 h-4 mr-2" />
            External Maps
          </Button>
        </div>

        {/* Turn-by-turn directions */}
        {directions.length > 0 && (
          <div className="max-h-[300px] overflow-y-auto border-t border-gray-200">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-blue-600" />
                Turn-by-Turn Directions
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {directions.map((step, index) => (
                <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-blue-700 font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium">{step.instruction}</p>
                      {step.distance && (
                        <p className="text-sm text-gray-600 mt-1">
                          {step.distance < 1000 
                            ? `${step.distance.toFixed(0)}m` 
                            : `${(step.distance / 1000).toFixed(1)}km`
                          }
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delivery Info */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-gray-600" />
              <span className="text-gray-900 font-medium">{delivery.delivery_location}</span>
            </div>
            {delivery.special_instructions && (
              <p className="text-sm text-gray-700 bg-yellow-50 p-2 rounded-lg border border-yellow-200">
                📝 {delivery.special_instructions}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}