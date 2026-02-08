"""
Authentication Router - Admin Dashboard
Handles admin login, token refresh, logout, and profile
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Models will be imported from main server for now
# This file serves as a template for future refactoring

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None

class RefreshRequest(BaseModel):
    refresh_token: str

# Note: Routes are kept in server.py for now to avoid breaking changes
# This file documents the intended structure for the auth module
