"""
Admin Utility API Routes
Provides endpoints for:
1. Reports - User and listing reports
2. Support Tickets - Customer support system
3. Banners - Banner management and analytics
4. Moderation - Content moderation
5. Data Privacy - GDPR compliance
6. Config Manager - System configuration
7. SEO Tools - SEO management
8. Polls & Surveys - User polls
9. Cookie Consent - Cookie management
10. URL Shortener - URL shortening service
11. reCAPTCHA - Bot protection
12. Image Settings - Image upload configuration
"""

import os
import logging
import uuid
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Depends, Request, Query, Body
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

# Reports
class ReportCreate(BaseModel):
    type: str  # user, listing, message, spam
    target_id: str
    target_type: str
    reason: str
    description: Optional[str] = None


class ReportUpdate(BaseModel):
    status: str  # pending, reviewing, resolved, dismissed
    resolution: Optional[str] = None
    admin_notes: Optional[str] = None


# Tickets
class TicketCreate(BaseModel):
    subject: str
    description: str
    category: str = "general"
    priority: str = "medium"
    attachments: List[str] = []


class TicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None


class TicketReply(BaseModel):
    message: str
    attachments: List[str] = []


# Banners
class BannerCreate(BaseModel):
    name: str
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: str
    link_url: Optional[str] = None
    placement: str = "home"
    target_audience: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    priority: int = 0


class BannerUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    placement: Optional[str] = None
    target_audience: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    priority: Optional[int] = None


# Moderation
class ModerationRulesUpdate(BaseModel):
    auto_approve_verified: bool = False
    require_image: bool = True
    min_description_length: int = 20
    blocked_words: List[str] = []
    flag_new_users: bool = True
    flag_price_threshold: Optional[float] = None


# Data Privacy
class PrivacySettingsUpdate(BaseModel):
    gdpr_enabled: bool = True
    ccpa_enabled: bool = False
    data_retention_days: int = 365
    auto_delete_inactive: bool = False
    inactive_days_threshold: int = 730


# Config
class ConfigUpdate(BaseModel):
    values: Dict[str, Any]


# SEO Tools
class MetaTagsUpdate(BaseModel):
    default_title: str
    default_description: str
    title_template: str = "{page_title} | {site_name}"
    og_image: Optional[str] = None


class RedirectCreate(BaseModel):
    from_path: str
    to_path: str
    type: str = "301"  # 301, 302


# Polls
class PollCreate(BaseModel):
    title: str
    description: Optional[str] = None
    options: List[str]
    allow_multiple: bool = False
    end_date: Optional[str] = None
    target_segment: Optional[str] = None


class PollUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    end_date: Optional[str] = None


# Cookie Consent
class CookieSettingsUpdate(BaseModel):
    enabled: bool = True
    banner_text: str
    accept_button_text: str = "Accept All"
    reject_button_text: str = "Reject All"
    customize_text: str = "Customize"
    position: str = "bottom"  # bottom, top, center


class CookieCategoriesUpdate(BaseModel):
    categories: List[Dict[str, Any]]


# URL Shortener
class ShortUrlCreate(BaseModel):
    original_url: str
    custom_slug: Optional[str] = None
    expires_at: Optional[str] = None


class ShortUrlUpdate(BaseModel):
    original_url: Optional[str] = None
    expires_at: Optional[str] = None
    is_active: Optional[bool] = None


# reCAPTCHA
class RecaptchaSettingsUpdate(BaseModel):
    enabled: bool = True
    site_key: Optional[str] = None
    secret_key: Optional[str] = None
    version: str = "v3"
    score_threshold: float = 0.5


# Image Settings
class ImageSettingsUpdate(BaseModel):
    max_file_size_mb: int = 10
    allowed_formats: List[str] = ["jpg", "jpeg", "png", "webp"]
    max_width: int = 4096
    max_height: int = 4096
    auto_resize: bool = True


class CompressionSettingsUpdate(BaseModel):
    enabled: bool = True
    quality: int = 85
    format: str = "webp"


class WatermarkSettingsUpdate(BaseModel):
    enabled: bool = False
    image_url: Optional[str] = None
    position: str = "bottom-right"
    opacity: float = 0.5


# =============================================================================
# ROUTER FACTORY
# =============================================================================

def create_admin_utility_routes(db: AsyncIOMotorDatabase, require_auth):
    """Create all admin utility routes"""
    
    # =============================================================================
    # 1. REPORTS
    # =============================================================================
    reports_router = APIRouter(prefix="/reports", tags=["Reports"])
    
    @reports_router.get("")
    async def list_reports(
        page: int = Query(default=1, ge=1),
        limit: int = Query(default=50, le=100),
        type: Optional[str] = None,
        status: Optional[str] = None
    ):
        """List all reports"""
        query = {}
        if type:
            query["type"] = type
        if status:
            query["status"] = status
        
        skip = (page - 1) * limit
        reports = await db.reports.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        total = await db.reports.count_documents(query)
        
        for r in reports:
            r["id"] = str(r.pop("_id", r.get("id", "")))
        
        return {"reports": reports, "total": total, "page": page, "pages": (total + limit - 1) // limit}
    
    @reports_router.post("")
    async def create_report(report: ReportCreate, user = Depends(require_auth)):
        """Create a report"""
        report_doc = {
            "id": f"report_{uuid.uuid4().hex[:12]}",
            **report.dict(),
            "reporter_id": user.get("user_id") if isinstance(user, dict) else getattr(user, "user_id", "unknown"),
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": None,
            "resolved_at": None,
            "resolved_by": None
        }
        await db.reports.insert_one(report_doc)
        report_doc.pop("_id", None)
        return report_doc
    
    @reports_router.get("/stats")
    async def get_report_stats():
        """Report statistics"""
        total = await db.reports.count_documents({})
        pending = await db.reports.count_documents({"status": "pending"})
        resolved = await db.reports.count_documents({"status": "resolved"})
        dismissed = await db.reports.count_documents({"status": "dismissed"})
        
        return {
            "total": total,
            "pending": pending,
            "resolved": resolved,
            "dismissed": dismissed,
            "resolution_rate": round(resolved / max(total, 1) * 100, 2)
        }
    
    @reports_router.get("/by-type")
    async def get_reports_by_type():
        """Reports grouped by type"""
        pipeline = [
            {"$group": {"_id": "$type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        results = await db.reports.aggregate(pipeline).to_list(20)
        return {"by_type": {r["_id"] or "unknown": r["count"] for r in results}}
    
    @reports_router.get("/pending")
    async def get_pending_reports(limit: int = Query(default=50)):
        """Pending reports queue"""
        reports = await db.reports.find({"status": "pending"}).sort("created_at", 1).limit(limit).to_list(limit)
        for r in reports:
            r["id"] = str(r.pop("_id", r.get("id", "")))
        return {"reports": reports, "total": len(reports)}
    
    @reports_router.get("/{report_id}")
    async def get_report(report_id: str):
        """Get report details"""
        report = await db.reports.find_one({"id": report_id})
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        report["id"] = str(report.pop("_id", report.get("id", "")))
        return report
    
    @reports_router.put("/{report_id}")
    async def update_report(report_id: str, update: ReportUpdate, admin = Depends(require_auth)):
        """Update report status"""
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.reports.update_one({"id": report_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Report not found")
        return {"status": "updated", "report_id": report_id}
    
    @reports_router.post("/{report_id}/resolve")
    async def resolve_report(report_id: str, resolution: str = Body(..., embed=True), admin = Depends(require_auth)):
        """Resolve a report"""
        update_data = {
            "status": "resolved",
            "resolution": resolution,
            "resolved_at": datetime.now(timezone.utc).isoformat(),
            "resolved_by": admin.get("user_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown")
        }
        
        result = await db.reports.update_one({"id": report_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Report not found")
        return {"status": "resolved", "report_id": report_id}
    
    # =============================================================================
    # 2. SUPPORT TICKETS
    # =============================================================================
    tickets_router = APIRouter(prefix="/tickets", tags=["Support Tickets"])
    
    @tickets_router.get("")
    async def list_tickets(
        page: int = Query(default=1, ge=1),
        limit: int = Query(default=50, le=100),
        status: Optional[str] = None,
        priority: Optional[str] = None
    ):
        """List all support tickets"""
        query = {}
        if status:
            query["status"] = status
        if priority:
            query["priority"] = priority
        
        skip = (page - 1) * limit
        tickets = await db.support_tickets.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        total = await db.support_tickets.count_documents(query)
        
        for t in tickets:
            t["id"] = str(t.pop("_id", t.get("id", "")))
        
        return {"tickets": tickets, "total": total, "page": page, "pages": (total + limit - 1) // limit}
    
    @tickets_router.post("")
    async def create_ticket(ticket: TicketCreate, user = Depends(require_auth)):
        """Create support ticket"""
        ticket_doc = {
            "id": f"ticket_{uuid.uuid4().hex[:12]}",
            **ticket.dict(),
            "user_id": user.get("user_id") if isinstance(user, dict) else getattr(user, "user_id", "unknown"),
            "user_email": user.get("email") if isinstance(user, dict) else getattr(user, "email", ""),
            "status": "open",
            "assigned_to": None,
            "replies": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": None,
            "closed_at": None
        }
        await db.support_tickets.insert_one(ticket_doc)
        ticket_doc.pop("_id", None)
        return ticket_doc
    
    @tickets_router.get("/stats")
    async def get_ticket_stats():
        """Ticket statistics"""
        total = await db.support_tickets.count_documents({})
        open_count = await db.support_tickets.count_documents({"status": "open"})
        pending = await db.support_tickets.count_documents({"status": "pending"})
        resolved = await db.support_tickets.count_documents({"status": "resolved"})
        closed = await db.support_tickets.count_documents({"status": "closed"})
        
        return {
            "total": total,
            "open": open_count,
            "pending": pending,
            "resolved": resolved,
            "closed": closed,
            "avg_resolution_time_hours": 24  # Would calculate from actual data
        }
    
    @tickets_router.get("/by-status")
    async def get_tickets_by_status():
        """Tickets by status"""
        pipeline = [
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]
        results = await db.support_tickets.aggregate(pipeline).to_list(10)
        return {"by_status": {r["_id"] or "unknown": r["count"] for r in results}}
    
    @tickets_router.get("/by-priority")
    async def get_tickets_by_priority():
        """Tickets by priority"""
        pipeline = [
            {"$group": {"_id": "$priority", "count": {"$sum": 1}}}
        ]
        results = await db.support_tickets.aggregate(pipeline).to_list(10)
        return {"by_priority": {r["_id"] or "medium": r["count"] for r in results}}
    
    @tickets_router.get("/{ticket_id}")
    async def get_ticket(ticket_id: str):
        """Get ticket details"""
        ticket = await db.support_tickets.find_one({"id": ticket_id})
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        ticket["id"] = str(ticket.pop("_id", ticket.get("id", "")))
        return ticket
    
    @tickets_router.put("/{ticket_id}")
    async def update_ticket(ticket_id: str, update: TicketUpdate, admin = Depends(require_auth)):
        """Update ticket"""
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.support_tickets.update_one({"id": ticket_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Ticket not found")
        return {"status": "updated", "ticket_id": ticket_id}
    
    @tickets_router.post("/{ticket_id}/reply")
    async def reply_to_ticket(ticket_id: str, reply: TicketReply, user = Depends(require_auth)):
        """Reply to ticket"""
        reply_doc = {
            "id": f"reply_{uuid.uuid4().hex[:8]}",
            "message": reply.message,
            "attachments": reply.attachments,
            "user_id": user.get("user_id") if isinstance(user, dict) else getattr(user, "user_id", "unknown"),
            "is_staff": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = await db.support_tickets.update_one(
            {"id": ticket_id},
            {
                "$push": {"replies": reply_doc},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat(), "status": "pending"}
            }
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Ticket not found")
        return {"status": "replied", "reply": reply_doc}
    
    @tickets_router.post("/{ticket_id}/assign")
    async def assign_ticket(ticket_id: str, agent_id: str = Body(..., embed=True), admin = Depends(require_auth)):
        """Assign ticket to agent"""
        result = await db.support_tickets.update_one(
            {"id": ticket_id},
            {"$set": {"assigned_to": agent_id, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Ticket not found")
        return {"status": "assigned", "ticket_id": ticket_id, "assigned_to": agent_id}
    
    @tickets_router.post("/{ticket_id}/close")
    async def close_ticket(ticket_id: str, admin = Depends(require_auth)):
        """Close ticket"""
        result = await db.support_tickets.update_one(
            {"id": ticket_id},
            {"$set": {
                "status": "closed",
                "closed_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Ticket not found")
        return {"status": "closed", "ticket_id": ticket_id}
    
    # =============================================================================
    # 3. BANNERS
    # =============================================================================
    banners_router = APIRouter(prefix="/banners", tags=["Banners"])
    
    @banners_router.get("")
    async def list_banners(
        placement: Optional[str] = None,
        is_active: Optional[bool] = None
    ):
        """List all banners"""
        query = {}
        if placement:
            query["placement"] = placement
        if is_active is not None:
            query["is_active"] = is_active
        
        banners = await db.banners.find(query).sort("priority", -1).to_list(100)
        for b in banners:
            b["id"] = str(b.pop("_id", b.get("id", "")))
        
        return {"banners": banners, "total": len(banners)}
    
    @banners_router.post("")
    async def create_banner(banner: BannerCreate, admin = Depends(require_auth)):
        """Create banner"""
        banner_doc = {
            "id": f"banner_{uuid.uuid4().hex[:12]}",
            **banner.dict(),
            "is_active": False,
            "impressions": 0,
            "clicks": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": admin.get("user_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown")
        }
        await db.banners.insert_one(banner_doc)
        banner_doc.pop("_id", None)
        return banner_doc
    
    @banners_router.get("/active")
    async def get_active_banners(placement: Optional[str] = None):
        """Get active banners"""
        query = {"is_active": True}
        if placement:
            query["placement"] = placement
        
        now = datetime.now(timezone.utc).isoformat()
        banners = await db.banners.find(query).sort("priority", -1).to_list(50)
        
        active = []
        for b in banners:
            b["id"] = str(b.pop("_id", b.get("id", "")))
            # Check date constraints
            start_ok = not b.get("start_date") or b["start_date"] <= now
            end_ok = not b.get("end_date") or b["end_date"] >= now
            if start_ok and end_ok:
                active.append(b)
        
        return {"banners": active, "total": len(active)}
    
    @banners_router.get("/stats")
    async def get_banner_stats():
        """Banner performance stats"""
        total = await db.banners.count_documents({})
        active = await db.banners.count_documents({"is_active": True})
        
        pipeline = [
            {"$group": {
                "_id": None,
                "total_impressions": {"$sum": "$impressions"},
                "total_clicks": {"$sum": "$clicks"}
            }}
        ]
        stats = await db.banners.aggregate(pipeline).to_list(1)
        
        impressions = stats[0]["total_impressions"] if stats else 0
        clicks = stats[0]["total_clicks"] if stats else 0
        ctr = round(clicks / max(impressions, 1) * 100, 2)
        
        return {
            "total": total,
            "active": active,
            "total_impressions": impressions,
            "total_clicks": clicks,
            "overall_ctr": ctr
        }
    
    @banners_router.get("/analytics")
    async def get_banner_analytics(days: int = Query(default=30)):
        """Banner analytics"""
        pipeline = [
            {"$project": {
                "name": 1,
                "placement": 1,
                "impressions": 1,
                "clicks": 1,
                "ctr": {"$multiply": [{"$divide": ["$clicks", {"$max": ["$impressions", 1]}]}, 100]}
            }},
            {"$sort": {"impressions": -1}},
            {"$limit": 20}
        ]
        banners = await db.banners.aggregate(pipeline).to_list(20)
        
        for b in banners:
            b["id"] = str(b.pop("_id", ""))
            b["ctr"] = round(b.get("ctr", 0), 2)
        
        return {"analytics": banners, "period_days": days}
    
    @banners_router.get("/{banner_id}")
    async def get_banner(banner_id: str):
        """Get banner details"""
        banner = await db.banners.find_one({"id": banner_id})
        if not banner:
            raise HTTPException(status_code=404, detail="Banner not found")
        banner["id"] = str(banner.pop("_id", banner.get("id", "")))
        return banner
    
    @banners_router.put("/{banner_id}")
    async def update_banner(banner_id: str, update: BannerUpdate, admin = Depends(require_auth)):
        """Update banner"""
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.banners.update_one({"id": banner_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Banner not found")
        return {"status": "updated", "banner_id": banner_id}
    
    @banners_router.delete("/{banner_id}")
    async def delete_banner(banner_id: str, admin = Depends(require_auth)):
        """Delete banner"""
        result = await db.banners.delete_one({"id": banner_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Banner not found")
        return {"status": "deleted", "banner_id": banner_id}
    
    @banners_router.post("/{banner_id}/activate")
    async def activate_banner(banner_id: str, admin = Depends(require_auth)):
        """Activate banner"""
        result = await db.banners.update_one({"id": banner_id}, {"$set": {"is_active": True}})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Banner not found")
        return {"status": "activated", "banner_id": banner_id}
    
    @banners_router.post("/{banner_id}/deactivate")
    async def deactivate_banner(banner_id: str, admin = Depends(require_auth)):
        """Deactivate banner"""
        result = await db.banners.update_one({"id": banner_id}, {"$set": {"is_active": False}})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Banner not found")
        return {"status": "deactivated", "banner_id": banner_id}
    
    # =============================================================================
    # 4. MODERATION
    # =============================================================================
    moderation_router = APIRouter(prefix="/moderation", tags=["Moderation"])
    
    @moderation_router.get("")
    async def get_moderation_dashboard():
        """Moderation dashboard"""
        pending_listings = await db.listings.count_documents({"status": "pending_review"})
        pending_reports = await db.reports.count_documents({"status": "pending"})
        flagged = await db.listings.count_documents({"is_flagged": True})
        
        return {
            "overview": {
                "pending_listings": pending_listings,
                "pending_reports": pending_reports,
                "flagged_content": flagged,
                "auto_approved_today": 0,
                "manually_reviewed_today": 0
            }
        }
    
    @moderation_router.get("/queue")
    async def get_moderation_queue(limit: int = Query(default=50)):
        """Moderation queue"""
        listings = await db.listings.find({"status": "pending_review"}).sort("created_at", 1).limit(limit).to_list(limit)
        for l in listings:
            l["id"] = str(l.pop("_id", l.get("id", "")))
        return {"queue": listings, "total": len(listings)}
    
    @moderation_router.get("/reports")
    async def get_moderation_reports(limit: int = Query(default=50)):
        """Content reports"""
        reports = await db.reports.find({"status": "pending"}).sort("created_at", 1).limit(limit).to_list(limit)
        for r in reports:
            r["id"] = str(r.pop("_id", r.get("id", "")))
        return {"reports": reports, "total": len(reports)}
    
    @moderation_router.post("/listings/{listing_id}/approve")
    async def approve_listing(listing_id: str, admin = Depends(require_auth)):
        """Approve listing"""
        result = await db.listings.update_one(
            {"id": listing_id},
            {"$set": {
                "status": "active",
                "moderation_status": "approved",
                "moderated_at": datetime.now(timezone.utc).isoformat(),
                "moderated_by": admin.get("user_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown")
            }}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Listing not found")
        return {"status": "approved", "listing_id": listing_id}
    
    @moderation_router.post("/listings/{listing_id}/reject")
    async def reject_listing(listing_id: str, reason: str = Body(..., embed=True), admin = Depends(require_auth)):
        """Reject listing"""
        result = await db.listings.update_one(
            {"id": listing_id},
            {"$set": {
                "status": "rejected",
                "moderation_status": "rejected",
                "rejection_reason": reason,
                "moderated_at": datetime.now(timezone.utc).isoformat(),
                "moderated_by": admin.get("user_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown")
            }}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Listing not found")
        return {"status": "rejected", "listing_id": listing_id, "reason": reason}
    
    @moderation_router.post("/listings/{listing_id}/flag")
    async def flag_listing(listing_id: str, reason: str = Body(..., embed=True), admin = Depends(require_auth)):
        """Flag listing"""
        result = await db.listings.update_one(
            {"id": listing_id},
            {"$set": {
                "is_flagged": True,
                "flag_reason": reason,
                "flagged_at": datetime.now(timezone.utc).isoformat(),
                "flagged_by": admin.get("user_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown")
            }}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Listing not found")
        return {"status": "flagged", "listing_id": listing_id}
    
    @moderation_router.get("/history")
    async def get_moderation_history(page: int = Query(default=1), limit: int = Query(default=50)):
        """Moderation history"""
        skip = (page - 1) * limit
        history = await db.moderation_logs.find({}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        total = await db.moderation_logs.count_documents({})
        
        for h in history:
            h["id"] = str(h.pop("_id", h.get("id", "")))
        
        return {"history": history, "total": total, "page": page}
    
    @moderation_router.get("/stats")
    async def get_moderation_stats(days: int = Query(default=30)):
        """Moderation statistics"""
        total_reviewed = await db.moderation_logs.count_documents({})
        approved = await db.moderation_logs.count_documents({"action": "approve"})
        rejected = await db.moderation_logs.count_documents({"action": "reject"})
        
        return {
            "period_days": days,
            "total_reviewed": total_reviewed,
            "approved": approved,
            "rejected": rejected,
            "approval_rate": round(approved / max(total_reviewed, 1) * 100, 2)
        }
    
    @moderation_router.get("/rules")
    async def get_moderation_rules():
        """Get auto-moderation rules"""
        rules = await db.moderation_rules.find_one({"id": "global"})
        if not rules:
            rules = {
                "id": "global",
                "auto_approve_verified": False,
                "require_image": True,
                "min_description_length": 20,
                "blocked_words": [],
                "flag_new_users": True,
                "flag_price_threshold": None
            }
        rules.pop("_id", None)
        return rules
    
    @moderation_router.put("/rules")
    async def update_moderation_rules(rules: ModerationRulesUpdate, admin = Depends(require_auth)):
        """Update auto-moderation rules"""
        await db.moderation_rules.update_one(
            {"id": "global"},
            {"$set": {**rules.dict(), "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return {"status": "updated", "rules": rules.dict()}
    
    # =============================================================================
    # 5. DATA PRIVACY
    # =============================================================================
    privacy_router = APIRouter(prefix="/data-privacy", tags=["Data Privacy"])
    
    @privacy_router.get("")
    async def get_privacy_dashboard():
        """Privacy dashboard"""
        pending_requests = await db.privacy_requests.count_documents({"status": "pending"})
        exports_pending = await db.privacy_requests.count_documents({"type": "export", "status": "pending"})
        deletions_pending = await db.privacy_requests.count_documents({"type": "deletion", "status": "pending"})
        
        return {
            "overview": {
                "pending_requests": pending_requests,
                "exports_pending": exports_pending,
                "deletions_pending": deletions_pending,
                "processed_this_month": 0
            }
        }
    
    @privacy_router.get("/requests")
    async def get_privacy_requests(
        type: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = Query(default=50)
    ):
        """Data access/deletion requests"""
        query = {}
        if type:
            query["type"] = type
        if status:
            query["status"] = status
        
        requests = await db.privacy_requests.find(query).sort("created_at", -1).limit(limit).to_list(limit)
        for r in requests:
            r["id"] = str(r.pop("_id", r.get("id", "")))
        
        return {"requests": requests, "total": len(requests)}
    
    @privacy_router.post("/requests/{request_id}/approve")
    async def approve_privacy_request(request_id: str, admin = Depends(require_auth)):
        """Approve privacy request"""
        result = await db.privacy_requests.update_one(
            {"id": request_id},
            {"$set": {
                "status": "approved",
                "processed_at": datetime.now(timezone.utc).isoformat(),
                "processed_by": admin.get("user_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown")
            }}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Request not found")
        return {"status": "approved", "request_id": request_id}
    
    @privacy_router.post("/requests/{request_id}/reject")
    async def reject_privacy_request(request_id: str, reason: str = Body(..., embed=True), admin = Depends(require_auth)):
        """Reject privacy request"""
        result = await db.privacy_requests.update_one(
            {"id": request_id},
            {"$set": {
                "status": "rejected",
                "rejection_reason": reason,
                "processed_at": datetime.now(timezone.utc).isoformat(),
                "processed_by": admin.get("user_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown")
            }}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Request not found")
        return {"status": "rejected", "request_id": request_id}
    
    @privacy_router.get("/settings")
    async def get_privacy_settings():
        """Privacy settings"""
        settings = await db.privacy_settings.find_one({"id": "global"})
        if not settings:
            settings = {
                "id": "global",
                "gdpr_enabled": True,
                "ccpa_enabled": False,
                "data_retention_days": 365,
                "auto_delete_inactive": False,
                "inactive_days_threshold": 730
            }
        settings.pop("_id", None)
        return settings
    
    @privacy_router.put("/settings")
    async def update_privacy_settings(settings: PrivacySettingsUpdate, admin = Depends(require_auth)):
        """Update privacy settings"""
        await db.privacy_settings.update_one(
            {"id": "global"},
            {"$set": {**settings.dict(), "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return {"status": "updated", "settings": settings.dict()}
    
    @privacy_router.get("/consent-logs")
    async def get_consent_logs(limit: int = Query(default=50)):
        """User consent logs"""
        logs = await db.consent_logs.find({}).sort("created_at", -1).limit(limit).to_list(limit)
        for l in logs:
            l["id"] = str(l.pop("_id", l.get("id", "")))
        return {"logs": logs, "total": len(logs)}
    
    @privacy_router.get("/exports")
    async def get_data_exports():
        """Data export requests"""
        exports = await db.privacy_requests.find({"type": "export"}).sort("created_at", -1).to_list(50)
        for e in exports:
            e["id"] = str(e.pop("_id", e.get("id", "")))
        return {"exports": exports, "total": len(exports)}
    
    @privacy_router.post("/users/{user_id}/export")
    async def export_user_data(user_id: str, admin = Depends(require_auth)):
        """Export user data"""
        request_doc = {
            "id": f"export_{uuid.uuid4().hex[:12]}",
            "type": "export",
            "user_id": user_id,
            "status": "processing",
            "requested_at": datetime.now(timezone.utc).isoformat(),
            "requested_by": admin.get("user_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown")
        }
        await db.privacy_requests.insert_one(request_doc)
        request_doc.pop("_id", None)
        return {"status": "processing", "export_id": request_doc["id"], "message": "Export will be ready shortly"}
    
    @privacy_router.post("/users/{user_id}/delete")
    async def delete_user_data(user_id: str, admin = Depends(require_auth)):
        """Delete user data (GDPR)"""
        request_doc = {
            "id": f"delete_{uuid.uuid4().hex[:12]}",
            "type": "deletion",
            "user_id": user_id,
            "status": "pending",
            "requested_at": datetime.now(timezone.utc).isoformat(),
            "requested_by": admin.get("user_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown")
        }
        await db.privacy_requests.insert_one(request_doc)
        request_doc.pop("_id", None)
        return {"status": "pending", "deletion_id": request_doc["id"], "message": "Deletion request submitted for review"}
    
    # =============================================================================
    # 6. CONFIG MANAGER
    # =============================================================================
    config_router = APIRouter(prefix="/config", tags=["Config Manager"])
    
    @config_router.get("")
    async def get_all_config():
        """Get all configurations"""
        configs = await db.system_config.find({}).to_list(100)
        result = {}
        for c in configs:
            c.pop("_id", None)
            category = c.get("category", "general")
            if category not in result:
                result[category] = {}
            result[category].update(c.get("values", {}))
        
        # Add defaults if empty
        if not result:
            result = {
                "general": {"site_name": "Marketplace", "site_url": "", "contact_email": ""},
                "features": {"listings_enabled": True, "chat_enabled": True, "payments_enabled": True},
                "limits": {"max_listings_per_user": 50, "max_images_per_listing": 10}
            }
        
        return {"config": result}
    
    @config_router.put("")
    async def update_all_config(config: ConfigUpdate, admin = Depends(require_auth)):
        """Update configurations"""
        for category, values in config.values.items():
            await db.system_config.update_one(
                {"category": category},
                {"$set": {"values": values, "updated_at": datetime.now(timezone.utc).isoformat()}},
                upsert=True
            )
        return {"status": "updated"}
    
    @config_router.get("/categories")
    async def get_config_categories():
        """Config categories"""
        return {
            "categories": [
                {"id": "general", "name": "General Settings", "description": "Basic site configuration"},
                {"id": "features", "name": "Feature Toggles", "description": "Enable/disable features"},
                {"id": "limits", "name": "Limits & Quotas", "description": "Usage limits"},
                {"id": "notifications", "name": "Notifications", "description": "Notification settings"},
                {"id": "payments", "name": "Payments", "description": "Payment configuration"},
                {"id": "seo", "name": "SEO", "description": "SEO settings"}
            ]
        }
    
    @config_router.get("/{category}")
    async def get_config_by_category(category: str):
        """Get config by category"""
        config = await db.system_config.find_one({"category": category})
        if not config:
            config = {"category": category, "values": {}}
        config.pop("_id", None)
        return config
    
    @config_router.put("/{category}")
    async def update_config_category(category: str, values: Dict = Body(...), admin = Depends(require_auth)):
        """Update config category"""
        await db.system_config.update_one(
            {"category": category},
            {"$set": {"values": values, "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return {"status": "updated", "category": category}
    
    @config_router.get("/history")
    async def get_config_history(limit: int = Query(default=50)):
        """Configuration change history"""
        history = await db.config_history.find({}).sort("timestamp", -1).limit(limit).to_list(limit)
        for h in history:
            h["id"] = str(h.pop("_id", h.get("id", "")))
        return {"history": history, "total": len(history)}
    
    @config_router.post("/reset")
    async def reset_to_defaults(admin = Depends(require_auth)):
        """Reset to defaults"""
        defaults = {
            "general": {"site_name": "Marketplace", "site_url": "", "contact_email": ""},
            "features": {"listings_enabled": True, "chat_enabled": True, "payments_enabled": True},
            "limits": {"max_listings_per_user": 50, "max_images_per_listing": 10}
        }
        
        for category, values in defaults.items():
            await db.system_config.update_one(
                {"category": category},
                {"$set": {"values": values, "updated_at": datetime.now(timezone.utc).isoformat()}},
                upsert=True
            )
        
        return {"status": "reset", "message": "Configuration reset to defaults"}
    
    # =============================================================================
    # 7. SEO TOOLS
    # =============================================================================
    seo_tools_router = APIRouter(prefix="/seo-tools", tags=["SEO Tools"])
    
    @seo_tools_router.get("")
    async def get_seo_tools_dashboard():
        """SEO tools dashboard"""
        return {
            "overview": {
                "sitemap_configured": True,
                "robots_configured": True,
                "meta_tags_configured": True,
                "redirects_count": 0
            }
        }
    
    @seo_tools_router.get("/meta-tags")
    async def get_meta_tags():
        """Meta tag templates"""
        config = await db.seo_meta_config.find_one({"id": "global"})
        if not config:
            config = {
                "id": "global",
                "default_title": "Marketplace - Buy & Sell",
                "default_description": "Find great deals on our marketplace",
                "title_template": "{page_title} | {site_name}",
                "og_image": None
            }
        config.pop("_id", None)
        return config
    
    @seo_tools_router.put("/meta-tags")
    async def update_meta_tags(meta: MetaTagsUpdate, admin = Depends(require_auth)):
        """Update meta tags"""
        await db.seo_meta_config.update_one(
            {"id": "global"},
            {"$set": {**meta.dict(), "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return {"status": "updated"}
    
    @seo_tools_router.get("/sitemap")
    async def get_sitemap_settings():
        """Sitemap settings"""
        config = await db.sitemap_config.find_one({"id": "global"})
        if not config:
            config = {
                "id": "global",
                "enabled": True,
                "include_listings": True,
                "include_categories": True,
                "include_static_pages": True,
                "change_frequency": "daily",
                "last_generated": None
            }
        config.pop("_id", None)
        return config
    
    @seo_tools_router.post("/sitemap/generate")
    async def generate_sitemap(admin = Depends(require_auth)):
        """Generate sitemap"""
        await db.sitemap_config.update_one(
            {"id": "global"},
            {"$set": {"last_generated": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return {"status": "generated", "url": "/sitemap.xml", "generated_at": datetime.now(timezone.utc).isoformat()}
    
    @seo_tools_router.get("/robots")
    async def get_robots_settings():
        """Robots.txt settings"""
        config = await db.robots_config.find_one({"id": "global"})
        if not config:
            config = {
                "id": "global",
                "content": "User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\nSitemap: /sitemap.xml"
            }
        config.pop("_id", None)
        return config
    
    @seo_tools_router.put("/robots")
    async def update_robots_settings(content: str = Body(..., embed=True), admin = Depends(require_auth)):
        """Update robots.txt"""
        await db.robots_config.update_one(
            {"id": "global"},
            {"$set": {"content": content, "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return {"status": "updated"}
    
    @seo_tools_router.get("/redirects")
    async def get_redirects():
        """URL redirects"""
        redirects = await db.url_redirects.find({}).to_list(100)
        for r in redirects:
            r["id"] = str(r.pop("_id", r.get("id", "")))
        return {"redirects": redirects, "total": len(redirects)}
    
    @seo_tools_router.post("/redirects")
    async def create_redirect(redirect: RedirectCreate, admin = Depends(require_auth)):
        """Create redirect"""
        redirect_doc = {
            "id": f"redirect_{uuid.uuid4().hex[:8]}",
            **redirect.dict(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.url_redirects.insert_one(redirect_doc)
        redirect_doc.pop("_id", None)
        return redirect_doc
    
    @seo_tools_router.delete("/redirects/{redirect_id}")
    async def delete_redirect(redirect_id: str, admin = Depends(require_auth)):
        """Delete redirect"""
        result = await db.url_redirects.delete_one({"id": redirect_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Redirect not found")
        return {"status": "deleted", "redirect_id": redirect_id}
    
    # =============================================================================
    # 8. POLLS & SURVEYS
    # =============================================================================
    polls_router = APIRouter(prefix="/polls", tags=["Polls & Surveys"])
    
    @polls_router.get("")
    async def list_polls(status: Optional[str] = None):
        """List all polls"""
        query = {}
        if status:
            query["status"] = status
        
        polls = await db.polls.find(query).sort("created_at", -1).to_list(50)
        for p in polls:
            p["id"] = str(p.pop("_id", p.get("id", "")))
        
        return {"polls": polls, "total": len(polls)}
    
    @polls_router.post("")
    async def create_poll(poll: PollCreate, admin = Depends(require_auth)):
        """Create poll"""
        poll_doc = {
            "id": f"poll_{uuid.uuid4().hex[:12]}",
            **poll.dict(),
            "status": "draft",
            "votes": {opt: 0 for opt in poll.options},
            "total_votes": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": admin.get("user_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown")
        }
        await db.polls.insert_one(poll_doc)
        poll_doc.pop("_id", None)
        return poll_doc
    
    @polls_router.get("/active")
    async def get_active_polls():
        """Get active polls"""
        polls = await db.polls.find({"status": "active"}).to_list(20)
        for p in polls:
            p["id"] = str(p.pop("_id", p.get("id", "")))
        return {"polls": polls, "total": len(polls)}
    
    @polls_router.get("/{poll_id}")
    async def get_poll(poll_id: str):
        """Get poll details"""
        poll = await db.polls.find_one({"id": poll_id})
        if not poll:
            raise HTTPException(status_code=404, detail="Poll not found")
        poll["id"] = str(poll.pop("_id", poll.get("id", "")))
        return poll
    
    @polls_router.put("/{poll_id}")
    async def update_poll(poll_id: str, update: PollUpdate, admin = Depends(require_auth)):
        """Update poll"""
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.polls.update_one({"id": poll_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Poll not found")
        return {"status": "updated", "poll_id": poll_id}
    
    @polls_router.delete("/{poll_id}")
    async def delete_poll(poll_id: str, admin = Depends(require_auth)):
        """Delete poll"""
        result = await db.polls.delete_one({"id": poll_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Poll not found")
        return {"status": "deleted", "poll_id": poll_id}
    
    @polls_router.get("/{poll_id}/results")
    async def get_poll_results(poll_id: str):
        """Poll results"""
        poll = await db.polls.find_one({"id": poll_id})
        if not poll:
            raise HTTPException(status_code=404, detail="Poll not found")
        
        votes = poll.get("votes", {})
        total = poll.get("total_votes", 0) or 1
        
        results = {
            opt: {"count": count, "percentage": round(count / total * 100, 2)}
            for opt, count in votes.items()
        }
        
        return {"poll_id": poll_id, "results": results, "total_votes": poll.get("total_votes", 0)}
    
    @polls_router.post("/{poll_id}/activate")
    async def activate_poll(poll_id: str, admin = Depends(require_auth)):
        """Activate poll"""
        result = await db.polls.update_one(
            {"id": poll_id},
            {"$set": {"status": "active", "activated_at": datetime.now(timezone.utc).isoformat()}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Poll not found")
        return {"status": "activated", "poll_id": poll_id}
    
    @polls_router.post("/{poll_id}/close")
    async def close_poll(poll_id: str, admin = Depends(require_auth)):
        """Close poll"""
        result = await db.polls.update_one(
            {"id": poll_id},
            {"$set": {"status": "closed", "closed_at": datetime.now(timezone.utc).isoformat()}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Poll not found")
        return {"status": "closed", "poll_id": poll_id}
    
    # =============================================================================
    # 9. COOKIE CONSENT
    # =============================================================================
    cookie_router = APIRouter(prefix="/cookie-consent", tags=["Cookie Consent"])
    
    @cookie_router.get("")
    async def get_cookie_settings():
        """Cookie consent settings"""
        config = await db.cookie_config.find_one({"id": "global"})
        if not config:
            config = {
                "id": "global",
                "enabled": True,
                "banner_text": "We use cookies to improve your experience.",
                "accept_button_text": "Accept All",
                "reject_button_text": "Reject All",
                "customize_text": "Customize",
                "position": "bottom"
            }
        config.pop("_id", None)
        return config
    
    @cookie_router.put("")
    async def update_cookie_settings(settings: CookieSettingsUpdate, admin = Depends(require_auth)):
        """Update cookie settings"""
        await db.cookie_config.update_one(
            {"id": "global"},
            {"$set": {**settings.dict(), "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return {"status": "updated"}
    
    @cookie_router.get("/categories")
    async def get_cookie_categories():
        """Cookie categories"""
        config = await db.cookie_categories.find_one({"id": "global"})
        if not config:
            config = {
                "categories": [
                    {"id": "necessary", "name": "Necessary", "required": True, "description": "Essential for website function"},
                    {"id": "analytics", "name": "Analytics", "required": False, "description": "Help us understand usage"},
                    {"id": "marketing", "name": "Marketing", "required": False, "description": "Personalized ads"},
                    {"id": "preferences", "name": "Preferences", "required": False, "description": "Remember your settings"}
                ]
            }
        config.pop("_id", None)
        return config
    
    @cookie_router.put("/categories")
    async def update_cookie_categories(categories: CookieCategoriesUpdate, admin = Depends(require_auth)):
        """Update cookie categories"""
        await db.cookie_categories.update_one(
            {"id": "global"},
            {"$set": {**categories.dict(), "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return {"status": "updated"}
    
    @cookie_router.get("/banner")
    async def get_cookie_banner():
        """Banner configuration"""
        config = await db.cookie_config.find_one({"id": "global"})
        if not config:
            config = {
                "enabled": True,
                "banner_text": "We use cookies to improve your experience.",
                "accept_button_text": "Accept All",
                "reject_button_text": "Reject All",
                "position": "bottom"
            }
        config.pop("_id", None)
        return {"banner": config}
    
    @cookie_router.put("/banner")
    async def update_cookie_banner(banner: Dict = Body(...), admin = Depends(require_auth)):
        """Update banner config"""
        await db.cookie_config.update_one(
            {"id": "global"},
            {"$set": {**banner, "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return {"status": "updated"}
    
    @cookie_router.get("/logs")
    async def get_consent_logs_cookie(limit: int = Query(default=50)):
        """Consent logs"""
        logs = await db.cookie_consent_logs.find({}).sort("timestamp", -1).limit(limit).to_list(limit)
        for l in logs:
            l["id"] = str(l.pop("_id", l.get("id", "")))
        return {"logs": logs, "total": len(logs)}
    
    @cookie_router.get("/stats")
    async def get_consent_stats():
        """Consent statistics"""
        total = await db.cookie_consent_logs.count_documents({})
        accepted_all = await db.cookie_consent_logs.count_documents({"consent_type": "accept_all"})
        rejected_all = await db.cookie_consent_logs.count_documents({"consent_type": "reject_all"})
        customized = await db.cookie_consent_logs.count_documents({"consent_type": "customized"})
        
        return {
            "total_interactions": total,
            "accepted_all": accepted_all,
            "rejected_all": rejected_all,
            "customized": customized,
            "acceptance_rate": round(accepted_all / max(total, 1) * 100, 2)
        }
    
    # =============================================================================
    # 10. URL SHORTENER
    # =============================================================================
    shorturl_router = APIRouter(prefix="/short-urls", tags=["URL Shortener"])
    
    @shorturl_router.get("")
    async def list_short_urls(limit: int = Query(default=50)):
        """List shortened URLs"""
        urls = await db.short_urls.find({}).sort("created_at", -1).limit(limit).to_list(limit)
        for u in urls:
            u["id"] = str(u.pop("_id", u.get("id", "")))
        return {"urls": urls, "total": len(urls)}
    
    @shorturl_router.post("")
    async def create_short_url(url_data: ShortUrlCreate, admin = Depends(require_auth)):
        """Create short URL"""
        slug = url_data.custom_slug or hashlib.md5(url_data.original_url.encode()).hexdigest()[:8]
        
        # Check if slug exists
        existing = await db.short_urls.find_one({"slug": slug})
        if existing:
            slug = slug + uuid.uuid4().hex[:4]
        
        url_doc = {
            "id": f"url_{uuid.uuid4().hex[:12]}",
            "original_url": url_data.original_url,
            "slug": slug,
            "short_url": f"/s/{slug}",
            "expires_at": url_data.expires_at,
            "is_active": True,
            "clicks": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": admin.get("user_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown")
        }
        await db.short_urls.insert_one(url_doc)
        url_doc.pop("_id", None)
        return url_doc
    
    @shorturl_router.get("/analytics")
    async def get_url_analytics():
        """Overall analytics"""
        total = await db.short_urls.count_documents({})
        active = await db.short_urls.count_documents({"is_active": True})
        
        pipeline = [{"$group": {"_id": None, "total_clicks": {"$sum": "$clicks"}}}]
        stats = await db.short_urls.aggregate(pipeline).to_list(1)
        total_clicks = stats[0]["total_clicks"] if stats else 0
        
        return {
            "total_urls": total,
            "active_urls": active,
            "total_clicks": total_clicks,
            "avg_clicks_per_url": round(total_clicks / max(total, 1), 2)
        }
    
    @shorturl_router.get("/{url_id}")
    async def get_short_url(url_id: str):
        """Get URL details"""
        url = await db.short_urls.find_one({"id": url_id})
        if not url:
            raise HTTPException(status_code=404, detail="URL not found")
        url["id"] = str(url.pop("_id", url.get("id", "")))
        return url
    
    @shorturl_router.put("/{url_id}")
    async def update_short_url(url_id: str, update: ShortUrlUpdate, admin = Depends(require_auth)):
        """Update URL"""
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.short_urls.update_one({"id": url_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="URL not found")
        return {"status": "updated", "url_id": url_id}
    
    @shorturl_router.delete("/{url_id}")
    async def delete_short_url(url_id: str, admin = Depends(require_auth)):
        """Delete URL"""
        result = await db.short_urls.delete_one({"id": url_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="URL not found")
        return {"status": "deleted", "url_id": url_id}
    
    @shorturl_router.get("/{url_id}/stats")
    async def get_url_stats(url_id: str):
        """URL click statistics"""
        url = await db.short_urls.find_one({"id": url_id})
        if not url:
            raise HTTPException(status_code=404, detail="URL not found")
        
        return {
            "url_id": url_id,
            "clicks": url.get("clicks", 0),
            "last_clicked": url.get("last_clicked"),
            "created_at": url.get("created_at")
        }
    
    # =============================================================================
    # 11. RECAPTCHA
    # =============================================================================
    recaptcha_router = APIRouter(prefix="/recaptcha", tags=["reCAPTCHA"])
    
    @recaptcha_router.get("")
    async def get_recaptcha_settings():
        """reCAPTCHA settings"""
        config = await db.recaptcha_config.find_one({"id": "global"})
        if not config:
            config = {
                "id": "global",
                "enabled": False,
                "version": "v3",
                "score_threshold": 0.5,
                "protected_actions": ["login", "register", "create_listing"]
            }
        config.pop("_id", None)
        # Don't expose secret key
        config.pop("secret_key", None)
        return config
    
    @recaptcha_router.put("")
    async def update_recaptcha_settings(settings: RecaptchaSettingsUpdate, admin = Depends(require_auth)):
        """Update reCAPTCHA settings"""
        update_data = settings.dict()
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.recaptcha_config.update_one(
            {"id": "global"},
            {"$set": update_data},
            upsert=True
        )
        return {"status": "updated"}
    
    @recaptcha_router.get("/stats")
    async def get_recaptcha_stats():
        """Verification statistics"""
        total = await db.recaptcha_logs.count_documents({})
        passed = await db.recaptcha_logs.count_documents({"passed": True})
        failed = await db.recaptcha_logs.count_documents({"passed": False})
        
        return {
            "total_verifications": total,
            "passed": passed,
            "failed": failed,
            "pass_rate": round(passed / max(total, 1) * 100, 2)
        }
    
    @recaptcha_router.get("/logs")
    async def get_recaptcha_logs(limit: int = Query(default=50)):
        """Verification logs"""
        logs = await db.recaptcha_logs.find({}).sort("timestamp", -1).limit(limit).to_list(limit)
        for l in logs:
            l["id"] = str(l.pop("_id", l.get("id", "")))
        return {"logs": logs, "total": len(logs)}
    
    @recaptcha_router.put("/thresholds")
    async def update_recaptcha_thresholds(thresholds: Dict = Body(...), admin = Depends(require_auth)):
        """Update score thresholds"""
        await db.recaptcha_config.update_one(
            {"id": "global"},
            {"$set": {"thresholds": thresholds, "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return {"status": "updated", "thresholds": thresholds}
    
    # =============================================================================
    # 12. IMAGE SETTINGS
    # =============================================================================
    image_settings_router = APIRouter(prefix="/image-settings", tags=["Image Settings"])
    
    @image_settings_router.get("")
    async def get_image_settings():
        """Image configuration"""
        config = await db.image_settings.find_one({"id": "global"})
        if not config:
            config = {
                "id": "global",
                "max_file_size_mb": 10,
                "allowed_formats": ["jpg", "jpeg", "png", "webp"],
                "max_width": 4096,
                "max_height": 4096,
                "auto_resize": True
            }
        config.pop("_id", None)
        return config
    
    @image_settings_router.put("")
    async def update_image_settings(settings: ImageSettingsUpdate, admin = Depends(require_auth)):
        """Update image settings"""
        await db.image_settings.update_one(
            {"id": "global"},
            {"$set": {**settings.dict(), "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return {"status": "updated"}
    
    @image_settings_router.get("/compression")
    async def get_compression_settings():
        """Compression settings"""
        config = await db.image_compression.find_one({"id": "global"})
        if not config:
            config = {
                "id": "global",
                "enabled": True,
                "quality": 85,
                "format": "webp",
                "max_size_kb": 500
            }
        config.pop("_id", None)
        return config
    
    @image_settings_router.put("/compression")
    async def update_compression_settings(settings: CompressionSettingsUpdate, admin = Depends(require_auth)):
        """Update compression settings"""
        await db.image_compression.update_one(
            {"id": "global"},
            {"$set": {**settings.dict(), "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return {"status": "updated"}
    
    @image_settings_router.get("/watermark")
    async def get_watermark_settings():
        """Watermark settings"""
        config = await db.image_watermark.find_one({"id": "global"})
        if not config:
            config = {
                "id": "global",
                "enabled": False,
                "image_url": None,
                "position": "bottom-right",
                "opacity": 0.5
            }
        config.pop("_id", None)
        return config
    
    @image_settings_router.put("/watermark")
    async def update_watermark_settings(settings: WatermarkSettingsUpdate, admin = Depends(require_auth)):
        """Update watermark settings"""
        await db.image_watermark.update_one(
            {"id": "global"},
            {"$set": {**settings.dict(), "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return {"status": "updated"}
    
    @image_settings_router.get("/limits")
    async def get_upload_limits():
        """Upload limits"""
        config = await db.upload_limits.find_one({"id": "global"})
        if not config:
            config = {
                "id": "global",
                "max_images_per_listing": 10,
                "max_file_size_mb": 10,
                "max_total_size_mb": 50,
                "allowed_formats": ["jpg", "jpeg", "png", "webp", "gif"]
            }
        config.pop("_id", None)
        return config
    
    @image_settings_router.put("/limits")
    async def update_upload_limits(limits: Dict = Body(...), admin = Depends(require_auth)):
        """Update upload limits"""
        await db.upload_limits.update_one(
            {"id": "global"},
            {"$set": {**limits, "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return {"status": "updated"}
    
    # Return all routers
    return {
        "reports": reports_router,
        "tickets": tickets_router,
        "banners": banners_router,
        "moderation": moderation_router,
        "data_privacy": privacy_router,
        "config": config_router,
        "seo_tools": seo_tools_router,
        "polls": polls_router,
        "cookie_consent": cookie_router,
        "short_urls": shorturl_router,
        "recaptcha": recaptcha_router,
        "image_settings": image_settings_router
    }
