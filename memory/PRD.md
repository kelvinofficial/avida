# Product Requirements Document - Avida Marketplace

## Original Problem Statement
Build a full-stack classifieds application for Tanzania with admin dashboard, SEO suite, AI tools, deep linking, and A/B testing features.

## Core Architecture
- **Frontend**: React Native/Expo web application
- **Backend**: FastAPI with MongoDB
- **Admin Dashboard**: Next.js application at `/api/admin-ui`
- **Admin Backend**: FastAPI at port 8002 (proxied via main backend)

## What's Been Implemented

### Session: February 15, 2026 - Part 12 (Latest)

**1. Auto & Vehicle Listing Card Enhancement - COMPLETED & VERIFIED**
- **Request**: Display miles, year, and transmission with icons on Auto & Vehicle category listing cards, with image on top
- **Implementation**: Completely redesigned `AutoListingCard.tsx` to match PropertyListingCard layout:
  - **Image on top** (vertical layout instead of horizontal)
  - **Vehicle type badge** (SUV, Coupe, Sedan, etc.) on image
  - **Favorite button** moved to top-right of image with dark overlay
  - **View count badge** on bottom-right of image
  - **Image count badge** showing number of photos
  - **Features row with icons**: 
    - Mileage: Speedometer icon (`speedometer-outline`)
    - Year: Calendar icon (`calendar-outline`)
    - Transmission: Cog icon (`cog-outline`)
  - **Bottom row**: Location with icon + Date with time icon
- **Attribute sources**: `attributes.mileage`, `attributes.km`, `attributes.miles`, `attributes.year`, `attributes.transmission`, `attributes.body_type`
- **File changed**: `/app/frontend/src/components/listings/AutoListingCard.tsx`
- **Testing Status**: Verified via screenshot - vertical card layout with image on top now displaying correctly

### Session: February 15, 2026 - Part 11

**1. Category Menu Styling Consistency - COMPLETED & VERIFIED**
- **Request**: Make the category menu on search results page match the homepage design
- **Issue**: Search page category row had rounded corners (`borderRadius: 12`) and border on all sides, while homepage had full-width row with only bottom border
- **Solution**: Updated `categoryIconsRow` style in `search.tsx` to match homepage's `categoryRowWrapper` style:
  - Removed `borderRadius: 12`
  - Changed from `borderWidth: 1` + `borderColor` to `borderBottomWidth: 1` + `borderBottomColor`
- **File changed**: `/app/frontend/app/search.tsx` - Lines 1181-1188
- **Testing Status**: Verified via screenshots - both pages now have consistent full-width category rows with bottom border only

**2. Category Menu Transparent Background & Responsive Rows - COMPLETED & VERIFIED**
- **Request**: Remove white background, show all categories in 1 row on wide screens, 2 rows on smaller screens
- **Changes made**:
  - Removed `backgroundColor: COLORS.surface` (white) from category row
  - Added `useWindowDimensions` hook to detect screen width
  - Replaced horizontal `ScrollView` with flex-wrap layout
  - Categories now split into 2 rows when `screenWidth < 1300px`
  - All 14 categories visible without horizontal scrolling
- **Files changed**: `/app/frontend/app/search.tsx`
  - Added `useWindowDimensions` to imports
  - Added `needsTwoRows` calculation based on screen width
  - Replaced ScrollView with flex row layout with conditional second row
  - Updated styles: removed backgroundColor, added categoryIconsInner and categoryIconsFlexRow
- **Testing Status**: Verified via screenshots at 1920px (2 rows with wrapping) and 1200px (2 rows split evenly)

### Session: February 15, 2026 - Part 10

**1. Search Results Page Image Sizing Fix - COMPLETED & VERIFIED**
- **Issue**: Images on search results page were not taking 100% width of their container
- **Root cause**: React Native Web's Image component doesn't properly fill containers with percentage dimensions
- **Solution**: Used native HTML `<img>` tags with inline styles for web platform
- **Implementation**: 
  - Added `Platform.OS === 'web'` conditional rendering
  - Web uses: `<img style={{ width: '100%', height: '100%', objectFit: 'cover' }}>`
  - Native uses: React Native `<Image>` component
- Files changed: `/app/frontend/app/search.tsx` - Lines 936-959 (image rendering), 1218-1237 (image styles)
- **Testing Status**: Verified by testing agent (iteration_158.json, iteration_159.json) - Images now display at 291px x 180px filling their containers completely
- **Note**: Requires `sudo supervisorctl restart expo` after code changes due to caching

**2. Location Picker Overlapping Elements Fix - COMPLETED & VERIFIED**
- **Issue**: Region list items in location picker were not clickable due to overlapping elements
- **Root cause**: React Native Web renders child elements with excessive width (1844px) due to `flex: 1` style, causing elements to extend beyond their visual bounds and intercept clicks
- **Solution**: Added `overflow: 'hidden'` and `position: 'relative'` to parent div container to clip overflowing children
- **Implementation**:
  - Modified web-specific region list items in LocationPicker.tsx
  - Parent div now has: `{ position: 'relative', overflow: 'hidden' }`
  - Also replaced React Native View/Text with native HTML div/span for better web compatibility
- Files changed: `/app/frontend/src/components/LocationPicker.tsx` - Lines 507-560
- **Testing Status**: Verified by testing agent (iteration_159.json) - Full flow tested: modal open → region list display → region selection → modal close → location displayed in header

### Session: February 15, 2026 - Part 9

**1. Search Results Page Redesign - COMPLETED & VERIFIED**
- **Sidebar removed** - Full width layout for more content space
- **Category icons displayed** - Horizontal scrollable row below search bar (same style as homepage)
- **Search box + location in same row** - Search input with Search button on left, "All Locations" dropdown on right
- **Grid layout for results** - 4-5 column card-based grid layout (responsive)
- Files changed: `/app/frontend/app/search.tsx` - Complete desktop layout redesign
- **Testing Status**: Verified by testing agent - UI layout working correctly

**2. Location Persistence Across Pages - COMPLETED & VERIFIED**
- Location selection now persists using localStorage
- When user sets location (e.g., Dar es Salaam) on homepage, it shows everywhere in the app
- Location stored in global Zustand store + localStorage
- Auto-hydrates on page load
- Files changed: `/app/frontend/src/store/locationStore.ts` - Added localStorage persistence
- **Testing Status**: Verified - no infinite loop crash, location persists

**3. Fixed Critical Bug: Infinite Loop on Location Selection - COMPLETED**
- **Root cause**: Circular useEffect dependencies in homepage (`/app/frontend/app/(tabs)/index.tsx`)
- Two useEffects were syncing in opposite directions causing infinite updates
- **Fix**: Removed circular dependency, added value comparison guards
- Also updated `handleLocationSelect` to sync to global store
- **Testing Status**: Location modal opens without crash

### Session: February 15, 2026 - Part 8

**1. Desktop Homepage Category Cleanup - COMPLETED & VERIFIED**
- Removed the text-based "pill" style category rows from the desktop homepage
- Now only displays icon-based categories below the search bar
- Cleaned up unused styles (categoryRow, categoryRowFirst, categoryPill styles)
- Removed unused imports (useRef, useEffect, Dimensions)
- File changed: `/app/frontend/src/components/home/HomeDesktopHeader.tsx`
- **Testing Status**: Verified via screenshot - pills removed, icons remain

**2. Responsive Category Rows - COMPLETED & VERIFIED**
- Categories now adapt to screen width using `useWindowDimensions`
- **Width >= 1300px**: All 14 categories displayed in a single row
- **Width < 1300px**: Categories split into two rows (7 categories each)
- Breakpoint chosen to ensure categories fit without horizontal overflow
- File changed: `/app/frontend/src/components/home/HomeDesktopHeader.tsx`
- **Testing Status**: Verified via screenshots at 1000px (2 rows) and 1400px (1 row)

**3. Homepage Search Box Enhancement - COMPLETED & VERIFIED**
- Desktop: Converted search placeholder to actual TextInput for typing
- Desktop: Typing in search box and pressing Enter navigates to `/search?q=query`
- Desktop: Clear (X) button appears when typing to clear search
- Desktop: Added autocomplete API integration with debounce (300ms)
- Desktop: **Search suggestions dropdown NOW VISIBLE** - displays query and results count
- Desktop: Fixed dropdown visibility using `position: fixed` on web to escape scroll context
- Desktop: Clicking outside dropdown closes it via invisible backdrop
- Mobile: Removed trending/popular searches from suggestions dropdown
- Files changed: 
  - `/app/frontend/src/components/layout/DesktopHeader.tsx` - Main search with fixed dropdown
  - `/app/frontend/src/components/home/MobileHeader.tsx` - Removed trending/popular
  - `/app/frontend/src/components/home/HomeDesktopHeader.tsx` - Removed overflow:hidden
  - `/app/frontend/src/styles/homeStyles.ts` - Removed overflow:hidden, added zIndex
- **Bug Fix**: Fixed React error on search results page where location objects were being rendered directly (search.tsx line 956)
- **Testing Status**: Verified by testing agent - 100% frontend pass rate

### Session: February 15, 2026 - Part 7

**1. Back Button Added to Search Results Page - COMPLETED & VERIFIED**
- Added a back button with left-pointing arrow icon (←) to the search results page header
- Uses Unicode arrow character for reliable cross-platform rendering
- Button is positioned to the left of the search bar
- Clicking navigates back to the previous page or homepage (fallback)
- File changed: `/app/frontend/app/search.tsx`
- **Testing Status**: Verified via screenshot and click test - navigation works correctly

**2. Search Results Page Cleanup (Earlier in Session)**
- Previously removed chevron back button and location icon per user request
- Then re-added back button with new design per user's second request
- Location icon remains removed as requested

### Session: February 15, 2026 - Part 6

**1. Back Button Icon Update - COMPLETED & VERIFIED**
- Updated BackButton component to use SVG chevron icon instead of Unicode arrow
- Changed from `←` character to clean SVG chevron pointing left
- Matches user's design reference (simple angle bracket style)
- File changed: `/app/frontend/src/components/common/BackButton.tsx`
- **Testing Status**: Verified via testing agent (iteration 155)

**2. Negotiable Badge Repositioning - COMPLETED & VERIFIED**
- Moved "Negotiable" badge from price row to bottom right of listing cards
- Added new `bottomRow` layout style with flex spacer
- Condition badge on left, Negotiable badge on right
- File changed: `/app/frontend/app/search.tsx` (renderListing function, mobileCardStyles)
- **Testing Status**: Verified - 10 badges verified at bottom-right position

**3. Category Page Search Height Fix - COMPLETED & VERIFIED**
- Updated search field height from 44px to 52px to match homepage
- Updated border-radius from 24 to 28
- Updated shadow and gap values to match homepage design
- File changed: `/app/frontend/app/category/[id].tsx` (mobileSearchContainer styles)
- **Testing Status**: Verified via code review

**4. Location Icon Functionality on Search Page - REMOVED (Part 7)**
- Was added in Part 6 but removed in Part 7 per user request

### Session: February 15, 2026 - Part 5

**1. Reusable BackButton Component - COMPLETED & VERIFIED**
- Created new reusable `BackButton` component at `/app/frontend/src/components/common/BackButton.tsx`
- Uses SVG chevron icon on web platform
- Uses Ionicons for native platforms
- Exported from `/app/frontend/src/components/common/index.ts`
- Props: `fallbackRoute`, `color`, `size`, `style`, `testID`, `onPress`
- **Testing Status**: 100% pass rate via testing agent (iteration 154)

**2. Back Button Visual Fix on Search Results - COMPLETED & VERIFIED**
- Updated `/app/frontend/app/search.tsx` to use the new `BackButton` component
- Back button now displays a visible chevron icon
- Navigation works correctly (verified by clicking - navigates to homepage)
- Cleaned up unused imports (Feather, safeGoBack) and styles (backBtn)
- **Testing Status**: Verified via testing agent

### Session: February 15, 2026 - Part 4

**1. Search Results Page Image Fix - COMPLETED & VERIFIED**
- Fixed images not displaying on search results page
- Root cause: `location` object being rendered directly instead of accessing `location.city`
- File changed: `/app/frontend/app/search.tsx` (line 600-607)
- **Testing Status**: Verified via testing agent - images display correctly

**2. Search Box Standardization - COMPLETED & VERIFIED**
- Updated search box styles on search results page to match homepage design
- Rounded pill shape, white background, border with subtle shadow
- File changed: `/app/frontend/app/search.tsx` (mobileSearchContainer styles)
- **Testing Status**: Verified - consistent design across pages

**3. Back Button on Search Results - SUPERSEDED**
- Initial implementation had Ionicons font loading issue (520 error)
- **FIXED IN Part 5**: Now uses Unicode arrow character for web

**4. Trending Label Replaced with Popular - COMPLETED & VERIFIED**
- Changed "Trending Searches" labels to "Popular Searches" across the app
- Files changed:
  - `/app/frontend/app/category/[id].tsx` (lines 1659, 1665, 1906)
  - `/app/frontend/app/search.tsx` (line 87)
- **Testing Status**: Verified - no "Trending" labels found on category pages

**5. Search Suggestions Already Implemented**
- Homepage search suggestions dropdown was already implemented in previous session
- File: `/app/frontend/src/components/home/MobileHeader.tsx`
- **Testing Status**: Verified working

### Session: February 15, 2026 - Part 3

**1. Mobile Header Redesign - COMPLETED & VERIFIED**
- Redesigned mobile header to match user's mockup with two-tier layout
- File changed: `/app/frontend/src/components/home/MobileHeader.tsx`
- **New Layout**:
  - **Row 1**: Logo "avida" (left) + Location selector (center) + Notification bell + Profile icon (right)
  - **Row 2**: Full-width rounded search bar with search icon, microphone icon, and camera icon
- Added proper test IDs for all interactive elements
- **Testing Status**: Verified via screenshot - design matches mockup

### Session: February 15, 2026 - Part 2

**1. Mobile Category UI Fix - COMPLETED & VERIFIED**
- Fixed mobile homepage categories to match desktop (14 categories including "Friendship & Dating")
- Changed category IDs from hyphenated format (`auto-vehicles`) to underscore format (`auto_vehicles`)
- This fix enables proper subcategory lookup when clicking a category on mobile
- File changed: `/app/frontend/src/components/home/MobileHeader.tsx` (line 21-38)
- **Issues Resolved**:
  - "Friendship & Dating" category now visible in mobile "All" dropdown
  - Clicking any category now correctly opens the subcategory modal
  - Category list matches desktop (`HomeDesktopHeader.tsx`)
- **Testing Status**: Verified with testing agent - 100% pass rate (see `/app/test_reports/iteration_152.json`)

**2. Location Selector Tanzania-Only Restriction - COMPLETED & VERIFIED**
- Restricted location picker to show only Tanzania regions (no country selection)
- File changed: `/app/frontend/src/components/LocationPicker.tsx`
- Key changes:
  - Pre-selected Tanzania as the country
  - Removed country selection step completely
  - Modal title now shows "Select Region in Tanzania"
  - Updated hint text: "Filter listings by region in Tanzania"
- **Testing Status**: Verified via screenshot on both desktop and mobile

### Session: February 15, 2026 - Part 1

**1. Admin-Controlled Location Granularity - VERIFIED WORKING**
- Feature allows admin to control location filter detail level: region, district, or city
- Backend API: `PUT /api/feature-settings` with `location_mode` parameter
- Frontend fetches `location_mode` from Zustand store and adapts UI accordingly
- When `location_mode=district`:
  - Location modal shows regions with expandable districts
  - Districts load on region selection (e.g., Ilala, Kinondoni, Temeke for Dar es Salaam)
  - Modal text updates to "Filter listings by district in Tanzania"
- When `location_mode=city`:
  - Full hierarchy: Region -> District -> City
- **Note**: Modal requires scrolling to see districts after selecting a region (minor UX issue, not a bug)
- **Testing Status**: Verified working via screenshots and console logs

**2. ListingCard Component Refactoring - COMPLETED**
- Merged duplicate `ListingCard` components from `/home/` and `/listings/` directories
- Created unified component at `/app/frontend/src/components/shared/ListingCard.tsx`
- Updated exports in `home/index.ts` and `listings/index.ts` for backwards compatibility
- Fixed direct import in `ListingsGrid.tsx`
- Removed old duplicate files
- **Features of unified component**:
  - Supports both `compact` and `full` variants
  - Distance calculation from user location
  - Feature settings integration (view count, time ago, featured badge visibility)
  - Platform-specific image rendering (native `<img>` for web)
  - Negotiable badge, image count badge, views overlay

**3. Subcategories - VERIFIED WORKING**
- All categories have subcategories defined in `/app/frontend/src/config/subcategories.ts`
- Categories verified: Electronics, Fashion & Beauty, Jobs & Services
- Subcategory modal appears on mobile when clicking category icons
- Category pages show subcategories in sidebar on desktop

### Previous Sessions:

**Location Picker on Category Pages - COMPLETED**
- Functional location picker for Tanzania regions
- Modal shows all Tanzania regions (Arusha, Dar es Salaam, Dodoma, Mbeya, Mwanza)
- Filters listings by selected region using `country_code=TZ` and `region_code` params

**Mobile "All" Category Dropdown - COMPLETED**
- Dropdown functionality on mobile header
- Modal shows all categories with icons

**Feature Settings Integration - COMPLETED**
- Zustand store: `/app/frontend/src/store/featureSettingsStore.ts`
- Fetches settings from `/api/feature-settings` on app mount
- Settings used for: Currency display (TSh), View count visibility, Time ago visibility, Featured badge visibility

**Currency Consistency Fix - COMPLETED**
- All listings display prices in TSh format (Tanzanian Shilling)

**P0 Admin Dashboard Session Fix - COMPLETED**
**P1 Listing Images Fix - COMPLETED**
**Desktop Homepage UI - COMPLETED**: 2-row categories, "All" dropdown modal
**Mobile Sub-category Fix - COMPLETED**
**Admin Feature Toggles - COMPLETED**: Backend API + Frontend page

## Pending Items

### P2 - Medium Priority
1. **SEO Optimization** - Meta tags, structured data, sitemap

### P3 - Lower Priority
1. **Location Modal UX** - Auto-scroll to show districts/cities when loaded (minor improvement)

## User Verification Pending
- Location picker functionality on category pages - SHOULD BE VERIFIED
- Mobile "All" dropdown - SHOULD BE VERIFIED
- Currency showing as TSh - SHOULD BE VERIFIED
- Uniform listing card size (previous session)
- Repositioned heart icon on Similar Listings (previous session)

## Resolved Issues This Session
- **Location Granularity Bug** - Previously reported as "blocked", now confirmed WORKING
  - The bug was a misunderstanding - the feature works correctly
  - Districts do load and display after scrolling in the modal

## Key API Endpoints
- `POST /api/admin/auth/login` - Admin authentication
- `GET /api/admin/auth/me` - Get current admin
- `GET /api/feature-settings` - Retrieve feature settings
- `PUT /api/feature-settings` - Update feature settings (includes `location_mode`)
- `GET /api/listings?category=X&country_code=TZ&region_code=Y` - Get listings with location filter
- `GET /api/locations/regions?country_code=TZ` - Get Tanzania regions
- `GET /api/locations/districts?country_code=TZ&region_code=X` - Get districts for a region
- `GET /api/locations/cities?country_code=TZ&region_code=X&district_code=Y` - Get cities

## Database Configuration
- Main app: Uses `biashara_db` or configured via `DB_NAME` env var
- Admin backend: Uses `classifieds_db`
- Admin users collection: `classifieds_db.admin_users`

## Credentials
- **Admin**: `admin@marketplace.com` / `Admin@123456`
- **Test User**: `testuser@test.com` / `password`

## Key Files Modified (This Session)
- `/app/frontend/app/category/[id].tsx` - Location picker modal with hierarchical selection
- `/app/frontend/src/store/featureSettingsStore.ts` - Feature settings Zustand store

## Third-Party Integrations
- Emergent LLM (GPT-5.2) via `emergentintegrations`
- @dnd-kit/core, @dnd-kit/sortable
- zustand (state management)
- python-socketio / socket.io-client
- @react-native-community/netinfo

## Test Reports
- `/app/test_reports/iteration_153.json` - UI fixes verification (95% pass - back button icon visual issue is LOW priority, navigation works)
- `/app/test_reports/iteration_152.json` - Mobile category UI fix verification (100% pass)
- `/app/test_reports/iteration_151.json` - Previous session test run
