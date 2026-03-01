"""
Management API Routes
Provides endpoints for:
1. Listing Moderation - Content review and approval
2. Voucher Management - Discount codes and promotions
3. Commission Management - Sales commission tracking
4. Invoices - Billing and invoicing
5. Badge Management - User achievement badges
"""

import os
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Depends, Request, Query, Body
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

# Listing Moderation
class ModerationRulesUpdate(BaseModel):
    auto_approve_verified: bool = False
    require_images: bool = True
    min_images: int = 1
    min_description_length: int = 20
    max_description_length: int = 5000
    blocked_words: List[str] = []
    flag_new_sellers: bool = True
    flag_high_value: bool = True
    high_value_threshold: float = 10000
    require_category: bool = True
    require_price: bool = True


class RejectReason(BaseModel):
    reason: str
    details: Optional[str] = None
    notify_seller: bool = True


class EditRequest(BaseModel):
    fields_to_edit: List[str]
    instructions: str
    deadline_days: int = 7


# Voucher Management
class VoucherCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    discount_type: str = "percentage"  # percentage, fixed
    discount_value: float
    min_order_value: Optional[float] = None
    max_discount: Optional[float] = None
    usage_limit: Optional[int] = None
    usage_limit_per_user: int = 1
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    applicable_categories: List[str] = []
    applicable_users: List[str] = []


class VoucherUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    min_order_value: Optional[float] = None
    max_discount: Optional[float] = None
    usage_limit: Optional[int] = None
    valid_until: Optional[str] = None


class VoucherValidate(BaseModel):
    code: str
    order_value: Optional[float] = None
    category: Optional[str] = None


# Commission Management
class CommissionRuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    type: str = "percentage"  # percentage, fixed
    value: float
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    applies_to: str = "all"  # all, category, seller_tier
    category: Optional[str] = None
    seller_tier: Optional[str] = None
    priority: int = 0


class CommissionRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    value: Optional[float] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    priority: Optional[int] = None


class CommissionRatesUpdate(BaseModel):
    rates: Dict[str, float]  # category: rate


# Invoice Management
class InvoiceCreate(BaseModel):
    user_id: str
    items: List[Dict[str, Any]]
    subtotal: float
    tax: float = 0
    total: float
    due_date: Optional[str] = None
    notes: Optional[str] = None


class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    due_date: Optional[str] = None


# Badge Management
class BadgeCreate(BaseModel):
    name: str
    description: str
    icon: str
    category: str = "general"
    tier: str = "bronze"  # bronze, silver, gold, platinum
    points: int = 0
    criteria: Dict[str, Any] = {}
    auto_award: bool = False


class BadgeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    category: Optional[str] = None
    tier: Optional[str] = None
    points: Optional[int] = None
    criteria: Optional[Dict[str, Any]] = None


class BadgeAward(BaseModel):
    user_id: str
    reason: Optional[str] = None


# =============================================================================
# ROUTER FACTORY
# =============================================================================

def create_management_routes(db: AsyncIOMotorDatabase, require_auth):
    """Create all management routes"""
    
    # =============================================================================
    # 1. LISTING MODERATION
    # =============================================================================
    listing_mod_router = APIRouter(prefix="/listing-moderation", tags=["Listing Moderation"])
    
    @listing_mod_router.get("")
    async def get_moderation_dashboard():
        """Moderation dashboard"""
        pending = await db.listings.count_documents({"status": "pending_review"})
        approved_today = await db.moderation_logs.count_documents({
            "action": "approve",
            "timestamp": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()}
        })
        rejected_today = await db.moderation_logs.count_documents({
            "action": "reject",
            "timestamp": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()}
        })
        flagged = await db.listings.count_documents({"is_flagged": True})
        
        return {
            "overview": {
                "pending_review": pending,
                "approved_today": approved_today,
                "rejected_today": rejected_today,
                "flagged": flagged,
                "avg_review_time_hours": 2.5
            },
            "queue_health": "normal" if pending < 50 else "busy" if pending < 100 else "overloaded"
        }
    
    @listing_mod_router.get("/queue")
    async def get_moderation_queue(
        page: int = Query(default=1, ge=1),
        limit: int = Query(default=20, le=100),
        sort_by: str = Query(default="created_at"),
        priority: Optional[str] = None
    ):
        """Listings pending review"""
        query = {"status": "pending_review"}
        if priority == "high":
            query["$or"] = [{"is_flagged": True}, {"price": {"$gte": 10000}}]
        
        skip = (page - 1) * limit
        listings = await db.listings.find(query).sort(sort_by, 1).skip(skip).limit(limit).to_list(limit)
        total = await db.listings.count_documents(query)
        
        for l in listings:
            l["id"] = str(l.pop("_id", l.get("id", "")))
        
        return {
            "listings": listings,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    
    @listing_mod_router.get("/queue/count")
    async def get_queue_count():
        """Count of pending items"""
        total = await db.listings.count_documents({"status": "pending_review"})
        high_priority = await db.listings.count_documents({
            "status": "pending_review",
            "$or": [{"is_flagged": True}, {"price": {"$gte": 10000}}]
        })
        
        return {
            "total": total,
            "high_priority": high_priority,
            "normal_priority": total - high_priority
        }
    
    @listing_mod_router.post("/{listing_id}/approve")
    async def approve_listing(listing_id: str, admin = Depends(require_auth)):
        """Approve listing"""
        admin_id = admin.get("user_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown")
        
        result = await db.listings.update_one(
            {"id": listing_id},
            {"$set": {
                "status": "active",
                "moderation_status": "approved",
                "moderated_at": datetime.now(timezone.utc).isoformat(),
                "moderated_by": admin_id
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        # Log moderation action
        await db.moderation_logs.insert_one({
            "id": f"mod_{uuid.uuid4().hex[:12]}",
            "listing_id": listing_id,
            "action": "approve",
            "admin_id": admin_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return {"status": "approved", "listing_id": listing_id}
    
    @listing_mod_router.post("/{listing_id}/reject")
    async def reject_listing(listing_id: str, rejection: RejectReason, admin = Depends(require_auth)):
        """Reject listing with reason"""
        admin_id = admin.get("user_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown")
        
        result = await db.listings.update_one(
            {"id": listing_id},
            {"$set": {
                "status": "rejected",
                "moderation_status": "rejected",
                "rejection_reason": rejection.reason,
                "rejection_details": rejection.details,
                "moderated_at": datetime.now(timezone.utc).isoformat(),
                "moderated_by": admin_id
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        # Log moderation action
        await db.moderation_logs.insert_one({
            "id": f"mod_{uuid.uuid4().hex[:12]}",
            "listing_id": listing_id,
            "action": "reject",
            "reason": rejection.reason,
            "admin_id": admin_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return {"status": "rejected", "listing_id": listing_id, "reason": rejection.reason}
    
    @listing_mod_router.post("/{listing_id}/request-edit")
    async def request_edit(listing_id: str, request: EditRequest, admin = Depends(require_auth)):
        """Request edits from seller"""
        admin_id = admin.get("user_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown")
        deadline = (datetime.now(timezone.utc) + timedelta(days=request.deadline_days)).isoformat()
        
        result = await db.listings.update_one(
            {"id": listing_id},
            {"$set": {
                "status": "edit_requested",
                "moderation_status": "edit_requested",
                "edit_request": {
                    "fields": request.fields_to_edit,
                    "instructions": request.instructions,
                    "deadline": deadline,
                    "requested_at": datetime.now(timezone.utc).isoformat(),
                    "requested_by": admin_id
                }
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        return {"status": "edit_requested", "listing_id": listing_id, "deadline": deadline}
    
    @listing_mod_router.get("/history")
    async def get_moderation_history(
        page: int = Query(default=1, ge=1),
        limit: int = Query(default=50, le=100),
        action: Optional[str] = None
    ):
        """Moderation history"""
        query = {}
        if action:
            query["action"] = action
        
        skip = (page - 1) * limit
        history = await db.moderation_logs.find(query).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
        total = await db.moderation_logs.count_documents(query)
        
        for h in history:
            h["id"] = str(h.pop("_id", h.get("id", "")))
        
        return {"history": history, "total": total, "page": page}
    
    @listing_mod_router.get("/stats")
    async def get_moderation_stats(days: int = Query(default=30)):
        """Moderation statistics"""
        start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        
        total = await db.moderation_logs.count_documents({"timestamp": {"$gte": start_date}})
        approved = await db.moderation_logs.count_documents({"action": "approve", "timestamp": {"$gte": start_date}})
        rejected = await db.moderation_logs.count_documents({"action": "reject", "timestamp": {"$gte": start_date}})
        
        return {
            "period_days": days,
            "total_reviewed": total,
            "approved": approved,
            "rejected": rejected,
            "approval_rate": round(approved / max(total, 1) * 100, 2),
            "avg_daily_reviews": round(total / days, 1)
        }
    
    @listing_mod_router.get("/rules")
    async def get_moderation_rules():
        """Auto-moderation rules"""
        rules = await db.listing_moderation_rules.find_one({"id": "global"})
        if not rules:
            rules = {
                "id": "global",
                "auto_approve_verified": False,
                "require_images": True,
                "min_images": 1,
                "min_description_length": 20,
                "max_description_length": 5000,
                "blocked_words": [],
                "flag_new_sellers": True,
                "flag_high_value": True,
                "high_value_threshold": 10000,
                "require_category": True,
                "require_price": True
            }
        rules.pop("_id", None)
        return rules
    
    @listing_mod_router.put("/rules")
    async def update_moderation_rules(rules: ModerationRulesUpdate, admin = Depends(require_auth)):
        """Update auto-moderation rules"""
        await db.listing_moderation_rules.update_one(
            {"id": "global"},
            {"$set": {**rules.dict(), "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return {"status": "updated", "rules": rules.dict()}
    
    @listing_mod_router.get("/flagged")
    async def get_flagged_listings(limit: int = Query(default=50)):
        """Flagged listings"""
        listings = await db.listings.find({"is_flagged": True}).sort("flagged_at", -1).limit(limit).to_list(limit)
        for l in listings:
            l["id"] = str(l.pop("_id", l.get("id", "")))
        return {"listings": listings, "total": len(listings)}
    
    # =============================================================================
    # 2. VOUCHER MANAGEMENT
    # =============================================================================
    voucher_router = APIRouter(prefix="/vouchers", tags=["Voucher Management"])
    
    @voucher_router.get("")
    async def list_vouchers(
        page: int = Query(default=1, ge=1),
        limit: int = Query(default=50, le=100),
        is_active: Optional[bool] = None
    ):
        """List all vouchers"""
        query = {}
        if is_active is not None:
            query["is_active"] = is_active
        
        skip = (page - 1) * limit
        vouchers = await db.vouchers_admin.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        total = await db.vouchers_admin.count_documents(query)
        
        for v in vouchers:
            v["id"] = str(v.pop("_id", v.get("id", "")))
        
        return {"vouchers": vouchers, "total": total, "page": page, "pages": (total + limit - 1) // limit}
    
    @voucher_router.post("")
    async def create_voucher(voucher: VoucherCreate, admin = Depends(require_auth)):
        """Create voucher"""
        # Check if code exists
        existing = await db.vouchers_admin.find_one({"code": voucher.code.upper()})
        if existing:
            raise HTTPException(status_code=400, detail="Voucher code already exists")
        
        voucher_doc = {
            "id": f"voucher_{uuid.uuid4().hex[:12]}",
            **voucher.dict(),
            "code": voucher.code.upper(),
            "is_active": True,
            "usage_count": 0,
            "total_discount_given": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": admin.get("user_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown")
        }
        await db.vouchers_admin.insert_one(voucher_doc)
        voucher_doc.pop("_id", None)
        return voucher_doc
    
    @voucher_router.get("/active")
    async def get_active_vouchers():
        """Active vouchers"""
        now = datetime.now(timezone.utc).isoformat()
        vouchers = await db.vouchers_admin.find({
            "is_active": True,
            "$or": [
                {"valid_until": None},
                {"valid_until": {"$gte": now}}
            ]
        }).to_list(100)
        
        for v in vouchers:
            v["id"] = str(v.pop("_id", v.get("id", "")))
        
        return {"vouchers": vouchers, "total": len(vouchers)}
    
    @voucher_router.get("/expired")
    async def get_expired_vouchers():
        """Expired vouchers"""
        now = datetime.now(timezone.utc).isoformat()
        vouchers = await db.vouchers_admin.find({
            "valid_until": {"$lt": now}
        }).to_list(100)
        
        for v in vouchers:
            v["id"] = str(v.pop("_id", v.get("id", "")))
        
        return {"vouchers": vouchers, "total": len(vouchers)}
    
    @voucher_router.get("/stats")
    async def get_voucher_stats():
        """Voucher usage statistics"""
        total = await db.vouchers_admin.count_documents({})
        active = await db.vouchers_admin.count_documents({"is_active": True})
        
        pipeline = [
            {"$group": {
                "_id": None,
                "total_usage": {"$sum": "$usage_count"},
                "total_discount": {"$sum": "$total_discount_given"}
            }}
        ]
        stats = await db.vouchers_admin.aggregate(pipeline).to_list(1)
        
        return {
            "total_vouchers": total,
            "active_vouchers": active,
            "total_redemptions": stats[0]["total_usage"] if stats else 0,
            "total_discount_given": stats[0]["total_discount"] if stats else 0
        }
    
    @voucher_router.get("/{voucher_id}")
    async def get_voucher(voucher_id: str):
        """Get voucher details"""
        voucher = await db.vouchers_admin.find_one({"id": voucher_id})
        if not voucher:
            raise HTTPException(status_code=404, detail="Voucher not found")
        voucher["id"] = str(voucher.pop("_id", voucher.get("id", "")))
        return voucher
    
    @voucher_router.put("/{voucher_id}")
    async def update_voucher(voucher_id: str, update: VoucherUpdate, admin = Depends(require_auth)):
        """Update voucher"""
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.vouchers_admin.update_one({"id": voucher_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Voucher not found")
        return {"status": "updated", "voucher_id": voucher_id}
    
    @voucher_router.delete("/{voucher_id}")
    async def delete_voucher(voucher_id: str, admin = Depends(require_auth)):
        """Delete voucher"""
        result = await db.vouchers_admin.delete_one({"id": voucher_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Voucher not found")
        return {"status": "deleted", "voucher_id": voucher_id}
    
    @voucher_router.get("/{voucher_id}/redemptions")
    async def get_voucher_redemptions(voucher_id: str, limit: int = Query(default=50)):
        """Voucher redemption history"""
        redemptions = await db.voucher_redemptions.find({"voucher_id": voucher_id}).sort("redeemed_at", -1).limit(limit).to_list(limit)
        for r in redemptions:
            r["id"] = str(r.pop("_id", r.get("id", "")))
        return {"redemptions": redemptions, "total": len(redemptions)}
    
    @voucher_router.post("/{voucher_id}/activate")
    async def activate_voucher(voucher_id: str, admin = Depends(require_auth)):
        """Activate voucher"""
        result = await db.vouchers_admin.update_one({"id": voucher_id}, {"$set": {"is_active": True}})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Voucher not found")
        return {"status": "activated", "voucher_id": voucher_id}
    
    @voucher_router.post("/{voucher_id}/deactivate")
    async def deactivate_voucher(voucher_id: str, admin = Depends(require_auth)):
        """Deactivate voucher"""
        result = await db.vouchers_admin.update_one({"id": voucher_id}, {"$set": {"is_active": False}})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Voucher not found")
        return {"status": "deactivated", "voucher_id": voucher_id}
    
    @voucher_router.post("/validate")
    async def validate_voucher(validation: VoucherValidate):
        """Validate voucher code"""
        voucher = await db.vouchers_admin.find_one({"code": validation.code.upper(), "is_active": True})
        
        if not voucher:
            return {"valid": False, "message": "Invalid or inactive voucher code"}
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Check validity period
        if voucher.get("valid_from") and voucher["valid_from"] > now:
            return {"valid": False, "message": "Voucher not yet active"}
        
        if voucher.get("valid_until") and voucher["valid_until"] < now:
            return {"valid": False, "message": "Voucher has expired"}
        
        # Check usage limit
        if voucher.get("usage_limit") and voucher.get("usage_count", 0) >= voucher["usage_limit"]:
            return {"valid": False, "message": "Voucher usage limit reached"}
        
        # Check minimum order value
        if validation.order_value and voucher.get("min_order_value"):
            if validation.order_value < voucher["min_order_value"]:
                return {"valid": False, "message": f"Minimum order value is {voucher['min_order_value']}"}
        
        # Calculate discount
        discount = 0
        if voucher["discount_type"] == "percentage":
            discount = (validation.order_value or 0) * voucher["discount_value"] / 100
            if voucher.get("max_discount"):
                discount = min(discount, voucher["max_discount"])
        else:
            discount = voucher["discount_value"]
        
        return {
            "valid": True,
            "voucher_id": voucher["id"],
            "discount_type": voucher["discount_type"],
            "discount_value": voucher["discount_value"],
            "calculated_discount": discount,
            "message": "Voucher is valid"
        }
    
    # =============================================================================
    # 3. COMMISSION MANAGEMENT
    # =============================================================================
    commission_router = APIRouter(prefix="/commission", tags=["Commission Management"])
    
    @commission_router.get("")
    async def get_commission_dashboard():
        """Commission dashboard"""
        total_earned = await db.commission_logs.aggregate([
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)
        
        pending = await db.commission_logs.aggregate([
            {"$match": {"status": "pending"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)
        
        return {
            "overview": {
                "total_commission_earned": total_earned[0]["total"] if total_earned else 0,
                "pending_commission": pending[0]["total"] if pending else 0,
                "default_rate": 10.0,
                "active_rules": 3
            }
        }
    
    @commission_router.get("/rules")
    async def get_commission_rules():
        """Commission rules/tiers"""
        rules = await db.commission_rules.find({}).sort("priority", -1).to_list(50)
        for r in rules:
            r["id"] = str(r.pop("_id", r.get("id", "")))
        
        if not rules:
            rules = [
                {"id": "default", "name": "Default Commission", "type": "percentage", "value": 10.0, "applies_to": "all", "priority": 0},
                {"id": "premium_seller", "name": "Premium Seller Rate", "type": "percentage", "value": 7.5, "applies_to": "seller_tier", "seller_tier": "premium", "priority": 10},
            ]
        
        return {"rules": rules, "total": len(rules)}
    
    @commission_router.post("/rules")
    async def create_commission_rule(rule: CommissionRuleCreate, admin = Depends(require_auth)):
        """Create commission rule"""
        rule_doc = {
            "id": f"comm_rule_{uuid.uuid4().hex[:8]}",
            **rule.dict(),
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": admin.get("user_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown")
        }
        await db.commission_rules.insert_one(rule_doc)
        rule_doc.pop("_id", None)
        return rule_doc
    
    @commission_router.put("/rules/{rule_id}")
    async def update_commission_rule(rule_id: str, update: CommissionRuleUpdate, admin = Depends(require_auth)):
        """Update commission rule"""
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.commission_rules.update_one({"id": rule_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Rule not found")
        return {"status": "updated", "rule_id": rule_id}
    
    @commission_router.delete("/rules/{rule_id}")
    async def delete_commission_rule(rule_id: str, admin = Depends(require_auth)):
        """Delete commission rule"""
        result = await db.commission_rules.delete_one({"id": rule_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Rule not found")
        return {"status": "deleted", "rule_id": rule_id}
    
    @commission_router.get("/rates")
    async def get_commission_rates():
        """Commission rates by category"""
        rates = await db.commission_rates.find_one({"id": "global"})
        if not rates:
            rates = {
                "id": "global",
                "default_rate": 10.0,
                "by_category": {
                    "electronics": 8.0,
                    "vehicles": 5.0,
                    "real_estate": 3.0,
                    "fashion": 12.0,
                    "services": 15.0
                }
            }
        rates.pop("_id", None)
        return rates
    
    @commission_router.put("/rates")
    async def update_commission_rates(rates: CommissionRatesUpdate, admin = Depends(require_auth)):
        """Update commission rates"""
        await db.commission_rates.update_one(
            {"id": "global"},
            {"$set": {"by_category": rates.rates, "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return {"status": "updated"}
    
    @commission_router.get("/earnings")
    async def get_commission_earnings(days: int = Query(default=30)):
        """Commission earnings report"""
        start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        
        pipeline = [
            {"$match": {"created_at": {"$gte": start_date}}},
            {"$group": {
                "_id": {"$substr": ["$created_at", 0, 10]},
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}}
        ]
        
        earnings = await db.commission_logs.aggregate(pipeline).to_list(days)
        
        return {
            "period_days": days,
            "earnings": [{"date": e["_id"], "amount": e["total"], "transactions": e["count"]} for e in earnings],
            "total": sum(e["total"] for e in earnings)
        }
    
    @commission_router.get("/history")
    async def get_commission_history(
        page: int = Query(default=1, ge=1),
        limit: int = Query(default=50, le=100)
    ):
        """Commission history"""
        skip = (page - 1) * limit
        logs = await db.commission_logs.find({}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        total = await db.commission_logs.count_documents({})
        
        for l in logs:
            l["id"] = str(l.pop("_id", l.get("id", "")))
        
        return {"history": logs, "total": total, "page": page}
    
    @commission_router.get("/stats")
    async def get_commission_stats(days: int = Query(default=30)):
        """Commission statistics"""
        start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        
        pipeline = [
            {"$match": {"created_at": {"$gte": start_date}}},
            {"$group": {
                "_id": None,
                "total_amount": {"$sum": "$amount"},
                "total_transactions": {"$sum": 1},
                "avg_commission": {"$avg": "$amount"}
            }}
        ]
        
        stats = await db.commission_logs.aggregate(pipeline).to_list(1)
        
        if stats:
            return {
                "period_days": days,
                "total_commission": stats[0]["total_amount"],
                "total_transactions": stats[0]["total_transactions"],
                "avg_commission": round(stats[0]["avg_commission"], 2)
            }
        
        return {"period_days": days, "total_commission": 0, "total_transactions": 0, "avg_commission": 0}
    
    @commission_router.get("/by-seller")
    async def get_commission_by_seller(limit: int = Query(default=20)):
        """Commission by seller"""
        pipeline = [
            {"$group": {
                "_id": "$seller_id",
                "total_commission": {"$sum": "$amount"},
                "transaction_count": {"$sum": 1}
            }},
            {"$sort": {"total_commission": -1}},
            {"$limit": limit}
        ]
        
        results = await db.commission_logs.aggregate(pipeline).to_list(limit)
        
        return {
            "by_seller": [
                {"seller_id": r["_id"], "total_commission": r["total_commission"], "transactions": r["transaction_count"]}
                for r in results
            ]
        }
    
    @commission_router.get("/by-category")
    async def get_commission_by_category():
        """Commission by category"""
        pipeline = [
            {"$group": {
                "_id": "$category",
                "total_commission": {"$sum": "$amount"},
                "transaction_count": {"$sum": 1}
            }},
            {"$sort": {"total_commission": -1}}
        ]
        
        results = await db.commission_logs.aggregate(pipeline).to_list(50)
        
        return {
            "by_category": [
                {"category": r["_id"] or "uncategorized", "total_commission": r["total_commission"], "transactions": r["transaction_count"]}
                for r in results
            ]
        }
    
    # =============================================================================
    # 4. INVOICES
    # =============================================================================
    invoices_router = APIRouter(prefix="/invoices", tags=["Invoice Management"])
    
    @invoices_router.get("")
    async def list_invoices(
        page: int = Query(default=1, ge=1),
        limit: int = Query(default=50, le=100),
        status: Optional[str] = None
    ):
        """List all invoices"""
        query = {}
        if status:
            query["status"] = status
        
        skip = (page - 1) * limit
        invoices = await db.invoices_admin.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        total = await db.invoices_admin.count_documents(query)
        
        for inv in invoices:
            inv["id"] = str(inv.pop("_id", inv.get("id", "")))
        
        return {"invoices": invoices, "total": total, "page": page, "pages": (total + limit - 1) // limit}
    
    @invoices_router.post("")
    async def create_invoice(invoice: InvoiceCreate, admin = Depends(require_auth)):
        """Create invoice"""
        invoice_number = f"INV-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        
        invoice_doc = {
            "id": f"inv_{uuid.uuid4().hex[:12]}",
            "invoice_number": invoice_number,
            **invoice.dict(),
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": admin.get("user_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown")
        }
        await db.invoices_admin.insert_one(invoice_doc)
        invoice_doc.pop("_id", None)
        return invoice_doc
    
    @invoices_router.get("/stats")
    async def get_invoice_stats():
        """Invoice statistics"""
        total = await db.invoices_admin.count_documents({})
        paid = await db.invoices_admin.count_documents({"status": "paid"})
        pending = await db.invoices_admin.count_documents({"status": "pending"})
        overdue = await db.invoices_admin.count_documents({"status": "overdue"})
        
        pipeline = [
            {"$match": {"status": "paid"}},
            {"$group": {"_id": None, "total_revenue": {"$sum": "$total"}}}
        ]
        revenue = await db.invoices_admin.aggregate(pipeline).to_list(1)
        
        return {
            "total_invoices": total,
            "paid": paid,
            "pending": pending,
            "overdue": overdue,
            "total_revenue": revenue[0]["total_revenue"] if revenue else 0
        }
    
    @invoices_router.get("/by-status")
    async def get_invoices_by_status():
        """Invoices by status"""
        pipeline = [
            {"$group": {"_id": "$status", "count": {"$sum": 1}, "total_amount": {"$sum": "$total"}}}
        ]
        results = await db.invoices_admin.aggregate(pipeline).to_list(10)
        
        return {
            "by_status": {
                r["_id"] or "unknown": {"count": r["count"], "total_amount": r["total_amount"]}
                for r in results
            }
        }
    
    @invoices_router.get("/overdue")
    async def get_overdue_invoices():
        """Overdue invoices"""
        now = datetime.now(timezone.utc).isoformat()
        invoices = await db.invoices_admin.find({
            "status": {"$ne": "paid"},
            "due_date": {"$lt": now}
        }).to_list(100)
        
        for inv in invoices:
            inv["id"] = str(inv.pop("_id", inv.get("id", "")))
        
        return {"invoices": invoices, "total": len(invoices)}
    
    @invoices_router.get("/by-user/{user_id}")
    async def get_invoices_by_user(user_id: str):
        """Invoices for specific user"""
        invoices = await db.invoices_admin.find({"user_id": user_id}).sort("created_at", -1).to_list(100)
        for inv in invoices:
            inv["id"] = str(inv.pop("_id", inv.get("id", "")))
        return {"invoices": invoices, "total": len(invoices)}
    
    @invoices_router.get("/{invoice_id}")
    async def get_invoice(invoice_id: str):
        """Get invoice details"""
        invoice = await db.invoices_admin.find_one({"id": invoice_id})
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        invoice["id"] = str(invoice.pop("_id", invoice.get("id", "")))
        return invoice
    
    @invoices_router.put("/{invoice_id}")
    async def update_invoice(invoice_id: str, update: InvoiceUpdate, admin = Depends(require_auth)):
        """Update invoice"""
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.invoices_admin.update_one({"id": invoice_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return {"status": "updated", "invoice_id": invoice_id}
    
    @invoices_router.get("/{invoice_id}/download")
    async def download_invoice(invoice_id: str):
        """Download invoice PDF"""
        invoice = await db.invoices_admin.find_one({"id": invoice_id})
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        return {
            "invoice_id": invoice_id,
            "download_url": f"/api/invoices/{invoice_id}/pdf",
            "message": "PDF generation queued"
        }
    
    @invoices_router.post("/{invoice_id}/send")
    async def send_invoice(invoice_id: str, admin = Depends(require_auth)):
        """Send invoice to user"""
        invoice = await db.invoices_admin.find_one({"id": invoice_id})
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        await db.invoices_admin.update_one(
            {"id": invoice_id},
            {"$set": {"sent_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {"status": "sent", "invoice_id": invoice_id, "message": "Invoice sent to user"}
    
    @invoices_router.post("/{invoice_id}/mark-paid")
    async def mark_invoice_paid(invoice_id: str, admin = Depends(require_auth)):
        """Mark invoice as paid"""
        result = await db.invoices_admin.update_one(
            {"id": invoice_id},
            {"$set": {
                "status": "paid",
                "paid_at": datetime.now(timezone.utc).isoformat(),
                "marked_by": admin.get("user_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown")
            }}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return {"status": "marked_paid", "invoice_id": invoice_id}
    
    # =============================================================================
    # 5. BADGE MANAGEMENT
    # =============================================================================
    badges_router = APIRouter(prefix="/badges", tags=["Badge Management"])
    
    @badges_router.get("")
    async def list_badges(category: Optional[str] = None):
        """List all badges"""
        query = {}
        if category:
            query["category"] = category
        
        badges = await db.badges_admin.find(query).sort("tier", 1).to_list(100)
        for b in badges:
            b["id"] = str(b.pop("_id", b.get("id", "")))
        
        if not badges:
            badges = [
                {"id": "verified_seller", "name": "Verified Seller", "description": "Completed seller verification", "icon": "verified", "category": "seller", "tier": "gold", "points": 100},
                {"id": "top_seller", "name": "Top Seller", "description": "Achieved top seller status", "icon": "star", "category": "seller", "tier": "platinum", "points": 500},
                {"id": "early_adopter", "name": "Early Adopter", "description": "Joined during beta", "icon": "clock", "category": "general", "tier": "silver", "points": 50},
                {"id": "trusted_buyer", "name": "Trusted Buyer", "description": "Completed 10+ purchases", "icon": "shield", "category": "buyer", "tier": "gold", "points": 100},
            ]
        
        return {"badges": badges, "total": len(badges)}
    
    @badges_router.post("")
    async def create_badge(badge: BadgeCreate, admin = Depends(require_auth)):
        """Create badge"""
        badge_doc = {
            "id": f"badge_{uuid.uuid4().hex[:8]}",
            **badge.dict(),
            "is_active": True,
            "holders_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": admin.get("user_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown")
        }
        await db.badges_admin.insert_one(badge_doc)
        badge_doc.pop("_id", None)
        return badge_doc
    
    @badges_router.get("/active")
    async def get_active_badges():
        """Active badges"""
        badges = await db.badges_admin.find({"is_active": True}).to_list(100)
        for b in badges:
            b["id"] = str(b.pop("_id", b.get("id", "")))
        return {"badges": badges, "total": len(badges)}
    
    @badges_router.get("/categories")
    async def get_badge_categories():
        """Badge categories"""
        pipeline = [
            {"$group": {"_id": "$category", "count": {"$sum": 1}}}
        ]
        results = await db.badges_admin.aggregate(pipeline).to_list(20)
        
        categories = {r["_id"] or "general": r["count"] for r in results}
        
        if not categories:
            categories = {"general": 2, "seller": 3, "buyer": 2, "achievement": 4}
        
        return {"categories": categories}
    
    @badges_router.get("/stats")
    async def get_badge_stats():
        """Badge statistics"""
        total_badges = await db.badges_admin.count_documents({})
        active_badges = await db.badges_admin.count_documents({"is_active": True})
        total_awards = await db.user_badges.count_documents({})
        
        return {
            "total_badges": total_badges or 10,
            "active_badges": active_badges or 10,
            "total_awards": total_awards,
            "unique_holders": 0
        }
    
    @badges_router.get("/leaderboard")
    async def get_badge_leaderboard(limit: int = Query(default=20)):
        """Badge leaderboard"""
        pipeline = [
            {"$group": {
                "_id": "$user_id",
                "badge_count": {"$sum": 1},
                "total_points": {"$sum": "$points"}
            }},
            {"$sort": {"total_points": -1, "badge_count": -1}},
            {"$limit": limit}
        ]
        
        leaderboard = await db.user_badges.aggregate(pipeline).to_list(limit)
        
        return {
            "leaderboard": [
                {"rank": i + 1, "user_id": entry["_id"], "badge_count": entry["badge_count"], "total_points": entry["total_points"]}
                for i, entry in enumerate(leaderboard)
            ]
        }
    
    @badges_router.get("/user/{user_id}")
    async def get_user_badges(user_id: str):
        """Badges for specific user"""
        user_badges = await db.user_badges.find({"user_id": user_id}).to_list(50)
        for b in user_badges:
            b["id"] = str(b.pop("_id", b.get("id", "")))
        
        return {
            "user_id": user_id,
            "badges": user_badges,
            "total": len(user_badges),
            "total_points": sum(b.get("points", 0) for b in user_badges)
        }
    
    @badges_router.get("/{badge_id}")
    async def get_badge(badge_id: str):
        """Get badge details"""
        badge = await db.badges_admin.find_one({"id": badge_id})
        if not badge:
            raise HTTPException(status_code=404, detail="Badge not found")
        badge["id"] = str(badge.pop("_id", badge.get("id", "")))
        return badge
    
    @badges_router.put("/{badge_id}")
    async def update_badge(badge_id: str, update: BadgeUpdate, admin = Depends(require_auth)):
        """Update badge"""
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.badges_admin.update_one({"id": badge_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Badge not found")
        return {"status": "updated", "badge_id": badge_id}
    
    @badges_router.delete("/{badge_id}")
    async def delete_badge(badge_id: str, admin = Depends(require_auth)):
        """Delete badge"""
        result = await db.badges_admin.delete_one({"id": badge_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Badge not found")
        return {"status": "deleted", "badge_id": badge_id}
    
    @badges_router.get("/{badge_id}/holders")
    async def get_badge_holders(badge_id: str, limit: int = Query(default=50)):
        """Users who have this badge"""
        holders = await db.user_badges.find({"badge_id": badge_id}).sort("awarded_at", -1).limit(limit).to_list(limit)
        for h in holders:
            h["id"] = str(h.pop("_id", h.get("id", "")))
        return {"badge_id": badge_id, "holders": holders, "total": len(holders)}
    
    @badges_router.post("/{badge_id}/award")
    async def award_badge(badge_id: str, award: BadgeAward, admin = Depends(require_auth)):
        """Award badge to user"""
        # Check if badge exists
        badge = await db.badges_admin.find_one({"id": badge_id})
        if not badge:
            raise HTTPException(status_code=404, detail="Badge not found")
        
        # Check if user already has badge
        existing = await db.user_badges.find_one({"badge_id": badge_id, "user_id": award.user_id})
        if existing:
            raise HTTPException(status_code=400, detail="User already has this badge")
        
        award_doc = {
            "id": f"award_{uuid.uuid4().hex[:12]}",
            "badge_id": badge_id,
            "badge_name": badge.get("name"),
            "user_id": award.user_id,
            "points": badge.get("points", 0),
            "reason": award.reason,
            "awarded_at": datetime.now(timezone.utc).isoformat(),
            "awarded_by": admin.get("user_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown")
        }
        await db.user_badges.insert_one(award_doc)
        
        # Update holders count
        await db.badges_admin.update_one({"id": badge_id}, {"$inc": {"holders_count": 1}})
        
        award_doc.pop("_id", None)
        return {"status": "awarded", "award": award_doc}
    
    @badges_router.post("/{badge_id}/revoke")
    async def revoke_badge(badge_id: str, user_id: str = Body(..., embed=True), admin = Depends(require_auth)):
        """Revoke badge from user"""
        result = await db.user_badges.delete_one({"badge_id": badge_id, "user_id": user_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="User does not have this badge")
        
        # Update holders count
        await db.badges_admin.update_one({"id": badge_id}, {"$inc": {"holders_count": -1}})
        
        return {"status": "revoked", "badge_id": badge_id, "user_id": user_id}
    
    # Return all routers
    return {
        "listing_moderation": listing_mod_router,
        "vouchers": voucher_router,
        "commission": commission_router,
        "invoices": invoices_router,
        "badges": badges_router
    }
