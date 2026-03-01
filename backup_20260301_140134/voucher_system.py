"""
Voucher and Discount System
Supports Amount, Percent, and Credit voucher types with rich restriction options
"""

import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum

logger = logging.getLogger(__name__)


class VoucherType(str, Enum):
    AMOUNT = "amount"      # Fixed amount discount
    PERCENT = "percent"    # Percentage discount
    CREDIT = "credit"      # Wallet credit boost


class VoucherStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    DEPLETED = "depleted"
    DISABLED = "disabled"


class VoucherCreate(BaseModel):
    code: str = Field(..., min_length=3, max_length=50)
    voucher_type: VoucherType
    value: float = Field(..., gt=0)
    description: Optional[str] = None
    
    # Usage limits
    max_uses: Optional[int] = None  # Total uses allowed (None = unlimited)
    max_uses_per_user: int = 1      # Uses per user
    
    # Value restrictions
    min_order_amount: Optional[float] = None  # Minimum order to apply
    max_discount_amount: Optional[float] = None  # Cap for percent discounts
    
    # Time restrictions
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    
    # User restrictions
    allowed_user_ids: Optional[List[str]] = None  # Specific users only
    new_users_only: bool = False  # Only for first-time buyers
    verified_users_only: bool = False
    premium_users_only: bool = False
    
    # Category restrictions
    allowed_categories: Optional[List[str]] = None
    excluded_categories: Optional[List[str]] = None
    
    # Other
    stackable: bool = False  # Can combine with other vouchers
    is_active: bool = True


class VoucherResponse(BaseModel):
    id: str
    code: str
    voucher_type: VoucherType
    value: float
    description: Optional[str]
    status: VoucherStatus
    total_uses: int
    max_uses: Optional[int]
    max_uses_per_user: int
    min_order_amount: Optional[float]
    max_discount_amount: Optional[float]
    valid_from: Optional[datetime]
    valid_until: Optional[datetime]
    created_at: datetime
    is_active: bool


class VoucherValidation(BaseModel):
    is_valid: bool
    message: str
    discount_amount: Optional[float] = None
    voucher_type: Optional[VoucherType] = None
    voucher_id: Optional[str] = None


def create_voucher_router(db, get_current_user):
    """Create voucher management router"""
    from fastapi import APIRouter, HTTPException, Request, Depends
    
    router = APIRouter(prefix="/vouchers", tags=["Vouchers"])
    
    async def require_auth(request: Request):
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        return user
    
    async def require_admin(request: Request):
        user = await require_auth(request)
        admin_emails = ["admin@marketplace.com", "admin@example.com"]
        if user.email not in admin_emails:
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    
    # =========================================================================
    # ADMIN ENDPOINTS
    # =========================================================================
    
    @router.post("/admin/create")
    async def create_voucher(data: VoucherCreate, admin = Depends(require_admin)):
        """Create a new voucher"""
        # Check if code already exists
        existing = await db.vouchers.find_one({"code": data.code.upper()})
        if existing:
            raise HTTPException(status_code=400, detail="Voucher code already exists")
        
        now = datetime.now(timezone.utc)
        voucher = {
            "id": str(uuid.uuid4()),
            "code": data.code.upper(),
            "voucher_type": data.voucher_type,
            "value": data.value,
            "description": data.description,
            "max_uses": data.max_uses,
            "max_uses_per_user": data.max_uses_per_user,
            "min_order_amount": data.min_order_amount,
            "max_discount_amount": data.max_discount_amount,
            "valid_from": data.valid_from or now,
            "valid_until": data.valid_until,
            "allowed_user_ids": data.allowed_user_ids,
            "new_users_only": data.new_users_only,
            "verified_users_only": data.verified_users_only,
            "premium_users_only": data.premium_users_only,
            "allowed_categories": data.allowed_categories,
            "excluded_categories": data.excluded_categories,
            "stackable": data.stackable,
            "is_active": data.is_active,
            "total_uses": 0,
            "created_by": admin.user_id,
            "created_at": now,
            "updated_at": now
        }
        
        await db.vouchers.insert_one(voucher)
        logger.info(f"Voucher created: {data.code} by {admin.email}")
        
        return {"message": "Voucher created successfully", "voucher_id": voucher["id"], "code": voucher["code"]}
    
    @router.get("/admin/list")
    async def list_vouchers(
        status: Optional[str] = None,
        voucher_type: Optional[str] = None,
        limit: int = 50,
        skip: int = 0,
        admin = Depends(require_admin)
    ):
        """List all vouchers"""
        query = {}
        if status:
            query["status"] = status
        if voucher_type:
            query["voucher_type"] = voucher_type
        
        cursor = db.vouchers.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
        vouchers = await cursor.to_list(length=limit)
        
        total = await db.vouchers.count_documents(query)
        
        # Calculate status for each voucher
        now = datetime.now(timezone.utc)
        for v in vouchers:
            v["status"] = _get_voucher_status(v, now)
        
        return {"vouchers": vouchers, "total": total}
    
    @router.get("/admin/{voucher_id}")
    async def get_voucher(voucher_id: str, admin = Depends(require_admin)):
        """Get voucher details"""
        voucher = await db.vouchers.find_one({"id": voucher_id}, {"_id": 0})
        if not voucher:
            raise HTTPException(status_code=404, detail="Voucher not found")
        
        # Get usage history
        usage_cursor = db.voucher_usage.find({"voucher_id": voucher_id}, {"_id": 0}).sort("used_at", -1).limit(50)
        usage = await usage_cursor.to_list(length=50)
        
        voucher["status"] = _get_voucher_status(voucher, datetime.now(timezone.utc))
        voucher["usage_history"] = usage
        
        return voucher
    
    @router.put("/admin/{voucher_id}")
    async def update_voucher(voucher_id: str, data: dict, admin = Depends(require_admin)):
        """Update voucher"""
        voucher = await db.vouchers.find_one({"id": voucher_id})
        if not voucher:
            raise HTTPException(status_code=404, detail="Voucher not found")
        
        # Fields that can be updated
        allowed_fields = [
            "description", "max_uses", "max_uses_per_user", "min_order_amount",
            "max_discount_amount", "valid_until", "allowed_user_ids", "new_users_only",
            "verified_users_only", "premium_users_only", "allowed_categories",
            "excluded_categories", "stackable", "is_active"
        ]
        
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        await db.vouchers.update_one({"id": voucher_id}, {"$set": update_data})
        
        return {"message": "Voucher updated successfully"}
    
    @router.delete("/admin/{voucher_id}")
    async def delete_voucher(voucher_id: str, admin = Depends(require_admin)):
        """Delete voucher"""
        result = await db.vouchers.delete_one({"id": voucher_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Voucher not found")
        
        return {"message": "Voucher deleted successfully"}
    
    @router.get("/admin/stats")
    async def get_voucher_stats(admin = Depends(require_admin)):
        """Get voucher statistics"""
        now = datetime.now(timezone.utc)
        
        total = await db.vouchers.count_documents({})
        active = await db.vouchers.count_documents({"is_active": True, "$or": [{"valid_until": None}, {"valid_until": {"$gt": now}}]})
        
        # Total redemptions
        total_redemptions = await db.voucher_usage.count_documents({})
        
        # Total discount given
        pipeline = [
            {"$group": {"_id": None, "total": {"$sum": "$discount_amount"}}}
        ]
        result = await db.voucher_usage.aggregate(pipeline).to_list(length=1)
        total_discount = result[0]["total"] if result else 0
        
        # By type
        type_stats = await db.vouchers.aggregate([
            {"$group": {"_id": "$voucher_type", "count": {"$sum": 1}}}
        ]).to_list(length=10)
        
        return {
            "total_vouchers": total,
            "active_vouchers": active,
            "total_redemptions": total_redemptions,
            "total_discount_given": total_discount,
            "by_type": {t["_id"]: t["count"] for t in type_stats}
        }
    
    # =========================================================================
    # USER ENDPOINTS
    # =========================================================================
    
    @router.post("/validate")
    async def validate_voucher(request: Request, user = Depends(require_auth)):
        """Validate a voucher code"""
        data = await request.json()
        code = data.get("code", "").upper()
        order_amount = data.get("order_amount", 0)
        category_ids = data.get("category_ids", [])
        
        if not code:
            return VoucherValidation(is_valid=False, message="Voucher code is required")
        
        voucher = await db.vouchers.find_one({"code": code})
        if not voucher:
            return VoucherValidation(is_valid=False, message="Invalid voucher code")
        
        # Validate voucher
        validation = await _validate_voucher(db, voucher, user, order_amount, category_ids)
        return validation
    
    @router.post("/apply")
    async def apply_voucher(request: Request, user = Depends(require_auth)):
        """Apply a voucher to get discount (for checkout)"""
        data = await request.json()
        code = data.get("code", "").upper()
        order_amount = data.get("order_amount", 0)
        order_id = data.get("order_id")
        category_ids = data.get("category_ids", [])
        
        voucher = await db.vouchers.find_one({"code": code})
        if not voucher:
            raise HTTPException(status_code=400, detail="Invalid voucher code")
        
        validation = await _validate_voucher(db, voucher, user, order_amount, category_ids)
        if not validation.is_valid:
            raise HTTPException(status_code=400, detail=validation.message)
        
        # Record usage
        now = datetime.now(timezone.utc)
        await db.voucher_usage.insert_one({
            "id": str(uuid.uuid4()),
            "voucher_id": voucher["id"],
            "voucher_code": code,
            "user_id": user.user_id,
            "order_id": order_id,
            "order_amount": order_amount,
            "discount_amount": validation.discount_amount,
            "voucher_type": voucher["voucher_type"],
            "used_at": now
        })
        
        # Update voucher usage count
        await db.vouchers.update_one(
            {"id": voucher["id"]},
            {"$inc": {"total_uses": 1}}
        )
        
        # If credit voucher, add to user's wallet
        if voucher["voucher_type"] == VoucherType.CREDIT:
            await db.users.update_one(
                {"user_id": user.user_id},
                {"$inc": {"wallet_balance": voucher["value"]}}
            )
            logger.info(f"Added {voucher['value']} credits to user {user.user_id}")
        
        return {
            "success": True,
            "discount_amount": validation.discount_amount,
            "voucher_type": voucher["voucher_type"],
            "message": f"Voucher applied! {'Credits added to wallet.' if voucher['voucher_type'] == VoucherType.CREDIT else f'Discount: ${validation.discount_amount:.2f}'}"
        }
    
    @router.get("/my-usage")
    async def get_my_voucher_usage(user = Depends(require_auth)):
        """Get user's voucher usage history"""
        cursor = db.voucher_usage.find({"user_id": user.user_id}, {"_id": 0}).sort("used_at", -1).limit(50)
        usage = await cursor.to_list(length=50)
        return {"usage": usage}
    
    return router


def _get_voucher_status(voucher: dict, now: datetime) -> str:
    """Determine voucher status"""
    if not voucher.get("is_active"):
        return VoucherStatus.DISABLED
    
    if voucher.get("valid_until") and voucher["valid_until"] < now:
        return VoucherStatus.EXPIRED
    
    if voucher.get("max_uses") and voucher.get("total_uses", 0) >= voucher["max_uses"]:
        return VoucherStatus.DEPLETED
    
    return VoucherStatus.ACTIVE


async def _validate_voucher(db, voucher: dict, user, order_amount: float, category_ids: List[str]) -> VoucherValidation:
    """Validate voucher against all restrictions"""
    now = datetime.now(timezone.utc)
    
    # Check if active
    if not voucher.get("is_active"):
        return VoucherValidation(is_valid=False, message="This voucher is no longer active")
    
    # Check time validity
    if voucher.get("valid_from") and voucher["valid_from"] > now:
        return VoucherValidation(is_valid=False, message="This voucher is not yet valid")
    
    if voucher.get("valid_until") and voucher["valid_until"] < now:
        return VoucherValidation(is_valid=False, message="This voucher has expired")
    
    # Check total uses
    if voucher.get("max_uses") and voucher.get("total_uses", 0) >= voucher["max_uses"]:
        return VoucherValidation(is_valid=False, message="This voucher has reached its usage limit")
    
    # Check user's usage
    user_usage = await db.voucher_usage.count_documents({
        "voucher_id": voucher["id"],
        "user_id": user.user_id
    })
    if user_usage >= voucher.get("max_uses_per_user", 1):
        return VoucherValidation(is_valid=False, message="You have already used this voucher")
    
    # Check user restrictions
    if voucher.get("allowed_user_ids") and user.user_id not in voucher["allowed_user_ids"]:
        return VoucherValidation(is_valid=False, message="This voucher is not available for your account")
    
    if voucher.get("new_users_only"):
        order_count = await db.orders.count_documents({"buyer_id": user.user_id, "status": "completed"})
        if order_count > 0:
            return VoucherValidation(is_valid=False, message="This voucher is only for new users")
    
    if voucher.get("verified_users_only") and not getattr(user, "is_verified", False):
        return VoucherValidation(is_valid=False, message="This voucher is only for verified users")
    
    if voucher.get("premium_users_only") and not getattr(user, "is_premium", False):
        return VoucherValidation(is_valid=False, message="This voucher is only for premium users")
    
    # Check minimum order amount
    if voucher.get("min_order_amount") and order_amount < voucher["min_order_amount"]:
        return VoucherValidation(
            is_valid=False, 
            message=f"Minimum order amount is ${voucher['min_order_amount']:.2f}"
        )
    
    # Check category restrictions
    if voucher.get("allowed_categories") and category_ids:
        if not any(cat in voucher["allowed_categories"] for cat in category_ids):
            return VoucherValidation(is_valid=False, message="This voucher is not valid for these categories")
    
    if voucher.get("excluded_categories") and category_ids:
        if any(cat in voucher["excluded_categories"] for cat in category_ids):
            return VoucherValidation(is_valid=False, message="This voucher cannot be used for these categories")
    
    # Calculate discount
    discount_amount = 0
    if voucher["voucher_type"] == VoucherType.AMOUNT:
        discount_amount = min(voucher["value"], order_amount)
    elif voucher["voucher_type"] == VoucherType.PERCENT:
        discount_amount = order_amount * (voucher["value"] / 100)
        if voucher.get("max_discount_amount"):
            discount_amount = min(discount_amount, voucher["max_discount_amount"])
    elif voucher["voucher_type"] == VoucherType.CREDIT:
        discount_amount = voucher["value"]  # Credit amount to add to wallet
    
    return VoucherValidation(
        is_valid=True,
        message="Voucher is valid",
        discount_amount=round(discount_amount, 2),
        voucher_type=voucher["voucher_type"],
        voucher_id=voucher["id"]
    )
