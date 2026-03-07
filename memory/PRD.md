# Avida Marketplace - Product Requirements Document

## Original Problem Statement
Full-stack React Native/Expo mobile app with critical failures, including a non-functional homepage and missing API endpoints.

## Architecture
- **Frontend**: React Native/Expo (mobile + web) at `https://branding-hub-20.preview.emergentagent.com`
- **Backend**: FastAPI on port 8001 (same server)
- **Database**: MongoDB Atlas
- **Admin Dashboard**: Next.js (separate deployment)

## What's Been Implemented (Session - Mar 7, 2026)

### Latest Implementation - Seller Performance Analytics (Mar 7, 2026)

#### Seller Analytics Endpoints (/api/analytics/*)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/analytics/track` | POST | ✅ (Enhanced - device, region, referrer, anti-bot) |
| `/api/analytics/seller/performance` | GET | ✅ (Auth - seller dashboard) |
| `/api/analytics/listing/{id}/performance` | GET | ✅ (Auth - per-listing metrics) |
| `/api/analytics/insights/{id}` | GET | ✅ (Auth - AI-powered suggestions) |
| `/api/analytics/location/{id}` | GET | ✅ (Auth - geographic breakdown) |
| `/api/analytics/boost-impact/{id}` | GET | ✅ (Auth - before/after boost comparison) |
| `/api/analytics/engagement/settings` | GET | ✅ (Auth - notification preferences) |
| `/api/analytics/engagement/settings` | PUT | ✅ (Auth - update preferences) |
| `/api/analytics/engagement/check-spikes` | POST | ✅ (Admin - spike detection job) |
| `/api/analytics/badges/notify` | POST | ✅ (Admin - badge notification trigger) |

#### Admin Analytics Endpoints (/api/admin/*)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/admin/seller-analytics/control` | GET | ✅ (Admin - get feature toggles) |
| `/api/admin/seller-analytics/control` | PUT | ✅ (Admin - update feature toggles) |
| `/api/admin/analytics/top-performers` | GET | ✅ (Admin - platform-wide top listings/sellers) |

**Features:**
- Privacy-focused: IP hashing, bot filtering, self-view filtering
- Rate limiting: 100 events/minute per IP
- Conversion funnel tracking (views → saves → chats → offers → purchases)
- Hourly/device/referrer breakdown analytics
- AI-powered insights with actionable recommendations
- Engagement spike detection (runs every 30 min)
- Badge unlock notifications

**Collections:**
- `analytics_events` - Event tracking with metadata
- `engagement_notifications` - Spike alerts
- `seller_analytics_settings` - User notification preferences
- `admin_settings` - Platform-wide analytics controls

---

## What's Been Implemented (Session - Mar 6, 2026)

### Dynamic Banner Management System (Mar 6, 2026)

#### Public Banner Endpoints (/api/banners/*)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/banners/slots` | GET | ✅ (Public) |
| `/api/banners/sizes` | GET | ✅ (Public) |
| `/api/banners/display/{placement}` | GET | ✅ (Public - with targeting) |
| `/api/banners/track/impression/{id}` | POST | ✅ (Public) |
| `/api/banners/track/click/{id}` | POST | ✅ (Public) |

#### Admin Banner Endpoints (/api/admin/banners/*)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/admin/banners/slots` | GET | ✅ (Admin auth) |
| `/api/admin/banners/slots/{id}` | PUT | ✅ (Admin auth) |
| `/api/admin/banners` | GET | ✅ (Admin auth - paginated) |
| `/api/admin/banners/{id}` | GET | ✅ (Admin auth) |
| `/api/admin/banners` | POST | ✅ (Admin auth - create) |
| `/api/admin/banners/{id}` | PUT | ✅ (Admin auth - update) |
| `/api/admin/banners/{id}` | DELETE | ✅ (Admin auth) |
| `/api/admin/banners/{id}/status` | PATCH | ✅ (Admin auth - toggle) |
| `/api/admin/banners/{id}/duplicate` | POST | ✅ (Admin auth) |
| `/api/admin/banners/analytics/summary` | GET | ✅ (Admin auth) |
| `/api/admin/banners/analytics/by-placement` | GET | ✅ (Admin auth) |
| `/api/admin/banners/analytics/export` | GET | ✅ (Admin auth - CSV) |

**Features:**
- 14 predefined banner placement slots (global, listing_feeds, listing_detail, other_pages)
- Banner types: image, html, script (AdSense/AdMob support)
- Targeting: devices, countries, cities, categories
- Rotation: random, weighted, fixed (by priority)
- Frequency capping per user
- Scheduling: start_date, end_date
- Full analytics: impressions, clicks, CTR, unique users
- CSV export for reporting

**Technical Notes:**
- Router registered BEFORE admin proxy catch-all
- "banners" added to `ADMIN_LOCAL_PATHS`
- Collections: `banner_slots`, `banners`, `banner_impressions`
- Auto-seeding of predefined slots on first access

---

## What's Been Implemented (Session - Mar 5, 2026)

### Admin Branding Endpoints (Mar 5, 2026)

#### Admin Branding (/api/admin/branding/*)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/admin/branding` | GET | ✅ (Admin auth required) |
| `/api/admin/branding/public` | GET | ✅ (No auth - public) |
| `/api/admin/branding/settings` | PUT | ✅ (Admin auth required) |
| `/api/admin/branding/upload/{type}` | POST | ✅ (Admin auth required) |
| `/api/admin/branding/logo/{type}` | GET | ✅ (No auth - public) |
| `/api/admin/branding/{type}` | DELETE | ✅ (Admin auth required) |

**Available logo types**: primary, dark, light, favicon, icon, splash, email, watermark, og_image

**Technical Notes:**
- Router registered BEFORE admin proxy catch-all to ensure proper routing
- "branding" added to `ADMIN_LOCAL_PATHS` to prevent proxy forwarding
- Logos stored as base64 in MongoDB `branding_logos` collection
- Settings stored in MongoDB `branding_settings` collection

---

## What's Been Implemented (Session - Mar 1, 2026)

### Total API Endpoints: 295+

### Previous Implementation - Analytics & Admin Routes (Mar 1, 2026)

#### 1. Cohort Analytics (/api/cohort-analytics/*)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/cohort-analytics` | GET | ✅ |
| `/api/cohort-analytics/cohorts` | GET/POST | ✅ |
| `/api/cohort-analytics/cohorts/{id}` | GET | ✅ |
| `/api/cohort-analytics/retention` | GET | ✅ |
| `/api/cohort-analytics/segments` | GET | ✅ |
| `/api/cohort-analytics/segments/available` | GET | ✅ |
| `/api/cohort-analytics/compare` | POST | ✅ |
| `/api/cohort-analytics/trends` | GET | ✅ |
| `/api/cohort-analytics/export` | GET | ✅ |

#### 2. Search Analytics (/api/search-analytics/*)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/search-analytics` | GET | ✅ |
| `/api/search-analytics/top-queries` | GET | ✅ |
| `/api/search-analytics/no-results` | GET | ✅ |
| `/api/search-analytics/trends` | GET | ✅ |
| `/api/search-analytics/conversions` | GET | ✅ |
| `/api/search-analytics/filters` | GET | ✅ |
| `/api/search-analytics/suggestions` | GET | ✅ |
| `/api/search-analytics/by-category` | GET | ✅ |
| `/api/search-analytics/export` | GET | ✅ |

#### 3. Attributes (/api/attributes/*)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/attributes` | GET/POST | ✅ |
| `/api/attributes/{id}` | GET/PUT/DELETE | ✅ |
| `/api/attributes/by-category/{id}` | GET | ✅ |
| `/api/attributes/templates` | GET/POST | ✅ |
| `/api/attributes/usage` | GET | ✅ |

#### 4. Attribute Icons (/api/attribute-icons/*)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/attribute-icons` | GET/POST | ✅ |
| `/api/attribute-icons/{id}` | GET/PUT/DELETE | ✅ |
| `/api/attribute-icons/categories` | GET | ✅ |
| `/api/attribute-icons/search` | GET | ✅ |

#### 5. Photography Guides (/api/photography-guides/*)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/photography-guides` | GET/POST | ✅ |
| `/api/photography-guides/{id}` | GET/PUT/DELETE | ✅ |
| `/api/photography-guides/by-category/{id}` | GET | ✅ |
| `/api/photography-guides/public/{category}` | GET | ✅ |
| `/api/photography-guides/tips` | GET | ✅ |

#### 6. Form Configuration (/api/form-config/*)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/form-config` | GET | ✅ |
| `/api/form-config/listing` | GET/PUT | ✅ |
| `/api/form-config/registration` | GET/PUT | ✅ |
| `/api/form-config/fields` | GET/POST | ✅ |
| `/api/form-config/by-category/{id}` | GET | ✅ |
| `/api/form-config/validations` | GET/PUT | ✅ |

#### 7. Verification (/api/verification/*)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/verification` | GET | ✅ |
| `/api/verification/requests` | GET | ✅ |
| `/api/verification/requests/{id}` | GET | ✅ |
| `/api/verification/requests/{id}/approve` | POST | ✅ |
| `/api/verification/requests/{id}/reject` | POST | ✅ |
| `/api/verification/types` | GET/PUT | ✅ |
| `/api/verification/stats` | GET | ✅ |
| `/api/verification/verified-users` | GET | ✅ |
| `/api/verification/settings` | GET/PUT | ✅ |

#### 8. Business Profiles (/api/business-profiles/*)
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/business-profiles` | GET/POST | ✅ |
| `/api/business-profiles/{id}` | GET/PUT/DELETE | ✅ |
| `/api/business-profiles/pending` | GET | ✅ |
| `/api/business-profiles/{id}/approve` | POST | ✅ |
| `/api/business-profiles/{id}/reject` | POST | ✅ |
| `/api/business-profiles/verified` | GET | ✅ |
| `/api/business-profiles/stats` | GET | ✅ |

### Previous Implementation - Management Routes (Mar 1, 2026)

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
