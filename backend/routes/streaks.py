"""
Streaks Routes Module
Handles challenge completion streaks and streak leaderboard
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


def create_streaks_router(db, get_current_user):
    """
    Factory function to create streaks router with dependencies.
    
    Args:
        db: MongoDB database instance
        get_current_user: Dependency function for authentication
    
    Returns:
        APIRouter instance with streak routes
    """
    router = APIRouter(prefix="/streaks", tags=["streaks"])

    @router.get("/my-streak")
    async def get_my_streak(current_user: dict = Depends(get_current_user)):
        """Get current user's challenge completion streak."""
        user_id = current_user["user_id"]
        
        streak = db.user_challenge_streaks.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
        
        if not streak:
            return {
                "current_streak": 0,
                "longest_streak": 0,
                "total_completions": 0,
                "streak_bonus_points": 0,
                "last_completion": None
            }
        
        return {
            "current_streak": streak.get("current_streak", 0),
            "longest_streak": streak.get("longest_streak", 0),
            "total_completions": streak.get("total_completions", 0),
            "streak_bonus_points": streak.get("streak_bonus_points", 0),
            "last_completion": streak.get("last_completion")
        }

    @router.get("/leaderboard")
    async def get_streak_leaderboard(
        page: int = Query(default=1, ge=1),
        limit: int = Query(default=20, le=50)
    ):
        """Get public streak leaderboard."""
        skip = (page - 1) * limit
        
        # Get all streaks sorted by current streak
        streaks = list(db.user_challenge_streaks.find(
            {"current_streak": {"$gt": 0}},
            {"_id": 0}
        ).sort([
            ("current_streak", -1),
            ("total_completions", -1),
            ("streak_bonus_points", -1)
        ]).skip(skip).limit(limit))
        
        # Enrich with user info
        leaderboard = []
        for i, s in enumerate(streaks, start=skip + 1):
            user = db.users.find_one(
                {"user_id": s["user_id"]},
                {"_id": 0, "name": 1, "picture": 1}
            )
            if user:
                leaderboard.append({
                    "rank": i,
                    "user_id": s["user_id"],
                    "user_name": user.get("name", "Unknown"),
                    "picture": user.get("picture"),
                    "current_streak": s.get("current_streak", 0),
                    "longest_streak": s.get("longest_streak", 0),
                    "total_completions": s.get("total_completions", 0),
                    "streak_bonus_points": s.get("streak_bonus_points", 0),
                    "last_completion": s.get("last_completion")
                })
        
        total = db.user_challenge_streaks.count_documents({"current_streak": {"$gt": 0}})
        
        return {
            "leaderboard": leaderboard,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit if total > 0 else 0
            }
        }

    return router
