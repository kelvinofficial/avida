"""
Dynamic Banner Management System API Routes
- Banner slots management
- Banner CRUD operations
- Targeting & rotation logic
- Analytics tracking
"""

import uuid
import random
import logging
import csv
from io import StringIO
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Request, Depends, Response, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class BannerContent(BaseModel):
    image_url: Optional[str] = None
    alt_text: Optional[str] = None
    link_url: Optional[str] = None
    html_content: Optional[str] = None
    script_code: Optional[str] = None


class BannerTargeting(BaseModel):
    devices: Optional[List[str]] = []  # mobile, tablet, desktop
    countries: Optional[List[str]] = []
    cities: Optional[List[str]] = []
    categories: Optional[List[str]] = []


class BannerSchedule(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class BannerRotation(BaseModel):
    type: str = "random"  # random, weighted, fixed
    weight: int = 50  # 1-100


class FrequencyCap(BaseModel):
    max_impressions_per_user: int = 5
    period_hours: int = 24


class BannerCreate(BaseModel):
    name: str
    type: str = "image"  # image, html, script
    content: BannerContent
    placement: str
    targeting: Optional[BannerTargeting] = None
    schedule: Optional[BannerSchedule] = None
    rotation: Optional[BannerRotation] = None
    priority: int = 0
    is_active: bool = True
    is_sponsored: bool = False
    frequency_cap: Optional[FrequencyCap] = None


class BannerUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    content: Optional[BannerContent] = None
    placement: Optional[str] = None
    targeting: Optional[BannerTargeting] = None
    schedule: Optional[BannerSchedule] = None
    rotation: Optional[BannerRotation] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None
    is_sponsored: Optional[bool] = None
    frequency_cap: Optional[FrequencyCap] = None


class BannerStatusUpdate(BaseModel):
    is_active: bool


# =============================================================================
# PREDEFINED BANNER SLOTS
# =============================================================================

PREDEFINED_BANNER_SLOTS = [
    # Global
    {"id": "header_below", "name": "Below Header", "description": "Banner appears below the main header", "category": "global", "recommended_size": {"width": 728, "height": 90}, "supported_types": ["image", "html"], "max_banners": 3, "is_active": True},
    {"id": "footer_banner", "name": "Footer Banner", "description": "Banner at the bottom of pages", "category": "global", "recommended_size": {"width": 728, "height": 90}, "supported_types": ["image", "html"], "max_banners": 2, "is_active": True},
    
    # Listing Feeds
    {"id": "feed_after_5", "name": "After 5 Listings", "description": "Banner appears after every 5 listings in feed", "category": "listing_feeds", "recommended_size": {"width": 300, "height": 250}, "supported_types": ["image", "html", "script"], "max_banners": 5, "is_active": True},
    {"id": "feed_after_10", "name": "After 10 Listings", "description": "Banner appears after every 10 listings in feed", "category": "listing_feeds", "recommended_size": {"width": 300, "height": 250}, "supported_types": ["image", "html", "script"], "max_banners": 5, "is_active": True},
    {"id": "feed_after_15", "name": "After 15 Listings", "description": "Banner appears after every 15 listings in feed", "category": "listing_feeds", "recommended_size": {"width": 300, "height": 250}, "supported_types": ["image", "html", "script"], "max_banners": 5, "is_active": True},
    {"id": "feed_between_promoted", "name": "Between Promoted", "description": "Banner appears between promoted listings", "category": "listing_feeds", "recommended_size": {"width": 300, "height": 250}, "supported_types": ["image", "html", "script"], "max_banners": 3, "is_active": True},
    {"id": "feed_end", "name": "End of Feed", "description": "Banner at the end of listing feed", "category": "listing_feeds", "recommended_size": {"width": 728, "height": 90}, "supported_types": ["image", "html"], "max_banners": 2, "is_active": True},
    
    # Listing Detail
    {"id": "detail_below_gallery", "name": "Below Image Gallery", "description": "Banner below the image gallery on listing detail", "category": "listing_detail", "recommended_size": {"width": 300, "height": 250}, "supported_types": ["image", "html"], "max_banners": 2, "is_active": True},
    {"id": "detail_below_info", "name": "Below Item Details", "description": "Banner below item details section", "category": "listing_detail", "recommended_size": {"width": 300, "height": 250}, "supported_types": ["image", "html"], "max_banners": 2, "is_active": True},
    {"id": "detail_before_similar", "name": "Before Similar Listings", "description": "Banner before similar listings section", "category": "listing_detail", "recommended_size": {"width": 728, "height": 90}, "supported_types": ["image", "html"], "max_banners": 2, "is_active": True},
    {"id": "detail_sticky_bottom", "name": "Sticky Bottom (Mobile)", "description": "Sticky banner at bottom of screen on mobile", "category": "listing_detail", "recommended_size": {"width": 320, "height": 50}, "supported_types": ["image"], "max_banners": 1, "is_active": True},
    
    # Other Pages
    {"id": "profile_banner", "name": "Profile Page", "description": "Banner on user profile pages", "category": "other_pages", "recommended_size": {"width": 300, "height": 250}, "supported_types": ["image", "html"], "max_banners": 2, "is_active": True},
    {"id": "publish_banner", "name": "Publish Listing Page", "description": "Banner on the publish listing page", "category": "other_pages", "recommended_size": {"width": 300, "height": 250}, "supported_types": ["image", "html"], "max_banners": 2, "is_active": True},
    {"id": "search_results", "name": "Search Results", "description": "Banner in search results page", "category": "other_pages", "recommended_size": {"width": 728, "height": 90}, "supported_types": ["image", "html"], "max_banners": 3, "is_active": True},
    {"id": "notifications_banner", "name": "Notifications Page", "description": "Banner on notifications page", "category": "other_pages", "recommended_size": {"width": 300, "height": 250}, "supported_types": ["image", "html"], "max_banners": 2, "is_active": True},
]


# =============================================================================
# ROUTE FACTORY
# =============================================================================

def create_banner_management_routes(db, get_current_user):
    """Create banner management API routes"""
    
    router = APIRouter(tags=["Banner Management"])
    
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

    # =========================================================================
    # SEED BANNER SLOTS ON STARTUP
    # =========================================================================
    
    async def seed_banner_slots():
        """Seed predefined banner slots if not exists"""
        for slot in PREDEFINED_BANNER_SLOTS:
            existing = await db.banner_slots.find_one({"id": slot["id"]})
            if not existing:
                slot["created_at"] = datetime.now(timezone.utc).isoformat()
                await db.banner_slots.insert_one(slot)
                logger.info(f"Seeded banner slot: {slot['id']}")

    # =========================================================================
    # PUBLIC ENDPOINTS
    # =========================================================================

    @router.get("/banners/slots")
    async def get_banner_slots(
        category: Optional[str] = None,
        active_only: bool = True
    ):
        """Get all predefined banner placement slots"""
        # Ensure slots are seeded
        await seed_banner_slots()
        
        query = {}
        if active_only:
            query["is_active"] = True
        if category:
            query["category"] = category
        
        slots = await db.banner_slots.find(query, {"_id": 0}).to_list(100)
        
        # Group by category
        grouped = {}
        for slot in slots:
            cat = slot.get("category", "other")
            if cat not in grouped:
                grouped[cat] = []
            grouped[cat].append(slot)
        
        return {
            "slots": slots,
            "grouped": grouped,
            "total": len(slots),
            "categories": list(grouped.keys())
        }

    @router.get("/banners/sizes")
    async def get_banner_sizes():
        """Get recommended banner sizes for each format"""
        return {
            "sizes": {
                "leaderboard": {"width": 728, "height": 90, "description": "Standard horizontal banner"},
                "medium_rectangle": {"width": 300, "height": 250, "description": "Most common ad size"},
                "mobile_banner": {"width": 320, "height": 50, "description": "Standard mobile banner"},
                "large_rectangle": {"width": 336, "height": 280, "description": "Large rectangle format"},
                "half_page": {"width": 300, "height": 600, "description": "Tall sidebar banner"},
                "billboard": {"width": 970, "height": 250, "description": "Large billboard format"},
                "square": {"width": 250, "height": 250, "description": "Square format"},
                "skyscraper": {"width": 160, "height": 600, "description": "Tall narrow banner"}
            }
        }

    @router.get("/banners/display/{placement}")
    async def get_banner_for_display(
        placement: str,
        device: str = "desktop",
        country: Optional[str] = None,
        city: Optional[str] = None,
        category: Optional[str] = None,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None
    ):
        """Get the appropriate banner for display based on targeting rules"""
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()
        
        # Build query for active banners at this placement
        query = {
            "placement": placement,
            "is_active": True
        }
        
        # Get all matching banners
        banners = await db.banners.find(query, {"_id": 0}).to_list(100)
        
        if not banners:
            return {"banner": None, "message": "No banner available for this placement"}
        
        # Filter by targeting and schedule
        eligible = []
        for banner in banners:
            # Check schedule
            schedule = banner.get("schedule", {})
            start_date = schedule.get("start_date")
            end_date = schedule.get("end_date")
            
            if start_date and start_date > now_iso:
                continue  # Not started yet
            if end_date and end_date < now_iso:
                continue  # Already ended
            
            # Check targeting
            targeting = banner.get("targeting", {})
            
            # Check device targeting
            devices = targeting.get("devices", [])
            if devices and device not in devices:
                continue
            
            # Check country targeting
            countries = targeting.get("countries", [])
            if countries and country and country not in countries:
                continue
            
            # Check city targeting
            cities = targeting.get("cities", [])
            if cities and city and city not in cities:
                continue
            
            # Check category targeting
            categories = targeting.get("categories", [])
            if categories and category and category not in categories:
                continue
            
            # Check frequency cap
            freq_cap = banner.get("frequency_cap")
            if freq_cap and user_id:
                period_start = (now - timedelta(hours=freq_cap.get("period_hours", 24))).isoformat()
                recent_impressions = await db.banner_impressions.count_documents({
                    "banner_id": banner["id"],
                    "user_id": user_id,
                    "timestamp": {"$gte": period_start}
                })
                if recent_impressions >= freq_cap.get("max_impressions_per_user", 5):
                    continue
            
            eligible.append(banner)
        
        if not eligible:
            return {"banner": None, "message": "No eligible banner for current targeting"}
        
        # Apply rotation logic
        # Get the rotation type from the first banner (slot-level setting)
        rotation_type = eligible[0].get("rotation", {}).get("type", "random")
        
        if rotation_type == "fixed":
            # Sort by priority, return highest
            eligible.sort(key=lambda x: x.get("priority", 0), reverse=True)
            selected = eligible[0]
        elif rotation_type == "weighted":
            # Weighted random selection
            weights = [b.get("rotation", {}).get("weight", 50) for b in eligible]
            selected = random.choices(eligible, weights=weights, k=1)[0]
        else:  # random
            selected = random.choice(eligible)
        
        return {
            "banner": {
                "id": selected["id"],
                "name": selected.get("name"),
                "type": selected["type"],
                "content": selected["content"],
                "is_sponsored": selected.get("is_sponsored", False),
                "placement": placement
            },
            "tracking": {
                "impression_url": f"/api/banners/track/impression/{selected['id']}",
                "click_url": f"/api/banners/track/click/{selected['id']}"
            }
        }

    @router.post("/banners/track/impression/{banner_id}")
    async def track_impression(
        banner_id: str,
        device: str = "desktop",
        country: Optional[str] = None,
        city: Optional[str] = None,
        placement: Optional[str] = None,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None
    ):
        """Track banner impression"""
        now = datetime.now(timezone.utc)
        
        impression = {
            "id": f"imp_{uuid.uuid4().hex[:12]}",
            "banner_id": banner_id,
            "user_id": user_id,
            "session_id": session_id,
            "device": device,
            "country": country,
            "city": city,
            "placement": placement,
            "timestamp": now.isoformat(),
            "clicked": False,
            "clicked_at": None
        }
        
        await db.banner_impressions.insert_one(impression)
        
        # Update banner impression count
        await db.banners.update_one(
            {"id": banner_id},
            {
                "$inc": {"analytics.impressions": 1},
                "$set": {"analytics.last_impression": now.isoformat()}
            }
        )
        
        return {"success": True, "impression_id": impression["id"]}

    @router.post("/banners/track/click/{banner_id}")
    async def track_click(
        banner_id: str,
        impression_id: Optional[str] = None
    ):
        """Track banner click"""
        now = datetime.now(timezone.utc).isoformat()
        
        # Update impression if provided
        if impression_id:
            await db.banner_impressions.update_one(
                {"id": impression_id},
                {"$set": {"clicked": True, "clicked_at": now}}
            )
        
        # Update banner click count and recalculate CTR
        banner = await db.banners.find_one({"id": banner_id}, {"_id": 0})
        if banner:
            impressions = banner.get("analytics", {}).get("impressions", 0)
            clicks = banner.get("analytics", {}).get("clicks", 0) + 1
            ctr = (clicks / impressions * 100) if impressions > 0 else 0
            
            await db.banners.update_one(
                {"id": banner_id},
                {"$set": {
                    "analytics.clicks": clicks,
                    "analytics.ctr": round(ctr, 2),
                    "analytics.last_click": now
                }}
            )
        
        return {"success": True}

    # =========================================================================
    # ADMIN ENDPOINTS - STATIC ROUTES FIRST (before dynamic {banner_id} routes)
    # =========================================================================

    @router.get("/admin/banners/slots")
    async def admin_get_slots(admin = Depends(require_admin)):
        """Get all banner slots (admin view)"""
        await seed_banner_slots()
        
        slots = await db.banner_slots.find({}, {"_id": 0}).to_list(100)
        
        # Add usage count for each slot
        for slot in slots:
            slot["banner_count"] = await db.banners.count_documents({"placement": slot["id"]})
            slot["active_banner_count"] = await db.banners.count_documents({"placement": slot["id"], "is_active": True})
        
        return {"slots": slots, "total": len(slots)}

    @router.put("/admin/banners/slots/{slot_id}")
    async def update_slot(
        slot_id: str,
        is_active: bool,
        max_banners: Optional[int] = None,
        admin = Depends(require_admin)
    ):
        """Update a banner slot"""
        update_data = {"is_active": is_active}
        if max_banners is not None:
            update_data["max_banners"] = max_banners
        
        result = await db.banner_slots.update_one(
            {"id": slot_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Slot not found")
        
        updated = await db.banner_slots.find_one({"id": slot_id}, {"_id": 0})
        return {"success": True, "slot": updated}

    @router.get("/admin/banners/analytics/summary")
    async def get_analytics_summary(
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        placement: Optional[str] = None,
        admin = Depends(require_admin)
    ):
        """Get analytics summary for all banners"""
        match = {}
        
        if start_date:
            match["timestamp"] = {"$gte": start_date}
        if end_date:
            match.setdefault("timestamp", {})["$lte"] = end_date
        if placement:
            match["placement"] = placement
        
        pipeline = []
        
        if match:
            pipeline.append({"$match": match})
        
        pipeline.extend([
            {"$group": {
                "_id": "$banner_id",
                "impressions": {"$sum": 1},
                "clicks": {"$sum": {"$cond": ["$clicked", 1, 0]}},
                "unique_users": {"$addToSet": "$user_id"}
            }},
            {"$project": {
                "banner_id": "$_id",
                "impressions": 1,
                "clicks": 1,
                "unique_users": {"$size": "$unique_users"},
                "ctr": {
                    "$multiply": [
                        {"$divide": ["$clicks", {"$max": ["$impressions", 1]}]},
                        100
                    ]
                }
            }}
        ])
        
        results = await db.banner_impressions.aggregate(pipeline).to_list(1000)
        
        # Enrich with banner details
        for result in results:
            banner = await db.banners.find_one({"id": result["banner_id"]}, {"_id": 0, "name": 1, "placement": 1})
            if banner:
                result["banner_name"] = banner.get("name")
                result["placement"] = banner.get("placement")
            result["ctr"] = round(result["ctr"], 2)
        
        # Calculate totals
        total_impressions = sum(r["impressions"] for r in results)
        total_clicks = sum(r["clicks"] for r in results)
        avg_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
        
        return {
            "summary": {
                "total_impressions": total_impressions,
                "total_clicks": total_clicks,
                "average_ctr": round(avg_ctr, 2),
                "total_banners": len(results)
            },
            "by_banner": results
        }

    @router.get("/admin/banners/analytics/by-placement")
    async def get_analytics_by_placement(
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        admin = Depends(require_admin)
    ):
        """Get analytics grouped by placement"""
        match = {}
        
        if start_date:
            match["timestamp"] = {"$gte": start_date}
        if end_date:
            match.setdefault("timestamp", {})["$lte"] = end_date
        
        pipeline = []
        
        if match:
            pipeline.append({"$match": match})
        
        pipeline.extend([
            {"$group": {
                "_id": "$placement",
                "impressions": {"$sum": 1},
                "clicks": {"$sum": {"$cond": ["$clicked", 1, 0]}},
                "unique_banners": {"$addToSet": "$banner_id"}
            }},
            {"$project": {
                "placement": "$_id",
                "impressions": 1,
                "clicks": 1,
                "banner_count": {"$size": "$unique_banners"},
                "ctr": {
                    "$multiply": [
                        {"$divide": ["$clicks", {"$max": ["$impressions", 1]}]},
                        100
                    ]
                }
            }},
            {"$sort": {"impressions": -1}}
        ])
        
        results = await db.banner_impressions.aggregate(pipeline).to_list(100)
        
        # Enrich with slot details
        for result in results:
            slot = await db.banner_slots.find_one({"id": result["placement"]}, {"_id": 0, "name": 1, "category": 1})
            if slot:
                result["placement_name"] = slot.get("name")
                result["category"] = slot.get("category")
            result["ctr"] = round(result["ctr"], 2)
        
        return {"by_placement": results}

    @router.get("/admin/banners/analytics/export")
    async def export_analytics(
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        admin = Depends(require_admin)
    ):
        """Export analytics as CSV"""
        # Get analytics data
        data = await get_analytics_summary(start_date, end_date, None, admin)
        
        # Generate CSV
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["Banner ID", "Banner Name", "Placement", "Impressions", "Clicks", "Unique Users", "CTR (%)"])
        
        for row in data["by_banner"]:
            writer.writerow([
                row.get("banner_id", ""),
                row.get("banner_name", ""),
                row.get("placement", ""),
                row.get("impressions", 0),
                row.get("clicks", 0),
                row.get("unique_users", 0),
                row.get("ctr", 0)
            ])
        
        # Add summary row
        writer.writerow([])
        writer.writerow(["SUMMARY"])
        writer.writerow(["Total Impressions", data["summary"]["total_impressions"]])
        writer.writerow(["Total Clicks", data["summary"]["total_clicks"]])
        writer.writerow(["Average CTR", f"{data['summary']['average_ctr']}%"])
        
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=banner_analytics_{datetime.now().strftime('%Y%m%d')}.csv"}
        )

    # =========================================================================
    # ADMIN BANNER CRUD ENDPOINTS
    # =========================================================================

    @router.get("/admin/banners")
    async def list_banners(
        placement: Optional[str] = None,
        status: Optional[str] = None,  # active, inactive, scheduled, expired
        type: Optional[str] = None,  # image, html, script
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100),
        admin = Depends(require_admin)
    ):
        """List all banners with filtering and pagination"""
        query = {}
        now = datetime.now(timezone.utc).isoformat()
        
        if placement:
            query["placement"] = placement
        
        if status == "active":
            query["is_active"] = True
        elif status == "inactive":
            query["is_active"] = False
        elif status == "scheduled":
            query["schedule.start_date"] = {"$gt": now}
        elif status == "expired":
            query["schedule.end_date"] = {"$lt": now}
        
        if type:
            query["type"] = type
        
        skip = (page - 1) * limit
        banners = await db.banners.find(query, {"_id": 0}).skip(skip).limit(limit).sort("created_at", -1).to_list(limit)
        total = await db.banners.count_documents(query)
        
        return {
            "banners": banners,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        }

    @router.get("/admin/banners/{banner_id}")
    async def get_banner(
        banner_id: str,
        admin = Depends(require_admin)
    ):
        """Get a specific banner by ID"""
        banner = await db.banners.find_one({"id": banner_id}, {"_id": 0})
        if not banner:
            raise HTTPException(status_code=404, detail="Banner not found")
        return {"banner": banner}

    @router.post("/admin/banners")
    async def create_banner(
        banner: BannerCreate,
        admin = Depends(require_admin)
    ):
        """Create a new banner"""
        now = datetime.now(timezone.utc)
        
        # Validate placement exists
        slot = await db.banner_slots.find_one({"id": banner.placement})
        if not slot:
            raise HTTPException(status_code=400, detail=f"Invalid placement: {banner.placement}")
        
        # Validate banner type is supported by slot
        supported_types = slot.get("supported_types", ["image"])
        if banner.type not in supported_types:
            raise HTTPException(
                status_code=400, 
                detail=f"Banner type '{banner.type}' not supported for this placement. Supported: {supported_types}"
            )
        
        banner_data = {
            "id": f"banner_{uuid.uuid4().hex[:12]}",
            "name": banner.name,
            "type": banner.type,
            "content": banner.content.dict(),
            "placement": banner.placement,
            "targeting": banner.targeting.dict() if banner.targeting else {},
            "schedule": banner.schedule.dict() if banner.schedule else {},
            "rotation": banner.rotation.dict() if banner.rotation else {"type": "random", "weight": 50},
            "priority": banner.priority,
            "is_active": banner.is_active,
            "is_sponsored": banner.is_sponsored,
            "frequency_cap": banner.frequency_cap.dict() if banner.frequency_cap else None,
            "analytics": {
                "impressions": 0,
                "clicks": 0,
                "ctr": 0.0,
                "last_impression": None,
                "last_click": None
            },
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "created_by": admin.user_id
        }
        
        await db.banners.insert_one(banner_data)
        
        # Remove _id before returning
        banner_data.pop("_id", None)
        
        return {"success": True, "banner": banner_data}

    @router.put("/admin/banners/{banner_id}")
    async def update_banner(
        banner_id: str,
        banner: BannerUpdate,
        admin = Depends(require_admin)
    ):
        """Update an existing banner"""
        existing = await db.banners.find_one({"id": banner_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Banner not found")
        
        update_data = {}
        
        if banner.name is not None:
            update_data["name"] = banner.name
        if banner.type is not None:
            update_data["type"] = banner.type
        if banner.content is not None:
            update_data["content"] = banner.content.dict()
        if banner.placement is not None:
            # Validate new placement
            slot = await db.banner_slots.find_one({"id": banner.placement})
            if not slot:
                raise HTTPException(status_code=400, detail=f"Invalid placement: {banner.placement}")
            update_data["placement"] = banner.placement
        if banner.targeting is not None:
            update_data["targeting"] = banner.targeting.dict()
        if banner.schedule is not None:
            update_data["schedule"] = banner.schedule.dict()
        if banner.rotation is not None:
            update_data["rotation"] = banner.rotation.dict()
        if banner.priority is not None:
            update_data["priority"] = banner.priority
        if banner.is_active is not None:
            update_data["is_active"] = banner.is_active
        if banner.is_sponsored is not None:
            update_data["is_sponsored"] = banner.is_sponsored
        if banner.frequency_cap is not None:
            update_data["frequency_cap"] = banner.frequency_cap.dict()
        
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.banners.update_one(
            {"id": banner_id},
            {"$set": update_data}
        )
        
        updated = await db.banners.find_one({"id": banner_id}, {"_id": 0})
        return {"success": True, "banner": updated}

    @router.delete("/admin/banners/{banner_id}")
    async def delete_banner(
        banner_id: str,
        admin = Depends(require_admin)
    ):
        """Delete a banner"""
        result = await db.banners.delete_one({"id": banner_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Banner not found")
        
        # Optionally delete related impressions
        await db.banner_impressions.delete_many({"banner_id": banner_id})
        
        return {"success": True, "message": "Banner deleted"}

    @router.patch("/admin/banners/{banner_id}/status")
    async def toggle_banner_status(
        banner_id: str,
        status: BannerStatusUpdate,
        admin = Depends(require_admin)
    ):
        """Toggle banner active status"""
        result = await db.banners.update_one(
            {"id": banner_id},
            {"$set": {
                "is_active": status.is_active,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Banner not found")
        
        return {"success": True, "is_active": status.is_active}

    @router.post("/admin/banners/{banner_id}/duplicate")
    async def duplicate_banner(
        banner_id: str,
        admin = Depends(require_admin)
    ):
        """Duplicate an existing banner"""
        original = await db.banners.find_one({"id": banner_id}, {"_id": 0})
        if not original:
            raise HTTPException(status_code=404, detail="Banner not found")
        
        now = datetime.now(timezone.utc)
        
        # Create copy with new ID
        new_banner = original.copy()
        new_banner["id"] = f"banner_{uuid.uuid4().hex[:12]}"
        new_banner["name"] = f"{original['name']} (Copy)"
        new_banner["is_active"] = False  # Start as inactive
        new_banner["analytics"] = {
            "impressions": 0,
            "clicks": 0,
            "ctr": 0.0,
            "last_impression": None,
            "last_click": None
        }
        new_banner["created_at"] = now.isoformat()
        new_banner["updated_at"] = now.isoformat()
        new_banner["created_by"] = admin.user_id
        
        await db.banners.insert_one(new_banner)
        new_banner.pop("_id", None)
        
        return {"success": True, "banner": new_banner}

    return router
