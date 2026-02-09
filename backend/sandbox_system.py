"""
Admin Sandbox / Preview Mode System

A fully isolated environment for admins to safely test all platform features
without affecting live users or real money.

Features:
- Separate sandbox collections (sandbox_users, sandbox_orders, etc.)
- Per-admin configurable access
- Auto-generated seed data
- Mock payment/SMS/notification services
- Time simulation and failure injection
- Visual indicators and audit logging
- Data filtering: When sandbox mode is active, API calls return sandbox data
"""

import uuid
import random
import string
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, List, Any
from enum import Enum
from pydantic import BaseModel, Field
from contextvars import ContextVar

from fastapi import APIRouter, HTTPException, Depends, Body, Query, Request
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# Context variable to track sandbox mode per request
sandbox_mode_var: ContextVar[bool] = ContextVar('sandbox_mode', default=False)
sandbox_session_var: ContextVar[Optional[Dict]] = ContextVar('sandbox_session', default=None)

# Collection mapping from production to sandbox
COLLECTION_MAP = {
    'users': 'sandbox_users',
    'sellers': 'sandbox_sellers',
    'listings': 'sandbox_listings',
    'orders': 'sandbox_orders',
    'escrow': 'sandbox_escrow',
    'messages': 'sandbox_messages',
    'conversations': 'sandbox_messages',
    'transport': 'sandbox_transport',
    'transport_jobs': 'sandbox_transport',
    'payments': 'sandbox_payments',
    'payment_transactions': 'sandbox_payments',
    'notifications': 'sandbox_notifications',
    'disputes': 'sandbox_disputes',
    'banners': 'sandbox_banners',
}


# =============================================================================
# ENUMS AND MODELS
# =============================================================================

class SandboxRole(str, Enum):
    BUYER = "buyer"
    SELLER = "seller"
    TRANSPORT_PARTNER = "transport_partner"
    ADMIN = "admin"


class SandboxSessionStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    ENDED = "ended"


class PaymentMethod(str, Enum):
    CARD = "card"
    PAYPAL = "paypal"
    MOBILE_MONEY = "mobile_money"


class OrderStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    SHIPPED = "shipped"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    COMPLETED = "completed"
    DISPUTED = "disputed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


class EscrowStatus(str, Enum):
    PENDING = "pending"
    FUNDED = "funded"
    RELEASING = "releasing"
    RELEASED = "released"
    REFUNDED = "refunded"
    DISPUTED = "disputed"


class TransportStatus(str, Enum):
    PENDING_PICKUP = "pending_pickup"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    FAILED = "failed"


# Pydantic Models
class SandboxSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    admin_id: str
    role: SandboxRole
    status: SandboxSessionStatus = SandboxSessionStatus.ACTIVE
    sandbox_user_id: Optional[str] = None
    started_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    ended_at: Optional[str] = None
    simulated_time_offset_hours: int = 0
    metadata: Dict = Field(default_factory=dict)


class SandboxConfig(BaseModel):
    id: str = "global"
    enabled: bool = True
    auto_seed_data: bool = True
    allowed_admin_ids: List[str] = Field(default_factory=list)
    max_concurrent_sessions: int = 10
    auto_cleanup_hours: int = 24
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_by: Optional[str] = None


class MockPaymentResult(BaseModel):
    success: bool
    transaction_id: str
    amount: float
    currency: str = "TZS"
    method: PaymentMethod
    message: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# =============================================================================
# SANDBOX SERVICE
# =============================================================================

class SandboxService:
    """Core sandbox service handling all sandbox operations"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        # Sandbox collections
        self.sandbox_users = db.sandbox_users
        self.sandbox_sellers = db.sandbox_sellers
        self.sandbox_listings = db.sandbox_listings
        self.sandbox_orders = db.sandbox_orders
        self.sandbox_escrow = db.sandbox_escrow
        self.sandbox_messages = db.sandbox_messages
        self.sandbox_transport = db.sandbox_transport
        self.sandbox_payments = db.sandbox_payments
        self.sandbox_notifications = db.sandbox_notifications
        self.sandbox_disputes = db.sandbox_disputes
        self.sandbox_sessions = db.sandbox_sessions
        self.sandbox_config = db.sandbox_config
        self.sandbox_audit = db.sandbox_audit
        self.sandbox_banners = db.sandbox_banners
        
        # Sample data generators
        self._sample_names = [
            "John Doe", "Jane Smith", "Alice Johnson", "Bob Williams", "Carol Davis",
            "David Brown", "Emma Wilson", "Frank Miller", "Grace Taylor", "Henry Anderson"
        ]
        self._sample_products = [
            "iPhone 14 Pro", "Samsung Galaxy S23", "MacBook Pro M2", "Sony PlayStation 5",
            "Nike Air Jordan", "Adidas Ultraboost", "Canon EOS R6", "DJI Mavic 3",
            "Apple Watch Ultra", "Samsung 65\" QLED TV"
        ]
        self._sample_categories = [
            "Electronics", "Fashion", "Home & Garden", "Sports", "Automotive",
            "Books", "Toys", "Beauty", "Health", "Food"
        ]
        self._sample_locations = [
            "Dar es Salaam", "Arusha", "Mwanza", "Dodoma", "Zanzibar",
            "Mbeya", "Morogoro", "Tanga", "Kigoma", "Iringa"
        ]

    async def initialize(self):
        """Initialize sandbox system with default config"""
        existing = await self.sandbox_config.find_one({"id": "global"})
        if not existing:
            default_config = SandboxConfig()
            await self.sandbox_config.insert_one(default_config.dict())
            logger.info("Sandbox system initialized with default config")

    # =========================================================================
    # CONFIGURATION MANAGEMENT
    # =========================================================================

    async def get_config(self) -> Dict:
        """Get sandbox configuration"""
        config = await self.sandbox_config.find_one({"id": "global"}, {"_id": 0})
        return config or SandboxConfig().dict()

    async def update_config(
        self,
        enabled: Optional[bool] = None,
        auto_seed_data: Optional[bool] = None,
        allowed_admin_ids: Optional[List[str]] = None,
        max_concurrent_sessions: Optional[int] = None,
        auto_cleanup_hours: Optional[int] = None,
        admin_id: str = None
    ) -> Dict:
        """Update sandbox configuration"""
        update_data = {"updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": admin_id}
        
        if enabled is not None:
            update_data["enabled"] = enabled
        if auto_seed_data is not None:
            update_data["auto_seed_data"] = auto_seed_data
        if allowed_admin_ids is not None:
            update_data["allowed_admin_ids"] = allowed_admin_ids
        if max_concurrent_sessions is not None:
            update_data["max_concurrent_sessions"] = max_concurrent_sessions
        if auto_cleanup_hours is not None:
            update_data["auto_cleanup_hours"] = auto_cleanup_hours
        
        await self.sandbox_config.update_one(
            {"id": "global"},
            {"$set": update_data},
            upsert=True
        )
        
        await self._log_audit("config_update", admin_id, update_data)
        return await self.get_config()

    async def check_admin_access(self, admin_id: str) -> Dict:
        """Check if admin has sandbox access"""
        config = await self.get_config()
        
        # If allowed_admin_ids is empty, all admins have access
        if not config.get("allowed_admin_ids"):
            return {"allowed": True, "reason": "All admins have access"}
        
        allowed = admin_id in config["allowed_admin_ids"]
        return {
            "allowed": allowed,
            "reason": "Admin in allowed list" if allowed else "Admin not in allowed list"
        }

    async def grant_admin_access(self, admin_id: str, granted_by: str) -> Dict:
        """Grant sandbox access to an admin"""
        await self.sandbox_config.update_one(
            {"id": "global"},
            {"$addToSet": {"allowed_admin_ids": admin_id}}
        )
        await self._log_audit("access_granted", granted_by, {"target_admin": admin_id})
        return {"success": True, "message": f"Sandbox access granted to {admin_id}"}

    async def revoke_admin_access(self, admin_id: str, revoked_by: str) -> Dict:
        """Revoke sandbox access from an admin"""
        await self.sandbox_config.update_one(
            {"id": "global"},
            {"$pull": {"allowed_admin_ids": admin_id}}
        )
        await self._log_audit("access_revoked", revoked_by, {"target_admin": admin_id})
        return {"success": True, "message": f"Sandbox access revoked from {admin_id}"}

    # =========================================================================
    # SESSION MANAGEMENT
    # =========================================================================

    async def start_session(self, admin_id: str, role: SandboxRole) -> Dict:
        """Start a new sandbox session"""
        # Check access
        access = await self.check_admin_access(admin_id)
        if not access["allowed"]:
            raise HTTPException(status_code=403, detail="Admin does not have sandbox access")
        
        # Check config
        config = await self.get_config()
        if not config.get("enabled", True):
            raise HTTPException(status_code=400, detail="Sandbox mode is disabled")
        
        # Check concurrent sessions
        active_count = await self.sandbox_sessions.count_documents({"status": "active"})
        if active_count >= config.get("max_concurrent_sessions", 10):
            raise HTTPException(status_code=400, detail="Maximum concurrent sessions reached")
        
        # End any existing active session for this admin
        await self.sandbox_sessions.update_many(
            {"admin_id": admin_id, "status": "active"},
            {"$set": {"status": "ended", "ended_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Check if seed data exists, generate if needed
        user_count = await self.sandbox_users.count_documents({})
        if user_count == 0 and config.get("auto_seed_data", True):
            await self.generate_seed_data()
        
        # Get or create sandbox user for the role
        sandbox_user = await self._get_or_create_sandbox_user(role)
        
        # Create session
        session = SandboxSession(
            admin_id=admin_id,
            role=role,
            sandbox_user_id=sandbox_user["id"]
        )
        
        await self.sandbox_sessions.insert_one(session.dict())
        await self._log_audit("session_started", admin_id, {"role": role, "session_id": session.id})
        
        return {
            "session": session.dict(),
            "sandbox_user": sandbox_user,
            "message": f"Sandbox session started as {role}"
        }

    async def end_session(self, session_id: str, admin_id: str) -> Dict:
        """End a sandbox session"""
        result = await self.sandbox_sessions.update_one(
            {"id": session_id, "admin_id": admin_id},
            {"$set": {"status": "ended", "ended_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        
        await self._log_audit("session_ended", admin_id, {"session_id": session_id})
        return {"success": True, "message": "Sandbox session ended"}

    async def get_active_session(self, admin_id: str) -> Optional[Dict]:
        """Get admin's active sandbox session"""
        session = await self.sandbox_sessions.find_one(
            {"admin_id": admin_id, "status": "active"},
            {"_id": 0}
        )
        return session

    async def switch_role(self, session_id: str, new_role: SandboxRole, admin_id: str) -> Dict:
        """Switch role within an active session"""
        session = await self.sandbox_sessions.find_one({"id": session_id, "admin_id": admin_id})
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        sandbox_user = await self._get_or_create_sandbox_user(new_role)
        
        await self.sandbox_sessions.update_one(
            {"id": session_id},
            {"$set": {
                "role": new_role,
                "sandbox_user_id": sandbox_user["id"]
            }}
        )
        
        await self._log_audit("role_switched", admin_id, {"session_id": session_id, "new_role": new_role})
        
        return {
            "success": True,
            "new_role": new_role,
            "sandbox_user": sandbox_user
        }

    async def _get_or_create_sandbox_user(self, role: SandboxRole) -> Dict:
        """Get or create a sandbox user for a specific role"""
        role_map = {
            SandboxRole.BUYER: "buyer",
            SandboxRole.SELLER: "seller",
            SandboxRole.TRANSPORT_PARTNER: "transport",
            SandboxRole.ADMIN: "admin"
        }
        
        user = await self.sandbox_users.find_one(
            {"role": role_map.get(role, "buyer"), "is_test_account": True},
            {"_id": 0}
        )
        
        if user:
            return user
        
        # Create new sandbox user
        user_id = f"sandbox_{role.value}_{uuid.uuid4().hex[:8]}"
        name = random.choice(self._sample_names)
        
        user = {
            "id": user_id,
            "user_id": user_id,
            "name": name,
            "email": f"{role.value}@sandbox.marketplace.com",
            "phone": f"+255{random.randint(700000000, 799999999)}",
            "role": role_map.get(role, "buyer"),
            "is_test_account": True,
            "is_verified": True,
            "location": random.choice(self._sample_locations),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "wallet_balance": random.randint(100000, 1000000),
            "metadata": {"sandbox": True}
        }
        
        await self.sandbox_users.insert_one(user)
        return {k: v for k, v in user.items() if k != "_id"}

    # =========================================================================
    # SEED DATA GENERATION
    # =========================================================================

    async def generate_seed_data(self) -> Dict:
        """Generate comprehensive seed data for sandbox"""
        logger.info("Generating sandbox seed data...")
        
        created = {
            "users": 0,
            "sellers": 0,
            "listings": 0,
            "orders": 0,
            "escrows": 0,
            "messages": 0,
            "transport": 0
        }
        
        # Generate buyers (5)
        buyers = []
        for i in range(5):
            buyer = await self._create_sandbox_user("buyer", i)
            buyers.append(buyer)
            created["users"] += 1
        
        # Generate sellers (5)
        sellers = []
        for i in range(5):
            seller = await self._create_sandbox_user("seller", i)
            sellers.append(seller)
            created["sellers"] += 1
            
            # Create seller profile
            seller_profile = {
                "id": f"seller_profile_{seller['id']}",
                "user_id": seller["id"],
                "business_name": f"Sandbox Shop {i+1}",
                "is_verified": True,
                "is_premium": random.choice([True, False]),
                "rating": round(random.uniform(4.0, 5.0), 1),
                "total_sales": random.randint(10, 100),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await self.sandbox_sellers.insert_one(seller_profile)
        
        # Generate transport partners (3)
        transport_partners = []
        for i in range(3):
            partner = await self._create_sandbox_user("transport", i)
            transport_partners.append(partner)
        
        # Generate listings (10)
        listings = []
        for i in range(10):
            seller = random.choice(sellers)
            listing = await self._create_sandbox_listing(seller, i)
            listings.append(listing)
            created["listings"] += 1
        
        # Generate orders at various stages (5)
        order_statuses = [
            OrderStatus.PENDING,
            OrderStatus.PAID,
            OrderStatus.SHIPPED,
            OrderStatus.DELIVERED,
            OrderStatus.COMPLETED
        ]
        
        for i, status in enumerate(order_statuses):
            buyer = random.choice(buyers)
            listing = random.choice(listings)
            seller = await self.sandbox_users.find_one({"id": listing["seller_id"]}, {"_id": 0})
            
            order = await self._create_sandbox_order(buyer, listing, seller, status)
            created["orders"] += 1
            
            # Create corresponding escrow
            escrow = await self._create_sandbox_escrow(order)
            created["escrows"] += 1
            
            # Create transport record for shipped orders
            if status in [OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.COMPLETED]:
                partner = random.choice(transport_partners)
                transport = await self._create_sandbox_transport(order, partner)
                created["transport"] += 1
        
        # Generate sample messages
        for _ in range(5):
            buyer = random.choice(buyers)
            seller = random.choice(sellers)
            await self._create_sandbox_conversation(buyer, seller)
            created["messages"] += 1
        
        logger.info(f"Sandbox seed data generated: {created}")
        return {"success": True, "created": created}

    async def _create_sandbox_user(self, role: str, index: int) -> Dict:
        """Create a sandbox user"""
        user_id = f"sandbox_{role}_{uuid.uuid4().hex[:8]}"
        name = self._sample_names[index % len(self._sample_names)]
        
        user = {
            "id": user_id,
            "user_id": user_id,
            "name": name,
            "email": f"{role}{index+1}@sandbox.marketplace.com",
            "phone": f"+255{random.randint(700000000, 799999999)}",
            "role": role,
            "is_test_account": True,
            "is_verified": True,
            "location": random.choice(self._sample_locations),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "wallet_balance": random.randint(100000, 1000000),
            "metadata": {"sandbox": True}
        }
        
        await self.sandbox_users.insert_one(user)
        return {k: v for k, v in user.items() if k != "_id"}

    async def _create_sandbox_listing(self, seller: Dict, index: int) -> Dict:
        """Create a sandbox listing"""
        listing_id = f"sandbox_listing_{uuid.uuid4().hex[:8]}"
        product = self._sample_products[index % len(self._sample_products)]
        category = self._sample_categories[index % len(self._sample_categories)]
        
        listing = {
            "id": listing_id,
            "listing_id": listing_id,
            "seller_id": seller["id"],
            "title": f"[SANDBOX] {product}",
            "description": f"This is a sandbox test listing for {product}. Great condition, like new!",
            "price": random.randint(50000, 2000000),
            "currency": "TZS",
            "category": category,
            "condition": random.choice(["new", "like_new", "good", "fair"]),
            "location": seller.get("location", "Dar es Salaam"),
            "images": [f"https://picsum.photos/seed/{listing_id}/400/400"],
            "status": "active",
            "is_boosted": random.choice([True, False]),
            "views": random.randint(10, 500),
            "favorites": random.randint(0, 50),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "metadata": {"sandbox": True}
        }
        
        await self.sandbox_listings.insert_one(listing)
        return {k: v for k, v in listing.items() if k != "_id"}

    async def _create_sandbox_order(
        self,
        buyer: Dict,
        listing: Dict,
        seller: Dict,
        status: OrderStatus
    ) -> Dict:
        """Create a sandbox order"""
        order_id = f"sandbox_order_{uuid.uuid4().hex[:8]}"
        
        subtotal = listing["price"]
        vat = int(subtotal * 0.18)
        transport_fee = random.randint(5000, 20000)
        commission = int(subtotal * 0.05)
        total = subtotal + vat + transport_fee
        
        order = {
            "id": order_id,
            "order_id": order_id,
            "buyer_id": buyer["id"],
            "seller_id": seller["id"],
            "listing_id": listing["id"],
            "status": status,
            "subtotal": subtotal,
            "vat": vat,
            "transport_fee": transport_fee,
            "commission": commission,
            "total": total,
            "currency": "TZS",
            "payment_method": random.choice(["card", "paypal", "mobile_money"]),
            "shipping_address": {
                "name": buyer["name"],
                "phone": buyer["phone"],
                "address": f"123 Test Street, {buyer.get('location', 'Dar es Salaam')}"
            },
            "created_at": (datetime.now(timezone.utc) - timedelta(days=random.randint(1, 7))).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "metadata": {"sandbox": True}
        }
        
        await self.sandbox_orders.insert_one(order)
        return {k: v for k, v in order.items() if k != "_id"}

    async def _create_sandbox_escrow(self, order: Dict) -> Dict:
        """Create a sandbox escrow"""
        escrow_id = f"sandbox_escrow_{uuid.uuid4().hex[:8]}"
        
        status_map = {
            "pending": EscrowStatus.PENDING,
            "paid": EscrowStatus.FUNDED,
            "shipped": EscrowStatus.FUNDED,
            "delivered": EscrowStatus.RELEASING,
            "completed": EscrowStatus.RELEASED
        }
        
        escrow = {
            "id": escrow_id,
            "escrow_id": escrow_id,
            "order_id": order["id"],
            "buyer_id": order["buyer_id"],
            "seller_id": order["seller_id"],
            "amount": order["total"],
            "seller_amount": order["subtotal"] - order["commission"],
            "commission": order["commission"],
            "status": status_map.get(order["status"], EscrowStatus.PENDING),
            "funded_at": datetime.now(timezone.utc).isoformat() if order["status"] != "pending" else None,
            "released_at": datetime.now(timezone.utc).isoformat() if order["status"] == "completed" else None,
            "created_at": order["created_at"],
            "metadata": {"sandbox": True}
        }
        
        await self.sandbox_escrow.insert_one(escrow)
        return {k: v for k, v in escrow.items() if k != "_id"}

    async def _create_sandbox_transport(self, order: Dict, partner: Dict) -> Dict:
        """Create a sandbox transport record"""
        transport_id = f"sandbox_transport_{uuid.uuid4().hex[:8]}"
        
        status_map = {
            "shipped": TransportStatus.IN_TRANSIT,
            "delivered": TransportStatus.DELIVERED,
            "completed": TransportStatus.DELIVERED
        }
        
        transport = {
            "id": transport_id,
            "order_id": order["id"],
            "partner_id": partner["id"],
            "partner_name": partner["name"],
            "status": status_map.get(order["status"], TransportStatus.PENDING_PICKUP),
            "pickup_address": "Seller Location, Dar es Salaam",
            "delivery_address": order["shipping_address"]["address"],
            "pickup_otp": ''.join(random.choices(string.digits, k=6)),
            "delivery_otp": ''.join(random.choices(string.digits, k=6)),
            "estimated_delivery": (datetime.now(timezone.utc) + timedelta(days=random.randint(1, 3))).isoformat(),
            "created_at": order["created_at"],
            "metadata": {"sandbox": True}
        }
        
        await self.sandbox_transport.insert_one(transport)
        return {k: v for k, v in transport.items() if k != "_id"}

    async def _create_sandbox_conversation(self, buyer: Dict, seller: Dict) -> Dict:
        """Create a sandbox conversation with messages"""
        conv_id = f"sandbox_conv_{uuid.uuid4().hex[:8]}"
        
        messages = [
            {"sender_id": buyer["id"], "text": "Hi, is this item still available?"},
            {"sender_id": seller["id"], "text": "Yes, it is! Are you interested?"},
            {"sender_id": buyer["id"], "text": "Yes, can you do a small discount?"},
            {"sender_id": seller["id"], "text": "I can do 5% off if you buy today."},
            {"sender_id": buyer["id"], "text": "Deal! I'll place the order now."}
        ]
        
        conversation = {
            "id": conv_id,
            "participants": [buyer["id"], seller["id"]],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "metadata": {"sandbox": True}
        }
        
        await self.sandbox_messages.insert_one(conversation)
        
        for i, msg in enumerate(messages):
            message = {
                "id": f"{conv_id}_msg_{i}",
                "conversation_id": conv_id,
                "sender_id": msg["sender_id"],
                "text": f"[SANDBOX] {msg['text']}",
                "read": True,
                "created_at": (datetime.now(timezone.utc) - timedelta(minutes=len(messages)-i)).isoformat(),
                "metadata": {"sandbox": True}
            }
            await self.sandbox_messages.insert_one(message)
        
        return conversation

    # =========================================================================
    # MOCK PAYMENT SERVICES
    # =========================================================================

    async def process_mock_payment(
        self,
        order_id: str,
        amount: float,
        method: PaymentMethod,
        simulate_failure: bool = False
    ) -> MockPaymentResult:
        """Process a mock payment (no real gateway)"""
        
        if simulate_failure:
            result = MockPaymentResult(
                success=False,
                transaction_id=f"sandbox_txn_failed_{uuid.uuid4().hex[:8]}",
                amount=amount,
                method=method,
                message="Simulated payment failure for testing"
            )
        else:
            result = MockPaymentResult(
                success=True,
                transaction_id=f"sandbox_txn_{uuid.uuid4().hex[:8]}",
                amount=amount,
                method=method,
                message=f"Mock {method} payment processed successfully"
            )
        
        # Store payment record
        payment_record = {
            "id": result.transaction_id,
            "order_id": order_id,
            "amount": amount,
            "currency": "TZS",
            "method": method,
            "status": "completed" if result.success else "failed",
            "created_at": result.timestamp,
            "metadata": {"sandbox": True, "simulated_failure": simulate_failure}
        }
        await self.sandbox_payments.insert_one(payment_record)
        
        # Update order status if payment successful
        if result.success:
            await self.sandbox_orders.update_one(
                {"id": order_id},
                {"$set": {"status": "paid", "payment_id": result.transaction_id}}
            )
            await self.sandbox_escrow.update_one(
                {"order_id": order_id},
                {"$set": {"status": "funded", "funded_at": result.timestamp}}
            )
        
        return result

    async def process_mock_refund(
        self,
        order_id: str,
        amount: float,
        reason: str,
        partial: bool = False
    ) -> Dict:
        """Process a mock refund"""
        refund_id = f"sandbox_refund_{uuid.uuid4().hex[:8]}"
        
        refund = {
            "id": refund_id,
            "order_id": order_id,
            "amount": amount,
            "reason": reason,
            "partial": partial,
            "status": "completed",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "metadata": {"sandbox": True}
        }
        
        await self.sandbox_payments.insert_one(refund)
        
        # Update order and escrow
        await self.sandbox_orders.update_one(
            {"id": order_id},
            {"$set": {"status": "refunded" if not partial else "partially_refunded"}}
        )
        await self.sandbox_escrow.update_one(
            {"order_id": order_id},
            {"$set": {"status": "refunded"}}
        )
        
        return {"success": True, "refund": refund}

    # =========================================================================
    # MOCK NOTIFICATION SERVICES
    # =========================================================================

    async def send_mock_notification(
        self,
        user_id: str,
        title: str,
        body: str,
        notification_type: str = "general"
    ) -> Dict:
        """Send a mock notification (in-app only, no real SMS/WhatsApp)"""
        notif_id = f"sandbox_notif_{uuid.uuid4().hex[:8]}"
        
        notification = {
            "id": notif_id,
            "user_id": user_id,
            "title": f"[SANDBOX] {title}",
            "body": body,
            "type": notification_type,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "metadata": {"sandbox": True, "mock": True}
        }
        
        await self.sandbox_notifications.insert_one(notification)
        
        return {
            "success": True,
            "notification_id": notif_id,
            "message": "Mock notification sent (in-app only, no SMS/WhatsApp)"
        }

    # =========================================================================
    # SIMULATION TOOLS
    # =========================================================================

    async def fast_forward_time(self, session_id: str, hours: int, admin_id: str) -> Dict:
        """Simulate time passage for escrow expiry testing"""
        session = await self.sandbox_sessions.find_one({"id": session_id})
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        current_offset = session.get("simulated_time_offset_hours", 0)
        new_offset = current_offset + hours
        
        await self.sandbox_sessions.update_one(
            {"id": session_id},
            {"$set": {"simulated_time_offset_hours": new_offset}}
        )
        
        # Process escrow auto-releases that would have triggered
        affected_escrows = await self._process_time_based_escrow_releases(hours)
        
        await self._log_audit("time_fast_forward", admin_id, {
            "session_id": session_id,
            "hours_added": hours,
            "total_offset": new_offset,
            "affected_escrows": affected_escrows
        })
        
        return {
            "success": True,
            "hours_added": hours,
            "total_simulated_offset": new_offset,
            "affected_escrows": affected_escrows
        }

    async def _process_time_based_escrow_releases(self, hours: int) -> int:
        """Process escrow auto-releases based on simulated time"""
        # Find escrows that would be auto-released (7 days after delivery)
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        result = await self.sandbox_escrow.update_many(
            {
                "status": "funded",
                "metadata.sandbox": True,
                "funded_at": {"$lt": cutoff.isoformat()}
            },
            {"$set": {"status": "released", "released_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return result.modified_count

    async def simulate_delivery_failure(self, order_id: str, reason: str, admin_id: str) -> Dict:
        """Simulate a failed delivery"""
        await self.sandbox_transport.update_one(
            {"order_id": order_id},
            {"$set": {
                "status": TransportStatus.FAILED,
                "failure_reason": reason,
                "failed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        await self.sandbox_orders.update_one(
            {"id": order_id},
            {"$set": {"status": "delivery_failed"}}
        )
        
        await self._log_audit("simulate_delivery_failure", admin_id, {
            "order_id": order_id,
            "reason": reason
        })
        
        return {"success": True, "message": f"Simulated delivery failure: {reason}"}

    async def simulate_payment_failure(self, order_id: str, reason: str, admin_id: str) -> Dict:
        """Simulate a payment failure"""
        await self.sandbox_payments.insert_one({
            "id": f"sandbox_failed_payment_{uuid.uuid4().hex[:8]}",
            "order_id": order_id,
            "status": "failed",
            "failure_reason": reason,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "metadata": {"sandbox": True, "simulated": True}
        })
        
        await self._log_audit("simulate_payment_failure", admin_id, {
            "order_id": order_id,
            "reason": reason
        })
        
        return {"success": True, "message": f"Simulated payment failure: {reason}"}

    async def simulate_transport_delay(
        self,
        order_id: str,
        delay_hours: int,
        reason: str,
        admin_id: str
    ) -> Dict:
        """Simulate a transport delay"""
        transport = await self.sandbox_transport.find_one({"order_id": order_id})
        if not transport:
            raise HTTPException(status_code=404, detail="Transport record not found")
        
        current_eta = datetime.fromisoformat(transport["estimated_delivery"].replace('Z', '+00:00'))
        new_eta = current_eta + timedelta(hours=delay_hours)
        
        await self.sandbox_transport.update_one(
            {"order_id": order_id},
            {"$set": {
                "estimated_delivery": new_eta.isoformat(),
                "delay_reason": reason,
                "delayed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        await self._log_audit("simulate_transport_delay", admin_id, {
            "order_id": order_id,
            "delay_hours": delay_hours,
            "reason": reason
        })
        
        return {"success": True, "new_eta": new_eta.isoformat(), "delay_reason": reason}

    async def inject_test_error(
        self,
        error_type: str,
        component: str,
        message: str,
        admin_id: str
    ) -> Dict:
        """Inject a test error for QA testing"""
        error_id = f"sandbox_error_{uuid.uuid4().hex[:8]}"
        
        error = {
            "id": error_id,
            "type": error_type,
            "component": component,
            "message": f"[SANDBOX TEST] {message}",
            "severity": "warning",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "injected_by": admin_id,
            "metadata": {"sandbox": True, "injected": True}
        }
        
        # Log to QA system if available
        try:
            await self.db.qa_errors.insert_one(error)
        except Exception:
            pass
        
        await self._log_audit("inject_test_error", admin_id, error)
        
        return {"success": True, "error_id": error_id, "message": "Test error injected"}

    # =========================================================================
    # ESCROW & DISPUTE MANAGEMENT
    # =========================================================================

    async def create_dispute(
        self,
        order_id: str,
        reason: str,
        description: str,
        admin_id: str
    ) -> Dict:
        """Create a sandbox dispute"""
        dispute_id = f"sandbox_dispute_{uuid.uuid4().hex[:8]}"
        
        order = await self.sandbox_orders.find_one({"id": order_id})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        dispute = {
            "id": dispute_id,
            "order_id": order_id,
            "buyer_id": order["buyer_id"],
            "seller_id": order["seller_id"],
            "reason": reason,
            "description": description,
            "status": "open",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": admin_id,
            "metadata": {"sandbox": True}
        }
        
        await self.sandbox_disputes.insert_one(dispute)
        
        await self.sandbox_orders.update_one(
            {"id": order_id},
            {"$set": {"status": "disputed"}}
        )
        await self.sandbox_escrow.update_one(
            {"order_id": order_id},
            {"$set": {"status": "disputed"}}
        )
        
        await self._log_audit("dispute_created", admin_id, {"dispute_id": dispute_id, "order_id": order_id})
        
        return {"success": True, "dispute": dispute}

    async def resolve_dispute(
        self,
        dispute_id: str,
        resolution: str,  # 'refund_buyer', 'release_seller', 'partial_refund'
        refund_amount: Optional[float] = None,
        admin_id: str = None
    ) -> Dict:
        """Resolve a sandbox dispute"""
        dispute = await self.sandbox_disputes.find_one({"id": dispute_id})
        if not dispute:
            raise HTTPException(status_code=404, detail="Dispute not found")
        
        order = await self.sandbox_orders.find_one({"id": dispute["order_id"]})
        
        if resolution == "refund_buyer":
            await self.process_mock_refund(order["id"], order["total"], "Dispute resolved in buyer's favor")
            new_order_status = "refunded"
            new_escrow_status = "refunded"
        elif resolution == "release_seller":
            new_order_status = "completed"
            new_escrow_status = "released"
        elif resolution == "partial_refund" and refund_amount:
            await self.process_mock_refund(order["id"], refund_amount, "Partial refund from dispute", partial=True)
            new_order_status = "partially_refunded"
            new_escrow_status = "released"
        else:
            raise HTTPException(status_code=400, detail="Invalid resolution")
        
        await self.sandbox_disputes.update_one(
            {"id": dispute_id},
            {"$set": {
                "status": "resolved",
                "resolution": resolution,
                "resolved_at": datetime.now(timezone.utc).isoformat(),
                "resolved_by": admin_id
            }}
        )
        
        await self.sandbox_orders.update_one({"id": order["id"]}, {"$set": {"status": new_order_status}})
        await self.sandbox_escrow.update_one({"order_id": order["id"]}, {"$set": {"status": new_escrow_status}})
        
        await self._log_audit("dispute_resolved", admin_id, {
            "dispute_id": dispute_id,
            "resolution": resolution,
            "refund_amount": refund_amount
        })
        
        return {"success": True, "message": f"Dispute resolved: {resolution}"}

    # =========================================================================
    # TRANSPORT MANAGEMENT
    # =========================================================================

    async def update_transport_status(
        self,
        order_id: str,
        new_status: TransportStatus,
        admin_id: str,
        otp: Optional[str] = None
    ) -> Dict:
        """Update transport status"""
        transport = await self.sandbox_transport.find_one({"order_id": order_id})
        if not transport:
            raise HTTPException(status_code=404, detail="Transport record not found")
        
        # Verify OTP for pickup/delivery
        if new_status == TransportStatus.PICKED_UP and otp != transport.get("pickup_otp"):
            return {"success": False, "message": "Invalid pickup OTP"}
        if new_status == TransportStatus.DELIVERED and otp != transport.get("delivery_otp"):
            return {"success": False, "message": "Invalid delivery OTP"}
        
        update_data = {
            "status": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if new_status == TransportStatus.PICKED_UP:
            update_data["picked_up_at"] = datetime.now(timezone.utc).isoformat()
        elif new_status == TransportStatus.DELIVERED:
            update_data["delivered_at"] = datetime.now(timezone.utc).isoformat()
        
        await self.sandbox_transport.update_one({"order_id": order_id}, {"$set": update_data})
        
        # Update order status
        order_status_map = {
            TransportStatus.PICKED_UP: "shipped",
            TransportStatus.IN_TRANSIT: "in_transit",
            TransportStatus.DELIVERED: "delivered"
        }
        if new_status in order_status_map:
            await self.sandbox_orders.update_one(
                {"id": order_id},
                {"$set": {"status": order_status_map[new_status]}}
            )
        
        await self._log_audit("transport_status_updated", admin_id, {
            "order_id": order_id,
            "new_status": new_status
        })
        
        return {"success": True, "new_status": new_status}

    # =========================================================================
    # BANNER PREVIEW
    # =========================================================================

    async def preview_banner(
        self,
        banner_id: str,
        placement: str,
        admin_id: str
    ) -> Dict:
        """Preview a banner in sandbox mode"""
        # Get banner from production or create mock
        production_banner = await self.db.banners.find_one({"id": banner_id}, {"_id": 0})
        
        if production_banner:
            preview_banner = {**production_banner}
        else:
            # Create mock banner for preview
            preview_banner = {
                "id": f"sandbox_banner_{uuid.uuid4().hex[:8]}",
                "title": "[SANDBOX PREVIEW] Sample Banner",
                "image_url": f"https://picsum.photos/seed/{banner_id}/800/200",
                "link_url": "https://example.com",
                "placement": placement,
                "priority": 1,
                "status": "active"
            }
        
        preview_banner["sandbox_preview"] = True
        preview_banner["previewed_at"] = datetime.now(timezone.utc).isoformat()
        preview_banner["previewed_by"] = admin_id
        
        await self._log_audit("banner_previewed", admin_id, {
            "banner_id": banner_id,
            "placement": placement
        })
        
        return {"success": True, "banner": preview_banner, "placement": placement}

    async def get_banners_for_placement(self, placement: str) -> List[Dict]:
        """Get sandbox banners for a placement"""
        banners = await self.sandbox_banners.find(
            {"placement": placement, "status": "active"},
            {"_id": 0}
        ).sort("priority", -1).to_list(length=10)
        
        if not banners:
            # Get from production and mark as sandbox preview
            banners = await self.db.banners.find(
                {"placement": placement, "status": "active"},
                {"_id": 0}
            ).sort("priority", -1).to_list(length=10)
            for b in banners:
                b["sandbox_preview"] = True
        
        return banners

    # =========================================================================
    # DATA MANAGEMENT
    # =========================================================================

    async def reset_sandbox_data(self, admin_id: str, collections: Optional[List[str]] = None) -> Dict:
        """Reset sandbox data (cleanup)"""
        all_collections = [
            "sandbox_users", "sandbox_sellers", "sandbox_listings",
            "sandbox_orders", "sandbox_escrow", "sandbox_messages",
            "sandbox_transport", "sandbox_payments", "sandbox_notifications",
            "sandbox_disputes", "sandbox_banners"
        ]
        
        target_collections = collections or all_collections
        deleted = {}
        
        for coll_name in target_collections:
            if coll_name in all_collections:
                coll = getattr(self, coll_name, None)
                if coll:
                    result = await coll.delete_many({})
                    deleted[coll_name] = result.deleted_count
        
        await self._log_audit("sandbox_data_reset", admin_id, {"deleted": deleted})
        
        return {"success": True, "deleted": deleted}

    async def get_sandbox_stats(self) -> Dict:
        """Get sandbox data statistics"""
        stats = {
            "users": await self.sandbox_users.count_documents({}),
            "sellers": await self.sandbox_sellers.count_documents({}),
            "listings": await self.sandbox_listings.count_documents({}),
            "orders": await self.sandbox_orders.count_documents({}),
            "escrows": await self.sandbox_escrow.count_documents({}),
            "messages": await self.sandbox_messages.count_documents({}),
            "transport": await self.sandbox_transport.count_documents({}),
            "disputes": await self.sandbox_disputes.count_documents({}),
            "active_sessions": await self.sandbox_sessions.count_documents({"status": "active"})
        }
        return stats

    # =========================================================================
    # AUDIT LOGGING
    # =========================================================================

    async def _log_audit(self, action: str, admin_id: str, details: Dict):
        """Log sandbox action for audit trail"""
        audit_entry = {
            "id": str(uuid.uuid4()),
            "action": action,
            "admin_id": admin_id,
            "details": details,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metadata": {"sandbox": True}
        }
        await self.sandbox_audit.insert_one(audit_entry)

    async def get_audit_logs(
        self,
        admin_id: Optional[str] = None,
        action: Optional[str] = None,
        page: int = 1,
        limit: int = 50
    ) -> Dict:
        """Get sandbox audit logs"""
        query = {}
        if admin_id:
            query["admin_id"] = admin_id
        if action:
            query["action"] = action
        
        skip = (page - 1) * limit
        total = await self.sandbox_audit.count_documents(query)
        
        logs = await self.sandbox_audit.find(
            query, {"_id": 0}
        ).sort("timestamp", -1).skip(skip).limit(limit).to_list(length=limit)
        
        return {
            "logs": logs,
            "total": total,
            "page": page,
            "limit": limit
        }

    # =========================================================================
    # DATA RETRIEVAL
    # =========================================================================

    async def get_sandbox_users(self, role: Optional[str] = None) -> List[Dict]:
        """Get sandbox users"""
        query = {}
        if role:
            query["role"] = role
        users = await self.sandbox_users.find(query, {"_id": 0}).to_list(length=100)
        return users

    async def get_sandbox_listings(self, seller_id: Optional[str] = None) -> List[Dict]:
        """Get sandbox listings"""
        query = {}
        if seller_id:
            query["seller_id"] = seller_id
        listings = await self.sandbox_listings.find(query, {"_id": 0}).to_list(length=100)
        return listings

    async def get_sandbox_orders(
        self,
        buyer_id: Optional[str] = None,
        seller_id: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[Dict]:
        """Get sandbox orders"""
        query = {}
        if buyer_id:
            query["buyer_id"] = buyer_id
        if seller_id:
            query["seller_id"] = seller_id
        if status:
            query["status"] = status
        orders = await self.sandbox_orders.find(query, {"_id": 0}).to_list(length=100)
        return orders

    async def get_sandbox_escrows(self, status: Optional[str] = None) -> List[Dict]:
        """Get sandbox escrows"""
        query = {}
        if status:
            query["status"] = status
        escrows = await self.sandbox_escrow.find(query, {"_id": 0}).to_list(length=100)
        return escrows

    # =========================================================================
    # SANDBOX DATA PROXY - For main app to fetch sandbox data
    # =========================================================================

    async def verify_sandbox_session(self, session_id: str) -> Optional[Dict]:
        """Verify a sandbox session is active and return session data"""
        session = await self.sandbox_sessions.find_one(
            {"id": session_id, "status": "active"},
            {"_id": 0}
        )
        return session

    async def get_proxy_listings(
        self,
        category: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 20,
        skip: int = 0
    ) -> Dict:
        """Get listings for sandbox mode (returns sandbox_listings data)"""
        query = {"status": "active"}
        if category:
            query["category"] = category
        if search:
            query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}}
            ]
        
        total = await self.sandbox_listings.count_documents(query)
        listings = await self.sandbox_listings.find(
            query, {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
        
        return {
            "listings": listings,
            "total": total,
            "sandbox_mode": True
        }

    async def get_proxy_listing_detail(self, listing_id: str) -> Optional[Dict]:
        """Get single listing detail for sandbox mode"""
        listing = await self.sandbox_listings.find_one(
            {"$or": [{"id": listing_id}, {"listing_id": listing_id}]},
            {"_id": 0}
        )
        if listing:
            # Get seller info
            seller = await self.sandbox_users.find_one(
                {"id": listing.get("seller_id")},
                {"_id": 0, "password": 0}
            )
            listing["seller"] = seller
            listing["sandbox_mode"] = True
        return listing

    async def get_proxy_user_orders(self, user_id: str) -> List[Dict]:
        """Get orders for a sandbox user"""
        orders = await self.sandbox_orders.find(
            {"$or": [{"buyer_id": user_id}, {"seller_id": user_id}]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(length=50)
        
        for order in orders:
            order["sandbox_mode"] = True
        
        return orders

    async def get_proxy_conversations(self, user_id: str) -> List[Dict]:
        """Get conversations for a sandbox user"""
        conversations = await self.sandbox_messages.find(
            {"participants": user_id, "conversation_id": {"$exists": False}},
            {"_id": 0}
        ).sort("created_at", -1).to_list(length=50)
        
        for conv in conversations:
            conv["sandbox_mode"] = True
        
        return conversations

    async def get_proxy_notifications(self, user_id: str) -> List[Dict]:
        """Get notifications for a sandbox user"""
        notifications = await self.sandbox_notifications.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(length=50)
        
        for notif in notifications:
            notif["sandbox_mode"] = True
        
        return notifications

    async def get_proxy_categories(self) -> List[Dict]:
        """Get categories (from production, with sandbox tag)"""
        # Categories come from production but we tag them
        categories = await self.db.categories.find({}, {"_id": 0}).to_list(length=100)
        for cat in categories:
            cat["sandbox_mode"] = True
        return categories

    async def create_proxy_order(
        self,
        session_id: str,
        listing_id: str,
        shipping_address: Dict
    ) -> Dict:
        """Create a sandbox order through the proxy"""
        session = await self.verify_sandbox_session(session_id)
        if not session:
            raise HTTPException(status_code=403, detail="Invalid sandbox session")
        
        # Get listing
        listing = await self.sandbox_listings.find_one({"id": listing_id}, {"_id": 0})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        # Get buyer (sandbox user from session)
        buyer_id = session.get("sandbox_user_id")
        buyer = await self.sandbox_users.find_one({"id": buyer_id}, {"_id": 0})
        if not buyer:
            raise HTTPException(status_code=404, detail="Sandbox user not found")
        
        # Get seller
        seller = await self.sandbox_users.find_one({"id": listing["seller_id"]}, {"_id": 0})
        
        # Create order
        order_id = f"sandbox_order_{uuid.uuid4().hex[:8]}"
        
        subtotal = listing["price"]
        vat = int(subtotal * 0.18)
        transport_fee = random.randint(5000, 20000)
        commission = int(subtotal * 0.05)
        total = subtotal + vat + transport_fee
        
        order = {
            "id": order_id,
            "order_id": order_id,
            "buyer_id": buyer_id,
            "seller_id": listing["seller_id"],
            "listing_id": listing_id,
            "status": "pending",
            "subtotal": subtotal,
            "vat": vat,
            "transport_fee": transport_fee,
            "commission": commission,
            "total": total,
            "currency": "TZS",
            "shipping_address": shipping_address,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "metadata": {"sandbox": True, "created_via_proxy": True}
        }
        
        await self.sandbox_orders.insert_one(order)
        
        # Create escrow
        escrow = {
            "id": f"sandbox_escrow_{uuid.uuid4().hex[:8]}",
            "escrow_id": f"sandbox_escrow_{uuid.uuid4().hex[:8]}",
            "order_id": order_id,
            "buyer_id": buyer_id,
            "seller_id": listing["seller_id"],
            "amount": total,
            "seller_amount": subtotal - commission,
            "commission": commission,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "metadata": {"sandbox": True}
        }
        await self.sandbox_escrow.insert_one(escrow)
        
        await self._log_audit("proxy_order_created", session.get("admin_id"), {
            "order_id": order_id,
            "listing_id": listing_id,
            "total": total
        })
        
        return {
            "success": True,
            "order": {k: v for k, v in order.items() if k != "_id"},
            "sandbox_mode": True
        }

    async def send_proxy_message(
        self,
        session_id: str,
        recipient_id: str,
        message: str
    ) -> Dict:
        """Send a message through the proxy (sandbox)"""
        session = await self.verify_sandbox_session(session_id)
        if not session:
            raise HTTPException(status_code=403, detail="Invalid sandbox session")
        
        sender_id = session.get("sandbox_user_id")
        
        # Find or create conversation
        conv = await self.sandbox_messages.find_one({
            "participants": {"$all": [sender_id, recipient_id]},
            "conversation_id": {"$exists": False}
        })
        
        if not conv:
            conv_id = f"sandbox_conv_{uuid.uuid4().hex[:8]}"
            conv = {
                "id": conv_id,
                "participants": [sender_id, recipient_id],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "metadata": {"sandbox": True}
            }
            await self.sandbox_messages.insert_one(conv)
        else:
            conv_id = conv["id"]
        
        # Create message
        msg = {
            "id": f"{conv_id}_msg_{uuid.uuid4().hex[:8]}",
            "conversation_id": conv_id,
            "sender_id": sender_id,
            "text": f"[SANDBOX] {message}",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "metadata": {"sandbox": True}
        }
        await self.sandbox_messages.insert_one(msg)
        
        return {
            "success": True,
            "message_id": msg["id"],
            "conversation_id": conv_id,
            "sandbox_mode": True
        }


# =============================================================================
# ROUTER FACTORY
# =============================================================================

def create_sandbox_router(db: AsyncIOMotorDatabase):
    """Create sandbox API router"""
    router = APIRouter(prefix="/sandbox", tags=["Sandbox"])
    service = SandboxService(db)

    # -------------------------------------------------------------------------
    # CONFIGURATION
    # -------------------------------------------------------------------------

    @router.get("/config")
    async def get_config():
        """Get sandbox configuration"""
        return await service.get_config()

    @router.put("/config")
    async def update_config(
        enabled: Optional[bool] = Body(None),
        auto_seed_data: Optional[bool] = Body(None),
        allowed_admin_ids: Optional[List[str]] = Body(None),
        max_concurrent_sessions: Optional[int] = Body(None),
        auto_cleanup_hours: Optional[int] = Body(None),
        admin_id: str = Body(...)
    ):
        """Update sandbox configuration"""
        return await service.update_config(
            enabled, auto_seed_data, allowed_admin_ids,
            max_concurrent_sessions, auto_cleanup_hours, admin_id
        )

    @router.get("/access/{admin_id}")
    async def check_admin_access(admin_id: str):
        """Check if admin has sandbox access"""
        return await service.check_admin_access(admin_id)

    @router.post("/access/grant")
    async def grant_access(
        admin_id: str = Body(...),
        granted_by: str = Body(...)
    ):
        """Grant sandbox access to admin"""
        return await service.grant_admin_access(admin_id, granted_by)

    @router.post("/access/revoke")
    async def revoke_access(
        admin_id: str = Body(...),
        revoked_by: str = Body(...)
    ):
        """Revoke sandbox access from admin"""
        return await service.revoke_admin_access(admin_id, revoked_by)

    # -------------------------------------------------------------------------
    # SESSION MANAGEMENT
    # -------------------------------------------------------------------------

    @router.post("/session/start")
    async def start_session(
        admin_id: str = Body(...),
        role: SandboxRole = Body(...)
    ):
        """Start a sandbox session"""
        return await service.start_session(admin_id, role)

    @router.post("/session/{session_id}/end")
    async def end_session(session_id: str, admin_id: str = Body(..., embed=True)):
        """End a sandbox session"""
        return await service.end_session(session_id, admin_id)

    @router.get("/session/active/{admin_id}")
    async def get_active_session(admin_id: str):
        """Get admin's active sandbox session"""
        session = await service.get_active_session(admin_id)
        if not session:
            return {"active": False, "session": None}
        return {"active": True, "session": session}

    @router.post("/session/{session_id}/switch-role")
    async def switch_role(
        session_id: str,
        new_role: SandboxRole = Body(...),
        admin_id: str = Body(...)
    ):
        """Switch role in active session"""
        return await service.switch_role(session_id, new_role, admin_id)

    # -------------------------------------------------------------------------
    # SEED DATA
    # -------------------------------------------------------------------------

    @router.post("/seed-data/generate")
    async def generate_seed_data():
        """Generate sandbox seed data"""
        return await service.generate_seed_data()

    @router.delete("/data/reset")
    async def reset_data(
        admin_id: str = Body(...),
        collections: Optional[List[str]] = Body(None)
    ):
        """Reset sandbox data"""
        return await service.reset_sandbox_data(admin_id, collections)

    @router.get("/stats")
    async def get_stats():
        """Get sandbox statistics"""
        return await service.get_sandbox_stats()

    # -------------------------------------------------------------------------
    # DATA RETRIEVAL
    # -------------------------------------------------------------------------

    @router.get("/users")
    async def get_users(role: Optional[str] = None):
        """Get sandbox users"""
        return await service.get_sandbox_users(role)

    @router.get("/listings")
    async def get_listings(seller_id: Optional[str] = None):
        """Get sandbox listings"""
        return await service.get_sandbox_listings(seller_id)

    @router.get("/orders")
    async def get_orders(
        buyer_id: Optional[str] = None,
        seller_id: Optional[str] = None,
        status: Optional[str] = None
    ):
        """Get sandbox orders"""
        return await service.get_sandbox_orders(buyer_id, seller_id, status)

    @router.get("/escrows")
    async def get_escrows(status: Optional[str] = None):
        """Get sandbox escrows"""
        return await service.get_sandbox_escrows(status)

    # -------------------------------------------------------------------------
    # MOCK PAYMENTS
    # -------------------------------------------------------------------------

    @router.post("/payment/process")
    async def process_payment(
        order_id: str = Body(...),
        amount: float = Body(...),
        method: PaymentMethod = Body(...),
        simulate_failure: bool = Body(False)
    ):
        """Process mock payment"""
        result = await service.process_mock_payment(order_id, amount, method, simulate_failure)
        return result.dict()

    @router.post("/payment/refund")
    async def process_refund(
        order_id: str = Body(...),
        amount: float = Body(...),
        reason: str = Body(...),
        partial: bool = Body(False)
    ):
        """Process mock refund"""
        return await service.process_mock_refund(order_id, amount, reason, partial)

    # -------------------------------------------------------------------------
    # NOTIFICATIONS
    # -------------------------------------------------------------------------

    @router.post("/notification/send")
    async def send_notification(
        user_id: str = Body(...),
        title: str = Body(...),
        body: str = Body(...),
        notification_type: str = Body("general")
    ):
        """Send mock notification"""
        return await service.send_mock_notification(user_id, title, body, notification_type)

    # -------------------------------------------------------------------------
    # SIMULATION TOOLS
    # -------------------------------------------------------------------------

    @router.post("/simulate/fast-forward")
    async def fast_forward_time(
        session_id: str = Body(...),
        hours: int = Body(...),
        admin_id: str = Body(...)
    ):
        """Fast-forward simulated time"""
        return await service.fast_forward_time(session_id, hours, admin_id)

    @router.post("/simulate/delivery-failure")
    async def simulate_delivery_failure(
        order_id: str = Body(...),
        reason: str = Body(...),
        admin_id: str = Body(...)
    ):
        """Simulate delivery failure"""
        return await service.simulate_delivery_failure(order_id, reason, admin_id)

    @router.post("/simulate/payment-failure")
    async def simulate_payment_failure(
        order_id: str = Body(...),
        reason: str = Body(...),
        admin_id: str = Body(...)
    ):
        """Simulate payment failure"""
        return await service.simulate_payment_failure(order_id, reason, admin_id)

    @router.post("/simulate/transport-delay")
    async def simulate_transport_delay(
        order_id: str = Body(...),
        delay_hours: int = Body(...),
        reason: str = Body(...),
        admin_id: str = Body(...)
    ):
        """Simulate transport delay"""
        return await service.simulate_transport_delay(order_id, delay_hours, reason, admin_id)

    @router.post("/simulate/inject-error")
    async def inject_error(
        error_type: str = Body(...),
        component: str = Body(...),
        message: str = Body(...),
        admin_id: str = Body(...)
    ):
        """Inject test error"""
        return await service.inject_test_error(error_type, component, message, admin_id)

    # -------------------------------------------------------------------------
    # ESCROW & DISPUTES
    # -------------------------------------------------------------------------

    @router.post("/dispute/create")
    async def create_dispute(
        order_id: str = Body(...),
        reason: str = Body(...),
        description: str = Body(...),
        admin_id: str = Body(...)
    ):
        """Create sandbox dispute"""
        return await service.create_dispute(order_id, reason, description, admin_id)

    @router.post("/dispute/{dispute_id}/resolve")
    async def resolve_dispute(
        dispute_id: str,
        resolution: str = Body(...),
        refund_amount: Optional[float] = Body(None),
        admin_id: str = Body(...)
    ):
        """Resolve sandbox dispute"""
        return await service.resolve_dispute(dispute_id, resolution, refund_amount, admin_id)

    # -------------------------------------------------------------------------
    # TRANSPORT
    # -------------------------------------------------------------------------

    @router.post("/transport/update-status")
    async def update_transport_status(
        order_id: str = Body(...),
        new_status: TransportStatus = Body(...),
        admin_id: str = Body(...),
        otp: Optional[str] = Body(None)
    ):
        """Update transport status"""
        return await service.update_transport_status(order_id, new_status, admin_id, otp)

    # -------------------------------------------------------------------------
    # BANNER PREVIEW
    # -------------------------------------------------------------------------

    @router.post("/banner/preview")
    async def preview_banner(
        banner_id: str = Body(...),
        placement: str = Body(...),
        admin_id: str = Body(...)
    ):
        """Preview banner in sandbox"""
        return await service.preview_banner(banner_id, placement, admin_id)

    @router.get("/banners/{placement}")
    async def get_banners(placement: str):
        """Get banners for placement"""
        return await service.get_banners_for_placement(placement)

    # -------------------------------------------------------------------------
    # AUDIT LOGS
    # -------------------------------------------------------------------------

    @router.get("/audit")
    async def get_audit_logs(
        admin_id: Optional[str] = None,
        action: Optional[str] = None,
        page: int = Query(1, ge=1),
        limit: int = Query(50, ge=1, le=100)
    ):
        """Get sandbox audit logs"""
        return await service.get_audit_logs(admin_id, action, page, limit)

    # -------------------------------------------------------------------------
    # DATA PROXY - Main app endpoints for sandbox data
    # -------------------------------------------------------------------------

    @router.get("/proxy/verify/{session_id}")
    async def verify_session(session_id: str):
        """Verify a sandbox session is active"""
        session = await service.verify_sandbox_session(session_id)
        if not session:
            return {"valid": False, "session": None}
        return {"valid": True, "session": session}

    @router.get("/proxy/listings")
    async def proxy_get_listings(
        category: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = Query(20, ge=1, le=100),
        skip: int = Query(0, ge=0)
    ):
        """Get listings from sandbox collections"""
        return await service.get_proxy_listings(category, search, limit, skip)

    @router.get("/proxy/listings/{listing_id}")
    async def proxy_get_listing_detail(listing_id: str):
        """Get single listing detail from sandbox"""
        listing = await service.get_proxy_listing_detail(listing_id)
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        return listing

    @router.get("/proxy/orders/{user_id}")
    async def proxy_get_orders(user_id: str):
        """Get orders for a sandbox user"""
        return await service.get_proxy_user_orders(user_id)

    @router.get("/proxy/conversations/{user_id}")
    async def proxy_get_conversations(user_id: str):
        """Get conversations for a sandbox user"""
        return await service.get_proxy_conversations(user_id)

    @router.get("/proxy/notifications/{user_id}")
    async def proxy_get_notifications(user_id: str):
        """Get notifications for a sandbox user"""
        return await service.get_proxy_notifications(user_id)

    @router.get("/proxy/categories")
    async def proxy_get_categories():
        """Get categories (from production, tagged for sandbox)"""
        return await service.get_proxy_categories()

    @router.post("/proxy/order")
    async def proxy_create_order(
        session_id: str = Body(...),
        listing_id: str = Body(...),
        shipping_address: Dict = Body(...)
    ):
        """Create an order through sandbox proxy"""
        return await service.create_proxy_order(session_id, listing_id, shipping_address)

    @router.post("/proxy/message")
    async def proxy_send_message(
        session_id: str = Body(...),
        recipient_id: str = Body(...),
        message: str = Body(...)
    ):
        """Send a message through sandbox proxy"""
        return await service.send_proxy_message(session_id, recipient_id, message)

    return router, service
