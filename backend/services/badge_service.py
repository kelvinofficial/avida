"""
Automatic Badge Awarding Service
Awards badges to users based on their activity and achievements
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
import uuid

logger = logging.getLogger("badge_service")

# Predefined badge definitions with auto-award criteria
AUTOMATIC_BADGES = [
    {
        "id": "badge_first_sale",
        "name": "First Sale",
        "description": "Completed your first sale on the marketplace",
        "icon": "trophy",
        "color": "#FFD700",
        "type": "achievement",
        "criteria": "complete_first_sale",
        "display_priority": 100,
        "points_value": 50,
    },
    {
        "id": "badge_seller_10",
        "name": "Active Seller",
        "description": "Successfully completed 10 sales",
        "icon": "star",
        "color": "#4CAF50",
        "type": "achievement",
        "criteria": "complete_10_sales",
        "display_priority": 90,
        "points_value": 100,
    },
    {
        "id": "badge_seller_50",
        "name": "Experienced Seller",
        "description": "Successfully completed 50 sales",
        "icon": "medal",
        "color": "#2196F3",
        "type": "achievement",
        "criteria": "complete_50_sales",
        "display_priority": 85,
        "points_value": 250,
    },
    {
        "id": "badge_top_seller",
        "name": "Top Seller",
        "description": "Successfully completed 100+ sales - You're a marketplace champion!",
        "icon": "diamond",
        "color": "#9C27B0",
        "type": "achievement",
        "criteria": "complete_100_sales",
        "display_priority": 80,
        "points_value": 500,
    },
    {
        "id": "badge_trusted_member",
        "name": "Trusted Member",
        "description": "Been an active member for over 1 year",
        "icon": "shield",
        "color": "#00BCD4",
        "type": "trust",
        "criteria": "member_1_year",
        "display_priority": 95,
        "points_value": 200,
    },
    {
        "id": "badge_veteran",
        "name": "Veteran Member",
        "description": "Been an active member for over 2 years",
        "icon": "crown",
        "color": "#FF9800",
        "type": "trust",
        "criteria": "member_2_years",
        "display_priority": 75,
        "points_value": 400,
    },
    {
        "id": "badge_5_star",
        "name": "5-Star Seller",
        "description": "Maintained a 5-star average rating with 10+ reviews",
        "icon": "sparkles",
        "color": "#E91E63",
        "type": "achievement",
        "criteria": "5_star_rating",
        "display_priority": 92,
        "points_value": 300,
    },
    {
        "id": "badge_first_listing",
        "name": "First Listing",
        "description": "Created your first listing on the marketplace",
        "icon": "rocket",
        "color": "#607D8B",
        "type": "achievement",
        "criteria": "create_first_listing",
        "display_priority": 50,
        "points_value": 25,
    },
    {
        "id": "badge_prolific_seller",
        "name": "Prolific Seller",
        "description": "Listed 50+ items on the marketplace",
        "icon": "flame",
        "color": "#FF5722",
        "type": "achievement",
        "criteria": "create_50_listings",
        "display_priority": 70,
        "points_value": 150,
    },
    {
        "id": "badge_verified_seller",
        "name": "Verified Seller",
        "description": "Completed identity verification",
        "icon": "verified",
        "color": "#2E7D32",
        "type": "verification",
        "criteria": "id_verified",
        "display_priority": 98,
        "points_value": 100,
    },
]


class BadgeAwardingService:
    """Service for automatically awarding badges based on user activity"""
    
    def __init__(self, db):
        self.db = db
        self._initialized = False
    
    async def initialize_badges(self):
        """Initialize predefined automatic badges in the database"""
        if self._initialized:
            return
            
        for badge_def in AUTOMATIC_BADGES:
            existing = await self.db.badges.find_one({"id": badge_def["id"]})
            if not existing:
                badge = {
                    **badge_def,
                    "auto_award": True,
                    "is_active": True,
                    "created_at": datetime.now(timezone.utc),
                    "created_by": "system"
                }
                await self.db.badges.insert_one(badge)
                logger.info(f"Created automatic badge: {badge_def['name']}")
        
        self._initialized = True
        logger.info("Badge awarding service initialized")
    
    async def check_and_award_badges(self, user_id: str, trigger: str = "general") -> List[Dict[str, Any]]:
        """
        Check if user qualifies for any badges and award them
        
        Args:
            user_id: The user to check badges for
            trigger: What triggered this check (sale, listing, review, etc.)
            
        Returns:
            List of newly awarded badges
        """
        awarded = []
        
        # Get user data
        user = await self.db.users.find_one({"user_id": user_id})
        if not user:
            return awarded
        
        # Get user's existing badges
        existing_badges = await self.db.user_badges.find({"user_id": user_id}).to_list(length=100)
        existing_badge_ids = {b["badge_id"] for b in existing_badges}
        
        # Get user stats
        stats = await self._get_user_stats(user_id, user)
        
        # Check each automatic badge
        for badge_def in AUTOMATIC_BADGES:
            badge_id = badge_def["id"]
            
            # Skip if already awarded
            if badge_id in existing_badge_ids:
                continue
            
            # Check if user qualifies
            qualifies, reason = await self._check_badge_criteria(badge_def, stats, user)
            
            if qualifies:
                # Award the badge
                awarded_badge = await self._award_badge(user_id, badge_id, reason)
                if awarded_badge:
                    awarded.append(awarded_badge)
                    logger.info(f"Awarded badge '{badge_def['name']}' to user {user_id}")
        
        return awarded
    
    async def _get_user_stats(self, user_id: str, user: dict) -> Dict[str, Any]:
        """Get comprehensive user stats for badge evaluation"""
        
        # Count sold listings across all collections
        sold_listings = await self.db.listings.count_documents({"user_id": user_id, "status": "sold"})
        sold_auto = await self.db.auto_listings.count_documents({"user_id": user_id, "status": "sold"})
        sold_properties = await self.db.properties.count_documents({"user_id": user_id, "status": "sold"})
        total_sales = sold_listings + sold_auto + sold_properties
        
        # Count total listings
        total_listings = await self.db.listings.count_documents({"user_id": user_id})
        total_auto = await self.db.auto_listings.count_documents({"user_id": user_id})
        total_properties = await self.db.properties.count_documents({"user_id": user_id})
        total_listed = total_listings + total_auto + total_properties
        
        # Get reviews stats
        reviews = await self.db.reviews.find({"reviewed_user_id": user_id}).to_list(length=1000)
        review_count = len(reviews)
        avg_rating = sum(r.get("rating", 0) for r in reviews) / review_count if review_count > 0 else 0
        
        # Calculate account age
        created_at = user.get("created_at")
        account_age_days = 0
        if created_at:
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            # Ensure created_at is timezone-aware
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            account_age_days = (datetime.now(timezone.utc) - created_at).days
        
        return {
            "total_sales": total_sales,
            "total_listings": total_listed,
            "review_count": review_count,
            "avg_rating": avg_rating,
            "account_age_days": account_age_days,
            "id_verified": user.get("id_verified", False),
            "email_verified": user.get("email_verified", False),
            "phone_verified": user.get("phone_verified", False),
        }
    
    async def _check_badge_criteria(self, badge_def: dict, stats: dict, user: dict) -> tuple[bool, str]:
        """Check if user meets badge criteria"""
        criteria = badge_def["criteria"]
        
        if criteria == "complete_first_sale":
            if stats["total_sales"] >= 1:
                return True, "Completed first sale"
        
        elif criteria == "complete_10_sales":
            if stats["total_sales"] >= 10:
                return True, f"Completed {stats['total_sales']} sales"
        
        elif criteria == "complete_50_sales":
            if stats["total_sales"] >= 50:
                return True, f"Completed {stats['total_sales']} sales"
        
        elif criteria == "complete_100_sales":
            if stats["total_sales"] >= 100:
                return True, f"Completed {stats['total_sales']} sales - Top Seller!"
        
        elif criteria == "member_1_year":
            if stats["account_age_days"] >= 365:
                return True, f"Active member for {stats['account_age_days']} days"
        
        elif criteria == "member_2_years":
            if stats["account_age_days"] >= 730:
                return True, f"Veteran member for {stats['account_age_days']} days"
        
        elif criteria == "5_star_rating":
            if stats["review_count"] >= 10 and stats["avg_rating"] >= 4.9:
                return True, f"Maintained {stats['avg_rating']:.1f} stars with {stats['review_count']} reviews"
        
        elif criteria == "create_first_listing":
            if stats["total_listings"] >= 1:
                return True, "Created first listing"
        
        elif criteria == "create_50_listings":
            if stats["total_listings"] >= 50:
                return True, f"Created {stats['total_listings']} listings"
        
        elif criteria == "id_verified":
            if stats["id_verified"]:
                return True, "Completed identity verification"
        
        return False, ""
    
    async def _award_badge(self, user_id: str, badge_id: str, reason: str) -> Optional[Dict[str, Any]]:
        """Award a badge to a user"""
        try:
            # Get badge details
            badge = await self.db.badges.find_one({"id": badge_id, "is_active": True})
            if not badge:
                return None
            
            # Create user badge record
            user_badge = {
                "id": f"ub_{uuid.uuid4().hex[:12]}",
                "user_id": user_id,
                "badge_id": badge_id,
                "awarded_at": datetime.now(timezone.utc),
                "awarded_by": "system",
                "reason": reason,
                "auto_awarded": True
            }
            
            await self.db.user_badges.insert_one(user_badge)
            
            # Create notification for user
            notification = {
                "id": f"notif_{uuid.uuid4().hex[:12]}",
                "user_id": user_id,
                "type": "badge_earned",
                "title": "New Badge Earned!",
                "message": f"Congratulations! You've earned the '{badge['name']}' badge. {badge.get('description', '')}",
                "data": {
                    "badge_id": badge_id,
                    "badge_name": badge["name"],
                    "badge_icon": badge.get("icon", "trophy"),
                    "badge_color": badge.get("color", "#4CAF50"),
                    "points_earned": badge.get("points_value", 0)
                },
                "read": False,
                "created_at": datetime.now(timezone.utc)
            }
            await self.db.notifications.insert_one(notification)
            
            return {
                "badge_id": badge_id,
                "badge_name": badge["name"],
                "badge_icon": badge.get("icon"),
                "badge_color": badge.get("color"),
                "reason": reason,
                "points_earned": badge.get("points_value", 0)
            }
            
        except Exception as e:
            logger.error(f"Error awarding badge {badge_id} to user {user_id}: {e}")
            return None
    
    async def run_periodic_badge_check(self, batch_size: int = 100):
        """
        Run periodic badge checks for time-based badges (membership duration)
        Should be called by a scheduled task
        """
        try:
            # Get users who might qualify for time-based badges
            one_year_ago = datetime.now(timezone.utc) - timedelta(days=365)
            
            # Find users created more than a year ago who don't have trusted member badge
            users_cursor = self.db.users.find({
                "created_at": {"$lte": one_year_ago}
            }, {"user_id": 1}).limit(batch_size)
            
            users = await users_cursor.to_list(length=batch_size)
            
            awarded_count = 0
            for user in users:
                badges = await self.check_and_award_badges(user["user_id"], trigger="periodic")
                awarded_count += len(badges)
            
            if awarded_count > 0:
                logger.info(f"Periodic badge check awarded {awarded_count} badges")
            
            return awarded_count
            
        except Exception as e:
            logger.error(f"Error in periodic badge check: {e}")
            return 0


# Global instance (initialized with db in server.py)
badge_service: Optional[BadgeAwardingService] = None


def get_badge_service(db) -> BadgeAwardingService:
    """Get or create the badge service instance"""
    global badge_service
    if badge_service is None:
        badge_service = BadgeAwardingService(db)
    return badge_service
