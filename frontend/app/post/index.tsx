import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../src/utils/theme';
import { listingsApi, categoriesApi } from '../../src/utils/api';
import { Category } from '../../src/types';
import { useAuthStore } from '../../src/store/authStore';

const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'For Parts'];
const MAX_IMAGES = 10;

export default function PostListingScreen() {
  const { category: categoryId } = useLocalSearchParams<{ category: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  
  // Form state
  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [negotiable, setNegotiable] = useState(true);
  const [condition, setCondition] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    
    if (categoryId) {
      fetchCategory();
    }
  }, [categoryId, isAuthenticated]);

  const fetchCategory = async () => {
    try {
      const data = await categoriesApi.getOne(categoryId!);
      setCategory(data);
    } catch (error) {
      console.error('Error fetching category:', error);
    }
  };

  const pickImage = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('Limit Reached', `You can only upload ${MAX_IMAGES} images`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImages([...images, `data:image/jpeg;base64,${result.assets[0].base64}`]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const moveImage = (fromIndex: number, direction: 'left' | 'right') => {
    const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= images.length) return;
    
    const newImages = [...images];
    [newImages[fromIndex], newImages[toIndex]] = [newImages[toIndex], newImages[fromIndex]];
    setImages(newImages);
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        if (images.length === 0) {
          Alert.alert('Required', 'Please add at least one photo');
          return false;
        }
        return true;
      case 2:
        if (!title.trim()) {
          Alert.alert('Required', 'Please enter a title');
          return false;
        }
        if (!description.trim()) {
          Alert.alert('Required', 'Please enter a description');
          return false;
        }
        return true;
      case 3:
        if (!price.trim() || isNaN(parseFloat(price))) {
          Alert.alert('Required', 'Please enter a valid price');
          return false;
        }
        return true;
      case 4:
        if (!location.trim()) {
          Alert.alert('Required', 'Please enter your location');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const handlePublish = async () => {
    if (!validateStep()) return;

    setLoading(true);
    try {
      const listingData = {
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price),
        negotiable,
        category_id: categoryId!,
        subcategory: subcategory || undefined,
        condition: condition || undefined,
        images,
        location: location.trim(),
        attributes,
      };

      await listingsApi.create(listingData);
      Alert.alert('Success', 'Your listing has been posted!', [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
    } catch (error: any) {
      console.error('Error creating listing:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to post listing');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4, 5].map((s) => (
        <View key={s} style={styles.stepRow}>
          <View
            style={[
              styles.stepDot,
              s === step && styles.stepDotActive,
              s < step && styles.stepDotComplete,
            ]}
          >
            {s < step ? (
              <Ionicons name="checkmark" size={14} color={theme.colors.onPrimary} />
            ) : (
              <Text style={[styles.stepNumber, s === step && styles.stepNumberActive]}>
                {s}
              </Text>
            )}
          </View>
          {s < 5 && <View style={[styles.stepLine, s < step && styles.stepLineComplete]} />}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Add Photos</Text>
      <Text style={styles.stepSubtitle}>Add up to {MAX_IMAGES} photos. First photo will be the cover.</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
        <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
          <Ionicons name="camera-outline" size={32} color={theme.colors.primary} />
          <Text style={styles.addImageText}>Add Photo</Text>
          <Text style={styles.imageCount}>{images.length}/{MAX_IMAGES}</Text>
        </TouchableOpacity>
        
        {images.map((img, index) => (
          <View key={index} style={styles.imageWrapper}>
            <Image source={{ uri: img }} style={styles.imagePreview} />
            {index === 0 && (
              <View style={styles.coverBadge}>
                <Text style={styles.coverText}>Cover</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => removeImage(index)}
            >
              <Ionicons name="close" size={16} color={theme.colors.onError} />
            </TouchableOpacity>
            <View style={styles.imageActions}>
              {index > 0 && (
                <TouchableOpacity
                  style={styles.moveButton}
                  onPress={() => moveImage(index, 'left')}
                >
                  <Ionicons name="chevron-back" size={16} color={theme.colors.onSurface} />
                </TouchableOpacity>
              )}
              {index < images.length - 1 && (
                <TouchableOpacity
                  style={styles.moveButton}
                  onPress={() => moveImage(index, 'right')}
                >
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurface} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderStep2 = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.stepTitle}>Listing Details</Text>
      
      <Text style={styles.inputLabel}>Title *</Text>
      <TextInput
        style={styles.input}
        placeholder="What are you selling?"
        placeholderTextColor={theme.colors.onSurfaceVariant}
        value={title}
        onChangeText={setTitle}
        maxLength={100}
      />
      <Text style={styles.charCount}>{title.length}/100</Text>
      
      <Text style={styles.inputLabel}>Description *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Describe your item in detail..."
        placeholderTextColor={theme.colors.onSurfaceVariant}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={5}
        maxLength={2000}
      />
      <Text style={styles.charCount}>{description.length}/2000</Text>
      
      <Text style={styles.inputLabel}>Condition</Text>
      <View style={styles.conditionRow}>
        {CONDITIONS.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.conditionChip, condition === c && styles.conditionChipSelected]}
            onPress={() => setCondition(condition === c ? null : c)}
          >
            <Text style={[styles.conditionText, condition === c && styles.conditionTextSelected]}>
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {category?.subcategories && category.subcategories.length > 0 && (
        <>
          <Text style={styles.inputLabel}>Subcategory</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {category.subcategories.map((sub) => (
              <TouchableOpacity
                key={sub}
                style={[styles.conditionChip, subcategory === sub && styles.conditionChipSelected]}
                onPress={() => setSubcategory(subcategory === sub ? null : sub)}
              >
                <Text style={[styles.conditionText, subcategory === sub && styles.conditionTextSelected]}>
                  {sub}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}
    </ScrollView>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Set Your Price</Text>
      
      <View style={styles.priceInputContainer}>
        <Text style={styles.currencySymbol}>$</Text>
        <TextInput
          style={styles.priceInput}
          placeholder="0"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />
      </View>
      
      <TouchableOpacity
        style={styles.negotiableToggle}
        onPress={() => setNegotiable(!negotiable)}
      >
        <View style={[styles.checkbox, negotiable && styles.checkboxChecked]}>
          {negotiable && <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />}
        </View>
        <Text style={styles.negotiableText}>Price is negotiable (VB)</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep4 = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.stepTitle}>Location & Details</Text>
      
      <Text style={styles.inputLabel}>Location *</Text>
      <TextInput
        style={styles.input}
        placeholder="City, State or Neighborhood"
        placeholderTextColor={theme.colors.onSurfaceVariant}
        value={location}
        onChangeText={setLocation}
      />
      
      {category?.attributes && category.attributes.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Additional Details</Text>
          {category.attributes.map((attr) => (
            <View key={attr.name}>
              <Text style={styles.inputLabel}>
                {attr.name.replace(/_/g, ' ')}
                {attr.required && ' *'}
              </Text>
              {attr.type === 'select' && attr.options ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {attr.options.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.conditionChip,
                        attributes[attr.name] === option && styles.conditionChipSelected,
                      ]}
                      onPress={() => setAttributes({
                        ...attributes,
                        [attr.name]: attributes[attr.name] === option ? '' : option,
                      })}
                    >
                      <Text
                        style={[
                          styles.conditionText,
                          attributes[attr.name] === option && styles.conditionTextSelected,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder={`Enter ${attr.name.replace(/_/g, ' ')}`}
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                  value={attributes[attr.name] || ''}
                  onChangeText={(text) => setAttributes({ ...attributes, [attr.name]: text })}
                  keyboardType={attr.type === 'number' ? 'numeric' : 'default'}
                />
              )}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );

  const renderStep5 = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.stepTitle}>Review Your Listing</Text>
      
      <View style={styles.previewCard}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {images.map((img, index) => (
            <Image key={index} source={{ uri: img }} style={styles.previewImage} />
          ))}
        </ScrollView>
        
        <View style={styles.previewContent}>
          <Text style={styles.previewPrice}>
            ${parseFloat(price || '0').toLocaleString()}
            {negotiable && <Text style={styles.previewVB}> VB</Text>}
          </Text>
          <Text style={styles.previewTitle}>{title}</Text>
          <View style={styles.previewMeta}>
            <Ionicons name="location-outline" size={14} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.previewLocation}>{location}</Text>
          </View>
          {condition && (
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>{condition}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.previewDescription}>
          <Text style={styles.previewDescTitle}>Description</Text>
          <Text style={styles.previewDescText}>{description}</Text>
        </View>
      </View>
    </ScrollView>
  );

  const TOTAL_STEPS = 5;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={prevStep}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {category?.name || 'Post Ad'}
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {renderStepIndicator()}

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        {step < TOTAL_STEPS ? (
          <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
            <Text style={styles.nextButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color={theme.colors.onPrimary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.publishButton, loading && styles.publishButtonDisabled]}
            onPress={handlePublish}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.onPrimary} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.onPrimary} />
                <Text style={styles.publishButtonText}>Publish Listing</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  cancelText: {
    color: theme.colors.error,
    fontWeight: '500',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: theme.colors.primary,
  },
  stepDotComplete: {
    backgroundColor: theme.colors.primary,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
  },
  stepNumberActive: {
    color: theme.colors.onPrimary,
  },
  stepLine: {
    width: 32,
    height: 2,
    backgroundColor: theme.colors.outlineVariant,
    marginHorizontal: 4,
  },
  stepLineComplete: {
    backgroundColor: theme.colors.primary,
  },
  content: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.xs,
  },
  stepSubtitle: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.lg,
  },
  imagesContainer: {
    flexDirection: 'row',
    marginTop: theme.spacing.md,
  },
  addImageButton: {
    width: 120,
    height: 120,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  addImageText: {
    fontSize: 13,
    color: theme.colors.primary,
    marginTop: theme.spacing.xs,
  },
  imageCount: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  imageWrapper: {
    width: 120,
    height: 120,
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  coverText: {
    color: theme.colors.onPrimary,
    fontSize: 10,
    fontWeight: '600',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageActions: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  moveButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    textTransform: 'capitalize',
  },
  input: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 4,
    fontSize: 15,
    color: theme.colors.onSurface,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: 4,
  },
  conditionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  conditionChip: {
    backgroundColor: theme.colors.surfaceVariant,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  conditionChipSelected: {
    backgroundColor: theme.colors.primary,
  },
  conditionText: {
    fontSize: 13,
    color: theme.colors.onSurface,
  },
  conditionTextSelected: {
    color: theme.colors.onPrimary,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  priceInput: {
    flex: 1,
    fontSize: 48,
    fontWeight: '700',
    color: theme.colors.onSurface,
    paddingVertical: theme.spacing.lg,
    marginLeft: theme.spacing.sm,
  },
  negotiableToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.outline,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  negotiableText: {
    fontSize: 15,
    color: theme.colors.onSurface,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
  },
  previewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.elevation.level2,
  },
  previewImage: {
    width: 200,
    height: 150,
    marginRight: 2,
  },
  previewContent: {
    padding: theme.spacing.md,
  },
  previewPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  previewVB: {
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.onSurfaceVariant,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: theme.spacing.xs,
  },
  previewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    gap: 4,
  },
  previewLocation: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
  },
  previewBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.sm,
  },
  previewBadgeText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  previewDescription: {
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
  },
  previewDescTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.xs,
  },
  previewDescText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
  },
  footer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.sm,
  },
  nextButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.sm,
  },
  publishButtonDisabled: {
    opacity: 0.7,
  },
  publishButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
