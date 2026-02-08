import { useState, useEffect, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  isRegistered: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    expoPushToken: null,
    notification: null,
    isRegistered: false,
    error: null,
  });
  
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  // Register for push notifications
  const registerForPushNotifications = useCallback(async () => {
    if (!Device.isDevice) {
      setState(prev => ({ ...prev, error: 'Push notifications require a physical device' }));
      return null;
    }

    try {
      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        setState(prev => ({ ...prev, error: 'Permission for push notifications was denied' }));
        return null;
      }

      // Get the Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID || undefined,
      });

      const token = tokenData.data;

      // Configure Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2E7D32',
        });

        // Create channels for different notification types
        await Notifications.setNotificationChannelAsync('messages', {
          name: 'Messages',
          description: 'Notifications for new messages',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
        });

        await Notifications.setNotificationChannelAsync('offers', {
          name: 'Offers',
          description: 'Notifications for new offers',
          importance: Notifications.AndroidImportance.HIGH,
        });

        await Notifications.setNotificationChannelAsync('listings', {
          name: 'Listings',
          description: 'Notifications for listing updates',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      setState(prev => ({ ...prev, expoPushToken: token, isRegistered: true, error: null }));
      return token;
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message || 'Failed to register for push notifications' }));
      return null;
    }
  }, []);

  // Send token to backend
  const sendTokenToBackend = useCallback(async (token: string) => {
    if (!isAuthenticated || !token) return;

    try {
      await api.put('/settings/push-token', { push_token: token });
    } catch (error) {
      console.error('Failed to send push token to backend:', error);
    }
  }, [isAuthenticated]);

  // Handle notification response (when user taps notification)
  const handleNotificationResponse = useCallback((response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;
    
    if (!data) return;

    // Navigate based on notification type
    if (data.type === 'badge_earned') {
      // Badge notification - go to profile to see badges
      router.push('/profile');
    } else if (data.type?.startsWith('engagement_')) {
      // Engagement notifications - go to performance screen
      if (data.listing_id) {
        router.push(`/performance/${data.listing_id}`);
      }
    } else if (data.listing_id) {
      router.push(`/listing/${data.listing_id}`);
    } else if (data.conversation_id) {
      router.push(`/chat/${data.conversation_id}`);
    } else if (data.property_id) {
      router.push(`/property/${data.property_id}`);
    } else if (data.auto_id) {
      router.push(`/auto/${data.auto_id}`);
    } else if (data.type === 'security_alert') {
      router.push('/settings');
    } else if (data.type === 'offer_received' || data.type === 'offer_accepted') {
      router.push('/profile/my-listings');
    }
  }, [router]);

  // Initialize push notifications
  useEffect(() => {
    registerForPushNotifications().then(token => {
      if (token && isAuthenticated) {
        sendTokenToBackend(token);
      }
    });

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setState(prev => ({ ...prev, notification }));
    });

    // Listen for notification responses
    responseListener.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [registerForPushNotifications, sendTokenToBackend, handleNotificationResponse, isAuthenticated]);

  // Re-send token when user logs in
  useEffect(() => {
    if (isAuthenticated && state.expoPushToken) {
      sendTokenToBackend(state.expoPushToken);
    }
  }, [isAuthenticated, state.expoPushToken, sendTokenToBackend]);

  // Schedule local notification
  const scheduleNotification = async (
    title: string,
    body: string,
    data?: Record<string, any>,
    seconds: number = 1
  ) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: { seconds },
    });
  };

  // Get badge count
  const getBadgeCount = async () => {
    return await Notifications.getBadgeCountAsync();
  };

  // Set badge count
  const setBadgeCount = async (count: number) => {
    await Notifications.setBadgeCountAsync(count);
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    await Notifications.dismissAllNotificationsAsync();
    await setBadgeCount(0);
  };

  return {
    ...state,
    registerForPushNotifications,
    scheduleNotification,
    getBadgeCount,
    setBadgeCount,
    clearAllNotifications,
  };
}

export default usePushNotifications;
