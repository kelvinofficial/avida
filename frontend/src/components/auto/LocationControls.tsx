import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';

interface LocationControlsProps {
  selectedCity: string | null;
  nearMeEnabled: boolean;
  radius: number;
  onSelectCity: () => void;
  onToggleNearMe: () => void;
  onChangeRadius: (radius: number) => void;
}

export const LocationControls: React.FC<LocationControlsProps> = ({
  selectedCity,
  nearMeEnabled,
  radius,
  onSelectCity,
  onToggleNearMe,
  onChangeRadius,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.citySelector} onPress={onSelectCity}>
        <Ionicons name="location" size={18} color={theme.colors.primary} />
        <Text style={styles.cityText} numberOfLines={1}>
          {selectedCity || 'All Germany'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={theme.colors.onSurfaceVariant} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.nearMeButton,
          nearMeEnabled && styles.nearMeButtonActive,
        ]}
        onPress={onToggleNearMe}
      >
        <Ionicons
          name="navigate"
          size={16}
          color={nearMeEnabled ? theme.colors.onPrimary : theme.colors.primary}
        />
        <Text style={[
          styles.nearMeText,
          nearMeEnabled && styles.nearMeTextActive,
        ]}>
          Near Me
        </Text>
      </TouchableOpacity>

      {nearMeEnabled && (
        <View style={styles.radiusContainer}>
          <Text style={styles.radiusLabel}>{radius} km</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  citySelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  cityText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  nearMeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    gap: 4,
  },
  nearMeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  nearMeText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  nearMeTextActive: {
    color: theme.colors.onPrimary,
  },
  radiusContainer: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  radiusLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
});
