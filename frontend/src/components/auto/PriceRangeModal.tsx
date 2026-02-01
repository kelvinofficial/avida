import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';
import { PRICE_RANGES } from '../../data/autoData';

interface PriceRangeModalProps {
  visible: boolean;
  onClose: () => void;
  minPrice: number | undefined;
  maxPrice: number | undefined;
  onApply: (min: number | undefined, max: number | undefined) => void;
}

export const PriceRangeModal: React.FC<PriceRangeModalProps> = ({
  visible,
  onClose,
  minPrice,
  maxPrice,
  onApply,
}) => {
  const [localMin, setLocalMin] = useState(minPrice?.toString() || '');
  const [localMax, setLocalMax] = useState(maxPrice?.toString() || '');
  const [selectedRange, setSelectedRange] = useState<number | null>(null);

  const handleRangeSelect = (index: number) => {
    const range = PRICE_RANGES[index];
    setSelectedRange(index);
    setLocalMin(range.min.toString());
    setLocalMax(range.max?.toString() || '');
  };

  const handleApply = () => {
    const min = localMin ? parseInt(localMin) : undefined;
    const max = localMax ? parseInt(localMax) : undefined;
    onApply(min, max);
    onClose();
  };

  const handleClear = () => {
    setLocalMin('');
    setLocalMax('');
    setSelectedRange(null);
    onApply(undefined, undefined);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.title}>Price Range</Text>
          <TouchableOpacity onPress={handleClear}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Custom Range</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Min Price</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.currency}>€</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                  keyboardType="numeric"
                  value={localMin}
                  onChangeText={(text) => {
                    setLocalMin(text);
                    setSelectedRange(null);
                  }}
                />
              </View>
            </View>
            <View style={styles.separator}>
              <Text style={styles.separatorText}>to</Text>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Max Price</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.currency}>€</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Any"
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                  keyboardType="numeric"
                  value={localMax}
                  onChangeText={(text) => {
                    setLocalMax(text);
                    setSelectedRange(null);
                  }}
                />
              </View>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: theme.spacing.lg }]}>Quick Select</Text>
          <View style={styles.rangesContainer}>
            {PRICE_RANGES.map((range, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.rangeChip,
                  selectedRange === index && styles.rangeChipSelected,
                ]}
                onPress={() => handleRangeSelect(index)}
              >
                <Text
                  style={[
                    styles.rangeChipText,
                    selectedRange === index && styles.rangeChipTextSelected,
                  ]}
                >
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>Apply Price Range</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surface,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  clearText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  currency: {
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  separator: {
    paddingBottom: theme.spacing.sm,
  },
  separatorText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  rangesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  rangeChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rangeChipSelected: {
    backgroundColor: theme.colors.primaryContainer,
    borderColor: theme.colors.primary,
  },
  rangeChipText: {
    fontSize: 13,
    color: theme.colors.onSurface,
  },
  rangeChipTextSelected: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
  },
  applyButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  applyButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
