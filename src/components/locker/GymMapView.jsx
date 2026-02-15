import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in react-leaflet
if (typeof window !== 'undefined') {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

export default function GymMapView({ gyms, selectedGym, onSelectGym }) {
  const center = selectedGym 
    ? [selectedGym.latitude, selectedGym.longitude]
    : gyms.length > 0 
    ? [gyms[0].latitude, gyms[0].longitude]
    : [40.7128, -74.0060];

  return (
    <div className="h-80 rounded-lg overflow-hidden border border-gray-700">
      <MapContainer 
        center={center} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {gyms.map((gym, index) => (
          <Marker 
            key={index} 
            position={[gym.latitude, gym.longitude]}
            eventHandlers={{
              click: () => onSelectGym(gym)
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold">{gym.name}</p>
                <p className="text-gray-600 text-xs">{gym.address}</p>
                <p className="text-green-600 text-xs mt-1">{gym.distance} mi away</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}