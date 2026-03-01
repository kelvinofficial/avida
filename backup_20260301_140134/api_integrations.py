"""
Third-Party API Integrations Manager
Centralized management for external API integrations with:
- Encrypted secrets vault (AES-256)
- Provider abstraction layer
- Webhook management
- Country/feature routing
- Monitoring & logs
"""

from fastapi import APIRouter, HTTPException, Body, Query, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional, Literal
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid
import os
import json
import logging
import base64
import hashlib
import hmac
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import pad, unpad

logger = logging.getLogger(__name__)

# =========================================================================
# ENCRYPTION UTILITIES
# =========================================================================

class SecretsVault:
    """AES-256 encrypted secrets vault"""
    
    def __init__(self, master_key: Optional[str] = None):
        # Use environment variable or generate a default key
        key_source = master_key or os.environ.get('INTEGRATIONS_MASTER_KEY', 'default-dev-key-change-in-production')
        # Derive 32-byte key using SHA-256
        self.key = hashlib.sha256(key_source.encode()).digest()
    
    def encrypt(self, plaintext: str) -> str:
        """Encrypt a string using AES-256-CBC"""
        if not plaintext:
            return ""
        
        iv = get_random_bytes(16)
        cipher = AES.new(self.key, AES.MODE_CBC, iv)
        padded_data = pad(plaintext.encode('utf-8'), AES.block_size)
        encrypted = cipher.encrypt(padded_data)
        
        # Return IV + encrypted data as base64
        return base64.b64encode(iv + encrypted).decode('utf-8')
    
    def decrypt(self, ciphertext: str) -> str:
        """Decrypt an AES-256-CBC encrypted string"""
        if not ciphertext:
            return ""
        
        try:
            data = base64.b64decode(ciphertext)
            iv = data[:16]
            encrypted = data[16:]
            
            cipher = AES.new(self.key, AES.MODE_CBC, iv)
            decrypted = unpad(cipher.decrypt(encrypted), AES.block_size)
            
            return decrypted.decode('utf-8')
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            return ""
    
    def mask(self, value: str, visible_chars: int = 4) -> str:
        """Mask a secret value for display"""
        if not value or len(value) <= visible_chars:
            return "****"
        return "*" * (len(value) - visible_chars) + value[-visible_chars:]


# =========================================================================
# ENUMS & CONSTANTS
# =========================================================================

class Environment(str, Enum):
    PRODUCTION = "production"
    SANDBOX = "sandbox"
    STAGING = "staging"

class IntegrationStatus(str, Enum):
    CONNECTED = "connected"
    ERROR = "error"
    DISABLED = "disabled"
    NOT_CONFIGURED = "not_configured"

class IntegrationCategory(str, Enum):
    MESSAGING = "messaging"
    EMAIL = "email"
    PAYMENTS = "payments"
    ANALYTICS = "analytics"
    AI_SERVICES = "ai_services"
    PUSH_NOTIFICATIONS = "push_notifications"
    OTHER = "other"

class WebhookStatus(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"
    PENDING = "pending"
    RETRYING = "retrying"

# Provider definitions
INTEGRATION_PROVIDERS = {
    # Messaging
    "twilio_sms": {
        "name": "Twilio SMS",
        "category": IntegrationCategory.MESSAGING,
        "description": "Send SMS messages via Twilio",
        "required_fields": ["account_sid", "auth_token", "sender_number"],
        "optional_fields": ["webhook_url", "status_callback_url"],
        "supports_test": True,
        "icon": "message-square"
    },
    "twilio_whatsapp": {
        "name": "Twilio WhatsApp",
        "category": IntegrationCategory.MESSAGING,
        "description": "Send WhatsApp messages via Twilio",
        "required_fields": ["account_sid", "auth_token", "whatsapp_number"],
        "optional_fields": ["webhook_url", "templates"],
        "supports_test": True,
        "icon": "message-circle"
    },
    "local_sms_gateway": {
        "name": "Local SMS Gateway",
        "category": IntegrationCategory.MESSAGING,
        "description": "Africa-ready local SMS provider",
        "required_fields": ["api_key", "api_secret", "sender_id"],
        "optional_fields": ["base_url", "webhook_url"],
        "supports_test": True,
        "icon": "radio"
    },
    
    # Email
    "mailchimp": {
        "name": "Mailchimp",
        "category": IntegrationCategory.EMAIL,
        "description": "Email campaigns & marketing automation",
        "required_fields": ["api_key", "server_prefix"],
        "optional_fields": ["audience_id", "field_mappings"],
        "supports_test": True,
        "icon": "mail"
    },
    "smtp": {
        "name": "SMTP Email",
        "category": IntegrationCategory.EMAIL,
        "description": "Transactional email via SMTP",
        "required_fields": ["host", "port", "username", "password"],
        "optional_fields": ["from_email", "from_name", "use_tls"],
        "supports_test": True,
        "icon": "send"
    },
    "sendgrid": {
        "name": "SendGrid",
        "category": IntegrationCategory.EMAIL,
        "description": "Transactional & marketing email",
        "required_fields": ["api_key"],
        "optional_fields": ["from_email", "from_name", "templates"],
        "supports_test": True,
        "icon": "at-sign"
    },
    
    # Payments
    "stripe": {
        "name": "Stripe",
        "category": IntegrationCategory.PAYMENTS,
        "description": "Card payments processing",
        "required_fields": ["secret_key", "publishable_key"],
        "optional_fields": ["webhook_secret", "account_id"],
        "supports_test": True,
        "icon": "credit-card"
    },
    "paypal": {
        "name": "PayPal",
        "category": IntegrationCategory.PAYMENTS,
        "description": "PayPal payments",
        "required_fields": ["client_id", "client_secret"],
        "optional_fields": ["webhook_id", "mode"],
        "supports_test": True,
        "icon": "dollar-sign"
    },
    "mobile_money": {
        "name": "Mobile Money",
        "category": IntegrationCategory.PAYMENTS,
        "description": "Mobile money providers (M-Pesa, etc.)",
        "required_fields": ["api_key", "api_secret", "shortcode"],
        "optional_fields": ["callback_url", "timeout_url", "provider"],
        "supports_test": True,
        "icon": "smartphone"
    },
    
    # Analytics
    "google_analytics": {
        "name": "Google Analytics",
        "category": IntegrationCategory.ANALYTICS,
        "description": "Website & app analytics",
        "required_fields": ["measurement_id"],
        "optional_fields": ["api_secret", "stream_id"],
        "supports_test": False,
        "icon": "bar-chart-2"
    },
    "mixpanel": {
        "name": "Mixpanel",
        "category": IntegrationCategory.ANALYTICS,
        "description": "Product analytics",
        "required_fields": ["token", "api_secret"],
        "optional_fields": ["project_id"],
        "supports_test": True,
        "icon": "activity"
    },
    
    # AI Services
    "openai": {
        "name": "OpenAI",
        "category": IntegrationCategory.AI_SERVICES,
        "description": "GPT & AI services",
        "required_fields": ["api_key"],
        "optional_fields": ["organization_id", "model"],
        "supports_test": True,
        "icon": "cpu"
    },
    "google_vision": {
        "name": "Google Vision",
        "category": IntegrationCategory.AI_SERVICES,
        "description": "Image analysis & OCR",
        "required_fields": ["api_key"],
        "optional_fields": ["project_id"],
        "supports_test": True,
        "icon": "eye"
    },
    
    # Push Notifications
    "firebase_fcm": {
        "name": "Firebase FCM",
        "category": IntegrationCategory.PUSH_NOTIFICATIONS,
        "description": "Push notifications via Firebase",
        "required_fields": ["server_key", "sender_id"],
        "optional_fields": ["project_id", "service_account_json"],
        "supports_test": True,
        "icon": "bell"
    },
    "onesignal": {
        "name": "OneSignal",
        "category": IntegrationCategory.PUSH_NOTIFICATIONS,
        "description": "Cross-platform push notifications",
        "required_fields": ["app_id", "api_key"],
        "optional_fields": ["user_auth_key"],
        "supports_test": True,
        "icon": "bell-ring"
    },
    
    # Other
    "transport_api": {
        "name": "Transport Partner API",
        "category": IntegrationCategory.OTHER,
        "description": "Delivery & logistics integration",
        "required_fields": ["api_key"],
        "optional_fields": ["base_url", "webhook_url"],
        "supports_test": True,
        "icon": "truck"
    },
}


# =========================================================================
# PYDANTIC MODELS
# =========================================================================

class IntegrationCredentials(BaseModel):
    """Encrypted credentials for an integration"""
    fields: Dict[str, str] = Field(default_factory=dict)
    encrypted: bool = True

class IntegrationConfig(BaseModel):
    """Configuration for a single integration"""
    provider_id: str
    environment: Environment
    enabled: bool = False
    credentials: Dict[str, str] = Field(default_factory=dict)
    settings: Dict[str, Any] = Field(default_factory=dict)
    status: IntegrationStatus = IntegrationStatus.NOT_CONFIGURED
    last_checked: Optional[str] = None
    last_error: Optional[str] = None
    created_at: str
    updated_at: str
    updated_by: str

class WebhookConfig(BaseModel):
    """Webhook endpoint configuration"""
    id: str
    name: str
    provider_id: str
    url: str
    secret: Optional[str] = None
    enabled: bool = True
    events: List[str] = Field(default_factory=list)
    created_at: str
    updated_at: str

class WebhookLog(BaseModel):
    """Log entry for webhook execution"""
    id: str
    webhook_id: str
    direction: Literal["incoming", "outgoing"]
    url: str
    method: str
    headers: Dict[str, str] = Field(default_factory=dict)
    payload: Dict[str, Any] = Field(default_factory=dict)
    response_status: Optional[int] = None
    response_body: Optional[str] = None
    status: WebhookStatus
    error_message: Optional[str] = None
    retry_count: int = 0
    environment: Environment
    created_at: str

class FeatureRouting(BaseModel):
    """Routing configuration for features"""
    feature: str  # e.g., "sms_alerts", "delivery_updates", "marketing_emails"
    country_code: Optional[str] = None  # None for global
    primary_provider: str
    fallback_provider: Optional[str] = None
    enabled: bool = True

class AuditLogEntry(BaseModel):
    """Audit log for integration changes"""
    id: str
    action: str
    provider_id: Optional[str] = None
    environment: Environment
    changes: Dict[str, Any] = Field(default_factory=dict)
    performed_by: str
    performed_at: str
    ip_address: Optional[str] = None


# =========================================================================
# SERVICE CLASS
# =========================================================================

class IntegrationsManagerService:
    """Third-Party API Integrations Manager Service"""
    
    def __init__(self, db):
        self.db = db
        self.vault = SecretsVault()
        
        # Collections
        self.integrations_collection = db.api_integrations
        self.webhooks_collection = db.api_webhooks
        self.webhook_logs_collection = db.api_webhook_logs
        self.routing_collection = db.api_routing
        self.audit_collection = db.api_integrations_audit
        self.metrics_collection = db.api_metrics
        
        # Provider instances cache
        self._providers: Dict[str, Any] = {}
    
    # -------------------------------------------------------------------------
    # AUDIT LOGGING
    # -------------------------------------------------------------------------
    
    async def _log_audit(
        self,
        action: str,
        provider_id: Optional[str],
        environment: Environment,
        changes: Dict[str, Any],
        performed_by: str,
        ip_address: Optional[str] = None
    ):
        """Log all integration changes"""
        # Mask any sensitive values in changes
        masked_changes = {}
        for key, value in changes.items():
            if any(s in key.lower() for s in ['key', 'secret', 'token', 'password']):
                masked_changes[key] = self.vault.mask(str(value)) if value else None
            else:
                masked_changes[key] = value
        
        entry = {
            "id": str(uuid.uuid4()),
            "action": action,
            "provider_id": provider_id,
            "environment": environment.value,
            "changes": masked_changes,
            "performed_by": performed_by,
            "performed_at": datetime.now(timezone.utc).isoformat(),
            "ip_address": ip_address
        }
        await self.audit_collection.insert_one(entry)
        logger.info(f"Audit: {action} on {provider_id} ({environment.value}) by {performed_by}")
    
    async def get_audit_logs(
        self,
        provider_id: Optional[str] = None,
        environment: Optional[Environment] = None,
        limit: int = 100,
        skip: int = 0
    ) -> List[Dict]:
        """Get audit logs"""
        query = {}
        if provider_id:
            query["provider_id"] = provider_id
        if environment:
            query["environment"] = environment.value
        
        cursor = self.audit_collection.find(
            query, {"_id": 0}
        ).sort("performed_at", -1).skip(skip).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    # -------------------------------------------------------------------------
    # INTEGRATION MANAGEMENT
    # -------------------------------------------------------------------------
    
    def get_available_providers(self) -> Dict[str, Any]:
        """Get all available integration providers"""
        return INTEGRATION_PROVIDERS
    
    async def get_integration(
        self,
        provider_id: str,
        environment: Environment
    ) -> Optional[Dict]:
        """Get integration configuration"""
        integration = await self.integrations_collection.find_one(
            {"provider_id": provider_id, "environment": environment.value},
            {"_id": 0}
        )
        
        if integration:
            # Mask credentials for response
            if integration.get("credentials"):
                masked_creds = {}
                for key, value in integration["credentials"].items():
                    decrypted = self.vault.decrypt(value) if value else ""
                    masked_creds[key] = self.vault.mask(decrypted)
                integration["credentials_masked"] = masked_creds
                del integration["credentials"]  # Remove encrypted values from response
        
        return integration
    
    async def get_all_integrations(
        self,
        environment: Environment,
        category: Optional[IntegrationCategory] = None
    ) -> List[Dict]:
        """Get all integrations for an environment"""
        query = {"environment": environment.value}
        
        cursor = self.integrations_collection.find(query, {"_id": 0})
        integrations = await cursor.to_list(length=100)
        
        # Build response with provider info
        result = []
        for provider_id, provider_info in INTEGRATION_PROVIDERS.items():
            if category and provider_info["category"] != category:
                continue
            
            # Find existing config
            config = next(
                (i for i in integrations if i.get("provider_id") == provider_id),
                None
            )
            
            item = {
                "provider_id": provider_id,
                **provider_info,
                "category": provider_info["category"].value,
                "environment": environment.value,
                "enabled": config.get("enabled", False) if config else False,
                "status": config.get("status", IntegrationStatus.NOT_CONFIGURED.value) if config else IntegrationStatus.NOT_CONFIGURED.value,
                "last_checked": config.get("last_checked") if config else None,
                "last_error": config.get("last_error") if config else None,
                "configured": config is not None,
            }
            
            # Add masked credentials if configured
            if config and config.get("credentials"):
                masked_creds = {}
                for key, value in config["credentials"].items():
                    decrypted = self.vault.decrypt(value) if value else ""
                    masked_creds[key] = self.vault.mask(decrypted) if decrypted else ""
                item["credentials_masked"] = masked_creds
            
            result.append(item)
        
        return result
    
    async def configure_integration(
        self,
        provider_id: str,
        environment: Environment,
        credentials: Dict[str, str],
        settings: Dict[str, Any],
        enabled: bool,
        configured_by: str
    ) -> Dict:
        """Configure or update an integration"""
        if provider_id not in INTEGRATION_PROVIDERS:
            raise HTTPException(status_code=400, detail=f"Unknown provider: {provider_id}")
        
        provider = INTEGRATION_PROVIDERS[provider_id]
        
        # Validate required fields
        for field in provider["required_fields"]:
            if field not in credentials or not credentials[field]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required field: {field}"
                )
        
        # Encrypt credentials
        encrypted_creds = {}
        for key, value in credentials.items():
            if value:
                encrypted_creds[key] = self.vault.encrypt(value)
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Check if exists
        existing = await self.integrations_collection.find_one(
            {"provider_id": provider_id, "environment": environment.value}
        )
        
        config = {
            "provider_id": provider_id,
            "environment": environment.value,
            "enabled": enabled,
            "credentials": encrypted_creds,
            "settings": settings,
            "status": IntegrationStatus.NOT_CONFIGURED.value,
            "last_checked": None,
            "last_error": None,
            "updated_at": now,
            "updated_by": configured_by
        }
        
        if existing:
            await self.integrations_collection.update_one(
                {"provider_id": provider_id, "environment": environment.value},
                {"$set": config}
            )
            action = "update_integration"
        else:
            config["created_at"] = now
            await self.integrations_collection.insert_one(config)
            action = "create_integration"
        
        # Log audit
        await self._log_audit(
            action=action,
            provider_id=provider_id,
            environment=environment,
            changes={"enabled": enabled, "credentials_updated": True},
            performed_by=configured_by
        )
        
        # Test connection
        await self.test_connection(provider_id, environment)
        
        return await self.get_integration(provider_id, environment)
    
    async def toggle_integration(
        self,
        provider_id: str,
        environment: Environment,
        enabled: bool,
        toggled_by: str
    ) -> Dict:
        """Enable or disable an integration"""
        result = await self.integrations_collection.update_one(
            {"provider_id": provider_id, "environment": environment.value},
            {
                "$set": {
                    "enabled": enabled,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "updated_by": toggled_by
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Integration not found")
        
        await self._log_audit(
            action="toggle_integration",
            provider_id=provider_id,
            environment=environment,
            changes={"enabled": enabled},
            performed_by=toggled_by
        )
        
        return await self.get_integration(provider_id, environment)
    
    async def delete_integration(
        self,
        provider_id: str,
        environment: Environment,
        deleted_by: str
    ):
        """Delete an integration configuration"""
        result = await self.integrations_collection.delete_one(
            {"provider_id": provider_id, "environment": environment.value}
        )
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Integration not found")
        
        await self._log_audit(
            action="delete_integration",
            provider_id=provider_id,
            environment=environment,
            changes={"deleted": True},
            performed_by=deleted_by
        )
    
    async def get_decrypted_credentials(
        self,
        provider_id: str,
        environment: Environment
    ) -> Dict[str, str]:
        """Get decrypted credentials (internal use only)"""
        integration = await self.integrations_collection.find_one(
            {"provider_id": provider_id, "environment": environment.value},
            {"_id": 0, "credentials": 1}
        )
        
        if not integration or not integration.get("credentials"):
            return {}
        
        decrypted = {}
        for key, value in integration["credentials"].items():
            decrypted[key] = self.vault.decrypt(value) if value else ""
        
        return decrypted
    
    # -------------------------------------------------------------------------
    # CONNECTION TESTING
    # -------------------------------------------------------------------------
    
    async def test_connection(
        self,
        provider_id: str,
        environment: Environment
    ) -> Dict:
        """Test connection to a provider"""
        credentials = await self.get_decrypted_credentials(provider_id, environment)
        
        if not credentials:
            return {
                "success": False,
                "status": IntegrationStatus.NOT_CONFIGURED.value,
                "message": "No credentials configured"
            }
        
        try:
            result = await self._test_provider_connection(provider_id, credentials)
            
            # Update status
            status = IntegrationStatus.CONNECTED if result["success"] else IntegrationStatus.ERROR
            await self.integrations_collection.update_one(
                {"provider_id": provider_id, "environment": environment.value},
                {
                    "$set": {
                        "status": status.value,
                        "last_checked": datetime.now(timezone.utc).isoformat(),
                        "last_error": None if result["success"] else result.get("message")
                    }
                }
            )
            
            return {
                "success": result["success"],
                "status": status.value,
                "message": result.get("message", "Connection successful" if result["success"] else "Connection failed")
            }
            
        except Exception as e:
            logger.error(f"Connection test failed for {provider_id}: {e}")
            
            await self.integrations_collection.update_one(
                {"provider_id": provider_id, "environment": environment.value},
                {
                    "$set": {
                        "status": IntegrationStatus.ERROR.value,
                        "last_checked": datetime.now(timezone.utc).isoformat(),
                        "last_error": str(e)
                    }
                }
            )
            
            return {
                "success": False,
                "status": IntegrationStatus.ERROR.value,
                "message": str(e)
            }
    
    async def _test_provider_connection(
        self,
        provider_id: str,
        credentials: Dict[str, str]
    ) -> Dict:
        """Test connection to specific provider"""
        
        if provider_id == "twilio_sms" or provider_id == "twilio_whatsapp":
            return await self._test_twilio(credentials)
        
        elif provider_id == "mailchimp":
            return await self._test_mailchimp(credentials)
        
        elif provider_id == "sendgrid":
            return await self._test_sendgrid(credentials)
        
        elif provider_id == "stripe":
            return await self._test_stripe(credentials)
        
        elif provider_id == "openai":
            return await self._test_openai(credentials)
        
        # Default: assume success if credentials exist
        return {"success": True, "message": "Credentials configured"}
    
    async def _test_twilio(self, credentials: Dict[str, str]) -> Dict:
        """Test Twilio connection"""
        try:
            from twilio.rest import Client
            client = Client(credentials.get("account_sid"), credentials.get("auth_token"))
            # Fetch account to verify credentials
            account = client.api.accounts(credentials.get("account_sid")).fetch()
            return {
                "success": True,
                "message": f"Connected to account: {account.friendly_name}"
            }
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    async def _test_mailchimp(self, credentials: Dict[str, str]) -> Dict:
        """Test Mailchimp connection"""
        try:
            import mailchimp_marketing as MailchimpMarketing
            client = MailchimpMarketing.Client()
            client.set_config({
                "api_key": credentials.get("api_key"),
                "server": credentials.get("server_prefix")
            })
            response = client.ping.get()
            return {
                "success": True,
                "message": f"Connected: {response.get('health_status', 'OK')}"
            }
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    async def _test_sendgrid(self, credentials: Dict[str, str]) -> Dict:
        """Test SendGrid connection"""
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.sendgrid.com/v3/user/profile",
                    headers={"Authorization": f"Bearer {credentials.get('api_key')}"}
                )
                if response.status_code == 200:
                    return {"success": True, "message": "Connected to SendGrid"}
                return {"success": False, "message": f"HTTP {response.status_code}"}
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    async def _test_stripe(self, credentials: Dict[str, str]) -> Dict:
        """Test Stripe connection"""
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.stripe.com/v1/balance",
                    auth=(credentials.get("secret_key"), "")
                )
                if response.status_code == 200:
                    return {"success": True, "message": "Connected to Stripe"}
                return {"success": False, "message": f"HTTP {response.status_code}"}
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    async def _test_openai(self, credentials: Dict[str, str]) -> Dict:
        """Test OpenAI connection"""
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {credentials.get('api_key')}"}
                )
                if response.status_code == 200:
                    return {"success": True, "message": "Connected to OpenAI"}
                return {"success": False, "message": f"HTTP {response.status_code}"}
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    # -------------------------------------------------------------------------
    # SEND TEST MESSAGES
    # -------------------------------------------------------------------------
    
    async def send_test_sms(
        self,
        environment: Environment,
        to_number: str,
        message: str
    ) -> Dict:
        """Send a test SMS via Twilio"""
        credentials = await self.get_decrypted_credentials("twilio_sms", environment)
        
        if not credentials:
            raise HTTPException(status_code=400, detail="Twilio SMS not configured")
        
        try:
            from twilio.rest import Client
            client = Client(credentials.get("account_sid"), credentials.get("auth_token"))
            
            msg = client.messages.create(
                body=message,
                from_=credentials.get("sender_number"),
                to=to_number
            )
            
            # Log metric
            await self._log_metric("twilio_sms", environment, "test_sms_sent", 1)
            
            return {
                "success": True,
                "message_sid": msg.sid,
                "status": msg.status,
                "to": to_number
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def send_test_whatsapp(
        self,
        environment: Environment,
        to_number: str,
        message: str
    ) -> Dict:
        """Send a test WhatsApp message via Twilio"""
        credentials = await self.get_decrypted_credentials("twilio_whatsapp", environment)
        
        if not credentials:
            raise HTTPException(status_code=400, detail="Twilio WhatsApp not configured")
        
        try:
            from twilio.rest import Client
            client = Client(credentials.get("account_sid"), credentials.get("auth_token"))
            
            # WhatsApp numbers need 'whatsapp:' prefix
            whatsapp_from = credentials.get("whatsapp_number")
            if not whatsapp_from.startswith("whatsapp:"):
                whatsapp_from = f"whatsapp:{whatsapp_from}"
            
            whatsapp_to = to_number
            if not whatsapp_to.startswith("whatsapp:"):
                whatsapp_to = f"whatsapp:{whatsapp_to}"
            
            msg = client.messages.create(
                body=message,
                from_=whatsapp_from,
                to=whatsapp_to
            )
            
            await self._log_metric("twilio_whatsapp", environment, "test_whatsapp_sent", 1)
            
            return {
                "success": True,
                "message_sid": msg.sid,
                "status": msg.status,
                "to": to_number
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def send_test_email(
        self,
        environment: Environment,
        provider_id: str,
        to_email: str,
        subject: str,
        body: str
    ) -> Dict:
        """Send a test email"""
        credentials = await self.get_decrypted_credentials(provider_id, environment)
        
        if not credentials:
            raise HTTPException(status_code=400, detail=f"{provider_id} not configured")
        
        if provider_id == "sendgrid":
            return await self._send_test_email_sendgrid(credentials, to_email, subject, body)
        elif provider_id == "smtp":
            return await self._send_test_email_smtp(credentials, to_email, subject, body)
        else:
            raise HTTPException(status_code=400, detail=f"Email sending not supported for {provider_id}")
    
    async def _send_test_email_sendgrid(
        self,
        credentials: Dict[str, str],
        to_email: str,
        subject: str,
        body: str
    ) -> Dict:
        """Send test email via SendGrid"""
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.sendgrid.com/v3/mail/send",
                    headers={
                        "Authorization": f"Bearer {credentials.get('api_key')}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "personalizations": [{"to": [{"email": to_email}]}],
                        "from": {"email": credentials.get("from_email", "noreply@example.com")},
                        "subject": subject,
                        "content": [{"type": "text/html", "value": body}]
                    }
                )
                
                if response.status_code in [200, 202]:
                    return {"success": True, "message": "Email sent successfully"}
                return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _send_test_email_smtp(
        self,
        credentials: Dict[str, str],
        to_email: str,
        subject: str,
        body: str
    ) -> Dict:
        """Send test email via SMTP"""
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            msg = MIMEMultipart()
            msg['From'] = credentials.get("from_email", credentials.get("username"))
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'html'))
            
            use_tls = credentials.get("use_tls", "true").lower() == "true"
            port = int(credentials.get("port", 587))
            
            if use_tls:
                server = smtplib.SMTP(credentials.get("host"), port)
                server.starttls()
            else:
                server = smtplib.SMTP(credentials.get("host"), port)
            
            server.login(credentials.get("username"), credentials.get("password"))
            server.send_message(msg)
            server.quit()
            
            return {"success": True, "message": "Email sent successfully"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # -------------------------------------------------------------------------
    # WEBHOOK MANAGEMENT
    # -------------------------------------------------------------------------
    
    async def get_webhooks(
        self,
        provider_id: Optional[str] = None,
        enabled: Optional[bool] = None
    ) -> List[Dict]:
        """Get webhook configurations"""
        query = {}
        if provider_id:
            query["provider_id"] = provider_id
        if enabled is not None:
            query["enabled"] = enabled
        
        cursor = self.webhooks_collection.find(query, {"_id": 0})
        webhooks = await cursor.to_list(length=100)
        
        # Mask secrets
        for webhook in webhooks:
            if webhook.get("secret"):
                webhook["secret"] = self.vault.mask(webhook["secret"])
        
        return webhooks
    
    async def create_webhook(
        self,
        name: str,
        provider_id: str,
        url: str,
        secret: Optional[str],
        events: List[str],
        created_by: str
    ) -> Dict:
        """Create a webhook endpoint"""
        now = datetime.now(timezone.utc).isoformat()
        
        webhook = {
            "id": str(uuid.uuid4()),
            "name": name,
            "provider_id": provider_id,
            "url": url,
            "secret": self.vault.encrypt(secret) if secret else None,
            "enabled": True,
            "events": events,
            "created_at": now,
            "updated_at": now,
            "created_by": created_by
        }
        
        await self.webhooks_collection.insert_one(webhook)
        
        # Return with masked secret
        webhook_response = {**webhook}
        webhook_response.pop("_id", None)
        if webhook_response.get("secret"):
            webhook_response["secret"] = self.vault.mask(secret) if secret else None
        
        return webhook_response
    
    async def toggle_webhook(
        self,
        webhook_id: str,
        enabled: bool,
        toggled_by: str
    ) -> Dict:
        """Enable or disable a webhook"""
        result = await self.webhooks_collection.update_one(
            {"id": webhook_id},
            {
                "$set": {
                    "enabled": enabled,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Webhook not found")
        
        return await self.webhooks_collection.find_one({"id": webhook_id}, {"_id": 0})
    
    async def delete_webhook(self, webhook_id: str):
        """Delete a webhook"""
        result = await self.webhooks_collection.delete_one({"id": webhook_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Webhook not found")
    
    async def get_webhook_logs(
        self,
        webhook_id: Optional[str] = None,
        direction: Optional[str] = None,
        status: Optional[WebhookStatus] = None,
        environment: Optional[Environment] = None,
        limit: int = 100,
        skip: int = 0
    ) -> List[Dict]:
        """Get webhook execution logs"""
        query = {}
        if webhook_id:
            query["webhook_id"] = webhook_id
        if direction:
            query["direction"] = direction
        if status:
            query["status"] = status.value
        if environment:
            query["environment"] = environment.value
        
        cursor = self.webhook_logs_collection.find(
            query, {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    async def log_webhook_execution(
        self,
        webhook_id: str,
        direction: str,
        url: str,
        method: str,
        headers: Dict[str, str],
        payload: Dict[str, Any],
        response_status: Optional[int],
        response_body: Optional[str],
        status: WebhookStatus,
        error_message: Optional[str],
        environment: Environment
    ) -> Dict:
        """Log a webhook execution"""
        log = {
            "id": str(uuid.uuid4()),
            "webhook_id": webhook_id,
            "direction": direction,
            "url": url,
            "method": method,
            "headers": {k: v for k, v in headers.items() if k.lower() not in ['authorization', 'x-api-key']},
            "payload": payload,
            "response_status": response_status,
            "response_body": response_body[:1000] if response_body else None,  # Truncate
            "status": status.value,
            "error_message": error_message,
            "retry_count": 0,
            "environment": environment.value,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.webhook_logs_collection.insert_one(log)
        log.pop("_id", None)
        return log
    
    async def retry_webhook(self, log_id: str) -> Dict:
        """Retry a failed webhook"""
        log = await self.webhook_logs_collection.find_one({"id": log_id}, {"_id": 0})
        
        if not log:
            raise HTTPException(status_code=404, detail="Webhook log not found")
        
        if log.get("status") != WebhookStatus.FAILED.value:
            raise HTTPException(status_code=400, detail="Only failed webhooks can be retried")
        
        # TODO: Implement actual retry logic
        # For now, just update retry count
        await self.webhook_logs_collection.update_one(
            {"id": log_id},
            {
                "$set": {"status": WebhookStatus.RETRYING.value},
                "$inc": {"retry_count": 1}
            }
        )
        
        return {"message": "Webhook retry initiated", "log_id": log_id}
    
    def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str,
        secret: str,
        provider_id: str
    ) -> bool:
        """Verify webhook signature"""
        if provider_id in ["twilio_sms", "twilio_whatsapp"]:
            # Twilio signature verification
            expected = base64.b64encode(
                hmac.new(secret.encode(), payload, hashlib.sha1).digest()
            ).decode()
            return hmac.compare_digest(expected, signature)
        
        elif provider_id == "stripe":
            # Stripe uses timestamp-based signatures
            # Simplified verification
            expected = hmac.new(
                secret.encode(),
                payload,
                hashlib.sha256
            ).hexdigest()
            return signature.endswith(expected)
        
        # Default: simple HMAC-SHA256
        expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)
    
    # -------------------------------------------------------------------------
    # FEATURE ROUTING
    # -------------------------------------------------------------------------
    
    async def get_routing_rules(
        self,
        feature: Optional[str] = None,
        country_code: Optional[str] = None
    ) -> List[Dict]:
        """Get feature routing rules"""
        query = {}
        if feature:
            query["feature"] = feature
        if country_code:
            query["$or"] = [
                {"country_code": country_code},
                {"country_code": None}
            ]
        
        cursor = self.routing_collection.find(query, {"_id": 0})
        return await cursor.to_list(length=100)
    
    async def set_routing_rule(
        self,
        feature: str,
        primary_provider: str,
        fallback_provider: Optional[str],
        country_code: Optional[str],
        enabled: bool,
        set_by: str
    ) -> Dict:
        """Set or update a routing rule"""
        now = datetime.now(timezone.utc).isoformat()
        
        rule = {
            "feature": feature,
            "country_code": country_code,
            "primary_provider": primary_provider,
            "fallback_provider": fallback_provider,
            "enabled": enabled,
            "updated_at": now,
            "updated_by": set_by
        }
        
        await self.routing_collection.update_one(
            {"feature": feature, "country_code": country_code},
            {"$set": rule},
            upsert=True
        )
        
        return rule
    
    async def delete_routing_rule(self, feature: str, country_code: Optional[str]):
        """Delete a routing rule"""
        await self.routing_collection.delete_one({
            "feature": feature,
            "country_code": country_code
        })
    
    async def get_provider_for_feature(
        self,
        feature: str,
        country_code: Optional[str] = None
    ) -> Optional[str]:
        """Get the provider to use for a feature"""
        # Try country-specific first
        if country_code:
            rule = await self.routing_collection.find_one({
                "feature": feature,
                "country_code": country_code,
                "enabled": True
            })
            if rule:
                return rule.get("primary_provider")
        
        # Fallback to global rule
        rule = await self.routing_collection.find_one({
            "feature": feature,
            "country_code": None,
            "enabled": True
        })
        
        return rule.get("primary_provider") if rule else None
    
    # -------------------------------------------------------------------------
    # METRICS & MONITORING
    # -------------------------------------------------------------------------
    
    async def _log_metric(
        self,
        provider_id: str,
        environment: Environment,
        metric_name: str,
        value: float
    ):
        """Log a metric"""
        await self.metrics_collection.insert_one({
            "provider_id": provider_id,
            "environment": environment.value,
            "metric_name": metric_name,
            "value": value,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    
    async def get_metrics(
        self,
        provider_id: Optional[str] = None,
        environment: Optional[Environment] = None,
        metric_name: Optional[str] = None,
        hours: int = 24
    ) -> Dict:
        """Get metrics summary"""
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        query = {"timestamp": {"$gte": since.isoformat()}}
        if provider_id:
            query["provider_id"] = provider_id
        if environment:
            query["environment"] = environment.value
        if metric_name:
            query["metric_name"] = metric_name
        
        cursor = self.metrics_collection.find(query, {"_id": 0})
        metrics = await cursor.to_list(length=1000)
        
        # Aggregate by provider and metric
        summary = {}
        for m in metrics:
            key = f"{m['provider_id']}_{m['metric_name']}"
            if key not in summary:
                summary[key] = {
                    "provider_id": m["provider_id"],
                    "metric_name": m["metric_name"],
                    "count": 0,
                    "total": 0
                }
            summary[key]["count"] += 1
            summary[key]["total"] += m.get("value", 0)
        
        return {
            "period_hours": hours,
            "metrics": list(summary.values())
        }
    
    async def get_integration_health(self, environment: Environment) -> Dict:
        """Get health status of all integrations"""
        integrations = await self.get_all_integrations(environment)
        
        health = {
            "total": len(integrations),
            "connected": 0,
            "error": 0,
            "disabled": 0,
            "not_configured": 0,
            "providers": []
        }
        
        for integration in integrations:
            status = integration.get("status", "not_configured")
            if status == "connected":
                health["connected"] += 1
            elif status == "error":
                health["error"] += 1
            elif status == "disabled":
                health["disabled"] += 1
            else:
                health["not_configured"] += 1
            
            health["providers"].append({
                "provider_id": integration["provider_id"],
                "name": integration["name"],
                "status": status,
                "enabled": integration.get("enabled", False)
            })
        
        return health
    
    # -------------------------------------------------------------------------
    # MAILCHIMP SPECIFIC
    # -------------------------------------------------------------------------
    
    async def get_mailchimp_audiences(self, environment: Environment) -> List[Dict]:
        """Get Mailchimp audiences/lists"""
        credentials = await self.get_decrypted_credentials("mailchimp", environment)
        
        if not credentials:
            raise HTTPException(status_code=400, detail="Mailchimp not configured")
        
        try:
            import mailchimp_marketing as MailchimpMarketing
            client = MailchimpMarketing.Client()
            client.set_config({
                "api_key": credentials.get("api_key"),
                "server": credentials.get("server_prefix")
            })
            
            response = client.lists.get_all_lists()
            return [
                {
                    "id": lst["id"],
                    "name": lst["name"],
                    "member_count": lst["stats"]["member_count"]
                }
                for lst in response.get("lists", [])
            ]
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    async def sync_user_to_mailchimp(
        self,
        environment: Environment,
        email: str,
        merge_fields: Dict[str, str],
        tags: List[str] = None
    ) -> Dict:
        """Sync a user to Mailchimp"""
        credentials = await self.get_decrypted_credentials("mailchimp", environment)
        
        if not credentials:
            raise HTTPException(status_code=400, detail="Mailchimp not configured")
        
        integration = await self.integrations_collection.find_one(
            {"provider_id": "mailchimp", "environment": environment.value}
        )
        
        audience_id = integration.get("settings", {}).get("audience_id")
        if not audience_id:
            raise HTTPException(status_code=400, detail="No audience configured")
        
        try:
            import mailchimp_marketing as MailchimpMarketing
            client = MailchimpMarketing.Client()
            client.set_config({
                "api_key": credentials.get("api_key"),
                "server": credentials.get("server_prefix")
            })
            
            # Add or update member
            import hashlib
            subscriber_hash = hashlib.md5(email.lower().encode()).hexdigest()
            
            response = client.lists.set_list_member(
                audience_id,
                subscriber_hash,
                {
                    "email_address": email,
                    "status_if_new": "subscribed",
                    "merge_fields": merge_fields
                }
            )
            
            # Add tags if provided
            if tags:
                client.lists.update_list_member_tags(
                    audience_id,
                    subscriber_hash,
                    {"tags": [{"name": tag, "status": "active"} for tag in tags]}
                )
            
            return {"success": True, "email": email, "status": response.get("status")}
        except Exception as e:
            return {"success": False, "error": str(e)}


# =========================================================================
# API ROUTER
# =========================================================================

def create_integrations_router(db):
    """Create API integrations router"""
    router = APIRouter(prefix="/integrations", tags=["API Integrations"])
    service = IntegrationsManagerService(db)
    
    # -------------------------------------------------------------------------
    # PROVIDER ENDPOINTS
    # -------------------------------------------------------------------------
    
    @router.get("/providers")
    async def get_providers():
        """Get all available integration providers"""
        providers = service.get_available_providers()
        # Group by category
        grouped = {}
        for provider_id, info in providers.items():
            category = info["category"].value
            if category not in grouped:
                grouped[category] = []
            grouped[category].append({
                "provider_id": provider_id,
                **info,
                "category": category
            })
        return grouped
    
    @router.get("/list/{environment}")
    async def get_integrations(
        environment: Environment,
        category: Optional[IntegrationCategory] = None
    ):
        """Get all integrations for an environment"""
        return await service.get_all_integrations(environment, category)
    
    @router.get("/config/{environment}/{provider_id}")
    async def get_integration(environment: Environment, provider_id: str):
        """Get integration configuration"""
        integration = await service.get_integration(provider_id, environment)
        if not integration:
            raise HTTPException(status_code=404, detail="Integration not found")
        return integration
    
    @router.post("/config/{environment}/{provider_id}")
    async def configure_integration(
        environment: Environment,
        provider_id: str,
        credentials: Dict[str, str] = Body(...),
        settings: Dict[str, Any] = Body({}),
        enabled: bool = Body(True),
        configured_by: str = Body("admin")
    ):
        """Configure an integration"""
        return await service.configure_integration(
            provider_id, environment, credentials, settings, enabled, configured_by
        )
    
    @router.put("/config/{environment}/{provider_id}/toggle")
    async def toggle_integration(
        environment: Environment,
        provider_id: str,
        enabled: bool = Body(..., embed=True),
        toggled_by: str = Body("admin", embed=True)
    ):
        """Enable or disable an integration"""
        return await service.toggle_integration(provider_id, environment, enabled, toggled_by)
    
    @router.delete("/config/{environment}/{provider_id}")
    async def delete_integration(
        environment: Environment,
        provider_id: str,
        deleted_by: str = Query("admin")
    ):
        """Delete an integration"""
        await service.delete_integration(provider_id, environment, deleted_by)
        return {"message": "Integration deleted"}
    
    @router.post("/config/{environment}/{provider_id}/test")
    async def test_connection(environment: Environment, provider_id: str):
        """Test integration connection"""
        return await service.test_connection(provider_id, environment)
    
    # -------------------------------------------------------------------------
    # TEST MESSAGE ENDPOINTS
    # -------------------------------------------------------------------------
    
    @router.post("/test/sms/{environment}")
    async def send_test_sms(
        environment: Environment,
        to_number: str = Body(...),
        message: str = Body("Test SMS from Integration Manager")
    ):
        """Send a test SMS"""
        return await service.send_test_sms(environment, to_number, message)
    
    @router.post("/test/whatsapp/{environment}")
    async def send_test_whatsapp(
        environment: Environment,
        to_number: str = Body(...),
        message: str = Body("Test WhatsApp message from Integration Manager")
    ):
        """Send a test WhatsApp message"""
        return await service.send_test_whatsapp(environment, to_number, message)
    
    @router.post("/test/email/{environment}/{provider_id}")
    async def send_test_email(
        environment: Environment,
        provider_id: str,
        to_email: str = Body(...),
        subject: str = Body("Test Email"),
        body: str = Body("<p>This is a test email from the Integration Manager.</p>")
    ):
        """Send a test email"""
        return await service.send_test_email(environment, provider_id, to_email, subject, body)
    
    # -------------------------------------------------------------------------
    # WEBHOOK ENDPOINTS
    # -------------------------------------------------------------------------
    
    @router.get("/webhooks")
    async def get_webhooks(
        provider_id: Optional[str] = None,
        enabled: Optional[bool] = None
    ):
        """Get webhook configurations"""
        return await service.get_webhooks(provider_id, enabled)
    
    @router.post("/webhooks")
    async def create_webhook(
        name: str = Body(...),
        provider_id: str = Body(...),
        url: str = Body(...),
        secret: Optional[str] = Body(None),
        events: List[str] = Body([]),
        created_by: str = Body("admin")
    ):
        """Create a webhook endpoint"""
        return await service.create_webhook(name, provider_id, url, secret, events, created_by)
    
    @router.put("/webhooks/{webhook_id}/toggle")
    async def toggle_webhook(
        webhook_id: str,
        enabled: bool = Body(..., embed=True),
        toggled_by: str = Body("admin", embed=True)
    ):
        """Enable or disable a webhook"""
        return await service.toggle_webhook(webhook_id, enabled, toggled_by)
    
    @router.delete("/webhooks/{webhook_id}")
    async def delete_webhook(webhook_id: str):
        """Delete a webhook"""
        await service.delete_webhook(webhook_id)
        return {"message": "Webhook deleted"}
    
    @router.get("/webhooks/logs")
    async def get_webhook_logs(
        webhook_id: Optional[str] = None,
        direction: Optional[str] = None,
        status: Optional[WebhookStatus] = None,
        environment: Optional[Environment] = None,
        limit: int = Query(100, le=500),
        skip: int = Query(0, ge=0)
    ):
        """Get webhook execution logs"""
        return await service.get_webhook_logs(webhook_id, direction, status, environment, limit, skip)
    
    @router.post("/webhooks/logs/{log_id}/retry")
    async def retry_webhook(log_id: str):
        """Retry a failed webhook"""
        return await service.retry_webhook(log_id)
    
    # -------------------------------------------------------------------------
    # ROUTING ENDPOINTS
    # -------------------------------------------------------------------------
    
    @router.get("/routing")
    async def get_routing_rules(
        feature: Optional[str] = None,
        country_code: Optional[str] = None
    ):
        """Get feature routing rules"""
        return await service.get_routing_rules(feature, country_code)
    
    @router.post("/routing")
    async def set_routing_rule(
        feature: str = Body(...),
        primary_provider: str = Body(...),
        fallback_provider: Optional[str] = Body(None),
        country_code: Optional[str] = Body(None),
        enabled: bool = Body(True),
        set_by: str = Body("admin")
    ):
        """Set a routing rule"""
        return await service.set_routing_rule(
            feature, primary_provider, fallback_provider, country_code, enabled, set_by
        )
    
    @router.delete("/routing")
    async def delete_routing_rule(
        feature: str = Query(...),
        country_code: Optional[str] = Query(None)
    ):
        """Delete a routing rule"""
        await service.delete_routing_rule(feature, country_code)
        return {"message": "Routing rule deleted"}
    
    # -------------------------------------------------------------------------
    # MONITORING ENDPOINTS
    # -------------------------------------------------------------------------
    
    @router.get("/health/{environment}")
    async def get_health(environment: Environment):
        """Get integration health status"""
        return await service.get_integration_health(environment)
    
    @router.get("/metrics")
    async def get_metrics(
        provider_id: Optional[str] = None,
        environment: Optional[Environment] = None,
        metric_name: Optional[str] = None,
        hours: int = Query(24, le=168)
    ):
        """Get metrics summary"""
        return await service.get_metrics(provider_id, environment, metric_name, hours)
    
    # -------------------------------------------------------------------------
    # AUDIT ENDPOINTS
    # -------------------------------------------------------------------------
    
    @router.get("/audit")
    async def get_audit_logs(
        provider_id: Optional[str] = None,
        environment: Optional[Environment] = None,
        limit: int = Query(100, le=500),
        skip: int = Query(0, ge=0)
    ):
        """Get audit logs"""
        return await service.get_audit_logs(provider_id, environment, limit, skip)
    
    # -------------------------------------------------------------------------
    # MAILCHIMP SPECIFIC ENDPOINTS
    # -------------------------------------------------------------------------
    
    @router.get("/mailchimp/{environment}/audiences")
    async def get_mailchimp_audiences(environment: Environment):
        """Get Mailchimp audiences"""
        return await service.get_mailchimp_audiences(environment)
    
    @router.post("/mailchimp/{environment}/sync")
    async def sync_to_mailchimp(
        environment: Environment,
        email: str = Body(...),
        merge_fields: Dict[str, str] = Body({}),
        tags: List[str] = Body([])
    ):
        """Sync a user to Mailchimp"""
        return await service.sync_user_to_mailchimp(environment, email, merge_fields, tags)
    
    return router, service
