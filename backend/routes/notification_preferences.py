"""
Notification Preferences Routes
Handles user notification preferences management.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

# Default notification preferences
DEFAULT_NOTIFICATION_PREFS = {
    "email_transactional": True,
    "email_verification_updates": True,
    "email_premium_updates": True,
    "email_reminders": True,
    "email_marketing": True,
    "email_newsletter": True,
    "push_messages": True,
    "push_listings": True,
    "push_promotions": True,
}


def create_notification_preferences_router(db, require_auth):
    """Create notification preferences router with dependency injection."""
    router = APIRouter(tags=["notification-preferences"])
    
    @router.get("/notification-preferences")
    async def get_notification_preferences(request: Request):
        """Get user's notification preferences"""
        user = await require_auth(request)
        
        # Get existing preferences or return defaults
        prefs = await db.notification_preferences.find_one(
            {"user_id": user.user_id},
            {"_id": 0}
        )
        
        if not prefs:
            # Return defaults with user_id
            return {
                "user_id": user.user_id,
                **DEFAULT_NOTIFICATION_PREFS,
                "created_at": None,
                "updated_at": None
            }
        
        # Merge with defaults for any missing keys
        merged = {**DEFAULT_NOTIFICATION_PREFS, **prefs}
        return merged
    
    @router.put("/notification-preferences")
    async def update_notification_preferences(request: Request):
        """Update user's notification preferences"""
        user = await require_auth(request)
        data = await request.json()
        
        now = datetime.now(timezone.utc)
        
        # Validate preference keys
        valid_keys = set(DEFAULT_NOTIFICATION_PREFS.keys())
        update_data = {}
        
        for key, value in data.items():
            if key in valid_keys and isinstance(value, bool):
                update_data[key] = value
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid preferences provided")
        
        update_data["updated_at"] = now
        
        # Upsert preferences
        result = await db.notification_preferences.update_one(
            {"user_id": user.user_id},
            {
                "$set": update_data,
                "$setOnInsert": {
                    "user_id": user.user_id,
                    "created_at": now,
                    **{k: v for k, v in DEFAULT_NOTIFICATION_PREFS.items() if k not in update_data}
                }
            },
            upsert=True
        )
        
        # Return updated preferences
        prefs = await db.notification_preferences.find_one(
            {"user_id": user.user_id},
            {"_id": 0}
        )
        
        return {
            "message": "Preferences updated successfully",
            "preferences": prefs
        }
    
    @router.post("/notification-preferences/unsubscribe-all")
    async def unsubscribe_all_emails(request: Request):
        """Unsubscribe from all marketing and promotional emails"""
        user = await require_auth(request)
        
        now = datetime.now(timezone.utc)
        
        # Keep transactional emails enabled, disable marketing/promotional
        update_data = {
            "email_marketing": False,
            "email_newsletter": False,
            "email_reminders": False,
            "push_promotions": False,
            "updated_at": now
        }
        
        await db.notification_preferences.update_one(
            {"user_id": user.user_id},
            {
                "$set": update_data,
                "$setOnInsert": {
                    "user_id": user.user_id,
                    "created_at": now,
                    "email_transactional": True,
                    "email_verification_updates": True,
                    "email_premium_updates": True,
                    "push_messages": True,
                    "push_listings": True,
                }
            },
            upsert=True
        )
        
        return {"message": "Unsubscribed from all marketing emails successfully"}
    
    @router.get("/notification-preferences/categories")
    async def get_notification_categories():
        """Get available notification preference categories with descriptions"""
        return {
            "categories": [
                {
                    "id": "email",
                    "name": "Email Notifications",
                    "description": "Control which emails you receive",
                    "preferences": [
                        {
                            "key": "email_transactional",
                            "name": "Order & Transaction Updates",
                            "description": "Payment confirmations, order status, and receipts",
                            "required": True,
                            "category": "transactional"
                        },
                        {
                            "key": "email_verification_updates",
                            "name": "Verification Updates",
                            "description": "Business profile verification status changes",
                            "required": False,
                            "category": "transactional"
                        },
                        {
                            "key": "email_premium_updates",
                            "name": "Premium Subscription Updates",
                            "description": "Premium activation, expiration reminders, and renewals",
                            "required": False,
                            "category": "transactional"
                        },
                        {
                            "key": "email_reminders",
                            "name": "Reminders",
                            "description": "Subscription renewal reminders and account alerts",
                            "required": False,
                            "category": "reminders"
                        },
                        {
                            "key": "email_marketing",
                            "name": "Marketing & Promotions",
                            "description": "Special offers, new features, and promotional content",
                            "required": False,
                            "category": "marketing"
                        },
                        {
                            "key": "email_newsletter",
                            "name": "Newsletter",
                            "description": "Weekly digest and marketplace news",
                            "required": False,
                            "category": "marketing"
                        }
                    ]
                },
                {
                    "id": "push",
                    "name": "Push Notifications",
                    "description": "Control in-app and mobile notifications",
                    "preferences": [
                        {
                            "key": "push_messages",
                            "name": "Messages",
                            "description": "New messages from buyers and sellers",
                            "required": False,
                            "category": "transactional"
                        },
                        {
                            "key": "push_listings",
                            "name": "Listing Updates",
                            "description": "Price drops and updates on saved items",
                            "required": False,
                            "category": "reminders"
                        },
                        {
                            "key": "push_promotions",
                            "name": "Promotions",
                            "description": "Deals and promotional notifications",
                            "required": False,
                            "category": "marketing"
                        }
                    ]
                }
            ]
        }
    
    return router
