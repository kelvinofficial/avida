# Avida Marketplace - Product Requirements Document

## Original Problem Statement
Full-stack React Native/Expo mobile app with critical failures, including a non-functional homepage and missing API endpoints.

## Architecture
- **Frontend**: React Native/Expo (mobile + web) at `https://api-scaffold-1.preview.emergentagent.com`
- **Backend**: FastAPI on port 8001 (same server)
- **Database**: MongoDB Atlas
- **Admin Dashboard**: Next.js (separate deployment)

## What's Been Implemented (Session - Mar 1, 2026)

### Total API Endpoints: 200+

### Latest Implementation - Management Routes (Mar 1, 2026)

#### 1. Listing Moderation (/api/listing-moderation/*)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/listing-moderation` | GET | ✅ |
| `/api/listing-moderation/queue` | GET | ✅ |
| `/api/listing-moderation/queue/count` | GET | ✅ |
| `/api/listing-moderation/{id}/approve` | POST | ✅ |
| `/api/listing-moderation/{id}/reject` | POST | ✅ |
| `/api/listing-moderation/{id}/request-edit` | POST | ✅ |
| `/api/listing-moderation/history` | GET | ✅ |
| `/api/listing-moderation/stats` | GET | ✅ |
| `/api/listing-moderation/rules` | GET/PUT | ✅ |
| `/api/listing-moderation/flagged` | GET | ✅ |

#### 2. Voucher Management (/api/vouchers/*)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/vouchers` | GET/POST | ✅ |
| `/api/vouchers/{id}` | GET/PUT/DELETE | ✅ |
| `/api/vouchers/active` | GET | ✅ |
| `/api/vouchers/expired` | GET | ✅ |
| `/api/vouchers/stats` | GET | ✅ |
| `/api/vouchers/{id}/redemptions` | GET | ✅ |
| `/api/vouchers/{id}/activate` | POST | ✅ |
| `/api/vouchers/{id}/deactivate` | POST | ✅ |
| `/api/vouchers/validate` | POST | ✅ |

#### 3. Commission Management (/api/commission/*)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/commission` | GET | ✅ |
| `/api/commission/rules` | GET/POST | ✅ |
| `/api/commission/rules/{id}` | PUT/DELETE | ✅ |
| `/api/commission/rates` | GET/PUT | ✅ |
| `/api/commission/earnings` | GET | ✅ |
| `/api/commission/history` | GET | ✅ |
| `/api/commission/stats` | GET | ✅ |
| `/api/commission/by-seller` | GET | ✅ |
| `/api/commission/by-category` | GET | ✅ |

#### 4. Invoices (/api/invoices/*)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/invoices` | GET/POST | ✅ |
| `/api/invoices/{id}` | GET/PUT | ✅ |
| `/api/invoices/{id}/download` | GET | ✅ |
| `/api/invoices/stats` | GET | ✅ |
| `/api/invoices/by-status` | GET | ✅ |
| `/api/invoices/by-user/{id}` | GET | ✅ |
| `/api/invoices/{id}/send` | POST | ✅ |
| `/api/invoices/{id}/mark-paid` | POST | ✅ |
| `/api/invoices/overdue` | GET | ✅ |

#### 5. Badge Management (/api/badges/*)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/badges` | GET/POST | ✅ |
| `/api/badges/{id}` | GET/PUT/DELETE | ✅ |
| `/api/badges/active` | GET | ✅ |
| `/api/badges/categories` | GET | ✅ |
| `/api/badges/stats` | GET | ✅ |
| `/api/badges/{id}/holders` | GET | ✅ |
| `/api/badges/{id}/award` | POST | ✅ |
| `/api/badges/{id}/revoke` | POST | ✅ |
| `/api/badges/user/{id}` | GET | ✅ |
| `/api/badges/leaderboard` | GET | ✅ |

### Previous Batches (Admin Utility Routes)

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
