/**
 * Service Worker Registration Hook
 * Registers the service worker for PWA caching on web platform
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';

export function useServiceWorker() {
  useEffect(() => {
    // Only run on web platform
    if (Platform.OS !== 'web') {
      return;
    }

    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.log('[SW] Service Workers not supported');
      return;
    }

    // Register service worker
    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/api/pwa/sw.js', {
          scope: '/'
        });
        console.log('[SW] Service Worker registered:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('[SW] Update found, installing new version...');
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[SW] New version available, refresh to update');
              }
            });
          }
        });

        // Check if there's already an active service worker
        if (registration.active) {
          console.log('[SW] Service Worker is active');
        }

      } catch (error) {
        console.warn('[SW] Service Worker registration failed:', error);
      }
    };

    // Register after window load or immediately if already loaded
    if (document.readyState === 'complete') {
      registerServiceWorker();
    } else {
      window.addEventListener('load', registerServiceWorker);
      return () => {
        window.removeEventListener('load', registerServiceWorker);
      };
    }
  }, []);
}
