/**
 * Home Screen Styles
 * Extracted from index.tsx to improve maintainability
 */

import { StyleSheet, Platform } from 'react-native';

// Layout Constants
export const HORIZONTAL_PADDING = 16;
export const ROW_1_HEIGHT = 56;
export const TOUCH_TARGET = 44;
export const ICON_SIZE = 24;
export const MAX_CONTENT_WIDTH = 1280;

// Desktop/Tablet specific styles
export const desktopStyles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  // Row 1: Logo + Nav Links + Auth + Post Listing
  headerRow1: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
  },
  headerRow1Inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
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
  navLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  headerDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
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
    color: '#F59E0B',
  },
  signInBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  signInBtnText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  signUpBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  signUpBtnText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#E53935',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  profileBtn: {
    padding: 4,
  },
  postListingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  postListingBtnText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  // Row 2: Search + Location
  headerRow2: {
    alignItems: 'center',
    zIndex: 200,
    ...(Platform.OS === 'web' ? { overflow: 'visible' } : {}),
  },
  headerRow2Inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 16,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    ...(Platform.OS === 'web' ? { overflow: 'visible' } : {}),
  },
  searchFieldWrapper: {
    flex: 1,
    position: 'relative',
    zIndex: 9999,
    ...(Platform.OS === 'web' ? { overflow: 'visible' } : {}),
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },
  clearSearchBtn: {
    padding: 4,
  },
  searchPlaceholder: {
    fontSize: 15,
    color: '#666',
    flex: 1,
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 4,
    paddingVertical: 8,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    }),
    zIndex: 1000,
  },
  suggestionSection: {
    paddingVertical: 4,
  },
  suggestionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clearAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
  suggestionHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  trendingRank: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendingRankText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F57C00',
  },
  trendingCount: {
    fontSize: 12,
    color: '#999',
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  locationWrapper: {
    position: 'relative',
  },
  locationDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    width: 320,
    maxHeight: 400,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    zIndex: 1000,
  },
  locationDropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
  },
  locationDropdownTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  closeDropdownBtn: {
    padding: 4,
    marginLeft: 8,
  },
  clearLocationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#F8FFF8',
  },
  clearLocationText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
  },
  locationDropdownLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#999',
  },
  locationList: {
    maxHeight: 300,
  },
  locationListContainer: {
    maxHeight: 300,
    overflow: 'scroll',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    width: '100%',
  },
  countryFlag: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
    flexShrink: 0,
  },
  locationItemText: {
    fontSize: 14,
    color: '#333',
    flexShrink: 1,
    flexGrow: 1,
    width: 'auto',
  },
  allInCountryOption: {
    backgroundColor: '#F0FFF0',
    borderBottomWidth: 2,
    borderBottomColor: '#E8E8E8',
  },
  nearMeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    marginLeft: 8,
  },
  nearMeChipActive: {
    backgroundColor: '#1976D2',
  },
  nearMeText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '600',
  },
  nearMeTextActive: {
    color: '#fff',
  },
  // Row 3: Category Icons
  categoryRowWrapper: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  categoryScroll: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
  },
  categoryContent: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 10,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  categoryPillActive: {
    backgroundColor: '#2E7D32',
  },
  categoryPillText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryPillTextActive: {
    color: '#fff',
  },
  sectionHeaderWrapper: {
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  listingCount: {
    fontSize: 14,
    color: '#666',
  },
});

// Mobile styles
export const mobileStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  // ========== HEADER (NO BOX, PLAIN SURFACE) ==========
  headerWrapper: {
    backgroundColor: '#fff',
    // NO border radius, NO margin - spans full width edge to edge
    marginHorizontal: 0,
    borderRadius: 0,
    zIndex: 10000,
    position: 'relative',
    overflow: 'visible',
  },

  // ROW 1
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: ROW_1_HEIGHT,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  logo: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2E7D32',
    letterSpacing: -0.5,
  },
  notificationButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#E53935',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  // ROW 2
  row2: {
    flexDirection: 'column',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 12,
    gap: 10,
    zIndex: 9999,
    position: 'relative',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationRowText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  searchFieldWrapper: {
    flex: 1,
    position: 'relative',
    zIndex: 9999,
    ...(Platform.OS === 'web' ? { overflow: 'visible' } : {}),
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    height: 52,
    paddingLeft: 14,
    paddingRight: 4,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    paddingVertical: 0,
    height: '100%',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },
  clearSearchBtn: {
    padding: 4,
    marginRight: 4,
  },
  searchButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: '#888',
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 4,
    paddingVertical: 8,
    zIndex: 99999,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    }),
  },
  suggestionsSection: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingTop: 4,
    marginTop: -60,
    paddingBottom: 20,
    position: 'relative',
    zIndex: 10000,
  },
  suggestionSection: {
    paddingVertical: 4,
  },
  suggestionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clearAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
  suggestionHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  trendingRank: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendingRankText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F57C00',
  },
  trendingCount: {
    fontSize: 12,
    color: '#999',
  },
  suggestionChipsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
    flexDirection: 'row',
  },
  autocompleteList: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
  },
  autocompleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 2,
  },
  autocompleteText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  autocompleteCount: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  autocompleteCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E7D32',
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  trendingChip: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFE0B2',
  },
  suggestionChipText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    maxWidth: 120,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 22,
    height: 44,
    paddingHorizontal: 12,
    gap: 4,
    minWidth: 96, // Minimum width to prevent aggressive truncation
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  nearMeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 22,
    height: 44,
    paddingHorizontal: 14,
    gap: 6,
    marginLeft: 8,
  },
  nearMeChipActive: {
    backgroundColor: '#1976D2',
  },
  nearMeText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '600',
  },
  nearMeTextActive: {
    color: '#fff',
  },

  // DIVIDER - Full width
  divider: {
    height: 1,
    backgroundColor: '#EBEBEB',
    marginHorizontal: 0, // Edge to edge
    zIndex: 1,
    position: 'relative',
  },

  // CATEGORIES
  categoriesSection: {
    paddingTop: 16,
    paddingBottom: 8,
    zIndex: 1,
    position: 'relative',
  },
  categoriesScroll: {
    flexGrow: 0,
  },
  categoriesContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: 4,
  },

  // SECTION HEADER
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  clearFilter: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
  },

  // LISTINGS GRID
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 100,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardWrapper: {
  },

  // SKELETON
  skeletonGrid: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 16,
  },
  skeletonRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },

  // FOOTER
  footer: {
    paddingVertical: 20,
  },

  // LOCATION MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseBtn: {
    padding: 4,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  citiesList: {
    paddingHorizontal: 12,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
  },
  cityItemSelected: {
    backgroundColor: '#E8F5E9',
  },
  cityName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  cityNameSelected: {
    color: '#2E7D32',
    fontWeight: '600',
  },

  // NEW LOCATION PICKER MODAL
  locationPickerModal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  locationPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  locationPickerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  currentLocationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  currentLocationText: {
    flex: 1,
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
  },
  clearFilterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  clearFilterBtnText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '600',
  },
  locationPickerContent: {
    flex: 1,
    padding: 20,
  },
  locationPickerHint: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  allLocationsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
  },
  allLocationsBtnActive: {
    backgroundColor: '#E8F5E9',
  },
  allLocationsBtnText: {
    flex: 1,
    fontSize: 16,
    color: '#666',
  },
  allLocationsBtnTextActive: {
    color: '#2E7D32',
    fontWeight: '600',
  },
});

// Export combined styles for backward compatibility
export const styles = mobileStyles;
