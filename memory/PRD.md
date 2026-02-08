# Product Requirements Document - Admin Dashboard

## Original Problem Statement
Build a comprehensive admin dashboard for a marketplace application with features including:
- Notification management (templates, scheduling, A/B testing)
- Category and listing management with CSV import
- Custom attributes system
- Place/Location management
- User data editing and authentication settings
- Deeplink management
- Icon uploads for categories/attributes

## Architecture

### Tech Stack
- **Backend**: FastAPI, Python 3.11, Motor (MongoDB async driver), port 8002
- **Frontend**: Next.js 16 with Turbopack, TypeScript, Material-UI, port 3001
- **Database**: MongoDB (database: classifieds_db)
- **Real-time**: WebSockets

### Important Configuration
- Frontend uses `basePath: "/api/admin-ui"` - all pages accessed via `/api/admin-ui/dashboard/*`
- Backend API prefix: `/api/admin`

### Code Structure
```
/app/admin-dashboard/
├── backend/
│   ├── server.py         # Main FastAPI application (~4000 lines)
│   ├── routes/           # Future refactored routers
│   ├── REFACTORING.md    # Refactoring plan
│   └── .env              # Environment configuration
└── frontend/
    ├── src/
    │   ├── app/          # Next.js App Router pages
    │   │   └── dashboard/
    │   │       ├── settings/page.tsx  # Locations, Deeplinks, Auth settings
    │   │       └── users/page.tsx     # User management with Edit
    │   ├── lib/api.ts    # API client
    │   └── components/   # Reusable components
    ├── next.config.ts    # basePath: "/api/admin-ui"
    └── .env.local        # Frontend environment
```

### Credentials
- Admin: admin@example.com / admin123
- Database: classifieds_db

---

## Implementation Status

### Completed Features ✅
- [x] Notifications page with live API
- [x] CSV Import for Categories and Listings
- [x] Pre-defined Notification Templates
- [x] Comprehensive Listing Edit (with dynamic attributes)
- [x] Full Custom Attributes Management page
- [x] Advanced attribute features (inheritance, templates, bulk)
- [x] Backend APIs for Locations, Deeplinks, Auth Settings (Feb 8)
- [x] Settings page frontend - Locations, Deeplinks, Auth tabs (Feb 8)
- [x] User Edit dialog in Users page (Feb 8)
- [x] **Icon Upload for Categories** - POST/DELETE /categories/{id}/icon (Feb 8)
- [x] **Icon Upload for Attributes** - POST/DELETE /categories/{cat_id}/attributes/{attr_id}/icon (Feb 8)
- [x] Settings navigation link in sidebar

### Backend API Endpoints (All Tested & Working)
| Endpoint | Status |
|----------|--------|
| POST /api/admin/auth/login | ✅ |
| GET/POST/PUT/DELETE /api/admin/locations | ✅ |
| GET/POST/PUT/DELETE /api/admin/deeplinks | ✅ |
| GET/PUT /api/admin/settings/auth | ✅ |
| PUT /api/admin/users/{user_id} | ✅ |
| POST/DELETE /api/admin/categories/{id}/icon | ✅ NEW |
| POST/DELETE /api/admin/categories/{cat_id}/attributes/{attr_id}/icon | ✅ NEW |

### Icon Upload Specifications
- **Category Icons**: PNG, JPG, SVG - Max 500KB - Stored as base64 data URL
- **Attribute Icons**: PNG, JPG, SVG - Max 200KB - Stored as base64 data URL

### Pending Tasks
- [ ] Frontend UI for Notification Scheduling
- [ ] Custom Template Management UI  
- [ ] Real-time Dashboard Updates (WebSocket)
- [ ] Execute backend refactoring (split server.py per REFACTORING.md)
- [ ] Icon picker/uploader in Categories UI

### Future/Backlog
- CSV Import for Users
- Notification Template Analytics
- Full A/B Testing Logic and UI
- Granular Notification Targeting

---

## Test Results
- **Backend Tests**: 52/52 passed total
  - Iteration 3: 31/31 (core features)
  - Iteration 4: 21/21 (icon upload)
- **Test Reports**: `/app/test_reports/iteration_*.json`

## Bugs Fixed
1. User update endpoint used wrong field name `id` instead of `user_id`
2. User response included password_hash - now excluded
3. Backend server.py had duplicated code causing IndentationError
4. bcrypt 4.1.3 incompatible with passlib - downgraded to 4.0.1
5. Routing issue due to basePath configuration - identified and documented

---
Last Updated: February 8, 2026
