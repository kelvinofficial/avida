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
