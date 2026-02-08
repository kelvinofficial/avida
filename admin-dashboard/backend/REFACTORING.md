# Backend Refactoring Plan

## Current State
- `server.py` is ~4000 lines with all routes, models, and utilities
- Working but hard to maintain

## Proposed Structure
```
backend/
├── server.py           # Main app, middleware, startup
├── config.py           # Configuration, environment variables
├── database.py         # MongoDB connection
├── models/
│   ├── __init__.py
│   ├── admin.py        # Admin user models
│   ├── auth.py         # Auth request/response models
│   ├── category.py     # Category models
│   ├── listing.py      # Listing models
│   ├── user.py         # User models
│   └── common.py       # Shared models (pagination, etc.)
├── routes/
│   ├── __init__.py
│   ├── auth.py         # /auth/* endpoints
│   ├── admin_users.py  # /admins/* endpoints
│   ├── categories.py   # /categories/* endpoints
│   ├── attributes.py   # /attributes/* endpoints
│   ├── listings.py     # /listings/* endpoints
│   ├── users.py        # /users/* endpoints
│   ├── locations.py    # /locations/* endpoints
│   ├── deeplinks.py    # /deeplinks/* endpoints
│   ├── settings.py     # /settings/* endpoints
│   ├── notifications.py# /notifications/* endpoints
│   ├── analytics.py    # /analytics/* endpoints
│   ├── reports.py      # /reports/* endpoints
│   ├── tickets.py      # /tickets/* endpoints
│   ├── ads.py          # /ads/* endpoints
│   └── health.py       # /health endpoint
├── services/
│   ├── auth_service.py # JWT, password hashing
│   ├── audit_service.py# Audit logging
│   └── push_service.py # Push notifications (existing)
└── utils/
    ├── sanitizer.py    # Input sanitization
    └── validators.py   # Common validators
```

## Refactoring Steps
1. Create `config.py` - Extract configuration
2. Create `database.py` - Extract MongoDB setup
3. Create `models/` directory - Extract Pydantic models
4. Create `services/` directory - Extract business logic
5. Create `routes/` directory - Extract route handlers one by one
6. Update `server.py` to import and mount routers
7. Test each route after extraction
8. Remove duplicated code from `server.py`

## Priority Order
1. auth.py - Most critical, test thoroughly
2. categories.py - High usage
3. listings.py - High usage  
4. users.py - Medium usage
5. Others in order of usage

## Notes
- Keep backward compatibility during refactoring
- Test each extracted module before proceeding
- Document any breaking changes
