import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';
import { EnhancedRefreshControl } from '../common';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  padding?: number;
  scrollable?: boolean;
  refreshing?: boolean;
  onRefresh?: () => Promise<void> | void;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  maxWidth = 1400,
  padding,
  scrollable = false,
  refreshing = false,
  onRefresh,
}) => {
  const { isDesktop, isTablet, width } = useResponsive();

  const containerPadding = padding ?? (isDesktop ? 32 : isTablet ? 24 : 16);
  const shouldCenter = width > maxWidth;

  const content = (
    <View
      style={[
        styles.container,
        {
          maxWidth: isDesktop || isTablet ? maxWidth : '100%',
          paddingHorizontal: containerPadding,
          alignSelf: shouldCenter ? 'center' : 'stretch',
          width: shouldCenter ? maxWidth : '100%',
        },
      ]}
    >
      {children}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          onRefresh ? (
            <EnhancedRefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          ) : undefined
        }
      >
        {content}
      </ScrollView>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

export default ResponsiveContainer;
