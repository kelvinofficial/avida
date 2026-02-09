"""
Authentication Routes Module
Handles user registration, login, session management, and Google OAuth
"""

import hashlib
import secrets
import uuid
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# MODELS
# =============================================================================

class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str


class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    verified: bool = False
    rating: float = 0.0
    total_ratings: int = 0
    auth_provider: Optional[str] = None


# =============================================================================
# PASSWORD UTILITIES
# =============================================================================

def hash_password(password: str) -> str:
    """Hash password using SHA-256 with salt"""
    salt = secrets.token_hex(16)
    password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}:{password_hash}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify password against stored hash"""
    try:
        salt, password_hash = stored_hash.split(':')
        return hashlib.sha256((password + salt).encode()).hexdigest() == password_hash
    except:
        return False


# =============================================================================
# ROUTER FACTORY
# =============================================================================

def create_auth_router(db, get_current_user, get_session_token, check_rate_limit):
    """
    Create the authentication router with dependencies injected
    
    Args:
        db: MongoDB database instance
        get_current_user: Function to get current user from request
        get_session_token: Function to extract session token from request
        check_rate_limit: Function to check rate limits
    
    Returns:
        APIRouter with auth endpoints
    """
    router = APIRouter(prefix="/auth", tags=["Authentication"])
    
    @router.post("/register")
    async def register_user(register_data: RegisterRequest, response: Response):
        """Register a new user with email and password"""
        # Validate email format
        if not register_data.email or '@' not in register_data.email:
            raise HTTPException(status_code=400, detail="Invalid email format")
        
        # Validate password length
        if len(register_data.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        
        # Check if email already exists
        existing_user = await db.users.find_one({"email": register_data.email.lower()})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered. Please login instead.")
        
        # Create user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        password_hash = hash_password(register_data.password)
        
        new_user = {
            "user_id": user_id,
            "email": register_data.email.lower(),
            "name": register_data.name,
            "password_hash": password_hash,
            "picture": None,
            "verified": False,
            "rating": 0.0,
            "total_ratings": 0,
            "blocked_users": [],
            "notifications_enabled": True,
            "created_at": datetime.now(timezone.utc),
            "auth_provider": "email"
        }
        
        await db.users.insert_one(new_user)
        
        # Create session
        session_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        await db.user_sessions.insert_one({
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc)
        })
        
        # Set cookie
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=7 * 24 * 60 * 60,
            path="/"
        )
        
        # Return user without password hash
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
        
        # Track cohort event for user signup
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                await client.post(
                    "http://localhost:8001/api/cohort-analytics/events/track",
                    json={
                        "user_id": user_id,
                        "event_type": "signup",
                        "properties": {
                            "auth_provider": "email",
                            "source": "registration"
                        },
                        "session_id": session_token
                    },
                    timeout=2.0
                )
        except Exception as e:
            logger.debug(f"Cohort event tracking failed: {e}")
        
        return {"user": user_doc, "session_token": session_token, "message": "Registration successful"}
    
    @router.post("/login")
    async def login_user(login_data: LoginRequest, request: Request, response: Response):
        """Login with email and password"""
        # Rate limiting
        client_ip = request.client.host if request.client else "unknown"
        if not check_rate_limit(client_ip, "login"):
            raise HTTPException(status_code=429, detail="Too many login attempts. Please wait.")
        
        # Find user by email
        user = await db.users.find_one({"email": login_data.email.lower()})
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Check if user has a password (might be Google-only user)
        if not user.get("password_hash"):
            raise HTTPException(
                status_code=400, 
                detail="This account uses Google Sign-In. Please login with Google."
            )
        
        # Verify password
        if not verify_password(login_data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Create session
        session_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        # Remove old sessions for this user
        await db.user_sessions.delete_many({"user_id": user["user_id"]})
        
        await db.user_sessions.insert_one({
            "user_id": user["user_id"],
            "session_token": session_token,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc)
        })
        
        # Set cookie
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=7 * 24 * 60 * 60,
            path="/"
        )
        
        # Return user without password hash
        user_doc = {k: v for k, v in user.items() if k not in ["_id", "password_hash"]}
        
        # Track cohort event for user login
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                await client.post(
                    "http://localhost:8001/api/cohort-analytics/events/track",
                    json={
                        "user_id": user["user_id"],
                        "event_type": "login",
                        "properties": {
                            "auth_provider": "email"
                        },
                        "session_id": session_token
                    },
                    timeout=2.0
                )
        except Exception as e:
            logger.debug(f"Cohort event tracking failed: {e}")
        
        return {"user": user_doc, "session_token": session_token, "message": "Login successful"}
    
    @router.post("/session")
    async def exchange_session(request: Request, response: Response):
        """Exchange session_id for session_token (Google OAuth)"""
        body = await request.json()
        session_id = body.get("session_id")
        
        if not session_id:
            raise HTTPException(status_code=400, detail="session_id required")
        
        # Rate limiting
        client_ip = request.client.host if request.client else "unknown"
        if not check_rate_limit(client_ip, "login"):
            raise HTTPException(status_code=429, detail="Too many login attempts")
        
        # Exchange session_id with Emergent Auth
        async with httpx.AsyncClient() as http_client:
            try:
                auth_response = await http_client.get(
                    "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                    headers={"X-Session-ID": session_id}
                )
                if auth_response.status_code != 200:
                    raise HTTPException(status_code=401, detail="Invalid session")
                
                user_data = auth_response.json()
            except Exception as e:
                logger.error(f"Auth error: {e}")
                raise HTTPException(status_code=401, detail="Authentication failed")
        
        # Create or get user
        existing_user = await db.users.find_one({"email": user_data["email"]}, {"_id": 0})
        
        if existing_user:
            user_id = existing_user["user_id"]
            # Update picture if changed
            if user_data.get("picture") and existing_user.get("picture") != user_data.get("picture"):
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": {"picture": user_data.get("picture")}}
                )
        else:
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            new_user = {
                "user_id": user_id,
                "email": user_data["email"],
                "name": user_data["name"],
                "picture": user_data.get("picture"),
                "verified": False,
                "rating": 0.0,
                "total_ratings": 0,
                "blocked_users": [],
                "notifications_enabled": True,
                "created_at": datetime.now(timezone.utc),
                "auth_provider": "google"
            }
            await db.users.insert_one(new_user)
        
        # Store session
        session_token = user_data["session_token"]
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        await db.user_sessions.delete_many({"user_id": user_id})
        await db.user_sessions.insert_one({
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc)
        })
        
        # Set cookie
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=7 * 24 * 60 * 60,
            path="/"
        )
        
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
        return {"user": user_doc, "session_token": session_token}
    
    @router.get("/me")
    async def get_me(request: Request):
        """Get current user"""
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return user.model_dump()
    
    @router.post("/logout")
    async def logout(request: Request, response: Response):
        """Logout user"""
        token = await get_session_token(request)
        if token:
            await db.user_sessions.delete_many({"session_token": token})
        
        response.delete_cookie(key="session_token", path="/")
        return {"message": "Logged out successfully"}
    
    return router
