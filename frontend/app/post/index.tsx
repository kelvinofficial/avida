import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Switch,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { listingsApi, categoriesApi } from '../../src/utils/api';
import { useAuthStore } from '../../src/store/authStore';
import { getCategoryConfig, AttributeField, CategoryAttributeConfig } from '../../src/config/categoryAttributes';
import { safeGoBack } from '../../src/utils/navigation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_IMAGES = 10;

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  border: '#E0E0E0',
  error: '#D32F2F',
  errorLight: '#FFEBEE',
  success: '#2E7D32',
  warning: '#F57C00',
  warningLight: '#FFF3E0',
};

const SELLER_TYPES = ['Individual', 'Dealer', 'Company'];
const CONTACT_METHODS = ['Chat', 'WhatsApp', 'Phone Call', 'All'];

// ============ VALIDATION ERROR COMPONENT ============
interface ValidationErrorProps {
  message: string;
  visible: boolean;
}

const ValidationError: React.FC<ValidationErrorProps> = ({ message, visible }) => {
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[validationStyles.container, { opacity: fadeAnim }]}>
      <Ionicons name="alert-circle" size={14} color={COLORS.error} />
      <Text style={validationStyles.text}>{message}</Text>
    </Animated.View>
  );
};

const validationStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 6,
    gap: 6,
  },
  text: {
    fontSize: 12,
    color: COLORS.error,
    flex: 1,
  },
});

// ============ FORM FIELD ERRORS STATE ============
interface FieldErrors {
  [key: string]: string;
}

// ============ DYNAMIC FIELD RENDERER WITH VALIDATION ============
interface DynamicFieldProps {
  field: AttributeField;
  value: any;
  onChange: (value: any) => void;
  parentValues?: Record<string, any>;
  error?: string;
  onClearError?: () => void;
}

const DynamicField: React.FC<DynamicFieldProps> = ({ field, value, onChange, parentValues, error, onClearError }) => {
  // Get options for dependent dropdowns
  const options = useMemo(() => {
    if (field.dependsOn && field.dependentOptions && parentValues) {
      const parentValue = parentValues[field.dependsOn];
      if (parentValue) {
        return field.dependentOptions[parentValue] || field.dependentOptions['Other'] || [];
      }
      return [];
    }
    return field.options || [];
  }, [field, parentValues]);

  // Disable if dependent on a field that isn't set
  const isDisabled = field.dependsOn && parentValues && !parentValues[field.dependsOn];
  
  // Reset dependent field value when parent changes
  useEffect(() => {
    if (field.dependsOn && parentValues) {
      const parentValue = parentValues[field.dependsOn];
      // If parent changed and current value is not in new options, reset
      if (value && options.length > 0 && !options.includes(value)) {
        onChange('');
      }
    }
  }, [parentValues, field.dependsOn]);

  // Clear error when value changes
  const handleChange = (newValue: any) => {
    if (onClearError) onClearError();
    onChange(newValue);
  };

  // Common icon component
  const FieldIcon = field.icon ? (
    <View style={styles.fieldIconWrapper}>
      <Ionicons name={field.icon as any} size={18} color={error ? COLORS.error : COLORS.primary} />
    </View>
  ) : null;

  const hasError = !!error;

  switch (field.type) {
    case 'text':
      return (
        <View style={styles.fieldContainer}>
          <View style={styles.fieldLabelRow}>
            {FieldIcon}
            <Text style={styles.fieldLabel}>
              {field.label} {field.required && <Text style={styles.required}>*</Text>}
            </Text>
          </View>
          <View style={[styles.inputWrapper, hasError && styles.inputWrapperError]}>
            <TextInput
              style={[styles.input, isDisabled && styles.inputDisabled]}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              placeholderTextColor={COLORS.textSecondary}
              value={value || ''}
              onChangeText={handleChange}
              editable={!isDisabled}
            />
            {field.suffix && <Text style={styles.inputSuffix}>{field.suffix}</Text>}
          </View>
          <ValidationError message={error || ''} visible={hasError} />
        </View>
      );

    case 'number':
      return (
        <View style={styles.fieldContainer}>
          <View style={styles.fieldLabelRow}>
            {FieldIcon}
            <Text style={styles.fieldLabel}>
              {field.label} {field.required && <Text style={styles.required}>*</Text>}
            </Text>
          </View>
          <View style={[styles.inputWrapper, hasError && styles.inputWrapperError]}>
            <TextInput
              style={[styles.input, isDisabled && styles.inputDisabled]}
              placeholder={field.placeholder || '0'}
              placeholderTextColor={COLORS.textSecondary}
              value={value?.toString() || ''}
              onChangeText={(text) => handleChange(text ? parseInt(text.replace(/\D/g, '')) : '')}
              keyboardType="numeric"
              editable={!isDisabled}
            />
            {field.suffix && <Text style={styles.inputSuffix}>{field.suffix}</Text>}
          </View>
          {field.min !== undefined && field.max !== undefined && (
            <Text style={styles.fieldHint}>Range: {field.min} - {field.max}</Text>
          )}
          <ValidationError message={error || ''} visible={hasError} />
        </View>
      );

    case 'select':
      return (
        <View style={styles.fieldContainer}>
          <View style={styles.fieldLabelRow}>
            {FieldIcon}
            <Text style={styles.fieldLabel}>
              {field.label} {field.required && <Text style={styles.required}>*</Text>}
            </Text>
            {field.dependsOn && parentValues?.[field.dependsOn] && (
              <View style={styles.dependentBadge}>
                <Text style={styles.dependentBadgeText}>
                  for {parentValues[field.dependsOn]}
                </Text>
              </View>
            )}
          </View>
          {isDisabled ? (
            <View style={styles.disabledSelectContainer}>
              <Ionicons name="lock-closed-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.disabledText}>
                Select {field.dependsOn?.replace(/_/g, ' ')} first
              </Text>
            </View>
          ) : options.length === 0 ? (
            <View style={styles.disabledSelectContainer}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.warning} />
              <Text style={styles.disabledText}>No options available</Text>
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipContainer}
            >
              {options.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.chip, 
                    value === option && styles.chipSelected,
                    hasError && !value && styles.chipError,
                  ]}
                  onPress={() => handleChange(value === option ? '' : option)}
                >
                  <Text style={[styles.chipText, value === option && styles.chipTextSelected]}>
                    {option}
                  </Text>
                  {value === option && (
                    <Ionicons name="checkmark-circle" size={14} color="#fff" style={{ marginLeft: 4 }} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          <ValidationError message={error || ''} visible={hasError} />
        </View>
      );

    case 'toggle':
      return (
        <View style={styles.fieldContainer}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabelRow}>
              {FieldIcon}
              <Text style={styles.fieldLabel}>{field.label}</Text>
            </View>
            <Switch
              value={!!value}
              onValueChange={handleChange}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={value ? COLORS.primary : '#f4f4f4'}
            />
          </View>
        </View>
      );

    default:
      return null;
  }
};

// ============ MAIN COMPONENT ============
export default function PostListingScreen() {
  const { category: categoryId } = useLocalSearchParams<{ category: string }>();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [categoryConfig, setCategoryConfig] = useState<CategoryAttributeConfig | null>(null);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  
  // Step 1: Category Selection
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId || '');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  
  // Step 2: Images
  const [images, setImages] = useState<string[]>([]);
  
  // Step 3: Base Details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('');
  
  // Step 4: Category-Specific Attributes
  const [attributes, setAttributes] = useState<Record<string, any>>({});
  
  // Step 5: Price & Contact
  const [price, setPrice] = useState('');
  const [negotiable, setNegotiable] = useState(true);
  const [currency, setCurrency] = useState('EUR');
  const [location, setLocation] = useState('');
  const [sellerType, setSellerType] = useState('Individual');
  const [contactMethod, setContactMethod] = useState('Chat');

  // Form Validation Errors
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Clear specific field error
  const clearFieldError = (fieldName: string) => {
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // Initialize
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    fetchCategories();
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedCategoryId) {
      // Check if this category should use dedicated form
      if (selectedCategoryId === 'vehicles') {
        router.replace('/auto/post');
        return;
      }
      if (selectedCategoryId === 'property' || selectedCategoryId === 'realestate') {
        router.replace('/property/post');
        return;
      }
      
      const config = getCategoryConfig(selectedCategoryId);
      setCategoryConfig(config);
      // Reset attributes when category changes
      setAttributes({});
      setCondition('');
      // Clear errors on category change
      setFieldErrors({});
    }
  }, [selectedCategoryId]);

  const fetchCategories = async () => {
    try {
      const cats = await categoriesApi.getAll();
      setAllCategories(cats);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // ============ IMAGE HANDLING ============
  const pickImage = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('Limit Reached', `Maximum ${MAX_IMAGES} images allowed`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to photos');
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

  // ============ VALIDATION ============
  const validateStep = useCallback(() => {
    const errors: FieldErrors = {};
    let isValid = true;

    switch (step) {
      case 1:
        if (!selectedCategoryId) {
          errors.category = 'Please select a category';
          isValid = false;
        }
        break;
      case 2:
        if (images.length === 0) {
          errors.images = 'Please add at least one photo';
          isValid = false;
        }
        break;
      case 3:
        if (!title.trim()) {
          errors.title = 'Title is required';
          isValid = false;
        } else if (title.trim().length < 5) {
          errors.title = 'Title must be at least 5 characters';
          isValid = false;
        }
        if (!description.trim()) {
          errors.description = 'Description is required';
          isValid = false;
        } else if (description.trim().length < 20) {
          errors.description = 'Description must be at least 20 characters';
          isValid = false;
        }
        break;
      case 4:
        // Validate required attributes
        if (categoryConfig) {
          for (const field of categoryConfig.attributes) {
            if (field.required && !attributes[field.name]) {
              errors[field.name] = `${field.label} is required`;
              isValid = false;
            }
            // Number range validation
            if (field.type === 'number' && attributes[field.name]) {
              const val = Number(attributes[field.name]);
              if (field.min !== undefined && val < field.min) {
                errors[field.name] = `${field.label} must be at least ${field.min}`;
                isValid = false;
              }
              if (field.max !== undefined && val > field.max) {
                errors[field.name] = `${field.label} must be at most ${field.max}`;
                isValid = false;
              }
            }
          }
        }
        break;
      case 5:
        if (!price.trim()) {
          errors.price = 'Price is required';
          isValid = false;
        } else if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
          errors.price = 'Please enter a valid price greater than 0';
          isValid = false;
        }
        if (!location.trim()) {
          errors.location = 'Location is required';
          isValid = false;
        }
        break;
      default:
        break;
    }

    setFieldErrors(errors);
    
    // Show summary alert if there are errors
    if (!isValid) {
      const errorCount = Object.keys(errors).length;
      Alert.alert(
        'Please fix the errors',
        `${errorCount} field${errorCount > 1 ? 's' : ''} need${errorCount > 1 ? '' : 's'} your attention`
      );
    }

    return isValid;
    }
  }, [step, selectedCategoryId, images, title, description, categoryConfig, attributes, price, location]);

  const nextStep = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      safeGoBack(router);
    }
  };

  // ============ SUBMIT ============
  const handlePublish = async () => {
    if (!validateStep()) return;

    setLoading(true);
    try {
      const listingData = {
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price),
        currency,
        negotiable,
        category_id: selectedCategoryId,
        subcategory: selectedSubcategory || undefined,
        condition: condition || undefined,
        images,
        location: location.trim(),
        attributes: {
          ...attributes,
          seller_type: sellerType,
          contact_method: contactMethod,
        },
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

  // ============ STEP INDICATOR ============
  const TOTAL_STEPS = 6;
  const stepLabels = ['Category', 'Photos', 'Details', 'Attributes', 'Price', 'Review'];

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {stepLabels.map((label, i) => {
        const s = i + 1;
        return (
          <View key={s} style={styles.stepItem}>
            <View style={[
              styles.stepDot,
              s === step && styles.stepDotActive,
              s < step && styles.stepDotComplete,
            ]}>
              {s < step ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : (
                <Text style={[styles.stepNumber, (s === step || s < step) && styles.stepNumberActive]}>
                  {s}
                </Text>
              )}
            </View>
            {s < TOTAL_STEPS && (
              <View style={[styles.stepLine, s < step && styles.stepLineComplete]} />
            )}
          </View>
        );
      })}
    </View>
  );

  // ============ STEP 1: CATEGORY SELECTION ============
  const renderStep1 = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>What are you selling?</Text>
      <Text style={styles.stepSubtitle}>Choose the category that best fits your item</Text>
      
      <View style={styles.categoryGrid}>
        {allCategories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryCard,
              selectedCategoryId === cat.id && styles.categoryCardSelected,
            ]}
            onPress={() => {
              setSelectedCategoryId(cat.id);
              setSelectedSubcategory('');
            }}
          >
            <View style={[
              styles.categoryIconWrapper,
              selectedCategoryId === cat.id && styles.categoryIconWrapperSelected,
            ]}>
              <Ionicons 
                name={cat.icon as any} 
                size={28} 
                color={selectedCategoryId === cat.id ? '#fff' : COLORS.primary} 
              />
            </View>
            <Text style={[
              styles.categoryName,
              selectedCategoryId === cat.id && styles.categoryNameSelected,
            ]} numberOfLines={2}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Subcategory Selection */}
      {selectedCategoryId && (
        <View style={styles.subcategorySection}>
          <Text style={styles.sectionTitle}>Subcategory (Optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {allCategories
              .find((c) => c.id === selectedCategoryId)
              ?.subcategories?.map((sub: string) => (
                <TouchableOpacity
                  key={sub}
                  style={[styles.chip, selectedSubcategory === sub && styles.chipSelected]}
                  onPress={() => setSelectedSubcategory(selectedSubcategory === sub ? '' : sub)}
                >
                  <Text style={[styles.chipText, selectedSubcategory === sub && styles.chipTextSelected]}>
                    {sub}
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );

  // ============ STEP 2: IMAGES ============
  const renderStep2 = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Add Photos</Text>
      <Text style={styles.stepSubtitle}>
        Upload up to {MAX_IMAGES} photos. First photo will be the cover image.
      </Text>

      <View style={styles.imagesGrid}>
        <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
          <Ionicons name="camera-outline" size={36} color={COLORS.primary} />
          <Text style={styles.addImageText}>Add Photo</Text>
          <Text style={styles.imageCountText}>{images.length}/{MAX_IMAGES}</Text>
        </TouchableOpacity>

        {images.map((img, index) => (
          <View key={index} style={styles.imageWrapper}>
            <Image source={{ uri: img }} style={styles.imagePreview} />
            {index === 0 && (
              <View style={styles.coverBadge}>
                <Text style={styles.coverBadgeText}>Cover</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.removeImageBtn}
              onPress={() => removeImage(index)}
            >
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={styles.photoTips}>
        <Text style={styles.tipsTitle}>📸 Photo Tips</Text>
        <Text style={styles.tipText}>• Use good lighting</Text>
        <Text style={styles.tipText}>• Show the item from multiple angles</Text>
        <Text style={styles.tipText}>• Include any defects or damage</Text>
      </View>
    </ScrollView>
  );

  // ============ STEP 3: BASE DETAILS ============
  const renderStep3 = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Listing Details</Text>
      <Text style={styles.stepSubtitle}>Describe what you're selling</Text>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Title <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="What are you selling?"
          placeholderTextColor={COLORS.textSecondary}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />
        <Text style={styles.charCount}>{title.length}/100</Text>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Description <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Include details like condition, features, reason for selling..."
          placeholderTextColor={COLORS.textSecondary}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={6}
          maxLength={2000}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{description.length}/2000</Text>
      </View>

      {/* Condition - Category specific options */}
      {categoryConfig?.conditionOptions && (
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Condition</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categoryConfig.conditionOptions.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, condition === c && styles.chipSelected]}
                onPress={() => setCondition(condition === c ? '' : c)}
              >
                <Text style={[styles.chipText, condition === c && styles.chipTextSelected]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );

  // ============ STEP 4: DYNAMIC ATTRIBUTES ============
  const renderStep4 = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>
        {categoryConfig?.name || 'Category'} Details
      </Text>
      <Text style={styles.stepSubtitle}>
        Fill in the specific details for your {categoryConfig?.name?.toLowerCase() || 'item'}
      </Text>

      {categoryConfig?.attributes.map((field) => (
        <DynamicField
          key={field.name}
          field={field}
          value={attributes[field.name]}
          onChange={(value) => setAttributes({ ...attributes, [field.name]: value })}
          parentValues={attributes}
          error={fieldErrors[field.name]}
          onClearError={() => clearFieldError(field.name)}
        />
      ))}

      {(!categoryConfig || categoryConfig.attributes.length === 0) && (
        <View style={styles.noAttributesMessage}>
          <Ionicons name="information-circle-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.noAttributesText}>
            No additional details required for this category.
          </Text>
          <Text style={styles.noAttributesSubtext}>
            You can proceed to the next step.
          </Text>
        </View>
      )}
    </ScrollView>
  );

  // ============ STEP 5: PRICE & CONTACT ============
  const renderStep5 = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Price & Contact</Text>
      <Text style={styles.stepSubtitle}>Set your price and how buyers can reach you</Text>

      <View style={styles.priceSection}>
        <Text style={styles.fieldLabel}>Price <Text style={styles.required}>*</Text></Text>
        <View style={styles.priceInputContainer}>
          <Text style={styles.currencySymbol}>€</Text>
          <TextInput
            style={styles.priceInput}
            placeholder="0"
            placeholderTextColor={COLORS.textSecondary}
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />
        </View>
        
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Price is negotiable (VB)</Text>
          <Switch
            value={negotiable}
            onValueChange={setNegotiable}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={negotiable ? COLORS.primary : '#f4f4f4'}
          />
        </View>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Location <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="City, State (e.g., Berlin, Germany)"
          placeholderTextColor={COLORS.textSecondary}
          value={location}
          onChangeText={setLocation}
        />
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Seller Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {SELLER_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.chip, sellerType === type && styles.chipSelected]}
              onPress={() => setSellerType(type)}
            >
              <Text style={[styles.chipText, sellerType === type && styles.chipTextSelected]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Preferred Contact Method</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {CONTACT_METHODS.map((method) => (
            <TouchableOpacity
              key={method}
              style={[styles.chip, contactMethod === method && styles.chipSelected]}
              onPress={() => setContactMethod(method)}
            >
              <Text style={[styles.chipText, contactMethod === method && styles.chipTextSelected]}>
                {method}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );

  // ============ STEP 6: REVIEW ============
  const renderStep6 = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Review Your Listing</Text>
      <Text style={styles.stepSubtitle}>Make sure everything looks good before publishing</Text>

      <View style={styles.previewCard}>
        {/* Images */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewImages}>
          {images.map((img, i) => (
            <Image key={i} source={{ uri: img }} style={styles.previewImage} />
          ))}
        </ScrollView>

        {/* Main Info */}
        <View style={styles.previewContent}>
          <Text style={styles.previewPrice}>
            €{parseFloat(price || '0').toLocaleString()}
            {negotiable && <Text style={styles.previewVB}> VB</Text>}
          </Text>
          <Text style={styles.previewTitle}>{title}</Text>
          
          <View style={styles.previewMeta}>
            <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.previewLocation}>{location}</Text>
          </View>

          {condition && (
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>{condition}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.previewSection}>
          <Text style={styles.previewSectionTitle}>Description</Text>
          <Text style={styles.previewDescription}>{description}</Text>
        </View>

        {/* Attributes */}
        {Object.keys(attributes).length > 0 && (
          <View style={styles.previewSection}>
            <Text style={styles.previewSectionTitle}>Details</Text>
            <View style={styles.attributesList}>
              {Object.entries(attributes).map(([key, value]) => {
                if (!value) return null;
                const field = categoryConfig?.attributes.find(a => a.name === key);
                return (
                  <View key={key} style={styles.attributeRow}>
                    <Text style={styles.attributeLabel}>
                      {field?.label || key.replace(/_/g, ' ')}
                    </Text>
                    <Text style={styles.attributeValue}>
                      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Seller Info */}
        <View style={styles.previewSection}>
          <Text style={styles.previewSectionTitle}>Seller Information</Text>
          <Text style={styles.previewSellerType}>{sellerType} • {contactMethod}</Text>
        </View>
      </View>
    </ScrollView>
  );

  // ============ RENDER ============
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={prevStep}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 1 ? 'New Listing' : stepLabels[step - 1]}
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Content */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
        {step === 6 && renderStep6()}
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={styles.footer}>
        {step < TOTAL_STEPS ? (
          <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
            <Text style={styles.nextButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.publishButton, loading && styles.publishButtonDisabled]}
            onPress={handlePublish}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
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
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  cancelText: {
    color: COLORS.error,
    fontWeight: '500',
    fontSize: 15,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: COLORS.surface,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
  },
  stepDotComplete: {
    backgroundColor: COLORS.primary,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepLine: {
    width: 24,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },
  stepLineComplete: {
    backgroundColor: COLORS.primary,
  },
  content: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    padding: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  // Category Grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  categoryCard: {
    width: (SCREEN_WIDTH - 56) / 3,
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 4,
    marginBottom: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  categoryIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIconWrapperSelected: {
    backgroundColor: COLORS.primary,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 16,
  },
  categoryNameSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  subcategorySection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  // Images
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  addImageButton: {
    width: (SCREEN_WIDTH - 56) / 3,
    height: (SCREEN_WIDTH - 56) / 3,
    margin: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
    marginTop: 4,
  },
  imageCountText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  imageWrapper: {
    width: (SCREEN_WIDTH - 56) / 3,
    height: (SCREEN_WIDTH - 56) / 3,
    margin: 6,
    borderRadius: 12,
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
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coverBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoTips: {
    marginTop: 24,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  // Fields
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  toggleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  required: {
    color: COLORS.error,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapperError: {
    borderColor: COLORS.error,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputDisabled: {
    backgroundColor: COLORS.background,
    color: COLORS.textSecondary,
  },
  inputSuffix: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  fieldHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  disabledSelectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  disabledText: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    fontSize: 14,
  },
  dependentBadge: {
    marginLeft: 8,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  dependentBadgeText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '500',
  },
  textArea: {
    minHeight: 140,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  chipContainer: {
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleLabel: {
    fontSize: 15,
    color: COLORS.text,
  },
  // Price
  priceSection: {
    marginBottom: 24,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primary,
  },
  priceInput: {
    flex: 1,
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.text,
    paddingVertical: 20,
    marginLeft: 8,
  },
  // No attributes message
  noAttributesMessage: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noAttributesText: {
    fontSize: 16,
    color: COLORS.text,
    marginTop: 16,
    textAlign: 'center',
  },
  noAttributesSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  // Preview
  previewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewImages: {
    flexDirection: 'row',
  },
  previewImage: {
    width: 200,
    height: 150,
    marginRight: 2,
  },
  previewContent: {
    padding: 16,
  },
  previewPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
  },
  previewVB: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 4,
  },
  previewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  previewLocation: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  previewBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  previewBadgeText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  previewSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  previewSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  previewDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  attributesList: {
    gap: 8,
  },
  attributeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  attributeLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  attributeValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  previewSellerType: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  // Footer
  footer: {
    padding: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 28,
    gap: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 28,
    gap: 8,
  },
  publishButtonDisabled: {
    opacity: 0.7,
  },
  publishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
