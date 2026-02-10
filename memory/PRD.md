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
- [x] **Multi-Channel Notification System - Complete** (Feb 9)
  - **Backend Service** (`/app/backend/notification_service.py`):
    - Event-driven notification orchestrator for SMS, WhatsApp, Email
    - Multi-provider support: Twilio + Africa's Talking with fallback
    - 13+ default message templates for order, delivery, escrow events
    - Template variables: {{order_id}}, {{buyer_name}}, {{tracking_url}}, etc.
    - Delivery OTP generation and verification
    - Secure tracking link generation (short URLs with expiry)
    - Phone number normalization for TZ, KE, NG, ZA, UG, US, GB
    - Notification logs with retry tracking
  - **Transport Partner Model**:
    - Basic driver/partner management (name, phone, vehicle type/plate)
    - Status tracking (available, busy, offline)
    - Rating and delivery count tracking
    - Order assignment functionality
  - **Admin Dashboard** (`/app/admin-dashboard/frontend/src/app/dashboard/sms-notifications/page.tsx`):
    - Templates tab: View/edit message templates with dynamic variables
    - Notification Logs tab: Filter by event/status, resend failed
    - Transport Partners tab: Manage delivery partners, assign to orders
  - **API Endpoints** (`/api/notifications/*`):
    - `GET /api/notifications/admin/templates` - Get all templates
    - `POST/PUT /api/notifications/admin/templates` - CRUD templates
    - `GET /api/notifications/admin/logs` - Paginated logs with filters
    - `GET/POST /api/notifications/admin/transport-partners` - Manage partners
    - `GET /api/notifications/track/{code}` - Tracking link lookup
    - `POST /api/notifications/delivery/verify-otp` - OTP verification
    - `GET/PUT /api/notifications/preferences` - User preferences
  - **Providers**: Sandbox mode for Twilio and Africa's Talking
- [x] **Notification System Extensions - Complete** (Feb 9)
  - **Async Message Queue** (`/app/backend/notification_queue.py`):
    - AsyncIO-based background processor (runs every 15 seconds)
    - Priority-based message processing (1=highest, 10=lowest)
    - Exponential backoff retry logic (30s, 60s, 120s)
    - Max 3 retries before marking as failed
    - Queue statistics and failed message tracking
  - **Escrow Flow Integration** (`EscrowNotificationIntegration`):
    - Auto-triggers notifications on: order_created, payment_successful, order_shipped
    - Delivery events: out_for_delivery (with OTP), delivered, delivery_confirmed
    - Escrow events: escrow_released, dispute_opened, dispute_resolved
    - Transport partner assignment notifications
    - Respects user notification preferences for channel selection
  - **User Notification Preferences UI** (`/app/frontend/app/notification-preferences.tsx`):
    - Channel toggles: SMS, WhatsApp, Email
    - Preferred channel selection for time-sensitive notifications
    - Event type preferences: Order, Delivery, Payment, Promotions
    - Linked from profile page under "SMS & WhatsApp" menu item
  - **WhatsApp Interactive Buttons**:
    - Support for tracking links in messages
    - Button URLs appended to message body (sandbox mode)
    - Ready for Twilio Content API in production
  - **Queue API Endpoints**:
    - `GET /api/notifications/queue/stats` - Queue statistics
    - `GET /api/notifications/queue/failed` - Failed messages list
    - `POST /api/notifications/queue/{id}/retry` - Retry failed message
- [x] **AI Listing Photo Analyzer - Complete** (Feb 9)
  - **Backend AI Service** (`/app/backend/ai_listing_analyzer.py`):
    - Hybrid AI: OpenAI GPT-4o (vision) + Claude Sonnet 4.5 (text generation)
    - Image analysis: Detects category, brand, model, color, condition, features
    - Text generation: SEO-friendly titles, bullet-point descriptions, attributes
    - Image hash caching (24-hour expiry) to reduce API costs
    - User access control with daily limits (Free: 3, Verified: 10, Premium: 50)
    - Safety filters: profanity filter, policy compliance, blocked terms
    - Fallback content generation if AI fails
  - **Admin Dashboard** (`/app/admin-dashboard/frontend/src/app/dashboard/ai-analyzer/page.tsx`):
    - Settings tab: Global toggle, usage limits (sliders), access control
    - Analytics tab: Total calls, acceptance/edit/rejection rates, daily chart
    - System Prompts tab: Editable vision and text generation prompts
    - Cache management: Clear cache button with count display
  - **Frontend Integration** (`/app/frontend/app/post/index.tsx`):
    - Auto-triggers AI analysis when first image uploaded
    - "Analyzing photos..." loading state
    - AI Suggestions panel with detected info and suggested content
    - Accept All, Use Individual Fields, Regenerate, Dismiss options
    - User feedback tracking (accepted/edited/rejected)
    - Disclaimer: "AI suggestions may not be 100% accurate"
  - **API Endpoints**:
    - `POST /api/ai-analyzer/analyze` - Analyze images and get suggestions
    - `GET /api/ai-analyzer/check-access/{user_id}` - Check user limits
    - `POST /api/ai-analyzer/feedback` - Submit user action feedback
    - `GET/PUT /api/ai-analyzer/admin/settings` - Admin settings
    - `GET /api/ai-analyzer/admin/analytics` - Usage analytics
    - `POST /api/ai-analyzer/admin/clear-cache` - Clear AI cache
  - **AI-Powered Price Suggestions**:
    - Optional "Get AI Price Suggestion" button on Publish Listing page
    - Searches database for similar listings (brand, model, category)
    - AI analyzes market data + condition to suggest optimal price range
    - Returns: min_price, max_price, recommended_price, reasoning, tip
    - Quick apply buttons: "Quick Sale" (min), "Best Value" (recommended), "Premium" (max)
    - Works even without market data (AI uses product knowledge as fallback)
    - Admin-controlled via "Enable Price Suggestions" toggle
- [x] **Full E2E Flow Testing** (Feb 9)
  - Complete listing creation flow tested: Upload → AI Analysis → Price Suggestion → Publish
  - 13/13 backend tests passed (100% success)
  - Created test file: `/app/backend/tests/test_e2e_listing_creation_flow.py`
- [x] **Production Deployment Documentation** (Feb 9)
  - Created `/app/memory/PRODUCTION_DEPLOYMENT.md` with:
    - All required API keys (Twilio, Africa's Talking, Stripe, PayPal, Flutterwave)
    - Where to obtain each key
    - Environment variable configuration
    - Pre-deployment checklist
    - Monitoring recommendations
- [x] **Backend Refactoring - Phase 1 Started** (Feb 9)
  - Created modular routes structure: `/app/backend/routes/`
  - Extracted auth routes: `/app/backend/routes/auth.py` (ready for integration)
  - Created refactoring guide: `/app/memory/REFACTORING.md`
  - Target: Reduce server.py from 6000+ to ~500 lines

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

---

## Cohort & Retention Analytics System - Complete (Feb 9, 2026)

**Status:** COMPLETE - Backend APIs and Admin Dashboard UI implemented

### Overview
Comprehensive analytics system for measuring user behavior, engagement, and long-term platform health through cohort analysis.

### Features Implemented:

**1. Cohort Grouping**
- Signup Date cohorts (monthly/weekly/daily granularity)
- User Type cohorts (seller/buyer/hybrid)
- Country cohorts
- First Action cohorts (first listing, first purchase)

**2. Retention Metrics**
- D1, D3, D7, W2, W4, M2, M3, M6 retention tracking
- Color-coded heatmap visualization (green 70%+, red <15%)
- Cohort drill-down to view individual users

**3. Engagement Metrics**
- DAU (Daily Active Users)
- WAU (Weekly Active Users)
- MAU (Monthly Active Users)
- DAU/MAU stickiness ratio

**4. Conversion Funnel**
- Signup → View Listing → Start Chat → Complete Purchase
- Drop-off rates between stages
- Visual bar chart representation

**5. Revenue & LTV**
- Revenue per cohort
- Average LTV calculation
- Cohort-level ARPU

**6. AI-Powered Insights (GPT-5.2)**
- Retention drop-off detection
- High-value cohort identification
- User nudge suggestions
- Automated recommendations

**7. Alerts System**
- Retention drop alerts
- High churn alerts
- Engagement spike alerts
- Configurable thresholds

**8. Event Tracking**
- Login events
- Listing created/viewed
- Chat started
- Checkout completed
- Escrow released/Boost used

### API Endpoints:
- `GET /api/cohort-analytics/engagement` - DAU/WAU/MAU metrics
- `GET /api/cohort-analytics/retention/heatmap` - Retention heatmap with filters
- `GET /api/cohort-analytics/funnel` - Conversion funnel stages
- `GET /api/cohort-analytics/revenue` - Revenue/LTV by cohort
- `GET /api/cohort-analytics/insights` - Stored AI insights
- `POST /api/cohort-analytics/insights/generate` - Generate new AI insights
- `GET /api/cohort-analytics/definitions` - Cohort definitions
- `GET/POST /api/cohort-analytics/alerts` - Alert management
- `POST /api/cohort-analytics/events/track` - Track user events
- `GET /api/cohort-analytics/cohort/{key}/users` - Cohort drill-down
- `GET /api/cohort-analytics/dashboard` - Complete dashboard summary

### Files:
- `/app/backend/cohort_analytics.py` - Backend service (~1200 lines)
- `/app/admin-dashboard/frontend/src/app/dashboard/cohort-analytics/page.tsx` - Admin UI

### Admin Dashboard UI Features:
- 4 metric cards: Total Users, MAU, DAU/MAU Ratio, Transactions
- 5 tabs: Retention Heatmap, Conversion Funnel, Revenue & LTV, AI Insights, Alerts
- Filters: Dimension (signup_date/user_type/country), Granularity, Time Range
- Interactive heatmap with color coding
- Cohort drill-down dialog
- AI insights generation button
- Alert creation dialog

### Testing: 29/29 backend tests passed

### Enhanced Features Added (Feb 9, 2026):

**1. Automated Weekly Health Reports**
- Generates comprehensive cohort health reports
- Includes metrics summary, retention highlights, funnel analysis
- AI-powered recommendations
- Email delivery via SendGrid
- Report scheduling configuration (daily/weekly/monthly)
- Report history tracking

**2. Event Tracking Integration**
- Signup events tracked in `/routes/auth.py`
- Login events tracked in `/routes/auth.py`
- Listing created events tracked in `/routes/listings.py`
- Purchase events (checkout_completed, escrow_released) tracked in `/escrow_system.py`

**3. User Type Drill-down**
- Seller cohort (users with listings only)
- Buyer cohort (users with purchases only)
- Hybrid cohort (users with both)
- Pagination support

**4. Alert Automation & Push Notifications**
- Check alerts endpoint creates notifications
- Notifications stored in `cohort_notifications` collection
- Push notification queue for admin users
- Read/unread notification management

### New API Endpoints:
- `GET /api/cohort-analytics/reports/weekly` - Generate weekly report
- `POST /api/cohort-analytics/reports/weekly/send` - Email report
- `GET /api/cohort-analytics/reports/schedule` - Get schedule config
- `POST /api/cohort-analytics/reports/schedule` - Configure schedule
- `GET /api/cohort-analytics/reports/history` - Previous reports
- `POST /api/cohort-analytics/alerts/check-and-notify` - Check & notify
- `GET /api/cohort-analytics/notifications` - Get notifications
- `POST /api/cohort-analytics/notifications/{id}/read` - Mark read

### Testing: 53/53 backend tests passed (29 original + 24 new)

### Cohort Comparison Feature Added (Feb 9, 2026):

**Overview:**
Compare retention and engagement metrics between different user segments side-by-side.

**Segments Available:**
- User Type: seller, buyer, hybrid
- Platform: mobile, web
- Country: dynamic from user data
- Acquisition Source: dynamic from user data

**Metrics Compared:**
- D7 Retention %
- D30 Retention %
- Lifetime Value (LTV)
- Engagement Score (avg events/user)
- Conversion Rate %
- Time to First Action

**Features:**
- Side-by-side comparison table with color-coded retention
- Winners calculation for each metric
- Visual bar chart comparison
- Configurable time period (30/60/90/180 days)

**New API Endpoints:**
- `GET /api/cohort-analytics/segments/available` - Available segments & metrics
- `POST /api/cohort-analytics/compare` - Compare cohort segments

### Scheduled Background Tasks Added (Feb 9, 2026):

**Alert Checking Task:**
- Runs every 15 minutes automatically
- Initial 60-second delay on startup
- Creates notifications for breached thresholds
- Logs all runs to `scheduled_task_logs` collection

**Manual Triggers:**
- `POST /api/cohort-analytics/scheduled/alert-check` - Manual alert check
- `POST /api/cohort-analytics/scheduled/weekly-report` - Manual report generation
- `GET /api/cohort-analytics/scheduled/logs` - View task history

### Testing: 70/70 backend tests passed (53 previous + 17 new)

---

## QA, Debugging & Reliability System - Complete (Feb 9, 2026)

### Overview
Comprehensive system for monitoring system health, debugging issues, and ensuring reliability across app, web, admin dashboard, and APIs.

### Features Implemented:

**1. System Health Monitoring**
- Real-time health status for 6 services: database, API, payments, escrow, notifications, external_apis
- Service latency tracking
- Automatic status classification: healthy, degraded, down

**2. Reliability KPIs**
- Uptime tracking (target: 99.9%)
- API latency monitoring (target: <2000ms)
- Checkout success rate (target: >95%)
- Background periodic health checks every 5 minutes

**3. Error Logging**
- Centralized error logging with severity levels (info, warning, critical)
- User-facing reference IDs for support (ERR-XXXXXXXX)
- Filters: date, severity, category, feature, user, country
- Sensitive data masking

**4. Automated QA Checks**
- API endpoint checks
- Critical flow checks (listing_creation, checkout, escrow, notifications)
- Permission checks
- Feature toggle checks
- Data integrity checks
- Run on demand or triggered by feature flag changes

**5. Session Tracing (Lightweight In-house)**
- Trace critical flows: checkout, publish_listing, escrow
- Step-by-step recording with timestamps and duration
- Error capture for failed flows
- Session replay in admin dashboard

**6. Alerts & Notifications**
- Alert types: system_down, high_error_rate, slow_response, payment_failure, escrow_stuck
- Severity levels: info, warning, critical
- Acknowledge and resolve workflow
- Dashboard notifications

**7. Feature Flags**
- 10 toggleable features: payments, escrow, notifications, transport, ai_services, ads, chat, offers, boost, sandbox_mode
- Instant on/off without redeploy
- QA checks run on flag changes
- Audit logging

**8. Fail-safe Mechanisms**
- Idempotency key tracking (prevents double operations)
- Dead letter queue for failed jobs
- Exponential backoff retries

**9. Audit Logging**
- Immutable audit trail
- Tracks: admin actions, system overrides, feature flag changes

### API Endpoints:

**Health & Status:**
- `GET /api/qa/health` - Overall system health
- `GET /api/qa/health/services` - Individual service health

**Error Logs:**
- `GET /api/qa/errors` - Get error logs with filters
- `GET /api/qa/errors/reference/{id}` - Get error by reference ID
- `POST /api/qa/errors/log` - Log an error
- `POST /api/qa/errors/{id}/resolve` - Resolve error

**Session Traces:**
- `GET /api/qa/traces` - Get session traces
- `GET /api/qa/traces/{id}` - Get trace for replay
- `POST /api/qa/traces/start` - Start new trace
- `POST /api/qa/traces/{id}/step` - Add trace step
- `POST /api/qa/traces/{id}/complete` - Complete trace

**Alerts:**
- `GET /api/qa/alerts` - Get alerts
- `POST /api/qa/alerts/{id}/acknowledge` - Acknowledge alert
- `POST /api/qa/alerts/{id}/resolve` - Resolve alert

**QA Checks:**
- `POST /api/qa/checks/run` - Run all QA checks
- `GET /api/qa/checks/history` - Get check history

**Metrics:**
- `GET /api/qa/metrics` - Get reliability metrics
- `GET /api/qa/metrics/history` - Get metrics history
- `GET /api/qa/metrics/kpis` - Get KPIs vs targets

**Feature Flags:**
- `GET /api/qa/features` - Get all flags
- `PUT /api/qa/features/{key}` - Update flag
- `GET /api/qa/features/{key}/status` - Check feature status

**Dead Letter Queue:**
- `GET /api/qa/dlq` - Get failed jobs
- `POST /api/qa/dlq/{id}/retry` - Retry failed job

**Audit:**
- `GET /api/qa/audit` - Get audit logs

### Files:
- `/app/backend/qa_reliability_system.py` - Backend service (~1200 lines)
- `/app/admin-dashboard/frontend/src/app/dashboard/qa-reliability/page.tsx` - Admin UI

### Admin Dashboard UI Features:
- System status banner with overall health
- KPI cards: Uptime, Latency, Checkout Success (vs targets)
- 7 tabs: System Health, Error Logs, Alerts, QA Checks, Session Traces, Feature Flags, Audit Log
- Run QA Checks button
- Feature flag toggles
- Error detail dialog
- Trace replay dialog

### Background Tasks:
- Periodic health checker (every 5 minutes)
- Scheduled alert checker (every 15 minutes - from cohort analytics)

### Frontend Error Logging Integration - Complete (Feb 9, 2026)

**Overview:**
Centralized frontend error capture and logging to the QA backend system.

**Components:**
- `/app/frontend/src/utils/errorLogger.ts` - Error logging utility
  - `logError()` - Generic error logging
  - `logApiError()` - API error logging with status code
  - `logUIError()` - UI/component error logging
  - `logPaymentError()` - Payment-related errors
  - `logAuthError()` - Authentication errors
  - `setupGlobalErrorHandler()` - Catches unhandled errors
  - `createUserFriendlyError()` - Creates messages with reference ID
  - Session ID tracking for user journey correlation

- `/app/frontend/src/components/ErrorBoundary.tsx` - React error boundary
  - Catches component render errors
  - Displays user-friendly fallback UI
  - Shows error reference ID for support
  - "Try Again" button to recover

- `/app/frontend/src/utils/api.ts` - Axios interceptor integration
  - Logs all non-401 API errors to QA system
  - Extracts endpoint, status code, error message
  - Associates errors with user ID when authenticated

- `/app/frontend/app/_layout.tsx` - Global integration
  - ErrorBoundary wraps root layout
  - Global error handler initialized on app start

**Testing:** 20/20 backend tests passed
- Test file: `/app/backend/tests/test_qa_error_logging.py`

---

### Critical User Flow Testing - Complete (Feb 9, 2026)

**Overview:**
Comprehensive automated testing system that runs 6 critical user flow tests to verify system health.

**Flow Tests:**
1. `listing_creation` - Tests category availability, listing creation/verification, cleanup
2. `checkout` - Tests escrow/transaction collections, VAT config, transport pricing
3. `escrow` - Checks for stuck escrows, validates state transitions, monitors disputes
4. `notifications` - Tests collection access, template availability, queue health
5. `payment_integration` - Checks transaction success rate, failed payment monitoring
6. `authentication` - Tests user collection, sessions, expired session cleanup

**API Endpoints:**
- `POST /api/qa/flow-tests/run` - Run all 6 flow tests
- `GET /api/qa/flow-tests/history` - Get test history with filtering

**Testing:** 7/7 tests passed

---

### Fail-Safe Behaviors - Complete (Feb 9, 2026)

**Overview:**
System that checks service health before allowing critical operations to proceed.

**Operations Protected:**
- `checkout` - Requires database, payment, and escrow services
- `payment` - Requires database and payment service, respects `payments_enabled` feature flag
- `escrow_release` - Requires database and escrow service, respects `escrow_enabled` flag
- `notification` - Requires notification service, respects `notifications_enabled` flag
- `listing_create` - Requires database service

**API Endpoints:**
- `GET /api/qa/failsafe/status` - Get status of all operations
- `POST /api/qa/failsafe/check/{operation}` - Check if specific operation is allowed

**Response Structure:**
```json
{
  "operation": "checkout",
  "allowed": true/false,
  "reasons": ["Database is down", ...],
  "warnings": ["Payment service is degraded"],
  "checked_at": "ISO timestamp"
}
```

**Testing:** 8/8 tests passed

---

### Retry & Recovery Logic - Complete (Feb 9, 2026)

**Overview:**
Exponential backoff retry system for failed jobs with configurable parameters.

**Supported Job Types:**
- `notification` - Retries failed notification queue items
- `payment_webhook` - Retries failed payment webhooks from dead letter queue
- `escrow_release` - Resets stuck escrow releases to funded status

**Configuration:**
- `max_retries`: Default 3, configurable 1-10
- `base_delay_seconds`: Default 30s, configurable 5-300s
- `max_delay_seconds`: Default 3600s, configurable 60-7200s
- Exponential backoff: 30s → 60s → 120s → ...

**API Endpoints:**
- `GET /api/qa/retry/config` - Get current configuration
- `PUT /api/qa/retry/config` - Update configuration (requires admin_id for audit)
- `POST /api/qa/retry/trigger/{job_type}` - Manually trigger retry for job type

**Testing:** 8/8 tests passed

---

### Real-time WebSocket Alerts - Complete (Feb 9, 2026)

**Overview:**
WebSocket-based real-time notification system for admin alerts.

**Features:**
- Admins can subscribe to specific alert types (critical, warning, system_down, etc.)
- Alerts broadcast immediately when critical events occur (QA test failures, high error rates)
- Polling fallback for environments without WebSocket support
- Test alert functionality to verify connection

**WebSocket Events (Socket.IO):**
- `admin_subscribe_alerts` - Subscribe to alerts, joins `qa_alerts` room
- `admin_unsubscribe_alerts` - Unsubscribe from alerts
- `qa_alert` - Receives real-time alert data
- `get_pending_qa_alerts` - Polling fallback for pending alerts

**API Endpoints:**
- `POST /api/qa/realtime/subscribe` - Subscribe admin to alerts
- `POST /api/qa/realtime/unsubscribe` - Unsubscribe from alerts
- `GET /api/qa/realtime/subscriptions` - List all subscriptions
- `POST /api/qa/realtime/test-alert` - Send test alert

**Alert Types:**
- `critical` - Critical system errors
- `warning` - Warning-level issues
- `flow_test_failure` - QA flow test failures
- `system_down` - Service outage alerts
- `high_error_rate` - Error rate threshold breached
- `test` - Test alerts for connection verification

**Testing:** 8/8 tests passed

---

### QA System Total Testing
- Error Logging: 20/20 tests
- Flow Testing: 7/7 tests
- Fail-Safe: 8/8 tests
- Retry: 8/8 tests
- Real-time Alerts: 8/8 tests
- **Total: 51/51 tests passed**

Test files:
- `/app/backend/tests/test_qa_error_logging.py`
- `/app/backend/tests/test_qa_new_features.py`

---

### Session Replay - Complete (Feb 9, 2026)

**Overview:**
Session replay system to track and replay critical user flows for debugging.

**Supported Flow Types:**
- `checkout` - Track checkout flow events
- `listing_create` - Track listing creation events
- `escrow_release` - Track escrow release flow
- `payment` - Track payment processing
- `registration` - Track user registration

**API Endpoints:**
- `POST /api/qa/sessions/start` - Start recording a session
- `POST /api/qa/sessions/{session_id}/event` - Record an event
- `POST /api/qa/sessions/{session_id}/end` - End recording
- `GET /api/qa/sessions` - List session replays
- `GET /api/qa/sessions/{session_id}` - Get specific session with all events
- `GET /api/qa/sessions/summary` - Get summary of all flow types

**Testing:** 4/4 tests passed

---

### Data Integrity Checks - Complete (Feb 9, 2026)

**Overview:**
Automated data integrity validation system with 8 comprehensive checks.

**Checks Performed:**
1. `orders_escrow_consistency` - Verify orders have matching escrow records
2. `user_roles_integrity` - Verify users have valid roles
3. `listings_category_integrity` - Verify listings have valid categories
4. `escrow_payment_consistency` - Verify escrows have matching payment transactions
5. `orphaned_notifications` - Find notifications for non-existent users
6. `duplicate_records` - Detect duplicate emails, orders
7. `referential_integrity` - Verify foreign key references
8. `stale_sessions` - Identify expired sessions needing cleanup

**Scheduled Task:** Daily at 3 AM UTC

**API Endpoints:**
- `POST /api/qa/integrity/run` - Run integrity checks manually
- `GET /api/qa/integrity/history` - Get check history
- `POST /api/qa/integrity/fix/{check_type}` - Auto-fix certain issues

**Testing:** 4/4 tests passed

---

### Advanced Monitoring Alerts - Complete (Feb 9, 2026)

**Overview:**
Real-time metrics tracking with configurable threshold alerts.

**Metrics Tracked:**
- `error_rate_hourly` - Errors per hour
- `avg_api_latency_ms` - Average API response time
- `payment_success_rate` - Payment success percentage
- `pending_escrows` - Number of pending escrows
- `notification_queue_size` - Size of notification queue
- `signup_rate_hourly` - New signups per hour
- `active_alerts` - Number of unresolved alerts

**Threshold Configuration:**
- Metric name selection
- Condition: `above` or `below`
- Threshold value
- Alert severity: `warning` or `critical`

**Scheduled Tasks:**
- Store metrics every 5 minutes
- Check thresholds every 5 minutes

**API Endpoints:**
- `GET /api/qa/monitoring/metrics` - Get current metrics
- `GET /api/qa/monitoring/metrics/history/{metric_name}` - Get history
- `POST /api/qa/monitoring/thresholds` - Configure threshold
- `GET /api/qa/monitoring/thresholds` - List thresholds
- `DELETE /api/qa/monitoring/thresholds/{metric_name}` - Delete threshold
- `POST /api/qa/monitoring/thresholds/check` - Check all thresholds

**Testing:** 5/5 tests passed

---

### Admin Dashboard QA Page - Complete (Feb 9, 2026)

**Overview:**
Enhanced admin dashboard with 11 tabs for comprehensive QA management.

**Tabs:**
1. System Health - Service status overview
2. Error Logs - Frontend/backend error tracking
3. Alerts - Active and resolved alerts
4. QA Checks - 20 automated checks
5. Flow Tests (NEW) - 6 critical flow tests
6. Session Replay (NEW) - Session recording summary
7. Data Integrity (NEW) - 8 integrity checks
8. Monitoring (NEW) - Real-time metrics, thresholds, fail-safe status, retry queue
9. Session Traces - Detailed session tracking
10. Feature Flags - Toggle system features
11. Audit Log - Admin action history

**Testing:** All tabs verified working (100% frontend, 100% backend)

---

### QA System Total Testing Summary
- Error Logging: 20/20 tests
- Flow Testing: 7/7 tests
- Fail-Safe: 8/8 tests
- Retry: 8/8 tests
- Real-time Alerts: 8/8 tests
- Session Replay: 4/4 tests
- Data Integrity: 4/4 tests
- Advanced Monitoring: 5/5 tests
- Admin Dashboard: 14/14 tests
- **Grand Total: 78/78 tests passed**

Test files:
- `/app/backend/tests/test_qa_error_logging.py`
- `/app/backend/tests/test_qa_new_features.py`
- `/app/backend/tests/test_qa_comprehensive.py`

---

### Admin Sandbox / Preview Mode - Complete (Feb 9, 2026)

**Overview:**
A fully isolated environment for admins to safely test all platform features without affecting live users or real money.

**Key Features:**
1. **Isolated Data** - Separate sandbox_* collections (users, orders, escrow, messages, etc.)
2. **Per-Admin Access** - Configurable allowed_admin_ids
3. **Auto Seed Data** - Generates 5 buyers, 5 sellers, 10 listings, 5 orders on first session
4. **Role-Based Testing** - Enter sandbox as Buyer, Seller, Transport Partner, or Admin
5. **Mock Services** - Payment processing, notifications (no real gateways/SMS)
6. **Simulation Tools** - Time fast-forward, delivery/payment failures, transport delays, error injection
7. **Visual Indicators** - Clear "SANDBOX MODE" banner on all pages
8. **Audit Trail** - Complete logging of sandbox actions

**Sandbox Collections:**
- `sandbox_users` - Test users with roles
- `sandbox_sellers` - Seller profiles
- `sandbox_listings` - Test listings with [SANDBOX] prefix
- `sandbox_orders` - Orders at various stages
- `sandbox_escrow` - Escrow records
- `sandbox_transport` - Transport records with OTP
- `sandbox_payments` - Mock payment transactions
- `sandbox_notifications` - In-app only notifications
- `sandbox_disputes` - Test disputes
- `sandbox_audit` - Action audit trail

**Session Management:**
- `POST /api/sandbox/session/start` - Start session with role
- `POST /api/sandbox/session/{id}/switch-role` - Switch roles
- `POST /api/sandbox/session/{id}/end` - End session
- `GET /api/sandbox/session/active/{admin_id}` - Get active session

**Simulation Tools:**
- `POST /api/sandbox/simulate/fast-forward` - Fast-forward time (escrow expiry testing)
- `POST /api/sandbox/simulate/delivery-failure` - Simulate failed delivery
- `POST /api/sandbox/simulate/payment-failure` - Simulate payment failure
- `POST /api/sandbox/simulate/transport-delay` - Simulate transport delays
- `POST /api/sandbox/simulate/inject-error` - Inject test errors for QA

**Admin Dashboard Page:**
- 7 tabs: Controls, Orders, Escrow, Users, Listings, Simulations, Audit Log
- Session controls with role switching
- Data management (generate seed data, reset)
- Mock payment processing UI
- Simulation tools with parameter dialogs

**Testing:** 25/25 tests passed

Test file: `/app/backend/tests/test_sandbox_system.py`

### Main App Sandbox Indicator - Complete (Feb 9, 2026)

**Overview:**
Visual sandbox mode indicator in the main customer-facing app when an admin is testing.

**Components:**
- `SandboxProvider` - React context providing sandbox state to entire app
- `SandboxBanner` - Prominent orange banner at top of all pages showing:
  - "SANDBOX" badge with flask icon
  - Current role selector (Buyer/Seller/Transport/Admin)
  - Time offset indicator (if fast-forwarded)
  - "Exit" button to end sandbox session
  - Striped orange/black border for visual distinction

**Features:**
- Persists sandbox session in AsyncStorage
- Role switching modal with all 4 user types
- Automatically checks for active session on app load
- Non-intrusive when not in sandbox mode

**Files Created:**
- `/app/frontend/src/utils/sandboxContext.tsx` - Sandbox state management
- `/app/frontend/src/components/SandboxBanner.tsx` - Visual indicator component

**Files Updated:**
- `/app/frontend/app/_layout.tsx` - Added SandboxProvider and SandboxBanner

### Sandbox Data Filtering - Complete (Feb 9, 2026)

**Overview:**
When sandbox mode is active, API calls automatically return sandbox data instead of production data, enabling true end-to-end testing.

**Backend Proxy Endpoints:**
- `GET /api/sandbox/proxy/listings` - Get sandbox listings
- `GET /api/sandbox/proxy/listings/{id}` - Get single sandbox listing with seller info
- `GET /api/sandbox/proxy/orders/{user_id}` - Get sandbox user's orders
- `GET /api/sandbox/proxy/conversations/{user_id}` - Get sandbox conversations
- `GET /api/sandbox/proxy/notifications/{user_id}` - Get sandbox notifications
- `GET /api/sandbox/proxy/categories` - Get categories (tagged for sandbox)
- `POST /api/sandbox/proxy/order` - Create sandbox order
- `POST /api/sandbox/proxy/message` - Send sandbox message

**Frontend Sandbox-Aware API:**
- `sandboxAwareListingsApi` - Routes to sandbox proxy when active
- `sandboxAwareOrdersApi` - Routes to sandbox proxy when active
- `sandboxAwareConversationsApi` - Routes to sandbox proxy when active
- `sandboxAwareNotificationsApi` - Routes to sandbox proxy when active
- `sandboxAwareCategoriesApi` - Routes to sandbox proxy when active
- `sandboxUtils` - Helper functions to check sandbox status

**How It Works:**
1. SandboxContext stores session in AsyncStorage
2. sandboxAwareApi checks AsyncStorage for active session
3. If active, routes API calls to `/api/sandbox/proxy/*` endpoints
4. Proxy endpoints return data from sandbox_* collections
5. All responses tagged with `sandbox_mode: true`

**Files Created:**
- `/app/frontend/src/utils/sandboxAwareApi.ts` - Sandbox-aware API wrapper

**Files Updated:**
- `/app/backend/sandbox_system.py` - Added proxy service methods and endpoints
- `/app/frontend/app/(tabs)/index.tsx` - Uses sandbox-aware API for home page listings
- `/app/frontend/app/(tabs)/search.tsx` - Uses sandbox-aware API for search results
- `/app/frontend/app/listing/[id].tsx` - Uses sandbox-aware API for listing detail

### Pages Updated for Sandbox Mode
When sandbox mode is active, the following pages now show sandbox data:
- **Home Page** (`/app/frontend/app/(tabs)/index.tsx`) - Shows sandbox_listings
- **Search Page** (`/app/frontend/app/(tabs)/search.tsx`) - Searches sandbox_listings
- **Listing Detail** (`/app/frontend/app/listing/[id].tsx`) - Shows sandbox listing with seller info
- **Checkout Flow** (`/app/frontend/app/checkout/[listing_id].tsx`) - Full sandbox checkout with:
  - Sandbox order creation via `/api/sandbox/proxy/order`
  - Mock payment processing via `/api/sandbox/payment/process`
  - Local price calculation (no real escrow API calls)
  - Orange "SANDBOX MODE" banner on checkout page
  - Success alert with sandbox indicator
- **Orders Page** (`/app/frontend/app/profile/orders.tsx`) - Shows sandbox orders with:
  - Fetches orders via `/api/sandbox/proxy/orders/{user_id}`
  - Mock listing and buyer data for sandbox orders
  - Orange "SANDBOX MODE - Viewing test orders" banner
  - Title shows "🧪 Sandbox Orders"
- **Messages Page** (`/app/frontend/app/(tabs)/messages.tsx`) - Shows sandbox conversations with:
  - Fetches conversations via `/api/sandbox/proxy/conversations/{user_id}`
  - Mock user data for sandbox conversations
  - Orange "SANDBOX MODE - Test conversations" banner
  - Title shows "🧪 Sandbox Messages"

---

### Pending Tasks (P1)
- [ ] Location-based analytics with map visualization (Mapbox) - Skipped by user

### Completed (Feb 10, 2026)
- [x] Admin Dashboard TypeScript errors fixed (MUI Grid v7, API client types, Pie chart labels, etc.)
- [x] **Verification System** - Manual admin approval with 4 tiers (unverified, verified_user, verified_seller, premium_verified_seller). Benefits include badge display, commission discount (up to 25%), and search priority boost.
- [x] **Commission Settings** - Category-based commission rates with verification tier discounts. Configurable via admin dashboard.
- [x] **Admin Notification Fix** - Notifications now correctly write to BOTH `user_notifications` (admin tracking) AND `notifications` (mobile app) collections.
- [x] **Boost After Publish** - Success modal updated with boost package selection (Basic $2.99/3days, Standard $4.99/7days, Premium $9.99/14days).

### In Progress Tasks (P1)
- [x] Edit Listing with Original Data - Form pre-fill implemented with category, images, title, description, price, etc.
- [x] Push Notifications Fixed - Now supports Expo Push tokens, in-app notifications write to correct collection

### Completed Additional Items (Feb 10, 2026)
- Edit listing page now loads original data and pre-fills all form fields
- Push service updated to support Expo Push (mobile app's native format)
- Admin notifications now create records in both `user_notifications` AND `notifications` collections
- User tokens retrieved from both `users.push_token` and `user_device_tokens` collection
- **Login Redirect**: Created `useLoginRedirect` hook - users redirected back to previous page after login
- **Support Ticket Notifications**: When admin replies to a ticket, user gets in-app + push notification with deep link to tickets list
- **Help page deep link**: `/help?tab=tickets` opens tickets tab directly (for notification navigation)

### Future/Backlog (P2)
- Notification Template Analytics
- Full A/B Testing Logic and UI
- Backend Refactoring (server.py is 5600+ lines - should be split)

---

## CSV Import for Users - Complete (Feb 10, 2026)

### Overview
Admin feature to bulk import users from CSV files with secure password generation and full validation.

### Features Implemented:
1. **CSV File Upload** - Direct upload through admin dashboard
2. **Auto-Generated Passwords** - 12-character secure random passwords with uppercase, lowercase, digits, special chars
3. **Full Pre-Validation** - Validates ALL rows BEFORE any user creation; aborts entire import if any error
4. **Async Background Processing** - Large imports processed in background without blocking UI
5. **Password Report Download** - CSV file with generated passwords available for 24 hours
6. **In-App Notifications** - Admin notified on completion (success or failure)

### CSV Format:
- **Required columns:** `email`, `first_name`, `last_name`
- **Optional columns:** `role` (user/seller/admin, default: user)
- **Max rows:** 1000 per import

### API Endpoints:
- `GET /api/csv-import/template` - Download CSV template
- `GET /api/csv-import/fields` - Get field information (includes email_delivery_available flag)
- `POST /api/csv-import/upload` - Upload CSV, get validation_id
- `POST /api/csv-import/validate/{validation_id}` - Validate all rows
- `POST /api/csv-import/import/{validation_id}` - Start background import (accepts send_emails: boolean)
- `GET /api/csv-import/job/{job_id}` - Check job status (includes emails_sent/emails_failed stats)
- `GET /api/csv-import/password-report/{report_id}/download` - Download passwords CSV
- `GET /api/csv-import/history` - Import job history

### Email Delivery Feature (Feb 10, 2026):
- **Optional welcome emails**: When `send_emails: true` is passed to the import endpoint, each newly created user receives a welcome email with their credentials
- **SendGrid integration**: Uses existing SendGrid configuration (SENDGRID_API_KEY, SENDER_EMAIL)
- **HTML email template**: Professional styled email with credentials and first-login password change requirement
- **Tracking**: Job status includes `emails_sent` and `emails_failed` counts
- **Note**: Email delivery requires valid SendGrid configuration with proper domain verification

### Validation Rules:
- Email: Required, valid format, unique in CSV and database
- First/Last name: Required, non-empty
- Role: Must be user/seller/admin if provided

### Files:
- `/app/backend/csv_import_system.py` - Backend service (~500 lines)
- `/app/admin-dashboard/frontend/src/components/UserCSVImportDialog.tsx` - Frontend dialog component

### Testing: 23/23 tests passed (100%)
Test file: `/app/backend/tests/test_csv_import_system.py`

---

## Key Files - Analytics System

### Backend
- `/app/backend/analytics_system.py` - Complete analytics backend (1135 lines)
- `/app/backend/server.py` - Main backend with analytics router integration

### Frontend (Mobile)
- `/app/frontend/app/performance/[listing_id].tsx` - Performance screen
- `/app/frontend/app/profile/my-listings.tsx` - My Listings with Performance button
- `/app/frontend/app/checkout/[listing_id].tsx` - Multi-step checkout flow
- `/app/frontend/app/checkout/success.tsx` - Payment success page
- `/app/frontend/app/checkout/pending.tsx` - Mobile Money pending page
- `/app/frontend/app/profile/orders.tsx` - Seller orders management
- `/app/frontend/app/listing/[id].tsx` - Updated with Buy Now button

### Tests
- `/app/backend/tests/test_performance_analytics.py` - Backend API tests
- `/app/backend/tests/test_escrow_payment_apis.py` - Escrow and Payment API tests

---

## Premium Verified Seller Online Selling System with Escrow Payments ✅ (Feb 9, 2026)

### Overview
Complete escrow-based payment system allowing verified premium sellers to accept online payments with buyer protection.

### Backend Implementation
- **`/app/backend/escrow_system.py`**: Core escrow system with:
  - Order lifecycle management (pending → paid → shipped → delivered → completed)
  - Escrow status tracking (pending → funded → releasing → released)
  - Dispute handling with admin resolution
  - Auto-release background job (7 days after shipping if no dispute)
  - VAT configuration by country (9 countries preconfigured)
  - Commission configuration (default 5%)
  - Transport pricing matrix with distance-based calculation
  
- **`/app/backend/payment_system.py`**: Unified payment service:
  - **Stripe**: Card payments via emergentintegrations library
  - **PayPal**: OAuth flow with authorization and capture
  - **Vodacom Mobile Money**: M-Pesa via Flutterwave (Tanzania)
  - Webhook handlers for all providers
  - Automatic escrow funding on successful payment

- **`/app/backend/sms_service.py`**: Africa's Talking SMS notifications:
  - Buyer: Order confirmed, Order shipped, Delivery reminder
  - Seller: New order received, Payment released
  - Phone normalization for Tanzania (+255)
  - Delivery report webhook

### Admin Dashboard
- **`/app/admin-dashboard/frontend/src/app/dashboard/escrow/page.tsx`**: Full management UI
  - Verified Sellers management (verify/revoke)
  - Orders list with pagination
  - Dispute resolution (buyer/seller/split)
  - Manual escrow release
  - Settings display (VAT, Commission, Transport pricing)

### API Endpoints
**Public:**
- `GET /api/escrow/transport-pricing` - Available delivery options
- `GET /api/escrow/vat-configs` - VAT by country
- `GET /api/escrow/commission-configs` - Commission rates
- `GET /api/escrow/seller/{seller_id}/can-sell-online` - Seller verification check
- `POST /api/escrow/calculate-order-price` - Price breakdown calculator

**Buyer:**
- `POST /api/escrow/orders/create` - Create new order
- `GET /api/escrow/buyer/orders` - List buyer's orders
- `POST /api/escrow/orders/{order_id}/confirm` - Confirm delivery
- `POST /api/escrow/orders/{order_id}/dispute` - Open dispute

**Seller:**
- `GET /api/escrow/seller/orders` - List seller's orders
- `POST /api/escrow/orders/{order_id}/ship` - Mark as shipped

**Admin:**
- `POST /api/escrow/admin/verify-seller/{seller_id}` - Verify/unverify seller
- `GET /api/escrow/admin/verified-sellers` - List verified sellers
- `GET /api/escrow/admin/orders` - All orders
- `GET /api/escrow/admin/disputes` - All disputes
- `POST /api/escrow/admin/disputes/{dispute_id}/resolve` - Resolve dispute
- `POST /api/escrow/admin/orders/{order_id}/release-escrow` - Manual release

**Payments:**
- `POST /api/payments/create` - Create Stripe/PayPal payment
- `POST /api/payments/mobile-money` - Create M-Pesa payment
- Webhook handlers for Stripe, Flutterwave

**SMS:**
- `POST /api/sms/webhook/delivery-report` - Delivery reports
- `GET /api/sms/notifications/{order_id}` - SMS logs

### Frontend Implementation
- **Buy Now Button**: Blue prominent button with escrow shield badge, only shows for verified sellers
- **Multi-step Checkout Flow**:
  1. **Order Summary**: Item details, seller info, escrow protection banner
  2. **Delivery**: Pickup (free) or Door Delivery with address form
  3. **Payment**: Card, PayPal, or Mobile Money selection
  4. **Review**: Price breakdown with VAT, confirm and pay
- **Seller Orders Page**: Stats, earnings, order list with ship/status actions
- **Success/Pending Pages**: Payment confirmation with escrow info

### Configuration
- **VAT**: US 0%, UK 20%, DE 19%, FR 20%, KE 16%, NG 7.5%, ZA 15%, UG 18%, TZ 18%
- **Commission**: 5% default (hidden from buyers)
- **Transport**: Base €5 + €0.15/km + €0.50/kg
- **Escrow Auto-Release**: 7 days after shipping
- **SMS Provider**: Africa's Talking (sandbox mode)

### Test Status
- Backend: 19/19 tests passed (100%)
- Frontend: All features verified working
- Admin Dashboard: Escrow page fully functional
- Test Seller: user_3fe547c78c76 (verified)
- Test Buyer: buyer@test.com / password123
- Admin User: admin@admin.com / admin123

### E2E Test Results (Feb 9, 2026)
- Order creation: ✅ Working
- Stripe payment session: ✅ Generated successfully
- Buyer orders list: ✅ Working  
- Confirm delivery: ✅ Working
- Frontend checkout flow: ✅ All 4 steps working
- Buy Now button: ✅ Visible for verified sellers only

---

## Test Results
- Backend Tests: 52/52 passed (core features)
- Analytics Backend: 100% pass (14/14 tests - iteration 10)
- Analytics Frontend: 100% verified
- Escrow/Payment APIs: 100% pass (19/19 tests - iteration 13)

---
Last Updated: February 9, 2026

---

## Backend Refactoring Progress (Feb 9, 2026)

### server.py Modularization - Phase 1 COMPLETE

**Objective**: Reduce the monolithic server.py (~5925 lines) by extracting core routes into modular files.

**Completed Extractions**:
1. **`routes/auth.py`** - Authentication endpoints (register, login, session, me, logout)
2. **`routes/users.py`** - User management (profile, block/unblock, status)
3. **`routes/listings.py`** - Listing CRUD (create, read, update, delete, search, similar)

**Results**:
- **Before**: ~5925 lines
- **After**: ~5112 lines  
- **Reduction**: ~813 lines (14%)
- All endpoints tested and verified working

**Architecture Pattern**:
- Factory functions: `create_xxx_router(db, dependencies...)`
- Routers included via `api_router.include_router(router)`
- Dependencies injected to maintain decoupling

**Reference**: See `/app/REFACTORING.md` for detailed documentation.

### Future Refactoring (Phase 2)
- Categories/Subcategories endpoints
- Favorites endpoints  
- Conversations/Messages endpoints
- Media upload endpoints
- Profile/Activity endpoints
- Settings endpoints


---

## Backend Refactoring Phase 2 (Feb 9, 2026)

### server.py Modularization - Phase 2 COMPLETE

**Completed Extractions**:
1. **`routes/categories.py`** - Category/subcategory endpoints, validation helpers
2. **`routes/favorites.py`** - Favorites CRUD (add, remove, list)
3. **`routes/conversations.py`** - Conversations and messaging

**Results**:
- **After Phase 2**: ~4556 lines
- **Total Reduction**: ~1369 lines (23% from original ~5925)
- All 38 tests passed (Phase 2)
- All 6 modular route modules verified working

**Route Modules Summary**:
| Module | Endpoints | Status |
|--------|-----------|--------|
| auth.py | 5 endpoints | ✅ |
| users.py | 6 endpoints | ✅ |
| listings.py | 7 endpoints | ✅ |
| categories.py | 4 endpoints | ✅ |
| favorites.py | 3 endpoints | ✅ |
| conversations.py | 5 endpoints | ✅ |

**Reference**: See `/app/REFACTORING.md` for detailed documentation.


---

## Chat Moderation System (Feb 9, 2026)

### Full Message & Chat Moderation System - COMPLETE

**Features Implemented:**

1. **AI-Powered Moderation** (GPT-4o via Emergent LLM Key)
   - Automatic detection of scam phrases, fraud attempts
   - Profanity and harassment detection
   - Contact information bypass detection
   - Suspicious patterns (copy-paste spam)

2. **Rule-Based Detection**
   - Phone numbers and emails (regex patterns)
   - Scam keywords (western union, moneygram, gift cards, etc.)
   - Off-platform payment requests
   - Configurable keyword blacklist

3. **Manual Moderation Actions**
   - Delete/hide messages
   - Freeze/unfreeze conversations
   - Mute users (temporary)
   - Ban users (permanent)
   - Warn users
   - Lock escrow transactions
   - Add moderator notes (internal)

4. **User Reporting System**
   - Report message or conversation
   - 7 report reasons (scam, abuse, fake listing, off-platform payment, harassment, spam, other)
   - Report status tracking

5. **Admin Dashboard UI** (`/dashboard/moderation`)
   - Stats overview (pending flags, reports, muted/banned users)
   - Conversations tab with filters
   - Flagged content tab
   - User reports tab
   - Settings/configuration tab
   - Polling for real-time updates (15 seconds)

6. **Automation & Rules**
   - Auto-warning threshold (3 violations)
   - Auto-mute duration (24 hours)
   - Auto-ban threshold (5 violations)
   - Block contact before order completion

7. **Audit & Logging**
   - All moderation actions logged
   - Who acted, what action, timestamp
   - Immutable audit trail

8. **User Notifications**
   - Notifies users when muted/banned
   - Warning notifications
   - Conversation frozen notifications

**Backend API Endpoints:**
- `/api/moderation/stats` - Moderation statistics
- `/api/moderation/config` - Configuration management
- `/api/moderation/conversations` - Conversation monitoring
- `/api/moderation/flags` - AI/rule flagged content
- `/api/moderation/reports` - User reports
- `/api/moderation/actions` - Perform moderation actions
- `/api/moderation/notes` - Moderator internal notes
- `/api/report/message` - User submit report
- `/api/report/reasons` - Report reason options

**Testing:** 30/30 tests passed

**Files:**
- `backend/chat_moderation.py` - Core moderation service
- `admin-dashboard/frontend/src/app/dashboard/moderation/page.tsx` - Admin UI


---

## Real-Time Moderation Integration (Feb 9, 2026)

### send_message Endpoint Moderation Pipeline - COMPLETE

**Integration Flow:**
1. **User Status Check** (sync) - Block muted/banned users (403)
2. **Conversation Check** (sync) - Block frozen conversations (403)
3. **Listing Check** (sync) - Block chat-disabled listings (403)
4. **Rule-Based Detection** (sync) - Check phone numbers, scam keywords
   - Critical risk → Block message immediately
   - High risk → Allow with warning
5. **Send Message** - Insert into database with `moderation_status: pending`
6. **AI Moderation** (async) - GPT-4o analysis in background
   - Updates message status to `clean` or `flagged`
   - Creates entries in `moderation_flags` collection
   - Triggers auto-moderation (warnings, mute, ban)

**Detection Patterns:**
- Phone numbers: `555-123-4567`, 10+ digit numbers
- Email addresses: `*@*.*` pattern
- Scam keywords: western union, moneygram, gift card, wire transfer
- Off-platform payment: "pay outside", "send to my account"

**Risk Levels:**
- `low` - Minor patterns, no action
- `medium` - Potential violation, warning shown
- `high` - Confirmed violation, flagged for review  
- `critical` - Severe violation, message blocked immediately

**Bug Fixed:** Timezone comparison for muted_until datetime (naive vs aware)

**Testing:** 13/13 tests passed


---

## User-Facing Report Message UI (Feb 9, 2026)

### Report Message Feature in Mobile Chat - COMPLETE

**Frontend Components (React Native):**
1. **ReportModal** - Bottom sheet modal with:
   - 7 report reasons (scam, abuse, fake listing, off-platform payment, harassment, spam, other)
   - Message preview showing reported message
   - Optional description field (500 char max)
   - Submit button with loading state
   - Disclaimer about false reports

2. **Long-Press Interaction** - Message bubbles support:
   - Long press (500ms) to show options (iOS: ActionSheet, Android: Alert)
   - Only shows for other user's messages (can't report own)
   - Three-dot menu icon hint on messages

**API Integration:**
- `reportApi.getReasons()` - Fetches available report reasons
- `reportApi.reportMessage(conversationId, reason, messageId, description)` - Submits report

**Backend Endpoints:**
- `GET /api/report/reasons` - Public, returns 7 reasons
- `POST /api/report/message` - Auth required, validates participant

**Database:**
- Reports stored in `user_reports` collection
- Fields: reporter_id, reported_user_id, conversation_id, message_id, reason, description, status

**Testing:** 12/12 tests passed

**Files Modified:**
- `frontend/src/utils/api.ts` - Added reportApi
- `frontend/app/chat/[id].tsx` - Added ReportModal, handleLongPressMessage, handleSubmitReport


---

## Moderator Push Notifications (Feb 9, 2026)

### Push Notifications for Moderators - COMPLETE

**Notification Types:**
1. **moderation_alert** - High-risk message detected
   - Trigger: Message flagged with `high` or `critical` risk level
   - Title: "🔴 URGENT: High-Risk Message Detected" (critical) or "🟠 High-Risk Message Detected" (high)
   - Body: User name, risk level, reason tags, message preview
   - CTA: "REVIEW" → `/dashboard/moderation?conversation={id}`
   - Metadata: flag_id, conversation_id, message_id, risk_level, reason_tags, sender_id

2. **moderation_report** - New user report submitted
   - Trigger: User submits report via POST /api/report/message
   - Title: "📢 New User Report Submitted"
   - Body: Reporter name → Reported user, Reason, Description preview
   - CTA: "REVIEW" → `/dashboard/moderation?tab=reports`
   - Metadata: report_id, conversation_id, reporter_id, reported_user_id, reason

**Moderator Management API:**
- `GET /api/moderation/moderators` - List all moderators
- `POST /api/moderation/moderators/{user_id}` - Add user as moderator
- `DELETE /api/moderation/moderators/{user_id}` - Remove moderator role

**Moderator Identification:**
- Users with `is_moderator: true`
- Users with `role` in ["moderator", "admin", "super_admin"]

**Push Notification Flow:**
1. Moderator receives in-app notification (stored in `notifications` collection)
2. If moderator has `push_token`, receives push notification via Expo

**Testing:** 11/11 tests passed

**Files Modified:**
- `backend/chat_moderation.py` - Added _notify_moderators_high_risk_message, _notify_moderators_new_report, moderator management endpoints


---

## AI-Powered Executive Summary System (Feb 9, 2026)

### Executive Summary Dashboard - COMPLETE

**Purpose:**
Provides daily/weekly/monthly AI-generated overview of platform performance, risks, and opportunities for founders, executives, and senior admins.

**Summary Sections (AI-Generated):**
1. **Platform Overview** - Users, active users, listings, transactions, escrow volume
2. **Revenue & Monetization** - Total revenue, commission, boosts, banners, transport fees
3. **Growth & Retention** - Signups, retention rate, conversion, top categories/locations
4. **Trust & Safety** - Disputes, fraud flags, moderation incidents, risk rating
5. **Operations & Logistics** - Transport success rate, delivery delays, partner performance
6. **System Health** - API errors, payment failures, notification delivery
7. **Actionable Recommendations** - AI-suggested actions with impact/urgency levels

**AI Features:**
- Executive brief (2-3 sentence summary)
- Key highlights list
- What changed vs previous period
- What to do next (action items)
- Recommendations with: title, description, impact (low/medium/high), urgency (low/medium/high/immediate), category

**Admin Controls:**
- Enable/disable system
- Choose frequency: Daily, Weekly, Monthly
- Select tone: Formal, Concise, Casual
- Email digest option

**API Endpoints:**
- `GET /api/executive-summary/config` - Configuration
- `PUT /api/executive-summary/config` - Update settings
- `POST /api/executive-summary/generate` - Generate new summary
- `GET /api/executive-summary/latest` - Get latest cached summary
- `GET /api/executive-summary/quick-stats` - Fallback KPI dashboard
- `GET /api/executive-summary/history` - Historical summaries

**Caching:**
- Daily summaries: 6 hours validity
- Weekly summaries: 24 hours validity
- Monthly summaries: 48 hours validity
- Force regenerate option available

**Admin Dashboard UI:**
- Located at `/dashboard/executive-summary`
- Period selector (daily/weekly/monthly)
- Generate New button
- Settings dialog
- Quick stats cards (always visible)
- AI-generated summary sections
- Recommendation cards with impact/urgency badges

**Testing:** 22/22 tests passed

**Files:**
- `backend/executive_summary.py` - Core service with data aggregation and AI
- `admin-dashboard/frontend/src/app/dashboard/executive-summary/page.tsx` - Admin UI


---

## Smart Notification System - Phase 1 Complete (Feb 9, 2026)

**Status:** COMPLETE - Backend infrastructure, admin dashboard, and user preferences implemented

**Overview:**
A personalized notification system that sends Email and Push notifications to users based on their behavior and interests. Features user behavior tracking, interest profile building, configurable triggers, multi-channel delivery, smart throttling, and admin controls.

### Core Components:

**1. User Behavior Tracking**
- Automatically tracks: listing views, saves, searches, purchases
- Builds interest profiles with category scores, price preferences, recent searches
- Integrated into existing endpoints (GET /api/listings/{id}, POST /api/favorites/{id})

**2. Interest Profile**
- Category interests (0-100 score): +1 per view, +5 per save, +20 per purchase
- Price preferences per category (min/max/avg)
- Recent searches (last 20 queries)
- Saved categories for price drop alerts
- Total engagement metrics (views, saves, purchases)

**3. Notification Triggers**
- New Listing in Category: When new items match user interests
- Price Drop on Saved Items: When favorites decrease in price (min 5% drop)
- Message Received: Real-time message notifications
- Offer Received/Accepted: Transaction updates
- Weekly Digest: Summary of activity in interests

**4. Multi-Channel Delivery**
- **Email**: SendGrid integration with HTML templates
- **Push**: Expo Push Notifications
- **In-App**: Internal notification system

**5. Smart Features**
- Throttling: Per-trigger limits (max/day, min interval)
- Deduplication: 24-hour window for same trigger+entity
- Quiet Hours: User-configurable do-not-disturb periods
- User Consent: Per-channel and per-trigger-type opt-in/out

### API Endpoints:

**Admin Endpoints (no auth):**
- `GET /api/smart-notifications/admin/config` - System configuration
- `PUT /api/smart-notifications/admin/config` - Update config
- `GET /api/smart-notifications/admin/triggers` - List triggers
- `POST /api/smart-notifications/admin/triggers` - Create trigger
- `PUT /api/smart-notifications/admin/triggers/{id}` - Update trigger
- `DELETE /api/smart-notifications/admin/triggers/{id}` - Delete trigger
- `GET /api/smart-notifications/admin/analytics` - Performance analytics
- `POST /api/smart-notifications/admin/process` - Manual queue processing

**User Endpoints (auth required):**
- `GET /api/smart-notifications/consent` - Get notification preferences
- `PUT /api/smart-notifications/consent` - Update preferences
- `GET /api/smart-notifications/profile` - Get interest profile
- `POST /api/smart-notifications/track` - Manual behavior tracking
- `GET /api/smart-notifications/history` - Notification history

### Files:
- `backend/smart_notifications.py` - Core service (1100+ lines)
- `backend/routes/listings.py` - Behavior tracking integration
- `backend/routes/favorites.py` - Save behavior tracking
- `admin-dashboard/frontend/src/app/dashboard/smart-notifications/page.tsx` - Admin UI
- `frontend/app/smart-alerts.tsx` - User preferences screen

### Admin Dashboard Features:
- System Settings tab: Email/Push toggles, throttling sliders, quiet hours
- Triggers tab: CRUD for custom notification rules
- Analytics tab: Sent/delivered/opened/clicked metrics

### User Settings Features:
- Delivery channels: Push, Email, In-App toggles
- Alert types: New listings, price drops, messages, offers, digest, promotional
- Quiet hours: Enable/configure do-not-disturb times

### Testing: 24/24 backend tests passed

### Environment Variables:
```
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@marketplace.com
SENDGRID_FROM_NAME=Marketplace
```

---

## Smart Notification System - Phase 2 Complete (Feb 9, 2026)

**Status:** COMPLETE - All Phase 2 features implemented and tested

### New Features in Phase 2:

**1. Push Notification Deep Linking**
- Users tap notifications to navigate directly to listings, conversations, or profiles
- Implemented in `/app/frontend/src/utils/notifications.ts`
- Hook: `useNotificationDeepLinking()` - handles notification tap events
- Supports paths: `/listing/{id}`, `/chat/{id}`, `/user/{id}`, `/profile/{id}`
- Automatic navigation based on trigger type (explore, favorites, inbox)

**2. Conversion Tracking**
- Track notification opens, clicks, and conversions
- Attribution window: 24 hours
- Track conversion types: purchase, message_sent, listing_saved, profile_view
- Time-to-convert metrics
- API Endpoints:
  - `POST /api/smart-notifications/track/open/{notification_id}`
  - `POST /api/smart-notifications/track/click/{notification_id}`
  - `POST /api/smart-notifications/track/conversion/{notification_id}`
  - `GET /api/smart-notifications/admin/conversions`

**3. A/B Testing System**
- Create tests with control + 2 variants
- Configurable traffic split percentages
- Track sent/opened/clicked/converted per variant
- Automatic winner determination based on conversion rate
- API Endpoints:
  - `GET /api/smart-notifications/admin/ab-tests`
  - `POST /api/smart-notifications/admin/ab-tests`
  - `GET /api/smart-notifications/admin/ab-tests/{id}`
  - `PUT /api/smart-notifications/admin/ab-tests/{id}`
  - `POST /api/smart-notifications/admin/ab-tests/{id}/end`

**4. Additional Triggers**
- **Similar Listing Alerts**: Matches users based on recent searches and category interests
- **Seller Reply Notifications**: High-priority alerts when seller responds to buyer inquiry
  - Channels: push, email, in_app
  - Deep links to conversation

**5. Weekly Digest System**
- Configurable schedule (day of week, hour)
- Generates personalized digest based on user interests
- Includes: new listings in categories, price drops on saved items
- API Endpoints:
  - `GET /api/smart-notifications/admin/weekly-digest/config`
  - `PUT /api/smart-notifications/admin/weekly-digest/config`
  - `POST /api/smart-notifications/admin/weekly-digest/send`
  - `GET /api/smart-notifications/admin/weekly-digest/preview/{user_id}`

### Files Added/Updated in Phase 2:
- `backend/smart_notifications.py` - Updated with Phase 2 features (2000+ lines)
- `frontend/src/utils/notifications.ts` - NEW: Deep linking and push utilities
- `frontend/app/_layout.tsx` - Updated with notification handling

### Testing: 55/55 tests passed (24 Phase 1 + 31 Phase 2)

---

## Smart Notification System - Phase 3 Complete (Feb 9, 2026)

**Status:** COMPLETE - All Phase 3 features implemented and tested

### New Features in Phase 3:

**1. Real-Time Notification Preview**
- Interactive preview tab in admin dashboard
- Live mobile push notification mockup (dark theme, realistic iOS/Android style)
- Live email preview with styled HTML rendering
- Template variable editor with sample data
- Preview button on all notification-related dialogs

**2. Email Template Editor**
- Full CRUD for email templates
- HTML content support with template variables
- Active/inactive toggle per template
- Associated with trigger types
- API Endpoints:
  - `GET /api/smart-notifications/admin/templates`
  - `POST /api/smart-notifications/admin/templates`
  - `PUT /api/smart-notifications/admin/templates/{id}`
  - `DELETE /api/smart-notifications/admin/templates/{id}`

**3. Scheduled Campaigns**
- Create and schedule promotional campaigns for future delivery
- Target user segments (all_users, active_buyers, active_sellers, inactive_users)
- Multi-channel support (push, email, in_app)
- Campaign status management (scheduled, sent, cancelled, failed)
- Manual send option for immediate delivery
- API Endpoints:
  - `GET /api/smart-notifications/admin/campaigns`
  - `POST /api/smart-notifications/admin/campaigns`
  - `PUT /api/smart-notifications/admin/campaigns/{id}`
  - `POST /api/smart-notifications/admin/campaigns/{id}/cancel`
  - `POST /api/smart-notifications/admin/campaigns/{id}/send`
  - `DELETE /api/smart-notifications/admin/campaigns/{id}`

**4. Enhanced Admin Dashboard**
- Completely rebuilt with 7 tabs:
  1. **Settings**: System config, email/push toggles, throttling, quiet hours
  2. **Triggers**: Notification trigger rules CRUD
  3. **Analytics**: Performance metrics and daily breakdown
  4. **Preview**: Interactive notification preview tool
  5. **Templates**: Email template management
  6. **Campaigns**: Scheduled campaign management
  7. **A/B Tests**: Test creation and results

### Files Added/Updated in Phase 3:
- `backend/smart_notifications.py` - Updated with templates & campaigns APIs (2300+ lines)
- `admin-dashboard/frontend/src/app/dashboard/smart-notifications/page.tsx` - Complete rebuild (1100+ lines)

### Testing: 83/83 tests passed (24 Phase 1 + 31 Phase 2 + 28 Phase 3)

---

## Smart Notification System - Phase 4 Complete (Feb 9, 2026)

**Status:** COMPLETE - All Phase 4 features implemented and tested

### New Features in Phase 4:

**1. Firebase Cloud Messaging (FCM) Integration**
- Firebase Admin SDK initialization with service account credentials
- Support for both FCM tokens and Expo Push tokens
- Automatic fallback to Expo Push when FCM is not configured
- FCM multicast sending for efficient batch notifications
- Environment variables: `FIREBASE_CREDENTIALS_PATH` or `FIREBASE_CREDENTIALS_JSON`

**2. User Segmentation Rules**
- 7 predefined segments out of the box:
  - all_users, active_buyers, active_sellers, inactive_users
  - high_value_users, new_users, engaged_browsers
- Custom segment creation with complex rules
- Supported operators: equals, not_equals, greater_than, less_than, contains, in_list, between, exists, not_exists
- AND/OR logic support for multiple rules
- Segment preview (view users matching criteria)
- Estimated user count with recalculation
- API Endpoints:
  - `GET /api/smart-notifications/admin/segments`
  - `POST /api/smart-notifications/admin/segments`
  - `GET /api/smart-notifications/admin/segments/{id}/preview`
  - `POST /api/smart-notifications/admin/segments/{id}/recalculate`
  - `PUT /api/smart-notifications/admin/segments/{id}`
  - `DELETE /api/smart-notifications/admin/segments/{id}`

**3. Campaign Scheduling Automation**
- Scheduler status endpoint showing:
  - Scheduler running state
  - Due campaigns count
  - FCM/SendGrid enabled status
  - Campaigns sent today
- Process due campaigns endpoint for manual triggering
- API Endpoints:
  - `GET /api/smart-notifications/admin/scheduler/status`
  - `POST /api/smart-notifications/admin/scheduler/process-due`

**4. Analytics Charts with Recharts**
- Dedicated Notification Analytics page at `/dashboard/notification-analytics`
- Time series data for trends visualization:
  - Area charts for sent/delivered/opened/clicked over time
  - Bar charts for daily performance
  - Line charts for engagement rate trends
- Analytics by trigger type:
  - Horizontal bar charts
  - Performance table with rates
- Analytics by channel:
  - Pie chart distribution
  - Channel-specific cards with metrics
- Conversions tab with value tracking
- Time range selector (7-90 days)
- Growth indicators with trend arrows
- API Endpoints:
  - `GET /api/smart-notifications/admin/analytics/timeseries`
  - `GET /api/smart-notifications/admin/analytics/by-trigger`
  - `GET /api/smart-notifications/admin/analytics/by-channel`

### Files Added/Updated in Phase 4:
- `backend/smart_notifications.py` - Updated with Phase 4 features (2800+ lines)
- `admin-dashboard/frontend/src/app/dashboard/notification-analytics/page.tsx` - NEW: Analytics with Recharts (500+ lines)
- `admin-dashboard/frontend/src/app/dashboard/layout.tsx` - Added navigation link

### Testing: 110/110 tests passed (83 Phase 1-3 + 27 Phase 4)

---

## Smart Notification System - Phase 5 Complete (Feb 9, 2026)

**Status:** COMPLETE - All Phase 5 features implemented and tested

### New Features in Phase 5:

**1. Multi-Language Templates (i18n)**
- 15 supported languages: en, es, fr, de, it, pt, nl, pl, ru, zh, ja, ko, ar, hi, tr
- 4 default multi-language templates with translations:
  - new_listing_alert (6 languages)
  - price_drop_alert (4 languages)
  - message_received (4 languages)
  - weekly_digest (4 languages)
- Custom template creation with version tracking
- Template preview with variable substitution in any language
- Language fallback to default if translation not available
- API Endpoints:
  - `GET /api/smart-notifications/admin/languages`
  - `GET/POST/PUT/DELETE /api/smart-notifications/admin/ml-templates`
  - `POST /api/smart-notifications/admin/ml-templates/preview`
  - `POST /api/smart-notifications/admin/ml-templates/{id}/add-language`
  - `DELETE /api/smart-notifications/admin/ml-templates/{id}/language/{lang}`

**2. Campaign Scheduler Automation**
- Scheduler configuration with rate limiting:
  - check_interval_seconds (default: 60)
  - max_campaigns_per_hour (default: 10)
  - max_notifications_per_minute (default: 1000)
- Scheduler control (start/stop)
- Daily stats tracking (campaigns_processed_today, notifications_sent_today)
- Alert on failure option with email
- Scheduler logs
- API Endpoints:
  - `GET/PUT /api/smart-notifications/admin/scheduler/config`
  - `POST /api/smart-notifications/admin/scheduler/start`
  - `POST /api/smart-notifications/admin/scheduler/stop`
  - `GET /api/smart-notifications/admin/scheduler/logs`
  - `POST /api/smart-notifications/admin/scheduler/reset-daily-stats`

**3. Visual Segment Builder (Admin Dashboard)**
- Dedicated Segment Builder page at `/dashboard/segment-builder`
- 7 predefined segments with user counts:
  - all_users, active_buyers, active_sellers, inactive_users
  - high_value_users, new_users, engaged_browsers
- Visual rule builder with:
  - 10 common fields (total_purchases, total_views, last_activity, etc.)
  - 9 operators (equals, greater_than, between, contains, etc.)
  - AND/OR logic support
- Segment preview showing matching users
- User count recalculation
- Custom segment CRUD

### Files Added/Updated in Phase 5:
- `backend/smart_notifications.py` - Updated with Phase 5 features (3300+ lines)
- `admin-dashboard/frontend/src/app/dashboard/segment-builder/page.tsx` - NEW: Visual Segment Builder (450+ lines)
- `admin-dashboard/frontend/src/app/dashboard/layout.tsx` - Added navigation link

### Testing: 142/142 tests passed (110 Phase 1-4 + 32 Phase 5)

### Files Added in AI Personalization Admin UI Task:
- `/app/admin-dashboard/frontend/src/app/dashboard/ai-personalization/page.tsx` - Complete admin UI with 4 tabs:
  - Settings: Toggle AI on/off, configure styles, rate limits, caching, content limits
  - Preview & Test: Test personalization for any user with context variables
  - Styles: View 6 available personalization styles with descriptions
  - Analytics: Charts and tables showing personalization usage stats

**Note:** The admin UI page may require a full service restart to be detected by Next.js Turbopack. The page file is correctly structured at `/app/admin-dashboard/frontend/src/app/dashboard/ai-personalization/page.tsx`.

---

## Smart Notification System - Final Summary

**Total Lines of Code:** ~4200+ backend, ~3000+ admin dashboard
**Total Tests:** 169 passing across 6 phases (142 Phase 1-5 + 27 Phase 6)
**Admin Dashboard Pages:** 3 new pages (Smart Notifications, Notification Analytics, Segment Builder)

**Complete Feature List:**
- User behavior tracking with interest profiles
- Multi-channel delivery (Push via FCM/Expo, Email via SendGrid, In-App)
- 15 language support for notification templates
- Smart throttling, deduplication, quiet hours
- A/B testing with automatic winner determination
- Conversion tracking with attribution
- User segmentation with visual builder
- Scheduled campaigns with automation
- Real-time notification preview
- Comprehensive analytics with Recharts charts
- **AI-powered notification content personalization (Phase 6)**

---

## Smart Notification System - Phase 6 Complete (Feb 9, 2026)

**Status:** COMPLETE - AI-powered notification content personalization implemented and tested

### New Features in Phase 6:

**1. AI Personalization Service**
- Uses OpenAI GPT-4o via Emergent LLM Key for content generation
- Generates personalized notification title and body based on:
  - User profile (name, preferred categories, price preferences)
  - Interest profile (engagement level, recent searches, recent views)
  - Notification context (trigger type, listing details, price)
- 6 personalization styles: Friendly, Professional, Urgent, Casual, Enthusiastic, Concise

**2. Smart Features**
- Rate limiting: 60 requests/minute default
- Caching: 24-hour cache for personalized content
- Fallback: Uses template content if AI fails
- Integration: Automatically applied in `_queue_notification` method

**3. A/B Testing Support**
- Generate multiple notification variants with different styles
- Up to 5 variants per request
- Each variant includes title, body, CTA text, style ID

**4. API Endpoints**
- `GET /api/smart-notifications/admin/ai-personalization/config` - Configuration
- `PUT /api/smart-notifications/admin/ai-personalization/config` - Update settings
- `POST /api/smart-notifications/admin/ai-personalization/test` - Test personalization
- `POST /api/smart-notifications/admin/ai-personalization/generate-variants` - Generate variants
- `GET /api/smart-notifications/admin/ai-personalization/styles` - Available styles
- `GET /api/smart-notifications/admin/ai-personalization/analytics` - Usage analytics

### Files Added/Updated in Phase 6:
- `backend/smart_notifications.py` - Added AIPersonalizationService class (lines 36-514), integrated into SmartNotificationService

### Testing: 169/169 tests passed (142 Phase 1-5 + 27 Phase 6)

---

## Platform Configuration & Brand Manager - Complete (Feb 9, 2026)

**Status:** COMPLETE - Centralized platform configuration system implemented and tested

### Features Implemented:

**1. Currency Management**
- Add/enable/disable currencies
- Set default platform currency
- Per-country currency support (ISO country codes)
- Configure: symbol, decimal precision, rounding rules
- FX rate management (manual entry)
- Lock currencies for escrow transactions

**2. Branding & Logos**
- Upload/manage 7 logo types: Primary, Dark, Light, App Icon, Favicon, Email, Splash
- Versioned uploads with rollback support
- Preview on App/Web/Emails
- Local file storage at `/app/backend/uploads/branding/`

**3. Static & Legal Pages**
- Create/manage: Privacy Policy, Terms & Conditions, Cookie Policy, About Us, Help/FAQ
- Rich HTML content (WYSIWYG-ready)
- Draft/Published states with version history
- Force re-acceptance when legal pages change
- Country-specific versions support

**4. External Links & Social Media**
- Social media links: Facebook, Instagram, X (Twitter), TikTok, LinkedIn, YouTube
- Placement controls: Footer, Profile, Header, Share Dialogs
- Icon style: Mono or Brand Color
- Global enable/disable

**5. App Store Links**
- Google Play Store, Apple App Store, Huawei AppGallery
- Country-specific links
- Show/hide badges
- Deep-link support

**6. Multi-Environment Support**
- Production and Staging environments
- Configs isolated per environment
- Environment selector in Admin UI

**7. Permissions & Safety**
- All changes logged with Who/What/When
- Config versioning with rollback
- Fail-safe: App loads last known good config
- Cached configs with hot reload

### API Endpoints:
- `GET/PUT /api/platform/config/{environment}` - Config management
- `GET/POST/PUT /api/platform/currencies/{environment}` - Currency CRUD
- `POST /api/platform/branding/{environment}/upload` - Logo uploads
- `GET/POST/PUT/DELETE /api/platform/legal-pages/{environment}` - Legal pages
- `PUT /api/platform/social-links/{environment}` - Social links
- `PUT /api/platform/app-store-links/{environment}` - App store links
- `GET /api/platform/audit-logs/{environment}` - Audit logs
- `GET /api/platform/public/config` - Public API for app/web

### Files Added:
- `/app/backend/platform_config.py` - Backend service (~1000 lines)
- `/app/admin-dashboard/frontend/src/app/dashboard/platform-config/page.tsx` - Admin UI with Live Preview Panel

### Admin UI Features:
- **Live Preview Panel** (Feb 9, 2026): Real-time preview showing:
  - Mobile App splash screen
  - Website header (Light & Dark mode)
  - Email template with header, body, CTA, and footer
  - Browser tab with favicon

### Testing: 30/30 tests passed

---

## Third-Party API Integrations Manager - Complete (Feb 9, 2026)

**Status:** COMPLETE - Centralized API integrations management with encrypted credentials

### Features Implemented:

**1. Provider Support (16 Providers, 7 Categories)**
- **Messaging**: Twilio SMS, Twilio WhatsApp, Local SMS Gateway (Africa-ready)
- **Email**: Mailchimp, SMTP Email, SendGrid
- **Payments**: Stripe, PayPal, Mobile Money (M-Pesa)
- **Analytics**: Google Analytics, Mixpanel
- **AI Services**: OpenAI, Google Vision
- **Push Notifications**: Firebase FCM, OneSignal
- **Other**: Transport Partner API

**2. Security & Encryption**
- AES-256-CBC encryption for all credentials
- SHA-256 key derivation from master key
- Credentials masked in all API responses (asterisks + last 4 chars)
- Audit logs do NOT store credential values

**3. Environment Support**
- Production, Sandbox, and Staging environments
- Configs isolated per environment
- Environment selector in Admin UI

**4. Webhook Management**
- Create/toggle/delete webhooks
- Webhook execution logs
- Signature verification support
- Retry mechanism for failed webhooks

**5. Feature/Country Routing**
- Configure which provider handles which feature
- Country-specific provider selection
- Primary + fallback provider chains

**6. Monitoring & Audit**
- Health status dashboard (Connected/Error/Disabled/Not Configured)
- Audit logging for all configuration changes
- Metrics tracking

**7. Test Capabilities**
- Connection testing for each provider
- Test SMS, WhatsApp, and Email sending
- Sandbox mode support

### Admin Dashboard UI:
- Integrations tab with provider cards grouped by category
- Webhooks tab with logs
- Audit Log tab
- Health summary cards
- Environment toggle (Production/Sandbox/Staging)

### API Endpoints:
- `GET /api/integrations/providers` - Get all providers
- `GET/POST/PUT/DELETE /api/integrations/config/{environment}/{provider_id}` - Integration CRUD
- `POST /api/integrations/config/{environment}/{provider_id}/test` - Test connection
- `GET/POST /api/integrations/webhooks` - Webhook management
- `GET /api/integrations/webhooks/logs` - Webhook logs
- `GET/POST/DELETE /api/integrations/routing` - Feature routing
- `GET /api/integrations/health/{environment}` - Health status
- `GET /api/integrations/audit` - Audit logs

### Files Added:
- `/app/backend/api_integrations.py` - Backend service (~1100 lines)
- `/app/admin-dashboard/frontend/src/app/dashboard/integrations/page.tsx` - Admin UI

### Testing: 40/40 tests passed

---

## Data Privacy & Compliance Center - Complete (Feb 9, 2026)

**Status:** COMPLETE - Centralized data privacy and compliance management

### Features Implemented:

**1. DSAR (Data Subject Access Requests) Management**
- Support for GDPR and African data protection laws (NDPA Nigeria, POPIA South Africa, Kenya DPA, Uganda DPA)
- Request types: Data Access, Data Export, Data Deletion, Data Rectification, Processing Restriction
- Status tracking: Pending → In Progress → Approved → Completed/Rejected
- SLA deadline tracking with overdue alerts (30-day GDPR deadline)
- Risk indicators: Overdue requests, critical incidents, high pending count
- Quick actions: Start Processing, Mark Complete, Reject

**2. User Data Export (JSON, CSV, PDF)**
- Export all user data categories: Profile, Listings, Chats, Orders, Payments, Location, Notifications
- Field-level data masking for sensitive information
- Audit log for all data access and exports

**3. Right to be Forgotten**
- Full data deletion with cascading rules
- Anonymization option (preserves data structure with anonymized values)
- Legal record preservation for required retention periods

**4. Consent Management**
- 6 consent categories: Marketing, Analytics, Notifications, Personalized Ads, Third-Party Sharing, Location Tracking
- User opt-in/out history with timestamps
- Policy version tracking
- Bulk consent updates

**5. Data Retention Policies**
- Per-category retention periods (configurable days)
- Country-specific retention rules
- Auto-purge automation with soft delete option
- Dry-run mode for testing purge impact
- Default policies: Profile (2 years), Orders (5 years), Payments (5 years), Chats (1 year), Analytics (1 year), Notifications (90 days)

**6. Third-Party Data Processor Disclosure**
- 6 default processors: Stripe, Twilio, SendGrid, Mailchimp, Google Analytics, Firebase
- GDPR compliance status badges
- DPA (Data Processing Agreement) signed status
- Data shared categories per processor
- Purpose and country information

**7. Incident Management**
- Data breach logging and tracking
- Severity levels: Low, Medium, High, Critical
- Status workflow: Open → Investigating → Mitigated → Resolved → Closed
- Affected users count and data types tracking
- Notification tracking (users notified, DPA reported)
- Actions taken log

**8. Compliance Audit Logs**
- Immutable audit trail for all compliance actions
- Actor ID, role, and target user tracking
- Data categories affected
- Timestamp and action details
- Filterable by action type and date

**9. Dashboard & Risk Indicators**
- Real-time DSAR summary (pending, in progress, completed, overdue)
- Incident counts (open, critical)
- Risk alerts for overdue requests and critical incidents
- Upcoming deadlines view

**10. Legal Text Management** (NEW - Feb 9, 2026)
- Document types: Privacy Policy, Terms of Service, Cookie Policy, DPA, Acceptable Use Policy
- Version control with automatic version incrementing
- Draft → Published → Archived workflow
- Country-specific document variants (with global fallback)
- Force re-acceptance option for published documents
- User acceptance tracking with IP address and timestamp
- Changelog support for version differences

**11. Sandbox Mode** (NEW - Feb 9, 2026)
- Generate fake DSAR requests with randomized statuses and deadlines
- Create test incidents with various severity levels
- Configurable: fake users count, DSARs count, incidents count
- PII sample toggle for realistic testing
- Auto-cleanup on disable with reset_on_disable option
- Clear sandbox data markers (is_sandbox: true)

**12. Role-Based Access Control** (NEW - Feb 9, 2026)
- Protected write operations (create, update, delete, publish)
- Read operations public for admin dashboard access
- Compliance roles: super_admin, compliance_officer, admin
- Audit logging for all write operations

### API Endpoints:
- `GET /api/compliance/dashboard` - DSAR summary, incidents, risk indicators
- `GET /api/compliance/dsar` - List DSAR requests with filters
- `POST /api/compliance/dsar` - Create DSAR request
- `PUT /api/compliance/dsar/{id}/status` - Update DSAR status
- `GET /api/compliance/retention` - List retention policies
- `POST /api/compliance/retention` - Create/update retention policy
- `POST /api/compliance/retention/purge` - Run retention purge (dry-run option)
- `GET /api/compliance/third-party` - List third-party processors
- `GET /api/compliance/audit` - Audit logs
- `GET /api/compliance/incidents` - List incidents
- `POST /api/compliance/incidents` - Create incident
- `PUT /api/compliance/incidents/{id}` - Update incident
- `GET/POST /api/compliance/consent/{user_id}` - Manage user consents
- `POST /api/compliance/export/{user_id}` - Export user data
- `POST /api/compliance/delete/{user_id}` - Delete/anonymize user data
- **NEW** `GET /api/compliance/legal-documents` - List legal documents
- **NEW** `POST /api/compliance/legal-documents` - Create legal document
- **NEW** `PUT /api/compliance/legal-documents/{id}` - Update draft document
- **NEW** `POST /api/compliance/legal-documents/{id}/publish` - Publish document
- **NEW** `GET /api/compliance/legal-documents/check-acceptance/{user_id}` - Check user acceptance status
- **NEW** `POST /api/compliance/legal-documents/accept` - Record user acceptance
- **NEW** `GET /api/compliance/sandbox/config` - Get sandbox configuration
- **NEW** `PUT /api/compliance/sandbox/config` - Update sandbox mode (enable/disable)

### Admin Dashboard UI:
- 8 tabs: DSAR Requests, Consent Management, Data Retention, Incidents, Third Parties, Audit Logs, **Legal Docs**, **Sandbox**
- Risk indicator alerts at top of page
- Dashboard stats cards (Pending, In Progress, Completed, Overdue, Open Incidents, 3rd Parties)
- DSAR table with filters (Status, Type) and quick actions
- Consent lookup by user ID with category status
- Retention policy table with Add Policy and Run Purge buttons
- Incident table with status/severity badges and notification status
- Third-party processor cards with GDPR/DPA badges
- Audit logs table with action details

### Files Added:
- `/app/backend/compliance_center.py` - Backend service (~1750 lines)
- `/app/admin-dashboard/frontend/src/app/dashboard/compliance/page.tsx` - Admin UI (~1100 lines)
- `/app/admin-dashboard/frontend/src/app/dashboard/layout.tsx` - Added "Data Privacy" navigation link

### Testing: 34/34 backend tests passed, 100% frontend coverage

### Data Classification Tags Used:
- **PII** (Personal Identifiable Info) - name, email, phone
- **Financial** - payment info, transactions, billing
- **Location** - addresses, GPS data
- **Communication** - chats, messages, notifications
- **Behavioral** - app usage, preferences, analytics
- **Sensitive** - health, legal records

### Security Note:
Compliance endpoints are currently open (no auth required) for admin access. In production, these should be secured with role-based access control to restrict to super_admin and compliance officer roles only.

---

## Config & Environment Manager - Complete (Feb 9, 2026)

**Status:** COMPLETE - Centralized configuration management across environments

### Features Implemented:

**1. Multi-Environment Support**
- 4 environments: Production, Staging, Sandbox, Development
- Independent configs, API keys, and feature states per environment
- Environment switcher in admin dashboard header

**2. Global Platform Settings**
- Platform name, tagline, support contact
- Default currency, VAT %, Commission %
- Escrow duration (days), Listing expiry
- Rate limits (API/min, API/hour, listings/day, messages/min)
- Notification defaults (Push, Email, SMS, WhatsApp)
- Transport defaults (provider, free shipping threshold, delivery distance)

**3. Feature Flags System (20 features)**
- Escrow system, Online checkout, Verified sellers
- Boosts & credits, Seller analytics, AI descriptions
- Transport integration, SMS/WhatsApp notifications
- Chat moderation, Banners & ads, Sandbox mode
- Price negotiation, Multi-currency, Reviews & ratings
- Favorites & watchlist, Push/Email notifications
- Location services, Image AI moderation
- Scopes: Global → Country → Role → Seller override
- Gradual rollout with percentage control

**4. Country/Region Configurations**
- 5 pre-configured countries: US, KE, NG, ZA, GB
- Per-country: Currency, VAT rate, Timezone
- Payment methods (card, mobile_money, bank_transfer, cash)
- Mobile money providers (M-Pesa, MTN, Airtel, OPay)
- Transport partners (FedEx, Sendy, Glovo, DHL)
- Notification channels and support languages

**5. API Key Management**
- Environment-specific storage
- Masked display (****last4chars)
- Service types: Stripe, PayPal, M-Pesa, Twilio, SendGrid, OpenAI, Firebase
- Key types: api_key, secret_key, webhook_secret, access_token
- Expiration tracking, last used timestamp
- Super Admin access only

**6. 2-Admin Approval Workflow**
- Critical configs require second admin approval:
  - commission_percentage, escrow_duration_days, vat_rate
  - checkout_enabled, escrow_enabled, payment_gateway_keys
- 24-hour expiration on pending approvals
- Approve/Reject with reason tracking

**7. Config Versioning & Rollback**
- Every change versioned with author/timestamp
- Change notes for critical configs
- One-click rollback to previous version
- Checksum verification for integrity

**8. Preview & Simulation**
- Preview config changes without saving
- Simulate user experience by country/role
- Shows: Currency, VAT, payment methods, feature states

**9. Health Check & Export**
- Health status: Healthy, Degraded, Unhealthy
- Checks: Global config, feature flags, country configs, expired keys, pending approvals
- JSON export of full configuration
- Fail-safe: Falls back to last known good config on service failure

**10. Audit Trail**
- Immutable audit log for all config changes
- Tracks: Action, category, config key, old/new values, performer, timestamp
- Filterable by environment, category, performer, date range

### API Endpoints:
- `GET /api/config-manager/global/{environment}` - Get global settings
- `PUT /api/config-manager/global/{environment}` - Update (with approval for critical)
- `GET /api/config-manager/available-features` - List all 20 feature flags
- `GET /api/config-manager/features/{environment}` - Get feature flags for environment
- `PUT /api/config-manager/features/{environment}/{feature_id}` - Toggle feature
- `GET /api/config-manager/features/{environment}/check/{feature_id}` - Check if enabled
- `GET /api/config-manager/countries/{environment}` - Get country configs
- `PUT /api/config-manager/countries/{environment}/{country_code}` - Update country
- `GET /api/config-manager/api-keys/{environment}` - Get masked API keys
- `POST /api/config-manager/api-keys/{environment}` - Add API key
- `GET /api/config-manager/approvals/pending` - Pending approval requests
- `POST /api/config-manager/approvals/{id}/approve` - Approve change
- `POST /api/config-manager/approvals/{id}/reject` - Reject change
- `GET /api/config-manager/history/{environment}/{category}` - Version history
- `POST /api/config-manager/rollback/{environment}/{category}` - Rollback
- `POST /api/config-manager/preview/{environment}/{category}` - Preview changes
- `GET /api/config-manager/simulate/{environment}` - Simulate user experience
- `GET /api/config-manager/health/{environment}` - Health check
- `GET /api/config-manager/export/{environment}` - Export as JSON
- `GET /api/config-manager/audit-logs` - Audit trail

### Admin Dashboard UI:
- 6 tabs: Global Settings, Feature Flags, Countries, API Keys, Approvals, Audit Logs
- Environment selector (Production, Staging, Sandbox, Development)
- Export button, Simulate button
- Health status indicator
- Edit Settings dialog with critical changes warning
- Feature flag toggle cards
- Country table with payment methods
- API Keys table with masked values
- Pending approvals with approve/reject
- **NEW**: Scheduled Deployments tab with execute/cancel/rollback actions

### Files Added:
- `/app/backend/config_manager.py` - Backend service (~2400 lines)
- `/app/admin-dashboard/frontend/src/app/dashboard/config-manager/page.tsx` - Admin UI (~1200 lines)
- `/app/backend/tests/test_config_manager.py` - Test file

### Testing: 96% backend (25/26), 100% frontend

---

## Scheduled Config Deployments - Complete (Feb 9, 2026)

**Status:** COMPLETE - Schedule feature flag and config changes for specific times

### Features Implemented:

**1. Scheduled Deployment Creation**
- Schedule feature flag changes (e.g., Black Friday promotions)
- Schedule global setting changes
- Schedule country config changes
- Set deployment time (ISO datetime)
- Optional duration (auto-complete after N hours)

**2. Automatic Rollback**
- Enable/disable auto-rollback per deployment
- Rollback on error rate threshold (default: 5%)
- Rollback on metric drop threshold (default: 20%)
- Configurable metric to monitor (checkout_conversion, api_success_rate)
- Monitoring period (5-240 minutes)

**3. Deployment Lifecycle**
- Status: pending → active → completed/rolled_back/cancelled
- Manual execution (Execute Now)
- Manual rollback with reason
- Cancel pending deployments
- Save original values for rollback

**4. Metric Recording**
- Record deployment metrics for monitoring
- Automatic rollback check based on thresholds
- Time-series metric storage

### API Endpoints:
- `GET /api/config-manager/scheduled-deployments` - List deployments
- `GET /api/config-manager/scheduled-deployments/upcoming` - Upcoming deployments
- `POST /api/config-manager/scheduled-deployments` - Create deployment
- `POST /api/config-manager/scheduled-deployments/{id}/execute` - Execute now
- `POST /api/config-manager/scheduled-deployments/{id}/rollback` - Rollback
- `POST /api/config-manager/scheduled-deployments/{id}/complete` - Mark complete
- `POST /api/config-manager/scheduled-deployments/{id}/cancel` - Cancel
- `POST /api/config-manager/scheduled-deployments/{id}/metrics` - Record metric
- `GET /api/config-manager/scheduled-deployments/{id}/check-metrics` - Check rollback need

### Admin UI:
- Scheduled tab with pending count badge
- Table with name, type, scheduled time, status, auto-rollback, duration
- Execute Now, Cancel, Rollback action buttons
- **Schedule Deployment Dialog** - COMPLETE (Feb 9, 2026):
  - Deployment Name and Description fields
  - Config Type selector (Feature Flags, Global Settings, Country Config)
  - Scheduled Date & Time picker
  - Duration in hours (0 = permanent)
  - Feature Flag toggles for bulk selection
  - Auto-Rollback settings (Enable/Disable, Error Rate Threshold, Metric Drop Threshold)
  - Metric to Monitor dropdown (Checkout Conversion, API Success Rate, Error Rate, Page Load Time)

### Background Scheduler:
- APScheduler-based background task processor
- Checks for due deployments every 60 seconds
- Automatic execution of pending deployments
- Status endpoint: GET /api/config-manager/scheduler/status
- Returns: running state, due/active/pending deployment counts

---

## African Expansion Countries - Complete (Feb 9, 2026)

**Status:** COMPLETE - Added 5 new African countries

### New Countries:
| Country | Code | Currency | VAT | Mobile Money Providers |
|---------|------|----------|-----|----------------------|
| Ghana | GH | GHS | 15% | MTN, Vodafone, AirtelTigo |
| Tanzania | TZ | TZS | 18% | M-Pesa, TigoPesa, Airtel |
| Uganda | UG | UGX | 18% | MTN, Airtel |
| Zambia | ZM | ZMW | 16% | MTN, Airtel, Zamtel |
| Zimbabwe | ZW | ZWL | 15% | EcoCash, OneMoney, TeleCash |

### Total Countries: 10
US, GB, KE, NG, ZA, **GH**, **TZ**, **UG**, **ZM**, **ZW**

---

## Session Update: Dec 2025

### Email Templates Management & Sender Verification - COMPLETE ✅ (Feb 9, 2026)

**Email Templates System:**
- 5 default templates: Task Assignment, Approval Request, SLA Breach Alert, Daily Summary, Welcome New Member
- CRUD API endpoints for templates (`/api/team/email/templates/*`)
- Template preview with variable substitution
- HTML editor for customizing email body
- Variable syntax: `{{variable_name}}`
- Categories: task, approval, alert, summary, general

**Email Templates UI (new tab in Team Management):**
- Card grid showing all templates
- Preview button - renders template with sample data
- Edit button - full HTML editor with variable helper
- Verify Sender Email button - initiates SendGrid sender verification

**SendGrid Sender Verification:**
- API endpoint to initiate verification: `POST /api/team/email/senders/verify`
- Sends verification email to the provided address
- User must click verification link in email
- Once verified, emails will send successfully

**Note:** To complete email setup:
1. Click "Verify Sender Email" in the Email Templates tab
2. Enter your sender email (e.g., noreply@yourdomain.com)
3. Check inbox and click verification link from SendGrid
4. Update `SENDGRID_FROM_EMAIL` in `/app/backend/.env` to the verified email

### P2 Features Added to Team Management - COMPLETE ✅ (Feb 9, 2026)

**1. Real-time Notification Bell in Admin Header:**
- Badge showing unread count (tasks + approvals)
- Popover with notification list showing:
  - Task assignments with priority colors
  - Pending approvals
  - SLA breach indicators
  - Timestamps and quick links
- Auto-refresh every 30 seconds
- "View All in Team Management" link

**2. Shift & Availability:**
- Create/update/delete shift schedules
- On-call status management
- Available members for task assignment based on shift
- API: `/api/team/shifts/*`, `/api/team/on-call`, `/api/team/available-for-assignment`

**3. Sandbox / Training Mode:**
- Training environment with mock tasks and approvals
- Training progress tracking
- Actions don't affect real users/transactions
- API: `/api/team/sandbox/data`, `/api/team/sandbox/action`, `/api/team/sandbox/progress/{member_id}`

**4. 2FA Security:**
- Setup 2FA with QR code generation (pyotp)
- Verify setup with authenticator app code
- Enable/disable 2FA per member
- API: `/api/team/2fa/{member_id}/setup`, `/api/team/2fa/{member_id}/verify-setup`, `/api/team/2fa/{member_id}/verify`

**5. Email Notifications (SendGrid):**
- Task assignment emails
- Approval request notifications
- SLA breach alerts
- Configurable templates
- API: `/api/team/email/test`

### Team & Workflow Management System - COMPLETE ✅ (Feb 9, 2026)
**Backend (32/32 tests passed):**
- 8 Core RBAC Roles: Super Admin, Admin, Moderator, Support Agent, Finance, Operations, Marketing, Analyst
- 14 Permission Modules with 5 levels: none, read, write, approve, override
- Task/Ticket System with SLA tracking and auto-escalation
- Approval Flows for sensitive actions (refunds, bans, config changes)
- Immutable Audit Trail with before/after state logging
- Workflow Automation Rules (auto-assign disputes, chat abuse, etc.)
- Configurable Settings (SLA timers, approval thresholds, escalation)
- In-app Notifications with @mentions

**Frontend:**
- Dashboard with summary cards (Active Members, Open Tasks, Pending Approvals, SLA Breaches)
- 7 Tabs: Dashboard, Team, Roles & Permissions, Tasks, Approvals, Settings, Audit Log
- Team members table with Add Member dialog
- Role cards showing permissions matrix
- Task table with filters, assignment, status updates
- Approvals table with approve/reject actions

**API Endpoints:**
- `/api/team/members/*` - Team member CRUD
- `/api/team/roles/*` - Role management
- `/api/team/tasks/*` - Task workflow
- `/api/team/approvals/*` - Approval flows
- `/api/team/workflow-rules/*` - Automation rules
- `/api/team/settings` - Configurable thresholds
- `/api/team/audit-logs` - Immutable audit trail
- `/api/team/dashboard` - Metrics & activity

### Deployment Templates Feature - COMPLETE ✅ (Feb 9, 2026)
**Backend (15/15 tests passed):**
- `GET /api/config-manager/templates` - List all templates
- `GET /api/config-manager/templates/{id}` - Get specific template
- `POST /api/config-manager/templates` - Create custom template
- `POST /api/config-manager/templates/{id}/use` - Create deployment from template
- `DELETE /api/config-manager/templates/{id}` - Delete custom template (403 for system)

**System Templates (6 pre-configured):**
1. Black Friday Sale (promotion, 72h)
2. Holiday Season (seasonal, 168h)
3. Maintenance Mode (maintenance, 4h)
4. New Feature Rollout (feature, permanent)
5. Flash Sale Event (promotion, 24h)
6. Seller Onboarding Campaign (promotion, permanent)

**Frontend:**
- Templates tab in Config Manager with badge count
- Card grid displaying template name, category, description, config changes
- "Use Template" dialog with schedule picker and environment selector
- Auto-rollback settings display

### Schedule Deployment Dialog - VERIFIED COMPLETE
- All features confirmed working via testing agent (11/11 backend tests passed)
- Frontend dialog tested via playwright screenshots
- Background scheduler running via APScheduler
- Full end-to-end flow: Create → View → Execute → Rollback

---

## Upcoming: Future Enhancements

**Backlog:**
- Push notification A/B testing for images
- Real-time notification dashboard with WebSocket
- Deployment templates for common config changes
- Refactor large monolithic page components
- Advanced segment builder with drag-and-drop
- Notification performance benchmarks
- Data Privacy: PDF export format support
- Data Privacy: Country-specific privacy policy versions with automatic detection
- Data Privacy: Automated weekly/monthly compliance reports emailed to DPO
- Config Manager: WebSocket for real-time config updates across instances
- Config Manager: Config diff viewer for version comparison
- Config Manager: Background scheduler for automatic deployment execution

---

## Hierarchical Location System - COMPLETE ✅ (Feb 10, 2026)

### Overview
Comprehensive location system upgrade with hierarchical selection (Country → Region → District → City), structured location data storage, and client-side distance calculation for listing cards.

### Features Implemented:

**1. Location Data Seeding**
- Pre-seeded data for 13 countries:
  - Africa: Tanzania, Kenya, Uganda, South Africa, Nigeria, Ghana, Zambia, Zimbabwe
  - Europe: Germany, Netherlands
  - Americas: United States, Canada
  - Oceania: Australia
- Total: 13 countries, 55 regions, 79 districts, 130 cities
- Each city includes lat/lng coordinates for distance calculations
- Seed script: `/app/backend/seed_locations.py`

**2. Backend System (`/app/backend/location_system.py`)**
- MongoDB Collections:
  - `location_countries`: Country code, name, flag emoji
  - `location_regions`: Region data per country
  - `location_districts`: District data per region
  - `location_cities`: City data with lat/lng coordinates
- 2dsphere geospatial index on listings for nearby queries
- API Endpoints:
  - `GET /api/locations/countries` - All countries with flags
  - `GET /api/locations/regions?country_code=` - Regions for country
  - `GET /api/locations/districts?country_code=&region_code=` - Districts
  - `GET /api/locations/cities?country_code=&region_code=&district_code=` - Cities
  - `GET /api/locations/cities/search?country_code=&q=` - Search cities by name
  - `GET /api/locations/stats` - Statistics (13/55/79/130)
  - `GET /api/locations/nearby?lat=&lng=&radius_km=` - Nearby listings

**3. Listing Model Updates (`/app/backend/routes/listings.py`)**
- New `LocationData` model with structured fields:
  - country_code, region_code, district_code, city_code
  - city_name, region_name, district_name
  - lat, lng (coordinates)
  - location_text (formatted: "City, District, Region")
- `ListingCreate` and `ListingUpdate` updated with `location_data` field
- GeoJSON point creation for geospatial queries

**4. Frontend LocationPicker Component (`/app/frontend/src/components/LocationPicker.tsx`)**
- Modal-based hierarchical selection
- Step-by-step: Country → Region → District → City
- Search functionality for cities (min 2 characters)
- Breadcrumb navigation showing selection path
- Flag emojis for countries
- data-testid attributes for testing
- Props: value, onChange, placeholder, error, disabled, showGpsOption

**5. ListingCard Distance Display (`/app/frontend/src/components/ListingCard.tsx`)**
- Haversine formula for accurate distance calculation
- Distance badge showing "Xkm away" or "Xm away" (if <1km)
- Uses listing.location_data.lat/lng and userLocation prop
- Displays city name from location_data or falls back to text location

**6. Post Listing Integration (`/app/frontend/app/post/index.tsx`)**
- LocationPicker replaces text input for location field
- locationData state for structured location storage
- location_data included in listing submission
- Pre-fill support for edit mode

**7. Frontend API Client (`/app/frontend/src/utils/api.ts`)**
- `locationsApi` object with methods:
  - getCountries(), getRegions(), getDistricts(), getCities()
  - searchCities(countryCode, query, limit)
  - getCity(), getStats(), getNearby()

### Testing Results: 17/17 backend tests passed (100%)

### Files Created/Modified:
- Created: `/app/backend/location_system.py`
- Created: `/app/backend/seed_locations.py`
- Created: `/app/frontend/src/components/LocationPicker.tsx`
- Modified: `/app/backend/routes/listings.py` (LocationData model)
- Modified: `/app/backend/server.py` (location router integration)
- Modified: `/app/frontend/src/utils/api.ts` (locationsApi)
- Modified: `/app/frontend/src/components/ListingCard.tsx` (distance display)
- Modified: `/app/frontend/src/types/index.ts` (LocationData interface)
- Modified: `/app/frontend/app/post/index.tsx` (LocationPicker integration)

---

## "Near Me" Filter & GPS Location - COMPLETE ✅ (Feb 10, 2026)

### Overview
Added "Near Me" toggle filter on home page that uses GPS location to show nearby listings with distance badges.

### Features Implemented:

**1. Location Context (`/app/frontend/src/context/LocationContext.tsx`)**
- LocationProvider wraps entire app in `_layout.tsx`
- Manages `userLocation` state (lat, lng, timestamp, city, country)
- `nearMeEnabled` toggle state
- `searchRadius` state (5-100km, default 50km)
- `requestLocation()` triggers GPS permission prompt
- 30-minute location caching in AsyncStorage
- Reverse geocoding for city/country names

**2. Near Me Toggle Button**
- Home Page: Blue chip button next to "All Locations" dropdown
- Click triggers GPS permission request (user preference 1b)
- Active state: Blue background (#1976D2) with white text
- Loading indicator during location fetch
- Clear button clears both category and Near Me filters

**3. Radius Selector (`/app/frontend/src/components/RadiusSelector.tsx`)**
- Shows when Near Me is active
- **Preset Buttons**: Quick select - 5km, 10km, 25km, 50km, 100km
- **Slider**: Fine-tuning from 5km to 100km
- Modal interface with current radius display
- Radius cached in AsyncStorage

**4. Distance Badge on Listing Cards**
- Haversine formula for accurate distance calculation
- Format: "Xkm away" or "Xm away" (if <1km)
- Blue badge (#E3F2FD background, #1976D2 text)
- Only shows when user has granted location permission

**5. userLocation Prop**
- `ListingCard` component accepts optional `userLocation` prop
- Home page passes `userLocation` from context to all cards
- Search page also passes `userLocation` to cards

**6. Nearby Listings API**
- `GET /api/locations/nearby?lat=&lng=&radius_km=50`
- Uses MongoDB 2dsphere geospatial index
- Returns listings sorted by distance within radius

### User Preference Implementation:
- **1b**: GPS permission requested only when user taps "Near Me" (not on app launch)
- **2c**: Near Me toggle available on both home page (header) and search page

### Testing: 100% (32/32 backend, 100% frontend)

---

## Admin Location Manager - COMPLETE ✅ (Feb 10, 2026)

### Overview
Admin dashboard page for CRUD operations on location data (countries, regions, districts, cities).

### Admin Dashboard UI: `/app/admin-dashboard/frontend/src/app/locations/page.tsx`

### Features:
- **Stats Cards**: Visual display of counts (13 countries, 55 regions, 79 districts, 130 cities)
- **Hierarchical Navigation**: Breadcrumbs for Country → Region → District → City
- **Data Tables**: List view with click-to-drill-down navigation
- **CRUD Operations**:
  - Add new country/region/district/city
  - Edit existing location
  - Delete location (with confirmation)
- **Form Dialogs**: 
  - Country: code, name, flag emoji
  - Region: region_code, name
  - District: district_code, name
  - City: city_code, name, lat, lng

### Backend API Endpoints (`/app/backend/location_system.py`):
- `POST /admin/locations/countries` - Create country
- `PUT /admin/locations/countries/{code}` - Update country
- `DELETE /admin/locations/countries/{code}` - Delete country (cascades to regions/districts/cities)
- Same pattern for regions, districts, cities
- All endpoints require admin authentication

---

## GPS Onboarding - COMPLETE ✅ (Feb 10, 2026)

### Overview
Location permission prompt shown after user registration to enable Near Me features.

### Component: `/app/frontend/src/components/LocationOnboarding.tsx`

### Flow:
1. User registers via Google OAuth
2. After successful session exchange, `LocationOnboarding` modal appears
3. Shows benefits: Near Me Filter, Distance Info, Local Sellers
4. "Enable Location" button triggers GPS permission
5. "Maybe Later" option to skip
6. Success/Skipped states with auto-redirect to home

### Integration:
- Integrated in `/app/frontend/app/register.tsx`
- Shows only once (tracked via `@location_onboarding_shown` in AsyncStorage)
- Checks `checkLocationOnboardingShown()` before displaying

---


## Save Location Feature - COMPLETE ✅ (Feb 10, 2026)

### Overview
Users can save a default location in settings that automatically pre-fills when posting new listings.

### Features Implemented:

**1. Backend API Endpoints (`/app/backend/routes/users.py`)**
- `GET /api/users/me/location` - Get user's default location
- `PUT /api/users/me/location` - Save/update/clear default location
- Both endpoints require authentication (return 401 if not logged in)
- Location stored in `users.default_location` field

**2. Settings Page Location Section (`/app/frontend/app/settings.tsx`)**
- "Default Location" option in settings sidebar
- LocationPicker component for hierarchical selection
- Shows current saved location or "Not set"
- "Clear Default Location" button to remove saved location
- Visual feedback during save operation

**3. Post Listing Pre-fill (`/app/frontend/app/post/index.tsx`)**
- Automatically loads user's default location for new listings
- Pre-fills `locationData` and `location` fields
- Only applies to new listings (not edit mode)
- User can override the pre-filled location

### User Flow:
1. User goes to Settings → Default Location
2. Selects location using hierarchical picker (Country → Region → District → City)
3. Location is saved to their profile
4. When creating new listing, location is auto-filled
5. User can change or keep the default location


## All Locations Button Integration - COMPLETE ✅ (Feb 10, 2026)

### Overview
Connected the "All Locations" header button to the new hierarchical LocationPicker instead of the old simple city dropdown.

### Changes Made:

**1. Home Page Modal (`/app/frontend/app/(tabs)/index.tsx`)**
- Replaced old city list modal with new LocationPicker-based modal
- Modal uses `presentationStyle="pageSheet"` for full-page experience
- Shows hint text explaining hierarchical selection flow
- "All Locations" option with checkmark to reset filter
- `selectedLocationFilter` state tracks hierarchical selection

**2. Location Filter Integration**
- `handleLocationSelect(location: LocationData)` - Sets filter and updates button text
- `handleClearLocationFilter()` - Resets to "All Locations"
- `fetchData()` updated to filter listings by selected location
- Dependencies updated: `selectedLocationFilter` triggers data refresh

**3. User Flow**
1. Click "All Locations" in header
2. Modal opens with "Browse locations..." picker
3. Select Country → Region → District → City
4. Modal closes, header shows selected city name
5. Listings are filtered by selected location
6. Click "All Locations" in modal to reset

### Testing: 100% (6/6 frontend features verified)
- All 13 countries with flags
- Hierarchical drill-down (Germany→Bavaria→Munich, Kenya→Nairobi→Westlands)
- Header button updates after selection


## Recent Locations Feature - COMPLETE ✅ (Feb 10, 2026)

### Overview
Added "Recent Locations" section in LocationPicker showing the last 5 selected locations for quick access.

### Features Implemented:

**1. Storage Layer (`/app/frontend/src/components/LocationPicker.tsx` lines 24-47)**
- Cross-platform Storage helper for web/native compatibility
- Uses localStorage on web, AsyncStorage on native
- Key: `@recent_locations`

**2. Recent Locations Logic (lines 82-148)**
- `loadRecentLocations()` - Loads from storage on mount
- `saveRecentLocation()` - Saves to storage, removes duplicates, limits to 5
- `handleRecentLocationSelect()` - Quick-select from recent list
- Newest locations appear first
- Duplicates are removed based on unique location key

**3. Recent Locations UI (lines 500-530)**
- Gray background section at top of country selection step
- "RECENT LOCATIONS" title with uppercase styling
- Each item shows:
  - Clock icon (time-outline)
  - City name + location_text subtitle
  - Chevron forward icon
- Divider below section

### Bug Fix Applied
- **Issue**: AsyncStorage not working on Expo Web (SSR environment)
- **Solution**: Platform-aware Storage helper that uses localStorage for web

### Testing: 100% (5/5 features verified)

---

---



## Backend Location Filter Enhancement - COMPLETE ✅ (Feb 10, 2026)

### Overview
Enhanced the listings API to support filtering by hierarchical location codes for more precise location filtering.

### Backend Changes (`/app/backend/routes/listings.py` lines 244-320)

**New Query Parameters:**
- `country_code` - Filter by country (e.g., TZ, KE, US)
- `region_code` - Filter by region (e.g., DSM, NAI)
- `district_code` - Filter by district (e.g., KIN, ILA)
- `city_code` - Filter by city (e.g., MIK, KIM)

**Filter Logic:**
- Codes are converted to uppercase for case-insensitive matching
- Filters on `location_data.country_code`, `location_data.region_code`, etc.
- Supports any combination of codes (country only, country+region, etc.)
- Falls back to text search on `location` field when no codes provided
- Text search also checks `location_data.city_name` and `location_data.location_text`

### Frontend Changes

**API Client (`/app/frontend/src/utils/api.ts` lines 106-109):**
- `listingsApi.getAll` accepts country_code, region_code, district_code, city_code params

**Home Page (`/app/frontend/app/(tabs)/index.tsx` lines 493-560):**
- `fetchData` builds locationParams from selectedLocationFilter
- Passes hierarchical codes when available, falls back to text location

### Testing: 100% (15/15 backend tests passed)
- Test file: `/app/backend/tests/test_location_filter.py`
- Verified with Kijitonyama apartment listing (TZ/DSM/KIN/KIM)

---
### Testing: 100% (7/7 backend tests passed)

---



## Test Listings Seed Script - COMPLETE ✅ (Feb 10, 2026)

### Overview
Created a seed script to populate test listings with complete location_data across all 13 countries.

### Script: `/app/backend/seed_test_listings.py`

### Features:
- **21 sample listings** with full location_data
- **13 countries covered**: TZ (3), KE (2), US (2), DE (2), CA (2), ZA (2), AU (2), NG (2), GH (1), ZM (1), NL (1), UG (1), ZW (1)
- **Various categories**: properties, auto, electronics, home, fashion, sports
- **Complete location_data**: country_code, region_code, district_code, city_code, city_name, lat, lng, location_text
- **GeoJSON geo_point** for geospatial queries
- **Duplicate detection**: Skips existing listings based on title + city_code
- **Default seller**: Creates `seed_seller_001` user if not exists

### Sample Listings Include:
- Apartments (Mikocheni, Karen)
- Cars (Msasani, Pretoria)
- Phones (Westlands, Victoria Island)
- Furniture (Berlin Mitte, Vancouver)
- Sports equipment (Bondi, Toronto)
- Electronics (Manhattan, Sandton)
- And more...

### Usage:
```bash
cd /app/backend && python seed_test_listings.py
```

### Verification:
- `GET /api/listings?country_code=KE` → 2 Kenya listings
- `GET /api/listings?country_code=DE` → 2 Germany listings
- `GET /api/listings?country_code=ZA&region_code=GT` → 2 Gauteng listings

---

## Admin Location Manager & Radius Update - COMPLETE ✅ (Feb 10, 2026)

### Overview
Fixed admin dashboard sidebar to show Location Manager link and updated the Near Me radius slider max to 250km.

### Changes Made:

**1. Admin Sidebar Navigation Fix (`/app/admin-dashboard/frontend/src/app/dashboard/layout.tsx` line 89)**
- Added "Location Manager" entry to menuItems array with Place icon
- Path: `/dashboard/locations`
- Displays between "Attributes" and "Users" in sidebar

**2. Admin Location API Routes (`/app/backend/server.py` lines 4403-4570)**
- Added explicit routes BEFORE the catch-all admin proxy to handle location endpoints locally
- Read endpoints (GET):
  - `/api/admin/locations/stats` - Returns {countries, regions, districts, cities}
  - `/api/admin/locations/countries` - Returns all countries with flags
  - `/api/admin/locations/regions` - Returns regions for a country
  - `/api/admin/locations/districts` - Returns districts for a region
  - `/api/admin/locations/cities` - Returns cities for a district
- Write endpoints (POST/PUT/DELETE):
  - POST `/api/admin/locations/countries` - Add country
  - POST `/api/admin/locations/regions` - Add region
  - POST `/api/admin/locations/districts` - Add district
  - POST `/api/admin/locations/cities` - Add city
  - PUT/DELETE for countries, regions, districts, cities

**3. Frontend API Response Handling (`/app/admin-dashboard/frontend/src/app/dashboard/locations/page.tsx`)**
- Fixed API response handling (api client already returns data, not response.data)
- Functions updated: loadStats, loadCountries, loadRegions, loadDistricts, loadCities

**4. Near Me Radius Slider Max to 250km (`/app/frontend/src/components/RadiusSelector.tsx`)**
- Updated PRESET_RADII from [5, 10, 25, 50, 100] to [5, 10, 25, 50, 100, 150, 250]
- Updated slider maximumValue from 100 to 250
- Updated slider label from "100km" to "250km"

### Location Manager UI Features:
- **Stats Cards**: Shows 13 Countries, 55 Regions, 79 Districts, 130 Cities
- **Tabbed Interface**: Countries → Regions → Districts → Cities (hierarchical drill-down)
- **Country Table**: Displays flags, codes (AU, CA, DE, etc.), and names
- **Action Buttons**: View children (arrow), Edit (pencil), Delete (trash)
- **Add Buttons**: Add Country, Add Region, Add District, Add City at each level
- **Breadcrumb Navigation**: Shows path through hierarchy (e.g., Tanzania > Dar es Salaam > Kinondoni)

### Testing: 100% (8/8 verified features)
- Location Manager link in sidebar: PASSED
- Location stats display: PASSED
- Countries table: PASSED
- Add Country button: PASSED
- Country drill-down to regions: PASSED
- API /api/admin/locations/stats: PASSED
- API /api/admin/locations/countries: PASSED
- RadiusSelector max 250km: PASSED (code verification)

### Admin Credentials:
- URL: `/api/admin-ui`
- Email: `admin@marketplace.com`
- Password: `Admin@123456`

---
