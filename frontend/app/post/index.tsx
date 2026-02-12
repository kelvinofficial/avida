import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import api from '../../src/utils/api';
import { useAuthStore } from '../../src/store/authStore';
import { useBadgeCelebration } from '../../src/context/BadgeCelebrationContext';
import { useMilestones } from '../../src/context/MilestoneContext';
import { 
  ALL_CATEGORIES, 
  getMainCategory, 
  getSubcategoryConfig,
  getSubcategories,
  getSubcategoryAttributes,
  getConditionOptions,
  SubcategoryAttribute,
  MainCategoryConfig,
  SubcategoryConfig,
} from '../../src/config/subcategories';
import { safeGoBack } from '../../src/utils/navigation';
import { SuccessModal } from '../../src/components/SuccessModal';
import { useResponsive } from '../../src/hooks/useResponsive';
import { LocationPicker, LocationData } from '../../src/components/LocationPicker';
import { useFormConfig } from '../../src/hooks/useFormConfig';
import { usePhotographyGuides } from '../../src/hooks/usePhotographyGuides';
import {
  getListingTips,
  CATEGORY_PREFERENCES,
} from '../../src/config/listingFormConfig';

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

// ============ ERROR BANNER COMPONENT ============
interface ErrorBannerProps {
  errors: FieldErrors;
  visible: boolean;
  onDismiss: () => void;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({ errors, visible, onDismiss }) => {
  const [slideAnim] = useState(new Animated.Value(-100));
  const errorList = Object.entries(errors);
  const errorCount = errorList.length;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : -100,
      useNativeDriver: true,
      tension: 100,
      friction: 12,
    }).start();
  }, [visible]);

  if (!visible || errorCount === 0) return null;

  return (
    <Animated.View 
      style={[
        errorBannerStyles.container, 
        { transform: [{ translateY: slideAnim }] }
      ]}
    >
      <View style={errorBannerStyles.header}>
        <View style={errorBannerStyles.iconWrapper}>
          <Ionicons name="alert-circle" size={20} color="#fff" />
        </View>
        <View style={errorBannerStyles.titleWrapper}>
          <Text style={errorBannerStyles.title}>
            Please fix {errorCount} error{errorCount > 1 ? 's' : ''}
          </Text>
          <Text style={errorBannerStyles.subtitle}>
            Complete the required fields to continue
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} style={errorBannerStyles.closeButton}>
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={errorBannerStyles.errorList}>
        {errorList.slice(0, 3).map(([field, message], index) => (
          <View key={field} style={errorBannerStyles.errorItem}>
            <View style={errorBannerStyles.errorBullet} />
            <Text style={errorBannerStyles.errorText} numberOfLines={1}>
              {message}
            </Text>
          </View>
        ))}
        {errorCount > 3 && (
          <Text style={errorBannerStyles.moreErrors}>
            +{errorCount - 3} more error{errorCount - 3 > 1 ? 's' : ''}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

const errorBannerStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.error,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrapper: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorList: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  errorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  errorText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
  },
  moreErrors: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontStyle: 'italic',
    marginTop: 4,
  },
});

// ============ FORM FIELD ERRORS STATE ============
interface FieldErrors {
  [key: string]: string;
}

// ============ DYNAMIC FIELD RENDERER WITH VALIDATION ============
interface DynamicFieldProps {
  field: SubcategoryAttribute;
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
  const { category: categoryId, edit: editListingId } = useLocalSearchParams<{ category: string; edit: string }>();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { isDesktop, isTablet } = useResponsive();
  const { showCelebration, showMultipleCelebrations } = useBadgeCelebration();
  const { checkForNewMilestones } = useMilestones();
  const isLargeScreen = isDesktop || isTablet;
  
  // Use form config hook (fetches from API with static fallback)
  const {
    getPlaceholders,
    getSellerTypes,
    shouldHidePrice,
    shouldShowSalaryRange,
    shouldHideCondition,
    isChatOnlyCategory,
    getCategoryPreferences,
  } = useFormConfig();
  
  // Fetch photography guides from admin-managed API (with fallback to static)
  const { guides: photoGuides, loading: photoGuidesLoading } = usePhotographyGuides(selectedCategoryId || undefined);
  
  // Track user's badges before listing creation
  const previousBadgesRef = useRef<string[]>([]);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(!!editListingId);
  const [editLoading, setEditLoading] = useState(!!editListingId);
  const [originalListing, setOriginalListing] = useState<any>(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  
  // Refs for auto-scrolling
  const subcategorySectionRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [subcategorySectionY, setSubcategorySectionY] = useState(0);
  
  // Step 1: Category & Subcategory Selection
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId || '');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');
  
  // Auto-scroll to subcategories when category is selected
  const handleCategorySelect = useCallback((catId: string) => {
    setSelectedCategoryId(catId);
    setSelectedSubcategoryId('');
    
    // Scroll to subcategory section after a short delay (for web/mobile compatibility)
    setTimeout(() => {
      if (scrollViewRef.current && subcategorySectionY > 0) {
        scrollViewRef.current.scrollTo({ y: subcategorySectionY - 20, animated: true });
      }
    }, 200);
  }, [subcategorySectionY]);
  
  // Derived state for current subcategory config
  const currentSubcategoryConfig = useMemo(() => {
    if (!selectedCategoryId || !selectedSubcategoryId) return null;
    return getSubcategoryConfig(selectedCategoryId, selectedSubcategoryId);
  }, [selectedCategoryId, selectedSubcategoryId]);

  // Get available subcategories for selected category
  const availableSubcategories = useMemo(() => {
    if (!selectedCategoryId) return [];
    return getSubcategories(selectedCategoryId);
  }, [selectedCategoryId]);

  // Get condition options for selected subcategory
  const conditionOptions = useMemo(() => {
    if (!selectedCategoryId || !selectedSubcategoryId) return ['New', 'Like New', 'Good', 'Fair'];
    return getConditionOptions(selectedCategoryId, selectedSubcategoryId);
  }, [selectedCategoryId, selectedSubcategoryId]);
  
  // Step 2: Images
  const [images, setImages] = useState<string[]>([]);
  
  // AI Analyzer State
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestionsApplied, setAiSuggestionsApplied] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  
  // Step 3: Base Details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('');
  
  // Step 4: Subcategory-Specific Attributes
  const [attributes, setAttributes] = useState<Record<string, any>>({});
  
  // Step 5: Price & Contact
  const [price, setPrice] = useState('');
  const [negotiable, setNegotiable] = useState(true);
  const [currency, setCurrency] = useState('EUR');
  const [location, setLocation] = useState('');
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [sellerType, setSellerType] = useState('Individual');
  
  // Salary Range (for job listings)
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [salaryPeriod, setSalaryPeriod] = useState<'hourly' | 'monthly' | 'yearly'>('monthly');
  
  // Price Suggestion State
  const [priceSuggestionLoading, setPriceSuggestionLoading] = useState(false);
  const [priceSuggestion, setPriceSuggestion] = useState<any>(null);
  const [priceSuggestionError, setPriceSuggestionError] = useState<string | null>(null);
  
  // Seller Preferences
  const [acceptsOffers, setAcceptsOffers] = useState(true);
  const [acceptsExchanges, setAcceptsExchanges] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [contactPreferences, setContactPreferences] = useState({
    inAppChat: true,
    whatsapp: false,
    call: false,
  });

  // Success Modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Form Validation Errors
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showErrorBanner, setShowErrorBanner] = useState(false);

  // Auto-hide error banner after 5 seconds
  useEffect(() => {
    if (showErrorBanner && Object.keys(fieldErrors).length > 0) {
      const timer = setTimeout(() => {
        setShowErrorBanner(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showErrorBanner, fieldErrors]);

  // Load existing listing data when in edit mode
  useEffect(() => {
    const loadListingForEdit = async () => {
      if (!editListingId) return;
      
      setEditLoading(true);
      try {
        const listing = await listingsApi.getOne(editListingId);
        if (listing) {
          setOriginalListing(listing);
          
          // Pre-fill all fields with existing data
          setSelectedCategoryId(listing.category_id || '');
          setSelectedSubcategoryId(listing.subcategory_id || '');
          setImages(listing.images || []);
          setTitle(listing.title || '');
          setDescription(listing.description || '');
          setCondition(listing.condition || '');
          setAttributes(listing.attributes || {});
          setPrice(listing.price?.toString() || '');
          setNegotiable(listing.negotiable !== false);
          setCurrency(listing.currency || 'EUR');
          setLocation(listing.location || '');
          setLocationData(listing.location_data || null);
          setSellerType(listing.seller_type || 'Individual');
          setAcceptsOffers(listing.accepts_offers !== false);
          setAcceptsExchanges(listing.accepts_exchanges || false);
          setWhatsappNumber(listing.whatsapp_number || '');
          setPhoneNumber(listing.phone_number || '');
          
          // Set contact preferences
          if (listing.contact_preferences) {
            setContactPreferences(listing.contact_preferences);
          }
          
          // Skip to step 2 (images) since category is already set
          setStep(2);
        }
      } catch (error) {
        console.error('Failed to load listing for edit:', error);
        Alert.alert('Error', 'Failed to load listing data. Please try again.');
      } finally {
        setEditLoading(false);
      }
    };
    
    loadListingForEdit();
  }, [editListingId]);

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

  // Initialize - check authentication
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login?redirect=/post');
      return;
    }
    // Categories are now loaded from the config file, no need to fetch
    setCategoriesLoading(false);
  }, [isAuthenticated]);

  // Load user's default location for new listings
  useEffect(() => {
    const loadDefaultLocation = async () => {
      // Only load default location for new listings (not edit)
      if (editListingId || !isAuthenticated) return;
      
      try {
        const response = await api.get('/users/me/location');
        const defaultLoc = response.data?.default_location;
        if (defaultLoc && !locationData) {
          setLocationData(defaultLoc);
          setLocation(defaultLoc.location_text || defaultLoc.city_name || '');
        }
      } catch (error) {
        // Silently fail - default location is optional
        console.log('Could not load default location:', error);
      }
    };
    
    loadDefaultLocation();
  }, [isAuthenticated, editListingId]);

  // Reset subcategory when category changes
  useEffect(() => {
    if (selectedCategoryId) {
      // Reset subcategory, attributes and condition when category changes
      setSelectedSubcategoryId('');
      setAttributes({});
      setCondition('');
      // Clear errors on category change
      setFieldErrors({});
    }
  }, [selectedCategoryId]);

  // Reset attributes when subcategory changes
  useEffect(() => {
    if (selectedSubcategoryId) {
      setAttributes({});
      setCondition('');
      setFieldErrors({});
    }
  }, [selectedSubcategoryId]);

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
      const newImages = [...images, `data:image/jpeg;base64,${result.assets[0].base64}`];
      setImages(newImages);
      
      // Trigger AI analysis when first image is added or when we have at least one image
      if (newImages.length === 1) {
        triggerAiAnalysis(newImages);
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    // Reset AI state if no images left
    if (images.length <= 1) {
      setAiResult(null);
      setShowAiSuggestions(false);
      setAiSuggestionsApplied(false);
    }
  };

  // ============ AI ANALYZER ============
  const triggerAiAnalysis = async (imagesToAnalyze: string[]) => {
    if (!user?.user_id || imagesToAnalyze.length === 0) return;
    
    setAiAnalyzing(true);
    setAiError(null);
    setShowAiSuggestions(false);
    
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/ai-analyzer/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: imagesToAnalyze.map(img => img.replace(/^data:image\/\w+;base64,/, '')),
          category_hint: selectedCategoryId || null,
          user_id: user.user_id,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.result) {
        setAiResult(data.result);
        setShowAiSuggestions(true);
      } else {
        setAiError(data.error || 'AI analysis failed');
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      setAiError('Failed to analyze photos. You can continue manually.');
    } finally {
      setAiAnalyzing(false);
    }
  };

  const applyAiSuggestions = () => {
    if (!aiResult) return;
    
    // Apply title
    if (aiResult.suggested_title) {
      setTitle(aiResult.suggested_title);
    }
    
    // Apply description
    if (aiResult.suggested_description) {
      setDescription(aiResult.suggested_description);
    }
    
    // Apply condition
    if (aiResult.detected_condition) {
      const conditionMap: Record<string, string> = {
        'new': 'New',
        'like_new': 'Like New',
        'good': 'Good',
        'fair': 'Fair',
        'poor': 'For Parts'
      };
      setCondition(conditionMap[aiResult.detected_condition] || aiResult.detected_condition);
    }
    
    // Apply attributes
    if (aiResult.suggested_attributes) {
      setAttributes(prev => ({
        ...prev,
        ...aiResult.suggested_attributes
      }));
    }
    
    setAiSuggestionsApplied(true);
    setShowAiSuggestions(false);
    
    // Send feedback
    submitAiFeedback(aiResult.id, true, false, false);
    
    Alert.alert('AI Suggestions Applied', 'Review and edit the suggested fields as needed.');
  };

  const applyPartialAiSuggestions = (field: string) => {
    if (!aiResult) return;
    
    switch (field) {
      case 'title':
        if (aiResult.suggested_title) setTitle(aiResult.suggested_title);
        break;
      case 'description':
        if (aiResult.suggested_description) setDescription(aiResult.suggested_description);
        break;
      case 'condition':
        if (aiResult.detected_condition) {
          const conditionMap: Record<string, string> = {
            'new': 'New', 'like_new': 'Like New', 'good': 'Good', 'fair': 'Fair', 'poor': 'For Parts'
          };
          setCondition(conditionMap[aiResult.detected_condition] || aiResult.detected_condition);
        }
        break;
      case 'attributes':
        if (aiResult.suggested_attributes) {
          setAttributes(prev => ({ ...prev, ...aiResult.suggested_attributes }));
        }
        break;
    }
    
    submitAiFeedback(aiResult.id, false, true, false);
  };

  const dismissAiSuggestions = () => {
    setShowAiSuggestions(false);
    if (aiResult) {
      submitAiFeedback(aiResult.id, false, false, true);
    }
  };

  const submitAiFeedback = async (analysisId: string, accepted: boolean, edited: boolean, rejected: boolean) => {
    try {
      await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/ai-analyzer/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis_id: analysisId, accepted, edited, rejected }),
      });
    } catch (error) {
      console.error('Failed to submit AI feedback:', error);
    }
  };

  const regenerateAiAnalysis = () => {
    if (images.length > 0) {
      triggerAiAnalysis(images);
    }
  };

  // ============ PRICE SUGGESTION ============
  const getPriceSuggestion = async () => {
    setPriceSuggestionLoading(true);
    setPriceSuggestionError(null);
    setPriceSuggestion(null);
    
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/ai-analyzer/price-suggestion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategoryId || aiResult?.detected_category,
          subcategory: selectedSubcategoryId || aiResult?.detected_subcategory,
          brand: attributes.brand || attributes.Brand || aiResult?.detected_brand,
          model: attributes.model || attributes.Model || aiResult?.detected_model,
          condition: condition || aiResult?.detected_condition,
          detected_features: aiResult?.detected_features || [],
          user_id: user?.user_id,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.price_suggestion) {
        setPriceSuggestion(data);
      } else {
        setPriceSuggestionError(data.error || 'Could not generate price suggestion');
      }
    } catch (error) {
      console.error('Price suggestion error:', error);
      setPriceSuggestionError('Failed to get price suggestion. Please try again.');
    } finally {
      setPriceSuggestionLoading(false);
    }
  };

  const applyPriceSuggestion = (suggestedPrice: number) => {
    setPrice(suggestedPrice.toString());
    setPriceSuggestion(null);
  };

  const dismissPriceSuggestion = () => {
    setPriceSuggestion(null);
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
        if (!selectedSubcategoryId) {
          errors.subcategory = 'Please select a subcategory';
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
        // Validate required attributes from subcategory config
        if (currentSubcategoryConfig) {
          for (const field of currentSubcategoryConfig.attributes) {
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
        // Only validate price if the category requires it
        const hidePrice = shouldHidePrice(selectedCategoryId, selectedSubcategoryId);
        if (!hidePrice) {
          if (!price.trim()) {
            errors.price = 'Price is required';
            isValid = false;
          } else if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
            errors.price = 'Please enter a valid price greater than 0';
            isValid = false;
          }
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
    
    // Show error banner at the top instead of Alert
    if (!isValid) {
      setShowErrorBanner(true);
      // Scroll to top to show error banner
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
      }
    } else {
      setShowErrorBanner(false);
    }

    return isValid;
  }, [step, selectedCategoryId, selectedSubcategoryId, images, title, description, currentSubcategoryConfig, attributes, price, location]);

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
  const getContactMethods = () => {
    const methods: string[] = [];
    if (contactPreferences.inAppChat) methods.push('chat');
    if (contactPreferences.whatsapp) methods.push('whatsapp');
    if (contactPreferences.call) methods.push('call');
    return methods;
  };

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
        subcategory: selectedSubcategoryId, // Required - the subcategory ID
        subcategory_id: selectedSubcategoryId, // Also store for edit pre-fill
        condition: condition || undefined,
        images,
        location: location.trim(),
        location_data: locationData || undefined, // New structured location data
        attributes: {
          ...attributes,
          seller_type: sellerType,
        },
        // Seller preferences
        accepts_offers: acceptsOffers,
        accepts_exchanges: acceptsExchanges,
        contact_methods: getContactMethods(),
        whatsapp_number: contactPreferences.whatsapp ? whatsappNumber : undefined,
        phone_number: contactPreferences.call ? phoneNumber : undefined,
        contact_preferences: contactPreferences,
        seller_type: sellerType,
      };

      if (isEditMode && editListingId) {
        // Update existing listing
        await listingsApi.update(editListingId, listingData);
        Alert.alert('Success', 'Listing updated successfully!', [
          { text: 'OK', onPress: () => router.replace('/profile/my-listings') }
        ]);
      } else {
        // Get current badges before creating
        let previousBadgeIds: string[] = [];
        try {
          const badgesRes = await api.get(`/users/${user?.user_id}/badges`);
          previousBadgeIds = (badgesRes.data || []).map((b: any) => b.badge_id || b.id);
        } catch (e) {
          // Ignore error - user might not have any badges yet
        }
        
        // Create new listing
        await listingsApi.create(listingData);
        
        // Check for new badges after a short delay (badges are awarded async)
        setTimeout(async () => {
          try {
            const newBadgesRes = await api.get(`/users/${user?.user_id}/badges`);
            const newBadges = newBadgesRes.data || [];
            const newBadgeIds = newBadges.map((b: any) => b.badge_id || b.id);
            
            // Find newly earned badges
            const earnedBadges = newBadges.filter((b: any) => 
              !previousBadgeIds.includes(b.badge_id || b.id)
            );
            
            if (earnedBadges.length > 0) {
              const badgesToCelebrate = earnedBadges.map((b: any) => ({
                name: b.name,
                description: b.description,
                icon: b.icon,
                color: b.color || '#4CAF50',
                points_earned: b.points_value || 10,
              }));
              showMultipleCelebrations(badgesToCelebrate);
              
              // Check for milestone achievements after showing badge celebration
              setTimeout(() => {
                checkForNewMilestones();
              }, 3000);
            }
          } catch (e) {
            console.error('Failed to check for new badges:', e);
          }
        }, 2000); // Wait 2 seconds for async badge awarding
        
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      console.error('Error saving listing:', error);
      Alert.alert('Error', error.response?.data?.detail || `Failed to ${isEditMode ? 'update' : 'post'} listing`);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    router.replace('/');
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

  // ============ STEP 1: CATEGORY & SUBCATEGORY SELECTION ============
  const renderStep1 = () => {
    const selectedMainCategory = getMainCategory(selectedCategoryId);
    
    // Desktop-specific category grid
    if (isLargeScreen) {
      return (
        <ScrollView ref={scrollViewRef} style={styles.stepContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.stepTitle}>What are you selling?</Text>
          <Text style={styles.stepSubtitle}>Choose the category and subcategory for your item</Text>
          
          {/* Main Category Selection - Desktop 4-column grid */}
          <Text style={styles.sectionTitle}>Category <Text style={styles.required}>*</Text></Text>
          <View style={desktopStyles.categoryGrid}>
            {ALL_CATEGORIES.map((cat) => (
              <View key={cat.id} style={desktopStyles.categoryCardWrapper}>
                <TouchableOpacity
                  style={[
                    desktopStyles.categoryCardInner,
                    selectedCategoryId === cat.id && desktopStyles.categoryCardSelected,
                  ]}
                  onPress={() => handleCategorySelect(cat.id)}
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
              </View>
            ))}
          </View>
          {fieldErrors.category && (
            <ValidationError message={fieldErrors.category} visible={true} />
          )}

          {/* Subcategory Selection - MANDATORY */}
          {selectedCategoryId && availableSubcategories.length > 0 && (
            <View 
              ref={subcategorySectionRef} 
              style={styles.subcategorySection}
              onLayout={(e) => setSubcategorySectionY(e.nativeEvent.layout.y)}
            >
              <Text style={styles.sectionTitle}>
                Subcategory <Text style={styles.required}>*</Text>
              </Text>
              <Text style={styles.sectionSubtitle}>
                Select the specific type of {selectedMainCategory?.name.toLowerCase() || 'item'}
              </Text>
              
              <View style={desktopStyles.subcategoryGrid}>
                {availableSubcategories.map((sub) => (
                  <TouchableOpacity
                    key={sub.id}
                    style={[
                      desktopStyles.subcategoryItem,
                      selectedSubcategoryId === sub.id && desktopStyles.subcategoryItemSelected,
                      fieldErrors.subcategory && !selectedSubcategoryId && styles.subcategoryItemError,
                    ]}
                    onPress={() => setSelectedSubcategoryId(sub.id)}
                  >
                    <Text style={[
                      styles.subcategoryText,
                      selectedSubcategoryId === sub.id && styles.subcategoryTextSelected,
                    ]}>
                      {sub.name}
                    </Text>
                    {selectedSubcategoryId === sub.id && (
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          {fieldErrors.subcategory && (
            <ValidationError message={fieldErrors.subcategory} visible={true} />
          )}
        </ScrollView>
      );
    }
    
    // Mobile layout
    return (
      <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepTitle}>What are you selling?</Text>
        <Text style={styles.stepSubtitle}>Choose the category and subcategory for your item</Text>
        
        {/* Main Category Selection */}
        <Text style={styles.sectionTitle}>Category <Text style={styles.required}>*</Text></Text>
        <View style={styles.categoryGrid}>
          {ALL_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryCard,
                selectedCategoryId === cat.id && styles.categoryCardSelected,
              ]}
              onPress={() => handleCategorySelect(cat.id)}
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
        {fieldErrors.category && (
          <ValidationError message={fieldErrors.category} visible={true} />
        )}

        {/* Subcategory Selection - MANDATORY */}
        {selectedCategoryId && availableSubcategories.length > 0 && (
          <View style={styles.subcategorySection}>
            <Text style={styles.sectionTitle}>
              Subcategory <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.sectionSubtitle}>
              Select the specific type of {selectedMainCategory?.name.toLowerCase() || 'item'}
            </Text>
            
            <View style={styles.subcategoryList}>
              {availableSubcategories.map((sub) => (
                <TouchableOpacity
                  key={sub.id}
                  style={[
                    styles.subcategoryItem,
                    selectedSubcategoryId === sub.id && styles.subcategoryItemSelected,
                    fieldErrors.subcategory && !selectedSubcategoryId && styles.subcategoryItemError,
                  ]}
                  onPress={() => setSelectedSubcategoryId(sub.id)}
                >
                  <View style={styles.subcategoryContent}>
                    <Text style={[
                      styles.subcategoryText,
                      selectedSubcategoryId === sub.id && styles.subcategoryTextSelected,
                    ]}>
                      {sub.name}
                    </Text>
                  </View>
                  {selectedSubcategoryId === sub.id && (
                    <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {fieldErrors.subcategory && (
              <ValidationError message={fieldErrors.subcategory} visible={true} />
            )}
          </View>
        )}
        
        {/* Selected Summary */}
        {selectedCategoryId && selectedSubcategoryId && currentSubcategoryConfig && (
          <View style={styles.selectionSummary}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.selectionSummaryText}>
              {selectedMainCategory?.name} → {currentSubcategoryConfig.name}
            </Text>
          </View>
        )}
      </ScrollView>
    );
  };

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

      {/* Dynamic Category-Specific Photo Tips - Now using admin-managed guides */}
      {selectedCategoryId && photoGuides.length > 0 && (
        <View style={styles.photoTips}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={20} color={COLORS.primary} />
            <Text style={styles.tipsTitle}>Tips for Great Photos</Text>
          </View>
          {photoGuides.map((guide, index) => (
            <View key={guide.id || index} style={styles.tipItem}>
              <View style={styles.tipIcon}>
                <Ionicons name={guide.icon as any} size={18} color={COLORS.primary} />
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipItemTitle}>{guide.title}</Text>
                <Text style={styles.tipItemDesc}>{guide.description}</Text>
                {/* Display illustration image if available */}
                {guide.image_url && (
                  <Image 
                    source={{ uri: guide.image_url }} 
                    style={styles.tipIllustration}
                    resizeMode="cover"
                  />
                )}
              </View>
            </View>
          ))}
        </View>
      )}
      
      {/* Loading state for photo guides */}
      {selectedCategoryId && photoGuidesLoading && (
        <View style={styles.photoTips}>
          <View style={styles.tipsHeader}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.tipsTitle}>Loading photo tips...</Text>
          </View>
        </View>
      )}
      
      {!selectedCategoryId && (
        <View style={styles.photoTips}>
          <Text style={styles.tipsTitle}>Photo Tips</Text>
          <Text style={styles.tipText}>• Use good lighting</Text>
          <Text style={styles.tipText}>• Show the item from multiple angles</Text>
          <Text style={styles.tipText}>• Include any defects or damage</Text>
        </View>
      )}

      {/* AI Analyzer Status */}
      {aiAnalyzing && (
        <View style={aiStyles.analyzingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={aiStyles.analyzingText}>Analyzing photos...</Text>
        </View>
      )}

      {aiError && !aiAnalyzing && (
        <View style={aiStyles.errorContainer}>
          <Ionicons name="alert-circle" size={18} color={COLORS.warning} />
          <Text style={aiStyles.errorText}>{aiError}</Text>
          <TouchableOpacity onPress={() => triggerAiAnalysis(images)} style={aiStyles.retryButton}>
            <Text style={aiStyles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* AI Suggestions Panel */}
      {showAiSuggestions && aiResult && (
        <View style={aiStyles.suggestionsContainer}>
          <View style={aiStyles.suggestionsHeader}>
            <View style={aiStyles.suggestionsHeaderLeft}>
              <Ionicons name="sparkles" size={20} color={COLORS.primary} />
              <Text style={aiStyles.suggestionsTitle}>AI Suggestions</Text>
            </View>
            <TouchableOpacity onPress={dismissAiSuggestions}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={aiStyles.disclaimer}>
            ⚠️ AI suggestions may not be 100% accurate. Please review before publishing.
          </Text>

          {/* Detected Info */}
          {aiResult.detected_brand && (
            <View style={aiStyles.detectedItem}>
              <Text style={aiStyles.detectedLabel}>Brand:</Text>
              <Text style={aiStyles.detectedValue}>{aiResult.detected_brand}</Text>
            </View>
          )}
          {aiResult.detected_object_type && (
            <View style={aiStyles.detectedItem}>
              <Text style={aiStyles.detectedLabel}>Item Type:</Text>
              <Text style={aiStyles.detectedValue}>{aiResult.detected_object_type}</Text>
            </View>
          )}
          {aiResult.detected_condition && (
            <View style={aiStyles.detectedItem}>
              <Text style={aiStyles.detectedLabel}>Condition:</Text>
              <Text style={aiStyles.detectedValue}>{aiResult.detected_condition}</Text>
            </View>
          )}
          {aiResult.detected_color && (
            <View style={aiStyles.detectedItem}>
              <Text style={aiStyles.detectedLabel}>Color:</Text>
              <Text style={aiStyles.detectedValue}>{aiResult.detected_color}</Text>
            </View>
          )}

          {/* Suggested Title */}
          {aiResult.suggested_title && (
            <View style={aiStyles.suggestionField}>
              <Text style={aiStyles.suggestionLabel}>Suggested Title:</Text>
              <Text style={aiStyles.suggestionValue}>{aiResult.suggested_title}</Text>
              <TouchableOpacity 
                style={aiStyles.applyButton}
                onPress={() => applyPartialAiSuggestions('title')}
              >
                <Text style={aiStyles.applyButtonText}>Use Title</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Suggested Description Preview */}
          {aiResult.suggested_description && (
            <View style={aiStyles.suggestionField}>
              <Text style={aiStyles.suggestionLabel}>Suggested Description:</Text>
              <Text style={aiStyles.suggestionValue} numberOfLines={3}>
                {aiResult.suggested_description}
              </Text>
              <TouchableOpacity 
                style={aiStyles.applyButton}
                onPress={() => applyPartialAiSuggestions('description')}
              >
                <Text style={aiStyles.applyButtonText}>Use Description</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Action Buttons */}
          <View style={aiStyles.actionButtons}>
            <TouchableOpacity style={aiStyles.acceptAllButton} onPress={applyAiSuggestions}>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={aiStyles.acceptAllText}>Accept All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={aiStyles.regenerateButton} onPress={regenerateAiAnalysis}>
              <Ionicons name="refresh" size={18} color={COLORS.primary} />
              <Text style={aiStyles.regenerateText}>Regenerate</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Show button to view AI suggestions if they were dismissed */}
      {aiResult && !showAiSuggestions && !aiSuggestionsApplied && images.length > 0 && (
        <TouchableOpacity 
          style={aiStyles.viewSuggestionsButton}
          onPress={() => setShowAiSuggestions(true)}
        >
          <Ionicons name="sparkles" size={16} color={COLORS.primary} />
          <Text style={aiStyles.viewSuggestionsText}>View AI Suggestions</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  // ============ STEP 3: BASE DETAILS ============
  const renderStep3 = () => {
    // Get dynamic placeholders based on category/subcategory
    const placeholders = getPlaceholders(selectedCategoryId, selectedSubcategoryId);
    const hideCondition = shouldHideCondition(selectedCategoryId, selectedSubcategoryId);
    
    return (
      <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepTitle}>Listing Details</Text>
        <Text style={styles.stepSubtitle}>
          {selectedCategoryId === 'friendship_dating' ? 'Tell us about yourself' : 
           selectedCategoryId === 'jobs_services' ? 'Describe your job or service' : 
           "Describe what you're listing"}
        </Text>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{placeholders.titleLabel || 'Title'} <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder={placeholders.title}
            placeholderTextColor={COLORS.textSecondary}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <Text style={styles.charCount}>{title.length}/100</Text>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{placeholders.descriptionLabel || 'Description'} <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={placeholders.description}
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

        {/* Condition - Hidden for certain categories */}
        {!hideCondition && conditionOptions && conditionOptions.length > 0 && (
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Condition</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {conditionOptions.map((c) => (
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
  };

  // ============ STEP 4: DYNAMIC ATTRIBUTES (Subcategory-specific) ============
  const renderStep4 = () => {
    const mainCategory = getMainCategory(selectedCategoryId);
    const subcategoryAttrs = currentSubcategoryConfig?.attributes || [];
    
    return (
      <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
        <View style={styles.stepHeaderWithIcon}>
          {mainCategory?.icon && (
            <View style={styles.stepHeaderIconWrapper}>
              <Ionicons name={mainCategory.icon as any} size={24} color={COLORS.primary} />
            </View>
          )}
          <View style={styles.stepHeaderText}>
            <Text style={styles.stepTitle}>
              {currentSubcategoryConfig?.name || 'Item'} Details
            </Text>
            <Text style={styles.stepSubtitle}>
              Fill in the specific details for your {currentSubcategoryConfig?.name?.toLowerCase() || 'item'}
            </Text>
          </View>
        </View>

        {subcategoryAttrs.map((field) => (
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

        {subcategoryAttrs.length === 0 && (
          <View style={styles.noAttributesMessage}>
            <Ionicons name="information-circle-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.noAttributesText}>
              No additional details required for this subcategory.
            </Text>
            <Text style={styles.noAttributesSubtext}>
              You can proceed to the next step.
            </Text>
          </View>
        )}
      </ScrollView>
    );
  };

  // ============ STEP 5: PRICE & CONTACT ============
  const renderStep5 = () => {
    // Get dynamic configuration based on category
    const hidePrice = shouldHidePrice(selectedCategoryId, selectedSubcategoryId);
    const showSalary = shouldShowSalaryRange(selectedSubcategoryId);
    const sellerTypeConfig = getSellerTypes(selectedCategoryId);
    const chatOnly = isChatOnlyCategory(selectedCategoryId);
    const categoryPrefs = CATEGORY_PREFERENCES[selectedCategoryId];
    
    return (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>
        {hidePrice ? 'Contact & Details' : 'Price & Contact'}
      </Text>
      <Text style={styles.stepSubtitle}>
        {hidePrice 
          ? 'Let people know how to reach you'
          : 'Set your price and how buyers can reach you'}
      </Text>

      {/* Price Section - Hidden for certain categories */}
      {!hidePrice && !showSalary && (
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
        
        {/* Get Price Suggestion Button */}
        <TouchableOpacity
          style={priceStyles.getSuggestionButton}
          onPress={getPriceSuggestion}
          disabled={priceSuggestionLoading}
        >
          {priceSuggestionLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <>
              <Ionicons name="sparkles" size={16} color={COLORS.primary} />
              <Text style={priceStyles.getSuggestionText}>Get AI Price Suggestion</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Price Suggestion Error */}
        {priceSuggestionError && (
          <View style={priceStyles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color={COLORS.warning} />
            <Text style={priceStyles.errorText}>{priceSuggestionError}</Text>
          </View>
        )}

        {/* Price Suggestion Result */}
        {priceSuggestion && priceSuggestion.price_suggestion && (
          <View style={priceStyles.suggestionContainer}>
            <View style={priceStyles.suggestionHeader}>
              <Ionicons name="sparkles" size={18} color={COLORS.primary} />
              <Text style={priceStyles.suggestionTitle}>AI Price Suggestion</Text>
              <TouchableOpacity onPress={dismissPriceSuggestion}>
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Price Range */}
            <View style={priceStyles.priceRange}>
              <Text style={priceStyles.priceRangeLabel}>Suggested Range:</Text>
              <Text style={priceStyles.priceRangeValue}>
                €{priceSuggestion.price_suggestion.min_price} - €{priceSuggestion.price_suggestion.max_price}
              </Text>
            </View>

            {/* Recommended Price */}
            {priceSuggestion.price_suggestion.recommended_price && (
              <View style={priceStyles.recommendedPrice}>
                <Text style={priceStyles.recommendedLabel}>Recommended:</Text>
                <Text style={priceStyles.recommendedValue}>
                  €{priceSuggestion.price_suggestion.recommended_price}
                </Text>
                <TouchableOpacity
                  style={priceStyles.useButton}
                  onPress={() => applyPriceSuggestion(priceSuggestion.price_suggestion.recommended_price)}
                >
                  <Text style={priceStyles.useButtonText}>Use This Price</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Reasoning */}
            {priceSuggestion.price_suggestion.reasoning && (
              <Text style={priceStyles.reasoning}>
                {priceSuggestion.price_suggestion.reasoning}
              </Text>
            )}

            {/* Tip */}
            {priceSuggestion.price_suggestion.tip && (
              <View style={priceStyles.tipContainer}>
                <Ionicons name="bulb" size={14} color="#F57C00" />
                <Text style={priceStyles.tipText}>{priceSuggestion.price_suggestion.tip}</Text>
              </View>
            )}

            {/* Market Data */}
            {priceSuggestion.similar_listings_count > 0 && (
              <Text style={priceStyles.marketData}>
                Based on {priceSuggestion.similar_listings_count} similar listings
              </Text>
            )}

            {/* Quick Apply Buttons */}
            <View style={priceStyles.quickButtons}>
              {priceSuggestion.price_suggestion.min_price && (
                <TouchableOpacity
                  style={priceStyles.quickButton}
                  onPress={() => applyPriceSuggestion(priceSuggestion.price_suggestion.min_price)}
                >
                  <Text style={priceStyles.quickButtonText}>€{priceSuggestion.price_suggestion.min_price}</Text>
                  <Text style={priceStyles.quickButtonLabel}>Quick Sale</Text>
                </TouchableOpacity>
              )}
              {priceSuggestion.price_suggestion.recommended_price && (
                <TouchableOpacity
                  style={[priceStyles.quickButton, priceStyles.quickButtonHighlight]}
                  onPress={() => applyPriceSuggestion(priceSuggestion.price_suggestion.recommended_price)}
                >
                  <Text style={[priceStyles.quickButtonText, priceStyles.quickButtonTextHighlight]}>
                    €{priceSuggestion.price_suggestion.recommended_price}
                  </Text>
                  <Text style={[priceStyles.quickButtonLabel, priceStyles.quickButtonLabelHighlight]}>Best Value</Text>
                </TouchableOpacity>
              )}
              {priceSuggestion.price_suggestion.max_price && (
                <TouchableOpacity
                  style={priceStyles.quickButton}
                  onPress={() => applyPriceSuggestion(priceSuggestion.price_suggestion.max_price)}
                >
                  <Text style={priceStyles.quickButtonText}>€{priceSuggestion.price_suggestion.max_price}</Text>
                  <Text style={priceStyles.quickButtonLabel}>Premium</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={priceStyles.disclaimer}>
              AI suggestions are estimates. Final price is your decision.
            </Text>
          </View>
        )}
      </View>
      )}

      {/* Salary Range Section - For Job listings */}
      {showSalary && (
        <View style={styles.priceSection}>
          <Text style={styles.fieldLabel}>Salary Range</Text>
          <Text style={styles.fieldHint}>Specify the compensation range for this position</Text>
          
          <View style={styles.salaryInputRow}>
            <View style={styles.salaryInputWrapper}>
              <Text style={styles.salaryInputLabel}>Min</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>€</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="0"
                  placeholderTextColor={COLORS.textSecondary}
                  value={salaryMin}
                  onChangeText={setSalaryMin}
                  keyboardType="numeric"
                />
              </View>
            </View>
            
            <Text style={styles.salaryDivider}>to</Text>
            
            <View style={styles.salaryInputWrapper}>
              <Text style={styles.salaryInputLabel}>Max</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>€</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="0"
                  placeholderTextColor={COLORS.textSecondary}
                  value={salaryMax}
                  onChangeText={setSalaryMax}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
          
          <View style={styles.salaryPeriodRow}>
            {(['hourly', 'monthly', 'yearly'] as const).map((period) => (
              <TouchableOpacity
                key={period}
                style={[styles.chip, salaryPeriod === period && styles.chipSelected]}
                onPress={() => setSalaryPeriod(period)}
              >
                <Text style={[styles.chipText, salaryPeriod === period && styles.chipTextSelected]}>
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Location */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Location <Text style={styles.required}>*</Text></Text>
        <LocationPicker
          value={locationData}
          onChange={(loc) => {
            setLocationData(loc);
            setLocation(loc.location_text || loc.city_name || '');
          }}
          placeholder="Select your location"
          error={fieldErrors.location}
        />
      </View>

      {/* Listed by (Seller Type) - Dynamic based on category */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>{sellerTypeConfig.label}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {sellerTypeConfig.options.map((type) => (
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

      {/* Preferences Section - Hidden for categories that don't support them */}
      {!categoryPrefs?.acceptsOffers === false && !hidePrice && (
        <>
      <View style={styles.sectionDivider}>
        <Text style={styles.sectionDividerText}>Preferences</Text>
      </View>

      {/* Accepts Offers */}
      <View style={styles.preferenceCard}>
        <View style={styles.preferenceRow}>
          <View style={styles.preferenceInfo}>
            <View style={[styles.preferenceIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="pricetag-outline" size={20} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.preferenceTitle}>Accept Offers</Text>
              <Text style={styles.preferenceDesc}>Allow buyers to make price offers</Text>
            </View>
          </View>
          <Switch
            value={acceptsOffers}
            onValueChange={setAcceptsOffers}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={acceptsOffers ? COLORS.primary : '#f4f4f4'}
          />
        </View>
      </View>

      {/* Price Negotiable (if accepts offers) */}
      {acceptsOffers && (
        <View style={styles.preferenceCard}>
          <View style={styles.preferenceRow}>
            <View style={styles.preferenceInfo}>
              <View style={[styles.preferenceIcon, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="swap-horizontal-outline" size={20} color="#F57C00" />
              </View>
              <View>
                <Text style={styles.preferenceTitle}>Negotiable Price (VB)</Text>
                <Text style={styles.preferenceDesc}>Show "VB" badge on listing</Text>
              </View>
            </View>
            <Switch
              value={negotiable}
              onValueChange={setNegotiable}
              trackColor={{ false: COLORS.border, true: '#FFE0B2' }}
              thumbColor={negotiable ? '#F57C00' : '#f4f4f4'}
            />
          </View>
        </View>
      )}

      {/* Accepts Exchanges */}
      <View style={styles.preferenceCard}>
        <View style={styles.preferenceRow}>
          <View style={styles.preferenceInfo}>
            <View style={[styles.preferenceIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="repeat-outline" size={20} color="#1976D2" />
            </View>
            <View>
              <Text style={styles.preferenceTitle}>Accept Exchanges</Text>
              <Text style={styles.preferenceDesc}>Open to trading items</Text>
            </View>
          </View>
          <Switch
            value={acceptsExchanges}
            onValueChange={setAcceptsExchanges}
            trackColor={{ false: COLORS.border, true: '#BBDEFB' }}
            thumbColor={acceptsExchanges ? '#1976D2' : '#f4f4f4'}
          />
        </View>
      </View>
      </>
      )}

      {/* Contact Methods Section */}
      <View style={styles.sectionDivider}>
        <Text style={styles.sectionDividerText}>Contact Methods</Text>
      </View>

      {/* Chat Only Notice for certain categories */}
      {chatOnly && (
        <View style={styles.chatOnlyNotice}>
          <Ionicons name="information-circle" size={18} color={COLORS.primary} />
          <Text style={styles.chatOnlyText}>
            For your safety, only in-app chat is available for this category
          </Text>
        </View>
      )}

      {/* In-App Chat - Always available */}
      <View style={styles.preferenceCard}>
        <View style={styles.preferenceRow}>
          <View style={styles.preferenceInfo}>
            <View style={[styles.preferenceIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="chatbubble-outline" size={20} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.preferenceTitle}>In-App Chat</Text>
              <Text style={styles.preferenceDesc}>Message through the app</Text>
            </View>
          </View>
          <Switch
            value={chatOnly ? true : contactPreferences.inAppChat}
            onValueChange={chatOnly ? undefined : (val) => setContactPreferences(prev => ({ ...prev, inAppChat: val }))}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={contactPreferences.inAppChat || chatOnly ? COLORS.primary : '#f4f4f4'}
            disabled={chatOnly}
          />
        </View>
      </View>

      {/* WhatsApp - Hidden for chat-only categories */}
      {!chatOnly && (
      <View style={styles.preferenceCard}>
        <View style={styles.preferenceRow}>
          <View style={styles.preferenceInfo}>
            <View style={[styles.preferenceIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            </View>
            <View>
              <Text style={styles.preferenceTitle}>WhatsApp</Text>
              <Text style={styles.preferenceDesc}>Chat via WhatsApp</Text>
            </View>
          </View>
          <Switch
            value={contactPreferences.whatsapp}
            onValueChange={(val) => setContactPreferences(prev => ({ ...prev, whatsapp: val }))}
            trackColor={{ false: COLORS.border, true: '#C8E6C9' }}
            thumbColor={contactPreferences.whatsapp ? '#25D366' : '#f4f4f4'}
          />
        </View>
        {contactPreferences.whatsapp && (
          <View style={styles.phoneInputContainer}>
            <Text style={styles.phoneInputLabel}>WhatsApp Number</Text>
            <TextInput
              style={styles.phoneInput}
              placeholder="+49 123 456 7890"
              placeholderTextColor={COLORS.textSecondary}
              value={whatsappNumber}
              onChangeText={setWhatsappNumber}
              keyboardType="phone-pad"
            />
          </View>
        )}
      </View>
      )}

      {/* Phone Call - Hidden for chat-only categories */}
      {!chatOnly && (
      <View style={styles.preferenceCard}>
        <View style={styles.preferenceRow}>
          <View style={styles.preferenceInfo}>
            <View style={[styles.preferenceIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="call-outline" size={20} color="#1976D2" />
            </View>
            <View>
              <Text style={styles.preferenceTitle}>Phone Call</Text>
              <Text style={styles.preferenceDesc}>Receive phone calls</Text>
            </View>
          </View>
          <Switch
            value={contactPreferences.call}
            onValueChange={(val) => setContactPreferences(prev => ({ ...prev, call: val }))}
            trackColor={{ false: COLORS.border, true: '#BBDEFB' }}
            thumbColor={contactPreferences.call ? '#1976D2' : '#f4f4f4'}
          />
        </View>
        {contactPreferences.call && (
          <View style={styles.phoneInputContainer}>
            <Text style={styles.phoneInputLabel}>Phone Number</Text>
            <TextInput
              style={styles.phoneInput}
              placeholder="+49 123 456 7890"
              placeholderTextColor={COLORS.textSecondary}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>
        )}
      </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
  };

  // ============ STEP 6: REVIEW ============
  const renderStep6 = () => {
    const hidePrice = shouldHidePrice(selectedCategoryId, selectedSubcategoryId);
    const showSalary = shouldShowSalaryRange(selectedSubcategoryId);
    const sellerTypeConfig = getSellerTypes(selectedCategoryId);
    
    return (
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
          {/* Price or Salary display */}
          {!hidePrice && !showSalary && (
            <Text style={styles.previewPrice}>
              €{parseFloat(price || '0').toLocaleString()}
              {negotiable && <Text style={styles.previewVB}> VB</Text>}
            </Text>
          )}
          {showSalary && (salaryMin || salaryMax) && (
            <Text style={styles.previewPrice}>
              €{salaryMin || '0'} - €{salaryMax || '0'} / {salaryPeriod}
            </Text>
          )}
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
                const field = currentSubcategoryConfig?.attributes.find(a => a.name === key);
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
          <Text style={styles.previewSellerType}>{sellerType}</Text>
          
          <View style={styles.previewPreferences}>
            {acceptsOffers && (
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>Accepts Offers</Text>
              </View>
            )}
            {acceptsExchanges && (
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>Open to Exchanges</Text>
              </View>
            )}
          </View>

          <Text style={styles.previewContactTitle}>Contact via:</Text>
          <View style={styles.previewContactMethods}>
            {contactPreferences.inAppChat && (
              <View style={styles.previewContactBadge}>
                <Ionicons name="chatbubble-outline" size={14} color={COLORS.primary} />
                <Text style={styles.previewContactText}>Chat</Text>
              </View>
            )}
            {contactPreferences.whatsapp && (
              <View style={styles.previewContactBadge}>
                <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
                <Text style={styles.previewContactText}>WhatsApp</Text>
              </View>
            )}
            {contactPreferences.call && (
              <View style={styles.previewContactBadge}>
                <Ionicons name="call-outline" size={14} color="#1976D2" />
                <Text style={styles.previewContactText}>Call</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
  };

  // ============ RENDER ============
  // Show nothing while redirecting to login
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Redirecting to login...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Desktop Layout
  if (isLargeScreen) {
    return (
      <SafeAreaView style={[styles.container, desktopStyles.container]} edges={['top']}>
        {/* Desktop Header Wrapper */}
        <View style={desktopStyles.headerWrapper}>
          <View style={desktopStyles.header}>
            <TouchableOpacity style={desktopStyles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={desktopStyles.headerTitle}>Create New Listing</Text>
            <TouchableOpacity style={desktopStyles.cancelButton} onPress={() => router.back()}>
              <Text style={desktopStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          
          {/* Error Banner - Desktop */}
          <ErrorBanner 
            errors={fieldErrors}
            visible={showErrorBanner}
            onDismiss={() => setShowErrorBanner(false)}
          />
        </View>

        <View style={desktopStyles.mainLayout}>
          {/* Left Sidebar - Step Navigation */}
          <View style={desktopStyles.sidebar}>
            <View style={desktopStyles.sidebarContent}>
              <Text style={desktopStyles.sidebarTitle}>Steps</Text>
              {stepLabels.map((label, i) => {
                const s = i + 1;
                const isActive = s === step;
                const isComplete = s < step;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[
                      desktopStyles.sidebarStep,
                      isActive && desktopStyles.sidebarStepActive,
                      isComplete && desktopStyles.sidebarStepComplete,
                    ]}
                    onPress={() => isComplete && setStep(s)}
                    disabled={!isComplete}
                  >
                    <View style={[
                      desktopStyles.sidebarStepDot,
                      isActive && desktopStyles.sidebarStepDotActive,
                      isComplete && desktopStyles.sidebarStepDotComplete,
                    ]}>
                      {isComplete ? (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      ) : (
                        <Text style={[
                          desktopStyles.sidebarStepNumber,
                          (isActive || isComplete) && desktopStyles.sidebarStepNumberActive,
                        ]}>
                          {s}
                        </Text>
                      )}
                    </View>
                    <Text style={[
                      desktopStyles.sidebarStepLabel,
                      isActive && desktopStyles.sidebarStepLabelActive,
                      isComplete && desktopStyles.sidebarStepLabelComplete,
                    ]}>
                      {label}
                    </Text>
                    {isActive && (
                      <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Current Selection Summary */}
            {selectedCategoryId && (
              <View style={desktopStyles.sidebarSummary}>
                <Text style={desktopStyles.summaryTitle}>Selected</Text>
                <View style={desktopStyles.summaryItem}>
                  <Ionicons name="folder-outline" size={16} color={COLORS.primary} />
                  <Text style={desktopStyles.summaryText} numberOfLines={1}>
                    {getMainCategory(selectedCategoryId)?.name || 'Category'}
                  </Text>
                </View>
                {selectedSubcategoryId && currentSubcategoryConfig && (
                  <View style={desktopStyles.summaryItem}>
                    <Ionicons name="pricetag-outline" size={16} color={COLORS.primary} />
                    <Text style={desktopStyles.summaryText} numberOfLines={1}>
                      {currentSubcategoryConfig.name}
                    </Text>
                  </View>
                )}
                {images.length > 0 && (
                  <View style={desktopStyles.summaryItem}>
                    <Ionicons name="images-outline" size={16} color={COLORS.primary} />
                    <Text style={desktopStyles.summaryText}>{images.length} photo{images.length > 1 ? 's' : ''}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Main Content Area */}
          <View style={desktopStyles.contentArea}>
            <KeyboardAvoidingView
              style={desktopStyles.formContainer}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <View style={desktopStyles.formCard}>
                {/* Step Content */}
                <View style={desktopStyles.formContent}>
                  {step === 1 && renderStep1()}
                  {step === 2 && renderStep2()}
                  {step === 3 && renderStep3()}
                  {step === 4 && renderStep4()}
                  {step === 5 && renderStep5()}
                  {step === 6 && renderStep6()}
                </View>

                {/* Form Footer */}
                <View style={desktopStyles.formFooter}>
                  {step > 1 && (
                    <TouchableOpacity style={desktopStyles.backBtn} onPress={prevStep}>
                      <Ionicons name="arrow-back" size={18} color={COLORS.text} />
                      <Text style={desktopStyles.backBtnText}>Back</Text>
                    </TouchableOpacity>
                  )}
                  <View style={{ flex: 1 }} />
                  {step < TOTAL_STEPS ? (
                    <TouchableOpacity style={desktopStyles.nextBtn} onPress={nextStep}>
                      <Text style={desktopStyles.nextBtnText}>Continue</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[desktopStyles.publishBtn, loading && desktopStyles.publishBtnDisabled]}
                      onPress={handlePublish}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={20} color="#fff" />
                          <Text style={desktopStyles.publishBtnText}>Publish Listing</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </View>

        {/* Success Modal */}
        <SuccessModal
          visible={showSuccessModal}
          title="Published!"
          message="Your listing is now live and visible to buyers in your area."
          buttonText="View Listings"
          onClose={handleSuccessModalClose}
        />
      </SafeAreaView>
    );
  }

  // Mobile Layout
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Loading overlay for edit mode */}
      {editLoading && (
        <View style={styles.editLoadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.editLoadingText}>Loading listing...</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={prevStep}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditMode 
            ? (step === 1 ? 'Edit Listing' : `Edit: ${stepLabels[step - 1]}`)
            : (step === 1 ? 'New Listing' : stepLabels[step - 1])
          }
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Error Banner - Mobile */}
      <ErrorBanner 
        errors={fieldErrors}
        visible={showErrorBanner}
        onDismiss={() => setShowErrorBanner(false)}
      />

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
                <Ionicons name={isEditMode ? "save" : "checkmark-circle"} size={20} color="#fff" />
                <Text style={styles.publishButtonText}>
                  {isEditMode ? 'Update Listing' : 'Publish Listing'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        title="Published!"
        message="Your listing is now live and visible to buyers in your area."
        buttonText="View Listings"
        onClose={handleSuccessModalClose}
      />
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
  // Edit mode loading overlay
  editLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  editLoadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  stepHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  stepHeaderIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  stepHeaderText: {
    flex: 1,
    paddingTop: 4,
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
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  subcategoryList: {
    gap: 8,
  },
  subcategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  subcategoryItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  subcategoryItemError: {
    borderColor: COLORS.error,
  },
  subcategoryContent: {
    flex: 1,
  },
  subcategoryText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  subcategoryTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  selectionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    marginTop: 16,
    gap: 8,
  },
  selectionSummaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.success,
    flex: 1,
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
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  tipItemDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  tipIllustration: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 10,
    backgroundColor: COLORS.border,
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipError: {
    borderColor: COLORS.error,
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
  // Salary Range Styles
  salaryInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 16,
  },
  salaryInputWrapper: {
    flex: 1,
  },
  salaryInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  salaryDivider: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    paddingBottom: 28,
  },
  salaryPeriodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  // Chat Only Notice
  chatOnlyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
  },
  chatOnlyText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  // Section Divider
  sectionDivider: {
    marginTop: 24,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionDividerText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  // Preference Cards
  preferenceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  preferenceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  preferenceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  preferenceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  preferenceDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  phoneInputContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  phoneInputLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  phoneInput: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
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
  previewPreferences: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  previewContactTitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 12,
    marginBottom: 8,
  },
  previewContactMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewContactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  previewContactText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
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

// AI Analyzer Styles
const aiStyles = StyleSheet.create({
  analyzingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    marginTop: 16,
    gap: 10,
  },
  analyzingText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: COLORS.warning,
    fontSize: 13,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.warning,
    borderRadius: 6,
  },
  retryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  suggestionsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  suggestionsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  disclaimer: {
    fontSize: 12,
    color: COLORS.warning,
    backgroundColor: '#FFF8E1',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  detectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detectedLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    width: 80,
  },
  detectedValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  suggestionField: {
    marginTop: 16,
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 10,
  },
  suggestionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 6,
  },
  suggestionValue: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 10,
  },
  applyButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 6,
  },
  applyButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  acceptAllButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  acceptAllText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  regenerateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  regenerateText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  viewSuggestionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 12,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
  },
  viewSuggestionsText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});

// Price Suggestion Styles
const priceStyles = StyleSheet.create({
  getSuggestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 12,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
  },
  getSuggestionText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    marginTop: 10,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
  },
  errorText: {
    flex: 1,
    color: COLORS.warning,
    fontSize: 12,
  },
  suggestionContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  suggestionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 8,
  },
  priceRange: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  priceRangeLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  priceRangeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  recommendedPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 8,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  recommendedLabel: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  recommendedValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  useButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  useButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  reasoning: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
    marginTop: 12,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 12,
    padding: 10,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: '#E65100',
    lineHeight: 16,
  },
  marketData: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  quickButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickButtonHighlight: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quickButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  quickButtonTextHighlight: {
    color: '#fff',
  },
  quickButtonLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  quickButtonLabelHighlight: {
    color: 'rgba(255,255,255,0.8)',
  },
  disclaimer: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
});

// Desktop-specific styles
const desktopStyles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A1A', // Dark footer background
  },
  headerWrapper: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 16,
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelText: {
    color: COLORS.error,
    fontWeight: '600',
    fontSize: 15,
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: COLORS.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
  
  // Sidebar
  sidebar: {
    width: 280,
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    padding: 24,
  },
  sidebarContent: {
    flex: 1,
  },
  sidebarTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 20,
  },
  sidebarStep: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  sidebarStepActive: {
    backgroundColor: COLORS.primaryLight,
  },
  sidebarStepComplete: {
    opacity: 0.8,
  },
  sidebarStepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sidebarStepDotActive: {
    backgroundColor: COLORS.primary,
  },
  sidebarStepDotComplete: {
    backgroundColor: COLORS.primary,
  },
  sidebarStepNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  sidebarStepNumberActive: {
    color: '#fff',
  },
  sidebarStepLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  sidebarStepLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  sidebarStepLabelComplete: {
    color: COLORS.text,
  },
  
  // Sidebar Summary
  sidebarSummary: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
  },
  
  // Content Area
  contentArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  formContainer: {
    flex: 1,
    padding: 32,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  formCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  formContent: {
    flex: 1,
  },
  
  // Form Footer
  formFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: '#FAFAFA',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    gap: 8,
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    gap: 8,
  },
  publishBtnDisabled: {
    opacity: 0.7,
  },
  publishBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  
  // Desktop Category Grid - 4 columns
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: -8,
    marginRight: -8,
  },
  categoryCardWrapper: {
    flexBasis: '25%',
    maxWidth: '25%',
    paddingLeft: 8,
    paddingRight: 8,
    paddingBottom: 16,
  },
  categoryCardInner: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  categoryCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  
  // Desktop Subcategory Grid - 2 columns
  subcategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  subcategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    flex: 1,
    minWidth: '45%',
    maxWidth: '48%',
  },
  subcategoryItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
});
