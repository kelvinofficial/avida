"""
Business Profile Public API Routes
Endpoints for /api/business-profile (singular) - user's own business profile management.
"""

from fastapi import APIRouter, HTTPException, Request, Body
from datetime import datetime, timezone
from typing import Optional, List, Dict
from pydantic import BaseModel, Field
import uuid
import logging

logger = logging.getLogger(__name__)


class OpeningHours(BaseModel):
    day: str
    open: Optional[str] = None
    close: Optional[str] = None
    is_closed: bool = False


class SocialLinks(BaseModel):
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    twitter: Optional[str] = None
    linkedin: Optional[str] = None
    youtube: Optional[str] = None
    tiktok: Optional[str] = None
    whatsapp: Optional[str] = None
    website: Optional[str] = None


class BusinessProfileCreate(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)
    brand_color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    primary_categories: List[str] = Field(default_factory=list, max_length=5)
    opening_hours: List[OpeningHours] = Field(default_factory=list)
    social_links: Optional[SocialLinks] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None


class BusinessProfileUpdate(BaseModel):
    business_name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)
    brand_color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    primary_categories: Optional[List[str]] = Field(None, max_length=5)
    opening_hours: Optional[List[OpeningHours]] = None
    social_links: Optional[SocialLinks] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None


def create_business_profile_public_router(db, get_current_user):
    """Create business profile public router for /api/business-profile endpoints."""
    router = APIRouter(prefix="/business-profile", tags=["Business Profile"])
    
    async def require_auth(request: Request):
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        return user

    def generate_slug(business_name: str) -> str:
        """Generate a URL-friendly slug from business name"""
        import re
        slug = business_name.lower()
        slug = re.sub(r'[^a-z0-9\s-]', '', slug)
        slug = re.sub(r'[\s_]+', '-', slug)
        slug = re.sub(r'-+', '-', slug)
        slug = slug.strip('-')
        return slug[:50]

    # =========================================================================
    # MY PROFILE ENDPOINTS
    # =========================================================================
    
    @router.get("")
    async def get_my_business_profile(request: Request):
        """Get current user's business profile"""
        current_user = await require_auth(request)
        
        profile = await db.business_profiles.find_one(
            {"user_id": current_user.user_id},
            {"_id": 0}
        )
        
        if not profile:
            return {
                "has_profile": False,
                "message": "You don't have a business profile yet. Create one to get started.",
                "profile": None
            }
        
        # Get listing count
        listing_count = await db.listings.count_documents({
            "user_id": current_user.user_id,
            "status": "active"
        })
        profile["total_listings"] = listing_count
        
        return {
            "has_profile": True,
            "profile": profile
        }
    
    @router.post("")
    async def create_my_business_profile(
        request: Request,
        profile_data: BusinessProfileCreate
    ):
        """Create business profile for current user"""
        current_user = await require_auth(request)
        
        # Check if profile already exists
        existing = await db.business_profiles.find_one({"user_id": current_user.user_id})
        if existing:
            raise HTTPException(status_code=400, detail="You already have a business profile. Use PUT to update.")
        
        # Generate unique identifier
        base_slug = generate_slug(profile_data.business_name)
        slug = base_slug
        counter = 1
        while await db.business_profiles.find_one({"slug": slug}):
            slug = f"{base_slug}-{counter}"
            counter += 1
        
        profile_id = f"bp_{uuid.uuid4().hex[:12]}"
        identifier = f"shop-{uuid.uuid4().hex[:8]}"
        
        profile = {
            "id": profile_id,
            "identifier": identifier,
            "slug": slug,
            "user_id": current_user.user_id,
            "business_name": profile_data.business_name,
            "description": profile_data.description,
            "brand_color": profile_data.brand_color or "#4CAF50",
            "primary_categories": profile_data.primary_categories,
            "opening_hours": [h.dict() for h in profile_data.opening_hours] if profile_data.opening_hours else [],
            "social_links": profile_data.social_links.dict() if profile_data.social_links else {},
            "phone": profile_data.phone,
            "email": profile_data.email or current_user.email,
            "address": profile_data.address,
            "city": profile_data.city,
            "country": profile_data.country,
            "logo_url": None,
            "cover_url": None,
            "is_active": True,
            "is_verified": False,
            "verification_status": "unverified",
            "total_views": 0,
            "total_listings": 0,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.business_profiles.insert_one(profile)
        profile.pop("_id", None)
        
        return {
            "message": "Business profile created successfully",
            "profile": profile
        }
    
    @router.put("")
    async def update_my_business_profile(
        request: Request,
        profile_data: BusinessProfileUpdate
    ):
        """Update current user's business profile"""
        current_user = await require_auth(request)
        
        existing = await db.business_profiles.find_one({"user_id": current_user.user_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Business profile not found. Create one first.")
        
        update_data = {"updated_at": datetime.now(timezone.utc)}
        
        # Only update provided fields
        if profile_data.business_name is not None:
            update_data["business_name"] = profile_data.business_name
            # Update slug if name changed
            new_slug = generate_slug(profile_data.business_name)
            if new_slug != existing.get("slug"):
                counter = 1
                base_slug = new_slug
                while await db.business_profiles.find_one({"slug": new_slug, "id": {"$ne": existing["id"]}}):
                    new_slug = f"{base_slug}-{counter}"
                    counter += 1
                update_data["slug"] = new_slug
        
        if profile_data.description is not None:
            update_data["description"] = profile_data.description
        if profile_data.brand_color is not None:
            update_data["brand_color"] = profile_data.brand_color
        if profile_data.primary_categories is not None:
            update_data["primary_categories"] = profile_data.primary_categories
        if profile_data.opening_hours is not None:
            update_data["opening_hours"] = [h.dict() for h in profile_data.opening_hours]
        if profile_data.social_links is not None:
            update_data["social_links"] = profile_data.social_links.dict()
        if profile_data.phone is not None:
            update_data["phone"] = profile_data.phone
        if profile_data.email is not None:
            update_data["email"] = profile_data.email
        if profile_data.address is not None:
            update_data["address"] = profile_data.address
        if profile_data.city is not None:
            update_data["city"] = profile_data.city
        if profile_data.country is not None:
            update_data["country"] = profile_data.country
        if profile_data.logo_url is not None:
            update_data["logo_url"] = profile_data.logo_url
        if profile_data.cover_url is not None:
            update_data["cover_url"] = profile_data.cover_url
        
        await db.business_profiles.update_one(
            {"user_id": current_user.user_id},
            {"$set": update_data}
        )
        
        updated_profile = await db.business_profiles.find_one(
            {"user_id": current_user.user_id},
            {"_id": 0}
        )
        
        return {
            "message": "Business profile updated successfully",
            "profile": updated_profile
        }
    
    @router.delete("")
    async def delete_my_business_profile(request: Request):
        """Delete current user's business profile"""
        current_user = await require_auth(request)
        
        existing = await db.business_profiles.find_one({"user_id": current_user.user_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        # Soft delete - set inactive
        await db.business_profiles.update_one(
            {"user_id": current_user.user_id},
            {"$set": {"is_active": False, "deleted_at": datetime.now(timezone.utc)}}
        )
        
        return {"message": "Business profile deleted successfully"}
    
    # =========================================================================
    # ADDITIONAL ENDPOINTS
    # =========================================================================
    
    @router.get("/stats")
    async def get_my_profile_stats(request: Request):
        """Get statistics for current user's business profile"""
        current_user = await require_auth(request)
        
        profile = await db.business_profiles.find_one(
            {"user_id": current_user.user_id},
            {"_id": 0, "id": 1, "total_views": 1}
        )
        
        if not profile:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        # Get listing stats
        total_listings = await db.listings.count_documents({
            "user_id": current_user.user_id,
            "status": "active"
        })
        
        sold_listings = await db.listings.count_documents({
            "user_id": current_user.user_id,
            "status": "sold"
        })
        
        # Get review stats
        reviews = await db.reviews.find({"user_id": current_user.user_id}).to_list(1000)
        avg_rating = sum(r["rating"] for r in reviews) / len(reviews) if reviews else 0
        
        # Get follower count
        followers = await db.follows.count_documents({"following_id": current_user.user_id})
        
        return {
            "profile_views": profile.get("total_views", 0),
            "total_listings": total_listings,
            "sold_listings": sold_listings,
            "total_reviews": len(reviews),
            "average_rating": round(avg_rating, 1),
            "followers": followers
        }
    
    @router.post("/logo")
    async def update_profile_logo(
        request: Request,
        logo_url: str = Body(..., embed=True)
    ):
        """Update business profile logo"""
        current_user = await require_auth(request)
        
        result = await db.business_profiles.update_one(
            {"user_id": current_user.user_id},
            {"$set": {"logo_url": logo_url, "updated_at": datetime.now(timezone.utc)}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        return {"message": "Logo updated successfully", "logo_url": logo_url}
    
    @router.post("/cover")
    async def update_profile_cover(
        request: Request,
        cover_url: str = Body(..., embed=True)
    ):
        """Update business profile cover image"""
        current_user = await require_auth(request)
        
        result = await db.business_profiles.update_one(
            {"user_id": current_user.user_id},
            {"$set": {"cover_url": cover_url, "updated_at": datetime.now(timezone.utc)}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        return {"message": "Cover image updated successfully", "cover_url": cover_url}
    
    return router
