import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Zap, TrendingDown, Clock, CheckCircle, Activity } from 'lucide-react';
import PullToRefresh from '@/components/mobile/PullToRefresh';

export default function RiskRecovery() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

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

  const { data: subscription } = useQuery({
    queryKey: ['subscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({ user_email: user?.email });
      return subs[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: incidentLogs = [] } = useQuery({
    queryKey: ['incidentLogs'],
    queryFn: () => base44.entities.IncidentLog.list('-created_date', 10),
    enabled: !!user,
  });

  const { data: reliabilityScore } = useQuery({
    queryKey: ['reliabilityScore', user?.email],
    queryFn: async () => {
      const scores = await base44.entities.ReliabilityScore.filter({ 
        entity_type: 'user',
        entity_id: user?.email
      });
      return scores[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: activeCycle } = useQuery({
    queryKey: ['activeCycle', user?.email],
    queryFn: async () => {
      const cycles = await base44.entities.LaundryOrder.filter({ 
        user_email: user?.email,
        status: { $in: ['awaiting_pickup', 'washing', 'drying', 'ready'] }
      }, '-created_date', 1);
      return cycles[0] || null;
    },
    enabled: !!user?.email,
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries();
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const rushCreditsRemaining = (subscription?.rush_deliveries_included || 0) - (subscription?.rush_deliveries_used || 0);
  const coverageLevel = subscription?.priority_dispatch ? 'Priority Readiness' : 'Core Readiness';
  const activeIncidents = incidentLogs.filter(log => log.status === 'open' || log.status === 'investigating');
  const mttr = reliabilityScore?.mean_time_to_recovery_minutes || 0;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-foreground text-xl font-bold font-mono">RISK & RECOVERY</h1>
          <p className="text-muted-foreground text-xs font-mono">Backup systems and incident response for laundry & supply readiness</p>
        </div>

        {/* Coverage Status */}
        <Card className={`border-2 ${rushCreditsRemaining > 0 ? 'border-green-600' : 'border-orange-600'} bg-card`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className={`w-5 h-5 ${rushCreditsRemaining > 0 ? 'text-green-600' : 'text-orange-600'}`} />
                <span className="text-muted-foreground text-xs font-mono uppercase">Coverage Status</span>
              </div>
              <Badge className={`${rushCreditsRemaining > 0 ? 'bg-green-600' : 'bg-orange-600'} text-white font-mono text-sm px-3 py-1`}>
                {rushCreditsRemaining > 0 ? 'PROTECTED' : 'LIMITED'}
              </Badge>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-mono">Coverage Tier</span>
                <span className="text-foreground font-mono font-bold">{coverageLevel.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-mono">Emergency Credits</span>
                <span className={`font-mono font-bold ${rushCreditsRemaining > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {rushCreditsRemaining} REMAINING
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-mono">Credits Reset</span>
                <span className="text-foreground font-mono">Monthly (no rollover)</span>
              </div>
            </div>

            {/* Credit scope explanation */}
            <div className="mt-4 bg-muted rounded p-3 text-xs space-y-1">
              <p className="text-foreground font-mono font-bold uppercase mb-2">What Emergency Credits Cover</p>
              <p className="text-muted-foreground">Each credit triggers a <span className="text-foreground font-semibold">priority dispatch</span> outside your normal cycle — for either:</p>
              <ul className="text-muted-foreground mt-1 space-y-1 pl-2">
                <li>🧺 <span className="text-foreground">Rush laundry return</span> — gear back within 12h</li>
                <li>⚡ <span className="text-foreground">Attachment resupply</span> — electrolytes, pre-workout, or protein when you run out mid-week</li>
              </ul>
              <div className="mt-3 pt-2 border-t border-border grid grid-cols-2 gap-2">
                <div className="bg-background rounded p-2 text-center">
                  <p className="text-foreground font-mono font-bold">1 credit</p>
                  <p className="text-muted-foreground uppercase text-[10px] mt-0.5">Core / month</p>
                </div>
                <div className="bg-background rounded p-2 text-center">
                  <p className="text-green-600 font-mono font-bold">3 credits</p>
                  <p className="text-muted-foreground uppercase text-[10px] mt-0.5">Priority / month</p>
                </div>
              </div>
            </div>

            <Link to={createPageUrl('Subscription')}>
              <Button variant="outline" className="w-full mt-4 border-border font-mono text-xs">
                UPGRADE COVERAGE
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Active Incidents */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              ACTIVE INCIDENTS
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeIncidents.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="text-muted-foreground font-mono text-sm">No active incidents</p>
                <p className="text-muted-foreground font-mono text-xs mt-1">System operating normally</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeIncidents.map(incident => (
                  <div key={incident.id} className="bg-muted p-3 rounded border-l-4 border-orange-600">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-foreground font-mono text-sm font-bold">
                          {incident.incident_type?.replace('_', ' ').toUpperCase()}
                        </p>
                        <p className="text-muted-foreground font-mono text-xs mt-1">
                          {incident.affected_entity_type?.toUpperCase()} {incident.affected_entity_id}
                        </p>
                      </div>
                      <Badge className="bg-orange-600 text-white font-mono text-xs">
                        {incident.severity?.toUpperCase()}
                      </Badge>
                    </div>
                    {incident.recovery_action_taken && (
                      <p className="text-muted-foreground font-mono text-xs mt-2">
                        → {incident.recovery_action_taken}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recovery Performance */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              RECOVERY PERFORMANCE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground font-mono">{mttr}</p>
                <p className="text-muted-foreground font-mono text-xs uppercase mt-1">Avg MTTR (min)</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground font-mono">{incidentLogs.length}</p>
                <p className="text-muted-foreground font-mono text-xs uppercase mt-1">Total Incidents</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-mono">SLA Breach Rate</span>
                <span className="text-green-600 font-mono font-bold">
                  {(100 - (reliabilityScore?.sla_adherence_rate || 100)).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-mono">System Uptime</span>
                <span className="text-green-600 font-mono font-bold">
                  {reliabilityScore?.uptime_percentage || 100}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Actions */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-600" />
              EMERGENCY ACTIONS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to={createPageUrl('LaundryOrder')}>
              <Button 
                variant="outline" 
                className="w-full border-orange-600 text-orange-600 hover:bg-orange-600/10 font-mono text-xs h-12"
                disabled={!activeCycle}
              >
                <Zap className="w-4 h-4 mr-2" />
                ACTIVATE RECOVERY PROTOCOL
              </Button>
            </Link>
            <Link to={createPageUrl('Support')}>
              <Button 
                variant="outline" 
                className="w-full border-border font-mono text-xs h-12"
              >
                <Shield className="w-4 h-4 mr-2" />
                CONTACT SUPPORT
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Incident History */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <Clock className="w-4 h-4" />
              INCIDENT HISTORY (30 DAYS)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {incidentLogs.length === 0 ? (
              <p className="text-muted-foreground font-mono text-xs text-center py-4">
                No incidents recorded
              </p>
            ) : (
              <div className="space-y-2">
                {incidentLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div>
                      <p className="text-foreground font-mono text-xs">
                        {log.incident_type?.replace('_', ' ').toUpperCase()}
                      </p>
                      <p className="text-muted-foreground font-mono text-xs">
                        {new Date(log.created_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={`${
                      log.status === 'resolved' ? 'bg-green-600' : 
                      log.status === 'investigating' ? 'bg-blue-600' : 'bg-gray-600'
                    } text-white font-mono text-xs`}>
                      {log.status?.toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PullToRefresh>
  );
}