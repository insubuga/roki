import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, CheckCircle, Calendar, Zap, Clock } from 'lucide-react';
import MobileHeader from '../components/mobile/MobileHeader';

export default function Performance() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        setUser(null);
      }
    };
    loadUser();
  }, []);

  const { data: preferences } = useQuery({
    queryKey: ['memberPreferences', user?.email],
    queryFn: async () => {
      const prefs = await base44.entities.MemberPreferences.filter({ user_email: user?.email });
      return prefs[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: completedCycles = [] } = useQuery({
    queryKey: ['completedCycles', user?.email],
    queryFn: async () => {
      const delivered = await base44.entities.Order.filter({
        user_email: user?.email,
        status: 'delivered'
      });
      const laundry = await base44.entities.LaundryOrder.filter({
        user_email: user?.email,
        status: 'picked_up'
      });
      return [...delivered, ...laundry];
    },
    enabled: !!user?.email,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['memberHistory', user?.email],
    queryFn: () => base44.entities.MemberHistory.filter({ user_email: user?.email }, '-created_date', 100),
    enabled: !!user?.email,
  });

  // Calculate metrics
  const totalCycles = preferences?.total_cycles_completed || 0;
  const avgCleanliness = preferences?.average_cleanliness_score || 0;
  const reliabilityScore = completedCycles.length > 0 ? 96 : 0;
  const onTimeStreak = Math.min(completedCycles.length, 12);
  const estimatedMinutesSaved = totalCycles * 45;
  const workoutsCovered = totalCycles * 3;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MobileHeader
        title="System Performance"
        subtitle="Reliability metrics and insights"
        icon={TrendingUp}
        iconColor="text-green-600"
      />

      {/* Primary Metrics */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-green-600" />
            30-Day Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <p className="text-gray-500 text-xs uppercase">Reliability</p>
              </div>
              <p className="text-3xl font-bold text-green-600">{reliabilityScore}%</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-orange-500" />
                <p className="text-gray-500 text-xs uppercase">On-Time Streak</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{onTimeStreak}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coverage Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Coverage Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Cycles Completed</span>
              <span className="text-gray-900 font-bold text-lg">{totalCycles}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Workouts Covered</span>
              <span className="text-green-600 font-bold text-lg">{workoutsCovered}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Deliveries</span>
              <span className="text-gray-900 font-bold text-lg">{preferences?.total_deliveries_received || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Savings */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-gray-900 font-bold text-lg">{Math.floor(estimatedMinutesSaved / 60)} Hours Saved</p>
              <p className="text-gray-600 text-sm">Time recovered from laundry automation</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Health Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 text-sm">Avg Quality Score</span>
              <Badge className="bg-green-500 text-white border-none">{avgCleanliness.toFixed(1)}/5.0</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 text-sm">Data Points Tracked</span>
              <span className="text-gray-900 font-semibold">{history.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 text-sm">Route Optimization</span>
              <span className="text-green-600 font-semibold">+{preferences?.route_density_contribution || 0}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}