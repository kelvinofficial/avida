import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  
  // Start with false (show tab bar) to avoid SSR hydration mismatch
  // Only hide after client-side mount confirms we're on tablet/desktop
  const [isMounted, setIsMounted] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  useEffect(() => {
    // Mark as mounted (client-side only)
    setIsMounted(true);
    
    // Check screen width after component mounts on client
    const checkScreenSize = () => {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        setIsLargeScreen(window.innerWidth > 768);
      } else {
        const { width } = Dimensions.get('window');
        setIsLargeScreen(width > 768);
      }
    };

    checkScreenSize();

    // Listen for resize events on web
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('resize', checkScreenSize);
      return () => window.removeEventListener('resize', checkScreenSize);
    }

    // Listen for dimension changes on native
    const subscription = Dimensions.addEventListener('change', checkScreenSize);
    return () => subscription?.remove();
  }, []);

  // Only hide bottom nav after mounting AND confirming large screen
  const hideBottomNav = isMounted && isLargeScreen;

  const handlePostPress = () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/post');
    } else {
      router.push('/post');
    }
  };

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: hideBottomNav ? { display: 'none' } : [
          styles.tabBar,
          { paddingBottom: Platform.OS === 'ios' ? insets.bottom : 12 },
        ],
        tabBarActiveTintColor: '#2E7D32',
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarLabelStyle: styles.tabLabel,
        tabBarShowLabel: true,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "heart" : "heart-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="post-placeholder"
        options={{
          title: '',
          tabBarIcon: () => (
            <View style={styles.fabButton}>
              <Ionicons name="add" size={26} color="#fff" />
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            handlePostPress();
          },
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={24} color={color} />
          ),
        }}
      />
      {/* Hide the search tab from bottom navigation */}
      <Tabs.Screen
        name="search"
        options={{
          href: null, // This hides the tab from navigation
        }}
      />
      {/* Hide the streak leaderboard from bottom navigation */}
      <Tabs.Screen
        name="streak-leaderboard"
        options={{
          href: null, // This hides the tab from navigation
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0,
    height: 60,
    paddingTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  fabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
