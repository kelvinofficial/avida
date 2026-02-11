"""
Routes Package
Contains modular route handlers extracted from server.py
"""

from .auth import create_auth_router
from .users import create_users_router
from .listings import create_listings_router
from .categories import create_categories_router, DEFAULT_CATEGORIES, LEGACY_CATEGORY_MAP, validate_category_and_subcategory
from .favorites import create_favorites_router
from .conversations import create_conversations_router
from .badges import create_badges_router
from .streaks import create_streaks_router
from .challenges import create_challenges_router
from .admin import create_admin_router
from .notification_preferences import create_notification_preferences_router
from .admin_locations import create_admin_locations_router
from .auto_motors import create_auto_motors_router

__all__ = [
    'create_auth_router',
    'create_users_router',
    'create_listings_router',
    'create_categories_router',
    'create_favorites_router',
    'create_conversations_router',
    'create_badges_router',
    'create_streaks_router',
    'create_challenges_router',
    'create_admin_router',
    'create_notification_preferences_router',
    'create_admin_locations_router',
    'create_auto_motors_router',
    'DEFAULT_CATEGORIES',
    'LEGACY_CATEGORY_MAP',
    'validate_category_and_subcategory',
]
