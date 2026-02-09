"""
Chat Moderation System
AI-powered and manual moderation for conversations and messages
"""

import os
import re
import uuid
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from enum import Enum
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

# =============================================================================
# ENUMS AND CONSTANTS
# =============================================================================

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ModerationReasonTag(str, Enum):
    FRAUD = "fraud"
    SCAM = "scam"
    ABUSE = "abuse"
    HARASSMENT = "harassment"
    PROFANITY = "profanity"
    OFF_PLATFORM_PAYMENT = "off_platform_payment"
    CONTACT_BYPASS = "contact_bypass"
    SPAM = "spam"
    FAKE_LISTING = "fake_listing"
    SUSPICIOUS_PATTERN = "suspicious_pattern"
    OTHER = "other"

class ModerationActionType(str, Enum):
    DELETE_MESSAGE = "delete_message"
    HIDE_MESSAGE = "hide_message"
    FREEZE_CONVERSATION = "freeze_conversation"
    UNFREEZE_CONVERSATION = "unfreeze_conversation"
    DISABLE_CHAT_FOR_LISTING = "disable_chat_for_listing"
    ENABLE_CHAT_FOR_LISTING = "enable_chat_for_listing"
    MUTE_USER = "mute_user"
    UNMUTE_USER = "unmute_user"
    BAN_USER = "ban_user"
    UNBAN_USER = "unban_user"
    ADD_NOTE = "add_note"
    DISMISS_FLAG = "dismiss_flag"
    ESCALATE = "escalate"
    LOCK_ESCROW = "lock_escrow"
    WARN_USER = "warn_user"

class ReportReason(str, Enum):
    SCAM = "scam"
    ABUSE = "abuse"
    FAKE_LISTING = "fake_listing"
    OFF_PLATFORM_PAYMENT = "off_platform_payment"
    HARASSMENT = "harassment"
    SPAM = "spam"
    OTHER = "other"

class ConversationStatus(str, Enum):
    ACTIVE = "active"
    FROZEN = "frozen"
    UNDER_REVIEW = "under_review"
    CHAT_DISABLED = "chat_disabled"

class UserChatStatus(str, Enum):
    ACTIVE = "active"
    MUTED = "muted"
    BANNED = "banned"

# Default keyword blacklists
DEFAULT_SCAM_KEYWORDS = [
    "western union", "moneygram", "wire transfer", "gift card",
    "pay outside", "pay directly", "send money first", "upfront payment",
    "shipping fee separate", "customs clearance fee", "release fee",
    "lucky winner", "inheritance", "lottery winner", "claim prize"
]

DEFAULT_PROFANITY_KEYWORDS = [
    # Add profanity words as needed - keeping minimal for example
]

DEFAULT_CONTACT_PATTERNS = [
    r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b',  # Phone number formats
    r'\b\d{10,}\b',  # 10+ digit numbers
    r'\b[\w.-]+@[\w.-]+\.\w{2,}\b',  # Email addresses
    r'\b(?:whatsapp|telegram|signal|viber)[\s:]+[\d+]+\b',  # Messaging app numbers
]

# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class ModerationFlag(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    message_id: Optional[str] = None
    risk_level: RiskLevel
    reason_tags: List[ModerationReasonTag]
    ai_confidence: Optional[float] = None
    detected_patterns: List[str] = []
    status: str = "pending"  # pending, reviewed, dismissed, actioned
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None

class ModerationAction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    action_type: ModerationActionType
    target_type: str  # message, conversation, user, listing, escrow
    target_id: str
    admin_id: str
    admin_name: str
    reason: Optional[str] = None
    notes: Optional[str] = None  # Internal moderator notes
    duration_hours: Optional[int] = None  # For temp mutes
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Dict[str, Any] = {}

class UserReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reporter_id: str
    reported_user_id: str
    conversation_id: str
    message_id: Optional[str] = None
    reason: ReportReason
    description: Optional[str] = None
    status: str = "pending"  # pending, reviewed, dismissed, actioned
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    action_taken: Optional[str] = None

class ModerationRules(BaseModel):
    auto_warning_threshold: int = 3  # Warnings before auto-mute
    auto_mute_duration_hours: int = 24
    auto_ban_threshold: int = 5  # Violations before auto-ban
    block_contact_before_order: bool = True
    keyword_blacklist: List[str] = []
    scam_keywords: List[str] = DEFAULT_SCAM_KEYWORDS
    contact_patterns: List[str] = DEFAULT_CONTACT_PATTERNS
    country_rules: Dict[str, Dict[str, Any]] = {}

class ModerationConfig(BaseModel):
    ai_moderation_enabled: bool = True
    auto_moderation_enabled: bool = True
    escrow_fraud_detection: bool = True
    mask_sensitive_data: bool = True
    rules: ModerationRules = ModerationRules()

# Request/Response Models
class ActionRequest(BaseModel):
    action_type: ModerationActionType
    target_type: str
    target_id: str
    reason: Optional[str] = None
    notes: Optional[str] = None
    duration_hours: Optional[int] = None

class ReportRequest(BaseModel):
    conversation_id: str
    message_id: Optional[str] = None
    reason: ReportReason
    description: Optional[str] = None


# =============================================================================
# AI MODERATION SERVICE
# =============================================================================

class AIModerationService:
    """AI-powered content moderation using Emergent LLM"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.enabled = bool(api_key)
        
    async def analyze_message(self, message_content: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Analyze a message for policy violations using AI"""
        if not self.enabled:
            return {"error": "AI moderation not configured"}
        
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            
            system_prompt = """You are a content moderation AI for an online marketplace chat system.
Analyze the message and detect any policy violations.

Check for:
1. Scam indicators (requests for upfront payment, gift cards, wire transfers)
2. Off-platform payment attempts (asking to pay outside the platform)
3. Contact information bypass (phone numbers, emails, WhatsApp numbers)
4. Profanity or harassment
5. Spam patterns (repeated messages, copy-paste content)
6. Fraud indicators (fake shipping, customs fees, lottery scams)

Respond in JSON format only:
{
    "is_violation": true/false,
    "risk_level": "low/medium/high/critical",
    "reason_tags": ["tag1", "tag2"],
    "detected_patterns": ["pattern1", "pattern2"],
    "confidence": 0.0-1.0,
    "explanation": "brief explanation"
}"""

            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"moderation_{uuid.uuid4().hex[:8]}",
                system_message=system_prompt
            ).with_model("openai", "gpt-4o")
            
            context_str = ""
            if context:
                if context.get("has_escrow_order"):
                    context_str += "\nContext: This conversation has an active escrow order."
                if context.get("previous_violations"):
                    context_str += f"\nUser has {context['previous_violations']} previous violations."
            
            user_message = UserMessage(
                text=f"Analyze this marketplace chat message:{context_str}\n\n\"{message_content}\""
            )
            
            response = await chat.send_message(user_message)
            
            # Parse JSON response
            import json
            try:
                # Try to extract JSON from response
                json_match = re.search(r'\{[\s\S]*\}', response)
                if json_match:
                    result = json.loads(json_match.group())
                    return result
            except json.JSONDecodeError:
                pass
            
            # Fallback if JSON parsing fails
            return {
                "is_violation": False,
                "risk_level": "low",
                "reason_tags": [],
                "detected_patterns": [],
                "confidence": 0.5,
                "explanation": "Unable to parse AI response",
                "raw_response": response
            }
            
        except Exception as e:
            logger.error(f"AI moderation error: {e}")
            return {
                "error": str(e),
                "is_violation": False,
                "risk_level": "low"
            }

    async def analyze_batch(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Analyze multiple messages in batch"""
        results = []
        for msg in messages:
            result = await self.analyze_message(
                msg.get("content", ""),
                msg.get("context", {})
            )
            result["message_id"] = msg.get("id")
            results.append(result)
        return results


# =============================================================================
# RULE-BASED MODERATION
# =============================================================================

class RuleBasedModeration:
    """Rule-based content moderation (runs synchronously, always available)"""
    
    def __init__(self, rules: ModerationRules):
        self.rules = rules
        self._compile_patterns()
    
    def _compile_patterns(self):
        """Compile regex patterns for efficient matching"""
        self.contact_patterns = [
            re.compile(pattern, re.IGNORECASE) 
            for pattern in self.rules.contact_patterns
        ]
        self.scam_keywords_pattern = re.compile(
            '|'.join(re.escape(kw) for kw in self.rules.scam_keywords),
            re.IGNORECASE
        ) if self.rules.scam_keywords else None
        self.blacklist_pattern = re.compile(
            '|'.join(re.escape(kw) for kw in self.rules.keyword_blacklist),
            re.IGNORECASE
        ) if self.rules.keyword_blacklist else None
    
    def analyze_message(self, content: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Analyze message using rule-based detection"""
        violations = []
        detected_patterns = []
        risk_level = RiskLevel.LOW
        
        # Check for contact information
        for pattern in self.contact_patterns:
            matches = pattern.findall(content)
            if matches:
                violations.append(ModerationReasonTag.CONTACT_BYPASS)
                detected_patterns.extend(matches)
                risk_level = RiskLevel.MEDIUM
        
        # Check for scam keywords
        if self.scam_keywords_pattern:
            matches = self.scam_keywords_pattern.findall(content)
            if matches:
                violations.append(ModerationReasonTag.SCAM)
                detected_patterns.extend(matches)
                risk_level = RiskLevel.HIGH
        
        # Check for blacklisted keywords
        if self.blacklist_pattern:
            matches = self.blacklist_pattern.findall(content)
            if matches:
                violations.append(ModerationReasonTag.OTHER)
                detected_patterns.extend(matches)
                if risk_level == RiskLevel.LOW:
                    risk_level = RiskLevel.MEDIUM
        
        # Check for spam patterns (repeated content)
        if self._detect_spam_pattern(content):
            violations.append(ModerationReasonTag.SPAM)
            detected_patterns.append("repetitive content")
            if risk_level == RiskLevel.LOW:
                risk_level = RiskLevel.MEDIUM
        
        # Context-aware checks
        if context:
            # Check for off-platform payment requests when escrow exists
            if context.get("has_escrow_order"):
                off_platform_keywords = [
                    "pay me directly", "send to my account", "pay outside",
                    "don't use escrow", "skip escrow", "direct transfer"
                ]
                for keyword in off_platform_keywords:
                    if keyword.lower() in content.lower():
                        violations.append(ModerationReasonTag.OFF_PLATFORM_PAYMENT)
                        detected_patterns.append(keyword)
                        risk_level = RiskLevel.CRITICAL
            
            # Block contact info before order completion
            if (self.rules.block_contact_before_order and 
                not context.get("order_completed") and
                ModerationReasonTag.CONTACT_BYPASS in violations):
                risk_level = RiskLevel.HIGH
        
        return {
            "is_violation": len(violations) > 0,
            "risk_level": risk_level.value,
            "reason_tags": [v.value for v in set(violations)],
            "detected_patterns": list(set(detected_patterns)),
            "source": "rule_based"
        }
    
    def _detect_spam_pattern(self, content: str) -> bool:
        """Detect spam patterns like repeated text"""
        if len(content) < 20:
            return False
        
        # Check for repeated words
        words = content.lower().split()
        if len(words) > 5:
            unique_ratio = len(set(words)) / len(words)
            if unique_ratio < 0.3:  # Less than 30% unique words
                return True
        
        # Check for repeated characters
        if re.search(r'(.)\1{10,}', content):  # Same char 10+ times
            return True
        
        return False


# =============================================================================
# MODERATION MANAGER
# =============================================================================

class ChatModerationManager:
    """Main moderation manager combining AI and rule-based moderation"""
    
    def __init__(self, db, config: ModerationConfig = None):
        self.db = db
        self.config = config or ModerationConfig()
        
        # Initialize AI moderation
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        self.ai_service = AIModerationService(api_key) if api_key else None
        
        # Initialize rule-based moderation
        self.rule_service = RuleBasedModeration(self.config.rules)
        
        logger.info(f"Chat moderation initialized. AI enabled: {self.ai_service is not None}")
    
    async def load_config(self):
        """Load configuration from database"""
        config_doc = await self.db.moderation_config.find_one({"type": "global"})
        if config_doc:
            self.config = ModerationConfig(**{k: v for k, v in config_doc.items() if k != "_id" and k != "type"})
            self.rule_service = RuleBasedModeration(self.config.rules)
    
    async def save_config(self):
        """Save configuration to database"""
        await self.db.moderation_config.update_one(
            {"type": "global"},
            {"$set": {**self.config.model_dump(), "type": "global"}},
            upsert=True
        )
    
    async def moderate_message(
        self, 
        message_id: str, 
        conversation_id: str,
        content: str, 
        sender_id: str,
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Run moderation pipeline on a message"""
        
        # Build context
        if context is None:
            context = {}
        
        # Add user violation history
        user_violations = await self.db.moderation_actions.count_documents({
            "target_id": sender_id,
            "target_type": "user",
            "action_type": {"$in": ["warn_user", "mute_user", "ban_user"]}
        })
        context["previous_violations"] = user_violations
        
        # Check for escrow order
        escrow_order = await self.db.escrow_transactions.find_one({
            "conversation_id": conversation_id,
            "status": {"$in": ["pending", "in_progress", "shipped"]}
        })
        context["has_escrow_order"] = bool(escrow_order)
        context["order_completed"] = escrow_order.get("status") == "completed" if escrow_order else False
        
        # Run rule-based moderation (always runs)
        rule_result = self.rule_service.analyze_message(content, context)
        
        # Run AI moderation (async, if enabled)
        ai_result = None
        if self.config.ai_moderation_enabled and self.ai_service:
            try:
                ai_result = await asyncio.wait_for(
                    self.ai_service.analyze_message(content, context),
                    timeout=10.0
                )
            except asyncio.TimeoutError:
                logger.warning(f"AI moderation timeout for message {message_id}")
                ai_result = {"error": "timeout"}
            except Exception as e:
                logger.error(f"AI moderation failed: {e}")
                ai_result = {"error": str(e)}
        
        # Combine results
        combined_result = self._combine_results(rule_result, ai_result)
        
        # Create flag if violation detected
        if combined_result["is_violation"]:
            flag = ModerationFlag(
                conversation_id=conversation_id,
                message_id=message_id,
                risk_level=RiskLevel(combined_result["risk_level"]),
                reason_tags=[ModerationReasonTag(t) for t in combined_result["reason_tags"]],
                ai_confidence=combined_result.get("ai_confidence"),
                detected_patterns=combined_result["detected_patterns"]
            )
            
            await self.db.moderation_flags.insert_one(flag.model_dump())
            
            # Update message with moderation status
            await self.db.messages.update_one(
                {"id": message_id},
                {"$set": {
                    "moderation_status": "flagged",
                    "moderation_risk": combined_result["risk_level"],
                    "moderation_reasons": combined_result["reason_tags"]
                }}
            )
            
            # Auto-moderation actions
            if self.config.auto_moderation_enabled:
                await self._apply_auto_moderation(
                    sender_id, 
                    combined_result, 
                    message_id, 
                    conversation_id
                )
        
        return combined_result
    
    def _combine_results(self, rule_result: Dict, ai_result: Dict = None) -> Dict[str, Any]:
        """Combine rule-based and AI moderation results"""
        combined = {
            "is_violation": rule_result["is_violation"],
            "risk_level": rule_result["risk_level"],
            "reason_tags": rule_result["reason_tags"],
            "detected_patterns": rule_result["detected_patterns"],
            "sources": ["rule_based"]
        }
        
        if ai_result and not ai_result.get("error"):
            combined["sources"].append("ai")
            combined["ai_confidence"] = ai_result.get("confidence")
            
            # AI found violation
            if ai_result.get("is_violation"):
                combined["is_violation"] = True
                
                # Take higher risk level
                risk_order = ["low", "medium", "high", "critical"]
                ai_risk = ai_result.get("risk_level", "low")
                if risk_order.index(ai_risk) > risk_order.index(combined["risk_level"]):
                    combined["risk_level"] = ai_risk
                
                # Merge reason tags
                for tag in ai_result.get("reason_tags", []):
                    if tag not in combined["reason_tags"]:
                        combined["reason_tags"].append(tag)
                
                # Merge patterns
                for pattern in ai_result.get("detected_patterns", []):
                    if pattern not in combined["detected_patterns"]:
                        combined["detected_patterns"].append(pattern)
            
            combined["ai_explanation"] = ai_result.get("explanation")
        
        return combined
    
    async def _apply_auto_moderation(
        self, 
        user_id: str, 
        result: Dict[str, Any],
        message_id: str,
        conversation_id: str
    ):
        """Apply automatic moderation actions based on rules"""
        risk_level = result["risk_level"]
        
        # Count user's recent violations
        recent_flags = await self.db.moderation_flags.count_documents({
            "message_id": {"$in": await self._get_user_message_ids(user_id)},
            "created_at": {"$gte": datetime.now(timezone.utc) - timedelta(days=30)}
        })
        
        # Auto-hide critical risk messages
        if risk_level == "critical":
            await self.db.messages.update_one(
                {"id": message_id},
                {"$set": {"hidden": True, "hidden_reason": "auto_moderation"}}
            )
            logger.info(f"Auto-hidden critical message {message_id}")
        
        # Auto-warning
        if recent_flags >= self.config.rules.auto_warning_threshold - 1:
            await self._send_user_warning(user_id, result["reason_tags"])
        
        # Auto-mute
        if recent_flags >= self.config.rules.auto_warning_threshold:
            await self._auto_mute_user(
                user_id, 
                self.config.rules.auto_mute_duration_hours,
                "Automatic mute due to repeated policy violations"
            )
        
        # Auto-ban
        if recent_flags >= self.config.rules.auto_ban_threshold:
            await self._auto_ban_user(
                user_id,
                "Automatic ban due to excessive policy violations"
            )
    
    async def _get_user_message_ids(self, user_id: str) -> List[str]:
        """Get all message IDs from a user"""
        messages = await self.db.messages.find(
            {"sender_id": user_id},
            {"id": 1}
        ).to_list(1000)
        return [m["id"] for m in messages]
    
    async def _send_user_warning(self, user_id: str, reason_tags: List[str]):
        """Send warning notification to user"""
        await self.db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "moderation_warning",
            "title": "Policy Warning",
            "body": "Your recent message may violate our community guidelines. Please review our policies.",
            "read": False,
            "created_at": datetime.now(timezone.utc),
            "metadata": {"reason_tags": reason_tags}
        })
    
    async def _auto_mute_user(self, user_id: str, duration_hours: int, reason: str):
        """Automatically mute a user"""
        mute_until = datetime.now(timezone.utc) + timedelta(hours=duration_hours)
        
        await self.db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "chat_status": UserChatStatus.MUTED.value,
                "chat_muted_until": mute_until,
                "chat_mute_reason": reason
            }}
        )
        
        # Log action
        await self.db.moderation_actions.insert_one({
            "id": str(uuid.uuid4()),
            "action_type": ModerationActionType.MUTE_USER.value,
            "target_type": "user",
            "target_id": user_id,
            "admin_id": "system",
            "admin_name": "Auto-Moderation",
            "reason": reason,
            "duration_hours": duration_hours,
            "created_at": datetime.now(timezone.utc)
        })
        
        # Notify user
        await self.db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "account_muted",
            "title": "Chat Temporarily Disabled",
            "body": f"Your chat access has been temporarily disabled for {duration_hours} hours due to policy violations.",
            "read": False,
            "created_at": datetime.now(timezone.utc)
        })
        
        logger.info(f"Auto-muted user {user_id} for {duration_hours} hours")
    
    async def _auto_ban_user(self, user_id: str, reason: str):
        """Automatically ban a user from chat"""
        await self.db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "chat_status": UserChatStatus.BANNED.value,
                "chat_banned_at": datetime.now(timezone.utc),
                "chat_ban_reason": reason
            }}
        )
        
        # Log action
        await self.db.moderation_actions.insert_one({
            "id": str(uuid.uuid4()),
            "action_type": ModerationActionType.BAN_USER.value,
            "target_type": "user",
            "target_id": user_id,
            "admin_id": "system",
            "admin_name": "Auto-Moderation",
            "reason": reason,
            "created_at": datetime.now(timezone.utc)
        })
        
        # Notify user
        await self.db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "account_banned",
            "title": "Chat Access Suspended",
            "body": "Your chat access has been suspended due to repeated policy violations. Contact support for more information.",
            "read": False,
            "created_at": datetime.now(timezone.utc)
        })
        
        logger.info(f"Auto-banned user {user_id}")


# =============================================================================
# ROUTER FACTORY
# =============================================================================

def create_moderation_router(db, require_admin_auth, moderation_manager: ChatModerationManager):
    """Create the moderation router for admin dashboard"""
    
    router = APIRouter(prefix="/moderation", tags=["Chat Moderation"])
    
    # =========================================================================
    # CONVERSATIONS & MESSAGES
    # =========================================================================
    
    @router.get("/conversations")
    async def get_all_conversations(
        request: Request,
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100),
        user_id: Optional[str] = None,
        listing_id: Optional[str] = None,
        status: Optional[str] = None,
        risk_level: Optional[str] = None,
        has_flags: Optional[bool] = None,
        search: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        category: Optional[str] = None
    ):
        """Get all conversations with filters for moderation"""
        admin = await require_admin_auth(request)
        
        # Build query
        query = {}
        
        if user_id:
            query["$or"] = [{"buyer_id": user_id}, {"seller_id": user_id}]
        
        if listing_id:
            query["listing_id"] = listing_id
        
        if status:
            query["moderation_status"] = status
        
        if date_from:
            try:
                from_date = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                query["created_at"] = {"$gte": from_date}
            except:
                pass
        
        if date_to:
            try:
                to_date = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                if "created_at" in query:
                    query["created_at"]["$lte"] = to_date
                else:
                    query["created_at"] = {"$lte": to_date}
            except:
                pass
        
        # Get conversations
        skip = (page - 1) * limit
        conversations = await db.conversations.find(
            query, {"_id": 0}
        ).sort("last_message_time", -1).skip(skip).limit(limit).to_list(limit)
        
        total = await db.conversations.count_documents(query)
        
        # Enrich with user, listing, and flag info
        enriched = []
        for conv in conversations:
            # Get users
            buyer = await db.users.find_one(
                {"user_id": conv["buyer_id"]},
                {"_id": 0, "user_id": 1, "name": 1, "email": 1, "picture": 1, "chat_status": 1}
            )
            seller = await db.users.find_one(
                {"user_id": conv["seller_id"]},
                {"_id": 0, "user_id": 1, "name": 1, "email": 1, "picture": 1, "chat_status": 1}
            )
            
            # Get listing
            listing = await db.listings.find_one(
                {"id": conv["listing_id"]},
                {"_id": 0, "id": 1, "title": 1, "price": 1, "category_id": 1, "images": 1}
            )
            
            # Filter by category if specified
            if category and listing and listing.get("category_id") != category:
                continue
            
            # Get flags count
            flags_count = await db.moderation_flags.count_documents({
                "conversation_id": conv["id"],
                "status": "pending"
            })
            
            # Get reports count
            reports_count = await db.user_reports.count_documents({
                "conversation_id": conv["id"],
                "status": "pending"
            })
            
            # Get message count
            message_count = await db.messages.count_documents({"conversation_id": conv["id"]})
            
            # Check if has escrow
            escrow = await db.escrow_transactions.find_one(
                {"conversation_id": conv["id"]},
                {"_id": 0, "id": 1, "status": 1, "amount": 1}
            )
            
            # Filter by has_flags
            if has_flags is not None:
                if has_flags and flags_count == 0:
                    continue
                if not has_flags and flags_count > 0:
                    continue
            
            # Filter by risk_level
            if risk_level:
                highest_risk = await db.moderation_flags.find_one(
                    {"conversation_id": conv["id"], "risk_level": risk_level}
                )
                if not highest_risk:
                    continue
            
            enriched.append({
                **conv,
                "buyer": buyer,
                "seller": seller,
                "listing": listing,
                "flags_count": flags_count,
                "reports_count": reports_count,
                "message_count": message_count,
                "escrow": escrow,
                "moderation_status": conv.get("moderation_status", "active")
            })
        
        # Search filter (applied after enrichment)
        if search:
            search_lower = search.lower()
            enriched = [
                c for c in enriched
                if (c.get("buyer", {}).get("name", "").lower().find(search_lower) >= 0 or
                    c.get("seller", {}).get("name", "").lower().find(search_lower) >= 0 or
                    c.get("listing", {}).get("title", "").lower().find(search_lower) >= 0)
            ]
        
        return {
            "conversations": enriched,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    
    @router.get("/conversations/{conversation_id}")
    async def get_conversation_detail(conversation_id: str, request: Request):
        """Get conversation with all messages for moderation review"""
        admin = await require_admin_auth(request)
        
        conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Get messages
        messages = await db.messages.find(
            {"conversation_id": conversation_id},
            {"_id": 0}
        ).sort("created_at", 1).to_list(1000)
        
        # Get users
        buyer = await db.users.find_one(
            {"user_id": conversation["buyer_id"]},
            {"_id": 0, "password_hash": 0}
        )
        seller = await db.users.find_one(
            {"user_id": conversation["seller_id"]},
            {"_id": 0, "password_hash": 0}
        )
        
        # Get listing
        listing = await db.listings.find_one(
            {"id": conversation["listing_id"]},
            {"_id": 0}
        )
        
        # Get flags
        flags = await db.moderation_flags.find(
            {"conversation_id": conversation_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        # Get reports
        reports = await db.user_reports.find(
            {"conversation_id": conversation_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        # Get moderation actions
        actions = await db.moderation_actions.find(
            {"$or": [
                {"target_id": conversation_id, "target_type": "conversation"},
                {"target_id": {"$in": [m["id"] for m in messages]}, "target_type": "message"}
            ]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        # Get escrow if exists
        escrow = await db.escrow_transactions.find_one(
            {"conversation_id": conversation_id},
            {"_id": 0}
        )
        
        # Get moderator notes
        notes = await db.moderator_notes.find(
            {"conversation_id": conversation_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(50)
        
        return {
            "conversation": conversation,
            "messages": messages,
            "buyer": buyer,
            "seller": seller,
            "listing": listing,
            "flags": flags,
            "reports": reports,
            "actions": actions,
            "escrow": escrow,
            "notes": notes
        }
    
    @router.get("/messages/search")
    async def search_messages(
        request: Request,
        keyword: str = Query(..., min_length=2),
        page: int = Query(1, ge=1),
        limit: int = Query(50, ge=1, le=200)
    ):
        """Search messages by keyword"""
        admin = await require_admin_auth(request)
        
        skip = (page - 1) * limit
        
        # Search with text index or regex
        messages = await db.messages.find(
            {"content": {"$regex": keyword, "$options": "i"}},
            {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        total = await db.messages.count_documents(
            {"content": {"$regex": keyword, "$options": "i"}}
        )
        
        # Enrich with conversation and user info
        enriched = []
        for msg in messages:
            conv = await db.conversations.find_one(
                {"id": msg["conversation_id"]},
                {"_id": 0, "id": 1, "listing_id": 1, "buyer_id": 1, "seller_id": 1}
            )
            sender = await db.users.find_one(
                {"user_id": msg["sender_id"]},
                {"_id": 0, "user_id": 1, "name": 1, "email": 1}
            )
            enriched.append({
                **msg,
                "conversation": conv,
                "sender": sender
            })
        
        return {
            "messages": enriched,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    
    # =========================================================================
    # FLAGS & REPORTS
    # =========================================================================
    
    @router.get("/flags")
    async def get_moderation_flags(
        request: Request,
        status: str = Query("pending"),
        risk_level: Optional[str] = None,
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100)
    ):
        """Get flagged content for review"""
        admin = await require_admin_auth(request)
        
        query = {"status": status}
        if risk_level:
            query["risk_level"] = risk_level
        
        skip = (page - 1) * limit
        flags = await db.moderation_flags.find(
            query, {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        total = await db.moderation_flags.count_documents(query)
        
        # Enrich with conversation and message info
        enriched = []
        for flag in flags:
            conv = await db.conversations.find_one(
                {"id": flag["conversation_id"]},
                {"_id": 0}
            )
            message = None
            if flag.get("message_id"):
                message = await db.messages.find_one(
                    {"id": flag["message_id"]},
                    {"_id": 0}
                )
            enriched.append({
                **flag,
                "conversation": conv,
                "message": message
            })
        
        return {
            "flags": enriched,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    
    @router.put("/flags/{flag_id}")
    async def update_flag(flag_id: str, request: Request):
        """Update flag status (reviewed, dismissed, actioned)"""
        admin = await require_admin_auth(request)
        body = await request.json()
        
        new_status = body.get("status")
        if new_status not in ["reviewed", "dismissed", "actioned"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        
        result = await db.moderation_flags.update_one(
            {"id": flag_id},
            {"$set": {
                "status": new_status,
                "reviewed_at": datetime.now(timezone.utc),
                "reviewed_by": admin["admin_id"]
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Flag not found")
        
        return {"message": "Flag updated", "status": new_status}
    
    @router.get("/reports")
    async def get_user_reports(
        request: Request,
        status: str = Query("pending"),
        reason: Optional[str] = None,
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100)
    ):
        """Get user reports for review"""
        admin = await require_admin_auth(request)
        
        query = {"status": status}
        if reason:
            query["reason"] = reason
        
        skip = (page - 1) * limit
        reports = await db.user_reports.find(
            query, {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        total = await db.user_reports.count_documents(query)
        
        # Enrich with user and conversation info
        enriched = []
        for report in reports:
            reporter = await db.users.find_one(
                {"user_id": report["reporter_id"]},
                {"_id": 0, "user_id": 1, "name": 1, "email": 1}
            )
            reported = await db.users.find_one(
                {"user_id": report["reported_user_id"]},
                {"_id": 0, "user_id": 1, "name": 1, "email": 1}
            )
            conv = await db.conversations.find_one(
                {"id": report["conversation_id"]},
                {"_id": 0}
            )
            message = None
            if report.get("message_id"):
                message = await db.messages.find_one(
                    {"id": report["message_id"]},
                    {"_id": 0}
                )
            enriched.append({
                **report,
                "reporter": reporter,
                "reported_user": reported,
                "conversation": conv,
                "message": message
            })
        
        return {
            "reports": enriched,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    
    @router.put("/reports/{report_id}")
    async def update_report(report_id: str, request: Request):
        """Update report status"""
        admin = await require_admin_auth(request)
        body = await request.json()
        
        new_status = body.get("status")
        action_taken = body.get("action_taken")
        
        update_data = {
            "status": new_status,
            "reviewed_at": datetime.now(timezone.utc),
            "reviewed_by": admin["admin_id"]
        }
        if action_taken:
            update_data["action_taken"] = action_taken
        
        result = await db.user_reports.update_one(
            {"id": report_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Report not found")
        
        return {"message": "Report updated"}
    
    # =========================================================================
    # MODERATION ACTIONS
    # =========================================================================
    
    @router.post("/actions")
    async def perform_moderation_action(action_req: ActionRequest, request: Request):
        """Perform a moderation action"""
        admin = await require_admin_auth(request)
        
        action = ModerationAction(
            action_type=action_req.action_type,
            target_type=action_req.target_type,
            target_id=action_req.target_id,
            admin_id=admin["admin_id"],
            admin_name=admin.get("name", admin["email"]),
            reason=action_req.reason,
            notes=action_req.notes,
            duration_hours=action_req.duration_hours
        )
        
        # Execute action
        if action_req.action_type == ModerationActionType.DELETE_MESSAGE:
            await db.messages.delete_one({"id": action_req.target_id})
            
        elif action_req.action_type == ModerationActionType.HIDE_MESSAGE:
            await db.messages.update_one(
                {"id": action_req.target_id},
                {"$set": {"hidden": True, "hidden_by": admin["admin_id"]}}
            )
            
        elif action_req.action_type == ModerationActionType.FREEZE_CONVERSATION:
            await db.conversations.update_one(
                {"id": action_req.target_id},
                {"$set": {"moderation_status": "frozen", "frozen_at": datetime.now(timezone.utc)}}
            )
            # Notify both users
            conv = await db.conversations.find_one({"id": action_req.target_id})
            if conv:
                for user_id in [conv["buyer_id"], conv["seller_id"]]:
                    await db.notifications.insert_one({
                        "id": str(uuid.uuid4()),
                        "user_id": user_id,
                        "type": "conversation_frozen",
                        "title": "Conversation Paused",
                        "body": "This conversation has been paused for review by our moderation team.",
                        "read": False,
                        "created_at": datetime.now(timezone.utc)
                    })
                    
        elif action_req.action_type == ModerationActionType.UNFREEZE_CONVERSATION:
            await db.conversations.update_one(
                {"id": action_req.target_id},
                {"$set": {"moderation_status": "active"}, "$unset": {"frozen_at": ""}}
            )
            
        elif action_req.action_type == ModerationActionType.DISABLE_CHAT_FOR_LISTING:
            await db.listings.update_one(
                {"id": action_req.target_id},
                {"$set": {"chat_disabled": True, "chat_disabled_at": datetime.now(timezone.utc)}}
            )
            
        elif action_req.action_type == ModerationActionType.ENABLE_CHAT_FOR_LISTING:
            await db.listings.update_one(
                {"id": action_req.target_id},
                {"$set": {"chat_disabled": False}, "$unset": {"chat_disabled_at": ""}}
            )
            
        elif action_req.action_type == ModerationActionType.MUTE_USER:
            duration = action_req.duration_hours or 24
            mute_until = datetime.now(timezone.utc) + timedelta(hours=duration)
            await db.users.update_one(
                {"user_id": action_req.target_id},
                {"$set": {
                    "chat_status": "muted",
                    "chat_muted_until": mute_until,
                    "chat_mute_reason": action_req.reason
                }}
            )
            # Notify user
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": action_req.target_id,
                "type": "account_muted",
                "title": "Chat Temporarily Disabled",
                "body": f"Your chat access has been temporarily disabled for {duration} hours.",
                "read": False,
                "created_at": datetime.now(timezone.utc)
            })
            
        elif action_req.action_type == ModerationActionType.UNMUTE_USER:
            await db.users.update_one(
                {"user_id": action_req.target_id},
                {"$set": {"chat_status": "active"}, "$unset": {"chat_muted_until": "", "chat_mute_reason": ""}}
            )
            
        elif action_req.action_type == ModerationActionType.BAN_USER:
            await db.users.update_one(
                {"user_id": action_req.target_id},
                {"$set": {
                    "chat_status": "banned",
                    "chat_banned_at": datetime.now(timezone.utc),
                    "chat_ban_reason": action_req.reason
                }}
            )
            # Notify user
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": action_req.target_id,
                "type": "account_banned",
                "title": "Chat Access Suspended",
                "body": "Your chat access has been suspended due to policy violations.",
                "read": False,
                "created_at": datetime.now(timezone.utc)
            })
            
        elif action_req.action_type == ModerationActionType.UNBAN_USER:
            await db.users.update_one(
                {"user_id": action_req.target_id},
                {"$set": {"chat_status": "active"}, "$unset": {"chat_banned_at": "", "chat_ban_reason": ""}}
            )
            
        elif action_req.action_type == ModerationActionType.WARN_USER:
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": action_req.target_id,
                "type": "moderation_warning",
                "title": "Policy Warning",
                "body": action_req.reason or "Your recent activity may violate our community guidelines.",
                "read": False,
                "created_at": datetime.now(timezone.utc)
            })
            
        elif action_req.action_type == ModerationActionType.LOCK_ESCROW:
            await db.escrow_transactions.update_one(
                {"id": action_req.target_id},
                {"$set": {
                    "status": "locked",
                    "locked_at": datetime.now(timezone.utc),
                    "locked_by": admin["admin_id"],
                    "lock_reason": action_req.reason
                }}
            )
        
        # Save action to audit log
        await db.moderation_actions.insert_one(action.model_dump())
        
        return {"message": "Action performed", "action_id": action.id}
    
    @router.get("/actions")
    async def get_moderation_actions(
        request: Request,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None,
        action_type: Optional[str] = None,
        page: int = Query(1, ge=1),
        limit: int = Query(50, ge=1, le=200)
    ):
        """Get moderation action history (audit log)"""
        admin = await require_admin_auth(request)
        
        query = {}
        if target_type:
            query["target_type"] = target_type
        if target_id:
            query["target_id"] = target_id
        if action_type:
            query["action_type"] = action_type
        
        skip = (page - 1) * limit
        actions = await db.moderation_actions.find(
            query, {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        total = await db.moderation_actions.count_documents(query)
        
        return {
            "actions": actions,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    
    # =========================================================================
    # MODERATOR NOTES
    # =========================================================================
    
    @router.post("/notes")
    async def add_moderator_note(request: Request):
        """Add internal moderator note (not visible to users)"""
        admin = await require_admin_auth(request)
        body = await request.json()
        
        note = {
            "id": str(uuid.uuid4()),
            "conversation_id": body.get("conversation_id"),
            "user_id": body.get("user_id"),
            "content": body.get("content"),
            "admin_id": admin["admin_id"],
            "admin_name": admin.get("name", admin["email"]),
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.moderator_notes.insert_one(note)
        
        return {"message": "Note added", "note_id": note["id"]}
    
    @router.get("/notes")
    async def get_moderator_notes(
        request: Request,
        conversation_id: Optional[str] = None,
        user_id: Optional[str] = None
    ):
        """Get moderator notes"""
        admin = await require_admin_auth(request)
        
        query = {}
        if conversation_id:
            query["conversation_id"] = conversation_id
        if user_id:
            query["user_id"] = user_id
        
        notes = await db.moderator_notes.find(
            query, {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        return {"notes": notes}
    
    # =========================================================================
    # CONFIGURATION
    # =========================================================================
    
    @router.get("/config")
    async def get_moderation_config(request: Request):
        """Get moderation configuration"""
        admin = await require_admin_auth(request)
        
        await moderation_manager.load_config()
        return moderation_manager.config.model_dump()
    
    @router.put("/config")
    async def update_moderation_config(request: Request):
        """Update moderation configuration"""
        admin = await require_admin_auth(request)
        body = await request.json()
        
        # Update config
        moderation_manager.config = ModerationConfig(**body)
        moderation_manager.rule_service = RuleBasedModeration(moderation_manager.config.rules)
        await moderation_manager.save_config()
        
        # Log action
        await db.moderation_actions.insert_one({
            "id": str(uuid.uuid4()),
            "action_type": "update_config",
            "target_type": "config",
            "target_id": "global",
            "admin_id": admin["admin_id"],
            "admin_name": admin.get("name", admin["email"]),
            "created_at": datetime.now(timezone.utc),
            "metadata": {"new_config": body}
        })
        
        return {"message": "Configuration updated"}
    
    @router.get("/stats")
    async def get_moderation_stats(request: Request):
        """Get moderation statistics"""
        admin = await require_admin_auth(request)
        
        # Flags stats
        pending_flags = await db.moderation_flags.count_documents({"status": "pending"})
        flags_by_risk = await db.moderation_flags.aggregate([
            {"$match": {"status": "pending"}},
            {"$group": {"_id": "$risk_level", "count": {"$sum": 1}}}
        ]).to_list(10)
        
        # Reports stats
        pending_reports = await db.user_reports.count_documents({"status": "pending"})
        reports_by_reason = await db.user_reports.aggregate([
            {"$match": {"status": "pending"}},
            {"$group": {"_id": "$reason", "count": {"$sum": 1}}}
        ]).to_list(10)
        
        # User stats
        muted_users = await db.users.count_documents({"chat_status": "muted"})
        banned_users = await db.users.count_documents({"chat_status": "banned"})
        
        # Conversations stats
        frozen_conversations = await db.conversations.count_documents({"moderation_status": "frozen"})
        
        # Recent actions
        recent_actions = await db.moderation_actions.count_documents({
            "created_at": {"$gte": datetime.now(timezone.utc) - timedelta(hours=24)}
        })
        
        return {
            "flags": {
                "pending": pending_flags,
                "by_risk": {item["_id"]: item["count"] for item in flags_by_risk}
            },
            "reports": {
                "pending": pending_reports,
                "by_reason": {item["_id"]: item["count"] for item in reports_by_reason}
            },
            "users": {
                "muted": muted_users,
                "banned": banned_users
            },
            "conversations": {
                "frozen": frozen_conversations
            },
            "actions_24h": recent_actions
        }
    
    return router


# =============================================================================
# USER-FACING REPORT ENDPOINT
# =============================================================================

def create_user_report_router(db, require_auth):
    """Create router for user-facing report functionality"""
    
    router = APIRouter(prefix="/report", tags=["User Reports"])
    
    @router.post("/message")
    async def report_message(report_req: ReportRequest, request: Request):
        """Report a message or conversation"""
        user = await require_auth(request)
        
        # Verify conversation exists and user is participant
        conv = await db.conversations.find_one({"id": report_req.conversation_id})
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        if user.user_id not in [conv["buyer_id"], conv["seller_id"]]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Determine reported user
        reported_user_id = conv["seller_id"] if conv["buyer_id"] == user.user_id else conv["buyer_id"]
        
        # Create report
        report = UserReport(
            reporter_id=user.user_id,
            reported_user_id=reported_user_id,
            conversation_id=report_req.conversation_id,
            message_id=report_req.message_id,
            reason=report_req.reason,
            description=report_req.description
        )
        
        await db.user_reports.insert_one(report.model_dump())
        
        return {"message": "Report submitted", "report_id": report.id}
    
    @router.get("/reasons")
    async def get_report_reasons():
        """Get available report reasons"""
        return {
            "reasons": [
                {"id": "scam", "label": "Scam or fraud"},
                {"id": "abuse", "label": "Abusive or threatening"},
                {"id": "fake_listing", "label": "Fake or misleading listing"},
                {"id": "off_platform_payment", "label": "Asking for payment outside platform"},
                {"id": "harassment", "label": "Harassment"},
                {"id": "spam", "label": "Spam"},
                {"id": "other", "label": "Other"}
            ]
        }
    
    return router
