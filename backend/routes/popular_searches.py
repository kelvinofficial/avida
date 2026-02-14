"""
Popular Searches Routes Module
Handles tracking and retrieving trending search queries across users
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)


# =============================================================================
# MODELS
# =============================================================================

class LocationContext(BaseModel):
    """Location context for search tracking"""
    country_code: Optional[str] = None
    country_name: Optional[str] = None
    region_code: Optional[str] = None
    region_name: Optional[str] = None
    district_code: Optional[str] = None
    district_name: Optional[str] = None
    city_code: Optional[str] = None
    city_name: Optional[str] = None


class SearchTrackRequest(BaseModel):
    """Request model for tracking a search"""
    query: str
    category_id: Optional[str] = None
    location: Optional[LocationContext] = None


class PopularSearch(BaseModel):
    """Model for a popular search result"""
    query: str
    count: int
    category_id: Optional[str] = None


class PopularSearchesResponse(BaseModel):
    """Response model for popular searches"""
    global_searches: List[PopularSearch]
    category_searches: List[PopularSearch]


# =============================================================================
# FACTORY FUNCTION
# =============================================================================

def create_popular_searches_router(db):
    """Create popular searches router with database dependency"""
    
    router = APIRouter(tags=["Popular Searches"])
    
    # Collection for storing search tracking data
    searches_collection = db.search_tracking
    # New collection for detailed search analytics (for admin)
    search_analytics_collection = db.search_analytics
    
    @router.post("/searches/track")
    async def track_search(request: SearchTrackRequest):
        """
        Track a search query for popularity analysis.
        Called from frontend when user performs a search.
        Now includes location context for admin analytics.
        """
        query = request.query.strip().lower()
        
        # Validate query
        if not query or len(query) < 2:
            raise HTTPException(status_code=400, detail="Query must be at least 2 characters")
        
        if len(query) > 100:
            raise HTTPException(status_code=400, detail="Query too long")
        
        try:
            # Upsert the search record (for popular searches)
            await searches_collection.update_one(
                {
                    "query": query,
                    "category_id": request.category_id
                },
                {
                    "$inc": {"count": 1},
                    "$set": {
                        "last_searched": datetime.now(timezone.utc),
                        "updated_at": datetime.now(timezone.utc)
                    },
                    "$setOnInsert": {
                        "created_at": datetime.now(timezone.utc)
                    }
                },
                upsert=True
            )
            
            # Also store detailed analytics record (for admin insights)
            analytics_record = {
                "query": query,
                "category_id": request.category_id,
                "timestamp": datetime.now(timezone.utc),
            }
            
            # Add location data if provided
            if request.location:
                analytics_record.update({
                    "country_code": request.location.country_code,
                    "country_name": request.location.country_name,
                    "region_code": request.location.region_code,
                    "region_name": request.location.region_name,
                    "district_code": request.location.district_code,
                    "district_name": request.location.district_name,
                    "city_code": request.location.city_code,
                    "city_name": request.location.city_name,
                })
            
            await search_analytics_collection.insert_one(analytics_record)
            
            return {"status": "tracked", "query": query}
            
        except Exception as e:
            logger.error(f"Error tracking search: {e}")
            raise HTTPException(status_code=500, detail="Failed to track search")
    
    @router.get("/searches/popular")
    async def get_popular_searches(
        category_id: Optional[str] = Query(None, description="Filter by category"),
        limit: int = Query(10, ge=1, le=20, description="Max results to return"),
        days: int = Query(7, ge=1, le=30, description="Look back period in days")
    ):
        """
        Get popular/trending searches.
        Returns both global popular searches and category-specific if category_id provided.
        """
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
            
            # Get global popular searches (across all categories)
            global_pipeline = [
                {
                    "$match": {
                        "last_searched": {"$gte": cutoff_date}
                    }
                },
                {
                    "$group": {
                        "_id": "$query",
                        "total_count": {"$sum": "$count"},
                        "last_searched": {"$max": "$last_searched"}
                    }
                },
                {
                    "$sort": {"total_count": -1, "last_searched": -1}
                },
                {
                    "$limit": limit
                },
                {
                    "$project": {
                        "_id": 0,
                        "query": "$_id",
                        "count": "$total_count"
                    }
                }
            ]
            
            global_cursor = searches_collection.aggregate(global_pipeline)
            global_searches = await global_cursor.to_list(length=limit)
            
            # Get category-specific popular searches if category_id provided
            category_searches = []
            if category_id:
                category_pipeline = [
                    {
                        "$match": {
                            "category_id": category_id,
                            "last_searched": {"$gte": cutoff_date}
                        }
                    },
                    {
                        "$sort": {"count": -1, "last_searched": -1}
                    },
                    {
                        "$limit": limit
                    },
                    {
                        "$project": {
                            "_id": 0,
                            "query": 1,
                            "count": 1,
                            "category_id": 1
                        }
                    }
                ]
                
                category_cursor = searches_collection.aggregate(category_pipeline)
                category_searches = await category_cursor.to_list(length=limit)
            
            return {
                "global_searches": global_searches,
                "category_searches": category_searches
            }
            
        except Exception as e:
            logger.error(f"Error fetching popular searches: {e}")
            raise HTTPException(status_code=500, detail="Failed to fetch popular searches")
    
    @router.get("/searches/suggestions")
    async def get_search_suggestions(
        q: str = Query(..., min_length=1, description="Partial search query"),
        category_id: Optional[str] = Query(None, description="Filter by category"),
        limit: int = Query(5, ge=1, le=10, description="Max suggestions")
    ):
        """
        Get search suggestions based on partial query and popular searches.
        Useful for autocomplete functionality.
        """
        try:
            query = q.strip().lower()
            
            # Build match conditions
            match_conditions = {
                "query": {"$regex": f"^{query}", "$options": "i"}
            }
            
            if category_id:
                match_conditions["category_id"] = category_id
            
            pipeline = [
                {"$match": match_conditions},
                {"$sort": {"count": -1, "last_searched": -1}},
                {"$limit": limit},
                {
                    "$project": {
                        "_id": 0,
                        "query": 1,
                        "count": 1
                    }
                }
            ]
            
            cursor = searches_collection.aggregate(pipeline)
            suggestions = await cursor.to_list(length=limit)
            
            return {"suggestions": suggestions}
            
        except Exception as e:
            logger.error(f"Error fetching suggestions: {e}")
            raise HTTPException(status_code=500, detail="Failed to fetch suggestions")
    
    # Create indexes for better query performance
    async def create_indexes():
        try:
            await searches_collection.create_index([("query", 1), ("category_id", 1)], unique=True)
            await searches_collection.create_index([("count", -1)])
            await searches_collection.create_index([("last_searched", -1)])
            await searches_collection.create_index([("category_id", 1), ("count", -1)])
            logger.info("Popular searches indexes created")
        except Exception as e:
            logger.warning(f"Could not create indexes: {e}")
    
    # Store the index creation function on the router for later use
    router.create_indexes = create_indexes
    
    return router
