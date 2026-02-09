import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api from './api';
import { useAuthStore } from '../store/authStore';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  deep_link?: string;
  notification_id?: string;
  listing_id?: string;
  conversation_id?: string;
  user_id?: string;
  trigger_type?: string;
}

/**
 * Hook to handle push notification deep linking
 * Call this in the root layout to enable notification-based navigation
 */
export function useNotificationDeepLinking() {
  const router = useRouter();
  const { isAuthenticated, token } = useAuthStore();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Handle notification received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received in foreground:', notification);
        // Could show a custom in-app notification banner here
      }
    );

    // Handle user tapping on a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        console.log('User interacted with notification:', response);
        
        const data = response.notification.request.content.data as NotificationData;
        
        // Track notification click for analytics
        if (data.notification_id && isAuthenticated && token) {
          try {
            await api.post(`/smart-notifications/track/click/${data.notification_id}`);
          } catch (error) {
            console.log('Failed to track notification click:', error);
          }
        }
        
        // Handle deep link navigation
        handleDeepLink(data);
      }
    );

    // Handle notification when app was killed and user taps notification (cold start)
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        console.log('App opened from notification (cold start):', response);
        const data = response.notification.request.content.data as NotificationData;
        
        // Small delay to ensure navigation is ready
        setTimeout(() => {
          handleDeepLink(data);
        }, 500);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [isAuthenticated, token]);

  const handleDeepLink = (data: NotificationData) => {
    if (!data) return;

    const { deep_link, listing_id, conversation_id, user_id, trigger_type } = data;

    // Priority: explicit deep_link > specific IDs
    if (deep_link) {
      // Parse the deep link path
      const path = deep_link.startsWith('/') ? deep_link : `/${deep_link}`;
      
      if (path.startsWith('/listing/')) {
        const id = path.replace('/listing/', '');
        router.push({ pathname: '/listing/[id]', params: { id } });
      } else if (path.startsWith('/chat/')) {
        const id = path.replace('/chat/', '');
        router.push({ pathname: '/chat/[id]', params: { id } });
      } else if (path.startsWith('/user/') || path.startsWith('/profile/')) {
        const id = path.replace(/^\/(user|profile)\//, '');
        router.push({ pathname: '/seller/[id]', params: { id } });
      } else {
        // Try to navigate to the path directly
        try {
          router.push(path as any);
        } catch (error) {
          console.log('Could not navigate to:', path);
        }
      }
      return;
    }

    // Fallback to specific IDs
    if (listing_id) {
      router.push({ pathname: '/listing/[id]', params: { id: listing_id } });
      return;
    }

    if (conversation_id) {
      router.push({ pathname: '/chat/[id]', params: { id: conversation_id } });
      return;
    }

    if (user_id) {
      router.push({ pathname: '/seller/[id]', params: { id: user_id } });
      return;
    }

    // Navigate based on trigger type
    switch (trigger_type) {
      case 'new_listing_in_category':
      case 'similar_listing_alert':
        router.push('/(tabs)/explore');
        break;
      case 'price_drop_saved_item':
        router.push('/(tabs)/favorites');
        break;
      case 'message_received':
      case 'seller_reply':
        router.push('/(tabs)/inbox');
        break;
      case 'weekly_digest':
        router.push('/(tabs)');
        break;
      default:
        // Default to home
        console.log('No specific navigation for trigger:', trigger_type);
    }
  };

  return { handleDeepLink };
}

/**
 * Register for push notifications and send token to backend
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  try {
    // Check permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PROJECT_ID,
    });
    const pushToken = tokenData.data;

    console.log('Expo Push Token:', pushToken);

    // Send token to backend
    try {
      await api.post('/users/settings', {
        push_token: pushToken,
        push_enabled: true,
        platform: Platform.OS,
      });
      console.log('Push token registered with backend');
    } catch (error) {
      console.log('Failed to register push token with backend:', error);
    }

    // Set up notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2E7D32',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('listings', {
        name: 'Listings',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('promotions', {
        name: 'Promotions',
        importance: Notifications.AndroidImportance.LOW,
      });
    }

    return pushToken;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Track conversion when user completes an action after clicking a notification
 */
export async function trackNotificationConversion(
  notificationId: string,
  conversionType: 'purchase' | 'message_sent' | 'listing_saved' | 'profile_view',
  conversionValue?: number,
  entityId?: string
): Promise<boolean> {
  try {
    await api.post(`/smart-notifications/track/conversion/${notificationId}`, {
      conversion_type: conversionType,
      conversion_value: conversionValue,
      entity_id: entityId,
    });
    return true;
  } catch (error) {
    console.log('Failed to track conversion:', error);
    return false;
  }
}

/**
 * Get the notification that opened the app (for cold start analytics)
 */
export async function getInitialNotification(): Promise<NotificationData | null> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (response) {
      return response.notification.request.content.data as NotificationData;
    }
    return null;
  } catch (error) {
    console.log('Error getting initial notification:', error);
    return null;
  }
}

/**
 * Schedule a local notification (for testing or reminders)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: NotificationData,
  triggerSeconds?: number
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: 'default',
    },
    trigger: triggerSeconds
      ? { seconds: triggerSeconds }
      : null, // null means immediate
  });
  return id;
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<boolean> {
  return await Notifications.setBadgeCountAsync(count);
}
