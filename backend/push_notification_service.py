"""
Push Notification Service using Firebase Cloud Messaging (FCM)
Handles device token management and sending push notifications
"""

import os
import json
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Firebase Admin SDK initialization
_firebase_app = None

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    global _firebase_app
    
    if _firebase_app:
        return _firebase_app
    
    try:
        import firebase_admin
        from firebase_admin import credentials
        
        # Check if already initialized
        if firebase_admin._apps:
            _firebase_app = firebase_admin.get_app()
            return _firebase_app
        
        # Try to initialize from service account file
        service_account_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH", "/app/backend/secrets/firebase-admin.json")
        
        if os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            _firebase_app = firebase_admin.initialize_app(cred)
            logger.info("Firebase initialized from service account file")
        else:
            # Try to initialize from environment variable (JSON string)
            service_account_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
            if service_account_json:
                cred = credentials.Certificate(json.loads(service_account_json))
                _firebase_app = firebase_admin.initialize_app(cred)
                logger.info("Firebase initialized from environment variable")
            else:
                logger.warning("Firebase credentials not found. Push notifications disabled.")
                return None
        
        return _firebase_app
        
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {e}")
        return None


class PushNotificationService:
    """Service for managing push notifications via FCM"""
    
    def __init__(self, db):
        self.db = db
        self.firebase_app = initialize_firebase()
        self.enabled = self.firebase_app is not None
        
        if self.enabled:
            from firebase_admin import messaging
            self.messaging = messaging
            logger.info("Push Notification Service initialized")
        else:
            self.messaging = None
            logger.warning("Push Notification Service disabled (Firebase not configured)")
    
    async def register_device_token(self, user_id: str, token: str, platform: str = "unknown") -> bool:
        """Register a device token for a user"""
        try:
            now = datetime.now(timezone.utc)
            
            # Check if token already exists for this user
            existing = await self.db.push_tokens.find_one({
                "user_id": user_id,
                "token": token
            })
            
            if existing:
                # Update last seen
                await self.db.push_tokens.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {"last_seen": now, "platform": platform}}
                )
                return True
            
            # Add new token
            await self.db.push_tokens.insert_one({
                "user_id": user_id,
                "token": token,
                "platform": platform,
                "created_at": now,
                "last_seen": now,
                "is_active": True
            })
            
            logger.info(f"Registered push token for user {user_id} ({platform})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to register push token: {e}")
            return False
    
    async def unregister_device_token(self, user_id: str, token: str) -> bool:
        """Unregister a device token"""
        try:
            result = await self.db.push_tokens.delete_one({
                "user_id": user_id,
                "token": token
            })
            
            if result.deleted_count > 0:
                logger.info(f"Unregistered push token for user {user_id}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to unregister push token: {e}")
            return False
    
    async def get_user_tokens(self, user_id: str) -> List[str]:
        """Get all active push tokens for a user"""
        try:
            cursor = self.db.push_tokens.find({
                "user_id": user_id,
                "is_active": True
            })
            tokens = await cursor.to_list(length=10)
            return [t["token"] for t in tokens]
        except Exception as e:
            logger.error(f"Failed to get user tokens: {e}")
            return []
    
    async def check_user_push_preference(self, user_id: str, notification_type: str) -> bool:
        """Check if user has opted in to receive this type of push notification"""
        prefs = await self.db.notification_preferences.find_one({"user_id": user_id})
        
        if not prefs:
            # Default to enabled
            return True
        
        # Map notification types to preference keys
        preference_map = {
            "message": "push_messages",
            "listing": "push_listings",
            "promotion": "push_promotions",
            "order": "push_messages",  # Order updates use messages preference
            "verification": "push_messages",
            "premium": "push_messages",
        }
        
        pref_key = preference_map.get(notification_type, "push_messages")
        return prefs.get(pref_key, True)
    
    async def send_notification(
        self,
        user_id: str,
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None,
        notification_type: str = "message",
        image_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send a push notification to a user"""
        
        if not self.enabled:
            return {"success": False, "error": "Push notifications not configured"}
        
        try:
            # Check user preference
            can_send = await self.check_user_push_preference(user_id, notification_type)
            if not can_send:
                return {"success": False, "error": "User opted out", "skipped": True}
            
            # Get user's tokens
            tokens = await self.get_user_tokens(user_id)
            
            if not tokens:
                return {"success": False, "error": "No registered devices"}
            
            # Build notification
            notification = self.messaging.Notification(
                title=title,
                body=body,
                image=image_url
            )
            
            # Build message data
            message_data = data or {}
            message_data["notification_type"] = notification_type
            message_data["timestamp"] = datetime.now(timezone.utc).isoformat()
            
            # Send to all user's devices
            results = {"success": 0, "failed": 0, "tokens_removed": 0}
            
            for token in tokens:
                try:
                    message = self.messaging.Message(
                        notification=notification,
                        data=message_data,
                        token=token,
                        android=self.messaging.AndroidConfig(
                            priority="high",
                            notification=self.messaging.AndroidNotification(
                                sound="default",
                                channel_id="default"
                            )
                        ),
                        apns=self.messaging.APNSConfig(
                            payload=self.messaging.APNSPayload(
                                aps=self.messaging.Aps(
                                    sound="default",
                                    badge=1
                                )
                            )
                        )
                    )
                    
                    response = self.messaging.send(message)
                    results["success"] += 1
                    logger.debug(f"Push sent successfully: {response}")
                    
                except self.messaging.UnregisteredError:
                    # Token is invalid, remove it
                    await self.db.push_tokens.update_one(
                        {"token": token},
                        {"$set": {"is_active": False}}
                    )
                    results["tokens_removed"] += 1
                    
                except Exception as e:
                    logger.error(f"Failed to send to token: {e}")
                    results["failed"] += 1
            
            return {
                "success": results["success"] > 0,
                "sent": results["success"],
                "failed": results["failed"],
                "tokens_removed": results["tokens_removed"]
            }
            
        except Exception as e:
            logger.error(f"Push notification error: {e}")
            return {"success": False, "error": str(e)}
    
    async def send_bulk_notification(
        self,
        user_ids: List[str],
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None,
        notification_type: str = "promotion"
    ) -> Dict[str, Any]:
        """Send a push notification to multiple users"""
        
        if not self.enabled:
            return {"success": False, "error": "Push notifications not configured"}
        
        results = {"total": len(user_ids), "sent": 0, "skipped": 0, "failed": 0}
        
        for user_id in user_ids:
            result = await self.send_notification(
                user_id=user_id,
                title=title,
                body=body,
                data=data,
                notification_type=notification_type
            )
            
            if result.get("success"):
                results["sent"] += 1
            elif result.get("skipped"):
                results["skipped"] += 1
            else:
                results["failed"] += 1
        
        return results


# Notification templates for common events
PUSH_TEMPLATES = {
    "new_message": {
        "title": "New Message",
        "body": "{sender_name} sent you a message",
        "type": "message"
    },
    "order_confirmed": {
        "title": "Order Confirmed",
        "body": "Your order #{order_id} has been confirmed",
        "type": "order"
    },
    "profile_verified": {
        "title": "Profile Verified! ✓",
        "body": "Congratulations! Your business profile has been verified",
        "type": "verification"
    },
    "profile_rejected": {
        "title": "Verification Update",
        "body": "Your verification request needs attention",
        "type": "verification"
    },
    "premium_activated": {
        "title": "Premium Activated! 💎",
        "body": "Your business is now Premium Verified",
        "type": "premium"
    },
    "premium_expiring": {
        "title": "Premium Expiring Soon",
        "body": "Your premium subscription expires in {days} days",
        "type": "premium"
    },
    "listing_sold": {
        "title": "Item Sold! 🎉",
        "body": "Your listing \"{listing_title}\" has been sold",
        "type": "order"
    },
    "price_drop": {
        "title": "Price Drop Alert",
        "body": "{listing_title} is now {new_price}",
        "type": "listing"
    },
    "promotion": {
        "title": "Special Offer",
        "body": "{promo_message}",
        "type": "promotion"
    }
}


async def send_templated_notification(
    push_service: PushNotificationService,
    user_id: str,
    template_name: str,
    template_data: Dict[str, str] = None,
    extra_data: Dict[str, str] = None
) -> Dict[str, Any]:
    """Send a notification using a template"""
    
    template = PUSH_TEMPLATES.get(template_name)
    if not template:
        return {"success": False, "error": f"Template not found: {template_name}"}
    
    template_data = template_data or {}
    
    title = template["title"].format(**template_data) if "{" in template["title"] else template["title"]
    body = template["body"].format(**template_data) if "{" in template["body"] else template["body"]
    
    return await push_service.send_notification(
        user_id=user_id,
        title=title,
        body=body,
        data=extra_data,
        notification_type=template["type"]
    )
