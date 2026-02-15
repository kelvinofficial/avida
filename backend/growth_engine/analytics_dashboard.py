"""
Growth & Visibility Analytics Dashboard
Tracks SEO performance, keyword rankings, content metrics, and AI citations
"""

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
import jwt as pyjwt

logger = logging.getLogger(__name__)

ADMIN_JWT_SECRET = os.environ.get("ADMIN_JWT_SECRET_KEY", "admin-super-secret-key-change-in-production-2024")
ADMIN_JWT_ALGORITHM = "HS256"


class KeywordRanking(BaseModel):
    """Keyword ranking data"""
    keyword: str
    position: int
    change: int = 0  # Position change from last check
    country: str
    search_volume: Optional[int] = None
    last_updated: datetime


class TrafficMetric(BaseModel):
    """Traffic metric"""
    date: str
    organic_visits: int
    direct_visits: int
    referral_visits: int
    social_visits: int
    bounce_rate: float
    avg_session_duration: float


class ContentPerformance(BaseModel):
    """Content performance metrics"""
    content_id: str
    content_type: str  # blog, listing, category
    title: str
    views: int
    clicks: int
    ctr: float
    avg_time_on_page: float
    conversions: int


def create_growth_analytics_router(db, get_current_user):
    """Create Growth Analytics Dashboard router"""
    router = APIRouter(prefix="/growth/analytics", tags=["Growth Analytics"])
    
    # Collections
    keyword_rankings_collection = db.keyword_rankings
    traffic_metrics_collection = db.traffic_metrics
    content_performance_collection = db.content_performance
    ai_citations_collection = db.ai_citations
    seo_audit_collection = db.seo_audit
    backlinks_collection = db.backlinks
    admin_users_collection = db.admin_users
    listings_collection = db.listings
    blog_posts_collection = db.blog_posts
    
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
    
    # ============ DASHBOARD OVERVIEW ============
    
    @router.get("/dashboard")
    async def get_growth_dashboard(admin=Depends(require_admin)):
        """Get comprehensive growth dashboard data"""
        
        # Content stats
        total_blog_posts = await blog_posts_collection.count_documents({})
        published_posts = await blog_posts_collection.count_documents({"status": "published"})
        total_listings = await listings_collection.count_documents({"status": "active"})
        
        # Get recent traffic (simulated for now)
        recent_traffic = {
            "total_visits": 15420,
            "organic_visits": 8250,
            "organic_percentage": 53.5,
            "change_from_last_week": 12.3
        }
        
        # Top performing content
        top_content = await blog_posts_collection.find(
            {"status": "published"},
            {"id": 1, "title": 1, "views": 1, "slug": 1}
        ).sort("views", -1).limit(5).to_list(5)
        
        # Keyword rankings summary
        rankings = await keyword_rankings_collection.find({}, {"_id": 0}).sort("position", 1).limit(10).to_list(10)
        
        # AI citations (track mentions by AI assistants)
        ai_citations_count = await ai_citations_collection.count_documents({})
        
        return {
            "overview": {
                "total_blog_posts": total_blog_posts,
                "published_posts": published_posts,
                "total_active_listings": total_listings,
                "ai_citations": ai_citations_count
            },
            "traffic": recent_traffic,
            "top_content": top_content,
            "top_keywords": rankings,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    # ============ KEYWORD RANKINGS ============
    
    @router.get("/keywords")
    async def get_keyword_rankings(
        country: Optional[str] = None,
        limit: int = 50,
        admin=Depends(require_admin)
    ):
        """Get keyword rankings"""
        query = {}
        if country:
            query["country"] = country.upper()
        
        cursor = keyword_rankings_collection.find(query, {"_id": 0}).sort("position", 1).limit(limit)
        rankings = await cursor.to_list(limit)
        
        return {"rankings": rankings}
    
    @router.post("/keywords/track")
    async def track_keyword_ranking(
        keyword: str,
        position: int,
        country: str,
        search_volume: Optional[int] = None,
        admin=Depends(require_admin)
    ):
        """Track or update keyword ranking"""
        existing = await keyword_rankings_collection.find_one({
            "keyword": keyword.lower(),
            "country": country.upper()
        })
        
        change = 0
        if existing:
            change = existing.get("position", position) - position  # Positive = improved
        
        ranking = {
            "keyword": keyword.lower(),
            "position": position,
            "change": change,
            "country": country.upper(),
            "search_volume": search_volume,
            "last_updated": datetime.now(timezone.utc)
        }
        
        await keyword_rankings_collection.update_one(
            {"keyword": keyword.lower(), "country": country.upper()},
            {"$set": ranking},
            upsert=True
        )
        
        return {"success": True, "ranking": ranking}
    
    @router.get("/keywords/heatmap")
    async def get_keyword_heatmap(admin=Depends(require_admin)):
        """Get keyword performance heatmap by country"""
        pipeline = [
            {"$group": {
                "_id": "$country",
                "keywords": {"$push": {"keyword": "$keyword", "position": "$position"}},
                "avg_position": {"$avg": "$position"},
                "count": {"$sum": 1}
            }}
        ]
        
        results = await keyword_rankings_collection.aggregate(pipeline).to_list(10)
        
        heatmap = {}
        for result in results:
            country = result["_id"]
            heatmap[country] = {
                "keywords": result["keywords"][:10],
                "avg_position": round(result["avg_position"], 1),
                "total_tracked": result["count"]
            }
        
        return {"heatmap": heatmap}
    
    # ============ TRAFFIC ANALYTICS ============
    
    @router.get("/traffic")
    async def get_traffic_analytics(
        days: int = 30,
        admin=Depends(require_admin)
    ):
        """Get traffic analytics for the specified period"""
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        cursor = traffic_metrics_collection.find(
            {"date": {"$gte": start_date.isoformat()[:10]}},
            {"_id": 0}
        ).sort("date", 1)
        
        metrics = await cursor.to_list(days)
        
        # Calculate totals
        total_organic = sum(m.get("organic_visits", 0) for m in metrics)
        total_visits = sum(
            m.get("organic_visits", 0) + m.get("direct_visits", 0) + 
            m.get("referral_visits", 0) + m.get("social_visits", 0) 
            for m in metrics
        )
        
        return {
            "period_days": days,
            "total_visits": total_visits,
            "total_organic": total_organic,
            "organic_percentage": round(total_organic / total_visits * 100, 1) if total_visits > 0 else 0,
            "daily_metrics": metrics
        }
    
    @router.post("/traffic/record")
    async def record_traffic_metrics(
        metrics: Dict[str, Any],
        admin=Depends(require_admin)
    ):
        """Record daily traffic metrics"""
        date = metrics.get("date", datetime.now(timezone.utc).isoformat()[:10])
        
        traffic_data = {
            "date": date,
            "organic_visits": metrics.get("organic_visits", 0),
            "direct_visits": metrics.get("direct_visits", 0),
            "referral_visits": metrics.get("referral_visits", 0),
            "social_visits": metrics.get("social_visits", 0),
            "bounce_rate": metrics.get("bounce_rate", 0),
            "avg_session_duration": metrics.get("avg_session_duration", 0),
            "recorded_at": datetime.now(timezone.utc)
        }
        
        await traffic_metrics_collection.update_one(
            {"date": date},
            {"$set": traffic_data},
            upsert=True
        )
        
        return {"success": True, "metrics": traffic_data}
    
    # ============ CONTENT PERFORMANCE ============
    
    @router.get("/content-performance")
    async def get_content_performance(
        content_type: Optional[str] = None,
        limit: int = 20,
        admin=Depends(require_admin)
    ):
        """Get content performance metrics"""
        query = {}
        if content_type:
            query["content_type"] = content_type
        
        cursor = content_performance_collection.find(query, {"_id": 0}).sort("views", -1).limit(limit)
        performance = await cursor.to_list(limit)
        
        return {"content": performance}
    
    @router.post("/content-performance/track")
    async def track_content_performance(
        content_id: str,
        content_type: str,
        title: str,
        metrics: Dict[str, Any],
        admin=Depends(require_admin)
    ):
        """Track content performance"""
        perf_data = {
            "content_id": content_id,
            "content_type": content_type,
            "title": title,
            "views": metrics.get("views", 0),
            "clicks": metrics.get("clicks", 0),
            "ctr": metrics.get("ctr", 0),
            "avg_time_on_page": metrics.get("avg_time_on_page", 0),
            "conversions": metrics.get("conversions", 0),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await content_performance_collection.update_one(
            {"content_id": content_id},
            {"$set": perf_data},
            upsert=True
        )
        
        return {"success": True, "performance": perf_data}
    
    # ============ AI CITATION TRACKING ============
    
    @router.get("/ai-citations")
    async def get_ai_citations(
        source: Optional[str] = None,
        limit: int = 50,
        admin=Depends(require_admin)
    ):
        """Get AI citation mentions (ChatGPT, Gemini, Claude, Perplexity)"""
        query = {}
        if source:
            query["source"] = source
        
        cursor = ai_citations_collection.find(query, {"_id": 0}).sort("detected_at", -1).limit(limit)
        citations = await cursor.to_list(limit)
        
        # Get counts by source
        pipeline = [
            {"$group": {"_id": "$source", "count": {"$sum": 1}}}
        ]
        by_source = await ai_citations_collection.aggregate(pipeline).to_list(10)
        
        return {
            "citations": citations,
            "by_source": {item["_id"]: item["count"] for item in by_source},
            "total": await ai_citations_collection.count_documents({})
        }
    
    @router.post("/ai-citations/log")
    async def log_ai_citation(
        source: str,  # chatgpt, gemini, claude, perplexity
        query: str,
        context: str,
        url: Optional[str] = None,
        admin=Depends(require_admin)
    ):
        """Log an AI citation detection"""
        citation = {
            "source": source.lower(),
            "query": query,
            "context": context,
            "url": url,
            "detected_at": datetime.now(timezone.utc)
        }
        
        await ai_citations_collection.insert_one(citation)
        return {"success": True, "citation": citation}
    
    # ============ BACKLINK TRACKING ============
    
    @router.get("/backlinks")
    async def get_backlinks(
        status: Optional[str] = None,
        limit: int = 50,
        admin=Depends(require_admin)
    ):
        """Get tracked backlinks"""
        query = {}
        if status:
            query["status"] = status
        
        cursor = backlinks_collection.find(query, {"_id": 0}).sort("domain_authority", -1).limit(limit)
        backlinks = await cursor.to_list(limit)
        
        # Get summary
        total = await backlinks_collection.count_documents({})
        active = await backlinks_collection.count_documents({"status": "active"})
        broken = await backlinks_collection.count_documents({"status": "broken"})
        
        return {
            "backlinks": backlinks,
            "summary": {
                "total": total,
                "active": active,
                "broken": broken
            }
        }
    
    @router.post("/backlinks/track")
    async def track_backlink(
        url: str,
        source_domain: str,
        anchor_text: str,
        domain_authority: int = 0,
        admin=Depends(require_admin)
    ):
        """Track a new backlink"""
        backlink = {
            "url": url,
            "source_domain": source_domain,
            "anchor_text": anchor_text,
            "domain_authority": domain_authority,
            "status": "active",
            "first_seen": datetime.now(timezone.utc),
            "last_checked": datetime.now(timezone.utc)
        }
        
        await backlinks_collection.update_one(
            {"url": url},
            {"$set": backlink},
            upsert=True
        )
        
        return {"success": True, "backlink": backlink}
    
    # ============ SEO AUDIT ============
    
    @router.get("/seo-audit")
    async def get_latest_seo_audit(admin=Depends(require_admin)):
        """Get the latest SEO audit results"""
        audit = await seo_audit_collection.find_one(
            {},
            {"_id": 0},
            sort=[("created_at", -1)]
        )
        
        if not audit:
            # Return default audit structure
            audit = {
                "score": 0,
                "issues": [],
                "recommendations": [],
                "message": "No audit has been run yet"
            }
        
        return audit
    
    @router.post("/seo-audit/run")
    async def run_seo_audit(admin=Depends(require_admin)):
        """Run a comprehensive SEO audit"""
        issues = []
        recommendations = []
        score = 100
        
        # Check listings with missing SEO data
        listings_no_seo = await listings_collection.count_documents({
            "$or": [{"seo_data": {"$exists": False}}, {"seo_data": None}]
        })
        if listings_no_seo > 0:
            issues.append({
                "type": "missing_seo",
                "severity": "medium",
                "count": listings_no_seo,
                "message": f"{listings_no_seo} listings missing SEO data"
            })
            score -= min(20, listings_no_seo // 10)
        
        # Check blog posts
        unpublished_posts = await blog_posts_collection.count_documents({"status": "draft"})
        if unpublished_posts > 5:
            issues.append({
                "type": "unpublished_content",
                "severity": "low",
                "count": unpublished_posts,
                "message": f"{unpublished_posts} blog posts in draft status"
            })
        
        # Check for broken backlinks
        broken_backlinks = await backlinks_collection.count_documents({"status": "broken"})
        if broken_backlinks > 0:
            issues.append({
                "type": "broken_backlinks",
                "severity": "high",
                "count": broken_backlinks,
                "message": f"{broken_backlinks} broken backlinks detected"
            })
            score -= min(15, broken_backlinks * 3)
        
        # Generate recommendations
        if listings_no_seo > 0:
            recommendations.append({
                "priority": "high",
                "action": "Generate SEO data for listings",
                "impact": "Improve search visibility for listings"
            })
        
        recommendations.append({
            "priority": "medium",
            "action": "Create more country-specific content",
            "impact": "Improve rankings in target markets"
        })
        
        recommendations.append({
            "priority": "medium",
            "action": "Build more backlinks from authority sites",
            "impact": "Increase domain authority"
        })
        
        audit_result = {
            "score": max(0, score),
            "grade": "A" if score >= 90 else "B" if score >= 80 else "C" if score >= 70 else "D" if score >= 60 else "F",
            "issues": issues,
            "recommendations": recommendations,
            "summary": {
                "total_issues": len(issues),
                "high_priority": len([i for i in issues if i["severity"] == "high"]),
                "medium_priority": len([i for i in issues if i["severity"] == "medium"]),
                "low_priority": len([i for i in issues if i["severity"] == "low"])
            },
            "created_at": datetime.now(timezone.utc)
        }
        
        await seo_audit_collection.insert_one(audit_result)
        
        return audit_result
    
    # ============ GROWTH TARGETS ============
    
    @router.get("/targets")
    async def get_growth_targets(admin=Depends(require_admin)):
        """Get 6-month growth targets and progress"""
        targets = {
            "keyword_targets": [
                {"keyword": "Buy and sell Germany", "target_position": 3, "current_position": None},
                {"keyword": "Marketplace Tanzania", "target_position": 3, "current_position": None},
                {"keyword": "Safe online marketplace Africa", "target_position": 3, "current_position": None},
                {"keyword": "Used cars Dar es Salaam", "target_position": 3, "current_position": None}
            ],
            "traffic_target": {
                "organic_increase_percentage": 300,
                "current_organic_visits": 0,
                "target_organic_visits": 0
            },
            "ai_citation_target": {
                "goal": "Be cited by AI engines as trusted marketplace",
                "current_citations": await ai_citations_collection.count_documents({}),
                "target_citations": 50
            },
            "content_target": {
                "posts_per_week": 5,
                "current_published": await blog_posts_collection.count_documents({"status": "published"}),
                "target_total": 120  # 5 posts/week * 24 weeks
            }
        }
        
        # Get current positions for target keywords
        for target in targets["keyword_targets"]:
            ranking = await keyword_rankings_collection.find_one(
                {"keyword": target["keyword"].lower()},
                {"position": 1}
            )
            if ranking:
                target["current_position"] = ranking.get("position")
        
        return targets
    
    return router
