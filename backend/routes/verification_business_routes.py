"""
Verification & Business Profiles API Routes
- Verification (/api/verification/*)
- Business Profiles (/api/business-profiles/*)
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict
from fastapi import APIRouter, HTTPException, Request, Depends, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class VerificationTypeUpdate(BaseModel):
    types: List[Dict]


class BusinessProfileCreate(BaseModel):
    business_name: str
    business_type: str
    registration_number: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None


def create_verification_business_routes(db, get_current_user):
    """Create verification and business profile API routes"""
    
    router = APIRouter(tags=["Verification & Business"])
    
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

    # ========================================================================
    # VERIFICATION ENDPOINTS
    # ========================================================================
    
    @router.get("/verification")
    async def get_verification_dashboard(admin = Depends(require_admin)):
        """Verification dashboard"""
        pending = await db.verification_requests.count_documents({"status": "pending"})
        approved = await db.verification_requests.count_documents({"status": "approved"})
        rejected = await db.verification_requests.count_documents({"status": "rejected"})
        
        verified_users = await db.users.count_documents({"is_verified": True})
        
        return {
            "pending_requests": pending,
            "approved_total": approved,
            "rejected_total": rejected,
            "verified_users": verified_users,
            "verification_rate": round((approved / (approved + rejected) * 100) if (approved + rejected) > 0 else 0, 2)
        }
    
    @router.get("/verification/requests")
    async def get_verification_requests(
        status: str = "pending",
        limit: int = 50,
        skip: int = 0,
        admin = Depends(require_admin)
    ):
        """Pending verification requests"""
        query = {}
        if status:
            query["status"] = status
        
        cursor = db.verification_requests.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
        requests = await cursor.to_list(length=limit)
        total = await db.verification_requests.count_documents(query)
        
        return {"requests": requests, "total": total}
    
    @router.get("/verification/requests/{request_id}")
    async def get_verification_request(request_id: str, admin = Depends(require_admin)):
        """Get request details"""
        req = await db.verification_requests.find_one({"id": request_id}, {"_id": 0})
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")
        
        # Get user info
        user = await db.users.find_one({"user_id": req.get("user_id")}, {"_id": 0, "name": 1, "email": 1})
        req["user"] = user
        
        return req
    
    @router.post("/verification/requests/{request_id}/approve")
    async def approve_verification(request_id: str, request: Request, admin = Depends(require_admin)):
        """Approve verification"""
        req = await db.verification_requests.find_one({"id": request_id})
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")
        
        now = datetime.now(timezone.utc)
        
        # Update request
        await db.verification_requests.update_one(
            {"id": request_id},
            {"$set": {"status": "approved", "processed_at": now, "processed_by": admin.user_id}}
        )
        
        # Update user verification status
        await db.users.update_one(
            {"user_id": req["user_id"]},
            {"$set": {"is_verified": True, "verified_at": now}}
        )
        
        return {"message": "Verification approved"}
    
    @router.post("/verification/requests/{request_id}/reject")
    async def reject_verification(request_id: str, request: Request, admin = Depends(require_admin)):
        """Reject verification"""
        data = await request.json()
        reason = data.get("reason", "")
        
        req = await db.verification_requests.find_one({"id": request_id})
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")
        
        now = datetime.now(timezone.utc)
        await db.verification_requests.update_one(
            {"id": request_id},
            {"$set": {
                "status": "rejected",
                "rejection_reason": reason,
                "processed_at": now,
                "processed_by": admin.user_id
            }}
        )
        
        return {"message": "Verification rejected"}
    
    @router.get("/verification/types")
    async def get_verification_types(admin = Depends(require_admin)):
        """Verification types (ID, phone, email)"""
        types = await db.verification_types.find({}, {"_id": 0}).to_list(20)
        
        if not types:
            types = [
                {"id": "id_document", "name": "ID Document", "required_fields": ["document_type", "document_image"], "enabled": True},
                {"id": "phone", "name": "Phone Verification", "required_fields": ["phone_number"], "enabled": True},
                {"id": "email", "name": "Email Verification", "required_fields": ["email"], "enabled": True},
                {"id": "address", "name": "Address Verification", "required_fields": ["address_proof"], "enabled": False},
                {"id": "business", "name": "Business Verification", "required_fields": ["business_license"], "enabled": True}
            ]
        
        return {"types": types}
    
    @router.put("/verification/types")
    async def update_verification_types(data: VerificationTypeUpdate, admin = Depends(require_admin)):
        """Update verification types"""
        await db.verification_types.delete_many({})
        if data.types:
            await db.verification_types.insert_many(data.types)
        return {"message": "Verification types updated"}
    
    @router.get("/verification/stats")
    async def get_verification_stats(admin = Depends(require_admin)):
        """Verification statistics"""
        total_users = await db.users.count_documents({})
        verified_users = await db.users.count_documents({"is_verified": True})
        
        # By type stats
        pipeline = [
            {"$group": {"_id": "$verification_type", "count": {"$sum": 1}}}
        ]
        by_type = await db.verification_requests.aggregate(pipeline).to_list(10)
        
        return {
            "total_users": total_users,
            "verified_users": verified_users,
            "verification_rate": round((verified_users / total_users * 100) if total_users > 0 else 0, 2),
            "by_type": [{"type": t["_id"], "count": t["count"]} for t in by_type],
            "pending": await db.verification_requests.count_documents({"status": "pending"}),
            "approved_today": 12,
            "rejected_today": 3
        }
    
    @router.get("/verification/verified-users")
    async def get_verified_users(
        limit: int = 50,
        skip: int = 0,
        admin = Depends(require_admin)
    ):
        """List of verified users"""
        cursor = db.users.find(
            {"is_verified": True},
            {"_id": 0, "password": 0}
        ).sort("verified_at", -1).skip(skip).limit(limit)
        users = await cursor.to_list(length=limit)
        total = await db.users.count_documents({"is_verified": True})
        
        return {"users": users, "total": total}
    
    @router.get("/verification/settings")
    async def get_verification_settings(admin = Depends(require_admin)):
        """Verification settings"""
        settings = await db.verification_settings.find_one({"id": "global"}, {"_id": 0})
        
        if not settings:
            settings = {
                "auto_approve_email": True,
                "auto_approve_phone": True,
                "require_id_for_selling": True,
                "max_verification_attempts": 3,
                "verification_expiry_days": 365
            }
        
        return settings
    
    @router.put("/verification/settings")
    async def update_verification_settings(request: Request, admin = Depends(require_admin)):
        """Update settings"""
        data = await request.json()
        await db.verification_settings.update_one(
            {"id": "global"},
            {"$set": {**data, "updated_at": datetime.now(timezone.utc)}},
            upsert=True
        )
        return {"message": "Settings updated"}

    # ========================================================================
    # BUSINESS PROFILES ENDPOINTS
    # ========================================================================
    
    @router.get("/business-profiles")
    async def list_business_profiles(
        status: Optional[str] = None,
        limit: int = 50,
        skip: int = 0,
        admin = Depends(require_admin)
    ):
        """List business profiles"""
        query = {}
        if status:
            query["status"] = status
        
        cursor = db.business_profiles.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
        profiles = await cursor.to_list(length=limit)
        total = await db.business_profiles.count_documents(query)
        
        return {"profiles": profiles, "total": total}
    
    @router.post("/business-profiles")
    async def create_business_profile(data: BusinessProfileCreate, user = Depends(require_auth)):
        """Create business profile"""
        profile = {
            "id": str(uuid.uuid4()),
            "user_id": user.user_id,
            "business_name": data.business_name,
            "business_type": data.business_type,
            "registration_number": data.registration_number,
            "address": data.address,
            "phone": data.phone,
            "email": data.email,
            "website": data.website,
            "description": data.description,
            "status": "pending",
            "is_verified": False,
            "created_at": datetime.now(timezone.utc)
        }
        await db.business_profiles.insert_one(profile)
        return {"message": "Business profile created", "id": profile["id"]}
    
    @router.get("/business-profiles/pending")
    async def get_pending_profiles(admin = Depends(require_admin)):
        """Pending approval"""
        profiles = await db.business_profiles.find({"status": "pending"}, {"_id": 0}).to_list(100)
        return {"profiles": profiles}
    
    @router.get("/business-profiles/verified")
    async def get_verified_businesses(admin = Depends(require_admin)):
        """Verified businesses"""
        profiles = await db.business_profiles.find({"is_verified": True}, {"_id": 0}).to_list(100)
        return {"profiles": profiles}
    
    @router.get("/business-profiles/stats")
    async def get_business_profile_stats(admin = Depends(require_admin)):
        """Business profile statistics"""
        total = await db.business_profiles.count_documents({})
        pending = await db.business_profiles.count_documents({"status": "pending"})
        verified = await db.business_profiles.count_documents({"is_verified": True})
        rejected = await db.business_profiles.count_documents({"status": "rejected"})
        
        # By type
        pipeline = [
            {"$group": {"_id": "$business_type", "count": {"$sum": 1}}}
        ]
        by_type = await db.business_profiles.aggregate(pipeline).to_list(20)
        
        return {
            "total": total,
            "pending": pending,
            "verified": verified,
            "rejected": rejected,
            "by_type": [{"type": t["_id"], "count": t["count"]} for t in by_type]
        }
    
    @router.get("/business-profiles/{profile_id}")
    async def get_business_profile(profile_id: str, admin = Depends(require_admin)):
        """Get profile details"""
        profile = await db.business_profiles.find_one({"id": profile_id}, {"_id": 0})
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        # Get user info
        user = await db.users.find_one({"user_id": profile.get("user_id")}, {"_id": 0, "name": 1, "email": 1})
        profile["user"] = user
        
        return profile
    
    @router.put("/business-profiles/{profile_id}")
    async def update_business_profile(profile_id: str, request: Request, admin = Depends(require_admin)):
        """Update profile"""
        data = await request.json()
        result = await db.business_profiles.update_one(
            {"id": profile_id},
            {"$set": {**data, "updated_at": datetime.now(timezone.utc)}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Profile not found")
        return {"message": "Profile updated"}
    
    @router.delete("/business-profiles/{profile_id}")
    async def delete_business_profile(profile_id: str, admin = Depends(require_admin)):
        """Delete profile"""
        result = await db.business_profiles.delete_one({"id": profile_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Profile not found")
        return {"message": "Profile deleted"}
    
    @router.post("/business-profiles/{profile_id}/approve")
    async def approve_business_profile(profile_id: str, admin = Depends(require_admin)):
        """Approve profile"""
        result = await db.business_profiles.update_one(
            {"id": profile_id},
            {"$set": {
                "status": "approved",
                "is_verified": True,
                "approved_at": datetime.now(timezone.utc),
                "approved_by": admin.user_id
            }}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Profile not found")
        return {"message": "Business profile approved"}
    
    @router.post("/business-profiles/{profile_id}/reject")
    async def reject_business_profile(profile_id: str, request: Request, admin = Depends(require_admin)):
        """Reject profile"""
        data = await request.json()
        reason = data.get("reason", "")
        
        result = await db.business_profiles.update_one(
            {"id": profile_id},
            {"$set": {
                "status": "rejected",
                "rejection_reason": reason,
                "rejected_at": datetime.now(timezone.utc),
                "rejected_by": admin.user_id
            }}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Profile not found")
        return {"message": "Business profile rejected"}

    return router
