# Product Requirements Document - Avida Marketplace

## Original Problem Statement
Build a local marketplace application (Avida) with:
1. Location-based filtering (Country > Region selection)
2. Business Profile feature for verified sellers
3. Premium subscription tiers with payment integration

## What's Been Implemented

### 2026-02-10: Payment Integration & Enhanced Features
**COMPLETED - Backend**
- **Stripe Payment Integration**
  - Checkout session creation for Premium subscriptions
  - Payment status verification
  - Webhook handling for automatic premium activation
  - Packages: Monthly ($29.99), Quarterly ($79.99), Yearly ($249.99)

- **PayPal Payment Integration**
  - Order creation and capture
  - Frontend SDK configuration endpoint
  - Automatic premium activation on capture

- **M-Pesa Payment Integration**
  - STK Push initiation for Kenya/Tanzania
  - Local currency packages (KES 3,500 / TZS 75,000)
  - Phone number normalization

- **Gallery System**
  - Image gallery upload (max 20 images, 5MB each)
  - Video gallery (YouTube/Vimeo links, max 10)
  - Auto-thumbnail extraction for YouTube videos
  - Delete functionality for both

- **Social Network Links**
  - Facebook, Instagram, Twitter/X, LinkedIn
  - YouTube, TikTok, WhatsApp, Website
  - Vimeo, Pinterest

- **Region Coordinates**
  - Pre-populated 14 major regions (Germany, Tanzania, Kenya)
  - Berlin, Bavaria, NRW, Hesse, Baden-Württemberg, Hamburg
  - Dar es Salaam, Arusha, Mwanza, Dodoma
  - Nairobi, Mombasa, Kisumu, Nakuru

### API Endpoints Added

#### Premium Subscription (`/api/premium-subscription`)
- `GET /packages` - Get available subscription packages
- `POST /stripe/checkout` - Create Stripe checkout session
- `GET /stripe/status/{session_id}` - Check payment status
- `POST /paypal/checkout` - Create PayPal order
- `POST /paypal/capture/{transaction_id}` - Capture PayPal payment
- `POST /mpesa/stk-push` - Initiate M-Pesa payment
- `GET /my-subscription` - Get current subscription status

#### Gallery (`/api/business-profiles`)
- `GET /me/gallery` - Get gallery images and videos
- `POST /me/gallery/image` - Add image to gallery
- `DELETE /me/gallery/image/{image_id}` - Delete image
- `POST /me/gallery/video` - Add video link
- `DELETE /me/gallery/video/{video_id}` - Delete video

#### Webhooks
- `POST /api/webhook/stripe` - Stripe payment webhook

### Earlier Implementations (Same Session)
- Business Profile verification tiers (Verified/Premium)
- Featured Sellers section on homepage
- NaNkm display bug fix
- Region search bar visibility fix

## Database Schema Updates

### payment_transactions Collection
```json
{
  "id": "uuid",
  "session_id": "string (Stripe)",
  "payment_method": "stripe|paypal|mpesa",
  "user_id": "string",
  "business_profile_id": "string",
  "package_id": "string",
  "amount": "float",
  "currency": "string",
  "duration_days": "int",
  "status": "pending|success|failed",
  "payment_status": "initiated|paid|failed",
  "paid_at": "datetime",
  "created_at": "datetime"
}
```

### business_profiles Collection (Updated)
```json
{
  ...existing fields,
  "gallery_images": [
    {"id": "string", "url": "string", "caption": "string", "order": "int"}
  ],
  "gallery_videos": [
    {"id": "string", "url": "string", "title": "string", "thumbnail": "string"}
  ],
  "social_links": {
    "facebook": "string",
    "instagram": "string",
    "twitter": "string",
    "linkedin": "string",
    "youtube": "string",
    "tiktok": "string",
    "whatsapp": "string"
  }
}
```

## P0/P1/P2 Features Status

### P0 (Critical) - Done ✅
- [x] Payment integration (Stripe, PayPal, M-Pesa)
- [x] Business Profile verification tiers
- [x] Featured Sellers section
- [x] Region coordinates support
- [x] Gallery system (backend)
- [x] Social links (backend)

### P1 (High Priority) - Pending
- [ ] Frontend UI for galleries (add/delete images/videos)
- [ ] Frontend UI for social links editing
- [ ] Cover image upload UI (1200x400)
- [ ] Premium subscription purchase flow UI
- [ ] Admin UI for managing business profiles

### P2 (Medium Priority) - Pending
- [ ] Brand color picker UI
- [ ] Opening hours editor UI

### Future/Backlog
- [ ] Subscription auto-renewal
- [ ] Invoice generation
- [ ] Email notifications for subscription events
- [ ] SEO sitemap generation

## Key Files Reference
- `/app/backend/premium_subscription_system.py` - Payment integration
- `/app/backend/business_profile_system.py` - Gallery & social links
- `/app/backend/location_system.py` - Region coordinates
- `/app/frontend/app/(tabs)/index.tsx` - Featured Sellers section
- `/app/frontend/app/business/edit.tsx` - Business profile form
- `/app/frontend/app/business/[slug].tsx` - Public profile page

## Environment Variables Required
```
STRIPE_API_KEY=sk_test_xxx (already configured)
PAYPAL_CLIENT_ID=xxx (optional)
MPESA_CONSUMER_KEY=xxx (optional)
MPESA_CONSUMER_SECRET=xxx (optional)
```

## Test Reports
- `/app/test_reports/iteration_62.json` - Business Profile MVP
- `/app/test_reports/iteration_63.json` - Verification tiers & Featured Sellers
