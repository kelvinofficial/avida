"""
SMS Notification Service for Order Status Updates
Using Africa's Talking for Tanzania/East Africa market
"""

import africastalking
import logging
import os
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum

logger = logging.getLogger(__name__)

class SMSNotificationType(str, Enum):
    ORDER_CONFIRMED = "order_confirmed"
    ORDER_SHIPPED = "shipped"
    DELIVERY_REMINDER = "delivery_reminder"
    NEW_ORDER_SELLER = "new_order_seller"
    PAYMENT_RELEASED = "payment_released"


class SMSService:
    """Africa's Talking SMS Service for order notifications"""
    
    def __init__(self, db):
        self.db = db
        self.username = os.environ.get("AFRICASTALKING_USERNAME", "sandbox")
        self.api_key = os.environ.get("AFRICASTALKING_API_KEY", "")
        self.sender_id = os.environ.get("AFRICASTALKING_SENDER_ID", "AVIDA")
        self.initialized = False
        
        if self.api_key:
            try:
                africastalking.initialize(
                    username=self.username,
                    api_key=self.api_key
                )
                self.sms = africastalking.SMS
                self.initialized = True
                logger.info("Africa's Talking SMS service initialized")
            except Exception as e:
                logger.warning(f"Failed to initialize Africa's Talking: {e}")
        else:
            logger.warning("Africa's Talking API key not configured - SMS notifications disabled")
    
    def _normalize_phone(self, phone: str) -> str:
        """Normalize phone number to +255 format for Tanzania"""
        clean = ''.join(filter(str.isdigit, phone))
        
        if clean.startswith('0'):
            clean = '255' + clean[1:]
        elif clean.startswith('255'):
            pass
        elif len(clean) == 9:
            clean = '255' + clean
        
        return '+' + clean
    
    def _validate_tanzanian_number(self, phone: str) -> bool:
        """Validate Tanzania phone number format"""
        import re
        pattern = r"^\+255\d{9}$"
        return bool(re.match(pattern, phone))
    
    async def _log_notification(
        self,
        order_id: str,
        recipient_phone: str,
        notification_type: str,
        message: str,
        status: str,
        message_id: Optional[str] = None,
        error: Optional[str] = None
    ):
        """Log SMS notification to database"""
        try:
            await self.db.sms_notifications.insert_one({
                "order_id": order_id,
                "recipient_phone": recipient_phone,
                "notification_type": notification_type,
                "message": message,
                "status": status,
                "at_message_id": message_id,
                "error": error,
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        except Exception as e:
            logger.error(f"Failed to log SMS notification: {e}")
    
    async def send_sms(
        self,
        phone: str,
        message: str,
        order_id: str,
        notification_type: str
    ) -> Dict[str, Any]:
        """Send SMS via Africa's Talking"""
        normalized_phone = self._normalize_phone(phone)
        
        if not self.initialized:
            logger.warning(f"SMS not sent (not initialized): {notification_type} to {normalized_phone}")
            await self._log_notification(
                order_id, normalized_phone, notification_type, message,
                "skipped", error="SMS service not initialized"
            )
            return {"success": False, "reason": "SMS service not initialized"}
        
        if not self._validate_tanzanian_number(normalized_phone):
            logger.warning(f"Invalid phone number: {normalized_phone}")
            await self._log_notification(
                order_id, normalized_phone, notification_type, message,
                "failed", error="Invalid phone number format"
            )
            return {"success": False, "reason": "Invalid phone number"}
        
        try:
            response = self.sms.send(
                message=message,
                recipients=[normalized_phone],
                sender_id=self.sender_id
            )
            
            if response.get("SMSMessageData", {}).get("Message") == "Sent":
                recipients = response["SMSMessageData"].get("Recipients", [])
                message_id = recipients[0].get("messageId") if recipients else None
                
                await self._log_notification(
                    order_id, normalized_phone, notification_type, message,
                    "sent", message_id=message_id
                )
                
                logger.info(f"SMS sent: {notification_type} to {normalized_phone}, ID: {message_id}")
                return {"success": True, "message_id": message_id}
            else:
                error_msg = response.get("SMSMessageData", {}).get("Message", "Unknown error")
                await self._log_notification(
                    order_id, normalized_phone, notification_type, message,
                    "failed", error=error_msg
                )
                logger.error(f"SMS failed: {error_msg}")
                return {"success": False, "reason": error_msg}
                
        except Exception as e:
            logger.error(f"SMS exception: {e}")
            await self._log_notification(
                order_id, normalized_phone, notification_type, message,
                "failed", error=str(e)
            )
            return {"success": False, "reason": str(e)}
    
    # =====================================
    # BUYER NOTIFICATIONS
    # =====================================
    
    async def send_order_confirmed(
        self,
        order_id: str,
        buyer_phone: str,
        buyer_name: str,
        item_title: str,
        total_amount: float,
        currency: str = "EUR"
    ):
        """Send order confirmation SMS to buyer"""
        message = (
            f"Habari {buyer_name}!\n\n"
            f"Order #{order_id[:8]} confirmed.\n"
            f"Item: {item_title[:30]}\n"
            f"Total: {currency} {total_amount:.2f}\n\n"
            f"Payment held in escrow until delivery.\n"
            f"Asante sana!"
        )
        
        return await self.send_sms(
            buyer_phone, message, order_id,
            SMSNotificationType.ORDER_CONFIRMED
        )
    
    async def send_order_shipped(
        self,
        order_id: str,
        buyer_phone: str,
        buyer_name: str,
        estimated_days: int = 0
    ):
        """Send shipment notification to buyer"""
        eta = f"ETA: {estimated_days} days" if estimated_days > 0 else "Soon"
        
        message = (
            f"Hi {buyer_name}!\n\n"
            f"Great news! Order #{order_id[:8]} has been shipped.\n"
            f"{eta}\n\n"
            f"Please confirm delivery when received.\n"
            f"Shukran!"
        )
        
        return await self.send_sms(
            buyer_phone, message, order_id,
            SMSNotificationType.ORDER_SHIPPED
        )
    
    async def send_delivery_reminder(
        self,
        order_id: str,
        buyer_phone: str,
        buyer_name: str,
        days_since_shipped: int
    ):
        """Send delivery reminder to buyer"""
        message = (
            f"Hi {buyer_name},\n\n"
            f"Order #{order_id[:8]} was shipped {days_since_shipped} days ago.\n\n"
            f"If you've received it, please confirm delivery in the app.\n"
            f"If there's an issue, you can open a dispute.\n"
            f"Karibu!"
        )
        
        return await self.send_sms(
            buyer_phone, message, order_id,
            SMSNotificationType.DELIVERY_REMINDER
        )
    
    # =====================================
    # SELLER NOTIFICATIONS
    # =====================================
    
    async def send_new_order_to_seller(
        self,
        order_id: str,
        seller_phone: str,
        seller_name: str,
        item_title: str,
        total_amount: float,
        currency: str = "EUR",
        delivery_method: str = "pickup"
    ):
        """Send new order notification to seller"""
        delivery = "Pickup" if delivery_method == "pickup" else "Delivery"
        
        message = (
            f"Habari {seller_name}!\n\n"
            f"New order received!\n"
            f"Order: #{order_id[:8]}\n"
            f"Item: {item_title[:25]}\n"
            f"Amount: {currency} {total_amount:.2f}\n"
            f"Type: {delivery}\n\n"
            f"Payment secured in escrow.\n"
            f"Please ship/arrange pickup soon!"
        )
        
        return await self.send_sms(
            seller_phone, message, order_id,
            SMSNotificationType.NEW_ORDER_SELLER
        )
    
    async def send_payment_released(
        self,
        order_id: str,
        seller_phone: str,
        seller_name: str,
        payout_amount: float,
        currency: str = "EUR"
    ):
        """Send payment released notification to seller"""
        message = (
            f"Hongera {seller_name}!\n\n"
            f"Payment released for order #{order_id[:8]}!\n"
            f"Amount: {currency} {payout_amount:.2f}\n\n"
            f"Funds will be transferred to your account.\n"
            f"Asante for selling with us!"
        )
        
        return await self.send_sms(
            seller_phone, message, order_id,
            SMSNotificationType.PAYMENT_RELEASED
        )


def create_sms_router(db, sms_service: SMSService):
    """Create SMS webhook router"""
    from fastapi import APIRouter, Form, Response
    
    router = APIRouter(prefix="/sms", tags=["SMS Webhooks"])
    
    @router.post("/webhook/delivery-report")
    async def delivery_report_webhook(
        id: str = Form(...),
        status: str = Form(...),
        phoneNumber: str = Form(...),
        networkCode: str = Form(None),
        failureReason: str = Form(None)
    ):
        """Handle Africa's Talking delivery report webhook"""
        try:
            logger.info(f"SMS delivery report: {id} - {status} to {phoneNumber}")
            
            # Update notification status in database
            status_map = {
                "Success": "delivered",
                "Sent": "sent",
                "Buffered": "buffered",
                "Failed": "failed",
                "Rejected": "rejected"
            }
            
            new_status = status_map.get(status, "unknown")
            
            await db.sms_notifications.update_one(
                {"at_message_id": id},
                {"$set": {
                    "status": new_status,
                    "delivery_status": status,
                    "failure_reason": failureReason,
                    "delivered_at": datetime.now(timezone.utc).isoformat() if status == "Success" else None,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            return Response(status_code=200)
            
        except Exception as e:
            logger.error(f"Delivery report webhook error: {e}")
            return Response(status_code=500)
    
    @router.get("/notifications/{order_id}")
    async def get_order_notifications(order_id: str):
        """Get all SMS notifications for an order"""
        notifications = await db.sms_notifications.find(
            {"order_id": order_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(50)
        
        return notifications
    
    return router
