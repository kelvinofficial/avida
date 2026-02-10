/**
 * RadiusSelector Component
 * Allows users to select search radius for Near Me feature
 * Includes both preset dropdown and fine-tuning slider
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

interface RadiusSelectorProps {
  value: number;
  onChange: (radius: number) => void;
  disabled?: boolean;
}

const PRESET_RADII = [5, 10, 25, 50, 100];

export const RadiusSelector: React.FC<RadiusSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  const handleOpen = () => {
    if (disabled) return;
    setTempValue(value);
    setModalVisible(true);
  };

  const handlePresetSelect = (preset: number) => {
    setTempValue(preset);
  };

  const handleSliderChange = (newValue: number) => {
    setTempValue(Math.round(newValue));
  };

  const handleConfirm = () => {
    onChange(tempValue);
    setModalVisible(false);
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  return (
    <>
      {/* Trigger Button */}
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={handleOpen}
        disabled={disabled}
        data-testid="radius-selector-trigger"
      >
        <Ionicons name="resize-outline" size={14} color="#1976D2" />
        <Text style={styles.triggerText}>{value}km</Text>
        <Ionicons name="chevron-down" size={12} color="#1976D2" />
      </TouchableOpacity>

      {/* Radius Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCancel}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search Radius</Text>
              <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Current Value Display */}
            <View style={styles.valueDisplay}>
              <Ionicons name="locate" size={32} color="#1976D2" />
              <Text style={styles.valueText}>{tempValue} km</Text>
              <Text style={styles.valueSubtext}>from your location</Text>
            </View>

            {/* Preset Buttons */}
            <Text style={styles.sectionLabel}>Quick Select</Text>
            <View style={styles.presetContainer}>
              {PRESET_RADII.map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={[
                    styles.presetButton,
                    tempValue === preset && styles.presetButtonActive,
                  ]}
                  onPress={() => handlePresetSelect(preset)}
                >
                  <Text
                    style={[
                      styles.presetText,
                      tempValue === preset && styles.presetTextActive,
                    ]}
                  >
                    {preset}km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Fine-tuning Slider */}
            <Text style={styles.sectionLabel}>Fine-tune</Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>5km</Text>
              <Slider
                style={styles.slider}
                minimumValue={5}
                maximumValue={100}
                step={1}
                value={tempValue}
                onValueChange={handleSliderChange}
                minimumTrackTintColor="#1976D2"
                maximumTrackTintColor="#E0E0E0"
                thumbTintColor="#1976D2"
              />
              <Text style={styles.sliderLabel}>100km</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                <Text style={styles.confirmButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  triggerDisabled: {
    opacity: 0.5,
  },
  triggerText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  valueDisplay: {
    alignItems: 'center',
    backgroundColor: '#F5F9FF',
    paddingVertical: 24,
    borderRadius: 12,
    marginBottom: 20,
  },
  valueText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1976D2',
    marginTop: 8,
  },
  valueSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  presetContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    minWidth: 60,
    alignItems: 'center',
  },
  presetButtonActive: {
    backgroundColor: '#1976D2',
  },
  presetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  presetTextActive: {
    color: '#fff',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  slider: {
    flex: 1,
    marginHorizontal: 10,
    height: 40,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#999',
    width: 40,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#1976D2',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default RadiusSelector;
