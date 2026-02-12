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
    async def get_badge_progress(current_user = Depends(get_current_user)):
        """Get user's badge progress across all badge types."""
        user_id = current_user.user_id
        
        # Get user's earned badges
        earned_badges_cursor = db.user_badges.find(
            {"user_id": user_id},
            {"_id": 0}
        )
        earned_badges = await earned_badges_cursor.to_list(length=100)
        earned_badge_ids = {b["badge_id"] for b in earned_badges}
        
        # Get user stats for progress calculation
        listings_count = await db.listings.count_documents({"user_id": user_id, "status": {"$ne": "deleted"}})
        sales_count = await db.listings.count_documents({"user_id": user_id, "status": "sold"})
        
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "verified": 1})
        is_verified = user.get("verified", False) if user else False
        
        reviews_count = await db.reviews.count_documents({"reviewed_user_id": user_id, "rating": {"$gte": 4}})
        
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
        current_user = Depends(get_current_user)
    ):
        """Update user's showcased badges (max 5)."""
        if len(badge_ids) > 5:
            raise HTTPException(status_code=400, detail="Maximum 5 badges can be showcased")
        
        user_id = current_user.user_id
        
        # Verify user owns all badges
        owned_badges_cursor = db.user_badges.find(
            {"user_id": user_id, "badge_id": {"$in": badge_ids}},
            {"badge_id": 1}
        )
        owned_badges = await owned_badges_cursor.to_list(length=len(badge_ids))
        owned_ids = {b["badge_id"] for b in owned_badges}
        
        for badge_id in badge_ids:
            if badge_id not in owned_ids:
                raise HTTPException(status_code=400, detail=f"Badge {badge_id} not owned")
        
        # Clear all showcased
        await db.user_badges.update_many(
            {"user_id": user_id},
            {"$set": {"is_showcased": False}}
        )
        
        # Set new showcased
        if badge_ids:
            await db.user_badges.update_many(
                {"user_id": user_id, "badge_id": {"$in": badge_ids}},
                {"$set": {"is_showcased": True}}
            )
        
        return {"success": True, "showcased_count": len(badge_ids)}

    @router.get("/unviewed-count")
    async def get_unviewed_badge_count(current_user = Depends(get_current_user)):
        """Get count of unviewed badges for notification bell."""
        count = await db.user_badges.count_documents({
            "user_id": current_user.user_id,
            "is_viewed": False
        })
        return {"unviewed_count": count}

    @router.post("/mark-viewed")
    async def mark_badges_viewed(current_user = Depends(get_current_user)):
        """Mark all user badges as viewed."""
        result = await db.user_badges.update_many(
            {"user_id": current_user.user_id, "is_viewed": False},
            {"$set": {"is_viewed": True}}
        )
        return {"success": True, "marked_count": result.modified_count}

    # Define milestone thresholds
    BADGE_MILESTONES = [
        {"count": 1, "name": "First Badge!", "message": "You earned your first badge! You're on your way to becoming a top seller.", "icon": "ribbon"},
        {"count": 5, "name": "Badge Collector", "message": "5 badges earned! You're building an impressive reputation.", "icon": "medal"},
        {"count": 10, "name": "Achievement Hunter", "message": "10 badges! You're a dedicated member of our community.", "icon": "trophy"},
        {"count": 25, "name": "Badge Master", "message": "25 badges! You're among our most accomplished sellers.", "icon": "star"},
        {"count": 50, "name": "Legend Status", "message": "50 badges! You've achieved legendary status!", "icon": "diamond"},
    ]

    # Special badge milestones (triggered by specific badge names)
    SPECIAL_BADGE_MILESTONES = {
        "First Listing": {"name": "First Listing Unlocked!", "message": "You've created your first listing! Your journey as a seller begins.", "icon": "pricetag"},
        "First Sale": {"name": "First Sale Celebration!", "message": "Congratulations on your first sale! You're officially a seller.", "icon": "cash"},
        "Active Seller": {"name": "Active Seller Status!", "message": "You've reached Active Seller status with 5+ sales!", "icon": "trending-up"},
        "Top Seller": {"name": "Top Seller Achieved!", "message": "You're now a Top Seller! Your hard work has paid off.", "icon": "trophy"},
        "Trusted Member": {"name": "Trusted Member!", "message": "You've earned the trust of our community. Thank you!", "icon": "shield-checkmark"},
        "Veteran": {"name": "Veteran Status!", "message": "A year of excellence! You're a veteran member.", "icon": "time"},
    }

    @router.get("/milestones")
    async def get_badge_milestones(current_user = Depends(get_current_user)):
        """Get user's achieved and pending milestones"""
        user_id = current_user.user_id
        
        # Get total badge count
        total_badges = await db.user_badges.count_documents({"user_id": user_id})
        
        # Get user's badges with names
        user_badges = await db.user_badges.find({"user_id": user_id}).to_list(length=100)
        badge_ids = [b["badge_id"] for b in user_badges]
        badges = await db.badges.find({"id": {"$in": badge_ids}}).to_list(length=100)
        badge_names = {b["id"]: b["name"] for b in badges}
        
        # Get acknowledged milestones
        user_milestones = await db.user_milestones.find({"user_id": user_id}).to_list(length=100)
        acknowledged_ids = {m["milestone_id"] for m in user_milestones}
        
        achieved_milestones = []
        pending_milestones = []
        new_milestones = []
        
        # Check count-based milestones
        for milestone in BADGE_MILESTONES:
            milestone_id = f"count_{milestone['count']}"
            milestone_data = {
                "id": milestone_id,
                "type": "count",
                "name": milestone["name"],
                "message": milestone["message"],
                "icon": milestone["icon"],
                "threshold": milestone["count"],
                "achieved": total_badges >= milestone["count"],
                "acknowledged": milestone_id in acknowledged_ids,
            }
            
            if total_badges >= milestone["count"]:
                achieved_milestones.append(milestone_data)
                if milestone_id not in acknowledged_ids:
                    new_milestones.append(milestone_data)
            else:
                pending_milestones.append(milestone_data)
        
        # Check special badge milestones
        for badge_name, milestone in SPECIAL_BADGE_MILESTONES.items():
            milestone_id = f"special_{badge_name.replace(' ', '_').lower()}"
            earned = any(badge_names.get(b["badge_id"]) == badge_name for b in user_badges)
            
            milestone_data = {
                "id": milestone_id,
                "type": "special",
                "badge_name": badge_name,
                "name": milestone["name"],
                "message": milestone["message"],
                "icon": milestone["icon"],
                "achieved": earned,
                "acknowledged": milestone_id in acknowledged_ids,
            }
            
            if earned:
                achieved_milestones.append(milestone_data)
                if milestone_id not in acknowledged_ids:
                    new_milestones.append(milestone_data)
        
        return {
            "total_badges": total_badges,
            "achieved_milestones": achieved_milestones,
            "pending_milestones": pending_milestones,
            "new_milestones": new_milestones,  # Unacknowledged milestones to show
        }

    @router.post("/milestones/acknowledge")
    async def acknowledge_milestone(milestone_id: str, current_user = Depends(get_current_user)):
        """Mark a milestone as acknowledged/seen"""
        user_id = current_user.user_id
        
        if not milestone_id:
            raise HTTPException(status_code=400, detail="milestone_id is required")
        
        # Check if already acknowledged
        existing = await db.user_milestones.find_one({
            "user_id": user_id,
            "milestone_id": milestone_id
        })
        
        if not existing:
            await db.user_milestones.insert_one({
                "user_id": user_id,
                "milestone_id": milestone_id,
                "acknowledged_at": datetime.now(timezone.utc)
            })
        
        return {"message": "Milestone acknowledged", "milestone_id": milestone_id}

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
        
        results = await db.user_badges.aggregate(pipeline).to_list(length=limit)
        
        # Enrich with user info
        leaderboard = []
        for i, r in enumerate(results, start=skip + 1):
            user = await db.users.find_one(
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
        
        count_results = await db.user_badges.aggregate([
            {"$group": {"_id": "$user_id"}}
        ]).to_list(length=10000)
        total = len(count_results)
        
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
    async def get_my_rank(current_user = Depends(get_current_user)):
        """Get current user's rank on the leaderboard."""
        user_id = current_user.user_id
        
        # Get all users' points
        pipeline = [
            {"$group": {
                "_id": "$user_id",
                "total_points": {"$sum": "$points_value"}
            }},
            {"$sort": {"total_points": -1}}
        ]
        
        all_users = await db.user_badges.aggregate(pipeline).to_list(length=10000)
        
        rank = None
        user_points = 0
        for i, u in enumerate(all_users, start=1):
            if u["_id"] == user_id:
                rank = i
                user_points = u["total_points"]
                break
        
        badge_count = await db.user_badges.count_documents({"user_id": user_id})
        
        return {
            "rank": rank,
            "total_points": user_points,
            "badge_count": badge_count,
            "total_users": len(all_users)
        }

    @router.get("/share/{user_id}")
    async def get_shareable_badge_profile(user_id: str):
        """Get a shareable badge profile for a user (public endpoint)."""
        user = await db.users.find_one({"user_id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get user's badges
        user_badges = await db.user_badges.find({"user_id": user_id}).to_list(length=100)
        badge_ids = [b["badge_id"] for b in user_badges]
        badges = await db.badges.find({"id": {"$in": badge_ids}}).to_list(length=100)
        
        # Get showcase badges
        showcase = await db.user_badges.find({
            "user_id": user_id, 
            "is_showcased": True
        }).to_list(length=5)
        showcase_ids = [s["badge_id"] for s in showcase]
        showcase_badges = [b for b in badges if b["id"] in showcase_ids]
        
        # Calculate rank for this user
        pipeline = [
            {"$group": {"_id": "$user_id", "badge_count": {"$sum": 1}}},
            {"$sort": {"badge_count": -1}},
        ]
        all_rankings = await db.user_badges.aggregate(pipeline).to_list(length=1000)
        user_rank = next((i + 1 for i, r in enumerate(all_rankings) if r["_id"] == user_id), None)
        
        # Generate Open Graph meta data
        user_name = user.get("name", "User")
        badge_count = len(badges)
        og_title = f"{user_name}'s Badge Collection on Avida"
        og_description = f"{user_name} has earned {badge_count} badge{'s' if badge_count != 1 else ''} on Avida Marketplace!"
        if user_rank:
            og_description += f" Ranked #{user_rank} in the community."
        
        return {
            "user_id": user_id,
            "user_name": user_name,
            "avatar_url": user.get("avatar_url"),
            "total_badges": badge_count,
            "rank": user_rank,
            "badges": [{
                "name": b["name"],
                "description": b.get("description", ""),
                "icon": b.get("icon", "ribbon"),
                "color": b.get("color", "#4CAF50"),
            } for b in badges[:10]],
            "showcase_badges": [{
                "name": b["name"],
                "description": b.get("description", ""),
                "icon": b.get("icon", "ribbon"),
                "color": b.get("color", "#4CAF50"),
            } for b in showcase_badges],
            # Open Graph meta data for social sharing
            "og_meta": {
                "title": og_title,
                "description": og_description,
                "type": "profile",
                "url": f"https://ui-standardization-3.preview.emergentagent.com/profile/{user_id}/badges",
            }
        }

    return router
