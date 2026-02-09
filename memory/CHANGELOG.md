# Changelog

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
