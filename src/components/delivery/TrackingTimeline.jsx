import React from 'react';
import { Package, Truck, MapPin, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const statusIcons = {
  TRANSIT: Truck,
  DELIVERED: CheckCircle,
  RETURNED: AlertCircle,
  FAILURE: AlertCircle,
  UNKNOWN: Clock,
  PRE_TRANSIT: Package,
};

const statusColors = {
  TRANSIT: 'text-blue-500',
  DELIVERED: 'text-green-500',
  RETURNED: 'text-orange-500',
  FAILURE: 'text-red-500',
  UNKNOWN: 'text-gray-500',
  PRE_TRANSIT: 'text-purple-500',
};

export default function TrackingTimeline({ trackingData }) {
  const StatusIcon = statusIcons[trackingData.status] || Clock;
  const statusColor = statusColors[trackingData.status] || 'text-gray-500';

  return (
    <Card className="bg-[var(--color-bg-card)] border-[var(--color-border)]">
      <CardHeader className="border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[var(--color-text-primary)] text-base flex items-center gap-2">
            <StatusIcon className={`w-5 h-5 ${statusColor}`} />
            Tracking Details
          </CardTitle>
          <Badge className="bg-blue-500/20 text-blue-400 border-none">
            {trackingData.carrier?.toUpperCase()}
          </Badge>
        </div>
        <p className="text-[var(--color-text-secondary)] text-sm mt-1">
          {trackingData.tracking_number}
        </p>
      </CardHeader>

      <CardContent className="p-4">
        {/* Current Status */}
        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className={`${statusColor} mt-1`}>
              <StatusIcon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="text-[var(--color-text-primary)] font-semibold">
                {trackingData.status_details || trackingData.status}
              </p>
              {trackingData.location && (
                <div className="flex items-center gap-1 text-[var(--color-text-secondary)] text-sm mt-1">
                  <MapPin className="w-3 h-3" />
                  <span>{trackingData.location.city}, {trackingData.location.state}</span>
                </div>
              )}
              {trackingData.eta && (
                <p className="text-[var(--color-text-secondary)] text-sm mt-1">
                  Expected: {format(new Date(trackingData.eta), 'MMM dd, h:mm a')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tracking History */}
        {trackingData.tracking_history && trackingData.tracking_history.length > 0 && (
          <div>
            <h4 className="text-[var(--color-text-primary)] font-semibold text-sm mb-3">
              Tracking History
            </h4>
            <div className="space-y-3 relative">
              {/* Timeline line */}
              <div className="absolute left-2 top-2 bottom-2 w-px bg-[var(--color-border)]" />

              {trackingData.tracking_history.map((event, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="relative flex gap-3"
                >
                  <div className="relative z-10 w-4 h-4 rounded-full bg-blue-500 border-2 border-[var(--color-bg-card)] mt-1" />
                  <div className="flex-1 pb-4">
                    <p className="text-[var(--color-text-primary)] text-sm font-medium">
                      {event.status_details || event.status}
                    </p>
                    <p className="text-[var(--color-text-secondary)] text-xs">
                      {event.location} • {format(new Date(event.timestamp), 'MMM dd, h:mm a')}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}