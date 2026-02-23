# Avito Web Marketplace - New Job Specification

## Project Overview
Create a modern Next.js web marketplace application for **avito.co.tz** that connects to an existing FastAPI backend.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand
- **API Client**: Axios or fetch
- **Authentication**: JWT tokens (stored in httpOnly cookies)
- **Charts**: Recharts
- **Tables**: TanStack Table
- **Forms**: React Hook Form + Zod validation

## Design Requirements
- **Theme**: Modern, clean design optimized for desktop/laptop
- **Colors**: Professional marketplace aesthetic (not the green mobile app theme)
- **Typography**: Clean sans-serif fonts
- **Layout**: Full-width with max-width container, sidebar navigation for dashboard

## Backend API
**Base URL**: `https://homepage-fix-8.preview.emergentagent.com/api`
(Will be updated to production URL after deployment)

**API Documentation**: Available at `/docs` (Swagger UI)

### Key API Endpoints

#### Authentication
```
POST /api/auth/register       - User registration
POST /api/auth/login          - User login (returns JWT token)
POST /api/auth/google         - Google OAuth
POST /api/auth/forgot-password - Password reset request
POST /api/auth/reset-password  - Password reset
GET  /api/auth/me             - Get current user (requires token)
```

#### Listings
```
GET  /api/listings            - Get listings (with filters)
GET  /api/listings/{id}       - Get single listing
POST /api/listings            - Create listing (auth required)
PUT  /api/listings/{id}       - Update listing (auth required)
DELETE /api/listings/{id}     - Delete listing (auth required)
GET  /api/feed/listings       - Get optimized feed (cached)
```

#### Categories
```
GET  /api/categories          - Get all categories
GET  /api/categories/{id}     - Get category with subcategories
```

#### Search
```
GET  /api/listings?q={query}&category={cat}&location={loc}&min_price={min}&max_price={max}
GET  /api/popular-searches    - Get trending searches
```

#### User Profile
```
GET  /api/profile/{user_id}   - Get public profile
PUT  /api/profile             - Update own profile (auth required)
GET  /api/profile/my-listings - Get user's listings
```

#### Messaging
```
GET  /api/conversations       - Get user's conversations
GET  /api/conversations/{id}  - Get conversation messages
POST /api/conversations/{id}/messages - Send message
```

#### Favorites
```
GET  /api/favorites           - Get saved listings
POST /api/favorites/{listing_id} - Save listing
DELETE /api/favorites/{listing_id} - Remove from saved
```

#### Notifications
```
GET  /api/notifications       - Get notifications
PUT  /api/notifications/{id}/read - Mark as read
GET  /api/notification-preferences - Get preferences
PUT  /api/notification-preferences - Update preferences
```

#### Admin (requires admin role)
```
GET  /api/admin/stats         - Dashboard stats
GET  /api/admin/users         - List users
PUT  /api/admin/users/{id}    - Update user
GET  /api/admin/analytics/*   - Analytics endpoints
GET  /api/admin/vouchers      - Voucher management
POST /api/admin/challenges    - Create challenges
```

#### Blog
```
GET  /api/blog/posts          - Get blog posts
GET  /api/blog/posts/{slug}   - Get single post
```

#### Business Profiles
```
GET  /api/business/{slug}     - Get business profile
```

## Pages to Build

### 🌐 Public Pages (No Auth Required)

1. **Homepage** (`/`)
   - Hero section with search
   - Featured categories
   - Recent/trending listings grid
   - Call-to-action for sellers

2. **Search Results** (`/search`)
   - Filters sidebar (category, price, location)
   - Listings grid with pagination
   - Sort options (newest, price, etc.)

3. **Listing Detail** (`/listing/[id]`)
   - Image gallery
   - Price, description, attributes
   - Seller info card
   - Contact seller button
   - Related listings

4. **Category Page** (`/category/[slug]`)
   - Category header
   - Subcategories
   - Filtered listings

5. **Seller Profile** (`/seller/[id]`)
   - Seller info, ratings, badges
   - Seller's listings
   - Contact button

6. **Blog** (`/blog`, `/blog/[slug]`)
   - Blog listing
   - Individual blog post

7. **Static Pages**
   - About (`/about`)
   - Contact (`/contact`)
   - FAQ (`/faq`)
   - Safety Tips (`/safety`)
   - Terms & Privacy

### 👤 User Pages (Auth Required)

8. **Authentication**
   - Login (`/login`)
   - Register (`/register`)
   - Forgot Password (`/forgot-password`)

9. **Dashboard** (`/dashboard`)
   - Overview stats
   - Recent activity
   - Quick actions

10. **My Listings** (`/dashboard/listings`)
    - List of user's listings
    - Edit/delete actions
    - Status indicators

11. **Create/Edit Listing** (`/dashboard/listings/new`, `/dashboard/listings/[id]/edit`)
    - Multi-step form
    - Image upload
    - Category selection
    - Location picker

12. **Messages** (`/dashboard/messages`)
    - Conversation list
    - Chat interface

13. **Saved Items** (`/dashboard/saved`)
    - Grid of saved listings

14. **Profile Settings** (`/dashboard/settings`)
    - Edit profile
    - Change password
    - Notification preferences

15. **Orders/Purchases** (`/dashboard/orders`)
    - Purchase history
    - Order status

### 🔐 Admin Dashboard (Admin Role Required)

16. **Admin Home** (`/admin`)
    - Key metrics cards
    - Charts (users, listings, revenue)
    - Recent activity

17. **User Management** (`/admin/users`)
    - Users table with search/filter
    - User detail modal
    - Verify/ban actions

18. **Listings Management** (`/admin/listings`)
    - Pending approvals
    - Reported listings
    - Bulk actions

19. **Analytics** (`/admin/analytics`)
    - Traffic charts
    - Conversion funnels
    - Geographic data

20. **Vouchers** (`/admin/vouchers`)
    - Create/edit vouchers
    - Usage statistics

21. **Challenges** (`/admin/challenges`)
    - Badge challenges
    - Participation stats

22. **Business Profiles** (`/admin/business`)
    - Pending verifications
    - Profile management

## Component Structure

```
/app
├── (public)/
│   ├── page.tsx              # Homepage
│   ├── search/page.tsx
│   ├── listing/[id]/page.tsx
│   ├── category/[slug]/page.tsx
│   ├── seller/[id]/page.tsx
│   ├── blog/
│   └── [...static pages]
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── forgot-password/page.tsx
├── dashboard/
│   ├── layout.tsx            # Dashboard layout with sidebar
│   ├── page.tsx              # Dashboard home
│   ├── listings/
│   ├── messages/
│   ├── saved/
│   └── settings/
├── admin/
│   ├── layout.tsx            # Admin layout
│   ├── page.tsx              # Admin home
│   ├── users/
│   ├── analytics/
│   └── [...admin pages]
└── layout.tsx                # Root layout

/components
├── ui/                       # shadcn components
├── listings/
│   ├── ListingCard.tsx
│   ├── ListingGrid.tsx
│   └── ListingFilters.tsx
├── layout/
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── Sidebar.tsx
└── shared/
    ├── SearchBar.tsx
    ├── CategoryNav.tsx
    └── LoadingStates.tsx

/lib
├── api.ts                    # API client
├── auth.ts                   # Auth utilities
└── utils.ts                  # Helper functions

/store
├── authStore.ts              # Auth state
├── cartStore.ts              # Cart/saved items
└── uiStore.ts                # UI state
```

## Environment Variables

```env
NEXT_PUBLIC_API_URL=https://[backend-url]/api
NEXT_PUBLIC_SITE_URL=https://avito.co.tz
NEXT_PUBLIC_GOOGLE_CLIENT_ID=[if using Google OAuth]
```

## SEO Requirements

- Server-side rendering for public pages
- Dynamic meta tags per page
- Open Graph tags for social sharing
- Structured data (JSON-LD) for listings
- Sitemap generation
- robots.txt

## Authentication Flow

1. User logs in → receives JWT token
2. Token stored in httpOnly cookie
3. Token sent with each API request in Authorization header
4. Token refresh handled automatically
5. Middleware protects dashboard/admin routes

## Key Features to Implement

### Phase 1: Core Marketplace
- [ ] Homepage with search
- [ ] Listing browsing & detail pages
- [ ] User authentication
- [ ] Basic dashboard
- [ ] Create/edit listings

### Phase 2: User Features
- [ ] Messaging system
- [ ] Favorites/saved items
- [ ] User profiles
- [ ] Notifications

### Phase 3: Admin Dashboard
- [ ] Admin authentication
- [ ] User management
- [ ] Analytics dashboard
- [ ] Content moderation

### Phase 4: Enhancements
- [ ] Blog integration
- [ ] Business profiles
- [ ] Advanced search
- [ ] SEO optimization

## Design Inspiration

Modern marketplace examples:
- Craigslist redesign concepts
- Facebook Marketplace web
- OLX web interface
- Carousell web

Dashboard inspiration:
- Vercel dashboard
- Linear app
- Notion admin

## Notes for Development

1. **API is ready** - All endpoints documented above are already built and working
2. **Auth tokens** - Use Bearer token in Authorization header
3. **Image handling** - Images are base64 encoded in the current system
4. **Pagination** - Most list endpoints support `?limit=X&offset=Y`
5. **Error handling** - API returns standard error format: `{"detail": "error message"}`

## Custom Domain Setup

After deployment:
1. Go to Emergent deployment settings
2. Add custom domain: `avito.co.tz`
3. Configure DNS:
   - Add CNAME record pointing to Emergent
   - Or A record if provided
4. SSL will be auto-provisioned

---

## How to Start New Job

1. Create new job in Emergent
2. Paste this specification as the initial prompt
3. The agent will build the Next.js web app
4. Deploy and configure custom domain
