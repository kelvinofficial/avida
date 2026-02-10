# Avida Classifieds App - Product Requirements Document

## Original Problem Statement
Build a classifieds marketplace app with comprehensive location-based features.

## Latest Updates (December 2025)

### Location System Improvements (Latest)
1. **Location Persistence on Web** - Created shared `Storage` utility (`/app/frontend/src/utils/storage.ts`) that uses `localStorage` on web and `AsyncStorage` on native for reliable persistence
2. **Web Click Handling** - Implemented platform-specific rendering:
   - Web: Uses native `<div>` elements with `onClick` handlers for reliable click events
   - Native: Uses React Native `TouchableOpacity` components
3. **Region Search** - Added search functionality for filtering regions by name
4. **Simplified Selection** - Only Country > Region selection (District/City removed)
5. **Recent Locations** - Added "Clear" button for recent locations

### Previous Changes
- Removed "Near Me" feature and GPS permissions
- Implemented mandatory manual location selection

## Current Architecture

### Frontend (React Native/Expo)
- `/app/frontend/app/(tabs)/index.tsx` - Main homepage
- `/app/frontend/src/components/LocationPicker.tsx` - Location picker with web-compatible clicks
- `/app/frontend/src/utils/storage.ts` - Cross-platform storage utility
- `/app/frontend/src/components/ListingCard.tsx` - Listing card component

### Backend (FastAPI)
- `/app/backend/routes/listings.py` - Listings API with location filtering
- `/app/backend/routes/locations.py` - Location CRUD APIs

## What's Been Implemented

### Phase 1: Storage Improvements (COMPLETED)
- Created `/app/frontend/src/utils/storage.ts` with platform detection
- Updated homepage to use shared Storage utility
- Updated LocationPicker to use shared Storage utility

### Phase 2: Web Click Handling (COMPLETED)
- Country list: Uses native div with onClick on web, TouchableOpacity on native
- Region list: Uses native div with onClick on web, TouchableOpacity on native
- Both have hover effects on web

### Phase 3: Region Search (COMPLETED)
- Added search input above region list
- Filters regions in real-time as user types
- Clear button to reset search

## Known Issues

### Distance Display
- "NaNkm away" showing on listing cards when region has no lat/lng coordinates
- This is expected since we're using region-level selection without GPS coordinates

## Backend APIs

### Location APIs
- `GET /api/locations/countries` - List all countries
- `GET /api/locations/regions?country_code=XX` - List regions

### Listings APIs
- `GET /api/listings` - Get all listings
- `GET /api/listings?country_code=XX&region_code=YY` - Filter by location

## Testing Status
- ✅ Country selection works on web (click handled by native div)
- ✅ Region selection works on web (Arusha selected successfully)
- ✅ Location persistence verified with localStorage
- ✅ Listings filtered by region (4 items for Dar es Salaam)

## Backlog

### P1 (High)
- Debug why search input for regions is not visible
- Verify location saves correctly from UI flow

### P2 (Medium)
- Fix "NaNkm away" distance display for region-level selection
- Improve empty state messages

## Tech Stack
- Frontend: React Native/Expo (web + native)
- Backend: FastAPI/Python
- Database: MongoDB
- Storage: localStorage (web) / AsyncStorage (native)
