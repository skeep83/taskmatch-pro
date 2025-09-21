import { useCallback } from 'react';
import { advancedErrorLogger } from '@/utils/advancedErrorLogger';
import { PostgrestError, AuthError } from '@supabase/supabase-js';

export function useSupabaseErrorHandler() {
  const handleError = useCallback((operation: string, error: PostgrestError | AuthError | any, metadata?: any) => {
    // Determine error severity
    let level: 'critical' | 'error' | 'warning' = 'error';
    
    if (error?.code === 'PGRST116' || error?.code === '23505') {
      level = 'warning'; // Constraint violations, not critical
    } else if (error?.code?.startsWith('42')) {
      level = 'critical'; // SQL syntax errors, schema issues
    } else if (error?.message?.includes('JWT') || error?.message?.includes('token')) {
      level = 'warning'; // Auth token issues
    }

    advancedErrorLogger.logSupabaseError(operation, error, {
      ...metadata,
      severity: level,
      timestamp: Date.now()
    });

    return error;
  }, []);

  const handleAuthError = useCallback((operation: string, error: AuthError | any, metadata?: any) => {
    advancedErrorLogger.logAuthError(operation, error, {
      ...metadata,
      timestamp: Date.now()
    });

    return error;
  }, []);

  const wrapSupabaseCall = useCallback(async <T>(
    operation: string,
    supabaseCall: () => Promise<{ data: T; error: PostgrestError | null }>,
    metadata?: any
  ) => {
    try {
      const result = await supabaseCall();
      
      if (result.error) {
        handleError(operation, result.error, metadata);
      }
      
      return result;
    } catch (error) {
      handleError(operation, error, metadata);
      throw error;
    }
  }, [handleError]);

  const wrapAuthCall = useCallback(async <T>(
    operation: string,
    authCall: () => Promise<{ data: T; error: AuthError | null }>,
    metadata?: any
  ) => {
    try {
      const result = await authCall();
      
      if (result.error) {
        handleAuthError(operation, result.error, metadata);
      }
      
      return result;
    } catch (error) {
      handleAuthError(operation, error, metadata);
      throw error;
    }
  }, [handleAuthError]);

  return {
    handleError,
    handleAuthError,
    wrapSupabaseCall,
    wrapAuthCall
  };
}