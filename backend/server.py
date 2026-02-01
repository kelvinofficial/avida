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
        "id": "fashion",
        "name": "Fashion & Accessories",
        "icon": "shirt-outline",
        "subcategories": ["Clothing", "Shoes", "Bags", "Jewelry", "Watches"],
        "attributes": [
            {"name": "size", "type": "select", "options": ["XS", "S", "M", "L", "XL", "XXL"], "required": False},
            {"name": "brand", "type": "text", "required": False},
            {"name": "color", "type": "text", "required": False},
            {"name": "gender", "type": "select", "options": ["Men", "Women", "Unisex"], "required": False}
        ]
    },
    {
        "id": "home",
        "name": "Home & Garden",
        "icon": "home-outline",
        "subcategories": ["Furniture", "Kitchen", "Decor", "Garden", "Tools"],
        "attributes": [
            {"name": "material", "type": "text", "required": False},
            {"name": "dimensions", "type": "text", "required": False}
        ]
    },
    {
        "id": "electronics",
        "name": "Electronics",
        "icon": "phone-portrait-outline",
        "subcategories": ["Phones", "Computers", "Gaming", "Audio", "Cameras", "TV"],
        "attributes": [
            {"name": "brand", "type": "text", "required": False},
            {"name": "model", "type": "text", "required": False},
            {"name": "storage", "type": "text", "required": False}
        ]
    },
    {
        "id": "realestate",
        "name": "Real Estate",
        "icon": "business-outline",
        "subcategories": ["Apartments", "Houses", "Rooms", "Commercial", "Land"],
        "attributes": [
            {"name": "rooms", "type": "number", "required": False},
            {"name": "sqm", "type": "number", "required": False},
            {"name": "type", "type": "select", "options": ["Rent", "Sale"], "required": True}
        ]
    },
    {
        "id": "vehicles",
        "name": "Cars, Bikes & Boats",
        "icon": "car-outline",
        "subcategories": ["Cars", "Motorcycles", "Bicycles", "Boats", "Parts"],
        "attributes": [
            {"name": "make", "type": "text", "required": False},
            {"name": "model", "type": "text", "required": False},
            {"name": "year", "type": "number", "required": False},
            {"name": "mileage", "type": "number", "required": False}
        ]
    },
    {
        "id": "family",
        "name": "Family & Baby",
        "icon": "people-outline",
        "subcategories": ["Baby Clothing", "Toys", "Strollers", "Furniture", "Maternity"],
        "attributes": [
            {"name": "age_group", "type": "select", "options": ["0-6 months", "6-12 months", "1-2 years", "2-4 years", "4+ years"], "required": False}
        ]
    },
    {
        "id": "jobs",
        "name": "Jobs",
        "icon": "briefcase-outline",
        "subcategories": ["Full-time", "Part-time", "Freelance", "Internship"],
        "attributes": [
            {"name": "job_type", "type": "select", "options": ["Full-time", "Part-time", "Contract", "Freelance"], "required": False},
            {"name": "industry", "type": "text", "required": False}
        ]
    },
    {
        "id": "services",
        "name": "Services",
        "icon": "construct-outline",
        "subcategories": ["Cleaning", "Repair", "Moving", "Tutoring", "Other"],
        "attributes": [
            {"name": "service_type", "type": "text", "required": False},
            {"name": "availability", "type": "text", "required": False}
        ]
    },
    {
        "id": "misc",
        "name": "Miscellaneous",
        "icon": "ellipsis-horizontal-outline",
        "subcategories": ["Books", "Sports", "Music", "Art", "Collectibles", "Other"],
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
    
    # Get seller info
    seller = await db.users.find_one({"user_id": listing["user_id"]}, {"_id": 0})
    
    # Check if favorited by current user
    is_favorited = False
    user = await get_current_user(request)
    if user:
        favorite = await db.favorites.find_one({"user_id": user.user_id, "listing_id": listing_id})
        is_favorited = favorite is not None
    
    return {
        **listing,
        "seller": {
            "user_id": seller["user_id"],
            "name": seller["name"],
            "picture": seller.get("picture"),
            "rating": seller.get("rating", 0),
            "verified": seller.get("verified", False),
            "created_at": seller.get("created_at")
        } if seller else None,
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
    if conversation_id:
        await sio.emit("user_typing", {"user_id": user_id}, room=conversation_id, skip_sid=sid)

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
    """Create a new conversation for an auto listing"""
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
    buyer_id = user.get("user_id") if user else f"guest_{uuid.uuid4().hex[:8]}"
    buyer_name = user.get("name") if user else "Interested Buyer"
    
    # Create conversation
    conversation_id = f"conv_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    conversation = {
        "id": conversation_id,
        "listing_id": listing_id,
        "listing_title": listing.get("title"),
        "listing_image": listing.get("images", [""])[0] if listing.get("images") else "",
        "listing_price": listing.get("price"),
        "seller_id": listing.get("user_id"),
        "seller_name": listing.get("seller", {}).get("name", "Seller"),
        "seller_phone": listing.get("seller", {}).get("phone", ""),
        "buyer_id": buyer_id,
        "buyer_name": buyer_name,
        "messages": [],
        "last_message": initial_message if initial_message else "Started conversation",
        "last_message_at": now,
        "created_at": now,
        "updated_at": now,
        "unread_count": 0,
    }
    
    # Add initial message if provided
    if initial_message:
        conversation["messages"].append({
            "id": f"msg_{uuid.uuid4().hex[:8]}",
            "sender_id": buyer_id,
            "sender_name": buyer_name,
            "content": initial_message,
            "timestamp": now,
            "read": False,
        })
        conversation["unread_count"] = 1
    
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
    
    # Get current user
    user = await get_current_user(request)
    sender_id = user.get("user_id") if user else f"guest_{uuid.uuid4().hex[:8]}"
    sender_name = user.get("name") if user else "User"
    
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
