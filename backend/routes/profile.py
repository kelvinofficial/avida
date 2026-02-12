"""
Profile Routes Module
Handles user profile management, public profiles, and profile-related activities.
"""

from fastapi import APIRouter, HTTPException, Request, Query
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


def create_profile_router(db, require_auth, get_current_user):
    """
    Factory function to create profile router with dependencies.
    
    Args:
        db: MongoDB database instance
        require_auth: Dependency function for required authentication
        get_current_user: Dependency function for optional authentication
    
    Returns:
        APIRouter instance with profile routes
    """
    router = APIRouter(prefix="/profile", tags=["profile"])

    @router.get("")
    async def get_profile(request: Request):
        """Get current user profile with stats"""
        user = await require_auth(request)
        
        user_data = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
        
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get stats
        active_listings = await db.listings.count_documents({"user_id": user.user_id, "status": "active"})
        sold_listings = await db.listings.count_documents({"user_id": user.user_id, "status": "sold"})
        total_favorites = await db.favorites.count_documents({"user_id": user.user_id})
        
        # Get total views on all listings
        pipeline = [
            {"$match": {"user_id": user.user_id}},
            {"$group": {"_id": None, "total_views": {"$sum": "$views"}}}
        ]
        views_result = await db.listings.aggregate(pipeline).to_list(1)
        total_views = views_result[0]["total_views"] if views_result else 0
        
        # Purchases (conversations where user is buyer and listing is sold)
        purchases = await db.conversations.count_documents({
            "buyer_id": user.user_id
        })
        
        return {
            **user_data,
            "stats": {
                "active_listings": active_listings,
                "sold_listings": sold_listings,
                "total_favorites": total_favorites,
                "total_views": total_views,
                "purchases": purchases,
                "sales_count": sold_listings
            }
        }

    @router.put("")
    async def update_profile(request: Request):
        """Update user profile"""
        user = await require_auth(request)
        body = await request.json()
        
        update_data = {}
        allowed_fields = ["name", "phone", "location", "bio", "picture"]
        
        for field in allowed_fields:
            if field in body and body[field] is not None:
                update_data[field] = body[field]
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": update_data}
        )
        
        # Get updated user
        updated_user = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
        
        return {"message": "Profile updated successfully", "user": updated_user}

    @router.get("/public/{user_id}")
    async def get_public_profile(user_id: str, request: Request):
        """Get public profile of a user"""
        # Check if current user has blocked or is blocked by target user
        current_user = await get_current_user(request)
        
        if current_user:
            # Check if blocked
            blocked = await db.blocked_users.find_one({
                "$or": [
                    {"user_id": current_user.user_id, "blocked_user_id": user_id},
                    {"user_id": user_id, "blocked_user_id": current_user.user_id}
                ]
            })
            
            if blocked:
                raise HTTPException(status_code=403, detail="Cannot view this profile")
        
        user_data = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        
        # If user not found, try to build profile from listings data
        if not user_data:
            # Check if there are any listings from this seller
            listing = await db.listings.find_one({"user_id": user_id})
            if not listing:
                listing = await db.auto_listings.find_one({"user_id": user_id})
            if not listing:
                listing = await db.properties.find_one({"user_id": user_id})
            
            if listing and listing.get("seller"):
                # Create a placeholder profile from seller info
                seller = listing["seller"]
                user_data = {
                    "user_id": user_id,
                    "name": seller.get("name", "Unknown Seller"),
                    "picture": seller.get("picture"),
                    "location": seller.get("location"),
                    "bio": None,
                    "verified": seller.get("verified", False),
                    "email_verified": seller.get("verified", False),
                    "phone_verified": False,
                    "id_verified": False,
                    "rating": seller.get("rating", 0),
                    "total_ratings": seller.get("totalRatings", 0),
                    "created_at": listing.get("created_at", datetime.now(timezone.utc)),
                }
            else:
                raise HTTPException(status_code=404, detail="User not found")
        
        # Get user settings to check privacy
        settings = await db.user_settings.find_one({"user_id": user_id})
        privacy = settings.get("privacy", {}) if settings else {}
        
        if not privacy.get("allow_profile_discovery", True):
            raise HTTPException(status_code=403, detail="This profile is private")
        
        # Get stats from all collections
        active_listings = await db.listings.count_documents({"user_id": user_id, "status": "active"})
        active_properties = await db.properties.count_documents({"user_id": user_id, "status": "active"})
        active_auto = await db.auto_listings.count_documents({"user_id": user_id, "status": "active"})
        
        sold_listings = await db.listings.count_documents({"user_id": user_id, "status": "sold"})
        sold_properties = await db.properties.count_documents({"user_id": user_id, "status": "sold"})
        sold_auto = await db.auto_listings.count_documents({"user_id": user_id, "status": "sold"})
        
        # Check if current user is following
        is_following = False
        if current_user:
            follow = await db.follows.find_one({
                "follower_id": current_user.user_id,
                "following_id": user_id
            })
            is_following = follow is not None
        
        # Get follower/following counts
        followers_count = await db.follows.count_documents({"following_id": user_id})
        following_count = await db.follows.count_documents({"follower_id": user_id})
        
        # Return limited public info
        return {
            "user_id": user_data["user_id"],
            "name": user_data.get("name"),
            "picture": user_data.get("picture"),
            "location": user_data.get("location"),
            "bio": user_data.get("bio"),
            "verified": user_data.get("verified", False),
            "email_verified": user_data.get("email_verified", False),
            "phone_verified": user_data.get("phone_verified", False),
            "id_verified": user_data.get("id_verified", False),
            "rating": user_data.get("rating", 0),
            "total_ratings": user_data.get("total_ratings", 0),
            "created_at": user_data.get("created_at"),
            "stats": {
                "active_listings": active_listings + active_properties + active_auto,
                "sold_listings": sold_listings + sold_properties + sold_auto,
                "followers": followers_count,
                "following": following_count
            },
            "is_following": is_following,
            "online_status": privacy.get("show_online_status", True),
            "last_seen": user_data.get("last_seen") if privacy.get("show_last_seen", True) else None
        }

    @router.get("/public/{user_id}/badges")
    async def get_user_public_badges(user_id: str):
        """Get public badges earned by a user - visible to all visitors"""
        # Check if user exists
        user = await db.users.find_one({"user_id": user_id})
        if not user:
            # Check if there are listings from this seller
            listing = await db.listings.find_one({"user_id": user_id})
            if not listing:
                listing = await db.auto_listings.find_one({"user_id": user_id})
            if not listing:
                listing = await db.properties.find_one({"user_id": user_id})
            if not listing:
                raise HTTPException(status_code=404, detail="User not found")
        
        # Get user badges
        user_badges_cursor = db.user_badges.find({"user_id": user_id})
        user_badges = await user_badges_cursor.to_list(length=100)
        
        if not user_badges:
            return {"badges": []}
        
        # Get badge details for each awarded badge
        badge_ids = [ub.get("badge_id") for ub in user_badges]
        badges_cursor = db.badges.find({
            "id": {"$in": badge_ids},
            "is_active": True
        })
        badges = await badges_cursor.to_list(length=100)
        
        # Create a map of badge details
        badge_map = {b["id"]: b for b in badges}
        
        # Combine badge info with award info, sorted by display_priority
        result_badges = []
        for ub in user_badges:
            badge = badge_map.get(ub.get("badge_id"))
            if badge:
                result_badges.append({
                    "id": badge["id"],
                    "name": badge["name"],
                    "description": badge.get("description", ""),
                    "icon": badge.get("icon", "verified"),
                    "color": badge.get("color", "#4CAF50"),
                    "type": badge.get("type", "achievement"),
                    "display_priority": badge.get("display_priority", 0),
                    "awarded_at": ub.get("awarded_at"),
                    "awarded_reason": ub.get("reason", "")
                })
        
        # Sort by display_priority (higher first)
        result_badges.sort(key=lambda x: x.get("display_priority", 0), reverse=True)
        
        return {"badges": result_badges}

    @router.get("/activity/favorites")
    async def get_saved_items(
        request: Request,
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100)
    ):
        """Get user's saved/favorite items"""
        user = await require_auth(request)
        
        skip = (page - 1) * limit
        
        # Get favorites
        favorites = await db.favorites.find(
            {"user_id": user.user_id},
            {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        # Get listing details from all collections
        listing_ids = [f["listing_id"] for f in favorites]
        
        listings = await db.listings.find({"id": {"$in": listing_ids}}, {"_id": 0}).to_list(len(listing_ids))
        properties = await db.properties.find({"id": {"$in": listing_ids}}, {"_id": 0}).to_list(len(listing_ids))
        auto_listings = await db.auto_listings.find({"id": {"$in": listing_ids}}, {"_id": 0}).to_list(len(listing_ids))
        
        listings_map = {}
        for listing_item in listings:
            listings_map[listing_item["id"]] = {**listing_item, "type": "listing"}
        for p in properties:
            listings_map[p["id"]] = {**p, "type": "property"}
        for a in auto_listings:
            listings_map[a["id"]] = {**a, "type": "auto"}
        
        result = []
        for fav in favorites:
            listing = listings_map.get(fav["listing_id"])
            if listing:
                result.append({
                    **listing,
                    "saved_at": fav.get("created_at")
                })
        
        total = await db.favorites.count_documents({"user_id": user.user_id})
        
        return {"items": result, "total": total, "page": page}

    @router.delete("/activity/recently-viewed")
    async def clear_recently_viewed(request: Request):
        """Clear recently viewed history"""
        user = await require_auth(request)
        
        await db.recently_viewed.delete_many({"user_id": user.user_id})
        
        return {"message": "Viewing history cleared"}

    return router
