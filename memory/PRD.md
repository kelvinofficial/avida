# Avida Marketplace - Product Requirements Document

## Original Problem Statement
Full-stack React Native/Expo mobile app with critical failures, including a non-functional homepage and missing API endpoints.

## Architecture
- **Frontend**: React Native/Expo (mobile + web) at `https://prod-upgrade.preview.emergentagent.com`
- **Backend**: FastAPI on port 8001 (same server)
- **Database**: MongoDB Atlas (`mongodb+srv://avida_admin:AvidaTZ@avidatz.dipxnt9.mongodb.net/classifieds_db`)
- **Admin Dashboard**: Next.js (separate deployment)

## What's Been Implemented (Latest Session - Mar 1, 2026)

### New API Endpoints Implemented

#### 1. Segment Builder
| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/api/segments` | GET | ✅ | List all user segments |
| `/api/segments` | POST | ✅ | Create new segment |
| `/api/segments/{id}` | GET | ✅ | Get segment details |
| `/api/segments/{id}` | PUT | ✅ | Update segment |
| `/api/segments/{id}` | DELETE | ✅ | Delete segment |
| `/api/segments/fields` | GET | ✅ | Available fields for segmentation |

#### 2. Smart Notifications
| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/api/smart-notifications` | GET | ✅ | List automation rules |
| `/api/smart-notifications` | POST | ✅ | Create automation rule |
| `/api/smart-notifications/{id}` | GET | ✅ | Get rule details |
| `/api/smart-notifications/{id}` | PUT | ✅ | Update rule |
| `/api/smart-notifications/{id}` | DELETE | ✅ | Delete rule |
| `/api/smart-notifications/triggers` | GET | ✅ | Available triggers |

#### 3. Notification Analytics
| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/api/notification-analytics` | GET | ✅ | Overview stats |
| `/api/notification-analytics/by-channel` | GET | ✅ | Stats by channel |
| `/api/notification-analytics/trends` | GET | ✅ | Time-series data |

#### 4. AI Personalization
| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/api/ai-personalization` | GET | ✅ | Get settings |
| `/api/ai-personalization` | PUT | ✅ | Update settings |
| `/api/ai-personalization/segments` | GET | ✅ | AI-generated segments |
| `/api/ai-personalization/recommendations/config` | GET | ✅ | Recommendation engine config |

#### 5. SMS & WhatsApp
| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/api/sms/config` | GET | ✅ | SMS provider configuration |
| `/api/sms/config` | PUT | ✅ | Update SMS config |
| `/api/sms/templates` | GET | ✅ | SMS templates |
| `/api/sms/templates` | POST | ✅ | Create template |
| `/api/whatsapp/config` | GET | ✅ | WhatsApp configuration |
| `/api/whatsapp/templates` | GET | ✅ | WhatsApp templates |

#### 6. AI Listing Analyzer
| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/api/ai-analyzer/config` | GET | ✅ | Analyzer configuration |
| `/api/ai-analyzer/config` | PUT | ✅ | Update config |
| `/api/ai-analyzer/analytics` | GET | ✅ | Usage analytics |
| `/api/ai-analyzer/queue` | GET | ✅ | Analysis queue status |
| `/api/ai-analyzer/analyze` | POST | ✅ | Analyze a listing |

#### 7. A/B Testing
| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/api/ab-testing` | GET | ✅ | List experiments |
| `/api/ab-testing` | POST | ✅ | Create experiment |
| `/api/ab-testing/{id}` | GET | ✅ | Get experiment details |
| `/api/ab-testing/{id}` | PUT | ✅ | Update experiment |
| `/api/ab-testing/{id}/results` | GET | ✅ | Get experiment results |
| `/api/ab-testing/{id}/start` | POST | ✅ | Start experiment |
| `/api/ab-testing/{id}/stop` | POST | ✅ | Stop experiment |

#### 8. API Integrations
| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/api/integrations` | GET | ✅ | List all integrations |
| `/api/integrations/{id}` | GET | ✅ | Get integration details |
| `/api/integrations/{id}/connect` | PUT | ✅ | Connect integration |
| `/api/integrations/{id}` | DELETE | ✅ | Disconnect integration |
| `/api/webhooks` | GET | ✅ | List webhooks |
| `/api/webhooks` | POST | ✅ | Create webhook |
| `/api/api-keys` | GET | ✅ | List API keys |
| `/api/api-keys` | POST | ✅ | Generate new API key |

### Files Created/Modified
- `/app/backend/admin_api_routes.py` - **NEW** - Public-facing admin API endpoints
- `/app/backend/server.py` - Added admin API routes registration
- `/app/backend/ai_listing_analyzer.py` - Added root-level endpoint aliases

## Current App Status
- **Homepage**: WORKING - Displays categories, search, and listings
- **Listing Detail Page**: WORKING - Shows full listing with location formatted correctly
- **Backend API**: WORKING - All 50+ requested endpoints now functional
- **Authentication**: Working via session_token

## Pending Issues (P1-P2)

### Issue 2: Chat Options Functionality (P1)
- Backend routes in `conversations.py` and `users.py` are placeholders
- Frontend handler functions in `chat/[id].tsx` are empty
- Features needed: Mute, Delete, Block, etc.

### Issue 3: Close (X) icons on auth screens (P2)
- Previous agent implemented fix using `useSafeAreaInsets`
- Status: Needs verification

### Issue 4: Duplicate notification settings on Profile page (P2)
- Source of duplication not found in code review
- Status: Needs investigation

### Issue 5: Backend ObjectId serialization error (P2)
- May cause API requests to fail
- Status: Needs investigation

## Future Tasks (Backlog)
- Image Optimization Pipeline: Store compressed WebP images on a CDN
- Multi-Language Content Generation: Support for German and Swahili
- Web App Development: Based on WEB_APP_SPECIFICATION.md

## Test Credentials
- Test user: `apitest_1772376154@test.com` / `Test123456`
- Admin user: `admin@marketplace.com` / `Admin@123456`

## Technical Notes
- Backend uses `server:app` entry point (not `socket_app`)
- No `--reload` flag in supervisor config to prevent startup hangs
- All API endpoints require `/api` prefix
- Authentication uses session_token in Bearer Authorization header
- AI Analyzer endpoints available at both `/api/ai-analyzer/*` and `/api/ai-analyzer/admin/*`
