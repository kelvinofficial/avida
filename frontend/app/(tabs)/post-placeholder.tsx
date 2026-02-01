import React from 'react';
import { View, StyleSheet } from 'react-native';

// Placeholder screen for the post button in tab bar
export default function PostPlaceholder() {
  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
