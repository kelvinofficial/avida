import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Linking } from 'react-native';
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
  primaryLight: '#E8F5E9',
  border: '#E5E7EB',
};

const CONTACT_OPTIONS = [
  { icon: 'mail-outline', title: 'Email Support', subtitle: 'support@avida.com', action: 'mailto:support@avida.com' },
  { icon: 'chatbubble-outline', title: 'Live Chat', subtitle: 'Available 24/7', action: 'chat' },
  { icon: 'call-outline', title: 'Phone Support', subtitle: '+1 (800) 123-4567', action: 'tel:+18001234567' },
];

export default function ContactUsPage() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (!name || !email || !message) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }
    Alert.alert('Message Sent', 'Thank you for contacting us. We\'ll get back to you within 24 hours.', [
      { text: 'OK', onPress: () => { setName(''); setEmail(''); setSubject(''); setMessage(''); } }
    ]);
  };

  const handleContactOption = (action: string) => {
    if (action === 'chat') {
      Alert.alert('Live Chat', 'Live chat feature coming soon!');
    } else {
      Linking.openURL(action);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Us</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.content, isDesktop && { maxWidth: 800, alignSelf: 'center', width: '100%' }]}
      >
        <View style={styles.heroSection}>
          <Ionicons name="chatbubbles" size={48} color={COLORS.primary} />
          <Text style={styles.heroTitle}>How can we help?</Text>
          <Text style={styles.heroSubtitle}>We're here to help and answer any questions you might have.</Text>
        </View>

        <Text style={styles.sectionTitle}>Quick Contact</Text>
        <View style={styles.contactOptions}>
          {CONTACT_OPTIONS.map((option, index) => (
            <TouchableOpacity key={index} style={styles.contactOption} onPress={() => handleContactOption(option.action)}>
              <View style={styles.contactIconContainer}>
                <Ionicons name={option.icon as any} size={24} color={COLORS.primary} />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactTitle}>{option.title}</Text>
                <Text style={styles.contactSubtitle}>{option.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Send us a Message</Text>
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={COLORS.textSecondary} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email *</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="your@email.com" keyboardType="email-address" placeholderTextColor={COLORS.textSecondary} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Subject</Text>
            <TextInput style={styles.input} value={subject} onChangeText={setSubject} placeholder="What's this about?" placeholderTextColor={COLORS.textSecondary} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Message *</Text>
            <TextInput style={[styles.input, styles.textArea]} value={message} onChangeText={setMessage} placeholder="Tell us more..." multiline numberOfLines={4} placeholderTextColor={COLORS.textSecondary} />
          </View>
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Send Message</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.officeInfo}>
          <Text style={styles.officeTitle}>Our Office</Text>
          <View style={styles.officeItem}>
            <Ionicons name="location-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.officeText}>123 Marketplace Ave, Suite 100{'\n'}San Francisco, CA 94105</Text>
          </View>
          <View style={styles.officeItem}>
            <Ionicons name="time-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.officeText}>Monday - Friday: 9am - 6pm PST{'\n'}Saturday - Sunday: Closed</Text>
          </View>
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
  content: { padding: 16, paddingBottom: 40 },
  heroSection: { alignItems: 'center', paddingVertical: 24, backgroundColor: COLORS.surface, borderRadius: 16, marginBottom: 24 },
  heroTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginTop: 12, marginBottom: 4 },
  heroSubtitle: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  contactOptions: { gap: 8, marginBottom: 24 },
  contactOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, gap: 12 },
  contactIconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  contactContent: { flex: 1 },
  contactTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  contactSubtitle: { fontSize: 14, color: COLORS.textSecondary },
  formContainer: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, gap: 16, marginBottom: 24 },
  inputGroup: { gap: 4 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.background },
  textArea: { height: 100, textAlignVertical: 'top' },
  submitButton: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  officeInfo: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20 },
  officeTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 16 },
  officeItem: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  officeText: { fontSize: 14, color: COLORS.textSecondary, flex: 1, lineHeight: 20 },
});
