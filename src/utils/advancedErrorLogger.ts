import { supabase } from '@/integrations/supabase/client';

export interface ErrorContext {
  url: string;
  userAgent: string;
  userId?: string;
  sessionId: string;
  timestamp: number;
  route: string;
  previousRoute?: string;
  userActions: UserAction[];
  browserInfo: BrowserInfo;
  performanceMetrics: PerformanceMetrics;
  networkInfo: NetworkInfo;
}

export interface UserAction {
  type: 'click' | 'navigation' | 'form_submit' | 'api_call' | 'error' | 'visibility_change';
  target?: string;
  timestamp: number;
  data?: any;
}

export interface BrowserInfo {
  vendor: string;
  version: string;
  platform: string;
  language: string;
  cookieEnabled: boolean;
  onLine: boolean;
  screen: {
    width: number;
    height: number;
    colorDepth: number;
  };
  viewport: {
    width: number;
    height: number;
  };
}

export interface PerformanceMetrics {
  memoryUsage?: any;
  connectionType?: string;
  loadTime?: number;
  domContentLoaded?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
}

export interface NetworkInfo {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export interface AdvancedErrorEntry {
  id?: string;
  level: 'critical' | 'error' | 'warning' | 'info' | 'performance';
  source: 'frontend' | 'backend' | 'database' | 'payment' | 'auth' | 'network' | 'user_action' | 'performance' | 'security';
  category: string;
  message: string;
  stack_trace?: string;
  context: ErrorContext;
  metadata?: any;
  tags?: string[];
  fingerprint?: string; // для дедупликации
  occurrences?: number;
  first_seen?: string;
  last_seen?: string;
  is_resolved?: boolean;
}

class AdvancedErrorLogger {
  private static instance: AdvancedErrorLogger;
  private isInitialized = false;
  private userActions: UserAction[] = [];
  private sessionId: string;
  private currentRoute: string = '';
  private previousRoute?: string;
  private errorQueue: AdvancedErrorEntry[] = [];
  private isProcessingQueue = false;
  private duplicateFilter = new Map<string, number>();

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeAdvancedErrorHandlers();
    this.startUserActionTracking();
    this.startPerformanceMonitoring();
  }

  public static getInstance(): AdvancedErrorLogger {
    if (!AdvancedErrorLogger.instance) {
      AdvancedErrorLogger.instance = new AdvancedErrorLogger();
    }
    return AdvancedErrorLogger.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeAdvancedErrorHandlers() {
    if (this.isInitialized || typeof window === 'undefined') return;

    // Global JavaScript errors
    window.addEventListener('error', (event) => {
      this.logAdvancedError({
        level: 'error',
        source: 'frontend',
        category: 'javascript_error',
        message: `JavaScript Error: ${event.message}`,
        stack_trace: event.error?.stack,
        context: this.getCurrentContext(),
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error?.toString()
        },
        tags: ['javascript', 'runtime_error']
      });
    });

    // Unhandled Promise Rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logAdvancedError({
        level: 'error',
        source: 'frontend',
        category: 'promise_rejection',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        context: this.getCurrentContext(),
        metadata: {
          reason: event.reason,
          promise: event.promise
        },
        tags: ['promise', 'async_error']
      });
    });

    // Console errors override
    this.interceptConsole();

    // Network errors
    this.interceptFetch();
    this.interceptXHR();

    // React Router errors (if applicable)
    this.trackRouteChanges();

    // Performance issues
    this.trackPerformanceIssues();

    // Visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
      this.trackUserAction('visibility_change', document.hidden ? 'hidden' : 'visible');
    });

    this.isInitialized = true;
  }

  private startUserActionTracking() {
    // Track clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      this.trackUserAction('click', this.getElementSelector(target), {
        tagName: target.tagName,
        className: target.className,
        id: target.id,
        innerText: target.innerText?.substring(0, 100)
      });
    });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      this.trackUserAction('form_submit', this.getElementSelector(form), {
        action: form.action,
        method: form.method,
        elements: form.elements.length
      });
    });

    // Track navigation
    window.addEventListener('popstate', () => {
      this.trackUserAction('navigation', 'popstate', {
        url: window.location.href,
        state: history.state
      });
    });
  }

  private startPerformanceMonitoring() {
    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
          this.logAdvancedError({
            level: 'warning',
            source: 'performance',
            category: 'memory_usage',
            message: 'High memory usage detected',
            context: this.getCurrentContext(),
            metadata: {
              usedJSHeapSize: memory.usedJSHeapSize,
              totalJSHeapSize: memory.totalJSHeapSize,
              jsHeapSizeLimit: memory.jsHeapSizeLimit
            },
            tags: ['performance', 'memory']
          });
        }
      }, 30000);
    }

    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // Long task > 50ms
              this.logAdvancedError({
                level: 'performance',
                source: 'performance',
                category: 'long_task',
                message: `Long task detected: ${entry.duration}ms`,
                context: this.getCurrentContext(),
                metadata: {
                  duration: entry.duration,
                  startTime: entry.startTime,
                  name: entry.name
                },
                tags: ['performance', 'long_task']
              });
            }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.warn('PerformanceObserver not supported');
      }
    }
  }

  private interceptConsole() {
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args) => {
      originalError.apply(console, args);
      
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      this.logAdvancedError({
        level: 'error',
        source: 'frontend',
        category: 'console_error',
        message: `Console Error: ${message}`,
        context: this.getCurrentContext(),
        metadata: { args },
        tags: ['console', 'error']
      });
    };

    console.warn = (...args) => {
      originalWarn.apply(console, args);
      
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      this.logAdvancedError({
        level: 'warning',
        source: 'frontend',
        category: 'console_warning',
        message: `Console Warning: ${message}`,
        context: this.getCurrentContext(),
        metadata: { args },
        tags: ['console', 'warning']
      });
    };
  }

  private interceptFetch() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        
        // Log slow requests
        if (endTime - startTime > 5000) {
          this.logAdvancedError({
            level: 'warning',
            source: 'network',
            category: 'slow_request',
            message: `Slow network request: ${endTime - startTime}ms`,
            context: this.getCurrentContext(),
            metadata: {
              url: args[0],
              duration: endTime - startTime,
              status: response.status
            },
            tags: ['network', 'performance', 'slow_request']
          });
        }

        // Log HTTP errors
        if (!response.ok) {
          this.logAdvancedError({
            level: response.status >= 500 ? 'error' : 'warning',
            source: 'network',
            category: 'http_error',
            message: `HTTP ${response.status}: ${response.statusText}`,
            context: this.getCurrentContext(),
            metadata: {
              url: args[0],
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries())
            },
            tags: ['network', 'http_error', `status_${response.status}`]
          });
        }

        return response;
      } catch (error) {
        const endTime = performance.now();
        this.logAdvancedError({
          level: 'error',
          source: 'network',
          category: 'network_error',
          message: `Network Error: ${error}`,
          context: this.getCurrentContext(),
          metadata: {
            url: args[0],
            duration: endTime - startTime,
            error: error instanceof Error ? error.message : String(error)
          },
          tags: ['network', 'fetch_error']
        });
        throw error;
      }
    };
  }

  private interceptXHR() {
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._errorLogger = { method, url, startTime: 0 };
      return originalXHROpen.call(this, method, url, ...args);
    };

    XMLHttpRequest.prototype.send = function(...args) {
      if (this._errorLogger) {
        this._errorLogger.startTime = performance.now();
        
        this.addEventListener('error', () => {
          AdvancedErrorLogger.getInstance().logAdvancedError({
            level: 'error',
            source: 'network',
            category: 'xhr_error',
            message: `XHR Error: ${this._errorLogger.method} ${this._errorLogger.url}`,
            context: AdvancedErrorLogger.getInstance().getCurrentContext(),
            metadata: {
              method: this._errorLogger.method,
              url: this._errorLogger.url,
              status: this.status,
              statusText: this.statusText
            },
            tags: ['network', 'xhr_error']
          });
        });

        this.addEventListener('load', () => {
          const endTime = performance.now();
          const duration = endTime - this._errorLogger.startTime;
          
          if (this.status >= 400) {
            AdvancedErrorLogger.getInstance().logAdvancedError({
              level: this.status >= 500 ? 'error' : 'warning',
              source: 'network',
              category: 'xhr_http_error',
              message: `XHR HTTP ${this.status}: ${this.statusText}`,
              context: AdvancedErrorLogger.getInstance().getCurrentContext(),
              metadata: {
                method: this._errorLogger.method,
                url: this._errorLogger.url,
                status: this.status,
                statusText: this.statusText,
                duration
              },
              tags: ['network', 'xhr_error', `status_${this.status}`]
            });
          }
        });
      }
      
      return originalXHRSend.call(this, ...args);
    };
  }

  private trackRouteChanges() {
    // Track route changes for SPAs
    const observer = new MutationObserver(() => {
      const newRoute = window.location.pathname + window.location.search;
      if (newRoute !== this.currentRoute) {
        this.previousRoute = this.currentRoute;
        this.currentRoute = newRoute;
        this.trackUserAction('navigation', 'route_change', {
          from: this.previousRoute,
          to: this.currentRoute
        });
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private trackPerformanceIssues() {
    // Track Core Web Vitals
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint' && entry.startTime > 2500) {
              this.logAdvancedError({
                level: 'warning',
                source: 'performance',
                category: 'poor_lcp',
                message: `Poor Largest Contentful Paint: ${entry.startTime}ms`,
                context: this.getCurrentContext(),
                metadata: {
                  value: entry.startTime,
                  threshold: 2500
                },
                tags: ['performance', 'core_web_vitals', 'lcp']
              });
            }
          }
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('Performance observation not supported');
      }
    }
  }

  public getCurrentContext(): ErrorContext {
    return {
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      route: this.currentRoute,
      previousRoute: this.previousRoute,
      userActions: this.userActions.slice(-10), // Last 10 actions
      browserInfo: this.getBrowserInfo(),
      performanceMetrics: this.getPerformanceMetrics(),
      networkInfo: this.getNetworkInfo()
    };
  }

  private getBrowserInfo(): BrowserInfo {
    return {
      vendor: navigator.vendor,
      version: navigator.appVersion,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  }

  private getPerformanceMetrics(): PerformanceMetrics {
    const metrics: PerformanceMetrics = {};
    
    if ('memory' in performance) {
      metrics.memoryUsage = (performance as any).memory;
    }
    
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      metrics.connectionType = connection.effectiveType;
    }

    if (performance.timing) {
      metrics.loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      metrics.domContentLoaded = performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart;
    }

    return metrics;
  }

  private getNetworkInfo(): NetworkInfo {
    const info: NetworkInfo = {};
    
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      info.effectiveType = connection.effectiveType;
      info.downlink = connection.downlink;
      info.rtt = connection.rtt;
      info.saveData = connection.saveData;
    }
    
    return info;
  }

  private trackUserAction(type: UserAction['type'], target?: string, data?: any) {
    const action: UserAction = {
      type,
      target,
      timestamp: Date.now(),
      data
    };
    
    this.userActions.push(action);
    
    // Keep only last 50 actions
    if (this.userActions.length > 50) {
      this.userActions = this.userActions.slice(-50);
    }
  }

  private getElementSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }

  private generateFingerprint(error: AdvancedErrorEntry): string {
    const key = `${error.source}_${error.category}_${error.message}_${error.context.route}`;
    return btoa(key).substring(0, 16);
  }

  public async logAdvancedError(error: AdvancedErrorEntry): Promise<void> {
    try {
      // Generate fingerprint for deduplication
      error.fingerprint = this.generateFingerprint(error);
      
      // Check for duplicates
      const count = this.duplicateFilter.get(error.fingerprint) || 0;
      if (count > 5) return; // Skip if we've seen this error too many times
      
      this.duplicateFilter.set(error.fingerprint, count + 1);
      
      // Add user context
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        error.context.userId = user.id;
      }

      // Add to queue
      this.errorQueue.push(error);
      
      // Process queue
      this.processErrorQueue();
      
    } catch (e) {
      console.warn('Failed to log advanced error:', e);
    }
  }

  private async processErrorQueue() {
    if (this.isProcessingQueue || this.errorQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    
    try {
      const errors = this.errorQueue.splice(0, 10); // Process up to 10 errors at once
      
      for (const error of errors) {
        await supabase.functions.invoke('admin-logs', {
          body: {
            action: 'create',
            level: error.level,
            source: error.source,
            category: error.category,
            message: error.message,
            user_id: error.context.userId,
            metadata: {
              ...error.metadata,
              context: error.context,
              tags: error.tags,
              fingerprint: error.fingerprint
            },
            stack_trace: error.stack_trace
          }
        });
      }
    } catch (e) {
      console.warn('Failed to process error queue:', e);
    } finally {
      this.isProcessingQueue = false;
      
      // Process remaining errors if any
      if (this.errorQueue.length > 0) {
        setTimeout(() => this.processErrorQueue(), 1000);
      }
    }
  }

  // Convenient methods for specific error types
  public logPaymentError(provider: string, operation: string, error: any, metadata?: any) {
    this.logAdvancedError({
      level: 'critical',
      source: 'payment',
      category: 'payment_error',
      message: `Payment Error (${provider}): ${operation} - ${error.message}`,
      context: this.getCurrentContext(),
      metadata: {
        provider,
        operation,
        error_type: error.type,
        error_code: error.code,
        ...metadata
      },
      tags: ['payment', provider, operation]
    });
  }

  public logAuthError(operation: string, error: any, metadata?: any) {
    this.logAdvancedError({
      level: 'warning',
      source: 'auth',
      category: 'auth_error',
      message: `Auth Error: ${operation} - ${error.message}`,
      context: this.getCurrentContext(),
      metadata: {
        operation,
        error_code: error.code,
        ...metadata
      },
      tags: ['auth', operation]
    });
  }

  public logSupabaseError(operation: string, error: any, metadata?: any) {
    this.logAdvancedError({
      level: 'error',
      source: 'database',
      category: 'supabase_error',
      message: `Supabase Error: ${operation} - ${error.message}`,
      context: this.getCurrentContext(),
      metadata: {
        operation,
        error_code: error.code,
        error_details: error.details,
        hint: error.hint,
        ...metadata
      },
      tags: ['supabase', 'database', operation]
    });
  }

  public logSecurityEvent(eventType: string, details: any) {
    this.logAdvancedError({
      level: 'critical',
      source: 'security',
      category: 'security_event',
      message: `Security Event: ${eventType}`,
      context: this.getCurrentContext(),
      metadata: details,
      tags: ['security', eventType]
    });
  }

  public setCurrentRoute(route: string) {
    this.previousRoute = this.currentRoute;
    this.currentRoute = route;
  }
}

// Export singleton instance
export const advancedErrorLogger = AdvancedErrorLogger.getInstance();

// Export convenience functions
export const logAdvancedError = (error: Partial<AdvancedErrorEntry>) => 
  advancedErrorLogger.logAdvancedError(error as AdvancedErrorEntry);

export const logPaymentError = (provider: string, operation: string, error: any, metadata?: any) => 
  advancedErrorLogger.logPaymentError(provider, operation, error, metadata);

export const logAuthError = (operation: string, error: any, metadata?: any) => 
  advancedErrorLogger.logAuthError(operation, error, metadata);

export const logSupabaseError = (operation: string, error: any, metadata?: any) => 
  advancedErrorLogger.logSupabaseError(operation, error, metadata);

export const logSecurityEvent = (eventType: string, details: any) => 
  advancedErrorLogger.logSecurityEvent(eventType, details);
