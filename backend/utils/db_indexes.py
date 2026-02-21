"""
MongoDB Index Management for Avida
Ensures all required indexes are created for optimal query performance.
Target: <300ms API response times
"""

import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Index definitions for listings collection
LISTINGS_INDEXES = [
    # Primary feed index - covers homepage queries
    {
        "keys": [("status", 1), ("created_at", -1)],
        "name": "idx_listings_status_created",
        "background": True
    },
    # Category filter index
    {
        "keys": [("status", 1), ("category", 1), ("created_at", -1)],
        "name": "idx_listings_category",
        "background": True
    },
    # City/Location filter index
    {
        "keys": [("status", 1), ("location.city", 1), ("created_at", -1)],
        "name": "idx_listings_city",
        "background": True
    },
    # Country + Region + City + Category compound index (most selective)
    {
        "keys": [
            ("status", 1), 
            ("location.country_code", 1), 
            ("location.region_code", 1),
            ("location.city", 1), 
            ("category", 1), 
            ("created_at", -1)
        ],
        "name": "idx_listings_location_category",
        "background": True
    },
    # Price sorting index
    {
        "keys": [("status", 1), ("price", 1), ("created_at", -1)],
        "name": "idx_listings_price_asc",
        "background": True
    },
    {
        "keys": [("status", 1), ("price", -1), ("created_at", -1)],
        "name": "idx_listings_price_desc",
        "background": True
    },
    # Popular/views sorting index
    {
        "keys": [("status", 1), ("views_count", -1), ("created_at", -1)],
        "name": "idx_listings_popular",
        "background": True
    },
    # Boosted listings index
    {
        "keys": [("is_boosted", 1), ("boost_expires_at", -1), ("status", 1)],
        "name": "idx_listings_boosted",
        "background": True
    },
    # Seller/user listings index
    {
        "keys": [("user_id", 1), ("status", 1), ("created_at", -1)],
        "name": "idx_listings_seller",
        "background": True
    },
    # Text search index for title and description
    {
        "keys": [("title", "text"), ("description", "text")],
        "name": "idx_listings_text_search",
        "background": True
    },
    # Single field indexes for common queries
    {
        "keys": [("created_at", -1)],
        "name": "idx_listings_created_at",
        "background": True
    },
    {
        "keys": [("category", 1)],
        "name": "idx_listings_category_single",
        "background": True
    },
    {
        "keys": [("id", 1)],
        "name": "idx_listings_id",
        "unique": True,
        "background": True
    },
]

# Index definitions for auto_listings collection (same structure as listings)
AUTO_LISTINGS_INDEXES = [
    {
        "keys": [("status", 1), ("created_at", -1)],
        "name": "idx_auto_status_created",
        "background": True
    },
    {
        "keys": [("status", 1), ("category", 1), ("created_at", -1)],
        "name": "idx_auto_category",
        "background": True
    },
    {
        "keys": [("status", 1), ("location.city", 1), ("created_at", -1)],
        "name": "idx_auto_city",
        "background": True
    },
    {
        "keys": [("id", 1)],
        "name": "idx_auto_id",
        "unique": True,
        "background": True
    },
]

# Index definitions for properties collection
PROPERTIES_INDEXES = [
    {
        "keys": [("status", 1), ("created_at", -1)],
        "name": "idx_prop_status_created",
        "background": True
    },
    {
        "keys": [("status", 1), ("property_type", 1), ("created_at", -1)],
        "name": "idx_prop_type",
        "background": True
    },
    {
        "keys": [("status", 1), ("location.city", 1), ("created_at", -1)],
        "name": "idx_prop_city",
        "background": True
    },
    {
        "keys": [("id", 1)],
        "name": "idx_prop_id",
        "unique": True,
        "background": True
    },
]

# Index definitions for users collection
USERS_INDEXES = [
    {
        "keys": [("user_id", 1)],
        "name": "idx_users_user_id",
        "unique": True,
        "background": True
    },
    {
        "keys": [("email", 1)],
        "name": "idx_users_email",
        "unique": True,
        "sparse": True,
        "background": True
    },
]

# Index definitions for recently_viewed collection
RECENTLY_VIEWED_INDEXES = [
    {
        "keys": [("user_id", 1), ("viewed_at", -1)],
        "name": "idx_recent_user_viewed",
        "background": True
    },
    {
        "keys": [("user_id", 1), ("item_id", 1)],
        "name": "idx_recent_user_item",
        "unique": True,
        "background": True
    },
]

# Index definitions for favorites collection
FAVORITES_INDEXES = [
    {
        "keys": [("user_id", 1), ("created_at", -1)],
        "name": "idx_fav_user_created",
        "background": True
    },
    {
        "keys": [("user_id", 1), ("listing_id", 1)],
        "name": "idx_fav_user_listing",
        "unique": True,
        "background": True
    },
]

# Index definitions for conversations/messages
CONVERSATIONS_INDEXES = [
    {
        "keys": [("buyer_id", 1), ("last_message_time", -1)],
        "name": "idx_conv_buyer",
        "background": True
    },
    {
        "keys": [("seller_id", 1), ("last_message_time", -1)],
        "name": "idx_conv_seller",
        "background": True
    },
]

MESSAGES_INDEXES = [
    {
        "keys": [("conversation_id", 1), ("created_at", -1)],
        "name": "idx_msg_conversation",
        "background": True
    },
]


async def ensure_index(collection, index_def: Dict[str, Any]) -> bool:
    """Create a single index if it doesn't exist."""
    try:
        keys = index_def["keys"]
        name = index_def.get("name")
        background = index_def.get("background", True)
        unique = index_def.get("unique", False)
        sparse = index_def.get("sparse", False)
        
        await collection.create_index(
            keys,
            name=name,
            background=background,
            unique=unique,
            sparse=sparse
        )
        logger.debug(f"Index {name} ensured on {collection.name}")
        return True
    except Exception as e:
        # Index might already exist or there's a conflict
        if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
            logger.debug(f"Index {index_def.get('name')} already exists")
            return True
        logger.warning(f"Failed to create index {index_def.get('name')}: {e}")
        return False


async def ensure_all_indexes(db) -> Dict[str, int]:
    """
    Ensure all required indexes are created.
    Returns count of indexes created/verified per collection.
    """
    results = {}
    
    # Listings indexes
    count = 0
    for index_def in LISTINGS_INDEXES:
        if await ensure_index(db.listings, index_def):
            count += 1
    results["listings"] = count
    
    # Auto listings indexes
    count = 0
    for index_def in AUTO_LISTINGS_INDEXES:
        if await ensure_index(db.auto_listings, index_def):
            count += 1
    results["auto_listings"] = count
    
    # Properties indexes
    count = 0
    for index_def in PROPERTIES_INDEXES:
        if await ensure_index(db.properties, index_def):
            count += 1
    results["properties"] = count
    
    # Users indexes
    count = 0
    for index_def in USERS_INDEXES:
        if await ensure_index(db.users, index_def):
            count += 1
    results["users"] = count
    
    # Recently viewed indexes
    count = 0
    for index_def in RECENTLY_VIEWED_INDEXES:
        if await ensure_index(db.recently_viewed, index_def):
            count += 1
    results["recently_viewed"] = count
    
    # Favorites indexes
    count = 0
    for index_def in FAVORITES_INDEXES:
        if await ensure_index(db.favorites, index_def):
            count += 1
    results["favorites"] = count
    
    # Conversations indexes
    count = 0
    for index_def in CONVERSATIONS_INDEXES:
        if await ensure_index(db.conversations, index_def):
            count += 1
    results["conversations"] = count
    
    # Messages indexes
    count = 0
    for index_def in MESSAGES_INDEXES:
        if await ensure_index(db.messages, index_def):
            count += 1
    results["messages"] = count
    
    total = sum(results.values())
    logger.info(f"Database indexes verified/created: {total} indexes across {len(results)} collections")
    
    return results


async def get_index_stats(db) -> Dict[str, Any]:
    """Get statistics about indexes for monitoring."""
    stats = {}
    
    collections = ["listings", "auto_listings", "properties", "users", "favorites", "conversations", "messages"]
    
    for coll_name in collections:
        try:
            coll = db[coll_name]
            indexes = await coll.index_information()
            stats[coll_name] = {
                "index_count": len(indexes),
                "indexes": list(indexes.keys())
            }
        except Exception as e:
            stats[coll_name] = {"error": str(e)}
    
    return stats
