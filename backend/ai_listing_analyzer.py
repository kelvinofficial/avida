"""
AI Listing Analyzer Service
Analyzes uploaded listing photos and suggests titles, descriptions, and attributes
Uses OpenAI GPT-4o for vision analysis and Claude Sonnet 4.5 for text generation
"""

import os
import re
import json
import uuid
import hashlib
import base64
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


# =============================================================================
# MODELS
# =============================================================================

class AIAnalysisResult(BaseModel):
    """Result of AI analysis on listing photos"""
    id: str = Field(default_factory=lambda: f"ai_{uuid.uuid4().hex[:12]}")
    
    # Detected information
    detected_category: Optional[str] = None
    detected_subcategory: Optional[str] = None
    detected_object_type: Optional[str] = None
    detected_brand: Optional[str] = None
    detected_model: Optional[str] = None
    detected_color: Optional[str] = None
    detected_condition: Optional[str] = None  # new, like_new, good, fair, poor
    detected_features: List[str] = Field(default_factory=list)
    
    # Suggested content
    suggested_title: Optional[str] = None
    suggested_description: Optional[str] = None
    suggested_attributes: Dict[str, Any] = Field(default_factory=dict)
    
    # Metadata
    confidence_score: float = 0.0
    image_hashes: List[str] = Field(default_factory=list)
    raw_vision_response: Optional[str] = None
    processing_time_ms: int = 0
    
    # Status
    status: str = "pending"  # pending, completed, failed
    error: Optional[str] = None
    
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class AIUsageLog(BaseModel):
    """Log of AI usage for analytics and rate limiting"""
    id: str = Field(default_factory=lambda: f"ailog_{uuid.uuid4().hex[:12]}")
    user_id: str
    analysis_id: str
    
    # Usage details
    images_analyzed: int = 0
    vision_tokens_used: int = 0
    text_tokens_used: int = 0
    
    # Result
    was_accepted: bool = False
    was_edited: bool = False
    was_rejected: bool = False
    
    # Timing
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None


class AISettings(BaseModel):
    """Admin settings for AI analysis feature"""
    id: str = "ai_settings_global"
    
    # Global toggle
    enabled: bool = True
    
    # Category-specific settings
    enabled_categories: List[str] = Field(default_factory=list)  # Empty = all enabled
    disabled_categories: List[str] = Field(default_factory=list)
    
    # Country-specific settings
    enabled_countries: List[str] = Field(default_factory=list)  # Empty = all enabled
    disabled_countries: List[str] = Field(default_factory=list)
    
    # Usage limits
    max_uses_per_day_free: int = 3
    max_uses_per_day_verified: int = 10
    max_uses_per_day_premium: int = 50
    max_images_per_analysis: int = 5
    
    # Access restrictions
    require_verified_email: bool = False
    require_verified_phone: bool = False
    allow_free_users: bool = True
    
    # Content settings
    enable_price_suggestions: bool = False
    enable_category_suggestions: bool = True
    
    # System prompt (editable by admin)
    vision_system_prompt: str = """You are an expert product analyst for an online marketplace. 
Analyze the provided product images and extract detailed information.

Your task is to identify:
1. Product category and subcategory
2. Object type (specific item name)
3. Brand and model (if visible)
4. Color(s)
5. Condition (new, like_new, good, fair, poor)
6. Visible features, accessories, or defects

Be factual and objective. Do not make claims about:
- Warranties or guarantees
- Authenticity unless clearly visible
- Price or value

Respond in JSON format with this structure:
{
    "category": "Electronics",
    "subcategory": "Phones & Tablets",
    "object_type": "Smartphone",
    "brand": "Samsung",
    "model": "Galaxy S21",
    "colors": ["Phantom Black"],
    "condition": "good",
    "condition_notes": "Minor scratches on screen, back in excellent condition",
    "features": ["128GB storage", "Dual camera", "5G capable"],
    "visible_defects": ["Small scratch on screen corner"],
    "accessories_included": ["Charger visible", "Original box"],
    "confidence": 0.85
}"""

    text_system_prompt: str = """You are an expert copywriter for an online marketplace.
Based on the product analysis provided, create compelling listing content.

Guidelines:
- Title: SEO-friendly, 60 characters max, include brand/model/key feature
- Description: 4-6 bullet points or short paragraph, factual tone
- Do NOT mention price or make guarantees
- Do NOT claim authenticity unless verified
- Highlight positive features while being honest about condition

Respond in JSON format:
{
    "title": "Samsung Galaxy S21 128GB - Excellent Condition, 5G Ready",
    "description": "• Samsung Galaxy S21 smartphone with 128GB storage\\n• 5G connectivity for ultra-fast speeds\\n• Dual camera system for stunning photos\\n• Minor cosmetic wear, fully functional\\n• Includes original charger",
    "attributes": {
        "brand": "Samsung",
        "model": "Galaxy S21",
        "storage": "128GB",
        "color": "Phantom Black",
        "condition": "Good",
        "network": "5G"
    }
}"""
    
    # Safety settings
    profanity_filter_enabled: bool = True
    policy_compliance_filter: bool = True
    blocked_terms: List[str] = Field(default_factory=lambda: [
        "guarantee", "warranty", "authentic", "original", "genuine",
        "100%", "brand new" # unless actually new
    ])
    
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_by: Optional[str] = None


# =============================================================================
# AI LISTING ANALYZER SERVICE
# =============================================================================

class AIListingAnalyzer:
    """
    AI-powered listing photo analyzer
    Uses OpenAI GPT-4o for vision and Claude Sonnet 4.5 for text generation
    """
    
    def __init__(self, db):
        self.db = db
        self.api_key = os.environ.get("EMERGENT_LLM_KEY", "")
        self._cache = {}  # In-memory cache for image hash results
        
    async def initialize_settings(self):
        """Initialize default AI settings if not exist"""
        existing = await self.db.ai_settings.find_one({"id": "ai_settings_global"})
        if not existing:
            settings = AISettings()
            await self.db.ai_settings.insert_one(settings.model_dump())
            logger.info("AI settings initialized with defaults")
    
    async def get_settings(self) -> Dict:
        """Get current AI settings"""
        settings = await self.db.ai_settings.find_one({"id": "ai_settings_global"}, {"_id": 0})
        if not settings:
            await self.initialize_settings()
            settings = await self.db.ai_settings.find_one({"id": "ai_settings_global"}, {"_id": 0})
        return settings
    
    async def update_settings(self, updates: Dict, admin_id: str) -> Dict:
        """Update AI settings"""
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        updates["updated_by"] = admin_id
        await self.db.ai_settings.update_one(
            {"id": "ai_settings_global"},
            {"$set": updates}
        )
        return await self.get_settings()
    
    # =========================================================================
    # RATE LIMITING & ACCESS CONTROL
    # =========================================================================
    
    async def check_user_access(self, user_id: str, user_data: Optional[Dict] = None) -> Dict:
        """Check if user can use AI analysis"""
        settings = await self.get_settings()
        
        if not settings.get("enabled", True):
            return {"allowed": False, "reason": "AI analysis is currently disabled"}
        
        # Get user data if not provided
        if not user_data:
            user_data = await self.db.users.find_one({"user_id": user_id})
        
        if not user_data:
            return {"allowed": False, "reason": "User not found"}
        
        # Check verification requirements
        if settings.get("require_verified_email") and not user_data.get("email_verified"):
            return {"allowed": False, "reason": "Email verification required"}
        
        if settings.get("require_verified_phone") and not user_data.get("phone_verified"):
            return {"allowed": False, "reason": "Phone verification required"}
        
        # Check user tier and limits
        is_premium = user_data.get("is_premium", False)
        is_verified = user_data.get("verified", False) or user_data.get("is_verified_seller", False)
        
        if not settings.get("allow_free_users", True) and not is_premium and not is_verified:
            return {"allowed": False, "reason": "AI analysis is only available for verified or premium users"}
        
        # Determine daily limit
        if is_premium:
            daily_limit = settings.get("max_uses_per_day_premium", 50)
        elif is_verified:
            daily_limit = settings.get("max_uses_per_day_verified", 10)
        else:
            daily_limit = settings.get("max_uses_per_day_free", 3)
        
        # Check today's usage
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_usage = await self.db.ai_usage_logs.count_documents({
            "user_id": user_id,
            "created_at": {"$gte": today_start.isoformat()}
        })
        
        if today_usage >= daily_limit:
            return {
                "allowed": False,
                "reason": f"Daily limit reached ({daily_limit} analyses per day)",
                "uses_today": today_usage,
                "daily_limit": daily_limit,
                "resets_at": (today_start + timedelta(days=1)).isoformat()
            }
        
        return {
            "allowed": True,
            "uses_today": today_usage,
            "daily_limit": daily_limit,
            "remaining": daily_limit - today_usage
        }
    
    async def check_category_enabled(self, category: str) -> bool:
        """Check if AI is enabled for a category"""
        settings = await self.get_settings()
        
        if not settings.get("enable_category_suggestions", True):
            return False
        
        disabled = settings.get("disabled_categories", [])
        if category in disabled:
            return False
        
        enabled = settings.get("enabled_categories", [])
        if enabled and category not in enabled:
            return False
        
        return True
    
    # =========================================================================
    # IMAGE ANALYSIS
    # =========================================================================
    
    def _compute_image_hash(self, image_base64: str) -> str:
        """Compute hash of image for caching"""
        return hashlib.sha256(image_base64.encode()).hexdigest()[:16]
    
    async def _check_cache(self, image_hashes: List[str]) -> Optional[Dict]:
        """Check if we have cached results for these images"""
        cache_key = "_".join(sorted(image_hashes))
        
        # Check in-memory cache first
        if cache_key in self._cache:
            cached = self._cache[cache_key]
            # Cache expires after 1 hour
            if datetime.fromisoformat(cached["cached_at"]) > datetime.now(timezone.utc) - timedelta(hours=1):
                logger.info(f"Cache hit for images: {cache_key[:20]}...")
                return cached["result"]
        
        # Check database cache
        cached = await self.db.ai_cache.find_one({
            "cache_key": cache_key,
            "cached_at": {"$gte": (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()}
        }, {"_id": 0})
        
        if cached:
            self._cache[cache_key] = cached
            logger.info(f"DB cache hit for images: {cache_key[:20]}...")
            return cached.get("result")
        
        return None
    
    async def _save_cache(self, image_hashes: List[str], result: Dict):
        """Save analysis result to cache"""
        cache_key = "_".join(sorted(image_hashes))
        cache_entry = {
            "cache_key": cache_key,
            "result": result,
            "cached_at": datetime.now(timezone.utc).isoformat()
        }
        
        self._cache[cache_key] = cache_entry
        await self.db.ai_cache.update_one(
            {"cache_key": cache_key},
            {"$set": cache_entry},
            upsert=True
        )
    
    async def analyze_images(
        self,
        images_base64: List[str],
        user_id: str,
        category_hint: Optional[str] = None
    ) -> Dict:
        """
        Analyze listing images and generate suggestions
        
        Args:
            images_base64: List of base64-encoded images
            user_id: ID of user making the request
            category_hint: Optional category hint from user
        
        Returns:
            AIAnalysisResult with suggestions
        """
        start_time = datetime.now(timezone.utc)
        
        # Check user access
        access = await self.check_user_access(user_id)
        if not access["allowed"]:
            return {
                "success": False,
                "error": access["reason"],
                "access_info": access
            }
        
        # Limit number of images
        settings = await self.get_settings()
        max_images = settings.get("max_images_per_analysis", 5)
        images_to_analyze = images_base64[:max_images]
        
        # Compute image hashes
        image_hashes = [self._compute_image_hash(img) for img in images_to_analyze]
        
        # Check cache
        cached_result = await self._check_cache(image_hashes)
        if cached_result:
            # Log usage even for cached results
            await self._log_usage(user_id, cached_result.get("id", "cached"), len(images_to_analyze))
            return {"success": True, "result": cached_result, "from_cache": True}
        
        # Create analysis result
        result = AIAnalysisResult(image_hashes=image_hashes)
        
        try:
            # Step 1: Vision analysis with GPT-4o
            vision_result = await self._analyze_with_vision(images_to_analyze, settings, category_hint)
            
            if not vision_result.get("success"):
                result.status = "failed"
                result.error = vision_result.get("error", "Vision analysis failed")
                return {"success": False, "error": result.error, "result": result.model_dump()}
            
            # Parse vision response
            vision_data = vision_result.get("data", {})
            result.detected_category = vision_data.get("category")
            result.detected_subcategory = vision_data.get("subcategory")
            result.detected_object_type = vision_data.get("object_type")
            result.detected_brand = vision_data.get("brand")
            result.detected_model = vision_data.get("model")
            result.detected_color = ", ".join(vision_data.get("colors", [])) if vision_data.get("colors") else None
            result.detected_condition = vision_data.get("condition")
            result.detected_features = vision_data.get("features", [])
            result.confidence_score = vision_data.get("confidence", 0.5)
            result.raw_vision_response = json.dumps(vision_data)
            
            # Step 2: Text generation with Claude Sonnet 4.5
            text_result = await self._generate_listing_content(vision_data, settings, category_hint)
            
            if text_result.get("success"):
                text_data = text_result.get("data", {})
                result.suggested_title = text_data.get("title")
                result.suggested_description = text_data.get("description")
                result.suggested_attributes = text_data.get("attributes", {})
            
            # Apply safety filters
            result = await self._apply_safety_filters(result, settings)
            
            # Update status
            result.status = "completed"
            processing_time = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
            result.processing_time_ms = int(processing_time)
            
            # Save to cache
            await self._save_cache(image_hashes, result.model_dump())
            
            # Log usage
            await self._log_usage(user_id, result.id, len(images_to_analyze))
            
            return {"success": True, "result": result.model_dump(), "from_cache": False}
            
        except Exception as e:
            logger.error(f"AI analysis error: {e}")
            result.status = "failed"
            result.error = str(e)
            return {"success": False, "error": str(e), "result": result.model_dump()}
    
    async def _analyze_with_vision(
        self,
        images_base64: List[str],
        settings: Dict,
        category_hint: Optional[str] = None
    ) -> Dict:
        """Analyze images using GPT-4o vision"""
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
            
            # Create vision chat instance
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"vision_{uuid.uuid4().hex[:8]}",
                system_message=settings.get("vision_system_prompt", "You are a product analyst.")
            ).with_model("openai", "gpt-4o")
            
            # Prepare image contents
            image_contents = [ImageContent(image_base64=img) for img in images_base64]
            
            # Build prompt
            prompt = "Analyze these product images and extract detailed information."
            if category_hint:
                prompt += f"\nHint: The user indicates this might be in the '{category_hint}' category."
            prompt += "\nRespond with a JSON object as specified in the system prompt."
            
            # Send message with images
            user_message = UserMessage(
                text=prompt,
                image_contents=image_contents
            )
            
            response = await chat.send_message(user_message)
            
            # Parse JSON from response
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                data = json.loads(json_match.group())
                return {"success": True, "data": data}
            else:
                return {"success": False, "error": "Could not parse vision response"}
            
        except Exception as e:
            logger.error(f"Vision analysis error: {e}")
            return {"success": False, "error": str(e)}
    
    async def _generate_listing_content(
        self,
        vision_data: Dict,
        settings: Dict,
        category_hint: Optional[str] = None
    ) -> Dict:
        """Generate listing title and description using Claude Sonnet 4.5"""
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            
            # Create text generation chat instance
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"text_{uuid.uuid4().hex[:8]}",
                system_message=settings.get("text_system_prompt", "You are a copywriter.")
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")
            
            # Build prompt with vision analysis results
            prompt = f"""Based on this product analysis, create a compelling listing:

Product Analysis:
- Category: {vision_data.get('category', 'Unknown')}
- Subcategory: {vision_data.get('subcategory', 'Unknown')}
- Type: {vision_data.get('object_type', 'Unknown')}
- Brand: {vision_data.get('brand', 'Unknown')}
- Model: {vision_data.get('model', 'Unknown')}
- Colors: {', '.join(vision_data.get('colors', ['Unknown']))}
- Condition: {vision_data.get('condition', 'Unknown')}
- Condition Notes: {vision_data.get('condition_notes', 'N/A')}
- Features: {', '.join(vision_data.get('features', []))}
- Visible Defects: {', '.join(vision_data.get('visible_defects', []))}
- Accessories: {', '.join(vision_data.get('accessories_included', []))}

Generate a JSON response with title, description, and attributes."""

            if category_hint:
                prompt += f"\nNote: User selected category '{category_hint}'"
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            # Parse JSON from response
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                data = json.loads(json_match.group())
                return {"success": True, "data": data}
            else:
                # Fallback: create basic content
                return {
                    "success": True,
                    "data": {
                        "title": self._generate_fallback_title(vision_data),
                        "description": self._generate_fallback_description(vision_data),
                        "attributes": self._extract_attributes(vision_data)
                    }
                }
            
        except Exception as e:
            logger.error(f"Text generation error: {e}")
            # Return fallback content
            return {
                "success": True,
                "data": {
                    "title": self._generate_fallback_title(vision_data),
                    "description": self._generate_fallback_description(vision_data),
                    "attributes": self._extract_attributes(vision_data)
                }
            }
    
    def _generate_fallback_title(self, vision_data: Dict) -> str:
        """Generate fallback title from vision data"""
        parts = []
        if vision_data.get("brand"):
            parts.append(vision_data["brand"])
        if vision_data.get("model"):
            parts.append(vision_data["model"])
        if not parts and vision_data.get("object_type"):
            parts.append(vision_data["object_type"])
        if vision_data.get("condition"):
            condition_map = {
                "new": "Brand New",
                "like_new": "Like New",
                "good": "Good Condition",
                "fair": "Fair Condition",
                "poor": "For Parts/Repair"
            }
            parts.append(condition_map.get(vision_data["condition"], ""))
        
        return " - ".join(filter(None, parts))[:60] or "Item for Sale"
    
    def _generate_fallback_description(self, vision_data: Dict) -> str:
        """Generate fallback description from vision data"""
        bullets = []
        
        if vision_data.get("brand") and vision_data.get("model"):
            bullets.append(f"• {vision_data['brand']} {vision_data['model']}")
        elif vision_data.get("object_type"):
            bullets.append(f"• {vision_data['object_type']}")
        
        if vision_data.get("colors"):
            bullets.append(f"• Color: {', '.join(vision_data['colors'])}")
        
        if vision_data.get("condition_notes"):
            bullets.append(f"• Condition: {vision_data['condition_notes']}")
        
        for feature in vision_data.get("features", [])[:3]:
            bullets.append(f"• {feature}")
        
        return "\n".join(bullets) or "Item available for sale. Contact for details."
    
    def _extract_attributes(self, vision_data: Dict) -> Dict:
        """Extract structured attributes from vision data"""
        attrs = {}
        
        if vision_data.get("brand"):
            attrs["brand"] = vision_data["brand"]
        if vision_data.get("model"):
            attrs["model"] = vision_data["model"]
        if vision_data.get("colors"):
            attrs["color"] = vision_data["colors"][0] if isinstance(vision_data["colors"], list) else vision_data["colors"]
        if vision_data.get("condition"):
            attrs["condition"] = vision_data["condition"]
        
        return attrs
    
    async def _apply_safety_filters(self, result: AIAnalysisResult, settings: Dict) -> AIAnalysisResult:
        """Apply safety filters to generated content"""
        blocked_terms = settings.get("blocked_terms", [])
        
        def filter_text(text: str) -> str:
            if not text:
                return text
            filtered = text
            for term in blocked_terms:
                # Only block if not contextually appropriate
                pattern = re.compile(rf'\b{re.escape(term)}\b', re.IGNORECASE)
                filtered = pattern.sub('', filtered)
            return filtered.strip()
        
        # Filter title
        if result.suggested_title:
            result.suggested_title = filter_text(result.suggested_title)
        
        # Filter description
        if result.suggested_description:
            result.suggested_description = filter_text(result.suggested_description)
        
        return result
    
    async def _log_usage(self, user_id: str, analysis_id: str, image_count: int):
        """Log AI usage for analytics"""
        log = AIUsageLog(
            user_id=user_id,
            analysis_id=analysis_id,
            images_analyzed=image_count
        )
        await self.db.ai_usage_logs.insert_one(log.model_dump())
    
    async def update_usage_result(self, analysis_id: str, accepted: bool, edited: bool, rejected: bool):
        """Update usage log with user's action"""
        await self.db.ai_usage_logs.update_one(
            {"analysis_id": analysis_id},
            {"$set": {
                "was_accepted": accepted,
                "was_edited": edited,
                "was_rejected": rejected,
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    # =========================================================================
    # ANALYTICS
    # =========================================================================
    
    async def get_usage_analytics(self, days: int = 30) -> Dict:
        """Get AI usage analytics"""
        start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        
        # Total calls
        total_calls = await self.db.ai_usage_logs.count_documents({
            "created_at": {"$gte": start_date}
        })
        
        # Acceptance rate
        pipeline = [
            {"$match": {"created_at": {"$gte": start_date}}},
            {"$group": {
                "_id": None,
                "total": {"$sum": 1},
                "accepted": {"$sum": {"$cond": ["$was_accepted", 1, 0]}},
                "edited": {"$sum": {"$cond": ["$was_edited", 1, 0]}},
                "rejected": {"$sum": {"$cond": ["$was_rejected", 1, 0]}},
                "total_images": {"$sum": "$images_analyzed"}
            }}
        ]
        
        agg_result = await self.db.ai_usage_logs.aggregate(pipeline).to_list(1)
        stats = agg_result[0] if agg_result else {
            "total": 0, "accepted": 0, "edited": 0, "rejected": 0, "total_images": 0
        }
        
        # Daily breakdown
        daily_pipeline = [
            {"$match": {"created_at": {"$gte": start_date}}},
            {"$addFields": {
                "date": {"$substr": ["$created_at", 0, 10]}
            }},
            {"$group": {
                "_id": "$date",
                "calls": {"$sum": 1},
                "images": {"$sum": "$images_analyzed"}
            }},
            {"$sort": {"_id": 1}}
        ]
        daily = await self.db.ai_usage_logs.aggregate(daily_pipeline).to_list(days)
        
        # Cache stats
        cache_count = await self.db.ai_cache.count_documents({})
        
        return {
            "period_days": days,
            "total_calls": total_calls,
            "total_images_analyzed": stats.get("total_images", 0),
            "acceptance_rate": round(stats["accepted"] / stats["total"] * 100, 1) if stats["total"] > 0 else 0,
            "edit_rate": round(stats["edited"] / stats["total"] * 100, 1) if stats["total"] > 0 else 0,
            "rejection_rate": round(stats["rejected"] / stats["total"] * 100, 1) if stats["total"] > 0 else 0,
            "pending_rate": round((stats["total"] - stats["accepted"] - stats["edited"] - stats["rejected"]) / stats["total"] * 100, 1) if stats["total"] > 0 else 0,
            "daily_breakdown": [{"date": d["_id"], "calls": d["calls"], "images": d["images"]} for d in daily],
            "cache_entries": cache_count
        }


# =============================================================================
# ROUTER
# =============================================================================

def create_ai_analyzer_router(db, get_current_user):
    """Create AI analyzer router"""
    from fastapi import APIRouter, HTTPException, Body, Query, Depends
    
    router = APIRouter(prefix="/ai-analyzer", tags=["AI Analyzer"])
    analyzer = AIListingAnalyzer(db)
    
    @router.on_event("startup")
    async def startup():
        await analyzer.initialize_settings()
    
    # =========================================================================
    # USER ENDPOINTS
    # =========================================================================
    
    @router.post("/analyze")
    async def analyze_listing_photos(
        images: List[str] = Body(..., description="List of base64-encoded images"),
        category_hint: Optional[str] = Body(None, description="Optional category hint"),
        user_id: str = Body(..., description="User ID")
    ):
        """Analyze listing photos and get AI suggestions"""
        result = await analyzer.analyze_images(images, user_id, category_hint)
        return result
    
    @router.get("/check-access/{user_id}")
    async def check_user_access(user_id: str):
        """Check if user can use AI analysis"""
        return await analyzer.check_user_access(user_id)
    
    @router.post("/feedback")
    async def submit_feedback(
        analysis_id: str = Body(...),
        accepted: bool = Body(False),
        edited: bool = Body(False),
        rejected: bool = Body(False)
    ):
        """Submit feedback on AI suggestions"""
        await analyzer.update_usage_result(analysis_id, accepted, edited, rejected)
        return {"success": True}
    
    # =========================================================================
    # ADMIN ENDPOINTS
    # =========================================================================
    
    @router.get("/admin/settings")
    async def get_ai_settings():
        """Get AI analyzer settings (admin)"""
        return await analyzer.get_settings()
    
    @router.put("/admin/settings")
    async def update_ai_settings(
        updates: Dict = Body(...),
        admin_id: str = Body("admin")
    ):
        """Update AI analyzer settings (admin)"""
        return await analyzer.update_settings(updates, admin_id)
    
    @router.get("/admin/analytics")
    async def get_ai_analytics(days: int = Query(30)):
        """Get AI usage analytics (admin)"""
        return await analyzer.get_usage_analytics(days)
    
    @router.post("/admin/clear-cache")
    async def clear_ai_cache():
        """Clear AI analysis cache (admin)"""
        result = await db.ai_cache.delete_many({})
        analyzer._cache.clear()
        return {"success": True, "deleted": result.deleted_count}
    
    return router, analyzer
