import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex items-center justify-center min-h-[50vh] p-6">
        <Card className="border-red-600/40 max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-foreground font-bold font-mono text-sm">SYSTEM ERROR</p>
              <p className="text-muted-foreground text-xs mt-1">
                {this.props.label || 'This module encountered an unexpected error.'}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="font-mono text-xs"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              RETRY
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
}