"""
Content Calendar Module
Schedule and manage blog posts, social media campaigns, and SEO milestones
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Header
from pydantic import BaseModel, Field
from typing import Optional, List, Callable
from datetime import datetime, timezone, timedelta
import uuid

# Pydantic Models (defined outside the factory)
class CalendarEventCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    event_type: str = Field(..., description="blog, social, seo_milestone, campaign, other")
    scheduled_date: datetime
    end_date: Optional[datetime] = None
    status: str = Field(default="scheduled", description="scheduled, in_progress, completed, cancelled")
    priority: str = Field(default="medium", description="low, medium, high, critical")
    region: Optional[str] = None
    category: Optional[str] = None
    platform: Optional[str] = None
    content_id: Optional[str] = None
    tags: Optional[List[str]] = []
    color: Optional[str] = None
    recurrence: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = ""

class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_type: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    region: Optional[str] = None
    category: Optional[str] = None
    platform: Optional[str] = None
    content_id: Optional[str] = None
    tags: Optional[List[str]] = None
    color: Optional[str] = None
    recurrence: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None

# Event type colors
EVENT_TYPE_COLORS = {
    "blog": "#4CAF50",
    "social": "#2196F3",
    "seo_milestone": "#FF9800",
    "campaign": "#9C27B0",
    "other": "#607D8B"
}

def serialize_event(event: dict) -> dict:
    """Convert MongoDB document to JSON-serializable dict"""
    return {
        "id": event.get("id", str(event.get("_id", ""))),
        "title": event.get("title", ""),
        "description": event.get("description", ""),
        "event_type": event.get("event_type", "other"),
        "scheduled_date": event.get("scheduled_date").isoformat() if event.get("scheduled_date") else None,
        "end_date": event.get("end_date").isoformat() if event.get("end_date") else None,
        "status": event.get("status", "scheduled"),
        "priority": event.get("priority", "medium"),
        "region": event.get("region"),
        "category": event.get("category"),
        "platform": event.get("platform"),
        "content_id": event.get("content_id"),
        "tags": event.get("tags", []),
        "color": event.get("color") or EVENT_TYPE_COLORS.get(event.get("event_type", "other"), "#607D8B"),
        "recurrence": event.get("recurrence"),
        "assigned_to": event.get("assigned_to"),
        "notes": event.get("notes", ""),
        "created_at": event.get("created_at").isoformat() if event.get("created_at") else None,
        "updated_at": event.get("updated_at").isoformat() if event.get("updated_at") else None
    }


def create_content_calendar_router(db, get_current_user: Callable):
    """Create the content calendar router with database and auth dependencies"""
    
    router = APIRouter(prefix="/growth/calendar", tags=["Content Calendar"])
    
    async def require_admin(authorization: str = Header(None)):
        """Check for admin authorization"""
        if not authorization:
            raise HTTPException(status_code=401, detail="Admin access required")
        return True

    @router.post("/events")
    async def create_calendar_event(event: CalendarEventCreate, admin=Depends(require_admin)):
        """Create a new calendar event"""
        event_doc = {
            "id": str(uuid.uuid4()),
            "title": event.title,
            "description": event.description,
            "event_type": event.event_type,
            "scheduled_date": event.scheduled_date,
            "end_date": event.end_date,
            "status": event.status,
            "priority": event.priority,
            "region": event.region,
            "category": event.category,
            "platform": event.platform,
            "content_id": event.content_id,
            "tags": event.tags or [],
            "color": event.color or EVENT_TYPE_COLORS.get(event.event_type, "#607D8B"),
            "recurrence": event.recurrence,
            "assigned_to": event.assigned_to,
            "notes": event.notes,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.calendar_events.insert_one(event_doc)
        
        return {
            "success": True,
            "message": "Calendar event created",
            "event": serialize_event(event_doc)
        }

    @router.get("/events")
    async def get_calendar_events(
        start_date: Optional[str] = Query(None),
        end_date: Optional[str] = Query(None),
        event_type: Optional[str] = Query(None),
        status: Optional[str] = Query(None),
        region: Optional[str] = Query(None),
        limit: int = Query(100, ge=1, le=500),
        admin=Depends(require_admin)
    ):
        """Get calendar events with optional filters"""
        query = {}
        
        if start_date or end_date:
            date_query = {}
            if start_date:
                try:
                    start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                    date_query["$gte"] = start
                except:
                    pass
            if end_date:
                try:
                    end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                    date_query["$lte"] = end
                except:
                    pass
            if date_query:
                query["scheduled_date"] = date_query
        
        if event_type:
            query["event_type"] = event_type
        if status:
            query["status"] = status
        if region:
            query["region"] = region
        
        events = await db.calendar_events.find(query).sort("scheduled_date", 1).limit(limit).to_list(length=limit)
        
        return {
            "events": [serialize_event(e) for e in events],
            "total": len(events)
        }

    @router.get("/events/{event_id}")
    async def get_calendar_event(event_id: str, admin=Depends(require_admin)):
        """Get a single calendar event by ID"""
        event = await db.calendar_events.find_one({"id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        return {"event": serialize_event(event)}

    @router.put("/events/{event_id}")
    async def update_calendar_event(event_id: str, update: CalendarEventUpdate, admin=Depends(require_admin)):
        """Update a calendar event"""
        event = await db.calendar_events.find_one({"id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        if "event_type" in update_data and "color" not in update_data:
            update_data["color"] = EVENT_TYPE_COLORS.get(update_data["event_type"], "#607D8B")
        
        await db.calendar_events.update_one({"id": event_id}, {"$set": update_data})
        updated_event = await db.calendar_events.find_one({"id": event_id})
        
        return {"success": True, "message": "Event updated", "event": serialize_event(updated_event)}

    @router.delete("/events/{event_id}")
    async def delete_calendar_event(event_id: str, admin=Depends(require_admin)):
        """Delete a calendar event"""
        result = await db.calendar_events.delete_one({"id": event_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Event not found")
        return {"success": True, "message": "Event deleted"}

    @router.post("/events/{event_id}/reschedule")
    async def reschedule_event(event_id: str, new_date: datetime, admin=Depends(require_admin)):
        """Reschedule an event to a new date"""
        event = await db.calendar_events.find_one({"id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        duration = None
        if event.get("end_date") and event.get("scheduled_date"):
            duration = event["end_date"] - event["scheduled_date"]
        
        update_data = {"scheduled_date": new_date, "updated_at": datetime.now(timezone.utc)}
        if duration:
            update_data["end_date"] = new_date + duration
        
        await db.calendar_events.update_one({"id": event_id}, {"$set": update_data})
        updated_event = await db.calendar_events.find_one({"id": event_id})
        
        return {"success": True, "message": "Event rescheduled", "event": serialize_event(updated_event)}

    @router.get("/stats")
    async def get_calendar_stats(
        start_date: Optional[str] = Query(None),
        end_date: Optional[str] = Query(None),
        admin=Depends(require_admin)
    ):
        """Get calendar statistics"""
        query = {}
        
        if start_date or end_date:
            date_query = {}
            if start_date:
                try:
                    date_query["$gte"] = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                except:
                    pass
            if end_date:
                try:
                    date_query["$lte"] = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                except:
                    pass
            if date_query:
                query["scheduled_date"] = date_query
        
        events = await db.calendar_events.find(query).to_list(length=1000)
        
        stats = {
            "total_events": len(events),
            "by_type": {},
            "by_status": {},
            "by_priority": {},
            "by_region": {},
            "upcoming_this_week": 0,
            "overdue": 0
        }
        
        now = datetime.now(timezone.utc)
        week_end = now + timedelta(days=7)
        
        for event in events:
            event_type = event.get("event_type", "other")
            stats["by_type"][event_type] = stats["by_type"].get(event_type, 0) + 1
            
            status = event.get("status", "scheduled")
            stats["by_status"][status] = stats["by_status"].get(status, 0) + 1
            
            priority = event.get("priority", "medium")
            stats["by_priority"][priority] = stats["by_priority"].get(priority, 0) + 1
            
            region = event.get("region")
            if region:
                stats["by_region"][region] = stats["by_region"].get(region, 0) + 1
            
            scheduled = event.get("scheduled_date")
            if scheduled and now <= scheduled <= week_end and event.get("status") == "scheduled":
                stats["upcoming_this_week"] += 1
            
            if scheduled and scheduled < now and event.get("status") in ["scheduled", "in_progress"]:
                stats["overdue"] += 1
        
        return stats

    @router.get("/upcoming")
    async def get_upcoming_events(
        days: int = Query(7, ge=1, le=90),
        limit: int = Query(20, ge=1, le=100),
        admin=Depends(require_admin)
    ):
        """Get upcoming events for the next N days"""
        now = datetime.now(timezone.utc)
        end = now + timedelta(days=days)
        
        events = await db.calendar_events.find({
            "scheduled_date": {"$gte": now, "$lte": end},
            "status": {"$in": ["scheduled", "in_progress"]}
        }).sort("scheduled_date", 1).limit(limit).to_list(length=limit)
        
        return {
            "events": [serialize_event(e) for e in events],
            "period": {"start": now.isoformat(), "end": end.isoformat(), "days": days}
        }

    @router.post("/bulk-create")
    async def bulk_create_events(events: List[CalendarEventCreate], admin=Depends(require_admin)):
        """Create multiple calendar events at once"""
        if len(events) > 50:
            raise HTTPException(status_code=400, detail="Maximum 50 events per request")
        
        created_events = []
        for event in events:
            event_doc = {
                "id": str(uuid.uuid4()),
                "title": event.title,
                "description": event.description,
                "event_type": event.event_type,
                "scheduled_date": event.scheduled_date,
                "end_date": event.end_date,
                "status": event.status,
                "priority": event.priority,
                "region": event.region,
                "category": event.category,
                "platform": event.platform,
                "content_id": event.content_id,
                "tags": event.tags or [],
                "color": event.color or EVENT_TYPE_COLORS.get(event.event_type, "#607D8B"),
                "recurrence": event.recurrence,
                "assigned_to": event.assigned_to,
                "notes": event.notes,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            created_events.append(event_doc)
        
        if created_events:
            await db.calendar_events.insert_many(created_events)
        
        return {"success": True, "message": f"Created {len(created_events)} events", "events": [serialize_event(e) for e in created_events]}

    @router.get("/templates")
    async def get_event_templates(admin=Depends(require_admin)):
        """Get predefined event templates for quick creation"""
        templates = [
            {"id": "blog_post", "name": "Blog Post", "event_type": "blog", "description": "Publish a new blog article", "default_duration_hours": 2, "suggested_tags": ["content", "seo", "organic"], "color": EVENT_TYPE_COLORS["blog"]},
            {"id": "social_twitter", "name": "Twitter Post", "event_type": "social", "platform": "twitter", "description": "Publish a tweet or thread", "default_duration_hours": 1, "suggested_tags": ["social", "twitter"], "color": "#1DA1F2"},
            {"id": "social_linkedin", "name": "LinkedIn Post", "event_type": "social", "platform": "linkedin", "description": "Publish a LinkedIn update", "default_duration_hours": 1, "suggested_tags": ["social", "linkedin"], "color": "#0077B5"},
            {"id": "social_facebook", "name": "Facebook Post", "event_type": "social", "platform": "facebook", "description": "Publish a Facebook post", "default_duration_hours": 1, "suggested_tags": ["social", "facebook"], "color": "#4267B2"},
            {"id": "seo_audit", "name": "SEO Audit", "event_type": "seo_milestone", "description": "Conduct technical SEO audit", "default_duration_hours": 4, "suggested_tags": ["seo", "audit"], "color": EVENT_TYPE_COLORS["seo_milestone"]},
            {"id": "keyword_research", "name": "Keyword Research", "event_type": "seo_milestone", "description": "Research and analyze target keywords", "default_duration_hours": 3, "suggested_tags": ["seo", "keywords"], "color": EVENT_TYPE_COLORS["seo_milestone"]},
            {"id": "campaign_launch", "name": "Campaign Launch", "event_type": "campaign", "description": "Launch a marketing campaign", "default_duration_hours": 24, "suggested_tags": ["campaign", "launch"], "color": EVENT_TYPE_COLORS["campaign"]},
            {"id": "content_review", "name": "Content Review", "event_type": "other", "description": "Review and update existing content", "default_duration_hours": 2, "suggested_tags": ["content", "review"], "color": EVENT_TYPE_COLORS["other"]}
        ]
        return {"templates": templates}

    return router
