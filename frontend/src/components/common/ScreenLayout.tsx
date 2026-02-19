/**
 * ScreenLayout - Standardized screen wrapper component
 * 
 * Provides consistent safe area handling across all screens:
 * - Proper top safe area padding
 * - Bottom padding that accounts for tab bar and OS navigation
 * - Support for sticky CTA buttons at bottom
 * - Scrollable content with proper padding
 */

import React, { ReactNode } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, LAYOUT, getBottomPadding, getScrollContentPadding } from '../../constants/layout';

interface ScreenLayoutProps {
  children: ReactNode;
  /** Background color of the screen */
  backgroundColor?: string;
  /** Whether the screen should scroll */
  scrollable?: boolean;
  /** Custom scroll container style */
  scrollContainerStyle?: ViewStyle;
  /** Sticky bottom CTA component (will be positioned above safe area) */
  stickyBottom?: ReactNode;
  /** Whether to show keyboard avoiding view behavior */
  keyboardAvoiding?: boolean;
  /** Top safe area edges - 'top' adds status bar padding */
  safeTop?: boolean;
  /** Bottom safe area edges - use false when inside tab navigator */
  safeBottom?: boolean;
  /** Additional bottom padding (e.g., for tab bar) */
  tabBarPadding?: number;
  /** Test ID for the container */
  testID?: string;
  /** Header component (sticky at top, not scrollable) */
  header?: ReactNode;
  /** Content container style */
  contentContainerStyle?: ViewStyle;
}

/**
 * ScreenLayout provides:
 * 1. Safe area handling (top and bottom)
 * 2. Optional scrolling with proper content padding
 * 3. Sticky bottom CTA support
 * 4. Keyboard avoiding behavior
 * 5. Tab bar padding support
 */
export const ScreenLayout: React.FC<ScreenLayoutProps> = ({
  children,
  backgroundColor = COLORS.background,
  scrollable = true,
  scrollContainerStyle,
  stickyBottom,
  keyboardAvoiding = false,
  safeTop = true,
  safeBottom = true,
  tabBarPadding = 0,
  testID,
  header,
  contentContainerStyle,
}) => {
  const insets = useSafeAreaInsets();
  
  // Calculate bottom padding based on whether there's a sticky CTA
  const bottomInset = safeBottom ? Math.max(insets.bottom, LAYOUT.safeArea.minBottomPadding) : 0;
  const totalBottomPadding = stickyBottom 
    ? getScrollContentPadding(bottomInset) + tabBarPadding
    : getBottomPadding(bottomInset) + tabBarPadding;

  // Top padding for safe area
  const topPadding = safeTop ? insets.top : 0;

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor,
  };

  const contentStyle: ViewStyle = {
    flex: 1,
    paddingTop: topPadding,
  };

  const scrollContentStyle: ViewStyle = {
    flexGrow: 1,
    paddingBottom: totalBottomPadding,
    ...contentContainerStyle,
  };

  const renderContent = () => {
    if (scrollable) {
      return (
        <ScrollView
          style={[styles.scrollView, scrollContainerStyle]}
          contentContainerStyle={scrollContentStyle}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={true}
        >
          {children}
        </ScrollView>
      );
    }

    return (
      <View style={[styles.contentView, { paddingBottom: totalBottomPadding }, contentContainerStyle]}>
        {children}
      </View>
    );
  };

  const renderMain = () => (
    <View style={containerStyle} testID={testID}>
      <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
      <View style={contentStyle}>
        {header}
        {renderContent()}
      </View>
      
      {/* Sticky Bottom CTA */}
      {stickyBottom && (
        <View style={[styles.stickyBottomContainer, { paddingBottom: bottomInset + tabBarPadding }]}>
          {stickyBottom}
        </View>
      )}
    </View>
  );

  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {renderMain()}
      </KeyboardAvoidingView>
    );
  }

  return renderMain();
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentView: {
    flex: 1,
  },
  stickyBottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.base,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default ScreenLayout;
