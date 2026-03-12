import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User, Mail, Lock, Save, MapPin, Navigation, Loader2, Map,
  Upload, Trash2, AlertTriangle, Phone, CheckCircle, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { addHours } from 'date-fns';
import LockerControls from '../components/locker/LockerControls';
import GymMapView from '../components/locker/GymMapView';
import MemberDataHistory from '../components/profile/MemberDataHistory';

// Helper: claim a locker after successful Stripe payment
async function claimLockerAfterPayment({ gymName, gymAddress, duration, userEmail }) {
  // Find or create gym
  let gyms = await base44.entities.Gym.filter({ name: gymName, address: gymAddress });
  let gymId;

  if (gyms.length === 0) {
    const newGym = await base44.entities.Gym.create({
      name: gymName,
      address: gymAddress,
      city: gymAddress.split(',').slice(-2)[0]?.trim() || 'Unknown',
      total_lockers: 50,
    });
    gymId = newGym.id;
    // Seed lockers
    await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        base44.entities.Locker.create({
          gym_id: gymId,
          locker_number: String(i + 1).padStart(3, '0'),
          access_code: String(Math.floor(1000 + Math.random() * 9000)),
          status: 'available',
          is_locked: true,
        })
      )
    );
  } else {
    gymId = gyms[0].id;
  }

  const available = await base44.entities.Locker.filter({ gym_id: gymId, status: 'available' });
  if (available.length === 0) throw new Error('No available lockers at this gym');

  const now = new Date();
  return base44.entities.Locker.update(available[0].id, {
    user_email: userEmail,
    status: 'claimed',
    is_locked: true,
    booking_start: now.toISOString(),
    booking_end: addHours(now, parseInt(duration, 10)).toISOString(),
  });
}

export default function Profile() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ preferred_gym: '', phone: '' });
  const [userLocation, setUserLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  // Load user + handle post-payment redirect
  useEffect(() => {
    const init = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        setFormData({
          preferred_gym: userData.preferred_gym || '',
          phone: userData.phone || '',
        });

        const params = new URLSearchParams(window.location.search);
        const paymentStatus = params.get('payment');
        window.history.replaceState({}, '', window.location.pathname);

        if (paymentStatus === 'success') {
          // Retrieve pending booking from sessionStorage
          const pending = sessionStorage.getItem('pendingLockerBooking');
          sessionStorage.removeItem('pendingLockerBooking');

          if (pending) {
            try {
              const { gymName, gymAddress, gymKey, duration } = JSON.parse(pending);
              await claimLockerAfterPayment({
                gymName, gymAddress, duration, userEmail: userData.email,
              });
              // Save preferred gym
              await base44.auth.updateMe({ preferred_gym: gymKey, phone: userData.phone });
              toast.success('Payment successful! Locker booked and assigned.');
              queryClient.invalidateQueries({ queryKey: ['userLocker'] });
            } catch (err) {
              toast.error(`Payment received but locker assignment failed: ${err.message}`);
            }
          } else {
            toast.success('Payment successful! Your locker has been booked.');
            queryClient.invalidateQueries({ queryKey: ['userLocker'] });
          }
        } else if (paymentStatus === 'cancelled') {
          toast.error('Payment was cancelled.');
        }
      } catch (e) {
        setUser(null);
      }
    };
    init();
  }, []);

  const { data: locker } = useQuery({
    queryKey: ['userLocker', user?.email],
    queryFn: () => base44.entities.Locker.filter({ user_email: user.email }).then(r => r[0] || null),
    enabled: !!user?.email,
  });

  const { data: nearbyGyms = [], isLoading: loadingGyms, refetch: refetchGyms } = useQuery({
    queryKey: ['nearbyGyms', userLocation],
    queryFn: async () => {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Find real gym locations WITHIN 15 MILES of latitude ${userLocation.latitude}, longitude ${userLocation.longitude}.
Include popular chains like Planet Fitness, LA Fitness, 24 Hour Fitness, Equinox, Gold's Gym, Crunch Fitness, Anytime Fitness.
Return up to 15 gyms sorted by distance (closest first). Return JSON:
{"gyms":[{"name":"Gym Name","address":"Full address","distance_miles":0.5,"latitude":40.7128,"longitude":-74.006}]}`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            gyms: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  address: { type: 'string' },
                  distance_miles: { type: 'number' },
                  latitude: { type: 'number' },
                  longitude: { type: 'number' },
                },
              },
            },
          },
        },
      });
      return (result.gyms || []).filter(g => g.distance_miles <= 15);
    },
    enabled: !!userLocation,
  });

  const gymsWithKey = nearbyGyms
    .map(g => ({ ...g, gymKey: `${g.name}_${g.address}` }))
    .sort((a, b) => a.distance_miles - b.distance_miles);

  const requestLocation = () => {
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLoadingLocation(false);
        toast.success('Finding gyms near you...');
      },
      () => {
        setLoadingLocation(false);
        toast.error('Could not get your location');
      }
    );
  };

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: async () => {
      toast.success('Profile saved');
      const updated = await base44.auth.me();
      setUser(updated);
    },
    onError: () => toast.error('Failed to save profile'),
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file) => {
      const reader = new FileReader();
      const fileData = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return base44.functions.invoke('uploadProfilePhoto', {
        file_data: fileData, file_name: file.name, file_type: file.type,
      });
    },
    onSuccess: async () => {
      toast.success('Photo updated!');
      const updated = await base44.auth.me();
      setUser(updated);
      setUploadingPhoto(false);
    },
    onError: () => {
      toast.error('Failed to upload photo');
      setUploadingPhoto(false);
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => base44.functions.invoke('deleteUserAccount', {}),
    onSuccess: () => {
      toast.success('Account deleted');
      setTimeout(() => base44.auth.logout(), 1500);
    },
    onError: () => toast.error('Failed to delete account'),
  });

  const selectedGym = gymsWithKey.find(g => g.gymKey === formData.preferred_gym);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground font-mono tracking-tight uppercase">Profile</h1>
        <p className="text-muted-foreground text-xs font-mono mt-0.5 uppercase tracking-widest">
          Account · Locker · Settings
        </p>
      </div>

      {/* Member history */}
      <MemberDataHistory user={user} />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Account Information ── */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground flex items-center gap-2 font-mono text-sm uppercase">
              <User className="w-4 h-4 text-green-600" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Photo */}
            <div className="flex items-center gap-4 pb-4 border-b border-border">
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-muted border-2 border-green-600/40 flex items-center justify-center overflow-hidden">
                  {user.profile_photo ? (
                    <img src={user.profile_photo} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                {uploadingPhoto && (
                  <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-foreground font-mono text-xs font-semibold uppercase mb-1">Profile Photo</p>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setUploadingPhoto(true); uploadPhotoMutation.mutate(f); }
                  }}
                  className="hidden"
                />
                <Button size="sm" onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="bg-green-600 hover:bg-green-700 text-white font-mono text-xs h-7"
                >
                  <Upload className="w-3 h-3 mr-1" />
                  {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                </Button>
                <p className="text-muted-foreground text-xs font-mono mt-1">JPG, PNG or WebP · Max 5MB</p>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <Label className="text-muted-foreground font-mono text-xs uppercase tracking-wider">Full Name</Label>
              <Input value={user.full_name || ''} disabled
                className="bg-muted border-border text-foreground mt-1 font-mono text-sm" />
            </div>

            {/* Email */}
            <div>
              <Label className="text-muted-foreground font-mono text-xs uppercase tracking-wider">Email</Label>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Input value={user.email || ''} disabled
                  className="bg-muted border-border text-foreground font-mono text-sm" />
              </div>
            </div>

            {/* Phone */}
            <div>
              <Label className="text-muted-foreground font-mono text-xs uppercase tracking-wider">Phone</Label>
              <div className="flex items-center gap-2 mt-1">
                <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                  className="bg-muted border-border text-foreground font-mono text-sm focus-visible:ring-green-600"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Gym & Locker ── */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground flex items-center gap-2 font-mono text-sm uppercase">
              <Lock className="w-4 h-4 text-green-600" />
              Gym & Locker Node
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Location finder */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-muted-foreground font-mono text-xs uppercase tracking-wider">Select Gym</Label>
                <Button size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white font-mono text-xs h-7"
                  onClick={requestLocation}
                  disabled={loadingLocation || loadingGyms}
                >
                  {(loadingLocation || loadingGyms) ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Navigation className="w-3 h-3 mr-1" />
                  )}
                  {userLocation ? 'Refresh' : 'Use Location'}
                </Button>
              </div>

              {!userLocation ? (
                <div className="bg-muted/50 border border-border rounded-lg p-6 text-center">
                  <Navigation className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground font-mono text-xs mb-3">
                    Enable location to find gyms near you
                  </p>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-mono text-xs"
                    onClick={requestLocation} disabled={loadingLocation}
                  >
                    {loadingLocation ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Navigation className="w-3 h-3 mr-1" />}
                    Find Gyms Near Me
                  </Button>
                </div>
              ) : loadingGyms ? (
                <div className="bg-muted/50 border border-border rounded-lg p-6 text-center">
                  <Loader2 className="w-8 h-8 text-green-600 mx-auto mb-2 animate-spin" />
                  <p className="text-muted-foreground font-mono text-xs">Scanning nearby gyms...</p>
                </div>
              ) : gymsWithKey.length === 0 ? (
                <div className="bg-muted/50 border border-border rounded-lg p-4 text-center">
                  <p className="text-muted-foreground font-mono text-xs mb-2">No gyms found within 15 miles</p>
                  <Button size="sm" variant="outline" className="font-mono text-xs" onClick={() => refetchGyms()}>
                    Retry
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Select value={formData.preferred_gym} onValueChange={(v) => setFormData({ ...formData, preferred_gym: v })}>
                    <SelectTrigger className="bg-muted border-border text-foreground font-mono text-sm focus:ring-green-600">
                      <SelectValue placeholder="Select a gym" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border max-h-72">
                      {gymsWithKey.map((gym, idx) => (
                        <SelectItem key={idx} value={gym.gymKey} className="text-foreground font-mono py-3">
                          <div className="flex items-center justify-between w-full gap-4">
                            <div>
                              <div className="font-semibold text-sm">{gym.name}</div>
                              <div className="text-muted-foreground text-xs">{gym.address}</div>
                            </div>
                            <span className="text-green-600 text-xs font-mono flex-shrink-0">
                              {gym.distance_miles.toFixed(1)} mi
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedGym && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                      <MapPin className="w-3 h-3 text-green-600" />
                      {selectedGym.name} · {selectedGym.distance_miles.toFixed(1)} mi away
                    </div>
                  )}

                  <Button size="sm" variant="ghost"
                    className="text-muted-foreground hover:text-foreground font-mono text-xs h-7 px-2"
                    onClick={() => setShowMap(!showMap)}
                  >
                    <Map className="w-3 h-3 mr-1" />
                    {showMap ? 'Hide Map' : 'View Map'}
                  </Button>

                  {showMap && gymsWithKey.length > 0 && (
                    <GymMapView
                      gyms={gymsWithKey}
                      selectedGym={gymsWithKey.find(g => g.gymKey === formData.preferred_gym)}
                      onSelectGym={(gym) => setFormData({ ...formData, preferred_gym: gym.gymKey })}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Locker section */}
            <div className="border-t border-border pt-4">
              {locker ? (
                <div className="space-y-3">
                  {/* Locker info card */}
                  <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-green-600" />
                        <span className="text-foreground font-mono font-bold text-sm">
                          Locker #{locker.locker_number}
                        </span>
                      </div>
                      <Badge className="bg-green-600/20 text-green-600 border border-green-600/40 font-mono text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" /> Active
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-muted-foreground font-mono text-xs">Access Code</span>
                      <span className="text-green-600 font-mono font-bold text-xl tracking-widest">
                        {locker.access_code}
                      </span>
                    </div>
                    {locker.booking_end && (
                      <p className="text-muted-foreground font-mono text-xs mt-2">
                        Expires · {new Date(locker.booking_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <LockerControls locker={locker} gym={selectedGym} />
                </div>
              ) : (
                <div>
                  <div className="bg-muted/50 border border-border rounded-lg p-4 mb-3 text-center">
                    <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-foreground font-mono text-sm font-semibold">No locker assigned</p>
                    <p className="text-muted-foreground font-mono text-xs mt-1">
                      Select a gym and book a locker node for your gear
                    </p>
                  </div>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-mono text-sm font-bold h-10"
                    onClick={() => setShowCheckout(true)}
                    disabled={!formData.preferred_gym}
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    {formData.preferred_gym ? 'Book Locker' : 'Select a gym first'}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <Button
          className="bg-green-600 hover:bg-green-700 text-white font-mono text-sm font-bold select-none"
          onClick={() => updateProfileMutation.mutate(formData)}
          disabled={updateProfileMutation.isPending}
        >
          {updateProfileMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2 select-none" />
          )}
          SAVE CHANGES
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="border-red-700 text-red-500 hover:bg-red-950/30 font-mono text-sm select-none">
              <Trash2 className="w-4 h-4 mr-2 select-none" />
              DELETE ACCOUNT
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-red-950/30 border border-red-700 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <AlertDialogTitle className="text-foreground font-mono">Delete Account</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-muted-foreground font-mono text-sm">
                This is permanent and cannot be undone. All data including profile, lockers, orders, subscriptions, and history will be erased.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-muted text-foreground border-border font-mono">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 text-white font-mono"
                onClick={() => deleteAccountMutation.mutate()}
                disabled={deleteAccountMutation.isPending}
              >
                {deleteAccountMutation.isPending ? 'Deleting...' : 'Delete Account'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Locker Checkout Dialog */}
      {showCheckout && selectedGym && (
        <LockerCheckout
          open={showCheckout}
          onClose={() => setShowCheckout(false)}
          gym={selectedGym}
          user={user}
        />
      )}
    </div>
  );
}