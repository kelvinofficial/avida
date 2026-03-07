# Avida Marketplace - Product Requirements Document

## Original Problem Statement
Build a full-featured marketplace app with React Native (Expo) frontend, FastAPI backend, and MongoDB.

## Core Requirements
- Multi-category marketplace (Auto, Properties, Electronics, etc.)
- Listing management (create, edit, delete, search)
- User authentication and profiles
- Real-time chat between buyers and sellers
- Payment integration (PayPal, Flutterwave, Stripe)
- Admin panel for marketplace management
- Push notifications for engagement
- Seller performance analytics with badges
- Dynamic banner/ad management system

## Architecture
- **Frontend**: React Native (Expo) - Web + Mobile
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Admin**: Separate admin dashboard
- **Auth**: Session-based with cookies/bearer tokens

## What's Been Implemented

### Completed Features
1. **Dynamic Banner System** - Fully functional with homepage, feed, listing detail, and search page placements
2. **Seller Performance Analytics** - Backend tracking, admin config, and frontend display
3. **Seller Badges System** (NEW - March 7, 2026)
   - Backend: `/api/analytics/badges/my-badges`, `/api/analytics/badges/mark-viewed`, `/api/analytics/badges/evaluate`
   - Frontend: Badges section on performance page, tab switcher on badges page (Activity/Performance), badges on public profiles
4. **Seller Notifications System** (NEW - March 7, 2026)
   - Backend: `/api/notifications/seller` (GET/PUT), `/api/notifications/register-push` (POST/DELETE)
   - Frontend: Notifications section on performance page, push notification channels
5. **Banner Integration in Search** (NEW - March 7, 2026)
   - Search results now include header, feed-injected, and footer banners
6. **BannerSlot URL Resolution** (NEW - March 7, 2026)
   - `resolveImageUrl` helper for relative image URLs
7. **API Endpoints**: /reviews, /seller/verification, /business-profile
8. **Mobile Login Fix**: Web-compatible onClick handler
9. **Analytics Tracking**: Client-side view/save/chat/offer event tracking

### Test Accounts
- Admin: admin@marketplace.com / Admin@123456
- Test User: testuser2028@example.com / Test@123456
- Demo User: demo@avida.com / Demo@123

## Key API Endpoints
- `/api/auth/login` - Login (returns session_token)
- `/api/analytics/track` - Track user events
- `/api/analytics/listing/{id}` - Listing analytics
- `/api/analytics/badges/my-badges` - Get seller badges
- `/api/analytics/badges/mark-viewed` - Mark badges viewed
- `/api/analytics/badges/evaluate` - Evaluate/award badges
- `/api/notifications/seller` - Get/mark seller notifications
- `/api/notifications/register-push` - Register/unregister FCM tokens
- `/api/reviews` - Reviews
- `/api/seller/verification` - Seller verification
- `/api/business-profile` - Business profiles

## Prioritized Backlog

### P0 (Critical)
- None currently

### P1 (High)
- Backend startup performance optimization (60-90s startup)
- Replace hardcoded frontend API URL with env variable

### P2 (Medium)
- Implement real business logic for ~300 mock API endpoints
- Chat Options (Mute, Delete, Block)
- Fix duplicate notification settings on Profile page

### P3 (Low/Future)
- Image Optimization Pipeline (WebP/CDN)
- Multi-Language Content (German & Swahili)

## 3rd Party Integrations
- MongoDB Atlas
- SendGrid (email)
- Firebase Cloud Messaging (push notifications)
- PayPal, Flutterwave, Stripe (payments)
- Africa's Talking, Twilio (SMS)
- apscheduler (background cron jobs)

## Known Issues
- Backend startup is very slow (60-90 seconds) - known and expected
- Many original API endpoints remain as mocks
- Frontend API URL is hardcoded in api.ts
