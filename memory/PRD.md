# Avida Marketplace - Product Requirements Document

## Original Problem Statement
Full-stack React Native/Expo mobile app with critical failures, including a non-functional homepage and missing API endpoints. The app has since been expanded with 300+ API endpoints, admin branding, dynamic banners, seller analytics, and background cron jobs.

## Architecture
- **Frontend**: React Native/Expo (mobile + web) at `https://banner-integration.preview.emergentagent.com`
- **Backend**: FastAPI on port 8001 (same server)
- **Database**: MongoDB Atlas
- **Admin Dashboard**: Next.js (separate deployment)

## Current Status (Mar 7, 2026)

### Banner Integration Complete This Session
| Feature | File | Status |
|---------|------|--------|
| Native Ad Feed Banners | `BannerSlot.tsx` | ✅ Complete |
| Homepage Header Banner | `(tabs)/index.tsx` | ✅ Working |
| Listing Detail - Below Gallery | `listing/[id].tsx` | ✅ Mobile + Desktop |
| Listing Detail - Below Info | `listing/[id].tsx` | ✅ Mobile + Desktop |
| Listing Detail - Before Similar | `listing/[id].tsx` | ✅ Mobile + Desktop |

### Testing: iteration_201 - Banner Features
- Backend: 100% - All banner APIs working
- Frontend: 100% - All banner placements verified (header, feed, detail page)

## What's Been Implemented

### Session - Mar 7, 2026 (Current Fork)
- **Native Ad Feed Banners**: Feed banners styled like ListingCard with Ad badge, Sponsored label, and Learn More CTA
- **All Listing Detail Page Banners**: `detail_below_gallery`, `detail_below_info`, `detail_before_similar` for both mobile and desktop
- **Homepage Banner Integration**: Header banner + feed banners injected after every 3 rows

### Session - Mar 7, 2026 (Previous Fork)
- Banner System Frontend Implementation (end-to-end)
- Admin Dashboard API Compatibility Fix
- Backend targeting bug fix in banner_service.py
- Database banner image URL fixes

### Session - Mar 7, 2026 (Earlier Fork)
- Fixed subscription renewal datetime error
- Fixed attribute_icons router Query import error
- Seller Performance Analytics (13+ endpoints)
- Background Cron Jobs

### Session - Mar 6, 2026
- Dynamic Banner Management System (12+ endpoints)
- Admin Branding Management (6+ endpoints)
- Public Branding API

### Earlier Sessions
- 295+ API endpoints across admin, analytics, management, growth/SEO
- Full authentication system (email + Google OAuth)
- Categories, listings, messaging, notifications
- Payment integrations (PayPal, Flutterwave, Stripe)

## Test Credentials
- Admin: `admin@marketplace.com` / `Admin@123456`
- Test User: `testuser2028@example.com` / `Test@123456`
- Google Auth: `kmasuka48@gmail.com`

## Known Issues (Open)
| Issue | Priority | Status |
|-------|----------|--------|
| ~300 mock API endpoints need real business logic | P1 | NOT STARTED |
| Hardcoded frontend API URL in api.ts | P2 | NOT STARTED |
| Chat Options Functionality (Mute, Delete, Block) | P2 | NOT STARTED |
| Backend startup takes 60+ seconds | P3 | Known limitation |

## Key Technical Notes
- **Route Order**: Specific routes MUST be registered before catch-all proxy routes in server.py
- **Backend Startup**: Takes 60+ seconds due to 300+ routes and multiple startup events
- **MongoDB**: Uses Atlas remote database; ensure timezone-aware datetimes
- **Frontend**: React Native/Expo with web support; API URL from EXPO_PUBLIC_BACKEND_URL
- **Banner Placements**: `header_below`, `feed_after_5`, `detail_below_gallery`, `detail_below_info`, `detail_before_similar`

## Key API Endpoints
- `/api/admin/branding/*`: Full CRUD for app branding
- `/api/banners/display/{placement}`: Public banner display for mobile app
- `/api/banners/track/*`: Banner impression and click tracking
- `/api/admin/banners/*`: Full CRUD and analytics for banners
- `/api/analytics/seller/*`: Seller performance data
- `/api/admin/analytics/*`: Platform analytics + cron job management
- `/api/branding`: Public branding info

## 3rd Party Integrations
- MongoDB Atlas, SendGrid, Firebase Cloud Messaging
- PayPal, Flutterwave, Stripe, Africa's Talking, Twilio
- apscheduler (background cron jobs)
