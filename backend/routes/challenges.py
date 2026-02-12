"""
Challenges Routes Module
Handles badge challenges, joining, progress tracking
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)


# Challenge definitions
WEEKLY_CHALLENGES = [
    {"id": "weekend_warrior", "name": "Weekend Warrior", "description": "List 5 items during the weekend (Saturday-Sunday)", "target": 5, "type": "weekly", "icon": "flash", "color": "#F97316", "criteria_type": "listings"},
    {"id": "weekly_sales_star", "name": "Weekly Sales Star", "description": "Sell 3 items this week", "target": 3, "type": "weekly", "icon": "star", "color": "#F59E0B", "criteria_type": "sales"},
]

MONTHLY_CHALLENGES = [
    {"id": "listing_sprint", "name": "Listing Sprint", "description": "Create 10 listings this month", "target": 10, "type": "monthly", "icon": "rocket", "color": "#8B5CF6", "criteria_type": "listings"},
    {"id": "master_seller", "name": "Master Seller", "description": "Sell 10 items this month", "target": 10, "type": "monthly", "icon": "trophy", "color": "#EC4899", "criteria_type": "sales"},
]

SEASONAL_CHALLENGES = [
    {"id": "valentines_special", "name": "Valentine's Special", "description": "Sell 5 items in Fashion & Beauty or Home & Furniture categories", "target": 5, "type": "seasonal", "icon": "heart", "color": "#EC4899", "criteria_type": "category_sales", "categories": ["fashion_beauty", "home_furniture"]},
]


def create_challenges_router(db, get_current_user):
    """
    Factory function to create challenges router with dependencies.
    
    Args:
        db: MongoDB database instance
        get_current_user: Dependency function for authentication
    
    Returns:
        APIRouter instance with challenge routes
    """
    router = APIRouter(prefix="/challenges", tags=["challenges"])

    def get_challenge_period(challenge_type: str):
        """Get the current period for a challenge type."""
        now = datetime.now(timezone.utc)
        if challenge_type == "weekly":
            # Start of current week (Monday)
            start = now - timedelta(days=now.weekday())
            start = start.replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=7)
        elif challenge_type == "monthly":
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if now.month == 12:
                end = now.replace(year=now.year + 1, month=1, day=1)
            else:
                end = now.replace(month=now.month + 1, day=1)
        else:
            # Seasonal - custom dates
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end = now + timedelta(days=30)
        return start, end

    def get_period_key(challenge_type: str):
        """Get a unique key for the current period."""
        now = datetime.now(timezone.utc)
        if challenge_type == "weekly":
            return f"{now.year}-W{now.isocalendar()[1]}"
        elif challenge_type == "monthly":
            return f"{now.year}-M{now.month}"
        else:
            return f"seasonal-{now.year}"

    @router.get("")
    async def get_challenges(current_user: Optional[dict] = Depends(get_current_user)):
        """Get all active challenges with user progress."""
        now = datetime.now(timezone.utc)
        user_id = current_user["user_id"] if current_user else None
        
        challenges = []
        
        # Add weekly challenges
        for c in WEEKLY_CHALLENGES:
            start, end = get_challenge_period("weekly")
            challenge = {
                **c,
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "period": get_period_key("weekly"),
                "progress": 0,
                "joined": False,
                "completed": False,
            }
            
            if user_id:
                progress = await db.user_challenge_progress.find_one({
                    "user_id": user_id,
                    "challenge_id": c["id"],
                    "period": challenge["period"]
                })
                if progress:
                    challenge["progress"] = progress.get("progress", 0)
                    challenge["joined"] = True
                    challenge["completed"] = progress.get("completed", False)
            
            challenges.append(challenge)
        
        # Add monthly challenges
        for c in MONTHLY_CHALLENGES:
            start, end = get_challenge_period("monthly")
            challenge = {
                **c,
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "period": get_period_key("monthly"),
                "progress": 0,
                "joined": False,
                "completed": False,
            }
            
            if user_id:
                progress = await db.user_challenge_progress.find_one({
                    "user_id": user_id,
                    "challenge_id": c["id"],
                    "period": challenge["period"]
                })
                if progress:
                    challenge["progress"] = progress.get("progress", 0)
                    challenge["joined"] = True
                    challenge["completed"] = progress.get("completed", False)
            
            challenges.append(challenge)
        
        # Add seasonal challenges (Valentine's is active Feb 1-14)
        if now.month == 2 and now.day <= 14:
            for c in SEASONAL_CHALLENGES:
                start = datetime(now.year, 2, 1, tzinfo=timezone.utc)
                end = datetime(now.year, 2, 14, 23, 59, 59, tzinfo=timezone.utc)
                challenge = {
                    **c,
                    "start_date": start.isoformat(),
                    "end_date": end.isoformat(),
                    "period": f"valentines-{now.year}",
                    "progress": 0,
                    "joined": False,
                    "completed": False,
                }
                
                if user_id:
                    progress = await db.user_challenge_progress.find_one({
                        "user_id": user_id,
                        "challenge_id": c["id"],
                        "period": challenge["period"]
                    })
                    if progress:
                        challenge["progress"] = progress.get("progress", 0)
                        challenge["joined"] = True
                        challenge["completed"] = progress.get("completed", False)
                
                challenges.append(challenge)
        
        # Add custom challenges from database
        custom_cursor = db.challenges.find(
            {"is_active": True, "end_date": {"$gte": now}},
            {"_id": 0}
        )
        custom_challenges = await custom_cursor.to_list(length=50)
        
        for c in custom_challenges:
            challenge = {
                **c,
                "id": str(c.get("id", c.get("_id", ""))),
                "progress": 0,
                "joined": False,
                "completed": False,
            }
            
            if user_id:
                progress = await db.user_challenge_progress.find_one({
                    "user_id": user_id,
                    "challenge_id": challenge["id"]
                })
                if progress:
                    challenge["progress"] = progress.get("progress", 0)
                    challenge["joined"] = True
                    challenge["completed"] = progress.get("completed", False)
            
            challenges.append(challenge)
        
        return {"challenges": challenges}

    @router.post("/{challenge_id}/join")
    async def join_challenge(
        challenge_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Join a challenge."""
        user_id = current_user["user_id"]
        
        # Find challenge definition
        all_challenges = WEEKLY_CHALLENGES + MONTHLY_CHALLENGES + SEASONAL_CHALLENGES
        challenge = next((c for c in all_challenges if c["id"] == challenge_id), None)
        
        if not challenge:
            # Check custom challenges
            challenge = await db.challenges.find_one({"id": challenge_id}, {"_id": 0})
            if not challenge:
                raise HTTPException(status_code=404, detail="Challenge not found")
        
        period = get_period_key(challenge.get("type", "custom"))
        
        # Check if already joined
        existing = await db.user_challenge_progress.find_one({
            "user_id": user_id,
            "challenge_id": challenge_id,
            "period": period
        })
        
        if existing:
            return {"success": True, "message": "Already joined", "progress": existing.get("progress", 0)}
        
        # Join the challenge
        await db.user_challenge_progress.insert_one({
            "user_id": user_id,
            "challenge_id": challenge_id,
            "period": period,
            "progress": 0,
            "completed": False,
            "joined_at": datetime.now(timezone.utc)
        })
        
        return {"success": True, "message": "Joined challenge", "progress": 0}

    @router.get("/my-progress")
    async def get_my_challenge_progress(current_user: dict = Depends(get_current_user)):
        """Get user's progress on all joined challenges."""
        user_id = current_user["user_id"]
        
        cursor = db.user_challenge_progress.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("joined_at", -1).limit(20)
        progress = await cursor.to_list(length=20)
        
        return {"progress": progress}

    @router.get("/{challenge_id}")
    async def get_challenge_details(
        challenge_id: str,
        current_user: Optional[dict] = Depends(get_current_user)
    ):
        """Get details for a specific challenge."""
        all_challenges = WEEKLY_CHALLENGES + MONTHLY_CHALLENGES + SEASONAL_CHALLENGES
        challenge = next((c for c in all_challenges if c["id"] == challenge_id), None)
        
        if not challenge:
            challenge = await db.challenges.find_one({"id": challenge_id}, {"_id": 0})
            if not challenge:
                raise HTTPException(status_code=404, detail="Challenge not found")
        
        # Get leaderboard for this challenge
        leaderboard_cursor = db.user_challenge_progress.find(
            {"challenge_id": challenge_id, "completed": True}
        ).sort("completed_at", 1).limit(10)
        leaderboard = await leaderboard_cursor.to_list(length=10)
        
        # Enrich with user names
        for entry in leaderboard:
            user = await db.users.find_one({"user_id": entry["user_id"]}, {"_id": 0, "name": 1})
            entry["user_name"] = user.get("name", "Unknown") if user else "Unknown"
            # Remove _id if present
            entry.pop("_id", None)
        
        participants = await db.user_challenge_progress.count_documents({"challenge_id": challenge_id})
        
        return {
            "challenge": challenge,
            "leaderboard": leaderboard,
            "participants": participants
        }

    return router
