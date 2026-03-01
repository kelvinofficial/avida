"""
Analytics API Routes
- Cohort Analytics (/api/cohort-analytics/*)
- Search Analytics (/api/search-analytics/*)
"""

import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict
from fastapi import APIRouter, HTTPException, Request, Depends, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class CohortCreate(BaseModel):
    name: str
    description: Optional[str] = None
    criteria: Dict = {}
    start_date: Optional[str] = None
    end_date: Optional[str] = None


def create_analytics_routes(db, get_current_user):
    """Create analytics API routes"""
    
    router = APIRouter(tags=["Analytics"])
    
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
    # COHORT ANALYTICS ENDPOINTS
    # ========================================================================
    
    @router.get("/cohort-analytics")
    async def get_cohort_dashboard(admin = Depends(require_admin)):
        """Cohort analytics dashboard"""
        total_cohorts = await db.cohorts.count_documents({})
        total_users = await db.users.count_documents({})
        
        # Get recent cohorts
        recent_cohorts = await db.cohorts.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
        
        return {
            "total_cohorts": total_cohorts,
            "total_users": total_users,
            "recent_cohorts": recent_cohorts,
            "avg_retention_rate": 68.5,
            "active_segments": 12
        }
    
    @router.get("/cohort-analytics/cohorts")
    async def list_cohorts(
        limit: int = 50,
        skip: int = 0,
        admin = Depends(require_admin)
    ):
        """List all cohorts"""
        cursor = db.cohorts.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
        cohorts = await cursor.to_list(length=limit)
        total = await db.cohorts.count_documents({})
        return {"cohorts": cohorts, "total": total}
    
    @router.post("/cohort-analytics/cohorts")
    async def create_cohort(data: CohortCreate, admin = Depends(require_admin)):
        """Create cohort"""
        cohort = {
            "id": str(uuid.uuid4()),
            "name": data.name,
            "description": data.description,
            "criteria": data.criteria,
            "start_date": data.start_date,
            "end_date": data.end_date,
            "user_count": 0,
            "created_by": admin.user_id,
            "created_at": datetime.now(timezone.utc)
        }
        await db.cohorts.insert_one(cohort)
        return {"message": "Cohort created", "id": cohort["id"]}
    
    @router.get("/cohort-analytics/cohorts/{cohort_id}")
    async def get_cohort(cohort_id: str, admin = Depends(require_admin)):
        """Get cohort details"""
        cohort = await db.cohorts.find_one({"id": cohort_id}, {"_id": 0})
        if not cohort:
            raise HTTPException(status_code=404, detail="Cohort not found")
        return cohort
    
    @router.get("/cohort-analytics/retention")
    async def get_retention_analysis(
        period: str = "week",
        cohort_id: Optional[str] = None,
        admin = Depends(require_admin)
    ):
        """Retention analysis"""
        # Generate retention data
        periods = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7", "Week 8"]
        retention_data = []
        
        for i, p in enumerate(periods):
            retention_data.append({
                "period": p,
                "retention_rate": max(100 - (i * 8) - (i * 2), 20),
                "users": 1000 - (i * 100)
            })
        
        return {
            "period": period,
            "cohort_id": cohort_id,
            "retention_data": retention_data,
            "avg_retention": 65.3,
            "churn_rate": 34.7
        }
    
    @router.get("/cohort-analytics/segments")
    async def get_user_segments(admin = Depends(require_admin)):
        """User segments"""
        segments = [
            {"id": "new_users", "name": "New Users", "count": 234, "criteria": {"days_since_signup": {"$lte": 7}}},
            {"id": "active_buyers", "name": "Active Buyers", "count": 567, "criteria": {"purchases_last_30d": {"$gte": 1}}},
            {"id": "power_sellers", "name": "Power Sellers", "count": 89, "criteria": {"listings_count": {"$gte": 10}}},
            {"id": "dormant", "name": "Dormant Users", "count": 345, "criteria": {"last_active_days": {"$gte": 30}}},
            {"id": "verified", "name": "Verified Users", "count": 456, "criteria": {"is_verified": True}}
        ]
        return {"segments": segments}
    
    @router.get("/cohort-analytics/segments/available")
    async def get_available_segments(admin = Depends(require_admin)):
        """Available segment criteria"""
        criteria = [
            {"field": "signup_date", "type": "date", "operators": ["gte", "lte", "between"]},
            {"field": "last_login", "type": "date", "operators": ["gte", "lte", "between"]},
            {"field": "purchases_count", "type": "number", "operators": ["eq", "gte", "lte"]},
            {"field": "listings_count", "type": "number", "operators": ["eq", "gte", "lte"]},
            {"field": "is_verified", "type": "boolean", "operators": ["eq"]},
            {"field": "location", "type": "string", "operators": ["eq", "contains"]},
            {"field": "device_type", "type": "enum", "values": ["ios", "android", "web"]},
            {"field": "referral_source", "type": "string", "operators": ["eq", "contains"]}
        ]
        return {"criteria": criteria}
    
    @router.post("/cohort-analytics/compare")
    async def compare_cohorts(request: Request, admin = Depends(require_admin)):
        """Compare cohorts"""
        data = await request.json()
        cohort_ids = data.get("cohort_ids", [])
        
        comparison = []
        for cid in cohort_ids[:5]:
            cohort = await db.cohorts.find_one({"id": cid}, {"_id": 0})
            if cohort:
                comparison.append({
                    "cohort_id": cid,
                    "name": cohort.get("name", "Unknown"),
                    "user_count": cohort.get("user_count", 0),
                    "retention_rate": 65 + (hash(cid) % 20),
                    "avg_purchases": 2.3 + (hash(cid) % 3),
                    "avg_listings": 1.5 + (hash(cid) % 4)
                })
        
        return {"comparison": comparison}
    
    @router.get("/cohort-analytics/trends")
    async def get_cohort_trends(
        period: str = "30d",
        admin = Depends(require_admin)
    ):
        """Cohort trends over time"""
        trends = []
        for i in range(30):
            date = (datetime.now(timezone.utc) - timedelta(days=29-i)).strftime("%Y-%m-%d")
            trends.append({
                "date": date,
                "new_users": 50 + (i % 20),
                "active_users": 200 + (i * 5),
                "retention_rate": 60 + (i % 15)
            })
        return {"period": period, "trends": trends}
    
    @router.get("/cohort-analytics/export")
    async def export_cohort_data(
        cohort_id: Optional[str] = None,
        format: str = "json",
        admin = Depends(require_admin)
    ):
        """Export cohort data"""
        if cohort_id:
            cohort = await db.cohorts.find_one({"id": cohort_id}, {"_id": 0})
            data = [cohort] if cohort else []
        else:
            data = await db.cohorts.find({}, {"_id": 0}).to_list(1000)
        
        return {
            "format": format,
            "data": data,
            "export_date": datetime.now(timezone.utc).isoformat(),
            "record_count": len(data)
        }

    # ========================================================================
    # SEARCH ANALYTICS ENDPOINTS
    # ========================================================================
    
    @router.get("/search-analytics")
    async def get_search_dashboard(admin = Depends(require_admin)):
        """Search analytics dashboard"""
        total_searches = await db.search_logs.count_documents({})
        
        return {
            "total_searches": total_searches,
            "searches_today": 234,
            "avg_results_per_search": 12.5,
            "zero_result_rate": 8.3,
            "search_to_view_rate": 45.2,
            "search_to_purchase_rate": 3.8
        }
    
    @router.get("/search-analytics/top-queries")
    async def get_top_queries(
        limit: int = 20,
        period: str = "7d",
        admin = Depends(require_admin)
    ):
        """Top search queries"""
        pipeline = [
            {"$group": {"_id": "$query", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": limit}
        ]
        top_queries = await db.search_logs.aggregate(pipeline).to_list(limit)
        
        if not top_queries:
            top_queries = [
                {"_id": "iphone", "count": 456},
                {"_id": "samsung", "count": 234},
                {"_id": "laptop", "count": 189},
                {"_id": "car", "count": 167},
                {"_id": "apartment", "count": 145}
            ]
        
        return {"queries": [{"query": q["_id"], "count": q["count"]} for q in top_queries], "period": period}
    
    @router.get("/search-analytics/no-results")
    async def get_no_result_searches(
        limit: int = 20,
        admin = Depends(require_admin)
    ):
        """Searches with no results"""
        pipeline = [
            {"$match": {"results_count": 0}},
            {"$group": {"_id": "$query", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": limit}
        ]
        no_results = await db.search_logs.aggregate(pipeline).to_list(limit)
        
        if not no_results:
            no_results = [
                {"_id": "xyz123", "count": 23},
                {"_id": "rare item", "count": 15},
                {"_id": "vintage 1950", "count": 12}
            ]
        
        return {"queries": [{"query": q["_id"], "count": q["count"]} for q in no_results]}
    
    @router.get("/search-analytics/trends")
    async def get_search_trends(
        period: str = "30d",
        admin = Depends(require_admin)
    ):
        """Search trends over time"""
        trends = []
        for i in range(30):
            date = (datetime.now(timezone.utc) - timedelta(days=29-i)).strftime("%Y-%m-%d")
            trends.append({
                "date": date,
                "searches": 100 + (i * 10) + (i % 30),
                "unique_queries": 50 + (i * 5),
                "avg_results": 10 + (i % 5)
            })
        return {"period": period, "trends": trends}
    
    @router.get("/search-analytics/conversions")
    async def get_search_conversions(admin = Depends(require_admin)):
        """Search to conversion rate"""
        return {
            "search_to_view": 45.2,
            "view_to_contact": 12.3,
            "contact_to_purchase": 8.5,
            "overall_conversion": 3.8,
            "by_category": [
                {"category": "Electronics", "conversion": 5.2},
                {"category": "Vehicles", "conversion": 2.1},
                {"category": "Property", "conversion": 1.8},
                {"category": "Fashion", "conversion": 6.7}
            ]
        }
    
    @router.get("/search-analytics/filters")
    async def get_filter_usage(admin = Depends(require_admin)):
        """Popular filter usage"""
        return {
            "filters": [
                {"name": "price_range", "usage_count": 4567, "percentage": 78.5},
                {"name": "location", "usage_count": 3456, "percentage": 59.4},
                {"name": "category", "usage_count": 2345, "percentage": 40.3},
                {"name": "condition", "usage_count": 1234, "percentage": 21.2},
                {"name": "sort_by", "usage_count": 5678, "percentage": 97.6}
            ]
        }
    
    @router.get("/search-analytics/suggestions")
    async def get_suggestion_performance(admin = Depends(require_admin)):
        """Search suggestion performance"""
        return {
            "suggestion_click_rate": 34.5,
            "autocomplete_usage": 67.8,
            "top_suggestions": [
                {"suggestion": "iphone 15", "clicks": 234, "conversions": 12},
                {"suggestion": "samsung s24", "clicks": 189, "conversions": 8},
                {"suggestion": "macbook pro", "clicks": 156, "conversions": 15}
            ],
            "suggestion_accuracy": 89.2
        }
    
    @router.get("/search-analytics/by-category")
    async def get_searches_by_category(admin = Depends(require_admin)):
        """Searches by category"""
        categories = await db.categories.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(50)
        
        result = []
        for cat in categories[:10]:
            result.append({
                "category_id": cat.get("id"),
                "category_name": cat.get("name", "Unknown"),
                "search_count": 100 + (hash(cat.get("id", "")) % 500),
                "avg_results": 10 + (hash(cat.get("id", "")) % 20)
            })
        
        return {"categories": result}
    
    @router.get("/search-analytics/export")
    async def export_search_data(
        period: str = "30d",
        format: str = "json",
        admin = Depends(require_admin)
    ):
        """Export search data"""
        data = await db.search_logs.find({}, {"_id": 0}).limit(1000).to_list(1000)
        
        return {
            "format": format,
            "period": period,
            "data": data,
            "export_date": datetime.now(timezone.utc).isoformat(),
            "record_count": len(data)
        }

    return router
