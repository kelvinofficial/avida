import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../src/utils/api';
import { useAuthStore } from '../../src/store/authStore';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  surface: '#FFFFFF',
  background: '#F5F5F5',
  text: '#1A1A1A',
  textSecondary: '#666666',
  border: '#E0E0E0',
  error: '#D32F2F',
};

// Brand and model data
const CAR_BRANDS = [
  { id: 'audi', name: 'Audi', logo: '🚗' },
  { id: 'bmw', name: 'BMW', logo: '🚙' },
  { id: 'mercedes', name: 'Mercedes-Benz', logo: '🚘' },
  { id: 'volkswagen', name: 'Volkswagen', logo: '🚐' },
  { id: 'porsche', name: 'Porsche', logo: '🏎️' },
  { id: 'tesla', name: 'Tesla', logo: '⚡' },
  { id: 'ford', name: 'Ford', logo: '🚗' },
  { id: 'toyota', name: 'Toyota', logo: '🚙' },
  { id: 'honda', name: 'Honda', logo: '🚗' },
  { id: 'hyundai', name: 'Hyundai', logo: '🚙' },
  { id: 'kia', name: 'Kia', logo: '🚗' },
  { id: 'nissan', name: 'Nissan', logo: '🚙' },
  { id: 'mazda', name: 'Mazda', logo: '🚗' },
  { id: 'volvo', name: 'Volvo', logo: '🚙' },
  { id: 'other', name: 'Other', logo: '🚗' },
];

const MODELS_BY_BRAND: Record<string, string[]> = {
  'bmw': ['1 Series', '2 Series', '3 Series', '4 Series', '5 Series', '7 Series', 'X1', 'X3', 'X5', 'X6', 'X7', 'M3', 'M4', 'M5', 'iX', 'i4', 'Other'],
  'mercedes': ['A-Class', 'B-Class', 'C-Class', 'E-Class', 'S-Class', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'AMG GT', 'EQC', 'EQS', 'Other'],
  'audi': ['A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q2', 'Q3', 'Q5', 'Q7', 'Q8', 'e-tron', 'TT', 'R8', 'RS6', 'Other'],
  'volkswagen': ['Golf', 'Polo', 'Passat', 'Tiguan', 'T-Roc', 'T-Cross', 'Arteon', 'ID.3', 'ID.4', 'ID.5', 'Touareg', 'Other'],
  'porsche': ['911', 'Cayenne', 'Macan', 'Panamera', 'Taycan', 'Boxster', 'Cayman', '718', 'Other'],
  'tesla': ['Model 3', 'Model S', 'Model X', 'Model Y', 'Cybertruck', 'Other'],
  'ford': ['Focus', 'Fiesta', 'Mustang', 'Puma', 'Kuga', 'Explorer', 'Ranger', 'Bronco', 'Other'],
  'toyota': ['Corolla', 'Camry', 'RAV4', 'Yaris', 'C-HR', 'Land Cruiser', 'Prius', 'Supra', 'Other'],
  'honda': ['Civic', 'Accord', 'CR-V', 'HR-V', 'Jazz', 'e', 'Other'],
  'hyundai': ['i10', 'i20', 'i30', 'Tucson', 'Santa Fe', 'Kona', 'Ioniq', 'Other'],
  'kia': ['Picanto', 'Rio', 'Ceed', 'Sportage', 'Sorento', 'Niro', 'EV6', 'Other'],
  'nissan': ['Micra', 'Juke', 'Qashqai', 'X-Trail', 'Leaf', 'Ariya', 'GT-R', 'Other'],
  'mazda': ['2', '3', '6', 'CX-3', 'CX-30', 'CX-5', 'MX-5', 'Other'],
  'volvo': ['XC40', 'XC60', 'XC90', 'S60', 'S90', 'V60', 'V90', 'C40', 'Other'],
  'other': ['Other'],
};

const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'Plug-in Hybrid', 'LPG'];
const TRANSMISSIONS = ['Automatic', 'Manual', 'Semi-Automatic'];
const BODY_TYPES = ['Sedan', 'Hatchback', 'SUV', 'Coupe', 'Convertible', 'Wagon', 'Van', 'Pickup'];
const CONDITIONS = ['New', 'Like New', 'Excellent', 'Good', 'Fair'];
const COLORS_LIST = ['Black', 'White', 'Silver', 'Gray', 'Blue', 'Red', 'Green', 'Brown', 'Beige', 'Other'];
const GERMAN_CITIES = ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dresden', 'Hannover'];

// Generate years from current to 1990
const YEARS = Array.from({ length: 36 }, (_, i) => (2025 - i).toString());

// Step Indicator
const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => (
  <View style={stepStyles.container}>
    {Array.from({ length: totalSteps }).map((_, i) => (
      <View key={i} style={stepStyles.stepWrapper}>
        <View style={[stepStyles.step, i < currentStep && stepStyles.stepComplete, i === currentStep && stepStyles.stepCurrent]}>
          {i < currentStep ? (
            <Ionicons name="checkmark" size={14} color="#fff" />
          ) : (
            <Text style={[stepStyles.stepText, (i <= currentStep) && stepStyles.stepTextActive]}>{i + 1}</Text>
          )}
        </View>
        {i < totalSteps - 1 && <View style={[stepStyles.line, i < currentStep && stepStyles.lineActive]} />}
      </View>
    ))}
  </View>
);

const stepStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  stepWrapper: { flexDirection: 'row', alignItems: 'center' },
  step: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  stepComplete: { backgroundColor: COLORS.primary },
  stepCurrent: { backgroundColor: COLORS.primary, borderWidth: 3, borderColor: '#A5D6A7' },
  stepText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  stepTextActive: { color: '#fff' },
  line: { width: 32, height: 2, backgroundColor: COLORS.border, marginHorizontal: 4 },
  lineActive: { backgroundColor: COLORS.primary },
});

// Section Header
const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <View style={{ marginBottom: 16 }}>
    <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.text }}>{title}</Text>
    {subtitle && <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 4 }}>{subtitle}</Text>}
  </View>
);

// Select Chip
const SelectChip = ({ label, selected, onPress, disabled = false }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean }) => (
  <TouchableOpacity
    style={[chipStyles.chip, selected && chipStyles.chipSelected, disabled && chipStyles.chipDisabled]}
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={[chipStyles.label, selected && chipStyles.labelSelected, disabled && chipStyles.labelDisabled]}>{label}</Text>
  </TouchableOpacity>
);

const chipStyles = StyleSheet.create({
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, marginRight: 8, marginBottom: 8 },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipDisabled: { opacity: 0.5 },
  label: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  labelSelected: { color: '#fff' },
  labelDisabled: { color: COLORS.textSecondary },
});

// Brand Card
const BrandCard = ({ brand, selected, onPress }: { brand: typeof CAR_BRANDS[0]; selected: boolean; onPress: () => void }) => (
  <TouchableOpacity
    style={[brandStyles.card, selected && brandStyles.cardSelected]}
    onPress={onPress}
  >
    <Text style={brandStyles.logo}>{brand.logo}</Text>
    <Text style={[brandStyles.name, selected && brandStyles.nameSelected]}>{brand.name}</Text>
  </TouchableOpacity>
);

const brandStyles = StyleSheet.create({
  card: { width: '30%', aspectRatio: 1, backgroundColor: COLORS.surface, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10, borderWidth: 2, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  cardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  logo: { fontSize: 28, marginBottom: 4 },
  name: { fontSize: 11, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  nameSelected: { color: COLORS.primary },
});

export default function PostAutoScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    // Step 1: Make & Model
    brand: '',
    model: '',
    
    // Step 2: Year & Specs
    year: '',
    mileage: '',
    fuelType: '',
    transmission: '',
    
    // Step 3: Details
    bodyType: '',
    color: '',
    engineSize: '',
    condition: '',
    
    // Step 4: Price & Location
    price: '',
    negotiable: true,
    city: '',
    
    // Step 5: Description & Images
    title: '',
    description: '',
  });

  // Check auth
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated]);

  const updateForm = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    // Reset model when brand changes
    if (key === 'brand') {
      setFormData(prev => ({ ...prev, model: '' }));
    }
  };

  // Image picker
  const pickImage = async () => {
    if (images.length >= 10) {
      Alert.alert('Limit Reached', 'Maximum 10 images allowed');
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

  const validateStep = () => {
    switch (currentStep) {
      case 0:
        if (!formData.brand) {
          Alert.alert('Required', 'Please select a brand');
          return false;
        }
        if (!formData.model) {
          Alert.alert('Required', 'Please select a model');
          return false;
        }
        return true;
      case 1:
        if (!formData.year) {
          Alert.alert('Required', 'Please select the year');
          return false;
        }
        if (!formData.mileage) {
          Alert.alert('Required', 'Please enter the mileage');
          return false;
        }
        if (!formData.fuelType) {
          Alert.alert('Required', 'Please select fuel type');
          return false;
        }
        if (!formData.transmission) {
          Alert.alert('Required', 'Please select transmission');
          return false;
        }
        return true;
      case 2:
        if (!formData.condition) {
          Alert.alert('Required', 'Please select the condition');
          return false;
        }
        return true;
      case 3:
        if (!formData.price) {
          Alert.alert('Required', 'Please enter a price');
          return false;
        }
        if (!formData.city) {
          Alert.alert('Required', 'Please select a city');
          return false;
        }
        return true;
      case 4:
        if (!formData.title) {
          Alert.alert('Required', 'Please enter a title');
          return false;
        }
        if (images.length === 0) {
          Alert.alert('Required', 'Please add at least one photo');
          return false;
        }
        return true;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < 4) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    
    try {
      const brandName = CAR_BRANDS.find(b => b.id === formData.brand)?.name || formData.brand;
      
      const payload = {
        title: formData.title || `${brandName} ${formData.model} - ${formData.year}`,
        description: formData.description || `${brandName} ${formData.model} from ${formData.year}. ${formData.mileage} km, ${formData.fuelType}, ${formData.transmission}. ${formData.condition} condition.`,
        price: parseFloat(formData.price),
        currency: 'EUR',
        negotiable: formData.negotiable,
        category_id: 'vehicles',
        subcategory: 'Cars',
        condition: formData.condition,
        location: `${formData.city}, Germany`,
        images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800'],
        attributes: {
          brand: brandName,
          model: formData.model,
          year: parseInt(formData.year),
          mileage: parseInt(formData.mileage),
          fuel_type: formData.fuelType,
          transmission: formData.transmission,
          body_type: formData.bodyType,
          color: formData.color,
          engine_size: formData.engineSize,
        },
      };

      await api.post('/listings', payload);
      
      Alert.alert(
        'Success!',
        'Your vehicle has been listed successfully.',
        [
          { text: 'View My Listings', onPress: () => router.replace('/profile/my-listings') },
          { text: 'Done', onPress: () => router.replace('/') },
        ]
      );
    } catch (error: any) {
      console.error('Error posting vehicle:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to post vehicle. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const availableModels = formData.brand ? MODELS_BY_BRAND[formData.brand] || MODELS_BY_BRAND['other'] : [];

  const renderStep = () => {
    switch (currentStep) {
      // Step 1: Make & Model
      case 0:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <SectionHeader title="Select Make & Model" subtitle="Choose your vehicle's brand and model" />
            
            {/* Brand Selection */}
            <Text style={styles.fieldLabel}>Brand *</Text>
            <View style={styles.brandGrid}>
              {CAR_BRANDS.map(brand => (
                <BrandCard
                  key={brand.id}
                  brand={brand}
                  selected={formData.brand === brand.id}
                  onPress={() => updateForm('brand', brand.id)}
                />
              ))}
            </View>

            {/* Model Selection */}
            {formData.brand && (
              <>
                <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Model *</Text>
                <View style={styles.chipGrid}>
                  {availableModels.map(model => (
                    <SelectChip
                      key={model}
                      label={model}
                      selected={formData.model === model}
                      onPress={() => updateForm('model', model)}
                    />
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        );

      // Step 2: Year & Specs
      case 1:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <SectionHeader title="Vehicle Specifications" subtitle="Enter year, mileage and key specs" />
            
            {/* Year */}
            <Text style={styles.fieldLabel}>Year *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              {YEARS.map(year => (
                <SelectChip
                  key={year}
                  label={year}
                  selected={formData.year === year}
                  onPress={() => updateForm('year', year)}
                />
              ))}
            </ScrollView>

            {/* Mileage */}
            <Text style={styles.fieldLabel}>Mileage (km) *</Text>
            <TextInput
              style={styles.input}
              value={formData.mileage}
              onChangeText={(v) => updateForm('mileage', v.replace(/\D/g, ''))}
              placeholder="e.g., 50000"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="numeric"
            />

            {/* Fuel Type */}
            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Fuel Type *</Text>
            <View style={styles.chipGrid}>
              {FUEL_TYPES.map(fuel => (
                <SelectChip
                  key={fuel}
                  label={fuel}
                  selected={formData.fuelType === fuel}
                  onPress={() => updateForm('fuelType', fuel)}
                />
              ))}
            </View>

            {/* Transmission */}
            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Transmission *</Text>
            <View style={styles.chipGrid}>
              {TRANSMISSIONS.map(trans => (
                <SelectChip
                  key={trans}
                  label={trans}
                  selected={formData.transmission === trans}
                  onPress={() => updateForm('transmission', trans)}
                />
              ))}
            </View>
          </ScrollView>
        );

      // Step 3: Details
      case 2:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <SectionHeader title="Additional Details" subtitle="Body type, color and condition" />
            
            {/* Body Type */}
            <Text style={styles.fieldLabel}>Body Type</Text>
            <View style={styles.chipGrid}>
              {BODY_TYPES.map(body => (
                <SelectChip
                  key={body}
                  label={body}
                  selected={formData.bodyType === body}
                  onPress={() => updateForm('bodyType', body)}
                />
              ))}
            </View>

            {/* Color */}
            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Color</Text>
            <View style={styles.chipGrid}>
              {COLORS_LIST.map(color => (
                <SelectChip
                  key={color}
                  label={color}
                  selected={formData.color === color}
                  onPress={() => updateForm('color', color)}
                />
              ))}
            </View>

            {/* Engine Size */}
            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Engine Size</Text>
            <TextInput
              style={styles.input}
              value={formData.engineSize}
              onChangeText={(v) => updateForm('engineSize', v)}
              placeholder="e.g., 2.0L, 3.0 TSI"
              placeholderTextColor={COLORS.textSecondary}
            />

            {/* Condition */}
            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Condition *</Text>
            <View style={styles.chipGrid}>
              {CONDITIONS.map(cond => (
                <SelectChip
                  key={cond}
                  label={cond}
                  selected={formData.condition === cond}
                  onPress={() => updateForm('condition', cond)}
                />
              ))}
            </View>
          </ScrollView>
        );

      // Step 4: Price & Location
      case 3:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <SectionHeader title="Price & Location" subtitle="Set your asking price and location" />
            
            {/* Price */}
            <Text style={styles.fieldLabel}>Price (€) *</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.currencySymbol}>€</Text>
              <TextInput
                style={styles.priceInput}
                value={formData.price}
                onChangeText={(v) => updateForm('price', v.replace(/\D/g, ''))}
                placeholder="0"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="numeric"
              />
            </View>

            {/* Negotiable */}
            <TouchableOpacity
              style={styles.negotiableRow}
              onPress={() => updateForm('negotiable', !formData.negotiable)}
            >
              <View style={[styles.checkbox, formData.negotiable && styles.checkboxChecked]}>
                {formData.negotiable && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <Text style={styles.negotiableText}>Price is negotiable (VB)</Text>
            </TouchableOpacity>

            {/* City */}
            <Text style={[styles.fieldLabel, { marginTop: 24 }]}>Location *</Text>
            <View style={styles.chipGrid}>
              {GERMAN_CITIES.map(city => (
                <SelectChip
                  key={city}
                  label={city}
                  selected={formData.city === city}
                  onPress={() => updateForm('city', city)}
                />
              ))}
            </View>
          </ScrollView>
        );

      // Step 5: Title, Description & Images
      case 4:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <SectionHeader title="Photos & Description" subtitle="Add photos and describe your vehicle" />
            
            {/* Images */}
            <Text style={styles.fieldLabel}>Photos * (up to 10)</Text>
            <View style={styles.imagesGrid}>
              <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
                <Ionicons name="camera-outline" size={32} color={COLORS.primary} />
                <Text style={styles.addImageText}>Add Photo</Text>
                <Text style={styles.imageCount}>{images.length}/10</Text>
              </TouchableOpacity>

              {images.map((img, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri: img }} style={styles.imagePreview} />
                  {index === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverText}>Cover</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(index)}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Title */}
            <Text style={[styles.fieldLabel, { marginTop: 24 }]}>Title *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(v) => updateForm('title', v)}
              placeholder={`${CAR_BRANDS.find(b => b.id === formData.brand)?.name || ''} ${formData.model} ${formData.year}`}
              placeholderTextColor={COLORS.textSecondary}
            />

            {/* Description */}
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(v) => updateForm('description', v)}
              placeholder="Describe your vehicle - features, service history, reason for selling..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            {/* Summary */}
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Listing Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Vehicle</Text>
                <Text style={styles.summaryValue}>
                  {CAR_BRANDS.find(b => b.id === formData.brand)?.name} {formData.model}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Year</Text>
                <Text style={styles.summaryValue}>{formData.year}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Mileage</Text>
                <Text style={styles.summaryValue}>{parseInt(formData.mileage || '0').toLocaleString()} km</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Price</Text>
                <Text style={[styles.summaryValue, { color: COLORS.primary, fontWeight: '700' }]}>
                  €{parseInt(formData.price || '0').toLocaleString()} {formData.negotiable ? 'VB' : ''}
                </Text>
              </View>
            </View>
          </ScrollView>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={handleBack}>
          <Ionicons name={currentStep === 0 ? 'close' : 'arrow-back'} size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sell Your Vehicle</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} totalSteps={5} />

      {/* Content */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {renderStep()}
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={styles.footer}>
        {currentStep > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, currentStep === 0 && { flex: 1 }]}
          onPress={handleNext}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.nextBtnText}>
                {currentStep === 4 ? 'Post Vehicle' : 'Continue'}
              </Text>
              {currentStep < 4 && <Ionicons name="arrow-forward" size={20} color="#fff" />}
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  stepContent: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 10 },
  brandGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, backgroundColor: COLORS.surface, color: COLORS.text },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  priceContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 16, paddingHorizontal: 20, borderWidth: 1, borderColor: COLORS.border },
  currencySymbol: { fontSize: 36, fontWeight: '700', color: COLORS.primary },
  priceInput: { flex: 1, fontSize: 48, fontWeight: '700', color: COLORS.text, paddingVertical: 16, marginLeft: 8 },
  negotiableRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  negotiableText: { fontSize: 15, color: COLORS.text },
  imagesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  addImageBtn: { width: 100, height: 100, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  addImageText: { fontSize: 12, color: COLORS.primary, fontWeight: '500', marginTop: 4 },
  imageCount: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },
  imageWrapper: { width: 100, height: 100, borderRadius: 12, overflow: 'hidden' },
  imagePreview: { width: '100%', height: '100%' },
  coverBadge: { position: 'absolute', top: 4, left: 4, backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  coverText: { color: '#fff', fontSize: 9, fontWeight: '600' },
  removeBtn: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.error, alignItems: 'center', justifyContent: 'center' },
  summary: { marginTop: 24, padding: 16, backgroundColor: COLORS.background, borderRadius: 12 },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  summaryLabel: { fontSize: 14, color: COLORS.textSecondary },
  summaryValue: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  footer: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 12 },
  backBtn: { flex: 0.35, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  backBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  nextBtn: { flex: 0.65, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.primary, gap: 8 },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
