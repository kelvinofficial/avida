# Avida Marketplace - Product Requirements Document

## Original Problem Statement
Build a full-featured marketplace app with React Native (Expo) frontend, FastAPI backend, and MongoDB.

## Architecture
- **Frontend**: React Native (Expo) - Web + Mobile
- **Backend**: FastAPI (Python)
- **Database**: MongoDB Atlas (remote)
- **Admin**: Separate admin dashboard
- **Auth**: Session-based with cookies/bearer tokens
- **Payments**: Stripe (Emergent managed test key)

## What's Been Implemented

### Completed Features
1. **Dynamic Banner System** - Homepage, feed, listing detail, search page placements
2. **Seller Performance Analytics** - Backend tracking, admin config, frontend display
3. **Seller Badges System** - Backend endpoints, performance page badges
4. **Seller Notifications System** - Backend endpoints, push notification channels
5. **Login Button Fix** - Replaced TouchableOpacity with Pressable for reliable web clicks
6. **Escrow & Order Tracking System**
   - Full checkout flow (4 steps: Summary > Delivery > Payment > Review)
   - Stripe payment integration (TZS currency)
   - Order tracking with status timeline
   - Seller ship with tracking number, Buyer confirm delivery
7. **Backend Startup Optimization** (March 8, 2026) - 155s → 22s (7x improvement)
8. **Duplicate Notification Settings Fix** (March 8, 2026)
9. **Ordering Flow Fixes** (March 8, 2026)
   - Fixed hardcoded EUR → TZS currency in escrow_system.py and payment_system.py
   - Replaced TouchableOpacity with Pressable in listing/[id].tsx (82 instances) and checkout/[listing_id].tsx (28 instances)
   - Added Buy Now button to mobile view (was only in desktop)
   - Created test listing: Samsung Galaxy S24 Ultra at TZS 250,000 (under Stripe limit)
   - Verified sellers for online selling via admin API
   - Full E2E ordering flow tested on both mobile and desktop
10. **Missing API Endpoints** (March 8, 2026)
    - GET /api/search — Full-text search with filters (category, location, price range, condition, sort, pagination)
    - GET /api/locations — Aggregated unique locations from active listings with counts
    - GET /api/featured — Featured/promoted listings sorted by featured, boost, views
11. **Search Suggestions & Popular Endpoints** (March 8, 2026)
    - GET /api/search/suggestions?q={query} — Autocomplete from search history + listing titles
    - GET /api/search/popular — Trending searches with category filtering and configurable lookback
12. **Offer Accept/Reject & Media Upload Endpoints** (March 8, 2026)
    - PUT /api/offers/{id}/accept — Seller directly accepts an offer (with notifications)
    - PUT /api/offers/{id}/reject — Seller directly rejects an offer (with optional reason)
    - POST /api/media/upload — General-purpose image/voice/video upload (stored in DB, retrievable via GET /api/media/{id})
13. **Chat Offer Feature (Send Offer via Chat)** (March 8, 2026)
    - Added "Make Offer" button (pricetag icon) in chat input bar for buyers
    - Bottom sheet modal with listing preview, price input, message field, and submit button
    - Rich offer card rendering in chat with listing image/title, offered price, original price strikethrough, discount badge
    - Accept/Decline buttons for sellers on offer messages
    - Offer accepted/rejected status messages with visual indicators
    - Backend integration: POST /api/offers, PUT /api/offers/{id}/accept, PUT /api/offers/{id}/reject
    - offersApi client added to frontend api.ts
14. **Notifications Read-All Endpoint** (March 8, 2026)
    - POST /api/notifications/read-all — Bulk mark all unread notifications as read (replaces individual call workaround)
15. **Missing Page Endpoints** (March 9, 2026)
    - GET /api/purchases — User's purchase history with pagination and status filter
    - GET /api/orders — User's orders (buyer/seller/all roles) with pagination
    - GET /api/sales — User's sales with revenue stats
    - GET /api/credits — Credit transaction history with balance
    - GET /api/credits/balance — Current credit balance
    - GET /api/boost — Active boosts, history, and available packages
    - GET /api/gamification/challenges — Challenges with user progress
    - GET /api/gamification/badges — All badges with earned status
    - GET /api/recently-viewed — Recently viewed listings with details
    - POST /api/recently-viewed/{listing_id} — Track listing view
16. **Wallet & Seller Verification Endpoints** (March 9, 2026)
    - GET /api/wallet — Balance, escrow balance, recent transactions
    - GET /api/seller-verification/status — Verification tier, pending request status
17. **Create Listing - Subcategory Step Separation** (March 9, 2026)
    - Split Category+Subcategory into two separate steps in the create listing flow
    - Step 1: Category selection only (15 categories in grid)
    - Step 2: Subcategory selection (new dedicated screen with list items)
    - Total steps increased from 6 to 7 (Category → Subcategory → Photos → Details → Attributes → Price → Review)
    - Validation updated: Step 1 validates category, Step 2 validates subcategory
18. **Push Notification & Settings Endpoints** (March 9, 2026)
    - POST /api/notifications/push/register — Register FCM token (with platform, device_id)
    - DELETE /api/notifications/push/unregister — Deactivate a push token
    - GET /api/notifications/settings — Get notification preferences (push/email/sms, per-category, quiet hours)
    - PUT /api/notifications/settings — Update notification preferences
    - Boost expiry cron already running (checks every 60s, expires active boosts past expiry date)
19. **Admin & Boost Analytics Endpoints** (March 9, 2026)
    - GET /api/admin/boosts — Boost analytics by location (active counts, revenue by region)
    - GET /api/admin/sellers — Seller data per location with user enrichment
    - GET /api/admin/seller-performance — Sales performance metrics (revenue, ratings, order stats)
    - GET /api/boost/analytics — Per-user boost performance (impressions, clicks, conversions)
    - GET /api/boost/performance — Aggregate boost metrics (CTR, conversion rate, spend)
    - Fixed admin proxy catch-all route conflict and KeyError in sellers endpoint
20. **Admin Config Endpoints** (March 9, 2026)
    - GET /api/admin/safety-tips — All safety tips with category filtering (defaults from code when DB empty)
    - GET /api/admin/form-config — Form configurations with type/category/active filtering and pagination
    - GET /api/admin/category-config — Category hierarchy with subcategories, attributes, and listing counts
21. **Critical API Performance Fix — Base64 Image Timeout** (March 11, 2026)
    - Root cause: Listings stored base64 images (~100KB+ each) inline in MongoDB documents. Queries fetching multiple listings loaded full image data, causing 30s+ timeouts.
    - Fixed endpoints: /api/feed/listings, /api/listings, /api/listings/{id}/similar, /api/listings/{id}/related, /api/listings/featured-verified, /api/listings/by-location, /api/search
    - Solution: Excluded `images` and `seo_data` from all multi-listing projections/aggregations. Added `feed_thumbnail` field with pre-computed WebP thumbnails (150x150). Background task runs on startup to generate thumbnails for new listings.
    - Performance: Feed from 30s+ timeout → 0.3s, Listings from 10s+ timeout → 1.1s, Search from timeout → 0.5s
22. **Cloudflare R2 Image CDN Pipeline** (March 11, 2026)
    - Implemented full image upload pipeline using Cloudflare R2 via REST API
    - New files: utils/r2_storage.py (upload/download/compress), routes/images.py (upload/serve endpoints)
    - Endpoints: POST /api/images/upload (file upload), POST /api/images/upload-base64 (base64 upload), GET /api/images/serve/{path} (CDN proxy with 1-year cache headers)
    - Images compressed to WebP (1200px max, 80% quality) + thumbnails (300px, 60% quality)
    - Background migration task: converts all existing base64 images to R2 URLs on startup
    - All 224 listings migrated from inline base64 to Cloudflare R2 CDN URLs
    - New listings automatically upload to R2 on creation
    - Listing detail API returns R2 URLs in images[] and thumbnails[] arrays
    - Feed payload reduced from ~2MB (base64) to ~8KB (R2 URLs) per 20 items
    - Config: CF_ACCOUNT_ID, CF_R2_TOKEN, CF_R2_BUCKET, CF_R2_PUBLIC_URL in backend/.env
23. **R2 Public CDN Access Enabled** (March 11, 2026)
    - Enabled r2.dev public URL for direct CDN delivery: https://pub-0cc33d2206c84cf990de86c3d660eee5.r2.dev
    - All image URLs now point directly to Cloudflare CDN (no backend proxy needed for reads)
    - Upload endpoint returns public CDN URLs; migration script converted all existing proxy URLs
    - Backend proxy `/api/images/serve/{path}` still available as fallback
    - Frontend verified: images render correctly from CDN on homepage
24. **v1 Image Management API** (March 12, 2026)
    - POST /api/v1/images/upload — Upload image to R2 with WebP compression + thumbnail generation, returns key/url/thumb_url
    - DELETE /api/v1/images/{key} — Delete image from R2 + DB, with ownership verification (owner or admin)
    - GET /api/v1/images/stats — Admin storage stats: upload totals/sizes, listing migration status, top uploaders
    - Fixed route ordering bug: stats endpoint now registered before catch-all delete path
    - Admin user (admin@marketplace.com) updated with role='admin' and is_admin=True in DB
    - All 16 tests passing (100% pass rate via testing agent)
25. **R2 Image Path Structure Update** (March 12, 2026)
    - Changed R2 storage path from `uploads/{user_id}/` to `listings/{user_id}/{listing_id}/`
    - Updated all upload endpoints: v0 POST /api/images/upload, v1 POST /api/v1/images/upload, POST /api/images/upload-base64
    - `listing_id` accepted as query param on file uploads, body field on base64 uploads; defaults to "general" if not provided
    - Updated `upload_base64_image()` in r2_storage.py to accept optional `user_id` param
    - Updated all callers: routes/images.py, routes/listings.py, server.py migration script
26. **Invisible Prefetch System** (March 12, 2026)
    - Implemented TikTok/Instagram-style 3-tier invisible prefetch for the listings feed
    - Tier 1: Load 7 listings instantly (<200ms first paint)
    - Tier 2: Silently prefetch items 8-40 (33 items) 100ms after first render
    - Tier 3: Background fetch items 41-60 (20 items) as user scrolls into prefetched zone
    - Rewrote `useInstantListingsFeed` hook with tiered fetch architecture, cache-first strategy, and deduplication
    - Updated FlatList props: `onEndReachedThreshold=0.7` for earlier Tier 3 trigger, `initialNumToRender=4` for fast first paint
    - Backend confirmed serving tiered requests: `limit=7` then `limit=33` with cursor continuation
    - Zero-latency scroll experience: all 40+ items loaded before user reaches end of first screen

### Test Accounts
- Admin: admin@marketplace.com / Admin@123456
- Test User (Buyer): testuser2028@example.com / Test@123456
- Demo User (Seller): demo@avida.com / Demo@123

### Test Listings
- Samsung Galaxy S24 Ultra (4e6772b0): TZS 250,000 - good for testing orders
- Demo iPhone 15 Pro Max (8accd855): 1,200,000 TZS - exceeds Stripe session limit
- Nice dress (fb3227c3): 50,000 TZS - seller has no user account

## Prioritized Backlog

### P1 (High)
- ~~Backend startup performance optimization~~ DONE
- ~~Fix duplicate notification settings~~ DONE
- ~~Fix ordering flow (currency, Buy Now button)~~ DONE

### P2 (Medium)
- Implement real business logic for ~300 mock API endpoints
- Chat Options (Mute, Delete, Block)

### P3 (Low/Future)
- Image Optimization Pipeline (WebP/CDN)
- Multi-Language Content (German & Swahili)
- Handle high-value listings exceeding Stripe per-session limits
- Complete remaining mock API implementations

## 3rd Party Integrations
- MongoDB Atlas
- Stripe (Emergent managed test key: sk_test_emergent)
- SendGrid
- Firebase Cloud Messaging (FCM)
- PayPal, Flutterwave
- Africa's Talking, Twilio
- apscheduler (background cron jobs)
