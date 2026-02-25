# Avida Tanzania - Web Marketplace Platform Specification

> **Version**: 1.0  
> **Domain**: avida.co.tz  
> **Last Updated**: February 2026

---

## 🏗️ MASTER ARCHITECTURE - SINGLE BACKEND FOR ALL PLATFORMS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SINGLE MASTER BACKEND                                │
│                                                                             │
│   API URL: https://layout-render-fix.emergent.host/api                      │
│   Database: MongoDB Atlas (avidatz.dipxnt9.mongodb.net/classifieds_db)      │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     201 SHARED COLLECTIONS                          │   │
│   │   users, listings, conversations, messages, notifications,          │   │
│   │   badges, challenges, orders, invoices, categories, etc.            │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTPS API Calls
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            │                         │                         │
            ▼                         ▼                         ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
│   📱 MOBILE APP       │ │   🌐 WEB APP          │ │   🔧 ADMIN DASHBOARD  │
│   (React Native/Expo) │ │   (Next.js 14)        │ │   (Next.js 14)        │
│                       │ │                       │ │                       │
│   Platform: iOS/Android│ │   Domain: avida.co.tz │ │   Domain: admin.avida │
│   App Store/Play Store│ │   Public marketplace  │ │   Internal admin panel│
│                       │ │                       │ │                       │
│   SAME API ─────────────► SAME API ─────────────► SAME API               │
│   SAME DATA ────────────► SAME DATA ────────────► SAME DATA              │
│   SAME USERS ───────────► SAME USERS ───────────► SAME USERS             │
└───────────────────────┘ └───────────────────────┘ └───────────────────────┘

✅ Post from Mobile App → Appears on Web App & Admin Dashboard instantly
✅ Post from Web App → Appears on Mobile App & Admin Dashboard instantly
✅ Edit in Admin Dashboard → Reflects on Mobile App & Web App instantly
✅ Single user account works across all platforms
✅ Messages sync in real-time across all platforms
```

---

## 🔗 SHARED RESOURCES (USE THESE EVERYWHERE)

### Master Backend API
```
https://layout-render-fix.emergent.host/api
```

### Master Database
```
mongodb+srv://avida_admin:AvidaTZ@avidatz.dipxnt9.mongodb.net/classifieds_db
```

### Environment Variables (Same for All Platforms)
```env
# API (Same for Mobile, Web, Admin)
API_URL=https://layout-render-fix.emergent.host/api

# Database (Same for all)
MONGODB_URI=mongodb+srv://avida_admin:AvidaTZ@avidatz.dipxnt9.mongodb.net/classifieds_db
DB_NAME=classifieds_db

# Platform-specific URLs
MOBILE_APP_SCHEME=avida://
WEB_APP_URL=https://avida.co.tz
ADMIN_URL=https://admin.avida.co.tz
```

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Backend API Reference](#3-backend-api-reference)
4. [Database Schema](#4-database-schema)
5. [Pages & Features](#5-pages--features)
6. [Component Architecture](#6-component-architecture)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [SEO Requirements](#8-seo-requirements)
9. [Design System](#9-design-system)
10. [Environment Variables](#10-environment-variables)
11. [Third-Party Integrations](#11-third-party-integrations)
12. [Implementation Phases](#12-implementation-phases)
13. [Deployment & Custom Domain](#13-deployment--custom-domain)

---

## 1. Project Overview

### 1.1 Description
Avida Tanzania is a full-featured online marketplace platform for buying and selling goods and services. The web application provides a modern, SEO-optimized interface for users to browse listings, communicate with sellers, and manage their accounts.

### 1.2 Key Features
- **Marketplace**: Browse, search, and filter listings across multiple categories
- **User Accounts**: Registration, authentication, profile management
- **Messaging**: Real-time chat between buyers and sellers
- **Offers & Negotiations**: Make and manage offers on listings
- **Gamification**: Badges, challenges, streaks, and leaderboards
- **Premium Features**: Boosts, credits, and premium subscriptions
- **Admin Dashboard**: Comprehensive admin panel (64+ pages already built)

### 1.3 Existing Infrastructure
- **Backend API**: FastAPI (Python) - Already built and running
- **Database**: MongoDB Atlas (`avidatz.dipxnt9.mongodb.net`)
- **Admin Dashboard**: Next.js 14 - Already built at `/app/admin-dashboard/`
- **Mobile App**: React Native/Expo - Separate deployment

---

## 2. Technology Stack

### 2.1 Frontend (To Build)
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.x | React framework with App Router |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Styling |
| shadcn/ui | Latest | UI components |
| Zustand | 4.x | State management |
| React Query | 5.x | Data fetching & caching |
| React Hook Form | 7.x | Form handling |
| Zod | 3.x | Validation |
| Recharts | 2.x | Charts & analytics |
| Lucide React | Latest | Icons |

### 2.2 Backend (Already Built)
| Technology | Version | Purpose |
|------------|---------|---------|
| FastAPI | 0.100+ | API framework |
| MongoDB | 6.x | Database |
| Python | 3.11 | Runtime |
| Pydantic | 2.x | Data validation |
| Motor | 3.x | Async MongoDB driver |

### 2.3 Third-Party Services
| Service | Purpose |
|---------|---------|
| SendGrid | Transactional emails |
| Firebase FCM | Push notifications |
| PayPal | Payments |
| Flutterwave | Mobile money (M-Pesa) |
| Stripe | Card payments |
| OpenAI GPT-5.2 | AI features |

---

## 3. Backend API Reference

### 3.1 Base URL
```
Production: https://layout-render-fix.emergent.host/api
MongoDB: mongodb+srv://avida_admin:AvidaTZ@avidatz.dipxnt9.mongodb.net/classifieds_db
```

### 3.2 Authentication Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/google` | Google OAuth login | No |
| POST | `/api/auth/forgot-password` | Request password reset | No |
| POST | `/api/auth/reset-password` | Reset password | No |
| POST | `/api/auth/verify-email` | Verify email address | No |
| GET | `/api/auth/me` | Get current user | Yes |
| POST | `/api/auth/logout` | Logout user | Yes |
| POST | `/api/auth/refresh` | Refresh JWT token | Yes |

**Request/Response Example:**
```json
// POST /api/auth/login
// Request
{
  "email": "user@example.com",
  "password": "securepassword"
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://..."
  }
}
```

### 3.3 Listings Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/listings` | Get listings with filters | No |
| GET | `/api/listings/{id}` | Get single listing | No |
| POST | `/api/listings` | Create listing | Yes |
| PUT | `/api/listings/{id}` | Update listing | Yes |
| DELETE | `/api/listings/{id}` | Delete listing | Yes |
| GET | `/api/feed/listings` | Get optimized feed | No |
| POST | `/api/listings/{id}/boost` | Boost listing | Yes |
| POST | `/api/listings/{id}/renew` | Renew listing | Yes |
| GET | `/api/listings/{id}/analytics` | Get listing analytics | Yes |

**Query Parameters for GET /api/listings:**
```
?q=search_term           # Search query
&category=electronics    # Category filter
&subcategory=phones      # Subcategory filter
&location=dar_es_salaam  # Location filter
&min_price=1000          # Minimum price
&max_price=50000         # Maximum price
&condition=new           # Condition filter
&sort=newest|price_asc|price_desc|popular
&limit=20                # Items per page
&offset=0                # Pagination offset
```

### 3.4 Categories Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/categories` | Get all categories | No |
| GET | `/api/categories/{id}` | Get category details | No |
| GET | `/api/categories/{id}/form-config` | Get dynamic form fields | No |
| GET | `/api/attribute-icons` | Get attribute icons | No |

### 3.5 Location Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/locations/countries` | Get countries | No |
| GET | `/api/locations/regions` | Get regions | No |
| GET | `/api/locations/cities/by-region` | Get cities by region | No |

### 3.6 User Profile Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/profile/{user_id}` | Get public profile | No |
| PUT | `/api/profile` | Update own profile | Yes |
| GET | `/api/profile/my-listings` | Get user's listings | Yes |
| GET | `/api/profile/badges` | Get user's badges | Yes |
| POST | `/api/profile/avatar` | Upload avatar | Yes |

### 3.7 Messaging Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/conversations` | Get conversations | Yes |
| GET | `/api/conversations/{id}` | Get conversation | Yes |
| POST | `/api/conversations/{id}/messages` | Send message | Yes |
| PUT | `/api/conversations/{id}/read` | Mark as read | Yes |
| GET | `/api/conversations/unread-count` | Get unread count | Yes |
| POST | `/api/conversations/{id}/mute` | Mute conversation | Yes |
| DELETE | `/api/conversations/{id}` | Delete conversation | Yes |

### 3.8 Offers Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/offers` | Get user's offers | Yes |
| POST | `/api/offers` | Create offer | Yes |
| PUT | `/api/offers/{id}` | Update offer | Yes |
| PUT | `/api/offers/{id}/accept` | Accept offer | Yes |
| PUT | `/api/offers/{id}/reject` | Reject offer | Yes |
| PUT | `/api/offers/{id}/counter` | Counter offer | Yes |

### 3.9 Favorites Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/favorites` | Get saved listings | Yes |
| POST | `/api/favorites/{listing_id}` | Save listing | Yes |
| DELETE | `/api/favorites/{listing_id}` | Remove from saved | Yes |

### 3.10 Notifications Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/notifications` | Get notifications | Yes |
| PUT | `/api/notifications/{id}/read` | Mark as read | Yes |
| PUT | `/api/notifications/read-all` | Mark all as read | Yes |
| GET | `/api/notification-preferences` | Get preferences | Yes |
| PUT | `/api/notification-preferences` | Update preferences | Yes |

### 3.11 Commerce Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/credits/balance` | Get credit balance | Yes |
| GET | `/api/credits/packages` | Get credit packages | No |
| POST | `/api/credits/purchase` | Purchase credits | Yes |
| GET | `/api/boost/pricing` | Get boost pricing | No |
| POST | `/api/boost/{listing_id}` | Boost listing | Yes |
| GET | `/api/orders` | Get orders | Yes |
| POST | `/api/orders` | Create order | Yes |
| GET | `/api/invoices` | Get invoices | Yes |

### 3.12 Gamification Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/badges` | Get all badges | No |
| GET | `/api/badges/user/{user_id}` | Get user's badges | No |
| GET | `/api/challenges` | Get active challenges | Yes |
| POST | `/api/challenges/{id}/join` | Join challenge | Yes |
| GET | `/api/streaks` | Get user streaks | Yes |
| GET | `/api/leaderboard` | Get leaderboard | No |

### 3.13 Blog Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/blog/posts` | Get blog posts | No |
| GET | `/api/blog/posts/{slug}` | Get single post | No |

### 3.14 Search & Analytics

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/popular-searches` | Get trending searches | No |
| GET | `/api/search-suggestions` | Get search suggestions | No |
| POST | `/api/recently-viewed` | Track viewed listing | Yes |
| GET | `/api/recently-viewed` | Get recently viewed | Yes |

---

## 4. Database Schema

### 4.1 Collections Overview
The database contains **201 collections**. Key collections:

### 4.2 Users Collection
```javascript
{
  "_id": ObjectId,
  "id": "user_abc123",
  "email": "user@example.com",
  "password_hash": "...",
  "name": "John Doe",
  "phone": "+255712345678",
  "avatar": "https://...",
  "location": {
    "country": "TZ",
    "region": "DSM",
    "city": "Dar es Salaam"
  },
  "is_verified": true,
  "is_business": false,
  "badges": ["verified_seller", "top_rated"],
  "credits": 100,
  "created_at": ISODate,
  "updated_at": ISODate
}
```

### 4.3 Listings Collection
```javascript
{
  "_id": ObjectId,
  "id": "listing_xyz789",
  "user_id": "user_abc123",
  "title": "iPhone 15 Pro Max",
  "description": "...",
  "price": 2500000,
  "currency": "TZS",
  "negotiable": true,
  "category_id": "electronics",
  "subcategory": "phones",
  "condition": "new",
  "images": ["base64...", "base64..."],
  "location": {
    "country": "TZ",
    "region": "DSM",
    "city": "Dar es Salaam"
  },
  "attributes": {
    "brand": "Apple",
    "storage": "256GB"
  },
  "status": "active",
  "views": 150,
  "favorites_count": 12,
  "is_boosted": false,
  "boost_expires_at": null,
  "created_at": ISODate,
  "updated_at": ISODate
}
```

### 4.4 Conversations Collection
```javascript
{
  "_id": ObjectId,
  "id": "conv_123",
  "listing_id": "listing_xyz789",
  "participants": ["user_abc123", "user_def456"],
  "last_message": {
    "text": "Is this still available?",
    "sender_id": "user_def456",
    "sent_at": ISODate
  },
  "unread_count": {
    "user_abc123": 1,
    "user_def456": 0
  },
  "is_muted": {
    "user_abc123": false,
    "user_def456": false
  },
  "created_at": ISODate,
  "updated_at": ISODate
}
```

### 4.5 Other Key Collections
- `messages` - Chat messages
- `offers` - Price offers
- `favorites` - Saved listings
- `notifications` - User notifications
- `badges` - Badge definitions
- `challenges` - Active challenges
- `orders` - Purchase orders
- `invoices` - Transaction invoices
- `blog_posts` - Blog content
- `categories` - Category definitions
- `form_configs` - Dynamic form configurations
- `attribute_icons` - Category attribute icons

---

## 5. Pages & Features

### 5.1 Public Pages (No Authentication Required)

#### Homepage (`/`)
- Hero section with search bar
- Featured categories grid (8-12 categories)
- Recent listings carousel
- Trending/popular listings
- Location-based suggestions
- Call-to-action for sellers
- Trust badges and stats

#### Search Results (`/search`)
- Search input with suggestions
- Filters sidebar:
  - Category/Subcategory
  - Price range slider
  - Location (Region → City)
  - Condition (New, Like New, Used)
  - Custom attributes per category
- Results grid with pagination
- Sort options: Newest, Price Low-High, Price High-Low, Popular
- Save search functionality
- Map view toggle (optional)

#### Listing Detail (`/listing/[id]`)
- Image gallery with lightbox (swipe, zoom)
- Price display with currency
- Seller info card with:
  - Avatar, name, rating
  - Verification badges
  - Member since date
  - Response rate
- Action buttons:
  - Contact Seller
  - Make Offer
  - Save to Favorites
  - Share
- Listing details table (attributes)
- Description with expandable text
- Location map
- Similar listings carousel
- Seller's other listings
- Report listing option

#### Category Page (`/category/[slug]`)
- Category banner/hero
- Subcategories grid
- Featured listings in category
- Category-specific filters
- SEO-optimized content

#### Seller Profile (`/seller/[id]`)
- Seller info header
- Verification badges
- Rating and reviews
- Active listings grid
- Sold items count
- Member since date
- Contact button
- Report seller option

#### Blog (`/blog`)
- Blog posts grid
- Categories/tags filter
- Featured posts
- Search within blog

#### Blog Post (`/blog/[slug]`)
- Article content
- Author info
- Related posts
- Social share buttons
- Comments (optional)

#### Static Pages
- About Us (`/about`)
- Contact (`/contact`) - Contact form
- FAQ (`/faq`) - Accordion layout
- Safety Tips (`/safety`)
- Terms of Service (`/terms`)
- Privacy Policy (`/privacy`)
- How It Works (`/how-it-works`)
- Help Center (`/help`)

### 5.2 Authentication Pages

#### Login (`/login`)
- Email/password form
- "Remember me" checkbox
- Forgot password link
- Social login (Google)
- Register link

#### Register (`/register`)
- Name, email, password form
- Terms acceptance checkbox
- Email verification sent
- Social signup (Google)

#### Forgot Password (`/forgot-password`)
- Email input
- Success message

#### Reset Password (`/reset-password`)
- New password form
- Password strength indicator

#### Verify Email (`/verify-email`)
- Verification status
- Resend email option

### 5.3 User Dashboard (Authentication Required)

#### Dashboard Home (`/`)
- Welcome message
- Quick stats cards:
  - Active listings
  - Total views
  - Messages
  - Earnings
- Recent activity feed
- Quick actions
- Notifications preview

#### My Listings (`listings`)
- Listings table/grid
- Status filters: All, Active, Pending, Sold, Expired
- Search within listings
- Bulk actions
- Create new listing button
- Per-listing actions:
  - Edit
  - Boost
  - Renew
  - Mark as Sold
  - Delete

#### Create Listing (`listings/new`)
Multi-step form:
1. **Category Selection**
   - Category grid
   - Subcategory selection
2. **Details**
   - Title input
   - Description textarea
   - Dynamic attributes (from form_configs)
   - Condition selector
3. **Images**
   - Image upload (up to 10)
   - Drag to reorder
   - Image optimization
4. **Location**
   - Country → Region → City picker
   - Optional: Map pin
5. **Price**
   - Price input
   - Currency selector (TZS default)
   - Negotiable toggle
6. **Preview & Publish**
   - Full preview
   - Terms acceptance
   - Publish button

#### Edit Listing (`listings/[id]/edit`)
- Same as create but pre-filled
- Update images
- Change status option

#### Listing Performance (`listings/[id]/performance`)
- Views over time chart
- Favorites count
- Messages received
- Comparison with similar listings
- Optimization tips

#### Messages (`messages`)
- Conversations list
- Unread indicator
- Search conversations
- Filter by listing

#### Chat (`messages/[id]`)
- Message history
- Real-time updates
- Send text messages
- Send images
- Quick replies
- Listing reference card
- Block/report user

#### Notifications (`notifications`)
- Notifications list
- Filter by type
- Mark as read
- Clear all

#### Notification Preferences (`notification-preferences`)
Toggle settings for:
- Email notifications
- Push notifications
- SMS notifications
Categories:
- Messages
- Offers
- Listing updates
- Promotions
- Security alerts

#### Offers (`offers`)
Two tabs:
- **Received**: Offers on your listings
- **Sent**: Your offers to others
Per offer:
- Accept/Reject/Counter buttons
- Offer history
- Chat link

#### Sales (`sales`)
- Sold items list
- Revenue stats
- Pending payments
- Transaction details

#### Purchases (`purchases`)
- Bought items list
- Order status
- Leave review option
- Re-order option

#### Orders (`orders`)
- Combined sales + purchases
- Order details modal
- Status timeline
- Invoice download

#### Invoices (`invoices`)
- Invoice list
- Download PDF
- Filter by date

#### Credits (`credits`)
- Current balance display
- Purchase credits button
- Credit packages
- Transaction history
- Auto-refill settings

#### Boost Listing (`/boost/[listing_id]`)
- Boost package selection
- Duration options
- Payment method
- Preview placement
- Confirm & pay

#### Saved Items (`saved`)
- Saved listings grid
- Remove from saved
- Price change alerts
- Share collection

#### Recently Viewed (`recently-viewed`)
- Browsing history
- Clear history option
- Quick re-access

#### Smart Alerts (`alerts`)
- Saved searches
- Price drop alerts
- New listing alerts
- Manage alerts

#### Badges (`badges`)
- Earned badges showcase
- Badge progress
- How to earn
- Share badges

#### Challenges (`challenges`)
- Active challenges
- Progress bars
- Rewards preview
- Join challenge

#### Streaks (`streaks`)
- Current streak count
- Streak calendar
- Streak rewards
- Tips to maintain

#### Leaderboard (`leaderboard`)
- Top sellers ranking
- Top buyers ranking
- Weekly/monthly tabs
- Your position highlight

#### Profile Edit (`settings/profile`)
- Avatar upload
- Name, bio
- Phone number
- Location
- Social links

#### Settings (`settings`)
Settings sections:
- Account
- Security
- Privacy
- Notifications
- Appearance

#### Settings Sub-pages
- Change Password (`settings/password`)
- Two-Factor Auth (`settings/2fa`)
- Blocked Users (`settings/blocked`)
- Sessions (`settings/sessions`)
- Language (`settings/language`)
- Currency (`settings/currency`)
- Delete Account (`settings/delete`)

### 5.4 Business Features

#### Business Profile (`/business/[slug]`)
- Business banner
- Logo and name
- Description
- Contact info
- Business hours
- Location/map
- Listings grid
- Reviews

#### Business Dashboard (`business`)
- Business analytics
- Edit business profile
- Verification status

### 5.5 Specialized Verticals

#### Auto Motors (`/auto`)
- Auto-specific homepage
- Make/Model filters
- Year range filter
- Mileage filter
- Fuel type filter

#### Auto Listing (`/auto/[id]`)
- Vehicle specs table
- History report (optional)
- Financing calculator

#### Property (`/property`)
- Property homepage
- Bedrooms/bathrooms filter
- Property type filter
- Size range filter
- Amenities filter

#### Property Listing (`/property/[id]`)
- Floor plan
- Amenities list
- Virtual tour (optional)
- Mortgage calculator

---

## 6. Component Architecture

### 6.1 Folder Structure
```
/src
├── app/                          # Next.js App Router
│   ├── (public)/                 # Public routes
│   │   ├── page.tsx              # Homepage
│   │   ├── search/page.tsx
│   │   ├── listing/[id]/page.tsx
│   │   ├── category/[slug]/page.tsx
│   │   ├── seller/[id]/page.tsx
│   │   ├── blog/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   └── [...static]/page.tsx
│   ├── (auth)/                   # Auth routes
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── forgot-password/page.tsx
│   ├── listings/                 # My Listings (Protected)
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/
│   │       ├── edit/page.tsx
│   │       └── performance/page.tsx
│   ├── messages/                 # Messages (Protected)
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── offers/page.tsx           # Offers (Protected)
│   ├── sales/page.tsx            # Sales (Protected)
│   ├── purchases/page.tsx        # Purchases (Protected)
│   ├── orders/page.tsx           # Orders (Protected)
│   ├── invoices/page.tsx         # Invoices (Protected)
│   ├── credits/page.tsx          # Credits (Protected)
│   ├── saved/page.tsx            # Saved Items (Protected)
│   ├── recently-viewed/page.tsx  # Recently Viewed (Protected)
│   ├── alerts/page.tsx           # Smart Alerts (Protected)
│   ├── badges/page.tsx           # Badges (Protected)
│   ├── challenges/page.tsx       # Challenges (Protected)
│   ├── streaks/page.tsx          # Streaks (Protected)
│   ├── notifications/page.tsx    # Notifications (Protected)
│   ├── settings/                 # Settings (Protected)
│   │   ├── page.tsx
│   │   ├── profile/page.tsx
│   │   ├── password/page.tsx
│   │   └── [...setting]/page.tsx
│   ├── auto/                     # Auto vertical
│   ├── property/                 # Property vertical
│   ├── layout.tsx                # Root layout
│   └── globals.css
├── components/
│   ├── ui/                       # shadcn components
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Sidebar.tsx
│   │   └── MobileNav.tsx
│   ├── listings/
│   │   ├── ListingCard.tsx
│   │   ├── ListingGrid.tsx
│   │   ├── ListingFilters.tsx
│   │   ├── ListingGallery.tsx
│   │   └── ListingForm.tsx
│   ├── search/
│   │   ├── SearchBar.tsx
│   │   ├── SearchFilters.tsx
│   │   └── SearchResults.tsx
│   ├── chat/
│   │   ├── ConversationList.tsx
│   │   ├── ChatWindow.tsx
│   │   └── MessageBubble.tsx
│   ├── user/
│   │   ├── UserAvatar.tsx
│   │   ├── UserCard.tsx
│   │   └── SellerBadges.tsx
│   └── shared/
│       ├── LoadingSpinner.tsx
│       ├── EmptyState.tsx
│       ├── ErrorBoundary.tsx
│       └── Pagination.tsx
├── lib/
│   ├── api.ts                    # API client
│   ├── auth.ts                   # Auth utilities
│   ├── utils.ts                  # Helper functions
│   └── validations.ts            # Zod schemas
├── hooks/
│   ├── useAuth.ts
│   ├── useListings.ts
│   ├── useConversations.ts
│   └── useNotifications.ts
├── store/
│   ├── authStore.ts
│   ├── cartStore.ts
│   └── uiStore.ts
├── types/
│   └── index.ts
└── config/
    └── constants.ts
```

### 6.2 Key Components

#### ListingCard
```tsx
interface ListingCardProps {
  listing: Listing;
  variant?: 'grid' | 'list';
  showActions?: boolean;
}
```

#### SearchFilters
```tsx
interface SearchFiltersProps {
  categories: Category[];
  locations: Location[];
  onFilterChange: (filters: Filters) => void;
  initialFilters?: Filters;
}
```

#### ChatWindow
```tsx
interface ChatWindowProps {
  conversationId: string;
  onSendMessage: (text: string) => void;
  onClose?: () => void;
}
```

---

## 7. Authentication & Authorization

### 7.1 JWT Authentication
- Tokens stored in httpOnly cookies
- Access token expires in 24 hours
- Refresh token expires in 7 days
- Auto-refresh on API calls

### 7.2 Auth Flow
```
1. User logs in → Receives JWT token
2. Token stored in cookie → Sent with each request
3. Protected routes check token → Redirect if invalid
4. Token refresh → Automatic on expiry
```

### 7.3 Role-Based Access
| Role | Permissions |
|------|-------------|
| Guest | Browse, search, view listings |
| User | Create listings, message, purchase |
| Seller | All user + sell, analytics |
| Admin | Full access + admin dashboard |

### 7.4 Middleware Protection
```tsx
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('token');
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/listings') || pathname.startsWith('/messages') || pathname.startsWith('/settings');
  
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

---

## 8. SEO Requirements

### 8.1 Meta Tags
```html
<!-- Dynamic per page -->
<title>{Page Title} | Avida Tanzania</title>
<meta name="description" content="{Page description}">
<meta name="keywords" content="{keywords}">
<link rel="canonical" href="{canonical URL}">

<!-- Open Graph -->
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:image" content="{image URL}">
<meta property="og:url" content="{page URL}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Avida Tanzania">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{description}">
<meta name="twitter:image" content="{image URL}">
```

### 8.2 Structured Data (JSON-LD)

#### Product Schema (Listings)
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "iPhone 15 Pro Max",
  "description": "...",
  "image": ["https://..."],
  "offers": {
    "@type": "Offer",
    "price": "2500000",
    "priceCurrency": "TZS",
    "availability": "https://schema.org/InStock",
    "seller": {
      "@type": "Person",
      "name": "John Doe"
    }
  }
}
```

#### Organization Schema (Homepage)
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Avida Tanzania",
  "url": "https://avida.co.tz",
  "logo": "https://avida.co.tz/logo.png",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+255-xxx-xxx",
    "contactType": "customer service"
  }
}
```

### 8.3 Technical SEO
- Server-side rendering for all public pages
- Dynamic sitemap generation (`/sitemap.xml`)
- Robots.txt configuration
- Image optimization with alt texts
- Lazy loading for images
- Core Web Vitals optimization
- Mobile-first responsive design

---

## 9. Design System

### 9.1 Color Palette
```css
:root {
  /* Primary */
  --primary: #2E7D32;        /* Green */
  --primary-dark: #1B5E20;
  --primary-light: #4CAF50;
  
  /* Secondary */
  --secondary: #10B981;      /* Green */
  --secondary-dark: #059669;
  
  /* Neutral */
  --background: #FFFFFF;
  --foreground: #0F172A;
  --muted: #64748B;
  --border: #E2E8F0;
  
  /* Semantic */
  --success: #22C55E;
  --warning: #F59E0B;
  --error: #EF4444;
  --info: #3B82F6;
}
```

### 9.2 Typography
```css
/* Font Family */
font-family: 'Inter', sans-serif;

/* Scale */
--text-xs: 0.75rem;     /* 12px */
--text-sm: 0.875rem;    /* 14px */
--text-base: 1rem;      /* 16px */
--text-lg: 1.125rem;    /* 18px */
--text-xl: 1.25rem;     /* 20px */
--text-2xl: 1.5rem;     /* 24px */
--text-3xl: 1.875rem;   /* 30px */
--text-4xl: 2.25rem;    /* 36px */
```

### 9.3 Spacing
```css
/* 4px base unit */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

### 9.4 Breakpoints
```css
--screen-sm: 640px;   /* Mobile landscape */
--screen-md: 768px;   /* Tablet */
--screen-lg: 1024px;  /* Desktop */
--screen-xl: 1280px;  /* Large desktop */
--screen-2xl: 1536px; /* Extra large */
```

### 9.5 Component Styling
- Use shadcn/ui as base components
- Tailwind CSS for custom styling
- Consistent border-radius: `rounded-lg` (8px)
- Consistent shadows: `shadow-sm`, `shadow-md`
- Transitions: `transition-all duration-200`

---

## 10. Environment Variables

### 10.1 Required Variables
```env
# API
NEXT_PUBLIC_API_URL=https://layout-render-fix.emergent.host/api

# Site
NEXT_PUBLIC_SITE_URL=https://avida.co.tz
NEXT_PUBLIC_SITE_NAME=Avida Tanzania

# Database (for SSR if needed)
MONGODB_URI=mongodb+srv://avida_admin:AvidaTZ@avidatz.dipxnt9.mongodb.net/classifieds_db

# Defaults
NEXT_PUBLIC_DEFAULT_CURRENCY=TZS
NEXT_PUBLIC_DEFAULT_COUNTRY=TZ
NEXT_PUBLIC_DEFAULT_LANGUAGE=en

# Optional: Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx

# Optional: Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

---

## 11. Third-Party Integrations

### 11.1 Already Configured (Backend)

| Service | Purpose | Status |
|---------|---------|--------|
| SendGrid | Transactional emails | ✅ Active |
| Firebase FCM | Push notifications | ✅ Active |
| PayPal | Payments | ✅ Configured |
| Flutterwave | Mobile money | ✅ Configured |
| Stripe | Card payments | ✅ Test mode |
| OpenAI | AI features | ✅ Active |

### 11.2 API Keys Location
All API keys are stored in `/app/backend/.env`:
- `SENDGRID_API_KEY`
- `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`
- `FW_SECRET_KEY`, `FW_PUBLIC_KEY`
- `STRIPE_API_KEY`
- `EMERGENT_LLM_KEY`

---

## 12. Platform-Specific Configuration

### 12.1 Mobile App (React Native/Expo)

**Location**: Existing job (current)
**Tech**: React Native, Expo, TypeScript

```env
# /app/frontend/.env
EXPO_PUBLIC_API_URL=https://layout-render-fix.emergent.host/api
EXPO_PUBLIC_SITE_NAME=Avida Tanzania
```

**Key Files**:
- `/app/frontend/src/utils/api.ts` - API client
- `/app/frontend/src/store/authStore.ts` - Auth state

### 12.2 Web App (Next.js)

**Location**: New Emergent job
**Tech**: Next.js 14, TypeScript, Tailwind, shadcn/ui
**Domain**: avida.co.tz

```env
# .env.local
NEXT_PUBLIC_API_URL=https://layout-render-fix.emergent.host/api
NEXT_PUBLIC_SITE_URL=https://avida.co.tz
NEXT_PUBLIC_SITE_NAME=Avida Tanzania
NEXT_PUBLIC_DEFAULT_CURRENCY=TZS
```

### 12.3 Admin Dashboard (Next.js)

**Location**: Existing at `/app/admin-dashboard/` OR new job
**Tech**: Next.js 14, TypeScript, Material UI
**Domain**: admin.avida.co.tz (optional)

```env
# .env.local
NEXT_PUBLIC_API_URL=https://layout-render-fix.emergent.host/api
NEXT_PUBLIC_ADMIN_API_URL=https://layout-render-fix.emergent.host/api/admin
NEXT_PUBLIC_APP_NAME=Avida Admin
```

### 12.4 Shared Backend (FastAPI)

**Location**: Existing job (deployed)
**Tech**: FastAPI, Python 3.11, MongoDB
**URL**: https://layout-render-fix.emergent.host/api

```env
# /app/backend/.env
MONGO_URL=mongodb+srv://avida_admin:AvidaTZ@avidatz.dipxnt9.mongodb.net/classifieds_db
DB_NAME=classifieds_db
JWT_SECRET_KEY=your-secret-key
```

### 12.5 Cross-Platform Data Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          DATA FLOW EXAMPLES                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  📱 Mobile User Posts Listing                                            │
│  ────────────────────────────                                            │
│  1. Mobile App → POST /api/listings → Backend                            │
│  2. Backend → Insert into MongoDB (listings collection)                  │
│  3. Web App → GET /api/listings → Shows new listing                      │
│  4. Admin → GET /api/admin/listings → Can moderate                       │
│                                                                          │
│  🌐 Web User Sends Message                                               │
│  ──────────────────────────                                              │
│  1. Web App → POST /api/conversations/{id}/messages → Backend            │
│  2. Backend → Insert into MongoDB (messages collection)                  │
│  3. Mobile App → GET /api/conversations → Shows new message              │
│  4. Push notification sent to recipient                                  │
│                                                                          │
│  🔧 Admin Approves Listing                                               │
│  ────────────────────────                                                │
│  1. Admin → PUT /api/admin/listings/{id}/approve → Backend               │
│  2. Backend → Update MongoDB (listings.status = 'active')                │
│  3. Mobile App → Shows approved listing                                  │
│  4. Web App → Shows approved listing                                     │
│  5. Email notification sent to seller                                    │
│                                                                          │
│  👤 User Logs In (Any Platform)                                          │
│  ─────────────────────────────                                           │
│  1. Any Platform → POST /api/auth/login → Backend                        │
│  2. Backend → Validates credentials from MongoDB (users collection)      │
│  3. Returns JWT token                                                    │
│  4. Same user can login on Mobile, Web, or Admin with same credentials   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Implementation Phases

### Phase 1: Core Foundation (Week 1-2)
- [ ] Project setup (Next.js, Tailwind, shadcn)
- [ ] Layout components (Header, Footer, Sidebar)
- [ ] Homepage
- [ ] Listing detail page
- [ ] Search with basic filters
- [ ] Category pages
- [ ] Authentication (Login, Register)

### Phase 2: User Dashboard (Week 3-4)
- [ ] Dashboard layout
- [ ] My listings (CRUD)
- [ ] Create/edit listing form
- [ ] Profile settings
- [ ] Notifications

### Phase 3: Communication (Week 5)
- [ ] Messaging system
- [ ] Conversation list
- [ ] Real-time chat
- [ ] Offers system

### Phase 4: Commerce (Week 6)
- [ ] Credits system
- [ ] Boost listings
- [ ] Checkout flow
- [ ] Order management
- [ ] Invoices

### Phase 5: Gamification (Week 7)
- [ ] Badges display
- [ ] Challenges
- [ ] Streaks
- [ ] Leaderboard

### Phase 6: SEO & Polish (Week 8)
- [ ] Full SEO implementation
- [ ] Structured data
- [ ] Sitemap
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Bug fixes

---

## 13. Deployment & Custom Domain

### 13.1 Deployment Steps
1. Create new Emergent job with this specification
2. Build Next.js application
3. Configure environment variables
4. Deploy application
5. Configure custom domain

### 13.2 Custom Domain Setup
1. Go to Emergent deployment settings
2. Add custom domain: `avida.co.tz`
3. Configure DNS records:
   ```
   Type: CNAME
   Name: @
   Value: [provided by Emergent]
   ```
4. Wait for SSL provisioning (automatic)
5. Verify domain is active

### 13.3 Post-Deployment
- [ ] Verify all pages load correctly
- [ ] Test authentication flow
- [ ] Test API connections
- [ ] Submit sitemap to Google Search Console
- [ ] Set up monitoring/analytics

---

## Appendix A: Test Credentials

```
User Account:
Email: kmasuka48@gmail.com
Password: 123

Admin Account:
Email: admin@marketplace.com
Password: Admin@123456
```

---

## Appendix B: API Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": { ... }
  }
}
```

### Paginated Response
```json
{
  "items": [ ... ],
  "total": 150,
  "limit": 20,
  "offset": 0,
  "has_more": true
}
```

---

## Appendix C: Admin Dashboard (64+ Pages)

The admin dashboard is already built at `/app/admin-dashboard/` and should be integrated into the web platform.

### Admin Routes Structure: `/admin/*`

#### 📊 Analytics & Reporting
| Route | Page | Description |
|-------|------|-------------|
| `/admin` | Dashboard Home | Overview with key metrics |
| `/admin/analytics` | Analytics Dashboard | Traffic, users, listings stats |
| `/admin/cohort-analytics` | Cohort Analytics | User retention, cohort analysis |
| `/admin/search-analytics` | Search Analytics | Popular searches, search trends |
| `/admin/seo-analytics` | SEO Analytics | Organic traffic, rankings |
| `/admin/notification-analytics` | Notification Analytics | Open rates, click rates |
| `/admin/executive-summary` | Executive Summary | High-level business metrics |
| `/admin/reports` | Reports | Generate and download reports |

#### 🔍 SEO & Growth
| Route | Page | Description |
|-------|------|-------------|
| `/admin/seo-tools` | SEO Tools | Meta tags, sitemap, robots.txt |
| `/admin/seo-ab-testing` | SEO A/B Testing | Test meta titles, descriptions |
| `/admin/advanced-seo` | Advanced SEO | Schema markup, structured data |
| `/admin/multilang-seo` | Multilang SEO | Multi-language SEO settings |
| `/admin/aso-engine` | ASO Engine | App Store Optimization |
| `/admin/authority-building` | Authority Building | Backlink strategies |
| `/admin/backlink-monitoring` | Backlink Monitoring | Track backlinks |
| `/admin/content-engine` | Content Engine | AI content generation |
| `/admin/content-calendar` | Content Calendar | Schedule content |
| `/admin/social-distribution` | Social Distribution | Social media automation |
| `/admin/growth-engine` | Growth Engine | Growth hacking tools |

#### 🤖 AI Features
| Route | Page | Description |
|-------|------|-------------|
| `/admin/ai-analyzer` | AI Analyzer | Listing quality analysis |
| `/admin/ai-personalization` | AI Personalization | Personalized recommendations |

#### 🛍️ Marketplace Management
| Route | Page | Description |
|-------|------|-------------|
| `/admin/listings` | Listings | All listings management |
| `/admin/listing-moderation` | Listing Moderation | Pending approvals, reports |
| `/admin/categories` | Categories | Category management |
| `/admin/attributes` | Attributes | Category attributes |
| `/admin/icons` | Icons | Attribute icons |
| `/admin/form-config` | Form Config | Dynamic form builder |
| `/admin/photography-guides` | Photography Guides | Photo guidelines per category |
| `/admin/safety-tips` | Safety Tips | Safety content management |

#### 👥 User Management
| Route | Page | Description |
|-------|------|-------------|
| `/admin/users` | Users | All users list, search, filter |
| `/admin/verification` | Verification | ID/phone verification requests |
| `/admin/business-profiles` | Business Profiles | Business account management |
| `/admin/team-management` | Team Management | Admin team, roles |
| `/admin/badges` | Badges | Badge definitions, awards |
| `/admin/challenges` | Challenges | Create/manage challenges |

#### 💰 Commerce & Finance
| Route | Page | Description |
|-------|------|-------------|
| `/admin/commission` | Commission | Commission rates, settings |
| `/admin/escrow` | Escrow | Escrow transactions |
| `/admin/boosts` | Boosts | Boost packages, pricing |
| `/admin/vouchers` | Vouchers | Discount codes, promotions |
| `/admin/invoices` | Invoices | All invoices, receipts |

#### 🔔 Notifications
| Route | Page | Description |
|-------|------|-------------|
| `/admin/notifications` | Notifications | Send notifications |
| `/admin/smart-notifications` | Smart Notifications | Automated triggers |
| `/admin/sms-notifications` | SMS Notifications | SMS campaigns |

#### ⚙️ Settings & Configuration
| Route | Page | Description |
|-------|------|-------------|
| `/admin/settings` | Settings | General settings |
| `/admin/platform-config` | Platform Config | Platform-wide settings |
| `/admin/config-manager` | Config Manager | Feature flags |
| `/admin/feature-settings` | Feature Settings | Enable/disable features |
| `/admin/image-settings` | Image Settings | Image sizes, compression |
| `/admin/integrations` | Integrations | Third-party integrations |
| `/admin/cookie-consent` | Cookie Consent | Cookie banner settings |
| `/admin/recaptcha` | reCAPTCHA | Bot protection settings |

#### 🛡️ Compliance & Security
| Route | Page | Description |
|-------|------|-------------|
| `/admin/compliance` | Compliance | Legal compliance |
| `/admin/audit-logs` | Audit Logs | Activity logs |
| `/admin/moderation` | Moderation | Content moderation |
| `/admin/tickets` | Tickets | Support tickets |
| `/admin/sandbox` | Sandbox | Test environment |

#### 🧪 Testing & QA
| Route | Page | Description |
|-------|------|-------------|
| `/admin/ab-testing` | A/B Testing | Feature experiments |
| `/admin/qa-reliability` | QA Reliability | Quality assurance |
| `/admin/polls-surveys` | Polls & Surveys | User feedback |
| `/admin/segment-builder` | Segment Builder | User segments |

#### 📍 Other
| Route | Page | Description |
|-------|------|-------------|
| `/admin/locations` | Locations | Countries, regions, cities |
| `/admin/banners` | Banners | Promotional banners |
| `/admin/ads` | Ads | Advertisement management |
| `/admin/url-shortener` | URL Shortener | Short links |
| `/admin/analytics-settings` | Analytics Settings | Tracking configuration |

### Admin API Endpoints

All admin endpoints are prefixed with `/api/admin/`:

```
GET    /api/admin/stats                    - Dashboard statistics
GET    /api/admin/users                    - List users
GET    /api/admin/users/{id}               - User details
PUT    /api/admin/users/{id}               - Update user
DELETE /api/admin/users/{id}               - Delete user
POST   /api/admin/users/{id}/verify        - Verify user
POST   /api/admin/users/{id}/ban           - Ban user

GET    /api/admin/listings                 - List all listings
PUT    /api/admin/listings/{id}/approve    - Approve listing
PUT    /api/admin/listings/{id}/reject     - Reject listing
DELETE /api/admin/listings/{id}            - Delete listing

GET    /api/admin/categories               - List categories
POST   /api/admin/categories               - Create category
PUT    /api/admin/categories/{id}          - Update category
DELETE /api/admin/categories/{id}          - Delete category

GET    /api/admin/vouchers                 - List vouchers
POST   /api/admin/vouchers                 - Create voucher
PUT    /api/admin/vouchers/{id}            - Update voucher
DELETE /api/admin/vouchers/{id}            - Delete voucher

GET    /api/admin/challenges               - List challenges
POST   /api/admin/challenges               - Create challenge
PUT    /api/admin/challenges/{id}          - Update challenge

GET    /api/admin/analytics/*              - Various analytics endpoints
GET    /api/admin/seo/*                    - SEO management endpoints
GET    /api/admin/notifications/*          - Notification management
GET    /api/admin/reports/*                - Report generation
```

### Admin Authentication

Admin access requires:
1. User must have `role: "admin"` in their profile
2. Valid JWT token
3. Admin middleware check on all `/admin/*` routes

```typescript
// middleware.ts
if (pathname.startsWith('/admin')) {
  const user = await verifyToken(token);
  if (user.role !== 'admin') {
    return NextResponse.redirect('/login');
  }
}
```
- And much more...

This can be deployed separately or integrated into the main web app.

---

**End of Specification**

*This document serves as the complete blueprint for building the Avida Tanzania web marketplace. Use it when creating a new Emergent job to build the frontend application.*
