# Application Separation Guide: Mobile App vs Web Dashboard

## Overview
This document identifies which files belong to the **Mobile App** vs the **Web/Admin Dashboard** for separation into two different Emergent jobs.

---

## ARCHITECTURE RECOMMENDATION

### Option A: Shared Backend (Recommended)
```
┌─────────────────────────────────────────────────────────────────┐
│                        JOB 1 (Current)                          │
│  React Native/Expo Mobile App + FastAPI Backend                 │
│  - All mobile screens                                           │
│  - Backend APIs (shared by both apps)                           │
│  - MongoDB database                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ API calls
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        JOB 2 (New)                              │
│  React Web Dashboard (Next.js or Vite)                          │
│  - Admin dashboard pages                                        │
│  - Web-only marketplace pages                                   │
│  - Custom domain: dashboard.yourdomain.com                      │
│  - Connects to Job 1's backend API                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## FILE CATEGORIZATION

### 🟢 MOBILE APP (Keep in Current Job)

#### Core Mobile Screens (`/app/frontend/app/`)
```
(tabs)/
├── _layout.tsx          # Tab navigation for mobile
├── index.tsx            # Home feed
├── messages.tsx         # Messages list
├── post-placeholder.tsx # Post tab placeholder
├── profile.tsx          # User profile
├── saved.tsx            # Saved listings
└── streak-leaderboard.tsx

# User flows
login.tsx
register.tsx
forgot-password.tsx
reset-password.tsx
verify-email.tsx
signout.tsx

# Listing flows
listing/[id].tsx         # Listing detail
post/index.tsx           # Create listing
post/category.tsx        # Category selection
category/[id].tsx        # Category listings
search.tsx               # Search screen

# Chat
chat/[id].tsx            # Chat conversation

# Profile sections
profile/edit.tsx
profile/my-listings.tsx
profile/orders.tsx
profile/purchases.tsx
profile/sales.tsx
profile/invoices.tsx
profile/badges.tsx
profile/recently-viewed.tsx
profile/saved.tsx
profile/verify-email.tsx
profile/verify-phone.tsx
profile/verify-id.tsx
profile/public/[id].tsx
profile/[id]/badges.tsx

# Settings
settings.tsx
settings/2fa.tsx
settings/alerts.tsx
settings/app-lock.tsx
settings/appearance.tsx
settings/blocked-users.tsx
settings/change-password.tsx
settings/currency.tsx
settings/language.tsx
settings/sessions.tsx
settings/storage.tsx

# Notifications
notifications.tsx
notification-preferences.tsx

# Features
offers.tsx
challenges.tsx
streaks.tsx
leaderboard.tsx
smart-alerts.tsx

# Commerce
checkout/[listing_id].tsx
checkout/pending.tsx
checkout/success.tsx
boost/[listing_id].tsx
credits/index.tsx
premium/success.tsx

# Miscellaneous
contact.tsx
faq.tsx
help.tsx
safety-tips.tsx
debug-api.tsx
```

#### Mobile-Specific Components (`/app/frontend/src/`)
```
components/
├── AnimatedSplashScreen.tsx  # Mobile splash
├── AuthPrompt.tsx
├── ListingCard.tsx
├── LocationPicker.tsx        # Mobile location picker
├── LocationOnboarding.tsx
├── RadiusSelector.tsx
├── SuccessModal.tsx
├── home/                     # Home feed components
├── feed/                     # Feed components
├── listings/                 # Listing components
├── badges/                   # Badge components
├── skeletons/                # Loading skeletons
└── auto/                     # Auto motors components

hooks/
├── useHomeData.ts
├── useInstantListingsFeed.ts
├── useResponsive.ts          # For responsive mobile/tablet
└── ... (all hooks)

store/
├── authStore.ts              # Auth state (shared)
└── ... (all stores)

utils/
├── api.ts                    # API client (shared)
├── timeFormatter.ts
└── ... (all utils)
```

---

### 🔵 WEB/ADMIN DASHBOARD (Move to New Job)

#### Admin Dashboard Pages (`/app/frontend/app/admin/`)
```
admin/
├── _layout.tsx              # Admin layout
├── index.tsx                # Admin home
├── analytics.tsx            # Platform analytics  (~24KB)
├── users.tsx                # User management     (~22KB)
├── businessProfiles.tsx     # Business profiles   (~20KB)
├── vouchers.tsx             # Voucher management  (~20KB)
├── challenges.tsx           # Challenge management(~36KB)
└── icons.tsx (if exists)    # Attribute icons
```

#### Web-Optimized Pages (Could be Web-Only)
```
blog/
├── index.tsx                # Blog listing
└── [slug].tsx               # Blog post detail

business/
├── [slug].tsx               # Business profile page
└── edit.tsx                 # Business editor

sellers/
└── index.tsx                # Seller directory

property/                    # Property listings (web-optimized)
├── index.tsx
├── [id].tsx
├── post.tsx
├── boost/
└── chat/

auto/                        # Auto motors (web-optimized)
├── index.tsx
├── [id].tsx
├── post.tsx
└── chat/

badges/
├── _layout.tsx
└── seasonal-gallery.tsx     # Badge showcase

performance/
└── [listing_id].tsx         # Listing performance
```

---

### 🟡 SHARED (Used by Both - Backend)

#### Backend Routes (`/app/backend/routes/`)
All backend routes are shared - the new web dashboard will call these APIs:

```
# Core APIs (Essential)
auth.py                      # Authentication
users.py                     # User management
listings.py                  # Listings CRUD
conversations.py             # Chat/messaging
notifications.py             # Notifications
profile.py                   # User profiles
favorites.py                 # Saved items
feed.py                      # Feed generation

# Admin APIs (Used by dashboard)
admin.py                     # Admin operations
admin_locations.py           # Location management
attribute_icons.py           # Icon management
badge_challenges.py          # Challenge management

# Feature APIs
categories.py                # Category data
badges.py                    # Badge system
streaks.py                   # Streak system
challenges.py                # Challenges

# Commerce APIs
# (payment_system.py, boost_routes.py, etc.)

# SEO/Analytics APIs
seo_settings.py
seo_analytics.py
ai_seo.py
```

---

## STEP-BY-STEP EXTRACTION PLAN

### Phase 1: Prepare Backend for Sharing

1. **Enable CORS for new domain**
   - Add the new dashboard domain to CORS allowed origins in `server.py`
   - Example: `https://dashboard.yourdomain.com`

2. **Document API endpoints**
   - The backend already exposes `/docs` for API documentation
   - New dashboard will use these same endpoints

### Phase 2: Create New Web Dashboard Job

1. **Create new Emergent job** for web dashboard
2. **Choose framework**: 
   - **Next.js** (recommended for SEO, SSR)
   - **Vite + React** (lighter, faster development)

3. **Set environment variables**:
   ```env
   REACT_APP_API_URL=https://your-mobile-app.preview.emergentagent.com/api
   # Or your production backend URL
   ```

### Phase 3: Migrate Admin Pages

**Files to recreate in new dashboard (convert from React Native to React Web):**

| React Native File | New Web Component |
|-------------------|-------------------|
| `admin/index.tsx` | `pages/admin/index.tsx` |
| `admin/analytics.tsx` | `pages/admin/analytics.tsx` |
| `admin/users.tsx` | `pages/admin/users.tsx` |
| `admin/businessProfiles.tsx` | `pages/admin/business-profiles.tsx` |
| `admin/vouchers.tsx` | `pages/admin/vouchers.tsx` |
| `admin/challenges.tsx` | `pages/admin/challenges.tsx` |

**Conversion notes:**
- Replace `View` → `div`
- Replace `Text` → `p`, `span`, `h1-h6`
- Replace `TouchableOpacity` → `button`
- Replace `StyleSheet.create()` → CSS/Tailwind
- Replace `expo-router` → Next.js router or React Router
- Keep API calls the same (they call the shared backend)

### Phase 4: Configure Custom Domain

After deploying the new web dashboard:
1. Go to deployment settings in Emergent
2. Add custom domain: `dashboard.yourdomain.com`
3. Configure DNS (CNAME record pointing to Emergent)
4. SSL will be automatically provisioned

---

## RECOMMENDED TECH STACK FOR NEW WEB DASHBOARD

```
Framework:     Next.js 14 (App Router)
Styling:       Tailwind CSS + shadcn/ui
State:         Zustand (same as mobile)
API Client:    Axios or fetch (same patterns)
Auth:          JWT tokens (same as mobile)
Charts:        Recharts or Chart.js
Tables:        TanStack Table
Forms:         React Hook Form + Zod
```

---

## FILES SIZE SUMMARY

### Admin Dashboard Total: ~133KB of React Native code
- `analytics.tsx`: 24KB
- `users.tsx`: 22KB  
- `businessProfiles.tsx`: 20KB
- `vouchers.tsx`: 20KB
- `challenges.tsx`: 36KB
- `index.tsx`: 10KB
- `_layout.tsx`: 0.4KB

### These are substantial pages that would benefit from:
- Full desktop optimization
- Better data tables
- Enhanced charts/visualizations
- Keyboard shortcuts
- Custom domain/branding

---

## CURRENT JOB CLEANUP (After Migration)

Once web dashboard is working in the new job, remove from current job:
```bash
# Remove admin folder
rm -rf /app/frontend/app/admin/

# Optionally remove web-heavy pages if not needed on mobile:
# rm -rf /app/frontend/app/blog/
# rm -rf /app/frontend/app/business/
# rm -rf /app/frontend/app/sellers/
```

---

## QUESTIONS FOR USER

1. **Admin access control**: Should the web dashboard have a separate admin login, or use the same auth as the mobile app?

2. **Which pages to include in web dashboard?**
   - Admin only?
   - Admin + Blog?
   - Admin + Blog + Business profiles?
   - Full marketplace web version?

3. **Design preference for dashboard**:
   - Match current mobile app design?
   - Fresh modern dashboard design?
   - Specific design inspiration?

4. **Custom domain**: What domain do you plan to use? (e.g., `admin.avida.co.tz`, `dashboard.avida.co.tz`)
