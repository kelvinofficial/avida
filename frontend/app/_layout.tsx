import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { useAuthStore, saveUserData } from '../src/store/authStore';
import { authApi } from '../src/utils/api';
import { theme } from '../src/utils/theme';
import { useNotificationDeepLinking, registerForPushNotifications } from '../src/utils/notifications';
import { setupGlobalErrorHandler } from '../src/utils/errorLogger';
import ErrorBoundary from '../src/components/ErrorBoundary';
import { SandboxProvider } from '../src/utils/sandboxContext';
import SandboxBanner from '../src/components/SandboxBanner';

// Initialize global error handler
if (typeof window !== 'undefined' || Platform.OS !== 'web') {
  setupGlobalErrorHandler();
}

export default function RootLayout() {
  const { loadStoredAuth, setUser, setToken, isAuthenticated, user } = useAuthStore();
  const [processingAuth, setProcessingAuth] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize notification deep linking
  useNotificationDeepLinking();

  useEffect(() => {
    setMounted(true);
    loadStoredAuth();
  }, []);

  // Register for push notifications when user is authenticated
  useEffect(() => {
    if (mounted && isAuthenticated && user?.user_id) {
      // Register for push notifications
      registerForPushNotifications(user.user_id).then((token) => {
        if (token) {
          console.log('Push notifications registered');
        }
      }).catch((err) => {
        console.log('Push notification registration error:', err);
      });
    }
  }, [mounted, isAuthenticated, user?.user_id]);

  // Handle deep link auth callback
  useEffect(() => {
    if (!mounted) return;
    
    const handleUrl = async (url: string) => {
      if (!url) return;
      
      // Extract session_id from URL
      let sessionId: string | null = null;
      
      // Check hash fragment
      const hashMatch = url.match(/[#?]session_id=([^&]+)/);
      if (hashMatch) {
        sessionId = hashMatch[1];
      }
      
      if (sessionId && !processingAuth) {
        setProcessingAuth(true);
        try {
          const result = await authApi.exchangeSession(sessionId);
          if (result.user && result.session_token) {
            await setToken(result.session_token);
            setUser(result.user);
            await saveUserData(result.user);
          }
        } catch (error) {
          console.error('Auth exchange error:', error);
        } finally {
          setProcessingAuth(false);
        }
      }
    };

    // Handle initial URL (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    // Handle URL events (app running)
    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    // Web: Check hash on mount
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const fullUrl = window.location.href;
      handleUrl(fullUrl);
      
      // Clean URL after processing
      if (fullUrl.includes('session_id')) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    return () => subscription.remove();
  }, [mounted, processingAuth]);

  // Render immediately without loading state
  if (!mounted) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }} />
    );
  }

  return (
    <ErrorBoundary componentName="RootLayout">
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#1A1A1A' }, // Dark footer background
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="listing/[id]" options={{ presentation: 'card', contentStyle: { backgroundColor: '#F5F5F5' } }} />
        <Stack.Screen name="chat/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="post/index" options={{ presentation: 'modal' }} />
        <Stack.Screen name="post/category" options={{ presentation: 'card' }} />
        <Stack.Screen name="login" options={{ presentation: 'modal' }} />
        <Stack.Screen name="auto/index" options={{ presentation: 'card' }} />
        <Stack.Screen name="auto/[id]" options={{ presentation: 'card' }} />
      </Stack>
    </ErrorBoundary>
  );
}
