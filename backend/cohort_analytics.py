"""
Cohort & Retention Analysis System
Comprehensive analytics for user behavior, engagement, and platform health
"""

from fastapi import APIRouter, HTTPException, Body, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from enum import Enum
import uuid
import logging
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ============================================================================
# ENUMS & CONSTANTS
# ============================================================================

class CohortDimension(str, Enum):
    SIGNUP_DATE = "signup_date"
    FIRST_LISTING = "first_listing"
    FIRST_PURCHASE = "first_purchase"
    FIRST_ESCROW = "first_escrow"
    FIRST_BOOST = "first_boost"
    USER_TYPE = "user_type"  # seller, buyer, hybrid
    COUNTRY = "country"
    CITY = "city"
    ACQUISITION_SOURCE = "acquisition_source"

class EventType(str, Enum):
    SIGNUP = "signup"
    LISTING_CREATED = "listing_created"
    CHAT_STARTED = "chat_started"
    CHECKOUT_COMPLETED = "checkout_completed"
    ESCROW_RELEASED = "escrow_released"
    BOOST_USED = "boost_used"
    LOGIN = "login"
    PROFILE_VIEWED = "profile_viewed"
    LISTING_VIEWED = "listing_viewed"

class TimeGranularity(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"

class AlertType(str, Enum):
    RETENTION_DROP = "retention_drop"
    HIGH_CHURN = "high_churn"
    HIGH_VALUE_COHORT = "high_value_cohort"
    ENGAGEMENT_SPIKE = "engagement_spike"

# Retention intervals (in days)
RETENTION_INTERVALS = {
    "D1": 1,
    "D3": 3,
    "D7": 7,
    "W2": 14,
    "W4": 28,
    "M2": 60,
    "M3": 90,
    "M6": 180
}

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class CohortEvent(BaseModel):
    id: str
    user_id: str
    event_type: str
    timestamp: str
    properties: Dict[str, Any] = {}
    session_id: Optional[str] = None

class CohortDefinition(BaseModel):
    id: str
    name: str
    dimension: str
    granularity: str  # daily, weekly, monthly
    is_enabled: bool = True
    filters: Dict[str, Any] = {}
    created_at: str
    updated_at: str

class CohortSnapshot(BaseModel):
    id: str
    cohort_key: str  # e.g., "signup_date:2024-01"
    dimension: str
    period: str  # The cohort period (e.g., "2024-01")
    user_count: int
    retention_data: Dict[str, float] = {}  # {"D1": 85.5, "D7": 65.2, ...}
    metrics: Dict[str, Any] = {}
    computed_at: str

class CohortAlert(BaseModel):
    id: str
    name: str
    alert_type: str
    threshold: float
    is_enabled: bool = True
    cohort_dimension: Optional[str] = None
    actions: List[Dict[str, Any]] = []  # What to trigger
    last_triggered: Optional[str] = None
    created_at: str

class CohortInsight(BaseModel):
    id: str
    insight_type: str  # drop_off, high_value, recommendation
    title: str
    description: str
    severity: str  # info, warning, critical
    cohort_key: Optional[str] = None
    data: Dict[str, Any] = {}
    ai_generated: bool = True
    generated_at: str


# ============================================================================
# SERVICE CLASS
# ============================================================================

class CohortAnalyticsService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.events = db.cohort_events
        self.definitions = db.cohort_definitions
        self.snapshots = db.cohort_snapshots
        self.alerts = db.cohort_alerts
        self.insights = db.cohort_insights
        self.users = db.users
        self.listings = db.listings
        self.transactions = db.transactions
        self.escrow = db.escrow_transactions
        self.boosts = db.boosts

    # -------------------------------------------------------------------------
    # EVENT TRACKING
    # -------------------------------------------------------------------------
    
    async def track_event(
        self,
        user_id: str,
        event_type: EventType,
        properties: Dict[str, Any] = {},
        session_id: Optional[str] = None
    ) -> Dict:
        """Track a user event for cohort analysis"""
        event = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "event_type": event_type.value,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "properties": properties,
            "session_id": session_id
        }
        await self.events.insert_one(event.copy())
        return event
    
    async def get_user_events(
        self,
        user_id: str,
        event_type: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict]:
        """Get events for a specific user"""
        query = {"user_id": user_id}
        if event_type:
            query["event_type"] = event_type
        if start_date or end_date:
            query["timestamp"] = {}
            if start_date:
                query["timestamp"]["$gte"] = start_date
            if end_date:
                query["timestamp"]["$lte"] = end_date
        
        return await self.events.find(query, {"_id": 0}).sort(
            "timestamp", -1
        ).limit(limit).to_list(length=limit)

    # -------------------------------------------------------------------------
    # COHORT DEFINITIONS
    # -------------------------------------------------------------------------
    
    async def initialize_default_cohorts(self):
        """Initialize default cohort definitions"""
        defaults = [
            {
                "name": "Signup Date Cohorts",
                "dimension": CohortDimension.SIGNUP_DATE.value,
                "granularity": TimeGranularity.MONTHLY.value,
                "is_enabled": True
            },
            {
                "name": "First Listing Cohorts",
                "dimension": CohortDimension.FIRST_LISTING.value,
                "granularity": TimeGranularity.MONTHLY.value,
                "is_enabled": True
            },
            {
                "name": "First Purchase Cohorts",
                "dimension": CohortDimension.FIRST_PURCHASE.value,
                "granularity": TimeGranularity.MONTHLY.value,
                "is_enabled": True
            },
            {
                "name": "User Type Cohorts",
                "dimension": CohortDimension.USER_TYPE.value,
                "granularity": TimeGranularity.MONTHLY.value,
                "is_enabled": True
            },
            {
                "name": "Country Cohorts",
                "dimension": CohortDimension.COUNTRY.value,
                "granularity": TimeGranularity.MONTHLY.value,
                "is_enabled": True
            }
        ]
        
        for cohort in defaults:
            existing = await self.definitions.find_one({"dimension": cohort["dimension"]})
            if not existing:
                now = datetime.now(timezone.utc).isoformat()
                cohort["id"] = str(uuid.uuid4())
                cohort["filters"] = {}
                cohort["created_at"] = now
                cohort["updated_at"] = now
                await self.definitions.insert_one(cohort)
                logger.info(f"Created default cohort: {cohort['name']}")
    
    async def get_cohort_definitions(self) -> List[Dict]:
        """Get all cohort definitions"""
        return await self.definitions.find({}, {"_id": 0}).to_list(length=100)
    
    async def update_cohort_definition(
        self,
        definition_id: str,
        updates: Dict[str, Any]
    ) -> Optional[Dict]:
        """Update a cohort definition"""
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        updates.pop("id", None)
        updates.pop("created_at", None)
        
        await self.definitions.update_one({"id": definition_id}, {"$set": updates})
        return await self.definitions.find_one({"id": definition_id}, {"_id": 0})

    # -------------------------------------------------------------------------
    # COHORT COMPUTATION
    # -------------------------------------------------------------------------
    
    async def compute_signup_cohorts(
        self,
        granularity: TimeGranularity = TimeGranularity.MONTHLY,
        months_back: int = 12
    ) -> List[Dict]:
        """Compute signup-based cohorts with retention data"""
        now = datetime.now(timezone.utc)
        cohorts = []
        
        for month_offset in range(months_back):
            # Calculate the cohort period
            cohort_date = now - timedelta(days=30 * month_offset)
            
            if granularity == TimeGranularity.MONTHLY:
                period_start = cohort_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                if cohort_date.month == 12:
                    period_end = period_start.replace(year=period_start.year + 1, month=1)
                else:
                    period_end = period_start.replace(month=period_start.month + 1)
                period_key = period_start.strftime("%Y-%m")
            elif granularity == TimeGranularity.WEEKLY:
                # Start of week (Monday)
                period_start = cohort_date - timedelta(days=cohort_date.weekday())
                period_start = period_start.replace(hour=0, minute=0, second=0, microsecond=0)
                period_end = period_start + timedelta(days=7)
                period_key = period_start.strftime("%Y-W%W")
            else:  # Daily
                period_start = cohort_date.replace(hour=0, minute=0, second=0, microsecond=0)
                period_end = period_start + timedelta(days=1)
                period_key = period_start.strftime("%Y-%m-%d")
            
            # Get users who signed up in this period
            cohort_users = await self.users.find({
                "created_at": {
                    "$gte": period_start.isoformat(),
                    "$lt": period_end.isoformat()
                }
            }, {"_id": 0, "id": 1, "created_at": 1, "email": 1}).to_list(length=10000)
            
            if not cohort_users:
                continue
            
            user_count = len(cohort_users)
            user_ids = [u.get("id") for u in cohort_users if u.get("id")]
            
            # Calculate retention for each interval
            retention_data = {}
            for interval_name, days in RETENTION_INTERVALS.items():
                retention_date = period_start + timedelta(days=days)
                
                # Skip future dates
                if retention_date > now:
                    continue
                
                # Count users who had activity after the retention date
                active_count = await self.events.count_documents({
                    "user_id": {"$in": user_ids},
                    "timestamp": {"$gte": retention_date.isoformat()}
                })
                
                # Also check listings and transactions
                listings_count = await self.listings.count_documents({
                    "seller_id": {"$in": user_ids},
                    "created_at": {"$gte": retention_date.isoformat()}
                })
                
                total_active = min(active_count + listings_count, user_count)
                retention_rate = (total_active / user_count * 100) if user_count > 0 else 0
                retention_data[interval_name] = round(retention_rate, 1)
            
            # Calculate additional metrics
            metrics = await self._calculate_cohort_metrics(user_ids, period_start)
            
            cohort = {
                "id": str(uuid.uuid4()),
                "cohort_key": f"signup_date:{period_key}",
                "dimension": CohortDimension.SIGNUP_DATE.value,
                "period": period_key,
                "user_count": user_count,
                "retention_data": retention_data,
                "metrics": metrics,
                "computed_at": now.isoformat()
            }
            
            cohorts.append(cohort)
        
        return cohorts
    
    async def compute_user_type_cohorts(self) -> List[Dict]:
        """Compute cohorts based on user type (seller, buyer, hybrid)"""
        now = datetime.now(timezone.utc)
        cohorts = []
        
        # Get all users
        all_users = await self.users.find({}, {"_id": 0, "id": 1}).to_list(length=50000)
        user_ids = [u.get("id") for u in all_users if u.get("id")]
        
        # Categorize users
        for user_type in ["seller", "buyer", "hybrid"]:
            if user_type == "seller":
                # Users with listings but no purchases
                sellers = await self.listings.distinct("seller_id")
                buyers = await self.transactions.distinct("buyer_id") if await self.transactions.count_documents({}) > 0 else []
                type_users = [s for s in sellers if s not in buyers]
            elif user_type == "buyer":
                # Users with purchases but no listings
                sellers = await self.listings.distinct("seller_id")
                buyers = await self.transactions.distinct("buyer_id") if await self.transactions.count_documents({}) > 0 else []
                type_users = [b for b in buyers if b not in sellers]
            else:  # hybrid
                # Users with both listings and purchases
                sellers = await self.listings.distinct("seller_id")
                buyers = await self.transactions.distinct("buyer_id") if await self.transactions.count_documents({}) > 0 else []
                type_users = [u for u in sellers if u in buyers]
            
            user_count = len(type_users)
            
            if user_count == 0:
                continue
            
            # Calculate retention
            retention_data = {}
            for interval_name, days in RETENTION_INTERVALS.items():
                retention_date = now - timedelta(days=days)
                
                active_count = await self.events.count_documents({
                    "user_id": {"$in": type_users},
                    "timestamp": {"$gte": retention_date.isoformat()}
                })
                
                retention_rate = (active_count / user_count * 100) if user_count > 0 else 0
                retention_data[interval_name] = round(retention_rate, 1)
            
            metrics = await self._calculate_cohort_metrics(type_users, now - timedelta(days=365))
            
            cohort = {
                "id": str(uuid.uuid4()),
                "cohort_key": f"user_type:{user_type}",
                "dimension": CohortDimension.USER_TYPE.value,
                "period": user_type,
                "user_count": user_count,
                "retention_data": retention_data,
                "metrics": metrics,
                "computed_at": now.isoformat()
            }
            
            cohorts.append(cohort)
        
        return cohorts
    
    async def compute_country_cohorts(self) -> List[Dict]:
        """Compute cohorts based on user country"""
        now = datetime.now(timezone.utc)
        cohorts = []
        
        # Get unique countries
        countries = await self.users.distinct("country")
        
        for country in countries:
            if not country:
                continue
            
            # Get users from this country
            country_users = await self.users.find(
                {"country": country}, {"_id": 0, "id": 1}
            ).to_list(length=50000)
            
            user_ids = [u.get("id") for u in country_users if u.get("id")]
            user_count = len(user_ids)
            
            if user_count == 0:
                continue
            
            # Calculate retention
            retention_data = {}
            for interval_name, days in RETENTION_INTERVALS.items():
                retention_date = now - timedelta(days=days)
                
                active_count = await self.events.count_documents({
                    "user_id": {"$in": user_ids},
                    "timestamp": {"$gte": retention_date.isoformat()}
                })
                
                retention_rate = (active_count / user_count * 100) if user_count > 0 else 0
                retention_data[interval_name] = round(retention_rate, 1)
            
            metrics = await self._calculate_cohort_metrics(user_ids, now - timedelta(days=365))
            
            cohort = {
                "id": str(uuid.uuid4()),
                "cohort_key": f"country:{country}",
                "dimension": CohortDimension.COUNTRY.value,
                "period": country,
                "user_count": user_count,
                "retention_data": retention_data,
                "metrics": metrics,
                "computed_at": now.isoformat()
            }
            
            cohorts.append(cohort)
        
        return cohorts
    
    async def _calculate_cohort_metrics(
        self,
        user_ids: List[str],
        since: datetime
    ) -> Dict[str, Any]:
        """Calculate detailed metrics for a cohort"""
        if not user_ids:
            return {}
        
        since_str = since.isoformat()
        
        # Listings posted
        listings_count = await self.listings.count_documents({
            "seller_id": {"$in": user_ids},
            "created_at": {"$gte": since_str}
        })
        
        # Transactions
        transactions_count = await self.transactions.count_documents({
            "$or": [
                {"buyer_id": {"$in": user_ids}},
                {"seller_id": {"$in": user_ids}}
            ],
            "created_at": {"$gte": since_str}
        }) if await self.transactions.count_documents({}) > 0 else 0
        
        # Boosts used
        boosts_count = await self.boosts.count_documents({
            "user_id": {"$in": user_ids},
            "created_at": {"$gte": since_str}
        }) if await self.boosts.count_documents({}) > 0 else 0
        
        # Chat events
        chats_count = await self.events.count_documents({
            "user_id": {"$in": user_ids},
            "event_type": EventType.CHAT_STARTED.value,
            "timestamp": {"$gte": since_str}
        })
        
        user_count = len(user_ids)
        
        return {
            "listings_posted": listings_count,
            "avg_listings_per_user": round(listings_count / user_count, 2) if user_count > 0 else 0,
            "transactions_completed": transactions_count,
            "avg_transactions_per_user": round(transactions_count / user_count, 2) if user_count > 0 else 0,
            "boosts_used": boosts_count,
            "chats_started": chats_count,
            "conversion_rate": round((transactions_count / chats_count * 100), 1) if chats_count > 0 else 0
        }

    # -------------------------------------------------------------------------
    # RETENTION HEATMAP
    # -------------------------------------------------------------------------
    
    async def get_retention_heatmap(
        self,
        dimension: str = CohortDimension.SIGNUP_DATE.value,
        granularity: str = TimeGranularity.MONTHLY.value,
        months_back: int = 12
    ) -> Dict:
        """Generate retention heatmap data for visualization"""
        if dimension == CohortDimension.SIGNUP_DATE.value:
            cohorts = await self.compute_signup_cohorts(
                TimeGranularity(granularity), months_back
            )
        elif dimension == CohortDimension.USER_TYPE.value:
            cohorts = await self.compute_user_type_cohorts()
        elif dimension == CohortDimension.COUNTRY.value:
            cohorts = await self.compute_country_cohorts()
        else:
            cohorts = await self.compute_signup_cohorts(
                TimeGranularity(granularity), months_back
            )
        
        # Format for heatmap
        periods = []
        intervals = list(RETENTION_INTERVALS.keys())
        heatmap_data = []
        
        for cohort in cohorts:
            periods.append(cohort["period"])
            row = {
                "period": cohort["period"],
                "user_count": cohort["user_count"],
                **cohort["retention_data"]
            }
            heatmap_data.append(row)
        
        return {
            "dimension": dimension,
            "granularity": granularity,
            "periods": periods,
            "intervals": intervals,
            "data": heatmap_data,
            "computed_at": datetime.now(timezone.utc).isoformat()
        }

    # -------------------------------------------------------------------------
    # ENGAGEMENT METRICS
    # -------------------------------------------------------------------------
    
    async def get_engagement_metrics(self) -> Dict:
        """Get overall engagement metrics"""
        now = datetime.now(timezone.utc)
        
        # Total users
        total_users = await self.users.count_documents({})
        
        # Active users (last 30 days)
        thirty_days_ago = (now - timedelta(days=30)).isoformat()
        active_events = await self.events.distinct("user_id", {
            "timestamp": {"$gte": thirty_days_ago}
        })
        active_users = len(active_events)
        
        # DAU (Daily Active Users)
        one_day_ago = (now - timedelta(days=1)).isoformat()
        dau_events = await self.events.distinct("user_id", {
            "timestamp": {"$gte": one_day_ago}
        })
        dau = len(dau_events)
        
        # WAU (Weekly Active Users)
        seven_days_ago = (now - timedelta(days=7)).isoformat()
        wau_events = await self.events.distinct("user_id", {
            "timestamp": {"$gte": seven_days_ago}
        })
        wau = len(wau_events)
        
        # MAU (Monthly Active Users)
        mau = active_users
        
        # Listings metrics
        total_listings = await self.listings.count_documents({})
        new_listings_month = await self.listings.count_documents({
            "created_at": {"$gte": thirty_days_ago}
        })
        
        # Transactions
        total_transactions = await self.transactions.count_documents({}) if await self.transactions.count_documents({}) > 0 else 0
        
        return {
            "total_users": total_users,
            "active_users_30d": active_users,
            "dau": dau,
            "wau": wau,
            "mau": mau,
            "dau_mau_ratio": round((dau / mau * 100), 1) if mau > 0 else 0,
            "total_listings": total_listings,
            "new_listings_30d": new_listings_month,
            "total_transactions": total_transactions,
            "computed_at": now.isoformat()
        }

    # -------------------------------------------------------------------------
    # REVENUE & MONETIZATION
    # -------------------------------------------------------------------------
    
    async def get_revenue_metrics(self, months_back: int = 12) -> Dict:
        """Get revenue and monetization metrics per cohort"""
        now = datetime.now(timezone.utc)
        revenue_data = []
        
        for month_offset in range(months_back):
            cohort_date = now - timedelta(days=30 * month_offset)
            period_start = cohort_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if cohort_date.month == 12:
                period_end = period_start.replace(year=period_start.year + 1, month=1)
            else:
                period_end = period_start.replace(month=period_start.month + 1)
            period_key = period_start.strftime("%Y-%m")
            
            # Get users who signed up in this period
            cohort_users = await self.users.find({
                "created_at": {
                    "$gte": period_start.isoformat(),
                    "$lt": period_end.isoformat()
                }
            }, {"_id": 0, "id": 1}).to_list(length=10000)
            
            user_ids = [u.get("id") for u in cohort_users if u.get("id")]
            user_count = len(user_ids)
            
            if user_count == 0:
                continue
            
            # Calculate revenue metrics (simulated based on boosts)
            boosts = await self.boosts.find({
                "user_id": {"$in": user_ids}
            }, {"_id": 0}).to_list(length=10000)
            
            boost_revenue = len(boosts) * 5.0  # Assume $5 per boost
            
            # Commission from transactions (simulated)
            commission = user_count * 2.5  # Simulated
            
            # LTV calculation
            ltv = (boost_revenue + commission) / user_count if user_count > 0 else 0
            
            revenue_data.append({
                "period": period_key,
                "user_count": user_count,
                "boost_revenue": round(boost_revenue, 2),
                "commission_earned": round(commission, 2),
                "total_revenue": round(boost_revenue + commission, 2),
                "ltv": round(ltv, 2),
                "arpu": round((boost_revenue + commission) / user_count, 2) if user_count > 0 else 0
            })
        
        return {
            "data": revenue_data,
            "total_revenue": sum(r["total_revenue"] for r in revenue_data),
            "avg_ltv": round(sum(r["ltv"] for r in revenue_data) / len(revenue_data), 2) if revenue_data else 0,
            "computed_at": now.isoformat()
        }

    # -------------------------------------------------------------------------
    # CONVERSION FUNNEL
    # -------------------------------------------------------------------------
    
    async def get_conversion_funnel(self, days: int = 30) -> Dict:
        """Get conversion funnel metrics"""
        now = datetime.now(timezone.utc)
        since = (now - timedelta(days=days)).isoformat()
        
        # Funnel stages
        signups = await self.users.count_documents({
            "created_at": {"$gte": since}
        })
        
        # Users who viewed listings
        listing_views = await self.events.distinct("user_id", {
            "event_type": EventType.LISTING_VIEWED.value,
            "timestamp": {"$gte": since}
        })
        
        # Users who started chats
        chat_starts = await self.events.distinct("user_id", {
            "event_type": EventType.CHAT_STARTED.value,
            "timestamp": {"$gte": since}
        })
        
        # Users who completed checkout
        checkouts = await self.events.distinct("user_id", {
            "event_type": EventType.CHECKOUT_COMPLETED.value,
            "timestamp": {"$gte": since}
        })
        
        # Build funnel
        funnel = [
            {
                "stage": "Signup",
                "count": signups,
                "rate": 100.0
            },
            {
                "stage": "View Listing",
                "count": len(listing_views),
                "rate": round((len(listing_views) / signups * 100), 1) if signups > 0 else 0
            },
            {
                "stage": "Start Chat",
                "count": len(chat_starts),
                "rate": round((len(chat_starts) / signups * 100), 1) if signups > 0 else 0
            },
            {
                "stage": "Complete Purchase",
                "count": len(checkouts),
                "rate": round((len(checkouts) / signups * 100), 1) if signups > 0 else 0
            }
        ]
        
        # Calculate drop-off rates
        for i in range(1, len(funnel)):
            prev_count = funnel[i-1]["count"]
            curr_count = funnel[i]["count"]
            funnel[i]["drop_off"] = round(((prev_count - curr_count) / prev_count * 100), 1) if prev_count > 0 else 0
            funnel[i]["conversion_from_prev"] = round((curr_count / prev_count * 100), 1) if prev_count > 0 else 0
        
        funnel[0]["drop_off"] = 0
        funnel[0]["conversion_from_prev"] = 100
        
        return {
            "days": days,
            "funnel": funnel,
            "overall_conversion": round((len(checkouts) / signups * 100), 2) if signups > 0 else 0,
            "computed_at": now.isoformat()
        }

    # -------------------------------------------------------------------------
    # AI INSIGHTS (GPT-5.2)
    # -------------------------------------------------------------------------
    
    async def generate_ai_insights(self) -> List[Dict]:
        """Generate AI-powered insights using GPT-5.2"""
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            
            api_key = os.environ.get("EMERGENT_LLM_KEY")
            if not api_key:
                logger.warning("EMERGENT_LLM_KEY not configured")
                return []
            
            # Gather data for analysis
            engagement = await self.get_engagement_metrics()
            heatmap = await self.get_retention_heatmap()
            funnel = await self.get_conversion_funnel()
            revenue = await self.get_revenue_metrics(months_back=6)
            
            # Prepare data summary for AI
            data_summary = f"""
            Analyze this user cohort and retention data:
            
            ENGAGEMENT METRICS:
            - Total Users: {engagement['total_users']}
            - Monthly Active Users (MAU): {engagement['mau']}
            - Weekly Active Users (WAU): {engagement['wau']}
            - Daily Active Users (DAU): {engagement['dau']}
            - DAU/MAU Ratio: {engagement['dau_mau_ratio']}%
            
            RETENTION DATA (by signup month):
            {[{'period': d['period'], 'users': d['user_count'], 'D7': d.get('D7', 'N/A'), 'M2': d.get('M2', 'N/A')} for d in heatmap['data'][:6]]}
            
            CONVERSION FUNNEL:
            {funnel['funnel']}
            Overall Conversion: {funnel['overall_conversion']}%
            
            REVENUE (last 6 months):
            Total Revenue: ${revenue['total_revenue']}
            Average LTV: ${revenue['avg_ltv']}
            
            Based on this data, provide 3-5 actionable insights in JSON format:
            [
                {{
                    "type": "drop_off|high_value|recommendation|warning",
                    "title": "Brief title",
                    "description": "Detailed insight with specific numbers",
                    "severity": "info|warning|critical",
                    "action": "Recommended action to take"
                }}
            ]
            
            Focus on:
            1. Retention drop-off patterns
            2. High-value cohort identification
            3. Conversion bottlenecks
            4. Revenue optimization opportunities
            5. User engagement trends
            
            Return ONLY valid JSON array, no other text.
            """
            
            chat = LlmChat(
                api_key=api_key,
                session_id=f"cohort_insights_{datetime.now().strftime('%Y%m%d%H%M')}",
                system_message="You are an expert data analyst specializing in user retention, cohort analysis, and growth metrics. Provide actionable insights based on data."
            ).with_model("openai", "gpt-5.2")
            
            response = await chat.send_message(UserMessage(text=data_summary))
            
            # Parse AI response
            import json
            try:
                # Clean response
                response_text = response.strip()
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.startswith("```"):
                    response_text = response_text[3:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                
                insights_data = json.loads(response_text)
                
                now = datetime.now(timezone.utc).isoformat()
                insights = []
                
                for insight in insights_data:
                    insight_doc = {
                        "id": str(uuid.uuid4()),
                        "insight_type": insight.get("type", "recommendation"),
                        "title": insight.get("title", "Insight"),
                        "description": insight.get("description", ""),
                        "severity": insight.get("severity", "info"),
                        "action": insight.get("action", ""),
                        "ai_generated": True,
                        "generated_at": now
                    }
                    insights.append(insight_doc)
                    
                    # Store in database
                    await self.insights.insert_one(insight_doc.copy())
                
                return insights
                
            except json.JSONDecodeError:
                logger.error(f"Failed to parse AI response: {response}")
                return []
                
        except Exception as e:
            logger.error(f"AI insights generation failed: {e}")
            return []
    
    async def get_stored_insights(self, limit: int = 20) -> List[Dict]:
        """Get previously generated insights"""
        return await self.insights.find({}, {"_id": 0}).sort(
            "generated_at", -1
        ).limit(limit).to_list(length=limit)

    # -------------------------------------------------------------------------
    # ALERTS
    # -------------------------------------------------------------------------
    
    async def get_alerts(self) -> List[Dict]:
        """Get all configured alerts"""
        return await self.alerts.find({}, {"_id": 0}).to_list(length=100)
    
    async def create_alert(
        self,
        name: str,
        alert_type: AlertType,
        threshold: float,
        cohort_dimension: Optional[str] = None,
        actions: List[Dict] = []
    ) -> Dict:
        """Create a new alert"""
        alert = {
            "id": str(uuid.uuid4()),
            "name": name,
            "alert_type": alert_type.value,
            "threshold": threshold,
            "is_enabled": True,
            "cohort_dimension": cohort_dimension,
            "actions": actions,
            "last_triggered": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await self.alerts.insert_one(alert.copy())
        return alert
    
    async def check_alerts(self) -> List[Dict]:
        """Check all alerts and return triggered ones"""
        triggered = []
        alerts = await self.get_alerts()
        
        for alert in alerts:
            if not alert.get("is_enabled"):
                continue
            
            if alert["alert_type"] == AlertType.RETENTION_DROP.value:
                # Check if any cohort has retention below threshold
                heatmap = await self.get_retention_heatmap()
                for cohort in heatmap["data"]:
                    d7_retention = cohort.get("D7", 100)
                    if d7_retention < alert["threshold"]:
                        triggered.append({
                            "alert": alert,
                            "trigger_reason": f"D7 retention ({d7_retention}%) below threshold ({alert['threshold']}%)",
                            "cohort": cohort["period"]
                        })
                        # Update last triggered
                        await self.alerts.update_one(
                            {"id": alert["id"]},
                            {"$set": {"last_triggered": datetime.now(timezone.utc).isoformat()}}
                        )
        
        return triggered

    # -------------------------------------------------------------------------
    # DRILL-DOWN
    # -------------------------------------------------------------------------
    
    async def get_cohort_users(
        self,
        cohort_key: str,
        limit: int = 100,
        skip: int = 0
    ) -> Dict:
        """Get users in a specific cohort for drill-down"""
        # Parse cohort key (e.g., "signup_date:2024-01")
        parts = cohort_key.split(":")
        if len(parts) != 2:
            return {"users": [], "total": 0}
        
        dimension, period = parts
        
        if dimension == "signup_date":
            # Parse period (e.g., "2024-01")
            try:
                year, month = period.split("-")
                start_date = datetime(int(year), int(month), 1, tzinfo=timezone.utc)
                if int(month) == 12:
                    end_date = datetime(int(year) + 1, 1, 1, tzinfo=timezone.utc)
                else:
                    end_date = datetime(int(year), int(month) + 1, 1, tzinfo=timezone.utc)
                
                query = {
                    "created_at": {
                        "$gte": start_date.isoformat(),
                        "$lt": end_date.isoformat()
                    }
                }
            except:
                return {"users": [], "total": 0}
        elif dimension == "user_type":
            # This would require more complex query
            return {"users": [], "total": 0, "message": "User type drill-down not yet implemented"}
        elif dimension == "country":
            query = {"country": period}
        else:
            return {"users": [], "total": 0}
        
        total = await self.users.count_documents(query)
        
        users = await self.users.find(
            query,
            {"_id": 0, "password": 0}
        ).skip(skip).limit(limit).to_list(length=limit)
        
        return {
            "cohort_key": cohort_key,
            "users": users,
            "total": total,
            "limit": limit,
            "skip": skip
        }

    # -------------------------------------------------------------------------
    # DASHBOARD SUMMARY
    # -------------------------------------------------------------------------
    
    async def get_dashboard_summary(self) -> Dict:
        """Get complete dashboard summary"""
        engagement = await self.get_engagement_metrics()
        heatmap = await self.get_retention_heatmap()
        funnel = await self.get_conversion_funnel(days=30)
        revenue = await self.get_revenue_metrics(months_back=6)
        insights = await self.get_stored_insights(limit=5)
        
        # Calculate trends
        prev_month_users = 0
        curr_month_users = 0
        if len(heatmap["data"]) >= 2:
            curr_month_users = heatmap["data"][0]["user_count"]
            prev_month_users = heatmap["data"][1]["user_count"]
        
        user_growth = round(((curr_month_users - prev_month_users) / prev_month_users * 100), 1) if prev_month_users > 0 else 0
        
        return {
            "engagement": engagement,
            "retention_heatmap": heatmap,
            "conversion_funnel": funnel,
            "revenue": revenue,
            "insights": insights,
            "trends": {
                "user_growth": user_growth,
                "active_user_trend": "up" if engagement["dau"] > 10 else "stable"
            },
            "generated_at": datetime.now(timezone.utc).isoformat()
        }


# ============================================================================
# ROUTER FACTORY
# ============================================================================

def create_cohort_analytics_router(db: AsyncIOMotorDatabase):
    """Create the Cohort Analytics router"""
    router = APIRouter(prefix="/cohort-analytics", tags=["Cohort & Retention Analytics"])
    service = CohortAnalyticsService(db)
    
    # Initialize on startup
    @router.on_event("startup")
    async def startup():
        await service.initialize_default_cohorts()
    
    # -------------------------------------------------------------------------
    # DASHBOARD
    # -------------------------------------------------------------------------
    
    @router.get("/dashboard")
    async def get_dashboard_summary():
        """Get complete cohort analytics dashboard"""
        return await service.get_dashboard_summary()
    
    @router.get("/engagement")
    async def get_engagement_metrics():
        """Get engagement metrics (DAU, WAU, MAU)"""
        return await service.get_engagement_metrics()
    
    # -------------------------------------------------------------------------
    # RETENTION HEATMAP
    # -------------------------------------------------------------------------
    
    @router.get("/retention/heatmap")
    async def get_retention_heatmap(
        dimension: str = Query(CohortDimension.SIGNUP_DATE.value),
        granularity: str = Query(TimeGranularity.MONTHLY.value),
        months_back: int = Query(12, ge=1, le=24)
    ):
        """Get retention heatmap data"""
        return await service.get_retention_heatmap(dimension, granularity, months_back)
    
    @router.get("/retention/cohorts")
    async def get_cohorts(
        dimension: str = Query(CohortDimension.SIGNUP_DATE.value),
        granularity: str = Query(TimeGranularity.MONTHLY.value),
        months_back: int = Query(12, ge=1, le=24)
    ):
        """Get computed cohorts with retention data"""
        if dimension == CohortDimension.SIGNUP_DATE.value:
            return await service.compute_signup_cohorts(TimeGranularity(granularity), months_back)
        elif dimension == CohortDimension.USER_TYPE.value:
            return await service.compute_user_type_cohorts()
        elif dimension == CohortDimension.COUNTRY.value:
            return await service.compute_country_cohorts()
        else:
            return await service.compute_signup_cohorts(TimeGranularity(granularity), months_back)
    
    # -------------------------------------------------------------------------
    # CONVERSION FUNNEL
    # -------------------------------------------------------------------------
    
    @router.get("/funnel")
    async def get_conversion_funnel(days: int = Query(30, ge=1, le=365)):
        """Get conversion funnel metrics"""
        return await service.get_conversion_funnel(days)
    
    # -------------------------------------------------------------------------
    # REVENUE
    # -------------------------------------------------------------------------
    
    @router.get("/revenue")
    async def get_revenue_metrics(months_back: int = Query(12, ge=1, le=24)):
        """Get revenue and monetization metrics"""
        return await service.get_revenue_metrics(months_back)
    
    # -------------------------------------------------------------------------
    # AI INSIGHTS
    # -------------------------------------------------------------------------
    
    @router.post("/insights/generate")
    async def generate_ai_insights():
        """Generate new AI-powered insights"""
        insights = await service.generate_ai_insights()
        return {"insights": insights, "count": len(insights)}
    
    @router.get("/insights")
    async def get_insights(limit: int = Query(20, ge=1, le=100)):
        """Get stored AI insights"""
        return await service.get_stored_insights(limit)
    
    # -------------------------------------------------------------------------
    # COHORT DEFINITIONS
    # -------------------------------------------------------------------------
    
    @router.get("/definitions")
    async def get_cohort_definitions():
        """Get all cohort definitions"""
        return await service.get_cohort_definitions()
    
    @router.put("/definitions/{definition_id}")
    async def update_cohort_definition(
        definition_id: str,
        updates: Dict[str, Any] = Body(...)
    ):
        """Update a cohort definition"""
        result = await service.update_cohort_definition(definition_id, updates)
        if not result:
            raise HTTPException(status_code=404, detail="Definition not found")
        return result
    
    @router.post("/initialize")
    async def initialize_cohorts():
        """Initialize default cohort definitions"""
        await service.initialize_default_cohorts()
        return {"status": "initialized"}
    
    # -------------------------------------------------------------------------
    # ALERTS
    # -------------------------------------------------------------------------
    
    @router.get("/alerts")
    async def get_alerts():
        """Get all configured alerts"""
        return await service.get_alerts()
    
    @router.post("/alerts")
    async def create_alert(
        name: str = Body(...),
        alert_type: str = Body(...),
        threshold: float = Body(...),
        cohort_dimension: Optional[str] = Body(None),
        actions: List[Dict] = Body([])
    ):
        """Create a new alert"""
        return await service.create_alert(
            name=name,
            alert_type=AlertType(alert_type),
            threshold=threshold,
            cohort_dimension=cohort_dimension,
            actions=actions
        )
    
    @router.post("/alerts/check")
    async def check_alerts():
        """Check all alerts and return triggered ones"""
        return await service.check_alerts()
    
    # -------------------------------------------------------------------------
    # DRILL-DOWN
    # -------------------------------------------------------------------------
    
    @router.get("/cohort/{cohort_key}/users")
    async def get_cohort_users(
        cohort_key: str,
        limit: int = Query(100, ge=1, le=500),
        skip: int = Query(0, ge=0)
    ):
        """Get users in a specific cohort"""
        return await service.get_cohort_users(cohort_key, limit, skip)
    
    # -------------------------------------------------------------------------
    # EVENT TRACKING
    # -------------------------------------------------------------------------
    
    @router.post("/events/track")
    async def track_event(
        user_id: str = Body(...),
        event_type: str = Body(...),
        properties: Dict[str, Any] = Body({}),
        session_id: Optional[str] = Body(None)
    ):
        """Track a user event"""
        return await service.track_event(
            user_id=user_id,
            event_type=EventType(event_type),
            properties=properties,
            session_id=session_id
        )
    
    @router.get("/events/{user_id}")
    async def get_user_events(
        user_id: str,
        event_type: Optional[str] = None,
        limit: int = Query(100, ge=1, le=500)
    ):
        """Get events for a user"""
        return await service.get_user_events(user_id, event_type, limit=limit)
    
    return router, service
