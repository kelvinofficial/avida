# LocalMarket (Avida/Avito) - Product Requirements Document

## Original Problem Statement
Build a full-stack React Native/Expo marketplace application with a FastAPI backend.

## Web App Separation Plan (February 2026)
User requested separation of web marketplace from mobile app:
- **Mobile App**: Keep in this current job (React Native/Expo)
- **Web App**: New job with Next.js for `avito.co.tz`
- **Specification created**: `/app/memory/WEB_APP_SPECIFICATION.md`
- **Backend CORS**: Already configured to accept `*` origins (works with any domain)

## Current Status: February 2026

### Active Blocker: ngrok Tunnel Instability (P0)
The development preview tunnel (`https://homepage-fix-8.preview.emergentagent.com`) is experiencing repeated "ngrok tunnel took too long to connect" errors, preventing frontend testing. Backend APIs are confirmed working via curl.

### Fixes Applied This Session (Pending Verification)

#### Close Button Fix on Auth Screens (P1)
**Problem**: Close (X) icons on auth screens (login, register, forgot-password) were not visible on mobile devices
**Root Cause**: Close button had fixed `top: 16` position, which places it under the device's status bar/notch on modern phones
**Fix Applied**:
- Added `useSafeAreaInsets()` hook to all three auth screens
- Updated close button positioning to use `top: insets.top + 8` for dynamic positioning below status bar
- Files modified:
  - `frontend/app/login.tsx` - Added insets, updated close button position
  - `frontend/app/register.tsx` - Added insets, updated close button position
  - `frontend/app/forgot-password.tsx` - Added insets, updated close button position
**Status**: Code fixed, awaiting frontend verification when tunnel is stable

### Homepage Issues (P0) - Investigation In Progress
**Problem**: Homepage shows white screen, slow load, listings not displayed
**User Hypothesis**: LocationPicker component is causing the issue
**Investigation Findings**:
- Backend APIs are working correctly (`/api/listings`, `/api/feed/listings`, `/api/locations/regions` all return data)
- The LocationPicker is conditionally rendered only when modal is opened (`{visible && <LocationPicker />}`)
- The `useInstantListingsFeed` hook uses cache-first strategy which should show data immediately
- Unable to verify frontend behavior due to ngrok tunnel instability

**Next Steps When Tunnel Stabilizes**:
1. Take screenshot to see current homepage state
2. Temporarily remove LocationPicker import/usage from homepage to confirm if it's the cause
3. Check browser console for JavaScript errors
4. Inspect the FlatList rendering logic for race conditions

### All P0-P2 Tasks Previously Completed

#### Notification System (Feb 2026)
- **SendGrid Email**: Configured and verified (donotreply@avida.co.tz)
- **Firebase FCM Push**: Configured with service account
- **Automatic Triggers**: Messages, Offers, Listing Sold/Approved
- **User Preferences**: 10 email + 4 push toggles
- **Test Results**: 30/30 backend tests passed

#### Performance Optimization (Feb 2026)
**Target**: Sub-1-second listing loads, API <300ms
**Results**:
- API response time: ~200ms (cached), ~350ms (uncached) - **Target: <300ms**
- Payload size reduced from 3.9MB to 82KB - **97.9% reduction**

#### Other Completed Features
1. Email Notifications (SendGrid)
2. Push Notifications (Firebase FCM)  
3. Notification Triggers (messages, offers, listings)
4. User Notification Preferences UI
5. Recently Viewed Feature Fix
6. Profile Data Mismatch Fix
7. Continue Button Fix
8. Location Filter Fix
9. Layout Flash Fix (useResponsive hook)
10. Performance Optimization
11. Push Token Registration Fix
12. Badge Count Fix
13. White Screen Crash Fix (Metro cache)
14. Unified Login Screens
15. Remember Me & Forgot Password
16. Email Verification for Registration
17. Create Post Page Enhancements (city-level location, currency, AI hidden)

### Code Architecture
```
/app
├── backend/
│   ├── routes/
│   │   ├── conversations.py   # Chat APIs (mute, pin, delete - placeholder)
│   │   ├── users.py           # Block/report endpoints (placeholder)
│   │   ├── locations.py       # Region/city selection
│   │   └── ...
│   └── main.py
├── frontend/
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── index.tsx      # Homepage (issue: white screen)
│   │   │   └── profile.tsx    # Profile page
│   │   ├── chat/[id].tsx      # Chat with 3-dot menu (UI only)
│   │   ├── login.tsx          # FIXED: Close button position
│   │   ├── register.tsx       # FIXED: Close button position
│   │   └── forgot-password.tsx# FIXED: Close button position
│   └── src/
│       └── components/
│           ├── LocationPicker.tsx  # City selection (suspected issue)
│           └── home/LocationModal.tsx # Modal wrapper
└── memory/PRD.md
```

### Pending Issues

#### High Priority (P1)
- **Homepage White Screen**: Needs investigation when tunnel is stable
- **Chat Options Menu**: Backend routes are placeholders, frontend handlers are empty
- **Backend ObjectId serialization error**: Needs investigation

#### Medium Priority (P2)
- Share Button & Deep Linking - needs production build
- Authentication Persistence - needs physical device testing

### Future/Backlog
- Multi-language content generation (German, Swahili)
- Full API integrations for demo features
- Campaign scheduling for notifications
- Image Optimization Pipeline (WebP + CDN)

### 3rd Party Integrations
- **SendGrid**: Email (verified)
- **Firebase FCM**: Push (configured)
- **OpenAI GPT-5.2**: AI features
- **Lottie**: Animated splash screen

### Test Credentials
- **Test User**: kmasuka48@gmail.com / 123
- **Admin**: admin@marketplace.com / Admin@123456
