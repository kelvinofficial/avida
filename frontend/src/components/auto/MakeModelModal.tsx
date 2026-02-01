import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';
import { CAR_BRANDS, CAR_MODELS } from '../../data/autoData';

interface MakeModelModalProps {
  visible: boolean;
  onClose: () => void;
  mode: 'make' | 'model';
  selectedMake: string | null;
  selectedModel: string | null;
  onSelectMake: (make: string | null) => void;
  onSelectModel: (model: string | null) => void;
}

export const MakeModelModal: React.FC<MakeModelModalProps> = ({
  visible,
  onClose,
  mode,
  selectedMake,
  selectedModel,
  onSelectMake,
  onSelectModel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMode, setCurrentMode] = useState(mode);

  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  const brands = CAR_BRANDS.filter((brand) =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const models = selectedMake
    ? (CAR_MODELS[selectedMake] || []).filter((model) =>
        model.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSelectMake = (makeId: string | null) => {
    onSelectMake(makeId);
    onSelectModel(null);
    if (makeId) {
      setCurrentMode('model');
      setSearchQuery('');
    } else {
      onClose();
    }
  };

  const handleSelectModel = (model: string | null) => {
    onSelectModel(model);
    onClose();
  };

  const renderMakeItem = ({ item }: { item: typeof CAR_BRANDS[0] | { id: string; name: string; logo: string; listingsCount: number } }) => (
    <TouchableOpacity
      style={[
        styles.item,
        selectedMake === item.id && styles.itemSelected,
      ]}
      onPress={() => handleSelectMake(item.id === 'all' ? null : item.id)}
    >
      <View style={styles.itemContent}>
        <Text style={styles.itemLogo}>{item.logo}</Text>
        <View>
          <Text
            style={[
              styles.itemName,
              selectedMake === item.id && styles.itemNameSelected,
            ]}
          >
            {item.name}
          </Text>
          <Text style={styles.itemCount}>{item.listingsCount.toLocaleString()} listings</Text>
        </View>
      </View>
      {selectedMake === item.id && (
        <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
      )}
    </TouchableOpacity>
  );

  const renderModelItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.item,
        selectedModel === item && styles.itemSelected,
      ]}
      onPress={() => handleSelectModel(item)}
    >
      <Text
        style={[
          styles.itemName,
          selectedModel === item && styles.itemNameSelected,
        ]}
      >
        {item}
      </Text>
      {selectedModel === item && (
        <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
      )}
    </TouchableOpacity>
  );

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
          <Text style={styles.title}>
            {currentMode === 'make' ? 'Select Make' : `Select ${selectedMake} Model`}
          </Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, currentMode === 'make' && styles.tabActive]}
            onPress={() => {
              setCurrentMode('make');
              setSearchQuery('');
            }}
          >
            <Text style={[styles.tabText, currentMode === 'make' && styles.tabTextActive]}>
              Make
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, currentMode === 'model' && styles.tabActive]}
            onPress={() => selectedMake && setCurrentMode('model')}
            disabled={!selectedMake}
          >
            <Text
              style={[
                styles.tabText,
                currentMode === 'model' && styles.tabTextActive,
                !selectedMake && styles.tabTextDisabled,
              ]}
            >
              Model
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.colors.onSurfaceVariant} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${currentMode}...`}
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

        {currentMode === 'make' ? (
          <FlatList
            data={[{ id: 'all', name: 'All Makes', logo: '🚗', listingsCount: 8500 }, ...brands]}
            keyExtractor={(item) => item.id}
            renderItem={renderMakeItem}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No makes found</Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={['All Models', ...models]}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.item,
                  (item === 'All Models' ? selectedModel === null : selectedModel === item) &&
                    styles.itemSelected,
                ]}
                onPress={() => handleSelectModel(item === 'All Models' ? null : item)}
              >
                <Text
                  style={[
                    styles.itemName,
                    (item === 'All Models' ? selectedModel === null : selectedModel === item) &&
                      styles.itemNameSelected,
                  ]}
                >
                  {item}
                </Text>
                {(item === 'All Models' ? selectedModel === null : selectedModel === item) && (
                  <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Select a make first</Text>
              </View>
            }
          />
        )}
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
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onSurfaceVariant,
  },
  tabTextActive: {
    color: theme.colors.primary,
  },
  tabTextDisabled: {
    opacity: 0.5,
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
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  itemSelected: {
    backgroundColor: theme.colors.primaryContainer,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  itemLogo: {
    fontSize: 24,
  },
  itemName: {
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  itemNameSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  itemCount: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
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
