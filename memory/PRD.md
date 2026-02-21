# LocalMarket (Avida) - Product Requirements Document

## Original Problem Statement
Build a full-stack React Native/Expo marketplace application with a FastAPI backend. The app experienced critical failures including API connectivity issues, UI layout problems, and core feature regressions.

## Current Status: February 2026

### What's Been Implemented

#### Notification System (Feb 2026) ✅ COMPLETE
- **SendGrid Email**: Configured with API key, sender: donotreply@avida.co.tz
- **Firebase FCM Push**: Configured with service account credentials
- **Automatic Triggers**: Messages, Offers (received/accepted/rejected), Listing Sold/Approved
- **User Preferences**: Settings screen with 10 email + 4 push notification toggles
- **Test Results**: 30/30 backend tests passed

#### Recently Viewed Feature (Feb 2026) ✅ FIXED
**Problem**: Feature was not working - API returned empty results
**Root Cause**: The API in `social.py` was only looking up listings in the `listings` collection, not `auto_listings` or `properties`.
**Fix Applied**: 
- Updated `/api/profile/activity/recently-viewed` endpoint in `routes/social.py`
- Now searches all 3 collections: `listings`, `properties`, `auto_listings`
- Returns `{"items": [...]}` format matching frontend expectation
- Converts datetime objects to ISO strings for JSON serialization

#### Continue Button Fix (Feb 2026) ✅
- Changed SafeAreaView edges from `['top']` to `['top', 'bottom']`
- File: `/app/frontend/app/post/index.tsx`

#### Location Filter (Feb 2026) ✅ VERIFIED
- Working correctly with `$and` query logic
- File: `/app/backend/routes/feed.py`

### P1 Issues Status

#### Share Button & Deep Linking - VERIFIED CODE, NEEDS CONFIG
**Status**: Code is implemented correctly
**Issue**: Deep linking requires app configuration (app.json) to match the deployment domain
- Current app.json uses `expo-connectivity.preview.emergentagent.com`
- Actual preview URL is `location-filter-2.preview.emergentagent.com`
**Action Required**: Update app.json associatedDomains and intentFilters when deploying to production

#### Authentication Persistence - VERIFIED CODE, NEEDS DEVICE TESTING
**Status**: Code is implemented correctly
- Uses `SecureStore` on native, `AsyncStorage` on web
- `loadStoredAuth()` called on app mount
- Token and user data saved on login
**Action Required**: Test on physical device/emulator to confirm persistence works

### Prioritized Backlog

#### P0 - Critical (ALL COMPLETED ✅)
- ✅ Email Notifications (SendGrid)
- ✅ Push Notifications (Firebase FCM)
- ✅ Notification Triggers wired up
- ✅ User Preferences UI
- ✅ Recently Viewed Feature
- ✅ Continue Button Fix
- ✅ Location Filter

#### P1 - Needs Testing on Device
- ⏳ Share Button & Deep Linking - code complete, needs domain config
- ⏳ Authentication Persistence - code complete, needs device testing

#### P2 - Medium Priority
- Profile Data Mismatch - stats may not match list counts

### Technical Architecture

#### Backend Structure
```
/app/backend/
├── server.py
├── routes/
│   ├── social.py              # FIXED: Recently viewed searches all collections
│   ├── notification_preferences.py
│   ├── property.py            # Offers with notifications
│   ├── listings.py            # Listings with notifications
│   ├── email_test.py
│   └── feed.py
├── services/
│   └── notification_service.py
├── utils/
│   └── email_service.py
└── secrets/
    └── firebase-admin.json
```

### Key API Endpoints
- `GET /api/profile/activity/recently-viewed` - Recently viewed items (FIXED)
- `POST /api/profile/activity/recently-viewed/{listing_id}` - Track view
- `DELETE /api/profile/activity/recently-viewed` - Clear history
- `GET /api/notification-preferences/categories` - Notification categories
- `POST /api/notification-preferences/test` - Send test notification
- `GET /api/email/status` - SendGrid status

### 3rd Party Integrations
- **SendGrid**: Email notifications (verified working)
- **Firebase FCM**: Push notifications (configured)
- **OpenAI GPT-5.2**: AI features
- **SecureStore/AsyncStorage**: Auth persistence

### Test Credentials
- **Admin**: admin@marketplace.com / Admin@123456
- **Test Email**: kelvincharlesm@gmail.com

### Recent Test Results
- Notification System: 30/30 tests passed
- Recently Viewed: Fixed and verified with 3 items displaying correctly
- Email delivery: Verified working
