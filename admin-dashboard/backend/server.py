"""
Admin Dashboard Backend - Main Server
Production-ready admin panel for marketplace management
"""

from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response, Query, UploadFile, File, Body, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from dotenv import load_dotenv
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from enum import Enum
import uuid
import os
import logging
import re
import bleach
import secrets
import asyncio
import httpx

# =============================================================================
# CONFIGURATION
# =============================================================================

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Logging setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("admin_dashboard")

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'classifieds_db')]

# JWT Configuration
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'admin-secret-change-in-production')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRE_MINUTES', 30))
JWT_REFRESH_TOKEN_EXPIRE_DAYS = int(os.environ.get('JWT_REFRESH_TOKEN_EXPIRE_DAYS', 7))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# SendGrid Configuration
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
SENDGRID_FROM_EMAIL = os.environ.get('SENDGRID_FROM_EMAIL', 'noreply@marketplace.com')
SENDGRID_FROM_NAME = os.environ.get('SENDGRID_FROM_NAME', 'Admin Dashboard')

# =============================================================================
# EMAIL HELPER FUNCTIONS
# =============================================================================

async def send_ab_winner_email(
    to_emails: List[str],
    experiment_name: str,
    winner_variant_name: str,
    improvement: float,
    control_rate: float,
    winner_rate: float,
    experiment_id: str
) -> bool:
    """Send email notification when A/B test winner is found"""
    if not SENDGRID_API_KEY or not to_emails:
        logger.warning("SendGrid not configured or no emails provided")
        return False
    
    try:
        subject = f"A/B Test Winner Found: {experiment_name}"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #4CAF50, #45a049); padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">Winner Found!</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
                <h2 style="color: #333; margin-top: 0;">Experiment: {experiment_name}</h2>
                
                <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h3 style="color: #4CAF50; margin-top: 0;">Winning Variant: {winner_variant_name}</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Improvement vs Control:</strong></td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #4CAF50; font-weight: bold;">+{improvement}%</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Control Rate:</strong></td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">{control_rate}%</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0;"><strong>Winner Rate:</strong></td>
                            <td style="padding: 10px 0; color: #4CAF50; font-weight: bold;">{winner_rate}%</td>
                        </tr>
                    </table>
                </div>
                
                <p style="color: #666;">Statistical significance has been reached at 95% confidence level.</p>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="#" style="background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Results in Dashboard</a>
                </div>
            </div>
            <div style="padding: 15px; background: #333; color: #999; text-align: center; font-size: 12px;">
                <p style="margin: 0;">This is an automated notification from your A/B Testing system.</p>
            </div>
        </div>
        """
        
        text_content = f"""
A/B Test Winner Found!

Experiment: {experiment_name}
Winning Variant: {winner_variant_name}

Results:
- Improvement vs Control: +{improvement}%
- Control Rate: {control_rate}%
- Winner Rate: {winner_rate}%

Statistical significance reached at 95% confidence level.

Log in to your admin dashboard to view full results.
        """
        
        # Build SendGrid payload
        personalizations = [{"to": [{"email": email} for email in to_emails]}]
        
        payload = {
            "personalizations": personalizations,
            "from": {"email": SENDGRID_FROM_EMAIL, "name": SENDGRID_FROM_NAME},
            "subject": subject,
            "content": [
                {"type": "text/plain", "value": text_content},
                {"type": "text/html", "value": html_content}
            ]
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.sendgrid.com/v3/mail/send",
                json=payload,
                headers={
                    "Authorization": f"Bearer {SENDGRID_API_KEY}",
                    "Content-Type": "application/json"
                },
                timeout=30.0
            )
            
            if response.status_code in [200, 202]:
                logger.info(f"A/B winner email sent to {len(to_emails)} recipients for experiment {experiment_name}")
                return True
            else:
                logger.error(f"SendGrid error: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        logger.error(f"Failed to send A/B winner email: {e}")
        return False

# =============================================================================
# ENUMS & CONSTANTS
# =============================================================================

class AdminRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    MODERATOR = "moderator"
    SUPPORT_AGENT = "support_agent"
    FINANCE_ANALYST = "finance_analyst"

class Permission(str, Enum):
    # User management
    VIEW_USERS = "view_users"
    EDIT_USERS = "edit_users"
    BAN_USERS = "ban_users"
    DELETE_USERS = "delete_users"
    MANAGE_USERS = "manage_users"
    
    # Listing management
    VIEW_LISTINGS = "view_listings"
    EDIT_LISTINGS = "edit_listings"
    DELETE_LISTINGS = "delete_listings"
    FEATURE_LISTINGS = "feature_listings"
    MANAGE_LISTINGS = "manage_listings"
    
    # Category management
    VIEW_CATEGORIES = "view_categories"
    MANAGE_CATEGORIES = "manage_categories"
    
    # Attribute management
    VIEW_ATTRIBUTES = "view_attributes"
    MANAGE_ATTRIBUTES = "manage_attributes"
    
    # Moderation
    VIEW_REPORTS = "view_reports"
    MANAGE_REPORTS = "manage_reports"
    VIEW_TICKETS = "view_tickets"
    MANAGE_TICKETS = "manage_tickets"
    
    # Analytics
    VIEW_ANALYTICS = "view_analytics"
    EXPORT_DATA = "export_data"
    
    # Settings
    VIEW_SETTINGS = "view_settings"
    MANAGE_SETTINGS = "manage_settings"
    
    # Audit logs
    VIEW_AUDIT_LOGS = "view_audit_logs"
    
    # Admin management
    MANAGE_ADMINS = "manage_admins"

# Role permissions mapping
ROLE_PERMISSIONS = {
    AdminRole.SUPER_ADMIN: list(Permission),  # All permissions
    AdminRole.ADMIN: [
        Permission.VIEW_USERS, Permission.EDIT_USERS, Permission.BAN_USERS,
        Permission.VIEW_LISTINGS, Permission.EDIT_LISTINGS, Permission.DELETE_LISTINGS, Permission.FEATURE_LISTINGS,
        Permission.VIEW_CATEGORIES, Permission.MANAGE_CATEGORIES,
        Permission.VIEW_ATTRIBUTES, Permission.MANAGE_ATTRIBUTES,
        Permission.VIEW_REPORTS, Permission.MANAGE_REPORTS,
        Permission.VIEW_TICKETS, Permission.MANAGE_TICKETS,
        Permission.VIEW_ANALYTICS, Permission.EXPORT_DATA,
        Permission.VIEW_SETTINGS, Permission.MANAGE_SETTINGS,
        Permission.VIEW_AUDIT_LOGS,
    ],
    AdminRole.MODERATOR: [
        Permission.VIEW_USERS, Permission.BAN_USERS,
        Permission.VIEW_LISTINGS, Permission.EDIT_LISTINGS, Permission.DELETE_LISTINGS,
        Permission.VIEW_CATEGORIES,
        Permission.VIEW_REPORTS, Permission.MANAGE_REPORTS,
        Permission.VIEW_TICKETS, Permission.MANAGE_TICKETS,
        Permission.VIEW_AUDIT_LOGS,
    ],
    AdminRole.SUPPORT_AGENT: [
        Permission.VIEW_USERS,
        Permission.VIEW_LISTINGS,
        Permission.VIEW_REPORTS,
        Permission.VIEW_TICKETS, Permission.MANAGE_TICKETS,
    ],
    AdminRole.FINANCE_ANALYST: [
        Permission.VIEW_USERS,
        Permission.VIEW_LISTINGS,
        Permission.VIEW_ANALYTICS, Permission.EXPORT_DATA,
    ],
}

# =============================================================================
# PYDANTIC MODELS
# =============================================================================

# Admin User Models
class AdminUserBase(BaseModel):
    email: EmailStr
    name: str
    role: AdminRole = AdminRole.MODERATOR

class AdminUserCreate(AdminUserBase):
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        return v

class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[AdminRole] = None
    is_active: Optional[bool] = None

class AdminUserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: AdminRole
    is_active: bool
    two_factor_enabled: bool
    created_at: datetime
    last_login: Optional[datetime] = None

# Auth Models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    admin: AdminUserResponse

class RefreshTokenRequest(BaseModel):
    refresh_token: str

# Category Models
class CategoryAttribute(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    key: str
    type: str  # text, number, currency, dropdown, multiselect, boolean, date, year, range, rich_text
    required: bool = False
    options: Optional[List[str]] = None
    validation: Optional[Dict[str, Any]] = None  # min, max, regex, units, step, default
    order: int = 0
    conditions: Optional[List[Dict[str, Any]]] = None  # Conditional logic

class CategoryCreate(BaseModel):
    name: str
    slug: str
    icon: Optional[str] = None
    color: Optional[str] = None
    parent_id: Optional[str] = None
    description: Optional[str] = None
    is_visible: bool = True
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    order: int = 0
    
    @validator('slug')
    def validate_slug(cls, v):
        if not re.match(r'^[a-z0-9-]+$', v):
            raise ValueError('Slug must contain only lowercase letters, numbers, and hyphens')
        return v

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    parent_id: Optional[str] = None
    description: Optional[str] = None
    is_visible: Optional[bool] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    order: Optional[int] = None

class CategoryResponse(BaseModel):
    id: str
    name: str
    slug: str
    icon: Optional[str] = None
    color: Optional[str] = None
    parent_id: Optional[str] = None
    description: Optional[str] = None
    is_visible: bool = True
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    order: int = 0
    attributes: List[CategoryAttribute] = []
    children: List['CategoryResponse'] = []
    listings_count: int = 0
    created_at: datetime
    updated_at: datetime

CategoryResponse.update_forward_refs()

# Attribute Models
class AttributeCreate(BaseModel):
    category_id: str
    name: str
    key: str
    type: str = Field(..., pattern="^(text|number|dropdown|radio|checkbox|textarea|date|email|phone|url)$")
    required: bool = False
    options: Optional[List[str]] = None  # For dropdown, radio, checkbox
    validation: Optional[Dict[str, Any]] = None
    order: int = 0
    conditions: Optional[List[Dict[str, Any]]] = None
    # New fields
    icon: Optional[str] = None  # Icon name or emoji
    placeholder: Optional[str] = None
    help_text: Optional[str] = None
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    default_value: Optional[str] = None
    unit: Optional[str] = None  # e.g., "km", "kg", "$"
    searchable: bool = True
    filterable: bool = True
    show_in_list: bool = True

class AttributeUpdate(BaseModel):
    name: Optional[str] = None
    key: Optional[str] = None
    type: Optional[str] = None
    required: Optional[bool] = None
    options: Optional[List[str]] = None
    validation: Optional[Dict[str, Any]] = None
    order: Optional[int] = None
    conditions: Optional[List[Dict[str, Any]]] = None
    icon: Optional[str] = None
    placeholder: Optional[str] = None
    help_text: Optional[str] = None
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    default_value: Optional[str] = None
    unit: Optional[str] = None
    searchable: Optional[bool] = None
    filterable: Optional[bool] = None
    show_in_list: Optional[bool] = None

# Listing Models
class ListingStatusUpdate(BaseModel):
    status: str  # active, pending, rejected, paused, sold, deleted
    reason: Optional[str] = None
    notes: Optional[str] = None

class ListingBulkAction(BaseModel):
    listing_ids: List[str]
    action: str  # approve, reject, delete, pause, feature, unfeature, move_category
    category_id: Optional[str] = None
    reason: Optional[str] = None

# User Management Models
class UserBanRequest(BaseModel):
    reason: str
    duration_days: Optional[int] = None  # None = permanent
    notes: Optional[str] = None

class UserRoleAssign(BaseModel):
    user_id: str
    role: str
    notes: Optional[str] = None

# Report/Ticket Models
class ReportStatus(str, Enum):
    PENDING = "pending"
    IN_REVIEW = "in_review"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"
    ESCALATED = "escalated"

class TicketPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class ReportUpdate(BaseModel):
    status: ReportStatus
    resolution_notes: Optional[str] = None
    assigned_to: Optional[str] = None

class TicketCreate(BaseModel):
    user_id: str
    subject: str
    description: str
    priority: TicketPriority = TicketPriority.MEDIUM
    category: str = "general"

class TicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[TicketPriority] = None
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None

class TicketResponse(BaseModel):
    message: str
    is_internal: bool = False

# Audit Log Models
class AuditAction(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    BAN_USER = "ban_user"
    UNBAN_USER = "unban_user"
    APPROVE_LISTING = "approve_listing"
    REJECT_LISTING = "reject_listing"
    FEATURE_LISTING = "feature_listing"
    RESOLVE_REPORT = "resolve_report"
    RESOLVE_TICKET = "resolve_ticket"

class AuditLogEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    admin_id: str
    admin_email: str
    action: AuditAction
    entity_type: str  # user, listing, category, attribute, report, ticket, etc.
    entity_id: str
    changes: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Pagination
class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    limit: int
    total_pages: int

# Settings Models
class AppSettings(BaseModel):
    currencies: List[str] = ["EUR", "USD", "GBP"]
    countries: List[Dict[str, str]] = []
    languages: List[Dict[str, str]] = []
    feature_flags: Dict[str, bool] = {}

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def sanitize_input(text: str) -> str:
    """Sanitize input to prevent XSS attacks"""
    return bleach.clean(text, strip=True)

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> Optional[dict]:
    """Decode and validate JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None

def get_client_ip(request: Request) -> str:
    """Get client IP address from request"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

# =============================================================================
# DEPENDENCIES
# =============================================================================

async def get_current_admin(request: Request) -> dict:
    """Get current authenticated admin user"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = auth_header.replace("Bearer ", "")
    payload = decode_token(token)
    
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    admin_id = payload.get("sub")
    admin = await db.admin_users.find_one({"id": admin_id, "is_active": True}, {"_id": 0})
    
    if not admin:
        raise HTTPException(status_code=401, detail="Admin user not found or inactive")
    
    return admin

def require_permission(permission: Permission):
    """Dependency to require specific permission"""
    async def check_permission(admin: dict = Depends(get_current_admin)):
        role = AdminRole(admin.get("role"))
        if permission not in ROLE_PERMISSIONS.get(role, []):
            raise HTTPException(status_code=403, detail=f"Permission denied: {permission.value}")
        return admin
    return check_permission

async def log_audit(
    admin_id: str,
    admin_email: str,
    action: AuditAction,
    entity_type: str,
    entity_id: str,
    changes: Optional[Dict] = None,
    request: Optional[Request] = None
):
    """Log audit entry to database"""
    entry = {
        "id": str(uuid.uuid4()),
        "admin_id": admin_id,
        "admin_email": admin_email,
        "action": action.value,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "changes": changes,
        "ip_address": get_client_ip(request) if request else None,
        "user_agent": request.headers.get("User-Agent") if request else None,
        "timestamp": datetime.now(timezone.utc)
    }
    await db.admin_audit_logs.insert_one(entry)
    logger.info(f"Audit: {admin_email} - {action.value} - {entity_type}/{entity_id}")

# =============================================================================
# FASTAPI APP
# =============================================================================

app = FastAPI(
    title="Admin Dashboard API",
    description="Production-ready admin panel for marketplace management",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('ADMIN_CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Router
api_router = APIRouter(prefix="/api/admin")

# =============================================================================
# AUTH ENDPOINTS
# =============================================================================

@api_router.post("/auth/login", response_model=TokenResponse)
async def admin_login(request: Request, login_data: LoginRequest):
    """Admin login endpoint"""
    admin = await db.admin_users.find_one({"email": login_data.email.lower()}, {"_id": 0})
    
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not admin.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")
    
    if not verify_password(login_data.password, admin.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check 2FA if enabled
    if admin.get("two_factor_enabled") and admin.get("totp_secret"):
        if not login_data.totp_code:
            raise HTTPException(status_code=400, detail="2FA code required")
        import pyotp
        totp = pyotp.TOTP(admin["totp_secret"])
        if not totp.verify(login_data.totp_code):
            raise HTTPException(status_code=401, detail="Invalid 2FA code")
    
    # Create tokens
    token_data = {"sub": admin["id"], "email": admin["email"], "role": admin["role"]}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    # Update last login
    await db.admin_users.update_one(
        {"id": admin["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc)}}
    )
    
    # Log audit
    await log_audit(admin["id"], admin["email"], AuditAction.LOGIN, "admin", admin["id"], request=request)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        admin=AdminUserResponse(
            id=admin["id"],
            email=admin["email"],
            name=admin["name"],
            role=AdminRole(admin["role"]),
            is_active=admin.get("is_active", True),
            two_factor_enabled=admin.get("two_factor_enabled", False),
            created_at=admin.get("created_at", datetime.now(timezone.utc)),
            last_login=admin.get("last_login")
        )
    )

@api_router.post("/auth/refresh", response_model=TokenResponse)
async def refresh_token(refresh_data: RefreshTokenRequest):
    """Refresh access token"""
    payload = decode_token(refresh_data.refresh_token)
    
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    admin = await db.admin_users.find_one({"id": payload["sub"], "is_active": True}, {"_id": 0})
    if not admin:
        raise HTTPException(status_code=401, detail="Admin not found")
    
    token_data = {"sub": admin["id"], "email": admin["email"], "role": admin["role"]}
    new_access_token = create_access_token(token_data)
    new_refresh_token = create_refresh_token(token_data)
    
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        expires_in=JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        admin=AdminUserResponse(
            id=admin["id"],
            email=admin["email"],
            name=admin["name"],
            role=AdminRole(admin["role"]),
            is_active=admin.get("is_active", True),
            two_factor_enabled=admin.get("two_factor_enabled", False),
            created_at=admin.get("created_at", datetime.now(timezone.utc)),
            last_login=admin.get("last_login")
        )
    )

@api_router.post("/auth/logout")
async def admin_logout(request: Request, admin: dict = Depends(get_current_admin)):
    """Admin logout endpoint"""
    await log_audit(admin["id"], admin["email"], AuditAction.LOGOUT, "admin", admin["id"], request=request)
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me", response_model=AdminUserResponse)
async def get_current_admin_info(admin: dict = Depends(get_current_admin)):
    """Get current admin information"""
    return AdminUserResponse(
        id=admin["id"],
        email=admin["email"],
        name=admin["name"],
        role=AdminRole(admin["role"]),
        is_active=admin.get("is_active", True),
        two_factor_enabled=admin.get("two_factor_enabled", False),
        created_at=admin.get("created_at", datetime.now(timezone.utc)),
        last_login=admin.get("last_login")
    )

# =============================================================================
# ADMIN USER MANAGEMENT ENDPOINTS
# =============================================================================

@api_router.post("/admins", response_model=AdminUserResponse)
async def create_admin_user(
    request: Request,
    admin_data: AdminUserCreate,
    current_admin: dict = Depends(require_permission(Permission.MANAGE_ADMINS))
):
    """Create new admin user"""
    # Check if email exists
    existing = await db.admin_users.find_one({"email": admin_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    admin_id = f"admin_{uuid.uuid4().hex[:12]}"
    new_admin = {
        "id": admin_id,
        "email": admin_data.email.lower(),
        "name": sanitize_input(admin_data.name),
        "password_hash": hash_password(admin_data.password),
        "role": admin_data.role.value,
        "is_active": True,
        "two_factor_enabled": False,
        "totp_secret": None,
        "created_at": datetime.now(timezone.utc),
        "last_login": None
    }
    
    await db.admin_users.insert_one(new_admin)
    await log_audit(current_admin["id"], current_admin["email"], AuditAction.CREATE, "admin", admin_id, {"email": admin_data.email}, request)
    
    return AdminUserResponse(
        id=admin_id,
        email=new_admin["email"],
        name=new_admin["name"],
        role=AdminRole(new_admin["role"]),
        is_active=True,
        two_factor_enabled=False,
        created_at=new_admin["created_at"],
        last_login=None
    )

@api_router.get("/admins", response_model=List[AdminUserResponse])
async def list_admin_users(
    current_admin: dict = Depends(require_permission(Permission.MANAGE_ADMINS))
):
    """List all admin users"""
    admins = await db.admin_users.find({}, {"_id": 0, "password_hash": 0, "totp_secret": 0}).to_list(1000)
    return [AdminUserResponse(
        id=a["id"],
        email=a["email"],
        name=a["name"],
        role=AdminRole(a["role"]),
        is_active=a.get("is_active", True),
        two_factor_enabled=a.get("two_factor_enabled", False),
        created_at=a.get("created_at", datetime.now(timezone.utc)),
        last_login=a.get("last_login")
    ) for a in admins]

@api_router.patch("/admins/{admin_id}", response_model=AdminUserResponse)
async def update_admin_user(
    request: Request,
    admin_id: str,
    update_data: AdminUserUpdate,
    current_admin: dict = Depends(require_permission(Permission.MANAGE_ADMINS))
):
    """Update admin user"""
    admin = await db.admin_users.find_one({"id": admin_id}, {"_id": 0})
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    updates = {}
    if update_data.name is not None:
        updates["name"] = sanitize_input(update_data.name)
    if update_data.role is not None:
        updates["role"] = update_data.role.value
    if update_data.is_active is not None:
        updates["is_active"] = update_data.is_active
    
    if updates:
        await db.admin_users.update_one({"id": admin_id}, {"$set": updates})
        await log_audit(current_admin["id"], current_admin["email"], AuditAction.UPDATE, "admin", admin_id, updates, request)
    
    updated = await db.admin_users.find_one({"id": admin_id}, {"_id": 0, "password_hash": 0, "totp_secret": 0})
    return AdminUserResponse(**updated)

# =============================================================================
# CATEGORY MANAGEMENT ENDPOINTS
# =============================================================================

@api_router.get("/categories")
async def list_categories(
    include_hidden: bool = False,
    flat: bool = False,
    admin: dict = Depends(require_permission(Permission.VIEW_CATEGORIES))
):
    """List all categories with hierarchy"""
    query = {} if include_hidden else {"is_visible": True}
    categories = await db.admin_categories.find(query, {"_id": 0}).sort("order", 1).to_list(1000)
    
    # Get listings count per category
    pipeline = [
        {"$group": {"_id": "$category_id", "count": {"$sum": 1}}}
    ]
    counts = {c["_id"]: c["count"] for c in await db.listings.aggregate(pipeline).to_list(1000)}
    
    for cat in categories:
        cat["listings_count"] = counts.get(cat["id"], 0)
    
    if flat:
        return categories
    
    # Build hierarchy
    def build_tree(parent_id=None):
        children = [c for c in categories if c.get("parent_id") == parent_id]
        for child in children:
            child["children"] = build_tree(child["id"])
        return children
    
    return build_tree()

@api_router.post("/categories")
async def create_category(
    request: Request,
    category_data: CategoryCreate,
    admin: dict = Depends(require_permission(Permission.MANAGE_CATEGORIES))
):
    """Create new category"""
    # Check slug uniqueness
    existing = await db.admin_categories.find_one({"slug": category_data.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Category slug already exists")
    
    # Validate parent exists
    if category_data.parent_id:
        parent = await db.admin_categories.find_one({"id": category_data.parent_id})
        if not parent:
            raise HTTPException(status_code=400, detail="Parent category not found")
    
    category_id = f"cat_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    new_category = {
        "id": category_id,
        "name": sanitize_input(category_data.name),
        "slug": category_data.slug,
        "icon": category_data.icon,
        "color": category_data.color,
        "parent_id": category_data.parent_id,
        "description": sanitize_input(category_data.description) if category_data.description else None,
        "is_visible": category_data.is_visible,
        "seo_title": category_data.seo_title,
        "seo_description": category_data.seo_description,
        "order": category_data.order,
        "attributes": [],
        "created_at": now,
        "updated_at": now
    }
    
    await db.admin_categories.insert_one(new_category)
    await log_audit(admin["id"], admin["email"], AuditAction.CREATE, "category", category_id, {"name": category_data.name}, request)
    
    # Remove _id that MongoDB added and add additional fields
    new_category.pop("_id", None)
    new_category["listings_count"] = 0
    new_category["children"] = []
    return new_category

@api_router.get("/categories/{category_id}")
async def get_category(
    category_id: str,
    admin: dict = Depends(require_permission(Permission.VIEW_CATEGORIES))
):
    """Get single category"""
    category = await db.admin_categories.find_one({"id": category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Get listings count
    count = await db.listings.count_documents({"category_id": category_id})
    category["listings_count"] = count
    
    # Get children
    children = await db.admin_categories.find({"parent_id": category_id}, {"_id": 0}).to_list(100)
    category["children"] = children
    
    return category

@api_router.patch("/categories/{category_id}")
async def update_category(
    request: Request,
    category_id: str,
    update_data: CategoryUpdate,
    admin: dict = Depends(require_permission(Permission.MANAGE_CATEGORIES))
):
    """Update category"""
    category = await db.admin_categories.find_one({"id": category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    updates = {"updated_at": datetime.now(timezone.utc)}
    
    if update_data.name is not None:
        updates["name"] = sanitize_input(update_data.name)
    if update_data.slug is not None:
        # Check slug uniqueness
        existing = await db.admin_categories.find_one({"slug": update_data.slug, "id": {"$ne": category_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Category slug already exists")
        updates["slug"] = update_data.slug
    if update_data.icon is not None:
        updates["icon"] = update_data.icon
    if update_data.color is not None:
        updates["color"] = update_data.color
    if update_data.parent_id is not None:
        if update_data.parent_id:
            parent = await db.admin_categories.find_one({"id": update_data.parent_id})
            if not parent:
                raise HTTPException(status_code=400, detail="Parent category not found")
        updates["parent_id"] = update_data.parent_id
    if update_data.description is not None:
        updates["description"] = sanitize_input(update_data.description)
    if update_data.is_visible is not None:
        updates["is_visible"] = update_data.is_visible
    if update_data.seo_title is not None:
        updates["seo_title"] = update_data.seo_title
    if update_data.seo_description is not None:
        updates["seo_description"] = update_data.seo_description
    if update_data.order is not None:
        updates["order"] = update_data.order
    
    await db.admin_categories.update_one({"id": category_id}, {"$set": updates})
    await log_audit(admin["id"], admin["email"], AuditAction.UPDATE, "category", category_id, updates, request)
    
    return await db.admin_categories.find_one({"id": category_id}, {"_id": 0})

@api_router.delete("/categories/{category_id}")
async def delete_category(
    request: Request,
    category_id: str,
    migrate_to: Optional[str] = Query(None, description="Category ID to migrate listings to"),
    admin: dict = Depends(require_permission(Permission.MANAGE_CATEGORIES))
):
    """Delete category - requires migration of listings"""
    category = await db.admin_categories.find_one({"id": category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check for active listings
    listings_count = await db.listings.count_documents({"category_id": category_id, "status": {"$in": ["active", "pending"]}})
    
    if listings_count > 0 and not migrate_to:
        raise HTTPException(
            status_code=400,
            detail=f"Category has {listings_count} active listings. Provide migrate_to parameter."
        )
    
    # Migrate listings if specified
    if migrate_to:
        target = await db.admin_categories.find_one({"id": migrate_to})
        if not target:
            raise HTTPException(status_code=400, detail="Migration target category not found")
        
        await db.listings.update_many(
            {"category_id": category_id},
            {"$set": {"category_id": migrate_to, "updated_at": datetime.now(timezone.utc)}}
        )
    
    # Delete category
    await db.admin_categories.delete_one({"id": category_id})
    await log_audit(admin["id"], admin["email"], AuditAction.DELETE, "category", category_id, {"name": category["name"], "migrate_to": migrate_to}, request)
    
    return {"message": "Category deleted successfully", "migrated_listings": listings_count if migrate_to else 0}

@api_router.post("/categories/reorder")
async def reorder_categories(
    request: Request,
    orders: List[Dict[str, Any]] = Body(..., description="List of {id, order} objects"),
    admin: dict = Depends(require_permission(Permission.MANAGE_CATEGORIES))
):
    """Reorder categories"""
    for item in orders:
        await db.admin_categories.update_one(
            {"id": item["id"]},
            {"$set": {"order": item["order"], "updated_at": datetime.now(timezone.utc)}}
        )
    
    await log_audit(admin["id"], admin["email"], AuditAction.UPDATE, "categories", "bulk", {"reorder": len(orders)}, request)
    return {"message": f"Reordered {len(orders)} categories"}

# Icon Upload for Categories
@api_router.post("/categories/{category_id}/icon")
async def upload_category_icon(
    category_id: str,
    file: UploadFile = File(...),
    admin: dict = Depends(require_permission(Permission.MANAGE_CATEGORIES))
):
    """Upload custom icon for a category (SVG, PNG, JPG)"""
    category = await db.admin_categories.find_one({"id": category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Validate file type
    allowed_types = ["image/svg+xml", "image/png", "image/jpeg", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: SVG, PNG, JPG")
    
    # Read and encode file
    import base64
    content = await file.read()
    
    # Limit file size (500KB)
    if len(content) > 500 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max size: 500KB")
    
    # Store as data URL
    icon_data = f"data:{file.content_type};base64,{base64.b64encode(content).decode()}"
    
    await db.admin_categories.update_one(
        {"id": category_id},
        {"$set": {"icon": icon_data, "icon_type": "custom", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Icon uploaded successfully", "icon_type": file.content_type}

@api_router.delete("/categories/{category_id}/icon")
async def delete_category_icon(
    category_id: str,
    admin: dict = Depends(require_permission(Permission.MANAGE_CATEGORIES))
):
    """Remove custom icon from category"""
    category = await db.admin_categories.find_one({"id": category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    await db.admin_categories.update_one(
        {"id": category_id},
        {"$unset": {"icon": "", "icon_type": ""}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Icon removed"}

# =============================================================================
# LOCATION/PLACE MANAGEMENT ENDPOINTS
# =============================================================================

class LocationCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    type: str = "city"  # country, state, city, district, neighborhood
    parent_id: Optional[str] = None
    country_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timezone: Optional[str] = None
    is_active: bool = True
    is_featured: bool = False

class LocationUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    type: Optional[str] = None
    parent_id: Optional[str] = None
    country_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timezone: Optional[str] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None

@api_router.get("/locations")
async def list_locations(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    type: Optional[str] = None,
    parent_id: Optional[str] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    admin: dict = Depends(require_permission(Permission.VIEW_REPORTS))
):
    """List all locations with filtering"""
    query = {}
    if type:
        query["type"] = type
    if parent_id:
        query["parent_id"] = parent_id
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    if is_active is not None:
        query["is_active"] = is_active
    
    total = await db.locations.count_documents(query)
    skip = (page - 1) * limit
    
    locations = await db.locations.find(query, {"_id": 0}).sort([("type", 1), ("name", 1)]).skip(skip).limit(limit).to_list(limit)
    
    return {
        "items": locations,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@api_router.post("/locations")
async def create_location(
    request: Request,
    location: LocationCreate,
    admin: dict = Depends(require_permission(Permission.MANAGE_SETTINGS))
):
    """Create a new location"""
    loc_id = f"loc_{uuid.uuid4().hex[:12]}"
    slug = location.slug or location.name.lower().replace(" ", "-").replace(",", "")
    
    # Check for duplicate slug
    existing = await db.locations.find_one({"slug": slug})
    if existing:
        slug = f"{slug}-{uuid.uuid4().hex[:4]}"
    
    new_location = {
        "id": loc_id,
        "name": sanitize_input(location.name),
        "slug": slug,
        "type": location.type,
        "parent_id": location.parent_id,
        "country_code": location.country_code,
        "latitude": location.latitude,
        "longitude": location.longitude,
        "timezone": location.timezone,
        "is_active": location.is_active,
        "is_featured": location.is_featured,
        "listings_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin["email"]
    }
    
    await db.locations.insert_one(new_location)
    await log_audit(admin["id"], admin["email"], AuditAction.CREATE, "location", loc_id, {"name": location.name}, request)
    
    new_location.pop("_id", None)
    return new_location

@api_router.put("/locations/{location_id}")
async def update_location(
    request: Request,
    location_id: str,
    location: LocationUpdate,
    admin: dict = Depends(require_permission(Permission.MANAGE_SETTINGS))
):
    """Update a location"""
    existing = await db.locations.find_one({"id": location_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Location not found")
    
    updates = {k: v for k, v in location.model_dump().items() if v is not None}
    if "name" in updates:
        updates["name"] = sanitize_input(updates["name"])
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.locations.update_one({"id": location_id}, {"$set": updates})
    await log_audit(admin["id"], admin["email"], AuditAction.UPDATE, "location", location_id, updates, request)
    
    return await db.locations.find_one({"id": location_id}, {"_id": 0})

@api_router.delete("/locations/{location_id}")
async def delete_location(
    request: Request,
    location_id: str,
    admin: dict = Depends(require_permission(Permission.MANAGE_SETTINGS))
):
    """Delete a location"""
    result = await db.locations.delete_one({"id": location_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Location not found")
    
    await log_audit(admin["id"], admin["email"], AuditAction.DELETE, "location", location_id, {}, request)
    return {"message": "Location deleted"}

@api_router.post("/locations/bulk-import")
async def bulk_import_locations(
    file: UploadFile = File(...),
    admin: dict = Depends(require_permission(Permission.MANAGE_SETTINGS))
):
    """Bulk import locations from CSV"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be CSV")
    
    import csv
    import io
    
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode('utf-8')))
    
    created = 0
    for row in reader:
        if not row.get('name'):
            continue
        
        loc_id = f"loc_{uuid.uuid4().hex[:12]}"
        new_loc = {
            "id": loc_id,
            "name": row.get('name', ''),
            "slug": row.get('slug', row.get('name', '').lower().replace(' ', '-')),
            "type": row.get('type', 'city'),
            "parent_id": row.get('parent_id'),
            "country_code": row.get('country_code'),
            "latitude": float(row['latitude']) if row.get('latitude') else None,
            "longitude": float(row['longitude']) if row.get('longitude') else None,
            "is_active": row.get('is_active', 'true').lower() == 'true',
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.locations.insert_one(new_loc)
        created += 1
    
    return {"message": f"Imported {created} locations", "created": created}

# =============================================================================
# USER MANAGEMENT ENDPOINTS (EDIT USER DATA)
# =============================================================================

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    is_verified: Optional[bool] = None
    is_active: Optional[bool] = None
    role: Optional[str] = None

@api_router.put("/users/{user_id}")
async def update_user(
    request: Request,
    user_id: str,
    user_data: UserUpdate,
    admin: dict = Depends(require_permission(Permission.EDIT_USERS))
):
    """Update user data"""
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    updates = {k: v for k, v in user_data.model_dump().items() if v is not None}
    if "name" in updates:
        updates["name"] = sanitize_input(updates["name"])
    if "bio" in updates:
        updates["bio"] = sanitize_input(updates["bio"])
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    updates["updated_by"] = admin["email"]
    
    await db.users.update_one({"user_id": user_id}, {"$set": updates})
    await log_audit(admin["id"], admin["email"], AuditAction.UPDATE, "user", user_id, updates, request)
    
    updated_user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password": 0, "hashed_password": 0, "password_hash": 0})
    return updated_user

@api_router.post("/users/{user_id}/avatar")
async def upload_user_avatar(
    user_id: str,
    file: UploadFile = File(...),
    admin: dict = Depends(require_permission(Permission.EDIT_USERS))
):
    """Upload user avatar"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    import base64
    content = await file.read()
    if len(content) > 1024 * 1024:  # 1MB limit
        raise HTTPException(status_code=400, detail="File too large. Max 1MB")
    
    avatar_data = f"data:{file.content_type};base64,{base64.b64encode(content).decode()}"
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"avatar_url": avatar_data, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Avatar uploaded successfully"}

# =============================================================================
# AUTHENTICATION SETTINGS
# =============================================================================

@api_router.get("/settings/auth")
async def get_auth_settings(
    admin: dict = Depends(require_permission(Permission.MANAGE_SETTINGS))
):
    """Get authentication settings"""
    settings = await db.app_settings.find_one({"type": "auth"}, {"_id": 0})
    if not settings:
        # Return defaults
        settings = {
            "type": "auth",
            "allow_registration": True,
            "require_email_verification": True,
            "require_phone_verification": False,
            "allow_social_login": True,
            "social_providers": ["google", "facebook", "apple"],
            "password_min_length": 8,
            "password_require_uppercase": True,
            "password_require_number": True,
            "password_require_special": False,
            "session_timeout_minutes": 1440,
            "max_login_attempts": 5,
            "lockout_duration_minutes": 30,
            "two_factor_enabled": False,
            "two_factor_methods": ["email", "sms"]
        }
    return settings

@api_router.put("/settings/auth")
async def update_auth_settings(
    request: Request,
    settings: Dict[str, Any] = Body(...),
    admin: dict = Depends(require_permission(Permission.MANAGE_SETTINGS))
):
    """Update authentication settings"""
    settings["type"] = "auth"
    settings["updated_at"] = datetime.now(timezone.utc).isoformat()
    settings["updated_by"] = admin["email"]
    
    await db.app_settings.update_one(
        {"type": "auth"},
        {"$set": settings},
        upsert=True
    )
    
    await log_audit(admin["id"], admin["email"], AuditAction.UPDATE, "settings", "auth", settings, request)
    return await db.app_settings.find_one({"type": "auth"}, {"_id": 0})

# =============================================================================
# ATTRIBUTE MANAGEMENT ENDPOINTS
# =============================================================================

@api_router.get("/categories/{category_id}/attributes")
async def get_category_attributes(
    category_id: str,
    admin: dict = Depends(require_permission(Permission.VIEW_ATTRIBUTES))
):
    """Get attributes for a category - supports id, slug, or name"""
    # Try to find by id first
    category = await db.admin_categories.find_one({"id": category_id}, {"_id": 0, "attributes": 1})
    
    # If not found, try by slug
    if not category:
        category = await db.admin_categories.find_one({"slug": category_id}, {"_id": 0, "attributes": 1})
    
    # If still not found, try by name (case insensitive)
    if not category:
        category = await db.admin_categories.find_one(
            {"name": {"$regex": f"^{category_id}$", "$options": "i"}},
            {"_id": 0, "attributes": 1}
        )
    
    if not category:
        # Return empty array instead of 404 for better UX
        return []
    
    return category.get("attributes", [])

# =============================================================================
# DEEPLINK MANAGEMENT
# =============================================================================

class DeeplinkCreate(BaseModel):
    name: str
    slug: str
    target_type: str  # listing, category, user, page, external
    target_id: Optional[str] = None
    target_url: Optional[str] = None
    fallback_url: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    is_active: bool = True
    expires_at: Optional[str] = None

class DeeplinkUpdate(BaseModel):
    name: Optional[str] = None
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    target_url: Optional[str] = None
    fallback_url: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    is_active: Optional[bool] = None
    expires_at: Optional[str] = None

@api_router.get("/deeplinks")
async def list_deeplinks(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    target_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    admin: dict = Depends(require_permission(Permission.VIEW_REPORTS))
):
    """List all deeplinks"""
    query = {}
    if target_type:
        query["target_type"] = target_type
    if is_active is not None:
        query["is_active"] = is_active
    
    total = await db.deeplinks.count_documents(query)
    skip = (page - 1) * limit
    
    deeplinks = await db.deeplinks.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "items": deeplinks,
        "total": total,
        "page": page,
        "limit": limit
    }

@api_router.post("/deeplinks")
async def create_deeplink(
    request: Request,
    deeplink: DeeplinkCreate,
    admin: dict = Depends(require_permission(Permission.MANAGE_SETTINGS))
):
    """Create a new deeplink"""
    # Check slug uniqueness
    existing = await db.deeplinks.find_one({"slug": deeplink.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")
    
    link_id = f"dl_{uuid.uuid4().hex[:12]}"
    
    new_deeplink = {
        "id": link_id,
        **deeplink.model_dump(),
        "click_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin["email"]
    }
    
    await db.deeplinks.insert_one(new_deeplink)
    await log_audit(admin["id"], admin["email"], AuditAction.CREATE, "deeplink", link_id, {"name": deeplink.name}, request)
    
    new_deeplink.pop("_id", None)
    return new_deeplink

@api_router.put("/deeplinks/{deeplink_id}")
async def update_deeplink(
    request: Request,
    deeplink_id: str,
    deeplink: DeeplinkUpdate,
    admin: dict = Depends(require_permission(Permission.MANAGE_SETTINGS))
):
    """Update a deeplink"""
    existing = await db.deeplinks.find_one({"id": deeplink_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Deeplink not found")
    
    updates = {k: v for k, v in deeplink.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.deeplinks.update_one({"id": deeplink_id}, {"$set": updates})
    await log_audit(admin["id"], admin["email"], AuditAction.UPDATE, "deeplink", deeplink_id, updates, request)
    
    return await db.deeplinks.find_one({"id": deeplink_id}, {"_id": 0})

@api_router.delete("/deeplinks/{deeplink_id}")
async def delete_deeplink(
    request: Request,
    deeplink_id: str,
    admin: dict = Depends(require_permission(Permission.MANAGE_SETTINGS))
):
    """Delete a deeplink"""
    result = await db.deeplinks.delete_one({"id": deeplink_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Deeplink not found")
    
    await log_audit(admin["id"], admin["email"], AuditAction.DELETE, "deeplink", deeplink_id, {}, request)
    return {"message": "Deeplink deleted"}

@api_router.get("/deeplinks/{deeplink_id}/stats")
async def get_deeplink_stats(
    deeplink_id: str,
    admin: dict = Depends(require_permission(Permission.VIEW_REPORTS))
):
    """Get deeplink click statistics"""
    deeplink = await db.deeplinks.find_one({"id": deeplink_id}, {"_id": 0})
    if not deeplink:
        raise HTTPException(status_code=404, detail="Deeplink not found")
    
    # Get click stats from analytics (if available)
    clicks_by_day = await db.deeplink_clicks.aggregate([
        {"$match": {"deeplink_id": deeplink_id}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": {"$toDate": "$clicked_at"}}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": -1}},
        {"$limit": 30}
    ]).to_list(30)
    
    return {
        "deeplink": deeplink,
        "total_clicks": deeplink.get("click_count", 0),
        "clicks_by_day": clicks_by_day
    }

@api_router.post("/categories/{category_id}/attributes")
async def add_category_attribute(
    request: Request,
    category_id: str,
    attribute: AttributeCreate,
    admin: dict = Depends(require_permission(Permission.MANAGE_ATTRIBUTES))
):
    """Add attribute to category"""
    category = await db.admin_categories.find_one({"id": category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    attr_id = f"attr_{uuid.uuid4().hex[:12]}"
    new_attr = {
        "id": attr_id,
        "name": sanitize_input(attribute.name),
        "key": attribute.key,
        "type": attribute.type,
        "required": attribute.required,
        "options": attribute.options,
        "validation": attribute.validation,
        "order": attribute.order,
        "conditions": attribute.conditions,
        # New fields
        "icon": attribute.icon,
        "placeholder": attribute.placeholder,
        "help_text": attribute.help_text,
        "min_length": attribute.min_length,
        "max_length": attribute.max_length,
        "min_value": attribute.min_value,
        "max_value": attribute.max_value,
        "default_value": attribute.default_value,
        "unit": attribute.unit,
        "searchable": attribute.searchable,
        "filterable": attribute.filterable,
        "show_in_list": attribute.show_in_list,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin["email"]
    }
    
    await db.admin_categories.update_one(
        {"id": category_id},
        {
            "$push": {"attributes": new_attr},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    
    await log_audit(admin["id"], admin["email"], AuditAction.CREATE, "attribute", attr_id, {"category_id": category_id, "name": attribute.name}, request)
    return new_attr

# Attribute Templates - Predefined attribute sets for quick setup
ATTRIBUTE_TEMPLATES = {
    "vehicle": {
        "name": "Vehicle Attributes",
        "description": "Standard attributes for cars, motorcycles, and other vehicles",
        "icon": "🚗",
        "attributes": [
            {"name": "Make", "key": "make", "type": "dropdown", "required": True, "icon": "🏭", "options": ["Toyota", "Honda", "Ford", "BMW", "Mercedes", "Audi", "Volkswagen", "Other"]},
            {"name": "Model", "key": "model", "type": "text", "required": True, "icon": "📝", "max_length": 100},
            {"name": "Year", "key": "year", "type": "number", "required": True, "icon": "📅", "min_value": 1900, "max_value": 2030},
            {"name": "Mileage", "key": "mileage", "type": "number", "required": True, "icon": "🛣️", "unit": "km", "min_value": 0},
            {"name": "Fuel Type", "key": "fuel_type", "type": "dropdown", "required": True, "icon": "⛽", "options": ["Petrol", "Diesel", "Electric", "Hybrid", "LPG"]},
            {"name": "Transmission", "key": "transmission", "type": "dropdown", "required": True, "icon": "⚙️", "options": ["Automatic", "Manual", "Semi-Auto"]},
            {"name": "Color", "key": "color", "type": "dropdown", "required": False, "icon": "🎨", "options": ["Black", "White", "Silver", "Red", "Blue", "Green", "Grey", "Other"]},
            {"name": "Engine Size", "key": "engine_size", "type": "text", "required": False, "icon": "🔧", "placeholder": "e.g., 2.0L"},
        ]
    },
    "property": {
        "name": "Property Attributes",
        "description": "Standard attributes for real estate listings",
        "icon": "🏠",
        "attributes": [
            {"name": "Property Type", "key": "property_type", "type": "dropdown", "required": True, "icon": "🏢", "options": ["Apartment", "House", "Villa", "Studio", "Penthouse", "Townhouse", "Land"]},
            {"name": "Bedrooms", "key": "bedrooms", "type": "number", "required": True, "icon": "🛏️", "min_value": 0, "max_value": 20},
            {"name": "Bathrooms", "key": "bathrooms", "type": "number", "required": True, "icon": "🚿", "min_value": 0, "max_value": 10},
            {"name": "Area", "key": "area", "type": "number", "required": True, "icon": "📐", "unit": "m²", "min_value": 1},
            {"name": "Floor", "key": "floor", "type": "number", "required": False, "icon": "🏗️", "min_value": -2, "max_value": 100},
            {"name": "Furnished", "key": "furnished", "type": "dropdown", "required": False, "icon": "🛋️", "options": ["Furnished", "Semi-Furnished", "Unfurnished"]},
            {"name": "Parking", "key": "parking", "type": "checkbox", "required": False, "icon": "🅿️", "options": ["Garage", "Street Parking", "Private Lot"]},
            {"name": "Amenities", "key": "amenities", "type": "checkbox", "required": False, "icon": "✨", "options": ["Pool", "Gym", "Garden", "Balcony", "Security", "Elevator"]},
        ]
    },
    "electronics": {
        "name": "Electronics Attributes",
        "description": "Standard attributes for phones, computers, and electronics",
        "icon": "📱",
        "attributes": [
            {"name": "Brand", "key": "brand", "type": "dropdown", "required": True, "icon": "🏷️", "options": ["Apple", "Samsung", "Sony", "LG", "HP", "Dell", "Lenovo", "Asus", "Other"]},
            {"name": "Model", "key": "model", "type": "text", "required": True, "icon": "📝", "max_length": 100},
            {"name": "Condition", "key": "item_condition", "type": "dropdown", "required": True, "icon": "✅", "options": ["New", "Like New", "Good", "Fair", "For Parts"]},
            {"name": "Storage", "key": "storage", "type": "dropdown", "required": False, "icon": "💾", "options": ["16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "2TB"]},
            {"name": "Color", "key": "color", "type": "text", "required": False, "icon": "🎨"},
            {"name": "Warranty", "key": "warranty", "type": "dropdown", "required": False, "icon": "🛡️", "options": ["No Warranty", "Under Warranty", "Extended Warranty"]},
        ]
    },
    "fashion": {
        "name": "Fashion Attributes",
        "description": "Standard attributes for clothing and accessories",
        "icon": "👗",
        "attributes": [
            {"name": "Size", "key": "size", "type": "dropdown", "required": True, "icon": "📏", "options": ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]},
            {"name": "Color", "key": "color", "type": "text", "required": True, "icon": "🎨"},
            {"name": "Brand", "key": "brand", "type": "text", "required": False, "icon": "🏷️"},
            {"name": "Material", "key": "material", "type": "text", "required": False, "icon": "🧵"},
            {"name": "Condition", "key": "condition", "type": "dropdown", "required": True, "icon": "✅", "options": ["New with Tags", "New without Tags", "Like New", "Good", "Fair"]},
            {"name": "Gender", "key": "gender", "type": "dropdown", "required": False, "icon": "👤", "options": ["Men", "Women", "Unisex", "Boys", "Girls"]},
        ]
    },
    "jobs": {
        "name": "Jobs & Services Attributes",
        "description": "Standard attributes for job listings and services",
        "icon": "💼",
        "attributes": [
            {"name": "Job Type", "key": "job_type", "type": "dropdown", "required": True, "icon": "📋", "options": ["Full-time", "Part-time", "Contract", "Freelance", "Internship"]},
            {"name": "Experience Level", "key": "experience", "type": "dropdown", "required": True, "icon": "📊", "options": ["Entry Level", "Mid Level", "Senior", "Executive"]},
            {"name": "Salary Range", "key": "salary_range", "type": "text", "required": False, "icon": "💰", "placeholder": "e.g., $50,000 - $70,000"},
            {"name": "Remote Work", "key": "remote", "type": "dropdown", "required": False, "icon": "🏠", "options": ["On-site", "Remote", "Hybrid"]},
            {"name": "Industry", "key": "industry", "type": "text", "required": False, "icon": "🏢"},
        ]
    }
}

@api_router.get("/attributes")
async def list_all_attributes(
    include_inherited: bool = True,
    admin: dict = Depends(require_permission(Permission.VIEW_ATTRIBUTES))
):
    """Get all attributes from all categories with inheritance support"""
    categories = await db.admin_categories.find(
        {}, {"_id": 0, "id": 1, "name": 1, "slug": 1, "parent_id": 1, "attributes": 1}
    ).to_list(500)
    
    # Build category lookup for inheritance
    category_map = {c["id"]: c for c in categories}
    
    def get_inherited_attributes(cat_id: str, visited: set = None) -> List[dict]:
        """Recursively get inherited attributes from parent categories"""
        if visited is None:
            visited = set()
        if cat_id in visited or cat_id not in category_map:
            return []
        visited.add(cat_id)
        
        cat = category_map[cat_id]
        inherited = []
        
        if cat.get("parent_id") and cat["parent_id"] in category_map:
            parent = category_map[cat["parent_id"]]
            # Get parent's own attributes
            for attr in parent.get("attributes", []):
                inherited.append({
                    **attr,
                    "inherited_from": parent["id"],
                    "inherited_from_name": parent["name"],
                    "is_inherited": True
                })
            # Get parent's inherited attributes (recursive)
            inherited.extend(get_inherited_attributes(cat["parent_id"], visited))
        
        return inherited
    
    all_attributes = []
    for cat in categories:
        # Own attributes
        for attr in cat.get("attributes", []):
            all_attributes.append({
                **attr,
                "category_id": cat["id"],
                "category_name": cat["name"],
                "category_slug": cat.get("slug", ""),
                "parent_id": cat.get("parent_id"),
                "is_inherited": False
            })
        
        # Inherited attributes
        if include_inherited:
            inherited = get_inherited_attributes(cat["id"])
            for attr in inherited:
                all_attributes.append({
                    **attr,
                    "category_id": cat["id"],
                    "category_name": cat["name"],
                    "category_slug": cat.get("slug", ""),
                    "parent_id": cat.get("parent_id")
                })
    
    # Sort by category name, then order
    all_attributes.sort(key=lambda x: (x["category_name"], x.get("order", 0)))
    
    return {
        "attributes": all_attributes,
        "total": len(all_attributes),
        "own_count": len([a for a in all_attributes if not a.get("is_inherited")]),
        "inherited_count": len([a for a in all_attributes if a.get("is_inherited")]),
        "categories_count": len([c for c in categories if c.get("attributes")])
    }

# Attribute Templates Endpoints
@api_router.get("/attribute-templates")
async def list_attribute_templates(
    admin: dict = Depends(require_permission(Permission.VIEW_ATTRIBUTES))
):
    """List available attribute templates"""
    templates = []
    for key, template in ATTRIBUTE_TEMPLATES.items():
        templates.append({
            "id": key,
            "name": template["name"],
            "description": template["description"],
            "icon": template["icon"],
            "attribute_count": len(template["attributes"]),
            "attributes_preview": [a["name"] for a in template["attributes"][:5]]
        })
    return {"templates": templates}

@api_router.get("/attribute-templates/{template_id}")
async def get_attribute_template(
    template_id: str,
    admin: dict = Depends(require_permission(Permission.VIEW_ATTRIBUTES))
):
    """Get detailed attribute template"""
    if template_id not in ATTRIBUTE_TEMPLATES:
        raise HTTPException(status_code=404, detail="Template not found")
    
    template = ATTRIBUTE_TEMPLATES[template_id]
    return {
        "id": template_id,
        **template
    }

@api_router.post("/categories/{category_id}/apply-template")
async def apply_attribute_template(
    request: Request,
    category_id: str,
    template_id: str = Body(..., embed=True),
    merge: bool = Body(True, embed=True),
    admin: dict = Depends(require_permission(Permission.MANAGE_ATTRIBUTES))
):
    """Apply an attribute template to a category"""
    if template_id not in ATTRIBUTE_TEMPLATES:
        raise HTTPException(status_code=404, detail="Template not found")
    
    category = await db.admin_categories.find_one({"id": category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    template = ATTRIBUTE_TEMPLATES[template_id]
    existing_attrs = category.get("attributes", []) if merge else []
    existing_keys = {a["key"] for a in existing_attrs}
    
    new_attrs = []
    skipped = 0
    for idx, attr in enumerate(template["attributes"]):
        if attr["key"] in existing_keys:
            skipped += 1
            continue
        
        attr_id = f"attr_{uuid.uuid4().hex[:12]}"
        new_attr = {
            "id": attr_id,
            **attr,
            "order": len(existing_attrs) + len(new_attrs),
            "searchable": True,
            "filterable": True,
            "show_in_list": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": admin["email"],
            "from_template": template_id
        }
        new_attrs.append(new_attr)
    
    all_attrs = existing_attrs + new_attrs
    
    await db.admin_categories.update_one(
        {"id": category_id},
        {"$set": {"attributes": all_attrs}}
    )
    
    await log_audit(
        admin["id"], admin["email"], AuditAction.UPDATE, "category_attributes", 
        category_id, {"template": template_id, "added": len(new_attrs), "skipped": skipped}, request
    )
    
    return {
        "message": f"Template applied successfully",
        "added": len(new_attrs),
        "skipped": skipped,
        "total_attributes": len(all_attrs)
    }

# Bulk Attribute Operations
class BulkAttributeAction(BaseModel):
    attribute_ids: List[str]
    category_id: str
    action: str = Field(..., pattern="^(delete|update|copy)$")
    update_data: Optional[Dict[str, Any]] = None
    target_category_id: Optional[str] = None

@api_router.post("/attributes/bulk")
async def bulk_attribute_action(
    request: Request,
    action_data: BulkAttributeAction,
    admin: dict = Depends(require_permission(Permission.MANAGE_ATTRIBUTES))
):
    """Perform bulk operations on attributes"""
    category = await db.admin_categories.find_one({"id": action_data.category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    attrs = category.get("attributes", [])
    affected = 0
    
    if action_data.action == "delete":
        # Bulk delete
        original_count = len(attrs)
        attrs = [a for a in attrs if a["id"] not in action_data.attribute_ids]
        affected = original_count - len(attrs)
        
        await db.admin_categories.update_one(
            {"id": action_data.category_id},
            {"$set": {"attributes": attrs}}
        )
        
    elif action_data.action == "update":
        # Bulk update
        if not action_data.update_data:
            raise HTTPException(status_code=400, detail="update_data required for update action")
        
        for attr in attrs:
            if attr["id"] in action_data.attribute_ids:
                for key, value in action_data.update_data.items():
                    if key not in ["id", "key", "category_id"]:  # Protected fields
                        attr[key] = value
                affected += 1
        
        await db.admin_categories.update_one(
            {"id": action_data.category_id},
            {"$set": {"attributes": attrs}}
        )
        
    elif action_data.action == "copy":
        # Copy attributes to another category
        if not action_data.target_category_id:
            raise HTTPException(status_code=400, detail="target_category_id required for copy action")
        
        target_cat = await db.admin_categories.find_one({"id": action_data.target_category_id})
        if not target_cat:
            raise HTTPException(status_code=404, detail="Target category not found")
        
        target_attrs = target_cat.get("attributes", [])
        existing_keys = {a["key"] for a in target_attrs}
        
        for attr in attrs:
            if attr["id"] in action_data.attribute_ids and attr["key"] not in existing_keys:
                new_attr = {
                    **attr,
                    "id": f"attr_{uuid.uuid4().hex[:12]}",
                    "order": len(target_attrs),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "created_by": admin["email"],
                    "copied_from": action_data.category_id
                }
                target_attrs.append(new_attr)
                affected += 1
        
        await db.admin_categories.update_one(
            {"id": action_data.target_category_id},
            {"$set": {"attributes": target_attrs}}
        )
    
    await log_audit(
        admin["id"], admin["email"], AuditAction.UPDATE, "attributes_bulk",
        action_data.category_id, {"action": action_data.action, "count": affected}, request
    )
    
    return {
        "message": f"Bulk {action_data.action} completed",
        "affected": affected
    }

@api_router.patch("/categories/{category_id}/attributes/{attribute_id}")
async def update_category_attribute(
    request: Request,
    category_id: str,
    attribute_id: str,
    update_data: AttributeUpdate,
    admin: dict = Depends(require_permission(Permission.MANAGE_ATTRIBUTES))
):
    """Update category attribute"""
    category = await db.admin_categories.find_one({"id": category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    attrs = category.get("attributes", [])
    attr_index = next((i for i, a in enumerate(attrs) if a["id"] == attribute_id), None)
    
    if attr_index is None:
        raise HTTPException(status_code=404, detail="Attribute not found")
    
    updates = {}
    if update_data.name is not None:
        updates[f"attributes.{attr_index}.name"] = sanitize_input(update_data.name)
    if update_data.key is not None:
        updates[f"attributes.{attr_index}.key"] = update_data.key
    if update_data.type is not None:
        updates[f"attributes.{attr_index}.type"] = update_data.type
    if update_data.required is not None:
        updates[f"attributes.{attr_index}.required"] = update_data.required
    if update_data.options is not None:
        updates[f"attributes.{attr_index}.options"] = update_data.options
    if update_data.validation is not None:
        updates[f"attributes.{attr_index}.validation"] = update_data.validation
    if update_data.order is not None:
        updates[f"attributes.{attr_index}.order"] = update_data.order
    if update_data.conditions is not None:
        updates[f"attributes.{attr_index}.conditions"] = update_data.conditions
    if update_data.icon is not None:
        updates[f"attributes.{attr_index}.icon"] = update_data.icon
    if update_data.placeholder is not None:
        updates[f"attributes.{attr_index}.placeholder"] = update_data.placeholder
    if update_data.help_text is not None:
        updates[f"attributes.{attr_index}.help_text"] = update_data.help_text
    if update_data.min_length is not None:
        updates[f"attributes.{attr_index}.min_length"] = update_data.min_length
    if update_data.max_length is not None:
        updates[f"attributes.{attr_index}.max_length"] = update_data.max_length
    if update_data.min_value is not None:
        updates[f"attributes.{attr_index}.min_value"] = update_data.min_value
    if update_data.max_value is not None:
        updates[f"attributes.{attr_index}.max_value"] = update_data.max_value
    if update_data.default_value is not None:
        updates[f"attributes.{attr_index}.default_value"] = update_data.default_value
    if update_data.unit is not None:
        updates[f"attributes.{attr_index}.unit"] = update_data.unit
    if update_data.searchable is not None:
        updates[f"attributes.{attr_index}.searchable"] = update_data.searchable
    if update_data.filterable is not None:
        updates[f"attributes.{attr_index}.filterable"] = update_data.filterable
    if update_data.show_in_list is not None:
        updates[f"attributes.{attr_index}.show_in_list"] = update_data.show_in_list
    
    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.admin_categories.update_one({"id": category_id}, {"$set": updates})
        await log_audit(admin["id"], admin["email"], AuditAction.UPDATE, "attribute", attribute_id, updates, request)
    
    category = await db.admin_categories.find_one({"id": category_id}, {"_id": 0, "attributes": 1})
    return next((a for a in category["attributes"] if a["id"] == attribute_id), None)

@api_router.delete("/categories/{category_id}/attributes/{attribute_id}")
async def delete_category_attribute(
    request: Request,
    category_id: str,
    attribute_id: str,
    admin: dict = Depends(require_permission(Permission.MANAGE_ATTRIBUTES))
):
    """Delete category attribute"""
    result = await db.admin_categories.update_one(
        {"id": category_id},
        {
            "$pull": {"attributes": {"id": attribute_id}},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Category or attribute not found")
    
    await log_audit(admin["id"], admin["email"], AuditAction.DELETE, "attribute", attribute_id, {"category_id": category_id}, request)
    return {"message": "Attribute deleted successfully"}

@api_router.post("/categories/{category_id}/attributes/{attribute_id}/icon")
async def upload_attribute_icon(
    category_id: str,
    attribute_id: str,
    file: UploadFile = File(...),
    admin: dict = Depends(require_permission(Permission.MANAGE_ATTRIBUTES))
):
    """Upload custom icon for an attribute (SVG, PNG, JPG)"""
    import base64
    
    category = await db.admin_categories.find_one({"id": category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Find attribute index
    attr_index = None
    for i, attr in enumerate(category.get("attributes", [])):
        if attr["id"] == attribute_id:
            attr_index = i
            break
    
    if attr_index is None:
        raise HTTPException(status_code=404, detail="Attribute not found")
    
    # Validate file type
    allowed_types = ["image/svg+xml", "image/png", "image/jpeg", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: SVG, PNG, JPG")
    
    # Read and encode file
    content = await file.read()
    
    # Limit file size (200KB for attributes)
    if len(content) > 200 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max size: 200KB")
    
    # Store as data URL
    icon_data = f"data:{file.content_type};base64,{base64.b64encode(content).decode()}"
    
    await db.admin_categories.update_one(
        {"id": category_id},
        {"$set": {
            f"attributes.{attr_index}.icon": icon_data,
            f"attributes.{attr_index}.icon_type": "custom",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Attribute icon uploaded successfully", "icon_type": file.content_type}

@api_router.delete("/categories/{category_id}/attributes/{attribute_id}/icon")
async def delete_attribute_icon(
    category_id: str,
    attribute_id: str,
    admin: dict = Depends(require_permission(Permission.MANAGE_ATTRIBUTES))
):
    """Remove custom icon from attribute"""
    category = await db.admin_categories.find_one({"id": category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Find attribute index
    attr_index = None
    for i, attr in enumerate(category.get("attributes", [])):
        if attr["id"] == attribute_id:
            attr_index = i
            break
    
    if attr_index is None:
        raise HTTPException(status_code=404, detail="Attribute not found")
    
    await db.admin_categories.update_one(
        {"id": category_id},
        {"$unset": {
            f"attributes.{attr_index}.icon": "",
            f"attributes.{attr_index}.icon_type": ""
        }, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Attribute icon removed"}

# =============================================================================
# USER MANAGEMENT ENDPOINTS
# =============================================================================

@api_router.get("/users/search")
async def search_users_for_badges(
    admin: dict = Depends(get_current_admin),
    q: str = Query(..., min_length=2)
):
    """Search users by email or name for badge assignment"""
    users = await db.users.find(
        {
            "$or": [
                {"email": {"$regex": q, "$options": "i"}},
                {"name": {"$regex": q, "$options": "i"}}
            ]
        },
        {"_id": 0, "user_id": 1, "email": 1, "name": 1}
    ).limit(10).to_list(length=10)
    
    return {"users": users}

@api_router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    verified: Optional[bool] = None,
    admin: dict = Depends(require_permission(Permission.VIEW_USERS))
):
    """List marketplace users with filtering"""
    query = {}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    if status == "banned":
        query["is_banned"] = True
    elif status == "active":
        query["is_banned"] = {"$ne": True}
    
    if verified is not None:
        query["verified"] = verified
    
    skip = (page - 1) * limit
    total = await db.users.count_documents(query)
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).skip(skip).limit(limit).sort("created_at", -1).to_list(limit)
    
    return {
        "items": users,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@api_router.get("/users/{user_id}")
async def get_user(
    user_id: str,
    admin: dict = Depends(require_permission(Permission.VIEW_USERS))
):
    """Get user details"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get additional stats
    listings_count = await db.listings.count_documents({"user_id": user_id})
    reports_count = await db.reports.count_documents({"reported_user_id": user_id})
    
    user["stats"] = {
        "listings_count": listings_count,
        "reports_count": reports_count
    }
    
    return user

@api_router.post("/users/{user_id}/ban")
async def ban_user(
    request: Request,
    user_id: str,
    ban_data: UserBanRequest,
    admin: dict = Depends(require_permission(Permission.BAN_USERS))
):
    """Ban a user"""
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    ban_until = None
    if ban_data.duration_days:
        ban_until = datetime.now(timezone.utc) + timedelta(days=ban_data.duration_days)
    
    await db.users.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "is_banned": True,
                "ban_reason": ban_data.reason,
                "ban_until": ban_until,
                "banned_by": admin["id"],
                "banned_at": datetime.now(timezone.utc)
            }
        }
    )
    
    await log_audit(admin["id"], admin["email"], AuditAction.BAN_USER, "user", user_id, {"reason": ban_data.reason, "duration_days": ban_data.duration_days}, request)
    return {"message": "User banned successfully"}

@api_router.post("/users/{user_id}/unban")
async def unban_user(
    request: Request,
    user_id: str,
    admin: dict = Depends(require_permission(Permission.BAN_USERS))
):
    """Unban a user"""
    result = await db.users.update_one(
        {"user_id": user_id},
        {
            "$set": {"is_banned": False},
            "$unset": {"ban_reason": "", "ban_until": "", "banned_by": "", "banned_at": ""}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    await log_audit(admin["id"], admin["email"], AuditAction.UNBAN_USER, "user", user_id, request=request)
    return {"message": "User unbanned successfully"}

# =============================================================================
# LISTINGS MANAGEMENT ENDPOINTS
# =============================================================================

@api_router.get("/listings")
async def list_listings(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    featured: Optional[bool] = None,
    admin: dict = Depends(require_permission(Permission.VIEW_LISTINGS))
):
    """List all listings with filtering"""
    query = {}
    
    if status:
        query["status"] = status
    if category_id:
        query["category_id"] = category_id
    if featured is not None:
        query["featured"] = featured
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    skip = (page - 1) * limit
    total = await db.listings.count_documents(query)
    listings = await db.listings.find(query, {"_id": 0}).skip(skip).limit(limit).sort("created_at", -1).to_list(limit)
    
    return {
        "items": listings,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@api_router.get("/listings/{listing_id}")
async def get_listing(
    listing_id: str,
    admin: dict = Depends(require_permission(Permission.VIEW_LISTINGS))
):
    """Get listing details"""
    listing = await db.listings.find_one({"id": listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Get seller info
    seller = await db.users.find_one({"user_id": listing["user_id"]}, {"_id": 0, "password_hash": 0})
    listing["seller"] = seller
    
    return listing

@api_router.patch("/listings/{listing_id}/status")
async def update_listing_status(
    request: Request,
    listing_id: str,
    status_data: ListingStatusUpdate,
    admin: dict = Depends(require_permission(Permission.EDIT_LISTINGS))
):
    """Update listing status"""
    listing = await db.listings.find_one({"id": listing_id})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    old_status = listing.get("status")
    action = AuditAction.UPDATE
    
    if status_data.status == "active" and old_status == "pending":
        action = AuditAction.APPROVE_LISTING
    elif status_data.status == "rejected":
        action = AuditAction.REJECT_LISTING
    
    await db.listings.update_one(
        {"id": listing_id},
        {
            "$set": {
                "status": status_data.status,
                "moderation_reason": status_data.reason,
                "moderation_notes": status_data.notes,
                "moderated_by": admin["id"],
                "moderated_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    await log_audit(admin["id"], admin["email"], action, "listing", listing_id, {"status": status_data.status, "reason": status_data.reason}, request)
    return {"message": f"Listing status updated to {status_data.status}"}

class ListingFullUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    category_id: Optional[str] = None
    location: Optional[str] = None
    condition: Optional[str] = None
    status: Optional[str] = None
    images: Optional[List[str]] = None
    attributes: Optional[dict] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    negotiable: Optional[bool] = None

@api_router.put("/listings/{listing_id}")
async def update_listing_full(
    request: Request,
    listing_id: str,
    listing_data: ListingFullUpdate,
    admin: dict = Depends(require_permission(Permission.EDIT_LISTINGS))
):
    """Full update of a listing - allows admin to edit all fields"""
    listing = await db.listings.find_one({"id": listing_id})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Build update data from non-None fields
    update_data = {k: v for k, v in listing_data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Sanitize text fields
    if "name" in update_data:
        update_data["name"] = sanitize_input(update_data["name"])
    if "description" in update_data:
        update_data["description"] = sanitize_input(update_data["description"])
    
    # Add metadata
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = admin["id"]
    
    # If category changed, update category name
    if "category_id" in update_data:
        category = await db.admin_categories.find_one({"id": update_data["category_id"]})
        if category:
            update_data["category_name"] = category.get("name")
    
    await db.listings.update_one(
        {"id": listing_id},
        {"$set": update_data}
    )
    
    # Log the changes
    changes_summary = list(update_data.keys())
    await log_audit(
        admin["id"], 
        admin["email"], 
        AuditAction.UPDATE, 
        "listing", 
        listing_id, 
        {"fields_updated": changes_summary, "listing_name": listing.get("name")}, 
        request
    )
    
    # Return updated listing
    updated_listing = await db.listings.find_one({"id": listing_id}, {"_id": 0})
    return updated_listing

@api_router.post("/listings/{listing_id}/images")
async def upload_listing_images(
    listing_id: str,
    files: List[UploadFile] = File(...),
    admin: dict = Depends(require_permission(Permission.EDIT_LISTINGS))
):
    """Upload new images for a listing"""
    import base64
    
    listing = await db.listings.find_one({"id": listing_id})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    current_images = listing.get("images", [])
    new_images = []
    
    for file in files:
        if not file.content_type.startswith("image/"):
            continue
        
        content = await file.read()
        # Store as base64 data URL for simplicity (in production, use cloud storage)
        image_data = f"data:{file.content_type};base64,{base64.b64encode(content).decode()}"
        new_images.append(image_data)
    
    all_images = current_images + new_images
    
    await db.listings.update_one(
        {"id": listing_id},
        {"$set": {
            "images": all_images,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": f"Added {len(new_images)} images", "total_images": len(all_images)}

@api_router.delete("/listings/{listing_id}/images/{image_index}")
async def delete_listing_image(
    listing_id: str,
    image_index: int,
    admin: dict = Depends(require_permission(Permission.EDIT_LISTINGS))
):
    """Delete a specific image from a listing"""
    listing = await db.listings.find_one({"id": listing_id})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    images = listing.get("images", [])
    if image_index < 0 or image_index >= len(images):
        raise HTTPException(status_code=400, detail="Invalid image index")
    
    images.pop(image_index)
    
    await db.listings.update_one(
        {"id": listing_id},
        {"$set": {
            "images": images,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Image deleted", "remaining_images": len(images)}

@api_router.post("/listings/{listing_id}/feature")
async def toggle_listing_feature(
    request: Request,
    listing_id: str,
    featured: bool = Query(...),
    admin: dict = Depends(require_permission(Permission.FEATURE_LISTINGS))
):
    """Toggle listing featured status"""
    result = await db.listings.update_one(
        {"id": listing_id},
        {
            "$set": {
                "featured": featured,
                "featured_by": admin["id"] if featured else None,
                "featured_at": datetime.now(timezone.utc) if featured else None,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    await log_audit(admin["id"], admin["email"], AuditAction.FEATURE_LISTING, "listing", listing_id, {"featured": featured}, request)
    return {"message": f"Listing {'featured' if featured else 'unfeatured'} successfully"}

@api_router.post("/listings/bulk")
async def bulk_listing_action(
    request: Request,
    action_data: ListingBulkAction,
    admin: dict = Depends(require_permission(Permission.EDIT_LISTINGS))
):
    """Perform bulk action on listings"""
    updates = {"updated_at": datetime.now(timezone.utc)}
    
    if action_data.action == "approve":
        updates["status"] = "active"
    elif action_data.action == "reject":
        updates["status"] = "rejected"
        updates["moderation_reason"] = action_data.reason
    elif action_data.action == "delete":
        updates["status"] = "deleted"
    elif action_data.action == "pause":
        updates["status"] = "paused"
    elif action_data.action == "feature":
        updates["featured"] = True
    elif action_data.action == "unfeature":
        updates["featured"] = False
    elif action_data.action == "move_category":
        if not action_data.category_id:
            raise HTTPException(status_code=400, detail="category_id required for move_category action")
        updates["category_id"] = action_data.category_id
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {action_data.action}")
    
    result = await db.listings.update_many(
        {"id": {"$in": action_data.listing_ids}},
        {"$set": updates}
    )
    
    await log_audit(admin["id"], admin["email"], AuditAction.UPDATE, "listings", "bulk", {"action": action_data.action, "count": result.modified_count}, request)
    return {"message": f"Updated {result.modified_count} listings", "modified_count": result.modified_count}

@api_router.post("/listings/import")
async def import_listings_csv(
    file: UploadFile = File(...),
    admin: dict = Depends(require_permission(Permission.MANAGE_LISTINGS))
):
    """Import listings from CSV file"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    content = await file.read()
    try:
        import csv
        import io
        
        csv_reader = csv.DictReader(io.StringIO(content.decode('utf-8')))
        
        created = 0
        updated = 0
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):
            try:
                # Required fields
                if not row.get('name') or not row.get('price'):
                    errors.append(f"Row {row_num}: Missing required fields (name, price)")
                    continue
                
                listing_data = {
                    "name": sanitize_input(row.get('name', '')),
                    "description": sanitize_input(row.get('description', '')),
                    "price": float(row.get('price', 0)),
                    "currency": row.get('currency', 'EUR'),
                    "category_id": row.get('category_id'),
                    "location": row.get('location'),
                    "status": row.get('status', 'active'),
                    "condition": row.get('condition', 'new'),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                # Check if listing exists by ID
                if row.get('id'):
                    existing = await db.listings.find_one({"id": row['id']})
                    if existing:
                        await db.listings.update_one({"id": row['id']}, {"$set": listing_data})
                        updated += 1
                        continue
                
                # Create new listing
                listing_data["id"] = f"listing_{uuid.uuid4().hex[:12]}"
                listing_data["created_at"] = datetime.now(timezone.utc).isoformat()
                listing_data["views"] = 0
                listing_data["favorites"] = 0
                listing_data["images"] = []
                
                await db.listings.insert_one(listing_data)
                created += 1
                
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        return {
            "success": True,
            "created": created,
            "updated": updated,
            "errors": errors[:10],  # Return first 10 errors
            "total_errors": len(errors)
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

# =============================================================================
# REPORTS MANAGEMENT ENDPOINTS
# =============================================================================

@api_router.get("/reports")
async def list_reports(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    admin: dict = Depends(require_permission(Permission.VIEW_REPORTS))
):
    """List all reports"""
    query = {}
    if status:
        query["status"] = status
    
    skip = (page - 1) * limit
    total = await db.reports.count_documents(query)
    reports = await db.reports.find(query, {"_id": 0}).skip(skip).limit(limit).sort("created_at", -1).to_list(limit)
    
    return {
        "items": reports,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@api_router.patch("/reports/{report_id}")
async def update_report(
    request: Request,
    report_id: str,
    update_data: ReportUpdate,
    admin: dict = Depends(require_permission(Permission.MANAGE_REPORTS))
):
    """Update report status"""
    report = await db.reports.find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    updates = {
        "status": update_data.status.value,
        "resolved_by": admin["id"],
        "resolved_at": datetime.now(timezone.utc)
    }
    
    if update_data.resolution_notes:
        updates["resolution_notes"] = sanitize_input(update_data.resolution_notes)
    if update_data.assigned_to:
        updates["assigned_to"] = update_data.assigned_to
    
    await db.reports.update_one({"id": report_id}, {"$set": updates})
    await log_audit(admin["id"], admin["email"], AuditAction.RESOLVE_REPORT, "report", report_id, updates, request)
    
    return await db.reports.find_one({"id": report_id}, {"_id": 0})

# =============================================================================
# TICKETS MANAGEMENT ENDPOINTS
# =============================================================================

@api_router.get("/tickets")
async def list_tickets(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to: Optional[str] = None,
    admin: dict = Depends(require_permission(Permission.VIEW_TICKETS))
):
    """List all support tickets from both admin-created and user-submitted"""
    query = {}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if assigned_to:
        query["assigned_to"] = assigned_to
    
    skip = (page - 1) * limit
    
    # Get tickets from both collections
    admin_tickets_count = await db.admin_tickets.count_documents(query)
    user_tickets_count = await db.support_tickets.count_documents(query)
    total = admin_tickets_count + user_tickets_count
    
    # Fetch from admin_tickets collection
    admin_tickets = await db.admin_tickets.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Fetch from user-submitted support_tickets collection
    user_tickets_raw = await db.support_tickets.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Normalize user tickets to match admin ticket structure
    user_tickets = []
    for ticket in user_tickets_raw:
        # Fetch user info for display
        user_info = await db.users.find_one({"user_id": ticket.get("user_id")}, {"name": 1, "email": 1, "_id": 0})
        normalized = {
            "id": ticket.get("id"),
            "user_id": ticket.get("user_id"),
            "user_email": user_info.get("email") if user_info else ticket.get("email"),
            "user_name": user_info.get("name") if user_info else "Unknown User",
            "subject": ticket.get("subject"),
            "description": ticket.get("message", ticket.get("description", "")),
            "priority": ticket.get("priority", "medium"),
            "category": ticket.get("category", "general"),
            "status": ticket.get("status", "open"),
            "created_by": "user",
            "assigned_to": ticket.get("assigned_to"),
            "responses": ticket.get("responses", []),
            "created_at": ticket.get("created_at"),
            "updated_at": ticket.get("updated_at", ticket.get("created_at")),
            "source": "user_submitted"
        }
        user_tickets.append(normalized)
    
    # Mark admin tickets with source
    for ticket in admin_tickets:
        ticket["source"] = "admin_created"
    
    # Merge and sort by created_at
    all_tickets = admin_tickets + user_tickets
    all_tickets.sort(key=lambda x: x.get("created_at") or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    
    # Apply pagination
    paginated_tickets = all_tickets[skip:skip + limit]
    
    return {
        "items": paginated_tickets,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@api_router.post("/tickets")
async def create_ticket(
    request: Request,
    ticket_data: TicketCreate,
    admin: dict = Depends(require_permission(Permission.MANAGE_TICKETS))
):
    """Create support ticket"""
    ticket_id = f"ticket_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    new_ticket = {
        "id": ticket_id,
        "user_id": ticket_data.user_id,
        "subject": sanitize_input(ticket_data.subject),
        "description": sanitize_input(ticket_data.description),
        "priority": ticket_data.priority.value,
        "category": ticket_data.category,
        "status": "open",
        "created_by": admin["id"],
        "assigned_to": None,
        "responses": [],
        "created_at": now,
        "updated_at": now
    }
    
    await db.admin_tickets.insert_one(new_ticket)
    await log_audit(admin["id"], admin["email"], AuditAction.CREATE, "ticket", ticket_id, {"subject": ticket_data.subject}, request)
    
    return new_ticket

@api_router.patch("/tickets/{ticket_id}")
async def update_ticket(
    request: Request,
    ticket_id: str,
    update_data: TicketUpdate,
    admin: dict = Depends(require_permission(Permission.MANAGE_TICKETS))
):
    """Update ticket - checks both admin_tickets and support_tickets collections"""
    # Try admin_tickets first
    ticket = await db.admin_tickets.find_one({"id": ticket_id})
    collection = db.admin_tickets
    
    # If not found, try support_tickets (user-submitted)
    if not ticket:
        ticket = await db.support_tickets.find_one({"id": ticket_id})
        collection = db.support_tickets
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    updates = {"updated_at": datetime.now(timezone.utc)}
    
    if update_data.status:
        updates["status"] = update_data.status
    if update_data.priority:
        updates["priority"] = update_data.priority.value
    if update_data.assigned_to:
        updates["assigned_to"] = update_data.assigned_to
    if update_data.resolution_notes:
        updates["resolution_notes"] = sanitize_input(update_data.resolution_notes)
    
    await collection.update_one({"id": ticket_id}, {"$set": updates})
    await log_audit(admin["id"], admin["email"], AuditAction.UPDATE, "ticket", ticket_id, updates, request)
    
    return await collection.find_one({"id": ticket_id}, {"_id": 0})

@api_router.post("/tickets/{ticket_id}/respond")
async def respond_to_ticket(
    request: Request,
    ticket_id: str,
    response_data: TicketResponse,
    admin: dict = Depends(require_permission(Permission.MANAGE_TICKETS))
):
    """Add response to ticket - checks both admin_tickets and support_tickets collections"""
    # Try admin_tickets first
    ticket = await db.admin_tickets.find_one({"id": ticket_id})
    collection = db.admin_tickets
    
    # If not found, try support_tickets (user-submitted)
    if not ticket:
        ticket = await db.support_tickets.find_one({"id": ticket_id})
        collection = db.support_tickets
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    response = {
        "id": str(uuid.uuid4()),
        "admin_id": admin["id"],
        "admin_name": admin["name"],
        "message": sanitize_input(response_data.message),
        "is_internal": response_data.is_internal,
        "created_at": datetime.now(timezone.utc)
    }
    
    # Update the ticket in the correct collection
    await collection.update_one(
        {"id": ticket_id},
        {
            "$push": {"responses": response},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    
    # Send notification to user about ticket reply
    if ticket.get("user_id"):
        notification = {
            "id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": ticket["user_id"],
            "type": "support_ticket_reply",
            "title": "Support Ticket Update",
            "body": f"You have a new response on your ticket: {ticket.get('subject', 'Support Request')}",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "meta": {
                "ticket_id": ticket_id,
                "action": "view_tickets"
            },
            "data_payload": {
                "screen": "/help",
                "tab": "tickets",
                "ticket_id": ticket_id
            }
        }
        await db.notifications.insert_one(notification)
        
        # Also send push notification
        try:
            from push_service import send_push_notification, get_user_tokens
            tokens_data = await get_user_tokens(db, [ticket["user_id"]])
            if tokens_data.get("expo_tokens"):
                await send_push_notification(
                    title="Support Ticket Update",
                    body=f"New response on: {ticket.get('subject', 'Support Request')}",
                    expo_tokens=tokens_data["expo_tokens"],
                    data={"screen": "/help", "tab": "tickets", "ticket_id": ticket_id}
                )
        except Exception as e:
            logger.error(f"Failed to send ticket notification: {e}")
    
    await log_audit(admin["id"], admin["email"], AuditAction.UPDATE, "ticket", ticket_id, {"response_added": True}, request)
    return response

# =============================================================================
# ANALYTICS ENDPOINTS
# =============================================================================

@api_router.get("/analytics/overview")
async def get_analytics_overview(
    admin: dict = Depends(require_permission(Permission.VIEW_ANALYTICS))
):
    """Get dashboard overview analytics"""
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    seven_days_ago = now - timedelta(days=7)
    
    # User stats
    total_users = await db.users.count_documents({})
    new_users_30d = await db.users.count_documents({"created_at": {"$gte": thirty_days_ago}})
    new_users_7d = await db.users.count_documents({"created_at": {"$gte": seven_days_ago}})
    
    # Listing stats
    total_listings = await db.listings.count_documents({})
    active_listings = await db.listings.count_documents({"status": "active"})
    pending_listings = await db.listings.count_documents({"status": "pending"})
    new_listings_7d = await db.listings.count_documents({"created_at": {"$gte": seven_days_ago}})
    
    # Report stats
    pending_reports = await db.reports.count_documents({"status": "pending"})
    
    # Ticket stats
    open_tickets = await db.admin_tickets.count_documents({"status": "open"})
    
    return {
        "users": {
            "total": total_users,
            "new_30d": new_users_30d,
            "new_7d": new_users_7d
        },
        "listings": {
            "total": total_listings,
            "active": active_listings,
            "pending": pending_listings,
            "new_7d": new_listings_7d
        },
        "reports": {
            "pending": pending_reports
        },
        "tickets": {
            "open": open_tickets
        },
        "generated_at": now
    }

@api_router.get("/analytics/listings-by-category")
async def get_listings_by_category(
    admin: dict = Depends(require_permission(Permission.VIEW_ANALYTICS))
):
    """Get listings count by category"""
    pipeline = [
        {"$group": {"_id": "$category_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    results = await db.listings.aggregate(pipeline).to_list(100)
    
    # Get category names from admin_categories first
    category_ids = [r["_id"] for r in results if r["_id"]]
    admin_categories = {c["id"]: c["name"] for c in await db.admin_categories.find({"id": {"$in": category_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(100)}
    
    # Also check the original categories collection for backward compatibility
    original_categories = {c["id"]: c["name"] for c in await db.categories.find({"id": {"$in": category_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(100)}
    
    # Fallback mapping for hardcoded categories (used by main marketplace)
    hardcoded_categories = {
        "auto_vehicles": "Auto & Vehicles",
        "properties": "Properties",
        "electronics": "Electronics",
        "phones_tablets": "Phones & Tablets",
        "home_furniture": "Home & Furniture",
        "fashion_beauty": "Fashion & Beauty",
        "jobs_services": "Jobs & Services",
        "pets": "Pets",
        "sports_hobbies": "Sports & Hobbies",
        "kids_baby": "Kids & Baby",
        "health_beauty": "Health & Beauty",
        "agriculture_food": "Agriculture & Food",
        "other": "Other",
    }
    
    # Merge categories (admin_categories take precedence, then original, then hardcoded)
    all_categories = {**hardcoded_categories, **original_categories, **admin_categories}
    
    return [
        {"category_id": r["_id"], "category_name": all_categories.get(r["_id"], "Unknown"), "count": r["count"]}
        for r in results
    ]

@api_router.get("/analytics/users-growth")
async def get_users_growth(
    days: int = Query(30, ge=1, le=365),
    admin: dict = Depends(require_permission(Permission.VIEW_ANALYTICS))
):
    """Get user growth over time"""
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date}}},
        {
            "$group": {
                "_id": {
                    "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}
                },
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    results = await db.users.aggregate(pipeline).to_list(days)
    return [{"date": r["_id"], "count": r["count"]} for r in results]

# =============================================================================
# AUDIT LOGS ENDPOINTS
# =============================================================================

@api_router.get("/audit-logs")
async def list_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    admin_id: Optional[str] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_admin: dict = Depends(require_permission(Permission.VIEW_AUDIT_LOGS))
):
    """List audit logs"""
    query = {}
    
    if admin_id:
        query["admin_id"] = admin_id
    if action:
        query["action"] = action
    if entity_type:
        query["entity_type"] = entity_type
    if start_date:
        query["timestamp"] = {"$gte": datetime.fromisoformat(start_date)}
    if end_date:
        if "timestamp" in query:
            query["timestamp"]["$lte"] = datetime.fromisoformat(end_date)
        else:
            query["timestamp"] = {"$lte": datetime.fromisoformat(end_date)}
    
    skip = (page - 1) * limit
    total = await db.admin_audit_logs.count_documents(query)
    logs = await db.admin_audit_logs.find(query, {"_id": 0}).skip(skip).limit(limit).sort("timestamp", -1).to_list(limit)
    
    return {
        "items": logs,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

# =============================================================================
# SETTINGS ENDPOINTS
# =============================================================================

@api_router.get("/settings")
async def get_settings(
    admin: dict = Depends(require_permission(Permission.VIEW_SETTINGS))
):
    """Get app settings"""
    settings = await db.admin_settings.find_one({"id": "global"}, {"_id": 0})
    if not settings:
        # Return default settings
        return {
            "id": "global",
            "currencies": ["EUR", "USD", "GBP"],
            "countries": [],
            "languages": [{"code": "en", "name": "English"}],
            "feature_flags": {
                "payments_enabled": False,
                "delivery_enabled": False,
                "offers_enabled": True,
                "whatsapp_enabled": True
            }
        }
    return settings

@api_router.patch("/settings")
async def update_settings(
    request: Request,
    settings: Dict[str, Any] = Body(...),
    admin: dict = Depends(require_permission(Permission.MANAGE_SETTINGS))
):
    """Update app settings"""
    settings["updated_at"] = datetime.now(timezone.utc)
    settings["updated_by"] = admin["id"]
    
    await db.admin_settings.update_one(
        {"id": "global"},
        {"$set": settings},
        upsert=True
    )
    
    await log_audit(admin["id"], admin["email"], AuditAction.UPDATE, "settings", "global", settings, request)
    return await db.admin_settings.find_one({"id": "global"}, {"_id": 0})

# =============================================================================
# INITIALIZATION & SEED DATA
# =============================================================================

@api_router.post("/init/seed")
async def seed_initial_data(secret: str = Query(...)):
    """Seed initial admin user and data (one-time setup)"""
    if secret != "ADMIN_SETUP_SECRET_2024":
        raise HTTPException(status_code=403, detail="Invalid setup secret")
    
    # Check if already seeded
    existing_admin = await db.admin_users.find_one({})
    if existing_admin:
        raise HTTPException(status_code=400, detail="Database already seeded")
    
    # Create super admin
    admin_id = f"admin_{uuid.uuid4().hex[:12]}"
    super_admin = {
        "id": admin_id,
        "email": "admin@marketplace.com",
        "name": "Super Admin",
        "password_hash": hash_password("Admin@123456"),
        "role": AdminRole.SUPER_ADMIN.value,
        "is_active": True,
        "two_factor_enabled": False,
        "totp_secret": None,
        "created_at": datetime.now(timezone.utc),
        "last_login": None
    }
    await db.admin_users.insert_one(super_admin)
    
    # Create sample categories
    categories = [
        {"id": "cat_auto", "name": "Auto & Vehicles", "slug": "auto-vehicles", "icon": "car", "color": "#1976D2", "order": 1},
        {"id": "cat_electronics", "name": "Electronics", "slug": "electronics", "icon": "laptop", "color": "#7B1FA2", "order": 2},
        {"id": "cat_fashion", "name": "Fashion & Beauty", "slug": "fashion-beauty", "icon": "shirt", "color": "#E91E63", "order": 3},
        {"id": "cat_home", "name": "Home & Furniture", "slug": "home-furniture", "icon": "home", "color": "#FF9800", "order": 4},
        {"id": "cat_properties", "name": "Properties", "slug": "properties", "icon": "building", "color": "#4CAF50", "order": 5},
        {"id": "cat_jobs", "name": "Jobs & Services", "slug": "jobs-services", "icon": "briefcase", "color": "#00BCD4", "order": 6},
        {"id": "cat_phones", "name": "Phones & Tablets", "slug": "phones-tablets", "icon": "smartphone", "color": "#9C27B0", "order": 7},
        {"id": "cat_sports", "name": "Sports & Hobbies", "slug": "sports-hobbies", "icon": "football", "color": "#FF5722", "order": 8},
    ]
    
    now = datetime.now(timezone.utc)
    for cat in categories:
        cat.update({
            "parent_id": None,
            "description": f"Browse {cat['name']} listings",
            "is_visible": True,
            "seo_title": cat["name"],
            "seo_description": f"Find the best {cat['name']} on our marketplace",
            "attributes": [],
            "created_at": now,
            "updated_at": now
        })
    
    await db.admin_categories.insert_many(categories)
    
    # Create subcategories for Auto & Vehicles
    auto_subs = [
        {"id": "cat_auto_cars", "name": "Cars", "slug": "cars", "parent_id": "cat_auto", "order": 1},
        {"id": "cat_auto_motorcycles", "name": "Motorcycles", "slug": "motorcycles", "parent_id": "cat_auto", "order": 2},
        {"id": "cat_auto_trucks", "name": "Trucks & Commercial", "slug": "trucks", "parent_id": "cat_auto", "order": 3},
        {"id": "cat_auto_parts", "name": "Parts & Accessories", "slug": "auto-parts", "parent_id": "cat_auto", "order": 4},
    ]
    
    for sub in auto_subs:
        sub.update({
            "icon": None,
            "color": None,
            "description": None,
            "is_visible": True,
            "seo_title": sub["name"],
            "seo_description": None,
            "attributes": [],
            "created_at": now,
            "updated_at": now
        })
    
    await db.admin_categories.insert_many(auto_subs)
    
    # Add attributes to Cars category
    car_attributes = [
        {"id": "attr_make", "name": "Make", "key": "make", "type": "dropdown", "required": True, "options": ["BMW", "Mercedes", "Audi", "Toyota", "Honda", "Ford", "Volkswagen", "Other"], "order": 1},
        {"id": "attr_model", "name": "Model", "key": "model", "type": "text", "required": True, "order": 2},
        {"id": "attr_year", "name": "Year", "key": "year", "type": "year", "required": True, "validation": {"min": 1990, "max": 2026}, "order": 3},
        {"id": "attr_mileage", "name": "Mileage (km)", "key": "mileage", "type": "number", "required": True, "validation": {"min": 0, "step": 1000}, "order": 4},
        {"id": "attr_fuel", "name": "Fuel Type", "key": "fuel_type", "type": "dropdown", "required": True, "options": ["Petrol", "Diesel", "Electric", "Hybrid", "Other"], "order": 5},
        {"id": "attr_transmission", "name": "Transmission", "key": "transmission", "type": "dropdown", "required": True, "options": ["Manual", "Automatic", "Semi-Automatic"], "order": 6},
        {"id": "attr_color", "name": "Color", "key": "color", "type": "dropdown", "options": ["Black", "White", "Silver", "Blue", "Red", "Grey", "Other"], "order": 7},
    ]
    
    await db.admin_categories.update_one(
        {"id": "cat_auto_cars"},
        {"$set": {"attributes": car_attributes}}
    )
    
    # Create global settings
    settings = {
        "id": "global",
        "currencies": ["EUR", "USD", "GBP", "NGN"],
        "countries": [
            {"code": "DE", "name": "Germany"},
            {"code": "FR", "name": "France"},
            {"code": "GB", "name": "United Kingdom"},
            {"code": "NG", "name": "Nigeria"}
        ],
        "languages": [
            {"code": "en", "name": "English"},
            {"code": "de", "name": "German"},
            {"code": "fr", "name": "French"}
        ],
        "feature_flags": {
            "payments_enabled": False,
            "delivery_enabled": False,
            "offers_enabled": True,
            "whatsapp_enabled": True,
            "chat_enabled": True
        },
        "created_at": now,
        "updated_at": now
    }
    await db.admin_settings.insert_one(settings)
    
    # Create indexes
    await db.admin_users.create_index("email", unique=True)
    await db.admin_categories.create_index("slug", unique=True)
    await db.admin_audit_logs.create_index([("timestamp", -1)])
    await db.admin_audit_logs.create_index("admin_id")
    
    return {
        "message": "Database seeded successfully",
        "admin_email": "admin@marketplace.com",
        "admin_password": "Admin@123456",
        "categories_created": len(categories) + len(auto_subs)
    }

# =============================================================================
# HEALTH CHECK
# =============================================================================

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        await client.admin.command('ping')
        return {"status": "healthy", "database": "connected", "timestamp": datetime.now(timezone.utc)}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

# Root redirect
@app.get("/")
async def root():
    return {"message": "Admin Dashboard API", "docs": "/docs"}

# =============================================================================
# ADS MANAGEMENT ENDPOINTS
# =============================================================================

class AdPlacementCreate(BaseModel):
    name: str
    platform: str = Field(..., pattern="^(admob|adsense|custom)$")
    ad_type: str = Field(..., pattern="^(banner|interstitial|native|rewarded)$")
    placement_id: str
    location: str
    is_active: bool = True

class AdPlacementUpdate(BaseModel):
    name: Optional[str] = None
    platform: Optional[str] = None
    ad_type: Optional[str] = None
    placement_id: Optional[str] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None

@api_router.get("/ads")
async def list_ad_placements(
    admin: dict = Depends(require_permission(Permission.VIEW_SETTINGS))
):
    """List all ad placements"""
    ads = await db.ad_placements.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return ads

@api_router.post("/ads")
async def create_ad_placement(
    ad_data: AdPlacementCreate,
    request: Request,
    admin: dict = Depends(require_permission(Permission.MANAGE_SETTINGS))
):
    """Create a new ad placement"""
    ad_id = f"ad_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    new_ad = {
        "id": ad_id,
        **ad_data.model_dump(),
        "impressions": 0,
        "clicks": 0,
        "created_at": now,
        "updated_at": now,
    }
    
    await db.ad_placements.insert_one(new_ad)
    await log_audit(admin["id"], admin["email"], AuditAction.CREATE, "ad_placement", ad_id, {"name": ad_data.name}, request)
    
    new_ad.pop("_id", None)
    return new_ad

@api_router.get("/ads/{ad_id}")
async def get_ad_placement(
    ad_id: str,
    admin: dict = Depends(require_permission(Permission.VIEW_SETTINGS))
):
    """Get a specific ad placement"""
    ad = await db.ad_placements.find_one({"id": ad_id}, {"_id": 0})
    if not ad:
        raise HTTPException(status_code=404, detail="Ad placement not found")
    return ad

@api_router.patch("/ads/{ad_id}")
async def update_ad_placement(
    ad_id: str,
    ad_data: AdPlacementUpdate,
    request: Request,
    admin: dict = Depends(require_permission(Permission.MANAGE_SETTINGS))
):
    """Update an ad placement"""
    existing = await db.ad_placements.find_one({"id": ad_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Ad placement not found")
    
    update_data = {k: v for k, v in ad_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.ad_placements.update_one({"id": ad_id}, {"$set": update_data})
    await log_audit(admin["id"], admin["email"], AuditAction.UPDATE, "ad_placement", ad_id, update_data, request)
    
    updated = await db.ad_placements.find_one({"id": ad_id}, {"_id": 0})
    return updated

@api_router.delete("/ads/{ad_id}")
async def delete_ad_placement(
    ad_id: str,
    request: Request,
    admin: dict = Depends(require_permission(Permission.MANAGE_SETTINGS))
):
    """Delete an ad placement"""
    existing = await db.ad_placements.find_one({"id": ad_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Ad placement not found")
    
    await db.ad_placements.delete_one({"id": ad_id})
    await log_audit(admin["id"], admin["email"], AuditAction.DELETE, "ad_placement", ad_id, {"name": existing.get("name")}, request)
    
    return {"message": "Ad placement deleted successfully"}

@api_router.post("/ads/{ad_id}/track")
async def track_ad_event(
    ad_id: str,
    event_type: str = Query(..., pattern="^(impression|click)$")
):
    """Track ad impression or click (public endpoint for client apps)"""
    existing = await db.ad_placements.find_one({"id": ad_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Ad placement not found")
    
    field = "impressions" if event_type == "impression" else "clicks"
    await db.ad_placements.update_one({"id": ad_id}, {"$inc": {field: 1}})
    
    return {"message": f"{event_type} tracked"}

# =============================================================================
# NOTIFICATIONS ENDPOINTS
# =============================================================================

class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str = Field(..., pattern="^(broadcast|targeted|scheduled|recurring)$")
    target_type: str = Field(default="all", pattern="^(all|users|segments)$")
    target_ids: Optional[List[str]] = None
    scheduled_at: Optional[str] = None
    # Recurring schedule fields
    recurring_enabled: bool = False
    recurring_frequency: Optional[str] = None  # daily, weekly, monthly
    recurring_time: Optional[str] = None  # HH:MM format
    recurring_day_of_week: Optional[int] = None  # 0-6 (Monday-Sunday)
    recurring_day_of_month: Optional[int] = None  # 1-31
    recurring_end_date: Optional[str] = None
    # Targeting filters
    target_filters: Optional[dict] = None  # location, activity_status, user_type, etc.
    # A/B Testing
    ab_test_enabled: bool = False
    ab_variant_b_title: Optional[str] = None
    ab_variant_b_message: Optional[str] = None
    ab_split_percentage: int = 50  # Percentage for variant A

class NotificationUpdate(BaseModel):
    title: Optional[str] = None
    message: Optional[str] = None
    type: Optional[str] = None
    target_type: Optional[str] = None
    target_ids: Optional[List[str]] = None
    scheduled_at: Optional[str] = None
    recurring_enabled: Optional[bool] = None
    recurring_frequency: Optional[str] = None
    recurring_time: Optional[str] = None
    recurring_day_of_week: Optional[int] = None
    recurring_day_of_month: Optional[int] = None
    recurring_end_date: Optional[str] = None
    target_filters: Optional[dict] = None
    ab_test_enabled: Optional[bool] = None
    ab_variant_b_title: Optional[str] = None
    ab_variant_b_message: Optional[str] = None
    ab_split_percentage: Optional[int] = None

# Custom Template Models
class CustomTemplateCreate(BaseModel):
    name: str
    category: str
    title: str
    message: str
    icon: str = "📝"
    recommended_type: str = "broadcast"
    variables: Optional[List[str]] = None  # e.g., ["user_name", "listing_title"]

class CustomTemplateUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    title: Optional[str] = None
    message: Optional[str] = None
    icon: Optional[str] = None
    recommended_type: Optional[str] = None
    variables: Optional[List[str]] = None

# Predefined notification templates
NOTIFICATION_TEMPLATES = [
    {
        "id": "welcome",
        "name": "Welcome Message",
        "category": "onboarding",
        "title": "Welcome to Avida Marketplace!",
        "message": "Thank you for joining our community! Start exploring thousands of listings or create your first listing today. Happy buying and selling!",
        "icon": "👋",
        "recommended_type": "targeted"
    },
    {
        "id": "listing_featured",
        "name": "Listing Featured",
        "category": "promotion",
        "title": "Your Listing is Now Featured!",
        "message": "Great news! Your listing has been selected as a featured item. It will now appear at the top of search results and get more visibility.",
        "icon": "⭐",
        "recommended_type": "targeted"
    },
    {
        "id": "sale_alert",
        "name": "Sale Alert",
        "category": "promotion",
        "title": "Flash Sale - Limited Time Offers!",
        "message": "Don't miss out! Amazing deals are happening right now on the marketplace. Check out the latest offers before they're gone!",
        "icon": "🔥",
        "recommended_type": "broadcast"
    },
    {
        "id": "price_drop",
        "name": "Price Drop",
        "category": "engagement",
        "title": "Price Drop on Items You Saved!",
        "message": "Good news! Some items in your saved list have dropped in price. Check them out now and grab these deals!",
        "icon": "💰",
        "recommended_type": "targeted"
    },
    {
        "id": "new_message",
        "name": "New Message",
        "category": "engagement",
        "title": "You Have a New Message!",
        "message": "Someone is interested in your listing! Check your messages to respond and close the deal.",
        "icon": "💬",
        "recommended_type": "targeted"
    },
    {
        "id": "listing_sold",
        "name": "Listing Sold",
        "category": "transaction",
        "title": "Congratulations! Your Item Sold!",
        "message": "Your listing has been marked as sold. Thank you for using Avida Marketplace! Ready to list more items?",
        "icon": "🎉",
        "recommended_type": "targeted"
    },
    {
        "id": "account_verified",
        "name": "Account Verified",
        "category": "account",
        "title": "Your Account is Now Verified!",
        "message": "Your account has been successfully verified. You now have access to all features and your listings will be trusted by buyers.",
        "icon": "✅",
        "recommended_type": "targeted"
    },
    {
        "id": "weekly_digest",
        "name": "Weekly Digest",
        "category": "engagement",
        "title": "Your Weekly Marketplace Update",
        "message": "Here's what happened this week: new listings in your favorite categories, trending items, and exclusive deals just for you!",
        "icon": "📊",
        "recommended_type": "broadcast"
    },
    {
        "id": "inactive_reminder",
        "name": "Inactive Reminder",
        "category": "re-engagement",
        "title": "We Miss You!",
        "message": "It's been a while since your last visit. Come back and see what's new - there are fresh listings waiting for you!",
        "icon": "👀",
        "recommended_type": "targeted"
    },
    {
        "id": "listing_expiring",
        "name": "Listing Expiring Soon",
        "category": "reminder",
        "title": "Your Listing is About to Expire",
        "message": "Your listing will expire soon. Renew it now to keep it visible to potential buyers and increase your chances of selling!",
        "icon": "⏰",
        "recommended_type": "targeted"
    },
    {
        "id": "system_maintenance",
        "name": "System Maintenance",
        "category": "system",
        "title": "Scheduled Maintenance Notice",
        "message": "We'll be performing scheduled maintenance on [DATE] from [TIME] to [TIME]. The marketplace may be temporarily unavailable during this period.",
        "icon": "🔧",
        "recommended_type": "broadcast"
    },
    {
        "id": "new_feature",
        "name": "New Feature Announcement",
        "category": "announcement",
        "title": "Exciting New Feature!",
        "message": "We've just launched a new feature to make your experience even better! Check it out and let us know what you think.",
        "icon": "🚀",
        "recommended_type": "broadcast"
    }
]

@api_router.get("/notification-templates")
async def list_notification_templates(
    category: Optional[str] = None,
    include_custom: bool = True,
    admin: dict = Depends(require_permission(Permission.VIEW_REPORTS))
):
    """List all notification templates (predefined + custom)"""
    all_templates = list(NOTIFICATION_TEMPLATES)
    
    # Get custom templates from database
    if include_custom:
        custom_templates = await db.custom_notification_templates.find(
            {"is_active": True}, {"_id": 0}
        ).to_list(100)
        all_templates.extend(custom_templates)
    
    # Filter by category if specified
    if category:
        all_templates = [t for t in all_templates if t.get("category") == category]
    
    # Group by category
    categories = {}
    for template in all_templates:
        cat = template.get("category", "custom")
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(template)
    
    return {
        "templates": all_templates,
        "categories": list(categories.keys()),
        "by_category": categories
    }

@api_router.get("/notification-templates/{template_id}")
async def get_notification_template(
    template_id: str,
    admin: dict = Depends(require_permission(Permission.VIEW_REPORTS))
):
    """Get a specific notification template"""
    # Check predefined templates first
    template = next((t for t in NOTIFICATION_TEMPLATES if t["id"] == template_id), None)
    if template:
        return template
    
    # Check custom templates
    custom_template = await db.custom_notification_templates.find_one(
        {"id": template_id}, {"_id": 0}
    )
    if custom_template:
        return custom_template
    
    raise HTTPException(status_code=404, detail="Template not found")

# Custom Template CRUD
@api_router.get("/custom-templates")
async def list_custom_templates(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin: dict = Depends(require_permission(Permission.VIEW_REPORTS))
):
    """List custom notification templates"""
    total = await db.custom_notification_templates.count_documents({})
    skip = (page - 1) * limit
    
    templates = await db.custom_notification_templates.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "items": templates,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@api_router.post("/custom-templates")
async def create_custom_template(
    template: CustomTemplateCreate,
    admin: dict = Depends(require_permission(Permission.MANAGE_USERS))
):
    """Create a custom notification template"""
    template_id = f"custom_{uuid.uuid4().hex[:8]}"
    
    new_template = {
        "id": template_id,
        "name": template.name,
        "category": template.category,
        "title": template.title,
        "message": template.message,
        "icon": template.icon,
        "recommended_type": template.recommended_type,
        "variables": template.variables or [],
        "is_custom": True,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin["email"],
        "usage_count": 0
    }
    
    await db.custom_notification_templates.insert_one(new_template)
    
    # Log audit
    await log_audit(admin["email"], "create", "custom_template", template_id)
    
    return {k: v for k, v in new_template.items() if k != "_id"}

@api_router.put("/custom-templates/{template_id}")
async def update_custom_template(
    template_id: str,
    template: CustomTemplateUpdate,
    admin: dict = Depends(require_permission(Permission.MANAGE_USERS))
):
    """Update a custom notification template"""
    existing = await db.custom_notification_templates.find_one({"id": template_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Custom template not found")
    
    update_data = {k: v for k, v in template.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = admin["email"]
    
    await db.custom_notification_templates.update_one(
        {"id": template_id},
        {"$set": update_data}
    )
    
    await log_audit(admin["email"], "update", "custom_template", template_id)
    
    updated = await db.custom_notification_templates.find_one({"id": template_id}, {"_id": 0})
    return updated

@api_router.delete("/custom-templates/{template_id}")
async def delete_custom_template(
    template_id: str,
    admin: dict = Depends(require_permission(Permission.MANAGE_USERS))
):
    """Delete a custom notification template"""
    result = await db.custom_notification_templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Custom template not found")
    
    await log_audit(admin["email"], "delete", "custom_template", template_id)
    return {"message": "Template deleted"}

# Template Analytics
@api_router.get("/template-analytics")
async def get_template_analytics(
    admin: dict = Depends(require_permission(Permission.VIEW_REPORTS))
):
    """Get template usage analytics"""
    # Get usage stats from notifications
    pipeline = [
        {"$match": {"template_id": {"$exists": True, "$ne": None}}},
        {"$group": {
            "_id": "$template_id",
            "usage_count": {"$sum": 1},
            "sent_count": {"$sum": {"$cond": [{"$eq": ["$status", "sent"]}, 1, 0]}},
            "total_recipients": {"$sum": {"$ifNull": ["$total_recipients", 0]}},
            "total_read": {"$sum": {"$ifNull": ["$read_count", 0]}}
        }},
        {"$sort": {"usage_count": -1}}
    ]
    
    usage_stats = await db.admin_notifications.aggregate(pipeline).to_list(100)
    
    # Get custom template stats
    custom_stats = await db.custom_notification_templates.find(
        {}, {"_id": 0, "id": 1, "name": 1, "usage_count": 1}
    ).sort("usage_count", -1).to_list(20)
    
    # Combine with predefined templates
    all_stats = []
    for stat in usage_stats:
        template_id = stat["_id"]
        # Find template name
        template = next((t for t in NOTIFICATION_TEMPLATES if t["id"] == template_id), None)
        if not template:
            custom = await db.custom_notification_templates.find_one({"id": template_id})
            template = custom
        
        if template:
            all_stats.append({
                "template_id": template_id,
                "template_name": template.get("name", "Unknown"),
                "category": template.get("category", "unknown"),
                "usage_count": stat["usage_count"],
                "sent_count": stat["sent_count"],
                "total_recipients": stat["total_recipients"],
                "total_read": stat["total_read"],
                "read_rate": round(stat["total_read"] / stat["total_recipients"] * 100, 1) if stat["total_recipients"] > 0 else 0
            })
    
    return {
        "template_usage": all_stats,
        "custom_templates": custom_stats,
        "total_templates": len(NOTIFICATION_TEMPLATES) + len(custom_stats)
    }

# User Segments for Targeting
@api_router.get("/user-segments")
async def get_user_segments(
    admin: dict = Depends(require_permission(Permission.VIEW_REPORTS))
):
    """Get available user segments for targeting"""
    # Get user statistics for segments
    total_users = await db.users.count_documents({})
    
    # Get users by activity
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    active_users = await db.users.count_documents({
        "last_login": {"$gte": thirty_days_ago.isoformat()}
    })
    
    # Get users by type (sellers vs buyers)
    sellers = await db.users.count_documents({"listings_count": {"$gt": 0}})
    
    # Get users by location (top locations)
    location_pipeline = [
        {"$match": {"location": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": "$location", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    locations = await db.users.aggregate(location_pipeline).to_list(10)
    
    segments = [
        {"id": "all", "name": "All Users", "count": total_users, "type": "static"},
        {"id": "active", "name": "Active Users (30 days)", "count": active_users, "type": "dynamic"},
        {"id": "inactive", "name": "Inactive Users", "count": total_users - active_users, "type": "dynamic"},
        {"id": "sellers", "name": "Sellers (has listings)", "count": sellers, "type": "dynamic"},
        {"id": "buyers", "name": "Buyers Only (no listings)", "count": total_users - sellers, "type": "dynamic"},
        {"id": "new_users", "name": "New Users (last 7 days)", "count": 0, "type": "dynamic"},
    ]
    
    # Add location-based segments
    for loc in locations:
        if loc["_id"]:
            segments.append({
                "id": f"location_{loc['_id'].lower().replace(' ', '_')}",
                "name": f"Users in {loc['_id']}",
                "count": loc["count"],
                "type": "location"
            })
    
    return {"segments": segments, "total_users": total_users}

@api_router.get("/notifications")
async def list_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    admin: dict = Depends(require_permission(Permission.VIEW_REPORTS))
):
    """List all notifications"""
    query = {}
    if status:
        query["status"] = status
    
    total = await db.admin_notifications.count_documents(query)
    skip = (page - 1) * limit
    
    notifications = await db.admin_notifications.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "items": notifications,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@api_router.post("/notifications")
async def create_notification(
    notif_data: NotificationCreate,
    request: Request,
    admin: dict = Depends(require_permission(Permission.MANAGE_SETTINGS))
):
    """Create a new notification with recurring, targeting, and A/B testing support"""
    notif_id = f"notif_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    # Determine initial status
    status = "draft"
    if notif_data.type == "scheduled" and notif_data.scheduled_at:
        status = "scheduled"
    elif notif_data.type == "recurring" and notif_data.recurring_enabled:
        status = "recurring_active"
    
    # Get total recipients count based on targeting
    total_recipients = await db.users.count_documents({})
    if notif_data.target_type == "users" and notif_data.target_ids:
        total_recipients = len(notif_data.target_ids)
    elif notif_data.target_type == "segments" and notif_data.target_filters:
        # Apply filters to get recipient count
        filter_query = build_target_filter_query(notif_data.target_filters)
        total_recipients = await db.users.count_documents(filter_query)
    
    # Calculate next run time for recurring notifications
    next_run_at = None
    if notif_data.recurring_enabled and notif_data.recurring_frequency:
        next_run_at = calculate_next_run_time(
            notif_data.recurring_frequency,
            notif_data.recurring_time,
            notif_data.recurring_day_of_week,
            notif_data.recurring_day_of_month
        )
    
    new_notification = {
        "id": notif_id,
        **notif_data.model_dump(),
        "status": status,
        "sent_at": None,
        "read_count": 0,
        "total_recipients": total_recipients,
        "created_by": admin["id"],
        "created_at": now,
        "updated_at": now,
        "next_run_at": next_run_at,
        "run_count": 0,
        # A/B Testing fields
        "ab_results": {
            "variant_a_sent": 0,
            "variant_a_read": 0,
            "variant_b_sent": 0,
            "variant_b_read": 0
        } if notif_data.ab_test_enabled else None
    }
    
    await db.admin_notifications.insert_one(new_notification)
    await log_audit(admin["id"], admin["email"], AuditAction.CREATE, "notification", notif_id, {"title": notif_data.title}, request)
    
    new_notification.pop("_id", None)
    return new_notification

def build_target_filter_query(filters: dict) -> dict:
    """Build MongoDB query from target filters"""
    query = {}
    
    if filters.get("segment_id"):
        segment = filters["segment_id"]
        if segment == "active":
            thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
            query["last_login"] = {"$gte": thirty_days_ago}
        elif segment == "inactive":
            thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
            query["last_login"] = {"$lt": thirty_days_ago}
        elif segment == "sellers":
            query["listings_count"] = {"$gt": 0}
        elif segment == "buyers":
            query["listings_count"] = {"$eq": 0}
        elif segment.startswith("location_"):
            location = segment.replace("location_", "").replace("_", " ").title()
            query["location"] = location
    
    if filters.get("locations"):
        query["location"] = {"$in": filters["locations"]}
    
    if filters.get("min_listings"):
        query["listings_count"] = {"$gte": filters["min_listings"]}
    
    if filters.get("registered_after"):
        query["created_at"] = {"$gte": filters["registered_after"]}
    
    return query

def calculate_next_run_time(frequency: str, time_str: str, day_of_week: int = None, day_of_month: int = None) -> str:
    """Calculate the next run time for a recurring notification"""
    now = datetime.now(timezone.utc)
    
    # Parse time (HH:MM)
    if time_str:
        hour, minute = map(int, time_str.split(":"))
    else:
        hour, minute = 9, 0  # Default to 9 AM
    
    if frequency == "daily":
        next_run = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if next_run <= now:
            next_run += timedelta(days=1)
    
    elif frequency == "weekly":
        days_ahead = day_of_week - now.weekday() if day_of_week is not None else 0
        if days_ahead <= 0:
            days_ahead += 7
        next_run = now + timedelta(days=days_ahead)
        next_run = next_run.replace(hour=hour, minute=minute, second=0, microsecond=0)
    
    elif frequency == "monthly":
        target_day = day_of_month if day_of_month else 1
        next_run = now.replace(day=min(target_day, 28), hour=hour, minute=minute, second=0, microsecond=0)
        if next_run <= now:
            # Move to next month
            if now.month == 12:
                next_run = next_run.replace(year=now.year + 1, month=1)
            else:
                next_run = next_run.replace(month=now.month + 1)
    else:
        next_run = now + timedelta(days=1)
    
    return next_run.isoformat()

@api_router.get("/notifications/{notif_id}")
async def get_notification(
    notif_id: str,
    admin: dict = Depends(require_permission(Permission.VIEW_REPORTS))
):
    """Get a specific notification"""
    notif = await db.admin_notifications.find_one({"id": notif_id}, {"_id": 0})
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notif

@api_router.patch("/notifications/{notif_id}")
async def update_notification(
    notif_id: str,
    notif_data: NotificationUpdate,
    request: Request,
    admin: dict = Depends(require_permission(Permission.MANAGE_SETTINGS))
):
    """Update a notification"""
    existing = await db.admin_notifications.find_one({"id": notif_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    if existing.get("status") == "sent":
        raise HTTPException(status_code=400, detail="Cannot update a sent notification")
    
    update_data = {k: v for k, v in notif_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.admin_notifications.update_one({"id": notif_id}, {"$set": update_data})
    await log_audit(admin["id"], admin["email"], AuditAction.UPDATE, "notification", notif_id, update_data, request)
    
    updated = await db.admin_notifications.find_one({"id": notif_id}, {"_id": 0})
    return updated

@api_router.post("/notifications/{notif_id}/send")
async def send_notification(
    notif_id: str,
    request: Request,
    admin: dict = Depends(require_permission(Permission.MANAGE_SETTINGS))
):
    """Send a notification immediately via push notification service"""
    from push_service import send_push_notification, get_user_tokens
    
    existing = await db.admin_notifications.find_one({"id": notif_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    if existing.get("status") == "sent":
        raise HTTPException(status_code=400, detail="Notification already sent")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Get target users
    if existing.get("target_type") == "all":
        users = await db.users.find({}, {"user_id": 1}).to_list(10000)
        user_ids = [u["user_id"] for u in users]
        segments = ["All"]
    elif existing.get("target_ids"):
        user_ids = existing["target_ids"]
        users = [{"user_id": uid} for uid in user_ids]
        segments = None
    else:
        users = []
        user_ids = []
        segments = None
    
    # Get push tokens for users (now returns both expo and fcm tokens)
    tokens_data = await get_user_tokens(db, user_ids) if user_ids else {"expo_tokens": [], "fcm_tokens": []}
    
    # Send push notification
    push_result = await send_push_notification(
        title=existing.get("title", ""),
        body=existing.get("message", ""),
        user_ids=user_ids,
        expo_tokens=tokens_data.get("expo_tokens", []),
        fcm_tokens=tokens_data.get("fcm_tokens", []),
        segments=segments,
        data={
            "notification_id": notif_id,
            "type": existing.get("type", "broadcast")
        }
    )
    
    # Update notification status
    await db.admin_notifications.update_one(
        {"id": notif_id},
        {"$set": {
            "status": "sent", 
            "sent_at": now, 
            "updated_at": now,
            "push_result": push_result
        }}
    )
    
    # Create notification records for users (in-app notifications)
    # Insert into both user_notifications (for admin tracking) and notifications (for mobile app)
    if users:
        # Records for admin dashboard tracking
        user_notification_records = [
            {
                "id": f"nr_{uuid.uuid4().hex[:12]}",
                "notification_id": notif_id,
                "user_id": u["user_id"],
                "is_read": False,
                "created_at": now,
            }
            for u in users
        ]
        await db.user_notifications.insert_many(user_notification_records)
        
        # Records for mobile app (this is what the app reads)
        mobile_notification_records = [
            {
                "id": f"notif_{uuid.uuid4().hex[:12]}",
                "user_id": u["user_id"],
                "type": existing.get("type", "system"),
                "title": existing.get("title", ""),
                "body": existing.get("message", ""),
                "read": False,
                "created_at": now,
                "meta": {
                    "admin_notification_id": notif_id,
                    "source": "admin_broadcast"
                },
                "data_payload": {
                    "notification_id": notif_id,
                    "type": existing.get("type", "broadcast"),
                    "cta_route": existing.get("cta_route"),
                    "cta_label": existing.get("cta_label"),
                }
            }
            for u in users
        ]
        await db.notifications.insert_many(mobile_notification_records)
    
    # Broadcast to connected WebSocket clients
    await broadcast_admin_event("notification_sent", {
        "notification_id": notif_id,
        "recipients": len(users),
        "push_result": push_result
    })
    
    await log_audit(admin["id"], admin["email"], AuditAction.UPDATE, "notification", notif_id, {"action": "send", "recipients": len(users)}, request)
    
    return {
        "message": "Notification sent successfully", 
        "recipients": len(users),
        "push_result": push_result
    }

@api_router.delete("/notifications/{notif_id}")
async def delete_notification(
    notif_id: str,
    request: Request,
    admin: dict = Depends(require_permission(Permission.MANAGE_SETTINGS))
):
    """Delete a notification"""
    existing = await db.admin_notifications.find_one({"id": notif_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    await db.admin_notifications.delete_one({"id": notif_id})
    # Also delete any user notification records
    await db.user_notifications.delete_many({"notification_id": notif_id})
    
    await log_audit(admin["id"], admin["email"], AuditAction.DELETE, "notification", notif_id, {"title": existing.get("title")}, request)
    
    return {"message": "Notification deleted successfully"}

# =============================================================================
# CSV IMPORT ENDPOINTS
# =============================================================================

@api_router.post("/users/import")
async def import_users_csv(
    file: UploadFile = File(...),
    request: Request = None,
    admin: dict = Depends(require_permission(Permission.EDIT_USERS))
):
    """Import users from CSV file"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    import csv
    import io
    
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    imported = 0
    errors = []
    now = datetime.now(timezone.utc).isoformat()
    
    for i, row in enumerate(reader):
        try:
            # Validate required fields
            email = row.get('email', '').strip()
            name = row.get('name', '').strip()
            
            if not email:
                errors.append(f"Row {i+2}: Missing email")
                continue
            
            # Check if user already exists
            existing = await db.users.find_one({"email": email})
            if existing:
                errors.append(f"Row {i+2}: User with email {email} already exists")
                continue
            
            # Create user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            new_user = {
                "user_id": user_id,
                "email": email,
                "name": name or email.split('@')[0],
                "phone": row.get('phone', '').strip() or None,
                "status": "active",
                "created_at": now,
                "updated_at": now,
                "imported": True,
            }
            
            await db.users.insert_one(new_user)
            imported += 1
            
        except Exception as e:
            errors.append(f"Row {i+2}: {str(e)}")
    
    await log_audit(admin["id"], admin["email"], AuditAction.CREATE, "users", "bulk_import", {"imported": imported, "errors": len(errors)}, request)
    
    return {
        "message": f"Import completed",
        "imported": imported,
        "errors": errors[:10],  # Return first 10 errors
        "total_errors": len(errors)
    }

@api_router.post("/categories/import")
async def import_categories_csv(
    file: UploadFile = File(...),
    request: Request = None,
    admin: dict = Depends(require_permission(Permission.MANAGE_CATEGORIES))
):
    """Import categories from CSV file"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    import csv
    import io
    
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    imported = 0
    errors = []
    now = datetime.now(timezone.utc).isoformat()
    
    for i, row in enumerate(reader):
        try:
            name = row.get('name', '').strip()
            
            if not name:
                errors.append(f"Row {i+2}: Missing name")
                continue
            
            cat_id = f"cat_{uuid.uuid4().hex[:8]}"
            slug = name.lower().replace(' ', '-').replace('&', 'and')
            slug = re.sub(r'[^a-z0-9-]', '', slug)
            
            new_category = {
                "id": cat_id,
                "name": name,
                "slug": slug,
                "parent_id": row.get('parent_id', '').strip() or None,
                "order": int(row.get('order', 0)),
                "is_visible": row.get('is_visible', 'true').lower() == 'true',
                "icon": row.get('icon', '').strip() or None,
                "color": row.get('color', '').strip() or None,
                "description": row.get('description', '').strip() or None,
                "attributes": [],
                "created_at": now,
                "updated_at": now,
            }
            
            await db.admin_categories.insert_one(new_category)
            imported += 1
            
        except Exception as e:
            errors.append(f"Row {i+2}: {str(e)}")
    
    await log_audit(admin["id"], admin["email"], AuditAction.CREATE, "categories", "bulk_import", {"imported": imported, "errors": len(errors)}, request)
    
    return {
        "message": f"Import completed",
        "imported": imported,
        "errors": errors[:10],
        "total_errors": len(errors)
    }

# =============================================================================
# WEBSOCKET FOR REAL-TIME NOTIFICATIONS
# =============================================================================

from fastapi import WebSocket, WebSocketDisconnect
from typing import Set

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, admin_id: str):
        await websocket.accept()
        if admin_id not in self.active_connections:
            self.active_connections[admin_id] = set()
        self.active_connections[admin_id].add(websocket)
    
    def disconnect(self, websocket: WebSocket, admin_id: str):
        if admin_id in self.active_connections:
            self.active_connections[admin_id].discard(websocket)
    
    async def send_personal_message(self, message: dict, admin_id: str):
        if admin_id in self.active_connections:
            for connection in self.active_connections[admin_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass
    
    async def broadcast(self, message: dict):
        for admin_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(message)
                except:
                    pass

ws_manager = ConnectionManager()

@app.websocket("/ws/admin/{token}")
async def websocket_admin_endpoint(websocket: WebSocket, token: str):
    """WebSocket endpoint for real-time admin notifications"""
    try:
        # Verify token
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        admin_id = payload.get("sub")
        if not admin_id:
            await websocket.close(code=4001)
            return
        
        await ws_manager.connect(websocket, admin_id)
        
        try:
            while True:
                # Keep connection alive and handle incoming messages
                data = await websocket.receive_json()
                
                # Handle ping/pong
                if data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                
        except WebSocketDisconnect:
            ws_manager.disconnect(websocket, admin_id)
    except JWTError:
        await websocket.close(code=4001)

# Helper function to broadcast events to all connected admins
async def broadcast_admin_event(event_type: str, data: dict):
    """Broadcast an event to all connected admin WebSocket clients"""
    message = {
        "type": event_type,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await ws_manager.broadcast(message)

# =============================================================================
# ESCROW SYSTEM ADMIN ENDPOINTS
# These endpoints provide direct database access for escrow management
# =============================================================================

@api_router.get("/escrow/verified-sellers")
async def get_verified_sellers(admin = Depends(get_current_admin)):
    """Get all verified sellers"""
    sellers = await db.verified_sellers.find({}, {"_id": 0}).to_list(200)
    
    # Enrich with user info
    for seller in sellers:
        user = await db.users.find_one({"user_id": seller.get("seller_id")}, {"_id": 0, "name": 1, "email": 1})
        if user:
            seller["seller_name"] = user.get("name")
            seller["seller_email"] = user.get("email")
    
    return sellers

@api_router.post("/escrow/verify-seller/{seller_id}")
async def verify_seller(
    seller_id: str,
    data: Dict[str, Any] = Body(...),
    admin = Depends(get_current_admin)
):
    """Verify or unverify a seller"""
    is_verified = data.get("is_verified", True)
    online_selling_enabled = data.get("online_selling_enabled", True)
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update user
    await db.users.update_one(
        {"user_id": seller_id},
        {"$set": {
            "is_premium_verified": is_verified,
            "online_selling_enabled": online_selling_enabled,
            "can_sell_online": is_verified and online_selling_enabled,
            "premium_verified_at": now if is_verified else None
        }}
    )
    
    # Update verified_sellers collection
    await db.verified_sellers.update_one(
        {"seller_id": seller_id},
        {"$set": {
            "seller_id": seller_id,
            "is_verified": is_verified,
            "verified_at": now if is_verified else None,
            "verified_by": admin.get("admin_id") or "admin",
            "status": "active" if is_verified else "revoked",
            "updated_at": now
        }},
        upsert=True
    )
    
    return {"status": "success", "seller_id": seller_id, "is_verified": is_verified}

@api_router.get("/escrow/orders")
async def get_all_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = Query(None),
    admin = Depends(get_current_admin)
):
    """Get all orders"""
    query = {}
    if status:
        query["status"] = status
    
    skip = (page - 1) * limit
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.orders.count_documents(query)
    
    # Enrich with user and listing info
    for order in orders:
        buyer = await db.users.find_one({"user_id": order.get("buyer_id")}, {"_id": 0, "name": 1})
        seller = await db.users.find_one({"user_id": order.get("seller_id")}, {"_id": 0, "name": 1})
        listing = await db.listings.find_one({"id": order.get("listing_id")}, {"_id": 0, "title": 1, "price": 1})
        
        order["buyer"] = buyer or {}
        order["seller"] = seller or {}
        order["item"] = {"title": listing.get("title") if listing else "Unknown", "price": listing.get("price", 0) if listing else 0}
    
    return {"orders": orders, "total": total, "page": page, "limit": limit}

@api_router.get("/escrow/disputes")
async def get_all_disputes(admin = Depends(get_current_admin)):
    """Get all disputes"""
    disputes = await db.disputes.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return disputes

@api_router.post("/escrow/disputes/{dispute_id}/resolve")
async def resolve_dispute(
    dispute_id: str,
    data: Dict[str, Any] = Body(...),
    admin = Depends(get_current_admin)
):
    """Resolve a dispute"""
    resolution = data.get("resolution")  # buyer, seller, or split
    resolution_notes = data.get("resolution_notes", "")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update dispute
    await db.disputes.update_one(
        {"id": dispute_id},
        {"$set": {
            "status": "resolved",
            "resolution": resolution,
            "resolution_notes": resolution_notes,
            "resolved_at": now,
            "resolved_by": admin.get("admin_id") or "admin"
        }}
    )
    
    # Get dispute to find order
    dispute = await db.disputes.find_one({"id": dispute_id})
    if dispute:
        order_id = dispute.get("order_id")
        
        # Update order status based on resolution
        if resolution == "buyer":
            await db.orders.update_one({"id": order_id}, {"$set": {"status": "refunded"}})
            await db.escrow.update_one({"order_id": order_id}, {"$set": {"status": "refunded"}})
        elif resolution == "seller":
            await db.orders.update_one({"id": order_id}, {"$set": {"status": "completed"}})
            await db.escrow.update_one({"order_id": order_id}, {"$set": {"status": "released"}})
    
    return {"status": "success", "dispute_id": dispute_id, "resolution": resolution}

@api_router.post("/escrow/orders/{order_id}/release-escrow")
async def manual_release_escrow(
    order_id: str,
    admin = Depends(get_current_admin)
):
    """Manually release escrow for an order"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Update order status
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": "completed", "completed_at": now}}
    )
    
    # Update escrow status
    await db.escrow.update_one(
        {"order_id": order_id},
        {"$set": {"status": "released", "released_at": now, "released_by": "admin_manual"}}
    )
    
    return {"status": "success", "order_id": order_id, "message": "Escrow released"}

@api_router.get("/escrow/config/vat")
async def get_vat_configs_admin():
    """Get VAT configurations"""
    configs = await db.vat_configs.find({}, {"_id": 0}).to_list(50)
    if not configs:
        configs = [
            {"country_code": "US", "country_name": "United States", "vat_percentage": 0, "is_active": True},
            {"country_code": "GB", "country_name": "United Kingdom", "vat_percentage": 20, "is_active": True},
            {"country_code": "DE", "country_name": "Germany", "vat_percentage": 19, "is_active": True},
            {"country_code": "FR", "country_name": "France", "vat_percentage": 20, "is_active": True},
            {"country_code": "KE", "country_name": "Kenya", "vat_percentage": 16, "is_active": True},
            {"country_code": "NG", "country_name": "Nigeria", "vat_percentage": 7.5, "is_active": True},
            {"country_code": "ZA", "country_name": "South Africa", "vat_percentage": 15, "is_active": True},
            {"country_code": "UG", "country_name": "Uganda", "vat_percentage": 18, "is_active": True},
            {"country_code": "TZ", "country_name": "Tanzania", "vat_percentage": 18, "is_active": True},
        ]
    return configs

@api_router.get("/escrow/config/commission")
async def get_commission_configs_admin():
    """Get commission configurations"""
    configs = await db.commission_configs.find({}, {"_id": 0}).to_list(10)
    if not configs:
        configs = [{"id": "default", "percentage": 5, "min_amount": 0, "is_active": True}]
    return configs

@api_router.get("/escrow/config/transport")
async def get_transport_pricing_admin():
    """Get transport pricing"""
    pricing = await db.transport_pricing.find({}, {"_id": 0}).to_list(20)
    if not pricing:
        pricing = [
            {"id": "standard", "base_price": 5.0, "estimated_days_base": 3, "name": "Standard Delivery", "price_per_kg": 0.5, "price_per_km": 0.15},
            {"id": "express", "base_price": 15.0, "estimated_days_base": 1, "name": "Express Delivery", "price_per_kg": 1.0, "price_per_km": 0.30},
        ]
    return pricing


# =============================================================================
# INCLUDE ROUTER (MUST BE AFTER ALL ROUTES ARE DEFINED)
# =============================================================================
app.include_router(api_router)

# =============================================================================
# SELLER ANALYTICS PROXY ENDPOINTS
# These endpoints proxy requests to the main app backend for seller analytics
# =============================================================================

import httpx

MAIN_APP_URL = os.environ.get('MAIN_APP_URL', 'http://localhost:8001/api')

@app.get("/api/admin/seller-analytics/settings")
async def get_seller_analytics_settings(admin = Depends(get_current_admin)):
    """Proxy to get seller analytics settings from main app"""
    try:
        # Call main app directly from backend (bypassing auth since we've verified admin)
        settings = await db.analytics_settings.find_one({"id": "global_analytics_settings"}, {"_id": 0})
        if not settings:
            # Return default settings
            settings = {
                "id": "global_analytics_settings",
                "is_enabled": True,
                "availability": "all",
                "lock_type": "none",
                "visible_metrics": {
                    "views": True, "unique_views": True, "saves": True,
                    "chats": True, "offers": True, "conversion_rate": True,
                    "location_views": True, "boost_impact": True, "ai_insights": True
                },
                "ai_insights_enabled": True
            }
        return settings
    except Exception as e:
        logger.error(f"Error fetching analytics settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch analytics settings")

@app.put("/api/admin/seller-analytics/settings")
async def update_seller_analytics_settings(
    settings: Dict[str, Any] = Body(...),
    admin = Depends(get_current_admin)
):
    """Update seller analytics settings"""
    try:
        settings["updated_at"] = datetime.now(timezone.utc).isoformat()
        settings["id"] = "global_analytics_settings"
        
        await db.analytics_settings.update_one(
            {"id": "global_analytics_settings"},
            {"$set": settings},
            upsert=True
        )
        return {"status": "updated", "settings": settings}
    except Exception as e:
        logger.error(f"Error updating analytics settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to update analytics settings")

@app.get("/api/admin/seller-analytics/engagement-config")
async def get_engagement_notification_config(admin = Depends(get_current_admin)):
    """Get engagement notification configuration"""
    try:
        config = await db.engagement_notification_config.find_one({"_id": "config"})
        if config:
            config.pop("_id", None)
        else:
            config = {
                "enabled": True,
                "views_threshold_multiplier": 2.0,
                "saves_threshold_multiplier": 3.0,
                "chats_threshold_multiplier": 2.0,
                "minimum_views_for_notification": 10,
                "notification_cooldown_hours": 6,
                "check_interval_minutes": 30
            }
        return config
    except Exception as e:
        logger.error(f"Error fetching engagement config: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch engagement config")

@app.put("/api/admin/seller-analytics/engagement-config")
async def update_engagement_notification_config(
    config: Dict[str, Any] = Body(...),
    admin = Depends(get_current_admin)
):
    """Update engagement notification configuration"""
    try:
        await db.engagement_notification_config.update_one(
            {"_id": "config"},
            {"$set": config},
            upsert=True
        )
        return {"status": "updated", "config": config}
    except Exception as e:
        logger.error(f"Error updating engagement config: {e}")
        raise HTTPException(status_code=500, detail="Failed to update engagement config")

@app.post("/api/admin/seller-analytics/trigger-engagement-check")
async def trigger_engagement_check(admin = Depends(get_current_admin)):
    """Trigger manual engagement spike check (note: actual check runs in main app)"""
    return {"status": "completed", "message": "Engagement check will run on next background task cycle"}

@app.get("/api/admin/seller-analytics/platform-analytics")
async def get_platform_analytics(admin = Depends(get_current_admin)):
    """Get platform-wide seller analytics"""
    try:
        now = datetime.now(timezone.utc)
        week_ago = now - timedelta(days=7)
        
        # Get total events
        total_events = await db.analytics_events.count_documents({})
        
        # Get top listings by views
        top_listings_pipeline = [
            {"$match": {"event_type": "view"}},
            {"$group": {"_id": "$listing_id", "views": {"$sum": 1}}},
            {"$sort": {"views": -1}},
            {"$limit": 10}
        ]
        top_listings_raw = await db.analytics_events.aggregate(top_listings_pipeline).to_list(10)
        
        # Enrich with listing details
        top_listings = []
        for item in top_listings_raw:
            listing = await db.listings.find_one({"id": item["_id"]}, {"title": 1, "_id": 0})
            top_listings.append({
                "listing_id": item["_id"],
                "title": listing.get("title", "Unknown") if listing else "Unknown",
                "views": item["views"],
                "conversion_rate": 0.0
            })
        
        # Get top categories
        top_categories_pipeline = [
            {"$match": {"event_type": "view"}},
            {"$lookup": {
                "from": "listings",
                "localField": "listing_id",
                "foreignField": "id",
                "as": "listing"
            }},
            {"$unwind": {"path": "$listing", "preserveNullAndEmptyArrays": True}},
            {"$group": {"_id": "$listing.category_id", "views": {"$sum": 1}}},
            {"$sort": {"views": -1}},
            {"$limit": 5}
        ]
        top_categories = await db.analytics_events.aggregate(top_categories_pipeline).to_list(5)
        
        return {
            "total_events": total_events,
            "top_listings": top_listings,
            "top_categories": [{"category": c["_id"] or "Unknown", "views": c["views"]} for c in top_categories],
            "top_sellers": [],
            "analytics_usage": []
        }
    except Exception as e:
        logger.error(f"Error fetching platform analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch platform analytics")

# =============================================================================
# BOOST SYSTEM ROUTER
# =============================================================================
try:
    from boost_system import create_boost_router, BoostSystem
    
    # Create a simple user auth dependency for sellers
    async def get_current_user_for_boost(request: Request):
        """Get current user from token for boost system"""
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        token = auth_header.replace("Bearer ", "")
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid token")
            return {"user_id": user_id}
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")
    
    boost_router, boost_system = create_boost_router(
        db=db,
        get_current_user=get_current_user_for_boost,
        get_current_admin=get_current_admin
    )
    app.include_router(boost_router, prefix="/api/admin")
    
    # Stripe webhook endpoint (outside router for direct access)
    @app.post("/api/webhook/stripe")
    async def stripe_webhook(request: Request):
        """Handle Stripe webhook events"""
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        return await boost_system.handle_stripe_webhook(request, body, signature)
    
    # Initialize boost system on startup
    @app.on_event("startup")
    async def init_boost_system():
        await boost_system.initialize_default_data()
    
    logger.info("Boost system loaded successfully")
except ImportError as e:
    logger.warning(f"Boost system not loaded: {e}")

# =============================================================================
# VERIFICATION SYSTEM
# =============================================================================
try:
    import sys
    sys.path.insert(0, '/app/backend')
    from verification_system import create_verification_router
    
    verification_router, verification_service = create_verification_router(db, get_current_admin)
    app.include_router(verification_router, prefix="/api/admin")
    
    logger.info("Verification system loaded successfully")
except ImportError as e:
    logger.warning(f"Verification system not loaded: {e}")

# =============================================================================
# COMMISSION SETTINGS SYSTEM
# =============================================================================
try:
    from commission_system import create_commission_router, CommissionService
    
    commission_router, commission_service = create_commission_router(db, get_current_admin)
    app.include_router(commission_router, prefix="/api/admin")
    
    # Initialize commission config on startup
    @app.on_event("startup")
    async def init_commission_system():
        await commission_service.initialize()
    
    logger.info("Commission system loaded successfully")
except ImportError as e:
    logger.warning(f"Commission system not loaded: {e}")

# =============================================================================
# BANNER MANAGEMENT PROXY ENDPOINTS
# Proxy banner routes from main app backend
# =============================================================================

@app.get("/api/admin/banners/slots")
async def get_banner_slots():
    """Get all banner slots"""
    slots = await db.banner_slots.find({}, {"_id": 0}).to_list(100)
    return slots

@app.get("/api/admin/banners/sizes")
async def get_banner_sizes():
    """Get all banner sizes"""
    return {
        "728x90": {"width": 728, "height": 90, "name": "Leaderboard"},
        "300x250": {"width": 300, "height": 250, "name": "Medium Rectangle"},
        "320x50": {"width": 320, "height": 50, "name": "Mobile Banner"},
        "320x100": {"width": 320, "height": 100, "name": "Large Mobile Banner"},
        "300x600": {"width": 300, "height": 600, "name": "Half Page"},
        "970x250": {"width": 970, "height": 250, "name": "Billboard"},
        "468x60": {"width": 468, "height": 60, "name": "Full Banner"},
        "336x280": {"width": 336, "height": 280, "name": "Large Rectangle"},
        "native": {"width": 0, "height": 0, "name": "Native (Auto)"},
    }

@app.get("/api/admin/banners/admin/list")
async def admin_list_banners(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    placement: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    admin = Depends(get_current_admin)
):
    """List all banners"""
    query = {}
    if placement:
        query["placement"] = placement
    if is_active is not None:
        query["is_active"] = is_active
    
    skip = (page - 1) * limit
    banners = await db.banners.find(query, {"_id": 0}).sort("priority", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.banners.count_documents(query)
    
    return {
        "banners": banners,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@app.get("/api/admin/banners/admin/{banner_id}")
async def admin_get_banner(
    banner_id: str,
    admin = Depends(get_current_admin)
):
    """Get a single banner"""
    banner = await db.banners.find_one({"id": banner_id}, {"_id": 0})
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    return banner

@app.post("/api/admin/banners/admin/create")
async def admin_create_banner(
    banner: Dict[str, Any] = Body(...),
    admin = Depends(get_current_admin)
):
    """Create a new banner"""
    import uuid
    banner_id = f"banner_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    banner_doc = {
        "id": banner_id,
        **banner,
        "created_by": admin.get("user_id", "admin"),
        "created_at": now,
        "updated_at": now,
        "impressions": 0,
        "clicks": 0,
        "ctr": 0.0
    }
    
    await db.banners.insert_one(banner_doc)
    banner_doc.pop("_id", None)
    
    return banner_doc

@app.put("/api/admin/banners/admin/{banner_id}")
async def admin_update_banner(
    banner_id: str,
    update: Dict[str, Any] = Body(...),
    admin = Depends(get_current_admin)
):
    """Update a banner"""
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.banners.update_one(
        {"id": banner_id},
        {"$set": update}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    return await db.banners.find_one({"id": banner_id}, {"_id": 0})

@app.delete("/api/admin/banners/admin/{banner_id}")
async def admin_delete_banner(
    banner_id: str,
    admin = Depends(get_current_admin)
):
    """Delete a banner"""
    result = await db.banners.delete_one({"id": banner_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    return {"deleted": True}

@app.post("/api/admin/banners/admin/{banner_id}/toggle")
async def admin_toggle_banner(
    banner_id: str,
    body: Dict[str, bool] = Body(...),
    admin = Depends(get_current_admin)
):
    """Toggle banner active status"""
    is_active = body.get("is_active", False)
    await db.banners.update_one(
        {"id": banner_id},
        {"$set": {"is_active": is_active, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return await db.banners.find_one({"id": banner_id}, {"_id": 0})

@app.get("/api/admin/banners/admin/analytics/overview")
async def admin_banner_analytics(
    banner_id: Optional[str] = Query(None),
    placement: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    group_by: str = Query("day"),
    admin = Depends(get_current_admin)
):
    """Get banner analytics"""
    match_query = {}
    if banner_id:
        match_query["banner_id"] = banner_id
    if start_date:
        match_query["timestamp"] = {"$gte": start_date}
    if end_date:
        if "timestamp" in match_query:
            match_query["timestamp"]["$lte"] = end_date
        else:
            match_query["timestamp"] = {"$lte": end_date}
    
    total_impressions = await db.banner_impressions.count_documents({**match_query, "type": "impression"})
    total_clicks = await db.banner_impressions.count_documents({**match_query, "type": "click"})
    ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
    
    # Simple daily breakdown
    pipeline = [
        {"$match": match_query},
        {"$group": {
            "_id": {
                "date": {"$dateToString": {"format": "%Y-%m-%d", "date": {"$dateFromString": {"dateString": "$timestamp"}}}},
                "type": "$type"
            },
            "count": {"$sum": 1}
        }},
        {"$group": {
            "_id": "$_id.date",
            "stats": {"$push": {"type": "$_id.type", "count": "$count"}}
        }},
        {"$sort": {"_id": 1}},
        {"$limit": 30}
    ]
    
    try:
        breakdown_raw = await db.banner_impressions.aggregate(pipeline).to_list(30)
        breakdown = []
        for item in breakdown_raw:
            impressions = next((s["count"] for s in item["stats"] if s["type"] == "impression"), 0)
            clicks = next((s["count"] for s in item["stats"] if s["type"] == "click"), 0)
            item_ctr = (clicks / impressions * 100) if impressions > 0 else 0
            breakdown.append({
                "key": item["_id"] or "Unknown",
                "impressions": impressions,
                "clicks": clicks,
                "ctr": round(item_ctr, 2)
            })
    except:
        breakdown = []
    
    return {
        "totals": {
            "impressions": total_impressions,
            "clicks": total_clicks,
            "ctr": round(ctr, 2)
        },
        "breakdown": breakdown
    }

@app.get("/api/admin/banners/admin/seller-banners/pending")
async def admin_get_pending_seller_banners(admin = Depends(get_current_admin)):
    """Get pending seller banners"""
    banners = await db.banners.find(
        {"is_seller_banner": True, "approval_status": "pending"},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    return banners

@app.post("/api/admin/banners/admin/seller-banners/{banner_id}/approve")
async def admin_approve_seller_banner(
    banner_id: str,
    body: Dict[str, bool] = Body(...),
    admin = Depends(get_current_admin)
):
    """Approve or reject a seller banner"""
    approved = body.get("approved", False)
    status = "approved" if approved else "rejected"
    
    await db.banners.update_one(
        {"id": banner_id, "is_seller_banner": True},
        {
            "$set": {
                "approval_status": status,
                "is_active": approved,
                "approved_by": admin.get("user_id", "admin"),
                "approved_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return await db.banners.find_one({"id": banner_id}, {"_id": 0})

@app.get("/api/admin/banners/admin/pricing")
async def admin_get_banner_pricing(admin = Depends(get_current_admin)):
    """Get banner pricing"""
    pricing = await db.banner_pricing.find({"is_active": True}, {"_id": 0}).to_list(100)
    return pricing

@app.put("/api/admin/banners/admin/pricing/{pricing_id}")
async def admin_update_banner_pricing(
    pricing_id: str,
    update: Dict[str, Any] = Body(...),
    admin = Depends(get_current_admin)
):
    """Update banner pricing"""
    await db.banner_pricing.update_one(
        {"id": pricing_id},
        {"$set": update}
    )
    return await db.banner_pricing.find_one({"id": pricing_id}, {"_id": 0})

# =============================================================================
# NOTIFICATION SYSTEM PROXY ENDPOINTS
# These endpoints proxy requests to the main backend's notification service
# =============================================================================

@app.get("/api/admin/notifications/admin/templates")
async def proxy_get_notification_templates(admin = Depends(get_current_admin)):
    """Get all notification templates from main backend"""
    templates = await db.notification_templates.find({}, {"_id": 0}).to_list(100)
    return templates

@app.post("/api/admin/notifications/admin/templates")
async def proxy_create_notification_template(
    template_data: Dict[str, Any] = Body(...),
    admin = Depends(get_current_admin)
):
    """Create a new notification template"""
    template_id = f"tmpl_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    template = {
        "id": template_id,
        **template_data,
        "created_at": now,
        "updated_at": now
    }
    await db.notification_templates.insert_one(template)
    template.pop("_id", None)
    return template

@app.put("/api/admin/notifications/admin/templates/{template_id}")
async def proxy_update_notification_template(
    template_id: str,
    update_data: Dict[str, Any] = Body(...),
    admin = Depends(get_current_admin)
):
    """Update a notification template"""
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.notification_templates.update_one(
        {"id": template_id},
        {"$set": update_data}
    )
    return await db.notification_templates.find_one({"id": template_id}, {"_id": 0})

@app.get("/api/admin/notifications/admin/logs")
async def proxy_get_notification_logs(
    order_id: Optional[str] = None,
    event: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    admin = Depends(get_current_admin)
):
    """Get notification logs"""
    query = {}
    if order_id:
        query["order_id"] = order_id
    if event:
        query["event"] = event
    if status:
        query["status"] = status
    
    skip = (page - 1) * limit
    logs = await db.notification_logs.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.notification_logs.count_documents(query)
    
    return {
        "logs": logs,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit if total > 0 else 1
    }

@app.post("/api/admin/notifications/admin/logs/{notification_id}/resend")
async def proxy_resend_notification(
    notification_id: str,
    admin = Depends(get_current_admin)
):
    """Resend a failed notification"""
    notification = await db.notification_logs.find_one({"id": notification_id})
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    # Update retry count
    await db.notification_logs.update_one(
        {"id": notification_id},
        {"$inc": {"retry_count": 1}}
    )
    
    return {"success": True, "message": "Notification queued for resend"}

@app.get("/api/admin/notifications/admin/transport-partners")
async def proxy_get_transport_partners(
    status: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = 1,
    limit: int = 20,
    admin = Depends(get_current_admin)
):
    """Get all transport partners"""
    query = {}
    if status:
        query["status"] = status
    if is_active is not None:
        query["is_active"] = is_active
    
    skip = (page - 1) * limit
    partners = await db.transport_partners.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.transport_partners.count_documents(query)
    
    return {
        "partners": partners,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit if total > 0 else 1
    }

@app.post("/api/admin/notifications/admin/transport-partners")
async def proxy_create_transport_partner(
    partner_data: Dict[str, Any] = Body(...),
    admin = Depends(get_current_admin)
):
    """Create a new transport partner"""
    partner_id = f"tp_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    partner = {
        "id": partner_id,
        "status": "available",
        "rating": 0.0,
        "total_deliveries": 0,
        "is_active": True,
        "notification_preferences": {"sms": True, "whatsapp": True},
        **partner_data,
        "created_at": now,
        "updated_at": now
    }
    await db.transport_partners.insert_one(partner)
    partner.pop("_id", None)
    return partner

@app.get("/api/admin/notifications/admin/transport-partners/{partner_id}")
async def proxy_get_transport_partner(
    partner_id: str,
    admin = Depends(get_current_admin)
):
    """Get transport partner by ID"""
    partner = await db.transport_partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    return partner

@app.put("/api/admin/notifications/admin/transport-partners/{partner_id}")
async def proxy_update_transport_partner(
    partner_id: str,
    update_data: Dict[str, Any] = Body(...),
    admin = Depends(get_current_admin)
):
    """Update transport partner"""
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.transport_partners.update_one(
        {"id": partner_id},
        {"$set": update_data}
    )
    return await db.transport_partners.find_one({"id": partner_id}, {"_id": 0})

@app.post("/api/admin/notifications/admin/transport-partners/{partner_id}/assign/{order_id}")
async def proxy_assign_partner_to_order(
    partner_id: str,
    order_id: str,
    admin = Depends(get_current_admin)
):
    """Assign transport partner to order"""
    partner = await db.transport_partners.find_one({"id": partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    if partner["status"] != "available":
        raise HTTPException(status_code=400, detail="Partner is not available")
    
    # Update partner status
    await db.transport_partners.update_one(
        {"id": partner_id},
        {"$set": {"status": "busy", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Create assignment record
    assignment = {
        "id": f"assign_{uuid.uuid4().hex[:12]}",
        "partner_id": partner_id,
        "order_id": order_id,
        "status": "assigned",
        "assigned_at": datetime.now(timezone.utc).isoformat()
    }
    await db.delivery_assignments.insert_one(assignment)
    
    return {"success": True, "assignment": assignment}

# =============================================================================
# AI ANALYZER PROXY ENDPOINTS
# =============================================================================

@app.get("/api/admin/ai-analyzer/admin/settings")
async def proxy_get_ai_settings(admin = Depends(get_current_admin)):
    """Get AI analyzer settings"""
    settings = await db.ai_settings.find_one({"id": "ai_settings_global"}, {"_id": 0})
    if not settings:
        # Return defaults
        return {
            "id": "ai_settings_global",
            "enabled": True,
            "enabled_categories": [],
            "disabled_categories": [],
            "max_uses_per_day_free": 3,
            "max_uses_per_day_verified": 10,
            "max_uses_per_day_premium": 50,
            "max_images_per_analysis": 5,
            "allow_free_users": True,
            "require_verified_email": False,
            "require_verified_phone": False,
            "enable_price_suggestions": False,
            "enable_category_suggestions": True,
            "profanity_filter_enabled": True,
            "policy_compliance_filter": True,
            "blocked_terms": ["guarantee", "warranty", "authentic"],
            "vision_system_prompt": "You are a product analyst...",
            "text_system_prompt": "You are a copywriter..."
        }
    return settings

@app.put("/api/admin/ai-analyzer/admin/settings")
async def proxy_update_ai_settings(
    updates: Dict[str, Any] = Body(...),
    admin = Depends(get_current_admin)
):
    """Update AI analyzer settings"""
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    updates["updated_by"] = admin.get("admin_id") if admin else "admin"
    await db.ai_settings.update_one(
        {"id": "ai_settings_global"},
        {"$set": updates},
        upsert=True
    )
    return await db.ai_settings.find_one({"id": "ai_settings_global"}, {"_id": 0})

@app.get("/api/admin/ai-analyzer/admin/analytics")
async def proxy_get_ai_analytics(
    days: int = 30,
    admin = Depends(get_current_admin)
):
    """Get AI usage analytics"""
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    # Total calls
    total_calls = await db.ai_usage_logs.count_documents({
        "created_at": {"$gte": start_date}
    })
    
    # Aggregated stats
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$group": {
            "_id": None,
            "total": {"$sum": 1},
            "accepted": {"$sum": {"$cond": ["$was_accepted", 1, 0]}},
            "edited": {"$sum": {"$cond": ["$was_edited", 1, 0]}},
            "rejected": {"$sum": {"$cond": ["$was_rejected", 1, 0]}},
            "total_images": {"$sum": "$images_analyzed"}
        }}
    ]
    
    agg_result = await db.ai_usage_logs.aggregate(pipeline).to_list(1)
    stats = agg_result[0] if agg_result else {
        "total": 0, "accepted": 0, "edited": 0, "rejected": 0, "total_images": 0
    }
    
    # Daily breakdown
    daily_pipeline = [
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$addFields": {"date": {"$substr": ["$created_at", 0, 10]}}},
        {"$group": {"_id": "$date", "calls": {"$sum": 1}, "images": {"$sum": "$images_analyzed"}}},
        {"$sort": {"_id": 1}}
    ]
    daily = await db.ai_usage_logs.aggregate(daily_pipeline).to_list(days)
    
    # Cache count
    cache_count = await db.ai_cache.count_documents({})
    
    return {
        "period_days": days,
        "total_calls": total_calls,
        "total_images_analyzed": stats.get("total_images", 0),
        "acceptance_rate": round(stats["accepted"] / stats["total"] * 100, 1) if stats["total"] > 0 else 0,
        "edit_rate": round(stats["edited"] / stats["total"] * 100, 1) if stats["total"] > 0 else 0,
        "rejection_rate": round(stats["rejected"] / stats["total"] * 100, 1) if stats["total"] > 0 else 0,
        "pending_rate": round((stats["total"] - stats["accepted"] - stats["edited"] - stats["rejected"]) / stats["total"] * 100, 1) if stats["total"] > 0 else 0,
        "daily_breakdown": [{"date": d["_id"], "calls": d["calls"], "images": d["images"]} for d in daily],
        "cache_entries": cache_count
    }

@app.post("/api/admin/ai-analyzer/admin/clear-cache")
async def proxy_clear_ai_cache(admin = Depends(get_current_admin)):
    """Clear AI analysis cache"""
    result = await db.ai_cache.delete_many({})
    return {"success": True, "deleted": result.deleted_count}

# =============================================================================
# EXECUTIVE SUMMARY PROXY ENDPOINTS
# =============================================================================
# These endpoints proxy requests to the main backend for executive summary

MAIN_BACKEND_URL = os.environ.get('MAIN_BACKEND_URL', 'http://localhost:8001')

@app.get("/api/admin/executive-summary/quick-stats")
async def proxy_executive_quick_stats(admin: dict = Depends(get_current_admin)):
    """Get quick KPI stats for executive summary"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Create admin token for main backend
            response = await client.get(
                f"{MAIN_BACKEND_URL}/api/executive-summary/quick-stats",
                headers={"Authorization": f"Bearer admin-internal-{admin.get('id', 'admin')}"}
            )
            if response.status_code == 200:
                return response.json()
            else:
                # Fallback to direct DB query
                now = datetime.now(timezone.utc)
                week_ago = now - timedelta(days=7)
                
                total_users = await db.users.count_documents({})
                new_users_week = await db.users.count_documents({"created_at": {"$gte": week_ago}})
                active_listings = await db.listings.count_documents({"status": "active"})
                pending_disputes = await db.escrow_disputes.count_documents({"status": "open"})
                
                return {
                    "total_users": total_users,
                    "new_users_week": new_users_week,
                    "active_listings": active_listings,
                    "pending_disputes": pending_disputes,
                    "revenue_week": 0,
                    "generated_at": now.isoformat()
                }
    except Exception as e:
        logger.error(f"Executive summary proxy error: {e}")
        # Fallback to direct DB query
        now = datetime.now(timezone.utc)
        week_ago = now - timedelta(days=7)
        
        total_users = await db.users.count_documents({})
        new_users_week = await db.users.count_documents({"created_at": {"$gte": week_ago}})
        active_listings = await db.listings.count_documents({"status": "active"})
        pending_disputes = await db.escrow_disputes.count_documents({"status": "open"})
        
        return {
            "total_users": total_users,
            "new_users_week": new_users_week,
            "active_listings": active_listings,
            "pending_disputes": pending_disputes,
            "revenue_week": 0,
            "generated_at": now.isoformat()
        }

@app.get("/api/admin/executive-summary/config")
async def proxy_executive_config(admin: dict = Depends(get_current_admin)):
    """Get executive summary config"""
    config = await db.executive_summary_config.find_one({"id": "executive_summary_config"}, {"_id": 0})
    if not config:
        config = {
            "id": "executive_summary_config",
            "enabled": True,
            "frequency": "weekly",
            "audience": ["super_admin", "admins"],
            "tone": "concise",
            "sections_included": ["platform_overview", "revenue_monetization", "growth_retention", "trust_safety", "operations_logistics", "system_health", "recommendations"],
            "email_digest_enabled": False,
            "email_recipients": []
        }
    return config

@app.put("/api/admin/executive-summary/config")
async def proxy_update_executive_config(request: Request, admin: dict = Depends(get_current_admin)):
    """Update executive summary config"""
    body = await request.json()
    await db.executive_summary_config.update_one(
        {"id": "executive_summary_config"},
        {"$set": body},
        upsert=True
    )
    return {"message": "Configuration updated"}

@app.get("/api/admin/executive-summary/latest")
async def proxy_executive_latest(
    period: str = Query("weekly"),
    admin: dict = Depends(get_current_admin)
):
    """Get latest executive summary"""
    summary = await db.executive_summaries.find_one(
        {"period_type": period},
        {"_id": 0}
    )
    if summary:
        return summary
    
    # Return empty summary structure if none exists
    return {
        "id": None,
        "period_type": period,
        "status": "not_generated",
        "message": "No summary generated yet. Click 'Generate' to create one."
    }

@app.post("/api/admin/executive-summary/generate")
async def proxy_executive_generate(
    period: str = Query("weekly"),
    force: bool = Query(False),
    admin: dict = Depends(get_current_admin)
):
    """Generate executive summary (simplified version)"""
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    period_start = week_ago if period == "weekly" else (month_ago if period == "monthly" else now - timedelta(days=1))
    
    # Gather metrics
    total_users = await db.users.count_documents({})
    new_users = await db.users.count_documents({"created_at": {"$gte": period_start}})
    active_listings = await db.listings.count_documents({"status": "active"})
    new_listings = await db.listings.count_documents({"created_at": {"$gte": period_start}})
    completed_transactions = await db.escrow_transactions.count_documents({"status": "completed", "completed_at": {"$gte": period_start}})
    
    summary = {
        "id": f"summary_{uuid.uuid4().hex[:12]}",
        "period_start": period_start.isoformat(),
        "period_end": now.isoformat(),
        "period_type": period,
        "generated_at": now.isoformat(),
        "status": "completed",
        "platform_overview": {
            "total_users": {"current": total_users, "previous": total_users - new_users, "change_percent": (new_users / max(total_users - new_users, 1)) * 100, "change_direction": "up" if new_users > 0 else "flat"},
            "active_listings": {"current": active_listings, "previous": active_listings - new_listings, "change_percent": 0, "change_direction": "flat"},
            "completed_transactions": {"current": completed_transactions, "previous": 0, "change_percent": 0, "change_direction": "flat"},
            "ai_summary": f"The platform has {total_users} users with {new_users} new registrations this period."
        },
        "key_highlights": [
            f"{new_users} new users joined",
            f"{new_listings} new listings created",
            f"{completed_transactions} transactions completed"
        ],
        "recommendations": []
    }
    
    # Save to DB
    await db.executive_summaries.update_one(
        {"period_type": period},
        {"$set": summary},
        upsert=True
    )
    
    return summary

@app.get("/api/admin/executive-summary/history")
async def proxy_executive_history(
    period: Optional[str] = None,
    limit: int = Query(10, ge=1, le=50),
    admin: dict = Depends(get_current_admin)
):
    """Get executive summary history"""
    query = {}
    if period:
        query["period_type"] = period
    
    summaries = await db.executive_summaries.find(query, {"_id": 0}).sort("generated_at", -1).limit(limit).to_list(limit)
    return {"summaries": summaries}

# =============================================================================
# VOUCHER MANAGEMENT (Direct DB access since we share the same DB)
# =============================================================================

@app.get("/api/admin/vouchers/list")
async def list_vouchers(
    status: Optional[str] = None,
    voucher_type: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    admin: dict = Depends(get_current_admin)
):
    """List all vouchers"""
    query = {}
    if status:
        query["status"] = status
    if voucher_type:
        query["voucher_type"] = voucher_type
    
    cursor = db.vouchers.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    vouchers = await cursor.to_list(length=limit)
    total = await db.vouchers.count_documents(query)
    
    # Calculate status for each voucher
    now = datetime.now(timezone.utc)
    for v in vouchers:
        if not v.get("is_active"):
            v["status"] = "disabled"
        elif v.get("valid_until") and v["valid_until"] < now:
            v["status"] = "expired"
        elif v.get("max_uses") and v.get("total_uses", 0) >= v["max_uses"]:
            v["status"] = "depleted"
        else:
            v["status"] = "active"
    
    return {"vouchers": vouchers, "total": total}

@app.get("/api/admin/vouchers/stats")
async def get_voucher_stats(admin: dict = Depends(get_current_admin)):
    """Get voucher statistics"""
    now = datetime.now(timezone.utc)
    
    total = await db.vouchers.count_documents({})
    active = await db.vouchers.count_documents({
        "is_active": True,
        "$or": [{"valid_until": None}, {"valid_until": {"$gt": now}}]
    })
    
    total_redemptions = await db.voucher_usage.count_documents({})
    
    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$discount_amount"}}}]
    result = await db.voucher_usage.aggregate(pipeline).to_list(length=1)
    total_discount = result[0]["total"] if result else 0
    
    type_stats = await db.vouchers.aggregate([
        {"$group": {"_id": "$voucher_type", "count": {"$sum": 1}}}
    ]).to_list(length=10)
    
    return {
        "total_vouchers": total,
        "active_vouchers": active,
        "total_redemptions": total_redemptions,
        "total_discount_given": total_discount,
        "by_type": {t["_id"]: t["count"] for t in type_stats}
    }

@app.get("/api/admin/vouchers/template")
async def get_voucher_template(admin: dict = Depends(get_current_admin)):
    """Get CSV template for voucher import"""
    return {
        "columns": [
            {"name": "code", "required": True, "description": "Unique voucher code"},
            {"name": "voucher_type", "required": True, "description": "amount, percent, or credit"},
            {"name": "value", "required": True, "description": "Discount value"},
            {"name": "description", "required": False, "description": "Voucher description"},
            {"name": "max_uses", "required": False, "description": "Total usage limit"},
            {"name": "max_uses_per_user", "required": False, "description": "Per-user limit (default: 1)"},
            {"name": "min_order_amount", "required": False, "description": "Minimum order amount"},
            {"name": "max_discount_amount", "required": False, "description": "Maximum discount (for percent type)"},
            {"name": "valid_until", "required": False, "description": "Expiration date (ISO format)"},
            {"name": "new_users_only", "required": False, "description": "true/false"},
            {"name": "verified_users_only", "required": False, "description": "true/false"},
            {"name": "premium_users_only", "required": False, "description": "true/false"}
        ],
        "example": [
            {"code": "SUMMER20", "voucher_type": "percent", "value": 20, "description": "Summer sale", "max_uses": 100},
            {"code": "FLAT10", "voucher_type": "amount", "value": 10, "description": "Flat $10 off", "min_order_amount": 50}
        ]
    }

@app.get("/api/admin/vouchers/{voucher_id}")
async def get_voucher(voucher_id: str, admin: dict = Depends(get_current_admin)):
    """Get voucher details"""
    voucher = await db.vouchers.find_one({"id": voucher_id}, {"_id": 0})
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher not found")
    
    usage_cursor = db.voucher_usage.find({"voucher_id": voucher_id}, {"_id": 0}).sort("used_at", -1).limit(50)
    usage = await usage_cursor.to_list(length=50)
    
    now = datetime.now(timezone.utc)
    if not voucher.get("is_active"):
        voucher["status"] = "disabled"
    elif voucher.get("valid_until") and voucher["valid_until"] < now:
        voucher["status"] = "expired"
    elif voucher.get("max_uses") and voucher.get("total_uses", 0) >= voucher["max_uses"]:
        voucher["status"] = "depleted"
    else:
        voucher["status"] = "active"
    
    voucher["usage_history"] = usage
    return voucher

@app.post("/api/admin/vouchers/create")
async def create_voucher(request: Request, admin: dict = Depends(get_current_admin)):
    """Create a new voucher"""
    data = await request.json()
    
    existing = await db.vouchers.find_one({"code": data.get("code", "").upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Voucher code already exists")
    
    now = datetime.now(timezone.utc)
    voucher = {
        "id": str(uuid.uuid4()),
        "code": data.get("code", "").upper(),
        "voucher_type": data.get("voucher_type", "amount"),
        "value": data.get("value", 0),
        "description": data.get("description"),
        "max_uses": data.get("max_uses"),
        "max_uses_per_user": data.get("max_uses_per_user", 1),
        "min_order_amount": data.get("min_order_amount"),
        "max_discount_amount": data.get("max_discount_amount"),
        "valid_from": data.get("valid_from") or now.isoformat(),
        "valid_until": data.get("valid_until"),
        "allowed_user_ids": data.get("allowed_user_ids"),
        "new_users_only": data.get("new_users_only", False),
        "verified_users_only": data.get("verified_users_only", False),
        "premium_users_only": data.get("premium_users_only", False),
        "allowed_categories": data.get("allowed_categories"),
        "excluded_categories": data.get("excluded_categories"),
        "stackable": data.get("stackable", False),
        "is_active": data.get("is_active", True),
        "total_uses": 0,
        "created_by": admin.get("id"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.vouchers.insert_one(voucher)
    logger.info(f"Voucher created: {voucher['code']} by {admin.get('email')}")
    
    return {"message": "Voucher created successfully", "voucher_id": voucher["id"], "code": voucher["code"]}

@app.put("/api/admin/vouchers/{voucher_id}")
async def update_voucher(voucher_id: str, request: Request, admin: dict = Depends(get_current_admin)):
    """Update voucher"""
    voucher = await db.vouchers.find_one({"id": voucher_id})
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher not found")
    
    data = await request.json()
    allowed_fields = [
        "description", "max_uses", "max_uses_per_user", "min_order_amount",
        "max_discount_amount", "valid_until", "allowed_user_ids", "new_users_only",
        "verified_users_only", "premium_users_only", "allowed_categories",
        "excluded_categories", "stackable", "is_active"
    ]
    
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.vouchers.update_one({"id": voucher_id}, {"$set": update_data})
    return {"message": "Voucher updated successfully"}

@app.delete("/api/admin/vouchers/{voucher_id}")
async def delete_voucher(voucher_id: str, admin: dict = Depends(get_current_admin)):
    """Delete voucher"""
    result = await db.vouchers.delete_one({"id": voucher_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Voucher not found")
    return {"message": "Voucher deleted successfully"}

# =============================================================================
# LISTING MODERATION (Direct DB access since we share the same DB)
# =============================================================================

@app.get("/api/admin/listing-moderation/queue")
async def get_moderation_queue(
    status: Optional[str] = "pending",
    category: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    admin: dict = Depends(get_current_admin)
):
    """Get listings pending moderation"""
    query = {}
    
    if status == "pending":
        query["moderation_status"] = {"$in": [None, "pending"]}
        query["is_active"] = False
    elif status == "approved":
        query["moderation_status"] = "approved"
    elif status == "rejected":
        query["moderation_status"] = "rejected"
    
    if category:
        query["category"] = category
    
    cursor = db.listings.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    listings = await cursor.to_list(length=limit)
    
    for listing in listings:
        user = await db.users.find_one({"user_id": listing.get("user_id")}, {"_id": 0, "name": 1, "email": 1})
        listing["user"] = user
    
    total = await db.listings.count_documents(query)
    pending_count = await db.listings.count_documents({"moderation_status": {"$in": [None, "pending"]}, "is_active": False})
    
    return {"listings": listings, "total": total, "pending_count": pending_count}

@app.post("/api/admin/listing-moderation/decide/{listing_id}")
async def moderate_listing(listing_id: str, request: Request, admin: dict = Depends(get_current_admin)):
    """Make a moderation decision on a listing"""
    listing = await db.listings.find_one({"id": listing_id})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    data = await request.json()
    action = data.get("action")
    reason = data.get("reason")
    notify_user = data.get("notify_user", True)
    
    now = datetime.now(timezone.utc)
    
    if action == "validate":
        await db.listings.update_one(
            {"id": listing_id},
            {"$set": {
                "is_active": True,
                "moderation_status": "approved",
                "moderated_at": now,
                "moderated_by": admin.get("id"),
                "moderation_reason": reason
            }}
        )
        message = "Listing approved and now visible"
        
    elif action == "reject":
        await db.listings.update_one(
            {"id": listing_id},
            {"$set": {
                "is_active": False,
                "moderation_status": "rejected",
                "moderated_at": now,
                "moderated_by": admin.get("id"),
                "moderation_reason": reason
            }}
        )
        message = "Listing rejected"
        
    elif action == "remove":
        await db.listings.delete_one({"id": listing_id})
        message = "Listing removed"
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    if notify_user and action != "remove":
        notification_title = "Listing Update"
        if action == "validate":
            notification_msg = f"Your listing '{listing.get('title', '')}' has been approved and is now live!"
        else:
            notification_msg = f"Your listing '{listing.get('title', '')}' was not approved. Reason: {reason or 'Does not meet guidelines'}"
        
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": listing["user_id"],
            "type": "listing_moderation",
            "title": notification_title,
            "message": notification_msg,
            "listing_id": listing_id,
            "is_read": False,
            "created_at": now
        })
    
    await db.moderation_log.insert_one({
        "id": str(uuid.uuid4()),
        "listing_id": listing_id,
        "listing_title": listing.get("title"),
        "user_id": listing["user_id"],
        "admin_id": admin.get("id"),
        "admin_email": admin.get("email"),
        "action": action,
        "reason": reason,
        "created_at": now
    })
    
    logger.info(f"Listing {listing_id} moderated: {action} by {admin.get('email')}")
    
    return {"message": message, "action": action}

@app.post("/api/admin/listing-moderation/bulk-decide")
async def bulk_moderate(request: Request, admin: dict = Depends(get_current_admin)):
    """Bulk moderation decision"""
    data = await request.json()
    listing_ids = data.get("listing_ids", [])
    action = data.get("action")
    reason = data.get("reason")
    notify_users = data.get("notify_users", True)
    
    if not listing_ids or not action:
        raise HTTPException(status_code=400, detail="listing_ids and action required")
    
    results = {"success": 0, "failed": 0}
    
    for listing_id in listing_ids:
        try:
            listing = await db.listings.find_one({"id": listing_id})
            if not listing:
                results["failed"] += 1
                continue
            
            now = datetime.now(timezone.utc)
            
            if action == "validate":
                await db.listings.update_one(
                    {"id": listing_id},
                    {"$set": {"is_active": True, "moderation_status": "approved", "moderated_at": now}}
                )
            elif action == "reject":
                await db.listings.update_one(
                    {"id": listing_id},
                    {"$set": {"is_active": False, "moderation_status": "rejected", "moderated_at": now}}
                )
            elif action == "remove":
                await db.listings.delete_one({"id": listing_id})
            
            await db.moderation_log.insert_one({
                "id": str(uuid.uuid4()),
                "listing_id": listing_id,
                "admin_id": admin.get("id"),
                "action": action,
                "reason": reason,
                "created_at": now
            })
            
            results["success"] += 1
        except Exception as e:
            logger.error(f"Bulk moderation error for {listing_id}: {e}")
            results["failed"] += 1
    
    return results

@app.get("/api/admin/listing-moderation/log")
async def get_moderation_log(
    listing_id: Optional[str] = None,
    admin_id: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 100,
    admin: dict = Depends(get_current_admin)
):
    """Get moderation history"""
    query = {}
    if listing_id:
        query["listing_id"] = listing_id
    if admin_id:
        query["admin_id"] = admin_id
    if action:
        query["action"] = action
    
    cursor = db.moderation_log.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
    logs = await cursor.to_list(length=limit)
    
    return {"logs": logs}

@app.get("/api/admin/listing-moderation/limits/settings")
async def get_limit_settings(admin: dict = Depends(get_current_admin)):
    """Get global listing limit settings"""
    settings = await db.app_settings.find_one({"key": "listing_limits"})
    
    if not settings:
        return {
            "require_moderation": True,
            "auto_approve_verified_users": True,
            "auto_approve_premium_users": True,
            "default_tier": "free",
            "tier_limits": {"free": 5, "basic": 20, "premium": 100, "unlimited": None},
            "moderation_enabled": True
        }
    
    return settings.get("value", {})

@app.put("/api/admin/listing-moderation/limits/settings")
async def update_limit_settings(request: Request, admin: dict = Depends(get_current_admin)):
    """Update global listing limit settings"""
    data = await request.json()
    
    await db.app_settings.update_one(
        {"key": "listing_limits"},
        {"$set": {"key": "listing_limits", "value": data, "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    
    return {"message": "Settings updated"}

@app.get("/api/admin/listing-moderation/limits/user/{user_id}")
async def get_user_limits(user_id: str, admin: dict = Depends(get_current_admin)):
    """Get user's listing limits and usage"""
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_limits = await db.user_listing_limits.find_one({"user_id": user_id})
    active_listings = await db.listings.count_documents({"user_id": user_id, "is_active": True})
    total_listings = await db.listings.count_documents({"user_id": user_id})
    
    settings = await db.app_settings.find_one({"key": "listing_limits"})
    settings_value = settings.get("value", {}) if settings else {}
    
    tier_limits = {"free": 5, "basic": 20, "premium": 100, "unlimited": None}
    
    if user_limits and user_limits.get("is_unlimited"):
        effective_limit = None
    elif user_limits and user_limits.get("custom_limit") is not None:
        effective_limit = user_limits["custom_limit"]
    else:
        tier = user_limits.get("tier") if user_limits else settings_value.get("default_tier", "free")
        effective_limit = tier_limits.get(tier, 5)
    
    return {
        "user_id": user_id,
        "user_name": user.get("name"),
        "tier": user_limits.get("tier") if user_limits else "free",
        "custom_limit": user_limits.get("custom_limit") if user_limits else None,
        "is_unlimited": user_limits.get("is_unlimited", False) if user_limits else False,
        "effective_limit": effective_limit,
        "active_listings": active_listings,
        "total_listings": total_listings,
        "remaining": (effective_limit - active_listings) if effective_limit else None,
        "can_post": effective_limit is None or active_listings < effective_limit
    }

@app.put("/api/admin/listing-moderation/limits/user/{user_id}")
async def set_user_limits(user_id: str, request: Request, admin: dict = Depends(get_current_admin)):
    """Set custom limits for a user"""
    data = await request.json()
    
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {
        "user_id": user_id,
        "updated_at": datetime.now(timezone.utc),
        "updated_by": admin.get("id")
    }
    
    if "tier" in data:
        update_data["tier"] = data["tier"]
    if "custom_limit" in data:
        update_data["custom_limit"] = data["custom_limit"]
    if "is_unlimited" in data:
        update_data["is_unlimited"] = data["is_unlimited"]
    
    await db.user_listing_limits.update_one(
        {"user_id": user_id},
        {"$set": update_data, "$setOnInsert": {"created_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    
    logger.info(f"User {user_id} limits updated by {admin.get('email')}")
    
    return {"message": "User limits updated"}

# =============================================================================
# SEO TOOLS
# =============================================================================

@app.get("/api/admin/seo/meta")
async def list_seo_meta(admin: dict = Depends(get_current_admin)):
    """List all SEO meta tag configurations"""
    cursor = db.seo_meta.find({}, {"_id": 0})
    metas = await cursor.to_list(length=100)
    return {"meta_tags": metas}

@app.get("/api/admin/seo/global-settings")
async def get_seo_global_settings(admin: dict = Depends(get_current_admin)):
    """Get global SEO settings"""
    settings = await db.app_settings.find_one({"key": "seo_global"})
    return settings.get("value", {}) if settings else {
        "site_name": "Avida Marketplace",
        "site_description": "Your local marketplace for buying and selling",
        "default_og_image": None,
        "google_analytics_id": None,
        "google_tag_manager_id": None,
        "facebook_pixel_id": None,
        "twitter_handle": None
    }

@app.put("/api/admin/seo/global-settings")
async def update_seo_global_settings(request: Request, admin: dict = Depends(get_current_admin)):
    """Update global SEO settings"""
    data = await request.json()
    await db.app_settings.update_one(
        {"key": "seo_global"},
        {"$set": {"key": "seo_global", "value": data, "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    return {"message": "Settings updated"}

@app.post("/api/admin/seo/meta")
async def create_seo_meta(request: Request, admin: dict = Depends(get_current_admin)):
    """Create SEO meta tags for a page"""
    data = await request.json()
    existing = await db.seo_meta.find_one({"page_path": data.get("page_path")})
    if existing:
        raise HTTPException(status_code=400, detail="Meta tags already exist for this page")
    
    meta_doc = {
        "id": str(uuid.uuid4()),
        "page_path": data.get("page_path"),
        "title": data.get("title"),
        "description": data.get("description"),
        "keywords": data.get("keywords", []),
        "og_title": data.get("og_title"),
        "og_description": data.get("og_description"),
        "og_image": data.get("og_image"),
        "og_type": data.get("og_type", "website"),
        "twitter_card": data.get("twitter_card", "summary_large_image"),
        "robots": data.get("robots", "index, follow"),
        "canonical_url": data.get("canonical_url"),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.seo_meta.insert_one(meta_doc)
    return {"message": "Meta tags created", "id": meta_doc["id"]}

@app.put("/api/admin/seo/meta/{meta_id}")
async def update_seo_meta(meta_id: str, request: Request, admin: dict = Depends(get_current_admin)):
    """Update SEO meta tags"""
    data = await request.json()
    data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.seo_meta.update_one({"id": meta_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Meta tags not found")
    return {"message": "Meta tags updated"}

@app.delete("/api/admin/seo/meta/{meta_id}")
async def delete_seo_meta(meta_id: str, admin: dict = Depends(get_current_admin)):
    """Delete SEO meta tags"""
    await db.seo_meta.delete_one({"id": meta_id})
    return {"message": "Meta tags deleted"}

@app.get("/api/admin/seo/sitemap-config")
async def get_sitemap_config(admin: dict = Depends(get_current_admin)):
    """Get sitemap configuration"""
    settings = await db.app_settings.find_one({"key": "sitemap_config"})
    return settings.get("value", {}) if settings else {
        "auto_generate": True,
        "include_listings": True,
        "include_categories": True,
        "include_profiles": True,
        "change_frequency": "weekly",
        "priority_home": 1.0,
        "priority_categories": 0.8,
        "priority_listings": 0.6,
        "last_generated": None
    }

@app.put("/api/admin/seo/sitemap-config")
async def update_sitemap_config(request: Request, admin: dict = Depends(get_current_admin)):
    """Update sitemap configuration"""
    data = await request.json()
    await db.app_settings.update_one(
        {"key": "sitemap_config"},
        {"$set": {"key": "sitemap_config", "value": data, "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    return {"message": "Sitemap config updated"}

@app.post("/api/admin/seo/regenerate-sitemap")
async def regenerate_sitemap(admin: dict = Depends(get_current_admin)):
    """Regenerate sitemap"""
    # Count entries
    listings_count = await db.listings.count_documents({"is_active": True})
    categories_count = await db.categories.count_documents({})
    profiles_count = await db.business_profiles.count_documents({"status": "verified"})
    
    # Update last generated time
    await db.app_settings.update_one(
        {"key": "sitemap_config"},
        {"$set": {"value.last_generated": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {
        "message": "Sitemap regenerated",
        "entries": {
            "listings": listings_count,
            "categories": categories_count,
            "profiles": profiles_count,
            "total": listings_count + categories_count + profiles_count + 1  # +1 for home
        }
    }

# =============================================================================
# POLLS & SURVEYS
# =============================================================================

@app.get("/api/admin/polls/list")
async def list_polls(
    poll_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    admin: dict = Depends(get_current_admin)
):
    """List all polls/surveys"""
    query = {}
    if poll_type:
        query["type"] = poll_type
    if is_active is not None:
        query["is_active"] = is_active
    
    cursor = db.polls.find(query, {"_id": 0}).sort("created_at", -1)
    polls = await cursor.to_list(length=100)
    
    # Get response counts
    for poll in polls:
        poll["response_count"] = await db.poll_responses.count_documents({"poll_id": poll["id"]})
    
    return {"polls": polls}

@app.get("/api/admin/polls/{poll_id}")
async def get_poll(poll_id: str, admin: dict = Depends(get_current_admin)):
    """Get poll details with results"""
    poll = await db.polls.find_one({"id": poll_id}, {"_id": 0})
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    # Get responses
    responses = await db.poll_responses.find({"poll_id": poll_id}, {"_id": 0}).to_list(length=1000)
    
    # Aggregate results
    if poll.get("type") == "poll":
        vote_counts = {}
        for response in responses:
            for option in response.get("selected_options", []):
                vote_counts[option] = vote_counts.get(option, 0) + 1
        poll["results"] = vote_counts
    else:
        poll["responses"] = responses
    
    poll["total_responses"] = len(responses)
    return poll

@app.post("/api/admin/polls/create")
async def create_poll(request: Request, admin: dict = Depends(get_current_admin)):
    """Create a new poll/survey"""
    data = await request.json()
    
    now = datetime.now(timezone.utc)
    poll = {
        "id": str(uuid.uuid4()),
        "title": data.get("title"),
        "description": data.get("description"),
        "type": data.get("type", "feedback"),  # poll, survey, feedback
        "questions": data.get("questions", []),
        "options": data.get("options", []),
        "allow_multiple": data.get("allow_multiple", False),
        "require_auth": data.get("require_auth", True),
        "show_results": data.get("show_results", True),
        "is_active": data.get("is_active", True),
        "starts_at": data.get("starts_at"),
        "ends_at": data.get("ends_at"),
        "target_audience": data.get("target_audience", "all"),  # all, verified, premium
        "created_by": admin.get("id"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.polls.insert_one(poll)
    logger.info(f"Poll created: {poll['title']} by {admin.get('email')}")
    
    return {"message": "Poll created", "poll_id": poll["id"]}

@app.put("/api/admin/polls/{poll_id}")
async def update_poll(poll_id: str, request: Request, admin: dict = Depends(get_current_admin)):
    """Update a poll"""
    data = await request.json()
    data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.polls.update_one({"id": poll_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Poll not found")
    return {"message": "Poll updated"}

@app.delete("/api/admin/polls/{poll_id}")
async def delete_poll(poll_id: str, admin: dict = Depends(get_current_admin)):
    """Delete a poll and its responses"""
    await db.polls.delete_one({"id": poll_id})
    await db.poll_responses.delete_many({"poll_id": poll_id})
    return {"message": "Poll deleted"}

@app.get("/api/admin/polls/{poll_id}/export")
async def export_poll_responses(poll_id: str, admin: dict = Depends(get_current_admin)):
    """Export poll responses as CSV data"""
    poll = await db.polls.find_one({"id": poll_id}, {"_id": 0})
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    responses = await db.poll_responses.find({"poll_id": poll_id}, {"_id": 0}).to_list(length=10000)
    
    return {
        "poll": poll,
        "responses": responses,
        "export_format": "json"
    }

# =============================================================================
# COOKIE CONSENT
# =============================================================================

@app.get("/api/admin/cookies/settings")
async def get_cookie_settings(admin: dict = Depends(get_current_admin)):
    """Get cookie consent settings"""
    settings = await db.app_settings.find_one({"key": "cookie_consent"})
    return settings.get("value", {}) if settings else {
        "enabled": True,
        "banner_text": "We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.",
        "privacy_policy_url": "/privacy",
        "cookie_policy_url": "/cookies",
        "position": "bottom",
        "theme": "dark",
        "show_preferences": True,
        "categories": [
            {"id": "necessary", "name": "Necessary", "description": "Essential for the website to function properly", "required": True, "enabled": True},
            {"id": "analytics", "name": "Analytics", "description": "Help us understand how visitors interact with the website", "required": False, "enabled": True},
            {"id": "marketing", "name": "Marketing", "description": "Used to deliver relevant advertisements", "required": False, "enabled": False},
            {"id": "preferences", "name": "Preferences", "description": "Remember your settings and preferences", "required": False, "enabled": True}
        ],
        "button_text": {
            "accept_all": "Accept All",
            "reject_all": "Reject All",
            "customize": "Customize",
            "save": "Save Preferences"
        }
    }

@app.put("/api/admin/cookies/settings")
async def update_cookie_settings(request: Request, admin: dict = Depends(get_current_admin)):
    """Update cookie consent settings"""
    data = await request.json()
    await db.app_settings.update_one(
        {"key": "cookie_consent"},
        {"$set": {"key": "cookie_consent", "value": data, "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    logger.info(f"Cookie settings updated by {admin.get('email')}")
    return {"message": "Settings updated"}

@app.get("/api/admin/cookies/stats")
async def get_cookie_stats(admin: dict = Depends(get_current_admin)):
    """Get cookie consent statistics"""
    total = await db.cookie_consents.count_documents({})
    
    # Get category breakdown
    pipeline = [
        {"$unwind": "$consented_categories"},
        {"$group": {"_id": "$consented_categories", "count": {"$sum": 1}}}
    ]
    category_stats = await db.cookie_consents.aggregate(pipeline).to_list(length=10)
    
    return {
        "total_consents": total,
        "by_category": {s["_id"]: s["count"] for s in category_stats}
    }

# =============================================================================
# RECAPTCHA CONFIGURATION
# =============================================================================

@app.get("/api/admin/recaptcha/settings")
async def get_recaptcha_settings(admin: dict = Depends(get_current_admin)):
    """Get reCAPTCHA settings"""
    settings = await db.app_settings.find_one({"key": "recaptcha"})
    result = settings.get("value", {}) if settings else {
        "enabled": False,
        "site_key": "",
        "type": "v2_invisible",
        "threshold": 0.5,
        "protected_forms": []
    }
    # Don't return secret key
    result.pop("secret_key", None)
    return result

@app.put("/api/admin/recaptcha/settings")
async def update_recaptcha_settings(request: Request, admin: dict = Depends(get_current_admin)):
    """Update reCAPTCHA settings"""
    data = await request.json()
    
    # Get existing settings to preserve secret key if not updating
    existing = await db.app_settings.find_one({"key": "recaptcha"})
    if existing and not data.get("secret_key"):
        data["secret_key"] = existing.get("value", {}).get("secret_key")
    
    await db.app_settings.update_one(
        {"key": "recaptcha"},
        {"$set": {"key": "recaptcha", "value": data, "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    logger.info(f"reCAPTCHA settings updated by {admin.get('email')}")
    return {"message": "Settings updated"}

# =============================================================================
# WEBP IMAGE CONVERSION
# =============================================================================

@app.get("/api/admin/images/settings")
async def get_image_settings(admin: dict = Depends(get_current_admin)):
    """Get image processing settings"""
    settings = await db.app_settings.find_one({"key": "image_processing"})
    return settings.get("value", {}) if settings else {
        "auto_convert_webp": True,
        "webp_quality": 80,
        "max_width": 1920,
        "max_height": 1080,
        "thumbnail_size": 300,
        "allowed_formats": ["jpg", "jpeg", "png", "gif", "webp"],
        "max_file_size_mb": 5
    }

@app.put("/api/admin/images/settings")
async def update_image_settings(request: Request, admin: dict = Depends(get_current_admin)):
    """Update image processing settings"""
    data = await request.json()
    await db.app_settings.update_one(
        {"key": "image_processing"},
        {"$set": {"key": "image_processing", "value": data, "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    return {"message": "Settings updated"}

@app.post("/api/admin/images/convert-batch")
async def convert_images_batch(request: Request, admin: dict = Depends(get_current_admin)):
    """Queue batch WebP conversion for existing images"""
    data = await request.json()
    target = data.get("target", "listings")  # listings, profiles, all
    
    # Count images to convert
    count = 0
    if target in ["listings", "all"]:
        listings = await db.listings.count_documents({"images": {"$exists": True, "$ne": []}})
        count += listings
    if target in ["profiles", "all"]:
        profiles = await db.business_profiles.count_documents({"logo": {"$exists": True}})
        count += profiles
    
    # Create batch job record
    job = {
        "id": str(uuid.uuid4()),
        "type": "webp_conversion",
        "target": target,
        "status": "queued",
        "total_items": count,
        "processed_items": 0,
        "created_by": admin.get("id"),
        "created_at": datetime.now(timezone.utc)
    }
    await db.batch_jobs.insert_one(job)
    
    return {"message": f"Batch conversion queued for {count} items", "job_id": job["id"]}

@app.get("/api/admin/images/stats")
async def get_image_stats(admin: dict = Depends(get_current_admin)):
    """Get image statistics"""
    # Count images by format (simplified)
    total_listings_with_images = await db.listings.count_documents({"images": {"$exists": True, "$ne": []}})
    total_profiles_with_logo = await db.business_profiles.count_documents({"logo": {"$exists": True}})
    
    return {
        "listings_with_images": total_listings_with_images,
        "profiles_with_logo": total_profiles_with_logo,
        "webp_converted": 0,  # Would need to track this
        "pending_conversion": 0
    }

# =============================================================================
# URL SHORTENER
# =============================================================================

@app.get("/api/admin/urls/list")
async def list_short_urls(admin: dict = Depends(get_current_admin)):
    """List all short URLs"""
    cursor = db.short_urls.find({}, {"_id": 0}).sort("created_at", -1)
    urls = await cursor.to_list(length=100)
    return {"urls": urls}

@app.post("/api/admin/urls/create")
async def create_short_url(request: Request, admin: dict = Depends(get_current_admin)):
    """Create a short URL"""
    import random
    import string
    
    data = await request.json()
    target_url = data.get("target_url")
    custom_code = data.get("custom_code")
    expires_at = data.get("expires_at")
    
    if not target_url:
        raise HTTPException(status_code=400, detail="target_url required")
    
    # Generate or use custom code
    if custom_code:
        code = custom_code
    else:
        code = ''.join(random.choices(string.ascii_letters + string.digits, k=6))
    
    # Check if code exists
    existing = await db.short_urls.find_one({"code": code})
    if existing:
        raise HTTPException(status_code=400, detail="This short code already exists")
    
    now = datetime.now(timezone.utc)
    short_url = {
        "id": str(uuid.uuid4()),
        "code": code,
        "target_url": target_url,
        "title": data.get("title"),
        "clicks": 0,
        "created_by": admin.get("id"),
        "created_at": now,
        "expires_at": expires_at,
        "is_active": True
    }
    
    await db.short_urls.insert_one(short_url)
    
    return {
        "message": "Short URL created",
        "short_url": f"/s/{code}",
        "code": code
    }

@app.get("/api/admin/urls/{code}/stats")
async def get_url_stats(code: str, admin: dict = Depends(get_current_admin)):
    """Get statistics for a short URL"""
    url = await db.short_urls.find_one({"code": code}, {"_id": 0})
    if not url:
        raise HTTPException(status_code=404, detail="Short URL not found")
    
    # Get click history
    clicks = await db.short_url_clicks.find({"code": code}, {"_id": 0}).sort("clicked_at", -1).limit(100).to_list(length=100)
    url["click_history"] = clicks
    
    return url

@app.delete("/api/admin/urls/{code}")
async def delete_short_url(code: str, admin: dict = Depends(get_current_admin)):
    """Delete a short URL"""
    await db.short_urls.delete_one({"code": code})
    return {"message": "Short URL deleted"}

# =============================================================================
# BULK VOUCHER IMPORT
# =============================================================================

@app.post("/api/admin/vouchers/bulk-import")
async def bulk_import_vouchers(request: Request, admin: dict = Depends(get_current_admin)):
    """Bulk import vouchers from CSV data"""
    data = await request.json()
    vouchers_data = data.get("vouchers", [])
    
    if not vouchers_data:
        raise HTTPException(status_code=400, detail="No vouchers provided")
    
    now = datetime.now(timezone.utc)
    created = 0
    skipped = 0
    errors = []
    
    for idx, v in enumerate(vouchers_data):
        try:
            code = v.get("code", "").upper().strip()
            if not code:
                errors.append(f"Row {idx + 1}: Missing code")
                skipped += 1
                continue
            
            # Check if exists
            existing = await db.vouchers.find_one({"code": code})
            if existing:
                errors.append(f"Row {idx + 1}: Code {code} already exists")
                skipped += 1
                continue
            
            voucher = {
                "id": str(uuid.uuid4()),
                "code": code,
                "voucher_type": v.get("voucher_type", "amount"),
                "value": float(v.get("value", 0)),
                "description": v.get("description"),
                "max_uses": int(v.get("max_uses")) if v.get("max_uses") else None,
                "max_uses_per_user": int(v.get("max_uses_per_user", 1)),
                "min_order_amount": float(v.get("min_order_amount")) if v.get("min_order_amount") else None,
                "max_discount_amount": float(v.get("max_discount_amount")) if v.get("max_discount_amount") else None,
                "valid_until": v.get("valid_until"),
                "new_users_only": v.get("new_users_only", False),
                "verified_users_only": v.get("verified_users_only", False),
                "premium_users_only": v.get("premium_users_only", False),
                "stackable": v.get("stackable", False),
                "is_active": v.get("is_active", True),
                "total_uses": 0,
                "created_by": admin.get("id"),
                "created_at": now,
                "updated_at": now,
                "import_batch": data.get("batch_name", "import")
            }
            
            await db.vouchers.insert_one(voucher)
            created += 1
            
        except Exception as e:
            errors.append(f"Row {idx + 1}: {str(e)}")
            skipped += 1
    
    logger.info(f"Bulk voucher import by {admin.get('email')}: {created} created, {skipped} skipped")
    
    return {
        "message": f"Import complete: {created} created, {skipped} skipped",
        "created": created,
        "skipped": skipped,
        "errors": errors[:20]  # Limit error messages
    }

# =============================================================================
# A/B TESTING FRAMEWORK
# =============================================================================

@app.get("/api/admin/experiments/list")
async def list_experiments(
    status: Optional[str] = None,
    admin: dict = Depends(get_current_admin)
):
    """List all A/B experiments"""
    query = {}
    if status:
        query["status"] = status
    
    cursor = db.ab_experiments.find(query, {"_id": 0}).sort("created_at", -1)
    experiments = await cursor.to_list(length=100)
    
    # Enrich with participant counts
    for exp in experiments:
        exp["total_participants"] = await db.ab_assignments.count_documents({"experiment_id": exp["id"]})
        
        # Get variant stats
        variant_stats = []
        for variant in exp.get("variants", []):
            participants = await db.ab_assignments.count_documents({
                "experiment_id": exp["id"],
                "variant_id": variant["id"]
            })
            events = await db.ab_events.count_documents({
                "experiment_id": exp["id"],
                "variant_id": variant["id"]
            })
            conversions = await db.ab_events.count_documents({
                "experiment_id": exp["id"],
                "variant_id": variant["id"],
                "event_type": "conversion"
            })
            variant_stats.append({
                "variant_id": variant["id"],
                "participants": participants,
                "events": events,
                "conversions": conversions,
                "conversion_rate": (conversions / participants * 100) if participants > 0 else 0
            })
        exp["variant_stats"] = variant_stats
    
    return {"experiments": experiments}

@app.get("/api/admin/experiments/{experiment_id}")
async def get_experiment(experiment_id: str, admin: dict = Depends(get_current_admin)):
    """Get detailed experiment data with results"""
    experiment = await db.ab_experiments.find_one({"id": experiment_id}, {"_id": 0})
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    # Get detailed stats for each variant
    results = []
    total_participants = 0
    
    for variant in experiment.get("variants", []):
        participants = await db.ab_assignments.count_documents({
            "experiment_id": experiment_id,
            "variant_id": variant["id"]
        })
        total_participants += participants
        
        # Get events by type
        event_pipeline = [
            {"$match": {"experiment_id": experiment_id, "variant_id": variant["id"]}},
            {"$group": {"_id": "$event_type", "count": {"$sum": 1}}}
        ]
        event_stats = await db.ab_events.aggregate(event_pipeline).to_list(length=20)
        events_by_type = {e["_id"]: e["count"] for e in event_stats}
        
        clicks = events_by_type.get("click", 0)
        conversions = events_by_type.get("conversion", 0)
        consents = events_by_type.get("consent", 0)
        
        results.append({
            "variant_id": variant["id"],
            "variant_name": variant["name"],
            "traffic_percent": variant.get("traffic_percent", 0),
            "participants": participants,
            "clicks": clicks,
            "conversions": conversions,
            "consents": consents,
            "click_rate": (clicks / participants * 100) if participants > 0 else 0,
            "conversion_rate": (conversions / participants * 100) if participants > 0 else 0,
            "consent_rate": (consents / participants * 100) if participants > 0 else 0,
        })
    
    # Calculate statistical significance (simplified chi-square approximation)
    if len(results) >= 2 and total_participants >= 100:
        control = results[0]
        for i, variant in enumerate(results[1:], 1):
            if control["participants"] > 0 and variant["participants"] > 0:
                # Simple z-test for proportions
                p1 = control["conversion_rate"] / 100
                p2 = variant["conversion_rate"] / 100
                n1 = control["participants"]
                n2 = variant["participants"]
                
                if p1 + p2 > 0:
                    p_pooled = (p1 * n1 + p2 * n2) / (n1 + n2)
                    se = (p_pooled * (1 - p_pooled) * (1/n1 + 1/n2)) ** 0.5
                    if se > 0:
                        z = abs(p2 - p1) / se
                        # Approximate p-value (95% confidence = z > 1.96)
                        results[i]["significant"] = z > 1.96
                        results[i]["z_score"] = round(z, 2)
                        results[i]["improvement"] = round((p2 - p1) / p1 * 100, 1) if p1 > 0 else 0
    
    experiment["results"] = results
    experiment["total_participants"] = total_participants
    
    # Get recent events timeline
    recent_events = await db.ab_events.find(
        {"experiment_id": experiment_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(length=50)
    experiment["recent_events"] = recent_events
    
    return experiment

@app.post("/api/admin/experiments/create")
async def create_experiment(request: Request, admin: dict = Depends(get_current_admin)):
    """Create a new A/B experiment"""
    data = await request.json()
    
    now = datetime.now(timezone.utc)
    
    # Validate variants total to 100%
    variants = data.get("variants", [])
    if not variants:
        raise HTTPException(status_code=400, detail="At least 2 variants required")
    
    total_traffic = sum(v.get("traffic_percent", 0) for v in variants)
    if abs(total_traffic - 100) > 0.01:
        raise HTTPException(status_code=400, detail=f"Variant traffic must total 100% (currently {total_traffic}%)")
    
    experiment = {
        "id": str(uuid.uuid4()),
        "name": data.get("name"),
        "description": data.get("description"),
        "hypothesis": data.get("hypothesis"),
        "experiment_type": data.get("experiment_type", "feature"),  # feature, cookie_banner, poll, cta
        "target_page": data.get("target_page"),
        "goal_type": data.get("goal_type", "conversion"),  # conversion, click, consent, custom
        "goal_event": data.get("goal_event"),
        "variants": [
            {
                "id": str(uuid.uuid4()),
                "name": v.get("name"),
                "description": v.get("description"),
                "traffic_percent": v.get("traffic_percent", 50),
                "config": v.get("config", {}),
                "is_control": v.get("is_control", False)
            }
            for v in variants
        ],
        "assignment_type": data.get("assignment_type", "both"),  # cookie, user, both
        "min_sample_size": data.get("min_sample_size", 100),
        "confidence_level": data.get("confidence_level", 95),
        # Smart Winner settings
        "smart_winner": {
            "enabled": data.get("smart_winner_enabled", False),
            "strategy": data.get("smart_winner_strategy", "notify"),  # notify, auto_rollout, gradual
            "min_runtime_hours": data.get("min_runtime_hours", 48),
            "auto_stop_on_significance": data.get("auto_stop_on_significance", True),
            "notification_emails": data.get("notification_emails", []),
        },
        "status": "draft",
        "created_by": admin.get("id"),
        "created_at": now,
        "updated_at": now,
        "started_at": None,
        "ended_at": None,
        "winner_variant_id": None,
        "winner_declared_at": None,
        "winner_declared_by": None,  # "auto" or admin_id
    }
    
    await db.ab_experiments.insert_one(experiment)
    logger.info(f"Experiment created: {experiment['name']} by {admin.get('email')}")
    
    return {"message": "Experiment created", "experiment_id": experiment["id"]}

@app.put("/api/admin/experiments/{experiment_id}")
async def update_experiment(experiment_id: str, request: Request, admin: dict = Depends(get_current_admin)):
    """Update experiment (only allowed when in draft status)"""
    experiment = await db.ab_experiments.find_one({"id": experiment_id})
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    if experiment.get("status") not in ["draft", "paused"]:
        raise HTTPException(status_code=400, detail="Can only edit draft or paused experiments")
    
    data = await request.json()
    
    allowed_fields = ["name", "description", "hypothesis", "target_page", "goal_type", 
                      "goal_event", "variants", "min_sample_size", "confidence_level"]
    
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.ab_experiments.update_one({"id": experiment_id}, {"$set": update_data})
    
    return {"message": "Experiment updated"}

@app.post("/api/admin/experiments/{experiment_id}/start")
async def start_experiment(experiment_id: str, admin: dict = Depends(get_current_admin)):
    """Start an experiment"""
    experiment = await db.ab_experiments.find_one({"id": experiment_id})
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    if experiment.get("status") not in ["draft", "paused"]:
        raise HTTPException(status_code=400, detail="Can only start draft or paused experiments")
    
    now = datetime.now(timezone.utc)
    await db.ab_experiments.update_one(
        {"id": experiment_id},
        {"$set": {"status": "running", "started_at": now, "updated_at": now}}
    )
    
    logger.info(f"Experiment started: {experiment['name']} by {admin.get('email')}")
    return {"message": "Experiment started"}

@app.post("/api/admin/experiments/{experiment_id}/pause")
async def pause_experiment(experiment_id: str, admin: dict = Depends(get_current_admin)):
    """Pause a running experiment"""
    experiment = await db.ab_experiments.find_one({"id": experiment_id})
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    if experiment.get("status") != "running":
        raise HTTPException(status_code=400, detail="Can only pause running experiments")
    
    await db.ab_experiments.update_one(
        {"id": experiment_id},
        {"$set": {"status": "paused", "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": "Experiment paused"}

@app.post("/api/admin/experiments/{experiment_id}/stop")
async def stop_experiment(experiment_id: str, request: Request, admin: dict = Depends(get_current_admin)):
    """Stop experiment and optionally declare winner"""
    experiment = await db.ab_experiments.find_one({"id": experiment_id})
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    data = await request.json()
    winner_variant_id = data.get("winner_variant_id")
    
    now = datetime.now(timezone.utc)
    update = {
        "status": "completed",
        "ended_at": now,
        "updated_at": now
    }
    
    if winner_variant_id:
        update["winner_variant_id"] = winner_variant_id
    
    await db.ab_experiments.update_one({"id": experiment_id}, {"$set": update})
    
    logger.info(f"Experiment stopped: {experiment['name']} by {admin.get('email')}, winner: {winner_variant_id}")
    return {"message": "Experiment stopped"}

@app.delete("/api/admin/experiments/{experiment_id}")
async def delete_experiment(experiment_id: str, admin: dict = Depends(get_current_admin)):
    """Delete an experiment and its data"""
    experiment = await db.ab_experiments.find_one({"id": experiment_id})
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    if experiment.get("status") == "running":
        raise HTTPException(status_code=400, detail="Cannot delete running experiments")
    
    await db.ab_experiments.delete_one({"id": experiment_id})
    await db.ab_assignments.delete_many({"experiment_id": experiment_id})
    await db.ab_events.delete_many({"experiment_id": experiment_id})
    
    return {"message": "Experiment deleted"}

@app.get("/api/admin/experiments/stats/overview")
async def get_experiments_overview(admin: dict = Depends(get_current_admin)):
    """Get overview stats for all experiments"""
    total = await db.ab_experiments.count_documents({})
    running = await db.ab_experiments.count_documents({"status": "running"})
    completed = await db.ab_experiments.count_documents({"status": "completed"})
    
    total_participants = await db.ab_assignments.count_documents({})
    total_events = await db.ab_events.count_documents({})
    
    # Get experiments with significant results
    significant_winners = await db.ab_experiments.count_documents({"winner_variant_id": {"$ne": None}})
    
    return {
        "total_experiments": total,
        "running_experiments": running,
        "completed_experiments": completed,
        "total_participants": total_participants,
        "total_events": total_events,
        "experiments_with_winners": significant_winners
    }

# Public API for client-side tracking (no admin auth required)
@app.post("/api/ab/assign")
async def assign_variant(request: Request):
    """Assign a user to an experiment variant"""
    data = await request.json()
    experiment_id = data.get("experiment_id")
    user_id = data.get("user_id")  # Optional - for logged-in users
    visitor_id = data.get("visitor_id")  # Cookie-based ID
    
    if not experiment_id or (not user_id and not visitor_id):
        raise HTTPException(status_code=400, detail="experiment_id and user_id or visitor_id required")
    
    # Check if experiment exists and is running
    experiment = await db.ab_experiments.find_one({"id": experiment_id, "status": "running"}, {"_id": 0})
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found or not running")
    
    # Check for existing assignment
    query = {"experiment_id": experiment_id}
    if user_id:
        query["$or"] = [{"user_id": user_id}, {"visitor_id": visitor_id}]
    else:
        query["visitor_id"] = visitor_id
    
    existing = await db.ab_assignments.find_one(query, {"_id": 0})
    if existing:
        return {"variant_id": existing["variant_id"], "variant_config": existing.get("variant_config", {})}
    
    # Assign variant based on traffic weights
    import random
    variants = experiment.get("variants", [])
    rand = random.uniform(0, 100)
    cumulative = 0
    assigned_variant = variants[0] if variants else None
    
    for variant in variants:
        cumulative += variant.get("traffic_percent", 0)
        if rand <= cumulative:
            assigned_variant = variant
            break
    
    if not assigned_variant:
        raise HTTPException(status_code=500, detail="Failed to assign variant")
    
    # Create assignment
    assignment = {
        "id": str(uuid.uuid4()),
        "experiment_id": experiment_id,
        "variant_id": assigned_variant["id"],
        "user_id": user_id,
        "visitor_id": visitor_id,
        "variant_config": assigned_variant.get("config", {}),
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.ab_assignments.insert_one(assignment)
    
    return {
        "variant_id": assigned_variant["id"],
        "variant_name": assigned_variant["name"],
        "variant_config": assigned_variant.get("config", {})
    }

@app.post("/api/ab/track")
async def track_event(request: Request):
    """Track an event for an experiment"""
    data = await request.json()
    experiment_id = data.get("experiment_id")
    variant_id = data.get("variant_id")
    event_type = data.get("event_type")  # click, conversion, consent, custom
    user_id = data.get("user_id")
    visitor_id = data.get("visitor_id")
    metadata = data.get("metadata", {})
    
    if not experiment_id or not variant_id or not event_type:
        raise HTTPException(status_code=400, detail="experiment_id, variant_id, and event_type required")
    
    event = {
        "id": str(uuid.uuid4()),
        "experiment_id": experiment_id,
        "variant_id": variant_id,
        "event_type": event_type,
        "user_id": user_id,
        "visitor_id": visitor_id,
        "metadata": metadata,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.ab_events.insert_one(event)
    
    return {"message": "Event tracked"}

# Smart Winner evaluation function
async def evaluate_experiment_for_winner(experiment_id: str) -> dict:
    """Evaluate if an experiment has a statistically significant winner"""
    experiment = await db.ab_experiments.find_one({"id": experiment_id}, {"_id": 0})
    if not experiment or experiment.get("status") != "running":
        return {"has_winner": False, "reason": "Experiment not running"}
    
    smart_winner = experiment.get("smart_winner", {})
    if not smart_winner.get("enabled"):
        return {"has_winner": False, "reason": "Smart winner not enabled"}
    
    # Check minimum runtime
    started_at = experiment.get("started_at")
    if started_at:
        if isinstance(started_at, str):
            started_at = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
        min_hours = smart_winner.get("min_runtime_hours", 48)
        runtime = (datetime.now(timezone.utc) - started_at).total_seconds() / 3600
        if runtime < min_hours:
            return {"has_winner": False, "reason": f"Min runtime not met ({runtime:.1f}/{min_hours}h)"}
    
    # Get results for each variant
    variants = experiment.get("variants", [])
    min_sample = experiment.get("min_sample_size", 100)
    confidence = experiment.get("confidence_level", 95)
    goal_type = experiment.get("goal_type", "conversion")
    
    # Map goal type to event type
    event_type_map = {"conversion": "conversion", "click": "click", "consent": "consent"}
    target_event = event_type_map.get(goal_type, "conversion")
    
    results = []
    control_result = None
    
    for variant in variants:
        participants = await db.ab_assignments.count_documents({
            "experiment_id": experiment_id,
            "variant_id": variant["id"]
        })
        
        if participants < min_sample:
            return {"has_winner": False, "reason": f"Min sample not met for {variant['name']}"}
        
        conversions = await db.ab_events.count_documents({
            "experiment_id": experiment_id,
            "variant_id": variant["id"],
            "event_type": target_event
        })
        
        rate = conversions / participants if participants > 0 else 0
        
        result = {
            "variant_id": variant["id"],
            "variant_name": variant["name"],
            "is_control": variant.get("is_control", False),
            "participants": participants,
            "conversions": conversions,
            "rate": rate
        }
        results.append(result)
        
        if variant.get("is_control"):
            control_result = result
    
    if not control_result:
        control_result = results[0]  # Use first variant as control
    
    # Find best performing non-control variant
    best_variant = None
    best_improvement = 0
    is_significant = False
    
    for result in results:
        if result["variant_id"] == control_result["variant_id"]:
            continue
        
        # Calculate z-score
        p1 = control_result["rate"]
        p2 = result["rate"]
        n1 = control_result["participants"]
        n2 = result["participants"]
        
        if p1 + p2 > 0 and n1 > 0 and n2 > 0:
            p_pooled = (p1 * n1 + p2 * n2) / (n1 + n2)
            if p_pooled > 0 and p_pooled < 1:
                se = (p_pooled * (1 - p_pooled) * (1/n1 + 1/n2)) ** 0.5
                if se > 0:
                    z = (p2 - p1) / se
                    
                    # Z-score thresholds: 90%=1.645, 95%=1.96, 99%=2.576
                    z_threshold = {90: 1.645, 95: 1.96, 99: 2.576}.get(confidence, 1.96)
                    
                    if z > z_threshold:  # Positive z means variant beats control
                        improvement = ((p2 - p1) / p1 * 100) if p1 > 0 else 0
                        if improvement > best_improvement:
                            best_improvement = improvement
                            best_variant = result
                            is_significant = True
    
    if is_significant and best_variant:
        return {
            "has_winner": True,
            "winner_variant_id": best_variant["variant_id"],
            "winner_variant_name": best_variant["variant_name"],
            "improvement": round(best_improvement, 2),
            "control_rate": round(control_result["rate"] * 100, 2),
            "winner_rate": round(best_variant["rate"] * 100, 2),
            "confidence": confidence
        }
    
    return {"has_winner": False, "reason": "No statistically significant winner yet"}

@app.post("/api/admin/experiments/{experiment_id}/evaluate")
async def evaluate_experiment(experiment_id: str, admin: dict = Depends(get_current_admin)):
    """Manually trigger winner evaluation for an experiment"""
    result = await evaluate_experiment_for_winner(experiment_id)
    return result

@app.post("/api/admin/experiments/check-all-winners")
async def check_all_experiments_for_winners(admin: dict = Depends(get_current_admin)):
    """Check all running experiments for winners (admin triggered)"""
    running = await db.ab_experiments.find({"status": "running"}, {"_id": 0}).to_list(length=100)
    
    results = []
    winners_found = 0
    
    for exp in running:
        smart_winner = exp.get("smart_winner", {})
        if not smart_winner.get("enabled"):
            continue
        
        eval_result = await evaluate_experiment_for_winner(exp["id"])
        
        if eval_result.get("has_winner"):
            winners_found += 1
            
            # Create notification
            notification = {
                "id": str(uuid.uuid4()),
                "type": "ab_winner_found",
                "experiment_id": exp["id"],
                "experiment_name": exp["name"],
                "winner_variant_id": eval_result["winner_variant_id"],
                "winner_variant_name": eval_result["winner_variant_name"],
                "improvement": eval_result["improvement"],
                "message": f"Experiment '{exp['name']}' has a winner! {eval_result['winner_variant_name']} outperforms control by {eval_result['improvement']}%",
                "is_read": False,
                "created_at": datetime.now(timezone.utc)
            }
            await db.admin_notifications.insert_one(notification)
            
            # If strategy is auto_rollout, declare winner
            if smart_winner.get("strategy") == "auto_rollout":
                now = datetime.now(timezone.utc)
                await db.ab_experiments.update_one(
                    {"id": exp["id"]},
                    {"$set": {
                        "status": "completed",
                        "winner_variant_id": eval_result["winner_variant_id"],
                        "winner_declared_at": now,
                        "winner_declared_by": "auto",
                        "ended_at": now,
                        "updated_at": now
                    }}
                )
                eval_result["auto_stopped"] = True
            
            results.append({
                "experiment_id": exp["id"],
                "experiment_name": exp["name"],
                **eval_result
            })
    
    return {
        "checked": len(running),
        "winners_found": winners_found,
        "results": results
    }

@app.get("/api/admin/ab-testing/winner-notifications")
async def get_winner_notifications(admin: dict = Depends(get_current_admin)):
    """Get A/B testing winner notifications"""
    notifications = await db.admin_notifications.find(
        {"type": "ab_winner_found"},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(length=50)
    
    return {"notifications": notifications}

@app.put("/api/admin/ab-testing/notifications/{notification_id}/read")
async def mark_ab_notification_read(notification_id: str, admin: dict = Depends(get_current_admin)):
    """Mark A/B notification as read"""
    await db.admin_notifications.update_one(
        {"id": notification_id},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc)}}
    )
    return {"message": "Notification marked as read"}

# =============================================================================
# SCHEDULED A/B WINNER CHECKING (Background Job)
# =============================================================================

# Global flag to track if scheduler is running
ab_scheduler_running = False

async def scheduled_winner_check():
    """Background task to check for A/B test winners every 6 hours"""
    global ab_scheduler_running
    
    # Check interval in seconds (6 hours = 21600 seconds)
    CHECK_INTERVAL = int(os.environ.get('AB_CHECK_INTERVAL_HOURS', 6)) * 3600
    
    logger.info(f"A/B Winner Checker started - will check every {CHECK_INTERVAL // 3600} hours")
    
    while ab_scheduler_running:
        try:
            # Wait for the interval
            await asyncio.sleep(CHECK_INTERVAL)
            
            if not ab_scheduler_running:
                break
            
            logger.info("Running scheduled A/B winner check...")
            
            # Get all running experiments with smart_winner enabled
            running = await db.ab_experiments.find({
                "status": "running",
                "smart_winner.enabled": True
            }, {"_id": 0}).to_list(length=100)
            
            winners_found = 0
            
            for exp in running:
                try:
                    eval_result = await evaluate_experiment_for_winner(exp["id"])
                    
                    if eval_result.get("has_winner"):
                        winners_found += 1
                        smart_winner = exp.get("smart_winner", {})
                        
                        # Create notification
                        notification = {
                            "id": str(uuid.uuid4()),
                            "type": "ab_winner_found",
                            "experiment_id": exp["id"],
                            "experiment_name": exp["name"],
                            "winner_variant_id": eval_result["winner_variant_id"],
                            "winner_variant_name": eval_result["winner_variant_name"],
                            "improvement": eval_result["improvement"],
                            "message": f"[Auto] Experiment '{exp['name']}' has a winner! {eval_result['winner_variant_name']} outperforms control by {eval_result['improvement']}%",
                            "is_read": False,
                            "source": "scheduled_check",
                            "created_at": datetime.now(timezone.utc)
                        }
                        await db.admin_notifications.insert_one(notification)
                        
                        logger.info(f"Winner found for experiment '{exp['name']}': {eval_result['winner_variant_name']}")
                        
                        # Send email notification if emails configured
                        notification_emails = smart_winner.get("notification_emails", [])
                        if notification_emails:
                            await send_ab_winner_email(
                                to_emails=notification_emails,
                                experiment_name=exp["name"],
                                winner_variant_name=eval_result["winner_variant_name"],
                                improvement=eval_result["improvement"],
                                control_rate=eval_result.get("control_rate", 0),
                                winner_rate=eval_result.get("winner_rate", 0),
                                experiment_id=exp["id"]
                            )
                        
                        # If strategy is auto_rollout, declare winner
                        if smart_winner.get("strategy") == "auto_rollout":
                            now = datetime.now(timezone.utc)
                            await db.ab_experiments.update_one(
                                {"id": exp["id"]},
                                {"$set": {
                                    "status": "completed",
                                    "winner_variant_id": eval_result["winner_variant_id"],
                                    "winner_declared_at": now,
                                    "winner_declared_by": "auto_scheduled",
                                    "ended_at": now,
                                    "updated_at": now
                                }}
                            )
                            logger.info(f"Auto-stopped experiment '{exp['name']}' with winner")
                        
                        # If strategy is gradual, increase winner traffic
                        elif smart_winner.get("strategy") == "gradual":
                            # Find current winner traffic
                            variants = exp.get("variants", [])
                            winner_variant = None
                            for v in variants:
                                if v["id"] == eval_result["winner_variant_id"]:
                                    winner_variant = v
                                    break
                            
                            if winner_variant:
                                current_traffic = winner_variant.get("traffic_percent", 50)
                                # Gradual increase: 50 -> 75 -> 100
                                if current_traffic < 75:
                                    new_traffic = 75
                                elif current_traffic < 100:
                                    new_traffic = 100
                                else:
                                    new_traffic = current_traffic
                                
                                if new_traffic > current_traffic:
                                    # Update variant traffic
                                    remaining = 100 - new_traffic
                                    other_count = len(variants) - 1
                                    other_traffic = remaining // other_count if other_count > 0 else 0
                                    
                                    new_variants = []
                                    for v in variants:
                                        if v["id"] == eval_result["winner_variant_id"]:
                                            v["traffic_percent"] = new_traffic
                                        else:
                                            v["traffic_percent"] = other_traffic
                                        new_variants.append(v)
                                    
                                    await db.ab_experiments.update_one(
                                        {"id": exp["id"]},
                                        {"$set": {"variants": new_variants, "updated_at": datetime.now(timezone.utc)}}
                                    )
                                    logger.info(f"Gradual rollout: Increased winner traffic to {new_traffic}% for '{exp['name']}'")
                                    
                                    # If reached 100%, complete the experiment
                                    if new_traffic >= 100:
                                        now = datetime.now(timezone.utc)
                                        await db.ab_experiments.update_one(
                                            {"id": exp["id"]},
                                            {"$set": {
                                                "status": "completed",
                                                "winner_variant_id": eval_result["winner_variant_id"],
                                                "winner_declared_at": now,
                                                "winner_declared_by": "gradual_rollout",
                                                "ended_at": now
                                            }}
                                        )
                
                except Exception as e:
                    logger.error(f"Error evaluating experiment {exp.get('id')}: {e}")
            
            # Log scheduled check to DB
            await db.scheduled_jobs_log.insert_one({
                "id": str(uuid.uuid4()),
                "job_type": "ab_winner_check",
                "experiments_checked": len(running),
                "winners_found": winners_found,
                "completed_at": datetime.now(timezone.utc)
            })
            
            logger.info(f"Scheduled A/B check complete: {len(running)} experiments, {winners_found} winners found")
            
        except asyncio.CancelledError:
            logger.info("A/B Winner Checker cancelled")
            break
        except Exception as e:
            logger.error(f"Error in scheduled winner check: {e}")
            # Continue running even if there's an error
            await asyncio.sleep(60)  # Brief pause before retrying

@app.on_event("startup")
async def start_ab_scheduler():
    """Start the A/B winner checker background task on server startup"""
    global ab_scheduler_running
    ab_scheduler_running = True
    asyncio.create_task(scheduled_winner_check())
    logger.info("A/B Winner Scheduler initialized")

@app.on_event("shutdown")
async def stop_ab_scheduler():
    """Stop the A/B winner checker on server shutdown"""
    global ab_scheduler_running
    ab_scheduler_running = False
    logger.info("A/B Winner Scheduler stopped")

@app.get("/api/admin/ab-testing/scheduler-status")
async def get_scheduler_status(admin: dict = Depends(get_current_admin)):
    """Get status of the A/B testing scheduler"""
    # Get last check log
    last_check = await db.scheduled_jobs_log.find_one(
        {"job_type": "ab_winner_check"},
        {"_id": 0}
    )
    if last_check:
        last_check = await db.scheduled_jobs_log.find(
            {"job_type": "ab_winner_check"},
            {"_id": 0}
        ).sort("completed_at", -1).limit(1).to_list(length=1)
        last_check = last_check[0] if last_check else None
    
    check_interval = int(os.environ.get('AB_CHECK_INTERVAL_HOURS', 6))
    
    return {
        "scheduler_running": ab_scheduler_running,
        "check_interval_hours": check_interval,
        "last_check": last_check,
        "next_check_approx": (datetime.now(timezone.utc) + timedelta(hours=check_interval)).isoformat() if ab_scheduler_running else None
    }

@app.post("/api/admin/ab-testing/trigger-check")
async def trigger_manual_check(admin: dict = Depends(get_current_admin)):
    """Manually trigger an immediate winner check (same as Check Winners button)"""
    running = await db.ab_experiments.find({
        "status": "running",
        "smart_winner.enabled": True
    }, {"_id": 0}).to_list(length=100)
    
    results = []
    winners_found = 0
    emails_sent = 0
    
    for exp in running:
        eval_result = await evaluate_experiment_for_winner(exp["id"])
        
        if eval_result.get("has_winner"):
            winners_found += 1
            smart_winner = exp.get("smart_winner", {})
            
            # Create notification
            notification = {
                "id": str(uuid.uuid4()),
                "type": "ab_winner_found",
                "experiment_id": exp["id"],
                "experiment_name": exp["name"],
                "winner_variant_id": eval_result["winner_variant_id"],
                "winner_variant_name": eval_result["winner_variant_name"],
                "improvement": eval_result["improvement"],
                "message": f"Experiment '{exp['name']}' has a winner! {eval_result['winner_variant_name']} outperforms control by {eval_result['improvement']}%",
                "is_read": False,
                "source": "manual_trigger",
                "created_at": datetime.now(timezone.utc)
            }
            await db.admin_notifications.insert_one(notification)
            
            # Send email notification if emails configured
            notification_emails = smart_winner.get("notification_emails", [])
            if notification_emails:
                email_sent = await send_ab_winner_email(
                    to_emails=notification_emails,
                    experiment_name=exp["name"],
                    winner_variant_name=eval_result["winner_variant_name"],
                    improvement=eval_result["improvement"],
                    control_rate=eval_result.get("control_rate", 0),
                    winner_rate=eval_result.get("winner_rate", 0),
                    experiment_id=exp["id"]
                )
                if email_sent:
                    emails_sent += 1
            
            # If strategy is auto_rollout, declare winner
            if smart_winner.get("strategy") == "auto_rollout":
                now = datetime.now(timezone.utc)
                await db.ab_experiments.update_one(
                    {"id": exp["id"]},
                    {"$set": {
                        "status": "completed",
                        "winner_variant_id": eval_result["winner_variant_id"],
                        "winner_declared_at": now,
                        "winner_declared_by": "auto",
                        "ended_at": now,
                        "updated_at": now
                    }}
                )
                eval_result["auto_stopped"] = True
            
            results.append({
                "experiment_id": exp["id"],
                "experiment_name": exp["name"],
                **eval_result
            })
    
    # Log the manual check
    await db.scheduled_jobs_log.insert_one({
        "id": str(uuid.uuid4()),
        "job_type": "ab_winner_check",
        "source": "manual",
        "triggered_by": admin.get("email"),
        "experiments_checked": len(running),
        "winners_found": winners_found,
        "emails_sent": emails_sent,
        "completed_at": datetime.now(timezone.utc)
    })
    
    return {
        "checked": len(running),
        "winners_found": winners_found,
        "emails_sent": emails_sent,
        "results": results
    }

# =============================================================================
# INVOICES API
# =============================================================================

@app.get("/api/admin/invoices")
async def get_invoices(
    admin: dict = Depends(get_current_admin),
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    transaction_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    """Get all invoices with filters and pagination"""
    query = {}
    
    if search:
        query["$or"] = [
            {"invoice_number": {"$regex": search, "$options": "i"}},
            {"user_email": {"$regex": search, "$options": "i"}},
            {"user_name": {"$regex": search, "$options": "i"}},
        ]
    
    if status:
        query["status"] = status
    
    if transaction_type:
        query["transaction_type"] = transaction_type
    
    if date_from:
        try:
            query["created_at"] = {"$gte": datetime.fromisoformat(date_from.replace('Z', '+00:00'))}
        except:
            pass
    
    if date_to:
        try:
            if "created_at" in query:
                query["created_at"]["$lte"] = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            else:
                query["created_at"] = {"$lte": datetime.fromisoformat(date_to.replace('Z', '+00:00'))}
        except:
            pass
    
    # Get total count
    total = await db.invoices.count_documents(query)
    
    # Get invoices
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    # Get stats
    stats_pipeline = [
        {
            "$group": {
                "_id": None,
                "total_invoices": {"$sum": 1},
                "total_revenue": {"$sum": {"$cond": [{"$eq": ["$status", "paid"]}, "$amount", 0]}},
                "paid_count": {"$sum": {"$cond": [{"$eq": ["$status", "paid"]}, 1, 0]}},
                "pending_count": {"$sum": {"$cond": [{"$eq": ["$status", "pending"]}, 1, 0]}},
                "refunded_count": {"$sum": {"$cond": [{"$eq": ["$status", "refunded"]}, 1, 0]}},
            }
        }
    ]
    
    stats_result = await db.invoices.aggregate(stats_pipeline).to_list(length=1)
    
    # Get this month's revenue
    now = datetime.now(timezone.utc)
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    month_revenue = await db.invoices.aggregate([
        {"$match": {"status": "paid", "created_at": {"$gte": first_of_month}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(length=1)
    
    stats = {
        "total_invoices": stats_result[0]["total_invoices"] if stats_result else 0,
        "total_revenue": stats_result[0]["total_revenue"] if stats_result else 0,
        "paid_count": stats_result[0]["paid_count"] if stats_result else 0,
        "pending_count": stats_result[0]["pending_count"] if stats_result else 0,
        "refunded_count": stats_result[0]["refunded_count"] if stats_result else 0,
        "this_month_revenue": month_revenue[0]["total"] if month_revenue else 0,
    }
    
    return {
        "invoices": invoices,
        "total": total,
        "stats": stats
    }

@app.get("/api/admin/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, admin: dict = Depends(get_current_admin)):
    """Get a single invoice by ID"""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@app.get("/api/admin/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(invoice_id: str, admin: dict = Depends(get_current_admin)):
    """Generate and download invoice as PDF"""
    from fastapi.responses import StreamingResponse
    import io
    
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Generate simple PDF-like content (for real PDF, you'd use reportlab or weasyprint)
    # For now, we'll generate a simple HTML that browsers can print to PDF
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }}
            .header {{ text-align: center; margin-bottom: 30px; }}
            .header h1 {{ color: #4CAF50; margin-bottom: 5px; }}
            .invoice-info {{ display: flex; justify-content: space-between; margin-bottom: 30px; }}
            .info-section {{ width: 48%; }}
            .info-section h3 {{ color: #333; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }}
            table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
            th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #eee; }}
            th {{ background: #f5f5f5; font-weight: 600; }}
            .total-row {{ font-weight: bold; font-size: 18px; }}
            .status-paid {{ color: #4CAF50; }}
            .status-pending {{ color: #FF9800; }}
            .status-failed {{ color: #F44336; }}
            .footer {{ text-align: center; margin-top: 40px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>INVOICE</h1>
            <p>Invoice #{invoice.get('invoice_number', 'N/A')}</p>
        </div>
        
        <div class="invoice-info">
            <div class="info-section">
                <h3>Bill To</h3>
                <p><strong>{invoice.get('user_name', 'Customer')}</strong></p>
                <p>{invoice.get('user_email', 'N/A')}</p>
            </div>
            <div class="info-section" style="text-align: right;">
                <h3>Invoice Details</h3>
                <p><strong>Date:</strong> {invoice.get('created_at', 'N/A')[:10] if invoice.get('created_at') else 'N/A'}</p>
                <p><strong>Status:</strong> <span class="status-{invoice.get('status', 'pending')}">{invoice.get('status', 'N/A').upper()}</span></p>
                <p><strong>Payment Method:</strong> {invoice.get('payment_method', 'N/A')}</p>
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th style="text-align: center;">Qty</th>
                    <th style="text-align: right;">Unit Price</th>
                    <th style="text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
    """
    
    items = invoice.get('items', [])
    for item in items:
        html_content += f"""
                <tr>
                    <td>{item.get('description', 'Item')}</td>
                    <td style="text-align: center;">{item.get('quantity', 1)}</td>
                    <td style="text-align: right;">${item.get('unit_price', 0):.2f}</td>
                    <td style="text-align: right;">${item.get('total', 0):.2f}</td>
                </tr>
        """
    
    html_content += f"""
                <tr class="total-row">
                    <td colspan="3" style="text-align: right;">Total</td>
                    <td style="text-align: right;">${invoice.get('amount', 0):.2f} {invoice.get('currency', 'USD')}</td>
                </tr>
            </tbody>
        </table>
        
        <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>Avida Marketplace - Your local marketplace</p>
        </div>
    </body>
    </html>
    """
    
    # Return as HTML that can be printed to PDF
    return Response(
        content=html_content,
        media_type="text/html",
        headers={
            "Content-Disposition": f"attachment; filename=invoice-{invoice.get('invoice_number', invoice_id)}.html"
        }
    )

# =============================================================================
# BADGES API
# =============================================================================

@app.get("/api/admin/badges")
async def get_badges(admin: dict = Depends(get_current_admin)):
    """Get all badge definitions with stats"""
    badges = await db.badges.find({}, {"_id": 0}).sort("created_at", -1).to_list(length=100)
    
    # Get stats
    total_badges = len(badges)
    active_badges = len([b for b in badges if b.get("is_active", True)])
    
    # Count total awards
    total_awards = await db.user_badges.count_documents({})
    
    # Count unique users with badges
    users_pipeline = [
        {"$group": {"_id": "$user_id"}},
        {"$count": "total"}
    ]
    users_result = await db.user_badges.aggregate(users_pipeline).to_list(length=1)
    users_with_badges = users_result[0]["total"] if users_result else 0
    
    # Get most awarded badge
    most_awarded_pipeline = [
        {"$group": {"_id": "$badge_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 1}
    ]
    most_awarded_result = await db.user_badges.aggregate(most_awarded_pipeline).to_list(length=1)
    most_awarded_badge = ""
    if most_awarded_result:
        badge = await db.badges.find_one({"id": most_awarded_result[0]["_id"]}, {"_id": 0, "name": 1})
        most_awarded_badge = badge.get("name", "") if badge else ""
    
    # Get recent awards (last 7 days)
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_awards = await db.user_badges.count_documents({"awarded_at": {"$gte": seven_days_ago}})
    
    return {
        "badges": badges,
        "stats": {
            "total_badges": total_badges,
            "active_badges": active_badges,
            "total_awards": total_awards,
            "users_with_badges": users_with_badges,
            "most_awarded_badge": most_awarded_badge,
            "recent_awards": recent_awards
        }
    }

@app.post("/api/admin/badges")
async def create_badge(request: Request, admin: dict = Depends(get_current_admin)):
    """Create a new badge"""
    data = await request.json()
    
    badge = {
        "id": str(uuid.uuid4()),
        "name": data.get("name"),
        "description": data.get("description", ""),
        "icon": data.get("icon", "verified"),
        "color": data.get("color", "#4CAF50"),
        "type": data.get("type", "achievement"),
        "criteria": data.get("criteria"),
        "auto_award": data.get("auto_award", False),
        "points_value": data.get("points_value", 10),
        "display_priority": data.get("display_priority", 0),
        "is_active": data.get("is_active", True),
        "created_at": datetime.now(timezone.utc),
        "created_by": admin.get("email")
    }
    
    await db.badges.insert_one(badge)
    
    # Log the action
    await db.admin_audit_log.insert_one({
        "action": "badge_created",
        "admin_email": admin.get("email"),
        "badge_id": badge["id"],
        "badge_name": badge["name"],
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"success": True, "badge": {k: v for k, v in badge.items() if k != "_id"}}

@app.put("/api/admin/badges/{badge_id}")
async def update_badge(badge_id: str, request: Request, admin: dict = Depends(get_current_admin)):
    """Update a badge"""
    data = await request.json()
    
    update_data = {
        "name": data.get("name"),
        "description": data.get("description"),
        "icon": data.get("icon"),
        "color": data.get("color"),
        "type": data.get("type"),
        "criteria": data.get("criteria"),
        "auto_award": data.get("auto_award"),
        "points_value": data.get("points_value"),
        "display_priority": data.get("display_priority"),
        "is_active": data.get("is_active"),
        "updated_at": datetime.now(timezone.utc),
        "updated_by": admin.get("email")
    }
    
    # Remove None values
    update_data = {k: v for k, v in update_data.items() if v is not None}
    
    result = await db.badges.update_one({"id": badge_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Badge not found")
    
    return {"success": True}

@app.delete("/api/admin/badges/{badge_id}")
async def delete_badge(badge_id: str, admin: dict = Depends(get_current_admin)):
    """Delete a badge and revoke from all users"""
    # Delete badge definition
    result = await db.badges.delete_one({"id": badge_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Badge not found")
    
    # Remove from all users
    await db.user_badges.delete_many({"badge_id": badge_id})
    
    # Log the action
    await db.admin_audit_log.insert_one({
        "action": "badge_deleted",
        "admin_email": admin.get("email"),
        "badge_id": badge_id,
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"success": True}

@app.get("/api/admin/badges/users")
async def get_user_badges(
    admin: dict = Depends(get_current_admin),
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
    search: Optional[str] = None
):
    """Get all user badges with pagination"""
    query = {}
    
    if search:
        query["$or"] = [
            {"user_email": {"$regex": search, "$options": "i"}},
            {"user_name": {"$regex": search, "$options": "i"}}
        ]
    
    total = await db.user_badges.count_documents(query)
    user_badges = await db.user_badges.find(query, {"_id": 0}).sort("awarded_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    return {
        "user_badges": user_badges,
        "total": total
    }

@app.post("/api/admin/badges/award")
async def award_badge(request: Request, admin: dict = Depends(get_current_admin)):
    """Award a badge to a user"""
    data = await request.json()
    
    user_email = data.get("user_email")
    badge_id = data.get("badge_id")
    reason = data.get("reason", "")
    
    # Verify badge exists
    badge = await db.badges.find_one({"id": badge_id}, {"_id": 0})
    if not badge:
        raise HTTPException(status_code=404, detail="Badge not found")
    
    # Get user info
    user = await db.users.find_one({"email": user_email}, {"_id": 0, "user_id": 1, "name": 1, "email": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user already has this badge
    existing = await db.user_badges.find_one({"user_id": user.get("user_id"), "badge_id": badge_id})
    if existing:
        raise HTTPException(status_code=400, detail="User already has this badge")
    
    # Award the badge
    user_badge = {
        "id": str(uuid.uuid4()),
        "user_id": user.get("user_id"),
        "user_email": user_email,
        "user_name": user.get("name", "Unknown"),
        "badge_id": badge_id,
        "badge_name": badge.get("name"),
        "badge_icon": badge.get("icon"),
        "badge_color": badge.get("color"),
        "awarded_at": datetime.now(timezone.utc),
        "awarded_by": admin.get("email"),
        "reason": reason,
        "is_visible": True
    }
    
    await db.user_badges.insert_one(user_badge)
    
    # Update user's badges array
    await db.users.update_one(
        {"user_id": user.get("user_id")},
        {"$addToSet": {"badges": badge_id}}
    )
    
    # Log the action
    await db.admin_audit_log.insert_one({
        "action": "badge_awarded",
        "admin_email": admin.get("email"),
        "user_email": user_email,
        "badge_id": badge_id,
        "badge_name": badge.get("name"),
        "reason": reason,
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"success": True, "user_badge": {k: v for k, v in user_badge.items() if k != "_id"}}

@app.delete("/api/admin/badges/users/{user_badge_id}")
async def revoke_badge(user_badge_id: str, admin: dict = Depends(get_current_admin)):
    """Revoke a badge from a user"""
    user_badge = await db.user_badges.find_one({"id": user_badge_id}, {"_id": 0})
    if not user_badge:
        raise HTTPException(status_code=404, detail="User badge not found")
    
    # Remove the badge
    await db.user_badges.delete_one({"id": user_badge_id})
    
    # Update user's badges array
    await db.users.update_one(
        {"user_id": user_badge.get("user_id")},
        {"$pull": {"badges": user_badge.get("badge_id")}}
    )
    
    # Log the action
    await db.admin_audit_log.insert_one({
        "action": "badge_revoked",
        "admin_email": admin.get("email"),
        "user_email": user_badge.get("user_email"),
        "badge_id": user_badge.get("badge_id"),
        "badge_name": user_badge.get("badge_name"),
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"success": True}

# =============================================================================
# CHALLENGES MANAGEMENT
# =============================================================================

class ChallengeCreate(BaseModel):
    name: str
    description: str
    type: str = "seasonal"  # weekly, monthly, seasonal
    criteria: str  # listings_created, items_sold, total_sales_value, category_listings, category_sales
    target: int
    categories: List[str] = []
    start_date: datetime
    end_date: datetime
    badge_name: str
    badge_description: str
    badge_icon: str = "ribbon"
    badge_color: str = "#4CAF50"
    badge_points: int = 50
    theme: str = "default"
    is_active: bool = True

class ChallengeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    target: Optional[int] = None
    categories: Optional[List[str]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    badge_name: Optional[str] = None
    badge_description: Optional[str] = None
    badge_icon: Optional[str] = None
    badge_color: Optional[str] = None
    badge_points: Optional[int] = None
    theme: Optional[str] = None
    is_active: Optional[bool] = None

@app.get("/api/admin/challenges")
async def get_admin_challenges(
    type: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=100),
    admin: dict = Depends(get_current_admin)
):
    """Get all challenges with filtering options"""
    query = {"is_custom": True}  # Only show admin-created challenges
    if type:
        query["type"] = type
    if is_active is not None:
        query["is_active"] = is_active
    
    skip = (page - 1) * limit
    total = await db.custom_challenges.count_documents(query)
    
    challenges = await db.custom_challenges.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Get participation stats for each challenge
    for challenge in challenges:
        challenge_id = challenge.get("id")
        participants = await db.challenge_participants.count_documents({"challenge_id": challenge_id})
        completions = await db.challenge_completions.count_documents({"challenge_id": challenge_id})
        challenge["stats"] = {
            "participants": participants,
            "completions": completions,
            "completion_rate": round((completions / participants * 100) if participants > 0 else 0, 1)
        }
    
    return {
        "challenges": challenges,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }

@app.post("/api/admin/challenges")
async def create_admin_challenge(
    challenge: ChallengeCreate,
    admin: dict = Depends(get_current_admin)
):
    """Create a new custom challenge"""
    challenge_id = f"custom_{uuid.uuid4().hex[:8]}"
    
    challenge_doc = {
        "id": challenge_id,
        "name": challenge.name,
        "description": challenge.description,
        "type": challenge.type,
        "criteria": challenge.criteria,
        "target": challenge.target,
        "categories": challenge.categories,
        "start_date": challenge.start_date,
        "end_date": challenge.end_date,
        "badge_reward": {
            "name": challenge.badge_name,
            "description": challenge.badge_description,
            "icon": challenge.badge_icon,
            "color": challenge.badge_color,
            "points_value": challenge.badge_points,
        },
        "icon": challenge.badge_icon,
        "color": challenge.badge_color,
        "theme": challenge.theme,
        "is_active": challenge.is_active,
        "is_custom": True,
        "created_by": admin.get("email"),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    
    await db.custom_challenges.insert_one(challenge_doc)
    
    # Log the action
    await db.admin_audit_log.insert_one({
        "action": "challenge_created",
        "admin_email": admin.get("email"),
        "challenge_id": challenge_id,
        "challenge_name": challenge.name,
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"success": True, "challenge_id": challenge_id, "challenge": {**challenge_doc, "_id": None}}

@app.put("/api/admin/challenges/{challenge_id}")
async def update_admin_challenge(
    challenge_id: str,
    update: ChallengeUpdate,
    admin: dict = Depends(get_current_admin)
):
    """Update an existing custom challenge"""
    existing = await db.custom_challenges.find_one({"id": challenge_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    
    # Handle badge reward updates
    if any(k.startswith("badge_") for k in update_data):
        badge_reward = existing.get("badge_reward", {})
        if "badge_name" in update_data:
            badge_reward["name"] = update_data.pop("badge_name")
        if "badge_description" in update_data:
            badge_reward["description"] = update_data.pop("badge_description")
        if "badge_icon" in update_data:
            badge_reward["icon"] = update_data.pop("badge_icon")
            update_data["icon"] = badge_reward["icon"]
        if "badge_color" in update_data:
            badge_reward["color"] = update_data.pop("badge_color")
            update_data["color"] = badge_reward["color"]
        if "badge_points" in update_data:
            badge_reward["points_value"] = update_data.pop("badge_points")
        update_data["badge_reward"] = badge_reward
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.custom_challenges.update_one({"id": challenge_id}, {"$set": update_data})
    
    # Log the action
    await db.admin_audit_log.insert_one({
        "action": "challenge_updated",
        "admin_email": admin.get("email"),
        "challenge_id": challenge_id,
        "updates": list(update_data.keys()),
        "timestamp": datetime.now(timezone.utc)
    })
    
    updated = await db.custom_challenges.find_one({"id": challenge_id}, {"_id": 0})
    return {"success": True, "challenge": updated}

@app.delete("/api/admin/challenges/{challenge_id}")
async def delete_admin_challenge(
    challenge_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Delete a custom challenge"""
    existing = await db.custom_challenges.find_one({"id": challenge_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    # Soft delete by setting is_active to False
    await db.custom_challenges.update_one(
        {"id": challenge_id},
        {"$set": {"is_active": False, "deleted_at": datetime.now(timezone.utc), "deleted_by": admin.get("email")}}
    )
    
    # Log the action
    await db.admin_audit_log.insert_one({
        "action": "challenge_deleted",
        "admin_email": admin.get("email"),
        "challenge_id": challenge_id,
        "challenge_name": existing.get("name"),
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"success": True}

@app.get("/api/admin/challenges/{challenge_id}/leaderboard")
async def get_challenge_leaderboard(
    challenge_id: str,
    limit: int = Query(default=50, le=100),
    admin: dict = Depends(get_current_admin)
):
    """Get leaderboard for a specific challenge"""
    participants = await db.challenge_participants.find(
        {"challenge_id": challenge_id}
    ).sort("progress", -1).limit(limit).to_list(limit)
    
    user_ids = [p["user_id"] for p in participants]
    users = await db.users.find({"user_id": {"$in": user_ids}}, {"_id": 0, "user_id": 1, "name": 1, "email": 1}).to_list(limit)
    users_map = {u["user_id"]: u for u in users}
    
    # Get challenge target
    challenge = await db.custom_challenges.find_one({"id": challenge_id}) or {}
    target = challenge.get("target", 100)
    
    leaderboard = []
    for i, p in enumerate(participants):
        user = users_map.get(p["user_id"], {})
        leaderboard.append({
            "rank": i + 1,
            "user_id": p["user_id"],
            "user_name": user.get("name", "Unknown"),
            "user_email": user.get("email", ""),
            "progress": p.get("progress", 0),
            "target": target,
            "completed": p.get("progress", 0) >= target,
            "joined_at": p.get("joined_at"),
        })
    
    return {"leaderboard": leaderboard, "total": len(leaderboard)}

@app.get("/api/admin/challenges/stats/overview")
async def get_challenges_stats_overview(admin: dict = Depends(get_current_admin)):
    """Get overview stats for all challenges"""
    now = datetime.now(timezone.utc)
    
    # Custom challenges stats
    total_custom = await db.custom_challenges.count_documents({"is_custom": True})
    active_custom = await db.custom_challenges.count_documents({"is_custom": True, "is_active": True})
    
    # Active challenges (within date range)
    active_by_date = await db.custom_challenges.count_documents({
        "is_custom": True,
        "is_active": True,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now}
    })
    
    # Total participants and completions
    total_participants = await db.challenge_participants.count_documents({})
    total_completions = await db.challenge_completions.count_documents({})
    
    # Recent activity
    recent_joins = await db.challenge_participants.count_documents({
        "joined_at": {"$gte": now - timedelta(days=7)}
    })
    recent_completions = await db.challenge_completions.count_documents({
        "completed_at": {"$gte": now - timedelta(days=7)}
    })
    
    # Top challenges by participation
    pipeline = [
        {"$group": {"_id": "$challenge_id", "participants": {"$sum": 1}}},
        {"$sort": {"participants": -1}},
        {"$limit": 5}
    ]
    top_challenges = await db.challenge_participants.aggregate(pipeline).to_list(5)
    
    # Get challenge names
    challenge_ids = [c["_id"] for c in top_challenges]
    challenges = await db.custom_challenges.find({"id": {"$in": challenge_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(10)
    challenges_map = {c["id"]: c["name"] for c in challenges}
    
    for tc in top_challenges:
        tc["name"] = challenges_map.get(tc["_id"], tc["_id"])
    
    return {
        "total_custom_challenges": total_custom,
        "active_challenges": active_custom,
        "currently_running": active_by_date,
        "total_participants": total_participants,
        "total_completions": total_completions,
        "completion_rate": round((total_completions / total_participants * 100) if total_participants > 0 else 0, 1),
        "recent_activity": {
            "joins_last_7_days": recent_joins,
            "completions_last_7_days": recent_completions
        },
        "top_challenges": top_challenges
    }

# =============================================================================
# LEADERBOARD MANAGEMENT
# =============================================================================

@app.get("/api/admin/leaderboard")
async def get_admin_leaderboard(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, le=100),
    admin: dict = Depends(get_current_admin)
):
    """Get badge leaderboard with admin controls"""
    skip = (page - 1) * limit
    
    pipeline = [
        {"$group": {"_id": "$user_id", "badge_count": {"$sum": 1}}},
        {"$sort": {"badge_count": -1}},
        {"$skip": skip},
        {"$limit": limit}
    ]
    
    leaderboard_data = await db.user_badges.aggregate(pipeline).to_list(limit)
    
    # Get total count
    count_pipeline = [
        {"$group": {"_id": "$user_id"}},
        {"$count": "total"}
    ]
    count_result = await db.user_badges.aggregate(count_pipeline).to_list(1)
    total = count_result[0]["total"] if count_result else 0
    
    # Get user details
    user_ids = [item["_id"] for item in leaderboard_data]
    users = await db.users.find({"user_id": {"$in": user_ids}}, {"_id": 0}).to_list(limit)
    users_map = {u["user_id"]: u for u in users}
    
    leaderboard = []
    for i, item in enumerate(leaderboard_data):
        user = users_map.get(item["_id"], {})
        leaderboard.append({
            "rank": skip + i + 1,
            "user_id": item["_id"],
            "user_name": user.get("name", "Unknown"),
            "email": user.get("email", ""),
            "badge_count": item["badge_count"],
            "is_verified": user.get("is_verified", False),
            "created_at": user.get("created_at"),
            "last_active": user.get("last_seen"),
        })
    
    return {
        "leaderboard": leaderboard,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }

@app.get("/api/admin/leaderboard/user/{user_id}")
async def get_user_badge_details(user_id: str, admin: dict = Depends(get_current_admin)):
    """Get detailed badge info for a specific user"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all badges
    user_badges = await db.user_badges.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    badge_ids = [b["badge_id"] for b in user_badges]
    badges = await db.badges.find({"id": {"$in": badge_ids}}, {"_id": 0}).to_list(100)
    badges_map = {b["id"]: b for b in badges}
    
    # Get challenge completions
    completions = await db.challenge_completions.find({"user_id": user_id}, {"_id": 0}).to_list(50)
    
    # Get milestones
    milestones = await db.user_milestones.find({"user_id": user_id}, {"_id": 0}).to_list(50)
    
    # Calculate rank
    pipeline = [
        {"$group": {"_id": "$user_id", "badge_count": {"$sum": 1}}},
        {"$sort": {"badge_count": -1}}
    ]
    all_rankings = await db.user_badges.aggregate(pipeline).to_list(10000)
    user_rank = next((i + 1 for i, r in enumerate(all_rankings) if r["_id"] == user_id), None)
    
    return {
        "user": {
            "user_id": user.get("user_id"),
            "name": user.get("name"),
            "email": user.get("email"),
            "is_verified": user.get("is_verified", False),
        },
        "rank": user_rank,
        "total_badges": len(user_badges),
        "badges": [{
            "id": ub.get("badge_id"),
            "name": badges_map.get(ub.get("badge_id"), {}).get("name", "Unknown"),
            "earned_at": ub.get("earned_at"),
            "is_showcased": ub.get("is_showcased", False),
        } for ub in user_badges],
        "challenge_completions": completions,
        "milestones_achieved": len(milestones),
    }

# =============================================================================
# STREAK BONUSES
# =============================================================================

@app.get("/api/admin/streaks")
async def get_user_streaks(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, le=100),
    admin: dict = Depends(get_current_admin)
):
    """Get users with challenge completion streaks"""
    skip = (page - 1) * limit
    
    streaks = await db.user_streaks.find({}, {"_id": 0}).sort("current_streak", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.user_streaks.count_documents({})
    
    user_ids = [s["user_id"] for s in streaks]
    users = await db.users.find({"user_id": {"$in": user_ids}}, {"_id": 0, "user_id": 1, "name": 1, "email": 1}).to_list(limit)
    users_map = {u["user_id"]: u for u in users}
    
    for streak in streaks:
        user = users_map.get(streak["user_id"], {})
        streak["user_name"] = user.get("name", "Unknown")
        streak["user_email"] = user.get("email", "")
    
    return {
        "streaks": streaks,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }

# =============================================================================
# CHALLENGE EMAIL REMINDERS
# =============================================================================

@app.get("/api/admin/challenges/reminders")
async def get_challenge_reminders(admin: dict = Depends(get_current_admin)):
    """Get pending challenge reminder emails"""
    now = datetime.now(timezone.utc)
    
    # Find challenges ending in 1-3 days
    ending_soon = await db.custom_challenges.find({
        "is_active": True,
        "end_date": {
            "$gte": now,
            "$lte": now + timedelta(days=3)
        }
    }, {"_id": 0}).to_list(50)
    
    reminders = []
    for challenge in ending_soon:
        # Get participants who haven't completed
        participants = await db.challenge_participants.find({
            "challenge_id": challenge["id"]
        }).to_list(1000)
        
        completions = await db.challenge_completions.find({
            "challenge_id": challenge["id"]
        }).to_list(1000)
        completed_user_ids = {c["user_id"] for c in completions}
        
        incomplete_users = [p for p in participants if p["user_id"] not in completed_user_ids]
        
        time_left = challenge["end_date"] - now
        
        reminders.append({
            "challenge_id": challenge["id"],
            "challenge_name": challenge["name"],
            "end_date": challenge["end_date"],
            "days_remaining": time_left.days,
            "hours_remaining": time_left.seconds // 3600 if time_left.days == 0 else 0,
            "total_participants": len(participants),
            "incomplete_count": len(incomplete_users),
            "reminder_sent": challenge.get("reminder_sent", False),
        })
    
    return {"reminders": reminders}

@app.post("/api/admin/challenges/{challenge_id}/send-reminder")
async def send_challenge_reminder(
    challenge_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Send reminder emails to users who haven't completed the challenge"""
    challenge = await db.custom_challenges.find_one({"id": challenge_id})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    # Get participants who haven't completed
    participants = await db.challenge_participants.find({"challenge_id": challenge_id}).to_list(1000)
    completions = await db.challenge_completions.find({"challenge_id": challenge_id}).to_list(1000)
    completed_user_ids = {c["user_id"] for c in completions}
    
    incomplete_user_ids = [p["user_id"] for p in participants if p["user_id"] not in completed_user_ids]
    
    # Get user emails
    users = await db.users.find(
        {"user_id": {"$in": incomplete_user_ids}},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1}
    ).to_list(1000)
    
    # Calculate time remaining
    now = datetime.now(timezone.utc)
    time_left = challenge["end_date"] - now
    days_left = time_left.days
    
    # Send emails (using SendGrid if configured)
    sent_count = 0
    for user in users:
        if SENDGRID_API_KEY:
            try:
                async with httpx.AsyncClient() as client:
                    await client.post(
                        "https://api.sendgrid.com/v3/mail/send",
                        headers={
                            "Authorization": f"Bearer {SENDGRID_API_KEY}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "personalizations": [{"to": [{"email": user["email"]}]}],
                            "from": {"email": SENDGRID_FROM_EMAIL, "name": SENDGRID_FROM_NAME},
                            "subject": f"⏰ Only {days_left} days left: {challenge['name']}",
                            "content": [{
                                "type": "text/html",
                                "value": f"""
                                <h2>Don't miss out, {user.get('name', 'there')}!</h2>
                                <p>Your challenge <strong>{challenge['name']}</strong> ends in just {days_left} day{'s' if days_left != 1 else ''}!</p>
                                <p>{challenge['description']}</p>
                                <p>Complete the challenge to earn the exclusive <strong>{challenge['badge_reward']['name']}</strong> badge!</p>
                                <a href="https://analytics-dash-v2.preview.emergentagent.com/challenges" style="display:inline-block;padding:12px 24px;background:#2E7D32;color:white;text-decoration:none;border-radius:8px;">View Challenge</a>
                                """
                            }]
                        }
                    )
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send reminder to {user['email']}: {e}")
    
    # Mark reminder as sent
    await db.custom_challenges.update_one(
        {"id": challenge_id},
        {"$set": {"reminder_sent": True, "reminder_sent_at": now}}
    )
    
    # Log the action
    await db.admin_audit_log.insert_one({
        "action": "challenge_reminder_sent",
        "admin_email": admin.get("email"),
        "challenge_id": challenge_id,
        "recipients_count": sent_count,
        "timestamp": now
    })
    
    return {"success": True, "emails_sent": sent_count, "total_recipients": len(users)}

# =============================================================================
# PAST BADGES GALLERY
# =============================================================================

@app.get("/api/admin/badges/gallery")
async def get_past_badges_gallery(
    category: Optional[str] = None,
    year: Optional[int] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, le=100),
    admin: dict = Depends(get_current_admin)
):
    """Get gallery of past seasonal/challenge badges"""
    query = {"category": "challenge"}
    
    if year:
        # Filter by year using the period_start field
        start_of_year = datetime(year, 1, 1, tzinfo=timezone.utc)
        end_of_year = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        query["period_start"] = {"$gte": start_of_year, "$lt": end_of_year}
    
    skip = (page - 1) * limit
    total = await db.badges.count_documents(query)
    
    badges = await db.badges.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Get earn counts for each badge
    for badge in badges:
        badge_id = badge.get("id")
        earned_count = await db.user_badges.count_documents({"badge_id": badge_id})
        badge["earned_count"] = earned_count
    
    # Get available years
    years_pipeline = [
        {"$match": {"category": "challenge", "period_start": {"$exists": True}}},
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

# =============================================================================
# ENHANCED ANALYTICS
# =============================================================================

@app.get("/api/admin/analytics/sellers")
async def get_seller_analytics(
    days: int = Query(default=30, le=365),
    admin: dict = Depends(get_current_admin)
):
    """Get comprehensive seller analytics"""
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    # Top sellers by revenue
    revenue_pipeline = [
        {
            "$match": {
                "status": "sold",
                "sold_at": {"$gte": start_date}
            }
        },
        {
            "$group": {
                "_id": "$seller_id",
                "total_revenue": {"$sum": "$price"},
                "items_sold": {"$sum": 1}
            }
        },
        {"$sort": {"total_revenue": -1}},
        {"$limit": 20}
    ]
    top_sellers = await db.listings.aggregate(revenue_pipeline).to_list(20)
    
    # Get seller details
    seller_ids = [s["_id"] for s in top_sellers]
    sellers = await db.users.find({"user_id": {"$in": seller_ids}}, {"_id": 0, "user_id": 1, "name": 1, "email": 1, "is_verified": 1}).to_list(20)
    sellers_map = {s["user_id"]: s for s in sellers}
    
    for seller in top_sellers:
        user = sellers_map.get(seller["_id"], {})
        seller["name"] = user.get("name", "Unknown")
        seller["email"] = user.get("email", "")
        seller["is_verified"] = user.get("is_verified", False)
    
    # Active sellers (with listings in period)
    active_sellers_pipeline = [
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$group": {"_id": "$seller_id"}},
        {"$count": "total"}
    ]
    active_result = await db.listings.aggregate(active_sellers_pipeline).to_list(1)
    active_sellers = active_result[0]["total"] if active_result else 0
    
    # New sellers
    new_sellers = await db.users.count_documents({
        "created_at": {"$gte": start_date},
        "is_seller": True
    })
    
    # Seller growth over time
    growth_pipeline = [
        {"$match": {"created_at": {"$gte": start_date}, "is_seller": True}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    seller_growth = await db.users.aggregate(growth_pipeline).to_list(days)
    
    # Average metrics
    avg_pipeline = [
        {"$match": {"status": "sold", "sold_at": {"$gte": start_date}}},
        {"$group": {
            "_id": None,
            "avg_price": {"$avg": "$price"},
            "total_transactions": {"$sum": 1},
            "total_volume": {"$sum": "$price"}
        }}
    ]
    avg_result = await db.listings.aggregate(avg_pipeline).to_list(1)
    avg_metrics = avg_result[0] if avg_result else {"avg_price": 0, "total_transactions": 0, "total_volume": 0}
    
    return {
        "top_sellers": top_sellers,
        "active_sellers": active_sellers,
        "new_sellers": new_sellers,
        "seller_growth": seller_growth,
        "metrics": {
            "average_sale_price": round(avg_metrics.get("avg_price", 0), 2),
            "total_transactions": avg_metrics.get("total_transactions", 0),
            "total_volume": round(avg_metrics.get("total_volume", 0), 2),
        }
    }

@app.get("/api/admin/analytics/engagement")
async def get_engagement_analytics(
    days: int = Query(default=30, le=365),
    admin: dict = Depends(get_current_admin)
):
    """Get user engagement analytics"""
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    # Messages sent
    messages_pipeline = [
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    messages_trend = await db.messages.aggregate(messages_pipeline).to_list(days)
    total_messages = sum(m["count"] for m in messages_trend)
    
    # Favorites/saves
    favorites_count = await db.favorites.count_documents({"created_at": {"$gte": start_date}})
    
    # User sessions/logins
    active_users_pipeline = [
        {"$match": {"last_seen": {"$gte": start_date}}},
        {"$count": "total"}
    ]
    active_result = await db.users.aggregate(active_users_pipeline).to_list(1)
    active_users = active_result[0]["total"] if active_result else 0
    
    # Badge engagement
    badges_earned = await db.user_badges.count_documents({"earned_at": {"$gte": start_date}})
    challenges_joined = await db.challenge_participants.count_documents({"joined_at": {"$gte": start_date}})
    challenges_completed = await db.challenge_completions.count_documents({"completed_at": {"$gte": start_date}})
    
    # Notification engagement
    notifications_sent = await db.notifications.count_documents({"created_at": {"$gte": start_date}})
    notifications_read = await db.notifications.count_documents({"created_at": {"$gte": start_date}, "read": True})
    
    return {
        "messages": {
            "total": total_messages,
            "trend": messages_trend,
        },
        "favorites": favorites_count,
        "active_users": active_users,
        "badges": {
            "earned": badges_earned,
            "challenges_joined": challenges_joined,
            "challenges_completed": challenges_completed,
        },
        "notifications": {
            "sent": notifications_sent,
            "read": notifications_read,
            "read_rate": round((notifications_read / notifications_sent * 100) if notifications_sent > 0 else 0, 1)
        }
    }

@app.get("/api/admin/analytics/platform")
async def get_platform_analytics(
    days: int = Query(default=30, le=365),
    admin: dict = Depends(get_current_admin)
):
    """Get comprehensive platform analytics"""
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    # User stats
    total_users = await db.users.count_documents({})
    new_users = await db.users.count_documents({"created_at": {"$gte": start_date}})
    verified_users = await db.users.count_documents({"is_verified": True})
    
    # Listing stats
    total_listings = await db.listings.count_documents({})
    active_listings = await db.listings.count_documents({"status": "active"})
    new_listings = await db.listings.count_documents({"created_at": {"$gte": start_date}})
    sold_listings = await db.listings.count_documents({"status": "sold", "sold_at": {"$gte": start_date}})
    
    # Revenue stats
    revenue_pipeline = [
        {"$match": {"status": "sold", "sold_at": {"$gte": start_date}}},
        {"$group": {"_id": None, "total": {"$sum": "$price"}}}
    ]
    revenue_result = await db.listings.aggregate(revenue_pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Category breakdown
    category_pipeline = [
        {"$match": {"status": "active"}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    category_breakdown = await db.listings.aggregate(category_pipeline).to_list(10)
    
    # Daily activity trend
    activity_pipeline = [
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "listings": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    listing_trend = await db.listings.aggregate(activity_pipeline).to_list(days)
    
    # Support tickets
    open_tickets = await db.support_tickets.count_documents({"status": {"$in": ["open", "pending"]}})
    
    # Reports/flags
    pending_reports = await db.reports.count_documents({"status": "pending"})
    
    return {
        "users": {
            "total": total_users,
            "new": new_users,
            "verified": verified_users,
            "verification_rate": round((verified_users / total_users * 100) if total_users > 0 else 0, 1)
        },
        "listings": {
            "total": total_listings,
            "active": active_listings,
            "new": new_listings,
            "sold": sold_listings,
            "sell_through_rate": round((sold_listings / new_listings * 100) if new_listings > 0 else 0, 1),
            "trend": listing_trend,
            "by_category": category_breakdown,
        },
        "revenue": {
            "total": round(total_revenue, 2),
            "average_per_sale": round((total_revenue / sold_listings) if sold_listings > 0 else 0, 2),
        },
        "support": {
            "open_tickets": open_tickets,
            "pending_reports": pending_reports,
        }
    }

@app.put("/api/admin/settings/seller-analytics")
async def update_seller_analytics_settings(
    settings: dict = Body(...),
    admin: dict = Depends(get_current_admin)
):
    """Update seller analytics settings"""
    await db.admin_settings.update_one(
        {"type": "seller_analytics"},
        {"$set": {
            "settings": settings,
            "updated_by": admin.get("email"),
            "updated_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )
    
    return {"success": True, "settings": settings}

@app.get("/api/admin/settings/seller-analytics")
async def get_seller_analytics_settings(admin: dict = Depends(get_current_admin)):
    """Get seller analytics settings"""
    settings = await db.admin_settings.find_one({"type": "seller_analytics"}, {"_id": 0})
    return settings or {"settings": {
        "show_revenue": True,
        "show_rankings": True,
        "min_sales_for_ranking": 1,
        "enable_seller_dashboard": True,
    }}

@app.put("/api/admin/settings/engagement-notifications")
async def update_engagement_notification_settings(
    settings: dict = Body(...),
    admin: dict = Depends(get_current_admin)
):
    """Update engagement notification settings"""
    await db.admin_settings.update_one(
        {"type": "engagement_notifications"},
        {"$set": {
            "settings": settings,
            "updated_by": admin.get("email"),
            "updated_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )
    
    return {"success": True, "settings": settings}

@app.get("/api/admin/settings/engagement-notifications")
async def get_engagement_notification_settings(admin: dict = Depends(get_current_admin)):
    """Get engagement notification settings"""
    settings = await db.admin_settings.find_one({"type": "engagement_notifications"}, {"_id": 0})
    return settings or {"settings": {
        "enable_badge_notifications": True,
        "enable_challenge_reminders": True,
        "reminder_days_before": 3,
        "enable_streak_notifications": True,
        "enable_leaderboard_notifications": True,
    }}

# =============================================================================
# SCHEDULED REPORTS ENDPOINTS
# =============================================================================

@app.get("/api/admin/settings/scheduled-reports")
async def get_scheduled_reports_settings(admin: dict = Depends(get_current_admin)):
    """Get scheduled reports configuration"""
    settings = await db.admin_settings.find_one({"type": "scheduled_reports"}, {"_id": 0})
    if not settings:
        return {
            "enabled": True,
            "frequency": "weekly",
            "day_of_week": 1,
            "hour": 9,
            "admin_emails": [],
            "include_seller_analytics": True,
            "include_engagement_metrics": True,
            "include_platform_overview": True,
            "include_alerts": True,
        }
    return settings

@app.post("/api/admin/settings/scheduled-reports")
async def save_scheduled_reports_settings(
    settings: dict = Body(...),
    admin: dict = Depends(get_current_admin)
):
    """Save scheduled reports configuration"""
    try:
        await db.admin_settings.update_one(
            {"type": "scheduled_reports"},
            {"$set": {
                "type": "scheduled_reports",
                "enabled": settings.get("enabled", True),
                "frequency": settings.get("frequency", "weekly"),
                "day_of_week": settings.get("day_of_week", 1),
                "hour": settings.get("hour", 9),
                "admin_emails": settings.get("admin_emails", []),
                "include_seller_analytics": settings.get("include_seller_analytics", True),
                "include_engagement_metrics": settings.get("include_engagement_metrics", True),
                "include_platform_overview": settings.get("include_platform_overview", True),
                "include_alerts": settings.get("include_alerts", True),
                "updated_at": datetime.now(timezone.utc),
                "updated_by": admin.get("email"),
            }},
            upsert=True
        )
        return {"success": True, "message": "Report settings saved"}
    except Exception as e:
        logger.error(f"Error saving scheduled reports settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to save settings")

@app.get("/api/admin/reports/history")
async def get_report_history(
    limit: int = Query(10, ge=1, le=100),
    skip: int = Query(0, ge=0),
    admin: dict = Depends(get_current_admin)
):
    """Get history of sent reports"""
    try:
        cursor = db.report_history.find(
            {},
            {"_id": 0, "report.sections": 0}
        ).sort("created_at", -1).skip(skip).limit(limit)
        
        history = []
        async for record in cursor:
            history.append({
                "type": record.get("type"),
                "sent_to": record.get("sent_to", []),
                "success": record.get("success"),
                "created_at": record.get("created_at").isoformat() if record.get("created_at") else None
            })
        
        total = await db.report_history.count_documents({})
        
        return {
            "history": history,
            "total": total,
            "limit": limit,
            "skip": skip
        }
    except Exception as e:
        logger.error(f"Error fetching report history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch history")

@app.post("/api/admin/reports/generate")
async def generate_report(admin: dict = Depends(get_current_admin)):
    """Generate analytics report (preview without sending)"""
    try:
        now = datetime.now(timezone.utc)
        week_ago = now - timedelta(days=7)
        
        # Platform overview
        platform = {
            "total_users": await db.users.count_documents({}),
            "new_users_week": await db.users.count_documents({"created_at": {"$gte": week_ago}}),
            "total_listings": await db.listings.count_documents({"status": {"$ne": "deleted"}}),
            "active_listings": await db.listings.count_documents({"status": "active"}),
        }
        
        # Seller analytics
        seller_pipeline = [
            {"$match": {"status": "sold", "updated_at": {"$gte": week_ago}}},
            {"$group": {"_id": "$user_id", "revenue": {"$sum": "$price"}, "sales": {"$sum": 1}}},
            {"$sort": {"revenue": -1}},
            {"$limit": 5}
        ]
        top_sellers = []
        async for s in db.listings.aggregate(seller_pipeline):
            user = await db.users.find_one({"user_id": s["_id"]}, {"_id": 0, "name": 1})
            top_sellers.append({
                "user_id": s["_id"],
                "name": user.get("name", "Unknown") if user else "Unknown",
                "revenue": s["revenue"],
                "sales": s["sales"]
            })
        
        # Engagement
        collections = await db.list_collection_names()
        engagement = {
            "messages_week": await db.messages.count_documents({"created_at": {"$gte": week_ago}}) if "messages" in collections else 0,
            "favorites_week": await db.favorites.count_documents({"created_at": {"$gte": week_ago}}) if "favorites" in collections else 0,
        }
        
        return {
            "success": True,
            "report": {
                "generated_at": now.isoformat(),
                "sections": {
                    "platform_overview": platform,
                    "seller_analytics": {"top_sellers": top_sellers},
                    "engagement_metrics": engagement,
                }
            }
        }
    except Exception as e:
        logger.error(f"Error generating report: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate report")

@app.post("/api/admin/reports/send")
async def send_report_now(admin: dict = Depends(get_current_admin)):
    """Send report to configured admin emails"""
    try:
        # Get settings
        settings = await db.admin_settings.find_one({"type": "scheduled_reports"}, {"_id": 0})
        if not settings:
            return {"success": False, "status": "no_config", "message": "No report settings configured"}
        
        admin_emails = settings.get("admin_emails", [])
        if not admin_emails:
            return {"success": False, "status": "no_recipients", "message": "No admin emails configured"}
        
        # Generate and send report (simplified - actual email sending handled by main backend)
        await db.report_history.insert_one({
            "type": "manual_analytics",
            "sent_to": admin_emails,
            "success": True,
            "triggered_by": admin.get("email"),
            "created_at": datetime.now(timezone.utc)
        })
        
        return {
            "success": True,
            "status": "sent",
            "recipients": admin_emails,
            "message": f"Report queued for sending to {len(admin_emails)} recipient(s)"
        }
    except Exception as e:
        logger.error(f"Error sending report: {e}")
        raise HTTPException(status_code=500, detail="Failed to send report")

logger.info("Scheduled Reports admin endpoints registered")

# =============================================================================
# BUSINESS PROFILES ADMIN ENDPOINTS
# =============================================================================

class BusinessProfileStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    SUSPENDED = "suspended"

@app.get("/api/admin/business-profiles/list")
async def admin_list_business_profiles(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_admin)
):
    """List all business profiles with filtering and pagination."""
    try:
        # Build query filter
        query = {}
        if status and status != "all":
            query["status"] = status
        
        if search:
            query["$or"] = [
                {"business_name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
            ]
        
        # Get total count
        total = await db.business_profiles.count_documents(query)
        
        # Get stats
        stats = {
            "total": await db.business_profiles.count_documents({}),
            "pending": await db.business_profiles.count_documents({"status": "pending"}),
            "verified": await db.business_profiles.count_documents({"status": "verified"}),
            "rejected": await db.business_profiles.count_documents({"status": "rejected"}),
        }
        
        # Fetch profiles with pagination
        skip = (page - 1) * limit
        cursor = db.business_profiles.find(query).sort("created_at", -1).skip(skip).limit(limit)
        
        profiles = []
        async for profile in cursor:
            # Fetch user info
            user = None
            if profile.get("user_id"):
                user_doc = await db.users.find_one(
                    {"user_id": profile["user_id"]},
                    {"_id": 0, "name": 1, "email": 1}
                )
                if user_doc:
                    user = user_doc
            
            profiles.append({
                "id": str(profile.get("_id", profile.get("id", ""))),
                "user_id": profile.get("user_id"),
                "business_name": profile.get("business_name", profile.get("name", "")),
                "description": profile.get("description", ""),
                "logo": profile.get("logo"),
                "website": profile.get("website"),
                "phone": profile.get("phone"),
                "email": profile.get("email"),
                "address": profile.get("address"),
                "category": profile.get("category"),
                "status": profile.get("status", "pending"),
                "created_at": profile.get("created_at", datetime.now(timezone.utc)).isoformat() if profile.get("created_at") else None,
                "updated_at": profile.get("updated_at").isoformat() if profile.get("updated_at") else None,
                "verified_at": profile.get("verified_at").isoformat() if profile.get("verified_at") else None,
                "user": user,
            })
        
        return {
            "profiles": profiles,
            "total": total,
            "page": page,
            "limit": limit,
            "stats": stats,
        }
    except Exception as e:
        logger.error(f"Error listing business profiles: {e}")
        raise HTTPException(status_code=500, detail="Failed to list business profiles")

@app.get("/api/admin/business-profiles/{profile_id}")
async def admin_get_business_profile(
    profile_id: str,
    current_user: dict = Depends(get_current_admin)
):
    """Get a single business profile by ID."""
    try:
        from bson import ObjectId
        
        # Try to find by ObjectId or string id
        profile = None
        try:
            profile = await db.business_profiles.find_one({"_id": ObjectId(profile_id)})
        except:
            profile = await db.business_profiles.find_one({"id": profile_id})
        
        if not profile:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        # Fetch user info
        user = None
        if profile.get("user_id"):
            user_doc = await db.users.find_one(
                {"user_id": profile["user_id"]},
                {"_id": 0, "name": 1, "email": 1, "phone": 1}
            )
            if user_doc:
                user = user_doc
        
        return {
            "id": str(profile.get("_id", profile.get("id", ""))),
            "user_id": profile.get("user_id"),
            "business_name": profile.get("business_name", profile.get("name", "")),
            "description": profile.get("description", ""),
            "logo": profile.get("logo"),
            "website": profile.get("website"),
            "phone": profile.get("phone"),
            "email": profile.get("email"),
            "address": profile.get("address"),
            "category": profile.get("category"),
            "status": profile.get("status", "pending"),
            "created_at": profile.get("created_at").isoformat() if profile.get("created_at") else None,
            "updated_at": profile.get("updated_at").isoformat() if profile.get("updated_at") else None,
            "verified_at": profile.get("verified_at").isoformat() if profile.get("verified_at") else None,
            "rejected_at": profile.get("rejected_at").isoformat() if profile.get("rejected_at") else None,
            "rejection_reason": profile.get("rejection_reason"),
            "user": user,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching business profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch business profile")

@app.post("/api/admin/business-profiles/{profile_id}/verify")
async def admin_verify_business_profile(
    profile_id: str,
    current_user: dict = Depends(get_current_admin)
):
    """Verify a business profile."""
    try:
        from bson import ObjectId
        
        # Try to find by ObjectId or string id
        profile = None
        query = None
        try:
            query = {"_id": ObjectId(profile_id)}
            profile = await db.business_profiles.find_one(query)
        except:
            query = {"id": profile_id}
            profile = await db.business_profiles.find_one(query)
        
        if not profile:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        if profile.get("status") == "verified":
            raise HTTPException(status_code=400, detail="Profile is already verified")
        
        # Update profile status
        result = await db.business_profiles.update_one(
            query,
            {"$set": {
                "status": "verified",
                "verified_at": datetime.now(timezone.utc),
                "verified_by": current_user.get("user_id", current_user.get("email")),
                "updated_at": datetime.now(timezone.utc),
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to update profile")
        
        # Log the action
        await db.admin_audit_logs.insert_one({
            "action": "business_profile_verified",
            "profile_id": profile_id,
            "business_name": profile.get("business_name", profile.get("name", "")),
            "admin_user": current_user.get("email"),
            "timestamp": datetime.now(timezone.utc),
        })
        
        logger.info(f"Business profile {profile_id} verified by {current_user.get('email')}")
        
        return {
            "success": True,
            "message": "Business profile verified successfully",
            "profile_id": profile_id,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying business profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify business profile")

@app.post("/api/admin/business-profiles/{profile_id}/reject")
async def admin_reject_business_profile(
    profile_id: str,
    reason: Optional[str] = Body(None, embed=True),
    current_user: dict = Depends(get_current_admin)
):
    """Reject a business profile."""
    try:
        from bson import ObjectId
        
        # Try to find by ObjectId or string id
        profile = None
        query = None
        try:
            query = {"_id": ObjectId(profile_id)}
            profile = await db.business_profiles.find_one(query)
        except:
            query = {"id": profile_id}
            profile = await db.business_profiles.find_one(query)
        
        if not profile:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        if profile.get("status") == "rejected":
            raise HTTPException(status_code=400, detail="Profile is already rejected")
        
        # Update profile status
        update_data = {
            "status": "rejected",
            "rejected_at": datetime.now(timezone.utc),
            "rejected_by": current_user.get("user_id", current_user.get("email")),
            "updated_at": datetime.now(timezone.utc),
        }
        if reason:
            update_data["rejection_reason"] = reason
        
        result = await db.business_profiles.update_one(query, {"$set": update_data})
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to update profile")
        
        # Log the action
        await db.admin_audit_logs.insert_one({
            "action": "business_profile_rejected",
            "profile_id": profile_id,
            "business_name": profile.get("business_name", profile.get("name", "")),
            "reason": reason,
            "admin_user": current_user.get("email"),
            "timestamp": datetime.now(timezone.utc),
        })
        
        logger.info(f"Business profile {profile_id} rejected by {current_user.get('email')}")
        
        return {
            "success": True,
            "message": "Business profile rejected",
            "profile_id": profile_id,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting business profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to reject business profile")

@app.post("/api/admin/business-profiles/{profile_id}/suspend")
async def admin_suspend_business_profile(
    profile_id: str,
    reason: Optional[str] = Body(None, embed=True),
    current_user: dict = Depends(get_current_admin)
):
    """Suspend a verified business profile."""
    try:
        from bson import ObjectId
        
        # Try to find by ObjectId or string id
        profile = None
        query = None
        try:
            query = {"_id": ObjectId(profile_id)}
            profile = await db.business_profiles.find_one(query)
        except:
            query = {"id": profile_id}
            profile = await db.business_profiles.find_one(query)
        
        if not profile:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        if profile.get("status") == "suspended":
            raise HTTPException(status_code=400, detail="Profile is already suspended")
        
        # Update profile status
        update_data = {
            "status": "suspended",
            "suspended_at": datetime.now(timezone.utc),
            "suspended_by": current_user.get("user_id", current_user.get("email")),
            "previous_status": profile.get("status"),
            "updated_at": datetime.now(timezone.utc),
        }
        if reason:
            update_data["suspension_reason"] = reason
        
        result = await db.business_profiles.update_one(query, {"$set": update_data})
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to update profile")
        
        # Log the action
        await db.admin_audit_logs.insert_one({
            "action": "business_profile_suspended",
            "profile_id": profile_id,
            "business_name": profile.get("business_name", profile.get("name", "")),
            "reason": reason,
            "admin_user": current_user.get("email"),
            "timestamp": datetime.now(timezone.utc),
        })
        
        logger.info(f"Business profile {profile_id} suspended by {current_user.get('email')}")
        
        return {
            "success": True,
            "message": "Business profile suspended",
            "profile_id": profile_id,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error suspending business profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to suspend business profile")

@app.post("/api/admin/business-profiles/{profile_id}/reinstate")
async def admin_reinstate_business_profile(
    profile_id: str,
    current_user: dict = Depends(get_current_admin)
):
    """Reinstate a suspended or rejected business profile."""
    try:
        from bson import ObjectId
        
        # Try to find by ObjectId or string id
        profile = None
        query = None
        try:
            query = {"_id": ObjectId(profile_id)}
            profile = await db.business_profiles.find_one(query)
        except:
            query = {"id": profile_id}
            profile = await db.business_profiles.find_one(query)
        
        if not profile:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        current_status = profile.get("status")
        if current_status not in ["suspended", "rejected"]:
            raise HTTPException(status_code=400, detail="Profile is not suspended or rejected")
        
        # Determine new status
        new_status = profile.get("previous_status", "pending")
        if new_status == "suspended":
            new_status = "verified"
        
        # Update profile status
        result = await db.business_profiles.update_one(
            query,
            {"$set": {
                "status": new_status,
                "reinstated_at": datetime.now(timezone.utc),
                "reinstated_by": current_user.get("user_id", current_user.get("email")),
                "updated_at": datetime.now(timezone.utc),
            },
            "$unset": {
                "suspension_reason": "",
                "rejection_reason": "",
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to update profile")
        
        # Log the action
        await db.admin_audit_logs.insert_one({
            "action": "business_profile_reinstated",
            "profile_id": profile_id,
            "business_name": profile.get("business_name", profile.get("name", "")),
            "previous_status": current_status,
            "new_status": new_status,
            "admin_user": current_user.get("email"),
            "timestamp": datetime.now(timezone.utc),
        })
        
        logger.info(f"Business profile {profile_id} reinstated by {current_user.get('email')}")
        
        return {
            "success": True,
            "message": f"Business profile reinstated to {new_status}",
            "profile_id": profile_id,
            "new_status": new_status,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reinstating business profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to reinstate business profile")

logger.info("Business Profiles admin endpoints registered")

# =============================================================================
# FORM CONFIGURATION MANAGEMENT
# =============================================================================

class FormConfigType(str, Enum):
    PLACEHOLDER = "placeholder"
    SELLER_TYPE = "seller_type"
    PREFERENCE = "preference"
    LISTING_TIP = "listing_tip"
    VISIBILITY_RULE = "visibility_rule"

class FormConfigCreate(BaseModel):
    category_id: str = Field(..., description="Category ID (e.g., 'auto_vehicles', 'properties')")
    subcategory_id: Optional[str] = Field(None, description="Subcategory ID (optional, for subcategory-specific config)")
    config_type: FormConfigType
    config_data: Dict[str, Any]
    is_active: bool = True
    priority: int = Field(default=0, description="Higher priority configs override lower ones")

class FormConfigUpdate(BaseModel):
    config_data: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = None

# Default configurations for seeding
DEFAULT_FORM_CONFIGS = {
    "placeholders": {
        "default": {
            "title": "What are you selling?",
            "titleLabel": "Title",
            "description": "Include details like condition, features, reason for selling...",
            "descriptionLabel": "Description"
        },
        "auto_vehicles": {
            "title": "e.g., 2020 BMW 320i - Low Mileage",
            "titleLabel": "Vehicle Title",
            "description": "Include make, model, year, mileage, condition, features, service history...",
            "descriptionLabel": "Vehicle Description"
        },
        "properties": {
            "title": "e.g., 3 Bedroom Apartment in City Center",
            "titleLabel": "Property Title",
            "description": "Include property type, size, number of rooms, amenities, location details...",
            "descriptionLabel": "Property Description"
        },
        "jobs_services": {
            "title": "e.g., Experienced Web Developer Available",
            "titleLabel": "Job/Service Title",
            "description": "Include your skills, experience, availability, and what you can offer...",
            "descriptionLabel": "Job/Service Description"
        },
        "friendship_dating": {
            "title": "e.g., Looking for hiking buddies",
            "titleLabel": "Post Title",
            "description": "Introduce yourself, your interests, and what you are looking for...",
            "descriptionLabel": "About You"
        },
        "community": {
            "title": "e.g., Weekend Cleanup Event",
            "titleLabel": "Post Title",
            "description": "Describe your post, event, or announcement details...",
            "descriptionLabel": "Details"
        },
        "electronics": {
            "title": "e.g., MacBook Pro 2023 - Excellent Condition",
            "titleLabel": "Item Title",
            "description": "Include brand, model, specifications, condition, and accessories included...",
            "descriptionLabel": "Item Description"
        },
        "phones_tablets": {
            "title": "e.g., iPhone 15 Pro Max 256GB",
            "titleLabel": "Device Title",
            "description": "Include model, storage capacity, condition, battery health, accessories...",
            "descriptionLabel": "Device Description"
        }
    },
    "seller_types": {
        "default": {
            "label": "Listed by",
            "options": ["Individual", "Owner", "Company", "Dealer", "Broker"]
        },
        "properties": {
            "label": "Listed by",
            "options": ["Landlord", "Landlady", "Owner", "Broker", "Individual", "Company"]
        },
        "auto_vehicles": {
            "label": "Listed by",
            "options": ["Owner", "Broker", "Individual", "Company", "Dealer"]
        },
        "friendship_dating": {
            "label": "Listed by",
            "options": ["Individual"]
        },
        "jobs_services": {
            "label": "Listed by",
            "options": ["Individual", "Company", "Recruiter"]
        },
        "community": {
            "label": "Posted by",
            "options": ["Individual", "Organization", "Community Group"]
        }
    },
    "visibility_rules": {
        "hide_price_categories": ["friendship_dating"],
        "show_salary_subcategories": ["job_listings"],
        "chat_only_categories": ["friendship_dating"],
        "hide_condition_categories": ["friendship_dating", "community", "jobs_services"],
        "hide_condition_subcategories": ["job_listings", "services_offered"]
    },
    "preferences": {
        "friendship_dating": {
            "acceptsOffers": False,
            "acceptsExchanges": False,
            "negotiable": False
        },
        "jobs_services": {
            "acceptsExchanges": False
        }
    }
}

@app.get("/api/admin/form-config")
async def get_form_configs(
    category_id: Optional[str] = None,
    subcategory_id: Optional[str] = None,
    config_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_admin)
):
    """Get all form configurations with optional filtering."""
    try:
        query = {}
        if category_id:
            query["category_id"] = category_id
        if subcategory_id:
            query["subcategory_id"] = subcategory_id
        if config_type:
            query["config_type"] = config_type
        if is_active is not None:
            query["is_active"] = is_active
        
        skip = (page - 1) * limit
        total = await db.form_configs.count_documents(query)
        
        cursor = db.form_configs.find(query).sort([("priority", -1), ("created_at", -1)]).skip(skip).limit(limit)
        configs = []
        async for config in cursor:
            configs.append({
                "id": str(config["_id"]),
                "category_id": config.get("category_id"),
                "subcategory_id": config.get("subcategory_id"),
                "config_type": config.get("config_type"),
                "config_data": config.get("config_data", {}),
                "is_active": config.get("is_active", True),
                "priority": config.get("priority", 0),
                "created_at": config.get("created_at").isoformat() if config.get("created_at") else None,
                "updated_at": config.get("updated_at").isoformat() if config.get("updated_at") else None,
            })
        
        return {
            "configs": configs,
            "total": total,
            "page": page,
            "limit": limit,
        }
    except Exception as e:
        logger.error(f"Error fetching form configs: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch form configurations")

@app.get("/api/admin/form-config/stats")
async def get_form_config_stats(current_user: dict = Depends(get_current_admin)):
    """Get statistics about form configurations."""
    try:
        total = await db.form_configs.count_documents({})
        active = await db.form_configs.count_documents({"is_active": True})
        
        # Count by type
        type_counts = {}
        for config_type in FormConfigType:
            count = await db.form_configs.count_documents({"config_type": config_type.value})
            type_counts[config_type.value] = count
        
        # Get unique categories configured
        categories = await db.form_configs.distinct("category_id")
        
        return {
            "total": total,
            "active": active,
            "inactive": total - active,
            "by_type": type_counts,
            "categories_configured": len(categories),
            "categories": categories,
        }
    except Exception as e:
        logger.error(f"Error fetching form config stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch statistics")

@app.post("/api/admin/form-config")
async def create_form_config(
    config: FormConfigCreate,
    current_user: dict = Depends(get_current_admin)
):
    """Create a new form configuration."""
    try:
        # Check for existing config with same category/subcategory/type
        existing_query = {
            "category_id": config.category_id,
            "config_type": config.config_type.value,
        }
        if config.subcategory_id:
            existing_query["subcategory_id"] = config.subcategory_id
        else:
            existing_query["subcategory_id"] = {"$in": [None, ""]}
        
        existing = await db.form_configs.find_one(existing_query)
        if existing:
            raise HTTPException(
                status_code=400, 
                detail=f"Configuration already exists for this category/subcategory and type. Use PUT to update."
            )
        
        config_doc = {
            "category_id": config.category_id,
            "subcategory_id": config.subcategory_id,
            "config_type": config.config_type.value,
            "config_data": config.config_data,
            "is_active": config.is_active,
            "priority": config.priority,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "created_by": current_user.get("email"),
        }
        
        result = await db.form_configs.insert_one(config_doc)
        
        # Log audit
        await db.audit_logs.insert_one({
            "action": "form_config_created",
            "admin_email": current_user.get("email"),
            "target_type": "form_config",
            "target_id": str(result.inserted_id),
            "details": {
                "category_id": config.category_id,
                "subcategory_id": config.subcategory_id,
                "config_type": config.config_type.value,
            },
            "timestamp": datetime.now(timezone.utc),
        })
        
        return {
            "success": True,
            "id": str(result.inserted_id),
            "message": "Form configuration created successfully",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating form config: {e}")
        raise HTTPException(status_code=500, detail="Failed to create form configuration")

@app.put("/api/admin/form-config/{config_id}")
async def update_form_config(
    config_id: str,
    updates: FormConfigUpdate,
    current_user: dict = Depends(get_current_admin)
):
    """Update an existing form configuration."""
    try:
        from bson import ObjectId
        
        existing = await db.form_configs.find_one({"_id": ObjectId(config_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Form configuration not found")
        
        update_doc = {"updated_at": datetime.now(timezone.utc)}
        if updates.config_data is not None:
            update_doc["config_data"] = updates.config_data
        if updates.is_active is not None:
            update_doc["is_active"] = updates.is_active
        if updates.priority is not None:
            update_doc["priority"] = updates.priority
        
        await db.form_configs.update_one(
            {"_id": ObjectId(config_id)},
            {"$set": update_doc}
        )
        
        # Log audit
        await db.audit_logs.insert_one({
            "action": "form_config_updated",
            "admin_email": current_user.get("email"),
            "target_type": "form_config",
            "target_id": config_id,
            "details": {"updates": {k: v for k, v in update_doc.items() if k != "updated_at"}},
            "timestamp": datetime.now(timezone.utc),
        })
        
        return {"success": True, "message": "Form configuration updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating form config: {e}")
        raise HTTPException(status_code=500, detail="Failed to update form configuration")

@app.delete("/api/admin/form-config/{config_id}")
async def delete_form_config(
    config_id: str,
    current_user: dict = Depends(get_current_admin)
):
    """Delete a form configuration."""
    try:
        from bson import ObjectId
        
        existing = await db.form_configs.find_one({"_id": ObjectId(config_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Form configuration not found")
        
        await db.form_configs.delete_one({"_id": ObjectId(config_id)})
        
        # Log audit
        await db.audit_logs.insert_one({
            "action": "form_config_deleted",
            "admin_email": current_user.get("email"),
            "target_type": "form_config",
            "target_id": config_id,
            "details": {
                "category_id": existing.get("category_id"),
                "config_type": existing.get("config_type"),
            },
            "timestamp": datetime.now(timezone.utc),
        })
        
        return {"success": True, "message": "Form configuration deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting form config: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete form configuration")

@app.post("/api/admin/form-config/seed")
async def seed_default_configs(current_user: dict = Depends(get_current_admin)):
    """Seed the database with default form configurations."""
    try:
        created_count = 0
        skipped_count = 0
        
        # Seed placeholders
        for category_id, placeholder_data in DEFAULT_FORM_CONFIGS["placeholders"].items():
            existing = await db.form_configs.find_one({
                "category_id": category_id,
                "config_type": "placeholder",
                "subcategory_id": {"$in": [None, ""]}
            })
            if not existing:
                await db.form_configs.insert_one({
                    "category_id": category_id,
                    "subcategory_id": None,
                    "config_type": "placeholder",
                    "config_data": placeholder_data,
                    "is_active": True,
                    "priority": 0,
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                    "created_by": "system_seed",
                })
                created_count += 1
            else:
                skipped_count += 1
        
        # Seed seller types
        for category_id, seller_type_data in DEFAULT_FORM_CONFIGS["seller_types"].items():
            existing = await db.form_configs.find_one({
                "category_id": category_id,
                "config_type": "seller_type",
                "subcategory_id": {"$in": [None, ""]}
            })
            if not existing:
                await db.form_configs.insert_one({
                    "category_id": category_id,
                    "subcategory_id": None,
                    "config_type": "seller_type",
                    "config_data": seller_type_data,
                    "is_active": True,
                    "priority": 0,
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                    "created_by": "system_seed",
                })
                created_count += 1
            else:
                skipped_count += 1
        
        # Seed preferences
        for category_id, pref_data in DEFAULT_FORM_CONFIGS["preferences"].items():
            existing = await db.form_configs.find_one({
                "category_id": category_id,
                "config_type": "preference",
                "subcategory_id": {"$in": [None, ""]}
            })
            if not existing:
                await db.form_configs.insert_one({
                    "category_id": category_id,
                    "subcategory_id": None,
                    "config_type": "preference",
                    "config_data": pref_data,
                    "is_active": True,
                    "priority": 0,
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                    "created_by": "system_seed",
                })
                created_count += 1
            else:
                skipped_count += 1
        
        # Seed visibility rules as a single config
        existing_visibility = await db.form_configs.find_one({
            "category_id": "global",
            "config_type": "visibility_rule",
        })
        if not existing_visibility:
            await db.form_configs.insert_one({
                "category_id": "global",
                "subcategory_id": None,
                "config_type": "visibility_rule",
                "config_data": DEFAULT_FORM_CONFIGS["visibility_rules"],
                "is_active": True,
                "priority": 100,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
                "created_by": "system_seed",
            })
            created_count += 1
        else:
            skipped_count += 1
        
        return {
            "success": True,
            "created": created_count,
            "skipped": skipped_count,
            "message": f"Seeded {created_count} configurations, skipped {skipped_count} existing ones",
        }
    except Exception as e:
        logger.error(f"Error seeding form configs: {e}")
        raise HTTPException(status_code=500, detail="Failed to seed form configurations")

# Public endpoint for frontend to fetch form configs (no auth required)
@app.get("/api/form-config/public")
async def get_public_form_configs():
    """Get all active form configurations for frontend use (public endpoint)."""
    try:
        configs = {
            "placeholders": {},
            "subcategory_placeholders": {},
            "seller_types": {},
            "preferences": {},
            "visibility_rules": {},
        }
        
        cursor = db.form_configs.find({"is_active": True}).sort("priority", -1)
        async for config in cursor:
            category_id = config.get("category_id")
            subcategory_id = config.get("subcategory_id")
            config_type = config.get("config_type")
            config_data = config.get("config_data", {})
            
            if config_type == "placeholder":
                if subcategory_id:
                    configs["subcategory_placeholders"][subcategory_id] = config_data
                else:
                    configs["placeholders"][category_id] = config_data
            elif config_type == "seller_type":
                configs["seller_types"][category_id] = config_data
            elif config_type == "preference":
                configs["preferences"][category_id] = config_data
            elif config_type == "visibility_rule":
                if category_id == "global":
                    configs["visibility_rules"] = config_data
        
        return configs
    except Exception as e:
        logger.error(f"Error fetching public form configs: {e}")
        # Return empty configs instead of error for graceful fallback
        return {
            "placeholders": {},
            "subcategory_placeholders": {},
            "seller_types": {},
            "preferences": {},
            "visibility_rules": {},
        }

logger.info("Form Configuration endpoints registered")

# =============================================================================
# PHOTOGRAPHY GUIDES ENDPOINTS
# Category-specific photo tips with illustration images for listing creation
# =============================================================================

# Default photography guides for seeding
DEFAULT_PHOTOGRAPHY_GUIDES = {
    "auto_vehicles": [
        {"icon": "car-outline", "title": "Exterior Shots", "description": "Take photos from all 4 corners, plus front and back"},
        {"icon": "speedometer-outline", "title": "Dashboard & Mileage", "description": "Show odometer clearly with engine running"},
        {"icon": "construct-outline", "title": "Engine Bay", "description": "Clean engine bay photo shows good maintenance"},
        {"icon": "warning-outline", "title": "Any Damage", "description": "Be transparent - show scratches, dents honestly"},
    ],
    "properties": [
        {"icon": "home-outline", "title": "Wide Angles", "description": "Use corners of rooms to capture full space"},
        {"icon": "sunny-outline", "title": "Natural Light", "description": "Shoot during daytime with curtains open"},
        {"icon": "image-outline", "title": "Key Features", "description": "Highlight kitchen, bathrooms, views, balcony"},
        {"icon": "map-outline", "title": "Neighborhood", "description": "Include street view, nearby amenities"},
    ],
    "electronics": [
        {"icon": "phone-portrait-outline", "title": "Clean Background", "description": "Use plain white/neutral background"},
        {"icon": "flash-outline", "title": "Good Lighting", "description": "Avoid harsh shadows, show true colors"},
        {"icon": "apps-outline", "title": "Screen On", "description": "For devices, show working screen"},
        {"icon": "cube-outline", "title": "Box & Accessories", "description": "Include original packaging, chargers, manuals"},
    ],
    "phones_tablets": [
        {"icon": "phone-portrait-outline", "title": "Screen Condition", "description": "Show screen clearly - any scratches or cracks"},
        {"icon": "camera-outline", "title": "Camera Quality", "description": "Include a sample photo taken with the device"},
        {"icon": "cube-outline", "title": "All Angles", "description": "Show front, back, sides, and corners"},
        {"icon": "gift-outline", "title": "Accessories", "description": "Photo all included items - case, charger, box"},
    ],
    "home_furniture": [
        {"icon": "resize-outline", "title": "Scale Reference", "description": "Include common object for size comparison"},
        {"icon": "color-palette-outline", "title": "True Colors", "description": "Use natural light to show actual color"},
        {"icon": "eye-outline", "title": "Close-ups", "description": "Show material texture, patterns, details"},
        {"icon": "alert-circle-outline", "title": "Wear & Tear", "description": "Be honest about any scratches or stains"},
    ],
    "fashion_beauty": [
        {"icon": "shirt-outline", "title": "Flat Lay or Hanger", "description": "Show full garment clearly laid out"},
        {"icon": "body-outline", "title": "Worn Photos", "description": "If possible, show item being worn"},
        {"icon": "pricetag-outline", "title": "Tags & Labels", "description": "Include brand tags, size labels, care instructions"},
        {"icon": "search-outline", "title": "Detail Shots", "description": "Show stitching, buttons, zippers, fabric texture"},
    ],
    "jobs_services": [
        {"icon": "briefcase-outline", "title": "Professional Photo", "description": "Use a clear, professional headshot"},
        {"icon": "albums-outline", "title": "Portfolio", "description": "Show examples of your work or projects"},
        {"icon": "ribbon-outline", "title": "Certifications", "description": "Include photos of relevant certificates"},
        {"icon": "build-outline", "title": "Equipment", "description": "For trades, show your professional tools"},
    ],
    "pets": [
        {"icon": "paw-outline", "title": "Natural Behavior", "description": "Capture pet in natural, relaxed state"},
        {"icon": "sunny-outline", "title": "Good Lighting", "description": "Natural light shows true coat color"},
        {"icon": "camera-outline", "title": "Eye Level", "description": "Get down to pet's level for best shots"},
        {"icon": "heart-outline", "title": "Personality", "description": "Show pet's character - playing, sleeping, curious"},
    ],
    "default": [
        {"icon": "camera-outline", "title": "Good Lighting", "description": "Use natural light when possible"},
        {"icon": "images-outline", "title": "Multiple Angles", "description": "Show item from different perspectives"},
        {"icon": "eye-outline", "title": "Show Details", "description": "Include close-ups of important features"},
        {"icon": "alert-circle-outline", "title": "Be Honest", "description": "Show any defects or wear clearly"},
    ],
}

# Public endpoint - Get photography guides for a category (no auth required)
@app.get("/api/photography-guides/public/{category_id}")
async def get_public_photography_guides(category_id: str):
    """Get active photography guides for a category (public endpoint)"""
    try:
        guides = []
        cursor = db.photography_guides.find(
            {"category_id": category_id, "is_active": True}
        ).sort("order", 1).limit(10)
        
        async for guide in cursor:
            # Support both image_url (external URL) and image_base64 (stored base64)
            image_url = None
            if guide.get("image_url"):
                image_url = guide["image_url"]
            elif guide.get("image_base64"):
                image_url = f"data:image/jpeg;base64,{guide['image_base64']}"
            
            guides.append({
                "id": str(guide["_id"]),
                "category_id": guide["category_id"],
                "title": guide["title"],
                "description": guide["description"],
                "icon": guide.get("icon", "camera-outline"),
                "image_url": image_url,
                "order": guide.get("order", 0),
            })
        
        return {"guides": guides, "count": len(guides)}
    except Exception as e:
        logger.error(f"Error fetching photography guides: {e}")
        return {"guides": [], "count": 0}

# Admin endpoint - List all photography guides
@app.get("/api/admin/photography-guides")
async def list_photography_guides(
    category_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = 1,
    limit: int = 50,
    current_user: dict = Depends(get_current_admin)
):
    """List all photography guides with optional filtering (admin only)"""
    try:
        query = {}
        if category_id:
            query["category_id"] = category_id
        if is_active is not None:
            query["is_active"] = is_active
        
        total = await db.photography_guides.count_documents(query)
        skip = (page - 1) * limit
        
        guides = []
        cursor = db.photography_guides.find(
            query,
            {"image_base64": 0}  # Exclude base64 from list for performance
        ).sort([("category_id", 1), ("order", 1)]).skip(skip).limit(limit)
        
        async for guide in cursor:
            guides.append({
                "id": str(guide["_id"]),
                "category_id": guide["category_id"],
                "title": guide["title"],
                "description": guide["description"],
                "icon": guide.get("icon", "camera-outline"),
                "has_image": guide.get("has_image", False),
                "order": guide.get("order", 0),
                "is_active": guide.get("is_active", True),
                "created_at": guide.get("created_at", "").isoformat() if isinstance(guide.get("created_at"), datetime) else str(guide.get("created_at", "")),
                "updated_at": guide.get("updated_at", "").isoformat() if isinstance(guide.get("updated_at"), datetime) else str(guide.get("updated_at", "")),
            })
        
        return {
            "guides": guides,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit if limit > 0 else 0
        }
    except Exception as e:
        logger.error(f"Error listing photography guides: {e}")
        raise HTTPException(status_code=500, detail="Failed to list photography guides")

# Admin endpoint - Get statistics
@app.get("/api/admin/photography-guides/stats")
async def get_photography_guides_stats(current_user: dict = Depends(get_current_admin)):
    """Get photography guides statistics"""
    try:
        total = await db.photography_guides.count_documents({})
        active = await db.photography_guides.count_documents({"is_active": True})
        with_images = await db.photography_guides.count_documents({"has_image": True})
        
        # Count by category
        pipeline = [
            {"$group": {"_id": "$category_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        by_category = {}
        async for doc in db.photography_guides.aggregate(pipeline):
            by_category[doc["_id"]] = doc["count"]
        
        return {
            "total": total,
            "active": active,
            "inactive": total - active,
            "with_images": with_images,
            "categories_count": len(by_category),
            "by_category": by_category
        }
    except Exception as e:
        logger.error(f"Error getting photography guides stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get statistics")

# Admin endpoint - Get single guide with full details
@app.get("/api/admin/photography-guides/{guide_id}")
async def get_photography_guide(guide_id: str, current_user: dict = Depends(get_current_admin)):
    """Get a specific photography guide with full details"""
    try:
        guide = await db.photography_guides.find_one({"_id": ObjectId(guide_id)})
        if not guide:
            raise HTTPException(status_code=404, detail="Guide not found")
        
        return {
            "id": str(guide["_id"]),
            "category_id": guide["category_id"],
            "title": guide["title"],
            "description": guide["description"],
            "icon": guide.get("icon", "camera-outline"),
            "image_url": f"data:image/jpeg;base64,{guide['image_base64']}" if guide.get("image_base64") else None,
            "has_image": bool(guide.get("image_base64")),
            "order": guide.get("order", 0),
            "is_active": guide.get("is_active", True),
            "created_at": guide.get("created_at", "").isoformat() if isinstance(guide.get("created_at"), datetime) else "",
            "updated_at": guide.get("updated_at", "").isoformat() if isinstance(guide.get("updated_at"), datetime) else "",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting photography guide: {e}")
        raise HTTPException(status_code=500, detail="Failed to get photography guide")

# Admin endpoint - Create guide
@app.post("/api/admin/photography-guides")
async def create_photography_guide(
    guide_data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_admin)
):
    """Create a new photography guide"""
    try:
        now = datetime.now(timezone.utc)
        
        doc = {
            "category_id": guide_data.get("category_id"),
            "title": guide_data.get("title"),
            "description": guide_data.get("description"),
            "icon": guide_data.get("icon", "camera-outline"),
            "order": guide_data.get("order", 0),
            "is_active": guide_data.get("is_active", True),
            "has_image": False,
            "created_at": now,
            "updated_at": now,
            "created_by": current_user.get("email", "admin")
        }
        
        # Handle image upload
        image_base64 = guide_data.get("image_base64")
        if image_base64:
            # Remove data URL prefix if present
            if "base64," in image_base64:
                image_base64 = image_base64.split("base64,")[1]
            doc["image_base64"] = image_base64
            doc["has_image"] = True
        
        result = await db.photography_guides.insert_one(doc)
        
        return {
            "id": str(result.inserted_id),
            "message": "Photography guide created successfully"
        }
    except Exception as e:
        logger.error(f"Error creating photography guide: {e}")
        raise HTTPException(status_code=500, detail="Failed to create photography guide")

# Admin endpoint - Update guide
@app.put("/api/admin/photography-guides/{guide_id}")
async def update_photography_guide(
    guide_id: str,
    guide_data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_admin)
):
    """Update a photography guide"""
    try:
        existing = await db.photography_guides.find_one({"_id": ObjectId(guide_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Guide not found")
        
        update_doc = {"updated_at": datetime.now(timezone.utc)}
        
        for field in ["title", "description", "icon", "order", "is_active", "category_id"]:
            if field in guide_data and guide_data[field] is not None:
                update_doc[field] = guide_data[field]
        
        # Handle image update
        if "image_base64" in guide_data:
            if guide_data["image_base64"] == "" or guide_data["image_base64"] is None:
                # Remove image
                update_doc["image_base64"] = None
                update_doc["has_image"] = False
            else:
                # Update image
                image_data = guide_data["image_base64"]
                if "base64," in image_data:
                    image_data = image_data.split("base64,")[1]
                update_doc["image_base64"] = image_data
                update_doc["has_image"] = True
        
        await db.photography_guides.update_one(
            {"_id": ObjectId(guide_id)},
            {"$set": update_doc}
        )
        
        return {"message": "Photography guide updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating photography guide: {e}")
        raise HTTPException(status_code=500, detail="Failed to update photography guide")

# Admin endpoint - Delete guide
@app.delete("/api/admin/photography-guides/{guide_id}")
async def delete_photography_guide(guide_id: str, current_user: dict = Depends(get_current_admin)):
    """Delete a photography guide"""
    try:
        result = await db.photography_guides.delete_one({"_id": ObjectId(guide_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Guide not found")
        
        return {"message": "Photography guide deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting photography guide: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete photography guide")

# Admin endpoint - Seed default guides
@app.post("/api/admin/photography-guides/seed")
async def seed_photography_guides(current_user: dict = Depends(get_current_admin)):
    """Seed default photography guides for all categories"""
    try:
        now = datetime.now(timezone.utc)
        created_count = 0
        
        for category_id, guides in DEFAULT_PHOTOGRAPHY_GUIDES.items():
            for i, guide in enumerate(guides):
                # Check if guide already exists
                existing = await db.photography_guides.find_one({
                    "category_id": category_id,
                    "title": guide["title"]
                })
                
                if not existing:
                    doc = {
                        "category_id": category_id,
                        "title": guide["title"],
                        "description": guide["description"],
                        "icon": guide.get("icon", "camera-outline"),
                        "order": i,
                        "is_active": True,
                        "has_image": False,
                        "created_at": now,
                        "updated_at": now,
                        "created_by": "system"
                    }
                    await db.photography_guides.insert_one(doc)
                    created_count += 1
        
        return {"message": f"Seeded {created_count} default photography guides", "created": created_count}
    except Exception as e:
        logger.error(f"Error seeding photography guides: {e}")
        raise HTTPException(status_code=500, detail="Failed to seed photography guides")

# Admin endpoint - Reorder guides
@app.put("/api/admin/photography-guides/reorder/{category_id}")
async def reorder_photography_guides(
    category_id: str,
    guide_ids: List[str] = Body(...),
    current_user: dict = Depends(get_current_admin)
):
    """Reorder guides within a category"""
    try:
        now = datetime.now(timezone.utc)
        
        for i, guide_id in enumerate(guide_ids):
            await db.photography_guides.update_one(
                {"_id": ObjectId(guide_id), "category_id": category_id},
                {"$set": {"order": i, "updated_at": now}}
            )
        
        return {"message": "Guides reordered successfully"}
    except Exception as e:
        logger.error(f"Error reordering photography guides: {e}")
        raise HTTPException(status_code=500, detail="Failed to reorder guides")

logger.info("Photography Guides endpoints registered")

# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get('ADMIN_PORT', 8002))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)
