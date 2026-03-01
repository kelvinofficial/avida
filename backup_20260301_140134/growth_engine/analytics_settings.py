"""
Analytics Settings Module
Manage Google Analytics and other analytics integrations
Includes demo data mode for preview and actual GA4 Data API integration
"""

from fastapi import APIRouter, HTTPException, Depends, Header, Query
from pydantic import BaseModel, Field
from typing import Optional, Callable, List, Dict, Any
from datetime import datetime, timezone, timedelta
import random
import math


class AnalyticsSettings(BaseModel):
    ga4_measurement_id: Optional[str] = Field(None, description="Google Analytics 4 Measurement ID (G-XXXXXXXXXX)")
    ga4_enabled: bool = Field(default=False, description="Enable GA4 tracking")
    gtm_container_id: Optional[str] = Field(None, description="Google Tag Manager Container ID (GTM-XXXXXXX)")
    gtm_enabled: bool = Field(default=False, description="Enable GTM")
    track_page_views: bool = Field(default=True)
    track_user_engagement: bool = Field(default=True)
    track_blog_reads: bool = Field(default=True)
    track_listing_views: bool = Field(default=True)
    track_conversions: bool = Field(default=True)
    anonymize_ip: bool = Field(default=True)
    demo_mode: bool = Field(default=True, description="Show demo data when GA4 is not connected")


class TrafficSource(BaseModel):
    source: str
    medium: str
    sessions: int
    users: int
    bounce_rate: float
    avg_session_duration: float


class PagePerformance(BaseModel):
    page_path: str
    page_title: str
    views: int
    unique_views: int
    avg_time_on_page: float
    bounce_rate: float
    exit_rate: float


def generate_demo_traffic_data(days: int = 30) -> Dict[str, Any]:
    """Generate realistic demo traffic data for preview"""
    base_daily_users = random.randint(150, 300)
    base_daily_sessions = int(base_daily_users * 1.3)
    
    daily_data = []
    total_users = 0
    total_sessions = 0
    total_pageviews = 0
    
    for i in range(days):
        date = datetime.now(timezone.utc) - timedelta(days=days - i - 1)
        # Add weekly pattern (lower on weekends)
        day_of_week = date.weekday()
        multiplier = 0.7 if day_of_week >= 5 else 1.0
        # Add some randomness
        multiplier *= random.uniform(0.8, 1.2)
        # Add growth trend
        growth_factor = 1 + (i / days) * 0.15
        
        users = int(base_daily_users * multiplier * growth_factor)
        sessions = int(base_daily_sessions * multiplier * growth_factor)
        pageviews = int(sessions * random.uniform(2.5, 4.0))
        
        total_users += users
        total_sessions += sessions
        total_pageviews += pageviews
        
        daily_data.append({
            "date": date.strftime("%Y-%m-%d"),
            "users": users,
            "sessions": sessions,
            "pageviews": pageviews,
            "bounce_rate": round(random.uniform(35, 55), 1),
            "avg_session_duration": round(random.uniform(120, 300), 0)
        })
    
    return {
        "summary": {
            "total_users": total_users,
            "total_sessions": total_sessions,
            "total_pageviews": total_pageviews,
            "avg_bounce_rate": round(random.uniform(40, 50), 1),
            "avg_session_duration": round(random.uniform(150, 250), 0),
            "pages_per_session": round(total_pageviews / total_sessions, 2),
            "new_users_percentage": round(random.uniform(60, 75), 1)
        },
        "daily": daily_data,
        "period": f"Last {days} days",
        "is_demo_data": True
    }


def generate_demo_traffic_sources() -> List[Dict[str, Any]]:
    """Generate demo traffic sources data"""
    sources = [
        {"source": "google", "medium": "organic", "base_sessions": 450},
        {"source": "direct", "medium": "(none)", "base_sessions": 280},
        {"source": "bing", "medium": "organic", "base_sessions": 85},
        {"source": "facebook", "medium": "social", "base_sessions": 120},
        {"source": "twitter", "medium": "social", "base_sessions": 65},
        {"source": "linkedin", "medium": "social", "base_sessions": 45},
        {"source": "chatgpt.com", "medium": "referral", "base_sessions": 95},
        {"source": "gemini.google.com", "medium": "referral", "base_sessions": 55},
        {"source": "perplexity.ai", "medium": "referral", "base_sessions": 35},
        {"source": "email", "medium": "email", "base_sessions": 40}
    ]
    
    result = []
    for src in sources:
        sessions = int(src["base_sessions"] * random.uniform(0.8, 1.3))
        users = int(sessions * random.uniform(0.7, 0.95))
        result.append({
            "source": src["source"],
            "medium": src["medium"],
            "sessions": sessions,
            "users": users,
            "bounce_rate": round(random.uniform(35, 65), 1),
            "avg_session_duration": round(random.uniform(90, 280), 0),
            "pages_per_session": round(random.uniform(1.8, 4.2), 2),
            "conversion_rate": round(random.uniform(1.5, 5.5), 2)
        })
    
    # Sort by sessions
    result.sort(key=lambda x: x["sessions"], reverse=True)
    return result


def generate_demo_page_performance() -> List[Dict[str, Any]]:
    """Generate demo page performance data"""
    pages = [
        {"path": "/", "title": "Avida - Buy & Sell Marketplace", "base_views": 1200},
        {"path": "/blog", "title": "Blog - Tips & Guides", "base_views": 450},
        {"path": "/blog/how-to-sell-car-online", "title": "How to Sell Your Car Online", "base_views": 320},
        {"path": "/blog/safety-tips-buyers", "title": "Safety Tips for Buyers", "base_views": 280},
        {"path": "/listings", "title": "Browse Listings", "base_views": 850},
        {"path": "/listings/vehicles", "title": "Vehicles for Sale", "base_views": 420},
        {"path": "/listings/electronics", "title": "Electronics for Sale", "base_views": 380},
        {"path": "/listings/properties", "title": "Properties for Rent/Sale", "base_views": 290},
        {"path": "/about", "title": "About Avida", "base_views": 150},
        {"path": "/contact", "title": "Contact Us", "base_views": 95}
    ]
    
    result = []
    for page in pages:
        views = int(page["base_views"] * random.uniform(0.8, 1.3))
        unique_views = int(views * random.uniform(0.7, 0.9))
        result.append({
            "page_path": page["path"],
            "page_title": page["title"],
            "views": views,
            "unique_views": unique_views,
            "avg_time_on_page": round(random.uniform(45, 180), 0),
            "bounce_rate": round(random.uniform(30, 70), 1),
            "exit_rate": round(random.uniform(20, 50), 1),
            "entrances": int(unique_views * random.uniform(0.3, 0.7))
        })
    
    result.sort(key=lambda x: x["views"], reverse=True)
    return result


def generate_demo_geo_data() -> List[Dict[str, Any]]:
    """Generate demo geographic data based on target markets"""
    countries = [
        {"country": "Tanzania", "code": "TZ", "base_users": 450, "flag": "🇹🇿"},
        {"country": "Kenya", "code": "KE", "base_users": 280, "flag": "🇰🇪"},
        {"country": "Germany", "code": "DE", "base_users": 180, "flag": "🇩🇪"},
        {"country": "Uganda", "code": "UG", "base_users": 120, "flag": "🇺🇬"},
        {"country": "Nigeria", "code": "NG", "base_users": 95, "flag": "🇳🇬"},
        {"country": "South Africa", "code": "ZA", "base_users": 85, "flag": "🇿🇦"},
        {"country": "United States", "code": "US", "base_users": 65, "flag": "🇺🇸"},
        {"country": "United Kingdom", "code": "GB", "base_users": 45, "flag": "🇬🇧"}
    ]
    
    result = []
    for geo in countries:
        users = int(geo["base_users"] * random.uniform(0.85, 1.25))
        sessions = int(users * random.uniform(1.1, 1.5))
        result.append({
            "country": geo["country"],
            "country_code": geo["code"],
            "flag": geo["flag"],
            "users": users,
            "sessions": sessions,
            "bounce_rate": round(random.uniform(38, 58), 1),
            "pages_per_session": round(random.uniform(2.0, 3.8), 2),
            "avg_session_duration": round(random.uniform(100, 250), 0)
        })
    
    result.sort(key=lambda x: x["users"], reverse=True)
    return result


def generate_demo_ai_citations() -> Dict[str, Any]:
    """Generate demo AI/LLM citation tracking data (AEO metrics)"""
    ai_sources = [
        {"name": "ChatGPT", "icon": "🤖", "base_referrals": 95},
        {"name": "Google Gemini", "icon": "✨", "base_referrals": 55},
        {"name": "Perplexity AI", "icon": "🔍", "base_referrals": 35},
        {"name": "Claude", "icon": "🧠", "base_referrals": 20},
        {"name": "Microsoft Copilot", "icon": "💡", "base_referrals": 28}
    ]
    
    citations = []
    total_ai_traffic = 0
    for src in ai_sources:
        referrals = int(src["base_referrals"] * random.uniform(0.7, 1.4))
        total_ai_traffic += referrals
        citations.append({
            "source": src["name"],
            "icon": src["icon"],
            "referrals": referrals,
            "avg_session_duration": round(random.uniform(150, 300), 0),
            "pages_per_session": round(random.uniform(2.5, 5.0), 2),
            "conversion_rate": round(random.uniform(2.0, 6.0), 2)
        })
    
    citations.sort(key=lambda x: x["referrals"], reverse=True)
    
    return {
        "total_ai_traffic": total_ai_traffic,
        "ai_traffic_growth": round(random.uniform(15, 45), 1),  # Growth percentage
        "citations_by_source": citations,
        "top_cited_content": [
            {"title": "How to Sell Your Car Online - Complete Guide", "citations": random.randint(25, 50)},
            {"title": "Best Safety Tips for Online Marketplace Buyers", "citations": random.randint(18, 35)},
            {"title": "Tanzania's Leading Classifieds Platform", "citations": random.randint(12, 28)}
        ],
        "aeo_score": round(random.uniform(65, 85), 0),
        "is_demo_data": True
    }


def create_analytics_settings_router(db, get_current_user: Callable):
    """Create analytics settings router"""
    
    router = APIRouter(prefix="/growth/analytics-settings", tags=["Analytics Settings"])
    
    async def require_admin(authorization: str = Header(None)):
        if not authorization:
            raise HTTPException(status_code=401, detail="Admin access required")
        return True

    @router.get("")
    async def get_analytics_settings(admin=Depends(require_admin)):
        """Get current analytics settings"""
        settings = await db.analytics_settings.find_one({"type": "ga4"})
        
        if not settings:
            # Return default settings
            return {
                "ga4_measurement_id": None,
                "ga4_enabled": False,
                "gtm_container_id": None,
                "gtm_enabled": False,
                "track_page_views": True,
                "track_user_engagement": True,
                "track_blog_reads": True,
                "track_listing_views": True,
                "track_conversions": True,
                "anonymize_ip": True,
                "setup_complete": False,
                "setup_instructions": {
                    "step1": "Go to Google Analytics 4 (analytics.google.com)",
                    "step2": "Create a new property or use existing one",
                    "step3": "Go to Admin > Data Streams > Web",
                    "step4": "Copy the Measurement ID (starts with G-)",
                    "step5": "Paste it in the field below and enable tracking"
                }
            }
        
        return {
            "ga4_measurement_id": settings.get("ga4_measurement_id"),
            "ga4_enabled": settings.get("ga4_enabled", False),
            "gtm_container_id": settings.get("gtm_container_id"),
            "gtm_enabled": settings.get("gtm_enabled", False),
            "track_page_views": settings.get("track_page_views", True),
            "track_user_engagement": settings.get("track_user_engagement", True),
            "track_blog_reads": settings.get("track_blog_reads", True),
            "track_listing_views": settings.get("track_listing_views", True),
            "track_conversions": settings.get("track_conversions", True),
            "anonymize_ip": settings.get("anonymize_ip", True),
            "setup_complete": bool(settings.get("ga4_measurement_id")),
            "last_updated": settings.get("updated_at").isoformat() if settings.get("updated_at") else None
        }

    @router.put("")
    async def update_analytics_settings(settings: AnalyticsSettings, admin=Depends(require_admin)):
        """Update analytics settings"""
        
        # Validate GA4 ID format if provided
        if settings.ga4_measurement_id:
            if not settings.ga4_measurement_id.startswith("G-"):
                raise HTTPException(
                    status_code=400, 
                    detail="Invalid GA4 Measurement ID format. It should start with 'G-'"
                )
        
        # Validate GTM ID format if provided
        if settings.gtm_container_id:
            if not settings.gtm_container_id.startswith("GTM-"):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid GTM Container ID format. It should start with 'GTM-'"
                )
        
        update_data = {
            "type": "ga4",
            "ga4_measurement_id": settings.ga4_measurement_id,
            "ga4_enabled": settings.ga4_enabled,
            "gtm_container_id": settings.gtm_container_id,
            "gtm_enabled": settings.gtm_enabled,
            "track_page_views": settings.track_page_views,
            "track_user_engagement": settings.track_user_engagement,
            "track_blog_reads": settings.track_blog_reads,
            "track_listing_views": settings.track_listing_views,
            "track_conversions": settings.track_conversions,
            "anonymize_ip": settings.anonymize_ip,
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.analytics_settings.update_one(
            {"type": "ga4"},
            {"$set": update_data},
            upsert=True
        )
        
        return {
            "success": True,
            "message": "Analytics settings updated",
            "settings": {
                **update_data,
                "setup_complete": bool(settings.ga4_measurement_id)
            }
        }

    @router.get("/tracking-code")
    async def get_tracking_code(admin=Depends(require_admin)):
        """Get the GA4 tracking code snippet for website integration"""
        settings = await db.analytics_settings.find_one({"type": "ga4"})
        
        if not settings or not settings.get("ga4_measurement_id"):
            return {
                "tracking_code": None,
                "message": "Please configure your GA4 Measurement ID first"
            }
        
        ga_id = settings.get("ga4_measurement_id")
        anonymize = "true" if settings.get("anonymize_ip", True) else "false"
        
        tracking_code = f'''<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id={ga_id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
  gtag('config', '{ga_id}', {{
    'anonymize_ip': {anonymize},
    'send_page_view': {'true' if settings.get('track_page_views', True) else 'false'}
  }});
</script>
<!-- End Google Analytics 4 -->'''

        gtm_code = None
        if settings.get("gtm_container_id") and settings.get("gtm_enabled"):
            gtm_id = settings.get("gtm_container_id")
            gtm_code = f'''<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){{w[l]=w[l]||[];w[l].push({{'gtm.start':
new Date().getTime(),event:'gtm.js'}});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
}})(window,document,'script','dataLayer','{gtm_id}');</script>
<!-- End Google Tag Manager -->'''
        
        return {
            "ga4_tracking_code": tracking_code if settings.get("ga4_enabled") else None,
            "gtm_tracking_code": gtm_code,
            "measurement_id": ga_id,
            "is_enabled": settings.get("ga4_enabled", False)
        }

    @router.post("/test-connection")
    async def test_ga_connection(admin=Depends(require_admin)):
        """Test if GA4 is properly configured (simulated)"""
        settings = await db.analytics_settings.find_one({"type": "ga4"})
        
        if not settings or not settings.get("ga4_measurement_id"):
            return {
                "status": "not_configured",
                "message": "GA4 Measurement ID not configured"
            }
        
        # In a real implementation, you would make an API call to GA4
        # For now, we'll return a simulated response
        return {
            "status": "configured",
            "measurement_id": settings.get("ga4_measurement_id"),
            "message": "GA4 appears to be configured. Install the tracking code on your website to start collecting data.",
            "next_steps": [
                "Add the tracking code to your website's <head> section",
                "Visit your website to generate test traffic",
                "Check Google Analytics Real-Time reports to verify data collection"
            ]
        }

    # ==================== ANALYTICS DATA ENDPOINTS ====================
    
    @router.get("/traffic-overview")
    async def get_traffic_overview(
        days: int = Query(30, ge=7, le=90),
        admin=Depends(require_admin)
    ):
        """Get traffic overview data (demo mode or real GA4 data)"""
        settings = await db.analytics_settings.find_one({"type": "ga4"})
        
        # Always return demo data for now (can integrate real GA4 API later)
        # In production, you would check if GA4 API credentials are available
        # and fetch real data from Google Analytics Data API
        
        if settings and settings.get("ga4_enabled") and settings.get("ga4_measurement_id"):
            # TODO: Implement real GA4 Data API integration when credentials provided
            # For now, show enhanced demo data
            pass
        
        traffic_data = generate_demo_traffic_data(days)
        traffic_data["ga4_configured"] = bool(settings and settings.get("ga4_measurement_id"))
        traffic_data["ga4_enabled"] = bool(settings and settings.get("ga4_enabled"))
        
        return traffic_data

    @router.get("/traffic-sources")
    async def get_traffic_sources(admin=Depends(require_admin)):
        """Get traffic sources breakdown"""
        settings = await db.analytics_settings.find_one({"type": "ga4"})
        
        sources = generate_demo_traffic_sources()
        
        return {
            "sources": sources,
            "total_sessions": sum(s["sessions"] for s in sources),
            "ga4_configured": bool(settings and settings.get("ga4_measurement_id")),
            "is_demo_data": True
        }

    @router.get("/page-performance")
    async def get_page_performance(admin=Depends(require_admin)):
        """Get top performing pages"""
        settings = await db.analytics_settings.find_one({"type": "ga4"})
        
        pages = generate_demo_page_performance()
        
        return {
            "pages": pages,
            "total_pageviews": sum(p["views"] for p in pages),
            "ga4_configured": bool(settings and settings.get("ga4_measurement_id")),
            "is_demo_data": True
        }

    @router.get("/geo-data")
    async def get_geo_data(admin=Depends(require_admin)):
        """Get geographic distribution of users"""
        settings = await db.analytics_settings.find_one({"type": "ga4"})
        
        geo = generate_demo_geo_data()
        
        return {
            "countries": geo,
            "total_users": sum(g["users"] for g in geo),
            "target_markets": ["TZ", "KE", "DE", "UG", "NG", "ZA"],
            "ga4_configured": bool(settings and settings.get("ga4_measurement_id")),
            "is_demo_data": True
        }

    @router.get("/ai-citations")
    async def get_ai_citations(admin=Depends(require_admin)):
        """Get AI/LLM citation tracking data (Answer Engine Optimization metrics)"""
        settings = await db.analytics_settings.find_one({"type": "ga4"})
        
        citations = generate_demo_ai_citations()
        citations["ga4_configured"] = bool(settings and settings.get("ga4_measurement_id"))
        
        return citations

    @router.get("/realtime")
    async def get_realtime_data(admin=Depends(require_admin)):
        """Get real-time analytics data (simulated)"""
        # Simulate real-time data
        active_users = random.randint(5, 35)
        
        pages_being_viewed = [
            {"page": "/", "users": random.randint(1, 8)},
            {"page": "/listings", "users": random.randint(0, 5)},
            {"page": "/blog", "users": random.randint(0, 4)},
            {"page": "/listings/vehicles", "users": random.randint(0, 3)},
        ]
        pages_being_viewed = [p for p in pages_being_viewed if p["users"] > 0]
        
        traffic_sources = [
            {"source": "Google", "users": random.randint(1, 10)},
            {"source": "Direct", "users": random.randint(1, 8)},
            {"source": "Social", "users": random.randint(0, 5)},
        ]
        traffic_sources = [t for t in traffic_sources if t["users"] > 0]
        
        return {
            "active_users": active_users,
            "pages_being_viewed": pages_being_viewed,
            "traffic_sources": traffic_sources,
            "pageviews_last_30_min": random.randint(15, 80),
            "events_last_30_min": random.randint(25, 120),
            "is_demo_data": True,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }

    @router.get("/dashboard-summary")
    async def get_dashboard_summary(admin=Depends(require_admin)):
        """Get comprehensive analytics dashboard summary"""
        settings = await db.analytics_settings.find_one({"type": "ga4"})
        
        traffic = generate_demo_traffic_data(30)
        sources = generate_demo_traffic_sources()
        pages = generate_demo_page_performance()
        geo = generate_demo_geo_data()
        ai = generate_demo_ai_citations()
        
        # Calculate top metrics
        organic_traffic = next((s for s in sources if s["source"] == "google" and s["medium"] == "organic"), None)
        
        return {
            "overview": traffic["summary"],
            "top_sources": sources[:5],
            "top_pages": pages[:5],
            "top_countries": geo[:5],
            "ai_traffic": {
                "total": ai["total_ai_traffic"],
                "growth": ai["ai_traffic_growth"],
                "aeo_score": ai["aeo_score"]
            },
            "organic_search": {
                "sessions": organic_traffic["sessions"] if organic_traffic else 0,
                "percentage": round((organic_traffic["sessions"] / sum(s["sessions"] for s in sources) * 100), 1) if organic_traffic else 0
            },
            "ga4_configured": bool(settings and settings.get("ga4_measurement_id")),
            "ga4_enabled": bool(settings and settings.get("ga4_enabled")),
            "is_demo_data": True,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }

    return router
