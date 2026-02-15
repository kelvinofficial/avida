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
  Linking,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-qr-code';
import api from '../../src/utils/api';
import { useAuthStore } from '../../src/store/authStore';
import { safeGoBack } from '../../src/utils/navigation';
import { useResponsive } from '../../src/hooks/useResponsive';
import { DesktopPageLayout } from '../../src/components/layout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  premium: '#FF8F00',
  premiumLight: '#FFF8E1',
};

const HORIZONTAL_PADDING = 16;

// Categories
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

// Social platforms config
const SOCIAL_PLATFORMS = [
  { id: 'facebook', name: 'Facebook', icon: 'logo-facebook', color: '#1877F2', placeholder: 'https://facebook.com/yourpage' },
  { id: 'instagram', name: 'Instagram', icon: 'logo-instagram', color: '#E4405F', placeholder: 'https://instagram.com/yourhandle' },
  { id: 'twitter', name: 'X (Twitter)', icon: 'logo-twitter', color: '#1DA1F2', placeholder: 'https://x.com/yourhandle' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'logo-linkedin', color: '#0A66C2', placeholder: 'https://linkedin.com/company/yourcompany' },
  { id: 'youtube', name: 'YouTube', icon: 'logo-youtube', color: '#FF0000', placeholder: 'https://youtube.com/@yourchannel' },
  { id: 'tiktok', name: 'TikTok', icon: 'logo-tiktok', color: '#000000', placeholder: 'https://tiktok.com/@yourhandle' },
  { id: 'whatsapp', name: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366', placeholder: '+1234567890' },
  { id: 'website', name: 'Website', icon: 'globe-outline', color: COLORS.primary, placeholder: 'https://yourwebsite.com' },
];

// Premium packages
const PREMIUM_PACKAGES = [
  { id: 'monthly', name: 'Monthly', amount: 29.99, currency: 'USD', duration: '1 month', savings: null },
  { id: 'quarterly', name: 'Quarterly', amount: 79.99, currency: 'USD', duration: '3 months', savings: '11%' },
  { id: 'yearly', name: 'Yearly', amount: 249.99, currency: 'USD', duration: '1 year', savings: '30%' },
];

// ============ INPUT FIELD ============
const InputField = ({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false, maxLength, required = false }: {
  label: string; value: string; onChangeText: (text: string) => void; placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad'; multiline?: boolean; maxLength?: number; required?: boolean;
}) => (
  <View style={inputStyles.container}>
    <Text style={inputStyles.label}>{label} {required && <Text style={inputStyles.required}>*</Text>}</Text>
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
    {maxLength && <Text style={inputStyles.charCount}>{value.length}/{maxLength}</Text>}
  </View>
);

const inputStyles = StyleSheet.create({
  container: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  required: { color: COLORS.error },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: COLORS.text },
  multilineInput: { minHeight: 100, textAlignVertical: 'top' },
  charCount: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'right', marginTop: 4 },
});

// ============ SECTION HEADER ============
const SectionHeader = ({ title, icon, expanded, onToggle }: { title: string; icon: string; expanded: boolean; onToggle: () => void }) => (
  <TouchableOpacity style={sectionStyles.header} onPress={onToggle} data-testid={`section-${title.toLowerCase().replace(/\s/g, '-')}`}>
    <View style={sectionStyles.headerLeft}>
      <Ionicons name={icon as any} size={20} color={COLORS.primary} />
      <Text style={sectionStyles.headerTitle}>{title}</Text>
    </View>
    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textSecondary} />
  </TouchableOpacity>
);

const sectionStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
});

// ============ CATEGORY SELECTOR ============
const CategorySelector = ({ selectedCategories, onToggle }: { selectedCategories: string[]; onToggle: (id: string) => void }) => (
  <View style={catStyles.container}>
    <Text style={catStyles.label}>Primary Categories (select up to 5)</Text>
    <View style={catStyles.grid}>
      {CATEGORIES.map((cat) => {
        const isSelected = selectedCategories.includes(cat.id);
        return (
          <TouchableOpacity key={cat.id} style={[catStyles.chip, isSelected && catStyles.chipSelected]} onPress={() => onToggle(cat.id)} data-testid={`category-chip-${cat.id}`}>
            <Text style={[catStyles.chipText, isSelected && catStyles.chipTextSelected]}>{cat.name}</Text>
            {isSelected && <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />}
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const catStyles = StyleSheet.create({
  container: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  chipSelected: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.textSecondary },
  chipTextSelected: { color: COLORS.primary, fontWeight: '600' },
});

// ============ MAIN SCREEN ============
export default function BusinessProfileEditScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { isDesktop, isTablet, isReady } = useResponsive();
  const isLargeScreen = isDesktop || isTablet;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  
  // Basic form fields
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [operatingHours, setOperatingHours] = useState('');
  const [logo, setLogo] = useState<string | undefined>();
  const [cover, setCover] = useState<string | undefined>();
  const [brandColor, setBrandColor] = useState('#2E7D32');
  const [categories, setCategories] = useState<string[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('none');
  const [identifier, setIdentifier] = useState('');
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<string | null>(null);
  
  // Social links
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [showSocialLinks, setShowSocialLinks] = useState(false);
  
  // Gallery
  const [galleryImages, setGalleryImages] = useState<Array<{id: string; url: string; caption?: string}>>([]);
  const [galleryVideos, setGalleryVideos] = useState<Array<{id: string; url: string; title?: string; thumbnail?: string}>>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  
  // Premium upgrade
  const [showPremiumUpgrade, setShowPremiumUpgrade] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState('monthly');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState('');
  
  // Success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successProfileUrl, setSuccessProfileUrl] = useState('');
  const [successProfileSlug, setSuccessProfileSlug] = useState('');
  
  // Pending image uploads (selected before profile saved)
  const [pendingLogoUri, setPendingLogoUri] = useState<string | null>(null);
  const [pendingCoverUri, setPendingCoverUri] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to manage your business profile', [{ text: 'OK', onPress: () => router.replace('/login') }]);
    }
  }, [isAuthenticated]);

  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return; }
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
        setCover(profile.cover_url);
        setBrandColor(profile.brand_color || '#2E7D32');
        setCategories(profile.primary_categories || []);
        setIsVerified(profile.is_verified || false);
        setIsPremium(profile.is_premium || false);
        setVerificationStatus(profile.verification_status || 'none');
        setIdentifier(profile.identifier || '');
        setPremiumExpiresAt(profile.premium_expires_at);
        setSocialLinks(profile.social_links || {});
        setGalleryImages(profile.gallery_images || []);
        setGalleryVideos(profile.gallery_videos || []);
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

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

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
    if (!isAuthenticated) { Alert.alert('Error', 'Please sign in to save changes'); return; }
    if (!businessName.trim()) { Alert.alert('Error', 'Business name is required'); return; }

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
        brand_color: brandColor,
        primary_categories: categories,
        social_links: socialLinks,
      };

      let profileSlug = identifier;
      let isNewProfile = false;
      
      if (hasProfile) {
        await api.put('/business-profiles/me', payload);
      } else {
        const response = await api.post('/business-profiles/', payload);
        setProfileId(response.data.id);
        setIdentifier(response.data.identifier);
        profileSlug = response.data.identifier;
        setHasProfile(true);
        isNewProfile = true;
        
        // Upload pending images after profile creation
        if (pendingLogoUri) {
          try {
            const formData = new FormData();
            formData.append('file', { uri: pendingLogoUri, type: 'image/jpeg', name: 'logo.jpg' } as any);
            const logoResponse = await api.post('/business-profiles/me/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setLogo(logoResponse.data.logo_url);
            setPendingLogoUri(null);
          } catch (e) {
            console.error('Failed to upload logo:', e);
          }
        }
        
        if (pendingCoverUri) {
          try {
            const formData = new FormData();
            formData.append('file', { uri: pendingCoverUri, type: 'image/jpeg', name: 'cover.jpg' } as any);
            const coverResponse = await api.post('/business-profiles/me/cover', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setCover(coverResponse.data.cover_url);
            setPendingCoverUri(null);
          } catch (e) {
            console.error('Failed to upload cover:', e);
          }
        }
      }
      
      // Show success modal with profile URL
      const baseUrl = (process.env.EXPO_PUBLIC_BACKEND_URL || '').replace('/api', '').replace(/\/$/, '');
      const profileUrl = `${baseUrl}/business/${profileSlug}`;
      setSuccessProfileUrl(profileUrl);
      setSuccessProfileSlug(profileSlug);
      setShowSuccessModal(true);
      
    } catch (error: any) {
      console.error('Error saving business profile:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save business profile');
    } finally {
      setSaving(false);
    }
  };

  // Helper to upload pending images (selected before profile is saved)
  const uploadPendingImage = async (uri: string, type: 'logo' | 'cover') => {
    const formData = new FormData();
    formData.append('file', { uri, type: 'image/jpeg', name: `${type}.jpg` } as any);
    const endpoint = type === 'logo' ? '/business-profiles/me/logo' : '/business-profiles/me/cover';
    const response = await api.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data;
  };

  const handleUploadLogo = async () => {
    // Request permission on mobile
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
        return;
      }
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      if (!hasProfile) {
        // Store for upload after save
        setPendingLogoUri(result.assets[0].uri);
        setLogo(result.assets[0].uri); // Show preview
        Alert.alert('Image Selected', 'Logo will be uploaded when you save the profile');
        return;
      }
      try {
        const formData = new FormData();
        
        // Handle web vs native differently
        if (Platform.OS === 'web') {
          // On web, fetch the blob and append it properly
          const response = await fetch(result.assets[0].uri);
          const blob = await response.blob();
          formData.append('file', blob, 'logo.jpg');
        } else {
          formData.append('file', { uri: result.assets[0].uri, type: 'image/jpeg', name: 'logo.jpg' } as any);
        }
        
        const uploadResponse = await api.post('/business-profiles/me/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        setLogo(uploadResponse.data.logo_url);
        Alert.alert('Success', 'Logo uploaded successfully');
      } catch (error: any) {
        console.error('Logo upload error:', error);
        Alert.alert('Error', error.response?.data?.detail || 'Failed to upload logo');
      }
    }
  };

  const handleUploadCover = async () => {
    // Request permission on mobile
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
        return;
      }
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 1],
      quality: 0.6,
    });

    if (!result.canceled && result.assets[0]) {
      if (!hasProfile) {
        // Store for upload after save
        setPendingCoverUri(result.assets[0].uri);
        setCover(result.assets[0].uri); // Show preview
        Alert.alert('Image Selected', 'Cover will be uploaded when you save the profile');
        return;
      }
      try {
        const formData = new FormData();
        
        // Handle web vs native differently
        if (Platform.OS === 'web') {
          // On web, fetch the blob and append it properly
          const response = await fetch(result.assets[0].uri);
          const blob = await response.blob();
          formData.append('file', blob, 'cover.jpg');
        } else {
          formData.append('file', { uri: result.assets[0].uri, type: 'image/jpeg', name: 'cover.jpg' } as any);
        }
        
        const uploadResponse = await api.post('/business-profiles/me/cover', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        setCover(uploadResponse.data.cover_url);
        Alert.alert('Success', 'Cover image uploaded successfully');
      } catch (error: any) {
        console.error('Cover upload error:', error);
        Alert.alert('Error', error.response?.data?.detail || 'Failed to upload cover');
      }
    }
  };

  const handleAddGalleryImage = async () => {
    if (!hasProfile) { Alert.alert('Save First', 'Please save your business profile first'); return; }
    if (galleryImages.length >= 20) { Alert.alert('Limit Reached', 'Maximum 20 images allowed'); return; }

    // Request permission on mobile
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        const formData = new FormData();
        
        // Handle web vs native differently
        if (Platform.OS === 'web') {
          const response = await fetch(result.assets[0].uri);
          const blob = await response.blob();
          formData.append('file', blob, 'gallery.jpg');
        } else {
          formData.append('file', { uri: result.assets[0].uri, type: 'image/jpeg', name: 'gallery.jpg' } as any);
        }
        
        const uploadResponse = await api.post('/business-profiles/me/gallery/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        setGalleryImages([...galleryImages, uploadResponse.data.image]);
        Alert.alert('Success', 'Image added to gallery');
      } catch (error: any) {
        console.error('Gallery upload error:', error);
        Alert.alert('Error', error.response?.data?.detail || 'Failed to upload image');
      }
    }
  };

  const handleDeleteGalleryImage = async (imageId: string) => {
    Alert.alert('Delete Image', 'Are you sure you want to delete this image?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/business-profiles/me/gallery/image/${imageId}`);
            setGalleryImages(galleryImages.filter(img => img.id !== imageId));
          } catch (error: any) {
            Alert.alert('Error', 'Failed to delete image');
          }
        }
      }
    ]);
  };

  const handleAddVideo = async () => {
    if (!hasProfile) { Alert.alert('Save First', 'Please save your business profile first'); return; }
    if (galleryVideos.length >= 10) { Alert.alert('Limit Reached', 'Maximum 10 videos allowed'); return; }
    if (!newVideoUrl.trim()) { Alert.alert('Error', 'Please enter a video URL'); return; }

    const url = newVideoUrl.trim();
    if (!url.includes('youtube.com') && !url.includes('youtu.be') && !url.includes('vimeo.com')) {
      Alert.alert('Error', 'Only YouTube and Vimeo links are supported');
      return;
    }

    try {
      const response = await api.post('/business-profiles/me/gallery/video', { url, title: newVideoTitle.trim() || null });
      setGalleryVideos([...galleryVideos, response.data.video]);
      setNewVideoUrl('');
      setNewVideoTitle('');
      Alert.alert('Success', 'Video added to gallery');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add video');
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    Alert.alert('Delete Video', 'Are you sure you want to delete this video?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/business-profiles/me/gallery/video/${videoId}`);
            setGalleryVideos(galleryVideos.filter(v => v.id !== videoId));
          } catch (error: any) {
            Alert.alert('Error', 'Failed to delete video');
          }
        }
      }
    ]);
  };

  const handleStripeCheckout = async () => {
    if (!hasProfile || !profileId) { Alert.alert('Error', 'Please save your business profile first'); return; }
    setProcessingPayment(true);
    try {
      const originUrl = Platform.OS === 'web' ? window.location.origin : 'https://admin-fixes-test.preview.emergentagent.com';
      const response = await api.post('/premium-subscription/stripe/checkout', {
        package_id: selectedPackage,
        origin_url: originUrl,
        business_profile_id: profileId
      });
      
      if (response.data.checkout_url) {
        if (Platform.OS === 'web') {
          window.location.href = response.data.checkout_url;
        } else {
          Linking.openURL(response.data.checkout_url);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to start checkout');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePayPalCheckout = async () => {
    if (!hasProfile || !profileId) { Alert.alert('Error', 'Please save your business profile first'); return; }
    setProcessingPayment(true);
    try {
      const originUrl = Platform.OS === 'web' ? window.location.origin : 'https://admin-fixes-test.preview.emergentagent.com';
      const response = await api.post('/premium-subscription/paypal/checkout', {
        package_id: selectedPackage,
        origin_url: originUrl,
        business_profile_id: profileId
      });
      
      if (response.data.paypal_client_id) {
        // For now, show info about PayPal
        Alert.alert(
          'PayPal Payment',
          `Amount: $${response.data.amount} ${response.data.currency}\n\nPayPal integration requires the PayPal SDK on native platforms. For production, integrate the PayPal SDK.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to start PayPal checkout');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleMpesaCheckout = async () => {
    if (!hasProfile || !profileId) { Alert.alert('Error', 'Please save your business profile first'); return; }
    if (!mpesaPhone.trim()) { Alert.alert('Error', 'Please enter your M-Pesa phone number'); return; }
    
    setProcessingPayment(true);
    try {
      const response = await api.post('/premium-subscription/mpesa/stk-push', {
        package_id: 'monthly_kes', // Default to Kenya KES
        phone_number: mpesaPhone.trim(),
        business_profile_id: profileId
      });
      
      Alert.alert(
        'M-Pesa Payment Initiated',
        response.data.message || 'Please check your phone and enter your M-Pesa PIN to complete the payment.',
        [{ text: 'OK', onPress: () => setShowMpesaModal(false) }]
      );
      setMpesaPhone('');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to initiate M-Pesa payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleRequestVerification = async () => {
    if (!hasProfile) { Alert.alert('Error', 'Please save your business profile first'); return; }
    Alert.alert('Request Verification', 'Submit your profile for admin review to get a verified badge?', [
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
    ]);
  };

  if (loading || !isReady) {
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

  // Right action for desktop layout (Save button)
  const rightAction = (
    <TouchableOpacity 
      onPress={handleSave} 
      disabled={saving} 
      style={styles.desktopSaveBtn}
      data-testid="save-button"
    >
      {saving ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          <Ionicons name="checkmark" size={18} color="#fff" />
          <Text style={styles.desktopSaveBtnText}>Save Changes</Text>
        </>
      )}
    </TouchableOpacity>
  );

  // Desktop Layout using DesktopPageLayout
  if (isLargeScreen) {
    return (
      <DesktopPageLayout
        title={hasProfile ? 'Edit Business Profile' : 'Create Business Profile'}
        subtitle="Manage your business information and verification status"
        icon="storefront-outline"
        rightAction={rightAction}
      >
        {/* Main Form Content */}
        <View style={styles.desktopFormContainer}>
          {/* VERIFICATION STATUS BANNER */}
          {hasProfile && (
            <View style={[styles.statusBanner, isPremium ? styles.premiumBanner : isVerified ? styles.verifiedBanner : verificationStatus === 'pending' ? styles.pendingBanner : styles.unverifiedBanner]}>
              <View style={styles.statusRow}>
                <Ionicons 
                  name={isPremium ? "diamond" : isVerified ? "checkmark-circle" : verificationStatus === 'pending' ? "time" : "shield-outline"} 
                  size={20} 
                  color={isPremium ? COLORS.premium : isVerified ? COLORS.verified : verificationStatus === 'pending' ? '#FF9800' : COLORS.textSecondary} 
                />
                <Text style={[styles.statusText, isPremium && styles.premiumText, isVerified && !isPremium && styles.verifiedText, verificationStatus === 'pending' && styles.pendingText]}>
                  {isPremium ? 'Premium Verified Business' : isVerified ? 'Verified Business' : verificationStatus === 'pending' ? 'Verification Pending' : 'Not Verified'}
                </Text>
              </View>
              {!isVerified && verificationStatus !== 'pending' && (
                <TouchableOpacity style={styles.verifyBtn} onPress={handleRequestVerification} data-testid="request-verification-button">
                  <Text style={styles.verifyBtnText}>Request Verification</Text>
                </TouchableOpacity>
              )}
              {isVerified && !isPremium && (
                <TouchableOpacity style={[styles.verifyBtn, styles.premiumUpgradeBtn]} onPress={() => setShowPremiumUpgrade(!showPremiumUpgrade)}>
                  <Text style={styles.premiumUpgradeBtnText}>Upgrade to Premium</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* PREMIUM UPGRADE SECTION */}
          {showPremiumUpgrade && hasProfile && isVerified && !isPremium && (
            <View style={styles.premiumSection}>
              <Text style={styles.premiumTitle}>Upgrade to Premium Verified Business</Text>
              <Text style={styles.premiumSubtitle}>Get priority placement, premium badge, and more visibility</Text>
              
              <View style={styles.packagesGrid}>
                {PREMIUM_PACKAGES.map((pkg) => (
                  <TouchableOpacity
                    key={pkg.id}
                    style={[styles.packageCard, selectedPackage === pkg.id && styles.packageCardSelected]}
                    onPress={() => setSelectedPackage(pkg.id)}
                    data-testid={`package-${pkg.id}`}
                  >
                    {pkg.savings && <View style={styles.savingsBadge}><Text style={styles.savingsText}>Save {pkg.savings}</Text></View>}
                    <Text style={styles.packageName}>{pkg.name}</Text>
                    <Text style={styles.packagePrice}>${pkg.amount}</Text>
                    <Text style={styles.packageDuration}>{pkg.duration}</Text>
                    {selectedPackage === pkg.id && <View style={styles.packageCheck}><Ionicons name="checkmark-circle" size={20} color={COLORS.primary} /></View>}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity 
                style={[styles.upgradeBtn, processingPayment && styles.upgradeBtnDisabled]} 
                onPress={async () => {
                  if (!selectedPackage) {
                    Alert.alert('Select Package', 'Please select a premium package first');
                    return;
                  }
                  setProcessingPayment(true);
                  try {
                    const response = await api.post('/premium-subscription/stripe/checkout', {
                      package_id: selectedPackage,
                      business_profile_id: profileId,
                    });
                    if (response.data.checkout_url) {
                      if (Platform.OS === 'web') {
                        window.location.href = response.data.checkout_url;
                      } else {
                        Linking.openURL(response.data.checkout_url);
                      }
                    }
                  } catch (error: any) {
                    Alert.alert('Error', error.response?.data?.detail || 'Failed to start checkout');
                  } finally {
                    setProcessingPayment(false);
                  }
                }}
                disabled={!selectedPackage || processingPayment}
                data-testid="upgrade-button"
              >
                {processingPayment ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="diamond" size={18} color="#fff" />
                    <Text style={styles.upgradeBtnText}>Upgrade Now</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* PREMIUM EXPIRATION WARNING */}
          {isPremium && premiumExpiresAt && (
            <View style={styles.premiumExpirationBanner}>
              <Ionicons name="time-outline" size={20} color={COLORS.premium} />
              <Text style={styles.premiumExpirationText}>
                Premium expires on {new Date(premiumExpiresAt).toLocaleDateString()}
              </Text>
              <TouchableOpacity onPress={() => setShowPremiumUpgrade(true)}>
                <Text style={styles.renewLink}>Renew</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Form Fields */}
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Basic Information</Text>
            <InputField label="Business Name" value={businessName} onChangeText={setBusinessName} placeholder="Enter business name" required />
            <InputField label="Description" value={description} onChangeText={setDescription} placeholder="Describe your business" multiline maxLength={500} />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Contact Information</Text>
            <InputField label="Phone" value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" />
            <InputField label="Email" value={email} onChangeText={setEmail} placeholder="Business email" keyboardType="email-address" />
            <InputField label="Website" value={website} onChangeText={setWebsite} placeholder="https://yourwebsite.com" />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Location</Text>
            <InputField label="Address" value={address} onChangeText={setAddress} placeholder="Street address" />
            <InputField label="City" value={city} onChangeText={setCity} placeholder="City" />
            <InputField label="Region/State" value={region} onChangeText={setRegion} placeholder="Region or State" />
            <InputField label="Country" value={country} onChangeText={setCountry} placeholder="Country" />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Business Hours</Text>
            <InputField label="Operating Hours" value={operatingHours} onChangeText={setOperatingHours} placeholder="e.g., Mon-Fri 9AM-5PM" />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Customization</Text>
            <Text style={styles.inputLabel}>Brand Color</Text>
            <View style={styles.colorPicker}>
              {['#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#F44336', '#00BCD4', '#E91E63', '#607D8B'].map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorOption, { backgroundColor: color }, brandColor === color && styles.colorOptionSelected]}
                  onPress={() => setBrandColor(color)}
                  data-testid={`color-${color}`}
                />
              ))}
            </View>
          </View>

          {/* Delete Profile Button */}
          {hasProfile && (
            <TouchableOpacity 
              style={styles.deleteBtn} 
              onPress={() => {
                Alert.alert('Delete Business Profile', 'Are you sure you want to delete your business profile? This cannot be undone.', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete', style: 'destructive',
                    onPress: async () => {
                      try {
                        await api.delete('/business-profiles/me');
                        Alert.alert('Deleted', 'Your business profile has been deleted', [{ text: 'OK', onPress: () => router.back() }]);
                      } catch (error: any) {
                        Alert.alert('Error', error.response?.data?.detail || 'Failed to delete profile');
                      }
                    }
                  }
                ]);
              }}
              data-testid="delete-profile-button"
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
              <Text style={styles.deleteBtnText}>Delete Business Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* M-Pesa Modal */}
        <Modal
          visible={showMpesaModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowMpesaModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>M-Pesa Payment</Text>
              <Text style={styles.modalSubtitle}>
                Enter your M-Pesa registered phone number to receive a payment prompt
              </Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="254XXXXXXXXX"
                value={mpesaPhone}
                onChangeText={setMpesaPhone}
                keyboardType="phone-pad"
                maxLength={12}
              />
              <Text style={styles.phoneHint}>Format: 254XXXXXXXXX (e.g., 254712345678)</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.modalCancelBtn} 
                  onPress={() => setShowMpesaModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalConfirmBtn, processingPayment && styles.modalConfirmBtnDisabled]} 
                  onPress={handleMpesaCheckout}
                  disabled={processingPayment || mpesaPhone.length < 10}
                >
                  {processingPayment ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Pay ${selectedPackage ? PREMIUM_PACKAGES.find(p => p.id === selectedPackage)?.amount : ''}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Success Modal */}
        <Modal
          visible={showSuccessModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSuccessModal(false)}
        >
          <View style={styles.modalOverlay}>
            <ScrollView contentContainerStyle={styles.successModalScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.successModalContent}>
                <View style={styles.successIconContainer}>
                  <Ionicons name="checkmark-circle" size={64} color={COLORS.primary} />
                </View>
                <Text style={styles.successTitle}>
                  {hasProfile ? 'Profile Updated!' : 'Business Profile Created!'}
                </Text>
                <Text style={styles.successSubtitle}>
                  Your business profile is now live. Share it with customers!
                </Text>
                
                <View style={styles.qrCodeSection}>
                  <Text style={styles.qrCodeLabel}>Scan to View Profile</Text>
                  <View style={styles.qrCodeContainer}>
                    {successProfileUrl ? (
                      <QRCode
                        value={successProfileUrl}
                        size={140}
                        level="M"
                        bgColor="#FFFFFF"
                        fgColor="#000000"
                      />
                    ) : null}
                  </View>
                  <Text style={styles.qrCodeHint}>Share this QR code with customers</Text>
                </View>
                
                <View style={styles.profileUrlBox}>
                  <Text style={styles.profileUrlLabel}>Your Profile URL</Text>
                  <Text style={styles.profileUrl} numberOfLines={2} selectable={true}>
                    {successProfileUrl}
                  </Text>
                </View>

                <View style={styles.successActions}>
                  <TouchableOpacity
                    style={styles.viewProfileBtn}
                    onPress={() => {
                      setShowSuccessModal(false);
                      router.push(`/business/${successProfileSlug}`);
                    }}
                    data-testid="view-profile-button"
                  >
                    <Ionicons name="eye-outline" size={18} color="#fff" />
                    <Text style={styles.viewProfileBtnText}>View Profile</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.copyLinkBtn}
                    onPress={async () => {
                      if (Platform.OS === 'web') {
                        try {
                          await navigator.clipboard.writeText(successProfileUrl);
                          Alert.alert('Copied!', 'Profile link copied to clipboard');
                        } catch (e) {
                          console.error('Failed to copy:', e);
                        }
                      } else {
                        const { Share } = require('react-native');
                        Share.share({
                          message: `Check out my business on Avida: ${successProfileUrl}`,
                          url: successProfileUrl,
                        });
                      }
                    }}
                    data-testid="copy-link-button"
                  >
                    <Ionicons name="copy-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.copyLinkBtnText}>Copy Link</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.successCloseBtn}
                  onPress={() => setShowSuccessModal(false)}
                >
                  <Text style={styles.successCloseBtnText}>Continue Editing</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>
      </DesktopPageLayout>
    );
  }

  // Mobile Layout
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeGoBack(router)} data-testid="back-button">
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{hasProfile ? 'Edit Business Profile' : 'Create Business Profile'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} data-testid="save-button">
          {saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={styles.saveBtn}>Save</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          {/* VERIFICATION STATUS BANNER */}
          {hasProfile && (
            <View style={[styles.statusBanner, isPremium ? styles.premiumBanner : isVerified ? styles.verifiedBanner : verificationStatus === 'pending' ? styles.pendingBanner : styles.unverifiedBanner]}>
              <View style={styles.statusRow}>
                <Ionicons 
                  name={isPremium ? "diamond" : isVerified ? "checkmark-circle" : verificationStatus === 'pending' ? "time" : "shield-outline"} 
                  size={20} 
                  color={isPremium ? COLORS.premium : isVerified ? COLORS.verified : verificationStatus === 'pending' ? '#FF9800' : COLORS.textSecondary} 
                />
                <Text style={[styles.statusText, isPremium && styles.premiumText, isVerified && !isPremium && styles.verifiedText, verificationStatus === 'pending' && styles.pendingText]}>
                  {isPremium ? 'Premium Verified Business' : isVerified ? 'Verified Business' : verificationStatus === 'pending' ? 'Verification Pending' : 'Not Verified'}
                </Text>
              </View>
              {!isVerified && verificationStatus !== 'pending' && (
                <TouchableOpacity style={styles.verifyBtn} onPress={handleRequestVerification} data-testid="request-verification-button">
                  <Text style={styles.verifyBtnText}>Request Verification</Text>
                </TouchableOpacity>
              )}
              {isVerified && !isPremium && (
                <TouchableOpacity style={[styles.verifyBtn, styles.premiumUpgradeBtn]} onPress={() => setShowPremiumUpgrade(!showPremiumUpgrade)}>
                  <Text style={styles.premiumUpgradeBtnText}>Upgrade to Premium</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* PREMIUM UPGRADE SECTION */}
          {showPremiumUpgrade && hasProfile && isVerified && !isPremium && (
            <View style={styles.premiumSection}>
              <Text style={styles.premiumTitle}>Upgrade to Premium Verified Business</Text>
              <Text style={styles.premiumSubtitle}>Get priority placement, premium badge, and more visibility</Text>
              
              <View style={styles.packagesGrid}>
                {PREMIUM_PACKAGES.map((pkg) => (
                  <TouchableOpacity
                    key={pkg.id}
                    style={[styles.packageCard, selectedPackage === pkg.id && styles.packageCardSelected]}
                    onPress={() => setSelectedPackage(pkg.id)}
                    data-testid={`package-${pkg.id}`}
                  >
                    {pkg.savings && <View style={styles.savingsBadge}><Text style={styles.savingsText}>Save {pkg.savings}</Text></View>}
                    <Text style={styles.packageName}>{pkg.name}</Text>
                    <Text style={styles.packagePrice}>${pkg.amount}</Text>
                    <Text style={styles.packageDuration}>{pkg.duration}</Text>
                    {selectedPackage === pkg.id && <Ionicons name="checkmark-circle" size={24} color={COLORS.premium} style={styles.packageCheck} />}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.checkoutBtn, processingPayment && styles.checkoutBtnDisabled]}
                onPress={handleStripeCheckout}
                disabled={processingPayment}
                data-testid="stripe-checkout-button"
              >
                {processingPayment ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="card-outline" size={20} color="#fff" />
                    <Text style={styles.checkoutBtnText}>Pay with Card (Stripe)</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.orDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.orText}>or pay with</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.altPayments}>
                <TouchableOpacity
                  style={[styles.altPaymentBtn, styles.paypalBtn]}
                  onPress={handlePayPalCheckout}
                  disabled={processingPayment}
                  data-testid="paypal-checkout-button"
                >
                  <Ionicons name="logo-paypal" size={20} color="#00457C" />
                  <Text style={styles.paypalBtnText}>PayPal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.altPaymentBtn, styles.mpesaBtn]}
                  onPress={() => setShowMpesaModal(true)}
                  disabled={processingPayment}
                  data-testid="mpesa-checkout-button"
                >
                  <Ionicons name="phone-portrait-outline" size={20} color="#4CAF50" />
                  <Text style={styles.mpesaBtnText}>M-Pesa</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.paymentNote}>Secure payment. Cancel anytime.</Text>
            </View>
          )}

          {/* COVER IMAGE */}
          <View style={styles.coverSection}>
            {cover ? (
              <Image source={{ uri: cover }} style={styles.coverImage} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="image-outline" size={32} color={COLORS.textSecondary} />
                <Text style={styles.coverPlaceholderText}>Cover Image (1200x400)</Text>
              </View>
            )}
            <TouchableOpacity style={styles.uploadCoverBtn} onPress={handleUploadCover} data-testid="upload-cover-button">
              <Ionicons name="camera-outline" size={18} color={COLORS.primary} />
              <Text style={styles.uploadCoverBtnText}>{cover ? 'Change Cover' : 'Upload Cover'}</Text>
            </TouchableOpacity>
          </View>

          {/* LOGO SECTION */}
          <View style={styles.logoSection}>
            {logo ? (
              <Image source={{ uri: logo }} style={styles.logo} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="storefront-outline" size={48} color={COLORS.textSecondary} />
              </View>
            )}
            <TouchableOpacity style={styles.uploadLogoBtn} onPress={handleUploadLogo} data-testid="upload-logo-button">
              <Ionicons name="camera-outline" size={20} color={COLORS.primary} />
              <Text style={styles.uploadLogoBtnText}>{logo ? 'Change Logo' : 'Upload Logo'}</Text>
            </TouchableOpacity>
          </View>

          {/* PROFILE URL PREVIEW */}
          {identifier && (
            <TouchableOpacity style={styles.urlPreview} onPress={() => router.push(`/business/${identifier}`)} data-testid="view-public-profile-button">
              <Ionicons name="link-outline" size={18} color={COLORS.primary} />
              <Text style={styles.urlText} numberOfLines={1}>/business/{identifier}</Text>
              <Ionicons name="open-outline" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}

          {/* BASIC INFO */}
          <InputField label="Business Name" value={businessName} onChangeText={setBusinessName} placeholder="Enter your business name" required />
          <InputField label="Description" value={description} onChangeText={setDescription} placeholder="Tell customers about your business..." multiline maxLength={2000} />
          <CategorySelector selectedCategories={categories} onToggle={handleToggleCategory} />
          <InputField label="Phone Number" value={phone} onChangeText={setPhone} placeholder="+49 123 456 7890" keyboardType="phone-pad" />
          <InputField label="Email" value={email} onChangeText={setEmail} placeholder="business@example.com" keyboardType="email-address" />
          <InputField label="Address" value={address} onChangeText={setAddress} placeholder="Street address" />
          <View style={styles.row}>
            <View style={styles.halfInput}><InputField label="City" value={city} onChangeText={setCity} placeholder="City" /></View>
            <View style={styles.halfInput}><InputField label="Country" value={country} onChangeText={setCountry} placeholder="Country" /></View>
          </View>

          {/* SOCIAL LINKS SECTION */}
          <View style={styles.sectionContainer}>
            <SectionHeader title="Social Links" icon="share-social-outline" expanded={showSocialLinks} onToggle={() => setShowSocialLinks(!showSocialLinks)} />
            {showSocialLinks && (
              <View style={styles.sectionContent}>
                {SOCIAL_PLATFORMS.map((platform) => (
                  <View key={platform.id} style={styles.socialRow}>
                    <View style={[styles.socialIcon, { backgroundColor: platform.color + '15' }]}>
                      <Ionicons name={platform.icon as any} size={20} color={platform.color} />
                    </View>
                    <TextInput
                      style={styles.socialInput}
                      value={socialLinks[platform.id] || ''}
                      onChangeText={(text) => setSocialLinks({ ...socialLinks, [platform.id]: text })}
                      placeholder={platform.placeholder}
                      placeholderTextColor={COLORS.textSecondary}
                      data-testid={`social-${platform.id}`}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* GALLERY SECTION */}
          <View style={styles.sectionContainer}>
            <SectionHeader title="Gallery" icon="images-outline" expanded={showGallery} onToggle={() => setShowGallery(!showGallery)} />
            {showGallery && (
              <View style={styles.sectionContent}>
                {/* Image Gallery */}
                <View style={styles.gallerySubsection}>
                  <View style={styles.galleryHeader}>
                    <Text style={styles.gallerySubtitle}>Images ({galleryImages.length}/20)</Text>
                    <TouchableOpacity style={styles.addGalleryBtn} onPress={handleAddGalleryImage} data-testid="add-gallery-image">
                      <Ionicons name="add" size={18} color={COLORS.primary} />
                      <Text style={styles.addGalleryBtnText}>Add Image</Text>
                    </TouchableOpacity>
                  </View>
                  {galleryImages.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                      {galleryImages.map((img) => (
                        <View key={img.id} style={styles.galleryImageContainer}>
                          <Image source={{ uri: img.url }} style={styles.galleryImage} />
                          <TouchableOpacity style={styles.deleteImageBtn} onPress={() => handleDeleteGalleryImage(img.id)}>
                            <Ionicons name="close-circle" size={24} color={COLORS.error} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>

                {/* Video Gallery */}
                <View style={styles.gallerySubsection}>
                  <View style={styles.galleryHeader}>
                    <Text style={styles.gallerySubtitle}>Videos ({galleryVideos.length}/10)</Text>
                  </View>
                  <View style={styles.addVideoForm}>
                    <TextInput
                      style={styles.videoInput}
                      value={newVideoUrl}
                      onChangeText={setNewVideoUrl}
                      placeholder="YouTube or Vimeo URL"
                      placeholderTextColor={COLORS.textSecondary}
                    />
                    <TextInput
                      style={[styles.videoInput, styles.videoTitleInput]}
                      value={newVideoTitle}
                      onChangeText={setNewVideoTitle}
                      placeholder="Title (optional)"
                      placeholderTextColor={COLORS.textSecondary}
                    />
                    <TouchableOpacity style={styles.addVideoBtn} onPress={handleAddVideo} data-testid="add-video-button">
                      <Ionicons name="add" size={18} color="#fff" />
                      <Text style={styles.addVideoBtnText}>Add Video</Text>
                    </TouchableOpacity>
                  </View>
                  {galleryVideos.length > 0 && (
                    <View style={styles.videoList}>
                      {galleryVideos.map((video) => (
                        <View key={video.id} style={styles.videoItem}>
                          {video.thumbnail && <Image source={{ uri: video.thumbnail }} style={styles.videoThumbnail} />}
                          <View style={styles.videoInfo}>
                            <Text style={styles.videoTitle} numberOfLines={1}>{video.title || 'Video'}</Text>
                            <Text style={styles.videoUrl} numberOfLines={1}>{video.url}</Text>
                          </View>
                          <TouchableOpacity onPress={() => handleDeleteVideo(video.id)}>
                            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* INFO BOX */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>
              Your business profile creates a public page showcasing your brand and listings. Getting verified adds a badge that helps build trust with customers.
            </Text>
          </View>

          {/* DELETE PROFILE */}
          {hasProfile && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => {
                Alert.alert('Delete Business Profile', 'Are you sure you want to delete your business profile? This cannot be undone.', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete', style: 'destructive',
                    onPress: async () => {
                      try {
                        await api.delete('/business-profiles/me');
                        Alert.alert('Deleted', 'Your business profile has been deleted', [{ text: 'OK', onPress: () => router.back() }]);
                      } catch (error: any) {
                        Alert.alert('Error', error.response?.data?.detail || 'Failed to delete profile');
                      }
                    }
                  }
                ]);
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

      {/* M-Pesa Modal */}
      <Modal
        visible={showMpesaModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMpesaModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>M-Pesa Payment</Text>
            <Text style={styles.modalSubtitle}>
              Enter your M-Pesa registered phone number to receive a payment prompt
            </Text>
            <TextInput
              style={styles.mpesaInput}
              value={mpesaPhone}
              onChangeText={setMpesaPhone}
              placeholder="+254 712 345 678"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="phone-pad"
              data-testid="mpesa-phone-input"
            />
            <TouchableOpacity
              style={[styles.mpesaSubmitBtn, processingPayment && styles.checkoutBtnDisabled]}
              onPress={handleMpesaCheckout}
              disabled={processingPayment}
              data-testid="mpesa-submit-button"
            >
              {processingPayment ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="phone-portrait-outline" size={18} color="#fff" />
                  <Text style={styles.mpesaSubmitText}>Pay KES 3,500</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mpesaCancelBtn}
              onPress={() => setShowMpesaModal(false)}
            >
              <Text style={styles.mpesaCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.successModalScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.successModalContent}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={64} color={COLORS.primary} />
              </View>
              <Text style={styles.successTitle}>Profile Saved!</Text>
              <Text style={styles.successSubtitle}>
                Your business profile has been saved successfully.
              </Text>
              
              {/* QR Code Section */}
              <View style={styles.qrCodeSection}>
                <Text style={styles.qrCodeLabel}>Scan to View Profile</Text>
                <View style={styles.qrCodeContainer}>
                  {successProfileUrl ? (
                    <QRCode
                      value={successProfileUrl}
                      size={140}
                      level="M"
                      bgColor="#FFFFFF"
                      fgColor="#000000"
                    />
                  ) : null}
                </View>
                <Text style={styles.qrCodeHint}>Share this QR code with customers</Text>
              </View>
              
              <View style={styles.profileUrlBox}>
                <Text style={styles.profileUrlLabel}>Your Profile URL</Text>
                <Text style={styles.profileUrl} numberOfLines={2} selectable={true}>
                  {successProfileUrl}
                </Text>
              </View>

              <View style={styles.successActions}>
                <TouchableOpacity
                  style={styles.viewProfileBtn}
                  onPress={() => {
                    setShowSuccessModal(false);
                    router.push(`/business/${successProfileSlug}`);
                  }}
                  data-testid="view-profile-button"
                >
                  <Ionicons name="eye-outline" size={18} color="#fff" />
                  <Text style={styles.viewProfileBtnText}>View Profile</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.copyLinkBtn}
                  onPress={async () => {
                    if (Platform.OS === 'web') {
                      try {
                        await navigator.clipboard.writeText(successProfileUrl);
                        Alert.alert('Copied!', 'Profile link copied to clipboard');
                      } catch (e) {
                        console.error('Failed to copy:', e);
                      }
                    } else {
                      // On mobile, use Share API
                      const { Share } = require('react-native');
                      Share.share({
                        message: `Check out my business on Avida: ${successProfileUrl}`,
                        url: successProfileUrl,
                      });
                    }
                  }}
                  data-testid="copy-link-button"
                >
                  <Ionicons name="copy-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.copyLinkBtnText}>Copy Link</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.successCloseBtn}
                onPress={() => setShowSuccessModal(false)}
              >
                <Text style={styles.successCloseBtnText}>Continue Editing</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: HORIZONTAL_PADDING, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  saveBtn: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: HORIZONTAL_PADDING },
  
  // Status banner
  statusBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, marginBottom: 20 },
  verifiedBanner: { backgroundColor: '#E3F2FD' },
  premiumBanner: { backgroundColor: COLORS.premiumLight },
  pendingBanner: { backgroundColor: '#FFF3E0' },
  unverifiedBanner: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  verifiedText: { color: COLORS.verified },
  premiumText: { color: COLORS.premium },
  pendingText: { color: '#FF9800' },
  verifyBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: COLORS.primary },
  verifyBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  premiumUpgradeBtn: { backgroundColor: COLORS.premium },
  premiumUpgradeBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  
  // Premium section
  premiumSection: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 2, borderColor: COLORS.premium },
  premiumTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 6, textAlign: 'center' },
  premiumSubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20 },
  packagesGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  packageCard: { flex: 1, backgroundColor: COLORS.background, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 2, borderColor: COLORS.border },
  packageCardSelected: { borderColor: COLORS.premium, backgroundColor: COLORS.premiumLight },
  savingsBadge: { position: 'absolute', top: -8, right: -8, backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  savingsText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  packageName: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 },
  packagePrice: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  packageDuration: { fontSize: 11, color: COLORS.textSecondary },
  packageCheck: { position: 'absolute', top: 8, right: 8 },
  checkoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.premium, paddingVertical: 16, borderRadius: 12 },
  checkoutBtnDisabled: { opacity: 0.6 },
  checkoutBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  orDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  orText: { marginHorizontal: 12, fontSize: 13, color: COLORS.textSecondary },
  altPayments: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  altPaymentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 10, borderWidth: 1 },
  paypalBtn: { borderColor: '#00457C', backgroundColor: '#fff' },
  paypalBtnText: { fontSize: 14, fontWeight: '600', color: '#00457C' },
  mpesaBtn: { borderColor: '#4CAF50', backgroundColor: '#fff' },
  mpesaBtnText: { fontSize: 14, fontWeight: '600', color: '#4CAF50' },
  paymentNote: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', marginTop: 12 },
  
  // M-Pesa Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 24, width: '100%', maxWidth: 360 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20, textAlign: 'center' },
  mpesaInput: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.text, marginBottom: 16 },
  mpesaSubmitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4CAF50', paddingVertical: 14, borderRadius: 10, marginBottom: 12 },
  mpesaSubmitText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  mpesaCancelBtn: { alignItems: 'center', padding: 10 },
  mpesaCancelText: { fontSize: 14, color: COLORS.textSecondary },
  
  // Success Modal
  successModalScrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  successModalContent: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 28, width: '100%', maxWidth: 380, alignItems: 'center' },
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  successSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20, textAlign: 'center', lineHeight: 20 },
  
  // QR Code Section
  qrCodeSection: { alignItems: 'center', marginBottom: 20, width: '100%' },
  qrCodeLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  qrCodeContainer: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  qrCodeHint: { fontSize: 11, color: COLORS.textSecondary, marginTop: 10 },
  
  profileUrlBox: { backgroundColor: COLORS.primaryLight, borderRadius: 12, padding: 16, width: '100%', marginBottom: 20 },
  profileUrlLabel: { fontSize: 12, fontWeight: '600', color: COLORS.primary, marginBottom: 6, textTransform: 'uppercase' },
  profileUrl: { fontSize: 13, color: COLORS.text, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  successActions: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 16 },
  viewProfileBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 10 },
  viewProfileBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  copyLinkBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primaryLight, paddingVertical: 14, borderRadius: 10 },
  copyLinkBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  successCloseBtn: { paddingVertical: 10 },
  successCloseBtnText: { fontSize: 14, color: COLORS.textSecondary },
  
  // Cover
  coverSection: { marginBottom: 20, alignItems: 'center' },
  coverImage: { width: '100%', height: 120, borderRadius: 12, backgroundColor: COLORS.border },
  coverPlaceholder: { width: '100%', height: 120, borderRadius: 12, backgroundColor: COLORS.surface, borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  coverPlaceholderText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  uploadCoverBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: COLORS.primaryLight, marginTop: -20 },
  uploadCoverBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  
  // Logo
  logoSection: { alignItems: 'center', paddingVertical: 10, marginBottom: 10 },
  logo: { width: 100, height: 100, borderRadius: 16, borderWidth: 2, borderColor: COLORS.border },
  logoPlaceholder: { width: 100, height: 100, borderRadius: 16, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed' },
  uploadLogoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: COLORS.primaryLight, marginTop: 12 },
  uploadLogoBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  
  // URL Preview
  urlPreview: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, backgroundColor: COLORS.primaryLight, borderRadius: 12, marginBottom: 20 },
  urlText: { flex: 1, fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  
  // Layout
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  
  // Sections
  sectionContainer: { marginBottom: 16 },
  sectionContent: { paddingTop: 16 },
  
  // Social Links
  socialRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  socialIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  socialInput: { flex: 1, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: COLORS.text },
  
  // Gallery
  gallerySubsection: { marginBottom: 20 },
  galleryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  gallerySubtitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  addGalleryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: COLORS.primaryLight },
  addGalleryBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  galleryScroll: { marginBottom: 8 },
  galleryImageContainer: { marginRight: 12, position: 'relative' },
  galleryImage: { width: 100, height: 100, borderRadius: 10 },
  deleteImageBtn: { position: 'absolute', top: -8, right: -8 },
  addVideoForm: { marginBottom: 12 },
  videoInput: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: COLORS.text, marginBottom: 8 },
  videoTitleInput: { marginBottom: 12 },
  addVideoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 10 },
  addVideoBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  videoList: { gap: 10 },
  videoItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 10, padding: 10, gap: 12 },
  videoThumbnail: { width: 80, height: 45, borderRadius: 6, backgroundColor: COLORS.border },
  videoInfo: { flex: 1 },
  videoTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  videoUrl: { fontSize: 12, color: COLORS.textSecondary },
  
  // Info box
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, backgroundColor: COLORS.primaryLight, borderRadius: 12, marginTop: 10 },
  infoText: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 18 },
  
  // Delete button
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, marginTop: 24, borderRadius: 12, borderWidth: 1, borderColor: COLORS.error },
  deleteBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.error },
  
  // Desktop styles
  desktopSaveBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  desktopSaveBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  desktopFormContainer: { backgroundColor: '#fff', borderRadius: 12, padding: 24 },
  formSection: { marginBottom: 24 },
  formSectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  inputLabel: { fontSize: 14, fontWeight: '500', color: COLORS.text, marginBottom: 8 },
  colorPicker: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  colorOption: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
  colorOptionSelected: { borderColor: COLORS.text, borderWidth: 3 },
  premiumExpirationBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.premiumLight, padding: 14, borderRadius: 12, marginBottom: 20 },
  premiumExpirationText: { flex: 1, fontSize: 14, color: COLORS.premium },
  renewLink: { fontSize: 14, fontWeight: '600', color: COLORS.premium, textDecorationLine: 'underline' },
  upgradeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.premium, paddingVertical: 14, borderRadius: 12 },
  upgradeBtnDisabled: { opacity: 0.6 },
  upgradeBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '90%', maxWidth: 400 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20 },
  phoneInput: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 8 },
  phoneHint: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  modalConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
  modalConfirmBtnDisabled: { opacity: 0.6 },
  modalConfirmText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  successModalScrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  successModalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center' },
  successIconContainer: { marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  successSubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24 },
  qrCodeSection: { alignItems: 'center', marginBottom: 20 },
  qrCodeLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  qrCodeContainer: { padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  qrCodeHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
  profileUrlBox: { width: '100%', backgroundColor: COLORS.background, borderRadius: 10, padding: 14, marginBottom: 20 },
  profileUrlLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 },
  profileUrl: { fontSize: 14, color: COLORS.primary },
  successActions: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 16 },
  viewProfileBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 10 },
  viewProfileBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  copyLinkBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primaryLight, paddingVertical: 14, borderRadius: 10 },
  copyLinkBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  successCloseBtn: { paddingVertical: 12 },
  successCloseBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
});
