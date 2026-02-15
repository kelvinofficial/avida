# Product Requirements Document - Avida Marketplace

## Original Problem Statement
Build a full-stack classifieds application for Tanzania with admin dashboard, SEO suite, AI tools, deep linking, and A/B testing features.

## Core Architecture
- **Frontend**: React Native/Expo web application
- **Backend**: FastAPI with MongoDB
- **Admin Dashboard**: Next.js application at `/api/admin-ui`
- **Admin Backend**: FastAPI at port 8002 (proxied via main backend)

## AI SEO Growth Engine - FULLY IMPLEMENTED

### Component Status

| Component | Status | Description |
|-----------|--------|-------------|
| Technical SEO Core | ✅ COMPLETE | Sitemap, robots.txt, Schema.org structured data |
| AI Content Engine | ✅ COMPLETE | Blog generation with GPT-5.2, AEO content |
| ASO Engine | ✅ COMPLETE | Google Play & App Store optimization |
| Growth Analytics | ✅ COMPLETE | Dashboard, SEO audit, keyword tracking |

### Phase 1: Technical SEO Core - COMPLETE
- **Sitemap.xml Generation** (`/api/growth/seo-core/sitemap.xml`)
  - Dynamic XML sitemap with listings, categories, blog posts
  - Image sitemap support
  - Proper XML namespaces
- **Robots.txt** (`/api/growth/seo-core/robots.txt`)
  - AI crawler support (GPTBot, Google-Extended, CCBot)
  - Proper disallow rules for private areas
- **Schema.org Structured Data**
  - Organization schema (`/api/growth/seo-core/schema/organization`)
  - FAQ schema with 8 questions optimized for AI search
  - Product schema for listings
  - Breadcrumb schema
- **Meta Tags Generation** (`/api/growth/seo-core/meta-tags/{page_type}/{page_id}`)
  - Open Graph and Twitter Cards
  - Canonical URLs
- **Hreflang Tags** for multi-language support (EN, DE, SW)

### Phase 2: AI Content Engine - COMPLETE
- **Blog Post Generation** (`/api/growth/content/generate-post`)
  - Powered by GPT-5.2 via Emergent LLM Key
  - SEO-optimized long-form articles
  - FAQ sections for AI search visibility
  - Internal linking suggestions
- **AEO Content** (`/api/growth/content/generate-aeo-content`)
  - Content optimized for ChatGPT, Gemini, Claude, Perplexity citation
- **Content Scheduling** for 5+ posts per week
- **Content Analytics** (`/api/growth/content/analytics`)

### Phase 3: ASO Engine - COMPLETE
- **Google Play Optimization** (`/api/growth/aso/google-play/generate`)
  - App title (30 chars)
  - Short description (80 chars)
  - Long description (4000 chars)
  - Feature bullets
- **App Store Optimization** (`/api/growth/aso/app-store/generate`)
  - App name (30 chars)
  - Subtitle (30 chars)
  - Keywords (100 chars)
  - Promotional text (170 chars)
- **Keyword Research** per region (`/api/growth/aso/keywords/{region}`)
- **Competitor Analysis** (`/api/growth/aso/competitor-analysis/{region}`)
- **A/B Testing Framework**
- **Localization** (6 countries, 3 languages)

### Phase 4: Growth Analytics Dashboard - COMPLETE
- **Dashboard Overview** (`/api/growth/analytics/dashboard`)
  - Blog posts count
  - Organic traffic metrics
  - AI citations tracking
  - Active listings count
- **Keyword Tracking** (`/api/growth/analytics/keywords`)
- **SEO Audit** (`/api/growth/analytics/seo-audit`)
- **Growth Targets** (`/api/growth/analytics/targets`)
  - 6-month keyword ranking goals
  - 300% organic traffic increase target
  - AI citation targets

### Target Markets
- Germany (DE) - German, English
- Tanzania (TZ) - Swahili, English
- Kenya (KE) - Swahili, English
- Uganda (UG) - English, Swahili
- Nigeria (NG) - English
- South Africa (ZA) - English, Afrikaans

### 6-Month Growth Goals
1. Rank top 3 for: "Buy and sell Germany", "Marketplace Tanzania", "Safe online marketplace Africa", "Used cars Dar es Salaam"
2. Increase organic app installs by 300%
3. Be cited by AI search engines as trusted marketplace
4. Generate 120 blog posts (5/week for 24 weeks)

## Test Results
- **Latest Test**: `/app/test_reports/iteration_162.json`
- **Backend**: 100% pass rate (22/22 tests)
- **All Growth Engine APIs verified working**

## Credentials
- **Admin**: `admin@marketplace.com` / `Admin@123456`
- **Test User**: `testuser@test.com` / `password`

## Database Stats
- 206 active listings
- 2 AI-generated blog posts (draft)

## Key API Endpoints
### Public (No Auth)
- `GET /api/growth/seo-core/sitemap.xml`
- `GET /api/growth/seo-core/robots.txt`
- `GET /api/growth/seo-core/schema/organization`
- `GET /api/growth/seo-core/schema/faq`
- `GET /api/growth/content/posts`

### Admin Auth Required
- `POST /api/growth/content/generate-post`
- `GET /api/growth/content/analytics`
- `POST /api/growth/aso/google-play/generate`
- `POST /api/growth/aso/app-store/generate`
- `GET /api/growth/aso/keywords/{region}`
- `GET /api/growth/aso/competitor-analysis/{region}`
- `GET /api/growth/analytics/dashboard`
- `GET /api/growth/analytics/targets`
- `POST /api/growth/analytics/seo-audit/run`

## Future Enhancements
1. **Public Blog System** - Display generated articles to end-users
2. **Real Traffic Analytics** - Integrate with Google Analytics
3. **Automated Internal Linking** - Smart link insertion in content
4. **Smart Content Distribution** - Social media automation
5. **Predictive SEO AI** - Trending keyword identification
6. **Authority Building** - Backlink opportunity suggestions

## Third-Party Integrations
- OpenAI GPT-5.2 via `emergentintegrations` library
- Emergent LLM Key for AI content generation

## Files Structure
```
/app/backend/growth_engine/
├── __init__.py
├── seo_core.py          # Technical SEO endpoints
├── content_engine.py    # AI blog generation
├── aso_engine.py        # App store optimization
└── analytics_dashboard.py # Growth analytics

/app/admin-dashboard/frontend/src/app/dashboard/
├── growth-engine/page.tsx    # Main analytics dashboard
├── content-engine/page.tsx   # Blog generation UI
└── aso-engine/page.tsx       # ASO management UI
```
