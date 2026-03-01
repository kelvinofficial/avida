"""
Saved Filters API - Allow users to save and manage their favorite filter combinations
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from bson import ObjectId

router = APIRouter(prefix="/saved-filters", tags=["Saved Filters"])


class SavedFilterCreate(BaseModel):
    """Request model for creating a saved filter"""
    name: str = Field(..., min_length=1, max_length=50, description="Name for the saved filter")
    category_id: str = Field(..., description="Category this filter applies to")
    filters: Dict[str, Any] = Field(..., description="Filter configuration to save")


class SavedFilterUpdate(BaseModel):
    """Request model for updating a saved filter"""
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    filters: Optional[Dict[str, Any]] = None
    is_default: Optional[bool] = None


class SavedFilterResponse(BaseModel):
    """Response model for a saved filter"""
    id: str
    name: str
    category_id: str
    filters: Dict[str, Any]
    is_default: bool
    created_at: str
    updated_at: str


def create_saved_filters_router(db, require_auth):
    """Factory function to create the saved filters router with dependencies"""
    
    collection = db.saved_filters
    
    @router.get("", response_model=List[SavedFilterResponse])
    async def list_saved_filters(
        category_id: Optional[str] = None,
        user = Depends(require_auth)
    ):
        """List all saved filters for the current user"""
        user_id = _get_user_id(user)
        
        query = {"user_id": user_id}
        if category_id:
            query["category_id"] = category_id
        
        cursor = collection.find(query).sort([("is_default", -1), ("created_at", -1)])
        filters = await cursor.to_list(length=50)
        
        return [_format_filter(f) for f in filters]
    
    @router.get("/{filter_id}", response_model=SavedFilterResponse)
    async def get_saved_filter(filter_id: str, user = Depends(require_auth)):
        """Get a specific saved filter"""
        user_id = _get_user_id(user)
        
        try:
            saved_filter = await collection.find_one({
                "_id": ObjectId(filter_id),
                "user_id": user_id
            })
        except:
            raise HTTPException(status_code=400, detail="Invalid filter ID")
        
        if not saved_filter:
            raise HTTPException(status_code=404, detail="Saved filter not found")
        
        return _format_filter(saved_filter)
    
    @router.post("", response_model=SavedFilterResponse)
    async def create_saved_filter(data: SavedFilterCreate, user = Depends(require_auth)):
        """Create a new saved filter"""
        user_id = _get_user_id(user)
        now = datetime.now(timezone.utc)
        
        # Check limit (max 20 saved filters per user per category)
        existing_count = await collection.count_documents({
            "user_id": user_id,
            "category_id": data.category_id
        })
        
        if existing_count >= 20:
            raise HTTPException(
                status_code=400, 
                detail="Maximum 20 saved filters per category. Please delete some to add more."
            )
        
        # Check for duplicate name in same category
        existing_name = await collection.find_one({
            "user_id": user_id,
            "category_id": data.category_id,
            "name": data.name
        })
        
        if existing_name:
            raise HTTPException(
                status_code=400,
                detail="A saved filter with this name already exists for this category"
            )
        
        doc = {
            "user_id": user_id,
            "name": data.name,
            "category_id": data.category_id,
            "filters": data.filters,
            "is_default": False,
            "created_at": now,
            "updated_at": now
        }
        
        result = await collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        
        return _format_filter(doc)
    
    @router.put("/{filter_id}", response_model=SavedFilterResponse)
    async def update_saved_filter(
        filter_id: str,
        data: SavedFilterUpdate,
        user = Depends(require_auth)
    ):
        """Update a saved filter"""
        user_id = _get_user_id(user)
        
        try:
            existing = await collection.find_one({
                "_id": ObjectId(filter_id),
                "user_id": user_id
            })
        except:
            raise HTTPException(status_code=400, detail="Invalid filter ID")
        
        if not existing:
            raise HTTPException(status_code=404, detail="Saved filter not found")
        
        update_doc = {"updated_at": datetime.now(timezone.utc)}
        
        if data.name is not None:
            # Check for duplicate name
            duplicate = await collection.find_one({
                "user_id": user_id,
                "category_id": existing["category_id"],
                "name": data.name,
                "_id": {"$ne": ObjectId(filter_id)}
            })
            if duplicate:
                raise HTTPException(
                    status_code=400,
                    detail="A saved filter with this name already exists for this category"
                )
            update_doc["name"] = data.name
        
        if data.filters is not None:
            update_doc["filters"] = data.filters
        
        if data.is_default is not None:
            # If setting as default, unset other defaults in this category
            if data.is_default:
                await collection.update_many(
                    {
                        "user_id": user_id,
                        "category_id": existing["category_id"],
                        "is_default": True
                    },
                    {"$set": {"is_default": False}}
                )
            update_doc["is_default"] = data.is_default
        
        await collection.update_one(
            {"_id": ObjectId(filter_id)},
            {"$set": update_doc}
        )
        
        updated = await collection.find_one({"_id": ObjectId(filter_id)})
        return _format_filter(updated)
    
    @router.delete("/{filter_id}")
    async def delete_saved_filter(filter_id: str, user = Depends(require_auth)):
        """Delete a saved filter"""
        user_id = _get_user_id(user)
        
        try:
            result = await collection.delete_one({
                "_id": ObjectId(filter_id),
                "user_id": user_id
            })
        except:
            raise HTTPException(status_code=400, detail="Invalid filter ID")
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Saved filter not found")
        
        return {"message": "Saved filter deleted successfully"}
    
    @router.post("/{filter_id}/set-default")
    async def set_default_filter(filter_id: str, user = Depends(require_auth)):
        """Set a saved filter as default for its category"""
        user_id = _get_user_id(user)
        
        try:
            existing = await collection.find_one({
                "_id": ObjectId(filter_id),
                "user_id": user_id
            })
        except:
            raise HTTPException(status_code=400, detail="Invalid filter ID")
        
        if not existing:
            raise HTTPException(status_code=404, detail="Saved filter not found")
        
        # Unset other defaults in this category
        await collection.update_many(
            {
                "user_id": user_id,
                "category_id": existing["category_id"],
                "is_default": True
            },
            {"$set": {"is_default": False}}
        )
        
        # Set this one as default
        await collection.update_one(
            {"_id": ObjectId(filter_id)},
            {"$set": {"is_default": True, "updated_at": datetime.now(timezone.utc)}}
        )
        
        return {"message": "Filter set as default"}
    
    @router.get("/category/{category_id}/default", response_model=Optional[SavedFilterResponse])
    async def get_default_filter(category_id: str, user = Depends(require_auth)):
        """Get the default saved filter for a category"""
        user_id = _get_user_id(user)
        
        default_filter = await collection.find_one({
            "user_id": user_id,
            "category_id": category_id,
            "is_default": True
        })
        
        if not default_filter:
            return None
        
        return _format_filter(default_filter)
    
    return router


def _get_user_id(user) -> str:
    """Extract user ID from user object (handles both dict and object)"""
    if hasattr(user, 'user_id'):
        return str(user.user_id)
    elif hasattr(user, 'id'):
        return str(user.id)
    elif isinstance(user, dict):
        return str(user.get("user_id", user.get("id", user.get("_id", ""))))
    return str(user)


def _format_filter(doc: dict) -> dict:
    """Format a saved filter document for API response"""
    return {
        "id": str(doc["_id"]),
        "name": doc["name"],
        "category_id": doc["category_id"],
        "filters": doc["filters"],
        "is_default": doc.get("is_default", False),
        "created_at": doc.get("created_at", datetime.now(timezone.utc)).isoformat() if isinstance(doc.get("created_at"), datetime) else str(doc.get("created_at", "")),
        "updated_at": doc.get("updated_at", datetime.now(timezone.utc)).isoformat() if isinstance(doc.get("updated_at"), datetime) else str(doc.get("updated_at", ""))
    }
