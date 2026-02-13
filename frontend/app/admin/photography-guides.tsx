import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  text: '#1A1A1A',
  textSecondary: '#666',
  border: '#E0E0E0',
  surface: '#fff',
  background: '#F5F5F5',
  danger: '#DC2626',
  warning: '#F59E0B',
};

// Category options
const CATEGORIES = [
  { id: 'auto_vehicles', name: 'Auto & Vehicles' },
  { id: 'properties', name: 'Properties' },
  { id: 'electronics', name: 'Electronics' },
  { id: 'fashion', name: 'Fashion' },
  { id: 'home_garden', name: 'Home & Garden' },
  { id: 'jobs', name: 'Jobs' },
  { id: 'services', name: 'Services' },
  { id: 'pets', name: 'Pets' },
  { id: 'default', name: 'Default (All Categories)' },
];

interface PhotographyGuide {
  id: string;
  category_id: string;
  title: string;
  description: string;
  icon: string;
  image_url?: string;
  has_image: boolean;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface GuideStats {
  total: number;
  active: number;
  inactive: number;
  with_images: number;
  categories_count: number;
  by_category: Record<string, number>;
}

export default function PhotographyGuidesAdmin() {
  const router = useRouter();
  const [guides, setGuides] = useState<PhotographyGuide[]>([]);
  const [stats, setStats] = useState<GuideStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingGuide, setEditingGuide] = useState<PhotographyGuide | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    category_id: '',
    title: '',
    description: '',
    icon: 'camera-outline',
    order: 0,
    is_active: true,
  });

  // Track client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Helper to get token
  const getToken = async (): Promise<string | null> => {
    // Try localStorage first (works on web)
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = window.localStorage.getItem('session_token');
      if (token) return token;
    }
    // Fallback to AsyncStorage (for native)
    return await AsyncStorage.getItem('session_token');
  };

  // Fetch guides
  const fetchGuides = useCallback(async (categoryFilter?: string) => {
    try {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const category = categoryFilter ?? selectedCategory;
      const url = category 
        ? `${API_URL}/api/photography-guides?category_id=${category}`
        : `${API_URL}/api/photography-guides`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGuides(data.guides || []);
      } else {
        console.error('Fetch guides failed:', response.status);
      }
    } catch (error) {
      console.error('Error fetching guides:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/api/photography-guides/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // Initial load - only after client-side mount
  useEffect(() => {
    if (isMounted) {
      fetchGuides();
      fetchStats();
    }
  }, [isMounted, fetchGuides, fetchStats]);

  // Refresh when category changes
  useEffect(() => {
    if (isMounted && selectedCategory !== '') {
      fetchGuides(selectedCategory);
    }
  }, [isMounted, selectedCategory]);

  // Create/Update guide
  const handleSaveGuide = async () => {
    if (!formData.title || !formData.description || !formData.category_id) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      const url = editingGuide 
        ? `${API_URL}/api/photography-guides/${editingGuide.id}`
        : `${API_URL}/api/photography-guides`;
      
      const response = await fetch(url, {
        method: editingGuide ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        setShowModal(false);
        resetForm();
        fetchGuides();
        fetchStats();
        Alert.alert('Success', editingGuide ? 'Guide updated!' : 'Guide created!');
      } else {
        Alert.alert('Error', 'Failed to save guide');
      }
    } catch (error) {
      console.error('Error saving guide:', error);
      Alert.alert('Error', 'Failed to save guide');
    }
  };

  // Delete guide
  const handleDeleteGuide = async (guideId: string) => {
    Alert.alert(
      'Delete Guide',
      'Are you sure you want to delete this guide?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              if (!token) return;

              const response = await fetch(`${API_URL}/api/photography-guides/${guideId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              
              if (response.ok) {
                fetchGuides();
                fetchStats();
              }
            } catch (error) {
              console.error('Error deleting guide:', error);
            }
          }
        }
      ]
    );
  };

  // Toggle active status
  const handleToggleActive = async (guide: PhotographyGuide) => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/api/photography-guides/${guide.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !guide.is_active })
      });
      
      if (response.ok) {
        fetchGuides();
        fetchStats();
      }
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  // Seed default guides
  const handleSeedDefaults = async () => {
    Alert.alert(
      'Seed Default Guides',
      'This will add default photography guides for all categories. Existing guides will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Seed',
          onPress: async () => {
            try {
              const token = await getToken();
              if (!token) return;

              const response = await fetch(`${API_URL}/api/photography-guides/seed`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              
              if (response.ok) {
                const data = await response.json();
                Alert.alert('Success', data.message);
                fetchGuides();
                fetchStats();
              }
            } catch (error) {
              console.error('Error seeding guides:', error);
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      category_id: '',
      title: '',
      description: '',
      icon: 'camera-outline',
      order: 0,
      is_active: true,
    });
    setEditingGuide(null);
  };

  const openEditModal = (guide: PhotographyGuide) => {
    setEditingGuide(guide);
    setFormData({
      category_id: guide.category_id,
      title: guide.title,
      description: guide.description,
      icon: guide.icon,
      order: guide.order,
      is_active: guide.is_active,
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Photography Guides</Text>
        <TouchableOpacity onPress={openCreateModal} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total Guides</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.primary }]}>{stats.active}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.warning }]}>{stats.inactive}</Text>
              <Text style={styles.statLabel}>Inactive</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.categories_count}</Text>
              <Text style={styles.statLabel}>Categories</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.seedButton} onPress={handleSeedDefaults}>
            <Ionicons name="leaf" size={18} color="#fff" />
            <Text style={styles.seedButtonText}>Seed Defaults</Text>
          </TouchableOpacity>
        </View>

        {/* Category Filter */}
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Filter by Category:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
            <TouchableOpacity
              style={[styles.filterChip, !selectedCategory && styles.filterChipActive]}
              onPress={() => setSelectedCategory('')}
            >
              <Text style={[styles.filterChipText, !selectedCategory && styles.filterChipTextActive]}>All</Text>
            </TouchableOpacity>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.filterChip, selectedCategory === cat.id && styles.filterChipActive]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text style={[styles.filterChipText, selectedCategory === cat.id && styles.filterChipTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Guides List */}
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : guides.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No photography guides found</Text>
            <Text style={styles.emptySubtext}>Create a new guide or seed default guides</Text>
          </View>
        ) : (
          <View style={styles.guidesList}>
            {guides.map((guide) => (
              <View key={guide.id} style={styles.guideCard}>
                <View style={styles.guideHeader}>
                  <View style={styles.guideIconContainer}>
                    <Ionicons name={guide.icon as any || 'camera-outline'} size={24} color={COLORS.primary} />
                  </View>
                  <View style={styles.guideInfo}>
                    <Text style={styles.guideTitle}>{guide.title}</Text>
                    <Text style={styles.guideCategory}>
                      {CATEGORIES.find(c => c.id === guide.category_id)?.name || guide.category_id}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, guide.is_active ? styles.activeBadge : styles.inactiveBadge]}>
                    <Text style={[styles.statusText, guide.is_active ? styles.activeText : styles.inactiveText]}>
                      {guide.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.guideDescription} numberOfLines={2}>{guide.description}</Text>
                
                <View style={styles.guideMeta}>
                  <Text style={styles.guideMetaText}>Order: {guide.order}</Text>
                  {guide.has_image && (
                    <View style={styles.hasImageBadge}>
                      <Ionicons name="image" size={12} color={COLORS.primary} />
                      <Text style={styles.hasImageText}>Has Image</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.guideActions}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => openEditModal(guide)}
                  >
                    <Ionicons name="pencil" size={16} color={COLORS.primary} />
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleToggleActive(guide)}
                  >
                    <Ionicons 
                      name={guide.is_active ? 'eye-off' : 'eye'} 
                      size={16} 
                      color={guide.is_active ? COLORS.warning : COLORS.primary} 
                    />
                    <Text style={[styles.actionButtonText, { color: guide.is_active ? COLORS.warning : COLORS.primary }]}>
                      {guide.is_active ? 'Deactivate' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleDeleteGuide(guide.id)}
                  >
                    <Ionicons name="trash" size={16} color={COLORS.danger} />
                    <Text style={[styles.actionButtonText, { color: COLORS.danger }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingGuide ? 'Edit Guide' : 'New Photography Guide'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {/* Category Select */}
              <Text style={styles.inputLabel}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorySelect}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryOption,
                      formData.category_id === cat.id && styles.categoryOptionSelected
                    ]}
                    onPress={() => setFormData({ ...formData, category_id: cat.id })}
                  >
                    <Text style={[
                      styles.categoryOptionText,
                      formData.category_id === cat.id && styles.categoryOptionTextSelected
                    ]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              {/* Title */}
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="e.g., Clean background"
                placeholderTextColor="#999"
              />
              
              {/* Description */}
              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="e.g., Use a neutral backdrop to make your item stand out"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
              
              {/* Icon */}
              <Text style={styles.inputLabel}>Icon (Ionicons name)</Text>
              <TextInput
                style={styles.textInput}
                value={formData.icon}
                onChangeText={(text) => setFormData({ ...formData, icon: text })}
                placeholder="camera-outline"
                placeholderTextColor="#999"
              />
              
              {/* Order */}
              <Text style={styles.inputLabel}>Display Order</Text>
              <TextInput
                style={styles.textInput}
                value={formData.order.toString()}
                onChangeText={(text) => setFormData({ ...formData, order: parseInt(text) || 0 })}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#999"
              />
              
              {/* Active Toggle */}
              <TouchableOpacity 
                style={styles.toggleRow}
                onPress={() => setFormData({ ...formData, is_active: !formData.is_active })}
              >
                <Text style={styles.inputLabel}>Active</Text>
                <View style={[styles.toggle, formData.is_active && styles.toggleActive]}>
                  <View style={[styles.toggleThumb, formData.is_active && styles.toggleThumbActive]} />
                </View>
              </TouchableOpacity>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveGuide}
              >
                <Text style={styles.saveButtonText}>
                  {editingGuide ? 'Update' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    padding: 8,
    borderRadius: 8,
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  actionRow: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  seedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  seedButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: COLORS.text,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  guidesList: {
    padding: 16,
    gap: 12,
  },
  guideCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  guideIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideInfo: {
    flex: 1,
    marginLeft: 12,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  guideCategory: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: COLORS.primaryLight,
  },
  inactiveBadge: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeText: {
    color: COLORS.primary,
  },
  inactiveText: {
    color: COLORS.warning,
  },
  guideDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  guideMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  guideMetaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  hasImageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hasImageText: {
    fontSize: 12,
    color: COLORS.primary,
  },
  guideActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButtonText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
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
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categorySelect: {
    marginBottom: 8,
  },
  categoryOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryOptionSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  categoryOptionText: {
    fontSize: 13,
    color: COLORS.text,
  },
  categoryOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    padding: 3,
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
  },
  toggleThumbActive: {
    transform: [{ translateX: 22 }],
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
