import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MobileHeader from '../components/mobile/MobileHeader';
import PullToRefresh from '../components/mobile/PullToRefresh';

export default function Performance() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.error('Auth error:', e);
      }
    };
    loadUser();
  }, []);

  const handleRefresh = async () => {
    window.location.reload();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4">
        <MobileHeader
          title="Performance Analytics"
          subtitle="Network Health & Forecasts"
          icon={TrendingUp}
          iconColor="text-green-600"
        />

        {/* Admin Only: Advanced Analytics */}
        {user?.role === 'admin' && (
          <AnalyticsDashboard />
        )}

        {/* Member Dashboard: Personal Stats */}
        {user?.role !== 'admin' && user?.role !== 'driver' && (
          <div className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm font-mono">Your Service History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-4">
                    <Activity className="w-4 h-4 text-green-600 mb-2" />
                    <p className="text-2xl font-bold">—</p>
                    <p className="text-xs text-green-600 mt-2">Total Cycles</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <Zap className="w-4 h-4 text-blue-600 mb-2" />
                    <p className="text-2xl font-bold">100%</p>
                    <p className="text-xs text-blue-600 mt-2">On-Time Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm font-mono">Network Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground text-center py-8">
                  Network analytics coming soon
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}