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

