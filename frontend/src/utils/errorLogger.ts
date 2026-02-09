/**
 * Frontend Error Logging Service
 * ================================
 * Centralized error logging that sends errors to the backend QA system.
 * Provides user-friendly error messages with reference IDs for support.
 */

import api from './api';
import { Platform } from 'react-native';

type Severity = 'info' | 'warning' | 'critical';

interface ErrorLogPayload {
  category: string;
  feature: string;
  error_type: string;
  message: string;
  severity?: Severity;
  stack_trace?: string;
  user_id?: string;
  session_id?: string;
  endpoint?: string;
}

interface ErrorLogResponse {
  reference_id: string;
}

// Generate a session ID for tracking
let sessionId: string | null = null;

export const getSessionId = (): string => {
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  return sessionId;
};

/**
 * Log an error to the backend QA system
 */
export const logError = async (
  category: string,
  feature: string,
  error: Error | string,
  options: {
    severity?: Severity;
    userId?: string;
    endpoint?: string;
    additionalData?: Record<string, any>;
  } = {}
): Promise<string | null> => {
  try {
    const errorMessage = error instanceof Error ? error.message : error;
    const stackTrace = error instanceof Error ? error.stack : undefined;
    
    const payload: ErrorLogPayload = {
      category,
      feature,
      error_type: error instanceof Error ? error.name : 'Error',
      message: errorMessage,
      severity: options.severity || 'warning',
      stack_trace: stackTrace,
      user_id: options.userId,
      session_id: getSessionId(),
      endpoint: options.endpoint,
    };

    const response = await api.post<ErrorLogResponse>('/qa/errors/log', payload);
    return response.data.reference_id;
  } catch (logError) {
    // Silently fail if logging fails - don't create infinite loops
    console.error('Failed to log error to QA system:', logError);
    return null;
  }
};

/**
 * Log API errors with endpoint information
 */
export const logApiError = async (
  endpoint: string,
  error: Error | any,
  options: {
    userId?: string;
    severity?: Severity;
  } = {}
): Promise<string | null> => {
  const errorMessage = error?.response?.data?.detail || error?.message || 'Unknown API error';
  const statusCode = error?.response?.status;
  
  return logError(
    'api',
    endpoint.split('/')[2] || 'unknown', // Extract feature from endpoint like /api/listings -> listings
    new Error(`${statusCode ? `[${statusCode}] ` : ''}${errorMessage}`),
    {
      severity: statusCode >= 500 ? 'critical' : 'warning',
      endpoint,
      userId: options.userId,
    }
  );
};

/**
 * Log frontend/UI errors
 */
export const logUIError = async (
  component: string,
  error: Error | string,
  options: {
    userId?: string;
    severity?: Severity;
  } = {}
): Promise<string | null> => {
  return logError('frontend', component, error, options);
};

/**
 * Log payment-related errors
 */
export const logPaymentError = async (
  operation: string,
  error: Error | string,
  options: {
    userId?: string;
    orderId?: string;
    amount?: number;
  } = {}
): Promise<string | null> => {
  return logError('payment', operation, error, {
    severity: 'critical',
    userId: options.userId,
  });
};

/**
 * Log authentication errors
 */
export const logAuthError = async (
  operation: string,
  error: Error | string,
  options: {
    userId?: string;
  } = {}
): Promise<string | null> => {
  return logError('auth', operation, error, {
    severity: 'warning',
    userId: options.userId,
  });
};

/**
 * Global error handler for uncaught errors
 */
export const setupGlobalErrorHandler = () => {
  if (Platform.OS === 'web') {
    // Web error handling
    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      logError('frontend', 'global', error || new Error(String(message)), {
        severity: 'critical',
      });
      if (originalOnError) {
        return originalOnError(message, source, lineno, colno, error);
      }
      return false;
    };

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      logError('frontend', 'promise', new Error(event.reason?.message || 'Unhandled Promise Rejection'), {
        severity: 'critical',
      });
    });
  } else {
    // React Native error handling
    const originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      logError('frontend', 'global', error, {
        severity: isFatal ? 'critical' : 'warning',
      });
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });
  }
};

/**
 * Create a user-friendly error message with reference ID
 */
export const createUserFriendlyError = (
  referenceId: string | null,
  defaultMessage: string = 'Something went wrong. Please try again.'
): string => {
  if (referenceId) {
    return `${defaultMessage}\n\nIf the problem persists, please contact support with reference: ${referenceId}`;
  }
  return defaultMessage;
};

/**
 * Error boundary helper for React components
 */
export const handleComponentError = async (
  error: Error,
  componentName: string,
  userId?: string
): Promise<string> => {
  const referenceId = await logUIError(componentName, error, { userId, severity: 'critical' });
  return createUserFriendlyError(
    referenceId,
    'This section encountered an error. Please refresh the page.'
  );
};

export default {
  logError,
  logApiError,
  logUIError,
  logPaymentError,
  logAuthError,
  setupGlobalErrorHandler,
  createUserFriendlyError,
  handleComponentError,
  getSessionId,
};
