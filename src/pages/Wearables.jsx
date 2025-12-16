import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Watch, ArrowLeft, Bluetooth, CheckCircle, XCircle, Activity, Heart, Footprints } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';

const wearableDevices = [
  {
    id: 'apple-watch',
    name: 'Apple Watch',
    icon: '⌚',
    connected: false,
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    icon: '📟',
    connected: false,
  },
  {
    id: 'garmin',
    name: 'Garmin',
    icon: '🏃',
    connected: false,
  },
  {
    id: 'whoop',
    name: 'WHOOP',
    icon: '💪',
    connected: false,
  },
];

export default function Wearables() {
  const [user, setUser] = useState(null);
  const [devices, setDevices] = useState(wearableDevices);

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

  const toggleDevice = (deviceId) => {
    setDevices(devices.map(d => 
      d.id === deviceId ? { ...d, connected: !d.connected } : d
    ));
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#7cfc00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const connectedDevices = devices.filter(d => d.connected);

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

      {/* Stats Preview */}
      {connectedDevices.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-[#1a2332] border-gray-800">
            <CardContent className="p-4 text-center">
              <Activity className="w-8 h-8 text-[#7cfc00] mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">8,432</p>
              <p className="text-gray-400 text-sm">Steps Today</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a2332] border-gray-800">
            <CardContent className="p-4 text-center">
              <Heart className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">72</p>
              <p className="text-gray-400 text-sm">Avg Heart Rate</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a2332] border-gray-800">
            <CardContent className="p-4 text-center">
              <Footprints className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">4.2</p>
              <p className="text-gray-400 text-sm">Miles Today</p>
            </CardContent>
          </Card>
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
          {devices.map((device) => (
            <motion.div
              key={device.id}
              whileHover={{ scale: 1.01 }}
              className={`bg-[#0d1320] rounded-lg p-4 border ${device.connected ? 'border-[#7cfc00]' : 'border-gray-700'} flex items-center justify-between`}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{device.icon}</span>
                <div>
                  <p className="text-white font-semibold">{device.name}</p>
                  <p className="text-gray-400 text-sm flex items-center gap-1">
                    {device.connected ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Connected
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-gray-500" />
                        Not connected
                      </>
                    )}
                  </p>
                </div>
              </div>
              <Button
                variant={device.connected ? 'outline' : 'default'}
                className={device.connected ? 'border-gray-600 text-gray-300' : 'bg-[#7cfc00] text-black hover:bg-[#6be600]'}
                onClick={() => toggleDevice(device.id)}
              >
                {device.connected ? 'Disconnect' : 'Connect'}
              </Button>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Info */}
      <div className="bg-[#1a2332]/50 rounded-lg p-6 border border-gray-800 text-center">
        <p className="text-gray-400 text-sm">
          Connect your wearable devices to get personalized supplement recommendations based on your activity levels and health metrics.
        </p>
      </div>
    </div>
  );
}