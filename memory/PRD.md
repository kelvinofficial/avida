# Avida Classifieds App - Product Requirements Document

## Original Problem Statement
Build a classifieds marketplace app with comprehensive location-based features.

## Latest Overhaul (December 2025)
Completely overhaul the location-based features:
1. **Remove "Near Me" Feature** - Eliminate GPS permissions and automatic location detection
2. **Mandatory Location Selection** - Users must manually select location via Country > Region > District > City dropdowns
3. **Smart Listing Fetch Logic** - Fetch exact city matches first, then fallback to nearby cities
4. **UI Requirements** - Listing cards show city name and distance, filter toggles for "Include nearby cities"

## Current Architecture

### Frontend (React Native/Expo)
- `/app/frontend/app/(tabs)/index.tsx` - Main homepage
- `/app/frontend/src/components/LocationPicker.tsx` - Hierarchical location picker
- `/app/frontend/src/components/ListingCard.tsx` - Listing card with distance display
- `/app/frontend/src/context/SelectedLocationContext.tsx` - Location state management

### Backend (FastAPI)
- `/app/backend/routes/listings.py` - Listings API including `/by-location` endpoint
- `/app/backend/routes/locations.py` - Location CRUD APIs
- Location hierarchy: Countries > Regions > Districts > Cities

### Admin Dashboard
- `/app/admin-dashboard/frontend/` - Next.js admin panel
- Full Location Manager with map view, CRUD, GeoJSON import/export

## What's Been Implemented

### Phase 1: Homepage Stabilization (COMPLETED)
- Removed all "Near Me" button, GPS permissions, and related code
- Updated `handleLocationSelect` to properly set `selectedCity` state
- Fixed FlatList re-render issues with `key` and `extraData` props

### Phase 2: Location Picker (COMPLETED)
- Hierarchical selection: Country > Region > District > City
- Search functionality for cities
- Breadcrumb navigation
- Back button support

### Phase 3: UI Updates (PARTIAL)
- "Include nearby cities" toggle added to desktop header
- ListingCard already shows distance using Haversine formula
- Empty state messages for fallback results

## Known Issues

### Web-Specific Click Issue
**Status**: UNRESOLVED
**Description**: City items in the ScrollView are not clickable on web due to React Native Web touch handling limitations
**Impact**: Users on web cannot complete city selection by clicking on list items
**Workaround**: Keyboard navigation (Tab + Arrow + Enter) works for selection
**Root Cause**: TouchableOpacity/TouchableHighlight/Pressable inside ScrollView has event propagation issues on web

## Backend APIs

### Location APIs
- `GET /api/locations/countries` - List all countries
- `GET /api/locations/regions?country_code=XX` - List regions in country
- `GET /api/locations/districts?country_code=XX&region_code=YY` - List districts
- `GET /api/locations/cities?country_code=XX&region_code=YY&district_code=ZZ` - List cities with lat/lng

### Listings APIs
- `GET /api/listings` - Get all listings
- `GET /api/listings/by-location` - Get listings filtered by location with distance calculations

## Backlog

### P0 (Critical)
- Fix web city selection click issue
- Verify location persistence across page reloads

### P1 (High)
- Test smart search fallback logic thoroughly
- Add empty-state message for nearby results display

### P2 (Medium)
- Break down large homepage file into smaller components
- Verify database indexes for performance

## Database Schema

### Locations
- **countries**: `{code, name, flag}`
- **regions**: `{code, name, country_code}`
- **districts**: `{code, name, region_code, latitude, longitude}`
- **cities**: `{code, name, district_code, latitude, longitude}`

### Listings
- `{id, title, price, city, region, country, latitude, longitude, location_data}`

## Third-Party Integrations
- **OpenStreetMap** - Map tiles via Leaflet.js
- **Nominatim** - Geocoding (BLOCKED in current environment, uses database fallbacks)
- **Leaflet.js** - Interactive maps in admin dashboard

## Technical Notes
- Geocoding APIs are blocked; system uses database coordinates as fallback
- AsyncStorage may not persist reliably on web platform
- FlatList on web has touch handling differences from native
