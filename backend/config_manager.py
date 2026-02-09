"""
Config & Environment Manager
Centralized configuration service for managing platform behavior across:
- Multiple environments (Production, Staging, Sandbox, Development)
- Feature flags (global, country, role, seller overrides)
- Country/region configurations
- API key management
- Config versioning & rollback
- 2-admin approval workflow for critical configs
- Preview/simulation mode
"""

from fastapi import APIRouter, HTTPException, Body, Query, Request
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional, Literal
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid
import json
import hashlib
import logging
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# =========================================================================
# ENUMS
# =========================================================================

class Environment(str, Enum):
    PRODUCTION = "production"
    STAGING = "staging"
    SANDBOX = "sandbox"
    DEVELOPMENT = "development"

class ConfigCategory(str, Enum):
    GLOBAL = "global"
    FEATURE_FLAGS = "feature_flags"
    COUNTRY = "country"
    PAYMENTS = "payments"
    ESCROW = "escrow"
    NOTIFICATIONS = "notifications"
    AI = "ai"
    TRANSPORT = "transport"
    ADS = "ads"
    RATE_LIMITS = "rate_limits"
    API_KEYS = "api_keys"

class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    AUTO_APPROVED = "auto_approved"

class FeatureFlagScope(str, Enum):
    GLOBAL = "global"
    COUNTRY = "country"
    ROLE = "role"
    SELLER = "seller"

# List of features that can be toggled
FEATURE_FLAGS = [
    "escrow_system",
    "online_checkout",
    "verified_sellers",
    "boosts_credits",
    "seller_analytics",
    "ai_descriptions",
    "transport_integration",
    "sms_notifications",
    "whatsapp_notifications",
    "chat_moderation",
    "banners_ads",
    "sandbox_mode",
    "price_negotiation",
    "multi_currency",
    "reviews_ratings",
    "favorites_watchlist",
    "push_notifications",
    "email_notifications",
    "location_services",
    "image_ai_moderation"
]

# Critical configs that require 2-admin approval
CRITICAL_CONFIGS = [
    "commission_percentage",
    "escrow_duration_days",
    "payment_gateway_keys",
    "mobile_money_credentials",
    "vat_rate",
    "checkout_enabled",
    "escrow_enabled"
]

# User roles for feature flag overrides
USER_ROLES = ["user", "seller", "verified_seller", "admin", "super_admin", "support", "moderator"]

class ScheduleStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    ROLLED_BACK = "rolled_back"
    CANCELLED = "cancelled"
    FAILED = "failed"

class RollbackTrigger(str, Enum):
    MANUAL = "manual"
    METRIC_DROP = "metric_drop"
    ERROR_RATE = "error_rate"
    TIME_BASED = "time_based"

# =========================================================================
# PYDANTIC MODELS
# =========================================================================

class ScheduledDeployment(BaseModel):
    """Scheduled config deployment"""
    id: str
    name: str
    description: Optional[str] = None
    environment: str
    config_type: str  # feature_flag, global_setting, country_config
    config_changes: Dict[str, Any]  # What to change
    scheduled_at: str  # When to deploy
    duration_hours: Optional[int] = None  # Auto-rollback after duration
    status: str = "pending"
    
    # Rollback settings
    enable_auto_rollback: bool = True
    rollback_on_error_rate: float = Field(default=5.0, ge=0, le=100)  # Rollback if error rate exceeds
    rollback_on_metric_drop: float = Field(default=20.0, ge=0, le=100)  # Rollback if key metric drops %
    metric_to_monitor: Optional[str] = None  # e.g., "checkout_conversion", "api_success_rate"
    monitoring_period_minutes: int = Field(default=30, ge=5, le=240)
    
    # Execution info
    original_values: Optional[Dict[str, Any]] = None  # Saved before deployment
    deployed_at: Optional[str] = None
    rolled_back_at: Optional[str] = None
    rollback_reason: Optional[str] = None
    completed_at: Optional[str] = None
    
    created_by: str
    created_at: str
    updated_at: Optional[str] = None

class GlobalSettings(BaseModel):
    """Global platform settings"""
    platform_name: str = "Marketplace"
    platform_tagline: str = "Buy & Sell Anything"
    default_currency: str = "USD"
    default_vat_percentage: float = Field(default=0.0, ge=0, le=100)
    commission_percentage: float = Field(default=5.0, ge=0, le=50)
    escrow_duration_days: int = Field(default=7, ge=1, le=90)
    max_listing_images: int = Field(default=10, ge=1, le=50)
    max_listing_price: float = Field(default=1000000, ge=0)
    default_listing_expiry_days: int = Field(default=30, ge=1, le=365)
    support_email: str = "support@marketplace.com"
    support_phone: Optional[str] = None

class RateLimitSettings(BaseModel):
    """Rate limiting configuration"""
    api_requests_per_minute: int = Field(default=60, ge=1)
    api_requests_per_hour: int = Field(default=1000, ge=1)
    listing_creates_per_day: int = Field(default=10, ge=1)
    message_sends_per_minute: int = Field(default=30, ge=1)
    login_attempts_per_hour: int = Field(default=10, ge=1)

class NotificationDefaults(BaseModel):
    """Default notification settings"""
    push_enabled: bool = True
    email_enabled: bool = True
    sms_enabled: bool = False
    whatsapp_enabled: bool = False
    marketing_opt_in_default: bool = False
    order_updates_default: bool = True
    chat_notifications_default: bool = True
    price_alerts_default: bool = True

class TransportDefaults(BaseModel):
    """Default transport/delivery settings"""
    enabled: bool = True
    default_provider: Optional[str] = None
    free_shipping_threshold: float = Field(default=0, ge=0)
    max_delivery_distance_km: float = Field(default=100, ge=0)
    same_day_delivery_cutoff_hour: int = Field(default=14, ge=0, le=23)

class FeatureFlag(BaseModel):
    """Feature flag configuration"""
    feature_id: str
    enabled: bool = True
    scope: FeatureFlagScope = FeatureFlagScope.GLOBAL
    scope_value: Optional[str] = None  # Country code, role name, or seller ID
    rollout_percentage: int = Field(default=100, ge=0, le=100)  # For gradual rollouts
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None

class CountryConfig(BaseModel):
    """Country-specific configuration"""
    country_code: str  # ISO 3166-1 alpha-2
    country_name: str
    enabled: bool = True
    currency_code: str
    vat_rate: float = Field(default=0, ge=0, le=100)
    payment_methods: List[str] = Field(default_factory=list)  # card, mobile_money, bank_transfer, cash
    mobile_money_providers: List[str] = Field(default_factory=list)  # mpesa, mtn, airtel, etc.
    transport_partners: List[str] = Field(default_factory=list)
    notification_channels: List[str] = Field(default_factory=lambda: ["push", "email"])
    legal_entity: Optional[str] = None
    timezone: str = "UTC"
    date_format: str = "YYYY-MM-DD"
    phone_prefix: str = ""
    support_languages: List[str] = Field(default_factory=lambda: ["en"])

class APIKeyConfig(BaseModel):
    """API key configuration (keys are stored encrypted)"""
    key_id: str
    service_name: str  # stripe, paypal, mpesa, twilio, openai, etc.
    key_type: str  # api_key, secret_key, webhook_secret, etc.
    masked_value: str  # Shows only last 4 chars
    environment: Environment
    is_active: bool = True
    created_at: str
    created_by: str
    last_used_at: Optional[str] = None
    expires_at: Optional[str] = None

class ConfigApproval(BaseModel):
    """Approval request for critical config changes"""
    id: str
    config_category: ConfigCategory
    config_key: str
    old_value: Any
    new_value: Any
    environment: Environment
    requested_by: str
    requested_at: str
    status: ApprovalStatus = ApprovalStatus.PENDING
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    rejection_reason: Optional[str] = None
    change_notes: str = ""
    expires_at: str  # Auto-reject if not approved within 24h

class ConfigVersion(BaseModel):
    """Config version for history/rollback"""
    version: int
    environment: Environment
    category: ConfigCategory
    config_data: Dict[str, Any]
    created_at: str
    created_by: str
    change_notes: str = ""
    checksum: str

class ConfigHealthCheck(BaseModel):
    """Health check result"""
    status: Literal["healthy", "degraded", "unhealthy"]
    environment: Environment
    checks: Dict[str, bool]
    warnings: List[str]
    last_check: str


# =========================================================================
# SERVICE CLASS
# =========================================================================

class ConfigManagerService:
    """Centralized Config & Environment Manager"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        
        # Collections
        self.global_config = db.config_global
        self.feature_flags = db.config_feature_flags
        self.country_configs = db.config_countries
        self.api_keys = db.config_api_keys
        self.approvals = db.config_approvals
        self.config_history = db.config_history
        self.audit_log = db.config_audit_log
        
        # In-memory cache for fast reads
        self._cache: Dict[str, Dict] = {}
        self._cache_timestamps: Dict[str, datetime] = {}
        self._cache_ttl = 60  # seconds
        
        # Last known good config for fail-safe
        self._fallback_config: Dict[str, Dict] = {}
    
    # -------------------------------------------------------------------------
    # CACHE & FAIL-SAFE
    # -------------------------------------------------------------------------
    
    def _get_cache_key(self, env: Environment, category: str) -> str:
        return f"{env.value}:{category}"
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        if cache_key not in self._cache_timestamps:
            return False
        age = (datetime.now(timezone.utc) - self._cache_timestamps[cache_key]).total_seconds()
        return age < self._cache_ttl
    
    def _update_cache(self, cache_key: str, data: Dict):
        self._cache[cache_key] = data
        self._cache_timestamps[cache_key] = datetime.now(timezone.utc)
        self._fallback_config[cache_key] = data  # Update fallback
    
    def _invalidate_cache(self, env: Environment, category: str = None):
        if category:
            cache_key = self._get_cache_key(env, category)
            self._cache.pop(cache_key, None)
            self._cache_timestamps.pop(cache_key, None)
        else:
            # Invalidate all caches for environment
            keys_to_remove = [k for k in self._cache if k.startswith(f"{env.value}:")]
            for key in keys_to_remove:
                self._cache.pop(key, None)
                self._cache_timestamps.pop(key, None)
    
    def _get_fallback(self, cache_key: str) -> Optional[Dict]:
        return self._fallback_config.get(cache_key)
    
    # -------------------------------------------------------------------------
    # AUDIT LOGGING
    # -------------------------------------------------------------------------
    
    async def _log_audit(
        self,
        action: str,
        category: ConfigCategory,
        config_key: str,
        old_value: Any,
        new_value: Any,
        performed_by: str,
        environment: Environment,
        ip_address: Optional[str] = None
    ):
        entry = {
            "id": str(uuid.uuid4()),
            "action": action,
            "category": category.value,
            "config_key": config_key,
            "old_value": old_value,
            "new_value": new_value,
            "performed_by": performed_by,
            "environment": environment.value,
            "ip_address": ip_address,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await self.audit_log.insert_one(entry)
        logger.info(f"Config audit: {action} on {category.value}/{config_key} by {performed_by}")
    
    async def get_audit_logs(
        self,
        environment: Optional[Environment] = None,
        category: Optional[ConfigCategory] = None,
        performed_by: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 100,
        skip: int = 0
    ) -> List[Dict]:
        query = {}
        if environment:
            query["environment"] = environment.value
        if category:
            query["category"] = category.value
        if performed_by:
            query["performed_by"] = performed_by
        if start_date:
            query["timestamp"] = {"$gte": start_date}
        if end_date:
            query.setdefault("timestamp", {})["$lte"] = end_date
        
        cursor = self.audit_log.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)
    
    # -------------------------------------------------------------------------
    # GLOBAL SETTINGS
    # -------------------------------------------------------------------------
    
    def _get_default_global_settings(self) -> Dict:
        return {
            "platform_name": "Marketplace",
            "platform_tagline": "Buy & Sell Anything",
            "default_currency": "USD",
            "default_vat_percentage": 0.0,
            "commission_percentage": 5.0,
            "escrow_duration_days": 7,
            "max_listing_images": 10,
            "max_listing_price": 1000000,
            "default_listing_expiry_days": 30,
            "support_email": "support@marketplace.com",
            "support_phone": None,
            "rate_limits": {
                "api_requests_per_minute": 60,
                "api_requests_per_hour": 1000,
                "listing_creates_per_day": 10,
                "message_sends_per_minute": 30,
                "login_attempts_per_hour": 10
            },
            "notification_defaults": {
                "push_enabled": True,
                "email_enabled": True,
                "sms_enabled": False,
                "whatsapp_enabled": False,
                "marketing_opt_in_default": False,
                "order_updates_default": True,
                "chat_notifications_default": True,
                "price_alerts_default": True
            },
            "transport_defaults": {
                "enabled": True,
                "default_provider": None,
                "free_shipping_threshold": 0,
                "max_delivery_distance_km": 100,
                "same_day_delivery_cutoff_hour": 14
            }
        }
    
    async def get_global_settings(self, environment: Environment) -> Dict:
        cache_key = self._get_cache_key(environment, "global")
        
        # Check cache
        if self._is_cache_valid(cache_key):
            return self._cache[cache_key]
        
        try:
            config = await self.global_config.find_one(
                {"environment": environment.value},
                {"_id": 0}
            )
            
            if not config:
                config = {
                    "id": f"global_{environment.value}",
                    "environment": environment.value,
                    "version": 1,
                    **self._get_default_global_settings(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "updated_by": "system"
                }
                await self.global_config.insert_one(config.copy())
            
            config.pop("_id", None)
            self._update_cache(cache_key, config)
            return config
            
        except Exception as e:
            logger.error(f"Failed to get global settings: {e}")
            # Return fallback
            fallback = self._get_fallback(cache_key)
            if fallback:
                return fallback
            return self._get_default_global_settings()
    
    async def update_global_settings(
        self,
        environment: Environment,
        updates: Dict[str, Any],
        updated_by: str,
        change_notes: str = "",
        skip_approval: bool = False
    ) -> Dict:
        current = await self.get_global_settings(environment)
        
        # Check for critical config changes requiring approval
        critical_changes = [k for k in updates.keys() if k in CRITICAL_CONFIGS]
        
        if critical_changes and not skip_approval:
            # Create approval request
            approval_id = await self._create_approval_request(
                category=ConfigCategory.GLOBAL,
                config_key=",".join(critical_changes),
                old_value={k: current.get(k) for k in critical_changes},
                new_value={k: updates[k] for k in critical_changes},
                environment=environment,
                requested_by=updated_by,
                change_notes=change_notes
            )
            return {
                "status": "pending_approval",
                "approval_id": approval_id,
                "message": f"Critical config changes require approval: {', '.join(critical_changes)}"
            }
        
        # Store current version in history
        await self._save_config_version(
            environment=environment,
            category=ConfigCategory.GLOBAL,
            config_data=current,
            created_by=updated_by,
            change_notes=change_notes
        )
        
        # Apply updates
        new_version = current.get("version", 1) + 1
        updates["version"] = new_version
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        updates["updated_by"] = updated_by
        
        await self.global_config.update_one(
            {"environment": environment.value},
            {"$set": updates},
            upsert=True
        )
        
        # Log audit for each changed field
        for key, new_val in updates.items():
            if key not in ["version", "updated_at", "updated_by"]:
                old_val = current.get(key)
                if old_val != new_val:
                    await self._log_audit(
                        action="update",
                        category=ConfigCategory.GLOBAL,
                        config_key=key,
                        old_value=old_val,
                        new_value=new_val,
                        performed_by=updated_by,
                        environment=environment
                    )
        
        self._invalidate_cache(environment, "global")
        return await self.get_global_settings(environment)
    
    # -------------------------------------------------------------------------
    # FEATURE FLAGS
    # -------------------------------------------------------------------------
    
    async def get_feature_flags(
        self,
        environment: Environment,
        scope: Optional[FeatureFlagScope] = None,
        scope_value: Optional[str] = None
    ) -> List[Dict]:
        cache_key = self._get_cache_key(environment, "feature_flags")
        
        query = {"environment": environment.value}
        if scope:
            query["scope"] = scope.value
        if scope_value:
            query["scope_value"] = scope_value
        
        flags = await self.feature_flags.find(query, {"_id": 0}).to_list(length=500)
        
        # If no flags exist, create defaults
        if not flags and not scope:
            flags = await self._initialize_default_feature_flags(environment)
        
        return flags
    
    async def _initialize_default_feature_flags(self, environment: Environment) -> List[Dict]:
        now = datetime.now(timezone.utc).isoformat()
        default_flags = []
        
        for feature_id in FEATURE_FLAGS:
            flag = {
                "id": str(uuid.uuid4()),
                "feature_id": feature_id,
                "environment": environment.value,
                "enabled": True,
                "scope": FeatureFlagScope.GLOBAL.value,
                "scope_value": None,
                "rollout_percentage": 100,
                "start_date": None,
                "end_date": None,
                "description": f"Feature flag for {feature_id.replace('_', ' ').title()}",
                "created_at": now,
                "updated_at": now
            }
            default_flags.append(flag)
        
        if default_flags:
            await self.feature_flags.insert_many([d.copy() for d in default_flags])
        
        # Return without _id
        return default_flags
    
    async def get_feature_flag(
        self,
        environment: Environment,
        feature_id: str,
        scope: FeatureFlagScope = FeatureFlagScope.GLOBAL,
        scope_value: Optional[str] = None
    ) -> Optional[Dict]:
        query = {
            "environment": environment.value,
            "feature_id": feature_id,
            "scope": scope.value
        }
        if scope_value:
            query["scope_value"] = scope_value
        
        return await self.feature_flags.find_one(query, {"_id": 0})
    
    async def set_feature_flag(
        self,
        environment: Environment,
        feature_id: str,
        enabled: bool,
        scope: FeatureFlagScope = FeatureFlagScope.GLOBAL,
        scope_value: Optional[str] = None,
        rollout_percentage: int = 100,
        updated_by: str = "admin",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict:
        if feature_id not in FEATURE_FLAGS:
            raise HTTPException(status_code=400, detail=f"Unknown feature: {feature_id}")
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Get existing flag
        existing = await self.get_feature_flag(environment, feature_id, scope, scope_value)
        
        flag_data = {
            "feature_id": feature_id,
            "environment": environment.value,
            "enabled": enabled,
            "scope": scope.value,
            "scope_value": scope_value,
            "rollout_percentage": rollout_percentage,
            "start_date": start_date,
            "end_date": end_date,
            "updated_at": now,
            "updated_by": updated_by
        }
        
        if existing:
            await self.feature_flags.update_one(
                {"id": existing["id"]},
                {"$set": flag_data}
            )
            flag_data["id"] = existing["id"]
        else:
            flag_data["id"] = str(uuid.uuid4())
            flag_data["created_at"] = now
            await self.feature_flags.insert_one(flag_data.copy())
        
        # Log audit
        await self._log_audit(
            action="set_feature_flag",
            category=ConfigCategory.FEATURE_FLAGS,
            config_key=f"{feature_id}:{scope.value}:{scope_value or 'global'}",
            old_value=existing.get("enabled") if existing else None,
            new_value=enabled,
            performed_by=updated_by,
            environment=environment
        )
        
        self._invalidate_cache(environment, "feature_flags")
        return flag_data
    
    async def check_feature_enabled(
        self,
        environment: Environment,
        feature_id: str,
        country_code: Optional[str] = None,
        user_role: Optional[str] = None,
        seller_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict:
        """
        Check if a feature is enabled for a specific context.
        Priority: Seller override > Role > Country > Global
        """
        result = {
            "feature_id": feature_id,
            "enabled": False,
            "source": "default",
            "rollout_percentage": 0
        }
        
        # Check seller-specific override first
        if seller_id:
            seller_flag = await self.get_feature_flag(
                environment, feature_id, FeatureFlagScope.SELLER, seller_id
            )
            if seller_flag:
                result["enabled"] = seller_flag["enabled"]
                result["source"] = f"seller:{seller_id}"
                result["rollout_percentage"] = seller_flag.get("rollout_percentage", 100)
                return result
        
        # Check role-specific
        if user_role:
            role_flag = await self.get_feature_flag(
                environment, feature_id, FeatureFlagScope.ROLE, user_role
            )
            if role_flag:
                result["enabled"] = role_flag["enabled"]
                result["source"] = f"role:{user_role}"
                result["rollout_percentage"] = role_flag.get("rollout_percentage", 100)
                return result
        
        # Check country-specific
        if country_code:
            country_flag = await self.get_feature_flag(
                environment, feature_id, FeatureFlagScope.COUNTRY, country_code
            )
            if country_flag:
                result["enabled"] = country_flag["enabled"]
                result["source"] = f"country:{country_code}"
                result["rollout_percentage"] = country_flag.get("rollout_percentage", 100)
                return result
        
        # Fall back to global
        global_flag = await self.get_feature_flag(
            environment, feature_id, FeatureFlagScope.GLOBAL
        )
        if global_flag:
            enabled = global_flag["enabled"]
            rollout = global_flag.get("rollout_percentage", 100)
            
            # Apply rollout percentage if user_id provided
            if enabled and rollout < 100 and user_id:
                # Deterministic rollout based on user_id hash
                user_hash = int(hashlib.md5(user_id.encode()).hexdigest()[:8], 16)
                enabled = (user_hash % 100) < rollout
            
            result["enabled"] = enabled
            result["source"] = "global"
            result["rollout_percentage"] = rollout
        
        return result
    
    # -------------------------------------------------------------------------
    # COUNTRY CONFIGS
    # -------------------------------------------------------------------------
    
    def _get_default_country_configs(self) -> List[Dict]:
        return [
            {
                "country_code": "US",
                "country_name": "United States",
                "enabled": True,
                "currency_code": "USD",
                "vat_rate": 0,
                "payment_methods": ["card", "paypal"],
                "mobile_money_providers": [],
                "transport_partners": ["fedex", "ups", "usps"],
                "notification_channels": ["push", "email", "sms"],
                "timezone": "America/New_York",
                "phone_prefix": "+1"
            },
            {
                "country_code": "KE",
                "country_name": "Kenya",
                "enabled": True,
                "currency_code": "KES",
                "vat_rate": 16,
                "payment_methods": ["mobile_money", "card"],
                "mobile_money_providers": ["mpesa", "airtel"],
                "transport_partners": ["sendy", "glovo"],
                "notification_channels": ["push", "sms", "whatsapp"],
                "timezone": "Africa/Nairobi",
                "phone_prefix": "+254"
            },
            {
                "country_code": "NG",
                "country_name": "Nigeria",
                "enabled": True,
                "currency_code": "NGN",
                "vat_rate": 7.5,
                "payment_methods": ["mobile_money", "card", "bank_transfer"],
                "mobile_money_providers": ["mtn", "airtel", "opay"],
                "transport_partners": ["gig_logistics", "kwik"],
                "notification_channels": ["push", "sms", "whatsapp"],
                "timezone": "Africa/Lagos",
                "phone_prefix": "+234"
            },
            {
                "country_code": "ZA",
                "country_name": "South Africa",
                "enabled": True,
                "currency_code": "ZAR",
                "vat_rate": 15,
                "payment_methods": ["card", "eft"],
                "mobile_money_providers": [],
                "transport_partners": ["aramex", "dhl"],
                "notification_channels": ["push", "email"],
                "timezone": "Africa/Johannesburg",
                "phone_prefix": "+27"
            },
            {
                "country_code": "GB",
                "country_name": "United Kingdom",
                "enabled": True,
                "currency_code": "GBP",
                "vat_rate": 20,
                "payment_methods": ["card", "paypal"],
                "mobile_money_providers": [],
                "transport_partners": ["royal_mail", "dhl", "dpd"],
                "notification_channels": ["push", "email"],
                "timezone": "Europe/London",
                "phone_prefix": "+44"
            }
        ]
    
    async def get_country_configs(self, environment: Environment) -> List[Dict]:
        configs = await self.country_configs.find(
            {"environment": environment.value},
            {"_id": 0}
        ).to_list(length=300)
        
        if not configs:
            # Initialize defaults
            now = datetime.now(timezone.utc).isoformat()
            defaults = self._get_default_country_configs()
            for config in defaults:
                config["id"] = str(uuid.uuid4())
                config["environment"] = environment.value
                config["created_at"] = now
                config["updated_at"] = now
            
            if defaults:
                await self.country_configs.insert_many([c.copy() for c in defaults])
            configs = defaults
        
        return configs
    
    async def get_country_config(
        self,
        environment: Environment,
        country_code: str
    ) -> Optional[Dict]:
        return await self.country_configs.find_one(
            {"environment": environment.value, "country_code": country_code},
            {"_id": 0}
        )
    
    async def upsert_country_config(
        self,
        environment: Environment,
        country_code: str,
        config_data: Dict,
        updated_by: str
    ) -> Dict:
        now = datetime.now(timezone.utc).isoformat()
        existing = await self.get_country_config(environment, country_code)
        
        config_data["environment"] = environment.value
        config_data["country_code"] = country_code
        config_data["updated_at"] = now
        config_data["updated_by"] = updated_by
        
        if existing:
            await self.country_configs.update_one(
                {"id": existing["id"]},
                {"$set": config_data}
            )
            config_data["id"] = existing["id"]
        else:
            config_data["id"] = str(uuid.uuid4())
            config_data["created_at"] = now
            await self.country_configs.insert_one(config_data.copy())
        
        await self._log_audit(
            action="upsert_country_config",
            category=ConfigCategory.COUNTRY,
            config_key=country_code,
            old_value=existing,
            new_value=config_data,
            performed_by=updated_by,
            environment=environment
        )
        
        return config_data
    
    async def get_config_for_user_location(
        self,
        environment: Environment,
        country_code: str
    ) -> Dict:
        """Get merged config for a user based on their location"""
        global_settings = await self.get_global_settings(environment)
        country_config = await self.get_country_config(environment, country_code)
        
        if not country_config:
            # Return global defaults with default currency
            return {
                "currency_code": global_settings.get("default_currency", "USD"),
                "vat_rate": global_settings.get("default_vat_percentage", 0),
                "payment_methods": ["card"],
                "notification_channels": ["push", "email"],
                "country_enabled": False
            }
        
        return {
            "currency_code": country_config.get("currency_code"),
            "vat_rate": country_config.get("vat_rate", 0),
            "payment_methods": country_config.get("payment_methods", []),
            "mobile_money_providers": country_config.get("mobile_money_providers", []),
            "transport_partners": country_config.get("transport_partners", []),
            "notification_channels": country_config.get("notification_channels", []),
            "timezone": country_config.get("timezone", "UTC"),
            "country_enabled": country_config.get("enabled", True)
        }
    
    # -------------------------------------------------------------------------
    # API KEY MANAGEMENT
    # -------------------------------------------------------------------------
    
    def _mask_key(self, key: str) -> str:
        """Mask API key showing only last 4 characters"""
        if len(key) <= 4:
            return "****"
        return "*" * (len(key) - 4) + key[-4:]
    
    def _encrypt_key(self, key: str) -> str:
        """Simple encryption for storage (in production, use proper encryption)"""
        # In production, use a proper encryption library like cryptography
        import base64
        return base64.b64encode(key.encode()).decode()
    
    def _decrypt_key(self, encrypted: str) -> str:
        """Decrypt stored key"""
        import base64
        return base64.b64decode(encrypted.encode()).decode()
    
    async def get_api_keys(
        self,
        environment: Environment,
        service_name: Optional[str] = None
    ) -> List[Dict]:
        """Get API keys (masked values only)"""
        query = {"environment": environment.value}
        if service_name:
            query["service_name"] = service_name
        
        keys = await self.api_keys.find(query, {"_id": 0, "encrypted_value": 0}).to_list(length=100)
        return keys
    
    async def set_api_key(
        self,
        environment: Environment,
        service_name: str,
        key_type: str,
        key_value: str,
        set_by: str,
        expires_at: Optional[str] = None
    ) -> Dict:
        now = datetime.now(timezone.utc).isoformat()
        
        # Check if key exists
        existing = await self.api_keys.find_one({
            "environment": environment.value,
            "service_name": service_name,
            "key_type": key_type
        })
        
        key_data = {
            "service_name": service_name,
            "key_type": key_type,
            "masked_value": self._mask_key(key_value),
            "encrypted_value": self._encrypt_key(key_value),
            "environment": environment.value,
            "is_active": True,
            "updated_at": now,
            "updated_by": set_by,
            "expires_at": expires_at
        }
        
        if existing:
            await self.api_keys.update_one(
                {"key_id": existing["key_id"]},
                {"$set": key_data}
            )
            key_data["key_id"] = existing["key_id"]
        else:
            key_data["key_id"] = str(uuid.uuid4())
            key_data["created_at"] = now
            key_data["created_by"] = set_by
            await self.api_keys.insert_one(key_data.copy())
        
        # Don't return encrypted value
        key_data.pop("encrypted_value", None)
        
        await self._log_audit(
            action="set_api_key",
            category=ConfigCategory.API_KEYS,
            config_key=f"{service_name}:{key_type}",
            old_value="[REDACTED]",
            new_value="[REDACTED]",
            performed_by=set_by,
            environment=environment
        )
        
        return key_data
    
    async def get_api_key_value(
        self,
        environment: Environment,
        service_name: str,
        key_type: str
    ) -> Optional[str]:
        """Get decrypted API key value (internal use only)"""
        key = await self.api_keys.find_one({
            "environment": environment.value,
            "service_name": service_name,
            "key_type": key_type,
            "is_active": True
        })
        
        if not key:
            return None
        
        # Check expiration
        if key.get("expires_at"):
            if datetime.fromisoformat(key["expires_at"].replace("Z", "+00:00")) < datetime.now(timezone.utc):
                return None
        
        # Update last_used_at
        await self.api_keys.update_one(
            {"key_id": key["key_id"]},
            {"$set": {"last_used_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return self._decrypt_key(key["encrypted_value"])
    
    async def deactivate_api_key(
        self,
        environment: Environment,
        service_name: str,
        key_type: str,
        deactivated_by: str
    ) -> Dict:
        result = await self.api_keys.update_one(
            {
                "environment": environment.value,
                "service_name": service_name,
                "key_type": key_type
            },
            {"$set": {"is_active": False, "deactivated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        await self._log_audit(
            action="deactivate_api_key",
            category=ConfigCategory.API_KEYS,
            config_key=f"{service_name}:{key_type}",
            old_value="active",
            new_value="inactive",
            performed_by=deactivated_by,
            environment=environment
        )
        
        return {"deactivated": result.modified_count > 0}
    
    # -------------------------------------------------------------------------
    # APPROVAL WORKFLOW
    # -------------------------------------------------------------------------
    
    async def _create_approval_request(
        self,
        category: ConfigCategory,
        config_key: str,
        old_value: Any,
        new_value: Any,
        environment: Environment,
        requested_by: str,
        change_notes: str = ""
    ) -> str:
        now = datetime.now(timezone.utc)
        expires_at = (now + timedelta(hours=24)).isoformat()
        
        approval = {
            "id": str(uuid.uuid4()),
            "config_category": category.value,
            "config_key": config_key,
            "old_value": old_value,
            "new_value": new_value,
            "environment": environment.value,
            "requested_by": requested_by,
            "requested_at": now.isoformat(),
            "status": ApprovalStatus.PENDING.value,
            "approved_by": None,
            "approved_at": None,
            "rejection_reason": None,
            "change_notes": change_notes,
            "expires_at": expires_at
        }
        
        await self.approvals.insert_one(approval.copy())
        return approval["id"]
    
    async def get_pending_approvals(
        self,
        environment: Optional[Environment] = None
    ) -> List[Dict]:
        query = {"status": ApprovalStatus.PENDING.value}
        if environment:
            query["environment"] = environment.value
        
        # Filter out expired
        query["expires_at"] = {"$gt": datetime.now(timezone.utc).isoformat()}
        
        return await self.approvals.find(query, {"_id": 0}).sort("requested_at", -1).to_list(length=100)
    
    async def approve_config_change(
        self,
        approval_id: str,
        approved_by: str
    ) -> Dict:
        approval = await self.approvals.find_one({"id": approval_id}, {"_id": 0})
        
        if not approval:
            raise HTTPException(status_code=404, detail="Approval request not found")
        
        if approval["status"] != ApprovalStatus.PENDING.value:
            raise HTTPException(status_code=400, detail=f"Request already {approval['status']}")
        
        if approval["requested_by"] == approved_by:
            raise HTTPException(status_code=400, detail="Cannot approve your own request")
        
        if approval["expires_at"] < datetime.now(timezone.utc).isoformat():
            raise HTTPException(status_code=400, detail="Approval request has expired")
        
        # Update approval status
        now = datetime.now(timezone.utc).isoformat()
        await self.approvals.update_one(
            {"id": approval_id},
            {"$set": {
                "status": ApprovalStatus.APPROVED.value,
                "approved_by": approved_by,
                "approved_at": now
            }}
        )
        
        # Apply the config change
        environment = Environment(approval["environment"])
        category = ConfigCategory(approval["config_category"])
        
        if category == ConfigCategory.GLOBAL:
            await self.update_global_settings(
                environment=environment,
                updates=approval["new_value"],
                updated_by=approved_by,
                change_notes=f"Approved by {approved_by}. Original request by {approval['requested_by']}",
                skip_approval=True
            )
        
        await self._log_audit(
            action="approve_config_change",
            category=category,
            config_key=approval["config_key"],
            old_value=approval["old_value"],
            new_value=approval["new_value"],
            performed_by=approved_by,
            environment=environment
        )
        
        return {"status": "approved", "applied": True}
    
    async def reject_config_change(
        self,
        approval_id: str,
        rejected_by: str,
        reason: str
    ) -> Dict:
        approval = await self.approvals.find_one({"id": approval_id}, {"_id": 0})
        
        if not approval:
            raise HTTPException(status_code=404, detail="Approval request not found")
        
        if approval["status"] != ApprovalStatus.PENDING.value:
            raise HTTPException(status_code=400, detail=f"Request already {approval['status']}")
        
        await self.approvals.update_one(
            {"id": approval_id},
            {"$set": {
                "status": ApprovalStatus.REJECTED.value,
                "approved_by": rejected_by,
                "approved_at": datetime.now(timezone.utc).isoformat(),
                "rejection_reason": reason
            }}
        )
        
        return {"status": "rejected", "reason": reason}
    
    # -------------------------------------------------------------------------
    # VERSIONING & ROLLBACK
    # -------------------------------------------------------------------------
    
    def _compute_checksum(self, data: Dict) -> str:
        """Compute checksum for config data"""
        json_str = json.dumps(data, sort_keys=True)
        return hashlib.sha256(json_str.encode()).hexdigest()[:16]
    
    async def _save_config_version(
        self,
        environment: Environment,
        category: ConfigCategory,
        config_data: Dict,
        created_by: str,
        change_notes: str = ""
    ):
        version_entry = {
            "id": str(uuid.uuid4()),
            "version": config_data.get("version", 1),
            "environment": environment.value,
            "category": category.value,
            "config_data": config_data,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": created_by,
            "change_notes": change_notes,
            "checksum": self._compute_checksum(config_data)
        }
        await self.config_history.insert_one(version_entry)
    
    async def get_config_versions(
        self,
        environment: Environment,
        category: ConfigCategory,
        limit: int = 20
    ) -> List[Dict]:
        return await self.config_history.find(
            {"environment": environment.value, "category": category.value},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(length=limit)
    
    async def rollback_to_version(
        self,
        environment: Environment,
        category: ConfigCategory,
        version: int,
        rolled_back_by: str
    ) -> Dict:
        # Find the version
        version_entry = await self.config_history.find_one({
            "environment": environment.value,
            "category": category.value,
            "version": version
        }, {"_id": 0})
        
        if not version_entry:
            raise HTTPException(status_code=404, detail=f"Version {version} not found")
        
        config_data = version_entry["config_data"]
        
        if category == ConfigCategory.GLOBAL:
            # Save current as new history entry first
            current = await self.get_global_settings(environment)
            await self._save_config_version(
                environment, category, current, rolled_back_by,
                f"Pre-rollback backup before reverting to v{version}"
            )
            
            # Apply rollback
            new_version = current.get("version", 1) + 1
            config_data["version"] = new_version
            config_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            config_data["updated_by"] = rolled_back_by
            config_data["rolled_back_from"] = version
            
            await self.global_config.replace_one(
                {"environment": environment.value},
                config_data
            )
            
            self._invalidate_cache(environment, "global")
        
        await self._log_audit(
            action="rollback",
            category=category,
            config_key=f"v{version}",
            old_value={"version": current.get("version")},
            new_value={"version": new_version, "rolled_back_from": version},
            performed_by=rolled_back_by,
            environment=environment
        )
        
        return config_data
    
    # -------------------------------------------------------------------------
    # PREVIEW & SIMULATION
    # -------------------------------------------------------------------------
    
    async def preview_config_change(
        self,
        environment: Environment,
        category: ConfigCategory,
        changes: Dict[str, Any]
    ) -> Dict:
        """Preview what config would look like after changes (without saving)"""
        if category == ConfigCategory.GLOBAL:
            current = await self.get_global_settings(environment)
        elif category == ConfigCategory.FEATURE_FLAGS:
            current = {"flags": await self.get_feature_flags(environment)}
        elif category == ConfigCategory.COUNTRY:
            current = {"countries": await self.get_country_configs(environment)}
        else:
            current = {}
        
        # Deep merge changes
        preview = {**current}
        for key, value in changes.items():
            if isinstance(value, dict) and isinstance(preview.get(key), dict):
                preview[key] = {**preview[key], **value}
            else:
                preview[key] = value
        
        # Add metadata
        preview["_preview"] = True
        preview["_changes_applied"] = list(changes.keys())
        
        return preview
    
    async def simulate_user_experience(
        self,
        environment: Environment,
        country_code: str,
        user_role: str = "user",
        seller_id: Optional[str] = None
    ) -> Dict:
        """Simulate what config a user would see based on their context"""
        global_settings = await self.get_global_settings(environment)
        country_config = await self.get_config_for_user_location(environment, country_code)
        
        # Check all feature flags
        feature_states = {}
        for feature_id in FEATURE_FLAGS:
            result = await self.check_feature_enabled(
                environment, feature_id, country_code, user_role, seller_id
            )
            feature_states[feature_id] = result
        
        return {
            "simulation": True,
            "context": {
                "environment": environment.value,
                "country_code": country_code,
                "user_role": user_role,
                "seller_id": seller_id
            },
            "global_settings": {
                "platform_name": global_settings.get("platform_name"),
                "commission_percentage": global_settings.get("commission_percentage"),
                "escrow_duration_days": global_settings.get("escrow_duration_days")
            },
            "country_config": country_config,
            "feature_flags": feature_states
        }
    
    # -------------------------------------------------------------------------
    # HEALTH CHECK & EXPORT
    # -------------------------------------------------------------------------
    
    async def health_check(self, environment: Environment) -> Dict:
        """Check config service health"""
        warnings = []
        checks = {}
        
        try:
            # Check global config
            global_config = await self.get_global_settings(environment)
            checks["global_config"] = bool(global_config)
            
            # Check feature flags
            flags = await self.get_feature_flags(environment)
            checks["feature_flags"] = len(flags) > 0
            if len(flags) < len(FEATURE_FLAGS):
                warnings.append(f"Only {len(flags)}/{len(FEATURE_FLAGS)} feature flags configured")
            
            # Check country configs
            countries = await self.get_country_configs(environment)
            checks["country_configs"] = len(countries) > 0
            
            # Check for expired API keys
            expired_keys = await self.api_keys.count_documents({
                "environment": environment.value,
                "is_active": True,
                "expires_at": {"$lt": datetime.now(timezone.utc).isoformat()}
            })
            checks["no_expired_keys"] = expired_keys == 0
            if expired_keys > 0:
                warnings.append(f"{expired_keys} API keys have expired")
            
            # Check pending approvals
            pending = await self.get_pending_approvals(environment)
            if len(pending) > 5:
                warnings.append(f"{len(pending)} config changes pending approval")
            checks["approvals_manageable"] = len(pending) <= 5
            
            # Determine overall status
            all_passed = all(checks.values())
            has_warnings = len(warnings) > 0
            
            if all_passed and not has_warnings:
                status = "healthy"
            elif all_passed:
                status = "degraded"
            else:
                status = "unhealthy"
            
            return {
                "status": status,
                "environment": environment.value,
                "checks": checks,
                "warnings": warnings,
                "last_check": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                "status": "unhealthy",
                "environment": environment.value,
                "checks": {"service_available": False},
                "warnings": [str(e)],
                "last_check": datetime.now(timezone.utc).isoformat()
            }
    
    async def export_config(
        self,
        environment: Environment,
        categories: Optional[List[ConfigCategory]] = None
    ) -> Dict:
        """Export configuration as JSON"""
        export_data = {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "environment": environment.value,
            "version": "1.0"
        }
        
        categories = categories or list(ConfigCategory)
        
        if ConfigCategory.GLOBAL in categories:
            export_data["global_settings"] = await self.get_global_settings(environment)
        
        if ConfigCategory.FEATURE_FLAGS in categories:
            export_data["feature_flags"] = await self.get_feature_flags(environment)
        
        if ConfigCategory.COUNTRY in categories:
            export_data["country_configs"] = await self.get_country_configs(environment)
        
        if ConfigCategory.API_KEYS in categories:
            # Export only metadata, not actual keys
            export_data["api_keys"] = await self.get_api_keys(environment)
        
        return export_data


# =========================================================================
# API ROUTER
# =========================================================================

def create_config_manager_router(db):
    """Create config manager router"""
    router = APIRouter(prefix="/config-manager", tags=["Config & Environment Manager"])
    service = ConfigManagerService(db)
    
    # -------------------------------------------------------------------------
    # GLOBAL SETTINGS
    # -------------------------------------------------------------------------
    
    @router.get("/global/{environment}")
    async def get_global_settings(environment: Environment):
        """Get global platform settings"""
        return await service.get_global_settings(environment)
    
    @router.put("/global/{environment}")
    async def update_global_settings(
        environment: Environment,
        updates: Dict[str, Any] = Body(...),
        updated_by: str = Body("admin"),
        change_notes: str = Body("")
    ):
        """Update global settings (critical changes require approval)"""
        return await service.update_global_settings(
            environment, updates, updated_by, change_notes
        )
    
    # -------------------------------------------------------------------------
    # FEATURE FLAGS
    # -------------------------------------------------------------------------
    
    @router.get("/available-features")
    async def get_available_features():
        """Get list of all available feature flags and roles"""
        return {"features": FEATURE_FLAGS, "roles": USER_ROLES}
    
    @router.get("/features/{environment}")
    async def get_feature_flags(
        environment: Environment,
        scope: Optional[FeatureFlagScope] = None,
        scope_value: Optional[str] = None
    ):
        """Get all feature flags"""
        return await service.get_feature_flags(environment, scope, scope_value)
    
    @router.get("/features/{environment}/{feature_id}")
    async def get_feature_flag(
        environment: Environment,
        feature_id: str,
        scope: FeatureFlagScope = FeatureFlagScope.GLOBAL,
        scope_value: Optional[str] = None
    ):
        """Get specific feature flag"""
        flag = await service.get_feature_flag(environment, feature_id, scope, scope_value)
        if not flag:
            raise HTTPException(status_code=404, detail="Feature flag not found")
        return flag
    
    @router.put("/features/{environment}/{feature_id}")
    async def set_feature_flag(
        environment: Environment,
        feature_id: str,
        enabled: bool = Body(...),
        scope: FeatureFlagScope = Body(FeatureFlagScope.GLOBAL),
        scope_value: Optional[str] = Body(None),
        rollout_percentage: int = Body(100),
        updated_by: str = Body("admin"),
        start_date: Optional[str] = Body(None),
        end_date: Optional[str] = Body(None)
    ):
        """Set feature flag"""
        return await service.set_feature_flag(
            environment, feature_id, enabled, scope, scope_value,
            rollout_percentage, updated_by, start_date, end_date
        )
    
    @router.get("/features/{environment}/check/{feature_id}")
    async def check_feature_enabled(
        environment: Environment,
        feature_id: str,
        country_code: Optional[str] = None,
        user_role: Optional[str] = None,
        seller_id: Optional[str] = None,
        user_id: Optional[str] = None
    ):
        """Check if feature is enabled for given context"""
        return await service.check_feature_enabled(
            environment, feature_id, country_code, user_role, seller_id, user_id
        )
    
    # -------------------------------------------------------------------------
    # COUNTRY CONFIGS
    # -------------------------------------------------------------------------
    
    @router.get("/countries/{environment}")
    async def get_country_configs(environment: Environment):
        """Get all country configurations"""
        return await service.get_country_configs(environment)
    
    @router.get("/countries/{environment}/{country_code}")
    async def get_country_config(environment: Environment, country_code: str):
        """Get specific country configuration"""
        config = await service.get_country_config(environment, country_code)
        if not config:
            raise HTTPException(status_code=404, detail="Country config not found")
        return config
    
    @router.put("/countries/{environment}/{country_code}")
    async def upsert_country_config(
        environment: Environment,
        country_code: str,
        config_data: Dict = Body(...),
        updated_by: str = Body("admin")
    ):
        """Create or update country configuration"""
        return await service.upsert_country_config(
            environment, country_code, config_data, updated_by
        )
    
    @router.get("/countries/{environment}/{country_code}/user-config")
    async def get_user_location_config(
        environment: Environment,
        country_code: str
    ):
        """Get merged config for user based on location"""
        return await service.get_config_for_user_location(environment, country_code)
    
    # -------------------------------------------------------------------------
    # API KEYS
    # -------------------------------------------------------------------------
    
    @router.get("/api-keys/{environment}")
    async def get_api_keys(
        environment: Environment,
        service_name: Optional[str] = None
    ):
        """Get API keys (masked values)"""
        return await service.get_api_keys(environment, service_name)
    
    @router.post("/api-keys/{environment}")
    async def set_api_key(
        environment: Environment,
        service_name: str = Body(...),
        key_type: str = Body(...),
        key_value: str = Body(...),
        set_by: str = Body("admin"),
        expires_at: Optional[str] = Body(None)
    ):
        """Set or update an API key"""
        return await service.set_api_key(
            environment, service_name, key_type, key_value, set_by, expires_at
        )
    
    @router.delete("/api-keys/{environment}/{service_name}/{key_type}")
    async def deactivate_api_key(
        environment: Environment,
        service_name: str,
        key_type: str,
        deactivated_by: str = Query("admin")
    ):
        """Deactivate an API key"""
        return await service.deactivate_api_key(
            environment, service_name, key_type, deactivated_by
        )
    
    # -------------------------------------------------------------------------
    # APPROVALS
    # -------------------------------------------------------------------------
    
    @router.get("/approvals/pending")
    async def get_pending_approvals(environment: Optional[Environment] = None):
        """Get pending approval requests"""
        return await service.get_pending_approvals(environment)
    
    @router.post("/approvals/{approval_id}/approve")
    async def approve_config_change(
        approval_id: str,
        approved_by: str = Body(..., embed=True)
    ):
        """Approve a config change (must be different admin)"""
        return await service.approve_config_change(approval_id, approved_by)
    
    @router.post("/approvals/{approval_id}/reject")
    async def reject_config_change(
        approval_id: str,
        rejected_by: str = Body(...),
        reason: str = Body(...)
    ):
        """Reject a config change"""
        return await service.reject_config_change(approval_id, rejected_by, reason)
    
    # -------------------------------------------------------------------------
    # VERSIONING & ROLLBACK
    # -------------------------------------------------------------------------
    
    @router.get("/history/{environment}/{category}")
    async def get_config_versions(
        environment: Environment,
        category: ConfigCategory,
        limit: int = Query(20, ge=1, le=100)
    ):
        """Get config version history"""
        return await service.get_config_versions(environment, category, limit)
    
    @router.post("/rollback/{environment}/{category}")
    async def rollback_to_version(
        environment: Environment,
        category: ConfigCategory,
        version: int = Body(..., embed=True),
        rolled_back_by: str = Body("admin", embed=True)
    ):
        """Rollback to a previous config version"""
        return await service.rollback_to_version(
            environment, category, version, rolled_back_by
        )
    
    # -------------------------------------------------------------------------
    # PREVIEW & SIMULATION
    # -------------------------------------------------------------------------
    
    @router.post("/preview/{environment}/{category}")
    async def preview_config_change(
        environment: Environment,
        category: ConfigCategory,
        changes: Dict[str, Any] = Body(...)
    ):
        """Preview config changes without saving"""
        return await service.preview_config_change(environment, category, changes)
    
    @router.get("/simulate/{environment}")
    async def simulate_user_experience(
        environment: Environment,
        country_code: str,
        user_role: str = "user",
        seller_id: Optional[str] = None
    ):
        """Simulate user experience with current config"""
        return await service.simulate_user_experience(
            environment, country_code, user_role, seller_id
        )
    
    # -------------------------------------------------------------------------
    # HEALTH & EXPORT
    # -------------------------------------------------------------------------
    
    @router.get("/health/{environment}")
    async def health_check(environment: Environment):
        """Check config service health"""
        return await service.health_check(environment)
    
    @router.get("/export/{environment}")
    async def export_config(
        environment: Environment,
        categories: Optional[str] = Query(None, description="Comma-separated categories")
    ):
        """Export configuration as JSON"""
        cat_list = None
        if categories:
            cat_list = [ConfigCategory(c.strip()) for c in categories.split(",")]
        return await service.export_config(environment, cat_list)
    
    # -------------------------------------------------------------------------
    # AUDIT LOGS
    # -------------------------------------------------------------------------
    
    @router.get("/audit-logs")
    async def get_audit_logs(
        environment: Optional[Environment] = None,
        category: Optional[ConfigCategory] = None,
        performed_by: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = Query(100, ge=1, le=500),
        skip: int = Query(0, ge=0)
    ):
        """Get config audit logs"""
        return await service.get_audit_logs(
            environment, category, performed_by, start_date, end_date, limit, skip
        )
    
    return router, service
