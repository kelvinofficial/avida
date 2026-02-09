"""
Multi-Channel Notification Service
Handles SMS, WhatsApp, and Email notifications for orders, delivery, and escrow events
Supports multiple providers (Twilio, Africa's Talking) with fallback
"""

import os
import logging
import uuid
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Literal
from enum import Enum
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# =============================================================================
# ENUMS AND TYPES
# =============================================================================

class NotificationChannel(str, Enum):
    SMS = "sms"
    WHATSAPP = "whatsapp"
    EMAIL = "email"


class NotificationEvent(str, Enum):
    # Order & Payment Events
    ORDER_PLACED = "order_placed"
    PAYMENT_SUCCESSFUL = "payment_successful"
    ESCROW_CREATED = "escrow_created"
    
    # Delivery Flow Events
    READY_FOR_PICKUP = "ready_for_pickup"
    TRANSPORT_PARTNER_ASSIGNED = "transport_partner_assigned"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    DELIVERY_CONFIRMED = "delivery_confirmed"
    
    # Escrow Events
    ESCROW_LOCKED = "escrow_locked"
    ESCROW_RELEASED = "escrow_released"
    ESCROW_DELAYED = "escrow_delayed"
    DISPUTE_OPENED = "dispute_opened"
    DISPUTE_RESOLVED = "dispute_resolved"
    
    # OTP Events
    DELIVERY_OTP = "delivery_otp"


class RecipientType(str, Enum):
    BUYER = "buyer"
    SELLER = "seller"
    TRANSPORT_PARTNER = "transport_partner"
    ADMIN = "admin"


class NotificationStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    SKIPPED = "skipped"


class ProviderType(str, Enum):
    TWILIO = "twilio"
    AFRICASTALKING = "africastalking"


# =============================================================================
# MODELS
# =============================================================================

class NotificationTemplate(BaseModel):
    """Notification template for a specific event"""
    id: str = Field(default_factory=lambda: f"tmpl_{uuid.uuid4().hex[:12]}")
    event: str  # NotificationEvent
    recipient_type: str  # RecipientType
    channel: str  # NotificationChannel
    country_code: Optional[str] = None  # None = default
    language: str = "en"
    subject: Optional[str] = None  # For email
    body: str  # Template with variables like {{order_id}}, {{buyer_name}}
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class NotificationLog(BaseModel):
    """Log of sent notifications"""
    id: str = Field(default_factory=lambda: f"notif_{uuid.uuid4().hex[:12]}")
    order_id: Optional[str] = None
    event: str
    channel: str
    recipient_type: str
    recipient_phone: Optional[str] = None
    recipient_email: Optional[str] = None
    template_id: Optional[str] = None
    message: str
    status: str = NotificationStatus.PENDING
    provider: Optional[str] = None
    provider_message_id: Optional[str] = None
    error: Optional[str] = None
    retry_count: int = 0
    sent_at: Optional[str] = None
    delivered_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class TransportPartner(BaseModel):
    """Transport partner/delivery driver model"""
    id: str = Field(default_factory=lambda: f"tp_{uuid.uuid4().hex[:12]}")
    name: str
    phone: str
    email: Optional[str] = None
    vehicle_type: Optional[str] = None  # motorcycle, car, van, truck
    vehicle_plate: Optional[str] = None
    status: str = "available"  # available, busy, offline
    rating: float = 0.0
    total_deliveries: int = 0
    is_active: bool = True
    notification_preferences: Dict[str, bool] = Field(default_factory=lambda: {
        "sms": True,
        "whatsapp": True
    })
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class DeliveryOTP(BaseModel):
    """OTP for delivery confirmation"""
    id: str = Field(default_factory=lambda: f"otp_{uuid.uuid4().hex[:12]}")
    order_id: str
    otp_code: str
    buyer_phone: str
    is_verified: bool = False
    expires_at: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    verified_at: Optional[str] = None


class TrackingLink(BaseModel):
    """Secure tracking link for order"""
    id: str = Field(default_factory=lambda: f"track_{uuid.uuid4().hex[:12]}")
    order_id: str
    token: str  # Secure random token
    short_code: str  # 6-char short code for URL
    expires_at: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    click_count: int = 0


# =============================================================================
# NOTIFICATION SERVICE
# =============================================================================

class NotificationService:
    """
    Multi-channel notification orchestrator
    Handles SMS, WhatsApp, and Email notifications with provider fallback
    """
    
    def __init__(self, db):
        self.db = db
        
        # Twilio configuration
        self.twilio_account_sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
        self.twilio_auth_token = os.environ.get("TWILIO_AUTH_TOKEN", "")
        self.twilio_phone = os.environ.get("TWILIO_PHONE_NUMBER", "")
        self.twilio_whatsapp = os.environ.get("TWILIO_WHATSAPP_NUMBER", "")
        
        # Africa's Talking configuration
        self.at_username = os.environ.get("AFRICASTALKING_USERNAME", "sandbox")
        self.at_api_key = os.environ.get("AFRICASTALKING_API_KEY", "")
        self.at_sender_id = os.environ.get("AFRICASTALKING_SENDER_ID", "AVIDA")
        
        # Initialize providers
        self._init_providers()
        
        # Base URL for tracking links
        self.base_url = os.environ.get("APP_BASE_URL", "https://marketplace.example.com")
    
    def _init_providers(self):
        """Initialize notification providers"""
        # Twilio
        self.twilio_client = None
        if self.twilio_account_sid and self.twilio_auth_token:
            try:
                from twilio.rest import Client
                self.twilio_client = Client(self.twilio_account_sid, self.twilio_auth_token)
                logger.info("Twilio client initialized")
            except ImportError:
                logger.warning("Twilio SDK not installed")
            except Exception as e:
                logger.error(f"Failed to initialize Twilio: {e}")
        
        # Africa's Talking
        self.at_sms = None
        if self.at_api_key:
            try:
                import africastalking
                africastalking.initialize(username=self.at_username, api_key=self.at_api_key)
                self.at_sms = africastalking.SMS
                logger.info("Africa's Talking initialized")
            except ImportError:
                logger.warning("Africa's Talking SDK not installed")
            except Exception as e:
                logger.error(f"Failed to initialize Africa's Talking: {e}")
    
    # =========================================================================
    # TEMPLATE MANAGEMENT
    # =========================================================================
    
    async def initialize_default_templates(self):
        """Create default notification templates"""
        default_templates = [
            # Order Events - Buyer
            {
                "event": NotificationEvent.ORDER_PLACED,
                "recipient_type": RecipientType.BUYER,
                "channel": NotificationChannel.SMS,
                "body": "Order {{order_id}} placed! Total: {{currency}} {{total_amount}}. Track: {{tracking_url}}"
            },
            {
                "event": NotificationEvent.PAYMENT_SUCCESSFUL,
                "recipient_type": RecipientType.BUYER,
                "channel": NotificationChannel.SMS,
                "body": "Payment confirmed for order {{order_id}}! Amount: {{currency}} {{amount}}. Your funds are held securely in escrow."
            },
            
            # Order Events - Seller
            {
                "event": NotificationEvent.ORDER_PLACED,
                "recipient_type": RecipientType.SELLER,
                "channel": NotificationChannel.SMS,
                "body": "New order {{order_id}}! Item: {{item_title}}. Amount: {{currency}} {{total_amount}}. Please prepare for shipping."
            },
            
            # Delivery Events - Buyer
            {
                "event": NotificationEvent.READY_FOR_PICKUP,
                "recipient_type": RecipientType.BUYER,
                "channel": NotificationChannel.SMS,
                "body": "Order {{order_id}} is ready for pickup at {{pickup_location}}."
            },
            {
                "event": NotificationEvent.OUT_FOR_DELIVERY,
                "recipient_type": RecipientType.BUYER,
                "channel": NotificationChannel.SMS,
                "body": "Order {{order_id}} is out for delivery! Driver: {{driver_name}}, Phone: {{driver_phone}}. Track: {{tracking_url}}"
            },
            {
                "event": NotificationEvent.DELIVERED,
                "recipient_type": RecipientType.BUYER,
                "channel": NotificationChannel.SMS,
                "body": "Order {{order_id}} delivered! Please confirm receipt in the app to release payment to seller."
            },
            
            # Delivery Events - Transport Partner
            {
                "event": NotificationEvent.TRANSPORT_PARTNER_ASSIGNED,
                "recipient_type": RecipientType.TRANSPORT_PARTNER,
                "channel": NotificationChannel.SMS,
                "body": "New delivery assigned! Order {{order_id}}. Pickup: {{pickup_address}}. Dropoff: {{delivery_address}}."
            },
            
            # Escrow Events
            {
                "event": NotificationEvent.ESCROW_RELEASED,
                "recipient_type": RecipientType.SELLER,
                "channel": NotificationChannel.SMS,
                "body": "Payment released for order {{order_id}}! Amount: {{currency}} {{amount}} will be transferred to your account."
            },
            {
                "event": NotificationEvent.DISPUTE_OPENED,
                "recipient_type": RecipientType.SELLER,
                "channel": NotificationChannel.SMS,
                "body": "Dispute opened for order {{order_id}}. Reason: {{dispute_reason}}. Please respond within 48 hours."
            },
            {
                "event": NotificationEvent.DISPUTE_OPENED,
                "recipient_type": RecipientType.BUYER,
                "channel": NotificationChannel.SMS,
                "body": "Your dispute for order {{order_id}} has been submitted. We'll review and respond within 48 hours."
            },
            
            # OTP
            {
                "event": NotificationEvent.DELIVERY_OTP,
                "recipient_type": RecipientType.BUYER,
                "channel": NotificationChannel.SMS,
                "body": "Your delivery OTP for order {{order_id}} is: {{otp_code}}. Share this with the driver to confirm delivery."
            },
            
            # WhatsApp Templates
            {
                "event": NotificationEvent.ORDER_PLACED,
                "recipient_type": RecipientType.BUYER,
                "channel": NotificationChannel.WHATSAPP,
                "body": "🛒 *Order Confirmed!*\n\nOrder: {{order_id}}\nItem: {{item_title}}\nTotal: {{currency}} {{total_amount}}\n\nTrack your order: {{tracking_url}}"
            },
            {
                "event": NotificationEvent.OUT_FOR_DELIVERY,
                "recipient_type": RecipientType.BUYER,
                "channel": NotificationChannel.WHATSAPP,
                "body": "🚚 *Out for Delivery!*\n\nOrder: {{order_id}}\nDriver: {{driver_name}}\nPhone: {{driver_phone}}\n\n📍 Track live: {{tracking_url}}"
            },
        ]
        
        for tmpl in default_templates:
            existing = await self.db.notification_templates.find_one({
                "event": tmpl["event"],
                "recipient_type": tmpl["recipient_type"],
                "channel": tmpl["channel"],
                "country_code": None
            })
            
            if not existing:
                template = NotificationTemplate(**tmpl)
                await self.db.notification_templates.insert_one(template.model_dump())
        
        logger.info("Default notification templates initialized")
    
    async def get_template(
        self,
        event: str,
        recipient_type: str,
        channel: str,
        country_code: Optional[str] = None,
        language: str = "en"
    ) -> Optional[Dict]:
        """Get notification template with fallback logic"""
        # Try country-specific template first
        if country_code:
            template = await self.db.notification_templates.find_one({
                "event": event,
                "recipient_type": recipient_type,
                "channel": channel,
                "country_code": country_code,
                "language": language,
                "is_active": True
            }, {"_id": 0})
            if template:
                return template
        
        # Fall back to default template
        template = await self.db.notification_templates.find_one({
            "event": event,
            "recipient_type": recipient_type,
            "channel": channel,
            "country_code": None,
            "is_active": True
        }, {"_id": 0})
        
        return template
    
    async def create_template(self, template_data: Dict) -> Dict:
        """Create a new notification template"""
        template = NotificationTemplate(**template_data)
        await self.db.notification_templates.insert_one(template.model_dump())
        return template.model_dump()
    
    async def update_template(self, template_id: str, update_data: Dict) -> Optional[Dict]:
        """Update a notification template"""
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await self.db.notification_templates.update_one(
            {"id": template_id},
            {"$set": update_data}
        )
        return await self.db.notification_templates.find_one({"id": template_id}, {"_id": 0})
    
    async def get_templates(
        self,
        event: Optional[str] = None,
        channel: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> List[Dict]:
        """Get all templates with optional filters"""
        query = {}
        if event:
            query["event"] = event
        if channel:
            query["channel"] = channel
        if is_active is not None:
            query["is_active"] = is_active
        
        return await self.db.notification_templates.find(query, {"_id": 0}).to_list(100)
    
    def _render_template(self, template: str, variables: Dict[str, Any]) -> str:
        """Render template with variables"""
        result = template
        for key, value in variables.items():
            result = result.replace(f"{{{{{key}}}}}", str(value) if value else "")
        return result
    
    # =========================================================================
    # PHONE NORMALIZATION
    # =========================================================================
    
    def _normalize_phone(self, phone: str, country_code: str = "TZ") -> str:
        """Normalize phone number to E.164 format"""
        clean = ''.join(filter(str.isdigit, phone))
        
        # Tanzania
        if country_code == "TZ":
            if clean.startswith('0'):
                clean = '255' + clean[1:]
            elif clean.startswith('255'):
                pass
            elif len(clean) == 9:
                clean = '255' + clean
        # Kenya
        elif country_code == "KE":
            if clean.startswith('0'):
                clean = '254' + clean[1:]
            elif clean.startswith('254'):
                pass
            elif len(clean) == 9:
                clean = '254' + clean
        # Nigeria
        elif country_code == "NG":
            if clean.startswith('0'):
                clean = '234' + clean[1:]
            elif clean.startswith('234'):
                pass
        # Default: assume international format
        else:
            if not clean.startswith('1') and not clean.startswith('2') and not clean.startswith('3'):
                # Assume US/Canada if no country code
                if len(clean) == 10:
                    clean = '1' + clean
        
        return '+' + clean
    
    def _get_country_from_phone(self, phone: str) -> str:
        """Detect country from phone number"""
        clean = ''.join(filter(str.isdigit, phone))
        if clean.startswith('255'):
            return "TZ"
        elif clean.startswith('254'):
            return "KE"
        elif clean.startswith('234'):
            return "NG"
        elif clean.startswith('27'):
            return "ZA"
        elif clean.startswith('256'):
            return "UG"
        elif clean.startswith('1'):
            return "US"
        elif clean.startswith('44'):
            return "GB"
        return "UNKNOWN"
    
    # =========================================================================
    # SEND METHODS
    # =========================================================================
    
    async def _send_sms_twilio(self, phone: str, message: str) -> Dict[str, Any]:
        """Send SMS via Twilio"""
        if not self.twilio_client:
            return {"success": False, "error": "Twilio not configured"}
        
        try:
            msg = self.twilio_client.messages.create(
                body=message,
                from_=self.twilio_phone,
                to=phone
            )
            return {
                "success": True,
                "provider": ProviderType.TWILIO,
                "message_id": msg.sid,
                "status": msg.status
            }
        except Exception as e:
            logger.error(f"Twilio SMS error: {e}")
            return {"success": False, "error": str(e), "provider": ProviderType.TWILIO}
    
    async def _send_sms_africastalking(self, phone: str, message: str) -> Dict[str, Any]:
        """Send SMS via Africa's Talking"""
        if not self.at_sms:
            return {"success": False, "error": "Africa's Talking not configured"}
        
        try:
            response = self.at_sms.send(
                message=message,
                recipients=[phone],
                sender_id=self.at_sender_id
            )
            
            if response.get("SMSMessageData", {}).get("Message") == "Sent":
                recipients = response["SMSMessageData"].get("Recipients", [])
                message_id = recipients[0].get("messageId") if recipients else None
                return {
                    "success": True,
                    "provider": ProviderType.AFRICASTALKING,
                    "message_id": message_id
                }
            else:
                error_msg = response.get("SMSMessageData", {}).get("Message", "Unknown error")
                return {"success": False, "error": error_msg, "provider": ProviderType.AFRICASTALKING}
        except Exception as e:
            logger.error(f"Africa's Talking SMS error: {e}")
            return {"success": False, "error": str(e), "provider": ProviderType.AFRICASTALKING}
    
    async def _send_whatsapp_twilio(self, phone: str, message: str, interactive_buttons: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """Send WhatsApp message via Twilio with optional interactive buttons"""
        if not self.twilio_client:
            return {"success": False, "error": "Twilio not configured"}
        
        try:
            # Build message parameters
            params = {
                "from_": f"whatsapp:{self.twilio_whatsapp}",
                "to": f"whatsapp:{phone}"
            }
            
            if interactive_buttons:
                # Use content template with buttons (Twilio Content API)
                # For sandbox, we use simple body with button URLs in text
                button_text = "\n\n"
                for btn in interactive_buttons:
                    if btn.get("url"):
                        button_text += f"🔗 {btn.get('title', 'Click')}: {btn['url']}\n"
                params["body"] = message + button_text
            else:
                params["body"] = message
            
            msg = self.twilio_client.messages.create(**params)
            return {
                "success": True,
                "provider": ProviderType.TWILIO,
                "message_id": msg.sid,
                "status": msg.status
            }
        except Exception as e:
            logger.error(f"Twilio WhatsApp error: {e}")
            return {"success": False, "error": str(e), "provider": ProviderType.TWILIO}
    
    async def send_whatsapp_with_buttons(
        self,
        phone: str,
        message: str,
        buttons: List[Dict[str, str]],
        order_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send WhatsApp message with interactive buttons
        
        buttons format: [{"title": "Track Order", "url": "https://..."}, ...]
        """
        normalized_phone = self._normalize_phone(phone)
        
        result = await self._send_whatsapp_twilio(normalized_phone, message, buttons)
        
        # Log the notification
        log_entry = NotificationLog(
            order_id=order_id,
            event="whatsapp_interactive",
            channel=NotificationChannel.WHATSAPP,
            recipient_type="buyer",
            recipient_phone=normalized_phone,
            message=message,
            status=NotificationStatus.SENT if result["success"] else NotificationStatus.FAILED,
            provider=result.get("provider"),
            provider_message_id=result.get("message_id"),
            error=result.get("error"),
            sent_at=datetime.now(timezone.utc).isoformat() if result["success"] else None
        )
        await self.db.notification_logs.insert_one(log_entry.model_dump())
        
        return result
    
    async def send_notification(
        self,
        event: str,
        recipient_type: str,
        phone: str,
        variables: Dict[str, Any],
        order_id: Optional[str] = None,
        preferred_channel: str = NotificationChannel.SMS,
        country_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send notification with template lookup and provider fallback
        """
        now = datetime.now(timezone.utc)
        
        # Detect country from phone if not provided
        if not country_code:
            country_code = self._get_country_from_phone(phone)
        
        # Normalize phone
        normalized_phone = self._normalize_phone(phone, country_code)
        
        # Get template
        template = await self.get_template(event, recipient_type, preferred_channel, country_code)
        
        if not template:
            # Fall back to SMS if WhatsApp template not found
            if preferred_channel == NotificationChannel.WHATSAPP:
                template = await self.get_template(event, recipient_type, NotificationChannel.SMS, country_code)
                preferred_channel = NotificationChannel.SMS
        
        if not template:
            logger.warning(f"No template found for event={event}, recipient={recipient_type}, channel={preferred_channel}")
            return {"success": False, "error": "No template found"}
        
        # Render message
        message = self._render_template(template["body"], variables)
        
        # Create log entry
        log_entry = NotificationLog(
            order_id=order_id,
            event=event,
            channel=preferred_channel,
            recipient_type=recipient_type,
            recipient_phone=normalized_phone,
            template_id=template.get("id"),
            message=message
        )
        
        # Try to send
        result = None
        
        if preferred_channel == NotificationChannel.WHATSAPP:
            # Try WhatsApp first, fall back to SMS
            result = await self._send_whatsapp_twilio(normalized_phone, message)
            if not result["success"]:
                logger.info(f"WhatsApp failed, falling back to SMS for {normalized_phone}")
                result = await self._send_sms_twilio(normalized_phone, message)
                if not result["success"]:
                    result = await self._send_sms_africastalking(normalized_phone, message)
        else:
            # SMS: Try Twilio first for non-African countries, Africa's Talking for African countries
            african_countries = ["TZ", "KE", "NG", "ZA", "UG", "GH", "RW"]
            
            if country_code in african_countries:
                result = await self._send_sms_africastalking(normalized_phone, message)
                if not result["success"]:
                    result = await self._send_sms_twilio(normalized_phone, message)
            else:
                result = await self._send_sms_twilio(normalized_phone, message)
                if not result["success"]:
                    result = await self._send_sms_africastalking(normalized_phone, message)
        
        # Update log entry
        log_entry.status = NotificationStatus.SENT if result["success"] else NotificationStatus.FAILED
        log_entry.provider = result.get("provider")
        log_entry.provider_message_id = result.get("message_id")
        log_entry.error = result.get("error")
        log_entry.sent_at = now.isoformat() if result["success"] else None
        
        # Save log
        await self.db.notification_logs.insert_one(log_entry.model_dump())
        
        return {
            "success": result["success"],
            "notification_id": log_entry.id,
            "channel": preferred_channel,
            "provider": result.get("provider"),
            "message_id": result.get("message_id"),
            "error": result.get("error")
        }
    
    # =========================================================================
    # EVENT TRIGGERS
    # =========================================================================
    
    async def notify_order_placed(
        self,
        order: Dict,
        buyer: Dict,
        seller: Dict,
        listing: Dict
    ):
        """Send notifications when order is placed"""
        tracking_link = await self.generate_tracking_link(order["id"])
        
        variables = {
            "order_id": order["id"][:8],
            "item_title": listing.get("title", "")[:30],
            "total_amount": order.get("total_amount", 0),
            "currency": order.get("currency", "EUR"),
            "tracking_url": tracking_link["url"],
            "buyer_name": buyer.get("name", "Customer"),
            "seller_name": seller.get("name", "Seller")
        }
        
        # Notify buyer
        if buyer.get("phone"):
            await self.send_notification(
                event=NotificationEvent.ORDER_PLACED,
                recipient_type=RecipientType.BUYER,
                phone=buyer["phone"],
                variables=variables,
                order_id=order["id"],
                preferred_channel=buyer.get("notification_preference", NotificationChannel.SMS)
            )
        
        # Notify seller
        if seller.get("phone"):
            await self.send_notification(
                event=NotificationEvent.ORDER_PLACED,
                recipient_type=RecipientType.SELLER,
                phone=seller["phone"],
                variables=variables,
                order_id=order["id"],
                preferred_channel=seller.get("notification_preference", NotificationChannel.SMS)
            )
    
    async def notify_payment_successful(self, order: Dict, buyer: Dict):
        """Send notification when payment is successful"""
        variables = {
            "order_id": order["id"][:8],
            "amount": order.get("total_amount", 0),
            "currency": order.get("currency", "EUR")
        }
        
        if buyer.get("phone"):
            await self.send_notification(
                event=NotificationEvent.PAYMENT_SUCCESSFUL,
                recipient_type=RecipientType.BUYER,
                phone=buyer["phone"],
                variables=variables,
                order_id=order["id"]
            )
    
    async def notify_out_for_delivery(
        self,
        order: Dict,
        buyer: Dict,
        transport_partner: Optional[Dict] = None
    ):
        """Send notification when order is out for delivery"""
        tracking_link = await self.generate_tracking_link(order["id"])
        
        variables = {
            "order_id": order["id"][:8],
            "driver_name": transport_partner.get("name", "Driver") if transport_partner else "Driver",
            "driver_phone": transport_partner.get("phone", "") if transport_partner else "",
            "tracking_url": tracking_link["url"]
        }
        
        # Send delivery OTP to buyer
        otp = await self.generate_delivery_otp(order["id"], buyer.get("phone", ""))
        if otp and buyer.get("phone"):
            await self.send_notification(
                event=NotificationEvent.DELIVERY_OTP,
                recipient_type=RecipientType.BUYER,
                phone=buyer["phone"],
                variables={**variables, "otp_code": otp["otp_code"]},
                order_id=order["id"]
            )
        
        # Notify buyer about delivery
        if buyer.get("phone"):
            await self.send_notification(
                event=NotificationEvent.OUT_FOR_DELIVERY,
                recipient_type=RecipientType.BUYER,
                phone=buyer["phone"],
                variables=variables,
                order_id=order["id"],
                preferred_channel=NotificationChannel.WHATSAPP  # Prefer WhatsApp for tracking link
            )
    
    async def notify_delivered(self, order: Dict, buyer: Dict, seller: Dict):
        """Send notification when order is delivered"""
        variables = {
            "order_id": order["id"][:8]
        }
        
        if buyer.get("phone"):
            await self.send_notification(
                event=NotificationEvent.DELIVERED,
                recipient_type=RecipientType.BUYER,
                phone=buyer["phone"],
                variables=variables,
                order_id=order["id"]
            )
    
    async def notify_escrow_released(self, order: Dict, seller: Dict):
        """Send notification when escrow is released to seller"""
        variables = {
            "order_id": order["id"][:8],
            "amount": order.get("price_breakdown", {}).get("seller_receives", 0),
            "currency": order.get("currency", "EUR")
        }
        
        if seller.get("phone"):
            await self.send_notification(
                event=NotificationEvent.ESCROW_RELEASED,
                recipient_type=RecipientType.SELLER,
                phone=seller["phone"],
                variables=variables,
                order_id=order["id"]
            )
    
    async def notify_dispute_opened(
        self,
        order: Dict,
        buyer: Dict,
        seller: Dict,
        dispute_reason: str
    ):
        """Send notifications when dispute is opened"""
        variables = {
            "order_id": order["id"][:8],
            "dispute_reason": dispute_reason
        }
        
        # Notify buyer
        if buyer.get("phone"):
            await self.send_notification(
                event=NotificationEvent.DISPUTE_OPENED,
                recipient_type=RecipientType.BUYER,
                phone=buyer["phone"],
                variables=variables,
                order_id=order["id"]
            )
        
        # Notify seller
        if seller.get("phone"):
            await self.send_notification(
                event=NotificationEvent.DISPUTE_OPENED,
                recipient_type=RecipientType.SELLER,
                phone=seller["phone"],
                variables=variables,
                order_id=order["id"]
            )
    
    async def notify_transport_partner_assigned(
        self,
        order: Dict,
        transport_partner: Dict,
        pickup_address: str,
        delivery_address: str
    ):
        """Send notification to transport partner when assigned"""
        variables = {
            "order_id": order["id"][:8],
            "pickup_address": pickup_address,
            "delivery_address": delivery_address
        }
        
        if transport_partner.get("phone"):
            await self.send_notification(
                event=NotificationEvent.TRANSPORT_PARTNER_ASSIGNED,
                recipient_type=RecipientType.TRANSPORT_PARTNER,
                phone=transport_partner["phone"],
                variables=variables,
                order_id=order["id"]
            )
    
    # =========================================================================
    # OTP AND TRACKING
    # =========================================================================
    
    async def generate_delivery_otp(self, order_id: str, buyer_phone: str) -> Dict:
        """Generate OTP for delivery confirmation"""
        # Generate 6-digit OTP
        otp_code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
        
        # Expires in 24 hours
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        
        otp = DeliveryOTP(
            order_id=order_id,
            otp_code=otp_code,
            buyer_phone=buyer_phone,
            expires_at=expires_at.isoformat()
        )
        
        # Invalidate previous OTPs for this order
        await self.db.delivery_otps.update_many(
            {"order_id": order_id, "is_verified": False},
            {"$set": {"is_verified": True}}  # Mark as used
        )
        
        await self.db.delivery_otps.insert_one(otp.model_dump())
        
        return otp.model_dump()
    
    async def verify_delivery_otp(self, order_id: str, otp_code: str) -> Dict:
        """Verify delivery OTP"""
        now = datetime.now(timezone.utc)
        
        otp = await self.db.delivery_otps.find_one({
            "order_id": order_id,
            "otp_code": otp_code,
            "is_verified": False
        })
        
        if not otp:
            return {"valid": False, "error": "Invalid OTP"}
        
        # Check expiry
        expires_at = datetime.fromisoformat(otp["expires_at"].replace("Z", "+00:00"))
        if now > expires_at:
            return {"valid": False, "error": "OTP expired"}
        
        # Mark as verified
        await self.db.delivery_otps.update_one(
            {"id": otp["id"]},
            {"$set": {"is_verified": True, "verified_at": now.isoformat()}}
        )
        
        return {"valid": True, "verified_at": now.isoformat()}
    
    async def generate_tracking_link(self, order_id: str) -> Dict:
        """Generate secure tracking link for order"""
        # Check for existing valid link
        existing = await self.db.tracking_links.find_one({
            "order_id": order_id,
            "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
        })
        
        if existing:
            return {
                "url": f"{self.base_url}/track/{existing['short_code']}",
                **{k: v for k, v in existing.items() if k != "_id"}
            }
        
        # Generate new link
        token = secrets.token_urlsafe(32)
        short_code = secrets.token_urlsafe(6)[:6].upper()
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        
        tracking = TrackingLink(
            order_id=order_id,
            token=token,
            short_code=short_code,
            expires_at=expires_at.isoformat()
        )
        
        await self.db.tracking_links.insert_one(tracking.model_dump())
        
        return {
            "url": f"{self.base_url}/track/{short_code}",
            **tracking.model_dump()
        }
    
    async def get_order_by_tracking(self, short_code: str) -> Optional[Dict]:
        """Get order by tracking short code"""
        tracking = await self.db.tracking_links.find_one({
            "short_code": short_code,
            "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
        })
        
        if not tracking:
            return None
        
        # Increment click count
        await self.db.tracking_links.update_one(
            {"id": tracking["id"]},
            {"$inc": {"click_count": 1}}
        )
        
        return await self.db.orders.find_one({"id": tracking["order_id"]}, {"_id": 0})
    
    # =========================================================================
    # NOTIFICATION LOGS
    # =========================================================================
    
    async def get_notification_logs(
        self,
        order_id: Optional[str] = None,
        event: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        limit: int = 50
    ) -> Dict:
        """Get notification logs with filters"""
        query = {}
        if order_id:
            query["order_id"] = order_id
        if event:
            query["event"] = event
        if status:
            query["status"] = status
        
        skip = (page - 1) * limit
        logs = await self.db.notification_logs.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        total = await self.db.notification_logs.count_documents(query)
        
        return {
            "logs": logs,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    
    async def resend_notification(self, notification_id: str) -> Dict:
        """Resend a failed notification"""
        notification = await self.db.notification_logs.find_one({"id": notification_id})
        
        if not notification:
            return {"success": False, "error": "Notification not found"}
        
        # Send again
        result = await self.send_notification(
            event=notification["event"],
            recipient_type=notification["recipient_type"],
            phone=notification["recipient_phone"],
            variables={},  # Variables are already rendered in the message
            order_id=notification.get("order_id"),
            preferred_channel=notification["channel"]
        )
        
        # Update retry count
        await self.db.notification_logs.update_one(
            {"id": notification_id},
            {"$inc": {"retry_count": 1}}
        )
        
        return result


# =============================================================================
# TRANSPORT PARTNER SERVICE
# =============================================================================

class TransportPartnerService:
    """Service for managing transport partners"""
    
    def __init__(self, db):
        self.db = db
    
    async def create_partner(self, partner_data: Dict) -> Dict:
        """Create a new transport partner"""
        partner = TransportPartner(**partner_data)
        await self.db.transport_partners.insert_one(partner.model_dump())
        return partner.model_dump()
    
    async def get_partner(self, partner_id: str) -> Optional[Dict]:
        """Get transport partner by ID"""
        return await self.db.transport_partners.find_one({"id": partner_id}, {"_id": 0})
    
    async def get_partners(
        self,
        status: Optional[str] = None,
        is_active: Optional[bool] = None,
        page: int = 1,
        limit: int = 20
    ) -> Dict:
        """Get transport partners with filters"""
        query = {}
        if status:
            query["status"] = status
        if is_active is not None:
            query["is_active"] = is_active
        
        skip = (page - 1) * limit
        partners = await self.db.transport_partners.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
        total = await self.db.transport_partners.count_documents(query)
        
        return {
            "partners": partners,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    
    async def update_partner(self, partner_id: str, update_data: Dict) -> Optional[Dict]:
        """Update transport partner"""
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await self.db.transport_partners.update_one(
            {"id": partner_id},
            {"$set": update_data}
        )
        return await self.get_partner(partner_id)
    
    async def assign_to_order(self, partner_id: str, order_id: str) -> Dict:
        """Assign transport partner to an order"""
        partner = await self.get_partner(partner_id)
        if not partner:
            return {"success": False, "error": "Partner not found"}
        
        if partner["status"] != "available":
            return {"success": False, "error": "Partner is not available"}
        
        # Update partner status
        await self.update_partner(partner_id, {"status": "busy"})
        
        # Create assignment record
        assignment = {
            "id": f"assign_{uuid.uuid4().hex[:12]}",
            "partner_id": partner_id,
            "order_id": order_id,
            "status": "assigned",
            "assigned_at": datetime.now(timezone.utc).isoformat()
        }
        await self.db.delivery_assignments.insert_one(assignment)
        
        return {"success": True, "assignment": assignment}
    
    async def complete_delivery(self, partner_id: str, order_id: str) -> Dict:
        """Mark delivery as completed by partner"""
        # Update assignment
        await self.db.delivery_assignments.update_one(
            {"partner_id": partner_id, "order_id": order_id},
            {"$set": {
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Update partner stats
        await self.db.transport_partners.update_one(
            {"id": partner_id},
            {
                "$set": {"status": "available"},
                "$inc": {"total_deliveries": 1}
            }
        )
        
        return {"success": True}


# =============================================================================
# ROUTER FACTORY
# =============================================================================

def create_notification_router(db, get_current_user, get_current_admin):
    """Create notification system router"""
    from fastapi import APIRouter, HTTPException, Query, Body
    
    router = APIRouter(prefix="/notifications", tags=["Notifications"])
    
    notification_service = NotificationService(db)
    transport_service = TransportPartnerService(db)
    
    # Initialize templates on startup
    @router.on_event("startup")
    async def startup():
        await notification_service.initialize_default_templates()
    
    # =========================================================================
    # TEMPLATE MANAGEMENT (Admin)
    # =========================================================================
    
    @router.get("/admin/templates")
    async def get_templates(
        event: Optional[str] = Query(None),
        channel: Optional[str] = Query(None),
        admin = None  # Depends(get_current_admin)
    ):
        """Get all notification templates"""
        return await notification_service.get_templates(event, channel)
    
    @router.post("/admin/templates")
    async def create_template(
        template_data: Dict = Body(...),
        admin = None  # Depends(get_current_admin)
    ):
        """Create new notification template"""
        return await notification_service.create_template(template_data)
    
    @router.put("/admin/templates/{template_id}")
    async def update_template(
        template_id: str,
        update_data: Dict = Body(...),
        admin = None  # Depends(get_current_admin)
    ):
        """Update notification template"""
        result = await notification_service.update_template(template_id, update_data)
        if not result:
            raise HTTPException(status_code=404, detail="Template not found")
        return result
    
    # =========================================================================
    # NOTIFICATION LOGS (Admin)
    # =========================================================================
    
    @router.get("/admin/logs")
    async def get_notification_logs(
        order_id: Optional[str] = Query(None),
        event: Optional[str] = Query(None),
        status: Optional[str] = Query(None),
        page: int = Query(1),
        limit: int = Query(50),
        admin = None  # Depends(get_current_admin)
    ):
        """Get notification logs"""
        return await notification_service.get_notification_logs(order_id, event, status, page, limit)
    
    @router.post("/admin/logs/{notification_id}/resend")
    async def resend_notification(
        notification_id: str,
        admin = None  # Depends(get_current_admin)
    ):
        """Resend a failed notification"""
        return await notification_service.resend_notification(notification_id)
    
    # =========================================================================
    # TRACKING
    # =========================================================================
    
    @router.get("/track/{short_code}")
    async def get_tracking_info(short_code: str):
        """Get order info by tracking code"""
        order = await notification_service.get_order_by_tracking(short_code)
        if not order:
            raise HTTPException(status_code=404, detail="Invalid or expired tracking link")
        
        # Return limited order info for tracking
        return {
            "order_id": order["id"][:8],
            "status": order["status"],
            "delivery_method": order.get("delivery_method"),
            "shipped_at": order.get("shipped_at"),
            "delivered_at": order.get("delivered_at"),
            "estimated_delivery_days": order.get("price_breakdown", {}).get("estimated_delivery_days")
        }
    
    # =========================================================================
    # DELIVERY OTP
    # =========================================================================
    
    @router.post("/delivery/verify-otp")
    async def verify_otp(
        order_id: str = Body(...),
        otp_code: str = Body(...)
    ):
        """Verify delivery OTP"""
        return await notification_service.verify_delivery_otp(order_id, otp_code)
    
    # =========================================================================
    # TRANSPORT PARTNERS (Admin)
    # =========================================================================
    
    @router.get("/admin/transport-partners")
    async def get_transport_partners(
        status: Optional[str] = Query(None),
        is_active: Optional[bool] = Query(None),
        page: int = Query(1),
        limit: int = Query(20),
        admin = None  # Depends(get_current_admin)
    ):
        """Get all transport partners"""
        return await transport_service.get_partners(status, is_active, page, limit)
    
    @router.post("/admin/transport-partners")
    async def create_transport_partner(
        partner_data: Dict = Body(...),
        admin = None  # Depends(get_current_admin)
    ):
        """Create new transport partner"""
        return await transport_service.create_partner(partner_data)
    
    @router.get("/admin/transport-partners/{partner_id}")
    async def get_transport_partner(
        partner_id: str,
        admin = None  # Depends(get_current_admin)
    ):
        """Get transport partner by ID"""
        partner = await transport_service.get_partner(partner_id)
        if not partner:
            raise HTTPException(status_code=404, detail="Partner not found")
        return partner
    
    @router.put("/admin/transport-partners/{partner_id}")
    async def update_transport_partner(
        partner_id: str,
        update_data: Dict = Body(...),
        admin = None  # Depends(get_current_admin)
    ):
        """Update transport partner"""
        result = await transport_service.update_partner(partner_id, update_data)
        if not result:
            raise HTTPException(status_code=404, detail="Partner not found")
        return result
    
    @router.post("/admin/transport-partners/{partner_id}/assign/{order_id}")
    async def assign_partner_to_order(
        partner_id: str,
        order_id: str,
        admin = None  # Depends(get_current_admin)
    ):
        """Assign transport partner to order"""
        return await transport_service.assign_to_order(partner_id, order_id)
    
    # =========================================================================
    # USER NOTIFICATION PREFERENCES
    # =========================================================================
    
    @router.get("/preferences")
    async def get_notification_preferences(request = None):
        """Get current user's notification preferences"""
        # user = await get_current_user(request)
        # if not user:
        #     raise HTTPException(status_code=401, detail="Not authenticated")
        
        # For now, return default preferences
        return {
            "sms": True,
            "whatsapp": True,
            "email": False,
            "preferred_channel": "sms"
        }
    
    @router.put("/preferences")
    async def update_notification_preferences(
        preferences: Dict = Body(...),
        request = None
    ):
        """Update user's notification preferences"""
        # user = await get_current_user(request)
        # if not user:
        #     raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Save preferences
        # await db.users.update_one(
        #     {"user_id": user.user_id},
        #     {"$set": {"notification_preferences": preferences}}
        # )
        
        return {"success": True, "preferences": preferences}
    
    return router, notification_service, transport_service
