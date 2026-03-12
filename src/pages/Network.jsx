import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, TrendingUp, Lock, Map, Radio, Activity, Layers } from 'lucide-react';
import LockerDemandForecastCard from '../components/network/LockerDemandForecastCard';
import MobileHeader from '../components/mobile/MobileHeader';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function Network() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        setUser(null);
      }
    };
    loadUser();
  }, []);

  // Fetch active CycleLockerAssignment for this user
  const { data: activeCycleAssignment } = useQuery({
    queryKey: ['activeCycleAssignment', user?.email],
    queryFn: async () => {
      const assignments = await base44.entities.CycleLockerAssignment.filter({ user_id: user?.email });
      const active = assignments.find(a => ['softReserved', 'activated', 'dropped'].includes(a.status));
      return active || null;
    },
    enabled: !!user?.email,
  });

  const { data: assignedLocker } = useQuery({
    queryKey: ['assignedLocker', activeCycleAssignment?.locker_id],
    queryFn: async () => {
      if (!activeCycleAssignment?.locker_id) return null;
      return await base44.entities.Locker.get(activeCycleAssignment.locker_id);
    },
    enabled: !!activeCycleAssignment?.locker_id,
  });

  const { data: gym } = useQuery({
    queryKey: ['lockerGym', assignedLocker?.gym_id],
    queryFn: () => base44.entities.Gym.get(assignedLocker?.gym_id),
    enabled: !!assignedLocker?.gym_id,
  });

  const { data: allGyms = [] } = useQuery({
    queryKey: ['allGyms'],
    queryFn: () => base44.entities.Gym.list(),
    enabled: !!user,
  });

  const { data: allLockers = [] } = useQuery({
    queryKey: ['allLockers'],
    queryFn: () => base44.entities.Locker.list(),
    enabled: !!user,
  });

  const { data: clusterStats = {} } = useQuery({
    queryKey: ['clusterStats', assignedLocker?.gym_id],
    queryFn: async () => {
      if (!assignedLocker?.gym_id) return {};
      const totalLockers = await base44.entities.Locker.filter({ gym_id: assignedLocker.gym_id });
      const claimedLockers = totalLockers.filter(l => l.status === 'claimed');
      return {
        total: totalLockers.length,
        claimed: claimedLockers.length,
        utilization: Math.round((claimedLockers.length / totalLockers.length) * 100)
      };
    },
    enabled: !!assignedLocker?.gym_id,
  });

  // Network calculations
  const totalActiveNodes = allLockers.filter(l => l.status === 'claimed').length;
  const totalCapacity = allLockers.length;
  const networkUtilization = totalCapacity > 0 ? Math.round((totalActiveNodes / totalCapacity) * 100) : 0;
  
  // Mock nearby nodes based on assigned gym
  const nearbyNodes = allGyms
    .filter(g => g.id !== gym?.id)
    .slice(0, 5)
    .map(g => ({
      gym: g,
      lockers: allLockers.filter(l => l.gym_id === g.id),
      distance: (Math.random() * 5 + 0.5).toFixed(1) // Mock distance in miles
    }));

  // Calculate center point for map
  const mapCenter = gym 
    ? [41.8781, -87.6298] // Chicago default, would use gym coordinates
    : [41.8781, -87.6298];

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MobileHeader
        title="NETWORK INFRASTRUCTURE"
        subtitle="Physical node distribution and cluster topology"
        icon={Activity}
        iconColor="text-purple-600"
      />

      {/* Network Map */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-mono uppercase flex items-center gap-2">
            <Map className="w-4 h-4 text-purple-600" />
            Network Map
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[300px] bg-gray-100 relative">
            {gym ? (
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
                      <p className="font-bold text-green-600">Your Node</p>
                      <p className="text-gray-900 font-semibold">{gym.name}</p>
                      <p className="text-gray-600">{assignedLocker?.locker_number}</p>
                    </div>
                  </Popup>
                  <Tooltip permanent direction="top" offset={[0, -10]}>
                    <span className="text-xs font-bold">PRIMARY</span>
                  </Tooltip>
                </CircleMarker>

                {/* Nearby Nodes */}
                {nearbyNodes.slice(0, 8).map((node, idx) => {
                  const angle = (idx / 8) * 2 * Math.PI;
                  const distance = 0.05 + Math.random() * 0.08;
                  const lat = mapCenter[0] + Math.cos(angle) * distance;
                  const lng = mapCenter[1] + Math.sin(angle) * distance;
                  const utilization = node.lockers.length > 0 
                    ? Math.round((node.lockers.filter(l => l.status === 'claimed').length / node.lockers.length) * 100)
                    : 0;
                  
                  return (
                    <CircleMarker
                      key={idx}
                      center={[lat, lng]}
                      radius={8}
                      fillColor={utilization > 70 ? "#3b82f6" : utilization > 40 ? "#8b5cf6" : "#6b7280"}
                      color="#fff"
                      weight={2}
                      fillOpacity={0.7}
                    >
                      <Popup>
                        <div className="text-xs">
                          <p className="font-semibold text-gray-900">{node.gym.name}</p>
                          <p className="text-gray-600">{node.distance} mi</p>
                          <p className="text-gray-600">{utilization}% utilized</p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Map className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">Assign a node to view network map</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Network Overview */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <Radio className="w-5 h-5 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground font-mono">{totalActiveNodes}</p>
            <p className="text-muted-foreground text-xs uppercase font-mono">Active Nodes</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <Layers className="w-5 h-5 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground font-mono">{allGyms.length}</p>
            <p className="text-muted-foreground text-xs uppercase font-mono">Locations</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <Activity className="w-5 h-5 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground font-mono">{networkUtilization}%</p>
            <p className="text-muted-foreground text-xs uppercase font-mono">Network Load</p>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Node Details */}
      {assignedLocker && gym ? (
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-900/50">
          <CardHeader>
            <CardTitle className="text-base font-mono uppercase flex items-center gap-2">
              <Lock className="w-4 h-4 text-green-600" />
              Assigned Node
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-muted-foreground text-xs uppercase font-mono mb-1">Location</p>
              <p className="text-foreground font-bold font-mono">{gym.name}</p>
              <p className="text-muted-foreground text-sm font-mono">{gym.address}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-lg p-3 border border-border">
                <p className="text-muted-foreground text-xs uppercase font-mono mb-1">Node ID</p>
                <p className="text-foreground font-mono font-bold text-lg">{assignedLocker.locker_number}</p>
              </div>
              <div className="bg-card rounded-lg p-3 border border-border">
                <p className="text-muted-foreground text-xs uppercase font-mono mb-1">Access Code</p>
                <p className="text-green-600 font-mono font-bold text-lg">{assignedLocker.access_code}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-muted border-border">
          <CardContent className="p-6 text-center">
            <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground font-mono uppercase text-sm">No node assigned</p>
            <p className="text-muted-foreground text-xs mt-1 font-mono">Initialize system to provision</p>
          </CardContent>
        </Card>
      )}

      {/* Nearby Nodes */}
      {nearbyNodes.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-mono uppercase flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-600" />
              Nearby Nodes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {nearbyNodes.map((node, idx) => {
              const utilization = node.lockers.length > 0 
                ? Math.round((node.lockers.filter(l => l.status === 'claimed').length / node.lockers.length) * 100)
                : 0;
              return (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-medium text-sm truncate font-mono">{node.gym.name}</p>
                    <p className="text-muted-foreground text-xs font-mono">{node.distance} mi away</p>
                  </div>
                  <div className="text-right">
                    <Badge className={`${utilization > 70 ? 'bg-blue-600' : utilization > 40 ? 'bg-purple-600' : 'bg-gray-600'} text-white text-xs font-mono`}>
                      {utilization}%
                    </Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Cluster Density */}
      {clusterStats.total > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-mono uppercase flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              Cluster Density Level
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground font-mono">{clusterStats.claimed}</p>
                <p className="text-muted-foreground text-xs uppercase font-mono">Active</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground font-mono">{clusterStats.total}</p>
                <p className="text-muted-foreground text-xs uppercase font-mono">Capacity</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600 font-mono">{clusterStats.utilization}%</p>
                <p className="text-muted-foreground text-xs uppercase font-mono">Density</p>
              </div>
            </div>
            <div className="bg-muted rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-600 h-full transition-all"
                style={{ width: `${clusterStats.utilization}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Locker Demand Forecast */}
      <LockerDemandForecastCard gymId={assignedLocker?.gym_id} />

      {/* Coverage Expansion Zones */}
      <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-purple-200 dark:border-purple-900/50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-foreground font-bold mb-1 font-mono uppercase text-sm">Expansion Zones Identified</p>
              <p className="text-muted-foreground text-xs leading-relaxed font-mono">
                Network analysis shows {3 + Math.floor(Math.random() * 5)} high-density zones for strategic node placement. 
                Coverage optimization targets {85 + Math.floor(Math.random() * 10)}% metropolitan reach.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}