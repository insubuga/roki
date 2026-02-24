import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlertTriangle, Bell, Clock, TrendingDown, MapPin, Activity, Settings, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const ALERT_CATEGORIES = {
  sla_breach: { label: 'SLA RISK', icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-600' },
  node_failure: { label: 'NODE SATURATION', icon: MapPin, color: 'text-orange-600', bgColor: 'bg-orange-600' },
  route_delay: { label: 'ROUTE CONGESTION', icon: Activity, color: 'text-orange-600', bgColor: 'bg-orange-600' },
  quality_issue: { label: 'ROTATION RISK', icon: TrendingDown, color: 'text-yellow-600', bgColor: 'bg-yellow-600' },
  system_downtime: { label: 'SYSTEM MAINTENANCE', icon: Settings, color: 'text-blue-600', bgColor: 'bg-blue-600' },
};

export default function AlertCenter({ user }) {
  const [open, setOpen] = useState(false);

  const { data: incidentLogs = [] } = useQuery({
    queryKey: ['incidentLogs'],
    queryFn: () => base44.entities.IncidentLog.list('-created_date', 20),
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30s
  });

  const activeAlerts = incidentLogs.filter(log => 
    log.status === 'open' || log.status === 'investigating'
  );

  const criticalAlerts = activeAlerts.filter(log => 
    log.severity === 'high' || log.severity === 'critical'
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative text-foreground hover:bg-muted"
        >
          <Bell className="w-5 h-5" />
          {activeAlerts.length > 0 && (
            <Badge className={`absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 ${
              criticalAlerts.length > 0 ? 'bg-red-600' : 'bg-orange-600'
            } text-white text-xs border-2 border-background animate-pulse`}>
              {activeAlerts.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-96 max-h-[600px] overflow-y-auto bg-card border-border shadow-xl"
      >
        <div className="p-4 border-b border-border">
          <h3 className="text-foreground font-mono font-bold text-sm uppercase">Alert Center</h3>
          <p className="text-muted-foreground font-mono text-xs mt-1">
            {activeAlerts.length} active • Last scan: {format(new Date(), 'HH:mm:ss')}
          </p>
        </div>

        <div className="p-2">
          {activeAlerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <p className="text-foreground font-mono font-bold text-sm">ALL CLEAR</p>
              <p className="text-muted-foreground font-mono text-xs mt-1">
                No active incidents
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeAlerts.map(alert => {
                const category = ALERT_CATEGORIES[alert.incident_type] || {
                  label: alert.incident_type?.replace('_', ' ').toUpperCase(),
                  icon: AlertTriangle,
                  color: 'text-gray-600',
                  bgColor: 'bg-gray-600'
                };
                const Icon = category.icon;

                // Calculate resolution ETA
                const incidentTime = new Date(alert.incident_time || alert.created_date);
                const estimatedResolution = new Date(incidentTime.getTime() + (alert.time_to_resolution_minutes || 120) * 60000);
                const now = new Date();
                const minutesRemaining = Math.max(0, Math.round((estimatedResolution - now) / 60000));

                return (
                  <div 
                    key={alert.id}
                    className={`p-3 rounded-lg border-l-4 bg-muted/50 ${category.bgColor.replace('bg-', 'border-')}`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <Icon className={`w-4 h-4 mt-0.5 ${category.color}`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`font-mono font-bold text-xs ${category.color}`}>
                            {category.label}
                          </p>
                          <Badge className={`${category.bgColor} text-white font-mono text-xs`}>
                            {alert.severity?.toUpperCase() || 'MEDIUM'}
                          </Badge>
                        </div>
                        
                        {/* Timestamp */}
                        <p className="text-muted-foreground font-mono text-xs flex items-center gap-1 mb-2">
                          <Clock className="w-3 h-3" />
                          {format(new Date(alert.incident_time || alert.created_date), 'MMM d, HH:mm')}
                        </p>

                        {/* Cause */}
                        <div className="mb-2">
                          <p className="text-muted-foreground font-mono text-xs uppercase mb-1">Cause:</p>
                          <p className="text-foreground font-mono text-xs">
                            {alert.root_cause || alert.affected_entity_type?.toUpperCase() + ' ' + (alert.affected_entity_id || 'UNKNOWN')}
                          </p>
                        </div>

                        {/* Resolution ETA */}
                        <div className="flex items-center justify-between">
                          <p className="text-muted-foreground font-mono text-xs uppercase">Resolution ETA:</p>
                          <p className={`font-mono text-xs font-bold ${
                            minutesRemaining < 30 ? 'text-green-600' :
                            minutesRemaining < 60 ? 'text-orange-600' :
                            'text-red-600'
                          }`}>
                            {minutesRemaining}min
                          </p>
                        </div>

                        {/* Recovery Action */}
                        {alert.recovery_action_taken && (
                          <div className="mt-2 pt-2 border-t border-border">
                            <p className="text-muted-foreground font-mono text-xs uppercase mb-1">Recovery:</p>
                            <p className="text-foreground font-mono text-xs">
                              {alert.recovery_action_taken}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Historical Summary */}
        {incidentLogs.length > activeAlerts.length && (
          <div className="p-4 border-t border-border bg-muted/30">
            <p className="text-muted-foreground font-mono text-xs text-center">
              {incidentLogs.length - activeAlerts.length} resolved in last 30 days
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}