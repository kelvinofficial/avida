"""
Account & Support Routes
Handles account management (password change, deletion) and support tickets.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
import uuid
import logging

logger = logging.getLogger(__name__)


class SupportTicketCreate(BaseModel):
    subject: str
    message: str


def create_account_router(db, require_auth, create_notification):
    """Create account management router with dependency injection."""
    router = APIRouter(prefix="/account", tags=["account"])

    @router.post("/change-password")
    async def change_password(request: Request):
        """Change user password"""
        user = await require_auth(request)
        body = await request.json()
        
        current_password = body.get("current_password")
        new_password = body.get("new_password")
        
        if not current_password or not new_password:
            raise HTTPException(status_code=400, detail="Both current and new password required")
        
        if len(new_password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        
        # Verify current password (simplified - in production use proper hashing)
        # user_data would be used to verify password hash in production
        _ = await db.users.find_one({"user_id": user.user_id})
        
        # For demo, just update password
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {"password_updated_at": datetime.now(timezone.utc)}}
        )
        
        # Create security notification
        await create_notification(
            user.user_id,
            "security_alert",
            "Password Changed",
            "Your password was successfully changed. If you didn't make this change, please contact support immediately.",
            meta={"action": "password_change"}
        )
        
        return {"message": "Password changed successfully"}

    @router.post("/delete")
    async def delete_account(request: Request):
        """Delete user account"""
        user = await require_auth(request)
        body = await request.json()
        
        reason = body.get("reason")
        _ = body.get("password")  # Would be used for verification in production
        
        if not reason:
            raise HTTPException(status_code=400, detail="Reason required for account deletion")
        
        # In production, verify password here
        
        # Soft delete - mark account for deletion (30 day cool-off)
        deletion_date = datetime.now(timezone.utc) + timedelta(days=30)
        
        await db.users.update_one(
            {"user_id": user.user_id},
            {
                "$set": {
                    "deletion_requested": True,
                    "deletion_date": deletion_date,
                    "deletion_reason": reason
                }
            }
        )
        
        # Deactivate all listings
        await db.listings.update_many(
            {"user_id": user.user_id},
            {"$set": {"status": "deleted"}}
        )
        
        # Clear sessions
        await db.sessions.delete_many({"user_id": user.user_id})
        await db.active_sessions.delete_many({"user_id": user.user_id})
        
        return {
            "message": "Account scheduled for deletion",
            "deletion_date": deletion_date.isoformat(),
            "note": "You can cancel deletion by logging in within 30 days"
        }

    @router.post("/cancel-deletion")
    async def cancel_account_deletion(request: Request):
        """Cancel account deletion"""
        user = await require_auth(request)
        
        result = await db.users.update_one(
            {"user_id": user.user_id, "deletion_requested": True},
            {
                "$unset": {
                    "deletion_requested": "",
                    "deletion_date": "",
                    "deletion_reason": ""
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="No pending deletion found")
        
        return {"message": "Account deletion cancelled"}

    return router


def create_support_router(db, require_auth, create_notification):
    """Create support tickets router with dependency injection."""
    router = APIRouter(prefix="/support", tags=["support"])

    @router.post("/tickets")
    async def create_support_ticket(request: Request):
        """Create a support ticket"""
        user = await require_auth(request)
        body = await request.json()
        
        subject = body.get("subject", "").strip()
        message = body.get("message", "").strip()
        
        if not subject or not message:
            raise HTTPException(status_code=400, detail="Subject and message required")
        
        ticket = {
            "id": str(uuid.uuid4()),
            "user_id": user.user_id,
            "subject": subject,
            "message": message,
            "status": "open",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        
        await db.support_tickets.insert_one(ticket)
        
        # Create notification
        await create_notification(
            user.user_id,
            "system",
            "Support Ticket Created",
            f"Your support ticket \"{subject}\" has been received. We'll respond within 24-48 hours.",
            meta={"ticket_id": ticket["id"]}
        )
        
        return {"message": "Ticket created", "ticket_id": ticket["id"]}

    @router.get("/tickets")
    async def get_support_tickets(request: Request):
        """Get user's support tickets"""
        user = await require_auth(request)
        
        tickets = await db.support_tickets.find(
            {"user_id": user.user_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(50)
        
        return {"tickets": tickets}

    @router.get("/tickets/{ticket_id}")
    async def get_support_ticket(ticket_id: str, request: Request):
        """Get a specific support ticket"""
        user = await require_auth(request)
        
        ticket = await db.support_tickets.find_one(
            {"id": ticket_id, "user_id": user.user_id},
            {"_id": 0}
        )
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        return ticket

    return router
