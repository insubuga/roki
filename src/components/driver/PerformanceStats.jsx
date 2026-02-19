import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, TrendingUp, Award, Target, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PerformanceStats({ stats }) {
  const {
    average_rating = 0,
    total_deliveries = 0,
    on_time_percentage = 0,
    acceptance_rate = 0,
    completion_rate = 0,
    total_ratings = 0
  } = stats || {};

  const performanceLevel = average_rating >= 4.5 ? 'Elite' : average_rating >= 4.0 ? 'Pro' : average_rating >= 3.5 ? 'Good' : 'Developing';
  
  const performanceColor = {
    'Elite': 'from-yellow-500 to-orange-500',
    'Pro': 'from-blue-500 to-purple-500',
    'Good': 'from-green-500 to-teal-500',
    'Developing': 'from-gray-500 to-gray-600'
  }[performanceLevel];

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 bg-gradient-to-br ${performanceColor} rounded-xl flex items-center justify-center shadow-lg`}>
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Performance Rating</h3>
              <Badge className={`bg-gradient-to-r ${performanceColor} text-white border-0`}>
                {performanceLevel} Driver
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(average_rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {average_rating.toFixed(1)}
            </p>
            <p className="text-xs text-gray-500">{total_ratings} ratings</p>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <MetricCard
            icon={Target}
            label="On-Time"
            value={`${on_time_percentage.toFixed(0)}%`}
            color="green"
            delay={0}
          />
          <MetricCard
            icon={Zap}
            label="Acceptance"
            value={`${acceptance_rate.toFixed(0)}%`}
            color="blue"
            delay={0.1}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            icon={TrendingUp}
            label="Completion"
            value={`${completion_rate.toFixed(0)}%`}
            color="purple"
            delay={0.2}
          />
          <MetricCard
            icon={Award}
            label="Total Deliveries"
            value={total_deliveries}
            color="orange"
            delay={0.3}
          />
        </div>

        {/* Performance Tips */}
        {average_rating < 4.5 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-semibold text-blue-900 mb-1">💡 Tip to improve:</p>
            <p className="text-xs text-blue-800">
              {average_rating < 4.0
                ? 'Focus on communication and timely updates to customers'
                : 'Maintain your great service to reach Elite status!'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricCard({ icon: Icon, label, value, color, delay }) {
  const colorClasses = {
    green: 'bg-green-50 border-green-200 text-green-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className={`${colorClasses[color]} rounded-lg p-3 border`}
    >
      <Icon className={`w-4 h-4 mb-2`} />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs opacity-80">{label}</p>
    </motion.div>
  );
}