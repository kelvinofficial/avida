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
- Phase 4: FCM integration, user segmentation, campaign scheduling, analytics
- Phase 5: Multi-language templates (i18n), campaign automation, visual segment builder
- Phase 6: AI-powered notification content personalization
"""

import os
import logging
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Literal
from enum import Enum
from pydantic import BaseModel, Field
import hashlib
import json
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# =============================================================================
# AI PERSONALIZATION - PHASE 6
# =============================================================================

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
AI_PERSONALIZATION_ENABLED = False
llm_chat_class = None

if EMERGENT_LLM_KEY:
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        llm_chat_class = LlmChat
        AI_PERSONALIZATION_ENABLED = True
        logger.info("AI Personalization enabled with Emergent LLM")
    except ImportError:
        logger.warning("emergentintegrations not installed. Run: pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/")
    except Exception as e:
        logger.error(f"Failed to initialize AI Personalization: {e}")
else:
    logger.info("AI Personalization disabled - no EMERGENT_LLM_KEY configured")


class PersonalizationStyle(str, Enum):
    """Notification personalization styles"""
    FRIENDLY = "friendly"
    PROFESSIONAL = "professional"
    URGENT = "urgent"
    CASUAL = "casual"
    ENTHUSIASTIC = "enthusiastic"
    CONCISE = "concise"


class PersonalizationConfig(BaseModel):
    """Configuration for AI personalization"""
    id: str = "ai_personalization_config"
    
    # Enable/disable
    enabled: bool = True
    
    # Model settings
    model_provider: str = "openai"
    model_name: str = "gpt-4o"  # Using gpt-4o for speed
    
    # Personalization settings
    default_style: str = PersonalizationStyle.FRIENDLY
    max_title_length: int = 60
    max_body_length: int = 150
    
    # User context settings
    include_interests: bool = True
    include_recent_activity: bool = True
    include_purchase_history: bool = True
    include_search_history: bool = True
    
    # Rate limiting
    max_requests_per_minute: int = 60
    cache_duration_hours: int = 24  # Cache personalized content
    
    # Fallback
    fallback_on_error: bool = True  # Use template if AI fails
    
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# System prompt for notification personalization
AI_PERSONALIZATION_SYSTEM_PROMPT = """You are an expert notification copywriter for a marketplace app. Your job is to create personalized, engaging notification text that drives user engagement.

Guidelines:
1. Be concise and impactful - every word matters
2. Create urgency when appropriate (limited time, price drops)
3. Use the user's name when provided
4. Reference their specific interests and behavior
5. Match the requested tone/style
6. Include relevant emojis sparingly (1-2 max)
7. Make the value proposition clear immediately
8. Use action-oriented language

Output Format (JSON):
{
  "title": "Short, catchy notification title (max 60 chars)",
  "body": "Compelling notification body (max 150 chars)",
  "cta_text": "Call-to-action button text (optional, max 20 chars)"
}

Only output valid JSON, no explanations."""


class AIPersonalizationService:
    """Service for AI-powered notification personalization"""
    
    def __init__(self, db):
        self.db = db
        self._request_count = 0
        self._last_reset = datetime.now(timezone.utc)
        self._cache = {}  # Simple in-memory cache
    
    async def get_config(self) -> Dict:
        """Get personalization configuration"""
        config = await self.db.ai_personalization_config.find_one({"id": "ai_personalization_config"})
        if not config:
            config = PersonalizationConfig().model_dump()
            await self.db.ai_personalization_config.insert_one(config)
        return {k: v for k, v in config.items() if k != "_id"}
    
    async def update_config(self, updates: Dict) -> Dict:
        """Update personalization configuration"""
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await self.db.ai_personalization_config.update_one(
            {"id": "ai_personalization_config"},
            {"$set": updates},
            upsert=True
        )
        return await self.get_config()
    
    async def personalize_notification(
        self,
        user_id: str,
        trigger_type: str,
        base_content: Dict[str, str],  # title, body from template
        context: Dict[str, Any],  # listing details, price, etc.
        style: Optional[str] = None,
        language: str = "en"
    ) -> Dict[str, str]:
        """
        Generate personalized notification content for a user.
        
        Args:
            user_id: Target user ID
            trigger_type: Type of notification trigger
            base_content: Base title and body from template
            context: Additional context (listing, price, etc.)
            style: Personalization style (friendly, urgent, etc.)
            language: Target language
        
        Returns:
            Dict with personalized title, body, and optional cta_text
        """
        config = await self.get_config()
        
        # Check if AI is enabled and available
        if not config.get("enabled", True) or not AI_PERSONALIZATION_ENABLED:
            logger.info("AI personalization disabled, using base content")
            return base_content
        
        # Check rate limit
        if not self._check_rate_limit(config.get("max_requests_per_minute", 60)):
            logger.warning("AI personalization rate limited, using base content")
            return base_content
        
        # Check cache
        cache_key = self._generate_cache_key(user_id, trigger_type, context)
        if cache_key in self._cache:
            cached = self._cache[cache_key]
            cache_age = datetime.now(timezone.utc) - datetime.fromisoformat(cached["timestamp"])
            if cache_age.total_seconds() < config.get("cache_duration_hours", 24) * 3600:
                logger.info(f"Using cached personalization for user {user_id}")
                return cached["content"]
        
        try:
            # Get user profile for personalization
            user_profile = await self._get_user_profile(user_id)
            
            # Build the prompt
            prompt = self._build_personalization_prompt(
                user_profile=user_profile,
                trigger_type=trigger_type,
                base_content=base_content,
                context=context,
                style=style or config.get("default_style", "friendly"),
                language=language,
                config=config
            )
            
            # Call LLM
            personalized = await self._call_llm(prompt, config)
            
            # Validate and clean response
            result = self._validate_response(personalized, base_content, config)
            
            # Cache the result
            self._cache[cache_key] = {
                "content": result,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            # Log for analytics
            await self._log_personalization(user_id, trigger_type, result)
            
            return result
            
        except Exception as e:
            logger.error(f"AI personalization error: {e}")
            if config.get("fallback_on_error", True):
                return base_content
            raise
    
    def _check_rate_limit(self, max_per_minute: int) -> bool:
        """Check if we're within rate limits"""
        now = datetime.now(timezone.utc)
        if (now - self._last_reset).total_seconds() >= 60:
            self._request_count = 0
            self._last_reset = now
        
        if self._request_count >= max_per_minute:
            return False
        
        self._request_count += 1
        return True
    
    def _generate_cache_key(self, user_id: str, trigger_type: str, context: Dict) -> str:
        """Generate cache key for personalization"""
        key_data = f"{user_id}:{trigger_type}:{json.dumps(context, sort_keys=True)}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    async def _get_user_profile(self, user_id: str) -> Dict:
        """Get user profile data for personalization"""
        profile = {
            "user_id": user_id,
            "name": None,
            "interests": [],
            "recent_searches": [],
            "recent_views": [],
            "purchase_history": [],
            "preferred_categories": [],
            "price_range": None,
            "engagement_level": "medium"
        }
        
        # Get user info
        user = await self.db.users.find_one({"user_id": user_id}, {"_id": 0, "name": 1, "email": 1})
        if user:
            profile["name"] = user.get("name", "").split()[0] if user.get("name") else None
        
        # Get interest profile
        interest_profile = await self.db.user_interest_profiles.find_one({"user_id": user_id}, {"_id": 0})
        if interest_profile:
            # Top categories
            categories = interest_profile.get("category_interests", {})
            sorted_cats = sorted(categories.items(), key=lambda x: x[1], reverse=True)[:5]
            profile["preferred_categories"] = [c[0] for c in sorted_cats]
            
            # Recent searches
            profile["recent_searches"] = interest_profile.get("recent_searches", [])[:5]
            
            # Engagement level
            total_engagement = (
                interest_profile.get("total_views", 0) +
                interest_profile.get("total_saves", 0) * 3 +
                interest_profile.get("total_purchases", 0) * 10
            )
            if total_engagement > 100:
                profile["engagement_level"] = "high"
            elif total_engagement < 20:
                profile["engagement_level"] = "low"
            
            # Price preferences
            price_prefs = interest_profile.get("price_preferences", {})
            if price_prefs:
                all_avgs = [p.get("avg", 0) for p in price_prefs.values() if p.get("avg")]
                if all_avgs:
                    avg_price = sum(all_avgs) / len(all_avgs)
                    if avg_price < 50:
                        profile["price_range"] = "budget"
                    elif avg_price < 200:
                        profile["price_range"] = "mid-range"
                    else:
                        profile["price_range"] = "premium"
        
        # Get recent behavior
        recent_events = await self.db.user_behavior_events.find(
            {"user_id": user_id}
        ).sort("created_at", -1).limit(10).to_list(10)
        
        for event in recent_events:
            if event.get("event_type") == "view_listing":
                profile["recent_views"].append(event.get("metadata", {}).get("title", ""))
        
        return profile
    
    def _build_personalization_prompt(
        self,
        user_profile: Dict,
        trigger_type: str,
        base_content: Dict[str, str],
        context: Dict[str, Any],
        style: str,
        language: str,
        config: Dict
    ) -> str:
        """Build the prompt for LLM personalization"""
        
        # Map trigger types to descriptions
        trigger_descriptions = {
            "new_listing_in_category": "New listing alert in a category they follow",
            "price_drop_saved_item": "Price drop on an item they saved/favorited",
            "message_received": "New message from another user",
            "seller_reply": "A seller replied to their inquiry",
            "similar_listing_alert": "A listing similar to their interests appeared",
            "weekly_digest": "Weekly summary of marketplace activity",
            "promotional": "Promotional campaign notification",
            "offer_received": "Someone made an offer on their listing",
            "offer_accepted": "Their offer was accepted"
        }
        
        prompt = f"""Create a personalized notification for this user:

## User Profile:
- Name: {user_profile.get('name') or 'User'}
- Engagement Level: {user_profile.get('engagement_level', 'medium')}
- Price Preference: {user_profile.get('price_range') or 'varies'}
- Top Interests: {', '.join(user_profile.get('preferred_categories', [])[:3]) or 'general'}
- Recent Searches: {', '.join(user_profile.get('recent_searches', [])[:3]) or 'none'}

## Notification Context:
- Trigger: {trigger_descriptions.get(trigger_type, trigger_type)}
- Base Title: {base_content.get('title', '')}
- Base Body: {base_content.get('body', '')}

## Additional Details:
{json.dumps(context, indent=2)}

## Requirements:
- Style: {style}
- Language: {SUPPORTED_LANGUAGES.get(language, {}).get('name', 'English')}
- Max Title Length: {config.get('max_title_length', 60)} characters
- Max Body Length: {config.get('max_body_length', 150)} characters

Generate personalized notification content that will maximize engagement for this specific user."""

        return prompt
    
    async def _call_llm(self, prompt: str, config: Dict) -> Dict:
        """Call the LLM to generate personalized content"""
        if not llm_chat_class:
            raise ValueError("LLM not available")
        
        chat = llm_chat_class(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"personalization_{uuid.uuid4().hex[:8]}",
            system_message=AI_PERSONALIZATION_SYSTEM_PROMPT
        ).with_model(
            config.get("model_provider", "openai"),
            config.get("model_name", "gpt-4o")
        )
        
        from emergentintegrations.llm.chat import UserMessage
        user_message = UserMessage(text=prompt)
        
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        try:
            # Clean up response if it has markdown code blocks
            clean_response = response.strip()
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            clean_response = clean_response.strip()
            
            return json.loads(clean_response)
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse LLM response as JSON: {response[:100]}")
            # Try to extract title and body manually
            return {"title": response[:60], "body": response[:150]}
    
    def _validate_response(self, response: Dict, fallback: Dict, config: Dict) -> Dict:
        """Validate and clean the LLM response"""
        result = {}
        
        # Validate title
        title = response.get("title", "")
        max_title = config.get("max_title_length", 60)
        if title and len(title) <= max_title:
            result["title"] = title
        else:
            result["title"] = fallback.get("title", "")[:max_title]
        
        # Validate body
        body = response.get("body", "")
        max_body = config.get("max_body_length", 150)
        if body and len(body) <= max_body:
            result["body"] = body
        else:
            result["body"] = fallback.get("body", "")[:max_body]
        
        # Optional CTA
        if response.get("cta_text"):
            result["cta_text"] = response["cta_text"][:20]
        
        return result
    
    async def _log_personalization(self, user_id: str, trigger_type: str, result: Dict):
        """Log personalization for analytics"""
        try:
            await self.db.personalization_logs.insert_one({
                "id": f"plog_{uuid.uuid4().hex[:12]}",
                "user_id": user_id,
                "trigger_type": trigger_type,
                "personalized_content": result,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        except Exception as e:
            logger.debug(f"Failed to log personalization: {e}")
    
    async def generate_variants(
        self,
        trigger_type: str,
        context: Dict[str, Any],
        styles: List[str] = None,
        count: int = 3
    ) -> List[Dict]:
        """Generate multiple notification variants for A/B testing"""
        config = await self.get_config()
        
        if not AI_PERSONALIZATION_ENABLED:
            return []
        
        styles = styles or [
            PersonalizationStyle.FRIENDLY,
            PersonalizationStyle.URGENT,
            PersonalizationStyle.ENTHUSIASTIC
        ]
        
        variants = []
        base_content = {"title": "", "body": ""}
        
        # Generate a variant for each style
        for i, style in enumerate(styles[:count]):
            try:
                prompt = self._build_variant_prompt(trigger_type, context, style, config)
                variant = await self._call_llm(prompt, config)
                variant["style"] = style
                variant["variant_id"] = f"v{i+1}"
                variants.append(variant)
            except Exception as e:
                logger.error(f"Error generating variant {style}: {e}")
        
        return variants
    
    def _build_variant_prompt(
        self,
        trigger_type: str,
        context: Dict[str, Any],
        style: str,
        config: Dict
    ) -> str:
        """Build prompt for generating a notification variant"""
        return f"""Create a {style} notification variant for:

Trigger Type: {trigger_type}
Context: {json.dumps(context, indent=2)}

Requirements:
- Style: {style}
- Max Title: {config.get('max_title_length', 60)} chars
- Max Body: {config.get('max_body_length', 150)} chars

Generate engaging notification content in this style."""
    
    async def get_analytics(self, days: int = 30) -> Dict:
        """Get personalization analytics"""
        start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        
        # Count total personalizations
        total = await self.db.personalization_logs.count_documents({
            "created_at": {"$gte": start_date}
        })
        
        # Group by trigger type
        pipeline = [
            {"$match": {"created_at": {"$gte": start_date}}},
            {"$group": {"_id": "$trigger_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        by_trigger = await self.db.personalization_logs.aggregate(pipeline).to_list(20)
        
        return {
            "total_personalizations": total,
            "by_trigger_type": [{"trigger_type": r["_id"], "count": r["count"]} for r in by_trigger],
            "ai_enabled": AI_PERSONALIZATION_ENABLED,
            "period_days": days
        }


# =============================================================================
# SUPPORTED LANGUAGES - PHASE 5
# =============================================================================

SUPPORTED_LANGUAGES = {
    "en": {"name": "English", "native": "English", "flag": "🇬🇧"},
    "es": {"name": "Spanish", "native": "Español", "flag": "🇪🇸"},
    "fr": {"name": "French", "native": "Français", "flag": "🇫🇷"},
    "de": {"name": "German", "native": "Deutsch", "flag": "🇩🇪"},
    "it": {"name": "Italian", "native": "Italiano", "flag": "🇮🇹"},
    "pt": {"name": "Portuguese", "native": "Português", "flag": "🇵🇹"},
    "nl": {"name": "Dutch", "native": "Nederlands", "flag": "🇳🇱"},
    "pl": {"name": "Polish", "native": "Polski", "flag": "🇵🇱"},
    "ru": {"name": "Russian", "native": "Русский", "flag": "🇷🇺"},
    "zh": {"name": "Chinese", "native": "中文", "flag": "🇨🇳"},
    "ja": {"name": "Japanese", "native": "日本語", "flag": "🇯🇵"},
    "ko": {"name": "Korean", "native": "한국어", "flag": "🇰🇷"},
    "ar": {"name": "Arabic", "native": "العربية", "flag": "🇸🇦"},
    "hi": {"name": "Hindi", "native": "हिन्दी", "flag": "🇮🇳"},
    "tr": {"name": "Turkish", "native": "Türkçe", "flag": "🇹🇷"},
}

DEFAULT_LANGUAGE = "en"

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
# FIREBASE CLOUD MESSAGING (FCM) INTEGRATION - PHASE 4
# =============================================================================

FCM_ENABLED = False
fcm_messaging = None

# Check for Firebase credentials
FIREBASE_CREDENTIALS_PATH = os.environ.get("FIREBASE_CREDENTIALS_PATH", "")
FIREBASE_CREDENTIALS_JSON = os.environ.get("FIREBASE_CREDENTIALS_JSON", "")

if FIREBASE_CREDENTIALS_PATH or FIREBASE_CREDENTIALS_JSON:
    try:
        import firebase_admin
        from firebase_admin import credentials, messaging
        
        # Initialize Firebase Admin SDK
        if not firebase_admin._apps:
            if FIREBASE_CREDENTIALS_JSON:
                # Use JSON string from environment
                cred_dict = json.loads(FIREBASE_CREDENTIALS_JSON)
                cred = credentials.Certificate(cred_dict)
            elif FIREBASE_CREDENTIALS_PATH and os.path.exists(FIREBASE_CREDENTIALS_PATH):
                # Use file path
                cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
            else:
                raise ValueError("No valid Firebase credentials found")
            
            firebase_admin.initialize_app(cred)
            fcm_messaging = messaging
            FCM_ENABLED = True
            logger.info("Firebase Admin SDK initialized for FCM")
    except ImportError:
        logger.warning("Firebase Admin SDK not installed. Run: pip install firebase-admin")
    except json.JSONDecodeError as e:
        logger.error(f"Invalid Firebase credentials JSON: {e}")
    except Exception as e:
        logger.error(f"Failed to initialize Firebase Admin SDK: {e}")
else:
    logger.info("Firebase credentials not configured - using Expo Push instead")


# =============================================================================
# USER SEGMENTATION RULES - PHASE 4
# =============================================================================

class SegmentOperator(str, Enum):
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    CONTAINS = "contains"
    IN_LIST = "in_list"
    BETWEEN = "between"
    EXISTS = "exists"
    NOT_EXISTS = "not_exists"


class SegmentRule(BaseModel):
    """A single segmentation rule"""
    field: str  # e.g., "total_purchases", "category_interests.electronics", "last_activity"
    operator: str  # SegmentOperator
    value: Any  # The value to compare against
    
    def to_mongo_query(self) -> Dict:
        """Convert rule to MongoDB query"""
        if self.operator == SegmentOperator.EQUALS:
            return {self.field: self.value}
        elif self.operator == SegmentOperator.NOT_EQUALS:
            return {self.field: {"$ne": self.value}}
        elif self.operator == SegmentOperator.GREATER_THAN:
            return {self.field: {"$gt": self.value}}
        elif self.operator == SegmentOperator.LESS_THAN:
            return {self.field: {"$lt": self.value}}
        elif self.operator == SegmentOperator.CONTAINS:
            return {self.field: {"$regex": self.value, "$options": "i"}}
        elif self.operator == SegmentOperator.IN_LIST:
            return {self.field: {"$in": self.value if isinstance(self.value, list) else [self.value]}}
        elif self.operator == SegmentOperator.BETWEEN:
            if isinstance(self.value, list) and len(self.value) == 2:
                return {self.field: {"$gte": self.value[0], "$lte": self.value[1]}}
            return {}
        elif self.operator == SegmentOperator.EXISTS:
            return {self.field: {"$exists": True}}
        elif self.operator == SegmentOperator.NOT_EXISTS:
            return {self.field: {"$exists": False}}
        return {}


class UserSegment(BaseModel):
    """User segment definition for targeting"""
    id: str = Field(default_factory=lambda: f"seg_{uuid.uuid4().hex[:12]}")
    name: str
    description: str = ""
    
    # Rules with AND/OR logic
    rules: List[SegmentRule] = []
    logic: str = "AND"  # AND or OR
    
    # Cached count
    estimated_users: int = 0
    last_calculated: Optional[str] = None
    
    # Status
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
    def to_mongo_query(self) -> Dict:
        """Convert segment rules to MongoDB query"""
        if not self.rules:
            return {}
        
        rule_queries = [rule.to_mongo_query() for rule in self.rules if rule.to_mongo_query()]
        
        if not rule_queries:
            return {}
        
        if self.logic == "OR":
            return {"$or": rule_queries}
        else:  # AND
            return {"$and": rule_queries}


# Predefined segments
PREDEFINED_SEGMENTS = {
    "all_users": {
        "name": "All Users",
        "description": "All registered users",
        "rules": [],
        "logic": "AND"
    },
    "active_buyers": {
        "name": "Active Buyers",
        "description": "Users who have made at least one purchase",
        "rules": [{"field": "total_purchases", "operator": "greater_than", "value": 0}],
        "logic": "AND"
    },
    "active_sellers": {
        "name": "Active Sellers", 
        "description": "Users who have at least one listing",
        "rules": [{"field": "listings_count", "operator": "greater_than", "value": 0}],
        "logic": "AND"
    },
    "inactive_users": {
        "name": "Inactive Users",
        "description": "Users who haven't been active in 30+ days",
        "rules": [{"field": "last_activity", "operator": "less_than", "value": (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()}],
        "logic": "AND"
    },
    "high_value_users": {
        "name": "High Value Users",
        "description": "Users with 5+ purchases",
        "rules": [{"field": "total_purchases", "operator": "greater_than", "value": 4}],
        "logic": "AND"
    },
    "new_users": {
        "name": "New Users",
        "description": "Users who registered in the last 7 days",
        "rules": [{"field": "created_at", "operator": "greater_than", "value": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()}],
        "logic": "AND"
    },
    "engaged_browsers": {
        "name": "Engaged Browsers",
        "description": "Users who have viewed 10+ listings but haven't purchased",
        "rules": [
            {"field": "total_views", "operator": "greater_than", "value": 9},
            {"field": "total_purchases", "operator": "equals", "value": 0}
        ],
        "logic": "AND"
    }
}


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
    NOTIFICATION_OPENED = "notification_opened"
    NOTIFICATION_CLICKED = "notification_clicked"
    NOTIFICATION_CONVERTED = "notification_converted"


class NotificationStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    THROTTLED = "throttled"
    QUIET_HOURS = "quiet_hours"
    USER_OPTED_OUT = "user_opted_out"


class ABTestVariant(str, Enum):
    CONTROL = "control"
    VARIANT_A = "variant_a"
    VARIANT_B = "variant_b"


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
    
    # Deep link data - Enhanced for Phase 2
    deep_link: Optional[str] = None  # e.g., "/listing/abc123"
    deep_link_params: Dict[str, Any] = {}  # Additional params for deep link
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
    
    # Conversion tracking - Phase 2
    converted_at: Optional[str] = None
    conversion_type: Optional[str] = None  # purchase, message, save, etc.
    conversion_value: Optional[float] = None  # monetary value if applicable
    
    # A/B Testing - Phase 2
    ab_test_id: Optional[str] = None
    ab_variant: Optional[str] = None  # control, variant_a, variant_b
    
    # Error tracking
    error_message: Optional[str] = None
    retry_count: int = 0
    
    # Deduplication
    dedup_key: Optional[str] = None  # Hash of trigger+user+entity for dedup
    
    # Metadata
    metadata: Dict[str, Any] = {}
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class NotificationConversion(BaseModel):
    """Tracks conversions from notifications - Phase 2"""
    id: str = Field(default_factory=lambda: f"conv_{uuid.uuid4().hex[:12]}")
    notification_id: str
    user_id: str
    
    # Conversion details
    conversion_type: str  # purchase, message_sent, listing_saved, profile_view
    conversion_value: Optional[float] = None
    entity_id: Optional[str] = None  # listing_id, conversation_id, etc.
    
    # Attribution
    time_to_convert_seconds: int = 0  # Time from notification sent to conversion
    attribution_window_hours: int = 24  # Attribution window used
    
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ABTest(BaseModel):
    """A/B Test configuration - Phase 2"""
    id: str = Field(default_factory=lambda: f"abtest_{uuid.uuid4().hex[:12]}")
    name: str
    description: str = ""
    trigger_type: str
    
    # Variants
    control_title: str
    control_body: str
    variant_a_title: str
    variant_a_body: str
    variant_b_title: Optional[str] = None
    variant_b_body: Optional[str] = None
    
    # Traffic split (percentages)
    control_percentage: int = 34
    variant_a_percentage: int = 33
    variant_b_percentage: int = 33
    
    # Results tracking
    control_sent: int = 0
    control_opened: int = 0
    control_clicked: int = 0
    control_converted: int = 0
    variant_a_sent: int = 0
    variant_a_opened: int = 0
    variant_a_clicked: int = 0
    variant_a_converted: int = 0
    variant_b_sent: int = 0
    variant_b_opened: int = 0
    variant_b_clicked: int = 0
    variant_b_converted: int = 0
    
    # Status
    is_active: bool = True
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    winner: Optional[str] = None  # control, variant_a, variant_b
    
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class WeeklyDigestConfig(BaseModel):
    """Configuration for weekly digest emails - Phase 2"""
    id: str = "weekly_digest_config"
    
    # Schedule
    enabled: bool = True
    send_day: str = "monday"  # monday, tuesday, etc.
    send_hour: int = 9  # 0-23 UTC
    
    # Content settings
    max_new_listings: int = 10
    max_price_drops: int = 5
    include_recommendations: bool = True
    include_stats: bool = True
    
    # Targeting
    min_interest_score: int = 20
    min_days_since_last_visit: int = 0
    
    last_run: Optional[str] = None
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


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


# =============================================================================
# PHASE 5: MULTI-LANGUAGE TEMPLATES (i18n)
# =============================================================================

class LocalizedContent(BaseModel):
    """Localized content for a specific language"""
    title: str
    body: str
    subject: Optional[str] = None  # For email
    html_content: Optional[str] = None  # For email


class MultiLanguageTemplate(BaseModel):
    """Notification template with multi-language support"""
    id: str = Field(default_factory=lambda: f"mlt_{uuid.uuid4().hex[:12]}")
    name: str
    description: str = ""
    trigger_type: str
    
    # Default language content (fallback)
    default_language: str = DEFAULT_LANGUAGE
    
    # Localized content by language code
    translations: Dict[str, LocalizedContent] = {}
    
    # Template metadata
    channels: List[str] = ["push", "email", "in_app"]
    variables: List[str] = []  # List of available variables: user_name, listing_title, etc.
    
    # Status
    is_active: bool = True
    version: int = 1
    
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
    def get_content(self, language: str = DEFAULT_LANGUAGE) -> LocalizedContent:
        """Get content for specified language with fallback to default"""
        if language in self.translations:
            return self.translations[language]
        if self.default_language in self.translations:
            return self.translations[self.default_language]
        # Return empty content if no translations available
        return LocalizedContent(title="", body="")


class CampaignSchedulerConfig(BaseModel):
    """Configuration for campaign scheduler automation - Phase 5"""
    id: str = "campaign_scheduler_config"
    
    # Scheduler settings
    enabled: bool = True
    check_interval_seconds: int = 60  # How often to check for due campaigns
    
    # Processing settings
    batch_size: int = 100  # How many campaigns to process per run
    max_retries: int = 3
    retry_delay_minutes: int = 5
    
    # Rate limiting
    max_campaigns_per_hour: int = 10
    max_notifications_per_minute: int = 1000
    
    # Monitoring
    alert_on_failure: bool = True
    alert_email: Optional[str] = None
    
    # Stats
    last_run: Optional[str] = None
    campaigns_processed_today: int = 0
    notifications_sent_today: int = 0
    last_reset: Optional[str] = None
    
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# Default multi-language templates
DEFAULT_ML_TEMPLATES = {
    "new_listing_alert": {
        "name": "New Listing Alert",
        "trigger_type": "new_listing_in_category",
        "variables": ["user_name", "category_name", "listing_title", "price", "currency", "location", "listing_image"],
        "translations": {
            "en": {
                "title": "New {{category_name}} listing!",
                "body": "{{listing_title}} - {{currency}}{{price}}",
                "subject": "New listing in {{category_name}}: {{listing_title}}"
            },
            "es": {
                "title": "¡Nuevo anuncio en {{category_name}}!",
                "body": "{{listing_title}} - {{currency}}{{price}}",
                "subject": "Nuevo anuncio en {{category_name}}: {{listing_title}}"
            },
            "fr": {
                "title": "Nouvelle annonce {{category_name}} !",
                "body": "{{listing_title}} - {{currency}}{{price}}",
                "subject": "Nouvelle annonce dans {{category_name}}: {{listing_title}}"
            },
            "de": {
                "title": "Neue {{category_name}} Anzeige!",
                "body": "{{listing_title}} - {{currency}}{{price}}",
                "subject": "Neue Anzeige in {{category_name}}: {{listing_title}}"
            },
            "it": {
                "title": "Nuovo annuncio {{category_name}}!",
                "body": "{{listing_title}} - {{currency}}{{price}}",
                "subject": "Nuovo annuncio in {{category_name}}: {{listing_title}}"
            },
            "pt": {
                "title": "Novo anúncio em {{category_name}}!",
                "body": "{{listing_title}} - {{currency}}{{price}}",
                "subject": "Novo anúncio em {{category_name}}: {{listing_title}}"
            }
        }
    },
    "price_drop_alert": {
        "name": "Price Drop Alert",
        "trigger_type": "price_drop_saved_item",
        "variables": ["user_name", "listing_title", "price", "old_price", "currency", "drop_percent", "savings"],
        "translations": {
            "en": {
                "title": "Price Drop! {{listing_title}}",
                "body": "Now {{currency}}{{price}} ({{drop_percent}}% off)",
                "subject": "Price Drop! {{listing_title}} is now {{currency}}{{price}}"
            },
            "es": {
                "title": "¡Bajó de precio! {{listing_title}}",
                "body": "Ahora {{currency}}{{price}} ({{drop_percent}}% menos)",
                "subject": "¡Bajó de precio! {{listing_title}} ahora {{currency}}{{price}}"
            },
            "fr": {
                "title": "Baisse de prix ! {{listing_title}}",
                "body": "Maintenant {{currency}}{{price}} (-{{drop_percent}}%)",
                "subject": "Baisse de prix ! {{listing_title}} maintenant {{currency}}{{price}}"
            },
            "de": {
                "title": "Preissenkung! {{listing_title}}",
                "body": "Jetzt {{currency}}{{price}} ({{drop_percent}}% Rabatt)",
                "subject": "Preissenkung! {{listing_title}} jetzt {{currency}}{{price}}"
            }
        }
    },
    "message_received": {
        "name": "Message Received",
        "trigger_type": "message_received",
        "variables": ["user_name", "sender_name", "message_preview", "listing_title"],
        "translations": {
            "en": {
                "title": "{{sender_name}}",
                "body": "{{message_preview}}",
                "subject": "New message from {{sender_name}}"
            },
            "es": {
                "title": "{{sender_name}}",
                "body": "{{message_preview}}",
                "subject": "Nuevo mensaje de {{sender_name}}"
            },
            "fr": {
                "title": "{{sender_name}}",
                "body": "{{message_preview}}",
                "subject": "Nouveau message de {{sender_name}}"
            },
            "de": {
                "title": "{{sender_name}}",
                "body": "{{message_preview}}",
                "subject": "Neue Nachricht von {{sender_name}}"
            }
        }
    },
    "weekly_digest": {
        "name": "Weekly Digest",
        "trigger_type": "weekly_digest",
        "variables": ["user_name", "new_listings_count", "price_drops_count"],
        "translations": {
            "en": {
                "title": "Your Weekly Digest",
                "body": "{{new_listings_count}} new listings, {{price_drops_count}} price drops",
                "subject": "Your Weekly Marketplace Digest"
            },
            "es": {
                "title": "Tu Resumen Semanal",
                "body": "{{new_listings_count}} nuevos anuncios, {{price_drops_count}} bajadas de precio",
                "subject": "Tu Resumen Semanal del Marketplace"
            },
            "fr": {
                "title": "Votre Résumé Hebdomadaire",
                "body": "{{new_listings_count}} nouvelles annonces, {{price_drops_count}} baisses de prix",
                "subject": "Votre Résumé Hebdomadaire du Marketplace"
            },
            "de": {
                "title": "Ihre Wochenzusammenfassung",
                "body": "{{new_listings_count}} neue Anzeigen, {{price_drops_count}} Preissenkungen",
                "subject": "Ihre wöchentliche Marketplace-Zusammenfassung"
            }
        }
    }
}


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
                await self.db.user_interest_profiles.insert_one(profile)
                profile = await self.db.user_interest_profiles.find_one({"user_id": user_id})
            
            now = datetime.now(timezone.utc).isoformat()
            set_updates = {"updated_at": now, "last_activity": now}
            inc_updates = {}
            add_to_set_updates = {}
            
            # Update based on event type
            if event.event_type == BehaviorEventType.VIEW_LISTING:
                inc_updates["total_views"] = 1
                
                # Update category interest
                category_id = event.metadata.get("category_id")
                if category_id:
                    current_score = profile.get("category_interests", {}).get(category_id, 0)
                    new_score = min(100, current_score + 1)  # Increment by 1, max 100
                    set_updates[f"category_interests.{category_id}"] = new_score
                
                # Update price preferences
                price = event.metadata.get("price")
                if price and category_id:
                    price_prefs = profile.get("price_preferences", {}).get(category_id, {"min": price, "max": price, "avg": price, "count": 0})
                    count = price_prefs.get("count", 0) + 1
                    new_avg = ((price_prefs.get("avg", price) * (count - 1)) + price) / count
                    set_updates[f"price_preferences.{category_id}"] = {
                        "min": min(price_prefs.get("min", price), price),
                        "max": max(price_prefs.get("max", price), price),
                        "avg": new_avg,
                        "count": count
                    }
            
            elif event.event_type == BehaviorEventType.SAVE_LISTING:
                inc_updates["total_saves"] = 1
                
                category_id = event.metadata.get("category_id")
                if category_id:
                    # Higher weight for saves
                    current_score = profile.get("category_interests", {}).get(category_id, 0)
                    new_score = min(100, current_score + 5)
                    set_updates[f"category_interests.{category_id}"] = new_score
                    
                    # Track saved categories for price drop alerts
                    add_to_set_updates["saved_categories"] = category_id
            
            elif event.event_type == BehaviorEventType.SEARCH_QUERY:
                query = event.metadata.get("query", "")
                if query:
                    # Add to recent searches (keep last 20)
                    recent = profile.get("recent_searches", [])
                    if query not in recent:
                        recent = [query] + recent[:19]
                        set_updates["recent_searches"] = recent
            
            elif event.event_type == BehaviorEventType.PURCHASE:
                inc_updates["total_purchases"] = 1
                
                category_id = event.metadata.get("category_id")
                if category_id:
                    # Highest weight for purchases
                    current_score = profile.get("category_interests", {}).get(category_id, 0)
                    new_score = min(100, current_score + 20)
                    set_updates[f"category_interests.{category_id}"] = new_score
            
            elif event.event_type == BehaviorEventType.VIEW_CATEGORY:
                category_id = event.entity_id
                if category_id:
                    current_score = profile.get("category_interests", {}).get(category_id, 0)
                    new_score = min(100, current_score + 2)
                    set_updates[f"category_interests.{category_id}"] = new_score
            
            # Build update operation
            update_op = {}
            if set_updates:
                update_op["$set"] = set_updates
            if inc_updates:
                update_op["$inc"] = inc_updates
            if add_to_set_updates:
                update_op["$addToSet"] = add_to_set_updates
            
            if update_op:
                await self.db.user_interest_profiles.update_one(
                    {"user_id": user_id},
                    update_op
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
        # Note: timezone support can be added later for full i18n
        
        # Get current time in user's timezone (simplified - using UTC)
        now = datetime.now(timezone.utc)
        current_time = now.strftime("%H:%M")
        
        # Check if current time is within quiet hours
        if start < end:
            return start <= current_time <= end
        else:  # Spans midnight
            return current_time >= start or current_time <= end
    
    async def _send_push_notification(self, user_id: str, notification: Dict) -> bool:
        """Send push notification via FCM (preferred) or Expo (fallback)"""
        try:
            # Get user's push token
            user_settings = await self.db.user_settings.find_one({"user_id": user_id})
            push_token = user_settings.get("push_token") if user_settings else None
            fcm_token = user_settings.get("fcm_token") if user_settings else None
            
            if not push_token and not fcm_token:
                logger.info(f"No push token for user {user_id}")
                return False
            
            # Try FCM first if available and we have an FCM token
            if FCM_ENABLED and fcm_messaging and fcm_token:
                return await self._send_fcm_notification(fcm_token, notification)
            
            # Fallback to Expo Push
            if push_token and self._expo_push_client:
                return await self._send_expo_notification(push_token, notification)
            
            logger.warning(f"No push method available for user {user_id}")
            return False
            
        except Exception as e:
            logger.error(f"Error sending push notification: {e}")
            return False
    
    async def _send_fcm_notification(self, fcm_token: str, notification: Dict) -> bool:
        """Send push notification via Firebase Cloud Messaging"""
        try:
            if not FCM_ENABLED or not fcm_messaging:
                return False
            
            # Build FCM message
            message = fcm_messaging.Message(
                notification=fcm_messaging.Notification(
                    title=notification.get("title", ""),
                    body=notification.get("body", ""),
                    image=notification.get("image_url"),
                ),
                data={
                    "deep_link": notification.get("deep_link", ""),
                    "notification_id": notification.get("id", ""),
                    "click_action": "FLUTTER_NOTIFICATION_CLICK",
                },
                token=fcm_token,
                android=fcm_messaging.AndroidConfig(
                    priority="high",
                    notification=fcm_messaging.AndroidNotification(
                        icon="ic_notification",
                        color="#2E7D32",
                        sound="default",
                        channel_id="default",
                    ),
                ),
                apns=fcm_messaging.APNSConfig(
                    payload=fcm_messaging.APNSPayload(
                        aps=fcm_messaging.Aps(
                            sound="default",
                            badge=1,
                        ),
                    ),
                ),
            )
            
            # Send message
            response = fcm_messaging.send(message)
            logger.info(f"FCM message sent: {response}")
            return True
            
        except Exception as e:
            logger.error(f"FCM send error: {e}")
            return False
    
    async def _send_expo_notification(self, push_token: str, notification: Dict) -> bool:
        """Send push notification via Expo Push"""
        try:
            if not self._expo_push_client:
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
            logger.error(f"Expo push error: {e}")
            return False
    
    async def send_fcm_multicast(self, tokens: List[str], notification: Dict) -> Dict:
        """Send FCM notification to multiple devices at once"""
        if not FCM_ENABLED or not fcm_messaging:
            return {"success": 0, "failure": len(tokens), "error": "FCM not enabled"}
        
        try:
            message = fcm_messaging.MulticastMessage(
                notification=fcm_messaging.Notification(
                    title=notification.get("title", ""),
                    body=notification.get("body", ""),
                ),
                data={
                    "deep_link": notification.get("deep_link", ""),
                    "notification_id": notification.get("id", ""),
                },
                tokens=tokens,
            )
            
            response = fcm_messaging.send_multicast(message)
            return {
                "success": response.success_count,
                "failure": response.failure_count,
            }
            
        except Exception as e:
            logger.error(f"FCM multicast error: {e}")
            return {"success": 0, "failure": len(tokens), "error": str(e)}
    
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
    
    # =========================================================================
    # PHASE 3: CAMPAIGN SENDING
    # =========================================================================
    
    async def _send_campaign(self, campaign: Dict) -> int:
        """Send a campaign to all target users"""
        try:
            target_segments = campaign.get("target_segments", ["all_users"])
            channels = campaign.get("channels", ["push", "email"])
            
            # Build user query based on segments
            user_query = {}
            if "all_users" not in target_segments:
                # Build more specific query based on segments
                if "active_buyers" in target_segments:
                    user_query["total_purchases"] = {"$gt": 0}
                if "active_sellers" in target_segments:
                    user_query["listings_count"] = {"$gt": 0}
            
            # Get target users
            users = await self.db.users.find(user_query, {"user_id": 1, "name": 1, "email": 1}).to_list(10000)
            
            sent_count = 0
            trigger = {
                "id": campaign.get("id"),
                "trigger_type": campaign.get("trigger_type", "promotional"),
                "title_template": campaign.get("title", ""),
                "body_template": campaign.get("body", ""),
                "channels": channels,
                "priority": 6,
                "min_interval_minutes": 0,
                "max_per_day": 100
            }
            
            for user in users:
                user_id = user.get("user_id")
                if not user_id:
                    continue
                
                await self._queue_notification(
                    user_id=user_id,
                    trigger=trigger,
                    variables={
                        "user_name": user.get("name", "there"),
                    },
                    deep_link="/",
                    metadata={"campaign_id": campaign.get("id"), "trigger": "campaign"}
                )
                sent_count += 1
            
            logger.info(f"Campaign {campaign.get('id')}: queued {sent_count} notifications")
            return sent_count
            
        except Exception as e:
            logger.error(f"Error sending campaign: {e}")
            return 0
    
    # =========================================================================
    # PHASE 2: CONVERSION TRACKING
    # =========================================================================
    
    async def track_notification_open(self, notification_id: str, user_id: str) -> Dict:
        """Track when a notification is opened"""
        try:
            now = datetime.now(timezone.utc).isoformat()
            await self.db.smart_notifications.update_one(
                {"id": notification_id, "user_id": user_id},
                {"$set": {"opened_at": now}}
            )
            await self._update_analytics({"id": notification_id, "trigger_type": "general"}, "opened")
            return {"success": True, "tracked": "open"}
        except Exception as e:
            logger.error(f"Error tracking notification open: {e}")
            return {"success": False, "error": str(e)}
    
    async def track_notification_click(self, notification_id: str, user_id: str) -> Dict:
        """Track when a notification is clicked/tapped"""
        try:
            now = datetime.now(timezone.utc).isoformat()
            await self.db.smart_notifications.update_one(
                {"id": notification_id, "user_id": user_id},
                {"$set": {"clicked_at": now}}
            )
            await self._update_analytics({"id": notification_id, "trigger_type": "general"}, "clicked")
            return {"success": True, "tracked": "click"}
        except Exception as e:
            logger.error(f"Error tracking notification click: {e}")
            return {"success": False, "error": str(e)}
    
    async def track_conversion(
        self,
        notification_id: str,
        user_id: str,
        conversion_type: str,
        conversion_value: Optional[float] = None,
        entity_id: Optional[str] = None
    ) -> Dict:
        """Track conversion from a notification (purchase, message, save, etc.)"""
        try:
            # Get the notification
            notification = await self.db.smart_notifications.find_one(
                {"id": notification_id, "user_id": user_id}
            )
            if not notification:
                return {"success": False, "error": "Notification not found"}
            
            # Calculate time to convert
            sent_at = notification.get("sent_at")
            if sent_at:
                sent_time = datetime.fromisoformat(sent_at.replace("Z", "+00:00"))
                time_to_convert = int((datetime.now(timezone.utc) - sent_time).total_seconds())
            else:
                time_to_convert = 0
            
            # Create conversion record
            conversion = NotificationConversion(
                notification_id=notification_id,
                user_id=user_id,
                conversion_type=conversion_type,
                conversion_value=conversion_value,
                entity_id=entity_id,
                time_to_convert_seconds=time_to_convert
            )
            await self.db.notification_conversions.insert_one(conversion.model_dump())
            
            # Update notification record
            now = datetime.now(timezone.utc).isoformat()
            await self.db.smart_notifications.update_one(
                {"id": notification_id},
                {"$set": {
                    "converted_at": now,
                    "conversion_type": conversion_type,
                    "conversion_value": conversion_value
                }}
            )
            
            # Update A/B test if applicable
            ab_test_id = notification.get("ab_test_id")
            ab_variant = notification.get("ab_variant")
            if ab_test_id and ab_variant:
                await self.db.ab_tests.update_one(
                    {"id": ab_test_id},
                    {"$inc": {f"{ab_variant}_converted": 1}}
                )
            
            logger.info(f"Conversion tracked: {conversion_type} for notification {notification_id}")
            return {"success": True, "conversion_id": conversion.id}
            
        except Exception as e:
            logger.error(f"Error tracking conversion: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_conversion_analytics(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        trigger_type: Optional[str] = None
    ) -> Dict:
        """Get conversion analytics for notifications"""
        try:
            query = {}
            if start_date:
                query["created_at"] = {"$gte": start_date}
            if end_date:
                if "created_at" in query:
                    query["created_at"]["$lte"] = end_date
                else:
                    query["created_at"] = {"$lte": end_date}
            
            conversions = await self.db.notification_conversions.find(query, {"_id": 0}).to_list(1000)
            
            # Aggregate by type
            by_type = {}
            total_value = 0
            for conv in conversions:
                ctype = conv.get("conversion_type", "unknown")
                if ctype not in by_type:
                    by_type[ctype] = {"count": 0, "value": 0}
                by_type[ctype]["count"] += 1
                by_type[ctype]["value"] += conv.get("conversion_value", 0) or 0
                total_value += conv.get("conversion_value", 0) or 0
            
            # Calculate average time to convert
            avg_time = sum(c.get("time_to_convert_seconds", 0) for c in conversions) / len(conversions) if conversions else 0
            
            return {
                "total_conversions": len(conversions),
                "total_value": total_value,
                "by_type": by_type,
                "avg_time_to_convert_seconds": round(avg_time, 1),
                "conversions": conversions[:100]  # Return last 100
            }
            
        except Exception as e:
            logger.error(f"Error getting conversion analytics: {e}")
            return {"error": str(e)}
    
    # =========================================================================
    # PHASE 2: A/B TESTING
    # =========================================================================
    
    async def create_ab_test(self, test_data: Dict) -> Dict:
        """Create a new A/B test"""
        test = ABTest(**test_data)
        test.start_date = datetime.now(timezone.utc).isoformat()
        await self.db.ab_tests.insert_one(test.model_dump())
        return test.model_dump()
    
    async def get_ab_tests(self, active_only: bool = False) -> List[Dict]:
        """Get all A/B tests"""
        query = {}
        if active_only:
            query["is_active"] = True
        tests = await self.db.ab_tests.find(query, {"_id": 0}).to_list(100)
        return tests
    
    async def get_ab_test(self, test_id: str) -> Optional[Dict]:
        """Get a specific A/B test"""
        return await self.db.ab_tests.find_one({"id": test_id}, {"_id": 0})
    
    async def update_ab_test(self, test_id: str, updates: Dict) -> Optional[Dict]:
        """Update an A/B test"""
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await self.db.ab_tests.update_one({"id": test_id}, {"$set": updates})
        return await self.get_ab_test(test_id)
    
    async def end_ab_test(self, test_id: str) -> Optional[Dict]:
        """End an A/B test and determine winner"""
        test = await self.get_ab_test(test_id)
        if not test:
            return None
        
        # Calculate winner based on conversion rate
        def calc_rate(sent, converted):
            return (converted / sent * 100) if sent > 0 else 0
        
        control_rate = calc_rate(test.get("control_sent", 0), test.get("control_converted", 0))
        variant_a_rate = calc_rate(test.get("variant_a_sent", 0), test.get("variant_a_converted", 0))
        variant_b_rate = calc_rate(test.get("variant_b_sent", 0), test.get("variant_b_converted", 0))
        
        rates = {"control": control_rate, "variant_a": variant_a_rate, "variant_b": variant_b_rate}
        winner = max(rates, key=rates.get)
        
        return await self.update_ab_test(test_id, {
            "is_active": False,
            "end_date": datetime.now(timezone.utc).isoformat(),
            "winner": winner
        })
    
    def _select_ab_variant(self, test: Dict, user_id: str) -> str:
        """Select A/B test variant for a user (deterministic based on user_id)"""
        import random
        # Use user_id as seed for consistent assignment
        random.seed(hash(user_id + test.get("id", "")))
        roll = random.randint(1, 100)
        
        control_pct = test.get("control_percentage", 34)
        variant_a_pct = test.get("variant_a_percentage", 33)
        
        if roll <= control_pct:
            return "control"
        elif roll <= control_pct + variant_a_pct:
            return "variant_a"
        else:
            return "variant_b"
    
    # =========================================================================
    # PHASE 2: SIMILAR LISTING ALERTS
    # =========================================================================
    
    async def check_similar_listing_triggers(self, listing: Dict):
        """
        Check if a new listing should trigger similar listing alerts.
        Looks for users who searched for similar items or viewed similar listings.
        """
        try:
            category_id = listing.get("category_id")
            title = listing.get("title", "").lower()
            price = listing.get("price", 0)
            
            if not category_id or not title:
                return
            
            # Extract keywords from title
            keywords = [w for w in title.split() if len(w) > 3][:5]
            
            # Find users with matching recent searches
            search_regex = "|".join(keywords) if keywords else title
            
            matching_profiles = await self.db.user_interest_profiles.find({
                "$or": [
                    {"recent_searches": {"$regex": search_regex, "$options": "i"}},
                    {f"category_interests.{category_id}": {"$gte": 30}}
                ]
            }, {"user_id": 1}).to_list(500)
            
            if not matching_profiles:
                return
            
            user_ids = [p["user_id"] for p in matching_profiles]
            # Exclude listing owner
            user_ids = [uid for uid in user_ids if uid != listing.get("user_id")]
            
            trigger = {
                "id": "similar_listing_alert",
                "trigger_type": TriggerType.SIMILAR_LISTING_ALERT,
                "title_template": "Found something you might like!",
                "body_template": "{{listing_title}} - {{currency}}{{price}}",
                "channels": ["push", "in_app"],
                "priority": 4,
                "min_interval_minutes": 120,
                "max_per_day": 5
            }
            
            for user_id in user_ids[:50]:  # Limit to 50 users
                await self._queue_notification(
                    user_id=user_id,
                    trigger=trigger,
                    variables={
                        "listing_title": listing.get("title", ""),
                        "price": price,
                        "currency": "€",
                        "listing_image": listing.get("images", [None])[0]
                    },
                    deep_link=f"/listing/{listing.get('id')}",
                    metadata={"listing_id": listing.get("id"), "trigger": "similar_listing"}
                )
            
            logger.info(f"Queued similar listing alerts for {len(user_ids)} users")
            
        except Exception as e:
            logger.error(f"Error checking similar listing triggers: {e}")
    
    # =========================================================================
    # PHASE 2: SELLER REPLY NOTIFICATIONS
    # =========================================================================
    
    async def trigger_seller_reply_notification(
        self,
        buyer_id: str,
        seller_id: str,
        conversation_id: str,
        listing_id: Optional[str] = None,
        message_preview: str = ""
    ):
        """Trigger notification when a seller replies to a buyer's inquiry"""
        try:
            # Get seller info
            seller = await self.db.users.find_one({"user_id": seller_id}, {"_id": 0, "name": 1})
            seller_name = seller.get("name", "Seller") if seller else "Seller"
            
            # Get listing info
            listing_title = ""
            if listing_id:
                listing = await self.db.listings.find_one({"id": listing_id}, {"_id": 0, "title": 1, "images": 1})
                listing_title = listing.get("title", "") if listing else ""
                listing_image = listing.get("images", [None])[0] if listing else None
            else:
                listing_image = None
            
            trigger = {
                "id": "seller_reply_notification",
                "trigger_type": TriggerType.SELLER_REPLY,
                "title_template": "{{seller_name}} replied!",
                "body_template": "{{message_preview}}",
                "channels": ["push", "email", "in_app"],
                "priority": 1,
                "min_interval_minutes": 0,
                "max_per_day": 50
            }
            
            await self._queue_notification(
                user_id=buyer_id,
                trigger=trigger,
                variables={
                    "seller_name": seller_name,
                    "message_preview": message_preview[:100] if message_preview else "Check out their response",
                    "listing_title": listing_title,
                    "listing_image": listing_image
                },
                deep_link=f"/chat/{conversation_id}",
                metadata={
                    "conversation_id": conversation_id,
                    "seller_id": seller_id,
                    "listing_id": listing_id,
                    "trigger": "seller_reply"
                }
            )
            
            logger.info(f"Triggered seller reply notification to buyer {buyer_id}")
            
        except Exception as e:
            logger.error(f"Error triggering seller reply notification: {e}")
    
    # =========================================================================
    # PHASE 2: WEEKLY DIGEST
    # =========================================================================
    
    async def get_weekly_digest_config(self) -> Dict:
        """Get weekly digest configuration"""
        config = await self.db.weekly_digest_config.find_one({"id": "weekly_digest_config"})
        if not config:
            config = WeeklyDigestConfig().model_dump()
            await self.db.weekly_digest_config.insert_one(config)
        return {k: v for k, v in config.items() if k != "_id"}
    
    async def update_weekly_digest_config(self, updates: Dict) -> Dict:
        """Update weekly digest configuration"""
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await self.db.weekly_digest_config.update_one(
            {"id": "weekly_digest_config"},
            {"$set": updates},
            upsert=True
        )
        return await self.get_weekly_digest_config()
    
    async def generate_weekly_digest(self, user_id: str) -> Optional[Dict]:
        """Generate weekly digest for a single user"""
        try:
            config = await self.get_weekly_digest_config()
            if not config.get("enabled", True):
                return None
            
            # Get user's interest profile
            profile = await self.get_interest_profile(user_id)
            if not profile:
                return None
            
            # Get user info
            user = await self.db.users.find_one({"user_id": user_id}, {"_id": 0, "name": 1, "email": 1})
            if not user:
                return None
            
            # Get top interested categories
            category_interests = profile.get("category_interests", {})
            top_categories = sorted(category_interests.items(), key=lambda x: x[1], reverse=True)[:5]
            category_ids = [c[0] for c in top_categories]
            
            # Get new listings in interested categories from last 7 days
            week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
            new_listings = await self.db.listings.find({
                "category_id": {"$in": category_ids} if category_ids else {"$exists": True},
                "status": "active",
                "created_at": {"$gte": week_ago}
            }, {"_id": 0, "id": 1, "title": 1, "price": 1, "images": 1, "category_id": 1}).sort(
                "created_at", -1
            ).limit(config.get("max_new_listings", 10)).to_list(10)
            
            # Get price drops on saved items
            favorites = await self.db.favorites.find({"user_id": user_id}).to_list(100)
            favorite_listing_ids = [f["listing_id"] for f in favorites]
            
            price_drops = []
            if favorite_listing_ids:
                # Check for recent price drops (simplified - in production, track price history)
                # For now, just include saved items with recent updates
                saved_listings = await self.db.listings.find({
                    "id": {"$in": favorite_listing_ids},
                    "updated_at": {"$gte": week_ago}
                }, {"_id": 0, "id": 1, "title": 1, "price": 1, "images": 1}).limit(
                    config.get("max_price_drops", 5)
                ).to_list(5)
                price_drops = saved_listings
            
            # Generate digest content
            digest_content = {
                "user_name": user.get("name", "there"),
                "new_listings_count": len(new_listings),
                "price_drops_count": len(price_drops),
                "top_listings": new_listings[:5],
                "price_drop_listings": price_drops,
                "week_start": week_ago,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            
            return digest_content
            
        except Exception as e:
            logger.error(f"Error generating weekly digest for user {user_id}: {e}")
            return None
    
    async def send_weekly_digests(self):
        """Send weekly digest emails to all eligible users"""
        try:
            config = await self.get_weekly_digest_config()
            if not config.get("enabled", True):
                logger.info("Weekly digest is disabled")
                return {"sent": 0, "skipped": 0}
            
            # Get all users with email enabled and weekly digest enabled
            consents = await self.db.user_notification_consent.find({
                "email_enabled": True,
                "trigger_preferences.weekly_digest": {"$ne": False}
            }).to_list(10000)
            
            sent_count = 0
            skipped_count = 0
            
            for consent in consents:
                user_id = consent.get("user_id")
                if not user_id:
                    continue
                
                # Generate digest
                digest = await self.generate_weekly_digest(user_id)
                if not digest or (digest.get("new_listings_count", 0) == 0 and digest.get("price_drops_count", 0) == 0):
                    skipped_count += 1
                    continue
                
                # Queue email notification
                trigger = {
                    "id": "weekly_digest",
                    "trigger_type": TriggerType.WEEKLY_DIGEST,
                    "title_template": "Your Weekly Marketplace Digest",
                    "body_template": "{{new_listings_count}} new listings, {{price_drops_count}} price drops",
                    "channels": ["email"],
                    "priority": 8,
                    "min_interval_minutes": 0,
                    "max_per_day": 1
                }
                
                await self._queue_notification(
                    user_id=user_id,
                    trigger=trigger,
                    variables=digest,
                    deep_link="/",
                    metadata={"trigger": "weekly_digest", "digest_data": digest}
                )
                sent_count += 1
            
            # Update last run time
            await self.update_weekly_digest_config({
                "last_run": datetime.now(timezone.utc).isoformat()
            })
            
            logger.info(f"Weekly digest: queued {sent_count}, skipped {skipped_count}")
            return {"sent": sent_count, "skipped": skipped_count}
            
        except Exception as e:
            logger.error(f"Error sending weekly digests: {e}")
            return {"error": str(e)}


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
    
    # =========================================================================
    # PHASE 2: CONVERSION TRACKING ENDPOINTS
    # =========================================================================
    
    @router.post("/track/open/{notification_id}")
    async def track_notification_open(notification_id: str, request: Request):
        """Track notification open event"""
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return await service.track_notification_open(notification_id, user.user_id)
    
    @router.post("/track/click/{notification_id}")
    async def track_notification_click(notification_id: str, request: Request):
        """Track notification click event"""
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return await service.track_notification_click(notification_id, user.user_id)
    
    @router.post("/track/conversion/{notification_id}")
    async def track_conversion(
        notification_id: str,
        request: Request,
        conversion_type: str = Body(...),
        conversion_value: Optional[float] = Body(None),
        entity_id: Optional[str] = Body(None)
    ):
        """Track conversion from notification"""
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return await service.track_conversion(
            notification_id, user.user_id, conversion_type, conversion_value, entity_id
        )
    
    @router.get("/admin/conversions")
    async def get_conversion_analytics(
        start_date: Optional[str] = Query(None),
        end_date: Optional[str] = Query(None),
        trigger_type: Optional[str] = Query(None)
    ):
        """Get conversion analytics"""
        return await service.get_conversion_analytics(start_date, end_date, trigger_type)
    
    # =========================================================================
    # PHASE 2: A/B TESTING ENDPOINTS
    # =========================================================================
    
    @router.get("/admin/ab-tests")
    async def get_ab_tests(active_only: bool = Query(False)):
        """Get all A/B tests"""
        return await service.get_ab_tests(active_only)
    
    @router.post("/admin/ab-tests")
    async def create_ab_test(test_data: Dict[str, Any] = Body(...)):
        """Create a new A/B test"""
        return await service.create_ab_test(test_data)
    
    @router.get("/admin/ab-tests/{test_id}")
    async def get_ab_test(test_id: str):
        """Get a specific A/B test"""
        test = await service.get_ab_test(test_id)
        if not test:
            raise HTTPException(status_code=404, detail="A/B test not found")
        return test
    
    @router.put("/admin/ab-tests/{test_id}")
    async def update_ab_test(test_id: str, updates: Dict[str, Any] = Body(...)):
        """Update an A/B test"""
        result = await service.update_ab_test(test_id, updates)
        if not result:
            raise HTTPException(status_code=404, detail="A/B test not found")
        return result
    
    @router.post("/admin/ab-tests/{test_id}/end")
    async def end_ab_test(test_id: str):
        """End an A/B test and determine winner"""
        result = await service.end_ab_test(test_id)
        if not result:
            raise HTTPException(status_code=404, detail="A/B test not found")
        return result
    
    # =========================================================================
    # PHASE 2: WEEKLY DIGEST ENDPOINTS
    # =========================================================================
    
    @router.get("/admin/weekly-digest/config")
    async def get_weekly_digest_config():
        """Get weekly digest configuration"""
        return await service.get_weekly_digest_config()
    
    @router.put("/admin/weekly-digest/config")
    async def update_weekly_digest_config(updates: Dict[str, Any] = Body(...)):
        """Update weekly digest configuration"""
        return await service.update_weekly_digest_config(updates)
    
    @router.post("/admin/weekly-digest/send")
    async def send_weekly_digests():
        """Manually trigger weekly digest sending"""
        return await service.send_weekly_digests()
    
    @router.get("/admin/weekly-digest/preview/{user_id}")
    async def preview_weekly_digest(user_id: str):
        """Preview weekly digest for a user"""
        digest = await service.generate_weekly_digest(user_id)
        if not digest:
            raise HTTPException(status_code=404, detail="Could not generate digest for user")
        return digest
    
    # =========================================================================
    # PHASE 3: EMAIL TEMPLATES
    # =========================================================================
    
    @router.get("/admin/templates")
    async def get_templates():
        """Get all email templates"""
        templates = await db.email_templates.find({}, {"_id": 0}).to_list(100)
        return templates
    
    @router.post("/admin/templates")
    async def create_template(template_data: Dict[str, Any] = Body(...)):
        """Create a new email template"""
        template = {
            "id": f"tpl_{uuid.uuid4().hex[:12]}",
            **template_data,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.email_templates.insert_one(template)
        return {k: v for k, v in template.items() if k != "_id"}
    
    @router.put("/admin/templates/{template_id}")
    async def update_template(template_id: str, updates: Dict[str, Any] = Body(...)):
        """Update an email template"""
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.email_templates.update_one({"id": template_id}, {"$set": updates})
        return await db.email_templates.find_one({"id": template_id}, {"_id": 0})
    
    @router.delete("/admin/templates/{template_id}")
    async def delete_template(template_id: str):
        """Delete an email template"""
        result = await db.email_templates.delete_one({"id": template_id})
        return {"success": result.deleted_count > 0}
    
    # =========================================================================
    # PHASE 3: SCHEDULED CAMPAIGNS
    # =========================================================================
    
    @router.get("/admin/campaigns")
    async def get_campaigns():
        """Get all scheduled campaigns"""
        campaigns = await db.scheduled_campaigns.find({}, {"_id": 0}).sort("scheduled_at", -1).to_list(100)
        return campaigns
    
    @router.post("/admin/campaigns")
    async def create_campaign(campaign_data: Dict[str, Any] = Body(...)):
        """Create a new scheduled campaign"""
        campaign = {
            "id": f"camp_{uuid.uuid4().hex[:12]}",
            **campaign_data,
            "status": "scheduled",
            "sent_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.scheduled_campaigns.insert_one(campaign)
        return {k: v for k, v in campaign.items() if k != "_id"}
    
    @router.put("/admin/campaigns/{campaign_id}")
    async def update_campaign(campaign_id: str, updates: Dict[str, Any] = Body(...)):
        """Update a scheduled campaign"""
        # Only allow updates for scheduled campaigns
        campaign = await db.scheduled_campaigns.find_one({"id": campaign_id})
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        if campaign.get("status") != "scheduled":
            raise HTTPException(status_code=400, detail="Can only update scheduled campaigns")
        
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.scheduled_campaigns.update_one({"id": campaign_id}, {"$set": updates})
        return await db.scheduled_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    
    @router.post("/admin/campaigns/{campaign_id}/cancel")
    async def cancel_campaign(campaign_id: str):
        """Cancel a scheduled campaign"""
        campaign = await db.scheduled_campaigns.find_one({"id": campaign_id})
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        if campaign.get("status") != "scheduled":
            raise HTTPException(status_code=400, detail="Can only cancel scheduled campaigns")
        
        await db.scheduled_campaigns.update_one(
            {"id": campaign_id},
            {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"success": True}
    
    @router.post("/admin/campaigns/{campaign_id}/send")
    async def send_campaign_now(campaign_id: str):
        """Immediately send a scheduled campaign"""
        campaign = await db.scheduled_campaigns.find_one({"id": campaign_id})
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        if campaign.get("status") != "scheduled":
            raise HTTPException(status_code=400, detail="Can only send scheduled campaigns")
        
        # Queue notifications for all target users
        sent_count = await service._send_campaign(campaign)
        
        await db.scheduled_campaigns.update_one(
            {"id": campaign_id},
            {"$set": {
                "status": "sent",
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "sent_count": sent_count
            }}
        )
        return {"success": True, "sent_count": sent_count}
    
    @router.delete("/admin/campaigns/{campaign_id}")
    async def delete_campaign(campaign_id: str):
        """Delete a campaign"""
        result = await db.scheduled_campaigns.delete_one({"id": campaign_id})
        return {"success": result.deleted_count > 0}
    
    # =========================================================================
    # PHASE 4: USER SEGMENTATION
    # =========================================================================
    
    @router.get("/admin/segments")
    async def get_segments():
        """Get all user segments (predefined + custom)"""
        custom_segments = await db.user_segments.find({}, {"_id": 0}).to_list(100)
        
        # Combine predefined and custom
        predefined = [
            {"id": key, "is_predefined": True, **val}
            for key, val in PREDEFINED_SEGMENTS.items()
        ]
        
        return predefined + custom_segments
    
    @router.post("/admin/segments")
    async def create_segment(segment_data: Dict[str, Any] = Body(...)):
        """Create a custom user segment"""
        # Validate rules
        rules = []
        for rule_data in segment_data.get("rules", []):
            rule = SegmentRule(**rule_data)
            rules.append(rule.model_dump())
        
        segment = {
            "id": f"seg_{uuid.uuid4().hex[:12]}",
            "name": segment_data.get("name", ""),
            "description": segment_data.get("description", ""),
            "rules": rules,
            "logic": segment_data.get("logic", "AND"),
            "estimated_users": 0,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        # Calculate estimated users
        segment_obj = UserSegment(**{k: v for k, v in segment.items() if k not in ["rules"]})
        segment_obj.rules = [SegmentRule(**r) for r in rules]
        query = segment_obj.to_mongo_query()
        
        if query:
            count = await db.users.count_documents(query)
        else:
            count = await db.users.count_documents({})
        
        segment["estimated_users"] = count
        segment["last_calculated"] = datetime.now(timezone.utc).isoformat()
        
        await db.user_segments.insert_one(segment)
        return {k: v for k, v in segment.items() if k != "_id"}
    
    @router.put("/admin/segments/{segment_id}")
    async def update_segment(segment_id: str, updates: Dict[str, Any] = Body(...)):
        """Update a custom segment"""
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.user_segments.update_one({"id": segment_id}, {"$set": updates})
        return await db.user_segments.find_one({"id": segment_id}, {"_id": 0})
    
    @router.delete("/admin/segments/{segment_id}")
    async def delete_segment(segment_id: str):
        """Delete a custom segment"""
        result = await db.user_segments.delete_one({"id": segment_id})
        return {"success": result.deleted_count > 0}
    
    @router.get("/admin/segments/{segment_id}/preview")
    async def preview_segment(segment_id: str, limit: int = Query(10)):
        """Preview users in a segment"""
        # Check predefined first
        if segment_id in PREDEFINED_SEGMENTS:
            segment_data = PREDEFINED_SEGMENTS[segment_id]
            rules = [SegmentRule(**r) for r in segment_data.get("rules", [])]
        else:
            segment = await db.user_segments.find_one({"id": segment_id})
            if not segment:
                raise HTTPException(status_code=404, detail="Segment not found")
            rules = [SegmentRule(**r) for r in segment.get("rules", [])]
            segment_data = segment
        
        # Build query
        segment_obj = UserSegment(
            name=segment_data.get("name", ""),
            rules=rules,
            logic=segment_data.get("logic", "AND")
        )
        query = segment_obj.to_mongo_query()
        
        # Get users
        users = await db.users.find(query or {}, {"_id": 0, "user_id": 1, "name": 1, "email": 1}).limit(limit).to_list(limit)
        total = await db.users.count_documents(query or {})
        
        return {
            "users": users,
            "total": total,
            "segment_id": segment_id
        }
    
    @router.post("/admin/segments/{segment_id}/recalculate")
    async def recalculate_segment(segment_id: str):
        """Recalculate segment user count"""
        if segment_id in PREDEFINED_SEGMENTS:
            segment_data = PREDEFINED_SEGMENTS[segment_id]
            rules = [SegmentRule(**r) for r in segment_data.get("rules", [])]
        else:
            segment = await db.user_segments.find_one({"id": segment_id})
            if not segment:
                raise HTTPException(status_code=404, detail="Segment not found")
            rules = [SegmentRule(**r) for r in segment.get("rules", [])]
            segment_data = segment
        
        segment_obj = UserSegment(
            name=segment_data.get("name", ""),
            rules=rules,
            logic=segment_data.get("logic", "AND")
        )
        query = segment_obj.to_mongo_query()
        count = await db.users.count_documents(query or {})
        
        if segment_id not in PREDEFINED_SEGMENTS:
            await db.user_segments.update_one(
                {"id": segment_id},
                {"$set": {
                    "estimated_users": count,
                    "last_calculated": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        return {"segment_id": segment_id, "estimated_users": count}
    
    # =========================================================================
    # PHASE 4: ANALYTICS WITH TIME SERIES DATA
    # =========================================================================
    
    @router.get("/admin/analytics/timeseries")
    async def get_analytics_timeseries(
        days: int = Query(30, ge=1, le=90),
        trigger_type: Optional[str] = Query(None)
    ):
        """Get time series analytics for charts"""
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        
        query = {"date": {"$gte": start_date.strftime("%Y-%m-%d")}}
        if trigger_type:
            query["trigger_type"] = trigger_type
        
        analytics = await db.notification_analytics.find(query, {"_id": 0}).sort("date", 1).to_list(1000)
        
        # Group by date
        daily_data = {}
        for record in analytics:
            date = record.get("date")
            if date not in daily_data:
                daily_data[date] = {"date": date, "sent": 0, "delivered": 0, "opened": 0, "clicked": 0, "failed": 0}
            
            daily_data[date]["sent"] += record.get("sent", 0)
            daily_data[date]["delivered"] += record.get("delivered", 0)
            daily_data[date]["opened"] += record.get("opened", 0)
            daily_data[date]["clicked"] += record.get("clicked", 0)
            daily_data[date]["failed"] += record.get("failed", 0)
        
        # Fill in missing dates
        timeseries = []
        current = start_date
        while current <= end_date:
            date_str = current.strftime("%Y-%m-%d")
            if date_str in daily_data:
                timeseries.append(daily_data[date_str])
            else:
                timeseries.append({"date": date_str, "sent": 0, "delivered": 0, "opened": 0, "clicked": 0, "failed": 0})
            current += timedelta(days=1)
        
        return timeseries
    
    @router.get("/admin/analytics/by-trigger")
    async def get_analytics_by_trigger(days: int = Query(30)):
        """Get analytics grouped by trigger type"""
        start_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
        
        analytics = await db.notification_analytics.find(
            {"date": {"$gte": start_date}}, {"_id": 0}
        ).to_list(1000)
        
        by_trigger = {}
        for record in analytics:
            trigger = record.get("trigger_type", "unknown")
            if trigger not in by_trigger:
                by_trigger[trigger] = {"trigger_type": trigger, "sent": 0, "delivered": 0, "opened": 0, "clicked": 0}
            
            by_trigger[trigger]["sent"] += record.get("sent", 0)
            by_trigger[trigger]["delivered"] += record.get("delivered", 0)
            by_trigger[trigger]["opened"] += record.get("opened", 0)
            by_trigger[trigger]["clicked"] += record.get("clicked", 0)
        
        # Calculate rates
        result = []
        for data in by_trigger.values():
            if data["sent"] > 0:
                data["open_rate"] = round((data["opened"] / data["sent"]) * 100, 1)
                data["click_rate"] = round((data["clicked"] / data["sent"]) * 100, 1)
            else:
                data["open_rate"] = 0
                data["click_rate"] = 0
            result.append(data)
        
        return sorted(result, key=lambda x: x["sent"], reverse=True)
    
    @router.get("/admin/analytics/by-channel")
    async def get_analytics_by_channel(days: int = Query(30)):
        """Get analytics grouped by channel"""
        start_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
        
        analytics = await db.notification_analytics.find(
            {"date": {"$gte": start_date}}, {"_id": 0}
        ).to_list(1000)
        
        by_channel = {}
        for record in analytics:
            channel = record.get("channel", "unknown")
            if channel not in by_channel:
                by_channel[channel] = {"channel": channel, "sent": 0, "delivered": 0, "opened": 0, "clicked": 0}
            
            by_channel[channel]["sent"] += record.get("sent", 0)
            by_channel[channel]["delivered"] += record.get("delivered", 0)
            by_channel[channel]["opened"] += record.get("opened", 0)
            by_channel[channel]["clicked"] += record.get("clicked", 0)
        
        result = []
        for data in by_channel.values():
            if data["sent"] > 0:
                data["delivery_rate"] = round((data["delivered"] / data["sent"]) * 100, 1)
                data["open_rate"] = round((data["opened"] / data["sent"]) * 100, 1)
            else:
                data["delivery_rate"] = 0
                data["open_rate"] = 0
            result.append(data)
        
        return result
    
    # =========================================================================
    # PHASE 4: CAMPAIGN SCHEDULER STATUS
    # =========================================================================
    
    @router.get("/admin/scheduler/status")
    async def get_scheduler_status():
        """Get campaign scheduler status"""
        # Get scheduled campaigns due to be sent
        now = datetime.now(timezone.utc).isoformat()
        due_campaigns = await db.scheduled_campaigns.count_documents({
            "status": "scheduled",
            "scheduled_at": {"$lte": now}
        })
        
        scheduled_campaigns = await db.scheduled_campaigns.count_documents({"status": "scheduled"})
        sent_today = await db.scheduled_campaigns.count_documents({
            "status": "sent",
            "sent_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()}
        })
        
        return {
            "scheduler_running": service.is_running,
            "due_campaigns": due_campaigns,
            "scheduled_campaigns": scheduled_campaigns,
            "sent_today": sent_today,
            "fcm_enabled": FCM_ENABLED,
            "sendgrid_enabled": sendgrid_client is not None,
            "last_check": datetime.now(timezone.utc).isoformat()
        }
    
    @router.post("/admin/scheduler/process-due")
    async def process_due_campaigns():
        """Process all due campaigns"""
        now = datetime.now(timezone.utc).isoformat()
        due_campaigns = await db.scheduled_campaigns.find({
            "status": "scheduled",
            "scheduled_at": {"$lte": now}
        }).to_list(100)
        
        results = []
        for campaign in due_campaigns:
            sent_count = await service._send_campaign(campaign)
            await db.scheduled_campaigns.update_one(
                {"id": campaign["id"]},
                {"$set": {
                    "status": "sent",
                    "sent_at": now,
                    "sent_count": sent_count
                }}
            )
            results.append({"campaign_id": campaign["id"], "sent_count": sent_count})
        
        return {"processed": len(results), "campaigns": results}
    
    # =========================================================================
    # PHASE 5: MULTI-LANGUAGE TEMPLATES (i18n)
    # =========================================================================
    
    @router.get("/admin/languages")
    async def get_supported_languages():
        """Get all supported languages"""
        return SUPPORTED_LANGUAGES
    
    @router.get("/admin/ml-templates")
    async def get_ml_templates():
        """Get all multi-language templates"""
        # Get custom templates from DB
        custom_templates = await db.ml_templates.find({}, {"_id": 0}).to_list(100)
        
        # Convert default templates to list format
        default_templates = []
        for template_id, template_data in DEFAULT_ML_TEMPLATES.items():
            default_templates.append({
                "id": template_id,
                "is_default": True,
                **template_data
            })
        
        return default_templates + custom_templates
    
    @router.get("/admin/ml-templates/{template_id}")
    async def get_ml_template(template_id: str):
        """Get a specific multi-language template"""
        # Check defaults first
        if template_id in DEFAULT_ML_TEMPLATES:
            return {"id": template_id, "is_default": True, **DEFAULT_ML_TEMPLATES[template_id]}
        
        template = await db.ml_templates.find_one({"id": template_id}, {"_id": 0})
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        return template
    
    @router.post("/admin/ml-templates")
    async def create_ml_template(template_data: Dict[str, Any] = Body(...)):
        """Create a new multi-language template"""
        template = {
            "id": f"mlt_{uuid.uuid4().hex[:12]}",
            "name": template_data.get("name", ""),
            "description": template_data.get("description", ""),
            "trigger_type": template_data.get("trigger_type", ""),
            "default_language": template_data.get("default_language", DEFAULT_LANGUAGE),
            "translations": template_data.get("translations", {}),
            "channels": template_data.get("channels", ["push", "email", "in_app"]),
            "variables": template_data.get("variables", []),
            "is_active": True,
            "version": 1,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.ml_templates.insert_one(template)
        return {k: v for k, v in template.items() if k != "_id"}
    
    @router.put("/admin/ml-templates/{template_id}")
    async def update_ml_template(template_id: str, updates: Dict[str, Any] = Body(...)):
        """Update a multi-language template"""
        if template_id in DEFAULT_ML_TEMPLATES:
            raise HTTPException(status_code=400, detail="Cannot modify default templates")
        
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        updates["$inc"] = {"version": 1}
        
        # Separate $inc from $set
        set_updates = {k: v for k, v in updates.items() if k != "$inc"}
        
        await db.ml_templates.update_one(
            {"id": template_id},
            {"$set": set_updates, "$inc": {"version": 1}}
        )
        return await db.ml_templates.find_one({"id": template_id}, {"_id": 0})
    
    @router.delete("/admin/ml-templates/{template_id}")
    async def delete_ml_template(template_id: str):
        """Delete a multi-language template"""
        if template_id in DEFAULT_ML_TEMPLATES:
            raise HTTPException(status_code=400, detail="Cannot delete default templates")
        
        result = await db.ml_templates.delete_one({"id": template_id})
        return {"success": result.deleted_count > 0}
    
    @router.post("/admin/ml-templates/{template_id}/add-language")
    async def add_template_language(
        template_id: str,
        language: str = Body(...),
        content: Dict[str, str] = Body(...)
    ):
        """Add a language translation to a template"""
        if template_id in DEFAULT_ML_TEMPLATES:
            raise HTTPException(status_code=400, detail="Cannot modify default templates")
        
        if language not in SUPPORTED_LANGUAGES:
            raise HTTPException(status_code=400, detail=f"Language '{language}' not supported")
        
        await db.ml_templates.update_one(
            {"id": template_id},
            {
                "$set": {
                    f"translations.{language}": content,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        return await db.ml_templates.find_one({"id": template_id}, {"_id": 0})
    
    @router.delete("/admin/ml-templates/{template_id}/language/{language}")
    async def remove_template_language(template_id: str, language: str):
        """Remove a language translation from a template"""
        if template_id in DEFAULT_ML_TEMPLATES:
            raise HTTPException(status_code=400, detail="Cannot modify default templates")
        
        await db.ml_templates.update_one(
            {"id": template_id},
            {
                "$unset": {f"translations.{language}": ""},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        return await db.ml_templates.find_one({"id": template_id}, {"_id": 0})
    
    @router.post("/admin/ml-templates/preview")
    async def preview_ml_template(
        template_id: str = Body(...),
        language: str = Body(DEFAULT_LANGUAGE),
        variables: Dict[str, str] = Body({})
    ):
        """Preview a multi-language template with sample data"""
        # Get template
        if template_id in DEFAULT_ML_TEMPLATES:
            template_data = DEFAULT_ML_TEMPLATES[template_id]
            translations = template_data.get("translations", {})
        else:
            template = await db.ml_templates.find_one({"id": template_id})
            if not template:
                raise HTTPException(status_code=404, detail="Template not found")
            translations = template.get("translations", {})
        
        # Get content for language
        content = translations.get(language, translations.get(DEFAULT_LANGUAGE, {}))
        
        # Sample variables
        sample_vars = {
            "user_name": "John",
            "category_name": "Electronics",
            "listing_title": "iPhone 15 Pro Max",
            "price": "899",
            "old_price": "999",
            "currency": "€",
            "drop_percent": "10",
            "savings": "100",
            "location": "Dublin",
            "sender_name": "Sarah",
            "message_preview": "Hi, is this available?",
            "new_listings_count": "12",
            "price_drops_count": "3",
            **variables
        }
        
        # Render templates
        def render(text: str) -> str:
            result = text
            for key, value in sample_vars.items():
                result = result.replace(f"{{{{{key}}}}}", str(value))
            return result
        
        return {
            "language": language,
            "title": render(content.get("title", "")),
            "body": render(content.get("body", "")),
            "subject": render(content.get("subject", "")) if content.get("subject") else None,
            "variables_used": sample_vars
        }
    
    # =========================================================================
    # PHASE 5: CAMPAIGN SCHEDULER AUTOMATION
    # =========================================================================
    
    @router.get("/admin/scheduler/config")
    async def get_scheduler_config():
        """Get campaign scheduler configuration"""
        config = await db.campaign_scheduler_config.find_one({"id": "campaign_scheduler_config"})
        if not config:
            config = CampaignSchedulerConfig().model_dump()
            await db.campaign_scheduler_config.insert_one(config)
        return {k: v for k, v in config.items() if k != "_id"}
    
    @router.put("/admin/scheduler/config")
    async def update_scheduler_config(updates: Dict[str, Any] = Body(...)):
        """Update campaign scheduler configuration"""
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.campaign_scheduler_config.update_one(
            {"id": "campaign_scheduler_config"},
            {"$set": updates},
            upsert=True
        )
        return await db.campaign_scheduler_config.find_one({"id": "campaign_scheduler_config"}, {"_id": 0})
    
    @router.post("/admin/scheduler/start")
    async def start_scheduler():
        """Start the campaign scheduler"""
        if not service.is_running:
            service.start(interval=30)
            return {"message": "Scheduler started", "status": "running"}
        return {"message": "Scheduler already running", "status": "running"}
    
    @router.post("/admin/scheduler/stop")
    async def stop_scheduler():
        """Stop the campaign scheduler"""
        service.stop()
        return {"message": "Scheduler stopped", "status": "stopped"}
    
    @router.get("/admin/scheduler/logs")
    async def get_scheduler_logs(limit: int = Query(50)):
        """Get recent scheduler logs"""
        logs = await db.scheduler_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
        return logs
    
    @router.post("/admin/scheduler/reset-daily-stats")
    async def reset_daily_stats():
        """Reset daily scheduler statistics"""
        await db.campaign_scheduler_config.update_one(
            {"id": "campaign_scheduler_config"},
            {"$set": {
                "campaigns_processed_today": 0,
                "notifications_sent_today": 0,
                "last_reset": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"message": "Daily stats reset", "reset_at": datetime.now(timezone.utc).isoformat()}
    
    return router, service
