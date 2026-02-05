import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

// This screen redirects to the actual post page
export default function PostPlaceholder() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  // Redirect immediately
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/post');
    } else {
      router.replace('/login');
    }
  }, [isAuthenticated]);

  // Show loading while redirecting
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2E7D32" />
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
});
