import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, Zap, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

/**
 * Manual recovery protocol triggers for critical incidents
 * Allows ops team to manually invoke escalation, route reassignment, etc.
 */
export default function ManualRecoveryPanel() {
  const [showConfirm, setShowConfirm] = useState(null);

  const triggerRecoveryMutation = useMutation({
    mutationFn: async (protocolType) => {
      console.log(`[RECOVERY] Triggering ${protocolType} protocol...`);
      
      await base44.asServiceRole.functions.invoke('logOperationFailure', {
        incident_type: 'manual_recovery_triggered',
        severity: 'high',
        affected_entity_type: 'system',
        affected_entity_id: 'network',
        error_message: `Manual ${protocolType} protocol triggered by ops`
      });

      return { success: true, protocol: protocolType };
    },
    onSuccess: (data) => {
      toast.success(`✅ ${data.protocol} protocol activated`);
      setShowConfirm(null);
    },
    onError: () => toast.error('Failed to trigger recovery'),
  });

  const protocols = [
    {
      id: 'sla_breach',
      name: 'SLA Breach Recovery',
      description: 'Reassign routes, extend deadlines, notify affected customers',
      icon: AlertTriangle,
      color: 'border-red-300 bg-red-50',
      textColor: 'text-red-700',
      severity: 'critical'
    },
    {
      id: 'node_failover',
      name: 'Node Failover',
      description: 'Reassign all lockers from failed node to backup facility',
      icon: Shield,
      color: 'border-orange-300 bg-orange-50',
      textColor: 'text-orange-700',
      severity: 'high'
    },
    {
      id: 'route_rebalance',
      name: 'Route Rebalancing',
      description: 'Recalculate optimal routes and reassign stops',
      icon: Zap,
      color: 'border-blue-300 bg-blue-50',
      textColor: 'text-blue-700',
      severity: 'medium'
    }
  ];

  return (
    <Card className="border-red-300 bg-red-50/30">
      <CardHeader>
        <CardTitle className="text-sm font-mono flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-4 h-4" />
          Manual Recovery Protocols
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-red-600 mb-3">
          ⚠️ Use only when automated recovery has failed. Ops team approval required.
        </p>

        {protocols.map(protocol => {
          const Icon = protocol.icon;
          const isTriggering = triggerRecoveryMutation.isPending && showConfirm === protocol.id;

          return (
            <div key={protocol.id} className={`border-l-4 rounded-lg p-3 ${protocol.color}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1">
                  <Icon className={`w-4 h-4 ${protocol.textColor} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${protocol.textColor}`}>
                      {protocol.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {protocol.description}
                    </p>
                  </div>
                </div>

                {showConfirm === protocol.id ? (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8"
                      onClick={() => setShowConfirm(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className={`text-xs h-8 ${
                        protocol.severity === 'critical' ? 'bg-red-600 hover:bg-red-700' :
                        protocol.severity === 'high' ? 'bg-orange-600 hover:bg-orange-700' :
                        'bg-blue-600 hover:bg-blue-700'
                      } text-white`}
                      onClick={() => triggerRecoveryMutation.mutate(protocol.id)}
                      disabled={isTriggering}
                    >
                      {isTriggering ? 'Activating...' : 'Confirm'}
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className={`text-xs h-8 ${protocol.textColor} border-current`}
                    onClick={() => setShowConfirm(protocol.id)}
                  >
                    Trigger
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}