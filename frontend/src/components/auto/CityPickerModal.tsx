import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';
import { CITIES } from '../../data/autoData';

interface CityPickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedCity: string | null;
  onSelectCity: (city: string | null) => void;
}

export const CityPickerModal: React.FC<CityPickerModalProps> = ({
  visible,
  onClose,
  selectedCity,
  onSelectCity,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCities = CITIES.filter((city) =>
    city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (city: string | null) => {
    onSelectCity(city);
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
          <Text style={styles.title}>Select City</Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.colors.onSurfaceVariant} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search city..."
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={[{ id: 'all', name: 'All Germany' }, ...filteredCities.map((c) => ({ id: c, name: c }))]}
          keyExtractor={(item) => item.id || item.name}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.cityItem,
                (item.id === 'all' ? selectedCity === null : selectedCity === item.name) &&
                  styles.cityItemSelected,
              ]}
              onPress={() => handleSelect(item.id === 'all' ? null : item.name)}
            >
              <View style={styles.cityInfo}>
                <Ionicons
                  name={item.id === 'all' ? 'globe-outline' : 'location-outline'}
                  size={20}
                  color={
                    (item.id === 'all' ? selectedCity === null : selectedCity === item.name)
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant
                  }
                />
                <Text
                  style={[
                    styles.cityName,
                    (item.id === 'all' ? selectedCity === null : selectedCity === item.name) &&
                      styles.cityNameSelected,
                  ]}
                >
                  {item.name}
                </Text>
              </View>
              {(item.id === 'all' ? selectedCity === null : selectedCity === item.name) && (
                <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No cities found</Text>
            </View>
          }
        />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.onSurface,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  cityItemSelected: {
    backgroundColor: theme.colors.primaryContainer,
  },
  cityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  cityName: {
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  cityNameSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  emptyState: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
});
