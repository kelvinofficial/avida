# Product Requirements Document - Avida Marketplace

## Original Problem Statement
Build a full-stack classifieds application for Tanzania with admin dashboard, SEO suite, AI tools, deep linking, and A/B testing features.

## Core Architecture
- **Frontend**: React Native/Expo web application
- **Backend**: FastAPI with MongoDB
- **Admin Dashboard**: Next.js application at `/api/admin-ui`
- **Admin Backend**: FastAPI at port 8002 (proxied via main backend)

## What's Been Implemented

### Session: February 15, 2026 (Continued)

**5. Duplicate Dodoma Region Fix - COMPLETED**
- Removed duplicate "DMA" region entry from `location_regions` collection
- Updated "DOD" region with coordinates (lat: -6.173, lng: 35.741)
- Tanzania now has 5 unique regions: Arusha, Dar es Salaam, Dodoma, Mbeya, Mwanza
- Backend Python script used for data cleanup

### Session: February 15, 2026 (Previous)

**1. Location Picker on Category Pages - COMPLETED**
- Added functional location picker for Tanzania regions
- Modal shows all Tanzania regions (Arusha, Dar es Salaam, Dodoma, Mbeya, Mwanza, etc.)
- Filters listings by selected region using `country_code=TZ` and `region_code` params
- Clear button to reset filter
- Files: `/app/frontend/app/category/[id].tsx` (state, modal, API integration)

**2. Mobile "All" Category Dropdown - COMPLETED**
- Added dropdown functionality to mobile header
- Modal shows all categories with icons
- Category selection works correctly
- Files: `/app/frontend/src/components/home/MobileHeader.tsx`

**3. Feature Settings Integration - COMPLETED**
- Created Zustand store: `/app/frontend/src/store/featureSettingsStore.ts`
- Fetches settings from `/api/feature-settings` on app mount
- ListingCard components now use settings for:
  - Currency display (TSh - Tanzanian Shilling)
  - View count visibility
  - Time ago visibility
  - Featured badge visibility
- Files modified:
  - `/app/frontend/app/_layout.tsx` (store initialization)
  - `/app/frontend/src/components/listings/ListingCard.tsx` (conditional rendering)
  - `/app/frontend/src/components/home/ListingCard.tsx` (currency format)

**4. Currency Consistency Fix - COMPLETED**
- All listings now display prices in TSh format
- Example: TSh 50.000.000, TSh 1.999, TSh 200

### Previous Session Work:
- P0 Admin Dashboard Session Fix (is_active field)
- P1 Listing Images Fix (React Native Web styling)
- Desktop Homepage UI: 2-row categories, "All" dropdown modal
- Mobile Sub-category Fix
- Admin Feature Toggles: Backend API + Frontend page

## Pending Issues

### P1 - High Priority
1. **Tanzania-only location logic** - Admin control over display granularity (region/city)

### P2 - Medium Priority
1. **SEO Optimization** - Meta tags, structured data, sitemap
2. **Duplicate region data** - "Dodoma" appears twice in location picker (data cleanup)

### P3 - Lower Priority
1. **Mobile location picker testing** - Touch interaction works but automated testing had issues

## User Verification Pending
- Location picker functionality on category pages
- Mobile "All" dropdown
- Currency showing as TSh
- Uniform listing card size (previous session)
- Repositioned heart icon on Similar Listings (previous session)

## Key API Endpoints
- `POST /api/admin/auth/login` - Admin authentication
- `GET /api/admin/auth/me` - Get current admin
- `GET /api/feature-settings` - Retrieve feature settings
- `PUT /api/feature-settings` - Update feature settings
- `GET /api/listings?category=X&country_code=TZ&region_code=Y` - Get listings with location filter
- `GET /api/locations/regions?country_code=TZ` - Get Tanzania regions

## Database Configuration
- Main app: Uses `biashara_db` or configured via `DB_NAME` env var
- Admin backend: Uses `classifieds_db`
- Admin users collection: `classifieds_db.admin_users`

## Credentials
- **Admin**: `admin@marketplace.com` / `Admin@123456`
- **Test User**: `testuser@test.com` / `password`

## Key Files Modified (This Session)
- `/app/frontend/app/category/[id].tsx` - Location picker modal and filtering
- `/app/frontend/src/components/home/MobileHeader.tsx` - Category dropdown
- `/app/frontend/src/store/featureSettingsStore.ts` - NEW: Feature settings Zustand store
- `/app/frontend/src/components/listings/ListingCard.tsx` - Feature settings integration
- `/app/frontend/src/components/home/ListingCard.tsx` - Currency formatting
- `/app/frontend/app/_layout.tsx` - Store initialization

## Third-Party Integrations
- Emergent LLM (GPT-5.2) via `emergentintegrations`
- @dnd-kit/core, @dnd-kit/sortable
- zustand (state management)
- python-socketio / socket.io-client
- @react-native-community/netinfo

## Test Reports
- `/app/test_reports/iteration_151.json` - Latest test run
