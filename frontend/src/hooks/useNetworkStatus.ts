import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

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
      setNetworkStatus({
        isConnected: navigator.onLine,
        isInternetReachable: navigator.onLine,
        connectionType: navigator.onLine ? 'wifi' : null,
        isOffline: !navigator.onLine,
      });

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    // For native platforms, use NetInfo
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setNetworkStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type,
        isOffline: !state.isConnected,
      });
    });

    // Get initial state
    NetInfo.fetch().then((state: NetInfoState) => {
      setNetworkStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type,
        isOffline: !state.isConnected,
      });
    });

    return () => unsubscribe();
  }, []);

  return networkStatus;
};

export default useNetworkStatus;
