"""
Advanced SEO Engine
Handles internal linking, social distribution, predictive SEO, and authority building
"""

import os
import re
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
import jwt as pyjwt

logger = logging.getLogger(__name__)

# Admin JWT settings
ADMIN_JWT_SECRET = os.environ.get("ADMIN_JWT_SECRET_KEY", "admin-super-secret-key-change-in-production-2024")
ADMIN_JWT_ALGORITHM = "HS256"

# Social media platforms
SOCIAL_PLATFORMS = {
    "twitter": {"max_length": 280, "hashtag_limit": 5},
    "linkedin": {"max_length": 3000, "hashtag_limit": 5},
    "facebook": {"max_length": 63206, "hashtag_limit": 10},
    "instagram": {"max_length": 2200, "hashtag_limit": 30},
}

# Trending keyword categories by region
TRENDING_CATEGORIES = {
    "TZ": ["used cars dar es salaam", "phones tanzania", "apartments dar", "jobs tanzania 2026"],
    "KE": ["used cars nairobi", "phones kenya", "apartments nairobi", "jobs kenya 2026"],
    "DE": ["gebrauchtwagen berlin", "handys deutschland", "wohnungen berlin", "jobs germany 2026"],
    "UG": ["used cars kampala", "phones uganda", "apartments kampala", "jobs uganda 2026"],
    "NG": ["used cars lagos", "phones nigeria", "apartments lagos", "jobs nigeria 2026"],
    "ZA": ["used cars johannesburg", "phones south africa", "apartments johannesburg", "jobs south africa 2026"],
}


class InternalLink(BaseModel):
    """Internal link suggestion"""
    source_type: str  # "blog", "listing", "category"
    source_id: str
    target_type: str
    target_id: str
    anchor_text: str
    relevance_score: float
    url: str


class SocialPost(BaseModel):
    """Social media post"""
    platform: str
    content: str
    hashtags: List[str]
    media_urls: List[str] = []
    scheduled_time: Optional[datetime] = None
    status: str = "draft"


class TrendingKeyword(BaseModel):
    """Trending keyword data"""
    keyword: str
    region: str
    category: str
    trend_score: float
    search_volume: int
    competition: str  # "low", "medium", "high"
    suggested_content: str


class BacklinkOpportunity(BaseModel):
    """Backlink opportunity"""
    domain: str
    domain_authority: int
    relevance_score: float
    contact_type: str  # "email", "form", "social"
    suggested_outreach: str


def create_advanced_seo_router(db, get_current_user):
    """Create Advanced SEO router"""
    router = APIRouter(prefix="/growth/advanced-seo", tags=["Advanced SEO"])
    
    listings_collection = db.listings
    categories_collection = db.categories
    blog_posts_collection = db.blog_posts
    internal_links_collection = db.internal_links
    social_posts_collection = db.social_posts
    trending_keywords_collection = db.trending_keywords
    backlink_opportunities_collection = db.backlink_opportunities
    admin_users_collection = db.admin_users
    
    async def require_admin(request: Request):
        """Require admin access"""
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                payload = pyjwt.decode(token, ADMIN_JWT_SECRET, algorithms=[ADMIN_JWT_ALGORITHM])
                admin_id = payload.get("admin_id")
                admin = await admin_users_collection.find_one({"admin_id": admin_id})
                if admin:
                    return admin
            except Exception as e:
                logger.error(f"Admin auth error: {e}")
        raise HTTPException(status_code=401, detail="Admin access required")

    # ============ INTERNAL LINKING ENGINE ============
    
    @router.post("/internal-links/analyze")
    async def analyze_internal_links(
        content_type: str = "blog",
        content_id: Optional[str] = None,
        admin=Depends(require_admin)
    ):
        """Analyze content and suggest internal links"""
        
        suggestions = []
        
        if content_type == "blog":
            # Get blog posts
            if content_id:
                post = await blog_posts_collection.find_one({"id": content_id}, {"_id": 0})
                posts = [post] if post else []
            else:
                cursor = blog_posts_collection.find({}, {"_id": 0}).limit(50)
                posts = await cursor.to_list(50)
            
            # Get active listings for linking
            listings_cursor = listings_collection.find(
                {"status": "active"},
                {"_id": 0, "id": 1, "title": 1, "category": 1, "description": 1, "location": 1}
            ).limit(200)
            listings = await listings_cursor.to_list(200)
            
            # Get categories
            categories_cursor = categories_collection.find({}, {"_id": 0, "id": 1, "name": 1, "slug": 1})
            categories = await categories_cursor.to_list(100)
            
            for post in posts:
                post_content = (post.get("content", "") + " " + post.get("title", "")).lower()
                post_category = post.get("category", "").lower()
                
                # Find relevant listings
                for listing in listings:
                    listing_title = listing.get("title", "").lower()
                    listing_category = listing.get("category", "").lower()
                    listing_desc = listing.get("description", "").lower()[:200]
                    
                    # Calculate relevance score
                    score = 0
                    
                    # Category match
                    if listing_category == post_category:
                        score += 0.4
                    
                    # Title words in content
                    title_words = listing_title.split()[:5]
                    for word in title_words:
                        if len(word) > 3 and word in post_content:
                            score += 0.1
                    
                    # Location match
                    location = listing.get("location", {})
                    if isinstance(location, dict):
                        city = location.get("city", "").lower()
                    else:
                        city = str(location).lower() if location else ""
                    if city and city in post_content:
                        score += 0.2
                    
                    if score >= 0.4:
                        suggestions.append({
                            "source_type": "blog",
                            "source_id": post.get("id"),
                            "source_title": post.get("title", "")[:50],
                            "target_type": "listing",
                            "target_id": listing.get("id"),
                            "anchor_text": listing.get("title", "")[:60],
                            "relevance_score": round(min(score, 1.0), 2),
                            "url": f"/listing/{listing.get('id')}",
                        })
                
                # Find relevant categories
                for category in categories:
                    cat_name = category.get("name", "").lower()
                    cat_slug = category.get("slug", "").lower()
                    
                    if cat_name in post_content or cat_slug in post_content:
                        suggestions.append({
                            "source_type": "blog",
                            "source_id": post.get("id"),
                            "source_title": post.get("title", "")[:50],
                            "target_type": "category",
                            "target_id": category.get("id"),
                            "anchor_text": f"Browse {category.get('name', '')} listings",
                            "relevance_score": 0.7,
                            "url": f"/category/{category.get('slug', category.get('id'))}",
                        })
        
        # Sort by relevance
        suggestions.sort(key=lambda x: x["relevance_score"], reverse=True)
        
        return {
            "total_suggestions": len(suggestions),
            "suggestions": suggestions[:50],  # Limit to top 50
            "analyzed_content_type": content_type,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    @router.post("/internal-links/apply")
    async def apply_internal_links(
        post_id: str,
        links: List[Dict[str, Any]],
        admin=Depends(require_admin)
    ):
        """Apply internal links to a blog post"""
        
        post = await blog_posts_collection.find_one({"id": post_id})
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        # Store the links in the post
        internal_links = []
        for link in links:
            internal_links.append({
                "type": link.get("target_type", "listing"),
                "url": link.get("url", ""),
                "anchor_text": link.get("anchor_text", ""),
            })
        
        await blog_posts_collection.update_one(
            {"id": post_id},
            {"$set": {
                "internal_links": internal_links,
                "links_updated_at": datetime.now(timezone.utc)
            }}
        )
        
        return {"success": True, "links_applied": len(internal_links)}

    # ============ SOCIAL MEDIA DISTRIBUTION ============
    
    @router.post("/social/generate-posts")
    async def generate_social_posts(
        content_id: str,
        content_type: str = "blog",
        platforms: List[str] = ["twitter", "linkedin", "facebook"],
        admin=Depends(require_admin)
    ):
        """Generate social media posts from content"""
        
        # Get the content
        if content_type == "blog":
            content = await blog_posts_collection.find_one({"id": content_id}, {"_id": 0})
        else:
            content = await listings_collection.find_one({"id": content_id}, {"_id": 0})
        
        if not content:
            raise HTTPException(status_code=404, detail="Content not found")
        
        title = content.get("title", "")
        excerpt = content.get("excerpt", content.get("description", ""))[:200]
        category = content.get("category", "general")
        slug = content.get("slug", content_id)
        
        # Generate hashtags based on category and content
        base_hashtags = ["Avida", "Marketplace", "Africa"]
        category_hashtags = {
            "vehicles": ["UsedCars", "CarSales", "AutoMarket"],
            "electronics": ["TechDeals", "Electronics", "GadgetSales"],
            "properties": ["RealEstate", "Apartments", "Housing"],
            "general": ["BuySell", "LocalDeals", "Classified"],
        }
        hashtags = base_hashtags + category_hashtags.get(category, ["Deals"])
        
        social_posts = []
        
        for platform in platforms:
            config = SOCIAL_PLATFORMS.get(platform, {"max_length": 280, "hashtag_limit": 5})
            
            if platform == "twitter":
                # Short, punchy post with link
                post_content = f"🔥 {title[:100]}\n\n{excerpt[:120]}...\n\nRead more: avida.com/blog/{slug}"
                post_hashtags = hashtags[:config["hashtag_limit"]]
                
            elif platform == "linkedin":
                # Professional, longer format
                post_content = f"""📢 New on the Avida Blog:

{title}

{excerpt}

Whether you're buying or selling in Africa or Germany, this guide has you covered with practical tips and local insights.

🔗 Read the full article: avida.com/blog/{slug}

What's your experience with online marketplaces? Share your thoughts below! 👇"""
                post_hashtags = hashtags[:config["hashtag_limit"]]
                
            elif platform == "facebook":
                # Engaging, community-focused
                post_content = f"""🌟 {title}

{excerpt}

💡 Looking for more tips on buying and selling safely? Check out our latest guide!

👉 Read here: avida.com/blog/{slug}

Tag a friend who might find this useful! 👥"""
                post_hashtags = hashtags[:config["hashtag_limit"]]
                
            else:
                post_content = f"{title}\n\n{excerpt}\n\nLink: avida.com/blog/{slug}"
                post_hashtags = hashtags[:5]
            
            # Add hashtags to content
            hashtag_str = " ".join([f"#{h}" for h in post_hashtags])
            full_content = f"{post_content}\n\n{hashtag_str}"
            
            social_post = {
                "id": str(uuid.uuid4()),
                "platform": platform,
                "content": full_content[:config["max_length"]],
                "hashtags": post_hashtags,
                "source_type": content_type,
                "source_id": content_id,
                "status": "draft",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            
            # Store the post
            await social_posts_collection.insert_one(social_post)
            social_post.pop("_id", None)
            social_posts.append(social_post)
        
        return {
            "success": True,
            "posts_generated": len(social_posts),
            "posts": social_posts
        }
    
    @router.get("/social/posts")
    async def get_social_posts(
        status: Optional[str] = None,
        platform: Optional[str] = None,
        limit: int = 20,
        admin=Depends(require_admin)
    ):
        """Get social media posts"""
        query = {}
        if status:
            query["status"] = status
        if platform:
            query["platform"] = platform
        
        cursor = social_posts_collection.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
        posts = await cursor.to_list(limit)
        
        return {"posts": posts, "total": len(posts)}
    
    @router.put("/social/posts/{post_id}/schedule")
    async def schedule_social_post(
        post_id: str,
        scheduled_time: datetime,
        admin=Depends(require_admin)
    ):
        """Schedule a social media post"""
        result = await social_posts_collection.update_one(
            {"id": post_id},
            {"$set": {
                "scheduled_time": scheduled_time,
                "status": "scheduled"
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Post not found")
        
        return {"success": True, "message": "Post scheduled"}

    # ============ PREDICTIVE SEO / TRENDING KEYWORDS ============
    
    @router.get("/trending/keywords")
    async def get_trending_keywords(
        region: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 20,
        admin=Depends(require_admin)
    ):
        """Get trending keywords with predictions"""
        
        # Generate trending keywords based on region
        trending = []
        regions = [region] if region else list(TRENDING_CATEGORIES.keys())
        
        for reg in regions:
            base_keywords = TRENDING_CATEGORIES.get(reg, [])
            
            for i, keyword in enumerate(base_keywords):
                # Simulate trend data
                category_guess = "vehicles" if "car" in keyword else \
                                "electronics" if "phone" in keyword else \
                                "properties" if "apartment" in keyword else "jobs"
                
                if category and category != category_guess:
                    continue
                
                trending.append({
                    "keyword": keyword,
                    "region": reg,
                    "category": category_guess,
                    "trend_score": round(0.95 - (i * 0.1), 2),
                    "search_volume": 10000 - (i * 1500),
                    "competition": "low" if i > 2 else "medium" if i > 0 else "high",
                    "suggested_content": f"How to find the best {keyword.split()[0]} deals in {reg}",
                    "growth_rate": f"+{20 - (i * 3)}%",
                    "peak_season": "Q1 2026" if i % 2 == 0 else "Q2 2026",
                })
        
        # Sort by trend score
        trending.sort(key=lambda x: x["trend_score"], reverse=True)
        
        return {
            "keywords": trending[:limit],
            "total": len(trending),
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    
    @router.post("/trending/analyze-content-gaps")
    async def analyze_content_gaps(
        region: str = "TZ",
        admin=Depends(require_admin)
    ):
        """Analyze content gaps based on trending keywords"""
        
        # Get existing blog posts
        cursor = blog_posts_collection.find(
            {"target_country": region},
            {"_id": 0, "title": 1, "keywords": 1, "category": 1}
        )
        existing_posts = await cursor.to_list(100)
        
        # Get trending keywords
        trending_keywords = TRENDING_CATEGORIES.get(region, [])
        
        # Find gaps
        covered_topics = set()
        for post in existing_posts:
            title_words = post.get("title", "").lower().split()
            keywords = post.get("keywords", [])
            covered_topics.update(title_words)
            covered_topics.update([k.lower() for k in keywords])
        
        gaps = []
        for keyword in trending_keywords:
            keyword_words = set(keyword.lower().split())
            overlap = keyword_words.intersection(covered_topics)
            
            if len(overlap) < len(keyword_words) * 0.5:  # Less than 50% covered
                gaps.append({
                    "keyword": keyword,
                    "coverage": round(len(overlap) / len(keyword_words), 2),
                    "priority": "high" if len(overlap) == 0 else "medium",
                    "suggested_title": f"Complete Guide to {keyword.title()} - {datetime.now().year}",
                    "content_type": "buying_guide",
                })
        
        return {
            "region": region,
            "existing_content": len(existing_posts),
            "content_gaps": gaps,
            "recommendations": [
                f"Create content for '{g['keyword']}' - Priority: {g['priority']}"
                for g in gaps[:5]
            ]
        }

    # ============ AUTHORITY BUILDING / BACKLINKS ============
    
    @router.get("/authority/backlink-opportunities")
    async def get_backlink_opportunities(
        region: Optional[str] = None,
        limit: int = 20,
        admin=Depends(require_admin)
    ):
        """Get backlink opportunities"""
        
        # Simulated backlink opportunities based on region
        opportunities = {
            "TZ": [
                {"domain": "thecitizen.co.tz", "da": 65, "type": "news", "contact": "editorial submission"},
                {"domain": "dailynews.co.tz", "da": 60, "type": "news", "contact": "guest post"},
                {"domain": "ippmedia.com", "da": 58, "type": "media", "contact": "press release"},
                {"domain": "startuptanzania.co.tz", "da": 45, "type": "startup", "contact": "interview"},
            ],
            "KE": [
                {"domain": "standardmedia.co.ke", "da": 70, "type": "news", "contact": "editorial submission"},
                {"domain": "nation.africa", "da": 75, "type": "news", "contact": "press release"},
                {"domain": "techweez.com", "da": 50, "type": "tech", "contact": "product review"},
            ],
            "DE": [
                {"domain": "gruenderszene.de", "da": 68, "type": "startup", "contact": "interview"},
                {"domain": "t3n.de", "da": 72, "type": "tech", "contact": "guest post"},
                {"domain": "handelsblatt.com", "da": 85, "type": "business", "contact": "press release"},
            ],
            "global": [
                {"domain": "techcrunch.com", "da": 95, "type": "tech", "contact": "pitch story"},
                {"domain": "forbes.com", "da": 95, "type": "business", "contact": "contributor"},
                {"domain": "entrepreneur.com", "da": 92, "type": "startup", "contact": "guest post"},
            ]
        }
        
        results = []
        regions_to_check = [region] if region else list(opportunities.keys())
        
        for reg in regions_to_check:
            for opp in opportunities.get(reg, []):
                results.append({
                    "domain": opp["domain"],
                    "domain_authority": opp["da"],
                    "type": opp["type"],
                    "region": reg,
                    "relevance_score": round(0.9 if opp["da"] > 60 else 0.7, 2),
                    "contact_method": opp["contact"],
                    "suggested_outreach": f"Pitch Avida as an innovative marketplace solving trust issues in {reg if reg != 'global' else 'Africa and Germany'}",
                    "difficulty": "high" if opp["da"] > 70 else "medium",
                })
        
        # Sort by domain authority
        results.sort(key=lambda x: x["domain_authority"], reverse=True)
        
        return {
            "opportunities": results[:limit],
            "total": len(results),
            "tip": "Focus on regional publications first for quicker wins, then target global outlets for authority."
        }
    
    @router.post("/authority/track-mention")
    async def track_brand_mention(
        url: str,
        domain: str,
        mention_type: str = "link",  # "link", "mention", "review"
        admin=Depends(require_admin)
    ):
        """Track a brand mention or backlink"""
        
        mention = {
            "id": str(uuid.uuid4()),
            "url": url,
            "domain": domain,
            "type": mention_type,
            "tracked_at": datetime.now(timezone.utc).isoformat(),
            "status": "active",
        }
        
        await backlink_opportunities_collection.insert_one(mention)
        mention.pop("_id", None)
        
        return {"success": True, "mention": mention}

    # ============ MULTI-LANGUAGE SEO ============
    
    @router.get("/multilang/status")
    async def get_multilang_status(admin=Depends(require_admin)):
        """Get multi-language SEO status"""
        
        # Check content by language
        languages = {
            "en": {"name": "English", "status": "active", "coverage": 0},
            "de": {"name": "German", "status": "planned", "coverage": 0},
            "sw": {"name": "Swahili", "status": "planned", "coverage": 0},
        }
        
        # Count posts by language
        for lang in languages.keys():
            count = await blog_posts_collection.count_documents({"language": lang})
            languages[lang]["content_count"] = count
            languages[lang]["coverage"] = min(100, count * 10)  # 10 posts = 100% base coverage
        
        return {
            "languages": languages,
            "recommendations": [
                "Generate German content for DE market - high potential",
                "Add Swahili translations for TZ/KE markets",
                "Implement hreflang tags for all content",
            ],
            "hreflang_implemented": True,
            "language_selector_ui": True,
        }
    
    @router.post("/multilang/generate-translation")
    async def generate_translation_task(
        post_id: str,
        target_language: str,
        admin=Depends(require_admin)
    ):
        """Create a translation task for a blog post"""
        
        post = await blog_posts_collection.find_one({"id": post_id}, {"_id": 0})
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        # In production, this would queue a translation task
        # For now, return a placeholder response
        return {
            "success": True,
            "task_id": str(uuid.uuid4()),
            "source_post": post_id,
            "source_language": post.get("language", "en"),
            "target_language": target_language,
            "status": "queued",
            "message": f"Translation to {target_language} has been queued. Use AI content engine to generate localized version."
        }

    return router
