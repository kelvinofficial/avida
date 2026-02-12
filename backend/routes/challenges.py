"""
Challenges Routes Module (DEPRECATED)

This module has been superseded by badge_challenges.py which provides a more
comprehensive implementation including:
- Seasonal challenges (8 types: Valentine, Spring, Summer, Back-to-School, 
  Halloween, Black Friday, Holiday, New Year)
- Weekly and Monthly challenges with badge rewards
- Challenge progress tracking and leaderboards
- Streak management and streak badges
- Badge awarding for challenge completions

Please use create_badge_challenges_router from routes/badge_challenges.py instead.

This file is kept for backwards compatibility but creates no routes.
"""

import logging
from fastapi import APIRouter

logger = logging.getLogger(__name__)


def create_challenges_router(db, get_current_user):
    """
    DEPRECATED: Use create_badge_challenges_router from routes/badge_challenges.py
    
    This factory function now returns an empty router.
    The comprehensive challenge implementation is in badge_challenges.py.
    
    Args:
        db: MongoDB database instance (unused)
        get_current_user: Dependency function for authentication (unused)
    
    Returns:
        Empty APIRouter instance
    """
    logger.warning(
        "DEPRECATED: create_challenges_router is deprecated. "
        "Use create_badge_challenges_router from routes/badge_challenges.py instead."
    )
    
    # Return empty router - all challenge endpoints are now in badge_challenges.py
    router = APIRouter(prefix="/challenges-deprecated", tags=["challenges-deprecated"])
    
    return router
