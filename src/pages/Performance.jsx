import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Zap, Star, CheckCircle2, Clock, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MobileHeader from '../components/mobile/MobileHeader';
import PullToRefresh from '../components/mobile/PullToRefresh';

export default function Performance() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: prefs } = useQuery({
    queryKey: ['memberPrefs', user?.email],
    queryFn: () => base44.entities.MemberPreferences.filter({ user_email: user.email }),
    enabled: !!user?.email,
    select: (d) => d?.[0],
  });

  const { data: reliabilityScore } = useQuery({
    queryKey: ['reliabilityScore', user?.email],
    queryFn: () => base44.entities.ReliabilityScore.filter({ entity_id: user.email }),
    enabled: !!user?.email,
    select: (d) => d?.[0],
  });

  const { data: reliabilityLogs = [] } = useQuery({
    queryKey: ['reliabilityLogs', user?.email],
    queryFn: () => base44.entities.ReliabilityLog.filter({ user_email: user.email }, '-created_date', 20),
    enabled: !!user?.email,
  });

  const { data: cycles = [] } = useQuery({
    queryKey: ['cycles', user?.email],
    queryFn: () => base44.entities.Cycle.filter({ user_email: user.email }, '-created_date', 10),
    enabled: !!user?.email,
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription', user?.email],
    queryFn: () => base44.entities.Subscription.filter({ user_email: user.email }),
    enabled: !!user?.email,
    select: (d) => d?.[0],
  });

  const queryClient = useQueryClient();
  const handleRefresh = async () => {
    await queryClient.invalidateQueries();
  };

  // Derived metrics
  const totalCycles = prefs?.total_cycles_completed ?? cycles.length;
  const cleanlinessScore = prefs?.average_cleanliness_score ?? 0;
  const reliabilityPct = reliabilityScore?.score ?? null;
  const trend = reliabilityScore?.trend;

  const onTimeCount = reliabilityLogs.filter(l => l.event_type === 'on_time_delivery').length;
  const delayedCount = reliabilityLogs.filter(l => l.event_type === 'delayed_delivery').length;
  const totalLogged = onTimeCount + delayedCount;
  const onTimePct = totalLogged > 0 ? Math.round((onTimeCount / totalLogged) * 100) : null;

  // Cycle history chart — last 6 cycles by month
  const cycleChartData = cycles.slice(0, 6).reverse().map((c, i) => ({
    name: `#${i + 1}`,
    status: c.status === 'picked_up' ? 1 : 0,
    label: c.order_number?.slice(-4) || `C${i + 1}`,
  }));

  // Reliability log chart
  const logChartData = reliabilityLogs.slice(0, 8).reverse().map((log, i) => ({
    name: `#${i + 1}`,
    deviation: log.deviation_minutes ?? 0,
  }));

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground';

  const creditUsedPct = subscription
    ? Math.round(((subscription.laundry_credits_used || 0) / (subscription.laundry_credits || 1)) * 100)
    : 0;

  return (
    <div className="space-y-4">
        <MobileHeader
          title="Performance"
          subtitle="Your service analytics"
          icon={TrendingUp}
          iconColor="text-green-600"
        />

        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border">
            <CardContent className="p-4">
              <Activity className="w-4 h-4 text-green-600 mb-2" />
              <p className="text-2xl font-bold">{totalCycles > 0 ? totalCycles : '—'}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Cycles</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Zap className="w-4 h-4 text-blue-600" />
                {trend && <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />}
              </div>
              <p className="text-2xl font-bold">
                {reliabilityPct !== null ? `${reliabilityPct}` : '—'}
                {reliabilityPct !== null && <span className="text-sm font-normal text-muted-foreground">/100</span>}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Reliability Score</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mb-2" />
              <p className="text-2xl font-bold">
                {onTimePct !== null ? `${onTimePct}%` : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">On-Time Rate</p>
              {totalLogged > 0 && (
                <p className="text-[10px] text-muted-foreground">{onTimeCount}/{totalLogged} deliveries</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <Star className="w-4 h-4 text-amber-500 mb-2" />
              <p className="text-2xl font-bold">
                {cleanlinessScore > 0 ? cleanlinessScore.toFixed(1) : '—'}
                {cleanlinessScore > 0 && <span className="text-sm font-normal text-muted-foreground">/5</span>}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Avg Cleanliness</p>
            </CardContent>
          </Card>
        </div>

        {/* Credit Usage */}
        {subscription && (
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono">This Cycle — Laundry Credits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>{subscription.laundry_credits_used || 0} used</span>
                <span>{(subscription.laundry_credits || 0) - (subscription.laundry_credits_used || 0)} remaining</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${Math.min(creditUsedPct, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">{creditUsedPct}% of {subscription.laundry_credits} credits used</p>
            </CardContent>
          </Card>
        )}

        {/* Delivery deviation chart */}
        {logChartData.length > 0 ? (
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono">Delivery Timing (minutes ±)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={logChartData} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip
                    formatter={(v) => [`${v > 0 ? '+' : ''}${v} min`, 'Deviation']}
                    contentStyle={{ fontSize: 11 }}
                  />
                  <Bar dataKey="deviation" fill="#059669" radius={[3, 3, 0, 0]}
                    label={false}
                  />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-1">Negative = early, positive = late</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono">Delivery Timing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground text-center py-6">No delivery history yet</p>
            </CardContent>
          </Card>
        )}

        {/* Recent reliability events */}
        {reliabilityLogs.length > 0 && (
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono">Recent Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {reliabilityLogs.slice(0, 5).map((log, i) => {
                const isGood = log.event_type === 'on_time_delivery' || log.event_type === 'system_recovery';
                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isGood ? 'bg-green-500' : 'bg-red-400'}`} />
                    <span className="text-foreground capitalize">{log.event_type.replace(/_/g, ' ')}</span>
                    {log.deviation_minutes != null && (
                      <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0">
                        {log.deviation_minutes > 0 ? '+' : ''}{log.deviation_minutes} min
                      </Badge>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </PullToRefresh>
  );
}