"""
Listings Routes Module
Handles listing CRUD operations, search, and similar listings
"""

import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Request, Query, Depends
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# MODELS
# =============================================================================

class LocationData(BaseModel):
    """Structured location data for listings"""
    country_code: Optional[str] = None
    region_code: Optional[str] = None
    district_code: Optional[str] = None
    city_code: Optional[str] = None
    city_name: Optional[str] = None
    region_name: Optional[str] = None
    district_name: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    location_text: Optional[str] = None  # "City, District, Region"


class ListingCreate(BaseModel):
    title: str
    description: str
    price: float
    currency: str = "EUR"
    negotiable: bool = True
    category_id: str
    subcategory: Optional[str] = None
    condition: Optional[str] = None
    images: List[str] = []
    location: Optional[str] = None  # Legacy text location
    location_data: Optional[LocationData] = None  # New structured location
    attributes: Dict[str, Any] = {}
    # Seller preferences
    accepts_offers: bool = True
    accepts_exchanges: bool = False
    contact_methods: List[str] = ["in_app_chat"]
    whatsapp_number: Optional[str] = None
    phone_number: Optional[str] = None


class ListingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    negotiable: Optional[bool] = None
    category_id: Optional[str] = None
    subcategory: Optional[str] = None
    condition: Optional[str] = None
    images: Optional[List[str]] = None
    location: Optional[str] = None  # Legacy text location
    location_data: Optional[LocationData] = None  # New structured location
    status: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None
    accepts_offers: Optional[bool] = None
    accepts_exchanges: Optional[bool] = None
    contact_methods: Optional[List[str]] = None
    whatsapp_number: Optional[str] = None
    phone_number: Optional[str] = None


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

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


# =============================================================================
# ROUTER FACTORY
# =============================================================================

def create_listings_router(
    db,
    get_current_user,
    require_auth,
    check_rate_limit,
    validate_category_and_subcategory,
    legacy_category_map: Dict[str, str]
):
    """
    Create the listings router with dependencies injected
    
    Args:
        db: MongoDB database instance
        get_current_user: Function to get current user from request
        require_auth: Function to require authentication
        check_rate_limit: Function to check rate limits
        validate_category_and_subcategory: Function to validate category/subcategory
        legacy_category_map: Dict mapping old category IDs to new ones
    
    Returns:
        APIRouter with listing endpoints
    """
    router = APIRouter(prefix="/listings", tags=["Listings"])
    
    @router.post("", response_model=dict)
    async def create_listing(listing: ListingCreate, request: Request):
        """Create a new listing"""
        user = await require_auth(request)
        
        # Rate limiting
        if not check_rate_limit(user.user_id, "post_listing"):
            raise HTTPException(status_code=429, detail="Too many listings. Please wait.")
        
        # Map legacy category ID if needed
        category_id = legacy_category_map.get(listing.category_id, listing.category_id)
        
        # Validate category and subcategory
        is_valid, error_message = validate_category_and_subcategory(category_id, listing.subcategory)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_message)
        
        # Create listing
        listing_id = str(uuid.uuid4())
        
        # Process location data
        location_text = listing.location
        location_data = None
        geo_point = None
        
        if listing.location_data:
            location_data = listing.location_data.model_dump() if hasattr(listing.location_data, 'model_dump') else listing.location_data.dict()
            # Use location_text from structured data if available
            if location_data.get('location_text'):
                location_text = location_data['location_text']
            # Create GeoJSON point for geospatial queries
            if location_data.get('lat') and location_data.get('lng'):
                geo_point = {
                    "type": "Point",
                    "coordinates": [location_data['lng'], location_data['lat']]  # GeoJSON is [lng, lat]
                }
        
        new_listing = {
            "id": listing_id,
            "user_id": user.user_id,
            "title": listing.title,
            "description": listing.description,
            "price": listing.price,
            "currency": listing.currency,
            "negotiable": listing.negotiable,
            "category_id": category_id,
            "subcategory": listing.subcategory,
            "condition": listing.condition,
            "images": listing.images[:10],  # Max 10 images
            "location": location_text,  # Legacy text location
            "location_data": location_data,  # Structured location
            "geo_point": geo_point,  # GeoJSON for spatial queries
            "attributes": listing.attributes,
            # Seller preferences
            "accepts_offers": listing.accepts_offers,
            "accepts_exchanges": listing.accepts_exchanges,
            "contact_methods": listing.contact_methods,
            "whatsapp_number": listing.whatsapp_number,
            "phone_number": listing.phone_number,
            "status": "active",
            "featured": False,
            "views": 0,
            "favorites_count": 0,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.listings.insert_one(new_listing)
        created_listing = await db.listings.find_one({"id": listing_id}, {"_id": 0})
        
        # Track cohort event for listing creation
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                await client.post(
                    "http://localhost:8001/api/cohort-analytics/events/track",
                    json={
                        "user_id": user.user_id,
                        "event_type": "listing_created",
                        "properties": {
                            "listing_id": listing_id,
                            "category_id": category_id,
                            "price": listing.price
                        }
                    },
                    timeout=2.0
                )
        except Exception as e:
            logger.debug(f"Cohort event tracking failed: {e}")
        
        # Trigger smart notifications for users interested in this category
        try:
            from smart_notifications import SmartNotificationService
            smart_service = SmartNotificationService(db)
            import asyncio
            asyncio.create_task(smart_service.check_new_listing_triggers(created_listing))
        except Exception as e:
            logger.debug(f"Smart notification trigger failed: {e}")
        
        # Check and award badges for listing creation (async, non-blocking)
        try:
            from services.badge_service import get_badge_service
            badge_service = get_badge_service(db)
            import asyncio
            asyncio.create_task(badge_service.check_and_award_badges(user.user_id, trigger="listing"))
        except Exception as e:
            logger.debug(f"Badge check failed: {e}")
        
        return created_listing
    
    @router.get("")
    async def get_listings(
        category: Optional[str] = None,
        subcategory: Optional[str] = None,
        search: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        condition: Optional[str] = None,
        location: Optional[str] = None,
        country_code: Optional[str] = None,
        region_code: Optional[str] = None,
        district_code: Optional[str] = None,
        city_code: Optional[str] = None,
        sort: str = "newest",
        page: int = 1,
        limit: int = 20,
        filters: Optional[str] = None  # JSON string of attribute filters
    ):
        """Get listings with filters, subcategory filtering, and pagination"""
        query = {"status": "active"}
        
        # Handle legacy category IDs
        if category:
            mapped_category = legacy_category_map.get(category, category)
            query["category_id"] = mapped_category
        
        # Subcategory filter
        if subcategory:
            query["subcategory"] = subcategory
        
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
        
        # Location filter - supports both hierarchical codes and text search
        if country_code:
            query["location_data.country_code"] = country_code.upper()
        if region_code:
            query["location_data.region_code"] = region_code.upper()
        if district_code:
            query["location_data.district_code"] = district_code.upper()
        if city_code:
            query["location_data.city_code"] = city_code.upper()
        
        # Fallback to text location search if no hierarchical codes provided
        if location and not any([country_code, region_code, district_code, city_code]):
            # Search in both legacy location field and new location_data.city_name
            query["$or"] = query.get("$or", []) + [
                {"location": {"$regex": location, "$options": "i"}},
                {"location_data.city_name": {"$regex": location, "$options": "i"}},
                {"location_data.location_text": {"$regex": location, "$options": "i"}}
            ]
            # If $or was already set for search, combine them with $and
            if search:
                search_or = [
                    {"title": {"$regex": search, "$options": "i"}},
                    {"description": {"$regex": search, "$options": "i"}}
                ]
                location_or = [
                    {"location": {"$regex": location, "$options": "i"}},
                    {"location_data.city_name": {"$regex": location, "$options": "i"}},
                    {"location_data.location_text": {"$regex": location, "$options": "i"}}
                ]
                query["$and"] = [{"$or": search_or}, {"$or": location_or}]
                del query["$or"]
        
        # Parse and apply dynamic attribute filters
        if filters:
            try:
                attr_filters = json.loads(filters)
                for attr_name, attr_value in attr_filters.items():
                    if attr_value is not None and attr_value != "":
                        # Handle range filters
                        if attr_name.endswith('_min'):
                            base_name = attr_name[:-4]
                            if f"attributes.{base_name}" not in query:
                                query[f"attributes.{base_name}"] = {}
                            query[f"attributes.{base_name}"]["$gte"] = attr_value
                        elif attr_name.endswith('_max'):
                            base_name = attr_name[:-4]
                            if f"attributes.{base_name}" not in query:
                                query[f"attributes.{base_name}"] = {}
                            query[f"attributes.{base_name}"]["$lte"] = attr_value
                        elif isinstance(attr_value, bool):
                            query[f"attributes.{attr_name}"] = attr_value
                        elif isinstance(attr_value, list):
                            query[f"attributes.{attr_name}"] = {"$in": attr_value}
                        else:
                            query[f"attributes.{attr_name}"] = {"$regex": f"^{attr_value}$", "$options": "i"}
            except Exception as e:
                logger.warning(f"Failed to parse filters: {e}")
        
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
        
        # Aggregation for boosted listings first
        pipeline = [
            {"$match": query},
            {"$addFields": {
                "is_boosted_val": {"$cond": [{"$eq": ["$is_boosted", True]}, 1, 0]},
                "boost_priority_val": {"$ifNull": ["$boost_priority", 0]}
            }},
            {"$sort": {
                "is_boosted_val": -1,
                "boost_priority_val": -1,
                sort_field: sort_order
            }},
            {"$skip": skip},
            {"$limit": limit},
            {"$project": {
                "_id": 0,
                "is_boosted_val": 0,
                "boost_priority_val": 0
            }}
        ]
        
        listings = await db.listings.aggregate(pipeline).to_list(limit)
        
        return {
            "listings": listings,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    
    @router.get("/by-location")
    async def get_listings_by_location(
        city_code: str = Query(..., description="Selected city code"),
        city_lat: float = Query(..., description="Selected city latitude"),
        city_lng: float = Query(..., description="Selected city longitude"),
        include_nearby: bool = Query(True, description="Include nearby cities if no results"),
        radius: int = Query(50, description="Search radius in km"),
        category: Optional[str] = None,
        subcategory: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
        only_my_city: bool = Query(False, description="Only show listings in selected city")
    ):
        """
        Smart listing search by location.
        
        1. First searches in the selected city
        2. If no results and include_nearby=True, expands to nearby cities
        3. Returns listings sorted by distance from selected city
        """
        import math
        
        def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
            """Calculate distance between two points in km"""
            R = 6371  # Earth's radius in km
            
            lat1_rad = math.radians(lat1)
            lat2_rad = math.radians(lat2)
            delta_lat = math.radians(lat2 - lat1)
            delta_lng = math.radians(lng2 - lng1)
            
            a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            
            return R * c
        
        # Map legacy category
        mapped_category = legacy_category_map.get(category, category) if category else None
        
        # Build base query
        base_query = {"status": "active"}
        if mapped_category:
            base_query["category_id"] = mapped_category
        if subcategory:
            base_query["subcategory"] = subcategory
        
        # Step 1: Search in selected city
        city_query = {**base_query, "location_data.city_code": city_code.upper()}
        city_listings = await db.listings.find(city_query, {"_id": 0}).to_list(limit)
        
        # Calculate distance for each listing (will be 0 or very small for same city)
        for listing in city_listings:
            loc_data = listing.get("location_data", {})
            if loc_data.get("lat") and loc_data.get("lng"):
                listing["distance_km"] = haversine_distance(
                    city_lat, city_lng,
                    loc_data["lat"], loc_data["lng"]
                )
            else:
                listing["distance_km"] = 0
        
        # If we have results or only_my_city is True, return city results
        if city_listings or only_my_city:
            total = await db.listings.count_documents(city_query)
            return {
                "listings": city_listings,
                "total": total,
                "page": page,
                "pages": (total + limit - 1) // limit,
                "search_mode": "exact_city",
                "selected_city": city_code,
                "expanded_search": False,
                "message": None
            }
        
        # Step 2: No results in city, expand to nearby cities if allowed
        if not include_nearby:
            return {
                "listings": [],
                "total": 0,
                "page": 1,
                "pages": 0,
                "search_mode": "exact_city",
                "selected_city": city_code,
                "expanded_search": False,
                "message": f"No listings in this city."
            }
        
        # Find all listings with coordinates and calculate distances
        # Using MongoDB aggregation for better performance
        nearby_pipeline = [
            {"$match": {
                **base_query,
                "location_data.lat": {"$exists": True},
                "location_data.lng": {"$exists": True}
            }},
            {"$addFields": {
                # Calculate approximate distance using spherical distance
                "distance_km": {
                    "$multiply": [
                        6371,  # Earth radius in km
                        {
                            "$acos": {
                                "$add": [
                                    {"$multiply": [
                                        {"$sin": {"$degreesToRadians": city_lat}},
                                        {"$sin": {"$degreesToRadians": "$location_data.lat"}}
                                    ]},
                                    {"$multiply": [
                                        {"$cos": {"$degreesToRadians": city_lat}},
                                        {"$cos": {"$degreesToRadians": "$location_data.lat"}},
                                        {"$cos": {
                                            "$subtract": [
                                                {"$degreesToRadians": "$location_data.lng"},
                                                {"$degreesToRadians": city_lng}
                                            ]
                                        }}
                                    ]}
                                ]
                            }
                        }
                    ]
                }
            }},
            {"$match": {"distance_km": {"$lte": radius}}},
            {"$sort": {"distance_km": 1}},
            {"$skip": (page - 1) * limit},
            {"$limit": limit},
            {"$project": {"_id": 0}}
        ]
        
        nearby_listings = await db.listings.aggregate(nearby_pipeline).to_list(limit)
        
        # Count total nearby listings
        count_pipeline = [
            {"$match": {
                **base_query,
                "location_data.lat": {"$exists": True},
                "location_data.lng": {"$exists": True}
            }},
            {"$addFields": {
                "distance_km": {
                    "$multiply": [
                        6371,
                        {"$acos": {
                            "$add": [
                                {"$multiply": [
                                    {"$sin": {"$degreesToRadians": city_lat}},
                                    {"$sin": {"$degreesToRadians": "$location_data.lat"}}
                                ]},
                                {"$multiply": [
                                    {"$cos": {"$degreesToRadians": city_lat}},
                                    {"$cos": {"$degreesToRadians": "$location_data.lat"}},
                                    {"$cos": {"$subtract": [
                                        {"$degreesToRadians": "$location_data.lng"},
                                        {"$degreesToRadians": city_lng}
                                    ]}}
                                ]}
                            ]
                        }}
                    ]
                }
            }},
            {"$match": {"distance_km": {"$lte": radius}}},
            {"$count": "total"}
        ]
        
        count_result = await db.listings.aggregate(count_pipeline).to_list(1)
        total = count_result[0]["total"] if count_result else 0
        
        return {
            "listings": nearby_listings,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit,
            "search_mode": "nearby_cities",
            "selected_city": city_code,
            "expanded_search": True,
            "search_radius_km": radius,
            "message": f"No listings in selected city. Showing {total} listings within {radius}km."
        }
    
    @router.get("/my")
    async def get_my_listings(request: Request, status: Optional[str] = None):
        """Get current user's listings"""
        user = await require_auth(request)
        
        query = {"user_id": user.user_id}
        if status:
            query["status"] = status
        
        listings = await db.listings.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
        return listings
    
    @router.get("/similar/{listing_id}")
    async def get_similar_listings(
        listing_id: str,
        limit: int = 10,
        include_sponsored: bool = True,
        same_city_only: bool = False,
        same_price_range: bool = False
    ):
        """Get similar listings using weighted similarity scoring"""
        # Get source listing
        source = await db.listings.find_one({"id": listing_id}, {"_id": 0})
        if not source:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        # Build query for candidates
        query = {
            "status": "active",
            "id": {"$ne": listing_id},
            "user_id": {"$ne": source.get('user_id')},
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
        
        # Get candidates
        candidates = await db.listings.find(query, {"_id": 0}).limit(50).to_list(50)
        
        # If not enough, expand search
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
            if score > 15:
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
        
        # Sort by similarity
        scored_listings.sort(key=lambda x: x['similarityScore'], reverse=True)
        
        # Get sponsored listings
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
            
            if organic_count % 5 == 0 and sponsored_idx < len(sponsored_listings):
                final_listings.append(sponsored_listings[sponsored_idx])
                sponsored_idx += 1
        
        while len(final_listings) < limit and sponsored_idx < len(sponsored_listings):
            final_listings.append(sponsored_listings[sponsored_idx])
            sponsored_idx += 1
        
        return {
            "listings": final_listings[:limit],
            "total": len(final_listings),
            "sourceCategory": source.get('category_id'),
            "sponsoredCount": len([l for l in final_listings if l.get('isSponsored')])
        }
    
    @router.get("/{listing_id}")
    async def get_listing(listing_id: str, request: Request):
        """Get single listing and increment views"""
        listing = await db.listings.find_one({"id": listing_id}, {"_id": 0})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        # Increment views
        await db.listings.update_one({"id": listing_id}, {"$inc": {"views": 1}})
        
        # Track behavior for smart notifications (if user is authenticated)
        user = await get_current_user(request)
        if user:
            try:
                # Import smart notification service for behavior tracking
                from smart_notifications import SmartNotificationService
                smart_service = SmartNotificationService(db)
                await smart_service.track_behavior(
                    user_id=user.user_id,
                    event_type="view_listing",
                    entity_id=listing_id,
                    entity_type="listing",
                    metadata={
                        "category_id": listing.get("category_id"),
                        "price": listing.get("price"),
                        "title": listing.get("title"),
                    }
                )
            except Exception as e:
                logger.debug(f"Behavior tracking failed: {e}")
        
        # Get seller data
        embedded_seller = listing.get("seller")
        
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
        
        # Check if favorited
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
    
    @router.put("/{listing_id}")
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
        
        # Check for price drop to trigger notifications
        old_price = listing.get("price", 0)
        new_price = update_data.get("price")
        
        await db.listings.update_one({"id": listing_id}, {"$set": update_data})
        
        # Trigger price drop notifications if price decreased
        if new_price is not None and new_price < old_price:
            try:
                from smart_notifications import SmartNotificationService
                smart_service = SmartNotificationService(db)
                import asyncio
                asyncio.create_task(smart_service.check_price_drop_triggers(listing_id, old_price, new_price))
            except Exception as e:
                logger.debug(f"Price drop notification trigger failed: {e}")
        
        updated = await db.listings.find_one({"id": listing_id}, {"_id": 0})
        return updated
    
    @router.delete("/{listing_id}")
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
    
    @router.post("/{listing_id}/mark-sold")
    async def mark_listing_sold(listing_id: str, request: Request):
        """Mark a listing as sold and check for badge awards"""
        user = await require_auth(request)
        
        listing = await db.listings.find_one({"id": listing_id}, {"_id": 0})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        if listing["user_id"] != user.user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        if listing.get("status") == "sold":
            raise HTTPException(status_code=400, detail="Listing already marked as sold")
        
        # Update listing status
        await db.listings.update_one(
            {"id": listing_id}, 
            {
                "$set": {
                    "status": "sold",
                    "sold_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # Check and award badges for this sale
        awarded_badges = []
        try:
            from services.badge_service import get_badge_service
            badge_service = get_badge_service(db)
            awarded_badges = await badge_service.check_and_award_badges(user.user_id, trigger="sale")
        except Exception as e:
            logger.error(f"Error checking badges after sale: {e}")
        
        return {
            "message": "Listing marked as sold",
            "listing_id": listing_id,
            "badges_earned": awarded_badges
        }
    
    return router
