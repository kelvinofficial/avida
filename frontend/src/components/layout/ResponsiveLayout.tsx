import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';
import { DesktopSidebar } from './DesktopSidebar';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  showSidebar = true,
}) => {
  const { isDesktop, isTablet } = useResponsive();

  // Mobile: No sidebar, full width
  if (!isDesktop && !isTablet) {
    return <View style={styles.container}>{children}</View>;
  }

  // Tablet: Optional compact sidebar
  if (isTablet) {
    return (
      <View style={styles.container}>
        {showSidebar && <DesktopSidebar />}
        <View style={styles.mainContent}>{children}</View>
      </View>
    );
  }

  // Desktop: Full sidebar + main content
  return (
    <View style={styles.desktopContainer}>
      {showSidebar && <DesktopSidebar />}
      <View style={styles.mainContent}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    minHeight: '100%',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
});

export default ResponsiveLayout;
