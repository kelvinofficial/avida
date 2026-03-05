"""
Admin Branding API Routes
- GET /api/admin/branding - Get all brand assets
- POST /api/admin/branding/upload/{type} - Upload logo (primary, dark, light, favicon, etc.)
- PUT /api/admin/branding/settings - Update branding settings
- DELETE /api/admin/branding/{type} - Remove a logo
"""

import uuid
import logging
import base64
from datetime import datetime, timezone
from typing import Optional, List, Dict
from fastapi import APIRouter, HTTPException, Request, Depends, UploadFile, File, Form
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class BrandingSettingsUpdate(BaseModel):
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    font_family: Optional[str] = None
    border_radius: Optional[str] = None
    app_name: Optional[str] = None
    tagline: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None


def create_admin_branding_routes(db, get_current_user):
    """Create admin branding API routes"""
    
    router = APIRouter(prefix="/admin/branding", tags=["Admin Branding"])
    
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

    # Valid logo types
    VALID_LOGO_TYPES = [
        "primary",      # Main logo
        "dark",         # Logo for dark backgrounds
        "light",        # Logo for light backgrounds
        "favicon",      # Browser favicon
        "icon",         # App icon
        "splash",       # Splash screen logo
        "email",        # Email header logo
        "watermark",    # Watermark for images
        "og_image",     # Open Graph social sharing image
    ]

    @router.get("")
    async def get_branding(admin = Depends(require_admin)):
        """Get all brand assets and settings"""
        # Get branding settings
        settings = await db.branding_settings.find_one({"id": "global"}, {"_id": 0})
        
        if not settings:
            settings = {
                "id": "global",
                "primary_color": "#2E7D32",
                "secondary_color": "#1976D2",
                "accent_color": "#FF9800",
                "font_family": "Inter, sans-serif",
                "border_radius": "8px",
                "app_name": "Marketplace",
                "tagline": "Buy & Sell Anything",
                "meta_title": "Marketplace - Buy & Sell",
                "meta_description": "The best marketplace to buy and sell items",
            }
        
        # Get all logos
        logos = await db.branding_logos.find({}, {"_id": 0}).to_list(20)
        
        # Create logos dict by type
        logos_dict = {logo["type"]: logo for logo in logos}
        
        return {
            "settings": settings,
            "logos": logos_dict,
            "available_logo_types": VALID_LOGO_TYPES,
            "updated_at": settings.get("updated_at")
        }

    @router.post("/upload/{logo_type}")
    async def upload_logo(
        logo_type: str,
        file: UploadFile = File(...),
        admin = Depends(require_admin)
    ):
        """Upload logo (primary, dark, light, favicon, etc.)"""
        if logo_type not in VALID_LOGO_TYPES:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid logo type. Must be one of: {', '.join(VALID_LOGO_TYPES)}"
            )
        
        # Validate file type
        allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp", "image/x-icon", "image/ico"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: PNG, JPEG, SVG, WebP, ICO"
            )
        
        # Read file content
        content = await file.read()
        
        # Check file size (max 5MB)
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Maximum 5MB allowed.")
        
        # Convert to base64 for storage (or you can save to disk/cloud)
        base64_content = base64.b64encode(content).decode('utf-8')
        
        now = datetime.now(timezone.utc)
        logo_data = {
            "id": str(uuid.uuid4()),
            "type": logo_type,
            "filename": file.filename,
            "content_type": file.content_type,
            "size": len(content),
            "data": base64_content,  # Base64 encoded image
            "url": f"/api/admin/branding/logo/{logo_type}",  # Served URL
            "uploaded_by": admin.user_id,
            "uploaded_at": now,
            "updated_at": now
        }
        
        # Upsert - replace if exists
        await db.branding_logos.update_one(
            {"type": logo_type},
            {"$set": logo_data},
            upsert=True
        )
        
        return {
            "message": f"{logo_type} logo uploaded successfully",
            "logo": {
                "type": logo_type,
                "filename": file.filename,
                "size": len(content),
                "url": logo_data["url"],
                "uploaded_at": now.isoformat()
            }
        }

    @router.put("/settings")
    async def update_branding_settings(
        data: BrandingSettingsUpdate,
        admin = Depends(require_admin)
    ):
        """Update branding settings (colors, fonts, app name, etc.)"""
        now = datetime.now(timezone.utc)
        
        # Build update dict with only provided fields
        update_data = {"updated_at": now, "updated_by": admin.user_id}
        
        if data.primary_color is not None:
            update_data["primary_color"] = data.primary_color
        if data.secondary_color is not None:
            update_data["secondary_color"] = data.secondary_color
        if data.accent_color is not None:
            update_data["accent_color"] = data.accent_color
        if data.font_family is not None:
            update_data["font_family"] = data.font_family
        if data.border_radius is not None:
            update_data["border_radius"] = data.border_radius
        if data.app_name is not None:
            update_data["app_name"] = data.app_name
        if data.tagline is not None:
            update_data["tagline"] = data.tagline
        if data.meta_title is not None:
            update_data["meta_title"] = data.meta_title
        if data.meta_description is not None:
            update_data["meta_description"] = data.meta_description
        
        await db.branding_settings.update_one(
            {"id": "global"},
            {"$set": update_data},
            upsert=True
        )
        
        # Get updated settings
        settings = await db.branding_settings.find_one({"id": "global"}, {"_id": 0})
        
        return {
            "message": "Branding settings updated successfully",
            "settings": settings
        }

    @router.delete("/{logo_type}")
    async def delete_logo(logo_type: str, admin = Depends(require_admin)):
        """Remove a logo"""
        if logo_type not in VALID_LOGO_TYPES:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid logo type. Must be one of: {', '.join(VALID_LOGO_TYPES)}"
            )
        
        result = await db.branding_logos.delete_one({"type": logo_type})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail=f"Logo '{logo_type}' not found")
        
        return {"message": f"{logo_type} logo deleted successfully"}

    # Additional helper endpoint to serve logos
    @router.get("/logo/{logo_type}")
    async def get_logo(logo_type: str):
        """Get a specific logo file (public endpoint)"""
        logo = await db.branding_logos.find_one({"type": logo_type}, {"_id": 0})
        
        if not logo:
            raise HTTPException(status_code=404, detail=f"Logo '{logo_type}' not found")
        
        # Return base64 data with content type for client to decode
        # In production, you'd return the actual file or redirect to CDN
        return {
            "type": logo_type,
            "filename": logo.get("filename"),
            "content_type": logo.get("content_type"),
            "data": logo.get("data"),  # Base64 encoded
            "url": logo.get("url")
        }

    # Endpoint to get public branding (no auth required)
    @router.get("/public")
    async def get_public_branding():
        """Get public branding settings (no auth required)"""
        settings = await db.branding_settings.find_one({"id": "global"}, {"_id": 0})
        
        if not settings:
            settings = {
                "primary_color": "#2E7D32",
                "secondary_color": "#1976D2",
                "accent_color": "#FF9800",
                "font_family": "Inter, sans-serif",
                "border_radius": "8px",
                "app_name": "Marketplace",
                "tagline": "Buy & Sell Anything",
            }
        
        # Get logo URLs only (not the data)
        logos = await db.branding_logos.find({}, {"_id": 0, "data": 0}).to_list(20)
        logos_dict = {logo["type"]: {"url": logo.get("url"), "filename": logo.get("filename")} for logo in logos}
        
        return {
            "settings": {
                "primary_color": settings.get("primary_color"),
                "secondary_color": settings.get("secondary_color"),
                "accent_color": settings.get("accent_color"),
                "font_family": settings.get("font_family"),
                "border_radius": settings.get("border_radius"),
                "app_name": settings.get("app_name"),
                "tagline": settings.get("tagline"),
            },
            "logos": logos_dict
        }

    return router
