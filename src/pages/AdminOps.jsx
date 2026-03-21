import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Shield, AlertTriangle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import MobileHeader from '../components/mobile/MobileHeader';
import PullToRefresh from '../components/mobile/PullToRefresh';
import NetworkHealthMonitor from '../components/admin/NetworkHealthMonitor';
import RealtimeIncidentStream from '../components/admin/RealtimeIncidentStream';
import DriverPerformanceLeaderboard from '../components/admin/DriverPerformanceLeaderboard';
import ManualRecoveryPanel from '../components/admin/ManualRecoveryPanel';
import OperationsQueueMonitor from '../components/operations/OperationsQueueMonitor';
import ComplianceDashboard from '../components/admin/ComplianceDashboard';
import AnalyticsDashboard from '../components/admin/AnalyticsDashboard';

export default function AdminOps() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await base44.auth.me();
        
        if (userData?.role !== 'admin') {
          toast.error('Access denied. Admin role required.');
          window.location.href = '/';
          return;
        }

        setUser(userData);
      } catch (e) {
        console.error('[ADMIN_OPS] Auth failed:', e);
        base44.auth.redirectToLogin();
      }
    };

    checkAuth();
  }, []);

  const { data: pendingRetries = [] } = useQuery({
    queryKey: ['pendingRetries'],
    queryFn: async () => {
      const ops = await base44.asServiceRole.entities.RetryableOperation.filter({
        status: { $in: ['pending', 'retrying'] }
      });
      return ops || [];
    },
    refetchInterval: 10000, // Refresh every 10s
  });

  const { data: openIncidents = [] } = useQuery({
    queryKey: ['openIncidents'],
    queryFn: async () => {
      const incidents = await base44.asServiceRole.entities.IncidentLog.filter({
        status: { $in: ['open', 'investigating'] }
      });
      return incidents || [];
    },
    refetchInterval: 10000,
  });

  const handleRefresh = async () => {
    window.location.reload(); // full reload for admin intel page is fine
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const alertLevel = openIncidents.length > 5 ? 'critical' : openIncidents.length > 2 ? 'warning' : 'normal';

  return (
    <div className="space-y-4">
        {/* Header */}
        <MobileHeader
          title="Operational Intelligence"
          subtitle="Real-time Network Monitoring"
          icon={Shield}
          iconColor="text-green-600"
        />

        {/* Alert Banner */}
        {alertLevel !== 'normal' && (
          <div className={`rounded-lg p-4 border-l-4 ${
            alertLevel === 'critical'
              ? 'border-red-600 bg-red-50'
              : 'border-orange-600 bg-orange-50'
          }`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${
                alertLevel === 'critical' ? 'text-red-600' : 'text-orange-600'
              }`} />
              <p className={`font-semibold ${
                alertLevel === 'critical' ? 'text-red-700' : 'text-orange-700'
              }`}>
                {openIncidents.length} Active Incident{openIncidents.length !== 1 ? 's' : ''}
              </p>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {pendingRetries.length} operations pending retry
            </p>
          </div>
        )}

        {/* Network Health */}
        <NetworkHealthMonitor />

        {/* Live Incident Stream */}
        <RealtimeIncidentStream />

        {/* Operations Queue */}
        <OperationsQueueMonitor />

        {/* Driver Performance */}
        <DriverPerformanceLeaderboard />

        {/* Manual Recovery */}
        <ManualRecoveryPanel />

        {/* Compliance & Audit Trail */}
        <ComplianceDashboard />

        {/* Advanced Analytics & Predictive Intelligence */}
        <AnalyticsDashboard />

        {/* Refresh Button */}
        <Button
          onClick={handleRefresh}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Refresh All Metrics
        </Button>
      </div>
    </PullToRefresh>
  );
}