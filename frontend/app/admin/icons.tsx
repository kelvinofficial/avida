import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/utils/api';
import { useAuthStore } from '../../src/store/authStore';

// Categories list for dropdown
const CATEGORIES = [
  { id: 'auto_vehicles', name: 'Auto & Vehicles' },
  { id: 'properties', name: 'Properties' },
  { id: 'electronics', name: 'Electronics' },
  { id: 'phones_tablets', name: 'Phones & Tablets' },
  { id: 'home_furniture', name: 'Home & Furniture' },
  { id: 'fashion_beauty', name: 'Fashion & Beauty' },
  { id: 'jobs_services', name: 'Jobs & Services' },
  { id: 'pets', name: 'Pets' },
  { id: 'kids_baby', name: 'Kids & Baby' },
  { id: 'sports_hobbies', name: 'Sports & Hobbies' },
  { id: 'agriculture', name: 'Agriculture & Food' },
  { id: 'commercial_equipment', name: 'Commercial Equipment' },
  { id: 'repair_construction', name: 'Repair & Construction' },
];

const ICON_TYPES = [
  { id: 'category', name: 'Category' },
  { id: 'subcategory', name: 'Subcategory' },
  { id: 'attribute', name: 'Attribute' },
];

interface AttributeIcon {
  id: string;
  name: string;
  ionicon_name: string;
  category_id?: string;
  subcategory_id?: string;
  attribute_name?: string;
  icon_type: string;
  color?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface IconStats {
  total: number;
  active: number;
  inactive: number;
  by_type: {
    category: number;
    subcategory: number;
    attribute: number;
  };
}

export default function IconsManagementScreen() {
  const router = useRouter();
  const [icons, setIcons] = useState<AttributeIcon[]>([]);
  const [availableIonicons, setAvailableIonicons] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<IconStats | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [iconPickerVisible, setIconPickerVisible] = useState(false);
  const [editingIcon, setEditingIcon] = useState<AttributeIcon | null>(null);
  const [seeding, setSeeding] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    ionicon_name: 'help-circle-outline',
    category_id: '',
    subcategory_id: '',
    attribute_name: '',
    icon_type: 'attribute',
    color: '',
    description: '',
  });

  // Filter state
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [iconSearch, setIconSearch] = useState('');

  const fetchIcons = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterCategory) params.append('category_id', filterCategory);
      if (filterType) params.append('icon_type', filterType);
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await api.get(`/attribute-icons/public?${params}`);
      setIcons(response.data.icons || []);
    } catch (error) {
      console.error('Error fetching icons:', error);
      Alert.alert('Error', 'Failed to load icons');
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterType, searchQuery]);

  const fetchStats = async () => {
    try {
      const response = await api.get('/attribute-icons/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAvailableIonicons = async () => {
    try {
      const response = await api.get('/attribute-icons/ionicons');
      setAvailableIonicons(response.data.icons || []);
    } catch (error) {
      console.error('Error fetching ionicons:', error);
    }
  };

  useEffect(() => {
    fetchIcons();
    fetchStats();
    fetchAvailableIonicons();
  }, [fetchIcons]);

  const handleSeedIcons = async () => {
    try {
      setSeeding(true);
      const response = await api.post('/attribute-icons/seed');
      Alert.alert('Success', response.data.message);
      fetchIcons();
      fetchStats();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to seed icons');
    } finally {
      setSeeding(false);
    }
  };

  const handleCreateIcon = async () => {
    if (!formData.name || !formData.ionicon_name) {
      Alert.alert('Error', 'Name and icon are required');
      return;
    }

    try {
      await api.post('/attribute-icons', formData);
      Alert.alert('Success', 'Icon created successfully');
      setModalVisible(false);
      resetForm();
      fetchIcons();
      fetchStats();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create icon');
    }
  };

  const handleUpdateIcon = async () => {
    if (!editingIcon) return;

    try {
      await api.put(`/attribute-icons/${editingIcon.id}`, formData);
      Alert.alert('Success', 'Icon updated successfully');
      setModalVisible(false);
      setEditingIcon(null);
      resetForm();
      fetchIcons();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update icon');
    }
  };

  const handleDeleteIcon = async (iconId: string) => {
    Alert.alert(
      'Delete Icon',
      'Are you sure you want to delete this icon?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/attribute-icons/${iconId}`);
              fetchIcons();
              fetchStats();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete icon');
            }
          },
        },
      ]
    );
  };

  const openEditModal = (icon: AttributeIcon) => {
    setEditingIcon(icon);
    setFormData({
      name: icon.name,
      ionicon_name: icon.ionicon_name,
      category_id: icon.category_id || '',
      subcategory_id: icon.subcategory_id || '',
      attribute_name: icon.attribute_name || '',
      icon_type: icon.icon_type,
      color: icon.color || '',
      description: icon.description || '',
    });
    setModalVisible(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      ionicon_name: 'help-circle-outline',
      category_id: '',
      subcategory_id: '',
      attribute_name: '',
      icon_type: 'attribute',
      color: '',
      description: '',
    });
    setEditingIcon(null);
  };

  const filteredIonicons = availableIonicons.filter(icon => 
    icon.toLowerCase().includes(iconSearch.toLowerCase())
  );

  const renderIconPicker = () => (
    <Modal
      visible={iconPickerVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setIconPickerVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '80%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Icon</Text>
            <TouchableOpacity onPress={() => setIconPickerVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <TextInput
            style={styles.searchInput}
            placeholder="Search icons..."
            value={iconSearch}
            onChangeText={setIconSearch}
          />
          
          <FlatList
            data={filteredIonicons}
            numColumns={5}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.iconGrid}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.iconPickerItem,
                  formData.ionicon_name === item && styles.iconPickerItemActive
                ]}
                onPress={() => {
                  setFormData({ ...formData, ionicon_name: item });
                  setIconPickerVisible(false);
                }}
              >
                <Ionicons 
                  name={item as any} 
                  size={28} 
                  color={formData.ionicon_name === item ? '#9333EA' : '#666'} 
                />
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attribute Icons</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setModalVisible(true);
          }}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
            <Text style={styles.statValue}>{stats.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
            <Text style={styles.statValue}>{stats.by_type?.category || 0}</Text>
            <Text style={styles.statLabel}>Category</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F3E5F5' }]}>
            <Text style={styles.statValue}>{stats.by_type?.attribute || 0}</Text>
            <Text style={styles.statLabel}>Attribute</Text>
          </View>
        </View>
      )}

      {/* Seed Button */}
      <View style={styles.seedContainer}>
        <TouchableOpacity
          style={styles.seedButton}
          onPress={handleSeedIcons}
          disabled={seeding}
        >
          {seeding ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color="#fff" />
              <Text style={styles.seedButtonText}>Seed Default Icons</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search icons..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={fetchIcons}
        />
        <View style={styles.filterRow}>
          <View style={styles.filterDropdown}>
            <Text style={styles.filterLabel}>Category:</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => {
                const currentIdx = CATEGORIES.findIndex(c => c.id === filterCategory);
                const nextIdx = (currentIdx + 1) % (CATEGORIES.length + 1);
                setFilterCategory(nextIdx === CATEGORIES.length ? '' : CATEGORIES[nextIdx].id);
              }}
            >
              <Text style={styles.dropdownText} numberOfLines={1}>
                {filterCategory ? CATEGORIES.find(c => c.id === filterCategory)?.name : 'All'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.filterDropdown}>
            <Text style={styles.filterLabel}>Type:</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => {
                const types = ['', 'category', 'subcategory', 'attribute'];
                const currentIdx = types.indexOf(filterType);
                setFilterType(types[(currentIdx + 1) % types.length]);
              }}
            >
              <Text style={styles.dropdownText}>
                {filterType ? ICON_TYPES.find(t => t.id === filterType)?.name : 'All'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Icons List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#9333EA" style={styles.loader} />
        ) : icons.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="shapes-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No icons found</Text>
            <Text style={styles.emptySubtext}>Tap "Seed Default Icons" to get started</Text>
          </View>
        ) : (
          <View style={styles.iconsGrid}>
            {icons.map((icon) => (
              <View key={icon.id} style={styles.iconCard}>
                <View style={styles.iconPreview}>
                  <Ionicons 
                    name={icon.ionicon_name as any} 
                    size={36} 
                    color={icon.color || '#9333EA'} 
                  />
                </View>
                <Text style={styles.iconName} numberOfLines={1}>{icon.name}</Text>
                <Text style={styles.ioniconName} numberOfLines={1}>{icon.ionicon_name}</Text>
                <View style={styles.iconTypeBadge}>
                  <Text style={styles.iconTypeText}>{icon.icon_type}</Text>
                </View>
                {icon.category_id && (
                  <Text style={styles.iconCategory} numberOfLines={1}>
                    {CATEGORIES.find(c => c.id === icon.category_id)?.name || icon.category_id}
                  </Text>
                )}
                <View style={styles.iconActions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => openEditModal(icon)}
                  >
                    <Ionicons name="pencil" size={18} color="#3B82F6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleDeleteIcon(icon.id)}
                  >
                    <Ionicons name="trash" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingIcon ? 'Edit Icon' : 'Create Icon'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="e.g., Car Make, Bedrooms"
              />

              <Text style={styles.inputLabel}>Icon *</Text>
              <TouchableOpacity
                style={styles.iconSelector}
                onPress={() => setIconPickerVisible(true)}
              >
                <View style={styles.selectedIcon}>
                  <Ionicons 
                    name={formData.ionicon_name as any} 
                    size={32} 
                    color="#9333EA" 
                  />
                </View>
                <View style={styles.iconSelectorText}>
                  <Text style={styles.iconSelectorLabel}>{formData.ionicon_name}</Text>
                  <Text style={styles.iconSelectorHint}>Tap to change</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Icon Type</Text>
              <View style={styles.typeButtons}>
                {ICON_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeButton,
                      formData.icon_type === type.id && styles.typeButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, icon_type: type.id })}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        formData.icon_type === type.id && styles.typeButtonTextActive,
                      ]}
                    >
                      {type.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    !formData.category_id && styles.categoryChipActive,
                  ]}
                  onPress={() => setFormData({ ...formData, category_id: '' })}
                >
                  <Text style={[styles.categoryChipText, !formData.category_id && styles.categoryChipTextActive]}>
                    Global
                  </Text>
                </TouchableOpacity>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      formData.category_id === cat.id && styles.categoryChipActive,
                    ]}
                    onPress={() => setFormData({ ...formData, category_id: cat.id })}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        formData.category_id === cat.id && styles.categoryChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Attribute Name</Text>
              <TextInput
                style={styles.textInput}
                value={formData.attribute_name}
                onChangeText={(text) => setFormData({ ...formData, attribute_name: text })}
                placeholder="e.g., make, model, bedrooms"
              />

              <Text style={styles.inputLabel}>Color (hex)</Text>
              <TextInput
                style={styles.textInput}
                value={formData.color}
                onChangeText={(text) => setFormData({ ...formData, color: text })}
                placeholder="#9333EA"
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaSmall]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Optional description"
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={editingIcon ? handleUpdateIcon : handleCreateIcon}
              >
                <Text style={styles.saveButtonText}>
                  {editingIcon ? 'Update' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Icon Picker Modal */}
      {renderIconPicker()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#9333EA',
    borderRadius: 20,
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  seedContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  seedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  seedButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterDropdown: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 10,
  },
  dropdownText: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconPreview: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  ioniconName: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  iconTypeBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  iconTypeText: {
    fontSize: 10,
    color: '#9333EA',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  iconCategory: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  iconActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalScroll: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  textAreaSmall: {
    height: 80,
    textAlignVertical: 'top',
  },
  iconSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
  },
  selectedIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSelectorText: {
    flex: 1,
    marginLeft: 12,
  },
  iconSelectorLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  iconSelectorHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  iconGrid: {
    padding: 8,
  },
  iconPickerItem: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    margin: 4,
    backgroundColor: '#F5F5F5',
  },
  iconPickerItemActive: {
    backgroundColor: '#F3E8FF',
    borderWidth: 2,
    borderColor: '#9333EA',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#9333EA',
  },
  typeButtonText: {
    fontSize: 13,
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  categoryScroll: {
    marginTop: 4,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#9333EA',
  },
  categoryChipText: {
    fontSize: 12,
    color: '#666',
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#9333EA',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
