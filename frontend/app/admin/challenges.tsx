import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/utils/api';
import { useAuthStore } from '../../src/store/authStore';
import { useResponsive } from '../../src/hooks/useResponsive';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  success: '#22C55E',
  successLight: '#DCFCE7',
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
};

interface Challenge {
  id: string;
  name: string;
  description: string;
  type: 'weekly' | 'monthly' | 'seasonal' | 'custom';
  target: number;
  criteria_type: string;
  icon: string;
  color: string;
  badge_name: string;
  badge_description: string;
  badge_points: number;
  start_date: string;
  end_date: string;
  required_categories?: string[];
  is_active: boolean;
  participant_count?: number;
  completion_count?: number;
}

interface ChallengeFormData {
  name: string;
  description: string;
  type: 'weekly' | 'monthly' | 'seasonal' | 'custom';
  target: string;
  criteria_type: string;
  icon: string;
  color: string;
  badge_name: string;
  badge_description: string;
  badge_points: string;
  start_date: string;
  end_date: string;
  required_categories: string;
}

const CRITERIA_TYPES = [
  { value: 'listings', label: 'Listings Created' },
  { value: 'sales', label: 'Items Sold' },
  { value: 'revenue', label: 'Revenue (€)' },
  { value: 'messages', label: 'Messages Sent' },
  { value: 'category_listings', label: 'Category-Specific Listings' },
  { value: 'category_sales', label: 'Category-Specific Sales' },
];

const ICONS = ['trophy', 'star', 'medal', 'ribbon', 'flame', 'rocket', 'gift', 'heart', 'flash', 'diamond'];
const COLORS_LIST = ['#2E7D32', '#F97316', '#8B5CF6', '#EC4899', '#EF4444', '#22C55E', '#3B82F6', '#F59E0B'];

const CHALLENGE_TYPES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'custom', label: 'Custom' },
];

const initialFormData: ChallengeFormData = {
  name: '',
  description: '',
  type: 'weekly',
  target: '10',
  criteria_type: 'listings',
  icon: 'trophy',
  color: '#2E7D32',
  badge_name: '',
  badge_description: '',
  badge_points: '50',
  start_date: '',
  end_date: '',
  required_categories: '',
};

export default function AdminChallengesScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { isDesktop, isTablet } = useResponsive();
  const isLargeScreen = isDesktop || isTablet;

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [formData, setFormData] = useState<ChallengeFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'ended'>('all');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    participants: 0,
    completions: 0,
  });

  const fetchChallenges = useCallback(async (refresh: boolean = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      // Fetch challenges from the backend - using regular challenges endpoint for now
      // In a full implementation, you'd have a dedicated admin endpoint
      const response = await api.get('/challenges');
      const allChallenges = response.data.challenges || [];
      
      setChallenges(allChallenges);
      
      // Calculate stats
      const now = new Date();
      const activeChallenges = allChallenges.filter((c: Challenge) => new Date(c.end_date) > now);
      setStats({
        total: allChallenges.length,
        active: activeChallenges.length,
        participants: allChallenges.reduce((sum: number, c: Challenge) => sum + (c.participant_count || 0), 0),
        completions: allChallenges.reduce((sum: number, c: Challenge) => sum + (c.completion_count || 0), 0),
      });
    } catch (error) {
      console.error('Error fetching challenges:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const handleCreateChallenge = () => {
    setEditingChallenge(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const handleEditChallenge = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setFormData({
      name: challenge.name,
      description: challenge.description,
      type: challenge.type,
      target: challenge.target.toString(),
      criteria_type: challenge.criteria_type || 'listings',
      icon: challenge.icon,
      color: challenge.color,
      badge_name: challenge.badge_name || '',
      badge_description: challenge.badge_description || '',
      badge_points: (challenge.badge_points || 50).toString(),
      start_date: challenge.start_date?.split('T')[0] || '',
      end_date: challenge.end_date?.split('T')[0] || '',
      required_categories: challenge.required_categories?.join(', ') || '',
    });
    setShowModal(true);
  };

  const handleDeleteChallenge = async (challengeId: string) => {
    const confirmDelete = Platform.OS === 'web' 
      ? window.confirm('Are you sure you want to delete this challenge?')
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Delete Challenge',
            'Are you sure you want to delete this challenge?',
            [
              { text: 'Cancel', onPress: () => resolve(false) },
              { text: 'Delete', onPress: () => resolve(true), style: 'destructive' },
            ]
          );
        });

    if (!confirmDelete) return;

    try {
      await api.delete(`/admin/challenges/${challengeId}`);
      setChallenges(prev => prev.filter(c => c.id !== challengeId));
      if (Platform.OS === 'web') {
        alert('Challenge deleted successfully');
      } else {
        Alert.alert('Success', 'Challenge deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting challenge:', error);
      if (Platform.OS === 'web') {
        alert('Failed to delete challenge');
      } else {
        Alert.alert('Error', 'Failed to delete challenge');
      }
    }
  };

  const handleSaveChallenge = async () => {
    if (!formData.name || !formData.description || !formData.target) {
      if (Platform.OS === 'web') {
        alert('Please fill in all required fields');
      } else {
        Alert.alert('Error', 'Please fill in all required fields');
      }
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        target: parseInt(formData.target),
        criteria_type: formData.criteria_type,
        icon: formData.icon,
        color: formData.color,
        badge_name: formData.badge_name || formData.name,
        badge_description: formData.badge_description || `Completed the ${formData.name} challenge`,
        badge_points: parseInt(formData.badge_points),
        start_date: formData.start_date || new Date().toISOString(),
        end_date: formData.end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        required_categories: formData.required_categories 
          ? formData.required_categories.split(',').map(s => s.trim()).filter(Boolean)
          : [],
      };

      if (editingChallenge) {
        await api.put(`/admin/challenges/${editingChallenge.id}`, payload);
      } else {
        await api.post('/admin/challenges', payload);
      }

      setShowModal(false);
      fetchChallenges(true);
      
      if (Platform.OS === 'web') {
        alert(editingChallenge ? 'Challenge updated successfully' : 'Challenge created successfully');
      } else {
        Alert.alert('Success', editingChallenge ? 'Challenge updated successfully' : 'Challenge created successfully');
      }
    } catch (error) {
      console.error('Error saving challenge:', error);
      if (Platform.OS === 'web') {
        alert('Failed to save challenge');
      } else {
        Alert.alert('Error', 'Failed to save challenge');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSendReminder = async (challengeId: string) => {
    try {
      await api.post(`/admin/challenges/${challengeId}/send-reminder`);
      if (Platform.OS === 'web') {
        alert('Reminder emails sent successfully');
      } else {
        Alert.alert('Success', 'Reminder emails sent successfully');
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      if (Platform.OS === 'web') {
        alert('Failed to send reminders');
      } else {
        Alert.alert('Error', 'Failed to send reminders');
      }
    }
  };

  const getFilteredChallenges = () => {
    const now = new Date();
    switch (filter) {
      case 'active':
        return challenges.filter(c => new Date(c.end_date) > now);
      case 'ended':
        return challenges.filter(c => new Date(c.end_date) <= now);
      default:
        return challenges;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isEndingSoon = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const daysLeft = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysLeft > 0 && daysLeft <= 3;
  };

  const renderStatsCard = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Ionicons name="flag" size={24} color={COLORS.primary} />
        <Text style={styles.statValue}>{stats.total}</Text>
        <Text style={styles.statLabel}>Total</Text>
      </View>
      <View style={styles.statCard}>
        <Ionicons name="play-circle" size={24} color={COLORS.success} />
        <Text style={styles.statValue}>{stats.active}</Text>
        <Text style={styles.statLabel}>Active</Text>
      </View>
      <View style={styles.statCard}>
        <Ionicons name="people" size={24} color={COLORS.purple} />
        <Text style={styles.statValue}>{stats.participants}</Text>
        <Text style={styles.statLabel}>Participants</Text>
      </View>
      <View style={styles.statCard}>
        <Ionicons name="checkmark-circle" size={24} color={COLORS.warning} />
        <Text style={styles.statValue}>{stats.completions}</Text>
        <Text style={styles.statLabel}>Completions</Text>
      </View>
    </View>
  );

  const renderChallengeCard = (challenge: Challenge) => {
    const isEnded = new Date(challenge.end_date) <= new Date();
    const endingSoon = isEndingSoon(challenge.end_date);

    return (
      <View key={challenge.id} style={[styles.challengeCard, isEnded && styles.challengeCardEnded]} data-testid={`admin-challenge-${challenge.id}`}>
        <View style={styles.challengeHeader}>
          <View style={[styles.challengeIcon, { backgroundColor: `${challenge.color}20` }]}>
            <Ionicons name={challenge.icon as any} size={24} color={challenge.color} />
          </View>
          <View style={styles.challengeInfo}>
            <View style={styles.challengeTitleRow}>
              <Text style={styles.challengeName}>{challenge.name}</Text>
              <View style={[styles.typeBadge, { backgroundColor: getTypeBadgeColor(challenge.type) }]}>
                <Text style={[styles.typeText, { color: getTypeTextColor(challenge.type) }]}>
                  {challenge.type.charAt(0).toUpperCase() + challenge.type.slice(1)}
                </Text>
              </View>
            </View>
            <Text style={styles.challengeDescription} numberOfLines={2}>
              {challenge.description}
            </Text>
          </View>
        </View>

        <View style={styles.challengeMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="trophy-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>Target: {challenge.target}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{formatDate(challenge.start_date)} - {formatDate(challenge.end_date)}</Text>
          </View>
        </View>

        {endingSoon && !isEnded && (
          <View style={styles.endingSoonBadge}>
            <Ionicons name="warning" size={14} color={COLORS.warning} />
            <Text style={styles.endingSoonText}>Ending Soon!</Text>
          </View>
        )}

        <View style={styles.challengeActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.editBtn]}
            onPress={() => handleEditChallenge(challenge)}
          >
            <Ionicons name="pencil" size={16} color={COLORS.primary} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          
          {!isEnded && (
            <TouchableOpacity 
              style={[styles.actionBtn, styles.reminderBtn]}
              onPress={() => handleSendReminder(challenge.id)}
            >
              <Ionicons name="mail" size={16} color={COLORS.purple} />
              <Text style={styles.reminderBtnText}>Send Reminder</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDeleteChallenge(challenge.id)}
          >
            <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'weekly': return '#EEF2FF';
      case 'monthly': return '#FEF3C7';
      case 'seasonal': return '#FDF2F8';
      default: return COLORS.primaryLight;
    }
  };

  const getTypeTextColor = (type: string) => {
    switch (type) {
      case 'weekly': return '#6366F1';
      case 'monthly': return '#F59E0B';
      case 'seasonal': return '#EC4899';
      default: return COLORS.primary;
    }
  };

  const renderFormModal = () => (
    <Modal
      visible={showModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, isLargeScreen && styles.modalContentDesktop]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingChallenge ? 'Edit Challenge' : 'Create Challenge'}
            </Text>
            <TouchableOpacity onPress={() => setShowModal(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Name */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Challenge Name *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="e.g., Weekend Warrior"
              />
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description *</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder="Describe the challenge..."
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Type */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Challenge Type</Text>
              <View style={styles.typeSelector}>
                {CHALLENGE_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeOption,
                      formData.type === type.value && styles.typeOptionActive,
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, type: type.value as any }))}
                  >
                    <Text style={[
                      styles.typeOptionText,
                      formData.type === type.value && styles.typeOptionTextActive,
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Target & Criteria */}
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.formLabel}>Target *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.target}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, target: text }))}
                  keyboardType="numeric"
                  placeholder="10"
                />
              </View>
              <View style={[styles.formGroup, { flex: 2, marginLeft: 8 }]}>
                <Text style={styles.formLabel}>Criteria Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.criteriaSelector}>
                    {CRITERIA_TYPES.map(criteria => (
                      <TouchableOpacity
                        key={criteria.value}
                        style={[
                          styles.criteriaOption,
                          formData.criteria_type === criteria.value && styles.criteriaOptionActive,
                        ]}
                        onPress={() => setFormData(prev => ({ ...prev, criteria_type: criteria.value }))}
                      >
                        <Text style={[
                          styles.criteriaOptionText,
                          formData.criteria_type === criteria.value && styles.criteriaOptionTextActive,
                        ]}>
                          {criteria.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            {/* Dates */}
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.formLabel}>Start Date</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.start_date}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, start_date: text }))}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.formLabel}>End Date</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.end_date}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, end_date: text }))}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>

            {/* Icon & Color */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Icon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.iconSelector}>
                  {ICONS.map(icon => (
                    <TouchableOpacity
                      key={icon}
                      style={[
                        styles.iconOption,
                        formData.icon === icon && styles.iconOptionActive,
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, icon }))}
                    >
                      <Ionicons name={icon as any} size={24} color={formData.icon === icon ? COLORS.primary : COLORS.textSecondary} />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Color</Text>
              <View style={styles.colorSelector}>
                {COLORS_LIST.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      formData.color === color && styles.colorOptionActive,
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, color }))}
                  >
                    {formData.color === color && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Badge Reward */}
            <Text style={styles.sectionTitle}>Badge Reward</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Badge Name</Text>
              <TextInput
                style={styles.formInput}
                value={formData.badge_name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, badge_name: text }))}
                placeholder="Leave empty to use challenge name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Badge Description</Text>
              <TextInput
                style={styles.formInput}
                value={formData.badge_description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, badge_description: text }))}
                placeholder="Leave empty for default"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Badge Points</Text>
              <TextInput
                style={styles.formInput}
                value={formData.badge_points}
                onChangeText={(text) => setFormData(prev => ({ ...prev, badge_points: text }))}
                keyboardType="numeric"
                placeholder="50"
              />
            </View>

            {/* Categories (for category-specific challenges) */}
            {(formData.criteria_type === 'category_listings' || formData.criteria_type === 'category_sales') && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Required Categories (comma-separated)</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.required_categories}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, required_categories: text }))}
                  placeholder="Fashion, Home, Electronics"
                />
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelBtn}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSaveChallenge}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {editingChallenge ? 'Update' : 'Create'} Challenge
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading challenges...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const filteredChallenges = getFilteredChallenges();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Challenge Management</Text>
        <TouchableOpacity onPress={handleCreateChallenge} style={styles.addButton}>
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isLargeScreen && styles.scrollContentDesktop,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchChallenges(true)} tintColor={COLORS.primary} />
        }
      >
        {/* Stats */}
        {renderStatsCard()}

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          {(['all', 'active', 'ended'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterTab, filter === tab && styles.filterTabActive]}
              onPress={() => setFilter(tab)}
            >
              <Text style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Challenges List */}
        {filteredChallenges.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="flag-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No challenges found</Text>
            <Text style={styles.emptySubtext}>Create your first challenge to get started!</Text>
            <TouchableOpacity style={styles.createBtn} onPress={handleCreateChallenge}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.createBtnText}>Create Challenge</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredChallenges.map(renderChallengeCard)
        )}
      </ScrollView>

      {renderFormModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
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
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  scrollContentDesktop: {
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  filterTabTextActive: {
    color: '#fff',
  },
  challengeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  challengeCardEnded: {
    opacity: 0.7,
  },
  challengeHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  challengeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  challengeName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  challengeDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  challengeMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  endingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  endingSoonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.warning,
  },
  challengeActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editBtn: {
    backgroundColor: COLORS.primaryLight,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primary,
  },
  reminderBtn: {
    backgroundColor: COLORS.purpleLight,
  },
  reminderBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.purple,
  },
  deleteBtn: {
    backgroundColor: COLORS.dangerLight,
    marginLeft: 'auto',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 20,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalContentDesktop: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
    borderRadius: 24,
    marginVertical: 40,
    maxHeight: '80%',
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
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formRow: {
    flexDirection: 'row',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeOptionActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  typeOptionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  typeOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  criteriaSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  criteriaOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  criteriaOptionActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  criteriaOptionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  criteriaOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  iconSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  colorSelector: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionActive: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
