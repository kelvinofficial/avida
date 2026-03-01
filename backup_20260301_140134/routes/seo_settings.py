"""
SEO Settings Routes
Allows admins to manage global and page-specific SEO settings
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId


def create_seo_settings_router(db, get_current_user):
    """Create SEO settings management router"""
    router = APIRouter(prefix="/seo-settings", tags=["SEO Settings"])
    
    # Collections
    seo_settings_collection = db.seo_settings
    seo_page_overrides_collection = db.seo_page_overrides
    categories_collection = db.categories
    listings_collection = db.listings
    
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
    
    async def require_admin(request: Request):
        """Require admin access for protected routes"""
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        admin_emails = ["admin@marketplace.com", "admin@example.com", "admin@test.com"]
        if user.email not in admin_emails and not getattr(user, 'is_admin', False):
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    
    # ============ Global SEO Settings Endpoints ============
    
    @router.get("/global")
    async def get_global_seo_settings():
        """Get global SEO settings (public endpoint for frontend)"""
        settings = await seo_settings_collection.find_one({"type": "global"})
        
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
    
    @router.put("/global")
    async def update_global_seo_settings(request_body: UpdateGlobalSettingsRequest, admin = Depends(require_admin)):
        """Update global SEO settings (admin only)"""
        update_data = {k: v for k, v in request_body.dict().items() if v is not None}
        update_data["type"] = "global"
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        await seo_settings_collection.update_one(
            {"type": "global"},
            {"$set": update_data},
            upsert=True
        )
        
        settings = await seo_settings_collection.find_one({"type": "global"})
        return serialize_doc(settings)
    
    # ============ Page Override Endpoints ============
    
    @router.get("/overrides")
    async def get_all_page_overrides():
        """Get all page SEO overrides (public for frontend)"""
        cursor = seo_page_overrides_collection.find()
        overrides = await cursor.to_list(length=500)
        return [serialize_doc(o) for o in overrides]
    
    @router.get("/overrides/{page_type}")
    async def get_page_overrides_by_type(page_type: str):
        """Get SEO overrides for a specific page type"""
        cursor = seo_page_overrides_collection.find({"page_type": page_type})
        overrides = await cursor.to_list(length=500)
        return [serialize_doc(o) for o in overrides]
    
    @router.get("/overrides/{page_type}/{page_id}")
    async def get_page_override(page_type: str, page_id: str):
        """Get SEO override for a specific page"""
        override = await seo_page_overrides_collection.find_one({
            "page_type": page_type,
            "page_id": page_id
        })
        
        if not override:
            return None
            
        return serialize_doc(override)
    
    @router.post("/overrides")
    async def create_page_override(request_body: CreatePageOverrideRequest, admin = Depends(require_admin)):
        """Create a new page SEO override (admin only)"""
        # Check if override already exists
        existing = await seo_page_overrides_collection.find_one({
            "page_type": request_body.page_type,
            "page_id": request_body.page_id
        })
        
        if existing:
            raise HTTPException(status_code=400, detail="Override already exists for this page")
        
        override_data = request_body.dict()
        override_data["created_at"] = datetime.now(timezone.utc)
        override_data["updated_at"] = datetime.now(timezone.utc)
        
        result = await seo_page_overrides_collection.insert_one(override_data)
        override = await seo_page_overrides_collection.find_one({"_id": result.inserted_id})
        
        return serialize_doc(override)
    
    @router.put("/overrides/{override_id}")
    async def update_page_override(override_id: str, request_body: CreatePageOverrideRequest, admin = Depends(require_admin)):
        """Update a page SEO override (admin only)"""
        try:
            obj_id = ObjectId(override_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid override ID")
        
        update_data = request_body.dict()
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        result = await seo_page_overrides_collection.update_one(
            {"_id": obj_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Override not found")
        
        override = await seo_page_overrides_collection.find_one({"_id": obj_id})
        return serialize_doc(override)
    
    @router.delete("/overrides/{override_id}")
    async def delete_page_override(override_id: str, admin = Depends(require_admin)):
        """Delete a page SEO override (admin only)"""
        try:
            obj_id = ObjectId(override_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid override ID")
        
        result = await seo_page_overrides_collection.delete_one({"_id": obj_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Override not found")
        
        return {"success": True, "message": "Override deleted"}
    
    # ============ Category SEO Endpoints ============
    
    @router.get("/categories")
    async def get_all_category_seo():
        """Get SEO settings for all categories"""
        cursor = seo_page_overrides_collection.find({"page_type": "category"})
        category_overrides = await cursor.to_list(length=100)
        return [serialize_doc(o) for o in category_overrides]
    
    @router.get("/categories/{category_id}")
    async def get_category_seo(category_id: str):
        """Get SEO settings for a specific category"""
        override = await seo_page_overrides_collection.find_one({
            "page_type": "category",
            "page_id": category_id
        })
        
        if not override:
            # Return defaults based on category
            category = await categories_collection.find_one({"id": category_id})
            if category:
                return {
                    "category_id": category_id,
                    "title": f"{category.get('name', category_id)} for Sale",
                    "description": f"Browse {category.get('name', category_id).lower()} listings on Avida. Find great deals near you.",
                    "keywords": [category.get('name', '').lower(), "buy", "sell", "local"]
                }
            return None
        
        return serialize_doc(override)
    
    @router.put("/categories/{category_id}")
    async def update_category_seo(category_id: str, request_body: CategorySEOSettings, admin = Depends(require_admin)):
        """Update SEO settings for a specific category (admin only)"""
        update_data = {
            "page_type": "category",
            "page_id": category_id,
            "title_template": request_body.title,
            "description_template": request_body.description,
            "og_image": request_body.og_image,
            "keywords": request_body.keywords,
            "updated_at": datetime.now(timezone.utc)
        }
        
        await seo_page_overrides_collection.update_one(
            {"page_type": "category", "page_id": category_id},
            {"$set": update_data},
            upsert=True
        )
        
        override = await seo_page_overrides_collection.find_one({
            "page_type": "category",
            "page_id": category_id
        })
        
        return serialize_doc(override)
    
    # ============ Bulk Operations ============
    
    @router.post("/bulk-update-categories")
    async def bulk_update_category_seo(updates: List[CategorySEOSettings], admin = Depends(require_admin)):
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
            
            await seo_page_overrides_collection.update_one(
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
        global_settings = await seo_settings_collection.find_one({"type": "global"}) or {}
        site_name = global_settings.get("site_name", "Avida Marketplace")
        
        # Get page-specific override
        override = await seo_page_overrides_collection.find_one({
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
            category = await categories_collection.find_one({"id": page_id})
            if category:
                cat_name = category.get("name", page_id)
                preview["title"] = f"{cat_name} for Sale | {site_name}"
                preview["description"] = f"Browse {cat_name.lower()} listings on {site_name}. Find great deals near you."
                preview["canonical_url"] = f"/category/{page_id}"
                preview["keywords"] = [cat_name.lower(), "buy", "sell", "local"]
                
        elif page_type == "listing":
            listing = await listings_collection.find_one({"id": page_id})
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
    
    # ============ Listing SEO Endpoints ============
    
    @router.get("/listings/{listing_id}/seo")
    async def get_listing_seo(listing_id: str):
        """Get SEO data for a specific listing"""
        listing = await listings_collection.find_one({"id": listing_id}, {"seo_data": 1, "title": 1})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        return {
            "listing_id": listing_id,
            "title": listing.get("title", ""),
            "seo_data": listing.get("seo_data", {})
        }
    
    @router.post("/listings/{listing_id}/regenerate-seo")
    async def regenerate_listing_seo(listing_id: str, admin = Depends(require_admin)):
        """Regenerate SEO data for a specific listing (admin only)"""
        listing = await listings_collection.find_one({"id": listing_id})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        # Get category name
        category_name = None
        if listing.get("category_id"):
            category = await categories_collection.find_one({"id": listing["category_id"]})
            if category:
                category_name = category.get("name")
        
        # Generate new SEO data
        try:
            from utils.seo_generator import generate_full_seo_data
            seo_data = generate_full_seo_data(
                listing_id=listing_id,
                title=listing.get("title", ""),
                description=listing.get("description", ""),
                price=listing.get("price", 0),
                currency=listing.get("currency", "EUR"),
                location=listing.get("location"),
                location_data=listing.get("location_data"),
                condition=listing.get("condition"),
                category_name=category_name,
                subcategory=listing.get("subcategory"),
                images=listing.get("images", []),
                attributes=listing.get("attributes", {})
            )
            
            # Update listing with new SEO data
            await listings_collection.update_one(
                {"id": listing_id},
                {"$set": {"seo_data": seo_data, "updated_at": datetime.now(timezone.utc)}}
            )
            
            return {
                "success": True,
                "listing_id": listing_id,
                "seo_data": seo_data
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to regenerate SEO: {str(e)}")
    
    @router.post("/listings/bulk-regenerate-seo")
    async def bulk_regenerate_listing_seo(admin = Depends(require_admin), limit: int = 100):
        """Bulk regenerate SEO data for listings without SEO data (admin only)"""
        # Find listings without SEO data
        cursor = listings_collection.find(
            {"$or": [{"seo_data": {"$exists": False}}, {"seo_data": None}, {"seo_data": {}}]},
            {"id": 1, "title": 1, "description": 1, "price": 1, "currency": 1, "location": 1, 
             "location_data": 1, "condition": 1, "category_id": 1, "subcategory": 1, 
             "images": 1, "attributes": 1}
        ).limit(limit)
        
        listings = await cursor.to_list(length=limit)
        
        if not listings:
            return {"success": True, "updated_count": 0, "message": "All listings have SEO data"}
        
        # Get all categories for lookup
        categories_cursor = categories_collection.find({}, {"id": 1, "name": 1})
        categories = {c["id"]: c["name"] for c in await categories_cursor.to_list(length=100)}
        
        updated_count = 0
        errors = []
        
        try:
            from utils.seo_generator import generate_full_seo_data
            
            for listing in listings:
                try:
                    category_name = categories.get(listing.get("category_id"))
                    seo_data = generate_full_seo_data(
                        listing_id=listing["id"],
                        title=listing.get("title", ""),
                        description=listing.get("description", ""),
                        price=listing.get("price", 0),
                        currency=listing.get("currency", "EUR"),
                        location=listing.get("location"),
                        location_data=listing.get("location_data"),
                        condition=listing.get("condition"),
                        category_name=category_name,
                        subcategory=listing.get("subcategory"),
                        images=listing.get("images", []),
                        attributes=listing.get("attributes", {})
                    )
                    
                    await listings_collection.update_one(
                        {"id": listing["id"]},
                        {"$set": {"seo_data": seo_data, "updated_at": datetime.now(timezone.utc)}}
                    )
                    updated_count += 1
                except Exception as e:
                    errors.append({"listing_id": listing["id"], "error": str(e)})
        except ImportError:
            raise HTTPException(status_code=500, detail="SEO generator module not found")
        
        return {
            "success": True,
            "updated_count": updated_count,
            "errors": errors if errors else None,
            "remaining": await listings_collection.count_documents(
                {"$or": [{"seo_data": {"$exists": False}}, {"seo_data": None}, {"seo_data": {}}]}
            )
        }
    
    return router
