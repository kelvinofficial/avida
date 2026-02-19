/**
 * CategoryDrawer - Full-height expandable category subcategory drawer
 * 
 * Layout Structure:
 * - Header (STICKY): Category name + close button - DOES NOT SCROLL
 * - View All + Subcategories: SCROLLABLE - scrolls together
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  BackHandler,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SubcategoryConfig } from '../../config/subcategories';
import { COLORS, SPACING, RADIUS, LAYOUT, SHADOWS, getBottomPadding } from '../../constants/layout';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface RecentSubcategory {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  subcategoryId: string;
  subcategoryName: string;
  timestamp: number;
}

interface CategoryDrawerProps {
  visible: boolean;
  onClose: () => void;
  category: {
    id: string;
    name: string;
    icon: string;
    subcategories: SubcategoryConfig[];
  } | null;
  subcategoryCounts: Record<string, number>;
  loadingCounts: boolean;
  recentSubcategories: RecentSubcategory[];
  onSelectSubcategory: (categoryId: string, subcategoryId?: string) => void;
  onSelectRecentSubcategory: (item: RecentSubcategory) => void;
}

export const CategoryDrawer: React.FC<CategoryDrawerProps> = ({
  visible,
  onClose,
  category,
  subcategoryCounts,
  loadingCounts,
  recentSubcategories,
  onSelectSubcategory,
  onSelectRecentSubcategory,
}) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const recentForThisCategory = recentSubcategories.filter(
    item => item.categoryId === category?.id
  );

  const bottomPadding = Math.max(insets.bottom, 34) + SPACING.xl;

  useEffect(() => {
    if (!visible) return;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => backHandler.remove();
  }, [visible, onClose]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible || !category) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalContainer}>
        {/* Overlay */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: slideAnim }] },
          ]}
          testID="category-drawer"
        >
          {/* Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          {/* STICKY HEADER - Does not scroll */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {category.icon && (
                <View style={styles.headerIconContainer}>
                  <Ionicons name={category.icon as any} size={24} color={COLORS.primary} />
                </View>
              )}
              <Text style={styles.headerTitle} numberOfLines={1}>{category.name}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              testID="category-drawer-close-btn"
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* SCROLLABLE CONTENT - View All + Subcategories scroll together */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={{ paddingBottom: bottomPadding }}
            showsVerticalScrollIndicator={true}
            bounces={true}
            scrollEventThrottle={16}
          >
            {/* View All Button */}
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => onSelectSubcategory(category.id, undefined)}
              activeOpacity={0.7}
              testID="view-all-category-btn"
            >
              <View style={styles.viewAllContent}>
                <View style={styles.viewAllIcon}>
                  <Ionicons name="grid-outline" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.viewAllText}>View All {category.name}</Text>
              </View>
              <View style={styles.viewAllRight}>
                {loadingCounts ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{subcategoryCounts._total || 0}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
              </View>
            </TouchableOpacity>

            {/* Recently Viewed */}
            {recentForThisCategory.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
                  <Text style={styles.sectionTitle}>Recently viewed</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.recentScrollContent}
                >
                  {recentForThisCategory.slice(0, 5).map((item, index) => (
                    <TouchableOpacity
                      key={`${item.categoryId}-${item.subcategoryId}-${index}`}
                      style={styles.recentChip}
                      onPress={() => onSelectRecentSubcategory(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.recentChipText} numberOfLines={1}>{item.subcategoryName}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* All Subcategories */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>ALL SUBCATEGORIES</Text>
              </View>
              {category.subcategories.map((subcat, index) => (
                <TouchableOpacity
                  key={subcat.id}
                  style={[
                    styles.subcategoryItem,
                    index === category.subcategories.length - 1 && styles.subcategoryItemLast,
                  ]}
                  onPress={() => onSelectSubcategory(category.id, subcat.id)}
                  activeOpacity={0.7}
                  testID={`subcategory-${subcat.id}`}
                >
                  <Text style={styles.subcategoryText}>{subcat.name}</Text>
                  <View style={styles.subcategoryRight}>
                    {!loadingCounts && subcategoryCounts[subcat.id] > 0 && (
                      <View style={styles.smallCountBadge}>
                        <Text style={styles.smallCountText}>{subcategoryCounts[subcat.id]}</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const HEADER_HEIGHT = 70;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.85,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: HEADER_HEIGHT,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  scrollView: {
    flex: 1,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
  },
  viewAllContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  viewAllIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E7D32',
  },
  viewAllRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    minWidth: 28,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  section: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9E9E9E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recentScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  recentChip: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    marginRight: 8,
  },
  recentChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2E7D32',
  },
  subcategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    minHeight: 52,
  },
  subcategoryItemLast: {
    borderBottomWidth: 0,
  },
  subcategoryText: {
    fontSize: 15,
    color: '#212121',
    flex: 1,
  },
  subcategoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallCountBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 28,
    alignItems: 'center',
  },
  smallCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
});

export const SubcategoryModal = CategoryDrawer;
export default CategoryDrawer;
