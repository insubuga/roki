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
import MemberDataHistory from '../components/profile/MemberDataHistory';

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
        console.error('Auth error:', e);
        setUser(null);
      }
    };
    loadUser();
  }, []);

  const { data: locker } = useQuery({
    queryKey: ['userLocker', user?.email],
    queryFn: async () => {
      const lockers = await base44.entities.Locker.filter({ user_email: user?.email });
      return lockers[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: nearbyGyms = [], isLoading: loadingGyms, refetch: refetchGyms } = useQuery({
    queryKey: ['nearbyGyms', userLocation],
    queryFn: async () => {
      if (!userLocation) return [];
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Find real gym locations WITHIN 15 MILES of latitude ${userLocation.latitude}, longitude ${userLocation.longitude}. 
CRITICAL: Only include gyms that are 15 miles or less from the user's location. This is for delivery drivers who need to reach these locations quickly.
Include popular chains like Planet Fitness, LA Fitness, 24 Hour Fitness, Equinox, Gold's Gym, Crunch Fitness, Anytime Fitness, etc.
Return up to 15 gyms, sorted by distance (closest first). Return ONLY a JSON object with this exact structure:
{
  "gyms": [
    {
      "name": "Gym Name",
      "address": "Full address",
      "distance_miles": 0.5,
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  ]
}`,
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
      
      // Filter to ensure only gyms within 15 miles are included
      const gyms = result.gyms || [];
      return gyms.filter(gym => gym.distance_miles <= 15);
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
    mutationFn: async (data) => {
      await base44.auth.updateMe(data);
      return data;
    },
    onSuccess: async () => {
      toast.success('Profile updated!');
      // Refresh user data
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['userLocker'] });
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast.error('Failed to update profile');
    }
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
      // Refresh user data to get the new photo
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
      setUploadingPhoto(false);
      // Force re-render
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (error) => {
      console.error('Upload error:', error);
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--color-text-secondary)] text-sm">Loading profile...</p>
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
        iconColor="text-green-600"
      />

      {/* Member History - Top Priority */}
      <MemberDataHistory user={user} />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Account Info */}
        <Card className="bg-card border-border shadow-lg">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <User className="w-5 h-5 text-green-600" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Profile Photo */}
            <div className="flex items-center gap-4 pb-4 border-b border-border">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center overflow-hidden border-2 border-green-300 shadow-md">
                  {user.profile_photo ? (
                    <img src={user.profile_photo} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-green-600" />
                  )}
                </div>
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-foreground font-semibold mb-1">Profile Photo</p>
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
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-md"
                >
                  <Upload className="w-3 h-3 mr-2" />
                  {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                </Button>
                <p className="text-muted-foreground text-xs mt-1">JPG, PNG or WebP. Max 5MB.</p>
              </div>
            </div>

            <div>
              <Label className="text-foreground font-medium">Full Name</Label>
              <Input
                value={user.full_name || ''}
                disabled
                className="bg-muted border-border text-muted-foreground mt-1"
              />
            </div>
            <div>
              <Label className="text-foreground font-medium">Email</Label>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <Input
                  value={user.email || ''}
                  disabled
                  className="bg-muted border-border text-muted-foreground"
                />
              </div>
            </div>
            <div>
              <Label className="text-foreground font-medium">Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter your phone number"
                className="bg-muted border-border text-foreground mt-1 focus:ring-2 focus:ring-green-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Gym & Locker */}
        <Card className="bg-card border-border shadow-lg">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Lock className="w-5 h-5 text-green-600" />
              Gym & Locker
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-foreground font-medium">Preferred Gym</Label>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 h-7 text-xs shadow-md"
                  onClick={requestLocation}
                  disabled={loadingLocation || loadingGyms}
                >
                  {loadingLocation || loadingGyms ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Navigation className="w-3 h-3 mr-1" />
                  )}
                  {userLocation ? 'Update' : 'Use Location'}
                </Button>
              </div>
              {!userLocation ? (
                <div className="bg-gradient-to-br from-muted to-accent rounded-lg p-6 border border-border text-center shadow-sm">
                  <Navigation className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">Enable location to find gyms near you</p>
                  <Button
                    size="sm"
                    className="mt-3 bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-md"
                    onClick={requestLocation}
                    disabled={loadingLocation}
                  >
                    {loadingLocation ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Navigation className="w-3 h-3 mr-1" />}
                    Find Gyms Near Me
                  </Button>
                </div>
              ) : loadingGyms ? (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg p-6 border border-green-200 dark:border-green-900/50 text-center shadow-sm">
                  <Loader2 className="w-8 h-8 text-green-600 mx-auto mb-2 animate-spin" />
                  <p className="text-muted-foreground text-sm">Finding gyms near you...</p>
                </div>
              ) : gymsWithDistance.length === 0 ? (
                <div className="bg-muted rounded-lg p-6 border border-border text-center shadow-sm">
                  <p className="text-muted-foreground text-sm">No gyms found nearby</p>
                  <Button
                    size="sm"
                    className="mt-3 bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-md"
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
                    <SelectTrigger className="bg-muted border-border text-foreground focus:ring-2 focus:ring-green-500">
                      <SelectValue placeholder="Select a gym" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border max-h-72">
                      {gymsWithDistance.map((gym, index) => (
                        <SelectItem key={index} value={gym.gymKey} className="text-foreground h-auto py-3">
                          <div className="flex items-start justify-between gap-3 w-full">
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-foreground truncate">{gym.name}</div>
                              <div className="text-muted-foreground text-xs mt-1">{gym.address}</div>
                              {lockerAvailability[gym.gymKey] !== undefined && (
                                <div className={`text-xs mt-1 ${lockerAvailability[gym.gymKey] > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                                  {lockerAvailability[gym.gymKey] > 0 ? `${lockerAvailability[gym.gymKey]} lockers available` : 'Setup required'}
                                </div>
                              )}
                            </div>
                            <span className="text-green-600 text-xs flex items-center gap-1 flex-shrink-0 font-medium">
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
                      <p className="text-muted-foreground text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Nearest: {gymsWithDistance[0].name} ({gymsWithDistance[0].distance} mi away)
                      </p>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-green-600 hover:text-green-700 h-7 text-xs"
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
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-300 shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-900 font-bold text-2xl">#{locker.locker_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-600 font-mono font-bold text-2xl">{locker.access_code}</p>
                    </div>
                  </div>
                </div>

                <LockerControls 
                  locker={locker} 
                  gym={nearbyGyms.find(g => `${g.name}_${g.address}` === formData.preferred_gym)} 
                />
              </div>
            ) : (
              <div className="pt-4">
                <Button
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-md"
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        <Button
          className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 select-none shadow-md"
          onClick={() => updateProfileMutation.mutate(formData)}
          disabled={updateProfileMutation.isPending}
        >
          <Save className="w-4 h-4 mr-2 select-none" />
          Save Changes
        </Button>

        {/* Delete Account */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 select-none">
              <Trash2 className="w-4 h-4 mr-2 select-none" />
              Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card border-red-300">
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600 select-none" />
                </div>
                <AlertDialogTitle className="text-foreground text-xl">Delete Account</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-muted-foreground">
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
              <AlertDialogCancel className="bg-muted text-foreground border-border hover:bg-accent select-none">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white select-none shadow-md"
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