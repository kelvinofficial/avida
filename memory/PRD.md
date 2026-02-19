# LocalMarket (Avida) - Product Requirements Document

## Original Problem Statement
Build a full-stack React Native/Expo marketplace application with a FastAPI backend. The app experienced critical failures on Android APK builds including:
- API connectivity issues (listings not loading, auth failures)
- UI layout problems (bottom content clipped by OS navigation bar)
- Core feature regressions (favorites, recently viewed not working)

## Current Status: December 2025

### What's Been Implemented

#### Core Infrastructure
- **Backend**: FastAPI with MongoDB database
- **Frontend**: React Native/Expo with TypeScript
- **Authentication**: JWT-based auth with Zustand store
- **API Client**: Centralized axios instance with auth interceptors

#### API Connectivity Fix (Dec 2025) ✅
**Problem**: `process.env.EXPO_PUBLIC_BACKEND_URL` was undefined in APK builds, causing complete API failure.

**Solution Implemented**:
- Created centralized `API_URL` export in `src/utils/api.ts` with multi-source fallback:
  1. `Constants.expoConfig.extra.apiUrl` (from app.json, works in APK)
  2. `process.env.EXPO_PUBLIC_BACKEND_URL` (works in web/dev)
  3. Hardcoded `PRODUCTION_API_URL` constant (always works)
- Replaced **27+ hardcoded env variable usages** across the codebase

**Files Modified**:
- `/app/frontend/src/utils/api.ts` - Central API configuration
- `/app/frontend/app/login.tsx`
- `/app/frontend/app/register.tsx`
- `/app/frontend/app/chat/[id].tsx`
- `/app/frontend/app/(tabs)/messages.tsx`
- `/app/frontend/app/(tabs)/streak-leaderboard.tsx`
- `/app/frontend/app/category/[id].tsx`
- `/app/frontend/app/post/index.tsx`
- `/app/frontend/app/blog/[slug].tsx`
- `/app/frontend/app/blog/index.tsx`
- `/app/frontend/app/business/[slug].tsx`
- `/app/frontend/app/business/edit.tsx`
- `/app/frontend/app/badges/seasonal-gallery.tsx`
- `/app/frontend/src/store/featureSettingsStore.ts`
- `/app/frontend/src/hooks/useHomeData.ts`
- `/app/frontend/src/hooks/usePhotographyGuides.ts`
- `/app/frontend/src/services/deepLinking.ts`
- `/app/frontend/src/components/seo/SEOHead.tsx`
- `/app/frontend/src/components/seo/StructuredData.tsx`
- `/app/frontend/src/components/common/FavoriteNotificationProvider.tsx`
- `/app/frontend/src/components/common/SocialShareButtons.tsx`
- `/app/frontend/src/components/layout/DesktopHeader.tsx`
- `/app/frontend/src/components/layout/DesktopPageLayout.tsx`
- `/app/frontend/src/components/home/SearchSuggestions.tsx`

#### Layout System Fix (Dec 2025) ✅
- Created `/app/frontend/src/components/common/ScreenLayout.tsx` for standardized safe area handling
- Fixed `profile/saved.tsx` ListEmptyComponent logic and added `mobileListEmpty` style
- SubcategoryModal already has correct sticky header + scrollable content structure

### Prioritized Backlog

#### P0 - Critical
1. ✅ **Instant Listings Feed Integrated**: Implemented cache-first architecture for fast listings display
2. ✅ **Subcategory Drawer Scroll Fix**: ScrollView now works correctly with bounces and nested scroll enabled
3. ✅ **UI Layout Fix**: All main screens (Login, Profile, Saved, Messages) display correctly

#### P1 - High Priority
1. **Recently Viewed Feature**: Not working, needs investigation
2. **Share Button & Deep Linking**: Needs to be verified on physical device
3. **Authentication Persistence**: Session may not persist on physical device - needs testing

#### P2 - Medium Priority
1. **Performance Validation**: Monitor actual performance on physical device
2. **Data Mismatch on Profile**: Stats may not match list counts

#### Future/Backlog
- Performance validation & Lighthouse audit
- Full API integrations for demo features
- Multi-language content generation (German, Swahili)
- Firebase push notifications configuration

### Instant Feed Implementation (Dec 2025) ✅
**Problem**: Listings were very slow to display, causing poor user experience on mobile.

**Solution Implemented**:
- Created new `/api/feed/listings` endpoint with cursor-based pagination
- Implemented cache-first rendering strategy with `useInstantListingsFeed` hook
- Home screen now uses FlatList with instant feed data
- MongoDB indexes created for optimal feed performance

**Key Files**:
- `/app/backend/routes/feed.py` - High-performance feed endpoint
- `/app/frontend/src/hooks/useInstantListingsFeed.ts` - Cache-first feed hook
- `/app/frontend/src/utils/feedCache.ts` - AsyncStorage caching utility
- `/app/frontend/app/(tabs)/index.tsx` - Refactored home screen using instant feed

**Features**:
- Cache-first: Shows cached data immediately (<150ms target)
- Background refresh: Updates data silently without blocking UI
- Cursor-based pagination: Stable results during refresh
- Optimized FlatList with proper virtualization

### Bug Fixes (Feb 2025)
- **NetInfo abort error**: Fixed by wrapping NetInfo listeners in try-catch to handle abort signals gracefully
- **Home screen padding**: Fixed duplicate padding on FlatList contentContainerStyle
- **Backend similar listings crash**: Fixed location dict handling in calculate_generic_similarity()
- **Subcategory drawer scroll**: Rebuilt CategoryDrawer with proper sticky header and scrollable content

## Technical Architecture

### Frontend Structure
```
/app/frontend/
├── app.json                    # Expo config with extra.apiUrl
├── app/                        # Expo Router pages
│   ├── (app)/_layout.tsx
│   ├── (tabs)/_layout.tsx
│   ├── login.tsx
│   ├── register.tsx
│   ├── category/[id].tsx
│   ├── listing/[id].tsx
│   ├── chat/[id].tsx
│   ├── profile/
│   └── ...
├── src/
│   ├── components/
│   │   ├── common/
│   │   ├── home/
│   │   ├── layout/
│   │   └── seo/
│   ├── hooks/
│   ├── store/
│   ├── utils/
│   │   └── api.ts             # Centralized API configuration
│   └── services/
└── package.json
```

### Backend Structure
```
/app/backend/
├── main.py                     # FastAPI entry point
├── routes/                     # API route modules
└── requirements.txt
```

### Key API Endpoints
- `GET /api/listings` - Fetch listings
- `GET /api/categories` - Fetch categories
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/users/me` - Current user profile
- `POST /api/favorites/{listingId}` - Toggle favorite

## Test Credentials
- **Admin**: admin@marketplace.com / Admin@123456
- **Test User**: test-1721832049265@test.com / password123

## Known Issues
- UI layout issues require global architectural solution
- Some screens may still show blank until API fix is verified in APK
- AI SEO features are mocked

## Dependencies
- expo-constants: For reading app.json config in APK builds
- axios: HTTP client
- zustand: State management
- expo-router: Navigation
- react-native-safe-area-context: Safe area handling
