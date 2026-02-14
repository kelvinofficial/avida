"""
SEO Performance Analytics Routes
Tracks impressions, clicks, CTR, position tracking, keyword performance, and competitor analysis
"""

from fastapi import APIRouter, HTTPException, Query, Depends, Request
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid
import logging
from collections import defaultdict

logger = logging.getLogger("seo_analytics")


# =============================================================================
# MODELS
# =============================================================================

class SEOEventType(str, Enum):
    IMPRESSION = "impression"  # Listing appeared in search results
    CLICK = "click"  # User clicked on listing from search
    SHARE = "share"  # Social share
    EXTERNAL_CLICK = "external_click"  # Click from external source (Google, social)


class TrackSEOEventRequest(BaseModel):
    """Track an SEO event"""
    listing_id: str
    event_type: SEOEventType
    source: Optional[str] = None  # google, bing, social, direct, internal
    keyword: Optional[str] = None  # Search keyword that led to this
    position: Optional[int] = None  # Position in search results
    referrer: Optional[str] = None  # Referrer URL
    device_type: Optional[str] = None  # mobile, desktop, tablet
    country_code: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class KeywordPerformance(BaseModel):
    """Keyword performance data"""
    keyword: str
    impressions: int = 0
    clicks: int = 0
    ctr: float = 0.0
    avg_position: float = 0.0
    trend: str = "stable"  # up, down, stable


class ListingSEOMetrics(BaseModel):
    """SEO metrics for a single listing"""
    listing_id: str
    title: str
    total_impressions: int = 0
    total_clicks: int = 0
    ctr: float = 0.0
    avg_position: float = 0.0
    external_impressions: int = 0
    external_clicks: int = 0
    social_shares: int = 0
    top_keywords: List[KeywordPerformance] = []
    top_sources: Dict[str, int] = {}
    daily_trend: List[Dict[str, Any]] = []


class CompetitorInsight(BaseModel):
    """Competitor analysis data"""
    category: str
    my_avg_ctr: float
    category_avg_ctr: float
    my_avg_position: float
    category_avg_position: float
    top_performing_keywords: List[str]
    improvement_suggestions: List[str]


# =============================================================================
# SEO ANALYTICS SYSTEM
# =============================================================================

class SEOAnalyticsSystem:
    def __init__(self, db):
        self.db = db
    
    async def track_event(
        self,
        listing_id: str,
        event_type: SEOEventType,
        source: Optional[str] = None,
        keyword: Optional[str] = None,
        position: Optional[int] = None,
        referrer: Optional[str] = None,
        device_type: Optional[str] = None,
        country_code: Optional[str] = None,
        viewer_id: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> dict:
        """Track an SEO event"""
        
        # Get listing to verify it exists and get seller_id
        listing = await self.db.listings.find_one({"id": listing_id})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        event = {
            "id": f"seo_{uuid.uuid4().hex[:12]}",
            "listing_id": listing_id,
            "seller_id": listing.get("user_id"),
            "category_id": listing.get("category"),
            "event_type": event_type.value,
            "source": source or "direct",
            "keyword": keyword,
            "position": position,
            "referrer": referrer,
            "device_type": device_type or "unknown",
            "country_code": country_code,
            "viewer_id": viewer_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metadata": metadata or {}
        }
        
        await self.db.seo_events.insert_one(event)
        
        # Update listing's SEO stats
        update_field = f"seo_stats.{event_type.value}s"
        await self.db.listings.update_one(
            {"id": listing_id},
            {
                "$inc": {update_field: 1},
                "$set": {"seo_stats.last_updated": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        return {"tracked": True, "event_id": event["id"]}
    
    async def get_listing_seo_metrics(
        self,
        listing_id: str,
        days: int = 30
    ) -> dict:
        """Get SEO metrics for a specific listing"""
        
        listing = await self.db.listings.find_one({"id": listing_id}, {"_id": 0})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Get all events for this listing
        events = await self.db.seo_events.find({
            "listing_id": listing_id,
            "timestamp": {"$gte": start_date.isoformat()}
        }).to_list(10000)
        
        # Aggregate metrics
        impressions = 0
        clicks = 0
        external_impressions = 0
        external_clicks = 0
        social_shares = 0
        positions = []
        keywords = defaultdict(lambda: {"impressions": 0, "clicks": 0, "positions": []})
        sources = defaultdict(int)
        daily_data = defaultdict(lambda: {"impressions": 0, "clicks": 0})
        
        for event in events:
            event_type = event.get("event_type")
            source = event.get("source", "direct")
            keyword = event.get("keyword")
            position = event.get("position")
            date_key = event.get("timestamp", "")[:10]
            
            if event_type == "impression":
                impressions += 1
                daily_data[date_key]["impressions"] += 1
                if source in ["google", "bing", "yahoo", "external"]:
                    external_impressions += 1
                if position:
                    positions.append(position)
                if keyword:
                    keywords[keyword]["impressions"] += 1
                    if position:
                        keywords[keyword]["positions"].append(position)
            
            elif event_type == "click":
                clicks += 1
                daily_data[date_key]["clicks"] += 1
                sources[source] += 1
                if source in ["google", "bing", "yahoo", "external"]:
                    external_clicks += 1
                if keyword:
                    keywords[keyword]["clicks"] += 1
            
            elif event_type == "share":
                social_shares += 1
        
        # Calculate CTR
        ctr = (clicks / impressions * 100) if impressions > 0 else 0
        avg_position = sum(positions) / len(positions) if positions else 0
        
        # Calculate keyword performance
        top_keywords = []
        for kw, data in sorted(keywords.items(), key=lambda x: x[1]["impressions"], reverse=True)[:10]:
            kw_ctr = (data["clicks"] / data["impressions"] * 100) if data["impressions"] > 0 else 0
            kw_pos = sum(data["positions"]) / len(data["positions"]) if data["positions"] else 0
            top_keywords.append({
                "keyword": kw,
                "impressions": data["impressions"],
                "clicks": data["clicks"],
                "ctr": round(kw_ctr, 2),
                "avg_position": round(kw_pos, 1)
            })
        
        # Build daily trend
        daily_trend = []
        for date_str in sorted(daily_data.keys())[-days:]:
            day_data = daily_data[date_str]
            day_ctr = (day_data["clicks"] / day_data["impressions"] * 100) if day_data["impressions"] > 0 else 0
            daily_trend.append({
                "date": date_str,
                "impressions": day_data["impressions"],
                "clicks": day_data["clicks"],
                "ctr": round(day_ctr, 2)
            })
        
        return {
            "listing_id": listing_id,
            "title": listing.get("title", "Unknown"),
            "period_days": days,
            "total_impressions": impressions,
            "total_clicks": clicks,
            "ctr": round(ctr, 2),
            "avg_position": round(avg_position, 1),
            "external_impressions": external_impressions,
            "external_clicks": external_clicks,
            "social_shares": social_shares,
            "top_keywords": top_keywords,
            "top_sources": dict(sources),
            "daily_trend": daily_trend
        }
    
    async def get_seller_seo_overview(
        self,
        seller_id: str,
        days: int = 30
    ) -> dict:
        """Get SEO overview for all seller's listings"""
        
        # Get seller's listings
        listings = await self.db.listings.find(
            {"user_id": seller_id},
            {"id": 1, "title": 1, "category": 1, "_id": 0}
        ).to_list(1000)
        
        if not listings:
            return {
                "seller_id": seller_id,
                "period_days": days,
                "total_listings": 0,
                "total_impressions": 0,
                "total_clicks": 0,
                "overall_ctr": 0,
                "top_performing": [],
                "needs_attention": [],
                "keyword_performance": []
            }
        
        listing_ids = [l["id"] for l in listings]
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Aggregate events by listing
        pipeline = [
            {
                "$match": {
                    "listing_id": {"$in": listing_ids},
                    "timestamp": {"$gte": start_date.isoformat()}
                }
            },
            {
                "$group": {
                    "_id": "$listing_id",
                    "impressions": {"$sum": {"$cond": [{"$eq": ["$event_type", "impression"]}, 1, 0]}},
                    "clicks": {"$sum": {"$cond": [{"$eq": ["$event_type", "click"]}, 1, 0]}},
                    "shares": {"$sum": {"$cond": [{"$eq": ["$event_type", "share"]}, 1, 0]}}
                }
            }
        ]
        
        results = await self.db.seo_events.aggregate(pipeline).to_list(1000)
        
        # Build metrics map
        metrics_map = {r["_id"]: r for r in results}
        
        total_impressions = sum(r["impressions"] for r in results)
        total_clicks = sum(r["clicks"] for r in results)
        overall_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
        
        # Identify top performing and needs attention
        listing_metrics = []
        for listing in listings:
            lid = listing["id"]
            m = metrics_map.get(lid, {"impressions": 0, "clicks": 0, "shares": 0})
            ctr = (m["clicks"] / m["impressions"] * 100) if m["impressions"] > 0 else 0
            listing_metrics.append({
                "listing_id": lid,
                "title": listing.get("title", "Unknown"),
                "category": listing.get("category"),
                "impressions": m["impressions"],
                "clicks": m["clicks"],
                "ctr": round(ctr, 2)
            })
        
        # Sort by CTR for top performing
        top_performing = sorted(
            [l for l in listing_metrics if l["impressions"] >= 10],
            key=lambda x: x["ctr"],
            reverse=True
        )[:5]
        
        # Needs attention: high impressions, low CTR
        needs_attention = sorted(
            [l for l in listing_metrics if l["impressions"] >= 20 and l["ctr"] < 2],
            key=lambda x: x["impressions"],
            reverse=True
        )[:5]
        
        # Get top keywords across all listings
        kw_pipeline = [
            {
                "$match": {
                    "listing_id": {"$in": listing_ids},
                    "timestamp": {"$gte": start_date.isoformat()},
                    "keyword": {"$ne": None}
                }
            },
            {
                "$group": {
                    "_id": "$keyword",
                    "impressions": {"$sum": {"$cond": [{"$eq": ["$event_type", "impression"]}, 1, 0]}},
                    "clicks": {"$sum": {"$cond": [{"$eq": ["$event_type", "click"]}, 1, 0]}}
                }
            },
            {"$sort": {"impressions": -1}},
            {"$limit": 20}
        ]
        
        keyword_results = await self.db.seo_events.aggregate(kw_pipeline).to_list(20)
        keyword_performance = []
        for kw in keyword_results:
            kw_ctr = (kw["clicks"] / kw["impressions"] * 100) if kw["impressions"] > 0 else 0
            keyword_performance.append({
                "keyword": kw["_id"],
                "impressions": kw["impressions"],
                "clicks": kw["clicks"],
                "ctr": round(kw_ctr, 2)
            })
        
        return {
            "seller_id": seller_id,
            "period_days": days,
            "total_listings": len(listings),
            "total_impressions": total_impressions,
            "total_clicks": total_clicks,
            "overall_ctr": round(overall_ctr, 2),
            "top_performing": top_performing,
            "needs_attention": needs_attention,
            "keyword_performance": keyword_performance
        }
    
    async def get_competitor_analysis(
        self,
        seller_id: str,
        category_id: Optional[str] = None
    ) -> dict:
        """Get competitor analysis comparing seller to category averages"""
        
        # Get seller's listings in the category
        query = {"user_id": seller_id}
        if category_id:
            query["category"] = category_id
        
        seller_listings = await self.db.listings.find(query, {"id": 1}).to_list(100)
        seller_listing_ids = [l["id"] for l in seller_listings]
        
        if not seller_listing_ids:
            return {
                "category": category_id,
                "message": "No listings found in this category"
            }
        
        days = 30
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Get seller's SEO metrics
        seller_pipeline = [
            {
                "$match": {
                    "listing_id": {"$in": seller_listing_ids},
                    "timestamp": {"$gte": start_date.isoformat()}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "impressions": {"$sum": {"$cond": [{"$eq": ["$event_type", "impression"]}, 1, 0]}},
                    "clicks": {"$sum": {"$cond": [{"$eq": ["$event_type", "click"]}, 1, 0]}},
                    "positions": {"$push": {"$cond": [{"$ne": ["$position", None]}, "$position", "$$REMOVE"]}}
                }
            }
        ]
        
        seller_results = await self.db.seo_events.aggregate(seller_pipeline).to_list(1)
        seller_data = seller_results[0] if seller_results else {"impressions": 0, "clicks": 0, "positions": []}
        
        my_ctr = (seller_data["clicks"] / seller_data["impressions"] * 100) if seller_data["impressions"] > 0 else 0
        my_avg_position = sum(seller_data["positions"]) / len(seller_data["positions"]) if seller_data["positions"] else 0
        
        # Get category averages
        category_query = {"category_id": category_id} if category_id else {}
        category_query["timestamp"] = {"$gte": start_date.isoformat()}
        
        cat_pipeline = [
            {"$match": category_query},
            {
                "$group": {
                    "_id": None,
                    "impressions": {"$sum": {"$cond": [{"$eq": ["$event_type", "impression"]}, 1, 0]}},
                    "clicks": {"$sum": {"$cond": [{"$eq": ["$event_type", "click"]}, 1, 0]}},
                    "positions": {"$push": {"$cond": [{"$ne": ["$position", None]}, "$position", "$$REMOVE"]}}
                }
            }
        ]
        
        cat_results = await self.db.seo_events.aggregate(cat_pipeline).to_list(1)
        cat_data = cat_results[0] if cat_results else {"impressions": 0, "clicks": 0, "positions": []}
        
        cat_ctr = (cat_data["clicks"] / cat_data["impressions"] * 100) if cat_data["impressions"] > 0 else 0
        cat_avg_position = sum(cat_data["positions"]) / len(cat_data["positions"]) if cat_data["positions"] else 0
        
        # Get top performing keywords in category
        kw_pipeline = [
            {
                "$match": {
                    **category_query,
                    "keyword": {"$ne": None}
                }
            },
            {
                "$group": {
                    "_id": "$keyword",
                    "clicks": {"$sum": {"$cond": [{"$eq": ["$event_type", "click"]}, 1, 0]}}
                }
            },
            {"$sort": {"clicks": -1}},
            {"$limit": 10}
        ]
        
        top_keywords = await self.db.seo_events.aggregate(kw_pipeline).to_list(10)
        
        # Generate improvement suggestions
        suggestions = []
        if my_ctr < cat_ctr:
            suggestions.append("Your click-through rate is below category average. Consider improving titles and descriptions.")
        if my_avg_position > cat_avg_position and my_avg_position > 0:
            suggestions.append("Your average search position is lower than competitors. Focus on SEO optimization.")
        if seller_data["impressions"] < 50:
            suggestions.append("Low impression count. Consider boosting listings or improving SEO keywords.")
        if not suggestions:
            suggestions.append("Great job! Your SEO performance is competitive.")
        
        return {
            "category": category_id,
            "period_days": days,
            "your_metrics": {
                "impressions": seller_data["impressions"],
                "clicks": seller_data["clicks"],
                "ctr": round(my_ctr, 2),
                "avg_position": round(my_avg_position, 1)
            },
            "category_averages": {
                "impressions": cat_data["impressions"],
                "clicks": cat_data["clicks"],
                "ctr": round(cat_ctr, 2),
                "avg_position": round(cat_avg_position, 1)
            },
            "ctr_comparison": round(my_ctr - cat_ctr, 2),
            "position_comparison": round(cat_avg_position - my_avg_position, 1),
            "top_category_keywords": [k["_id"] for k in top_keywords],
            "improvement_suggestions": suggestions
        }
    
    async def get_admin_seo_overview(self, days: int = 30) -> dict:
        """Get platform-wide SEO analytics for admin dashboard"""
        
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Overall stats
        total_impressions = await self.db.seo_events.count_documents({
            "event_type": "impression",
            "timestamp": {"$gte": start_date.isoformat()}
        })
        
        total_clicks = await self.db.seo_events.count_documents({
            "event_type": "click",
            "timestamp": {"$gte": start_date.isoformat()}
        })
        
        total_shares = await self.db.seo_events.count_documents({
            "event_type": "share",
            "timestamp": {"$gte": start_date.isoformat()}
        })
        
        overall_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
        
        # By source
        source_pipeline = [
            {
                "$match": {
                    "event_type": "click",
                    "timestamp": {"$gte": start_date.isoformat()}
                }
            },
            {"$group": {"_id": "$source", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        sources = await self.db.seo_events.aggregate(source_pipeline).to_list(20)
        
        # By category
        category_pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": start_date.isoformat()}
                }
            },
            {
                "$group": {
                    "_id": "$category_id",
                    "impressions": {"$sum": {"$cond": [{"$eq": ["$event_type", "impression"]}, 1, 0]}},
                    "clicks": {"$sum": {"$cond": [{"$eq": ["$event_type", "click"]}, 1, 0]}}
                }
            },
            {"$sort": {"impressions": -1}},
            {"$limit": 10}
        ]
        categories = await self.db.seo_events.aggregate(category_pipeline).to_list(10)
        
        category_stats = []
        for cat in categories:
            cat_ctr = (cat["clicks"] / cat["impressions"] * 100) if cat["impressions"] > 0 else 0
            category_stats.append({
                "category": cat["_id"],
                "impressions": cat["impressions"],
                "clicks": cat["clicks"],
                "ctr": round(cat_ctr, 2)
            })
        
        # Top keywords
        kw_pipeline = [
            {
                "$match": {
                    "keyword": {"$ne": None},
                    "timestamp": {"$gte": start_date.isoformat()}
                }
            },
            {
                "$group": {
                    "_id": "$keyword",
                    "impressions": {"$sum": {"$cond": [{"$eq": ["$event_type", "impression"]}, 1, 0]}},
                    "clicks": {"$sum": {"$cond": [{"$eq": ["$event_type", "click"]}, 1, 0]}}
                }
            },
            {"$sort": {"impressions": -1}},
            {"$limit": 20}
        ]
        keywords = await self.db.seo_events.aggregate(kw_pipeline).to_list(20)
        
        keyword_stats = []
        for kw in keywords:
            kw_ctr = (kw["clicks"] / kw["impressions"] * 100) if kw["impressions"] > 0 else 0
            keyword_stats.append({
                "keyword": kw["_id"],
                "impressions": kw["impressions"],
                "clicks": kw["clicks"],
                "ctr": round(kw_ctr, 2)
            })
        
        # Daily trend
        daily_pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": start_date.isoformat()}
                }
            },
            {
                "$group": {
                    "_id": {"$substr": ["$timestamp", 0, 10]},
                    "impressions": {"$sum": {"$cond": [{"$eq": ["$event_type", "impression"]}, 1, 0]}},
                    "clicks": {"$sum": {"$cond": [{"$eq": ["$event_type", "click"]}, 1, 0]}}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        daily = await self.db.seo_events.aggregate(daily_pipeline).to_list(days)
        
        daily_trend = []
        for d in daily:
            d_ctr = (d["clicks"] / d["impressions"] * 100) if d["impressions"] > 0 else 0
            daily_trend.append({
                "date": d["_id"],
                "impressions": d["impressions"],
                "clicks": d["clicks"],
                "ctr": round(d_ctr, 2)
            })
        
        # Top performing listings
        listing_pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": start_date.isoformat()}
                }
            },
            {
                "$group": {
                    "_id": "$listing_id",
                    "impressions": {"$sum": {"$cond": [{"$eq": ["$event_type", "impression"]}, 1, 0]}},
                    "clicks": {"$sum": {"$cond": [{"$eq": ["$event_type", "click"]}, 1, 0]}}
                }
            },
            {"$match": {"impressions": {"$gte": 10}}},
            {"$sort": {"clicks": -1}},
            {"$limit": 10}
        ]
        top_listings_raw = await self.db.seo_events.aggregate(listing_pipeline).to_list(10)
        
        top_listings = []
        for item in top_listings_raw:
            listing = await self.db.listings.find_one(
                {"id": item["_id"]},
                {"_id": 0, "id": 1, "title": 1, "price": 1, "category": 1}
            )
            if listing:
                l_ctr = (item["clicks"] / item["impressions"] * 100) if item["impressions"] > 0 else 0
                top_listings.append({
                    **listing,
                    "impressions": item["impressions"],
                    "clicks": item["clicks"],
                    "ctr": round(l_ctr, 2)
                })
        
        return {
            "period_days": days,
            "overview": {
                "total_impressions": total_impressions,
                "total_clicks": total_clicks,
                "total_shares": total_shares,
                "overall_ctr": round(overall_ctr, 2)
            },
            "by_source": [{"source": s["_id"] or "direct", "clicks": s["count"]} for s in sources],
            "by_category": category_stats,
            "top_keywords": keyword_stats,
            "daily_trend": daily_trend,
            "top_listings": top_listings
        }


# =============================================================================
# ROUTER FACTORY
# =============================================================================

def create_seo_analytics_router(db, get_current_user, get_current_admin):
    """Create SEO analytics router"""
    
    router = APIRouter(prefix="/seo-analytics", tags=["SEO Analytics"])
    analytics = SEOAnalyticsSystem(db)
    
    # =========================================================================
    # PUBLIC ENDPOINTS (for tracking)
    # =========================================================================
    
    @router.post("/track")
    async def track_seo_event(
        request: Request,
        data: TrackSEOEventRequest
    ):
        """Track an SEO event (impression, click, share)"""
        # Get viewer info from request
        viewer_id = None
        try:
            # Try to get user from auth header if present
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                # Could decode JWT here, but keeping it simple
                pass
        except:
            pass
        
        return await analytics.track_event(
            listing_id=data.listing_id,
            event_type=data.event_type,
            source=data.source,
            keyword=data.keyword,
            position=data.position,
            referrer=data.referrer,
            device_type=data.device_type,
            country_code=data.country_code,
            viewer_id=viewer_id,
            metadata=data.metadata
        )
    
    # =========================================================================
    # SELLER ENDPOINTS
    # =========================================================================
    
    @router.get("/listing/{listing_id}")
    async def get_listing_seo_metrics(
        listing_id: str,
        days: int = Query(30, ge=1, le=90),
        user = Depends(get_current_user)
    ):
        """Get SEO metrics for a specific listing"""
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Verify user owns the listing
        listing = await db.listings.find_one({"id": listing_id})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        if listing.get("user_id") != user.user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        return await analytics.get_listing_seo_metrics(listing_id, days)
    
    @router.get("/my-overview")
    async def get_my_seo_overview(
        days: int = Query(30, ge=1, le=90),
        user = Depends(get_current_user)
    ):
        """Get SEO overview for current seller's listings"""
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        return await analytics.get_seller_seo_overview(user.user_id, days)
    
    @router.get("/competitor-analysis")
    async def get_competitor_analysis(
        category_id: Optional[str] = None,
        user = Depends(get_current_user)
    ):
        """Get competitor analysis for seller"""
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        return await analytics.get_competitor_analysis(user.user_id, category_id)
    
    # =========================================================================
    # ADMIN ENDPOINTS
    # =========================================================================
    
    @router.get("/admin/overview")
    async def admin_get_seo_overview(
        days: int = Query(30, ge=1, le=90),
        admin = Depends(get_current_admin)
    ):
        """Get platform-wide SEO analytics (admin only)"""
        return await analytics.get_admin_seo_overview(days)
    
    @router.get("/admin/listing/{listing_id}")
    async def admin_get_listing_seo_metrics(
        listing_id: str,
        days: int = Query(30, ge=1, le=90),
        admin = Depends(get_current_admin)
    ):
        """Get SEO metrics for any listing (admin only)"""
        return await analytics.get_listing_seo_metrics(listing_id, days)
    
    @router.get("/admin/seller/{seller_id}")
    async def admin_get_seller_seo_overview(
        seller_id: str,
        days: int = Query(30, ge=1, le=90),
        admin = Depends(get_current_admin)
    ):
        """Get SEO overview for a specific seller (admin only)"""
        return await analytics.get_seller_seo_overview(seller_id, days)
    
    return router
