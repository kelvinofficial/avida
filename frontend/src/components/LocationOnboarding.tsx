/**
 * LocationOnboarding Component
 * Shown after user registration to request location permission
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserLocation } from '../context/LocationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LocationOnboardingProps {
  visible: boolean;
  onComplete: () => void;
}

const ONBOARDING_KEY = '@location_onboarding_shown';

export const checkLocationOnboardingShown = async (): Promise<boolean> => {
  const shown = await AsyncStorage.getItem(ONBOARDING_KEY);
  return shown === 'true';
};

export const markLocationOnboardingShown = async () => {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
};

export const LocationOnboarding: React.FC<LocationOnboardingProps> = ({
  visible,
  onComplete,
}) => {
  const { requestLocation, isLoading, userLocation } = useUserLocation();
  const [step, setStep] = useState<'intro' | 'requesting' | 'success' | 'skipped'>('intro');

  const handleEnableLocation = async () => {
    setStep('requesting');
    const location = await requestLocation();
    
    if (location) {
      setStep('success');
      await markLocationOnboardingShown();
      setTimeout(() => {
        onComplete();
      }, 1500);
    } else {
      setStep('intro'); // Go back to allow retry or skip
    }
  };

  const handleSkip = async () => {
    setStep('skipped');
    await markLocationOnboardingShown();
    setTimeout(() => {
      onComplete();
    }, 1000);
  };

  const renderContent = () => {
    switch (step) {
      case 'intro':
        return (
          <>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#1976D2', '#42A5F5']}
                style={styles.iconGradient}
              >
                <Ionicons name="location" size={48} color="#fff" />
              </LinearGradient>
            </View>
            
            <Text style={styles.title}>Enable Location</Text>
            <Text style={styles.subtitle}>
              Get a better experience with location-based features
            </Text>
            
            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <Ionicons name="navigate" size={24} color="#1976D2" />
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>Near Me Filter</Text>
                  <Text style={styles.benefitDesc}>Find listings close to you</Text>
                </View>
              </View>
              
              <View style={styles.benefitItem}>
                <Ionicons name="speedometer" size={24} color="#1976D2" />
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>Distance Info</Text>
                  <Text style={styles.benefitDesc}>See how far each listing is</Text>
                </View>
              </View>
              
              <View style={styles.benefitItem}>
                <Ionicons name="map" size={24} color="#1976D2" />
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>Local Sellers</Text>
                  <Text style={styles.benefitDesc}>Connect with sellers nearby</Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.enableButton} 
              onPress={handleEnableLocation}
              data-testid="enable-location-button"
            >
              <Ionicons name="location" size={20} color="#fff" />
              <Text style={styles.enableButtonText}>Enable Location</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.skipButton} 
              onPress={handleSkip}
              data-testid="skip-location-button"
            >
              <Text style={styles.skipButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </>
        );
      
      case 'requesting':
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1976D2" />
            <Text style={styles.loadingText}>Getting your location...</Text>
            <Text style={styles.loadingSubtext}>
              Please allow location access when prompted
            </Text>
          </View>
        );
      
      case 'success':
        return (
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
            </View>
            <Text style={styles.successTitle}>Location Enabled!</Text>
            <Text style={styles.successSubtext}>
              {userLocation?.city ? `You're in ${userLocation.city}` : 'You\'re all set'}
            </Text>
          </View>
        );
      
      case 'skipped':
        return (
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="arrow-forward-circle" size={80} color="#666" />
            </View>
            <Text style={styles.successTitle}>No Problem!</Text>
            <Text style={styles.successSubtext}>
              You can enable location anytime from the Near Me filter
            </Text>
          </View>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleSkip}
    >
      <View style={styles.container}>
        {renderContent()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  benefitsList: {
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F9FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 16,
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 14,
    color: '#666',
  },
  enableButton: {
    backgroundColor: '#1976D2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  enableButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  successContainer: {
    alignItems: 'center',
    gap: 8,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  successSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default LocationOnboarding;
