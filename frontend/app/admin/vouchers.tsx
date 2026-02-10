import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/utils/api';
import { useAuthStore } from '../../src/store/authStore';
import { safeGoBack } from '../../src/utils/navigation';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  error: '#D32F2F',
  success: '#4CAF50',
  warning: '#FF9800',
  premium: '#FF8F00',
  amount: '#1976D2',
  percent: '#9C27B0',
  credit: '#FF8F00',
};

interface Voucher {
  id: string;
  code: string;
  voucher_type: 'amount' | 'percent' | 'credit';
  value: number;
  description?: string;
  status: string;
  total_uses: number;
  max_uses?: number;
  max_uses_per_user: number;
  min_order_amount?: number;
  valid_until?: string;
  is_active: boolean;
  created_at: string;
}

interface Stats {
  total_vouchers: number;
  active_vouchers: number;
  total_redemptions: number;
  total_discount_given: number;
  by_type: Record<string, number>;
}

export default function VouchersManagementPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Create form
  const [newVoucher, setNewVoucher] = useState({
    code: '',
    voucher_type: 'percent' as 'amount' | 'percent' | 'credit',
    value: '',
    description: '',
    max_uses: '',
    max_uses_per_user: '1',
    min_order_amount: '',
    valid_days: '30',
  });

  const fetchData = useCallback(async () => {
    try {
      const [vouchersRes, statsRes] = await Promise.all([
        api.get('/vouchers/admin/list'),
        api.get('/vouchers/admin/stats'),
      ]);
      setVouchers(vouchersRes.data.vouchers || []);
      setStats(statsRes.data);
    } catch (error: any) {
      console.error('Error fetching vouchers:', error);
      if (error.response?.status === 403) {
        Alert.alert('Access Denied', 'Admin access required');
        router.back();
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    fetchData();
  }, [isAuthenticated, fetchData, router]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleCreateVoucher = async () => {
    if (!newVoucher.code.trim()) {
      Alert.alert('Error', 'Voucher code is required');
      return;
    }
    if (!newVoucher.value || parseFloat(newVoucher.value) <= 0) {
      Alert.alert('Error', 'Value must be greater than 0');
      return;
    }

    setCreating(true);
    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + parseInt(newVoucher.valid_days || '30'));

      await api.post('/vouchers/admin/create', {
        code: newVoucher.code.toUpperCase(),
        voucher_type: newVoucher.voucher_type,
        value: parseFloat(newVoucher.value),
        description: newVoucher.description || null,
        max_uses: newVoucher.max_uses ? parseInt(newVoucher.max_uses) : null,
        max_uses_per_user: parseInt(newVoucher.max_uses_per_user || '1'),
        min_order_amount: newVoucher.min_order_amount ? parseFloat(newVoucher.min_order_amount) : null,
        valid_until: validUntil.toISOString(),
      });

      Alert.alert('Success', 'Voucher created successfully');
      setShowCreateModal(false);
      setNewVoucher({
        code: '', voucher_type: 'percent', value: '', description: '',
        max_uses: '', max_uses_per_user: '1', min_order_amount: '', valid_days: '30'
      });
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create voucher');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (voucher: Voucher) => {
    try {
      await api.put(`/vouchers/admin/${voucher.id}`, { is_active: !voucher.is_active });
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update voucher');
    }
  };

  const handleDeleteVoucher = (voucher: Voucher) => {
    Alert.alert(
      'Delete Voucher',
      `Are you sure you want to delete voucher "${voucher.code}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/vouchers/admin/${voucher.id}`);
              fetchData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete voucher');
            }
          }
        }
      ]
    );
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'amount': return COLORS.amount;
      case 'percent': return COLORS.percent;
      case 'credit': return COLORS.credit;
      default: return COLORS.textSecondary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return COLORS.success;
      case 'expired': return COLORS.error;
      case 'depleted': return COLORS.warning;
      default: return COLORS.textSecondary;
    }
  };

  const formatValue = (voucher: Voucher) => {
    switch (voucher.voucher_type) {
      case 'amount': return `$${voucher.value.toFixed(2)}`;
      case 'percent': return `${voucher.value}%`;
      case 'credit': return `${voucher.value} Credits`;
      default: return voucher.value;
    }
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vouchers & Discounts</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vouchers & Discounts</Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {/* Stats */}
        {stats && (
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: COLORS.primaryLight }]}>
              <Text style={styles.statValue}>{stats.total_vouchers}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
              <Text style={styles.statValue}>{stats.active_vouchers}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
              <Text style={styles.statValue}>{stats.total_redemptions}</Text>
              <Text style={styles.statLabel}>Redeemed</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FCE4EC' }]}>
              <Text style={styles.statValue}>${stats.total_discount_given.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Discount Given</Text>
            </View>
          </View>
        )}

        {/* Vouchers List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Vouchers ({vouchers.length})</Text>
          
          {vouchers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="pricetag-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>No vouchers yet</Text>
              <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.createBtnText}>Create First Voucher</Text>
              </TouchableOpacity>
            </View>
          ) : (
            vouchers.map(voucher => (
              <View key={voucher.id} style={styles.voucherCard}>
                <View style={styles.voucherHeader}>
                  <View style={styles.voucherCode}>
                    <Text style={styles.codeText}>{voucher.code}</Text>
                    <View style={[styles.typeBadge, { backgroundColor: getTypeColor(voucher.voucher_type) + '20' }]}>
                      <Text style={[styles.typeText, { color: getTypeColor(voucher.voucher_type) }]}>
                        {voucher.voucher_type.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(voucher.status) + '20' }]}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(voucher.status) }]} />
                    <Text style={[styles.statusText, { color: getStatusColor(voucher.status) }]}>
                      {voucher.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.voucherBody}>
                  <View style={styles.valueRow}>
                    <Text style={styles.valueLabel}>Value:</Text>
                    <Text style={[styles.valueText, { color: getTypeColor(voucher.voucher_type) }]}>
                      {formatValue(voucher)}
                    </Text>
                  </View>
                  <View style={styles.statsRow}>
                    <Text style={styles.usageText}>
                      Used: {voucher.total_uses}{voucher.max_uses ? `/${voucher.max_uses}` : ''}
                    </Text>
                    {voucher.min_order_amount && (
                      <Text style={styles.minOrder}>Min: ${voucher.min_order_amount}</Text>
                    )}
                  </View>
                  {voucher.description && (
                    <Text style={styles.description}>{voucher.description}</Text>
                  )}
                </View>

                <View style={styles.voucherActions}>
                  <View style={styles.toggleRow}>
                    <Text style={styles.toggleLabel}>Active</Text>
                    <Switch
                      value={voucher.is_active}
                      onValueChange={() => handleToggleActive(voucher)}
                      trackColor={{ false: '#E0E0E0', true: COLORS.primaryLight }}
                      thumbColor={voucher.is_active ? COLORS.primary : '#f4f3f4'}
                    />
                  </View>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteVoucher(voucher)}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showCreateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Voucher</Text>

            <TextInput
              style={styles.input}
              value={newVoucher.code}
              onChangeText={(text) => setNewVoucher({ ...newVoucher, code: text.toUpperCase() })}
              placeholder="Voucher Code (e.g., SAVE20)"
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="characters"
            />

            <View style={styles.typeSelector}>
              {(['amount', 'percent', 'credit'] as const).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeOption,
                    newVoucher.voucher_type === type && { backgroundColor: getTypeColor(type), borderColor: getTypeColor(type) }
                  ]}
                  onPress={() => setNewVoucher({ ...newVoucher, voucher_type: type })}
                >
                  <Text style={[
                    styles.typeOptionText,
                    newVoucher.voucher_type === type && { color: '#fff' }
                  ]}>
                    {type === 'amount' ? '$ Amount' : type === 'percent' ? '% Percent' : 'Credit'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              value={newVoucher.value}
              onChangeText={(text) => setNewVoucher({ ...newVoucher, value: text })}
              placeholder={newVoucher.voucher_type === 'percent' ? 'Discount % (e.g., 20)' : 'Amount (e.g., 10)'}
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              value={newVoucher.description}
              onChangeText={(text) => setNewVoucher({ ...newVoucher, description: text })}
              placeholder="Description (optional)"
              placeholderTextColor={COLORS.textSecondary}
            />

            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                value={newVoucher.max_uses}
                onChangeText={(text) => setNewVoucher({ ...newVoucher, max_uses: text })}
                placeholder="Max Uses"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={newVoucher.valid_days}
                onChangeText={(text) => setNewVoucher({ ...newVoucher, valid_days: text })}
                placeholder="Valid Days"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreateModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.submitBtn, creating && styles.submitBtnDisabled]} 
                onPress={handleCreateVoucher}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Create Voucher</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  addBtn: { padding: 8 },
  content: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  statsGrid: { flexDirection: 'row', padding: 16, gap: 8 },
  statCard: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  section: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 12 },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 12, marginBottom: 20 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  createBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  voucherCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  voucherHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  voucherCode: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  codeText: { fontSize: 16, fontWeight: '700', color: COLORS.text, fontFamily: 'monospace' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText: { fontSize: 10, fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '500', textTransform: 'capitalize' },

  voucherBody: { borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 12, marginBottom: 12 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  valueLabel: { fontSize: 13, color: COLORS.textSecondary },
  valueText: { fontSize: 18, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 16 },
  usageText: { fontSize: 12, color: COLORS.textSecondary },
  minOrder: { fontSize: 12, color: COLORS.textSecondary },
  description: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8, fontStyle: 'italic' },

  voucherActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleLabel: { fontSize: 13, color: COLORS.textSecondary },
  deleteBtn: { padding: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 20, textAlign: 'center' },

  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text, marginBottom: 12 },
  
  typeSelector: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeOption: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  typeOptionText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },

  row: { flexDirection: 'row' },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, color: COLORS.textSecondary },
  submitBtn: { flex: 2, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
