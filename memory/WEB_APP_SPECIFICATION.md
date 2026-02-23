# Avito Web Platform - Complete Specification

## 🎉 DISCOVERY: Existing Admin Dashboard Found!

You already have a comprehensive **Next.js Admin Dashboard** at `/app/admin-dashboard/` with 64+ pages!

### Existing Admin Features (Already Built):

#### 📊 Analytics & Reporting
- Analytics Dashboard
- Cohort Analytics  
- Search Analytics
- SEO Analytics
- Notification Analytics
- Executive Summary
- Reports

#### 🔍 SEO & Growth Engine
- SEO Tools
- SEO A/B Testing
- Advanced SEO
- Multilang SEO
- ASO Engine (App Store Optimization)
- Authority Building
- Backlink Monitoring
- Content Engine
- Content Calendar
- Social Distribution
- Growth Engine

#### 🛍️ Marketplace Management
- Listings Management
- Listing Moderation
- Categories
- Attributes/Icons
- Form Config (Dynamic Forms)
- Photography Guides
- Safety Tips

#### 👥 User Management
- Users
- Verification
- Business Profiles
- Team Management
- Badges
- Challenges

#### 💰 Commerce
- Commission System
- Escrow
- Boosts
- Vouchers
- Invoices

#### 🔔 Notifications
- Notifications
- Smart Notifications
- SMS Notifications

#### ⚙️ Settings & Config
- Platform Config
- Config Manager
- Feature Settings
- Image Settings
- Integrations
- Cookie Consent
- reCAPTCHA

#### 🛡️ Compliance & Security
- Compliance
- Audit Logs
- Sandbox Mode
- Moderation
- Tickets

#### 🧪 Testing & QA
- A/B Testing
- QA Reliability
- Polls & Surveys
- Segment Builder

#### 📍 Locations
- Locations Management

#### 🎯 Marketing
- Banners
- Ads
- URL Shortener

#### 🤖 AI Features
- AI Analyzer
- AI Personalization

---

## Project Overview

Create a **public-facing web marketplace** for **avito.co.tz** that:
1. Connects to the existing FastAPI backend
2. Integrates with the existing Admin Dashboard (can be embedded or linked)

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand
- **Authentication**: JWT tokens

## Backend API
**Base URL**: `https://homepage-fix-8.preview.emergentagent.com/api`
**API Documentation**: `/docs` (Swagger UI)

---

## PAGES TO BUILD (Complete Web Marketplace)

### 🌐 Public Pages (No Auth Required)

#### 1. Homepage (`/`)
- Hero section with search bar
- Featured categories grid
- Recent/trending listings
- Call-to-action for sellers
- SEO optimized with structured data

#### 2. Search Results (`/search`)
- Filters sidebar:
  - Categories (from `/api/categories`)
  - Price range
  - Location (from `/api/locations`)
  - Condition
  - Custom attributes per category
- Listings grid with pagination
- Sort options (newest, price low/high, popular)
- Save search functionality

#### 3. Listing Detail (`/listing/[id]`)
- Image gallery with lightbox
- Price, description, attributes
- Seller info card with badges
- "Contact Seller" / "Make Offer" buttons
- Related listings
- Share buttons
- Report listing option
- SEO: JSON-LD structured data

#### 4. Category Page (`/category/[slug]`)
- Category hero with description
- Subcategories navigation
- Filtered listings
- Popular searches in category

#### 5. Seller/Public Profile (`/seller/[id]`, `/profile/public/[id]`)
- Seller info, rating, badges
- Verification status
- Seller's active listings
- Reviews/ratings
- Contact button
- Badge showcase

#### 6. Blog (`/blog`, `/blog/[slug]`)
- Blog listing page
- Individual blog post
- Related posts
- Categories/tags
- SEO optimized

#### 7. Sellers Directory (`/sellers`)
- Browse all sellers
- Filter by category, location, rating
- Featured/verified sellers

#### 8. Static Pages
- About Us (`/about`)
- Contact (`/contact`)
- FAQ (`/faq`)
- Safety Tips (`/safety`)
- Terms of Service (`/terms`)
- Privacy Policy (`/privacy`)
- How It Works (`/how-it-works`)
- Help Center (`/help`)

---

### 🚗 Specialized Verticals

#### 9. Auto Motors (`/auto`)
- Auto listings homepage
- Auto listing detail (`/auto/[id]`)
- Post auto listing (`/auto/post`)
- Auto-specific filters (make, model, year, mileage)

#### 10. Property/Real Estate (`/property`)
- Property listings homepage
- Property detail (`/property/[id]`)
- Post property (`/property/post`)
- Property-specific filters (bedrooms, bathrooms, size)

---

### 👤 User Authentication

#### 11. Authentication Pages
- Login (`/login`)
- Register (`/register`)
- Forgot Password (`/forgot-password`)
- Reset Password (`/reset-password`)
- Email Verification (`/verify-email`)
- Sign Out (`/signout`)

---

### 📊 User Dashboard

#### 12. Dashboard Home (`/dashboard`)
- Overview stats (views, messages, listings, earnings)
- Recent activity feed
- Quick actions
- Notifications preview
- Performance summary

#### 13. My Listings (`/dashboard/listings`)
- List of user's listings with status (active, pending, sold)
- Create new listing button
- Edit/delete/renew/boost actions
- Analytics per listing
- Bulk actions

#### 14. Create Listing (`/dashboard/listings/new`)
- Category selection (`/post/category`)
- Multi-step form:
  - Dynamic attributes (from form config API)
  - Image upload with optimization
  - Location picker (country → region → city)
  - Price & currency
  - Condition selection
  - Description with AI suggestions
- Preview before publish

#### 15. Edit Listing (`/dashboard/listings/[id]/edit`)
- Same as create but pre-filled
- Update images
- Change status

#### 16. Listing Performance (`/dashboard/listings/[id]/performance`)
- Views over time chart
- Engagement metrics
- Comparison with similar listings
- Optimization suggestions

---

### 💬 Communication

#### 17. Messages (`/dashboard/messages`)
- Conversation list with unread count
- Real-time chat interface
- Quick replies
- Image/file sharing
- Voice notes (if supported)
- Block/report user
- Emoji picker

#### 18. Chat (`/dashboard/messages/[id]`)
- Full chat interface
- Message history
- Typing indicators
- Read receipts

#### 19. Notifications (`/dashboard/notifications`)
- All notifications list
- Filter by type
- Mark as read/unread
- Notification preferences link

#### 20. Notification Preferences (`/dashboard/notification-preferences`)
- Email notification toggles
- Push notification toggles
- SMS notification toggles
- Frequency settings

---

### 💰 Commerce & Transactions

#### 21. Offers (`/dashboard/offers`)
- Offers received (as seller)
- Offers sent (as buyer)
- Accept/reject/counter offer
- Offer history

#### 22. Sales (`/dashboard/sales`)
- Items sold
- Revenue stats
- Pending payments
- Completed transactions

#### 23. Purchases (`/dashboard/purchases`)
- Items bought
- Order status tracking
- Payment history
- Leave reviews

#### 24. Orders (`/dashboard/orders`)
- Combined view of sales + purchases
- Order details
- Shipping/delivery status

#### 25. Invoices (`/dashboard/invoices`)
- Download invoices
- Transaction receipts
- Tax documents

#### 26. Checkout (`/checkout/[listing_id]`)
- Payment method selection
- Shipping/delivery options
- Order summary
- Escrow option

#### 27. Checkout Status
- Pending (`/checkout/pending`)
- Success (`/checkout/success`)

---

### 💎 Premium & Monetization

#### 28. Credits (`/dashboard/credits`)
- Current credit balance
- Buy credits packages
- Credit usage history
- Auto-refill settings

#### 29. Boost Listing (`/boost/[listing_id]`)
- Boost package selection
- Duration options
- Payment
- Boost analytics

#### 30. Premium/Subscription (`/premium`)
- Premium plans comparison
- Subscribe/upgrade
- Premium benefits
- Success page (`/premium/success`)

---

### 🏆 Gamification

#### 31. Badges (`/dashboard/badges`, `/profile/badges`)
- Earned badges showcase
- Badge progress
- How to earn badges
- Share badges

#### 32. Challenges (`/challenges`)
- Active challenges
- Challenge progress
- Rewards
- Leaderboard

#### 33. Streaks (`/streaks`)
- Current streak
- Streak history
- Streak rewards
- Tips to maintain streak

#### 34. Leaderboard (`/leaderboard`)
- Top sellers
- Most active users
- Weekly/monthly rankings
- Share ranking

---

### ❤️ Saved & History

#### 35. Saved Items (`/dashboard/saved`)
- Grid of saved/favorited listings
- Remove from saved
- Price drop alerts
- Organize in collections

#### 36. Recently Viewed (`/dashboard/recently-viewed`)
- Browsing history
- Clear history
- Quick re-access

#### 37. Smart Alerts (`/smart-alerts`)
- Saved searches
- Price alerts
- New listing alerts
- Manage alerts

---

### 👤 Profile & Settings

#### 38. Edit Profile (`/dashboard/profile/edit`)
- Profile photo
- Name, bio
- Contact info
- Social links
- Business profile upgrade

#### 39. Public Profile Preview (`/profile/public/[id]`)
- How others see your profile

#### 40. Verification
- Email verification (`/profile/verify-email`)
- Phone verification (`/profile/verify-phone`)
- ID verification (`/profile/verify-id`)

#### 41. Settings (`/dashboard/settings`)
- Account settings main page

#### 42. Settings Sub-pages
- Change Password (`/settings/change-password`)
- Two-Factor Auth (`/settings/2fa`)
- Appearance/Theme (`/settings/appearance`)
- Language (`/settings/language`)
- Currency (`/settings/currency`)
- Blocked Users (`/settings/blocked-users`)
- Active Sessions (`/settings/sessions`)
- Storage/Data (`/settings/storage`)
- App Lock (`/settings/app-lock`) - mobile only
- Alerts (`/settings/alerts`)

---

### 🏢 Business Features

#### 43. Business Profile (`/business/[slug]`)
- Business page view
- Business listings
- Business info, hours, location
- Reviews

#### 44. Edit Business (`/business/edit`)
- Business profile editor
- Logo, banner
- Description
- Contact info
- Verification

---

### 🔧 Utility Pages

#### 45. Debug/API Test (`/debug-api`) - Dev only
- API testing interface

---

### 🔐 Admin Access

The existing admin dashboard at `/app/admin-dashboard/` should be:
- **Option A**: Deployed separately and linked (recommended)
- **Option B**: Embedded into the main web app under `/admin/*`

---

## API ENDPOINTS

### Authentication
```
POST /api/auth/register
POST /api/auth/login  
POST /api/auth/google
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/me
POST /api/auth/verify-email
```

### Listings
```
GET  /api/listings
GET  /api/listings/{id}
POST /api/listings
PUT  /api/listings/{id}
DELETE /api/listings/{id}
GET  /api/feed/listings
POST /api/listings/{id}/boost
```

### Categories & Attributes
```
GET  /api/categories
GET  /api/categories/{id}
GET  /api/categories/{id}/form-config
GET  /api/attribute-icons
```

### Search
```
GET  /api/listings?q={query}&category={cat}&location={loc}&min_price={min}&max_price={max}
GET  /api/popular-searches
GET  /api/saved-filters
POST /api/saved-filters
```

### Locations
```
GET  /api/locations/countries
GET  /api/locations/regions?country_code={code}
GET  /api/locations/cities/by-region?region_code={code}
```

### User Profile
```
GET  /api/profile/{user_id}
PUT  /api/profile
GET  /api/profile/my-listings
GET  /api/profile/badges
```

### Messaging
```
GET  /api/conversations
GET  /api/conversations/{id}
POST /api/conversations/{id}/messages
PUT  /api/conversations/{id}/read
```

### Offers
```
GET  /api/offers
POST /api/offers
PUT  /api/offers/{id}
```

### Favorites
```
GET  /api/favorites
POST /api/favorites/{listing_id}
DELETE /api/favorites/{listing_id}
```

### Notifications
```
GET  /api/notifications
PUT  /api/notifications/{id}/read
GET  /api/notification-preferences
PUT  /api/notification-preferences
```

### Blog
```
GET  /api/blog/posts
GET  /api/blog/posts/{slug}
```

### SEO (for SSR)
```
GET  /api/seo-settings
GET  /api/seo-settings/page/{page_type}/{page_id}
```

---

## SEO REQUIREMENTS

### Server-Side Rendering
- All public pages must be SSR for SEO
- Dynamic meta tags per page
- Proper heading hierarchy (H1, H2, H3)

### Meta Tags
```html
<title>{dynamic title}</title>
<meta name="description" content="{dynamic description}">
<meta name="keywords" content="{from API}">
<link rel="canonical" href="{canonical URL}">
```

### Open Graph
```html
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:image" content="{listing image or default}">
<meta property="og:url" content="{page URL}">
<meta property="og:type" content="website|product">
```

### Structured Data (JSON-LD)
- Product schema for listings
- Organization schema for homepage
- BreadcrumbList for navigation
- FAQ schema for FAQ page
- Article schema for blog posts

### Technical SEO
- Sitemap generation (`/sitemap.xml`)
- robots.txt (`/robots.txt`)
- Proper URL structure
- Image alt texts
- Loading performance (Core Web Vitals)

---

## DESIGN REQUIREMENTS

### Theme
- Modern, clean, professional
- Light theme by default with dark mode option
- NOT the green mobile app theme - fresh design

### Typography
- Clean sans-serif fonts (Inter, Plus Jakarta Sans)
- Clear hierarchy

### Layout
- Responsive: Mobile, Tablet, Desktop
- Max-width container (1280px)
- Sidebar navigation for dashboard

### Components
- shadcn/ui as base
- Custom listing cards
- Image galleries
- Chat interface
- Form components with validation

---

## ENVIRONMENT VARIABLES

```env
NEXT_PUBLIC_API_URL=https://[backend-url]/api
NEXT_PUBLIC_SITE_URL=https://avito.co.tz
NEXT_PUBLIC_SITE_NAME=Avito Tanzania
NEXT_PUBLIC_DEFAULT_CURRENCY=TZS
NEXT_PUBLIC_DEFAULT_COUNTRY=TZ
NEXT_PUBLIC_GOOGLE_CLIENT_ID=[optional]
```

---

## IMPLEMENTATION PHASES

### Phase 1: Core Public Pages
- [ ] Homepage
- [ ] Listing detail
- [ ] Search/browse
- [ ] Categories
- [ ] Static pages

### Phase 2: Authentication & User Dashboard
- [ ] Login/Register
- [ ] User dashboard
- [ ] My listings
- [ ] Create/edit listing

### Phase 3: Communication
- [ ] Messages/Chat
- [ ] Offers
- [ ] Notifications

### Phase 4: SEO & Polish
- [ ] Full SEO implementation
- [ ] Performance optimization
- [ ] Analytics integration

---

## CUSTOM DOMAIN SETUP

After deployment:
1. Go to Emergent deployment settings
2. Add custom domain: `avito.co.tz`
3. Configure DNS (CNAME or A record)
4. SSL auto-provisioned

---

## NOTES

1. **Admin Dashboard**: Already exists at `/app/admin-dashboard/` - can be deployed separately or integrated
2. **API Ready**: All endpoints documented above are built and working
3. **Auth**: Use Bearer token in Authorization header
4. **Images**: Currently base64 encoded (consider CDN migration later)
5. **WebSocket**: Available for real-time chat at `/ws`

---

## HOW TO START

1. Create new Emergent job
2. Paste this specification
3. Agent builds Next.js marketplace
4. Deploy and configure custom domain: `avito.co.tz`
5. Link to or embed admin dashboard
