# Avida Marketplace - Product Requirements Document

## Original Problem Statement
Full-stack React Native/Expo mobile app with critical failures, including a non-functional homepage and missing API endpoints. The app has since been expanded with 300+ API endpoints, admin branding, dynamic banners, seller analytics, and background cron jobs.

## Architecture
- **Frontend**: React Native/Expo (mobile + web) at `https://branding-hub-20.preview.emergentagent.com`
- **Backend**: FastAPI on port 8001 (same server)
- **Database**: MongoDB Atlas
- **Admin Dashboard**: Next.js (separate deployment)

## Current Status (Mar 7, 2026)

### Bug Fixes Completed This Session
| Fix | File | Status |
|-----|------|--------|
| Timezone-aware datetime subtraction | `subscription_services.py` | Fixed |
| Missing `Query` import | `routes/attribute_icons.py` | Fixed |
| model.patch responsive hooks | `frontend/app/post/index.tsx` | Already applied |
| Backend startup stability | `server.py` - debug cleanup | Improved |

### Testing: iteration_200 - All tests PASS
- Backend: 12/12 tests passed (100%)
- Frontend: All tested features working (100%)

## What's Been Implemented

### Session - Mar 7, 2026 (Current)
- Fixed subscription renewal datetime error (offset-naive vs offset-aware)
- Fixed attribute_icons router Query import error
- Verified all major API endpoints working
- Backend startup logs are clean (no warnings/errors from fixed issues)

### Session - Mar 7, 2026 (Previous Fork)
- Seller Performance Analytics (13+ endpoints)
- Background Cron Jobs (spike detection, badge evaluation, weekly digest, SMS alerts)
- Notifications (Email via SendGrid, SMS via Twilio/Africa's Talking)
- User Login Fix (testuser2028@example.com)
- File Processing (model.patch)

### Session - Mar 6, 2026
- Dynamic Banner Management System (12+ endpoints)
- Admin Branding Management (6+ endpoints)
- Public Branding API

### Session - Mar 5, 2026
- Admin Branding Endpoints

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

## Key API Endpoints
- `/api/admin/branding/*`: Full CRUD for app branding
- `/api/banners/*`: Public endpoints for banner display/tracking
- `/api/admin/banners/*`: Full CRUD and analytics for banners
- `/api/analytics/seller/*`: Seller performance data
- `/api/admin/analytics/*`: Platform analytics + cron job management
- `/api/branding`: Public branding info

## 3rd Party Integrations
- MongoDB Atlas, SendGrid, Firebase Cloud Messaging
- PayPal, Flutterwave, Stripe, Africa's Talking, Twilio
- apscheduler (background cron jobs)
