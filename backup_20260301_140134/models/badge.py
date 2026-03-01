"""Badge and Challenge models."""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid


class BadgeDefinition(BaseModel):
    """Defines a badge type."""
    id: str
    name: str
    description: str
    icon: str
    color: str
    points_value: int
    criteria: Dict[str, Any]  # e.g., {"type": "listings", "count": 5}
    tier: str = "bronze"  # bronze, silver, gold, platinum


class UserBadge(BaseModel):
    """A badge earned by a user."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    badge_id: str
    badge_name: str
    badge_description: str
    badge_icon: str
    badge_color: str
    points_value: int
    earned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_viewed: bool = False
    is_showcased: bool = False


class Challenge(BaseModel):
    """A challenge for users to complete."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    type: str  # weekly, monthly, seasonal, custom
    target: int
    criteria_type: str  # listings, sales, revenue, messages
    icon: str
    color: str
    badge_name: str
    badge_description: Optional[str] = None
    badge_points: int = 50
    start_date: datetime
    end_date: datetime
    required_categories: List[str] = []
    is_active: bool = True
    participant_count: int = 0
    completion_count: int = 0


class ChallengeProgress(BaseModel):
    """User's progress on a challenge."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    challenge_id: str
    progress: int = 0
    completed: bool = False
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None


class UserStreak(BaseModel):
    """User's challenge completion streak."""
    user_id: str
    current_streak: int = 0
    longest_streak: int = 0
    total_completions: int = 0
    streak_bonus_points: int = 0
    last_completion: Optional[datetime] = None


class Milestone(BaseModel):
    """A milestone achievement."""
    id: str
    name: str
    description: str
    badge_count_required: int
    icon: str
    color: str
    points_value: int


class UserMilestone(BaseModel):
    """A milestone achieved by a user."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    milestone_id: str
    milestone_name: str
    achieved_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    acknowledged: bool = False
