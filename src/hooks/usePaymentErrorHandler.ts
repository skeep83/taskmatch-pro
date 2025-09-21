import { useCallback } from 'react';
import { advancedErrorLogger } from '@/utils/advancedErrorLogger';

interface PaymentError {
  code?: string;
  type?: string;
  message: string;
  decline_code?: string;
  param?: string;
  payment_intent?: any;
  payment_method?: any;
}

export function usePaymentErrorHandler() {
  const handlePaymentError = useCallback((
    provider: 'stripe' | 'paypal' | 'adyen' | 'other',
    operation: string,
    error: PaymentError,
    metadata?: any
  ) => {
    let level: 'critical' | 'error' | 'warning' = 'error';
    
    // Classify error severity
    if (error.code === 'card_declined' || error.decline_code) {
      level = 'warning'; // User's card issue, not system critical
    } else if (error.type === 'api_connection_error' || error.type === 'api_error') {
      level = 'critical'; // Provider API issues
    } else if (error.code === 'payment_intent_authentication_failure') {
      level = 'warning'; // User authentication issue
    }

    advancedErrorLogger.logPaymentError(provider, operation, error, {
      ...metadata,
      severity: level,
      errorClassification: {
        isUserError: ['card_declined', 'insufficient_funds', 'expired_card'].includes(error.code || ''),
        isSystemError: ['api_error', 'api_connection_error', 'processing_error'].includes(error.type || ''),
        isSecurityError: error.message?.toLowerCase().includes('fraud') || error.message?.toLowerCase().includes('security')
      }
    });

    return error;
  }, []);

  const wrapPaymentCall = useCallback(async <T>(
    provider: 'stripe' | 'paypal' | 'adyen' | 'other',
    operation: string,
    paymentCall: () => Promise<T>,
    metadata?: any
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await paymentCall();
      const endTime = performance.now();
      
      // Log successful payment operations
      advancedErrorLogger.logAdvancedError({
        level: 'info',
        source: 'payment',
        category: 'payment_success',
        message: `Payment Success: ${provider} ${operation}`,
        context: advancedErrorLogger.getCurrentContext(),
        metadata: {
          provider,
          operation,
          duration: endTime - startTime,
          ...metadata
        },
        tags: ['payment', 'success', provider, operation]
      });
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      
      handlePaymentError(provider, operation, error as PaymentError, {
        ...metadata,
        duration: endTime - startTime
      });
      
      throw error;
    }
  }, [handlePaymentError]);

  const logPaymentSecurityEvent = useCallback((
    eventType: 'fraud_attempt' | 'suspicious_activity' | 'multiple_failed_attempts' | 'unusual_pattern',
    details: any
  ) => {
    advancedErrorLogger.logSecurityEvent(`payment_${eventType}`, {
      ...details,
      category: 'payment_security',
      risk_level: 'high'
    });
  }, []);

  return {
    handlePaymentError,
    wrapPaymentCall,
    logPaymentSecurityEvent
  };
}