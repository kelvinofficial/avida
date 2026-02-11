"""
Badges and Challenges Routes Module
Handles badge earning, challenges, milestones, and leaderboards
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)


def create_badges_router(db, get_current_user, badge_service=None):
    """
    Factory function to create badges router with dependencies.
    
    Args:
        db: MongoDB database instance
        get_current_user: Dependency function for authentication
        badge_service: Optional badge awarding service
    
    Returns:
        APIRouter instance with badge routes
    """
    router = APIRouter(prefix="/badges", tags=["badges"])

    # Badge definitions available in the system
    BADGE_DEFINITIONS = [
        {"id": "first_listing", "name": "First Steps", "description": "Created your first listing", "icon": "star", "color": "#FFD700", "points_value": 10, "criteria": {"type": "listings", "count": 1}},
        {"id": "listing_5", "name": "Active Seller", "description": "Created 5 listings", "icon": "trending-up", "color": "#4CAF50", "points_value": 25, "criteria": {"type": "listings", "count": 5}},
        {"id": "listing_10", "name": "Seasoned Seller", "description": "Created 10 listings", "icon": "ribbon", "color": "#2196F3", "points_value": 50, "criteria": {"type": "listings", "count": 10}},
        {"id": "first_sale", "name": "First Sale", "description": "Made your first sale", "icon": "cash", "color": "#4CAF50", "points_value": 20, "criteria": {"type": "sales", "count": 1}},
        {"id": "sales_5", "name": "Rising Star", "description": "Made 5 sales", "icon": "star", "color": "#FF9800", "points_value": 50, "criteria": {"type": "sales", "count": 5}},
        {"id": "sales_10", "name": "Top Seller", "description": "Made 10 sales", "icon": "trophy", "color": "#FFD700", "points_value": 100, "criteria": {"type": "sales", "count": 10}},
        {"id": "verified_seller", "name": "Verified Seller", "description": "Verified your identity", "icon": "checkmark-circle", "color": "#2196F3", "points_value": 30, "criteria": {"type": "verification"}},
        {"id": "quick_responder", "name": "Quick Responder", "description": "Average response time under 1 hour", "icon": "flash", "color": "#9C27B0", "points_value": 25, "criteria": {"type": "response_time", "hours": 1}},
        {"id": "community_helper", "name": "Community Helper", "description": "Received 10 positive reviews", "icon": "heart", "color": "#E91E63", "points_value": 40, "criteria": {"type": "reviews", "count": 10}},
    ]

    @router.get("/progress")
    async def get_badge_progress(current_user: dict = Depends(get_current_user)):
        """Get user's badge progress across all badge types."""
        user_id = current_user["user_id"]
        
        # Get user's earned badges
        earned_badges = list(db.user_badges.find(
            {"user_id": user_id},
            {"_id": 0}
        ))
        earned_badge_ids = {b["badge_id"] for b in earned_badges}
        
        # Get user stats for progress calculation
        listings_count = db.listings.count_documents({"user_id": user_id, "status": {"$ne": "deleted"}})
        sales_count = db.listings.count_documents({"user_id": user_id, "status": "sold"})
        
        user = db.users.find_one({"user_id": user_id}, {"_id": 0, "verified": 1})
        is_verified = user.get("verified", False) if user else False
        
        reviews_count = db.reviews.count_documents({"reviewed_user_id": user_id, "rating": {"$gte": 4}})
        
        progress = []
        for badge in BADGE_DEFINITIONS:
            badge_progress = {
                "badge_id": badge["id"],
                "name": badge["name"],
                "description": badge["description"],
                "icon": badge["icon"],
                "color": badge["color"],
                "points_value": badge["points_value"],
                "earned": badge["id"] in earned_badge_ids,
                "progress": 0,
                "target": 1,
            }
            
            criteria = badge["criteria"]
            if criteria["type"] == "listings":
                badge_progress["progress"] = min(listings_count, criteria["count"])
                badge_progress["target"] = criteria["count"]
            elif criteria["type"] == "sales":
                badge_progress["progress"] = min(sales_count, criteria["count"])
                badge_progress["target"] = criteria["count"]
            elif criteria["type"] == "verification":
                badge_progress["progress"] = 1 if is_verified else 0
                badge_progress["target"] = 1
            elif criteria["type"] == "reviews":
                badge_progress["progress"] = min(reviews_count, criteria["count"])
                badge_progress["target"] = criteria["count"]
            
            progress.append(badge_progress)
        
        return {"badges": progress}

    @router.put("/showcase")
    async def update_showcased_badges(
        badge_ids: List[str],
        current_user: dict = Depends(get_current_user)
    ):
        """Update user's showcased badges (max 5)."""
        if len(badge_ids) > 5:
            raise HTTPException(status_code=400, detail="Maximum 5 badges can be showcased")
        
        user_id = current_user["user_id"]
        
        # Verify user owns all badges
        owned_badges = list(db.user_badges.find(
            {"user_id": user_id, "badge_id": {"$in": badge_ids}},
            {"badge_id": 1}
        ))
        owned_ids = {b["badge_id"] for b in owned_badges}
        
        for badge_id in badge_ids:
            if badge_id not in owned_ids:
                raise HTTPException(status_code=400, detail=f"Badge {badge_id} not owned")
        
        # Clear all showcased
        db.user_badges.update_many(
            {"user_id": user_id},
            {"$set": {"is_showcased": False}}
        )
        
        # Set new showcased
        if badge_ids:
            db.user_badges.update_many(
                {"user_id": user_id, "badge_id": {"$in": badge_ids}},
                {"$set": {"is_showcased": True}}
            )
        
        return {"success": True, "showcased_count": len(badge_ids)}

    @router.get("/unviewed-count")
    async def get_unviewed_badge_count(current_user: dict = Depends(get_current_user)):
        """Get count of unviewed badges for notification bell."""
        count = db.user_badges.count_documents({
            "user_id": current_user["user_id"],
            "is_viewed": False
        })
        return {"unviewed_count": count}

    @router.post("/mark-viewed")
    async def mark_badges_viewed(current_user: dict = Depends(get_current_user)):
        """Mark all user badges as viewed."""
        result = db.user_badges.update_many(
            {"user_id": current_user["user_id"], "is_viewed": False},
            {"$set": {"is_viewed": True}}
        )
        return {"success": True, "marked_count": result.modified_count}

    @router.get("/milestones")
    async def get_milestones(current_user: dict = Depends(get_current_user)):
        """Get user's milestone progress."""
        user_id = current_user["user_id"]
        
        # Count user's badges
        badge_count = db.user_badges.count_documents({"user_id": user_id})
        
        # Milestone definitions
        milestones = [
            {"id": "first_badge", "name": "Badge Collector", "description": "Earn your first badge", "badge_count_required": 1, "icon": "medal", "color": "#FFD700", "points_value": 10},
            {"id": "badge_5", "name": "Rising Achiever", "description": "Earn 5 badges", "badge_count_required": 5, "icon": "ribbon", "color": "#4CAF50", "points_value": 25},
            {"id": "badge_10", "name": "Badge Master", "description": "Earn 10 badges", "badge_count_required": 10, "icon": "trophy", "color": "#9C27B0", "points_value": 50},
        ]
        
        # Get achieved milestones
        achieved = list(db.user_milestones.find(
            {"user_id": user_id},
            {"_id": 0}
        ))
        achieved_ids = {m["milestone_id"] for m in achieved}
        
        result = []
        for m in milestones:
            result.append({
                **m,
                "achieved": m["id"] in achieved_ids,
                "progress": min(badge_count, m["badge_count_required"]),
            })
        
        return {"milestones": result, "total_badges": badge_count}

    @router.post("/milestones/acknowledge")
    async def acknowledge_milestones(current_user: dict = Depends(get_current_user)):
        """Check and acknowledge newly achieved milestones."""
        user_id = current_user["user_id"]
        badge_count = db.user_badges.count_documents({"user_id": user_id})
        
        milestones = [
            {"id": "first_badge", "name": "Badge Collector", "badge_count_required": 1, "icon": "medal", "color": "#FFD700", "points_value": 10},
            {"id": "badge_5", "name": "Rising Achiever", "badge_count_required": 5, "icon": "ribbon", "color": "#4CAF50", "points_value": 25},
            {"id": "badge_10", "name": "Badge Master", "badge_count_required": 10, "icon": "trophy", "color": "#9C27B0", "points_value": 50},
        ]
        
        achieved = list(db.user_milestones.find({"user_id": user_id}, {"milestone_id": 1}))
        achieved_ids = {m["milestone_id"] for m in achieved}
        
        new_milestones = []
        for m in milestones:
            if m["id"] not in achieved_ids and badge_count >= m["badge_count_required"]:
                db.user_milestones.insert_one({
                    "user_id": user_id,
                    "milestone_id": m["id"],
                    "milestone_name": m["name"],
                    "achieved_at": datetime.now(timezone.utc),
                    "acknowledged": True
                })
                new_milestones.append(m)
        
        return {"new_milestones": new_milestones}

    @router.get("/leaderboard")
    async def get_leaderboard(
        page: int = Query(default=1, ge=1),
        limit: int = Query(default=20, le=50)
    ):
        """Get public badge leaderboard."""
        skip = (page - 1) * limit
        
        # Aggregate badges per user
        pipeline = [
            {"$group": {
                "_id": "$user_id",
                "badge_count": {"$sum": 1},
                "total_points": {"$sum": "$points_value"}
            }},
            {"$sort": {"total_points": -1, "badge_count": -1}},
            {"$skip": skip},
            {"$limit": limit}
        ]
        
        results = list(db.user_badges.aggregate(pipeline))
        
        # Enrich with user info
        leaderboard = []
        for i, r in enumerate(results, start=skip + 1):
            user = db.users.find_one(
                {"user_id": r["_id"]},
                {"_id": 0, "name": 1, "picture": 1}
            )
            if user:
                leaderboard.append({
                    "rank": i,
                    "user_id": r["_id"],
                    "name": user.get("name", "Unknown"),
                    "picture": user.get("picture"),
                    "badge_count": r["badge_count"],
                    "total_points": r["total_points"]
                })
        
        total = len(list(db.user_badges.aggregate([
            {"$group": {"_id": "$user_id"}}
        ])))
        
        return {
            "leaderboard": leaderboard,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }

    @router.get("/leaderboard/my-rank")
    async def get_my_rank(current_user: dict = Depends(get_current_user)):
        """Get current user's rank on the leaderboard."""
        user_id = current_user["user_id"]
        
        # Get all users' points
        pipeline = [
            {"$group": {
                "_id": "$user_id",
                "total_points": {"$sum": "$points_value"}
            }},
            {"$sort": {"total_points": -1}}
        ]
        
        all_users = list(db.user_badges.aggregate(pipeline))
        
        rank = None
        user_points = 0
        for i, u in enumerate(all_users, start=1):
            if u["_id"] == user_id:
                rank = i
                user_points = u["total_points"]
                break
        
        badge_count = db.user_badges.count_documents({"user_id": user_id})
        
        return {
            "rank": rank,
            "total_points": user_points,
            "badge_count": badge_count,
            "total_users": len(all_users)
        }

    return router
