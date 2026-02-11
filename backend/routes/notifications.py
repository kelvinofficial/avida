"""
Notifications Routes
Handles user notifications CRUD operations and seeding for testing.
"""

from fastapi import APIRouter, HTTPException, Request, Query
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
import uuid
import random
import logging

logger = logging.getLogger(__name__)


def create_notifications_router(db, require_auth):
    """Create notifications router with dependency injection."""
    router = APIRouter(prefix="/notifications", tags=["notifications"])

    @router.get("")
    async def get_notifications(
        request: Request,
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100),
        unread_only: bool = Query(False),
        notification_type: str = Query(None, description="Filter by type: message, follow, review, price_drop, system, offer")
    ):
        """Get user notifications with optional filtering"""
        user = await require_auth(request)
        
        query = {"user_id": user.user_id}
        if unread_only:
            query["read"] = False
        if notification_type:
            # Handle 'offer' filter which includes all offer types
            if notification_type == 'offer':
                query["type"] = {"$in": ["offer_received", "offer_accepted", "offer_rejected"]}
            else:
                query["type"] = notification_type
        
        skip = (page - 1) * limit
        total = await db.notifications.count_documents(query)
        
        notifications = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        # Get unread count (total unread, not filtered)
        unread_count = await db.notifications.count_documents({"user_id": user.user_id, "read": False})
        
        # Get counts by type for badges
        type_counts = {}
        pipeline = [
            {"$match": {"user_id": user.user_id, "read": False}},
            {"$group": {"_id": "$type", "count": {"$sum": 1}}}
        ]
        async for doc in db.notifications.aggregate(pipeline):
            notif_type = doc["_id"]
            # Group offer types under 'offer' key
            if notif_type in ["offer_received", "offer_accepted", "offer_rejected"]:
                type_counts["offer"] = type_counts.get("offer", 0) + doc["count"]
            else:
                type_counts[notif_type] = doc["count"]
        
        return {
            "notifications": notifications,
            "total": total,
            "unread_count": unread_count,
            "type_counts": type_counts,
            "page": page,
            "limit": limit
        }

    @router.get("/unread-count")
    async def get_unread_notification_count(request: Request):
        """Get unread notification count"""
        user = await require_auth(request)
        
        count = await db.notifications.count_documents({"user_id": user.user_id, "read": False})
        
        return {"unread_count": count}

    @router.put("/{notification_id}/read")
    async def mark_notification_read(notification_id: str, request: Request):
        """Mark a notification as read"""
        user = await require_auth(request)
        
        result = await db.notifications.update_one(
            {"id": notification_id, "user_id": user.user_id},
            {"$set": {"read": True}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return {"message": "Notification marked as read"}

    @router.put("/mark-all-read")
    async def mark_all_notifications_read(request: Request):
        """Mark all notifications as read"""
        user = await require_auth(request)
        
        result = await db.notifications.update_many(
            {"user_id": user.user_id, "read": False},
            {"$set": {"read": True}}
        )
        
        return {"message": f"Marked {result.modified_count} notifications as read"}

    @router.delete("/{notification_id}")
    async def delete_notification(notification_id: str, request: Request):
        """Delete a notification"""
        user = await require_auth(request)
        
        result = await db.notifications.delete_one({"id": notification_id, "user_id": user.user_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return {"message": "Notification deleted"}

    @router.delete("")
    async def clear_all_notifications(request: Request):
        """Clear all notifications"""
        user = await require_auth(request)
        
        result = await db.notifications.delete_many({"user_id": user.user_id})
        
        return {"message": f"Deleted {result.deleted_count} notifications"}

    @router.post("/seed")
    async def seed_sample_notifications(request: Request):
        """Seed sample notifications for testing"""
        user = await require_auth(request)
        
        # Clear existing notifications first
        await db.notifications.delete_many({"user_id": user.user_id})
        
        sample_notifications = [
            {
                "type": "offer_received",
                "title": "New offer received! 💰",
                "body": "Sarah Miller offered €18,000 for your BMW 320d M Sport (20% off)",
                "actor_name": "Sarah Miller",
                "actor_picture": "https://randomuser.me/api/portraits/women/44.jpg",
                "listing_id": "listing_car1",
                "listing_title": "BMW 320d M Sport",
                "image_url": "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=200",
                "cta_label": "VIEW OFFER",
                "meta": {"offer_id": "offer_123", "offered_price": 18000, "listed_price": 22500}
            },
            {
                "type": "offer_accepted",
                "title": "Offer accepted! 🎉",
                "body": "Your offer of €15,000 for iPhone 14 Pro Max has been accepted!",
                "listing_id": "listing_phone1",
                "listing_title": "iPhone 14 Pro Max",
                "image_url": "https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=200",
                "cta_label": "MESSAGE SELLER",
                "meta": {"offer_id": "offer_456", "offered_price": 15000}
            },
            {
                "type": "offer_rejected",
                "title": "Offer declined",
                "body": "Unfortunately, your offer of €800 for MacBook Pro was declined",
                "listing_id": "listing_laptop1",
                "listing_title": "MacBook Pro 14\"",
                "image_url": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=200",
                "cta_label": "MAKE NEW OFFER",
                "meta": {"offer_id": "offer_789", "offered_price": 800}
            },
            {
                "type": "offer_received",
                "title": "New offer on your apartment",
                "body": "John Smith offered €280,000 for 3BR Apartment Munich (12% below asking)",
                "actor_name": "John Smith",
                "actor_picture": "https://randomuser.me/api/portraits/men/32.jpg",
                "listing_id": "listing_apt1",
                "listing_title": "3BR Apartment Munich",
                "image_url": "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=200",
                "cta_label": "VIEW OFFER",
                "meta": {"offer_id": "offer_apt1", "offered_price": 280000, "listed_price": 320000}
            },
            {
                "type": "message",
                "title": "New message from Sarah",
                "body": "Hi! Is the iPhone 14 Pro still available? I'm very interested in buying it.",
                "actor_name": "Sarah Miller",
                "actor_picture": "https://randomuser.me/api/portraits/women/44.jpg",
                "cta_label": "REPLY",
                "meta": {"thread_id": "thread_123"}
            },
            {
                "type": "message",
                "title": "New message from John",
                "body": "Can you do €200 for the bicycle? I can pick it up today.",
                "actor_name": "John Smith",
                "actor_picture": "https://randomuser.me/api/portraits/men/32.jpg",
                "cta_label": "REPLY",
                "meta": {"thread_id": "thread_456"}
            },
            {
                "type": "follow",
                "title": "New follower",
                "body": "Michael Johnson started following you",
                "actor_name": "Michael Johnson",
                "actor_picture": "https://randomuser.me/api/portraits/men/67.jpg",
                "actor_id": "user_789",
                "cta_label": "VIEW PROFILE"
            },
            {
                "type": "price_drop",
                "title": "Price drop alert!",
                "body": "BMW 320d M Sport you saved dropped from €25,000 to €22,500",
                "listing_id": "listing_abc",
                "listing_title": "BMW 320d M Sport",
                "image_url": "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=200",
                "cta_label": "VIEW DEAL"
            },
            {
                "type": "review",
                "title": "New review received",
                "body": "Emma Wilson left a 5-star review: 'Great seller, fast delivery!'",
                "actor_name": "Emma Wilson",
                "actor_picture": "https://randomuser.me/api/portraits/women/65.jpg",
                "cta_label": "VIEW"
            },
            {
                "type": "system",
                "title": "Listing approved",
                "body": "Your listing 'MacBook Pro 14\" M3' has been approved and is now live",
                "cta_label": "VIEW LISTING"
            },
        ]
        
        created = []
        for i, notif in enumerate(sample_notifications):
            # Randomize read status (some read, some unread)
            is_read = random.choice([True, False, False])  # More unread
            
            # Create with varied timestamps
            hours_ago = i * 3 + random.randint(0, 5)
            created_at = (datetime.now(timezone.utc) - timedelta(hours=hours_ago)).isoformat()
            
            notification = {
                "id": str(uuid.uuid4()),
                "user_id": user.user_id,
                "type": notif["type"],
                "title": notif["title"],
                "body": notif["body"],
                "cta_label": notif.get("cta_label"),
                "cta_route": notif.get("cta_route"),
                "read": is_read,
                "created_at": created_at,
                "actor_id": notif.get("actor_id"),
                "actor_name": notif.get("actor_name"),
                "actor_picture": notif.get("actor_picture"),
                "listing_id": notif.get("listing_id"),
                "listing_title": notif.get("listing_title"),
                "image_url": notif.get("image_url"),
                "meta": notif.get("meta", {})
            }
            await db.notifications.insert_one(notification)
            created.append(notification)
        
        return {"message": f"Created {len(created)} sample notifications", "count": len(created)}

    return router
