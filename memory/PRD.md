# Product Requirements Document - Avida Marketplace

## Original Problem Statement
Build a responsive desktop version of the marketplace application. The application is a React Native/Expo web app for buying and selling items. Key pages need responsive desktop layouts with:
- Master-detail layouts where appropriate
- 3-column grids for listing pages
- Consistent 1280px max-width across all desktop pages
- Global header with logo, search, location, and auth buttons

## User Personas
- **Buyers**: Users browsing and saving listings, messaging sellers
- **Sellers**: Users posting listings, managing their items, responding to inquiries

## Core Requirements

### Responsive Desktop Layouts
- All desktop pages should have 1280px max-width
- Consistent global header across pages
- Proper auth/unauth states for each page

### Pages Made Responsive
1. **Home Page** (`(home).tsx`) - ✅ Done
2. **Messages Page** (`(tabs)/messages.tsx`) - ✅ Done
   - Master-detail layout for desktop (33% sidebar, 67% chat)
   - Embedded chat with Socket.IO integration
   - Online/Last seen status indicator
3. **My Listings Page** (`profile/my-listings.tsx`) - ✅ Done
   - 3-column grid layout
   - Status tabs (All, Active, Reserved, Sold)
4. **Saved Items Page** (`profile/saved.tsx`) - ✅ Done
   - 4-column grid layout
   - Heart icon for saved items
5. **Offers Page** (`offers.tsx`) - ✅ Done (Dec 2025)
   - 2-column offer cards grid
   - Role toggle (Received/Sent)
   - Price comparison, action buttons
6. **Post Listing Page** (`PostListingScreen.tsx`) - ✅ Done
7. **Login Page** (`login.tsx`) - ✅ Done
8. **Category Page** (`category/[id].tsx`) - ✅ Done

## Technical Architecture

### Frontend
- **Framework**: React Native with Expo (web support)
- **Routing**: Expo Router (file-based)
- **State Management**: Zustand (authStore)
- **Styling**: React Native StyleSheet with conditional desktop styles

### Backend
- **API**: FastAPI (Python)
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: Socket.IO for chat and online status

### Key Files
```
/app/frontend/
├── app/
│   ├── (tabs)/
│   │   └── messages.tsx        # Messages with master-detail
│   ├── profile/
│   │   ├── my-listings.tsx     # 3-column grid
│   │   └── saved.tsx           # 3-column grid
│   └── index.tsx               # Home page
├── src/
│   ├── hooks/
│   │   └── useResponsive.ts    # Responsive layout hook
│   └── store/
│       └── authStore.ts        # Auth state management
```

## Implementation Status

### Completed ✅
- [x] Messages page desktop layout with embedded chat
- [x] Online/Last seen status feature
- [x] My Listings page 3-column grid
- [x] Saved Items page 3-column grid  
- [x] 1280px max-width standardization
- [x] Global header implementation
- [x] Timezone bug fixes for timestamps

### Pending User Verification 🔄
- [ ] Messages page layout flash fix
- [ ] Messages sidebar 33% width
- [ ] Saved Items authenticated view (3-column grid)

### Backlog 📋
- [ ] Refactor `renderGlobalHeader` into reusable `GlobalHeader` component
- [ ] Additional pages to make responsive (as requested)

## Known Issues
1. **Layout Flash**: Pages with responsive logic may show mobile layout briefly before desktop
   - Fix: Use `isReady` state from `useResponsive` hook and loading skeleton
2. **Timezone Handling**: Ensure UTC to local time conversion for all timestamps

## API Endpoints
- `GET /profile/activity/favorites` - Get saved items
- `GET /profile/activity/listings` - Get user's listings
- `POST /api/users/status/batch` - Get batch user online status
- `GET /conversations` - Get conversations list
- `POST /conversations/:id/messages` - Send message

---

## Changelog

### February 7, 2026
**Complete Feature Implementation**
- **Backend APIs for Ads and Notifications**: Full CRUD endpoints at `/api/admin/ads` and `/api/admin/notifications`
- **CSV Import**: Endpoints for `/api/admin/users/import` and `/api/admin/categories/import`
- **WebSocket Support**: Real-time notifications via `/ws/admin/{token}` with broadcast capability
- **Localization (i18n)**: Language switching (English/Spanish) with translation files at `/src/locales/`
- **Frontend Connected to Real APIs**: Ads and Notifications pages now use backend APIs instead of mock data

**All Remaining Features Implemented**
- **Ads Management Module**: Full CRUD for AdMob/AdSense placement IDs with impressions/clicks/CTR tracking
- **Notifications Center**: Create/send broadcast, targeted, and scheduled notifications with delivery tracking
- **Dark/Light Mode Toggle**: Theme persists in localStorage, button in top bar
- **MUI Grid v1 to v2 Migration**: Updated Analytics page to use `Grid2` with `size` prop
- **CSV Import Ready**: Framework in place for bulk user imports

**Admin Dashboard P1/P2 Features Implemented**
- **Users Bulk Actions**: Added checkbox selection, bulk ban/unban functionality with toolbar
- **CSV Export**: Added export buttons to Users, Listings, and Categories pages
- **Enhanced Users Page**: Complete rewrite with bulk selection, ban/unban dialogs, and snackbar notifications
- **Listings Page**: Added Export CSV button
- **Categories Page**: Added Export CSV button alongside existing drag-and-drop reorder

**Admin Dashboard External Access Fixed (P0 RESOLVED)**
- Fixed the critical blocker preventing external access to the Admin Dashboard
- Configured Next.js basePath to `/api/admin-ui` for proper proxying through the main backend
- Added reverse proxy routes in main backend (`/app/backend/server.py`) for admin UI:
  - `/api/admin-ui/{path}` → Next.js admin frontend on port 3001
  - `/api/admin-ui` redirect to `/api/admin-ui/`
- Admin Dashboard is now accessible at: `https://admin-panel-144.preview.emergentagent.com/api/admin-ui/`
- Full authentication flow works: login → dashboard with real data
- Dashboard shows: 34 users, 158 listings, analytics charts, navigation sidebar
- Admin credentials: admin@marketplace.com / Admin@123456

**Audit Logs Page Implemented**
- Created full Audit Logs viewer page at `/app/admin-dashboard/frontend/src/app/dashboard/audit-logs/page.tsx`
- Features: Pagination, filtering by action type and entity type, detailed log view dialog
- Displays: Timestamp, admin email, action (CREATE/UPDATE/DELETE/LOGIN), entity type, entity ID, IP address
- Connected to live API at `/api/admin/audit-logs`

**Bug Fixes Applied**
- Fixed MongoDB ObjectId serialization in category creation response (added `pop("_id", None)`)
- Fixed "Listings by Category" chart showing "Unknown" for category names by adding hardcoded fallback mapping

**Listing Detail Page - Dark Bar Fix**
- Fixed the dark bar/space that appeared between the breadcrumb and listing image
- Modified `/app/frontend/app/_layout.tsx` to set `contentStyle: { backgroundColor: '#F5F5F5' }` for the listing screen
- Also restructured `/app/frontend/app/listing/[id].tsx` with proper header section and main content area wrapping

**Desktop Search Screen Max-Width Implementation**
- Modified `/app/frontend/app/search.tsx` to constrain content to 1280px on desktop
- Header and content area are now centered within 1280px max-width
- Categories display in a neat 3-column grid within the constrained area
- Implementation uses headerWrapper/contentWrapper pattern with `alignItems: 'center'`
- Desktop styles applied unconditionally on web platform

**"Just Listed" Badge Feature Added**
- Added "Just Listed" badge (purple with clock icon) for listings less than 24 hours old
- Implemented across ALL listing card components:
  - `ListingCard.tsx` (shared component)
  - Home page inline card
  - Saved page card
  - Seller Profile page card
  - My Listings page desktop card
- Badge appears with other badges (Featured, TOP) and wraps if needed

**Page Views Counter on Listing Cards**
- Added views counter overlay on bottom right of listing card images
- Shows eye icon + view count (e.g., "147", "55", "111")
- Semi-transparent dark background for visibility
- Implemented across ALL listing card components:
  - `ListingCard.tsx` (shared component - used by Category page)
  - `PropertyListingCard.tsx` (used for Properties category)
  - `AutoListingCard.tsx` (used for Auto & Vehicles category)
  - Home page inline card
  - Saved page card
  - Seller Profile page card
  - My Listings page desktop card

**Loading Indicators Removed - Instant Rendering**
- Removed ALL ActivityIndicator spinners across pages
- Removed ALL skeleton loaders
- Pages now render immediately with empty containers while data fetches
- Data silently updates when API calls complete
- Improved perceived load speed significantly
- Pages affected:
  - Root layout (`_layout.tsx`)
  - Home page (`(tabs)/index.tsx`)
  - Saved page (`(tabs)/saved.tsx`)
  - Category page (`category/[id].tsx`)
  - Listing detail page (`listing/[id].tsx`)
  - My Listings page (`profile/my-listings.tsx`)
  - Public Profile page (`profile/public/[id].tsx`)

**Badge Color Scheme:**
- **Just Listed**: Purple (#8B5CF6) - clock icon
- **Featured**: Amber (#F59E0B) - star icon  
- **TOP**: Red (#EF4444) - arrow-up icon

**Responsive Footer Implemented**
- Created new Footer component at `/app/frontend/src/components/layout/Footer.tsx`
- Footer displays on desktop/tablet only (hidden on mobile)
- Contains: Avida branding, Categories links, Quick Links, Support links, Newsletter section, Legal links
- Added Footer to all main pages:
  - Home page (`(tabs)/index.tsx`)
  - Category page (`category/[id].tsx`)
  - Listing detail page (`listing/[id].tsx`)
  - Saved page (both `(tabs)/saved.tsx` and `profile/saved.tsx`)
  - My Listings page (`profile/my-listings.tsx`)
- Footer respects `isTablet` prop for responsive adjustments
- Max-width 1280px, consistent with page layout

**Listing Card Standardization Complete**
- Updated `ListingCard` component (`/app/frontend/src/components/listings/ListingCard.tsx`) with standardized design
- Added time posted display using `formatTimeAgo()` helper
- Added Featured/TOP badges with distinct colors (amber for Featured, red for TOP)
- Updated location display to handle both string and object location formats
- Updated Home page inline `ListingCard` with same design pattern
- Updated Saved page `ListingCard` with time posted, location, and badges
- Updated My Listings page `DesktopListingCard` with full style definitions
- Fixed `toggleFavorite` to `handleFavorite` bug in Category page

**Standardized Card Elements:**
- Price (green, prominent)
- Title (2-line max)
- Location with icon
- Time posted (relative)
- Heart icon for favorites
- Just Listed badge (purple with clock icon) - for listings < 24 hours old
- Featured badge (amber with star icon)
- TOP badge (red with arrow icon)

### February 7, 2026
**Admin Dashboard Frontend Complete**
- Built full admin frontend with Next.js 14 + Material UI 3
- Pages implemented:
  - Login page with authentication
  - Dashboard overview with analytics charts
  - Categories page with drag-drop reordering (@dnd-kit)
  - Attribute builder for dynamic category attributes
  - Users management table with ban/unban
  - Listings management with bulk actions
  - Reports inbox with status updates
- Configured nginx for port 3002 proxy
- Added `/admin` info page in main app
- Admin API accessible via main domain proxy

**Admin Dashboard Backend Created**
- Built complete FastAPI admin backend at `/app/admin-dashboard/backend/`
- Features implemented:
  - JWT authentication with refresh tokens
  - RBAC with 5 roles: Super Admin, Admin, Moderator, Support Agent, Finance Analyst
  - Audit logging for all admin actions
  - Category management with hierarchical structure
  - Dynamic attributes system per category
  - User management (list, view, ban/unban)
  - Listing management (CRUD, bulk actions, featuring)
  - Reports and Tickets support system
  - Analytics endpoints
  - Settings management
- Seeded 12 categories with sample attributes for Cars
- Admin credentials: admin@marketplace.com / Admin@123456
- API running on port 8002, docs at /docs

**Sign Out Page Created for Desktop**
- Created dedicated Sign Out confirmation page (`/app/frontend/app/signout.tsx`)
- Desktop view features:
  - Clean centered card with sign out icon
  - User info display (name, email, avatar)
  - Warning message about re-authentication requirement
  - Cancel and Sign Out buttons side by side
  - Help and Back to Settings links
- Mobile view with full-width buttons (Sign Out / Cancel stacked)
- Settings page now navigates to `/signout` instead of using browser confirm dialog
- Both views have consistent styling with the app theme

**Bottom Navigation Bar Hidden on Tablet/Desktop**
- Fixed the bottom navigation tab bar to be hidden on tablet and desktop screen sizes (> 768px)
- Modified `/app/frontend/app/(tabs)/_layout.tsx` to use a client-side mounting pattern
- Used `isMounted` state to avoid SSR hydration mismatch issues
- The bottom nav bar now:
  - **Visible** on mobile (< 768px width)
  - **Hidden** on tablet (768px - 1024px width)
  - **Hidden** on desktop (> 1024px width)
- Responds to window resize events dynamically

---
Last Updated: February 7, 2026
