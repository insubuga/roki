import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Settings, ArrowLeft, User, Mail, Lock, Save } from 'lucide-react';
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

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      toast.success('Profile updated!');
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
      toast.success('Locker claimed!');
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
              <Label className="text-gray-400">Preferred Gym</Label>
              <Select
                value={formData.preferred_gym}
                onValueChange={(value) => setFormData({ ...formData, preferred_gym: value })}
              >
                <SelectTrigger className="bg-[#0d1320] border-gray-700 text-white mt-1">
                  <SelectValue placeholder="Select a gym" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-gray-700">
                  {gyms.map((gym) => (
                    <SelectItem key={gym.id} value={gym.id} className="text-white">
                      {gym.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {locker ? (
              <div className="bg-[#0d1320] rounded-lg p-4 border border-gray-700">
                <p className="text-gray-400 text-sm">Your Locker</p>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <p className="text-white font-bold text-xl">#{locker.locker_number}</p>
                    <p className="text-gray-500 text-sm">Active</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-sm">Access Code</p>
                    <p className="text-[#7cfc00] font-mono font-bold text-2xl">{locker.access_code}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#0d1320] rounded-lg p-4 border border-gray-700">
                <p className="text-gray-400 mb-3">You don't have a locker yet</p>
                <Button
                  className="w-full bg-[#7cfc00] text-black hover:bg-[#6be600]"
                  onClick={() => claimLockerMutation.mutate()}
                  disabled={!formData.preferred_gym || claimLockerMutation.isPending}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Claim Locker
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