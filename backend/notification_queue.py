"""
Async Message Queue for Notifications
Handles background sending with retries and exponential backoff
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List, Callable
from enum import Enum
import uuid

logger = logging.getLogger(__name__)


class QueuedMessageStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SENT = "sent"
    FAILED = "failed"
    RETRY_SCHEDULED = "retry_scheduled"
    MAX_RETRIES_EXCEEDED = "max_retries_exceeded"


class NotificationQueue:
    """
    Async notification queue with retry logic
    Uses MongoDB for persistence and asyncio for background processing
    """
    
    def __init__(self, db, notification_service=None):
        self.db = db
        self.notification_service = notification_service
        self.max_retries = 3
        self.base_retry_delay = 30  # seconds
        self.is_running = False
        self._task = None
    
    def set_notification_service(self, service):
        """Set the notification service (for circular dependency resolution)"""
        self.notification_service = service
    
    async def enqueue(
        self,
        event: str,
        recipient_type: str,
        phone: str,
        variables: Dict[str, Any],
        order_id: Optional[str] = None,
        preferred_channel: str = "sms",
        priority: int = 5,  # 1=highest, 10=lowest
        scheduled_at: Optional[str] = None
    ) -> str:
        """Add a notification to the queue"""
        now = datetime.now(timezone.utc)
        queue_id = f"queue_{uuid.uuid4().hex[:12]}"
        
        message = {
            "id": queue_id,
            "event": event,
            "recipient_type": recipient_type,
            "phone": phone,
            "variables": variables,
            "order_id": order_id,
            "preferred_channel": preferred_channel,
            "priority": priority,
            "status": QueuedMessageStatus.PENDING,
            "retry_count": 0,
            "max_retries": self.max_retries,
            "next_retry_at": scheduled_at or now.isoformat(),
            "last_error": None,
            "result": None,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "processed_at": None
        }
        
        await self.db.notification_queue.insert_one(message)
        logger.info(f"Queued notification {queue_id} for {event} to {phone}")
        
        return queue_id
    
    async def process_message(self, message: Dict) -> Dict:
        """Process a single queued message"""
        queue_id = message["id"]
        now = datetime.now(timezone.utc)
        
        # Mark as processing
        await self.db.notification_queue.update_one(
            {"id": queue_id},
            {"$set": {"status": QueuedMessageStatus.PROCESSING, "updated_at": now.isoformat()}}
        )
        
        try:
            # Send the notification
            result = await self.notification_service.send_notification(
                event=message["event"],
                recipient_type=message["recipient_type"],
                phone=message["phone"],
                variables=message["variables"],
                order_id=message.get("order_id"),
                preferred_channel=message["preferred_channel"]
            )
            
            if result.get("success"):
                # Success
                await self.db.notification_queue.update_one(
                    {"id": queue_id},
                    {"$set": {
                        "status": QueuedMessageStatus.SENT,
                        "result": result,
                        "processed_at": now.isoformat(),
                        "updated_at": now.isoformat()
                    }}
                )
                logger.info(f"Successfully sent queued notification {queue_id}")
                return {"success": True, "queue_id": queue_id}
            else:
                # Failed - schedule retry
                return await self._handle_failure(message, result.get("error", "Unknown error"))
                
        except Exception as e:
            logger.error(f"Error processing notification {queue_id}: {e}")
            return await self._handle_failure(message, str(e))
    
    async def _handle_failure(self, message: Dict, error: str) -> Dict:
        """Handle a failed notification attempt"""
        queue_id = message["id"]
        retry_count = message["retry_count"] + 1
        now = datetime.now(timezone.utc)
        
        if retry_count >= self.max_retries:
            # Max retries exceeded
            await self.db.notification_queue.update_one(
                {"id": queue_id},
                {"$set": {
                    "status": QueuedMessageStatus.MAX_RETRIES_EXCEEDED,
                    "retry_count": retry_count,
                    "last_error": error,
                    "updated_at": now.isoformat()
                }}
            )
            logger.warning(f"Max retries exceeded for notification {queue_id}")
            return {"success": False, "queue_id": queue_id, "error": "Max retries exceeded"}
        else:
            # Schedule retry with exponential backoff
            delay = self.base_retry_delay * (2 ** (retry_count - 1))  # 30s, 60s, 120s
            next_retry = now + timedelta(seconds=delay)
            
            await self.db.notification_queue.update_one(
                {"id": queue_id},
                {"$set": {
                    "status": QueuedMessageStatus.RETRY_SCHEDULED,
                    "retry_count": retry_count,
                    "next_retry_at": next_retry.isoformat(),
                    "last_error": error,
                    "updated_at": now.isoformat()
                }}
            )
            logger.info(f"Scheduled retry {retry_count} for notification {queue_id} at {next_retry}")
            return {"success": False, "queue_id": queue_id, "retry_scheduled": True, "next_retry_at": next_retry.isoformat()}
    
    async def get_pending_messages(self, limit: int = 50) -> List[Dict]:
        """Get messages ready to be processed"""
        now = datetime.now(timezone.utc).isoformat()
        
        return await self.db.notification_queue.find(
            {
                "status": {"$in": [QueuedMessageStatus.PENDING, QueuedMessageStatus.RETRY_SCHEDULED]},
                "next_retry_at": {"$lte": now}
            },
            {"_id": 0}
        ).sort([("priority", 1), ("created_at", 1)]).limit(limit).to_list(limit)
    
    async def process_batch(self, batch_size: int = 10) -> Dict:
        """Process a batch of pending messages"""
        messages = await self.get_pending_messages(batch_size)
        
        if not messages:
            return {"processed": 0, "success": 0, "failed": 0}
        
        results = {"processed": 0, "success": 0, "failed": 0}
        
        for message in messages:
            result = await self.process_message(message)
            results["processed"] += 1
            if result.get("success"):
                results["success"] += 1
            else:
                results["failed"] += 1
        
        return results
    
    async def start_background_processor(self, interval: int = 10):
        """Start the background processor loop"""
        if self.is_running:
            logger.warning("Queue processor already running")
            return
        
        self.is_running = True
        logger.info("Starting notification queue processor")
        
        while self.is_running:
            try:
                results = await self.process_batch()
                if results["processed"] > 0:
                    logger.info(f"Queue batch processed: {results}")
            except Exception as e:
                logger.error(f"Error in queue processor: {e}")
            
            await asyncio.sleep(interval)
    
    def start(self, interval: int = 10):
        """Start the background processor as a task"""
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self.start_background_processor(interval))
            logger.info("Notification queue processor task started")
    
    def stop(self):
        """Stop the background processor"""
        self.is_running = False
        if self._task:
            self._task.cancel()
            logger.info("Notification queue processor stopped")
    
    async def get_queue_stats(self) -> Dict:
        """Get queue statistics"""
        pipeline = [
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]
        results = await self.db.notification_queue.aggregate(pipeline).to_list(10)
        
        stats = {status.value: 0 for status in QueuedMessageStatus}
        for result in results:
            stats[result["_id"]] = result["count"]
        
        stats["total"] = sum(stats.values())
        return stats
    
    async def get_failed_messages(self, page: int = 1, limit: int = 50) -> Dict:
        """Get failed messages for admin review"""
        query = {"status": {"$in": [QueuedMessageStatus.FAILED, QueuedMessageStatus.MAX_RETRIES_EXCEEDED]}}
        skip = (page - 1) * limit
        
        messages = await self.db.notification_queue.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        total = await self.db.notification_queue.count_documents(query)
        
        return {
            "messages": messages,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit if total > 0 else 1
        }
    
    async def retry_failed(self, queue_id: str) -> Dict:
        """Manually retry a failed message"""
        message = await self.db.notification_queue.find_one({"id": queue_id})
        if not message:
            return {"success": False, "error": "Message not found"}
        
        now = datetime.now(timezone.utc)
        
        # Reset for retry
        await self.db.notification_queue.update_one(
            {"id": queue_id},
            {"$set": {
                "status": QueuedMessageStatus.PENDING,
                "retry_count": 0,
                "next_retry_at": now.isoformat(),
                "updated_at": now.isoformat()
            }}
        )
        
        return {"success": True, "message": "Message queued for retry"}


class EscrowNotificationIntegration:
    """
    Integration layer between Escrow System and Notification Service
    Triggers notifications on order/escrow status changes
    """
    
    def __init__(self, db, notification_queue: NotificationQueue):
        self.db = db
        self.queue = notification_queue
    
    async def _get_user(self, user_id: str) -> Optional[Dict]:
        """Get user details"""
        return await self.db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    async def _get_user_preferences(self, user_id: str) -> Dict:
        """Get user notification preferences"""
        user = await self._get_user(user_id)
        return user.get("notification_preferences", {
            "sms": True,
            "whatsapp": True,
            "email": False,
            "preferred_channel": "sms"
        }) if user else {"sms": True, "whatsapp": True, "preferred_channel": "sms"}
    
    async def on_order_created(self, order: Dict, escrow: Dict):
        """Triggered when a new order is created"""
        buyer = await self._get_user(order["buyer_id"])
        seller = await self._get_user(order["seller_id"])
        listing = await self.db.listings.find_one({"listing_id": order["listing_id"]}, {"_id": 0})
        
        variables = {
            "order_id": order["id"][:12],
            "item_title": order["item"]["title"][:30],
            "total_amount": order["total_amount"],
            "currency": order.get("currency", "EUR"),
            "buyer_name": buyer.get("name", "Customer") if buyer else "Customer",
            "seller_name": seller.get("name", "Seller") if seller else "Seller",
        }
        
        # Notify buyer
        if buyer and buyer.get("phone"):
            prefs = await self._get_user_preferences(order["buyer_id"])
            await self.queue.enqueue(
                event="order_placed",
                recipient_type="buyer",
                phone=buyer["phone"],
                variables=variables,
                order_id=order["id"],
                preferred_channel=prefs.get("preferred_channel", "sms"),
                priority=3
            )
        
        # Notify seller
        if seller and seller.get("phone"):
            prefs = await self._get_user_preferences(order["seller_id"])
            await self.queue.enqueue(
                event="order_placed",
                recipient_type="seller",
                phone=seller["phone"],
                variables=variables,
                order_id=order["id"],
                preferred_channel=prefs.get("preferred_channel", "sms"),
                priority=3
            )
        
        logger.info(f"Queued order_created notifications for order {order['id']}")
    
    async def on_payment_successful(self, order: Dict, escrow: Dict):
        """Triggered when payment is confirmed and escrow is funded"""
        buyer = await self._get_user(order["buyer_id"])
        seller = await self._get_user(order["seller_id"])
        
        variables = {
            "order_id": order["id"][:12],
            "amount": order["total_amount"],
            "currency": order.get("currency", "EUR"),
        }
        
        # Notify buyer
        if buyer and buyer.get("phone"):
            prefs = await self._get_user_preferences(order["buyer_id"])
            await self.queue.enqueue(
                event="payment_successful",
                recipient_type="buyer",
                phone=buyer["phone"],
                variables=variables,
                order_id=order["id"],
                preferred_channel=prefs.get("preferred_channel", "sms"),
                priority=2
            )
        
        # Notify seller that order is ready to ship
        if seller and seller.get("phone"):
            prefs = await self._get_user_preferences(order["seller_id"])
            await self.queue.enqueue(
                event="escrow_created",
                recipient_type="seller",
                phone=seller["phone"],
                variables={**variables, "message": "Payment received. Please ship the item."},
                order_id=order["id"],
                preferred_channel=prefs.get("preferred_channel", "sms"),
                priority=2
            )
        
        logger.info(f"Queued payment_successful notifications for order {order['id']}")
    
    async def on_order_shipped(self, order: Dict, tracking_number: Optional[str] = None):
        """Triggered when seller marks order as shipped"""
        buyer = await self._get_user(order["buyer_id"])
        
        variables = {
            "order_id": order["id"][:12],
            "tracking_number": tracking_number or "N/A",
        }
        
        if buyer and buyer.get("phone"):
            prefs = await self._get_user_preferences(order["buyer_id"])
            await self.queue.enqueue(
                event="in_transit",
                recipient_type="buyer",
                phone=buyer["phone"],
                variables=variables,
                order_id=order["id"],
                preferred_channel=prefs.get("preferred_channel", "sms"),
                priority=4
            )
        
        logger.info(f"Queued order_shipped notification for order {order['id']}")
    
    async def on_out_for_delivery(self, order: Dict, transport_partner: Optional[Dict] = None):
        """Triggered when order is out for delivery"""
        buyer = await self._get_user(order["buyer_id"])
        
        # Generate delivery OTP
        otp_code = ''.join([str(uuid.uuid4().int % 10) for _ in range(6)])
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        
        if buyer and buyer.get("phone"):
            # Save OTP
            await self.db.delivery_otps.insert_one({
                "id": f"otp_{uuid.uuid4().hex[:12]}",
                "order_id": order["id"],
                "otp_code": otp_code,
                "buyer_phone": buyer["phone"],
                "is_verified": False,
                "expires_at": expires_at.isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            variables = {
                "order_id": order["id"][:12],
                "otp_code": otp_code,
                "driver_name": transport_partner.get("name", "Driver") if transport_partner else "Driver",
                "driver_phone": transport_partner.get("phone", "") if transport_partner else "",
            }
            
            prefs = await self._get_user_preferences(order["buyer_id"])
            
            # Send OTP notification
            await self.queue.enqueue(
                event="delivery_otp",
                recipient_type="buyer",
                phone=buyer["phone"],
                variables=variables,
                order_id=order["id"],
                preferred_channel=prefs.get("preferred_channel", "sms"),
                priority=1  # High priority
            )
            
            # Send out for delivery notification (WhatsApp preferred for tracking)
            await self.queue.enqueue(
                event="out_for_delivery",
                recipient_type="buyer",
                phone=buyer["phone"],
                variables=variables,
                order_id=order["id"],
                preferred_channel="whatsapp",
                priority=2
            )
        
        logger.info(f"Queued out_for_delivery notifications for order {order['id']}")
    
    async def on_delivered(self, order: Dict):
        """Triggered when order is marked as delivered"""
        buyer = await self._get_user(order["buyer_id"])
        seller = await self._get_user(order["seller_id"])
        
        variables = {
            "order_id": order["id"][:12],
        }
        
        if buyer and buyer.get("phone"):
            prefs = await self._get_user_preferences(order["buyer_id"])
            await self.queue.enqueue(
                event="delivered",
                recipient_type="buyer",
                phone=buyer["phone"],
                variables=variables,
                order_id=order["id"],
                preferred_channel=prefs.get("preferred_channel", "sms"),
                priority=2
            )
        
        logger.info(f"Queued delivered notification for order {order['id']}")
    
    async def on_delivery_confirmed(self, order: Dict):
        """Triggered when buyer confirms delivery"""
        seller = await self._get_user(order["seller_id"])
        
        variables = {
            "order_id": order["id"][:12],
        }
        
        if seller and seller.get("phone"):
            prefs = await self._get_user_preferences(order["seller_id"])
            await self.queue.enqueue(
                event="delivery_confirmed",
                recipient_type="seller",
                phone=seller["phone"],
                variables=variables,
                order_id=order["id"],
                preferred_channel=prefs.get("preferred_channel", "sms"),
                priority=3
            )
        
        logger.info(f"Queued delivery_confirmed notification for order {order['id']}")
    
    async def on_escrow_released(self, order: Dict, escrow: Dict):
        """Triggered when escrow is released to seller"""
        seller = await self._get_user(order["seller_id"])
        
        variables = {
            "order_id": order["id"][:12],
            "amount": escrow.get("seller_amount", 0),
            "currency": escrow.get("currency", "EUR"),
        }
        
        if seller and seller.get("phone"):
            prefs = await self._get_user_preferences(order["seller_id"])
            await self.queue.enqueue(
                event="escrow_released",
                recipient_type="seller",
                phone=seller["phone"],
                variables=variables,
                order_id=order["id"],
                preferred_channel=prefs.get("preferred_channel", "sms"),
                priority=1  # High priority - money related
            )
        
        logger.info(f"Queued escrow_released notification for order {order['id']}")
    
    async def on_dispute_opened(self, order: Dict, dispute_reason: str):
        """Triggered when a dispute is opened"""
        buyer = await self._get_user(order["buyer_id"])
        seller = await self._get_user(order["seller_id"])
        
        variables = {
            "order_id": order["id"][:12],
            "dispute_reason": dispute_reason[:50],
        }
        
        # Notify both parties
        if buyer and buyer.get("phone"):
            prefs = await self._get_user_preferences(order["buyer_id"])
            await self.queue.enqueue(
                event="dispute_opened",
                recipient_type="buyer",
                phone=buyer["phone"],
                variables=variables,
                order_id=order["id"],
                preferred_channel=prefs.get("preferred_channel", "sms"),
                priority=2
            )
        
        if seller and seller.get("phone"):
            prefs = await self._get_user_preferences(order["seller_id"])
            await self.queue.enqueue(
                event="dispute_opened",
                recipient_type="seller",
                phone=seller["phone"],
                variables=variables,
                order_id=order["id"],
                preferred_channel=prefs.get("preferred_channel", "sms"),
                priority=2
            )
        
        logger.info(f"Queued dispute_opened notifications for order {order['id']}")
    
    async def on_dispute_resolved(self, order: Dict, resolution: str):
        """Triggered when a dispute is resolved"""
        buyer = await self._get_user(order["buyer_id"])
        seller = await self._get_user(order["seller_id"])
        
        variables = {
            "order_id": order["id"][:12],
            "resolution": resolution[:50],
        }
        
        for user, user_id, recipient_type in [(buyer, order["buyer_id"], "buyer"), (seller, order["seller_id"], "seller")]:
            if user and user.get("phone"):
                prefs = await self._get_user_preferences(user_id)
                await self.queue.enqueue(
                    event="dispute_resolved",
                    recipient_type=recipient_type,
                    phone=user["phone"],
                    variables=variables,
                    order_id=order["id"],
                    preferred_channel=prefs.get("preferred_channel", "sms"),
                    priority=2
                )
        
        logger.info(f"Queued dispute_resolved notifications for order {order['id']}")
    
    async def on_transport_partner_assigned(self, order: Dict, partner: Dict):
        """Triggered when a transport partner is assigned"""
        # Notify transport partner
        if partner.get("phone"):
            delivery_address = order.get("delivery_address", {})
            variables = {
                "order_id": order["id"][:12],
                "pickup_address": "Seller location",  # Would come from seller profile
                "delivery_address": f"{delivery_address.get('street', '')}, {delivery_address.get('city', '')}",
            }
            
            await self.queue.enqueue(
                event="transport_partner_assigned",
                recipient_type="transport_partner",
                phone=partner["phone"],
                variables=variables,
                order_id=order["id"],
                preferred_channel=partner.get("notification_preferences", {}).get("preferred_channel", "sms"),
                priority=2
            )
        
        logger.info(f"Queued transport_partner_assigned notification for order {order['id']}")
