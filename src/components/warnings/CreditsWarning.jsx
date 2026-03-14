import { AlertTriangle, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function CreditsWarning({ remaining, threshold = 1 }) {
  if (remaining > threshold) return null;

  return (
    <Card className="border-orange-600 bg-orange-50 dark:bg-orange-950/20">
      <CardContent className="p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-orange-900 dark:text-orange-200 font-semibold text-sm">
            Low Emergency Credits
          </p>
          <p className="text-orange-800 dark:text-orange-300 text-xs mt-1">
            You have only {remaining} credit{remaining === 1 ? '' : 's'} remaining for rush or resupply. 
            <span className="block mt-1">Upgrade your plan to get more coverage.</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}