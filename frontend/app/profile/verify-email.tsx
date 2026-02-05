import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/utils/api';
import { useAuthStore } from '../../src/store/authStore';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  success: '#388E3C',
  warning: '#F57C00',
  info: '#1976D2',
};

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    // Check current verification status
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const response = await api.get('/profile');
      if (response.data.email_verified || response.data.verified) {
        setVerified(true);
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const handleSendVerification = async () => {
    setSending(true);
    try {
      await api.post('/auth/send-verification-email');
      setSent(true);
      Alert.alert(
        'Email Sent!',
        'Check your inbox for the verification link. It may take a few minutes to arrive.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to send verification email');
    } finally {
      setSending(false);
    }
  };

  const handleCheckVerification = async () => {
    setChecking(true);
    try {
      const response = await api.get('/profile');
      if (response.data.email_verified || response.data.verified) {
        setVerified(true);
        Alert.alert('Success!', 'Your email has been verified.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Not Verified', 'Your email is not verified yet. Please check your inbox and click the verification link.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to check verification status');
    } finally {
      setChecking(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verify Email</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="lock-closed-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.loginMessage}>Please sign in first</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/login')}>
            <Text style={styles.primaryBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (verified) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Email Verified</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
          </View>
          <Text style={styles.successTitle}>Email Verified!</Text>
          <Text style={styles.successSubtitle}>Your email address has been successfully verified.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify Email</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-outline" size={64} color={COLORS.primary} />
        </View>

        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We'll send a verification link to:
        </Text>
        <Text style={styles.email}>{user?.email}</Text>

        {!sent ? (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleSendVerification}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send-outline" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>Send Verification Email</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.sentCard}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              <Text style={styles.sentText}>Verification email sent!</Text>
            </View>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleSendVerification}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <Text style={styles.secondaryBtnText}>Resend Email</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 16 }]}
          onPress={handleCheckVerification}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>I've Verified My Email</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.info} />
          <Text style={styles.infoText}>
            Can't find the email? Check your spam folder or try resending.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  loginMessage: { fontSize: 15, color: COLORS.textSecondary },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 4,
    marginBottom: 24,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
  },
  primaryBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  secondaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  sentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
  },
  sentText: { fontSize: 15, fontWeight: '600', color: COLORS.success },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#E3F2FD',
    padding: 14,
    borderRadius: 12,
    marginTop: 24,
    width: '100%',
  },
  infoText: { flex: 1, fontSize: 13, color: COLORS.info, lineHeight: 18 },
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  successSubtitle: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center' },
});
