import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SubcategoryConfig } from '../../config/subcategories';

interface RecentSubcategory {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  subcategoryId: string;
  subcategoryName: string;
  timestamp: number;
}

interface SubcategoryModalProps {
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

export const SubcategoryModal: React.FC<SubcategoryModalProps> = ({
  visible,
  onClose,
  category,
  subcategoryCounts,
  loadingCounts,
  recentSubcategories,
  onSelectSubcategory,
  onSelectRecentSubcategory,
}) => {
  // Filter recent subcategories for the current category
  const recentForThisCategory = recentSubcategories.filter(
    item => item.categoryId === category?.id
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.subcategoryModalContent}>
          {/* Modal Header */}
          <View style={styles.subcategoryModalHeader}>
            <View style={styles.subcategoryHeaderLeft}>
              {category?.icon && (
                <View style={styles.subcategoryHeaderIcon}>
                  <Ionicons 
                    name={category.icon as any} 
                    size={24} 
                    color="#2E7D32" 
                  />
                </View>
              )}
              <Text style={styles.subcategoryModalTitle}>
                {category?.name}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={onClose} 
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* View All Option */}
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => onSelectSubcategory(category?.id || '', undefined)}
            activeOpacity={0.7}
          >
            <View style={styles.viewAllContent}>
              <Ionicons name="grid-outline" size={20} color="#2E7D32" />
              <Text style={styles.viewAllText}>View All {category?.name}</Text>
            </View>
            <View style={styles.viewAllRight}>
              {loadingCounts ? (
                <ActivityIndicator size="small" color="#2E7D32" />
              ) : (
                <Text style={styles.viewAllCount}>{subcategoryCounts._total || 0}</Text>
              )}
              <Ionicons name="chevron-forward" size={20} color="#2E7D32" />
            </View>
          </TouchableOpacity>

          {/* Recently Viewed Section - Only show for current category */}
          {recentForThisCategory.length > 0 && (
            <>
              <View style={styles.subcategoryDivider}>
                <Ionicons name="time-outline" size={14} color="#999" style={{ marginRight: 6 }} />
                <Text style={styles.subcategoryDividerText}>Recently viewed</Text>
              </View>
              <View style={styles.recentSubcategoriesRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentScrollContent}>
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
            </>
          )}

          {/* Divider */}
          <View style={styles.subcategoryDivider}>
            <Text style={styles.subcategoryDividerText}>All subcategories</Text>
          </View>

          {/* Subcategories List */}
          <ScrollView 
            style={styles.subcategoriesList} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.subcategoriesListContent}
          >
            {category?.subcategories.map((subcat, index) => (
              <TouchableOpacity
                key={subcat.id}
                style={[
                  styles.subcategoryItem,
                  index === (category?.subcategories.length || 0) - 1 && styles.subcategoryItemLast
                ]}
                onPress={() => onSelectSubcategory(category?.id || '', subcat.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.subcategoryItemText}>{subcat.name}</Text>
                <View style={styles.subcategoryItemRight}>
                  {loadingCounts ? (
                    <View style={styles.countPlaceholder} />
                  ) : subcategoryCounts[subcat.id] !== undefined && subcategoryCounts[subcat.id] > 0 ? (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{subcategoryCounts[subcat.id]}</Text>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-forward" size={18} color="#999" />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  subcategoryModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 40,
  },
  subcategoryModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  subcategoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  subcategoryHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subcategoryModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
  },
  viewAllContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  viewAllRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewAllCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
  },
  subcategoryDivider: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
    flexDirection: 'row',
    alignItems: 'center',
  },
  subcategoryDividerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subcategoriesList: {
    flex: 1,
  },
  subcategoriesListContent: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 16,
  },
  subcategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  subcategoryItemLast: {
    borderBottomWidth: 0,
  },
  subcategoryItemText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  subcategoryItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 26,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E7D32',
  },
  countPlaceholder: {
    width: 26,
    height: 18,
  },
  recentSubcategoriesRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  recentScrollContent: {
    paddingHorizontal: 12,
    gap: 6,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D0E8D0',
    gap: 4,
    marginRight: 6,
  },
  recentChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2E7D32',
    maxWidth: 100,
  },
});

export default SubcategoryModal;
