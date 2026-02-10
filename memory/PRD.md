# Avida Classifieds App - Product Requirements Document

## Original Problem Statement
Build a classifieds marketplace app with comprehensive location-based features.

## Latest Updates (December 2025)

### Location Picker Simplification (Latest)
- Simplified location selection to only Country > Region (removed District/City)
- Selecting a region now completes the selection and closes the modal
- Added "Clear" button for Recent Locations
- Recent Locations are not sticky (only shown on country step)

### Previous Overhaul
1. **Remove "Near Me" Feature** - Eliminated GPS permissions and automatic location detection
2. **Mandatory Location Selection** - Users manually select location via Country > Region dropdowns
3. **UI Requirements** - Listing cards show location info, filter toggles for "Include nearby cities"

## Current Architecture

### Frontend (React Native/Expo)
- `/app/frontend/app/(tabs)/index.tsx` - Main homepage
- `/app/frontend/src/components/LocationPicker.tsx` - Simplified location picker (Country > Region only)
- `/app/frontend/src/components/ListingCard.tsx` - Listing card with location display
- `/app/frontend/src/context/SelectedLocationContext.tsx` - Location state management

### Backend (FastAPI)
- `/app/backend/routes/listings.py` - Listings API
- `/app/backend/routes/locations.py` - Location CRUD APIs
- Location hierarchy: Countries > Regions (Districts/Cities still in DB but not used in picker)

### Admin Dashboard
- `/app/admin-dashboard/frontend/` - Next.js admin panel
- Full Location Manager with map view, CRUD, GeoJSON import/export

## What's Been Implemented

### Phase 1: Homepage Stabilization (COMPLETED)
- Removed all "Near Me" button, GPS permissions, and related code
- Fixed FlatList re-render issues

### Phase 2: Location Picker Simplification (COMPLETED)
- Changed from Country > Region > District > City to just Country > Region
- Selecting a region now completes the selection (no further steps)
- Region items no longer show chevron arrows
- Added "Clear" button for Recent Locations
- Recent Locations section only shows on country step (not sticky)

## Known Issues

### Web-Specific Click Issue (Low Priority)
- Items in FlatList on web sometimes require keyboard navigation (Tab + Arrow + Enter)
- This is a React Native Web limitation, not a blocker since keyboard navigation works

### Location Persistence
- Location selection may not persist across page reloads on web
- This is an AsyncStorage web compatibility issue

## Backend APIs

### Location APIs
- `GET /api/locations/countries` - List all countries
- `GET /api/locations/regions?country_code=XX` - List regions in country

### Listings APIs
- `GET /api/listings` - Get all listings
- `GET /api/listings?country_code=XX&region_code=YY` - Filter by location

## Backlog

### P1 (High)
- Improve location persistence on web

### P2 (Medium)
- Break down large homepage file into smaller components

## Database Schema

### Locations
- **countries**: `{code, name, flag}`
- **regions**: `{code, name, country_code}`
- **districts**: `{code, name, region_code, latitude, longitude}` (still in DB)
- **cities**: `{code, name, district_code, latitude, longitude}` (still in DB)

## Third-Party Integrations
- **OpenStreetMap** - Map tiles via Leaflet.js (admin dashboard)
- **Nominatim** - Geocoding (BLOCKED in environment, uses database fallbacks)
