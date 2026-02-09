"""
Listings Routes Module
Handles listing CRUD operations, search, and similar listings
"""

import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# MODELS
# =============================================================================

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
    location: Optional[str] = None
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
    location: Optional[str] = None
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
            "location": listing.location,
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
        
        if location:
            query["location"] = {"$regex": location, "$options": "i"}
        
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
        
        await db.listings.update_one({"id": listing_id}, {"$set": update_data})
        
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
    
    return router
