# Admin Dashboard - Project Documentation

## Overview
Production-ready Admin Dashboard for Marketplace Management built with:
- **Backend**: FastAPI + MongoDB (shared with marketplace)
- **Frontend**: Next.js 14 + Material UI 3 + TypeScript
- **Auth**: JWT + Refresh Tokens, RBAC

## Quick Start

### Admin Backend
```bash
cd /app/admin-dashboard/backend
uvicorn server:app --host 0.0.0.0 --port 8002 --reload
```

### Admin Frontend
```bash
cd /app/admin-dashboard/frontend
npm run dev -- -p 3001
```

### Default Admin Credentials
- **Email**: admin@marketplace.com
- **Password**: Admin@123456
- **Role**: Super Admin

## API Documentation
Access Swagger docs at: `http://localhost:8002/docs`

## Architecture

### Database Collections (MongoDB)
```
classifieds_db/
├── admin_users          # Admin accounts
├── admin_categories     # Category hierarchy with attributes
├── admin_tickets        # Support tickets
├── admin_audit_logs     # All admin actions
├── admin_settings       # Global configuration
├── users                # Marketplace users (existing)
├── listings             # Marketplace listings (existing)
└── reports              # User reports (existing)
```

### Role-Based Access Control (RBAC)
| Role | Permissions |
|------|-------------|
| Super Admin | Full access to everything |
| Admin | All except manage_admins |
| Moderator | Users, Listings, Reports, Tickets |
| Support Agent | View users/listings, Manage tickets |
| Finance Analyst | Analytics, Export data |

### API Endpoints

#### Authentication
- `POST /api/admin/auth/login` - Admin login
- `POST /api/admin/auth/refresh` - Refresh token
- `POST /api/admin/auth/logout` - Logout
- `GET /api/admin/auth/me` - Get current admin

#### Admin Users
- `GET /api/admin/admins` - List admins
- `POST /api/admin/admins` - Create admin
- `PATCH /api/admin/admins/{id}` - Update admin

#### Categories (with hierarchy)
- `GET /api/admin/categories` - List categories (tree)
- `POST /api/admin/categories` - Create category
- `GET /api/admin/categories/{id}` - Get category
- `PATCH /api/admin/categories/{id}` - Update category
- `DELETE /api/admin/categories/{id}` - Delete category
- `POST /api/admin/categories/reorder` - Reorder categories

#### Attributes
- `GET /api/admin/categories/{id}/attributes` - Get attributes
- `POST /api/admin/categories/{id}/attributes` - Add attribute
- `PATCH /api/admin/categories/{id}/attributes/{attr_id}` - Update
- `DELETE /api/admin/categories/{id}/attributes/{attr_id}` - Delete

#### Users
- `GET /api/admin/users` - List users (paginated, filterable)
- `GET /api/admin/users/{id}` - Get user details
- `POST /api/admin/users/{id}/ban` - Ban user
- `POST /api/admin/users/{id}/unban` - Unban user

#### Listings
- `GET /api/admin/listings` - List listings
- `GET /api/admin/listings/{id}` - Get listing
- `PATCH /api/admin/listings/{id}/status` - Update status
- `POST /api/admin/listings/{id}/feature` - Toggle feature
- `POST /api/admin/listings/bulk` - Bulk actions

#### Reports
- `GET /api/admin/reports` - List reports
- `PATCH /api/admin/reports/{id}` - Update report

#### Tickets
- `GET /api/admin/tickets` - List tickets
- `POST /api/admin/tickets` - Create ticket
- `PATCH /api/admin/tickets/{id}` - Update ticket
- `POST /api/admin/tickets/{id}/respond` - Add response

#### Analytics
- `GET /api/admin/analytics/overview` - Dashboard stats
- `GET /api/admin/analytics/listings-by-category` - Category breakdown
- `GET /api/admin/analytics/users-growth` - User growth chart

#### Audit Logs
- `GET /api/admin/audit-logs` - List audit logs

#### Settings
- `GET /api/admin/settings` - Get settings
- `PATCH /api/admin/settings` - Update settings

## Seeded Data

### Categories (12 total)
1. Auto & Vehicles
   - Cars (with 7 attributes)
   - Motorcycles
   - Trucks & Commercial
   - Parts & Accessories
2. Electronics
3. Fashion & Beauty
4. Home & Furniture
5. Properties
6. Jobs & Services
7. Phones & Tablets
8. Sports & Hobbies

### Car Attributes Example
- Make (dropdown: BMW, Mercedes, Audi, etc.)
- Model (text)
- Year (year picker, validation: 1990-2026)
- Mileage (number, step: 1000)
- Fuel Type (dropdown: Petrol, Diesel, Electric, etc.)
- Transmission (dropdown: Manual, Automatic, etc.)
- Color (dropdown)

## Security Features
- JWT authentication with refresh tokens
- Password validation (8+ chars, uppercase, lowercase, digit)
- Input sanitization (XSS protection via bleach)
- Permission-based access control
- Audit logging for all mutations
- Rate limiting ready (slowapi installed)

## What's Implemented

### Backend (100%)
- [x] Admin authentication (JWT + refresh)
- [x] RBAC with 5 roles
- [x] Audit logging middleware
- [x] Category CRUD with hierarchy
- [x] Dynamic attributes per category
- [x] User management (list, view, ban/unban)
- [x] Listing management (CRUD, status, bulk actions)
- [x] Reports management
- [x] Tickets/Support system
- [x] Analytics endpoints
- [x] Settings management
- [x] Health check

### Frontend (Foundation)
- [x] Project structure (Next.js 14 + TypeScript)
- [x] MUI dependencies installed
- [x] API client with interceptors
- [x] Auth store (Zustand)
- [x] Type definitions

### Frontend (TODO - Next Steps)
- [ ] Login page
- [ ] Dashboard layout (sidebar + topbar)
- [ ] Overview dashboard with charts
- [ ] Category manager with drag-drop
- [ ] Attribute builder UI
- [ ] Users table + detail view
- [ ] Listings table + editor
- [ ] Reports/Tickets inbox
- [ ] Analytics pages
- [ ] Settings page
- [ ] Audit logs viewer

## Environment Variables

### Backend (.env)
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=classifieds_db
JWT_SECRET_KEY=change-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
ADMIN_CORS_ORIGINS=http://localhost:3001
ADMIN_PORT=8002
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8002/api/admin
NEXT_PUBLIC_APP_NAME=Admin Dashboard
```

## Testing with curl

```bash
# Login
TOKEN=$(curl -s -X POST "http://localhost:8002/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@marketplace.com","password":"Admin@123456"}' | jq -r '.access_token')

# Get categories
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8002/api/admin/categories"

# Create category
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "http://localhost:8002/api/admin/categories" \
  -d '{"name":"New Category","slug":"new-category","order":100}'

# Add attribute to category
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "http://localhost:8002/api/admin/categories/cat_auto_cars/attributes" \
  -d '{"name":"Engine Size","key":"engine_size","type":"number","required":false}'
```

## File Structure
```
/app/admin-dashboard/
├── backend/
│   ├── server.py           # Main FastAPI application
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Environment variables
└── frontend/
    ├── src/
    │   ├── app/           # Next.js pages
    │   ├── components/    # React components
    │   ├── lib/           # API client, utilities
    │   ├── store/         # Zustand stores
    │   └── types/         # TypeScript definitions
    ├── package.json
    └── .env.local
```
