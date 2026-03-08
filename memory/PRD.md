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
   - Seller ship with tracking number
   - Buyer confirm delivery
   - Escrow funding and release
7. **Backend Startup Optimization** (March 8, 2026)
   - Root cause: `app.include_router(api_router)` called 26 times
   - Fix: Single include after all sub-routers added
   - Result: 155s → 22s (7x improvement)
8. **Duplicate Notification Settings Fix** (March 8, 2026)
   - `/profile/notification-preferences` redirects to `/profile/notifications`
9. **Ordering Flow Fixes** (March 8, 2026)
   - Fixed hardcoded EUR → TZS currency in escrow_system.py
   - Replaced TouchableOpacity with Pressable in listing/[id].tsx (82 instances)
   - Replaced TouchableOpacity with Pressable in checkout/[listing_id].tsx (28 instances)
   - Verified sellers for online selling via admin API
   - Full E2E ordering flow tested: Browse → Buy → Checkout → Stripe → Ship → Deliver

### Test Accounts
- Admin: admin@marketplace.com / Admin@123456
- Test User (Buyer): testuser2028@example.com / Test@123456
- Demo User (Seller): demo@avida.com / Demo@123

### Test Listings
- Demo iPhone 15 Pro Max (8accd855): 1,200,000 TZS - exceeds Stripe limit
- Nice dress (fb3227c3): 50,000 TZS - good for testing

## Prioritized Backlog

### P1 (High)
- ~~Backend startup performance optimization~~ DONE
- ~~Fix duplicate notification settings~~ DONE
- ~~Fix ordering flow (currency, button clicks)~~ DONE

### P2 (Medium)
- Implement real business logic for ~300 mock API endpoints
- Chat Options (Mute, Delete, Block)
- WebSocket connection returning 502 (non-critical)

### P3 (Low/Future)
- Image Optimization Pipeline (WebP/CDN)
- Multi-Language Content (German & Swahili)
- Complete remaining mock API implementations
- Handle high-value listings exceeding Stripe per-session limits

## 3rd Party Integrations
- MongoDB Atlas
- Stripe (Emergent managed test key: sk_test_emergent)
- SendGrid
- Firebase Cloud Messaging (FCM)
- PayPal, Flutterwave
- Africa's Talking, Twilio
- apscheduler (background cron jobs)
