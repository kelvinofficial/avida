"""
Conversations Routes Module
Handles conversations and messaging between users
Integrates with Chat Moderation System for real-time message scanning
"""

import uuid
import asyncio
from datetime import datetime, timezone
from typing import Optional, Any
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# MODELS
# =============================================================================

class MessageCreate(BaseModel):
    content: str
    message_type: str = "text"  # text, audio, image, video
    media_url: Optional[str] = None
    media_duration: Optional[int] = None  # For audio/video in seconds


# =============================================================================
# ROUTER FACTORY
# =============================================================================

def create_conversations_router(db, require_auth, check_rate_limit, sio, create_notification_func, moderation_manager: Any = None):
    """
    Create the conversations router with dependencies injected
    
    Args:
        db: MongoDB database instance
        require_auth: Function to require authentication
        check_rate_limit: Function to check rate limits
        sio: Socket.IO server instance for real-time messaging
        create_notification_func: Function to create notifications
    
    Returns:
        APIRouter with conversation endpoints
    """
    router = APIRouter(prefix="/conversations", tags=["Conversations"])
    
    @router.post("")
    async def create_conversation(listing_id: str = Query(...), request: Request = None):
        """Create or get existing conversation for a listing"""
        user = await require_auth(request)
        
        # Get listing
        listing = await db.listings.find_one({"id": listing_id}, {"_id": 0})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        # Can't message own listing
        if listing["user_id"] == user.user_id:
            raise HTTPException(status_code=400, detail="Cannot message your own listing")
        
        # Check if conversation exists
        existing = await db.conversations.find_one({
            "listing_id": listing_id,
            "buyer_id": user.user_id,
            "seller_id": listing["user_id"]
        }, {"_id": 0})
        
        if existing:
            return existing
        
        # Create new conversation
        conversation = {
            "id": str(uuid.uuid4()),
            "listing_id": listing_id,
            "buyer_id": user.user_id,
            "seller_id": listing["user_id"],
            "last_message": None,
            "last_message_time": None,
            "buyer_unread": 0,
            "seller_unread": 0,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.conversations.insert_one(conversation)
        # Remove MongoDB _id field before returning
        conversation.pop("_id", None)
        return conversation
    
    @router.post("/direct")
    async def create_direct_conversation(request: Request):
        """Create or get existing direct conversation with a user (not tied to a listing)"""
        user = await require_auth(request)
        body = await request.json()
        
        target_user_id = body.get("user_id")
        if not target_user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        # Can't message yourself
        if target_user_id == user.user_id:
            raise HTTPException(status_code=400, detail="Cannot message yourself")
        
        # Check if user exists
        target_user = await db.users.find_one({"user_id": target_user_id})
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if direct conversation exists (where listing_id is null or 'direct')
        existing = await db.conversations.find_one({
            "$or": [
                {"buyer_id": user.user_id, "seller_id": target_user_id, "listing_id": "direct"},
                {"seller_id": user.user_id, "buyer_id": target_user_id, "listing_id": "direct"},
                {"buyer_id": user.user_id, "seller_id": target_user_id, "listing_id": None},
                {"seller_id": user.user_id, "buyer_id": target_user_id, "listing_id": None}
            ]
        }, {"_id": 0})
        
        if existing:
            return existing
        
        # Create new direct conversation
        conversation = {
            "id": str(uuid.uuid4()),
            "listing_id": "direct",  # Mark as direct conversation
            "buyer_id": user.user_id,  # Initiator
            "seller_id": target_user_id,  # Recipient
            "last_message": None,
            "last_message_time": None,
            "buyer_unread": 0,
            "seller_unread": 0,
            "created_at": datetime.now(timezone.utc),
            "is_direct": True
        }
        
        await db.conversations.insert_one(conversation)
        # Remove MongoDB _id field before returning
        conversation.pop("_id", None)
        return conversation
    
    @router.get("")
    async def get_conversations(request: Request):
        """Get user's conversations"""
        user = await require_auth(request)
        
        conversations = await db.conversations.find({
            "$or": [
                {"buyer_id": user.user_id},
                {"seller_id": user.user_id}
            ]
        }, {"_id": 0}).sort("last_message_time", -1).to_list(100)
        
        # Enrich with listing and user info
        result = []
        for conv in conversations:
            listing = await db.listings.find_one({"id": conv["listing_id"]}, {"_id": 0})
            
            other_user_id = conv["seller_id"] if conv["buyer_id"] == user.user_id else conv["buyer_id"]
            other_user = await db.users.find_one({"user_id": other_user_id}, {"_id": 0})
            
            unread = conv["buyer_unread"] if conv["buyer_id"] == user.user_id else conv["seller_unread"]
            
            result.append({
                **conv,
                "listing": {
                    "id": listing["id"],
                    "title": listing["title"],
                    "price": listing["price"],
                    "images": listing.get("images", [])[:1]
                } if listing else None,
                "other_user": {
                    "user_id": other_user["user_id"],
                    "name": other_user["name"],
                    "picture": other_user.get("picture")
                } if other_user else None,
                "unread": unread
            })
        
        return result
    
    @router.get("/{conversation_id}")
    async def get_conversation(conversation_id: str, request: Request):
        """Get single conversation with messages"""
        user = await require_auth(request)
        
        conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Check access
        if user.user_id not in [conversation["buyer_id"], conversation["seller_id"]]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Get messages
        messages = await db.messages.find(
            {"conversation_id": conversation_id}, 
            {"_id": 0}
        ).sort("created_at", 1).to_list(500)
        
        # Mark as read
        if conversation["buyer_id"] == user.user_id:
            await db.conversations.update_one({"id": conversation_id}, {"$set": {"buyer_unread": 0}})
        else:
            await db.conversations.update_one({"id": conversation_id}, {"$set": {"seller_unread": 0}})
        
        # Mark messages as read
        await db.messages.update_many(
            {"conversation_id": conversation_id, "sender_id": {"$ne": user.user_id}},
            {"$set": {"read": True}}
        )
        
        # Get listing and other user
        listing = await db.listings.find_one({"id": conversation["listing_id"]}, {"_id": 0})
        other_user_id = conversation["seller_id"] if conversation["buyer_id"] == user.user_id else conversation["buyer_id"]
        other_user = await db.users.find_one({"user_id": other_user_id}, {"_id": 0})
        
        return {
            **conversation,
            "messages": messages,
            "listing": listing,
            "other_user": {
                "user_id": other_user["user_id"],
                "name": other_user["name"],
                "picture": other_user.get("picture")
            } if other_user else None
        }
    
    @router.post("/{conversation_id}/messages")
    async def send_message(conversation_id: str, message: MessageCreate, request: Request):
        """Send a message in a conversation"""
        user = await require_auth(request)
        
        # Rate limiting
        if not check_rate_limit(user.user_id, "message"):
            raise HTTPException(status_code=429, detail="Too many messages. Please wait.")
        
        conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Check access
        if user.user_id not in [conversation["buyer_id"], conversation["seller_id"]]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Check if blocked
        other_user_id = conversation["seller_id"] if conversation["buyer_id"] == user.user_id else conversation["buyer_id"]
        other_user = await db.users.find_one({"user_id": other_user_id}, {"_id": 0})
        if other_user and user.user_id in other_user.get("blocked_users", []):
            raise HTTPException(status_code=403, detail="You have been blocked by this user")
        
        # Create message
        new_message = {
            "id": str(uuid.uuid4()),
            "conversation_id": conversation_id,
            "sender_id": user.user_id,
            "content": message.content,
            "message_type": message.message_type,
            "media_url": message.media_url,
            "media_duration": message.media_duration,
            "read": False,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.messages.insert_one(new_message)
        
        # Prepare message for response (remove MongoDB _id)
        response_message = {k: v for k, v in new_message.items() if k != '_id'}
        response_message['created_at'] = response_message['created_at'].isoformat()
        
        # Update conversation
        last_msg_preview = message.content[:100] if message.message_type == "text" else f"[{message.message_type.title()}]"
        unread_field = "seller_unread" if conversation["buyer_id"] == user.user_id else "buyer_unread"
        await db.conversations.update_one(
            {"id": conversation_id},
            {
                "$set": {
                    "last_message": last_msg_preview,
                    "last_message_time": datetime.now(timezone.utc)
                },
                "$inc": {unread_field: 1}
            }
        )
        
        # Emit socket event
        if sio:
            await sio.emit("new_message", {
                "conversation_id": conversation_id,
                "message": response_message
            }, room=conversation_id)
        
        # Create notification for recipient
        recipient_id = other_user_id
        if recipient_id and create_notification_func:
            # Get sender info
            sender_name = user.name or "Someone"
            sender_picture = getattr(user, 'picture', None)
            
            # Get listing info for context
            listing_title = conversation.get("listing_title", "a listing")
            
            # Create message notification
            await create_notification_func(
                user_id=recipient_id,
                notification_type="message",
                title=f"New message from {sender_name}",
                body=last_msg_preview,
                cta_label="REPLY",
                cta_route=f"/chat/{conversation_id}",
                actor_id=user.user_id,
                actor_name=sender_name,
                actor_picture=sender_picture,
                listing_id=conversation.get("listing_id"),
                listing_title=listing_title,
                meta={"conversation_id": conversation_id}
            )
        
        return response_message
    
    return router
