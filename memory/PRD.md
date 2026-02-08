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
- **Seller Boost & Promotion System** (NEW)

## Architecture

### Tech Stack
- **Backend**: FastAPI, Python 3.11, Motor (MongoDB async driver), port 8001/8002
- **Frontend (Mobile)**: React Native/Expo, port 3000
- **Frontend (Admin)**: Next.js 16 with Turbopack, TypeScript, Material-UI, port 3001
- **Database**: MongoDB (database: classifieds_db)
- **Payments**: Stripe (integrated), PayPal (planned), Mobile Money (planned)
- **Real-time**: WebSockets

### Important Configuration
- Admin Frontend uses `basePath: "/api/admin-ui"` - all pages accessed via `/api/admin-ui/dashboard/*`
- Admin Backend API prefix: `/api/admin`
- Mobile App Backend API prefix: `/api`

### Credentials
- Admin: admin@example.com / admin123
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
- [x] **Seller Boost & Promotion System - Admin Side** (Feb 8)
  - Credit packages management (CRUD)
  - Boost pricing configuration (5 types)
  - Analytics dashboard
  - Seller credits management with adjustment
- [x] **Seller Boost System - Mobile App Integration** (Feb 8)
  - Credits page with package display and purchase flow
  - Boost listing page with type selection and duration
  - ListingCard with boost badges (Featured, Urgent, Spotlight, etc.)
  - Profile page with "Credits & Boosts" navigation link
  - My Listings page with Boost button on active listings
  - Backend boost routes integrated at `/api/boost/*`
- [x] **Background Job for Auto-expiring Boosts** (Feb 8)
  - Runs every 60 seconds to expire boosts
  - Updates listing `is_boosted` flag and removes expired boost types
- [x] **PayPal Integration** (Feb 8)
  - Backend PayPal SDK integrated (paypal-server-sdk v2.2.0)
  - `/api/boost/payment-providers` endpoint to list available providers
  - Purchase endpoint supports both `stripe` and `paypal` providers
  - Shows PayPal as "Coming Soon" until env vars configured
- [x] **Boosted Listings Ranking Algorithm** (Feb 8)
  - Listings sorted by is_boosted (desc) > boost_priority (desc) > regular sort
  - Uses MongoDB aggregation pipeline for efficient sorting
  - Boosted listings always appear first in search results

### Boost System Details

**Credit Packages (Default):**
| Package | Price | Credits | Bonus |
|---------|-------|---------|-------|
| Starter | $5 | 50 | 0 |
| Popular | $10 | 100 | +20 |
| Pro | $25 | 250 | +100 |

**Boost Types:**
| Type | Per Hour | Per Day | Priority |
|------|----------|---------|----------|
| Homepage Spotlight | 3 cr | 25 cr | 6 |
| Featured Placement | 1 cr | 10 cr | 5 |
| Location Boost | 2 cr | 15 cr | 4 |
| Category Boost | 2 cr | 12 cr | 4 |
| Urgent Badge | 1 cr | 5 cr | 3 |

**Backend Collections:**
- `credit_packages` - Credit package definitions
- `boost_pricing` - Boost type configurations
- `seller_credits` - Seller credit balances
- `credit_transactions` - Transaction history
- `payment_transactions` - Payment records
- `listing_boosts` - Active/expired boosts

### Pending Tasks (P1-P2)
- [ ] Configure PayPal credentials to enable PayPal payments (backend ready, needs PAYPAL_CLIENT_ID and PAYPAL_SECRET)
- [ ] Mobile Money integration for credit purchase

### Future/Backlog
- CSV Import for Users
- Notification Template Analytics
- Full A/B Testing Logic and UI
- Granular Notification Targeting
- Backend Refactoring (server.py is 5600+ lines - should be split)

---

## API Endpoints - Boost System

### Public (Mobile App - /api/boost/*)
- `GET /api/boost/packages` - Get active packages
- `GET /api/boost/pricing` - Get enabled pricing
- `GET /api/boost/calculate` - Calculate boost cost

### Seller (Auth Required - /api/boost/*)
- `GET /api/boost/credits/balance` - Get my credits
- `GET /api/boost/credits/history` - Get transaction history
- `POST /api/boost/credits/purchase` - Start Stripe checkout
- `GET /api/boost/credits/payment-status/{id}` - Check payment
- `POST /api/boost/create` - Create new boost
- `GET /api/boost/my-boosts` - Get my boosts
- `GET /api/boost/listing/{listing_id}` - Get boosts for listing

### Admin (/api/admin/boost/*)
- `GET/POST/PUT/DELETE /api/admin/boost/admin/packages` - Package CRUD
- `GET/PUT /api/admin/boost/admin/pricing` - Pricing management
- `PUT /api/admin/boost/admin/pricing/{type}/toggle` - Enable/disable
- `GET /api/admin/boost/admin/analytics` - Analytics
- `GET /api/admin/boost/admin/sellers` - Seller credits list
- `POST /api/admin/boost/admin/credits/adjust` - Adjust credits
- `POST /api/admin/boost/admin/expire-boosts` - Trigger expiration

---

## Key Files - Boost System

### Backend
- `/app/backend/boost_routes.py` - Mobile app boost routes
- `/app/admin-dashboard/backend/boost_system.py` - Admin backend boost routes
- `/app/backend/server.py` - Main backend with boost router + expiration background task

### Frontend (Mobile)
- `/app/frontend/app/credits/index.tsx` - Credits purchase page
- `/app/frontend/app/boost/[listing_id].tsx` - Boost listing page
- `/app/frontend/src/components/ListingCard.tsx` - Boost badges display
- `/app/frontend/src/utils/api.ts` - API client with boostApi

### Frontend (Admin)
- `/app/admin-dashboard/frontend/src/app/dashboard/boosts/page.tsx` - Admin boost management

---

## Test Results
- Backend Tests: 52/52 passed (core features)
- Boost System Backend: 100% pass (testing agent iteration 5)
- Boost System Frontend: 100% pass (testing agent iteration 5)

---
Last Updated: February 8, 2026
