import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Watch, ArrowLeft, Bluetooth, CheckCircle, XCircle, Activity, Heart, Footprints, Zap, TrendingUp, Brain, Droplet, Moon, BarChart3, Target, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, subDays } from 'date-fns';

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
  const [showManualLog, setShowManualLog] = useState(false);
  const [manualData, setManualData] = useState({
    workout_type: '',
    workout_intensity: 'moderate',
    sleep_hours: 7,
    steps: 0,
  });
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

  const { data: historicalData = [] } = useQuery({
    queryKey: ['historicalWearableData', user?.email],
    queryFn: async () => {
      const data = await base44.entities.WearableData.filter({ user_email: user?.email }, '-created_date', 30);
      return data;
    },
    enabled: !!user?.email,
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
      queryClient.invalidateQueries({ queryKey: ['historicalWearableData'] });
    },
  });

  const manualLogMutation = useMutation({
    mutationFn: async () => {
      const logData = {
        user_email: user.email,
        device_type: wearableData?.device_type || 'manual',
        workout_type: manualData.workout_type,
        workout_intensity: manualData.workout_intensity,
        sleep_hours: manualData.sleep_hours,
        steps: manualData.steps,
        heart_rate: wearableData?.heart_rate || 75,
        calories_burned: wearableData?.calories_burned || 0,
        active_minutes: wearableData?.active_minutes || 0,
        hydration_level: wearableData?.hydration_level || 'moderate',
        recovery_score: wearableData?.recovery_score || 80,
      };
      
      return base44.entities.WearableData.create(logData);
    },
    onSuccess: () => {
      toast.success('Manual entry logged!');
      queryClient.invalidateQueries({ queryKey: ['wearableData'] });
      queryClient.invalidateQueries({ queryKey: ['historicalWearableData'] });
      setShowManualLog(false);
      setManualData({ workout_type: '', workout_intensity: 'moderate', sleep_hours: 7, steps: 0 });
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

  // Analytics calculations
  const getTrendData = () => {
    if (historicalData.length === 0) return [];
    
    const last7Days = historicalData.slice(0, 7).reverse();
    return last7Days.map((data, idx) => ({
      day: format(subDays(new Date(), 6 - idx), 'EEE'),
      recovery: data.recovery_score || 0,
      sleep: data.sleep_hours || 0,
      steps: data.steps || 0,
      heartRate: data.heart_rate || 0,
    }));
  };

  const getCorrelations = () => {
    if (historicalData.length < 5) return null;
    
    const avgSleep = historicalData.reduce((sum, d) => sum + (d.sleep_hours || 0), 0) / historicalData.length;
    const avgRecovery = historicalData.reduce((sum, d) => sum + (d.recovery_score || 0), 0) / historicalData.length;
    
    const highIntensityDays = historicalData.filter(d => d.workout_intensity === 'high' || d.workout_intensity === 'extreme');
    const avgRecoveryAfterIntense = highIntensityDays.length > 0 
      ? highIntensityDays.reduce((sum, d) => sum + (d.recovery_score || 0), 0) / highIntensityDays.length 
      : 0;
    
    const lowSleepDays = historicalData.filter(d => (d.sleep_hours || 0) < 6);
    const avgIntensityOnLowSleep = lowSleepDays.filter(d => d.workout_intensity).length / (lowSleepDays.length || 1);
    
    return {
      sleepRecoveryCorr: ((avgSleep - 7) * 10 + avgRecovery).toFixed(0),
      intensityImpact: avgRecoveryAfterIntense > 0 ? (100 - avgRecoveryAfterIntense).toFixed(0) : 'N/A',
      sleepPerformanceImpact: avgIntensityOnLowSleep < 0.5 ? 'Significant' : 'Moderate',
    };
  };

  const getGoalSuggestions = () => {
    if (historicalData.length < 3) return [];
    
    const avgSteps = historicalData.reduce((sum, d) => sum + (d.steps || 0), 0) / historicalData.length;
    const avgRecovery = historicalData.reduce((sum, d) => sum + (d.recovery_score || 0), 0) / historicalData.length;
    const avgSleep = historicalData.reduce((sum, d) => sum + (d.sleep_hours || 0), 0) / historicalData.length;
    
    const goals = [];
    
    if (avgSteps < 8000) {
      goals.push({ metric: 'Steps', current: Math.round(avgSteps), target: 10000, reason: 'Increase daily activity' });
    }
    
    if (avgRecovery < 75) {
      goals.push({ metric: 'Recovery Score', current: Math.round(avgRecovery), target: 85, reason: 'Improve recovery practices' });
    }
    
    if (avgSleep < 7) {
      goals.push({ metric: 'Sleep', current: avgSleep.toFixed(1) + 'h', target: '8h', reason: 'Optimize rest and recovery' });
    }
    
    return goals;
  };

  const trendData = getTrendData();
  const correlations = getCorrelations();
  const goalSuggestions = getGoalSuggestions();

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

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-[#1a2332] border border-gray-700">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#7cfc00] data-[state=active]:text-black">
            Overview
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-[#7cfc00] data-[state=active]:text-black">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="goals" className="data-[state=active]:bg-[#7cfc00] data-[state=active]:text-black">
            <Target className="w-4 h-4 mr-2" />
            Goals
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
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

      {/* Manual Log Button */}
      {!showManualLog && (
        <Button
          onClick={() => setShowManualLog(true)}
          variant="outline"
          className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
        >
          <Plus className="w-4 h-4 mr-2" />
          Log Workout Manually
        </Button>
      )}

      {/* Manual Log Form */}
      {showManualLog && (
        <Card className="bg-[#1a2332] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Manual Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm block mb-2">Workout Type</label>
              <input
                type="text"
                placeholder="e.g., chest, cardio, legs"
                value={manualData.workout_type}
                onChange={(e) => setManualData({...manualData, workout_type: e.target.value})}
                className="w-full bg-[#0d1320] border border-gray-700 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-2">Intensity</label>
              <select
                value={manualData.workout_intensity}
                onChange={(e) => setManualData({...manualData, workout_intensity: e.target.value})}
                className="w-full bg-[#0d1320] border border-gray-700 rounded-lg px-4 py-2 text-white"
              >
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
                <option value="extreme">Extreme</option>
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-2">Sleep (hours)</label>
              <input
                type="number"
                min="0"
                max="12"
                step="0.5"
                value={manualData.sleep_hours}
                onChange={(e) => setManualData({...manualData, sleep_hours: parseFloat(e.target.value)})}
                className="w-full bg-[#0d1320] border border-gray-700 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-2">Steps</label>
              <input
                type="number"
                min="0"
                value={manualData.steps}
                onChange={(e) => setManualData({...manualData, steps: parseInt(e.target.value)})}
                className="w-full bg-[#0d1320] border border-gray-700 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => manualLogMutation.mutate()}
                disabled={!manualData.workout_type || manualLogMutation.isPending}
                className="flex-1 bg-[#7cfc00] text-black hover:bg-[#6be600]"
              >
                Save Entry
              </Button>
              <Button
                onClick={() => setShowManualLog(false)}
                variant="outline"
                className="border-gray-700"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6 mt-6">
          {historicalData.length < 3 ? (
            <Card className="bg-[#1a2332] border-gray-800">
              <CardContent className="p-12 text-center">
                <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Not enough data yet. Keep tracking to see trends!</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Trends */}
              <Card className="bg-[#1a2332] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">7-Day Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="day" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #374151' }}
                          labelStyle={{ color: '#fff' }}
                        />
                        <Line type="monotone" dataKey="recovery" stroke="#7cfc00" strokeWidth={2} name="Recovery Score" />
                        <Line type="monotone" dataKey="sleep" stroke="#818cf8" strokeWidth={2} name="Sleep (h)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="day" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #374151' }}
                          labelStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="steps" fill="#3b82f6" name="Steps" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Correlations */}
              {correlations && (
                <Card className="bg-[#1a2332] border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white">Performance Correlations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-[#0d1320] rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <Moon className="w-5 h-5 text-indigo-400" />
                          <span className="text-gray-400 text-sm">Sleep Impact</span>
                        </div>
                        <p className="text-2xl font-bold text-white mb-1">{correlations.sleepRecoveryCorr}%</p>
                        <p className="text-gray-500 text-xs">Avg correlation to recovery</p>
                      </div>
                      <div className="bg-[#0d1320] rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-5 h-5 text-orange-400" />
                          <span className="text-gray-400 text-sm">Intensity Effect</span>
                        </div>
                        <p className="text-2xl font-bold text-white mb-1">{correlations.intensityImpact}</p>
                        <p className="text-gray-500 text-xs">Recovery drop after high intensity</p>
                      </div>
                      <div className="bg-[#0d1320] rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="w-5 h-5 text-purple-400" />
                          <span className="text-gray-400 text-sm">Low Sleep Effect</span>
                        </div>
                        <p className="text-2xl font-bold text-white mb-1">{correlations.sleepPerformanceImpact}</p>
                        <p className="text-gray-500 text-xs">Performance impact</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-6 mt-6">
          <Card className="bg-[#1a2332] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Personalized Goals</CardTitle>
            </CardHeader>
            <CardContent>
              {goalSuggestions.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Track more data to get personalized goals</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {goalSuggestions.map((goal, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-[#0d1320] rounded-lg p-4 border border-gray-700"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-white font-semibold">{goal.metric}</h4>
                          <p className="text-gray-400 text-sm">{goal.reason}</p>
                        </div>
                        <Badge className="bg-[#7cfc00]/20 text-[#7cfc00] border-none">Suggested</Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-400">Current: {goal.current}</span>
                            <span className="text-[#7cfc00]">Target: {goal.target}</span>
                          </div>
                          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-[#7cfc00] to-teal-500"
                              style={{ 
                                width: `${Math.min((parseFloat(goal.current) / parseFloat(goal.target)) * 100, 100)}%` 
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Goal Insights */}
          <Card className="bg-gradient-to-r from-[#7cfc00]/10 to-teal-500/10 border-[#7cfc00]/30">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Target className="w-10 h-10 text-[#7cfc00]" />
                <div>
                  <h3 className="text-white font-bold mb-2">Smart Goal Setting</h3>
                  <p className="text-gray-300 text-sm">
                    Based on your last {historicalData.length} tracked days, we suggest these goals to optimize your performance and recovery. 
                    VantaBot will monitor your progress and adjust recommendations automatically.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}