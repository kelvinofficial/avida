import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
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
  error: '#D32F2F',
};

const ID_TYPES = [
  { value: 'NIN', label: 'National ID Number (NIN)' },
  { value: 'Passport', label: 'International Passport' },
  { value: 'DriversLicense', label: "Driver's License" },
  { value: 'NationalID', label: 'National ID Card' },
];

export default function VerifyIDScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [step, setStep] = useState<'info' | 'form' | 'upload' | 'submitted'>('info');
  const [submitting, setSubmitting] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [idType, setIdType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [docFront, setDocFront] = useState<string | null>(null);
  const [docBack, setDocBack] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);

  const handlePickImage = async (type: 'front' | 'back' | 'selfie') => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'selfie' ? [1, 1] : [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const imageUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      
      if (type === 'front') setDocFront(imageUri);
      else if (type === 'back') setDocBack(imageUri);
      else setSelfie(imageUri);
    }
  };

  const handleTakeSelfie = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow camera access');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setSelfie(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSubmit = async () => {
    if (!fullName || !dob || !idType || !idNumber) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (!docFront || !docBack || !selfie) {
      Alert.alert('Error', 'Please upload all required documents');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/profile/verify-id', {
        full_name: fullName,
        dob,
        id_type: idType,
        id_number: idNumber,
        doc_front_url: docFront,
        doc_back_url: docBack,
        selfie_url: selfie,
      });
      
      setStep('submitted');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to submit verification');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ID Verification</Text>
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

  if (step === 'submitted') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verification Submitted</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <View style={styles.pendingIcon}>
            <Ionicons name="hourglass-outline" size={64} color={COLORS.warning} />
          </View>
          <Text style={styles.pendingTitle}>Under Review</Text>
          <Text style={styles.pendingSubtitle}>
            Your ID verification has been submitted and is currently under review. This usually takes 1-3 business days.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'info') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ID Verification</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark-outline" size={64} color={COLORS.primary} />
          </View>
          
          <Text style={styles.title}>Verify Your Identity</Text>
          <Text style={styles.subtitle}>
            Complete ID verification to unlock full platform features and build trust with other users.
          </Text>

          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              <Text style={styles.benefitText}>Get a verified badge on your profile</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              <Text style={styles.benefitText}>Increase buyer confidence</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              <Text style={styles.benefitText}>Access premium features</Text>
            </View>
          </View>

          <View style={styles.requirementsList}>
            <Text style={styles.requirementsTitle}>You'll need:</Text>
            <Text style={styles.requirementItem}>• A valid government-issued ID</Text>
            <Text style={styles.requirementItem}>• Photos of ID front and back</Text>
            <Text style={styles.requirementItem}>• A selfie holding your ID</Text>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('form')}>
            <Text style={styles.primaryBtnText}>Start Verification</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStep(step === 'upload' ? 'form' : 'info')}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 'form' ? 'Personal Details' : 'Upload Documents'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.formContent}>
          {step === 'form' ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name (as on ID)</Text>
                <TextInput
                  style={styles.textInput}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date of Birth</Text>
                <TextInput
                  style={styles.textInput}
                  value={dob}
                  onChangeText={setDob}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ID Type</Text>
                <View style={styles.idTypeContainer}>
                  {ID_TYPES.map(type => (
                    <TouchableOpacity
                      key={type.value}
                      style={[styles.idTypeOption, idType === type.value && styles.idTypeOptionSelected]}
                      onPress={() => setIdType(type.value)}
                    >
                      <Text style={[styles.idTypeText, idType === type.value && styles.idTypeTextSelected]}>
                        {type.label}
                      </Text>
                      {idType === type.value && (
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ID Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={idNumber}
                  onChangeText={setIdNumber}
                  placeholder="Enter ID number"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('upload')}>
                <Text style={styles.primaryBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.uploadSection}>
                <Text style={styles.uploadLabel}>ID Front</Text>
                <TouchableOpacity
                  style={[styles.uploadBox, docFront && styles.uploadBoxFilled]}
                  onPress={() => handlePickImage('front')}
                >
                  {docFront ? (
                    <Image source={{ uri: docFront }} style={styles.uploadedImage} />
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={32} color={COLORS.textSecondary} />
                      <Text style={styles.uploadText}>Tap to upload front of ID</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.uploadSection}>
                <Text style={styles.uploadLabel}>ID Back</Text>
                <TouchableOpacity
                  style={[styles.uploadBox, docBack && styles.uploadBoxFilled]}
                  onPress={() => handlePickImage('back')}
                >
                  {docBack ? (
                    <Image source={{ uri: docBack }} style={styles.uploadedImage} />
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={32} color={COLORS.textSecondary} />
                      <Text style={styles.uploadText}>Tap to upload back of ID</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.uploadSection}>
                <Text style={styles.uploadLabel}>Selfie with ID</Text>
                <TouchableOpacity
                  style={[styles.uploadBox, styles.selfieBox, selfie && styles.uploadBoxFilled]}
                  onPress={handleTakeSelfie}
                >
                  {selfie ? (
                    <Image source={{ uri: selfie }} style={styles.selfieImage} />
                  ) : (
                    <>
                      <Ionicons name="person-outline" size={48} color={COLORS.textSecondary} />
                      <Text style={styles.uploadText}>Take a selfie holding your ID</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={20} color="#fff" />
                    <Text style={styles.primaryBtnText}>Submit for Verification</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  content: { padding: 24, alignItems: 'center' },
  formContent: { padding: 16 },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  benefitsList: { width: '100%', gap: 12, marginBottom: 24 },
  benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitText: { fontSize: 15, color: COLORS.text },
  requirementsList: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  requirementsTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  requirementItem: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
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
  primaryBtnDisabled: { opacity: 0.7 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  textInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text,
  },
  idTypeContainer: { gap: 8 },
  idTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
  },
  idTypeOptionSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  idTypeText: { fontSize: 14, color: COLORS.text },
  idTypeTextSelected: { fontWeight: '600', color: COLORS.primary },
  uploadSection: { marginBottom: 20 },
  uploadLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  uploadBox: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBoxFilled: { borderStyle: 'solid', borderColor: COLORS.primary },
  selfieBox: { height: 160 },
  uploadText: { fontSize: 13, color: COLORS.textSecondary, marginTop: 8 },
  uploadedImage: { width: '100%', height: '100%', borderRadius: 10 },
  selfieImage: { width: 120, height: 120, borderRadius: 60 },
  pendingIcon: { marginBottom: 16 },
  pendingTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  pendingSubtitle: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
});
