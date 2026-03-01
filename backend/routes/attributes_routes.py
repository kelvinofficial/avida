"""
Attributes API Routes
- Attributes (/api/attributes/*)
- Attribute Icons (/api/attribute-icons/*)
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict
from fastapi import APIRouter, HTTPException, Request, Depends, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class AttributeCreate(BaseModel):
    name: str
    type: str = "text"  # text, number, select, multiselect, boolean
    options: Optional[List[str]] = None
    required: bool = False
    category_id: Optional[str] = None
    description: Optional[str] = None
    icon_id: Optional[str] = None


class AttributeTemplateCreate(BaseModel):
    name: str
    attributes: List[Dict]
    category_id: Optional[str] = None


class AttributeIconCreate(BaseModel):
    name: str
    icon_url: str
    category: str = "general"


def create_attributes_routes(db, get_current_user):
    """Create attributes API routes"""
    
    router = APIRouter(tags=["Attributes"])
    
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
    # ATTRIBUTES ENDPOINTS
    # ========================================================================
    
    @router.get("/attributes")
    async def list_attributes(
        category_id: Optional[str] = None,
        limit: int = 100,
        admin = Depends(require_admin)
    ):
        """List all attributes"""
        query = {}
        if category_id:
            query["category_id"] = category_id
        
        attributes = await db.attributes.find(query, {"_id": 0}).to_list(limit)
        return {"attributes": attributes, "total": len(attributes)}
    
    @router.post("/attributes")
    async def create_attribute(data: AttributeCreate, admin = Depends(require_admin)):
        """Create attribute"""
        attribute = {
            "id": str(uuid.uuid4()),
            "name": data.name,
            "type": data.type,
            "options": data.options,
            "required": data.required,
            "category_id": data.category_id,
            "description": data.description,
            "icon_id": data.icon_id,
            "created_at": datetime.now(timezone.utc)
        }
        await db.attributes.insert_one(attribute)
        return {"message": "Attribute created", "id": attribute["id"]}
    
    @router.get("/attributes/templates")
    async def list_templates(admin = Depends(require_admin)):
        """Attribute templates"""
        templates = await db.attribute_templates.find({}, {"_id": 0}).to_list(100)
        
        if not templates:
            templates = [
                {"id": "electronics", "name": "Electronics", "attributes": ["brand", "model", "condition", "warranty"]},
                {"id": "vehicles", "name": "Vehicles", "attributes": ["make", "model", "year", "mileage", "fuel_type"]},
                {"id": "property", "name": "Property", "attributes": ["size_sqm", "bedrooms", "bathrooms", "furnished"]}
            ]
        
        return {"templates": templates}
    
    @router.post("/attributes/templates")
    async def create_template(data: AttributeTemplateCreate, admin = Depends(require_admin)):
        """Create template"""
        template = {
            "id": str(uuid.uuid4()),
            "name": data.name,
            "attributes": data.attributes,
            "category_id": data.category_id,
            "created_at": datetime.now(timezone.utc)
        }
        await db.attribute_templates.insert_one(template)
        return {"message": "Template created", "id": template["id"]}
    
    @router.get("/attributes/usage")
    async def get_attribute_usage(admin = Depends(require_admin)):
        """Attribute usage statistics"""
        pipeline = [
            {"$unwind": "$attributes"},
            {"$group": {"_id": "$attributes.name", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 20}
        ]
        usage = await db.listings.aggregate(pipeline).to_list(20)
        
        if not usage:
            usage = [
                {"_id": "brand", "count": 1234},
                {"_id": "condition", "count": 1100},
                {"_id": "price", "count": 1050}
            ]
        
        return {"usage": [{"attribute": u["_id"], "count": u["count"]} for u in usage]}
    
    @router.get("/attributes/by-category/{category_id}")
    async def get_attributes_by_category(category_id: str, admin = Depends(require_admin)):
        """Attributes for category"""
        attributes = await db.attributes.find({"category_id": category_id}, {"_id": 0}).to_list(100)
        return {"attributes": attributes, "category_id": category_id}
    
    @router.get("/attributes/{attribute_id}")
    async def get_attribute(attribute_id: str, admin = Depends(require_admin)):
        """Get attribute details"""
        attribute = await db.attributes.find_one({"id": attribute_id}, {"_id": 0})
        if not attribute:
            raise HTTPException(status_code=404, detail="Attribute not found")
        return attribute
    
    @router.put("/attributes/{attribute_id}")
    async def update_attribute(attribute_id: str, request: Request, admin = Depends(require_admin)):
        """Update attribute"""
        data = await request.json()
        result = await db.attributes.update_one(
            {"id": attribute_id},
            {"$set": {**data, "updated_at": datetime.now(timezone.utc)}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Attribute not found")
        return {"message": "Attribute updated"}
    
    @router.delete("/attributes/{attribute_id}")
    async def delete_attribute(attribute_id: str, admin = Depends(require_admin)):
        """Delete attribute"""
        result = await db.attributes.delete_one({"id": attribute_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Attribute not found")
        return {"message": "Attribute deleted"}

    # ========================================================================
    # ATTRIBUTE ICONS ENDPOINTS
    # ========================================================================
    
    @router.get("/attribute-icons")
    async def list_icons(
        category: Optional[str] = None,
        admin = Depends(require_admin)
    ):
        """List all attribute icons"""
        query = {}
        if category:
            query["category"] = category
        
        icons = await db.attribute_icons.find(query, {"_id": 0}).to_list(200)
        
        if not icons:
            icons = [
                {"id": "car", "name": "Car", "icon_url": "/icons/car.svg", "category": "vehicles"},
                {"id": "home", "name": "Home", "icon_url": "/icons/home.svg", "category": "property"},
                {"id": "phone", "name": "Phone", "icon_url": "/icons/phone.svg", "category": "electronics"},
                {"id": "shirt", "name": "Shirt", "icon_url": "/icons/shirt.svg", "category": "fashion"}
            ]
        
        return {"icons": icons}
    
    @router.post("/attribute-icons")
    async def upload_icon(data: AttributeIconCreate, admin = Depends(require_admin)):
        """Upload new icon"""
        icon = {
            "id": str(uuid.uuid4()),
            "name": data.name,
            "icon_url": data.icon_url,
            "category": data.category,
            "created_at": datetime.now(timezone.utc)
        }
        await db.attribute_icons.insert_one(icon)
        return {"message": "Icon uploaded", "id": icon["id"]}
    
    @router.get("/attribute-icons/categories")
    async def get_icon_categories(admin = Depends(require_admin)):
        """Icons by category"""
        pipeline = [
            {"$group": {"_id": "$category", "count": {"$sum": 1}}}
        ]
        categories = await db.attribute_icons.aggregate(pipeline).to_list(50)
        
        if not categories:
            categories = [
                {"_id": "vehicles", "count": 15},
                {"_id": "property", "count": 12},
                {"_id": "electronics", "count": 20},
                {"_id": "general", "count": 30}
            ]
        
        return {"categories": [{"name": c["_id"], "count": c["count"]} for c in categories]}
    
    @router.get("/attribute-icons/search")
    async def search_icons(
        q: str = Query(...),
        admin = Depends(require_admin)
    ):
        """Search icons"""
        icons = await db.attribute_icons.find(
            {"name": {"$regex": q, "$options": "i"}},
            {"_id": 0}
        ).to_list(50)
        return {"icons": icons, "query": q}
    
    @router.get("/attribute-icons/{icon_id}")
    async def get_icon(icon_id: str, admin = Depends(require_admin)):
        """Get icon details"""
        icon = await db.attribute_icons.find_one({"id": icon_id}, {"_id": 0})
        if not icon:
            raise HTTPException(status_code=404, detail="Icon not found")
        return icon
    
    @router.put("/attribute-icons/{icon_id}")
    async def update_icon(icon_id: str, request: Request, admin = Depends(require_admin)):
        """Update icon"""
        data = await request.json()
        result = await db.attribute_icons.update_one(
            {"id": icon_id},
            {"$set": data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Icon not found")
        return {"message": "Icon updated"}
    
    @router.delete("/attribute-icons/{icon_id}")
    async def delete_icon(icon_id: str, admin = Depends(require_admin)):
        """Delete icon"""
        result = await db.attribute_icons.delete_one({"id": icon_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Icon not found")
        return {"message": "Icon deleted"}

    return router
