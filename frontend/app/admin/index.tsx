import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function AdminRedirectScreen() {
  const router = useRouter();

  const openAdminDocs = () => {
    Linking.openURL('http://localhost:8002/docs');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={64} color="#2E7D32" />
        </View>
        
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>
          Manage users, business profiles, and verifications
        </Text>

        {/* Quick Actions - Row 1 */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/admin/users')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="people" size={24} color="#2E7D32" />
            </View>
            <Text style={styles.actionTitle}>Users & Verification</Text>
            <Text style={styles.actionDesc}>Manage users, sellers, and business profiles</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/admin/businessProfiles')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="storefront" size={24} color="#FF8F00" />
            </View>
            <Text style={styles.actionTitle}>Business Profiles</Text>
            <Text style={styles.actionDesc}>Review and manage business profiles</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions - Row 2 */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/admin/challenges')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FDF2F8' }]}>
              <Ionicons name="flag" size={24} color="#EC4899" />
            </View>
            <Text style={styles.actionTitle}>Challenges</Text>
            <Text style={styles.actionDesc}>Create and manage badge challenges</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/admin/analytics')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="bar-chart" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.actionTitle}>Analytics</Text>
            <Text style={styles.actionDesc}>View platform and seller analytics</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Full Admin Dashboard</Text>
          <Text style={styles.infoNote}>
            For full admin features including settings management, please use the Admin Dashboard:
          </Text>
          <TouchableOpacity 
            style={styles.dashboardButton}
            onPress={() => Linking.openURL('/api/admin-ui/')}
          >
            <Ionicons name="open-outline" size={20} color="#fff" />
            <Text style={styles.dashboardButtonText}>Open Admin Dashboard</Text>
          </TouchableOpacity>
          <View style={styles.credentialsBox}>
            <Text style={styles.credentialsTitle}>Default Credentials:</Text>
            <View style={styles.infoRow}>
              <Ionicons name="person" size={16} color="#666" />
              <Text style={styles.infoText}>admin@marketplace.com</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="key" size={16} color="#666" />
              <Text style={styles.infoText}>Admin@123456</Text>
            </View>
          </View>
        </View>

        <View style={styles.featuresList}>
          <Text style={styles.featuresTitle}>Admin Features</Text>
          <Text style={styles.featureItem}>• Dashboard Overview & Analytics</Text>
          <Text style={styles.featureItem}>• Category Management (Drag & Drop)</Text>
          <Text style={styles.featureItem}>• Dynamic Attributes per Category</Text>
          <Text style={styles.featureItem}>• Users Management (Ban/Unban)</Text>
          <Text style={styles.featureItem}>• Listings Moderation</Text>
          <Text style={styles.featureItem}>• Reports & Tickets System</Text>
          <Text style={styles.featureItem}>• Audit Logs</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={styles.buttonText}>Back to App</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    maxWidth: 400,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
  },
  featuresList: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 12,
  },
  featureItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2E7D32',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
