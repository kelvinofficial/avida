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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../src/utils/api';
import { PROPERTY_TYPE_CATEGORIES, FACILITIES_LIST } from '../../src/types/property';

const COLORS = {
  primary: '#2E7D32',
  surface: '#FFFFFF',
  background: '#F5F5F5',
  text: '#1A1A1A',
  textSecondary: '#666666',
  border: '#E0E0E0',
  error: '#D32F2F',
};

const GERMAN_CITIES = ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Leipzig'];

const FURNISHING_OPTIONS = [
  { value: 'furnished', label: 'Furnished' },
  { value: 'semi_furnished', label: 'Semi-Furnished' },
  { value: 'unfurnished', label: 'Unfurnished' },
];

const CONDITION_OPTIONS = [
  { value: 'new', label: 'Newly Built' },
  { value: 'renovated', label: 'Renovated' },
  { value: 'old', label: 'Used' },
];

// Step Indicator
const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => (
  <View style={stepStyles.container}>
    {Array.from({ length: totalSteps }).map((_, i) => (
      <View key={i} style={stepStyles.stepWrapper}>
        <View style={[stepStyles.step, i < currentStep && stepStyles.stepActive, i === currentStep && stepStyles.stepCurrent]}>
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
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  stepWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  step: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepActive: {
    backgroundColor: COLORS.primary,
  },
  stepCurrent: {
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: '#A5D6A7',
  },
  stepText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  stepTextActive: {
    color: '#fff',
  },
  line: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },
  lineActive: {
    backgroundColor: COLORS.primary,
  },
});

// Section Header
const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <View style={sectionStyles.header}>
    <Text style={sectionStyles.title}>{title}</Text>
    {subtitle && <Text style={sectionStyles.subtitle}>{subtitle}</Text>}
  </View>
);

const sectionStyles = StyleSheet.create({
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});

// Select Chip
const SelectChip = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
  <TouchableOpacity
    style={[chipStyles.chip, selected && chipStyles.chipSelected]}
    onPress={onPress}
  >
    <Text style={[chipStyles.label, selected && chipStyles.labelSelected]}>{label}</Text>
  </TouchableOpacity>
);

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  labelSelected: {
    color: '#fff',
  },
});

// Form Input
const FormInput = ({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false, required = false }: any) => (
  <View style={inputStyles.container}>
    <Text style={inputStyles.label}>
      {label} {required && <Text style={inputStyles.required}>*</Text>}
    </Text>
    <TextInput
      style={[inputStyles.input, multiline && inputStyles.multiline]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textSecondary}
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={multiline ? 4 : 1}
    />
  </View>
);

const inputStyles = StyleSheet.create({
  container: {
    marginBottom: 16,
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
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: COLORS.surface,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});

export default function PostPropertyScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    purpose: 'rent' as 'buy' | 'rent',
    type: '',
    title: '',
    description: '',
    
    // Step 2: Details
    price: '',
    bedrooms: '',
    bathrooms: '',
    size: '',
    furnishing: '',
    condition: '',
    
    // Step 3: Location
    city: '',
    area: '',
    address: '',
    
    // Step 4: Facilities & Contact
    facilities: {} as Record<string, boolean>,
    sellerName: '',
    sellerPhone: '',
    sellerType: 'owner' as 'owner' | 'agent',
  });

  const updateForm = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const toggleFacility = (key: string) => {
    setFormData(prev => ({
      ...prev,
      facilities: { ...prev.facilities, [key]: !prev.facilities[key] }
    }));
  };

  const validateStep = () => {
    switch (currentStep) {
      case 0:
        if (!formData.type || !formData.title) {
          Alert.alert('Required Fields', 'Please select property type and enter a title');
          return false;
        }
        break;
      case 1:
        if (!formData.price) {
          Alert.alert('Required Fields', 'Please enter a price');
          return false;
        }
        break;
      case 2:
        if (!formData.city || !formData.area) {
          Alert.alert('Required Fields', 'Please select city and enter area');
          return false;
        }
        break;
      case 3:
        if (!formData.sellerName || !formData.sellerPhone) {
          Alert.alert('Required Fields', 'Please enter your name and phone number');
          return false;
        }
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < 3) {
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
      const payload = {
        title: formData.title,
        description: formData.description,
        purpose: formData.purpose,
        type: formData.type,
        price: parseFloat(formData.price),
        location: {
          country: 'Germany',
          city: formData.city,
          area: formData.area,
          address: formData.address,
        },
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : undefined,
        size: formData.size ? parseFloat(formData.size) : undefined,
        sizeUnit: 'sqm',
        furnishing: formData.furnishing || 'unfurnished',
        condition: formData.condition || 'old',
        facilities: formData.facilities,
        sellerName: formData.sellerName,
        sellerPhone: formData.sellerPhone,
        sellerType: formData.sellerType,
        images: [
          'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80',
        ],
      };

      const response = await api.post('/property/listings', payload);
      
      Alert.alert(
        'Success!',
        'Your property has been listed successfully.',
        [
          { text: 'View Listing', onPress: () => router.push(`/property/${response.data.property.id}`) },
          { text: 'Post Another', onPress: () => {
            setFormData({
              purpose: 'rent',
              type: '',
              title: '',
              description: '',
              price: '',
              bedrooms: '',
              bathrooms: '',
              size: '',
              furnishing: '',
              condition: '',
              city: '',
              area: '',
              address: '',
              facilities: {},
              sellerName: formData.sellerName,
              sellerPhone: formData.sellerPhone,
              sellerType: formData.sellerType,
            });
            setCurrentStep(0);
          }},
        ]
      );
    } catch (error) {
      console.error('Error posting property:', error);
      Alert.alert('Error', 'Failed to post property. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Get all property types flattened
  const allPropertyTypes = [
    ...(PROPERTY_TYPE_CATEGORIES.residential || []).map(t => ({ ...t, label: t.name })),
    ...(PROPERTY_TYPE_CATEGORIES.land || []).map(t => ({ ...t, label: t.name })),
    ...(PROPERTY_TYPE_CATEGORIES.commercial || []).map(t => ({ ...t, label: t.name })),
  ];

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <SectionHeader title="What are you listing?" subtitle="Select the type and purpose of your property" />
            
            {/* Purpose */}
            <Text style={styles.fieldLabel}>Purpose</Text>
            <View style={styles.chipRow}>
              <SelectChip
                label="For Rent"
                selected={formData.purpose === 'rent'}
                onPress={() => updateForm('purpose', 'rent')}
              />
              <SelectChip
                label="For Sale"
                selected={formData.purpose === 'buy'}
                onPress={() => updateForm('purpose', 'buy')}
              />
            </View>

            {/* Property Type */}
            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Property Type *</Text>
            <View style={styles.chipGrid}>
              {allPropertyTypes.map(type => (
                <SelectChip
                  key={type.id}
                  label={type.label}
                  selected={formData.type === type.id}
                  onPress={() => updateForm('type', type.id)}
                />
              ))}
            </View>

            {/* Title */}
            <View style={{ marginTop: 20 }}>
              <FormInput
                label="Title"
                value={formData.title}
                onChangeText={(v: string) => updateForm('title', v)}
                placeholder="e.g., Modern 2BR Apartment in Mitte"
                required
              />
            </View>

            {/* Description */}
            <FormInput
              label="Description"
              value={formData.description}
              onChangeText={(v: string) => updateForm('description', v)}
              placeholder="Describe your property in detail..."
              multiline
            />
          </ScrollView>
        );

      case 1:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <SectionHeader title="Property Details" subtitle="Add details about your property" />
            
            {/* Price */}
            <FormInput
              label={`Price (€${formData.purpose === 'rent' ? '/month' : ''})`}
              value={formData.price}
              onChangeText={(v: string) => updateForm('price', v)}
              placeholder="e.g., 1500"
              keyboardType="numeric"
              required
            />

            {/* Bedrooms & Bathrooms */}
            <View style={styles.row}>
              <View style={styles.halfField}>
                <FormInput
                  label="Bedrooms"
                  value={formData.bedrooms}
                  onChangeText={(v: string) => updateForm('bedrooms', v)}
                  placeholder="e.g., 2"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfField}>
                <FormInput
                  label="Bathrooms"
                  value={formData.bathrooms}
                  onChangeText={(v: string) => updateForm('bathrooms', v)}
                  placeholder="e.g., 1"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Size */}
            <FormInput
              label="Size (sqm)"
              value={formData.size}
              onChangeText={(v: string) => updateForm('size', v)}
              placeholder="e.g., 75"
              keyboardType="numeric"
            />

            {/* Furnishing */}
            <Text style={styles.fieldLabel}>Furnishing</Text>
            <View style={styles.chipRow}>
              {FURNISHING_OPTIONS.map(opt => (
                <SelectChip
                  key={opt.value}
                  label={opt.label}
                  selected={formData.furnishing === opt.value}
                  onPress={() => updateForm('furnishing', opt.value)}
                />
              ))}
            </View>

            {/* Condition */}
            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Condition</Text>
            <View style={styles.chipRow}>
              {CONDITION_OPTIONS.map(opt => (
                <SelectChip
                  key={opt.value}
                  label={opt.label}
                  selected={formData.condition === opt.value}
                  onPress={() => updateForm('condition', opt.value)}
                />
              ))}
            </View>
          </ScrollView>
        );

      case 2:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <SectionHeader title="Location" subtitle="Where is your property located?" />
            
            {/* City */}
            <Text style={styles.fieldLabel}>City *</Text>
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

            {/* Area */}
            <View style={{ marginTop: 20 }}>
              <FormInput
                label="Area / Neighborhood"
                value={formData.area}
                onChangeText={(v: string) => updateForm('area', v)}
                placeholder="e.g., Mitte, Kreuzberg, Schwabing"
                required
              />
            </View>

            {/* Address */}
            <FormInput
              label="Full Address (optional)"
              value={formData.address}
              onChangeText={(v: string) => updateForm('address', v)}
              placeholder="Street name and number"
            />
          </ScrollView>
        );

      case 3:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <SectionHeader title="Facilities & Contact" subtitle="Select amenities and add your contact info" />
            
            {/* Facilities */}
            <Text style={styles.fieldLabel}>Facilities & Amenities</Text>
            <View style={styles.facilitiesGrid}>
              {FACILITIES_LIST.map(facility => (
                <TouchableOpacity
                  key={facility.key}
                  style={[styles.facilityItem, formData.facilities[facility.key] && styles.facilityItemActive]}
                  onPress={() => toggleFacility(facility.key)}
                >
                  <Ionicons
                    name={facility.icon as any}
                    size={20}
                    color={formData.facilities[facility.key] ? COLORS.primary : COLORS.textSecondary}
                  />
                  <Text style={[styles.facilityLabel, formData.facilities[facility.key] && styles.facilityLabelActive]}>
                    {facility.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Contact Info */}
            <View style={{ marginTop: 24 }}>
              <Text style={styles.fieldLabel}>Contact Information</Text>
              
              {/* Seller Type */}
              <View style={[styles.chipRow, { marginBottom: 16 }]}>
                <SelectChip
                  label="Property Owner"
                  selected={formData.sellerType === 'owner'}
                  onPress={() => updateForm('sellerType', 'owner')}
                />
                <SelectChip
                  label="Agent / Broker"
                  selected={formData.sellerType === 'agent'}
                  onPress={() => updateForm('sellerType', 'agent')}
                />
              </View>

              <FormInput
                label="Your Name"
                value={formData.sellerName}
                onChangeText={(v: string) => updateForm('sellerName', v)}
                placeholder="Full name"
                required
              />

              <FormInput
                label="Phone Number"
                value={formData.sellerPhone}
                onChangeText={(v: string) => updateForm('sellerPhone', v)}
                placeholder="+49 XXX XXXXXXX"
                keyboardType="phone-pad"
                required
              />
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
        <Text style={styles.headerTitle}>Post Property</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} totalSteps={4} />

      {/* Step Content */}
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
                {currentStep === 3 ? 'Post Property' : 'Continue'}
              </Text>
              {currentStep < 3 && <Ionicons name="arrow-forward" size={20} color="#fff" />}
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  facilitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    gap: 8,
  },
  facilityItemActive: {
    backgroundColor: '#E8F5E9',
  },
  facilityLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  facilityLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  backBtn: {
    flex: 0.4,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  nextBtn: {
    flex: 0.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    gap: 8,
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
