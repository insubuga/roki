import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User, Mail, Lock, Save, MapPin, Navigation, Loader2, Map,
  Upload, Trash2, AlertTriangle, Phone, CheckCircle, Package,
  Crown, Shield, Zap
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
import { addMonths } from 'date-fns';
import LockerControls from '../components/locker/LockerControls';
import GymMapView from '../components/locker/GymMapView';
import MemberDataHistory from '../components/profile/MemberDataHistory';

const PLAN_PERKS = {
  core: {
    label: 'Core Readiness',
    icon: Shield,
    color: 'text-green-600',
    bg: 'bg-green-600/10',
    border: 'border-green-600/30',
    lockerZone: 'Standard Zone',
    lockerDuration: 'Monthly (renews with plan)',
  },
  priority: {
    label: 'Priority Readiness',
    icon: Crown,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    lockerZone: 'Premium Zone',
    lockerDuration: 'Monthly (renews with plan)',
  },
};

export default function Profile() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ preferred_gym: '', phone: '' });
  const [userLocation, setUserLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then((userData) => {
      setUser(userData);
      setFormData({ preferred_gym: userData.preferred_gym || '', phone: userData.phone || '' });
    }).catch(() => setUser(null));
  }, []);

  const { data: subscription } = useQuery({
    queryKey: ['subscription', user?.email],
    queryFn: () => base44.entities.Subscription.filter({ user_email: user.email }).then(r => r[0] || null),
    enabled: !!user?.email,
  });

  const { data: locker } = useQuery({
    queryKey: ['userLocker', user?.email],
    queryFn: () => base44.entities.Locker.filter({ user_email: user.email }).then(r => r[0] || null),
    enabled: !!user?.email,
  });

  const { data: allGyms = [], isLoading: loadingGyms, refetch: refetchGyms } = useQuery({
    queryKey: ['allDbGyms'],
    queryFn: () => base44.entities.Gym.list(),
  });

  // Haversine distance in miles
  function calcDistance(lat1, lng1, lat2, lng2) {
    const R = 3958.8;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const gymsWithKey = allGyms
    .filter(g => {
      if (!userLocation || g.latitude == null || g.longitude == null) return true; // show all if no location yet
      return calcDistance(userLocation.latitude, userLocation.longitude, g.latitude, g.longitude) <= 15;
    })
    .map(g => {
      const distance_miles = (userLocation && g.latitude != null && g.longitude != null)
        ? calcDistance(userLocation.latitude, userLocation.longitude, g.latitude, g.longitude)
        : null;
      return { ...g, distance_miles, gymKey: g.id };
    })
    .sort((a, b) => (a.distance_miles ?? 999) - (b.distance_miles ?? 999));

  const requestLocation = () => {
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLoadingLocation(false);
        toast.success('Finding gyms near you...');
      },
      () => { setLoadingLocation(false); toast.error('Could not get your location'); }
    );
  };

  // Assign locker directly — no payment needed, covered by subscription
  const assignLockerMutation = useMutation({
    mutationFn: async () => {
      if (!subscription || subscription.status !== 'active') {
        throw new Error('An active subscription is required to assign a locker');
      }
      const selectedGym = gymsWithKey.find(g => g.gymKey === formData.preferred_gym);
      if (!selectedGym) throw new Error('Please select a gym first');

      const gymId = selectedGym.id;

      const available = await base44.entities.Locker.filter({ gym_id: gymId, status: 'available' });
      if (available.length === 0) throw new Error('No available lockers at this gym. Try another location.');

      const now = new Date();
      // Locker valid for 1 month (aligned with subscription cycle)
      await base44.entities.Locker.update(available[0].id, {
        user_email: user.email,
        status: 'claimed',
        is_locked: true,
        booking_start: now.toISOString(),
        booking_end: addMonths(now, 1).toISOString(),
      });

      // Save preferred gym to profile
      await base44.auth.updateMe({ preferred_gym: formData.preferred_gym });
    },
    onSuccess: () => {
      toast.success('Locker assigned! Covered by your subscription.');
      queryClient.invalidateQueries({ queryKey: ['userLocker'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: async () => {
      toast.success('Profile saved');
      setUser(await base44.auth.me());
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
      return base44.functions.invoke('uploadProfilePhoto', { file_data: fileData, file_name: file.name, file_type: file.type });
    },
    onSuccess: async () => {
      toast.success('Photo updated!');
      setUser(await base44.auth.me());
      setUploadingPhoto(false);
    },
    onError: () => { toast.error('Failed to upload photo'); setUploadingPhoto(false); },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => base44.functions.invoke('deleteUserAccount', {}),
    onSuccess: () => { toast.success('Account deleted'); setTimeout(() => base44.auth.logout(), 1500); },
    onError: () => toast.error('Failed to delete account'),
  });

  const selectedGym = gymsWithKey.find(g => g.gymKey === formData.preferred_gym);
  const planId = subscription?.plan || 'core';
  const planPerks = PLAN_PERKS[planId] || PLAN_PERKS.core;
  const PlanIcon = planPerks.icon;
  const hasActiveSub = subscription?.status === 'active';

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
                  {user.profile_photo
                    ? <img src={user.profile_photo} alt="Profile" className="w-full h-full object-cover" />
                    : <User className="w-8 h-8 text-muted-foreground" />}
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
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { setUploadingPhoto(true); uploadPhotoMutation.mutate(f); } }}
                  className="hidden"
                />
                <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}
                  className="bg-green-600 hover:bg-green-700 text-white font-mono text-xs h-7">
                  <Upload className="w-3 h-3 mr-1" />
                  {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                </Button>
                <p className="text-muted-foreground text-xs font-mono mt-1">JPG, PNG or WebP · Max 5MB</p>
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground font-mono text-xs uppercase tracking-wider">Full Name</Label>
              <Input value={user.full_name || ''} disabled className="bg-muted border-border text-foreground mt-1 font-mono text-sm" />
            </div>
            <div>
              <Label className="text-muted-foreground font-mono text-xs uppercase tracking-wider">Email</Label>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Input value={user.email || ''} disabled className="bg-muted border-border text-foreground font-mono text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground font-mono text-xs uppercase tracking-wider">Phone</Label>
              <div className="flex items-center gap-2 mt-1">
                <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                  className="bg-muted border-border text-foreground font-mono text-sm focus-visible:ring-green-600" />
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

            {/* Subscription tier badge */}
            {subscription ? (
              <div className={`flex items-center gap-3 rounded-lg p-3 ${planPerks.bg} border ${planPerks.border}`}>
                <PlanIcon className={`w-5 h-5 ${planPerks.color} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className={`font-mono font-bold text-xs ${planPerks.color}`}>{planPerks.label}</p>
                  <p className="text-muted-foreground font-mono text-xs">{planPerks.lockerZone} · Included in plan</p>
                </div>
                <Badge className={`${planPerks.bg} ${planPerks.color} border ${planPerks.border} font-mono text-xs`}>
                  {hasActiveSub ? 'Active' : subscription.status}
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg p-3 bg-muted/50 border border-border">
                <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="text-foreground font-mono text-xs font-semibold">No active subscription</p>
                  <p className="text-muted-foreground font-mono text-xs">Subscribe to get a locker included</p>
                </div>
              </div>
            )}

            {/* Gym selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-muted-foreground font-mono text-xs uppercase tracking-wider">Select Gym</Label>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-mono text-xs h-7"
                  onClick={requestLocation} disabled={loadingLocation || loadingGyms}>
                  {(loadingLocation || loadingGyms) ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Navigation className="w-3 h-3 mr-1" />}
                  {userLocation ? 'Refresh' : 'Use Location'}
                </Button>
              </div>

              {!userLocation ? (
                <div className="bg-muted/50 border border-border rounded-lg p-5 text-center">
                  <Navigation className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground font-mono text-xs mb-3">Enable location to find gyms near you</p>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-mono text-xs"
                    onClick={requestLocation} disabled={loadingLocation}>
                    {loadingLocation ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Navigation className="w-3 h-3 mr-1" />}
                    Find Gyms Near Me
                  </Button>
                </div>
              ) : loadingGyms ? (
                <div className="bg-muted/50 border border-border rounded-lg p-5 text-center">
                  <Loader2 className="w-7 h-7 text-green-600 mx-auto mb-2 animate-spin" />
                  <p className="text-muted-foreground font-mono text-xs">Scanning nearby gyms...</p>
                </div>
              ) : gymsWithKey.length === 0 ? (
                <div className="bg-muted/50 border border-border rounded-lg p-4 text-center">
                  <p className="text-muted-foreground font-mono text-xs mb-2">No gyms found within 15 miles. Contact support to add your gym.</p>
                  <Button size="sm" variant="outline" className="font-mono text-xs" onClick={() => refetchGyms()}>Retry</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Select value={formData.preferred_gym} onValueChange={(v) => setFormData({ ...formData, preferred_gym: v })}>
                    <SelectTrigger className="bg-muted border-border text-foreground font-mono text-sm focus:ring-green-600">
                      <SelectValue placeholder="Select a gym" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border max-h-72">
                      {gymsWithKey.map((gym, idx) => (
                        <SelectItem key={gym.gymKey} value={gym.gymKey} className="text-foreground font-mono py-3">
                          <div className="flex items-center justify-between w-full gap-4">
                            <div>
                              <div className="font-semibold text-sm">{gym.name}</div>
                              <div className="text-muted-foreground text-xs">{gym.city || gym.address}</div>
                            </div>
                            {gym.distance_miles != null && (
                              <span className="text-green-600 text-xs font-mono flex-shrink-0">{gym.distance_miles.toFixed(1)} mi</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedGym && (
                    <p className="text-muted-foreground font-mono text-xs flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-green-600" />
                      {selectedGym.name} · {selectedGym.distance_miles.toFixed(1)} mi away
                    </p>
                  )}
                  <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground font-mono text-xs h-7 px-2"
                    onClick={() => setShowMap(!showMap)}>
                    <Map className="w-3 h-3 mr-1" />
                    {showMap ? 'Hide Map' : 'View Map'}
                  </Button>
                  {showMap && (
                    <GymMapView gyms={gymsWithKey}
                      selectedGym={gymsWithKey.find(g => g.gymKey === formData.preferred_gym)}
                      onSelectGym={(gym) => setFormData({ ...formData, preferred_gym: gym.gymKey })} />
                  )}
                </div>
              )}
            </div>

            {/* Locker assignment */}
            <div className="border-t border-border pt-4">
              {locker ? (
                <div className="space-y-3">
                  <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-green-600" />
                        <span className="text-foreground font-mono font-bold text-sm">Locker #{locker.locker_number}</span>
                      </div>
                      <Badge className="bg-green-600/20 text-green-600 border border-green-600/40 font-mono text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" /> Assigned
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-mono text-xs">Access Code</span>
                      <span className="text-green-600 font-mono font-bold text-2xl tracking-widest">{locker.access_code}</span>
                    </div>
                    {locker.booking_end && (
                      <p className="text-muted-foreground font-mono text-xs mt-2">
                        Valid until · {new Date(locker.booking_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                    <p className="text-muted-foreground font-mono text-xs mt-1 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-green-600" />
                      Included in your {planPerks.label} plan — no extra charge
                    </p>
                  </div>
                  <LockerControls locker={locker} gym={selectedGym} />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-muted/50 border border-border rounded-lg p-4 text-center">
                    <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-foreground font-mono text-sm font-semibold">No locker assigned</p>
                    <p className="text-muted-foreground font-mono text-xs mt-1">
                      {hasActiveSub
                        ? 'Select a gym above and claim your free locker node'
                        : 'Subscribe to get a locker included with your plan'}
                    </p>
                  </div>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-mono text-sm font-bold h-10 disabled:opacity-50"
                    onClick={() => assignLockerMutation.mutate()}
                    disabled={!formData.preferred_gym || !hasActiveSub || assignLockerMutation.isPending}
                  >
                    {assignLockerMutation.isPending ? (
                      <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Assigning...</span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        {!hasActiveSub ? 'Subscription Required' : !formData.preferred_gym ? 'Select a Gym First' : 'Claim Locker Node'}
                      </span>
                    )}
                  </Button>
                  {hasActiveSub && (
                    <p className="text-center text-muted-foreground font-mono text-xs">
                      Included in your {planPerks.label} · No additional charge
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <Button className="bg-green-600 hover:bg-green-700 text-white font-mono text-sm font-bold select-none"
          onClick={() => updateProfileMutation.mutate(formData)} disabled={updateProfileMutation.isPending}>
          {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2 select-none" />}
          SAVE CHANGES
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="border-red-700 text-red-500 hover:bg-red-950/30 font-mono text-sm select-none">
              <Trash2 className="w-4 h-4 mr-2 select-none" /> DELETE ACCOUNT
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
                Permanent and cannot be undone. All data including profile, lockers, orders, subscriptions and history will be erased.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-muted text-foreground border-border font-mono">Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white font-mono"
                onClick={() => deleteAccountMutation.mutate()} disabled={deleteAccountMutation.isPending}>
                {deleteAccountMutation.isPending ? 'Deleting...' : 'Delete Account'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}