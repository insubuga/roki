import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Settings, User, Mail, Lock, Save, MapPin, Navigation, Loader2, Map, Camera, Upload, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MobileHeader from '../components/mobile/MobileHeader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { addHours } from 'date-fns';
import LockerControls from '../components/locker/LockerControls';
import ReportIssueDialog from '../components/locker/ReportIssueDialog';
import GymMapView from '../components/locker/GymMapView';
import BookingExtension from '../components/locker/BookingExtension';
import LockerCheckout from '../components/payment/LockerCheckout';
import AILockerRecommendations from '../components/locker/AILockerRecommendations';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    preferred_gym: '',
    phone: '',
    notifications_enabled: true,
  });
  const [userLocation, setUserLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [selectedGymOnMap, setSelectedGymOnMap] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [loadingAiRecs, setLoadingAiRecs] = useState(false);
  const fileInputRef = useRef(null);
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

        // Check for payment status in URL
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('payment');
        
        if (paymentStatus === 'success') {
          toast.success('Payment successful! Your locker has been booked.');
          queryClient.invalidateQueries({ queryKey: ['userLocker'] });
          // Clean up URL
          window.history.replaceState({}, '', window.location.pathname);
        } else if (paymentStatus === 'cancelled') {
          toast.error('Payment was cancelled.');
          window.history.replaceState({}, '', window.location.pathname);
        }
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

  const { data: nearbyGyms = [], isLoading: loadingGyms, refetch: refetchGyms } = useQuery({
    queryKey: ['nearbyGyms', userLocation],
    queryFn: async () => {
      if (!userLocation) return [];
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Find 10 real gym locations near latitude ${userLocation.latitude}, longitude ${userLocation.longitude}. Include popular chains like Planet Fitness, LA Fitness, 24 Hour Fitness, Equinox, Gold's Gym, Crunch Fitness, Anytime Fitness, etc. Return ONLY a JSON array with this exact structure, no other text:
[
  {
    "name": "Gym Name",
    "address": "Full address",
    "distance_miles": 0.5,
    "latitude": 40.7128,
    "longitude": -74.0060
  }
]`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            gyms: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  address: { type: "string" },
                  distance_miles: { type: "number" },
                  latitude: { type: "number" },
                  longitude: { type: "number" }
                }
              }
            }
          }
        }
      });
      
      return result.gyms || [];
    },
    enabled: !!userLocation,
  });

  const { data: lockerAvailability = {} } = useQuery({
    queryKey: ['lockerAvailability', nearbyGyms],
    queryFn: async () => {
      const availability = {};
      for (const gym of nearbyGyms) {
        const gymKey = `${gym.name}_${gym.address}`;
        // Check if this gym exists in our system
        const existingGyms = await base44.entities.Gym.filter({
          name: gym.name,
          address: gym.address
        });
        
        if (existingGyms.length > 0) {
          const availableLockers = await base44.entities.Locker.filter({
            gym_id: existingGyms[0].id,
            status: 'available'
          });
          availability[gymKey] = availableLockers.length;
        } else {
          availability[gymKey] = 0; // No lockers available if gym not in system
        }
      }
      return availability;
    },
    enabled: nearbyGyms.length > 0,
    refetchInterval: 30000,
  });

  const gymsWithDistance = nearbyGyms.map(gym => ({
    ...gym,
    distance: gym.distance_miles.toFixed(1),
    gymKey: `${gym.name}_${gym.address}`
  })).sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

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
          toast.success('Finding gyms near you...');
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

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file) => {
      // Convert file to base64
      const reader = new FileReader();
      const fileData = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      const response = await base44.functions.invoke('uploadProfilePhoto', {
        file_data: fileData,
        file_name: file.name,
        file_type: file.type
      });
      return response.data;
    },
    onSuccess: async (data) => {
      toast.success('Profile photo updated!');
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
      setUploadingPhoto(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to upload photo');
      setUploadingPhoto(false);
    }
  });

  const handlePhotoSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadingPhoto(true);
      uploadPhotoMutation.mutate(file);
    }
  };

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('deleteUserAccount', {});
      return response.data;
    },
    onSuccess: () => {
      toast.success('Account deleted successfully');
      setTimeout(() => {
        base44.auth.logout();
      }, 1500);
    },
    onError: (error) => {
      toast.error('Failed to delete account');
    },
  });

  const claimLockerMutation = useMutation({
    mutationFn: async (bookingDuration = 24) => {
      const selectedGym = nearbyGyms.find(g => `${g.name}_${g.address}` === formData.preferred_gym);
      if (!selectedGym) throw new Error('Please select a gym first');
      
      // Check if gym exists in our system, if not create it
      let existingGyms = await base44.entities.Gym.filter({
        name: selectedGym.name,
        address: selectedGym.address
      });
      
      let gymId;
      if (existingGyms.length === 0) {
        const newGym = await base44.entities.Gym.create({
          name: selectedGym.name,
          address: selectedGym.address,
          city: selectedGym.address.split(',').slice(-2)[0]?.trim() || 'Unknown',
          total_lockers: 50
        });
        gymId = newGym.id;
        
        // Create initial lockers for this gym
        const lockerPromises = [];
        for (let i = 1; i <= 50; i++) {
          lockerPromises.push(
            base44.entities.Locker.create({
              gym_id: gymId,
              locker_number: String(i).padStart(3, '0'),
              access_code: String(Math.floor(1000 + Math.random() * 9000)),
              status: 'available',
              is_locked: true
            })
          );
        }
        await Promise.all(lockerPromises);
      } else {
        gymId = existingGyms[0].id;
      }
      
      const availableLockers = await base44.entities.Locker.filter({
        gym_id: gymId,
        status: 'available'
      });
      
      if (availableLockers.length === 0) {
        throw new Error('No available lockers at this gym');
      }
      
      const now = new Date();
      const bookingEnd = addHours(now, bookingDuration);
      
      const locker = availableLockers[0];
      return base44.entities.Locker.update(locker.id, {
        user_email: user.email,
        status: 'claimed',
        is_locked: true,
        booking_start: now.toISOString(),
        booking_end: bookingEnd.toISOString()
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

  const fetchAIRecommendations = async (gymId) => {
    if (!gymId) return;
    
    setLoadingAiRecs(true);
    try {
      const response = await base44.functions.invoke('getLockerRecommendations', { gym_id: gymId });
      setAiRecommendations(response.data);
    } catch (error) {
      console.error('Failed to fetch AI recommendations:', error);
      toast.error('Could not load AI recommendations');
    } finally {
      setLoadingAiRecs(false);
    }
  };

  const handleGymSelection = async (gymKey) => {
    setFormData({ ...formData, preferred_gym: gymKey });
    
    // Fetch gym ID and get AI recommendations
    const selectedGym = nearbyGyms.find(g => `${g.name}_${g.address}` === gymKey);
    if (selectedGym) {
      const existingGyms = await base44.entities.Gym.filter({
        name: selectedGym.name,
        address: selectedGym.address
      });
      
      if (existingGyms.length > 0) {
        fetchAIRecommendations(existingGyms[0].id);
      }
    }
  };

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
      <MobileHeader
        title="Profile"
        subtitle="Account settings"
        icon={Settings}
        iconColor="text-lime-500"
      />

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
            {/* Profile Photo */}
            <div className="flex items-center gap-4 pb-4 border-b border-gray-700">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-[#7cfc00]/20 flex items-center justify-center overflow-hidden border-2 border-[#7cfc00]">
                  {user.profile_photo ? (
                    <img src={user.profile_photo} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-[#7cfc00]" />
                  )}
                </div>
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-white font-semibold mb-1">Profile Photo</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <Button
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="bg-[#7cfc00] text-black hover:bg-[#6be600]"
                >
                  <Upload className="w-3 h-3 mr-2" />
                  {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                </Button>
                <p className="text-gray-500 text-xs mt-1">JPG, PNG or WebP. Max 5MB.</p>
              </div>
            </div>

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
                  disabled={loadingLocation || loadingGyms}
                >
                  {loadingLocation || loadingGyms ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Navigation className="w-3 h-3 mr-1" />
                  )}
                  {userLocation ? 'Update Location' : 'Use My Location'}
                </Button>
              </div>
              {!userLocation ? (
                <div className="bg-[#0d1320] rounded-lg p-6 border border-gray-700 text-center">
                  <Navigation className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Enable location to find gyms near you</p>
                  <Button
                    size="sm"
                    className="mt-3 bg-[#7cfc00] text-black hover:bg-[#6be600]"
                    onClick={requestLocation}
                    disabled={loadingLocation}
                  >
                    {loadingLocation ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Navigation className="w-3 h-3 mr-1" />}
                    Find Gyms Near Me
                  </Button>
                </div>
              ) : loadingGyms ? (
                <div className="bg-[#0d1320] rounded-lg p-6 border border-gray-700 text-center">
                  <Loader2 className="w-8 h-8 text-[#7cfc00] mx-auto mb-2 animate-spin" />
                  <p className="text-gray-400 text-sm">Finding gyms near you...</p>
                </div>
              ) : gymsWithDistance.length === 0 ? (
                <div className="bg-[#0d1320] rounded-lg p-6 border border-gray-700 text-center">
                  <p className="text-gray-400 text-sm">No gyms found nearby</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => refetchGyms()}
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                  <Select
                    value={formData.preferred_gym}
                    onValueChange={handleGymSelection}
                  >
                    <SelectTrigger className="bg-[#0d1320] border-gray-700 text-white">
                      <SelectValue placeholder="Select a gym" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2332] border-gray-700 max-h-72">
                      {gymsWithDistance.map((gym, index) => (
                        <SelectItem key={index} value={gym.gymKey} className="text-white h-auto py-3">
                          <div className="flex items-start justify-between gap-3 w-full">
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-white truncate">{gym.name}</div>
                              <div className="text-gray-400 text-xs mt-1">{gym.address}</div>
                              {lockerAvailability[gym.gymKey] !== undefined && (
                                <div className={`text-xs mt-1 ${lockerAvailability[gym.gymKey] > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                                  {lockerAvailability[gym.gymKey] > 0 ? `${lockerAvailability[gym.gymKey]} lockers available` : 'Setup required'}
                                </div>
                              )}
                            </div>
                            <span className="text-[#7cfc00] text-xs flex items-center gap-1 flex-shrink-0">
                              <MapPin className="w-3 h-3" />
                              {gym.distance} mi
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center justify-between mt-1">
                    {gymsWithDistance[0] && (
                      <p className="text-gray-500 text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Nearest: {gymsWithDistance[0].name} ({gymsWithDistance[0].distance} mi away)
                      </p>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[#7cfc00] hover:text-[#6be600] h-7 text-xs"
                      onClick={() => setShowMap(!showMap)}
                    >
                      <Map className="w-3 h-3 mr-1" />
                      {showMap ? 'Hide Map' : 'View Map'}
                    </Button>
                  </div>
                  {showMap && gymsWithDistance.length > 0 && (
                    <div className="mt-4">
                      <GymMapView 
                        gyms={gymsWithDistance}
                        selectedGym={selectedGymOnMap}
                        onSelectGym={(gym) => {
                          setSelectedGymOnMap(gym);
                          setFormData({ ...formData, preferred_gym: gym.gymKey });
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {locker ? (
              <div className="space-y-4">
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
                </div>

                <LockerControls 
                  locker={locker} 
                  gym={nearbyGyms.find(g => `${g.name}_${g.address}` === formData.preferred_gym)} 
                />

                <div className="grid grid-cols-2 gap-2">
                  <BookingExtension locker={locker} />
                  <ReportIssueDialog locker={locker} user={user} />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* AI Recommendations */}
                {formData.preferred_gym && (
                  <AILockerRecommendations
                    recommendations={aiRecommendations}
                    isLoading={loadingAiRecs}
                    onSelectLocker={(lockerNumber) => {
                      toast.success(`Selected locker #${lockerNumber}`);
                    }}
                  />
                )}
                
                <div className="bg-[#0d1320] rounded-lg p-4 border border-gray-700">
                  <p className="text-gray-400 mb-3">
                    {formData.preferred_gym && lockerAvailability[formData.preferred_gym] === 0 
                      ? 'No lockers available at this gym' 
                      : "You don't have a locker yet"}
                  </p>
                  {formData.preferred_gym && lockerAvailability[formData.preferred_gym] !== undefined && (
                    <p className="text-green-400 text-sm mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      {lockerAvailability[formData.preferred_gym] === 0 ? 'Locker setup available' : `${lockerAvailability[formData.preferred_gym]} lockers available`}
                    </p>
                  )}
                  <Button
                    className="w-full bg-[#7cfc00] text-black hover:bg-[#6be600]"
                    onClick={() => setShowCheckout(true)}
                    disabled={!formData.preferred_gym}
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Book Locker
                  </Button>
                  
                  {showCheckout && formData.preferred_gym && (
                    <LockerCheckout
                      open={showCheckout}
                      onClose={() => setShowCheckout(false)}
                      gym={nearbyGyms.find(g => `${g.name}_${g.address}` === formData.preferred_gym)}
                      user={user}
                      onSuccess={(duration) => claimLockerMutation.mutate(duration)}
                    />
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        <Button
          className="bg-[#7cfc00] text-black hover:bg-[#6be600] select-none"
          onClick={() => updateProfileMutation.mutate(formData)}
          disabled={updateProfileMutation.isPending}
        >
          <Save className="w-4 h-4 mr-2 select-none" />
          Save Changes
        </Button>

        {/* Delete Account */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-500/10 select-none">
              <Trash2 className="w-4 h-4 mr-2 select-none" />
              Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-[#1a2332] border-red-500/50">
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-500 select-none" />
                </div>
                <AlertDialogTitle className="text-white text-xl">Delete Account</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-gray-400">
                This action cannot be undone. This will permanently delete your account and remove all your data including:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Profile information and photos</li>
                  <li>Locker bookings and history</li>
                  <li>Orders and payment records</li>
                  <li>Subscription details</li>
                  <li>All notifications and preferences</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-700 text-white border-gray-600 select-none">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 hover:bg-red-600 text-white select-none"
                onClick={() => deleteAccountMutation.mutate()}
                disabled={deleteAccountMutation.isPending}
              >
                {deleteAccountMutation.isPending ? 'Deleting...' : 'Delete Account'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}