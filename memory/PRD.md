# Product Requirements Document - Avida Marketplace

## Original Problem Statement
Build a local marketplace application (Avida) with:
1. Location-based filtering (Country > Region selection instead of GPS "Near Me")
2. Business Profile feature for verified sellers

## What's Been Implemented

### 2026-02-10: Business Profile Verification Tiers & Featured Sellers
**COMPLETED**
- **Verification Tiers System**
  - "Verified Business" - Standard verified tier with green checkmark badge
  - "Premium Verified Business" - Premium tier (paid + admin approval) with gold diamond badge
  - New fields: `is_premium`, `verification_tier` (none/verified/premium), `premium_expires_at`
  - Admin endpoints: `/upgrade-premium`, `/revoke-premium`

- **Featured Sellers Section on Homepage**
  - Displays verified sellers (Premium first, then Verified)
  - Shows logo, business name, location, listing count, tier badge
  - Horizontal scrolling carousel design
  - Hides automatically when no verified sellers exist

- **Region Coordinates Support**
  - Added `lat` and `lng` fields to Region model
  - Admin endpoint to update region coordinates
  - Enables distance calculations for region-based filtering

- **Bug Fixes**
  - Fixed "NaNkm away" display bug - now validates lat/lng before distance calculation
  - Region search bar visibility confirmed working

### 2026-02-10 (Earlier): Business Profile MVP
**COMPLETED**
- Business Profile edit form with all fields
- Public profile page with verification badges
- Backend CRUD APIs
- Admin verification endpoints
- Navigation integration in profile menu

### Earlier: Location System Refactor
**COMPLETED**
- Removed GPS-based "Near Me" functionality
- Simplified to Country > Region selection
- localStorage persistence for web

## API Endpoints

### Business Profiles (User)
- `POST /api/business-profiles/` - Create profile
- `GET /api/business-profiles/me` - Get user's profile
- `PUT /api/business-profiles/me` - Update profile
- `DELETE /api/business-profiles/me` - Delete profile
- `POST /api/business-profiles/me/logo` - Upload logo
- `POST /api/business-profiles/me/request-verification` - Request verification
- `GET /api/business-profiles/public/{identifier}` - Public profile
- `GET /api/business-profiles/public/{identifier}/listings` - Profile listings
- `GET /api/business-profiles/directory` - Browse all profiles
- `GET /api/business-profiles/featured` - **NEW** Featured sellers for homepage

### Business Profiles (Admin)
- `GET /api/admin/business-profiles/` - List all profiles
- `GET /api/admin/business-profiles/verification-requests` - Pending verifications
- `GET /api/admin/business-profiles/stats/overview` - Statistics
- `POST /api/admin/business-profiles/{id}/verify` - Approve/reject standard verification
- `POST /api/admin/business-profiles/{id}/upgrade-premium` - **NEW** Upgrade to Premium
- `POST /api/admin/business-profiles/{id}/revoke-premium` - **NEW** Revoke Premium
- `POST /api/admin/business-profiles/{id}/toggle-verified` - Toggle status
- `POST /api/admin/business-profiles/{id}/toggle-active` - Activate/deactivate

### Location System (Admin)
- `PUT /api/admin/locations/regions/coordinates` - **NEW** Update region lat/lng

## Database Schema

### business_profiles Collection
```json
{
  "id": "uuid",
  "user_id": "string",
  "business_name": "string",
  "identifier": "string (unique slug)",
  "description": "string",
  "logo_url": "string",
  "cover_url": "string",
  "brand_color": "string (#hex)",
  "primary_categories": ["string"],
  "phone": "string",
  "email": "string",
  "address": "string",
  "city": "string",
  "country": "string",
  "is_verified": "boolean",
  "is_premium": "boolean",
  "verification_tier": "none|verified|premium",
  "verification_status": "none|pending|approved|rejected",
  "premium_expires_at": "datetime",
  "is_active": "boolean",
  "total_views": "number",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### location_regions Collection
```json
{
  "country_code": "string",
  "region_code": "string",
  "name": "string",
  "lat": "float (optional)",
  "lng": "float (optional)",
  "created_at": "datetime"
}
```

## Tech Stack
- **Frontend**: React Native + Expo (web), TypeScript
- **Backend**: Python FastAPI, MongoDB
- **Persistence**: localStorage (web) / AsyncStorage (native)

## P0/P1/P2 Features Remaining

### P0 (Critical) - Done
- [x] Business Profile creation
- [x] Public profile page
- [x] Admin verification endpoints
- [x] Verification tiers (Verified/Premium)
- [x] Featured Sellers section
- [x] Region coordinates support
- [x] NaNkm bug fix

### P1 (High Priority)
- [ ] Add data-testid attributes for better test coverage
- [ ] Pre-populate some regions with lat/lng coordinates

### P2 (Medium Priority)
- [ ] Cover image upload for business profiles
- [ ] Brand color customization
- [ ] Social network links
- [ ] Admin UI page for managing business profiles

### Future/Backlog
- [ ] Admin-defined "Features" and "Accepted Payments"
- [ ] Image gallery for profiles
- [ ] Video gallery (YouTube links)
- [ ] Sitemap generation for SEO
- [ ] Profile picture plugin integration
- [ ] Business directory with advanced search/filters
- [ ] Premium subscription payment integration

## Key Files Reference
- `/app/frontend/app/(tabs)/index.tsx` - Homepage with Featured Sellers & NaNkm fix
- `/app/frontend/app/business/edit.tsx` - Business profile edit form
- `/app/frontend/app/business/[slug].tsx` - Public profile with tier badges
- `/app/backend/business_profile_system.py` - Complete backend logic
- `/app/backend/location_system.py` - Location system with region coordinates
- `/app/backend/server.py` - Route registration

## Test Reports
- `/app/test_reports/iteration_62.json` - Initial Business Profile MVP tests
- `/app/test_reports/iteration_63.json` - Verification tiers & Featured Sellers tests
