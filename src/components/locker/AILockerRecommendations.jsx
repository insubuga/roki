import React from 'react';
import { Brain, TrendingUp, Clock, Sparkles, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function AILockerRecommendations({ recommendations, isLoading, onSelectLocker }) {
  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-[var(--color-primary)]/10 to-purple-500/10 border-[var(--color-primary)]/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--color-primary)] to-purple-500 rounded-lg flex items-center justify-center animate-pulse">
              <Brain className="w-6 h-6 text-black" />
            </div>
            <div className="flex-1">
              <div className="h-4 bg-[var(--color-bg-secondary)] rounded w-3/4 mb-2 animate-pulse" />
              <div className="h-3 bg-[var(--color-bg-secondary)] rounded w-1/2 animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recommendations) {
    return null;
  }

  const demandColors = {
    High: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', icon: TrendingUp },
    Medium: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', icon: TrendingUp },
    Low: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', icon: TrendingUp },
  };

  const demandStyle = demandColors[recommendations.demand_level] || demandColors.Medium;
  const DemandIcon = demandStyle.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="bg-gradient-to-br from-[var(--color-primary)]/10 to-purple-500/10 border-[var(--color-primary)]/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--color-text-primary)]">
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--color-primary)] to-purple-500 rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-black" />
            </div>
            <div>
              <span>AI Locker Assistant</span>
              <p className="text-sm font-normal text-[var(--color-text-secondary)] mt-1">
                Powered by real-time demand analysis
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Demand Prediction */}
          <div className={`${demandStyle.bg} ${demandStyle.border} border rounded-lg p-4`}>
            <div className="flex items-start gap-3">
              <DemandIcon className={`w-5 h-5 ${demandStyle.text} flex-shrink-0 mt-0.5`} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[var(--color-text-primary)] font-semibold">
                    {recommendations.demand_level} Demand
                  </span>
                  <Badge className={`${demandStyle.bg} ${demandStyle.text} border-none text-xs`}>
                    {recommendations.available_count}/{recommendations.total_count} available
                  </Badge>
                </div>
                <p className="text-[var(--color-text-secondary)] text-sm">
                  {recommendations.demand_reasoning}
                </p>
              </div>
            </div>
          </div>

          {/* Personalized Insight */}
          {recommendations.user_insight && (
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-border)]">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[var(--color-text-secondary)] text-sm">
                    {recommendations.user_insight}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recommended Lockers */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-[var(--color-primary)]" />
              <h4 className="text-[var(--color-text-primary)] font-semibold text-sm">
                Recommended Lockers
              </h4>
            </div>
            <div className="space-y-2">
              {recommendations.recommendations.slice(0, 3).map((rec, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-[var(--color-bg-secondary)] rounded-lg p-3 border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors cursor-pointer"
                  onClick={() => onSelectLocker && onSelectLocker(rec.locker_number)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[var(--color-text-primary)] font-semibold">
                          Locker #{rec.locker_number}
                        </span>
                        {idx === 0 && (
                          <Badge className="bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-none text-xs">
                            Best Match
                          </Badge>
                        )}
                      </div>
                      <p className="text-[var(--color-text-secondary)] text-xs">
                        {rec.reason}
                      </p>
                    </div>
                    {onSelectLocker && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="ml-3 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black select-none"
                      >
                        Select
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Optimal Duration */}
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-border)]">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-[var(--color-primary)]" />
              <div>
                <p className="text-[var(--color-text-secondary)] text-sm">
                  Suggested rental duration
                </p>
                <p className="text-[var(--color-text-primary)] font-bold">
                  {recommendations.optimal_duration_hours} hours
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}