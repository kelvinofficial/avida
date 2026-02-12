"""
Attribute Icons Routes Module
Handles SVG icon management for categories and attributes
"""

from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Form
from fastapi.responses import Response
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel
import logging
import uuid
import re

logger = logging.getLogger(__name__)


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class IconBase(BaseModel):
    name: str
    svg_content: str
    category_id: Optional[str] = None
    subcategory_id: Optional[str] = None
    attribute_name: Optional[str] = None
    icon_type: str = "attribute"  # category, subcategory, attribute
    color: Optional[str] = None
    description: Optional[str] = None


class IconCreate(IconBase):
    pass


class IconUpdate(BaseModel):
    name: Optional[str] = None
    svg_content: Optional[str] = None
    category_id: Optional[str] = None
    subcategory_id: Optional[str] = None
    attribute_name: Optional[str] = None
    icon_type: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


# =============================================================================
# SVG VALIDATION
# =============================================================================

def validate_svg(svg_content: str) -> bool:
    """Validate that the content is a valid SVG"""
    svg_content = svg_content.strip()
    
    # Check if it starts with SVG tag
    if not svg_content.startswith('<svg') and not svg_content.startswith('<?xml'):
        return False
    
    # Check if it ends with closing SVG tag
    if not svg_content.endswith('</svg>'):
        return False
    
    # Basic security check - no script tags
    if '<script' in svg_content.lower():
        return False
    
    return True


def sanitize_svg(svg_content: str) -> str:
    """Sanitize SVG content for security"""
    # Remove potentially dangerous elements
    dangerous_patterns = [
        r'<script[^>]*>.*?</script>',
        r'on\w+\s*=\s*["\'][^"\']*["\']',  # Event handlers
        r'javascript:',
        r'data:text/html',
    ]
    
    for pattern in dangerous_patterns:
        svg_content = re.sub(pattern, '', svg_content, flags=re.IGNORECASE | re.DOTALL)
    
    return svg_content


# =============================================================================
# ROUTER FACTORY
# =============================================================================

def create_attribute_icons_router(db, require_admin):
    """
    Create the attribute icons router with dependencies injected
    
    Args:
        db: MongoDB database instance (async motor)
        require_admin: Dependency function for admin authentication
    
    Returns:
        APIRouter with icon management endpoints
    """
    router = APIRouter(prefix="/attribute-icons", tags=["Attribute Icons"])
    
    # =========================================================================
    # PUBLIC ENDPOINTS (for frontend to fetch icons)
    # =========================================================================
    
    @router.get("/public")
    async def get_public_icons(
        category_id: Optional[str] = None,
        subcategory_id: Optional[str] = None,
        icon_type: Optional[str] = None
    ):
        """Get all active icons (public endpoint for frontend)"""
        query = {"is_active": True}
        
        if category_id:
            query["category_id"] = category_id
        if subcategory_id:
            query["subcategory_id"] = subcategory_id
        if icon_type:
            query["icon_type"] = icon_type
        
        cursor = db.attribute_icons.find(query, {"_id": 0})
        icons = await cursor.to_list(length=1000)
        return {"icons": icons, "total": len(icons)}
    
    @router.get("/public/{icon_id}")
    async def get_public_icon(icon_id: str):
        """Get a single icon by ID (public endpoint)"""
        icon = await db.attribute_icons.find_one(
            {"id": icon_id, "is_active": True},
            {"_id": 0}
        )
        if not icon:
            raise HTTPException(status_code=404, detail="Icon not found")
        return icon
    
    @router.get("/public/{icon_id}/svg")
    async def get_icon_svg(icon_id: str):
        """Get just the SVG content of an icon"""
        icon = await db.attribute_icons.find_one(
            {"id": icon_id, "is_active": True},
            {"_id": 0, "svg_content": 1}
        )
        if not icon:
            raise HTTPException(status_code=404, detail="Icon not found")
        
        return Response(
            content=icon["svg_content"],
            media_type="image/svg+xml"
        )
    
    @router.get("/by-category/{category_id}")
    async def get_icons_by_category(category_id: str):
        """Get all icons for a specific category"""
        cursor = db.attribute_icons.find(
            {"category_id": category_id, "is_active": True},
            {"_id": 0}
        )
        icons = await cursor.to_list(length=500)
        return {"icons": icons, "total": len(icons)}
    
    @router.get("/by-attribute")
    async def get_icon_by_attribute(
        category_id: str,
        subcategory_id: Optional[str] = None,
        attribute_name: Optional[str] = None
    ):
        """Get icon for a specific attribute"""
        query = {"category_id": category_id, "is_active": True}
        
        if subcategory_id:
            query["subcategory_id"] = subcategory_id
        if attribute_name:
            query["attribute_name"] = attribute_name
        
        icon = await db.attribute_icons.find_one(query, {"_id": 0})
        return icon
    
    # =========================================================================
    # ADMIN ENDPOINTS
    # =========================================================================
    
    @router.get("")
    async def get_all_icons(
        page: int = 1,
        limit: int = 50,
        category_id: Optional[str] = None,
        subcategory_id: Optional[str] = None,
        icon_type: Optional[str] = None,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        current_user: dict = Depends(require_admin)
    ):
        """Get all icons with pagination and filtering (admin)"""
        query = {}
        
        if category_id:
            query["category_id"] = category_id
        if subcategory_id:
            query["subcategory_id"] = subcategory_id
        if icon_type:
            query["icon_type"] = icon_type
        if is_active is not None:
            query["is_active"] = is_active
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"attribute_name": {"$regex": search, "$options": "i"}}
            ]
        
        skip = (page - 1) * limit
        
        cursor = db.attribute_icons.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
        icons = await cursor.to_list(length=limit)
        
        total = await db.attribute_icons.count_documents(query)
        
        return {
            "icons": icons,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit if total > 0 else 0
            }
        }
    
    @router.get("/stats")
    async def get_icon_stats(current_user: dict = Depends(require_admin)):
        """Get icon statistics"""
        total = await db.attribute_icons.count_documents({})
        active = await db.attribute_icons.count_documents({"is_active": True})
        
        # Count by type
        by_type = {}
        for icon_type in ["category", "subcategory", "attribute"]:
            by_type[icon_type] = await db.attribute_icons.count_documents({"icon_type": icon_type})
        
        # Count by category
        pipeline = [
            {"$match": {"category_id": {"$ne": None}}},
            {"$group": {"_id": "$category_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        cursor = db.attribute_icons.aggregate(pipeline)
        by_category = await cursor.to_list(length=10)
        
        return {
            "total": total,
            "active": active,
            "inactive": total - active,
            "by_type": by_type,
            "by_category": by_category
        }
    
    @router.post("")
    async def create_icon(
        icon_data: IconCreate,
        current_user: dict = Depends(require_admin)
    ):
        """Create a new icon"""
        # Validate SVG
        if not validate_svg(icon_data.svg_content):
            raise HTTPException(status_code=400, detail="Invalid SVG content")
        
        # Sanitize SVG
        sanitized_svg = sanitize_svg(icon_data.svg_content)
        
        icon_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        icon_doc = {
            "id": icon_id,
            "name": icon_data.name,
            "svg_content": sanitized_svg,
            "category_id": icon_data.category_id,
            "subcategory_id": icon_data.subcategory_id,
            "attribute_name": icon_data.attribute_name,
            "icon_type": icon_data.icon_type,
            "color": icon_data.color,
            "description": icon_data.description,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
            "created_by": current_user.get("user_id")
        }
        
        await db.attribute_icons.insert_one(icon_doc)
        del icon_doc["_id"]
        
        return {"success": True, "icon": icon_doc}
    
    @router.post("/upload")
    async def upload_icon(
        name: str = Form(...),
        icon_type: str = Form("attribute"),
        category_id: Optional[str] = Form(None),
        subcategory_id: Optional[str] = Form(None),
        attribute_name: Optional[str] = Form(None),
        color: Optional[str] = Form(None),
        description: Optional[str] = Form(None),
        file: UploadFile = File(...),
        current_user: dict = Depends(require_admin)
    ):
        """Upload an SVG file as an icon"""
        if not file.filename.endswith('.svg'):
            raise HTTPException(status_code=400, detail="Only SVG files are allowed")
        
        content = await file.read()
        svg_content = content.decode('utf-8')
        
        # Validate SVG
        if not validate_svg(svg_content):
            raise HTTPException(status_code=400, detail="Invalid SVG content")
        
        # Sanitize SVG
        sanitized_svg = sanitize_svg(svg_content)
        
        icon_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        icon_doc = {
            "id": icon_id,
            "name": name,
            "svg_content": sanitized_svg,
            "category_id": category_id,
            "subcategory_id": subcategory_id,
            "attribute_name": attribute_name,
            "icon_type": icon_type,
            "color": color,
            "description": description,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
            "created_by": current_user.get("user_id")
        }
        
        await db.attribute_icons.insert_one(icon_doc)
        del icon_doc["_id"]
        
        return {"success": True, "icon": icon_doc}
    
    @router.put("/{icon_id}")
    async def update_icon(
        icon_id: str,
        updates: IconUpdate,
        current_user: dict = Depends(require_admin)
    ):
        """Update an existing icon"""
        existing = await db.attribute_icons.find_one({"id": icon_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Icon not found")
        
        update_data = updates.model_dump(exclude_unset=True)
        
        # Validate SVG if being updated
        if "svg_content" in update_data:
            if not validate_svg(update_data["svg_content"]):
                raise HTTPException(status_code=400, detail="Invalid SVG content")
            update_data["svg_content"] = sanitize_svg(update_data["svg_content"])
        
        update_data["updated_at"] = datetime.now(timezone.utc)
        update_data["updated_by"] = current_user.get("user_id")
        
        await db.attribute_icons.update_one({"id": icon_id}, {"$set": update_data})
        
        updated = await db.attribute_icons.find_one({"id": icon_id}, {"_id": 0})
        return {"success": True, "icon": updated}
    
    @router.delete("/{icon_id}")
    async def delete_icon(
        icon_id: str,
        current_user: dict = Depends(require_admin)
    ):
        """Soft delete an icon"""
        existing = await db.attribute_icons.find_one({"id": icon_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Icon not found")
        
        await db.attribute_icons.update_one(
            {"id": icon_id},
            {"$set": {
                "is_active": False,
                "deleted_at": datetime.now(timezone.utc),
                "deleted_by": current_user.get("user_id")
            }}
        )
        
        return {"success": True, "message": "Icon deleted"}
    
    @router.delete("/{icon_id}/permanent")
    async def permanently_delete_icon(
        icon_id: str,
        current_user: dict = Depends(require_admin)
    ):
        """Permanently delete an icon"""
        result = await db.attribute_icons.delete_one({"id": icon_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Icon not found")
        
        return {"success": True, "message": "Icon permanently deleted"}
    
    @router.post("/{icon_id}/restore")
    async def restore_icon(
        icon_id: str,
        current_user: dict = Depends(require_admin)
    ):
        """Restore a soft-deleted icon"""
        existing = await db.attribute_icons.find_one({"id": icon_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Icon not found")
        
        await db.attribute_icons.update_one(
            {"id": icon_id},
            {
                "$set": {
                    "is_active": True,
                    "updated_at": datetime.now(timezone.utc),
                    "updated_by": current_user.get("user_id")
                },
                "$unset": {"deleted_at": "", "deleted_by": ""}
            }
        )
        
        return {"success": True, "message": "Icon restored"}
    
    @router.post("/bulk-upload")
    async def bulk_upload_icons(
        icons: List[IconCreate],
        current_user: dict = Depends(require_admin)
    ):
        """Bulk upload multiple icons"""
        created = []
        errors = []
        
        for idx, icon_data in enumerate(icons):
            try:
                if not validate_svg(icon_data.svg_content):
                    errors.append({"index": idx, "error": "Invalid SVG content"})
                    continue
                
                sanitized_svg = sanitize_svg(icon_data.svg_content)
                
                icon_id = str(uuid.uuid4())
                now = datetime.now(timezone.utc)
                
                icon_doc = {
                    "id": icon_id,
                    "name": icon_data.name,
                    "svg_content": sanitized_svg,
                    "category_id": icon_data.category_id,
                    "subcategory_id": icon_data.subcategory_id,
                    "attribute_name": icon_data.attribute_name,
                    "icon_type": icon_data.icon_type,
                    "color": icon_data.color,
                    "description": icon_data.description,
                    "is_active": True,
                    "created_at": now,
                    "updated_at": now,
                    "created_by": current_user.get("user_id")
                }
                
                await db.attribute_icons.insert_one(icon_doc)
                del icon_doc["_id"]
                created.append(icon_doc)
            except Exception as e:
                errors.append({"index": idx, "error": str(e)})
        
        return {
            "success": True,
            "created": len(created),
            "errors": errors,
            "icons": created
        }
    
    # =========================================================================
    # CATEGORY/ATTRIBUTE ASSIGNMENT ENDPOINTS
    # =========================================================================
    
    @router.post("/assign")
    async def assign_icon_to_attribute(
        icon_id: str,
        category_id: str,
        subcategory_id: Optional[str] = None,
        attribute_name: Optional[str] = None,
        current_user: dict = Depends(require_admin)
    ):
        """Assign an icon to a category/subcategory/attribute"""
        existing = await db.attribute_icons.find_one({"id": icon_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Icon not found")
        
        await db.attribute_icons.update_one(
            {"id": icon_id},
            {"$set": {
                "category_id": category_id,
                "subcategory_id": subcategory_id,
                "attribute_name": attribute_name,
                "updated_at": datetime.now(timezone.utc),
                "updated_by": current_user.get("user_id")
            }}
        )
        
        return {"success": True, "message": "Icon assigned"}
    
    @router.get("/mappings")
    async def get_icon_mappings(current_user: dict = Depends(require_admin)):
        """Get all icon mappings organized by category"""
        cursor = db.attribute_icons.find(
            {"is_active": True},
            {"_id": 0, "id": 1, "name": 1, "category_id": 1, "subcategory_id": 1, "attribute_name": 1, "icon_type": 1}
        )
        icons = await cursor.to_list(length=1000)
        
        # Organize by category
        mappings = {}
        for icon in icons:
            cat_id = icon.get("category_id") or "_global"
            if cat_id not in mappings:
                mappings[cat_id] = {
                    "category_icon": None,
                    "subcategories": {},
                    "attributes": []
                }
            
            if icon.get("icon_type") == "category":
                mappings[cat_id]["category_icon"] = icon
            elif icon.get("icon_type") == "subcategory":
                sub_id = icon.get("subcategory_id")
                if sub_id:
                    mappings[cat_id]["subcategories"][sub_id] = icon
            elif icon.get("icon_type") == "attribute":
                mappings[cat_id]["attributes"].append(icon)
        
        return {"mappings": mappings}
    
    # =========================================================================
    # SEED DEFAULT ICONS
    # =========================================================================
    
    DEFAULT_ICONS = [
        # Motors category icons
        {"name": "Car", "category_id": "motors", "attribute_name": "make", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 17h-2v-6l2-5h12l2 5v6h-2m-8 0h4m-10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4m14 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4"/></svg>'},
        {"name": "Calendar Year", "category_id": "motors", "attribute_name": "year", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'},
        {"name": "Speedometer", "category_id": "motors", "attribute_name": "mileage", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>'},
        {"name": "Fuel", "category_id": "motors", "attribute_name": "fuel_type", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 22V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14"/><path d="M15 10h2a2 2 0 0 1 2 2v6a2 2 0 0 0 2 2h0"/><path d="M18 6V4h-2"/><rect x="5" y="12" width="8" height="6"/></svg>'},
        {"name": "Transmission", "category_id": "motors", "attribute_name": "transmission", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><line x1="6" y1="8" x2="6" y2="16"/><line x1="18" y1="8" x2="18" y2="16"/><line x1="8" y1="6" x2="16" y2="6"/></svg>'},
        {"name": "Color Palette", "category_id": "motors", "attribute_name": "color", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.7-.1 2.5-.3L14 18c-1.5-1.5-.5-4 1.5-4h4c1.7 0 2.5-1 2.5-2.5 0-5.5-4.5-10-10-10Z"/></svg>'},
        
        # Properties category icons
        {"name": "Bed", "category_id": "properties", "attribute_name": "bedrooms", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>'},
        {"name": "Bath", "category_id": "properties", "attribute_name": "bathrooms", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6L6 6a2 2 0 0 0-2 2v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a2 2 0 0 0-2-2h-3"/><path d="M4 14v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/><circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/></svg>'},
        {"name": "Area", "category_id": "properties", "attribute_name": "size_sqm", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>'},
        {"name": "Location", "category_id": "properties", "attribute_name": "location", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>'},
        {"name": "Building Type", "category_id": "properties", "attribute_name": "property_type", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>'},
        
        # Electronics category icons
        {"name": "Laptop", "category_id": "electronics", "attribute_name": "brand", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="12" rx="2"/><path d="M2 16h20v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2z"/><line x1="6" y1="20" x2="6" y2="20"/><line x1="18" y1="20" x2="18" y2="20"/></svg>'},
        {"name": "Storage", "category_id": "electronics", "attribute_name": "storage", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>'},
        {"name": "Memory", "category_id": "electronics", "attribute_name": "ram", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 6V4"/><path d="M10 6V4"/><path d="M14 6V4"/><path d="M18 6V4"/><path d="M6 18v2"/><path d="M10 18v2"/><path d="M14 18v2"/><path d="M18 18v2"/></svg>'},
        {"name": "Processor", "category_id": "electronics", "attribute_name": "processor", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M4 12H2"/><path d="M22 12h-2"/><path d="M12 4V2"/><path d="M12 22v-2"/></svg>'},
        {"name": "Condition", "category_id": "electronics", "attribute_name": "condition", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'},
        
        # Phones & Tablets category icons
        {"name": "Phone", "category_id": "phones_tablets", "attribute_name": "model", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>'},
        {"name": "Screen Size", "category_id": "phones_tablets", "attribute_name": "screen_size", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>'},
        {"name": "Battery", "category_id": "phones_tablets", "attribute_name": "battery", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="18" height="10" rx="2"/><line x1="22" y1="11" x2="22" y2="13"/><rect x="4" y="9" width="4" height="6"/></svg>'},
        
        # Fashion category icons
        {"name": "Size", "category_id": "fashion_beauty", "attribute_name": "size", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>'},
        {"name": "Gender", "category_id": "fashion_beauty", "attribute_name": "gender", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="8" r="5"/><path d="M10 13v9"/><path d="M7 19h6"/><circle cx="19" cy="5" r="3"/><path d="M19 8v6"/></svg>'},
        {"name": "Material", "category_id": "fashion_beauty", "attribute_name": "material", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3z"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>'},
        
        # Jobs category icons
        {"name": "Salary", "category_id": "jobs", "attribute_name": "salary", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>'},
        {"name": "Experience", "category_id": "jobs", "attribute_name": "experience", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>'},
        {"name": "Job Type", "category_id": "jobs", "attribute_name": "job_type", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>'},
        
        # Price icon (global)
        {"name": "Price Tag", "attribute_name": "price", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>'},
        {"name": "Description", "attribute_name": "description", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>'},
        {"name": "Title", "attribute_name": "title", "icon_type": "attribute", "svg_content": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>'},
    ]
    
    @router.post("/seed")
    async def seed_default_icons(current_user: dict = Depends(require_admin)):
        """Seed default icons for common attributes"""
        created = 0
        skipped = 0
        
        for icon_data in DEFAULT_ICONS:
            # Check if icon already exists
            existing = await db.attribute_icons.find_one({
                "name": icon_data["name"],
                "category_id": icon_data.get("category_id"),
                "attribute_name": icon_data.get("attribute_name")
            })
            
            if existing:
                skipped += 1
                continue
            
            icon_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc)
            
            icon_doc = {
                "id": icon_id,
                "name": icon_data["name"],
                "svg_content": icon_data["svg_content"],
                "category_id": icon_data.get("category_id"),
                "subcategory_id": icon_data.get("subcategory_id"),
                "attribute_name": icon_data.get("attribute_name"),
                "icon_type": icon_data.get("icon_type", "attribute"),
                "color": icon_data.get("color"),
                "description": icon_data.get("description"),
                "is_active": True,
                "created_at": now,
                "updated_at": now,
                "created_by": current_user.get("user_id")
            }
            
            await db.attribute_icons.insert_one(icon_doc)
            created += 1
        
        return {
            "success": True,
            "message": f"Seeded {created} icons, skipped {skipped} existing",
            "created": created,
            "skipped": skipped
        }
    
    return router
