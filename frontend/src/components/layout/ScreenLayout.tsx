/**
 * ScreenLayout - Standard screen structure for Avida Mobile App
 * Implements proper safe area handling and sticky CTA button pattern
 */

import React, { ReactNode } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, LAYOUT, getBottomPadding } from '../../constants/layout';

interface ScreenLayoutProps {
  children: ReactNode;
  /** Sticky CTA button or action bar at the bottom */
  stickyFooter?: ReactNode;
  /** Background color for the screen */
  backgroundColor?: string;
  /** Whether to show the status bar light content */
  statusBarLight?: boolean;
  /** Additional style for the container */
  style?: ViewStyle;
  /** Safe area edges to respect */
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  /** Whether to use KeyboardAvoidingView */
  keyboardAvoiding?: boolean;
  /** Test ID for the screen */
  testID?: string;
}

/**
 * ScreenLayout provides the standard structure for all screens:
 * - SafeAreaView wrapper with proper insets
 * - Main content area
 * - Sticky footer outside of scroll (if provided)
 * 
 * Usage:
 * <ScreenLayout stickyFooter={<CTAButton />}>
 *   <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
 *     {content}
 *   </ScrollView>
 * </ScreenLayout>
 */
export const ScreenLayout: React.FC<ScreenLayoutProps> = ({
  children,
  stickyFooter,
  backgroundColor = COLORS.background,
  statusBarLight = false,
  style,
  edges = ['top'],
  keyboardAvoiding = false,
  testID,
}) => {
  const insets = useSafeAreaInsets();
  
  const content = (
    <SafeAreaView 
      style={[styles.container, { backgroundColor }, style]} 
      edges={edges}
      testID={testID}
    >
      <View style={styles.contentContainer}>
        {children}
      </View>
      
      {stickyFooter && (
        <View 
          style={[
            styles.stickyFooter,
            { paddingBottom: getBottomPadding(insets.bottom) }
          ]}
        >
          {stickyFooter}
        </View>
      )}
    </SafeAreaView>
  );

  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  stickyFooter: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});

export default ScreenLayout;
