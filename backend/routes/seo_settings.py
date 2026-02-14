"""
SEO Settings Routes
Allows admins to manage global and page-specific SEO settings
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId


def create_seo_settings_router(db, require_auth, require_admin):
    router = APIRouter(prefix="/seo-settings", tags=["SEO Settings"])
    
    # ============ Pydantic Models ============
    
    class GlobalSEOSettings(BaseModel):
        site_name: str = "Avida Marketplace"
        site_description: str = "Your local marketplace to buy and sell vehicles, properties, electronics, fashion, and more."
        default_og_image: Optional[str] = None
        default_keywords: List[str] = []
        twitter_handle: Optional[str] = None
        facebook_app_id: Optional[str] = None
        google_site_verification: Optional[str] = None
        robots_txt_custom: Optional[str] = None
        enable_sitemap: bool = True
        enable_structured_data: bool = True
        
    class PageSEOOverride(BaseModel):
        page_type: str  # 'category', 'listing', 'profile', 'static'
        page_id: Optional[str] = None  # category_id, listing_id, etc.
        title_template: Optional[str] = None  # e.g., "{title} | {site_name}"
        description_template: Optional[str] = None
        og_image: Optional[str] = None
        keywords: List[str] = []
        no_index: bool = False
        canonical_url: Optional[str] = None
        
    class CategorySEOSettings(BaseModel):
        category_id: str
        title: Optional[str] = None
        description: Optional[str] = None
        og_image: Optional[str] = None
        keywords: List[str] = []
        
    class CreatePageOverrideRequest(BaseModel):
        page_type: str
        page_id: Optional[str] = None
        title_template: Optional[str] = None
        description_template: Optional[str] = None
        og_image: Optional[str] = None
        keywords: List[str] = []
        no_index: bool = False
        canonical_url: Optional[str] = None
        
    class UpdateGlobalSettingsRequest(BaseModel):
        site_name: Optional[str] = None
        site_description: Optional[str] = None
        default_og_image: Optional[str] = None
        default_keywords: Optional[List[str]] = None
        twitter_handle: Optional[str] = None
        facebook_app_id: Optional[str] = None
        google_site_verification: Optional[str] = None
        robots_txt_custom: Optional[str] = None
        enable_sitemap: Optional[bool] = None
        enable_structured_data: Optional[bool] = None
        
    # ============ Helper Functions ============
    
    def serialize_doc(doc: dict) -> dict:
        """Convert MongoDB document to JSON-serializable dict"""
        if doc is None:
            return None
        result = dict(doc)
        if '_id' in result:
            result['id'] = str(result.pop('_id'))
        for key, value in result.items():
            if isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
        return result
    
    # ============ Global SEO Settings Endpoints ============
    
    @router.get("/global")
    async def get_global_seo_settings():
        """Get global SEO settings (public endpoint for frontend)"""
        settings = db.seo_settings.find_one({"type": "global"})
        
        if not settings:
            # Return defaults if no settings exist
            return {
                "site_name": "Avida Marketplace",
                "site_description": "Your local marketplace to buy and sell vehicles, properties, electronics, fashion, and more.",
                "default_og_image": None,
                "default_keywords": ["marketplace", "buy", "sell", "local", "classifieds"],
                "twitter_handle": None,
                "facebook_app_id": None,
                "google_site_verification": None,
                "robots_txt_custom": None,
                "enable_sitemap": True,
                "enable_structured_data": True,
            }
        
        return serialize_doc(settings)
    
    @router.put("/global", dependencies=[Depends(require_admin)])
    async def update_global_seo_settings(request: UpdateGlobalSettingsRequest):
        """Update global SEO settings (admin only)"""
        update_data = {k: v for k, v in request.dict().items() if v is not None}
        update_data["type"] = "global"
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        result = db.seo_settings.update_one(
            {"type": "global"},
            {"$set": update_data},
            upsert=True
        )
        
        settings = db.seo_settings.find_one({"type": "global"})
        return serialize_doc(settings)
    
    # ============ Page Override Endpoints ============
    
    @router.get("/overrides")
    async def get_all_page_overrides():
        """Get all page SEO overrides (public for frontend)"""
        overrides = list(db.seo_page_overrides.find())
        return [serialize_doc(o) for o in overrides]
    
    @router.get("/overrides/{page_type}")
    async def get_page_overrides_by_type(page_type: str):
        """Get SEO overrides for a specific page type"""
        overrides = list(db.seo_page_overrides.find({"page_type": page_type}))
        return [serialize_doc(o) for o in overrides]
    
    @router.get("/overrides/{page_type}/{page_id}")
    async def get_page_override(page_type: str, page_id: str):
        """Get SEO override for a specific page"""
        override = db.seo_page_overrides.find_one({
            "page_type": page_type,
            "page_id": page_id
        })
        
        if not override:
            return None
            
        return serialize_doc(override)
    
    @router.post("/overrides", dependencies=[Depends(require_admin)])
    async def create_page_override(request: CreatePageOverrideRequest):
        """Create a new page SEO override (admin only)"""
        # Check if override already exists
        existing = db.seo_page_overrides.find_one({
            "page_type": request.page_type,
            "page_id": request.page_id
        })
        
        if existing:
            raise HTTPException(status_code=400, detail="Override already exists for this page")
        
        override_data = request.dict()
        override_data["created_at"] = datetime.now(timezone.utc)
        override_data["updated_at"] = datetime.now(timezone.utc)
        
        result = db.seo_page_overrides.insert_one(override_data)
        override = db.seo_page_overrides.find_one({"_id": result.inserted_id})
        
        return serialize_doc(override)
    
    @router.put("/overrides/{override_id}", dependencies=[Depends(require_admin)])
    async def update_page_override(override_id: str, request: CreatePageOverrideRequest):
        """Update a page SEO override (admin only)"""
        try:
            obj_id = ObjectId(override_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid override ID")
        
        update_data = request.dict()
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        result = db.seo_page_overrides.update_one(
            {"_id": obj_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Override not found")
        
        override = db.seo_page_overrides.find_one({"_id": obj_id})
        return serialize_doc(override)
    
    @router.delete("/overrides/{override_id}", dependencies=[Depends(require_admin)])
    async def delete_page_override(override_id: str):
        """Delete a page SEO override (admin only)"""
        try:
            obj_id = ObjectId(override_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid override ID")
        
        result = db.seo_page_overrides.delete_one({"_id": obj_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Override not found")
        
        return {"success": True, "message": "Override deleted"}
    
    # ============ Category SEO Endpoints ============
    
    @router.get("/categories")
    async def get_all_category_seo():
        """Get SEO settings for all categories"""
        category_overrides = list(db.seo_page_overrides.find({"page_type": "category"}))
        return [serialize_doc(o) for o in category_overrides]
    
    @router.get("/categories/{category_id}")
    async def get_category_seo(category_id: str):
        """Get SEO settings for a specific category"""
        override = db.seo_page_overrides.find_one({
            "page_type": "category",
            "page_id": category_id
        })
        
        if not override:
            # Return defaults based on category
            categories = db.categories.find_one({"id": category_id})
            if categories:
                return {
                    "category_id": category_id,
                    "title": f"{categories.get('name', category_id)} for Sale",
                    "description": f"Browse {categories.get('name', category_id).lower()} listings on Avida. Find great deals near you.",
                    "keywords": [categories.get('name', '').lower(), "buy", "sell", "local"]
                }
            return None
        
        return serialize_doc(override)
    
    @router.put("/categories/{category_id}", dependencies=[Depends(require_admin)])
    async def update_category_seo(category_id: str, request: CategorySEOSettings):
        """Update SEO settings for a specific category (admin only)"""
        update_data = {
            "page_type": "category",
            "page_id": category_id,
            "title_template": request.title,
            "description_template": request.description,
            "og_image": request.og_image,
            "keywords": request.keywords,
            "updated_at": datetime.now(timezone.utc)
        }
        
        result = db.seo_page_overrides.update_one(
            {"page_type": "category", "page_id": category_id},
            {"$set": update_data},
            upsert=True
        )
        
        override = db.seo_page_overrides.find_one({
            "page_type": "category",
            "page_id": category_id
        })
        
        return serialize_doc(override)
    
    # ============ Bulk Operations ============
    
    @router.post("/bulk-update-categories", dependencies=[Depends(require_admin)])
    async def bulk_update_category_seo(updates: List[CategorySEOSettings]):
        """Bulk update SEO settings for multiple categories (admin only)"""
        results = []
        
        for update in updates:
            update_data = {
                "page_type": "category",
                "page_id": update.category_id,
                "title_template": update.title,
                "description_template": update.description,
                "og_image": update.og_image,
                "keywords": update.keywords,
                "updated_at": datetime.now(timezone.utc)
            }
            
            db.seo_page_overrides.update_one(
                {"page_type": "category", "page_id": update.category_id},
                {"$set": update_data},
                upsert=True
            )
            results.append(update.category_id)
        
        return {"success": True, "updated_categories": results}
    
    # ============ SEO Preview & Validation ============
    
    @router.get("/preview/{page_type}/{page_id}")
    async def preview_seo_tags(page_type: str, page_id: str):
        """Preview how SEO tags will render for a specific page"""
        # Get global settings
        global_settings = db.seo_settings.find_one({"type": "global"}) or {}
        site_name = global_settings.get("site_name", "Avida Marketplace")
        
        # Get page-specific override
        override = db.seo_page_overrides.find_one({
            "page_type": page_type,
            "page_id": page_id
        })
        
        # Build preview based on page type
        preview = {
            "page_type": page_type,
            "page_id": page_id,
            "title": "",
            "description": "",
            "og_title": "",
            "og_description": "",
            "og_image": global_settings.get("default_og_image"),
            "keywords": [],
            "canonical_url": "",
            "no_index": False
        }
        
        if page_type == "category":
            category = db.categories.find_one({"id": page_id})
            if category:
                cat_name = category.get("name", page_id)
                preview["title"] = f"{cat_name} for Sale | {site_name}"
                preview["description"] = f"Browse {cat_name.lower()} listings on {site_name}. Find great deals near you."
                preview["canonical_url"] = f"/category/{page_id}"
                preview["keywords"] = [cat_name.lower(), "buy", "sell", "local"]
                
        elif page_type == "listing":
            listing = db.listings.find_one({"id": page_id})
            if listing:
                preview["title"] = f"{listing.get('title', 'Listing')} | {site_name}"
                preview["description"] = listing.get("description", "")[:160]
                preview["canonical_url"] = f"/listing/{page_id}"
                if listing.get("images"):
                    preview["og_image"] = listing["images"][0]
                preview["keywords"] = [listing.get("title", "").lower()]
        
        # Apply overrides
        if override:
            if override.get("title_template"):
                preview["title"] = override["title_template"]
            if override.get("description_template"):
                preview["description"] = override["description_template"]
            if override.get("og_image"):
                preview["og_image"] = override["og_image"]
            if override.get("keywords"):
                preview["keywords"] = override["keywords"]
            if override.get("no_index"):
                preview["no_index"] = override["no_index"]
            if override.get("canonical_url"):
                preview["canonical_url"] = override["canonical_url"]
        
        preview["og_title"] = preview["title"]
        preview["og_description"] = preview["description"]
        
        return preview
    
    return router
