import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';
import { ExploreCard } from '../../types/auto';

interface ExploreCardsProps {
  cards: ExploreCard[];
  onPressCard: (card: ExploreCard) => void;
}

export const ExploreCards: React.FC<ExploreCardsProps> = ({ cards, onPressCard }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Explore Motors</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {cards.map((card) => (
          <TouchableOpacity
            key={card.id}
            style={styles.card}
            onPress={() => onPressCard(card)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${card.color}15` }]}>
              <Ionicons name={card.icon as any} size={24} color={card.color} />
            </View>
            <Text style={styles.cardTitle} numberOfLines={1}>{card.title}</Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>{card.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    minWidth: 120,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
  },
});
