# Product Requirements Document - Avida Marketplace

## Original Problem Statement
Build a full-stack classifieds application for Tanzania with admin dashboard, SEO suite, AI tools, deep linking, and A/B testing features.

## Core Architecture
- **Frontend**: React Native/Expo web application
- **Backend**: FastAPI with MongoDB
- **Admin Dashboard**: Next.js application at `/api/admin-ui`
- **Admin Backend**: FastAPI at port 8002 (proxied via main backend)

## What's Been Implemented

### Session: February 15, 2026 - Part 2 (Latest)

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
- `/app/test_reports/iteration_151.json` - Latest test run from previous session
