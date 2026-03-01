"""
Favorites Routes Module
Handles user favorites (saved listings) CRUD operations
"""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# ROUTER FACTORY
# =============================================================================

def create_favorites_router(db, require_auth, notify_stats_update=None, create_notification=None, notify_new_favorite=None):
    """
    Create the favorites router with dependencies injected
    
    Args:
        db: MongoDB database instance
        require_auth: Function to require authentication
        notify_stats_update: Optional callback to notify user of stats update via WebSocket
        create_notification: Optional callback to create in-app notifications
        notify_new_favorite: Optional callback to notify seller of new favorite via WebSocket
    
    Returns:
        APIRouter with favorites endpoints
    """
    router = APIRouter(prefix="/favorites", tags=["Favorites"])
    
    @router.post("/{listing_id}")
    async def add_favorite(listing_id: str, request: Request):
        """Add listing to favorites"""
        user = await require_auth(request)
        
        # Check if listing exists
        listing = await db.listings.find_one({"id": listing_id})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        # Check if already favorited
        existing = await db.favorites.find_one({"user_id": user.user_id, "listing_id": listing_id})
        if existing:
            return {"message": "Already favorited"}
        
        await db.favorites.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user.user_id,
            "listing_id": listing_id,
            "created_at": datetime.now(timezone.utc)
        })
        
        # Update favorites count
        await db.listings.update_one({"id": listing_id}, {"$inc": {"favorites_count": 1}})
        
        # Get listing owner ID for notifications
        seller_id = listing.get("user_id")
        
        # Don't notify if user favorites their own listing
        if seller_id and seller_id != user.user_id:
            # Get user info for notification message
            user_info = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "name": 1})
            user_name = user_info.get("name", "Someone") if user_info else "Someone"
            listing_title = listing.get("title", "your listing")
            
            # Notify seller of stats update via WebSocket (real-time favorite notification)
            if notify_stats_update:
                try:
                    import asyncio
                    asyncio.create_task(notify_stats_update(seller_id))
                except Exception as e:
                    logger.debug(f"Stats notification failed: {e}")
            
            # Send real-time favorite toast notification via WebSocket
            if notify_new_favorite:
                try:
                    import asyncio
                    asyncio.create_task(notify_new_favorite(seller_id, user_name, listing_title, listing_id))
                except Exception as e:
                    logger.debug(f"New favorite notification failed: {e}")
            
            # Create in-app notification for the seller
            if create_notification:
                try:
                    await create_notification(
                        user_id=seller_id,
                        notification_type="favorite",
                        title="New Favorite!",
                        message=f"{user_name} saved your listing \"{listing_title}\"",
                        data={
                            "listing_id": listing_id,
                            "favorited_by": user.user_id,
                            "listing_title": listing_title
                        }
                    )
                except Exception as e:
                    logger.debug(f"Notification creation failed: {e}")
        
        # Track behavior for smart notifications
        try:
            from smart_notifications import SmartNotificationService
            smart_service = SmartNotificationService(db)
            await smart_service.track_behavior(
                user_id=user.user_id,
                event_type="save_listing",
                entity_id=listing_id,
                entity_type="listing",
                metadata={
                    "category_id": listing.get("category_id"),
                    "price": listing.get("price"),
                    "title": listing.get("title"),
                }
            )
        except Exception as e:
            logger.debug(f"Behavior tracking failed: {e}")
        
        return {"message": "Added to favorites"}
    
    @router.delete("/{listing_id}")
    async def remove_favorite(listing_id: str, request: Request):
        """Remove listing from favorites"""
        user = await require_auth(request)
        
        result = await db.favorites.delete_one({"user_id": user.user_id, "listing_id": listing_id})
        
        if result.deleted_count > 0:
            await db.listings.update_one({"id": listing_id}, {"$inc": {"favorites_count": -1}})
        
        return {"message": "Removed from favorites"}
    
    @router.get("")
    async def get_favorites(request: Request):
        """Get user's favorite listings"""
        user = await require_auth(request)
        
        favorites = await db.favorites.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
        listing_ids = [f["listing_id"] for f in favorites]
        
        listings = await db.listings.find(
            {"id": {"$in": listing_ids}, "status": "active"}, 
            {"_id": 0}
        ).to_list(100)
        
        return listings
    
    return router
