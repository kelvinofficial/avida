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
- Replaced 24+ hardcoded env variable usages across the codebase

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

### Prioritized Backlog

#### P0 - Critical
1. **APK Testing**: User must build and test new APK to verify API fix
2. **Global UI Layout Refactor**: Bottom content clipped on many screens
   - Create standardized `<ScreenLayout>` component
   - Implement proper safe area handling for all screens
   - Affected: Chat, Notifications, Profile, Create Listing, Select Category

#### P1 - High Priority
3. **Blank Screens Fix**: Saved Items, Badges screens appear blank
   - Likely dependent on API connectivity fix working
4. **Core Features**: Favorites and Recently Viewed not persisting
   - Likely symptom of API/auth issues

#### P2 - Medium Priority
5. **Category Drawer**: Implement sticky header with scrollable subcategories

#### Future/Backlog
- Performance validation & Lighthouse audit
- Full API integrations for demo features
- Multi-language content generation (German, Swahili)
- Firebase push notifications configuration

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
