import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
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
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={64} color="#2E7D32" />
        </View>
        
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>
          The admin dashboard runs on a separate port for security.
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Access Information</Text>
          <View style={styles.infoRow}>
            <Ionicons name="globe-outline" size={20} color="#666" />
            <Text style={styles.infoText}>Admin UI: http://localhost:3001</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="code-slash" size={20} color="#666" />
            <Text style={styles.infoText}>API Docs: http://localhost:8002/docs</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={20} color="#666" />
            <Text style={styles.infoText}>Email: admin@marketplace.com</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="key" size={20} color="#666" />
            <Text style={styles.infoText}>Password: Admin@123456</Text>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
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
