"""
Instant Listings Feed API
High-performance feed endpoint with cursor-based pagination, caching, and minimal payload.
"""

from fastapi import APIRouter, Query, Response, Request
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
import hashlib
import json
import time
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/feed", tags=["Feed"])

# Import cache (with fallback if not available)
try:
    from utils.cache import cache, CACHE_TTL
    CACHE_AVAILABLE = True
except ImportError:
    CACHE_AVAILABLE = False
    logger.warning("Cache module not available")

# Import image optimizer for thumbnail compression
try:
    from utils.image_optimizer import create_thumbnail, is_url
    IMAGE_OPTIMIZER_AVAILABLE = True
except ImportError:
    IMAGE_OPTIMIZER_AVAILABLE = False
    logger.warning("Image optimizer not available")

# In-memory thumbnail cache to avoid re-compressing same images
_thumbnail_cache = {}
MAX_THUMBNAIL_CACHE_SIZE = 500

def get_compressed_thumbnail(img_source: str) -> str:
    """
    Get compressed thumbnail from image source.
    For URLs: return as-is
    For base64: compress to small WebP thumbnail
    Uses caching to avoid re-compression.
    """
    if not img_source:
        return None
    
    # URLs don't need compression
    if is_url(img_source) if IMAGE_OPTIMIZER_AVAILABLE else img_source.startswith(('http://', 'https://')):
        return img_source
    
    # Check thumbnail cache
    cache_key = hash(img_source[:100])  # Use first 100 chars as key
    if cache_key in _thumbnail_cache:
        return _thumbnail_cache[cache_key]
    
    # Compress base64 image if optimizer available
    if IMAGE_OPTIMIZER_AVAILABLE:
        try:
            thumbnail = create_thumbnail(img_source, size=(200, 200))  # Small thumbnails
            if thumbnail:
                # Cache the result
                if len(_thumbnail_cache) >= MAX_THUMBNAIL_CACHE_SIZE:
                    _thumbnail_cache.clear()  # Simple cache eviction
                _thumbnail_cache[cache_key] = thumbnail
                return thumbnail
        except Exception as e:
            logger.debug(f"Thumbnail compression failed: {e}")
    
    # Fallback: return original (will be large but functional)
    return img_source

def create_feed_router(db):
    """Create the feed router with database dependency."""
    
    # Minimal fields for feed cards - reduces payload size by ~80%
    FEED_PROJECTION = {
        "_id": 0,
        "id": 1,
        "title": 1,
        "price": 1,
        "currency": 1,
        "location": 1,
        "cityName": 1,  # Pre-computed for display
        "category": 1,
        "subcategory": 1,
        "images": {"$slice": 1},  # Only first image for thumbnail
        "thumbnail": 1,  # Optimized thumbnail URL
        "created_at": 1,
        "is_boosted": 1,
        "boost_expires_at": 1,
        "user_id": 1,
        "status": 1,
        "views_count": 1,
        "is_negotiable": 1,
    }
    
    def generate_cache_key(params: dict) -> str:
        """Generate a unique cache key from query parameters."""
        key_data = json.dumps(params, sort_keys=True, default=str)
        return f"feed:{hashlib.md5(key_data.encode()).hexdigest()[:16]}"
    
    @router.get("/listings")
    async def get_listings_feed(
        request: Request,
        response: Response,
        country: Optional[str] = Query(None, description="Country code filter"),
        region: Optional[str] = Query(None, description="Region/state filter"),
        city: Optional[str] = Query(None, description="City filter"),
        category: Optional[str] = Query(None, description="Category filter"),
        subcategory: Optional[str] = Query(None, description="Subcategory filter"),
        sort: str = Query("newest", description="Sort: newest, price_low, price_high, popular"),
        cursor: Optional[str] = Query(None, description="Cursor for pagination"),
        limit: int = Query(20, ge=1, le=50, description="Items per page"),
        seller_id: Optional[str] = Query(None, description="Filter by seller"),
        search: Optional[str] = Query(None, description="Search query"),
    ):
        """
        High-performance feed endpoint with cursor-based pagination.
        
        Features:
        - Redis/memory caching (60s TTL)
        - Minimal payload (only fields needed for feed cards)
        - Cursor-based pagination for stable results
        - ETag support for HTTP caching
        - Optimized MongoDB queries with proper indexes
        
        Target: < 300ms response time
        """
        start_time = time.time()
        
        # Generate cache key
        cache_params = {
            "country": country, "region": region, "city": city,
            "category": category, "subcategory": subcategory,
            "sort": sort, "cursor": cursor, "limit": limit,
            "seller_id": seller_id, "search": search
        }
        cache_key = generate_cache_key(cache_params)
        
        # Try cache first (skip if cursor-based pagination for freshness)
        if CACHE_AVAILABLE and not cursor:
            cached_result = await cache.get(cache_key)
            if cached_result:
                # Add cache header
                response.headers["X-Cache"] = "HIT"
                response.headers["X-Response-Time"] = f"{(time.time() - start_time) * 1000:.0f}ms"
                return cached_result
        
        # Build query
        query = {"status": "active"}
        
        # Build location filter using proper AND logic
        location_conditions = []
        
        if country:
            location_conditions.append({
                "$or": [
                    {"location.country_code": country},
                    {"location.country": country},
                ]
            })
        
        if region:
            location_conditions.append({
                "$or": [
                    {"location.region": region},
                    {"location.region_code": region},
                ]
            })
        
        if city:
            location_conditions.append({
                "$or": [
                    {"location.city": city},
                    {"location.city_id": city},
                    {"location.city_code": city},
                ]
            })
        
        # Apply location conditions with AND logic
        if location_conditions:
            if len(location_conditions) == 1:
                query.update(location_conditions[0])
            else:
                query["$and"] = location_conditions
            
        if category:
            query["category"] = category
            
        if subcategory:
            query["subcategory"] = subcategory
            
        if seller_id:
            query["user_id"] = seller_id
            
        if search:
            query["$text"] = {"$search": search}
        
        # Determine sort order
        now = datetime.now(timezone.utc)
        sort_options = {
            "newest": [("created_at", -1)],
            "oldest": [("created_at", 1)],
            "price_low": [("price", 1), ("created_at", -1)],
            "price_high": [("price", -1), ("created_at", -1)],
            "popular": [("views_count", -1), ("created_at", -1)],
        }
        sort_order = sort_options.get(sort, sort_options["newest"])
        
        # Handle cursor-based pagination
        if cursor:
            try:
                cursor_data = json.loads(cursor)
                cursor_id = cursor_data.get("id")
                cursor_created = cursor_data.get("created_at")
                
                if sort == "newest":
                    query["$or"] = [
                        {"created_at": {"$lt": cursor_created}},
                        {"created_at": cursor_created, "id": {"$lt": cursor_id}}
                    ]
                elif sort == "oldest":
                    query["$or"] = [
                        {"created_at": {"$gt": cursor_created}},
                        {"created_at": cursor_created, "id": {"$gt": cursor_id}}
                    ]
            except:
                pass  # Invalid cursor, start from beginning
        
        # Get boosted listings first (if not using cursor)
        boosted_items = []
        if not cursor:
            boosted_query = {**query, "is_boosted": True, "boost_expires_at": {"$gt": now.isoformat()}}
            boosted_cursor = db.listings.find(boosted_query, FEED_PROJECTION).sort("boost_expires_at", -1).limit(5)
            boosted_items = await boosted_cursor.to_list(5)
            
            # Exclude boosted items from main query to avoid duplicates
            if boosted_items:
                boosted_ids = [item["id"] for item in boosted_items]
                query["id"] = {"$nin": boosted_ids}
        
        # Execute main query
        cursor_obj = db.listings.find(query, FEED_PROJECTION).sort(sort_order).limit(limit + 1)
        items = await cursor_obj.to_list(limit + 1)
        
        # Determine if there are more items
        has_more = len(items) > limit
        if has_more:
            items = items[:limit]
        
        # Build next cursor
        next_cursor = None
        if has_more and items:
            last_item = items[-1]
            created_at = last_item.get("created_at")
            # Handle datetime objects
            if hasattr(created_at, 'isoformat'):
                created_at = created_at.isoformat()
            next_cursor = json.dumps({
                "id": last_item.get("id"),
                "created_at": created_at
            })
        
        # Combine boosted + regular items
        all_items = boosted_items + items
        
        # Transform items for feed
        feed_items = []
        for item in all_items:
            # Get thumbnail URL - compress base64 images for smaller payload
            thumb_url = None
            if item.get("images") and len(item["images"]) > 0:
                img = item["images"][0]
                img_url = img if isinstance(img, str) else img.get("url", img.get("uri"))
                if img_url and isinstance(img_url, str):
                    # Compress base64 thumbnails for smaller payload
                    thumb_url = get_compressed_thumbnail(img_url)
            
            # Handle location - it could be a string or an object
            location = item.get("location", {})
            if isinstance(location, str):
                city_name = location
                country_code = "TZ"
            else:
                city_name = location.get("city", "Unknown") if location else "Unknown"
                country_code = location.get("country_code", "TZ") if location else "TZ"
            
            # Handle created_at - it could be a datetime or string
            created_at = item.get("created_at")
            if hasattr(created_at, 'isoformat'):
                created_at = created_at.isoformat()
            
            feed_items.append({
                "id": item.get("id"),
                "title": item.get("title", ""),
                "price": item.get("price", 0),
                "currency": item.get("currency", "TZS"),
                "cityName": city_name,
                "countryCode": country_code,
                "category": item.get("category"),
                "subcategory": item.get("subcategory"),
                "thumbUrl": thumb_url,
                "createdAt": created_at,
                "isBoosted": item.get("is_boosted", False),
                "sellerId": item.get("user_id"),
                "viewsCount": item.get("views_count", 0),
                "isNegotiable": item.get("is_negotiable", False),
            })
        
        # Get approximate total (for UI, not exact)
        total_approx = await db.listings.count_documents({"status": "active"})
        
        # Build response
        result = {
            "items": feed_items,
            "nextCursor": next_cursor,
            "totalApprox": total_approx,
            "serverTime": now.isoformat(),
            "hasMore": has_more,
        }
        
        # Calculate response time
        response_time = (time.time() - start_time) * 1000
        
        # Cache the result (for non-cursor requests)
        if CACHE_AVAILABLE and not cursor:
            await cache.set(cache_key, result, ttl=60)
        
        # Generate ETag for caching
        etag_content = f"{json.dumps(query)}:{sort}:{cursor}:{limit}"
        etag = hashlib.md5(etag_content.encode()).hexdigest()
        
        # Check If-None-Match header
        if_none_match = request.headers.get("if-none-match")
        if if_none_match and if_none_match == etag:
            response.status_code = 304
            return None
        
        # Set cache headers
        response.headers["ETag"] = etag
        response.headers["Cache-Control"] = "max-age=30, stale-while-revalidate=120"
        response.headers["X-Total-Approx"] = str(total_approx)
        response.headers["X-Cache"] = "MISS"
        response.headers["X-Response-Time"] = f"{response_time:.0f}ms"
        
        return result
    
    @router.get("/listings/cached-meta")
    async def get_feed_cache_meta():
        """
        Get metadata for cache invalidation.
        Returns latest update timestamp and count.
        """
        latest = await db.listings.find_one(
            {"status": "active"},
            {"created_at": 1, "_id": 0},
            sort=[("created_at", -1)]
        )
        
        count = await db.listings.count_documents({"status": "active"})
        
        return {
            "latestUpdate": latest.get("created_at") if latest else None,
            "totalCount": count,
            "serverTime": datetime.now(timezone.utc).isoformat(),
        }
    
    return router


# MongoDB Indexes Migration Script (run once)
FEED_INDEXES = [
    # Primary feed index - covers most common queries
    {
        "keys": [("status", 1), ("created_at", -1)],
        "name": "feed_primary_idx"
    },
    # Country + City + Category + Date (most selective)
    {
        "keys": [("status", 1), ("location.country_code", 1), ("location.city", 1), ("category", 1), ("created_at", -1)],
        "name": "feed_location_category_idx"
    },
    # Boosted listings index
    {
        "keys": [("is_boosted", 1), ("boost_expires_at", -1), ("status", 1)],
        "name": "feed_boosted_idx"
    },
    # Seller listings index
    {
        "keys": [("user_id", 1), ("status", 1), ("created_at", -1)],
        "name": "feed_seller_idx"
    },
    # Price sorting index
    {
        "keys": [("status", 1), ("price", 1), ("created_at", -1)],
        "name": "feed_price_idx"
    },
    # Popular sorting index
    {
        "keys": [("status", 1), ("views_count", -1), ("created_at", -1)],
        "name": "feed_popular_idx"
    },
    # Category only index
    {
        "keys": [("status", 1), ("category", 1), ("created_at", -1)],
        "name": "feed_category_idx"
    },
    # Text search index
    {
        "keys": [("title", "text"), ("description", "text")],
        "name": "feed_text_search_idx"
    },
]


async def ensure_feed_indexes(db):
    """Create all required indexes for the feed endpoint."""
    for index_def in FEED_INDEXES:
        try:
            await db.listings.create_index(
                index_def["keys"],
                name=index_def["name"],
                background=True
            )
            print(f"Created index: {index_def['name']}")
        except Exception as e:
            print(f"Index {index_def['name']} already exists or error: {e}")
