# Changelog

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
