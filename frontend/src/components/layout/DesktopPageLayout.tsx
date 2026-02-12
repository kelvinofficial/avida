import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DesktopHeader } from './DesktopHeader';
import { Footer } from './Footer';
import { useResponsive } from '../../hooks/useResponsive';
import { useAuthStore } from '../../store/authStore';

const MAX_WIDTH = 1280;

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
};

interface SidebarLink {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  badge?: number;
}

const SIDEBAR_LINKS: SidebarLink[] = [
  { id: 'saved', label: 'Saved Items', icon: 'heart-outline', route: '/profile/saved' },
  { id: 'my-listings', label: 'My Listings', icon: 'list-outline', route: '/profile/my-listings' },
  { id: 'offers', label: 'Offers', icon: 'pricetag-outline', route: '/offers' },
  { id: 'messages', label: 'Messages', icon: 'chatbubbles-outline', route: '/messages' },
  { id: 'purchases', label: 'Purchases', icon: 'bag-outline', route: '/profile/purchases' },
  { id: 'sales', label: 'Sales', icon: 'cash-outline', route: '/profile/sales' },
  { id: 'invoices', label: 'Invoices', icon: 'receipt-outline', route: '/profile/invoices' },
  { id: 'recently-viewed', label: 'Recently Viewed', icon: 'time-outline', route: '/profile/recently-viewed' },
  { id: 'divider1', label: '', icon: 'remove', route: '' },
  { id: 'badges', label: 'Badges', icon: 'ribbon-outline', route: '/profile/badges' },
  { id: 'credits', label: 'Credits', icon: 'wallet-outline', route: '/credits' },
  { id: 'boost', label: 'Boost Listings', icon: 'rocket-outline', route: '/boost' },
  { id: 'divider2', label: '', icon: 'remove', route: '' },
  { id: 'business', label: 'Business Profile', icon: 'storefront-outline', route: '/business/edit' },
  { id: 'settings', label: 'Settings', icon: 'settings-outline', route: '/settings' },
];

interface DesktopPageLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  showSidebar?: boolean;
  rightAction?: React.ReactNode;
  headerContent?: React.ReactNode;
}

export const DesktopPageLayout: React.FC<DesktopPageLayoutProps> = ({
  children,
  title,
  subtitle,
  icon,
  showSidebar = true,
  rightAction,
  headerContent,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isDesktop, isTablet } = useResponsive();
  const { isAuthenticated } = useAuthStore();
  const isLargeScreen = isDesktop || isTablet;

  const renderSidebar = () => (
    <View style={styles.sidebar}>
      <View style={styles.sidebarContent}>
        {SIDEBAR_LINKS.map((link) => {
          if (link.id.startsWith('divider')) {
            return <View key={link.id} style={styles.sidebarDivider} />;
          }
          
          const isActive = pathname === link.route || 
            (link.route !== '/' && pathname.startsWith(link.route));
          
          return (
            <TouchableOpacity
              key={link.id}
              style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
              onPress={() => router.push(link.route as any)}
              data-testid={`sidebar-${link.id}`}
            >
              <Ionicons
                name={link.icon}
                size={20}
                color={isActive ? COLORS.primary : COLORS.textSecondary}
              />
              <Text style={[styles.sidebarItemText, isActive && styles.sidebarItemTextActive]}>
                {link.label}
              </Text>
              {link.badge && link.badge > 0 && (
                <View style={styles.sidebarBadge}>
                  <Text style={styles.sidebarBadgeText}>{link.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  if (!isLargeScreen) {
    // Mobile layout - no sidebar, simple header
    return (
      <SafeAreaView style={styles.mobileContainer} edges={['top']}>
        {/* Mobile Header */}
        <View style={styles.mobileHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.mobileBackBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.mobileHeaderCenter}>
            {icon && <Ionicons name={icon} size={22} color={COLORS.primary} style={{ marginRight: 8 }} />}
            <Text style={styles.mobileHeaderTitle}>{title}</Text>
          </View>
          {rightAction || <View style={{ width: 40 }} />}
        </View>
        
        {/* Mobile Content */}
        <View style={styles.mobileContent}>
          {children}
        </View>
      </SafeAreaView>
    );
  }

  // Desktop layout with header and sidebar
  return (
    <View style={styles.desktopContainer}>
      {/* Desktop Header */}
      <DesktopHeader showNavLinks showSearch />
      
      {/* Main Content Area */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageWrapper}>
          {/* Sidebar + Content Row */}
          <View style={styles.contentRow}>
            {/* Sidebar */}
            {showSidebar && renderSidebar()}
            
            {/* Main Content */}
            <View style={[styles.mainContent, !showSidebar && styles.mainContentFull]}>
              {/* Page Header */}
              <View style={styles.pageHeader}>
                <View style={styles.pageHeaderLeft}>
                  {icon && (
                    <View style={styles.pageHeaderIcon}>
                      <Ionicons name={icon} size={24} color={COLORS.primary} />
                    </View>
                  )}
                  <View>
                    <Text style={styles.pageTitle}>{title}</Text>
                    {subtitle && <Text style={styles.pageSubtitle}>{subtitle}</Text>}
                  </View>
                </View>
                {rightAction && <View style={styles.pageHeaderRight}>{rightAction}</View>}
              </View>
              
              {/* Optional Header Content (filters, tabs, etc.) */}
              {headerContent && (
                <View style={styles.headerContent}>{headerContent}</View>
              )}
              
              {/* Page Content */}
              <View style={styles.pageContent}>
                {children}
              </View>
            </View>
          </View>
        </View>
        
        {/* Footer */}
        <Footer />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // Desktop Styles
  desktopContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  pageWrapper: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
    minHeight: 600,
  },
  contentRow: {
    flexDirection: 'row',
    gap: 24,
  },
  
  // Sidebar
  sidebar: {
    width: 240,
    flexShrink: 0,
  },
  sidebarContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 8,
    ...(Platform.OS === 'web' ? {
      position: 'sticky' as any,
      top: 24,
    } : {}),
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
    marginHorizontal: 8,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 12,
  },
  sidebarItemActive: {
    backgroundColor: COLORS.primaryLight,
  },
  sidebarItemText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  sidebarItemTextActive: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  sidebarBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  sidebarBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  
  // Main Content
  mainContent: {
    flex: 1,
    minWidth: 0,
  },
  mainContentFull: {
    maxWidth: '100%',
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
  },
  pageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  pageHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageHeaderRight: {},
  pageTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text,
  },
  pageSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerContent: {
    marginBottom: 24,
  },
  pageContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 24,
    minHeight: 400,
  },
  
  // Mobile Styles
  mobileContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  mobileBackBtn: {
    padding: 8,
  },
  mobileHeaderCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mobileHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  mobileContent: {
    flex: 1,
  },
});

export default DesktopPageLayout;
