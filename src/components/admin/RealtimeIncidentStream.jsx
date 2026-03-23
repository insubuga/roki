import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, CheckCircle, Clock, TrendingDown, Bell, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function RealtimeIncidentStream() {
  const [incidents, setIncidents] = useState([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    let unsubscribe;

    const subscribe = async () => {
      try {
        console.log('[INCIDENT_STREAM] Subscribing to incident changes...');
        
        unsubscribe = base44.entities.IncidentLog.subscribe((event) => {
          if (event.type === 'create') {
            console.log(`[INCIDENT_STREAM] New incident: ${event.data?.incident_id}`);
            setIncidents(prev => [event.data, ...prev].slice(0, 50)); // Keep last 50
          } else if (event.type === 'update') {
            setIncidents(prev =>
              prev.map(i => i.id === event.id ? event.data : i)
            );
          }
        });

        setIsSubscribed(true);
      } catch (error) {
        console.error('[INCIDENT_STREAM] Failed to subscribe:', error);
      }
    };

    subscribe();

    return () => {
      if (unsubscribe) unsubscribe();
      setIsSubscribed(false);
    };
  }, []);

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'high': return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'medium': return <Clock className="w-5 h-5 text-yellow-600" />;
      default: return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'border-l-red-600 bg-red-50/30';
      case 'high': return 'border-l-orange-600 bg-orange-50/30';
      case 'medium': return 'border-l-yellow-600 bg-yellow-50/30';
      default: return 'border-l-green-600 bg-green-50/30';
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Live Incident Stream
          </CardTitle>
          <Badge variant="outline" className={isSubscribed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
            {isSubscribed ? '● LIVE' : '○ OFFLINE'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {incidents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <p className="text-sm">No incidents detected</p>
          </div>
        ) : (
          incidents.map(incident => (
            <div
              key={incident.id}
              className={`border-l-4 rounded-lg p-3 ${getSeverityColor(incident.severity)}`}
            >
              <div className="flex items-start gap-3">
                {getSeverityIcon(incident.severity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-mono font-bold text-xs text-foreground">
                      {incident.incident_id}
                    </p>
                    <Badge className="text-[10px] font-mono px-2 py-0.5">
                      {incident.incident_type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {incident.affected_entity_type} #{incident.affected_entity_id}
                  </p>
                  {incident.root_cause && (
                    <p className="text-xs text-foreground bg-black/5 p-1.5 rounded font-mono">
                      {incident.root_cause}
                    </p>
                  )}
                  {incident.recovery_action_taken && (
                    <p className="text-xs text-green-700 mt-1.5 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {incident.recovery_action_taken}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(incident.incident_time).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}