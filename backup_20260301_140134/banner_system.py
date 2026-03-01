"""
Dynamic Banner Management System
Comprehensive banner management with multiple placements, targeting, and analytics
"""

from fastapi import APIRouter, HTTPException, Request, Query, Depends, Body
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid
import logging
import random
from collections import defaultdict

logger = logging.getLogger(__name__)


# =============================================================================
# ENUMS & CONSTANTS
# =============================================================================

class BannerType(str, Enum):
    IMAGE = "image"
    HTML = "html"
    SCRIPT = "script"  # AdSense/AdMob


class BannerPlacement(str, Enum):
    # Global
    HEADER_BELOW = "header_below"
    FOOTER = "footer"
    # Listing feeds
    FEED_AFTER_5 = "feed_after_5"
    FEED_AFTER_10 = "feed_after_10"
    FEED_AFTER_15 = "feed_after_15"
    FEED_BETWEEN_PROMOTED = "feed_between_promoted"
    FEED_END = "feed_end"
    # Listing detail
    DETAIL_BELOW_GALLERY = "detail_below_gallery"
    DETAIL_BELOW_INFO = "detail_below_info"
    DETAIL_BEFORE_SIMILAR = "detail_before_similar"
    DETAIL_STICKY_BOTTOM = "detail_sticky_bottom"
    # Other pages
    PROFILE_PAGE = "profile_page"
    PUBLISH_LISTING = "publish_listing"
    SEARCH_RESULTS = "search_results"
    NOTIFICATIONS_PAGE = "notifications_page"


class DeviceTarget(str, Enum):
    ALL = "all"
    MOBILE = "mobile"
    TABLET = "tablet"
    DESKTOP = "desktop"


class RotationRule(str, Enum):
    RANDOM = "random"
    WEIGHTED = "weighted"
    FIXED = "fixed"


# Banner size presets
BANNER_SIZES = {
    "728x90": {"width": 728, "height": 90, "name": "Leaderboard", "placements": ["header_below", "footer"]},
    "300x250": {"width": 300, "height": 250, "name": "Medium Rectangle", "placements": ["detail_below_gallery", "detail_below_info", "profile_page"]},
    "320x50": {"width": 320, "height": 50, "name": "Mobile Banner", "placements": ["detail_sticky_bottom", "feed_after_5", "feed_after_10"]},
    "320x100": {"width": 320, "height": 100, "name": "Large Mobile Banner", "placements": ["feed_after_5", "feed_after_10", "feed_after_15"]},
    "300x600": {"width": 300, "height": 600, "name": "Half Page", "placements": ["search_results"]},
    "970x250": {"width": 970, "height": 250, "name": "Billboard", "placements": ["header_below"]},
    "468x60": {"width": 468, "height": 60, "name": "Full Banner", "placements": ["footer", "notifications_page"]},
    "336x280": {"width": 336, "height": 280, "name": "Large Rectangle", "placements": ["detail_before_similar", "publish_listing"]},
    "native": {"width": 0, "height": 0, "name": "Native (Auto)", "placements": ["feed_after_5", "feed_after_10", "feed_after_15", "feed_between_promoted", "feed_end"]},
}

# Placement metadata
PLACEMENT_INFO = {
    "header_below": {"name": "Below Header", "description": "Appears below header on home, category, and search pages", "recommended_sizes": ["728x90", "970x250"]},
    "footer": {"name": "Footer Banner", "description": "Appears in the footer section", "recommended_sizes": ["728x90", "468x60"]},
    "feed_after_5": {"name": "After 5 Listings", "description": "Injected after every 5 listings in feed", "recommended_sizes": ["native", "320x100", "320x50"]},
    "feed_after_10": {"name": "After 10 Listings", "description": "Injected after every 10 listings in feed", "recommended_sizes": ["native", "320x100", "320x50"]},
    "feed_after_15": {"name": "After 15 Listings", "description": "Injected after every 15 listings in feed", "recommended_sizes": ["native", "320x100"]},
    "feed_between_promoted": {"name": "Between Promoted", "description": "Between promoted/boosted listings", "recommended_sizes": ["native"]},
    "feed_end": {"name": "End of Feed", "description": "At the end of listing feed", "recommended_sizes": ["native", "300x250"]},
    "detail_below_gallery": {"name": "Below Image Gallery", "description": "On listing detail, below images", "recommended_sizes": ["300x250", "336x280"]},
    "detail_below_info": {"name": "Below Item Details", "description": "On listing detail, below description", "recommended_sizes": ["300x250"]},
    "detail_before_similar": {"name": "Before Similar Listings", "description": "On listing detail, before similar items", "recommended_sizes": ["336x280", "300x250"]},
    "detail_sticky_bottom": {"name": "Sticky Bottom (Mobile)", "description": "Fixed at bottom on mobile devices", "recommended_sizes": ["320x50", "320x100"]},
    "profile_page": {"name": "Profile Page", "description": "On user profile page", "recommended_sizes": ["300x250"]},
    "publish_listing": {"name": "Publish Listing Page", "description": "On the create/edit listing page", "recommended_sizes": ["336x280", "300x250"]},
    "search_results": {"name": "Search Results", "description": "On search results page sidebar", "recommended_sizes": ["300x600", "300x250"]},
    "notifications_page": {"name": "Notifications Page", "description": "On notifications page", "recommended_sizes": ["468x60", "300x250"]},
}


# =============================================================================
# MODELS
# =============================================================================

class BannerSlot(BaseModel):
    """Predefined banner placement slot"""
    id: str
    name: str
    placement: str
    description: str
    recommended_sizes: List[str]
    is_active: bool = True


class BannerTargeting(BaseModel):
    """Targeting rules for a banner"""
    devices: List[str] = ["all"]  # all, mobile, tablet, desktop
    countries: List[str] = []  # Empty = all countries
    cities: List[str] = []  # Empty = all cities
    categories: List[str] = []  # Empty = all categories


class BannerSchedule(BaseModel):
    """Schedule for banner display"""
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    days_of_week: List[int] = [0, 1, 2, 3, 4, 5, 6]  # 0=Mon, 6=Sun
    hours: List[int] = list(range(24))  # 0-23


class BannerContent(BaseModel):
    """Banner content based on type"""
    type: str  # image, html, script
    image_url: Optional[str] = None
    image_alt: Optional[str] = None
    html_content: Optional[str] = None
    script_content: Optional[str] = None  # AdSense/AdMob code
    click_url: Optional[str] = None
    click_tracking: bool = True


class BannerCreate(BaseModel):
    """Create banner request"""
    name: str
    placement: str
    size: str = "native"
    content: BannerContent
    targeting: BannerTargeting = BannerTargeting()
    schedule: BannerSchedule = BannerSchedule()
    priority: int = Field(default=5, ge=1, le=10)
    rotation_rule: str = "random"
    is_sponsored: bool = True
    fallback_banner_id: Optional[str] = None
    frequency_cap: Optional[int] = None  # Max impressions per user per day
    is_active: bool = True
    # Seller banner fields
    seller_id: Optional[str] = None
    is_seller_banner: bool = False
    pricing_tier: Optional[str] = None


class BannerUpdate(BaseModel):
    """Update banner request"""
    name: Optional[str] = None
    placement: Optional[str] = None
    size: Optional[str] = None
    content: Optional[BannerContent] = None
    targeting: Optional[BannerTargeting] = None
    schedule: Optional[BannerSchedule] = None
    priority: Optional[int] = None
    rotation_rule: Optional[str] = None
    is_sponsored: Optional[bool] = None
    fallback_banner_id: Optional[str] = None
    frequency_cap: Optional[int] = None
    is_active: Optional[bool] = None


class BannerPricing(BaseModel):
    """Pricing for seller banner slots"""
    id: str
    placement: str
    name: str
    price_per_day: float
    price_per_week: float
    price_per_month: float
    min_duration_days: int = 1
    max_duration_days: int = 30
    is_active: bool = True


class SellerBannerPurchase(BaseModel):
    """Seller banner purchase request"""
    banner_id: str
    placement: str
    duration_days: int
    payment_method: str


# =============================================================================
# BANNER SERVICE
# =============================================================================

class BannerService:
    """Service for managing banners"""
    
    def __init__(self, db):
        self.db = db
    
    async def initialize_slots(self):
        """Initialize predefined banner slots"""
        for placement_id, info in PLACEMENT_INFO.items():
            slot = {
                "id": placement_id,
                "name": info["name"],
                "placement": placement_id,
                "description": info["description"],
                "recommended_sizes": info["recommended_sizes"],
                "is_active": True
            }
            await self.db.banner_slots.update_one(
                {"id": placement_id},
                {"$set": slot},
                upsert=True
            )
        logger.info(f"Initialized {len(PLACEMENT_INFO)} banner slots")
    
    async def initialize_pricing(self):
        """Initialize default pricing for seller banners"""
        default_pricing = [
            {"placement": "header_below", "name": "Premium Header", "price_per_day": 50, "price_per_week": 280, "price_per_month": 1000},
            {"placement": "feed_after_5", "name": "Feed Position 5", "price_per_day": 30, "price_per_week": 168, "price_per_month": 600},
            {"placement": "feed_after_10", "name": "Feed Position 10", "price_per_day": 25, "price_per_week": 140, "price_per_month": 500},
            {"placement": "detail_below_gallery", "name": "Listing Detail Premium", "price_per_day": 40, "price_per_week": 224, "price_per_month": 800},
            {"placement": "search_results", "name": "Search Results Sidebar", "price_per_day": 35, "price_per_week": 196, "price_per_month": 700},
        ]
        
        for pricing in default_pricing:
            pricing["id"] = f"pricing_{pricing['placement']}"
            pricing["min_duration_days"] = 1
            pricing["max_duration_days"] = 30
            pricing["is_active"] = True
            await self.db.banner_pricing.update_one(
                {"id": pricing["id"]},
                {"$set": pricing},
                upsert=True
            )
        logger.info("Initialized default banner pricing")
    
    async def get_slots(self) -> List[Dict]:
        """Get all banner slots"""
        slots = await self.db.banner_slots.find({}, {"_id": 0}).to_list(100)
        return slots
    
    async def get_sizes(self) -> Dict:
        """Get all banner sizes"""
        return BANNER_SIZES
    
    async def get_placements(self) -> Dict:
        """Get all placement info"""
        return PLACEMENT_INFO
    
    async def create_banner(self, banner: BannerCreate, admin_id: str) -> Dict:
        """Create a new banner"""
        banner_id = f"banner_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()
        
        banner_doc = {
            "id": banner_id,
            **banner.model_dump(),
            "created_by": admin_id,
            "created_at": now,
            "updated_at": now,
            "impressions": 0,
            "clicks": 0,
            "ctr": 0.0
        }
        
        await self.db.banners.insert_one(banner_doc)
        banner_doc.pop("_id", None)
        
        logger.info(f"Created banner {banner_id} for placement {banner.placement}")
        return banner_doc
    
    async def get_banner(self, banner_id: str) -> Optional[Dict]:
        """Get a single banner"""
        banner = await self.db.banners.find_one({"id": banner_id}, {"_id": 0})
        return banner
    
    async def get_banners(
        self,
        page: int = 1,
        limit: int = 20,
        placement: Optional[str] = None,
        is_active: Optional[bool] = None,
        seller_id: Optional[str] = None
    ) -> Dict:
        """Get banners with filters"""
        query = {}
        if placement:
            query["placement"] = placement
        if is_active is not None:
            query["is_active"] = is_active
        if seller_id:
            query["seller_id"] = seller_id
        
        skip = (page - 1) * limit
        banners = await self.db.banners.find(query, {"_id": 0}).sort("priority", -1).skip(skip).limit(limit).to_list(limit)
        total = await self.db.banners.count_documents(query)
        
        return {
            "banners": banners,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        }
    
    async def update_banner(self, banner_id: str, update: BannerUpdate) -> Optional[Dict]:
        """Update a banner"""
        update_data = {k: v for k, v in update.model_dump().items() if v is not None}
        if not update_data:
            return await self.get_banner(banner_id)
        
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await self.db.banners.update_one(
            {"id": banner_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            return None
        
        return await self.get_banner(banner_id)
    
    async def delete_banner(self, banner_id: str) -> bool:
        """Delete a banner"""
        result = await self.db.banners.delete_one({"id": banner_id})
        return result.deleted_count > 0
    
    async def toggle_banner(self, banner_id: str, is_active: bool) -> Optional[Dict]:
        """Toggle banner active status"""
        await self.db.banners.update_one(
            {"id": banner_id},
            {"$set": {"is_active": is_active, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return await self.get_banner(banner_id)
    
    async def get_banners_for_placement(
        self,
        placement: str,
        device: str = "desktop",
        country: Optional[str] = None,
        city: Optional[str] = None,
        category: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> List[Dict]:
        """Get eligible banners for a specific placement"""
        now = datetime.now(timezone.utc)
        now_str = now.isoformat()
        
        # Base query
        query = {
            "placement": placement,
            "is_active": True,
        }
        
        # Get all banners for this placement
        banners = await self.db.banners.find(query, {"_id": 0}).to_list(100)
        
        eligible = []
        for banner in banners:
            # Check schedule
            schedule = banner.get("schedule", {})
            if schedule.get("start_date") and schedule["start_date"] > now_str:
                continue
            if schedule.get("end_date") and schedule["end_date"] < now_str:
                continue
            
            # Check day of week
            if now.weekday() not in schedule.get("days_of_week", list(range(7))):
                continue
            
            # Check hour
            if now.hour not in schedule.get("hours", list(range(24))):
                continue
            
            # Check device targeting
            targeting = banner.get("targeting", {})
            devices = targeting.get("devices", ["all"])
            if "all" not in devices and device not in devices:
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
            if user_id and banner.get("frequency_cap"):
                today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
                user_impressions = await self.db.banner_impressions.count_documents({
                    "banner_id": banner["id"],
                    "user_id": user_id,
                    "timestamp": {"$gte": today_start}
                })
                if user_impressions >= banner["frequency_cap"]:
                    continue
            
            eligible.append(banner)
        
        return eligible
    
    async def select_banner(
        self,
        placement: str,
        device: str = "desktop",
        country: Optional[str] = None,
        city: Optional[str] = None,
        category: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Optional[Dict]:
        """Select a single banner for display based on rotation rules"""
        eligible = await self.get_banners_for_placement(
            placement, device, country, city, category, user_id
        )
        
        if not eligible:
            # Try fallback
            slot = await self.db.banner_slots.find_one({"id": placement})
            if slot and slot.get("fallback_banner_id"):
                fallback = await self.get_banner(slot["fallback_banner_id"])
                if fallback and fallback.get("is_active"):
                    return fallback
            return None
        
        # Apply rotation logic
        # Group by rotation rule
        fixed_banners = [b for b in eligible if b.get("rotation_rule") == "fixed"]
        weighted_banners = [b for b in eligible if b.get("rotation_rule") == "weighted"]
        random_banners = [b for b in eligible if b.get("rotation_rule") == "random"]
        
        # Fixed banners have highest priority
        if fixed_banners:
            return max(fixed_banners, key=lambda x: x.get("priority", 5))
        
        # Weighted selection
        if weighted_banners:
            weights = [b.get("priority", 5) for b in weighted_banners]
            total_weight = sum(weights)
            r = random.uniform(0, total_weight)
            cumulative = 0
            for banner, weight in zip(weighted_banners, weights):
                cumulative += weight
                if r <= cumulative:
                    return banner
        
        # Random selection
        if random_banners:
            return random.choice(random_banners)
        
        return None
    
    async def track_impression(
        self,
        banner_id: str,
        user_id: Optional[str] = None,
        device: str = "desktop",
        country: Optional[str] = None,
        city: Optional[str] = None,
        page_url: Optional[str] = None
    ):
        """Track a banner impression"""
        impression = {
            "id": f"imp_{uuid.uuid4().hex[:12]}",
            "banner_id": banner_id,
            "user_id": user_id,
            "device": device,
            "country": country,
            "city": city,
            "page_url": page_url,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "type": "impression"
        }
        
        await self.db.banner_impressions.insert_one(impression)
        
        # Update banner stats
        await self.db.banners.update_one(
            {"id": banner_id},
            {"$inc": {"impressions": 1}}
        )
    
    async def track_click(
        self,
        banner_id: str,
        user_id: Optional[str] = None,
        device: str = "desktop",
        country: Optional[str] = None,
        city: Optional[str] = None,
        page_url: Optional[str] = None
    ):
        """Track a banner click"""
        click = {
            "id": f"click_{uuid.uuid4().hex[:12]}",
            "banner_id": banner_id,
            "user_id": user_id,
            "device": device,
            "country": country,
            "city": city,
            "page_url": page_url,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "type": "click"
        }
        
        await self.db.banner_impressions.insert_one(click)
        
        # Update banner stats and CTR
        banner = await self.db.banners.find_one({"id": banner_id})
        if banner:
            new_clicks = banner.get("clicks", 0) + 1
            impressions = banner.get("impressions", 1)
            ctr = (new_clicks / impressions) * 100 if impressions > 0 else 0
            
            await self.db.banners.update_one(
                {"id": banner_id},
                {"$inc": {"clicks": 1}, "$set": {"ctr": round(ctr, 2)}}
            )
    
    async def get_banner_analytics(
        self,
        banner_id: Optional[str] = None,
        placement: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        group_by: str = "day"  # day, device, country
    ) -> Dict:
        """Get banner analytics"""
        match_query = {}
        if banner_id:
            match_query["banner_id"] = banner_id
        if start_date:
            match_query["timestamp"] = {"$gte": start_date}
        if end_date:
            if "timestamp" in match_query:
                match_query["timestamp"]["$lte"] = end_date
            else:
                match_query["timestamp"] = {"$lte": end_date}
        
        # Get totals
        total_impressions = await self.db.banner_impressions.count_documents({**match_query, "type": "impression"})
        total_clicks = await self.db.banner_impressions.count_documents({**match_query, "type": "click"})
        ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
        
        # Group by dimension
        if group_by == "day":
            group_key = {"$dateToString": {"format": "%Y-%m-%d", "date": {"$dateFromString": {"dateString": "$timestamp"}}}}
        elif group_by == "device":
            group_key = "$device"
        elif group_by == "country":
            group_key = "$country"
        else:
            group_key = "$banner_id"
        
        pipeline = [
            {"$match": match_query},
            {"$group": {
                "_id": {
                    "key": group_key,
                    "type": "$type"
                },
                "count": {"$sum": 1}
            }},
            {"$group": {
                "_id": "$_id.key",
                "stats": {
                    "$push": {
                        "type": "$_id.type",
                        "count": "$count"
                    }
                }
            }},
            {"$sort": {"_id": 1}}
        ]
        
        breakdown = await self.db.banner_impressions.aggregate(pipeline).to_list(100)
        
        # Format breakdown
        formatted_breakdown = []
        for item in breakdown:
            impressions = next((s["count"] for s in item["stats"] if s["type"] == "impression"), 0)
            clicks = next((s["count"] for s in item["stats"] if s["type"] == "click"), 0)
            item_ctr = (clicks / impressions * 100) if impressions > 0 else 0
            formatted_breakdown.append({
                "key": item["_id"] or "Unknown",
                "impressions": impressions,
                "clicks": clicks,
                "ctr": round(item_ctr, 2)
            })
        
        return {
            "totals": {
                "impressions": total_impressions,
                "clicks": total_clicks,
                "ctr": round(ctr, 2)
            },
            "breakdown": formatted_breakdown
        }
    
    async def export_analytics_csv(
        self,
        banner_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> str:
        """Export analytics as CSV"""
        match_query = {}
        if banner_id:
            match_query["banner_id"] = banner_id
        if start_date:
            match_query["timestamp"] = {"$gte": start_date}
        if end_date:
            if "timestamp" in match_query:
                match_query["timestamp"]["$lte"] = end_date
            else:
                match_query["timestamp"] = {"$lte": end_date}
        
        events = await self.db.banner_impressions.find(match_query, {"_id": 0}).to_list(10000)
        
        # Generate CSV
        csv_lines = ["banner_id,type,device,country,city,timestamp,page_url"]
        for event in events:
            csv_lines.append(f"{event.get('banner_id','')},{event.get('type','')},{event.get('device','')},{event.get('country','')},{event.get('city','')},{event.get('timestamp','')},{event.get('page_url','')}")
        
        return "\n".join(csv_lines)
    
    # =========================================================================
    # SELLER BANNER MARKETPLACE
    # =========================================================================
    
    async def get_pricing(self) -> List[Dict]:
        """Get all banner pricing"""
        pricing = await self.db.banner_pricing.find({"is_active": True}, {"_id": 0}).to_list(100)
        return pricing
    
    async def update_pricing(self, pricing_id: str, update: Dict) -> Optional[Dict]:
        """Update banner pricing"""
        await self.db.banner_pricing.update_one(
            {"id": pricing_id},
            {"$set": update}
        )
        return await self.db.banner_pricing.find_one({"id": pricing_id}, {"_id": 0})
    
    async def create_seller_banner(
        self,
        seller_id: str,
        banner: BannerCreate,
        duration_days: int
    ) -> Dict:
        """Create a seller banner (pending approval)"""
        banner_id = f"seller_banner_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        
        # Calculate dates
        start_date = now.isoformat()
        end_date = (now + timedelta(days=duration_days)).isoformat()
        
        banner_doc = {
            "id": banner_id,
            **banner.model_dump(),
            "seller_id": seller_id,
            "is_seller_banner": True,
            "is_active": False,  # Pending approval
            "approval_status": "pending",
            "duration_days": duration_days,
            "schedule": {
                "start_date": start_date,
                "end_date": end_date,
                "days_of_week": [0, 1, 2, 3, 4, 5, 6],
                "hours": list(range(24))
            },
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "impressions": 0,
            "clicks": 0,
            "ctr": 0.0
        }
        
        await self.db.banners.insert_one(banner_doc)
        banner_doc.pop("_id", None)
        
        return banner_doc
    
    async def get_seller_banners(self, seller_id: str) -> List[Dict]:
        """Get all banners for a seller"""
        banners = await self.db.banners.find(
            {"seller_id": seller_id, "is_seller_banner": True},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        return banners
    
    async def approve_seller_banner(self, banner_id: str, approved: bool, admin_id: str) -> Optional[Dict]:
        """Approve or reject a seller banner"""
        status = "approved" if approved else "rejected"
        is_active = approved
        
        await self.db.banners.update_one(
            {"id": banner_id, "is_seller_banner": True},
            {
                "$set": {
                    "approval_status": status,
                    "is_active": is_active,
                    "approved_by": admin_id,
                    "approved_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return await self.get_banner(banner_id)
    
    async def get_pending_seller_banners(self) -> List[Dict]:
        """Get all pending seller banners for admin review"""
        banners = await self.db.banners.find(
            {"is_seller_banner": True, "approval_status": "pending"},
            {"_id": 0}
        ).sort("created_at", 1).to_list(100)
        return banners


# =============================================================================
# ROUTER FACTORY
# =============================================================================

def create_banner_router(db, get_current_user, get_current_admin):
    """Create banner management router"""
    
    router = APIRouter(prefix="/banners", tags=["Banners"])
    service = BannerService(db)
    
    # Initialize on startup
    @router.on_event("startup")
    async def startup():
        await service.initialize_slots()
        await service.initialize_pricing()
    
    # =========================================================================
    # PUBLIC ENDPOINTS (for displaying banners)
    # =========================================================================
    
    @router.get("/slots")
    async def get_slots():
        """Get all banner slots"""
        return await service.get_slots()
    
    @router.get("/sizes")
    async def get_sizes():
        """Get all banner sizes"""
        return await service.get_sizes()
    
    @router.get("/placements")
    async def get_placements():
        """Get all placement info"""
        return await service.get_placements()
    
    @router.get("/display/{placement}")
    async def get_banner_for_display(
        placement: str,
        device: str = Query("desktop"),
        country: Optional[str] = Query(None),
        city: Optional[str] = Query(None),
        category: Optional[str] = Query(None),
        user_id: Optional[str] = Query(None)
    ):
        """Get a banner to display for a specific placement"""
        banner = await service.select_banner(
            placement, device, country, city, category, user_id
        )
        
        if not banner:
            return {"banner": None, "show_fallback": True}
        
        # Track impression
        await service.track_impression(
            banner["id"], user_id, device, country, city
        )
        
        return {"banner": banner, "show_fallback": False}
    
    @router.get("/display-multiple/{placement}")
    async def get_multiple_banners(
        placement: str,
        count: int = Query(3, ge=1, le=10),
        device: str = Query("desktop"),
        country: Optional[str] = Query(None),
        city: Optional[str] = Query(None),
        category: Optional[str] = Query(None),
        user_id: Optional[str] = Query(None)
    ):
        """Get multiple banners for rotation"""
        eligible = await service.get_banners_for_placement(
            placement, device, country, city, category, user_id
        )
        
        # Select up to 'count' banners
        selected = eligible[:count] if len(eligible) >= count else eligible
        
        return {"banners": selected, "total_available": len(eligible)}
    
    @router.post("/track/impression/{banner_id}")
    async def track_impression(
        banner_id: str,
        device: str = Query("desktop"),
        country: Optional[str] = Query(None),
        city: Optional[str] = Query(None),
        page_url: Optional[str] = Query(None),
        user_id: Optional[str] = Query(None)
    ):
        """Track a banner impression"""
        await service.track_impression(banner_id, user_id, device, country, city, page_url)
        return {"tracked": True}
    
    @router.post("/track/click/{banner_id}")
    async def track_click(
        banner_id: str,
        device: str = Query("desktop"),
        country: Optional[str] = Query(None),
        city: Optional[str] = Query(None),
        page_url: Optional[str] = Query(None),
        user_id: Optional[str] = Query(None)
    ):
        """Track a banner click"""
        await service.track_click(banner_id, user_id, device, country, city, page_url)
        return {"tracked": True}
    
    # =========================================================================
    # ADMIN ENDPOINTS
    # =========================================================================
    
    @router.get("/admin/list")
    async def admin_list_banners(
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100),
        placement: Optional[str] = Query(None),
        is_active: Optional[bool] = Query(None),
        admin = Depends(get_current_admin)
    ):
        """List all banners (admin)"""
        return await service.get_banners(page, limit, placement, is_active)
    
    @router.get("/admin/{banner_id}")
    async def admin_get_banner(
        banner_id: str,
        admin = Depends(get_current_admin)
    ):
        """Get a single banner (admin)"""
        banner = await service.get_banner(banner_id)
        if not banner:
            raise HTTPException(status_code=404, detail="Banner not found")
        return banner
    
    @router.post("/admin/create")
    async def admin_create_banner(
        banner: BannerCreate,
        admin = Depends(get_current_admin)
    ):
        """Create a new banner (admin)"""
        return await service.create_banner(banner, admin.get("user_id", "admin"))
    
    @router.put("/admin/{banner_id}")
    async def admin_update_banner(
        banner_id: str,
        update: BannerUpdate,
        admin = Depends(get_current_admin)
    ):
        """Update a banner (admin)"""
        banner = await service.update_banner(banner_id, update)
        if not banner:
            raise HTTPException(status_code=404, detail="Banner not found")
        return banner
    
    @router.delete("/admin/{banner_id}")
    async def admin_delete_banner(
        banner_id: str,
        admin = Depends(get_current_admin)
    ):
        """Delete a banner (admin)"""
        success = await service.delete_banner(banner_id)
        if not success:
            raise HTTPException(status_code=404, detail="Banner not found")
        return {"deleted": True}
    
    @router.post("/admin/{banner_id}/toggle")
    async def admin_toggle_banner(
        banner_id: str,
        is_active: bool = Body(..., embed=True),
        admin = Depends(get_current_admin)
    ):
        """Toggle banner active status (admin)"""
        banner = await service.toggle_banner(banner_id, is_active)
        if not banner:
            raise HTTPException(status_code=404, detail="Banner not found")
        return banner
    
    @router.get("/admin/analytics/overview")
    async def admin_analytics_overview(
        banner_id: Optional[str] = Query(None),
        placement: Optional[str] = Query(None),
        start_date: Optional[str] = Query(None),
        end_date: Optional[str] = Query(None),
        group_by: str = Query("day"),
        admin = Depends(get_current_admin)
    ):
        """Get banner analytics (admin)"""
        return await service.get_banner_analytics(banner_id, placement, start_date, end_date, group_by)
    
    @router.get("/admin/analytics/export")
    async def admin_export_analytics(
        banner_id: Optional[str] = Query(None),
        start_date: Optional[str] = Query(None),
        end_date: Optional[str] = Query(None),
        admin = Depends(get_current_admin)
    ):
        """Export analytics as CSV (admin)"""
        from fastapi.responses import Response
        csv_content = await service.export_analytics_csv(banner_id, start_date, end_date)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=banner_analytics.csv"}
        )
    
    # =========================================================================
    # SELLER BANNER ENDPOINTS
    # =========================================================================
    
    @router.get("/seller/pricing")
    async def get_seller_pricing():
        """Get banner pricing for sellers"""
        return await service.get_pricing()
    
    @router.get("/seller/my-banners")
    async def get_my_banners(user = Depends(get_current_user)):
        """Get seller's own banners"""
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return await service.get_seller_banners(user.user_id)
    
    @router.post("/seller/create")
    async def create_seller_banner(
        banner: BannerCreate,
        duration_days: int = Body(...),
        user = Depends(get_current_user)
    ):
        """Create a seller banner (pending approval)"""
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        banner.is_seller_banner = True
        banner.seller_id = user.user_id
        
        return await service.create_seller_banner(user.user_id, banner, duration_days)
    
    @router.get("/seller/banner/{banner_id}/analytics")
    async def get_seller_banner_analytics(
        banner_id: str,
        user = Depends(get_current_user)
    ):
        """Get analytics for seller's own banner"""
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        banner = await service.get_banner(banner_id)
        if not banner or banner.get("seller_id") != user.user_id:
            raise HTTPException(status_code=404, detail="Banner not found")
        
        return await service.get_banner_analytics(banner_id=banner_id)
    
    # =========================================================================
    # ADMIN - SELLER BANNER MANAGEMENT
    # =========================================================================
    
    @router.get("/admin/seller-banners/pending")
    async def admin_get_pending_seller_banners(admin = Depends(get_current_admin)):
        """Get pending seller banners for approval"""
        return await service.get_pending_seller_banners()
    
    @router.post("/admin/seller-banners/{banner_id}/approve")
    async def admin_approve_seller_banner(
        banner_id: str,
        approved: bool = Body(..., embed=True),
        admin = Depends(get_current_admin)
    ):
        """Approve or reject a seller banner"""
        banner = await service.approve_seller_banner(
            banner_id, approved, admin.get("user_id", "admin")
        )
        if not banner:
            raise HTTPException(status_code=404, detail="Banner not found")
        return banner
    
    @router.get("/admin/pricing")
    async def admin_get_pricing(admin = Depends(get_current_admin)):
        """Get all pricing (admin)"""
        return await service.get_pricing()
    
    @router.put("/admin/pricing/{pricing_id}")
    async def admin_update_pricing(
        pricing_id: str,
        update: Dict[str, Any] = Body(...),
        admin = Depends(get_current_admin)
    ):
        """Update pricing (admin)"""
        return await service.update_pricing(pricing_id, update)
    
    return router, service
