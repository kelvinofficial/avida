"""
Listing Moderation and User Limits System
- Item validation settings (Validate/Reject/Remove)
- User listing limits
- Moderation queue
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum

logger = logging.getLogger(__name__)


class ModerationAction(str, Enum):
    VALIDATE = "validate"   # Approve and make visible
    REJECT = "reject"       # Keep deactivated
    REMOVE = "remove"       # Delete listing


class ModerationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ListingLimitTier(str, Enum):
    FREE = "free"
    BASIC = "basic"
    PREMIUM = "premium"
    UNLIMITED = "unlimited"


# Default listing limits by tier
DEFAULT_LISTING_LIMITS = {
    ListingLimitTier.FREE: 5,
    ListingLimitTier.BASIC: 20,
    ListingLimitTier.PREMIUM: 100,
    ListingLimitTier.UNLIMITED: None  # No limit
}


class ModerationDecision(BaseModel):
    action: ModerationAction
    reason: Optional[str] = None
    notify_user: bool = True


class UserLimitSettings(BaseModel):
    user_id: str
    tier: ListingLimitTier = ListingLimitTier.FREE
    custom_limit: Optional[int] = None  # Override tier limit
    is_unlimited: bool = False


def create_moderation_router(db, get_current_user):
    """Create listing moderation router"""
    from fastapi import APIRouter, HTTPException, Request, Depends
    
    router = APIRouter(prefix="/moderation", tags=["Moderation"])
    
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
    
    # =========================================================================
    # MODERATION QUEUE
    # =========================================================================
    
    @router.get("/queue")
    async def get_moderation_queue(
        status: Optional[str] = "pending",
        category: Optional[str] = None,
        limit: int = 50,
        skip: int = 0,
        admin = Depends(require_admin)
    ):
        """Get listings pending moderation"""
        query = {}
        
        if status == "pending":
            query["moderation_status"] = {"$in": [None, "pending"]}
            query["is_active"] = False
        elif status == "approved":
            query["moderation_status"] = "approved"
        elif status == "rejected":
            query["moderation_status"] = "rejected"
        
        if category:
            query["category"] = category
        
        cursor = db.listings.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
        listings = await cursor.to_list(length=limit)
        
        # Get user info for each listing
        for listing in listings:
            user = await db.users.find_one({"user_id": listing.get("user_id")}, {"_id": 0, "name": 1, "email": 1})
            listing["user"] = user
        
        total = await db.listings.count_documents(query)
        
        return {"listings": listings, "total": total, "pending_count": await db.listings.count_documents({"moderation_status": {"$in": [None, "pending"]}, "is_active": False})}
    
    @router.post("/decide/{listing_id}")
    async def moderate_listing(listing_id: str, decision: ModerationDecision, admin = Depends(require_admin)):
        """Make a moderation decision on a listing"""
        listing = await db.listings.find_one({"id": listing_id})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        now = datetime.now(timezone.utc)
        
        if decision.action == ModerationAction.VALIDATE:
            # Approve listing
            await db.listings.update_one(
                {"id": listing_id},
                {"$set": {
                    "is_active": True,
                    "moderation_status": "approved",
                    "moderated_at": now,
                    "moderated_by": admin.user_id,
                    "moderation_reason": decision.reason
                }}
            )
            message = "Listing approved and now visible"
            
        elif decision.action == ModerationAction.REJECT:
            # Reject listing (keep it deactivated)
            await db.listings.update_one(
                {"id": listing_id},
                {"$set": {
                    "is_active": False,
                    "moderation_status": "rejected",
                    "moderated_at": now,
                    "moderated_by": admin.user_id,
                    "moderation_reason": decision.reason
                }}
            )
            message = "Listing rejected"
            
        elif decision.action == ModerationAction.REMOVE:
            # Delete listing
            await db.listings.delete_one({"id": listing_id})
            message = "Listing removed"
        
        # Notify user if requested
        if decision.notify_user and decision.action != ModerationAction.REMOVE:
            notification_title = "Listing Update"
            if decision.action == ModerationAction.VALIDATE:
                notification_msg = f"Your listing '{listing.get('title', '')}' has been approved and is now live!"
            else:
                notification_msg = f"Your listing '{listing.get('title', '')}' was not approved. Reason: {decision.reason or 'Does not meet guidelines'}"
            
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": listing["user_id"],
                "type": "listing_moderation",
                "title": notification_title,
                "message": notification_msg,
                "listing_id": listing_id,
                "is_read": False,
                "created_at": now
            })
        
        # Log moderation action
        await db.moderation_log.insert_one({
            "id": str(uuid.uuid4()),
            "listing_id": listing_id,
            "listing_title": listing.get("title"),
            "user_id": listing["user_id"],
            "admin_id": admin.user_id,
            "admin_email": admin.email,
            "action": decision.action,
            "reason": decision.reason,
            "created_at": now
        })
        
        logger.info(f"Listing {listing_id} moderated: {decision.action} by {admin.email}")
        
        return {"message": message, "action": decision.action}
    
    @router.post("/bulk-decide")
    async def bulk_moderate(request: Request, admin = Depends(require_admin)):
        """Bulk moderation decision"""
        data = await request.json()
        listing_ids = data.get("listing_ids", [])
        action = data.get("action")
        reason = data.get("reason")
        notify_users = data.get("notify_users", True)
        
        if not listing_ids or not action:
            raise HTTPException(status_code=400, detail="listing_ids and action required")
        
        results = {"success": 0, "failed": 0}
        
        for listing_id in listing_ids:
            try:
                decision = ModerationDecision(action=action, reason=reason, notify_user=notify_users)
                await moderate_listing(listing_id, decision, admin)
                results["success"] += 1
            except Exception as e:
                logger.error(f"Bulk moderation error for {listing_id}: {e}")
                results["failed"] += 1
        
        return results
    
    @router.get("/log")
    async def get_moderation_log(
        listing_id: Optional[str] = None,
        admin_id: Optional[str] = None,
        action: Optional[str] = None,
        limit: int = 100,
        admin = Depends(require_admin)
    ):
        """Get moderation history"""
        query = {}
        if listing_id:
            query["listing_id"] = listing_id
        if admin_id:
            query["admin_id"] = admin_id
        if action:
            query["action"] = action
        
        cursor = db.moderation_log.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
        logs = await cursor.to_list(length=limit)
        
        return {"logs": logs}
    
    # =========================================================================
    # LISTING LIMITS
    # =========================================================================
    
    @router.get("/limits/settings")
    async def get_limit_settings(admin = Depends(require_admin)):
        """Get global listing limit settings"""
        settings = await db.app_settings.find_one({"key": "listing_limits"})
        
        if not settings:
            # Return defaults
            return {
                "require_moderation": True,
                "auto_approve_verified_users": True,
                "auto_approve_premium_users": True,
                "default_tier": ListingLimitTier.FREE,
                "tier_limits": DEFAULT_LISTING_LIMITS,
                "moderation_enabled": True
            }
        
        return settings.get("value", {})
    
    @router.put("/limits/settings")
    async def update_limit_settings(request: Request, admin = Depends(require_admin)):
        """Update global listing limit settings"""
        data = await request.json()
        
        await db.app_settings.update_one(
            {"key": "listing_limits"},
            {"$set": {"key": "listing_limits", "value": data, "updated_at": datetime.now(timezone.utc)}},
            upsert=True
        )
        
        return {"message": "Settings updated"}
    
    @router.get("/limits/user/{user_id}")
    async def get_user_limits(user_id: str, admin = Depends(require_admin)):
        """Get user's listing limits and usage"""
        user = await db.users.find_one({"user_id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get user's custom limits
        user_limits = await db.user_listing_limits.find_one({"user_id": user_id})
        
        # Get current listing count
        active_listings = await db.listings.count_documents({"user_id": user_id, "is_active": True})
        total_listings = await db.listings.count_documents({"user_id": user_id})
        
        # Determine effective limit
        settings = await get_limit_settings(admin)
        
        if user_limits and user_limits.get("is_unlimited"):
            effective_limit = None
        elif user_limits and user_limits.get("custom_limit") is not None:
            effective_limit = user_limits["custom_limit"]
        else:
            tier = user_limits.get("tier") if user_limits else settings.get("default_tier", ListingLimitTier.FREE)
            effective_limit = settings.get("tier_limits", DEFAULT_LISTING_LIMITS).get(tier, 5)
        
        return {
            "user_id": user_id,
            "user_name": user.get("name"),
            "tier": user_limits.get("tier") if user_limits else ListingLimitTier.FREE,
            "custom_limit": user_limits.get("custom_limit") if user_limits else None,
            "is_unlimited": user_limits.get("is_unlimited", False) if user_limits else False,
            "effective_limit": effective_limit,
            "active_listings": active_listings,
            "total_listings": total_listings,
            "remaining": (effective_limit - active_listings) if effective_limit else None,
            "can_post": effective_limit is None or active_listings < effective_limit
        }
    
    @router.put("/limits/user/{user_id}")
    async def set_user_limits(user_id: str, request: Request, admin = Depends(require_admin)):
        """Set custom limits for a user"""
        data = await request.json()
        
        user = await db.users.find_one({"user_id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        update_data = {
            "user_id": user_id,
            "updated_at": datetime.now(timezone.utc),
            "updated_by": admin.user_id
        }
        
        if "tier" in data:
            update_data["tier"] = data["tier"]
        if "custom_limit" in data:
            update_data["custom_limit"] = data["custom_limit"]
        if "is_unlimited" in data:
            update_data["is_unlimited"] = data["is_unlimited"]
        
        await db.user_listing_limits.update_one(
            {"user_id": user_id},
            {"$set": update_data, "$setOnInsert": {"created_at": datetime.now(timezone.utc)}},
            upsert=True
        )
        
        logger.info(f"User {user_id} limits updated by {admin.email}")
        
        return {"message": "User limits updated"}
    
    # =========================================================================
    # USER-FACING ENDPOINTS
    # =========================================================================
    
    @router.get("/my-limits")
    async def get_my_limits(user = Depends(require_auth)):
        """Get current user's listing limits"""
        # Get user's custom limits
        user_limits = await db.user_listing_limits.find_one({"user_id": user.user_id})
        
        # Get current listing count
        active_listings = await db.listings.count_documents({"user_id": user.user_id, "is_active": True})
        
        # Get global settings
        settings = await db.app_settings.find_one({"key": "listing_limits"})
        settings = settings.get("value", {}) if settings else {}
        
        # Determine effective limit
        if user_limits and user_limits.get("is_unlimited"):
            effective_limit = None
        elif user_limits and user_limits.get("custom_limit") is not None:
            effective_limit = user_limits["custom_limit"]
        else:
            tier = user_limits.get("tier") if user_limits else settings.get("default_tier", ListingLimitTier.FREE)
            tier_limits = settings.get("tier_limits", DEFAULT_LISTING_LIMITS)
            effective_limit = tier_limits.get(tier, 5)
        
        return {
            "tier": user_limits.get("tier") if user_limits else ListingLimitTier.FREE,
            "limit": effective_limit,
            "used": active_listings,
            "remaining": (effective_limit - active_listings) if effective_limit else None,
            "can_post": effective_limit is None or active_listings < effective_limit,
            "is_unlimited": effective_limit is None
        }
    
    return router


async def check_user_can_post(db, user_id: str) -> tuple[bool, str]:
    """Check if user can post a new listing"""
    # Get user's limits
    user_limits = await db.user_listing_limits.find_one({"user_id": user_id})
    
    # Check if unlimited
    if user_limits and user_limits.get("is_unlimited"):
        return True, "OK"
    
    # Get active listing count
    active_listings = await db.listings.count_documents({"user_id": user_id, "is_active": True})
    
    # Get effective limit
    settings = await db.app_settings.find_one({"key": "listing_limits"})
    settings = settings.get("value", {}) if settings else {}
    
    if user_limits and user_limits.get("custom_limit") is not None:
        effective_limit = user_limits["custom_limit"]
    else:
        tier = user_limits.get("tier") if user_limits else settings.get("default_tier", "free")
        tier_limits = settings.get("tier_limits", DEFAULT_LISTING_LIMITS)
        effective_limit = tier_limits.get(tier, 5)
    
    if effective_limit is None:
        return True, "OK"
    
    if active_listings >= effective_limit:
        return False, f"You have reached your listing limit ({effective_limit}). Upgrade to post more."
    
    return True, "OK"


async def should_auto_approve(db, user_id: str) -> bool:
    """Check if user's listings should be auto-approved"""
    settings = await db.app_settings.find_one({"key": "listing_limits"})
    settings = settings.get("value", {}) if settings else {}
    
    if not settings.get("moderation_enabled", True):
        return True  # No moderation, auto-approve all
    
    if not settings.get("require_moderation", True):
        return True
    
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        return False
    
    if settings.get("auto_approve_verified_users") and user.get("is_verified"):
        return True
    
    if settings.get("auto_approve_premium_users") and user.get("is_premium"):
        return True
    
    return False
