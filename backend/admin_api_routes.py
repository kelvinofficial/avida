"""
Admin API Routes - Public facing API endpoints for admin dashboard features

This module provides simplified, public-facing API routes for:
1. Segment Builder
2. Smart Notifications
3. Notification Analytics
4. AI Personalization
5. SMS & WhatsApp Configuration
6. AI Listing Analyzer
7. A/B Testing
8. API Integrations & Webhooks
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

class SegmentRule(BaseModel):
    field: str
    operator: str  # equals, not_equals, greater_than, less_than, contains, etc.
    value: Any


class SegmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    rules: List[SegmentRule] = []
    logic: str = "AND"  # AND or OR


class SegmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    rules: Optional[List[SegmentRule]] = None
    logic: Optional[str] = None


class NotificationRuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    trigger_type: str  # new_listing, price_drop, message, etc.
    conditions: Dict[str, Any] = {}
    channels: List[str] = ["push", "email"]
    template_id: Optional[str] = None
    enabled: bool = True
    schedule: Optional[Dict[str, Any]] = None


class NotificationRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trigger_type: Optional[str] = None
    conditions: Optional[Dict[str, Any]] = None
    channels: Optional[List[str]] = None
    template_id: Optional[str] = None
    enabled: Optional[bool] = None
    schedule: Optional[Dict[str, Any]] = None


class AIPersonalizationSettings(BaseModel):
    enabled: bool = True
    model_provider: str = "openai"
    model_name: str = "gpt-4o"
    default_style: str = "friendly"
    max_title_length: int = 60
    max_body_length: int = 150


class SMSConfigUpdate(BaseModel):
    provider: str  # twilio, africas_talking, local_gateway
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    sender_id: Optional[str] = None
    enabled: bool = False


class SMSTemplateCreate(BaseModel):
    name: str
    content: str
    variables: List[str] = []
    language: str = "en"


class WhatsAppConfigUpdate(BaseModel):
    provider: str  # twilio, meta_business
    api_key: Optional[str] = None
    phone_number_id: Optional[str] = None
    enabled: bool = False


class AIAnalyzerConfigUpdate(BaseModel):
    enabled: bool = True
    max_uses_per_day_free: int = 3
    max_uses_per_day_verified: int = 10
    max_uses_per_day_premium: int = 50
    enable_price_suggestions: bool = True
    enable_category_suggestions: bool = True


class AnalyzeListingRequest(BaseModel):
    listing_id: Optional[str] = None
    images: List[str] = []
    title: Optional[str] = None
    description: Optional[str] = None


class ABTestCreate(BaseModel):
    name: str
    description: Optional[str] = None
    variants: List[Dict[str, Any]]
    traffic_split: Dict[str, float] = {}
    metric: str = "click_rate"
    target_segment: Optional[str] = None


class ABTestUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    variants: Optional[List[Dict[str, Any]]] = None
    traffic_split: Optional[Dict[str, float]] = None
    metric: Optional[str] = None


class IntegrationConnect(BaseModel):
    credentials: Dict[str, str]
    settings: Optional[Dict[str, Any]] = None


class WebhookCreate(BaseModel):
    name: str
    url: str
    events: List[str]
    secret: Optional[str] = None
    enabled: bool = True


class APIKeyCreate(BaseModel):
    name: str
    permissions: List[str] = ["read"]
    expires_in_days: Optional[int] = None


# =============================================================================
# ROUTER FACTORY
# =============================================================================

def create_admin_api_routes(db: AsyncIOMotorDatabase, require_auth):
    """Create all admin API routes"""
    
    # =============================================================================
    # SEGMENTS ROUTER
    # =============================================================================
    segments_router = APIRouter(prefix="/segments", tags=["Segments"])
    
    @segments_router.get("")
    async def list_segments():
        """List all user segments"""
        # Predefined segments
        predefined = [
            {"id": "all_users", "name": "All Users", "description": "All registered users", "rules": [], "is_predefined": True},
            {"id": "active_buyers", "name": "Active Buyers", "description": "Users who have made purchases", "rules": [{"field": "total_purchases", "operator": "greater_than", "value": 0}], "is_predefined": True},
            {"id": "active_sellers", "name": "Active Sellers", "description": "Users with listings", "rules": [{"field": "listings_count", "operator": "greater_than", "value": 0}], "is_predefined": True},
            {"id": "inactive_users", "name": "Inactive Users", "description": "30+ days inactive", "rules": [{"field": "last_activity", "operator": "days_ago_more_than", "value": 30}], "is_predefined": True},
            {"id": "new_users", "name": "New Users", "description": "Registered in last 7 days", "rules": [{"field": "created_at", "operator": "days_ago_less_than", "value": 7}], "is_predefined": True},
        ]
        
        # Custom segments from DB
        custom_segments = await db.segments.find({"is_predefined": {"$ne": True}}).to_list(100)
        for seg in custom_segments:
            seg["id"] = str(seg.pop("_id", seg.get("id", "")))
        
        return {"segments": predefined + custom_segments, "total": len(predefined) + len(custom_segments)}
    
    @segments_router.post("")
    async def create_segment(segment: SegmentCreate, admin = Depends(require_auth)):
        """Create a new user segment"""
        segment_doc = {
            "id": f"seg_{uuid.uuid4().hex[:12]}",
            "name": segment.name,
            "description": segment.description,
            "rules": [r.dict() for r in segment.rules],
            "logic": segment.logic,
            "is_predefined": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": admin.get("admin_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown"),
            "user_count": 0
        }
        await db.segments.insert_one(segment_doc)
        segment_doc.pop("_id", None)
        return segment_doc
    
    @segments_router.get("/fields")
    async def get_segment_fields():
        """Get available fields for segmentation"""
        return {
            "fields": [
                {"name": "created_at", "label": "Registration Date", "type": "date", "operators": ["equals", "greater_than", "less_than", "days_ago_more_than", "days_ago_less_than"]},
                {"name": "last_activity", "label": "Last Activity", "type": "date", "operators": ["equals", "greater_than", "less_than", "days_ago_more_than", "days_ago_less_than"]},
                {"name": "total_purchases", "label": "Total Purchases", "type": "number", "operators": ["equals", "greater_than", "less_than", "between"]},
                {"name": "listings_count", "label": "Listings Count", "type": "number", "operators": ["equals", "greater_than", "less_than", "between"]},
                {"name": "total_views", "label": "Total Views", "type": "number", "operators": ["equals", "greater_than", "less_than", "between"]},
                {"name": "verified", "label": "Email Verified", "type": "boolean", "operators": ["equals"]},
                {"name": "country", "label": "Country", "type": "string", "operators": ["equals", "not_equals", "in", "not_in"]},
                {"name": "city", "label": "City", "type": "string", "operators": ["equals", "not_equals", "in", "not_in"]},
                {"name": "categories_interested", "label": "Categories Interested", "type": "array", "operators": ["contains", "not_contains"]},
                {"name": "subscription_tier", "label": "Subscription Tier", "type": "string", "operators": ["equals", "not_equals", "in"]},
            ]
        }
    
    @segments_router.get("/{segment_id}")
    async def get_segment(segment_id: str):
        """Get segment details"""
        segment = await db.segments.find_one({"id": segment_id})
        if not segment:
            # Check predefined
            predefined = {
                "all_users": {"id": "all_users", "name": "All Users", "description": "All registered users", "rules": [], "is_predefined": True},
                "active_buyers": {"id": "active_buyers", "name": "Active Buyers", "description": "Users who have made purchases", "rules": [{"field": "total_purchases", "operator": "greater_than", "value": 0}], "is_predefined": True},
            }
            if segment_id in predefined:
                return predefined[segment_id]
            raise HTTPException(status_code=404, detail="Segment not found")
        segment["id"] = str(segment.pop("_id", segment.get("id", "")))
        return segment
    
    @segments_router.put("/{segment_id}")
    async def update_segment(segment_id: str, update: SegmentUpdate, admin = Depends(require_auth)):
        """Update a segment"""
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        if "rules" in update_data:
            update_data["rules"] = [r if isinstance(r, dict) else r.dict() for r in update_data["rules"]]
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.segments.update_one({"id": segment_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Segment not found")
        
        return {"status": "updated", "segment_id": segment_id}
    
    @segments_router.delete("/{segment_id}")
    async def delete_segment(segment_id: str, admin = Depends(require_auth)):
        """Delete a segment"""
        result = await db.segments.delete_one({"id": segment_id, "is_predefined": {"$ne": True}})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Segment not found or is predefined")
        return {"status": "deleted", "segment_id": segment_id}
    
    # =============================================================================
    # SMART NOTIFICATIONS ROUTER
    # =============================================================================
    smart_notif_router = APIRouter(prefix="/smart-notifications", tags=["Smart Notifications"])
    
    @smart_notif_router.get("")
    async def list_notification_rules():
        """List all automation rules"""
        rules = await db.notification_rules.find({}).to_list(100)
        for rule in rules:
            rule["id"] = str(rule.pop("_id", rule.get("id", "")))
        return {"rules": rules, "total": len(rules)}
    
    @smart_notif_router.post("")
    async def create_notification_rule(rule: NotificationRuleCreate, admin = Depends(require_auth)):
        """Create automation rule"""
        rule_doc = {
            "id": f"rule_{uuid.uuid4().hex[:12]}",
            **rule.dict(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": admin.get("admin_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown"),
            "stats": {"sent": 0, "delivered": 0, "opened": 0, "clicked": 0}
        }
        await db.notification_rules.insert_one(rule_doc)
        rule_doc.pop("_id", None)
        return rule_doc
    
    @smart_notif_router.get("/triggers")
    async def get_available_triggers():
        """Get available notification triggers"""
        return {
            "triggers": [
                {"id": "new_listing", "name": "New Listing", "description": "When a new listing is created", "parameters": ["category", "price_range", "location"]},
                {"id": "price_drop", "name": "Price Drop", "description": "When a listing price decreases", "parameters": ["percentage", "min_drop"]},
                {"id": "new_message", "name": "New Message", "description": "When user receives a message", "parameters": []},
                {"id": "listing_sold", "name": "Listing Sold", "description": "When a listing is marked as sold", "parameters": []},
                {"id": "listing_expiring", "name": "Listing Expiring", "description": "When a listing is about to expire", "parameters": ["days_before"]},
                {"id": "inactivity", "name": "User Inactivity", "description": "When user hasn't been active", "parameters": ["days"]},
                {"id": "welcome", "name": "Welcome", "description": "When user registers", "parameters": []},
                {"id": "saved_search_match", "name": "Saved Search Match", "description": "When a listing matches saved search", "parameters": []},
                {"id": "wishlist_price_drop", "name": "Wishlist Price Drop", "description": "When a wishlist item price drops", "parameters": ["percentage"]},
            ]
        }
    
    @smart_notif_router.get("/{rule_id}")
    async def get_notification_rule(rule_id: str):
        """Get rule details"""
        rule = await db.notification_rules.find_one({"id": rule_id})
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        rule["id"] = str(rule.pop("_id", rule.get("id", "")))
        return rule
    
    @smart_notif_router.put("/{rule_id}")
    async def update_notification_rule(rule_id: str, update: NotificationRuleUpdate, admin = Depends(require_auth)):
        """Update rule"""
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.notification_rules.update_one({"id": rule_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Rule not found")
        return {"status": "updated", "rule_id": rule_id}
    
    @smart_notif_router.delete("/{rule_id}")
    async def delete_notification_rule(rule_id: str, admin = Depends(require_auth)):
        """Delete rule"""
        result = await db.notification_rules.delete_one({"id": rule_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Rule not found")
        return {"status": "deleted", "rule_id": rule_id}
    
    # =============================================================================
    # NOTIFICATION ANALYTICS ROUTER
    # =============================================================================
    analytics_router = APIRouter(prefix="/notification-analytics", tags=["Notification Analytics"])
    
    @analytics_router.get("")
    async def get_notification_analytics():
        """Get overview stats"""
        # Aggregate stats
        pipeline = [
            {"$group": {
                "_id": None,
                "total_sent": {"$sum": "$sent"},
                "total_delivered": {"$sum": "$delivered"},
                "total_opened": {"$sum": "$opened"},
                "total_clicked": {"$sum": "$clicked"},
                "total_failed": {"$sum": "$failed"}
            }}
        ]
        stats = await db.notification_stats.aggregate(pipeline).to_list(1)
        
        if stats:
            s = stats[0]
            total = s.get("total_sent", 0) or 1
            return {
                "sent": s.get("total_sent", 0),
                "delivered": s.get("total_delivered", 0),
                "opened": s.get("total_opened", 0),
                "clicked": s.get("total_clicked", 0),
                "failed": s.get("total_failed", 0),
                "delivery_rate": round(s.get("total_delivered", 0) / total * 100, 2),
                "open_rate": round(s.get("total_opened", 0) / total * 100, 2),
                "click_rate": round(s.get("total_clicked", 0) / total * 100, 2)
            }
        
        return {"sent": 0, "delivered": 0, "opened": 0, "clicked": 0, "failed": 0, "delivery_rate": 0, "open_rate": 0, "click_rate": 0}
    
    @analytics_router.get("/by-channel")
    async def get_analytics_by_channel():
        """Stats by channel"""
        pipeline = [
            {"$group": {
                "_id": "$channel",
                "sent": {"$sum": "$sent"},
                "delivered": {"$sum": "$delivered"},
                "opened": {"$sum": "$opened"},
                "clicked": {"$sum": "$clicked"}
            }}
        ]
        results = await db.notification_stats.aggregate(pipeline).to_list(10)
        
        channels = {}
        for r in results:
            ch = r["_id"] or "unknown"
            total = r.get("sent", 0) or 1
            channels[ch] = {
                "sent": r.get("sent", 0),
                "delivered": r.get("delivered", 0),
                "opened": r.get("opened", 0),
                "clicked": r.get("clicked", 0),
                "open_rate": round(r.get("opened", 0) / total * 100, 2),
                "click_rate": round(r.get("clicked", 0) / total * 100, 2)
            }
        
        # Add default channels if missing
        for ch in ["push", "email", "sms", "in_app"]:
            if ch not in channels:
                channels[ch] = {"sent": 0, "delivered": 0, "opened": 0, "clicked": 0, "open_rate": 0, "click_rate": 0}
        
        return {"channels": channels}
    
    @analytics_router.get("/trends")
    async def get_analytics_trends(days: int = Query(default=30, le=90)):
        """Time-series data"""
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        pipeline = [
            {"$match": {"date": {"$gte": start_date.isoformat()[:10]}}},
            {"$group": {
                "_id": "$date",
                "sent": {"$sum": "$sent"},
                "delivered": {"$sum": "$delivered"},
                "opened": {"$sum": "$opened"},
                "clicked": {"$sum": "$clicked"}
            }},
            {"$sort": {"_id": 1}}
        ]
        
        results = await db.notification_stats.aggregate(pipeline).to_list(90)
        
        trends = [
            {
                "date": r["_id"],
                "sent": r.get("sent", 0),
                "delivered": r.get("delivered", 0),
                "opened": r.get("opened", 0),
                "clicked": r.get("clicked", 0)
            }
            for r in results
        ]
        
        return {"trends": trends, "period_days": days}
    
    # =============================================================================
    # AI PERSONALIZATION ROUTER
    # =============================================================================
    ai_personal_router = APIRouter(prefix="/ai-personalization", tags=["AI Personalization"])
    
    @ai_personal_router.get("")
    async def get_ai_personalization_settings():
        """Get AI personalization settings"""
        config = await db.ai_personalization_config.find_one({"id": "global"})
        if not config:
            config = {
                "id": "global",
                "enabled": True,
                "model_provider": "openai",
                "model_name": "gpt-4o",
                "default_style": "friendly",
                "max_title_length": 60,
                "max_body_length": 150,
                "personalize_by_user_history": True,
                "personalize_by_location": True,
                "personalize_by_time": True
            }
        config.pop("_id", None)
        return config
    
    @ai_personal_router.put("")
    async def update_ai_personalization_settings(settings: AIPersonalizationSettings, admin = Depends(require_auth)):
        """Update AI personalization settings"""
        update_data = settings.dict()
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.ai_personalization_config.update_one(
            {"id": "global"},
            {"$set": update_data},
            upsert=True
        )
        return {"status": "updated", "settings": update_data}
    
    @ai_personal_router.get("/segments")
    async def get_ai_generated_segments():
        """Get AI-generated segments"""
        # Return segments identified by AI analysis
        segments = await db.ai_segments.find({}).to_list(20)
        for seg in segments:
            seg.pop("_id", None)
        
        # Add default AI segments if none exist
        if not segments:
            segments = [
                {"id": "ai_high_intent", "name": "High Intent Buyers", "description": "AI-identified users with high purchase intent", "confidence": 0.85, "user_count": 0},
                {"id": "ai_churn_risk", "name": "Churn Risk", "description": "Users likely to become inactive", "confidence": 0.72, "user_count": 0},
                {"id": "ai_power_sellers", "name": "Power Sellers", "description": "Top performing sellers", "confidence": 0.91, "user_count": 0},
            ]
        
        return {"segments": segments}
    
    # =============================================================================
    # RECOMMENDATIONS CONFIG ROUTER
    # =============================================================================
    @ai_personal_router.get("/recommendations/config")
    async def get_recommendations_config():
        """Get recommendation engine config"""
        config = await db.recommendations_config.find_one({"id": "global"})
        if not config:
            config = {
                "id": "global",
                "enabled": True,
                "algorithms": ["collaborative_filtering", "content_based", "popularity"],
                "weights": {"collaborative": 0.4, "content": 0.4, "popularity": 0.2},
                "max_recommendations": 10,
                "include_sponsored": True,
                "diversity_factor": 0.3
            }
        config.pop("_id", None)
        return config
    
    # =============================================================================
    # SMS ROUTER
    # =============================================================================
    sms_router = APIRouter(prefix="/sms", tags=["SMS"])
    
    @sms_router.get("/config")
    async def get_sms_config():
        """Get SMS provider configuration"""
        config = await db.sms_config.find_one({"id": "global"})
        if not config:
            config = {
                "id": "global",
                "provider": "twilio",
                "enabled": False,
                "sender_id": None,
                "daily_limit": 1000,
                "rate_limit_per_user": 5
            }
        config.pop("_id", None)
        # Don't expose secrets
        config.pop("api_key", None)
        config.pop("api_secret", None)
        return config
    
    @sms_router.put("/config")
    async def update_sms_config(config: SMSConfigUpdate, admin = Depends(require_auth)):
        """Update SMS config"""
        update_data = config.dict()
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.sms_config.update_one(
            {"id": "global"},
            {"$set": update_data},
            upsert=True
        )
        return {"status": "updated"}
    
    @sms_router.get("/templates")
    async def list_sms_templates():
        """List SMS templates"""
        templates = await db.sms_templates.find({}).to_list(50)
        for t in templates:
            t["id"] = str(t.pop("_id", t.get("id", "")))
        
        # Add default templates if none exist
        if not templates:
            templates = [
                {"id": "welcome", "name": "Welcome SMS", "content": "Welcome to {app_name}! Start exploring listings now.", "variables": ["app_name"], "language": "en"},
                {"id": "otp", "name": "OTP Verification", "content": "Your verification code is {code}. Valid for 10 minutes.", "variables": ["code"], "language": "en"},
                {"id": "new_message", "name": "New Message", "content": "You have a new message from {sender}. Open the app to reply.", "variables": ["sender"], "language": "en"},
            ]
        
        return {"templates": templates, "total": len(templates)}
    
    @sms_router.post("/templates")
    async def create_sms_template(template: SMSTemplateCreate, admin = Depends(require_auth)):
        """Create SMS template"""
        template_doc = {
            "id": f"sms_tpl_{uuid.uuid4().hex[:8]}",
            **template.dict(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.sms_templates.insert_one(template_doc)
        template_doc.pop("_id", None)
        return template_doc
    
    # =============================================================================
    # WHATSAPP ROUTER
    # =============================================================================
    whatsapp_router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])
    
    @whatsapp_router.get("/config")
    async def get_whatsapp_config():
        """Get WhatsApp configuration"""
        config = await db.whatsapp_config.find_one({"id": "global"})
        if not config:
            config = {
                "id": "global",
                "provider": "twilio",
                "enabled": False,
                "phone_number": None,
                "business_name": None
            }
        config.pop("_id", None)
        config.pop("api_key", None)
        return config
    
    @whatsapp_router.put("/config")
    async def update_whatsapp_config(config: WhatsAppConfigUpdate, admin = Depends(require_auth)):
        """Update WhatsApp config"""
        update_data = config.dict()
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.whatsapp_config.update_one(
            {"id": "global"},
            {"$set": update_data},
            upsert=True
        )
        return {"status": "updated"}
    
    @whatsapp_router.get("/templates")
    async def list_whatsapp_templates():
        """List WhatsApp templates"""
        templates = await db.whatsapp_templates.find({}).to_list(50)
        for t in templates:
            t["id"] = str(t.pop("_id", t.get("id", "")))
        
        if not templates:
            templates = [
                {"id": "welcome", "name": "Welcome Message", "content": "Welcome to {app_name}! 🎉", "variables": ["app_name"], "status": "approved"},
                {"id": "order_update", "name": "Order Update", "content": "Your order #{order_id} status: {status}", "variables": ["order_id", "status"], "status": "approved"},
            ]
        
        return {"templates": templates, "total": len(templates)}
    
    # =============================================================================
    # AI ANALYZER ROUTER
    # =============================================================================
    ai_analyzer_router = APIRouter(prefix="/ai-analyzer", tags=["AI Analyzer"])
    
    @ai_analyzer_router.get("/config")
    async def get_ai_analyzer_config():
        """Get analyzer configuration"""
        config = await db.ai_analyzer_config.find_one({"id": "global"})
        if not config:
            config = {
                "id": "global",
                "enabled": True,
                "max_uses_per_day_free": 3,
                "max_uses_per_day_verified": 10,
                "max_uses_per_day_premium": 50,
                "enable_price_suggestions": True,
                "enable_category_suggestions": True,
                "max_images_per_analysis": 5
            }
        config.pop("_id", None)
        return config
    
    @ai_analyzer_router.put("/config")
    async def update_ai_analyzer_config(config: AIAnalyzerConfigUpdate, admin = Depends(require_auth)):
        """Update config"""
        update_data = config.dict()
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.ai_analyzer_config.update_one(
            {"id": "global"},
            {"$set": update_data},
            upsert=True
        )
        return {"status": "updated"}
    
    @ai_analyzer_router.get("/analytics")
    async def get_ai_analyzer_analytics():
        """Get usage analytics"""
        # Aggregate usage stats
        today = datetime.now(timezone.utc).date().isoformat()
        
        pipeline = [
            {"$group": {
                "_id": None,
                "total_analyses": {"$sum": 1},
                "successful": {"$sum": {"$cond": [{"$eq": ["$status", "success"]}, 1, 0]}},
                "failed": {"$sum": {"$cond": [{"$eq": ["$status", "failed"]}, 1, 0]}}
            }}
        ]
        
        stats = await db.ai_analysis_logs.aggregate(pipeline).to_list(1)
        
        if stats:
            s = stats[0]
            return {
                "total_analyses": s.get("total_analyses", 0),
                "successful": s.get("successful", 0),
                "failed": s.get("failed", 0),
                "success_rate": round(s.get("successful", 0) / max(s.get("total_analyses", 1), 1) * 100, 2),
                "today_usage": 0  # Would need additional query
            }
        
        return {"total_analyses": 0, "successful": 0, "failed": 0, "success_rate": 0, "today_usage": 0}
    
    @ai_analyzer_router.get("/queue")
    async def get_ai_analyzer_queue():
        """Get analysis queue status"""
        pending = await db.ai_analysis_queue.count_documents({"status": "pending"})
        processing = await db.ai_analysis_queue.count_documents({"status": "processing"})
        
        return {
            "pending": pending,
            "processing": processing,
            "queue_length": pending + processing
        }
    
    @ai_analyzer_router.post("/analyze")
    async def analyze_listing(request: AnalyzeListingRequest, user = Depends(require_auth)):
        """Analyze a listing"""
        analysis_id = f"analysis_{uuid.uuid4().hex[:12]}"
        
        # Queue the analysis
        analysis_doc = {
            "id": analysis_id,
            "listing_id": request.listing_id,
            "images": request.images,
            "title": request.title,
            "description": request.description,
            "status": "queued",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "user_id": user.get("user_id") if isinstance(user, dict) else getattr(user, "user_id", "unknown")
        }
        
        await db.ai_analysis_queue.insert_one(analysis_doc)
        analysis_doc.pop("_id", None)
        
        return {"analysis_id": analysis_id, "status": "queued", "message": "Analysis queued for processing"}
    
    # =============================================================================
    # A/B TESTING ROUTER
    # =============================================================================
    ab_testing_router = APIRouter(prefix="/ab-testing", tags=["A/B Testing"])
    
    @ab_testing_router.get("")
    async def list_experiments():
        """List all experiments"""
        experiments = await db.ab_experiments.find({}).to_list(50)
        for exp in experiments:
            exp["id"] = str(exp.pop("_id", exp.get("id", "")))
        return {"experiments": experiments, "total": len(experiments)}
    
    @ab_testing_router.post("")
    async def create_experiment(experiment: ABTestCreate, admin = Depends(require_auth)):
        """Create experiment"""
        exp_doc = {
            "id": f"exp_{uuid.uuid4().hex[:12]}",
            **experiment.dict(),
            "status": "draft",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": admin.get("admin_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown"),
            "results": {}
        }
        await db.ab_experiments.insert_one(exp_doc)
        exp_doc.pop("_id", None)
        return exp_doc
    
    @ab_testing_router.get("/{experiment_id}")
    async def get_experiment(experiment_id: str):
        """Get experiment details"""
        exp = await db.ab_experiments.find_one({"id": experiment_id})
        if not exp:
            raise HTTPException(status_code=404, detail="Experiment not found")
        exp["id"] = str(exp.pop("_id", exp.get("id", "")))
        return exp
    
    @ab_testing_router.put("/{experiment_id}")
    async def update_experiment(experiment_id: str, update: ABTestUpdate, admin = Depends(require_auth)):
        """Update experiment"""
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.ab_experiments.update_one({"id": experiment_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Experiment not found")
        return {"status": "updated", "experiment_id": experiment_id}
    
    @ab_testing_router.get("/{experiment_id}/results")
    async def get_experiment_results(experiment_id: str):
        """Get experiment results"""
        exp = await db.ab_experiments.find_one({"id": experiment_id})
        if not exp:
            raise HTTPException(status_code=404, detail="Experiment not found")
        
        return {
            "experiment_id": experiment_id,
            "status": exp.get("status", "draft"),
            "results": exp.get("results", {}),
            "variants": exp.get("variants", []),
            "winner": exp.get("winner"),
            "confidence": exp.get("confidence", 0)
        }
    
    @ab_testing_router.post("/{experiment_id}/start")
    async def start_experiment(experiment_id: str, admin = Depends(require_auth)):
        """Start experiment"""
        result = await db.ab_experiments.update_one(
            {"id": experiment_id},
            {"$set": {"status": "running", "started_at": datetime.now(timezone.utc).isoformat()}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Experiment not found")
        return {"status": "started", "experiment_id": experiment_id}
    
    @ab_testing_router.post("/{experiment_id}/stop")
    async def stop_experiment(experiment_id: str, admin = Depends(require_auth)):
        """Stop experiment"""
        result = await db.ab_experiments.update_one(
            {"id": experiment_id},
            {"$set": {"status": "stopped", "stopped_at": datetime.now(timezone.utc).isoformat()}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Experiment not found")
        return {"status": "stopped", "experiment_id": experiment_id}
    
    # =============================================================================
    # INTEGRATIONS ROUTER
    # =============================================================================
    integrations_router = APIRouter(prefix="/integrations", tags=["Integrations"])
    
    @integrations_router.get("")
    async def list_integrations():
        """List all integrations"""
        integrations = [
            {"id": "twilio_sms", "name": "Twilio SMS", "category": "messaging", "status": "not_configured", "enabled": False},
            {"id": "twilio_whatsapp", "name": "Twilio WhatsApp", "category": "messaging", "status": "not_configured", "enabled": False},
            {"id": "sendgrid", "name": "SendGrid", "category": "email", "status": "configured", "enabled": True},
            {"id": "stripe", "name": "Stripe", "category": "payments", "status": "not_configured", "enabled": False},
            {"id": "paypal", "name": "PayPal", "category": "payments", "status": "not_configured", "enabled": False},
            {"id": "firebase_fcm", "name": "Firebase FCM", "category": "push", "status": "configured", "enabled": True},
            {"id": "openai", "name": "OpenAI", "category": "ai", "status": "configured", "enabled": True},
            {"id": "google_analytics", "name": "Google Analytics", "category": "analytics", "status": "not_configured", "enabled": False},
        ]
        
        # Check actual config from DB
        for integration in integrations:
            config = await db.integration_configs.find_one({"provider_id": integration["id"]})
            if config:
                integration["status"] = "configured" if config.get("enabled") else "disabled"
                integration["enabled"] = config.get("enabled", False)
        
        return {"integrations": integrations, "total": len(integrations)}
    
    @integrations_router.get("/{integration_id}")
    async def get_integration(integration_id: str):
        """Get integration details"""
        config = await db.integration_configs.find_one({"provider_id": integration_id})
        
        integration_info = {
            "twilio_sms": {"name": "Twilio SMS", "category": "messaging", "required_fields": ["account_sid", "auth_token", "sender_number"]},
            "sendgrid": {"name": "SendGrid", "category": "email", "required_fields": ["api_key"]},
            "stripe": {"name": "Stripe", "category": "payments", "required_fields": ["secret_key", "publishable_key"]},
            "firebase_fcm": {"name": "Firebase FCM", "category": "push", "required_fields": ["server_key", "sender_id"]},
            "openai": {"name": "OpenAI", "category": "ai", "required_fields": ["api_key"]},
        }
        
        info = integration_info.get(integration_id, {"name": integration_id, "category": "other", "required_fields": []})
        
        return {
            "id": integration_id,
            **info,
            "status": "configured" if config and config.get("enabled") else "not_configured",
            "enabled": config.get("enabled", False) if config else False,
            "last_tested": config.get("last_tested") if config else None
        }
    
    @integrations_router.put("/{integration_id}/connect")
    async def connect_integration(integration_id: str, data: IntegrationConnect, admin = Depends(require_auth)):
        """Connect integration"""
        config_doc = {
            "provider_id": integration_id,
            "credentials": data.credentials,
            "settings": data.settings or {},
            "enabled": True,
            "connected_at": datetime.now(timezone.utc).isoformat(),
            "connected_by": admin.get("admin_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown")
        }
        
        await db.integration_configs.update_one(
            {"provider_id": integration_id},
            {"$set": config_doc},
            upsert=True
        )
        
        return {"status": "connected", "integration_id": integration_id}
    
    @integrations_router.delete("/{integration_id}")
    async def disconnect_integration(integration_id: str, admin = Depends(require_auth)):
        """Disconnect integration"""
        result = await db.integration_configs.update_one(
            {"provider_id": integration_id},
            {"$set": {"enabled": False, "disconnected_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"status": "disconnected", "integration_id": integration_id}
    
    # =============================================================================
    # WEBHOOKS ROUTER
    # =============================================================================
    webhooks_router = APIRouter(prefix="/webhooks", tags=["Webhooks"])
    
    @webhooks_router.get("")
    async def list_webhooks():
        """List webhooks"""
        webhooks = await db.webhooks.find({}).to_list(50)
        for w in webhooks:
            w["id"] = str(w.pop("_id", w.get("id", "")))
        return {"webhooks": webhooks, "total": len(webhooks)}
    
    @webhooks_router.post("")
    async def create_webhook(webhook: WebhookCreate, admin = Depends(require_auth)):
        """Create webhook"""
        webhook_doc = {
            "id": f"wh_{uuid.uuid4().hex[:12]}",
            **webhook.dict(),
            "secret": webhook.secret or uuid.uuid4().hex,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": admin.get("admin_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown"),
            "last_triggered": None,
            "success_count": 0,
            "failure_count": 0
        }
        await db.webhooks.insert_one(webhook_doc)
        webhook_doc.pop("_id", None)
        return webhook_doc
    
    @webhooks_router.get("/{webhook_id}")
    async def get_webhook(webhook_id: str):
        """Get webhook details"""
        webhook = await db.webhooks.find_one({"id": webhook_id})
        if not webhook:
            raise HTTPException(status_code=404, detail="Webhook not found")
        webhook["id"] = str(webhook.pop("_id", webhook.get("id", "")))
        return webhook
    
    @webhooks_router.delete("/{webhook_id}")
    async def delete_webhook(webhook_id: str, admin = Depends(require_auth)):
        """Delete webhook"""
        result = await db.webhooks.delete_one({"id": webhook_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Webhook not found")
        return {"status": "deleted", "webhook_id": webhook_id}
    
    # =============================================================================
    # API KEYS ROUTER
    # =============================================================================
    api_keys_router = APIRouter(prefix="/api-keys", tags=["API Keys"])
    
    @api_keys_router.get("")
    async def list_api_keys(admin = Depends(require_auth)):
        """List API keys"""
        keys = await db.api_keys.find({}).to_list(50)
        for k in keys:
            k["id"] = str(k.pop("_id", k.get("id", "")))
            # Mask the key
            if "key" in k:
                k["key"] = k["key"][:8] + "..." + k["key"][-4:]
        return {"api_keys": keys, "total": len(keys)}
    
    @api_keys_router.post("")
    async def create_api_key(key_data: APIKeyCreate, admin = Depends(require_auth)):
        """Generate new API key"""
        key_value = f"ak_{uuid.uuid4().hex}"
        
        expires_at = None
        if key_data.expires_in_days:
            expires_at = (datetime.now(timezone.utc) + timedelta(days=key_data.expires_in_days)).isoformat()
        
        key_doc = {
            "id": f"key_{uuid.uuid4().hex[:12]}",
            "name": key_data.name,
            "key": key_value,
            "permissions": key_data.permissions,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": admin.get("admin_id") if isinstance(admin, dict) else getattr(admin, "user_id", "unknown"),
            "expires_at": expires_at,
            "last_used": None,
            "enabled": True
        }
        
        await db.api_keys.insert_one(key_doc)
        key_doc.pop("_id", None)
        
        return {
            "id": key_doc["id"],
            "name": key_doc["name"],
            "key": key_value,  # Only show full key on creation
            "permissions": key_doc["permissions"],
            "expires_at": expires_at,
            "message": "Save this key now. It won't be shown again."
        }
    
    @api_keys_router.delete("/{key_id}")
    async def revoke_api_key(key_id: str, admin = Depends(require_auth)):
        """Revoke API key"""
        result = await db.api_keys.update_one(
            {"id": key_id},
            {"$set": {"enabled": False, "revoked_at": datetime.now(timezone.utc).isoformat()}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="API key not found")
        return {"status": "revoked", "key_id": key_id}
    
    # Return all routers
    return {
        "segments": segments_router,
        "smart_notifications": smart_notif_router,
        "notification_analytics": analytics_router,
        "ai_personalization": ai_personal_router,
        "sms": sms_router,
        "whatsapp": whatsapp_router,
        "ai_analyzer": ai_analyzer_router,
        "ab_testing": ab_testing_router,
        "integrations": integrations_router,
        "webhooks": webhooks_router,
        "api_keys": api_keys_router
    }
