import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { FavoriteToast } from './FavoriteToast';
import { useAuthStore } from '../../store/authStore';

interface FavoriteNotification {
  userName: string;
  listingTitle: string;
  listingId: string;
}

interface FavoriteNotificationContextType {
  showNotification: (notification: FavoriteNotification) => void;
}

const FavoriteNotificationContext = createContext<FavoriteNotificationContextType>({
  showNotification: () => {},
});

export const useFavoriteNotification = () => useContext(FavoriteNotificationContext);

interface Props {
  children: React.ReactNode;
}

export const FavoriteNotificationProvider: React.FC<Props> = ({ children }) => {
  const { isAuthenticated, user, token } = useAuthStore();
  const [notification, setNotification] = useState<FavoriteNotification | null>(null);
  const [visible, setVisible] = useState(false);
  const socketRef = useRef<any>(null);
  const notificationQueue = useRef<FavoriteNotification[]>([]);

  // Process notification queue
  const processQueue = useCallback(() => {
    if (notificationQueue.current.length > 0 && !visible) {
      const nextNotification = notificationQueue.current.shift();
      if (nextNotification) {
        setNotification(nextNotification);
        setVisible(true);
      }
    }
  }, [visible]);

  // Show notification function
  const showNotification = useCallback((newNotification: FavoriteNotification) => {
    if (visible) {
      // Queue the notification if one is already showing
      notificationQueue.current.push(newNotification);
    } else {
      setNotification(newNotification);
      setVisible(true);
    }
  }, [visible]);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    setVisible(false);
    setNotification(null);
    // Process next notification in queue after a short delay
    setTimeout(processQueue, 300);
  }, [processQueue]);

  // Connect to WebSocket when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    const connectWebSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
        
        const socket = io(BACKEND_URL, {
          transports: ['websocket'],
          auth: { token }
        });

        socket.on('connect', () => {
          console.log('[FavoriteNotification] WebSocket connected');
          // Subscribe to stats updates (required for receiving favorite notifications)
          socket.emit('subscribe_stats', { user_id: user.user_id });
        });

        socket.on('new_favorite', (data: { user_name: string; listing_title: string; listing_id: string }) => {
          console.log('[FavoriteNotification] Received new favorite:', data);
          showNotification({
            userName: data.user_name,
            listingTitle: data.listing_title,
            listingId: data.listing_id,
          });
        });

        socket.on('disconnect', () => {
          console.log('[FavoriteNotification] WebSocket disconnected');
        });

        socketRef.current = socket;
      } catch (error) {
        console.error('[FavoriteNotification] WebSocket connection error:', error);
      }
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('unsubscribe_stats', { user_id: user.user_id });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, user, token, showNotification]);

  return (
    <FavoriteNotificationContext.Provider value={{ showNotification }}>
      {children}
      {notification && (
        <FavoriteToast
          visible={visible}
          userName={notification.userName}
          listingTitle={notification.listingTitle}
          onDismiss={handleDismiss}
          duration={4000}
        />
      )}
    </FavoriteNotificationContext.Provider>
  );
};

export default FavoriteNotificationProvider;
