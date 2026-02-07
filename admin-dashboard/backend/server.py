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
    
    # Listing management
    VIEW_LISTINGS = "view_listings"
    EDIT_LISTINGS = "edit_listings"
    DELETE_LISTINGS = "delete_listings"
    FEATURE_LISTINGS = "feature_listings"
    
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
    type: str
    required: bool = False
    options: Optional[List[str]] = None
    validation: Optional[Dict[str, Any]] = None
    order: int = 0
    conditions: Optional[List[Dict[str, Any]]] = None

class AttributeUpdate(BaseModel):
    name: Optional[str] = None
    key: Optional[str] = None
    type: Optional[str] = None
    required: Optional[bool] = None
    options: Optional[List[str]] = None
    validation: Optional[Dict[str, Any]] = None
    order: Optional[int] = None
    conditions: Optional[List[Dict[str, Any]]] = None

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

# =============================================================================
# ATTRIBUTE MANAGEMENT ENDPOINTS
# =============================================================================

@api_router.get("/categories/{category_id}/attributes")
async def get_category_attributes(
    category_id: str,
    admin: dict = Depends(require_permission(Permission.VIEW_ATTRIBUTES))
):
    """Get attributes for a category"""
    category = await db.admin_categories.find_one({"id": category_id}, {"_id": 0, "attributes": 1})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category.get("attributes", [])

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
        "conditions": attribute.conditions
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
    
    if updates:
        updates["updated_at"] = datetime.now(timezone.utc)
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

# Include router
app.include_router(api_router)

# Root redirect
@app.get("/")
async def root():
    return {"message": "Admin Dashboard API", "docs": "/docs"}

# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get('ADMIN_PORT', 8002))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)
