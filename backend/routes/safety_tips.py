"""
Safety Tips Routes Module
Manages category-specific safety tips for the marketplace.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

# Default safety tips per category
DEFAULT_SAFETY_TIPS = {
    "auto_vehicles": [
        "Always test drive the vehicle before making a payment",
        "Verify vehicle ownership documents (logbook/title)",
        "Check the vehicle's service history and mileage",
        "Have a mechanic inspect the vehicle before purchase",
        "Meet in a public place for test drives"
    ],
    "properties": [
        "Visit the property in person before paying any deposit",
        "Verify the landlord's ownership or agency credentials",
        "Never pay rent before signing a proper agreement",
        "Check the neighborhood and amenities",
        "Document the property condition before moving in"
    ],
    "electronics": [
        "Test the item thoroughly before paying",
        "Check for warranty validity and receipts",
        "Meet in a public place for the transaction",
        "Verify the serial number isn't reported stolen",
        "Don't send money for items you haven't seen"
    ],
    "phones_tablets": [
        "Check the IMEI number for any blocks or reports",
        "Test all functions including cameras and sensors",
        "Verify the device isn't locked to another account",
        "Meet in a safe public location",
        "Ask for original purchase receipt"
    ],
    "home_furniture": [
        "Inspect items for damage before purchase",
        "Measure items to ensure they fit your space",
        "Test functionality of appliances and furniture",
        "Meet in a public place or safe location",
        "Don't pay in advance for delivery"
    ],
    "fashion_beauty": [
        "Verify authenticity of branded items",
        "Check for defects and wear before buying",
        "Ask for original receipts for luxury items",
        "Meet in a public place for exchanges",
        "Be cautious of prices too good to be true"
    ],
    "jobs_services": [
        "Verify company credentials before accepting jobs",
        "Never pay upfront for job opportunities",
        "Research the employer or service provider",
        "Get written contracts for services",
        "Meet in professional settings for interviews"
    ],
    "pets": [
        "Meet the pet and owner in person first",
        "Ask for vaccination and health records",
        "Verify the pet's age and breed claims",
        "Consider a vet check before finalizing",
        "Be wary of sellers unwilling to meet in person"
    ],
    "kids_baby": [
        "Check for recalls on baby products",
        "Inspect items for safety hazards",
        "Test functionality of electronics/toys",
        "Verify age appropriateness",
        "Meet in a public place with children present"
    ],
    "sports_hobbies": [
        "Test equipment functionality before buying",
        "Check for wear and authenticity",
        "Verify sizing matches your needs",
        "Meet at appropriate venues to test items",
        "Research fair market prices"
    ],
    "agriculture": [
        "Inspect livestock or produce in person",
        "Verify seller credentials and farm location",
        "Check health certificates for animals",
        "Test machinery before purchase",
        "Get written agreements for bulk orders"
    ],
    "commercial_equipment": [
        "Inspect equipment operation before purchase",
        "Verify maintenance records",
        "Check for any liens or financing",
        "Test all functions and safety features",
        "Get professional assessment for large purchases"
    ],
    "repair_construction": [
        "Verify contractor licenses and insurance",
        "Get multiple quotes before committing",
        "Never pay full amount upfront",
        "Get everything in writing",
        "Check references and previous work"
    ],
    "default": [
        "Meet in a public place",
        "Don't send money before seeing the item",
        "Check the item thoroughly before paying",
        "Trust your instincts - if it seems too good to be true, it probably is",
        "Keep communication within the platform"
    ]
}

class SafetyTipCreate(BaseModel):
    category_id: str
    tip_text: str
    order: Optional[int] = 0
    is_active: Optional[bool] = True

class SafetyTipUpdate(BaseModel):
    tip_text: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None

class BulkSafetyTipsCreate(BaseModel):
    category_id: str
    tips: List[str]


def create_safety_tips_router(db, require_admin):
    """Factory function to create safety tips router with db and auth dependencies"""
    router = APIRouter(prefix="/safety-tips", tags=["Safety Tips"])

    # Public endpoint to get safety tips for a category
    @router.get("/public/{category_id}")
    async def get_public_safety_tips(category_id: str):
        """Get safety tips for a specific category (public endpoint)"""
        try:
            cursor = db.safety_tips.find(
                {"category_id": category_id, "is_active": True},
                {"_id": 0}
            ).sort("order", 1)
            tips = await cursor.to_list(length=100)
            
            if not tips:
                # Return default tips if no custom tips exist
                default_tips = DEFAULT_SAFETY_TIPS.get(category_id, DEFAULT_SAFETY_TIPS["default"])
                return {
                    "category_id": category_id,
                    "tips": [{"tip_text": tip, "is_default": True} for tip in default_tips],
                    "is_default": True
                }
            
            return {
                "category_id": category_id,
                "tips": tips,
                "is_default": False
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # Get all default tips
    @router.get("/defaults")
    async def get_default_safety_tips():
        """Get all default safety tips"""
        return {"defaults": DEFAULT_SAFETY_TIPS}

    # Get all safety tips (admin)
    @router.get("")
    async def get_all_safety_tips(
        category_id: Optional[str] = None,
        current_user: dict = Depends(require_admin)
    ):
        """Get all safety tips (admin only)"""
        try:
            query = {}
            if category_id:
                query["category_id"] = category_id
                
            tips = list(db.safety_tips.find(query, {"_id": 0}).sort([("category_id", 1), ("order", 1)]))
            
            # Group by category
            grouped = {}
            for tip in tips:
                cat = tip.get("category_id", "default")
                if cat not in grouped:
                    grouped[cat] = []
                grouped[cat].append(tip)
                
            return {
                "tips": tips,
                "grouped": grouped,
                "total": len(tips)
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # Get stats
    @router.get("/stats")
    async def get_safety_tips_stats(current_user: dict = Depends(require_admin)):
        """Get safety tips statistics"""
        try:
            total = db.safety_tips.count_documents({})
            active = db.safety_tips.count_documents({"is_active": True})
            
            # Count by category
            pipeline = [
                {"$group": {"_id": "$category_id", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            by_category = list(db.safety_tips.aggregate(pipeline))
            
            return {
                "total": total,
                "active": active,
                "inactive": total - active,
                "by_category": {item["_id"]: item["count"] for item in by_category}
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # Create safety tip
    @router.post("")
    async def create_safety_tip(
        tip_data: SafetyTipCreate,
        current_user: dict = Depends(require_admin)
    ):
        """Create a new safety tip"""
        try:
            tip = {
                "id": str(uuid.uuid4()),
                "category_id": tip_data.category_id,
                "tip_text": tip_data.tip_text,
                "order": tip_data.order,
                "is_active": tip_data.is_active,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "created_by": current_user.get("email", "admin")
            }
            
            db.safety_tips.insert_one(tip)
            tip.pop("_id", None)
            
            return {"message": "Safety tip created", "tip": tip}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # Update safety tip
    @router.put("/{tip_id}")
    async def update_safety_tip(
        tip_id: str,
        tip_data: SafetyTipUpdate,
        current_user: dict = Depends(require_admin)
    ):
        """Update a safety tip"""
        try:
            existing = db.safety_tips.find_one({"id": tip_id})
            if not existing:
                raise HTTPException(status_code=404, detail="Safety tip not found")
            
            update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
            if tip_data.tip_text is not None:
                update_data["tip_text"] = tip_data.tip_text
            if tip_data.order is not None:
                update_data["order"] = tip_data.order
            if tip_data.is_active is not None:
                update_data["is_active"] = tip_data.is_active
                
            db.safety_tips.update_one({"id": tip_id}, {"$set": update_data})
            
            updated = db.safety_tips.find_one({"id": tip_id}, {"_id": 0})
            return {"message": "Safety tip updated", "tip": updated}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # Delete safety tip
    @router.delete("/{tip_id}")
    async def delete_safety_tip(
        tip_id: str,
        current_user: dict = Depends(require_admin)
    ):
        """Delete a safety tip"""
        try:
            result = db.safety_tips.delete_one({"id": tip_id})
            if result.deleted_count == 0:
                raise HTTPException(status_code=404, detail="Safety tip not found")
            return {"message": "Safety tip deleted"}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # Bulk create tips for a category
    @router.post("/bulk")
    async def bulk_create_safety_tips(
        data: BulkSafetyTipsCreate,
        current_user: dict = Depends(require_admin)
    ):
        """Bulk create safety tips for a category"""
        try:
            tips = []
            for idx, tip_text in enumerate(data.tips):
                tip = {
                    "id": str(uuid.uuid4()),
                    "category_id": data.category_id,
                    "tip_text": tip_text,
                    "order": idx,
                    "is_active": True,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "created_by": current_user.get("email", "admin")
                }
                tips.append(tip)
            
            if tips:
                db.safety_tips.insert_many(tips)
                # Remove _id from response
                for tip in tips:
                    tip.pop("_id", None)
            
            return {"message": f"Created {len(tips)} safety tips", "tips": tips}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # Seed default tips
    @router.post("/seed")
    async def seed_default_safety_tips(current_user: dict = Depends(require_admin)):
        """Seed default safety tips for all categories"""
        try:
            created_count = 0
            
            for category_id, tips in DEFAULT_SAFETY_TIPS.items():
                if category_id == "default":
                    continue
                    
                # Check if tips already exist for this category
                existing = db.safety_tips.count_documents({"category_id": category_id})
                if existing > 0:
                    continue
                
                for idx, tip_text in enumerate(tips):
                    tip = {
                        "id": str(uuid.uuid4()),
                        "category_id": category_id,
                        "tip_text": tip_text,
                        "order": idx,
                        "is_active": True,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                        "created_by": current_user.get("email", "admin")
                    }
                    db.safety_tips.insert_one(tip)
                    created_count += 1
            
            return {"message": f"Seeded {created_count} default safety tips"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # Reorder tips for a category
    @router.put("/reorder/{category_id}")
    async def reorder_safety_tips(
        category_id: str,
        tip_ids: List[str],
        current_user: dict = Depends(require_admin)
    ):
        """Reorder safety tips for a category"""
        try:
            for idx, tip_id in enumerate(tip_ids):
                db.safety_tips.update_one(
                    {"id": tip_id, "category_id": category_id},
                    {"$set": {"order": idx, "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
            
            return {"message": "Safety tips reordered"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return router
