import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  surface: '#FFFFFF',
  border: '#E5E7EB',
};

interface DesktopHeaderProps {
  creditBalance?: number | null;
  unviewedBadgeCount?: number;
  notificationCount?: number;
  currentCity?: string;
  onLocationPress?: () => void;
  showSearch?: boolean;
  showLocation?: boolean;
  showNavLinks?: boolean;
}

export function DesktopHeader({
  creditBalance = null,
  unviewedBadgeCount = 0,
  notificationCount = 0,
  currentCity = 'Select Location',
  onLocationPress,
  showSearch = true,
  showLocation = true,
  showNavLinks = true,
}: DesktopHeaderProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  return (
    <View style={styles.headerWrapper}>
      {/* Row 1: Logo + Nav Links + Auth + Post Listing */}
      <View style={styles.headerRow1}>
        <View style={styles.headerRow1Inner}>
          <TouchableOpacity style={styles.logoContainer} onPress={() => router.push('/')}>
            <View style={styles.logoIcon}>
              <Ionicons name="storefront" size={22} color="#fff" />
            </View>
            <Text style={styles.logoText}>avida</Text>
          </TouchableOpacity>
          
          {/* Spacer */}
          <View style={{ flex: 1 }} />
          
          <View style={styles.headerActions}>
            {isAuthenticated ? (
              <>
                {/* Navigation Links */}
                {showNavLinks && (
                  <View style={styles.navLinks}>
                    <TouchableOpacity style={styles.navLink} onPress={() => router.push('/profile/my-listings')}>
                      <Ionicons name="pricetags-outline" size={18} color={COLORS.textSecondary} />
                      <Text style={styles.navLinkText}>My Listings</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.navLink} onPress={() => router.push('/messages')}>
                      <Ionicons name="chatbubbles-outline" size={18} color={COLORS.textSecondary} />
                      <Text style={styles.navLinkText}>Messages</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.navLink} onPress={() => router.push('/profile/saved')}>
                      <Ionicons name="heart-outline" size={18} color={COLORS.textSecondary} />
                      <Text style={styles.navLinkText}>Saved</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.navLink} onPress={() => router.push('/offers')}>
                      <Ionicons name="pricetag-outline" size={18} color={COLORS.textSecondary} />
                      <Text style={styles.navLinkText}>Offers</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                {showNavLinks && <View style={styles.headerDivider} />}
                
                {/* Credit Balance */}
                <TouchableOpacity style={styles.creditBalanceBtn} onPress={() => router.push('/credits')}>
                  <Ionicons name="wallet-outline" size={18} color="#F59E0B" />
                  <Text style={styles.creditBalanceText}>
                    {creditBalance !== null ? `${creditBalance} Credits` : '...'}
                  </Text>
                </TouchableOpacity>
                
                {/* Badge Notification */}
                <TouchableOpacity style={styles.notifBtn} onPress={() => router.push('/profile/badges')}>
                  <Ionicons name="medal-outline" size={22} color="#333" />
                  {unviewedBadgeCount > 0 && (
                    <View style={[styles.notifBadge, { backgroundColor: '#9333EA' }]}>
                      <Text style={styles.notifBadgeText}>{unviewedBadgeCount > 99 ? '99+' : unviewedBadgeCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                
                {/* General Notifications */}
                <TouchableOpacity style={styles.notifBtn} onPress={() => router.push('/notifications')}>
                  <Ionicons name="notifications-outline" size={22} color="#333" />
                  {notificationCount > 0 && (
                    <View style={styles.notifBadge}>
                      <Text style={styles.notifBadgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                
                {/* Profile */}
                <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/profile')}>
                  <Ionicons name="person-circle-outline" size={28} color="#333" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/login')}>
                  <Text style={styles.signInBtnText}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.signUpBtn} onPress={() => router.push('/login')}>
                  <Text style={styles.signUpBtnText}>Sign Up</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity 
              style={styles.postListingBtn} 
              onPress={() => {
                if (!isAuthenticated) {
                  router.push('/login?redirect=/post');
                } else {
                  router.push('/post');
                }
              }}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.postListingBtnText}>Post Listing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Row 2: Search + Location (optional) */}
      {(showSearch || showLocation) && (
        <View style={styles.headerRow2}>
          <View style={styles.headerRow2Inner}>
            {showSearch && (
              <TouchableOpacity style={styles.searchField} onPress={() => router.push('/search')} activeOpacity={0.8}>
                <Ionicons name="search" size={20} color="#666" />
                <Text style={styles.searchPlaceholder}>Search for anything...</Text>
              </TouchableOpacity>
            )}
            {showLocation && (
              <TouchableOpacity style={styles.locationChip} activeOpacity={0.7} onPress={onLocationPress}>
                <Ionicons name="location" size={18} color={COLORS.primary} />
                <Text style={styles.locationText} numberOfLines={1}>{currentCity}</Text>
                <Ionicons name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRow1: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRow1Inner: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 8,
  },
  navLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  navLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  headerDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  creditBalanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  creditBalanceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B45309',
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signInBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  signUpBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  signUpBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  postListingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginLeft: 8,
  },
  postListingBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  headerRow2: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  headerRow2Inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchPlaceholder: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    maxWidth: 120,
  },
});

export default DesktopHeader;
