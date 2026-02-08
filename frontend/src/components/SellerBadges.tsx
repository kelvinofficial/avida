import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface Badge {
  badge_id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  priority: number;
  earned_at?: string;
}

// Map icon names to Ionicons
const getIconName = (icon: string): keyof typeof Ionicons.glyphMap => {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    'star': 'star',
    'rocket': 'rocket',
    'lightning': 'flash',
    'shield': 'shield-checkmark',
    'fire': 'flame',
  };
  return iconMap[icon] || 'ribbon';
};

interface BadgeIconProps {
  badge: Badge;
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
  onPress?: () => void;
}

export const BadgeIcon: React.FC<BadgeIconProps> = ({ 
  badge, 
  size = 'medium',
  showTooltip = false,
  onPress 
}) => {
  const sizeConfig = {
    small: { container: 20, icon: 12, border: 1 },
    medium: { container: 28, icon: 16, border: 2 },
    large: { container: 40, icon: 24, border: 2 },
  };
  
  const config = sizeConfig[size];
  
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.badgeIcon,
        {
          width: config.container,
          height: config.container,
          borderRadius: config.container / 2,
          backgroundColor: badge.color + '20',
          borderWidth: config.border,
          borderColor: badge.color,
        }
      ]}
      data-testid={`badge-icon-${badge.badge_id}`}
    >
      <Ionicons 
        name={getIconName(badge.icon)} 
        size={config.icon} 
        color={badge.color} 
      />
    </TouchableOpacity>
  );
};

interface BadgeRowProps {
  badges: Badge[];
  maxDisplay?: number;
  size?: 'small' | 'medium' | 'large';
  onBadgePress?: (badge: Badge) => void;
}

export const BadgeRow: React.FC<BadgeRowProps> = ({ 
  badges, 
  maxDisplay = 3,
  size = 'small',
  onBadgePress 
}) => {
  if (!badges || badges.length === 0) return null;
  
  const displayBadges = badges.slice(0, maxDisplay);
  const remaining = badges.length - maxDisplay;
  
  return (
    <View style={styles.badgeRow} data-testid="badge-row">
      {displayBadges.map((badge) => (
        <BadgeIcon 
          key={badge.badge_id} 
          badge={badge} 
          size={size}
          onPress={onBadgePress ? () => onBadgePress(badge) : undefined}
        />
      ))}
      {remaining > 0 && (
        <View style={[styles.moreIndicator, { height: size === 'small' ? 20 : 28 }]}>
          <Text style={styles.moreText}>+{remaining}</Text>
        </View>
      )}
    </View>
  );
};

interface BadgeCardProps {
  badge: Badge;
  showEarnedDate?: boolean;
}

export const BadgeCard: React.FC<BadgeCardProps> = ({ badge, showEarnedDate = true }) => {
  return (
    <View style={[styles.badgeCard, { borderLeftColor: badge.color }]} data-testid={`badge-card-${badge.badge_id}`}>
      <View style={styles.badgeCardHeader}>
        <BadgeIcon badge={badge} size="large" />
        <View style={styles.badgeCardInfo}>
          <Text style={styles.badgeCardName}>{badge.name}</Text>
          <Text style={styles.badgeCardDescription}>{badge.description}</Text>
        </View>
      </View>
      {showEarnedDate && badge.earned_at && (
        <Text style={styles.earnedDate}>
          Earned {new Date(badge.earned_at).toLocaleDateString()}
        </Text>
      )}
    </View>
  );
};

interface BadgeListProps {
  badges: Badge[];
  emptyMessage?: string;
}

export const BadgeList: React.FC<BadgeListProps> = ({ 
  badges, 
  emptyMessage = "No badges earned yet" 
}) => {
  if (!badges || badges.length === 0) {
    return (
      <View style={styles.emptyContainer} data-testid="badges-empty">
        <Ionicons name="ribbon-outline" size={48} color="#ccc" />
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.badgeList} data-testid="badges-list">
      {badges.map((badge) => (
        <BadgeCard key={badge.badge_id} badge={badge} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  badgeIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  moreIndicator: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
  },
  badgeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  badgeCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  badgeCardDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  earnedDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
    textAlign: 'right',
  },
  badgeList: {
    paddingVertical: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
});

export default BadgeIcon;
