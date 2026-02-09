/**
 * Error Boundary Component
 * =========================
 * Catches React component errors and displays a user-friendly fallback UI
 * with error reference ID for support.
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { handleComponentError } from '../utils/errorLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  referenceId: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      referenceId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      errorMessage: error.message,
    };
  }

  async componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { componentName = 'Unknown', onError } = this.props;
    
    // Log to QA system and get reference ID
    const message = await handleComponentError(error, componentName);
    
    // Extract reference ID from the message
    const refMatch = message.match(/reference: (ERR-[A-Z0-9]+)/);
    
    this.setState({
      errorMessage: message,
      referenceId: refMatch ? refMatch[1] : null,
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Log to console in development
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      errorMessage: '',
      referenceId: null,
    });
  };

  render() {
    const { hasError, errorMessage, referenceId } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>⚠️</Text>
          </View>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            We're sorry, but something unexpected happened.
          </Text>
          {referenceId && (
            <View style={styles.referenceContainer}>
              <Text style={styles.referenceLabel}>Reference ID:</Text>
              <Text style={styles.referenceId}>{referenceId}</Text>
            </View>
          )}
          <Text style={styles.supportText}>
            If this problem persists, please contact support with the reference ID above.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8f9fa',
  },
  iconContainer: {
    marginBottom: 16,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 16,
  },
  referenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginBottom: 16,
  },
  referenceLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginRight: 8,
  },
  referenceId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    fontFamily: 'monospace',
  },
  supportText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 280,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundary;
