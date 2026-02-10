/**
 * Push Notification Service for Expo
 * Handles FCM integration and device token management
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from './api';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request push notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return false;
  }

  return true;
}

/**
 * Get the Expo push token for FCM
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    // Configure Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // Get Expo push token
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID, // Your Expo project ID
    });

    return token.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Get the device push token (FCM token for Android, APNs token for iOS)
 */
export async function getDevicePushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      return null;
    }

    const token = await Notifications.getDevicePushTokenAsync();
    return token.data;
  } catch (error) {
    console.error('Error getting device push token:', error);
    return null;
  }
}

/**
 * Register the push token with the backend
 */
export async function registerPushToken(): Promise<boolean> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return false;
    }

    const token = await getExpoPushToken();
    if (!token) {
      return false;
    }

    const platform = Platform.OS;

    await api.post('/push/register-token', {
      token,
      platform,
    });

    console.log('Push token registered successfully');
    return true;
  } catch (error) {
    console.error('Error registering push token:', error);
    return false;
  }
}

/**
 * Unregister the push token from the backend
 */
export async function unregisterPushToken(): Promise<boolean> {
  try {
    const token = await getExpoPushToken();
    if (!token) {
      return false;
    }

    await api.delete('/push/unregister-token', {
      data: { token },
    });

    console.log('Push token unregistered successfully');
    return true;
  } catch (error) {
    console.error('Error unregistering push token:', error);
    return false;
  }
}

/**
 * Add a listener for incoming notifications
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add a listener for notification responses (when user taps notification)
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Remove a notification listener
 */
export function removeNotificationListener(subscription: Notifications.Subscription): void {
  Notifications.removeNotificationSubscription(subscription);
}

/**
 * Get the last notification response (if app was opened from notification)
 */
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  return await Notifications.getLastNotificationResponseAsync();
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  trigger?: Notifications.NotificationTriggerInput
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: trigger || null, // null = immediate
  });
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Set the badge count (iOS)
 */
export async function setBadgeCount(count: number): Promise<boolean> {
  return await Notifications.setBadgeCountAsync(count);
}

/**
 * Get the current badge count (iOS)
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Dismiss all notifications from the notification center
 */
export async function dismissAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}

// Export types
export type { Notification, NotificationResponse } from 'expo-notifications';
