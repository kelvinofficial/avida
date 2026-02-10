import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
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
  verified: '#1976D2',
};

const HORIZONTAL_PADDING = 16;

// Categories for business profile selection
const CATEGORIES = [
  { id: 'auto_vehicles', name: 'Auto & Vehicles' },
  { id: 'properties', name: 'Properties' },
  { id: 'electronics', name: 'Electronics' },
  { id: 'phones_tablets', name: 'Phones & Tablets' },
  { id: 'home_furniture', name: 'Home & Furniture' },
  { id: 'fashion_beauty', name: 'Fashion & Beauty' },
  { id: 'jobs_services', name: 'Jobs & Services' },
  { id: 'kids_baby', name: 'Kids & Baby' },
  { id: 'sports_hobbies', name: 'Sports & Hobbies' },
  { id: 'pets', name: 'Pets' },
];

// ============ INPUT FIELD ============
const InputField = ({ 
  label, 
  value, 
  onChangeText, 
  placeholder,
  keyboardType = 'default',
  multiline = false,
  maxLength,
  required = false,
}: { 
  label: string; 
  value: string; 
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  multiline?: boolean;
  maxLength?: number;
  required?: boolean;
}) => (
  <View style={inputStyles.container}>
    <Text style={inputStyles.label}>
      {label} {required && <Text style={inputStyles.required}>*</Text>}
    </Text>
    <TextInput
      style={[inputStyles.input, multiline && inputStyles.multilineInput]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textSecondary}
      keyboardType={keyboardType}
      multiline={multiline}
      maxLength={maxLength}
    />
    {maxLength && (
      <Text style={inputStyles.charCount}>{value.length}/{maxLength}</Text>
    )}
  </View>
);

const inputStyles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  required: {
    color: COLORS.error,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
});

// ============ CATEGORY SELECTOR ============
const CategorySelector = ({
  selectedCategories,
  onToggle,
}: {
  selectedCategories: string[];
  onToggle: (id: string) => void;
}) => (
  <View style={catStyles.container}>
    <Text style={catStyles.label}>Primary Categories (select up to 5)</Text>
    <View style={catStyles.grid}>
      {CATEGORIES.map((cat) => {
        const isSelected = selectedCategories.includes(cat.id);
        return (
          <TouchableOpacity
            key={cat.id}
            style={[catStyles.chip, isSelected && catStyles.chipSelected]}
            onPress={() => onToggle(cat.id)}
            data-testid={`category-chip-${cat.id}`}
          >
            <Text style={[catStyles.chipText, isSelected && catStyles.chipTextSelected]}>
              {cat.name}
            </Text>
            {isSelected && (
              <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const catStyles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  chipTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

// ============ MAIN SCREEN ============
export default function BusinessProfileEditScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  
  // Form fields
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [logo, setLogo] = useState<string | undefined>();
  const [categories, setCategories] = useState<string[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('none');
  const [identifier, setIdentifier] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to manage your business profile',
        [{ text: 'OK', onPress: () => router.replace('/login') }]
      );
    }
  }, [isAuthenticated]);

  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const response = await api.get('/business-profiles/me');
      if (response.data.has_profile && response.data.profile) {
        const profile = response.data.profile;
        setHasProfile(true);
        setProfileId(profile.id);
        setBusinessName(profile.business_name || '');
        setDescription(profile.description || '');
        setPhone(profile.phone || '');
        setEmail(profile.email || '');
        setAddress(profile.address || '');
        setCity(profile.city || '');
        setCountry(profile.country || '');
        setLogo(profile.logo_url);
        setCategories(profile.primary_categories || []);
        setIsVerified(profile.is_verified || false);
        setVerificationStatus(profile.verification_status || 'none');
        setIdentifier(profile.identifier || '');
      }
    } catch (error: any) {
      console.error('Error fetching business profile:', error);
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'Please sign in again');
        router.replace('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleToggleCategory = (catId: string) => {
    if (categories.includes(catId)) {
      setCategories(categories.filter(c => c !== catId));
    } else if (categories.length < 5) {
      setCategories([...categories, catId]);
    } else {
      Alert.alert('Limit Reached', 'You can only select up to 5 categories');
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated) {
      Alert.alert('Error', 'Please sign in to save changes');
      return;
    }
    
    if (!businessName.trim()) {
      Alert.alert('Error', 'Business name is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        business_name: businessName.trim(),
        description: description.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
        primary_categories: categories,
      };

      if (hasProfile) {
        await api.put('/business-profiles/me', payload);
      } else {
        const response = await api.post('/business-profiles/', payload);
        setProfileId(response.data.id);
        setIdentifier(response.data.identifier);
        setHasProfile(true);
      }
      
      Alert.alert('Success', 'Business profile saved successfully');
    } catch (error: any) {
      console.error('Error saving business profile:', error);
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'Please sign in again', [
          { text: 'OK', onPress: () => router.replace('/login') }
        ]);
      } else {
        Alert.alert(
          'Error', 
          error.response?.data?.detail || 'Failed to save business profile'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUploadLogo = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      if (!hasProfile) {
        Alert.alert('Save First', 'Please save your business profile before uploading a logo');
        return;
      }

      try {
        // Create form data for file upload
        const formData = new FormData();
        formData.append('file', {
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: 'logo.jpg',
        } as any);

        const response = await api.post('/business-profiles/me/logo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        
        setLogo(response.data.logo_url);
        Alert.alert('Success', 'Logo uploaded successfully');
      } catch (error: any) {
        console.error('Error uploading logo:', error);
        Alert.alert('Error', error.response?.data?.detail || 'Failed to upload logo');
      }
    }
  };

  const handleRequestVerification = async () => {
    if (!hasProfile) {
      Alert.alert('Error', 'Please save your business profile first');
      return;
    }

    Alert.alert(
      'Request Verification',
      'Submit your profile for admin review to get a verified badge?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              await api.post('/business-profiles/me/request-verification', { message: '' });
              setVerificationStatus('pending');
              Alert.alert('Success', 'Verification request submitted. You will be notified once reviewed.');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to submit verification request');
            }
          }
        }
      ]
    );
  };

  const handleViewPublicProfile = () => {
    if (identifier) {
      router.push(`/business/${identifier}`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => safeGoBack(router)} data-testid="back-button">
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Business Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeGoBack(router)} data-testid="back-button">
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {hasProfile ? 'Edit Business Profile' : 'Create Business Profile'}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} data-testid="save-button">
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.saveBtn}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Verification Status Banner */}
          {hasProfile && (
            <View style={[
              styles.statusBanner, 
              isVerified ? styles.verifiedBanner : 
              verificationStatus === 'pending' ? styles.pendingBanner : styles.unverifiedBanner
            ]}>
              <View style={styles.statusRow}>
                <Ionicons 
                  name={isVerified ? "checkmark-circle" : verificationStatus === 'pending' ? "time" : "shield-outline"} 
                  size={20} 
                  color={isVerified ? COLORS.verified : verificationStatus === 'pending' ? '#FF9800' : COLORS.textSecondary} 
                />
                <Text style={[
                  styles.statusText,
                  isVerified && styles.verifiedText,
                  verificationStatus === 'pending' && styles.pendingText
                ]}>
                  {isVerified ? 'Verified Business' : 
                   verificationStatus === 'pending' ? 'Verification Pending' : 'Not Verified'}
                </Text>
              </View>
              {!isVerified && verificationStatus !== 'pending' && (
                <TouchableOpacity 
                  style={styles.verifyBtn} 
                  onPress={handleRequestVerification}
                  data-testid="request-verification-button"
                >
                  <Text style={styles.verifyBtnText}>Request Verification</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Logo Section */}
          <View style={styles.logoSection}>
            {logo ? (
              <Image source={{ uri: logo }} style={styles.logo} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="storefront-outline" size={48} color={COLORS.textSecondary} />
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.uploadLogoBtn} 
              onPress={handleUploadLogo}
              data-testid="upload-logo-button"
            >
              <Ionicons name="camera-outline" size={20} color={COLORS.primary} />
              <Text style={styles.uploadLogoBtnText}>
                {logo ? 'Change Logo' : 'Upload Logo'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Profile URL Preview */}
          {identifier && (
            <TouchableOpacity 
              style={styles.urlPreview} 
              onPress={handleViewPublicProfile}
              data-testid="view-public-profile-button"
            >
              <Ionicons name="link-outline" size={18} color={COLORS.primary} />
              <Text style={styles.urlText} numberOfLines={1}>
                /business/{identifier}
              </Text>
              <Ionicons name="open-outline" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Form Fields */}
          <InputField
            label="Business Name"
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="Enter your business name"
            required
          />

          <InputField
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Tell customers about your business..."
            multiline
            maxLength={2000}
          />

          <CategorySelector
            selectedCategories={categories}
            onToggle={handleToggleCategory}
          />

          <InputField
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            placeholder="+49 123 456 7890"
            keyboardType="phone-pad"
          />

          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="business@example.com"
            keyboardType="email-address"
          />

          <InputField
            label="Address"
            value={address}
            onChangeText={setAddress}
            placeholder="Street address"
          />

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <InputField
                label="City"
                value={city}
                onChangeText={setCity}
                placeholder="City"
              />
            </View>
            <View style={styles.halfInput}>
              <InputField
                label="Country"
                value={country}
                onChangeText={setCountry}
                placeholder="Country"
              />
            </View>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>
              Your business profile creates a public page showcasing your brand and listings. 
              Getting verified adds a badge that helps build trust with customers.
            </Text>
          </View>

          {/* Delete Profile Option */}
          {hasProfile && (
            <TouchableOpacity 
              style={styles.deleteBtn}
              onPress={() => {
                Alert.alert(
                  'Delete Business Profile',
                  'Are you sure you want to delete your business profile? This cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await api.delete('/business-profiles/me');
                          Alert.alert('Deleted', 'Your business profile has been deleted', [
                            { text: 'OK', onPress: () => router.back() }
                          ]);
                        } catch (error: any) {
                          Alert.alert('Error', error.response?.data?.detail || 'Failed to delete profile');
                        }
                      }
                    }
                  ]
                );
              }}
              data-testid="delete-profile-button"
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
              <Text style={styles.deleteBtnText}>Delete Business Profile</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  saveBtn: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: HORIZONTAL_PADDING,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  verifiedBanner: {
    backgroundColor: '#E3F2FD',
  },
  pendingBanner: {
    backgroundColor: '#FFF3E0',
  },
  unverifiedBanner: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  verifiedText: {
    color: COLORS.verified,
  },
  pendingText: {
    color: '#FF9800',
  },
  verifyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
  },
  verifyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  uploadLogoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    marginTop: 12,
  },
  uploadLogoBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  urlPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    marginBottom: 20,
  },
  urlText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    marginTop: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    marginTop: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
  },
});
