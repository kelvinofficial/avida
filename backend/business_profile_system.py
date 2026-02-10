"""
Business Profile System
Enables verified sellers to create branded business profiles with enhanced features.

Features:
- Logo and cover image upload
- Brand color customization
- Opening hours
- Social network links
- Primary categories
- Admin verification/validation
- SEO-friendly unique identifiers
"""

from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form, Depends, Body
from pydantic import BaseModel, Field
import uuid
import re
import logging
import base64

logger = logging.getLogger(__name__)


# =============================================================================
# MODELS
# =============================================================================

class OpeningHours(BaseModel):
    """Opening hours for a single day"""
    day: str  # monday, tuesday, etc.
    open: Optional[str] = None  # HH:MM format, None if closed
    close: Optional[str] = None  # HH:MM format, None if closed
    is_closed: bool = False


class SocialLinks(BaseModel):
    """Social network links"""
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    twitter: Optional[str] = None  # X
    linkedin: Optional[str] = None
    youtube: Optional[str] = None
    tiktok: Optional[str] = None
    whatsapp: Optional[str] = None  # Phone number with country code
    website: Optional[str] = None
    vimeo: Optional[str] = None
    pinterest: Optional[str] = None


class GalleryImage(BaseModel):
    """Gallery image entry"""
    id: str
    url: str
    caption: Optional[str] = None
    order: int = 0
    created_at: Optional[datetime] = None


class GalleryVideo(BaseModel):
    """Gallery video entry (YouTube/Vimeo links)"""
    id: str
    url: str  # YouTube or Vimeo URL
    title: Optional[str] = None
    thumbnail: Optional[str] = None
    order: int = 0
    created_at: Optional[datetime] = None


class BusinessProfileCreate(BaseModel):
    """Request model for creating a business profile"""
    business_name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)
    brand_color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    primary_categories: List[str] = Field(default_factory=list, max_items=5)
    opening_hours: List[OpeningHours] = Field(default_factory=list)
    social_links: Optional[SocialLinks] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None


class BusinessProfileUpdate(BaseModel):
    """Request model for updating a business profile"""
    business_name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)
    brand_color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    primary_categories: Optional[List[str]] = Field(None, max_items=5)
    opening_hours: Optional[List[OpeningHours]] = None
    social_links: Optional[SocialLinks] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None


class BusinessProfileResponse(BaseModel):
    """Response model for business profile"""
    id: str
    user_id: str
    business_name: str
    identifier: str  # URL-friendly unique identifier
    description: Optional[str] = None
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None
    brand_color: Optional[str] = None
    primary_categories: List[str] = []
    opening_hours: List[Dict] = []
    social_links: Optional[Dict] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    is_verified: bool = False
    is_premium: bool = False  # Premium verified business tier
    verification_tier: str = "none"  # none, verified, premium
    verification_status: str = "none"  # none, pending, approved, rejected
    verification_requested_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None
    premium_expires_at: Optional[datetime] = None  # When premium subscription expires
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    # Stats
    total_listings: int = 0
    total_views: int = 0


class VerificationRequest(BaseModel):
    """Request model for verification"""
    message: Optional[str] = Field(None, max_length=500)


class AdminVerificationAction(BaseModel):
    """Admin action on verification"""
    action: str  # approve, reject
    reason: Optional[str] = None


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def generate_identifier(business_name: str) -> str:
    """Generate a URL-friendly identifier from business name"""
    # Convert to lowercase and replace spaces with hyphens
    identifier = business_name.lower().strip()
    # Remove special characters except hyphens
    identifier = re.sub(r'[^a-z0-9\s-]', '', identifier)
    # Replace multiple spaces/hyphens with single hyphen
    identifier = re.sub(r'[\s-]+', '-', identifier)
    # Remove leading/trailing hyphens
    identifier = identifier.strip('-')
    return identifier


async def ensure_unique_identifier(db, identifier: str, exclude_id: str = None) -> str:
    """Ensure identifier is unique, append number if needed"""
    base_identifier = identifier
    counter = 1
    
    while True:
        query = {"identifier": identifier}
        if exclude_id:
            query["id"] = {"$ne": exclude_id}
        
        existing = await db.business_profiles.find_one(query)
        if not existing:
            return identifier
        
        identifier = f"{base_identifier}-{counter}"
        counter += 1
        
        if counter > 100:  # Safety limit
            identifier = f"{base_identifier}-{uuid.uuid4().hex[:8]}"
            return identifier


# =============================================================================
# ROUTER FACTORY
# =============================================================================

def create_business_profile_router(db, get_current_user, require_auth):
    """
    Create the business profile router with dependencies injected
    
    Args:
        db: MongoDB database instance
        get_current_user: Function to get current user from request
        require_auth: Function to require authentication
    
    Returns:
        APIRouter with business profile endpoints
    """
    router = APIRouter(prefix="/business-profiles", tags=["Business Profiles"])
    
    # =========================================================================
    # PUBLIC ENDPOINTS
    # =========================================================================
    
    @router.get("/public/{identifier}")
    async def get_public_profile(identifier: str, request: Request):
        """Get a public business profile by identifier or slug"""
        profile = await db.business_profiles.find_one(
            {"$or": [{"identifier": identifier}, {"slug": identifier}], "is_active": True},
            {"_id": 0}
        )
        
        if not profile:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        # Increment view count
        await db.business_profiles.update_one(
            {"id": profile["id"]},
            {"$inc": {"total_views": 1}}
        )
        
        # Get user info
        user = await db.users.find_one(
            {"user_id": profile["user_id"]},
            {"_id": 0, "name": 1, "picture": 1, "rating": 1, "total_ratings": 1}
        )
        
        # Get listing count
        listing_count = await db.listings.count_documents({
            "user_id": profile["user_id"],
            "status": "active"
        })
        
        profile["total_listings"] = listing_count
        profile["user"] = user
        
        return profile
    
    @router.get("/public/{identifier}/listings")
    async def get_profile_listings(
        identifier: str,
        request: Request,
        category: Optional[str] = None,
        city: Optional[str] = None,
        page: int = 1,
        limit: int = 18
    ):
        """Get listings for a business profile with filtering"""
        profile = await db.business_profiles.find_one(
            {"$or": [{"identifier": identifier}, {"slug": identifier}], "is_active": True},
            {"_id": 0, "user_id": 1}
        )
        
        if not profile:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        # Build query
        query = {
            "user_id": profile["user_id"],
            "status": "active"
        }
        
        if category:
            query["category"] = category
        if city:
            query["$or"] = [
                {"city": {"$regex": city, "$options": "i"}},
                {"location": {"$regex": city, "$options": "i"}}
            ]
        
        # Get total count
        total = await db.listings.count_documents(query)
        
        # Get listings with pagination
        skip = (page - 1) * limit
        listings = await db.listings.find(query, {"_id": 0}) \
            .sort("created_at", -1) \
            .skip(skip) \
            .limit(limit) \
            .to_list(length=limit)
        
        return {
            "listings": listings,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }
    
    @router.get("/directory")
    async def get_business_directory(
        request: Request,
        category: Optional[str] = None,
        city: Optional[str] = None,
        verified_only: bool = False,
        page: int = 1,
        limit: int = 18
    ):
        """Get directory of all active business profiles"""
        query = {"is_active": True}
        
        if verified_only:
            query["is_verified"] = True
        
        if category:
            query["primary_categories"] = category
        
        if city:
            query["city"] = {"$regex": city, "$options": "i"}
        
        total = await db.business_profiles.count_documents(query)
        
        skip = (page - 1) * limit
        profiles = await db.business_profiles.find(query, {"_id": 0}) \
            .sort("created_at", -1) \
            .skip(skip) \
            .limit(limit) \
            .to_list(length=limit)
        
        # Enrich with user data
        for profile in profiles:
            user = await db.users.find_one(
                {"user_id": profile["user_id"]},
                {"_id": 0, "name": 1, "picture": 1}
            )
            profile["user"] = user
            
            # Get listing count
            profile["total_listings"] = await db.listings.count_documents({
                "user_id": profile["user_id"],
                "status": "active"
            })
        
        return {
            "profiles": profiles,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }
    
    @router.get("/featured")
    async def get_featured_sellers(
        request: Request,
        limit: int = 8
    ):
        """Get featured verified sellers for homepage display (Premium first, then Verified)"""
        # First get premium verified profiles
        premium_profiles = await db.business_profiles.find(
            {
                "is_active": True,
                "is_verified": True,
                "is_premium": True,
                "$or": [
                    {"premium_expires_at": None},
                    {"premium_expires_at": {"$gt": datetime.now(timezone.utc)}}
                ]
            },
            {"_id": 0}
        ).sort([("total_views", -1), ("created_at", -1)]).limit(limit).to_list(length=limit)
        
        # If we don't have enough premium, fill with regular verified
        remaining = limit - len(premium_profiles)
        verified_profiles = []
        
        if remaining > 0:
            premium_ids = [p["id"] for p in premium_profiles]
            verified_profiles = await db.business_profiles.find(
                {
                    "is_active": True,
                    "is_verified": True,
                    "id": {"$nin": premium_ids},
                    "$or": [
                        {"is_premium": False},
                        {"is_premium": {"$exists": False}}
                    ]
                },
                {"_id": 0}
            ).sort([("total_views", -1), ("created_at", -1)]).limit(remaining).to_list(length=remaining)
        
        all_profiles = premium_profiles + verified_profiles
        
        # Enrich with user data and listing count
        for profile in all_profiles:
            user = await db.users.find_one(
                {"user_id": profile["user_id"]},
                {"_id": 0, "name": 1, "picture": 1, "rating": 1, "total_ratings": 1}
            )
            profile["user"] = user
            profile["total_listings"] = await db.listings.count_documents({
                "user_id": profile["user_id"],
                "status": "active"
            })
            # Mark verification tier for UI
            profile["verification_tier"] = profile.get("verification_tier", "verified")
            if profile.get("is_premium"):
                profile["verification_tier"] = "premium"
        
        return {
            "sellers": all_profiles,
            "total": len(all_profiles),
            "premium_count": len(premium_profiles),
            "verified_count": len(verified_profiles)
        }
    
    # =========================================================================
    # AUTHENTICATED USER ENDPOINTS
    # =========================================================================
    
    @router.get("/me")
    async def get_my_profile(request: Request, user: dict = Depends(require_auth)):
        """Get the current user's business profile"""
        profile = await db.business_profiles.find_one(
            {"user_id": user["user_id"]},
            {"_id": 0}
        )
        
        if not profile:
            return {"has_profile": False, "profile": None}
        
        return {"has_profile": True, "profile": profile}
    
    @router.post("/")
    async def create_profile(
        data: BusinessProfileCreate,
        request: Request,
        user: dict = Depends(require_auth)
    ):
        """Create a new business profile"""
        # Check if user already has a profile
        existing = await db.business_profiles.find_one({"user_id": user["user_id"]})
        if existing:
            raise HTTPException(
                status_code=400,
                detail="You already have a business profile"
            )
        
        # Generate unique identifier
        identifier = generate_identifier(data.business_name)
        identifier = await ensure_unique_identifier(db, identifier)
        
        now = datetime.now(timezone.utc)
        
        profile = {
            "id": str(uuid.uuid4()),
            "user_id": user["user_id"],
            "business_name": data.business_name,
            "identifier": identifier,
            "description": data.description,
            "logo_url": None,
            "cover_url": None,
            "brand_color": data.brand_color or "#2E7D32",
            "primary_categories": data.primary_categories,
            "opening_hours": [h.model_dump() for h in data.opening_hours] if data.opening_hours else [],
            "social_links": data.social_links.model_dump() if data.social_links else None,
            "phone": data.phone,
            "email": data.email,
            "address": data.address,
            "city": data.city,
            "country": data.country,
            "is_verified": False,
            "is_premium": False,
            "verification_tier": "none",  # none, verified, premium
            "verification_status": "none",
            "verification_requested_at": None,
            "verified_at": None,
            "premium_expires_at": None,
            "is_active": True,
            "total_views": 0,
            "created_at": now,
            "updated_at": now
        }
        
        await db.business_profiles.insert_one(profile)
        
        # Remove MongoDB _id before returning
        profile.pop("_id", None)
        
        logger.info(f"Business profile created: {profile['id']} for user {user['user_id']}")
        
        return profile
    
    @router.put("/me")
    async def update_profile(
        data: BusinessProfileUpdate,
        request: Request,
        user: dict = Depends(require_auth)
    ):
        """Update the current user's business profile"""
        profile = await db.business_profiles.find_one({"user_id": user["user_id"]})
        
        if not profile:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        update_data = {"updated_at": datetime.now(timezone.utc)}
        
        if data.business_name is not None:
            update_data["business_name"] = data.business_name
            # Update identifier if name changed
            new_identifier = generate_identifier(data.business_name)
            new_identifier = await ensure_unique_identifier(db, new_identifier, profile["id"])
            update_data["identifier"] = new_identifier
        
        if data.description is not None:
            update_data["description"] = data.description
        if data.brand_color is not None:
            update_data["brand_color"] = data.brand_color
        if data.primary_categories is not None:
            update_data["primary_categories"] = data.primary_categories
        if data.opening_hours is not None:
            update_data["opening_hours"] = [h.model_dump() for h in data.opening_hours]
        if data.social_links is not None:
            update_data["social_links"] = data.social_links.model_dump()
        if data.phone is not None:
            update_data["phone"] = data.phone
        if data.email is not None:
            update_data["email"] = data.email
        if data.address is not None:
            update_data["address"] = data.address
        if data.city is not None:
            update_data["city"] = data.city
        if data.country is not None:
            update_data["country"] = data.country
        
        await db.business_profiles.update_one(
            {"id": profile["id"]},
            {"$set": update_data}
        )
        
        updated = await db.business_profiles.find_one(
            {"id": profile["id"]},
            {"_id": 0}
        )
        
        return updated
    
    @router.post("/me/logo")
    async def upload_logo(
        request: Request,
        file: UploadFile = File(...),
        user: dict = Depends(require_auth)
    ):
        """Upload business logo"""
        profile = await db.business_profiles.find_one({"user_id": user["user_id"]})
        
        if not profile:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and encode as base64
        contents = await file.read()
        if len(contents) > 5 * 1024 * 1024:  # 5MB limit
            raise HTTPException(status_code=400, detail="File too large (max 5MB)")
        
        base64_image = base64.b64encode(contents).decode('utf-8')
        logo_url = f"data:{file.content_type};base64,{base64_image}"
        
        await db.business_profiles.update_one(
            {"id": profile["id"]},
            {
                "$set": {
                    "logo_url": logo_url,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        return {"logo_url": logo_url}
    
    @router.post("/me/cover")
    async def upload_cover(
        request: Request,
        file: UploadFile = File(...),
        user: dict = Depends(require_auth)
    ):
        """Upload business cover image"""
        profile = await db.business_profiles.find_one({"user_id": user["user_id"]})
        
        if not profile:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and encode as base64
        contents = await file.read()
        if len(contents) > 10 * 1024 * 1024:  # 10MB limit for cover
            raise HTTPException(status_code=400, detail="File too large (max 10MB)")
        
        base64_image = base64.b64encode(contents).decode('utf-8')
        cover_url = f"data:{file.content_type};base64,{base64_image}"
        
        await db.business_profiles.update_one(
            {"id": profile["id"]},
            {
                "$set": {
                    "cover_url": cover_url,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        return {"cover_url": cover_url}
    
    # =========================================================================
    # GALLERY ENDPOINTS
    # =========================================================================
    
    @router.get("/me/gallery")
    async def get_gallery(request: Request, user: dict = Depends(require_auth)):
        """Get business profile gallery (images and videos)"""
        profile = await db.business_profiles.find_one({"user_id": user["user_id"]})
        
        if not profile:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        return {
            "images": profile.get("gallery_images", []),
            "videos": profile.get("gallery_videos", [])
        }
    
    @router.post("/me/gallery/image")
    async def add_gallery_image(
        request: Request,
        file: UploadFile = File(...),
        caption: Optional[str] = Form(None),
        user: dict = Depends(require_auth)
    ):
        """Add image to business profile gallery"""
        profile = await db.business_profiles.find_one({"user_id": user["user_id"]})
        
        if not profile:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        # Check gallery limit (max 20 images)
        existing_images = profile.get("gallery_images", [])
        if len(existing_images) >= 20:
            raise HTTPException(status_code=400, detail="Gallery limit reached (max 20 images)")
        
        contents = await file.read()
        if len(contents) > 5 * 1024 * 1024:  # 5MB limit per image
            raise HTTPException(status_code=400, detail="Image too large (max 5MB)")
        
        base64_image = base64.b64encode(contents).decode('utf-8')
        image_url = f"data:{file.content_type};base64,{base64_image}"
        
        now = datetime.now(timezone.utc)
        image_entry = {
            "id": str(uuid.uuid4()),
            "url": image_url,
            "caption": caption,
            "order": len(existing_images),
            "created_at": now.isoformat()
        }
        
        await db.business_profiles.update_one(
            {"id": profile["id"]},
            {
                "$push": {"gallery_images": image_entry},
                "$set": {"updated_at": now}
            }
        )
        
        return {"image": image_entry}
    
    @router.delete("/me/gallery/image/{image_id}")
    async def delete_gallery_image(
        image_id: str,
        request: Request,
        user: dict = Depends(require_auth)
    ):
        """Delete image from business profile gallery"""
        profile = await db.business_profiles.find_one({"user_id": user["user_id"]})
        
        if not profile:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        await db.business_profiles.update_one(
            {"id": profile["id"]},
            {
                "$pull": {"gallery_images": {"id": image_id}},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
        
        return {"message": "Image deleted"}
    
    @router.post("/me/gallery/video")
    async def add_gallery_video(
        request: Request,
        url: str = Body(..., embed=True),
        title: Optional[str] = Body(None, embed=True),
        user: dict = Depends(require_auth)
    ):
        """Add video link to business profile gallery (YouTube/Vimeo)"""
        profile = await db.business_profiles.find_one({"user_id": user["user_id"]})
        
        if not profile:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        # Check gallery limit (max 10 videos)
        existing_videos = profile.get("gallery_videos", [])
        if len(existing_videos) >= 10:
            raise HTTPException(status_code=400, detail="Video gallery limit reached (max 10 videos)")
        
        # Validate URL is YouTube or Vimeo
        video_url = url.strip()
        is_youtube = "youtube.com" in video_url or "youtu.be" in video_url
        is_vimeo = "vimeo.com" in video_url
        
        if not (is_youtube or is_vimeo):
            raise HTTPException(status_code=400, detail="Only YouTube and Vimeo links are supported")
        
        # Extract thumbnail for YouTube
        thumbnail = None
        if is_youtube:
            video_id = None
            if "youtu.be/" in video_url:
                video_id = video_url.split("youtu.be/")[1].split("?")[0]
            elif "v=" in video_url:
                video_id = video_url.split("v=")[1].split("&")[0]
            if video_id:
                thumbnail = f"https://img.youtube.com/vi/{video_id}/mqdefault.jpg"
        
        now = datetime.now(timezone.utc)
        video_entry = {
            "id": str(uuid.uuid4()),
            "url": video_url,
            "title": title,
            "thumbnail": thumbnail,
            "order": len(existing_videos),
            "created_at": now.isoformat()
        }
        
        await db.business_profiles.update_one(
            {"id": profile["id"]},
            {
                "$push": {"gallery_videos": video_entry},
                "$set": {"updated_at": now}
            }
        )
        
        return {"video": video_entry}
    
    @router.delete("/me/gallery/video/{video_id}")
    async def delete_gallery_video(
        video_id: str,
        request: Request,
        user: dict = Depends(require_auth)
    ):
        """Delete video from business profile gallery"""
        profile = await db.business_profiles.find_one({"user_id": user["user_id"]})
        
        if not profile:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        await db.business_profiles.update_one(
            {"id": profile["id"]},
            {
                "$pull": {"gallery_videos": {"id": video_id}},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
        
        return {"message": "Video deleted"}
    
    @router.post("/me/request-verification")
    async def request_verification(
        data: VerificationRequest,
        request: Request,
        user: dict = Depends(require_auth)
    ):
        """Request verification for business profile"""
        profile = await db.business_profiles.find_one({"user_id": user["user_id"]})
        
        if not profile:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        if profile.get("is_verified"):
            raise HTTPException(status_code=400, detail="Profile is already verified")
        
        if profile.get("verification_status") == "pending":
            raise HTTPException(status_code=400, detail="Verification request already pending")
        
        now = datetime.now(timezone.utc)
        
        await db.business_profiles.update_one(
            {"id": profile["id"]},
            {
                "$set": {
                    "verification_status": "pending",
                    "verification_requested_at": now,
                    "verification_message": data.message,
                    "updated_at": now
                }
            }
        )
        
        # Create notification for admins
        await db.admin_notifications.insert_one({
            "id": str(uuid.uuid4()),
            "type": "verification_request",
            "title": "New Verification Request",
            "message": f"Business '{profile['business_name']}' has requested verification",
            "profile_id": profile["id"],
            "user_id": user["user_id"],
            "is_read": False,
            "created_at": now
        })
        
        return {"message": "Verification request submitted", "status": "pending"}
    
    @router.delete("/me")
    async def delete_profile(request: Request, user: dict = Depends(require_auth)):
        """Delete the current user's business profile"""
        profile = await db.business_profiles.find_one({"user_id": user["user_id"]})
        
        if not profile:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        # Soft delete by setting is_active to False
        await db.business_profiles.update_one(
            {"id": profile["id"]},
            {
                "$set": {
                    "is_active": False,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        return {"message": "Business profile deleted"}
    
    return router


# =============================================================================
# ADMIN ROUTER
# =============================================================================

def create_business_profile_admin_router(db, require_admin):
    """
    Create the admin router for business profile management
    
    Args:
        db: MongoDB database instance
        require_admin: Function to require admin authentication
    
    Returns:
        APIRouter with admin business profile endpoints
    """
    router = APIRouter(prefix="/admin/business-profiles", tags=["Admin - Business Profiles"])
    
    @router.get("/")
    async def list_all_profiles(
        request: Request,
        status: Optional[str] = None,  # pending, approved, rejected, none
        verified: Optional[bool] = None,
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
        admin: dict = Depends(require_admin)
    ):
        """List all business profiles with filters"""
        query = {}
        
        if status:
            query["verification_status"] = status
        if verified is not None:
            query["is_verified"] = verified
        if search:
            query["$or"] = [
                {"business_name": {"$regex": search, "$options": "i"}},
                {"identifier": {"$regex": search, "$options": "i"}}
            ]
        
        total = await db.business_profiles.count_documents(query)
        
        skip = (page - 1) * limit
        profiles = await db.business_profiles.find(query, {"_id": 0}) \
            .sort("created_at", -1) \
            .skip(skip) \
            .limit(limit) \
            .to_list(length=limit)
        
        # Enrich with user data
        for profile in profiles:
            user = await db.users.find_one(
                {"user_id": profile["user_id"]},
                {"_id": 0, "name": 1, "email": 1, "picture": 1}
            )
            profile["user"] = user
        
        return {
            "profiles": profiles,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }
    
    @router.get("/verification-requests")
    async def get_verification_requests(
        request: Request,
        page: int = 1,
        limit: int = 20,
        admin: dict = Depends(require_admin)
    ):
        """Get pending verification requests"""
        query = {"verification_status": "pending"}
        
        total = await db.business_profiles.count_documents(query)
        
        skip = (page - 1) * limit
        profiles = await db.business_profiles.find(query, {"_id": 0}) \
            .sort("verification_requested_at", -1) \
            .skip(skip) \
            .limit(limit) \
            .to_list(length=limit)
        
        # Enrich with user data
        for profile in profiles:
            user = await db.users.find_one(
                {"user_id": profile["user_id"]},
                {"_id": 0, "name": 1, "email": 1, "picture": 1}
            )
            profile["user"] = user
        
        return {
            "profiles": profiles,
            "total": total,
            "page": page,
            "limit": limit
        }
    
    @router.get("/{profile_id}")
    async def get_profile_details(
        profile_id: str,
        request: Request,
        admin: dict = Depends(require_admin)
    ):
        """Get detailed business profile info"""
        profile = await db.business_profiles.find_one(
            {"id": profile_id},
            {"_id": 0}
        )
        
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        # Get user info
        user = await db.users.find_one(
            {"user_id": profile["user_id"]},
            {"_id": 0}
        )
        profile["user"] = user
        
        # Get listing count and stats
        profile["total_listings"] = await db.listings.count_documents({
            "user_id": profile["user_id"]
        })
        profile["active_listings"] = await db.listings.count_documents({
            "user_id": profile["user_id"],
            "status": "active"
        })
        
        return profile
    
    @router.post("/{profile_id}/verify")
    async def verify_profile(
        profile_id: str,
        data: AdminVerificationAction,
        request: Request,
        admin: dict = Depends(require_admin)
    ):
        """Approve or reject verification request (standard verification)"""
        profile = await db.business_profiles.find_one({"id": profile_id})
        
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        now = datetime.now(timezone.utc)
        
        if data.action == "approve":
            update_data = {
                "is_verified": True,
                "verification_tier": "verified",
                "verification_status": "approved",
                "verified_at": now,
                "verified_by": admin.get("user_id") or admin.get("email"),
                "updated_at": now
            }
            message = "Profile verified successfully"
            notification_msg = "Your business profile has been verified! You now have a Verified Business badge."
        elif data.action == "reject":
            update_data = {
                "is_verified": False,
                "verification_tier": "none",
                "verification_status": "rejected",
                "rejection_reason": data.reason,
                "rejected_at": now,
                "rejected_by": admin.get("user_id") or admin.get("email"),
                "updated_at": now
            }
            message = "Verification rejected"
            notification_msg = f"Your business profile verification was rejected. Reason: {data.reason or 'Not specified'}"
        else:
            raise HTTPException(status_code=400, detail="Invalid action")
        
        await db.business_profiles.update_one(
            {"id": profile_id},
            {"$set": update_data}
        )
        
        # Notify user via in-app notification
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": profile["user_id"],
            "type": "verification_update",
            "title": "Verification Update",
            "message": notification_msg,
            "is_read": False,
            "created_at": now
        })
        
        # Send email notification
        try:
            from subscription_services import SubscriptionEmailService
            from sendgrid import SendGridAPIClient
            import os
            
            sendgrid_api_key = os.environ.get("SENDGRID_API_KEY")
            if sendgrid_api_key:
                sg_client = SendGridAPIClient(sendgrid_api_key)
                email_service = SubscriptionEmailService(db, sg_client)
                
                user = await db.users.find_one({"user_id": profile["user_id"]})
                if user and user.get("email"):
                    if data.action == "approve":
                        await email_service.send_profile_verified(
                            user["email"],
                            profile["business_name"],
                            profile.get("identifier") or profile.get("slug", profile_id)
                        )
                        logger.info(f"Sent verification email to {user['email']}")
                    elif data.action == "reject":
                        await email_service.send_profile_verification_rejected(
                            user["email"],
                            profile["business_name"],
                            data.reason
                        )
                        logger.info(f"Sent rejection email to {user['email']}")
        except Exception as e:
            logger.warning(f"Failed to send verification email: {e}")
        
        logger.info(f"Profile {profile_id} verification: {data.action} by {admin.get('email')}")
        
        return {"message": message}
    
    @router.post("/{profile_id}/upgrade-premium")
    async def upgrade_to_premium(
        profile_id: str,
        request: Request,
        admin: dict = Depends(require_admin),
        duration_days: int = 30
    ):
        """Upgrade a verified profile to Premium tier (requires admin approval + payment)"""
        profile = await db.business_profiles.find_one({"id": profile_id})
        
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        if not profile.get("is_verified"):
            raise HTTPException(status_code=400, detail="Profile must be verified first before upgrading to Premium")
        
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=duration_days)
        
        update_data = {
            "is_premium": True,
            "verification_tier": "premium",
            "premium_expires_at": expires_at,
            "premium_upgraded_at": now,
            "premium_upgraded_by": admin.get("user_id") or admin.get("email"),
            "updated_at": now
        }
        
        await db.business_profiles.update_one(
            {"id": profile_id},
            {"$set": update_data}
        )
        
        # Notify user
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": profile["user_id"],
            "type": "premium_upgrade",
            "title": "Premium Business Activated",
            "message": f"Congratulations! Your business profile has been upgraded to Premium Verified Business. Your premium status is valid until {expires_at.strftime('%Y-%m-%d')}.",
            "is_read": False,
            "created_at": now
        })
        
        logger.info(f"Profile {profile_id} upgraded to premium by {admin.get('email')}, expires {expires_at}")
        
        return {
            "message": "Profile upgraded to Premium successfully",
            "premium_expires_at": expires_at.isoformat(),
            "verification_tier": "premium"
        }
    
    @router.post("/{profile_id}/revoke-premium")
    async def revoke_premium(
        profile_id: str,
        request: Request,
        admin: dict = Depends(require_admin)
    ):
        """Revoke Premium status (downgrades to regular verified)"""
        profile = await db.business_profiles.find_one({"id": profile_id})
        
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        now = datetime.now(timezone.utc)
        
        update_data = {
            "is_premium": False,
            "verification_tier": "verified" if profile.get("is_verified") else "none",
            "premium_expires_at": None,
            "premium_revoked_at": now,
            "premium_revoked_by": admin.get("user_id") or admin.get("email"),
            "updated_at": now
        }
        
        await db.business_profiles.update_one(
            {"id": profile_id},
            {"$set": update_data}
        )
        
        # Notify user
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": profile["user_id"],
            "type": "premium_revoked",
            "title": "Premium Status Changed",
            "message": "Your Premium Business status has ended. You still have a Verified Business badge.",
            "is_read": False,
            "created_at": now
        })
        
        logger.info(f"Profile {profile_id} premium revoked by {admin.get('email')}")
        
        return {
            "message": "Premium status revoked",
            "verification_tier": update_data["verification_tier"]
        }
    
    @router.post("/{profile_id}/toggle-verified")
    async def toggle_verified(
        profile_id: str,
        request: Request,
        admin: dict = Depends(require_admin)
    ):
        """Directly toggle verified status (without request)"""
        profile = await db.business_profiles.find_one({"id": profile_id})
        
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        new_status = not profile.get("is_verified", False)
        now = datetime.now(timezone.utc)
        
        update_data = {
            "is_verified": new_status,
            "verification_status": "approved" if new_status else "none",
            "updated_at": now
        }
        
        if new_status:
            update_data["verified_at"] = now
            update_data["verified_by"] = admin.get("user_id") or admin.get("email")
        
        await db.business_profiles.update_one(
            {"id": profile_id},
            {"$set": update_data}
        )
        
        return {
            "message": f"Profile {'verified' if new_status else 'unverified'}",
            "is_verified": new_status
        }
    
    @router.post("/{profile_id}/toggle-active")
    async def toggle_active(
        profile_id: str,
        request: Request,
        admin: dict = Depends(require_admin)
    ):
        """Toggle profile active status"""
        profile = await db.business_profiles.find_one({"id": profile_id})
        
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        new_status = not profile.get("is_active", True)
        
        await db.business_profiles.update_one(
            {"id": profile_id},
            {
                "$set": {
                    "is_active": new_status,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        return {
            "message": f"Profile {'activated' if new_status else 'deactivated'}",
            "is_active": new_status
        }
    
    @router.delete("/{profile_id}")
    async def delete_profile(
        profile_id: str,
        request: Request,
        admin: dict = Depends(require_admin)
    ):
        """Permanently delete a business profile"""
        result = await db.business_profiles.delete_one({"id": profile_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        logger.info(f"Profile {profile_id} deleted by {admin.get('email')}")
        
        return {"message": "Profile deleted permanently"}
    
    @router.get("/stats/overview")
    async def get_stats(request: Request, admin: dict = Depends(require_admin)):
        """Get business profile statistics"""
        total = await db.business_profiles.count_documents({})
        active = await db.business_profiles.count_documents({"is_active": True})
        verified = await db.business_profiles.count_documents({"is_verified": True})
        pending = await db.business_profiles.count_documents({"verification_status": "pending"})
        
        return {
            "total": total,
            "active": active,
            "verified": verified,
            "pending_verification": pending
        }
    
    return router
