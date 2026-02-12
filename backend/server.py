from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response, Query, UploadFile, File, Body
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

# Badge Awarding Service
from services.badge_service import get_badge_service, BadgeAwardingService

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

# Boost Routes
try:
    from boost_routes import create_boost_routes
    BOOST_ROUTES_AVAILABLE = True
except ImportError:
    BOOST_ROUTES_AVAILABLE = False
    logging.warning("Boost routes not available. Credit system disabled.")

# Utility Services (Email, Push Notifications)
try:
    from utils.email_service import send_notification_email, build_email_template
    from utils.push_service import (
        init_push_service,
        send_push_notification,
        send_bulk_push_notifications,
        send_milestone_push_notification,
        check_and_notify_new_milestones
    )
    UTILS_AVAILABLE = True
except ImportError as e:
    UTILS_AVAILABLE = False
    logging.warning(f"Utility services not available: {e}")

# Analytics Routes
try:
    from analytics_system import create_analytics_router
    ANALYTICS_ROUTES_AVAILABLE = True
except ImportError as e:
    ANALYTICS_ROUTES_AVAILABLE = False
    logging.warning(f"Analytics routes not available: {e}")

# Banner System Routes
try:
    from banner_system import create_banner_router
    BANNER_ROUTES_AVAILABLE = True
except ImportError as e:
    BANNER_ROUTES_AVAILABLE = False
    logging.warning(f"Banner routes not available: {e}")

# Escrow & Online Selling System
try:
    from escrow_system import create_escrow_router
    ESCROW_ROUTES_AVAILABLE = True
except ImportError as e:
    ESCROW_ROUTES_AVAILABLE = False
    logging.warning(f"Escrow routes not available: {e}")

# Payment Processing System
try:
    from payment_system import create_payment_router
    PAYMENT_ROUTES_AVAILABLE = True
except ImportError as e:
    PAYMENT_ROUTES_AVAILABLE = False
    logging.warning(f"Payment routes not available: {e}")

# SMS Notification Service
try:
    from sms_service import SMSService, create_sms_router
    SMS_SERVICE_AVAILABLE = True
except ImportError as e:
    SMS_SERVICE_AVAILABLE = False
    logging.warning(f"SMS service not available: {e}")

# Multi-Channel Notification Service
try:
    from notification_service import create_notification_router, NotificationService, TransportPartnerService
    NOTIFICATION_SERVICE_AVAILABLE = True
except ImportError as e:
    NOTIFICATION_SERVICE_AVAILABLE = False
    logging.warning(f"Notification service not available: {e}")

# Notification Queue and Escrow Integration
try:
    from notification_queue import NotificationQueue, EscrowNotificationIntegration
    NOTIFICATION_QUEUE_AVAILABLE = True
except ImportError as e:
    NOTIFICATION_QUEUE_AVAILABLE = False
    logging.warning(f"Notification queue not available: {e}")

# AI Listing Analyzer
try:
    from ai_listing_analyzer import create_ai_analyzer_router, AIListingAnalyzer
    AI_ANALYZER_AVAILABLE = True
except ImportError as e:
    AI_ANALYZER_AVAILABLE = False
    logging.warning(f"AI Listing Analyzer not available: {e}")

# Chat Moderation System
try:
    from chat_moderation import (
        create_moderation_router, 
        create_user_report_router,
        ChatModerationManager,
        ModerationConfig
    )
    CHAT_MODERATION_AVAILABLE = True
except ImportError as e:
    CHAT_MODERATION_AVAILABLE = False
    logging.warning(f"Chat Moderation not available: {e}")

# Executive Summary System
try:
    from executive_summary import create_executive_summary_router
    EXECUTIVE_SUMMARY_AVAILABLE = True
except ImportError as e:
    EXECUTIVE_SUMMARY_AVAILABLE = False
    logging.warning(f"Executive Summary not available: {e}")

# Smart Notification System
try:
    from smart_notifications import create_smart_notification_router, SmartNotificationService
    SMART_NOTIFICATIONS_AVAILABLE = True
except ImportError as e:
    SMART_NOTIFICATIONS_AVAILABLE = False
    logging.warning(f"Smart Notifications not available: {e}")

# Platform Configuration & Brand Manager
try:
    from platform_config import create_platform_config_router, PlatformConfigService
    PLATFORM_CONFIG_AVAILABLE = True
except ImportError as e:
    PLATFORM_CONFIG_AVAILABLE = False
    logging.warning(f"Platform Config not available: {e}")

# API Integrations Manager
try:
    from api_integrations import create_integrations_router, IntegrationsManagerService
    API_INTEGRATIONS_AVAILABLE = True
except ImportError as e:
    API_INTEGRATIONS_AVAILABLE = False
    logging.warning(f"API Integrations not available: {e}")

# Data Privacy & Compliance Center
try:
    from compliance_center import create_compliance_router, ComplianceService
    COMPLIANCE_CENTER_AVAILABLE = True
except ImportError as e:
    COMPLIANCE_CENTER_AVAILABLE = False
    logging.warning(f"Compliance Center not available: {e}")

# Config & Environment Manager
try:
    from config_manager import create_config_manager_router, ConfigManagerService
    CONFIG_MANAGER_AVAILABLE = True
except ImportError as e:
    CONFIG_MANAGER_AVAILABLE = False
    logging.warning(f"Config Manager not available: {e}")

# Team & Workflow Management
try:
    from team_workflow import create_team_workflow_router, TeamWorkflowService
    TEAM_WORKFLOW_AVAILABLE = True
except ImportError as e:
    TEAM_WORKFLOW_AVAILABLE = False
    logging.warning(f"Team Workflow not available: {e}")

# Cohort & Retention Analytics
try:
    from cohort_analytics import create_cohort_analytics_router, CohortAnalyticsService
    COHORT_ANALYTICS_AVAILABLE = True
except ImportError as e:
    COHORT_ANALYTICS_AVAILABLE = False
    logging.warning(f"Cohort Analytics not available: {e}")

# QA & Reliability System
try:
    from qa_reliability_system import create_qa_reliability_router, QAReliabilityService
    QA_RELIABILITY_AVAILABLE = True
except ImportError as e:
    QA_RELIABILITY_AVAILABLE = False
    logging.warning(f"QA & Reliability System not available: {e}")

# Admin Sandbox System
try:
    from sandbox_system import create_sandbox_router, SandboxService
    SANDBOX_AVAILABLE = True
except ImportError as e:
    SANDBOX_AVAILABLE = False
    logging.warning(f"Sandbox System not available: {e}")

# CSV Import System for Users
try:
    from csv_import_system import create_csv_import_router, CSVImportService
    CSV_IMPORT_AVAILABLE = True
except ImportError as e:
    CSV_IMPORT_AVAILABLE = False
    logging.warning(f"CSV Import System not available: {e}")

# Location System
try:
    from location_system import create_location_router, create_admin_location_router, LocationService
    LOCATION_SYSTEM_AVAILABLE = True
except ImportError as e:
    LOCATION_SYSTEM_AVAILABLE = False
    logging.warning(f"Location System not available: {e}")

# Business Profile System
try:
    from business_profile_system import create_business_profile_router, create_business_profile_admin_router
    BUSINESS_PROFILE_AVAILABLE = True
except ImportError as e:
    BUSINESS_PROFILE_AVAILABLE = False
    logging.warning(f"Business Profile System not available: {e}")

# Premium Subscription System
try:
    from premium_subscription_system import create_premium_subscription_router, handle_stripe_webhook
    PREMIUM_SUBSCRIPTION_AVAILABLE = True
except ImportError as e:
    PREMIUM_SUBSCRIPTION_AVAILABLE = False
    logging.warning(f"Premium Subscription System not available: {e}")

# Subscription Services (Email, Auto-Renewal, Invoices)
try:
    from subscription_services import SubscriptionEmailService, AutoRenewalService, InvoiceService
    SUBSCRIPTION_SERVICES_AVAILABLE = True
except ImportError as e:
    SUBSCRIPTION_SERVICES_AVAILABLE = False
    logging.warning(f"Subscription Services not available: {e}")

# Push Notification Service
try:
    from push_notification_service import PushNotificationService, send_templated_notification, PUSH_TEMPLATES
    PUSH_SERVICE_AVAILABLE = True
except ImportError as e:
    PUSH_SERVICE_AVAILABLE = False
    logging.warning(f"Push Notification Service not available: {e}")

# Modular Routes (Refactored from server.py)
try:
    from routes import (
        create_auth_router, 
        create_users_router, 
        create_listings_router,
        create_categories_router,
        create_favorites_router,
        create_conversations_router,
        create_badges_router,
        create_streaks_router,
        create_challenges_router,
        create_admin_router,
        create_notification_preferences_router,
        create_admin_locations_router,
        create_auto_motors_router,
        create_property_router,
        create_offers_router,
        create_similar_listings_router,
        create_social_router,
        create_profile_activity_router,
        create_notifications_router,
        create_account_router,
        create_support_router,
        create_user_settings_router,
        create_sessions_router,
        create_id_verification_router,
        create_profile_router,
        DEFAULT_CATEGORIES,
        LEGACY_CATEGORY_MAP,
        validate_category_and_subcategory
    )
    MODULAR_ROUTES_AVAILABLE = True
except ImportError as e:
    MODULAR_ROUTES_AVAILABLE = False
    logging.warning(f"Modular routes not available: {e}")

# Voucher System
try:
    from voucher_system import create_voucher_router
    VOUCHER_SYSTEM_AVAILABLE = True
except ImportError as e:
    VOUCHER_SYSTEM_AVAILABLE = False
    logging.warning(f"Voucher system not available: {e}")

# Listing Moderation System
try:
    from listing_moderation_system import create_moderation_router as create_listing_moderation_router, check_user_can_post, should_auto_approve
    LISTING_MODERATION_AVAILABLE = True
except ImportError as e:
    LISTING_MODERATION_AVAILABLE = False
    logging.warning(f"Listing moderation system not available: {e}")

# Admin Tools (SEO, URL Masking, Polls, Cookies, reCAPTCHA, WebP, Invoice PDF)
try:
    from admin_tools_system import (
        create_seo_router,
        create_url_masking_router,
        create_polls_router,
        create_cookie_consent_router,
        create_recaptcha_router,
        create_webp_router,
        create_invoice_pdf_router
    )
    ADMIN_TOOLS_AVAILABLE = True
except ImportError as e:
    ADMIN_TOOLS_AVAILABLE = False
    logging.warning(f"Admin tools not available: {e}")

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

# Online users tracking
online_users: Dict[str, str] = {}  # user_id -> socket_id
user_sockets: Dict[str, str] = {}  # socket_id -> user_id

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

# ListingCreate and ListingUpdate models moved to routes/listings.py

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
    message_type: str = "text"  # text, audio, image, video
    media_url: Optional[str] = None
    media_duration: Optional[int] = None  # For audio/video in seconds

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
        # Update last_seen timestamp for activity tracking
        await db.users.update_one(
            {"user_id": session["user_id"]},
            {"$set": {"last_seen": datetime.now(timezone.utc)}}
        )
        return User(**user_doc)
    return None

async def require_auth(request: Request) -> User:
    """Require authentication, raise 401 if not authenticated"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

# ==================== AUTH ENDPOINTS ====================

# Import bcrypt for password hashing
import hashlib
import secrets

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

# AUTH ENDPOINTS - Moved to routes/auth.py
# User endpoints (basic CRUD) - Moved to routes/users.py

# CATEGORY ENDPOINTS - Moved to routes/categories.py
# LISTING ENDPOINTS - Moved to routes/listings.py
# FAVORITES ENDPOINTS - Moved to routes/favorites.py


# CONVERSATIONS/MESSAGING ENDPOINTS - Moved to routes/conversations.py

# ==================== MEDIA UPLOAD ENDPOINT ====================

@api_router.post("/messages/upload-media")
async def upload_message_media(
    request: Request,
    file: UploadFile = File(...),
    media_type: str = Query(..., description="audio, image, or video")
):
    """Upload media file for a message"""
    user = await require_auth(request)
    
    # Validate media type
    if media_type not in ["audio", "image", "video"]:
        raise HTTPException(status_code=400, detail="Invalid media type")
    
    # Validate file size (max 10MB for audio/image, 50MB for video)
    max_size = 50 * 1024 * 1024 if media_type == "video" else 10 * 1024 * 1024
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail=f"File too large. Max size: {max_size // (1024 * 1024)}MB")
    
    # Generate unique filename
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'bin'
    filename = f"{media_type}_{user.user_id}_{uuid.uuid4()}.{file_extension}"
    
    # Save file (in production, upload to cloud storage like S3)
    # For now, store as base64 in database
    media_data = base64.b64encode(content).decode('utf-8')
    
    media_record = {
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "media_type": media_type,
        "filename": filename,
        "content_type": file.content_type,
        "size": len(content),
        "data": media_data,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.media.insert_one(media_record)
    
    # Return URL that can be used to retrieve the media
    media_url = f"/api/media/{media_record['id']}"
    
    return {
        "id": media_record["id"],
        "media_url": media_url,
        "media_type": media_type,
        "filename": filename,
        "size": len(content)
    }

@api_router.get("/media/{media_id}")
async def get_media(media_id: str):
    """Get media file by ID"""
    media = await db.media.find_one({"id": media_id}, {"_id": 0})
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    # Return base64 encoded data with content type
    import base64
    from fastapi.responses import Response
    
    content = base64.b64decode(media["data"])
    return Response(content=content, media_type=media["content_type"])

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
    # Remove user from online tracking
    if sid in user_sockets:
        user_id = user_sockets[sid]
        del user_sockets[sid]
        if user_id in online_users:
            del online_users[user_id]
        # Update last_seen in database
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"last_seen": datetime.now(timezone.utc)}}
        )
        # Broadcast offline status
        await sio.emit("user_offline", {"user_id": user_id})
        logger.info(f"User {user_id} went offline")

@sio.event
async def user_online(sid, data):
    """Track user as online"""
    user_id = data.get("user_id")
    if user_id:
        online_users[user_id] = sid
        user_sockets[sid] = user_id
        # Update last_seen and online status in database
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"last_seen": datetime.now(timezone.utc), "is_online": True}}
        )
        # Broadcast online status
        await sio.emit("user_online_status", {"user_id": user_id, "is_online": True})
        logger.info(f"User {user_id} is now online")

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

# ==================== QA REAL-TIME ALERTS ====================

# Track admin WebSocket connections for QA alerts
admin_alert_sockets: Dict[str, str] = {}  # admin_id -> socket_id
admin_socket_ids: Dict[str, str] = {}  # socket_id -> admin_id

@sio.event
async def admin_subscribe_alerts(sid, data):
    """Subscribe admin to real-time QA alerts"""
    admin_id = data.get("admin_id")
    alert_types = data.get("alert_types", ["critical", "warning", "system_down"])
    
    if admin_id:
        admin_alert_sockets[admin_id] = sid
        admin_socket_ids[sid] = admin_id
        
        # Join QA alerts room
        await sio.enter_room(sid, "qa_alerts")
        
        # Store subscription in database
        await db.qa_realtime_subscriptions.update_one(
            {"admin_id": admin_id},
            {"$set": {
                "admin_id": admin_id,
                "alert_types": alert_types,
                "socket_id": sid,
                "subscribed_at": datetime.now(timezone.utc).isoformat(),
                "active": True
            }},
            upsert=True
        )
        
        # Send confirmation
        await sio.emit("alert_subscription_confirmed", {
            "admin_id": admin_id,
            "alert_types": alert_types,
            "message": "Successfully subscribed to real-time alerts"
        }, room=sid)
        
        logger.info(f"Admin {admin_id} subscribed to QA alerts")

@sio.event
async def admin_unsubscribe_alerts(sid, data):
    """Unsubscribe admin from real-time QA alerts"""
    admin_id = data.get("admin_id") or admin_socket_ids.get(sid)
    
    if admin_id:
        if admin_id in admin_alert_sockets:
            del admin_alert_sockets[admin_id]
        if sid in admin_socket_ids:
            del admin_socket_ids[sid]
        
        await sio.leave_room(sid, "qa_alerts")
        
        # Update subscription in database
        await db.qa_realtime_subscriptions.update_one(
            {"admin_id": admin_id},
            {"$set": {"active": False, "unsubscribed_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        logger.info(f"Admin {admin_id} unsubscribed from QA alerts")

@sio.event
async def get_pending_qa_alerts(sid, data):
    """Get any pending QA alerts for an admin (polling fallback)"""
    admin_id = data.get("admin_id") or admin_socket_ids.get(sid)
    
    if admin_id:
        # Get pending alerts
        alerts = await db.qa_realtime_alerts.find({
            "target_admins": admin_id,
            "pending": True,
            "delivered_to": {"$ne": admin_id}
        }, {"_id": 0}).sort("created_at", -1).limit(20).to_list(length=20)
        
        # Mark as delivered
        for alert in alerts:
            await db.qa_realtime_alerts.update_one(
                {"id": alert["id"]},
                {"$addToSet": {"delivered_to": admin_id}}
            )
        
        # Emit to client
        if alerts:
            await sio.emit("qa_alerts_batch", {"alerts": [a["alert_data"] for a in alerts]}, room=sid)

async def broadcast_qa_alert(alert_data: Dict, target_admin_ids: List[str] = None):
    """
    Broadcast a QA alert to all subscribed admins or specific admins.
    Called from QA service when critical events occur.
    """
    if target_admin_ids:
        # Send to specific admins
        for admin_id in target_admin_ids:
            if admin_id in admin_alert_sockets:
                await sio.emit("qa_alert", alert_data, room=admin_alert_sockets[admin_id])
    else:
        # Broadcast to all subscribed admins
        await sio.emit("qa_alert", alert_data, room="qa_alerts")
    
    logger.info(f"Broadcast QA alert: {alert_data.get('title', 'No title')}")

# Make broadcast function available globally for QA service
app.state.broadcast_qa_alert = broadcast_qa_alert

# ==================== FEATURED VERIFIED LISTINGS ====================
# This endpoint returns listings from verified/premium sellers

@api_router.get("/listings/featured-verified")
async def get_featured_verified_listings(limit: int = Query(12, ge=1, le=50)):
    """Get featured listings from verified sellers"""
    
    # First, get verified/premium business profiles
    verified_profiles = await db.business_profiles.find({
        "$or": [{"is_verified": True}, {"is_premium": True}]
    }, {"user_id": 1, "business_name": 1, "is_verified": 1, "is_premium": 1, "_id": 0}).to_list(length=100)
    
    if not verified_profiles:
        # If no verified sellers, return featured/recent listings as fallback
        listings_cursor = db.listings.find(
            {"status": "active"},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit)
        listings = await listings_cursor.to_list(length=limit)
        return {"listings": listings, "source": "recent"}
    
    # Get user_ids of verified sellers
    verified_user_ids = [p["user_id"] for p in verified_profiles]
    seller_info = {p["user_id"]: p for p in verified_profiles}
    
    # Fetch listings from these sellers
    listings_cursor = db.listings.find(
        {"status": "active", "user_id": {"$in": verified_user_ids}},
        {"_id": 0}
    ).sort([("featured", -1), ("boost_score", -1), ("created_at", -1)]).limit(limit)
    
    listings = await listings_cursor.to_list(length=limit)
    
    # If not enough listings from verified sellers, pad with auto_listings
    if len(listings) < limit:
        remaining = limit - len(listings)
        auto_listings_cursor = db.auto_listings.find(
            {"status": "active", "user_id": {"$in": verified_user_ids}},
            {"_id": 0}
        ).sort([("featured", -1), ("boost_score", -1), ("created_at", -1)]).limit(remaining)
        auto_listings = await auto_listings_cursor.to_list(length=remaining)
        listings.extend(auto_listings)
    
    # Attach seller info to each listing
    for listing in listings:
        user_id = listing.get("user_id")
        if user_id and user_id in seller_info:
            listing["seller"] = {
                "business_name": seller_info[user_id].get("business_name", "Verified Seller"),
                "is_verified": seller_info[user_id].get("is_verified", False),
                "is_premium": seller_info[user_id].get("is_premium", False)
            }
    
    return {"listings": listings, "source": "verified_sellers"}

# ==================== AUTO/MOTORS ENDPOINTS ====================
# Now handled by modular router (routes/auto_motors.py)
# Includes: brands, models, listings, conversations, favorites, search

# ==================== PROPERTY, OFFERS, SIMILAR LISTINGS, BOOST ====================
# Now handled by modular routers (routes/property.py)
# - create_property_router: listings CRUD, featured, viewings, analytics, boost/feature
# - create_offers_router: offer submission, negotiation, counter-offers
# - create_similar_listings_router: weighted similarity algorithm

# ==================== USER SETTINGS ENDPOINTS ====================
# Now handled by modular router (routes/user_settings.py)
# - create_user_settings_router: get/update settings, push token
# - create_sessions_router: active sessions, revoke sessions
# - create_id_verification_router: submit/status of ID verification

# ==================== NOTIFICATION ENDPOINTS ====================
# Now handled by modular router (routes/notifications.py)
# Includes: get/list/read/delete notifications, seed sample notifications

# Internal function to create notifications (merged version)
async def create_notification(
    user_id: str,
    notification_type: str,
    title: str,
    body: str,
    cta_label: str = None,
    cta_route: str = None,
    actor_id: str = None,
    actor_name: str = None,
    actor_picture: str = None,
    listing_id: str = None,
    listing_title: str = None,
    image_url: str = None,
    meta: dict = None,
    data_payload: Dict[str, Any] = None
):
    """Create a notification for a user and optionally send push/email"""
    notification_id = str(uuid.uuid4())
    notification = {
        "id": notification_id,
        "user_id": user_id,
        "type": notification_type,
        "title": title,
        "body": body,
        "cta_label": cta_label,
        "cta_route": cta_route,
        "read": False,
        "created_at": datetime.utcnow().isoformat(),
        "actor_id": actor_id,
        "actor_name": actor_name,
        "actor_picture": actor_picture,
        "listing_id": listing_id,
        "listing_title": listing_title,
        "image_url": image_url,
        "meta": meta or {},
        "data_payload": data_payload or {}
    }
    
    await db.notifications.insert_one(notification)
    
    # Get user settings to check notification preferences and send push if enabled
    settings = await db.user_settings.find_one({"user_id": user_id})
    user_data = await db.users.find_one({"user_id": user_id})
    
    if settings and user_data:
        notifications_prefs = settings.get("notifications", {})
        quiet_hours = settings.get("quiet_hours", {})
        
        # Check quiet hours
        in_quiet_hours = False
        if quiet_hours.get("enabled"):
            now = datetime.now(timezone.utc)
            start = quiet_hours.get("start_time", "22:00")
            end = quiet_hours.get("end_time", "07:00")
            current_time = now.strftime("%H:%M")
            if start > end:
                in_quiet_hours = current_time >= start or current_time < end
            else:
                in_quiet_hours = start <= current_time < end
        
        # Send push notification if enabled and not in quiet hours
        if not in_quiet_hours and notifications_prefs.get("push", True):
            push_token = user_data.get("push_token")
            if push_token:
                await send_push_notification(
                    push_token, title, body, 
                    data_payload or {"notification_id": notification_id, "type": notification_type},
                    notification_type
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

# ==================== MILESTONE PUSH NOTIFICATIONS ====================

async def send_milestone_push_notification(user_id: str, milestone: Dict[str, Any]) -> bool:
    """Send push notification when user achieves a milestone"""
    try:
        # Get user's push token
        user = await db.users.find_one({"user_id": user_id})
        if not user:
            return False
        
        push_token = user.get("push_token")
        if not push_token:
            return False
        
        # Build notification content
        title = f"🎉 {milestone.get('name', 'New Achievement!')}"
        body = milestone.get('message', 'Congratulations on your achievement!')
        
        # Add emoji based on milestone type
        if milestone.get('type') == 'count':
            threshold = milestone.get('threshold', 1)
            if threshold >= 50:
                title = f"🏆 {milestone.get('name', 'Legend Status!')}"
            elif threshold >= 25:
                title = f"⭐ {milestone.get('name', 'Badge Master!')}"
            elif threshold >= 10:
                title = f"🎯 {milestone.get('name', 'Achievement Hunter!')}"
        elif milestone.get('type') == 'special':
            badge_name = milestone.get('badge_name', '')
            if 'Sale' in badge_name:
                title = f"💰 {milestone.get('name', 'Sale Milestone!')}"
            elif 'Seller' in badge_name:
                title = f"🌟 {milestone.get('name', 'Seller Milestone!')}"
        
        data = {
            "type": "milestone",
            "milestone_id": milestone.get('id', ''),
            "milestone_type": milestone.get('type', 'count'),
            "route": "/profile/badges",
        }
        
        return await send_push_notification(
            push_token=push_token,
            title=title,
            body=body,
            data=data,
            notification_type="milestone"
        )
    except Exception as e:
        logger.error(f"Failed to send milestone push notification: {e}")
        return False

async def check_and_notify_new_milestones(user_id: str) -> List[Dict[str, Any]]:
    """Check for new milestones and send push notifications for each"""
    try:
        # Get total badge count
        total_badges = await db.user_badges.count_documents({"user_id": user_id})
        
        # Get user's badges with names
        user_badges = await db.user_badges.find({"user_id": user_id}).to_list(length=100)
        badge_ids = [b["badge_id"] for b in user_badges]
        badges = await db.badges.find({"id": {"$in": badge_ids}}).to_list(length=100)
        badge_names = {b["id"]: b["name"] for b in badges}
        
        # Get acknowledged milestones
        user_milestones = await db.user_milestones.find({"user_id": user_id}).to_list(length=100)
        acknowledged_ids = {m["milestone_id"] for m in user_milestones}
        
        new_milestones = []
        
        # Check count-based milestones
        for milestone in BADGE_MILESTONES:
            milestone_id = f"count_{milestone['count']}"
            if total_badges >= milestone["count"] and milestone_id not in acknowledged_ids:
                milestone_data = {
                    "id": milestone_id,
                    "type": "count",
                    "name": milestone["name"],
                    "message": milestone["message"],
                    "icon": milestone["icon"],
                    "threshold": milestone["count"],
                }
                new_milestones.append(milestone_data)
                
                # Send push notification
                await send_milestone_push_notification(user_id, milestone_data)
        
        # Check special badge milestones
        for badge_name, milestone in SPECIAL_BADGE_MILESTONES.items():
            milestone_id = f"special_{badge_name.replace(' ', '_').lower()}"
            earned = any(badge_names.get(b["badge_id"]) == badge_name for b in user_badges)
            
            if earned and milestone_id not in acknowledged_ids:
                milestone_data = {
                    "id": milestone_id,
                    "type": "special",
                    "badge_name": badge_name,
                    "name": milestone["name"],
                    "message": milestone["message"],
                    "icon": milestone["icon"],
                }
                new_milestones.append(milestone_data)
                
                # Send push notification
                await send_milestone_push_notification(user_id, milestone_data)
        
        return new_milestones
    except Exception as e:
        logger.error(f"Error checking milestones for push notifications: {e}")
        return []

# ==================== BADGE CHALLENGES ====================

from enum import Enum

class ChallengeType(str, Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    SPECIAL = "special"
    SEASONAL = "seasonal"

class ChallengeCriteria(str, Enum):
    LISTINGS_CREATED = "listings_created"
    ITEMS_SOLD = "items_sold"
    TOTAL_SALES_VALUE = "total_sales_value"
    MESSAGES_SENT = "messages_sent"
    PROFILE_VIEWS = "profile_views"
    FIVE_STAR_REVIEWS = "five_star_reviews"
    CATEGORY_LISTINGS = "category_listings"
    CATEGORY_SALES = "category_sales"

# Seasonal challenge configurations with date ranges
SEASONAL_CHALLENGES = [
    {
        "id": "valentines_special",
        "name": "Valentine's Special",
        "description": "Sell 5 items in Fashion & Beauty or Home & Furniture categories",
        "type": ChallengeType.SEASONAL,
        "criteria": ChallengeCriteria.CATEGORY_SALES,
        "target": 5,
        "categories": ["fashion_beauty", "home_furniture"],
        "start_month": 2, "start_day": 1,
        "end_month": 2, "end_day": 14,
        "badge_reward": {
            "name": "Valentine's Champion",
            "description": "Spread the love with 5+ gift sales",
            "icon": "heart",
            "color": "#EC4899",
            "points_value": 50,
        },
        "icon": "heart",
        "color": "#EC4899",
        "theme": "valentine",
    },
    {
        "id": "spring_refresh",
        "name": "Spring Refresh Sale",
        "description": "List 15 items in Home & Furniture or Fashion categories",
        "type": ChallengeType.SEASONAL,
        "criteria": ChallengeCriteria.CATEGORY_LISTINGS,
        "target": 15,
        "categories": ["home_furniture", "fashion_beauty"],
        "start_month": 3, "start_day": 20,
        "end_month": 4, "end_day": 20,
        "badge_reward": {
            "name": "Spring Refresh Pro",
            "description": "Helped buyers refresh their style for spring",
            "icon": "flower",
            "color": "#10B981",
            "points_value": 60,
        },
        "icon": "flower",
        "color": "#10B981",
        "theme": "spring",
    },
    {
        "id": "summer_deals",
        "name": "Summer Deals Festival",
        "description": "Achieve €300 in total sales during summer",
        "type": ChallengeType.SEASONAL,
        "criteria": ChallengeCriteria.TOTAL_SALES_VALUE,
        "target": 300,
        "start_month": 6, "start_day": 21,
        "end_month": 7, "end_day": 31,
        "badge_reward": {
            "name": "Summer Sales Star",
            "description": "Made €300+ in summer sales",
            "icon": "sunny",
            "color": "#F59E0B",
            "points_value": 80,
        },
        "icon": "sunny",
        "color": "#F59E0B",
        "theme": "summer",
    },
    {
        "id": "back_to_school",
        "name": "Back to School",
        "description": "Sell 8 items in Electronics or Books & Media categories",
        "type": ChallengeType.SEASONAL,
        "criteria": ChallengeCriteria.CATEGORY_SALES,
        "target": 8,
        "categories": ["electronics", "phones_tablets", "books_media"],
        "start_month": 8, "start_day": 15,
        "end_month": 9, "end_day": 15,
        "badge_reward": {
            "name": "Back to School Hero",
            "description": "Helped students gear up for school",
            "icon": "school",
            "color": "#3B82F6",
            "points_value": 70,
        },
        "icon": "school",
        "color": "#3B82F6",
        "theme": "school",
    },
    {
        "id": "halloween_spooktacular",
        "name": "Halloween Spooktacular",
        "description": "List 10 items during the Halloween season",
        "type": ChallengeType.SEASONAL,
        "criteria": ChallengeCriteria.LISTINGS_CREATED,
        "target": 10,
        "start_month": 10, "start_day": 15,
        "end_month": 10, "end_day": 31,
        "badge_reward": {
            "name": "Spooky Seller",
            "description": "Haunted the marketplace with 10+ listings",
            "icon": "moon",
            "color": "#7C3AED",
            "points_value": 45,
        },
        "icon": "moon",
        "color": "#7C3AED",
        "theme": "halloween",
    },
    {
        "id": "black_friday_blitz",
        "name": "Black Friday Blitz",
        "description": "Sell 10 items during Black Friday week",
        "type": ChallengeType.SEASONAL,
        "criteria": ChallengeCriteria.ITEMS_SOLD,
        "target": 10,
        "start_month": 11, "start_day": 20,
        "end_month": 11, "end_day": 30,
        "badge_reward": {
            "name": "Black Friday Champion",
            "description": "Dominated Black Friday with 10+ sales",
            "icon": "flash",
            "color": "#1F2937",
            "points_value": 100,
        },
        "icon": "flash",
        "color": "#1F2937",
        "theme": "blackfriday",
    },
    {
        "id": "holiday_gift_giver",
        "name": "Holiday Gift Giver",
        "description": "Achieve €500 in sales during the holiday season",
        "type": ChallengeType.SEASONAL,
        "criteria": ChallengeCriteria.TOTAL_SALES_VALUE,
        "target": 500,
        "start_month": 12, "start_day": 1,
        "end_month": 12, "end_day": 25,
        "badge_reward": {
            "name": "Holiday Hero",
            "description": "Spread holiday joy with €500+ in sales",
            "icon": "gift",
            "color": "#DC2626",
            "points_value": 120,
        },
        "icon": "gift",
        "color": "#DC2626",
        "theme": "holiday",
    },
    {
        "id": "new_year_fresh_start",
        "name": "New Year Fresh Start",
        "description": "List 20 new items in the first two weeks of the year",
        "type": ChallengeType.SEASONAL,
        "criteria": ChallengeCriteria.LISTINGS_CREATED,
        "target": 20,
        "start_month": 1, "start_day": 1,
        "end_month": 1, "end_day": 15,
        "badge_reward": {
            "name": "New Year Achiever",
            "description": "Started the year strong with 20+ listings",
            "icon": "sparkles",
            "color": "#8B5CF6",
            "points_value": 75,
        },
        "icon": "sparkles",
        "color": "#8B5CF6",
        "theme": "newyear",
    },
]

# Define available challenges
CHALLENGE_DEFINITIONS = [
    # Weekly Challenges
    {
        "id": "weekend_warrior",
        "name": "Weekend Warrior",
        "description": "List 5 items during the weekend (Saturday-Sunday)",
        "type": ChallengeType.WEEKLY,
        "criteria": ChallengeCriteria.LISTINGS_CREATED,
        "target": 5,
        "weekend_only": True,
        "badge_reward": {
            "name": "Weekend Warrior",
            "description": "Listed 5+ items in a single weekend",
            "icon": "flash",
            "color": "#F59E0B",
            "points_value": 25,
        },
        "icon": "flash",
        "color": "#F59E0B",
    },
    {
        "id": "weekly_seller",
        "name": "Weekly Sales Star",
        "description": "Sell 3 items this week",
        "type": ChallengeType.WEEKLY,
        "criteria": ChallengeCriteria.ITEMS_SOLD,
        "target": 3,
        "badge_reward": {
            "name": "Weekly Sales Star",
            "description": "Sold 3+ items in a single week",
            "icon": "star",
            "color": "#EF4444",
            "points_value": 30,
        },
        "icon": "star",
        "color": "#EF4444",
    },
    {
        "id": "listing_sprint",
        "name": "Listing Sprint",
        "description": "Create 10 listings this week",
        "type": ChallengeType.WEEKLY,
        "criteria": ChallengeCriteria.LISTINGS_CREATED,
        "target": 10,
        "badge_reward": {
            "name": "Listing Sprint Champion",
            "description": "Created 10+ listings in a single week",
            "icon": "rocket",
            "color": "#8B5CF6",
            "points_value": 35,
        },
        "icon": "rocket",
        "color": "#8B5CF6",
    },
    # Monthly Challenges
    {
        "id": "monthly_top_seller",
        "name": "Monthly Top Seller",
        "description": "Sell 15 items this month",
        "type": ChallengeType.MONTHLY,
        "criteria": ChallengeCriteria.ITEMS_SOLD,
        "target": 15,
        "badge_reward": {
            "name": "Monthly Top Seller",
            "description": "Achieved top seller status for the month",
            "icon": "trophy",
            "color": "#FFD700",
            "points_value": 100,
        },
        "icon": "trophy",
        "color": "#FFD700",
    },
    {
        "id": "inventory_king",
        "name": "Inventory King",
        "description": "List 30 items this month",
        "type": ChallengeType.MONTHLY,
        "criteria": ChallengeCriteria.LISTINGS_CREATED,
        "target": 30,
        "badge_reward": {
            "name": "Inventory King",
            "description": "Listed 30+ items in a single month",
            "icon": "layers",
            "color": "#10B981",
            "points_value": 75,
        },
        "icon": "layers",
        "color": "#10B981",
    },
    {
        "id": "high_value_month",
        "name": "High Roller Month",
        "description": "Achieve €500 in total sales this month",
        "type": ChallengeType.MONTHLY,
        "criteria": ChallengeCriteria.TOTAL_SALES_VALUE,
        "target": 500,
        "badge_reward": {
            "name": "High Roller",
            "description": "Achieved €500+ in sales in a single month",
            "icon": "cash",
            "color": "#059669",
            "points_value": 150,
        },
        "icon": "cash",
        "color": "#059669",
    },
    {
        "id": "community_connector",
        "name": "Community Connector",
        "description": "Send 50 messages to buyers this month",
        "type": ChallengeType.MONTHLY,
        "criteria": ChallengeCriteria.MESSAGES_SENT,
        "target": 50,
        "badge_reward": {
            "name": "Community Connector",
            "description": "Engaged with 50+ buyer messages in a month",
            "icon": "chatbubbles",
            "color": "#3B82F6",
            "points_value": 50,
        },
        "icon": "chatbubbles",
        "color": "#3B82F6",
    },
]

def get_challenge_period(challenge_type: ChallengeType, challenge_def: dict = None) -> tuple:
    """Get the start and end dates for the current challenge period"""
    now = datetime.now(timezone.utc)
    
    if challenge_type == ChallengeType.WEEKLY:
        # Week starts on Monday
        start = now - timedelta(days=now.weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=7)
    elif challenge_type == ChallengeType.MONTHLY:
        # Month starts on the 1st
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        # Get next month
        if now.month == 12:
            end = now.replace(year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            end = now.replace(month=now.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)
    elif challenge_type == ChallengeType.SEASONAL and challenge_def:
        # Seasonal challenges have specific date ranges
        start, end = get_seasonal_challenge_period(challenge_def)
    else:
        # Special challenges - default to this week
        start = now - timedelta(days=now.weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=7)
    
    return start, end

def get_seasonal_challenge_period(challenge_def: dict) -> tuple:
    """Get the start and end dates for a seasonal challenge"""
    now = datetime.now(timezone.utc)
    current_year = now.year
    
    start_month = challenge_def.get("start_month", 1)
    start_day = challenge_def.get("start_day", 1)
    end_month = challenge_def.get("end_month", 12)
    end_day = challenge_def.get("end_day", 31)
    
    # Create dates for current year
    try:
        start = datetime(current_year, start_month, start_day, 0, 0, 0, tzinfo=timezone.utc)
        end = datetime(current_year, end_month, end_day, 23, 59, 59, tzinfo=timezone.utc)
        
        # If end is before start (e.g., challenge spans year boundary), adjust
        if end < start:
            if now.month >= start_month:
                # We're after the start, so end is next year
                end = datetime(current_year + 1, end_month, end_day, 23, 59, 59, tzinfo=timezone.utc)
            else:
                # We're before the start, so start was last year
                start = datetime(current_year - 1, start_month, start_day, 0, 0, 0, tzinfo=timezone.utc)
    except ValueError:
        # Handle invalid dates (e.g., Feb 30)
        start = now
        end = now + timedelta(days=7)
    
    return start, end

def is_seasonal_challenge_active(challenge_def: dict) -> bool:
    """Check if a seasonal challenge is currently active"""
    now = datetime.now(timezone.utc)
    start, end = get_seasonal_challenge_period(challenge_def)
    return start <= now <= end

def get_active_seasonal_challenges() -> list:
    """Get list of currently active seasonal challenges"""
    return [c for c in SEASONAL_CHALLENGES if is_seasonal_challenge_active(c)]

def get_weekend_period() -> tuple:
    """Get the start and end dates for the current weekend"""
    now = datetime.now(timezone.utc)
    days_until_saturday = (5 - now.weekday()) % 7
    
    if now.weekday() in [5, 6]:  # Already weekend
        if now.weekday() == 6:  # Sunday
            start = now - timedelta(days=1)
        else:  # Saturday
            start = now
    else:
        start = now + timedelta(days=days_until_saturday)
    
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=2)  # Saturday + Sunday
    
    return start, end

async def get_user_challenge_progress(user_id: str, challenge: dict, start_date: datetime, end_date: datetime) -> int:
    """Calculate user's progress for a specific challenge"""
    criteria = challenge.get("criteria")
    
    if challenge.get("weekend_only"):
        start_date, end_date = get_weekend_period()
    
    # Get category filter if present
    categories = challenge.get("categories", [])
    
    if criteria == ChallengeCriteria.LISTINGS_CREATED:
        count = await db.listings.count_documents({
            "seller_id": user_id,
            "created_at": {"$gte": start_date, "$lt": end_date}
        })
        return count
    
    elif criteria == ChallengeCriteria.ITEMS_SOLD:
        count = await db.listings.count_documents({
            "seller_id": user_id,
            "status": "sold",
            "sold_at": {"$gte": start_date, "$lt": end_date}
        })
        return count
    
    elif criteria == ChallengeCriteria.TOTAL_SALES_VALUE:
        pipeline = [
            {
                "$match": {
                    "seller_id": user_id,
                    "status": "sold",
                    "sold_at": {"$gte": start_date, "$lt": end_date}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": "$price"}
                }
            }
        ]
        result = await db.listings.aggregate(pipeline).to_list(1)
        return int(result[0]["total"]) if result else 0
    
    elif criteria == ChallengeCriteria.MESSAGES_SENT:
        count = await db.messages.count_documents({
            "sender_id": user_id,
            "created_at": {"$gte": start_date, "$lt": end_date}
        })
        return count
    
    elif criteria == ChallengeCriteria.CATEGORY_LISTINGS:
        # Listings in specific categories
        query = {
            "seller_id": user_id,
            "created_at": {"$gte": start_date, "$lt": end_date}
        }
        if categories:
            query["category"] = {"$in": categories}
        count = await db.listings.count_documents(query)
        return count
    
    elif criteria == ChallengeCriteria.CATEGORY_SALES:
        # Sales in specific categories
        query = {
            "seller_id": user_id,
            "status": "sold",
            "sold_at": {"$gte": start_date, "$lt": end_date}
        }
        if categories:
            query["category"] = {"$in": categories}
        count = await db.listings.count_documents(query)
        return count
    
    return 0

@api_router.get("/challenges")
async def get_active_challenges(request: Request):
    """Get all active challenges with user's progress if authenticated"""
    user = None
    try:
        user = await require_auth(request)
    except:
        pass  # Anonymous access allowed
    
    now = datetime.now(timezone.utc)
    challenges = []
    
    # Add regular (weekly/monthly) challenges
    for challenge_def in CHALLENGE_DEFINITIONS:
        challenge_type = challenge_def["type"]
        start_date, end_date = get_challenge_period(challenge_type, challenge_def)
        
        # Calculate time remaining
        time_remaining = end_date - now
        days_remaining = time_remaining.days
        hours_remaining = time_remaining.seconds // 3600
        
        challenge_data = {
            "id": challenge_def["id"],
            "name": challenge_def["name"],
            "description": challenge_def["description"],
            "type": challenge_type.value,
            "target": challenge_def["target"],
            "icon": challenge_def["icon"],
            "color": challenge_def["color"],
            "badge_reward": challenge_def["badge_reward"],
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "days_remaining": max(0, days_remaining),
            "hours_remaining": hours_remaining if days_remaining == 0 else 0,
            "progress": 0,
            "completed": False,
            "joined": False,
        }
        
        if user:
            # Get user's progress
            progress = await get_user_challenge_progress(
                user.user_id, challenge_def, start_date, end_date
            )
            challenge_data["progress"] = progress
            challenge_data["completed"] = progress >= challenge_def["target"]
            
            # Check if user joined this challenge
            participation = await db.challenge_participants.find_one({
                "user_id": user.user_id,
                "challenge_id": challenge_def["id"],
                "period_start": start_date
            })
            challenge_data["joined"] = participation is not None
            
            # Check if already earned badge for this period
            badge_earned = await db.challenge_completions.find_one({
                "user_id": user.user_id,
                "challenge_id": challenge_def["id"],
                "period_start": start_date
            })
            challenge_data["badge_earned"] = badge_earned is not None
        
        challenges.append(challenge_data)
    
    # Add active seasonal challenges
    active_seasonal = get_active_seasonal_challenges()
    for challenge_def in active_seasonal:
        challenge_type = challenge_def["type"]
        start_date, end_date = get_challenge_period(challenge_type, challenge_def)
        
        # Calculate time remaining
        time_remaining = end_date - now
        days_remaining = time_remaining.days
        hours_remaining = time_remaining.seconds // 3600
        
        challenge_data = {
            "id": challenge_def["id"],
            "name": challenge_def["name"],
            "description": challenge_def["description"],
            "type": "seasonal",
            "target": challenge_def["target"],
            "icon": challenge_def["icon"],
            "color": challenge_def["color"],
            "badge_reward": challenge_def["badge_reward"],
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "days_remaining": max(0, days_remaining),
            "hours_remaining": hours_remaining if days_remaining == 0 else 0,
            "progress": 0,
            "completed": False,
            "joined": False,
            "theme": challenge_def.get("theme", "default"),
            "categories": challenge_def.get("categories", []),
        }
        
        if user:
            progress = await get_user_challenge_progress(
                user.user_id, challenge_def, start_date, end_date
            )
            challenge_data["progress"] = progress
            challenge_data["completed"] = progress >= challenge_def["target"]
            
            participation = await db.challenge_participants.find_one({
                "user_id": user.user_id,
                "challenge_id": challenge_def["id"],
                "period_start": start_date
            })
            challenge_data["joined"] = participation is not None
            
            badge_earned = await db.challenge_completions.find_one({
                "user_id": user.user_id,
                "challenge_id": challenge_def["id"],
                "period_start": start_date
            })
            challenge_data["badge_earned"] = badge_earned is not None
        
        challenges.append(challenge_data)
    
    # Sort: seasonal first (featured), then weekly, then monthly
    def sort_key(x):
        type_order = {"seasonal": 0, "weekly": 1, "monthly": 2}
        return (type_order.get(x["type"], 3), -x["progress"])
    
    challenges.sort(key=sort_key)
    
    return {
        "challenges": challenges,
        "total_weekly": len([c for c in challenges if c["type"] == "weekly"]),
        "total_monthly": len([c for c in challenges if c["type"] == "monthly"]),
        "total_seasonal": len([c for c in challenges if c["type"] == "seasonal"]),
    }

# NOTE: This route MUST be before /challenges/{challenge_id} to avoid route matching issues
@api_router.get("/challenges/my-progress")
async def get_my_challenge_progress(request: Request):
    """Get user's progress on all active challenges"""
    user = await require_auth(request)
    
    now = datetime.now(timezone.utc)
    challenges_progress = []
    
    for challenge_def in CHALLENGE_DEFINITIONS:
        challenge_type = challenge_def["type"]
        start_date, end_date = get_challenge_period(challenge_type)
        
        progress = await get_user_challenge_progress(
            user.user_id, challenge_def, start_date, end_date
        )
        
        # Check if already earned badge for this period
        badge_earned = await db.challenge_completions.find_one({
            "user_id": user.user_id,
            "challenge_id": challenge_def["id"],
            "period_start": start_date
        })
        
        challenges_progress.append({
            "challenge_id": challenge_def["id"],
            "name": challenge_def["name"],
            "type": challenge_type.value,
            "progress": progress,
            "target": challenge_def["target"],
            "percentage": min(100, int((progress / challenge_def["target"]) * 100)),
            "completed": progress >= challenge_def["target"],
            "badge_earned": badge_earned is not None,
            "icon": challenge_def["icon"],
            "color": challenge_def["color"],
        })
    
    # Count completed and in-progress
    completed_count = len([c for c in challenges_progress if c["completed"]])
    in_progress_count = len([c for c in challenges_progress if 0 < c["progress"] < c["target"]])
    
    return {
        "challenges": challenges_progress,
        "summary": {
            "total": len(challenges_progress),
            "completed": completed_count,
            "in_progress": in_progress_count,
            "not_started": len(challenges_progress) - completed_count - in_progress_count,
        }
    }

@api_router.get("/challenges/{challenge_id}")
async def get_challenge_details(challenge_id: str, request: Request):
    """Get details for a specific challenge including leaderboard"""
    user = None
    try:
        user = await require_auth(request)
    except:
        pass
    
    # Find challenge definition - check both regular and seasonal challenges
    challenge_def = next((c for c in CHALLENGE_DEFINITIONS if c["id"] == challenge_id), None)
    if not challenge_def:
        # Also check seasonal challenges
        challenge_def = next((c for c in SEASONAL_CHALLENGES if c["id"] == challenge_id), None)
    if not challenge_def:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    challenge_type = challenge_def["type"]
    start_date, end_date = get_challenge_period(challenge_type, challenge_def)
    now = datetime.now(timezone.utc)
    
    # Get top participants for this challenge period
    participants = await db.challenge_participants.find({
        "challenge_id": challenge_id,
        "period_start": start_date
    }).sort("progress", -1).limit(20).to_list(20)
    
    # Get user details for participants
    user_ids = [p["user_id"] for p in participants]
    users = await db.users.find({"user_id": {"$in": user_ids}}).to_list(20)
    users_map = {u["user_id"]: u for u in users}
    
    leaderboard = []
    for i, p in enumerate(participants):
        u = users_map.get(p["user_id"], {})
        leaderboard.append({
            "rank": i + 1,
            "user_id": p["user_id"],
            "user_name": u.get("name", "Anonymous"),
            "avatar_url": u.get("avatar_url"),
            "progress": p["progress"],
            "completed": p["progress"] >= challenge_def["target"],
        })
    
    time_remaining = end_date - now
    
    response = {
        "id": challenge_def["id"],
        "name": challenge_def["name"],
        "description": challenge_def["description"],
        "type": challenge_type.value,
        "target": challenge_def["target"],
        "icon": challenge_def["icon"],
        "color": challenge_def["color"],
        "badge_reward": challenge_def["badge_reward"],
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "days_remaining": max(0, time_remaining.days),
        "hours_remaining": time_remaining.seconds // 3600 if time_remaining.days == 0 else 0,
        "leaderboard": leaderboard,
        "total_participants": len(participants),
    }
    
    if user:
        progress = await get_user_challenge_progress(
            user.user_id, challenge_def, start_date, end_date
        )
        response["my_progress"] = progress
        response["my_completed"] = progress >= challenge_def["target"]
        
        # Find user's rank
        user_rank = next((i + 1 for i, p in enumerate(participants) if p["user_id"] == user.user_id), None)
        response["my_rank"] = user_rank
    
    return response

@api_router.post("/challenges/{challenge_id}/join")
async def join_challenge(challenge_id: str, request: Request):
    """Join a challenge to track progress and appear on leaderboard"""
    user = await require_auth(request)
    
    # Find challenge definition - check both regular and seasonal challenges
    challenge_def = next((c for c in CHALLENGE_DEFINITIONS if c["id"] == challenge_id), None)
    if not challenge_def:
        # Also check seasonal challenges
        challenge_def = next((c for c in SEASONAL_CHALLENGES if c["id"] == challenge_id), None)
    if not challenge_def:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    challenge_type = challenge_def["type"]
    start_date, end_date = get_challenge_period(challenge_type, challenge_def)
    
    # Check if already joined
    existing = await db.challenge_participants.find_one({
        "user_id": user.user_id,
        "challenge_id": challenge_id,
        "period_start": start_date
    })
    
    if existing:
        return {"message": "Already joined this challenge", "joined": True}
    
    # Get current progress
    progress = await get_user_challenge_progress(
        user.user_id, challenge_def, start_date, end_date
    )
    
    # Create participation record
    await db.challenge_participants.insert_one({
        "user_id": user.user_id,
        "challenge_id": challenge_id,
        "period_start": start_date,
        "period_end": end_date,
        "progress": progress,
        "joined_at": datetime.now(timezone.utc),
    })
    
    return {
        "message": "Successfully joined challenge",
        "joined": True,
        "progress": progress,
        "target": challenge_def["target"],
    }

async def check_and_award_challenge_badges(user_id: str):
    """Check if user completed any challenges and award badges"""
    now = datetime.now(timezone.utc)
    awarded_badges = []
    
    for challenge_def in CHALLENGE_DEFINITIONS:
        challenge_type = challenge_def["type"]
        start_date, end_date = get_challenge_period(challenge_type)
        
        # Check if already earned badge for this period
        existing_completion = await db.challenge_completions.find_one({
            "user_id": user_id,
            "challenge_id": challenge_def["id"],
            "period_start": start_date
        })
        
        if existing_completion:
            continue
        
        # Get progress
        progress = await get_user_challenge_progress(
            user_id, challenge_def, start_date, end_date
        )
        
        # Update participation record if exists
        await db.challenge_participants.update_one(
            {
                "user_id": user_id,
                "challenge_id": challenge_def["id"],
                "period_start": start_date
            },
            {"$set": {"progress": progress, "updated_at": now}},
            upsert=False
        )
        
        if progress >= challenge_def["target"]:
            # User completed the challenge!
            badge_reward = challenge_def["badge_reward"]
            
            # Create or get badge
            badge_id = f"challenge_{challenge_def['id']}_{start_date.strftime('%Y%m%d')}"
            
            existing_badge = await db.badges.find_one({"id": badge_id})
            if not existing_badge:
                await db.badges.insert_one({
                    "id": badge_id,
                    "name": badge_reward["name"],
                    "description": badge_reward["description"],
                    "icon": badge_reward["icon"],
                    "color": badge_reward["color"],
                    "points_value": badge_reward["points_value"],
                    "category": "challenge",
                    "challenge_id": challenge_def["id"],
                    "period_start": start_date,
                    "is_limited": True,
                    "created_at": now,
                })
            
            # Award badge to user
            existing_user_badge = await db.user_badges.find_one({
                "user_id": user_id,
                "badge_id": badge_id
            })
            
            if not existing_user_badge:
                await db.user_badges.insert_one({
                    "user_id": user_id,
                    "badge_id": badge_id,
                    "earned_at": now,
                    "is_viewed": False,
                    "source": "challenge",
                    "challenge_id": challenge_def["id"],
                })
                
                # Record completion
                await db.challenge_completions.insert_one({
                    "user_id": user_id,
                    "challenge_id": challenge_def["id"],
                    "period_start": start_date,
                    "period_end": end_date,
                    "badge_id": badge_id,
                    "completed_at": now,
                    "progress": progress,
                })
                
                awarded_badges.append({
                    "badge_id": badge_id,
                    "name": badge_reward["name"],
                    "description": badge_reward["description"],
                    "icon": badge_reward["icon"],
                    "color": badge_reward["color"],
                    "points_value": badge_reward["points_value"],
                    "challenge_name": challenge_def["name"],
                })
                
                # Send push notification
                await send_push_notification(
                    push_token=(await db.users.find_one({"user_id": user_id}) or {}).get("push_token"),
                    title=f"🏆 Challenge Complete: {challenge_def['name']}!",
                    body=f"You've earned the {badge_reward['name']} badge!",
                    data={"type": "challenge_complete", "challenge_id": challenge_def["id"]},
                    notification_type="challenge"
                )
                
                # Update streak tracking
                await update_challenge_streak(user_id)
    
    return awarded_badges

async def update_challenge_streak(user_id: str):
    """Update user's challenge completion streak"""
    now = datetime.now(timezone.utc)
    
    # Get user's streak record
    streak = await db.user_streaks.find_one({"user_id": user_id})
    
    if not streak:
        # First challenge completion
        await db.user_streaks.insert_one({
            "user_id": user_id,
            "current_streak": 1,
            "longest_streak": 1,
            "last_completion": now,
            "total_completions": 1,
            "streak_bonus_points": 0,
            "created_at": now,
            "updated_at": now,
        })
        return
    
    # Calculate if this continues a streak (completed within the week)
    last_completion = streak.get("last_completion")
    days_since_last = (now - last_completion).days if last_completion else 999
    
    if days_since_last <= 7:
        # Continue streak
        new_streak = streak.get("current_streak", 0) + 1
        longest = max(new_streak, streak.get("longest_streak", 0))
        
        # Calculate streak bonus (10 points per streak level, max 100)
        streak_bonus = min(new_streak * 10, 100)
        
        await db.user_streaks.update_one(
            {"user_id": user_id},
            {"$set": {
                "current_streak": new_streak,
                "longest_streak": longest,
                "last_completion": now,
                "streak_bonus_points": streak_bonus,
                "updated_at": now,
            }, "$inc": {"total_completions": 1}}
        )
        
        # Award streak badges
        await check_and_award_streak_badges(user_id, new_streak)
    else:
        # Streak broken, reset to 1
        await db.user_streaks.update_one(
            {"user_id": user_id},
            {"$set": {
                "current_streak": 1,
                "last_completion": now,
                "streak_bonus_points": 10,
                "updated_at": now,
            }, "$inc": {"total_completions": 1}}
        )

async def check_and_award_streak_badges(user_id: str, streak_count: int):
    """Award badges for reaching streak milestones"""
    now = datetime.now(timezone.utc)
    
    streak_badges = [
        {"threshold": 3, "id": "streak_3", "name": "Hot Streak", "description": "Completed 3 challenges in a row!", "icon": "flame", "color": "#F97316", "points": 25},
        {"threshold": 5, "id": "streak_5", "name": "On Fire", "description": "Completed 5 challenges in a row!", "icon": "bonfire", "color": "#EF4444", "points": 50},
        {"threshold": 10, "id": "streak_10", "name": "Unstoppable", "description": "Completed 10 challenges in a row!", "icon": "rocket", "color": "#8B5CF6", "points": 100},
    ]
    
    for badge_def in streak_badges:
        if streak_count >= badge_def["threshold"]:
            badge_id = f"streak_{badge_def['id']}"
            
            # Check if already has this badge
            existing = await db.user_badges.find_one({
                "user_id": user_id,
                "badge_id": badge_id
            })
            
            if not existing:
                # Create badge if not exists
                await db.badges.update_one(
                    {"id": badge_id},
                    {"$setOnInsert": {
                        "id": badge_id,
                        "name": badge_def["name"],
                        "description": badge_def["description"],
                        "icon": badge_def["icon"],
                        "color": badge_def["color"],
                        "points_value": badge_def["points"],
                        "category": "streak",
                        "created_at": now,
                    }},
                    upsert=True
                )
                
                # Award to user
                await db.user_badges.insert_one({
                    "user_id": user_id,
                    "badge_id": badge_id,
                    "earned_at": now,
                    "is_viewed": False,
                    "source": "streak",
                })
                
                # Send push notification
                user = await db.users.find_one({"user_id": user_id})
                if user and user.get("push_token"):
                    await send_push_notification(
                        push_token=user["push_token"],
                        title=f"🔥 {badge_def['name']}!",
                        body=badge_def["description"],
                        data={"type": "streak_badge", "badge_id": badge_id},
                        notification_type="streak"
                    )

@api_router.get("/streaks/my-streak")
async def get_my_streak(request: Request):
    """Get current user's challenge completion streak"""
    user = await require_auth(request)
    
    streak = await db.user_streaks.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not streak:
        return {
            "current_streak": 0,
            "longest_streak": 0,
            "total_completions": 0,
            "streak_bonus_points": 0,
            "next_streak_badge": {"threshold": 3, "name": "Hot Streak"},
        }
    
    # Calculate next streak badge
    next_badge = None
    streak_thresholds = [3, 5, 10]
    current = streak.get("current_streak", 0)
    for threshold in streak_thresholds:
        if current < threshold:
            next_badge = {"threshold": threshold, "name": ["Hot Streak", "On Fire", "Unstoppable"][streak_thresholds.index(threshold)]}
            break
    
    return {
        "current_streak": streak.get("current_streak", 0),
        "longest_streak": streak.get("longest_streak", 0),
        "total_completions": streak.get("total_completions", 0),
        "streak_bonus_points": streak.get("streak_bonus_points", 0),
        "last_completion": streak.get("last_completion"),
        "next_streak_badge": next_badge,
    }

@api_router.get("/badges/past-seasonal")
async def get_past_seasonal_badges(
    year: int = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=50),
    request: Request = None
):
    """Get gallery of past seasonal badges"""
    query = {"category": "challenge", "is_limited": True}
    
    if year:
        start_of_year = datetime(year, 1, 1, tzinfo=timezone.utc)
        end_of_year = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        query["period_start"] = {"$gte": start_of_year, "$lt": end_of_year}
    
    skip = (page - 1) * limit
    total = await db.badges.count_documents(query)
    
    badges = await db.badges.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Get earn counts
    for badge in badges:
        badge_id = badge.get("id")
        earned_count = await db.user_badges.count_documents({"badge_id": badge_id})
        badge["earned_count"] = earned_count
        
        # Check if current user has it (if authenticated)
        if request:
            try:
                user = await require_auth(request)
                user_has = await db.user_badges.find_one({
                    "user_id": user.user_id,
                    "badge_id": badge_id
                })
                badge["user_earned"] = user_has is not None
            except:
                badge["user_earned"] = False
    
    # Get available years
    years_pipeline = [
        {"$match": {"category": "challenge", "is_limited": True, "period_start": {"$exists": True}}},
        {"$project": {"year": {"$year": "$period_start"}}},
        {"$group": {"_id": "$year"}},
        {"$sort": {"_id": -1}}
    ]
    years_result = await db.badges.aggregate(years_pipeline).to_list(20)
    available_years = [y["_id"] for y in years_result if y["_id"]]
    
    return {
        "badges": badges,
        "available_years": available_years,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }

# NOTE: /streaks/leaderboard is now handled by routes/streaks.py

# NOTE: Blocked Users endpoints moved to routes/users.py
# - GET /users/blocked - Get list of blocked users
# - POST /users/block/{user_id} - Block a user
# - POST /users/unblock/{user_id} - Unblock a user

# ==================== PROFILE ENDPOINTS ====================
# NOTE: GET /profile, PUT /profile, GET /profile/public/{user_id}, 
# GET /profile/public/{user_id}/badges are now handled by routes/profile.py

# ==================== USER BADGES (PUBLIC) ====================
# NOTE: GET /profile/public/{user_id}/badges is now handled by routes/profile.py

# NOTE: Badge progress, showcase, unviewed-count, and mark-viewed endpoints
# are now handled by routes/badges.py

# ==================== BADGE MILESTONES ====================
# NOTE: Badge milestones endpoints have been moved to routes/badges.py
# - GET /badges/milestones - Get user's achieved and pending milestones
# - POST /badges/milestones/acknowledge - Mark milestone as acknowledged
# - GET /badges/share/{user_id} - Public shareable badge profile

# ==================== FOLLOW, REVIEWS, PROFILE ACTIVITY ====================
# Now handled by modular routers (routes/social.py)
# - create_social_router: follow/unfollow, reviews, user listings
# - create_profile_activity_router: my listings, purchases, sales, recently viewed

# ==================== ACCOUNT MANAGEMENT & SUPPORT TICKETS ====================
# Now handled by modular routers (routes/account_support.py)
# - create_account_router: change password, delete account, cancel deletion
# - create_support_router: create/list/get support tickets

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
# NOTE: GET /profile/activity/favorites and DELETE /profile/activity/recently-viewed
# are now handled by routes/profile.py

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "Local Marketplace API", "status": "running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# =============================================================================
# ADMIN LOCATION ROUTES - Now handled by modular router (routes/admin_locations.py)
# =============================================================================

# =============================================================================
# BUSINESS PROFILE SYSTEM - Register before admin proxy to ensure routes match first
# =============================================================================
if BUSINESS_PROFILE_AVAILABLE:
    # Create auth wrapper for business profile system (expects dict)
    async def require_auth_for_bp(request: Request):
        user = await require_auth(request)
        return {
            "user_id": user.user_id,
            "email": user.email,
            "name": user.name
        }
    
    async def require_admin_for_bp(request: Request):
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        admin_emails = ["admin@marketplace.com", "admin@example.com"]
        if user.email not in admin_emails:
            raise HTTPException(status_code=403, detail="Admin access required")
        return {
            "user_id": user.user_id,
            "email": user.email,
            "name": user.name
        }
    
    # Create routers
    bp_router = create_business_profile_router(db, get_current_user, require_auth_for_bp)
    # Note: Admin business profile management is handled by admin-dashboard backend
    # bp_admin_router = create_business_profile_admin_router(db, require_admin_for_bp)
    
    # Register directly on app (BEFORE the admin proxy catch-all)
    app.include_router(bp_router, prefix="/api")
    # Admin routes are proxied to admin-dashboard instead of being handled locally
    # app.include_router(bp_admin_router, prefix="/api")
    
    logger.info("Business Profile System routes registered (admin routes proxied to dashboard)")

# =============================================================================
# PREMIUM SUBSCRIPTION SYSTEM
# =============================================================================
if PREMIUM_SUBSCRIPTION_AVAILABLE:
    premium_router = create_premium_subscription_router(db, get_current_user)
    app.include_router(premium_router, prefix="/api")
    
    # Stripe webhook endpoint
    @app.post("/api/webhook/stripe")
    async def stripe_webhook(request: Request):
        """Handle Stripe webhook events"""
        return await handle_stripe_webhook(request, db)
    
    logger.info("Premium Subscription System routes registered")

# =============================================================================
# SUBSCRIPTION SERVICES (Email, Auto-Renewal, Invoices)
# =============================================================================
if SUBSCRIPTION_SERVICES_AVAILABLE:
    # Initialize SendGrid client if available
    _sendgrid_client = None
    if SENDGRID_AVAILABLE:
        sendgrid_api_key = os.environ.get("SENDGRID_API_KEY")
        if sendgrid_api_key:
            _sendgrid_client = SendGridAPIClient(sendgrid_api_key)
            logger.info("SendGrid client initialized for subscription emails")
    
    # Initialize services
    _email_service = SubscriptionEmailService(db, _sendgrid_client)
    _auto_renewal_service = AutoRenewalService(db, _email_service)
    _invoice_service = InvoiceService(db)
    
    # Store services on app.state for access in routes
    app.state.email_service = _email_service
    app.state.auto_renewal_service = _auto_renewal_service
    app.state.invoice_service = _invoice_service
    
    # =========================================================================
    # INVOICE API ENDPOINTS
    # =========================================================================
    
    @app.get("/api/invoices")
    async def get_user_invoices(request: Request, limit: int = 20):
        """Get all invoices for the current user"""
        user = await require_auth(request)
        invoices = await _invoice_service.get_user_invoices(user.user_id, limit)
        return {"invoices": invoices}
    
    @app.get("/api/invoices/{invoice_id}")
    async def get_invoice(invoice_id: str, request: Request):
        """Get a specific invoice"""
        user = await require_auth(request)
        invoice = await _invoice_service.get_invoice(invoice_id)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if invoice.get("user_id") != user.user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        return invoice
    
    @app.get("/api/invoices/{invoice_id}/html")
    async def get_invoice_html(invoice_id: str, request: Request):
        """Get invoice as HTML for display/printing"""
        user = await require_auth(request)
        invoice = await _invoice_service.get_invoice(invoice_id)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if invoice.get("user_id") != user.user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        from fastapi.responses import HTMLResponse
        html = _invoice_service.generate_invoice_html(invoice)
        return HTMLResponse(content=html)
    
    @app.post("/api/invoices/create/{transaction_id}")
    async def create_invoice_for_transaction(transaction_id: str, request: Request):
        """Create an invoice for a completed transaction"""
        user = await require_auth(request)
        
        # Verify transaction belongs to user
        transaction = await db.payment_transactions.find_one({"id": transaction_id})
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        if transaction.get("user_id") != user.user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        if transaction.get("payment_status") != "paid":
            raise HTTPException(status_code=400, detail="Invoice can only be created for paid transactions")
        
        # Check if invoice already exists
        existing = await db.invoices.find_one({"transaction_id": transaction_id})
        if existing:
            return {"invoice": {k: v for k, v in existing.items() if k != "_id"}, "already_exists": True}
        
        # Create invoice
        invoice = await _invoice_service.create_invoice(transaction_id)
        if not invoice:
            raise HTTPException(status_code=500, detail="Failed to create invoice")
        
        return {"invoice": {k: v for k, v in invoice.items() if k != "_id"}, "already_exists": False}
    
    # =========================================================================
    # SUBSCRIPTION RENEWAL CHECK - Background Task
    # =========================================================================
    
    async def subscription_renewal_checker():
        """Background task to check for expiring subscriptions"""
        while True:
            try:
                # Run checks
                expiring_result = await _auto_renewal_service.check_expiring_subscriptions()
                expired_result = await _auto_renewal_service.process_expired_subscriptions()
                
                logger.info(f"Subscription check: {expiring_result}, Expired: {expired_result}")
            except Exception as e:
                logger.error(f"Subscription renewal check error: {e}")
            
            # Run every 6 hours
            await asyncio.sleep(6 * 60 * 60)
    
    @app.on_event("startup")
    async def start_subscription_checker():
        """Start subscription renewal background task"""
        asyncio.create_task(subscription_renewal_checker())
        logger.info("Started subscription renewal checker background task")
    
    # Admin endpoint to manually trigger subscription checks
    @app.post("/api/admin/subscriptions/check-renewals")
    async def admin_check_renewals(request: Request):
        """Admin endpoint to manually trigger subscription renewal checks"""
        user = await require_auth(request)
        admin_emails = ["admin@marketplace.com", "admin@example.com"]
        if user.email not in admin_emails:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        expiring_result = await _auto_renewal_service.check_expiring_subscriptions()
        expired_result = await _auto_renewal_service.process_expired_subscriptions()
        
        return {
            "expiring_reminders": expiring_result,
            "expired_processed": expired_result
        }
    
    logger.info("Subscription Services initialized (Email, Auto-Renewal, Invoices)")

# =============================================================================
# NOTIFICATION PREFERENCES - Now handled by routes/notification_preferences.py
# =============================================================================
logger.info("Notification Preferences moved to modular router")

# =============================================================================
# PUSH NOTIFICATION ENDPOINTS
# =============================================================================
if PUSH_SERVICE_AVAILABLE:
    _push_service = PushNotificationService(db)
    app.state.push_service = _push_service
    
    @app.post("/api/push/register-token")
    async def register_push_token(request: Request):
        """Register a device push token for the current user"""
        user = await require_auth(request)
        data = await request.json()
        
        token = data.get("token")
        platform = data.get("platform", "unknown")  # ios, android, web
        
        if not token:
            raise HTTPException(status_code=400, detail="Token is required")
        
        success = await _push_service.register_device_token(user.user_id, token, platform)
        
        if success:
            return {"message": "Token registered successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to register token")
    
    @app.delete("/api/push/unregister-token")
    async def unregister_push_token(request: Request):
        """Unregister a device push token"""
        user = await require_auth(request)
        data = await request.json()
        
        token = data.get("token")
        if not token:
            raise HTTPException(status_code=400, detail="Token is required")
        
        success = await _push_service.unregister_device_token(user.user_id, token)
        
        return {"message": "Token unregistered" if success else "Token not found"}
    
    @app.get("/api/push/status")
    async def get_push_status(request: Request):
        """Get push notification status for the current user"""
        user = await require_auth(request)
        
        tokens = await _push_service.get_user_tokens(user.user_id)
        prefs = await db.notification_preferences.find_one({"user_id": user.user_id})
        
        return {
            "enabled": _push_service.enabled,
            "registered_devices": len(tokens),
            "preferences": {
                "push_messages": prefs.get("push_messages", True) if prefs else True,
                "push_listings": prefs.get("push_listings", True) if prefs else True,
                "push_promotions": prefs.get("push_promotions", False) if prefs else False,
            }
        }
    
    @app.post("/api/push/test")
    async def send_test_push(request: Request):
        """Send a test push notification to the current user"""
        user = await require_auth(request)
        
        result = await _push_service.send_notification(
            user_id=user.user_id,
            title="Test Notification",
            body="Push notifications are working! 🎉",
            notification_type="message"
        )
        
        return result
    
    @app.get("/api/push/templates")
    async def get_push_templates():
        """Get available push notification templates"""
        return {"templates": list(PUSH_TEMPLATES.keys())}
    
    # Admin endpoint to send push to specific users
    @app.post("/api/admin/push/send")
    async def admin_send_push(request: Request):
        """Admin endpoint to send push notifications"""
        user = await require_auth(request)
        admin_emails = ["admin@marketplace.com", "admin@example.com"]
        if user.email not in admin_emails:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        data = await request.json()
        
        user_ids = data.get("user_ids", [])
        title = data.get("title", "Notification")
        body = data.get("body", "")
        notification_type = data.get("type", "promotion")
        
        if not user_ids:
            raise HTTPException(status_code=400, detail="user_ids required")
        
        result = await _push_service.send_bulk_notification(
            user_ids=user_ids,
            title=title,
            body=body,
            notification_type=notification_type
        )
        
        return result
    
    logger.info("Push Notification endpoints registered")
else:
    logger.warning("Push Notification endpoints not available (Firebase not configured)")

# =============================================================================
# SEO SITEMAP FOR BUSINESS PROFILES
# =============================================================================

@app.get("/api/sitemap.xml")
@app.get("/sitemap.xml")
async def get_sitemap():
    """Generate XML sitemap for all public business profiles"""
    from fastapi.responses import Response
    
    base_url = os.environ.get("SITE_URL", "https://code-organization.preview.emergentagent.com")
    
    # Get all active, verified business profiles
    profiles = await db.business_profiles.find(
        {"is_active": True, "verification_status": {"$in": ["verified", "premium"]}},
        {"slug": 1, "updated_at": 1, "is_premium": 1}
    ).to_list(length=10000)
    
    # Build XML sitemap
    xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    
    # Add homepage
    xml_content += f'''  <url>
    <loc>{base_url}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>\n'''
    
    # Add business profiles
    for profile in profiles:
        slug = profile.get("slug", "")
        if not slug:
            continue
        
        updated = profile.get("updated_at", datetime.now(timezone.utc))
        if isinstance(updated, datetime):
            lastmod = updated.strftime("%Y-%m-%d")
        else:
            lastmod = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        # Premium profiles get higher priority
        priority = "0.9" if profile.get("is_premium") else "0.7"
        
        xml_content += f'''  <url>
    <loc>{base_url}/business/{slug}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>{priority}</priority>
  </url>\n'''
    
    xml_content += '</urlset>'
    
    return Response(content=xml_content, media_type="application/xml")

@app.get("/api/robots.txt")
@app.get("/robots.txt")
async def get_robots():
    """Generate robots.txt with sitemap reference"""
    from fastapi.responses import PlainTextResponse
    
    base_url = os.environ.get("SITE_URL", "https://code-organization.preview.emergentagent.com")
    
    robots_content = f"""User-agent: *
Allow: /
Allow: /business/
Disallow: /api/
Disallow: /admin/
Disallow: /profile/
Disallow: /login
Disallow: /register

Sitemap: {base_url}/sitemap.xml
"""
    return PlainTextResponse(content=robots_content)

@app.get("/api/seo/sitemap-stats")
async def get_sitemap_stats():
    """Get statistics about sitemap entries"""
    total_profiles = await db.business_profiles.count_documents({"is_active": True})
    verified_profiles = await db.business_profiles.count_documents({
        "is_active": True, 
        "verification_status": {"$in": ["verified", "premium"]}
    })
    premium_profiles = await db.business_profiles.count_documents({
        "is_active": True, 
        "is_premium": True
    })
    
    return {
        "total_profiles": total_profiles,
        "verified_in_sitemap": verified_profiles,
        "premium_profiles": premium_profiles,
        "sitemap_url": "/sitemap.xml",
        "robots_url": "/robots.txt"
    }

# OG Meta Tags endpoint for social media sharing
@app.get("/api/business-profiles/{slug}/og-meta")
async def get_business_profile_og_meta(slug: str):
    """Get OG meta tags for a business profile for social media sharing"""
    from fastapi.responses import HTMLResponse
    
    base_url = os.environ.get("SITE_URL", "https://code-organization.preview.emergentagent.com")
    
    # Find profile by slug or identifier
    profile = await db.business_profiles.find_one(
        {"$or": [{"slug": slug}, {"identifier": slug}], "is_active": True},
        {"_id": 0}
    )
    
    if not profile:
        raise HTTPException(status_code=404, detail="Business profile not found")
    
    business_name = profile.get("business_name", "Business Profile")
    description = profile.get("description", f"Check out {business_name} on Avida Marketplace")[:160]
    logo_url = profile.get("logo_url") or f"{base_url}/default-business-logo.png"
    cover_url = profile.get("cover_url") or logo_url
    profile_url = f"{base_url}/business/{slug}"
    categories = ", ".join(profile.get("primary_categories", [])[:3]) or "Business"
    
    # Build verification badge text
    badges = []
    if profile.get("is_premium"):
        badges.append("Premium Verified")
    elif profile.get("is_verified"):
        badges.append("Verified")
    badge_text = f" ({', '.join(badges)})" if badges else ""
    
    return {
        "title": f"{business_name}{badge_text} | Avida",
        "description": description,
        "url": profile_url,
        "image": cover_url or logo_url,
        "site_name": "Avida Marketplace",
        "type": "business.business",
        "og_tags": {
            "og:title": f"{business_name}{badge_text} | Avida",
            "og:description": description,
            "og:url": profile_url,
            "og:image": cover_url or logo_url,
            "og:type": "business.business",
            "og:site_name": "Avida Marketplace",
            "twitter:card": "summary_large_image",
            "twitter:title": f"{business_name}{badge_text}",
            "twitter:description": description,
            "twitter:image": cover_url or logo_url,
        },
        "share_text": f"Check out {business_name} on Avida Marketplace! {categories}",
        "share_url": profile_url
    }

logger.info("SEO Sitemap endpoints registered (/sitemap.xml, /robots.txt)")

# =============================================================================
# LOCAL ADMIN ANALYTICS & SETTINGS ROUTES (must be before proxy catch-all)
# =============================================================================

@app.get("/api/admin/analytics/platform")
async def get_platform_analytics_direct(request: Request):
    """Get platform-wide analytics - local handler"""
    user = await require_auth(request)
    try:
        # User stats
        total_users = await db.users.count_documents({})
        now = datetime.now(timezone.utc)
        week_ago = now - timedelta(days=7)
        day_ago = now - timedelta(days=1)
        
        new_users_week = await db.users.count_documents({
            "created_at": {"$gte": week_ago}
        })
        new_users_today = await db.users.count_documents({
            "created_at": {"$gte": day_ago}
        })
        
        # Listing stats
        total_listings = await db.listings.count_documents({"status": {"$ne": "deleted"}})
        active_listings = await db.listings.count_documents({"status": "active"})
        
        # Transaction stats
        collection_names = await db.list_collection_names()
        total_transactions = await db.transactions.count_documents({}) if "transactions" in collection_names else 0
        
        # Revenue (estimated from sold listings)
        total_revenue = 0
        sold_listings_cursor = db.listings.find({"status": "sold"}, {"price": 1, "_id": 0})
        async for listing in sold_listings_cursor:
            total_revenue += listing.get("price", 0)
        
        # Category breakdown
        categories = []
        category_pipeline = [
            {"$match": {"status": {"$ne": "deleted"}}},
            {"$group": {
                "_id": "$category_id",
                "listing_count": {"$sum": 1},
                "revenue": {"$sum": {"$cond": [{"$eq": ["$status", "sold"]}, "$price", 0]}}
            }},
            {"$sort": {"listing_count": -1}},
            {"$limit": 10}
        ]
        async for cat in db.listings.aggregate(category_pipeline):
            categories.append({
                "name": cat["_id"] or "Uncategorized",
                "listing_count": cat["listing_count"],
                "sales_count": 0,
                "revenue": cat.get("revenue", 0)
            })
        
        return {
            "total_users": total_users,
            "new_users_today": new_users_today,
            "new_users_week": new_users_week,
            "active_users": total_users,
            "total_listings": total_listings,
            "active_listings": active_listings,
            "total_transactions": total_transactions,
            "total_revenue": total_revenue,
            "categories": categories
        }
    except Exception as e:
        logger.error(f"Error fetching platform analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch analytics")

@app.get("/api/admin/analytics/sellers")
async def get_seller_analytics_direct(request: Request):
    """Get seller-specific analytics - local handler"""
    user = await require_auth(request)
    try:
        # Find users with listings
        seller_pipeline = [
            {"$group": {
                "_id": "$user_id",
                "listing_count": {"$sum": 1},
                "revenue": {"$sum": {"$cond": [{"$eq": ["$status", "sold"]}, "$price", 0]}},
                "sales_count": {"$sum": {"$cond": [{"$eq": ["$status", "sold"]}, 1, 0]}}
            }},
            {"$sort": {"revenue": -1}},
            {"$limit": 10}
        ]
        
        top_sellers = []
        async for seller in db.listings.aggregate(seller_pipeline):
            user_doc = await db.users.find_one({"user_id": seller["_id"]}, {"_id": 0, "name": 1})
            top_sellers.append({
                "user_id": seller["_id"],
                "name": user_doc.get("name", "Unknown") if user_doc else "Unknown",
                "revenue": seller.get("revenue", 0),
                "sales_count": seller.get("sales_count", 0),
                "listing_count": seller.get("listing_count", 0)
            })
        
        # Active sellers (with at least 1 active listing)
        active_user_ids = await db.listings.distinct("user_id", {"status": "active"})
        active_sellers = len(active_user_ids)
        
        # New sellers this week
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        new_sellers = await db.users.count_documents({
            "created_at": {"$gte": week_ago}
        })
        
        # Calculate averages
        total_revenue = sum(s.get("revenue", 0) for s in top_sellers)
        total_listings = sum(s.get("listing_count", 0) for s in top_sellers)
        seller_count = len(top_sellers) or 1
        
        return {
            "top_sellers": top_sellers,
            "active_sellers_count": active_sellers,
            "new_sellers_week": new_sellers,
            "avg_seller_revenue": total_revenue / seller_count,
            "avg_listings_per_seller": total_listings / seller_count
        }
    except Exception as e:
        logger.error(f"Error fetching seller analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch seller analytics")

@app.get("/api/admin/analytics/engagement")
async def get_engagement_analytics_direct(request: Request):
    """Get engagement analytics - local handler"""
    user = await require_auth(request)
    try:
        collection_names = await db.list_collection_names()
        
        # Message stats
        total_messages = await db.messages.count_documents({}) if "messages" in collection_names else 0
        day_ago = datetime.now(timezone.utc) - timedelta(days=1)
        messages_today = await db.messages.count_documents({
            "created_at": {"$gte": day_ago}
        }) if "messages" in collection_names else 0
        
        # Favorites
        total_favorites = await db.favorites.count_documents({}) if "favorites" in collection_names else 0
        
        # Badge stats
        badge_awards = await db.user_badges.count_documents({}) if "user_badges" in collection_names else 0
        
        # Challenge completions
        challenge_completions = await db.user_challenge_progress.count_documents({
            "completed": True
        }) if "user_challenge_progress" in collection_names else 0
        
        # Notification read rate (simplified)
        notification_read_rate = 0.75
        
        return {
            "total_messages": total_messages,
            "messages_today": messages_today,
            "total_favorites": total_favorites,
            "badge_awards_count": badge_awards,
            "challenge_completions": challenge_completions,
            "notification_read_rate": notification_read_rate
        }
    except Exception as e:
        logger.error(f"Error fetching engagement analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch engagement analytics")

@app.get("/api/admin/settings/seller-analytics")
async def get_seller_analytics_settings_direct(request: Request):
    """Get seller analytics settings - local handler"""
    user = await require_auth(request)
    try:
        settings = await db.admin_settings.find_one(
            {"type": "seller_analytics"},
            {"_id": 0}
        )
        if not settings:
            return {
                "alert_threshold": 100,
                "low_performance_threshold": 5
            }
        return {
            "alert_threshold": settings.get("alert_threshold", 100),
            "low_performance_threshold": settings.get("low_performance_threshold", 5)
        }
    except Exception as e:
        logger.error(f"Error fetching seller analytics settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch settings")

@app.post("/api/admin/settings/seller-analytics")
async def save_seller_analytics_settings_direct(request: Request):
    """Save seller analytics settings - local handler"""
    user = await require_auth(request)
    try:
        settings = await request.json()
        await db.admin_settings.update_one(
            {"type": "seller_analytics"},
            {"$set": {
                "type": "seller_analytics",
                "alert_threshold": settings.get("alert_threshold", 100),
                "low_performance_threshold": settings.get("low_performance_threshold", 5),
                "updated_at": datetime.now(timezone.utc),
                "updated_by": user.user_id
            }},
            upsert=True
        )
        return {"success": True, "message": "Settings saved"}
    except Exception as e:
        logger.error(f"Error saving seller analytics settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to save settings")

@app.get("/api/admin/settings/engagement-notifications")
async def get_engagement_notification_settings_direct(request: Request):
    """Get engagement notification settings - local handler"""
    user = await require_auth(request)
    try:
        settings = await db.admin_settings.find_one(
            {"type": "engagement_notifications"},
            {"_id": 0}
        )
        if not settings:
            return {
                "milestones": {
                    "firstSale": True,
                    "tenListings": True,
                    "hundredMessages": True,
                    "badgeMilestone": True
                },
                "triggers": {
                    "inactiveSeller": True,
                    "lowEngagement": True,
                    "challengeReminder": True,
                    "weeklyDigest": True
                }
            }
        return {
            "milestones": settings.get("milestones", {}),
            "triggers": settings.get("triggers", {})
        }
    except Exception as e:
        logger.error(f"Error fetching engagement notification settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch settings")

@app.post("/api/admin/settings/engagement-notifications")
async def save_engagement_notification_settings_direct(request: Request):
    """Save engagement notification settings - local handler"""
    user = await require_auth(request)
    try:
        settings = await request.json()
        await db.admin_settings.update_one(
            {"type": "engagement_notifications"},
            {"$set": {
                "type": "engagement_notifications",
                "milestones": settings.get("milestones", {}),
                "triggers": settings.get("triggers", {}),
                "updated_at": datetime.now(timezone.utc),
                "updated_by": user.user_id
            }},
            upsert=True
        )
        return {"success": True, "message": "Settings saved"}
    except Exception as e:
        logger.error(f"Error saving engagement notification settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to save settings")

# =============================================================================
# SCHEDULED REPORTS ENDPOINTS
# =============================================================================

# Import the scheduled reports service
try:
    from scheduled_reports_service import get_reports_service, ScheduledReportsService
    SCHEDULED_REPORTS_AVAILABLE = True
except ImportError as e:
    SCHEDULED_REPORTS_AVAILABLE = False
    logger.warning(f"Scheduled reports service not available: {e}")

# NOTE: Scheduled reports admin endpoints are now handled by admin-dashboard backend
# The following endpoints are disabled and requests are proxied to admin-dashboard:
# - GET/POST /api/admin/settings/scheduled-reports
# - POST /api/admin/reports/generate
# - POST /api/admin/reports/send
# - GET /api/admin/reports/history
# - GET /api/admin/reports/preview

logger.info("Scheduled reports endpoints disabled (handled by admin-dashboard)")
logger.info("Local admin analytics and settings routes registered")

# =============================================================================
# ADMIN API PROXY - Forward /api/admin/* to admin backend on port 8002
# =============================================================================

ADMIN_BACKEND_URL = "http://localhost:8002"

# Paths that should NOT be proxied (handled by local routes)
ADMIN_LOCAL_PATHS = [
    "analytics/platform",
    "analytics/sellers", 
    "analytics/engagement",
    "settings/seller-analytics",
    "settings/engagement-notifications",
    "locations",  # Handled by modular router (routes/admin_locations.py)
    # Note: challenges is handled by admin-dashboard backend
]

def is_local_admin_path(path: str) -> bool:
    """Check if a path should be handled locally instead of proxied"""
    for local_path in ADMIN_LOCAL_PATHS:
        if path.startswith(local_path):
            return True
    return False

# Register admin locations router BEFORE the proxy catch-all
# This ensures specific routes take precedence over the wildcard path
if MODULAR_ROUTES_AVAILABLE:
    try:
        admin_locations_router_early = create_admin_locations_router(db, require_auth)
        app.include_router(admin_locations_router_early, prefix="/api")
        logger.info("Admin locations router (early) loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to load admin locations router (early): {e}")

@app.api_route("/api/admin/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def admin_proxy(request: Request, path: str):
    """Proxy admin requests to the admin backend, except for locally handled routes"""
    
    # Check if this path should be handled locally (not proxied)
    if is_local_admin_path(path):
        raise HTTPException(status_code=404, detail="Route not found in proxy")
    
    logger.info(f"Admin proxy: forwarding {request.method} /api/admin/{path}")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Build the target URL
        url = f"{ADMIN_BACKEND_URL}/api/admin/{path}"
        
        # Get query string
        query_string = str(request.query_params)
        if query_string:
            url = f"{url}?{query_string}"
        
        # Get request body if any
        body = None
        if request.method in ["POST", "PUT", "PATCH"]:
            body = await request.body()
        
        # Forward headers (make sure Authorization is properly forwarded)
        headers = {}
        auth_header = None
        for key, value in request.headers.items():
            key_lower = key.lower()
            if key_lower not in ["host", "content-length"]:
                # Preserve the Authorization header properly
                if key_lower == "authorization":
                    headers["Authorization"] = value
                    auth_header = value[:50] + "..." if len(value) > 50 else value
                else:
                    headers[key] = value
        
        logger.info(f"Admin proxy: Auth header present: {auth_header is not None}")
        
        # Make the request
        try:
            response = await client.request(
                method=request.method,
                url=url,
                headers=headers,
                content=body
            )
            
            # Return the response
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.headers.get("content-type")
            )
        except httpx.ConnectError:
            raise HTTPException(status_code=503, detail="Admin service unavailable")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

# Include Modular Routes (Auth, Users, Listings, Categories, Favorites, Conversations)
# Create moderation manager first (needed by conversations router)
_moderation_manager_for_conversations = None
if CHAT_MODERATION_AVAILABLE:
    _moderation_manager_for_conversations = ChatModerationManager(db)
    logger.info("Chat Moderation Manager initialized for conversations")

if MODULAR_ROUTES_AVAILABLE:
    # Create auth router
    auth_router = create_auth_router(db, get_current_user, get_session_token, check_rate_limit)
    api_router.include_router(auth_router)
    
    # Create users router - needs online_users set for status tracking
    users_router = create_users_router(db, get_current_user, require_auth, set(online_users.keys()))
    api_router.include_router(users_router)
    
    # Create listings router
    listings_router = create_listings_router(
        db, get_current_user, require_auth, check_rate_limit,
        validate_category_and_subcategory, LEGACY_CATEGORY_MAP
    )
    api_router.include_router(listings_router)
    
    # Create categories router
    categories_router = create_categories_router(db)
    api_router.include_router(categories_router)
    
    # Create favorites router
    favorites_router = create_favorites_router(db, require_auth)
    api_router.include_router(favorites_router)
    
    # Create conversations router with moderation integration
    conversations_router = create_conversations_router(
        db, require_auth, check_rate_limit, sio, create_notification,
        moderation_manager=_moderation_manager_for_conversations
    )
    api_router.include_router(conversations_router)
    
    # Create badges router
    try:
        badges_router = create_badges_router(db, require_auth)
        api_router.include_router(badges_router)
        logger.info("Badges router loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to load badges router: {e}")
    
    # Create streaks router
    try:
        streaks_router = create_streaks_router(db, require_auth)
        api_router.include_router(streaks_router)
        logger.info("Streaks router loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to load streaks router: {e}")
    
    # NOTE: Challenges router disabled - comprehensive implementation exists in server.py
    # The server.py version includes seasonal challenges, badge rewards, and more detailed tracking
    # try:
    #     challenges_router_modular = create_challenges_router(db, require_auth)
    #     api_router.include_router(challenges_router_modular)
    #     logger.info("Challenges router loaded successfully")
    # except Exception as e:
    #     logger.warning(f"Failed to load challenges router: {e}")
    
    # Create admin router for analytics and settings
    try:
        async def require_admin_for_settings(request: Request) -> dict:
            """Require admin authentication for settings endpoints"""
            user = await require_auth(request)
            # For now, any authenticated user can access admin settings
            # In production, check user.is_admin or similar
            return {"user_id": user.user_id, "email": user.email, "name": user.name}
        
        admin_settings_router = create_admin_router(db, require_admin_for_settings)
        api_router.include_router(admin_settings_router)
        logger.info("Admin settings router loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to load admin settings router: {e}")
    
    # Create notification preferences router
    try:
        notification_prefs_router = create_notification_preferences_router(db, require_auth)
        api_router.include_router(notification_prefs_router)
        logger.info("Notification preferences router loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to load notification preferences router: {e}")
    
    # Create admin locations router - SKIPPED: Already registered before admin proxy
    # (Registered in the "early" block to ensure it takes precedence over proxy catch-all)
    
    # Create auto/motors router
    try:
        auto_motors_router = create_auto_motors_router(db, get_current_user)
        api_router.include_router(auto_motors_router)
        logger.info("Auto motors router loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to load auto motors router: {e}")
    
    # Create property router
    try:
        property_router = create_property_router(db, require_auth, get_current_user)
        api_router.include_router(property_router)
        logger.info("Property router loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to load property router: {e}")
    
    # Create offers router
    try:
        offers_router = create_offers_router(db, require_auth, get_current_user)
        api_router.include_router(offers_router)
        logger.info("Offers router loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to load offers router: {e}")
    
    # Create similar listings router
    try:
        similar_router = create_similar_listings_router(db)
        api_router.include_router(similar_router)
        logger.info("Similar listings router loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to load similar listings router: {e}")
    
    # Create social router (follow, reviews, user listings)
    try:
        social_router = create_social_router(db, require_auth, get_current_user, create_notification)
        api_router.include_router(social_router)
        logger.info("Social router loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to load social router: {e}")
    
    # Create profile activity router
    try:
        profile_activity_router = create_profile_activity_router(db, require_auth, get_current_user)
        api_router.include_router(profile_activity_router)
        logger.info("Profile activity router loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to load profile activity router: {e}")
    
    # Create profile router (GET/PUT /profile, public profile endpoints)
    try:
        profile_router = create_profile_router(db, require_auth, get_current_user)
        api_router.include_router(profile_router)
        logger.info("Profile router loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to load profile router: {e}")
    
    # Create notifications router
    try:
        notifications_router = create_notifications_router(db, require_auth)
        api_router.include_router(notifications_router)
        logger.info("Notifications router loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to load notifications router: {e}")
    
    # Create account router
    try:
        account_router = create_account_router(db, require_auth, create_notification)
        api_router.include_router(account_router)
        logger.info("Account router loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to load account router: {e}")
    
    # Create support router
    try:
        support_router = create_support_router(db, require_auth, create_notification)
        api_router.include_router(support_router)
        logger.info("Support router loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to load support router: {e}")
    
    # Create user settings router
    try:
        user_settings_router = create_user_settings_router(db, require_auth, UserSettings)
        api_router.include_router(user_settings_router)
        logger.info("User settings router loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to load user settings router: {e}")
    
    # Create sessions router
    try:
        sessions_router = create_sessions_router(db, require_auth, get_session_token)
        api_router.include_router(sessions_router)
        logger.info("Sessions router loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to load sessions router: {e}")
    
    # Create ID verification router
    try:
        id_verification_router = create_id_verification_router(db, require_auth, create_notification)
        api_router.include_router(id_verification_router)
        logger.info("ID verification router loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to load ID verification router: {e}")
    
    app.include_router(api_router)  # Re-include to pick up modular routes
    logger.info("Modular routes (Auth, Users, Listings, Categories, Favorites, Conversations, Badges, Streaks, Challenges, Admin, NotificationPrefs, AdminLocations, AutoMotors, Property, Offers, Similar, Social, ProfileActivity, Notifications, Account, Support, UserSettings, Sessions, IDVerification) loaded successfully")

# Include boost routes if available
if BOOST_ROUTES_AVAILABLE:
    async def get_current_user_for_boost(request: Request) -> dict:
        """Wrapper for boost routes authentication"""
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return {"user_id": user.user_id, "email": user.email, "name": user.name}
    
    boost_router = create_boost_routes(db, get_current_user_for_boost)
    api_router.include_router(boost_router)
    app.include_router(api_router)  # Re-include to pick up boost routes
    logger.info("Boost routes loaded successfully")

# Include Analytics Routes
if ANALYTICS_ROUTES_AVAILABLE:
    async def get_current_user_for_analytics(request: Request) -> dict:
        """Wrapper for analytics routes authentication"""
        user = await get_current_user(request)
        if not user:
            return None
        return {"user_id": user.user_id, "email": user.email, "name": user.name, "is_verified": getattr(user, 'is_verified', False), "is_premium": getattr(user, 'is_premium', False)}
    
    async def get_current_admin_for_analytics(request: Request) -> dict:
        """Wrapper for analytics admin authentication"""
        # For now, use same auth as user - in production would have separate admin auth
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return {"user_id": user.user_id, "email": user.email, "is_admin": True}
    
    analytics_router, analytics_system = create_analytics_router(
        db, 
        get_current_user_for_analytics, 
        get_current_admin_for_analytics,
        create_notification_func=create_notification
    )
    api_router.include_router(analytics_router)
    app.include_router(api_router)  # Re-include to pick up analytics routes
    logger.info("Analytics routes loaded successfully")
    logger.info("Engagement notification background task started")

# Banner System Routes
if BANNER_ROUTES_AVAILABLE:
    # Create banner router with same auth dependencies
    def get_current_user_for_banners(request: Request):
        return get_current_user(request)
    
    async def get_current_admin_for_banners(request: Request):
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return {"user_id": user.user_id, "email": user.email, "is_admin": True}
    
    banner_router, banner_service = create_banner_router(
        db,
        get_current_user_for_banners,
        get_current_admin_for_banners
    )
    api_router.include_router(banner_router)
    app.include_router(api_router)  # Re-include to pick up banner routes
    logger.info("Banner routes loaded successfully")

# Escrow & Online Selling System Routes
if ESCROW_ROUTES_AVAILABLE:
    async def get_current_user_for_escrow(request: Request):
        """Wrapper for escrow routes authentication"""
        user = await get_current_user(request)
        if not user:
            return None
        return user
    
    async def get_current_admin_for_escrow(request: Request) -> dict:
        """Wrapper for escrow admin authentication"""
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return {"user_id": user.user_id, "email": user.email, "is_admin": True}
    
    escrow_router, escrow_service = create_escrow_router(
        db,
        get_current_user_for_escrow,
        get_current_admin_for_escrow
    )
    api_router.include_router(escrow_router)
    app.include_router(api_router)  # Re-include to pick up escrow routes
    logger.info("Escrow & Online Selling routes loaded successfully")

# Payment Processing Routes
if PAYMENT_ROUTES_AVAILABLE:
    async def get_current_user_for_payments(request: Request):
        """Wrapper for payment routes authentication"""
        user = await get_current_user(request)
        if not user:
            return None
        return user
    
    payment_router, payment_service = create_payment_router(
        db,
        get_current_user_for_payments
    )
    api_router.include_router(payment_router)
    app.include_router(api_router)  # Re-include to pick up payment routes
    logger.info("Payment Processing routes loaded successfully")

# SMS Notification Service Routes
if SMS_SERVICE_AVAILABLE:
    sms_service = SMSService(db)
    sms_router = create_sms_router(db, sms_service)
    api_router.include_router(sms_router)
    app.include_router(api_router)  # Re-include to pick up SMS routes
    logger.info("SMS Notification service loaded successfully")

# Multi-Channel Notification Service Routes
if NOTIFICATION_SERVICE_AVAILABLE:
    notification_router, notification_service, transport_partner_service = create_notification_router(db, get_current_user, require_auth)
    api_router.include_router(notification_router)
    app.include_router(api_router)  # Re-include to pick up notification routes
    logger.info("Multi-Channel Notification service loaded successfully")

# Notification Queue and Escrow Integration
notification_queue = None
escrow_notification_integration = None

if NOTIFICATION_QUEUE_AVAILABLE and NOTIFICATION_SERVICE_AVAILABLE:
    notification_queue = NotificationQueue(db)
    notification_queue.set_notification_service(notification_service)
    escrow_notification_integration = EscrowNotificationIntegration(db, notification_queue)
    
    # Start background queue processor
    @app.on_event("startup")
    async def start_notification_queue():
        notification_queue.start(interval=15)  # Process every 15 seconds
        logger.info("Notification queue processor started")
    
    @app.on_event("shutdown")
    async def stop_notification_queue():
        notification_queue.stop()
        logger.info("Notification queue processor stopped")
    
    logger.info("Notification queue and escrow integration loaded successfully")

# AI Listing Analyzer Routes
if AI_ANALYZER_AVAILABLE:
    ai_router, ai_analyzer = create_ai_analyzer_router(db, get_current_user)
    api_router.include_router(ai_router)
    app.include_router(api_router)  # Re-include to pick up AI routes
    logger.info("AI Listing Analyzer loaded successfully")

# Include Chat Moderation System
moderation_manager = None
if CHAT_MODERATION_AVAILABLE:
    async def require_admin_for_moderation(request: Request) -> dict:
        """Admin authentication wrapper for moderation routes"""
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        # In production, check if user has admin role
        return {
            "admin_id": user.user_id, 
            "email": user.email, 
            "name": user.name,
            "is_admin": True
        }
    
    moderation_manager = ChatModerationManager(db)
    moderation_router = create_moderation_router(db, require_admin_for_moderation, moderation_manager)
    user_report_router = create_user_report_router(db, require_auth, moderation_manager)
    api_router.include_router(moderation_router)
    api_router.include_router(user_report_router)
    app.include_router(api_router)  # Re-include to pick up moderation routes
    logger.info("Chat Moderation System loaded successfully")

# Include Executive Summary System
if EXECUTIVE_SUMMARY_AVAILABLE:
    # JWT config for admin token validation (same as admin-dashboard backend)
    ADMIN_JWT_SECRET = os.environ.get('ADMIN_JWT_SECRET_KEY', 'admin-super-secret-key-change-in-production-2024')
    ADMIN_JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
    
    async def require_admin_for_exec_summary(request: Request) -> dict:
        """Admin authentication wrapper for executive summary - supports both user tokens and admin JWT"""
        # First try regular user auth
        user = await get_current_user(request)
        if user:
            return {
                "admin_id": user.user_id,
                "email": user.email,
                "name": user.name,
                "is_admin": True
            }
        
        # Try admin JWT token (from admin dashboard)
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                # Try to decode as admin JWT
                import jwt as pyjwt
                payload = pyjwt.decode(token, ADMIN_JWT_SECRET, algorithms=[ADMIN_JWT_ALGORITHM])
                admin_id = payload.get("sub")
                email = payload.get("email")
                role = payload.get("role")
                
                if admin_id and role in ["super_admin", "admin", "moderator"]:
                    # Verify admin exists in admin collection
                    admin_doc = await db.admin_users.find_one({"id": admin_id})
                    if admin_doc and admin_doc.get("is_active", True):
                        return {
                            "admin_id": admin_id,
                            "email": email,
                            "name": admin_doc.get("name", "Admin"),
                            "role": role,
                            "is_admin": True
                        }
            except Exception as jwt_error:
                logger.debug(f"JWT decode failed: {jwt_error}")
                pass
        
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    exec_summary_router = create_executive_summary_router(db, require_admin_for_exec_summary)
    api_router.include_router(exec_summary_router)
    app.include_router(api_router)  # Re-include to pick up executive summary routes
    logger.info("Executive Summary System loaded successfully")

# Smart Notification System
smart_notification_service = None
if SMART_NOTIFICATIONS_AVAILABLE:
    smart_notification_router, smart_notification_service = create_smart_notification_router(
        db, get_current_user, require_auth
    )
    api_router.include_router(smart_notification_router)
    app.include_router(api_router)  # Re-include to pick up smart notification routes
    
    # Start background processor for smart notifications
    @app.on_event("startup")
    async def start_smart_notification_processor():
        if smart_notification_service:
            smart_notification_service.start(interval=30)
            logger.info("Smart Notification processor started")
    
    logger.info("Smart Notification System loaded successfully")

# Platform Configuration & Brand Manager
if PLATFORM_CONFIG_AVAILABLE:
    platform_config_router, platform_config_service = create_platform_config_router(db)
    api_router.include_router(platform_config_router)
    app.include_router(api_router)  # Re-include to pick up platform config routes
    logger.info("Platform Configuration & Brand Manager loaded successfully")

# API Integrations Manager
if API_INTEGRATIONS_AVAILABLE:
    integrations_router, integrations_service = create_integrations_router(db)
    api_router.include_router(integrations_router)
    app.include_router(api_router)  # Re-include to pick up integrations routes
    logger.info("API Integrations Manager loaded successfully")

# Data Privacy & Compliance Center
if COMPLIANCE_CENTER_AVAILABLE:
    async def require_admin_for_compliance(request: Request) -> dict:
        """Admin authentication wrapper for compliance routes"""
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        # In production, check for specific compliance roles
        return {
            "admin_id": user.user_id,
            "email": user.email,
            "name": user.name,
            "role": "admin",  # Would be user.role in production
            "is_admin": True
        }
    
    compliance_router, compliance_service = create_compliance_router(db, require_admin_for_compliance)
    api_router.include_router(compliance_router)
    app.include_router(api_router)  # Re-include to pick up compliance routes
    logger.info("Data Privacy & Compliance Center loaded successfully")

# Config & Environment Manager
if CONFIG_MANAGER_AVAILABLE:
    config_manager_router, config_manager_service = create_config_manager_router(db)
    api_router.include_router(config_manager_router)
    app.include_router(api_router)  # Re-include to pick up config manager routes
    logger.info("Config & Environment Manager loaded successfully")

# Team & Workflow Management
if TEAM_WORKFLOW_AVAILABLE:
    team_workflow_router, team_workflow_service = create_team_workflow_router(db)
    api_router.include_router(team_workflow_router)
    app.include_router(api_router)  # Re-include to pick up team workflow routes
    # Initialize default roles and settings
    asyncio.create_task(team_workflow_service.initialize_system())
    logger.info("Team & Workflow Management loaded successfully")

# Cohort & Retention Analytics
if COHORT_ANALYTICS_AVAILABLE:
    cohort_analytics_router, cohort_analytics_service = create_cohort_analytics_router(db)
    api_router.include_router(cohort_analytics_router)
    app.include_router(api_router)  # Re-include to pick up cohort analytics routes
    # Initialize default cohort definitions
    asyncio.create_task(cohort_analytics_service.initialize_default_cohorts())
    logger.info("Cohort & Retention Analytics loaded successfully")
    
    # Global event tracking helper
    async def track_cohort_event(user_id: str, event_type: str, properties: dict = None, session_id: str = None):
        """Helper function to track events for cohort analytics"""
        try:
            from cohort_analytics import EventType
            await cohort_analytics_service.track_event(
                user_id=user_id,
                event_type=EventType(event_type),
                properties=properties or {},
                session_id=session_id
            )
        except Exception as e:
            logger.warning(f"Failed to track cohort event: {e}")
    
    # Background scheduled task for alert checking
    async def scheduled_alert_checker():
        """Background task that runs alert checks every 15 minutes"""
        await asyncio.sleep(60)  # Initial delay to let the app start
        while True:
            try:
                result = await cohort_analytics_service.run_scheduled_alert_check()
                triggered = len(result.get("triggered_alerts", []))
                if triggered > 0:
                    logger.info(f"Scheduled alert check: {triggered} alerts triggered")
            except Exception as e:
                logger.error(f"Scheduled alert check failed: {e}")
            
            # Wait 15 minutes before next check
            await asyncio.sleep(15 * 60)
    
    # Start the background task
    asyncio.create_task(scheduled_alert_checker())
    logger.info("Started scheduled alert checker background task")
    
else:
    async def track_cohort_event(user_id: str, event_type: str, properties: dict = None, session_id: str = None):
        """No-op when cohort analytics not available"""
        pass

# QA & Reliability System
if QA_RELIABILITY_AVAILABLE:
    qa_router, qa_service = create_qa_reliability_router(db)
    api_router.include_router(qa_router)
    app.include_router(api_router)  # Re-include to pick up QA routes
    # Initialize QA system
    asyncio.create_task(qa_service.initialize())
    logger.info("QA & Reliability System loaded successfully")
    
    # Background task for periodic health checks
    async def periodic_health_checker():
        """Background task that runs health checks every 5 minutes"""
        await asyncio.sleep(30)  # Initial delay
        while True:
            try:
                await qa_service.check_all_services()
                await qa_service.calculate_reliability_metrics(1)  # Last hour
            except Exception as e:
                logger.error(f"Periodic health check failed: {e}")
            await asyncio.sleep(5 * 60)  # Check every 5 minutes
    
    asyncio.create_task(periodic_health_checker())
    logger.info("Started periodic health checker background task")
    
    # Background task for daily data integrity checks (runs at 3 AM)
    async def daily_data_integrity_checker():
        """Background task that runs data integrity checks once a day"""
        await asyncio.sleep(60)  # Initial delay
        while True:
            try:
                # Check if it's around 3 AM UTC
                now = datetime.now(timezone.utc)
                if now.hour == 3 and now.minute < 10:
                    logger.info("Running daily data integrity check...")
                    await qa_service.run_data_integrity_checks()
                    logger.info("Daily data integrity check completed")
            except Exception as e:
                logger.error(f"Daily data integrity check failed: {e}")
            await asyncio.sleep(10 * 60)  # Check every 10 minutes if it's time
    
    asyncio.create_task(daily_data_integrity_checker())
    logger.info("Started daily data integrity checker background task")
    
    # Background task for monitoring metrics storage (every 5 minutes)
    async def metrics_storage_task():
        """Background task that stores metrics for historical tracking"""
        await asyncio.sleep(60)  # Initial delay
        while True:
            try:
                await qa_service.store_current_metrics()
                await qa_service.check_monitoring_thresholds()
            except Exception as e:
                logger.error(f"Metrics storage task failed: {e}")
            await asyncio.sleep(5 * 60)  # Store every 5 minutes
    
    asyncio.create_task(metrics_storage_task())
    logger.info("Started metrics storage background task")

# Admin Sandbox System
if SANDBOX_AVAILABLE:
    sandbox_router, sandbox_service = create_sandbox_router(db)
    api_router.include_router(sandbox_router)
    app.include_router(api_router)  # Re-include to pick up sandbox routes
    asyncio.create_task(sandbox_service.initialize())
    logger.info("Admin Sandbox System loaded successfully")

# CSV Import System for Users
if CSV_IMPORT_AVAILABLE:
    csv_import_router, csv_import_service = create_csv_import_router(db)
    api_router.include_router(csv_import_router)
    app.include_router(api_router)  # Re-include to pick up CSV import routes
    logger.info("CSV Import System loaded successfully")

# Location System
if LOCATION_SYSTEM_AVAILABLE:
    async def require_admin_for_locations(request: Request) -> dict:
        """Admin authentication wrapper for location management"""
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return {
            "admin_id": user.user_id,
            "email": user.email,
            "name": user.name,
            "is_admin": True
        }
    
    location_router, location_service = create_location_router(db)
    admin_location_router, _ = create_admin_location_router(db, require_admin_for_locations)
    api_router.include_router(location_router)
    api_router.include_router(admin_location_router, prefix="/admin")
    app.include_router(api_router)  # Re-include to pick up location routes
    
    # Initialize location indexes on startup
    @app.on_event("startup")
    async def init_location_indexes():
        await location_service.initialize_indexes()
        logger.info("Location system indexes initialized")
    
    logger.info("Location System loaded successfully")

# =============================================================================
# VOUCHER SYSTEM
# =============================================================================
if VOUCHER_SYSTEM_AVAILABLE:
    voucher_router = create_voucher_router(db, get_current_user)
    app.include_router(voucher_router, prefix="/api")
    logger.info("Voucher System loaded successfully")

# =============================================================================
# LISTING MODERATION SYSTEM
# =============================================================================
if LISTING_MODERATION_AVAILABLE:
    listing_moderation_router = create_listing_moderation_router(db, get_current_user)
    app.include_router(listing_moderation_router, prefix="/api")
    logger.info("Listing Moderation System loaded successfully")

# =============================================================================
# ADMIN TOOLS (SEO, URL Masking, Polls, Cookies, reCAPTCHA, WebP, Invoice PDF)
# =============================================================================
if ADMIN_TOOLS_AVAILABLE:
    seo_router = create_seo_router(db, get_current_user)
    url_masking_router = create_url_masking_router(db, get_current_user)
    polls_router = create_polls_router(db, get_current_user)
    cookie_consent_router = create_cookie_consent_router(db, get_current_user)
    recaptcha_router = create_recaptcha_router(db, get_current_user)
    webp_router = create_webp_router(db, get_current_user)
    invoice_pdf_router = create_invoice_pdf_router(db, get_current_user)
    
    app.include_router(seo_router, prefix="/api")
    app.include_router(url_masking_router, prefix="/api")
    app.include_router(polls_router, prefix="/api")
    app.include_router(cookie_consent_router, prefix="/api")
    app.include_router(recaptcha_router, prefix="/api")
    app.include_router(webp_router, prefix="/api")
    app.include_router(invoice_pdf_router, prefix="/api")
    
    # URL redirect endpoint for short URLs
    @app.get("/s/{code}")
    async def redirect_short_url(code: str, request: Request):
        """Redirect short URL to target"""
        from fastapi.responses import RedirectResponse
        
        url = await db.short_urls.find_one({"code": code, "is_active": True})
        if not url:
            raise HTTPException(status_code=404, detail="Short URL not found")
        
        # Check expiration
        if url.get("expires_at") and url["expires_at"] < datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail="Short URL has expired")
        
        # Record click
        await db.short_url_clicks.insert_one({
            "code": code,
            "ip_address": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
            "clicked_at": datetime.now(timezone.utc)
        })
        
        # Update click count
        await db.short_urls.update_one({"code": code}, {"$inc": {"clicks": 1}})
        
        return RedirectResponse(url=url["target_url"], status_code=302)
    
    logger.info("Admin Tools loaded successfully (SEO, URL Masking, Polls, Cookies, reCAPTCHA, WebP, Invoice PDF)")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# ADMIN FRONTEND PROXY - Forward /api/admin-ui/* to admin frontend on port 3001
# =============================================================================

ADMIN_FRONTEND_URL = "http://localhost:3001"

@app.api_route("/api/admin-ui/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"])
async def admin_frontend_proxy(request: Request, path: str):
    """Proxy admin frontend requests to Next.js dev server"""
    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        # Build the target URL - include /api/admin-ui prefix for Next.js basePath
        url = f"{ADMIN_FRONTEND_URL}/api/admin-ui/{path}" if path else f"{ADMIN_FRONTEND_URL}/api/admin-ui"
        
        # Get query string
        query_string = str(request.query_params)
        if query_string:
            url = f"{url}?{query_string}"
        
        # Get request body if any
        body = None
        if request.method in ["POST", "PUT", "PATCH"]:
            body = await request.body()
        
        # Forward headers
        headers = dict(request.headers)
        headers.pop("host", None)
        headers.pop("content-length", None)
        
        try:
            response = await client.request(
                method=request.method,
                url=url,
                headers=headers,
                content=body
            )
            
            # Build response headers
            resp_headers = dict(response.headers)
            resp_headers.pop("content-encoding", None)
            resp_headers.pop("content-length", None)
            resp_headers.pop("transfer-encoding", None)
            
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=resp_headers,
                media_type=response.headers.get("content-type")
            )
        except httpx.ConnectError:
            raise HTTPException(status_code=503, detail="Admin frontend service unavailable")
        except Exception as e:
            logger.error(f"Admin frontend proxy error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin-ui")
async def admin_frontend_root():
    """Redirect to admin-ui/ with trailing slash"""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/api/admin-ui/", status_code=307)

# Background task for expiring boosts
async def expire_boosts_task():
    """Background task that runs every 60 seconds to expire boosts"""
    while True:
        try:
            now = datetime.now(timezone.utc).isoformat()
            
            # Find all expired but still active boosts
            expired_boosts = await db.listing_boosts.find({
                "status": "active",
                "expires_at": {"$lte": now}
            }).to_list(100)
            
            for boost in expired_boosts:
                # Update boost status
                await db.listing_boosts.update_one(
                    {"id": boost["id"]},
                    {"$set": {"status": "expired"}}
                )
                
                # Update listing - remove boost flag if no other active boosts
                listing_id = boost.get("listing_id")
                if listing_id:
                    # Check if listing has other active boosts
                    other_active = await db.listing_boosts.count_documents({
                        "listing_id": listing_id,
                        "status": "active",
                        "id": {"$ne": boost["id"]}
                    })
                    
                    if other_active == 0:
                        # No other active boosts, remove is_boosted flag
                        await db.listings.update_one(
                            {"id": listing_id},
                            {"$set": {"is_boosted": False, "boost_priority": 0}}
                        )
                    
                    # Remove specific boost type from listing
                    boost_type = boost.get("boost_type")
                    if boost_type:
                        await db.listings.update_one(
                            {"id": listing_id},
                            {"$unset": {f"boosts.{boost_type}": ""}}
                        )
                
                logger.info(f"Expired boost {boost['id']} for listing {listing_id}")
            
            if expired_boosts:
                logger.info(f"Expired {len(expired_boosts)} boosts")
                
        except Exception as e:
            logger.error(f"Error in expire_boosts_task: {e}")
        
        # Wait 60 seconds before next check
        await asyncio.sleep(60)

@app.on_event("startup")
async def startup_event():
    """Start background tasks on server startup"""
    # Initialize push notification service with database
    if UTILS_AVAILABLE:
        init_push_service(db)
        logger.info("Push notification service initialized")
    
    asyncio.create_task(expire_boosts_task())
    logger.info("Started boost expiration background task")
    
    # Initialize badge service and predefined badges
    badge_svc = get_badge_service(db)
    await badge_svc.initialize_badges()
    asyncio.create_task(periodic_badge_check_task())
    logger.info("Started badge awarding service")
    
    # Start scheduled reports background task
    if SCHEDULED_REPORTS_AVAILABLE:
        asyncio.create_task(scheduled_reports_task())
        logger.info("Started scheduled reports background task")


async def periodic_badge_check_task():
    """Background task to check time-based badges periodically (every 6 hours)"""
    badge_svc = get_badge_service(db)
    while True:
        try:
            await asyncio.sleep(6 * 60 * 60)  # 6 hours
            awarded = await badge_svc.run_periodic_badge_check(batch_size=500)
            if awarded > 0:
                logger.info(f"Periodic badge check awarded {awarded} badges")
        except Exception as e:
            logger.error(f"Error in periodic badge check: {e}")
            await asyncio.sleep(60)  # Wait a minute on error


async def scheduled_reports_task():
    """Background task to send scheduled analytics reports (weekly by default)."""
    reports_service = get_reports_service(db)
    
    while True:
        try:
            # Get report settings
            settings = await reports_service.get_report_settings()
            
            if not settings.get("enabled", True):
                # Reports disabled, check again in 1 hour
                await asyncio.sleep(60 * 60)
                continue
            
            frequency = settings.get("frequency", "weekly")
            target_day = settings.get("day_of_week", 1)  # Monday
            target_hour = settings.get("hour", 9)  # 9 AM UTC
            
            now = datetime.now(timezone.utc)
            
            # Check if it's time to send the report
            should_send = False
            
            if frequency == "daily":
                # Send at target hour every day
                should_send = now.hour == target_hour and now.minute < 5
            elif frequency == "weekly":
                # Send at target hour on target day
                should_send = (now.weekday() == target_day and 
                             now.hour == target_hour and 
                             now.minute < 5)
            elif frequency == "monthly":
                # Send at target hour on the 1st of each month
                should_send = (now.day == 1 and 
                             now.hour == target_hour and 
                             now.minute < 5)
            
            if should_send:
                # Check if we already sent today
                today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                already_sent = await db.report_history.find_one({
                    "type": "weekly_analytics",
                    "created_at": {"$gte": today_start}
                })
                
                if not already_sent:
                    logger.info("Running scheduled analytics report...")
                    result = await reports_service.run_scheduled_report()
                    logger.info(f"Scheduled report result: {result}")
            
            # Check every 5 minutes
            await asyncio.sleep(5 * 60)
            
        except Exception as e:
            logger.error(f"Error in scheduled reports task: {e}")
            await asyncio.sleep(60)  # Wait a minute on error


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# For Socket.IO, we need to use the socket_app
# The app will be run with: uvicorn server:socket_app --host 0.0.0.0 --port 8001
