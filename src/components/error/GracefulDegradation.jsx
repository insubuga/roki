import React, { useState, useEffect } from 'react';
import { AlertTriangle, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Component that shows when app is in degraded mode
 * Displays offline status, pending retries, and manual recovery options
 */
export default function GracefulDegradation() {
  const [isOffline, setIsOffline] = useState(false);
  const [hasFailedOps, setHasFailedOps] = useState(false);
  const [failedOpCount, setFailedOpCount] = useState(0);

  useEffect(() => {
    // Monitor network status
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline && !hasFailedOps) {
    return null; // No degradation
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-40">
      {isOffline && (
        <Card className="border-orange-600 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <WifiOff className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 mb-1">No Internet Connection</h3>
                <p className="text-sm text-orange-700 mb-3">
                  Your changes will sync automatically when you're back online.
                </p>
                <div className="h-1 bg-orange-200 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-600 w-1/3 animate-pulse" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {hasFailedOps && (
        <Card className="border-red-600 bg-red-50 mt-2">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1">
                  {failedOpCount} Operation{failedOpCount > 1 ? 's' : ''} Pending
                </h3>
                <p className="text-sm text-red-700 mb-3">
                  Roki is automatically retrying failed operations. If this persists, contact support.
                </p>
                <Button 
                  variant="outline"
                  size="sm"
                  className="w-full text-red-700 border-red-600 hover:bg-red-100"
                  onClick={() => {
                    // Navigate to operation status page
                    window.location.href = '/operations-queue';
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  View Pending Operations
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}