"""
Badge Challenges Routes Module
Handles badge challenges, seasonal events, challenge joining, progress tracking, and streak management.
Extracted from server.py for better code organization.
"""

from fastapi import APIRouter, HTTPException, Request, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ChallengeType(str, Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    SPECIAL = "special"
    SEASONAL = "seasonal"


class ChallengeCriteria(str, Enum):
    LISTINGS_CREATED = "listings_created"
    ITEMS_SOLD = "items_sold"
    TOTAL_SALES_VALUE = "total_sales_value"
    MESSAGES_SENT = "messages_sent"
    PROFILE_VIEWS = "profile_views"
    FIVE_STAR_REVIEWS = "five_star_reviews"
    CATEGORY_LISTINGS = "category_listings"
    CATEGORY_SALES = "category_sales"


# Seasonal challenge configurations with date ranges
SEASONAL_CHALLENGES = [
    {
        "id": "valentines_special",
        "name": "Valentine's Special",
        "description": "Sell 5 items in Fashion & Beauty or Home & Furniture categories",
        "type": ChallengeType.SEASONAL,
        "criteria": ChallengeCriteria.CATEGORY_SALES,
        "target": 5,
        "categories": ["fashion_beauty", "home_furniture"],
        "start_month": 2, "start_day": 1,
        "end_month": 2, "end_day": 14,
        "badge_reward": {
            "name": "Valentine's Champion",
            "description": "Spread the love with 5+ gift sales",
            "icon": "heart",
            "color": "#EC4899",
            "points_value": 50,
        },
        "icon": "heart",
        "color": "#EC4899",
        "theme": "valentine",
    },
    {
        "id": "spring_refresh",
        "name": "Spring Refresh Sale",
        "description": "List 15 items in Home & Furniture or Fashion categories",
        "type": ChallengeType.SEASONAL,
        "criteria": ChallengeCriteria.CATEGORY_LISTINGS,
        "target": 15,
        "categories": ["home_furniture", "fashion_beauty"],
        "start_month": 3, "start_day": 20,
        "end_month": 4, "end_day": 20,
        "badge_reward": {
            "name": "Spring Refresh Pro",
            "description": "Helped buyers refresh their style for spring",
            "icon": "flower",
            "color": "#10B981",
            "points_value": 60,
        },
        "icon": "flower",
        "color": "#10B981",
        "theme": "spring",
    },
    {
        "id": "summer_deals",
        "name": "Summer Deals Festival",
        "description": "Achieve €300 in total sales during summer",
        "type": ChallengeType.SEASONAL,
        "criteria": ChallengeCriteria.TOTAL_SALES_VALUE,
        "target": 300,
        "start_month": 6, "start_day": 21,
        "end_month": 7, "end_day": 31,
        "badge_reward": {
            "name": "Summer Sales Star",
            "description": "Made €300+ in summer sales",
            "icon": "sunny",
            "color": "#F59E0B",
            "points_value": 80,
        },
        "icon": "sunny",
        "color": "#F59E0B",
        "theme": "summer",
    },
    {
        "id": "back_to_school",
        "name": "Back to School",
        "description": "Sell 8 items in Electronics or Books & Media categories",
        "type": ChallengeType.SEASONAL,
        "criteria": ChallengeCriteria.CATEGORY_SALES,
        "target": 8,
        "categories": ["electronics", "phones_tablets", "books_media"],
        "start_month": 8, "start_day": 15,
        "end_month": 9, "end_day": 15,
        "badge_reward": {
            "name": "Back to School Hero",
            "description": "Helped students gear up for school",
            "icon": "school",
            "color": "#3B82F6",
            "points_value": 70,
        },
        "icon": "school",
        "color": "#3B82F6",
        "theme": "school",
    },
    {
        "id": "halloween_spooktacular",
        "name": "Halloween Spooktacular",
        "description": "List 10 items during the Halloween season",
        "type": ChallengeType.SEASONAL,
        "criteria": ChallengeCriteria.LISTINGS_CREATED,
        "target": 10,
        "start_month": 10, "start_day": 15,
        "end_month": 10, "end_day": 31,
        "badge_reward": {
            "name": "Spooky Seller",
            "description": "Haunted the marketplace with 10+ listings",
            "icon": "moon",
            "color": "#7C3AED",
            "points_value": 45,
        },
        "icon": "moon",
        "color": "#7C3AED",
        "theme": "halloween",
    },
    {
        "id": "black_friday_blitz",
        "name": "Black Friday Blitz",
        "description": "Sell 10 items during Black Friday week",
        "type": ChallengeType.SEASONAL,
        "criteria": ChallengeCriteria.ITEMS_SOLD,
        "target": 10,
        "start_month": 11, "start_day": 20,
        "end_month": 11, "end_day": 30,
        "badge_reward": {
            "name": "Black Friday Champion",
            "description": "Dominated Black Friday with 10+ sales",
            "icon": "flash",
            "color": "#1F2937",
            "points_value": 100,
        },
        "icon": "flash",
        "color": "#1F2937",
        "theme": "blackfriday",
    },
    {
        "id": "holiday_gift_giver",
        "name": "Holiday Gift Giver",
        "description": "Achieve €500 in sales during the holiday season",
        "type": ChallengeType.SEASONAL,
        "criteria": ChallengeCriteria.TOTAL_SALES_VALUE,
        "target": 500,
        "start_month": 12, "start_day": 1,
        "end_month": 12, "end_day": 25,
        "badge_reward": {
            "name": "Holiday Hero",
            "description": "Spread holiday joy with €500+ in sales",
            "icon": "gift",
            "color": "#DC2626",
            "points_value": 120,
        },
        "icon": "gift",
        "color": "#DC2626",
        "theme": "holiday",
    },
    {
        "id": "new_year_fresh_start",
        "name": "New Year Fresh Start",
        "description": "List 20 new items in the first two weeks of the year",
        "type": ChallengeType.SEASONAL,
        "criteria": ChallengeCriteria.LISTINGS_CREATED,
        "target": 20,
        "start_month": 1, "start_day": 1,
        "end_month": 1, "end_day": 15,
        "badge_reward": {
            "name": "New Year Achiever",
            "description": "Started the year strong with 20+ listings",
            "icon": "sparkles",
            "color": "#8B5CF6",
            "points_value": 75,
        },
        "icon": "sparkles",
        "color": "#8B5CF6",
        "theme": "newyear",
    },
]

# Define available challenges
CHALLENGE_DEFINITIONS = [
    # Weekly Challenges
    {
        "id": "weekend_warrior",
        "name": "Weekend Warrior",
        "description": "List 5 items during the weekend (Saturday-Sunday)",
        "type": ChallengeType.WEEKLY,
        "criteria": ChallengeCriteria.LISTINGS_CREATED,
        "target": 5,
        "weekend_only": True,
        "badge_reward": {
            "name": "Weekend Warrior",
            "description": "Listed 5+ items in a single weekend",
            "icon": "flash",
            "color": "#F59E0B",
            "points_value": 25,
        },
        "icon": "flash",
        "color": "#F59E0B",
    },
    {
        "id": "weekly_seller",
        "name": "Weekly Sales Star",
        "description": "Sell 3 items this week",
        "type": ChallengeType.WEEKLY,
        "criteria": ChallengeCriteria.ITEMS_SOLD,
        "target": 3,
        "badge_reward": {
            "name": "Weekly Sales Star",
            "description": "Sold 3+ items in a single week",
            "icon": "star",
            "color": "#EF4444",
            "points_value": 30,
        },
        "icon": "star",
        "color": "#EF4444",
    },
    {
        "id": "listing_sprint",
        "name": "Listing Sprint",
        "description": "Create 10 listings this week",
        "type": ChallengeType.WEEKLY,
        "criteria": ChallengeCriteria.LISTINGS_CREATED,
        "target": 10,
        "badge_reward": {
            "name": "Listing Sprint Champion",
            "description": "Created 10+ listings in a single week",
            "icon": "rocket",
            "color": "#8B5CF6",
            "points_value": 35,
        },
        "icon": "rocket",
        "color": "#8B5CF6",
    },
    # Monthly Challenges
    {
        "id": "monthly_top_seller",
        "name": "Monthly Top Seller",
        "description": "Sell 15 items this month",
        "type": ChallengeType.MONTHLY,
        "criteria": ChallengeCriteria.ITEMS_SOLD,
        "target": 15,
        "badge_reward": {
            "name": "Monthly Top Seller",
            "description": "Achieved top seller status for the month",
            "icon": "trophy",
            "color": "#FFD700",
            "points_value": 100,
        },
        "icon": "trophy",
        "color": "#FFD700",
    },
    {
        "id": "inventory_king",
        "name": "Inventory King",
        "description": "List 30 items this month",
        "type": ChallengeType.MONTHLY,
        "criteria": ChallengeCriteria.LISTINGS_CREATED,
        "target": 30,
        "badge_reward": {
            "name": "Inventory King",
            "description": "Listed 30+ items in a single month",
            "icon": "layers",
            "color": "#10B981",
            "points_value": 75,
        },
        "icon": "layers",
        "color": "#10B981",
    },
    {
        "id": "high_value_month",
        "name": "High Roller Month",
        "description": "Achieve €500 in total sales this month",
        "type": ChallengeType.MONTHLY,
        "criteria": ChallengeCriteria.TOTAL_SALES_VALUE,
        "target": 500,
        "badge_reward": {
            "name": "High Roller",
            "description": "Achieved €500+ in sales in a single month",
            "icon": "cash",
            "color": "#059669",
            "points_value": 150,
        },
        "icon": "cash",
        "color": "#059669",
    },
    {
        "id": "community_connector",
        "name": "Community Connector",
        "description": "Send 50 messages to buyers this month",
        "type": ChallengeType.MONTHLY,
        "criteria": ChallengeCriteria.MESSAGES_SENT,
        "target": 50,
        "badge_reward": {
            "name": "Community Connector",
            "description": "Engaged with 50+ buyer messages in a month",
            "icon": "chatbubbles",
            "color": "#3B82F6",
            "points_value": 50,
        },
        "icon": "chatbubbles",
        "color": "#3B82F6",
    },
]


def create_badge_challenges_router(db, require_auth, send_push_notification=None):
    """
    Factory function to create badge challenges router with dependencies.
    
    Args:
        db: MongoDB database instance
        require_auth: Dependency function for authentication
        send_push_notification: Optional function for sending push notifications
    
    Returns:
        APIRouter instance with badge challenge routes
    """
    router = APIRouter(tags=["badge-challenges"])
    
    # Helper functions
    def get_challenge_period(challenge_type: ChallengeType, challenge_def: dict = None) -> tuple:
        """Get the start and end dates for the current challenge period"""
        now = datetime.now(timezone.utc)
        
        if challenge_type == ChallengeType.WEEKLY:
            start = now - timedelta(days=now.weekday())
            start = start.replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=7)
        elif challenge_type == ChallengeType.MONTHLY:
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if now.month == 12:
                end = now.replace(year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            else:
                end = now.replace(month=now.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)
        elif challenge_type == ChallengeType.SEASONAL and challenge_def:
            start, end = get_seasonal_challenge_period(challenge_def)
        else:
            start = now - timedelta(days=now.weekday())
            start = start.replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=7)
        
        return start, end

    def get_seasonal_challenge_period(challenge_def: dict) -> tuple:
        """Get the start and end dates for a seasonal challenge"""
        now = datetime.now(timezone.utc)
        current_year = now.year
        
        start_month = challenge_def.get("start_month", 1)
        start_day = challenge_def.get("start_day", 1)
        end_month = challenge_def.get("end_month", 12)
        end_day = challenge_def.get("end_day", 31)
        
        try:
            start = datetime(current_year, start_month, start_day, 0, 0, 0, tzinfo=timezone.utc)
            end = datetime(current_year, end_month, end_day, 23, 59, 59, tzinfo=timezone.utc)
            
            if end < start:
                if now.month >= start_month:
                    end = datetime(current_year + 1, end_month, end_day, 23, 59, 59, tzinfo=timezone.utc)
                else:
                    start = datetime(current_year - 1, start_month, start_day, 0, 0, 0, tzinfo=timezone.utc)
        except ValueError:
            start = now
            end = now + timedelta(days=7)
        
        return start, end

    def is_seasonal_challenge_active(challenge_def: dict) -> bool:
        """Check if a seasonal challenge is currently active"""
        now = datetime.now(timezone.utc)
        start, end = get_seasonal_challenge_period(challenge_def)
        return start <= now <= end

    def get_active_seasonal_challenges() -> list:
        """Get list of currently active seasonal challenges"""
        return [c for c in SEASONAL_CHALLENGES if is_seasonal_challenge_active(c)]

    def get_weekend_period() -> tuple:
        """Get the start and end dates for the current weekend"""
        now = datetime.now(timezone.utc)
        days_until_saturday = (5 - now.weekday()) % 7
        
        if now.weekday() in [5, 6]:
            if now.weekday() == 6:
                start = now - timedelta(days=1)
            else:
                start = now
        else:
            start = now + timedelta(days=days_until_saturday)
        
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=2)
        
        return start, end

    async def get_user_challenge_progress(user_id: str, challenge: dict, start_date: datetime, end_date: datetime) -> int:
        """Calculate user's progress for a specific challenge"""
        criteria = challenge.get("criteria")
        
        if challenge.get("weekend_only"):
            start_date, end_date = get_weekend_period()
        
        categories = challenge.get("categories", [])
        
        if criteria == ChallengeCriteria.LISTINGS_CREATED:
            count = await db.listings.count_documents({
                "seller_id": user_id,
                "created_at": {"$gte": start_date, "$lt": end_date}
            })
            return count
        
        elif criteria == ChallengeCriteria.ITEMS_SOLD:
            count = await db.listings.count_documents({
                "seller_id": user_id,
                "status": "sold",
                "sold_at": {"$gte": start_date, "$lt": end_date}
            })
            return count
        
        elif criteria == ChallengeCriteria.TOTAL_SALES_VALUE:
            pipeline = [
                {
                    "$match": {
                        "seller_id": user_id,
                        "status": "sold",
                        "sold_at": {"$gte": start_date, "$lt": end_date}
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "total": {"$sum": "$price"}
                    }
                }
            ]
            result = await db.listings.aggregate(pipeline).to_list(1)
            return int(result[0]["total"]) if result else 0
        
        elif criteria == ChallengeCriteria.MESSAGES_SENT:
            count = await db.messages.count_documents({
                "sender_id": user_id,
                "created_at": {"$gte": start_date, "$lt": end_date}
            })
            return count
        
        elif criteria == ChallengeCriteria.CATEGORY_LISTINGS:
            query = {
                "seller_id": user_id,
                "created_at": {"$gte": start_date, "$lt": end_date}
            }
            if categories:
                query["category"] = {"$in": categories}
            count = await db.listings.count_documents(query)
            return count
        
        elif criteria == ChallengeCriteria.CATEGORY_SALES:
            query = {
                "seller_id": user_id,
                "status": "sold",
                "sold_at": {"$gte": start_date, "$lt": end_date}
            }
            if categories:
                query["category"] = {"$in": categories}
            count = await db.listings.count_documents(query)
            return count
        
        return 0

    async def check_and_award_challenge_badges(user_id: str) -> List[Dict[str, Any]]:
        """Check if user completed any challenges and award badges"""
        now = datetime.now(timezone.utc)
        awarded_badges = []
        
        for challenge_def in CHALLENGE_DEFINITIONS:
            challenge_type = challenge_def["type"]
            start_date, end_date = get_challenge_period(challenge_type)
            
            existing_completion = await db.challenge_completions.find_one({
                "user_id": user_id,
                "challenge_id": challenge_def["id"],
                "period_start": start_date
            })
            
            if existing_completion:
                continue
            
            progress = await get_user_challenge_progress(
                user_id, challenge_def, start_date, end_date
            )
            
            await db.challenge_participants.update_one(
                {
                    "user_id": user_id,
                    "challenge_id": challenge_def["id"],
                    "period_start": start_date
                },
                {"$set": {"progress": progress, "updated_at": now}},
                upsert=False
            )
            
            if progress >= challenge_def["target"]:
                badge_reward = challenge_def["badge_reward"]
                badge_id = f"challenge_{challenge_def['id']}_{start_date.strftime('%Y%m%d')}"
                
                existing_badge = await db.badges.find_one({"id": badge_id})
                if not existing_badge:
                    await db.badges.insert_one({
                        "id": badge_id,
                        "name": badge_reward["name"],
                        "description": badge_reward["description"],
                        "icon": badge_reward["icon"],
                        "color": badge_reward["color"],
                        "points_value": badge_reward["points_value"],
                        "category": "challenge",
                        "challenge_id": challenge_def["id"],
                        "period_start": start_date,
                        "is_limited": True,
                        "created_at": now,
                    })
                
                existing_user_badge = await db.user_badges.find_one({
                    "user_id": user_id,
                    "badge_id": badge_id
                })
                
                if not existing_user_badge:
                    await db.user_badges.insert_one({
                        "user_id": user_id,
                        "badge_id": badge_id,
                        "earned_at": now,
                        "is_viewed": False,
                        "source": "challenge",
                        "challenge_id": challenge_def["id"],
                    })
                    
                    await db.challenge_completions.insert_one({
                        "user_id": user_id,
                        "challenge_id": challenge_def["id"],
                        "period_start": start_date,
                        "period_end": end_date,
                        "badge_id": badge_id,
                        "completed_at": now,
                        "progress": progress,
                    })
                    
                    awarded_badges.append({
                        "badge_id": badge_id,
                        "name": badge_reward["name"],
                        "description": badge_reward["description"],
                        "icon": badge_reward["icon"],
                        "color": badge_reward["color"],
                        "points_value": badge_reward["points_value"],
                        "challenge_name": challenge_def["name"],
                    })
                    
                    if send_push_notification:
                        user = await db.users.find_one({"user_id": user_id})
                        if user and user.get("push_token"):
                            await send_push_notification(
                                push_token=user["push_token"],
                                title=f"🏆 Challenge Complete: {challenge_def['name']}!",
                                body=f"You've earned the {badge_reward['name']} badge!",
                                data={"type": "challenge_complete", "challenge_id": challenge_def["id"]},
                                notification_type="challenge"
                            )
                    
                    await update_challenge_streak(user_id)
        
        return awarded_badges

    async def update_challenge_streak(user_id: str):
        """Update user's challenge completion streak"""
        now = datetime.now(timezone.utc)
        
        streak = await db.user_streaks.find_one({"user_id": user_id})
        
        if not streak:
            await db.user_streaks.insert_one({
                "user_id": user_id,
                "current_streak": 1,
                "longest_streak": 1,
                "last_completion": now,
                "total_completions": 1,
                "streak_bonus_points": 0,
                "created_at": now,
                "updated_at": now,
            })
            return
        
        last_completion = streak.get("last_completion")
        days_since_last = (now - last_completion).days if last_completion else 999
        
        if days_since_last <= 7:
            new_streak = streak.get("current_streak", 0) + 1
            longest = max(new_streak, streak.get("longest_streak", 0))
            streak_bonus = min(new_streak * 10, 100)
            
            await db.user_streaks.update_one(
                {"user_id": user_id},
                {"$set": {
                    "current_streak": new_streak,
                    "longest_streak": longest,
                    "last_completion": now,
                    "streak_bonus_points": streak_bonus,
                    "updated_at": now,
                }, "$inc": {"total_completions": 1}}
            )
            
            await check_and_award_streak_badges(user_id, new_streak)
        else:
            await db.user_streaks.update_one(
                {"user_id": user_id},
                {"$set": {
                    "current_streak": 1,
                    "last_completion": now,
                    "streak_bonus_points": 10,
                    "updated_at": now,
                }, "$inc": {"total_completions": 1}}
            )

    async def check_and_award_streak_badges(user_id: str, streak_count: int):
        """Award badges for reaching streak milestones"""
        now = datetime.now(timezone.utc)
        
        streak_badges = [
            {"threshold": 3, "id": "streak_3", "name": "Hot Streak", "description": "Completed 3 challenges in a row!", "icon": "flame", "color": "#F97316", "points": 25},
            {"threshold": 5, "id": "streak_5", "name": "On Fire", "description": "Completed 5 challenges in a row!", "icon": "bonfire", "color": "#EF4444", "points": 50},
            {"threshold": 10, "id": "streak_10", "name": "Unstoppable", "description": "Completed 10 challenges in a row!", "icon": "rocket", "color": "#8B5CF6", "points": 100},
        ]
        
        for badge_def in streak_badges:
            if streak_count >= badge_def["threshold"]:
                badge_id = f"streak_{badge_def['id']}"
                
                existing = await db.user_badges.find_one({
                    "user_id": user_id,
                    "badge_id": badge_id
                })
                
                if not existing:
                    await db.badges.update_one(
                        {"id": badge_id},
                        {"$setOnInsert": {
                            "id": badge_id,
                            "name": badge_def["name"],
                            "description": badge_def["description"],
                            "icon": badge_def["icon"],
                            "color": badge_def["color"],
                            "points_value": badge_def["points"],
                            "category": "streak",
                            "created_at": now,
                        }},
                        upsert=True
                    )
                    
                    await db.user_badges.insert_one({
                        "user_id": user_id,
                        "badge_id": badge_id,
                        "earned_at": now,
                        "is_viewed": False,
                        "source": "streak",
                    })
                    
                    if send_push_notification:
                        user = await db.users.find_one({"user_id": user_id})
                        if user and user.get("push_token"):
                            await send_push_notification(
                                push_token=user["push_token"],
                                title=f"🔥 {badge_def['name']}!",
                                body=badge_def["description"],
                                data={"type": "streak_badge", "badge_id": badge_id},
                                notification_type="streak"
                            )

    # Routes
    @router.get("/challenges")
    async def get_active_challenges(request: Request):
        """Get all active challenges with user's progress if authenticated"""
        user = None
        try:
            user = await require_auth(request)
        except:
            pass
        
        now = datetime.now(timezone.utc)
        challenges = []
        
        for challenge_def in CHALLENGE_DEFINITIONS:
            challenge_type = challenge_def["type"]
            start_date, end_date = get_challenge_period(challenge_type, challenge_def)
            
            time_remaining = end_date - now
            days_remaining = time_remaining.days
            hours_remaining = time_remaining.seconds // 3600
            
            challenge_data = {
                "id": challenge_def["id"],
                "name": challenge_def["name"],
                "description": challenge_def["description"],
                "type": challenge_type.value,
                "target": challenge_def["target"],
                "icon": challenge_def["icon"],
                "color": challenge_def["color"],
                "badge_reward": challenge_def["badge_reward"],
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days_remaining": max(0, days_remaining),
                "hours_remaining": hours_remaining if days_remaining == 0 else 0,
                "progress": 0,
                "completed": False,
                "joined": False,
            }
            
            if user:
                progress = await get_user_challenge_progress(
                    user.user_id, challenge_def, start_date, end_date
                )
                challenge_data["progress"] = progress
                challenge_data["completed"] = progress >= challenge_def["target"]
                
                participation = await db.challenge_participants.find_one({
                    "user_id": user.user_id,
                    "challenge_id": challenge_def["id"],
                    "period_start": start_date
                })
                challenge_data["joined"] = participation is not None
                
                badge_earned = await db.challenge_completions.find_one({
                    "user_id": user.user_id,
                    "challenge_id": challenge_def["id"],
                    "period_start": start_date
                })
                challenge_data["badge_earned"] = badge_earned is not None
            
            challenges.append(challenge_data)
        
        active_seasonal = get_active_seasonal_challenges()
        for challenge_def in active_seasonal:
            challenge_type = challenge_def["type"]
            start_date, end_date = get_challenge_period(challenge_type, challenge_def)
            
            time_remaining = end_date - now
            days_remaining = time_remaining.days
            hours_remaining = time_remaining.seconds // 3600
            
            challenge_data = {
                "id": challenge_def["id"],
                "name": challenge_def["name"],
                "description": challenge_def["description"],
                "type": "seasonal",
                "target": challenge_def["target"],
                "icon": challenge_def["icon"],
                "color": challenge_def["color"],
                "badge_reward": challenge_def["badge_reward"],
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days_remaining": max(0, days_remaining),
                "hours_remaining": hours_remaining if days_remaining == 0 else 0,
                "progress": 0,
                "completed": False,
                "joined": False,
                "theme": challenge_def.get("theme", "default"),
                "categories": challenge_def.get("categories", []),
            }
            
            if user:
                progress = await get_user_challenge_progress(
                    user.user_id, challenge_def, start_date, end_date
                )
                challenge_data["progress"] = progress
                challenge_data["completed"] = progress >= challenge_def["target"]
                
                participation = await db.challenge_participants.find_one({
                    "user_id": user.user_id,
                    "challenge_id": challenge_def["id"],
                    "period_start": start_date
                })
                challenge_data["joined"] = participation is not None
                
                badge_earned = await db.challenge_completions.find_one({
                    "user_id": user.user_id,
                    "challenge_id": challenge_def["id"],
                    "period_start": start_date
                })
                challenge_data["badge_earned"] = badge_earned is not None
            
            challenges.append(challenge_data)
        
        def sort_key(x):
            type_order = {"seasonal": 0, "weekly": 1, "monthly": 2}
            return (type_order.get(x["type"], 3), -x["progress"])
        
        challenges.sort(key=sort_key)
        
        return {
            "challenges": challenges,
            "total_weekly": len([c for c in challenges if c["type"] == "weekly"]),
            "total_monthly": len([c for c in challenges if c["type"] == "monthly"]),
            "total_seasonal": len([c for c in challenges if c["type"] == "seasonal"]),
        }

    @router.get("/challenges/my-progress")
    async def get_my_challenge_progress(request: Request):
        """Get user's progress on all active challenges"""
        user = await require_auth(request)
        
        challenges_progress = []
        
        for challenge_def in CHALLENGE_DEFINITIONS:
            challenge_type = challenge_def["type"]
            start_date, end_date = get_challenge_period(challenge_type)
            
            progress = await get_user_challenge_progress(
                user.user_id, challenge_def, start_date, end_date
            )
            
            badge_earned = await db.challenge_completions.find_one({
                "user_id": user.user_id,
                "challenge_id": challenge_def["id"],
                "period_start": start_date
            })
            
            challenges_progress.append({
                "challenge_id": challenge_def["id"],
                "name": challenge_def["name"],
                "type": challenge_type.value,
                "progress": progress,
                "target": challenge_def["target"],
                "percentage": min(100, int((progress / challenge_def["target"]) * 100)),
                "completed": progress >= challenge_def["target"],
                "badge_earned": badge_earned is not None,
                "icon": challenge_def["icon"],
                "color": challenge_def["color"],
            })
        
        completed_count = len([c for c in challenges_progress if c["completed"]])
        in_progress_count = len([c for c in challenges_progress if 0 < c["progress"] < c["target"]])
        
        return {
            "challenges": challenges_progress,
            "summary": {
                "total": len(challenges_progress),
                "completed": completed_count,
                "in_progress": in_progress_count,
                "not_started": len(challenges_progress) - completed_count - in_progress_count,
            }
        }

    @router.get("/challenges/{challenge_id}")
    async def get_challenge_details(challenge_id: str, request: Request):
        """Get details for a specific challenge including leaderboard"""
        user = None
        try:
            user = await require_auth(request)
        except:
            pass
        
        challenge_def = next((c for c in CHALLENGE_DEFINITIONS if c["id"] == challenge_id), None)
        if not challenge_def:
            challenge_def = next((c for c in SEASONAL_CHALLENGES if c["id"] == challenge_id), None)
        if not challenge_def:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        challenge_type = challenge_def["type"]
        start_date, end_date = get_challenge_period(challenge_type, challenge_def)
        now = datetime.now(timezone.utc)
        
        participants = await db.challenge_participants.find({
            "challenge_id": challenge_id,
            "period_start": start_date
        }).sort("progress", -1).limit(20).to_list(20)
        
        user_ids = [p["user_id"] for p in participants]
        users = await db.users.find({"user_id": {"$in": user_ids}}).to_list(20)
        users_map = {u["user_id"]: u for u in users}
        
        leaderboard = []
        for i, p in enumerate(participants):
            u = users_map.get(p["user_id"], {})
            leaderboard.append({
                "rank": i + 1,
                "user_id": p["user_id"],
                "user_name": u.get("name", "Anonymous"),
                "avatar_url": u.get("avatar_url"),
                "progress": p["progress"],
                "completed": p["progress"] >= challenge_def["target"],
            })
        
        time_remaining = end_date - now
        
        response = {
            "id": challenge_def["id"],
            "name": challenge_def["name"],
            "description": challenge_def["description"],
            "type": challenge_type.value,
            "target": challenge_def["target"],
            "icon": challenge_def["icon"],
            "color": challenge_def["color"],
            "badge_reward": challenge_def["badge_reward"],
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "days_remaining": max(0, time_remaining.days),
            "hours_remaining": time_remaining.seconds // 3600 if time_remaining.days == 0 else 0,
            "leaderboard": leaderboard,
            "total_participants": len(participants),
        }
        
        if user:
            progress = await get_user_challenge_progress(
                user.user_id, challenge_def, start_date, end_date
            )
            response["my_progress"] = progress
            response["my_completed"] = progress >= challenge_def["target"]
            
            user_rank = next((i + 1 for i, p in enumerate(participants) if p["user_id"] == user.user_id), None)
            response["my_rank"] = user_rank
        
        return response

    @router.post("/challenges/{challenge_id}/join")
    async def join_challenge(challenge_id: str, request: Request):
        """Join a challenge to track progress and appear on leaderboard"""
        user = await require_auth(request)
        
        challenge_def = next((c for c in CHALLENGE_DEFINITIONS if c["id"] == challenge_id), None)
        if not challenge_def:
            challenge_def = next((c for c in SEASONAL_CHALLENGES if c["id"] == challenge_id), None)
        if not challenge_def:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        challenge_type = challenge_def["type"]
        start_date, end_date = get_challenge_period(challenge_type, challenge_def)
        
        existing = await db.challenge_participants.find_one({
            "user_id": user.user_id,
            "challenge_id": challenge_id,
            "period_start": start_date
        })
        
        if existing:
            return {"message": "Already joined this challenge", "joined": True}
        
        progress = await get_user_challenge_progress(
            user.user_id, challenge_def, start_date, end_date
        )
        
        await db.challenge_participants.insert_one({
            "user_id": user.user_id,
            "challenge_id": challenge_id,
            "period_start": start_date,
            "period_end": end_date,
            "progress": progress,
            "joined_at": datetime.now(timezone.utc),
        })
        
        return {
            "message": "Successfully joined challenge",
            "joined": True,
            "progress": progress,
            "target": challenge_def["target"],
        }

    @router.get("/streaks/my-streak")
    async def get_my_streak(request: Request):
        """Get current user's challenge completion streak"""
        user = await require_auth(request)
        
        streak = await db.user_streaks.find_one({"user_id": user.user_id}, {"_id": 0})
        
        if not streak:
            return {
                "current_streak": 0,
                "longest_streak": 0,
                "total_completions": 0,
                "streak_bonus_points": 0,
                "next_streak_badge": {"threshold": 3, "name": "Hot Streak"},
            }
        
        next_badge = None
        streak_thresholds = [3, 5, 10]
        current = streak.get("current_streak", 0)
        for threshold in streak_thresholds:
            if current < threshold:
                next_badge = {"threshold": threshold, "name": ["Hot Streak", "On Fire", "Unstoppable"][streak_thresholds.index(threshold)]}
                break
        
        return {
            "current_streak": streak.get("current_streak", 0),
            "longest_streak": streak.get("longest_streak", 0),
            "total_completions": streak.get("total_completions", 0),
            "streak_bonus_points": streak.get("streak_bonus_points", 0),
            "last_completion": streak.get("last_completion"),
            "next_streak_badge": next_badge,
        }

    @router.get("/badges/past-seasonal")
    async def get_past_seasonal_badges(
        year: int = Query(default=None),
        page: int = Query(default=1, ge=1),
        limit: int = Query(default=20, le=50),
        request: Request = None
    ):
        """Get gallery of past seasonal badges"""
        query = {"category": "challenge", "is_limited": True}
        
        if year:
            start_of_year = datetime(year, 1, 1, tzinfo=timezone.utc)
            end_of_year = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
            query["period_start"] = {"$gte": start_of_year, "$lt": end_of_year}
        
        skip = (page - 1) * limit
        total = await db.badges.count_documents(query)
        
        badges = await db.badges.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        for badge in badges:
            badge_id = badge.get("id")
            earned_count = await db.user_badges.count_documents({"badge_id": badge_id})
            badge["earned_count"] = earned_count
            
            if request:
                try:
                    user = await require_auth(request)
                    user_has = await db.user_badges.find_one({
                        "user_id": user.user_id,
                        "badge_id": badge_id
                    })
                    badge["user_earned"] = user_has is not None
                except:
                    badge["user_earned"] = False
        
        years_pipeline = [
            {"$match": {"category": "challenge", "is_limited": True, "period_start": {"$exists": True}}},
            {"$project": {"year": {"$year": "$period_start"}}},
            {"$group": {"_id": "$year"}},
            {"$sort": {"_id": -1}}
        ]
        years_result = await db.badges.aggregate(years_pipeline).to_list(20)
        available_years = [y["_id"] for y in years_result if y["_id"]]
        
        return {
            "badges": badges,
            "available_years": available_years,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }

    # Expose helper functions for external use
    router.check_and_award_challenge_badges = check_and_award_challenge_badges
    router.update_challenge_streak = update_challenge_streak

    return router
