"""
Seller Performance Analytics API Routes
- Seller dashboard metrics
- Per-listing performance analytics
- AI-powered insights
- Geographic analytics
- Boost impact analysis
- Engagement notifications
- Admin controls
"""

import uuid
import logging
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Request, Depends, Query, BackgroundTasks
from pydantic import BaseModel

logger = logging.getLogger(__name__)


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class EngagementSettings(BaseModel):
    spike_threshold_percent: int = 50  # Alert when views increase by this %
    min_views_for_spike: int = 10  # Minimum views before spike detection
    daily_summary_enabled: bool = True
    weekly_summary_enabled: bool = True
    badge_notifications_enabled: bool = True
    email_notifications_enabled: bool = False


class AdminAnalyticsControl(BaseModel):
    seller_analytics_enabled: bool = True
    public_leaderboard_enabled: bool = True
    badge_system_enabled: bool = True
    max_analytics_retention_days: int = 90


class TrackEventRequest(BaseModel):
    event_type: str  # view, save, share, chat_start, offer_made, purchase
    listing_id: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    device: Optional[str] = None  # mobile, tablet, desktop
    region: Optional[str] = None
    city: Optional[str] = None
    referrer: Optional[str] = None  # search, feed, profile, external, direct
    metadata: Optional[Dict[str, Any]] = None


class SpikeCheckRequest(BaseModel):
    listing_ids: Optional[List[str]] = None  # If None, check all active listings
    lookback_hours: int = 24
    comparison_hours: int = 168  # Compare to previous week


# =============================================================================
# ROUTE FACTORY
# =============================================================================

def create_seller_analytics_routes(db, get_current_user):
    """Create seller analytics API routes"""
    
    router = APIRouter(tags=["Seller Analytics"])
    
    # Bot/spam user agents to filter
    BOT_USER_AGENTS = [
        'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 
        'python-requests', 'axios', 'postman'
    ]
    
    async def require_auth(request: Request):
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        return user
    
    async def require_admin(request: Request):
        user = await require_auth(request)
        admin_emails = ["admin@marketplace.com", "admin@example.com"]
        if user.email not in admin_emails:
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    
    def hash_ip(ip: str) -> str:
        """Hash IP for privacy while allowing duplicate detection"""
        return hashlib.sha256(f"salt_{ip}_pepper".encode()).hexdigest()[:16]
    
    async def is_bot_request(request: Request) -> bool:
        """Check if request appears to be from a bot"""
        user_agent = request.headers.get("user-agent", "").lower()
        return any(bot in user_agent for bot in BOT_USER_AGENTS)
    
    async def get_listing_owner(listing_id: str) -> Optional[str]:
        """Get the owner user_id of a listing"""
        listing = await db.listings.find_one({"id": listing_id}, {"user_id": 1})
        return listing.get("user_id") if listing else None

    # =========================================================================
    # ENHANCED EVENT TRACKING
    # =========================================================================

    @router.post("/analytics/track")
    async def track_event(
        request: Request,
        event: TrackEventRequest
    ):
        """
        Track analytics event with enhanced metadata.
        Filters out self-views and bot traffic.
        """
        # Check for bot traffic
        if await is_bot_request(request):
            return {"success": True, "filtered": "bot"}
        
        # Get client IP (hashed for privacy)
        client_ip = request.client.host if request.client else "unknown"
        ip_hash = hash_ip(client_ip)
        
        # Filter self-views (seller viewing their own listing)
        listing_owner = await get_listing_owner(event.listing_id)
        if event.user_id and listing_owner and event.user_id == listing_owner:
            return {"success": True, "filtered": "self_view"}
        
        now = datetime.now(timezone.utc)
        
        # Rate limiting check (max 100 events per IP per minute)
        one_minute_ago = (now - timedelta(minutes=1)).isoformat()
        recent_events = await db.analytics_events.count_documents({
            "ip_hash": ip_hash,
            "timestamp": {"$gte": one_minute_ago}
        })
        
        if recent_events > 100:
            return {"success": True, "filtered": "rate_limit"}
        
        # Create event document
        event_doc = {
            "id": f"evt_{uuid.uuid4().hex[:12]}",
            "event_type": event.event_type,
            "listing_id": event.listing_id,
            "user_id": event.user_id,
            "session_id": event.session_id,
            "device": event.device or "unknown",
            "region": event.region,
            "city": event.city,
            "referrer": event.referrer or "direct",
            "ip_hash": ip_hash,
            "user_agent": request.headers.get("user-agent", "")[:200],
            "metadata": event.metadata or {},
            "timestamp": now.isoformat(),
            "date": now.strftime("%Y-%m-%d")
        }
        
        await db.analytics_events.insert_one(event_doc)
        
        # Update listing stats cache
        await db.listings.update_one(
            {"id": event.listing_id},
            {
                "$inc": {f"stats.{event.event_type}s": 1},
                "$set": {f"stats.last_{event.event_type}": now.isoformat()}
            }
        )
        
        return {"success": True, "event_id": event_doc["id"]}

    # =========================================================================
    # SELLER DASHBOARD
    # =========================================================================

    @router.get("/analytics/seller/performance")
    async def get_seller_performance(
        request: Request,
        period: str = Query("7d", regex="^(24h|7d|30d|90d)$"),
        user = Depends(require_auth)
    ):
        """
        Get seller dashboard overview with aggregated metrics.
        """
        # Calculate date range
        now = datetime.now(timezone.utc)
        period_map = {
            "24h": timedelta(hours=24),
            "7d": timedelta(days=7),
            "30d": timedelta(days=30),
            "90d": timedelta(days=90)
        }
        start_date = (now - period_map[period]).isoformat()
        
        # Get seller's listings
        listings = await db.listings.find(
            {"user_id": user.user_id},
            {"id": 1, "title": 1, "stats": 1, "status": 1}
        ).to_list(1000)
        
        listing_ids = [l["id"] for l in listings]
        
        # Aggregate events for this period
        pipeline = [
            {
                "$match": {
                    "listing_id": {"$in": listing_ids},
                    "timestamp": {"$gte": start_date}
                }
            },
            {
                "$group": {
                    "_id": "$event_type",
                    "count": {"$sum": 1},
                    "unique_users": {"$addToSet": "$user_id"}
                }
            }
        ]
        
        events = await db.analytics_events.aggregate(pipeline).to_list(100)
        
        # Build metrics summary
        metrics = {
            "views": 0,
            "saves": 0,
            "shares": 0,
            "chat_starts": 0,
            "offers": 0,
            "purchases": 0,
            "unique_viewers": 0
        }
        
        all_unique_users = set()
        for event in events:
            event_type = event["_id"]
            if event_type in metrics:
                metrics[event_type] = event["count"]
            if event_type == "view":
                all_unique_users.update([u for u in event["unique_users"] if u])
        
        metrics["unique_viewers"] = len(all_unique_users)
        
        # Calculate conversion rates
        if metrics["views"] > 0:
            metrics["save_rate"] = round(metrics["saves"] / metrics["views"] * 100, 2)
            metrics["chat_rate"] = round(metrics["chat_starts"] / metrics["views"] * 100, 2)
            metrics["conversion_rate"] = round(metrics["purchases"] / metrics["views"] * 100, 2)
        else:
            metrics["save_rate"] = 0
            metrics["chat_rate"] = 0
            metrics["conversion_rate"] = 0
        
        # Get top performing listings
        top_listings = sorted(
            listings,
            key=lambda x: x.get("stats", {}).get("views", 0),
            reverse=True
        )[:5]
        
        # Get daily trend
        trend_pipeline = [
            {
                "$match": {
                    "listing_id": {"$in": listing_ids},
                    "timestamp": {"$gte": start_date},
                    "event_type": "view"
                }
            },
            {
                "$group": {
                    "_id": "$date",
                    "views": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        daily_trend = await db.analytics_events.aggregate(trend_pipeline).to_list(100)
        
        return {
            "period": period,
            "metrics": metrics,
            "listings_count": len(listings),
            "active_listings": len([l for l in listings if l.get("status") == "active"]),
            "top_listings": [
                {
                    "id": l["id"],
                    "title": l.get("title", ""),
                    "views": l.get("stats", {}).get("views", 0),
                    "saves": l.get("stats", {}).get("saves", 0)
                }
                for l in top_listings
            ],
            "daily_trend": [
                {"date": d["_id"], "views": d["views"]}
                for d in daily_trend
            ]
        }

    # =========================================================================
    # PER-LISTING PERFORMANCE
    # =========================================================================

    @router.get("/analytics/listing/{listing_id}/performance")
    async def get_listing_performance(
        listing_id: str,
        period: str = Query("7d", regex="^(24h|7d|30d|90d)$"),
        user = Depends(require_auth)
    ):
        """
        Get detailed performance metrics for a specific listing.
        Only accessible by listing owner or admin.
        """
        # Verify ownership
        listing = await db.listings.find_one({"id": listing_id}, {"_id": 0})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        if listing.get("user_id") != user.user_id:
            admin_emails = ["admin@marketplace.com", "admin@example.com"]
            if user.email not in admin_emails:
                raise HTTPException(status_code=403, detail="Access denied")
        
        # Calculate date range
        now = datetime.now(timezone.utc)
        period_map = {
            "24h": timedelta(hours=24),
            "7d": timedelta(days=7),
            "30d": timedelta(days=30),
            "90d": timedelta(days=90)
        }
        start_date = (now - period_map[period]).isoformat()
        
        # Get previous period for comparison
        prev_start = (now - period_map[period] * 2).isoformat()
        prev_end = start_date
        
        # Current period metrics
        current_pipeline = [
            {
                "$match": {
                    "listing_id": listing_id,
                    "timestamp": {"$gte": start_date}
                }
            },
            {
                "$group": {
                    "_id": "$event_type",
                    "count": {"$sum": 1},
                    "unique_users": {"$addToSet": "$user_id"}
                }
            }
        ]
        
        current_events = await db.analytics_events.aggregate(current_pipeline).to_list(100)
        
        # Previous period metrics
        prev_pipeline = [
            {
                "$match": {
                    "listing_id": listing_id,
                    "timestamp": {"$gte": prev_start, "$lt": prev_end}
                }
            },
            {
                "$group": {
                    "_id": "$event_type",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        prev_events = await db.analytics_events.aggregate(prev_pipeline).to_list(100)
        prev_metrics = {e["_id"]: e["count"] for e in prev_events}
        
        # Build current metrics with trends
        metrics = {}
        for event in current_events:
            event_type = event["_id"]
            current_count = event["count"]
            prev_count = prev_metrics.get(event_type, 0)
            
            if prev_count > 0:
                change_percent = round((current_count - prev_count) / prev_count * 100, 1)
            else:
                change_percent = 100 if current_count > 0 else 0
            
            metrics[event_type] = {
                "count": current_count,
                "unique": len([u for u in event.get("unique_users", []) if u]),
                "previous": prev_count,
                "change_percent": change_percent,
                "trend": "up" if change_percent > 0 else ("down" if change_percent < 0 else "stable")
            }
        
        # Default metrics if missing
        for metric_type in ["view", "save", "share", "chat_start", "offer_made", "purchase"]:
            if metric_type not in metrics:
                metrics[metric_type] = {
                    "count": 0,
                    "unique": 0,
                    "previous": prev_metrics.get(metric_type, 0),
                    "change_percent": 0,
                    "trend": "stable"
                }
        
        # Calculate conversion funnel
        views = metrics.get("view", {}).get("count", 0)
        funnel = {
            "views": views,
            "saves": metrics.get("save", {}).get("count", 0),
            "chats": metrics.get("chat_start", {}).get("count", 0),
            "offers": metrics.get("offer_made", {}).get("count", 0),
            "purchases": metrics.get("purchase", {}).get("count", 0)
        }
        
        if views > 0:
            funnel["save_rate"] = round(funnel["saves"] / views * 100, 2)
            funnel["chat_rate"] = round(funnel["chats"] / views * 100, 2)
            funnel["conversion_rate"] = round(funnel["purchases"] / views * 100, 2)
        
        # Hourly distribution
        hourly_pipeline = [
            {
                "$match": {
                    "listing_id": listing_id,
                    "timestamp": {"$gte": start_date},
                    "event_type": "view"
                }
            },
            {
                "$project": {
                    "hour": {"$hour": {"$dateFromString": {"dateString": "$timestamp"}}}
                }
            },
            {
                "$group": {
                    "_id": "$hour",
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        hourly_data = await db.analytics_events.aggregate(hourly_pipeline).to_list(24)
        
        # Device breakdown
        device_pipeline = [
            {
                "$match": {
                    "listing_id": listing_id,
                    "timestamp": {"$gte": start_date}
                }
            },
            {
                "$group": {
                    "_id": "$device",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        device_data = await db.analytics_events.aggregate(device_pipeline).to_list(10)
        
        # Referrer breakdown
        referrer_pipeline = [
            {
                "$match": {
                    "listing_id": listing_id,
                    "timestamp": {"$gte": start_date}
                }
            },
            {
                "$group": {
                    "_id": "$referrer",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        referrer_data = await db.analytics_events.aggregate(referrer_pipeline).to_list(20)
        
        return {
            "listing_id": listing_id,
            "listing_title": listing.get("title", ""),
            "period": period,
            "metrics": metrics,
            "funnel": funnel,
            "hourly_distribution": [
                {"hour": h["_id"], "views": h["count"]}
                for h in hourly_data
            ],
            "device_breakdown": {
                d["_id"] or "unknown": d["count"]
                for d in device_data
            },
            "referrer_breakdown": {
                r["_id"] or "direct": r["count"]
                for r in referrer_data
            }
        }

    # =========================================================================
    # AI-POWERED INSIGHTS
    # =========================================================================

    @router.get("/analytics/insights/{listing_id}")
    async def get_listing_insights(
        listing_id: str,
        user = Depends(require_auth)
    ):
        """
        Get AI-powered actionable insights for a listing.
        """
        # Verify ownership
        listing = await db.listings.find_one({"id": listing_id}, {"_id": 0})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        if listing.get("user_id") != user.user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get recent performance data
        now = datetime.now(timezone.utc)
        week_ago = (now - timedelta(days=7)).isoformat()
        
        # Get events
        events = await db.analytics_events.find({
            "listing_id": listing_id,
            "timestamp": {"$gte": week_ago}
        }).to_list(10000)
        
        views = len([e for e in events if e["event_type"] == "view"])
        saves = len([e for e in events if e["event_type"] == "save"])
        chats = len([e for e in events if e["event_type"] == "chat_start"])
        
        # Generate insights based on data patterns
        insights = []
        
        # Low views insight
        if views < 10:
            insights.append({
                "type": "warning",
                "category": "visibility",
                "title": "Low Visibility",
                "message": "Your listing has received only {views} views this week. Consider adding more photos or improving your title.",
                "action": "edit_listing",
                "priority": "high"
            })
        
        # Good save rate
        if views > 0 and saves / views > 0.1:
            insights.append({
                "type": "success",
                "category": "engagement",
                "title": "High Save Rate",
                "message": f"Your listing has a {round(saves/views*100, 1)}% save rate, which is above average!",
                "action": None,
                "priority": "low"
            })
        
        # Low save rate
        elif views > 20 and saves / views < 0.02:
            insights.append({
                "type": "warning",
                "category": "engagement",
                "title": "Low Save Rate",
                "message": "Buyers are viewing but not saving. Consider adjusting the price or improving photos.",
                "action": "adjust_price",
                "priority": "medium"
            })
        
        # No chats
        if views > 50 and chats == 0:
            insights.append({
                "type": "warning",
                "category": "conversion",
                "title": "No Inquiries",
                "message": "Despite good views, no buyers have started a chat. Add more details or contact info.",
                "action": "add_details",
                "priority": "high"
            })
        
        # Check listing completeness
        if not listing.get("images") or len(listing.get("images", [])) < 3:
            insights.append({
                "type": "tip",
                "category": "optimization",
                "title": "Add More Photos",
                "message": "Listings with 5+ photos get 3x more views. You currently have {len(listing.get('images', []))} photos.",
                "action": "add_photos",
                "priority": "medium"
            })
        
        if not listing.get("description") or len(listing.get("description", "")) < 100:
            insights.append({
                "type": "tip",
                "category": "optimization",
                "title": "Improve Description",
                "message": "A detailed description helps buyers. Aim for at least 100 characters.",
                "action": "improve_description",
                "priority": "medium"
            })
        
        # Peak hours insight
        hourly_views = {}
        for e in events:
            if e["event_type"] == "view":
                try:
                    hour = datetime.fromisoformat(e["timestamp"].replace("Z", "+00:00")).hour
                    hourly_views[hour] = hourly_views.get(hour, 0) + 1
                except:
                    pass
        
        if hourly_views:
            peak_hour = max(hourly_views, key=hourly_views.get)
            insights.append({
                "type": "info",
                "category": "timing",
                "title": "Peak Activity Time",
                "message": f"Most views happen around {peak_hour}:00. Consider boosting during these hours.",
                "action": "boost_listing",
                "priority": "low"
            })
        
        # Sort by priority
        priority_order = {"high": 0, "medium": 1, "low": 2}
        insights.sort(key=lambda x: priority_order.get(x["priority"], 99))
        
        return {
            "listing_id": listing_id,
            "insights": insights,
            "insights_count": len(insights),
            "generated_at": now.isoformat()
        }

    # =========================================================================
    # GEOGRAPHIC ANALYTICS
    # =========================================================================

    @router.get("/analytics/location/{listing_id}")
    async def get_location_analytics(
        listing_id: str,
        period: str = Query("7d", regex="^(24h|7d|30d|90d)$"),
        user = Depends(require_auth)
    ):
        """
        Get geographic breakdown of views with coordinates for map display.
        """
        # Verify ownership
        listing = await db.listings.find_one({"id": listing_id}, {"_id": 0})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        if listing.get("user_id") != user.user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Calculate date range
        now = datetime.now(timezone.utc)
        period_map = {
            "24h": timedelta(hours=24),
            "7d": timedelta(days=7),
            "30d": timedelta(days=30),
            "90d": timedelta(days=90)
        }
        start_date = (now - period_map[period]).isoformat()
        
        # Aggregate by region
        region_pipeline = [
            {
                "$match": {
                    "listing_id": listing_id,
                    "timestamp": {"$gte": start_date},
                    "region": {"$ne": None}
                }
            },
            {
                "$group": {
                    "_id": "$region",
                    "views": {"$sum": 1},
                    "unique_viewers": {"$addToSet": "$user_id"},
                    "cities": {"$addToSet": "$city"}
                }
            },
            {"$sort": {"views": -1}}
        ]
        
        regions = await db.analytics_events.aggregate(region_pipeline).to_list(100)
        
        # Aggregate by city
        city_pipeline = [
            {
                "$match": {
                    "listing_id": listing_id,
                    "timestamp": {"$gte": start_date},
                    "city": {"$ne": None}
                }
            },
            {
                "$group": {
                    "_id": {"city": "$city", "region": "$region"},
                    "views": {"$sum": 1}
                }
            },
            {"$sort": {"views": -1}},
            {"$limit": 20}
        ]
        
        cities = await db.analytics_events.aggregate(city_pipeline).to_list(20)
        
        # Sample city coordinates (in production, use a geocoding service)
        city_coords = {
            "Dar es Salaam": {"lat": -6.7924, "lng": 39.2083},
            "Nairobi": {"lat": -1.2921, "lng": 36.8219},
            "Mombasa": {"lat": -4.0435, "lng": 39.6682},
            "Kampala": {"lat": 0.3476, "lng": 32.5825},
            "Kigali": {"lat": -1.9403, "lng": 29.8739},
            "Arusha": {"lat": -3.3869, "lng": 36.6830},
            "Mwanza": {"lat": -2.5164, "lng": 32.9175},
            "Dodoma": {"lat": -6.1630, "lng": 35.7516}
        }
        
        return {
            "listing_id": listing_id,
            "period": period,
            "by_region": [
                {
                    "region": r["_id"],
                    "views": r["views"],
                    "unique_viewers": len([u for u in r.get("unique_viewers", []) if u]),
                    "cities_count": len(r.get("cities", []))
                }
                for r in regions
            ],
            "by_city": [
                {
                    "city": c["_id"]["city"],
                    "region": c["_id"]["region"],
                    "views": c["views"],
                    "coordinates": city_coords.get(c["_id"]["city"], None)
                }
                for c in cities
            ],
            "map_markers": [
                {
                    "city": c["_id"]["city"],
                    "lat": city_coords.get(c["_id"]["city"], {}).get("lat"),
                    "lng": city_coords.get(c["_id"]["city"], {}).get("lng"),
                    "views": c["views"]
                }
                for c in cities
                if c["_id"]["city"] in city_coords
            ]
        }

    # =========================================================================
    # BOOST IMPACT ANALYSIS
    # =========================================================================

    @router.get("/analytics/boost-impact/{listing_id}")
    async def get_boost_impact(
        listing_id: str,
        user = Depends(require_auth)
    ):
        """
        Compare performance before and after boost for a listing.
        """
        # Verify ownership
        listing = await db.listings.find_one({"id": listing_id}, {"_id": 0})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        if listing.get("user_id") != user.user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get boost history
        boosts = await db.boosts.find(
            {"listing_id": listing_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(10)
        
        if not boosts:
            return {
                "listing_id": listing_id,
                "has_boosts": False,
                "message": "No boost history found for this listing"
            }
        
        # Analyze most recent boost
        latest_boost = boosts[0]
        boost_start = latest_boost.get("start_date") or latest_boost.get("created_at")
        boost_end = latest_boost.get("end_date")
        
        if not boost_start:
            return {
                "listing_id": listing_id,
                "has_boosts": True,
                "message": "Boost data incomplete"
            }
        
        # Parse dates
        try:
            if isinstance(boost_start, str):
                boost_start_dt = datetime.fromisoformat(boost_start.replace("Z", "+00:00"))
            else:
                boost_start_dt = boost_start
            
            # Get period before boost (same duration)
            boost_duration = timedelta(days=7)  # Default 7 days
            if boost_end:
                if isinstance(boost_end, str):
                    boost_end_dt = datetime.fromisoformat(boost_end.replace("Z", "+00:00"))
                else:
                    boost_end_dt = boost_end
                boost_duration = boost_end_dt - boost_start_dt
            
            before_start = (boost_start_dt - boost_duration).isoformat()
            before_end = boost_start_dt.isoformat()
            during_start = boost_start_dt.isoformat()
            during_end = (boost_start_dt + boost_duration).isoformat()
            
        except Exception as e:
            logger.error(f"Error parsing boost dates: {e}")
            return {"listing_id": listing_id, "error": "Invalid boost dates"}
        
        # Get metrics before boost
        before_pipeline = [
            {
                "$match": {
                    "listing_id": listing_id,
                    "timestamp": {"$gte": before_start, "$lt": before_end}
                }
            },
            {
                "$group": {
                    "_id": "$event_type",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        before_events = await db.analytics_events.aggregate(before_pipeline).to_list(100)
        before_metrics = {e["_id"]: e["count"] for e in before_events}
        
        # Get metrics during boost
        during_pipeline = [
            {
                "$match": {
                    "listing_id": listing_id,
                    "timestamp": {"$gte": during_start, "$lt": during_end}
                }
            },
            {
                "$group": {
                    "_id": "$event_type",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        during_events = await db.analytics_events.aggregate(during_pipeline).to_list(100)
        during_metrics = {e["_id"]: e["count"] for e in during_events}
        
        # Calculate improvements
        def calc_improvement(before: int, during: int) -> dict:
            if before == 0:
                change = 100 if during > 0 else 0
            else:
                change = round((during - before) / before * 100, 1)
            return {
                "before": before,
                "during": during,
                "change_percent": change,
                "improved": during > before
            }
        
        comparison = {
            "views": calc_improvement(
                before_metrics.get("view", 0),
                during_metrics.get("view", 0)
            ),
            "saves": calc_improvement(
                before_metrics.get("save", 0),
                during_metrics.get("save", 0)
            ),
            "chats": calc_improvement(
                before_metrics.get("chat_start", 0),
                during_metrics.get("chat_start", 0)
            ),
            "offers": calc_improvement(
                before_metrics.get("offer_made", 0),
                during_metrics.get("offer_made", 0)
            )
        }
        
        # Calculate ROI if we have boost cost
        boost_cost = latest_boost.get("cost", 0)
        total_improvement = sum(
            c["during"] - c["before"]
            for c in comparison.values()
        )
        
        return {
            "listing_id": listing_id,
            "has_boosts": True,
            "boost_info": {
                "start_date": during_start,
                "end_date": during_end,
                "duration_days": boost_duration.days,
                "cost": boost_cost,
                "type": latest_boost.get("type", "standard")
            },
            "comparison": comparison,
            "summary": {
                "total_views_gained": comparison["views"]["during"] - comparison["views"]["before"],
                "view_increase_percent": comparison["views"]["change_percent"],
                "overall_effective": any(c["improved"] for c in comparison.values())
            },
            "boost_history_count": len(boosts)
        }

    # =========================================================================
    # ENGAGEMENT NOTIFICATIONS
    # =========================================================================

    @router.post("/analytics/engagement/check-spikes")
    async def check_engagement_spikes(
        request: SpikeCheckRequest,
        background_tasks: BackgroundTasks,
        admin = Depends(require_admin)
    ):
        """
        Background job to detect engagement spikes.
        Runs every 30 minutes via cron.
        """
        now = datetime.now(timezone.utc)
        lookback_start = (now - timedelta(hours=request.lookback_hours)).isoformat()
        comparison_start = (now - timedelta(hours=request.comparison_hours)).isoformat()
        comparison_end = lookback_start
        
        # Get listing IDs to check
        if request.listing_ids:
            listing_ids = request.listing_ids
        else:
            # Get all active listings
            active_listings = await db.listings.find(
                {"status": "active"},
                {"id": 1}
            ).to_list(10000)
            listing_ids = [l["id"] for l in active_listings]
        
        spikes_detected = []
        
        for listing_id in listing_ids[:100]:  # Limit to 100 per run
            # Recent period views
            recent_views = await db.analytics_events.count_documents({
                "listing_id": listing_id,
                "event_type": "view",
                "timestamp": {"$gte": lookback_start}
            })
            
            # Comparison period views (normalized)
            comparison_views = await db.analytics_events.count_documents({
                "listing_id": listing_id,
                "event_type": "view",
                "timestamp": {"$gte": comparison_start, "$lt": comparison_end}
            })
            
            # Normalize to same duration
            normalized_comparison = comparison_views * (request.lookback_hours / request.comparison_hours)
            
            # Check for spike
            if normalized_comparison > 0 and recent_views > 10:
                increase_percent = (recent_views - normalized_comparison) / normalized_comparison * 100
                
                if increase_percent >= 50:  # 50% threshold
                    # Get listing owner
                    listing = await db.listings.find_one({"id": listing_id}, {"user_id": 1, "title": 1})
                    if listing:
                        spike = {
                            "id": f"spike_{uuid.uuid4().hex[:12]}",
                            "listing_id": listing_id,
                            "listing_title": listing.get("title", ""),
                            "user_id": listing.get("user_id"),
                            "recent_views": recent_views,
                            "baseline_views": round(normalized_comparison, 1),
                            "increase_percent": round(increase_percent, 1),
                            "detected_at": now.isoformat(),
                            "notification_sent": False
                        }
                        
                        spikes_detected.append(spike)
                        
                        # Store notification
                        await db.engagement_notifications.insert_one(spike)
        
        return {
            "checked_listings": len(listing_ids[:100]),
            "spikes_detected": len(spikes_detected),
            "spikes": spikes_detected
        }

    @router.get("/analytics/engagement/settings")
    async def get_engagement_settings(user = Depends(require_auth)):
        """Get user's engagement notification settings."""
        settings = await db.seller_analytics_settings.find_one(
            {"user_id": user.user_id},
            {"_id": 0}
        )
        
        if not settings:
            settings = {
                "user_id": user.user_id,
                "spike_threshold_percent": 50,
                "min_views_for_spike": 10,
                "daily_summary_enabled": True,
                "weekly_summary_enabled": True,
                "badge_notifications_enabled": True,
                "email_notifications_enabled": False
            }
        
        return settings

    @router.put("/analytics/engagement/settings")
    async def update_engagement_settings(
        settings: EngagementSettings,
        user = Depends(require_auth)
    ):
        """Update user's engagement notification settings."""
        now = datetime.now(timezone.utc)
        
        update_data = settings.dict()
        update_data["updated_at"] = now.isoformat()
        
        await db.seller_analytics_settings.update_one(
            {"user_id": user.user_id},
            {
                "$set": update_data,
                "$setOnInsert": {
                    "user_id": user.user_id,
                    "created_at": now.isoformat()
                }
            },
            upsert=True
        )
        
        return {"success": True, "settings": update_data}

    # =========================================================================
    # BADGE NOTIFICATIONS
    # =========================================================================

    @router.post("/analytics/badges/notify")
    async def trigger_badge_notification(
        user_id: str,
        badge_id: str,
        admin = Depends(require_admin)
    ):
        """
        Trigger badge unlock notification for a user.
        Called by badge evaluation background job.
        """
        now = datetime.now(timezone.utc)
        
        # Get badge info
        badge = await db.badges.find_one({"id": badge_id}, {"_id": 0})
        if not badge:
            raise HTTPException(status_code=404, detail="Badge not found")
        
        # Check if user has this badge
        user_badge = await db.user_badges.find_one({
            "user_id": user_id,
            "badge_id": badge_id
        })
        
        if not user_badge:
            raise HTTPException(status_code=400, detail="User doesn't have this badge")
        
        # Create notification
        notification = {
            "id": f"notif_{uuid.uuid4().hex[:12]}",
            "type": "badge_unlock",
            "user_id": user_id,
            "badge_id": badge_id,
            "badge_name": badge.get("name", ""),
            "badge_icon": badge.get("icon", ""),
            "message": f"Congratulations! You've earned the '{badge.get('name', '')}' badge!",
            "created_at": now.isoformat(),
            "read": False
        }
        
        await db.notifications.insert_one(notification)
        
        return {"success": True, "notification_id": notification["id"]}

    # =========================================================================
    # ADMIN CONTROLS
    # =========================================================================

    @router.get("/admin/seller-analytics/control")
    async def get_analytics_control(admin = Depends(require_admin)):
        """Get admin analytics control settings."""
        settings = await db.admin_settings.find_one(
            {"id": "seller_analytics"},
            {"_id": 0}
        )
        
        if not settings:
            settings = {
                "id": "seller_analytics",
                "seller_analytics_enabled": True,
                "public_leaderboard_enabled": True,
                "badge_system_enabled": True,
                "max_analytics_retention_days": 90
            }
        
        return settings

    @router.put("/admin/seller-analytics/control")
    async def update_analytics_control(
        control: AdminAnalyticsControl,
        admin = Depends(require_admin)
    ):
        """Update admin analytics control settings."""
        now = datetime.now(timezone.utc)
        
        update_data = control.dict()
        update_data["updated_at"] = now.isoformat()
        update_data["updated_by"] = admin.user_id
        
        await db.admin_settings.update_one(
            {"id": "seller_analytics"},
            {
                "$set": update_data,
                "$setOnInsert": {"id": "seller_analytics", "created_at": now.isoformat()}
            },
            upsert=True
        )
        
        return {"success": True, "settings": update_data}

    @router.get("/admin/analytics/top-performers")
    async def get_top_performers(
        period: str = Query("7d", regex="^(24h|7d|30d|90d)$"),
        limit: int = Query(10, ge=1, le=50),
        admin = Depends(require_admin)
    ):
        """Get platform-wide top performing listings, sellers, and categories."""
        now = datetime.now(timezone.utc)
        period_map = {
            "24h": timedelta(hours=24),
            "7d": timedelta(days=7),
            "30d": timedelta(days=30),
            "90d": timedelta(days=90)
        }
        start_date = (now - period_map[period]).isoformat()
        
        # Top listings by views
        top_listings_pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": start_date},
                    "event_type": "view"
                }
            },
            {
                "$group": {
                    "_id": "$listing_id",
                    "views": {"$sum": 1},
                    "unique_viewers": {"$addToSet": "$user_id"}
                }
            },
            {"$sort": {"views": -1}},
            {"$limit": limit}
        ]
        
        top_listings = await db.analytics_events.aggregate(top_listings_pipeline).to_list(limit)
        
        # Enrich with listing details
        for listing in top_listings:
            listing_doc = await db.listings.find_one(
                {"id": listing["_id"]},
                {"_id": 0, "title": 1, "price": 1, "user_id": 1, "category": 1}
            )
            if listing_doc:
                listing["title"] = listing_doc.get("title", "")
                listing["price"] = listing_doc.get("price", 0)
                listing["seller_id"] = listing_doc.get("user_id", "")
                listing["category"] = listing_doc.get("category", "")
            listing["unique_viewers"] = len([u for u in listing.get("unique_viewers", []) if u])
        
        # Top sellers by total views
        top_sellers_pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": start_date},
                    "event_type": "view"
                }
            },
            {
                "$lookup": {
                    "from": "listings",
                    "localField": "listing_id",
                    "foreignField": "id",
                    "as": "listing"
                }
            },
            {"$unwind": "$listing"},
            {
                "$group": {
                    "_id": "$listing.user_id",
                    "total_views": {"$sum": 1},
                    "listings_count": {"$addToSet": "$listing_id"}
                }
            },
            {"$sort": {"total_views": -1}},
            {"$limit": limit}
        ]
        
        top_sellers = await db.analytics_events.aggregate(top_sellers_pipeline).to_list(limit)
        
        # Enrich with seller details
        for seller in top_sellers:
            user = await db.users.find_one(
                {"user_id": seller["_id"]},
                {"_id": 0, "name": 1, "email": 1}
            )
            if user:
                seller["seller_name"] = user.get("name", "")
            seller["listings_count"] = len(seller.get("listings_count", []))
        
        # Top categories
        top_categories_pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": start_date},
                    "event_type": "view"
                }
            },
            {
                "$lookup": {
                    "from": "listings",
                    "localField": "listing_id",
                    "foreignField": "id",
                    "as": "listing"
                }
            },
            {"$unwind": "$listing"},
            {
                "$group": {
                    "_id": "$listing.category",
                    "views": {"$sum": 1},
                    "listings_count": {"$addToSet": "$listing_id"}
                }
            },
            {"$sort": {"views": -1}},
            {"$limit": limit}
        ]
        
        top_categories = await db.analytics_events.aggregate(top_categories_pipeline).to_list(limit)
        
        for cat in top_categories:
            cat["category"] = cat["_id"] or "Uncategorized"
            cat["listings_count"] = len(cat.get("listings_count", []))
        
        return {
            "period": period,
            "top_listings": [
                {
                    "listing_id": l["_id"],
                    "title": l.get("title", ""),
                    "views": l["views"],
                    "unique_viewers": l.get("unique_viewers", 0),
                    "category": l.get("category", "")
                }
                for l in top_listings
            ],
            "top_sellers": [
                {
                    "seller_id": s["_id"],
                    "seller_name": s.get("seller_name", ""),
                    "total_views": s["total_views"],
                    "listings_count": s.get("listings_count", 0)
                }
                for s in top_sellers
            ],
            "top_categories": [
                {
                    "category": c.get("category", ""),
                    "views": c["views"],
                    "listings_count": c.get("listings_count", 0)
                }
                for c in top_categories
            ]
        }

    return router
