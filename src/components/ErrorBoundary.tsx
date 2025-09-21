import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { advancedErrorLogger } from '@/utils/advancedErrorLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Generate unique error ID
    const errorId = `boundary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Log to our advanced error logger
    advancedErrorLogger.logAdvancedError({
      level: 'critical',
      source: 'frontend',
      category: 'react_error_boundary',
      message: `React Error Boundary: ${error.message}`,
      stack_trace: error.stack,
      context: advancedErrorLogger.getCurrentContext(),
      metadata: {
        errorId,
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      },
      tags: ['react', 'error_boundary', 'critical']
    });

    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportSent = () => {
    // Log that user reported the error
    advancedErrorLogger.logAdvancedError({
      level: 'info',
      source: 'frontend',
      category: 'user_action',
      message: 'User reported error from error boundary',
      context: advancedErrorLogger.getCurrentContext(),
      metadata: {
        errorId: this.state.errorId,
        userReported: true
      },
      tags: ['user_action', 'error_report']
    });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-destructive/10">
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-xl">Что-то пошло не так</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Произошла неожиданная ошибка. Мы уже получили уведомление и работаем над исправлением.
              </p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Error ID for support */}
              {this.state.errorId && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">ID ошибки для поддержки:</p>
                  <p className="text-sm font-mono">{this.state.errorId}</p>
                </div>
              )}

              {/* Error details in development */}
              {process.env.NODE_ENV === 'development' && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground mb-2">
                    Техническая информация (разработка)
                  </summary>
                  <div className="space-y-2">
                    <div className="p-2 bg-muted rounded font-mono">
                      <strong>Error:</strong> {this.state.error?.message}
                    </div>
                    {this.state.error?.stack && (
                      <div className="p-2 bg-muted rounded font-mono text-xs overflow-auto max-h-32">
                        <strong>Stack:</strong>
                        <pre>{this.state.error.stack}</pre>
                      </div>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <div className="p-2 bg-muted rounded font-mono text-xs overflow-auto max-h-32">
                        <strong>Component Stack:</strong>
                        <pre>{this.state.errorInfo.componentStack}</pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  onClick={this.handleRefresh}
                  className="flex-1"
                  variant="default"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Обновить страницу
                </Button>
                <Button 
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  На главную
                </Button>
              </div>

              {/* Report button */}
              <Button 
                onClick={this.handleReportSent}
                variant="ghost" 
                size="sm"
                className="w-full text-xs"
              >
                Сообщить о проблеме
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC для обертывания компонентов
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

// Hook для обработки ошибок в функциональных компонентах
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: any) => {
    advancedErrorLogger.logAdvancedError({
      level: 'error',
      source: 'frontend',
      category: 'component_error',
      message: `Component Error: ${error.message}`,
      stack_trace: error.stack,
      context: advancedErrorLogger.getCurrentContext(),
      metadata: {
        errorInfo,
        component: true
      },
      tags: ['react', 'component_error']
    });
  }, []);
}