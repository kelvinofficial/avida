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
   - 3-column grid layout
   - Heart icon for saved items
5. **Post Listing Page** (`PostListingScreen.tsx`) - ✅ Done
6. **Login Page** (`login.tsx`) - ✅ Done
7. **Category Page** (`category/[id].tsx`) - ✅ Done

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
Last Updated: December 2025
