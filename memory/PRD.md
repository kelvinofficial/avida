# Product Requirements Document - Avida Marketplace

## Original Problem Statement
Build a local marketplace application (Avida) with:
1. Location-based filtering (Country > Region selection)
2. Business Profile feature for verified sellers
3. Premium subscription tiers with payment integration

---

### 2026-02-13: Real-time Favorite Notifications (P0)
**COMPLETED** ✅

#### Features Implemented
1. **WebSocket Notification on Favorite**: When a user favorites a listing, the listing owner receives a real-time stats update via WebSocket (`stats_update` event).

2. **In-app Notification**: Creates a persistent notification for the seller with message "Someone saved your listing '[title]'".

3. **Self-favorite Check**: Users don't receive notifications when they favorite their own listings.

#### Files Modified
- `/app/backend/routes/favorites.py` - Added `notify_stats_update` and `create_notification` callbacks to `add_favorite` endpoint
- `/app/backend/server.py` - Passed callbacks to `create_favorites_router`

#### Test Report
- `/app/test_reports/iteration_130.json` - 100% pass rate

---

### 2026-02-13: Mobile App Optimizations (P1)
**COMPLETED** ✅

#### Features Implemented
1. **Network Status Monitoring** (`useNetworkStatus` hook):
   - Web: Uses `navigator.onLine` and `online`/`offline` events
   - Native: Uses `@react-native-community/netinfo` (dynamically loaded)
   - Returns `isConnected`, `isInternetReachable`, `connectionType`, `isOffline`

2. **Offline Banner** (`OfflineBanner` component):
   - Animated slide-down banner when offline
   - Pulsing animation for visibility
   - Optional retry button
   - Safe area aware (iOS notch support)

3. **Optimized Image** (`OptimizedImage` component):
   - Lazy loading with loading indicator
   - Graceful fallback to `ImagePlaceholder` on error
   - Web-specific optimizations (`loading="lazy"`, `decoding="async"`)
   - Memoized for performance

4. **Touch Feedback** (`TouchableScale` component):
   - Scale animation on press (spring physics, 0.97 scale factor)
   - Haptic feedback on iOS/Android (`expo-haptics`)
   - Configurable scale factor and haptic intensity
   - Accessibility support with testID attributes

5. **Enhanced Pull-to-Refresh** (`EnhancedRefreshControl` component):
   - Haptic feedback when refresh triggers
   - Consistent styling across platforms
   - Promise-based refresh handling

#### Integration Complete (2026-02-13)
Mobile optimization components integrated throughout the app:
- **ListingCard.tsx** - Uses TouchableScale + OptimizedImage
- **PropertyListingCard.tsx** - Uses TouchableScale + OptimizedImage
- **AutoListingCard.tsx** - Uses TouchableScale + OptimizedImage
- **HorizontalListingCard.tsx** - Uses TouchableScale + OptimizedImage
- **BrandGrid.tsx** - Uses TouchableScale for brand tiles
- **RecommendationSection.tsx** - Uses TouchableScale for See All button
- **ResponsiveContainer.tsx** - Supports EnhancedRefreshControl via props

#### Files Created
- `/app/frontend/src/hooks/useNetworkStatus.ts`
- `/app/frontend/src/components/common/OfflineBanner.tsx`
- `/app/frontend/src/components/common/OptimizedImage.tsx`
- `/app/frontend/src/components/common/TouchableScale.tsx`
- `/app/frontend/src/components/common/EnhancedRefreshControl.tsx`
- `/app/frontend/src/components/common/index.ts` (barrel export)

#### Files Modified
- `/app/frontend/app/_layout.tsx` - Integrated `OfflineBanner` and `useNetworkStatus`
- `/app/frontend/src/components/listings/ListingCard.tsx`
- `/app/frontend/src/components/listings/PropertyListingCard.tsx`
- `/app/frontend/src/components/listings/AutoListingCard.tsx`
- `/app/frontend/src/components/auto/HorizontalListingCard.tsx`
- `/app/frontend/src/components/auto/BrandGrid.tsx`
- `/app/frontend/src/components/auto/RecommendationSection.tsx`
- `/app/frontend/src/components/layout/ResponsiveContainer.tsx`

#### Test Report
- `/app/test_reports/iteration_131.json` - 100% frontend pass rate
- All components verified: TouchableScale, OptimizedImage, EnhancedRefreshControl, OfflineBanner
- data-testid attributes added for all interactive elements

---

### 2026-02-13: Shimmer Animation for Skeleton Loaders (P0)
**COMPLETED** ✅

#### Features Implemented
1. **CSS-based Shimmer Animation**: Added polished shimmer effect to all skeleton loaders
   - Smooth left-to-right gradient animation (1.5s cycle)
   - Uses CSS keyframes for optimal web performance
   - Applied via `data-shimmer="true"` attribute selector

2. **Customizable Theme System**:
   - `ShimmerThemeProvider` for custom colors (baseColor, shimmerColor, backgroundColor)
   - `useShimmerTheme()` hook for accessing theme values
   - Default theme: gray gradient (#E0E0E0 → #F5F5F5 → #E0E0E0)

3. **Reusable ShimmerBox Component**:
   - Flexible sizing (width, height, aspectRatio, borderRadius)
   - Web: CSS animation via global keyframes
   - Native: Animated.View with translateX animation

#### Files Modified
- `/app/frontend/src/components/skeletons/index.tsx` - Added ShimmerBox, ShimmerThemeProvider, useShimmerTheme; refactored all skeleton components
- `/app/frontend/app/+html.tsx` - Added global shimmer keyframes and data attribute CSS selector

#### Technical Details
- Animation: `@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`
- Gradient: `linear-gradient(90deg, #E0E0E0 0%, #F5F5F5 50%, #E0E0E0 100%)`
- Background-size: 200% for smooth animation scroll effect

#### Verified
- 46 shimmer elements render during page load
- Animation properties confirmed: 1.5s ease-in-out infinite shimmer
- Skeleton disappears after content loads (0 elements)

---

### 2026-02-13: Improved Image Placeholders (P2)
**COMPLETED** ✅

#### Features Implemented
1. **ImagePlaceholder Component**: Created reusable component at `/app/frontend/src/components/common/ImagePlaceholder.tsx`
   - Three sizes: `small`, `medium`, `large`
   - Two types: `listing` (image icon), `avatar` (person icon)
   - Optional text label ("No image")
   - Polished UI with circular icon wrapper and subtle gray background

2. **Replaced `via.placeholder.com` URLs**: Updated key pages to use the new component:
   - Search page (`search.tsx`) - mobile and desktop card views
   - Saved items (`profile/saved.tsx`) - desktop and mobile cards
   - My listings (`profile/my-listings.tsx`) - desktop and mobile cards
   - **DesktopSidebar.tsx** - User avatar placeholder
   - **offers.tsx** - Listing images and user avatars
   - **recently-viewed.tsx** - Desktop and mobile cards
   - **sales.tsx** - Desktop and mobile sale item cards
   - **purchases.tsx** - Updated getImageUri to return null for placeholder handling

#### Visual Design
- Background: `#ECEFF1` (light blue-gray)
- Icon wrapper: `#E0E4E7` circle with centered icon
- Icon color: `#90A4AE` (muted gray-blue)
- Text: `#90A4AE`, 11px, weight 500

---

### 2026-02-13: Real-time Quick Stats via WebSocket (P2)
**COMPLETED** ✅

#### Features Implemented
1. **Backend WebSocket Events** (`/app/backend/server.py`):
   - `subscribe_stats` - Users subscribe to their stats updates
   - `unsubscribe_stats` - Users unsubscribe from stats updates
   - `get_user_quick_stats()` - Helper function to fetch user stats
   - `notify_stats_update()` - Emits stats updates to subscribed users

2. **Frontend WebSocket Integration** (`/app/frontend/src/components/layout/DesktopPageLayout.tsx`):
   - QuickStatsCard now connects to WebSocket on mount
   - Subscribes to `stats_update` events for real-time updates
   - Falls back to API fetch for initial stats
   - Properly disconnects and unsubscribes on unmount

3. **Trigger Calls Implemented** (2026-02-13):
   - `POST /api/listings` - Triggers stats update on listing creation
   - `DELETE /api/listings/{id}` - Triggers stats update on listing deletion
   - `POST /api/listings/{id}/mark-sold` - Triggers stats update when listing is sold
   - `POST /api/offers` - Triggers stats update to seller (new pending offer)
   - `PUT /api/offers/{id}/respond` - Triggers stats update on accept/reject/counter
   - `PUT /api/offers/{id}/accept-counter` - Triggers stats update to seller
   - `DELETE /api/offers/{id}` - Triggers stats update to seller (offer withdrawn)

#### Stats Tracked in Real-time
- `activeListings` - Count of active listings
- `pendingOffers` - Count of pending offers
- `totalViews` - Sum of all listing views
- `creditBalance` - Boost credits balance
- `userRating` - User's average rating
- `totalRatings` - Number of ratings received

#### Files Modified
- `/app/backend/routes/listings.py` - Added notify_stats_update callback and trigger calls
- `/app/backend/routes/property.py` - Added notify_stats_update callback and trigger calls
- `/app/backend/server.py` - Passed notify_stats_update to router factories
- `/app/backend/tests/test_websocket_stats_update.py` - Created tests for WebSocket stats

#### Test Report
- `/app/test_reports/iteration_129.json` - 100% backend pass rate
- All endpoints trigger stats updates correctly

---

### 2026-02-13: Extended ImagePlaceholder to Listing Cards (P1)
**COMPLETED** ✅

#### Features Implemented
Replaced all `via.placeholder.com` URLs with the reusable `ImagePlaceholder` component:
- `/app/frontend/src/components/listings/ListingCard.tsx` - Desktop listing cards
- `/app/frontend/src/components/listings/PropertyListingCard.tsx` - Property listing cards
- `/app/frontend/src/components/listings/AutoListingCard.tsx` - Auto/vehicle listing cards

#### Visual Result
All listing cards now show consistent, polished placeholder icons when images are missing.

---



### 2026-02-13: Page-Specific Skeleton Loaders, Footer Links & Login testID (P1/P2)
**COMPLETED** ✅

#### Features Implemented
1. **Page-Specific Skeleton Loaders**: Updated `_layout.tsx` with route-based skeleton selection:
   - Homepage → `HomepageSkeleton`
   - Search `/search` → `SearchPageSkeleton`
   - Settings `/settings`, `/notification-preferences` → `SettingsSkeleton`
   - Messages `/messages`, `/chat` → `MessagesSkeleton`
   - Profile `/profile` → `ProfileSkeleton`
   - Listing Detail `/listing/[id]` → `ListingDetailSkeleton`

2. **Footer QUICK_LINKS Fixed**: Updated routes to correct paths:
   - Saved Items → `/profile/saved` (was `/saved`)
   - Messages → `/messages` (was `/chat`)

3. **Login Form testID Attributes**: Added `testID` props for reliable automated testing:
   - `login-email-input` - Desktop email input
   - `login-password-input` - Desktop password input
   - `login-toggle-password` - Password visibility toggle
   - `login-submit-button` - Desktop submit button
   - Mobile equivalents with `mobile-` prefix

#### Files Modified
- `/app/frontend/app/_layout.tsx` - Added `getSkeletonForRoute()` function with route detection
- `/app/frontend/src/components/layout/Footer.tsx` - Fixed QUICK_LINKS routes
- `/app/frontend/app/login.tsx` - Added testID props to form elements

#### Test Report
- `/app/test_reports/iteration_128.json` - Login testID attributes verified working
- All data-testid selectors render correctly in DOM
- Login form fillable and submittable via testID selectors

---

### 2026-02-13: Static Footer Links & Homepage Header Refactoring (P0)
**COMPLETED** ✅

#### Features Implemented
1. **FAQ Page (`/faq`)**: Created comprehensive Help Center with 5 accordion-style sections:
   - Getting Started (account creation, posting listings)
   - Buying & Selling (contacting sellers, payments, negotiations)
   - Account & Profile (verification, business profiles, password change)
   - Credits & Promotions (boost credits, purchases, expiration)
   - Safety & Security (reporting, meeting safety, scam prevention)

2. **Footer Links Wired**: Updated `SUPPORT_LINKS` array in Footer.tsx:
   - Help Center → `/faq`
   - Safety Tips → `/safety-tips`
   - Contact Us → `/contact`
   - Report Issue → `/help`

3. **Homepage Header Refactoring**: Replaced custom `renderDesktopHeader()` with shared `DesktopHeader` component:
   - Uses global `useLocationStore` for location state sync
   - Maintains category pills row separately
   - Ensures UI consistency across all pages

#### Files Created
- `/app/frontend/app/faq.tsx` - FAQ page with expandable sections

#### Files Modified
- `/app/frontend/src/components/layout/Footer.tsx` - Updated SUPPORT_LINKS routes
- `/app/frontend/app/(tabs)/index.tsx` - Refactored to use shared DesktopHeader

#### Test Report
- `/app/test_reports/iteration_127.json` - 100% frontend pass rate
- All static pages verified working
- Footer navigation verified
- Homepage header with location selector verified

---

### 2026-02-13: Footer Improvements (P1)
**COMPLETED** ✅

#### Features Implemented
1. **Background Image**: Added AI-generated marketplace scene as footer background
2. **Dark Overlay**: Semi-transparent overlay (`rgba(26, 26, 26, 0.92)`) over the background
3. **Vertical Separators**: Thin vertical lines (`1px width, 12px height, #4B5563 color`) between legal links
4. **Tablet Responsive Layout**: Footer adapts when `isTablet` prop is true with centered content
5. **Hover Animations**: Added subtle hover effects (color transition + underline) to all footer links on desktop

#### Files Modified
- `/app/frontend/src/components/layout/Footer.tsx` - Updated background image URL, implemented tablet styles, added HoverableLink component

#### Test Results
- Desktop (1920px): All sections visible, legal links with separators working, hover animations working
- Tablet (900px): Responsive layout with centered content
- Test report: `/app/test_reports/iteration_126.json` - 100% frontend pass rate

---

### 2026-02-13: Page-Specific Skeleton Loaders (P1)
**COMPLETED** ✅

#### Features Implemented
Created a comprehensive skeleton loader library with page-specific layouts:
1. **HomepageSkeleton**: Grid of listing cards with header, search bar, categories
2. **SearchPageSkeleton**: Desktop layout with sidebar + results grid, mobile layout with search results
3. **SettingsSkeleton**: List of settings sections with toggle rows
4. **MessagesSkeleton**: Chat list with avatar, content, and timestamp
5. **ProfileSkeleton**: User profile header with stats and menu items
6. **ListingDetailSkeleton**: Image carousel, price/title, seller info, description sections

#### Files Created
- `/app/frontend/src/components/skeletons/index.tsx` - Full skeleton component library
- `/app/frontend/src/contexts/LocationContext.tsx` - React Context for shared location state

#### Files Modified
- `/app/frontend/app/_layout.tsx` - Updated to use HomepageSkeleton component

---

### 2026-02-13: Settings Pages Verification (P1)
**VERIFIED** ✅

The settings pages were already implemented and functional:
- `/app/frontend/app/settings.tsx` - Main settings page with notification, location, and privacy settings
- `/app/frontend/app/notification-preferences.tsx` - Detailed notification preferences
- `/app/frontend/app/profile/verify-id.tsx` - Trust & Identity verification
- `/app/frontend/app/settings/account.tsx`, `appearance.tsx`, `notifications.tsx`, `storage.tsx` - Additional settings pages

#### API Endpoints Verified
- `GET /api/notification-preferences` - Returns user notification settings ✅
- Settings pages require authentication (redirects to login if not authenticated)

---

### 2026-02-13: Location Persistence with localStorage (P1)
**COMPLETED** ✅

#### Feature
The selected location now persists in localStorage. When users return to the homepage, their previously selected location (country/region) is automatically restored and listings are filtered accordingly.

#### How It Works
1. When user selects a location, it's saved to `@selected_city` in localStorage
2. On page load, `loadSavedLocation()` reads from localStorage and restores the filter
3. The listing API is called with location params (country_code, region_code)

#### Files Modified
- `/app/frontend/app/(tabs)/index.tsx` - Already had localStorage persistence via `saveSelectedCity()` and `loadSavedLocation()` functions using the cross-platform `Storage` utility

---

### 2026-02-13: Desktop Location Selector Bug Fix (P0)
**COMPLETED** ✅

#### Problem
The inline dropdown location selector implemented earlier had a React Native Web rendering bug where text in list items (countries and regions) would not render except for the first item. The bug was specific to absolutely positioned dropdowns in React Native Web.

#### Solution
Changed the desktop location selector to use the existing Modal-based LocationPicker component instead of a custom dropdown. When users click "Select Location" on desktop, a full-screen modal now opens with the working location picker that correctly renders all country and region names.

#### Files Modified
- `/app/frontend/app/(tabs)/index.tsx` - Simplified desktop location selector to open modal instead of dropdown

---

### 2026-02-13: Font Loading Skeleton (P1)
**COMPLETED** ✅

#### Feature  
Added a loading skeleton animation displayed while icon fonts are loading on web, preventing flash of unstyled icons.

#### Files Modified
- `/app/frontend/app/_layout.tsx` - Added `FontLoadingSkeleton` component with shimmer animation

---

### 2026-02-13: Icon Loading Fix - Local Font Bundling (P0)
**COMPLETED** ✅

#### Problem
Icons were not displaying across the app (showing as empty boxes). The issue was caused by:
1. `@expo/vector-icons` trying to load fonts from Metro's `/assets/?unstable_path=...` path
2. The preview environment returning 520 errors for these asset requests

#### Solution
Implemented local font bundling with multi-layer approach:
1. **Backend Static Files**: Copied icon fonts to `/app/backend/static/fonts/` and mounted via FastAPI at `/api/fonts/`
2. **CSS @font-face**: Added font-face rules in `+html.tsx` pointing to `/api/fonts/` endpoints
3. **JavaScript FontFace API**: Added script to proactively load fonts via FontFace API before React renders

#### Files Modified
- `/app/frontend/app/+html.tsx` - Added CSS @font-face rules and JavaScript font loading script
- `/app/frontend/app/_layout.tsx` - Removed useFonts hook (fonts now loaded via JS/CSS)
- `/app/backend/server.py` - Added StaticFiles mount for `/api/fonts/` endpoint
- `/app/backend/static/fonts/` - Contains Ionicons.ttf, MaterialIcons.ttf, MaterialCommunityIcons.ttf, FontAwesome.ttf, FontAwesome5_Solid.ttf, Feather.ttf

#### Fonts Loaded Successfully
- ionicons
- material  
- material-community
- FontAwesome
- FontAwesome5_Solid
- feather

---

### 2026-02-13: Search Page Footer Fix & Autocomplete Feature (P0)
**COMPLETED** ✅

#### Requirements
1. ✅ Fix footer overlapping/hiding search results on /search page
2. ✅ Fix alignment/padding issues on search results page
3. ✅ Add search suggestions/autocomplete to homepage search bar

#### Implementation Status
1. **Footer Fix**: Moved Footer component inside ScrollView in the desktop layout. The layout now uses `desktopScrollView` with `flex: 1` and `desktopScrollContent` with `flexGrow: 1` allowing proper scrolling with Footer at the bottom.
2. **Padding Fix**: Updated `resultsArea` style from `flex: 1` to `minHeight: 400` and added `resultsContainer` with `paddingBottom: 24`. Cards now have 16px padding and 16px gap.
3. **Autocomplete**: Added autocomplete dropdown that shows on search input focus:
   - TRENDING section with search terms and counts (fetched from `/api/searches/popular`)
   - RECENT SEARCHES section (from localStorage)
   - Click-to-search functionality with navigation to `/search?q={query}`

#### Files Modified
- `/app/frontend/app/search.tsx` - Restructured desktop layout with ScrollView wrapping content and footer
- `/app/frontend/app/(tabs)/index.tsx` - Added autocomplete dropdown with state management, API integration, and styling

#### Test Report
- `/app/test_reports/iteration_125.json` - 100% pass rate (all 5 features verified)

---

### 2026-02-13: Homepage Search Bar Enhancement (P0)
**COMPLETED** ✅

#### Requirements
User wants to type search query on homepage and redirect to `/search?q=query` with results showing.

#### Implementation Status
1. ✅ Added typeable TextInput to homepage search bar (replaced TouchableOpacity)
2. ✅ Added Search button next to input on desktop
3. ✅ `handleSearchSubmit` redirects to `/search?q=encodeURIComponent(query)`
4. ✅ Auto-search on `/search` page now works reliably

#### Fix Applied
Changed homepage navigation from `router.push()` to `window.location.href` for web platform. This ensures the search page component fully mounts with proper lifecycle, allowing the auto-search effects to trigger correctly.

#### Files Modified
- `/app/frontend/app/(tabs)/index.tsx` - Homepage search bar with TextInput, uses `window.location.href` for web navigation
- `/app/frontend/app/search.tsx` - Auto-search using useFocusEffect and useEffect hooks
- `/app/frontend/app/_layout.tsx` - Added `search` to Stack.Screen definitions

#### Files Removed
- `/app/frontend/app/(tabs)/search.tsx` - Removed unused duplicate file

---

### 2026-02-13: Desktop Search Page Redesign (P0)
**COMPLETED** ✅

#### Requirements
User requested a redesigned desktop search page with:
1. ✅ Consistent layout with sidebar (similar to profile pages)
2. ✅ Search bar in main content area
3. ✅ Search-related Quick Stats in sidebar (trending/recent searches)
4. ✅ Single-column list for search results
5. ✅ Horizontal card layout (image on left, text on right)

#### Implementation
Updated `/app/frontend/app/search.tsx`:
- New horizontal card layout with flexDirection: 'row'
- Single-column list with flexDirection: 'column'
- Rich card content: price, negotiable badge, title, description, location, date, condition
- Favorite button on each card
- Proper data-testid attributes for testing

#### Key Files
- `/app/frontend/app/search.tsx` - Main search page (serves `/search` route)
- `/app/frontend/app/(tabs)/search.tsx` - Alternative tabs version (hidden from nav)

#### Test Report
- `/app/test_reports/iteration_123.json` - 100% pass rate (all 9 features verified)

#### Minor Issues (Non-blocking)
- Image placeholders show gray boxes for listings without images
- Shadow style deprecation warning (cosmetic)

---

### 2026-02-12: User Profile Desktop Page Redesign (P0)
**COMPLETED**

#### Overview
Standardized the desktop layout for all user profile-related pages to have a consistent, professional design with:
- Standard header with search bar and location selector
- Sidebar for navigation with profile section links
- Main content area with max-width 1280px
- Consistent styling and spacing

#### Implementation
Created reusable `DesktopPageLayout` component at `/app/frontend/src/components/layout/DesktopPageLayout.tsx`

#### All Profile Pages Updated with DesktopPageLayout:
1. **Saved Items** (`/app/frontend/app/profile/saved.tsx`) ✅
2. **Badges** (`/app/frontend/app/profile/badges.tsx`) ✅
3. **Invoices** (`/app/frontend/app/profile/invoices.tsx`) ✅
4. **Recently Viewed** (`/app/frontend/app/profile/recently-viewed.tsx`) ✅
5. **Credits Store** (`/app/frontend/app/credits/index.tsx`) ✅
6. **Offers** (`/app/frontend/app/offers.tsx`) ✅
7. **Business Profile Edit** (`/app/frontend/app/business/edit.tsx`) ✅
8. **My Listings** (`/app/frontend/app/profile/my-listings.tsx`) ✅ (Updated 2026-02-12)
9. **Purchases** (`/app/frontend/app/profile/purchases.tsx`) ✅ (Updated 2026-02-12)
10. **Sales** (`/app/frontend/app/profile/sales.tsx`) ✅ (Updated 2026-02-12)
11. **Boost Listings** (`/app/frontend/app/boost/[listing_id].tsx`) ✅
12. **Messages** (`/app/frontend/app/(tabs)/messages.tsx`) ✅ (Updated 2026-02-12 - unauthenticated view only)
13. **My Profile** (`/app/frontend/app/(tabs)/profile.tsx`) ✅ (Updated 2026-02-12 - authenticated view)

#### Quick Stats Dashboard Feature (2026-02-12)
Added `QuickStatsCard` component to the `DesktopPageLayout` sidebar that shows:
- **Active Listings Count** - Clickable, navigates to My Listings
- **Pending Offers Count** - Clickable, navigates to Offers (with alert dot if > 0)
- **Credit Balance** - Clickable, navigates to Credits page
Only renders when user is authenticated. Fetches data in parallel from:
- `/api/listings/my` for listings count
- `/api/offers?role=seller` for offers count (fixed from /api/offers/received)
- `/api/boost/credits/balance` for credits

#### Notification Badges Feature (2026-02-12) ✅
Added red notification dots with counts to sidebar items:
- **Messages**: Shows unread messages count (fetched from `/api/conversations`)
- **Offers**: Shows pending offers count (fetched from `/api/offers?role=seller`)
- Features:
  - Red dot badge with white text
  - Numbers capped at "99+" for high counts
  - Auto-refreshes every 10 seconds (upgraded from 30s for near real-time updates)
  - Only displays for authenticated users
- Test report: `/app/test_reports/iteration_119.json` - 100% pass (backend + code review)

#### New Message Sound Notification (2026-02-12) ✅
Added subtle "ding" notification sound when unread message count increases:
- Uses Web Audio API (AudioContext) for browser compatibility
- Plays 880Hz sine wave for 0.3 seconds
- Only triggers when unread count increases (not on first page load)
- Respects user preference (can be muted in Settings)
- Falls back gracefully if audio not supported
- Test report: `/app/test_reports/iteration_120.json` - 100% pass

#### Notification Sound Preferences Toggle (2026-02-12) ✅
Added "Message Sound" toggle to Settings page:
- Available in both desktop and mobile notification settings
- Description: "Play a sound when new messages arrive"
- Uses `notificationPrefsStore` (Zustand) with localStorage persistence
- Toggle persists across sessions
- Files: `/app/frontend/src/store/notificationPrefsStore.ts`, `/app/frontend/app/settings.tsx`
- Test report: `/app/test_reports/iteration_121.json` - 100% pass

#### Near Real-Time Polling (2026-02-12) ✅
Upgraded polling interval from 30s to 10s for:
- Notification badges (unread messages, pending offers)
- Quick Stats metrics
- File: `/app/frontend/src/components/layout/DesktopPageLayout.tsx` line 381
- Test report: `/app/test_reports/iteration_121.json` - 100% pass

#### Premium Subscription E2E Verification (2026-02-12) ✅
Verified premium subscription flow:
- Packages API: GET `/api/premium-subscription/packages` returns Stripe and M-Pesa packages
- Stripe checkout: POST `/api/premium-subscription/stripe/checkout` returns checkout_url
- My subscription: GET `/api/premium-subscription/my-subscription` returns premium status
- Success page: `/premium/success` handles checking, success, pending, error states
- Test report: `/app/test_reports/iteration_121.json` - 100% pass (21/21 backend tests)

#### Enhanced Quick Stats Metrics (2026-02-12) ✅
Expanded Quick Stats card from 3 to 5 metrics:
- **Listings**: Active listing count
- **Offers**: Pending offers count (with alert dot)
- **Total Views**: Aggregated views across all user's listings
- **Rating**: User rating (X.X format or "—" if no rating)
- **Credits**: Credit balance
- Color-coded icons for each metric (green, orange, purple, yellow, blue)
- Test report: `/app/test_reports/iteration_120.json` - 100% pass

#### Photography Guides Admin CRUD (2026-02-12) ✅
Verified existing functionality at `/admin/photography-guides`:
- Stats dashboard showing Total, Active, With Images, Categories
- Category filter chips for filtering guides
- Add/Edit/Delete guide functionality with icon picker
- Seed Defaults button to create default guides
- Image upload support (base64, max 2MB)
- Test report: `/app/test_reports/iteration_120.json` - CRUD APIs verified

#### Test Reports
- `/app/test_reports/iteration_6.json` - Initial 8 pages
- `/app/test_reports/iteration_117.json` - Final 3 pages (my-listings, purchases, sales) - 100% pass
- `/app/test_reports/iteration_118.json` - Messages & Profile pages + Quick Stats - 100% pass
- `/app/test_reports/iteration_119.json` - Quick Stats fix + Notification badges - 100% pass

---

### 2026-02-12: Saved Filters Feature (P2)
**COMPLETED**

#### Feature Overview
Allow authenticated users to save, name, and apply their favorite filter combinations on category pages.

#### Backend API (`/app/backend/routes/saved_filters.py`)
- **List Saved Filters**: `GET /api/saved-filters?category_id={id}` - Returns user's saved filters for a category
- **Get Single Filter**: `GET /api/saved-filters/{filter_id}` - Get specific saved filter
- **Create Filter**: `POST /api/saved-filters` - Create a new saved filter (max 20 per category)
- **Update Filter**: `PUT /api/saved-filters/{filter_id}` - Update name, filters, or default status
- **Delete Filter**: `DELETE /api/saved-filters/{filter_id}` - Remove a saved filter
- **Set Default**: `POST /api/saved-filters/{filter_id}/set-default` - Set as default filter for category
- **Get Default**: `GET /api/saved-filters/category/{category_id}/default` - Get default filter

#### Frontend Integration (`/app/frontend/app/category/[id].tsx`)
- **Desktop Sidebar**: SAVED FILTERS section at bottom of sidebar
  - "Sign in to save filters" button for unauthenticated users
  - "Save Current Filters" button when filters are applied (authenticated)
  - List of saved filters with apply/delete actions
  - Default badge indicator for default filters
- **Save Filter Modal**: Name input for saving current filter combination
- **Auto-apply**: Default filter automatically applied on page load

#### Bug Fix
- Fixed auth token key mismatch: Changed `authToken` to `session_token` to match auth store

#### Test Report
- `/app/test_reports/iteration_115.json` - 100% pass rate

---

### 2026-02-12: Popular Searches Feature (P1)
**COMPLETED**

#### Backend API
- **Track Search**: `POST /api/searches/track` - Stores search queries with category_id in MongoDB `search_tracking` collection
- **Get Popular**: `GET /api/searches/popular?category_id={id}&limit=5` - Returns global and category-specific trending searches
- **Get Suggestions**: `GET /api/searches/suggestions?q={query}` - Autocomplete based on popular searches
- **Files**: `/app/backend/routes/popular_searches.py`, registered in `/app/backend/server.py`

#### Frontend Integration
- **Desktop UI**: Dropdown shows "Popular in {Category}" section with orange flame icon and trending-up icons
- **Mobile UI**: Orange-styled chips showing popular searches with "Trending" label
- Searches tracked automatically when user performs search (2+ chars)
- Both global and per-category trending shown

### 2026-02-12: Admin Photography Guides Interface (P2)
**COMPLETED**

#### Admin Page Features
- **Stats Dashboard**: Shows total guides, active/inactive count, categories with guides
- **Seed Button**: One-click seed default photography guides for all categories
- **Category Filter**: Filter guides by category
- **CRUD Operations**: Create, edit, toggle active, delete guides
- **Form Fields**: Category, title, description, icon (Ionicons), display order, active toggle
- **Files**: `/app/frontend/app/admin/photography-guides.tsx`, added to admin index and layout

### 2026-02-12: Enhanced Category Filters (P2)
**COMPLETED**

#### Filter Refinements
- Added more filter options to existing categories (e.g., body type for autos, bathrooms for properties)
- Added condition filter to most categories (New, Like New, Used)
- Added default filters for categories without specific filters (Condition, Seller Type)
- Filter labels shortened for better mobile display
- Files: `/app/frontend/app/category/[id].tsx` (CATEGORY_FILTERS object)

### 2026-02-12: Recently Searched Feature (P1)
**COMPLETED**

#### Recently Searched on Category Pages
- **Storage**: Uses AsyncStorage/localStorage per category (`recent_searches_{categoryId}`)
- **Desktop UI**: Dropdown appears below search input when focused and empty
  - Shows "Recent Searches" header with clock icon
  - List of recent search queries (max 5)
  - "Clear all" button to remove all searches
  - Individual "X" button to remove specific searches
  - Click on search term to apply it
- **Mobile UI**: Horizontal scrolling chips below nav header
  - Green-highlighted chips showing recent searches
  - Individual remove buttons on each chip
  - "Clear" button to remove all
- **Logic**: 
  - Searches saved after 500ms debounce
  - Minimum 2 characters required to save
  - Duplicate searches moved to front
  - Max 5 recent searches per category
- **Files Modified**: `/app/frontend/app/category/[id].tsx` (lines 176-230 for logic, 870-910 for desktop UI, 1035-1095 for mobile UI)
- **Test Report**: `/app/test_reports/iteration_112.json` - 90% pass rate

### 2026-02-12: UI/UX Improvements Batch
**COMPLETED**

#### Category Page Search Enhancement (P0)
- **Inline Search**: Added searchable input field directly on category pages (`/category/[id].tsx`)
- Search filters listings within the category context instead of redirecting to global search
- Debounced search with 500ms delay for performance
- Clear button to reset search
- Works on both desktop (in header row) and mobile (in nav header)

#### Negotiable Badge Repositioning (P1)
- **ListingCard Component** (`/src/components/ListingCard.tsx`): Moved negotiable badge from price row to bottom-right of image
- **Homepage ListingCard** (`/app/(tabs)/index.tsx`): Updated inline card component to match - badge now positioned at `bottom: 30, right: 8` on image container
- Badge displays "Negotiable" text with green styling

#### Notification Page Filter Chips (P1)
- Added filter chips for "Badges", "Challenges", "Credits" (`/app/notifications.tsx`)
- Clicking "Badges" routes to `/profile/badges`
- Clicking "Challenges" routes to `/challenges`
- Clicking "Credits" routes to `/credits`
- Other filter chips continue to filter notifications by type

#### Header Location Selector Enhancement (P1)
- **Country Modal** (`/src/components/layout/DesktopHeader.tsx`): Clicking location selector opens a modal with list of countries
- Modal shows country name and flag emoji
- Removed "Browse location" and "All locations" generic text
- Changed default text to "Select Country"

#### Nearby Feature Removal (P1)
- Removed "Include nearby cities" toggle from homepage (mobile and desktop)
- Removed expanded search banner/message
- API calls now use `include_nearby: false` and `only_my_city: true`

#### Category-Specific Filters (P1)
- Added `CATEGORY_FILTERS` configuration for all 14 categories in `/app/category/[id].tsx`
- Quick filter chips displayed above listings grid on desktop
- Full filter options available in filter modal
- Example filters:
  - **Auto & Vehicles**: Fuel Type (Petrol/Diesel/Electric/Hybrid/CNG), Transmission, Year
  - **Properties**: Property Type, Bedrooms, Furnished status
  - **Electronics**: Brand (Apple/Samsung/Sony/LG), Warranty
  - **Fashion**: Gender, Size

#### Minimum Character Display (P1)
- Added min character indicators to listing form (`/app/post/index.tsx`)
- Title: "Min: 10 chars" with checkmark when met
- Description: "Min: 20 chars" with checkmark when met
- Green highlight when minimum is satisfied

### 2026-02-11: Modular Routes Wired into Server
**COMPLETED**

#### Route Integration
- Wired new modular route files (`badges.py`, `streaks.py`, `challenges.py`) into `server.py`
- Routes are now loaded via factory functions with proper dependency injection:
  - `create_badges_router(db, require_auth)` - Badge progress, showcase, unviewed count, milestones, leaderboard
  - `create_streaks_router(db, require_auth)` - User streak info, streak leaderboard
  - `create_challenges_router(db, require_auth)` - Challenge listing, joining, progress tracking
- All routes verified working via API tests

#### DesktopHeader Component Enhanced
- Enhanced `/app/frontend/src/components/layout/DesktopHeader.tsx` with:
  - Badge notification icon with unviewed count (purple badge)
  - General notification icon with unread count (red badge)
  - Auto-fetching of credit balance, badge count, and notification count
  - `showSearch`, `currentCity`, `onLocationPress` props for customization
  - Navigation links with active state highlighting

### 2026-02-11: Desktop Header Consistency & Badge Celebrations
**COMPLETED**

#### Desktop Header Standardization (P0)
- Fixed desktop header for authenticated users across all pages
- Homepage (`/app/frontend/app/(tabs)/index.tsx`): Now displays nav links (My Listings, Messages, Saved, Offers) and Credit Balance
- Profile page (`/app/frontend/app/(tabs)/profile.tsx`): Consistent header with same nav links and Credit Balance
- Fixed credit balance API endpoint from `/api/credits/balance` to `/api/boost/credits/balance`
- Fixed environment variable usage from `EXPO_PUBLIC_API_URL` to `EXPO_PUBLIC_BACKEND_URL`

#### Desktop Profile "My Activity" Section (P0)
- Verified correct items displayed: My Badges, Business Profile, Invoices & Receipts, Purchases, Sales, Recently Viewed

#### Badge Celebration Modal (P1)
- Badge celebration context and modal component already existed
- Added trigger logic in `my-listings.tsx` for mark-sold action - shows celebration when badges are earned
- Added trigger logic in `post/index.tsx` for listing creation - checks for new badges after async award (2s delay)
- Celebrations show confetti animation and badge details when users earn new badges

### 2026-02-11: Badge Notification Bell & Header Layout
**COMPLETED**

#### Badge Notification Feature
- Added backend endpoints:
  - `GET /api/badges/unviewed-count` - Returns count of badges user hasn't viewed
  - `POST /api/badges/mark-viewed` - Marks badges as viewed (all or specific badge_ids)
- Added `is_viewed` field tracking to user_badges collection
- Frontend fetches unviewed badge count when authenticated
- Badge notification icon (medal-outline) displays purple badge count when user has unviewed badges
- Badges page (`/profile/badges`) automatically marks badges as viewed when loaded

#### Header Layout Update
- Moved nav links (My Listings, Messages, Saved, Offers) to the right side of the header near the action icons
- Nav links are now positioned before the Credits/Badge/Notifications group with a vertical divider separator
- Logo remains on the left side with flexible spacer pushing everything else right

### 2026-02-11: Badge Milestone Notifications
**COMPLETED**

#### Milestone System
- **Backend Endpoints:**
  - `GET /api/badges/milestones` - Returns user's achieved, pending, and new (unacknowledged) milestones
  - `POST /api/badges/milestones/acknowledge` - Marks a milestone as seen/acknowledged
  - `GET /api/badges/share/{user_id}` - Public endpoint for shareable badge profiles
- **Milestone Types:**
  - Count-based: First Badge (1), Badge Collector (5), Achievement Hunter (10), Badge Master (25), Legend Status (50)
  - Special badges: First Listing, First Sale, Active Seller, Top Seller, Trusted Member, Veteran
- **Frontend Implementation:**
  - `MilestoneNotificationModal` component with confetti animation, celebratory styling, and share functionality
  - `MilestoneContext` provider manages milestone state and auto-shows modals for new achievements
  - Share button allows users to copy achievement link or share via native share sheet
  - Auto-triggered after earning badges (listing creation, mark-sold actions)

### 2026-02-11: Badge Leaderboard, Social Sharing & Push Notifications
**COMPLETED**

#### Badge Leaderboard
- **Backend Endpoints:**
  - `GET /api/badges/leaderboard` - Paginated leaderboard showing top badge earners with badge counts and showcase badges
  - `GET /api/badges/leaderboard/my-rank` - Authenticated endpoint returning user's rank, percentile, and nearby competitors
- **Frontend Page (`/leaderboard`):**
  - Hero section with trophy icon and competition encouragement
  - "Your Ranking" card showing rank, badge count, percentile, and nearby users
  - Leaderboard list with gold/silver/bronze styling for top 3
  - Current user highlighting and pagination support
  - Share button to share leaderboard link

#### Social Sharing with Open Graph
- **Backend Enhancement:**
  - `GET /api/badges/share/{user_id}` now returns `og_meta` object with title, description, type, and URL
  - User rank included in shareable profile
- **Frontend Page (`/profile/{id}/badges`):**
  - Shareable badge profile page with Open Graph meta tags via expo-router/head
  - Profile card showing user's badges, rank, and showcase badges
  - CTA for non-authenticated users to join
  - Link to badge leaderboard

#### Push Notifications for Milestones
- **Backend Functions:**
  - `send_milestone_push_notification()` - Sends push notification with emoji-based titles based on milestone type
  - `check_and_notify_new_milestones()` - Checks for new milestones and triggers push notifications
- **Note:** Push notifications require Firebase/Expo push token configuration to send actual notifications

### 2026-02-11: Badge Challenges System
**COMPLETED**

#### Challenge Types
- **Weekly Challenges (reset every Monday):**
  - Weekend Warrior - List 5 items during Saturday-Sunday (25 pts)
  - Weekly Sales Star - Sell 3 items this week (30 pts)
  - Listing Sprint - Create 10 listings this week (35 pts)
- **Monthly Challenges (reset on 1st of each month):**
  - Monthly Top Seller - Sell 15 items this month (100 pts)
  - Inventory King - List 30 items this month (75 pts)
  - High Roller Month - Achieve €500 in total sales (150 pts)
  - Community Connector - Send 50 messages to buyers (50 pts)

#### Backend Implementation
- **Endpoints:**
  - `GET /api/challenges` - List all active challenges with user progress
  - `GET /api/challenges/{id}` - Challenge details with leaderboard
  - `POST /api/challenges/{id}/join` - Join a challenge (required to appear on leaderboard)
  - `GET /api/challenges/my-progress` - User's progress on all challenges
- **Features:**
  - Auto-calculates progress based on user activity within challenge period
  - Challenge participants leaderboard
  - Auto-awards limited-time badge upon completion
  - Push notification when challenge completed

#### Frontend Implementation (`/challenges`)
- Hero section with flag icon and competition encouragement
- Separate sections for weekly and monthly challenges
- Challenge cards with: name, description, progress bar, time remaining, join button, reward preview
- Challenge detail modal with: badge reward info, leaderboard, join button
- Link to badge leaderboard

### 2026-02-11: Seasonal/Event Challenges
**COMPLETED**

#### Seasonal Challenges Defined
- **Valentine's Special** (Feb 1-14): Sell 5 items in Fashion/Home categories → Valentine's Champion badge (+50 pts)
- **Spring Refresh Sale** (Mar 20-Apr 20): List 15 items in Home/Fashion → Spring Refresh Pro badge (+60 pts)
- **Summer Deals Festival** (Jun 21-Jul 31): Achieve €300 in sales → Summer Sales Star badge (+80 pts)
- **Back to School** (Aug 15-Sep 15): Sell 8 items in Electronics/Books → Back to School Hero badge (+70 pts)
- **Halloween Spooktacular** (Oct 15-31): List 10 items → Spooky Seller badge (+45 pts)
- **Black Friday Blitz** (Nov 20-30): Sell 10 items → Black Friday Champion badge (+100 pts)
- **Holiday Gift Giver** (Dec 1-25): Achieve €500 in sales → Holiday Hero badge (+120 pts)
- **New Year Fresh Start** (Jan 1-15): List 20 items → New Year Achiever badge (+75 pts)

#### Implementation Details
- Backend: `SEASONAL_CHALLENGES` definitions, `get_seasonal_challenge_period()`, `is_seasonal_challenge_active()`
- Category-based criteria: `CATEGORY_LISTINGS`, `CATEGORY_SALES` for filtering by product categories
- Frontend: "Seasonal Events" section at top with pink header and "LIMITED TIME" badge
- Seasonal challenges sorted first (featured), then weekly, then monthly

### 2026-02-11: Admin Challenge Management & Analytics Enhancement
**COMPLETED**

#### Admin Panel - Challenge Management
- **Endpoints:**
  - `GET /api/admin/challenges` - List custom challenges with participation stats
  - `POST /api/admin/challenges` - Create custom challenge with badge reward
  - `PUT /api/admin/challenges/{id}` - Update challenge
  - `DELETE /api/admin/challenges/{id}` - Soft delete challenge
  - `GET /api/admin/challenges/{id}/leaderboard` - Challenge leaderboard
  - `GET /api/admin/challenges/stats/overview` - Challenge statistics
- **Email Reminders:**
  - `GET /api/admin/challenges/reminders` - Get challenges ending soon
  - `POST /api/admin/challenges/{id}/send-reminder` - Send reminder emails to incomplete participants
  - Uses SendGrid for email delivery (requires SENDGRID_API_KEY)

#### Admin Panel - Leaderboard Management
- **Endpoints:**
  - `GET /api/admin/leaderboard` - Full badge leaderboard with admin controls
  - `GET /api/admin/leaderboard/user/{id}` - Detailed user badge info

#### Challenge Completion Streaks
- **Streak Tracking:**
  - `update_challenge_streak()` - Updates user streak on challenge completion
  - `check_and_award_streak_badges()` - Awards streak milestone badges
  - `GET /api/streaks/my-streak` - Get user's current streak info
- **Streak Badges:**
  - Hot Streak (3 completions) - 25 bonus points
  - On Fire (5 completions) - 50 bonus points
  - Unstoppable (10 completions) - 100 bonus points
- **Bonus System:** 10 points per streak level (max 100)

#### Past Seasonal Badges Gallery
- `GET /api/badges/past-seasonal` - Returns past seasonal badges with year filtering
- Shows earned count and user ownership status
- Admin: `GET /api/admin/badges/gallery` - Admin gallery view

#### Enhanced Analytics (Admin Dashboard)
- **Seller Analytics** (`/api/admin/analytics/sellers`):
  - Top sellers by revenue, active sellers, new sellers, growth trends, average metrics
- **Engagement Analytics** (`/api/admin/analytics/engagement`):
  - Messages, favorites, active users, badge engagement, notification read rates
- **Platform Analytics** (`/api/admin/analytics/platform`):
  - User stats, listing stats, revenue, category breakdown, support ticket counts
- **Settings Endpoints:**
  - `/api/admin/settings/seller-analytics` - Seller analytics configuration
  - `/api/admin/settings/engagement-notifications` - Engagement notification settings

### 2026-02-11: Admin Dashboard & Streak Leaderboard UI Implementation
**COMPLETED**

#### User-Facing Streak Leaderboard (`/streak-leaderboard`)
- **Frontend Page:**
  - `/app/frontend/app/(tabs)/streak-leaderboard.tsx`
  - Hero section with flame icon and "Challenge Streaks" title
  - Streak Bonuses info card showing tier thresholds (3+: +25 pts, 5+: +50 pts, 7+: +75 pts, 10+: +100 pts)
  - "Your Streak" card with current/best/total stats (for authenticated users)
  - "Top Streakers" leaderboard with rank, name, streak badge, and stats
  - Empty state for no streaks
  - CTA for non-authenticated users
  - Link to active challenges
- **API Integration:**
  - `GET /api/streaks/leaderboard` - Public leaderboard endpoint
  - `GET /api/streaks/my-streak` - User's streak info (authenticated)

#### Admin Challenge Management UI (`/admin/challenges`)
- **Frontend Page:**
  - `/app/frontend/app/admin/challenges.tsx`
  - Stats cards: Total, Active, Participants, Completions
  - Filter tabs: All, Active, Ended
  - Challenge cards with icon, name, description, type badge, target, dates
  - Actions: Edit, Send Reminder, Delete
  - Create/Edit modal with full form:
    - Name, Description, Type (Weekly/Monthly/Seasonal/Custom)
    - Target, Criteria Type (Listings/Sales/Revenue/Messages/Category-specific)
    - Start/End dates, Icon selector, Color selector
    - Badge reward settings (name, description, points)
    - Category restrictions for category-specific challenges

#### Admin Analytics Dashboard UI (`/admin/analytics`)
- **Frontend Page:**
  - `/app/frontend/app/admin/analytics.tsx`
  - Three tabs: Overview, Sellers, Engagement
  - **Overview Tab:**
    - Platform stats cards (Users, Listings, Transactions, Revenue)
    - Category Performance breakdown
  - **Sellers Tab:**
    - Seller metrics (Active, New, Avg Revenue, Avg Listings)
    - Top Sellers list with revenue, sales, listings
  - **Engagement Tab:**
    - Engagement stats (Messages, Favorites, Badges, Challenges)
    - Notification Performance with read rate progress bar
    - Quick Actions to other admin pages
- **API Integration:**
  - `GET /api/admin/analytics/platform`
  - `GET /api/admin/analytics/sellers`
  - `GET /api/admin/analytics/engagement`

#### Admin Index Page Updates (`/admin`)
- Added Challenges card with flag icon
- Added Analytics card with bar-chart icon
- 2x2 grid layout for navigation cards

### 2026-02-11: Past Seasonal Badges Gallery & Category Requirements Display
**COMPLETED**

#### Seasonal Badge Gallery (`/badges/seasonal-gallery`)
- **Frontend Page:**
  - `/app/frontend/app/badges/seasonal-gallery.tsx`
  - `/app/frontend/app/badges/_layout.tsx` - Layout file for badges routes
  - Hero section with sparkles icon
  - Year filter for browsing by year (chips style)
  - Stats card showing total/earned/completion percentage (for authenticated users)
  - Badge cards with icon, name, description, season indicator, points, earned count
  - Share button for individual badges
  - Empty state: "No Seasonal Badges Yet" with CTA to view challenges
  - Link to active challenges
- **API Integration:**
  - `GET /api/badges/past-seasonal` - Returns past seasonal badges with year filtering
  - Supports pagination and user earned status

#### Category Requirements Display on Challenges Page
- **UI Enhancement:**
  - Added pink "Required: category1, category2" badge to challenge cards
  - Shows only when challenge has `categories` array populated
  - Uses pricetag icon with pink background styling
  - Positioned between progress bar and footer for visibility
- **Files Modified:**
  - `/app/frontend/app/challenges.tsx` - Added categoriesContainer JSX and styles

### 2026-02-11: Backend Refactoring - Models & Routes Extraction
**COMPLETED**

#### Models Package Created (`/app/backend/models/`)
- `__init__.py` - Package exports for all models
- `user.py` - User, UserUpdate, UserSettings, ProfileUpdate, etc.
- `listing.py` - Listing, Category, CategoryAttribute, ListingCreate/Update
- `messaging.py` - Message, Conversation, MessageCreate
- `notification.py` - Notification, NotificationCreate, NotificationType
- `badge.py` - BadgeDefinition, UserBadge, Challenge, ChallengeProgress, UserStreak, Milestone

#### New Route Files Created (`/app/backend/routes/`)
- `badges.py` - Badge progress, showcase, unviewed count, milestones, leaderboard
- `streaks.py` - User streak info, streak leaderboard
- `challenges.py` - Challenge listing, joining, progress tracking

#### Existing Route Files (Previously Extracted)
- `auth.py` - Login, register, Google OAuth
- `users.py` - User profile endpoints
- `listings.py` - Listing CRUD operations
- `categories.py` - Category management
- `favorites.py` - User favorites
- `conversations.py` - Messaging system

#### Structure After Refactoring
```
/app/backend/
├── server.py          # Main app (still large, but improved organization)
├── models/            # NEW - Pydantic models
│   ├── __init__.py
│   ├── user.py
│   ├── listing.py
│   ├── messaging.py
│   ├── notification.py
│   └── badge.py
├── routes/            # Route handlers
│   ├── __init__.py
│   ├── auth.py
│   ├── users.py
│   ├── listings.py
│   ├── categories.py
│   ├── favorites.py
│   ├── conversations.py
│   ├── badges.py      # NEW
│   ├── streaks.py     # NEW
│   └── challenges.py  # NEW
└── services/
    ├── __init__.py
    └── badge_service.py
```

#### Admin Analytics Authentication Flow
- **UI Enhancement:**
  - Authentication check on page load
  - "Authentication Required" error screen with:
    - Lock icon (red)
    - Explanation text
    - "Go to Login" button (green)
    - "Go Back" button
  - Handles 401 errors from API gracefully
- **Files Modified:**
  - `/app/frontend/app/admin/analytics.tsx` - Added auth check and error UI

#### Admin Analytics Settings Tab
- **New Tab Added:** Settings tab alongside Overview, Sellers, Engagement
- **Seller Analytics Settings:**
  - Revenue Alert Threshold (€) - Alert when seller's monthly revenue drops
  - Low Performance Threshold (days) - Days of inactivity before flagging seller
- **Engagement Milestone Notifications (toggles):**
  - First Sale Celebration
  - 10 Listings Milestone
  - 100 Messages Milestone
  - Badge Achievement Alerts
- **Automated Notification Triggers (toggles):**
  - Inactive Seller Reminder
  - Low Engagement Alert
  - Challenge Deadline Reminder
  - Weekly Digest Email
- **Save Settings button** - Saves to `/api/admin/settings/seller-analytics` and `/api/admin/settings/engagement-notifications`

#### Seasonal Gallery Links Added
- **Leaderboard page** (`/leaderboard`):
  - "Browse Past Seasonal Badges" link at bottom
  - Pink styling with sparkles icon
- **Profile Badges page** (`/profile/badges`):
  - "Past Seasonal Badges" card with sparkles icon
  - "Browse limited-time badges from past events" subtitle

## What's Been Implemented

### 2026-02-10: Complete Subscription Backend
**COMPLETED**

#### Subscription Services Integration
- Invoice API endpoints (GET /api/invoices, GET /api/invoices/{id}, GET /api/invoices/{id}/html, POST /api/invoices/create/{transaction_id})
- Background task for checking expiring subscriptions (runs every 6 hours)
- Email notification integration with SendGrid for:
  - Premium activation confirmation
  - Subscription expiration reminders (7 days and 1 day before)
  - Premium expired notifications
- Invoice generation with HTML rendering

#### Frontend Payment Options
- PayPal checkout button (requires PayPal SDK for native)
- M-Pesa payment modal with phone number input
- Updated payment section with "or pay with" divider

### 2026-02-10: Complete Frontend UI for All Features
**COMPLETED**

#### Premium Subscription Purchase Flow
- Package selection cards (Monthly $29.99, Quarterly $79.99, Yearly $249.99)
- Stripe checkout integration with redirect
- PayPal and M-Pesa payment buttons added
- M-Pesa modal for phone number entry
- Success page (`/premium/success`) with payment verification
- Shows benefits and expiration date after successful purchase
- "Upgrade to Premium" button appears for verified (non-premium) profiles

#### Gallery Manager UI
- Image gallery with upload button (max 20 images, 5MB each)
- Horizontal scrollable image preview with delete option
- Video gallery with YouTube/Vimeo URL input
- Video thumbnails with title and delete option
- Expandable section to save space

#### Social Links Editor
- All platforms: Facebook, Instagram, Twitter/X, LinkedIn, YouTube, TikTok, WhatsApp, Website
- Color-coded icons for each platform
- Expandable section with collapsible header

#### Cover Image Upload
- 1200x400 banner preview area
- Upload/change cover button
- Displays above logo section

#### Admin UI Page (`/admin/business-profiles`)
- Stats overview: Total, Pending, Verified, Premium counts
- Search by name or identifier
- Filter tabs: All, Pending, Verified, Premium
- Profile cards with:
  - Logo, name, identifier, location, stats
  - Verification badges (Pending/Verified/Premium)
  - Owner information
  - Action buttons: Approve, Reject, Upgrade Premium, Revoke Premium, Activate/Deactivate

### Earlier Backend Features (Same Session)
- Stripe/PayPal/M-Pesa payment integration
- Gallery API endpoints
- Social links support
- Region coordinates
- Verification tiers system
- Featured sellers endpoint

## New Frontend Pages Created

### `/app/frontend/app/business/edit.tsx`
Complete business profile editor with:
- Cover image section
- Logo upload
- Basic info (name, description, categories, contact)
- Social links section (expandable)
- Gallery section (expandable)
- Premium upgrade section (for verified profiles)
- Verification status banner
- Multiple payment options (Stripe, PayPal, M-Pesa)

### `/app/frontend/app/admin/business-profiles.tsx`
Admin management page with:
- Stats dashboard
- Search and filter
- Profile list with action buttons
- Approve/Reject verification
- Upgrade/Revoke premium
- Activate/Deactivate profiles

### `/app/frontend/app/premium/success.tsx`
Payment success page with:
- Payment verification
- Benefits list
- Expiration date display
- Navigation to profile

## API Endpoints Summary

### Premium Subscription
- `GET /api/premium-subscription/packages`
- `POST /api/premium-subscription/stripe/checkout`
- `GET /api/premium-subscription/stripe/status/{session_id}`
- `POST /api/premium-subscription/paypal/checkout`
- `POST /api/premium-subscription/paypal/capture/{transaction_id}`
- `POST /api/premium-subscription/mpesa/stk-push`
- `GET /api/premium-subscription/my-subscription`

### Invoices
- `GET /api/invoices` - Get user's invoices
- `GET /api/invoices/{invoice_id}` - Get specific invoice
- `GET /api/invoices/{invoice_id}/html` - Get invoice as HTML
- `POST /api/invoices/create/{transaction_id}` - Create invoice for transaction

### Business Profile Gallery
- `GET /api/business-profiles/me/gallery`
- `POST /api/business-profiles/me/gallery/image`
- `DELETE /api/business-profiles/me/gallery/image/{image_id}`
- `POST /api/business-profiles/me/gallery/video`
- `DELETE /api/business-profiles/me/gallery/video/{video_id}`

### Admin
- `GET /api/admin/business-profiles/`
- `GET /api/admin/business-profiles/stats/overview`
- `POST /api/admin/business-profiles/{id}/verify`
- `POST /api/admin/business-profiles/{id}/upgrade-premium`
- `POST /api/admin/business-profiles/{id}/revoke-premium`
- `POST /api/admin/business-profiles/{id}/toggle-active`
- `POST /api/admin/subscriptions/check-renewals` - Admin: manually trigger renewal checks

## Tech Stack
- Frontend: React Native + Expo (web), TypeScript
- Backend: Python FastAPI, MongoDB


### 2026-02-12: Admin UI for Form Configuration
**COMPLETED**

#### Backend API Endpoints (Admin Dashboard)
- `GET /api/admin/form-config` - List all form configurations with filtering
  - Filters: `category_id`, `subcategory_id`, `config_type`, `is_active`
  - Pagination: `page`, `limit`
- `GET /api/admin/form-config/stats` - Get configuration statistics
  - Returns: total, active, inactive, by_type counts, categories_configured
- `POST /api/admin/form-config` - Create new configuration
  - Required: `category_id`, `config_type`, `config_data`
  - Optional: `subcategory_id`, `is_active`, `priority`
- `PUT /api/admin/form-config/{config_id}` - Update configuration
- `DELETE /api/admin/form-config/{config_id}` - Delete configuration
- `POST /api/admin/form-config/seed` - Seed default configurations

#### Public API Endpoint
- `GET /api/form-config/public` - Get active configs for frontend (no auth)
  - Returns: `placeholders`, `subcategory_placeholders`, `seller_types`, `preferences`, `visibility_rules`

#### Config Types Supported
1. **Placeholders** - Title/Description placeholders and labels per category
2. **Seller Types** - "Listed by" label and dropdown options
3. **Preferences** - Category-specific preferences (acceptsOffers, acceptsExchanges, negotiable)
4. **Visibility Rules** - Global rules for hiding price, showing salary, chat-only, etc.

#### Admin Dashboard UI (`/api/admin-ui/dashboard/form-config`)
- **Stats Cards**: Total Configs, Active count, Categories Configured, Config Types breakdown
- **Tabs**: All Configurations, Placeholders, Listed By Options, Preferences, Visibility Rules
- **Filter**: Category dropdown filter
- **Table Columns**: Category, Type (chip), Preview, Status (clickable), Priority, Actions
- **Actions**: Seed Defaults, Add Configuration, Edit, Delete, Toggle Active

#### Frontend Integration
- **Hook Created**: `/app/frontend/src/hooks/useFormConfig.ts`
  - Fetches from API with 5-minute cache
  - Falls back to static config (`listingFormConfig.ts`)
  - Exports: `getPlaceholders`, `getSellerTypes`, `shouldHidePrice`, `shouldShowSalaryRange`, `isChatOnlyCategory`, `shouldHideCondition`, `getCategoryPreferences`

#### Database Schema (MongoDB)
```javascript
form_configs: {
  category_id: String,      // e.g., "auto_vehicles", "properties"
  subcategory_id: String,   // Optional, for subcategory-specific config
  config_type: Enum,        // "placeholder", "seller_type", "preference", "visibility_rule"
  config_data: Object,      // Type-specific configuration
  is_active: Boolean,
  priority: Number,         // Higher = more priority
  created_at: DateTime,
  updated_at: DateTime,
  created_by: String
}
```

#### Default Configurations Seeded (17 total)
- 8 Placeholder configs (default, auto_vehicles, properties, jobs_services, etc.)
- 6 Seller Type configs (default, properties, auto_vehicles, etc.)
- 2 Preference configs (friendship_dating, jobs_services)
- 1 Visibility Rule config (global)

#### Testing
- Backend: 18/18 API tests passed
- Frontend: All UI features verified (tabs, dialogs, filters, CRUD operations)

---

### 2026-02-12: Admin Preview Mode for Form Configuration
**COMPLETED**

#### Feature Overview
Added a "Preview Mode" button to the Admin Form Config page that lets admins see how their configurations will appear in the actual listing form. This helps admins visualize the impact of their configuration changes before users encounter them.

#### Implementation Details
- **Preview Mode Button**: Added to the Form Config page header (blue outlined button with preview icon)
- **Preview Dialog**: Full-featured dialog showing simulated listing form
- **Category Selector**: Dropdown to select which category to preview (15 categories available)
- **Dynamic Preview Content**:
  - Title and Description fields with category-specific placeholders
  - Condition chips (hidden for certain categories)
  - Price field (hidden for Friendship & Dating)
  - "Listed by" dropdown with category-specific options
  - Contact Methods section (shows "Chat only" for certain categories)
  - Preferences toggles (Accept Offers, Accept Exchanges, Price Negotiable)
- **Active Configuration Summary**: Shows status of each config type for the selected category
- **Filter Button**: "Filter Configs for This Category" button to quickly filter the main table

#### Key Files Modified
- `/app/admin-dashboard/frontend/src/app/dashboard/form-config/page.tsx`: Added Preview Mode button, dialog, and getPreviewData function

#### Testing
- All 12 features tested and verified working (100% pass rate)
- Test report: `/app/test_reports/iteration_105.json`

---

### 2026-02-12: Copy as JSON, Form Validation Banner, Location Manager Verification
**COMPLETED**

#### Features Implemented

**1. Copy as JSON Button (Admin Preview Mode)**
- Added "Copy as JSON" button to the Preview Mode dialog footer
- Exports complete category configuration including placeholders, seller types, preferences, visibility rules
- Shows "Copied!" feedback on successful copy
- Useful for backup, migration, or debugging configurations

**2. Form Validation Error Banner**
- Created `ErrorBanner` component that displays at top of listing creation form
- Features:
  - Animated slide-in effect
  - Shows error count with descriptive subtitle
  - Lists up to 3 specific errors with "+N more" indicator
  - Close button for manual dismiss
  - Auto-dismiss after 5 seconds
  - Scrolls to top when errors occur
- Replaces Alert.alert() for better UX on web

**3. Location Manager (Already Implemented - Verified)**
- Full hierarchical location management: Country > Region > District > City
- Statistics dashboard: 13 Countries, 60 Regions, 79 Districts, 130 Cities
- Admin CRUD operations for all location levels
- Features: Bulk Update, Import, Export, Table/Map views
- Dynamic admin management confirmed working

#### Key Files Modified
- `/app/admin-dashboard/frontend/src/app/dashboard/form-config/page.tsx`: Added copyConfigToClipboard function, Copy as JSON button
- `/app/frontend/app/post/index.tsx`: Added ErrorBanner component, showErrorBanner state, auto-dismiss logic

#### Testing
- All features tested and verified (100% pass rate)
- Test report: `/app/test_reports/iteration_106.json`

---

### 2026-02-12: Import from JSON Feature
**COMPLETED**

#### Feature Overview
Added an "Import from JSON" button to the Admin Form Config page's Preview Mode dialog, allowing admins to import category configurations from JSON files. This complements the existing "Copy as JSON" functionality for easy backup/restore and configuration migration.

#### Implementation Details
- **Import Button**: Added next to "Copy as JSON" button in Preview Mode dialog footer
- **File Input**: Hidden file input accepts `.json` and `application/json` files
- **Validation**: Validates JSON structure (requires `category_id` and `configuration` object)
- **Import Logic**: 
  - Imports placeholders (title, titleLabel, description, descriptionLabel)
  - Imports seller type (label, options)
  - Imports preferences (acceptsOffers, acceptsExchanges, negotiable)
  - Imports visibility rules (hidePrice, chatOnly, hideCondition)
- **UI Feedback**: Shows loading spinner during import, success/error states
- **Auto-refresh**: Refreshes config list and stats after successful import

#### Key Files Modified
- `/app/admin-dashboard/frontend/src/app/dashboard/form-config/page.tsx`:
  - Added `FileUpload` and `ErrorIcon` imports
  - Added import state variables (`importLoading`, `importError`, `importSuccess`)
  - Added `handleImportJson` callback function (validates and imports JSON)
  - Updated DialogActions with Import from JSON button

#### Testing
- All features tested and verified (100% pass rate)
- Test report: `/app/test_reports/iteration_107.json`

---

## Upcoming Tasks (Priority Order)

### P2: Refactor AnimatedIcon Components
- ~~Merge duplicate `AnimatedIcon` and `DesktopAnimatedIcon` components in `frontend/src/components/AnimatedIcon.tsx`~~
- **RESOLVED**: Investigation found no duplicate AnimatedIcon components exist. The `AnimatedIconBox` component is properly contained within `/app/frontend/app/listing/[id].tsx` and doesn't need refactoring.

### Low Priority/Backlog
- MUI Grid v2 migration (deprecated props warnings)
- Chart width/height console warnings fix

- Payments: Stripe, PayPal, M-Pesa
- Storage: Base64 images in MongoDB
- Email: SendGrid for subscription notifications

## Status

### Recently Completed (2026-02-12)

#### Import from JSON Feature ✅
- Added "Import from JSON" button to Admin Form Config Preview Mode dialog
- Validates JSON structure and imports placeholders, seller types, preferences, visibility rules
- Test report: `/app/test_reports/iteration_107.json`

#### Photography Guides Admin Feature ✅
- **Admin Dashboard Page**: `/api/admin-ui/dashboard/photography-guides`
  - Stats cards (Total, Active, With Images, Categories)
  - Guides table with category filtering
  - Add/Edit/Delete guide functionality
  - Icon picker with common Ionicons
  - Image upload (base64, max 2MB)
  - Seed Defaults button (creates 36 default guides across 9 categories)
- **Backend APIs**:
  - Public: `GET /api/photography-guides/public/{category_id}` - Fetch guides for frontend
  - Admin CRUD: List, Create, Update, Delete, Get single, Stats, Seed
- **Frontend Integration (2026-02-12)**:
  - Created `usePhotographyGuides` hook (`/app/frontend/src/hooks/usePhotographyGuides.ts`)
  - Post listing form now displays admin-managed photo tips when category is selected
  - Fallback to static config if API fails
  - Cache with 5-minute TTL for performance
- **Files Modified**:
  - `/app/admin-dashboard/frontend/src/app/dashboard/photography-guides/page.tsx` (Created)
  - `/app/admin-dashboard/frontend/src/app/dashboard/layout.tsx` (Added sidebar link)
  - `/app/admin-dashboard/backend/server.py` (Added photography guides endpoints)
  - `/app/backend/server.py` (Added public proxy endpoint)
  - `/app/frontend/src/hooks/usePhotographyGuides.ts` (Created - new hook)
  - `/app/frontend/app/post/index.tsx` (Integrated hook, updated photo tips display)
- Test reports: `/app/test_reports/iteration_108.json`, `/app/test_reports/iteration_109.json`

### Completed ✅
- [x] Payment integration backend (Stripe, PayPal, M-Pesa)
- [x] Business profile verification tiers
- [x] Featured sellers section
- [x] Region coordinates
- [x] Gallery system (backend + frontend)
- [x] Social links (backend + frontend)
- [x] Cover image upload
- [x] Premium subscription UI with multiple payment options
- [x] Admin management page
- [x] Invoice API endpoints
- [x] Subscription auto-renewal background task
- [x] Email notifications for payment events (SendGrid)
- [x] My Invoices page in user profile section
- [x] SEO sitemap for business profiles (/api/sitemap.xml, /api/robots.txt)
- [x] Premium badge on invoices page for premium users
- [x] Share Profile feature with OG meta tags for social media preview
- [x] Success modal after saving business profile with profile URL
- [x] Image selection before profile save (uploaded after creation)
- [x] QR code generation in success modal for business profile sharing
- [x] Admin Users tab with sections: All Users, Verified Sellers, Verified Business, Premium Business
- [x] Email notifications for admin-initiated verification and premium upgrade
- [x] Notification preferences page with opt-in/out for email types
- [x] Push notification support with Firebase Cloud Messaging (FCM)
- [x] Voucher/Discount System (Amount, Percent, Credit types with rich restrictions)
- [x] Listing Moderation System (Validate/Reject/Remove with queue)
- [x] User Listing Limits (Tier-based with custom overrides)
- [x] Advanced SEO Meta Tags Management
- [x] URL Masking/Shortening with analytics
- [x] Polls, Surveys & Feedback System
- [x] Cookie Consent Management (GDPR)
- [x] reCAPTCHA Configuration (v2/v3/invisible)
- [x] WebP Image Conversion
- [x] Invoice PDF Generation

### 2026-02-10: Admin UI Pages for Vouchers & Listing Moderation
**COMPLETED**

#### Admin Voucher Management (`/dashboard/vouchers`)
- Stats cards: Total Vouchers, Active Vouchers, Total Redemptions, Total Discounts Given
- Voucher table with Code, Type, Value, Usage, Status, Valid Until columns
- Create voucher dialog with:
  - Code, Type (Amount/Percent/Credit), Value
  - Max uses, Max uses per user
  - Min order amount, Max discount amount
  - Valid until date
  - Restrictions: New users only, Verified only, Premium only, Stackable
- Edit voucher with all editable fields
- View voucher details with usage history
- Delete voucher with confirmation
- Status/Type filters
- **Bulk CSV Import** with template download

#### Admin Listing Moderation (`/dashboard/listing-moderation`)
- Three tabs: Moderation Queue, Moderation Log, Settings
- Moderation Queue:
  - Pending/Approved/Rejected filter
  - Bulk selection with checkboxes
  - Listing cards with image, title, user info, price
  - Quick actions: Approve, Reject, Remove
  - Bulk actions: Approve All, Reject All, Remove All
- Moderation Log:
  - History of all moderation actions
  - Admin email, action, reason, timestamp
- Settings Tab:
  - Enable Listing Moderation toggle
  - Require Moderation for New Listings
  - Auto-approve Verified Users
  - Auto-approve Premium Users
  - Default Tier selection
  - Tier limits configuration (Free, Basic, Premium)
  - Save Settings button

### 2026-02-10: Full Admin Tools Suite
**COMPLETED**

#### SEO Tools (`/dashboard/seo-tools`)
- **Meta Tags Tab**: Page-specific meta tags management (title, description, keywords, OG tags, robots)
- **Global Settings Tab**: Site name, description, Twitter handle, OG image, Google Analytics/GTM/FB Pixel IDs
- **Sitemap Tab**: Auto-generate toggle, include options (listings, categories, profiles), change frequency, regenerate button

#### Polls & Surveys (`/dashboard/polls-surveys`)
- Create feedback forms, surveys, and quick polls
- Support for app feedback and feature improvement collection
- Multiple question types: Text, Rating (1-5), Multiple Choice
- Target audience filtering (all/verified/premium users)
- Response export to JSON
- Active/Inactive toggle

#### Cookie Consent (`/dashboard/cookie-consent`)
- **Banner Settings**: Enable toggle, banner text, policy URLs, preference customization
- **Categories Tab**: Manage cookie categories (Necessary, Analytics, Marketing, Preferences)
- **Appearance Tab**: Position, theme, button text customization
- Statistics dashboard with consent tracking

#### URL Shortener (`/dashboard/url-shortener`)
- Create short URLs with custom codes
- Click tracking with analytics
- Stats cards: Total URLs, Active URLs, Total Clicks
- Expiration date support

#### reCAPTCHA (`/dashboard/recaptcha`)
- v2 Invisible configuration (as requested)
- Site key and secret key management
- Protected forms selection (Login, Register, Contact, Checkout, etc.)
- Score threshold for v3

#### Image Settings (`/dashboard/image-settings`)
- **WebP Conversion**: Auto-convert toggle, quality slider (10-100%)
- Max dimensions and thumbnail size configuration
- Allowed formats selection
- **Batch Conversion**: Convert existing listing/profile images to WebP
- Stats: Image counts by type

#### A/B Testing Framework (`/dashboard/ab-testing`)
- **Experiment Management**: Create, start, pause, stop experiments
- **Variant Configuration**: Multiple variants with traffic % allocation
- **Assignment Types**: Cookie-based (anonymous) + User-based (logged-in) with fallback
- **Experiment Types**: Feature flags, Cookie banner, Polls, CTA buttons, UI elements
- **Goal Metrics Tracked**:
  - Conversion rates
  - Click-through rates
  - Consent rates
  - Custom events
- **Statistical Analysis**: Automatic significance calculation (z-test)
- **Results Dashboard**: Per-variant stats, improvement %, winner declaration
- **Smart Winner (Auto-Detection)**:
  - Enable per experiment to auto-detect winners
  - Strategies: Notify Only (default), Auto-Rollout, Gradual Rollout
  - Configurable minimum runtime (default 48 hours)
  - "Check Winners" button for manual trigger
  - Admin notification when significant winner is found
  - Safeguards: Minimum sample size, minimum runtime
  - **Scheduled Auto-Checking**: Background job runs every 6 hours (configurable via `AB_CHECK_INTERVAL_HOURS` env var)
  - Scheduler status indicator shows last check time and next check
  - Logs all checks to `scheduled_jobs_log` collection
  - **Email Notifications**: Configurable recipient email list per experiment for winner alerts via SendGrid
- **Public APIs**: `/api/ab/assign` for variant assignment, `/api/ab/track` for event tracking

### 2026-02-10: A/B Testing Email Notifications & Session Fix
**COMPLETED**

#### A/B Test Winner Email Notifications
- Added notification emails input field in the A/B test creation dialog (Smart Winner section)
- Admins can specify comma-separated email addresses to receive alerts when a winner is found
- Emails are parsed and stored as an array in the experiment's smart_winner.notification_emails config
- Backend sends emails via SendGrid when winner is detected (manual trigger or scheduled check)

#### Admin Session Timeout Fix
- Increased JWT_ACCESS_TOKEN_EXPIRE_MINUTES from 30 to 480 (8 hours)
- Prevents frequent re-authentication during admin sessions

### 2026-02-10: Credits Page Design Improvements
**COMPLETED**

#### Mobile App Improvements
- Added package selection highlighting with visual feedback (blue border, shadow, checkmark icon)
- Package cards show "Select" button that changes to "Purchase Now" when selected
- Improved button styling with gray for unselected, green for selected packages
- Added spring animation effect when selecting a package (scale bounce)

#### Desktop Layout Improvements
- Added 1280px max-width constraint for desktop view (viewport >= 768px)
- Content is now centered on wide screens
- Improved payment method grid layout for desktop
- Packages displayed in a responsive flex row on desktop
- Info items displayed in a responsive row on desktop

#### Savings Comparison Feature
- "SAVE X%" badge displayed on larger packages (pink badge with trending-down icon)
- "BEST VALUE" orange badge on the package with highest savings percentage (currently Pro Pack at 29%)
- Save amount shown below price with percentage (e.g., "Save $2.00 (17% off)")
- Price per credit displayed for each package (e.g., "$0.100 per credit")
- Savings calculated by comparing to the base (smallest) package

#### Desktop Header
- New desktop header with "Credits Store" title and subtitle
- Wallet icon with green background
- Balance display in the header (right side)
- "Back" button with icon on the left
- Balance card hidden on desktop (shown only in header)

#### Hover Effects (Desktop)
- Package cards have hover effect (border change, slight scale up)
- Best deal package has orange theme (border, button, savings text)

#### Desktop Profile Enhancements
- Added "Credits & Boosts" section in Desktop Profile (authenticated users only)
- "Buy Credits" button with wallet icon - navigates to /credits
- "Boost Listings" button with rocket icon - navigates to /profile/my-listings
- Section appears between "Your Activity" and "Trust & Identity" sections

### 2026-02-11: Multiple UI Improvements & Admin Invoices
**COMPLETED**

#### Redirection After Sign-in (Fixed)
- Fixed redirect for /post (now redirects back after login)
- Fixed redirect for /messages (Sign In and Register buttons)
- Fixed redirect for /offers (unauthenticated view)
- Fixed redirect for listing page make offer action

#### Input Field Focus Styling (Fixed)
- Added global CSS to remove black rectangle focus outline
- Input/textarea/select fields now have clean focus without black borders

#### Desktop Headers Added
- Offers page: Added dedicated header with icon and contextual subtitle
- Boost page: Added desktop header with credits display
- Credits page: Already had header (completed earlier)

#### Desktop Navigation Links (Completed)
- Added nav links to Offers, Messages, Saved pages (My Listings, Messages, Saved, Offers)
- Links highlight when active based on pathname
- Redirects added for unauthenticated users on Sign In/Up buttons

#### Messages Mobile Filter Chips (Fixed)
- Changed FilterTabs from View to ScrollView for horizontal scrolling
- Filter chips (All, Unread, Buying, Selling) now scroll horizontally on narrow screens
- Added proper contentContainerStyle for padding

#### Category Page Sticky Fix (Fixed)
- Only category title header stays sticky at top
- Subcategory chips, filters bar, and active filters now scroll with listings content
- Improved mobile UX by reducing header space consumption

#### My Listings Mobile Responsiveness (Improved)
- Increased listing image size (90x90)
- Better spacing and alignment
- Improved status badges and stats layout

#### Admin Invoices Feature (NEW)
- Created invoices management page at /dashboard/invoices
- Features: View all invoices, filter by status/type/date, search
- Stats cards: Total invoices, revenue, paid/pending counts
- PDF download functionality (generates HTML invoice for printing)
- Added navigation link in admin sidebar

### Future/Backlog
- [ ] SMS Notifications for A/B Test Winners (Twilio integration)
- [ ] PayPal SDK button integration on native platforms
- [ ] M-Pesa callback handling in production (Safaricom API)
- [ ] End-to-end user flow test (create -> verify -> premium upgrade)
- [ ] Region search bar visibility fix in LocationPicker

## Testing Status
- Backend: 100% (All tests passed)
- Frontend: 95% (All UI flows verified)
- Test reports: `/app/test_reports/iteration_102.json` (Icons Management Migration to Admin Dashboard)
- Previous test reports: `/app/test_reports/iteration_101.json` (Icon Animations, Color Picker, ESLint Fix)

### 2026-02-12: Multiple UI/Admin Improvements (Continued)
**COMPLETED**

#### Additional Tasks Completed:

**Task: Category-specific Safety Tips Defaults**
- Added `friendship_dating` and `community` categories to safety tips defaults
- Safety tips now show category-specific tips on listing detail pages:
  - Auto & Vehicles: Test drive, verify documents, mechanic inspection
  - Properties: Visit in person, verify ownership, sign agreement
  - Electronics: Test item, check warranty, meet in public
  - Friendship & Dating: Meet in public, tell someone, trust instincts
  - And more for all 15 categories

**Task: Preview Feature for Safety Tips Admin**
- Added Preview dialog to Safety Tips admin page (`/api/admin-ui/dashboard/safety-tips`)
- Shows mobile and desktop preview of how tips appear on listing pages
- Category selector to preview tips for different categories

**Task: Similar Listings Price Color**
- Changed price color from text color to green (`COLORS.primary`) in SimilarListings component
- Location: `/app/frontend/src/components/property/SimilarListings.tsx`

**Task: Friendship & Dating Subcategories**
- Added full `FRIENDSHIP_DATING_CATEGORY` config with 16 subcategories:
  - Friendship & Social, Looking for Friends, Professional Networking
  - Roommate Search, Study Buddies, Dating & Relationships
  - Casual Dating, Dating & Romance, Long-term Relationship
  - Faith-based Dating, Mature Dating (40+), Activity Partners
  - Travel Companions, Gaming Partners, Language Exchange
- Added `COMMUNITY_CATEGORY` config with 6 subcategories:
  - Local Events, Clubs & Groups, Volunteering
  - Lost & Found, Announcements, Rideshare & Carpool
- Location: `/app/frontend/src/config/subcategories.ts`

### 2026-02-12: Multiple UI/Admin Improvements
**COMPLETED**

#### Task 1: Ionicon Name Display in Admin Panel
- Updated icon selector in `/app/admin-dashboard/frontend/src/app/dashboard/icons/page.tsx` 
- Added editable TextField showing ionicon name with monospace font
- Click anywhere else to open icon picker dialog

#### Task 2: Removed "Get Direction" and "Share Location" from Listing Details
- Removed action buttons from LocationSection in `/app/frontend/app/listing/[id].tsx`
- Buttons were removed from both mobile and desktop views

#### Task 3: Listing ID Shows 8 Characters
- Updated SafetySection and desktop view to show first 8 characters of listing ID in uppercase
- Format: `ID: XXXXXXXX` (e.g., `ID: 4EA1BB66`)

#### Task 4: Removed Filter Chips from Similar Listings
- Removed "Same City", "Similar Price", "Verified Only" filter chips from SimilarListings component
- Location: `/app/frontend/src/components/property/SimilarListings.tsx`

#### Task 5: WhatsApp/Call Icons Conditional Display
- Updated listing cards in SimilarListings to show contact icons only if seller has those methods enabled
- Call icon: Shows if `listing.seller?.phone` exists
- WhatsApp icon: Shows if `listing.seller?.whatsapp` or `listing.seller?.phone` exists

#### Task 6: Category-Specific Safety Tips with Admin Management
- Created Safety Tips API at `/app/backend/routes/safety_tips.py` with full CRUD
- Created Admin Dashboard page at `/app/admin-dashboard/frontend/src/app/dashboard/safety-tips/page.tsx`
- Added "Safety Tips" menu item to admin sidebar
- Created `useSafetyTips` hook for frontend at `/app/frontend/src/hooks/useSafetyTips.ts`
- Updated SafetySection component to display dynamic category-specific tips
- Default tips provided for 13 categories (auto, properties, electronics, etc.)

#### Task 7: Cleanup
- Deleted old icons page: `/app/frontend/app/admin/icons.tsx`

### API Endpoints Added
- `GET /api/safety-tips/public/{category_id}` - Get tips for a category (public)
- `GET /api/safety-tips/defaults` - Get all default tips
- `GET /api/safety-tips` - Get all tips (admin)
- `GET /api/safety-tips/stats` - Get statistics (admin)
- `POST /api/safety-tips` - Create tip (admin)
- `PUT /api/safety-tips/{tip_id}` - Update tip (admin)
- `DELETE /api/safety-tips/{tip_id}` - Delete tip (admin)
- `POST /api/safety-tips/bulk` - Bulk create tips (admin)
- `POST /api/safety-tips/seed` - Seed default tips (admin)
- `PUT /api/safety-tips/reorder/{category_id}` - Reorder tips (admin)

### 2026-02-12: Icons Management Migration to Admin Dashboard
**COMPLETED**

#### Migration Summary
Moved icons management from the Expo/React Native frontend (`/admin/icons`) to the Next.js admin dashboard (`/api/admin-ui/dashboard/icons`).

#### New Admin Dashboard Page (`/app/admin-dashboard/frontend/src/app/dashboard/icons/page.tsx`)
- **Stats Cards**: Total Icons, Active, Category Icons, Attribute Icons (calculated from icons list as fallback)
- **Action Buttons**: Refresh, Seed Default Icons, Create Icon
- **Filter Section**: Search field, Category dropdown, Type dropdown, Apply Filters button
- **Icons Table**: Icon preview, Name, Ionicon identifier, Type badge, Category, Color (with hex preview), Status, Edit/Delete actions
- **Create/Edit Dialog**: 
  - Name and Attribute Name fields
  - Icon picker with searchable grid of Ionicons
  - Icon Type selector (Category/Subcategory/Attribute)
  - Category dropdown with Global option
  - Color picker with 8 predefined swatches + custom hex input
  - Description field
- **Icon Picker Dialog**: Searchable grid of ~100+ Ionicons

#### Sidebar Update (`/app/admin-dashboard/frontend/src/app/dashboard/layout.tsx`)
- Added "Attribute Icons" menu item with InterestsOutlined icon
- Positioned after "Attributes" and before "Location Manager"

#### Key Implementation Details
- Uses MUI components (Table, Dialog, Card, Grid, Avatar, etc.)
- Ionicons loaded via web component script from unpkg CDN
- Stats calculated locally from icons list when /api/attribute-icons/stats returns 401
- All CRUD operations use admin_token from localStorage

### 2026-02-12: Attribute Icons Management System
**COMPLETED**

#### Backend API (`/app/backend/routes/attribute_icons.py`)
- **Public Endpoints (no auth):**
  - `GET /api/attribute-icons/public` - Get all active icons with filtering
  - `GET /api/attribute-icons/ionicons` - Get list of 154 available Ionicons
  - `GET /api/attribute-icons/by-category/{category_id}` - Get icons for a category
  - `GET /api/attribute-icons/by-attribute` - Get icon for specific attribute
  - `GET /api/attribute-icons/public/{icon_id}` - Get single icon

- **Admin Endpoints (auth required):**
  - `GET /api/attribute-icons` - Paginated list with search/filters
  - `GET /api/attribute-icons/stats` - Icon statistics
  - `POST /api/attribute-icons` - Create new icon
  - `PUT /api/attribute-icons/{icon_id}` - Update icon
  - `DELETE /api/attribute-icons/{icon_id}` - Soft delete icon
  - `DELETE /api/attribute-icons/{icon_id}/permanent` - Permanent delete
  - `POST /api/attribute-icons/{icon_id}/restore` - Restore deleted icon
  - `POST /api/attribute-icons/seed` - Seed 73 default icons
  - `POST /api/attribute-icons/bulk-create` - Bulk create icons
  - `POST /api/attribute-icons/assign` - Assign icon to attribute
  - `GET /api/attribute-icons/mappings` - Get organized icon mappings

#### Frontend Admin Panel (`/app/frontend/app/admin/icons.tsx`)
- Stats cards: Total, Active, Category count, Attribute count
- "Seed Default Icons" button for initial setup
- Search and filter by category/type
- Icon grid with:
  - Ionicon preview
  - Name, ionicon identifier, type badge
  - Category label
  - Edit/Delete buttons
- Create/Edit modal with:
  - Icon picker (visual grid of 154 Ionicons)
  - Type selector (Category/Subcategory/Attribute)
  - Category selector (horizontal scroll chips)
  - Attribute name input
  - Color picker
  - Description field

#### Default Icons Seeded (73 total)
- **Auto & Vehicles:** Car Make, Model, Year, Mileage, Fuel Type, Transmission, Body Type, Engine Size, Color, Doors, Registered
- **Properties:** Property Type, Bedrooms, Bathrooms, Size, Floor, Parking, Furnished, Available From, Pets Allowed, Balcony, Elevator
- **Electronics:** Type, Brand, Model, Processor, RAM, Storage, Graphics, Screen Size, Warranty, Original Box
- **Phones & Tablets:** Brand, Model, Storage, Color, Battery Health, Carrier Lock
- **Fashion & Beauty:** Clothing Type, Gender, Brand, Size, Color, Material
- **Jobs & Services:** Job Title, Job Type, Industry, Experience, Salary Range, Remote Work
- **Pets:** Breed, Age, Gender, Vaccinated
- **Global:** Price, Title, Description, Location, Condition, Negotiable
- **Category Icons:** 13 main category icons

#### Admin Dashboard Update
- Added "Attribute Icons" card to admin index page
- Uses `shapes` Ionicon with purple styling

### 2026-02-12: Public Display of Attribute Icons
**COMPLETED**

#### Feature Overview
Display attribute icons on public-facing listing detail pages to enhance UX by showing visual cues for each attribute field.

#### Frontend Implementation
- **Custom Hook**: `/app/frontend/src/hooks/useAttributeIcons.ts`
  - Fetches icons from `/api/attribute-icons/public` endpoint
  - Caches icons globally with 5-minute TTL
  - Provides `getIconForAttribute(attributeName, categoryId)` function
  - Provides `getIconColorForAttribute(attributeName, categoryId)` function for custom colors
  - Includes intelligent default icons for common attributes
  - Exports `ICON_COLOR` constant (#2E7D32 - green)

- **Listing Detail Page**: `/app/frontend/app/listing/[id].tsx`
  - Updated `KeyDetailsSection` component (mobile view) to display icons
  - Updated desktop details grid to display icons
  - Icons appear BEFORE attribute labels as requested
  - Icon color: Green (#2E7D32) or custom color from admin
  - Icon background: Light green (#E8F5E9)

#### Icon Display
- Icons are displayed in a rounded box (8px border-radius)
- Box size: 36x36 (mobile), 32x32 (desktop)
- Icons positioned before attribute labels in a row layout
- Green color matches the app's primary theme

#### Icon Animation (Added 2026-02-12)
- **AnimatedIconBox component**: Icons animate on page load with subtle bounce effect
- Uses React Native Animated API with spring physics
- Animation settings: friction=4, tension=100, start scale=0.3
- Staggered delay: 80ms per icon creates cascade effect
- Both mobile and desktop views have animated icons

#### Admin Color Customization (Added 2026-02-12)
- Admin panel at `/admin/icons` now has color picker UI
- 8 predefined color swatches for quick selection
- Custom hex color input field
- Color preview shows selected icon with chosen color
- Custom colors are stored in database and applied on public pages

#### ESLint Fix (Added 2026-02-12)
- Fixed TypeScript parsing error in `/app/frontend/eslint.config.js`
- Simplified config to use expo-config-expo/flat which includes @typescript-eslint/parser
- No more "interface is reserved keyword" errors

#### Verified Features
- Desktop view: Icons visible in Details grid section ✅
- Mobile view: Icons visible in KeyDetailsSection component ✅
- Icon color: Green (#2E7D32) ✅
- Icon background: Light green (#E8F5E9) ✅
- Icons before labels: Icon box on left, label/value on right ✅
- API endpoint: /api/attribute-icons/public returns 73 icons ✅
- Default fallback: Uses information-circle-outline for unknown attributes ✅
- Icon bounce animation: Working with spring physics ✅
- Admin color picker: 8 swatches + hex input ✅
- ESLint TypeScript parsing: Fixed ✅

#### Sample Icons Mapping
- `year` → calendar-outline
- `mileage` → speedometer-outline
- `fuel_type` → water-outline
- `transmission` → settings-outline
- `make` → ribbon-outline
- `model` → car-sport-outline
- `condition` → star-outline
- `category` → folder-outline

## Key Admin UI Pages
- `/app/admin-dashboard/frontend/src/app/dashboard/vouchers/page.tsx` - Voucher management
- `/app/admin-dashboard/frontend/src/app/dashboard/listing-moderation/page.tsx` - Listing moderation

## Email Notifications
The system now sends the following emails (via SendGrid):
- **profile_verified**: When admin approves a business profile verification
- **profile_verification_rejected**: When admin rejects a verification with reason
- **admin_premium_upgrade**: When admin upgrades a profile to premium
- **premium_activated**: When user pays for premium subscription
- **renewal_reminder**: 7 days and 1 day before premium expiration
- **subscription_expired**: When premium subscription expires

**Note:** All non-transactional emails respect user notification preferences. Users can opt-out via `/profile/notifications`.

## Push Notifications (FCM)
Push notification support via Firebase Cloud Messaging:
- **Backend**: `/app/backend/push_notification_service.py` - Device token management, FCM integration
- **Frontend**: `/app/frontend/src/utils/pushNotifications.ts` - Expo notifications utility
- **API Endpoints**:
  - `POST /api/push/register-token`: Register device push token
  - `DELETE /api/push/unregister-token`: Unregister device token
  - `GET /api/push/status`: Get push notification status
  - `POST /api/push/test`: Send test notification
  - `GET /api/push/templates`: Get available templates
  - `POST /api/admin/push/send`: Admin bulk push endpoint
- **Templates**: new_message, order_confirmed, profile_verified, profile_rejected, premium_activated, premium_expiring, listing_sold, price_drop, promotion

**Setup Required:**
1. Create Firebase project at https://console.firebase.google.com
2. Download service account JSON and save to `/app/backend/secrets/firebase-admin.json`
3. Or set `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable with JSON string

## Notification Preferences API
- `GET /api/notification-preferences`: Get user's preferences
- `PUT /api/notification-preferences`: Update preferences
- `POST /api/notification-preferences/unsubscribe-all`: Unsubscribe from marketing
- `GET /api/notification-preferences/categories`: Get preference categories with descriptions

## Key Files Reference
- `/app/frontend/app/business/edit.tsx` - Full business profile editor with payment buttons
- `/app/frontend/app/admin/business-profiles.tsx` - Admin management
- `/app/frontend/app/premium/success.tsx` - Payment success page
- `/app/frontend/app/profile/invoices.tsx` - My Invoices page
- `/app/backend/premium_subscription_system.py` - Payment integration
- `/app/backend/subscription_services.py` - Email, Auto-Renewal, Invoices
- `/app/backend/business_profile_system.py` - Gallery & profiles

## Environment Variables
```
STRIPE_API_KEY=sk_test_xxx (configured)
PAYPAL_CLIENT_ID=xxx (optional)
MPESA_CONSUMER_KEY=xxx (optional)
MPESA_CONSUMER_SECRET=xxx (optional)
SENDGRID_API_KEY=xxx (configured)
```



### 2026-02-11: Admin Badge Management & Desktop Navigation

**COMPLETED**

#### Admin Badge Management System
- Full CRUD for badges with fields: name, description, icon, color, type, criteria, auto_award, points_value, **display_priority** (user-requested), is_active
- Badge types: achievement, verification, premium, trust, special
- Award/Revoke badges from users
- User badges list with search and pagination
- Admin dashboard page at `/dashboard/badges`
- Navigation link added to admin sidebar

**API Endpoints:**
- `GET /api/admin/badges`: List all badges with stats
- `POST /api/admin/badges`: Create new badge
- `PUT /api/admin/badges/{id}`: Update badge
- `DELETE /api/admin/badges/{id}`: Delete badge
- `GET /api/admin/badges/users`: List user badges
- `POST /api/admin/badges/award`: Award badge to user
- `DELETE /api/admin/badges/users/{id}`: Revoke user badge
- `GET /api/admin/users/search`: Search users by email/name

**Key Files:**
- `/app/admin-dashboard/backend/server.py` - Badge API endpoints (lines 7377-7636)
- `/app/admin-dashboard/frontend/src/app/dashboard/badges/page.tsx` - Admin UI
- `/app/admin-dashboard/frontend/src/app/dashboard/layout.tsx` - Sidebar with Badges link

#### Desktop Navigation Pattern
- Applied consistent top-bar navigation to `profile/my-listings.tsx`
- Navigation links: My Listings, Messages, Saved, Offers
- Created reusable `DesktopHeader` component at `/app/frontend/src/components/layout/DesktopHeader.tsx`
- Exported from `/app/frontend/src/components/layout/index.ts`

### 2026-02-11: Public Profile Badge Visibility & Code Refactoring

**COMPLETED**

#### Public Profile Badge Visibility
- Added `GET /api/profile/public/{user_id}/badges` endpoint to main backend
- Displays user achievement badges on public profile page (both desktop and mobile views)
- Badges sorted by display_priority (higher priority first)
- Badge UI shows icon, name, and custom color styling
- Only shows Achievements section when user has badges

**Key Files:**
- `/app/backend/server.py` - Public badges endpoint (lines 3432-3490)
- `/app/frontend/app/profile/public/[id].tsx` - Achievement badges display (desktop: lines 554-574, mobile: lines 935-955)

#### Code Refactoring - DesktopHeader Component
- Created shared `DesktopHeader` component to reduce code duplication
- Refactored pages to use shared component:
  - `offers.tsx` - Removed inline renderGlobalHeader, uses DesktopHeader
  - `(tabs)/messages.tsx` - Uses DesktopHeader
  - `profile/saved.tsx` - Uses DesktopHeader  
  - `(tabs)/saved.tsx` - Uses DesktopHeader
- Navigation links only appear for authenticated users

### 2026-02-11: Automatic Badge Awarding System

**COMPLETED**

#### Automatic Badge System
Created a comprehensive automatic badge awarding system that awards badges to users based on their activity:

**10 Predefined Badges:**
1. **First Sale** - Completed first sale (50 points)
2. **Active Seller** - 10 sales completed (100 points)
3. **Experienced Seller** - 50 sales completed (250 points)
4. **Top Seller** - 100+ sales completed (500 points)
5. **Trusted Member** - Active member for 1+ year (200 points)
6. **Veteran Member** - Active member for 2+ years (400 points)
7. **5-Star Seller** - 4.9+ rating with 10+ reviews (300 points)
8. **First Listing** - Created first listing (25 points)
9. **Prolific Seller** - 50+ listings created (150 points)
10. **Verified Seller** - Completed identity verification (100 points)

**Trigger Events:**
- Listing creation → checks listing-related badges
- Mark listing as sold → checks sales-related badges
- Periodic task (every 6 hours) → checks time-based badges

**API Endpoints:**
- `POST /api/listings/{id}/mark-sold`: Mark listing as sold and check for badges

**Key Files:**
- `/app/backend/services/badge_service.py` - Badge awarding service
- `/app/backend/routes/listings.py` - Mark sold endpoint with badge check
- `/app/backend/server.py` - Service initialization and periodic task

#### Additional Code Refactoring
- Removed ~100 lines of duplicate `renderGlobalHeader` code from `messages.tsx`
- Cleaned up unused imports (`usePathname`) from refactored components

### 2026-02-11: Badge Showcase & Progress Indicators

**COMPLETED**

#### Badge Showcase Feature
Users can now customize which badges appear on their public profile:
- Choose up to 5 badges to prominently display
- Showcased badges appear on public profile in user's preferred order
- If no showcase set, top 5 earned badges by priority are shown by default

#### Badge Progress Indicators
Users can track their progress towards earning badges:
- Visual progress bars for each badge criteria
- Shows current/target values (e.g., "3/10 sales")
- Earned badges show completion checkmark
- Total points earned displayed

**New API Endpoints:**
- `GET /api/badges/progress` - Get progress for all badges with current stats
- `PUT /api/badges/showcase` - Update which badges to showcase (max 5)
- `GET /api/profile/public/{user_id}/badges/showcase` - Get user's showcase badges for public display

**New Frontend Page:**
- `/profile/badges` - "My Badges" page with:
  - Stats summary (badges earned, total points, showcase count)
  - Showcase section with star-highlighted badges
  - Earned badges section with toggle to add/remove from showcase
  - In Progress section with progress bars

**Key Files:**
- `/app/backend/services/badge_service.py` - get_badge_progress method
- `/app/backend/server.py` - Badge showcase endpoints (lines 3493-3585)
- `/app/frontend/app/profile/badges.tsx` - Badge management page
- `/app/frontend/app/(tabs)/profile.tsx` - Added "My Badges" link to activity sections

### 2026-02-11: Listing ID, Badge Celebration & Featured Listings

**COMPLETED**

#### Listing ID Display
- Added listing ID display to all listing cards (shows last 8 characters)
- Uses monospace font for clear ID display
- Location: Bottom right of listing cards

#### Badge Celebration Modal
- Created `BadgeCelebrationModal` component with confetti animation
- Features: Animated badge entrance, falling confetti, points display, pulsing glow effect
- Created `BadgeCelebrationProvider` context for global access
- Integrated into app root layout
- Modal queues multiple badges for sequential celebration

#### Featured Verified Sellers → Featured Listings
- Changed homepage "Verified Sellers" section to "From Verified Sellers"
- Now shows actual listings from verified/premium sellers instead of seller profiles
- Created API endpoint: `GET /api/listings/featured-verified`
- Falls back to verified seller profiles if no listings available

**Key Files:**
- `/app/frontend/src/components/listings/ListingCard.tsx` - Listing ID display
- `/app/frontend/src/components/badges/BadgeCelebrationModal.tsx` - Celebration modal
- `/app/frontend/src/context/BadgeCelebrationContext.tsx` - Provider context
- `/app/frontend/app/_layout.tsx` - Provider integration
- `/app/frontend/app/(tabs)/index.tsx` - Featured listings section
- `/app/backend/server.py` - Featured verified listings endpoint (line 1022)

### 2026-02-11: Listing ID Display & Mobile Business Profile Fixes

**COMPLETED**

#### Listing ID Display on Detail Page
- Removed Listing ID from listing cards (homepage, search results)
- Added Listing ID on listing detail page next to "Report this listing" button
- Shows on both mobile (SafetySection component) and desktop (right column safety card)
- ID displayed in monospace font for clear identification

#### Mobile Business Profile Image Upload Fix
- Added media library permission requests for mobile (iOS/Android)
- Uses `ImagePicker.requestMediaLibraryPermissionsAsync()` before launching image picker
- Shows permission denied alert if user declines
- Applied to all three upload functions: logo, cover, and gallery

**Key Files:**
- `/app/frontend/app/listing/[id].tsx` - Listing ID display (lines 360-400 mobile, lines 1196-1202 desktop)
- `/app/frontend/src/components/listings/ListingCard.tsx` - Removed listing ID
- `/app/frontend/app/business/edit.tsx` - Mobile permission requests

### 2026-02-11: Desktop Header & Profile Activity Updates

**COMPLETED**

#### Desktop Header - Logged-in User Enhancements
- Added Credit Balance button with wallet icon (shows "X Credits")
- Displays My Listings, Messages, Saved, Offers navigation links
- Notification icon and Profile icon
- Post Listing button
- Credit balance fetched from `/api/credits/balance` API

#### Desktop Profile - My Activity Section
- Streamlined to show only 6 activity items:
  - My Badges
  - Business Profile
  - Invoices & Receipts
  - Purchases
  - Sales
  - Recently Viewed
- Removed items that are now in header: My Listings, Messages, Saved, Offers

**Key Files:**
- `/app/frontend/src/components/layout/DesktopHeader.tsx` - Header with credit balance and nav links
- `/app/frontend/app/(tabs)/profile.tsx` - Updated My Activity section

## Remaining Backlog

### P0: None (Cleanup & Refactoring COMPLETED)

### P1: Continue server.py refactoring
- Extract more route groups: admin locations, support tickets, etc.
- Current size: 8881 lines (down from 9076)

### P2: Optional Cleanup
- Further modularization opportunities
- Code deduplication in admin-dashboard

### 2026-02-11: Expo Frontend Cleanup & Server.py Refactoring
**COMPLETED**

#### Frontend Cleanup
1. **Simplified `/app/frontend/app/admin/analytics.tsx`**
   - Reduced from 1668 lines to 572 lines (~65% reduction)
   - Removed duplicate Settings tab (now handled by admin-dashboard)
   - Added "Manage Settings" link to admin-dashboard
   - Kept read-only analytics overview (Overview, Sellers, Engagement tabs)

2. **Updated `/app/frontend/app/admin/index.tsx`**
   - Added prominent "Open Admin Dashboard" button
   - Improved UI for admin credentials display

#### Backend Refactoring
1. **Created `/app/backend/routes/notification_preferences.py`** (~200 lines)
   - GET `/notification-preferences` - Get user preferences
   - PUT `/notification-preferences` - Update preferences
   - POST `/notification-preferences/unsubscribe-all` - Unsubscribe from marketing
   - GET `/notification-preferences/categories` - Get preference categories

2. **Updated `/app/backend/routes/__init__.py`**
   - Added `create_notification_preferences_router` export

3. **Cleaned up `/app/backend/server.py`**
   - Removed inline notification preferences code (~195 lines)
   - Registered new modular router
   - Reduced from 9076 to 8881 lines

#### Total Code Reduction
- Frontend admin: 4754 → 3696 lines (~22% reduction)
- Backend server.py: 9076 → 8881 lines (~2% reduction)
- New modular route file created for better organization

**Key Files Modified/Created:**
- `/app/frontend/app/admin/analytics.tsx` - Simplified
- `/app/frontend/app/admin/index.tsx` - Updated with dashboard link
- `/app/backend/routes/notification_preferences.py` - New route module
- `/app/backend/routes/__init__.py` - Updated exports
- `/app/backend/server.py` - Cleaned up, registered new router

### 2026-02-11: Move All Settings to Admin Dashboard
**COMPLETED**

#### Backend Changes
1. **Disabled Local Endpoints** - Removed local scheduled reports endpoints from main backend
2. **Added Admin Dashboard Endpoints**:
   - `GET/POST /api/admin/settings/scheduled-reports` - Report configuration
   - `GET /api/admin/reports/history` - Report history
   - `POST /api/admin/reports/generate` - Generate report preview
   - `POST /api/admin/reports/send` - Send report to configured admins
3. **Fixed Proxy Routing** - Removed "challenges" from ADMIN_LOCAL_PATHS to allow proxy to admin-dashboard

#### Frontend Changes
1. **Added Scheduled Reports Tab** to Settings page (`/app/admin-dashboard/frontend/src/app/dashboard/settings/page.tsx`):
   - Report Schedule section (enable/disable, frequency, day of week, send time)
   - Admin Email Recipients section (add/remove emails)
   - Report Content toggles (platform overview, seller analytics, engagement metrics, alerts)
   - Report History table showing recent sends
   - Send Report Now button

#### All Admin Endpoints Verified Working ✅
1. ✅ Seller Analytics Settings (`/api/admin/seller-analytics/settings`)
2. ✅ Engagement Config (`/api/admin/seller-analytics/engagement-config`)
3. ✅ Platform Analytics (`/api/admin/seller-analytics/platform-analytics`)
4. ✅ Scheduled Reports (`/api/admin/settings/scheduled-reports`)
5. ✅ Reports History (`/api/admin/reports/history`)
6. ✅ Business Profiles (`/api/admin/business-profiles/list`)
7. ✅ Users List (`/api/admin/users`)
8. ✅ Challenges (`/api/admin/challenges`)

**Key Files Modified:**
- `/app/backend/server.py` - Disabled local scheduled reports endpoints, removed challenges from ADMIN_LOCAL_PATHS
- `/app/admin-dashboard/backend/server.py` - Added scheduled reports endpoints
- `/app/admin-dashboard/frontend/src/app/dashboard/settings/page.tsx` - Added Scheduled Reports tab

### 2026-02-11: Business Profiles Admin API
**COMPLETED**

#### Backend Endpoints Implemented (`/app/admin-dashboard/backend/server.py`)
1. `GET /api/admin/business-profiles/list` - List profiles with pagination, filtering, search
   - Query params: page, limit, status, search
   - Returns: profiles array, total count, stats (total, pending, verified, rejected)

2. `GET /api/admin/business-profiles/{profile_id}` - Get single profile details
   - Returns: Full profile with user info

3. `POST /api/admin/business-profiles/{profile_id}/verify` - Verify a profile
   - Updates status to "verified", logs audit trail

4. `POST /api/admin/business-profiles/{profile_id}/reject` - Reject a profile
   - Accepts optional rejection reason
   - Updates status to "rejected", logs audit trail

5. `POST /api/admin/business-profiles/{profile_id}/suspend` - Suspend a profile
   - For verified profiles that need temporary suspension
   - Preserves previous status for reinstatement

6. `POST /api/admin/business-profiles/{profile_id}/reinstate` - Reinstate suspended/rejected profiles

#### Proxy Fix
- Disabled local business profile admin router in main backend
- Requests now properly proxy to admin-dashboard backend via `/api/admin/{path}`
- Fixed Authorization header forwarding in proxy

#### Test Results
- API endpoints verified via curl with admin JWT authentication
- Business Profiles page loads with 27 profiles from database
- Verify endpoint tested successfully (changed profile from pending to verified)

**Key Files:**
- `/app/admin-dashboard/backend/server.py` (lines 8773-9051) - Business Profiles admin endpoints
- `/app/admin-dashboard/frontend/src/app/dashboard/business-profiles/page.tsx` - UI page
- `/app/backend/server.py` (line 7270-7278) - Disabled local admin router to allow proxy

### 2026-02-11: Admin Dashboard Navigation & Analytics Fixes
**COMPLETED**

#### Changes Made
1. **Fixed Analytics Page API Endpoints** (`/app/admin-dashboard/frontend/src/app/dashboard/analytics/page.tsx`)
   - Changed API calls from `/analytics/admin/*` to `/seller-analytics/*`
   - This fixed the "Unable to load settings" error

2. **Added Missing Menu Items** (`/app/admin-dashboard/frontend/src/app/dashboard/layout.tsx`)
   - Added "Analytics" link to sidebar (was present but hidden below fold)
   - Added "Challenges" link to sidebar
   - Added "Business Profiles" link to sidebar
   - Reordered menu items for better visibility

3. **Created Business Profiles Admin Page** (`/app/admin-dashboard/frontend/src/app/dashboard/business-profiles/page.tsx`)
   - Stats cards: Total, Pending, Verified, Rejected profiles
   - Search and filter by status tabs
   - Table with business details, owner info, category, status
   - View details dialog with verify/reject actions
   - Pagination support

#### Admin Dashboard Sidebar Now Includes
- Overview, Executive Summary, QA & Reliability, Admin Sandbox
- Cohort Analytics, **Analytics** (with Seller Analytics Settings)
- Categories, Attributes, Location Manager
- **Users**, **Verification**, **Challenges**, **Business Profiles**
- Listings, Listing Moderation, Vouchers, Commission, Boosts
- And many more...

**Key Files Modified:**
- `/app/admin-dashboard/frontend/src/app/dashboard/layout.tsx` - Sidebar menu
- `/app/admin-dashboard/frontend/src/app/dashboard/analytics/page.tsx` - Fixed API endpoints
- `/app/admin-dashboard/frontend/src/app/dashboard/business-profiles/page.tsx` - New page

### 2026-02-11: Scheduled Analytics Reports Feature
**COMPLETED**

#### Feature Overview
Automated weekly/daily/monthly analytics reports sent via email to configured admin recipients. Reports include platform overview, seller performance analysis, engagement metrics, and alerts based on configured thresholds.

#### Backend Service (`/app/backend/scheduled_reports_service.py`)
- `ScheduledReportsService` class with methods:
  - `get_report_settings()` / `save_report_settings()` - Configuration management
  - `generate_platform_overview()` - User stats, listing stats, revenue metrics
  - `generate_seller_analytics()` - Top sellers, low performers, revenue alerts
  - `generate_engagement_metrics()` - Messages, favorites, badges, challenges
  - `generate_full_report()` - Combines all sections
  - `format_report_html()` - Beautiful HTML email template with styled sections
  - `send_report_email()` - Sends via SendGrid to configured admins
  - `run_scheduled_report()` - Main entry point for scheduled job

#### Backend Endpoints
- `GET /api/admin/settings/scheduled-reports` - Get report configuration
- `POST /api/admin/settings/scheduled-reports` - Save report configuration
  - Settings: enabled, frequency (daily/weekly/monthly), day_of_week, hour, admin_emails
  - Include flags: include_seller_analytics, include_engagement_metrics, include_platform_overview, include_alerts
- `POST /api/admin/reports/generate` - Generate report without sending
- `POST /api/admin/reports/send` - Generate and send report to configured admins
- `GET /api/admin/reports/preview` - Preview HTML email and report data
- `GET /api/admin/reports/history` - List of sent reports with pagination

#### Background Task
- Runs every 5 minutes checking if report should be sent
- Checks frequency, day_of_week, and hour settings
- Prevents duplicate sends by checking report_history collection
- Logs all operations for debugging

#### Report Sections
1. **Platform Overview**: total_users, new_users_week, active_listings, sold_listings_week, weekly_revenue, user_growth_rate
2. **Seller Analytics**: top_sellers (name, revenue, sales), low_performing_sellers (inactive days), revenue_alerts (below threshold)
3. **Engagement Metrics**: messages_this_week, favorites_this_week, badges_awarded, challenges_completed
4. **Alerts**: Compiled from low performers and revenue alerts with severity levels

#### Frontend UI (`/app/frontend/app/admin/analytics.tsx` - Settings tab)
- Enable/Disable scheduled reports toggle
- Frequency selector (Daily/Weekly/Monthly chips)
- Day of week selector (for weekly reports)
- Send time (hour in UTC)
- Admin email recipients input (comma-separated)
- "Send Report Now" button for manual trigger
- Report history section showing recent sends with success/failed status

#### Test Results
- All 23 backend tests passed (100% success rate)
- Round-trip persistence verified for settings
- Report generation verified with all 4 sections
- Authentication enforcement verified (401 for unauthenticated requests)
- Email sending depends on SendGrid configuration

**Key Files:**
- `/app/backend/scheduled_reports_service.py` - Report generation service
- `/app/backend/server.py` (lines 8158-8287) - Scheduled reports endpoints
- `/app/backend/server.py` (lines 8847-8904) - Background task
- `/app/frontend/app/admin/analytics.tsx` - Settings tab with scheduled reports UI

### 2026-02-11: Seller Analytics Settings Backend Implementation
**COMPLETED**

#### Backend Endpoints Implemented
- `GET /api/admin/settings/seller-analytics` - Retrieves seller analytics settings
  - Returns: `{ alert_threshold: number, low_performance_threshold: number }`
  - Default values: alert_threshold=100, low_performance_threshold=5
- `POST /api/admin/settings/seller-analytics` - Saves seller analytics settings
  - Accepts: `{ alert_threshold: number, low_performance_threshold: number }`
  - Persists to `admin_settings` MongoDB collection

- `GET /api/admin/settings/engagement-notifications` - Retrieves engagement notification settings
  - Returns: `{ milestones: object, triggers: object }`
  - milestones: firstSale, tenListings, hundredMessages, badgeMilestone
  - triggers: inactiveSeller, lowEngagement, challengeReminder, weeklyDigest
- `POST /api/admin/settings/engagement-notifications` - Saves engagement notification settings
  - Accepts: `{ milestones: object, triggers: object }`
  - Persists to `admin_settings` MongoDB collection

#### Technical Implementation
- Routes registered directly on FastAPI app BEFORE the admin proxy catch-all
- Uses async MongoDB operations (motor.motor_asyncio)
- All endpoints require authentication via Bearer token (returns 401 without valid token)
- Settings stored in `admin_settings` collection with `type` field distinguishing settings

#### Frontend Updates
- Added `fetchSettings()` callback in `/app/frontend/app/admin/analytics.tsx`
- Settings automatically loaded when user switches to the Settings tab
- Existing settings populate input fields and toggle states
- Save button persists settings to backend

#### Test Results
- All 12 tests passed (100% success rate)
- Backend test file: `/app/backend/tests/test_seller_analytics_settings.py`
- Round-trip persistence verified for both settings endpoints
- Authentication enforcement verified (401 for unauthenticated requests)

**Key Files:**
- `/app/backend/server.py` (lines 7894-8160) - Local admin analytics routes
- `/app/frontend/app/admin/analytics.tsx` - Settings tab UI and fetchSettings function
- `/app/backend/routes/admin.py` - Additional admin routes module (not used for settings)


### 2026-02-11: Server.py Refactoring - Admin Locations Module
**COMPLETED**

#### Refactoring Summary
Extracted ~950 lines of admin location management routes from the monolithic `server.py` into a dedicated modular router file.

#### New File Created
- `/app/backend/routes/admin_locations.py` - ~880 lines containing all admin location management routes

#### Routes Extracted
- **CRUD Operations**: GET/POST/PUT/DELETE for countries, regions, districts, cities
- **Geocoding**: Geocode search, reverse geocode, coordinate suggestions
- **Batch Operations**: Batch import from GeoJSON, bulk coordinate updates, GeoJSON export
- **Analytics**: Listing density by location, auto-detect location from coordinates
- **Boundary Data**: District boundary lookup via OSM Nominatim

#### Key Endpoints (all under `/api/admin/locations/`)
- `GET /stats` - Location statistics
- `GET/POST /countries` - Country CRUD
- `GET/POST /regions` - Region CRUD  
- `GET/POST /districts` - District CRUD
- `GET/POST /cities` - City CRUD
- `GET /geocode` - Forward geocoding
- `GET /reverse-geocode` - Reverse geocoding
- `GET /suggest-coordinates` - Coordinate suggestions
- `POST /batch-import` - GeoJSON batch import
- `POST /bulk-update-coordinates` - Auto-fill missing coordinates
- `GET /export` - Export to GeoJSON
- `GET /listing-density` - Density analytics
- `GET /auto-detect` - Auto-detect location hierarchy
- `GET /district-boundary` - District boundary polygon

#### Integration Pattern
- Router factory function: `create_admin_locations_router(db, require_auth)`
- Registered BEFORE admin proxy catch-all to ensure route precedence
- Added `locations` to `ADMIN_LOCAL_PATHS` to prevent proxy interception

#### Result
- `server.py` reduced from 8881 lines to 7932 lines (949 lines removed)
- All admin location endpoints verified working via curl tests
- Lint checks passing

**Key Files Modified:**
- `/app/backend/routes/__init__.py` - Added `create_admin_locations_router` export
- `/app/backend/server.py` - Removed inline routes, added early router registration

### 2026-02-11: Server.py Refactoring - Auto/Motors Module
**COMPLETED**

#### Refactoring Summary
Extracted ~692 lines of auto/motors marketplace routes from `server.py` into a dedicated modular router file.

#### New File Created
- `/app/backend/routes/auto_motors.py` - ~560 lines containing all auto/motors endpoints

#### Routes Extracted
- **Brands & Models**: GET /auto/brands, /auto/brands/{id}/models
- **Listings**: GET /auto/listings (with advanced filters), /auto/listings/{id}, /auto/featured, /auto/recommended
- **Conversations**: POST /auto/conversations, GET /auto/conversations/{id}, POST /auto/conversations/{id}/messages
- **Favorites**: POST/DELETE /auto/favorites/{listing_id}, GET /auto/favorites
- **Search**: GET /auto/popular-searches, POST /auto/track-search, GET /auto/filter-options

#### Key Endpoints (all under `/api/auto/`)
- `GET /brands` - List all car brands with listing counts
- `GET /brands/{id}/models` - Get models for a brand
- `GET /listings` - Search with filters (make, model, year, price, etc.)
- `GET /listings/{id}` - Single listing details
- `GET /featured` - Featured auto listings
- `GET /recommended` - Personalized recommendations
- `POST /conversations` - Start a conversation with dummy messages
- `GET /conversations/{id}` - Get conversation
- `POST /conversations/{id}/messages` - Send message with auto-reply
- `POST/DELETE /favorites/{id}` - Manage favorites
- `GET /favorites` - User's favorites

#### Integration Pattern
- Router factory function: `create_auto_motors_router(db, get_current_user)`
- Includes static data: AUTO_BRANDS, AUTO_MODELS dictionaries
- Helper function `_generate_dummy_messages()` for conversation templates

#### Result
- `server.py` reduced from 7932 lines to 7253 lines (679 lines removed)
- All auto endpoints verified working via curl tests
- Lint checks passing

#### Cumulative Refactoring Progress
- Original server.py: ~8881 lines
- After Admin Locations extraction: 7932 lines (-949 lines)
- After Auto/Motors extraction: 7253 lines (-679 lines)
- **Total reduction: 1628 lines (~18%)**

**Key Files Modified:**
- `/app/backend/routes/__init__.py` - Added `create_auto_motors_router` export
- `/app/backend/server.py` - Removed inline routes, added router registration

### 2026-02-11: Server.py Refactoring - Property, Offers, Similar Listings Module
**COMPLETED**

#### Refactoring Summary
Extracted ~1046 lines of property-related routes from `server.py` into modular routers in `/app/backend/routes/property.py`.

#### New Routers Created
1. **create_property_router** - Property listings CRUD, viewings, analytics, boost/feature
2. **create_offers_router** - Offer submission, negotiation, counter-offers
3. **create_similar_listings_router** - Cross-collection similarity algorithm

#### Routes Extracted

**Property Router (`/api/property/`)**:
- `GET/POST/PUT/DELETE /listings` - Property CRUD
- `GET /listings/{id}` - Single property
- `GET /listings/{id}/similar` - Similar properties
- `GET /featured` - Featured properties
- `POST /book-viewing` - Schedule viewing
- `GET /viewings` - User's viewing requests
- `PUT /viewings/{id}` - Update viewing status
- `GET /cities` - Available cities
- `GET /areas/{city}` - Areas within city
- `GET /types-count` - Property type distribution
- `POST /boost/{id}` - Boost listing
- `POST /feature/{id}` - Feature listing
- `GET /boosted` - Boosted listings
- `GET /boost-prices` - Pricing options

**Offers Router (`/api/offers/`)**:
- `POST /` - Submit offer
- `GET /` - User's offers (buyer/seller)
- `GET /{id}` - Single offer
- `PUT /{id}/respond` - Accept/reject/counter
- `PUT /{id}/accept-counter` - Accept counter-offer
- `DELETE /{id}` - Withdraw offer

**Similar Listings Router (`/api/similar/`)**:
- `GET /listings/{id}` - Cross-collection similarity

#### Key Features
- Pydantic models for validation: PropertyLocation, PropertyFacilities, PropertyVerification, etc.
- `calculate_similarity_score()` function with weighted algorithm
- Support for property viewings with status tracking
- Monetization: boost and feature options with pricing tiers

#### Result
- `server.py` reduced from 7253 lines to 6240 lines (1013 lines removed)
- All endpoints verified working via curl tests
- Lint checks passing

#### Cumulative Refactoring Progress
- Original server.py: ~8881 lines
- After Admin Locations: 7932 lines (-949)
- After Auto/Motors: 7253 lines (-679)
- After Property/Offers/Similar: 6240 lines (-1013)
- **Total reduction: 2641 lines (~30%)**

**Key Files Modified:**
- `/app/backend/routes/property.py` (NEW - ~690 lines)
- `/app/backend/routes/__init__.py` (Updated exports)
- `/app/backend/server.py` (Removed inline routes)

### 2026-02-11: Server.py Refactoring - Social & Profile Activity Module
**COMPLETED**

#### Refactoring Summary
Extracted ~471 lines of social and profile activity routes from `server.py` into modular routers in `/app/backend/routes/social.py`.

#### New Routers Created
1. **create_social_router** - Follow system, reviews, user listings
2. **create_profile_activity_router** - My listings, purchases, sales, recently viewed

#### Routes Extracted

**Social Router:**
- `POST/DELETE /users/{id}/follow` - Follow/unfollow
- `GET /users/{id}/followers` - Get followers
- `GET /users/{id}/following` - Get following
- `POST /users/{id}/reviews` - Leave review
- `GET /users/{id}/reviews` - Get user reviews
- `DELETE /reviews/{id}` - Delete own review
- `GET /users/{id}/listings` - Get user's listings

**Profile Activity Router (`/api/profile/activity/`):**
- `GET /listings` - My listings from all collections
- `GET /purchases` - My purchases
- `GET /sales` - My sold items
- `GET /recently-viewed` - Recently viewed listings
- `POST /recently-viewed/{id}` - Add to recently viewed

#### Result
- `server.py` reduced from 6240 lines to 5792 lines (448 lines removed)
- All endpoints require authentication (verified behavior)
- Lint checks passing

#### Cumulative Refactoring Progress
- Original server.py: ~8881 lines
- After Admin Locations: 7932 lines (-949)
- After Auto/Motors: 7253 lines (-679)
- After Property/Offers/Similar: 6240 lines (-1013)
- After Social/ProfileActivity: 5792 lines (-448)
- **Total reduction: 3089 lines (~35%)**

**Key Files Modified:**
- `/app/backend/routes/social.py` (NEW - ~490 lines)
- `/app/backend/routes/__init__.py` (Updated exports)
- `/app/backend/server.py` (Removed inline routes)

### 2026-02-11: Server.py Refactoring - Notifications & Account/Support Modules
**COMPLETED**

#### Refactoring Summary
Extracted ~400 lines of notification and account/support routes from `server.py` into modular routers.

#### New Routers Created
1. **create_notifications_router** (`routes/notifications.py`) - Notification CRUD and seeding
2. **create_account_router** (`routes/account_support.py`) - Password change, account deletion
3. **create_support_router** (`routes/account_support.py`) - Support tickets

#### Routes Extracted

**Notifications Router (`/api/notifications/`):**
- `GET /` - List notifications with filtering
- `GET /unread-count` - Unread count
- `PUT /{id}/read` - Mark as read
- `PUT /mark-all-read` - Mark all read
- `DELETE /{id}` - Delete notification
- `DELETE /` - Clear all
- `POST /seed` - Seed sample notifications

**Account Router (`/api/account/`):**
- `POST /change-password` - Change password
- `POST /delete` - Delete account (30-day cool-off)
- `POST /cancel-deletion` - Cancel deletion

**Support Router (`/api/support/`):**
- `POST /tickets` - Create ticket
- `GET /tickets` - List tickets
- `GET /tickets/{id}` - Get ticket

#### Result
- `server.py` reduced from 5792 lines to 5409 lines (383 lines removed)
- All endpoints verified working (401 for auth-required, as expected)
- Lint checks passing

#### Cumulative Refactoring Progress
- Original server.py: ~8881 lines
- After Admin Locations: 7932 lines (-949)
- After Auto/Motors: 7253 lines (-679)
- After Property/Offers/Similar: 6240 lines (-1013)
- After Social/ProfileActivity: 5792 lines (-448)
- After Notifications/Account/Support: 5409 lines (-383)
- **Total reduction: 3472 lines (~39%)**

**Key Files Modified:**
- `/app/backend/routes/notifications.py` (NEW - ~230 lines)
- `/app/backend/routes/account_support.py` (NEW - ~175 lines)
- `/app/backend/routes/__init__.py` (Updated exports)
- `/app/backend/server.py` (Removed inline routes)

### 2026-02-11: Server.py Refactoring - User Settings, Sessions, ID Verification Modules
**COMPLETED**

#### Refactoring Summary
Extracted ~177 lines of user settings, sessions, and ID verification routes from `server.py` into modular routers in `/app/backend/routes/user_settings.py`.

#### New Routers Created
1. **create_user_settings_router** - Get/update user settings, push token
2. **create_sessions_router** - Active sessions management, revoke sessions
3. **create_id_verification_router** - Submit/check ID verification status

#### Routes Extracted

**User Settings Router:**
- `GET /settings` - Get user settings
- `PUT /settings` - Update user settings
- `PUT /settings/push-token` - Update push notification token

**Sessions Router (`/api/sessions/`):**
- `GET /` - List active sessions
- `DELETE /{session_id}` - Revoke specific session
- `POST /revoke-all` - Revoke all sessions except current

**ID Verification Router (`/api/profile/`):**
- `POST /verify-id` - Submit ID verification documents
- `GET /verify-id/status` - Get verification status

#### Result
- `server.py` reduced from 5409 lines to 5232 lines (177 lines removed)
- All endpoints require authentication (verified)
- Lint checks passing

#### Final Cumulative Refactoring Progress
- Original server.py: ~8881 lines
- After Admin Locations: 7932 lines (-949)
- After Auto/Motors: 7253 lines (-679)
- After Property/Offers/Similar: 6240 lines (-1013)
- After Social/ProfileActivity: 5792 lines (-448)
- After Notifications/Account/Support: 5409 lines (-383)
- After UserSettings/Sessions/IDVerification: 5232 lines (-177)
- **Total reduction: 3649 lines (~41%)**

**Key Files Modified:**
- `/app/backend/routes/user_settings.py` (NEW - ~220 lines)
- `/app/backend/routes/__init__.py` (Updated exports)
- `/app/backend/server.py` (Removed inline routes)

### 2026-02-12: Friendship & Dating Category - New Subcategories
**COMPLETED**

#### New Subcategories Added
Added 4 new subcategories to the "Friendship & Dating" category as requested:

**Dating & Relationships group:**
- `Faith-Based Dating` (id: `faith_based_dating`)
- `Mature Dating (40+)` (id: `mature_dating_40_plus`)

**Activity-Based Meetups group:**
- `Volunteering` (id: `volunteering`)
- `Music & Arts` (id: `music_arts`)

#### Files Modified
- `/app/backend/routes/categories.py` - Added new subcategories to DEFAULT_CATEGORIES

#### Verification
- API endpoint `/api/categories/friendship_dating` returns updated subcategories
- Backend hot-reloaded successfully

---

### 2026-02-12: Server.py Refactoring - Duplicate Route Cleanup
**COMPLETED**

#### Duplicate Routes Removed from server.py
Removed duplicate endpoints that were already handled by modular route files:

**Badge Endpoints Removed (routes/badges.py handles these):**
- `/badges/progress` 
- `/badges/showcase`
- `/badges/unviewed-count`
- `/badges/mark-viewed`
- `/badges/leaderboard`
- `/badges/leaderboard/my-rank`

**Streak Endpoints Removed (routes/streaks.py handles these):**
- `/streaks/leaderboard`

**Blocked Users Endpoints Removed:**
- `/blocked-users` (GET, POST, DELETE) - Moved to routes/users.py as `/users/blocked`, `/users/block/{user_id}`, `/users/unblock/{user_id}`

#### Async Bug Fixes in Modular Routes
Fixed critical async/await issues in route files that were using synchronous MongoDB operations:

**routes/badges.py:**
- Fixed all `list(db.collection.find(...))` to `await db.collection.find(...).to_list()`
- Fixed all `db.collection.count_documents(...)` to `await db.collection.count_documents(...)`
- Fixed all `db.collection.find_one(...)` to `await db.collection.find_one(...)`
- Fixed all `db.collection.update_many(...)` to `await db.collection.update_many(...)`
- Fixed all `db.collection.insert_one(...)` to `await db.collection.insert_one(...)`
- Fixed aggregate operations to use proper async patterns

**routes/streaks.py:**
- Fixed synchronous find/count operations to async equivalents

**routes/challenges.py:**
- Fixed all MongoDB operations to use async patterns
- Note: Challenges router disabled in favor of comprehensive server.py implementation

**routes/users.py:**
- Added `/users/blocked` endpoint for listing blocked users
- Enhanced `/users/block/{user_id}` with blocked_users collection support
- Enhanced `/users/unblock/{user_id}` with blocked_users collection cleanup

#### Line Count Reduction
- Previous: 5287 lines
- Current: 4908 lines
- This session removed: 379 lines
- Total from original: 8881 → 4908 = 3973 lines removed (~44.7% reduction)

---

### 2026-02-12: Server.py Refactoring - Profile Module
**COMPLETED**

#### New Route File Created
Created `/app/backend/routes/profile.py` (~305 lines) containing:

**Endpoints Extracted:**
- `GET /profile` - Get current user profile with stats (requires auth)
- `PUT /profile` - Update user profile (requires auth)
- `GET /profile/public/{user_id}` - Get public profile of a user
- `GET /profile/public/{user_id}/badges` - Get public badges for a user
- `GET /profile/activity/favorites` - Get saved/favorite items (requires auth)
- `DELETE /profile/activity/recently-viewed` - Clear recently viewed history (requires auth)

#### Integration
- Factory function: `create_profile_router(db, require_auth, get_current_user)`
- Registered in server.py after profile_activity_router
- All async database calls properly use await

#### Line Count Reduction
- Previous: 4908 lines
- Current: 4644 lines
- This session removed: 264 lines
- New route file: 305 lines
- Total from original: 8881 → 4644 = 4237 lines removed (~47.7% reduction)

#### Testing
- All 12 backend tests passed (100% success rate)
- Test file created: /app/backend/tests/test_profile_router.py

**Key Files:**
- `/app/backend/routes/profile.py` (NEW - ~305 lines)
- `/app/backend/routes/__init__.py` (Updated exports)
- `/app/backend/server.py` (Removed inline profile endpoints)

---

### 2026-02-12: Server.py Refactoring - Badge Share Endpoint
**COMPLETED**

#### Endpoint Moved to routes/badges.py
- `GET /badges/share/{user_id}` - Shareable badge profile with OG meta (public endpoint)

#### Line Count Reduction
- Previous: 4644 lines
- Current: 4581 lines
- This extraction removed: 63 lines
- routes/badges.py increased: 302 → 364 lines (+62 lines)

---

### 2026-02-12: Server.py Refactoring - Badge Milestones
**COMPLETED**

#### Endpoints Moved to routes/badges.py
- `GET /badges/milestones` - Get user's achieved and pending milestones
- `POST /badges/milestones/acknowledge` - Mark milestone as acknowledged

#### Features Migrated
- BADGE_MILESTONES constant (count-based: 1, 5, 10, 25, 50 badges)
- SPECIAL_BADGE_MILESTONES constant (triggered by specific badge names)
- Complete milestone tracking with achieved/pending/new categorization

#### Bug Fixed During Testing
- **Critical**: Changed `current_user['user_id']` to `current_user.user_id` (Pydantic model vs dict)
- Affected 7 endpoints in routes/badges.py

#### Line Count Reduction
- Previous: 4581 lines
- Current: 4468 lines  
- This extraction removed: 113 lines
- routes/badges.py increased: 364 → 414 lines

#### Testing
- 13/13 tests passed (100% success rate)
- Test file: /app/backend/tests/test_badge_milestones_router.py

---

### 2026-02-12: Server.py Refactoring - Utility Services
**COMPLETED**

#### New Utils Directory Created
Created `/app/backend/utils/` directory with modular service files:

**Email Service (`utils/email_service.py` - 170 lines)**
- `send_notification_email()` - Send emails via SendGrid
- `build_email_template()` - Generate styled HTML email templates
- Handles notification types: default, security_alert, offer_received, price_drop

**Push Notification Service (`utils/push_service.py` - 314 lines)**
- `send_push_notification()` - Send via Expo Push Service
- `send_bulk_push_notifications()` - Batch push notifications
- `send_milestone_push_notification()` - Milestone achievement notifications
- `check_and_notify_new_milestones()` - Automatic milestone checks
- `init_push_service()` - Initialize with database reference

#### Integration
- Services are imported in server.py on startup
- Push service initialized with database in startup_event
- Fallback to noop if utils not available (UTILS_AVAILABLE flag)

#### Line Count Reduction
- Previous: 4468 lines
- Current: 4160 lines
- This extraction removed: 308 lines
- New utility files: 484 lines total (170 + 314)

---

## Backlog / Future Tasks

### P1 - Server.py Refactoring (Ongoing)
Current state: 3085 lines (down from ~4160, ~25.8% additional reduction)
Total reduction: from ~8881 to 3085 (~65.3% total reduction achieved)

**Completed extractions:**
- Profile endpoints - Moved to routes/profile.py ✓
- Badge share endpoint - Moved to routes/badges.py ✓
- Badge milestones endpoints - Moved to routes/badges.py ✓
- Email Service - Moved to utils/email_service.py ✓
- Push Notification Service - Moved to utils/push_service.py ✓
- Badge Challenges - Moved to routes/badge_challenges.py ✓ (1075 lines extracted)

**Architecture Notes:**
- routes/challenges.py deprecated - replaced by badge_challenges.py router
- routes/badge_challenges.py contains all challenge logic: seasonal, weekly, monthly challenges, joining, progress tracking, streak management
- Factory function pattern used: create_badge_challenges_router(db, require_auth, send_push_notification)
- **65%+ reduction goal achieved!**

**Remaining sections in server.py (stable, not recommended for extraction):**
- Models & Pydantic schemas (~280 lines) - Core to application
- Auth helpers & Rate limiting (~50 lines) - Security-critical
- Media upload endpoint (~65 lines) - File handling
- Socket.IO events (~75 lines) - Real-time features
- QA Real-time alerts (~105 lines) - Quality assurance system
- Admin analytics (~260 lines) - Admin dashboard
- Admin proxy routes (~40 lines) - Backend proxy
- SEO/Sitemap generation (~95 lines) - Search optimization
- Startup/shutdown handlers (~100 lines) - App lifecycle

### 2026-02-12: Server.py Refactoring - Badge Challenges Extraction
**COMPLETED**

**Badge Challenges Router (`routes/badge_challenges.py` - ~1080 lines)**
- Extracted all badge challenge logic from server.py
- Endpoints extracted:
  - `GET /challenges` - List all active challenges (weekly, monthly, seasonal)
  - `GET /challenges/my-progress` - User's progress on all challenges
  - `GET /challenges/{challenge_id}` - Challenge details with leaderboard
  - `POST /challenges/{challenge_id}/join` - Join a challenge
  - `GET /streaks/my-streak` - User's challenge completion streak
  - `GET /badges/past-seasonal` - Gallery of past seasonal badges

**Challenge Definitions Extracted:**
- 8 seasonal challenges (valentine, spring, summer, back-to-school, halloween, black-friday, holiday, new-year)
- 7 regular challenges (3 weekly + 4 monthly)

**Helper Functions Extracted:**
- `get_challenge_period()` - Calculate challenge time period
- `get_seasonal_challenge_period()` - Seasonal date calculations
- `is_seasonal_challenge_active()` - Check if seasonal challenge active
- `get_active_seasonal_challenges()` - List active seasonal challenges
- `get_weekend_period()` - Weekend warrior challenge dates
- `get_user_challenge_progress()` - Calculate user progress
- `check_and_award_challenge_badges()` - Award completion badges
- `update_challenge_streak()` - Update user streak
- `check_and_award_streak_badges()` - Award streak milestones

**Server.py Updates:**
- Added import for create_badge_challenges_router
- Registered router with api_router.include_router()
- Removed ~1075 lines of badge challenge code
- Reduced from 4160 to 3085 lines



### 2026-02-12: Dynamic Listing Creation Form
**COMPLETED**

#### Dynamic Form Implementation
Completed the dynamic listing creation form with category-specific configurations:

**Configuration Changes (listingFormConfig.ts):**
- Fixed subcategory IDs: Changed 'job_offers' to 'job_listings' to match actual subcategories
- Updated SHOW_SALARY_SUBCATEGORIES to use correct 'job_listings' ID
- Updated HIDE_CONDITION_SUBCATEGORIES: added 'jobs_services' category
- Cleaned up invalid 'job_seekers' references from HIDE_PRICE_SUBCATEGORIES

**Form Behavior by Category:**
- **Friendship & Dating:**
  - Price field hidden (shouldHidePrice = true)
  - Contact restricted to Chat only (isChatOnlyCategory = true)
  - Listed by options: ['Individual']
  - Preferences section hidden (no negotiable/exchanges)

- **Jobs & Services (job_listings subcategory):**
  - Shows salary range instead of price (shouldShowSalaryRange = true)
  - Salary inputs: Min/Max with period selector (hourly/monthly/yearly)
  - Condition (new/used) hidden

- **Auto & Vehicles:**
  - Listed by options: ['Owner', 'Broker', 'Individual', 'Company', 'Dealer']
  - Full price and preferences sections shown

**Code Changes (post/index.tsx):**
- Updated renderStep5() to use dynamic configurations
- Added salary range state variables (salaryMin, salaryMax, salaryPeriod)
- Added conditional rendering for price section
- Added salary range inputs with period selector
- Added chat-only notice UI for restricted categories
- Updated validation to skip price validation when hidden
- Added new styles: salaryInputRow, chatOnlyNotice, etc.

**Testing:**
- Test report: /app/test_reports/iteration_103.json
- Category selection UI verified working
- Configuration fixes verified via code review




### 2026-02-12: Category-Specific Photo Tips & Auto-Scroll
**COMPLETED**

#### Category-Specific Photo Tips
Added dynamic photo tips that change based on the selected category in Step 2 (Photos):

**New Configuration (listingFormConfig.ts):**
- Added `CATEGORY_LISTING_TIPS` with tips for 12 categories:
  - Auto & Vehicles: Exterior shots, dashboard/mileage, engine bay, damage disclosure
  - Properties: Wide angles, natural light, key features, neighborhood
  - Electronics: Clean background, good lighting, screen on, box/accessories
  - Phones & Tablets: Screen condition, camera quality, all angles, accessories
  - Home & Furniture: Scale reference, true colors, close-ups, wear disclosure
  - Fashion & Beauty: Flat lay/hanger, worn photos, tags/labels, detail shots
  - Jobs & Services: Professional photo, portfolio, certifications, equipment
  - Friendship & Dating: Genuine smile, activity shots, quality photos, safety
  - Pets: Clear pet photo, health records, living space, personality
  - Sports & Hobbies: Multiple angles, working condition, all parts, wear signs
  - Kids & Baby: Safety labels, cleanliness, working parts, all pieces
  - Community: Clear visual, location, past events, branded graphics
  - Default fallback tips for unconfigured categories

**Frontend Changes (post/index.tsx):**
- Added `getListingTips()` function to retrieve category-specific tips
- Updated renderStep2() to show dynamic tips with icons
- New tip card design with icon, title, and description
- Fallback to generic tips if no category selected

#### Auto-Scroll to Subcategories
- Added `scrollViewRef` and `subcategorySectionRef` refs
- Added `subcategorySectionY` state to track section position
- `handleCategorySelect()` function now scrolls to subcategory section after selection
- Uses `onLayout` to capture Y position for cross-platform compatibility

#### New Styles Added:
- `tipsHeader`: Flex row with icon and title
- `tipItem`: Individual tip card layout
- `tipIcon`: Styled icon container
- `tipContent`: Title and description container
- `tipItemTitle`: Bold tip title
- `tipItemDesc`: Description text



### 2026-02-12: Photography Guides Admin Enhancements
**COMPLETED**

#### P0: Drag-and-Drop Reordering for Photography Guides
**Admin Dashboard Feature:**
- Implemented drag-and-drop functionality in admin Photography Guides page using `@dnd-kit` library
- Users can reorder guides within a category by dragging the drag handle icon (DragIndicator)
- Visual feedback during drag operations (shadow, background change)
- Order persists to backend via `PUT /api/admin/photography-guides/reorder/{category_id}` endpoint
- Info banner explains drag-and-drop functionality
- Snackbar notifications for success/error states

**Files Modified:**
- `/app/admin-dashboard/frontend/src/app/dashboard/photography-guides/page.tsx`:
  - Added DndContext, SortableContext from @dnd-kit/core and @dnd-kit/sortable
  - Created SortableTableRow component with useSortable hook
  - Added drag handle column with DragIndicator icon
  - Implemented handleDragEnd for reorder logic
  - Added reorderSnackbar state for user feedback

#### P1: Display Guide Illustration Images in Frontend
**Frontend Feature:**
- Updated listing creation form to display illustration images when available
- Images render below the guide description when `image_url` is present
- Responsive image sizing with 120px height, full width, rounded corners

**Files Modified:**
- `/app/frontend/app/post/index.tsx`:
  - Added Image component rendering with conditional display
  - Added `tipIllustration` style for image container

**API Structure:**
- Guides already include `image_url` field from API
- Images can be uploaded via admin dashboard (base64 encoding)
- `/app/frontend/src/hooks/usePhotographyGuides.ts` already includes image_url in interface

**Testing:**
- Test report: `/app/test_reports/iteration_110.json`
- Backend: 100% pass rate (10/10 tests)
- Frontend: 100% pass rate
- Drag-and-drop reordering verified working
- Image display code verified (needs admin to upload images to see in frontend)

---

## Backlog

### P2: Refactor AnimatedIcon Components
- Previous agent task to merge AnimatedIcon and DesktopAnimatedIcon
- File not found at specified location - needs investigation
- May be outdated or already resolved

### 2026-02-12: Sample Illustration Images Added
**COMPLETED**

Added 4 sample illustration images to photography guides:
- Auto & Vehicles > "Exterior Shots" - Car exterior photography guide image
- Auto & Vehicles > "Dashboard & Mileage" - Dashboard/odometer photography guide image  
- Electronics > "Clean Background" - Electronics on clean surface guide image
- Properties > "Wide Angles" - Living room wide angle photography guide image

**Images Generated:** Used Gemini Imagen-4.0 to create instructional photography illustrations
**Storage:** Images stored as external URLs in `image_url` field

**Backend Fix:**
- Updated `/app/admin-dashboard/backend/server.py` public endpoint to support both:
  - External URLs via `image_url` field
  - Base64 data URIs via `image_base64` field

### 2026-02-12: Complete Photography Guide Illustrations
**COMPLETED**

Generated and added illustration images for ALL 60 photography guides across 15 categories:

**Categories with Images (4 guides each):**
- Auto & Vehicles: Engine Bay, Any Damage
- Properties: Natural Light, Key Features, Neighborhood
- Electronics: Good Lighting, Screen On, Box & Accessories
- Phones & Tablets: Screen Condition, Camera Quality, All Angles, Accessories
- Home & Furniture: Scale Reference, True Colors, Close-ups, Wear & Tear
- Fashion & Beauty: Flat Lay/Hanger, Worn Photos, Tags & Labels, Detail Shots
- Jobs & Services: Professional Photo, Portfolio, Certifications, Equipment
- Pets: Natural Behavior, Good Lighting, Eye Level, Personality
- Sports & Hobbies: Full Item View, Size Reference, Working Condition, Accessories
- Kids & Baby: Clean Items, Safety Labels, Multiple Angles, Wear Signs
- Health & Medical: Product Details, Expiry Dates, Instructions, Certifications
- Agriculture: Item Condition, Scale, Working Parts, Environment
- Friendship & Dating: Genuine Smile, Activity Shots, Quality Photos, Stay Safe
- Community: Event Details, Location, Past Events, Contact Info
- Default: Good Lighting, Multiple Angles, Show Details, Be Honest

**Image Generation:**
- Used Gemini Imagen-4.0 to generate 56 clean minimalist illustration images
- Images feature category-appropriate photography tips with flat design style
- Consistent visual language across all categories

**Database Updates:**
- All images stored as base64 in `image_base64` field
- `has_image: true` flag set for all guides
- Total: 60 guides, 60 with images, 0 without images

**API Verification:**
- Verified via `/api/photography-guides/public/{category_id}` endpoints
- All categories return guides with `image_url` populated

### 2026-02-12: Admin Enhancements & Task Investigation
**COMPLETED**

#### P1: Image Preview Modal (Admin Photography Guides)
- Added clickable "Has Image" chips in the guides table
- When clicked, fetches the full guide with image and opens preview modal
- Dark-themed modal with full-size image display, title, and close button
- Files modified: `/app/admin-dashboard/frontend/src/app/dashboard/photography-guides/page.tsx`

#### P2: AnimatedIcon Components Investigation
- **RESOLVED**: Searched codebase for `AnimatedIcon` and `DesktopAnimatedIcon`
- Found only `AnimatedIconBox` component in `/app/frontend/app/listing/[id].tsx`
- No separate `DesktopAnimatedIcon` exists - the refactoring task is obsolete
- Component is properly implemented as a memoized functional component

#### P2: Import from JSON Feature (Form Config)
- **ALREADY IMPLEMENTED**: Feature exists in `/app/admin-dashboard/frontend/src/app/dashboard/form-config/page.tsx`
- `handleImportJson` function handles JSON file imports (lines 455-638)
- Validates JSON structure, extracts configuration data
- Creates/updates placeholders, seller types, preferences, and visibility rules
- Shows success/error feedback with counts of created/updated configs

#### P2: Admin Photography Guides Content Management
- **ALREADY EXISTS**: Full CRUD interface at `/admin/photography-guides`
- Drag-and-drop reordering, icon picker, image upload
- Category filtering, stats dashboard, seed defaults functionality

---

## Backlog (Resolved)

### Previously P2: Refactor AnimatedIcon Components
- **STATUS**: CLOSED - No action needed
- Investigation found no duplicate components to merge
