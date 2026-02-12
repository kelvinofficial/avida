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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SvgXml } from 'react-native-svg';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Categories list for dropdown
const CATEGORIES = [
  { id: 'motors', name: 'Motors' },
  { id: 'properties', name: 'Properties' },
  { id: 'electronics', name: 'Electronics' },
  { id: 'phones_tablets', name: 'Phones & Tablets' },
  { id: 'home_furniture', name: 'Home & Furniture' },
  { id: 'fashion_beauty', name: 'Fashion & Beauty' },
  { id: 'health_beauty', name: 'Health & Beauty' },
  { id: 'jobs', name: 'Jobs' },
  { id: 'services', name: 'Services' },
  { id: 'agriculture_food', name: 'Agriculture & Food' },
  { id: 'pets', name: 'Pets' },
  { id: 'babies_kids', name: 'Babies & Kids' },
  { id: 'sports_hobbies', name: 'Sports & Hobbies' },
  { id: 'seeking_work', name: 'Seeking Work' },
];

const ICON_TYPES = [
  { id: 'category', name: 'Category' },
  { id: 'subcategory', name: 'Subcategory' },
  { id: 'attribute', name: 'Attribute' },
];

interface AttributeIcon {
  id: string;
  name: string;
  svg_content: string;
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
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<IconStats | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIcon, setEditingIcon] = useState<AttributeIcon | null>(null);
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    svg_content: '',
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

  const fetchIcons = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterCategory) params.append('category_id', filterCategory);
      if (filterType) params.append('icon_type', filterType);
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await fetch(`${API_URL}/api/attribute-icons/public?${params}`);
      const data = await response.json();
      setIcons(data.icons || []);
    } catch (error) {
      console.error('Error fetching icons:', error);
      Alert.alert('Error', 'Failed to load icons');
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterType, searchQuery]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/attribute-icons/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchIcons();
    fetchStats();
  }, [fetchIcons]);

  const handleCreateIcon = async () => {
    if (!formData.name || !formData.svg_content) {
      Alert.alert('Error', 'Name and SVG content are required');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/attribute-icons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        Alert.alert('Success', 'Icon created successfully');
        setModalVisible(false);
        resetForm();
        fetchIcons();
        fetchStats();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to create icon');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create icon');
    }
  };

  const handleUpdateIcon = async () => {
    if (!editingIcon) return;

    try {
      const response = await fetch(`${API_URL}/api/attribute-icons/${editingIcon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        Alert.alert('Success', 'Icon updated successfully');
        setModalVisible(false);
        setEditingIcon(null);
        resetForm();
        fetchIcons();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to update icon');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update icon');
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
              const response = await fetch(`${API_URL}/api/attribute-icons/${iconId}`, {
                method: 'DELETE',
              });
              if (response.ok) {
                fetchIcons();
                fetchStats();
              }
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
      svg_content: icon.svg_content,
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
      svg_content: '',
      category_id: '',
      subcategory_id: '',
      attribute_name: '',
      icon_type: 'attribute',
      color: '',
      description: '',
    });
    setEditingIcon(null);
  };

  const handlePreviewSvg = (svg: string) => {
    setPreviewSvg(svg);
  };

  const renderIconPreview = (svgContent: string, size: number = 40) => {
    try {
      return <SvgXml xml={svgContent} width={size} height={size} />;
    } catch {
      return <Ionicons name="image-outline" size={size} color="#ccc" />;
    }
  };

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
            <Text style={styles.statValue}>{stats.by_type.category}</Text>
            <Text style={styles.statLabel}>Category</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F3E5F5' }]}>
            <Text style={styles.statValue}>{stats.by_type.attribute}</Text>
            <Text style={styles.statLabel}>Attribute</Text>
          </View>
        </View>
      )}

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
                // Simple toggle through categories
                const currentIdx = CATEGORIES.findIndex(c => c.id === filterCategory);
                const nextIdx = (currentIdx + 1) % (CATEGORIES.length + 1);
                setFilterCategory(nextIdx === CATEGORIES.length ? '' : CATEGORIES[nextIdx].id);
              }}
            >
              <Text style={styles.dropdownText}>
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
            <Text style={styles.emptySubtext}>Create your first icon to get started</Text>
          </View>
        ) : (
          <View style={styles.iconsGrid}>
            {icons.map((icon) => (
              <View key={icon.id} style={styles.iconCard}>
                <TouchableOpacity
                  style={styles.iconPreview}
                  onPress={() => handlePreviewSvg(icon.svg_content)}
                >
                  {renderIconPreview(icon.svg_content, 48)}
                </TouchableOpacity>
                <Text style={styles.iconName} numberOfLines={1}>{icon.name}</Text>
                <Text style={styles.iconType}>{icon.icon_type}</Text>
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
                placeholder="Icon name"
              />

              <Text style={styles.inputLabel}>SVG Content *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.svg_content}
                onChangeText={(text) => setFormData({ ...formData, svg_content: text })}
                placeholder='<svg viewBox="0 0 24 24">...</svg>'
                multiline
                numberOfLines={6}
              />

              {formData.svg_content && (
                <View style={styles.svgPreviewContainer}>
                  <Text style={styles.previewLabel}>Preview:</Text>
                  {renderIconPreview(formData.svg_content, 60)}
                </View>
              )}

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
                    None
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
                placeholder="e.g., make, model, color"
              />

              <Text style={styles.inputLabel}>Color (hex)</Text>
              <TextInput
                style={styles.textInput}
                value={formData.color}
                onChangeText={(text) => setFormData({ ...formData, color: text })}
                placeholder="#000000"
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

      {/* SVG Preview Modal */}
      <Modal
        visible={!!previewSvg}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewSvg(null)}
      >
        <TouchableOpacity
          style={styles.previewOverlay}
          activeOpacity={1}
          onPress={() => setPreviewSvg(null)}
        >
          <View style={styles.previewBox}>
            {previewSvg && renderIconPreview(previewSvg, 120)}
          </View>
        </TouchableOpacity>
      </Modal>
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
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
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
  iconType: {
    fontSize: 11,
    color: '#9333EA',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  iconCategory: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
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
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  textAreaSmall: {
    height: 80,
    textAlignVertical: 'top',
  },
  svgPreviewContainer: {
    alignItems: 'center',
    marginTop: 12,
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  previewLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
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
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
  },
});
