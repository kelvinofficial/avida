# Avida Marketplace - Product Requirements Document

## Original Problem Statement
Build a full-featured marketplace app with React Native (Expo) frontend, FastAPI backend, and MongoDB.

## Architecture
- **Frontend**: React Native (Expo) - Web + Mobile
- **Backend**: FastAPI (Python)
- **Database**: MongoDB Atlas (remote)
- **Admin**: Separate admin dashboard
- **Auth**: Session-based with cookies/bearer tokens

## What's Been Implemented

### Completed Features
1. **Dynamic Banner System** — Homepage, feed, listing detail, search page placements
2. **Seller Performance Analytics** — Backend tracking, admin config, frontend display
3. **Seller Badges System** — Backend endpoints, performance page badges, badges page tab switcher, public profile badges
4. **Seller Notifications System** — Backend endpoints, performance page notifications, push notification channels
5. **Login Button Fix** — Replaced TouchableOpacity with Pressable for reliable web clicks
6. **Escrow & Order Tracking Patch** (March 8, 2026)
   - Checkout: Default country TZ, currency TZS
   - Orders page: Ship modal with tracking number, escrow badge, tracking badge, Track Order button
   - Purchases page: Track Order button (mobile & desktop), confirm-delivery endpoint
   - New `escrowApi` export in api.ts
   - New `order-tracking.tsx` page with progress steps + timeline
   - Push notification channels for orders & escrow
   - Deep link handling for order-tracking and escrow notifications
   - Currency format standardized to TZS across all pages
7. **Backend Startup Optimization** (March 8, 2026)
   - Root cause: `app.include_router(api_router)` called 26 times, duplicating all routes each time
   - Fix: Single `app.include_router(api_router)` call after all sub-routers are added
   - Result: Startup time reduced from 155s to ~22s (7x improvement)
   - All 1604 routes verified functional post-fix
8. **Duplicate Notification Settings Fix** (March 8, 2026)
   - `/profile/notification-preferences` was a duplicate of `/profile/notifications`
   - Replaced with redirect component pointing to `/profile/notifications`

### Test Accounts
- Admin: admin@marketplace.com / Admin@123456
- Test User: testuser2028@example.com / Test@123456
- Demo User: demo@avida.com / Demo@123

## Prioritized Backlog

### P1 (High)
- ~~Backend startup performance optimization~~ DONE
- ~~Replace hardcoded frontend API URL with env variable~~ DONE
- ~~Fix duplicate notification settings on Profile page~~ DONE

### P2 (Medium)
- Implement real business logic for ~300 mock API endpoints
- Chat Options (Mute, Delete, Block)

### P3 (Low/Future)
- Image Optimization Pipeline (WebP/CDN)
- Multi-Language Content (German & Swahili)
- Complete remaining mock API implementations

## 3rd Party Integrations
- MongoDB Atlas
- SendGrid
- Firebase Cloud Messaging (FCM)
- PayPal, Flutterwave, Stripe
- Africa's Talking, Twilio
- apscheduler (background cron jobs)
