import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => { map.setView(center, map.getZoom()); }, [center]);
  return null;
}

export default function NetworkMap({ mapCenter, userLocation, gym, assignedLocker, nearbyNodes }) {
  return (
    <MapContainer
      center={mapCenter}
      zoom={12}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      <RecenterMap center={mapCenter} />

      {/* User's current location */}
      {userLocation && (
        <CircleMarker
          center={userLocation}
          radius={9}
          fillColor="#3b82f6"
          color="#fff"
          weight={3}
          fillOpacity={0.9}
        >
          <Popup>
            <div className="text-xs">
              <p className="font-bold" style={{ color: '#2563eb' }}>Your Location</p>
            </div>
          </Popup>
          <Tooltip permanent direction="top" offset={[0, -10]}>
            <span className="text-xs font-bold">YOU</span>
          </Tooltip>
        </CircleMarker>
      )}

      {/* Assigned Node - Primary */}
      <CircleMarker
        center={mapCenter}
        radius={12}
        fillColor="#10b981"
        color="#059669"
        weight={3}
        fillOpacity={0.8}
      >
        <Popup>
          <div className="text-xs">
            <p className="font-bold" style={{ color: '#059669' }}>Your Node</p>
            <p className="font-semibold">{gym?.name || '—'}</p>
            <p style={{ color: '#6b7280' }}>{assignedLocker?.locker_number}</p>
          </div>
        </Popup>
        <Tooltip permanent direction="top" offset={[0, -10]}>
          <span className="text-xs font-bold">PRIMARY</span>
        </Tooltip>
      </CircleMarker>

      {/* Nearby Nodes */}
      {nearbyNodes.filter(node => node.gym).slice(0, 8).map((node, idx) => {
        const lat = node.gym.latitude || (mapCenter[0] + Math.cos((idx / 8) * 2 * Math.PI) * 0.06);
        const lng = node.gym.longitude || (mapCenter[1] + Math.sin((idx / 8) * 2 * Math.PI) * 0.06);
        const utilization = node.lockers.length > 0
          ? Math.round((node.lockers.filter(l => ['activated', 'softReserved', 'dropped'].includes(l.status)).length / node.lockers.length) * 100)
          : 0;

        return (
          <CircleMarker
            key={idx}
            center={[lat, lng]}
            radius={8}
            fillColor={utilization > 70 ? '#3b82f6' : utilization > 40 ? '#8b5cf6' : '#6b7280'}
            color="#fff"
            weight={2}
            fillOpacity={0.7}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-semibold">{node.gym.name}</p>
                <p style={{ color: '#6b7280' }}>{node.gym.city || ''}</p>
                <p style={{ color: '#6b7280' }}>{utilization}% utilized</p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}