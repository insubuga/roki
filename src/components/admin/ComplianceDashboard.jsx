import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Shield, Lock, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * Compliance & audit log dashboard for ops & legal teams
 * Shows audit trail, regulatory flags, retention policies
 */
export default function ComplianceDashboard() {
  const [filterActor, setFilterActor] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['auditLogs', filterActor, filterType],
    queryFn: async () => {
      const query = {};
      if (filterActor !== 'all') query.actor_email = filterActor;
      if (filterType !== 'all') query.event_type = filterType;
      
      const logs = await base44.asServiceRole.entities.AuditLog.filter(
        query,
        '-timestamp',
        100
      );
      return logs || [];
    },
  });

  const { data: complianceStats = {} } = useQuery({
    queryKey: ['complianceStats'],
    queryFn: async () => {
      const allLogs = await base44.asServiceRole.entities.AuditLog.list('-timestamp', 1000);
      
      const gdprLogs = allLogs.filter(l => l.compliance_flags?.includes('GDPR')).length;
      const pciLogs = allLogs.filter(l => l.compliance_flags?.includes('PCI')).length;
      const criticalEvents = allLogs.filter(l => l.severity === 'critical').length;
      const failedOps = allLogs.filter(l => l.status === 'failed').length;
      const expiringLogs = allLogs.filter(l => {
        const expiry = new Date(l.retention_until);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        return expiry <= thirtyDaysFromNow && expiry > new Date();
      }).length;

      return {
        gdprLogs,
        pciLogs,
        criticalEvents,
        failedOps,
        expiringLogs,
        totalLogs: allLogs.length
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const getEventIcon = (eventType) => {
    if (eventType.includes('delete')) return '🗑️';
    if (eventType.includes('update')) return '✏️';
    if (eventType.includes('payment')) return '💳';
    if (eventType.includes('login')) return '🔐';
    return '📝';
  };

  return (
    <div className="space-y-4">
      {/* Compliance Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="border-border">
          <CardContent className="p-3">
            <Shield className="w-4 h-4 text-blue-600 mb-2" />
            <p className="text-2xl font-bold">{complianceStats.totalLogs || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Audit Logs</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3">
            <Lock className="w-4 h-4 text-purple-600 mb-2" />
            <p className="text-2xl font-bold">{complianceStats.gdprLogs || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">GDPR Flagged</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3">
            <AlertTriangle className="w-4 h-4 text-orange-600 mb-2" />
            <p className="text-2xl font-bold text-orange-600">{complianceStats.expiringLogs || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Expiring (30d)</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3">
            <FileText className="w-4 h-4 text-green-600 mb-2" />
            <p className="text-2xl font-bold">{complianceStats.pciLogs || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">PCI Flagged</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3">
            <AlertTriangle className="w-4 h-4 text-red-600 mb-2" />
            <p className="text-2xl font-bold text-red-600">{complianceStats.criticalEvents || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Critical Events</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3">
            <AlertTriangle className="w-4 h-4 text-red-500 mb-2" />
            <p className="text-2xl font-bold text-red-600">{complianceStats.failedOps || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Failed Ops</p>
          </CardContent>
        </Card>
      </div>

      {/* Audit Log Stream */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm font-mono">Audit Trail (Last 100)</CardTitle>
          <div className="flex gap-2 mt-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs px-2 py-1 rounded border border-border bg-card"
            >
              <option value="all">All Event Types</option>
              <option value="entity_update">Updates</option>
              <option value="entity_delete">Deletes</option>
              <option value="payment_transaction">Payments</option>
              <option value="user_action">User Actions</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {auditLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No audit logs found</p>
          ) : (
            auditLogs.map(log => (
              <div key={log.id} className="border border-border rounded-lg p-2.5 text-xs">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg">{getEventIcon(log.event_type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono font-bold text-foreground truncate">
                        {log.event_id}
                      </p>
                      <p className="text-muted-foreground">
                        {log.actor_email} → {log.resource_type}#{log.resource_id}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {log.status === 'failed' && (
                      <Badge className="bg-red-100 text-red-700 text-[10px]">FAILED</Badge>
                    )}
                    {log.severity === 'critical' && (
                      <Badge className="bg-red-600 text-white text-[10px]">CRITICAL</Badge>
                    )}
                  </div>
                </div>

                <p className="text-muted-foreground mb-1">{log.action}</p>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                  {log.compliance_flags?.length > 0 && (
                    <div className="flex gap-1">
                      {log.compliance_flags.map(flag => (
                        <Badge key={flag} className="bg-blue-100 text-blue-700 text-[9px]">
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {log.error_message && (
                  <p className="text-red-600 mt-1 bg-red-50 p-1 rounded">
                    {log.error_message}
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Export & Compliance Cert */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="text-xs h-10">
          <FileText className="w-3 h-3 mr-1" />
          Export Compliance Report
        </Button>
        <Button className="bg-green-600 hover:bg-green-700 text-white text-xs h-10">
          <CheckCircle className="w-3 h-3 mr-1" />
          Generate Audit Certificate
        </Button>
      </div>
    </div>
  );
}