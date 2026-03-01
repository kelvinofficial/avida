"""
Guides & Forms API Routes
- Photography Guides (/api/photography-guides/*)
- Form Configuration (/api/form-config/*)
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict
from fastapi import APIRouter, HTTPException, Request, Depends, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class PhotographyGuideCreate(BaseModel):
    title: str
    content: str
    category_id: Optional[str] = None
    tips: List[str] = []
    images: List[str] = []
    is_published: bool = True


class FormFieldCreate(BaseModel):
    name: str
    label: str
    type: str = "text"
    required: bool = False
    options: Optional[List[str]] = None
    validation: Optional[Dict] = None
    placeholder: Optional[str] = None


def create_guides_forms_routes(db, get_current_user):
    """Create guides and forms API routes"""
    
    router = APIRouter(tags=["Guides & Forms"])
    
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

    # ========================================================================
    # PHOTOGRAPHY GUIDES ENDPOINTS
    # ========================================================================
    
    @router.get("/photography-guides")
    async def list_guides(
        category_id: Optional[str] = None,
        admin = Depends(require_admin)
    ):
        """List all photography guides"""
        query = {}
        if category_id:
            query["category_id"] = category_id
        
        guides = await db.photography_guides.find(query, {"_id": 0}).to_list(100)
        
        if not guides:
            guides = [
                {
                    "id": "general",
                    "title": "General Photography Tips",
                    "content": "Tips for taking great product photos",
                    "tips": ["Use natural lighting", "Clean background", "Multiple angles"],
                    "is_published": True
                },
                {
                    "id": "vehicles",
                    "title": "Vehicle Photography Guide",
                    "content": "How to photograph vehicles for listings",
                    "tips": ["Exterior shots", "Interior details", "Mileage photo"],
                    "is_published": True
                }
            ]
        
        return {"guides": guides}
    
    @router.post("/photography-guides")
    async def create_guide(data: PhotographyGuideCreate, admin = Depends(require_admin)):
        """Create guide"""
        guide = {
            "id": str(uuid.uuid4()),
            "title": data.title,
            "content": data.content,
            "category_id": data.category_id,
            "tips": data.tips,
            "images": data.images,
            "is_published": data.is_published,
            "created_by": admin.user_id,
            "created_at": datetime.now(timezone.utc)
        }
        await db.photography_guides.insert_one(guide)
        return {"message": "Guide created", "id": guide["id"]}
    
    @router.get("/photography-guides/tips")
    async def get_photography_tips(admin = Depends(require_admin)):
        """Photography tips"""
        tips = [
            {"category": "lighting", "tip": "Use natural daylight when possible", "priority": 1},
            {"category": "background", "tip": "Use a clean, uncluttered background", "priority": 2},
            {"category": "angles", "tip": "Take photos from multiple angles", "priority": 3},
            {"category": "focus", "tip": "Ensure the main subject is in sharp focus", "priority": 4},
            {"category": "resolution", "tip": "Use high resolution (at least 1080p)", "priority": 5}
        ]
        return {"tips": tips}
    
    @router.get("/photography-guides/by-category/{category_id}")
    async def get_guides_by_category(category_id: str, admin = Depends(require_admin)):
        """Guides for category"""
        guides = await db.photography_guides.find({"category_id": category_id}, {"_id": 0}).to_list(50)
        return {"guides": guides, "category_id": category_id}
    
    @router.get("/photography-guides/public/{category}")
    async def get_public_guides(category: str):
        """Public guides (like safety-tips) - no auth required"""
        guides = await db.photography_guides.find(
            {"category_id": category, "is_published": True},
            {"_id": 0}
        ).to_list(50)
        
        if not guides:
            guides = [{
                "id": f"default-{category}",
                "title": f"{category.title()} Photography Guide",
                "content": f"Tips for photographing {category} items",
                "tips": ["Good lighting", "Clean background", "Show details"],
                "is_published": True
            }]
        
        return {"guides": guides, "category": category}
    
    @router.get("/photography-guides/{guide_id}")
    async def get_guide(guide_id: str, admin = Depends(require_admin)):
        """Get guide details"""
        guide = await db.photography_guides.find_one({"id": guide_id}, {"_id": 0})
        if not guide:
            raise HTTPException(status_code=404, detail="Guide not found")
        return guide
    
    @router.put("/photography-guides/{guide_id}")
    async def update_guide(guide_id: str, request: Request, admin = Depends(require_admin)):
        """Update guide"""
        data = await request.json()
        result = await db.photography_guides.update_one(
            {"id": guide_id},
            {"$set": {**data, "updated_at": datetime.now(timezone.utc)}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Guide not found")
        return {"message": "Guide updated"}
    
    @router.delete("/photography-guides/{guide_id}")
    async def delete_guide(guide_id: str, admin = Depends(require_admin)):
        """Delete guide"""
        result = await db.photography_guides.delete_one({"id": guide_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Guide not found")
        return {"message": "Guide deleted"}

    # ========================================================================
    # FORM CONFIGURATION ENDPOINTS
    # ========================================================================
    
    @router.get("/form-config")
    async def get_form_dashboard(admin = Depends(require_admin)):
        """Form configuration dashboard"""
        listing_config = await db.form_configs.find_one({"type": "listing"}, {"_id": 0})
        registration_config = await db.form_configs.find_one({"type": "registration"}, {"_id": 0})
        
        return {
            "listing_fields": listing_config.get("fields", []) if listing_config else [],
            "registration_fields": registration_config.get("fields", []) if registration_config else [],
            "total_custom_fields": await db.custom_fields.count_documents({}),
            "categories_with_custom_forms": 5
        }
    
    @router.get("/form-config/listing")
    async def get_listing_form_config(admin = Depends(require_admin)):
        """Listing form configuration"""
        config = await db.form_configs.find_one({"type": "listing"}, {"_id": 0})
        
        if not config:
            config = {
                "type": "listing",
                "fields": [
                    {"name": "title", "label": "Title", "type": "text", "required": True},
                    {"name": "description", "label": "Description", "type": "textarea", "required": True},
                    {"name": "price", "label": "Price", "type": "number", "required": True},
                    {"name": "category", "label": "Category", "type": "select", "required": True},
                    {"name": "images", "label": "Images", "type": "file", "required": True},
                    {"name": "location", "label": "Location", "type": "location", "required": True}
                ]
            }
        
        return config
    
    @router.put("/form-config/listing")
    async def update_listing_form(request: Request, admin = Depends(require_admin)):
        """Update listing form"""
        data = await request.json()
        await db.form_configs.update_one(
            {"type": "listing"},
            {"$set": {**data, "updated_at": datetime.now(timezone.utc)}},
            upsert=True
        )
        return {"message": "Listing form updated"}
    
    @router.get("/form-config/registration")
    async def get_registration_form_config(admin = Depends(require_admin)):
        """Registration form config"""
        config = await db.form_configs.find_one({"type": "registration"}, {"_id": 0})
        
        if not config:
            config = {
                "type": "registration",
                "fields": [
                    {"name": "email", "label": "Email", "type": "email", "required": True},
                    {"name": "password", "label": "Password", "type": "password", "required": True},
                    {"name": "name", "label": "Full Name", "type": "text", "required": True},
                    {"name": "phone", "label": "Phone Number", "type": "tel", "required": False}
                ]
            }
        
        return config
    
    @router.put("/form-config/registration")
    async def update_registration_form(request: Request, admin = Depends(require_admin)):
        """Update registration form"""
        data = await request.json()
        await db.form_configs.update_one(
            {"type": "registration"},
            {"$set": {**data, "updated_at": datetime.now(timezone.utc)}},
            upsert=True
        )
        return {"message": "Registration form updated"}
    
    @router.get("/form-config/fields")
    async def get_available_fields(admin = Depends(require_admin)):
        """Available form fields"""
        fields = [
            {"type": "text", "label": "Text Input", "supports_validation": True},
            {"type": "textarea", "label": "Text Area", "supports_validation": True},
            {"type": "number", "label": "Number", "supports_validation": True},
            {"type": "email", "label": "Email", "supports_validation": True},
            {"type": "tel", "label": "Phone", "supports_validation": True},
            {"type": "select", "label": "Dropdown", "supports_options": True},
            {"type": "multiselect", "label": "Multi-Select", "supports_options": True},
            {"type": "checkbox", "label": "Checkbox", "supports_validation": False},
            {"type": "radio", "label": "Radio Buttons", "supports_options": True},
            {"type": "date", "label": "Date Picker", "supports_validation": True},
            {"type": "file", "label": "File Upload", "supports_validation": True},
            {"type": "location", "label": "Location Picker", "supports_validation": False}
        ]
        return {"fields": fields}
    
    @router.post("/form-config/fields")
    async def create_custom_field(data: FormFieldCreate, admin = Depends(require_admin)):
        """Create custom field"""
        field = {
            "id": str(uuid.uuid4()),
            "name": data.name,
            "label": data.label,
            "type": data.type,
            "required": data.required,
            "options": data.options,
            "validation": data.validation,
            "placeholder": data.placeholder,
            "created_at": datetime.now(timezone.utc)
        }
        await db.custom_fields.insert_one(field)
        return {"message": "Custom field created", "id": field["id"]}
    
    @router.get("/form-config/by-category/{category_id}")
    async def get_form_by_category(category_id: str, admin = Depends(require_admin)):
        """Form config by category"""
        config = await db.form_configs.find_one(
            {"type": "listing", "category_id": category_id},
            {"_id": 0}
        )
        
        if not config:
            config = await db.form_configs.find_one({"type": "listing"}, {"_id": 0})
        
        return config or {"type": "listing", "category_id": category_id, "fields": []}
    
    @router.get("/form-config/validations")
    async def get_field_validations(admin = Depends(require_admin)):
        """Field validation rules"""
        validations = {
            "text": ["required", "minLength", "maxLength", "pattern"],
            "number": ["required", "min", "max"],
            "email": ["required", "pattern"],
            "tel": ["required", "pattern"],
            "file": ["required", "maxSize", "allowedTypes"],
            "date": ["required", "minDate", "maxDate"]
        }
        return {"validations": validations}
    
    @router.put("/form-config/validations")
    async def update_validations(request: Request, admin = Depends(require_admin)):
        """Update validations"""
        data = await request.json()
        await db.form_validations.update_one(
            {"id": "global"},
            {"$set": {**data, "updated_at": datetime.now(timezone.utc)}},
            upsert=True
        )
        return {"message": "Validations updated"}

    return router
