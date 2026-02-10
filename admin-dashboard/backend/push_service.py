"""
Push Notification Service

This module provides integration with:
1. Expo Push Notifications (for React Native/Expo apps)
2. Firebase Cloud Messaging (FCM) for native apps
3. OneSignal for cross-platform delivery

The default provider for this app is Expo Push, since the mobile app is built with Expo.
"""

import os
import logging
import httpx
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Configuration
EXPO_PUSH_ENABLED = os.environ.get("EXPO_PUSH_ENABLED", "true").lower() == "true"

FIREBASE_ENABLED = os.environ.get("FIREBASE_ENABLED", "false").lower() == "true"
FIREBASE_CREDENTIALS_PATH = os.environ.get("FIREBASE_CREDENTIALS_PATH", "")

ONESIGNAL_ENABLED = os.environ.get("ONESIGNAL_ENABLED", "false").lower() == "true"
ONESIGNAL_APP_ID = os.environ.get("ONESIGNAL_APP_ID", "")
ONESIGNAL_API_KEY = os.environ.get("ONESIGNAL_API_KEY", "")

# Firebase Admin SDK (lazy loaded)
firebase_app = None


async def send_expo_push_notification(
    push_tokens: List[str],
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
    channel_id: str = "default"
) -> Dict[str, Any]:
    """
    Send push notifications via Expo Push Service
    
    Args:
        push_tokens: List of Expo push tokens (ExponentPushToken[xxx])
        title: Notification title
        body: Notification body text
        data: Optional data payload for deep linking
        channel_id: Android notification channel
    
    Returns:
        Result dict with success/failure info
    """
    if not push_tokens:
        return {"success": 0, "failure": 0, "reason": "No tokens provided"}
    
    # Filter valid Expo tokens
    valid_tokens = [t for t in push_tokens if t and t.startswith("ExponentPushToken")]
    
    if not valid_tokens:
        logger.info("No valid Expo push tokens found")
        return {"success": 0, "failure": len(push_tokens), "reason": "No valid Expo tokens"}
    
    try:
        # Build messages
        messages = []
        for token in valid_tokens:
            message = {
                "to": token,
                "title": title,
                "body": body,
                "sound": "default",
                "channelId": channel_id,
            }
            if data:
                message["data"] = data
            messages.append(message)
        
        # Send to Expo Push API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://exp.host/--/api/v2/push/send",
                json=messages,
                headers={"Content-Type": "application/json"}
            )
            
            result = response.json()
            
            success_count = 0
            failure_count = 0
            errors = []
            
            if "data" in result:
                for i, ticket in enumerate(result["data"]):
                    if ticket.get("status") == "ok":
                        success_count += 1
                    else:
                        failure_count += 1
                        if ticket.get("message"):
                            errors.append({
                                "token": valid_tokens[i][:30] + "...",
                                "error": ticket.get("message")
                            })
            
            logger.info(f"Expo push sent: {success_count} success, {failure_count} failed")
            
            return {
                "success": success_count,
                "failure": failure_count,
                "errors": errors if errors else None
            }
    except Exception as e:
        logger.error(f"Expo push failed: {e}")
        return {"success": 0, "failure": len(valid_tokens), "error": str(e)}

def init_firebase():
    """Initialize Firebase Admin SDK"""
    global firebase_app
    if not FIREBASE_ENABLED or firebase_app:
        return False
    
    try:
        import firebase_admin
        from firebase_admin import credentials
        
        if not firebase_admin._apps:
            if FIREBASE_CREDENTIALS_PATH and os.path.exists(FIREBASE_CREDENTIALS_PATH):
                cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
                firebase_app = firebase_admin.initialize_app(cred)
                logger.info("Firebase Admin SDK initialized")
                return True
            else:
                logger.warning("Firebase credentials file not found")
                return False
    except ImportError:
        logger.warning("firebase-admin package not installed")
        return False
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {e}")
        return False


async def send_fcm_notification(
    tokens: List[str],
    title: str,
    body: str,
    data: Optional[Dict[str, str]] = None,
    image_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    Send push notification via Firebase Cloud Messaging
    
    Args:
        tokens: List of FCM device tokens
        title: Notification title
        body: Notification body text
        data: Optional data payload
        image_url: Optional image URL for rich notifications
    
    Returns:
        Result dict with success/failure counts
    """
    if not FIREBASE_ENABLED:
        logger.info("FCM disabled - notification not sent")
        return {"success": 0, "failure": len(tokens), "reason": "FCM disabled"}
    
    if not init_firebase():
        return {"success": 0, "failure": len(tokens), "reason": "FCM not initialized"}
    
    try:
        from firebase_admin import messaging
        
        notification = messaging.Notification(
            title=title,
            body=body,
            image=image_url
        )
        
        # Send to multiple tokens
        message = messaging.MulticastMessage(
            notification=notification,
            data=data or {},
            tokens=tokens
        )
        
        response = messaging.send_multicast(message)
        
        return {
            "success": response.success_count,
            "failure": response.failure_count,
            "responses": [
                {"success": r.success, "message_id": r.message_id if r.success else None}
                for r in response.responses
            ]
        }
    except Exception as e:
        logger.error(f"FCM send failed: {e}")
        return {"success": 0, "failure": len(tokens), "error": str(e)}


async def send_onesignal_notification(
    user_ids: Optional[List[str]] = None,
    segments: Optional[List[str]] = None,
    title: str = "",
    body: str = "",
    data: Optional[Dict[str, Any]] = None,
    image_url: Optional[str] = None,
    url: Optional[str] = None
) -> Dict[str, Any]:
    """
    Send push notification via OneSignal
    
    Args:
        user_ids: List of OneSignal player IDs or external user IDs
        segments: List of segments to target (e.g., ["All"])
        title: Notification title
        body: Notification body text
        data: Optional data payload
        image_url: Optional image URL
        url: Optional URL to open on click
    
    Returns:
        Result dict from OneSignal API
    """
    if not ONESIGNAL_ENABLED:
        logger.info("OneSignal disabled - notification not sent")
        return {"success": False, "reason": "OneSignal disabled"}
    
    if not ONESIGNAL_APP_ID or not ONESIGNAL_API_KEY:
        logger.warning("OneSignal credentials not configured")
        return {"success": False, "reason": "OneSignal not configured"}
    
    try:
        payload = {
            "app_id": ONESIGNAL_APP_ID,
            "headings": {"en": title},
            "contents": {"en": body},
        }
        
        # Target users or segments
        if user_ids:
            payload["include_external_user_ids"] = user_ids
        elif segments:
            payload["included_segments"] = segments
        else:
            payload["included_segments"] = ["All"]
        
        # Optional fields
        if data:
            payload["data"] = data
        if image_url:
            payload["big_picture"] = image_url
            payload["ios_attachments"] = {"image": image_url}
        if url:
            payload["url"] = url
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://onesignal.com/api/v1/notifications",
                json=payload,
                headers={
                    "Authorization": f"Basic {ONESIGNAL_API_KEY}",
                    "Content-Type": "application/json"
                }
            )
            
            result = response.json()
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "id": result.get("id"),
                    "recipients": result.get("recipients", 0)
                }
            else:
                return {
                    "success": False,
                    "errors": result.get("errors", [])
                }
    except Exception as e:
        logger.error(f"OneSignal send failed: {e}")
        return {"success": False, "error": str(e)}


async def send_push_notification(
    title: str,
    body: str,
    user_ids: Optional[List[str]] = None,
    fcm_tokens: Optional[List[str]] = None,
    expo_tokens: Optional[List[str]] = None,
    segments: Optional[List[str]] = None,
    data: Optional[Dict[str, Any]] = None,
    image_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    Send push notification using available provider (Expo, FCM, or OneSignal)
    
    This is the main function to use for sending notifications.
    Priority: Expo Push > FCM > OneSignal
    
    Args:
        title: Notification title
        body: Notification body text
        user_ids: List of user IDs (for OneSignal external user IDs)
        fcm_tokens: List of FCM device tokens
        expo_tokens: List of Expo push tokens
        segments: List of segments to target
        data: Optional data payload
        image_url: Optional image URL
    
    Returns:
        Result dict with provider and delivery info
    """
    results = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "title": title,
        "providers": []
    }
    
    # Try Expo Push first (primary for this app)
    if EXPO_PUSH_ENABLED and expo_tokens:
        expo_result = await send_expo_push_notification(
            push_tokens=expo_tokens,
            title=title,
            body=body,
            data=data
        )
        results["providers"].append({"provider": "expo", **expo_result})
    
    # Try FCM if tokens provided
    if FIREBASE_ENABLED and fcm_tokens:
        fcm_result = await send_fcm_notification(
            tokens=fcm_tokens,
            title=title,
            body=body,
            data={k: str(v) for k, v in (data or {}).items()},
            image_url=image_url
        )
        results["providers"].append({"provider": "fcm", **fcm_result})
    
    # Try OneSignal if enabled
    if ONESIGNAL_ENABLED:
        onesignal_result = await send_onesignal_notification(
            user_ids=user_ids,
            segments=segments,
            title=title,
            body=body,
            data=data,
            image_url=image_url
        )
        results["providers"].append({"provider": "onesignal", **onesignal_result})
    
    # Fallback - just log if no provider enabled
    if not results["providers"]:
        logger.info(f"No push provider enabled. Notification: {title} - {body}")
        results["providers"].append({
            "provider": "none",
            "success": False,
            "reason": "No push notification provider configured"
        })
    
    return results


# User device token management
async def register_device_token(db, user_id: str, token: str, platform: str = "web"):
    """Register a device token for push notifications"""
    await db.user_device_tokens.update_one(
        {"user_id": user_id, "token": token},
        {
            "$set": {
                "user_id": user_id,
                "token": token,
                "platform": platform,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$setOnInsert": {
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )


async def get_user_tokens(db, user_ids: List[str]) -> Dict[str, List[str]]:
    """
    Get push tokens for a list of users.
    Returns both Expo tokens and FCM tokens if available.
    
    Looks in:
    1. users collection -> push_token field (Expo tokens from mobile app)
    2. user_device_tokens collection -> token field (FCM/other tokens)
    """
    expo_tokens = []
    fcm_tokens = []
    
    # Get Expo tokens from users collection (mobile app stores them here)
    users = await db.users.find(
        {"user_id": {"$in": user_ids}, "push_token": {"$exists": True, "$ne": None}},
        {"push_token": 1}
    ).to_list(10000)
    
    for user in users:
        token = user.get("push_token")
        if token:
            if token.startswith("ExponentPushToken"):
                expo_tokens.append(token)
            else:
                fcm_tokens.append(token)
    
    # Also check user_device_tokens collection
    device_tokens = await db.user_device_tokens.find(
        {"user_id": {"$in": user_ids}},
        {"token": 1}
    ).to_list(10000)
    
    for dt in device_tokens:
        token = dt.get("token")
        if token:
            if token.startswith("ExponentPushToken"):
                if token not in expo_tokens:
                    expo_tokens.append(token)
            else:
                if token not in fcm_tokens:
                    fcm_tokens.append(token)
    
    return {
        "expo_tokens": expo_tokens,
        "fcm_tokens": fcm_tokens
    }


async def remove_device_token(db, user_id: str, token: str):
    """Remove a device token"""
    await db.user_device_tokens.delete_one({"user_id": user_id, "token": token})
