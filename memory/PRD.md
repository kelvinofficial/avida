# Product Requirements Document - Admin Dashboard

## Original Problem Statement
Build a comprehensive admin dashboard for a marketplace application with features including:
- Notification management (templates, scheduling, A/B testing)
- Category and listing management with CSV import
- Custom attributes system
- Place/Location management
- User data editing and authentication settings
- Deeplink management
- Icon uploads for categories/attributes
- **Seller Boost & Promotion System**
- **Seller Product Performance & Analytics** (NEW)

## Architecture

### Tech Stack
- **Backend**: FastAPI, Python 3.11, Motor (MongoDB async driver), port 8001/8002
- **Frontend (Mobile)**: React Native/Expo, port 3000
- **Frontend (Admin)**: Next.js 16 with Turbopack, TypeScript, Material-UI, port 3001
- **Database**: MongoDB (database: classifieds_db)
- **Payments**: Stripe (integrated), PayPal (integrated), Mobile Money/Flutterwave (integrated)
- **AI**: GPT-5.2 via Emergent LLM key for analytics insights
- **Real-time**: WebSockets

### Important Configuration
- Admin Frontend uses `basePath: "/api/admin-ui"` - all pages accessed via `/api/admin-ui/dashboard/*`
- Admin Backend API prefix: `/api/admin`
- Mobile App Backend API prefix: `/api`

### Credentials
- Admin: admin@example.com / admin123
- Test Seller: seller@test.com / test1234
- Database: classifieds_db

---

## Implementation Status

### Completed Features ✅
- [x] Notifications page with live API
- [x] CSV Import for Categories and Listings
- [x] Pre-defined Notification Templates
- [x] Comprehensive Listing Edit (with dynamic attributes)
- [x] Full Custom Attributes Management page
- [x] Advanced attribute features (inheritance, templates, bulk)
- [x] Backend APIs for Locations, Deeplinks, Auth Settings
- [x] Settings page frontend - Locations, Deeplinks, Auth tabs
- [x] User Edit dialog in Users page
- [x] Icon Upload for Categories - Backend API + UI
- [x] Icon Upload for Attributes - Backend API + UI
- [x] **Seller Boost & Promotion System - Complete** (Feb 8)
  - Credit packages management (CRUD)
  - Boost pricing configuration (5 types)
  - PayPal and Mobile Money (Flutterwave) integrations
  - Admin dashboard for payment method management
- [x] **Seller Product Performance & Analytics - Complete** (Feb 8)
  - Backend analytics system (`/app/backend/analytics_system.py`)
  - Performance screen with key metrics (Views, Saves, Chats, Offers)
  - Time-based trends with CSS bar charts
  - Conversion rates display
  - Boost impact comparison
  - AI-powered insights via GPT-5.2
  - Location-based view breakdown
  - Comparison vs seller average
  - Performance button on My Listings page (desktop + mobile)
- [x] **Engagement Boost Notifications - Complete** (Feb 8)
  - Background job checking for engagement spikes every 30 mins
  - Both in-app and push notifications when sellers get significant engagement
  - Configurable thresholds (views 2x, saves 3x, chats 2x average)
  - Cooldown period between notifications
  - Notifications navigate to Performance screen when tapped
- [x] **Admin Dashboard Analytics UI - Complete** (Feb 8)
  - 3-tab interface: Platform Analytics, Seller Analytics Settings, Engagement Notifications
  - Platform metrics (Users, Listings, Views, Conversion Rate)
  - User Growth chart with Line/Area/Bar toggle
  - Seller Analytics global toggle and per-metric controls
  - Engagement notification threshold sliders and timing settings
  - Notification preview examples
- [x] **Seller Performance Badges - Complete** (Feb 8)
  - 5 badge types: Top Seller, Rising Star, Quick Responder, Trusted Seller, Power Lister
  - Auto-earned based on seller activity and engagement
  - Badges expire if criteria no longer met (checked daily)
  - Displayed on: seller profile, listing detail page, seller card
  - Admin can trigger manual badge evaluation
  - **Badge unlock notifications**: Push notification when seller earns new badge
    - "Congratulations! 🚀 You've earned the Rising Star badge!"
    - Tapping notification navigates to profile
- [x] **Dynamic Banner Management System - Complete** (Feb 8)
  - **Backend** (`/app/backend/banner_system.py`):
    - 15 predefined placement slots (header, footer, feed, detail, etc.)
    - 9 banner size presets (728x90 Leaderboard, 300x250 Medium Rectangle, etc.)
    - Support for Image, HTML, and Script (AdSense/AdMob) banner types
    - Targeting: devices, countries, categories
    - Scheduling: start/end dates, days of week, hours
    - Rotation rules: Random, Weighted Priority, Fixed
    - Impression & click tracking with CTR calculation
    - Seller banner marketplace with pricing & approval workflow
  - **Admin Dashboard** (`/app/admin-dashboard/frontend/src/app/dashboard/banners/page.tsx`):
    - All Banners tab with filters (placement, status) and CRUD
    - Analytics tab with totals and daily breakdown chart
    - Pending Approval tab for seller banner moderation
    - Create/Edit dialog with full targeting options
    - CSV export for analytics
  - **Frontend Components** (`/app/frontend/src/components/BannerSlot.tsx`):
    - `<BannerSlot>` - Generic banner component for any placement
    - `<FeedBanner>` - Native-styled banner for listing feeds
    - `<HeaderBanner>` - Header placement banner
    - `<StickyBottomBanner>` - Mobile sticky bottom banner
    - `injectBannersIntoFeed()` - Helper to inject banners into listing arrays
    - Lazy loading, graceful fallback, impression/click tracking
  - **Integration**:
    - Home page: Banners injected after every 5 rows of listings
    - Listing detail: Banner before "Similar Listings" section

### Analytics System Details

**Metrics Tracked:**
- Views (total & unique)
- Saves/Favorites
- Chats initiated
- Offers received
- Conversion rates (View→Chat, View→Offer)
- Boost impact (before vs. after)
- Location breakdown
- Time trends (hourly, daily)

**Backend Collections:**
- `analytics_events` - Individual tracking events
- `analytics_settings` - Global admin settings
- `seller_analytics_overrides` - Per-seller overrides

**API Endpoints - Analytics (/api/analytics/*):**
- `GET /api/analytics/access` - Check user analytics access
- `GET /api/analytics/listing/{id}?period=` - Get listing metrics
- `GET /api/analytics/listing/{id}/insights` - AI-powered insights
- `GET /api/analytics/listing/{id}/comparison` - vs. seller average
- `GET /api/analytics/seller/dashboard` - Seller dashboard metrics
- `POST /api/analytics/track` - Track an event
- `GET /api/analytics/admin/settings` - Admin get settings
- `PUT /api/analytics/admin/settings` - Admin update settings

### Pending Tasks (P1)
- [ ] Location-based analytics with map visualization (Mapbox) - Skipped by user

### Future/Backlog (P2)
- CSV Import for Users
- Notification Template Analytics
- Full A/B Testing Logic and UI
- Backend Refactoring (server.py is 5600+ lines - should be split)

---

## Key Files - Analytics System

### Backend
- `/app/backend/analytics_system.py` - Complete analytics backend (1135 lines)
- `/app/backend/server.py` - Main backend with analytics router integration

### Frontend (Mobile)
- `/app/frontend/app/performance/[listing_id].tsx` - Performance screen
- `/app/frontend/app/profile/my-listings.tsx` - My Listings with Performance button

### Tests
- `/app/backend/tests/test_performance_analytics.py` - Backend API tests

---

## Test Results
- Backend Tests: 52/52 passed (core features)
- Analytics Backend: 100% pass (14/14 tests - iteration 10)
- Analytics Frontend: 100% verified

---
Last Updated: February 8, 2026
