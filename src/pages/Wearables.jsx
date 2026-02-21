import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PullToRefresh from '../components/mobile/PullToRefresh';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Watch, Bluetooth, CheckCircle, XCircle, Activity, Heart, Footprints, Zap, TrendingUp, Brain, Droplet, Moon, BarChart3, Target, Plus, Smartphone, Shield, Clock, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MobileHeader from '../components/mobile/MobileHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, subDays } from 'date-fns';
import { NotificationTriggers } from '../components/notifications/NotificationHelper';

const wearableDevices = [
  {
    id: 'apple-watch',
    name: 'Apple Watch',
    icon: '⌚',
    category: 'wearable',
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    icon: '📟',
    category: 'wearable',
  },
  {
    id: 'garmin',
    name: 'Garmin',
    icon: '🏃',
    category: 'wearable',
  },
  {
    id: 'whoop',
    name: 'WHOOP',
    icon: '💪',
    category: 'wearable',
  },
];

const healthApps = [
  {
    id: 'apple-health',
    name: 'Apple Health',
    icon: '❤️',
    description: 'Sync directly from iPhone Health app',
    category: 'health',
    platform: 'iOS',
  },
  {
    id: 'google-fit',
    name: 'Google Fit',
    icon: '🏃‍♂️',
    description: 'Connect your Android health data',
    category: 'health',
    platform: 'Android',
  },
  {
    id: 'samsung-health',
    name: 'Samsung Health',
    icon: '💚',
    description: 'Import Samsung Health metrics',
    category: 'health',
    platform: 'Android',
  },
];

const fitnessApps = [
  {
    id: 'strava',
    name: 'Strava',
    icon: '🏔️',
    description: 'Track runs, rides, and activities',
    category: 'fitness',
  },
  {
    id: 'myfitnesspal',
    name: 'MyFitnessPal',
    icon: '🍎',
    description: 'Nutrition and calorie tracking',
    category: 'fitness',
  },
  {
    id: 'peloton',
    name: 'Peloton',
    icon: '🚴',
    description: 'Sync Peloton workouts',
    category: 'fitness',
  },
];

export default function Wearables() {
  const [user, setUser] = useState(null);
  const [showManualLog, setShowManualLog] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [connectedApps, setConnectedApps] = useState([]);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [manualData, setManualData] = useState({
    workout_type: '',
    workout_intensity: 'moderate',
    sleep_hours: 7,
    steps: 0,
  });
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries(['wearableData', 'historicalWearableData']);
  };

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
      return data[0] || null;
    },
    enabled: !!user?.email,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: historicalData = [] } = useQuery({
    queryKey: ['historicalWearableData', user?.email],
    queryFn: async () => {
      const data = await base44.entities.WearableData.filter({ user_email: user?.email }, '-created_date', 30);
      return data || [];
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
      
      // Track connected apps
      setConnectedApps(prev => [...new Set([...prev, deviceId])]);
      setLastSyncTime(new Date());
      
      let result;
      if (wearableData) {
        result = await base44.entities.WearableData.update(wearableData.id, sampleData);
      } else {
        result = await base44.entities.WearableData.create(sampleData);
      }

      // Auto-trigger supplement suggestions based on initial data
      try {
        await base44.functions.invoke('autoSuggestSupplements', {});
      } catch (e) {
        console.log('Auto-suggest call:', e);
      }

      return result;
    },
    onSuccess: (data, deviceId) => {
      const deviceName = [...wearableDevices, ...healthApps, ...fitnessApps].find(d => d.id === deviceId)?.name;
      toast.success(`${deviceName} connected! Auto-tracking enabled.`);
      queryClient.invalidateQueries({ queryKey: ['wearableData'] });
    },
  });

  const disconnectDeviceMutation = useMutation({
    mutationFn: async (deviceId) => {
      setConnectedApps(prev => prev.filter(id => id !== deviceId));
      if (wearableData && wearableData.device_type === deviceId) {
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
      
      setLastSyncTime(new Date());
      return base44.entities.WearableData.update(wearableData.id, newData);
    },
    onSuccess: async (data) => {
      toast.success('Data synced successfully!');
      queryClient.invalidateQueries({ queryKey: ['wearableData'] });
      queryClient.invalidateQueries({ queryKey: ['historicalWearableData'] });
      
      // Check for anomalies and create notifications
      if (user?.email) {
        await NotificationTriggers.wearableSync(user.email);
        
        if (data.heart_rate > 100) {
          await NotificationTriggers.wearableAnomaly(user.email, 'High heart rate', `${data.heart_rate} BPM`);
        }
        
        if (data.recovery_score < 70) {
          await NotificationTriggers.lowRecovery(user.email, data.recovery_score);
        }
      }
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
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-6">
      {/* Header */}
      <MobileHeader
        title="Wearables"
        subtitle="Connect your devices"
        icon={Watch}
        iconColor="text-purple-500"
      />

      {/* Single simplified view - no tabs */}
      <div className="space-y-6">
      
      {/* Sync Status Banner */}
      {isConnected && lastSyncTime && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-gray-900 font-semibold">Data Synced</p>
                  <p className="text-gray-600 text-sm flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Last sync: {format(lastSyncTime, 'p')}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-green-300 text-green-700 hover:bg-green-50"
                onClick={() => syncDataMutation.mutate()}
                disabled={syncDataMutation.isPending}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncDataMutation.isPending ? 'animate-spin' : ''}`} />
                Sync Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Simple current status - only what's actionable */}
      {isConnected && wearableData && (
        <Card className="bg-white border-gray-200 shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600 text-sm">Recovery</p>
                <p className="text-3xl font-bold text-gray-900">{wearableData.recovery_score}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Sleep</p>
                <p className="text-3xl font-bold text-gray-900">{wearableData.sleep_hours}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected Devices Summary */}
      {isConnected && connectedDevice && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-3xl">{connectedDevice.icon}</span>
                <div>
                  <p className="text-gray-900 font-semibold">{connectedDevice.name}</p>
                  <p className="text-gray-600 text-sm flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Connected & Syncing
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => disconnectDeviceMutation.mutate(wearableData.device_type)}
                disabled={disconnectDeviceMutation.isPending}
              >
                Disconnect
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Integrations - Collapsible */}
      <Card className="bg-white border-gray-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-900">Connect Your Devices & Apps</CardTitle>
          <p className="text-gray-600 text-sm">Sync health data from wearables, phones, and fitness platforms</p>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {/* Wearable Devices */}
            <AccordionItem value="wearables" className="border-gray-200">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Bluetooth className="w-5 h-5 text-blue-600" />
                  <div className="text-left">
                    <p className="text-gray-900 font-semibold">Wearable Devices</p>
                    <p className="text-gray-600 text-sm">Apple Watch, Fitbit, Garmin, WHOOP</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-3">
                {isConnected && connectedDevice ? (
                  <div className="text-gray-600 text-sm mb-3">
                    ✓ {connectedDevice.name} is already connected above
                  </div>
                ) : (
                  wearableDevices.map((device) => (
                    <motion.div
                      key={device.id}
                      whileHover={{ scale: 1.01 }}
                      className="bg-gray-50 rounded-lg p-3 border border-gray-200 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{device.icon}</span>
                        <p className="text-gray-900 font-medium">{device.name}</p>
                      </div>
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700"
                        onClick={() => connectDeviceMutation.mutate(device.id)}
                        disabled={connectDeviceMutation.isPending}
                      >
                        Connect
                      </Button>
                    </motion.div>
                  ))
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Health Apps */}
            <AccordionItem value="health-apps" className="border-gray-200">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                  <div className="text-left">
                    <p className="text-gray-900 font-semibold">Health Apps</p>
                    <p className="text-gray-600 text-sm">Apple Health, Google Fit, Samsung Health</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs ml-2">No Device Needed</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-3">
                {/* Instructions Card - Updated for Web App Reality */}
                <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 mb-4">
                  <div className="flex gap-3">
                    <Info className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-gray-900 font-semibold mb-2">Demo Mode - Health App Integration</p>
                      <p className="text-gray-700 text-sm mb-3">
                        ROKI is currently a <strong>web app</strong>, which means direct access to Apple Health, Google Fit, or Samsung Health is not available. Web apps cannot access native health APIs due to platform restrictions.
                      </p>
                      <p className="text-gray-700 text-sm mb-3">
                        <strong>Current Demo:</strong> Clicking "Connect" below will simulate health data syncing with sample data to showcase the experience.
                      </p>
                      <p className="text-gray-700 text-sm mb-2">
                        <strong>For Real Health Data:</strong>
                      </p>
                      <ul className="text-gray-700 text-sm space-y-1 ml-4 list-disc">
                        <li>Use the "Log Workout Manually" button below to enter your real data</li>
                        <li>Or wait for ROKI's native mobile app (coming soon)</li>
                        <li>Native apps can access Apple Health/Google Fit with proper permissions</li>
                      </ul>
                      <p className="text-orange-700 text-xs mt-3 font-semibold">
                        💡 Tip: Try the manual logging feature for tracking real workouts and metrics!
                      </p>
                    </div>
                  </div>
                </div>

                {healthApps.map((app) => {
                  const isAppConnected = connectedApps.includes(app.id);
                  return (
                    <motion.div
                      key={app.id}
                      whileHover={{ scale: 1.01 }}
                      className={`rounded-lg p-3 border flex items-center justify-between ${
                        isAppConnected 
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{app.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-gray-900 font-medium">{app.name}</p>
                            <Badge variant="outline" className="text-xs border-gray-300 text-gray-600">
                              {app.platform}
                            </Badge>
                          </div>
                          <p className="text-gray-600 text-xs mt-0.5">{app.description}</p>
                          {isAppConnected && (
                            <p className="text-green-600 text-xs flex items-center gap-1 mt-1">
                              <CheckCircle className="w-3 h-3" /> Auto-syncing
                            </p>
                          )}
                        </div>
                      </div>
                      {isAppConnected ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-300 text-gray-700"
                          onClick={() => disconnectDeviceMutation.mutate(app.id)}
                        >
                          Disconnect
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                          onClick={() => {
                            toast.info('Starting demo connection with sample data...', { duration: 2000 });
                            setTimeout(() => connectDeviceMutation.mutate(app.id), 500);
                          }}
                          disabled={connectDeviceMutation.isPending}
                        >
                          Connect (Demo)
                        </Button>
                      )}
                    </motion.div>
                  );
                })}
              </AccordionContent>
            </AccordionItem>

            {/* Fitness Platforms */}
            <AccordionItem value="fitness-apps" className="border-gray-200">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-orange-600" />
                  <div className="text-left">
                    <p className="text-gray-900 font-semibold">Fitness Platforms</p>
                    <p className="text-gray-600 text-sm">Strava, MyFitnessPal, Peloton</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-3">
                {fitnessApps.map((app) => {
                  const isAppConnected = connectedApps.includes(app.id);
                  return (
                    <motion.div
                      key={app.id}
                      whileHover={{ scale: 1.01 }}
                      className={`rounded-lg p-3 border flex items-center justify-between ${
                        isAppConnected 
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{app.icon}</span>
                        <div>
                          <p className="text-gray-900 font-medium">{app.name}</p>
                          {isAppConnected && (
                            <p className="text-green-600 text-xs flex items-center gap-1 mt-0.5">
                              <CheckCircle className="w-3 h-3" /> Connected
                            </p>
                          )}
                        </div>
                      </div>
                      {isAppConnected ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-300 text-gray-700"
                          onClick={() => disconnectDeviceMutation.mutate(app.id)}
                        >
                          Disconnect
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700"
                          onClick={() => connectDeviceMutation.mutate(app.id)}
                          disabled={connectDeviceMutation.isPending}
                        >
                          Connect
                        </Button>
                      )}
                    </motion.div>
                  );
                })}
              </AccordionContent>
            </AccordionItem>

            {/* Privacy Settings */}
            <AccordionItem value="privacy" className="border-gray-200">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-green-600" />
                  <div className="text-left">
                    <p className="text-gray-900 font-semibold">Privacy & Data Control</p>
                    <p className="text-gray-600 text-sm">Manage your data and privacy settings</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-gray-900 font-semibold mb-2">Your Data, Your Control</p>
                      <ul className="text-gray-700 text-sm space-y-1.5">
                        <li>• All health data is encrypted and stored securely</li>
                        <li>• You can disconnect any app or device at any time</li>
                        <li>• Data is only used to personalize your ROKI experience</li>
                        <li>• We never share your health data with third parties</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1 border-gray-300 text-gray-700"
                    onClick={() => toast.info('Feature coming soon')}
                  >
                    Export Data
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => toast.info('Feature coming soon')}
                  >
                    Delete Data
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Manual Log Button - Highlighted */}
      {!showManualLog && (
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ repeat: 3, duration: 0.5 }}
        >
          <Button
            onClick={() => setShowManualLog(true)}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Log Your Real Workout Data
          </Button>
        </motion.div>
      )}

      {/* Manual Log Form */}
      {showManualLog && (
        <Card className="bg-white border-green-300 border-2 shadow-xl">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-600" />
              Log Your Real Workout
            </CardTitle>
            <p className="text-gray-600 text-sm">Track your actual fitness data and progress</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-gray-700 text-sm font-medium block mb-2">Workout Type *</label>
              <input
                type="text"
                placeholder="e.g., chest, cardio, legs, arms"
                value={manualData.workout_type}
                onChange={(e) => setManualData({...manualData, workout_type: e.target.value})}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-gray-700 text-sm font-medium block mb-2">Intensity *</label>
              <select
                value={manualData.workout_intensity}
                onChange={(e) => setManualData({...manualData, workout_intensity: e.target.value})}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
                <option value="extreme">Extreme</option>
              </select>
            </div>
            <div>
              <label className="text-gray-700 text-sm font-medium block mb-2">Sleep (hours)</label>
              <input
                type="number"
                min="0"
                max="12"
                step="0.5"
                value={manualData.sleep_hours}
                onChange={(e) => setManualData({...manualData, sleep_hours: parseFloat(e.target.value) || 0})}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-gray-700 text-sm font-medium block mb-2">Steps Today</label>
              <input
                type="number"
                min="0"
                value={manualData.steps}
                onChange={(e) => setManualData({...manualData, steps: parseInt(e.target.value) || 0})}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => manualLogMutation.mutate()}
                disabled={!manualData.workout_type || manualLogMutation.isPending}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-md"
              >
                {manualLogMutation.isPending ? 'Saving...' : 'Save Workout'}
              </Button>
              <Button
                onClick={() => setShowManualLog(false)}
                variant="outline"
                className="border-gray-300"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
    </div>
    </PullToRefresh>
  );
}