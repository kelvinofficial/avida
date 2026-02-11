# Changelog

## [2026-02-09] - Orders & Messages Pages Sandbox Integration

### Updated - Orders Page (`/app/frontend/app/profile/orders.tsx`)
- Added sandbox mode detection with `sandboxUtils.isActive()`
- Fetches orders via `/api/sandbox/proxy/orders/{user_id}` when sandbox active
- Adds mock listing and buyer data for sandbox orders
- Shows orange "SANDBOX MODE - Viewing test orders" banner
- Title changes to "🧪 Sandbox Orders" in sandbox mode
- Calculates stats from sandbox orders

### Updated - Messages Page (`/app/frontend/app/(tabs)/messages.tsx`)
- Added sandbox mode detection
- Fetches conversations via `/api/sandbox/proxy/conversations/{user_id}` when sandbox active
- Transforms sandbox conversations with mock user data
- Shows orange "SANDBOX MODE - Test conversations" banner
- Title changes to "🧪 Sandbox Messages" in sandbox mode
- Skips user online status fetch in sandbox mode

### Files Updated
- `/app/frontend/app/profile/orders.tsx` - Sandbox-aware orders display
- `/app/frontend/app/(tabs)/messages.tsx` - Sandbox-aware conversations

---

## [2026-02-09] - Checkout Flow Sandbox Integration

### Updated - Checkout Page (`/app/frontend/app/checkout/[listing_id].tsx`)
- Added sandbox mode detection on page load
- Uses `sandboxAwareListingsApi.getOne()` for listing fetch in sandbox mode
- Mock price calculation in sandbox (local VAT/transport calculation)
- Sandbox order creation via `/api/sandbox/proxy/order`
- Mock payment processing via `/api/sandbox/payment/process`
- Orange "SANDBOX MODE" banner on checkout page
- Title changes to "🧪 Sandbox Checkout" when in sandbox mode
- Success alert indicates sandbox transaction completed

### Sandbox Checkout Flow
1. User navigates to checkout with sandbox listing
2. Page detects sandbox mode and shows orange banner
3. Price breakdown calculated locally (no real escrow API)
4. Order created in sandbox_orders collection
5. Escrow created in sandbox_escrow collection
6. Mock payment processed (no real gateway)
7. Success alert shows sandbox order ID

### Safety Features
- No real payment gateways triggered
- No real escrow created
- No real notifications sent
- All data isolated in sandbox_* collections

---

## [2026-02-09] - Main App Pages Updated for Sandbox Mode

### Updated - Home Page (`/app/frontend/app/(tabs)/index.tsx`)
- Now uses `sandboxAwareListingsApi` when sandbox mode is active
- Fetches listings from sandbox_listings collection
- Uses `sandboxAwareCategoriesApi` for categories
- Added `useSandbox` hook for sandbox context

### Updated - Search Page (`/app/frontend/app/(tabs)/search.tsx`)
- Search results now come from sandbox_listings when in sandbox mode
- Uses `sandboxUtils.isActive()` check before API calls

### Updated - Listing Detail (`/app/frontend/app/listing/[id].tsx`)
- Uses `sandboxAwareListingsApi.getOne()` for sandbox listings
- Enables "Buy Online" for all sandbox listings (for testing)
- Skips activity tracking in sandbox mode

### How It Works
1. Admin enters sandbox from Admin Dashboard
2. Opens main app (or clicks "Preview App")
3. SandboxContext detects active session from AsyncStorage
4. All API calls route through sandbox proxy endpoints
5. Home, Search, Listing pages show sandbox_* collection data
6. Orange "SANDBOX MODE" banner visible at all times

---

## [2026-02-09] - Sandbox Data Filtering

### Added - Sandbox Proxy Endpoints
- `GET /api/sandbox/proxy/listings` - Get sandbox listings with search/filter
- `GET /api/sandbox/proxy/listings/{id}` - Get sandbox listing detail with seller
- `GET /api/sandbox/proxy/orders/{user_id}` - Get sandbox user's orders
- `GET /api/sandbox/proxy/conversations/{user_id}` - Get sandbox conversations
- `GET /api/sandbox/proxy/notifications/{user_id}` - Get sandbox notifications
- `GET /api/sandbox/proxy/categories` - Get categories tagged for sandbox
- `POST /api/sandbox/proxy/order` - Create sandbox order with escrow
- `POST /api/sandbox/proxy/message` - Send sandbox message

### Added - Sandbox-Aware Frontend API
- `sandboxAwareListingsApi` - Auto-routes to sandbox when active
- `sandboxAwareOrdersApi` - Auto-routes to sandbox when active
- `sandboxAwareConversationsApi` - Auto-routes to sandbox when active
- `sandboxAwareNotificationsApi` - Auto-routes to sandbox when active
- `sandboxAwareCategoriesApi` - Auto-routes to sandbox when active
- `sandboxUtils` - Helper functions (isActive, getSession, tagAsSandbox)

### Files Created
- `/app/frontend/src/utils/sandboxAwareApi.ts` - Sandbox-aware API wrapper

### Files Updated
- `/app/backend/sandbox_system.py` - Added proxy service methods and endpoints

---

## [2026-02-09] - Main App Sandbox Indicator

### Added - Frontend Sandbox Banner
- `SandboxProvider` React context for sandbox state management
- `SandboxBanner` component with prominent orange banner showing:
  - SANDBOX badge with flask icon
  - Role selector (Buyer/Seller/Transport/Admin)
  - Time offset indicator
  - Exit button
  - Striped orange/black border

### Files Created
- `/app/frontend/src/utils/sandboxContext.tsx` - Sandbox state provider
- `/app/frontend/src/components/SandboxBanner.tsx` - Visual banner component

### Files Updated
- `/app/frontend/app/_layout.tsx` - Wrapped app with SandboxProvider, added SandboxBanner
- `/app/admin-dashboard/frontend/src/app/dashboard/sandbox/page.tsx` - Added Preview App button

---

## [2026-02-09] - Admin Sandbox / Preview Mode

### Added - Sandbox System
- Fully isolated sandbox environment for admin testing
- Separate MongoDB collections (sandbox_users, sandbox_orders, etc.)
- Per-admin configurable access via allowed_admin_ids
- Auto-generated seed data: 5 buyers, 5 sellers, 10 listings, 5 orders
- Session-based testing with role switching (buyer/seller/transport/admin)
- Mock payment processing (card, paypal, mobile_money) - no real gateways
- Mock notifications (in-app only, no SMS/WhatsApp)
- Simulation tools: time fast-forward, delivery/payment failures, transport delays, error injection
- Complete audit trail of all sandbox actions

### Added - Admin Dashboard Sandbox Page
- 7 tabs: Controls, Orders, Escrow, Users, Listings, Simulations, Audit Log
- Visual "SANDBOX MODE ACTIVE" banner when session is active
- Role switching controls
- Data management (generate seed, reset data)
- Mock payment dialog with success/failure options
- Simulation parameter dialogs

### Files Created
- `/app/backend/sandbox_system.py` - Complete sandbox service (~1500 lines)
- `/app/admin-dashboard/frontend/src/app/dashboard/sandbox/page.tsx` - Admin UI (~800 lines)
- `/app/backend/tests/test_sandbox_system.py` - Test suite

### Files Updated
- `/app/backend/server.py` - Registered sandbox router
- `/app/admin-dashboard/frontend/src/app/dashboard/layout.tsx` - Added sidebar menu item

### Testing
- 25/25 backend tests passed
- Test file: `/app/backend/tests/test_sandbox_system.py`

---

## [2026-02-09] - QA Dashboard Comprehensive Enhancements

### Added - Session Replay System
- Track and replay critical user flows (checkout, listing_create, escrow_release, payment, registration)
- Session event recording with timestamps
- Session summary dashboard showing success rates per flow type

### Added - Data Integrity Checks
- 8 automated integrity checks: orders/escrow consistency, user roles, listings categories, escrow/payments, orphaned notifications, duplicate records, referential integrity, stale sessions
- Daily scheduled job at 3 AM UTC
- Auto-fix capability for certain issues (stale sessions, orphaned notifications)

### Added - Advanced Monitoring Alerts
- Real-time metrics: error_rate_hourly, avg_api_latency_ms, payment_success_rate, pending_escrows, notification_queue_size, signup_rate_hourly, active_alerts
- Configurable threshold alerts (metric, condition, value, severity)
- Metrics stored every 5 minutes for historical tracking
- Threshold checks every 5 minutes with automatic alerting

### Added - Enhanced Admin Dashboard
- 4 new tabs: Flow Tests, Session Replay, Data Integrity, Monitoring
- Total 11 tabs in QA & Reliability page
- Run buttons for flow tests and integrity checks
- Add/delete threshold configuration UI
- Fail-safe status display
- Retry queue controls

### Files Changed
- `/app/backend/qa_reliability_system.py` - Added ~1200 lines for session replay, data integrity, monitoring
- `/app/backend/server.py` - Added scheduled tasks for daily integrity checks and metrics storage
- `/app/admin-dashboard/frontend/src/app/dashboard/qa-reliability/page.tsx` - Added 4 new tabs and 2 dialogs

### Testing
- 78/78 total tests passed
- Test files: `test_qa_comprehensive.py`, `test_qa_new_features.py`, `test_qa_error_logging.py`

---

## [2026-02-09] - QA System Enhancements

### Added - Critical User Flow Testing
- 6 automated flow tests: listing_creation, checkout, escrow, notifications, payment_integration, authentication
- Flow test history with filtering
- Real-time alerts on test failures

### Added - Fail-Safe Behaviors
- Service health checks before critical operations (checkout, payment, escrow, notification, listing)
- Feature flag integration for operations
- Returns allowed/blocked status with reasons and warnings

### Added - Retry & Recovery Logic
- Exponential backoff configuration (30s → 60s → 120s)
- Manual retry triggers for notification, payment_webhook, escrow_release jobs
- Admin-audited configuration updates

### Added - Real-time WebSocket Alerts
- Admin subscription to alert types (critical, warning, system_down, etc.)
- Immediate broadcast on QA failures and high error rates
- Test alert functionality for connection verification
- Polling fallback for environments without WebSocket

### Files Changed
- `/app/backend/qa_reliability_system.py` - Added ~700 lines for new features
- `/app/backend/server.py` - Added WebSocket events for QA alerts

### Testing
- 34/34 new tests passed
- Test file: `/app/backend/tests/test_qa_new_features.py`

---

## [2026-02-09] - Frontend Error Logging Integration

### Added
- Frontend error logging integration with QA backend system
- `ErrorBoundary` component wraps root layout to catch React render errors
- Global error handler (`setupGlobalErrorHandler`) for uncaught JS errors
- API interceptor logs non-401 errors to `/api/qa/errors/log`
- User-friendly error reference IDs (ERR-XXXXXXXX) for support

### Fixed
- `ErrorBoundary` opening tag was missing in `_layout.tsx`
- API error logging integration in axios interceptor

### Testing
- 20/20 backend tests passed for QA error logging
- Test file: `/app/backend/tests/test_qa_error_logging.py`

### Files Changed
- `/app/frontend/app/_layout.tsx` - Fixed ErrorBoundary wrapping
- `/app/frontend/src/utils/api.ts` - Added error logging interceptor
- `/app/frontend/src/utils/errorLogger.ts` - Error logging utility (already existed)
- `/app/frontend/src/components/ErrorBoundary.tsx` - Error boundary component (already existed)

---

## Previous Changes (from PRD.md)

### [2026-02-09] - QA, Debugging & Reliability System
- System health monitoring (6 services)
- Error logging with reference IDs
- 20 automated QA checks
- Feature flags, alerts, audit logging
- Admin dashboard UI

### [2026-02-09] - Cohort Analytics System
- Retention heatmaps, conversion funnels
- AI-powered insights (GPT-5.2)
- Automated weekly reports
- Cohort comparison feature
- 70/70 tests passed

### [2026-02-09] - AI Listing Photo Analyzer
- Hybrid AI (GPT-4o vision + Claude Sonnet text)
- Auto-analyze photos on upload
- AI price suggestions
- Admin controls and analytics

### [2026-02-09] - Multi-Channel Notification System
- SMS, WhatsApp, Email notifications
- Twilio + Africa's Talking providers
- Delivery OTP and tracking
- User notification preferences

## 2026-02-11: Server.py Refactoring - Auto/Motors Module
**Status:** COMPLETED

### Changes
- Extracted ~692 lines of auto/motors routes from `/app/backend/server.py` into `/app/backend/routes/auto_motors.py`
- `server.py` reduced from 7932 → 7253 lines (679 lines removed)
- Added `create_auto_motors_router` factory function
- Includes static data constants (AUTO_BRANDS, AUTO_MODELS)
- Helper function for generating conversation message templates

### Files Modified
- `/app/backend/routes/auto_motors.py` (NEW - ~560 lines)
- `/app/backend/routes/__init__.py` (Updated exports)
- `/app/backend/server.py` (Removed inline routes, added registration)

### Endpoints Migrated
- GET `/api/auto/brands` - Car brands list
- GET `/api/auto/brands/{id}/models` - Brand models
- GET `/api/auto/listings` - Filtered listings search
- GET `/api/auto/listings/{id}` - Single listing
- GET `/api/auto/featured` - Featured listings
- GET `/api/auto/recommended` - Recommendations
- POST `/api/auto/conversations` - Create conversation
- GET `/api/auto/conversations/{id}` - Get conversation
- POST `/api/auto/conversations/{id}/messages` - Send message
- POST/DELETE `/api/auto/favorites/{id}` - Favorites management
- GET `/api/auto/favorites` - User favorites
- GET `/api/auto/popular-searches` - Popular searches
- POST `/api/auto/track-search` - Track searches
- GET `/api/auto/filter-options` - Filter options

### Testing
- All endpoints verified via curl tests (200 OK responses)
- Brands returns 12 brands
- Listings returns 15 total
- Popular searches returns 6 entries

### Cumulative Progress
- Original: 8881 lines
- After Admin Locations: 7932 lines (-949)
- After Auto/Motors: 7253 lines (-679)
- **Total reduction: 1628 lines (~18%)**

## 2026-02-11: Server.py Refactoring - Property, Offers, Similar Listings Module
**Status:** COMPLETED

### Changes
- Extracted ~1046 lines of property routes from `/app/backend/server.py` into `/app/backend/routes/property.py`
- `server.py` reduced from 7253 → 6240 lines (1013 lines removed)
- Created three router factory functions:
  - `create_property_router` - Property CRUD, viewings, analytics, monetization
  - `create_offers_router` - Offer negotiation system
  - `create_similar_listings_router` - Weighted similarity algorithm
- Added Pydantic models for property data validation

### Files Modified
- `/app/backend/routes/property.py` (NEW - ~690 lines)
- `/app/backend/routes/__init__.py` (Updated exports)
- `/app/backend/server.py` (Removed inline routes, added router registrations)

### Endpoints Migrated
**Property:**
- GET/POST/PUT/DELETE `/api/property/listings`
- GET `/api/property/featured`
- POST `/api/property/book-viewing`
- GET `/api/property/viewings`
- GET `/api/property/cities`
- GET `/api/property/areas/{city}`
- GET `/api/property/types-count`
- POST `/api/property/boost/{id}`
- POST `/api/property/feature/{id}`
- GET `/api/property/boosted`
- GET `/api/property/boost-prices`

**Offers:**
- POST/GET `/api/offers`
- GET/DELETE `/api/offers/{id}`
- PUT `/api/offers/{id}/respond`
- PUT `/api/offers/{id}/accept-counter`

**Similar:**
- GET `/api/similar/listings/{id}`

### Testing
- All endpoints verified via curl tests (200 OK responses)
- Property listings returns 17 total
- Cities returns 8 entries
- Boost prices returns 3 options each

### Cumulative Progress
- Original: 8881 lines
- After Admin Locations: 7932 lines (-949)
- After Auto/Motors: 7253 lines (-679)
- After Property/Offers/Similar: 6240 lines (-1013)
- **Total reduction: 2641 lines (~30%)**

## 2026-02-11: Server.py Refactoring - Social & Profile Activity Module
**Status:** COMPLETED

### Changes
- Extracted ~471 lines from `/app/backend/server.py` into `/app/backend/routes/social.py`
- `server.py` reduced from 6240 → 5792 lines (448 lines removed)
- Created two router factory functions:
  - `create_social_router` - Follow, reviews, user listings
  - `create_profile_activity_router` - User's listings, purchases, sales, recently viewed

### Files Modified
- `/app/backend/routes/social.py` (NEW - ~490 lines)
- `/app/backend/routes/__init__.py` (Updated exports)
- `/app/backend/server.py` (Removed inline routes)

### Endpoints Migrated
**Social:**
- POST/DELETE `/api/users/{id}/follow` - Follow management
- GET `/api/users/{id}/followers` - Followers list
- GET `/api/users/{id}/following` - Following list
- POST/GET `/api/users/{id}/reviews` - Reviews
- DELETE `/api/reviews/{id}` - Delete review
- GET `/api/users/{id}/listings` - User listings

**Profile Activity:**
- GET `/api/profile/activity/listings` - My listings
- GET `/api/profile/activity/purchases` - My purchases
- GET `/api/profile/activity/sales` - My sold items
- GET/POST `/api/profile/activity/recently-viewed` - Recently viewed

### Testing
- All endpoints require authentication (verified)
- Profile activity endpoint tested: returns 401 when not authenticated

### Cumulative Progress (4 Extraction Sessions Today)
| Module | Lines Removed |
|--------|---------------|
| Admin Locations | -949 |
| Auto/Motors | -679 |
| Property/Offers/Similar | -1013 |
| Social/ProfileActivity | -448 |
| **Total** | **-3089 (~35%)** |

- Original: 8881 lines
- Final: 5792 lines
