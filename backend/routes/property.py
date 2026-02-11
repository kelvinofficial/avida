"""
Property Routes
Handles property listings, offers, viewings, similar listings, and monetization (boost/feature).
"""

from fastapi import APIRouter, HTTPException, Request, Query, Body
from pydantic import BaseModel, Field
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import uuid
import logging

logger = logging.getLogger(__name__)


# =========================================================================
# PROPERTY MODELS
# =========================================================================

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


# =========================================================================
# SIMILARITY CALCULATION
# =========================================================================

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
    
    # Same location/city (10 points)
    source_city = source.get('location', {}).get('city', source.get('city', '')).lower()
    target_city = target.get('location', {}).get('city', target.get('city', '')).lower()
    if source_city and target_city and source_city == target_city:
        score += 10
    
    # Secondary Signals (Medium Weight - 20%)
    # Bedrooms ±1 (8 points)
    source_beds = source.get('bedrooms', 0)
    target_beds = target.get('bedrooms', 0)
    if source_beds and target_beds:
        bed_diff = abs(source_beds - target_beds)
        if bed_diff == 0:
            score += 8
        elif bed_diff == 1:
            score += 5
        elif bed_diff == 2:
            score += 2
    
    # Same condition (6 points)
    if source.get('condition') == target.get('condition'):
        score += 6
    
    # Same furnishing status (6 points)
    source_furnished = source.get('furnishing') or source.get('facilities', {}).get('furnished')
    target_furnished = target.get('furnishing') or target.get('facilities', {}).get('furnished')
    if source_furnished == target_furnished:
        score += 6
    
    # Tertiary Signals (Low Weight - 10%)
    # Verified seller preference (5 points)
    if target.get('verification', {}).get('isVerified') or target.get('seller', {}).get('isVerified'):
        score += 5
    
    # Recency bonus - newer listings get slight boost (5 points)
    target_date = target.get('createdAt', target.get('created_at', ''))
    if target_date:
        try:
            if isinstance(target_date, str):
                created = datetime.fromisoformat(target_date.replace('Z', '+00:00'))
            else:
                created = target_date
            days_old = (datetime.now(timezone.utc) - created).days
            if days_old <= 7:
                score += 5
            elif days_old <= 14:
                score += 3
            elif days_old <= 30:
                score += 1
        except Exception:
            pass
    
    return min(score, 100)


def create_property_router(db, require_auth, get_current_user):
    """Create property router with dependency injection."""
    router = APIRouter(prefix="/property", tags=["property"])

    # =========================================================================
    # LISTINGS CRUD
    # =========================================================================

    @router.get("/listings")
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
        elif sort == "size_asc":
            sort_field = "size"
            sort_order = 1
        elif sort == "size_desc":
            sort_field = "size"
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

    @router.get("/listings/{property_id}")
    async def get_property_listing(property_id: str):
        """Get a single property listing by ID"""
        listing = await db.properties.find_one({"id": property_id}, {"_id": 0})
        if not listing:
            raise HTTPException(status_code=404, detail="Property not found")
        
        # Increment views
        await db.properties.update_one(
            {"id": property_id},
            {"$inc": {"views": 1}}
        )
        
        return listing

    @router.post("/listings")
    async def create_property_listing(request: Request):
        """Create a new property listing"""
        body = await request.json()
        
        property_id = f"prop_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()
        
        listing = {
            "id": property_id,
            "title": body.get("title", ""),
            "description": body.get("description", ""),
            "type": body.get("type", "apartment"),
            "purpose": body.get("purpose", "rent"),
            "price": body.get("price", 0),
            "currency": body.get("currency", "EUR"),
            "size": body.get("size", 0),
            "bedrooms": body.get("bedrooms", 0),
            "bathrooms": body.get("bathrooms", 0),
            "location": body.get("location", {}),
            "facilities": body.get("facilities", {}),
            "images": body.get("images", []),
            "videos": body.get("videos", []),
            "floorPlans": body.get("floorPlans", []),
            "virtualTour": body.get("virtualTour"),
            "furnishing": body.get("furnishing", "unfurnished"),
            "condition": body.get("condition", "good"),
            "yearBuilt": body.get("yearBuilt"),
            "parking": body.get("parking", 0),
            "seller": body.get("seller", {}),
            "verification": body.get("verification", {}),
            "user_id": body.get("user_id"),
            "status": "active",
            "views": 0,
            "saves": 0,
            "inquiries": 0,
            "boosted": False,
            "featured": False,
            "createdAt": now,
            "updatedAt": now,
        }
        
        await db.properties.insert_one(listing)
        listing.pop("_id", None)
        
        return {"message": "Property listing created", "property": listing}

    @router.put("/listings/{property_id}")
    async def update_property_listing(property_id: str, request: Request):
        """Update a property listing"""
        body = await request.json()
        
        existing = await db.properties.find_one({"id": property_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Property not found")
        
        allowed_fields = [
            "title", "description", "price", "size", "bedrooms", "bathrooms",
            "location", "facilities", "images", "videos", "floorPlans",
            "virtualTour", "furnishing", "condition", "yearBuilt", "parking"
        ]
        
        update_fields = {k: v for k, v in body.items() if k in allowed_fields}
        update_fields["updatedAt"] = datetime.now(timezone.utc).isoformat()
        
        await db.properties.update_one({"id": property_id}, {"$set": update_fields})
        
        updated = await db.properties.find_one({"id": property_id}, {"_id": 0})
        return {"message": "Property updated successfully", "property": updated}

    @router.delete("/listings/{property_id}")
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

    # =========================================================================
    # FEATURED & SIMILAR
    # =========================================================================

    @router.get("/featured")
    async def get_featured_properties(limit: int = 10):
        """Get featured property listings"""
        query = {"status": "active", "featured": True}
        listings = await db.properties.find(query, {"_id": 0}).sort("createdAt", -1).limit(limit).to_list(limit)
        return listings

    @router.get("/listings/{property_id}/similar")
    async def get_similar_properties(
        property_id: str,
        limit: int = Query(default=8, le=20, description="Number of similar listings to return"),
        include_score: bool = Query(default=False, description="Include similarity score in response")
    ):
        """
        Get similar property listings using weighted similarity algorithm.
        Considers: type, purpose, price, location, bedrooms, condition, furnishing, verification, recency.
        """
        # Get source listing
        source = await db.properties.find_one({"id": property_id}, {"_id": 0})
        if not source:
            raise HTTPException(status_code=404, detail="Property not found")
        
        # Build query for candidate listings
        query = {
            "status": "active",
            "id": {"$ne": property_id}  # Exclude source listing
        }
        
        # Pre-filter by same purpose and reasonable price range for efficiency
        if source.get('purpose'):
            query["purpose"] = source['purpose']
        
        source_price = source.get('price', 0)
        if source_price > 0:
            # Get listings within 50% price range for broader candidate pool
            query["price"] = {
                "$gte": source_price * 0.5,
                "$lte": source_price * 1.5
            }
        
        # Get candidates - fetch more than needed for scoring
        candidates = await db.properties.find(query, {"_id": 0}).limit(limit * 5).to_list(limit * 5)
        
        # Score and rank candidates
        scored = []
        for candidate in candidates:
            score = calculate_similarity_score(source, candidate)
            if score >= 20:  # Minimum threshold
                scored.append({
                    "listing": candidate,
                    "score": score
                })
        
        # Sort by score descending
        scored.sort(key=lambda x: x['score'], reverse=True)
        
        # Return top results
        if include_score:
            return [{
                **item['listing'],
                "similarityScore": round(item['score'], 1)
            } for item in scored[:limit]]
        else:
            return [item['listing'] for item in scored[:limit]]

    # =========================================================================
    # VIEWINGS
    # =========================================================================

    @router.post("/book-viewing")
    async def book_property_viewing(request: Request):
        """Book a viewing for a property"""
        body = await request.json()
        
        property_id = body.get("property_id")
        if not property_id:
            raise HTTPException(status_code=400, detail="property_id is required")
        
        # Verify property exists
        property_listing = await db.properties.find_one({"id": property_id})
        if not property_listing:
            raise HTTPException(status_code=404, detail="Property not found")
        
        viewing_id = f"view_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()
        
        viewing = {
            "id": viewing_id,
            "propertyId": property_id,
            "propertyTitle": property_listing.get("title", ""),
            "userId": body.get("user_id", "guest"),
            "userName": body.get("user_name", "Guest"),
            "userPhone": body.get("user_phone", ""),
            "userEmail": body.get("user_email", ""),
            "preferredDate": body.get("preferred_date", ""),
            "preferredTime": body.get("preferred_time", ""),
            "alternateDate": body.get("alternate_date"),
            "alternateTime": body.get("alternate_time"),
            "message": body.get("message", ""),
            "status": "pending",
            "sellerId": property_listing.get("seller", {}).get("id"),
            "createdAt": now,
            "updatedAt": now,
        }
        
        await db.property_viewings.insert_one(viewing)
        viewing.pop("_id", None)
        
        # Increment inquiries count
        await db.properties.update_one(
            {"id": property_id},
            {"$inc": {"inquiries": 1}}
        )
        
        return {"message": "Viewing request submitted", "viewing": viewing}

    @router.get("/viewings")
    async def get_user_viewings(request: Request):
        """Get user's property viewing requests"""
        user = await get_current_user(request)
        user_id = user.user_id if user else "guest"
        
        viewings = await db.property_viewings.find(
            {"userId": user_id},
            {"_id": 0}
        ).sort("createdAt", -1).to_list(50)
        
        return {"viewings": viewings}

    @router.put("/viewings/{viewing_id}")
    async def update_viewing_status(viewing_id: str, request: Request):
        """Update viewing status (for sellers)"""
        body = await request.json()
        status = body.get("status")
        
        if status not in ["pending", "confirmed", "cancelled", "completed"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        
        result = await db.property_viewings.update_one(
            {"id": viewing_id},
            {"$set": {"status": status, "updatedAt": datetime.now(timezone.utc).isoformat()}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Viewing not found")
        
        return {"message": f"Viewing status updated to {status}"}

    # =========================================================================
    # ANALYTICS & FILTER OPTIONS
    # =========================================================================

    @router.get("/cities")
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

    @router.get("/areas/{city}")
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

    @router.get("/types-count")
    async def get_property_types_count(
        city: Optional[str] = None,
        purpose: Optional[str] = None
    ):
        """Get property type distribution"""
        match_stage = {"status": "active"}
        if city:
            match_stage["location.city"] = {"$regex": city, "$options": "i"}
        if purpose:
            match_stage["purpose"] = purpose
        
        pipeline = [
            {"$match": match_stage},
            {"$group": {"_id": "$type", "count": {"$sum": 1}}},
            {"$project": {"type": "$_id", "count": 1, "_id": 0}}
        ]
        
        results = await db.properties.aggregate(pipeline).to_list(100)
        return {item["type"]: item["count"] for item in results}

    # =========================================================================
    # BOOST & MONETIZATION
    # =========================================================================

    @router.post("/boost/{property_id}")
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

    @router.post("/feature/{property_id}")
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
                "featureExpiry": feature_expiry,
                "updatedAt": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Record feature purchase
        feature_record = {
            "id": f"feat_{uuid.uuid4().hex[:12]}",
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

    @router.get("/boosted")
    async def get_boosted_properties(limit: int = 20):
        """Get currently boosted property listings"""
        now = datetime.now(timezone.utc).isoformat()
        
        # Get boosted listings that haven't expired
        listings = await db.properties.find({
            "status": "active",
            "boosted": True,
            "boostExpiry": {"$gt": now}
        }, {"_id": 0}).sort("createdAt", -1).to_list(limit)
        
        return {"listings": listings, "total": len(listings)}

    @router.get("/boost-prices")
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

    return router


def create_offers_router(db, require_auth, get_current_user):
    """Create offers router with dependency injection."""
    router = APIRouter(prefix="/offers", tags=["offers"])

    @router.post("")
    async def create_offer(request: Request):
        """Submit an offer for any listing"""
        user = await require_auth(request)
        body = await request.json()
        
        listing_id = body.get("listing_id")
        offered_price = body.get("offered_price")
        message = body.get("message", "")
        
        if not listing_id or not offered_price:
            raise HTTPException(status_code=400, detail="listing_id and offered_price are required")
        
        # Find listing in all collections
        listing = await db.listings.find_one({"id": listing_id}, {"_id": 0})
        if not listing:
            listing = await db.properties.find_one({"id": listing_id}, {"_id": 0})
        if not listing:
            listing = await db.auto_listings.find_one({"id": listing_id}, {"_id": 0})
        
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        listed_price = listing.get("price", 0)
        
        # Validate offer is below listed price
        if offered_price >= listed_price:
            raise HTTPException(status_code=400, detail="Offer must be below the listed price")
        
        # Validate minimum offer (10% of listed price)
        min_offer = listed_price * 0.1
        if offered_price < min_offer:
            raise HTTPException(status_code=400, detail=f"Offer must be at least {min_offer}")
        
        seller_id = listing.get("user_id")
        
        # Check if user already has a pending offer on this listing
        existing_offer = await db.offers.find_one({
            "listing_id": listing_id,
            "buyer_id": user.user_id,
            "status": "pending"
        })
        if existing_offer:
            # Update existing offer
            await db.offers.update_one(
                {"id": existing_offer["id"]},
                {"$set": {
                    "offered_price": offered_price,
                    "message": message,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            updated_offer = await db.offers.find_one({"id": existing_offer["id"]}, {"_id": 0})
            return {"message": "Offer updated", "offer": updated_offer}
        
        # Create new offer
        offer_id = f"offer_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()
        
        offer = {
            "id": offer_id,
            "listing_id": listing_id,
            "listing_title": listing.get("title", listing.get("make", "") + " " + listing.get("model", "")),
            "listing_price": listed_price,
            "listing_image": listing.get("images", [""])[0] if listing.get("images") else "",
            "buyer_id": user.user_id,
            "buyer_name": user.name,
            "seller_id": seller_id,
            "offered_price": offered_price,
            "message": message,
            "status": "pending",
            "counter_price": None,
            "counter_message": None,
            "created_at": now,
            "updated_at": now,
        }
        
        await db.offers.insert_one(offer)
        offer.pop("_id", None)
        
        return {"message": "Offer submitted successfully", "offer": offer}

    @router.get("")
    async def get_user_offers(request: Request, role: str = "buyer"):
        """Get user's offers (as buyer or seller)"""
        user = await require_auth(request)
        
        if role == "buyer":
            offers = await db.offers.find({"buyer_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
        else:
            offers = await db.offers.find({"seller_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
        
        return {"offers": offers, "total": len(offers)}

    @router.get("/{offer_id}")
    async def get_offer(offer_id: str):
        """Get a specific offer"""
        offer = await db.offers.find_one({"id": offer_id}, {"_id": 0})
        if not offer:
            raise HTTPException(status_code=404, detail="Offer not found")
        return offer

    @router.put("/{offer_id}/respond")
    async def respond_to_offer(offer_id: str, request: Request):
        """Seller responds to an offer (accept, reject, or counter)"""
        user = await require_auth(request)
        body = await request.json()
        
        offer = await db.offers.find_one({"id": offer_id})
        if not offer:
            raise HTTPException(status_code=404, detail="Offer not found")
        
        # Verify user is the seller
        if offer.get("seller_id") != user.user_id:
            raise HTTPException(status_code=403, detail="Only the seller can respond to this offer")
        
        action = body.get("action")  # accept, reject, counter
        
        if action == "accept":
            await db.offers.update_one(
                {"id": offer_id},
                {"$set": {
                    "status": "accepted",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            return {"message": "Offer accepted", "status": "accepted"}
        
        elif action == "reject":
            await db.offers.update_one(
                {"id": offer_id},
                {"$set": {
                    "status": "rejected",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            return {"message": "Offer rejected", "status": "rejected"}
        
        elif action == "counter":
            counter_price = body.get("counter_price")
            counter_message = body.get("counter_message", "")
            
            if not counter_price:
                raise HTTPException(status_code=400, detail="counter_price is required")
            
            await db.offers.update_one(
                {"id": offer_id},
                {"$set": {
                    "status": "countered",
                    "counter_price": counter_price,
                    "counter_message": counter_message,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            return {"message": "Counter offer sent", "status": "countered", "counter_price": counter_price}
        
        else:
            raise HTTPException(status_code=400, detail="Invalid action. Use: accept, reject, or counter")

    @router.put("/{offer_id}/accept-counter")
    async def accept_counter_offer(offer_id: str, request: Request):
        """Buyer accepts the seller's counter offer"""
        user = await require_auth(request)
        
        offer = await db.offers.find_one({"id": offer_id})
        if not offer:
            raise HTTPException(status_code=404, detail="Offer not found")
        
        # Verify user is the buyer
        if offer.get("buyer_id") != user.user_id:
            raise HTTPException(status_code=403, detail="Only the buyer can accept a counter offer")
        
        if offer.get("status") != "countered":
            raise HTTPException(status_code=400, detail="No counter offer to accept")
        
        # Accept at the counter price
        await db.offers.update_one(
            {"id": offer_id},
            {"$set": {
                "status": "accepted",
                "offered_price": offer.get("counter_price"),  # Final agreed price
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {"message": "Counter offer accepted", "final_price": offer.get("counter_price")}

    @router.delete("/{offer_id}")
    async def withdraw_offer(offer_id: str, request: Request):
        """Buyer withdraws their offer"""
        user = await require_auth(request)
        
        offer = await db.offers.find_one({"id": offer_id})
        if not offer:
            raise HTTPException(status_code=404, detail="Offer not found")
        
        # Verify user is the buyer
        if offer.get("buyer_id") != user.user_id:
            raise HTTPException(status_code=403, detail="Only the buyer can withdraw their offer")
        
        if offer.get("status") not in ["pending", "countered"]:
            raise HTTPException(status_code=400, detail="Cannot withdraw an accepted or rejected offer")
        
        await db.offers.update_one(
            {"id": offer_id},
            {"$set": {
                "status": "withdrawn",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {"message": "Offer withdrawn"}

    return router


def create_similar_listings_router(db):
    """Create similar listings router with dependency injection."""
    router = APIRouter(prefix="/similar", tags=["similar-listings"])

    @router.get("/listings/{listing_id}")
    async def get_similar_listings(
        listing_id: str,
        limit: int = Query(default=8, le=20, description="Number of similar listings to return"),
        include_score: bool = Query(default=False, description="Include similarity score in response")
    ):
        """
        Get similar listings for any listing type (general, property, or auto).
        Uses weighted similarity algorithm.
        """
        # Try to find the listing in all collections
        source = await db.listings.find_one({"id": listing_id}, {"_id": 0})
        collection = "listings"
        
        if not source:
            source = await db.properties.find_one({"id": listing_id}, {"_id": 0})
            collection = "properties"
        
        if not source:
            source = await db.auto_listings.find_one({"id": listing_id}, {"_id": 0})
            collection = "auto_listings"
        
        if not source:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        # Build query for same collection
        query = {
            "status": "active",
            "id": {"$ne": listing_id}
        }
        
        # Add price range filter
        source_price = source.get('price', 0)
        if source_price > 0:
            query["price"] = {
                "$gte": source_price * 0.5,
                "$lte": source_price * 1.5
            }
        
        # Get collection reference
        db_collection = getattr(db, collection)
        
        # Get candidates
        candidates = await db_collection.find(query, {"_id": 0}).limit(limit * 5).to_list(limit * 5)
        
        # Score and rank
        scored = []
        for candidate in candidates:
            score = calculate_similarity_score(source, candidate)
            if score >= 15:
                scored.append({"listing": candidate, "score": score})
        
        scored.sort(key=lambda x: x['score'], reverse=True)
        
        if include_score:
            return [{**item['listing'], "similarityScore": round(item['score'], 1)} for item in scored[:limit]]
        else:
            return [item['listing'] for item in scored[:limit]]

    return router
