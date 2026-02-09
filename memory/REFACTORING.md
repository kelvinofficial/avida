# Backend Refactoring Guide

This document tracks the gradual refactoring of `/app/backend/server.py` (6000+ lines) into modular files.

## Current Architecture

```
/app/backend/
├── server.py              # Main monolithic file (6000+ lines)
├── ai_listing_analyzer.py # AI analysis service ✅
├── analytics_system.py    # Analytics service ✅
├── banner_system.py       # Banner management ✅
├── boost_system.py        # Boost management ✅
├── escrow_system.py       # Escrow management ✅
├── notification_service.py # SMS/WhatsApp notifications ✅
├── notification_queue.py   # Async notification queue ✅
├── sms_service.py         # Africa's Talking SMS ✅
└── routes/
    ├── __init__.py        # Route exports
    └── auth.py            # Auth routes (READY, not integrated)
```

## Target Architecture

```
/app/backend/
├── server.py              # Main app (~500 lines)
├── routes/
│   ├── __init__.py
│   ├── auth.py            ✅ Created
│   ├── users.py           ⏳ Next
│   ├── listings.py        ⏳ Next
│   ├── categories.py      ⏳ Planned
│   ├── conversations.py   ⏳ Planned
│   ├── favorites.py       ⏳ Planned
│   ├── reports.py         ⏳ Planned
│   └── search.py          ⏳ Planned
├── services/
│   ├── ai_listing_analyzer.py  ✅
│   ├── analytics_system.py     ✅
│   ├── banner_system.py        ✅
│   ├── boost_system.py         ✅
│   ├── escrow_system.py        ✅
│   ├── notification_service.py ✅
│   ├── notification_queue.py   ✅
│   └── sms_service.py          ✅
├── models/
│   └── schemas.py         ⏳ Planned (Pydantic models)
└── utils/
    └── helpers.py         ⏳ Planned (Shared utilities)
```

## Refactoring Progress

### Phase 1: Route Extraction (In Progress)

| Module | Lines | Status | Notes |
|--------|-------|--------|-------|
| auth.py | ~220 | ✅ Created | Register, login, session, logout |
| users.py | ~150 | ⏳ Next | User CRUD, blocking |
| listings.py | ~400 | ⏳ Next | Listing CRUD, similar listings |
| categories.py | ~100 | ⏳ Planned | Category hierarchy |
| conversations.py | ~200 | ⏳ Planned | Messaging |
| favorites.py | ~100 | ⏳ Planned | Favorites management |
| reports.py | ~100 | ⏳ Planned | User reports |
| search.py | ~300 | ⏳ Planned | Advanced search |

### Phase 2: Model Extraction

| Module | Status | Notes |
|--------|--------|-------|
| schemas.py | ⏳ Planned | All Pydantic models |

### Phase 3: Utility Extraction

| Module | Status | Notes |
|--------|--------|-------|
| helpers.py | ⏳ Planned | Rate limiting, auth helpers |

## How to Integrate New Routes

When a route module is ready to integrate:

1. **Add import to server.py:**
```python
from routes import create_auth_router
```

2. **Create router and add to api_router:**
```python
auth_router = create_auth_router(db, get_current_user, get_session_token, check_rate_limit)
api_router.include_router(auth_router)
```

3. **Remove the inline code** from server.py

4. **Test thoroughly** before committing

## Current Server.py Sections (For Reference)

| Section | Lines | Description |
|---------|-------|-------------|
| Imports & Setup | 1-160 | Imports, app config |
| Models | 164-470 | Pydantic models |
| Auth Helpers | 484-528 | get_current_user, etc. |
| Auth Endpoints | 530-777 | register, login, logout |
| User Endpoints | 778-900 | User CRUD |
| Categories | 903-1165 | Category management |
| Listings | 1167-1625 | Listing CRUD |
| Favorites | 1625-1678 | Favorites |
| Messaging | 1678-1950 | Conversations, messages |
| Reports | 2014-2100 | User reports |
| Reviews | 2100-2300 | Seller reviews |
| Search | 2300-2600 | Advanced search |
| Socket.IO | 2600-2900 | Real-time messaging |
| Feed | 2900-3500 | Personalized feed |
| Seller Dashboard | 3500-4500 | Seller analytics |
| Settings | 4500-5000 | User settings |
| Service Integrations | 5000-5925 | External services |

## Testing After Refactoring

After integrating any route module:

1. Run backend tests: `pytest /app/backend/tests/`
2. Test API endpoints manually with curl
3. Verify frontend still works
4. Check logs for errors

## Notes

- Always keep a backup of server.py before major changes
- Integrate one module at a time
- Test thoroughly after each integration
- Some dependencies (like `db`, `get_current_user`) need to be passed to factory functions
