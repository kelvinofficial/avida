"""
Photography Guides API - Category-specific photo tips with illustration images
Allows admins to manage visual guides for listing creation
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId

router = APIRouter(prefix="/photography-guides", tags=["Photography Guides"])

# Pydantic models
class PhotographyGuide(BaseModel):
    category_id: str
    title: str
    description: str
    icon: str = "camera-outline"
    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    order: int = 0
    is_active: bool = True

class PhotographyGuideCreate(BaseModel):
    category_id: str = Field(..., description="Category ID this guide belongs to")
    title: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=500)
    icon: str = Field(default="camera-outline", description="Ionicon name")
    image_base64: Optional[str] = Field(None, description="Base64 encoded image")
    order: int = Field(default=0, description="Display order")
    is_active: bool = Field(default=True)

class PhotographyGuideUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    image_base64: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None

class PhotographyGuideResponse(BaseModel):
    id: str
    category_id: str
    title: str
    description: str
    icon: str
    image_url: Optional[str] = None
    order: int
    is_active: bool
    created_at: str
    updated_at: str

def create_photography_guides_router(db, require_auth):
    """Factory function to create the photography guides router with dependencies"""
    
    collection = db.photography_guides
    
    # ==================== PUBLIC ENDPOINTS ====================
    
    @router.get("/public/{category_id}", response_model=List[PhotographyGuideResponse])
    async def get_public_guides(category_id: str):
        """Get active photography guides for a category (public endpoint)"""
        cursor = collection.find(
            {"category_id": category_id, "is_active": True},
            {"_id": 1, "category_id": 1, "title": 1, "description": 1, "icon": 1, 
             "image_base64": 1, "order": 1, "is_active": 1, "created_at": 1, "updated_at": 1}
        ).sort("order", 1).limit(10)
        guides = await cursor.to_list(length=10)
        
        result = []
        for guide in guides:
            result.append({
                "id": str(guide["_id"]),
                "category_id": guide["category_id"],
                "title": guide["title"],
                "description": guide["description"],
                "icon": guide.get("icon", "camera-outline"),
                "image_url": f"data:image/jpeg;base64,{guide['image_base64']}" if guide.get("image_base64") else None,
                "order": guide.get("order", 0),
                "is_active": guide.get("is_active", True),
                "created_at": guide.get("created_at", datetime.now(timezone.utc)).isoformat() if isinstance(guide.get("created_at"), datetime) else str(guide.get("created_at", "")),
                "updated_at": guide.get("updated_at", datetime.now(timezone.utc)).isoformat() if isinstance(guide.get("updated_at"), datetime) else str(guide.get("updated_at", ""))
            })
        
        return result
    
    @router.get("/public/all/categories")
    async def get_all_categories_with_guides():
        """Get list of categories that have photography guides configured"""
        pipeline = [
            {"$match": {"is_active": True}},
            {"$group": {"_id": "$category_id", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}}
        ]
        cursor = collection.aggregate(pipeline)
        result = await cursor.to_list(length=100)
        return {"categories": [{"category_id": r["_id"], "guide_count": r["count"]} for r in result]}
    
    # ==================== ADMIN ENDPOINTS ====================
    
    @router.get("", response_model=dict)
    async def list_guides(
        category_id: Optional[str] = None,
        is_active: Optional[bool] = None,
        page: int = 1,
        limit: int = 50,
        user = Depends(require_auth)
    ):
        """List all photography guides with optional filtering (admin only)"""
        query = {}
        if category_id:
            query["category_id"] = category_id
        if is_active is not None:
            query["is_active"] = is_active
        
        total = await collection.count_documents(query)
        skip = (page - 1) * limit
        
        cursor = collection.find(
            query,
            {"image_base64": 0}  # Exclude base64 from list view for performance
        ).sort([("category_id", 1), ("order", 1)]).skip(skip).limit(limit)
        guides = await cursor.to_list(length=limit)
        
        result = []
        for guide in guides:
            result.append({
                "id": str(guide["_id"]),
                "category_id": guide["category_id"],
                "title": guide["title"],
                "description": guide["description"],
                "icon": guide.get("icon", "camera-outline"),
                "has_image": bool(guide.get("has_image", False)),
                "order": guide.get("order", 0),
                "is_active": guide.get("is_active", True),
                "created_at": guide.get("created_at", "").isoformat() if isinstance(guide.get("created_at"), datetime) else str(guide.get("created_at", "")),
                "updated_at": guide.get("updated_at", "").isoformat() if isinstance(guide.get("updated_at"), datetime) else str(guide.get("updated_at", ""))
            })
        
        return {
            "guides": result,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        }
    
    @router.get("/stats")
    async def get_stats(user = Depends(require_auth)):
        """Get photography guides statistics"""
        total = await collection.count_documents({})
        active = await collection.count_documents({"is_active": True})
        
        # Count by category
        pipeline = [
            {"$group": {"_id": "$category_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        cursor = collection.aggregate(pipeline)
        by_category = await cursor.to_list(length=100)
        
        # Count with images
        with_images = await collection.count_documents({"has_image": True})
        
        return {
            "total": total,
            "active": active,
            "inactive": total - active,
            "with_images": with_images,
            "categories_count": len(by_category),
            "by_category": {r["_id"]: r["count"] for r in by_category}
        }
    
    @router.get("/{guide_id}")
    async def get_guide(guide_id: str, user = Depends(require_auth)):
        """Get a specific photography guide with full details"""
        try:
            guide = await collection.find_one({"_id": ObjectId(guide_id)})
        except:
            raise HTTPException(status_code=400, detail="Invalid guide ID")
        
        if not guide:
            raise HTTPException(status_code=404, detail="Guide not found")
        
        return {
            "id": str(guide["_id"]),
            "category_id": guide["category_id"],
            "title": guide["title"],
            "description": guide["description"],
            "icon": guide.get("icon", "camera-outline"),
            "image_url": f"data:image/jpeg;base64,{guide['image_base64']}" if guide.get("image_base64") else None,
            "has_image": bool(guide.get("image_base64")),
            "order": guide.get("order", 0),
            "is_active": guide.get("is_active", True),
            "created_at": guide.get("created_at", "").isoformat() if isinstance(guide.get("created_at"), datetime) else str(guide.get("created_at", "")),
            "updated_at": guide.get("updated_at", "").isoformat() if isinstance(guide.get("updated_at"), datetime) else str(guide.get("updated_at", ""))
        }
    
    @router.post("")
    async def create_guide(guide: PhotographyGuideCreate, user = Depends(require_auth)):
        """Create a new photography guide"""
        now = datetime.now(timezone.utc)
        
        # Extract user_id from user object (could be dict or object)
        user_id = "admin"
        if hasattr(user, 'user_id'):
            user_id = user.user_id
        elif hasattr(user, 'email'):
            user_id = user.email
        elif isinstance(user, dict):
            user_id = user.get("user_id", user.get("email", "admin"))
        
        doc = {
            "category_id": guide.category_id,
            "title": guide.title,
            "description": guide.description,
            "icon": guide.icon,
            "order": guide.order,
            "is_active": guide.is_active,
            "has_image": False,
            "created_at": now,
            "updated_at": now,
            "created_by": user_id
        }
        
        # Handle image upload
        if guide.image_base64:
            # Remove data URL prefix if present
            image_data = guide.image_base64
            if "base64," in image_data:
                image_data = image_data.split("base64,")[1]
            doc["image_base64"] = image_data
            doc["has_image"] = True
        
        result = await collection.insert_one(doc)
        
        return {
            "id": str(result.inserted_id),
            "message": "Photography guide created successfully"
        }
    
    @router.put("/{guide_id}")
    async def update_guide(guide_id: str, update: PhotographyGuideUpdate, user = Depends(require_auth)):
        """Update a photography guide"""
        try:
            existing = await collection.find_one({"_id": ObjectId(guide_id)})
        except:
            raise HTTPException(status_code=400, detail="Invalid guide ID")
        
        if not existing:
            raise HTTPException(status_code=404, detail="Guide not found")
        
        update_doc = {"updated_at": datetime.now(timezone.utc)}
        
        if update.title is not None:
            update_doc["title"] = update.title
        if update.description is not None:
            update_doc["description"] = update.description
        if update.icon is not None:
            update_doc["icon"] = update.icon
        if update.order is not None:
            update_doc["order"] = update.order
        if update.is_active is not None:
            update_doc["is_active"] = update.is_active
        
        # Handle image update
        if update.image_base64 is not None:
            if update.image_base64 == "":
                # Remove image
                update_doc["image_base64"] = None
                update_doc["has_image"] = False
            else:
                # Update image
                image_data = update.image_base64
                if "base64," in image_data:
                    image_data = image_data.split("base64,")[1]
                update_doc["image_base64"] = image_data
                update_doc["has_image"] = True
        
        await collection.update_one({"_id": ObjectId(guide_id)}, {"$set": update_doc})
        
        return {"message": "Photography guide updated successfully"}
    
    @router.delete("/{guide_id}")
    async def delete_guide(guide_id: str, user = Depends(require_auth)):
        """Delete a photography guide"""
        try:
            result = await collection.delete_one({"_id": ObjectId(guide_id)})
        except:
            raise HTTPException(status_code=400, detail="Invalid guide ID")
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Guide not found")
        
        return {"message": "Photography guide deleted successfully"}
    
    @router.post("/seed")
    async def seed_default_guides(user: dict = Depends(require_auth)):
        """Seed default photography guides for all categories"""
        from .photography_guides_defaults import DEFAULT_PHOTOGRAPHY_GUIDES
        
        now = datetime.now(timezone.utc)
        created_count = 0
        
        for category_id, guides in DEFAULT_PHOTOGRAPHY_GUIDES.items():
            for i, guide in enumerate(guides):
                # Check if guide already exists
                existing = await collection.find_one({
                    "category_id": category_id,
                    "title": guide["title"]
                })
                
                if not existing:
                    doc = {
                        "category_id": category_id,
                        "title": guide["title"],
                        "description": guide["description"],
                        "icon": guide.get("icon", "camera-outline"),
                        "order": i,
                        "is_active": True,
                        "has_image": False,
                        "created_at": now,
                        "updated_at": now,
                        "created_by": "system"
                    }
                    await collection.insert_one(doc)
                    created_count += 1
        
        return {"message": f"Seeded {created_count} default photography guides"}
    
    @router.put("/reorder/{category_id}")
    async def reorder_guides(category_id: str, guide_ids: List[str], user: dict = Depends(require_auth)):
        """Reorder guides within a category"""
        now = datetime.now(timezone.utc)
        
        for i, guide_id in enumerate(guide_ids):
            try:
                await collection.update_one(
                    {"_id": ObjectId(guide_id), "category_id": category_id},
                    {"$set": {"order": i, "updated_at": now}}
                )
            except:
                pass
        
        return {"message": "Guides reordered successfully"}
    
    return router
