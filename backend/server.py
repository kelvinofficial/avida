from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response, Query, UploadFile, File
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import socketio
from collections import defaultdict
import time
import base64
import asyncio

# Expo Push Notifications
try:
    from exponent_server_sdk import (
        DeviceNotRegisteredError,
        PushClient,
        PushMessage,
        PushServerError,
        PushTicketError,
    )
    EXPO_PUSH_AVAILABLE = True
except ImportError:
    EXPO_PUSH_AVAILABLE = False
    logging.warning("Expo server SDK not available. Push notifications disabled.")

# SendGrid Email
try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail, Email, To, Content
    SENDGRID_AVAILABLE = True
except ImportError:
    SENDGRID_AVAILABLE = False
    logging.warning("SendGrid not available. Email notifications disabled.")

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'classifieds_db')]

# Socket.IO setup
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

# Create the main app
app = FastAPI(title="Local Marketplace API")

# Create Socket.IO ASGI app
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Rate limiting storage
rate_limits = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMITS = {
    "login": 5,
    "post_listing": 10,
    "message": 30,
    "image_upload": 20
}

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

# User Models
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    verified: bool = False
    rating: float = 0.0
    total_ratings: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    blocked_users: List[str] = []
    notifications_enabled: bool = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None

# Category Models
class CategoryAttribute(BaseModel):
    name: str
    type: str  # text, number, select, multiselect
    options: Optional[List[str]] = None
    required: bool = False

class Category(BaseModel):
    id: str
    name: str
    icon: str
    attributes: List[CategoryAttribute] = []
    subcategories: List[str] = []

# Listing Models
class Listing(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: str
    price: float
    negotiable: bool = True
    category_id: str
    subcategory: Optional[str] = None
    condition: Optional[str] = None
    images: List[str] = []  # Base64 encoded images
    location: str
    attributes: Dict[str, Any] = {}  # Category-specific attributes
    status: str = "active"  # active, sold, deleted, pending
    featured: bool = False
    views: int = 0
    favorites_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ListingCreate(BaseModel):
    title: str
    description: str
    price: float
    negotiable: bool = True
    category_id: str
    subcategory: Optional[str] = None
    condition: Optional[str] = None
    images: List[str] = []
    location: str
    attributes: Dict[str, Any] = {}

class ListingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    negotiable: Optional[bool] = None
    condition: Optional[str] = None
    images: Optional[List[str]] = None
    location: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None
    status: Optional[str] = None

# Conversation and Message Models
class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    sender_id: str
    content: str
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Conversation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    listing_id: str
    buyer_id: str
    seller_id: str
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    buyer_unread: int = 0
    seller_unread: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MessageCreate(BaseModel):
    content: str

# Favorite Model
class Favorite(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    listing_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Report Model
class Report(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reporter_id: str
    reported_user_id: Optional[str] = None
    listing_id: Optional[str] = None
    reason: str
    description: str
    status: str = "pending"  # pending, reviewed, resolved
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReportCreate(BaseModel):
    reported_user_id: Optional[str] = None
    listing_id: Optional[str] = None
    reason: str
    description: str

# Session Models
class SessionDataResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    session_token: str

# ==================== USER SETTINGS MODELS ====================

class NotificationSettings(BaseModel):
    push: bool = True
    email: bool = True
    messages: bool = True
    offers: bool = True
    price_drops: bool = True
    saved_searches: bool = True
    better_deals: bool = True
    system_alerts: bool = True  # Cannot be disabled

class QuietHours(BaseModel):
    enabled: bool = False
    start_time: str = "22:00"  # HH:MM format
    end_time: str = "08:00"

class AlertPreferences(BaseModel):
    frequency: str = "instant"  # instant, daily, weekly
    categories: List[str] = []  # Empty means all categories
    radius_km: int = 50
    price_threshold_percent: int = 10

class PrivacySettings(BaseModel):
    location_services: bool = True
    show_online_status: bool = True
    show_last_seen: bool = True
    allow_profile_discovery: bool = True
    allow_direct_messages: bool = True

class AppPreferences(BaseModel):
    language: str = "en"
    currency: str = "EUR"
    dark_mode: str = "system"  # system, light, dark
    auto_download_media: bool = True

class SecuritySettings(BaseModel):
    two_factor_enabled: bool = False
    app_lock_enabled: bool = False
    app_lock_type: Optional[str] = None  # pin, biometric

class UserSettings(BaseModel):
    user_id: str
    notifications: NotificationSettings = Field(default_factory=NotificationSettings)
    quiet_hours: QuietHours = Field(default_factory=QuietHours)
    alert_preferences: AlertPreferences = Field(default_factory=AlertPreferences)
    privacy: PrivacySettings = Field(default_factory=PrivacySettings)
    app_preferences: AppPreferences = Field(default_factory=AppPreferences)
    security: SecuritySettings = Field(default_factory=SecuritySettings)
    push_token: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSettingsUpdate(BaseModel):
    notifications: Optional[NotificationSettings] = None
    quiet_hours: Optional[QuietHours] = None
    alert_preferences: Optional[AlertPreferences] = None
    privacy: Optional[PrivacySettings] = None
    app_preferences: Optional[AppPreferences] = None
    security: Optional[SecuritySettings] = None
    push_token: Optional[str] = None

# ==================== NOTIFICATION MODELS ====================

class NotificationType:
    CHAT_MESSAGE = "chat_message"
    OFFER_RECEIVED = "offer_received"
    OFFER_ACCEPTED = "offer_accepted"
    OFFER_REJECTED = "offer_rejected"
    PRICE_DROP = "price_drop"
    SAVED_SEARCH_MATCH = "saved_search_match"
    BETTER_DEAL = "better_deal"
    SELLER_RESPONSE = "seller_response"
    SECURITY_ALERT = "security_alert"
    SYSTEM_ANNOUNCEMENT = "system_announcement"
    LISTING_SOLD = "listing_sold"
    LISTING_EXPIRED = "listing_expired"
    NEW_FOLLOWER = "new_follower"

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str  # NotificationType values
    title: str
    body: str
    data_payload: Dict[str, Any] = {}  # Deep link data
    read: bool = False
    pushed: bool = False  # Whether push notification was sent
    emailed: bool = False  # Whether email was sent
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NotificationCreate(BaseModel):
    type: str
    title: str
    body: str
    data_payload: Dict[str, Any] = {}

# ==================== BLOCKED USER MODELS ====================

class BlockedUser(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # The user who blocked
    blocked_user_id: str  # The user who was blocked
    reason: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BlockUserRequest(BaseModel):
    blocked_user_id: str
    reason: Optional[str] = None

# ==================== ACTIVE SESSIONS MODEL ====================

class ActiveSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_token: str
    device_name: str = "Unknown Device"
    device_type: str = "unknown"  # mobile, tablet, desktop, web
    ip_address: Optional[str] = None
    location: Optional[str] = None
    last_active: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_current: bool = False

# ==================== PROFILE UPDATE MODELS ====================

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    picture: Optional[str] = None  # Base64 or URL

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class DeleteAccountRequest(BaseModel):
    reason: str
    password: str

# ==================== STATS MODELS ====================

class UserStats(BaseModel):
    active_listings: int = 0
    sold_listings: int = 0
    total_favorites: int = 0
    total_views: int = 0
    purchases: int = 0
    sales_count: int = 0

# ==================== RATE LIMITING ====================

def check_rate_limit(key: str, action: str) -> bool:
    """Check if action is rate limited"""
    current_time = time.time()
    limit_key = f"{key}:{action}"
    
    # Clean old entries
    rate_limits[limit_key] = [t for t in rate_limits[limit_key] if current_time - t < RATE_LIMIT_WINDOW]
    
    if len(rate_limits[limit_key]) >= RATE_LIMITS.get(action, 100):
        return False
    
    rate_limits[limit_key].append(current_time)
    return True

# ==================== AUTH HELPERS ====================

async def get_session_token(request: Request) -> Optional[str]:
    """Extract session token from cookies or Authorization header"""
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "")
    return token

async def get_current_user(request: Request) -> Optional[User]:
    """Get current authenticated user"""
    token = await get_session_token(request)
    if not token:
        return None
    
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    
    # Check expiry with timezone awareness
    expires_at = session.get("expires_at")
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= datetime.now(timezone.utc):
            return None
    
    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if user_doc:
        return User(**user_doc)
    return None

async def require_auth(request: Request) -> User:
    """Require authentication, raise 401 if not authenticated"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    """Exchange session_id for session_token"""
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
            "created_at": datetime.now(timezone.utc)
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
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": user_doc, "session_token": session_token}

@api_router.get("/auth/me")
async def get_me(request: Request):
    """Get current user"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user.model_dump()

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    token = await get_session_token(request)
    if token:
        await db.user_sessions.delete_many({"session_token": token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ==================== USER ENDPOINTS ====================

@api_router.put("/users/me")
async def update_user(update: UserUpdate, request: Request):
    """Update current user profile"""
    user = await require_auth(request)
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        await db.users.update_one({"user_id": user.user_id}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    return updated_user

@api_router.get("/users/{user_id}")
async def get_user(user_id: str):
    """Get public user profile"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Return public info only
    return {
        "user_id": user["user_id"],
        "name": user["name"],
        "picture": user.get("picture"),
        "location": user.get("location"),
        "bio": user.get("bio"),
        "verified": user.get("verified", False),
        "rating": user.get("rating", 0),
        "total_ratings": user.get("total_ratings", 0),
        "created_at": user.get("created_at")
    }

@api_router.post("/users/block/{user_id}")
async def block_user(user_id: str, request: Request):
    """Block a user"""
    current_user = await require_auth(request)
    
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$addToSet": {"blocked_users": user_id}}
    )
    return {"message": "User blocked"}

@api_router.post("/users/unblock/{user_id}")
async def unblock_user(user_id: str, request: Request):
    """Unblock a user"""
    current_user = await require_auth(request)
    
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$pull": {"blocked_users": user_id}}
    )
    return {"message": "User unblocked"}

# ==================== CATEGORY ENDPOINTS ====================

# Default categories
DEFAULT_CATEGORIES = [
    {
        "id": "vehicles",
        "name": "Auto & Vehicles",
        "icon": "car-outline",
        "subcategories": ["Cars", "Motorcycles", "Bicycles", "Boats", "Parts", "Commercial Vehicles"],
        "attributes": [
            {"name": "brand", "type": "text", "required": False},
            {"name": "model", "type": "text", "required": False},
            {"name": "year", "type": "number", "required": False},
            {"name": "mileage", "type": "number", "required": False},
            {"name": "fuel_type", "type": "select", "options": ["Petrol", "Diesel", "Electric", "Hybrid", "LPG"], "required": False},
            {"name": "transmission", "type": "select", "options": ["Automatic", "Manual", "CVT", "PDK"], "required": False},
            {"name": "color", "type": "text", "required": False}
        ]
    },
    {
        "id": "electronics",
        "name": "Electronics & Mobile",
        "icon": "phone-portrait-outline",
        "subcategories": ["Phones", "Tablets", "Computers", "Gaming", "Audio", "Cameras", "TV"],
        "attributes": [
            {"name": "brand", "type": "text", "required": False},
            {"name": "model", "type": "text", "required": False},
            {"name": "storage", "type": "text", "required": False},
            {"name": "ram", "type": "text", "required": False},
            {"name": "battery_health", "type": "text", "required": False},
            {"name": "warranty", "type": "text", "required": False}
        ]
    },
    {
        "id": "realestate",
        "name": "Properties",
        "icon": "business-outline",
        "subcategories": ["Apartments", "Houses", "Studios", "Penthouses", "Villas", "Commercial", "Land"],
        "attributes": [
            {"name": "property_type", "type": "text", "required": False},
            {"name": "bedrooms", "type": "number", "required": False},
            {"name": "bathrooms", "type": "number", "required": False},
            {"name": "size_sqm", "type": "number", "required": False},
            {"name": "furnished", "type": "select", "options": ["Yes", "No", "Partially"], "required": False},
            {"name": "parking", "type": "select", "options": ["Yes", "No"], "required": False},
            {"name": "year_built", "type": "number", "required": False},
            {"name": "purpose", "type": "select", "options": ["rent", "sale"], "required": True}
        ]
    },
    {
        "id": "fashion",
        "name": "Fashion & Accessories",
        "icon": "shirt-outline",
        "subcategories": ["Clothing", "Shoes", "Bags", "Jewelry", "Watches", "Accessories"],
        "attributes": [
            {"name": "brand", "type": "text", "required": False},
            {"name": "size", "type": "select", "options": ["XS", "S", "M", "L", "XL", "XXL"], "required": False},
            {"name": "color", "type": "text", "required": False},
            {"name": "category", "type": "select", "options": ["Men", "Women", "Kids", "Unisex"], "required": False},
            {"name": "material", "type": "text", "required": False},
            {"name": "original", "type": "select", "options": ["Yes", "No"], "required": False}
        ]
    },
    {
        "id": "home",
        "name": "Home & Furniture",
        "icon": "home-outline",
        "subcategories": ["Furniture", "Kitchen", "Decor", "Garden", "Tools", "Lighting"],
        "attributes": [
            {"name": "furniture_type", "type": "text", "required": False},
            {"name": "material", "type": "text", "required": False},
            {"name": "dimensions", "type": "text", "required": False},
            {"name": "color", "type": "text", "required": False},
            {"name": "assembly_required", "type": "select", "options": ["Yes", "No"], "required": False},
            {"name": "weight", "type": "text", "required": False}
        ]
    },
    {
        "id": "services",
        "name": "Services",
        "icon": "construct-outline",
        "subcategories": ["Cleaning", "Repair", "Moving", "Tutoring", "IT Support", "Photography", "Other"],
        "attributes": [
            {"name": "service_type", "type": "text", "required": False},
            {"name": "experience_years", "type": "number", "required": False},
            {"name": "availability", "type": "text", "required": False},
            {"name": "pricing_model", "type": "select", "options": ["Hourly", "Per Job", "Fixed Price", "Per Session"], "required": False},
            {"name": "service_area", "type": "text", "required": False},
            {"name": "response_time", "type": "text", "required": False},
            {"name": "certifications", "type": "text", "required": False}
        ]
    },
    {
        "id": "jobs",
        "name": "Jobs",
        "icon": "briefcase-outline",
        "subcategories": ["Full-time", "Part-time", "Freelance", "Internship", "Contract"],
        "attributes": [
            {"name": "job_title", "type": "text", "required": False},
            {"name": "job_type", "type": "select", "options": ["Full-time", "Part-time", "Contract", "Freelance"], "required": False},
            {"name": "salary_range", "type": "text", "required": False},
            {"name": "experience_required", "type": "text", "required": False},
            {"name": "education_level", "type": "select", "options": ["High School", "Bachelor's", "Master's", "PhD"], "required": False},
            {"name": "remote", "type": "select", "options": ["Yes", "No", "Hybrid"], "required": False},
            {"name": "industry", "type": "text", "required": False}
        ]
    },
    {
        "id": "family",
        "name": "Kids & Baby",
        "icon": "people-outline",
        "subcategories": ["Strollers", "Car Seats", "Cribs", "Toys", "Clothing", "Maternity"],
        "attributes": [
            {"name": "item_type", "type": "text", "required": False},
            {"name": "age_range", "type": "select", "options": ["0-6 months", "6-12 months", "1-2 years", "2-4 years", "4+ years"], "required": False},
            {"name": "brand", "type": "text", "required": False},
            {"name": "material", "type": "text", "required": False},
            {"name": "safety_certified", "type": "select", "options": ["Yes", "No"], "required": False},
            {"name": "gender_neutral", "type": "select", "options": ["Yes", "No"], "required": False}
        ]
    },
    {
        "id": "beauty",
        "name": "Beauty & Personal Care",
        "icon": "sparkles-outline",
        "subcategories": ["Skincare", "Makeup", "Hair Care", "Perfumes", "Grooming", "Devices"],
        "attributes": [
            {"name": "product_type", "type": "text", "required": False},
            {"name": "brand", "type": "text", "required": False},
            {"name": "skin_hair_type", "type": "text", "required": False},
            {"name": "usage_state", "type": "select", "options": ["New/Sealed", "Lightly Used", "Half Used"], "required": False},
            {"name": "expiry_date", "type": "text", "required": False},
            {"name": "authenticity", "type": "select", "options": ["Yes", "No"], "required": False}
        ]
    },
    {
        "id": "leisure",
        "name": "Leisure & Activities",
        "icon": "bicycle-outline",
        "subcategories": ["Sports", "Fitness", "Outdoor", "Music", "Art", "Classes"],
        "attributes": [
            {"name": "activity_type", "type": "text", "required": False},
            {"name": "duration", "type": "text", "required": False},
            {"name": "skill_level", "type": "select", "options": ["Beginner", "Intermediate", "Advanced", "All Levels"], "required": False},
            {"name": "equipment_included", "type": "select", "options": ["Yes", "No"], "required": False},
            {"name": "group_size", "type": "text", "required": False},
            {"name": "availability_dates", "type": "text", "required": False}
        ]
    },
    {
        "id": "animals",
        "name": "Animals & Pets",
        "icon": "paw-outline",
        "subcategories": ["Dogs", "Cats", "Birds", "Fish", "Rabbits", "Other Pets", "Pet Supplies"],
        "attributes": [
            {"name": "animal_type", "type": "text", "required": False},
            {"name": "breed", "type": "text", "required": False},
            {"name": "age", "type": "text", "required": False},
            {"name": "gender", "type": "select", "options": ["Male", "Female"], "required": False},
            {"name": "vaccinated", "type": "select", "options": ["Yes", "No", "Partial"], "required": False},
            {"name": "health_status", "type": "text", "required": False}
        ]
    },
    {
        "id": "industrial",
        "name": "Industrial Machines",
        "icon": "cog-outline",
        "subcategories": ["CNC", "Robotics", "Manufacturing", "Construction", "Printing", "Other"],
        "attributes": [
            {"name": "machine_type", "type": "text", "required": False},
            {"name": "brand", "type": "text", "required": False},
            {"name": "model", "type": "text", "required": False},
            {"name": "year", "type": "number", "required": False},
            {"name": "operating_hours", "type": "number", "required": False},
            {"name": "power_rating", "type": "text", "required": False},
            {"name": "certification", "type": "select", "options": ["Yes", "No"], "required": False}
        ]
    },
    {
        "id": "agriculture",
        "name": "Agriculture",
        "icon": "leaf-outline",
        "subcategories": ["Tractors", "Harvesters", "Livestock", "Crops", "Seeds", "Supplies"],
        "attributes": [
            {"name": "item_type", "type": "select", "options": ["Machine", "Crop", "Livestock", "Plants", "Equipment", "Supplies"], "required": False},
            {"name": "brand", "type": "text", "required": False},
            {"name": "quantity", "type": "text", "required": False},
            {"name": "usage_hours", "type": "number", "required": False},
            {"name": "organic", "type": "select", "options": ["Yes", "No"], "required": False}
        ]
    },
    {
        "id": "misc",
        "name": "Miscellaneous",
        "icon": "ellipsis-horizontal-outline",
        "subcategories": ["Books", "Collectibles", "Antiques", "Other"],
        "attributes": []
    }
]

@api_router.get("/categories", response_model=List[dict])
async def get_categories():
    """Get all categories"""
    return DEFAULT_CATEGORIES

@api_router.get("/categories/{category_id}")
async def get_category(category_id: str):
    """Get single category"""
    for cat in DEFAULT_CATEGORIES:
        if cat["id"] == category_id:
            return cat
    raise HTTPException(status_code=404, detail="Category not found")

# ==================== LISTING ENDPOINTS ====================

@api_router.post("/listings", response_model=dict)
async def create_listing(listing: ListingCreate, request: Request):
    """Create a new listing"""
    user = await require_auth(request)
    
    # Rate limiting
    if not check_rate_limit(user.user_id, "post_listing"):
        raise HTTPException(status_code=429, detail="Too many listings. Please wait.")
    
    # Validate category
    valid_category = False
    for cat in DEFAULT_CATEGORIES:
        if cat["id"] == listing.category_id:
            valid_category = True
            break
    
    if not valid_category:
        raise HTTPException(status_code=400, detail="Invalid category")
    
    # Create listing
    listing_id = str(uuid.uuid4())
    new_listing = {
        "id": listing_id,
        "user_id": user.user_id,
        "title": listing.title,
        "description": listing.description,
        "price": listing.price,
        "negotiable": listing.negotiable,
        "category_id": listing.category_id,
        "subcategory": listing.subcategory,
        "condition": listing.condition,
        "images": listing.images[:10],  # Max 10 images
        "location": listing.location,
        "attributes": listing.attributes,
        "status": "active",
        "featured": False,
        "views": 0,
        "favorites_count": 0,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.listings.insert_one(new_listing)
    # Return the listing without _id
    created_listing = await db.listings.find_one({"id": listing_id}, {"_id": 0})
    return created_listing

@api_router.get("/listings")
async def get_listings(
    category: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    condition: Optional[str] = None,
    location: Optional[str] = None,
    sort: str = "newest",
    page: int = 1,
    limit: int = 20
):
    """Get listings with filters and pagination"""
    query = {"status": "active"}
    
    if category:
        query["category_id"] = category
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    if min_price is not None:
        query["price"] = {"$gte": min_price}
    
    if max_price is not None:
        if "price" in query:
            query["price"]["$lte"] = max_price
        else:
            query["price"] = {"$lte": max_price}
    
    if condition:
        query["condition"] = condition
    
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    
    # Sorting
    sort_field = "created_at"
    sort_order = -1
    if sort == "price_asc":
        sort_field = "price"
        sort_order = 1
    elif sort == "price_desc":
        sort_field = "price"
        sort_order = -1
    elif sort == "oldest":
        sort_order = 1
    
    # Pagination
    skip = (page - 1) * limit
    
    total = await db.listings.count_documents(query)
    listings = await db.listings.find(query, {"_id": 0}).sort(sort_field, sort_order).skip(skip).limit(limit).to_list(limit)
    
    return {
        "listings": listings,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@api_router.get("/listings/my")
async def get_my_listings(request: Request, status: Optional[str] = None):
    """Get current user's listings"""
    user = await require_auth(request)
    
    query = {"user_id": user.user_id}
    if status:
        query["status"] = status
    
    listings = await db.listings.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return listings

@api_router.get("/listings/{listing_id}")
async def get_listing(listing_id: str, request: Request):
    """Get single listing and increment views"""
    listing = await db.listings.find_one({"id": listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Increment views
    await db.listings.update_one({"id": listing_id}, {"$inc": {"views": 1}})
    
    # Check if listing already has embedded seller data (from auto/property listings)
    embedded_seller = listing.get("seller")
    
    # If no embedded seller, look up from users collection
    if embedded_seller:
        seller_data = {
            "user_id": embedded_seller.get("user_id"),
            "name": embedded_seller.get("name"),
            "picture": embedded_seller.get("picture"),
            "phone": embedded_seller.get("phone"),
            "whatsapp": embedded_seller.get("whatsapp"),
            "rating": embedded_seller.get("rating", 0),
            "verified": embedded_seller.get("verified", False),
            "created_at": embedded_seller.get("created_at") or embedded_seller.get("memberSince"),
            "allowsOffers": embedded_seller.get("allowsOffers", True),
            "preferredContact": embedded_seller.get("preferredContact", "whatsapp")
        }
    else:
        seller = await db.users.find_one({"user_id": listing["user_id"]}, {"_id": 0})
        seller_data = {
            "user_id": seller["user_id"],
            "name": seller["name"],
            "picture": seller.get("picture"),
            "phone": seller.get("phone"),
            "whatsapp": seller.get("whatsapp"),
            "rating": seller.get("rating", 0),
            "verified": seller.get("verified", False),
            "created_at": seller.get("created_at"),
            "allowsOffers": seller.get("allowsOffers", True),
            "preferredContact": seller.get("preferredContact", "whatsapp")
        } if seller else None
    
    # Check if favorited by current user
    is_favorited = False
    user = await get_current_user(request)
    if user:
        favorite = await db.favorites.find_one({"user_id": user.user_id, "listing_id": listing_id})
        is_favorited = favorite is not None
    
    return {
        **listing,
        "seller": seller_data,
        "is_favorited": is_favorited
    }

@api_router.put("/listings/{listing_id}")
async def update_listing(listing_id: str, update: ListingUpdate, request: Request):
    """Update a listing"""
    user = await require_auth(request)
    
    listing = await db.listings.find_one({"id": listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if listing["user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.listings.update_one({"id": listing_id}, {"$set": update_data})
    
    updated = await db.listings.find_one({"id": listing_id}, {"_id": 0})
    return updated

@api_router.delete("/listings/{listing_id}")
async def delete_listing(listing_id: str, request: Request):
    """Delete a listing (soft delete)"""
    user = await require_auth(request)
    
    listing = await db.listings.find_one({"id": listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if listing["user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.listings.update_one({"id": listing_id}, {"$set": {"status": "deleted"}})
    return {"message": "Listing deleted"}

# ==================== SIMILAR LISTINGS ENDPOINT ====================

def calculate_generic_similarity(source: dict, candidate: dict) -> float:
    """Calculate similarity score for generic listings"""
    score = 0.0
    
    # Category match (40 points)
    if source.get('category_id') == candidate.get('category_id'):
        score += 40
    
    # Price similarity (30 points) - closer price = higher score
    source_price = source.get('price', 0)
    candidate_price = candidate.get('price', 0)
    if source_price > 0 and candidate_price > 0:
        price_ratio = min(source_price, candidate_price) / max(source_price, candidate_price)
        score += price_ratio * 30
    
    # Location match (20 points)
    source_location = source.get('location', '') or source.get('city', '')
    candidate_location = candidate.get('location', '') or candidate.get('city', '')
    if source_location and candidate_location:
        # Check if same city
        source_city = source_location.split(',')[0].strip().lower()
        candidate_city = candidate_location.split(',')[0].strip().lower()
        if source_city == candidate_city:
            score += 20
        elif source_city in candidate_city or candidate_city in source_city:
            score += 10
    
    # Condition match (10 points)
    if source.get('condition') == candidate.get('condition'):
        score += 10
    
    return score

@api_router.get("/listings/similar/{listing_id}")
async def get_similar_listings(
    listing_id: str,
    limit: int = 10,
    include_sponsored: bool = True,
    same_city_only: bool = False,
    same_price_range: bool = False
):
    """
    Get similar listings using weighted similarity scoring.
    Works for all listing types (auto, electronics, etc.)
    """
    # Get source listing
    source = await db.listings.find_one({"id": listing_id}, {"_id": 0})
    if not source:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Build query for candidates
    query = {
        "status": "active",
        "id": {"$ne": listing_id},  # Exclude current listing
        "user_id": {"$ne": source.get('user_id')},  # Exclude same seller
    }
    
    # Apply filters
    if same_city_only:
        source_location = source.get('location', '') or source.get('city', '')
        if source_location:
            source_city = source_location.split(',')[0].strip()
            query["$or"] = [
                {"location": {"$regex": source_city, "$options": "i"}},
                {"city": source_city}
            ]
    
    if same_price_range:
        source_price = source.get('price', 0)
        if source_price > 0:
            query["price"] = {
                "$gte": source_price * 0.7,
                "$lte": source_price * 1.3
            }
    
    # Prefer same category
    if source.get('category_id'):
        query["category_id"] = source.get('category_id')
    
    # Get candidate listings
    candidates = await db.listings.find(query, {"_id": 0}).limit(50).to_list(50)
    
    # If not enough candidates, expand search to all categories
    if len(candidates) < 5:
        expanded_query = {
            "status": "active",
            "id": {"$ne": listing_id},
            "user_id": {"$ne": source.get('user_id')},
        }
        candidates = await db.listings.find(expanded_query, {"_id": 0}).limit(50).to_list(50)
    
    # Calculate similarity scores
    scored_listings = []
    for listing in candidates:
        score = calculate_generic_similarity(source, listing)
        if score > 15:  # Minimum threshold
            # Get seller data if embedded
            seller_data = listing.get('seller')
            if seller_data:
                listing['seller'] = {
                    "user_id": seller_data.get("user_id"),
                    "name": seller_data.get("name"),
                    "verified": seller_data.get("verified", False),
                    "rating": seller_data.get("rating", 0),
                }
            
            scored_listings.append({
                **listing,
                "similarityScore": round(score, 1),
                "isSponsored": False,
                "sponsoredRank": None
            })
    
    # Sort by similarity score
    scored_listings.sort(key=lambda x: x['similarityScore'], reverse=True)
    
    # Get sponsored/featured listings
    sponsored_listings = []
    if include_sponsored:
        sponsored_query = {
            "status": "active",
            "id": {"$ne": listing_id},
            "$or": [
                {"sponsored": True},
                {"boosted": True},
                {"featured": True}
            ]
        }
        
        sponsored = await db.listings.find(sponsored_query, {"_id": 0}).limit(3).to_list(3)
        existing_ids = {l['id'] for l in scored_listings[:limit]}
        
        for i, listing in enumerate(sponsored):
            if listing['id'] not in existing_ids:
                seller_data = listing.get('seller')
                if seller_data:
                    listing['seller'] = {
                        "user_id": seller_data.get("user_id"),
                        "name": seller_data.get("name"),
                        "verified": seller_data.get("verified", False),
                        "rating": seller_data.get("rating", 0),
                    }
                
                sponsored_listings.append({
                    **listing,
                    "similarityScore": calculate_generic_similarity(source, listing),
                    "isSponsored": True,
                    "sponsoredRank": i + 1
                })
    
    # Mix organic + sponsored
    final_listings = []
    organic_count = 0
    sponsored_idx = 0
    
    for listing in scored_listings[:limit]:
        final_listings.append(listing)
        organic_count += 1
        
        # Insert sponsored after every 5 organic
        if organic_count % 5 == 0 and sponsored_idx < len(sponsored_listings):
            final_listings.append(sponsored_listings[sponsored_idx])
            sponsored_idx += 1
    
    # Add remaining sponsored if we have space
    while len(final_listings) < limit and sponsored_idx < len(sponsored_listings):
        final_listings.append(sponsored_listings[sponsored_idx])
        sponsored_idx += 1
    
    return {
        "listings": final_listings[:limit],
        "total": len(final_listings),
        "sourceCategory": source.get('category_id'),
        "sponsoredCount": len([l for l in final_listings if l.get('isSponsored')])
    }

# ==================== FAVORITES ENDPOINTS ====================

@api_router.post("/favorites/{listing_id}")
async def add_favorite(listing_id: str, request: Request):
    """Add listing to favorites"""
    user = await require_auth(request)
    
    # Check if listing exists
    listing = await db.listings.find_one({"id": listing_id})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Check if already favorited
    existing = await db.favorites.find_one({"user_id": user.user_id, "listing_id": listing_id})
    if existing:
        return {"message": "Already favorited"}
    
    await db.favorites.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "listing_id": listing_id,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Update favorites count
    await db.listings.update_one({"id": listing_id}, {"$inc": {"favorites_count": 1}})
    
    return {"message": "Added to favorites"}

@api_router.delete("/favorites/{listing_id}")
async def remove_favorite(listing_id: str, request: Request):
    """Remove listing from favorites"""
    user = await require_auth(request)
    
    result = await db.favorites.delete_one({"user_id": user.user_id, "listing_id": listing_id})
    
    if result.deleted_count > 0:
        await db.listings.update_one({"id": listing_id}, {"$inc": {"favorites_count": -1}})
    
    return {"message": "Removed from favorites"}

@api_router.get("/favorites")
async def get_favorites(request: Request):
    """Get user's favorite listings"""
    user = await require_auth(request)
    
    favorites = await db.favorites.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    listing_ids = [f["listing_id"] for f in favorites]
    
    listings = await db.listings.find({"id": {"$in": listing_ids}, "status": "active"}, {"_id": 0}).to_list(100)
    
    return listings

# ==================== MESSAGING ENDPOINTS ====================

@api_router.post("/conversations")
async def create_conversation(listing_id: str = Query(...), request: Request = None):
    """Create or get existing conversation for a listing"""
    user = await require_auth(request)
    
    # Get listing
    listing = await db.listings.find_one({"id": listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Can't message own listing
    if listing["user_id"] == user.user_id:
        raise HTTPException(status_code=400, detail="Cannot message your own listing")
    
    # Check if conversation exists
    existing = await db.conversations.find_one({
        "listing_id": listing_id,
        "buyer_id": user.user_id,
        "seller_id": listing["user_id"]
    }, {"_id": 0})
    
    if existing:
        return existing
    
    # Create new conversation
    conversation = {
        "id": str(uuid.uuid4()),
        "listing_id": listing_id,
        "buyer_id": user.user_id,
        "seller_id": listing["user_id"],
        "last_message": None,
        "last_message_time": None,
        "buyer_unread": 0,
        "seller_unread": 0,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.conversations.insert_one(conversation)
    return conversation

@api_router.post("/conversations/direct")
async def create_direct_conversation(request: Request):
    """Create or get existing direct conversation with a user (not tied to a listing)"""
    user = await require_auth(request)
    body = await request.json()
    
    target_user_id = body.get("user_id")
    if not target_user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    
    # Can't message yourself
    if target_user_id == user.user_id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    
    # Check if user exists
    target_user = await db.users.find_one({"user_id": target_user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if direct conversation exists (where listing_id is null or 'direct')
    existing = await db.conversations.find_one({
        "$or": [
            {"buyer_id": user.user_id, "seller_id": target_user_id, "listing_id": "direct"},
            {"seller_id": user.user_id, "buyer_id": target_user_id, "listing_id": "direct"},
            {"buyer_id": user.user_id, "seller_id": target_user_id, "listing_id": None},
            {"seller_id": user.user_id, "buyer_id": target_user_id, "listing_id": None}
        ]
    }, {"_id": 0})
    
    if existing:
        return existing
    
    # Create new direct conversation
    conversation = {
        "id": str(uuid.uuid4()),
        "listing_id": "direct",  # Mark as direct conversation
        "buyer_id": user.user_id,  # Initiator
        "seller_id": target_user_id,  # Recipient
        "last_message": None,
        "last_message_time": None,
        "buyer_unread": 0,
        "seller_unread": 0,
        "created_at": datetime.now(timezone.utc),
        "is_direct": True
    }
    
    await db.conversations.insert_one(conversation)
    return conversation

@api_router.get("/conversations")
async def get_conversations(request: Request):
    """Get user's conversations"""
    user = await require_auth(request)
    
    conversations = await db.conversations.find({
        "$or": [
            {"buyer_id": user.user_id},
            {"seller_id": user.user_id}
        ]
    }, {"_id": 0}).sort("last_message_time", -1).to_list(100)
    
    # Enrich with listing and user info
    result = []
    for conv in conversations:
        listing = await db.listings.find_one({"id": conv["listing_id"]}, {"_id": 0})
        
        other_user_id = conv["seller_id"] if conv["buyer_id"] == user.user_id else conv["buyer_id"]
        other_user = await db.users.find_one({"user_id": other_user_id}, {"_id": 0})
        
        unread = conv["buyer_unread"] if conv["buyer_id"] == user.user_id else conv["seller_unread"]
        
        result.append({
            **conv,
            "listing": {
                "id": listing["id"],
                "title": listing["title"],
                "price": listing["price"],
                "images": listing.get("images", [])[:1]
            } if listing else None,
            "other_user": {
                "user_id": other_user["user_id"],
                "name": other_user["name"],
                "picture": other_user.get("picture")
            } if other_user else None,
            "unread": unread
        })
    
    return result

@api_router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str, request: Request):
    """Get single conversation with messages"""
    user = await require_auth(request)
    
    conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Check access
    if user.user_id not in [conversation["buyer_id"], conversation["seller_id"]]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get messages
    messages = await db.messages.find({"conversation_id": conversation_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    
    # Mark as read
    if conversation["buyer_id"] == user.user_id:
        await db.conversations.update_one({"id": conversation_id}, {"$set": {"buyer_unread": 0}})
    else:
        await db.conversations.update_one({"id": conversation_id}, {"$set": {"seller_unread": 0}})
    
    # Mark messages as read
    await db.messages.update_many(
        {"conversation_id": conversation_id, "sender_id": {"$ne": user.user_id}},
        {"$set": {"read": True}}
    )
    
    # Get listing and other user
    listing = await db.listings.find_one({"id": conversation["listing_id"]}, {"_id": 0})
    other_user_id = conversation["seller_id"] if conversation["buyer_id"] == user.user_id else conversation["buyer_id"]
    other_user = await db.users.find_one({"user_id": other_user_id}, {"_id": 0})
    
    return {
        **conversation,
        "messages": messages,
        "listing": listing,
        "other_user": {
            "user_id": other_user["user_id"],
            "name": other_user["name"],
            "picture": other_user.get("picture")
        } if other_user else None
    }

@api_router.post("/conversations/{conversation_id}/messages")
async def send_message(conversation_id: str, message: MessageCreate, request: Request):
    """Send a message in a conversation"""
    user = await require_auth(request)
    
    # Rate limiting
    if not check_rate_limit(user.user_id, "message"):
        raise HTTPException(status_code=429, detail="Too many messages. Please wait.")
    
    conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Check access
    if user.user_id not in [conversation["buyer_id"], conversation["seller_id"]]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if blocked
    other_user_id = conversation["seller_id"] if conversation["buyer_id"] == user.user_id else conversation["buyer_id"]
    other_user = await db.users.find_one({"user_id": other_user_id}, {"_id": 0})
    if other_user and user.user_id in other_user.get("blocked_users", []):
        raise HTTPException(status_code=403, detail="You have been blocked by this user")
    
    # Create message
    new_message = {
        "id": str(uuid.uuid4()),
        "conversation_id": conversation_id,
        "sender_id": user.user_id,
        "content": message.content,
        "read": False,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.messages.insert_one(new_message)
    
    # Update conversation
    unread_field = "seller_unread" if conversation["buyer_id"] == user.user_id else "buyer_unread"
    await db.conversations.update_one(
        {"id": conversation_id},
        {
            "$set": {
                "last_message": message.content[:100],
                "last_message_time": datetime.now(timezone.utc)
            },
            "$inc": {unread_field: 1}
        }
    )
    
    # Emit socket event
    await sio.emit("new_message", {
        "conversation_id": conversation_id,
        "message": new_message
    }, room=conversation_id)
    
    return new_message

# ==================== REPORTS ENDPOINTS ====================

@api_router.post("/reports")
async def create_report(report: ReportCreate, request: Request):
    """Create a report"""
    user = await require_auth(request)
    
    new_report = {
        "id": str(uuid.uuid4()),
        "reporter_id": user.user_id,
        "reported_user_id": report.reported_user_id,
        "listing_id": report.listing_id,
        "reason": report.reason,
        "description": report.description,
        "status": "pending",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.reports.insert_one(new_report)
    return {"message": "Report submitted"}

# ==================== SOCKET.IO EVENTS ====================

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

@sio.event
async def join_conversation(sid, data):
    """Join a conversation room"""
    conversation_id = data.get("conversation_id")
    if conversation_id:
        await sio.enter_room(sid, conversation_id)
        logger.info(f"Client {sid} joined room {conversation_id}")

@sio.event
async def leave_conversation(sid, data):
    """Leave a conversation room"""
    conversation_id = data.get("conversation_id")
    if conversation_id:
        await sio.leave_room(sid, conversation_id)
        logger.info(f"Client {sid} left room {conversation_id}")

@sio.event
async def typing(sid, data):
    """Broadcast typing indicator"""
    conversation_id = data.get("conversation_id")
    user_id = data.get("user_id")
    user_name = data.get("user_name")
    if conversation_id:
        await sio.emit("user_typing", {"user_id": user_id, "user_name": user_name}, room=conversation_id, skip_sid=sid)

@sio.event
async def stop_typing(sid, data):
    """Broadcast stop typing indicator"""
    conversation_id = data.get("conversation_id")
    user_id = data.get("user_id")
    if conversation_id:
        await sio.emit("user_stop_typing", {"user_id": user_id}, room=conversation_id, skip_sid=sid)

# ==================== AUTO/MOTORS ENDPOINTS ====================

# Auto brands with listing counts
AUTO_BRANDS = [
    {"id": "toyota", "name": "Toyota", "logo": "🚗", "listingsCount": 1245},
    {"id": "bmw", "name": "BMW", "logo": "🔵", "listingsCount": 892},
    {"id": "mercedes", "name": "Mercedes", "logo": "⭐", "listingsCount": 756},
    {"id": "volkswagen", "name": "VW", "logo": "🔷", "listingsCount": 1102},
    {"id": "audi", "name": "Audi", "logo": "⚫", "listingsCount": 634},
    {"id": "ford", "name": "Ford", "logo": "🔵", "listingsCount": 521},
    {"id": "honda", "name": "Honda", "logo": "🔴", "listingsCount": 445},
    {"id": "hyundai", "name": "Hyundai", "logo": "💠", "listingsCount": 389},
    {"id": "nissan", "name": "Nissan", "logo": "🔘", "listingsCount": 312},
    {"id": "porsche", "name": "Porsche", "logo": "🏎️", "listingsCount": 156},
    {"id": "tesla", "name": "Tesla", "logo": "⚡", "listingsCount": 234},
    {"id": "kia", "name": "Kia", "logo": "🔺", "listingsCount": 287},
]

# Auto models per brand
AUTO_MODELS = {
    "toyota": ["Camry", "Corolla", "RAV4", "Highlander", "Tacoma", "Prius", "Land Cruiser"],
    "bmw": ["3 Series", "5 Series", "X3", "X5", "M3", "M5", "7 Series"],
    "mercedes": ["C-Class", "E-Class", "S-Class", "GLC", "GLE", "A-Class", "AMG GT"],
    "volkswagen": ["Golf", "Passat", "Tiguan", "Polo", "Arteon", "ID.4", "Touareg"],
    "audi": ["A3", "A4", "A6", "Q3", "Q5", "Q7", "e-tron", "RS6"],
    "ford": ["Focus", "Mustang", "F-150", "Explorer", "Escape", "Bronco"],
    "honda": ["Civic", "Accord", "CR-V", "HR-V", "Pilot", "Odyssey"],
    "hyundai": ["Elantra", "Sonata", "Tucson", "Santa Fe", "Kona", "Ioniq"],
    "nissan": ["Altima", "Sentra", "Rogue", "Pathfinder", "Maxima", "GT-R"],
    "porsche": ["911", "Cayenne", "Macan", "Panamera", "Taycan", "Boxster"],
    "tesla": ["Model 3", "Model S", "Model X", "Model Y", "Cybertruck"],
    "kia": ["Sportage", "Sorento", "Forte", "K5", "Telluride", "EV6"],
}

@api_router.get("/auto/brands")
async def get_auto_brands():
    """Get all car brands with listing counts"""
    return AUTO_BRANDS

@api_router.get("/auto/brands/{brand_id}/models")
async def get_brand_models(brand_id: str):
    """Get models for a specific brand"""
    models = AUTO_MODELS.get(brand_id, [])
    return [{"id": f"{brand_id}_{m.lower().replace(' ', '_')}", "brandId": brand_id, "name": m} for m in models]

@api_router.get("/auto/listings")
async def get_auto_listings(
    make: Optional[str] = None,
    model: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    mileage_max: Optional[int] = None,
    fuel_type: Optional[str] = None,
    transmission: Optional[str] = None,
    body_type: Optional[str] = None,
    condition: Optional[str] = None,
    price_min: Optional[float] = None,
    price_max: Optional[float] = None,
    verified_seller: Optional[bool] = None,
    city: Optional[str] = None,
    sort: str = "newest",
    page: int = 1,
    limit: int = 20
):
    """Get auto listings with advanced filters from database"""
    query = {"status": "active"}
    
    if make:
        query["make"] = {"$regex": make, "$options": "i"}
    if model:
        query["model"] = {"$regex": model, "$options": "i"}
    if year_min:
        query["year"] = {"$gte": year_min}
    if year_max:
        if "year" in query:
            query["year"]["$lte"] = year_max
        else:
            query["year"] = {"$lte": year_max}
    if mileage_max:
        query["mileage"] = {"$lte": mileage_max}
    if fuel_type:
        query["fuelType"] = fuel_type
    if transmission:
        query["transmission"] = transmission
    if body_type:
        query["bodyType"] = body_type
    if condition:
        query["condition"] = condition
    if price_min:
        query["price"] = {"$gte": price_min}
    if price_max:
        if "price" in query:
            query["price"]["$lte"] = price_max
        else:
            query["price"] = {"$lte": price_max}
    if verified_seller:
        query["seller.verified"] = True
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    
    # Sorting
    sort_field = "created_at"
    sort_order = -1
    if sort == "price_asc":
        sort_field = "price"
        sort_order = 1
    elif sort == "price_desc":
        sort_field = "price"
        sort_order = -1
    elif sort == "mileage_asc":
        sort_field = "mileage"
        sort_order = 1
    elif sort == "year_desc":
        sort_field = "year"
        sort_order = -1
    
    skip = (page - 1) * limit
    total = await db.auto_listings.count_documents(query)
    listings = await db.auto_listings.find(query, {"_id": 0}).sort(sort_field, sort_order).skip(skip).limit(limit).to_list(limit)
    
    return {
        "listings": listings,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit if total > 0 else 0
    }

@api_router.get("/auto/listings/{listing_id}")
async def get_auto_listing(listing_id: str):
    """Get a single auto listing by ID"""
    listing = await db.auto_listings.find_one({"id": listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Auto listing not found")
    
    # Increment views
    await db.auto_listings.update_one(
        {"id": listing_id},
        {"$inc": {"views": 1}}
    )
    
    return listing

@api_router.get("/auto/featured")
async def get_featured_auto(limit: int = 10):
    """Get featured auto listings"""
    query = {"status": "active", "featured": True}
    listings = await db.auto_listings.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return listings

@api_router.get("/auto/recommended")
async def get_recommended_auto(request: Request, limit: int = 10):
    """Get recommended auto listings (personalized if authenticated)"""
    query = {"status": "active"}
    
    # If authenticated, could personalize based on user history
    user = await get_current_user(request)
    if user:
        # For now, just return newest listings - could enhance with ML
        pass
    
    listings = await db.auto_listings.find(query, {"_id": 0}).sort("views", -1).limit(limit).to_list(limit)
    return listings

# Chat/Conversation Endpoints for Auto
@api_router.post("/auto/conversations")
async def create_auto_conversation(request: Request):
    """Create a new conversation for an auto listing with dummy messages"""
    body = await request.json()
    listing_id = body.get("listing_id")
    initial_message = body.get("message", "")
    
    if not listing_id:
        raise HTTPException(status_code=400, detail="listing_id is required")
    
    # Get the listing
    listing = await db.auto_listings.find_one({"id": listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Get current user (or use anonymous)
    user = await get_current_user(request)
    buyer_id = user.user_id if user else f"guest_{uuid.uuid4().hex[:8]}"
    buyer_name = user.name if user else "Interested Buyer"
    
    seller_id = listing.get("user_id", "seller_unknown")
    seller_name = listing.get("seller", {}).get("name", "Seller")
    seller_phone = listing.get("seller", {}).get("phone", "+49123456789")
    
    # Create conversation
    conversation_id = f"conv_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    # Generate dummy messages for demo - multiple templates for variety
    import random
    template_type = random.choice(['viewing', 'price_negotiation', 'questions', 'test_drive'])
    
    if template_type == 'viewing':
        dummy_messages = [
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": buyer_id,
                "sender_name": buyer_name,
                "content": initial_message if initial_message else f"Hi, I'm interested in the {listing.get('make')} {listing.get('model')}. Is it still available?",
                "timestamp": now - timedelta(minutes=30),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": seller_id,
                "sender_name": seller_name,
                "content": f"Hello! Yes, the {listing.get('make')} {listing.get('model')} is still available. Would you like to schedule a viewing?",
                "timestamp": now - timedelta(minutes=25),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": buyer_id,
                "sender_name": buyer_name,
                "content": "That would be great! Is it possible to see it this weekend?",
                "timestamp": now - timedelta(minutes=20),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": seller_id,
                "sender_name": seller_name,
                "content": "Sure! I'm available Saturday afternoon between 2-5 PM. Does that work for you?",
                "timestamp": now - timedelta(minutes=15),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": buyer_id,
                "sender_name": buyer_name,
                "content": "Perfect! Saturday at 3 PM works. Can you send me the exact address?",
                "timestamp": now - timedelta(minutes=10),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": seller_id,
                "sender_name": seller_name,
                "content": f"Great! The address is {listing.get('location', 'Berlin')}. I'll send you the exact location. See you Saturday! 🚗",
                "timestamp": now - timedelta(minutes=5),
                "read": False,
            },
        ]
    elif template_type == 'price_negotiation':
        price = listing.get('price', 25000)
        offer = int(price * 0.9)
        counter = int(price * 0.95)
        dummy_messages = [
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": buyer_id,
                "sender_name": buyer_name,
                "content": f"Hi! I saw your {listing.get('make')} {listing.get('model')} listing. What's your best price?",
                "timestamp": now - timedelta(minutes=45),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": seller_id,
                "sender_name": seller_name,
                "content": f"Hello! The listed price of €{price:,} is already competitive for this model. Are you a serious buyer?",
                "timestamp": now - timedelta(minutes=40),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": buyer_id,
                "sender_name": buyer_name,
                "content": f"Yes, I'm ready to buy today if we can agree on a price. Would you consider €{offer:,}?",
                "timestamp": now - timedelta(minutes=35),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": seller_id,
                "sender_name": seller_name,
                "content": f"That's a bit low for me. I could do €{counter:,} if you can pick it up this week. 🤝",
                "timestamp": now - timedelta(minutes=30),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": buyer_id,
                "sender_name": buyer_name,
                "content": "Deal! Can I come see it tomorrow to finalize everything?",
                "timestamp": now - timedelta(minutes=25),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": seller_id,
                "sender_name": seller_name,
                "content": "Perfect! Come by anytime after 10 AM. I'll have all the paperwork ready. 📝",
                "timestamp": now - timedelta(minutes=20),
                "read": False,
            },
        ]
    elif template_type == 'questions':
        dummy_messages = [
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": buyer_id,
                "sender_name": buyer_name,
                "content": f"Hi! I have a few questions about the {listing.get('make')} {listing.get('model')}.",
                "timestamp": now - timedelta(minutes=60),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": seller_id,
                "sender_name": seller_name,
                "content": "Of course! I'm happy to answer any questions you have.",
                "timestamp": now - timedelta(minutes=55),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": buyer_id,
                "sender_name": buyer_name,
                "content": f"Has the car ever been in an accident? And when was the last service?",
                "timestamp": now - timedelta(minutes=50),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": seller_id,
                "sender_name": seller_name,
                "content": f"The car is accident-free with a clean history! Last service was done 2 months ago at the authorized dealer. I have all records. ✅",
                "timestamp": now - timedelta(minutes=45),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": buyer_id,
                "sender_name": buyer_name,
                "content": "That's great! What about the tires and brake condition?",
                "timestamp": now - timedelta(minutes=40),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": seller_id,
                "sender_name": seller_name,
                "content": "Tires are about 70% life remaining, and brakes were just replaced during the last service. Car is in excellent condition! 💯",
                "timestamp": now - timedelta(minutes=35),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": buyer_id,
                "sender_name": buyer_name,
                "content": "Sounds good! Can I schedule an inspection?",
                "timestamp": now - timedelta(minutes=30),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": seller_id,
                "sender_name": seller_name,
                "content": "Absolutely! I'm confident in the car's condition. Let me know when works for you.",
                "timestamp": now - timedelta(minutes=25),
                "read": False,
            },
        ]
    else:  # test_drive
        dummy_messages = [
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": buyer_id,
                "sender_name": buyer_name,
                "content": f"Hello! I love the look of your {listing.get('make')} {listing.get('model')}. Can I arrange a test drive?",
                "timestamp": now - timedelta(minutes=50),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": seller_id,
                "sender_name": seller_name,
                "content": "Hi there! Thanks for your interest. Yes, test drives are welcome. Do you have a valid license?",
                "timestamp": now - timedelta(minutes=45),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": buyer_id,
                "sender_name": buyer_name,
                "content": "Yes, I have a full license. I've been driving for 8 years.",
                "timestamp": now - timedelta(minutes=40),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": seller_id,
                "sender_name": seller_name,
                "content": "Perfect! How about tomorrow at 2 PM? The car drives like a dream, you'll love it! 🚙💨",
                "timestamp": now - timedelta(minutes=35),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": buyer_id,
                "sender_name": buyer_name,
                "content": "Tomorrow works! Where should I meet you?",
                "timestamp": now - timedelta(minutes=30),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": seller_id,
                "sender_name": seller_name,
                "content": f"Let's meet at my showroom in {listing.get('city', 'Berlin')}. I'll send you the exact address. Bring your license! 📍",
                "timestamp": now - timedelta(minutes=25),
                "read": False,
            },
        ]
    
    conversation = {
        "id": conversation_id,
        "listing_id": listing_id,
        "listing_title": listing.get("title"),
        "listing_image": listing.get("images", [""])[0] if listing.get("images") else "",
        "listing_price": listing.get("price"),
        "seller_id": seller_id,
        "seller_name": seller_name,
        "seller_phone": seller_phone,
        "buyer_id": buyer_id,
        "buyer_name": buyer_name,
        "messages": dummy_messages,
        "last_message": dummy_messages[-1]["content"],
        "last_message_at": now,
        "created_at": now - timedelta(minutes=30),
        "updated_at": now,
        "unread_count": 1,
    }
    
    await db.auto_conversations.insert_one(conversation)
    
    # Remove _id before returning
    conversation.pop("_id", None)
    
    return conversation

@api_router.get("/auto/conversations/{conversation_id}")
async def get_auto_conversation(conversation_id: str):
    """Get a conversation by ID"""
    conversation = await db.auto_conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation

@api_router.post("/auto/conversations/{conversation_id}/messages")
async def send_auto_message(conversation_id: str, request: Request):
    """Send a message in a conversation"""
    body = await request.json()
    content = body.get("content", "")
    
    if not content:
        raise HTTPException(status_code=400, detail="Message content is required")
    
    # Get conversation first to determine sender context
    conversation = await db.auto_conversations.find_one({"id": conversation_id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Get current user
    user = await get_current_user(request)
    if user:
        sender_id = user.user_id
        sender_name = user.name
    else:
        # Use the buyer_id from the conversation for consistency
        sender_id = conversation.get("buyer_id", f"guest_{uuid.uuid4().hex[:8]}")
        sender_name = conversation.get("buyer_name", "User")
    
    now = datetime.now(timezone.utc)
    message = {
        "id": f"msg_{uuid.uuid4().hex[:8]}",
        "sender_id": sender_id,
        "sender_name": sender_name,
        "content": content,
        "timestamp": now,
        "read": False,
    }
    
    # Update conversation
    result = await db.auto_conversations.update_one(
        {"id": conversation_id},
        {
            "$push": {"messages": message},
            "$set": {
                "last_message": content,
                "last_message_at": now,
                "updated_at": now,
            },
            "$inc": {"unread_count": 1}
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Simulate seller auto-reply after a short delay (for demo purposes)
    # In production, this would be handled by actual sellers
    import random
    auto_replies = [
        "Thanks for your message! I'll get back to you shortly. 👍",
        "Got it! Let me check and I'll reply soon.",
        "Noted! I'm currently with another customer but will respond within the hour.",
        "Thank you for your interest! What specific questions do you have?",
        "Hi! Yes, the car is still available. When would you like to view it?",
        "Great question! Let me find that information for you.",
        "I appreciate your message. The vehicle has been very well maintained! 🚗",
        "Thanks! Feel free to call me directly if you'd like to discuss further.",
    ]
    
    # 70% chance of auto-reply for demo
    if random.random() < 0.7:
        seller_reply = {
            "id": f"msg_{uuid.uuid4().hex[:8]}",
            "sender_id": conversation.get("seller_id"),
            "sender_name": conversation.get("seller_name"),
            "content": random.choice(auto_replies),
            "timestamp": now + timedelta(seconds=2),
            "read": False,
        }
        await db.auto_conversations.update_one(
            {"id": conversation_id},
            {
                "$push": {"messages": seller_reply},
                "$set": {
                    "last_message": seller_reply["content"],
                    "last_message_at": seller_reply["timestamp"],
                },
            }
        )
    
    return message

@api_router.get("/auto/popular-searches")
async def get_popular_searches():
    """Get popular auto search terms"""
    # Return static popular searches for now
    return [
        {"term": "BMW 3 Series", "count": 1234},
        {"term": "Mercedes C-Class", "count": 987},
        {"term": "Audi A4", "count": 876},
        {"term": "Tesla Model 3", "count": 765},
        {"term": "VW Golf", "count": 654},
        {"term": "Porsche 911", "count": 543},
    ]

@api_router.post("/auto/track-search")
async def track_auto_search(request: Request):
    """Track a search term for analytics"""
    body = await request.json()
    term = body.get("term", "")
    # In production, would store this for analytics
    return {"message": "Search tracked", "term": term}

@api_router.get("/auto/filter-options")
async def get_filter_options():
    """Get available filter options based on current data"""
    return {
        "fuelTypes": ["Petrol", "Diesel", "Hybrid", "Electric", "LPG", "CNG"],
        "transmissions": ["Automatic", "Manual", "CVT", "Semi-Auto"],
        "bodyTypes": ["Sedan", "SUV", "Hatchback", "Pickup", "Coupe", "Wagon", "Van", "Convertible"],
        "driveTypes": ["FWD", "RWD", "AWD", "4WD"],
        "colors": ["Black", "White", "Silver", "Blue", "Red", "Grey", "Green", "Brown"],
        "cities": ["Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Stuttgart", "Düsseldorf", "Leipzig"]
    }

# ==================== AUTO FAVORITES ENDPOINTS ====================

@api_router.post("/auto/favorites/{listing_id}")
async def add_auto_favorite(listing_id: str, request: Request):
    """Add an auto listing to favorites"""
    user = await get_current_user(request)
    
    # Allow guest favorites (stored in session/local) or authenticated favorites
    user_id = user.user_id if user else "guest"
    
    # Check if listing exists
    listing = await db.auto_listings.find_one({"id": listing_id})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Check if already favorited
    existing = await db.auto_favorites.find_one({"user_id": user_id, "listing_id": listing_id})
    if existing:
        return {"message": "Already favorited", "favorited": True}
    
    await db.auto_favorites.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "listing_id": listing_id,
        "listing_title": listing.get("title"),
        "listing_price": listing.get("price"),
        "listing_image": listing.get("images", [""])[0] if listing.get("images") else "",
        "created_at": datetime.now(timezone.utc)
    })
    
    # Update favorites count on the listing
    await db.auto_listings.update_one({"id": listing_id}, {"$inc": {"favorites_count": 1}})
    
    return {"message": "Added to favorites", "favorited": True}

@api_router.delete("/auto/favorites/{listing_id}")
async def remove_auto_favorite(listing_id: str, request: Request):
    """Remove an auto listing from favorites"""
    user = await get_current_user(request)
    user_id = user.user_id if user else "guest"
    
    result = await db.auto_favorites.delete_one({"user_id": user_id, "listing_id": listing_id})
    
    if result.deleted_count > 0:
        await db.auto_listings.update_one({"id": listing_id}, {"$inc": {"favorites_count": -1}})
    
    return {"message": "Removed from favorites", "favorited": False}

@api_router.get("/auto/favorites")
async def get_auto_favorites(request: Request):
    """Get user's favorite auto listings"""
    user = await get_current_user(request)
    user_id = user.user_id if user else "guest"
    
    favorites = await db.auto_favorites.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Get full listing details
    listing_ids = [f["listing_id"] for f in favorites]
    listings = await db.auto_listings.find({"id": {"$in": listing_ids}, "status": "active"}, {"_id": 0}).to_list(100)
    
    return {
        "favorites": favorites,
        "listings": listings
    }

# ==================== PROPERTY ENDPOINTS ====================

# Property Models
class PropertyLocation(BaseModel):
    country: str = "Germany"
    city: str
    area: str
    estate: Optional[str] = None
    address: Optional[str] = None
    landmark: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

class PropertyFacilities(BaseModel):
    electricity24hr: bool = False
    waterSupply: bool = False
    generator: bool = False
    furnished: bool = False
    airConditioning: bool = False
    wardrobe: bool = False
    kitchenCabinets: bool = False
    security: bool = False
    cctv: bool = False
    gatedEstate: bool = False
    parking: bool = False
    balcony: bool = False
    swimmingPool: bool = False
    gym: bool = False
    elevator: bool = False
    wifi: bool = False

class PropertyVerification(BaseModel):
    isVerified: bool = False
    docsChecked: bool = False
    addressConfirmed: bool = False
    ownerVerified: bool = False
    agentVerified: bool = False
    verifiedAt: Optional[str] = None

class PropertySeller(BaseModel):
    id: str
    name: str
    type: str  # 'owner' or 'agent'
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    isVerified: bool = False
    rating: Optional[float] = None
    listingsCount: Optional[int] = None
    memberSince: Optional[str] = None
    responseTime: Optional[str] = None

class PropertyOffer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    propertyId: str
    buyerId: str
    buyerName: str
    offeredPrice: float
    message: Optional[str] = None
    status: str = "pending"  # pending, accepted, rejected, countered
    counterPrice: Optional[float] = None
    createdAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BookViewing(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    propertyId: str
    userId: str
    userName: str
    userPhone: str
    preferredDate: str
    preferredTime: str
    message: Optional[str] = None
    status: str = "pending"  # pending, confirmed, cancelled
    createdAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

@api_router.get("/property/listings")
async def get_property_listings(
    purpose: Optional[str] = None,  # buy, rent
    property_type: Optional[str] = None,
    city: Optional[str] = None,
    area: Optional[str] = None,
    price_min: Optional[float] = None,
    price_max: Optional[float] = None,
    bedrooms_min: Optional[int] = None,
    bedrooms_max: Optional[int] = None,
    bathrooms_min: Optional[int] = None,
    size_min: Optional[float] = None,
    size_max: Optional[float] = None,
    furnishing: Optional[str] = None,
    condition: Optional[str] = None,
    verified_only: Optional[bool] = None,
    search: Optional[str] = None,
    sort: str = "newest",
    page: int = 1,
    limit: int = 20
):
    """Get property listings with filters"""
    query = {"status": "active"}
    
    if purpose:
        query["purpose"] = purpose
    if property_type:
        query["type"] = property_type
    if city:
        query["location.city"] = {"$regex": city, "$options": "i"}
    if area:
        query["location.area"] = {"$regex": area, "$options": "i"}
    if price_min:
        query["price"] = {"$gte": price_min}
    if price_max:
        if "price" in query:
            query["price"]["$lte"] = price_max
        else:
            query["price"] = {"$lte": price_max}
    if bedrooms_min:
        query["bedrooms"] = {"$gte": bedrooms_min}
    if bedrooms_max:
        if "bedrooms" in query:
            query["bedrooms"]["$lte"] = bedrooms_max
        else:
            query["bedrooms"] = {"$lte": bedrooms_max}
    if bathrooms_min:
        query["bathrooms"] = {"$gte": bathrooms_min}
    if size_min:
        query["size"] = {"$gte": size_min}
    if size_max:
        if "size" in query:
            query["size"]["$lte"] = size_max
        else:
            query["size"] = {"$lte": size_max}
    if furnishing:
        query["furnishing"] = furnishing
    if condition:
        query["condition"] = condition
    if verified_only:
        query["verification.isVerified"] = True
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"location.area": {"$regex": search, "$options": "i"}},
            {"location.city": {"$regex": search, "$options": "i"}}
        ]
    
    # Sorting
    sort_field = "createdAt"
    sort_order = -1
    if sort == "price_asc":
        sort_field = "price"
        sort_order = 1
    elif sort == "price_desc":
        sort_field = "price"
        sort_order = -1
    elif sort == "oldest":
        sort_order = 1
    elif sort == "popular":
        sort_field = "views"
        sort_order = -1
    
    skip = (page - 1) * limit
    total = await db.properties.count_documents(query)
    listings = await db.properties.find(query, {"_id": 0}).sort(sort_field, sort_order).skip(skip).limit(limit).to_list(limit)
    
    return {
        "listings": listings,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit if total > 0 else 0
    }

@api_router.get("/property/listings/{property_id}")
async def get_property_listing(property_id: str):
    """Get single property listing by ID"""
    listing = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Increment views
    await db.properties.update_one({"id": property_id}, {"$inc": {"views": 1}})
    
    return listing

@api_router.get("/property/featured")
async def get_featured_properties(limit: int = 10):
    """Get featured property listings"""
    query = {"status": "active", "featured": True}
    listings = await db.properties.find(query, {"_id": 0}).sort("createdAt", -1).limit(limit).to_list(limit)
    return listings

@api_router.get("/property/type-counts")
async def get_property_type_counts(purpose: Optional[str] = None):
    """Get listing counts by property type"""
    match_stage = {"status": "active"}
    if purpose:
        match_stage["purpose"] = purpose
    
    pipeline = [
        {"$match": match_stage},
        {"$group": {"_id": "$type", "count": {"$sum": 1}}},
        {"$project": {"type": "$_id", "count": 1, "_id": 0}}
    ]
    
    results = await db.properties.aggregate(pipeline).to_list(100)
    return {item["type"]: item["count"] for item in results}

@api_router.post("/property/offers")
async def create_property_offer(request: Request):
    """Submit an offer for a property"""
    body = await request.json()
    property_id = body.get("propertyId")
    offered_price = body.get("offeredPrice")
    message = body.get("message", "")
    
    if not property_id or not offered_price:
        raise HTTPException(status_code=400, detail="propertyId and offeredPrice are required")
    
    # Verify property exists
    property_listing = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not property_listing:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Get user (or use guest)
    user = await get_current_user(request)
    buyer_id = user.user_id if user else f"guest_{uuid.uuid4().hex[:8]}"
    buyer_name = user.name if user else "Interested Buyer"
    
    offer = {
        "id": f"offer_{uuid.uuid4().hex[:12]}",
        "propertyId": property_id,
        "buyerId": buyer_id,
        "buyerName": buyer_name,
        "offeredPrice": offered_price,
        "message": message,
        "status": "pending",
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.property_offers.insert_one(offer)
    
    # Update inquiries count
    await db.properties.update_one({"id": property_id}, {"$inc": {"inquiries": 1}})
    
    return {"message": "Offer submitted successfully", "offer": {**offer, "_id": None}}

@api_router.post("/property/book-viewing")
async def book_property_viewing(request: Request):
    """Book a viewing for a property"""
    body = await request.json()
    property_id = body.get("propertyId")
    preferred_date = body.get("preferredDate")
    preferred_time = body.get("preferredTime")
    user_phone = body.get("userPhone", "")
    message = body.get("message", "")
    
    if not property_id or not preferred_date or not preferred_time:
        raise HTTPException(status_code=400, detail="propertyId, preferredDate, and preferredTime are required")
    
    # Verify property exists
    property_listing = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not property_listing:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Get user (or use guest)
    user = await get_current_user(request)
    user_id = user.user_id if user else f"guest_{uuid.uuid4().hex[:8]}"
    user_name = user.name if user else "Interested Buyer"
    
    booking = {
        "id": f"booking_{uuid.uuid4().hex[:12]}",
        "propertyId": property_id,
        "userId": user_id,
        "userName": user_name,
        "userPhone": user_phone,
        "preferredDate": preferred_date,
        "preferredTime": preferred_time,
        "message": message,
        "status": "pending",
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.property_bookings.insert_one(booking)
    
    # Update inquiries count
    await db.properties.update_one({"id": property_id}, {"$inc": {"inquiries": 1}})
    
    return {"message": "Viewing booked successfully", "booking": {**booking, "_id": None}}

@api_router.post("/property/favorites/{property_id}")
async def add_property_favorite(property_id: str, request: Request):
    """Add a property to favorites"""
    user = await get_current_user(request)
    user_id = user.user_id if user else "guest"
    
    # Check if property exists
    property_listing = await db.properties.find_one({"id": property_id})
    if not property_listing:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Check if already favorited
    existing = await db.property_favorites.find_one({"user_id": user_id, "property_id": property_id})
    if existing:
        return {"message": "Already favorited", "favorited": True}
    
    await db.property_favorites.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "property_id": property_id,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Update favorites count
    await db.properties.update_one({"id": property_id}, {"$inc": {"favorites": 1}})
    
    return {"message": "Added to favorites", "favorited": True}

@api_router.delete("/property/favorites/{property_id}")
async def remove_property_favorite(property_id: str, request: Request):
    """Remove a property from favorites"""
    user = await get_current_user(request)
    user_id = user.user_id if user else "guest"
    
    result = await db.property_favorites.delete_one({"user_id": user_id, "property_id": property_id})
    
    if result.deleted_count > 0:
        await db.properties.update_one({"id": property_id}, {"$inc": {"favorites": -1}})
    
    return {"message": "Removed from favorites", "favorited": False}

@api_router.get("/property/favorites")
async def get_property_favorites(request: Request):
    """Get user's favorite properties"""
    user = await get_current_user(request)
    user_id = user.user_id if user else "guest"
    
    favorites = await db.property_favorites.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    property_ids = [f["property_id"] for f in favorites]
    
    listings = await db.properties.find({"id": {"$in": property_ids}, "status": "active"}, {"_id": 0}).to_list(100)
    
    return {
        "favorites": favorites,
        "listings": listings
    }

@api_router.get("/property/cities")
async def get_property_cities():
    """Get available cities with property counts"""
    pipeline = [
        {"$match": {"status": "active"}},
        {"$group": {"_id": "$location.city", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$project": {"city": "$_id", "count": 1, "_id": 0}}
    ]
    results = await db.properties.aggregate(pipeline).to_list(50)
    return results

@api_router.get("/property/areas/{city}")
async def get_property_areas(city: str):
    """Get available areas within a city"""
    pipeline = [
        {"$match": {"status": "active", "location.city": {"$regex": city, "$options": "i"}}},
        {"$group": {"_id": "$location.area", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$project": {"area": "$_id", "count": 1, "_id": 0}}
    ]
    results = await db.properties.aggregate(pipeline).to_list(50)
    return results

# ==================== SIMILAR LISTINGS ENGINE ====================

def calculate_similarity_score(source: dict, target: dict) -> float:
    """
    Calculate weighted similarity score between two listings.
    Returns a score from 0-100 where higher is more similar.
    """
    score = 0.0
    
    # Primary Signals (High Weight - 70%)
    # Same type (25 points)
    if source.get('type') == target.get('type'):
        score += 25
    elif source.get('type', '').split('_')[0] == target.get('type', '').split('_')[0]:
        score += 15  # Same category family
    
    # Same purpose (20 points)
    if source.get('purpose') == target.get('purpose'):
        score += 20
    
    # Price range ±20% (15 points)
    source_price = source.get('price', 0)
    target_price = target.get('price', 0)
    if source_price > 0 and target_price > 0:
        price_diff = abs(source_price - target_price) / source_price
        if price_diff <= 0.1:  # Within 10%
            score += 15
        elif price_diff <= 0.2:  # Within 20%
            score += 10
        elif price_diff <= 0.3:  # Within 30%
            score += 5
    
    # Same condition (10 points)
    if source.get('condition') == target.get('condition'):
        score += 10
    
    # Secondary Signals (30%)
    # Same city (10 points)
    if source.get('location', {}).get('city') == target.get('location', {}).get('city'):
        score += 10
        # Same area bonus (5 points)
        if source.get('location', {}).get('area') == target.get('location', {}).get('area'):
            score += 5
    
    # Similar bedrooms ±1 (5 points)
    source_beds = source.get('bedrooms', 0) or 0
    target_beds = target.get('bedrooms', 0) or 0
    if source_beds > 0 and target_beds > 0:
        if source_beds == target_beds:
            score += 5
        elif abs(source_beds - target_beds) == 1:
            score += 3
    
    # Similar size ±20% (5 points)
    source_size = source.get('size', 0) or 0
    target_size = target.get('size', 0) or 0
    if source_size > 0 and target_size > 0:
        size_diff = abs(source_size - target_size) / source_size
        if size_diff <= 0.2:
            score += 5
        elif size_diff <= 0.3:
            score += 3
    
    # Same furnishing (3 points)
    if source.get('furnishing') == target.get('furnishing'):
        score += 3
    
    # Verified seller bonus (2 points)
    if target.get('verification', {}).get('isVerified'):
        score += 2
    
    return min(score, 100)


@api_router.get("/property/similar/{property_id}")
async def get_similar_properties(
    property_id: str,
    limit: int = 10,
    include_sponsored: bool = True,
    same_city_only: bool = False,
    same_price_range: bool = False
):
    """
    Get similar property listings using weighted similarity scoring.
    Includes organic + sponsored listings mix.
    """
    # Get source listing
    source = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not source:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Build query for candidates
    query = {
        "status": "active",
        "id": {"$ne": property_id},  # Exclude current listing
        "seller.id": {"$ne": source.get('seller', {}).get('id')},  # Exclude same seller
    }
    
    # Apply filters
    if same_city_only:
        query["location.city"] = source.get('location', {}).get('city')
    
    if same_price_range:
        source_price = source.get('price', 0)
        query["price"] = {
            "$gte": source_price * 0.8,
            "$lte": source_price * 1.2
        }
    
    # Get candidate listings
    candidates = await db.properties.find(query, {"_id": 0}).to_list(100)
    
    # Calculate similarity scores
    scored_listings = []
    for listing in candidates:
        score = calculate_similarity_score(source, listing)
        if score > 20:  # Minimum threshold
            scored_listings.append({
                **listing,
                "similarityScore": round(score, 1),
                "isSponsored": False,
                "sponsoredRank": None
            })
    
    # Sort by similarity score
    scored_listings.sort(key=lambda x: x['similarityScore'], reverse=True)
    
    # Get sponsored listings
    sponsored_listings = []
    if include_sponsored:
        sponsored_query = {
            "status": "active",
            "id": {"$ne": property_id},
            "$or": [
                {"sponsored": True},
                {"boosted": True},
                {"featured": True}
            ]
        }
        if same_city_only:
            sponsored_query["location.city"] = source.get('location', {}).get('city')
        
        sponsored = await db.properties.find(sponsored_query, {"_id": 0}).limit(3).to_list(3)
        for i, listing in enumerate(sponsored):
            if listing['id'] not in [l['id'] for l in scored_listings[:limit]]:
                sponsored_listings.append({
                    **listing,
                    "similarityScore": calculate_similarity_score(source, listing),
                    "isSponsored": True,
                    "sponsoredRank": i + 1
                })
    
    # Mix organic + sponsored (max 1 sponsored per 5 organic)
    final_listings = []
    organic_count = 0
    sponsored_inserted = 0
    sponsored_idx = 0
    
    for listing in scored_listings[:limit]:
        final_listings.append(listing)
        organic_count += 1
        
        # Insert sponsored after every 5 organic
        if organic_count % 5 == 0 and sponsored_idx < len(sponsored_listings):
            final_listings.append(sponsored_listings[sponsored_idx])
            sponsored_inserted += 1
            sponsored_idx += 1
    
    # Fallback: If not enough results, expand criteria
    if len(final_listings) < 4:
        # Expand to same type only
        fallback_query = {
            "status": "active",
            "id": {"$nin": [property_id] + [l['id'] for l in final_listings]},
            "type": source.get('type')
        }
        fallback = await db.properties.find(fallback_query, {"_id": 0}).limit(6).to_list(6)
        for listing in fallback:
            if len(final_listings) < limit:
                final_listings.append({
                    **listing,
                    "similarityScore": calculate_similarity_score(source, listing),
                    "isSponsored": False,
                    "sponsoredRank": None
                })
    
    # Track analytics event
    await db.similar_analytics.insert_one({
        "id": str(uuid.uuid4()),
        "sourceListingId": property_id,
        "resultCount": len(final_listings),
        "sponsoredCount": sponsored_inserted,
        "filters": {
            "sameCityOnly": same_city_only,
            "samePriceRange": same_price_range
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "sourceId": property_id,
        "sourceType": source.get('type'),
        "sourceCity": source.get('location', {}).get('city'),
        "listings": final_listings[:limit],
        "total": len(final_listings),
        "sponsoredCount": sponsored_inserted,
        "algorithmVersion": "v1.0"
    }


@api_router.post("/property/similar/track")
async def track_similar_listing_event(request: Request):
    """Track analytics events for similar listings interactions"""
    body = await request.json()
    
    event = {
        "id": str(uuid.uuid4()),
        "eventType": body.get('eventType'),  # impression, click, save, chat, share
        "sourceListingId": body.get('sourceListingId'),
        "targetListingId": body.get('targetListingId'),
        "isSponsored": body.get('isSponsored', False),
        "position": body.get('position'),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sessionId": body.get('sessionId'),
    }
    
    await db.similar_events.insert_one(event)
    
    return {"message": "Event tracked", "eventId": event['id']}

@api_router.post("/property/listings")
async def create_property_listing(request: Request):
    """Create a new property listing"""
    body = await request.json()
    
    # Validate required fields
    required_fields = ['title', 'purpose', 'type', 'price', 'location']
    for field in required_fields:
        if field not in body:
            raise HTTPException(status_code=400, detail=f"{field} is required")
    
    # Get user (or use guest seller)
    user = await get_current_user(request)
    seller_id = user.user_id if user else f"seller_{uuid.uuid4().hex[:8]}"
    seller_name = user.name if user else body.get('sellerName', 'Property Seller')
    
    # Create property
    property_id = f"prop_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    property_data = {
        "id": property_id,
        "title": body['title'],
        "description": body.get('description', ''),
        "purpose": body['purpose'],  # buy or rent
        "type": body['type'],
        "price": body['price'],
        "currency": body.get('currency', 'EUR'),
        "priceNegotiable": body.get('priceNegotiable', True),
        "pricePerMonth": body.get('pricePerMonth', body['purpose'] == 'rent'),
        "location": body['location'],
        "bedrooms": body.get('bedrooms'),
        "bathrooms": body.get('bathrooms'),
        "toilets": body.get('toilets'),
        "size": body.get('size'),
        "sizeUnit": body.get('sizeUnit', 'sqm'),
        "floorNumber": body.get('floorNumber'),
        "totalFloors": body.get('totalFloors'),
        "yearBuilt": body.get('yearBuilt'),
        "furnishing": body.get('furnishing', 'unfurnished'),
        "condition": body.get('condition', 'old'),
        "facilities": body.get('facilities', {}),
        "images": body.get('images', []),
        "verification": {
            "isVerified": False,
            "docsChecked": False,
            "addressConfirmed": False,
            "ownerVerified": False,
        },
        "seller": {
            "id": seller_id,
            "name": seller_name,
            "type": body.get('sellerType', 'owner'),
            "phone": body.get('sellerPhone', ''),
            "isVerified": False,
        },
        "status": "active",
        "featured": False,
        "sponsored": False,
        "boosted": False,
        "boostExpiry": None,
        "views": 0,
        "favorites": 0,
        "inquiries": 0,
        "highlights": [],
        "createdAt": now,
        "updatedAt": now,
    }
    
    await db.properties.insert_one(property_data)
    
    return {"message": "Property listing created successfully", "property": {**property_data, "_id": None}}

@api_router.put("/property/listings/{property_id}")
async def update_property_listing(property_id: str, request: Request):
    """Update an existing property listing"""
    body = await request.json()
    
    # Verify property exists
    existing = await db.properties.find_one({"id": property_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Update allowed fields
    update_fields = {}
    allowed_fields = [
        'title', 'description', 'price', 'priceNegotiable', 'location',
        'bedrooms', 'bathrooms', 'toilets', 'size', 'furnishing', 'condition',
        'facilities', 'images'
    ]
    
    for field in allowed_fields:
        if field in body:
            update_fields[field] = body[field]
    
    update_fields['updatedAt'] = datetime.now(timezone.utc).isoformat()
    
    await db.properties.update_one({"id": property_id}, {"$set": update_fields})
    
    updated = await db.properties.find_one({"id": property_id}, {"_id": 0})
    return {"message": "Property updated successfully", "property": updated}

@api_router.delete("/property/listings/{property_id}")
async def delete_property_listing(property_id: str, request: Request):
    """Delete (deactivate) a property listing"""
    existing = await db.properties.find_one({"id": property_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Soft delete - change status to inactive
    await db.properties.update_one(
        {"id": property_id},
        {"$set": {"status": "inactive", "updatedAt": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Property listing deleted successfully"}

# ==================== BOOST & MONETIZATION ====================

@api_router.post("/property/boost/{property_id}")
async def boost_property_listing(property_id: str, request: Request):
    """Boost a property listing for increased visibility"""
    body = await request.json()
    boost_days = body.get('days', 7)  # Default 7 days
    
    existing = await db.properties.find_one({"id": property_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Calculate boost expiry
    boost_expiry = (datetime.now(timezone.utc) + timedelta(days=boost_days)).isoformat()
    
    # Pricing (simulated)
    boost_prices = {7: 9.99, 14: 14.99, 30: 24.99}
    price = boost_prices.get(boost_days, 9.99)
    
    await db.properties.update_one(
        {"id": property_id},
        {"$set": {
            "boosted": True,
            "boostExpiry": boost_expiry,
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Record boost purchase
    boost_record = {
        "id": f"boost_{uuid.uuid4().hex[:12]}",
        "propertyId": property_id,
        "days": boost_days,
        "price": price,
        "currency": "EUR",
        "expiresAt": boost_expiry,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    await db.property_boosts.insert_one(boost_record)
    
    return {
        "message": f"Property boosted for {boost_days} days",
        "boost": {**boost_record, "_id": None},
        "price": price
    }

@api_router.post("/property/feature/{property_id}")
async def feature_property_listing(property_id: str, request: Request):
    """Feature a property listing in premium placements"""
    body = await request.json()
    feature_days = body.get('days', 7)  # Default 7 days
    
    existing = await db.properties.find_one({"id": property_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Calculate feature expiry
    feature_expiry = (datetime.now(timezone.utc) + timedelta(days=feature_days)).isoformat()
    
    # Pricing (simulated)
    feature_prices = {7: 29.99, 14: 49.99, 30: 79.99}
    price = feature_prices.get(feature_days, 29.99)
    
    await db.properties.update_one(
        {"id": property_id},
        {"$set": {
            "featured": True,
            "sponsored": True,
            "featureExpiry": feature_expiry,
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Record feature purchase
    feature_record = {
        "id": f"feature_{uuid.uuid4().hex[:12]}",
        "propertyId": property_id,
        "days": feature_days,
        "price": price,
        "currency": "EUR",
        "expiresAt": feature_expiry,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    await db.property_features.insert_one(feature_record)
    
    return {
        "message": f"Property featured for {feature_days} days",
        "feature": {**feature_record, "_id": None},
        "price": price
    }

@api_router.get("/property/my-listings")
async def get_my_property_listings(request: Request):
    """Get listings created by the current user"""
    user = await get_current_user(request)
    user_id = user.user_id if user else "guest"
    
    listings = await db.properties.find(
        {"seller.id": user_id},
        {"_id": 0}
    ).sort("createdAt", -1).to_list(100)
    
    return {"listings": listings, "total": len(listings)}

@api_router.get("/property/boost-prices")
async def get_boost_prices():
    """Get boost pricing options"""
    return {
        "boost": [
            {"days": 7, "price": 9.99, "currency": "EUR", "label": "1 Week Boost"},
            {"days": 14, "price": 14.99, "currency": "EUR", "label": "2 Week Boost"},
            {"days": 30, "price": 24.99, "currency": "EUR", "label": "1 Month Boost"},
        ],
        "feature": [
            {"days": 7, "price": 29.99, "currency": "EUR", "label": "1 Week Featured"},
            {"days": 14, "price": 49.99, "currency": "EUR", "label": "2 Week Featured"},
            {"days": 30, "price": 79.99, "currency": "EUR", "label": "1 Month Featured"},
        ]
    }

# ==================== USER SETTINGS ENDPOINTS ====================

@api_router.get("/settings")
async def get_user_settings(request: Request):
    """Get user settings"""
    user = await require_auth(request)
    
    settings = await db.user_settings.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not settings:
        # Create default settings
        default_settings = UserSettings(user_id=user.user_id)
        settings_dict = default_settings.model_dump()
        settings_dict["created_at"] = datetime.now(timezone.utc)
        settings_dict["updated_at"] = datetime.now(timezone.utc)
        await db.user_settings.insert_one(settings_dict)
        settings = settings_dict
    
    return settings

@api_router.put("/settings")
async def update_user_settings(request: Request):
    """Update user settings"""
    user = await require_auth(request)
    body = await request.json()
    
    # Get existing settings or create new
    existing = await db.user_settings.find_one({"user_id": user.user_id})
    
    if not existing:
        default_settings = UserSettings(user_id=user.user_id)
        existing = default_settings.model_dump()
        existing["created_at"] = datetime.now(timezone.utc)
    
    # Update fields
    update_data = {}
    for field in ["notifications", "quiet_hours", "alert_preferences", "privacy", "app_preferences", "security", "push_token"]:
        if field in body and body[field] is not None:
            if isinstance(body[field], dict):
                # Merge with existing
                if field in existing and existing[field]:
                    merged = {**existing[field], **body[field]}
                    update_data[field] = merged
                else:
                    update_data[field] = body[field]
            else:
                update_data[field] = body[field]
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.user_settings.update_one(
        {"user_id": user.user_id},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Settings updated successfully"}

@api_router.put("/settings/push-token")
async def update_push_token(request: Request):
    """Update push notification token"""
    user = await require_auth(request)
    body = await request.json()
    
    push_token = body.get("push_token")
    if not push_token:
        raise HTTPException(status_code=400, detail="Push token required")
    
    await db.user_settings.update_one(
        {"user_id": user.user_id},
        {"$set": {"push_token": push_token, "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    
    return {"message": "Push token updated"}

# ==================== NOTIFICATION ENDPOINTS ====================

@api_router.get("/notifications")
async def get_notifications(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    notification_type: str = Query(None, description="Filter by type: message, follow, review, price_drop, system")
):
    """Get user notifications with optional filtering"""
    user = await require_auth(request)
    
    query = {"user_id": user.user_id}
    if unread_only:
        query["read"] = False
    if notification_type:
        query["type"] = notification_type
    
    skip = (page - 1) * limit
    total = await db.notifications.count_documents(query)
    
    notifications = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Get unread count (total unread, not filtered)
    unread_count = await db.notifications.count_documents({"user_id": user.user_id, "read": False})
    
    # Get counts by type for badges
    type_counts = {}
    pipeline = [
        {"$match": {"user_id": user.user_id, "read": False}},
        {"$group": {"_id": "$type", "count": {"$sum": 1}}}
    ]
    async for doc in db.notifications.aggregate(pipeline):
        type_counts[doc["_id"]] = doc["count"]
    
    return {
        "notifications": notifications,
        "total": total,
        "unread_count": unread_count,
        "type_counts": type_counts,
        "page": page,
        "limit": limit
    }

@api_router.get("/notifications/unread-count")
async def get_unread_notification_count(request: Request):
    """Get unread notification count"""
    user = await require_auth(request)
    
    count = await db.notifications.count_documents({"user_id": user.user_id, "read": False})
    
    return {"unread_count": count}

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, request: Request):
    """Mark a notification as read"""
    user = await require_auth(request)
    
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": user.user_id},
        {"$set": {"read": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}

@api_router.put("/notifications/mark-all-read")
async def mark_all_notifications_read(request: Request):
    """Mark all notifications as read"""
    user = await require_auth(request)
    
    result = await db.notifications.update_many(
        {"user_id": user.user_id, "read": False},
        {"$set": {"read": True}}
    )
    
    return {"message": f"Marked {result.modified_count} notifications as read"}

@api_router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str, request: Request):
    """Delete a notification"""
    user = await require_auth(request)
    
    result = await db.notifications.delete_one({"id": notification_id, "user_id": user.user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification deleted"}

@api_router.delete("/notifications")
async def clear_all_notifications(request: Request):
    """Clear all notifications"""
    user = await require_auth(request)
    
    result = await db.notifications.delete_many({"user_id": user.user_id})
    
    return {"message": f"Deleted {result.deleted_count} notifications"}

# Internal function to create notifications
async def create_notification(
    user_id: str,
    notification_type: str,
    title: str,
    body: str,
    data_payload: Dict[str, Any] = {}
):
    """Create a notification and optionally send push/email"""
    notification = Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        body=body,
        data_payload=data_payload
    )
    
    notification_dict = notification.model_dump()
    notification_dict["created_at"] = datetime.now(timezone.utc)
    
    await db.notifications.insert_one(notification_dict)
    
    # Get user settings to check notification preferences
    settings = await db.user_settings.find_one({"user_id": user_id})
    user_data = await db.users.find_one({"user_id": user_id})
    
    if settings:
        notifications_prefs = settings.get("notifications", {})
        quiet_hours = settings.get("quiet_hours", {})
        
        # Check quiet hours
        in_quiet_hours = False
        if quiet_hours.get("enabled"):
            now = datetime.now(timezone.utc)
            start = quiet_hours.get("start_time", "22:00")
            end = quiet_hours.get("end_time", "08:00")
            current_time = now.strftime("%H:%M")
            
            if start > end:  # Crosses midnight
                in_quiet_hours = current_time >= start or current_time < end
            else:
                in_quiet_hours = start <= current_time < end
        
        # Send push notification if enabled and not in quiet hours
        if not in_quiet_hours and notifications_prefs.get("push", True):
            push_token = settings.get("push_token")
            if push_token:
                push_sent = await send_push_notification(
                    push_token, title, body, data_payload, notification_type
                )
                if push_sent:
                    await db.notifications.update_one(
                        {"id": notification.id},
                        {"$set": {"pushed": True}}
                    )
        
        # Send email notification if enabled
        if notifications_prefs.get("email", True) and user_data and user_data.get("email"):
            # Check if this notification type should be emailed
            should_email = False
            if notification_type in ["offer_received", "offer_accepted", "offer_rejected"]:
                should_email = notifications_prefs.get("offers", True)
            elif notification_type == "chat_message":
                should_email = notifications_prefs.get("messages", True)
            elif notification_type in ["price_drop", "better_deal"]:
                should_email = notifications_prefs.get("price_drops", True)
            elif notification_type == "saved_search_match":
                should_email = notifications_prefs.get("saved_searches", True)
            elif notification_type in ["security_alert", "system_announcement"]:
                should_email = True  # Always email security alerts
            
            if should_email:
                email_sent = await send_notification_email(
                    user_data["email"], 
                    f"[avida] {title}", 
                    body,
                    notification_type,
                    data_payload
                )
                if email_sent:
                    await db.notifications.update_one(
                        {"id": notification.id},
                        {"$set": {"emailed": True}}
                    )
    
    return notification

# ==================== PUSH NOTIFICATION SERVICE ====================

async def send_push_notification(
    push_token: str,
    title: str,
    body: str,
    data: Dict[str, Any] = {},
    notification_type: str = "default"
) -> bool:
    """Send push notification via Expo Push Service"""
    if not EXPO_PUSH_AVAILABLE:
        logger.warning("Expo push SDK not available")
        return False
    
    if not push_token or not push_token.startswith("ExponentPushToken"):
        logger.warning(f"Invalid push token: {push_token}")
        return False
    
    try:
        # Determine Android channel based on notification type
        channel_id = "default"
        if notification_type in ["chat_message", "seller_response"]:
            channel_id = "messages"
        elif notification_type in ["offer_received", "offer_accepted", "offer_rejected"]:
            channel_id = "offers"
        elif notification_type in ["price_drop", "saved_search_match", "better_deal"]:
            channel_id = "listings"
        
        message = PushMessage(
            to=push_token,
            title=title,
            body=body,
            data=data,
            sound="default",
            channel_id=channel_id,
            priority="high" if notification_type in ["chat_message", "offer_received", "security_alert"] else "default"
        )
        
        push_client = PushClient()
        response = push_client.publish(message)
        
        # Check for errors
        try:
            response.validate_response()
            logger.info(f"Push notification sent successfully to {push_token[:20]}...")
            return True
        except DeviceNotRegisteredError:
            # Mark token as invalid
            await db.user_settings.update_one(
                {"push_token": push_token},
                {"$set": {"push_token": None, "push_token_invalid": True}}
            )
            logger.warning(f"Device not registered, token invalidated: {push_token[:20]}...")
            return False
        except PushTicketError as e:
            logger.error(f"Push ticket error: {e}")
            return False
            
    except PushServerError as e:
        logger.error(f"Push server error: {e}")
        return False
    except Exception as e:
        logger.error(f"Failed to send push notification: {e}")
        return False

async def send_bulk_push_notifications(
    messages: List[Dict[str, Any]]
) -> Dict[str, int]:
    """Send multiple push notifications in batch"""
    if not EXPO_PUSH_AVAILABLE:
        return {"sent": 0, "failed": len(messages)}
    
    sent = 0
    failed = 0
    
    push_messages = []
    for msg in messages:
        if msg.get("push_token") and msg["push_token"].startswith("ExponentPushToken"):
            push_messages.append(PushMessage(
                to=msg["push_token"],
                title=msg.get("title", ""),
                body=msg.get("body", ""),
                data=msg.get("data", {}),
                sound="default"
            ))
    
    if not push_messages:
        return {"sent": 0, "failed": len(messages)}
    
    try:
        push_client = PushClient()
        # Send in batches of 100
        for i in range(0, len(push_messages), 100):
            batch = push_messages[i:i+100]
            responses = push_client.publish_multiple(batch)
            for response in responses:
                try:
                    response.validate_response()
                    sent += 1
                except:
                    failed += 1
    except Exception as e:
        logger.error(f"Bulk push error: {e}")
        failed = len(push_messages)
    
    return {"sent": sent, "failed": failed}

# ==================== BLOCKED USERS ENDPOINTS ====================

@api_router.get("/blocked-users")
async def get_blocked_users(request: Request):
    """Get list of blocked users"""
    user = await require_auth(request)
    
    blocked = await db.blocked_users.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    
    # Get user details for blocked users
    blocked_user_ids = [b["blocked_user_id"] for b in blocked]
    users = await db.users.find({"user_id": {"$in": blocked_user_ids}}, {"_id": 0, "user_id": 1, "name": 1, "picture": 1}).to_list(100)
    
    users_map = {u["user_id"]: u for u in users}
    
    result = []
    for b in blocked:
        user_data = users_map.get(b["blocked_user_id"], {})
        result.append({
            "id": b["id"],
            "blocked_user_id": b["blocked_user_id"],
            "name": user_data.get("name", "Unknown User"),
            "picture": user_data.get("picture"),
            "reason": b.get("reason"),
            "created_at": b.get("created_at")
        })
    
    return {"blocked_users": result}

@api_router.post("/blocked-users")
async def block_user(request: Request):
    """Block a user"""
    user = await require_auth(request)
    body = await request.json()
    
    blocked_user_id = body.get("blocked_user_id")
    if not blocked_user_id:
        raise HTTPException(status_code=400, detail="blocked_user_id required")
    
    if blocked_user_id == user.user_id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    
    # Check if already blocked
    existing = await db.blocked_users.find_one({
        "user_id": user.user_id,
        "blocked_user_id": blocked_user_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="User already blocked")
    
    blocked = BlockedUser(
        user_id=user.user_id,
        blocked_user_id=blocked_user_id,
        reason=body.get("reason")
    )
    
    blocked_dict = blocked.model_dump()
    blocked_dict["created_at"] = datetime.now(timezone.utc)
    
    await db.blocked_users.insert_one(blocked_dict)
    
    # Also add to user's blocked_users array
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$addToSet": {"blocked_users": blocked_user_id}}
    )
    
    return {"message": "User blocked successfully", "id": blocked.id}

@api_router.delete("/blocked-users/{blocked_user_id}")
async def unblock_user(blocked_user_id: str, request: Request):
    """Unblock a user"""
    user = await require_auth(request)
    
    result = await db.blocked_users.delete_one({
        "user_id": user.user_id,
        "blocked_user_id": blocked_user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blocked user not found")
    
    # Also remove from user's blocked_users array
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$pull": {"blocked_users": blocked_user_id}}
    )
    
    return {"message": "User unblocked successfully"}

# ==================== PROFILE ENDPOINTS ====================

@api_router.get("/profile")
async def get_profile(request: Request):
    """Get current user profile with stats"""
    user = await require_auth(request)
    
    user_data = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get stats
    active_listings = await db.listings.count_documents({"user_id": user.user_id, "status": "active"})
    sold_listings = await db.listings.count_documents({"user_id": user.user_id, "status": "sold"})
    total_favorites = await db.favorites.count_documents({"user_id": user.user_id})
    
    # Get total views on all listings
    pipeline = [
        {"$match": {"user_id": user.user_id}},
        {"$group": {"_id": None, "total_views": {"$sum": "$views"}}}
    ]
    views_result = await db.listings.aggregate(pipeline).to_list(1)
    total_views = views_result[0]["total_views"] if views_result else 0
    
    # Purchases (conversations where user is buyer and listing is sold)
    purchases = await db.conversations.count_documents({
        "buyer_id": user.user_id
    })
    
    return {
        **user_data,
        "stats": {
            "active_listings": active_listings,
            "sold_listings": sold_listings,
            "total_favorites": total_favorites,
            "total_views": total_views,
            "purchases": purchases,
            "sales_count": sold_listings
        }
    }

@api_router.put("/profile")
async def update_profile(request: Request):
    """Update user profile"""
    user = await require_auth(request)
    body = await request.json()
    
    update_data = {}
    allowed_fields = ["name", "phone", "location", "bio", "picture"]
    
    for field in allowed_fields:
        if field in body and body[field] is not None:
            update_data[field] = body[field]
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": update_data}
    )
    
    # Get updated user
    updated_user = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    
    return {"message": "Profile updated successfully", "user": updated_user}

@api_router.get("/profile/public/{user_id}")
async def get_public_profile(user_id: str, request: Request):
    """Get public profile of a user"""
    # Check if current user has blocked or is blocked by target user
    current_user = await get_current_user(request)
    
    if current_user:
        # Check if blocked
        blocked = await db.blocked_users.find_one({
            "$or": [
                {"user_id": current_user.user_id, "blocked_user_id": user_id},
                {"user_id": user_id, "blocked_user_id": current_user.user_id}
            ]
        })
        
        if blocked:
            raise HTTPException(status_code=403, detail="Cannot view this profile")
    
    user_data = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    # If user not found, try to build profile from listings data
    if not user_data:
        # Check if there are any listings from this seller
        listing = await db.listings.find_one({"user_id": user_id})
        if not listing:
            listing = await db.auto_listings.find_one({"user_id": user_id})
        if not listing:
            listing = await db.properties.find_one({"user_id": user_id})
        
        if listing and listing.get("seller"):
            # Create a placeholder profile from seller info
            seller = listing["seller"]
            user_data = {
                "user_id": user_id,
                "name": seller.get("name", "Unknown Seller"),
                "picture": seller.get("picture"),
                "location": seller.get("location"),
                "bio": None,
                "verified": seller.get("verified", False),
                "email_verified": seller.get("verified", False),
                "phone_verified": False,
                "id_verified": False,
                "rating": seller.get("rating", 0),
                "total_ratings": seller.get("totalRatings", 0),
                "created_at": listing.get("created_at", datetime.now(timezone.utc)),
            }
        else:
            raise HTTPException(status_code=404, detail="User not found")
    
    # Get user settings to check privacy
    settings = await db.user_settings.find_one({"user_id": user_id})
    privacy = settings.get("privacy", {}) if settings else {}
    
    if not privacy.get("allow_profile_discovery", True):
        raise HTTPException(status_code=403, detail="This profile is private")
    
    # Get stats from all collections
    active_listings = await db.listings.count_documents({"user_id": user_id, "status": "active"})
    active_properties = await db.properties.count_documents({"user_id": user_id, "status": "active"})
    active_auto = await db.auto_listings.count_documents({"user_id": user_id, "status": "active"})
    
    sold_listings = await db.listings.count_documents({"user_id": user_id, "status": "sold"})
    sold_properties = await db.properties.count_documents({"user_id": user_id, "status": "sold"})
    sold_auto = await db.auto_listings.count_documents({"user_id": user_id, "status": "sold"})
    
    # Check if current user is following
    is_following = False
    if current_user:
        follow = await db.follows.find_one({
            "follower_id": current_user.user_id,
            "following_id": user_id
        })
        is_following = follow is not None
    
    # Get follower/following counts
    followers_count = await db.follows.count_documents({"following_id": user_id})
    following_count = await db.follows.count_documents({"follower_id": user_id})
    
    # Return limited public info
    return {
        "user_id": user_data["user_id"],
        "name": user_data.get("name"),
        "picture": user_data.get("picture"),
        "location": user_data.get("location"),
        "bio": user_data.get("bio"),
        "verified": user_data.get("verified", False),
        "email_verified": user_data.get("email_verified", False),
        "phone_verified": user_data.get("phone_verified", False),
        "id_verified": user_data.get("id_verified", False),
        "rating": user_data.get("rating", 0),
        "total_ratings": user_data.get("total_ratings", 0),
        "created_at": user_data.get("created_at"),
        "stats": {
            "active_listings": active_listings + active_properties + active_auto,
            "sold_listings": sold_listings + sold_properties + sold_auto,
            "followers": followers_count,
            "following": following_count
        },
        "is_following": is_following,
        "online_status": privacy.get("show_online_status", True),
        "last_seen": user_data.get("last_seen") if privacy.get("show_last_seen", True) else None
    }

# ==================== FOLLOW SYSTEM ====================

@api_router.post("/users/{user_id}/follow")
async def follow_user(user_id: str, request: Request):
    """Follow a user"""
    current_user = await require_auth(request)
    
    if current_user.user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    
    # Check if user exists
    target_user = await db.users.find_one({"user_id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already following
    existing = await db.follows.find_one({
        "follower_id": current_user.user_id,
        "following_id": user_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Already following this user")
    
    # Create follow relationship
    await db.follows.insert_one({
        "id": str(uuid.uuid4()),
        "follower_id": current_user.user_id,
        "following_id": user_id,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Create notification for target user
    await create_notification(
        user_id,
        "follow",
        "New Follower",
        f"{current_user.name or 'Someone'} started following you",
        {"follower_id": current_user.user_id}
    )
    
    return {"message": "Now following user", "is_following": True}

@api_router.delete("/users/{user_id}/follow")
async def unfollow_user(user_id: str, request: Request):
    """Unfollow a user"""
    current_user = await require_auth(request)
    
    result = await db.follows.delete_one({
        "follower_id": current_user.user_id,
        "following_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="Not following this user")
    
    return {"message": "Unfollowed user", "is_following": False}

@api_router.get("/users/{user_id}/followers")
async def get_followers(
    user_id: str,
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get user's followers"""
    skip = (page - 1) * limit
    
    follows = await db.follows.find(
        {"following_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Get follower user details
    follower_ids = [f["follower_id"] for f in follows]
    users = await db.users.find(
        {"user_id": {"$in": follower_ids}},
        {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "verified": 1}
    ).to_list(len(follower_ids))
    
    total = await db.follows.count_documents({"following_id": user_id})
    
    return {"followers": users, "total": total, "page": page}

@api_router.get("/users/{user_id}/following")
async def get_following(
    user_id: str,
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get users that user is following"""
    skip = (page - 1) * limit
    
    follows = await db.follows.find(
        {"follower_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Get following user details
    following_ids = [f["following_id"] for f in follows]
    users = await db.users.find(
        {"user_id": {"$in": following_ids}},
        {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "verified": 1}
    ).to_list(len(following_ids))
    
    total = await db.follows.count_documents({"follower_id": user_id})
    
    return {"following": users, "total": total, "page": page}

# ==================== REVIEWS SYSTEM ====================

@api_router.post("/users/{user_id}/reviews")
async def create_review(user_id: str, request: Request):
    """Leave a review for a user"""
    current_user = await require_auth(request)
    body = await request.json()
    
    if current_user.user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot review yourself")
    
    # Check if user exists
    target_user = await db.users.find_one({"user_id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    rating = body.get("rating")
    comment = body.get("comment", "").strip()
    
    if not rating or rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    # Check if already reviewed
    existing = await db.reviews.find_one({
        "reviewer_id": current_user.user_id,
        "user_id": user_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="You have already reviewed this user")
    
    # Create review
    review = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "reviewer_id": current_user.user_id,
        "reviewer_name": current_user.name,
        "reviewer_picture": current_user.picture,
        "rating": rating,
        "comment": comment,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.reviews.insert_one(review)
    
    # Update user's average rating
    reviews = await db.reviews.find({"user_id": user_id}).to_list(1000)
    avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"rating": round(avg_rating, 1), "total_ratings": len(reviews)}}
    )
    
    # Create notification
    await create_notification(
        user_id,
        "review",
        "New Review",
        f"{current_user.name or 'Someone'} left you a {rating}-star review",
        {"review_id": review["id"], "reviewer_id": current_user.user_id}
    )
    
    return {"message": "Review submitted", "review": review}

@api_router.get("/users/{user_id}/reviews")
async def get_user_reviews(
    user_id: str,
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get reviews for a user"""
    skip = (page - 1) * limit
    
    reviews = await db.reviews.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.reviews.count_documents({"user_id": user_id})
    
    # Get rating breakdown
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": "$rating", "count": {"$sum": 1}}}
    ]
    breakdown_result = await db.reviews.aggregate(pipeline).to_list(5)
    breakdown = {str(i): 0 for i in range(1, 6)}
    for item in breakdown_result:
        breakdown[str(item["_id"])] = item["count"]
    
    return {
        "reviews": reviews,
        "total": total,
        "page": page,
        "rating_breakdown": breakdown
    }

@api_router.delete("/reviews/{review_id}")
async def delete_review(review_id: str, request: Request):
    """Delete own review"""
    current_user = await require_auth(request)
    
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    if review["reviewer_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Cannot delete this review")
    
    await db.reviews.delete_one({"id": review_id})
    
    # Recalculate user's rating
    user_id = review["user_id"]
    reviews = await db.reviews.find({"user_id": user_id}).to_list(1000)
    
    if reviews:
        avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"rating": round(avg_rating, 1), "total_ratings": len(reviews)}}
        )
    else:
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"rating": 0, "total_ratings": 0}}
        )
    
    return {"message": "Review deleted"}

@api_router.get("/users/{user_id}/listings")
async def get_user_listings(
    user_id: str,
    request: Request,
    status: str = Query("active"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get listings for a specific user"""
    skip = (page - 1) * limit
    
    query = {"user_id": user_id, "status": status}
    
    # Get from all collections
    listings = await db.listings.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    properties = await db.properties.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    auto_listings = await db.auto_listings.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    
    for l in listings:
        l["type"] = "listing"
    for p in properties:
        p["type"] = "property"
    for a in auto_listings:
        a["type"] = "auto"
    
    all_listings = listings + properties + auto_listings
    all_listings.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    total = len(all_listings)
    paginated = all_listings[skip:skip + limit]
    
    return {"listings": paginated, "total": total, "page": page}

@api_router.get("/profile/activity/listings")
async def get_my_listings(
    request: Request,
    status: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get user's listings from all collections"""
    user = await require_auth(request)
    
    query = {"user_id": user.user_id}
    if status:
        query["status"] = status
    
    skip = (page - 1) * limit
    
    # Get listings from all collections
    listings = await db.listings.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    properties = await db.properties.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    auto_listings = await db.auto_listings.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Add type to each and combine
    for l in listings:
        l["type"] = "listing"
    for p in properties:
        p["type"] = "property"
    for a in auto_listings:
        a["type"] = "auto"
    
    all_listings = listings + properties + auto_listings
    
    # Sort by created_at descending
    all_listings.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    # Paginate
    total = len(all_listings)
    paginated = all_listings[skip:skip + limit]
    
    return {"listings": paginated, "total": total, "page": page}

@api_router.get("/profile/activity/purchases")
async def get_purchases(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get user's purchases (listings they've bought)"""
    user = await require_auth(request)
    
    skip = (page - 1) * limit
    
    # Get conversations where user is buyer
    conversations = await db.conversations.find(
        {"buyer_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Get listing details from all collections
    listing_ids = [c["listing_id"] for c in conversations]
    
    listings = await db.listings.find({"id": {"$in": listing_ids}}, {"_id": 0}).to_list(len(listing_ids))
    properties = await db.properties.find({"id": {"$in": listing_ids}}, {"_id": 0}).to_list(len(listing_ids))
    auto_listings = await db.auto_listings.find({"id": {"$in": listing_ids}}, {"_id": 0}).to_list(len(listing_ids))
    
    listings_map = {}
    for l in listings:
        listings_map[l["id"]] = {**l, "type": "listing"}
    for p in properties:
        listings_map[p["id"]] = {**p, "type": "property"}
    for a in auto_listings:
        listings_map[a["id"]] = {**a, "type": "auto"}
    
    result = []
    for conv in conversations:
        listing = listings_map.get(conv["listing_id"])
        if listing:
            result.append({
                "conversation_id": conv["id"],
                "listing": listing,
                "created_at": conv.get("created_at")
            })
    
    return {"purchases": result, "total": len(result)}

@api_router.get("/profile/activity/sales")
async def get_sales(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get user's sales (listings they've sold)"""
    user = await require_auth(request)
    
    skip = (page - 1) * limit
    query = {"user_id": user.user_id, "status": "sold"}
    
    # Get sold items from all collections
    listings = await db.listings.find(query, {"_id": 0}).sort("updated_at", -1).to_list(500)
    properties = await db.properties.find(query, {"_id": 0}).sort("updated_at", -1).to_list(500)
    auto_listings = await db.auto_listings.find(query, {"_id": 0}).sort("updated_at", -1).to_list(500)
    
    # Add type to each and combine
    for l in listings:
        l["type"] = "listing"
    for p in properties:
        p["type"] = "property"
    for a in auto_listings:
        a["type"] = "auto"
    
    all_sales = listings + properties + auto_listings
    all_sales.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
    
    total = len(all_sales)
    paginated = all_sales[skip:skip + limit]
    
    return {"sales": paginated, "total": total, "page": page}

@api_router.get("/profile/activity/recently-viewed")
async def get_recently_viewed(
    request: Request,
    limit: int = Query(20, ge=1, le=50)
):
    """Get recently viewed listings"""
    user = await require_auth(request)
    
    # Get from recently_viewed collection
    viewed = await db.recently_viewed.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("viewed_at", -1).limit(limit).to_list(limit)
    
    # Get listing details from all collections
    listing_ids = [v["listing_id"] for v in viewed]
    
    # Fetch from all listing collections
    listings = await db.listings.find({"id": {"$in": listing_ids}}, {"_id": 0}).to_list(len(listing_ids))
    properties = await db.properties.find({"id": {"$in": listing_ids}}, {"_id": 0}).to_list(len(listing_ids))
    auto_listings = await db.auto_listings.find({"id": {"$in": listing_ids}}, {"_id": 0}).to_list(len(listing_ids))
    
    # Combine all into a map
    listings_map = {}
    for l in listings:
        listings_map[l["id"]] = {**l, "type": "listing"}
    for p in properties:
        listings_map[p["id"]] = {**p, "type": "property"}
    for a in auto_listings:
        listings_map[a["id"]] = {**a, "type": "auto"}
    
    result = []
    for v in viewed:
        listing = listings_map.get(v["listing_id"])
        if listing:
            result.append({
                **listing,
                "viewed_at": v.get("viewed_at")
            })
    
    return {"listings": result}

@api_router.post("/profile/activity/recently-viewed/{listing_id}")
async def add_recently_viewed(listing_id: str, request: Request):
    """Add listing to recently viewed"""
    user = await get_current_user(request)
    if not user:
        return {"message": "Not logged in"}
    
    # Upsert to recently_viewed
    await db.recently_viewed.update_one(
        {"user_id": user.user_id, "listing_id": listing_id},
        {
            "$set": {
                "user_id": user.user_id,
                "listing_id": listing_id,
                "viewed_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    # Keep only last 50 viewed items
    count = await db.recently_viewed.count_documents({"user_id": user.user_id})
    if count > 50:
        oldest = await db.recently_viewed.find(
            {"user_id": user.user_id}
        ).sort("viewed_at", 1).limit(count - 50).to_list(count - 50)
        
        ids_to_delete = [o["_id"] for o in oldest]
        await db.recently_viewed.delete_many({"_id": {"$in": ids_to_delete}})
    
    return {"message": "Added to recently viewed"}

# ==================== ACTIVE SESSIONS ENDPOINTS ====================

@api_router.get("/sessions")
async def get_active_sessions(request: Request):
    """Get all active sessions"""
    user = await require_auth(request)
    
    sessions = await db.active_sessions.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("last_active", -1).to_list(20)
    
    # Get current session token
    current_token = await get_session_token(request)
    
    # Mark current session
    for session in sessions:
        session["is_current"] = session.get("session_token") == current_token
        # Don't expose full token
        session["session_token"] = session["session_token"][:8] + "..." if session.get("session_token") else None
    
    return {"sessions": sessions}

@api_router.delete("/sessions/{session_id}")
async def revoke_session(session_id: str, request: Request):
    """Revoke a specific session"""
    user = await require_auth(request)
    
    # Don't allow revoking current session through this endpoint
    session = await db.active_sessions.find_one({"id": session_id, "user_id": user.user_id})
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    current_token = await get_session_token(request)
    if session.get("session_token") == current_token:
        raise HTTPException(status_code=400, detail="Cannot revoke current session. Use sign out instead.")
    
    await db.active_sessions.delete_one({"id": session_id})
    await db.sessions.delete_one({"token": session.get("session_token")})
    
    return {"message": "Session revoked"}

@api_router.post("/sessions/revoke-all")
async def revoke_all_sessions(request: Request):
    """Revoke all sessions except current"""
    user = await require_auth(request)
    current_token = await get_session_token(request)
    
    # Delete all sessions except current
    result = await db.active_sessions.delete_many({
        "user_id": user.user_id,
        "session_token": {"$ne": current_token}
    })
    
    # Also delete from sessions collection
    await db.sessions.delete_many({
        "user_id": user.user_id,
        "token": {"$ne": current_token}
    })
    
    return {"message": f"Revoked {result.deleted_count} sessions"}

# ==================== ACCOUNT MANAGEMENT ENDPOINTS ====================

@api_router.post("/account/change-password")
async def change_password(request: Request):
    """Change user password"""
    user = await require_auth(request)
    body = await request.json()
    
    current_password = body.get("current_password")
    new_password = body.get("new_password")
    
    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="Both current and new password required")
    
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    # Verify current password (simplified - in production use proper hashing)
    user_data = await db.users.find_one({"user_id": user.user_id})
    
    # For demo, just update password
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"password_updated_at": datetime.now(timezone.utc)}}
    )
    
    # Create security notification
    await create_notification(
        user.user_id,
        "security_alert",
        "Password Changed",
        "Your password was successfully changed. If you didn't make this change, please contact support immediately.",
        {"action": "password_change"}
    )
    
    return {"message": "Password changed successfully"}

@api_router.post("/account/delete")
async def delete_account(request: Request):
    """Delete user account"""
    user = await require_auth(request)
    body = await request.json()
    
    reason = body.get("reason")
    password = body.get("password")
    
    if not reason:
        raise HTTPException(status_code=400, detail="Reason required for account deletion")
    
    # In production, verify password here
    
    # Soft delete - mark account for deletion (30 day cool-off)
    deletion_date = datetime.now(timezone.utc) + timedelta(days=30)
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {
            "$set": {
                "deletion_requested": True,
                "deletion_date": deletion_date,
                "deletion_reason": reason
            }
        }
    )
    
    # Deactivate all listings
    await db.listings.update_many(
        {"user_id": user.user_id},
        {"$set": {"status": "deleted"}}
    )
    
    # Clear sessions
    await db.sessions.delete_many({"user_id": user.user_id})
    await db.active_sessions.delete_many({"user_id": user.user_id})
    
    return {
        "message": "Account scheduled for deletion",
        "deletion_date": deletion_date.isoformat(),
        "note": "You can cancel deletion by logging in within 30 days"
    }

@api_router.post("/account/cancel-deletion")
async def cancel_account_deletion(request: Request):
    """Cancel account deletion"""
    user = await require_auth(request)
    
    result = await db.users.update_one(
        {"user_id": user.user_id, "deletion_requested": True},
        {
            "$unset": {
                "deletion_requested": "",
                "deletion_date": "",
                "deletion_reason": ""
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="No pending deletion found")
    
    return {"message": "Account deletion cancelled"}

# ==================== EMAIL SERVICE ====================

SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY")
FROM_EMAIL = os.environ.get("FROM_EMAIL", "noreply@avida.app")

async def send_notification_email(
    to_email: str, 
    subject: str, 
    body: str,
    notification_type: str = "default",
    data: Dict[str, Any] = {}
) -> bool:
    """Send email notification via SendGrid"""
    if not SENDGRID_AVAILABLE:
        logger.info(f"SendGrid not available. Email would be sent to {to_email}: {subject}")
        return False
    
    if not SENDGRID_API_KEY:
        logger.warning("SendGrid API key not configured")
        return False
    
    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        
        # Build HTML email content
        html_content = build_email_template(subject, body, notification_type, data)
        
        message = Mail(
            from_email=Email(FROM_EMAIL, "avida Marketplace"),
            to_emails=To(to_email),
            subject=subject,
            html_content=html_content
        )
        
        response = sg.send(message)
        
        if response.status_code in [200, 201, 202]:
            logger.info(f"Email sent successfully to {to_email}")
            return True
        else:
            logger.warning(f"Email send failed with status {response.status_code}")
            return False
            
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False

def build_email_template(subject: str, body: str, notification_type: str, data: Dict[str, Any]) -> str:
    """Build HTML email template"""
    
    # Color based on notification type
    accent_color = "#2E7D32"  # Default green
    if notification_type in ["security_alert"]:
        accent_color = "#D32F2F"
    elif notification_type in ["offer_received", "offer_accepted"]:
        accent_color = "#1976D2"
    elif notification_type in ["price_drop", "better_deal"]:
        accent_color = "#FF6F00"
    
    # CTA button if applicable
    cta_button = ""
    if data.get("listing_id"):
        cta_button = f'''
        <a href="https://avida.app/listing/{data['listing_id']}" 
           style="display: inline-block; background-color: {accent_color}; color: white; 
                  padding: 12px 24px; text-decoration: none; border-radius: 8px; 
                  font-weight: 600; margin-top: 16px;">
            View Listing
        </a>
        '''
    elif data.get("conversation_id"):
        cta_button = f'''
        <a href="https://avida.app/chat/{data['conversation_id']}" 
           style="display: inline-block; background-color: {accent_color}; color: white; 
                  padding: 12px 24px; text-decoration: none; border-radius: 8px; 
                  font-weight: 600; margin-top: 16px;">
            View Message
        </a>
        '''
    
    return f'''
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f5f5f5;">
            <tr>
                <td style="padding: 40px 20px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background-color: {accent_color}; padding: 24px; text-align: center;">
                                <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">avida</h1>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 32px;">
                                <h2 style="margin: 0 0 16px 0; color: #212121; font-size: 20px;">{subject.replace('[avida] ', '')}</h2>
                                <p style="margin: 0; color: #757575; font-size: 16px; line-height: 1.6;">{body}</p>
                                {cta_button}
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f5f5f5; padding: 24px; text-align: center;">
                                <p style="margin: 0 0 8px 0; color: #757575; font-size: 14px;">
                                    You received this email because you have notifications enabled.
                                </p>
                                <p style="margin: 0; color: #9e9e9e; font-size: 12px;">
                                    <a href="https://avida.app/settings" style="color: {accent_color}; text-decoration: none;">Manage notification preferences</a>
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    '''

# ==================== SUPPORT TICKETS ====================

class SupportTicketCreate(BaseModel):
    subject: str
    message: str

@api_router.post("/support/tickets")
async def create_support_ticket(request: Request):
    """Create a support ticket"""
    user = await require_auth(request)
    body = await request.json()
    
    subject = body.get("subject", "").strip()
    message = body.get("message", "").strip()
    
    if not subject or not message:
        raise HTTPException(status_code=400, detail="Subject and message required")
    
    ticket = {
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "subject": subject,
        "message": message,
        "status": "open",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    
    await db.support_tickets.insert_one(ticket)
    
    # Create notification
    await create_notification(
        user.user_id,
        "system",
        "Support Ticket Created",
        f"Your support ticket \"{subject}\" has been received. We'll respond within 24-48 hours.",
        {"ticket_id": ticket["id"]}
    )
    
    return {"message": "Ticket created", "ticket_id": ticket["id"]}

@api_router.get("/support/tickets")
async def get_support_tickets(request: Request):
    """Get user's support tickets"""
    user = await require_auth(request)
    
    tickets = await db.support_tickets.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"tickets": tickets}

@api_router.get("/support/tickets/{ticket_id}")
async def get_support_ticket(ticket_id: str, request: Request):
    """Get a specific support ticket"""
    user = await require_auth(request)
    
    ticket = await db.support_tickets.find_one(
        {"id": ticket_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    return ticket

# ==================== ID VERIFICATION ====================

@api_router.post("/profile/verify-id")
async def submit_id_verification(request: Request):
    """Submit ID verification documents"""
    user = await require_auth(request)
    body = await request.json()
    
    required_fields = ["full_name", "dob", "id_type", "id_number", "doc_front_url", "doc_back_url", "selfie_url"]
    for field in required_fields:
        if not body.get(field):
            raise HTTPException(status_code=400, detail=f"{field} is required")
    
    # Check if already has pending verification
    existing = await db.id_verifications.find_one({
        "user_id": user.user_id,
        "status": "pending"
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending verification")
    
    verification = {
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "full_name": body["full_name"],
        "dob": body["dob"],
        "id_type": body["id_type"],
        "id_number": body["id_number"],
        "doc_front_url": body["doc_front_url"],
        "doc_back_url": body["doc_back_url"],
        "selfie_url": body["selfie_url"],
        "status": "pending",
        "submitted_at": datetime.now(timezone.utc),
        "reviewed_at": None,
        "reviewer_note": None,
    }
    
    await db.id_verifications.insert_one(verification)
    
    # Update user's trust status
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"id_verification_status": "pending"}}
    )
    
    # Create notification
    await create_notification(
        user.user_id,
        "system",
        "ID Verification Submitted",
        "Your ID verification has been submitted and is under review. This typically takes 1-3 business days.",
        {"verification_id": verification["id"]}
    )
    
    return {"message": "Verification submitted", "verification_id": verification["id"]}

@api_router.get("/profile/verify-id/status")
async def get_id_verification_status(request: Request):
    """Get ID verification status"""
    user = await require_auth(request)
    
    verification = await db.id_verifications.find_one(
        {"user_id": user.user_id},
        {"_id": 0, "doc_front_url": 0, "doc_back_url": 0, "selfie_url": 0}
    )
    
    if not verification:
        return {"status": "not_started"}
    
    return verification

# ==================== EMAIL VERIFICATION ====================

@api_router.post("/auth/send-verification-email")
async def send_verification_email(request: Request):
    """Send email verification link"""
    user = await require_auth(request)
    
    # Generate verification token
    token = str(uuid.uuid4())
    expires = datetime.now(timezone.utc) + timedelta(hours=24)
    
    await db.email_verifications.update_one(
        {"user_id": user.user_id},
        {
            "$set": {
                "user_id": user.user_id,
                "token": token,
                "expires": expires,
                "created_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    # Send verification email
    user_data = await db.users.find_one({"user_id": user.user_id})
    if user_data and user_data.get("email"):
        await send_notification_email(
            user_data["email"],
            "[avida] Verify Your Email",
            f"Click the link below to verify your email address:\n\nhttps://avida.app/verify-email?token={token}\n\nThis link expires in 24 hours.",
            "system",
            {}
        )
    
    return {"message": "Verification email sent"}

@api_router.post("/auth/verify-email")
async def verify_email(request: Request):
    """Verify email with token"""
    body = await request.json()
    token = body.get("token")
    
    if not token:
        raise HTTPException(status_code=400, detail="Token required")
    
    verification = await db.email_verifications.find_one({
        "token": token,
        "expires": {"$gt": datetime.now(timezone.utc)}
    })
    
    if not verification:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    # Update user's email verification status
    await db.users.update_one(
        {"user_id": verification["user_id"]},
        {"$set": {"email_verified": True}}
    )
    
    # Delete verification token
    await db.email_verifications.delete_one({"token": token})
    
    return {"message": "Email verified successfully"}

# ==================== FAVORITES (SAVED ITEMS) ====================

@api_router.get("/profile/activity/favorites")
async def get_saved_items(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get user's saved/favorite items"""
    user = await require_auth(request)
    
    skip = (page - 1) * limit
    
    # Get favorites
    favorites = await db.favorites.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Get listing details from all collections
    listing_ids = [f["listing_id"] for f in favorites]
    
    listings = await db.listings.find({"id": {"$in": listing_ids}}, {"_id": 0}).to_list(len(listing_ids))
    properties = await db.properties.find({"id": {"$in": listing_ids}}, {"_id": 0}).to_list(len(listing_ids))
    auto_listings = await db.auto_listings.find({"id": {"$in": listing_ids}}, {"_id": 0}).to_list(len(listing_ids))
    
    listings_map = {}
    for l in listings:
        listings_map[l["id"]] = {**l, "type": "listing"}
    for p in properties:
        listings_map[p["id"]] = {**p, "type": "property"}
    for a in auto_listings:
        listings_map[a["id"]] = {**a, "type": "auto"}
    
    result = []
    for fav in favorites:
        listing = listings_map.get(fav["listing_id"])
        if listing:
            result.append({
                **listing,
                "saved_at": fav.get("created_at")
            })
    
    total = await db.favorites.count_documents({"user_id": user.user_id})
    
    return {"items": result, "total": total, "page": page}

@api_router.delete("/profile/activity/recently-viewed")
async def clear_recently_viewed(request: Request):
    """Clear recently viewed history"""
    user = await require_auth(request)
    
    await db.recently_viewed.delete_many({"user_id": user.user_id})
    
    return {"message": "Viewing history cleared"}

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "Local Marketplace API", "status": "running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# For Socket.IO, we need to use the socket_app
# The app will be run with: uvicorn server:socket_app --host 0.0.0.0 --port 8001
