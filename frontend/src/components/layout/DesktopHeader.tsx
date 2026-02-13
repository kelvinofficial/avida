import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useLocationStore } from '../../store/locationStore';
import { useLoginRedirect } from '../../hooks/useLoginRedirect';
import api, { locationsApi } from '../../utils/api';
import { LocationPicker, LocationData } from '../LocationPicker';

interface Country {
  code: string;
  name: string;
  flag?: string;
}

const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
  warning: '#F59E0B',
  purple: '#9333EA',
  red: '#EF4444',
};

interface DesktopHeaderProps {
  showNavLinks?: boolean;
  showSearch?: boolean;
  showLocationSelector?: boolean;
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({ 
  showNavLinks = true,
  showSearch = true,
  showLocationSelector = true,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();
  const { currentCity, showLocationModal, setShowLocationModal, setLocation, clearLocation, selectedLocationFilter } = useLocationStore();
  const { goToLogin } = useLoginRedirect();
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [unviewedBadgeCount, setUnviewedBadgeCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);

  // Fetch credit balance, badge count, and notifications when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchCreditBalance();
      fetchUnviewedBadgeCount();
      fetchNotificationCount();
    }
  }, [isAuthenticated]);

  // Handle location selection from LocationPicker
  const handleLocationSelect = (location: LocationData) => {
    const displayText = location.location_text || location.city_name || location.region_name || 'Selected Location';
    setLocation(displayText, {
      country_code: location.country_code,
      country_name: location.country_name,
      region_code: location.region_code,
      region_name: location.region_name,
      district_code: location.district_code,
      district_name: location.district_name,
      city_code: location.city_code,
      city_name: location.city_name,
      location_text: displayText,
    });
  };

  const fetchCreditBalance = async () => {
    try {
      const res = await api.get('/boost/credits/balance');
      setCreditBalance(res.data?.balance ?? 0);
    } catch (err) {
      console.error('Failed to fetch credit balance:', err);
      setCreditBalance(0);
    }
  };

  const fetchUnviewedBadgeCount = async () => {
    try {
      const res = await api.get('/badges/unviewed-count');
      setUnviewedBadgeCount(res.data?.unviewed_count ?? 0);
    } catch (err) {
      console.error('Failed to fetch badge count:', err);
    }
  };

  const fetchNotificationCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setNotificationCount(res.data?.count ?? 0);
    } catch (err) {
      console.error('Failed to fetch notification count:', err);
    }
  };

  return (
    <View style={styles.globalHeader}>
      {/* Row 1: Logo + Nav + Auth + Post Listing */}
      <View style={styles.globalHeaderRow1}>
        <View style={styles.globalHeaderInner}>
          {/* Logo */}
          <TouchableOpacity style={styles.logoContainer} onPress={() => router.push('/')}>
            <View style={styles.logoIcon}>
              <Ionicons name="storefront" size={20} color="#fff" />
            </View>
            <Text style={styles.logoText}>avida</Text>
          </TouchableOpacity>
          
          {/* Spacer to push everything to the right */}
          <View style={{ flex: 1 }} />
          
          {/* Header Actions */}
          <View style={styles.globalHeaderActions}>
            {isAuthenticated ? (
              <>
                {/* Navigation Links - Desktop (for authenticated users) */}
                {showNavLinks && (
                  <View style={styles.navLinks}>
                    <TouchableOpacity 
                      style={[styles.navLink, pathname === '/profile/my-listings' && styles.navLinkActive]}
                      onPress={() => router.push('/profile/my-listings')}
                    >
                      <Ionicons name="list-outline" size={18} color={pathname === '/profile/my-listings' ? COLORS.primary : COLORS.textSecondary} />
                      <Text style={[styles.navLinkText, pathname === '/profile/my-listings' && styles.navLinkTextActive]}>My Listings</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.navLink, pathname === '/messages' && styles.navLinkActive]}
                      onPress={() => router.push('/messages')}
                    >
                      <Ionicons name="chatbubbles-outline" size={18} color={pathname === '/messages' ? COLORS.primary : COLORS.textSecondary} />
                      <Text style={[styles.navLinkText, pathname === '/messages' && styles.navLinkTextActive]}>Messages</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.navLink, (pathname === '/saved' || pathname === '/profile/saved') && styles.navLinkActive]}
                      onPress={() => router.push('/profile/saved')}
                    >
                      <Ionicons name="heart-outline" size={18} color={(pathname === '/saved' || pathname === '/profile/saved') ? COLORS.primary : COLORS.textSecondary} />
                      <Text style={[styles.navLinkText, (pathname === '/saved' || pathname === '/profile/saved') && styles.navLinkTextActive]}>Saved</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.navLink, pathname === '/offers' && styles.navLinkActive]}
                      onPress={() => router.push('/offers')}
                    >
                      <Ionicons name="pricetag-outline" size={18} color={pathname === '/offers' ? COLORS.primary : COLORS.textSecondary} />
                      <Text style={[styles.navLinkText, pathname === '/offers' && styles.navLinkTextActive]}>Offers</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                {showNavLinks && <View style={styles.headerDivider} />}
                
                {/* Credit Balance */}
                <TouchableOpacity 
                  style={styles.creditBalanceBtn} 
                  onPress={() => router.push('/credits')}
                >
                  <Ionicons name="wallet-outline" size={18} color={COLORS.warning} />
                  <Text style={styles.creditBalanceText}>
                    {creditBalance !== null ? `${creditBalance} Credits` : '...'}
                  </Text>
                </TouchableOpacity>
                
                {/* Badge Notification */}
                <TouchableOpacity 
                  style={styles.headerIconBtn} 
                  onPress={() => router.push('/profile/badges')}
                >
                  <Ionicons name="medal-outline" size={22} color={COLORS.text} />
                  {unviewedBadgeCount > 0 && (
                    <View style={[styles.notifBadge, { backgroundColor: COLORS.purple }]}>
                      <Text style={styles.notifBadgeText}>{unviewedBadgeCount > 99 ? '99+' : unviewedBadgeCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                
                {/* General Notifications */}
                <TouchableOpacity 
                  style={styles.headerIconBtn} 
                  onPress={() => router.push('/notifications')}
                >
                  <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
                  {notificationCount > 0 && (
                    <View style={styles.notifBadge}>
                      <Text style={styles.notifBadgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                
                {/* Profile */}
                <TouchableOpacity 
                  style={styles.headerIconBtn} 
                  onPress={() => router.push('/profile')}
                >
                  <Ionicons name="person-circle-outline" size={26} color={COLORS.text} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.signInHeaderBtn} onPress={() => goToLogin()}>
                  <Text style={styles.signInHeaderBtnText}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.signUpHeaderBtn} onPress={() => goToLogin()}>
                  <Text style={styles.signUpHeaderBtnText}>Sign Up</Text>
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
      
      {/* Row 2: Search + Location */}
      {(showSearch || showLocationSelector) && (
        <View style={styles.globalHeaderRow2}>
          <View style={styles.globalHeaderInner}>
            {showSearch && (
              <TouchableOpacity 
                style={styles.searchField} 
                onPress={() => router.push('/search')} 
                activeOpacity={0.8}
              >
                <Ionicons name="search" size={20} color={COLORS.textSecondary} />
                <Text style={styles.searchPlaceholder}>Search for anything...</Text>
              </TouchableOpacity>
            )}
            {showLocationSelector && (
              <TouchableOpacity 
                style={[styles.locationChip, !showSearch && { marginLeft: 'auto' }]}
                activeOpacity={0.7} 
                onPress={() => setShowLocationModal(true)}
                data-testid="header-location-selector"
              >
                <Ionicons name="location" size={18} color={COLORS.primary} />
                <Text style={styles.locationText} numberOfLines={1}>{currentCity}</Text>
                <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Location Picker Modal */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.locationPickerModal}>
          <View style={styles.locationPickerHeader}>
            <Text style={styles.locationPickerTitle}>Select Location</Text>
            <TouchableOpacity onPress={() => setShowLocationModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          {/* Current Selection Display */}
          {selectedLocationFilter && (
            <View style={styles.currentLocationDisplay}>
              <Ionicons name="location" size={18} color={COLORS.primary} />
              <Text style={styles.currentLocationText}>
                {selectedLocationFilter.location_text || selectedLocationFilter.city_name}
              </Text>
            </View>
          )}
          
          {/* Location Picker Component */}
          <View style={styles.locationPickerContent}>
            <LocationPicker
              value={selectedLocationFilter}
              onChange={handleLocationSelect}
              placeholder="Search for a location..."
              showGpsOption={true}
              showRecentLocations={true}
            />
          </View>
          
          {/* All Locations Option */}
          <TouchableOpacity
            style={[styles.allLocationsBtn, !selectedLocationFilter && styles.allLocationsBtnActive]}
            onPress={() => {
              clearLocation();
            }}
          >
            <Ionicons name="globe-outline" size={20} color={!selectedLocationFilter ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.allLocationsBtnText, !selectedLocationFilter && styles.allLocationsBtnTextActive]}>
              All Locations
            </Text>
            {!selectedLocationFilter && (
              <Ionicons name="checkmark" size={18} color={COLORS.primary} style={{ marginLeft: 'auto' }} />
            )}
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  globalHeader: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  globalHeaderRow1: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  globalHeaderRow2: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  globalHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  
  // Navigation Links
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
  navLinkActive: {
    backgroundColor: COLORS.primaryLight,
  },
  navLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  navLinkTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  
  headerDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  
  globalHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  creditBalanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
  },
  creditBalanceText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.warning,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  signInHeaderBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  signInHeaderBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  signUpHeaderBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
  },
  signUpHeaderBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  postListingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  postListingBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    gap: 10,
  },
  searchPlaceholder: { fontSize: 15, color: COLORS.textSecondary },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  locationText: { fontSize: 14, fontWeight: '500', color: COLORS.text, maxWidth: 120 },
  // Country Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryModalContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    width: 360,
    maxHeight: 480,
    overflow: 'hidden',
  },
  countryModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  countryModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  countryModalLoading: {
    paddingVertical: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryList: {
    paddingVertical: 8,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  countryFlag: {
    fontSize: 24,
  },
  countryName: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  countryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 56,
  },
  // Location Picker Modal Styles
  locationPickerModal: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  locationPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  locationPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  currentLocationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.primaryLight,
  },
  currentLocationText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
  locationPickerContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  allLocationsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  allLocationsBtnActive: {
    backgroundColor: COLORS.primaryLight,
  },
  allLocationsBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  allLocationsBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default DesktopHeader;
