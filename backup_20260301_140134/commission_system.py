"""
Dynamic Commission Settings System

Features:
- Category-based commission rates
- Verification tier discounts
- Min/Max commission bounds
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from fastapi import APIRouter, HTTPException, Query, Body, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class CategoryCommission(BaseModel):
    category_id: str
    category_name: str
    commission_percentage: float = Field(ge=0, le=50)
    min_commission: float = Field(default=0, ge=0)
    max_commission: Optional[float] = Field(default=None, ge=0)


class VerificationDiscount(BaseModel):
    tier: str
    discount_percentage: float = Field(ge=0, le=100)


class CommissionConfig(BaseModel):
    default_commission: float = Field(default=5.0, ge=0, le=50)
    category_commissions: List[CategoryCommission] = []
    verification_discounts: List[VerificationDiscount] = []


class CommissionService:
    """Service for managing commission settings"""
    
    DEFAULT_CONFIG = {
        "id": "global_commission_config",
        "default_commission": 5.0,
        "category_commissions": [],
        "verification_discounts": [
            {"tier": "unverified", "discount_percentage": 0},
            {"tier": "verified_user", "discount_percentage": 0},
            {"tier": "verified_seller", "discount_percentage": 10},
            {"tier": "premium_verified_seller", "discount_percentage": 25},
        ],
        "min_global_commission": 0.50,
        "max_global_commission": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.commission_config = db.commission_config
        self.categories = db.categories
    
    async def initialize(self):
        """Initialize default commission config if not exists"""
        existing = await self.commission_config.find_one({"id": "global_commission_config"})
        if not existing:
            await self.commission_config.insert_one(self.DEFAULT_CONFIG.copy())
            logger.info("Initialized default commission configuration")
    
    async def get_config(self) -> Dict:
        """Get current commission configuration"""
        config = await self.commission_config.find_one(
            {"id": "global_commission_config"},
            {"_id": 0}
        )
        if not config:
            await self.initialize()
            config = await self.commission_config.find_one(
                {"id": "global_commission_config"},
                {"_id": 0}
            )
        return config
    
    async def update_default_commission(self, percentage: float) -> Dict:
        """Update the default commission percentage"""
        if percentage < 0 or percentage > 50:
            raise HTTPException(status_code=400, detail="Commission must be between 0 and 50%")
        
        await self.commission_config.update_one(
            {"id": "global_commission_config"},
            {"$set": {
                "default_commission": percentage,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return await self.get_config()
    
    async def set_category_commission(
        self,
        category_id: str,
        commission_percentage: float,
        min_commission: float = 0,
        max_commission: float = None
    ) -> Dict:
        """Set commission rate for a specific category"""
        # Verify category exists
        category = await self.categories.find_one({"id": category_id})
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        config = await self.get_config()
        category_commissions = config.get("category_commissions", [])
        
        # Update or add
        found = False
        for i, cc in enumerate(category_commissions):
            if cc["category_id"] == category_id:
                category_commissions[i] = {
                    "category_id": category_id,
                    "category_name": category.get("name", category_id),
                    "commission_percentage": commission_percentage,
                    "min_commission": min_commission,
                    "max_commission": max_commission
                }
                found = True
                break
        
        if not found:
            category_commissions.append({
                "category_id": category_id,
                "category_name": category.get("name", category_id),
                "commission_percentage": commission_percentage,
                "min_commission": min_commission,
                "max_commission": max_commission
            })
        
        await self.commission_config.update_one(
            {"id": "global_commission_config"},
            {"$set": {
                "category_commissions": category_commissions,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return await self.get_config()
    
    async def remove_category_commission(self, category_id: str) -> Dict:
        """Remove custom commission for a category (reverts to default)"""
        await self.commission_config.update_one(
            {"id": "global_commission_config"},
            {
                "$pull": {"category_commissions": {"category_id": category_id}},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        return await self.get_config()
    
    async def set_verification_discount(self, tier: str, discount_percentage: float) -> Dict:
        """Set commission discount for a verification tier"""
        if discount_percentage < 0 or discount_percentage > 100:
            raise HTTPException(status_code=400, detail="Discount must be between 0 and 100%")
        
        valid_tiers = ["unverified", "verified_user", "verified_seller", "premium_verified_seller"]
        if tier not in valid_tiers:
            raise HTTPException(status_code=400, detail=f"Invalid tier. Must be one of: {valid_tiers}")
        
        config = await self.get_config()
        verification_discounts = config.get("verification_discounts", [])
        
        # Update or add
        found = False
        for i, vd in enumerate(verification_discounts):
            if vd["tier"] == tier:
                verification_discounts[i] = {
                    "tier": tier,
                    "discount_percentage": discount_percentage
                }
                found = True
                break
        
        if not found:
            verification_discounts.append({
                "tier": tier,
                "discount_percentage": discount_percentage
            })
        
        await self.commission_config.update_one(
            {"id": "global_commission_config"},
            {"$set": {
                "verification_discounts": verification_discounts,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return await self.get_config()
    
    async def calculate_commission(
        self,
        amount: float,
        category_id: str = None,
        seller_verification_tier: str = "unverified"
    ) -> Dict:
        """Calculate commission for a transaction"""
        config = await self.get_config()
        
        # Get base commission rate
        base_rate = config.get("default_commission", 5.0)
        
        # Check for category-specific rate
        if category_id:
            for cc in config.get("category_commissions", []):
                if cc["category_id"] == category_id:
                    base_rate = cc["commission_percentage"]
                    break
        
        # Apply verification discount
        discount = 0
        for vd in config.get("verification_discounts", []):
            if vd["tier"] == seller_verification_tier:
                discount = vd["discount_percentage"]
                break
        
        # Calculate effective rate
        effective_rate = base_rate * (1 - discount / 100)
        
        # Calculate commission
        commission = amount * (effective_rate / 100)
        
        # Apply min/max bounds
        min_commission = config.get("min_global_commission", 0)
        max_commission = config.get("max_global_commission")
        
        if commission < min_commission:
            commission = min_commission
        if max_commission and commission > max_commission:
            commission = max_commission
        
        return {
            "amount": amount,
            "base_rate": base_rate,
            "verification_tier": seller_verification_tier,
            "discount_percentage": discount,
            "effective_rate": effective_rate,
            "commission": round(commission, 2),
            "seller_receives": round(amount - commission, 2)
        }
    
    async def get_categories_with_commission(self) -> List[Dict]:
        """Get all categories with their commission rates"""
        config = await self.get_config()
        categories = await self.categories.find({}, {"_id": 0}).to_list(1000)
        
        # Create map of custom commissions
        custom_commissions = {
            cc["category_id"]: cc 
            for cc in config.get("category_commissions", [])
        }
        
        result = []
        for cat in categories:
            custom = custom_commissions.get(cat["id"])
            result.append({
                "id": cat["id"],
                "name": cat.get("name", cat["id"]),
                "icon": cat.get("icon"),
                "commission_percentage": custom["commission_percentage"] if custom else config["default_commission"],
                "min_commission": custom.get("min_commission", 0) if custom else 0,
                "max_commission": custom.get("max_commission") if custom else None,
                "is_custom": custom is not None
            })
        
        return result


def create_commission_router(db: AsyncIOMotorDatabase, require_admin):
    """Create commission settings API router for admin dashboard"""
    router = APIRouter(prefix="/commission", tags=["Commission Settings"])
    service = CommissionService(db)
    
    @router.get("/config")
    async def get_config(admin = Depends(require_admin)):
        """Get current commission configuration"""
        return await service.get_config()
    
    @router.put("/config/default")
    async def update_default_commission(
        percentage: float = Body(..., embed=True),
        admin = Depends(require_admin)
    ):
        """Update default commission percentage"""
        return await service.update_default_commission(percentage)
    
    @router.get("/categories")
    async def get_categories_with_commission(admin = Depends(require_admin)):
        """Get all categories with their commission rates"""
        return await service.get_categories_with_commission()
    
    @router.put("/categories/{category_id}")
    async def set_category_commission(
        category_id: str,
        commission_percentage: float = Body(...),
        min_commission: float = Body(0),
        max_commission: float = Body(None),
        admin = Depends(require_admin)
    ):
        """Set commission rate for a category"""
        return await service.set_category_commission(
            category_id, commission_percentage, min_commission, max_commission
        )
    
    @router.delete("/categories/{category_id}")
    async def remove_category_commission(
        category_id: str,
        admin = Depends(require_admin)
    ):
        """Remove custom commission for a category"""
        return await service.remove_category_commission(category_id)
    
    @router.put("/verification-discounts/{tier}")
    async def set_verification_discount(
        tier: str,
        discount_percentage: float = Body(..., embed=True),
        admin = Depends(require_admin)
    ):
        """Set commission discount for a verification tier"""
        return await service.set_verification_discount(tier, discount_percentage)
    
    @router.post("/calculate")
    async def calculate_commission(
        amount: float = Body(...),
        category_id: str = Body(None),
        seller_verification_tier: str = Body("unverified"),
        admin = Depends(require_admin)
    ):
        """Calculate commission for a transaction (preview)"""
        return await service.calculate_commission(amount, category_id, seller_verification_tier)
    
    return router, service
