import React, { memo, createContext, useContext, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============ THEME CONTEXT (Simplified - No Animation) ============
interface PlaceholderTheme {
  baseColor: string;
  backgroundColor: string;
  surfaceColor: string;
}

const defaultTheme: PlaceholderTheme = {
  baseColor: '#E8E8E8',
  backgroundColor: '#F5F5F5',
  surfaceColor: '#FFFFFF',
};

const PlaceholderThemeContext = createContext<PlaceholderTheme>(defaultTheme);

// Export provider for customization
export const ShimmerThemeProvider: React.FC<{
  children: React.ReactNode;
  theme?: Partial<PlaceholderTheme>;
}> = ({ children, theme }) => {
  const mergedTheme = useMemo(() => ({ ...defaultTheme, ...theme }), [theme]);
  return (
    <PlaceholderThemeContext.Provider value={mergedTheme}>
      {children}
    </PlaceholderThemeContext.Provider>
  );
};

export const useShimmerTheme = () => useContext(PlaceholderThemeContext);

// Legacy COLORS object for backward compatibility
const COLORS = {
  skeleton: '#E8E8E8',
  skeletonLight: '#F5F5F5',
  background: '#F5F5F5',
  surface: '#FFFFFF',
};

// ============ PLACEHOLDER BOX (Static - No Animation) ============
interface PlaceholderBoxProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: any;
  aspectRatio?: number;
}

/**
 * PlaceholderBox - ZERO LOADER VERSION
 * Static placeholder without any shimmer animation
 */
const PlaceholderBox: React.FC<PlaceholderBoxProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  aspectRatio,
}) => {
  const theme = useShimmerTheme();
  
  return (
    <View
      style={[
        {
          width,
          height: aspectRatio ? undefined : height,
          aspectRatio,
          borderRadius,
          backgroundColor: theme.baseColor,
        },
        style,
      ]}
    />
  );
};

// Alias for backward compatibility
const ShimmerBox = PlaceholderBox;

// ============ HOMEPAGE SKELETON (Static) ============
export const HomepageSkeleton: React.FC<{ isDesktop?: boolean }> = ({ isDesktop = false }) => {
  const theme = useShimmerTheme();
  
  const cardCount = isDesktop ? 8 : 4;
  const cardWidth = isDesktop ? '23%' : '48%';
  
  return (
    <View style={[skeletonBase.container, { backgroundColor: theme.backgroundColor }, isDesktop && { maxWidth: 1280, alignSelf: 'center' as const, width: '100%' }]}>
      <View style={skeletonBase.header}>
        <PlaceholderBox width={100} height={36} borderRadius={4} />
        <View style={skeletonBase.headerRight}>
          <PlaceholderBox width={60} height={36} borderRadius={8} />
          <PlaceholderBox width={60} height={36} borderRadius={8} />
          <PlaceholderBox width={120} height={40} borderRadius={8} />
        </View>
      </View>
      
      <View style={skeletonBase.searchRow}>
        <PlaceholderBox height={48} borderRadius={24} style={{ flex: 1 }} />
        <PlaceholderBox width={150} height={48} borderRadius={24} />
      </View>
      
      <View style={skeletonBase.categories}>
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <PlaceholderBox key={i} width={100} height={40} borderRadius={20} />
        ))}
      </View>
      
      <PlaceholderBox width={150} height={22} borderRadius={4} style={{ marginBottom: 16 }} />
      
      <View style={skeletonBase.grid}>
        {Array(cardCount).fill(0).map((_, i) => (
          <View key={i} style={[skeletonBase.card, { width: cardWidth, backgroundColor: theme.surfaceColor }]}>
            <PlaceholderBox aspectRatio={1} borderRadius={8} style={{ marginBottom: 8 }} />
            <PlaceholderBox width="40%" height={12} borderRadius={4} style={{ marginBottom: 4 }} />
            <PlaceholderBox width="80%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
            <PlaceholderBox width="50%" height={20} borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );
};

// ============ SEARCH PAGE SKELETON (Static) ============
export const SearchPageSkeleton: React.FC<{ isDesktop?: boolean }> = ({ isDesktop = false }) => {
  const theme = useShimmerTheme();
  
  if (!isDesktop) {
    return (
      <View style={[skeletonBase.container, { backgroundColor: theme.backgroundColor }]}>
        <PlaceholderBox height={48} borderRadius={8} style={{ marginBottom: 16 }} />
        <PlaceholderBox width={120} height={16} borderRadius={4} style={{ marginBottom: 16 }} />
        {Array(4).fill(0).map((_, i) => (
          <View key={i} style={[searchSkeleton.resultItem, { backgroundColor: theme.surfaceColor }]}>
            <PlaceholderBox width={100} height={100} borderRadius={8} />
            <View style={searchSkeleton.resultContent}>
              <PlaceholderBox width="60%" height={18} borderRadius={4} />
              <PlaceholderBox width="40%" height={14} borderRadius={4} />
              <PlaceholderBox width="30%" height={20} borderRadius={4} />
            </View>
          </View>
        ))}
      </View>
    );
  }
  
  return (
    <View style={[skeletonBase.container, { backgroundColor: theme.backgroundColor, maxWidth: 1280, alignSelf: 'center' as const, width: '100%' }]}>
      <View style={skeletonBase.header}>
        <PlaceholderBox width={100} height={36} borderRadius={4} />
        <PlaceholderBox width={500} height={44} borderRadius={22} style={{ marginHorizontal: 24 }} />
        <View style={skeletonBase.headerRight}>
          <PlaceholderBox width={120} height={40} borderRadius={8} />
        </View>
      </View>
      
      <View style={searchSkeleton.desktopLayout}>
        <View style={[searchSkeleton.sidebar, { backgroundColor: theme.surfaceColor }]}>
          <PlaceholderBox width="70%" height={20} borderRadius={4} style={{ marginBottom: 12 }} />
          <PlaceholderBox height={150} borderRadius={8} style={{ marginBottom: 20 }} />
          <PlaceholderBox width="70%" height={20} borderRadius={4} style={{ marginBottom: 12 }} />
          <PlaceholderBox height={200} borderRadius={8} style={{ marginBottom: 20 }} />
        </View>
        
        <View style={searchSkeleton.resultsArea}>
          <PlaceholderBox width={150} height={20} borderRadius={4} style={{ marginBottom: 20 }} />
          <View style={skeletonBase.grid}>
            {Array(6).fill(0).map((_, i) => (
              <View key={i} style={[skeletonBase.card, { width: '31%', backgroundColor: theme.surfaceColor }]}>
                <PlaceholderBox aspectRatio={1} borderRadius={8} style={{ marginBottom: 8 }} />
                <PlaceholderBox width="40%" height={12} borderRadius={4} style={{ marginBottom: 4 }} />
                <PlaceholderBox width="80%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
                <PlaceholderBox width="50%" height={20} borderRadius={4} />
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

// ============ SETTINGS PAGE SKELETON (Static) ============
export const SettingsSkeleton: React.FC<{ isDesktop?: boolean }> = ({ isDesktop = false }) => {
  const theme = useShimmerTheme();
  
  const SettingsRow = () => (
    <View style={settingsSkeleton.row}>
      <PlaceholderBox width={24} height={24} borderRadius={12} />
      <View style={settingsSkeleton.rowContent}>
        <PlaceholderBox width="50%" height={16} borderRadius={4} />
        <PlaceholderBox width="30%" height={12} borderRadius={4} />
      </View>
      <PlaceholderBox width={50} height={28} borderRadius={14} />
    </View>
  );
  
  if (!isDesktop) {
    return (
      <View style={[skeletonBase.container, { backgroundColor: theme.backgroundColor }]}>
        <View style={settingsSkeleton.mobileHeader}>
          <PlaceholderBox width={24} height={24} borderRadius={4} />
          <PlaceholderBox width={100} height={20} borderRadius={4} />
          <View style={{ width: 24 }} />
        </View>
        
        {Array(3).fill(0).map((_, section) => (
          <View key={section} style={settingsSkeleton.section}>
            <PlaceholderBox width={120} height={16} borderRadius={4} style={{ marginBottom: 12, marginLeft: 16 }} />
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
      <View style={skeletonBase.header}>
        <PlaceholderBox width={100} height={36} borderRadius={4} />
        <View style={skeletonBase.headerRight}>
          <PlaceholderBox width={120} height={40} borderRadius={8} />
        </View>
      </View>
      
      <View style={settingsSkeleton.desktopLayout}>
        <View style={[settingsSkeleton.desktopSidebar, { backgroundColor: theme.surfaceColor }]}>
          <PlaceholderBox width="80%" height={24} borderRadius={4} style={{ marginBottom: 20 }} />
          {Array(6).fill(0).map((_, i) => (
            <PlaceholderBox key={i} height={44} borderRadius={8} style={{ marginBottom: 8 }} />
          ))}
        </View>
        
        <View style={settingsSkeleton.desktopContent}>
          <View style={[settingsSkeleton.desktopCard, { backgroundColor: theme.surfaceColor }]}>
            <PlaceholderBox width={200} height={24} borderRadius={4} style={{ marginBottom: 8 }} />
            <PlaceholderBox width="60%" height={16} borderRadius={4} style={{ marginBottom: 24 }} />
            {Array(5).fill(0).map((_, i) => <SettingsRow key={i} />)}
          </View>
        </View>
      </View>
    </View>
  );
};

// ============ MESSAGES PAGE SKELETON (Static) ============
export const MessagesSkeleton: React.FC<{ isDesktop?: boolean }> = ({ isDesktop = false }) => {
  const theme = useShimmerTheme();
  
  const MessageItem = () => (
    <View style={[messagesSkeleton.item, { backgroundColor: theme.surfaceColor }]}>
      <PlaceholderBox width={50} height={50} borderRadius={25} />
      <View style={messagesSkeleton.content}>
        <PlaceholderBox width="50%" height={16} borderRadius={4} />
        <PlaceholderBox width="80%" height={14} borderRadius={4} />
      </View>
      <PlaceholderBox width={40} height={12} borderRadius={4} />
    </View>
  );
  
  return (
    <View style={[skeletonBase.container, { backgroundColor: theme.backgroundColor }]}>
      <View style={settingsSkeleton.mobileHeader}>
        <PlaceholderBox width={24} height={24} borderRadius={4} />
        <PlaceholderBox width={100} height={20} borderRadius={4} />
        <PlaceholderBox width={24} height={24} borderRadius={4} />
      </View>
      
      <PlaceholderBox height={44} borderRadius={22} style={{ marginBottom: 16 }} />
      
      <View style={messagesSkeleton.tabs}>
        <PlaceholderBox height={40} borderRadius={8} style={{ flex: 1 }} />
        <PlaceholderBox height={40} borderRadius={8} style={{ flex: 1 }} />
      </View>
      
      {Array(6).fill(0).map((_, i) => <MessageItem key={i} />)}
    </View>
  );
};

// ============ PROFILE PAGE SKELETON (Static) ============
export const ProfileSkeleton: React.FC<{ isDesktop?: boolean }> = ({ isDesktop = false }) => {
  const theme = useShimmerTheme();
  
  return (
    <View style={[skeletonBase.container, { backgroundColor: theme.backgroundColor }]}>
      <View style={[profileSkeleton.header, { backgroundColor: theme.surfaceColor }]}>
        <PlaceholderBox width={80} height={80} borderRadius={40} />
        <PlaceholderBox width={150} height={24} borderRadius={4} />
        <PlaceholderBox width={100} height={16} borderRadius={4} />
        <View style={profileSkeleton.stats}>
          {Array(3).fill(0).map((_, i) => (
            <View key={i} style={profileSkeleton.statItem}>
              <PlaceholderBox width={40} height={24} borderRadius={4} />
              <PlaceholderBox width={60} height={12} borderRadius={4} />
            </View>
          ))}
        </View>
      </View>
      
      <View style={[profileSkeleton.menu, { backgroundColor: theme.surfaceColor }]}>
        {Array(6).fill(0).map((_, i) => (
          <View key={i} style={profileSkeleton.menuItem}>
            <PlaceholderBox width={24} height={24} borderRadius={4} />
            <PlaceholderBox height={18} borderRadius={4} style={{ flex: 1, marginLeft: 12 }} />
            <PlaceholderBox width={20} height={20} borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );
};

// ============ LISTING DETAIL SKELETON (Static) ============
export const ListingDetailSkeleton: React.FC<{ isDesktop?: boolean }> = ({ isDesktop = false }) => {
  const theme = useShimmerTheme();
  
  return (
    <View style={[skeletonBase.container, { backgroundColor: theme.backgroundColor, padding: 0 }]}>
      <PlaceholderBox aspectRatio={1} borderRadius={0} />
      
      <View style={listingSkeleton.infoSection}>
        <PlaceholderBox width={120} height={32} borderRadius={4} />
        <PlaceholderBox width="90%" height={24} borderRadius={4} />
        <PlaceholderBox width="60%" height={16} borderRadius={4} />
      </View>
      
      <View style={[listingSkeleton.sellerSection, { backgroundColor: theme.surfaceColor }]}>
        <PlaceholderBox width={48} height={48} borderRadius={24} />
        <View style={{ flex: 1, gap: 4 }}>
          <PlaceholderBox width="50%" height={18} borderRadius={4} />
          <PlaceholderBox width="30%" height={14} borderRadius={4} />
        </View>
      </View>
      
      <View style={listingSkeleton.descSection}>
        <PlaceholderBox width={100} height={20} borderRadius={4} style={{ marginBottom: 12 }} />
        <PlaceholderBox height={14} borderRadius={4} />
        <PlaceholderBox height={14} borderRadius={4} />
        <PlaceholderBox width="70%" height={14} borderRadius={4} />
      </View>
      
      <View style={listingSkeleton.actions}>
        <PlaceholderBox height={48} borderRadius={8} style={{ flex: 1 }} />
        <PlaceholderBox height={48} borderRadius={8} style={{ flex: 2 }} />
      </View>
    </View>
  );
};

// ============ CATEGORY PAGE SKELETON (Static) ============
export const CategoryPageSkeleton: React.FC<{ isDesktop?: boolean }> = ({ isDesktop = false }) => {
  const theme = useShimmerTheme();
  
  const cardCount = isDesktop ? 9 : 6;
  const cardWidth = isDesktop ? '31%' : '48%';
  
  if (!isDesktop) {
    return (
      <View style={[skeletonBase.container, { backgroundColor: theme.backgroundColor }]}>
        <View style={categorySkeleton.mobileHeader}>
          <PlaceholderBox width={24} height={24} borderRadius={4} />
          <PlaceholderBox width={150} height={24} borderRadius={4} />
          <PlaceholderBox width={24} height={24} borderRadius={4} />
        </View>
        
        <View style={categorySkeleton.subcategoryChips}>
          {Array(5).fill(0).map((_, i) => (
            <PlaceholderBox key={i} width={100} height={36} borderRadius={18} />
          ))}
        </View>
        
        <View style={categorySkeleton.filterRow}>
          <PlaceholderBox width={80} height={32} borderRadius={16} />
          <PlaceholderBox width={80} height={32} borderRadius={16} />
          <PlaceholderBox width={80} height={32} borderRadius={16} />
        </View>
        
        <PlaceholderBox width={100} height={16} borderRadius={4} style={{ marginBottom: 16, marginLeft: 4 }} />
        
        <View style={skeletonBase.grid}>
          {Array(cardCount).fill(0).map((_, i) => (
            <View key={i} style={[skeletonBase.card, { width: cardWidth, backgroundColor: theme.surfaceColor }]}>
              <PlaceholderBox aspectRatio={1} borderRadius={8} style={{ marginBottom: 8 }} />
              <PlaceholderBox width="40%" height={12} borderRadius={4} style={{ marginBottom: 4 }} />
              <PlaceholderBox width="80%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
              <PlaceholderBox width="50%" height={20} borderRadius={4} />
            </View>
          ))}
        </View>
      </View>
    );
  }
  
  return (
    <View style={[skeletonBase.container, { backgroundColor: theme.backgroundColor, maxWidth: 1280, alignSelf: 'center' as const, width: '100%' }]}>
      <View style={skeletonBase.header}>
        <PlaceholderBox width={100} height={36} borderRadius={4} />
        <PlaceholderBox width={500} height={44} borderRadius={22} style={{ marginHorizontal: 24 }} />
        <View style={skeletonBase.headerRight}>
          <PlaceholderBox width={120} height={40} borderRadius={8} />
        </View>
      </View>
      
      <View style={categorySkeleton.desktopLayout}>
        <View style={[categorySkeleton.sidebar, { backgroundColor: theme.surfaceColor }]}>
          <PlaceholderBox width={120} height={20} borderRadius={4} style={{ marginBottom: 16 }} />
          {Array(10).fill(0).map((_, i) => (
            <View key={i} style={categorySkeleton.sidebarItem}>
              <PlaceholderBox width={20} height={20} borderRadius={4} />
              <PlaceholderBox width={100} height={16} borderRadius={4} />
            </View>
          ))}
        </View>
        
        <View style={{ flex: 1 }}>
          <View style={categorySkeleton.breadcrumb}>
            <PlaceholderBox width={50} height={14} borderRadius={4} />
            <PlaceholderBox width={80} height={14} borderRadius={4} />
            <PlaceholderBox width={100} height={14} borderRadius={4} />
          </View>
          
          <View style={categorySkeleton.titleRow}>
            <PlaceholderBox width={200} height={28} borderRadius={4} />
            <PlaceholderBox width={100} height={16} borderRadius={4} />
          </View>
          
          <View style={categorySkeleton.subcategoryChips}>
            {Array(8).fill(0).map((_, i) => (
              <PlaceholderBox key={i} width={110} height={36} borderRadius={18} />
            ))}
          </View>
          
          <View style={categorySkeleton.filterBar}>
            <PlaceholderBox width={120} height={40} borderRadius={8} />
            <PlaceholderBox width={120} height={40} borderRadius={8} />
            <PlaceholderBox width={120} height={40} borderRadius={8} />
            <View style={{ flex: 1 }} />
            <PlaceholderBox width={100} height={40} borderRadius={8} />
          </View>
          
          <View style={skeletonBase.grid}>
            {Array(cardCount).fill(0).map((_, i) => (
              <View key={i} style={[skeletonBase.card, { width: cardWidth, backgroundColor: theme.surfaceColor }]}>
                <PlaceholderBox aspectRatio={1} borderRadius={8} style={{ marginBottom: 8 }} />
                <PlaceholderBox width="40%" height={12} borderRadius={4} style={{ marginBottom: 4 }} />
                <PlaceholderBox width="80%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
                <PlaceholderBox width="50%" height={20} borderRadius={4} />
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

// ============ BUSINESS DIRECTORY SKELETON (Static) ============
export const BusinessDirectorySkeleton: React.FC<{ isDesktop?: boolean }> = ({ isDesktop = false }) => {
  const theme = useShimmerTheme();
  
  const cardCount = isDesktop ? 8 : 4;
  
  return (
    <View style={[skeletonBase.container, { backgroundColor: theme.backgroundColor }]}>
      <View style={categorySkeleton.mobileHeader}>
        <PlaceholderBox width={24} height={24} borderRadius={4} />
        <PlaceholderBox width={180} height={24} borderRadius={4} />
        <PlaceholderBox width={24} height={24} borderRadius={4} />
      </View>
      
      <PlaceholderBox height={48} borderRadius={24} style={{ marginBottom: 16 }} />
      
      <View style={categorySkeleton.subcategoryChips}>
        {Array(6).fill(0).map((_, i) => (
          <PlaceholderBox key={i} width={90} height={36} borderRadius={18} />
        ))}
      </View>
      
      <View style={businessSkeleton.grid}>
        {Array(cardCount).fill(0).map((_, i) => (
          <View key={i} style={[businessSkeleton.card, { backgroundColor: theme.surfaceColor }]}>
            <PlaceholderBox height={80} borderRadius={0} />
            
            <View style={businessSkeleton.logoContainer}>
              <PlaceholderBox width={60} height={60} borderRadius={30} />
            </View>
            
            <View style={businessSkeleton.cardContent}>
              <PlaceholderBox width="70%" height={18} borderRadius={4} />
              <PlaceholderBox width="50%" height={14} borderRadius={4} />
              <View style={businessSkeleton.statsRow}>
                <PlaceholderBox width={60} height={12} borderRadius={4} />
                <PlaceholderBox width={60} height={12} borderRadius={4} />
              </View>
              <PlaceholderBox width={80} height={24} borderRadius={12} style={{ alignSelf: 'flex-start' }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// ============ STYLES ============
const skeletonBase = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingVertical: 8 },
  headerRight: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  searchRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  categories: { flexDirection: 'row', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 8, marginBottom: 8 },
});

const searchSkeleton = StyleSheet.create({
  desktopLayout: { flexDirection: 'row', gap: 24 },
  sidebar: { width: 280, backgroundColor: COLORS.surface, borderRadius: 12, padding: 16 },
  resultsArea: { flex: 1 },
  resultItem: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, marginBottom: 12, gap: 12 },
  resultContent: { flex: 1, gap: 8, justifyContent: 'center' },
});

const settingsSkeleton = StyleSheet.create({
  mobileHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingVertical: 8 },
  section: { marginBottom: 24 },
  sectionContent: { backgroundColor: COLORS.surface, borderRadius: 12 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rowContent: { flex: 1, gap: 4 },
  desktopLayout: { flexDirection: 'row', gap: 24 },
  desktopSidebar: { width: 280, backgroundColor: COLORS.surface, borderRadius: 12, padding: 20 },
  desktopContent: { flex: 1 },
  desktopCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 24 },
});

const messagesSkeleton = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: COLORS.surface, borderRadius: 12, marginBottom: 8, gap: 12 },
  content: { flex: 1, gap: 6 },
});

const profileSkeleton = StyleSheet.create({
  header: { alignItems: 'center', paddingVertical: 24, backgroundColor: COLORS.surface, borderRadius: 12, marginBottom: 16, gap: 8 },
  stats: { flexDirection: 'row', gap: 32, marginTop: 16 },
  statItem: { alignItems: 'center', gap: 4 },
  menu: { backgroundColor: COLORS.surface, borderRadius: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
});

const listingSkeleton = StyleSheet.create({
  infoSection: { padding: 16, gap: 8 },
  sellerSection: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: COLORS.surface, marginHorizontal: 16, borderRadius: 12, gap: 12 },
  descSection: { padding: 16, gap: 8 },
  actions: { flexDirection: 'row', padding: 16, gap: 12 },
});

const categorySkeleton = StyleSheet.create({
  mobileHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingVertical: 8 },
  subcategoryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  desktopLayout: { flexDirection: 'row', gap: 24 },
  sidebar: { width: 240, borderRadius: 12, padding: 16 },
  sidebarItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  filterBar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
});

const businessSkeleton = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { width: '48%', borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  logoContainer: { marginTop: -30, marginLeft: 16, marginBottom: 8 },
  cardContent: { padding: 16, paddingTop: 0, gap: 8 },
  statsRow: { flexDirection: 'row', gap: 16, marginVertical: 4 },
});

export default {
  HomepageSkeleton,
  SearchPageSkeleton,
  SettingsSkeleton,
  MessagesSkeleton,
  ProfileSkeleton,
  ListingDetailSkeleton,
  CategoryPageSkeleton,
  BusinessDirectorySkeleton,
  ShimmerThemeProvider,
  useShimmerTheme,
};
