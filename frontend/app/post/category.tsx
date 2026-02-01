import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';

const CATEGORIES = [
  { id: 'fashion', name: 'Fashion & Accessories', icon: 'shirt-outline' },
  { id: 'home', name: 'Home & Garden', icon: 'home-outline' },
  { id: 'electronics', name: 'Electronics', icon: 'phone-portrait-outline' },
  { id: 'realestate', name: 'Real Estate', icon: 'business-outline' },
  { id: 'vehicles', name: 'Cars, Bikes & Boats', icon: 'car-outline' },
  { id: 'family', name: 'Family & Baby', icon: 'people-outline' },
  { id: 'jobs', name: 'Jobs', icon: 'briefcase-outline' },
  { id: 'services', name: 'Services', icon: 'construct-outline' },
  { id: 'misc', name: 'Miscellaneous', icon: 'ellipsis-horizontal-outline' },
];

export default function SelectCategoryScreen() {
  const router = useRouter();

  const handleSelectCategory = (categoryId: string) => {
    router.push({
      pathname: '/post',
      params: { category: categoryId },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.title}>Select Category</Text>
        <View style={styles.placeholder} />
      </View>

      <Text style={styles.subtitle}>What are you selling?</Text>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={styles.categoryItem}
            onPress={() => handleSelectCategory(category.id)}
            activeOpacity={0.7}
          >
            <View style={styles.categoryIcon}>
              <Ionicons name={category.icon as any} size={28} color={theme.colors.primary} />
            </View>
            <Text style={styles.categoryName}>{category.name}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  placeholder: {
    width: 44,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: theme.spacing.md,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.md,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    ...theme.elevation.level1,
  },
  categoryIcon: {
    width: 52,
    height: 52,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  categoryName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
});
