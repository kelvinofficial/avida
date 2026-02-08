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
- **Backend**: FastAPI, Python 3.11, Motor (MongoDB async driver)
- **Frontend**: Next.js 16 with Turbopack, TypeScript, Material-UI
- **Database**: MongoDB
- **Real-time**: WebSockets

### Code Structure
```
/app/admin-dashboard/
├── backend/
│   ├── server.py         # Main FastAPI application (~4000 lines)
│   └── .env              # Environment configuration
└── frontend/
    ├── src/
    │   ├── app/          # Next.js App Router pages
    │   ├── lib/api.ts    # API client
    │   └── components/   # Reusable components
    └── .env.local        # Frontend environment
```

### Key Endpoints
- `POST /api/admin/auth/login` - Admin authentication
- `GET/POST/PUT/DELETE /api/admin/locations` - Location management
- `GET/POST/PUT/DELETE /api/admin/deeplinks` - Deeplink management
- `GET/PUT /api/admin/settings/auth` - Auth settings
- `GET/PUT /api/admin/users/{user_id}` - User management
- `POST /api/admin/categories/{id}/icon` - Icon upload

### Credentials
- Admin: admin@example.com / admin123

---

## Implementation Status

### Completed Features
- [x] Notifications page with live API
- [x] CSV Import for Categories and Listings
- [x] Pre-defined Notification Templates
- [x] Comprehensive Listing Edit (with dynamic attributes)
- [x] Full Custom Attributes Management page
- [x] Advanced attribute features (inheritance, templates, bulk)
- [x] Backend APIs for Locations, Deeplinks, Auth Settings
- [x] Settings page frontend (Locations, Deeplinks, Auth tabs)
- [x] User Edit dialog in Users page

### Known Issues
- **BLOCKER**: Next.js routing returning 404 for all `/dashboard/*` routes despite page files existing
- Backend `server.py` is monolithic (~4000 lines) - needs refactoring

### Pending Tasks
- [ ] Debug Next.js routing issue
- [ ] Backend refactoring (split server.py into smaller files)
- [ ] Icon upload functionality
- [ ] Notification Scheduling UI
- [ ] Custom Template Management UI
- [ ] Real-time Dashboard Updates (WebSocket)

### Future/Backlog
- CSV Import for Users
- Notification Template Analytics
- Full A/B Testing Logic and UI
- Granular Notification Targeting

---
Last Updated: February 8, 2026
