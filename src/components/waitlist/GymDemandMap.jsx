import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function getDemandColor(count) {
  if (count >= 20) return '#22c55e'; // green - ready
  if (count >= 10) return '#eab308'; // yellow - close
  return '#6b7280'; // gray - not ready
}

export default function GymDemandMap({ gyms, gymEntities, onSelectGym }) {
  // Match waitlist gyms to gym entities that have coordinates
  const mappable = gyms
    .map(g => {
      const entity = gymEntities.find(ge =>
        ge.name?.toLowerCase().replace(/[^a-z0-9]/g, '') === g.name.toLowerCase().replace(/[^a-z0-9]/g, '')
      );
      if (!entity?.latitude || !entity?.longitude) return null;
      return { ...g, lat: entity.latitude, lng: entity.longitude };
    })
    .filter(Boolean);

  if (mappable.length === 0) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-8 text-center">
        <p className="text-gray-500 text-sm font-mono">No gym coordinates found.</p>
        <p className="text-gray-600 text-xs mt-1">Add latitude/longitude to gyms in the Gym entity to enable map view.</p>
      </div>
    );
  }

  const center = [mappable[0].lat, mappable[0].lng];

  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
      <MapContainer
        center={center}
        zoom={10}
        style={{ height: '380px', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        {mappable.map(gym => (
          <CircleMarker
            key={gym.name}
            center={[gym.lat, gym.lng]}
            radius={Math.max(8, Math.min(24, gym.entries.length * 1.2))}
            pathOptions={{
              color: getDemandColor(gym.entries.length),
              fillColor: getDemandColor(gym.entries.length),
              fillOpacity: 0.75,
              weight: 2,
            }}
            eventHandlers={{ click: () => onSelectGym(gym) }}
          >
            <Popup className="roki-popup">
              <div style={{ background: '#0d1520', color: 'white', padding: '8px 12px', borderRadius: 8, minWidth: 160 }}>
                <p style={{ fontWeight: 'bold', marginBottom: 4 }}>{gym.name}</p>
                <p style={{ color: '#9ca3af', fontSize: 12 }}>{gym.entries.length} signups · {gym.referrals} referrals</p>
                <p style={{ color: getDemandColor(gym.entries.length), fontSize: 11, marginTop: 4, fontFamily: 'monospace' }}>
                  {gym.entries.length >= 20 ? '● READY' : gym.entries.length >= 10 ? '● CLOSE' : '● NOT READY'}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="px-5 py-3 flex items-center gap-6 border-t border-white/[0.05]">
        {[
          { color: '#22c55e', label: 'Ready (20+)' },
          { color: '#eab308', label: 'Close (10–19)' },
          { color: '#6b7280', label: 'Not Ready (<10)' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
            <span className="text-gray-500 text-xs font-mono">{l.label}</span>
          </div>
        ))}
        <span className="text-gray-700 text-xs ml-auto">Circle size = demand</span>
      </div>
    </div>
  );
}