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
- [x] Backend APIs for Locations, Deeplinks, Auth Settings
- [x] Settings page frontend - Locations, Deeplinks, Auth tabs
- [x] User Edit dialog in Users page
- [x] **Icon Upload for Categories** - Backend API + UI (Feb 8)
- [x] **Icon Upload for Attributes** - Backend API + UI (Feb 8)

### Icon Upload Feature Summary
| Component | Max Size | File Types | Storage |
|-----------|----------|------------|---------|
| Categories | 500KB | PNG, JPG, SVG | Base64 data URL |
| Attributes | 200KB | PNG, JPG, SVG | Base64 data URL |

**UI Features:**
- Icon preview box with border
- Upload button with file dialog
- Delete button (X icon)
- Disabled state for emoji picker when custom icon uploaded
- "Save first to upload" hint for new items

### Backend API Endpoints (All Tested & Working)
| Endpoint | Status |
|----------|--------|
| POST /api/admin/auth/login | ✅ |
| GET/POST/PUT/DELETE /api/admin/locations | ✅ |
| GET/POST/PUT/DELETE /api/admin/deeplinks | ✅ |
| GET/PUT /api/admin/settings/auth | ✅ |
| PUT /api/admin/users/{user_id} | ✅ |
| POST/DELETE /api/admin/categories/{id}/icon | ✅ |
| POST/DELETE /api/admin/categories/{cat_id}/attributes/{attr_id}/icon | ✅ |

### Pending Tasks
- [ ] Frontend UI for Notification Scheduling
- [ ] Custom Template Management UI  
- [ ] Real-time Dashboard Updates (WebSocket)
- [ ] Backend refactoring (split server.py per REFACTORING.md)

### Future/Backlog
- CSV Import for Users
- Notification Template Analytics
- Full A/B Testing Logic and UI
- Granular Notification Targeting

---

## Test Results
- **Backend Tests**: 52/52 passed total
- **Test Reports**: `/app/test_reports/iteration_*.json`

## Files Modified (Feb 8, 2026)
- `/app/admin-dashboard/backend/server.py` - Added attribute icon endpoints
- `/app/admin-dashboard/frontend/src/app/dashboard/categories/page.tsx` - Added icon uploader UI
- `/app/admin-dashboard/frontend/src/app/dashboard/attributes/page.tsx` - Added icon uploader UI
- `/app/admin-dashboard/frontend/src/lib/api.ts` - Added uploadAttributeIcon, deleteAttributeIcon methods

---
Last Updated: February 8, 2026
