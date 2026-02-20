"""
Unified Notification Service
Sends notifications through multiple channels: in-app, email, and push.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Unified service for sending notifications across all channels.
    
    Usage:
        service = NotificationService(db)
        await service.notify(
            user_id="user_123",
            notification_type="new_message",
            title="New Message",
            body="You have a new message from Sarah",
            data={"conversation_id": "conv_456"}
        )
    """
    
    def __init__(self, db):
        self.db = db
        self._email_service = None
        self._push_service = None
    
    @property
    def email_service(self):
        """Lazy load email service"""
        if self._email_service is None:
            try:
                from utils.email_service import send_notification_email, SENDGRID_AVAILABLE, SENDGRID_API_KEY
                if SENDGRID_AVAILABLE and SENDGRID_API_KEY:
                    self._email_service = send_notification_email
                    logger.info("Email service initialized")
                else:
                    logger.warning("Email service not available")
            except ImportError as e:
                logger.error(f"Failed to import email service: {e}")
        return self._email_service
    
    @property
    def push_service(self):
        """Lazy load push notification service"""
        if self._push_service is None:
            try:
                from push_notification_service import PushNotificationService
                self._push_service = PushNotificationService(self.db)
                if not self._push_service.enabled:
                    self._push_service = None
                    logger.warning("Push service not available")
                else:
                    logger.info("Push service initialized")
            except ImportError as e:
                logger.error(f"Failed to import push service: {e}")
        return self._push_service
    
    async def notify(
        self,
        user_id: str,
        notification_type: str,
        title: str,
        body: str,
        data: Dict[str, Any] = None,
        channels: List[str] = None,
        priority: str = "normal"
    ) -> Dict[str, Any]:
        """
        Send notification through specified channels.
        
        Args:
            user_id: Target user ID
            notification_type: Type of notification (new_message, offer_received, etc.)
            title: Notification title
            body: Notification body text
            data: Additional data (listing_id, conversation_id, etc.)
            channels: List of channels to use: ["in_app", "email", "push"]
                     If None, uses user's preferences
            priority: Notification priority (low, normal, high)
        
        Returns:
            Dict with status of each channel
        """
        data = data or {}
        results = {
            "user_id": user_id,
            "notification_id": None,
            "channels": {}
        }
        
        # Get user preferences if channels not specified
        if channels is None:
            channels = await self._get_user_notification_channels(user_id, notification_type)
        
        # Get user info for email
        user = await self.db.users.find_one({"user_id": user_id}, {"email": 1, "name": 1, "_id": 0})
        
        # Send to each channel
        if "in_app" in channels:
            notification_id = await self._send_in_app(user_id, notification_type, title, body, data)
            results["notification_id"] = notification_id
            results["channels"]["in_app"] = {"success": True, "id": notification_id}
        
        if "email" in channels and user and user.get("email"):
            email_sent = await self._send_email(
                user["email"], 
                title, 
                body, 
                notification_type, 
                data
            )
            results["channels"]["email"] = {"success": email_sent, "email": user["email"]}
        
        if "push" in channels:
            push_sent = await self._send_push(user_id, title, body, data, priority)
            results["channels"]["push"] = {"success": push_sent}
        
        return results
    
    async def _get_user_notification_channels(self, user_id: str, notification_type: str) -> List[str]:
        """Get user's preferred notification channels based on their settings"""
        # Get user preferences
        prefs = await self.db.notification_preferences.find_one({"user_id": user_id})
        
        channels = ["in_app"]  # Always include in-app
        
        if prefs:
            # Check if email is enabled for this notification type
            if prefs.get("email_enabled", True):
                email_types = prefs.get("email_types", {})
                # Map notification types to preference keys
                type_mapping = {
                    "new_message": "messages",
                    "offer_received": "offers",
                    "offer_accepted": "offers",
                    "offer_rejected": "offers",
                    "price_drop": "price_alerts",
                    "listing_approved": "listing_updates",
                    "listing_sold": "listing_updates",
                    "new_review": "reviews",
                    "badge_earned": "achievements",
                    "system": "system"
                }
                pref_key = type_mapping.get(notification_type, "system")
                if email_types.get(pref_key, True):
                    channels.append("email")
            
            # Check if push is enabled
            if prefs.get("push_enabled", True):
                push_types = prefs.get("push_types", {})
                pref_key = type_mapping.get(notification_type, "system")
                if push_types.get(pref_key, True):
                    channels.append("push")
        else:
            # Default: enable all channels
            channels.extend(["email", "push"])
        
        return channels
    
    async def _send_in_app(
        self, 
        user_id: str, 
        notification_type: str, 
        title: str, 
        body: str, 
        data: Dict[str, Any]
    ) -> str:
        """Save in-app notification to database"""
        notification_id = str(uuid.uuid4())
        
        notification = {
            "id": notification_id,
            "user_id": user_id,
            "type": notification_type,
            "title": title,
            "body": body,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "cta_label": data.get("cta_label"),
            "cta_route": data.get("cta_route"),
            "actor_id": data.get("actor_id"),
            "actor_name": data.get("actor_name"),
            "actor_picture": data.get("actor_picture"),
            "listing_id": data.get("listing_id"),
            "listing_title": data.get("listing_title"),
            "image_url": data.get("image_url"),
            "meta": data.get("meta", {})
        }
        
        await self.db.notifications.insert_one(notification)
        logger.info(f"In-app notification created for user {user_id}: {notification_id}")
        
        return notification_id
    
    async def _send_email(
        self, 
        email: str, 
        title: str, 
        body: str, 
        notification_type: str,
        data: Dict[str, Any]
    ) -> bool:
        """Send email notification"""
        if not self.email_service:
            logger.warning("Email service not available")
            return False
        
        try:
            # Prepend app name to subject
            subject = f"[avida] {title}"
            result = await self.email_service(
                to_email=email,
                subject=subject,
                body=body,
                notification_type=notification_type,
                data=data
            )
            return result
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False
    
    async def _send_push(
        self, 
        user_id: str, 
        title: str, 
        body: str, 
        data: Dict[str, Any],
        priority: str = "normal"
    ) -> bool:
        """Send push notification"""
        if not self.push_service:
            logger.warning("Push service not available")
            return False
        
        try:
            result = await self.push_service.send_to_user(
                user_id=user_id,
                title=title,
                body=body,
                data=data,
                priority=priority
            )
            return result
        except Exception as e:
            logger.error(f"Failed to send push notification: {e}")
            return False
    
    # Convenience methods for common notification types
    
    async def notify_new_message(
        self, 
        user_id: str, 
        sender_name: str, 
        message_preview: str,
        conversation_id: str,
        sender_picture: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send notification for a new message"""
        return await self.notify(
            user_id=user_id,
            notification_type="new_message",
            title=f"New message from {sender_name}",
            body=message_preview[:100] + ("..." if len(message_preview) > 100 else ""),
            data={
                "conversation_id": conversation_id,
                "actor_name": sender_name,
                "actor_picture": sender_picture,
                "cta_label": "REPLY"
            }
        )
    
    async def notify_offer_received(
        self,
        user_id: str,
        buyer_name: str,
        listing_title: str,
        listing_id: str,
        offered_price: float,
        listed_price: float,
        currency: str = "EUR",
        buyer_picture: Optional[str] = None,
        listing_image: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send notification for a new offer"""
        discount_pct = int((1 - offered_price / listed_price) * 100)
        
        return await self.notify(
            user_id=user_id,
            notification_type="offer_received",
            title="New offer received! 💰",
            body=f"{buyer_name} offered {currency} {offered_price:,.0f} for your {listing_title} ({discount_pct}% off)",
            data={
                "listing_id": listing_id,
                "listing_title": listing_title,
                "image_url": listing_image,
                "actor_name": buyer_name,
                "actor_picture": buyer_picture,
                "cta_label": "VIEW OFFER",
                "meta": {
                    "offered_price": offered_price,
                    "listed_price": listed_price,
                    "currency": currency
                }
            }
        )
    
    async def notify_offer_accepted(
        self,
        user_id: str,
        listing_title: str,
        listing_id: str,
        accepted_price: float,
        currency: str = "EUR",
        listing_image: Optional[str] = None,
        seller_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send notification when an offer is accepted"""
        return await self.notify(
            user_id=user_id,
            notification_type="offer_accepted",
            title="Offer accepted! 🎉",
            body=f"Your offer of {currency} {accepted_price:,.0f} for {listing_title} has been accepted!",
            data={
                "listing_id": listing_id,
                "listing_title": listing_title,
                "image_url": listing_image,
                "cta_label": "MESSAGE SELLER",
                "actor_name": seller_name,
                "meta": {
                    "accepted_price": accepted_price,
                    "currency": currency
                }
            },
            channels=["in_app", "email", "push"]  # All channels for accepted offers
        )
    
    async def notify_offer_rejected(
        self,
        user_id: str,
        listing_title: str,
        listing_id: str,
        offered_price: float,
        currency: str = "EUR",
        listing_image: Optional[str] = None,
        seller_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send notification when an offer is rejected"""
        return await self.notify(
            user_id=user_id,
            notification_type="offer_rejected",
            title="Offer not accepted",
            body=f"Your offer for {listing_title} was not accepted. Try a different price or browse similar items.",
            data={
                "listing_id": listing_id,
                "listing_title": listing_title,
                "image_url": listing_image,
                "cta_label": "BROWSE SIMILAR",
                "actor_name": seller_name,
                "meta": {
                    "offered_price": offered_price,
                    "currency": currency
                }
            },
            channels=["in_app", "email", "push"]  # All channels for rejected offers
        )
    
    async def notify_listing_approved(
        self,
        user_id: str,
        listing_title: str,
        listing_id: str,
        listing_image: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send notification when listing is approved"""
        return await self.notify(
            user_id=user_id,
            notification_type="listing_approved",
            title="Listing approved ✅",
            body=f"Your listing '{listing_title}' has been approved and is now live!",
            data={
                "listing_id": listing_id,
                "listing_title": listing_title,
                "image_url": listing_image,
                "cta_label": "VIEW LISTING"
            },
            channels=["in_app", "email", "push"]  # All channels for listing approval
        )
    
    async def notify_listing_sold(
        self,
        user_id: str,
        listing_title: str,
        listing_id: str,
        sold_price: float,
        currency: str = "EUR",
        buyer_name: Optional[str] = None,
        listing_image: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send notification when listing is marked as sold"""
        body = f"Congratulations! Your listing '{listing_title}' has been sold"
        if buyer_name:
            body += f" to {buyer_name}"
        body += f" for {currency} {sold_price:,.0f}!"
        
        return await self.notify(
            user_id=user_id,
            notification_type="listing_sold",
            title="Item sold! 🎉",
            body=body,
            data={
                "listing_id": listing_id,
                "listing_title": listing_title,
                "image_url": listing_image,
                "cta_label": "VIEW SALE",
                "actor_name": buyer_name,
                "meta": {
                    "sold_price": sold_price,
                    "currency": currency
                }
            },
            channels=["in_app", "email", "push"]  # All channels for sold notifications
        )
    
    async def notify_price_drop(
        self,
        user_id: str,
        listing_title: str,
        listing_id: str,
        old_price: float,
        new_price: float,
        currency: str = "EUR",
        listing_image: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send notification for price drop on saved listing"""
        return await self.notify(
            user_id=user_id,
            notification_type="price_drop",
            title="Price drop alert! 📉",
            body=f"{listing_title} dropped from {currency} {old_price:,.0f} to {currency} {new_price:,.0f}",
            data={
                "listing_id": listing_id,
                "listing_title": listing_title,
                "image_url": listing_image,
                "cta_label": "VIEW DEAL",
                "meta": {
                    "old_price": old_price,
                    "new_price": new_price,
                    "currency": currency
                }
            }
        )
    
    async def notify_badge_earned(
        self,
        user_id: str,
        badge_name: str,
        badge_description: str,
        badge_icon: Optional[str] = None,
        points_earned: int = 0
    ) -> Dict[str, Any]:
        """Send notification for earning a badge"""
        return await self.notify(
            user_id=user_id,
            notification_type="badge_earned",
            title=f"Badge earned: {badge_name} 🏆",
            body=badge_description,
            data={
                "cta_label": "VIEW BADGES",
                "meta": {
                    "badge_name": badge_name,
                    "badge_icon": badge_icon,
                    "points_earned": points_earned
                }
            }
        )


# Factory function to create notification service
def create_notification_service(db) -> NotificationService:
    """Create and return a NotificationService instance"""
    return NotificationService(db)
