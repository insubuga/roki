import React, { useState } from 'react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, DollarSign, AlertTriangle, Target, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * Advanced analytics dashboard with churn risk, LTV, cohorts, forecasts
 */
export default function AnalyticsDashboard() {
  const [selectedMetric, setSelectedMetric] = useState('churn');

  const { data: analyticsData = null, isLoading } = useQuery({
    queryKey: ['advancedAnalytics'],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('computeAdvancedAnalytics', {});
        return response.data?.analytics || null;
      } catch (e) {
        console.error('Analytics fetch failed:', e);
        return null;
      }
    },
    refetchInterval: 3600000, // Refresh hourly
  });

  const { data: memberPrefs = [] } = useQuery({
    queryKey: ['memberPrefsAnalytics'],
    queryFn: async () => {
      const prefs = await base44.asServiceRole.entities.MemberPreferences.list('-total_cycles_completed', 100);
      return prefs || [];
    },
  });

  // Segment distribution chart data
  const segmentData = analyticsData ? [
    { name: 'Heavy Users', value: analyticsData.segment_distribution.heavy_users, color: '#059669' },
    { name: 'Regular Users', value: analyticsData.segment_distribution.regular_users, color: '#3b82f6' },
    { name: 'Light Users', value: analyticsData.segment_distribution.light_users, color: '#f59e0b' },
    { name: 'Dormant', value: analyticsData.segment_distribution.dormant_users, color: '#ef4444' }
  ] : [];

  // LTV by plan
  const ltvData = analyticsData ? Object.entries(analyticsData.ltv_analysis.by_plan).map(([plan, data]) => ({
    name: plan === 'core' ? 'Core Readiness' : 'Priority Readiness',
    users: data.count,
    avg_ltv: Math.round(data.total_ltv / data.count)
  })) : [];

  // Top churn risks
  const topChurnRisks = analyticsData?.churn_risks?.slice(0, 10) || [];

  // High value users
  const highValueUsers = analyticsData?.high_value_users?.slice(0, 10) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <Card className="border-border">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Analytics data unavailable</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border">
          <CardContent className="p-3">
            <Users className="w-4 h-4 text-blue-600 mb-2" />
            <p className="text-2xl font-bold">{analyticsData.total_users}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Users</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3">
            <Activity className="w-4 h-4 text-green-600 mb-2" />
            <p className="text-2xl font-bold">{analyticsData.growth_metrics.mau}</p>
            <p className="text-xs text-muted-foreground mt-1">Monthly Active</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3">
            <DollarSign className="w-4 h-4 text-purple-600 mb-2" />
            <p className="text-2xl font-bold">${analyticsData.ltv_analysis.average_ltv}</p>
            <p className="text-xs text-muted-foreground mt-1">Avg LTV</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3">
            <AlertTriangle className="w-4 h-4 text-red-600 mb-2" />
            <p className="text-2xl font-bold text-red-600">{analyticsData.churn_risks.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Churn Risks</p>
          </CardContent>
        </Card>
      </div>

      {/* Retention Metrics */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm font-mono">Retention Cohort</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-3xl font-bold text-green-700">{analyticsData.growth_metrics.retention_d7}%</p>
              <p className="text-xs text-green-600 mt-2">7-Day Retention</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-3xl font-bold text-blue-700">{analyticsData.growth_metrics.retention_d30}%</p>
              <p className="text-xs text-blue-600 mt-2">30-Day Retention</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Segmentation */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm font-mono">User Segmentation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={segmentData}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  dataKey="value"
                  label={false}
                >
                  {segmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 min-w-[140px]">
              {segmentData.map(entry => (
                <div key={entry.name} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className="text-foreground">{entry.name}</span>
                  <span className="text-muted-foreground ml-auto">({entry.value})</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LTV by Plan */}
      {ltvData.length > 0 && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm font-mono">Lifetime Value by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ltvData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="avg_ltv" fill="#7c3aed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Churn Risk Alerts */}
      <Card className="border-red-200 border-2">
        <CardHeader>
          <CardTitle className="text-sm font-mono text-red-700">🚨 Churn Risk Alerts ({topChurnRisks.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-64 overflow-y-auto">
          {topChurnRisks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No high-risk users identified</p>
          ) : (
            topChurnRisks.map(risk => (
              <div key={risk.user_email} className="border border-red-100 rounded p-2 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold truncate">{risk.user_email}</span>
                  <Badge className={`${
                    risk.churn_score > 0.8 ? 'bg-red-600' : 'bg-orange-600'
                  } text-white text-[10px]`}>
                    {(risk.churn_score * 100).toFixed(0)}%
                  </Badge>
                </div>
                <p className="text-muted-foreground">{risk.intervention}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Last activity: {risk.last_activity_days} days ago • {risk.total_cycles} total cycles
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* High Value Users */}
      <Card className="border-green-200 border-2">
        <CardHeader>
          <CardTitle className="text-sm font-mono text-green-700">💎 High-Value Customers ({highValueUsers.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-64 overflow-y-auto">
          {highValueUsers.length === 0 ? (
            <p className="text-xs text-muted-foreground">No high-value users yet</p>
          ) : (
            highValueUsers.map(user => (
              <div key={user.user_email} className="border border-green-100 rounded p-2 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold truncate">{user.user_email}</span>
                  <Badge className="bg-green-600 text-white text-[10px]">
                    ${user.ltv}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{user.plan === 'core' ? 'Core' : 'Priority'} Plan</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {user.cycles_per_month?.toFixed(1)} cycles/month
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="text-xs h-10"
          onClick={() => {
            const emails = topChurnRisks.map(r => r.user_email).join(', ');
            toast.info(`Retention campaign targeting ${topChurnRisks.length} users: ${emails || 'none'}`);
          }}
        >
          <Target className="w-3 h-3 mr-1" />
          Run Retention Campaign
        </Button>
        <Button
          className="bg-green-600 hover:bg-green-700 text-white text-xs h-10"
          onClick={() => {
            const rows = [
              ['Metric', 'Value'],
              ['Total Users', analyticsData.total_users],
              ['Monthly Active', analyticsData.growth_metrics.mau],
              ['Avg LTV', `$${analyticsData.ltv_analysis.average_ltv}`],
              ['Churn Risks', analyticsData.churn_risks.length],
              ['7-Day Retention', `${analyticsData.growth_metrics.retention_d7}%`],
              ['30-Day Retention', `${analyticsData.growth_metrics.retention_d30}%`],
            ];
            const csv = rows.map(r => r.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `roki-analytics-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Analytics report exported');
          }}
        >
          <TrendingUp className="w-3 h-3 mr-1" />
          Export Report
        </Button>
      </div>
    </div>
  );
}