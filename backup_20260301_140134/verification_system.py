"""
Verification System for Users and Sellers

Features:
- Manual admin approval for verification tiers:
  - verified_user: Basic verified status
  - verified_seller: Verified seller status  
  - premium_verified_seller: Premium verified seller
  
Benefits by tier:
- Badge display in profile/listings
- Lower commission rates
- Priority in search results
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field

from fastapi import APIRouter, HTTPException, Query, Body, Depends, Request
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class VerificationTier(str, Enum):
    UNVERIFIED = "unverified"
    VERIFIED_USER = "verified_user"
    VERIFIED_SELLER = "verified_seller"
    PREMIUM_VERIFIED_SELLER = "premium_verified_seller"


class VerificationRequestStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class VerificationRequest(BaseModel):
    user_id: str
    requested_tier: VerificationTier
    reason: Optional[str] = None


class VerificationAction(BaseModel):
    action: str  # "approve" or "reject"
    reason: Optional[str] = None


# Tier benefits configuration
TIER_BENEFITS = {
    VerificationTier.UNVERIFIED: {
        "badge": None,
        "commission_discount": 0,  # percentage discount from base commission
        "search_priority_boost": 0,
    },
    VerificationTier.VERIFIED_USER: {
        "badge": "verified",
        "commission_discount": 0,
        "search_priority_boost": 5,
    },
    VerificationTier.VERIFIED_SELLER: {
        "badge": "verified_seller",
        "commission_discount": 10,  # 10% off base commission
        "search_priority_boost": 15,
    },
    VerificationTier.PREMIUM_VERIFIED_SELLER: {
        "badge": "premium_seller",
        "commission_discount": 25,  # 25% off base commission
        "search_priority_boost": 30,
    },
}


class VerificationService:
    """Service for handling user/seller verification"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.users = db.users
        self.verification_requests = db.verification_requests
        self.verification_history = db.verification_history
    
    async def get_user_verification(self, user_id: str) -> Dict:
        """Get user's current verification status"""
        user = await self.users.find_one({"user_id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        verification = user.get("verification", {})
        tier = verification.get("tier", VerificationTier.UNVERIFIED)
        benefits = TIER_BENEFITS.get(tier, TIER_BENEFITS[VerificationTier.UNVERIFIED])
        
        return {
            "user_id": user_id,
            "tier": tier,
            "verified_at": verification.get("verified_at"),
            "verified_by": verification.get("verified_by"),
            "benefits": benefits,
            "badge": benefits.get("badge"),
        }
    
    async def request_verification(self, user_id: str, requested_tier: VerificationTier, reason: str = None) -> Dict:
        """Submit a verification request"""
        # Check if user exists
        user = await self.users.find_one({"user_id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if there's already a pending request
        existing = await self.verification_requests.find_one({
            "user_id": user_id,
            "status": VerificationRequestStatus.PENDING
        })
        if existing:
            raise HTTPException(status_code=400, detail="You already have a pending verification request")
        
        request_id = f"vr_{uuid.uuid4().hex[:12]}"
        request = {
            "id": request_id,
            "user_id": user_id,
            "user_name": user.get("name", "Unknown"),
            "user_email": user.get("email", ""),
            "current_tier": user.get("verification", {}).get("tier", VerificationTier.UNVERIFIED),
            "requested_tier": requested_tier,
            "reason": reason,
            "status": VerificationRequestStatus.PENDING,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        
        await self.verification_requests.insert_one(request)
        return {k: v for k, v in request.items() if k != "_id"}
    
    async def get_pending_requests(self, page: int = 1, limit: int = 20) -> Dict:
        """Get pending verification requests (admin)"""
        query = {"status": VerificationRequestStatus.PENDING}
        skip = (page - 1) * limit
        
        total = await self.verification_requests.count_documents(query)
        requests = await self.verification_requests.find(
            query, {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        return {
            "requests": requests,
            "total": total,
            "page": page,
            "limit": limit
        }
    
    async def process_verification_request(
        self,
        request_id: str,
        action: str,
        admin_id: str,
        reason: str = None
    ) -> Dict:
        """Process a verification request (approve/reject)"""
        request = await self.verification_requests.find_one({"id": request_id})
        if not request:
            raise HTTPException(status_code=404, detail="Request not found")
        
        if request["status"] != VerificationRequestStatus.PENDING:
            raise HTTPException(status_code=400, detail="Request already processed")
        
        now = datetime.now(timezone.utc).isoformat()
        
        if action == "approve":
            # Update user verification
            new_tier = request["requested_tier"]
            await self.users.update_one(
                {"user_id": request["user_id"]},
                {"$set": {
                    "verification": {
                        "tier": new_tier,
                        "verified_at": now,
                        "verified_by": admin_id,
                    },
                    "verified": True,  # Legacy field for backwards compatibility
                    "updated_at": now
                }}
            )
            status = VerificationRequestStatus.APPROVED
        else:
            status = VerificationRequestStatus.REJECTED
        
        # Update request
        await self.verification_requests.update_one(
            {"id": request_id},
            {"$set": {
                "status": status,
                "processed_at": now,
                "processed_by": admin_id,
                "admin_reason": reason
            }}
        )
        
        # Log history
        await self.verification_history.insert_one({
            "id": f"vh_{uuid.uuid4().hex[:12]}",
            "request_id": request_id,
            "user_id": request["user_id"],
            "action": action,
            "old_tier": request["current_tier"],
            "new_tier": request["requested_tier"] if action == "approve" else request["current_tier"],
            "admin_id": admin_id,
            "reason": reason,
            "created_at": now
        })
        
        return {
            "message": f"Request {action}d successfully",
            "request_id": request_id,
            "status": status
        }
    
    async def set_user_verification(
        self,
        user_id: str,
        tier: VerificationTier,
        admin_id: str,
        reason: str = None
    ) -> Dict:
        """Directly set user verification tier (admin)"""
        user = await self.users.find_one({"user_id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        old_tier = user.get("verification", {}).get("tier", VerificationTier.UNVERIFIED)
        now = datetime.now(timezone.utc).isoformat()
        
        await self.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "verification": {
                    "tier": tier,
                    "verified_at": now,
                    "verified_by": admin_id,
                },
                "verified": tier != VerificationTier.UNVERIFIED,
                "updated_at": now
            }}
        )
        
        # Log history
        await self.verification_history.insert_one({
            "id": f"vh_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "action": "admin_set",
            "old_tier": old_tier,
            "new_tier": tier,
            "admin_id": admin_id,
            "reason": reason,
            "created_at": now
        })
        
        benefits = TIER_BENEFITS.get(tier, TIER_BENEFITS[VerificationTier.UNVERIFIED])
        
        return {
            "user_id": user_id,
            "tier": tier,
            "benefits": benefits,
            "verified_at": now
        }
    
    async def get_verified_users(
        self,
        tier: VerificationTier = None,
        page: int = 1,
        limit: int = 20
    ) -> Dict:
        """Get list of verified users by tier"""
        query = {"verified": True}
        if tier:
            query["verification.tier"] = tier
        
        skip = (page - 1) * limit
        total = await self.users.count_documents(query)
        
        users = await self.users.find(
            query,
            {"_id": 0, "password": 0}
        ).sort("verification.verified_at", -1).skip(skip).limit(limit).to_list(limit)
        
        return {
            "users": users,
            "total": total,
            "page": page,
            "limit": limit
        }
    
    async def get_verification_stats(self) -> Dict:
        """Get verification statistics"""
        pipeline = [
            {"$group": {
                "_id": "$verification.tier",
                "count": {"$sum": 1}
            }}
        ]
        
        stats = await self.users.aggregate(pipeline).to_list(10)
        
        # Convert to dict with defaults
        tier_counts = {
            VerificationTier.UNVERIFIED: 0,
            VerificationTier.VERIFIED_USER: 0,
            VerificationTier.VERIFIED_SELLER: 0,
            VerificationTier.PREMIUM_VERIFIED_SELLER: 0,
        }
        
        for stat in stats:
            tier = stat["_id"]
            if tier in tier_counts:
                tier_counts[tier] = stat["count"]
            elif tier is None:
                tier_counts[VerificationTier.UNVERIFIED] += stat["count"]
        
        pending_requests = await self.verification_requests.count_documents({
            "status": VerificationRequestStatus.PENDING
        })
        
        return {
            "by_tier": tier_counts,
            "total_verified": sum(c for t, c in tier_counts.items() if t != VerificationTier.UNVERIFIED),
            "pending_requests": pending_requests
        }


def create_verification_router(db: AsyncIOMotorDatabase, require_admin):
    """Create verification API router for admin dashboard"""
    router = APIRouter(prefix="/verification", tags=["Verification"])
    service = VerificationService(db)
    
    @router.get("/stats")
    async def get_stats(admin = Depends(require_admin)):
        """Get verification statistics"""
        return await service.get_verification_stats()
    
    @router.get("/requests")
    async def get_pending_requests(
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100),
        admin = Depends(require_admin)
    ):
        """Get pending verification requests"""
        return await service.get_pending_requests(page, limit)
    
    @router.post("/requests/{request_id}/process")
    async def process_request(
        request_id: str,
        action: VerificationAction,
        admin = Depends(require_admin)
    ):
        """Process a verification request"""
        return await service.process_verification_request(
            request_id,
            action.action,
            admin["id"],
            action.reason
        )
    
    @router.get("/users")
    async def get_verified_users(
        tier: VerificationTier = None,
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100),
        admin = Depends(require_admin)
    ):
        """Get list of verified users"""
        return await service.get_verified_users(tier, page, limit)
    
    @router.get("/users/{user_id}")
    async def get_user_verification(user_id: str, admin = Depends(require_admin)):
        """Get user verification status"""
        return await service.get_user_verification(user_id)
    
    @router.put("/users/{user_id}")
    async def set_user_verification(
        user_id: str,
        tier: VerificationTier = Body(...),
        reason: str = Body(None),
        admin = Depends(require_admin)
    ):
        """Set user verification tier directly"""
        return await service.set_user_verification(user_id, tier, admin["id"], reason)
    
    @router.get("/tiers")
    async def get_tier_info():
        """Get verification tier information and benefits"""
        return {
            "tiers": [
                {
                    "id": tier.value,
                    "name": tier.value.replace("_", " ").title(),
                    "benefits": TIER_BENEFITS[tier]
                }
                for tier in VerificationTier
            ]
        }
    
    return router, service
