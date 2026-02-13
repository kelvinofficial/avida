import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { ImagePlaceholder } from '../common/ImagePlaceholder';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  border: '#E8E8E8',
};

interface NavItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  badge?: number;
}

export const DesktopSidebar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();

  const mainNavItems: NavItem[] = [
    { icon: 'home-outline', label: 'Home', route: '/' },
    { icon: 'grid-outline', label: 'Categories', route: '/categories' },
    { icon: 'heart-outline', label: 'Favorites', route: '/favorites' },
    { icon: 'chatbubbles-outline', label: 'Messages', route: '/inbox' },
    { icon: 'pricetag-outline', label: 'Offers', route: '/offers' },
  ];

  const userNavItems: NavItem[] = [
    { icon: 'person-outline', label: 'Profile', route: '/profile' },
    { icon: 'notifications-outline', label: 'Notifications', route: '/notifications' },
    { icon: 'settings-outline', label: 'Settings', route: '/settings' },
  ];

  const isActive = (route: string) => {
    if (route === '/') return pathname === '/' || pathname === '/index';
    return pathname.startsWith(route);
  };

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.route);
    return (
      <TouchableOpacity
        key={item.route}
        style={[styles.navItem, active && styles.navItemActive]}
        onPress={() => router.push(item.route as any)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={active ? (item.icon.replace('-outline', '') as any) : item.icon}
          size={22}
          color={active ? COLORS.primary : COLORS.textSecondary}
        />
        <Text style={[styles.navLabel, active && styles.navLabelActive]}>
          {item.label}
        </Text>
        {item.badge && item.badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.sidebar}>
      {/* Logo */}
      <TouchableOpacity style={styles.logoContainer} onPress={() => router.push('/')}>
        <View style={styles.logoIcon}>
          <Ionicons name="storefront" size={24} color="#fff" />
        </View>
        <Text style={styles.logoText}>avida</Text>
      </TouchableOpacity>

      {/* Post Button */}
      <TouchableOpacity
        style={styles.postButton}
        onPress={() => router.push('/create-listing')}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.postButtonText}>Post Listing</Text>
      </TouchableOpacity>

      {/* Main Navigation */}
      <View style={styles.navSection}>
        <Text style={styles.navSectionTitle}>MENU</Text>
        {mainNavItems.map(renderNavItem)}
      </View>

      {/* User Navigation */}
      <View style={styles.navSection}>
        <Text style={styles.navSectionTitle}>ACCOUNT</Text>
        {isAuthenticated ? (
          userNavItems.map(renderNavItem)
        ) : (
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/login')}
          >
            <Ionicons name="log-in-outline" size={20} color={COLORS.primary} />
            <Text style={styles.loginButtonText}>Sign In</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* User Profile (if logged in) */}
      {isAuthenticated && user && (
        <View style={styles.userSection}>
          {user.picture ? (
            <Image
              source={{ uri: user.picture }}
              style={styles.userAvatar}
            />
          ) : (
            <View style={styles.userAvatar}>
              <ImagePlaceholder type="avatar" size="small" showText={false} />
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  navSection: {
    marginBottom: 24,
  },
  navSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: COLORS.primaryLight,
  },
  navLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
    flex: 1,
  },
  navLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#E53935',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  loginButtonText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginTop: 'auto',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.border,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  userEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});

export default DesktopSidebar;
