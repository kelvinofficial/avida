import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest First', icon: 'time-outline' },
  { id: 'oldest', label: 'Oldest First', icon: 'time-outline' },
  { id: 'price_asc', label: 'Price: Low to High', icon: 'arrow-up-outline' },
  { id: 'price_desc', label: 'Price: High to Low', icon: 'arrow-down-outline' },
  { id: 'mileage_asc', label: 'Mileage: Low to High', icon: 'speedometer-outline' },
  { id: 'year_desc', label: 'Year: Newest First', icon: 'calendar-outline' },
];

interface SortModalProps {
  visible: boolean;
  onClose: () => void;
  selectedSort: string;
  onSelectSort: (sortId: string) => void;
}

export const SortModal: React.FC<SortModalProps> = ({
  visible,
  onClose,
  selectedSort,
  onSelectSort,
}) => {
  const handleSelect = (sortId: string) => {
    onSelectSort(sortId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.container}>
          <View style={styles.handle} />
          <Text style={styles.title}>Sort By</Text>
          
          {SORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.option,
                selectedSort === option.id && styles.optionSelected,
              ]}
              onPress={() => handleSelect(option.id)}
            >
              <View style={styles.optionContent}>
                <Ionicons
                  name={option.icon as any}
                  size={20}
                  color={
                    selectedSort === option.id
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant
                  }
                />
                <Text
                  style={[
                    styles.optionText,
                    selectedSort === option.id && styles.optionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </View>
              {selectedSort === option.id && (
                <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingBottom: 34,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.outline,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  optionSelected: {
    backgroundColor: theme.colors.primaryContainer,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  optionText: {
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  optionTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
