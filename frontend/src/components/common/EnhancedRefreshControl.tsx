import React from 'react';
import { RefreshControl, Platform, RefreshControlProps } from 'react-native';
import * as Haptics from 'expo-haptics';

interface EnhancedRefreshControlProps extends Omit<RefreshControlProps, 'onRefresh'> {
  onRefresh: () => Promise<void> | void;
  hapticFeedback?: boolean;
}

/**
 * EnhancedRefreshControl
 * 
 * Pull-to-refresh with:
 * - Haptic feedback when refresh triggers
 * - Consistent styling across platforms
 * - Promise-based refresh handling
 */
export const EnhancedRefreshControl: React.FC<EnhancedRefreshControlProps> = ({
  onRefresh,
  refreshing,
  hapticFeedback = true,
  ...props
}) => {
  const handleRefresh = async () => {
    // Trigger haptic feedback on native platforms
    if (Platform.OS !== 'web' && hapticFeedback) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Haptics not available, ignore
      }
    }
    
    await onRefresh();
  };

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor="#2E7D32"
      colors={['#2E7D32', '#4CAF50', '#81C784']}
      progressBackgroundColor="#FFFFFF"
      title="Pull to refresh"
      titleColor="#666666"
      {...props}
    />
  );
};

export default EnhancedRefreshControl;
