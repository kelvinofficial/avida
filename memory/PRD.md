# Product Requirements Document - Avida Marketplace

## Original Problem Statement
Build a local marketplace application (Avida) with:
1. Location-based filtering (Country > Region selection instead of GPS "Near Me")
2. Business Profile feature for verified sellers

## What's Been Implemented

### 2026-02-10: Business Profile MVP
**COMPLETED**
- **Frontend Edit Page** (`/app/frontend/app/business/edit.tsx`)
  - Logo upload placeholder with upload button
  - Business Name (required), Description (with character counter)
  - Primary Categories selector (up to 5 selectable chips)
  - Contact fields: Phone, Email, Address, City, Country
  - Verification status banner (shows pending/verified status)
  - Request Verification button
  - Public profile URL preview
  - Delete profile option

- **Public Profile Page** (`/app/frontend/app/business/[slug].tsx`)
  - Profile header with logo, name, location, stats
  - Verified badge display (when approved)
  - About section with description
  - Call and Email contact buttons
  - Category filter chips
  - Listings grid with empty state

- **Backend API Endpoints**
  - `POST /api/business-profiles/` - Create profile
  - `GET /api/business-profiles/me` - Get user's profile
  - `PUT /api/business-profiles/me` - Update profile
  - `DELETE /api/business-profiles/me` - Delete profile
  - `POST /api/business-profiles/me/logo` - Upload logo
  - `POST /api/business-profiles/me/request-verification` - Request verification
  - `GET /api/business-profiles/public/{identifier}` - Public profile
  - `GET /api/business-profiles/public/{identifier}/listings` - Profile listings
  - `GET /api/business-profiles/directory` - Browse all profiles

- **Admin API Endpoints**
  - `GET /api/admin/business-profiles/` - List all profiles
  - `GET /api/admin/business-profiles/verification-requests` - Pending verifications
  - `GET /api/admin/business-profiles/stats/overview` - Statistics
  - `POST /api/admin/business-profiles/{id}/verify` - Approve/reject
  - `POST /api/admin/business-profiles/{id}/toggle-verified` - Toggle status
  - `POST /api/admin/business-profiles/{id}/toggle-active` - Activate/deactivate

- **Navigation Integration**
  - Added "Business Profile" option to user profile activity menu

### Earlier: Location System Refactor (Completed)
- Removed GPS-based "Near Me" functionality
- Simplified to Country > Region selection flow
- Custom Storage utility for web localStorage persistence
- Clear Recent Locations button

## Known Issues (P1 - Lower Priority)
1. **NaNkm Display Bug**: Listing cards show "NaNkm away" for region-based filtering (distance calculation assumes GPS coordinates)
2. **Region Search Bar**: Implemented but not visually rendering in LocationPicker
3. **Location Persistence**: Intermittent issues with selection not persisting on reload

## Tech Stack
- **Frontend**: React Native + Expo (web), TypeScript
- **Backend**: Python FastAPI, MongoDB
- **Persistence**: localStorage (web) / AsyncStorage (native)

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
  "verification_status": "none|pending|approved|rejected",
  "is_active": "boolean",
  "total_views": "number",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

## P0/P1/P2 Features Remaining

### P0 (Critical) - Done
- [x] Business Profile creation
- [x] Public profile page
- [x] Admin verification endpoints

### P1 (High Priority)
- [ ] Fix NaNkm display bug in ListingCard
- [ ] Fix region search bar visibility
- [ ] Add data-testid attributes for better test coverage

### P2 (Medium Priority)
- [ ] Cover image upload
- [ ] Brand color customization
- [ ] Social network links
- [ ] Admin UI page for managing business profiles

### Future/Backlog
- [ ] Admin-defined "Features" and "Accepted Payments"
- [ ] Image gallery for profiles
- [ ] Video gallery (YouTube links)
- [ ] Sitemap generation for SEO
- [ ] Profile picture plugin integration
- [ ] Business directory with search/filters

## Key Files Reference
- `/app/frontend/app/business/edit.tsx` - Business profile edit form
- `/app/frontend/app/business/[slug].tsx` - Public profile page
- `/app/backend/business_profile_system.py` - Complete backend logic
- `/app/backend/server.py` - Route registration (around line 5379)
- `/app/frontend/app/(tabs)/profile.tsx` - Profile menu with Business Profile link
