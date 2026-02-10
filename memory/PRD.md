# Product Requirements Document - Avida Marketplace

## Original Problem Statement
Build a local marketplace application (Avida) with:
1. Location-based filtering (Country > Region selection)
2. Business Profile feature for verified sellers
3. Premium subscription tiers with payment integration

## What's Been Implemented

### 2026-02-10: Complete Subscription Backend
**COMPLETED**

#### Subscription Services Integration
- Invoice API endpoints (GET /api/invoices, GET /api/invoices/{id}, GET /api/invoices/{id}/html, POST /api/invoices/create/{transaction_id})
- Background task for checking expiring subscriptions (runs every 6 hours)
- Email notification integration with SendGrid for:
  - Premium activation confirmation
  - Subscription expiration reminders (7 days and 1 day before)
  - Premium expired notifications
- Invoice generation with HTML rendering

#### Frontend Payment Options
- PayPal checkout button (requires PayPal SDK for native)
- M-Pesa payment modal with phone number input
- Updated payment section with "or pay with" divider

### 2026-02-10: Complete Frontend UI for All Features
**COMPLETED**

#### Premium Subscription Purchase Flow
- Package selection cards (Monthly $29.99, Quarterly $79.99, Yearly $249.99)
- Stripe checkout integration with redirect
- PayPal and M-Pesa payment buttons added
- M-Pesa modal for phone number entry
- Success page (`/premium/success`) with payment verification
- Shows benefits and expiration date after successful purchase
- "Upgrade to Premium" button appears for verified (non-premium) profiles

#### Gallery Manager UI
- Image gallery with upload button (max 20 images, 5MB each)
- Horizontal scrollable image preview with delete option
- Video gallery with YouTube/Vimeo URL input
- Video thumbnails with title and delete option
- Expandable section to save space

#### Social Links Editor
- All platforms: Facebook, Instagram, Twitter/X, LinkedIn, YouTube, TikTok, WhatsApp, Website
- Color-coded icons for each platform
- Expandable section with collapsible header

#### Cover Image Upload
- 1200x400 banner preview area
- Upload/change cover button
- Displays above logo section

#### Admin UI Page (`/admin/business-profiles`)
- Stats overview: Total, Pending, Verified, Premium counts
- Search by name or identifier
- Filter tabs: All, Pending, Verified, Premium
- Profile cards with:
  - Logo, name, identifier, location, stats
  - Verification badges (Pending/Verified/Premium)
  - Owner information
  - Action buttons: Approve, Reject, Upgrade Premium, Revoke Premium, Activate/Deactivate

### Earlier Backend Features (Same Session)
- Stripe/PayPal/M-Pesa payment integration
- Gallery API endpoints
- Social links support
- Region coordinates
- Verification tiers system
- Featured sellers endpoint

## New Frontend Pages Created

### `/app/frontend/app/business/edit.tsx`
Complete business profile editor with:
- Cover image section
- Logo upload
- Basic info (name, description, categories, contact)
- Social links section (expandable)
- Gallery section (expandable)
- Premium upgrade section (for verified profiles)
- Verification status banner
- Multiple payment options (Stripe, PayPal, M-Pesa)

### `/app/frontend/app/admin/business-profiles.tsx`
Admin management page with:
- Stats dashboard
- Search and filter
- Profile list with action buttons
- Approve/Reject verification
- Upgrade/Revoke premium
- Activate/Deactivate profiles

### `/app/frontend/app/premium/success.tsx`
Payment success page with:
- Payment verification
- Benefits list
- Expiration date display
- Navigation to profile

## API Endpoints Summary

### Premium Subscription
- `GET /api/premium-subscription/packages`
- `POST /api/premium-subscription/stripe/checkout`
- `GET /api/premium-subscription/stripe/status/{session_id}`
- `POST /api/premium-subscription/paypal/checkout`
- `POST /api/premium-subscription/paypal/capture/{transaction_id}`
- `POST /api/premium-subscription/mpesa/stk-push`
- `GET /api/premium-subscription/my-subscription`

### Invoices
- `GET /api/invoices` - Get user's invoices
- `GET /api/invoices/{invoice_id}` - Get specific invoice
- `GET /api/invoices/{invoice_id}/html` - Get invoice as HTML
- `POST /api/invoices/create/{transaction_id}` - Create invoice for transaction

### Business Profile Gallery
- `GET /api/business-profiles/me/gallery`
- `POST /api/business-profiles/me/gallery/image`
- `DELETE /api/business-profiles/me/gallery/image/{image_id}`
- `POST /api/business-profiles/me/gallery/video`
- `DELETE /api/business-profiles/me/gallery/video/{video_id}`

### Admin
- `GET /api/admin/business-profiles/`
- `GET /api/admin/business-profiles/stats/overview`
- `POST /api/admin/business-profiles/{id}/verify`
- `POST /api/admin/business-profiles/{id}/upgrade-premium`
- `POST /api/admin/business-profiles/{id}/revoke-premium`
- `POST /api/admin/business-profiles/{id}/toggle-active`
- `POST /api/admin/subscriptions/check-renewals` - Admin: manually trigger renewal checks

## Tech Stack
- Frontend: React Native + Expo (web), TypeScript
- Backend: Python FastAPI, MongoDB
- Payments: Stripe, PayPal, M-Pesa
- Storage: Base64 images in MongoDB
- Email: SendGrid for subscription notifications

## Status

### Completed ✅
- [x] Payment integration backend (Stripe, PayPal, M-Pesa)
- [x] Business profile verification tiers
- [x] Featured sellers section
- [x] Region coordinates
- [x] Gallery system (backend + frontend)
- [x] Social links (backend + frontend)
- [x] Cover image upload
- [x] Premium subscription UI with multiple payment options
- [x] Admin management page
- [x] Invoice API endpoints
- [x] Subscription auto-renewal background task
- [x] Email notifications for payment events (SendGrid)
- [x] My Invoices page in user profile section
- [x] SEO sitemap for business profiles (/api/sitemap.xml, /api/robots.txt)
- [x] Premium badge on invoices page for premium users
- [x] Share Profile feature with OG meta tags for social media preview
- [x] Success modal after saving business profile with profile URL
- [x] Image selection before profile save (uploaded after creation)
- [x] QR code generation in success modal for business profile sharing
- [x] Admin Users tab with sections: All Users, Verified Sellers, Verified Business, Premium Business
- [x] Email notifications for admin-initiated verification and premium upgrade
- [x] Notification preferences page with opt-in/out for email types
- [x] Push notification support with Firebase Cloud Messaging (FCM)
- [x] Voucher/Discount System (Amount, Percent, Credit types with rich restrictions)
- [x] Listing Moderation System (Validate/Reject/Remove with queue)
- [x] User Listing Limits (Tier-based with custom overrides)
- [x] Advanced SEO Meta Tags Management
- [x] URL Masking/Shortening with analytics
- [x] Polls, Surveys & Feedback System
- [x] Cookie Consent Management (GDPR)
- [x] reCAPTCHA Configuration (v2/v3/invisible)
- [x] WebP Image Conversion
- [x] Invoice PDF Generation

### 2026-02-10: Admin UI Pages for Vouchers & Listing Moderation
**COMPLETED**

#### Admin Voucher Management (`/dashboard/vouchers`)
- Stats cards: Total Vouchers, Active Vouchers, Total Redemptions, Total Discounts Given
- Voucher table with Code, Type, Value, Usage, Status, Valid Until columns
- Create voucher dialog with:
  - Code, Type (Amount/Percent/Credit), Value
  - Max uses, Max uses per user
  - Min order amount, Max discount amount
  - Valid until date
  - Restrictions: New users only, Verified only, Premium only, Stackable
- Edit voucher with all editable fields
- View voucher details with usage history
- Delete voucher with confirmation
- Status/Type filters
- **Bulk CSV Import** with template download

#### Admin Listing Moderation (`/dashboard/listing-moderation`)
- Three tabs: Moderation Queue, Moderation Log, Settings
- Moderation Queue:
  - Pending/Approved/Rejected filter
  - Bulk selection with checkboxes
  - Listing cards with image, title, user info, price
  - Quick actions: Approve, Reject, Remove
  - Bulk actions: Approve All, Reject All, Remove All
- Moderation Log:
  - History of all moderation actions
  - Admin email, action, reason, timestamp
- Settings Tab:
  - Enable Listing Moderation toggle
  - Require Moderation for New Listings
  - Auto-approve Verified Users
  - Auto-approve Premium Users
  - Default Tier selection
  - Tier limits configuration (Free, Basic, Premium)
  - Save Settings button

### 2026-02-10: Full Admin Tools Suite
**COMPLETED**

#### SEO Tools (`/dashboard/seo-tools`)
- **Meta Tags Tab**: Page-specific meta tags management (title, description, keywords, OG tags, robots)
- **Global Settings Tab**: Site name, description, Twitter handle, OG image, Google Analytics/GTM/FB Pixel IDs
- **Sitemap Tab**: Auto-generate toggle, include options (listings, categories, profiles), change frequency, regenerate button

#### Polls & Surveys (`/dashboard/polls-surveys`)
- Create feedback forms, surveys, and quick polls
- Support for app feedback and feature improvement collection
- Multiple question types: Text, Rating (1-5), Multiple Choice
- Target audience filtering (all/verified/premium users)
- Response export to JSON
- Active/Inactive toggle

#### Cookie Consent (`/dashboard/cookie-consent`)
- **Banner Settings**: Enable toggle, banner text, policy URLs, preference customization
- **Categories Tab**: Manage cookie categories (Necessary, Analytics, Marketing, Preferences)
- **Appearance Tab**: Position, theme, button text customization
- Statistics dashboard with consent tracking

#### URL Shortener (`/dashboard/url-shortener`)
- Create short URLs with custom codes
- Click tracking with analytics
- Stats cards: Total URLs, Active URLs, Total Clicks
- Expiration date support

#### reCAPTCHA (`/dashboard/recaptcha`)
- v2 Invisible configuration (as requested)
- Site key and secret key management
- Protected forms selection (Login, Register, Contact, Checkout, etc.)
- Score threshold for v3

#### Image Settings (`/dashboard/image-settings`)
- **WebP Conversion**: Auto-convert toggle, quality slider (10-100%)
- Max dimensions and thumbnail size configuration
- Allowed formats selection
- **Batch Conversion**: Convert existing listing/profile images to WebP
- Stats: Image counts by type

#### A/B Testing Framework (`/dashboard/ab-testing`)
- **Experiment Management**: Create, start, pause, stop experiments
- **Variant Configuration**: Multiple variants with traffic % allocation
- **Assignment Types**: Cookie-based (anonymous) + User-based (logged-in) with fallback
- **Experiment Types**: Feature flags, Cookie banner, Polls, CTA buttons, UI elements
- **Goal Metrics Tracked**:
  - Conversion rates
  - Click-through rates
  - Consent rates
  - Custom events
- **Statistical Analysis**: Automatic significance calculation (z-test)
- **Results Dashboard**: Per-variant stats, improvement %, winner declaration
- **Smart Winner (Auto-Detection)**:
  - Enable per experiment to auto-detect winners
  - Strategies: Notify Only (default), Auto-Rollout, Gradual Rollout
  - Configurable minimum runtime (default 48 hours)
  - "Check Winners" button for manual trigger
  - Admin notification when significant winner is found
  - Safeguards: Minimum sample size, minimum runtime
  - **Scheduled Auto-Checking**: Background job runs every 6 hours (configurable via `AB_CHECK_INTERVAL_HOURS` env var)
  - Scheduler status indicator shows last check time and next check
  - Logs all checks to `scheduled_jobs_log` collection
  - **Email Notifications**: Configurable recipient email list per experiment for winner alerts via SendGrid
- **Public APIs**: `/api/ab/assign` for variant assignment, `/api/ab/track` for event tracking

### 2026-02-10: A/B Testing Email Notifications & Session Fix
**COMPLETED**

#### A/B Test Winner Email Notifications
- Added notification emails input field in the A/B test creation dialog (Smart Winner section)
- Admins can specify comma-separated email addresses to receive alerts when a winner is found
- Emails are parsed and stored as an array in the experiment's smart_winner.notification_emails config
- Backend sends emails via SendGrid when winner is detected (manual trigger or scheduled check)

#### Admin Session Timeout Fix
- Increased JWT_ACCESS_TOKEN_EXPIRE_MINUTES from 30 to 480 (8 hours)
- Prevents frequent re-authentication during admin sessions

### 2026-02-10: Credits Page Design Improvements
**COMPLETED**

#### Mobile App Improvements
- Added package selection highlighting with visual feedback (blue border, shadow, checkmark icon)
- Package cards show "Select" button that changes to "Purchase Now" when selected
- Improved button styling with gray for unselected, green for selected packages
- Added spring animation effect when selecting a package (scale bounce)

#### Desktop Layout Improvements
- Added 1280px max-width constraint for desktop view (viewport >= 768px)
- Content is now centered on wide screens
- Improved payment method grid layout for desktop
- Packages displayed in a responsive flex row on desktop
- Info items displayed in a responsive row on desktop

#### Savings Comparison Feature
- "SAVE X%" badge displayed on larger packages (pink badge with trending-down icon)
- Save amount shown below price (e.g., "Save $2.00", "Save $10.00")
- Price per credit displayed for each package (e.g., "$0.100 per credit")
- Savings calculated by comparing to the base (smallest) package

#### Desktop Profile Enhancements
- Added "Credits & Boosts" section in Desktop Profile (authenticated users only)
- "Buy Credits" button with wallet icon - navigates to /credits
- "Boost Listings" button with rocket icon - navigates to /profile/my-listings
- Section appears between "Your Activity" and "Trust & Identity" sections

### Future/Backlog
- [ ] SMS Notifications for A/B Test Winners (Twilio integration)
- [ ] PayPal SDK button integration on native platforms
- [ ] M-Pesa callback handling in production (Safaricom API)
- [ ] End-to-end user flow test (create -> verify -> premium upgrade)
- [ ] Region search bar visibility fix in LocationPicker

## Testing Status
- Backend: 100% (All tests passed)
- Frontend: 100% (All UI flows verified)
- Test reports: `/app/test_reports/iteration_70.json` (Vouchers & Moderation)

## Key Admin UI Pages
- `/app/admin-dashboard/frontend/src/app/dashboard/vouchers/page.tsx` - Voucher management
- `/app/admin-dashboard/frontend/src/app/dashboard/listing-moderation/page.tsx` - Listing moderation

## Email Notifications
The system now sends the following emails (via SendGrid):
- **profile_verified**: When admin approves a business profile verification
- **profile_verification_rejected**: When admin rejects a verification with reason
- **admin_premium_upgrade**: When admin upgrades a profile to premium
- **premium_activated**: When user pays for premium subscription
- **renewal_reminder**: 7 days and 1 day before premium expiration
- **subscription_expired**: When premium subscription expires

**Note:** All non-transactional emails respect user notification preferences. Users can opt-out via `/profile/notifications`.

## Push Notifications (FCM)
Push notification support via Firebase Cloud Messaging:
- **Backend**: `/app/backend/push_notification_service.py` - Device token management, FCM integration
- **Frontend**: `/app/frontend/src/utils/pushNotifications.ts` - Expo notifications utility
- **API Endpoints**:
  - `POST /api/push/register-token`: Register device push token
  - `DELETE /api/push/unregister-token`: Unregister device token
  - `GET /api/push/status`: Get push notification status
  - `POST /api/push/test`: Send test notification
  - `GET /api/push/templates`: Get available templates
  - `POST /api/admin/push/send`: Admin bulk push endpoint
- **Templates**: new_message, order_confirmed, profile_verified, profile_rejected, premium_activated, premium_expiring, listing_sold, price_drop, promotion

**Setup Required:**
1. Create Firebase project at https://console.firebase.google.com
2. Download service account JSON and save to `/app/backend/secrets/firebase-admin.json`
3. Or set `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable with JSON string

## Notification Preferences API
- `GET /api/notification-preferences`: Get user's preferences
- `PUT /api/notification-preferences`: Update preferences
- `POST /api/notification-preferences/unsubscribe-all`: Unsubscribe from marketing
- `GET /api/notification-preferences/categories`: Get preference categories with descriptions

## Key Files Reference
- `/app/frontend/app/business/edit.tsx` - Full business profile editor with payment buttons
- `/app/frontend/app/admin/business-profiles.tsx` - Admin management
- `/app/frontend/app/premium/success.tsx` - Payment success page
- `/app/frontend/app/profile/invoices.tsx` - My Invoices page
- `/app/backend/premium_subscription_system.py` - Payment integration
- `/app/backend/subscription_services.py` - Email, Auto-Renewal, Invoices
- `/app/backend/business_profile_system.py` - Gallery & profiles

## Environment Variables
```
STRIPE_API_KEY=sk_test_xxx (configured)
PAYPAL_CLIENT_ID=xxx (optional)
MPESA_CONSUMER_KEY=xxx (optional)
MPESA_CONSUMER_SECRET=xxx (optional)
SENDGRID_API_KEY=xxx (configured)
```
