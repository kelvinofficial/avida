/**
 * BottomSheetDrawer - Full-height expandable bottom sheet
 * Implements proper safe area handling with sticky header
 */

import React, { ReactNode, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  Platform,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, LAYOUT, RADIUS, SHADOWS, getBottomPadding } from '../../constants/layout';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface BottomSheetDrawerProps {
  visible: boolean;
  onClose: () => void;
  /** Title displayed in the sticky header */
  title?: string;
  /** Icon for the header (Ionicons name) */
  headerIcon?: string;
  /** Custom header component */
  customHeader?: ReactNode;
  /** Content inside the scrollable area */
  children: ReactNode;
  /** Maximum height as percentage of screen (0-1) */
  maxHeightPercent?: number;
  /** Whether to show the header */
  showHeader?: boolean;
  /** Test ID */
  testID?: string;
}

/**
 * BottomSheetDrawer implements:
 * - Full-height expandable drawer (up to 95% screen height)
 * - Sticky header that doesn't scroll
 * - Proper safe area handling at bottom
 * - Tap outside to close
 * - Android back button support
 * - Smooth slide animation
 */
export const BottomSheetDrawer: React.FC<BottomSheetDrawerProps> = ({
  visible,
  onClose,
  title,
  headerIcon,
  customHeader,
  children,
  maxHeightPercent = 0.95,
  showHeader = true,
  testID,
}) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Calculate max height
  const maxHeight = SCREEN_HEIGHT * maxHeightPercent;
  const bottomPadding = getBottomPadding(insets.bottom, SPACING.lg);

  // Handle Android back button
  useEffect(() => {
    if (!visible) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });

    return () => backHandler.remove();
  }, [visible, onClose]);

  // Animate in/out
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View 
          style={[styles.overlay, { opacity: fadeAnim }]}
        />
      </TouchableWithoutFeedback>

      {/* Sheet Container */}
      <Animated.View
        style={[
          styles.sheetContainer,
          {
            maxHeight,
            transform: [{ translateY: slideAnim }],
          },
        ]}
        testID={testID}
      >
        <TouchableWithoutFeedback>
          <View style={styles.sheet}>
            {/* Drag Handle */}
            <View style={styles.dragHandleContainer}>
              <View style={styles.dragHandle} />
            </View>

            {/* Sticky Header */}
            {showHeader && (
              <View style={styles.header}>
                {customHeader || (
                  <>
                    <View style={styles.headerLeft}>
                      {headerIcon && (
                        <View style={styles.headerIconContainer}>
                          <Ionicons
                            name={headerIcon as any}
                            size={24}
                            color={COLORS.primary}
                          />
                        </View>
                      )}
                      <Text style={styles.headerTitle} numberOfLines={1}>
                        {title}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={onClose}
                      style={styles.closeButton}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      testID="bottom-sheet-close-btn"
                    >
                      <Ionicons name="close" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {/* Divider */}
            {showHeader && <View style={styles.divider} />}

            {/* Scrollable Content */}
            <ScrollView
              style={styles.content}
              contentContainerStyle={[
                styles.contentContainer,
                { paddingBottom: bottomPadding },
              ]}
              showsVerticalScrollIndicator={false}
              bounces={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    overflow: 'hidden',
    ...SHADOWS.xl,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.borderLight,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minHeight: LAYOUT.bottomSheet.headerHeight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  closeButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
});

export default BottomSheetDrawer;
