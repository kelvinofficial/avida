"""
Routes Package
Contains modular route handlers extracted from server.py
"""

from .auth import create_auth_router

__all__ = ['create_auth_router']
