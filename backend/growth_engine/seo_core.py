"""
Technical SEO Core Engine
Handles sitemap, robots.txt, schema.org structured data, and technical SEO
"""

import os
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
import jwt as pyjwt

logger = logging.getLogger(__name__)

# Admin JWT settings
ADMIN_JWT_SECRET = os.environ.get("ADMIN_JWT_SECRET_KEY", "admin-super-secret-key-change-in-production-2024")
ADMIN_JWT_ALGORITHM = "HS256"

# Target countries for multi-language SEO
TARGET_COUNTRIES = {
    "DE": {"name": "Germany", "languages": ["de", "en"], "currency": "EUR"},
    "TZ": {"name": "Tanzania", "languages": ["sw", "en"], "currency": "TZS"},
    "KE": {"name": "Kenya", "languages": ["sw", "en"], "currency": "KES"},
    "UG": {"name": "Uganda", "languages": ["en", "sw"], "currency": "UGX"},
    "NG": {"name": "Nigeria", "languages": ["en"], "currency": "NGN"},
    "ZA": {"name": "South Africa", "languages": ["en", "af"], "currency": "ZAR"},
}


class SitemapConfig(BaseModel):
    """Sitemap configuration"""
    include_listings: bool = True
    include_categories: bool = True
    include_profiles: bool = True
    include_blog: bool = True
    max_listings: int = 50000
    change_frequency: str = "daily"
    priority_listings: float = 0.8
    priority_categories: float = 0.9
    priority_blog: float = 0.7


class RobotsTxtConfig(BaseModel):
    """Robots.txt configuration"""
    allow_all: bool = True
    disallow_paths: List[str] = ["/api/", "/admin/", "/_next/"]
    crawl_delay: int = 0
    sitemap_url: str = "/sitemap.xml"


class StructuredDataRequest(BaseModel):
    """Request for structured data generation"""
    listing_id: str
    include_product: bool = True
    include_offer: bool = True
    include_review: bool = True
    include_breadcrumb: bool = True


def create_seo_core_router(db, get_current_user):
    """Create Technical SEO Core router"""
    router = APIRouter(prefix="/growth/seo-core", tags=["SEO Core"])
    
    listings_collection = db.listings
    categories_collection = db.categories
    users_collection = db.users
    blog_posts_collection = db.blog_posts
    seo_config_collection = db.seo_config
    admin_users_collection = db.admin_users
    
    async def require_admin(request: Request):
        """Require admin access"""
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                payload = pyjwt.decode(token, ADMIN_JWT_SECRET, algorithms=[ADMIN_JWT_ALGORITHM])
                admin_id = payload.get("sub")
                role = payload.get("role")
                if admin_id and role in ["super_admin", "admin", "moderator"]:
                    admin_doc = await admin_users_collection.find_one({"id": admin_id})
                    if admin_doc and admin_doc.get("is_active", True):
                        return {"admin_id": admin_id, "role": role}
            except Exception:
                pass
        
        user = await get_current_user(request)
        if user:
            admin_emails = ["admin@marketplace.com", "admin@example.com"]
            if user.email in admin_emails:
                return {"admin_id": user.user_id, "role": "admin"}
        
        raise HTTPException(status_code=401, detail="Admin access required")

    # ============ SITEMAP GENERATION ============
    
    @router.get("/sitemap.xml", response_class=PlainTextResponse)
    async def generate_sitemap():
        """Generate dynamic XML sitemap"""
        base_url = os.environ.get("APP_BASE_URL", "https://avida.app")
        
        # Get configuration
        config = await seo_config_collection.find_one({"type": "sitemap"}) or {}
        max_listings = config.get("max_listings", 50000)
        
        urls = []
        
        # Add static pages
        static_pages = [
            {"loc": "/", "priority": "1.0", "changefreq": "daily"},
            {"loc": "/browse", "priority": "0.9", "changefreq": "daily"},
            {"loc": "/about", "priority": "0.5", "changefreq": "monthly"},
            {"loc": "/contact", "priority": "0.5", "changefreq": "monthly"},
            {"loc": "/safety-tips", "priority": "0.6", "changefreq": "weekly"},
            {"loc": "/faq", "priority": "0.6", "changefreq": "weekly"},
        ]
        
        for page in static_pages:
            urls.append(f"""  <url>
    <loc>{base_url}{page['loc']}</loc>
    <changefreq>{page['changefreq']}</changefreq>
    <priority>{page['priority']}</priority>
  </url>""")
        
        # Add categories
        categories = await categories_collection.find(
            {"is_active": {"$ne": False}},
            {"id": 1, "updated_at": 1}
        ).to_list(100)
        
        for cat in categories:
            lastmod = cat.get("updated_at", datetime.now(timezone.utc)).strftime("%Y-%m-%d")
            urls.append(f"""  <url>
    <loc>{base_url}/category/{cat['id']}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>""")
        
        # Add active listings
        listings = await listings_collection.find(
            {"status": "active"},
            {"id": 1, "updated_at": 1, "images": 1}
        ).sort("created_at", -1).limit(max_listings).to_list(max_listings)
        
        for listing in listings:
            lastmod = listing.get("updated_at", datetime.now(timezone.utc))
            if isinstance(lastmod, datetime):
                lastmod = lastmod.strftime("%Y-%m-%d")
            
            url_entry = f"""  <url>
    <loc>{base_url}/listing/{listing['id']}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>"""
            
            # Add image sitemap if images exist
            if listing.get("images"):
                for img in listing["images"][:3]:  # Max 3 images per listing
                    if img.startswith("http"):
                        url_entry += f"""
    <image:image>
      <image:loc>{img}</image:loc>
    </image:image>"""
            
            url_entry += "\n  </url>"
            urls.append(url_entry)
        
        # Add blog posts
        blog_posts = await blog_posts_collection.find(
            {"status": "published"},
            {"slug": 1, "updated_at": 1}
        ).sort("published_at", -1).limit(500).to_list(500)
        
        for post in blog_posts:
            lastmod = post.get("updated_at", datetime.now(timezone.utc))
            if isinstance(lastmod, datetime):
                lastmod = lastmod.strftime("%Y-%m-%d")
            urls.append(f"""  <url>
    <loc>{base_url}/blog/{post['slug']}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>""")
        
        sitemap_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
{chr(10).join(urls)}
</urlset>"""
        
        return Response(content=sitemap_xml, media_type="application/xml")
    
    # ============ ROBOTS.TXT ============
    
    @router.get("/robots.txt", response_class=PlainTextResponse)
    async def generate_robots_txt():
        """Generate robots.txt"""
        base_url = os.environ.get("APP_BASE_URL", "https://avida.app")
        
        # Get custom config
        config = await seo_config_collection.find_one({"type": "robots"}) or {}
        custom_rules = config.get("custom_rules", "")
        
        robots_txt = f"""# Avida Marketplace Robots.txt
# Generated: {datetime.now(timezone.utc).isoformat()}

User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /_next/
Disallow: /private/
Disallow: /checkout/
Disallow: /messages/
Disallow: /settings/

# Allow specific API endpoints for indexing
Allow: /api/listings/*
Allow: /api/categories/*

# Sitemaps
Sitemap: {base_url}/api/growth/seo-core/sitemap.xml
Sitemap: {base_url}/api/growth/seo-core/sitemap-blog.xml

# Crawl delay (be nice to servers)
Crawl-delay: 1

{custom_rules}

# AI Search Engine Crawlers
User-agent: GPTBot
Allow: /
Allow: /blog/
Allow: /faq/

User-agent: Google-Extended
Allow: /

User-agent: CCBot
Allow: /
"""
        return PlainTextResponse(content=robots_txt)
    
    # ============ STRUCTURED DATA (SCHEMA.ORG) ============
    
    @router.get("/schema/listing/{listing_id}")
    async def get_listing_schema(listing_id: str):
        """Generate Schema.org structured data for a listing"""
        listing = await listings_collection.find_one({"id": listing_id})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        base_url = os.environ.get("APP_BASE_URL", "https://avida.app")
        
        # Get category name
        category_name = "Product"
        if listing.get("category_id"):
            category = await categories_collection.find_one({"id": listing["category_id"]})
            if category:
                category_name = category.get("name", "Product")
        
        # Get seller info
        seller_name = "Avida Seller"
        if listing.get("user_id"):
            seller = await users_collection.find_one({"user_id": listing["user_id"]})
            if seller:
                seller_name = seller.get("name", "Avida Seller")
        
        # Build location
        location_data = listing.get("location_data", {})
        address = {}
        if location_data:
            address = {
                "@type": "PostalAddress",
                "addressLocality": location_data.get("city_name", ""),
                "addressRegion": location_data.get("region_name", ""),
                "addressCountry": location_data.get("country_code", "")
            }
        
        # Currency mapping
        currency = listing.get("currency", "EUR")
        
        # Product Schema
        product_schema = {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": listing.get("title", ""),
            "description": listing.get("description", "")[:500],
            "url": f"{base_url}/listing/{listing_id}",
            "category": category_name,
            "offers": {
                "@type": "Offer",
                "price": listing.get("price", 0),
                "priceCurrency": currency,
                "availability": "https://schema.org/InStock" if listing.get("status") == "active" else "https://schema.org/SoldOut",
                "seller": {
                    "@type": "Person",
                    "name": seller_name
                },
                "itemCondition": f"https://schema.org/{listing.get('condition', 'UsedCondition').replace('_', '').title()}Condition"
            }
        }
        
        # Add images
        if listing.get("images"):
            product_schema["image"] = listing["images"][:5]
        
        # Add brand if available
        if listing.get("attributes", {}).get("brand"):
            product_schema["brand"] = {
                "@type": "Brand",
                "name": listing["attributes"]["brand"]
            }
        
        # Breadcrumb Schema
        breadcrumb_schema = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": base_url
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": category_name,
                    "item": f"{base_url}/category/{listing.get('category_id', '')}"
                },
                {
                    "@type": "ListItem",
                    "position": 3,
                    "name": listing.get("title", "")[:50],
                    "item": f"{base_url}/listing/{listing_id}"
                }
            ]
        }
        
        return {
            "product": product_schema,
            "breadcrumb": breadcrumb_schema,
            "json_ld": f'<script type="application/ld+json">{json.dumps(product_schema)}</script>\n<script type="application/ld+json">{json.dumps(breadcrumb_schema)}</script>'
        }
    
    @router.get("/schema/organization")
    async def get_organization_schema():
        """Generate Organization schema for Avida"""
        base_url = os.environ.get("APP_BASE_URL", "https://avida.app")
        
        org_schema = {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Avida",
            "alternateName": "Avida Marketplace",
            "description": "Avida is a safe online marketplace for buying and selling vehicles, properties, electronics, and more in Germany and Africa.",
            "url": base_url,
            "logo": f"{base_url}/logo.png",
            "sameAs": [
                "https://facebook.com/avidamarketplace",
                "https://twitter.com/avidaapp",
                "https://instagram.com/avidamarketplace",
                "https://linkedin.com/company/avida-marketplace"
            ],
            "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer service",
                "availableLanguage": ["English", "German", "Swahili"]
            },
            "areaServed": [
                {"@type": "Country", "name": "Germany"},
                {"@type": "Country", "name": "Tanzania"},
                {"@type": "Country", "name": "Kenya"},
                {"@type": "Country", "name": "Uganda"},
                {"@type": "Country", "name": "Nigeria"},
                {"@type": "Country", "name": "South Africa"}
            ],
            "foundingDate": "2024",
            "slogan": "Buy & Sell Safely"
        }
        
        return {
            "schema": org_schema,
            "json_ld": f'<script type="application/ld+json">{json.dumps(org_schema)}</script>'
        }
    
    @router.get("/schema/faq")
    async def get_faq_schema():
        """Generate FAQ schema for Avida - optimized for AI search engines"""
        faqs = [
            {
                "question": "What is Avida?",
                "answer": "Avida is a safe online marketplace for buying and selling items in Germany and Africa. It features escrow payment protection, verified sellers, and secure transactions for vehicles, properties, electronics, fashion, and more."
            },
            {
                "question": "Is Avida safe to use?",
                "answer": "Yes, Avida is designed with safety as a priority. It offers escrow payment protection, seller verification, secure messaging, and fraud detection. Buyers' money is protected until they confirm receipt of items."
            },
            {
                "question": "How does Avida escrow work?",
                "answer": "Avida's escrow system holds the buyer's payment securely until the item is delivered and confirmed. The seller ships the item, the buyer inspects it, and only then is the payment released to the seller. This protects both parties."
            },
            {
                "question": "Which countries is Avida available in?",
                "answer": "Avida is available in Germany, Tanzania, Kenya, Uganda, Nigeria, and South Africa. The platform supports multiple currencies and languages including English, German, and Swahili."
            },
            {
                "question": "How do I sell on Avida?",
                "answer": "To sell on Avida: 1) Create a free account, 2) Click 'Post Listing', 3) Add photos and description, 4) Set your price, 5) Publish and wait for buyers to contact you. You can also boost listings for more visibility."
            },
            {
                "question": "What can I buy on Avida?",
                "answer": "You can buy vehicles (cars, motorcycles), properties (apartments, houses), electronics (phones, laptops), fashion, furniture, and more. Categories include Auto & Vehicles, Properties, Electronics, Fashion, Home & Furniture, Jobs, and Services."
            },
            {
                "question": "Does Avida charge fees?",
                "answer": "Creating listings is free. Avida charges a small commission only when a sale is completed through the escrow system. Optional premium features like boosting and featured listings have additional fees."
            },
            {
                "question": "How do I contact a seller on Avida?",
                "answer": "Click on any listing and use the 'Message Seller' or 'Chat' button to start a conversation. All messages are handled through Avida's secure in-app messaging system for your safety."
            }
        ]
        
        faq_schema = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": faq["question"],
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": faq["answer"]
                    }
                }
                for faq in faqs
            ]
        }
        
        return {
            "faqs": faqs,
            "schema": faq_schema,
            "json_ld": f'<script type="application/ld+json">{json.dumps(faq_schema)}</script>'
        }
    
    # ============ META TAGS GENERATION ============
    
    @router.get("/meta-tags/{page_type}/{page_id}")
    async def generate_meta_tags(page_type: str, page_id: str = None):
        """Generate complete meta tags for a page"""
        base_url = os.environ.get("APP_BASE_URL", "https://avida.app")
        
        meta = {
            "title": "Avida - Buy & Sell Safely",
            "description": "Your trusted marketplace for buying and selling in Germany and Africa.",
            "keywords": "marketplace, buy, sell, avida, safe, escrow",
            "og:type": "website",
            "og:site_name": "Avida",
            "twitter:card": "summary_large_image",
            "robots": "index, follow"
        }
        
        if page_type == "listing" and page_id:
            listing = await listings_collection.find_one({"id": page_id})
            if listing:
                currency_symbols = {"EUR": "€", "USD": "$", "KES": "KSh", "TZS": "TSh", "NGN": "₦", "ZAR": "R"}
                symbol = currency_symbols.get(listing.get("currency", "EUR"), "€")
                price = f"{symbol}{listing.get('price', 0):,.0f}"
                
                meta["title"] = f"{listing['title']} - {price} | Avida"
                meta["description"] = listing.get("description", "")[:160]
                meta["og:type"] = "product"
                meta["og:url"] = f"{base_url}/listing/{page_id}"
                
                if listing.get("images"):
                    meta["og:image"] = listing["images"][0]
                
                # Add product specific meta
                meta["product:price:amount"] = str(listing.get("price", 0))
                meta["product:price:currency"] = listing.get("currency", "EUR")
                
        elif page_type == "category" and page_id:
            category = await categories_collection.find_one({"id": page_id})
            if category:
                meta["title"] = f"{category['name']} for Sale | Avida Marketplace"
                meta["description"] = f"Browse {category['name'].lower()} listings on Avida. Find great deals on {category['name'].lower()} in Germany and Africa."
                meta["og:url"] = f"{base_url}/category/{page_id}"
                
        elif page_type == "blog" and page_id:
            post = await blog_posts_collection.find_one({"slug": page_id})
            if post:
                meta["title"] = f"{post['title']} | Avida Blog"
                meta["description"] = post.get("excerpt", post.get("content", "")[:160])
                meta["og:type"] = "article"
                meta["og:url"] = f"{base_url}/blog/{page_id}"
                meta["article:published_time"] = post.get("published_at", "").isoformat() if post.get("published_at") else ""
                
                if post.get("featured_image"):
                    meta["og:image"] = post["featured_image"]
        
        # Generate HTML
        meta_html = f"""
<!-- Primary Meta Tags -->
<title>{meta['title']}</title>
<meta name="title" content="{meta['title']}">
<meta name="description" content="{meta['description']}">
<meta name="keywords" content="{meta['keywords']}">
<meta name="robots" content="{meta['robots']}">

<!-- Open Graph / Facebook -->
<meta property="og:type" content="{meta['og:type']}">
<meta property="og:url" content="{meta.get('og:url', base_url)}">
<meta property="og:title" content="{meta['title']}">
<meta property="og:description" content="{meta['description']}">
<meta property="og:site_name" content="{meta['og:site_name']}">
{f'<meta property="og:image" content="{meta["og:image"]}">' if meta.get('og:image') else ''}

<!-- Twitter -->
<meta property="twitter:card" content="{meta['twitter:card']}">
<meta property="twitter:url" content="{meta.get('og:url', base_url)}">
<meta property="twitter:title" content="{meta['title']}">
<meta property="twitter:description" content="{meta['description']}">
{f'<meta property="twitter:image" content="{meta["og:image"]}">' if meta.get('og:image') else ''}

<!-- Canonical -->
<link rel="canonical" href="{meta.get('og:url', base_url)}">
"""
        
        return {
            "meta": meta,
            "html": meta_html
        }
    
    # ============ HREFLANG TAGS ============
    
    @router.get("/hreflang/{page_type}/{page_id}")
    async def generate_hreflang_tags(page_type: str, page_id: str = None):
        """Generate hreflang tags for multi-language/country targeting"""
        base_url = os.environ.get("APP_BASE_URL", "https://avida.app")
        
        path = "/"
        if page_type == "listing" and page_id:
            path = f"/listing/{page_id}"
        elif page_type == "category" and page_id:
            path = f"/category/{page_id}"
        elif page_type == "blog" and page_id:
            path = f"/blog/{page_id}"
        
        hreflang_tags = []
        
        # Generate hreflang for each target country
        for country_code, country_info in TARGET_COUNTRIES.items():
            for lang in country_info["languages"]:
                hreflang_tags.append({
                    "lang": f"{lang}-{country_code}",
                    "url": f"{base_url}/{lang.lower()}{path}"
                })
        
        # Add x-default
        hreflang_tags.append({
            "lang": "x-default",
            "url": f"{base_url}{path}"
        })
        
        # Generate HTML
        html = "\n".join([
            f'<link rel="alternate" hreflang="{tag["lang"]}" href="{tag["url"]}">'
            for tag in hreflang_tags
        ])
        
        return {
            "tags": hreflang_tags,
            "html": html
        }
    
    # ============ CORE WEB VITALS SUGGESTIONS ============
    
    @router.get("/performance-suggestions")
    async def get_performance_suggestions(admin=Depends(require_admin)):
        """Get AI-powered performance optimization suggestions"""
        suggestions = {
            "image_optimization": [
                "Use WebP format for all listing images",
                "Implement lazy loading for images below the fold",
                "Use srcset for responsive images",
                "Compress images to under 100KB where possible",
                "Use CDN for image delivery"
            ],
            "javascript_optimization": [
                "Code split by route for smaller initial bundles",
                "Defer non-critical JavaScript",
                "Minimize third-party scripts",
                "Use dynamic imports for heavy components"
            ],
            "css_optimization": [
                "Inline critical CSS",
                "Remove unused CSS",
                "Use CSS containment for listing cards",
                "Minimize CSS specificity"
            ],
            "server_optimization": [
                "Enable gzip/brotli compression",
                "Set appropriate cache headers",
                "Use HTTP/2 or HTTP/3",
                "Implement server-side caching for listings"
            ],
            "core_web_vitals_targets": {
                "LCP": "< 2.5s (Largest Contentful Paint)",
                "FID": "< 100ms (First Input Delay)",
                "CLS": "< 0.1 (Cumulative Layout Shift)",
                "TTFB": "< 600ms (Time to First Byte)"
            }
        }
        
        return suggestions
    
    # ============ SEO CONFIGURATION ============
    
    @router.get("/config")
    async def get_seo_config(admin=Depends(require_admin)):
        """Get current SEO configuration"""
        sitemap_config = await seo_config_collection.find_one({"type": "sitemap"}) or {}
        robots_config = await seo_config_collection.find_one({"type": "robots"}) or {}
        
        return {
            "sitemap": {
                "max_listings": sitemap_config.get("max_listings", 50000),
                "include_images": sitemap_config.get("include_images", True),
                "update_frequency": sitemap_config.get("update_frequency", "daily")
            },
            "robots": {
                "custom_rules": robots_config.get("custom_rules", ""),
                "allow_ai_crawlers": robots_config.get("allow_ai_crawlers", True)
            },
            "target_countries": TARGET_COUNTRIES
        }
    
    @router.put("/config")
    async def update_seo_config(config: Dict[str, Any], admin=Depends(require_admin)):
        """Update SEO configuration"""
        if "sitemap" in config:
            await seo_config_collection.update_one(
                {"type": "sitemap"},
                {"$set": {**config["sitemap"], "type": "sitemap", "updated_at": datetime.now(timezone.utc)}},
                upsert=True
            )
        
        if "robots" in config:
            await seo_config_collection.update_one(
                {"type": "robots"},
                {"$set": {**config["robots"], "type": "robots", "updated_at": datetime.now(timezone.utc)}},
                upsert=True
            )
        
        return {"success": True, "message": "Configuration updated"}
    
    return router
