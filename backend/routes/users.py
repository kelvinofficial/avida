"""
User Routes Module
Handles user profile management, blocking, and online status
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Set
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# MODELS
# =============================================================================

class UserUpdate(BaseModel):
    name: Optional[str] = None
    picture: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    notifications_enabled: Optional[bool] = None


class UserPublicProfile(BaseModel):
    user_id: str
    name: str
    picture: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    verified: bool = False
    rating: float = 0.0
    total_ratings: int = 0
    created_at: Optional[datetime] = None


# =============================================================================
# ROUTER FACTORY
# =============================================================================

def create_users_router(db, get_current_user, require_auth, online_users: Set[str]):
    """
    Create the users router with dependencies injected
    
    Args:
        db: MongoDB database instance
        get_current_user: Function to get current user from request (optional auth)
        require_auth: Function to require authentication
        online_users: Set of currently online user IDs (from Socket.IO)
    
    Returns:
        APIRouter with user endpoints
    """
    router = APIRouter(prefix="/users", tags=["Users"])
    
    @router.put("/me")
    async def update_user(update: UserUpdate, request: Request):
        """Update current user profile"""
        user = await require_auth(request)
        
        update_data = {k: v for k, v in update.model_dump().items() if v is not None}
        if update_data:
            await db.users.update_one({"user_id": user.user_id}, {"$set": update_data})
        
        # Exclude sensitive fields from response
        updated_user = await db.users.find_one(
            {"user_id": user.user_id}, 
            {"_id": 0, "password_hash": 0}
        )
        return updated_user
    
    @router.get("/{user_id}")
    async def get_user(user_id: str):
        """Get public user profile"""
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Return public info only
        return {
            "user_id": user["user_id"],
            "name": user["name"],
            "picture": user.get("picture"),
            "location": user.get("location"),
            "bio": user.get("bio"),
            "verified": user.get("verified", False),
            "rating": user.get("rating", 0),
            "total_ratings": user.get("total_ratings", 0),
            "created_at": user.get("created_at")
        }
    
    @router.post("/block/{user_id}")
    async def block_user(user_id: str, request: Request):
        """Block a user"""
        current_user = await require_auth(request)
        
        await db.users.update_one(
            {"user_id": current_user.user_id},
            {"$addToSet": {"blocked_users": user_id}}
        )
        return {"message": "User blocked"}
    
    @router.post("/unblock/{user_id}")
    async def unblock_user(user_id: str, request: Request):
        """Unblock a user"""
        current_user = await require_auth(request)
        
        await db.users.update_one(
            {"user_id": current_user.user_id},
            {"$pull": {"blocked_users": user_id}}
        )
        return {"message": "User unblocked"}
    
    @router.get("/{user_id}/status")
    async def get_user_status(user_id: str):
        """Get user online status and last seen"""
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "last_seen": 1, "settings": 1})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check privacy settings
        settings = user.get("settings", {})
        privacy = settings.get("privacy", {})
        show_online = privacy.get("show_online_status", True)
        show_last_seen = privacy.get("show_last_seen", True)
        
        # Check if user is currently online (in memory)
        is_online = user_id in online_users
        
        # Convert last_seen to ISO string
        last_seen = user.get("last_seen")
        if last_seen and isinstance(last_seen, datetime):
            last_seen = last_seen.isoformat() + "Z" if last_seen.tzinfo is None else last_seen.isoformat()
        
        response = {
            "user_id": user_id,
            "is_online": is_online if show_online else None,
            "last_seen": last_seen if show_last_seen and not is_online else None,
        }
        
        return response
    
    @router.post("/status/batch")
    async def get_users_status_batch(user_ids: List[str]):
        """Get online status for multiple users at once"""
        result = {}
        
        # Fetch all users in one query
        users = await db.users.find(
            {"user_id": {"$in": user_ids}},
            {"_id": 0, "user_id": 1, "last_seen": 1, "settings": 1}
        ).to_list(length=100)
        
        user_map = {u["user_id"]: u for u in users}
        
        for user_id in user_ids:
            user = user_map.get(user_id)
            if not user:
                result[user_id] = {"is_online": False, "last_seen": None}
                continue
            
            # Check privacy settings
            settings = user.get("settings", {})
            privacy = settings.get("privacy", {})
            show_online = privacy.get("show_online_status", True)
            show_last_seen = privacy.get("show_last_seen", True)
            
            # Check if user is currently online (in memory)
            is_online = user_id in online_users
            
            # Convert last_seen to ISO string
            last_seen = user.get("last_seen")
            if last_seen and isinstance(last_seen, datetime):
                last_seen = last_seen.isoformat() + "Z" if last_seen.tzinfo is None else last_seen.isoformat()
            
            result[user_id] = {
                "is_online": is_online if show_online else None,
                "last_seen": last_seen if show_last_seen and not is_online else None,
            }
        
        return result
    
    return router
