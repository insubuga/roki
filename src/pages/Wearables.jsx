import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Watch, ArrowLeft, Bluetooth, CheckCircle, XCircle, Activity, Heart, Footprints, Zap, TrendingUp, Brain, Droplet, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const wearableDevices = [
  {
    id: 'apple-watch',
    name: 'Apple Watch',
    icon: '⌚',
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    icon: '📟',
  },
  {
    id: 'garmin',
    name: 'Garmin',
    icon: '🏃',
  },
  {
    id: 'whoop',
    name: 'WHOOP',
    icon: '💪',
  },
];

export default function Wearables() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: wearableData, isLoading } = useQuery({
    queryKey: ['wearableData', user?.email],
    queryFn: async () => {
      const data = await base44.entities.WearableData.filter({ user_email: user?.email }, '-created_date', 1);
      return data[0];
    },
    enabled: !!user?.email,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const connectDeviceMutation = useMutation({
    mutationFn: async (deviceId) => {
      // Simulate device sync with sample data
      const sampleData = {
        user_email: user.email,
        device_type: deviceId,
        heart_rate: Math.floor(Math.random() * 40) + 60, // 60-100
        steps: Math.floor(Math.random() * 5000) + 5000, // 5000-10000
        calories_burned: Math.floor(Math.random() * 500) + 300, // 300-800
        active_minutes: Math.floor(Math.random() * 60) + 30, // 30-90
        sleep_hours: Math.floor(Math.random() * 3) + 6, // 6-9
        workout_type: ['chest', 'back', 'legs', 'arms', 'cardio'][Math.floor(Math.random() * 5)],
        workout_intensity: ['moderate', 'high', 'extreme'][Math.floor(Math.random() * 3)],
        hydration_level: ['moderate', 'good', 'optimal'][Math.floor(Math.random() * 3)],
        recovery_score: Math.floor(Math.random() * 30) + 70, // 70-100
      };
      
      if (wearableData) {
        return base44.entities.WearableData.update(wearableData.id, sampleData);
      } else {
        return base44.entities.WearableData.create(sampleData);
      }
    },
    onSuccess: () => {
      toast.success('Device connected and synced!');
      queryClient.invalidateQueries({ queryKey: ['wearableData'] });
    },
  });

  const disconnectDeviceMutation = useMutation({
    mutationFn: async () => {
      if (wearableData) {
        return base44.entities.WearableData.delete(wearableData.id);
      }
    },
    onSuccess: () => {
      toast.success('Device disconnected');
      queryClient.invalidateQueries({ queryKey: ['wearableData'] });
    },
  });

  const syncDataMutation = useMutation({
    mutationFn: async () => {
      if (!wearableData) throw new Error('No device connected');
      
      // Simulate fresh data sync
      const newData = {
        heart_rate: Math.floor(Math.random() * 40) + 60,
        steps: Math.floor(Math.random() * 5000) + 5000,
        calories_burned: Math.floor(Math.random() * 500) + 300,
        active_minutes: Math.floor(Math.random() * 60) + 30,
        recovery_score: Math.floor(Math.random() * 30) + 70,
      };
      
      return base44.entities.WearableData.update(wearableData.id, newData);
    },
    onSuccess: () => {
      toast.success('Data synced!');
      queryClient.invalidateQueries({ queryKey: ['wearableData'] });
    },
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#7cfc00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const connectedDevice = wearableData ? wearableDevices.find(d => d.id === wearableData.device_type) : null;
  const isConnected = !!wearableData;

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
            <Watch className="w-8 h-8 text-purple-500" />
            Wearables
          </h1>
          <p className="text-gray-400 mt-1">Connect your devices</p>
        </div>
      </div>

      {/* Real-time Stats */}
      {isConnected && wearableData && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Live Metrics</h2>
            <Button
              size="sm"
              variant="outline"
              className="border-gray-700 text-gray-300"
              onClick={() => syncDataMutation.mutate()}
              disabled={syncDataMutation.isPending}
            >
              Sync Data
            </Button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-[#1a2332] border-gray-800">
              <CardContent className="p-4 text-center">
                <Heart className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{wearableData.heart_rate}</p>
                <p className="text-gray-400 text-sm">Heart Rate (BPM)</p>
                {wearableData.heart_rate > 85 && (
                  <Badge className="mt-2 bg-orange-500/20 text-orange-400 border-none text-xs">Elevated</Badge>
                )}
              </CardContent>
            </Card>
            <Card className="bg-[#1a2332] border-gray-800">
              <CardContent className="p-4 text-center">
                <Footprints className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{wearableData.steps?.toLocaleString()}</p>
                <p className="text-gray-400 text-sm">Steps Today</p>
              </CardContent>
            </Card>
            <Card className="bg-[#1a2332] border-gray-800">
              <CardContent className="p-4 text-center">
                <Zap className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{wearableData.calories_burned}</p>
                <p className="text-gray-400 text-sm">Calories Burned</p>
              </CardContent>
            </Card>
            <Card className="bg-[#1a2332] border-gray-800">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 text-[#7cfc00] mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{wearableData.recovery_score}</p>
                <p className="text-gray-400 text-sm">Recovery Score</p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <Card className="bg-[#1a2332] border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <span className="text-gray-400 text-sm">Active Time</span>
                </div>
                <p className="text-xl font-bold text-white">{wearableData.active_minutes} min</p>
              </CardContent>
            </Card>
            <Card className="bg-[#1a2332] border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span className="text-gray-400 text-sm">Sleep</span>
                </div>
                <p className="text-xl font-bold text-white">{wearableData.sleep_hours}h</p>
              </CardContent>
            </Card>
            <Card className="bg-[#1a2332] border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Droplet className="w-4 h-4 text-cyan-400" />
                  <span className="text-gray-400 text-sm">Hydration</span>
                </div>
                <p className="text-xl font-bold text-white capitalize">{wearableData.hydration_level}</p>
              </CardContent>
            </Card>
            <Card className="bg-[#1a2332] border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-pink-400" />
                  <span className="text-gray-400 text-sm">Workout</span>
                </div>
                <p className="text-lg font-bold text-white capitalize">{wearableData.workout_type}</p>
                <Badge className="mt-1 bg-orange-500/20 text-orange-400 border-none text-xs">
                  {wearableData.workout_intensity}
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Devices */}
      <Card className="bg-[#1a2332] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bluetooth className="w-5 h-5 text-blue-500" />
            Available Devices
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isConnected ? (
            <motion.div
              whileHover={{ scale: 1.01 }}
              className="bg-[#0d1320] rounded-lg p-4 border border-[#7cfc00] flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{connectedDevice.icon}</span>
                <div>
                  <p className="text-white font-semibold">{connectedDevice.name}</p>
                  <p className="text-gray-400 text-sm flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Connected & Syncing
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="border-gray-600 text-gray-300"
                onClick={() => disconnectDeviceMutation.mutate()}
                disabled={disconnectDeviceMutation.isPending}
              >
                Disconnect
              </Button>
            </motion.div>
          ) : (
            wearableDevices.map((device) => (
              <motion.div
                key={device.id}
                whileHover={{ scale: 1.01 }}
                className="bg-[#0d1320] rounded-lg p-4 border border-gray-700 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{device.icon}</span>
                  <div>
                    <p className="text-white font-semibold">{device.name}</p>
                    <p className="text-gray-400 text-sm flex items-center gap-1">
                      <XCircle className="w-4 h-4 text-gray-500" />
                      Not connected
                    </p>
                  </div>
                </div>
                <Button
                  className="bg-[#7cfc00] text-black hover:bg-[#6be600]"
                  onClick={() => connectDeviceMutation.mutate(device.id)}
                  disabled={connectDeviceMutation.isPending}
                >
                  Connect
                </Button>
              </motion.div>
            ))
          )}
        </CardContent>
      </Card>

      {/* VantaBot Integration */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#7cfc00] to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Brain className="w-6 h-6 text-black" />
            </div>
            <div>
              <h3 className="text-white font-bold mb-2">AI-Powered Insights</h3>
              <p className="text-gray-300 text-sm mb-3">
                VantaBot monitors your wearable data 24/7 to provide real-time suggestions on hydration, supplements, recovery, and optimal workout timing.
              </p>
              <Link to={createPageUrl('VantaBot')}>
                <Button className="bg-[#7cfc00] text-black hover:bg-[#6be600]">
                  Chat with VantaBot
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}