import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Platform, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import * as Linking from 'expo-linking';
import { useAuthStore, saveUserData } from '../src/store/authStore';
import { authApi } from '../src/utils/api';
import { theme } from '../src/utils/theme';
import { useNotificationDeepLinking, registerForPushNotifications } from '../src/utils/notifications';
import { setupGlobalErrorHandler } from '../src/utils/errorLogger';
import ErrorBoundary from '../src/components/ErrorBoundary';
import { SandboxProvider } from '../src/utils/sandboxContext';
import SandboxBanner from '../src/components/SandboxBanner';
import { LocationProvider } from '../src/context/LocationContext';
import { BadgeCelebrationProvider } from '../src/context/BadgeCelebrationContext';
import { MilestoneProvider } from '../src/context/MilestoneContext';

// Initialize global error handler
if (typeof window !== 'undefined' || Platform.OS !== 'web') {
  setupGlobalErrorHandler();
}

// Import page-specific skeletons
import { HomepageSkeleton } from '../src/components/skeletons';

// Skeleton shimmer animation component for font loading (kept for backward compatibility)
const FontLoadingSkeleton = () => {
  return <HomepageSkeleton isDesktop={false} />;
};

const skeletonStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  logo: { width: 80, height: 32, backgroundColor: '#E0E0E0', borderRadius: 4 },
  headerRight: { flexDirection: 'row', gap: 12 },
  iconBtn: { width: 40, height: 40, backgroundColor: '#E0E0E0', borderRadius: 20 },
  searchBar: { height: 48, backgroundColor: '#E0E0E0', borderRadius: 24, marginBottom: 16 },
  categories: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  categoryPill: { width: 100, height: 36, backgroundColor: '#E0E0E0', borderRadius: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { width: '48%', backgroundColor: '#fff', borderRadius: 12, padding: 8 },
  cardImage: { width: '100%', aspectRatio: 1, backgroundColor: '#E0E0E0', borderRadius: 8, marginBottom: 8 },
  cardTitle: { width: '80%', height: 14, backgroundColor: '#E0E0E0', borderRadius: 4, marginBottom: 6 },
  cardPrice: { width: '50%', height: 18, backgroundColor: '#E0E0E0', borderRadius: 4 },
});

export default function RootLayout() {
  const { loadStoredAuth, setUser, setToken, isAuthenticated, user } = useAuthStore();
  const [processingAuth, setProcessingAuth] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);

  // Check if fonts are loaded via document.fonts API (web only)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // Check if fonts are already ready
      const checkFonts = async () => {
        try {
          // Wait for essential icon fonts
          await document.fonts.ready;
          // Additional check for ionicons specifically
          const ioniconsLoaded = document.fonts.check('16px ionicons');
          if (ioniconsLoaded) {
            setFontsReady(true);
          } else {
            // Wait a bit more for fonts to load
            setTimeout(() => setFontsReady(true), 500);
          }
        } catch (e) {
          // Fallback: assume fonts loaded after timeout
          setTimeout(() => setFontsReady(true), 1000);
        }
      };
      checkFonts();
    } else {
      // Non-web platforms: fonts are bundled, mark as ready
      setFontsReady(true);
    }
  }, []);

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

  // Show skeleton while fonts are loading on web
  if (!mounted || (Platform.OS === 'web' && !fontsReady)) {
    return <FontLoadingSkeleton />;
  }

  return (
    <LocationProvider>
      <SandboxProvider>
        <BadgeCelebrationProvider>
          <MilestoneProvider>
            <ErrorBoundary componentName="RootLayout">
              <SandboxBanner />
              <StatusBar style="dark" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: '#1A1A1A' }, // Dark footer background
                }}
              >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="search" options={{ headerShown: false, contentStyle: { backgroundColor: '#F5F5F5' } }} />
                <Stack.Screen name="listing/[id]" options={{ presentation: 'card', contentStyle: { backgroundColor: '#F5F5F5' } }} />
                <Stack.Screen name="chat/[id]" options={{ presentation: 'card' }} />
                <Stack.Screen name="post/index" options={{ presentation: 'modal' }} />
                <Stack.Screen name="post/category" options={{ presentation: 'card' }} />
                <Stack.Screen name="login" options={{ presentation: 'modal' }} />
                <Stack.Screen name="auto/index" options={{ presentation: 'card' }} />
                <Stack.Screen name="auto/[id]" options={{ presentation: 'card' }} />
                <Stack.Screen name="leaderboard" options={{ presentation: 'card', contentStyle: { backgroundColor: '#F5F5F5' } }} />
                <Stack.Screen name="challenges" options={{ presentation: 'card', contentStyle: { backgroundColor: '#F5F5F5' } }} />
                <Stack.Screen name="profile/[id]/badges" options={{ presentation: 'card', contentStyle: { backgroundColor: '#F5F5F5' } }} />
                <Stack.Screen name="badges" options={{ headerShown: false }} />
              </Stack>
            </ErrorBoundary>
          </MilestoneProvider>
        </BadgeCelebrationProvider>
      </SandboxProvider>
    </LocationProvider>
  );
}
