"""
Management API Routes
Implements the exact API paths requested by the user for:
- Listing Moderation (/api/listing-moderation/*)
- Voucher Management (/api/vouchers/*)
- Commission Management (/api/commission/*)
- Invoices (/api/invoices/*)
- Badge Management (/api/badges/*)
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Request, Depends, Query, Body
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class ModerationDecision(BaseModel):
    reason: Optional[str] = None
    notify_user: bool = True

class VoucherCreate(BaseModel):
    code: str
    voucher_type: str = "percent"  # amount, percent, credit
    value: float
    description: Optional[str] = None
    max_uses: Optional[int] = None
    max_uses_per_user: int = 1
    min_order_amount: Optional[float] = None
    max_discount_amount: Optional[float] = None
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    allowed_categories: Optional[List[str]] = None
    is_active: bool = True

class CommissionRuleCreate(BaseModel):
    name: str
    category_id: Optional[str] = None
    commission_percentage: float
    min_commission: float = 0
    max_commission: Optional[float] = None
    tier: Optional[str] = None

class InvoiceCreate(BaseModel):
    user_id: str
    amount: float
    description: str
    items: List[Dict] = []
    due_date: Optional[str] = None

class BadgeCreate(BaseModel):
    name: str
    description: str
    icon: str
    category: str = "general"
    criteria: Dict = {}
    is_active: bool = True


def create_management_routes(db, get_current_user):
    """Create management API routes"""
    
    router = APIRouter(tags=["Management"])
    
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

    # ========================================================================
    # LISTING MODERATION ENDPOINTS
    # ========================================================================
    
    @router.get("/listing-moderation")
    async def get_moderation_dashboard(admin = Depends(require_admin)):
        """Moderation dashboard overview"""
        pending_count = await db.listings.count_documents({
            "moderation_status": {"$in": [None, "pending"]},
            "is_active": False
        })
        approved_today = await db.moderation_log.count_documents({
            "action": "validate",
            "created_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)}
        })
        rejected_today = await db.moderation_log.count_documents({
            "action": "reject",
            "created_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)}
        })
        
        return {
            "pending_count": pending_count,
            "approved_today": approved_today,
            "rejected_today": rejected_today,
            "total_listings": await db.listings.count_documents({})
        }
    
    @router.get("/listing-moderation/queue")
    async def get_moderation_queue(
        status: str = "pending",
        limit: int = 50,
        skip: int = 0,
        admin = Depends(require_admin)
    ):
        """Get listings pending review"""
        query = {}
        if status == "pending":
            query["moderation_status"] = {"$in": [None, "pending"]}
            query["is_active"] = False
        elif status == "approved":
            query["moderation_status"] = "approved"
        elif status == "rejected":
            query["moderation_status"] = "rejected"
        
        cursor = db.listings.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
        listings = await cursor.to_list(length=limit)
        total = await db.listings.count_documents(query)
        
        return {"listings": listings, "total": total}
    
    @router.get("/listing-moderation/queue/count")
    async def get_queue_count(admin = Depends(require_admin)):
        """Count of pending items"""
        count = await db.listings.count_documents({
            "moderation_status": {"$in": [None, "pending"]},
            "is_active": False
        })
        return {"count": count}
    
    @router.post("/listing-moderation/{listing_id}/approve")
    async def approve_listing(listing_id: str, data: ModerationDecision = Body(default=None), admin = Depends(require_admin)):
        """Approve listing"""
        listing = await db.listings.find_one({"id": listing_id})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        now = datetime.now(timezone.utc)
        await db.listings.update_one(
            {"id": listing_id},
            {"$set": {
                "is_active": True,
                "moderation_status": "approved",
                "moderated_at": now,
                "moderated_by": admin.user_id
            }}
        )
        
        await db.moderation_log.insert_one({
            "id": str(uuid.uuid4()),
            "listing_id": listing_id,
            "admin_id": admin.user_id,
            "action": "validate",
            "reason": data.reason if data else None,
            "created_at": now
        })
        
        return {"message": "Listing approved", "listing_id": listing_id}
    
    @router.post("/listing-moderation/{listing_id}/reject")
    async def reject_listing(listing_id: str, data: ModerationDecision = Body(...), admin = Depends(require_admin)):
        """Reject listing with reason"""
        listing = await db.listings.find_one({"id": listing_id})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        now = datetime.now(timezone.utc)
        await db.listings.update_one(
            {"id": listing_id},
            {"$set": {
                "is_active": False,
                "moderation_status": "rejected",
                "moderated_at": now,
                "moderated_by": admin.user_id,
                "rejection_reason": data.reason
            }}
        )
        
        await db.moderation_log.insert_one({
            "id": str(uuid.uuid4()),
            "listing_id": listing_id,
            "admin_id": admin.user_id,
            "action": "reject",
            "reason": data.reason,
            "created_at": now
        })
        
        return {"message": "Listing rejected", "listing_id": listing_id}
    
    @router.post("/listing-moderation/{listing_id}/request-edit")
    async def request_edit(listing_id: str, data: ModerationDecision = Body(...), admin = Depends(require_admin)):
        """Request edits from seller"""
        listing = await db.listings.find_one({"id": listing_id})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        now = datetime.now(timezone.utc)
        await db.listings.update_one(
            {"id": listing_id},
            {"$set": {
                "moderation_status": "edit_requested",
                "edit_request_reason": data.reason,
                "edit_requested_at": now
            }}
        )
        
        # Create notification for seller
        if data.notify_user:
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": listing["user_id"],
                "type": "edit_requested",
                "title": "Listing Edit Requested",
                "body": f"Please update your listing: {data.reason}",
                "listing_id": listing_id,
                "read": False,
                "created_at": now
            })
        
        return {"message": "Edit request sent", "listing_id": listing_id}
    
    @router.get("/listing-moderation/history")
    async def get_moderation_history(
        limit: int = 100,
        skip: int = 0,
        admin = Depends(require_admin)
    ):
        """Moderation history"""
        cursor = db.moderation_log.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
        logs = await cursor.to_list(length=limit)
        return {"history": logs, "total": await db.moderation_log.count_documents({})}
    
    @router.get("/listing-moderation/stats")
    async def get_moderation_stats(admin = Depends(require_admin)):
        """Moderation statistics"""
        total = await db.listings.count_documents({})
        pending = await db.listings.count_documents({"moderation_status": {"$in": [None, "pending"]}})
        approved = await db.listings.count_documents({"moderation_status": "approved"})
        rejected = await db.listings.count_documents({"moderation_status": "rejected"})
        
        return {
            "total_listings": total,
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
            "approval_rate": round((approved / total * 100) if total > 0 else 0, 2)
        }
    
    @router.get("/listing-moderation/rules")
    async def get_moderation_rules(admin = Depends(require_admin)):
        """Get auto-moderation rules"""
        rules = await db.moderation_rules.find({}, {"_id": 0}).to_list(100)
        return {"rules": rules}
    
    @router.put("/listing-moderation/rules")
    async def update_moderation_rules(request: Request, admin = Depends(require_admin)):
        """Update auto-moderation rules"""
        data = await request.json()
        rules = data.get("rules", [])
        
        await db.moderation_rules.delete_many({})
        if rules:
            await db.moderation_rules.insert_many(rules)
        
        return {"message": "Rules updated", "count": len(rules)}
    
    @router.get("/listing-moderation/flagged")
    async def get_flagged_listings(
        limit: int = 50,
        skip: int = 0,
        admin = Depends(require_admin)
    ):
        """Get flagged listings"""
        cursor = db.listings.find(
            {"is_flagged": True}, {"_id": 0}
        ).sort("flagged_at", -1).skip(skip).limit(limit)
        listings = await cursor.to_list(length=limit)
        return {"listings": listings, "total": await db.listings.count_documents({"is_flagged": True})}

    # ========================================================================
    # VOUCHER MANAGEMENT ENDPOINTS
    # ========================================================================
    
    @router.get("/vouchers")
    async def list_vouchers(
        status: Optional[str] = None,
        limit: int = 50,
        skip: int = 0,
        admin = Depends(require_admin)
    ):
        """List all vouchers"""
        query = {}
        if status == "active":
            query["is_active"] = True
        elif status == "inactive":
            query["is_active"] = False
        
        cursor = db.vouchers.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
        vouchers = await cursor.to_list(length=limit)
        return {"vouchers": vouchers, "total": await db.vouchers.count_documents(query)}
    
    @router.post("/vouchers")
    async def create_voucher(data: VoucherCreate, admin = Depends(require_admin)):
        """Create voucher"""
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
            "valid_from": data.valid_from,
            "valid_until": data.valid_until,
            "allowed_categories": data.allowed_categories,
            "is_active": data.is_active,
            "total_uses": 0,
            "created_by": admin.user_id,
            "created_at": now
        }
        
        await db.vouchers.insert_one(voucher)
        return {"message": "Voucher created", "id": voucher["id"], "code": voucher["code"]}
    
    @router.get("/vouchers/{voucher_id}")
    async def get_voucher(voucher_id: str, admin = Depends(require_admin)):
        """Get voucher details"""
        voucher = await db.vouchers.find_one({"id": voucher_id}, {"_id": 0})
        if not voucher:
            raise HTTPException(status_code=404, detail="Voucher not found")
        return voucher
    
    @router.put("/vouchers/{voucher_id}")
    async def update_voucher(voucher_id: str, request: Request, admin = Depends(require_admin)):
        """Update voucher"""
        data = await request.json()
        result = await db.vouchers.update_one(
            {"id": voucher_id},
            {"$set": {**data, "updated_at": datetime.now(timezone.utc)}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Voucher not found")
        return {"message": "Voucher updated"}
    
    @router.delete("/vouchers/{voucher_id}")
    async def delete_voucher(voucher_id: str, admin = Depends(require_admin)):
        """Delete voucher"""
        result = await db.vouchers.delete_one({"id": voucher_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Voucher not found")
        return {"message": "Voucher deleted"}
    
    @router.get("/vouchers/active")
    async def get_active_vouchers(admin = Depends(require_admin)):
        """Get active vouchers"""
        now = datetime.now(timezone.utc)
        vouchers = await db.vouchers.find({
            "is_active": True,
            "$or": [{"valid_until": None}, {"valid_until": {"$gt": now.isoformat()}}]
        }, {"_id": 0}).to_list(100)
        return {"vouchers": vouchers}
    
    @router.get("/vouchers/expired")
    async def get_expired_vouchers(admin = Depends(require_admin)):
        """Get expired vouchers"""
        now = datetime.now(timezone.utc)
        vouchers = await db.vouchers.find({
            "valid_until": {"$lt": now.isoformat()}
        }, {"_id": 0}).to_list(100)
        return {"vouchers": vouchers}
    
    @router.get("/vouchers/stats")
    async def get_voucher_stats(admin = Depends(require_admin)):
        """Voucher usage statistics"""
        total = await db.vouchers.count_documents({})
        active = await db.vouchers.count_documents({"is_active": True})
        total_redemptions = await db.voucher_usage.count_documents({})
        
        pipeline = [{"$group": {"_id": None, "total": {"$sum": "$discount_amount"}}}]
        result = await db.voucher_usage.aggregate(pipeline).to_list(1)
        total_discount = result[0]["total"] if result else 0
        
        return {
            "total_vouchers": total,
            "active_vouchers": active,
            "total_redemptions": total_redemptions,
            "total_discount_given": total_discount
        }
    
    @router.get("/vouchers/{voucher_id}/redemptions")
    async def get_voucher_redemptions(voucher_id: str, admin = Depends(require_admin)):
        """Voucher redemption history"""
        redemptions = await db.voucher_usage.find(
            {"voucher_id": voucher_id}, {"_id": 0}
        ).sort("used_at", -1).to_list(100)
        return {"redemptions": redemptions}
    
    @router.post("/vouchers/{voucher_id}/activate")
    async def activate_voucher(voucher_id: str, admin = Depends(require_admin)):
        """Activate voucher"""
        result = await db.vouchers.update_one(
            {"id": voucher_id},
            {"$set": {"is_active": True}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Voucher not found")
        return {"message": "Voucher activated"}
    
    @router.post("/vouchers/{voucher_id}/deactivate")
    async def deactivate_voucher(voucher_id: str, admin = Depends(require_admin)):
        """Deactivate voucher"""
        result = await db.vouchers.update_one(
            {"id": voucher_id},
            {"$set": {"is_active": False}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Voucher not found")
        return {"message": "Voucher deactivated"}
    
    @router.post("/vouchers/validate")
    async def validate_voucher(request: Request, user = Depends(require_auth)):
        """Validate voucher code"""
        data = await request.json()
        code = data.get("code", "").upper()
        
        voucher = await db.vouchers.find_one({"code": code, "is_active": True})
        if not voucher:
            return {"is_valid": False, "message": "Invalid voucher code"}
        
        now = datetime.now(timezone.utc)
        if voucher.get("valid_until") and voucher["valid_until"] < now.isoformat():
            return {"is_valid": False, "message": "Voucher expired"}
        
        if voucher.get("max_uses") and voucher.get("total_uses", 0) >= voucher["max_uses"]:
            return {"is_valid": False, "message": "Voucher usage limit reached"}
        
        return {
            "is_valid": True,
            "message": "Voucher is valid",
            "voucher_type": voucher["voucher_type"],
            "value": voucher["value"]
        }

    # ========================================================================
    # COMMISSION MANAGEMENT ENDPOINTS
    # ========================================================================
    
    @router.get("/commission")
    async def get_commission_dashboard(admin = Depends(require_admin)):
        """Commission dashboard"""
        config = await db.commission_config.find_one({"id": "global_commission_config"}, {"_id": 0})
        if not config:
            config = {"default_commission": 5.0, "category_commissions": []}
        
        total_earned = await db.commission_transactions.aggregate([
            {"$group": {"_id": None, "total": {"$sum": "$commission_amount"}}}
        ]).to_list(1)
        
        return {
            "config": config,
            "total_commission_earned": total_earned[0]["total"] if total_earned else 0
        }
    
    @router.get("/commission/rules")
    async def get_commission_rules(admin = Depends(require_admin)):
        """Get commission rules/tiers"""
        rules = await db.commission_rules.find({}, {"_id": 0}).to_list(100)
        return {"rules": rules}
    
    @router.post("/commission/rules")
    async def create_commission_rule(data: CommissionRuleCreate, admin = Depends(require_admin)):
        """Create commission rule"""
        rule = {
            "id": str(uuid.uuid4()),
            "name": data.name,
            "category_id": data.category_id,
            "commission_percentage": data.commission_percentage,
            "min_commission": data.min_commission,
            "max_commission": data.max_commission,
            "tier": data.tier,
            "created_at": datetime.now(timezone.utc)
        }
        await db.commission_rules.insert_one(rule)
        return {"message": "Rule created", "id": rule["id"]}
    
    @router.put("/commission/rules/{rule_id}")
    async def update_commission_rule(rule_id: str, request: Request, admin = Depends(require_admin)):
        """Update commission rule"""
        data = await request.json()
        result = await db.commission_rules.update_one(
            {"id": rule_id},
            {"$set": data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Rule not found")
        return {"message": "Rule updated"}
    
    @router.delete("/commission/rules/{rule_id}")
    async def delete_commission_rule(rule_id: str, admin = Depends(require_admin)):
        """Delete commission rule"""
        result = await db.commission_rules.delete_one({"id": rule_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Rule not found")
        return {"message": "Rule deleted"}
    
    @router.get("/commission/rates")
    async def get_commission_rates(admin = Depends(require_admin)):
        """Commission rates by category"""
        config = await db.commission_config.find_one({"id": "global_commission_config"}, {"_id": 0})
        categories = await db.categories.find({}, {"_id": 0}).to_list(100)
        
        default_rate = config.get("default_commission", 5.0) if config else 5.0
        custom_rates = {c["category_id"]: c for c in config.get("category_commissions", [])} if config else {}
        
        rates = []
        for cat in categories:
            custom = custom_rates.get(cat["id"])
            rates.append({
                "category_id": cat["id"],
                "category_name": cat.get("name", cat["id"]),
                "commission_percentage": custom["commission_percentage"] if custom else default_rate,
                "is_custom": custom is not None
            })
        
        return {"rates": rates, "default_rate": default_rate}
    
    @router.put("/commission/rates")
    async def update_commission_rates(request: Request, admin = Depends(require_admin)):
        """Update commission rates"""
        data = await request.json()
        await db.commission_config.update_one(
            {"id": "global_commission_config"},
            {"$set": data},
            upsert=True
        )
        return {"message": "Rates updated"}
    
    @router.get("/commission/earnings")
    async def get_commission_earnings(
        period: str = "month",
        admin = Depends(require_admin)
    ):
        """Commission earnings report"""
        pipeline = [
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "total": {"$sum": "$commission_amount"},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id": -1}},
            {"$limit": 30}
        ]
        earnings = await db.commission_transactions.aggregate(pipeline).to_list(30)
        return {"earnings": earnings}
    
    @router.get("/commission/history")
    async def get_commission_history(
        limit: int = 100,
        skip: int = 0,
        admin = Depends(require_admin)
    ):
        """Commission history"""
        cursor = db.commission_transactions.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
        history = await cursor.to_list(length=limit)
        return {"history": history}
    
    @router.get("/commission/stats")
    async def get_commission_stats(admin = Depends(require_admin)):
        """Commission statistics"""
        total = await db.commission_transactions.aggregate([
            {"$group": {"_id": None, "total": {"$sum": "$commission_amount"}}}
        ]).to_list(1)
        
        count = await db.commission_transactions.count_documents({})
        
        return {
            "total_commission": total[0]["total"] if total else 0,
            "total_transactions": count,
            "average_commission": (total[0]["total"] / count) if total and count > 0 else 0
        }
    
    @router.get("/commission/by-seller")
    async def get_commission_by_seller(admin = Depends(require_admin)):
        """Commission by seller"""
        pipeline = [
            {"$group": {
                "_id": "$seller_id",
                "total_commission": {"$sum": "$commission_amount"},
                "transaction_count": {"$sum": 1}
            }},
            {"$sort": {"total_commission": -1}},
            {"$limit": 50}
        ]
        by_seller = await db.commission_transactions.aggregate(pipeline).to_list(50)
        return {"by_seller": by_seller}
    
    @router.get("/commission/by-category")
    async def get_commission_by_category(admin = Depends(require_admin)):
        """Commission by category"""
        pipeline = [
            {"$group": {
                "_id": "$category_id",
                "total_commission": {"$sum": "$commission_amount"},
                "transaction_count": {"$sum": 1}
            }},
            {"$sort": {"total_commission": -1}}
        ]
        by_category = await db.commission_transactions.aggregate(pipeline).to_list(50)
        return {"by_category": by_category}

    # ========================================================================
    # INVOICES ENDPOINTS
    # Note: Static routes MUST come before dynamic {invoice_id} routes
    # ========================================================================
    
    @router.get("/invoices")
    async def list_invoices(
        status: Optional[str] = None,
        limit: int = 50,
        skip: int = 0,
        admin = Depends(require_admin)
    ):
        """List all invoices"""
        query = {}
        if status:
            query["status"] = status
        
        cursor = db.invoices.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
        invoices = await cursor.to_list(length=limit)
        return {"invoices": invoices, "total": await db.invoices.count_documents(query)}
    
    @router.post("/invoices")
    async def create_invoice(data: InvoiceCreate, admin = Depends(require_admin)):
        """Create invoice"""
        invoice = {
            "id": str(uuid.uuid4()),
            "invoice_number": f"INV-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}",
            "user_id": data.user_id,
            "amount": data.amount,
            "description": data.description,
            "items": data.items,
            "status": "pending",
            "due_date": data.due_date,
            "created_by": admin.user_id,
            "created_at": datetime.now(timezone.utc)
        }
        await db.invoices.insert_one(invoice)
        return {"message": "Invoice created", "id": invoice["id"], "invoice_number": invoice["invoice_number"]}
    
    # Static invoice routes - MUST be before /{invoice_id}
    @router.get("/invoices/stats")
    async def get_invoice_stats(admin = Depends(require_admin)):
        """Invoice statistics"""
        total = await db.invoices.count_documents({})
        paid = await db.invoices.count_documents({"status": "paid"})
        pending = await db.invoices.count_documents({"status": "pending"})
        overdue = await db.invoices.count_documents({"status": "overdue"})
        
        total_amount = await db.invoices.aggregate([
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)
        
        return {
            "total_invoices": total,
            "paid": paid,
            "pending": pending,
            "overdue": overdue,
            "total_amount": total_amount[0]["total"] if total_amount else 0
        }
    
    @router.get("/invoices/by-status")
    async def get_invoices_by_status(status: str = Query(...), admin = Depends(require_admin)):
        """Invoices by status"""
        invoices = await db.invoices.find({"status": status}, {"_id": 0}).to_list(100)
        return {"invoices": invoices}
    
    @router.get("/invoices/overdue")
    async def get_overdue_invoices(admin = Depends(require_admin)):
        """Get overdue invoices"""
        now = datetime.now(timezone.utc)
        invoices = await db.invoices.find({
            "status": {"$in": ["pending", "sent"]},
            "due_date": {"$lt": now.isoformat()}
        }, {"_id": 0}).to_list(100)
        return {"invoices": invoices}
    
    # Dynamic invoice routes - MUST be after static routes
    @router.get("/invoices/by-user/{user_id}")
    async def get_invoices_by_user(user_id: str, admin = Depends(require_admin)):
        """Invoices for specific user"""
        invoices = await db.invoices.find({"user_id": user_id}, {"_id": 0}).to_list(100)
        return {"invoices": invoices}
    
    @router.get("/invoices/{invoice_id}")
    async def get_invoice(invoice_id: str, admin = Depends(require_admin)):
        """Get invoice details"""
        invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return invoice
    
    @router.put("/invoices/{invoice_id}")
    async def update_invoice(invoice_id: str, request: Request, admin = Depends(require_admin)):
        """Update invoice"""
        data = await request.json()
        result = await db.invoices.update_one(
            {"id": invoice_id},
            {"$set": {**data, "updated_at": datetime.now(timezone.utc)}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return {"message": "Invoice updated"}
    
    @router.get("/invoices/{invoice_id}/download")
    async def download_invoice(invoice_id: str, admin = Depends(require_admin)):
        """Download invoice PDF - returns invoice data for client-side PDF generation"""
        invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        user = await db.users.find_one({"user_id": invoice["user_id"]}, {"_id": 0, "name": 1, "email": 1})
        invoice["user"] = user
        
        return {"invoice": invoice, "download_ready": True}
    
    @router.post("/invoices/{invoice_id}/send")
    async def send_invoice(invoice_id: str, admin = Depends(require_admin)):
        """Send invoice to user"""
        invoice = await db.invoices.find_one({"id": invoice_id})
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        await db.invoices.update_one(
            {"id": invoice_id},
            {"$set": {"sent_at": datetime.now(timezone.utc), "status": "sent"}}
        )
        
        # Create notification
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": invoice["user_id"],
            "type": "invoice",
            "title": "New Invoice",
            "body": f"You have a new invoice: {invoice.get('invoice_number', invoice_id)}",
            "read": False,
            "created_at": datetime.now(timezone.utc)
        })
        
        return {"message": "Invoice sent"}
    
    @router.post("/invoices/{invoice_id}/mark-paid")
    async def mark_invoice_paid(invoice_id: str, admin = Depends(require_admin)):
        """Mark invoice as paid"""
        result = await db.invoices.update_one(
            {"id": invoice_id},
            {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc)}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return {"message": "Invoice marked as paid"}

    # ========================================================================
    # BADGE MANAGEMENT ENDPOINTS
    # Note: Static routes MUST come before dynamic {badge_id} routes
    # ========================================================================
    
    @router.get("/badges")
    async def list_badges(admin = Depends(require_admin)):
        """List all badges"""
        badges = await db.badge_definitions.find({}, {"_id": 0}).to_list(100)
        return {"badges": badges}
    
    @router.post("/badges")
    async def create_badge(data: BadgeCreate, admin = Depends(require_admin)):
        """Create badge"""
        badge = {
            "id": str(uuid.uuid4()),
            "name": data.name,
            "description": data.description,
            "icon": data.icon,
            "category": data.category,
            "criteria": data.criteria,
            "is_active": data.is_active,
            "created_at": datetime.now(timezone.utc)
        }
        await db.badge_definitions.insert_one(badge)
        return {"message": "Badge created", "id": badge["id"]}
    
    # Static badge routes - MUST be before /{badge_id}
    @router.get("/badges/active")
    async def get_active_badges(admin = Depends(require_admin)):
        """Get active badges"""
        badges = await db.badge_definitions.find({"is_active": True}, {"_id": 0}).to_list(100)
        return {"badges": badges}
    
    @router.get("/badges/categories")
    async def get_badge_categories(admin = Depends(require_admin)):
        """Get badge categories"""
        pipeline = [{"$group": {"_id": "$category", "count": {"$sum": 1}}}]
        categories = await db.badge_definitions.aggregate(pipeline).to_list(50)
        return {"categories": [{"name": c["_id"], "count": c["count"]} for c in categories]}
    
    @router.get("/badges/stats")
    async def get_badge_stats(admin = Depends(require_admin)):
        """Badge statistics"""
        total_badges = await db.badge_definitions.count_documents({})
        active_badges = await db.badge_definitions.count_documents({"is_active": True})
        total_awarded = await db.user_badges.count_documents({})
        
        return {
            "total_badges": total_badges,
            "active_badges": active_badges,
            "total_awarded": total_awarded
        }
    
    @router.get("/badges/leaderboard")
    async def get_badge_leaderboard(admin = Depends(require_admin)):
        """Badge leaderboard"""
        pipeline = [
            {"$group": {"_id": "$user_id", "badge_count": {"$sum": 1}}},
            {"$sort": {"badge_count": -1}},
            {"$limit": 50}
        ]
        leaderboard = await db.user_badges.aggregate(pipeline).to_list(50)
        
        # Get user info
        for entry in leaderboard:
            user = await db.users.find_one({"user_id": entry["_id"]}, {"_id": 0, "name": 1})
            entry["user_name"] = user.get("name") if user else "Unknown"
        
        return {"leaderboard": leaderboard}
    
    # Dynamic badge routes - MUST be after static routes
    @router.get("/badges/user/{user_id}")
    async def get_user_badges(user_id: str, admin = Depends(require_admin)):
        """Badges for specific user"""
        user_badges = await db.user_badges.find({"user_id": user_id}, {"_id": 0}).to_list(100)
        
        # Get badge details
        for ub in user_badges:
            badge = await db.badge_definitions.find_one({"id": ub["badge_id"]}, {"_id": 0})
            ub["badge"] = badge
        
        return {"badges": user_badges}
    
    @router.get("/badges/{badge_id}")
    async def get_badge(badge_id: str, admin = Depends(require_admin)):
        """Get badge details"""
        badge = await db.badge_definitions.find_one({"id": badge_id}, {"_id": 0})
        if not badge:
            raise HTTPException(status_code=404, detail="Badge not found")
        return badge
    
    @router.put("/badges/{badge_id}")
    async def update_badge(badge_id: str, request: Request, admin = Depends(require_admin)):
        """Update badge"""
        data = await request.json()
        result = await db.badge_definitions.update_one(
            {"id": badge_id},
            {"$set": data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Badge not found")
        return {"message": "Badge updated"}
    
    @router.delete("/badges/{badge_id}")
    async def delete_badge(badge_id: str, admin = Depends(require_admin)):
        """Delete badge"""
        result = await db.badge_definitions.delete_one({"id": badge_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Badge not found")
        return {"message": "Badge deleted"}
    
    @router.get("/badges/{badge_id}/holders")
    async def get_badge_holders(badge_id: str, admin = Depends(require_admin)):
        """Users who have this badge"""
        holders = await db.user_badges.find({"badge_id": badge_id}, {"_id": 0}).to_list(100)
        
        # Get user info
        for holder in holders:
            user = await db.users.find_one({"user_id": holder["user_id"]}, {"_id": 0, "name": 1, "email": 1})
            holder["user"] = user
        
        return {"holders": holders}
    
    @router.post("/badges/{badge_id}/award")
    async def award_badge(badge_id: str, request: Request, admin = Depends(require_admin)):
        """Award badge to user"""
        data = await request.json()
        user_id = data.get("user_id")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id required")
        
        # Check if already awarded
        existing = await db.user_badges.find_one({"badge_id": badge_id, "user_id": user_id})
        if existing:
            raise HTTPException(status_code=400, detail="User already has this badge")
        
        await db.user_badges.insert_one({
            "id": str(uuid.uuid4()),
            "badge_id": badge_id,
            "user_id": user_id,
            "awarded_by": admin.user_id,
            "awarded_at": datetime.now(timezone.utc)
        })
        
        return {"message": "Badge awarded"}
    
    @router.post("/badges/{badge_id}/revoke")
    async def revoke_badge(badge_id: str, request: Request, admin = Depends(require_admin)):
        """Revoke badge from user"""
        data = await request.json()
        user_id = data.get("user_id")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id required")
        
        result = await db.user_badges.delete_one({"badge_id": badge_id, "user_id": user_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Badge not found for user")
        
        return {"message": "Badge revoked"}

    return router
        
        return {"message": "Badge awarded"}
    
    @router.post("/badges/{badge_id}/revoke")
    async def revoke_badge(badge_id: str, request: Request, admin = Depends(require_admin)):
        """Revoke badge from user"""
        data = await request.json()
        user_id = data.get("user_id")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id required")
        
        result = await db.user_badges.delete_one({"badge_id": badge_id, "user_id": user_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Badge not found for user")
        
        return {"message": "Badge revoked"}
    
    @router.get("/badges/user/{user_id}")
    async def get_user_badges(user_id: str, admin = Depends(require_admin)):
        """Badges for specific user"""
        user_badges = await db.user_badges.find({"user_id": user_id}, {"_id": 0}).to_list(100)
        
        # Get badge details
        for ub in user_badges:
            badge = await db.badge_definitions.find_one({"id": ub["badge_id"]}, {"_id": 0})
            ub["badge"] = badge
        
        return {"badges": user_badges}
    
    @router.get("/badges/leaderboard")
    async def get_badge_leaderboard(admin = Depends(require_admin)):
        """Badge leaderboard"""
        pipeline = [
            {"$group": {"_id": "$user_id", "badge_count": {"$sum": 1}}},
            {"$sort": {"badge_count": -1}},
            {"$limit": 50}
        ]
        leaderboard = await db.user_badges.aggregate(pipeline).to_list(50)
        
        # Get user info
        for entry in leaderboard:
            user = await db.users.find_one({"user_id": entry["_id"]}, {"_id": 0, "name": 1})
            entry["user_name"] = user.get("name") if user else "Unknown"
        
        return {"leaderboard": leaderboard}

    return router
