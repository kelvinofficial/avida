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
import base64
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


class IconResponse(BaseModel):
    id: str
    name: str
    svg_content: str
    category_id: Optional[str] = None
    subcategory_id: Optional[str] = None
    attribute_name: Optional[str] = None
    icon_type: str
    color: Optional[str] = None
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


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
        db: MongoDB database instance
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
        
        icons = list(db.attribute_icons.find(query, {"_id": 0}))
        return {"icons": icons, "total": len(icons)}
    
    @router.get("/public/{icon_id}")
    async def get_public_icon(icon_id: str):
        """Get a single icon by ID (public endpoint)"""
        icon = db.attribute_icons.find_one(
            {"id": icon_id, "is_active": True},
            {"_id": 0}
        )
        if not icon:
            raise HTTPException(status_code=404, detail="Icon not found")
        return icon
    
    @router.get("/public/{icon_id}/svg")
    async def get_icon_svg(icon_id: str):
        """Get just the SVG content of an icon"""
        icon = db.attribute_icons.find_one(
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
        icons = list(db.attribute_icons.find(
            {"category_id": category_id, "is_active": True},
            {"_id": 0}
        ))
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
        
        icon = db.attribute_icons.find_one(query, {"_id": 0})
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
        
        icons = list(db.attribute_icons.find(query, {"_id": 0})
                    .sort("created_at", -1)
                    .skip(skip)
                    .limit(limit))
        
        total = db.attribute_icons.count_documents(query)
        
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
        total = db.attribute_icons.count_documents({})
        active = db.attribute_icons.count_documents({"is_active": True})
        
        # Count by type
        by_type = {}
        for icon_type in ["category", "subcategory", "attribute"]:
            by_type[icon_type] = db.attribute_icons.count_documents({"icon_type": icon_type})
        
        # Count by category
        by_category = list(db.attribute_icons.aggregate([
            {"$match": {"category_id": {"$ne": None}}},
            {"$group": {"_id": "$category_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]))
        
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
        
        db.attribute_icons.insert_one(icon_doc)
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
        
        db.attribute_icons.insert_one(icon_doc)
        del icon_doc["_id"]
        
        return {"success": True, "icon": icon_doc}
    
    @router.put("/{icon_id}")
    async def update_icon(
        icon_id: str,
        updates: IconUpdate,
        current_user: dict = Depends(require_admin)
    ):
        """Update an existing icon"""
        existing = db.attribute_icons.find_one({"id": icon_id})
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
        
        db.attribute_icons.update_one({"id": icon_id}, {"$set": update_data})
        
        updated = db.attribute_icons.find_one({"id": icon_id}, {"_id": 0})
        return {"success": True, "icon": updated}
    
    @router.delete("/{icon_id}")
    async def delete_icon(
        icon_id: str,
        current_user: dict = Depends(require_admin)
    ):
        """Soft delete an icon"""
        existing = db.attribute_icons.find_one({"id": icon_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Icon not found")
        
        db.attribute_icons.update_one(
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
        result = db.attribute_icons.delete_one({"id": icon_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Icon not found")
        
        return {"success": True, "message": "Icon permanently deleted"}
    
    @router.post("/{icon_id}/restore")
    async def restore_icon(
        icon_id: str,
        current_user: dict = Depends(require_admin)
    ):
        """Restore a soft-deleted icon"""
        existing = db.attribute_icons.find_one({"id": icon_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Icon not found")
        
        db.attribute_icons.update_one(
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
                
                db.attribute_icons.insert_one(icon_doc)
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
        existing = db.attribute_icons.find_one({"id": icon_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Icon not found")
        
        db.attribute_icons.update_one(
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
        icons = list(db.attribute_icons.find(
            {"is_active": True},
            {"_id": 0, "id": 1, "name": 1, "category_id": 1, "subcategory_id": 1, "attribute_name": 1, "icon_type": 1}
        ))
        
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
    
    return router
