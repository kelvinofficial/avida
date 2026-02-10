# Product Requirements Document - Avida Marketplace

## Original Problem Statement
Build a local marketplace application (Avida) with:
1. Location-based filtering (Country > Region selection)
2. Business Profile feature for verified sellers
3. Premium subscription tiers with payment integration

## What's Been Implemented

### 2026-02-10: Complete Frontend UI for All Features
**COMPLETED**

#### Premium Subscription Purchase Flow
- Package selection cards (Monthly $29.99, Quarterly $79.99, Yearly $249.99)
- Stripe checkout integration with redirect
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

## Tech Stack
- Frontend: React Native + Expo (web), TypeScript
- Backend: Python FastAPI, MongoDB
- Payments: Stripe, PayPal, M-Pesa
- Storage: Base64 images in MongoDB

## Status

### Completed ✅
- [x] Payment integration backend (Stripe, PayPal, M-Pesa)
- [x] Business profile verification tiers
- [x] Featured sellers section
- [x] Region coordinates
- [x] Gallery system (backend + frontend)
- [x] Social links (backend + frontend)
- [x] Cover image upload
- [x] Premium subscription UI
- [x] Admin management page

### Future/Backlog
- [ ] PayPal SDK button integration (currently shows config only)
- [ ] M-Pesa callback handling in production
- [ ] Subscription auto-renewal
- [ ] Invoice/receipt generation
- [ ] Email notifications for payment events
- [ ] SEO sitemap generation for business profiles

## Key Files Reference
- `/app/frontend/app/business/edit.tsx` - Full business profile editor
- `/app/frontend/app/admin/business-profiles.tsx` - Admin management
- `/app/frontend/app/premium/success.tsx` - Payment success page
- `/app/backend/premium_subscription_system.py` - Payment integration
- `/app/backend/business_profile_system.py` - Gallery & profiles

## Environment Variables
```
STRIPE_API_KEY=sk_test_xxx (configured)
PAYPAL_CLIENT_ID=xxx (optional)
MPESA_CONSUMER_KEY=xxx (optional)
MPESA_CONSUMER_SECRET=xxx (optional)
```
