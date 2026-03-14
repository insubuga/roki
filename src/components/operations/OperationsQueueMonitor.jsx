import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import MobileHeader from '../mobile/MobileHeader';

/**
 * Admin view for monitoring failed operations queue
 * Shows what's retrying, what's escalated, what needs manual intervention
 */
export default function OperationsQueueMonitor() {
  const { data: pendingOps = [], refetch } = useQuery({
    queryKey: ['retryableOperations'],
    queryFn: () => base44.asServiceRole.entities.RetryableOperation.filter({
      status: { $in: ['pending', 'retrying', 'manual_review'] }
    }, '-created_date'),
    refetchInterval: 30000 // Refresh every 30s
  });

  const { data: incidents = [], refetch: refetchIncidents } = useQuery({
    queryKey: ['incidentsOpen'],
    queryFn: () => base44.asServiceRole.entities.IncidentLog.filter({
      status: { $in: ['open', 'investigating'] }
    }, '-incident_time'),
    refetchInterval: 30000
  });

  const statusCounts = {
    pending: pendingOps.filter(op => op.status === 'pending').length,
    retrying: pendingOps.filter(op => op.status === 'retrying').length,
    escalated: pendingOps.filter(op => op.status === 'manual_review').length
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'retrying': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'manual_review': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return Clock;
      case 'retrying': return RefreshCw;
      case 'manual_review': return AlertTriangle;
      default: return AlertCircle;
    }
  };

  return (
    <div className="space-y-4">
      <MobileHeader 
        title="Operations Queue" 
        subtitle="Failed & Retrying Operations"
        icon={RefreshCw}
        iconColor="text-orange-600"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="p-3">
            <p className="text-2xl font-bold text-yellow-700">{statusCounts.pending}</p>
            <p className="text-xs text-yellow-600 font-mono">Pending</p>
          </CardContent>
        </Card>
        <Card className="border-blue-300 bg-blue-50">
          <CardContent className="p-3">
            <p className="text-2xl font-bold text-blue-700">{statusCounts.retrying}</p>
            <p className="text-xs text-blue-600 font-mono">Retrying</p>
          </CardContent>
        </Card>
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-3">
            <p className="text-2xl font-bold text-red-700">{statusCounts.escalated}</p>
            <p className="text-xs text-red-600 font-mono">Escalated</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Operations */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm font-mono">Retrying Operations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pendingOps.length === 0 ? (
            <div className="text-center py-4">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">All operations succeeded</p>
            </div>
          ) : (
            pendingOps.map(op => {
              const StatusIcon = getStatusIcon(op.status);
              const nextRetry = op.next_retry_at ? new Date(op.next_retry_at) : null;
              const timeUntilRetry = nextRetry ? Math.max(0, (nextRetry - new Date()) / 1000) : 0;
              
              return (
                <Card key={op.id} className={`border ${getStatusColor(op.status)}`}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <StatusIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-mono font-semibold text-xs truncate">
                            {op.operation_type}
                          </p>
                          <Badge className={getStatusColor(op.status)} variant="outline">
                            {op.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {op.affected_entity_type} #{op.affected_entity_id}
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                          <div>
                            <span className="text-muted-foreground">Attempts:</span>{' '}
                            <span className="font-mono">{op.attempt_count}/{op.max_attempts}</span>
                          </div>
                          {nextRetry && (
                            <div>
                              <span className="text-muted-foreground">Retry in:</span>{' '}
                              <span className="font-mono">{Math.round(timeUntilRetry)}s</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-red-700 bg-red-50 p-1 rounded truncate">
                          {op.error_message}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Related Incidents */}
      {incidents.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="text-sm font-mono text-red-900">
              {incidents.length} Open Incident{incidents.length > 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {incidents.slice(0, 5).map(incident => (
              <div key={incident.id} className="text-xs p-2 bg-white rounded border border-red-200">
                <p className="font-mono font-bold text-red-700 mb-1">{incident.incident_id}</p>
                <p className="text-muted-foreground">{incident.root_cause}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Manual Refresh */}
      <Button 
        onClick={() => { refetch(); refetchIncidents(); }}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Refresh Status
      </Button>
    </div>
  );
}