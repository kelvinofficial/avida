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


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ResendVerificationRequest(BaseModel):
    email: str


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
        
        # Generate email verification token
        verification_token = secrets.token_urlsafe(32)
        verification_expires = datetime.now(timezone.utc) + timedelta(hours=24)
        
        await db.email_verifications.delete_many({"email": register_data.email.lower()})
        await db.email_verifications.insert_one({
            "email": register_data.email.lower(),
            "user_id": user_id,
            "token": verification_token,
            "expires_at": verification_expires,
            "created_at": datetime.now(timezone.utc)
        })
        
        # Send verification email
        try:
            from utils.email_service import email_service
            
            verify_link = f"https://ui-refactor-preview.preview.emergentagent.com/verify-email?token={verification_token}"
            
            await email_service.send_email(
                to_email=register_data.email.lower(),
                subject="Verify Your Avida Account",
                html_content=f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #2E7D32, #66BB6A); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Welcome to Avida!</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Your local marketplace</p>
                    </div>
                    <div style="padding: 30px; background: #f8f8f8;">
                        <h2 style="color: #333;">Hi {register_data.name}!</h2>
                        <p style="color: #666;">Thanks for signing up! Please verify your email address to activate your account and start buying and selling.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{verify_link}" style="background: #2E7D32; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Verify My Email</a>
                        </div>
                        <p style="color: #999; font-size: 14px;">This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
                    </div>
                    <div style="padding: 20px; text-align: center; background: #333;">
                        <p style="color: #999; font-size: 12px; margin: 0;">© 2026 Avida Marketplace. All rights reserved.</p>
                    </div>
                </div>
                """,
                text_content=f"Hi {register_data.name}! Verify your Avida account by visiting: {verify_link}\n\nThis link expires in 24 hours."
            )
            logger.info(f"Verification email sent to {register_data.email}")
        except Exception as e:
            logger.error(f"Failed to send verification email: {e}")
        
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
        
        return {"user": user_doc, "session_token": session_token, "message": "Registration successful. Please check your email to verify your account.", "email_verification_required": True}
    
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
        
        # Get user_id - use existing field or fall back to _id
        user_id = user.get("user_id") or str(user["_id"])
        
        # Remove old sessions for this user
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
    
    @router.post("/forgot-password")
    async def forgot_password(data: ForgotPasswordRequest, request: Request):
        """Send password reset email"""
        # Rate limiting
        client_ip = request.client.host if request.client else "unknown"
        if not check_rate_limit(client_ip, "forgot_password"):
            raise HTTPException(status_code=429, detail="Too many requests. Please wait a few minutes.")
        
        # Find user by email
        user = await db.users.find_one({"email": data.email.lower()})
        
        # Always return success to prevent email enumeration
        if not user:
            return {"message": "If an account exists with this email, you will receive a password reset link."}
        
        # Check if user uses Google auth
        if user.get("auth_provider") == "google" and not user.get("password_hash"):
            return {"message": "If an account exists with this email, you will receive a password reset link."}
        
        # Generate reset token
        reset_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        
        # Store reset token
        await db.password_resets.delete_many({"email": data.email.lower()})  # Remove old tokens
        await db.password_resets.insert_one({
            "email": data.email.lower(),
            "token": reset_token,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc)
        })
        
        # Send email using SendGrid if configured
        try:
            from utils.email_service import email_service
            
            reset_link = f"https://ui-refactor-preview.preview.emergentagent.com/reset-password?token={reset_token}"
            
            await email_service.send_email(
                to_email=data.email.lower(),
                subject="Reset Your Avida Password",
                html_content=f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #2E7D32, #66BB6A); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Avida</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Your local marketplace</p>
                    </div>
                    <div style="padding: 30px; background: #f8f8f8;">
                        <h2 style="color: #333;">Reset Your Password</h2>
                        <p style="color: #666;">We received a request to reset your password. Click the button below to create a new password:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{reset_link}" style="background: #2E7D32; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset Password</a>
                        </div>
                        <p style="color: #999; font-size: 14px;">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
                    </div>
                    <div style="padding: 20px; text-align: center; background: #333;">
                        <p style="color: #999; font-size: 12px; margin: 0;">© 2026 Avida Marketplace. All rights reserved.</p>
                    </div>
                </div>
                """,
                text_content=f"Reset your Avida password by visiting: {reset_link}\n\nThis link expires in 1 hour."
            )
            logger.info(f"Password reset email sent to {data.email}")
        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")
            # Still return success to prevent enumeration
        
        return {"message": "If an account exists with this email, you will receive a password reset link."}
    
    @router.post("/reset-password")
    async def reset_password(data: ResetPasswordRequest):
        """Reset password using token"""
        # Validate password
        if len(data.new_password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        
        # Find reset token
        reset_record = await db.password_resets.find_one({"token": data.token})
        
        if not reset_record:
            raise HTTPException(status_code=400, detail="Invalid or expired reset link")
        
        # Check expiry
        if reset_record["expires_at"] < datetime.now(timezone.utc):
            await db.password_resets.delete_one({"token": data.token})
            raise HTTPException(status_code=400, detail="Reset link has expired. Please request a new one.")
        
        # Update password
        new_password_hash = hash_password(data.new_password)
        result = await db.users.update_one(
            {"email": reset_record["email"]},
            {"$set": {"password_hash": new_password_hash}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Failed to reset password")
        
        # Delete used token
        await db.password_resets.delete_one({"token": data.token})
        
        # Invalidate all existing sessions
        user = await db.users.find_one({"email": reset_record["email"]})
        if user:
            await db.user_sessions.delete_many({"user_id": user.get("user_id")})
        
        logger.info(f"Password reset successful for {reset_record['email']}")
        return {"message": "Password reset successful. You can now login with your new password."}
    
    @router.get("/verify-reset-token/{token}")
    async def verify_reset_token(token: str):
        """Verify if a reset token is valid"""
        reset_record = await db.password_resets.find_one({"token": token})
        
        if not reset_record:
            raise HTTPException(status_code=400, detail="Invalid reset link")
        
        if reset_record["expires_at"] < datetime.now(timezone.utc):
            await db.password_resets.delete_one({"token": token})
            raise HTTPException(status_code=400, detail="Reset link has expired")
        
        return {"valid": True, "email": reset_record["email"]}
    
    @router.get("/verify-email/{token}")
    async def verify_email(token: str):
        """Verify user email address"""
        # Find verification record
        verification = await db.email_verifications.find_one({"token": token})
        
        if not verification:
            raise HTTPException(status_code=400, detail="Invalid verification link")
        
        # Check expiry
        if verification["expires_at"] < datetime.now(timezone.utc):
            await db.email_verifications.delete_one({"token": token})
            raise HTTPException(status_code=400, detail="Verification link has expired. Please request a new one.")
        
        # Update user as verified
        result = await db.users.update_one(
            {"email": verification["email"]},
            {"$set": {"email_verified": True, "verified_at": datetime.now(timezone.utc)}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Failed to verify email")
        
        # Delete verification token
        await db.email_verifications.delete_one({"token": token})
        
        logger.info(f"Email verified for {verification['email']}")
        return {"message": "Email verified successfully! You can now use all features of Avida.", "email": verification["email"]}
    
    @router.post("/resend-verification")
    async def resend_verification(data: ResendVerificationRequest, request: Request):
        """Resend verification email"""
        # Rate limiting
        client_ip = request.client.host if request.client else "unknown"
        if not check_rate_limit(client_ip, "resend_verification"):
            raise HTTPException(status_code=429, detail="Too many requests. Please wait a few minutes.")
        
        # Find user
        user = await db.users.find_one({"email": data.email.lower()})
        
        if not user:
            # Return success to prevent email enumeration
            return {"message": "If your email is registered, you will receive a verification link."}
        
        # Check if already verified
        if user.get("email_verified"):
            return {"message": "Your email is already verified. You can login now."}
        
        # Check if user uses Google auth
        if user.get("auth_provider") == "google":
            return {"message": "Google accounts are automatically verified."}
        
        # Generate new verification token
        verification_token = secrets.token_urlsafe(32)
        verification_expires = datetime.now(timezone.utc) + timedelta(hours=24)
        
        await db.email_verifications.delete_many({"email": data.email.lower()})
        await db.email_verifications.insert_one({
            "email": data.email.lower(),
            "user_id": user["user_id"],
            "token": verification_token,
            "expires_at": verification_expires,
            "created_at": datetime.now(timezone.utc)
        })
        
        # Send verification email
        try:
            from utils.email_service import email_service
            
            verify_link = f"https://ui-refactor-preview.preview.emergentagent.com/verify-email?token={verification_token}"
            
            await email_service.send_email(
                to_email=data.email.lower(),
                subject="Verify Your Avida Account",
                html_content=f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #2E7D32, #66BB6A); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Avida</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Your local marketplace</p>
                    </div>
                    <div style="padding: 30px; background: #f8f8f8;">
                        <h2 style="color: #333;">Verify Your Email</h2>
                        <p style="color: #666;">Click the button below to verify your email address:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{verify_link}" style="background: #2E7D32; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Verify My Email</a>
                        </div>
                        <p style="color: #999; font-size: 14px;">This link will expire in 24 hours.</p>
                    </div>
                    <div style="padding: 20px; text-align: center; background: #333;">
                        <p style="color: #999; font-size: 12px; margin: 0;">© 2026 Avida Marketplace. All rights reserved.</p>
                    </div>
                </div>
                """,
                text_content=f"Verify your Avida account by visiting: {verify_link}\n\nThis link expires in 24 hours."
            )
            logger.info(f"Verification email resent to {data.email}")
        except Exception as e:
            logger.error(f"Failed to resend verification email: {e}")
        
        return {"message": "If your email is registered, you will receive a verification link."}
    
    @router.get("/check-verification/{email}")
    async def check_verification_status(email: str):
        """Check if email is verified"""
        user = await db.users.find_one({"email": email.lower()})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "email": email.lower(),
            "email_verified": user.get("email_verified", False),
            "auth_provider": user.get("auth_provider", "email")
        }
    
    return router
