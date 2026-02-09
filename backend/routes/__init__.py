"""
Routes Package
Contains modular route handlers extracted from server.py
"""

from .auth import create_auth_router
from .users import create_users_router
from .listings import create_listings_router

__all__ = [
    'create_auth_router',
    'create_users_router',
    'create_listings_router'
]
