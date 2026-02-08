"""
Seller Boost & Promotion System
Credits, Payments, and Boost Management
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Query, Body
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid
import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient

# Import Stripe integration
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, 
    CheckoutSessionResponse, 
    CheckoutStatusResponse, 
    CheckoutSessionRequest
)

logger = logging.getLogger("boost_system")

# =============================================================================
# ENUMS
# =============================================================================

class BoostType(str, Enum):
    FEATURED = "featured"           # Top of category & search
    HOMEPAGE = "homepage"           # Homepage spotlight
    URGENT = "urgent"               # Urgent/Highlighted badge
    LOCATION = "location"           # Location-based boost
    CATEGORY = "category"           # Category-based boost

class PaymentProvider(str, Enum):
    STRIPE = "stripe"
    PAYPAL = "paypal"
    MOBILE_MONEY = "mobile_money"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    EXPIRED = "expired"

class BoostStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    PENDING = "pending"

# =============================================================================
# MODELS
# =============================================================================

class CreditPackage(BaseModel):
    id: str = Field(default_factory=lambda: f"pkg_{uuid.uuid4().hex[:12]}")
    name: str
    description: Optional[str] = None
    price: float  # Price in USD
    credits: int  # Base credits
    bonus_credits: int = 0  # Bonus credits
    currency: str = "USD"
    is_active: bool = True
    is_popular: bool = False  # Highlight as popular
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

class BoostPricing(BaseModel):
    id: str = Field(default_factory=lambda: f"bp_{uuid.uuid4().hex[:12]}")
    boost_type: BoostType
    name: str
    description: Optional[str] = None
    credits_per_hour: int
    credits_per_day: int
    min_duration_hours: int = 1
    max_duration_days: int = 30
    is_enabled: bool = True
    priority: int = 1  # Higher = more prominent placement
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SellerCredits(BaseModel):
    id: str = Field(default_factory=lambda: f"sc_{uuid.uuid4().hex[:12]}")
    seller_id: str
    balance: int = 0
    total_purchased: int = 0
    total_spent: int = 0
    total_bonus_received: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

class CreditTransaction(BaseModel):
    id: str = Field(default_factory=lambda: f"ctx_{uuid.uuid4().hex[:12]}")
    seller_id: str
    transaction_type: str  # purchase, spend, refund, bonus, admin_add, admin_remove
    amount: int  # Positive or negative
    balance_after: int
    description: str
    reference_id: Optional[str] = None  # Payment ID, boost ID, etc.
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentTransaction(BaseModel):
    id: str = Field(default_factory=lambda: f"ptx_{uuid.uuid4().hex[:12]}")
    seller_id: str
    package_id: str
    provider: PaymentProvider
    session_id: Optional[str] = None
    amount: float
    currency: str = "USD"
    credits_to_add: int
    bonus_credits: int = 0
    status: PaymentStatus = PaymentStatus.PENDING
    metadata: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

class ListingBoost(BaseModel):
    id: str = Field(default_factory=lambda: f"boost_{uuid.uuid4().hex[:12]}")
    listing_id: str
    seller_id: str
    boost_type: BoostType
    credits_spent: int
    duration_hours: int
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime
    status: BoostStatus = BoostStatus.ACTIVE
    location_id: Optional[str] = None  # For location boost
    category_id: Optional[str] = None  # For category boost
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PaymentMethodConfig(BaseModel):
    """Configuration for a payment method"""
    id: str  # stripe, paypal, mpesa, mtn, vodacom_tz
    name: str
    description: str
    icon: str = "card"
    is_enabled: bool = True
    requires_phone: bool = False
    country: Optional[str] = None  # For region-specific methods
    currency: Optional[str] = None
    exchange_rate: float = 1.0  # USD to local currency
    min_amount: float = 1.0  # Minimum purchase amount
    max_amount: float = 1000.0  # Maximum purchase amount
    networks: List[str] = []  # For MTN: MTN, VODAFONE, TIGO
    priority: int = 0  # Display order
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None


class UpdatePaymentMethodRequest(BaseModel):
    """Request to update payment method configuration"""
    name: Optional[str] = None
    description: Optional[str] = None
    is_enabled: Optional[bool] = None
    exchange_rate: Optional[float] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    priority: Optional[int] = None

# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class CreatePackageRequest(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    credits: int
    bonus_credits: int = 0
    is_active: bool = True
    is_popular: bool = False

class UpdatePackageRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    credits: Optional[int] = None
    bonus_credits: Optional[int] = None
    is_active: Optional[bool] = None
    is_popular: Optional[bool] = None

class SetBoostPricingRequest(BaseModel):
    boost_type: BoostType
    name: str
    description: Optional[str] = None
    credits_per_hour: int
    credits_per_day: int
    min_duration_hours: int = 1
    max_duration_days: int = 30
    is_enabled: bool = True
    priority: int = 1

class PurchaseCreditsRequest(BaseModel):
    package_id: str
    provider: PaymentProvider = PaymentProvider.STRIPE
    origin_url: str  # Frontend URL for redirect

class CreateBoostRequest(BaseModel):
    listing_id: str
    boost_type: BoostType
    duration_hours: int
    location_id: Optional[str] = None
    category_id: Optional[str] = None

class AdminCreditAdjustRequest(BaseModel):
    seller_id: str
    amount: int  # Positive to add, negative to remove
    reason: str

# =============================================================================
# BOOST SYSTEM CLASS
# =============================================================================

class BoostSystem:
    def __init__(self, db):
        self.db = db
        self.stripe_api_key = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')
        
    async def initialize_default_data(self):
        """Initialize default packages and pricing if not exists"""
        # Default Credit Packages
        default_packages = [
            {"name": "Starter Pack", "description": "Perfect for trying out boosts", "price": 5.0, "credits": 50, "bonus_credits": 0, "is_popular": False},
            {"name": "Popular Pack", "description": "Best value for regular sellers", "price": 10.0, "credits": 100, "bonus_credits": 20, "is_popular": True},
            {"name": "Pro Pack", "description": "Maximum exposure for power sellers", "price": 25.0, "credits": 250, "bonus_credits": 100, "is_popular": False},
        ]
        
        existing_packages = await self.db.credit_packages.count_documents({})
        if existing_packages == 0:
            for pkg in default_packages:
                package = CreditPackage(**pkg)
                await self.db.credit_packages.insert_one(package.dict())
            logger.info("Initialized default credit packages")
        
        # Default Boost Pricing
        default_pricing = [
            {"boost_type": BoostType.FEATURED, "name": "Featured Placement", "description": "Appear at top of category and search results", "credits_per_hour": 1, "credits_per_day": 10, "priority": 5},
            {"boost_type": BoostType.HOMEPAGE, "name": "Homepage Spotlight", "description": "Featured on homepage carousel", "credits_per_hour": 3, "credits_per_day": 25, "priority": 6},
            {"boost_type": BoostType.URGENT, "name": "Urgent Badge", "description": "Stand out with urgent/highlighted badge", "credits_per_hour": 1, "credits_per_day": 5, "priority": 3},
            {"boost_type": BoostType.LOCATION, "name": "Location Boost", "description": "Top placement in specific location", "credits_per_hour": 2, "credits_per_day": 15, "priority": 4},
            {"boost_type": BoostType.CATEGORY, "name": "Category Boost", "description": "Premium placement in category", "credits_per_hour": 2, "credits_per_day": 12, "priority": 4},
        ]
        
        existing_pricing = await self.db.boost_pricing.count_documents({})
        if existing_pricing == 0:
            for pricing in default_pricing:
                bp = BoostPricing(**pricing)
                await self.db.boost_pricing.insert_one(bp.dict())
            logger.info("Initialized default boost pricing")
        
        # Default Payment Methods
        default_payment_methods = [
            {
                "id": "stripe",
                "name": "Credit/Debit Card",
                "description": "Pay securely with Visa, Mastercard, Amex",
                "icon": "card",
                "is_enabled": True,
                "requires_phone": False,
                "currency": "USD",
                "exchange_rate": 1.0,
                "min_amount": 1.0,
                "max_amount": 1000.0,
                "priority": 1
            },
            {
                "id": "paypal",
                "name": "PayPal",
                "description": "Pay with your PayPal account",
                "icon": "logo-paypal",
                "is_enabled": True,
                "requires_phone": False,
                "currency": "USD",
                "exchange_rate": 1.0,
                "min_amount": 1.0,
                "max_amount": 1000.0,
                "priority": 2
            },
            {
                "id": "mpesa",
                "name": "M-Pesa",
                "description": "Pay with M-Pesa (Kenya)",
                "icon": "phone-portrait",
                "is_enabled": True,
                "requires_phone": True,
                "country": "KE",
                "currency": "KES",
                "exchange_rate": 130.0,
                "min_amount": 1.0,
                "max_amount": 500.0,
                "priority": 3
            },
            {
                "id": "mtn",
                "name": "MTN Mobile Money",
                "description": "Pay with MTN MoMo (Ghana, Uganda, Zambia)",
                "icon": "phone-portrait",
                "is_enabled": True,
                "requires_phone": True,
                "country": "GH",
                "currency": "GHS",
                "exchange_rate": 15.0,
                "min_amount": 1.0,
                "max_amount": 500.0,
                "networks": ["MTN", "VODAFONE", "TIGO"],
                "priority": 4
            },
            {
                "id": "vodacom_tz",
                "name": "Vodacom Tanzania",
                "description": "Pay with M-Pesa Tanzania",
                "icon": "phone-portrait",
                "is_enabled": True,
                "requires_phone": True,
                "country": "TZ",
                "currency": "TZS",
                "exchange_rate": 2500.0,
                "min_amount": 1.0,
                "max_amount": 500.0,
                "priority": 5
            }
        ]
        
        existing_methods = await self.db.payment_methods.count_documents({})
        if existing_methods == 0:
            for method in default_payment_methods:
                method["created_at"] = datetime.now(timezone.utc).isoformat()
                await self.db.payment_methods.insert_one(method)
            logger.info("Initialized default payment methods")
    
    # =========================================================================
    # PAYMENT METHODS MANAGEMENT
    # =========================================================================
    
    async def get_payment_methods(self, enabled_only: bool = False) -> List[dict]:
        """Get all payment methods"""
        query = {"is_enabled": True} if enabled_only else {}
        methods = await self.db.payment_methods.find(query, {"_id": 0}).sort("priority", 1).to_list(100)
        
        # If no methods in DB, return defaults
        if not methods:
            return [
                {"id": "stripe", "name": "Credit/Debit Card", "description": "Pay securely with Visa, Mastercard, Amex", "icon": "card", "is_enabled": True, "requires_phone": False, "priority": 1},
                {"id": "paypal", "name": "PayPal", "description": "Pay with your PayPal account", "icon": "logo-paypal", "is_enabled": True, "requires_phone": False, "priority": 2},
                {"id": "mpesa", "name": "M-Pesa", "description": "Pay with M-Pesa (Kenya)", "icon": "phone-portrait", "is_enabled": True, "requires_phone": True, "country": "KE", "currency": "KES", "exchange_rate": 130.0, "priority": 3},
                {"id": "mtn", "name": "MTN Mobile Money", "description": "Pay with MTN MoMo", "icon": "phone-portrait", "is_enabled": True, "requires_phone": True, "country": "GH", "currency": "GHS", "exchange_rate": 15.0, "networks": ["MTN", "VODAFONE", "TIGO"], "priority": 4},
                {"id": "vodacom_tz", "name": "Vodacom Tanzania", "description": "Pay with M-Pesa Tanzania", "icon": "phone-portrait", "is_enabled": True, "requires_phone": True, "country": "TZ", "currency": "TZS", "exchange_rate": 2500.0, "priority": 5},
            ]
        return methods
    
    async def get_payment_method(self, method_id: str) -> Optional[dict]:
        """Get single payment method by ID"""
        return await self.db.payment_methods.find_one({"id": method_id}, {"_id": 0})
    
    async def update_payment_method(self, method_id: str, data: UpdatePaymentMethodRequest) -> dict:
        """Update payment method configuration"""
        updates = {k: v for k, v in data.dict().items() if v is not None}
        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await self.db.payment_methods.update_one(
            {"id": method_id},
            {"$set": updates}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Payment method not found")
        
        return await self.get_payment_method(method_id)
    
    async def toggle_payment_method(self, method_id: str, enabled: bool) -> dict:
        """Enable or disable a payment method"""
        result = await self.db.payment_methods.update_one(
            {"id": method_id},
            {"$set": {"is_enabled": enabled, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Payment method not found")
        
        return await self.get_payment_method(method_id)
    
    # =========================================================================
    # CREDIT PACKAGES
    # =========================================================================
    
    async def get_packages(self, active_only: bool = True) -> List[dict]:
        """Get all credit packages"""
        query = {"is_active": True} if active_only else {}
        packages = await self.db.credit_packages.find(query, {"_id": 0}).sort("price", 1).to_list(100)
        return packages
    
    async def get_package(self, package_id: str) -> Optional[dict]:
        """Get single package by ID"""
        return await self.db.credit_packages.find_one({"id": package_id}, {"_id": 0})
    
    async def create_package(self, data: CreatePackageRequest) -> dict:
        """Create new credit package"""
        package = CreditPackage(**data.dict())
        await self.db.credit_packages.insert_one(package.dict())
        return package.dict()
    
    async def update_package(self, package_id: str, data: UpdatePackageRequest) -> dict:
        """Update credit package"""
        updates = {k: v for k, v in data.dict().items() if v is not None}
        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await self.db.credit_packages.update_one(
            {"id": package_id},
            {"$set": updates}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Package not found")
        
        return await self.get_package(package_id)
    
    async def delete_package(self, package_id: str):
        """Delete credit package"""
        result = await self.db.credit_packages.delete_one({"id": package_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Package not found")
        return {"message": "Package deleted"}
    
    # =========================================================================
    # BOOST PRICING
    # =========================================================================
    
    async def get_boost_pricing(self, enabled_only: bool = True) -> List[dict]:
        """Get all boost pricing"""
        query = {"is_enabled": True} if enabled_only else {}
        pricing = await self.db.boost_pricing.find(query, {"_id": 0}).sort("priority", -1).to_list(100)
        return pricing
    
    async def get_boost_price(self, boost_type: BoostType) -> Optional[dict]:
        """Get pricing for specific boost type"""
        return await self.db.boost_pricing.find_one({"boost_type": boost_type}, {"_id": 0})
    
    async def set_boost_pricing(self, data: SetBoostPricingRequest) -> dict:
        """Create or update boost pricing"""
        existing = await self.db.boost_pricing.find_one({"boost_type": data.boost_type})
        
        if existing:
            updates = data.dict()
            updates["updated_at"] = datetime.now(timezone.utc).isoformat()
            await self.db.boost_pricing.update_one(
                {"boost_type": data.boost_type},
                {"$set": updates}
            )
        else:
            bp = BoostPricing(**data.dict())
            await self.db.boost_pricing.insert_one(bp.dict())
        
        return await self.get_boost_price(data.boost_type)
    
    async def toggle_boost_type(self, boost_type: BoostType, enabled: bool) -> dict:
        """Enable or disable a boost type"""
        result = await self.db.boost_pricing.update_one(
            {"boost_type": boost_type},
            {"$set": {"is_enabled": enabled}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Boost type not found")
        return await self.get_boost_price(boost_type)
    
    # =========================================================================
    # SELLER CREDITS
    # =========================================================================
    
    async def get_seller_credits(self, seller_id: str) -> dict:
        """Get seller's credit balance and stats"""
        credits = await self.db.seller_credits.find_one({"seller_id": seller_id}, {"_id": 0})
        if not credits:
            # Create new credit record
            credits = SellerCredits(seller_id=seller_id).dict()
            await self.db.seller_credits.insert_one(credits)
        return credits
    
    async def add_credits(self, seller_id: str, amount: int, transaction_type: str, description: str, reference_id: str = None) -> dict:
        """Add credits to seller account"""
        credits = await self.get_seller_credits(seller_id)
        new_balance = credits["balance"] + amount
        
        # Update balance
        update_data = {
            "balance": new_balance,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if transaction_type == "purchase":
            update_data["total_purchased"] = credits.get("total_purchased", 0) + amount
        elif transaction_type == "bonus":
            update_data["total_bonus_received"] = credits.get("total_bonus_received", 0) + amount
        
        await self.db.seller_credits.update_one(
            {"seller_id": seller_id},
            {"$set": update_data}
        )
        
        # Log transaction
        transaction = CreditTransaction(
            seller_id=seller_id,
            transaction_type=transaction_type,
            amount=amount,
            balance_after=new_balance,
            description=description,
            reference_id=reference_id
        )
        await self.db.credit_transactions.insert_one(transaction.dict())
        
        return await self.get_seller_credits(seller_id)
    
    async def spend_credits(self, seller_id: str, amount: int, description: str, reference_id: str = None) -> dict:
        """Spend credits from seller account"""
        credits = await self.get_seller_credits(seller_id)
        
        if credits["balance"] < amount:
            raise HTTPException(status_code=400, detail="Insufficient credits")
        
        new_balance = credits["balance"] - amount
        
        await self.db.seller_credits.update_one(
            {"seller_id": seller_id},
            {"$set": {
                "balance": new_balance,
                "total_spent": credits.get("total_spent", 0) + amount,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Log transaction
        transaction = CreditTransaction(
            seller_id=seller_id,
            transaction_type="spend",
            amount=-amount,
            balance_after=new_balance,
            description=description,
            reference_id=reference_id
        )
        await self.db.credit_transactions.insert_one(transaction.dict())
        
        return await self.get_seller_credits(seller_id)
    
    async def get_credit_history(self, seller_id: str, limit: int = 50) -> List[dict]:
        """Get seller's credit transaction history"""
        transactions = await self.db.credit_transactions.find(
            {"seller_id": seller_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        return transactions
    
    # =========================================================================
    # PAYMENTS - STRIPE
    # =========================================================================
    
    async def create_stripe_checkout(self, request: Request, seller_id: str, data: PurchaseCreditsRequest) -> dict:
        """Create Stripe checkout session for credit purchase"""
        package = await self.get_package(data.package_id)
        if not package:
            raise HTTPException(status_code=404, detail="Package not found")
        
        if not package.get("is_active"):
            raise HTTPException(status_code=400, detail="Package is not available")
        
        # Initialize Stripe
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=self.stripe_api_key, webhook_url=webhook_url)
        
        # Build URLs
        success_url = f"{data.origin_url}/credits/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{data.origin_url}/credits"
        
        # Create checkout session
        checkout_request = CheckoutSessionRequest(
            amount=float(package["price"]),
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "seller_id": seller_id,
                "package_id": data.package_id,
                "credits": str(package["credits"]),
                "bonus_credits": str(package.get("bonus_credits", 0))
            }
        )
        
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create payment transaction record
        payment = PaymentTransaction(
            seller_id=seller_id,
            package_id=data.package_id,
            provider=PaymentProvider.STRIPE,
            session_id=session.session_id,
            amount=package["price"],
            credits_to_add=package["credits"],
            bonus_credits=package.get("bonus_credits", 0),
            status=PaymentStatus.PENDING,
            metadata={"stripe_session_id": session.session_id}
        )
        await self.db.payment_transactions.insert_one(payment.dict())
        
        return {
            "checkout_url": session.url,
            "session_id": session.session_id,
            "package": package
        }
    
    async def check_payment_status(self, request: Request, session_id: str) -> dict:
        """Check Stripe payment status and process if completed"""
        # Get payment transaction
        payment = await self.db.payment_transactions.find_one(
            {"session_id": session_id},
            {"_id": 0}
        )
        
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # If already completed, return status
        if payment["status"] == PaymentStatus.COMPLETED:
            return {"status": "completed", "payment": payment}
        
        # Check with Stripe
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=self.stripe_api_key, webhook_url=webhook_url)
        
        status = await stripe_checkout.get_checkout_status(session_id)
        
        if status.payment_status == "paid" and payment["status"] != PaymentStatus.COMPLETED:
            # Process payment - add credits
            total_credits = payment["credits_to_add"] + payment.get("bonus_credits", 0)
            
            await self.add_credits(
                seller_id=payment["seller_id"],
                amount=payment["credits_to_add"],
                transaction_type="purchase",
                description=f"Purchased credit package",
                reference_id=payment["id"]
            )
            
            if payment.get("bonus_credits", 0) > 0:
                await self.add_credits(
                    seller_id=payment["seller_id"],
                    amount=payment["bonus_credits"],
                    transaction_type="bonus",
                    description=f"Bonus credits from package purchase",
                    reference_id=payment["id"]
                )
            
            # Update payment status
            await self.db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "status": PaymentStatus.COMPLETED,
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            return {"status": "completed", "credits_added": total_credits}
        
        elif status.status == "expired":
            await self.db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"status": PaymentStatus.EXPIRED}}
            )
            return {"status": "expired"}
        
        return {"status": status.payment_status}
    
    async def handle_stripe_webhook(self, request: Request, body: bytes, signature: str) -> dict:
        """Handle Stripe webhook events"""
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=self.stripe_api_key, webhook_url=webhook_url)
        
        try:
            event = await stripe_checkout.handle_webhook(body, signature)
            
            if event.payment_status == "paid":
                # Process the payment
                await self.check_payment_status(request, event.session_id)
            
            return {"status": "ok", "event_type": event.event_type}
        except Exception as e:
            logger.error(f"Webhook error: {e}")
            raise HTTPException(status_code=400, detail=str(e))
    
    # =========================================================================
    # LISTING BOOSTS
    # =========================================================================
    
    async def calculate_boost_cost(self, boost_type: BoostType, duration_hours: int) -> dict:
        """Calculate credit cost for a boost"""
        pricing = await self.get_boost_price(boost_type)
        if not pricing:
            raise HTTPException(status_code=404, detail="Boost type not found")
        
        if not pricing.get("is_enabled"):
            raise HTTPException(status_code=400, detail="This boost type is currently disabled")
        
        # Calculate cost
        days = duration_hours // 24
        remaining_hours = duration_hours % 24
        
        cost = (days * pricing["credits_per_day"]) + (remaining_hours * pricing["credits_per_hour"])
        
        return {
            "boost_type": boost_type,
            "duration_hours": duration_hours,
            "credit_cost": cost,
            "pricing": pricing
        }
    
    async def create_boost(self, seller_id: str, data: CreateBoostRequest) -> dict:
        """Create a new boost for a listing"""
        # Check if boost type is enabled
        pricing = await self.get_boost_price(data.boost_type)
        if not pricing or not pricing.get("is_enabled"):
            raise HTTPException(status_code=400, detail="This boost type is not available")
        
        # Validate duration
        min_hours = pricing.get("min_duration_hours", 1)
        max_hours = pricing.get("max_duration_days", 30) * 24
        
        if data.duration_hours < min_hours or data.duration_hours > max_hours:
            raise HTTPException(
                status_code=400, 
                detail=f"Duration must be between {min_hours} hours and {max_hours} hours"
            )
        
        # Check if listing exists and belongs to seller
        listing = await self.db.listings.find_one({"id": data.listing_id})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        if listing.get("seller_id") != seller_id and listing.get("user_id") != seller_id:
            raise HTTPException(status_code=403, detail="You don't own this listing")
        
        # Check listing status
        if listing.get("status") not in ["active", "published"]:
            raise HTTPException(status_code=400, detail="Cannot boost inactive or expired listings")
        
        # Check for existing active boost of same type (fraud prevention)
        existing_boost = await self.db.listing_boosts.find_one({
            "listing_id": data.listing_id,
            "boost_type": data.boost_type,
            "status": BoostStatus.ACTIVE
        })
        
        if existing_boost:
            raise HTTPException(
                status_code=400, 
                detail="This listing already has an active boost of this type"
            )
        
        # Calculate cost
        cost_info = await self.calculate_boost_cost(data.boost_type, data.duration_hours)
        credit_cost = cost_info["credit_cost"]
        
        # Check seller has enough credits
        seller_credits = await self.get_seller_credits(seller_id)
        if seller_credits["balance"] < credit_cost:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient credits. Need {credit_cost}, have {seller_credits['balance']}"
            )
        
        # Create boost
        now = datetime.now(timezone.utc)
        boost = ListingBoost(
            listing_id=data.listing_id,
            seller_id=seller_id,
            boost_type=data.boost_type,
            credits_spent=credit_cost,
            duration_hours=data.duration_hours,
            started_at=now,
            expires_at=now + timedelta(hours=data.duration_hours),
            location_id=data.location_id,
            category_id=data.category_id
        )
        
        # Spend credits
        await self.spend_credits(
            seller_id=seller_id,
            amount=credit_cost,
            description=f"{pricing['name']} boost for {data.duration_hours}h",
            reference_id=boost.id
        )
        
        # Save boost
        await self.db.listing_boosts.insert_one(boost.dict())
        
        # Update listing with boost info
        await self.db.listings.update_one(
            {"id": data.listing_id},
            {"$set": {
                f"boosts.{data.boost_type}": {
                    "boost_id": boost.id,
                    "expires_at": boost.expires_at.isoformat(),
                    "is_active": True
                },
                "is_boosted": True,
                "boost_priority": pricing.get("priority", 1)
            }}
        )
        
        return boost.dict()
    
    async def get_listing_boosts(self, listing_id: str) -> List[dict]:
        """Get all boosts for a listing"""
        boosts = await self.db.listing_boosts.find(
            {"listing_id": listing_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        return boosts
    
    async def get_seller_boosts(self, seller_id: str, active_only: bool = False) -> List[dict]:
        """Get all boosts by a seller"""
        query = {"seller_id": seller_id}
        if active_only:
            query["status"] = BoostStatus.ACTIVE
        
        boosts = await self.db.listing_boosts.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
        return boosts
    
    async def expire_boosts(self) -> int:
        """Expire all boosts that have passed their expiration time (called by cron job)"""
        now = datetime.now(timezone.utc)
        
        # Find expired boosts
        expired = await self.db.listing_boosts.find({
            "status": BoostStatus.ACTIVE,
            "expires_at": {"$lte": now.isoformat()}
        }).to_list(1000)
        
        count = 0
        for boost in expired:
            # Update boost status
            await self.db.listing_boosts.update_one(
                {"id": boost["id"]},
                {"$set": {"status": BoostStatus.EXPIRED}}
            )
            
            # Update listing
            await self.db.listings.update_one(
                {"id": boost["listing_id"]},
                {"$unset": {f"boosts.{boost['boost_type']}": ""}}
            )
            
            # Check if listing has any other active boosts
            remaining_boosts = await self.db.listing_boosts.find_one({
                "listing_id": boost["listing_id"],
                "status": BoostStatus.ACTIVE
            })
            
            if not remaining_boosts:
                await self.db.listings.update_one(
                    {"id": boost["listing_id"]},
                    {"$set": {"is_boosted": False, "boost_priority": 0}}
                )
            
            count += 1
        
        return count
    
    # =========================================================================
    # ADMIN ANALYTICS
    # =========================================================================
    
    async def get_boost_analytics(self) -> dict:
        """Get boost system analytics for admin"""
        now = datetime.now(timezone.utc)
        
        # Active boosts count
        active_boosts = await self.db.listing_boosts.count_documents({"status": BoostStatus.ACTIVE})
        
        # Total revenue (completed payments)
        revenue_pipeline = [
            {"$match": {"status": PaymentStatus.COMPLETED}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
        ]
        revenue_result = await self.db.payment_transactions.aggregate(revenue_pipeline).to_list(1)
        total_revenue = revenue_result[0]["total"] if revenue_result else 0
        total_purchases = revenue_result[0]["count"] if revenue_result else 0
        
        # Boosts by type
        boosts_by_type = await self.db.listing_boosts.aggregate([
            {"$group": {"_id": "$boost_type", "count": {"$sum": 1}, "active": {"$sum": {"$cond": [{"$eq": ["$status", "active"]}, 1, 0]}}}}
        ]).to_list(10)
        
        # Top boosted listings
        top_boosted = await self.db.listing_boosts.aggregate([
            {"$match": {"status": BoostStatus.ACTIVE}},
            {"$group": {"_id": "$listing_id", "boost_count": {"$sum": 1}, "total_spent": {"$sum": "$credits_spent"}}},
            {"$sort": {"total_spent": -1}},
            {"$limit": 10}
        ]).to_list(10)
        
        # Credits in circulation
        credits_pipeline = [
            {"$group": {"_id": None, "total_balance": {"$sum": "$balance"}, "total_purchased": {"$sum": "$total_purchased"}, "total_spent": {"$sum": "$total_spent"}}}
        ]
        credits_result = await self.db.seller_credits.aggregate(credits_pipeline).to_list(1)
        
        return {
            "active_boosts": active_boosts,
            "total_revenue": total_revenue,
            "total_purchases": total_purchases,
            "boosts_by_type": {item["_id"]: {"total": item["count"], "active": item["active"]} for item in boosts_by_type},
            "top_boosted_listings": top_boosted,
            "credits_stats": credits_result[0] if credits_result else {},
            "generated_at": now.isoformat()
        }
    
    async def admin_adjust_credits(self, admin_id: str, data: AdminCreditAdjustRequest) -> dict:
        """Admin add or remove credits from seller"""
        if data.amount == 0:
            raise HTTPException(status_code=400, detail="Amount cannot be zero")
        
        transaction_type = "admin_add" if data.amount > 0 else "admin_remove"
        
        if data.amount > 0:
            result = await self.add_credits(
                seller_id=data.seller_id,
                amount=data.amount,
                transaction_type=transaction_type,
                description=f"Admin adjustment: {data.reason}",
                reference_id=f"admin_{admin_id}"
            )
        else:
            # Check if seller has enough credits
            seller_credits = await self.get_seller_credits(data.seller_id)
            if seller_credits["balance"] < abs(data.amount):
                raise HTTPException(status_code=400, detail="Seller doesn't have enough credits")
            
            result = await self.spend_credits(
                seller_id=data.seller_id,
                amount=abs(data.amount),
                description=f"Admin adjustment: {data.reason}",
                reference_id=f"admin_{admin_id}"
            )
        
        return result
    
    async def get_all_sellers_credits(self, page: int = 1, limit: int = 20) -> dict:
        """Get all sellers with their credit balances (admin)"""
        skip = (page - 1) * limit
        
        sellers = await self.db.seller_credits.find(
            {}, {"_id": 0}
        ).sort("balance", -1).skip(skip).limit(limit).to_list(limit)
        
        total = await self.db.seller_credits.count_documents({})
        
        return {
            "items": sellers,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        }


# =============================================================================
# CREATE ROUTER
# =============================================================================

def create_boost_router(db, get_current_user, get_current_admin):
    """Create the boost system router with dependencies"""
    
    router = APIRouter(prefix="/boost", tags=["Boost System"])
    boost_system = BoostSystem(db)
    
    # Initialize default data on startup
    @router.on_event("startup")
    async def startup():
        await boost_system.initialize_default_data()
    
    # =========================================================================
    # PUBLIC ENDPOINTS
    # =========================================================================
    
    @router.get("/packages")
    async def get_credit_packages():
        """Get available credit packages"""
        return await boost_system.get_packages(active_only=True)
    
    @router.get("/pricing")
    async def get_boost_pricing():
        """Get boost pricing options"""
        return await boost_system.get_boost_pricing(enabled_only=True)
    
    @router.get("/calculate")
    async def calculate_boost_cost(
        boost_type: BoostType,
        duration_hours: int = Query(..., ge=1)
    ):
        """Calculate cost for a boost"""
        return await boost_system.calculate_boost_cost(boost_type, duration_hours)
    
    # =========================================================================
    # SELLER ENDPOINTS (requires auth)
    # =========================================================================
    
    @router.get("/credits/balance")
    async def get_my_credits(user: dict = Depends(get_current_user)):
        """Get seller's credit balance"""
        return await boost_system.get_seller_credits(user["user_id"])
    
    @router.get("/credits/history")
    async def get_my_credit_history(
        limit: int = Query(50, le=100),
        user: dict = Depends(get_current_user)
    ):
        """Get seller's credit transaction history"""
        return await boost_system.get_credit_history(user["user_id"], limit)
    
    @router.post("/credits/purchase")
    async def purchase_credits(
        request: Request,
        data: PurchaseCreditsRequest,
        user: dict = Depends(get_current_user)
    ):
        """Purchase credits via Stripe"""
        return await boost_system.create_stripe_checkout(request, user["user_id"], data)
    
    @router.get("/credits/payment-status/{session_id}")
    async def check_payment(
        request: Request,
        session_id: str,
        user: dict = Depends(get_current_user)
    ):
        """Check payment status"""
        return await boost_system.check_payment_status(request, session_id)
    
    @router.post("/create")
    async def create_boost(
        data: CreateBoostRequest,
        user: dict = Depends(get_current_user)
    ):
        """Create a new boost for a listing"""
        return await boost_system.create_boost(user["user_id"], data)
    
    @router.get("/my-boosts")
    async def get_my_boosts(
        active_only: bool = False,
        user: dict = Depends(get_current_user)
    ):
        """Get all my boosts"""
        return await boost_system.get_seller_boosts(user["user_id"], active_only)
    
    @router.get("/listing/{listing_id}")
    async def get_listing_boosts(listing_id: str):
        """Get all boosts for a listing"""
        return await boost_system.get_listing_boosts(listing_id)
    
    # =========================================================================
    # ADMIN ENDPOINTS
    # =========================================================================
    
    @router.get("/admin/packages")
    async def admin_get_packages(admin: dict = Depends(get_current_admin)):
        """Get all credit packages (including inactive)"""
        return await boost_system.get_packages(active_only=False)
    
    @router.post("/admin/packages")
    async def admin_create_package(
        data: CreatePackageRequest,
        admin: dict = Depends(get_current_admin)
    ):
        """Create a new credit package"""
        return await boost_system.create_package(data)
    
    @router.put("/admin/packages/{package_id}")
    async def admin_update_package(
        package_id: str,
        data: UpdatePackageRequest,
        admin: dict = Depends(get_current_admin)
    ):
        """Update a credit package"""
        return await boost_system.update_package(package_id, data)
    
    @router.delete("/admin/packages/{package_id}")
    async def admin_delete_package(
        package_id: str,
        admin: dict = Depends(get_current_admin)
    ):
        """Delete a credit package"""
        return await boost_system.delete_package(package_id)
    
    @router.get("/admin/pricing")
    async def admin_get_pricing(admin: dict = Depends(get_current_admin)):
        """Get all boost pricing (including disabled)"""
        return await boost_system.get_boost_pricing(enabled_only=False)
    
    @router.put("/admin/pricing")
    async def admin_set_pricing(
        data: SetBoostPricingRequest,
        admin: dict = Depends(get_current_admin)
    ):
        """Create or update boost pricing"""
        return await boost_system.set_boost_pricing(data)
    
    @router.put("/admin/pricing/{boost_type}/toggle")
    async def admin_toggle_boost_type(
        boost_type: BoostType,
        enabled: bool = Query(...),
        admin: dict = Depends(get_current_admin)
    ):
        """Enable or disable a boost type"""
        return await boost_system.toggle_boost_type(boost_type, enabled)
    
    @router.get("/admin/analytics")
    async def admin_get_analytics(admin: dict = Depends(get_current_admin)):
        """Get boost system analytics"""
        return await boost_system.get_boost_analytics()
    
    @router.get("/admin/sellers")
    async def admin_get_sellers_credits(
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100),
        admin: dict = Depends(get_current_admin)
    ):
        """Get all sellers with credit balances"""
        return await boost_system.get_all_sellers_credits(page, limit)
    
    @router.post("/admin/credits/adjust")
    async def admin_adjust_credits(
        data: AdminCreditAdjustRequest,
        admin: dict = Depends(get_current_admin)
    ):
        """Add or remove credits from a seller"""
        return await boost_system.admin_adjust_credits(admin["id"], data)
    
    @router.post("/admin/expire-boosts")
    async def admin_expire_boosts(admin: dict = Depends(get_current_admin)):
        """Manually trigger boost expiration (normally runs via cron)"""
        count = await boost_system.expire_boosts()
        return {"expired_count": count}
    
    return router, boost_system
