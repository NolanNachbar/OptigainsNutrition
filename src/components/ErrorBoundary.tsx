import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'app' | 'page' | 'component';
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substring(7),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', {
      error,
      errorInfo,
      level: this.props.level || 'component',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error tracking service (implement as needed)
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // TODO: Integrate with error tracking service (Sentry, LogRocket, etc.)
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      level: this.props.level || 'component',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errorId: this.state.errorId,
    };

    // For now, just log to console
    console.error('[ErrorBoundary] Error report:', errorReport);

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: errorReport });
    }
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private copyErrorDetails = () => {
    const errorDetails = {
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
        // Could show a toast notification here
        console.log('Error details copied to clipboard');
      })
      .catch((err) => {
        console.error('Failed to copy error details:', err);
      });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Different error UIs based on level
      const level = this.props.level || 'component';

      if (level === 'app') {
        return (
          <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <Card className="max-w-md w-full">
              <div className="text-center">
                <div className="text-red-500 text-6xl mb-4">⚠️</div>
                <h1 className="text-xl font-bold mb-2">Application Error</h1>
                <p className="text-gray-400 mb-6">
                  Something went wrong with OptiGains. We've been notified and are working on a fix.
                </p>
                <div className="space-y-3">
                  <Button onClick={this.handleReload} className="w-full">
                    Reload Application
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={this.copyErrorDetails}
                    className="w-full text-sm"
                  >
                    Copy Error Details
                  </Button>
                </div>
                <p className="text-xs text-gray-600 mt-4">
                  Error ID: {this.state.errorId}
                </p>
              </div>
            </Card>
          </div>
        );
      }

      if (level === 'page') {
        return (
          <div className="min-h-screen bg-gray-900 pt-20 pb-24">
            <div className="max-w-4xl mx-auto px-4">
              <Card className="text-center">
                <div className="text-red-500 text-4xl mb-4">🚨</div>
                <h2 className="text-lg font-semibold mb-2">Page Error</h2>
                <p className="text-gray-400 mb-6">
                  This page encountered an error. Try refreshing or going back to the previous page.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={this.handleRetry}>
                    Try Again
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => window.history.back()}
                  >
                    Go Back
                  </Button>
                </div>
                {process.env.NODE_ENV === 'development' && (
                  <details className="mt-6 text-left">
                    <summary className="cursor-pointer text-sm text-gray-500 mb-2">
                      Error Details (Development)
                    </summary>
                    <pre className="text-xs bg-gray-800 p-3 rounded overflow-auto">
                      {this.state.error?.message}
                      {'\n\n'}
                      {this.state.error?.stack}
                    </pre>
                  </details>
                )}
              </Card>
            </div>
          </div>
        );
      }

      // Component-level error
      return (
        <Card variant="elevated" className="border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3">
            <div className="text-red-500 text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-medium text-red-400">Component Error</h3>
              <p className="text-sm text-gray-400">
                This component failed to load properly.
              </p>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={this.handleRetry}
              className="text-red-400 hover:text-red-300"
            >
              Retry
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-gray-500">
                Error Details
              </summary>
              <pre className="text-xs text-gray-600 mt-2 overflow-auto">
                {this.state.error?.message}
              </pre>
            </details>
          )}
        </Card>
      );
    }

    return this.props.children;
  }
}

// HOC for easy wrapping of components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook for programmatic error handling
export function useErrorHandler() {
  return (error: Error, errorInfo?: string) => {
    console.error('[useErrorHandler]', error, errorInfo);
    
    // In a real app, you might want to show a toast or notification
    // For now, we'll just log it
    if (process.env.NODE_ENV === 'production') {
      // Report to error tracking service
    }
  };
}

// Async error boundary for handling promise rejections
export class AsyncErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  componentDidMount() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handlePromiseRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handlePromiseRejection);
  }

  private handlePromiseRejection = (event: PromiseRejectionEvent) => {
    console.error('[AsyncErrorBoundary] Unhandled promise rejection:', event.reason);
    
    // Convert promise rejection to error
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));

    this.setState({
      hasError: true,
      error,
      errorInfo: null,
      errorId: Math.random().toString(36).substring(7),
    });

    // Prevent the default browser behavior
    event.preventDefault();
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substring(7),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AsyncErrorBoundary] Caught error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card variant="elevated" className="border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-center gap-3">
            <div className="text-yellow-500 text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-medium text-yellow-400">Async Operation Failed</h3>
              <p className="text-sm text-gray-400">
                A background operation encountered an error.
              </p>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={this.handleRetry}
              className="text-yellow-400 hover:text-yellow-300"
            >
              Retry
            </Button>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}