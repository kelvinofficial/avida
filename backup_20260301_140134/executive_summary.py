"""
AI-Powered Executive Summary System
Provides high-level platform performance, risks, and opportunities overview for admins
"""

import os
import uuid
import json
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from enum import Enum
from fastapi import APIRouter, HTTPException, Request, Query, BackgroundTasks
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# AI Integration
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    AI_AVAILABLE = True
except ImportError:
    AI_AVAILABLE = False
    logger.warning("Emergent LLM not available for Executive Summary")


# =============================================================================
# ENUMS
# =============================================================================

class SummaryFrequency(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"

class SummaryTone(str, Enum):
    FORMAL = "formal"
    CONCISE = "concise"
    CASUAL = "casual"

class SummaryAudience(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMINS = "admins"
    EXECUTIVES = "executives"

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ImpactLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class UrgencyLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    IMMEDIATE = "immediate"


# =============================================================================
# MODELS
# =============================================================================

class SummaryConfig(BaseModel):
    """Executive Summary configuration"""
    id: str = "executive_summary_config"
    enabled: bool = True
    frequency: SummaryFrequency = SummaryFrequency.WEEKLY
    audience: List[SummaryAudience] = [SummaryAudience.SUPER_ADMIN, SummaryAudience.ADMINS]
    tone: SummaryTone = SummaryTone.CONCISE
    sections_included: List[str] = [
        "platform_overview", "revenue_monetization", "growth_retention",
        "trust_safety", "operations_logistics", "system_health", "recommendations"
    ]
    email_digest_enabled: bool = False
    email_recipients: List[str] = []
    custom_prompt_suffix: Optional[str] = None
    language: str = "en"
    last_generated: Optional[datetime] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MetricChange(BaseModel):
    """Metric with period-over-period change"""
    current: float
    previous: float
    change_percent: float
    change_direction: str  # up, down, flat
    
    @classmethod
    def calculate(cls, current: float, previous: float):
        if previous == 0:
            change_percent = 100 if current > 0 else 0
        else:
            change_percent = ((current - previous) / previous) * 100
        
        direction = "up" if change_percent > 1 else ("down" if change_percent < -1 else "flat")
        return cls(
            current=current,
            previous=previous,
            change_percent=round(change_percent, 1),
            change_direction=direction
        )

class PlatformOverview(BaseModel):
    """Platform overview section data"""
    total_users: MetricChange
    active_users: MetricChange
    new_listings: MetricChange
    completed_transactions: MetricChange
    escrow_volume: MetricChange
    ai_summary: Optional[str] = None

class RevenueMonetization(BaseModel):
    """Revenue section data"""
    total_revenue: MetricChange
    commission_earned: MetricChange
    boost_revenue: MetricChange
    banner_revenue: MetricChange
    transport_fees: MetricChange
    average_order_value: MetricChange
    ai_highlights: List[str] = []

class GrowthRetention(BaseModel):
    """Growth and retention section data"""
    new_user_signups: MetricChange
    user_retention_rate: MetricChange
    seller_conversion_rate: MetricChange
    top_growth_categories: List[Dict[str, Any]] = []
    top_growth_locations: List[Dict[str, Any]] = []
    ai_insights: List[str] = []

class TrustSafety(BaseModel):
    """Trust and safety section data"""
    disputes_opened: int
    disputes_resolved: int
    fraud_flags: int
    moderation_incidents: int
    escrow_delays: int
    risk_rating: RiskLevel
    ai_explanation: Optional[str] = None

class OperationsLogistics(BaseModel):
    """Operations section data"""
    transport_success_rate: float
    average_delivery_days: float
    delivery_delays: int
    partner_performance: List[Dict[str, Any]] = []
    ai_suggestions: List[str] = []

class SystemHealth(BaseModel):
    """System health section data"""
    api_error_rate: float
    payment_failure_rate: float
    notification_delivery_rate: float
    feature_outages: List[str] = []
    ai_analysis: Optional[str] = None

class Recommendation(BaseModel):
    """AI-generated recommendation"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    impact_level: ImpactLevel
    urgency: UrgencyLevel
    category: str  # revenue, growth, safety, operations, technical
    action_label: Optional[str] = None
    action_route: Optional[str] = None

class ExecutiveSummary(BaseModel):
    """Complete executive summary"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    period_start: datetime
    period_end: datetime
    period_type: SummaryFrequency
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    version: int = 1
    
    # Sections
    platform_overview: Optional[PlatformOverview] = None
    revenue_monetization: Optional[RevenueMonetization] = None
    growth_retention: Optional[GrowthRetention] = None
    trust_safety: Optional[TrustSafety] = None
    operations_logistics: Optional[OperationsLogistics] = None
    system_health: Optional[SystemHealth] = None
    recommendations: List[Recommendation] = []
    
    # Overall summary
    executive_brief: Optional[str] = None
    key_highlights: List[str] = []
    what_changed: List[str] = []
    what_to_do_next: List[str] = []
    
    # Metadata
    ai_model_used: Optional[str] = None
    generation_time_seconds: Optional[float] = None
    status: str = "completed"  # generating, completed, failed


# =============================================================================
# DATA AGGREGATOR
# =============================================================================

class ExecutiveSummaryDataAggregator:
    """Aggregates data from various platform sources"""
    
    def __init__(self, db):
        self.db = db
    
    async def get_period_dates(self, period_type: SummaryFrequency) -> tuple:
        """Get start and end dates for the period"""
        now = datetime.now(timezone.utc)
        
        if period_type == SummaryFrequency.DAILY:
            period_end = now
            period_start = now - timedelta(days=1)
            previous_start = period_start - timedelta(days=1)
            previous_end = period_start
        elif period_type == SummaryFrequency.WEEKLY:
            period_end = now
            period_start = now - timedelta(days=7)
            previous_start = period_start - timedelta(days=7)
            previous_end = period_start
        else:  # monthly
            period_end = now
            period_start = now - timedelta(days=30)
            previous_start = period_start - timedelta(days=30)
            previous_end = period_start
        
        return period_start, period_end, previous_start, previous_end
    
    async def get_platform_overview(
        self, 
        period_start: datetime, 
        period_end: datetime,
        prev_start: datetime,
        prev_end: datetime
    ) -> Dict[str, Any]:
        """Aggregate platform overview metrics"""
        
        # Total users
        total_users_current = await self.db.users.count_documents({})
        total_users_previous = await self.db.users.count_documents({
            "created_at": {"$lt": prev_end}
        })
        
        # Active users (users with activity in period)
        active_current = await self.db.users.count_documents({
            "last_seen": {"$gte": period_start, "$lte": period_end}
        })
        active_previous = await self.db.users.count_documents({
            "last_seen": {"$gte": prev_start, "$lte": prev_end}
        })
        
        # New listings
        new_listings_current = await self.db.listings.count_documents({
            "created_at": {"$gte": period_start, "$lte": period_end}
        })
        new_listings_previous = await self.db.listings.count_documents({
            "created_at": {"$gte": prev_start, "$lte": prev_end}
        })
        
        # Completed transactions
        completed_current = await self.db.escrow_transactions.count_documents({
            "status": "completed",
            "completed_at": {"$gte": period_start, "$lte": period_end}
        })
        completed_previous = await self.db.escrow_transactions.count_documents({
            "status": "completed",
            "completed_at": {"$gte": prev_start, "$lte": prev_end}
        })
        
        # Escrow volume
        escrow_pipeline_current = [
            {"$match": {"status": "completed", "completed_at": {"$gte": period_start, "$lte": period_end}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        escrow_current_result = await self.db.escrow_transactions.aggregate(escrow_pipeline_current).to_list(1)
        escrow_volume_current = escrow_current_result[0]["total"] if escrow_current_result else 0
        
        escrow_pipeline_previous = [
            {"$match": {"status": "completed", "completed_at": {"$gte": prev_start, "$lte": prev_end}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        escrow_previous_result = await self.db.escrow_transactions.aggregate(escrow_pipeline_previous).to_list(1)
        escrow_volume_previous = escrow_previous_result[0]["total"] if escrow_previous_result else 0
        
        return {
            "total_users": MetricChange.calculate(total_users_current, total_users_previous),
            "active_users": MetricChange.calculate(active_current, active_previous),
            "new_listings": MetricChange.calculate(new_listings_current, new_listings_previous),
            "completed_transactions": MetricChange.calculate(completed_current, completed_previous),
            "escrow_volume": MetricChange.calculate(escrow_volume_current, escrow_volume_previous)
        }
    
    async def get_revenue_metrics(
        self,
        period_start: datetime,
        period_end: datetime,
        prev_start: datetime,
        prev_end: datetime
    ) -> Dict[str, Any]:
        """Aggregate revenue and monetization metrics"""
        
        # Commission earned from escrow
        commission_pipeline_current = [
            {"$match": {"status": "completed", "completed_at": {"$gte": period_start, "$lte": period_end}}},
            {"$group": {"_id": None, "total": {"$sum": "$platform_fee"}}}
        ]
        commission_current = await self.db.escrow_transactions.aggregate(commission_pipeline_current).to_list(1)
        commission_current_val = commission_current[0]["total"] if commission_current else 0
        
        commission_pipeline_previous = [
            {"$match": {"status": "completed", "completed_at": {"$gte": prev_start, "$lte": prev_end}}},
            {"$group": {"_id": None, "total": {"$sum": "$platform_fee"}}}
        ]
        commission_previous = await self.db.escrow_transactions.aggregate(commission_pipeline_previous).to_list(1)
        commission_previous_val = commission_previous[0]["total"] if commission_previous else 0
        
        # Boost revenue
        boost_pipeline_current = [
            {"$match": {"purchase_date": {"$gte": period_start, "$lte": period_end}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        boost_current = await self.db.credit_purchases.aggregate(boost_pipeline_current).to_list(1)
        boost_current_val = boost_current[0]["total"] if boost_current else 0
        
        boost_pipeline_previous = [
            {"$match": {"purchase_date": {"$gte": prev_start, "$lte": prev_end}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        boost_previous = await self.db.credit_purchases.aggregate(boost_pipeline_previous).to_list(1)
        boost_previous_val = boost_previous[0]["total"] if boost_previous else 0
        
        # Banner revenue
        banner_pipeline_current = [
            {"$match": {"created_at": {"$gte": period_start, "$lte": period_end}, "status": "active"}},
            {"$group": {"_id": None, "total": {"$sum": "$total_cost"}}}
        ]
        banner_current = await self.db.banner_campaigns.aggregate(banner_pipeline_current).to_list(1)
        banner_current_val = banner_current[0]["total"] if banner_current else 0
        
        banner_pipeline_previous = [
            {"$match": {"created_at": {"$gte": prev_start, "$lte": prev_end}, "status": "active"}},
            {"$group": {"_id": None, "total": {"$sum": "$total_cost"}}}
        ]
        banner_previous = await self.db.banner_campaigns.aggregate(banner_pipeline_previous).to_list(1)
        banner_previous_val = banner_previous[0]["total"] if banner_previous else 0
        
        # Transport fees
        transport_pipeline_current = [
            {"$match": {"created_at": {"$gte": period_start, "$lte": period_end}}},
            {"$group": {"_id": None, "total": {"$sum": "$delivery_fee"}}}
        ]
        transport_current = await self.db.transport_orders.aggregate(transport_pipeline_current).to_list(1)
        transport_current_val = transport_current[0]["total"] if transport_current else 0
        
        transport_pipeline_previous = [
            {"$match": {"created_at": {"$gte": prev_start, "$lte": prev_end}}},
            {"$group": {"_id": None, "total": {"$sum": "$delivery_fee"}}}
        ]
        transport_previous = await self.db.transport_orders.aggregate(transport_pipeline_previous).to_list(1)
        transport_previous_val = transport_previous[0]["total"] if transport_previous else 0
        
        # Average order value
        aov_pipeline_current = [
            {"$match": {"status": "completed", "completed_at": {"$gte": period_start, "$lte": period_end}}},
            {"$group": {"_id": None, "avg": {"$avg": "$amount"}}}
        ]
        aov_current = await self.db.escrow_transactions.aggregate(aov_pipeline_current).to_list(1)
        aov_current_val = aov_current[0]["avg"] if aov_current else 0
        
        aov_pipeline_previous = [
            {"$match": {"status": "completed", "completed_at": {"$gte": prev_start, "$lte": prev_end}}},
            {"$group": {"_id": None, "avg": {"$avg": "$amount"}}}
        ]
        aov_previous = await self.db.escrow_transactions.aggregate(aov_pipeline_previous).to_list(1)
        aov_previous_val = aov_previous[0]["avg"] if aov_previous else 0
        
        total_revenue = commission_current_val + boost_current_val + banner_current_val + transport_current_val
        total_revenue_prev = commission_previous_val + boost_previous_val + banner_previous_val + transport_previous_val
        
        return {
            "total_revenue": MetricChange.calculate(total_revenue, total_revenue_prev),
            "commission_earned": MetricChange.calculate(commission_current_val, commission_previous_val),
            "boost_revenue": MetricChange.calculate(boost_current_val, boost_previous_val),
            "banner_revenue": MetricChange.calculate(banner_current_val, banner_previous_val),
            "transport_fees": MetricChange.calculate(transport_current_val, transport_previous_val),
            "average_order_value": MetricChange.calculate(aov_current_val or 0, aov_previous_val or 0)
        }
    
    async def get_growth_metrics(
        self,
        period_start: datetime,
        period_end: datetime,
        prev_start: datetime,
        prev_end: datetime
    ) -> Dict[str, Any]:
        """Aggregate growth and retention metrics"""
        
        # New signups
        signups_current = await self.db.users.count_documents({
            "created_at": {"$gte": period_start, "$lte": period_end}
        })
        signups_previous = await self.db.users.count_documents({
            "created_at": {"$gte": prev_start, "$lte": prev_end}
        })
        
        # Top growth categories
        category_pipeline = [
            {"$match": {"created_at": {"$gte": period_start, "$lte": period_end}}},
            {"$group": {"_id": "$category_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]
        top_categories = await self.db.listings.aggregate(category_pipeline).to_list(5)
        
        # Top growth locations
        location_pipeline = [
            {"$match": {"created_at": {"$gte": period_start, "$lte": period_end}}},
            {"$group": {"_id": "$location", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]
        top_locations = await self.db.listings.aggregate(location_pipeline).to_list(5)
        
        return {
            "new_user_signups": MetricChange.calculate(signups_current, signups_previous),
            "user_retention_rate": MetricChange.calculate(75, 72),  # Placeholder
            "seller_conversion_rate": MetricChange.calculate(12.5, 11.8),  # Placeholder
            "top_growth_categories": [{"category": c["_id"], "count": c["count"]} for c in top_categories],
            "top_growth_locations": [{"location": l["_id"], "count": l["count"]} for l in top_locations]
        }
    
    async def get_trust_safety_metrics(
        self,
        period_start: datetime,
        period_end: datetime
    ) -> Dict[str, Any]:
        """Aggregate trust and safety metrics"""
        
        # Disputes
        disputes_opened = await self.db.escrow_disputes.count_documents({
            "created_at": {"$gte": period_start, "$lte": period_end}
        })
        disputes_resolved = await self.db.escrow_disputes.count_documents({
            "resolved_at": {"$gte": period_start, "$lte": period_end}
        })
        
        # Fraud flags from moderation
        fraud_flags = await self.db.moderation_flags.count_documents({
            "created_at": {"$gte": period_start, "$lte": period_end},
            "reason_tags": {"$in": ["fraud", "scam"]}
        })
        
        # Moderation incidents
        moderation_incidents = await self.db.moderation_actions.count_documents({
            "created_at": {"$gte": period_start, "$lte": period_end}
        })
        
        # Escrow delays (orders taking > 7 days in transit)
        escrow_delays = await self.db.escrow_transactions.count_documents({
            "status": "in_transit",
            "shipped_at": {"$lt": datetime.now(timezone.utc) - timedelta(days=7)}
        })
        
        # Calculate risk rating
        if fraud_flags > 10 or disputes_opened > 20:
            risk_rating = RiskLevel.HIGH
        elif fraud_flags > 5 or disputes_opened > 10:
            risk_rating = RiskLevel.MEDIUM
        else:
            risk_rating = RiskLevel.LOW
        
        return {
            "disputes_opened": disputes_opened,
            "disputes_resolved": disputes_resolved,
            "fraud_flags": fraud_flags,
            "moderation_incidents": moderation_incidents,
            "escrow_delays": escrow_delays,
            "risk_rating": risk_rating
        }
    
    async def get_operations_metrics(
        self,
        period_start: datetime,
        period_end: datetime
    ) -> Dict[str, Any]:
        """Aggregate operations and logistics metrics"""
        
        # Transport success rate
        total_transport = await self.db.transport_orders.count_documents({
            "created_at": {"$gte": period_start, "$lte": period_end}
        })
        successful_transport = await self.db.transport_orders.count_documents({
            "created_at": {"$gte": period_start, "$lte": period_end},
            "status": "delivered"
        })
        success_rate = (successful_transport / total_transport * 100) if total_transport > 0 else 100
        
        # Delivery delays
        delivery_delays = await self.db.transport_orders.count_documents({
            "status": {"$ne": "delivered"},
            "estimated_delivery": {"$lt": datetime.now(timezone.utc)}
        })
        
        # Partner performance (placeholder)
        partner_performance = [
            {"partner": "Express Delivery", "success_rate": 95.2, "avg_days": 2.1},
            {"partner": "Standard Shipping", "success_rate": 88.5, "avg_days": 4.3},
        ]
        
        return {
            "transport_success_rate": round(success_rate, 1),
            "average_delivery_days": 3.2,  # Placeholder
            "delivery_delays": delivery_delays,
            "partner_performance": partner_performance
        }
    
    async def get_system_health_metrics(self) -> Dict[str, Any]:
        """Aggregate system health metrics"""
        
        # API error rate (from error logs - placeholder)
        api_error_rate = 0.5
        
        # Payment failure rate
        total_payments = await self.db.payments.count_documents({})
        failed_payments = await self.db.payments.count_documents({"status": "failed"})
        payment_failure_rate = (failed_payments / total_payments * 100) if total_payments > 0 else 0
        
        # Notification delivery rate
        total_notifications = await self.db.notification_logs.count_documents({})
        delivered_notifications = await self.db.notification_logs.count_documents({"status": "delivered"})
        notification_rate = (delivered_notifications / total_notifications * 100) if total_notifications > 0 else 100
        
        return {
            "api_error_rate": round(api_error_rate, 2),
            "payment_failure_rate": round(payment_failure_rate, 2),
            "notification_delivery_rate": round(notification_rate, 1),
            "feature_outages": []
        }


# =============================================================================
# AI SUMMARY GENERATOR
# =============================================================================

class AIExecutiveSummaryGenerator:
    """Generates AI-powered summaries using Emergent LLM"""
    
    def __init__(self):
        self.api_key = os.environ.get('EMERGENT_LLM_KEY')
        self.enabled = AI_AVAILABLE and bool(self.api_key)
    
    async def generate_summary(
        self,
        data: Dict[str, Any],
        config: SummaryConfig,
        period_type: str
    ) -> Dict[str, Any]:
        """Generate AI summary from aggregated data"""
        
        if not self.enabled:
            return self._generate_fallback_summary(data)
        
        try:
            # Determine tone instruction
            tone_instructions = {
                "formal": "Use professional, business-formal language suitable for board presentations.",
                "concise": "Be direct and brief. Use bullet points. Focus on key metrics and actions.",
                "casual": "Use conversational but professional language. Be approachable."
            }
            tone = tone_instructions.get(config.tone.value, tone_instructions["concise"])
            
            system_prompt = f"""You are an AI executive analyst for an online marketplace platform.
Generate a clear, actionable executive summary based on the provided metrics.

Guidelines:
- {tone}
- Focus on what changed and why it matters
- Highlight risks and opportunities
- Provide specific, actionable recommendations
- Use plain English, avoid technical jargon
- Be honest about concerning trends
- Celebrate wins but don't oversell

Output JSON format:
{{
    "executive_brief": "2-3 sentence overall summary",
    "key_highlights": ["highlight 1", "highlight 2", "highlight 3"],
    "what_changed": ["change 1", "change 2"],
    "what_to_do_next": ["action 1", "action 2"],
    "section_summaries": {{
        "platform_overview": "1-2 sentences",
        "revenue": "1-2 sentences with highlights",
        "growth": "1-2 sentences with insights",
        "trust_safety": "1-2 sentences with risk explanation",
        "operations": "1-2 sentences with suggestions",
        "system_health": "1-2 sentences"
    }},
    "recommendations": [
        {{
            "title": "Short action title",
            "description": "What to do and why",
            "impact_level": "low/medium/high",
            "urgency": "low/medium/high/immediate",
            "category": "revenue/growth/safety/operations/technical"
        }}
    ]
}}"""

            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"exec_summary_{uuid.uuid4().hex[:8]}",
                system_message=system_prompt
            ).with_model("openai", "gpt-4o")
            
            # Prepare data for AI
            data_summary = json.dumps(data, indent=2, default=str)
            user_message = UserMessage(
                text=f"Generate an executive summary for the {period_type} period.\n\nPlatform Metrics:\n{data_summary}"
            )
            
            response = await chat.send_message(user_message)
            
            # Parse JSON response
            import re
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                result = json.loads(json_match.group())
                return result
            
            return self._generate_fallback_summary(data)
            
        except Exception as e:
            logger.error(f"AI summary generation failed: {e}")
            return self._generate_fallback_summary(data)
    
    def _generate_fallback_summary(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate basic summary without AI"""
        
        highlights = []
        changes = []
        actions = []
        
        # Extract platform overview
        if "platform_overview" in data:
            po = data["platform_overview"]
            if isinstance(po, dict):
                if po.get("active_users", {}).get("change_direction") == "up":
                    highlights.append(f"Active users increased by {po['active_users']['change_percent']}%")
                if po.get("new_listings", {}).get("change_direction") == "up":
                    highlights.append(f"New listings grew by {po['new_listings']['change_percent']}%")
        
        # Extract revenue
        if "revenue" in data:
            rev = data["revenue"]
            if isinstance(rev, dict):
                if rev.get("total_revenue", {}).get("change_direction") == "up":
                    highlights.append(f"Total revenue increased by {rev['total_revenue']['change_percent']}%")
                elif rev.get("total_revenue", {}).get("change_direction") == "down":
                    changes.append(f"Revenue declined by {abs(rev['total_revenue']['change_percent'])}%")
                    actions.append("Investigate revenue decline and consider promotional campaigns")
        
        # Trust safety
        if "trust_safety" in data:
            ts = data["trust_safety"]
            if isinstance(ts, dict):
                if ts.get("fraud_flags", 0) > 5:
                    changes.append(f"{ts['fraud_flags']} fraud flags detected")
                    actions.append("Review flagged transactions and strengthen fraud detection")
        
        return {
            "executive_brief": "Platform metrics summary generated. AI insights unavailable.",
            "key_highlights": highlights[:5] or ["No significant highlights detected"],
            "what_changed": changes[:5] or ["No major changes detected"],
            "what_to_do_next": actions[:5] or ["Continue monitoring platform metrics"],
            "section_summaries": {},
            "recommendations": []
        }


# =============================================================================
# MAIN SERVICE
# =============================================================================

class ExecutiveSummaryService:
    """Main service for executive summaries"""
    
    def __init__(self, db):
        self.db = db
        self.aggregator = ExecutiveSummaryDataAggregator(db)
        self.ai_generator = AIExecutiveSummaryGenerator()
    
    async def get_config(self) -> SummaryConfig:
        """Get current configuration"""
        config_doc = await self.db.executive_summary_config.find_one({"id": "executive_summary_config"})
        if config_doc:
            config_doc.pop("_id", None)
            return SummaryConfig(**config_doc)
        return SummaryConfig()
    
    async def save_config(self, config: SummaryConfig):
        """Save configuration"""
        config.updated_at = datetime.now(timezone.utc)
        await self.db.executive_summary_config.update_one(
            {"id": "executive_summary_config"},
            {"$set": config.model_dump()},
            upsert=True
        )
    
    async def generate_summary(
        self,
        period_type: SummaryFrequency = None,
        force_regenerate: bool = False
    ) -> ExecutiveSummary:
        """Generate or retrieve executive summary"""
        
        config = await self.get_config()
        if not config.enabled:
            raise HTTPException(status_code=400, detail="Executive Summary is disabled")
        
        period_type = period_type or config.frequency
        
        # Check for cached summary
        if not force_regenerate:
            cached = await self._get_cached_summary(period_type)
            if cached:
                return cached
        
        start_time = datetime.now(timezone.utc)
        
        # Get period dates
        period_start, period_end, prev_start, prev_end = await self.aggregator.get_period_dates(period_type)
        
        # Aggregate all data
        platform_data = await self.aggregator.get_platform_overview(period_start, period_end, prev_start, prev_end)
        revenue_data = await self.aggregator.get_revenue_metrics(period_start, period_end, prev_start, prev_end)
        growth_data = await self.aggregator.get_growth_metrics(period_start, period_end, prev_start, prev_end)
        trust_data = await self.aggregator.get_trust_safety_metrics(period_start, period_end)
        ops_data = await self.aggregator.get_operations_metrics(period_start, period_end)
        system_data = await self.aggregator.get_system_health_metrics()
        
        # Prepare data for AI
        all_data = {
            "platform_overview": {k: v.model_dump() if hasattr(v, 'model_dump') else v for k, v in platform_data.items()},
            "revenue": {k: v.model_dump() if hasattr(v, 'model_dump') else v for k, v in revenue_data.items()},
            "growth": {k: v.model_dump() if hasattr(v, 'model_dump') else v for k, v in growth_data.items()},
            "trust_safety": trust_data,
            "operations": ops_data,
            "system_health": system_data
        }
        
        # Generate AI summary
        ai_result = await self.ai_generator.generate_summary(all_data, config, period_type.value)
        
        # Build summary object
        summary = ExecutiveSummary(
            period_start=period_start,
            period_end=period_end,
            period_type=period_type,
            platform_overview=PlatformOverview(
                **platform_data,
                ai_summary=ai_result.get("section_summaries", {}).get("platform_overview")
            ),
            revenue_monetization=RevenueMonetization(
                **revenue_data,
                ai_highlights=ai_result.get("section_summaries", {}).get("revenue", "").split(". ") if ai_result.get("section_summaries", {}).get("revenue") else []
            ),
            growth_retention=GrowthRetention(
                **growth_data,
                ai_insights=ai_result.get("section_summaries", {}).get("growth", "").split(". ") if ai_result.get("section_summaries", {}).get("growth") else []
            ),
            trust_safety=TrustSafety(
                **trust_data,
                ai_explanation=ai_result.get("section_summaries", {}).get("trust_safety")
            ),
            operations_logistics=OperationsLogistics(
                **ops_data,
                ai_suggestions=ai_result.get("section_summaries", {}).get("operations", "").split(". ") if ai_result.get("section_summaries", {}).get("operations") else []
            ),
            system_health=SystemHealth(
                **system_data,
                ai_analysis=ai_result.get("section_summaries", {}).get("system_health")
            ),
            executive_brief=ai_result.get("executive_brief"),
            key_highlights=ai_result.get("key_highlights", []),
            what_changed=ai_result.get("what_changed", []),
            what_to_do_next=ai_result.get("what_to_do_next", []),
            recommendations=[
                Recommendation(
                    title=r.get("title", ""),
                    description=r.get("description", ""),
                    impact_level=ImpactLevel(r.get("impact_level", "medium")),
                    urgency=UrgencyLevel(r.get("urgency", "medium")),
                    category=r.get("category", "general"),
                    action_label=r.get("action_label"),
                    action_route=r.get("action_route")
                ) for r in ai_result.get("recommendations", [])
            ],
            ai_model_used="gpt-4o" if self.ai_generator.enabled else None,
            generation_time_seconds=(datetime.now(timezone.utc) - start_time).total_seconds()
        )
        
        # Cache the summary
        await self._cache_summary(summary)
        
        # Update config with last generated time
        config.last_generated = datetime.now(timezone.utc)
        await self.save_config(config)
        
        return summary
    
    async def _get_cached_summary(self, period_type: SummaryFrequency) -> Optional[ExecutiveSummary]:
        """Get cached summary if valid"""
        
        # Determine cache validity
        if period_type == SummaryFrequency.DAILY:
            cache_valid_hours = 6
        elif period_type == SummaryFrequency.WEEKLY:
            cache_valid_hours = 24
        else:
            cache_valid_hours = 48
        
        cutoff = datetime.now(timezone.utc) - timedelta(hours=cache_valid_hours)
        
        cached = await self.db.executive_summaries.find_one(
            {
                "period_type": period_type.value,
                "generated_at": {"$gte": cutoff}
            },
            {"_id": 0},
            sort=[("generated_at", -1)]
        )
        
        if cached:
            return ExecutiveSummary(**cached)
        return None
    
    async def _cache_summary(self, summary: ExecutiveSummary):
        """Cache the generated summary"""
        await self.db.executive_summaries.insert_one(summary.model_dump())
    
    async def get_summary_history(
        self,
        period_type: Optional[SummaryFrequency] = None,
        limit: int = 10
    ) -> List[ExecutiveSummary]:
        """Get historical summaries"""
        query = {}
        if period_type:
            query["period_type"] = period_type.value
        
        summaries = await self.db.executive_summaries.find(
            query,
            {"_id": 0}
        ).sort("generated_at", -1).limit(limit).to_list(limit)
        
        return [ExecutiveSummary(**s) for s in summaries]


# =============================================================================
# ROUTER
# =============================================================================

def create_executive_summary_router(db, require_admin_auth):
    """Create the executive summary router"""
    
    router = APIRouter(prefix="/executive-summary", tags=["Executive Summary"])
    service = ExecutiveSummaryService(db)
    
    @router.get("/config")
    async def get_config(request: Request):
        """Get executive summary configuration"""
        await require_admin_auth(request)
        config = await service.get_config()
        return config.model_dump()
    
    @router.put("/config")
    async def update_config(request: Request):
        """Update executive summary configuration"""
        await require_admin_auth(request)
        body = await request.json()
        
        config = await service.get_config()
        for key, value in body.items():
            if hasattr(config, key):
                setattr(config, key, value)
        
        await service.save_config(config)
        return {"message": "Configuration updated"}
    
    @router.post("/generate")
    async def generate_summary(
        request: Request,
        period: Optional[str] = Query(None, description="daily, weekly, or monthly"),
        force: bool = Query(False, description="Force regeneration")
    ):
        """Generate a new executive summary"""
        await require_admin_auth(request)
        
        period_type = None
        if period:
            try:
                period_type = SummaryFrequency(period)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid period type")
        
        summary = await service.generate_summary(period_type, force)
        return summary.model_dump()
    
    @router.get("/latest")
    async def get_latest_summary(
        request: Request,
        period: Optional[str] = Query(None)
    ):
        """Get the latest executive summary"""
        await require_admin_auth(request)
        
        period_type = None
        if period:
            try:
                period_type = SummaryFrequency(period)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid period type")
        
        config = await service.get_config()
        period_type = period_type or config.frequency
        
        # Try to get cached, otherwise generate
        cached = await service._get_cached_summary(period_type)
        if cached:
            return cached.model_dump()
        
        summary = await service.generate_summary(period_type)
        return summary.model_dump()
    
    @router.get("/history")
    async def get_history(
        request: Request,
        period: Optional[str] = Query(None),
        limit: int = Query(10, ge=1, le=50)
    ):
        """Get historical summaries"""
        await require_admin_auth(request)
        
        period_type = None
        if period:
            try:
                period_type = SummaryFrequency(period)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid period type")
        
        summaries = await service.get_summary_history(period_type, limit)
        return {"summaries": [s.model_dump() for s in summaries]}
    
    @router.get("/quick-stats")
    async def get_quick_stats(request: Request):
        """Get quick KPI stats (fallback dashboard)"""
        await require_admin_auth(request)
        
        now = datetime.now(timezone.utc)
        week_ago = now - timedelta(days=7)
        
        # Quick stats
        total_users = await db.users.count_documents({})
        new_users_week = await db.users.count_documents({"created_at": {"$gte": week_ago}})
        active_listings = await db.listings.count_documents({"status": "active"})
        pending_disputes = await db.escrow_disputes.count_documents({"status": "open"})
        
        # Revenue this week
        revenue_pipeline = [
            {"$match": {"status": "completed", "completed_at": {"$gte": week_ago}}},
            {"$group": {"_id": None, "total": {"$sum": "$platform_fee"}}}
        ]
        revenue_result = await db.escrow_transactions.aggregate(revenue_pipeline).to_list(1)
        revenue_week = revenue_result[0]["total"] if revenue_result else 0
        
        return {
            "total_users": total_users,
            "new_users_week": new_users_week,
            "active_listings": active_listings,
            "pending_disputes": pending_disputes,
            "revenue_week": revenue_week,
            "generated_at": now.isoformat()
        }
    
    @router.post("/export")
    async def export_summary(
        request: Request,
        format: str = Query("json", description="json or pdf"),
        summary_id: Optional[str] = Query(None)
    ):
        """Export summary (JSON for now, PDF requires additional library)"""
        await require_admin_auth(request)
        
        if summary_id:
            summary_doc = await db.executive_summaries.find_one({"id": summary_id}, {"_id": 0})
            if not summary_doc:
                raise HTTPException(status_code=404, detail="Summary not found")
            summary = ExecutiveSummary(**summary_doc)
        else:
            config = await service.get_config()
            summary = await service.generate_summary(config.frequency)
        
        if format == "json":
            return summary.model_dump()
        elif format == "pdf":
            # PDF generation would require reportlab or similar
            return {"message": "PDF export coming soon", "summary": summary.model_dump()}
        else:
            raise HTTPException(status_code=400, detail="Invalid format")
    
    return router
