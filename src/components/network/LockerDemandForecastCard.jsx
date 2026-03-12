import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertTriangle } from 'lucide-react';

const RISK_COLORS = {
  low:      'bg-green-600',
  medium:   'bg-yellow-500',
  high:     'bg-orange-600',
  critical: 'bg-red-600',
};

export default function LockerDemandForecastCard({ gymId }) {
  const { data: gyms = [] } = useQuery({
    queryKey: ['allGyms-forecast'],
    queryFn: () => base44.entities.Gym.list(),
  });

  const { data: forecasts = [] } = useQuery({
    queryKey: ['lockerDemandForecast', gymId],
    queryFn: () => gymId
      ? base44.entities.LockerDemandForecast.filter({ gym_id: gymId }, 'forecast_date', 7)
      : base44.entities.LockerDemandForecast.list('forecast_date', 20),
  });

  if (forecasts.length === 0) return null;

  const gymMap = Object.fromEntries(gyms.map(g => [g.id, g.name]));

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-mono uppercase flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          Locker Demand Forecast
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {forecasts.map((f) => (
            <div key={f.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-mono text-xs font-bold truncate">
                  {gymId ? f.forecast_date : `${gymMap[f.gym_id] || f.gym_id} · ${f.forecast_date}`}
                </p>
                <p className="text-muted-foreground font-mono text-xs mt-0.5">
                  {f.predicted_cycles} cycles · {f.saturation_pct ?? '—'}% capacity
                </p>
              </div>
              <div className="flex items-center gap-2">
                {f.saturation_risk === 'critical' || f.saturation_risk === 'high' ? (
                  <AlertTriangle className="w-3 h-3 text-orange-500" />
                ) : null}
                <Badge className={`${RISK_COLORS[f.saturation_risk] || 'bg-gray-600'} text-white font-mono text-xs`}>
                  {(f.saturation_risk || 'low').toUpperCase()}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}