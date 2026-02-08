"""
Premium Verified Seller Online Selling System with Escrow Payments
Comprehensive system for secure online transactions with escrow protection
"""

from fastapi import APIRouter, HTTPException, Request, Query, Depends, Body, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid
import logging
import asyncio
from decimal import Decimal, ROUND_HALF_UP

logger = logging.getLogger(__name__)


# =============================================================================
# ENUMS
# =============================================================================

class OrderStatus(str, Enum):
    PENDING_PAYMENT = "pending_payment"
    PAYMENT_PROCESSING = "payment_processing"
    PAYMENT_FAILED = "payment_failed"
    PAID = "paid"
    PREPARING = "preparing"
    SHIPPED = "shipped"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CONFIRMED = "confirmed"  # Buyer confirmed receipt
    COMPLETED = "completed"  # Escrow released
    DISPUTED = "disputed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class EscrowStatus(str, Enum):
    PENDING = "pending"  # Awaiting payment
    FUNDED = "funded"  # Money received, locked
    RELEASING = "releasing"  # In process of release
    RELEASED = "released"  # Released to seller
    REFUNDED = "refunded"  # Refunded to buyer
    PARTIAL_REFUND = "partial_refund"
    DISPUTED = "disputed"


class DisputeStatus(str, Enum):
    OPEN = "open"
    UNDER_REVIEW = "under_review"
    RESOLVED_SELLER = "resolved_seller"  # Funds released to seller
    RESOLVED_BUYER = "resolved_buyer"  # Refunded to buyer
    RESOLVED_PARTIAL = "resolved_partial"  # Partial refund
    CLOSED = "closed"


class DisputeReason(str, Enum):
    NOT_RECEIVED = "not_received"
    NOT_AS_DESCRIBED = "not_as_described"
    DAMAGED = "damaged"
    WRONG_ITEM = "wrong_item"
    QUALITY_ISSUE = "quality_issue"
    OTHER = "other"


class DeliveryMethod(str, Enum):
    PICKUP = "pickup"
    DOOR_DELIVERY = "door_delivery"


class PaymentMethod(str, Enum):
    CARD = "card"
    PAYPAL = "paypal"
    MOBILE_MONEY = "mobile_money"


# =============================================================================
# MODELS
# =============================================================================

class DeliveryAddress(BaseModel):
    """Delivery address for orders"""
    full_name: str
    phone: str
    street_address: str
    city: str
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: str
    coordinates: Optional[Dict[str, float]] = None  # {"lat": x, "lng": y}


class TransportPricing(BaseModel):
    """Transport pricing configuration"""
    id: str
    name: str
    base_price: float  # Base delivery fee
    price_per_km: float  # Price per kilometer
    price_per_kg: float  # Price per kilogram
    min_price: float = 5.0  # Minimum delivery charge
    max_distance_km: float = 500.0  # Maximum delivery distance
    estimated_days_base: int = 1  # Base delivery days
    estimated_days_per_100km: float = 0.5  # Additional days per 100km
    is_active: bool = True


class VATConfig(BaseModel):
    """VAT configuration per country"""
    country_code: str
    country_name: str
    vat_percentage: float
    is_active: bool = True


class CommissionConfig(BaseModel):
    """Commission configuration"""
    id: str
    category_id: Optional[str] = None  # None = default for all
    seller_id: Optional[str] = None  # None = all sellers in category
    commission_percentage: float
    min_commission: float = 0.0
    max_commission: Optional[float] = None
    is_active: bool = True


class EscrowConfig(BaseModel):
    """Escrow configuration"""
    auto_release_days: int = 7  # Days after delivery confirmation
    dispute_window_days: int = 14  # Days buyer can open dispute
    max_dispute_resolution_days: int = 30
    is_escrow_enabled: bool = True


class OrderItem(BaseModel):
    """Item in an order"""
    listing_id: str
    title: str
    price: float
    quantity: int = 1
    image_url: Optional[str] = None
    category_id: Optional[str] = None
    weight_kg: Optional[float] = None


class CreateOrderRequest(BaseModel):
    """Request to create a new order"""
    listing_id: str
    quantity: int = 1
    delivery_method: str  # pickup or door_delivery
    delivery_address: Optional[DeliveryAddress] = None
    payment_method: str
    notes: Optional[str] = None


class OrderPriceBreakdown(BaseModel):
    """Price breakdown for an order"""
    item_price: float
    item_quantity: int
    subtotal: float
    transport_cost: float
    vat_amount: float
    vat_percentage: float
    platform_commission: float  # Hidden from buyer typically
    total_amount: float
    seller_receives: float  # After commission


# =============================================================================
# ESCROW SERVICE
# =============================================================================

class EscrowService:
    """Service for managing escrow and online selling"""
    
    def __init__(self, db):
        self.db = db
        self._auto_release_task = None
        self._running = False
    
    async def initialize(self):
        """Initialize default configurations"""
        # Default escrow config
        await self.db.escrow_config.update_one(
            {"id": "global"},
            {"$setOnInsert": {
                "id": "global",
                "auto_release_days": 7,
                "dispute_window_days": 14,
                "max_dispute_resolution_days": 30,
                "is_escrow_enabled": True
            }},
            upsert=True
        )
        
        # Default transport pricing
        default_transport = {
            "id": "standard",
            "name": "Standard Delivery",
            "base_price": 5.0,
            "price_per_km": 0.15,
            "price_per_kg": 0.5,
            "min_price": 5.0,
            "max_distance_km": 500.0,
            "estimated_days_base": 2,
            "estimated_days_per_100km": 0.5,
            "is_active": True
        }
        await self.db.transport_pricing.update_one(
            {"id": "standard"},
            {"$setOnInsert": default_transport},
            upsert=True
        )
        
        # Default VAT configs for common countries
        default_vats = [
            {"country_code": "US", "country_name": "United States", "vat_percentage": 0, "is_active": True},
            {"country_code": "GB", "country_name": "United Kingdom", "vat_percentage": 20, "is_active": True},
            {"country_code": "DE", "country_name": "Germany", "vat_percentage": 19, "is_active": True},
            {"country_code": "FR", "country_name": "France", "vat_percentage": 20, "is_active": True},
            {"country_code": "KE", "country_name": "Kenya", "vat_percentage": 16, "is_active": True},
            {"country_code": "NG", "country_name": "Nigeria", "vat_percentage": 7.5, "is_active": True},
            {"country_code": "ZA", "country_name": "South Africa", "vat_percentage": 15, "is_active": True},
            {"country_code": "UG", "country_name": "Uganda", "vat_percentage": 18, "is_active": True},
            {"country_code": "TZ", "country_name": "Tanzania", "vat_percentage": 18, "is_active": True},
        ]
        for vat in default_vats:
            await self.db.vat_configs.update_one(
                {"country_code": vat["country_code"]},
                {"$setOnInsert": vat},
                upsert=True
            )
        
        # Default commission config
        await self.db.commission_configs.update_one(
            {"id": "default"},
            {"$setOnInsert": {
                "id": "default",
                "category_id": None,
                "seller_id": None,
                "commission_percentage": 5.0,
                "min_commission": 0.50,
                "max_commission": None,
                "is_active": True
            }},
            upsert=True
        )
        
        logger.info("Escrow system initialized with default configurations")
    
    # =========================================================================
    # SELLER VERIFICATION
    # =========================================================================
    
    async def verify_seller(self, seller_id: str, admin_id: str, verified: bool = True) -> Dict:
        """Mark a seller as premium verified or unverify them"""
        now = datetime.now(timezone.utc).isoformat()
        
        update_data = {
            "is_premium_verified": verified,
            "can_sell_online": verified,
            "verified_at": now if verified else None,
            "verified_by": admin_id if verified else None,
            "online_selling_enabled": verified,
            "updated_at": now
        }
        
        result = await self.db.users.update_one(
            {"user_id": seller_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Seller not found")
        
        # Log the action
        await self.db.seller_verification_logs.insert_one({
            "id": f"verify_{uuid.uuid4().hex[:12]}",
            "seller_id": seller_id,
            "admin_id": admin_id,
            "action": "verified" if verified else "unverified",
            "timestamp": now
        })
        
        return {"seller_id": seller_id, "is_premium_verified": verified}
    
    async def get_verified_sellers(self, page: int = 1, limit: int = 20) -> Dict:
        """Get list of verified sellers"""
        skip = (page - 1) * limit
        
        sellers = await self.db.users.find(
            {"is_premium_verified": True},
            {"_id": 0, "password_hash": 0}
        ).skip(skip).limit(limit).to_list(limit)
        
        total = await self.db.users.count_documents({"is_premium_verified": True})
        
        return {
            "sellers": sellers,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    
    async def check_seller_can_sell_online(self, seller_id: str) -> Dict:
        """Check if a seller can sell online"""
        seller = await self.db.users.find_one(
            {"user_id": seller_id},
            {"is_premium_verified": 1, "can_sell_online": 1, "online_selling_enabled": 1}
        )
        
        if not seller:
            return {"can_sell_online": False, "reason": "Seller not found"}
        
        is_verified = seller.get("is_premium_verified", False)
        is_enabled = seller.get("online_selling_enabled", False)
        
        if not is_verified:
            return {"can_sell_online": False, "reason": "Seller is not premium verified"}
        
        if not is_enabled:
            return {"can_sell_online": False, "reason": "Online selling is disabled for this seller"}
        
        return {"can_sell_online": True, "reason": None}
    
    # =========================================================================
    # TRANSPORT PRICING
    # =========================================================================
    
    async def calculate_transport_cost(
        self,
        distance_km: float,
        weight_kg: float = 1.0,
        pricing_id: str = "standard"
    ) -> Dict:
        """Calculate transport cost based on distance and weight"""
        pricing = await self.db.transport_pricing.find_one({"id": pricing_id, "is_active": True})
        
        if not pricing:
            pricing = await self.db.transport_pricing.find_one({"id": "standard"})
        
        if not pricing:
            # Fallback pricing
            pricing = {
                "base_price": 5.0,
                "price_per_km": 0.15,
                "price_per_kg": 0.5,
                "min_price": 5.0,
                "estimated_days_base": 2,
                "estimated_days_per_100km": 0.5
            }
        
        # Calculate cost
        distance_cost = distance_km * pricing["price_per_km"]
        weight_cost = weight_kg * pricing["price_per_kg"]
        total_cost = pricing["base_price"] + distance_cost + weight_cost
        
        # Apply minimum
        total_cost = max(total_cost, pricing["min_price"])
        
        # Round to 2 decimal places
        total_cost = round(total_cost, 2)
        
        # Estimate delivery days
        estimated_days = pricing["estimated_days_base"] + (distance_km / 100) * pricing["estimated_days_per_100km"]
        estimated_days = max(1, round(estimated_days))
        
        return {
            "transport_cost": total_cost,
            "estimated_days": estimated_days,
            "breakdown": {
                "base_price": pricing["base_price"],
                "distance_cost": round(distance_cost, 2),
                "weight_cost": round(weight_cost, 2),
                "distance_km": distance_km,
                "weight_kg": weight_kg
            }
        }
    
    async def get_transport_pricing(self) -> List[Dict]:
        """Get all transport pricing configurations"""
        return await self.db.transport_pricing.find({}, {"_id": 0}).to_list(100)
    
    async def update_transport_pricing(self, pricing_id: str, update: Dict) -> Dict:
        """Update transport pricing"""
        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        await self.db.transport_pricing.update_one(
            {"id": pricing_id},
            {"$set": update},
            upsert=True
        )
        return await self.db.transport_pricing.find_one({"id": pricing_id}, {"_id": 0})
    
    # =========================================================================
    # VAT CONFIGURATION
    # =========================================================================
    
    async def get_vat_for_country(self, country_code: str) -> float:
        """Get VAT percentage for a country"""
        vat = await self.db.vat_configs.find_one(
            {"country_code": country_code.upper(), "is_active": True}
        )
        return vat["vat_percentage"] if vat else 0.0
    
    async def get_vat_configs(self) -> List[Dict]:
        """Get all VAT configurations"""
        return await self.db.vat_configs.find({}, {"_id": 0}).to_list(100)
    
    async def update_vat_config(self, country_code: str, update: Dict) -> Dict:
        """Update VAT configuration for a country"""
        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        await self.db.vat_configs.update_one(
            {"country_code": country_code.upper()},
            {"$set": update},
            upsert=True
        )
        return await self.db.vat_configs.find_one({"country_code": country_code.upper()}, {"_id": 0})
    
    # =========================================================================
    # COMMISSION CONFIGURATION
    # =========================================================================
    
    async def get_commission_percentage(self, category_id: Optional[str], seller_id: str) -> float:
        """Get commission percentage for a category/seller"""
        # First check seller-specific commission
        seller_commission = await self.db.commission_configs.find_one({
            "seller_id": seller_id,
            "is_active": True
        })
        if seller_commission:
            return seller_commission["commission_percentage"]
        
        # Then check category-specific
        if category_id:
            category_commission = await self.db.commission_configs.find_one({
                "category_id": category_id,
                "seller_id": None,
                "is_active": True
            })
            if category_commission:
                return category_commission["commission_percentage"]
        
        # Fall back to default
        default = await self.db.commission_configs.find_one({
            "id": "default",
            "is_active": True
        })
        return default["commission_percentage"] if default else 5.0
    
    async def get_commission_configs(self) -> List[Dict]:
        """Get all commission configurations"""
        return await self.db.commission_configs.find({}, {"_id": 0}).to_list(100)
    
    async def update_commission_config(self, config_id: str, update: Dict) -> Dict:
        """Update commission configuration"""
        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        if "id" not in update:
            update["id"] = config_id
        await self.db.commission_configs.update_one(
            {"id": config_id},
            {"$set": update},
            upsert=True
        )
        return await self.db.commission_configs.find_one({"id": config_id}, {"_id": 0})
    
    # =========================================================================
    # ESCROW CONFIGURATION
    # =========================================================================
    
    async def get_escrow_config(self) -> Dict:
        """Get escrow configuration"""
        config = await self.db.escrow_config.find_one({"id": "global"}, {"_id": 0})
        return config or {
            "auto_release_days": 7,
            "dispute_window_days": 14,
            "max_dispute_resolution_days": 30,
            "is_escrow_enabled": True
        }
    
    async def update_escrow_config(self, update: Dict) -> Dict:
        """Update escrow configuration"""
        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        await self.db.escrow_config.update_one(
            {"id": "global"},
            {"$set": update},
            upsert=True
        )
        return await self.get_escrow_config()
    
    # =========================================================================
    # ORDER CREATION & MANAGEMENT
    # =========================================================================
    
    async def calculate_order_price(
        self,
        listing_id: str,
        quantity: int,
        delivery_method: str,
        delivery_address: Optional[Dict] = None,
        buyer_country: str = "US"
    ) -> Dict:
        """Calculate full price breakdown for an order"""
        # Get listing
        listing = await self.db.listings.find_one({"id": listing_id})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        # Check seller can sell online
        seller_check = await self.check_seller_can_sell_online(listing["user_id"])
        if not seller_check["can_sell_online"]:
            raise HTTPException(status_code=403, detail=seller_check["reason"])
        
        # Calculate base price
        item_price = listing.get("price", 0)
        subtotal = item_price * quantity
        
        # Calculate transport cost
        transport_cost = 0.0
        estimated_days = 0
        if delivery_method == DeliveryMethod.DOOR_DELIVERY:
            # Get seller location
            seller = await self.db.users.find_one({"user_id": listing["user_id"]})
            seller_location = seller.get("location", {}) if seller else {}
            
            # Calculate distance (simplified - would need geocoding in production)
            distance_km = 50.0  # Default distance
            if delivery_address and delivery_address.get("coordinates") and seller_location.get("coordinates"):
                # Calculate actual distance using coordinates
                from math import radians, sin, cos, sqrt, atan2
                lat1 = radians(seller_location["coordinates"].get("lat", 0))
                lon1 = radians(seller_location["coordinates"].get("lng", 0))
                lat2 = radians(delivery_address["coordinates"].get("lat", 0))
                lon2 = radians(delivery_address["coordinates"].get("lng", 0))
                
                dlat = lat2 - lat1
                dlon = lon2 - lon1
                a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
                c = 2 * atan2(sqrt(a), sqrt(1-a))
                distance_km = 6371 * c  # Earth's radius in km
            
            weight_kg = listing.get("weight_kg", 1.0)
            transport_calc = await self.calculate_transport_cost(distance_km, weight_kg)
            transport_cost = transport_calc["transport_cost"]
            estimated_days = transport_calc["estimated_days"]
        
        # Calculate VAT
        country_code = buyer_country
        if delivery_address:
            country_code = delivery_address.get("country", buyer_country)
        vat_percentage = await self.get_vat_for_country(country_code)
        vat_amount = round((subtotal + transport_cost) * (vat_percentage / 100), 2)
        
        # Calculate commission
        commission_percentage = await self.get_commission_percentage(
            listing.get("category_id"),
            listing["user_id"]
        )
        commission_amount = round(subtotal * (commission_percentage / 100), 2)
        
        # Total
        total_amount = round(subtotal + transport_cost + vat_amount, 2)
        seller_receives = round(subtotal - commission_amount, 2)
        
        return {
            "item_price": item_price,
            "item_quantity": quantity,
            "subtotal": subtotal,
            "transport_cost": transport_cost,
            "estimated_delivery_days": estimated_days,
            "vat_amount": vat_amount,
            "vat_percentage": vat_percentage,
            "platform_commission": commission_amount,
            "commission_percentage": commission_percentage,
            "total_amount": total_amount,
            "seller_receives": seller_receives,
            "currency": "EUR"
        }
    
    async def create_order(
        self,
        buyer_id: str,
        listing_id: str,
        quantity: int,
        delivery_method: str,
        delivery_address: Optional[Dict],
        payment_method: str,
        notes: Optional[str] = None
    ) -> Dict:
        """Create a new order with escrow"""
        now = datetime.now(timezone.utc)
        
        # Get listing
        listing = await self.db.listings.find_one({"id": listing_id})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        if listing.get("status") != "active":
            raise HTTPException(status_code=400, detail="Listing is not active")
        
        # Prevent self-purchase
        if listing["user_id"] == buyer_id:
            raise HTTPException(status_code=400, detail="Cannot purchase your own listing")
        
        # Calculate prices
        price_breakdown = await self.calculate_order_price(
            listing_id,
            quantity,
            delivery_method,
            delivery_address,
            delivery_address.get("country", "US") if delivery_address else "US"
        )
        
        # Generate IDs
        order_id = f"order_{uuid.uuid4().hex[:12]}"
        escrow_id = f"escrow_{uuid.uuid4().hex[:12]}"
        
        # Create order
        order = {
            "id": order_id,
            "buyer_id": buyer_id,
            "seller_id": listing["user_id"],
            "listing_id": listing_id,
            "escrow_id": escrow_id,
            "status": OrderStatus.PENDING_PAYMENT,
            "item": {
                "listing_id": listing_id,
                "title": listing.get("title", ""),
                "price": listing.get("price", 0),
                "quantity": quantity,
                "image_url": listing.get("images", [None])[0],
                "category_id": listing.get("category_id"),
                "weight_kg": listing.get("weight_kg", 1.0)
            },
            "delivery_method": delivery_method,
            "delivery_address": delivery_address,
            "payment_method": payment_method,
            "price_breakdown": price_breakdown,
            "total_amount": price_breakdown["total_amount"],
            "currency": "EUR",
            "notes": notes,
            "tracking_number": None,
            "shipped_at": None,
            "delivered_at": None,
            "confirmed_at": None,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        # Create escrow record
        escrow_config = await self.get_escrow_config()
        escrow = {
            "id": escrow_id,
            "order_id": order_id,
            "buyer_id": buyer_id,
            "seller_id": listing["user_id"],
            "status": EscrowStatus.PENDING,
            "amount": price_breakdown["total_amount"],
            "seller_amount": price_breakdown["seller_receives"],
            "platform_commission": price_breakdown["platform_commission"],
            "currency": "EUR",
            "payment_method": payment_method,
            "payment_reference": None,
            "auto_release_at": None,  # Set after delivery confirmed
            "auto_release_days": escrow_config["auto_release_days"],
            "dispute_window_days": escrow_config["dispute_window_days"],
            "funded_at": None,
            "released_at": None,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        await self.db.orders.insert_one(order)
        await self.db.escrow.insert_one(escrow)
        
        order.pop("_id", None)
        escrow.pop("_id", None)
        
        logger.info(f"Created order {order_id} with escrow {escrow_id}")
        
        return {"order": order, "escrow": escrow}
    
    async def get_order(self, order_id: str, user_id: Optional[str] = None) -> Optional[Dict]:
        """Get an order by ID"""
        query = {"id": order_id}
        if user_id:
            query["$or"] = [{"buyer_id": user_id}, {"seller_id": user_id}]
        
        order = await self.db.orders.find_one(query, {"_id": 0})
        return order
    
    async def get_orders(
        self,
        user_id: Optional[str] = None,
        role: Optional[str] = None,  # buyer or seller
        status: Optional[str] = None,
        page: int = 1,
        limit: int = 20
    ) -> Dict:
        """Get orders with filters"""
        query = {}
        
        if user_id:
            if role == "buyer":
                query["buyer_id"] = user_id
            elif role == "seller":
                query["seller_id"] = user_id
            else:
                query["$or"] = [{"buyer_id": user_id}, {"seller_id": user_id}]
        
        if status:
            query["status"] = status
        
        skip = (page - 1) * limit
        orders = await self.db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        total = await self.db.orders.count_documents(query)
        
        return {
            "orders": orders,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    
    async def update_order_status(
        self,
        order_id: str,
        new_status: str,
        user_id: str,
        additional_data: Optional[Dict] = None
    ) -> Dict:
        """Update order status with validations"""
        order = await self.get_order(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        now = datetime.now(timezone.utc)
        update = {"status": new_status, "updated_at": now.isoformat()}
        
        if additional_data:
            update.update(additional_data)
        
        # Add timestamps for specific statuses
        if new_status == OrderStatus.SHIPPED:
            update["shipped_at"] = now.isoformat()
        elif new_status == OrderStatus.DELIVERED:
            update["delivered_at"] = now.isoformat()
        elif new_status == OrderStatus.CONFIRMED:
            update["confirmed_at"] = now.isoformat()
            # Set escrow auto-release date
            escrow_config = await self.get_escrow_config()
            auto_release_at = now + timedelta(days=escrow_config["auto_release_days"])
            await self.db.escrow.update_one(
                {"order_id": order_id},
                {"$set": {
                    "auto_release_at": auto_release_at.isoformat(),
                    "updated_at": now.isoformat()
                }}
            )
        
        await self.db.orders.update_one({"id": order_id}, {"$set": update})
        
        # Log status change
        await self.db.order_status_logs.insert_one({
            "id": f"log_{uuid.uuid4().hex[:12]}",
            "order_id": order_id,
            "old_status": order["status"],
            "new_status": new_status,
            "changed_by": user_id,
            "timestamp": now.isoformat()
        })
        
        return await self.get_order(order_id)
    
    # =========================================================================
    # ESCROW OPERATIONS
    # =========================================================================
    
    async def fund_escrow(self, order_id: str, payment_reference: str) -> Dict:
        """Mark escrow as funded after payment"""
        now = datetime.now(timezone.utc)
        
        await self.db.escrow.update_one(
            {"order_id": order_id},
            {"$set": {
                "status": EscrowStatus.FUNDED,
                "payment_reference": payment_reference,
                "funded_at": now.isoformat(),
                "updated_at": now.isoformat()
            }}
        )
        
        # Update order status
        await self.db.orders.update_one(
            {"id": order_id},
            {"$set": {
                "status": OrderStatus.PAID,
                "updated_at": now.isoformat()
            }}
        )
        
        # Create transaction record
        escrow = await self.db.escrow.find_one({"order_id": order_id}, {"_id": 0})
        await self.db.transactions.insert_one({
            "id": f"txn_{uuid.uuid4().hex[:12]}",
            "type": "escrow_funded",
            "order_id": order_id,
            "escrow_id": escrow["id"],
            "amount": escrow["amount"],
            "currency": escrow["currency"],
            "payment_method": escrow["payment_method"],
            "payment_reference": payment_reference,
            "buyer_id": escrow["buyer_id"],
            "seller_id": escrow["seller_id"],
            "status": "completed",
            "created_at": now.isoformat()
        })
        
        logger.info(f"Escrow funded for order {order_id}")
        
        return escrow
    
    async def release_escrow(self, order_id: str, admin_id: Optional[str] = None) -> Dict:
        """Release escrow funds to seller"""
        now = datetime.now(timezone.utc)
        
        escrow = await self.db.escrow.find_one({"order_id": order_id})
        if not escrow:
            raise HTTPException(status_code=404, detail="Escrow not found")
        
        if escrow["status"] not in [EscrowStatus.FUNDED, EscrowStatus.RELEASING]:
            raise HTTPException(status_code=400, detail=f"Cannot release escrow in status: {escrow['status']}")
        
        # Update escrow
        await self.db.escrow.update_one(
            {"order_id": order_id},
            {"$set": {
                "status": EscrowStatus.RELEASED,
                "released_at": now.isoformat(),
                "released_by": admin_id or "system",
                "updated_at": now.isoformat()
            }}
        )
        
        # Update order
        await self.db.orders.update_one(
            {"id": order_id},
            {"$set": {
                "status": OrderStatus.COMPLETED,
                "updated_at": now.isoformat()
            }}
        )
        
        # Create payout record for seller
        payout_id = f"payout_{uuid.uuid4().hex[:12]}"
        await self.db.payouts.insert_one({
            "id": payout_id,
            "seller_id": escrow["seller_id"],
            "order_id": order_id,
            "escrow_id": escrow["id"],
            "gross_amount": escrow["amount"],
            "commission_amount": escrow["platform_commission"],
            "net_amount": escrow["seller_amount"],
            "currency": escrow["currency"],
            "status": "pending",  # Would be processed by payout system
            "created_at": now.isoformat()
        })
        
        # Record platform revenue
        await self.db.platform_revenue.insert_one({
            "id": f"rev_{uuid.uuid4().hex[:12]}",
            "order_id": order_id,
            "escrow_id": escrow["id"],
            "commission_amount": escrow["platform_commission"],
            "currency": escrow["currency"],
            "created_at": now.isoformat()
        })
        
        # Create transaction record
        await self.db.transactions.insert_one({
            "id": f"txn_{uuid.uuid4().hex[:12]}",
            "type": "escrow_released",
            "order_id": order_id,
            "escrow_id": escrow["id"],
            "amount": escrow["seller_amount"],
            "commission": escrow["platform_commission"],
            "currency": escrow["currency"],
            "seller_id": escrow["seller_id"],
            "status": "completed",
            "released_by": admin_id or "system",
            "created_at": now.isoformat()
        })
        
        logger.info(f"Escrow released for order {order_id}, seller receives {escrow['seller_amount']}")
        
        return await self.db.escrow.find_one({"order_id": order_id}, {"_id": 0})
    
    async def refund_escrow(
        self,
        order_id: str,
        admin_id: str,
        refund_amount: Optional[float] = None,
        reason: str = ""
    ) -> Dict:
        """Refund escrow to buyer (full or partial)"""
        now = datetime.now(timezone.utc)
        
        escrow = await self.db.escrow.find_one({"order_id": order_id})
        if not escrow:
            raise HTTPException(status_code=404, detail="Escrow not found")
        
        if escrow["status"] not in [EscrowStatus.FUNDED, EscrowStatus.DISPUTED]:
            raise HTTPException(status_code=400, detail=f"Cannot refund escrow in status: {escrow['status']}")
        
        # Determine refund amount
        full_refund = refund_amount is None or refund_amount >= escrow["amount"]
        actual_refund = escrow["amount"] if full_refund else refund_amount
        
        new_status = EscrowStatus.REFUNDED if full_refund else EscrowStatus.PARTIAL_REFUND
        order_status = OrderStatus.REFUNDED if full_refund else OrderStatus.COMPLETED
        
        # Update escrow
        await self.db.escrow.update_one(
            {"order_id": order_id},
            {"$set": {
                "status": new_status,
                "refunded_amount": actual_refund,
                "refunded_at": now.isoformat(),
                "refunded_by": admin_id,
                "refund_reason": reason,
                "updated_at": now.isoformat()
            }}
        )
        
        # Update order
        await self.db.orders.update_one(
            {"id": order_id},
            {"$set": {
                "status": order_status,
                "updated_at": now.isoformat()
            }}
        )
        
        # Create transaction record
        await self.db.transactions.insert_one({
            "id": f"txn_{uuid.uuid4().hex[:12]}",
            "type": "escrow_refund",
            "order_id": order_id,
            "escrow_id": escrow["id"],
            "amount": actual_refund,
            "currency": escrow["currency"],
            "buyer_id": escrow["buyer_id"],
            "is_partial": not full_refund,
            "reason": reason,
            "refunded_by": admin_id,
            "status": "completed",
            "created_at": now.isoformat()
        })
        
        logger.info(f"Escrow {'fully' if full_refund else 'partially'} refunded for order {order_id}")
        
        return await self.db.escrow.find_one({"order_id": order_id}, {"_id": 0})
    
    async def get_escrow(self, escrow_id: str) -> Optional[Dict]:
        """Get escrow by ID"""
        return await self.db.escrow.find_one({"id": escrow_id}, {"_id": 0})
    
    async def get_escrow_by_order(self, order_id: str) -> Optional[Dict]:
        """Get escrow by order ID"""
        return await self.db.escrow.find_one({"order_id": order_id}, {"_id": 0})
    
    # =========================================================================
    # DISPUTES
    # =========================================================================
    
    async def create_dispute(
        self,
        order_id: str,
        opened_by: str,
        reason: str,
        description: str,
        evidence_urls: List[str] = []
    ) -> Dict:
        """Create a dispute for an order"""
        now = datetime.now(timezone.utc)
        
        order = await self.get_order(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Check if dispute window is still open
        escrow_config = await self.get_escrow_config()
        if order.get("delivered_at"):
            delivered_at = datetime.fromisoformat(order["delivered_at"].replace("Z", "+00:00"))
            window_end = delivered_at + timedelta(days=escrow_config["dispute_window_days"])
            if now > window_end:
                raise HTTPException(status_code=400, detail="Dispute window has closed")
        
        # Check for existing dispute
        existing = await self.db.disputes.find_one({"order_id": order_id, "status": {"$nin": ["closed"]}})
        if existing:
            raise HTTPException(status_code=400, detail="An active dispute already exists for this order")
        
        dispute_id = f"dispute_{uuid.uuid4().hex[:12]}"
        
        dispute = {
            "id": dispute_id,
            "order_id": order_id,
            "escrow_id": order["escrow_id"],
            "buyer_id": order["buyer_id"],
            "seller_id": order["seller_id"],
            "opened_by": opened_by,
            "reason": reason,
            "description": description,
            "status": DisputeStatus.OPEN,
            "evidence": [{
                "id": f"ev_{uuid.uuid4().hex[:8]}",
                "submitted_by": opened_by,
                "urls": evidence_urls,
                "description": description,
                "submitted_at": now.isoformat()
            }] if evidence_urls else [],
            "messages": [{
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "sender_id": opened_by,
                "message": description,
                "timestamp": now.isoformat()
            }],
            "resolution": None,
            "resolved_by": None,
            "resolved_at": None,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        await self.db.disputes.insert_one(dispute)
        
        # Update order and escrow status
        await self.db.orders.update_one(
            {"id": order_id},
            {"$set": {"status": OrderStatus.DISPUTED, "updated_at": now.isoformat()}}
        )
        await self.db.escrow.update_one(
            {"order_id": order_id},
            {"$set": {"status": EscrowStatus.DISPUTED, "updated_at": now.isoformat()}}
        )
        
        dispute.pop("_id", None)
        logger.info(f"Dispute {dispute_id} created for order {order_id}")
        
        return dispute
    
    async def get_dispute(self, dispute_id: str) -> Optional[Dict]:
        """Get dispute by ID"""
        return await self.db.disputes.find_one({"id": dispute_id}, {"_id": 0})
    
    async def get_disputes(
        self,
        status: Optional[str] = None,
        page: int = 1,
        limit: int = 20
    ) -> Dict:
        """Get disputes with filters"""
        query = {}
        if status:
            query["status"] = status
        
        skip = (page - 1) * limit
        disputes = await self.db.disputes.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        total = await self.db.disputes.count_documents(query)
        
        return {
            "disputes": disputes,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    
    async def add_dispute_message(
        self,
        dispute_id: str,
        sender_id: str,
        message: str
    ) -> Dict:
        """Add a message to dispute chat"""
        now = datetime.now(timezone.utc)
        
        msg = {
            "id": f"msg_{uuid.uuid4().hex[:8]}",
            "sender_id": sender_id,
            "message": message,
            "timestamp": now.isoformat()
        }
        
        await self.db.disputes.update_one(
            {"id": dispute_id},
            {
                "$push": {"messages": msg},
                "$set": {"updated_at": now.isoformat()}
            }
        )
        
        return msg
    
    async def add_dispute_evidence(
        self,
        dispute_id: str,
        submitted_by: str,
        urls: List[str],
        description: str
    ) -> Dict:
        """Add evidence to a dispute"""
        now = datetime.now(timezone.utc)
        
        evidence = {
            "id": f"ev_{uuid.uuid4().hex[:8]}",
            "submitted_by": submitted_by,
            "urls": urls,
            "description": description,
            "submitted_at": now.isoformat()
        }
        
        await self.db.disputes.update_one(
            {"id": dispute_id},
            {
                "$push": {"evidence": evidence},
                "$set": {"updated_at": now.isoformat()}
            }
        )
        
        return evidence
    
    async def resolve_dispute(
        self,
        dispute_id: str,
        admin_id: str,
        resolution: str,  # seller, buyer, partial
        refund_amount: Optional[float] = None,
        notes: str = ""
    ) -> Dict:
        """Resolve a dispute"""
        now = datetime.now(timezone.utc)
        
        dispute = await self.get_dispute(dispute_id)
        if not dispute:
            raise HTTPException(status_code=404, detail="Dispute not found")
        
        order_id = dispute["order_id"]
        
        # Determine resolution status
        if resolution == "seller":
            dispute_status = DisputeStatus.RESOLVED_SELLER
            # Release escrow to seller
            await self.release_escrow(order_id, admin_id)
        elif resolution == "buyer":
            dispute_status = DisputeStatus.RESOLVED_BUYER
            # Full refund to buyer
            await self.refund_escrow(order_id, admin_id, None, notes)
        elif resolution == "partial":
            dispute_status = DisputeStatus.RESOLVED_PARTIAL
            # Partial refund
            await self.refund_escrow(order_id, admin_id, refund_amount, notes)
        else:
            raise HTTPException(status_code=400, detail="Invalid resolution type")
        
        # Update dispute
        await self.db.disputes.update_one(
            {"id": dispute_id},
            {"$set": {
                "status": dispute_status,
                "resolution": {
                    "type": resolution,
                    "refund_amount": refund_amount,
                    "notes": notes
                },
                "resolved_by": admin_id,
                "resolved_at": now.isoformat(),
                "updated_at": now.isoformat()
            }}
        )
        
        logger.info(f"Dispute {dispute_id} resolved: {resolution}")
        
        return await self.get_dispute(dispute_id)
    
    # =========================================================================
    # REPORTING
    # =========================================================================
    
    async def get_escrow_report(self) -> Dict:
        """Get escrow balance and summary report"""
        # Get total escrow balance
        pipeline = [
            {"$match": {"status": EscrowStatus.FUNDED}},
            {"$group": {
                "_id": None,
                "total_balance": {"$sum": "$amount"},
                "count": {"$sum": 1}
            }}
        ]
        funded = await self.db.escrow.aggregate(pipeline).to_list(1)
        
        # Get released totals
        released_pipeline = [
            {"$match": {"status": EscrowStatus.RELEASED}},
            {"$group": {
                "_id": None,
                "total_released": {"$sum": "$seller_amount"},
                "total_commission": {"$sum": "$platform_commission"},
                "count": {"$sum": 1}
            }}
        ]
        released = await self.db.escrow.aggregate(released_pipeline).to_list(1)
        
        # Get refunded totals
        refunded_pipeline = [
            {"$match": {"status": {"$in": [EscrowStatus.REFUNDED, EscrowStatus.PARTIAL_REFUND]}}},
            {"$group": {
                "_id": None,
                "total_refunded": {"$sum": "$refunded_amount"},
                "count": {"$sum": 1}
            }}
        ]
        refunded = await self.db.escrow.aggregate(refunded_pipeline).to_list(1)
        
        # Get disputed count
        disputed_count = await self.db.escrow.count_documents({"status": EscrowStatus.DISPUTED})
        
        return {
            "escrow_balance": funded[0]["total_balance"] if funded else 0,
            "escrow_count": funded[0]["count"] if funded else 0,
            "total_released": released[0]["total_released"] if released else 0,
            "total_commission_earned": released[0]["total_commission"] if released else 0,
            "completed_transactions": released[0]["count"] if released else 0,
            "total_refunded": refunded[0]["total_refunded"] if refunded else 0,
            "refund_count": refunded[0]["count"] if refunded else 0,
            "disputed_count": disputed_count
        }
    
    async def get_seller_payout_history(self, seller_id: str, page: int = 1, limit: int = 20) -> Dict:
        """Get payout history for a seller"""
        skip = (page - 1) * limit
        payouts = await self.db.payouts.find(
            {"seller_id": seller_id},
            {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        total = await self.db.payouts.count_documents({"seller_id": seller_id})
        
        # Get totals
        pipeline = [
            {"$match": {"seller_id": seller_id}},
            {"$group": {
                "_id": None,
                "total_gross": {"$sum": "$gross_amount"},
                "total_commission": {"$sum": "$commission_amount"},
                "total_net": {"$sum": "$net_amount"}
            }}
        ]
        totals = await self.db.payouts.aggregate(pipeline).to_list(1)
        
        return {
            "payouts": payouts,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit,
            "summary": totals[0] if totals else {"total_gross": 0, "total_commission": 0, "total_net": 0}
        }
    
    # =========================================================================
    # BACKGROUND JOBS
    # =========================================================================
    
    async def auto_release_escrows(self):
        """Background job to auto-release escrows after the configured period"""
        now = datetime.now(timezone.utc)
        
        # Find escrows ready for auto-release
        ready_escrows = await self.db.escrow.find({
            "status": EscrowStatus.FUNDED,
            "auto_release_at": {"$lte": now.isoformat(), "$ne": None}
        }).to_list(100)
        
        released_count = 0
        for escrow in ready_escrows:
            try:
                await self.release_escrow(escrow["order_id"], "auto_release")
                released_count += 1
                logger.info(f"Auto-released escrow for order {escrow['order_id']}")
            except Exception as e:
                logger.error(f"Failed to auto-release escrow {escrow['id']}: {e}")
        
        if released_count > 0:
            logger.info(f"Auto-released {released_count} escrows")
    
    async def start_background_tasks(self):
        """Start background tasks"""
        if self._running:
            return
        
        self._running = True
        self._auto_release_task = asyncio.create_task(self._auto_release_loop())
        logger.info("Started escrow auto-release background task")
    
    async def stop_background_tasks(self):
        """Stop background tasks"""
        self._running = False
        if self._auto_release_task:
            self._auto_release_task.cancel()
            try:
                await self._auto_release_task
            except asyncio.CancelledError:
                pass
    
    async def _auto_release_loop(self):
        """Background loop for auto-releasing escrows"""
        while self._running:
            try:
                await self.auto_release_escrows()
            except Exception as e:
                logger.error(f"Error in escrow auto-release loop: {e}")
            
            # Run every hour
            await asyncio.sleep(3600)


# =============================================================================
# ROUTER FACTORY
# =============================================================================

def create_escrow_router(db, get_current_user, get_current_admin):
    """Create escrow system router"""
    
    router = APIRouter(prefix="/escrow", tags=["Escrow & Online Selling"])
    service = EscrowService(db)
    
    @router.on_event("startup")
    async def startup():
        await service.initialize()
        await service.start_background_tasks()
    
    @router.on_event("shutdown")
    async def shutdown():
        await service.stop_background_tasks()
    
    # =========================================================================
    # PUBLIC ENDPOINTS
    # =========================================================================
    
    @router.get("/seller/{seller_id}/can-sell-online")
    async def check_seller_can_sell(seller_id: str):
        """Check if a seller can sell online"""
        return await service.check_seller_can_sell_online(seller_id)
    
    @router.get("/transport-pricing")
    async def get_transport_pricing():
        """Get transport pricing configurations"""
        return await service.get_transport_pricing()
    
    @router.post("/calculate-transport")
    async def calculate_transport(
        distance_km: float = Body(...),
        weight_kg: float = Body(1.0),
        pricing_id: str = Body("standard")
    ):
        """Calculate transport cost"""
        return await service.calculate_transport_cost(distance_km, weight_kg, pricing_id)
    
    @router.get("/vat-configs")
    async def get_vat_configs():
        """Get VAT configurations"""
        return await service.get_vat_configs()
    
    # =========================================================================
    # BUYER ENDPOINTS
    # =========================================================================
    
    @router.post("/calculate-order-price")
    async def calculate_order_price(
        listing_id: str = Body(...),
        quantity: int = Body(1),
        delivery_method: str = Body(...),
        delivery_address: Optional[Dict] = Body(None),
        buyer_country: str = Body("US"),
        user = Depends(get_current_user)
    ):
        """Calculate full order price breakdown"""
        return await service.calculate_order_price(
            listing_id, quantity, delivery_method, delivery_address, buyer_country
        )
    
    @router.post("/orders/create")
    async def create_order(
        request: CreateOrderRequest,
        user = Depends(get_current_user)
    ):
        """Create a new order"""
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        return await service.create_order(
            buyer_id=user.user_id,
            listing_id=request.listing_id,
            quantity=request.quantity,
            delivery_method=request.delivery_method,
            delivery_address=request.delivery_address.model_dump() if request.delivery_address else None,
            payment_method=request.payment_method,
            notes=request.notes
        )
    
    @router.get("/orders/my-orders")
    async def get_my_orders(
        role: Optional[str] = Query(None),
        status: Optional[str] = Query(None),
        page: int = Query(1),
        limit: int = Query(20),
        user = Depends(get_current_user)
    ):
        """Get current user's orders"""
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        return await service.get_orders(user.user_id, role, status, page, limit)
    
    @router.get("/orders/{order_id}")
    async def get_order(
        order_id: str,
        user = Depends(get_current_user)
    ):
        """Get order details"""
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        order = await service.get_order(order_id, user.user_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        return order
    
    @router.post("/orders/{order_id}/confirm-delivery")
    async def confirm_delivery(
        order_id: str,
        user = Depends(get_current_user)
    ):
        """Buyer confirms delivery"""
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        order = await service.get_order(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        if order["buyer_id"] != user.user_id:
            raise HTTPException(status_code=403, detail="Only buyer can confirm delivery")
        
        if order["status"] not in [OrderStatus.DELIVERED, OrderStatus.SHIPPED, OrderStatus.IN_TRANSIT]:
            raise HTTPException(status_code=400, detail="Order must be delivered before confirmation")
        
        return await service.update_order_status(order_id, OrderStatus.CONFIRMED, user.user_id)
    
    @router.post("/orders/{order_id}/dispute")
    async def create_dispute(
        order_id: str,
        reason: str = Body(...),
        description: str = Body(...),
        evidence_urls: List[str] = Body([]),
        user = Depends(get_current_user)
    ):
        """Open a dispute for an order"""
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        return await service.create_dispute(
            order_id, user.user_id, reason, description, evidence_urls
        )
    
    # =========================================================================
    # SELLER ENDPOINTS
    # =========================================================================
    
    @router.get("/seller/orders")
    async def get_seller_orders(
        status: Optional[str] = Query(None),
        page: int = Query(1),
        limit: int = Query(20),
        user = Depends(get_current_user)
    ):
        """Get seller's orders"""
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        return await service.get_orders(user.user_id, "seller", status, page, limit)
    
    @router.post("/seller/orders/{order_id}/ship")
    async def mark_order_shipped(
        order_id: str,
        tracking_number: Optional[str] = Body(None),
        user = Depends(get_current_user)
    ):
        """Seller marks order as shipped"""
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        order = await service.get_order(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        if order["seller_id"] != user.user_id:
            raise HTTPException(status_code=403, detail="Only seller can mark as shipped")
        
        if order["status"] not in [OrderStatus.PAID, OrderStatus.PREPARING]:
            raise HTTPException(status_code=400, detail="Order must be paid before shipping")
        
        additional_data = {}
        if tracking_number:
            additional_data["tracking_number"] = tracking_number
        
        return await service.update_order_status(
            order_id, OrderStatus.SHIPPED, user.user_id, additional_data
        )
    
    @router.get("/seller/payouts")
    async def get_seller_payouts(
        page: int = Query(1),
        limit: int = Query(20),
        user = Depends(get_current_user)
    ):
        """Get seller's payout history"""
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        return await service.get_seller_payout_history(user.user_id, page, limit)
    
    @router.get("/seller/escrow-status")
    async def get_seller_escrow_status(
        user = Depends(get_current_user)
    ):
        """Get seller's escrow status summary"""
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Get pending escrows
        pending = await db.escrow.count_documents({
            "seller_id": user.user_id,
            "status": EscrowStatus.FUNDED
        })
        
        # Get total pending amount
        pipeline = [
            {"$match": {"seller_id": user.user_id, "status": EscrowStatus.FUNDED}},
            {"$group": {"_id": None, "total": {"$sum": "$seller_amount"}}}
        ]
        pending_amount = await db.escrow.aggregate(pipeline).to_list(1)
        
        return {
            "pending_escrows": pending,
            "pending_amount": pending_amount[0]["total"] if pending_amount else 0
        }
    
    # =========================================================================
    # DISPUTE ENDPOINTS
    # =========================================================================
    
    @router.get("/disputes/{dispute_id}")
    async def get_dispute(
        dispute_id: str,
        user = Depends(get_current_user)
    ):
        """Get dispute details"""
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        dispute = await service.get_dispute(dispute_id)
        if not dispute:
            raise HTTPException(status_code=404, detail="Dispute not found")
        
        # Check access
        if user.user_id not in [dispute["buyer_id"], dispute["seller_id"]]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return dispute
    
    @router.post("/disputes/{dispute_id}/message")
    async def add_dispute_message(
        dispute_id: str,
        message: str = Body(..., embed=True),
        user = Depends(get_current_user)
    ):
        """Add message to dispute"""
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        dispute = await service.get_dispute(dispute_id)
        if not dispute:
            raise HTTPException(status_code=404, detail="Dispute not found")
        
        if user.user_id not in [dispute["buyer_id"], dispute["seller_id"]]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return await service.add_dispute_message(dispute_id, user.user_id, message)
    
    @router.post("/disputes/{dispute_id}/evidence")
    async def add_dispute_evidence(
        dispute_id: str,
        urls: List[str] = Body(...),
        description: str = Body(...),
        user = Depends(get_current_user)
    ):
        """Add evidence to dispute"""
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        dispute = await service.get_dispute(dispute_id)
        if not dispute:
            raise HTTPException(status_code=404, detail="Dispute not found")
        
        if user.user_id not in [dispute["buyer_id"], dispute["seller_id"]]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return await service.add_dispute_evidence(dispute_id, user.user_id, urls, description)
    
    # =========================================================================
    # ADMIN ENDPOINTS
    # =========================================================================
    
    @router.post("/admin/verify-seller/{seller_id}")
    async def admin_verify_seller(
        seller_id: str,
        verified: bool = Body(True, embed=True),
        admin = Depends(get_current_admin)
    ):
        """Verify or unverify a seller"""
        return await service.verify_seller(seller_id, admin.get("user_id", "admin"), verified)
    
    @router.get("/admin/verified-sellers")
    async def admin_get_verified_sellers(
        page: int = Query(1),
        limit: int = Query(20),
        admin = Depends(get_current_admin)
    ):
        """Get list of verified sellers"""
        return await service.get_verified_sellers(page, limit)
    
    @router.get("/admin/orders")
    async def admin_get_orders(
        status: Optional[str] = Query(None),
        page: int = Query(1),
        limit: int = Query(20),
        admin = Depends(get_current_admin)
    ):
        """Get all orders"""
        return await service.get_orders(None, None, status, page, limit)
    
    @router.get("/admin/escrow-report")
    async def admin_escrow_report(admin = Depends(get_current_admin)):
        """Get escrow report"""
        return await service.get_escrow_report()
    
    @router.get("/admin/disputes")
    async def admin_get_disputes(
        status: Optional[str] = Query(None),
        page: int = Query(1),
        limit: int = Query(20),
        admin = Depends(get_current_admin)
    ):
        """Get all disputes"""
        return await service.get_disputes(status, page, limit)
    
    @router.post("/admin/disputes/{dispute_id}/resolve")
    async def admin_resolve_dispute(
        dispute_id: str,
        resolution: str = Body(...),  # seller, buyer, partial
        refund_amount: Optional[float] = Body(None),
        notes: str = Body(""),
        admin = Depends(get_current_admin)
    ):
        """Resolve a dispute"""
        return await service.resolve_dispute(
            dispute_id, admin.get("user_id", "admin"), resolution, refund_amount, notes
        )
    
    @router.post("/admin/orders/{order_id}/release-escrow")
    async def admin_release_escrow(
        order_id: str,
        admin = Depends(get_current_admin)
    ):
        """Manually release escrow"""
        return await service.release_escrow(order_id, admin.get("user_id", "admin"))
    
    @router.post("/admin/orders/{order_id}/refund")
    async def admin_refund_order(
        order_id: str,
        refund_amount: Optional[float] = Body(None),
        reason: str = Body(""),
        admin = Depends(get_current_admin)
    ):
        """Refund an order"""
        return await service.refund_escrow(
            order_id, admin.get("user_id", "admin"), refund_amount, reason
        )
    
    # =========================================================================
    # ADMIN CONFIG ENDPOINTS
    # =========================================================================
    
    @router.get("/admin/config/escrow")
    async def admin_get_escrow_config(admin = Depends(get_current_admin)):
        """Get escrow configuration"""
        return await service.get_escrow_config()
    
    @router.put("/admin/config/escrow")
    async def admin_update_escrow_config(
        config: Dict = Body(...),
        admin = Depends(get_current_admin)
    ):
        """Update escrow configuration"""
        return await service.update_escrow_config(config)
    
    @router.get("/admin/config/transport-pricing")
    async def admin_get_transport_pricing(admin = Depends(get_current_admin)):
        """Get transport pricing"""
        return await service.get_transport_pricing()
    
    @router.put("/admin/config/transport-pricing/{pricing_id}")
    async def admin_update_transport_pricing(
        pricing_id: str,
        update: Dict = Body(...),
        admin = Depends(get_current_admin)
    ):
        """Update transport pricing"""
        return await service.update_transport_pricing(pricing_id, update)
    
    @router.get("/admin/config/vat")
    async def admin_get_vat_configs(admin = Depends(get_current_admin)):
        """Get VAT configurations"""
        return await service.get_vat_configs()
    
    @router.put("/admin/config/vat/{country_code}")
    async def admin_update_vat_config(
        country_code: str,
        update: Dict = Body(...),
        admin = Depends(get_current_admin)
    ):
        """Update VAT configuration"""
        return await service.update_vat_config(country_code, update)
    
    @router.get("/admin/config/commission")
    async def admin_get_commission_configs(admin = Depends(get_current_admin)):
        """Get commission configurations"""
        return await service.get_commission_configs()
    
    @router.put("/admin/config/commission/{config_id}")
    async def admin_update_commission_config(
        config_id: str,
        update: Dict = Body(...),
        admin = Depends(get_current_admin)
    ):
        """Update commission configuration"""
        return await service.update_commission_config(config_id, update)
    
    return router, service
