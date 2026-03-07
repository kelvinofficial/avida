# Avida Marketplace - Product Requirements Document

## Original Problem Statement
Full-stack React Native/Expo mobile app with critical failures, including a non-functional homepage and missing API endpoints. The app has since been expanded with 300+ API endpoints, admin branding, dynamic banners, seller analytics, and background cron jobs.

## Architecture
- **Frontend**: React Native/Expo (mobile + web) at `https://banner-integration.preview.emergentagent.com`
- **Backend**: FastAPI on port 8001 (same server)
- **Database**: MongoDB Atlas
- **Admin Dashboard**: Next.js (separate deployment)

## Current Status (Mar 7, 2026)

### Seller Analytics - Admin Panel Verified ✅
| Tab | Features | Status |
|-----|----------|--------|
| **Seller Analytics Settings** | Access control, visible metrics, subscriptions | ✅ Working |
| **Engagement Notifications** | Spike thresholds (Views/Saves/Chats), timing | ✅ Working |
| **Seller Badges** | 7 badges with criteria, Run Badge Evaluation | ✅ Working |
| **Top Performers** | Real leaderboard data, 30-day performance | ✅ Working |

### Badge Criteria (Configured)
| Badge | Tier | Criteria |
|-------|------|----------|
| Top Seller | GOLD | min_listings_sold:10, min_total_views:500 |
| Rising Star | SILVER | min_view_growth:50, min_listings:3 |
| Quick Responder | BRONZE | avg_response_time_minutes:60 |
| Trusted Seller | GOLD | min_positive_ratings:10, min_rating:4 |
| Power Lister | SILVER | min_active_listings:10, min_avg_photos:3 |
| Community Champion | GOLD | min_days_active:30, min_total_interactions:50 |
| Photo Pro | BRONZE | min_avg_photos:5, min_listings:5 |

### New API Endpoints Implemented This Session
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/reviews` | GET | ✅ Public - List all reviews |
| `/api/reviews/{id}` | GET | ✅ Public - Get single review |
| `/api/reviews` | POST | ✅ Auth - Create review |
| `/api/reviews/{id}` | PUT/DELETE | ✅ Auth - Update/Delete own review |
| `/api/reviews/stats/summary` | GET | ✅ Public - Review statistics |
| `/api/seller/verification` | GET | ✅ Auth - My verification status |
| `/api/seller/verification/tiers` | GET | ✅ Public - All tiers & benefits |
| `/api/seller/verification/requirements` | GET | ✅ Public - Requirements per tier |
| `/api/seller/verification/request` | POST | ✅ Auth - Request verification |
| `/api/seller/verification/user/{id}` | GET | ✅ Public - User verification status |
| `/api/business-profile` | GET/POST/PUT/DELETE | ✅ Auth - My business profile CRUD |
| `/api/business-profile/stats` | GET | ✅ Auth - Profile statistics |
| `/api/escrow/disputes/{id}` | GET | ✅ Auth - Already existed |

### Banner Integration (Previous Session)
| Feature | File | Status |
|---------|------|--------|
| Native Ad Feed Banners | `BannerSlot.tsx` | ✅ Complete |
| Homepage Header Banner | `(tabs)/index.tsx` | ✅ Working |
| Listing Detail - Below Gallery | `listing/[id].tsx` | ✅ Mobile + Desktop |
| Listing Detail - Below Info | `listing/[id].tsx` | ✅ Mobile + Desktop |
| Listing Detail - Before Similar | `listing/[id].tsx` | ✅ Mobile + Desktop |

## What's Been Implemented

### Session - Mar 7, 2026 (Current Fork)
- **Reviews API**: Full CRUD for reviews with ratings, comments, and statistics
- **Seller Verification API**: Verification tiers, requirements, and request flow
- **Business Profile API**: User's own business profile management (singular endpoint)
- **Native Ad Feed Banners**: Feed banners styled like ListingCard
- **All Listing Detail Page Banners**: All placements for mobile and desktop

### Session - Mar 7, 2026 (Previous Forks)
- Banner System Frontend Implementation (end-to-end)
- Admin Dashboard API Compatibility Fix
- Backend targeting bug fix in banner_service.py
- Seller Performance Analytics (13+ endpoints)
- Background Cron Jobs

### Earlier Sessions
- 295+ API endpoints across admin, analytics, management, growth/SEO
- Full authentication system (email + Google OAuth)
- Categories, listings, messaging, notifications
- Payment integrations (PayPal, Flutterwave, Stripe)

## Test Credentials
- Admin: `admin@marketplace.com` / `Admin@123456`
- Test User: `testuser2028@example.com` / `Test@123456`
- Google Auth: `kmasuka48@gmail.com`

## Known Issues (Open)
| Issue | Priority | Status |
|-------|----------|--------|
| ~300 mock API endpoints need real business logic | P1 | NOT STARTED |
| Hardcoded frontend API URL in api.ts | P2 | NOT STARTED |
| Chat Options Functionality (Mute, Delete, Block) | P2 | NOT STARTED |
| Backend startup takes 60+ seconds | P3 | Known limitation |

## Key Technical Notes
- **Route Order**: Specific routes MUST be registered before catch-all proxy routes in server.py
- **Backend Startup**: Takes 60+ seconds due to 300+ routes and multiple startup events
- **MongoDB**: Uses Atlas remote database; ensure timezone-aware datetimes
- **Frontend**: React Native/Expo with web support; API URL from EXPO_PUBLIC_BACKEND_URL
- **Banner Placements**: `header_below`, `feed_after_5`, `detail_below_gallery`, `detail_below_info`, `detail_before_similar`

## Key API Endpoints
- `/api/reviews/*`: Reviews system (list, create, update, delete, stats)
- `/api/seller/verification/*`: Seller verification (tiers, requirements, requests)
- `/api/business-profile`: User's business profile management
- `/api/admin/branding/*`: Full CRUD for app branding
- `/api/banners/display/{placement}`: Public banner display for mobile app
- `/api/admin/banners/*`: Full CRUD and analytics for banners
- `/api/analytics/seller/*`: Seller performance data
- `/api/escrow/*`: Escrow orders, disputes, payments

## 3rd Party Integrations
- MongoDB Atlas, SendGrid, Firebase Cloud Messaging
- PayPal, Flutterwave, Stripe, Africa's Talking, Twilio
- apscheduler (background cron jobs)
