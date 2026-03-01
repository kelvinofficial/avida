# Avida Marketplace - Product Requirements Document

## Original Problem Statement
Full-stack React Native/Expo mobile app with critical failures, including a non-functional homepage and missing API endpoints.

## Architecture
- **Frontend**: React Native/Expo (mobile + web) at `https://prod-upgrade.preview.emergentagent.com`
- **Backend**: FastAPI on port 8001 (same server)
- **Database**: MongoDB Atlas
- **Admin Dashboard**: Next.js (separate deployment)

## What's Been Implemented (Session - Mar 1, 2026)

### Total API Endpoints: 180+

### Batch 3 - Admin Utility Routes (Latest)

#### 1. Reports
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/reports` | GET/POST | ✅ |
| `/api/reports/{id}` | GET/PUT | ✅ |
| `/api/reports/stats` | GET | ✅ |
| `/api/reports/by-type` | GET | ✅ |
| `/api/reports/pending` | GET | ✅ |
| `/api/reports/{id}/resolve` | POST | ✅ |

#### 2. Support Tickets
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/tickets` | GET/POST | ✅ |
| `/api/tickets/{id}` | GET/PUT | ✅ |
| `/api/tickets/stats` | GET | ✅ |
| `/api/tickets/by-status` | GET | ✅ |
| `/api/tickets/by-priority` | GET | ✅ |
| `/api/tickets/{id}/reply` | POST | ✅ |
| `/api/tickets/{id}/assign` | POST | ✅ |
| `/api/tickets/{id}/close` | POST | ✅ |

#### 3. Banners
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/banners` | GET/POST | ✅ |
| `/api/banners/{id}` | GET/PUT/DELETE | ✅ |
| `/api/banners/active` | GET | ✅ |
| `/api/banners/stats` | GET | ✅ |
| `/api/banners/analytics` | GET | ✅ |
| `/api/banners/{id}/activate` | POST | ✅ |
| `/api/banners/{id}/deactivate` | POST | ✅ |

#### 4. Moderation
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/moderation` | GET | ✅ |
| `/api/moderation/queue` | GET | ✅ |
| `/api/moderation/history` | GET | ✅ |
| `/api/moderation/rules` | GET/PUT | ✅ |
| `/api/moderation/listings/{id}/approve` | POST | ✅ |
| `/api/moderation/listings/{id}/reject` | POST | ✅ |
| `/api/moderation/listings/{id}/flag` | POST | ✅ |

#### 5. Data Privacy
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/data-privacy` | GET | ✅ |
| `/api/data-privacy/requests` | GET | ✅ |
| `/api/data-privacy/requests/{id}/approve` | POST | ✅ |
| `/api/data-privacy/requests/{id}/reject` | POST | ✅ |
| `/api/data-privacy/settings` | GET/PUT | ✅ |
| `/api/data-privacy/consent-logs` | GET | ✅ |
| `/api/data-privacy/exports` | GET | ✅ |
| `/api/data-privacy/users/{id}/export` | POST | ✅ |
| `/api/data-privacy/users/{id}/delete` | POST | ✅ |

#### 6. Config Manager
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/config` | GET/PUT | ✅ |
| `/api/config/categories` | GET | ✅ |
| `/api/config/{category}` | GET/PUT | ✅ |
| `/api/config/history` | GET | ✅ |
| `/api/config/reset` | POST | ✅ |

#### 7. SEO Tools
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/seo-tools` | GET | ✅ |
| `/api/seo-tools/meta-tags` | GET/PUT | ✅ |
| `/api/seo-tools/sitemap` | GET | ✅ |
| `/api/seo-tools/sitemap/generate` | POST | ✅ |
| `/api/seo-tools/robots` | GET/PUT | ✅ |
| `/api/seo-tools/redirects` | GET/POST | ✅ |
| `/api/seo-tools/redirects/{id}` | DELETE | ✅ |

#### 8. Polls & Surveys
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/polls` | GET/POST | ✅ |
| `/api/polls/{id}` | GET/PUT/DELETE | ✅ |
| `/api/polls/{id}/results` | GET | ✅ |
| `/api/polls/active` | GET | ✅ |
| `/api/polls/{id}/activate` | POST | ✅ |
| `/api/polls/{id}/close` | POST | ✅ |

#### 9. Cookie Consent
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/cookie-consent` | GET/PUT | ✅ |
| `/api/cookie-consent/categories` | GET/PUT | ✅ |
| `/api/cookie-consent/banner` | GET/PUT | ✅ |
| `/api/cookie-consent/logs` | GET | ✅ |
| `/api/cookie-consent/stats` | GET | ✅ |

#### 10. URL Shortener
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/short-urls` | GET/POST | ✅ |
| `/api/short-urls/{id}` | GET/PUT/DELETE | ✅ |
| `/api/short-urls/{id}/stats` | GET | ✅ |
| `/api/short-urls/analytics` | GET | ✅ |

#### 11. reCAPTCHA
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/recaptcha` | GET/PUT | ✅ |
| `/api/recaptcha/stats` | GET | ✅ |
| `/api/recaptcha/logs` | GET | ✅ |
| `/api/recaptcha/thresholds` | PUT | ✅ |

#### 12. Image Settings
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/image-settings` | GET/PUT | ✅ |
| `/api/image-settings/compression` | GET/PUT | ✅ |
| `/api/image-settings/watermark` | GET/PUT | ✅ |
| `/api/image-settings/limits` | GET/PUT | ✅ |

### Previously Implemented Batches

**Batch 2 - Growth & SEO (60+ endpoints)**
- Growth Engine, AI Content Engine, ASO Engine
- Content Calendar, Advanced SEO, SEO Analytics
- Multilang SEO, Backlinks, Authority Building
- Social Distribution, Audit Logs, Analytics Settings

**Batch 1 - Admin API Routes (50+ endpoints)**
- Segments, Smart Notifications, Notification Analytics
- AI Personalization, SMS & WhatsApp
- AI Listing Analyzer, A/B Testing
- API Integrations, Webhooks, API Keys

### Files Created This Session
- `/app/backend/admin_utility_routes.py` - Reports, Tickets, Banners, Moderation, Privacy, Config, SEO Tools, Polls, Cookie Consent, URL Shortener, reCAPTCHA, Image Settings
- `/app/backend/growth_seo_routes.py` - Growth Engine, SEO Analytics, Backlinks, Authority Building, Social Distribution
- `/app/backend/admin_api_routes.py` - Segments, Notifications, AI Personalization, A/B Testing

## Current App Status
- **Backend API**: WORKING - 180+ API endpoints now functional
- **All endpoints tested and returning 200 OK**

## Test Credentials
- Test user: `apitest_1772376154@test.com` / `Test123456`
- Admin user: `admin@marketplace.com` / `Admin@123456`
