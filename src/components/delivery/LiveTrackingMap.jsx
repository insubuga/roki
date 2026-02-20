import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navigation, MapPin, Package } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom driver icon
const driverIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNCIgZmlsbD0iIzEwYjk4MSIvPjxwYXRoIGQ9Ik0xNiA4TDE4LjUgMTMuNUwyNCAxNC41TDE5LjUgMThMMjEgMjRMMTYgMjEuNUwxMSAyNEwxMi41IDE4TDggMTQuNUwxMy41IDEzLjVMMTYgOFoiIGZpbGw9IndoaXRlIi8+PC9zdmc+',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Destination icon
const destIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNCIgZmlsbD0iI2VmNDQ0NCIvPjxwYXRoIGQ9Ik0xNiA4TDEwIDI0TDE2IDE5TDIyIDI0TDE2IDhaIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

export default function LiveTrackingMap({ order }) {
  const [driverLocation, setDriverLocation] = useState(null);

  useEffect(() => {
    // Get initial driver location from order
    if (order.driver_latitude && order.driver_longitude) {
      setDriverLocation({
        lat: order.driver_latitude,
        lng: order.driver_longitude
      });
    }
  }, [order]);

  // Parse destination coordinates
  const destination = order.delivery_latitude && order.delivery_longitude ? {
    lat: order.delivery_latitude,
    lng: order.delivery_longitude
  } : null;

  // If no location data, show message
  if (!driverLocation && !destination) {
    return (
      <Card className="border-gray-200">
        <CardContent className="py-8 text-center">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">Location tracking will appear when driver is en route</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate center and zoom
  const center = driverLocation || destination || { lat: 32.7767, lng: -96.7970 };
  const positions = [driverLocation, destination].filter(Boolean);

  return (
    <Card className="overflow-hidden border-gray-200">
      <CardContent className="p-0">
        {/* Status Bar */}
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-3 border-b border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-gray-900">
                {order.status === 'in_transit' ? 'Driver is on the way' : 'Tracking active'}
              </span>
            </div>
            {order.estimated_delivery && (
              <Badge className="bg-green-600 text-white">
                ETA: {new Date(order.estimated_delivery).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Badge>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="h-[300px] relative">
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Driver Location */}
            {driverLocation && (
              <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon}>
                <Popup>
                  <div className="text-sm">
                    <div className="flex items-center gap-2 font-semibold mb-1">
                      <Navigation className="w-4 h-4 text-green-600" />
                      Your Driver
                    </div>
                    <p className="text-xs text-gray-600">
                      Last updated: {order.driver_last_update ? 
                        new Date(order.driver_last_update).toLocaleTimeString() : 
                        'Just now'}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Destination */}
            {destination && (
              <Marker position={[destination.lat, destination.lng]} icon={destIcon}>
                <Popup>
                  <div className="text-sm">
                    <div className="flex items-center gap-2 font-semibold mb-1">
                      <Package className="w-4 h-4 text-red-600" />
                      Delivery Location
                    </div>
                    <p className="text-xs text-gray-600">{order.delivery_location}</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Route Line */}
            {positions.length === 2 && (
              <Polyline
                positions={positions.map(p => [p.lat, p.lng])}
                color="#10b981"
                weight={4}
                opacity={0.7}
                dashArray="10, 10"
              />
            )}
          </MapContainer>
        </div>

        {/* Info Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span>{order.delivery_location || 'Delivery location'}</span>
            </div>
            {order.distance_miles && (
              <span className="text-gray-600">{order.distance_miles.toFixed(1)} mi away</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}