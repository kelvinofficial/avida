import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore, saveUserData } from '../src/store/authStore';
import { authApi } from '../src/utils/api';
import { theme } from '../src/utils/theme';

export default function RootLayout() {
  const { loadStoredAuth, isLoading, setUser, setToken } = useAuthStore();
  const [processingAuth, setProcessingAuth] = useState(false);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Handle deep link auth callback
  useEffect(() => {
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
      const hash = window.location.hash;
      const search = window.location.search;
      const fullUrl = window.location.href;
      handleUrl(fullUrl);
      
      // Clean URL after processing
      if (hash.includes('session_id') || search.includes('session_id')) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    return () => subscription.remove();
  }, [processingAuth]);

  if (isLoading || processingAuth) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="listing/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="chat/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="post/index" options={{ presentation: 'modal' }} />
        <Stack.Screen name="post/category" options={{ presentation: 'card' }} />
        <Stack.Screen name="login" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
