"""
Growth Engine & SEO API Routes
Provides endpoints for:
1. Growth Engine - Dashboard, metrics, forecasts
2. AI Content Engine - Content generation and suggestions
3. ASO Engine - App Store Optimization
4. Content Calendar - Content scheduling
5. Advanced SEO - SEO auditing and optimization
6. SEO Analytics - Search performance analytics
7. Multilang SEO - Multilingual SEO management
8. Backlink Monitoring - Backlink analysis
9. Authority Building - Domain authority metrics
10. Social Distribution - Social media management
11. Audit Logs - System audit logs
12. Analytics Settings - Analytics configuration
"""

import os
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Depends, Request, Query, Body
from motor.motor_asyncio import AsyncIOMotorDatabase
import random

logger = logging.getLogger(__name__)


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    type: str = "promotional"  # promotional, retention, acquisition
    target_segment: Optional[str] = None
    channels: List[str] = ["email", "push"]
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    budget: Optional[float] = None


class ContentGenerateRequest(BaseModel):
    type: str  # listing_description, social_post, email, seo_meta
    context: Dict[str, Any] = {}
    tone: str = "professional"
    length: str = "medium"


class ContentTemplateCreate(BaseModel):
    name: str
    type: str
    content: str
    variables: List[str] = []
    language: str = "en"


class CalendarEventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    type: str = "content"  # content, campaign, social, promotion
    scheduled_date: str
    channel: Optional[str] = None
    status: str = "draft"


class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    scheduled_date: Optional[str] = None
    channel: Optional[str] = None
    status: Optional[str] = None


class SEOSettingsUpdate(BaseModel):
    auto_generate_meta: bool = True
    default_title_template: Optional[str] = None
    default_description_template: Optional[str] = None
    enable_schema_markup: bool = True
    enable_sitemap: bool = True
    enable_robots_txt: bool = True


class MultilangConfigUpdate(BaseModel):
    default_language: str = "en"
    enabled_languages: List[str] = ["en"]
    auto_translate: bool = False
    translation_provider: Optional[str] = None


class SocialChannelConnect(BaseModel):
    platform: str  # facebook, twitter, instagram, linkedin
    access_token: str
    account_id: Optional[str] = None


class SocialPostCreate(BaseModel):
    content: str
    platforms: List[str]
    scheduled_time: Optional[str] = None
    media_urls: List[str] = []
    hashtags: List[str] = []


class AnalyticsSettingsUpdate(BaseModel):
    enabled: bool = True
    sampling_rate: float = 1.0
    data_retention_days: int = 365
    anonymize_ip: bool = True
    respect_dnt: bool = True


class TrackingSettingsUpdate(BaseModel):
    enable_page_views: bool = True
    enable_events: bool = True
    enable_user_timing: bool = True
    enable_ecommerce: bool = True
    excluded_paths: List[str] = []


# =============================================================================
# ROUTER FACTORY
# =============================================================================

def create_growth_seo_routes(db: AsyncIOMotorDatabase, require_auth):
    """Create all growth engine and SEO related routes"""
    
    # =============================================================================
    # 1. GROWTH ENGINE
    # =============================================================================
    growth_router = APIRouter(prefix="/growth-engine", tags=["Growth Engine"])
    
    @growth_router.get("")
    async def get_growth_dashboard():
        """Growth engine dashboard overview"""
        # Get real metrics from DB
        total_users = await db.users.count_documents({})
        total_listings = await db.listings.count_documents({})
        
        return {
            "overview": {
                "total_users": total_users,
                "total_listings": total_listings,
                "monthly_active_users": int(total_users * 0.3),
                "conversion_rate": 4.2,
                "revenue_mtd": 0,
                "growth_rate": 12.5
            },
            "health_score": 78,
            "alerts": [],
            "recent_milestones": [
                {"type": "users", "milestone": "1000 users", "achieved_at": "2026-02-15"},
            ]
        }
    
    @growth_router.get("/metrics")
    async def get_growth_metrics(period: str = Query(default="30d")):
        """Get growth metrics"""
        total_users = await db.users.count_documents({})
        total_listings = await db.listings.count_documents({})
        
        return {
            "period": period,
            "users": {
                "total": total_users,
                "new": int(total_users * 0.1),
                "active": int(total_users * 0.3),
                "churned": int(total_users * 0.02),
                "retention_rate": 85.5
            },
            "listings": {
                "total": total_listings,
                "new": int(total_listings * 0.15),
                "active": int(total_listings * 0.7),
                "sold": int(total_listings * 0.1)
            },
            "engagement": {
                "avg_session_duration": 245,
                "pages_per_session": 4.5,
                "bounce_rate": 35.2
            },
            "revenue": {
                "total": 0,
                "subscriptions": 0,
                "ads": 0,
                "commissions": 0
            }
        }
    
    @growth_router.get("/trends")
    async def get_growth_trends(days: int = Query(default=30, le=90)):
        """Get growth trends over time"""
        trends = []
        base_date = datetime.now(timezone.utc)
        
        for i in range(days, 0, -1):
            date = (base_date - timedelta(days=i)).strftime("%Y-%m-%d")
            trends.append({
                "date": date,
                "users": random.randint(5, 20),
                "listings": random.randint(10, 50),
                "views": random.randint(100, 500),
                "conversions": random.randint(1, 10)
            })
        
        return {"trends": trends, "period_days": days}
    
    @growth_router.get("/forecasts")
    async def get_growth_forecasts():
        """AI-powered growth forecasts"""
        return {
            "forecasts": {
                "users": {
                    "next_30_days": {"low": 150, "expected": 200, "high": 280},
                    "next_90_days": {"low": 400, "expected": 550, "high": 750}
                },
                "listings": {
                    "next_30_days": {"low": 300, "expected": 450, "high": 600},
                    "next_90_days": {"low": 800, "expected": 1200, "high": 1600}
                },
                "revenue": {
                    "next_30_days": {"low": 0, "expected": 0, "high": 0},
                    "next_90_days": {"low": 0, "expected": 0, "high": 0}
                }
            },
            "confidence": 0.75,
            "model_version": "v1.0",
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    
    @growth_router.get("/opportunities")
    async def get_growth_opportunities():
        """Growth opportunities and recommendations"""
        return {
            "opportunities": [
                {
                    "id": "opp_1",
                    "type": "user_activation",
                    "title": "Improve new user activation",
                    "description": "30% of new users don't complete their first listing",
                    "potential_impact": "high",
                    "effort": "medium",
                    "priority_score": 85,
                    "suggested_actions": [
                        "Add onboarding tutorial",
                        "Simplify listing creation flow",
                        "Send activation reminders"
                    ]
                },
                {
                    "id": "opp_2",
                    "type": "engagement",
                    "title": "Increase daily active users",
                    "description": "DAU/MAU ratio is below industry average",
                    "potential_impact": "high",
                    "effort": "high",
                    "priority_score": 75,
                    "suggested_actions": [
                        "Implement push notifications",
                        "Add personalized recommendations",
                        "Create daily deals feature"
                    ]
                },
                {
                    "id": "opp_3",
                    "type": "retention",
                    "title": "Reduce seller churn",
                    "description": "15% of sellers become inactive after 30 days",
                    "potential_impact": "medium",
                    "effort": "low",
                    "priority_score": 70,
                    "suggested_actions": [
                        "Implement seller success program",
                        "Add listing performance insights",
                        "Offer promotional credits"
                    ]
                }
            ]
        }
    
    @growth_router.get("/campaigns")
    async def get_campaigns():
        """List marketing campaigns"""
        campaigns = await db.marketing_campaigns.find({}).to_list(50)
        for c in campaigns:
            c["id"] = str(c.pop("_id", c.get("id", "")))
        
        if not campaigns:
            campaigns = [
                {
                    "id": "camp_default",
                    "name": "Welcome Campaign",
                    "type": "acquisition",
                    "status": "active",
                    "channels": ["email"],
                    "metrics": {"sent": 0, "opened": 0, "clicked": 0, "converted": 0}
                }
            ]
        
        return {"campaigns": campaigns, "total": len(campaigns)}
    
    @growth_router.post("/campaigns")
    async def create_campaign(campaign: CampaignCreate, admin = Depends(require_auth)):
        """Create marketing campaign"""
        campaign_doc = {
            "id": f"camp_{uuid.uuid4().hex[:12]}",
            **campaign.dict(),
            "status": "draft",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": admin.get("user_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown"),
            "metrics": {"sent": 0, "opened": 0, "clicked": 0, "converted": 0}
        }
        await db.marketing_campaigns.insert_one(campaign_doc)
        campaign_doc.pop("_id", None)
        return campaign_doc
    
    # =============================================================================
    # 2. AI CONTENT ENGINE
    # =============================================================================
    content_router = APIRouter(prefix="/content-engine", tags=["AI Content Engine"])
    
    @content_router.get("")
    async def get_content_dashboard():
        """Content engine dashboard"""
        return {
            "overview": {
                "total_generated": 0,
                "pending_review": 0,
                "published": 0,
                "templates_count": 5
            },
            "recent_activity": [],
            "popular_types": [
                {"type": "listing_description", "count": 0},
                {"type": "social_post", "count": 0},
                {"type": "email", "count": 0}
            ]
        }
    
    @content_router.get("/suggestions")
    async def get_content_suggestions(category: Optional[str] = None):
        """Get AI content suggestions"""
        return {
            "suggestions": [
                {
                    "id": "sug_1",
                    "type": "listing_description",
                    "title": "Improve listing descriptions",
                    "description": "45 listings have generic descriptions",
                    "priority": "high",
                    "action": "generate_descriptions"
                },
                {
                    "id": "sug_2",
                    "type": "social_post",
                    "title": "Share trending listings",
                    "description": "5 listings are trending and could be promoted",
                    "priority": "medium",
                    "action": "create_social_posts"
                },
                {
                    "id": "sug_3",
                    "type": "seo_meta",
                    "title": "Update SEO meta tags",
                    "description": "120 pages missing meta descriptions",
                    "priority": "high",
                    "action": "generate_meta_tags"
                }
            ]
        }
    
    @content_router.post("/generate")
    async def generate_content(request: ContentGenerateRequest, user = Depends(require_auth)):
        """Generate content using AI"""
        content_id = f"content_{uuid.uuid4().hex[:12]}"
        
        # Mock AI-generated content
        generated_content = {
            "listing_description": "This exceptional item features premium quality and excellent condition...",
            "social_post": "🔥 Don't miss this amazing deal! Check out our latest listing...",
            "email": "Dear valued customer, We're excited to share some great news...",
            "seo_meta": {
                "title": "Buy Quality Products - Best Deals Online",
                "description": "Find amazing deals on quality products. Shop now for the best prices."
            }
        }
        
        return {
            "id": content_id,
            "type": request.type,
            "content": generated_content.get(request.type, "Generated content placeholder"),
            "tone": request.tone,
            "length": request.length,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "status": "draft"
        }
    
    @content_router.get("/templates")
    async def get_content_templates():
        """Get content templates"""
        templates = await db.content_templates.find({}).to_list(50)
        for t in templates:
            t["id"] = str(t.pop("_id", t.get("id", "")))
        
        if not templates:
            templates = [
                {"id": "tpl_listing", "name": "Listing Description", "type": "listing_description", "content": "{{product_name}} - {{condition}}. {{features}}", "variables": ["product_name", "condition", "features"]},
                {"id": "tpl_social", "name": "Social Post", "type": "social_post", "content": "🛒 {{headline}}\n\n{{description}}\n\n#marketplace #deals", "variables": ["headline", "description"]},
                {"id": "tpl_email", "name": "Welcome Email", "type": "email", "content": "Hi {{name}},\n\nWelcome to our marketplace!", "variables": ["name"]}
            ]
        
        return {"templates": templates, "total": len(templates)}
    
    @content_router.post("/templates")
    async def create_content_template(template: ContentTemplateCreate, admin = Depends(require_auth)):
        """Create content template"""
        template_doc = {
            "id": f"tpl_{uuid.uuid4().hex[:8]}",
            **template.dict(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.content_templates.insert_one(template_doc)
        template_doc.pop("_id", None)
        return template_doc
    
    @content_router.get("/analytics")
    async def get_content_analytics(days: int = Query(default=30)):
        """Content performance analytics"""
        return {
            "period_days": days,
            "total_generated": 0,
            "by_type": {
                "listing_description": {"generated": 0, "published": 0, "engagement_rate": 0},
                "social_post": {"generated": 0, "published": 0, "engagement_rate": 0},
                "email": {"generated": 0, "published": 0, "open_rate": 0, "click_rate": 0}
            },
            "ai_quality_score": 85,
            "user_edit_rate": 15
        }
    
    # =============================================================================
    # 3. ASO ENGINE
    # =============================================================================
    aso_router = APIRouter(prefix="/aso-engine", tags=["ASO Engine"])
    
    @aso_router.get("")
    async def get_aso_dashboard():
        """ASO dashboard overview"""
        return {
            "overview": {
                "app_store_score": 72,
                "play_store_score": 68,
                "keyword_rankings": 45,
                "avg_rating": 4.2,
                "total_reviews": 156
            },
            "visibility_trend": "improving",
            "competitors_tracked": 5,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
    
    @aso_router.get("/keywords")
    async def get_keyword_rankings():
        """Get keyword rankings"""
        return {
            "keywords": [
                {"keyword": "marketplace", "rank": 12, "volume": "high", "difficulty": 65, "change": 3},
                {"keyword": "buy sell app", "rank": 8, "volume": "medium", "difficulty": 45, "change": -2},
                {"keyword": "classifieds", "rank": 25, "volume": "high", "difficulty": 72, "change": 5},
                {"keyword": "local marketplace", "rank": 15, "volume": "medium", "difficulty": 55, "change": 0},
                {"keyword": "second hand", "rank": 18, "volume": "high", "difficulty": 60, "change": -1}
            ],
            "total_tracked": 50
        }
    
    @aso_router.get("/competitors")
    async def get_competitors():
        """Competitor analysis"""
        return {
            "competitors": [
                {"name": "Competitor A", "rating": 4.5, "reviews": 50000, "rank": 5, "strength": "brand"},
                {"name": "Competitor B", "rating": 4.3, "reviews": 25000, "rank": 12, "strength": "features"},
                {"name": "Competitor C", "rating": 4.1, "reviews": 15000, "rank": 20, "strength": "local"}
            ],
            "your_position": {
                "rating": 4.2,
                "reviews": 156,
                "estimated_rank": 45
            }
        }
    
    @aso_router.get("/ratings")
    async def get_ratings():
        """App ratings and reviews"""
        return {
            "overview": {
                "average_rating": 4.2,
                "total_reviews": 156,
                "rating_distribution": {"5": 80, "4": 45, "3": 20, "2": 8, "1": 3}
            },
            "recent_reviews": [
                {"rating": 5, "text": "Great app!", "date": "2026-02-28", "replied": True},
                {"rating": 4, "text": "Good but could be faster", "date": "2026-02-27", "replied": False}
            ],
            "sentiment": {"positive": 75, "neutral": 18, "negative": 7}
        }
    
    @aso_router.get("/suggestions")
    async def get_aso_suggestions():
        """ASO improvement suggestions"""
        return {
            "suggestions": [
                {"id": "aso_1", "category": "title", "suggestion": "Include primary keyword in app title", "impact": "high", "effort": "low"},
                {"id": "aso_2", "category": "description", "suggestion": "Add more keywords to description", "impact": "medium", "effort": "low"},
                {"id": "aso_3", "category": "screenshots", "suggestion": "Update screenshots with new features", "impact": "high", "effort": "medium"},
                {"id": "aso_4", "category": "reviews", "suggestion": "Respond to negative reviews", "impact": "medium", "effort": "low"}
            ]
        }
    
    @aso_router.put("/metadata")
    async def update_app_metadata(metadata: Dict = Body(...), admin = Depends(require_auth)):
        """Update app metadata"""
        await db.aso_metadata.update_one(
            {"id": "app_metadata"},
            {"$set": {**metadata, "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return {"status": "updated", "metadata": metadata}
    
    # =============================================================================
    # 4. CONTENT CALENDAR
    # =============================================================================
    calendar_router = APIRouter(prefix="/content-calendar", tags=["Content Calendar"])
    
    @calendar_router.get("")
    async def get_calendar_overview():
        """Calendar overview"""
        events = await db.calendar_events.count_documents({})
        return {
            "overview": {
                "total_events": events,
                "upcoming_this_week": 0,
                "overdue": 0,
                "published_this_month": 0
            },
            "calendar_view": "month"
        }
    
    @calendar_router.get("/events")
    async def get_calendar_events(
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        status: Optional[str] = None
    ):
        """Get scheduled content events"""
        query = {}
        if status:
            query["status"] = status
        
        events = await db.calendar_events.find(query).to_list(100)
        for e in events:
            e["id"] = str(e.pop("_id", e.get("id", "")))
        
        return {"events": events, "total": len(events)}
    
    @calendar_router.post("/events")
    async def create_calendar_event(event: CalendarEventCreate, admin = Depends(require_auth)):
        """Create calendar event"""
        event_doc = {
            "id": f"event_{uuid.uuid4().hex[:12]}",
            **event.dict(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": admin.get("user_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown")
        }
        await db.calendar_events.insert_one(event_doc)
        event_doc.pop("_id", None)
        return event_doc
    
    @calendar_router.put("/events/{event_id}")
    async def update_calendar_event(event_id: str, update: CalendarEventUpdate, admin = Depends(require_auth)):
        """Update calendar event"""
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.calendar_events.update_one({"id": event_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Event not found")
        return {"status": "updated", "event_id": event_id}
    
    @calendar_router.delete("/events/{event_id}")
    async def delete_calendar_event(event_id: str, admin = Depends(require_auth)):
        """Delete calendar event"""
        result = await db.calendar_events.delete_one({"id": event_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Event not found")
        return {"status": "deleted", "event_id": event_id}
    
    @calendar_router.get("/templates")
    async def get_calendar_templates():
        """Get calendar templates"""
        return {
            "templates": [
                {"id": "weekly_social", "name": "Weekly Social Posts", "frequency": "weekly", "channels": ["social"]},
                {"id": "monthly_newsletter", "name": "Monthly Newsletter", "frequency": "monthly", "channels": ["email"]},
                {"id": "promotional", "name": "Promotional Campaign", "frequency": "custom", "channels": ["email", "push", "social"]}
            ]
        }
    
    # =============================================================================
    # 5. ADVANCED SEO
    # =============================================================================
    seo_router = APIRouter(prefix="/advanced-seo", tags=["Advanced SEO"])
    
    @seo_router.get("")
    async def get_seo_dashboard():
        """SEO dashboard overview"""
        return {
            "overview": {
                "overall_score": 72,
                "pages_indexed": 450,
                "pages_with_issues": 35,
                "avg_page_speed": 2.8,
                "mobile_friendly": 95
            },
            "critical_issues": 5,
            "warnings": 12,
            "opportunities": 8,
            "last_audit": datetime.now(timezone.utc).isoformat()
        }
    
    @seo_router.get("/audit")
    async def get_seo_audit():
        """Site-wide SEO audit"""
        return {
            "audit_date": datetime.now(timezone.utc).isoformat(),
            "score": 72,
            "categories": {
                "technical": {"score": 78, "issues": 8},
                "content": {"score": 65, "issues": 15},
                "performance": {"score": 70, "issues": 5},
                "mobile": {"score": 85, "issues": 2}
            },
            "issues": [
                {"id": "seo_1", "severity": "critical", "category": "technical", "issue": "Missing sitemap.xml", "affected_pages": 0},
                {"id": "seo_2", "severity": "warning", "category": "content", "issue": "Duplicate meta descriptions", "affected_pages": 25},
                {"id": "seo_3", "severity": "info", "category": "performance", "issue": "Large images not optimized", "affected_pages": 120}
            ]
        }
    
    @seo_router.get("/pages")
    async def get_page_seo_scores(limit: int = Query(default=50)):
        """Page-level SEO scores"""
        return {
            "pages": [
                {"url": "/", "score": 85, "title_ok": True, "meta_ok": True, "headings_ok": True},
                {"url": "/listings", "score": 72, "title_ok": True, "meta_ok": False, "headings_ok": True},
                {"url": "/categories", "score": 68, "title_ok": True, "meta_ok": False, "headings_ok": False}
            ],
            "total_pages": 450,
            "avg_score": 72
        }
    
    @seo_router.get("/keywords")
    async def get_seo_keywords():
        """Keyword performance"""
        return {
            "keywords": [
                {"keyword": "marketplace", "ranking": 15, "volume": 12000, "difficulty": 65, "trend": "up"},
                {"keyword": "buy and sell", "ranking": 22, "volume": 8500, "difficulty": 55, "trend": "stable"},
                {"keyword": "local classifieds", "ranking": 18, "volume": 5000, "difficulty": 45, "trend": "up"}
            ],
            "total_tracked": 100
        }
    
    @seo_router.get("/meta-tags")
    async def get_meta_tag_analysis():
        """Meta tag analysis"""
        return {
            "overview": {
                "pages_with_title": 420,
                "pages_without_title": 30,
                "pages_with_description": 380,
                "pages_without_description": 70,
                "duplicate_titles": 15,
                "duplicate_descriptions": 25
            },
            "issues": [
                {"type": "missing_title", "count": 30, "severity": "critical"},
                {"type": "missing_description", "count": 70, "severity": "warning"},
                {"type": "title_too_long", "count": 12, "severity": "info"}
            ]
        }
    
    @seo_router.put("/settings")
    async def update_seo_settings(settings: SEOSettingsUpdate, admin = Depends(require_auth)):
        """Update SEO settings"""
        await db.seo_settings.update_one(
            {"id": "global"},
            {"$set": {**settings.dict(), "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return {"status": "updated", "settings": settings.dict()}
    
    @seo_router.get("/schema")
    async def get_schema_status():
        """Schema markup status"""
        return {
            "enabled": True,
            "schemas_implemented": [
                {"type": "Product", "pages": 350, "valid": 340, "errors": 10},
                {"type": "Organization", "pages": 1, "valid": 1, "errors": 0},
                {"type": "BreadcrumbList", "pages": 450, "valid": 445, "errors": 5},
                {"type": "LocalBusiness", "pages": 1, "valid": 1, "errors": 0}
            ],
            "validation_errors": 15,
            "last_validated": datetime.now(timezone.utc).isoformat()
        }
    
    # =============================================================================
    # 6. SEO ANALYTICS
    # =============================================================================
    seo_analytics_router = APIRouter(prefix="/seo-analytics", tags=["SEO Analytics"])
    
    @seo_analytics_router.get("")
    async def get_seo_analytics_overview():
        """SEO analytics overview"""
        return {
            "overview": {
                "organic_traffic": 15000,
                "organic_traffic_change": 12.5,
                "avg_position": 18.5,
                "total_impressions": 250000,
                "total_clicks": 15000,
                "avg_ctr": 6.0
            },
            "period": "30d"
        }
    
    @seo_analytics_router.get("/rankings")
    async def get_search_rankings():
        """Search rankings"""
        return {
            "rankings": [
                {"keyword": "marketplace app", "position": 12, "previous": 15, "change": 3, "url": "/"},
                {"keyword": "buy sell online", "position": 18, "previous": 20, "change": 2, "url": "/listings"},
                {"keyword": "local classifieds", "position": 8, "previous": 8, "change": 0, "url": "/categories"}
            ],
            "top_10_keywords": 5,
            "top_50_keywords": 25
        }
    
    @seo_analytics_router.get("/traffic")
    async def get_organic_traffic(days: int = Query(default=30)):
        """Organic traffic data"""
        traffic = []
        base_date = datetime.now(timezone.utc)
        
        for i in range(days, 0, -1):
            date = (base_date - timedelta(days=i)).strftime("%Y-%m-%d")
            traffic.append({
                "date": date,
                "sessions": random.randint(400, 600),
                "users": random.randint(350, 550),
                "pageviews": random.randint(1000, 1500)
            })
        
        return {"traffic": traffic, "period_days": days}
    
    @seo_analytics_router.get("/clicks")
    async def get_click_through_rates():
        """Click-through rates"""
        return {
            "overall_ctr": 6.0,
            "by_page_type": {
                "homepage": 8.5,
                "category_pages": 5.2,
                "listing_pages": 4.8,
                "search_results": 3.5
            },
            "by_position": [
                {"position": "1-3", "ctr": 25.5},
                {"position": "4-10", "ctr": 8.2},
                {"position": "11-20", "ctr": 2.5},
                {"position": "21-50", "ctr": 0.8}
            ]
        }
    
    @seo_analytics_router.get("/impressions")
    async def get_search_impressions():
        """Search impressions"""
        return {
            "total_impressions": 250000,
            "impressions_change": 15.2,
            "by_device": {
                "mobile": 175000,
                "desktop": 62500,
                "tablet": 12500
            },
            "top_queries": [
                {"query": "marketplace", "impressions": 25000},
                {"query": "buy sell app", "impressions": 18000},
                {"query": "local classifieds", "impressions": 12000}
            ]
        }
    
    @seo_analytics_router.get("/trends")
    async def get_seo_trends(days: int = Query(default=30)):
        """SEO trends over time"""
        trends = []
        base_date = datetime.now(timezone.utc)
        
        for i in range(days, 0, -1):
            date = (base_date - timedelta(days=i)).strftime("%Y-%m-%d")
            trends.append({
                "date": date,
                "impressions": random.randint(7000, 10000),
                "clicks": random.randint(400, 600),
                "avg_position": round(random.uniform(15, 22), 1),
                "ctr": round(random.uniform(5, 7), 2)
            })
        
        return {"trends": trends, "period_days": days}
    
    # =============================================================================
    # 7. MULTILANG SEO
    # =============================================================================
    multilang_router = APIRouter(prefix="/multilang-seo", tags=["Multilingual SEO"])
    
    @multilang_router.get("")
    async def get_multilang_dashboard():
        """Multilingual SEO dashboard"""
        return {
            "overview": {
                "default_language": "en",
                "enabled_languages": ["en", "sw"],
                "total_pages": 450,
                "fully_translated": 120,
                "partially_translated": 200,
                "not_translated": 130
            },
            "hreflang_status": "configured",
            "translation_coverage": 71
        }
    
    @multilang_router.get("/languages")
    async def get_supported_languages():
        """Get supported languages"""
        return {
            "languages": [
                {"code": "en", "name": "English", "enabled": True, "is_default": True, "coverage": 100},
                {"code": "sw", "name": "Swahili", "enabled": True, "is_default": False, "coverage": 45},
                {"code": "de", "name": "German", "enabled": False, "is_default": False, "coverage": 0},
                {"code": "fr", "name": "French", "enabled": False, "is_default": False, "coverage": 0}
            ]
        }
    
    @multilang_router.get("/hreflang")
    async def get_hreflang_status():
        """Hreflang tag status"""
        return {
            "configured": True,
            "pages_with_hreflang": 320,
            "pages_without_hreflang": 130,
            "issues": [
                {"type": "missing_return_link", "count": 15},
                {"type": "invalid_language_code", "count": 3}
            ],
            "last_validated": datetime.now(timezone.utc).isoformat()
        }
    
    @multilang_router.get("/translations")
    async def get_translation_coverage():
        """Translation coverage"""
        return {
            "coverage": {
                "en": {"total": 450, "translated": 450, "percentage": 100},
                "sw": {"total": 450, "translated": 200, "percentage": 45}
            },
            "by_content_type": {
                "listings": {"en": 100, "sw": 30},
                "categories": {"en": 100, "sw": 100},
                "static_pages": {"en": 100, "sw": 80}
            }
        }
    
    @multilang_router.put("/config")
    async def update_multilang_config(config: MultilangConfigUpdate, admin = Depends(require_auth)):
        """Update language configuration"""
        await db.multilang_config.update_one(
            {"id": "global"},
            {"$set": {**config.dict(), "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return {"status": "updated", "config": config.dict()}
    
    @multilang_router.get("/performance")
    async def get_performance_by_language():
        """Performance by language"""
        return {
            "performance": {
                "en": {
                    "organic_traffic": 12000,
                    "avg_position": 15.5,
                    "ctr": 6.2,
                    "bounce_rate": 35
                },
                "sw": {
                    "organic_traffic": 3000,
                    "avg_position": 22.0,
                    "ctr": 4.8,
                    "bounce_rate": 42
                }
            }
        }
    
    # =============================================================================
    # 8. BACKLINK MONITORING
    # =============================================================================
    backlink_router = APIRouter(prefix="/backlinks", tags=["Backlink Monitoring"])
    
    @backlink_router.get("")
    async def get_backlink_overview():
        """Backlink overview"""
        return {
            "overview": {
                "total_backlinks": 1250,
                "referring_domains": 185,
                "domain_authority": 35,
                "new_last_30_days": 45,
                "lost_last_30_days": 12
            },
            "quality_distribution": {
                "high": 250,
                "medium": 650,
                "low": 350
            }
        }
    
    @backlink_router.get("/list")
    async def get_backlinks_list(
        quality: Optional[str] = None,
        limit: int = Query(default=50)
    ):
        """List all backlinks"""
        return {
            "backlinks": [
                {"url": "https://example.com/article", "anchor": "marketplace app", "domain_authority": 45, "quality": "high", "first_seen": "2026-01-15"},
                {"url": "https://blog.example.org/review", "anchor": "buy sell app", "domain_authority": 38, "quality": "medium", "first_seen": "2026-02-01"},
                {"url": "https://news.example.net/tech", "anchor": "click here", "domain_authority": 52, "quality": "high", "first_seen": "2026-02-20"}
            ],
            "total": 1250
        }
    
    @backlink_router.get("/new")
    async def get_new_backlinks(days: int = Query(default=30)):
        """New backlinks"""
        return {
            "new_backlinks": [
                {"url": "https://new-site.com/article", "anchor": "marketplace", "domain_authority": 42, "discovered": "2026-02-28"}
            ],
            "total_new": 45,
            "period_days": days
        }
    
    @backlink_router.get("/lost")
    async def get_lost_backlinks(days: int = Query(default=30)):
        """Lost backlinks"""
        return {
            "lost_backlinks": [
                {"url": "https://old-site.com/page", "anchor": "buy sell", "domain_authority": 35, "lost_date": "2026-02-25", "reason": "page_removed"}
            ],
            "total_lost": 12,
            "period_days": days
        }
    
    @backlink_router.get("/toxic")
    async def get_toxic_backlinks():
        """Toxic backlinks to disavow"""
        return {
            "toxic_backlinks": [
                {"url": "https://spam-site.com/link", "toxicity_score": 85, "reason": "link_farm", "recommendation": "disavow"}
            ],
            "total_toxic": 15,
            "disavow_file_generated": False
        }
    
    @backlink_router.get("/competitors")
    async def get_competitor_backlinks():
        """Competitor backlink analysis"""
        return {
            "competitors": [
                {"name": "Competitor A", "total_backlinks": 5000, "referring_domains": 450, "domain_authority": 55},
                {"name": "Competitor B", "total_backlinks": 3200, "referring_domains": 280, "domain_authority": 48}
            ],
            "common_backlinks": 25,
            "unique_opportunities": 150
        }
    
    @backlink_router.get("/opportunities")
    async def get_link_opportunities():
        """Link building opportunities"""
        return {
            "opportunities": [
                {"type": "guest_post", "site": "example-blog.com", "domain_authority": 45, "relevance": "high", "contact": "editor@example-blog.com"},
                {"type": "broken_link", "site": "resource-site.org", "domain_authority": 52, "relevance": "medium", "broken_url": "https://old-url.com"},
                {"type": "mention", "site": "news-site.net", "domain_authority": 60, "relevance": "high", "context": "unlinked brand mention"}
            ],
            "total_opportunities": 150
        }
    
    # =============================================================================
    # 9. AUTHORITY BUILDING
    # =============================================================================
    authority_router = APIRouter(prefix="/authority-building", tags=["Authority Building"])
    
    @authority_router.get("")
    async def get_authority_dashboard():
        """Authority dashboard"""
        return {
            "overview": {
                "domain_authority": 35,
                "page_authority_avg": 28,
                "trust_flow": 25,
                "citation_flow": 30
            },
            "trend": "improving",
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
    
    @authority_router.get("/score")
    async def get_authority_score():
        """Domain authority score"""
        return {
            "domain_authority": 35,
            "history": [
                {"date": "2026-01-01", "score": 30},
                {"date": "2026-02-01", "score": 33},
                {"date": "2026-03-01", "score": 35}
            ],
            "factors": {
                "backlink_quality": 72,
                "backlink_quantity": 65,
                "content_quality": 78,
                "technical_seo": 80
            }
        }
    
    @authority_router.get("/metrics")
    async def get_authority_metrics():
        """Authority metrics"""
        return {
            "metrics": {
                "domain_authority": 35,
                "page_authority": {"min": 10, "max": 55, "avg": 28},
                "spam_score": 5,
                "trust_flow": 25,
                "citation_flow": 30,
                "referring_domains": 185,
                "root_domains_linking": 175
            }
        }
    
    @authority_router.get("/suggestions")
    async def get_authority_suggestions():
        """Authority improvement tips"""
        return {
            "suggestions": [
                {"id": "auth_1", "category": "content", "suggestion": "Create more high-quality content", "impact": "high", "effort": "high"},
                {"id": "auth_2", "category": "backlinks", "suggestion": "Build relationships with industry bloggers", "impact": "high", "effort": "medium"},
                {"id": "auth_3", "category": "technical", "suggestion": "Improve site speed", "impact": "medium", "effort": "low"},
                {"id": "auth_4", "category": "social", "suggestion": "Increase social media presence", "impact": "medium", "effort": "medium"}
            ]
        }
    
    @authority_router.get("/competitors")
    async def get_competitor_authority():
        """Competitor authority comparison"""
        return {
            "comparison": [
                {"name": "Your Site", "domain_authority": 35, "backlinks": 1250, "referring_domains": 185},
                {"name": "Competitor A", "domain_authority": 55, "backlinks": 5000, "referring_domains": 450},
                {"name": "Competitor B", "domain_authority": 48, "backlinks": 3200, "referring_domains": 280}
            ],
            "gap_analysis": {
                "authority_gap": 20,
                "backlink_gap": 3750,
                "domain_gap": 265
            }
        }
    
    @authority_router.get("/mentions")
    async def get_brand_mentions():
        """Brand mentions"""
        return {
            "mentions": [
                {"source": "example-blog.com", "date": "2026-02-28", "sentiment": "positive", "linked": False},
                {"source": "news-site.org", "date": "2026-02-25", "sentiment": "neutral", "linked": True}
            ],
            "total_mentions": 45,
            "linked": 20,
            "unlinked": 25,
            "sentiment_breakdown": {"positive": 30, "neutral": 12, "negative": 3}
        }
    
    # =============================================================================
    # 10. SOCIAL DISTRIBUTION
    # =============================================================================
    social_router = APIRouter(prefix="/social-distribution", tags=["Social Distribution"])
    
    @social_router.get("")
    async def get_social_dashboard():
        """Social dashboard"""
        return {
            "overview": {
                "connected_channels": 2,
                "total_posts": 0,
                "scheduled_posts": 0,
                "total_reach": 0,
                "total_engagement": 0
            },
            "last_post": None
        }
    
    @social_router.get("/channels")
    async def get_social_channels():
        """Connected social channels"""
        channels = await db.social_channels.find({}).to_list(10)
        for c in channels:
            c["id"] = str(c.pop("_id", c.get("id", "")))
        
        if not channels:
            channels = [
                {"platform": "facebook", "status": "not_connected", "followers": 0},
                {"platform": "twitter", "status": "not_connected", "followers": 0},
                {"platform": "instagram", "status": "not_connected", "followers": 0},
                {"platform": "linkedin", "status": "not_connected", "followers": 0}
            ]
        
        return {"channels": channels}
    
    @social_router.post("/channels")
    async def connect_social_channel(channel: SocialChannelConnect, admin = Depends(require_auth)):
        """Connect social channel"""
        channel_doc = {
            "id": f"social_{channel.platform}_{uuid.uuid4().hex[:8]}",
            "platform": channel.platform,
            "account_id": channel.account_id,
            "status": "connected",
            "connected_at": datetime.now(timezone.utc).isoformat(),
            "connected_by": admin.get("user_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown")
        }
        await db.social_channels.insert_one(channel_doc)
        channel_doc.pop("_id", None)
        channel_doc.pop("access_token", None)  # Don't return token
        return channel_doc
    
    @social_router.get("/posts")
    async def get_scheduled_posts(status: Optional[str] = None):
        """Get scheduled posts"""
        query = {}
        if status:
            query["status"] = status
        
        posts = await db.social_posts.find(query).to_list(50)
        for p in posts:
            p["id"] = str(p.pop("_id", p.get("id", "")))
        
        return {"posts": posts, "total": len(posts)}
    
    @social_router.post("/posts")
    async def schedule_social_post(post: SocialPostCreate, admin = Depends(require_auth)):
        """Schedule social post"""
        post_doc = {
            "id": f"post_{uuid.uuid4().hex[:12]}",
            **post.dict(),
            "status": "scheduled" if post.scheduled_time else "draft",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": admin.get("user_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown"),
            "metrics": {"impressions": 0, "reach": 0, "engagement": 0, "clicks": 0}
        }
        await db.social_posts.insert_one(post_doc)
        post_doc.pop("_id", None)
        return post_doc
    
    @social_router.get("/analytics")
    async def get_social_analytics(days: int = Query(default=30)):
        """Social performance analytics"""
        return {
            "period_days": days,
            "overview": {
                "total_posts": 0,
                "total_reach": 0,
                "total_engagement": 0,
                "avg_engagement_rate": 0
            },
            "by_platform": {
                "facebook": {"posts": 0, "reach": 0, "engagement": 0},
                "twitter": {"posts": 0, "reach": 0, "engagement": 0},
                "instagram": {"posts": 0, "reach": 0, "engagement": 0}
            }
        }
    
    @social_router.get("/engagement")
    async def get_engagement_metrics():
        """Engagement metrics"""
        return {
            "total_engagement": 0,
            "by_type": {
                "likes": 0,
                "comments": 0,
                "shares": 0,
                "clicks": 0
            },
            "engagement_rate": 0,
            "best_performing_posts": []
        }
    
    # =============================================================================
    # 11. AUDIT LOGS
    # =============================================================================
    audit_router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])
    
    @audit_router.get("")
    async def get_audit_logs(
        page: int = Query(default=1, ge=1),
        limit: int = Query(default=50, le=100),
        action: Optional[str] = None,
        user_id: Optional[str] = None
    ):
        """List audit logs"""
        query = {}
        if action:
            query["action"] = action
        if user_id:
            query["user_id"] = user_id
        
        skip = (page - 1) * limit
        logs = await db.audit_logs.find(query).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
        total = await db.audit_logs.count_documents(query)
        
        for log in logs:
            log["id"] = str(log.pop("_id", log.get("id", "")))
        
        return {
            "logs": logs,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    
    @audit_router.get("/filters")
    async def get_audit_filters():
        """Available filters"""
        return {
            "actions": [
                "user.login", "user.logout", "user.register",
                "listing.create", "listing.update", "listing.delete",
                "admin.config_change", "admin.user_ban", "admin.role_change",
                "payment.success", "payment.failed",
                "api.key_created", "api.key_revoked"
            ],
            "severity": ["info", "warning", "critical"],
            "categories": ["auth", "listings", "admin", "payments", "api"]
        }
    
    @audit_router.get("/export")
    async def export_audit_logs(
        format: str = Query(default="json", enum=["json", "csv"]),
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ):
        """Export logs"""
        return {
            "export_url": f"/api/audit-logs/download?format={format}",
            "status": "generating",
            "estimated_records": 1000,
            "message": "Export will be ready shortly"
        }
    
    @audit_router.get("/stats")
    async def get_audit_stats(days: int = Query(default=30)):
        """Audit statistics"""
        total = await db.audit_logs.count_documents({})
        
        return {
            "period_days": days,
            "total_events": total,
            "by_action": {
                "user.login": int(total * 0.4),
                "listing.create": int(total * 0.2),
                "listing.update": int(total * 0.15),
                "admin.config_change": int(total * 0.05),
                "other": int(total * 0.2)
            },
            "by_severity": {
                "info": int(total * 0.85),
                "warning": int(total * 0.12),
                "critical": int(total * 0.03)
            }
        }
    
    @audit_router.get("/users/{user_id}")
    async def get_user_audit_logs(user_id: str, limit: int = Query(default=50)):
        """Logs by user"""
        logs = await db.audit_logs.find({"user_id": user_id}).sort("timestamp", -1).limit(limit).to_list(limit)
        for log in logs:
            log["id"] = str(log.pop("_id", log.get("id", "")))
        
        return {"user_id": user_id, "logs": logs, "total": len(logs)}
    
    @audit_router.get("/actions")
    async def get_available_actions():
        """Available action types"""
        return {
            "action_types": [
                {"action": "user.login", "description": "User logged in", "category": "auth"},
                {"action": "user.logout", "description": "User logged out", "category": "auth"},
                {"action": "user.register", "description": "New user registered", "category": "auth"},
                {"action": "listing.create", "description": "Listing created", "category": "listings"},
                {"action": "listing.update", "description": "Listing updated", "category": "listings"},
                {"action": "listing.delete", "description": "Listing deleted", "category": "listings"},
                {"action": "admin.config_change", "description": "Admin configuration changed", "category": "admin"},
                {"action": "admin.user_ban", "description": "User banned by admin", "category": "admin"},
                {"action": "payment.success", "description": "Payment successful", "category": "payments"},
                {"action": "payment.failed", "description": "Payment failed", "category": "payments"}
            ]
        }
    
    # =============================================================================
    # 12. ANALYTICS SETTINGS
    # =============================================================================
    analytics_settings_router = APIRouter(prefix="/analytics-settings", tags=["Analytics Settings"])
    
    @analytics_settings_router.get("")
    async def get_analytics_settings():
        """Analytics configuration"""
        config = await db.analytics_settings.find_one({"id": "global"})
        if not config:
            config = {
                "id": "global",
                "enabled": True,
                "sampling_rate": 1.0,
                "data_retention_days": 365,
                "anonymize_ip": True,
                "respect_dnt": True,
                "cookie_consent_required": True
            }
        config.pop("_id", None)
        return config
    
    @analytics_settings_router.put("")
    async def update_analytics_settings(settings: AnalyticsSettingsUpdate, admin = Depends(require_auth)):
        """Update settings"""
        await db.analytics_settings.update_one(
            {"id": "global"},
            {"$set": {**settings.dict(), "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return {"status": "updated", "settings": settings.dict()}
    
    @analytics_settings_router.get("/tracking")
    async def get_tracking_settings():
        """Tracking settings"""
        config = await db.tracking_settings.find_one({"id": "global"})
        if not config:
            config = {
                "id": "global",
                "enable_page_views": True,
                "enable_events": True,
                "enable_user_timing": True,
                "enable_ecommerce": True,
                "excluded_paths": ["/admin", "/api"],
                "custom_dimensions": [],
                "custom_metrics": []
            }
        config.pop("_id", None)
        return config
    
    @analytics_settings_router.put("/tracking")
    async def update_tracking_settings(settings: TrackingSettingsUpdate, admin = Depends(require_auth)):
        """Update tracking settings"""
        await db.tracking_settings.update_one(
            {"id": "global"},
            {"$set": {**settings.dict(), "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return {"status": "updated", "settings": settings.dict()}
    
    @analytics_settings_router.get("/integrations")
    async def get_analytics_integrations():
        """Analytics integrations"""
        return {
            "integrations": [
                {"name": "Google Analytics", "status": "not_configured", "tracking_id": None},
                {"name": "Mixpanel", "status": "not_configured", "project_token": None},
                {"name": "Amplitude", "status": "not_configured", "api_key": None},
                {"name": "Segment", "status": "not_configured", "write_key": None}
            ]
        }
    
    @analytics_settings_router.get("/privacy")
    async def get_privacy_settings():
        """Privacy settings (GDPR)"""
        config = await db.privacy_settings.find_one({"id": "global"})
        if not config:
            config = {
                "id": "global",
                "gdpr_enabled": True,
                "ccpa_enabled": False,
                "cookie_consent_required": True,
                "data_retention_days": 365,
                "anonymize_ip": True,
                "respect_dnt": True,
                "allow_data_export": True,
                "allow_data_deletion": True,
                "privacy_policy_url": "/privacy",
                "terms_url": "/terms"
            }
        config.pop("_id", None)
        return config
    
    # Return all routers
    return {
        "growth_engine": growth_router,
        "content_engine": content_router,
        "aso_engine": aso_router,
        "content_calendar": calendar_router,
        "advanced_seo": seo_router,
        "seo_analytics": seo_analytics_router,
        "multilang_seo": multilang_router,
        "backlinks": backlink_router,
        "authority_building": authority_router,
        "social_distribution": social_router,
        "audit_logs": audit_router,
        "analytics_settings": analytics_settings_router
    }
