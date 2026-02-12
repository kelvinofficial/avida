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
from .property import create_property_router, create_offers_router, create_similar_listings_router
from .social import create_social_router, create_profile_activity_router
from .notifications import create_notifications_router
from .account_support import create_account_router, create_support_router
from .user_settings import create_user_settings_router, create_sessions_router, create_id_verification_router
from .profile import create_profile_router
from .badge_challenges import create_badge_challenges_router
from .attribute_icons import create_attribute_icons_router

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
    'create_property_router',
    'create_offers_router',
    'create_similar_listings_router',
    'create_social_router',
    'create_profile_activity_router',
    'create_notifications_router',
    'create_account_router',
    'create_support_router',
    'create_user_settings_router',
    'create_sessions_router',
    'create_id_verification_router',
    'create_profile_router',
    'create_badge_challenges_router',
    'DEFAULT_CATEGORIES',
    'LEGACY_CATEGORY_MAP',
    'validate_category_and_subcategory',
]
