import React, { useRef, useEffect, useMemo, createContext, useContext } from 'react';
import { View, StyleSheet, Animated, Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============ SHIMMER THEME CONTEXT ============
interface ShimmerTheme {
  baseColor: string;
  shimmerColor: string;
  backgroundColor: string;
  surfaceColor: string;
  duration: number;
}

const defaultTheme: ShimmerTheme = {
  baseColor: '#E0E0E0',
  shimmerColor: '#F5F5F5',
  backgroundColor: '#F5F5F5',
  surfaceColor: '#FFFFFF',
  duration: 1500,
};

const ShimmerThemeContext = createContext<ShimmerTheme>(defaultTheme);

// Export provider for customization
export const ShimmerThemeProvider: React.FC<{
  children: React.ReactNode;
  theme?: Partial<ShimmerTheme>;
}> = ({ children, theme }) => {
  const mergedTheme = useMemo(() => ({ ...defaultTheme, ...theme }), [theme]);
  return (
    <ShimmerThemeContext.Provider value={mergedTheme}>
      {children}
    </ShimmerThemeContext.Provider>
  );
};

export const useShimmerTheme = () => useContext(ShimmerThemeContext);

// Legacy COLORS object for backward compatibility
const COLORS = {
  skeleton: '#E0E0E0',
  skeletonLight: '#F5F5F5',
  background: '#F5F5F5',
  surface: '#FFFFFF',
};

// ============ SHIMMER BOX COMPONENT ============
// A polished shimmer component with gradient animation
interface ShimmerBoxProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: any;
  aspectRatio?: number;
}

const ShimmerBox: React.FC<ShimmerBoxProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  aspectRatio,
}) => {
  const theme = useShimmerTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: theme.duration,
        useNativeDriver: Platform.OS !== 'web',
      })
    );
    animation.start();
    return () => animation.stop();
  }, [theme.duration]);

  // For web, use CSS animation for better performance
  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          {
            width,
            height: aspectRatio ? undefined : height,
            aspectRatio,
            borderRadius,
            backgroundColor: theme.baseColor,
            overflow: 'hidden',
            position: 'relative',
          },
          style,
        ]}
      >
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(90deg, ${theme.baseColor} 0%, ${theme.shimmerColor} 50%, ${theme.baseColor} 100%)`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite ease-in-out',
          } as any}
        />
        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </View>
    );
  }

  // For native, use Animated.View with translateX
  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  return (
    <View
      style={[
        {
          width,
          height: aspectRatio ? undefined : height,
          aspectRatio,
          borderRadius,
          backgroundColor: theme.baseColor,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: 150,
          backgroundColor: theme.shimmerColor,
          opacity: 0.5,
          transform: [{ translateX }, { skewX: '-20deg' }],
        }}
      />
    </View>
  );
};

// Shorthand for legacy opacity-based shimmer (kept for transition)
const useShimmer = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);
  
  return shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });
};

// ============ HOMEPAGE SKELETON ============
export const HomepageSkeleton: React.FC<{ isDesktop?: boolean }> = ({ isDesktop = false }) => {
  const theme = useShimmerTheme();
  
  const cardCount = isDesktop ? 8 : 4;
  const cardWidth = isDesktop ? '23%' : '48%';
  
  return (
    <View style={[skeletonBase.container, { backgroundColor: theme.backgroundColor }, isDesktop && { maxWidth: 1280, alignSelf: 'center' as const, width: '100%' }]}>
      {/* Header skeleton */}
      <View style={skeletonBase.header}>
        <ShimmerBox width={100} height={36} borderRadius={4} />
        <View style={skeletonBase.headerRight}>
          <ShimmerBox width={60} height={36} borderRadius={8} />
          <ShimmerBox width={60} height={36} borderRadius={8} />
          <ShimmerBox width={120} height={40} borderRadius={8} />
        </View>
      </View>
      
      {/* Search bar skeleton */}
      <View style={skeletonBase.searchRow}>
        <ShimmerBox height={48} borderRadius={24} style={{ flex: 1 }} />
        <ShimmerBox width={150} height={48} borderRadius={24} />
      </View>
      
      {/* Category pills skeleton */}
      <View style={skeletonBase.categories}>
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <ShimmerBox key={i} width={100} height={40} borderRadius={20} />
        ))}
      </View>
      
      {/* Section title */}
      <ShimmerBox width={150} height={22} borderRadius={4} style={{ marginBottom: 16 }} />
      
      {/* Grid skeleton */}
      <View style={skeletonBase.grid}>
        {Array(cardCount).fill(0).map((_, i) => (
          <View key={i} style={[skeletonBase.card, { width: cardWidth, backgroundColor: theme.surfaceColor }]}>
            <ShimmerBox aspectRatio={1} borderRadius={8} style={{ marginBottom: 8 }} />
            <ShimmerBox width="40%" height={12} borderRadius={4} style={{ marginBottom: 4 }} />
            <ShimmerBox width="80%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
            <ShimmerBox width="50%" height={20} borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );
};

// ============ SEARCH PAGE SKELETON ============
export const SearchPageSkeleton: React.FC<{ isDesktop?: boolean }> = ({ isDesktop = false }) => {
  const theme = useShimmerTheme();
  
  if (!isDesktop) {
    return (
      <View style={[skeletonBase.container, { backgroundColor: theme.backgroundColor }]}>
        {/* Search header */}
        <ShimmerBox height={48} borderRadius={8} style={{ marginBottom: 16 }} />
        
        {/* Results count */}
        <ShimmerBox width={120} height={16} borderRadius={4} style={{ marginBottom: 16 }} />
        
        {/* Result items */}
        {Array(4).fill(0).map((_, i) => (
          <View key={i} style={[searchSkeleton.resultItem, { backgroundColor: theme.surfaceColor }]}>
            <ShimmerBox width={100} height={100} borderRadius={8} />
            <View style={searchSkeleton.resultContent}>
              <ShimmerBox width="60%" height={18} borderRadius={4} />
              <ShimmerBox width="40%" height={14} borderRadius={4} />
              <ShimmerBox width="30%" height={20} borderRadius={4} />
            </View>
          </View>
        ))}
      </View>
    );
  }
  
  return (
    <View style={[skeletonBase.container, { backgroundColor: theme.backgroundColor, maxWidth: 1280, alignSelf: 'center' as const, width: '100%' }]}>
      {/* Header */}
      <View style={skeletonBase.header}>
        <ShimmerBox width={100} height={36} borderRadius={4} />
        <ShimmerBox width={500} height={44} borderRadius={22} style={{ marginHorizontal: 24 }} />
        <View style={skeletonBase.headerRight}>
          <ShimmerBox width={120} height={40} borderRadius={8} />
        </View>
      </View>
      
      {/* Main content */}
      <View style={searchSkeleton.desktopLayout}>
        {/* Sidebar */}
        <View style={[searchSkeleton.sidebar, { backgroundColor: theme.surfaceColor }]}>
          <ShimmerBox width="70%" height={20} borderRadius={4} style={{ marginBottom: 12 }} />
          <ShimmerBox height={150} borderRadius={8} style={{ marginBottom: 20 }} />
          <ShimmerBox width="70%" height={20} borderRadius={4} style={{ marginBottom: 12 }} />
          <ShimmerBox height={200} borderRadius={8} style={{ marginBottom: 20 }} />
        </View>
        
        {/* Results grid */}
        <View style={searchSkeleton.resultsArea}>
          <ShimmerBox width={150} height={20} borderRadius={4} style={{ marginBottom: 20 }} />
          <View style={skeletonBase.grid}>
            {Array(6).fill(0).map((_, i) => (
              <View key={i} style={[skeletonBase.card, { width: '31%', backgroundColor: theme.surfaceColor }]}>
                <ShimmerBox aspectRatio={1} borderRadius={8} style={{ marginBottom: 8 }} />
                <ShimmerBox width="40%" height={12} borderRadius={4} style={{ marginBottom: 4 }} />
                <ShimmerBox width="80%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
                <ShimmerBox width="50%" height={20} borderRadius={4} />
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

// ============ SETTINGS PAGE SKELETON ============
export const SettingsSkeleton: React.FC<{ isDesktop?: boolean }> = ({ isDesktop = false }) => {
  const theme = useShimmerTheme();
  
  const SettingsRow = () => (
    <View style={settingsSkeleton.row}>
      <ShimmerBox width={24} height={24} borderRadius={12} />
      <View style={settingsSkeleton.rowContent}>
        <ShimmerBox width="50%" height={16} borderRadius={4} />
        <ShimmerBox width="30%" height={12} borderRadius={4} />
      </View>
      <ShimmerBox width={50} height={28} borderRadius={14} />
    </View>
  );
  
  if (!isDesktop) {
    return (
      <View style={[skeletonBase.container, { backgroundColor: theme.backgroundColor }]}>
        {/* Header */}
        <View style={settingsSkeleton.mobileHeader}>
          <ShimmerBox width={24} height={24} borderRadius={4} />
          <ShimmerBox width={100} height={20} borderRadius={4} />
          <View style={{ width: 24 }} />
        </View>
        
        {/* Settings sections */}
        {Array(3).fill(0).map((_, section) => (
          <View key={section} style={settingsSkeleton.section}>
            <ShimmerBox width={120} height={16} borderRadius={4} style={{ marginBottom: 12, marginLeft: 16 }} />
            <View style={[settingsSkeleton.sectionContent, { backgroundColor: theme.surfaceColor }]}>
              {Array(4).fill(0).map((_, i) => <SettingsRow key={i} />)}
            </View>
          </View>
        ))}
      </View>
    );
  }
  
  return (
    <View style={[skeletonBase.container, { backgroundColor: theme.backgroundColor, maxWidth: 1280, alignSelf: 'center' as const, width: '100%' }]}>
      {/* Header */}
      <View style={skeletonBase.header}>
        <ShimmerBox width={100} height={36} borderRadius={4} />
        <View style={skeletonBase.headerRight}>
          <ShimmerBox width={120} height={40} borderRadius={8} />
        </View>
      </View>
      
      {/* Main content */}
      <View style={settingsSkeleton.desktopLayout}>
        {/* Sidebar */}
        <View style={[settingsSkeleton.desktopSidebar, { backgroundColor: theme.surfaceColor }]}>
          <ShimmerBox width="80%" height={24} borderRadius={4} style={{ marginBottom: 20 }} />
          {Array(6).fill(0).map((_, i) => (
            <ShimmerBox key={i} height={44} borderRadius={8} style={{ marginBottom: 8 }} />
          ))}
        </View>
        
        {/* Content */}
        <View style={settingsSkeleton.desktopContent}>
          <View style={[settingsSkeleton.desktopCard, { backgroundColor: theme.surfaceColor }]}>
            <ShimmerBox width={200} height={24} borderRadius={4} style={{ marginBottom: 8 }} />
            <ShimmerBox width="60%" height={16} borderRadius={4} style={{ marginBottom: 24 }} />
            {Array(5).fill(0).map((_, i) => <SettingsRow key={i} />)}
          </View>
        </View>
      </View>
    </View>
  );
};

// ============ MESSAGES PAGE SKELETON ============
export const MessagesSkeleton: React.FC<{ isDesktop?: boolean }> = ({ isDesktop = false }) => {
  const theme = useShimmerTheme();
  
  const MessageItem = () => (
    <View style={[messagesSkeleton.item, { backgroundColor: theme.surfaceColor }]}>
      <ShimmerBox width={50} height={50} borderRadius={25} />
      <View style={messagesSkeleton.content}>
        <ShimmerBox width="50%" height={16} borderRadius={4} />
        <ShimmerBox width="80%" height={14} borderRadius={4} />
      </View>
      <ShimmerBox width={40} height={12} borderRadius={4} />
    </View>
  );
  
  return (
    <View style={[skeletonBase.container, { backgroundColor: theme.backgroundColor }]}>
      {/* Header */}
      <View style={settingsSkeleton.mobileHeader}>
        <ShimmerBox width={24} height={24} borderRadius={4} />
        <ShimmerBox width={100} height={20} borderRadius={4} />
        <ShimmerBox width={24} height={24} borderRadius={4} />
      </View>
      
      {/* Search bar */}
      <ShimmerBox height={44} borderRadius={22} style={{ marginBottom: 16 }} />
      
      {/* Tabs */}
      <View style={messagesSkeleton.tabs}>
        <ShimmerBox height={40} borderRadius={8} style={{ flex: 1 }} />
        <ShimmerBox height={40} borderRadius={8} style={{ flex: 1 }} />
      </View>
      
      {/* Message list */}
      {Array(6).fill(0).map((_, i) => <MessageItem key={i} />)}
    </View>
  );
};

// ============ PROFILE PAGE SKELETON ============
export const ProfileSkeleton: React.FC<{ isDesktop?: boolean }> = ({ isDesktop = false }) => {
  const theme = useShimmerTheme();
  
  return (
    <View style={[skeletonBase.container, { backgroundColor: theme.backgroundColor }]}>
      {/* Profile header */}
      <View style={[profileSkeleton.header, { backgroundColor: theme.surfaceColor }]}>
        <ShimmerBox width={80} height={80} borderRadius={40} />
        <ShimmerBox width={150} height={24} borderRadius={4} />
        <ShimmerBox width={100} height={16} borderRadius={4} />
        <View style={profileSkeleton.stats}>
          {Array(3).fill(0).map((_, i) => (
            <View key={i} style={profileSkeleton.statItem}>
              <ShimmerBox width={40} height={24} borderRadius={4} />
              <ShimmerBox width={60} height={12} borderRadius={4} />
            </View>
          ))}
        </View>
      </View>
      
      {/* Menu items */}
      <View style={[profileSkeleton.menu, { backgroundColor: theme.surfaceColor }]}>
        {Array(6).fill(0).map((_, i) => (
          <View key={i} style={profileSkeleton.menuItem}>
            <ShimmerBox width={24} height={24} borderRadius={4} />
            <ShimmerBox height={18} borderRadius={4} style={{ flex: 1, marginLeft: 12 }} />
            <ShimmerBox width={20} height={20} borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );
};

// ============ LISTING DETAIL SKELETON ============
export const ListingDetailSkeleton: React.FC<{ isDesktop?: boolean }> = ({ isDesktop = false }) => {
  const opacity = useShimmer();
  
  return (
    <View style={skeletonBase.container}>
      {/* Image carousel */}
      <Animated.View style={[listingSkeleton.mainImage, { opacity }]} />
      
      {/* Price and title */}
      <View style={listingSkeleton.infoSection}>
        <Animated.View style={[{ width: 120, height: 32, backgroundColor: COLORS.skeleton, borderRadius: 4 }, { opacity }]} />
        <Animated.View style={[{ width: '90%', height: 24, backgroundColor: COLORS.skeleton, borderRadius: 4 }, { opacity }]} />
        <Animated.View style={[{ width: '60%', height: 16, backgroundColor: COLORS.skeleton, borderRadius: 4 }, { opacity }]} />
      </View>
      
      {/* Seller info */}
      <View style={listingSkeleton.sellerSection}>
        <Animated.View style={[listingSkeleton.sellerAvatar, { opacity }]} />
        <View style={{ flex: 1, gap: 4 }}>
          <Animated.View style={[{ width: '50%', height: 18, backgroundColor: COLORS.skeleton, borderRadius: 4 }, { opacity }]} />
          <Animated.View style={[{ width: '30%', height: 14, backgroundColor: COLORS.skeleton, borderRadius: 4 }, { opacity }]} />
        </View>
      </View>
      
      {/* Description */}
      <View style={listingSkeleton.descSection}>
        <Animated.View style={[{ width: 100, height: 20, backgroundColor: COLORS.skeleton, borderRadius: 4, marginBottom: 12 }, { opacity }]} />
        <Animated.View style={[{ width: '100%', height: 14, backgroundColor: COLORS.skeleton, borderRadius: 4 }, { opacity }]} />
        <Animated.View style={[{ width: '100%', height: 14, backgroundColor: COLORS.skeleton, borderRadius: 4 }, { opacity }]} />
        <Animated.View style={[{ width: '70%', height: 14, backgroundColor: COLORS.skeleton, borderRadius: 4 }, { opacity }]} />
      </View>
      
      {/* Action buttons */}
      <View style={listingSkeleton.actions}>
        <Animated.View style={[listingSkeleton.actionBtn, { opacity }]} />
        <Animated.View style={[listingSkeleton.actionBtnPrimary, { opacity }]} />
      </View>
    </View>
  );
};

// ============ STYLES ============
const skeletonBase = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingVertical: 8 },
  logo: { width: 100, height: 36, backgroundColor: COLORS.skeleton, borderRadius: 4 },
  headerRight: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  textBtn: { width: 60, height: 36, backgroundColor: COLORS.skeleton, borderRadius: 8 },
  primaryBtn: { width: 120, height: 40, backgroundColor: COLORS.skeleton, borderRadius: 8 },
  searchRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  searchBar: { flex: 1, height: 48, backgroundColor: COLORS.skeleton, borderRadius: 24 },
  locationChip: { width: 150, height: 48, backgroundColor: COLORS.skeleton, borderRadius: 24 },
  categories: { flexDirection: 'row', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  categoryPill: { width: 100, height: 40, backgroundColor: COLORS.skeleton, borderRadius: 20 },
  sectionTitle: { width: 150, height: 22, backgroundColor: COLORS.skeleton, borderRadius: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 8, marginBottom: 8 },
  cardImage: { width: '100%', aspectRatio: 1, backgroundColor: COLORS.skeleton, borderRadius: 8, marginBottom: 8 },
  cardLocation: { width: '40%', height: 12, backgroundColor: COLORS.skeleton, borderRadius: 4, marginBottom: 4 },
  cardTitle: { width: '80%', height: 16, backgroundColor: COLORS.skeleton, borderRadius: 4, marginBottom: 6 },
  cardPrice: { width: '50%', height: 20, backgroundColor: COLORS.skeleton, borderRadius: 4 },
});

const searchSkeleton = StyleSheet.create({
  mobileSearchBar: { height: 48, backgroundColor: COLORS.skeleton, borderRadius: 8, marginBottom: 16 },
  desktopSearchBar: { flex: 1, maxWidth: 500, height: 44, backgroundColor: COLORS.skeleton, borderRadius: 22, marginHorizontal: 24 },
  desktopLayout: { flexDirection: 'row', gap: 24 },
  sidebar: { width: 280, backgroundColor: COLORS.surface, borderRadius: 12, padding: 16 },
  sidebarSection: { width: '70%', height: 20, backgroundColor: COLORS.skeleton, borderRadius: 4, marginBottom: 12 },
  sidebarList: { width: '100%', height: 150, backgroundColor: COLORS.skeleton, borderRadius: 8, marginBottom: 20 },
  resultsArea: { flex: 1 },
  resultItem: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, marginBottom: 12, gap: 12 },
  resultImage: { width: 100, height: 100, backgroundColor: COLORS.skeleton, borderRadius: 8 },
  resultContent: { flex: 1, gap: 8, justifyContent: 'center' },
});

const settingsSkeleton = StyleSheet.create({
  mobileHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingVertical: 8 },
  section: { marginBottom: 24 },
  sectionTitle: { width: 120, height: 16, backgroundColor: COLORS.skeleton, borderRadius: 4, marginBottom: 12, marginLeft: 16 },
  sectionContent: { backgroundColor: COLORS.surface, borderRadius: 12 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rowIcon: { width: 24, height: 24, backgroundColor: COLORS.skeleton, borderRadius: 12 },
  rowContent: { flex: 1, gap: 4 },
  toggle: { width: 50, height: 28, backgroundColor: COLORS.skeleton, borderRadius: 14 },
  desktopLayout: { flexDirection: 'row', gap: 24 },
  desktopSidebar: { width: 280, backgroundColor: COLORS.surface, borderRadius: 12, padding: 20 },
  desktopNavItem: { width: '100%', height: 44, backgroundColor: COLORS.skeleton, borderRadius: 8, marginBottom: 8 },
  desktopContent: { flex: 1 },
  desktopCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 24 },
});

const messagesSkeleton = StyleSheet.create({
  searchBar: { height: 44, backgroundColor: COLORS.skeleton, borderRadius: 22, marginBottom: 16 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { flex: 1, height: 40, backgroundColor: COLORS.skeleton, borderRadius: 8 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: COLORS.surface, borderRadius: 12, marginBottom: 8, gap: 12 },
  avatar: { width: 50, height: 50, backgroundColor: COLORS.skeleton, borderRadius: 25 },
  content: { flex: 1, gap: 6 },
});

const profileSkeleton = StyleSheet.create({
  header: { alignItems: 'center', paddingVertical: 24, backgroundColor: COLORS.surface, borderRadius: 12, marginBottom: 16, gap: 8 },
  avatar: { width: 80, height: 80, backgroundColor: COLORS.skeleton, borderRadius: 40 },
  stats: { flexDirection: 'row', gap: 32, marginTop: 16 },
  statItem: { alignItems: 'center', gap: 4 },
  menu: { backgroundColor: COLORS.surface, borderRadius: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
});

const listingSkeleton = StyleSheet.create({
  mainImage: { width: '100%', aspectRatio: 1, backgroundColor: COLORS.skeleton, borderRadius: 0 },
  infoSection: { padding: 16, gap: 8 },
  sellerSection: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: COLORS.surface, marginHorizontal: 16, borderRadius: 12, gap: 12 },
  sellerAvatar: { width: 48, height: 48, backgroundColor: COLORS.skeleton, borderRadius: 24 },
  descSection: { padding: 16, gap: 8 },
  actions: { flexDirection: 'row', padding: 16, gap: 12 },
  actionBtn: { flex: 1, height: 48, backgroundColor: COLORS.skeleton, borderRadius: 8 },
  actionBtnPrimary: { flex: 2, height: 48, backgroundColor: COLORS.skeleton, borderRadius: 8 },
});

export default {
  HomepageSkeleton,
  SearchPageSkeleton,
  SettingsSkeleton,
  MessagesSkeleton,
  ProfileSkeleton,
  ListingDetailSkeleton,
};
