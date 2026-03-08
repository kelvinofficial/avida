import { useEffect } from 'react';
import { useRouter } from 'expo-router';

/**
 * Redirect to the consolidated notification settings page.
 * This page existed as a duplicate of /profile/notifications.
 */
export default function NotificationPreferencesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/profile/notifications');
  }, [router]);

  return null;
}
