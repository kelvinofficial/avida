/**
 * LocationModal Component
 * Modal for selecting location with hierarchical picker
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LocationPicker, LocationData } from '../LocationPicker';
import { styles } from './homeStyles';

interface LocationFilter {
  country_code?: string;
  region_code?: string;
  district_code?: string;
  city_code?: string;
  city_name?: string;
  location_text?: string;
  lat?: number;
  lng?: number;
}

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
  selectedLocationFilter: LocationFilter | null;
  onLocationSelect: (location: LocationData) => void;
  onClearLocationFilter: () => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  visible,
  onClose,
  selectedLocationFilter,
  onLocationSelect,
  onClearLocationFilter,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.locationPickerModal}>
        <View style={styles.locationPickerHeader}>
          <Text style={styles.locationPickerTitle}>Select Location</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} data-testid="location-modal-close">
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        
        {/* Current selection info */}
        {selectedLocationFilter && (
          <View style={styles.currentLocationBanner}>
            <Ionicons name="location" size={20} color="#2E7D32" />
            <Text style={styles.currentLocationText}>
              {selectedLocationFilter.location_text || selectedLocationFilter.city_name}
            </Text>
            <TouchableOpacity onPress={onClearLocationFilter} style={styles.clearFilterBtn} data-testid="clear-location-btn">
              <Text style={styles.clearFilterBtnText}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.locationPickerContent}>
          <Text style={styles.locationPickerHint}>
            Filter listings by region in Tanzania.
          </Text>
          
          <LocationPicker
            value={selectedLocationFilter}
            onChange={(location) => {
              onLocationSelect(location);
              onClose();
            }}
            placeholder="Browse locations..."
          />
          
          {/* All Locations option */}
          <TouchableOpacity 
            style={[styles.allLocationsBtn, !selectedLocationFilter && styles.allLocationsBtnActive]}
            onPress={() => {
              onClearLocationFilter();
              onClose();
            }}
            data-testid="all-locations-btn"
          >
            <Ionicons name="globe-outline" size={20} color={!selectedLocationFilter ? "#2E7D32" : "#666"} />
            <Text style={[styles.allLocationsBtnText, !selectedLocationFilter && styles.allLocationsBtnTextActive]}>
              All Locations
            </Text>
            {!selectedLocationFilter && (
              <Ionicons name="checkmark" size={20} color="#2E7D32" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default LocationModal;
