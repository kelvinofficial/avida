/**
 * CategoryDrawer - Subcategory selection drawer
 * 
 * CRITICAL: Only header is sticky, everything else scrolls
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
  Pressable,
  Animated,
  BackHandler,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SubcategoryConfig } from '../../config/subcategories';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAWER_HEIGHT = SCREEN_HEIGHT * 0.85;
const HEADER_SECTION_HEIGHT = 100; // drag handle + header + divider

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
  const scrollViewRef = useRef<ScrollView>(null);

  const recentForThisCategory = recentSubcategories.filter(
    item => item.categoryId === category?.id
  );

  const bottomPadding = Math.max(insets.bottom, 34) + 40;
  const scrollContentHeight = DRAWER_HEIGHT - HEADER_SECTION_HEIGHT;

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
      // Reset scroll position when drawer opens
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      
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
      <View style={styles.container}>
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Animated.View style={[styles.backdropInner, { opacity: fadeAnim }]} />
        </Pressable>

        {/* Drawer */}
        <Animated.View
          style={[
            styles.drawer,
            { transform: [{ translateY: slideAnim }] },
          ]}
          testID="category-drawer"
        >
          {/* ===== FIXED HEADER SECTION ===== */}
          <View style={styles.fixedHeader}>
            {/* Drag Handle */}
            <View style={styles.dragHandleRow}>
              <View style={styles.dragHandle} />
            </View>

            {/* Header Row */}
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <View style={styles.iconBox}>
                  <Ionicons name={(category.icon || 'grid-outline') as any} size={22} color="#2E7D32" />
                </View>
                <Text style={styles.headerTitle}>{category.name}</Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn} testID="close-drawer-btn">
                <Ionicons name="close" size={24} color="#333" />
              </Pressable>
            </View>

            {/* Divider */}
            <View style={styles.divider} />
          </View>

          {/* ===== SCROLLABLE CONTENT ===== */}
          <View style={[styles.scrollContainer, { height: scrollContentHeight }]}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
              showsVerticalScrollIndicator={true}
              bounces={true}
              scrollEnabled={true}
              nestedScrollEnabled={true}
            >
              {/* View All Button */}
              <Pressable
                style={styles.viewAllBtn}
                onPress={() => onSelectSubcategory(category.id, undefined)}
                testID="view-all-btn"
              >
                <View style={styles.viewAllLeft}>
                  <View style={styles.viewAllIcon}>
                    <Ionicons name="grid-outline" size={18} color="#2E7D32" />
                  </View>
                  <Text style={styles.viewAllText}>View All {category.name}</Text>
                </View>
                <View style={styles.viewAllRight}>
                  {loadingCounts ? (
                    <ActivityIndicator size="small" color="#2E7D32" />
                  ) : (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{subcategoryCounts._total || 0}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={18} color="#2E7D32" />
                </View>
              </Pressable>

              {/* Recently Viewed */}
              {recentForThisCategory.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="time-outline" size={13} color="#999" />
                    <Text style={styles.sectionLabel}>Recently viewed</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentRow}>
                    {recentForThisCategory.slice(0, 5).map((item, i) => (
                      <Pressable
                        key={`recent-${i}`}
                        style={styles.chip}
                        onPress={() => onSelectRecentSubcategory(item)}
                      >
                        <Text style={styles.chipText}>{item.subcategoryName}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Subcategories List */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>ALL SUBCATEGORIES</Text>
                </View>
                {category.subcategories.map((sub, idx) => (
                  <Pressable
                    key={sub.id}
                    style={[styles.subItem, idx === category.subcategories.length - 1 && styles.subItemLast]}
                    onPress={() => onSelectSubcategory(category.id, sub.id)}
                    testID={`sub-${sub.id}`}
                  >
                    <Text style={styles.subText}>{sub.name}</Text>
                    <View style={styles.subRight}>
                      {!loadingCounts && subcategoryCounts[sub.id] > 0 && (
                        <View style={styles.smallBadge}>
                          <Text style={styles.smallBadgeText}>{subcategoryCounts[sub.id]}</Text>
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={16} color="#bbb" />
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropInner: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: DRAWER_HEIGHT,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 8 },
      web: { boxShadow: '0 -2px 10px rgba(0,0,0,0.1)' },
    }),
  },
  fixedHeader: {
    backgroundColor: '#fff',
  },
  dragHandleRow: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
  },
  closeBtn: {
    padding: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
  },
  scrollContainer: {
    // Height set dynamically
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // paddingBottom set dynamically
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    padding: 14,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
  },
  viewAllLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  viewAllRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  section: {
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  recentRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chip: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2E7D32',
  },
  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  subItemLast: {
    borderBottomWidth: 0,
  },
  subText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  subRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
  },
  smallBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E7D32',
  },
});

export const SubcategoryModal = CategoryDrawer;
export default CategoryDrawer;
