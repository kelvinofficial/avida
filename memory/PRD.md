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

---
Last Updated: February 7, 2026
