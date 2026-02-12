"""
Push Notification Service Module
Handles sending push notifications via Expo Push Service.
"""

import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

# Check if Expo SDK is available
try:
    from exponent_server_sdk import (
        PushClient,
        PushMessage,
        PushServerError,
        PushTicketError,
        DeviceNotRegisteredError
    )
    EXPO_PUSH_AVAILABLE = True
except ImportError:
    EXPO_PUSH_AVAILABLE = False
    logger.warning("Expo push SDK not installed. Push notifications will be disabled.")

# Database reference (will be set by init_push_service)
_db = None

# Badge milestone constants (needed for milestone notifications)
BADGE_MILESTONES = [
    {"count": 1, "name": "First Badge!", "message": "You earned your first badge! You're on your way to becoming a top seller.", "icon": "ribbon"},
    {"count": 5, "name": "Badge Collector", "message": "5 badges earned! You're building an impressive reputation.", "icon": "medal"},
    {"count": 10, "name": "Achievement Hunter", "message": "10 badges! You're a dedicated member of our community.", "icon": "trophy"},
    {"count": 25, "name": "Badge Master", "message": "25 badges! You're among our most accomplished sellers.", "icon": "star"},
    {"count": 50, "name": "Legend Status", "message": "50 badges! You've achieved legendary status!", "icon": "diamond"},
]

SPECIAL_BADGE_MILESTONES = {
    "First Listing": {"name": "First Listing Unlocked!", "message": "You've created your first listing! Your journey as a seller begins.", "icon": "pricetag"},
    "First Sale": {"name": "First Sale Celebration!", "message": "Congratulations on your first sale! You're officially a seller.", "icon": "cash"},
    "Active Seller": {"name": "Active Seller Status!", "message": "You've reached Active Seller status with 5+ sales!", "icon": "trending-up"},
    "Top Seller": {"name": "Top Seller Achieved!", "message": "You're now a Top Seller! Your hard work has paid off.", "icon": "trophy"},
    "Trusted Member": {"name": "Trusted Member!", "message": "You've earned the trust of our community. Thank you!", "icon": "shield-checkmark"},
    "Veteran": {"name": "Veteran Status!", "message": "A year of excellence! You're a veteran member.", "icon": "time"},
}


def init_push_service(db):
    """Initialize the push service with a database reference."""
    global _db
    _db = db


async def send_push_notification(
    push_token: str,
    title: str,
    body: str,
    data: Dict[str, Any] = {},
    notification_type: str = "default"
) -> bool:
    """
    Send push notification via Expo Push Service.
    
    Args:
        push_token: Expo push token (ExponentPushToken[...])
        title: Notification title
        body: Notification body text
        data: Additional data payload
        notification_type: Type of notification for channel routing
    
    Returns:
        bool: True if notification was sent successfully
    """
    if not EXPO_PUSH_AVAILABLE:
        logger.warning("Expo push SDK not available")
        return False
    
    if not push_token or not push_token.startswith("ExponentPushToken"):
        logger.warning(f"Invalid push token: {push_token}")
        return False
    
    try:
        # Determine Android channel based on notification type
        channel_id = "default"
        if notification_type in ["chat_message", "seller_response"]:
            channel_id = "messages"
        elif notification_type in ["offer_received", "offer_accepted", "offer_rejected"]:
            channel_id = "offers"
        elif notification_type in ["price_drop", "saved_search_match", "better_deal"]:
            channel_id = "listings"
        
        message = PushMessage(
            to=push_token,
            title=title,
            body=body,
            data=data,
            sound="default",
            channel_id=channel_id,
            priority="high" if notification_type in ["chat_message", "offer_received", "security_alert"] else "default"
        )
        
        push_client = PushClient()
        response = push_client.publish(message)
        
        # Check for errors
        try:
            response.validate_response()
            logger.info(f"Push notification sent successfully to {push_token[:20]}...")
            return True
        except DeviceNotRegisteredError:
            # Mark token as invalid
            if _db:
                await _db.user_settings.update_one(
                    {"push_token": push_token},
                    {"$set": {"push_token": None, "push_token_invalid": True}}
                )
            logger.warning(f"Device not registered, token invalidated: {push_token[:20]}...")
            return False
        except PushTicketError as e:
            logger.error(f"Push ticket error: {e}")
            return False
            
    except PushServerError as e:
        logger.error(f"Push server error: {e}")
        return False
    except Exception as e:
        logger.error(f"Failed to send push notification: {e}")
        return False


async def send_bulk_push_notifications(
    messages: List[Dict[str, Any]]
) -> Dict[str, int]:
    """
    Send multiple push notifications in batch.
    
    Args:
        messages: List of message dicts with push_token, title, body, data
    
    Returns:
        Dict with sent and failed counts
    """
    if not EXPO_PUSH_AVAILABLE:
        return {"sent": 0, "failed": len(messages)}
    
    sent = 0
    failed = 0
    
    push_messages = []
    for msg in messages:
        if msg.get("push_token") and msg["push_token"].startswith("ExponentPushToken"):
            push_messages.append(PushMessage(
                to=msg["push_token"],
                title=msg.get("title", ""),
                body=msg.get("body", ""),
                data=msg.get("data", {}),
                sound="default"
            ))
    
    if not push_messages:
        return {"sent": 0, "failed": len(messages)}
    
    try:
        push_client = PushClient()
        # Send in batches of 100
        for i in range(0, len(push_messages), 100):
            batch = push_messages[i:i+100]
            responses = push_client.publish_multiple(batch)
            for response in responses:
                try:
                    response.validate_response()
                    sent += 1
                except:
                    failed += 1
    except Exception as e:
        logger.error(f"Bulk push error: {e}")
        failed = len(push_messages)
    
    return {"sent": sent, "failed": failed}


async def send_milestone_push_notification(user_id: str, milestone: Dict[str, Any]) -> bool:
    """
    Send push notification when user achieves a milestone.
    
    Args:
        user_id: User ID to send notification to
        milestone: Milestone data dict with id, type, name, message, icon, etc.
    
    Returns:
        bool: True if notification was sent successfully
    """
    if not _db:
        logger.error("Push service not initialized with database")
        return False
    
    try:
        # Get user's push token
        user = await _db.users.find_one({"user_id": user_id})
        if not user:
            return False
        
        push_token = user.get("push_token")
        if not push_token:
            return False
        
        # Build notification content
        title = f"🎉 {milestone.get('name', 'New Achievement!')}"
        body = milestone.get('message', 'Congratulations on your achievement!')
        
        # Add emoji based on milestone type
        if milestone.get('type') == 'count':
            threshold = milestone.get('threshold', 1)
            if threshold >= 50:
                title = f"🏆 {milestone.get('name', 'Legend Status!')}"
            elif threshold >= 25:
                title = f"⭐ {milestone.get('name', 'Badge Master!')}"
            elif threshold >= 10:
                title = f"🎯 {milestone.get('name', 'Achievement Hunter!')}"
        elif milestone.get('type') == 'special':
            badge_name = milestone.get('badge_name', '')
            if 'Sale' in badge_name:
                title = f"💰 {milestone.get('name', 'Sale Milestone!')}"
            elif 'Seller' in badge_name:
                title = f"🌟 {milestone.get('name', 'Seller Milestone!')}"
        
        data = {
            "type": "milestone",
            "milestone_id": milestone.get('id', ''),
            "milestone_type": milestone.get('type', 'count'),
            "route": "/profile/badges",
        }
        
        return await send_push_notification(
            push_token=push_token,
            title=title,
            body=body,
            data=data,
            notification_type="milestone"
        )
    except Exception as e:
        logger.error(f"Failed to send milestone push notification: {e}")
        return False


async def check_and_notify_new_milestones(user_id: str) -> List[Dict[str, Any]]:
    """
    Check for new milestones and send push notifications for each.
    
    Args:
        user_id: User ID to check milestones for
    
    Returns:
        List of new milestones that were notified
    """
    if not _db:
        logger.error("Push service not initialized with database")
        return []
    
    try:
        # Get total badge count
        total_badges = await _db.user_badges.count_documents({"user_id": user_id})
        
        # Get user's badges with names
        user_badges = await _db.user_badges.find({"user_id": user_id}).to_list(length=100)
        badge_ids = [b["badge_id"] for b in user_badges]
        badges = await _db.badges.find({"id": {"$in": badge_ids}}).to_list(length=100)
        badge_names = {b["id"]: b["name"] for b in badges}
        
        # Get acknowledged milestones
        user_milestones = await _db.user_milestones.find({"user_id": user_id}).to_list(length=100)
        acknowledged_ids = {m["milestone_id"] for m in user_milestones}
        
        new_milestones = []
        
        # Check count-based milestones
        for milestone in BADGE_MILESTONES:
            milestone_id = f"count_{milestone['count']}"
            if total_badges >= milestone["count"] and milestone_id not in acknowledged_ids:
                milestone_data = {
                    "id": milestone_id,
                    "type": "count",
                    "name": milestone["name"],
                    "message": milestone["message"],
                    "icon": milestone["icon"],
                    "threshold": milestone["count"],
                }
                new_milestones.append(milestone_data)
                
                # Send push notification
                await send_milestone_push_notification(user_id, milestone_data)
        
        # Check special badge milestones
        for badge_name, milestone in SPECIAL_BADGE_MILESTONES.items():
            milestone_id = f"special_{badge_name.replace(' ', '_').lower()}"
            earned = any(badge_names.get(b["badge_id"]) == badge_name for b in user_badges)
            
            if earned and milestone_id not in acknowledged_ids:
                milestone_data = {
                    "id": milestone_id,
                    "type": "special",
                    "badge_name": badge_name,
                    "name": milestone["name"],
                    "message": milestone["message"],
                    "icon": milestone["icon"],
                }
                new_milestones.append(milestone_data)
                
                # Send push notification
                await send_milestone_push_notification(user_id, milestone_data)
        
        return new_milestones
    except Exception as e:
        logger.error(f"Error checking milestones for push notifications: {e}")
        return []
