import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';

interface SegmentedTabsProps {
  tabs: { id: string; label: string; icon?: string }[];
  activeTab: string;
  onTabPress: (tabId: string) => void;
}

export const SegmentedTabs: React.FC<SegmentedTabsProps> = ({
  tabs,
  activeTab,
  onTabPress,
}) => {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[
            styles.tab,
            activeTab === tab.id && styles.tabActive,
          ]}
          onPress={() => onTabPress(tab.id)}
        >
          {tab.icon && (
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.id ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
            />
          )}
          <Text
            style={[
              styles.tabText,
              activeTab === tab.id && styles.tabTextActive,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.full,
    padding: 4,
    marginHorizontal: theme.spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    gap: 4,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onSurfaceVariant,
  },
  tabTextActive: {
    color: theme.colors.onPrimary,
  },
});
