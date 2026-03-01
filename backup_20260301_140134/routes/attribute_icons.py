"""
Attribute Icons Routes Module
Handles Ionicon management for categories and attributes
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel
import logging
import uuid

logger = logging.getLogger(__name__)


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class IconBase(BaseModel):
    name: str
    ionicon_name: str  # e.g., "car-outline", "home-outline"
    category_id: Optional[str] = None
    subcategory_id: Optional[str] = None
    attribute_name: Optional[str] = None
    icon_type: str = "attribute"  # category, subcategory, attribute
    color: Optional[str] = None
    description: Optional[str] = None


class IconCreate(IconBase):
    pass


class IconUpdate(BaseModel):
    name: Optional[str] = None
    ionicon_name: Optional[str] = None
    category_id: Optional[str] = None
    subcategory_id: Optional[str] = None
    attribute_name: Optional[str] = None
    icon_type: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


# =============================================================================
# AVAILABLE IONICONS LIST
# =============================================================================

IONICONS_LIST = [
    # Vehicles
    "car-outline", "car-sport-outline", "bicycle-outline", "bus-outline", "boat-outline", 
    "airplane-outline", "rocket-outline", "train-outline",
    
    # Property/Building
    "home-outline", "business-outline", "storefront-outline", "bed-outline", "key-outline",
    
    # Electronics
    "laptop-outline", "desktop-outline", "phone-portrait-outline", "tablet-portrait-outline",
    "tv-outline", "game-controller-outline", "headset-outline", "watch-outline", "camera-outline",
    "videocam-outline", "mic-outline", "musical-notes-outline", "radio-outline",
    
    # Fashion/Beauty
    "shirt-outline", "glasses-outline", "diamond-outline", "gift-outline", "bag-outline",
    "wallet-outline", "footsteps-outline", "watch-outline",
    
    # Common Attributes
    "calendar-outline", "time-outline", "speedometer-outline", "flash-outline", "water-outline",
    "color-palette-outline", "resize-outline", "layers-outline", "cube-outline",
    "pricetag-outline", "cash-outline", "card-outline", "barcode-outline", "qr-code-outline",
    
    # Location
    "location-outline", "map-outline", "navigate-outline", "compass-outline", "globe-outline",
    
    # People/Social
    "person-outline", "people-outline", "man-outline", "woman-outline", "body-outline",
    
    # Work/Business
    "briefcase-outline", "construct-outline", "hammer-outline", "settings-outline", 
    "cog-outline", "build-outline", "analytics-outline", "stats-chart-outline",
    
    # Documents
    "document-outline", "document-text-outline", "documents-outline", "folder-outline",
    "clipboard-outline", "reader-outline", "newspaper-outline", "book-outline",
    
    # Communication
    "mail-outline", "chatbubble-outline", "call-outline", "send-outline", "share-outline",
    
    # Status/Info
    "checkmark-circle-outline", "close-circle-outline", "alert-circle-outline", 
    "information-circle-outline", "help-circle-outline", "shield-checkmark-outline",
    "star-outline", "heart-outline", "thumbs-up-outline", "thumbs-down-outline",
    
    # Actions
    "add-outline", "remove-outline", "create-outline", "trash-outline", "pencil-outline",
    "eye-outline", "eye-off-outline", "search-outline", "filter-outline", "options-outline",
    
    # Nature/Animals
    "paw-outline", "leaf-outline", "flower-outline", "sunny-outline", "moon-outline",
    "cloud-outline", "rainy-outline", "snow-outline",
    
    # Food
    "restaurant-outline", "cafe-outline", "beer-outline", "wine-outline", "pizza-outline",
    "fast-food-outline", "nutrition-outline", "ice-cream-outline",
    
    # Health/Fitness
    "fitness-outline", "medkit-outline", "pulse-outline", "thermometer-outline", 
    "bandage-outline", "medical-outline",
    
    # Entertainment
    "football-outline", "basketball-outline", "tennisball-outline", "golf-outline",
    "film-outline", "musical-note-outline", "dice-outline", "extension-puzzle-outline",
    
    # Kids/Baby
    "happy-outline", "balloon-outline", "school-outline",
    
    # Misc
    "flag-outline", "ribbon-outline", "trophy-outline", "medal-outline", 
    "sparkles-outline", "bulb-outline", "battery-full-outline", "battery-half-outline",
    "wifi-outline", "bluetooth-outline", "print-outline", "save-outline",
    "lock-closed-outline", "lock-open-outline", "finger-print-outline",
    "enter-outline", "exit-outline", "swap-horizontal-outline", "swap-vertical-outline",
    "sync-outline", "refresh-outline", "reload-outline",
]


# =============================================================================
# ROUTER FACTORY
# =============================================================================

def create_attribute_icons_router(db, require_admin):
    """
    Create the attribute icons router with dependencies injected
    
    Args:
        db: MongoDB database instance (async motor)
        require_admin: Dependency function for admin authentication
    
    Returns:
        APIRouter with icon management endpoints
    """
    router = APIRouter(prefix="/attribute-icons", tags=["Attribute Icons"])
    
    # =========================================================================
    # PUBLIC ENDPOINTS (for frontend to fetch icons)
    # =========================================================================
    
    @router.get("/ionicons")
    async def get_available_ionicons():
        """Get list of all available Ionicons"""
        return {"icons": IONICONS_LIST, "total": len(IONICONS_LIST)}
    
    @router.get("/public")
    async def get_public_icons(
        category_id: Optional[str] = None,
        subcategory_id: Optional[str] = None,
        icon_type: Optional[str] = None
    ):
        """Get all active icons (public endpoint for frontend)"""
        query = {"is_active": True}
        
        if category_id:
            query["category_id"] = category_id
        if subcategory_id:
            query["subcategory_id"] = subcategory_id
        if icon_type:
            query["icon_type"] = icon_type
        
        cursor = db.attribute_icons.find(query, {"_id": 0})
        icons = await cursor.to_list(length=1000)
        return {"icons": icons, "total": len(icons)}
    
    @router.get("/public/{icon_id}")
    async def get_public_icon(icon_id: str):
        """Get a single icon by ID (public endpoint)"""
        icon = await db.attribute_icons.find_one(
            {"id": icon_id, "is_active": True},
            {"_id": 0}
        )
        if not icon:
            raise HTTPException(status_code=404, detail="Icon not found")
        return icon
    
    @router.get("/by-category/{category_id}")
    async def get_icons_by_category(category_id: str):
        """Get all icons for a specific category"""
        cursor = db.attribute_icons.find(
            {"category_id": category_id, "is_active": True},
            {"_id": 0}
        )
        icons = await cursor.to_list(length=500)
        return {"icons": icons, "total": len(icons)}
    
    @router.get("/by-attribute")
    async def get_icon_by_attribute(
        category_id: str,
        subcategory_id: Optional[str] = None,
        attribute_name: Optional[str] = None
    ):
        """Get icon for a specific attribute"""
        query = {"category_id": category_id, "is_active": True}
        
        if subcategory_id:
            query["subcategory_id"] = subcategory_id
        if attribute_name:
            query["attribute_name"] = attribute_name
        
        icon = await db.attribute_icons.find_one(query, {"_id": 0})
        return icon
    
    # =========================================================================
    # ADMIN ENDPOINTS
    # =========================================================================
    
    @router.get("")
    async def get_all_icons(
        page: int = 1,
        limit: int = 50,
        category_id: Optional[str] = None,
        subcategory_id: Optional[str] = None,
        icon_type: Optional[str] = None,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        current_user: dict = Depends(require_admin)
    ):
        """Get all icons with pagination and filtering (admin)"""
        query = {}
        
        if category_id:
            query["category_id"] = category_id
        if subcategory_id:
            query["subcategory_id"] = subcategory_id
        if icon_type:
            query["icon_type"] = icon_type
        if is_active is not None:
            query["is_active"] = is_active
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"attribute_name": {"$regex": search, "$options": "i"}},
                {"ionicon_name": {"$regex": search, "$options": "i"}}
            ]
        
        skip = (page - 1) * limit
        
        cursor = db.attribute_icons.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
        icons = await cursor.to_list(length=limit)
        
        total = await db.attribute_icons.count_documents(query)
        
        return {
            "icons": icons,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit if total > 0 else 0
            }
        }
    
    @router.get("/stats")
    async def get_icon_stats(current_user: dict = Depends(require_admin)):
        """Get icon statistics"""
        total = await db.attribute_icons.count_documents({})
        active = await db.attribute_icons.count_documents({"is_active": True})
        
        # Count by type
        by_type = {}
        for icon_type in ["category", "subcategory", "attribute"]:
            by_type[icon_type] = await db.attribute_icons.count_documents({"icon_type": icon_type})
        
        # Count by category
        pipeline = [
            {"$match": {"category_id": {"$ne": None}}},
            {"$group": {"_id": "$category_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        cursor = db.attribute_icons.aggregate(pipeline)
        by_category = await cursor.to_list(length=10)
        
        return {
            "total": total,
            "active": active,
            "inactive": total - active,
            "by_type": by_type,
            "by_category": by_category
        }
    
    @router.post("")
    async def create_icon(
        icon_data: IconCreate,
        current_user: dict = Depends(require_admin)
    ):
        """Create a new icon"""
        icon_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        icon_doc = {
            "id": icon_id,
            "name": icon_data.name,
            "ionicon_name": icon_data.ionicon_name,
            "category_id": icon_data.category_id,
            "subcategory_id": icon_data.subcategory_id,
            "attribute_name": icon_data.attribute_name,
            "icon_type": icon_data.icon_type,
            "color": icon_data.color,
            "description": icon_data.description,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
            "created_by": current_user.get("user_id")
        }
        
        await db.attribute_icons.insert_one(icon_doc)
        del icon_doc["_id"]
        
        return {"success": True, "icon": icon_doc}
    
    @router.put("/{icon_id}")
    async def update_icon(
        icon_id: str,
        updates: IconUpdate,
        current_user: dict = Depends(require_admin)
    ):
        """Update an existing icon"""
        existing = await db.attribute_icons.find_one({"id": icon_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Icon not found")
        
        update_data = updates.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.now(timezone.utc)
        update_data["updated_by"] = current_user.get("user_id")
        
        await db.attribute_icons.update_one({"id": icon_id}, {"$set": update_data})
        
        updated = await db.attribute_icons.find_one({"id": icon_id}, {"_id": 0})
        return {"success": True, "icon": updated}
    
    @router.delete("/{icon_id}")
    async def delete_icon(
        icon_id: str,
        current_user: dict = Depends(require_admin)
    ):
        """Soft delete an icon"""
        existing = await db.attribute_icons.find_one({"id": icon_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Icon not found")
        
        await db.attribute_icons.update_one(
            {"id": icon_id},
            {"$set": {
                "is_active": False,
                "deleted_at": datetime.now(timezone.utc),
                "deleted_by": current_user.get("user_id")
            }}
        )
        
        return {"success": True, "message": "Icon deleted"}
    
    @router.delete("/{icon_id}/permanent")
    async def permanently_delete_icon(
        icon_id: str,
        current_user: dict = Depends(require_admin)
    ):
        """Permanently delete an icon"""
        result = await db.attribute_icons.delete_one({"id": icon_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Icon not found")
        
        return {"success": True, "message": "Icon permanently deleted"}
    
    @router.post("/{icon_id}/restore")
    async def restore_icon(
        icon_id: str,
        current_user: dict = Depends(require_admin)
    ):
        """Restore a soft-deleted icon"""
        existing = await db.attribute_icons.find_one({"id": icon_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Icon not found")
        
        await db.attribute_icons.update_one(
            {"id": icon_id},
            {
                "$set": {
                    "is_active": True,
                    "updated_at": datetime.now(timezone.utc),
                    "updated_by": current_user.get("user_id")
                },
                "$unset": {"deleted_at": "", "deleted_by": ""}
            }
        )
        
        return {"success": True, "message": "Icon restored"}
    
    @router.post("/bulk-create")
    async def bulk_create_icons(
        icons: List[IconCreate],
        current_user: dict = Depends(require_admin)
    ):
        """Bulk create multiple icons"""
        created = []
        errors = []
        
        for idx, icon_data in enumerate(icons):
            try:
                icon_id = str(uuid.uuid4())
                now = datetime.now(timezone.utc)
                
                icon_doc = {
                    "id": icon_id,
                    "name": icon_data.name,
                    "ionicon_name": icon_data.ionicon_name,
                    "category_id": icon_data.category_id,
                    "subcategory_id": icon_data.subcategory_id,
                    "attribute_name": icon_data.attribute_name,
                    "icon_type": icon_data.icon_type,
                    "color": icon_data.color,
                    "description": icon_data.description,
                    "is_active": True,
                    "created_at": now,
                    "updated_at": now,
                    "created_by": current_user.get("user_id")
                }
                
                await db.attribute_icons.insert_one(icon_doc)
                del icon_doc["_id"]
                created.append(icon_doc)
            except Exception as e:
                errors.append({"index": idx, "error": str(e)})
        
        return {
            "success": True,
            "created": len(created),
            "errors": errors,
            "icons": created
        }
    
    # =========================================================================
    # CATEGORY/ATTRIBUTE ASSIGNMENT ENDPOINTS
    # =========================================================================
    
    @router.post("/assign")
    async def assign_icon_to_attribute(
        icon_id: str,
        category_id: str,
        subcategory_id: Optional[str] = None,
        attribute_name: Optional[str] = None,
        current_user: dict = Depends(require_admin)
    ):
        """Assign an icon to a category/subcategory/attribute"""
        existing = await db.attribute_icons.find_one({"id": icon_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Icon not found")
        
        await db.attribute_icons.update_one(
            {"id": icon_id},
            {"$set": {
                "category_id": category_id,
                "subcategory_id": subcategory_id,
                "attribute_name": attribute_name,
                "updated_at": datetime.now(timezone.utc),
                "updated_by": current_user.get("user_id")
            }}
        )
        
        return {"success": True, "message": "Icon assigned"}
    
    @router.get("/mappings")
    async def get_icon_mappings(current_user: dict = Depends(require_admin)):
        """Get all icon mappings organized by category"""
        cursor = db.attribute_icons.find(
            {"is_active": True},
            {"_id": 0, "id": 1, "name": 1, "ionicon_name": 1, "category_id": 1, "subcategory_id": 1, "attribute_name": 1, "icon_type": 1}
        )
        icons = await cursor.to_list(length=1000)
        
        # Organize by category
        mappings = {}
        for icon in icons:
            cat_id = icon.get("category_id") or "_global"
            if cat_id not in mappings:
                mappings[cat_id] = {
                    "category_icon": None,
                    "subcategories": {},
                    "attributes": []
                }
            
            if icon.get("icon_type") == "category":
                mappings[cat_id]["category_icon"] = icon
            elif icon.get("icon_type") == "subcategory":
                sub_id = icon.get("subcategory_id")
                if sub_id:
                    mappings[cat_id]["subcategories"][sub_id] = icon
            elif icon.get("icon_type") == "attribute":
                mappings[cat_id]["attributes"].append(icon)
        
        return {"mappings": mappings}
    
    # =========================================================================
    # SEED DEFAULT ICONS
    # =========================================================================
    
    DEFAULT_ICONS = [
        # Motors/Auto category icons
        {"name": "Car Make", "ionicon_name": "car-outline", "category_id": "auto_vehicles", "attribute_name": "make", "icon_type": "attribute"},
        {"name": "Car Model", "ionicon_name": "car-sport-outline", "category_id": "auto_vehicles", "attribute_name": "model", "icon_type": "attribute"},
        {"name": "Year", "ionicon_name": "calendar-outline", "category_id": "auto_vehicles", "attribute_name": "year", "icon_type": "attribute"},
        {"name": "Mileage", "ionicon_name": "speedometer-outline", "category_id": "auto_vehicles", "attribute_name": "mileage", "icon_type": "attribute"},
        {"name": "Fuel Type", "ionicon_name": "water-outline", "category_id": "auto_vehicles", "attribute_name": "fuel_type", "icon_type": "attribute"},
        {"name": "Transmission", "ionicon_name": "settings-outline", "category_id": "auto_vehicles", "attribute_name": "transmission", "icon_type": "attribute"},
        {"name": "Body Type", "ionicon_name": "car-outline", "category_id": "auto_vehicles", "attribute_name": "body_type", "icon_type": "attribute"},
        {"name": "Engine Size", "ionicon_name": "flash-outline", "category_id": "auto_vehicles", "attribute_name": "engine_size", "icon_type": "attribute"},
        {"name": "Color", "ionicon_name": "color-palette-outline", "category_id": "auto_vehicles", "attribute_name": "color", "icon_type": "attribute"},
        {"name": "Doors", "ionicon_name": "enter-outline", "category_id": "auto_vehicles", "attribute_name": "doors", "icon_type": "attribute"},
        {"name": "Registered", "ionicon_name": "document-outline", "category_id": "auto_vehicles", "attribute_name": "registered", "icon_type": "attribute"},
        
        # Properties category icons
        {"name": "Property Type", "ionicon_name": "home-outline", "category_id": "properties", "attribute_name": "property_type", "icon_type": "attribute"},
        {"name": "Bedrooms", "ionicon_name": "bed-outline", "category_id": "properties", "attribute_name": "bedrooms", "icon_type": "attribute"},
        {"name": "Bathrooms", "ionicon_name": "water-outline", "category_id": "properties", "attribute_name": "bathrooms", "icon_type": "attribute"},
        {"name": "Size (sqm)", "ionicon_name": "resize-outline", "category_id": "properties", "attribute_name": "size_sqm", "icon_type": "attribute"},
        {"name": "Floor", "ionicon_name": "layers-outline", "category_id": "properties", "attribute_name": "floor", "icon_type": "attribute"},
        {"name": "Parking", "ionicon_name": "car-outline", "category_id": "properties", "attribute_name": "parking", "icon_type": "attribute"},
        {"name": "Furnished", "ionicon_name": "cube-outline", "category_id": "properties", "attribute_name": "furnished", "icon_type": "attribute"},
        {"name": "Available From", "ionicon_name": "time-outline", "category_id": "properties", "attribute_name": "available_from", "icon_type": "attribute"},
        {"name": "Pets Allowed", "ionicon_name": "paw-outline", "category_id": "properties", "attribute_name": "pets_allowed", "icon_type": "attribute"},
        {"name": "Balcony", "ionicon_name": "sunny-outline", "category_id": "properties", "attribute_name": "balcony", "icon_type": "attribute"},
        {"name": "Elevator", "ionicon_name": "arrow-up-outline", "category_id": "properties", "attribute_name": "elevator", "icon_type": "attribute"},
        
        # Electronics category icons
        {"name": "Type", "ionicon_name": "laptop-outline", "category_id": "electronics", "attribute_name": "type", "icon_type": "attribute"},
        {"name": "Brand", "ionicon_name": "ribbon-outline", "category_id": "electronics", "attribute_name": "brand", "icon_type": "attribute"},
        {"name": "Model", "ionicon_name": "barcode-outline", "category_id": "electronics", "attribute_name": "model", "icon_type": "attribute"},
        {"name": "Processor", "ionicon_name": "hardware-chip-outline", "category_id": "electronics", "attribute_name": "processor", "icon_type": "attribute"},
        {"name": "RAM", "ionicon_name": "server-outline", "category_id": "electronics", "attribute_name": "ram", "icon_type": "attribute"},
        {"name": "Storage", "ionicon_name": "folder-outline", "category_id": "electronics", "attribute_name": "storage", "icon_type": "attribute"},
        {"name": "Graphics", "ionicon_name": "game-controller-outline", "category_id": "electronics", "attribute_name": "graphics", "icon_type": "attribute"},
        {"name": "Screen Size", "ionicon_name": "expand-outline", "category_id": "electronics", "attribute_name": "screen_size", "icon_type": "attribute"},
        {"name": "Warranty", "ionicon_name": "shield-checkmark-outline", "category_id": "electronics", "attribute_name": "warranty", "icon_type": "attribute"},
        {"name": "Original Box", "ionicon_name": "cube-outline", "category_id": "electronics", "attribute_name": "original_box", "icon_type": "attribute"},
        
        # Phones & Tablets category icons
        {"name": "Phone Brand", "ionicon_name": "ribbon-outline", "category_id": "phones_tablets", "attribute_name": "brand", "icon_type": "attribute"},
        {"name": "Phone Model", "ionicon_name": "phone-portrait-outline", "category_id": "phones_tablets", "attribute_name": "model", "icon_type": "attribute"},
        {"name": "Phone Storage", "ionicon_name": "folder-outline", "category_id": "phones_tablets", "attribute_name": "storage", "icon_type": "attribute"},
        {"name": "Phone Color", "ionicon_name": "color-palette-outline", "category_id": "phones_tablets", "attribute_name": "color", "icon_type": "attribute"},
        {"name": "Battery Health", "ionicon_name": "battery-half-outline", "category_id": "phones_tablets", "attribute_name": "battery_health", "icon_type": "attribute"},
        {"name": "Carrier Lock", "ionicon_name": "lock-closed-outline", "category_id": "phones_tablets", "attribute_name": "carrier_lock", "icon_type": "attribute"},
        
        # Fashion & Beauty category icons
        {"name": "Clothing Type", "ionicon_name": "shirt-outline", "category_id": "fashion_beauty", "attribute_name": "type", "icon_type": "attribute"},
        {"name": "Gender", "ionicon_name": "people-outline", "category_id": "fashion_beauty", "attribute_name": "for_gender", "icon_type": "attribute"},
        {"name": "Fashion Brand", "ionicon_name": "ribbon-outline", "category_id": "fashion_beauty", "attribute_name": "brand", "icon_type": "attribute"},
        {"name": "Size", "ionicon_name": "resize-outline", "category_id": "fashion_beauty", "attribute_name": "size", "icon_type": "attribute"},
        {"name": "Color", "ionicon_name": "color-palette-outline", "category_id": "fashion_beauty", "attribute_name": "color", "icon_type": "attribute"},
        {"name": "Material", "ionicon_name": "layers-outline", "category_id": "fashion_beauty", "attribute_name": "material", "icon_type": "attribute"},
        
        # Jobs & Services category icons
        {"name": "Job Title", "ionicon_name": "person-outline", "category_id": "jobs_services", "attribute_name": "job_title", "icon_type": "attribute"},
        {"name": "Job Type", "ionicon_name": "briefcase-outline", "category_id": "jobs_services", "attribute_name": "job_type", "icon_type": "attribute"},
        {"name": "Industry", "ionicon_name": "business-outline", "category_id": "jobs_services", "attribute_name": "industry", "icon_type": "attribute"},
        {"name": "Experience", "ionicon_name": "trending-up-outline", "category_id": "jobs_services", "attribute_name": "experience", "icon_type": "attribute"},
        {"name": "Salary Range", "ionicon_name": "cash-outline", "category_id": "jobs_services", "attribute_name": "salary_range", "icon_type": "attribute"},
        {"name": "Remote Work", "ionicon_name": "home-outline", "category_id": "jobs_services", "attribute_name": "remote", "icon_type": "attribute"},
        
        # Pets category icons
        {"name": "Pet Breed", "ionicon_name": "paw-outline", "category_id": "pets", "attribute_name": "breed", "icon_type": "attribute"},
        {"name": "Pet Age", "ionicon_name": "calendar-outline", "category_id": "pets", "attribute_name": "age", "icon_type": "attribute"},
        {"name": "Pet Gender", "ionicon_name": "male-female-outline", "category_id": "pets", "attribute_name": "gender", "icon_type": "attribute"},
        {"name": "Vaccinated", "ionicon_name": "medkit-outline", "category_id": "pets", "attribute_name": "vaccinated", "icon_type": "attribute"},
        
        # Global/Common attribute icons
        {"name": "Price", "ionicon_name": "pricetag-outline", "attribute_name": "price", "icon_type": "attribute"},
        {"name": "Title", "ionicon_name": "text-outline", "attribute_name": "title", "icon_type": "attribute"},
        {"name": "Description", "ionicon_name": "document-text-outline", "attribute_name": "description", "icon_type": "attribute"},
        {"name": "Location", "ionicon_name": "location-outline", "attribute_name": "location", "icon_type": "attribute"},
        {"name": "Condition", "ionicon_name": "star-outline", "attribute_name": "condition", "icon_type": "attribute"},
        {"name": "Negotiable", "ionicon_name": "swap-horizontal-outline", "attribute_name": "negotiable", "icon_type": "attribute"},
        
        # Category icons (main categories)
        {"name": "Auto & Vehicles", "ionicon_name": "car-outline", "category_id": "auto_vehicles", "icon_type": "category"},
        {"name": "Properties", "ionicon_name": "business-outline", "category_id": "properties", "icon_type": "category"},
        {"name": "Electronics", "ionicon_name": "laptop-outline", "category_id": "electronics", "icon_type": "category"},
        {"name": "Phones & Tablets", "ionicon_name": "phone-portrait-outline", "category_id": "phones_tablets", "icon_type": "category"},
        {"name": "Home & Furniture", "ionicon_name": "home-outline", "category_id": "home_furniture", "icon_type": "category"},
        {"name": "Fashion & Beauty", "ionicon_name": "shirt-outline", "category_id": "fashion_beauty", "icon_type": "category"},
        {"name": "Jobs & Services", "ionicon_name": "briefcase-outline", "category_id": "jobs_services", "icon_type": "category"},
        {"name": "Kids & Baby", "ionicon_name": "happy-outline", "category_id": "kids_baby", "icon_type": "category"},
        {"name": "Sports & Hobbies", "ionicon_name": "football-outline", "category_id": "sports_hobbies", "icon_type": "category"},
        {"name": "Pets", "ionicon_name": "paw-outline", "category_id": "pets", "icon_type": "category"},
        {"name": "Agriculture & Food", "ionicon_name": "nutrition-outline", "category_id": "agriculture", "icon_type": "category"},
        {"name": "Commercial Equipment", "ionicon_name": "construct-outline", "category_id": "commercial_equipment", "icon_type": "category"},
        {"name": "Repair & Construction", "ionicon_name": "hammer-outline", "category_id": "repair_construction", "icon_type": "category"},
    ]
    
    @router.post("/seed")
    async def seed_default_icons(current_user: dict = Depends(require_admin)):
        """Seed default icons for common attributes"""
        created = 0
        skipped = 0
        
        for icon_data in DEFAULT_ICONS:
            # Check if icon already exists
            existing = await db.attribute_icons.find_one({
                "name": icon_data["name"],
                "category_id": icon_data.get("category_id"),
                "attribute_name": icon_data.get("attribute_name")
            })
            
            if existing:
                skipped += 1
                continue
            
            icon_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc)
            
            icon_doc = {
                "id": icon_id,
                "name": icon_data["name"],
                "ionicon_name": icon_data["ionicon_name"],
                "category_id": icon_data.get("category_id"),
                "subcategory_id": icon_data.get("subcategory_id"),
                "attribute_name": icon_data.get("attribute_name"),
                "icon_type": icon_data.get("icon_type", "attribute"),
                "color": icon_data.get("color"),
                "description": icon_data.get("description"),
                "is_active": True,
                "created_at": now,
                "updated_at": now,
                "created_by": current_user.get("user_id")
            }
            
            await db.attribute_icons.insert_one(icon_doc)
            created += 1
        
        return {
            "success": True,
            "message": f"Seeded {created} icons, skipped {skipped} existing",
            "created": created,
            "skipped": skipped
        }
    
    return router
