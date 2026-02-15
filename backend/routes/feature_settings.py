"""
Feature Settings Routes
Allows admin to enable/disable UI features like view counts, stats, users who saved listings.
"""

from fastapi import APIRouter, HTTPException, Request, Body
from datetime import datetime, timezone
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def create_feature_settings_router(db, require_auth):
    """Create feature settings router with dependency injection."""
    router = APIRouter(prefix="/feature-settings", tags=["feature-settings"])
    
    # Default feature settings
    DEFAULT_SETTINGS = {
        "show_view_count": True,
        "show_save_count": True,
        "show_listing_stats": True,
        "show_seller_stats": True,
        "show_distance": True,
        "show_time_ago": True,
        "show_negotiable_badge": True,
        "show_featured_badge": True,
        "location_mode": "region",  # region, district, city
        "default_country": "TZ",
        "allow_country_change": False,
        "currency": "TZS",
        "currency_symbol": "TSh",
        "currency_position": "before",
    }
    
    @router.get("")
    async def get_feature_settings():
        """Get current feature settings"""
        try:
            settings = await db.feature_settings.find_one({"type": "global"})
            if not settings:
                # Return defaults if no settings exist
                return DEFAULT_SETTINGS
            
            # Remove MongoDB _id field
            result = {k: v for k, v in settings.items() if k not in ['_id', 'type']}
            # Merge with defaults for any missing keys
            return {**DEFAULT_SETTINGS, **result}
        except Exception as e:
            logger.error(f"Error getting feature settings: {e}")
            return DEFAULT_SETTINGS
    
    @router.put("")
    async def update_feature_settings(
        request: Request,
        show_view_count: Optional[bool] = Body(None),
        show_save_count: Optional[bool] = Body(None),
        show_listing_stats: Optional[bool] = Body(None),
        show_seller_stats: Optional[bool] = Body(None),
        show_distance: Optional[bool] = Body(None),
        show_time_ago: Optional[bool] = Body(None),
        show_negotiable_badge: Optional[bool] = Body(None),
        show_featured_badge: Optional[bool] = Body(None),
        location_mode: Optional[str] = Body(None),
        default_country: Optional[str] = Body(None),
        allow_country_change: Optional[bool] = Body(None),
    ):
        """Update feature settings (admin only)"""
        # Build update document with only provided fields
        update_fields = {}
        if show_view_count is not None:
            update_fields["show_view_count"] = show_view_count
        if show_save_count is not None:
            update_fields["show_save_count"] = show_save_count
        if show_listing_stats is not None:
            update_fields["show_listing_stats"] = show_listing_stats
        if show_seller_stats is not None:
            update_fields["show_seller_stats"] = show_seller_stats
        if show_distance is not None:
            update_fields["show_distance"] = show_distance
        if show_time_ago is not None:
            update_fields["show_time_ago"] = show_time_ago
        if show_negotiable_badge is not None:
            update_fields["show_negotiable_badge"] = show_negotiable_badge
        if show_featured_badge is not None:
            update_fields["show_featured_badge"] = show_featured_badge
        if location_mode is not None:
            if location_mode not in ["region", "district", "city"]:
                raise HTTPException(status_code=400, detail="Invalid location_mode. Must be region, district, or city")
            update_fields["location_mode"] = location_mode
        if default_country is not None:
            update_fields["default_country"] = default_country
        if allow_country_change is not None:
            update_fields["allow_country_change"] = allow_country_change
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        update_fields["updated_at"] = datetime.now(timezone.utc)
        
        try:
            result = await db.feature_settings.update_one(
                {"type": "global"},
                {"$set": update_fields},
                upsert=True
            )
            
            # Return updated settings
            settings = await db.feature_settings.find_one({"type": "global"})
            result = {k: v for k, v in settings.items() if k not in ['_id', 'type']}
            return {**DEFAULT_SETTINGS, **result}
        except Exception as e:
            logger.error(f"Error updating feature settings: {e}")
            raise HTTPException(status_code=500, detail="Failed to update settings")
    
    return router
