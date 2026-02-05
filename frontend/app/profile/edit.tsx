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
};

const HORIZONTAL_PADDING = 16;

// ============ INPUT FIELD ============
const InputField = ({ 
  label, 
  value, 
  onChangeText, 
  placeholder,
  keyboardType = 'default',
  multiline = false,
  maxLength,
}: { 
  label: string; 
  value: string; 
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  multiline?: boolean;
  maxLength?: number;
}) => (
  <View style={inputStyles.container}>
    <Text style={inputStyles.label}>{label}</Text>
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

// ============ MAIN SCREEN ============
export default function EditProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [picture, setPicture] = useState<string | undefined>();

  // Check authentication on mount
  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to edit your profile',
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
      const response = await api.get('/profile');
      const profile = response.data;
      setName(profile.name || '');
      setPhone(profile.phone || '');
      setLocation(profile.location || '');
      setBio(profile.bio || '');
      setPicture(profile.picture);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
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

  const handleSave = async () => {
    if (!isAuthenticated) {
      Alert.alert('Error', 'Please sign in to save changes');
      return;
    }
    
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setSaving(true);
    try {
      await api.put('/profile', {
        name: name.trim(),
        phone: phone.trim() || null,
        location: location.trim() || null,
        bio: bio.trim() || null,
        picture: picture || null,
      });
      
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'Please sign in again', [
          { text: 'OK', onPress: () => router.replace('/login') }
        ]);
      } else {
        Alert.alert(
          'Error', 
          error.response?.data?.detail || 'Failed to update profile. Please try again.'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePickImage = async () => {
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

    if (!result.canceled && result.assets[0].base64) {
      setPicture(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => setPicture(undefined) }
      ]
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => safeGoBack(router)}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
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
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
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
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            {picture ? (
              <Image source={{ uri: picture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>
                  {name ? getInitials(name) : 'U'}
                </Text>
              </View>
            )}
            
            <View style={styles.avatarButtons}>
              <TouchableOpacity style={styles.avatarBtn} onPress={handlePickImage}>
                <Ionicons name="camera-outline" size={20} color={COLORS.primary} />
                <Text style={styles.avatarBtnText}>Change Photo</Text>
              </TouchableOpacity>
              
              {picture && (
                <TouchableOpacity style={styles.avatarBtnDanger} onPress={handleRemovePhoto}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                  <Text style={styles.avatarBtnTextDanger}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Form Fields */}
          <InputField
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
          />

          <InputField
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            placeholder="+49 123 456 7890"
            keyboardType="phone-pad"
          />

          <InputField
            label="Location"
            value={location}
            onChangeText={setLocation}
            placeholder="City, Country"
          />

          <InputField
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself..."
            multiline
            maxLength={200}
          />

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>
              Your profile information is visible to other users when they view your listings.
            </Text>
          </View>
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
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: COLORS.primaryLight,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  avatarInitials: {
    fontSize: 40,
    fontWeight: '700',
    color: COLORS.primary,
  },
  avatarButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  avatarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
  },
  avatarBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  avatarBtnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFEBEE',
  },
  avatarBtnTextDanger: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    marginBottom: 32,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
});
