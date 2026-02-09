"""
Smart Notification System
Sends personalized Email and Push notifications to users based on their behavior and interests.
Features:
- User behavior tracking (categories visited, listings viewed/saved, search queries)
- Interest profile building
- Trigger conditions (new listings, price drops, messages)
- Multi-channel delivery (Email via SendGrid, Push via Firebase/Expo)
- Smart throttling, deduplication, quiet hours
- Admin controls and user preferences
"""

import os
import logging
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Literal
from enum import Enum
from pydantic import BaseModel, Field, EmailStr
import hashlib
import json

logger = logging.getLogger(__name__)

# =============================================================================
# SENDGRID EMAIL INTEGRATION
# =============================================================================

SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY", "")
SENDGRID_FROM_EMAIL = os.environ.get("SENDGRID_FROM_EMAIL", "noreply@marketplace.com")
SENDGRID_FROM_NAME = os.environ.get("SENDGRID_FROM_NAME", "Marketplace")

sendgrid_client = None
if SENDGRID_API_KEY:
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail, Email, To, Content, Personalization
        sendgrid_client = SendGridAPIClient(SENDGRID_API_KEY)
        logger.info("SendGrid client initialized")
    except ImportError:
        logger.warning("SendGrid SDK not installed. Run: pip install sendgrid")
    except Exception as e:
        logger.error(f"Failed to initialize SendGrid: {e}")


# =============================================================================
# ENUMS AND TYPES
# =============================================================================

class NotificationChannel(str, Enum):
    EMAIL = "email"
    PUSH = "push"
    IN_APP = "in_app"
    ALL = "all"


class TriggerType(str, Enum):
    NEW_LISTING_IN_CATEGORY = "new_listing_in_category"
    PRICE_DROP_SAVED_ITEM = "price_drop_saved_item"
    MESSAGE_RECEIVED = "message_received"
    LISTING_SOLD = "listing_sold"
    OFFER_RECEIVED = "offer_received"
    OFFER_ACCEPTED = "offer_accepted"
    SELLER_REPLY = "seller_reply"
    SIMILAR_LISTING_ALERT = "similar_listing_alert"
    WEEKLY_DIGEST = "weekly_digest"
    PROMOTIONAL = "promotional"


class BehaviorEventType(str, Enum):
    VIEW_LISTING = "view_listing"
    SAVE_LISTING = "save_listing"
    UNSAVE_LISTING = "unsave_listing"
    VIEW_CATEGORY = "view_category"
    SEARCH_QUERY = "search_query"
    SEND_MESSAGE = "send_message"
    MAKE_OFFER = "make_offer"
    PURCHASE = "purchase"
    POST_LISTING = "post_listing"


class NotificationStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    THROTTLED = "throttled"
    QUIET_HOURS = "quiet_hours"
    USER_OPTED_OUT = "user_opted_out"


# =============================================================================
# MODELS
# =============================================================================

class UserBehaviorEvent(BaseModel):
    """Tracks user behavior for interest profiling"""
    id: str = Field(default_factory=lambda: f"evt_{uuid.uuid4().hex[:12]}")
    user_id: str
    event_type: str  # BehaviorEventType
    entity_id: Optional[str] = None  # listing_id, category_id, etc.
    entity_type: Optional[str] = None  # listing, category, search
    metadata: Dict[str, Any] = {}  # Additional context (price, category, etc.)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class UserInterestProfile(BaseModel):
    """User's interest profile built from behavior"""
    id: str = Field(default_factory=lambda: f"profile_{uuid.uuid4().hex[:12]}")
    user_id: str
    
    # Category interests with scores (0-100)
    category_interests: Dict[str, float] = {}  # category_id -> score
    
    # Price range preferences per category
    price_preferences: Dict[str, Dict[str, float]] = {}  # category_id -> {min, max, avg}
    
    # Location preferences
    preferred_locations: List[str] = []
    
    # Recent searches (for keyword matching)
    recent_searches: List[str] = []
    
    # Saved listing categories for price drop alerts
    saved_categories: List[str] = []
    
    # Brand/attribute preferences
    brand_preferences: Dict[str, List[str]] = {}  # category_id -> [brand1, brand2]
    
    # Engagement metrics
    total_views: int = 0
    total_saves: int = 0
    total_purchases: int = 0
    
    # Profile freshness
    last_activity: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class NotificationTrigger(BaseModel):
    """Defines a notification trigger rule"""
    id: str = Field(default_factory=lambda: f"trigger_{uuid.uuid4().hex[:12]}")
    name: str
    trigger_type: str  # TriggerType
    description: str = ""
    
    # Trigger conditions
    conditions: Dict[str, Any] = {}  # e.g., {"category_id": "electronics", "price_drop_percent": 10}
    
    # Notification content
    title_template: str  # e.g., "New {{category_name}} listing near you!"
    body_template: str   # e.g., "{{listing_title}} - {{price}} {{currency}}"
    
    # Delivery settings
    channels: List[str] = ["push", "in_app"]  # NotificationChannel
    priority: int = 5  # 1=highest, 10=lowest
    
    # Throttling
    min_interval_minutes: int = 60  # Minimum time between same trigger type
    max_per_day: int = 10
    
    # Targeting
    target_all_users: bool = False
    target_user_segments: List[str] = []  # e.g., ["active_buyers", "category_followers"]
    
    # Status
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class UserNotificationConsent(BaseModel):
    """User's notification preferences and consent"""
    id: str = Field(default_factory=lambda: f"consent_{uuid.uuid4().hex[:12]}")
    user_id: str
    
    # Channel preferences
    email_enabled: bool = True
    push_enabled: bool = True
    in_app_enabled: bool = True
    
    # Trigger type preferences (user can opt out of specific types)
    trigger_preferences: Dict[str, bool] = {
        "new_listing_in_category": True,
        "price_drop_saved_item": True,
        "message_received": True,
        "offer_received": True,
        "offer_accepted": True,
        "weekly_digest": True,
        "promotional": False,  # Opt-in for promotional
    }
    
    # Quiet hours
    quiet_hours_enabled: bool = False
    quiet_hours_start: str = "22:00"  # HH:MM
    quiet_hours_end: str = "08:00"
    quiet_hours_timezone: str = "UTC"
    
    # Frequency limits
    max_emails_per_day: int = 5
    max_push_per_day: int = 20
    
    # Digest preferences
    digest_frequency: str = "weekly"  # daily, weekly, never
    digest_day: str = "monday"  # For weekly digest
    
    # Email for notifications (can differ from account email)
    notification_email: Optional[str] = None
    
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SmartNotification(BaseModel):
    """A queued smart notification"""
    id: str = Field(default_factory=lambda: f"sn_{uuid.uuid4().hex[:12]}")
    user_id: str
    trigger_id: str
    trigger_type: str
    
    # Content (rendered from template)
    title: str
    body: str
    
    # Deep link data
    deep_link: Optional[str] = None  # e.g., "/listing/abc123"
    action_url: Optional[str] = None  # Web URL
    image_url: Optional[str] = None
    
    # Delivery
    channels: List[str] = []
    priority: int = 5
    
    # Status tracking per channel
    status: str = NotificationStatus.PENDING
    email_status: Optional[str] = None
    push_status: Optional[str] = None
    in_app_status: Optional[str] = None
    
    # Delivery details
    sent_at: Optional[str] = None
    delivered_at: Optional[str] = None
    opened_at: Optional[str] = None
    clicked_at: Optional[str] = None
    
    # Error tracking
    error_message: Optional[str] = None
    retry_count: int = 0
    
    # Deduplication
    dedup_key: Optional[str] = None  # Hash of trigger+user+entity for dedup
    
    # Metadata
    metadata: Dict[str, Any] = {}
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class NotificationAnalytics(BaseModel):
    """Analytics for notification performance"""
    id: str = Field(default_factory=lambda: f"analytics_{uuid.uuid4().hex[:12]}")
    date: str  # YYYY-MM-DD
    trigger_type: str
    channel: str
    
    # Counts
    sent: int = 0
    delivered: int = 0
    opened: int = 0
    clicked: int = 0
    failed: int = 0
    throttled: int = 0
    
    # Rates
    delivery_rate: float = 0.0
    open_rate: float = 0.0
    click_rate: float = 0.0
    
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class AdminNotificationConfig(BaseModel):
    """Global admin configuration for the notification system"""
    id: str = "smart_notification_config"
    
    # System toggle
    system_enabled: bool = True
    
    # Global throttling
    global_max_per_user_per_day: int = 50
    global_min_interval_minutes: int = 5
    
    # Email settings
    email_enabled: bool = True
    email_from_name: str = "Marketplace"
    email_from_address: str = "noreply@marketplace.com"
    email_reply_to: Optional[str] = None
    
    # Push settings
    push_enabled: bool = True
    push_sound: bool = True
    push_badge: bool = True
    
    # Quiet hours (global default)
    default_quiet_hours_enabled: bool = False
    default_quiet_hours_start: str = "22:00"
    default_quiet_hours_end: str = "08:00"
    
    # Analytics retention
    analytics_retention_days: int = 90
    
    # Batch processing
    batch_size: int = 100
    process_interval_seconds: int = 30
    
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# =============================================================================
# EMAIL TEMPLATES
# =============================================================================

EMAIL_TEMPLATES = {
    "new_listing_in_category": {
        "subject": "New listing in {{category_name}}: {{listing_title}}",
        "html": """
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%); padding: 20px; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">New Listing Alert!</h1>
            </div>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; color: #333;">Hi {{user_name}},</p>
                <p style="font-size: 16px; color: #333;">A new listing just appeared in <strong>{{category_name}}</strong> that matches your interests:</p>
                
                <div style="background: white; border-radius: 10px; padding: 15px; margin: 20px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    {{#if listing_image}}
                    <img src="{{listing_image}}" alt="{{listing_title}}" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px;">
                    {{/if}}
                    <h2 style="color: #2E7D32; margin: 10px 0;">{{listing_title}}</h2>
                    <p style="font-size: 24px; font-weight: bold; color: #1B5E20; margin: 5px 0;">{{currency}}{{price}}</p>
                    <p style="color: #666;">📍 {{location}}</p>
                </div>
                
                <a href="{{action_url}}" style="display: inline-block; background: #2E7D32; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">View Listing</a>
                
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    You're receiving this because you follow {{category_name}} listings.<br>
                    <a href="{{unsubscribe_url}}" style="color: #999;">Manage preferences</a> | <a href="{{unsubscribe_url}}" style="color: #999;">Unsubscribe</a>
                </p>
            </div>
        </body>
        </html>
        """
    },
    "price_drop_saved_item": {
        "subject": "Price Drop! {{listing_title}} is now {{currency}}{{price}}",
        "html": """
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #FF5722 0%, #E64A19 100%); padding: 20px; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">🔥 Price Drop Alert!</h1>
            </div>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; color: #333;">Hi {{user_name}},</p>
                <p style="font-size: 16px; color: #333;">Great news! An item you saved just dropped in price:</p>
                
                <div style="background: white; border-radius: 10px; padding: 15px; margin: 20px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    {{#if listing_image}}
                    <img src="{{listing_image}}" alt="{{listing_title}}" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px;">
                    {{/if}}
                    <h2 style="color: #333; margin: 10px 0;">{{listing_title}}</h2>
                    <p style="color: #999; text-decoration: line-through; margin: 5px 0;">Was: {{currency}}{{old_price}}</p>
                    <p style="font-size: 28px; font-weight: bold; color: #FF5722; margin: 5px 0;">Now: {{currency}}{{price}}</p>
                    <p style="background: #FFEBEE; color: #C62828; padding: 5px 10px; border-radius: 5px; display: inline-block;">
                        Save {{drop_percent}}% ({{currency}}{{savings}})
                    </p>
                </div>
                
                <a href="{{action_url}}" style="display: inline-block; background: #FF5722; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">Grab This Deal</a>
                
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    You're receiving this because you saved this item.<br>
                    <a href="{{unsubscribe_url}}" style="color: #999;">Manage preferences</a>
                </p>
            </div>
        </body>
        </html>
        """
    },
    "message_received": {
        "subject": "New message from {{sender_name}}",
        "html": """
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1976D2 0%, #1565C0 100%); padding: 20px; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">💬 New Message</h1>
            </div>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; color: #333;">Hi {{user_name}},</p>
                <p style="font-size: 16px; color: #333;"><strong>{{sender_name}}</strong> sent you a message about:</p>
                
                <div style="background: white; border-radius: 10px; padding: 15px; margin: 20px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <p style="color: #666; margin: 0 0 10px 0;">{{listing_title}}</p>
                    <div style="background: #E3F2FD; padding: 15px; border-radius: 8px; border-left: 4px solid #1976D2;">
                        <p style="margin: 0; color: #333;">"{{message_preview}}..."</p>
                    </div>
                </div>
                
                <a href="{{action_url}}" style="display: inline-block; background: #1976D2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">Reply Now</a>
                
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    <a href="{{unsubscribe_url}}" style="color: #999;">Manage notification preferences</a>
                </p>
            </div>
        </body>
        </html>
        """
    },
    "weekly_digest": {
        "subject": "Your Weekly Marketplace Digest",
        "html": """
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%); padding: 20px; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">📊 Your Weekly Digest</h1>
            </div>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; color: #333;">Hi {{user_name}},</p>
                <p style="font-size: 16px; color: #333;">Here's what happened this week on Marketplace:</p>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
                    <div style="background: white; padding: 15px; border-radius: 10px; text-align: center;">
                        <p style="font-size: 32px; font-weight: bold; color: #2E7D32; margin: 0;">{{new_listings_count}}</p>
                        <p style="color: #666; margin: 5px 0 0 0;">New listings in your interests</p>
                    </div>
                    <div style="background: white; padding: 15px; border-radius: 10px; text-align: center;">
                        <p style="font-size: 32px; font-weight: bold; color: #FF5722; margin: 0;">{{price_drops_count}}</p>
                        <p style="color: #666; margin: 5px 0 0 0;">Price drops on saved items</p>
                    </div>
                </div>
                
                {{#if top_listings}}
                <h3 style="color: #333;">Top Picks For You</h3>
                {{#each top_listings}}
                <div style="background: white; border-radius: 10px; padding: 15px; margin: 10px 0; display: flex; align-items: center;">
                    <img src="{{this.image}}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; margin-right: 15px;">
                    <div>
                        <p style="font-weight: bold; margin: 0;">{{this.title}}</p>
                        <p style="color: #2E7D32; font-weight: bold; margin: 5px 0;">{{this.price}}</p>
                    </div>
                </div>
                {{/each}}
                {{/if}}
                
                <a href="{{action_url}}" style="display: inline-block; background: #2E7D32; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin-top: 15px;">Browse All Listings</a>
                
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    <a href="{{unsubscribe_url}}" style="color: #999;">Manage digest preferences</a> | <a href="{{unsubscribe_url}}" style="color: #999;">Unsubscribe</a>
                </p>
            </div>
        </body>
        </html>
        """
    }
}


# =============================================================================
# SMART NOTIFICATION SERVICE
# =============================================================================

class SmartNotificationService:
    """
    Main service for smart notifications.
    Handles behavior tracking, interest profiling, and notification delivery.
    """
    
    def __init__(self, db):
        self.db = db
        self.is_running = False
        self._task = None
        self._expo_push_client = None
        
        # Initialize Expo Push
        try:
            from exponent_server_sdk import PushClient
            self._expo_push_client = PushClient()
            logger.info("Expo Push client initialized")
        except ImportError:
            logger.warning("Expo Push SDK not available")
    
    # =========================================================================
    # BEHAVIOR TRACKING
    # =========================================================================
    
    async def track_behavior(
        self,
        user_id: str,
        event_type: str,
        entity_id: Optional[str] = None,
        entity_type: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict:
        """
        Track a user behavior event for interest profiling.
        Called from various endpoints (view listing, search, save, etc.)
        """
        event = UserBehaviorEvent(
            user_id=user_id,
            event_type=event_type,
            entity_id=entity_id,
            entity_type=entity_type,
            metadata=metadata or {}
        )
        
        await self.db.user_behavior_events.insert_one(event.model_dump())
        
        # Update interest profile asynchronously
        asyncio.create_task(self._update_interest_profile(user_id, event))
        
        logger.info(f"Tracked behavior: {event_type} for user {user_id}")
        return {"success": True, "event_id": event.id}
    
    async def _update_interest_profile(self, user_id: str, event: UserBehaviorEvent):
        """Update user's interest profile based on behavior event"""
        try:
            # Get or create profile
            profile = await self.db.user_interest_profiles.find_one({"user_id": user_id})
            if not profile:
                profile = UserInterestProfile(user_id=user_id).model_dump()
            
            now = datetime.now(timezone.utc).isoformat()
            updates = {"updated_at": now, "last_activity": now}
            
            # Update based on event type
            if event.event_type == BehaviorEventType.VIEW_LISTING:
                updates["$inc"] = {"total_views": 1}
                
                # Update category interest
                category_id = event.metadata.get("category_id")
                if category_id:
                    current_score = profile.get("category_interests", {}).get(category_id, 0)
                    new_score = min(100, current_score + 1)  # Increment by 1, max 100
                    updates[f"category_interests.{category_id}"] = new_score
                
                # Update price preferences
                price = event.metadata.get("price")
                if price and category_id:
                    price_prefs = profile.get("price_preferences", {}).get(category_id, {"min": price, "max": price, "avg": price, "count": 0})
                    count = price_prefs.get("count", 0) + 1
                    new_avg = ((price_prefs.get("avg", price) * (count - 1)) + price) / count
                    updates[f"price_preferences.{category_id}"] = {
                        "min": min(price_prefs.get("min", price), price),
                        "max": max(price_prefs.get("max", price), price),
                        "avg": new_avg,
                        "count": count
                    }
            
            elif event.event_type == BehaviorEventType.SAVE_LISTING:
                updates["$inc"] = {"total_saves": 1}
                
                category_id = event.metadata.get("category_id")
                if category_id:
                    # Higher weight for saves
                    current_score = profile.get("category_interests", {}).get(category_id, 0)
                    new_score = min(100, current_score + 5)
                    updates[f"category_interests.{category_id}"] = new_score
                    
                    # Track saved categories for price drop alerts
                    saved_cats = profile.get("saved_categories", [])
                    if category_id not in saved_cats:
                        updates["$addToSet"] = {"saved_categories": category_id}
            
            elif event.event_type == BehaviorEventType.SEARCH_QUERY:
                query = event.metadata.get("query", "")
                if query:
                    # Add to recent searches (keep last 20)
                    recent = profile.get("recent_searches", [])
                    if query not in recent:
                        recent = [query] + recent[:19]
                        updates["recent_searches"] = recent
            
            elif event.event_type == BehaviorEventType.PURCHASE:
                updates["$inc"] = {"total_purchases": 1}
                
                category_id = event.metadata.get("category_id")
                if category_id:
                    # Highest weight for purchases
                    current_score = profile.get("category_interests", {}).get(category_id, 0)
                    new_score = min(100, current_score + 20)
                    updates[f"category_interests.{category_id}"] = new_score
            
            elif event.event_type == BehaviorEventType.VIEW_CATEGORY:
                category_id = event.entity_id
                if category_id:
                    current_score = profile.get("category_interests", {}).get(category_id, 0)
                    new_score = min(100, current_score + 2)
                    updates[f"category_interests.{category_id}"] = new_score
            
            # Upsert profile
            await self.db.user_interest_profiles.update_one(
                {"user_id": user_id},
                {"$set": updates} if "$inc" not in updates else updates,
                upsert=True
            )
            
        except Exception as e:
            logger.error(f"Error updating interest profile: {e}")
    
    async def get_interest_profile(self, user_id: str) -> Optional[Dict]:
        """Get user's interest profile"""
        return await self.db.user_interest_profiles.find_one({"user_id": user_id}, {"_id": 0})
    
    # =========================================================================
    # NOTIFICATION TRIGGERS
    # =========================================================================
    
    async def check_new_listing_triggers(self, listing: Dict):
        """
        Check if a new listing should trigger notifications.
        Called when a new listing is created.
        """
        try:
            category_id = listing.get("category_id")
            if not category_id:
                return
            
            # Find users interested in this category
            interested_users = await self.db.user_interest_profiles.find({
                f"category_interests.{category_id}": {"$gte": 20}  # Minimum interest score
            }, {"user_id": 1}).to_list(1000)
            
            if not interested_users:
                return
            
            user_ids = [u["user_id"] for u in interested_users]
            
            # Exclude the listing owner
            user_ids = [uid for uid in user_ids if uid != listing.get("user_id")]
            
            # Get trigger config
            trigger = await self.db.notification_triggers.find_one({
                "trigger_type": TriggerType.NEW_LISTING_IN_CATEGORY,
                "is_active": True
            })
            
            if not trigger:
                # Use default trigger
                trigger = {
                    "id": "default_new_listing",
                    "trigger_type": TriggerType.NEW_LISTING_IN_CATEGORY,
                    "title_template": "New {{category_name}} listing!",
                    "body_template": "{{listing_title}} - {{currency}}{{price}}",
                    "channels": ["push", "in_app"],
                    "priority": 5,
                    "min_interval_minutes": 60,
                    "max_per_day": 10
                }
            
            # Get category name
            category = await self.db.categories.find_one({"id": category_id})
            category_name = category.get("name", "Items") if category else "Items"
            
            # Queue notifications for each user
            for user_id in user_ids[:100]:  # Limit to 100 users per listing
                await self._queue_notification(
                    user_id=user_id,
                    trigger=trigger,
                    variables={
                        "category_name": category_name,
                        "listing_title": listing.get("title", ""),
                        "price": listing.get("price", 0),
                        "currency": "€",
                        "location": listing.get("location", ""),
                        "listing_image": listing.get("images", [None])[0]
                    },
                    deep_link=f"/listing/{listing.get('id')}",
                    metadata={"listing_id": listing.get("id"), "category_id": category_id}
                )
            
            logger.info(f"Queued new listing notifications for {len(user_ids)} users")
            
        except Exception as e:
            logger.error(f"Error checking new listing triggers: {e}")
    
    async def check_price_drop_triggers(self, listing_id: str, old_price: float, new_price: float):
        """
        Check if a price drop should trigger notifications.
        Called when a listing price is updated.
        """
        try:
            if new_price >= old_price:
                return  # Not a price drop
            
            drop_percent = round(((old_price - new_price) / old_price) * 100, 1)
            if drop_percent < 5:  # Minimum 5% drop
                return
            
            # Get listing details
            listing = await self.db.listings.find_one({"id": listing_id}, {"_id": 0})
            if not listing:
                return
            
            # Find users who saved this listing
            favorites = await self.db.favorites.find({
                "listing_id": listing_id
            }).to_list(1000)
            
            if not favorites:
                return
            
            user_ids = [f["user_id"] for f in favorites]
            
            # Get trigger config
            trigger = await self.db.notification_triggers.find_one({
                "trigger_type": TriggerType.PRICE_DROP_SAVED_ITEM,
                "is_active": True
            })
            
            if not trigger:
                trigger = {
                    "id": "default_price_drop",
                    "trigger_type": TriggerType.PRICE_DROP_SAVED_ITEM,
                    "title_template": "Price Drop! {{listing_title}}",
                    "body_template": "Now {{currency}}{{price}} ({{drop_percent}}% off)",
                    "channels": ["push", "email", "in_app"],
                    "priority": 2,
                    "min_interval_minutes": 0,  # Immediate for price drops
                    "max_per_day": 20
                }
            
            # Queue notifications
            for user_id in user_ids:
                await self._queue_notification(
                    user_id=user_id,
                    trigger=trigger,
                    variables={
                        "listing_title": listing.get("title", ""),
                        "price": new_price,
                        "old_price": old_price,
                        "currency": "€",
                        "drop_percent": drop_percent,
                        "savings": round(old_price - new_price, 2),
                        "listing_image": listing.get("images", [None])[0]
                    },
                    deep_link=f"/listing/{listing_id}",
                    metadata={"listing_id": listing_id, "old_price": old_price, "new_price": new_price}
                )
            
            logger.info(f"Queued price drop notifications for {len(user_ids)} users")
            
        except Exception as e:
            logger.error(f"Error checking price drop triggers: {e}")
    
    async def trigger_message_notification(
        self,
        recipient_id: str,
        sender_id: str,
        conversation_id: str,
        message_content: str,
        listing_id: Optional[str] = None
    ):
        """Trigger notification for new message"""
        try:
            # Get sender info
            sender = await self.db.users.find_one({"user_id": sender_id}, {"_id": 0, "name": 1})
            sender_name = sender.get("name", "Someone") if sender else "Someone"
            
            # Get listing info if available
            listing_title = ""
            if listing_id:
                listing = await self.db.listings.find_one({"id": listing_id}, {"_id": 0, "title": 1})
                listing_title = listing.get("title", "") if listing else ""
            
            trigger = {
                "id": "message_notification",
                "trigger_type": TriggerType.MESSAGE_RECEIVED,
                "title_template": "{{sender_name}}",
                "body_template": "{{message_preview}}",
                "channels": ["push", "in_app"],
                "priority": 1,  # High priority for messages
                "min_interval_minutes": 0,
                "max_per_day": 100
            }
            
            await self._queue_notification(
                user_id=recipient_id,
                trigger=trigger,
                variables={
                    "sender_name": sender_name,
                    "message_preview": message_content[:100],
                    "listing_title": listing_title
                },
                deep_link=f"/chat/{conversation_id}",
                metadata={"conversation_id": conversation_id, "sender_id": sender_id}
            )
            
        except Exception as e:
            logger.error(f"Error triggering message notification: {e}")
    
    # =========================================================================
    # NOTIFICATION QUEUEING
    # =========================================================================
    
    async def _queue_notification(
        self,
        user_id: str,
        trigger: Dict,
        variables: Dict[str, Any],
        deep_link: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Queue a notification for delivery"""
        try:
            # Check user consent
            consent = await self._get_user_consent(user_id)
            if not consent:
                consent = UserNotificationConsent(user_id=user_id).model_dump()
            
            trigger_type = trigger.get("trigger_type", "")
            
            # Check if user opted out of this trigger type
            if not consent.get("trigger_preferences", {}).get(trigger_type, True):
                logger.info(f"User {user_id} opted out of {trigger_type}")
                return
            
            # Check throttling
            if not await self._check_throttle(user_id, trigger):
                logger.info(f"Throttled notification for user {user_id}")
                return
            
            # Check deduplication
            dedup_key = self._generate_dedup_key(user_id, trigger_type, metadata)
            if await self._is_duplicate(dedup_key):
                logger.info(f"Duplicate notification for user {user_id}")
                return
            
            # Get user info for personalization
            user = await self.db.users.find_one({"user_id": user_id}, {"_id": 0, "name": 1, "email": 1})
            variables["user_name"] = user.get("name", "there") if user else "there"
            
            # Render templates
            title = self._render_template(trigger.get("title_template", ""), variables)
            body = self._render_template(trigger.get("body_template", ""), variables)
            
            # Determine channels based on user preferences
            channels = []
            requested_channels = trigger.get("channels", ["push", "in_app"])
            
            if "push" in requested_channels and consent.get("push_enabled", True):
                channels.append("push")
            if "email" in requested_channels and consent.get("email_enabled", True):
                channels.append("email")
            if "in_app" in requested_channels and consent.get("in_app_enabled", True):
                channels.append("in_app")
            
            if not channels:
                logger.info(f"No enabled channels for user {user_id}")
                return
            
            # Build action URL
            base_url = os.environ.get("APP_BASE_URL", "https://marketplace.example.com")
            action_url = f"{base_url}{deep_link}" if deep_link else base_url
            
            # Create notification
            notification = SmartNotification(
                user_id=user_id,
                trigger_id=trigger.get("id", ""),
                trigger_type=trigger_type,
                title=title,
                body=body,
                deep_link=deep_link,
                action_url=action_url,
                image_url=variables.get("listing_image"),
                channels=channels,
                priority=trigger.get("priority", 5),
                dedup_key=dedup_key,
                metadata=metadata or {}
            )
            
            await self.db.smart_notifications.insert_one(notification.model_dump())
            
            logger.info(f"Queued notification {notification.id} for user {user_id}")
            
        except Exception as e:
            logger.error(f"Error queueing notification: {e}")
    
    async def _get_user_consent(self, user_id: str) -> Optional[Dict]:
        """Get user's notification consent preferences"""
        return await self.db.user_notification_consent.find_one({"user_id": user_id}, {"_id": 0})
    
    async def _check_throttle(self, user_id: str, trigger: Dict) -> bool:
        """Check if notification should be throttled"""
        trigger_type = trigger.get("trigger_type", "")
        min_interval = trigger.get("min_interval_minutes", 60)
        max_per_day = trigger.get("max_per_day", 10)
        
        now = datetime.now(timezone.utc)
        
        # Check minimum interval
        if min_interval > 0:
            cutoff = (now - timedelta(minutes=min_interval)).isoformat()
            recent = await self.db.smart_notifications.find_one({
                "user_id": user_id,
                "trigger_type": trigger_type,
                "created_at": {"$gte": cutoff}
            })
            if recent:
                return False
        
        # Check daily limit
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        today_count = await self.db.smart_notifications.count_documents({
            "user_id": user_id,
            "trigger_type": trigger_type,
            "created_at": {"$gte": today_start}
        })
        
        return today_count < max_per_day
    
    def _generate_dedup_key(self, user_id: str, trigger_type: str, metadata: Optional[Dict]) -> str:
        """Generate deduplication key"""
        key_parts = [user_id, trigger_type]
        if metadata:
            # Include entity IDs in dedup key
            if "listing_id" in metadata:
                key_parts.append(metadata["listing_id"])
            if "conversation_id" in metadata:
                key_parts.append(metadata["conversation_id"])
        
        return hashlib.md5(":".join(key_parts).encode()).hexdigest()
    
    async def _is_duplicate(self, dedup_key: str) -> bool:
        """Check if this notification is a duplicate (within last 24 hours)"""
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        existing = await self.db.smart_notifications.find_one({
            "dedup_key": dedup_key,
            "created_at": {"$gte": cutoff}
        })
        return existing is not None
    
    def _render_template(self, template: str, variables: Dict[str, Any]) -> str:
        """Render template with variables"""
        result = template
        for key, value in variables.items():
            result = result.replace(f"{{{{{key}}}}}", str(value) if value is not None else "")
        return result
    
    # =========================================================================
    # NOTIFICATION DELIVERY
    # =========================================================================
    
    async def process_pending_notifications(self, batch_size: int = 50):
        """Process pending notifications"""
        try:
            # Get pending notifications
            pending = await self.db.smart_notifications.find({
                "status": NotificationStatus.PENDING
            }).sort("priority", 1).limit(batch_size).to_list(batch_size)
            
            for notification in pending:
                await self._deliver_notification(notification)
            
            return {"processed": len(pending)}
            
        except Exception as e:
            logger.error(f"Error processing notifications: {e}")
            return {"processed": 0, "error": str(e)}
    
    async def _deliver_notification(self, notification: Dict):
        """Deliver a notification through all channels"""
        user_id = notification["user_id"]
        notification_id = notification["id"]
        
        try:
            # Check quiet hours
            if await self._is_quiet_hours(user_id):
                await self.db.smart_notifications.update_one(
                    {"id": notification_id},
                    {"$set": {"status": NotificationStatus.QUIET_HOURS}}
                )
                return
            
            channels = notification.get("channels", [])
            updates = {"sent_at": datetime.now(timezone.utc).isoformat()}
            
            # Deliver to each channel
            if "push" in channels:
                push_result = await self._send_push_notification(user_id, notification)
                updates["push_status"] = "sent" if push_result else "failed"
            
            if "email" in channels:
                email_result = await self._send_email_notification(user_id, notification)
                updates["email_status"] = "sent" if email_result else "failed"
            
            if "in_app" in channels:
                in_app_result = await self._create_in_app_notification(user_id, notification)
                updates["in_app_status"] = "sent" if in_app_result else "failed"
            
            # Update status
            updates["status"] = NotificationStatus.SENT
            await self.db.smart_notifications.update_one(
                {"id": notification_id},
                {"$set": updates}
            )
            
            # Update analytics
            await self._update_analytics(notification, "sent")
            
        except Exception as e:
            logger.error(f"Error delivering notification {notification_id}: {e}")
            await self.db.smart_notifications.update_one(
                {"id": notification_id},
                {"$set": {
                    "status": NotificationStatus.FAILED,
                    "error_message": str(e),
                    "retry_count": notification.get("retry_count", 0) + 1
                }}
            )
    
    async def _is_quiet_hours(self, user_id: str) -> bool:
        """Check if current time is within user's quiet hours"""
        consent = await self._get_user_consent(user_id)
        if not consent or not consent.get("quiet_hours_enabled", False):
            return False
        
        # Parse quiet hours
        start = consent.get("quiet_hours_start", "22:00")
        end = consent.get("quiet_hours_end", "08:00")
        tz = consent.get("quiet_hours_timezone", "UTC")
        
        # Get current time in user's timezone (simplified - using UTC)
        now = datetime.now(timezone.utc)
        current_time = now.strftime("%H:%M")
        
        # Check if current time is within quiet hours
        if start < end:
            return start <= current_time <= end
        else:  # Spans midnight
            return current_time >= start or current_time <= end
    
    async def _send_push_notification(self, user_id: str, notification: Dict) -> bool:
        """Send push notification via Expo"""
        try:
            if not self._expo_push_client:
                logger.warning("Expo Push client not available")
                return False
            
            # Get user's push token
            user_settings = await self.db.user_settings.find_one({"user_id": user_id})
            push_token = user_settings.get("push_token") if user_settings else None
            
            if not push_token:
                logger.info(f"No push token for user {user_id}")
                return False
            
            from exponent_server_sdk import PushMessage
            
            message = PushMessage(
                to=push_token,
                title=notification.get("title", ""),
                body=notification.get("body", ""),
                data={
                    "deep_link": notification.get("deep_link", ""),
                    "notification_id": notification.get("id", "")
                },
                sound="default",
                badge=1
            )
            
            response = self._expo_push_client.publish(message)
            return response.status == "ok"
            
        except Exception as e:
            logger.error(f"Error sending push notification: {e}")
            return False
    
    async def _send_email_notification(self, user_id: str, notification: Dict) -> bool:
        """Send email notification via SendGrid"""
        try:
            if not sendgrid_client:
                logger.warning("SendGrid client not available")
                return False
            
            # Get user's email
            user = await self.db.users.find_one({"user_id": user_id}, {"_id": 0, "email": 1, "name": 1})
            if not user or not user.get("email"):
                logger.info(f"No email for user {user_id}")
                return False
            
            # Get email template
            trigger_type = notification.get("trigger_type", "")
            template = EMAIL_TEMPLATES.get(trigger_type, EMAIL_TEMPLATES.get("new_listing_in_category"))
            
            # Render email
            variables = notification.get("metadata", {})
            variables.update({
                "user_name": user.get("name", "there"),
                "listing_title": notification.get("title", ""),
                "price": variables.get("price", ""),
                "currency": "€",
                "action_url": notification.get("action_url", ""),
                "unsubscribe_url": f"{os.environ.get('APP_BASE_URL', '')}/settings/notifications"
            })
            
            subject = self._render_template(template["subject"], variables)
            html_content = self._render_template(template["html"], variables)
            
            from sendgrid.helpers.mail import Mail
            
            message = Mail(
                from_email=(SENDGRID_FROM_EMAIL, SENDGRID_FROM_NAME),
                to_emails=user["email"],
                subject=subject,
                html_content=html_content
            )
            
            response = sendgrid_client.send(message)
            return response.status_code in [200, 202]
            
        except Exception as e:
            logger.error(f"Error sending email notification: {e}")
            return False
    
    async def _create_in_app_notification(self, user_id: str, notification: Dict) -> bool:
        """Create in-app notification"""
        try:
            in_app = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "type": notification.get("trigger_type", "general"),
                "title": notification.get("title", ""),
                "body": notification.get("body", ""),
                "data_payload": {
                    "deep_link": notification.get("deep_link", ""),
                    "smart_notification_id": notification.get("id", "")
                },
                "read": False,
                "pushed": True,
                "created_at": datetime.now(timezone.utc)
            }
            
            await self.db.notifications.insert_one(in_app)
            return True
            
        except Exception as e:
            logger.error(f"Error creating in-app notification: {e}")
            return False
    
    async def _update_analytics(self, notification: Dict, event: str):
        """Update notification analytics"""
        try:
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            trigger_type = notification.get("trigger_type", "unknown")
            
            for channel in notification.get("channels", []):
                await self.db.notification_analytics.update_one(
                    {"date": today, "trigger_type": trigger_type, "channel": channel},
                    {"$inc": {event: 1}},
                    upsert=True
                )
                
        except Exception as e:
            logger.error(f"Error updating analytics: {e}")
    
    # =========================================================================
    # BACKGROUND PROCESSOR
    # =========================================================================
    
    async def start_background_processor(self, interval: int = 30):
        """Start background processor for notifications"""
        if self.is_running:
            logger.warning("Background processor already running")
            return
        
        self.is_running = True
        logger.info("Starting smart notification background processor")
        
        while self.is_running:
            try:
                result = await self.process_pending_notifications()
                if result.get("processed", 0) > 0:
                    logger.info(f"Processed {result['processed']} notifications")
            except Exception as e:
                logger.error(f"Error in background processor: {e}")
            
            await asyncio.sleep(interval)
    
    def start(self, interval: int = 30):
        """Start the background processor as a task"""
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self.start_background_processor(interval))
            logger.info("Smart notification processor task started")
    
    def stop(self):
        """Stop the background processor"""
        self.is_running = False
        if self._task:
            self._task.cancel()
            logger.info("Smart notification processor stopped")
    
    # =========================================================================
    # ADMIN METHODS
    # =========================================================================
    
    async def get_admin_config(self) -> Dict:
        """Get admin configuration"""
        config = await self.db.smart_notification_config.find_one({"id": "smart_notification_config"})
        if not config:
            config = AdminNotificationConfig().model_dump()
            await self.db.smart_notification_config.insert_one(config)
        return {k: v for k, v in config.items() if k != "_id"}
    
    async def update_admin_config(self, updates: Dict) -> Dict:
        """Update admin configuration"""
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await self.db.smart_notification_config.update_one(
            {"id": "smart_notification_config"},
            {"$set": updates},
            upsert=True
        )
        return await self.get_admin_config()
    
    async def get_triggers(self) -> List[Dict]:
        """Get all notification triggers"""
        return await self.db.notification_triggers.find({}, {"_id": 0}).to_list(100)
    
    async def create_trigger(self, trigger_data: Dict) -> Dict:
        """Create a new notification trigger"""
        trigger = NotificationTrigger(**trigger_data)
        await self.db.notification_triggers.insert_one(trigger.model_dump())
        return trigger.model_dump()
    
    async def update_trigger(self, trigger_id: str, updates: Dict) -> Optional[Dict]:
        """Update a notification trigger"""
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await self.db.notification_triggers.update_one(
            {"id": trigger_id},
            {"$set": updates}
        )
        return await self.db.notification_triggers.find_one({"id": trigger_id}, {"_id": 0})
    
    async def delete_trigger(self, trigger_id: str) -> bool:
        """Delete a notification trigger"""
        result = await self.db.notification_triggers.delete_one({"id": trigger_id})
        return result.deleted_count > 0
    
    async def get_analytics(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        trigger_type: Optional[str] = None
    ) -> Dict:
        """Get notification analytics"""
        query = {}
        
        if start_date:
            query["date"] = {"$gte": start_date}
        if end_date:
            if "date" in query:
                query["date"]["$lte"] = end_date
            else:
                query["date"] = {"$lte": end_date}
        if trigger_type:
            query["trigger_type"] = trigger_type
        
        analytics = await self.db.notification_analytics.find(query, {"_id": 0}).to_list(1000)
        
        # Aggregate totals
        totals = {
            "sent": sum(a.get("sent", 0) for a in analytics),
            "delivered": sum(a.get("delivered", 0) for a in analytics),
            "opened": sum(a.get("opened", 0) for a in analytics),
            "clicked": sum(a.get("clicked", 0) for a in analytics),
            "failed": sum(a.get("failed", 0) for a in analytics)
        }
        
        if totals["sent"] > 0:
            totals["delivery_rate"] = round((totals["delivered"] / totals["sent"]) * 100, 1)
            totals["open_rate"] = round((totals["opened"] / totals["sent"]) * 100, 1)
            totals["click_rate"] = round((totals["clicked"] / totals["sent"]) * 100, 1)
        
        return {
            "totals": totals,
            "daily": analytics
        }


# =============================================================================
# ROUTER FACTORY
# =============================================================================

def create_smart_notification_router(db, get_current_user, require_auth):
    """Create smart notification router"""
    from fastapi import APIRouter, HTTPException, Query, Body, Request
    
    router = APIRouter(prefix="/smart-notifications", tags=["Smart Notifications"])
    
    service = SmartNotificationService(db)
    
    # =========================================================================
    # USER BEHAVIOR TRACKING
    # =========================================================================
    
    @router.post("/track")
    async def track_behavior(
        request: Request,
        event_type: str = Body(...),
        entity_id: Optional[str] = Body(None),
        entity_type: Optional[str] = Body(None),
        metadata: Optional[Dict[str, Any]] = Body(None)
    ):
        """Track user behavior event"""
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        return await service.track_behavior(
            user_id=user.user_id,
            event_type=event_type,
            entity_id=entity_id,
            entity_type=entity_type,
            metadata=metadata
        )
    
    @router.get("/profile")
    async def get_interest_profile(request: Request):
        """Get current user's interest profile"""
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        profile = await service.get_interest_profile(user.user_id)
        if not profile:
            return {"user_id": user.user_id, "message": "No profile yet"}
        return profile
    
    # =========================================================================
    # USER CONSENT/PREFERENCES
    # =========================================================================
    
    @router.get("/consent")
    async def get_notification_consent(request: Request):
        """Get user's notification consent settings"""
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        consent = await service._get_user_consent(user.user_id)
        if not consent:
            consent = UserNotificationConsent(user_id=user.user_id).model_dump()
        return consent
    
    @router.put("/consent")
    async def update_notification_consent(
        request: Request,
        consent_updates: Dict[str, Any] = Body(...)
    ):
        """Update user's notification consent settings"""
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        consent_updates["user_id"] = user.user_id
        consent_updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.user_notification_consent.update_one(
            {"user_id": user.user_id},
            {"$set": consent_updates},
            upsert=True
        )
        
        return await service._get_user_consent(user.user_id)
    
    # =========================================================================
    # NOTIFICATION HISTORY
    # =========================================================================
    
    @router.get("/history")
    async def get_notification_history(
        request: Request,
        page: int = Query(1),
        limit: int = Query(20),
        trigger_type: Optional[str] = Query(None)
    ):
        """Get user's notification history"""
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        query = {"user_id": user.user_id}
        if trigger_type:
            query["trigger_type"] = trigger_type
        
        skip = (page - 1) * limit
        notifications = await db.smart_notifications.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        total = await db.smart_notifications.count_documents(query)
        
        return {
            "notifications": notifications,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit if total > 0 else 1
        }
    
    # =========================================================================
    # ADMIN ENDPOINTS
    # =========================================================================
    
    @router.get("/admin/config")
    async def get_admin_config():
        """Get admin notification configuration"""
        return await service.get_admin_config()
    
    @router.put("/admin/config")
    async def update_admin_config(updates: Dict[str, Any] = Body(...)):
        """Update admin notification configuration"""
        return await service.update_admin_config(updates)
    
    @router.get("/admin/triggers")
    async def get_triggers():
        """Get all notification triggers"""
        return await service.get_triggers()
    
    @router.post("/admin/triggers")
    async def create_trigger(trigger_data: Dict[str, Any] = Body(...)):
        """Create a new notification trigger"""
        return await service.create_trigger(trigger_data)
    
    @router.put("/admin/triggers/{trigger_id}")
    async def update_trigger(trigger_id: str, updates: Dict[str, Any] = Body(...)):
        """Update a notification trigger"""
        result = await service.update_trigger(trigger_id, updates)
        if not result:
            raise HTTPException(status_code=404, detail="Trigger not found")
        return result
    
    @router.delete("/admin/triggers/{trigger_id}")
    async def delete_trigger(trigger_id: str):
        """Delete a notification trigger"""
        success = await service.delete_trigger(trigger_id)
        if not success:
            raise HTTPException(status_code=404, detail="Trigger not found")
        return {"success": True}
    
    @router.get("/admin/analytics")
    async def get_analytics(
        start_date: Optional[str] = Query(None),
        end_date: Optional[str] = Query(None),
        trigger_type: Optional[str] = Query(None)
    ):
        """Get notification analytics"""
        return await service.get_analytics(start_date, end_date, trigger_type)
    
    @router.post("/admin/process")
    async def process_notifications():
        """Manually trigger notification processing"""
        return await service.process_pending_notifications()
    
    return router, service
