"""
Seller Verification API Routes
Public endpoints for seller verification status and requests.
"""

from fastapi import APIRouter, HTTPException, Request, Query, Body
from datetime import datetime, timezone
from typing import Optional, List
from enum import Enum
import uuid
import logging

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
    UNDER_REVIEW = "under_review"


# Tier benefits configuration
TIER_BENEFITS = {
    VerificationTier.UNVERIFIED: {
        "badge": None,
        "badge_color": None,
        "commission_discount": 0,
        "search_priority_boost": 0,
        "features": []
    },
    VerificationTier.VERIFIED_USER: {
        "badge": "verified",
        "badge_color": "#2196F3",
        "commission_discount": 0,
        "search_priority_boost": 5,
        "features": ["verified_badge", "priority_support"]
    },
    VerificationTier.VERIFIED_SELLER: {
        "badge": "verified_seller",
        "badge_color": "#4CAF50",
        "commission_discount": 10,
        "search_priority_boost": 15,
        "features": ["verified_seller_badge", "lower_commission", "priority_support", "featured_listings"]
    },
    VerificationTier.PREMIUM_VERIFIED_SELLER: {
        "badge": "premium_seller",
        "badge_color": "#FFD700",
        "commission_discount": 25,
        "search_priority_boost": 30,
        "features": ["premium_badge", "lowest_commission", "vip_support", "featured_listings", "analytics_dashboard", "promoted_profile"]
    }
}


def create_seller_verification_router(db, get_current_user):
    """Create seller verification router with dependency injection."""
    router = APIRouter(prefix="/seller/verification", tags=["Seller Verification"])
    
    async def require_auth(request: Request):
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        return user

    # =========================================================================
    # PUBLIC ENDPOINTS
    # =========================================================================
    
    @router.get("")
    async def get_my_verification_status(request: Request):
        """Get current user's verification status"""
        current_user = await require_auth(request)
        
        # First get full user to ensure they exist
        user = await db.users.find_one(
            {"user_id": current_user.user_id},
            {"_id": 0}
        )
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        verification = user.get("verification", {})
        tier = verification.get("tier", user.get("verification_tier", VerificationTier.UNVERIFIED))
        benefits = TIER_BENEFITS.get(tier, TIER_BENEFITS[VerificationTier.UNVERIFIED])
        
        # Check for pending verification request
        pending_request = await db.verification_requests.find_one(
            {"user_id": current_user.user_id, "status": "pending"},
            {"_id": 0}
        )
        
        return {
            "user_id": current_user.user_id,
            "tier": tier,
            "is_verified": user.get("is_verified", False),
            "verified_at": verification.get("verified_at"),
            "verified_by": verification.get("verified_by"),
            "benefits": benefits,
            "pending_request": pending_request
        }
    
    @router.get("/tiers")
    async def get_verification_tiers():
        """Get all available verification tiers and their benefits"""
        tiers = []
        for tier, benefits in TIER_BENEFITS.items():
            tiers.append({
                "tier": tier.value,
                "name": tier.value.replace("_", " ").title(),
                **benefits
            })
        return {"tiers": tiers}
    
    @router.get("/requirements")
    async def get_verification_requirements():
        """Get requirements for each verification tier"""
        return {
            "requirements": {
                "verified_user": {
                    "description": "Basic verification for individual users",
                    "requirements": [
                        "Valid email address (verified)",
                        "Profile photo",
                        "Phone number (optional)"
                    ],
                    "documents": []
                },
                "verified_seller": {
                    "description": "Verification for active sellers",
                    "requirements": [
                        "At least 5 successful transactions",
                        "Rating of 4.0 or higher",
                        "Government-issued ID",
                        "Proof of address"
                    ],
                    "documents": ["id_document", "proof_of_address"]
                },
                "premium_verified_seller": {
                    "description": "Premium tier for top sellers",
                    "requirements": [
                        "At least 50 successful transactions",
                        "Rating of 4.5 or higher",
                        "Business registration (if applicable)",
                        "Bank account verification",
                        "Minimum 3 months selling history"
                    ],
                    "documents": ["id_document", "proof_of_address", "business_registration", "bank_statement"]
                }
            }
        }
    
    @router.post("/request")
    async def request_verification(
        request: Request,
        requested_tier: str = Body(..., description="Tier to request: verified_user, verified_seller, premium_verified_seller"),
        reason: Optional[str] = Body(None),
        documents: Optional[List[str]] = Body(None, description="URLs to uploaded documents")
    ):
        """Submit a verification request"""
        current_user = await require_auth(request)
        
        # Validate tier
        try:
            tier = VerificationTier(requested_tier)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid tier. Must be one of: {[t.value for t in VerificationTier if t != VerificationTier.UNVERIFIED]}")
        
        if tier == VerificationTier.UNVERIFIED:
            raise HTTPException(status_code=400, detail="Cannot request unverified status")
        
        # Check for existing pending request
        existing = await db.verification_requests.find_one({
            "user_id": current_user.user_id,
            "status": {"$in": ["pending", "under_review"]}
        })
        
        if existing:
            raise HTTPException(status_code=400, detail="You already have a pending verification request")
        
        # Get current user tier
        user = await db.users.find_one({"user_id": current_user.user_id})
        current_tier = user.get("verification", {}).get("tier", VerificationTier.UNVERIFIED)
        
        # Check tier upgrade logic
        tier_order = [VerificationTier.UNVERIFIED, VerificationTier.VERIFIED_USER, VerificationTier.VERIFIED_SELLER, VerificationTier.PREMIUM_VERIFIED_SELLER]
        current_idx = tier_order.index(VerificationTier(current_tier)) if current_tier in [t.value for t in tier_order] else 0
        requested_idx = tier_order.index(tier)
        
        if requested_idx <= current_idx:
            raise HTTPException(status_code=400, detail=f"You are already at or above the {requested_tier} tier")
        
        request_id = f"vr_{uuid.uuid4().hex[:12]}"
        verification_request = {
            "id": request_id,
            "user_id": current_user.user_id,
            "user_name": current_user.name,
            "user_email": current_user.email,
            "current_tier": current_tier,
            "requested_tier": requested_tier,
            "reason": reason,
            "documents": documents or [],
            "status": VerificationRequestStatus.PENDING.value,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.verification_requests.insert_one(verification_request)
        verification_request.pop("_id", None)
        
        return {
            "message": "Verification request submitted successfully",
            "request": verification_request
        }
    
    @router.get("/request/status")
    async def get_request_status(request: Request):
        """Get status of user's verification requests"""
        current_user = await require_auth(request)
        
        requests = await db.verification_requests.find(
            {"user_id": current_user.user_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(10)
        
        return {"requests": requests}
    
    @router.delete("/request/{request_id}")
    async def cancel_verification_request(request_id: str, request: Request):
        """Cancel a pending verification request"""
        current_user = await require_auth(request)
        
        verification_request = await db.verification_requests.find_one({
            "id": request_id,
            "user_id": current_user.user_id
        })
        
        if not verification_request:
            raise HTTPException(status_code=404, detail="Verification request not found")
        
        if verification_request["status"] not in ["pending"]:
            raise HTTPException(status_code=400, detail="Can only cancel pending requests")
        
        await db.verification_requests.update_one(
            {"id": request_id},
            {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc)}}
        )
        
        return {"message": "Verification request cancelled"}
    
    # =========================================================================
    # PUBLIC LOOKUP ENDPOINTS
    # =========================================================================
    
    @router.get("/user/{user_id}")
    async def get_user_verification_status(user_id: str):
        """Get verification status for any user (public info only)"""
        user = await db.users.find_one(
            {"user_id": user_id},
            {"_id": 0, "verification": 1, "is_verified": 1, "verification_tier": 1, "name": 1}
        )
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        verification = user.get("verification", {})
        tier = verification.get("tier", user.get("verification_tier", VerificationTier.UNVERIFIED))
        benefits = TIER_BENEFITS.get(tier, TIER_BENEFITS[VerificationTier.UNVERIFIED])
        
        return {
            "user_id": user_id,
            "name": user.get("name"),
            "tier": tier,
            "is_verified": user.get("is_verified", False),
            "badge": benefits.get("badge"),
            "badge_color": benefits.get("badge_color")
        }
    
    @router.get("/check/{user_id}")
    async def check_seller_verified(user_id: str):
        """Quick check if a seller is verified"""
        user = await db.users.find_one(
            {"user_id": user_id},
            {"_id": 0, "verification": 1, "is_verified": 1}
        )
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        verification = user.get("verification", {})
        tier = verification.get("tier", VerificationTier.UNVERIFIED)
        
        is_seller_verified = tier in [
            VerificationTier.VERIFIED_SELLER.value,
            VerificationTier.PREMIUM_VERIFIED_SELLER.value
        ]
        
        return {
            "user_id": user_id,
            "is_verified": user.get("is_verified", False),
            "is_seller_verified": is_seller_verified,
            "tier": tier
        }
    
    return router
