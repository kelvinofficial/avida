"""
Admin Dashboard Backend - Main Server
Production-ready admin panel for marketplace management
"""

from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response, Query, UploadFile, File, Body, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
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
    """List all support tickets"""
    query = {}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if assigned_to:
        query["assigned_to"] = assigned_to
    
    skip = (page - 1) * limit
    total = await db.admin_tickets.count_documents(query)
    tickets = await db.admin_tickets.find(query, {"_id": 0}).skip(skip).limit(limit).sort("created_at", -1).to_list(limit)
    
    return {
        "items": tickets,
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
    """Update ticket"""
    ticket = await db.admin_tickets.find_one({"id": ticket_id})
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
    
    await db.admin_tickets.update_one({"id": ticket_id}, {"$set": updates})
    await log_audit(admin["id"], admin["email"], AuditAction.UPDATE, "ticket", ticket_id, updates, request)
    
    return await db.admin_tickets.find_one({"id": ticket_id}, {"_id": 0})

@api_router.post("/tickets/{ticket_id}/respond")
async def respond_to_ticket(
    request: Request,
    ticket_id: str,
    response_data: TicketResponse,
    admin: dict = Depends(require_permission(Permission.MANAGE_TICKETS))
):
    """Add response to ticket"""
    ticket = await db.admin_tickets.find_one({"id": ticket_id})
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
    
    await db.admin_tickets.update_one(
        {"id": ticket_id},
        {
            "$push": {"responses": response},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    
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
    
    # Get FCM tokens for users
    fcm_tokens = await get_user_tokens(db, user_ids) if user_ids else []
    
    # Send push notification
    push_result = await send_push_notification(
        title=existing.get("title", ""),
        body=existing.get("message", ""),
        user_ids=user_ids,
        fcm_tokens=fcm_tokens,
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
    if users:
        notification_records = [
            {
                "id": f"nr_{uuid.uuid4().hex[:12]}",
                "notification_id": notif_id,
                "user_id": u["user_id"],
                "is_read": False,
                "created_at": now,
            }
            for u in users
        ]
        await db.user_notifications.insert_many(notification_records)
    
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
# ESCROW SYSTEM PROXY ENDPOINTS
# Direct database access for escrow management
# =============================================================================

@app.get("/api/escrow/admin/verified-sellers")
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

@app.post("/api/escrow/admin/verify-seller/{seller_id}")
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

@app.get("/api/escrow/admin/orders")
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

@app.get("/api/escrow/admin/disputes")
async def get_all_disputes(admin = Depends(get_current_admin)):
    """Get all disputes"""
    disputes = await db.disputes.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return disputes

@app.post("/api/escrow/admin/disputes/{dispute_id}/resolve")
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

@app.post("/api/escrow/admin/orders/{order_id}/release-escrow")
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

@app.get("/api/escrow/vat-configs")
async def get_vat_configs():
    """Get VAT configurations - public endpoint"""
    configs = await db.vat_configs.find({}, {"_id": 0}).to_list(50)
    if not configs:
        # Return defaults
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

@app.get("/api/escrow/commission-configs")
async def get_commission_configs():
    """Get commission configurations - public endpoint"""
    configs = await db.commission_configs.find({}, {"_id": 0}).to_list(10)
    if not configs:
        configs = [{"id": "default", "percentage": 5, "min_amount": 0, "is_active": True}]
    return configs

@app.get("/api/escrow/transport-pricing")
async def get_transport_pricing():
    """Get transport pricing - public endpoint"""
    pricing = await db.transport_pricing.find({}, {"_id": 0}).to_list(20)
    if not pricing:
        pricing = [
            {"id": "standard", "base_price": 5.0, "estimated_days_base": 3, "name": "Standard Delivery", "price_per_kg": 0.5, "price_per_km": 0.15},
            {"id": "express", "base_price": 15.0, "estimated_days_base": 1, "name": "Express Delivery", "price_per_kg": 1.0, "price_per_km": 0.30},
        ]
    return pricing

# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get('ADMIN_PORT', 8002))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)
