import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Star, Award, TrendingUp, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * Driver performance leaderboard ranked by reliability, speed, and ratings
 */
export default function DriverPerformanceLeaderboard() {
  const { data: drivers = [] } = useQuery({
    queryKey: ['driverStats'],
    queryFn: async () => {
      const stats = await base44.asServiceRole.entities.DriverStats.list('-average_rating', 20);
      return stats || [];
    },
  });

  const { data: reliabilityScores = [] } = useQuery({
    queryKey: ['driverReliability'],
    queryFn: async () => {
      const scores = await base44.asServiceRole.entities.ReliabilityScore.filter({
        entity_type: 'driver'
      }, '-overall_score', 20);
      return scores || [];
    },
  });

  const getRankBadge = (index) => {
    if (index === 0) return <Badge className="bg-yellow-500 text-white">🥇 Gold</Badge>;
    if (index === 1) return <Badge className="bg-gray-400 text-white">🥈 Silver</Badge>;
    if (index === 2) return <Badge className="bg-orange-600 text-white">🥉 Bronze</Badge>;
    return null;
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-sm font-mono flex items-center gap-2">
          <Award className="w-4 h-4" />
          Top Drivers by Reliability
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {drivers.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No driver data available</p>
        ) : (
          drivers.map((driver, idx) => {
            const reliability = reliabilityScores.find(
              r => r.entity_id === driver.driver_email
            );

            return (
              <div key={driver.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {driver.driver_email?.split('@')[0] || 'Driver'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < Math.round(driver.average_rating || 0)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">
                        {driver.average_rating?.toFixed(1) || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-2">
                  <div className="text-right text-xs">
                    <p className="font-bold text-foreground">{driver.total_deliveries || 0}</p>
                    <p className="text-muted-foreground">delivered</p>
                  </div>

                  {reliability && (
                    <div className="text-right text-xs">
                      <Badge className={`${
                        reliability.overall_score >= 95 ? 'bg-green-100 text-green-800' :
                        reliability.overall_score >= 85 ? 'bg-blue-100 text-blue-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {reliability.overall_score.toFixed(0)}%
                      </Badge>
                    </div>
                  )}

                  {getRankBadge(idx)}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}