import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useResponsive } from '../src/hooks/useResponsive';

const COLORS = {
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  primary: '#2E7D32',
  border: '#E5E7EB',
};

const SAFETY_TIPS = [
  {
    icon: 'location-outline',
    title: 'Meet in Public Places',
    description: 'Always meet the buyer or seller in a public place like a coffee shop, mall, or police station parking lot. Avoid isolated locations.'
  },
  {
    icon: 'person-outline',
    title: 'Tell Someone',
    description: 'Let a friend or family member know where you\'re going, who you\'re meeting, and when you expect to be back.'
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Verify Identity',
    description: 'Ask for identification and verify the person matches their profile. Trust your instincts if something feels off.'
  },
  {
    icon: 'cash-outline',
    title: 'Use Secure Payment',
    description: 'Prefer cash or secure digital payments. Never send money in advance and be wary of unusual payment requests.'
  },
  {
    icon: 'eye-outline',
    title: 'Inspect Before Paying',
    description: 'Always inspect items in person before making payment. Test electronics, check for damage, and verify authenticity.'
  },
  {
    icon: 'document-text-outline',
    title: 'Keep Records',
    description: 'Save all communications, receipts, and documentation. Take photos of items and note serial numbers for valuable items.'
  },
  {
    icon: 'alert-circle-outline',
    title: 'Avoid Scams',
    description: 'Be cautious of deals that seem too good to be true, pressure to act quickly, or requests for personal financial information.'
  },
  {
    icon: 'call-outline',
    title: 'Report Suspicious Activity',
    description: 'If you encounter suspicious behavior, report it immediately through our platform or contact local authorities.'
  }
];

export default function SafetyTipsPage() {
  const router = useRouter();
  const { isDesktop } = useResponsive();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Safety Tips</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.content, isDesktop && { maxWidth: 800, alignSelf: 'center', width: '100%' }]}
      >
        <View style={styles.heroSection}>
          <Ionicons name="shield-checkmark" size={64} color={COLORS.primary} />
          <Text style={styles.heroTitle}>Stay Safe on Avida</Text>
          <Text style={styles.heroSubtitle}>
            Your safety is our priority. Follow these guidelines for secure transactions.
          </Text>
        </View>

        <View style={styles.tipsContainer}>
          {SAFETY_TIPS.map((tip, index) => (
            <View key={index} style={styles.tipCard}>
              <View style={styles.tipIconContainer}>
                <Ionicons name={tip.icon as any} size={24} color={COLORS.primary} />
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipDescription}>{tip.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.emergencySection}>
          <Text style={styles.emergencyTitle}>Need Help?</Text>
          <Text style={styles.emergencyText}>
            If you feel unsafe or suspect fraudulent activity, please contact local authorities immediately.
          </Text>
          <TouchableOpacity style={styles.reportButton} onPress={() => router.push('/help')}>
            <Ionicons name="flag-outline" size={20} color="#FFFFFF" />
            <Text style={styles.reportButtonText}>Report an Issue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  heroSection: { alignItems: 'center', paddingVertical: 32, backgroundColor: COLORS.surface, borderRadius: 16, marginBottom: 24 },
  heroTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginTop: 16, marginBottom: 8 },
  heroSubtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  tipsContainer: { gap: 12 },
  tipCard: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, gap: 16 },
  tipIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  tipDescription: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  emergencySection: { backgroundColor: '#FEF3C7', borderRadius: 16, padding: 24, marginTop: 24, alignItems: 'center' },
  emergencyTitle: { fontSize: 18, fontWeight: '700', color: '#92400E', marginBottom: 8 },
  emergencyText: { fontSize: 14, color: '#92400E', textAlign: 'center', marginBottom: 16 },
  reportButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D97706', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  reportButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
