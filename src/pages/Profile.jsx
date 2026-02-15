import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Settings, ArrowLeft, User, Mail, Lock, Save, MapPin, Navigation, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    preferred_gym: '',
    phone: '',
    notifications_enabled: true,
  });
  const [userLocation, setUserLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        setFormData({
          preferred_gym: userData.preferred_gym || '',
          phone: userData.phone || '',
          notifications_enabled: userData.notifications_enabled !== false,
        });
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: locker } = useQuery({
    queryKey: ['userLocker', user?.email],
    queryFn: async () => {
      const lockers = await base44.entities.Locker.filter({ user_email: user?.email });
      return lockers[0];
    },
    enabled: !!user?.email,
  });

  const { data: gyms = [] } = useQuery({
    queryKey: ['gyms'],
    queryFn: () => base44.entities.Gym.list(),
  });

  const { data: lockerAvailability = {} } = useQuery({
    queryKey: ['lockerAvailability'],
    queryFn: async () => {
      const availability = {};
      for (const gym of gyms) {
        const availableLockers = await base44.entities.Locker.filter({
          gym_id: gym.id,
          status: 'available'
        });
        availability[gym.id] = availableLockers.length;
      }
      return availability;
    },
    enabled: gyms.length > 0,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3958.8; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const gymsWithDistance = gyms.map(gym => {
    // Parse address to extract coordinates (simplified - in production use geocoding API)
    // For demo, using mock coordinates based on city
    const mockCoordinates = {
      'New York': { lat: 40.7128, lon: -74.0060 },
      'Los Angeles': { lat: 34.0522, lon: -118.2437 },
      'Chicago': { lat: 41.8781, lon: -87.6298 },
      'San Francisco': { lat: 37.7749, lon: -122.4194 },
    };
    
    const gymCoords = mockCoordinates[gym.city] || { lat: 40.7128, lon: -74.0060 };
    
    if (userLocation) {
      const distance = getDistance(
        userLocation.latitude,
        userLocation.longitude,
        gymCoords.lat,
        gymCoords.lon
      );
      return { ...gym, distance: distance.toFixed(1), coords: gymCoords };
    }
    return { ...gym, distance: null, coords: gymCoords };
  }).sort((a, b) => {
    if (a.distance === null) return 0;
    return parseFloat(a.distance) - parseFloat(b.distance);
  });

  const requestLocation = () => {
    setLoadingLocation(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLoadingLocation(false);
          toast.success('Location detected!');
        },
        (error) => {
          setLoadingLocation(false);
          toast.error('Could not get your location');
        }
      );
    } else {
      setLoadingLocation(false);
      toast.error('Geolocation not supported');
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      toast.success('Profile updated!');
      queryClient.invalidateQueries({ queryKey: ['userLocker'] });
    },
  });

  const claimLockerMutation = useMutation({
    mutationFn: async () => {
      const gym = gyms.find(g => g.id === formData.preferred_gym);
      if (!gym) throw new Error('Please select a gym first');
      
      const availableLockers = await base44.entities.Locker.filter({
        gym_id: gym.id,
        status: 'available'
      });
      
      if (availableLockers.length === 0) {
        throw new Error('No available lockers at this gym');
      }
      
      const locker = availableLockers[0];
      return base44.entities.Locker.update(locker.id, {
        user_email: user.email,
        status: 'claimed'
      });
    },
    onSuccess: () => {
      toast.success('Locker claimed successfully!');
      queryClient.invalidateQueries({ queryKey: ['userLocker'] });
      queryClient.invalidateQueries({ queryKey: ['lockerAvailability'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#7cfc00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={createPageUrl('Dashboard')}>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Settings className="w-8 h-8 text-lime-500" />
            Profile
          </h1>
          <p className="text-gray-400 mt-1">Account settings</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Account Info */}
        <Card className="bg-[#1a2332] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="w-5 h-5 text-[#7cfc00]" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-gray-400">Full Name</Label>
              <Input
                value={user.full_name || ''}
                disabled
                className="bg-[#0d1320] border-gray-700 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-400">Email</Label>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="w-5 h-5 text-gray-500" />
                <Input
                  value={user.email || ''}
                  disabled
                  className="bg-[#0d1320] border-gray-700 text-white"
                />
              </div>
            </div>
            <div>
              <Label className="text-gray-400">Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter your phone number"
                className="bg-[#0d1320] border-gray-700 text-white mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Gym & Locker */}
        <Card className="bg-[#1a2332] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#7cfc00]" />
              Gym & Locker
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-gray-400">Preferred Gym</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[#7cfc00] hover:text-[#6be600] h-7 text-xs"
                  onClick={requestLocation}
                  disabled={loadingLocation}
                >
                  {loadingLocation ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Navigation className="w-3 h-3 mr-1" />
                  )}
                  {userLocation ? 'Update Location' : 'Use My Location'}
                </Button>
              </div>
              <Select
                value={formData.preferred_gym}
                onValueChange={(value) => setFormData({ ...formData, preferred_gym: value })}
              >
                <SelectTrigger className="bg-[#0d1320] border-gray-700 text-white">
                  <SelectValue placeholder="Select a gym" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-gray-700 max-h-72">
                  {gymsWithDistance.map((gym) => (
                    <SelectItem key={gym.id} value={gym.id} className="text-white">
                      <div className="flex items-center justify-between w-full">
                        <span>{gym.name}</span>
                        <div className="flex items-center gap-2 ml-4">
                          {gym.distance && (
                            <span className="text-[#7cfc00] text-xs flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {gym.distance} mi
                            </span>
                          )}
                          {lockerAvailability[gym.id] !== undefined && (
                            <span className={`text-xs ${lockerAvailability[gym.id] > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {lockerAvailability[gym.id]} lockers
                            </span>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {userLocation && gymsWithDistance[0]?.distance && (
                <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Nearest: {gymsWithDistance[0].name} ({gymsWithDistance[0].distance} mi away)
                </p>
              )}
            </div>

            {locker ? (
              <div className="bg-gradient-to-br from-[#7cfc00]/10 to-teal-500/10 rounded-lg p-4 border border-[#7cfc00]/30">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-400 text-sm">Your Locker</p>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-xl">#{locker.locker_number}</p>
                    <p className="text-[#7cfc00] text-sm">Active</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-sm">Access Code</p>
                    <p className="text-[#7cfc00] font-mono font-bold text-2xl">{locker.access_code}</p>
                  </div>
                </div>
                {formData.preferred_gym && gyms.find(g => g.id === formData.preferred_gym) && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <p className="text-gray-400 text-xs">
                      Location: {gyms.find(g => g.id === formData.preferred_gym)?.name}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#0d1320] rounded-lg p-4 border border-gray-700">
                <p className="text-gray-400 mb-3">
                  {formData.preferred_gym && lockerAvailability[formData.preferred_gym] === 0 
                    ? 'No lockers available at this gym' 
                    : "You don't have a locker yet"}
                </p>
                {formData.preferred_gym && lockerAvailability[formData.preferred_gym] > 0 && (
                  <p className="text-green-400 text-sm mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    {lockerAvailability[formData.preferred_gym]} lockers available now
                  </p>
                )}
                <Button
                  className="w-full bg-[#7cfc00] text-black hover:bg-[#6be600]"
                  onClick={() => claimLockerMutation.mutate()}
                  disabled={!formData.preferred_gym || claimLockerMutation.isPending || lockerAvailability[formData.preferred_gym] === 0}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  {lockerAvailability[formData.preferred_gym] === 0 ? 'No Lockers Available' : 'Claim Locker'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <Button
        className="bg-[#7cfc00] text-black hover:bg-[#6be600]"
        onClick={() => updateProfileMutation.mutate(formData)}
        disabled={updateProfileMutation.isPending}
      >
        <Save className="w-4 h-4 mr-2" />
        Save Changes
      </Button>
    </div>
  );
}