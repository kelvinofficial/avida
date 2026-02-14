"""
AI SEO Routes
API endpoints for AI-powered SEO generation
"""

import os
import jwt as pyjwt
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

# Admin JWT settings (must match server.py)
ADMIN_JWT_SECRET = os.environ.get("ADMIN_JWT_SECRET", "admin-super-secret-key-for-jwt-auth-marketplace-2024")
ADMIN_JWT_ALGORITHM = "HS256"


class GenerateSEORequest(BaseModel):
    """Request model for generating SEO for a single listing"""
    title: str = Field(..., min_length=1)
    description: str = Field(default="")
    price: float = Field(..., ge=0)
    currency: str = Field(default="EUR")
    category: Optional[str] = None
    subcategory: Optional[str] = None
    condition: Optional[str] = None
    location: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None


class OptimizeSEORequest(BaseModel):
    """Request model for optimizing existing SEO"""
    current_meta_title: str
    current_meta_description: str
    listing_title: str
    listing_description: str
    price: float
    currency: str = "EUR"


class GenerateCategorySEORequest(BaseModel):
    """Request model for category SEO generation"""
    category_name: str
    category_id: str
    listing_count: int = 0


class ApplyAISEORequest(BaseModel):
    """Request to apply AI-generated SEO to a listing"""
    listing_id: str
    meta_title: str
    meta_description: str
    og_title: Optional[str] = None
    og_description: Optional[str] = None
    keywords: Optional[List[str]] = None


def create_ai_seo_router(db, get_current_user):
    """Create AI SEO router with dependencies"""
    router = APIRouter(prefix="/ai-seo", tags=["AI SEO"])
    
    listings_collection = db.listings
    categories_collection = db.categories
    ai_seo_history_collection = db.ai_seo_history
    
    async def require_admin(request: Request):
        """Require admin access for AI SEO endpoints"""
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        admin_emails = ["admin@marketplace.com", "admin@example.com", "admin@test.com"]
        if user.email not in admin_emails and not getattr(user, 'is_admin', False):
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    
    @router.post("/generate")
    async def generate_seo(request: GenerateSEORequest, admin=Depends(require_admin)):
        """
        Generate AI-powered SEO suggestions for listing data
        """
        try:
            from utils.ai_seo_service import ai_seo_service
            
            result = await ai_seo_service.generate_seo_suggestions(
                title=request.title,
                description=request.description,
                price=request.price,
                currency=request.currency,
                category=request.category,
                subcategory=request.subcategory,
                condition=request.condition,
                location=request.location,
                attributes=request.attributes
            )
            
            return {
                "success": True,
                "seo_suggestions": result
            }
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logger.error(f"AI SEO generation error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")
    
    @router.post("/generate-for-listing/{listing_id}")
    async def generate_seo_for_listing(listing_id: str, admin=Depends(require_admin)):
        """
        Generate AI SEO suggestions for an existing listing by ID
        """
        # Get listing
        listing = await listings_collection.find_one({"id": listing_id})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        # Get category name
        category_name = None
        if listing.get("category_id"):
            category = await categories_collection.find_one({"id": listing["category_id"]})
            if category:
                category_name = category.get("name")
        
        # Build location string
        location = None
        if listing.get("location_data"):
            loc = listing["location_data"]
            parts = []
            if loc.get("city_name"):
                parts.append(loc["city_name"])
            if loc.get("region_name"):
                parts.append(loc["region_name"])
            location = ", ".join(parts)
        elif listing.get("location"):
            location = listing["location"]
        
        try:
            from utils.ai_seo_service import ai_seo_service
            
            result = await ai_seo_service.generate_seo_suggestions(
                title=listing.get("title", ""),
                description=listing.get("description", ""),
                price=listing.get("price", 0),
                currency=listing.get("currency", "EUR"),
                category=category_name,
                subcategory=listing.get("subcategory"),
                condition=listing.get("condition"),
                location=location,
                attributes=listing.get("attributes")
            )
            
            # Store in history
            await ai_seo_history_collection.insert_one({
                "listing_id": listing_id,
                "generated_at": datetime.now(timezone.utc),
                "suggestions": result,
                "applied": False
            })
            
            return {
                "success": True,
                "listing_id": listing_id,
                "current_seo": listing.get("seo_data"),
                "ai_suggestions": result
            }
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logger.error(f"AI SEO generation error for listing {listing_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")
    
    @router.post("/optimize")
    async def optimize_existing_seo(request: OptimizeSEORequest, admin=Depends(require_admin)):
        """
        Analyze and optimize existing SEO content
        """
        try:
            from utils.ai_seo_service import ai_seo_service
            
            result = await ai_seo_service.optimize_existing_seo(
                current_meta_title=request.current_meta_title,
                current_meta_description=request.current_meta_description,
                listing_title=request.listing_title,
                listing_description=request.listing_description,
                price=request.price,
                currency=request.currency
            )
            
            return {
                "success": True,
                "optimization": result
            }
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logger.error(f"AI SEO optimization error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"AI optimization failed: {str(e)}")
    
    @router.post("/apply/{listing_id}")
    async def apply_ai_seo(listing_id: str, request: ApplyAISEORequest, admin=Depends(require_admin)):
        """
        Apply AI-generated SEO to a listing
        """
        if request.listing_id != listing_id:
            raise HTTPException(status_code=400, detail="Listing ID mismatch")
        
        # Get listing
        listing = await listings_collection.find_one({"id": listing_id})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        # Build SEO data
        seo_data = {
            "meta_title": request.meta_title,
            "meta_description": request.meta_description,
            "og_title": request.og_title or request.meta_title,
            "og_description": request.og_description or request.meta_description,
            "keywords": request.keywords or [],
            "ai_generated": True,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Preserve og_image if exists
        if listing.get("seo_data", {}).get("og_image"):
            seo_data["og_image"] = listing["seo_data"]["og_image"]
        elif listing.get("images") and len(listing["images"]) > 0:
            seo_data["og_image"] = listing["images"][0]
        
        # Update listing
        await listings_collection.update_one(
            {"id": listing_id},
            {
                "$set": {
                    "seo_data": seo_data,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # Mark as applied in history
        await ai_seo_history_collection.update_many(
            {"listing_id": listing_id, "applied": False},
            {"$set": {"applied": True, "applied_at": datetime.now(timezone.utc)}}
        )
        
        return {
            "success": True,
            "listing_id": listing_id,
            "seo_data": seo_data
        }
    
    @router.post("/generate-category")
    async def generate_category_seo(request: GenerateCategorySEORequest, admin=Depends(require_admin)):
        """
        Generate AI SEO for a category page
        """
        try:
            from utils.ai_seo_service import ai_seo_service
            
            result = await ai_seo_service.generate_category_seo(
                category_name=request.category_name,
                category_id=request.category_id,
                listing_count=request.listing_count
            )
            
            return {
                "success": True,
                "category_id": request.category_id,
                "seo_suggestions": result
            }
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logger.error(f"Category SEO generation error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")
    
    @router.get("/history/{listing_id}")
    async def get_seo_history(listing_id: str, admin=Depends(require_admin)):
        """
        Get AI SEO generation history for a listing
        """
        cursor = ai_seo_history_collection.find(
            {"listing_id": listing_id}
        ).sort("generated_at", -1).limit(10)
        
        history = []
        async for doc in cursor:
            history.append({
                "generated_at": doc.get("generated_at"),
                "suggestions": doc.get("suggestions"),
                "applied": doc.get("applied", False),
                "applied_at": doc.get("applied_at")
            })
        
        return {
            "listing_id": listing_id,
            "history": history
        }
    
    @router.get("/stats")
    async def get_ai_seo_stats(admin=Depends(require_admin)):
        """
        Get AI SEO usage statistics
        """
        total_generated = await ai_seo_history_collection.count_documents({})
        total_applied = await ai_seo_history_collection.count_documents({"applied": True})
        
        # Get recent generation count (last 24 hours)
        from datetime import timedelta
        yesterday = datetime.now(timezone.utc) - timedelta(hours=24)
        recent_count = await ai_seo_history_collection.count_documents({
            "generated_at": {"$gte": yesterday}
        })
        
        # Get listings with AI-generated SEO
        ai_listings = await listings_collection.count_documents({
            "seo_data.ai_generated": True
        })
        
        return {
            "total_generations": total_generated,
            "total_applied": total_applied,
            "last_24h_generations": recent_count,
            "listings_with_ai_seo": ai_listings
        }
    
    return router
