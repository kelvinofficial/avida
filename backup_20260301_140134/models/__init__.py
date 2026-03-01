"""
Base models package for the Avida Marketplace backend.
These models are shared across multiple route files.
"""

from .user import User, UserUpdate, UserSettings, UserSettingsUpdate, ProfileUpdate
from .listing import Listing, Category, CategoryAttribute
from .messaging import Message, Conversation, MessageCreate
from .notification import Notification, NotificationCreate, NotificationSettings
from .badge import BadgeDefinition, UserBadge, Challenge, ChallengeProgress

__all__ = [
    # User models
    'User', 'UserUpdate', 'UserSettings', 'UserSettingsUpdate', 'ProfileUpdate',
    # Listing models
    'Listing', 'Category', 'CategoryAttribute',
    # Messaging models
    'Message', 'Conversation', 'MessageCreate',
    # Notification models
    'Notification', 'NotificationCreate', 'NotificationSettings',
    # Badge models
    'BadgeDefinition', 'UserBadge', 'Challenge', 'ChallengeProgress',
]
