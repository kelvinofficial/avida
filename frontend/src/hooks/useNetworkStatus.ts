import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string | null;
  isOffline: boolean;
}

/**
 * Custom hook for monitoring network connectivity status
 * Provides real-time network state updates for offline support
 */
export const useNetworkStatus = (): NetworkStatus => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    connectionType: null,
    isOffline: false,
  });

  useEffect(() => {
    // For web platform, use navigator.onLine
    if (Platform.OS === 'web') {
      const handleOnline = () => {
        setNetworkStatus({
          isConnected: true,
          isInternetReachable: true,
          connectionType: 'wifi',
          isOffline: false,
        });
      };

      const handleOffline = () => {
        setNetworkStatus({
          isConnected: false,
          isInternetReachable: false,
          connectionType: null,
          isOffline: true,
        });
      };

      // Set initial state
      if (typeof navigator !== 'undefined') {
        setNetworkStatus({
          isConnected: navigator.onLine,
          isInternetReachable: navigator.onLine,
          connectionType: navigator.onLine ? 'wifi' : null,
          isOffline: !navigator.onLine,
        });
      }

      if (typeof window !== 'undefined') {
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        };
      }
      return;
    }

    // For native platforms, dynamically import NetInfo
    let unsubscribe: (() => void) | undefined;
    
    const setupNetInfo = async () => {
      try {
        const NetInfo = require('@react-native-community/netinfo').default;
        
        unsubscribe = NetInfo.addEventListener((state: any) => {
          setNetworkStatus({
            isConnected: state.isConnected ?? false,
            isInternetReachable: state.isInternetReachable,
            connectionType: state.type,
            isOffline: !state.isConnected,
          });
        });

        // Get initial state
        const state = await NetInfo.fetch();
        setNetworkStatus({
          isConnected: state.isConnected ?? false,
          isInternetReachable: state.isInternetReachable,
          connectionType: state.type,
          isOffline: !state.isConnected,
        });
      } catch (error) {
        console.warn('NetInfo not available:', error);
      }
    };

    setupNetInfo();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return networkStatus;
};

export default useNetworkStatus;
