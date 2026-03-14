import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function SLAWarning({ breachRate, slaAdherence }) {
  const isCritical = breachRate > 5 || slaAdherence < 90;
  
  if (!isCritical) return null;

  return (
    <Card className={`border-${breachRate > 10 ? 'red' : 'orange'}-600 bg-${breachRate > 10 ? 'red' : 'orange'}-50 dark:bg-${breachRate > 10 ? 'red' : 'orange'}-950/20`}>
      <CardContent className="p-4 flex items-start gap-3">
        <AlertTriangle className={`w-5 h-5 text-${breachRate > 10 ? 'red' : 'orange'}-600 flex-shrink-0 mt-0.5`} />
        <div>
          <p className={`text-${breachRate > 10 ? 'red' : 'orange'}-900 dark:text-${breachRate > 10 ? 'red' : 'orange'}-200 font-semibold text-sm`}>
            {breachRate > 10 ? 'Critical SLA Risk' : 'SLA Adherence Declining'}
          </p>
          <p className={`text-${breachRate > 10 ? 'red' : 'orange'}-800 dark:text-${breachRate > 10 ? 'red' : 'orange'}-300 text-xs mt-1`}>
            Your system is experiencing {breachRate.toFixed(1)}% SLA breaches. 
            <span className="block mt-1">Consider upgrading to Priority coverage for better reliability.</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}