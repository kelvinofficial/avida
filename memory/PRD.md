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
- **Backend**: FastAPI, Python 3.11, Motor (MongoDB async driver), port 8002
- **Frontend**: Next.js 16 with Turbopack, TypeScript, Material-UI, port 3001
- **Database**: MongoDB (database: classifieds_db)
- **Payments**: Stripe (integrated), PayPal (planned), Mobile Money (planned)
- **Real-time**: WebSockets

### Important Configuration
- Frontend uses `basePath: "/api/admin-ui"` - all pages accessed via `/api/admin-ui/dashboard/*`
- Backend API prefix: `/api/admin`

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

### Pending Tasks
- [ ] Seller credit purchase flow (Stripe checkout)
- [ ] Seller boost creation UI
- [ ] Boost status display on listings
- [ ] PayPal integration
- [ ] Mobile Money integration
- [ ] Background job for auto-expiring boosts
- [ ] Boosted listings ranking algorithm

### Future/Backlog
- CSV Import for Users
- Notification Template Analytics
- Full A/B Testing Logic and UI
- Granular Notification Targeting

---

## API Endpoints - Boost System

### Public
- `GET /api/admin/boost/packages` - Get active packages
- `GET /api/admin/boost/pricing` - Get enabled pricing
- `GET /api/admin/boost/calculate` - Calculate boost cost

### Seller (Auth Required)
- `GET /api/admin/boost/credits/balance` - Get my credits
- `GET /api/admin/boost/credits/history` - Get transaction history
- `POST /api/admin/boost/credits/purchase` - Start Stripe checkout
- `GET /api/admin/boost/credits/payment-status/{id}` - Check payment
- `POST /api/admin/boost/create` - Create new boost
- `GET /api/admin/boost/my-boosts` - Get my boosts

### Admin
- `GET/POST/PUT/DELETE /api/admin/boost/admin/packages` - Package CRUD
- `GET/PUT /api/admin/boost/admin/pricing` - Pricing management
- `PUT /api/admin/boost/admin/pricing/{type}/toggle` - Enable/disable
- `GET /api/admin/boost/admin/analytics` - Analytics
- `GET /api/admin/boost/admin/sellers` - Seller credits list
- `POST /api/admin/boost/admin/credits/adjust` - Adjust credits
- `POST /api/admin/boost/admin/expire-boosts` - Trigger expiration

---

## Test Results
- Backend Tests: 52/52 passed (core features)
- Boost System: Manually verified working

---
Last Updated: February 8, 2026
