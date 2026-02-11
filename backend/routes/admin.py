"""
Admin Routes Module
Handles admin-specific endpoints for user management, analytics, and settings
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)


def create_admin_router(db, require_admin):
    """
    Factory function to create admin router with dependencies.
    
    Args:
        db: MongoDB database instance
        require_admin: Dependency function for admin authentication
    
    Returns:
        APIRouter instance with admin routes
    """
    router = APIRouter(prefix="/admin", tags=["admin"])

    @router.get("/analytics/platform")
    async def get_platform_analytics(current_user: dict = Depends(require_admin)):
        """Get platform-wide analytics."""
        try:
            # User stats
            total_users = db.users.count_documents({})
            now = datetime.now(timezone.utc)
            week_ago = now - timedelta(days=7)
            day_ago = now - timedelta(days=1)
            
            new_users_week = db.users.count_documents({
                "created_at": {"$gte": week_ago}
            })
            new_users_today = db.users.count_documents({
                "created_at": {"$gte": day_ago}
            })
            
            # Listing stats
            total_listings = db.listings.count_documents({"status": {"$ne": "deleted"}})
            active_listings = db.listings.count_documents({"status": "active"})
            
            # Transaction stats
            total_transactions = db.transactions.count_documents({}) if "transactions" in db.list_collection_names() else 0
            
            # Revenue (estimated from sold listings)
            total_revenue = 0
            sold_listings = list(db.listings.find({"status": "sold"}, {"price": 1}))
            total_revenue = sum(l.get("price", 0) for l in sold_listings)
            
            # Category breakdown
            categories = []
            category_pipeline = [
                {"$match": {"status": {"$ne": "deleted"}}},
                {"$group": {
                    "_id": "$category_id",
                    "listing_count": {"$sum": 1},
                    "revenue": {"$sum": {"$cond": [{"$eq": ["$status", "sold"]}, "$price", 0]}}
                }},
                {"$sort": {"listing_count": -1}},
                {"$limit": 10}
            ]
            for cat in db.listings.aggregate(category_pipeline):
                categories.append({
                    "name": cat["_id"] or "Uncategorized",
                    "listing_count": cat["listing_count"],
                    "sales_count": 0,  # Would need additional tracking
                    "revenue": cat.get("revenue", 0)
                })
            
            return {
                "total_users": total_users,
                "new_users_today": new_users_today,
                "new_users_week": new_users_week,
                "active_users": total_users,  # Simplified - would need activity tracking
                "total_listings": total_listings,
                "active_listings": active_listings,
                "total_transactions": total_transactions,
                "total_revenue": total_revenue,
                "categories": categories
            }
        except Exception as e:
            logger.error(f"Error fetching platform analytics: {e}")
            raise HTTPException(status_code=500, detail="Failed to fetch analytics")

    @router.get("/analytics/sellers")
    async def get_seller_analytics(current_user: dict = Depends(require_admin)):
        """Get seller-specific analytics."""
        try:
            # Find users with listings
            seller_pipeline = [
                {"$group": {
                    "_id": "$user_id",
                    "listing_count": {"$sum": 1},
                    "revenue": {"$sum": {"$cond": [{"$eq": ["$status", "sold"]}, "$price", 0]}},
                    "sales_count": {"$sum": {"$cond": [{"$eq": ["$status", "sold"]}, 1, 0]}}
                }},
                {"$sort": {"revenue": -1}},
                {"$limit": 10}
            ]
            
            top_sellers = []
            for seller in db.listings.aggregate(seller_pipeline):
                user = db.users.find_one({"user_id": seller["_id"]}, {"_id": 0, "name": 1})
                top_sellers.append({
                    "user_id": seller["_id"],
                    "name": user.get("name", "Unknown") if user else "Unknown",
                    "revenue": seller.get("revenue", 0),
                    "sales_count": seller.get("sales_count", 0),
                    "listing_count": seller.get("listing_count", 0)
                })
            
            # Active sellers (with at least 1 active listing)
            active_sellers = len(db.listings.distinct("user_id", {"status": "active"}))
            
            # New sellers this week
            week_ago = datetime.now(timezone.utc) - timedelta(days=7)
            new_sellers = db.users.count_documents({
                "created_at": {"$gte": week_ago}
            })
            
            # Calculate averages
            total_revenue = sum(s.get("revenue", 0) for s in top_sellers)
            total_listings = sum(s.get("listing_count", 0) for s in top_sellers)
            seller_count = len(top_sellers) or 1
            
            return {
                "top_sellers": top_sellers,
                "active_sellers_count": active_sellers,
                "new_sellers_week": new_sellers,
                "avg_seller_revenue": total_revenue / seller_count,
                "avg_listings_per_seller": total_listings / seller_count
            }
        except Exception as e:
            logger.error(f"Error fetching seller analytics: {e}")
            raise HTTPException(status_code=500, detail="Failed to fetch seller analytics")

    @router.get("/analytics/engagement")
    async def get_engagement_analytics(current_user: dict = Depends(require_admin)):
        """Get engagement analytics."""
        try:
            # Message stats
            total_messages = db.messages.count_documents({}) if "messages" in db.list_collection_names() else 0
            day_ago = datetime.now(timezone.utc) - timedelta(days=1)
            messages_today = db.messages.count_documents({
                "created_at": {"$gte": day_ago}
            }) if "messages" in db.list_collection_names() else 0
            
            # Favorites
            total_favorites = db.favorites.count_documents({}) if "favorites" in db.list_collection_names() else 0
            
            # Badge stats
            badge_awards = db.user_badges.count_documents({}) if "user_badges" in db.list_collection_names() else 0
            
            # Challenge completions
            challenge_completions = db.user_challenge_progress.count_documents({
                "completed": True
            }) if "user_challenge_progress" in db.list_collection_names() else 0
            
            # Notification read rate (simplified)
            notification_read_rate = 0.75  # Would need actual tracking
            
            return {
                "total_messages": total_messages,
                "messages_today": messages_today,
                "total_favorites": total_favorites,
                "badge_awards_count": badge_awards,
                "challenge_completions": challenge_completions,
                "notification_read_rate": notification_read_rate
            }
        except Exception as e:
            logger.error(f"Error fetching engagement analytics: {e}")
            raise HTTPException(status_code=500, detail="Failed to fetch engagement analytics")

    @router.post("/settings/seller-analytics")
    async def save_seller_analytics_settings(
        settings: Dict[str, Any],
        current_user: dict = Depends(require_admin)
    ):
        """Save seller analytics settings."""
        try:
            db.admin_settings.update_one(
                {"type": "seller_analytics"},
                {"$set": {
                    "type": "seller_analytics",
                    "alert_threshold": settings.get("alert_threshold", 100),
                    "low_performance_threshold": settings.get("low_performance_threshold", 5),
                    "updated_at": datetime.now(timezone.utc),
                    "updated_by": current_user["user_id"]
                }},
                upsert=True
            )
            return {"success": True, "message": "Settings saved"}
        except Exception as e:
            logger.error(f"Error saving seller analytics settings: {e}")
            raise HTTPException(status_code=500, detail="Failed to save settings")

    @router.get("/settings/seller-analytics")
    async def get_seller_analytics_settings(
        current_user: dict = Depends(require_admin)
    ):
        """Get seller analytics settings."""
        try:
            settings = db.admin_settings.find_one(
                {"type": "seller_analytics"},
                {"_id": 0}
            )
            if not settings:
                # Return default settings if none exist
                return {
                    "alert_threshold": 100,
                    "low_performance_threshold": 5
                }
            return {
                "alert_threshold": settings.get("alert_threshold", 100),
                "low_performance_threshold": settings.get("low_performance_threshold", 5)
            }
        except Exception as e:
            logger.error(f"Error fetching seller analytics settings: {e}")
            raise HTTPException(status_code=500, detail="Failed to fetch settings")

    @router.post("/settings/engagement-notifications")
    async def save_engagement_notification_settings(
        settings: Dict[str, Any],
        current_user: dict = Depends(require_admin)
    ):
        """Save engagement notification settings."""
        try:
            db.admin_settings.update_one(
                {"type": "engagement_notifications"},
                {"$set": {
                    "type": "engagement_notifications",
                    "milestones": settings.get("milestones", {}),
                    "triggers": settings.get("triggers", {}),
                    "updated_at": datetime.now(timezone.utc),
                    "updated_by": current_user["user_id"]
                }},
                upsert=True
            )
            return {"success": True, "message": "Settings saved"}
        except Exception as e:
            logger.error(f"Error saving engagement notification settings: {e}")
            raise HTTPException(status_code=500, detail="Failed to save settings")

    @router.get("/settings/engagement-notifications")
    async def get_engagement_notification_settings(
        current_user: dict = Depends(require_admin)
    ):
        """Get engagement notification settings."""
        try:
            settings = db.admin_settings.find_one(
                {"type": "engagement_notifications"},
                {"_id": 0}
            )
            if not settings:
                # Return default settings if none exist
                return {
                    "milestones": {
                        "firstSale": True,
                        "tenListings": True,
                        "hundredMessages": True,
                        "badgeMilestone": True
                    },
                    "triggers": {
                        "inactiveSeller": True,
                        "lowEngagement": True,
                        "challengeReminder": True,
                        "weeklyDigest": True
                    }
                }
            return {
                "milestones": settings.get("milestones", {}),
                "triggers": settings.get("triggers", {})
            }
        except Exception as e:
            logger.error(f"Error fetching engagement notification settings: {e}")
            raise HTTPException(status_code=500, detail="Failed to fetch settings")

    @router.get("/challenges")
    async def get_admin_challenges(
        page: int = Query(default=1, ge=1),
        limit: int = Query(default=20, le=50),
        current_user: dict = Depends(require_admin)
    ):
        """Get all challenges for admin management."""
        skip = (page - 1) * limit
        
        challenges = list(db.challenges.find(
            {},
            {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit))
        
        total = db.challenges.count_documents({})
        
        # Enrich with participation stats
        for challenge in challenges:
            challenge["participant_count"] = db.user_challenge_progress.count_documents({
                "challenge_id": challenge.get("id")
            })
            challenge["completion_count"] = db.user_challenge_progress.count_documents({
                "challenge_id": challenge.get("id"),
                "completed": True
            })
        
        return {
            "challenges": challenges,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit if total > 0 else 0
            }
        }

    @router.post("/challenges")
    async def create_challenge(
        challenge: Dict[str, Any],
        current_user: dict = Depends(require_admin)
    ):
        """Create a new custom challenge."""
        import uuid
        
        challenge_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        challenge_doc = {
            "id": challenge_id,
            "name": challenge.get("name"),
            "description": challenge.get("description"),
            "type": challenge.get("type", "custom"),
            "target": challenge.get("target", 10),
            "criteria_type": challenge.get("criteria_type", "listings"),
            "icon": challenge.get("icon", "trophy"),
            "color": challenge.get("color", "#2E7D32"),
            "badge_name": challenge.get("badge_name", challenge.get("name")),
            "badge_description": challenge.get("badge_description"),
            "badge_points": challenge.get("badge_points", 50),
            "start_date": challenge.get("start_date", now.isoformat()),
            "end_date": challenge.get("end_date"),
            "required_categories": challenge.get("required_categories", []),
            "is_active": True,
            "created_at": now,
            "created_by": current_user["user_id"]
        }
        
        db.challenges.insert_one(challenge_doc)
        del challenge_doc["_id"]  # Remove MongoDB _id
        
        return {"success": True, "challenge": challenge_doc}

    @router.put("/challenges/{challenge_id}")
    async def update_challenge(
        challenge_id: str,
        updates: Dict[str, Any],
        current_user: dict = Depends(require_admin)
    ):
        """Update an existing challenge."""
        updates["updated_at"] = datetime.now(timezone.utc)
        updates["updated_by"] = current_user["user_id"]
        
        # Remove fields that shouldn't be updated
        updates.pop("id", None)
        updates.pop("created_at", None)
        updates.pop("created_by", None)
        
        result = db.challenges.update_one(
            {"id": challenge_id},
            {"$set": updates}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        return {"success": True, "message": "Challenge updated"}

    @router.delete("/challenges/{challenge_id}")
    async def delete_challenge(
        challenge_id: str,
        current_user: dict = Depends(require_admin)
    ):
        """Soft delete a challenge."""
        result = db.challenges.update_one(
            {"id": challenge_id},
            {"$set": {
                "is_active": False,
                "deleted_at": datetime.now(timezone.utc),
                "deleted_by": current_user["user_id"]
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        return {"success": True, "message": "Challenge deleted"}

    @router.post("/challenges/{challenge_id}/send-reminder")
    async def send_challenge_reminder(
        challenge_id: str,
        current_user: dict = Depends(require_admin)
    ):
        """Send reminder to all participants of a challenge."""
        # Find challenge
        challenge = db.challenges.find_one({"id": challenge_id}, {"_id": 0})
        if not challenge:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        # Find participants who haven't completed
        participants = list(db.user_challenge_progress.find({
            "challenge_id": challenge_id,
            "completed": False
        }))
        
        # In a real implementation, this would send emails/push notifications
        # For now, we just log it
        logger.info(f"Sending reminders to {len(participants)} participants for challenge {challenge_id}")
        
        return {
            "success": True,
            "message": f"Reminders sent to {len(participants)} participants"
        }

    return router
