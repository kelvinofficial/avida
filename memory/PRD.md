# Product Requirements Document - Avida Marketplace

## Original Problem Statement
Build a full-stack classifieds application with admin dashboard, SEO suite, AI tools, deep linking, and A/B testing features.

## Core Architecture
- **Frontend**: React Native/Expo web application
- **Backend**: FastAPI with MongoDB
- **Admin Dashboard**: Next.js application at `/api/admin-ui`
- **Admin Backend**: FastAPI at port 8002 (proxied via main backend)

## What's Been Implemented

### Session: February 15, 2026

**P0 Admin Dashboard Session Fix - COMPLETED**
- Fixed admin user `is_active` field (was `None`, now `True`)
- Enhanced API client token loading from localStorage on each request
- Smart 401 handling to prevent redirect loops
- Admin login and session now working correctly

**P1 Listing Images Fix - COMPLETED**
- Root cause: React Native Web's Image component styling issues
- Solution: Used native `<img>` tag for web with explicit height
- File modified: `/app/frontend/src/components/listings/ListingCard.tsx`
- Both base64 and HTTP URL images now display correctly

**Previous Session Work:**
- Admin Access Restored (bcrypt password hash fix)
- Desktop Homepage UI: 2-row categories, "All" dropdown modal
- Mobile Sub-category Fix: Added missing category definitions
- Admin Feature Toggles: Backend API + Frontend page created
- Listing Card Polish: Uniform heights, repositioned heart icon

## Pending Issues (Prioritized)

### P1 - High Priority
1. **Location picker non-functional** - On category pages, doesn't filter listings

### P2 - Medium Priority
1. **"All" dropdown on mobile header** - Only implemented on desktop
2. **Tanzania-only location logic** - Admin control over granularity
3. **Wire feature settings to frontend** - Connect toggles to main app
4. **SEO Optimization** - Meta tags, structured data, sitemap

## User Verification Pending
- Uniform listing card size
- Repositioned heart icon on Similar Listings
- Increased search field height

## Key API Endpoints
- `POST /api/admin/auth/login` - Admin authentication
- `GET /api/admin/auth/me` - Get current admin (requires `is_active: True`)
- `GET /api/feature-settings` - Retrieve feature settings
- `PUT /api/feature-settings` - Update feature settings
- `GET /api/listings?category=X&location=Y` - Get listings with filters

## Database Configuration
- Main app: Uses `biashara_db` or configured via `DB_NAME` env var
- Admin backend: Uses `classifieds_db`
- Admin users collection: `classifieds_db.admin_users`

## Credentials
- **Admin**: `admin@marketplace.com` / `Admin@123456`
- **Test User**: `testuser@test.com` / `password`

## Key Files Modified (Latest Session)
- `/app/admin-dashboard/frontend/src/lib/api.ts` - Token loading fixes
- `/app/admin-dashboard/frontend/src/app/dashboard/layout.tsx` - Auth flow
- `/app/frontend/src/components/listings/ListingCard.tsx` - Native img tag for web
- `/app/frontend/src/components/common/OptimizedImage.tsx` - Style fixes
- MongoDB `classifieds_db.admin_users` - is_active field fixed

## Third-Party Integrations
- Emergent LLM (GPT-5.2) via `emergentintegrations`
- @dnd-kit/core, @dnd-kit/sortable
- zustand (state management)
- python-socketio / socket.io-client
- @react-native-community/netinfo
