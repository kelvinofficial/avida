# Product Requirements Document - Avida Marketplace

## Original Problem Statement
Build a local marketplace application (Avida) with:
1. Location-based filtering (Country > Region selection)
2. Business Profile feature for verified sellers
3. Premium subscription tiers with payment integration

### 2026-02-11: Modular Routes Wired into Server
**COMPLETED**

#### Route Integration
- Wired new modular route files (`badges.py`, `streaks.py`, `challenges.py`) into `server.py`
- Routes are now loaded via factory functions with proper dependency injection:
  - `create_badges_router(db, require_auth)` - Badge progress, showcase, unviewed count, milestones, leaderboard
  - `create_streaks_router(db, require_auth)` - User streak info, streak leaderboard
  - `create_challenges_router(db, require_auth)` - Challenge listing, joining, progress tracking
- All routes verified working via API tests

#### DesktopHeader Component Enhanced
- Enhanced `/app/frontend/src/components/layout/DesktopHeader.tsx` with:
  - Badge notification icon with unviewed count (purple badge)
  - General notification icon with unread count (red badge)
  - Auto-fetching of credit balance, badge count, and notification count
  - `showSearch`, `currentCity`, `onLocationPress` props for customization
  - Navigation links with active state highlighting

### 2026-02-11: Desktop Header Consistency & Badge Celebrations
**COMPLETED**

#### Desktop Header Standardization (P0)
- Fixed desktop header for authenticated users across all pages
- Homepage (`/app/frontend/app/(tabs)/index.tsx`): Now displays nav links (My Listings, Messages, Saved, Offers) and Credit Balance
- Profile page (`/app/frontend/app/(tabs)/profile.tsx`): Consistent header with same nav links and Credit Balance
- Fixed credit balance API endpoint from `/api/credits/balance` to `/api/boost/credits/balance`
- Fixed environment variable usage from `EXPO_PUBLIC_API_URL` to `EXPO_PUBLIC_BACKEND_URL`

#### Desktop Profile "My Activity" Section (P0)
- Verified correct items displayed: My Badges, Business Profile, Invoices & Receipts, Purchases, Sales, Recently Viewed

#### Badge Celebration Modal (P1)
- Badge celebration context and modal component already existed
- Added trigger logic in `my-listings.tsx` for mark-sold action - shows celebration when badges are earned
- Added trigger logic in `post/index.tsx` for listing creation - checks for new badges after async award (2s delay)
- Celebrations show confetti animation and badge details when users earn new badges

### 2026-02-11: Badge Notification Bell & Header Layout
**COMPLETED**

#### Badge Notification Feature
- Added backend endpoints:
  - `GET /api/badges/unviewed-count` - Returns count of badges user hasn't viewed
  - `POST /api/badges/mark-viewed` - Marks badges as viewed (all or specific badge_ids)
- Added `is_viewed` field tracking to user_badges collection
- Frontend fetches unviewed badge count when authenticated
- Badge notification icon (medal-outline) displays purple badge count when user has unviewed badges
- Badges page (`/profile/badges`) automatically marks badges as viewed when loaded

#### Header Layout Update
- Moved nav links (My Listings, Messages, Saved, Offers) to the right side of the header near the action icons
- Nav links are now positioned before the Credits/Badge/Notifications group with a vertical divider separator
- Logo remains on the left side with flexible spacer pushing everything else right

### 2026-02-11: Badge Milestone Notifications
**COMPLETED**

#### Milestone System
- **Backend Endpoints:**
  - `GET /api/badges/milestones` - Returns user's achieved, pending, and new (unacknowledged) milestones
  - `POST /api/badges/milestones/acknowledge` - Marks a milestone as seen/acknowledged
  - `GET /api/badges/share/{user_id}` - Public endpoint for shareable badge profiles
- **Milestone Types:**
  - Count-based: First Badge (1), Badge Collector (5), Achievement Hunter (10), Badge Master (25), Legend Status (50)
  - Special badges: First Listing, First Sale, Active Seller, Top Seller, Trusted Member, Veteran
- **Frontend Implementation:**
  - `MilestoneNotificationModal` component with confetti animation, celebratory styling, and share functionality
  - `MilestoneContext` provider manages milestone state and auto-shows modals for new achievements
  - Share button allows users to copy achievement link or share via native share sheet
  - Auto-triggered after earning badges (listing creation, mark-sold actions)

### 2026-02-11: Badge Leaderboard, Social Sharing & Push Notifications
**COMPLETED**

#### Badge Leaderboard
- **Backend Endpoints:**
  - `GET /api/badges/leaderboard` - Paginated leaderboard showing top badge earners with badge counts and showcase badges
  - `GET /api/badges/leaderboard/my-rank` - Authenticated endpoint returning user's rank, percentile, and nearby competitors
- **Frontend Page (`/leaderboard`):**
  - Hero section with trophy icon and competition encouragement
  - "Your Ranking" card showing rank, badge count, percentile, and nearby users
  - Leaderboard list with gold/silver/bronze styling for top 3
  - Current user highlighting and pagination support
  - Share button to share leaderboard link

#### Social Sharing with Open Graph
- **Backend Enhancement:**
  - `GET /api/badges/share/{user_id}` now returns `og_meta` object with title, description, type, and URL
  - User rank included in shareable profile
- **Frontend Page (`/profile/{id}/badges`):**
  - Shareable badge profile page with Open Graph meta tags via expo-router/head
  - Profile card showing user's badges, rank, and showcase badges
  - CTA for non-authenticated users to join
  - Link to badge leaderboard

#### Push Notifications for Milestones
- **Backend Functions:**
  - `send_milestone_push_notification()` - Sends push notification with emoji-based titles based on milestone type
  - `check_and_notify_new_milestones()` - Checks for new milestones and triggers push notifications
- **Note:** Push notifications require Firebase/Expo push token configuration to send actual notifications

### 2026-02-11: Badge Challenges System
**COMPLETED**

#### Challenge Types
- **Weekly Challenges (reset every Monday):**
  - Weekend Warrior - List 5 items during Saturday-Sunday (25 pts)
  - Weekly Sales Star - Sell 3 items this week (30 pts)
  - Listing Sprint - Create 10 listings this week (35 pts)
- **Monthly Challenges (reset on 1st of each month):**
  - Monthly Top Seller - Sell 15 items this month (100 pts)
  - Inventory King - List 30 items this month (75 pts)
  - High Roller Month - Achieve €500 in total sales (150 pts)
  - Community Connector - Send 50 messages to buyers (50 pts)

#### Backend Implementation
- **Endpoints:**
  - `GET /api/challenges` - List all active challenges with user progress
  - `GET /api/challenges/{id}` - Challenge details with leaderboard
  - `POST /api/challenges/{id}/join` - Join a challenge (required to appear on leaderboard)
  - `GET /api/challenges/my-progress` - User's progress on all challenges
- **Features:**
  - Auto-calculates progress based on user activity within challenge period
  - Challenge participants leaderboard
  - Auto-awards limited-time badge upon completion
  - Push notification when challenge completed

#### Frontend Implementation (`/challenges`)
- Hero section with flag icon and competition encouragement
- Separate sections for weekly and monthly challenges
- Challenge cards with: name, description, progress bar, time remaining, join button, reward preview
- Challenge detail modal with: badge reward info, leaderboard, join button
- Link to badge leaderboard

### 2026-02-11: Seasonal/Event Challenges
**COMPLETED**

#### Seasonal Challenges Defined
- **Valentine's Special** (Feb 1-14): Sell 5 items in Fashion/Home categories → Valentine's Champion badge (+50 pts)
- **Spring Refresh Sale** (Mar 20-Apr 20): List 15 items in Home/Fashion → Spring Refresh Pro badge (+60 pts)
- **Summer Deals Festival** (Jun 21-Jul 31): Achieve €300 in sales → Summer Sales Star badge (+80 pts)
- **Back to School** (Aug 15-Sep 15): Sell 8 items in Electronics/Books → Back to School Hero badge (+70 pts)
- **Halloween Spooktacular** (Oct 15-31): List 10 items → Spooky Seller badge (+45 pts)
- **Black Friday Blitz** (Nov 20-30): Sell 10 items → Black Friday Champion badge (+100 pts)
- **Holiday Gift Giver** (Dec 1-25): Achieve €500 in sales → Holiday Hero badge (+120 pts)
- **New Year Fresh Start** (Jan 1-15): List 20 items → New Year Achiever badge (+75 pts)

#### Implementation Details
- Backend: `SEASONAL_CHALLENGES` definitions, `get_seasonal_challenge_period()`, `is_seasonal_challenge_active()`
- Category-based criteria: `CATEGORY_LISTINGS`, `CATEGORY_SALES` for filtering by product categories
- Frontend: "Seasonal Events" section at top with pink header and "LIMITED TIME" badge
- Seasonal challenges sorted first (featured), then weekly, then monthly

### 2026-02-11: Admin Challenge Management & Analytics Enhancement
**COMPLETED**

#### Admin Panel - Challenge Management
- **Endpoints:**
  - `GET /api/admin/challenges` - List custom challenges with participation stats
  - `POST /api/admin/challenges` - Create custom challenge with badge reward
  - `PUT /api/admin/challenges/{id}` - Update challenge
  - `DELETE /api/admin/challenges/{id}` - Soft delete challenge
  - `GET /api/admin/challenges/{id}/leaderboard` - Challenge leaderboard
  - `GET /api/admin/challenges/stats/overview` - Challenge statistics
- **Email Reminders:**
  - `GET /api/admin/challenges/reminders` - Get challenges ending soon
  - `POST /api/admin/challenges/{id}/send-reminder` - Send reminder emails to incomplete participants
  - Uses SendGrid for email delivery (requires SENDGRID_API_KEY)

#### Admin Panel - Leaderboard Management
- **Endpoints:**
  - `GET /api/admin/leaderboard` - Full badge leaderboard with admin controls
  - `GET /api/admin/leaderboard/user/{id}` - Detailed user badge info

#### Challenge Completion Streaks
- **Streak Tracking:**
  - `update_challenge_streak()` - Updates user streak on challenge completion
  - `check_and_award_streak_badges()` - Awards streak milestone badges
  - `GET /api/streaks/my-streak` - Get user's current streak info
- **Streak Badges:**
  - Hot Streak (3 completions) - 25 bonus points
  - On Fire (5 completions) - 50 bonus points
  - Unstoppable (10 completions) - 100 bonus points
- **Bonus System:** 10 points per streak level (max 100)

#### Past Seasonal Badges Gallery
- `GET /api/badges/past-seasonal` - Returns past seasonal badges with year filtering
- Shows earned count and user ownership status
- Admin: `GET /api/admin/badges/gallery` - Admin gallery view

#### Enhanced Analytics (Admin Dashboard)
- **Seller Analytics** (`/api/admin/analytics/sellers`):
  - Top sellers by revenue, active sellers, new sellers, growth trends, average metrics
- **Engagement Analytics** (`/api/admin/analytics/engagement`):
  - Messages, favorites, active users, badge engagement, notification read rates
- **Platform Analytics** (`/api/admin/analytics/platform`):
  - User stats, listing stats, revenue, category breakdown, support ticket counts
- **Settings Endpoints:**
  - `/api/admin/settings/seller-analytics` - Seller analytics configuration
  - `/api/admin/settings/engagement-notifications` - Engagement notification settings

### 2026-02-11: Admin Dashboard & Streak Leaderboard UI Implementation
**COMPLETED**

#### User-Facing Streak Leaderboard (`/streak-leaderboard`)
- **Frontend Page:**
  - `/app/frontend/app/(tabs)/streak-leaderboard.tsx`
  - Hero section with flame icon and "Challenge Streaks" title
  - Streak Bonuses info card showing tier thresholds (3+: +25 pts, 5+: +50 pts, 7+: +75 pts, 10+: +100 pts)
  - "Your Streak" card with current/best/total stats (for authenticated users)
  - "Top Streakers" leaderboard with rank, name, streak badge, and stats
  - Empty state for no streaks
  - CTA for non-authenticated users
  - Link to active challenges
- **API Integration:**
  - `GET /api/streaks/leaderboard` - Public leaderboard endpoint
  - `GET /api/streaks/my-streak` - User's streak info (authenticated)

#### Admin Challenge Management UI (`/admin/challenges`)
- **Frontend Page:**
  - `/app/frontend/app/admin/challenges.tsx`
  - Stats cards: Total, Active, Participants, Completions
  - Filter tabs: All, Active, Ended
  - Challenge cards with icon, name, description, type badge, target, dates
  - Actions: Edit, Send Reminder, Delete
  - Create/Edit modal with full form:
    - Name, Description, Type (Weekly/Monthly/Seasonal/Custom)
    - Target, Criteria Type (Listings/Sales/Revenue/Messages/Category-specific)
    - Start/End dates, Icon selector, Color selector
    - Badge reward settings (name, description, points)
    - Category restrictions for category-specific challenges

#### Admin Analytics Dashboard UI (`/admin/analytics`)
- **Frontend Page:**
  - `/app/frontend/app/admin/analytics.tsx`
  - Three tabs: Overview, Sellers, Engagement
  - **Overview Tab:**
    - Platform stats cards (Users, Listings, Transactions, Revenue)
    - Category Performance breakdown
  - **Sellers Tab:**
    - Seller metrics (Active, New, Avg Revenue, Avg Listings)
    - Top Sellers list with revenue, sales, listings
  - **Engagement Tab:**
    - Engagement stats (Messages, Favorites, Badges, Challenges)
    - Notification Performance with read rate progress bar
    - Quick Actions to other admin pages
- **API Integration:**
  - `GET /api/admin/analytics/platform`
  - `GET /api/admin/analytics/sellers`
  - `GET /api/admin/analytics/engagement`

#### Admin Index Page Updates (`/admin`)
- Added Challenges card with flag icon
- Added Analytics card with bar-chart icon
- 2x2 grid layout for navigation cards

### 2026-02-11: Past Seasonal Badges Gallery & Category Requirements Display
**COMPLETED**

#### Seasonal Badge Gallery (`/badges/seasonal-gallery`)
- **Frontend Page:**
  - `/app/frontend/app/badges/seasonal-gallery.tsx`
  - `/app/frontend/app/badges/_layout.tsx` - Layout file for badges routes
  - Hero section with sparkles icon
  - Year filter for browsing by year (chips style)
  - Stats card showing total/earned/completion percentage (for authenticated users)
  - Badge cards with icon, name, description, season indicator, points, earned count
  - Share button for individual badges
  - Empty state: "No Seasonal Badges Yet" with CTA to view challenges
  - Link to active challenges
- **API Integration:**
  - `GET /api/badges/past-seasonal` - Returns past seasonal badges with year filtering
  - Supports pagination and user earned status

#### Category Requirements Display on Challenges Page
- **UI Enhancement:**
  - Added pink "Required: category1, category2" badge to challenge cards
  - Shows only when challenge has `categories` array populated
  - Uses pricetag icon with pink background styling
  - Positioned between progress bar and footer for visibility
- **Files Modified:**
  - `/app/frontend/app/challenges.tsx` - Added categoriesContainer JSX and styles

### 2026-02-11: Backend Refactoring - Models & Routes Extraction
**COMPLETED**

#### Models Package Created (`/app/backend/models/`)
- `__init__.py` - Package exports for all models
- `user.py` - User, UserUpdate, UserSettings, ProfileUpdate, etc.
- `listing.py` - Listing, Category, CategoryAttribute, ListingCreate/Update
- `messaging.py` - Message, Conversation, MessageCreate
- `notification.py` - Notification, NotificationCreate, NotificationType
- `badge.py` - BadgeDefinition, UserBadge, Challenge, ChallengeProgress, UserStreak, Milestone

#### New Route Files Created (`/app/backend/routes/`)
- `badges.py` - Badge progress, showcase, unviewed count, milestones, leaderboard
- `streaks.py` - User streak info, streak leaderboard
- `challenges.py` - Challenge listing, joining, progress tracking

#### Existing Route Files (Previously Extracted)
- `auth.py` - Login, register, Google OAuth
- `users.py` - User profile endpoints
- `listings.py` - Listing CRUD operations
- `categories.py` - Category management
- `favorites.py` - User favorites
- `conversations.py` - Messaging system

#### Structure After Refactoring
```
/app/backend/
├── server.py          # Main app (still large, but improved organization)
├── models/            # NEW - Pydantic models
│   ├── __init__.py
│   ├── user.py
│   ├── listing.py
│   ├── messaging.py
│   ├── notification.py
│   └── badge.py
├── routes/            # Route handlers
│   ├── __init__.py
│   ├── auth.py
│   ├── users.py
│   ├── listings.py
│   ├── categories.py
│   ├── favorites.py
│   ├── conversations.py
│   ├── badges.py      # NEW
│   ├── streaks.py     # NEW
│   └── challenges.py  # NEW
└── services/
    ├── __init__.py
    └── badge_service.py
```

#### Admin Analytics Authentication Flow
- **UI Enhancement:**
  - Authentication check on page load
  - "Authentication Required" error screen with:
    - Lock icon (red)
    - Explanation text
    - "Go to Login" button (green)
    - "Go Back" button
  - Handles 401 errors from API gracefully
- **Files Modified:**
  - `/app/frontend/app/admin/analytics.tsx` - Added auth check and error UI

#### Admin Analytics Settings Tab
- **New Tab Added:** Settings tab alongside Overview, Sellers, Engagement
- **Seller Analytics Settings:**
  - Revenue Alert Threshold (€) - Alert when seller's monthly revenue drops
  - Low Performance Threshold (days) - Days of inactivity before flagging seller
- **Engagement Milestone Notifications (toggles):**
  - First Sale Celebration
  - 10 Listings Milestone
  - 100 Messages Milestone
  - Badge Achievement Alerts
- **Automated Notification Triggers (toggles):**
  - Inactive Seller Reminder
  - Low Engagement Alert
  - Challenge Deadline Reminder
  - Weekly Digest Email
- **Save Settings button** - Saves to `/api/admin/settings/seller-analytics` and `/api/admin/settings/engagement-notifications`

#### Seasonal Gallery Links Added
- **Leaderboard page** (`/leaderboard`):
  - "Browse Past Seasonal Badges" link at bottom
  - Pink styling with sparkles icon
- **Profile Badges page** (`/profile/badges`):
  - "Past Seasonal Badges" card with sparkles icon
  - "Browse limited-time badges from past events" subtitle

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
- "BEST VALUE" orange badge on the package with highest savings percentage (currently Pro Pack at 29%)
- Save amount shown below price with percentage (e.g., "Save $2.00 (17% off)")
- Price per credit displayed for each package (e.g., "$0.100 per credit")
- Savings calculated by comparing to the base (smallest) package

#### Desktop Header
- New desktop header with "Credits Store" title and subtitle
- Wallet icon with green background
- Balance display in the header (right side)
- "Back" button with icon on the left
- Balance card hidden on desktop (shown only in header)

#### Hover Effects (Desktop)
- Package cards have hover effect (border change, slight scale up)
- Best deal package has orange theme (border, button, savings text)

#### Desktop Profile Enhancements
- Added "Credits & Boosts" section in Desktop Profile (authenticated users only)
- "Buy Credits" button with wallet icon - navigates to /credits
- "Boost Listings" button with rocket icon - navigates to /profile/my-listings
- Section appears between "Your Activity" and "Trust & Identity" sections

### 2026-02-11: Multiple UI Improvements & Admin Invoices
**COMPLETED**

#### Redirection After Sign-in (Fixed)
- Fixed redirect for /post (now redirects back after login)
- Fixed redirect for /messages (Sign In and Register buttons)
- Fixed redirect for /offers (unauthenticated view)
- Fixed redirect for listing page make offer action

#### Input Field Focus Styling (Fixed)
- Added global CSS to remove black rectangle focus outline
- Input/textarea/select fields now have clean focus without black borders

#### Desktop Headers Added
- Offers page: Added dedicated header with icon and contextual subtitle
- Boost page: Added desktop header with credits display
- Credits page: Already had header (completed earlier)

#### Desktop Navigation Links (Completed)
- Added nav links to Offers, Messages, Saved pages (My Listings, Messages, Saved, Offers)
- Links highlight when active based on pathname
- Redirects added for unauthenticated users on Sign In/Up buttons

#### Messages Mobile Filter Chips (Fixed)
- Changed FilterTabs from View to ScrollView for horizontal scrolling
- Filter chips (All, Unread, Buying, Selling) now scroll horizontally on narrow screens
- Added proper contentContainerStyle for padding

#### Category Page Sticky Fix (Fixed)
- Only category title header stays sticky at top
- Subcategory chips, filters bar, and active filters now scroll with listings content
- Improved mobile UX by reducing header space consumption

#### My Listings Mobile Responsiveness (Improved)
- Increased listing image size (90x90)
- Better spacing and alignment
- Improved status badges and stats layout

#### Admin Invoices Feature (NEW)
- Created invoices management page at /dashboard/invoices
- Features: View all invoices, filter by status/type/date, search
- Stats cards: Total invoices, revenue, paid/pending counts
- PDF download functionality (generates HTML invoice for printing)
- Added navigation link in admin sidebar

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



### 2026-02-11: Admin Badge Management & Desktop Navigation

**COMPLETED**

#### Admin Badge Management System
- Full CRUD for badges with fields: name, description, icon, color, type, criteria, auto_award, points_value, **display_priority** (user-requested), is_active
- Badge types: achievement, verification, premium, trust, special
- Award/Revoke badges from users
- User badges list with search and pagination
- Admin dashboard page at `/dashboard/badges`
- Navigation link added to admin sidebar

**API Endpoints:**
- `GET /api/admin/badges`: List all badges with stats
- `POST /api/admin/badges`: Create new badge
- `PUT /api/admin/badges/{id}`: Update badge
- `DELETE /api/admin/badges/{id}`: Delete badge
- `GET /api/admin/badges/users`: List user badges
- `POST /api/admin/badges/award`: Award badge to user
- `DELETE /api/admin/badges/users/{id}`: Revoke user badge
- `GET /api/admin/users/search`: Search users by email/name

**Key Files:**
- `/app/admin-dashboard/backend/server.py` - Badge API endpoints (lines 7377-7636)
- `/app/admin-dashboard/frontend/src/app/dashboard/badges/page.tsx` - Admin UI
- `/app/admin-dashboard/frontend/src/app/dashboard/layout.tsx` - Sidebar with Badges link

#### Desktop Navigation Pattern
- Applied consistent top-bar navigation to `profile/my-listings.tsx`
- Navigation links: My Listings, Messages, Saved, Offers
- Created reusable `DesktopHeader` component at `/app/frontend/src/components/layout/DesktopHeader.tsx`
- Exported from `/app/frontend/src/components/layout/index.ts`

### 2026-02-11: Public Profile Badge Visibility & Code Refactoring

**COMPLETED**

#### Public Profile Badge Visibility
- Added `GET /api/profile/public/{user_id}/badges` endpoint to main backend
- Displays user achievement badges on public profile page (both desktop and mobile views)
- Badges sorted by display_priority (higher priority first)
- Badge UI shows icon, name, and custom color styling
- Only shows Achievements section when user has badges

**Key Files:**
- `/app/backend/server.py` - Public badges endpoint (lines 3432-3490)
- `/app/frontend/app/profile/public/[id].tsx` - Achievement badges display (desktop: lines 554-574, mobile: lines 935-955)

#### Code Refactoring - DesktopHeader Component
- Created shared `DesktopHeader` component to reduce code duplication
- Refactored pages to use shared component:
  - `offers.tsx` - Removed inline renderGlobalHeader, uses DesktopHeader
  - `(tabs)/messages.tsx` - Uses DesktopHeader
  - `profile/saved.tsx` - Uses DesktopHeader  
  - `(tabs)/saved.tsx` - Uses DesktopHeader
- Navigation links only appear for authenticated users

### 2026-02-11: Automatic Badge Awarding System

**COMPLETED**

#### Automatic Badge System
Created a comprehensive automatic badge awarding system that awards badges to users based on their activity:

**10 Predefined Badges:**
1. **First Sale** - Completed first sale (50 points)
2. **Active Seller** - 10 sales completed (100 points)
3. **Experienced Seller** - 50 sales completed (250 points)
4. **Top Seller** - 100+ sales completed (500 points)
5. **Trusted Member** - Active member for 1+ year (200 points)
6. **Veteran Member** - Active member for 2+ years (400 points)
7. **5-Star Seller** - 4.9+ rating with 10+ reviews (300 points)
8. **First Listing** - Created first listing (25 points)
9. **Prolific Seller** - 50+ listings created (150 points)
10. **Verified Seller** - Completed identity verification (100 points)

**Trigger Events:**
- Listing creation → checks listing-related badges
- Mark listing as sold → checks sales-related badges
- Periodic task (every 6 hours) → checks time-based badges

**API Endpoints:**
- `POST /api/listings/{id}/mark-sold`: Mark listing as sold and check for badges

**Key Files:**
- `/app/backend/services/badge_service.py` - Badge awarding service
- `/app/backend/routes/listings.py` - Mark sold endpoint with badge check
- `/app/backend/server.py` - Service initialization and periodic task

#### Additional Code Refactoring
- Removed ~100 lines of duplicate `renderGlobalHeader` code from `messages.tsx`
- Cleaned up unused imports (`usePathname`) from refactored components

### 2026-02-11: Badge Showcase & Progress Indicators

**COMPLETED**

#### Badge Showcase Feature
Users can now customize which badges appear on their public profile:
- Choose up to 5 badges to prominently display
- Showcased badges appear on public profile in user's preferred order
- If no showcase set, top 5 earned badges by priority are shown by default

#### Badge Progress Indicators
Users can track their progress towards earning badges:
- Visual progress bars for each badge criteria
- Shows current/target values (e.g., "3/10 sales")
- Earned badges show completion checkmark
- Total points earned displayed

**New API Endpoints:**
- `GET /api/badges/progress` - Get progress for all badges with current stats
- `PUT /api/badges/showcase` - Update which badges to showcase (max 5)
- `GET /api/profile/public/{user_id}/badges/showcase` - Get user's showcase badges for public display

**New Frontend Page:**
- `/profile/badges` - "My Badges" page with:
  - Stats summary (badges earned, total points, showcase count)
  - Showcase section with star-highlighted badges
  - Earned badges section with toggle to add/remove from showcase
  - In Progress section with progress bars

**Key Files:**
- `/app/backend/services/badge_service.py` - get_badge_progress method
- `/app/backend/server.py` - Badge showcase endpoints (lines 3493-3585)
- `/app/frontend/app/profile/badges.tsx` - Badge management page
- `/app/frontend/app/(tabs)/profile.tsx` - Added "My Badges" link to activity sections

### 2026-02-11: Listing ID, Badge Celebration & Featured Listings

**COMPLETED**

#### Listing ID Display
- Added listing ID display to all listing cards (shows last 8 characters)
- Uses monospace font for clear ID display
- Location: Bottom right of listing cards

#### Badge Celebration Modal
- Created `BadgeCelebrationModal` component with confetti animation
- Features: Animated badge entrance, falling confetti, points display, pulsing glow effect
- Created `BadgeCelebrationProvider` context for global access
- Integrated into app root layout
- Modal queues multiple badges for sequential celebration

#### Featured Verified Sellers → Featured Listings
- Changed homepage "Verified Sellers" section to "From Verified Sellers"
- Now shows actual listings from verified/premium sellers instead of seller profiles
- Created API endpoint: `GET /api/listings/featured-verified`
- Falls back to verified seller profiles if no listings available

**Key Files:**
- `/app/frontend/src/components/listings/ListingCard.tsx` - Listing ID display
- `/app/frontend/src/components/badges/BadgeCelebrationModal.tsx` - Celebration modal
- `/app/frontend/src/context/BadgeCelebrationContext.tsx` - Provider context
- `/app/frontend/app/_layout.tsx` - Provider integration
- `/app/frontend/app/(tabs)/index.tsx` - Featured listings section
- `/app/backend/server.py` - Featured verified listings endpoint (line 1022)

### 2026-02-11: Listing ID Display & Mobile Business Profile Fixes

**COMPLETED**

#### Listing ID Display on Detail Page
- Removed Listing ID from listing cards (homepage, search results)
- Added Listing ID on listing detail page next to "Report this listing" button
- Shows on both mobile (SafetySection component) and desktop (right column safety card)
- ID displayed in monospace font for clear identification

#### Mobile Business Profile Image Upload Fix
- Added media library permission requests for mobile (iOS/Android)
- Uses `ImagePicker.requestMediaLibraryPermissionsAsync()` before launching image picker
- Shows permission denied alert if user declines
- Applied to all three upload functions: logo, cover, and gallery

**Key Files:**
- `/app/frontend/app/listing/[id].tsx` - Listing ID display (lines 360-400 mobile, lines 1196-1202 desktop)
- `/app/frontend/src/components/listings/ListingCard.tsx` - Removed listing ID
- `/app/frontend/app/business/edit.tsx` - Mobile permission requests

### 2026-02-11: Desktop Header & Profile Activity Updates

**COMPLETED**

#### Desktop Header - Logged-in User Enhancements
- Added Credit Balance button with wallet icon (shows "X Credits")
- Displays My Listings, Messages, Saved, Offers navigation links
- Notification icon and Profile icon
- Post Listing button
- Credit balance fetched from `/api/credits/balance` API

#### Desktop Profile - My Activity Section
- Streamlined to show only 6 activity items:
  - My Badges
  - Business Profile
  - Invoices & Receipts
  - Purchases
  - Sales
  - Recently Viewed
- Removed items that are now in header: My Listings, Messages, Saved, Offers

**Key Files:**
- `/app/frontend/src/components/layout/DesktopHeader.tsx` - Header with credit balance and nav links
- `/app/frontend/app/(tabs)/profile.tsx` - Updated My Activity section

## Remaining Backlog

### P0: None (Admin Dashboard Updated)

### P1: Continue server.py refactoring
- Extract remaining route groups from server.py (user profiles, listings, search, etc.)

### P2: Optional Cleanup
- Remove remaining unused `renderGlobalHeader` function definitions
- Refactor `admin-ui` project into smaller components

### 2026-02-11: Admin Dashboard Navigation & Analytics Fixes
**COMPLETED**

#### Changes Made
1. **Fixed Analytics Page API Endpoints** (`/app/admin-dashboard/frontend/src/app/dashboard/analytics/page.tsx`)
   - Changed API calls from `/analytics/admin/*` to `/seller-analytics/*`
   - This fixed the "Unable to load settings" error

2. **Added Missing Menu Items** (`/app/admin-dashboard/frontend/src/app/dashboard/layout.tsx`)
   - Added "Analytics" link to sidebar (was present but hidden below fold)
   - Added "Challenges" link to sidebar
   - Added "Business Profiles" link to sidebar
   - Reordered menu items for better visibility

3. **Created Business Profiles Admin Page** (`/app/admin-dashboard/frontend/src/app/dashboard/business-profiles/page.tsx`)
   - Stats cards: Total, Pending, Verified, Rejected profiles
   - Search and filter by status tabs
   - Table with business details, owner info, category, status
   - View details dialog with verify/reject actions
   - Pagination support

#### Admin Dashboard Sidebar Now Includes
- Overview, Executive Summary, QA & Reliability, Admin Sandbox
- Cohort Analytics, **Analytics** (with Seller Analytics Settings)
- Categories, Attributes, Location Manager
- **Users**, **Verification**, **Challenges**, **Business Profiles**
- Listings, Listing Moderation, Vouchers, Commission, Boosts
- And many more...

**Key Files Modified:**
- `/app/admin-dashboard/frontend/src/app/dashboard/layout.tsx` - Sidebar menu
- `/app/admin-dashboard/frontend/src/app/dashboard/analytics/page.tsx` - Fixed API endpoints
- `/app/admin-dashboard/frontend/src/app/dashboard/business-profiles/page.tsx` - New page

### 2026-02-11: Scheduled Analytics Reports Feature
**COMPLETED**

#### Feature Overview
Automated weekly/daily/monthly analytics reports sent via email to configured admin recipients. Reports include platform overview, seller performance analysis, engagement metrics, and alerts based on configured thresholds.

#### Backend Service (`/app/backend/scheduled_reports_service.py`)
- `ScheduledReportsService` class with methods:
  - `get_report_settings()` / `save_report_settings()` - Configuration management
  - `generate_platform_overview()` - User stats, listing stats, revenue metrics
  - `generate_seller_analytics()` - Top sellers, low performers, revenue alerts
  - `generate_engagement_metrics()` - Messages, favorites, badges, challenges
  - `generate_full_report()` - Combines all sections
  - `format_report_html()` - Beautiful HTML email template with styled sections
  - `send_report_email()` - Sends via SendGrid to configured admins
  - `run_scheduled_report()` - Main entry point for scheduled job

#### Backend Endpoints
- `GET /api/admin/settings/scheduled-reports` - Get report configuration
- `POST /api/admin/settings/scheduled-reports` - Save report configuration
  - Settings: enabled, frequency (daily/weekly/monthly), day_of_week, hour, admin_emails
  - Include flags: include_seller_analytics, include_engagement_metrics, include_platform_overview, include_alerts
- `POST /api/admin/reports/generate` - Generate report without sending
- `POST /api/admin/reports/send` - Generate and send report to configured admins
- `GET /api/admin/reports/preview` - Preview HTML email and report data
- `GET /api/admin/reports/history` - List of sent reports with pagination

#### Background Task
- Runs every 5 minutes checking if report should be sent
- Checks frequency, day_of_week, and hour settings
- Prevents duplicate sends by checking report_history collection
- Logs all operations for debugging

#### Report Sections
1. **Platform Overview**: total_users, new_users_week, active_listings, sold_listings_week, weekly_revenue, user_growth_rate
2. **Seller Analytics**: top_sellers (name, revenue, sales), low_performing_sellers (inactive days), revenue_alerts (below threshold)
3. **Engagement Metrics**: messages_this_week, favorites_this_week, badges_awarded, challenges_completed
4. **Alerts**: Compiled from low performers and revenue alerts with severity levels

#### Frontend UI (`/app/frontend/app/admin/analytics.tsx` - Settings tab)
- Enable/Disable scheduled reports toggle
- Frequency selector (Daily/Weekly/Monthly chips)
- Day of week selector (for weekly reports)
- Send time (hour in UTC)
- Admin email recipients input (comma-separated)
- "Send Report Now" button for manual trigger
- Report history section showing recent sends with success/failed status

#### Test Results
- All 23 backend tests passed (100% success rate)
- Round-trip persistence verified for settings
- Report generation verified with all 4 sections
- Authentication enforcement verified (401 for unauthenticated requests)
- Email sending depends on SendGrid configuration

**Key Files:**
- `/app/backend/scheduled_reports_service.py` - Report generation service
- `/app/backend/server.py` (lines 8158-8287) - Scheduled reports endpoints
- `/app/backend/server.py` (lines 8847-8904) - Background task
- `/app/frontend/app/admin/analytics.tsx` - Settings tab with scheduled reports UI

### 2026-02-11: Seller Analytics Settings Backend Implementation
**COMPLETED**

#### Backend Endpoints Implemented
- `GET /api/admin/settings/seller-analytics` - Retrieves seller analytics settings
  - Returns: `{ alert_threshold: number, low_performance_threshold: number }`
  - Default values: alert_threshold=100, low_performance_threshold=5
- `POST /api/admin/settings/seller-analytics` - Saves seller analytics settings
  - Accepts: `{ alert_threshold: number, low_performance_threshold: number }`
  - Persists to `admin_settings` MongoDB collection

- `GET /api/admin/settings/engagement-notifications` - Retrieves engagement notification settings
  - Returns: `{ milestones: object, triggers: object }`
  - milestones: firstSale, tenListings, hundredMessages, badgeMilestone
  - triggers: inactiveSeller, lowEngagement, challengeReminder, weeklyDigest
- `POST /api/admin/settings/engagement-notifications` - Saves engagement notification settings
  - Accepts: `{ milestones: object, triggers: object }`
  - Persists to `admin_settings` MongoDB collection

#### Technical Implementation
- Routes registered directly on FastAPI app BEFORE the admin proxy catch-all
- Uses async MongoDB operations (motor.motor_asyncio)
- All endpoints require authentication via Bearer token (returns 401 without valid token)
- Settings stored in `admin_settings` collection with `type` field distinguishing settings

#### Frontend Updates
- Added `fetchSettings()` callback in `/app/frontend/app/admin/analytics.tsx`
- Settings automatically loaded when user switches to the Settings tab
- Existing settings populate input fields and toggle states
- Save button persists settings to backend

#### Test Results
- All 12 tests passed (100% success rate)
- Backend test file: `/app/backend/tests/test_seller_analytics_settings.py`
- Round-trip persistence verified for both settings endpoints
- Authentication enforcement verified (401 for unauthenticated requests)

**Key Files:**
- `/app/backend/server.py` (lines 7894-8160) - Local admin analytics routes
- `/app/frontend/app/admin/analytics.tsx` - Settings tab UI and fetchSettings function
- `/app/backend/routes/admin.py` - Additional admin routes module (not used for settings)

