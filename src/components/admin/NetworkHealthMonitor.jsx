import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, TrendingUp, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * Real-time network health metrics dashboard
 * Shows: node utilization, SLA adherence, route capacity, incident trends
 */
export default function NetworkHealthMonitor() {
  const [metrics, setMetrics] = useState({
    nodeUtilization: 72,
    slaAdherence: 94.2,
    routeCapacity: 8.5,
    activeIncidents: 3,
    mttr: 12.5, // Mean time to recovery in minutes
    trend: 'stable'
  });

  // Mock historical data — in production, fetch from PerformanceLog
  const historicalData = [
    { time: '00:00', utilization: 45, sla: 96 },
    { time: '04:00', utilization: 32, sla: 98 },
    { time: '08:00', utilization: 68, sla: 93 },
    { time: '12:00', utilization: 85, sla: 89 },
    { time: '16:00', utilization: 72, sla: 94 },
    { time: '20:00', utilization: 58, sla: 95 },
  ];

  const getHealthStatus = () => {
    if (metrics.nodeUtilization > 90 || metrics.slaAdherence < 90) {
      return { state: 'CRITICAL', color: 'bg-red-600', textColor: 'text-red-600' };
    }
    if (metrics.nodeUtilization > 75 || metrics.slaAdherence < 92) {
      return { state: 'WARNING', color: 'bg-orange-600', textColor: 'text-orange-600' };
    }
    return { state: 'HEALTHY', color: 'bg-green-600', textColor: 'text-green-600' };
  };

  const health = getHealthStatus();

  return (
    <div className="space-y-4">
      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <Badge className={`${health.color} text-white text-[10px]`}>
                {health.state}
              </Badge>
            </div>
            <p className="text-2xl font-bold text-foreground">{metrics.nodeUtilization}%</p>
            <p className="text-xs text-muted-foreground mt-1">Node Utilization</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3">
            <Zap className="w-4 h-4 text-green-600 mb-2" />
            <p className="text-2xl font-bold text-foreground">{metrics.slaAdherence}%</p>
            <p className="text-xs text-muted-foreground mt-1">SLA Adherence</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3">
            <TrendingUp className="w-4 h-4 text-purple-600 mb-2" />
            <p className="text-2xl font-bold text-foreground">${metrics.routeCapacity}k</p>
            <p className="text-xs text-muted-foreground mt-1">Route Cost/Day</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3">
            <AlertTriangle className={`w-4 h-4 ${metrics.activeIncidents > 0 ? 'text-red-600' : 'text-green-600'} mb-2`} />
            <p className="text-2xl font-bold text-foreground">{metrics.activeIncidents}</p>
            <p className="text-xs text-muted-foreground mt-1">Active Incidents</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Card className="border-border">
        <CardContent className="p-4">
          <p className="text-xs font-mono text-muted-foreground uppercase mb-4">24h Trend</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="time" stroke="var(--color-text-muted)" style={{ fontSize: 11 }} />
              <YAxis stroke="var(--color-text-muted)" style={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                labelStyle={{ color: 'var(--color-text-primary)' }}
              />
              <Line type="monotone" dataKey="utilization" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="sla" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* MTTR & Trend */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-green-300 bg-green-50/30">
          <CardContent className="p-3">
            <p className="text-xs text-green-700 font-mono font-bold mb-1">MTTR</p>
            <p className="text-2xl font-bold text-green-700">{metrics.mttr}m</p>
            <p className="text-xs text-green-600 mt-1">Mean Time to Recovery</p>
          </CardContent>
        </Card>

        <Card className={`border-${metrics.trend === 'improving' ? 'green' : 'orange'}-300 bg-${metrics.trend === 'improving' ? 'green' : 'orange'}-50/30`}>
          <CardContent className="p-3">
            <p className={`text-xs font-mono font-bold mb-1 text-${metrics.trend === 'improving' ? 'green' : 'orange'}-700`}>
              TREND
            </p>
            <p className={`text-2xl font-bold text-${metrics.trend === 'improving' ? 'green' : 'orange'}-700 capitalize`}>
              {metrics.trend}
            </p>
            <p className={`text-xs text-${metrics.trend === 'improving' ? 'green' : 'orange'}-600 mt-1`}>
              30-day trajectory
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}