import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { DesktopHeader } from './DesktopHeader';
import { Footer } from './Footer';
import { useAuthStore } from '../../store/authStore';
import api from '../../utils/api';

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
  { id: 'profile', label: 'My Profile', icon: 'person-outline', route: '/profile' },
  { id: 'settings', label: 'Settings', icon: 'settings-outline', route: '/settings' },
];

// Notification Badges Context
interface NotificationBadges {
  unreadMessages: number;
  pendingOffers: number;
}

// Quick Stats Component
interface QuickStats {
  activeListings: number;
  pendingOffers: number;
  totalViews: number;
  creditBalance: number;
}

const QuickStatsCard: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        // Fetch multiple stats in parallel
        const [listingsRes, offersRes, creditsRes] = await Promise.all([
          api.get('/listings/my?page=1&limit=1').catch(() => ({ data: { total: 0 } })),
          api.get('/offers?role=seller').catch(() => ({ data: [] })),
          api.get('/boost/credits/balance').catch(() => ({ data: { balance: 0 } })),
        ]);

        // Count pending offers from seller view
        const offersArray = offersRes.data?.offers || offersRes.data || [];
        const pendingOffers = Array.isArray(offersArray) 
          ? offersArray.filter((offer: any) => offer.status === 'pending').length 
          : 0;

        setStats({
          activeListings: listingsRes.data?.total || listingsRes.data?.length || 0,
          pendingOffers: pendingOffers,
          totalViews: 0, // Will calculate from analytics if available
          creditBalance: creditsRes.data?.balance || 0,
        });
      } catch (error) {
        console.error('Error fetching quick stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  return (
    <View style={quickStatsStyles.container}>
      <Text style={quickStatsStyles.title}>Quick Stats</Text>
      
      {loading ? (
        <View style={quickStatsStyles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      ) : (
        <View style={quickStatsStyles.grid}>
          <TouchableOpacity 
            style={quickStatsStyles.statItem}
            onPress={() => router.push('/profile/my-listings')}
            data-testid="quick-stats-listings"
          >
            <View style={[quickStatsStyles.statIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="list" size={16} color={COLORS.primary} />
            </View>
            <View style={quickStatsStyles.statInfo}>
              <Text style={quickStatsStyles.statValue}>{stats?.activeListings || 0}</Text>
              <Text style={quickStatsStyles.statLabel}>Listings</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={quickStatsStyles.statItem}
            onPress={() => router.push('/offers')}
            data-testid="quick-stats-offers"
          >
            <View style={[quickStatsStyles.statIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="pricetag" size={16} color="#F57C00" />
            </View>
            <View style={quickStatsStyles.statInfo}>
              <Text style={quickStatsStyles.statValue}>{stats?.pendingOffers || 0}</Text>
              <Text style={quickStatsStyles.statLabel}>Offers</Text>
            </View>
            {(stats?.pendingOffers || 0) > 0 && (
              <View style={quickStatsStyles.alertDot} />
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={quickStatsStyles.statItem}
            onPress={() => router.push('/credits')}
            data-testid="quick-stats-credits"
          >
            <View style={[quickStatsStyles.statIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="wallet" size={16} color="#1976D2" />
            </View>
            <View style={quickStatsStyles.statInfo}>
              <Text style={quickStatsStyles.statValue}>{stats?.creditBalance || 0}</Text>
              <Text style={quickStatsStyles.statLabel}>Credits</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const quickStatsStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  grid: {
    gap: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    position: 'relative',
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  alertDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
});

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
  const { isAuthenticated } = useAuthStore();
  const [badges, setBadges] = useState<NotificationBadges>({ unreadMessages: 0, pendingOffers: 0 });

  // Fetch notification badges for authenticated users
  useEffect(() => {
    if (!isAuthenticated) {
      setBadges({ unreadMessages: 0, pendingOffers: 0 });
      return;
    }

    const fetchBadges = async () => {
      try {
        const [conversationsRes, offersRes] = await Promise.all([
          api.get('/conversations').catch(() => ({ data: [] })),
          api.get('/offers?role=seller').catch(() => ({ data: { offers: [] } })),
        ]);

        // Calculate total unread messages
        const conversations = Array.isArray(conversationsRes.data) ? conversationsRes.data : [];
        const unreadMessages = conversations.reduce((sum: number, conv: any) => sum + (conv.unread || 0), 0);

        // Count pending offers
        const offersArray = offersRes.data?.offers || offersRes.data || [];
        const pendingOffers = Array.isArray(offersArray) 
          ? offersArray.filter((offer: any) => offer.status === 'pending').length 
          : 0;

        setBadges({ unreadMessages, pendingOffers });
      } catch (error) {
        console.error('Error fetching notification badges:', error);
      }
    };

    fetchBadges();
    // Refresh badges every 30 seconds
    const interval = setInterval(fetchBadges, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Get badge count for a specific sidebar item
  const getBadgeCount = (itemId: string): number => {
    switch (itemId) {
      case 'messages':
        return badges.unreadMessages;
      case 'offers':
        return badges.pendingOffers;
      default:
        return 0;
    }
  };

  const renderSidebar = () => (
    <View style={styles.sidebar}>
      {/* Quick Stats Card */}
      <QuickStatsCard />
      
      <View style={styles.sidebarContent}>
        {SIDEBAR_LINKS.map((link) => {
          if (link.id.startsWith('divider')) {
            return <View key={link.id} style={styles.sidebarDivider} />;
          }
          
          const isActive = pathname === link.route || 
            (link.route !== '/' && pathname.startsWith(link.route));
          const badgeCount = getBadgeCount(link.id);
          
          return (
            <TouchableOpacity
              key={link.id}
              style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
              onPress={() => router.push(link.route as any)}
              data-testid={`sidebar-${link.id}`}
            >
              <View style={styles.sidebarIconContainer}>
                <Ionicons
                  name={link.icon}
                  size={20}
                  color={isActive ? COLORS.primary : COLORS.textSecondary}
                />
                {badgeCount > 0 && (
                  <View style={styles.notificationDot} data-testid={`badge-${link.id}`}>
                    <Text style={styles.notificationDotText}>
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </Text>
                  </View>
                )}
              </View>
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

  // Desktop layout with header and sidebar (Always render desktop version - pages handle mobile/desktop branching)
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
