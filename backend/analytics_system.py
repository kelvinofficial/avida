"""
Seller Product Performance & Analytics System
Comprehensive analytics for marketplace listings and sellers
"""

from fastapi import APIRouter, HTTPException, Request, Query, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Callable
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid
import os
import logging
import asyncio
from collections import defaultdict

# AI Integration for insights
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    AI_AVAILABLE = True
except ImportError:
    AI_AVAILABLE = False
    logging.warning("Emergent LLM not available. AI insights disabled.")

logger = logging.getLogger("analytics_system")


# =============================================================================
# ENUMS
# =============================================================================

class AnalyticsAccessLevel(str, Enum):
    DISABLED = "disabled"           # Analytics disabled globally
    ALL_SELLERS = "all"             # All sellers have access
    VERIFIED_ONLY = "verified"      # Only verified sellers
    PREMIUM_ONLY = "premium"        # Only premium/subscription sellers
    MANUAL = "manual"               # Manual per-seller override


class AnalyticsLockType(str, Enum):
    NONE = "none"                   # No lock
    SUBSCRIPTION = "subscription"   # Requires subscription plan
    CREDITS = "credits"             # Requires credit balance
    LISTING_AGE = "listing_age"     # Requires minimum listing age


class EventType(str, Enum):
    VIEW = "view"
    UNIQUE_VIEW = "unique_view"
    SAVE = "save"
    UNSAVE = "unsave"
    CHAT_INITIATED = "chat_initiated"
    OFFER_RECEIVED = "offer_received"
    BOOST_CLICK = "boost_click"
    SHARE = "share"
    CALL_CLICK = "call_click"


class TimePeriod(str, Enum):
    HOURS_24 = "24h"
    DAYS_7 = "7d"
    DAYS_30 = "30d"
    ALL_TIME = "all"


# =============================================================================
# MODELS
# =============================================================================

class AnalyticsSettings(BaseModel):
    """Global analytics settings controlled by admin"""
    id: str = "global_analytics_settings"
    is_enabled: bool = True
    access_level: AnalyticsAccessLevel = AnalyticsAccessLevel.ALL_SELLERS
    lock_type: AnalyticsLockType = AnalyticsLockType.NONE
    
    # Lock parameters
    required_subscription_tier: Optional[str] = None
    required_credits: int = 0
    min_listing_age_days: int = 0
    
    # Visible metrics control
    visible_metrics: Dict[str, bool] = Field(default_factory=lambda: {
        "views": True,
        "unique_views": True,
        "saves": True,
        "chats": True,
        "offers": True,
        "conversion_rate": True,
        "boost_impact": True,
        "location_views": True,
        "time_trends": True,
        "ai_insights": True,
        "comparison": True,
    })
    
    # Disabled message
    disabled_message: str = "Upgrade your account to view analytics"
    
    # AI Insights settings
    ai_insights_enabled: bool = True
    
    updated_at: Optional[datetime] = None


class SellerAnalyticsOverride(BaseModel):
    """Per-seller analytics override"""
    seller_id: str
    analytics_enabled: bool = True
    access_level: Optional[AnalyticsAccessLevel] = None  # None = use global
    custom_visible_metrics: Optional[Dict[str, bool]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None


class AnalyticsEvent(BaseModel):
    """Single analytics event"""
    id: str = Field(default_factory=lambda: f"evt_{uuid.uuid4().hex[:12]}")
    listing_id: str
    seller_id: str
    event_type: EventType
    viewer_id: Optional[str] = None  # For unique tracking
    viewer_ip_hash: Optional[str] = None  # For bot filtering
    location: Optional[str] = None
    device_type: Optional[str] = None
    referrer: Optional[str] = None
    is_boosted: bool = False
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ListingMetrics(BaseModel):
    """Aggregated metrics for a listing"""
    listing_id: str
    period: TimePeriod
    total_views: int = 0
    unique_views: int = 0
    saves: int = 0
    chats_initiated: int = 0
    offers_received: int = 0
    view_to_chat_rate: float = 0.0
    view_to_offer_rate: float = 0.0
    boost_views: int = 0
    non_boost_views: int = 0
    boost_impact_percent: float = 0.0
    location_breakdown: Dict[str, int] = Field(default_factory=dict)
    hourly_trend: List[int] = Field(default_factory=list)
    daily_trend: List[int] = Field(default_factory=list)


class AIInsight(BaseModel):
    """AI-generated insight"""
    type: str  # suggestion, warning, opportunity
    title: str
    description: str
    priority: int = 1  # 1=high, 2=medium, 3=low
    action_label: Optional[str] = None
    action_route: Optional[str] = None


class UpdateAnalyticsSettingsRequest(BaseModel):
    """Request to update analytics settings"""
    is_enabled: Optional[bool] = None
    access_level: Optional[AnalyticsAccessLevel] = None
    lock_type: Optional[AnalyticsLockType] = None
    required_subscription_tier: Optional[str] = None
    required_credits: Optional[int] = None
    min_listing_age_days: Optional[int] = None
    visible_metrics: Optional[Dict[str, bool]] = None
    disabled_message: Optional[str] = None
    ai_insights_enabled: Optional[bool] = None


class TrackEventRequest(BaseModel):
    """Request to track an event"""
    listing_id: str
    event_type: EventType
    location: Optional[str] = None
    device_type: Optional[str] = None
    referrer: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# =============================================================================
# ANALYTICS SYSTEM CLASS
# =============================================================================

class AnalyticsSystem:
    def __init__(self, db):
        self.db = db
        self.llm_key = os.environ.get('EMERGENT_LLM_KEY')
    
    async def initialize_default_settings(self):
        """Initialize default analytics settings if not exist"""
        existing = await self.db.analytics_settings.find_one({"id": "global_analytics_settings"})
        if not existing:
            settings = AnalyticsSettings()
            await self.db.analytics_settings.insert_one(settings.dict())
            logger.info("Initialized default analytics settings")
    
    # =========================================================================
    # SETTINGS MANAGEMENT
    # =========================================================================
    
    async def get_settings(self) -> dict:
        """Get global analytics settings"""
        settings = await self.db.analytics_settings.find_one(
            {"id": "global_analytics_settings"},
            {"_id": 0}
        )
        if not settings:
            # Return defaults
            return AnalyticsSettings().dict()
        return settings
    
    async def update_settings(self, data: UpdateAnalyticsSettingsRequest) -> dict:
        """Update global analytics settings"""
        updates = {k: v for k, v in data.dict().items() if v is not None}
        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")
        
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await self.db.analytics_settings.update_one(
            {"id": "global_analytics_settings"},
            {"$set": updates},
            upsert=True
        )
        return await self.get_settings()
    
    async def get_seller_override(self, seller_id: str) -> Optional[dict]:
        """Get seller-specific analytics override"""
        return await self.db.seller_analytics_overrides.find_one(
            {"seller_id": seller_id},
            {"_id": 0}
        )
    
    async def set_seller_override(self, seller_id: str, enabled: bool) -> dict:
        """Set seller-specific analytics override"""
        override = {
            "seller_id": seller_id,
            "analytics_enabled": enabled,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await self.db.seller_analytics_overrides.update_one(
            {"seller_id": seller_id},
            {"$set": override, "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return await self.get_seller_override(seller_id)
    
    async def check_seller_access(self, seller_id: str, user: dict = None) -> dict:
        """Check if a seller has access to analytics"""
        settings = await self.get_settings()
        
        # Check if globally disabled
        if not settings.get("is_enabled", True):
            return {
                "has_access": False,
                "reason": "disabled",
                "message": settings.get("disabled_message", "Analytics is currently disabled")
            }
        
        # Check seller override
        override = await self.get_seller_override(seller_id)
        if override and not override.get("analytics_enabled", True):
            return {
                "has_access": False,
                "reason": "seller_disabled",
                "message": "Analytics is disabled for your account"
            }
        
        # Check access level
        access_level = settings.get("access_level", "all")
        
        if access_level == "disabled":
            return {
                "has_access": False,
                "reason": "disabled",
                "message": settings.get("disabled_message", "Analytics is not available")
            }
        
        if access_level == "verified" and user:
            if not user.get("is_verified", False):
                return {
                    "has_access": False,
                    "reason": "not_verified",
                    "message": "Verify your account to access analytics"
                }
        
        if access_level == "premium" and user:
            if not user.get("is_premium", False) and not user.get("subscription_tier"):
                return {
                    "has_access": False,
                    "reason": "not_premium",
                    "message": "Upgrade to premium to access analytics"
                }
        
        # Check lock type
        lock_type = settings.get("lock_type", "none")
        
        if lock_type == "subscription":
            required_tier = settings.get("required_subscription_tier")
            if required_tier and user:
                user_tier = user.get("subscription_tier", "")
                if user_tier != required_tier:
                    return {
                        "has_access": False,
                        "reason": "subscription_required",
                        "message": f"Requires {required_tier} subscription"
                    }
        
        elif lock_type == "credits":
            required_credits = settings.get("required_credits", 0)
            if required_credits > 0:
                # Check seller's credit balance
                credits = await self.db.seller_credits.find_one({"seller_id": seller_id})
                balance = credits.get("balance", 0) if credits else 0
                if balance < required_credits:
                    return {
                        "has_access": False,
                        "reason": "insufficient_credits",
                        "message": f"Requires {required_credits} credits (you have {balance})"
                    }
        
        elif lock_type == "listing_age":
            # Will be checked per-listing
            pass
        
        return {
            "has_access": True,
            "visible_metrics": settings.get("visible_metrics", {}),
            "ai_insights_enabled": settings.get("ai_insights_enabled", True)
        }
    
    # =========================================================================
    # EVENT TRACKING
    # =========================================================================
    
    async def track_event(
        self,
        listing_id: str,
        seller_id: str,
        event_type: EventType,
        viewer_id: Optional[str] = None,
        viewer_ip: Optional[str] = None,
        location: Optional[str] = None,
        device_type: Optional[str] = None,
        referrer: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> dict:
        """Track an analytics event"""
        
        # Check if listing is boosted
        listing = await self.db.listings.find_one({"id": listing_id})
        is_boosted = listing.get("is_boosted", False) if listing else False
        
        # Filter self-views
        if viewer_id and viewer_id == seller_id:
            return {"tracked": False, "reason": "self_view"}
        
        # Hash IP for privacy
        ip_hash = None
        if viewer_ip:
            import hashlib
            ip_hash = hashlib.sha256(viewer_ip.encode()).hexdigest()[:16]
        
        # Check for bot/duplicate (simple rate limiting)
        if ip_hash and event_type == EventType.VIEW:
            recent_view = await self.db.analytics_events.find_one({
                "listing_id": listing_id,
                "viewer_ip_hash": ip_hash,
                "event_type": "view",
                "timestamp": {"$gte": (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()}
            })
            if recent_view:
                return {"tracked": False, "reason": "duplicate"}
        
        # Create event
        event = {
            "id": f"evt_{uuid.uuid4().hex[:12]}",
            "listing_id": listing_id,
            "seller_id": seller_id,
            "event_type": event_type.value,
            "viewer_id": viewer_id,
            "viewer_ip_hash": ip_hash,
            "location": location,
            "device_type": device_type,
            "referrer": referrer,
            "is_boosted": is_boosted,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metadata": metadata or {}
        }
        
        await self.db.analytics_events.insert_one(event)
        
        # Update listing view count
        if event_type == EventType.VIEW:
            await self.db.listings.update_one(
                {"id": listing_id},
                {"$inc": {"views": 1}}
            )
        
        return {"tracked": True, "event_id": event["id"]}
    
    # =========================================================================
    # METRICS AGGREGATION
    # =========================================================================
    
    async def get_listing_metrics(
        self,
        listing_id: str,
        period: TimePeriod = TimePeriod.DAYS_7
    ) -> dict:
        """Get aggregated metrics for a listing"""
        
        # Calculate time range
        now = datetime.now(timezone.utc)
        if period == TimePeriod.HOURS_24:
            start_time = now - timedelta(hours=24)
        elif period == TimePeriod.DAYS_7:
            start_time = now - timedelta(days=7)
        elif period == TimePeriod.DAYS_30:
            start_time = now - timedelta(days=30)
        else:
            start_time = None
        
        # Build query
        query = {"listing_id": listing_id}
        if start_time:
            query["timestamp"] = {"$gte": start_time.isoformat()}
        
        # Get all events
        events = await self.db.analytics_events.find(query).to_list(10000)
        
        # Aggregate metrics
        total_views = 0
        unique_viewers = set()
        saves = 0
        chats = 0
        offers = 0
        boost_views = 0
        non_boost_views = 0
        location_breakdown = defaultdict(int)
        hourly_views = defaultdict(int)
        daily_views = defaultdict(int)
        
        for event in events:
            event_type = event.get("event_type")
            
            if event_type == "view":
                total_views += 1
                if event.get("viewer_id"):
                    unique_viewers.add(event["viewer_id"])
                elif event.get("viewer_ip_hash"):
                    unique_viewers.add(event["viewer_ip_hash"])
                
                if event.get("is_boosted"):
                    boost_views += 1
                else:
                    non_boost_views += 1
                
                if event.get("location"):
                    location_breakdown[event["location"]] += 1
                
                # Time trends
                ts = event.get("timestamp")
                if ts:
                    if isinstance(ts, str):
                        ts = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                    hourly_views[ts.hour] += 1
                    daily_views[ts.strftime("%Y-%m-%d")] += 1
            
            elif event_type == "save":
                saves += 1
            elif event_type == "chat_initiated":
                chats += 1
            elif event_type == "offer_received":
                offers += 1
        
        # Calculate rates
        unique_view_count = len(unique_viewers)
        view_to_chat_rate = (chats / total_views * 100) if total_views > 0 else 0
        view_to_offer_rate = (offers / total_views * 100) if total_views > 0 else 0
        
        # Boost impact
        boost_impact = 0
        if non_boost_views > 0 and boost_views > 0:
            boost_impact = ((boost_views - non_boost_views) / non_boost_views * 100)
        
        return {
            "listing_id": listing_id,
            "period": period.value,
            "total_views": total_views,
            "unique_views": unique_view_count,
            "saves": saves,
            "chats_initiated": chats,
            "offers_received": offers,
            "view_to_chat_rate": round(view_to_chat_rate, 2),
            "view_to_offer_rate": round(view_to_offer_rate, 2),
            "boost_views": boost_views,
            "non_boost_views": non_boost_views,
            "boost_impact_percent": round(boost_impact, 2),
            "location_breakdown": dict(location_breakdown),
            "hourly_trend": [hourly_views.get(h, 0) for h in range(24)],
            "daily_trend": dict(sorted(daily_views.items())[-7:]) if daily_views else {}
        }
    
    async def get_seller_metrics(
        self,
        seller_id: str,
        period: TimePeriod = TimePeriod.DAYS_7
    ) -> dict:
        """Get aggregated metrics for all seller's listings"""
        
        # Get all seller's listings
        listings = await self.db.listings.find(
            {"user_id": seller_id},
            {"id": 1}
        ).to_list(1000)
        
        listing_ids = [l["id"] for l in listings]
        
        if not listing_ids:
            return {
                "seller_id": seller_id,
                "period": period.value,
                "total_listings": 0,
                "total_views": 0,
                "total_saves": 0,
                "total_chats": 0,
                "total_offers": 0,
                "avg_conversion_rate": 0,
                "top_listings": []
            }
        
        # Calculate time range
        now = datetime.now(timezone.utc)
        if period == TimePeriod.HOURS_24:
            start_time = now - timedelta(hours=24)
        elif period == TimePeriod.DAYS_7:
            start_time = now - timedelta(days=7)
        elif period == TimePeriod.DAYS_30:
            start_time = now - timedelta(days=30)
        else:
            start_time = None
        
        # Build query
        query = {"listing_id": {"$in": listing_ids}}
        if start_time:
            query["timestamp"] = {"$gte": start_time.isoformat()}
        
        # Aggregate per listing
        pipeline = [
            {"$match": query},
            {"$group": {
                "_id": "$listing_id",
                "views": {"$sum": {"$cond": [{"$eq": ["$event_type", "view"]}, 1, 0]}},
                "saves": {"$sum": {"$cond": [{"$eq": ["$event_type", "save"]}, 1, 0]}},
                "chats": {"$sum": {"$cond": [{"$eq": ["$event_type", "chat_initiated"]}, 1, 0]}},
                "offers": {"$sum": {"$cond": [{"$eq": ["$event_type", "offer_received"]}, 1, 0]}},
            }},
            {"$sort": {"views": -1}}
        ]
        
        results = await self.db.analytics_events.aggregate(pipeline).to_list(1000)
        
        # Calculate totals
        total_views = sum(r["views"] for r in results)
        total_saves = sum(r["saves"] for r in results)
        total_chats = sum(r["chats"] for r in results)
        total_offers = sum(r["offers"] for r in results)
        
        avg_conversion = (total_chats / total_views * 100) if total_views > 0 else 0
        
        # Get top listings with details
        top_listings = []
        for r in results[:5]:
            listing = await self.db.listings.find_one({"id": r["_id"]}, {"_id": 0, "id": 1, "title": 1, "images": 1, "price": 1})
            if listing:
                top_listings.append({
                    **listing,
                    "views": r["views"],
                    "saves": r["saves"],
                    "chats": r["chats"],
                    "conversion_rate": round((r["chats"] / r["views"] * 100) if r["views"] > 0 else 0, 2)
                })
        
        return {
            "seller_id": seller_id,
            "period": period.value,
            "total_listings": len(listing_ids),
            "total_views": total_views,
            "total_saves": total_saves,
            "total_chats": total_chats,
            "total_offers": total_offers,
            "avg_conversion_rate": round(avg_conversion, 2),
            "top_listings": top_listings
        }
    
    async def get_comparison_metrics(
        self,
        listing_id: str,
        seller_id: str
    ) -> dict:
        """Get comparison metrics: this listing vs seller average"""
        
        listing_metrics = await self.get_listing_metrics(listing_id, TimePeriod.DAYS_7)
        seller_metrics = await self.get_seller_metrics(seller_id, TimePeriod.DAYS_7)
        
        # Calculate averages
        num_listings = seller_metrics.get("total_listings", 1) or 1
        avg_views = seller_metrics.get("total_views", 0) / num_listings
        avg_saves = seller_metrics.get("total_saves", 0) / num_listings
        avg_chats = seller_metrics.get("total_chats", 0) / num_listings
        
        return {
            "listing": {
                "views": listing_metrics.get("total_views", 0),
                "saves": listing_metrics.get("saves", 0),
                "chats": listing_metrics.get("chats_initiated", 0),
                "conversion_rate": listing_metrics.get("view_to_chat_rate", 0)
            },
            "seller_average": {
                "views": round(avg_views, 1),
                "saves": round(avg_saves, 1),
                "chats": round(avg_chats, 1),
                "conversion_rate": seller_metrics.get("avg_conversion_rate", 0)
            },
            "comparison": {
                "views_vs_avg": round(((listing_metrics.get("total_views", 0) - avg_views) / avg_views * 100) if avg_views > 0 else 0, 1),
                "saves_vs_avg": round(((listing_metrics.get("saves", 0) - avg_saves) / avg_saves * 100) if avg_saves > 0 else 0, 1),
                "chats_vs_avg": round(((listing_metrics.get("chats_initiated", 0) - avg_chats) / avg_chats * 100) if avg_chats > 0 else 0, 1),
            }
        }
    
    # =========================================================================
    # AI INSIGHTS
    # =========================================================================
    
    async def generate_insights(
        self,
        listing_id: str,
        metrics: dict,
        listing_data: dict
    ) -> List[dict]:
        """Generate AI-powered insights for a listing"""
        
        insights = []
        
        # Rule-based insights (always available)
        
        # Photo suggestion
        images = listing_data.get("images", [])
        if len(images) < 3:
            insights.append({
                "type": "suggestion",
                "title": "Add more photos",
                "description": f"Listings with 5+ photos get 2x more views. You have {len(images)} photos.",
                "priority": 1,
                "action_label": "Edit Listing",
                "action_route": f"/post?edit={listing_id}"
            })
        
        # Low conversion
        conversion = metrics.get("view_to_chat_rate", 0)
        if conversion < 2 and metrics.get("total_views", 0) > 20:
            insights.append({
                "type": "warning",
                "title": "Low engagement rate",
                "description": f"Only {conversion}% of viewers contact you. Consider lowering price or improving description.",
                "priority": 1,
                "action_label": "Edit Price",
                "action_route": f"/post?edit={listing_id}"
            })
        
        # Boost recommendation
        if not listing_data.get("is_boosted") and metrics.get("total_views", 0) > 10:
            projected_views = metrics.get("total_views", 0) * 3
            insights.append({
                "type": "opportunity",
                "title": "Boost recommended",
                "description": f"Boosting could increase views to ~{projected_views} per week based on category averages.",
                "priority": 2,
                "action_label": "Boost Now",
                "action_route": f"/boost/{listing_id}"
            })
        
        # High performing
        if metrics.get("view_to_chat_rate", 0) > 10:
            insights.append({
                "type": "success",
                "title": "Great performance!",
                "description": f"Your conversion rate ({metrics.get('view_to_chat_rate', 0)}%) is above average. Consider boosting to maximize sales.",
                "priority": 3
            })
        
        # AI-powered insights (if enabled and available)
        if AI_AVAILABLE and self.llm_key:
            try:
                ai_insight = await self._generate_ai_insight(listing_data, metrics)
                if ai_insight:
                    insights.append(ai_insight)
            except Exception as e:
                logger.error(f"AI insight generation failed: {e}")
        
        return sorted(insights, key=lambda x: x.get("priority", 5))
    
    async def _generate_ai_insight(self, listing_data: dict, metrics: dict) -> Optional[dict]:
        """Generate AI-powered insight using GPT-5.2"""
        
        if not self.llm_key:
            return None
        
        try:
            chat = LlmChat(
                api_key=self.llm_key,
                session_id=f"analytics_{listing_data.get('id', 'unknown')}",
                system_message="""You are a marketplace analytics assistant. Analyze listing performance and provide ONE actionable insight.
                
Be specific and helpful. Focus on what the seller can do to improve.
Response format (JSON only):
{"title": "Brief title", "description": "Specific actionable advice in 1-2 sentences", "type": "suggestion|warning|opportunity"}"""
            )
            chat.with_model("openai", "gpt-5.2")
            
            prompt = f"""Analyze this listing:
Title: {listing_data.get('title', 'Unknown')}
Price: ${listing_data.get('price', 0)}
Category: {listing_data.get('category', 'Unknown')}
Photos: {len(listing_data.get('images', []))}
Description length: {len(listing_data.get('description', ''))} chars

Performance (7 days):
- Views: {metrics.get('total_views', 0)}
- Saves: {metrics.get('saves', 0)}
- Chats: {metrics.get('chats_initiated', 0)}
- Conversion rate: {metrics.get('view_to_chat_rate', 0)}%

Provide ONE specific insight to improve performance."""

            response = await chat.send_message(UserMessage(text=prompt))
            
            # Parse JSON response
            import json
            try:
                insight_data = json.loads(response)
                return {
                    "type": insight_data.get("type", "suggestion"),
                    "title": insight_data.get("title", "AI Suggestion"),
                    "description": insight_data.get("description", ""),
                    "priority": 2,
                    "is_ai": True
                }
            except json.JSONDecodeError:
                # If not JSON, use as description
                return {
                    "type": "suggestion",
                    "title": "AI Suggestion",
                    "description": response[:200],
                    "priority": 2,
                    "is_ai": True
                }
        except Exception as e:
            logger.error(f"AI insight error: {e}")
            return None
    
    async def get_projected_boost_results(
        self,
        listing_id: str,
        boost_type: str,
        duration_hours: int
    ) -> dict:
        """Get projected results if listing is boosted"""
        
        # Get current metrics
        current = await self.get_listing_metrics(listing_id, TimePeriod.DAYS_7)
        
        # Get category averages for boosted listings
        listing = await self.db.listings.find_one({"id": listing_id})
        category = listing.get("category") if listing else None
        
        # Calculate boost multipliers based on type
        multipliers = {
            "featured": 3.0,
            "homepage": 4.0,
            "urgent": 1.5,
            "location": 2.0,
            "category": 2.5
        }
        
        multiplier = multipliers.get(boost_type, 2.0)
        days = duration_hours / 24
        
        # Project metrics
        daily_views = current.get("total_views", 0) / 7
        projected_views = int(daily_views * multiplier * days)
        
        current_conv = current.get("view_to_chat_rate", 0) / 100
        projected_chats = int(projected_views * current_conv)
        
        return {
            "current_weekly_views": current.get("total_views", 0),
            "projected_views": projected_views,
            "projected_chats": projected_chats,
            "boost_type": boost_type,
            "duration_hours": duration_hours,
            "multiplier": multiplier,
            "note": "Projections based on category averages and your listing performance"
        }
    
    # =========================================================================
    # ADMIN ANALYTICS
    # =========================================================================
    
    async def get_platform_analytics(self) -> dict:
        """Get platform-wide analytics for admin"""
        
        now = datetime.now(timezone.utc)
        week_ago = now - timedelta(days=7)
        
        # Total events
        total_events = await self.db.analytics_events.count_documents({
            "timestamp": {"$gte": week_ago.isoformat()}
        })
        
        # Top performing listings
        pipeline = [
            {"$match": {"timestamp": {"$gte": week_ago.isoformat()}, "event_type": "view"}},
            {"$group": {"_id": "$listing_id", "views": {"$sum": 1}}},
            {"$sort": {"views": -1}},
            {"$limit": 10}
        ]
        top_listings_raw = await self.db.analytics_events.aggregate(pipeline).to_list(10)
        
        top_listings = []
        for item in top_listings_raw:
            listing = await self.db.listings.find_one({"id": item["_id"]}, {"_id": 0, "id": 1, "title": 1, "price": 1})
            if listing:
                top_listings.append({**listing, "views": item["views"]})
        
        # Top categories
        cat_pipeline = [
            {"$match": {"timestamp": {"$gte": week_ago.isoformat()}, "event_type": "view"}},
            {"$lookup": {
                "from": "listings",
                "localField": "listing_id",
                "foreignField": "id",
                "as": "listing"
            }},
            {"$unwind": "$listing"},
            {"$group": {"_id": "$listing.category", "views": {"$sum": 1}}},
            {"$sort": {"views": -1}},
            {"$limit": 10}
        ]
        top_categories = await self.db.analytics_events.aggregate(cat_pipeline).to_list(10)
        
        # Top sellers by conversion
        seller_pipeline = [
            {"$match": {"timestamp": {"$gte": week_ago.isoformat()}}},
            {"$group": {
                "_id": "$seller_id",
                "views": {"$sum": {"$cond": [{"$eq": ["$event_type", "view"]}, 1, 0]}},
                "chats": {"$sum": {"$cond": [{"$eq": ["$event_type", "chat_initiated"]}, 1, 0]}},
            }},
            {"$match": {"views": {"$gt": 10}}},
            {"$addFields": {"conversion": {"$multiply": [{"$divide": ["$chats", "$views"]}, 100]}}},
            {"$sort": {"conversion": -1}},
            {"$limit": 10}
        ]
        top_sellers_raw = await self.db.analytics_events.aggregate(seller_pipeline).to_list(10)
        
        top_sellers = []
        for item in top_sellers_raw:
            user = await self.db.users.find_one({"user_id": item["_id"]}, {"_id": 0, "user_id": 1, "name": 1, "email": 1})
            if user:
                top_sellers.append({
                    **user,
                    "views": item["views"],
                    "chats": item["chats"],
                    "conversion_rate": round(item["conversion"], 2)
                })
        
        # Analytics usage per seller
        usage_pipeline = [
            {"$group": {"_id": "$seller_id", "event_count": {"$sum": 1}}},
            {"$sort": {"event_count": -1}},
            {"$limit": 20}
        ]
        usage = await self.db.analytics_events.aggregate(usage_pipeline).to_list(20)
        
        return {
            "period": "7d",
            "total_events": total_events,
            "top_listings": top_listings,
            "top_categories": [{"category": c["_id"], "views": c["views"]} for c in top_categories],
            "top_sellers": top_sellers,
            "analytics_usage": usage
        }


# =============================================================================
# ENGAGEMENT NOTIFICATION SYSTEM
# =============================================================================

class EngagementNotificationConfig(BaseModel):
    """Configuration for engagement notifications"""
    enabled: bool = True
    views_threshold_multiplier: float = 2.0  # Notify if views are 2x average
    saves_threshold_multiplier: float = 3.0  # Notify if saves are 3x average
    chats_threshold_multiplier: float = 2.0  # Notify if chats are 2x average
    minimum_views_for_notification: int = 10  # Minimum views before notifications
    notification_cooldown_hours: int = 6  # Hours between notifications per listing
    check_interval_minutes: int = 30  # How often to check for engagement spikes


class EngagementNotificationManager:
    """Manages engagement boost notifications for sellers"""
    
    def __init__(self, db, create_notification_func: Callable = None):
        self.db = db
        self.create_notification = create_notification_func
        self.config = EngagementNotificationConfig()
        self._running = False
        self._task = None
    
    async def load_config(self):
        """Load notification config from database"""
        config_doc = await self.db.engagement_notification_config.find_one({"_id": "config"})
        if config_doc:
            self.config = EngagementNotificationConfig(**{k: v for k, v in config_doc.items() if k != "_id"})
    
    async def save_config(self, config: EngagementNotificationConfig):
        """Save notification config to database"""
        self.config = config
        await self.db.engagement_notification_config.update_one(
            {"_id": "config"},
            {"$set": config.model_dump()},
            upsert=True
        )
    
    async def check_engagement_spikes(self):
        """Check all active listings for engagement spikes"""
        if not self.config.enabled:
            return
        
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = now - timedelta(days=7)
        cooldown_cutoff = now - timedelta(hours=self.config.notification_cooldown_hours)
        
        # Get all active listings with their sellers
        active_listings = await self.db.listings.find(
            {"status": "active"},
            {"id": 1, "title": 1, "user_id": 1, "_id": 0}
        ).to_list(1000)
        
        for listing in active_listings:
            listing_id = listing["id"]
            seller_id = listing["user_id"]
            
            # Check if we've recently notified for this listing
            recent_notification = await self.db.engagement_notifications_sent.find_one({
                "listing_id": listing_id,
                "sent_at": {"$gte": cooldown_cutoff.isoformat()}
            })
            
            if recent_notification:
                continue
            
            # Get today's metrics
            today_events = await self.db.analytics_events.count_documents({
                "listing_id": listing_id,
                "event_type": "view",
                "timestamp": {"$gte": today_start.isoformat()}
            })
            
            today_saves = await self.db.analytics_events.count_documents({
                "listing_id": listing_id,
                "event_type": "save",
                "timestamp": {"$gte": today_start.isoformat()}
            })
            
            today_chats = await self.db.analytics_events.count_documents({
                "listing_id": listing_id,
                "event_type": "chat_initiated",
                "timestamp": {"$gte": today_start.isoformat()}
            })
            
            # Get average metrics (last 7 days, excluding today)
            avg_pipeline = [
                {"$match": {
                    "listing_id": listing_id,
                    "timestamp": {"$gte": week_ago.isoformat(), "$lt": today_start.isoformat()}
                }},
                {"$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": {"$dateFromString": {"dateString": "$timestamp"}}}},
                    "views": {"$sum": {"$cond": [{"$eq": ["$event_type", "view"]}, 1, 0]}},
                    "saves": {"$sum": {"$cond": [{"$eq": ["$event_type", "save"]}, 1, 0]}},
                    "chats": {"$sum": {"$cond": [{"$eq": ["$event_type", "chat_initiated"]}, 1, 0]}}
                }}
            ]
            daily_stats = await self.db.analytics_events.aggregate(avg_pipeline).to_list(7)
            
            if not daily_stats:
                continue
            
            avg_views = sum(d["views"] for d in daily_stats) / len(daily_stats) if daily_stats else 0
            avg_saves = sum(d["saves"] for d in daily_stats) / len(daily_stats) if daily_stats else 0
            avg_chats = sum(d["chats"] for d in daily_stats) / len(daily_stats) if daily_stats else 0
            
            # Check for significant engagement spike
            notification_data = None
            
            # Views spike
            if today_events >= self.config.minimum_views_for_notification and avg_views > 0:
                views_ratio = today_events / avg_views
                if views_ratio >= self.config.views_threshold_multiplier:
                    notification_data = {
                        "type": "engagement_views_spike",
                        "title": "Your listing is trending!",
                        "body": f'"{listing["title"][:30]}..." got {today_events} views today - {views_ratio:.1f}x your average!',
                        "metric": "views",
                        "value": today_events,
                        "ratio": views_ratio
                    }
            
            # Saves spike (only if no views notification)
            if not notification_data and today_saves >= 3 and avg_saves > 0:
                saves_ratio = today_saves / avg_saves
                if saves_ratio >= self.config.saves_threshold_multiplier:
                    notification_data = {
                        "type": "engagement_saves_spike",
                        "title": "People are saving your listing!",
                        "body": f'"{listing["title"][:30]}..." was saved {today_saves} times today - buyers are interested!',
                        "metric": "saves",
                        "value": today_saves,
                        "ratio": saves_ratio
                    }
            
            # Chats spike (only if no other notification)
            if not notification_data and today_chats >= 2 and avg_chats > 0:
                chats_ratio = today_chats / avg_chats
                if chats_ratio >= self.config.chats_threshold_multiplier:
                    notification_data = {
                        "type": "engagement_chats_spike",
                        "title": "Buyers want to chat!",
                        "body": f'"{listing["title"][:30]}..." received {today_chats} chat requests today!',
                        "metric": "chats",
                        "value": today_chats,
                        "ratio": chats_ratio
                    }
            
            # Send notification if we have one
            if notification_data and self.create_notification:
                try:
                    await self.create_notification(
                        user_id=seller_id,
                        notification_type=notification_data["type"],
                        title=notification_data["title"],
                        body=notification_data["body"],
                        cta_label="View Performance",
                        cta_route=f"/performance/{listing_id}",
                        listing_id=listing_id,
                        listing_title=listing["title"],
                        data_payload={
                            "listing_id": listing_id,
                            "type": notification_data["type"],
                            "metric": notification_data["metric"],
                            "value": notification_data["value"]
                        }
                    )
                    
                    # Record that we sent a notification
                    await self.db.engagement_notifications_sent.insert_one({
                        "listing_id": listing_id,
                        "seller_id": seller_id,
                        "notification_type": notification_data["type"],
                        "metric": notification_data["metric"],
                        "value": notification_data["value"],
                        "ratio": notification_data["ratio"],
                        "sent_at": now.isoformat()
                    })
                    
                    logger.info(f"Sent engagement notification for listing {listing_id}: {notification_data['type']}")
                except Exception as e:
                    logger.error(f"Failed to send engagement notification: {e}")
    
    async def start_background_task(self):
        """Start the background task for checking engagement spikes"""
        if self._running:
            return
        
        self._running = True
        self._task = asyncio.create_task(self._background_loop())
        logger.info(f"Started engagement notification background task (checking every {self.config.check_interval_minutes} mins)")
    
    async def stop_background_task(self):
        """Stop the background task"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
    
    async def _background_loop(self):
        """Background loop that periodically checks for engagement spikes"""
        while self._running:
            try:
                await self.load_config()
                if self.config.enabled:
                    await self.check_engagement_spikes()
            except Exception as e:
                logger.error(f"Error in engagement notification loop: {e}")
            
            await asyncio.sleep(self.config.check_interval_minutes * 60)


# =============================================================================
# ROUTER FACTORY
# =============================================================================

def create_analytics_router(db, get_current_user, get_current_admin):
    """Create analytics router with all endpoints"""
    
    router = APIRouter(prefix="/analytics", tags=["Analytics"])
    analytics = AnalyticsSystem(db)
    
    # Initialize on startup
    @router.on_event("startup")
    async def startup():
        await analytics.initialize_default_settings()
    
    # =========================================================================
    # ADMIN ENDPOINTS
    # =========================================================================
    
    @router.get("/admin/settings")
    async def admin_get_settings(admin: dict = Depends(get_current_admin)):
        """Get global analytics settings"""
        return await analytics.get_settings()
    
    @router.put("/admin/settings")
    async def admin_update_settings(
        data: UpdateAnalyticsSettingsRequest,
        admin: dict = Depends(get_current_admin)
    ):
        """Update global analytics settings"""
        return await analytics.update_settings(data)
    
    @router.put("/admin/settings/toggle")
    async def admin_toggle_analytics(
        enabled: bool = Query(...),
        admin: dict = Depends(get_current_admin)
    ):
        """Quick toggle to enable/disable analytics globally"""
        return await analytics.update_settings(UpdateAnalyticsSettingsRequest(is_enabled=enabled))
    
    @router.get("/admin/seller/{seller_id}/override")
    async def admin_get_seller_override(
        seller_id: str,
        admin: dict = Depends(get_current_admin)
    ):
        """Get seller analytics override"""
        override = await analytics.get_seller_override(seller_id)
        return override or {"seller_id": seller_id, "analytics_enabled": True, "override": False}
    
    @router.put("/admin/seller/{seller_id}/override")
    async def admin_set_seller_override(
        seller_id: str,
        enabled: bool = Query(...),
        admin: dict = Depends(get_current_admin)
    ):
        """Set seller analytics override"""
        return await analytics.set_seller_override(seller_id, enabled)
    
    @router.get("/admin/platform")
    async def admin_get_platform_analytics(admin: dict = Depends(get_current_admin)):
        """Get platform-wide analytics"""
        return await analytics.get_platform_analytics()
    
    # =========================================================================
    # SELLER ENDPOINTS
    # =========================================================================
    
    @router.get("/access")
    async def check_access(user: dict = Depends(get_current_user)):
        """Check if current user has analytics access"""
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return await analytics.check_seller_access(user.get("user_id"), user)
    
    @router.get("/listing/{listing_id}")
    async def get_listing_analytics(
        listing_id: str,
        period: TimePeriod = Query(TimePeriod.DAYS_7),
        user: dict = Depends(get_current_user)
    ):
        """Get analytics for a specific listing"""
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Check listing ownership
        listing = await db.listings.find_one({"id": listing_id})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        if listing.get("user_id") != user.get("user_id"):
            raise HTTPException(status_code=403, detail="Not your listing")
        
        # Check analytics access
        access = await analytics.check_seller_access(user.get("user_id"), user)
        if not access.get("has_access"):
            raise HTTPException(status_code=403, detail=access.get("message", "Analytics not available"))
        
        # Get metrics
        metrics = await analytics.get_listing_metrics(listing_id, period)
        
        # Filter based on visible metrics
        visible = access.get("visible_metrics", {})
        if not visible.get("unique_views", True):
            metrics.pop("unique_views", None)
        if not visible.get("location_views", True):
            metrics.pop("location_breakdown", None)
        if not visible.get("time_trends", True):
            metrics.pop("hourly_trend", None)
            metrics.pop("daily_trend", None)
        if not visible.get("boost_impact", True):
            metrics.pop("boost_views", None)
            metrics.pop("non_boost_views", None)
            metrics.pop("boost_impact_percent", None)
        
        return metrics
    
    @router.get("/listing/{listing_id}/comparison")
    async def get_listing_comparison(
        listing_id: str,
        user: dict = Depends(get_current_user)
    ):
        """Get comparison metrics for a listing"""
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Check access
        access = await analytics.check_seller_access(user.get("user_id"), user)
        if not access.get("has_access"):
            raise HTTPException(status_code=403, detail=access.get("message"))
        
        if not access.get("visible_metrics", {}).get("comparison", True):
            raise HTTPException(status_code=403, detail="Comparison metrics not available")
        
        return await analytics.get_comparison_metrics(listing_id, user.get("user_id"))
    
    @router.get("/listing/{listing_id}/insights")
    async def get_listing_insights(
        listing_id: str,
        user: dict = Depends(get_current_user)
    ):
        """Get AI-powered insights for a listing"""
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Check access
        access = await analytics.check_seller_access(user.get("user_id"), user)
        if not access.get("has_access"):
            raise HTTPException(status_code=403, detail=access.get("message"))
        
        if not access.get("ai_insights_enabled", True):
            return []
        
        # Get listing and metrics
        listing = await db.listings.find_one({"id": listing_id}, {"_id": 0})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        metrics = await analytics.get_listing_metrics(listing_id, TimePeriod.DAYS_7)
        
        return await analytics.generate_insights(listing_id, metrics, listing)
    
    @router.get("/listing/{listing_id}/boost-projection")
    async def get_boost_projection(
        listing_id: str,
        boost_type: str = Query(...),
        duration_hours: int = Query(..., ge=1),
        user: dict = Depends(get_current_user)
    ):
        """Get projected results if listing is boosted"""
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        return await analytics.get_projected_boost_results(listing_id, boost_type, duration_hours)
    
    @router.get("/seller/dashboard")
    async def get_seller_dashboard(
        period: TimePeriod = Query(TimePeriod.DAYS_7),
        user: dict = Depends(get_current_user)
    ):
        """Get seller dashboard analytics"""
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Check access
        access = await analytics.check_seller_access(user.get("user_id"), user)
        if not access.get("has_access"):
            raise HTTPException(status_code=403, detail=access.get("message"))
        
        return await analytics.get_seller_metrics(user.get("user_id"), period)
    
    # =========================================================================
    # EVENT TRACKING (Public/Internal)
    # =========================================================================
    
    @router.post("/track")
    async def track_event(
        request: Request,
        data: TrackEventRequest
    ):
        """Track an analytics event"""
        # Get viewer info from request
        viewer_ip = request.client.host if request.client else None
        
        # Get listing to find seller
        listing = await db.listings.find_one({"id": data.listing_id})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        seller_id = listing.get("user_id")
        
        # Get viewer ID from auth if available
        viewer_id = None
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            try:
                # Try to decode token to get user
                # This is optional - views can be anonymous
                pass
            except:
                pass
        
        return await analytics.track_event(
            listing_id=data.listing_id,
            seller_id=seller_id,
            event_type=data.event_type,
            viewer_id=viewer_id,
            viewer_ip=viewer_ip,
            location=data.location,
            device_type=data.device_type,
            referrer=data.referrer,
            metadata=data.metadata
        )
    
    return router, analytics
