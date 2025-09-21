import { supabase } from '@/integrations/supabase/client';

export interface ErrorLogEntry {
  level: 'critical' | 'error' | 'warning' | 'info';
  source: string;
  message: string;
  metadata?: any;
  stack_trace?: string;
  user_id?: string;
}

class ErrorLogger {
  private static instance: ErrorLogger;
  private isInitialized = false;

  private constructor() {
    this.initializeGlobalErrorHandlers();
  }

  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  private initializeGlobalErrorHandlers() {
    if (this.isInitialized || typeof window === 'undefined') return;

    // Global error handler for JavaScript errors
    window.addEventListener('error', (event) => {
      this.logError({
        level: 'error',
        source: 'frontend',
        message: `JavaScript Error: ${event.message}`,
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          type: 'javascript_error'
        },
        stack_trace: event.error?.stack
      });
    });

    // Global handler for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        level: 'error',
        source: 'frontend',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        metadata: {
          type: 'promise_rejection',
          reason: event.reason
        }
      });
    });

    // Console error override
    const originalConsoleError = console.error;
    console.error = (...args) => {
      originalConsoleError.apply(console, args);
      
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      this.logError({
        level: 'error',
        source: 'frontend',
        message: `Console Error: ${message}`,
        metadata: {
          type: 'console_error',
          args: args
        }
      });
    };

    this.isInitialized = true;
  }

  public async logError(entry: ErrorLogEntry): Promise<void> {
    try {
      // Get current user if available
      const { data: { user } } = await supabase.auth.getUser();
      
      // Add user_id if available
      if (user && !entry.user_id) {
        entry.user_id = user.id;
      }

      // Send to admin-logs function
      const { error } = await supabase.functions.invoke('admin-logs', {
        body: {
          action: 'create',
          ...entry
        }
      });

      if (error) {
        console.warn('Failed to log error to database:', error);
      }
    } catch (err) {
      // Fail silently to avoid infinite loops
      console.warn('Error logger failed:', err);
    }
  }

  // Convenience methods
  public logCritical(message: string, source: string, metadata?: any, stack_trace?: string) {
    this.logError({ level: 'critical', source, message, metadata, stack_trace });
  }

  public logWarning(message: string, source: string, metadata?: any) {
    this.logError({ level: 'warning', source, message, metadata });
  }

  public logInfo(message: string, source: string, metadata?: any) {
    this.logError({ level: 'info', source, message, metadata });
  }

  // Log API errors
  public logApiError(response: Response, request: Request, error?: any) {
    this.logError({
      level: response.status >= 500 ? 'error' : 'warning',
      source: 'api',
      message: `API Error: ${response.status} ${response.statusText} - ${request.url}`,
      metadata: {
        status: response.status,
        statusText: response.statusText,
        url: request.url,
        method: request.method,
        error: error?.message
      }
    });
  }

  // Log Supabase errors
  public logSupabaseError(operation: string, error: any, metadata?: any) {
    this.logError({
      level: 'error',
      source: 'supabase',
      message: `Supabase Error in ${operation}: ${error.message}`,
      metadata: {
        operation,
        error_code: error.code,
        error_details: error.details,
        hint: error.hint,
        ...metadata
      }
    });
  }

  // Log payment errors
  public logPaymentError(provider: string, operation: string, error: any, metadata?: any) {
    this.logError({
      level: 'critical',
      source: 'payment',
      message: `Payment Error (${provider}): ${operation} - ${error.message}`,
      metadata: {
        provider,
        operation,
        error_type: error.type,
        error_code: error.code,
        ...metadata
      }
    });
  }

  // Log authentication errors
  public logAuthError(operation: string, error: any, metadata?: any) {
    this.logError({
      level: 'warning',
      source: 'auth',
      message: `Auth Error: ${operation} - ${error.message}`,
      metadata: {
        operation,
        error_code: error.code,
        ...metadata
      }
    });
  }
}

// Export singleton instance
export const errorLogger = ErrorLogger.getInstance();

// Export convenience functions
export const logError = (message: string, source: string, metadata?: any, stack_trace?: string) => 
  errorLogger.logError({ level: 'error', source, message, metadata, stack_trace });

export const logCritical = (message: string, source: string, metadata?: any, stack_trace?: string) => 
  errorLogger.logCritical(message, source, metadata, stack_trace);

export const logWarning = (message: string, source: string, metadata?: any) => 
  errorLogger.logWarning(message, source, metadata);

export const logInfo = (message: string, source: string, metadata?: any) => 
  errorLogger.logInfo(message, source, metadata);