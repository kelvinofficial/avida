/**
 * CategoryDrawer - Full-height expandable category subcategory drawer
 * 
 * Layout Structure:
 * - Header (STICKY): Category name + close button
 * - View All button (STICKY): Always visible below header
 * - Scrollable content: Recent subcategories + All subcategories list
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SubcategoryConfig } from '../../config/subcategories';
import { COLORS, SPACING, RADIUS, LAYOUT, SHADOWS, getBottomPadding } from '../../constants/layout';

const SCREEN_HEIGHT = Dimensions.get('window').height;

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

/**
 * CategoryDrawer implements:
 * - Header + View All are STICKY (never scroll)
 * - Recent + Subcategories list scroll together
 * - Proper safe area handling
 */
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

  // Filter recent subcategories for the current category
  const recentForThisCategory = recentSubcategories.filter(
    item => item.categoryId === category?.id
  );

  // Calculate heights
  const sheetHeight = SCREEN_HEIGHT * 0.85;
  const bottomPadding = getBottomPadding(insets.bottom, SPACING.xl);

  // Handle Android back button
  useEffect(() => {
    if (!visible) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });

    return () => backHandler.remove();
  }, [visible, onClose]);

  // Animate in/out
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
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
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      {/* Sheet Container */}
      <Animated.View
        style={[
          styles.sheetContainer,
          {
            height: sheetHeight,
            transform: [{ translateY: slideAnim }],
          },
        ]}
        testID="category-drawer"
      >
        <View style={[styles.sheet, { height: sheetHeight }]}>
          {/* ========== STICKY SECTION START ========== */}
          
          {/* Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          {/* Sticky Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {category.icon && (
                <View style={styles.headerIconContainer}>
                  <Ionicons
                    name={category.icon as any}
                    size={24}
                    color={COLORS.primary}
                  />
                </View>
              )}
              <Text style={styles.headerTitle} numberOfLines={1}>
                {category.name}
              </Text>
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

          {/* Divider */}
          <View style={styles.divider} />

          {/* Sticky View All Button */}
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
                  <Text style={styles.countBadgeText}>
                    {subcategoryCounts._total || 0}
                  </Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
            </View>
          </TouchableOpacity>

          {/* ========== STICKY SECTION END ========== */}

          {/* ========== SCROLLABLE SECTION START ========== */}
          <ScrollView
            style={styles.scrollableContent}
            contentContainerStyle={[
              styles.scrollContentContainer,
              { paddingBottom: bottomPadding },
            ]}
            showsVerticalScrollIndicator={true}
            bounces={true}
            alwaysBounceVertical={true}
            scrollEnabled={true}
          >
            {/* Recently Viewed Section */}
            {recentForThisCategory.length > 0 && (
              <View style={styles.sectionContainer}>
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
                      <Text style={styles.recentChipText} numberOfLines={1}>
                        {item.subcategoryName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* All Subcategories Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>ALL SUBCATEGORIES</Text>
              </View>
              
              <View style={styles.subcategoriesList}>
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
                      {loadingCounts ? (
                        <View style={styles.countPlaceholder} />
                      ) : subcategoryCounts[subcat.id] > 0 ? (
                        <View style={styles.smallCountBadge}>
                          <Text style={styles.smallCountText}>
                            {subcategoryCounts[subcat.id]}
                          </Text>
                        </View>
                      ) : null}
                      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
          {/* ========== SCROLLABLE SECTION END ========== */}
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },

  // Sheet Container
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    overflow: 'hidden',
    ...SHADOWS.xl,
  },

  // Drag Handle
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.borderLight,
    borderRadius: 2,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minHeight: LAYOUT.bottomSheet.headerHeight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  closeButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },

  // View All Button (STICKY - outside ScrollView)
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.base,
    marginTop: SPACING.base,
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.base,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.lg,
  },
  viewAllContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
  },
  viewAllIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    flex: 1,
  },
  viewAllRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  countBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    minWidth: 28,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.surface,
  },

  // Scrollable Content
  scrollableContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
  },

  // Section Container
  sectionContainer: {
    marginTop: SPACING.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Recent Subcategories
  recentScrollContent: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  recentChip: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    marginRight: SPACING.sm,
  },
  recentChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primary,
    maxWidth: 120,
  },

  // Subcategories List
  subcategoriesList: {
    paddingHorizontal: SPACING.sm,
  },
  subcategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    minHeight: 52,
  },
  subcategoryItemLast: {
    borderBottomWidth: 0,
  },
  subcategoryText: {
    fontSize: 15,
    color: COLORS.text,
    flex: 1,
  },
  subcategoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  smallCountBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.base,
    minWidth: 28,
    alignItems: 'center',
  },
  smallCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  countPlaceholder: {
    width: 28,
    height: 20,
  },
});

// For backward compatibility, also export as SubcategoryModal
export const SubcategoryModal = CategoryDrawer;

export default CategoryDrawer;
