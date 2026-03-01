"""
Auto/Motors Routes
Handles auto listings, brands, models, conversations, favorites, and search functionality.
"""

from fastapi import APIRouter, HTTPException, Request, Query
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid
import random
import logging

logger = logging.getLogger(__name__)

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


def create_auto_motors_router(db, get_current_user):
    """Create auto/motors router with dependency injection."""
    router = APIRouter(prefix="/auto", tags=["auto-motors"])

    # =========================================================================
    # BRANDS & MODELS
    # =========================================================================

    @router.get("/brands")
    async def get_auto_brands():
        """Get all car brands with listing counts"""
        return AUTO_BRANDS

    @router.get("/brands/{brand_id}/models")
    async def get_brand_models(brand_id: str):
        """Get models for a specific brand"""
        models = AUTO_MODELS.get(brand_id, [])
        return [{"id": f"{brand_id}_{m.lower().replace(' ', '_')}", "brandId": brand_id, "name": m} for m in models]

    # =========================================================================
    # LISTINGS
    # =========================================================================

    @router.get("/listings")
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

    @router.get("/listings/{listing_id}")
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

    @router.get("/featured")
    async def get_featured_auto(limit: int = 10):
        """Get featured auto listings"""
        query = {"status": "active", "featured": True}
        listings = await db.auto_listings.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        return listings

    @router.get("/recommended")
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

    # =========================================================================
    # CONVERSATIONS
    # =========================================================================

    @router.post("/conversations")
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
        
        # Generate dummy messages for demo
        template_type = random.choice(['viewing', 'price_negotiation', 'questions', 'test_drive'])
        dummy_messages = _generate_dummy_messages(
            template_type, listing, buyer_id, buyer_name, 
            seller_id, seller_name, initial_message, now
        )
        
        conversation = {
            "id": conversation_id,
            "listing_id": listing_id,
            "listing_title": listing.get("title", f"{listing.get('make')} {listing.get('model')}"),
            "listing_image": listing.get("images", [""])[0] if listing.get("images") else "",
            "listing_price": listing.get("price"),
            "buyer_id": buyer_id,
            "buyer_name": buyer_name,
            "seller_id": seller_id,
            "seller_name": seller_name,
            "seller_phone": seller_phone,
            "messages": dummy_messages,
            "last_message": dummy_messages[-1]["content"] if dummy_messages else "",
            "last_message_at": dummy_messages[-1]["timestamp"] if dummy_messages else now,
            "unread_count": 1,
            "status": "active",
            "created_at": now,
            "updated_at": now,
        }
        
        await db.auto_conversations.insert_one(conversation)
        conversation.pop("_id", None)
        
        return conversation

    @router.get("/conversations/{conversation_id}")
    async def get_auto_conversation(conversation_id: str):
        """Get a conversation by ID"""
        conversation = await db.auto_conversations.find_one({"id": conversation_id}, {"_id": 0})
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conversation

    @router.post("/conversations/{conversation_id}/messages")
    async def send_auto_message(conversation_id: str, request: Request):
        """Send a message in a conversation"""
        body = await request.json()
        content = body.get("content", "")
        
        if not content:
            raise HTTPException(status_code=400, detail="Message content is required")
        
        conversation = await db.auto_conversations.find_one({"id": conversation_id})
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        user = await get_current_user(request)
        if user:
            sender_id = user.user_id
            sender_name = user.name
        else:
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
        
        # Simulate seller auto-reply (70% chance for demo)
        if random.random() < 0.7:
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

    # =========================================================================
    # SEARCH & FILTERS
    # =========================================================================

    @router.get("/popular-searches")
    async def get_popular_searches():
        """Get popular auto search terms"""
        return [
            {"term": "BMW 3 Series", "count": 1234},
            {"term": "Mercedes C-Class", "count": 987},
            {"term": "Audi A4", "count": 876},
            {"term": "Tesla Model 3", "count": 765},
            {"term": "VW Golf", "count": 654},
            {"term": "Porsche 911", "count": 543},
        ]

    @router.post("/track-search")
    async def track_auto_search(request: Request):
        """Track a search term for analytics"""
        body = await request.json()
        term = body.get("term", "")
        return {"message": "Search tracked", "term": term}

    @router.get("/filter-options")
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

    # =========================================================================
    # FAVORITES
    # =========================================================================

    @router.post("/favorites/{listing_id}")
    async def add_auto_favorite(listing_id: str, request: Request):
        """Add an auto listing to favorites"""
        user = await get_current_user(request)
        user_id = user.user_id if user else "guest"
        
        listing = await db.auto_listings.find_one({"id": listing_id})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
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
        
        await db.auto_listings.update_one({"id": listing_id}, {"$inc": {"favorites_count": 1}})
        
        return {"message": "Added to favorites", "favorited": True}

    @router.delete("/favorites/{listing_id}")
    async def remove_auto_favorite(listing_id: str, request: Request):
        """Remove an auto listing from favorites"""
        user = await get_current_user(request)
        user_id = user.user_id if user else "guest"
        
        result = await db.auto_favorites.delete_one({"user_id": user_id, "listing_id": listing_id})
        
        if result.deleted_count > 0:
            await db.auto_listings.update_one({"id": listing_id}, {"$inc": {"favorites_count": -1}})
        
        return {"message": "Removed from favorites", "favorited": False}

    @router.get("/favorites")
    async def get_auto_favorites(request: Request):
        """Get user's favorite auto listings"""
        user = await get_current_user(request)
        user_id = user.user_id if user else "guest"
        
        favorites = await db.auto_favorites.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
        
        listing_ids = [f["listing_id"] for f in favorites]
        listings = await db.auto_listings.find({"id": {"$in": listing_ids}, "status": "active"}, {"_id": 0}).to_list(100)
        
        return {
            "favorites": favorites,
            "listings": listings
        }

    return router


def _generate_dummy_messages(template_type, listing, buyer_id, buyer_name, seller_id, seller_name, initial_message, now):
    """Generate dummy conversation messages for demo purposes."""
    if template_type == 'viewing':
        return [
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
        return [
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
        return [
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
                "content": "Of course! Feel free to ask anything.",
                "timestamp": now - timedelta(minutes=55),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": buyer_id,
                "sender_name": buyer_name,
                "content": "Has it ever been in an accident? And when was the last service?",
                "timestamp": now - timedelta(minutes=50),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": seller_id,
                "sender_name": seller_name,
                "content": "No accidents at all - clean history! Last full service was 3 months ago with new brake pads and oil change. 🔧",
                "timestamp": now - timedelta(minutes=45),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": buyer_id,
                "sender_name": buyer_name,
                "content": "That's great! Is the price negotiable?",
                "timestamp": now - timedelta(minutes=40),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": seller_id,
                "sender_name": seller_name,
                "content": "There's a little room for negotiation if you're serious. Come take a look and we can discuss! 🚗",
                "timestamp": now - timedelta(minutes=35),
                "read": False,
            },
        ]
    else:  # test_drive
        return [
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": buyer_id,
                "sender_name": buyer_name,
                "content": f"Hello! Is it possible to arrange a test drive for the {listing.get('make')} {listing.get('model')}?",
                "timestamp": now - timedelta(minutes=40),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": seller_id,
                "sender_name": seller_name,
                "content": "Hi! Absolutely, I'd be happy to arrange a test drive. When are you free?",
                "timestamp": now - timedelta(minutes=35),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": buyer_id,
                "sender_name": buyer_name,
                "content": "I'm available this evening after 6 PM or anytime tomorrow.",
                "timestamp": now - timedelta(minutes=30),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": seller_id,
                "sender_name": seller_name,
                "content": "Tomorrow morning at 10 AM would work great for me. I'll prepare the car and all documents.",
                "timestamp": now - timedelta(minutes=25),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": buyer_id,
                "sender_name": buyer_name,
                "content": "Perfect! Should I bring anything for the test drive?",
                "timestamp": now - timedelta(minutes=20),
                "read": True,
            },
            {
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": seller_id,
                "sender_name": seller_name,
                "content": "Just bring your driver's license and ID. See you tomorrow! 🚗✨",
                "timestamp": now - timedelta(minutes=15),
                "read": False,
            },
        ]
