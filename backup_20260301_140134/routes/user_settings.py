"""
User Settings & Sessions Routes
Handles user settings, push tokens, active sessions, and ID verification.
"""

from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)


def create_user_settings_router(db, require_auth, UserSettings):
    """Create user settings router with dependency injection."""
    router = APIRouter(tags=["user-settings"])

    @router.get("/settings")
    async def get_user_settings(request: Request):
        """Get user settings"""
        user = await require_auth(request)
        
        settings = await db.user_settings.find_one({"user_id": user.user_id}, {"_id": 0})
        
        if not settings:
            # Create default settings
            default_settings = UserSettings(user_id=user.user_id)
            settings_dict = default_settings.model_dump()
            settings_dict["created_at"] = datetime.now(timezone.utc)
            settings_dict["updated_at"] = datetime.now(timezone.utc)
            await db.user_settings.insert_one(settings_dict)
            settings = settings_dict
        
        return settings

    @router.put("/settings")
    async def update_user_settings(request: Request):
        """Update user settings"""
        user = await require_auth(request)
        body = await request.json()
        
        # Get existing settings or create new
        existing = await db.user_settings.find_one({"user_id": user.user_id})
        
        if not existing:
            default_settings = UserSettings(user_id=user.user_id)
            existing = default_settings.model_dump()
            existing["created_at"] = datetime.now(timezone.utc)
        
        # Update fields
        update_data = {}
        for field in ["notifications", "quiet_hours", "alert_preferences", "privacy", "app_preferences", "security", "push_token"]:
            if field in body and body[field] is not None:
                if isinstance(body[field], dict):
                    # Merge with existing
                    if field in existing and existing[field]:
                        merged = {**existing[field], **body[field]}
                        update_data[field] = merged
                    else:
                        update_data[field] = body[field]
                else:
                    update_data[field] = body[field]
        
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        await db.user_settings.update_one(
            {"user_id": user.user_id},
            {"$set": update_data},
            upsert=True
        )
        
        return {"message": "Settings updated successfully"}

    @router.put("/settings/push-token")
    async def update_push_token(request: Request):
        """Update push notification token"""
        user = await require_auth(request)
        body = await request.json()
        
        push_token = body.get("push_token")
        if not push_token:
            raise HTTPException(status_code=400, detail="Push token required")
        
        await db.user_settings.update_one(
            {"user_id": user.user_id},
            {"$set": {"push_token": push_token, "updated_at": datetime.now(timezone.utc)}},
            upsert=True
        )
        
        return {"message": "Push token updated"}

    return router


def create_sessions_router(db, require_auth, get_session_token):
    """Create sessions router with dependency injection."""
    router = APIRouter(prefix="/sessions", tags=["sessions"])

    @router.get("")
    async def get_active_sessions(request: Request):
        """Get all active sessions"""
        user = await require_auth(request)
        
        sessions = await db.active_sessions.find(
            {"user_id": user.user_id},
            {"_id": 0}
        ).sort("last_active", -1).to_list(20)
        
        # Get current session token
        current_token = await get_session_token(request)
        
        # Mark current session
        for session in sessions:
            session["is_current"] = session.get("session_token") == current_token
            # Don't expose full token
            session["session_token"] = session["session_token"][:8] + "..." if session.get("session_token") else None
        
        return {"sessions": sessions}

    @router.delete("/{session_id}")
    async def revoke_session(session_id: str, request: Request):
        """Revoke a specific session"""
        user = await require_auth(request)
        
        # Don't allow revoking current session through this endpoint
        session = await db.active_sessions.find_one({"id": session_id, "user_id": user.user_id})
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        current_token = await get_session_token(request)
        if session.get("session_token") == current_token:
            raise HTTPException(status_code=400, detail="Cannot revoke current session. Use sign out instead.")
        
        await db.active_sessions.delete_one({"id": session_id})
        await db.sessions.delete_one({"token": session.get("session_token")})
        
        return {"message": "Session revoked"}

    @router.post("/revoke-all")
    async def revoke_all_sessions(request: Request):
        """Revoke all sessions except current"""
        user = await require_auth(request)
        current_token = await get_session_token(request)
        
        # Delete all sessions except current
        result = await db.active_sessions.delete_many({
            "user_id": user.user_id,
            "session_token": {"$ne": current_token}
        })
        
        # Also delete from sessions collection
        await db.sessions.delete_many({
            "user_id": user.user_id,
            "token": {"$ne": current_token}
        })
        
        return {"message": f"Revoked {result.deleted_count} sessions"}

    return router


def create_id_verification_router(db, require_auth, create_notification):
    """Create ID verification router with dependency injection."""
    router = APIRouter(prefix="/profile", tags=["id-verification"])

    @router.post("/verify-id")
    async def submit_id_verification(request: Request):
        """Submit ID verification documents"""
        user = await require_auth(request)
        body = await request.json()
        
        required_fields = ["full_name", "dob", "id_type", "id_number", "doc_front_url", "doc_back_url", "selfie_url"]
        for field in required_fields:
            if not body.get(field):
                raise HTTPException(status_code=400, detail=f"{field} is required")
        
        # Check if already has pending verification
        existing = await db.id_verifications.find_one({
            "user_id": user.user_id,
            "status": "pending"
        })
        
        if existing:
            raise HTTPException(status_code=400, detail="You already have a pending verification")
        
        verification = {
            "id": str(uuid.uuid4()),
            "user_id": user.user_id,
            "full_name": body["full_name"],
            "dob": body["dob"],
            "id_type": body["id_type"],
            "id_number": body["id_number"],
            "doc_front_url": body["doc_front_url"],
            "doc_back_url": body["doc_back_url"],
            "selfie_url": body["selfie_url"],
            "status": "pending",
            "submitted_at": datetime.now(timezone.utc),
            "reviewed_at": None,
            "reviewer_note": None,
        }
        
        await db.id_verifications.insert_one(verification)
        
        # Update user's trust status
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {"id_verification_status": "pending"}}
        )
        
        # Create notification
        await create_notification(
            user.user_id,
            "system",
            "ID Verification Submitted",
            "Your ID verification has been submitted and is under review. This typically takes 1-3 business days.",
            meta={"verification_id": verification["id"]}
        )
        
        return {"message": "Verification submitted", "verification_id": verification["id"]}

    @router.get("/verify-id/status")
    async def get_id_verification_status(request: Request):
        """Get ID verification status"""
        user = await require_auth(request)
        
        verification = await db.id_verifications.find_one(
            {"user_id": user.user_id},
            {"_id": 0, "doc_front_url": 0, "doc_back_url": 0, "selfie_url": 0}
        )
        
        if not verification:
            return {"status": "not_started"}
        
        return verification

    return router
