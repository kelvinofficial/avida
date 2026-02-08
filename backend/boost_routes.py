"""
Boost System Routes for Mobile App
Credit-based boost system for sellers
"""

from fastapi import APIRouter, HTTPException, Request, Query, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid
import os
import logging

# Import Stripe integration
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, 
    CheckoutSessionResponse, 
    CheckoutStatusResponse, 
    CheckoutSessionRequest
)

logger = logging.getLogger("boost_routes")


# =============================================================================
# ENUMS
# =============================================================================

class BoostType(str, Enum):
    FEATURED = "featured"           # Top of category & search
    HOMEPAGE = "homepage"           # Homepage spotlight
    URGENT = "urgent"               # Urgent/Highlighted badge
    LOCATION = "location"           # Location-based boost
    CATEGORY = "category"           # Category-based boost


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

class PurchaseCreditsRequest(BaseModel):
    package_id: str
    origin_url: str  # Frontend URL for redirect


class CreateBoostRequest(BaseModel):
    listing_id: str
    boost_type: BoostType
    duration_hours: int
    location_id: Optional[str] = None
    category_id: Optional[str] = None


# =============================================================================
# BOOST ROUTER
# =============================================================================

def create_boost_routes(db, get_current_user):
    """Create boost routes for mobile app"""
    
    router = APIRouter(prefix="/boost", tags=["Boost System"])
    stripe_api_key = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')
    
    # =========================================================================
    # HELPER FUNCTIONS
    # =========================================================================
    
    async def get_seller_credits(seller_id: str) -> dict:
        """Get seller's credit balance and stats"""
        credits = await db.seller_credits.find_one({"seller_id": seller_id}, {"_id": 0})
        if not credits:
            # Create new credit record
            credits = {
                "id": f"sc_{uuid.uuid4().hex[:12]}",
                "seller_id": seller_id,
                "balance": 0,
                "total_purchased": 0,
                "total_spent": 0,
                "total_bonus_received": 0,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": None
            }
            await db.seller_credits.insert_one(credits)
            credits.pop("_id", None)
        return credits
    
    async def add_credits(seller_id: str, amount: int, transaction_type: str, description: str, reference_id: str = None) -> dict:
        """Add credits to seller account"""
        credits = await get_seller_credits(seller_id)
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
        
        await db.seller_credits.update_one(
            {"seller_id": seller_id},
            {"$set": update_data}
        )
        
        # Log transaction
        transaction = {
            "id": f"ctx_{uuid.uuid4().hex[:12]}",
            "seller_id": seller_id,
            "transaction_type": transaction_type,
            "amount": amount,
            "balance_after": new_balance,
            "description": description,
            "reference_id": reference_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.credit_transactions.insert_one(transaction)
        
        return await get_seller_credits(seller_id)
    
    async def spend_credits(seller_id: str, amount: int, description: str, reference_id: str = None) -> dict:
        """Spend credits from seller account"""
        credits = await get_seller_credits(seller_id)
        
        if credits["balance"] < amount:
            raise HTTPException(status_code=400, detail="Insufficient credits")
        
        new_balance = credits["balance"] - amount
        
        await db.seller_credits.update_one(
            {"seller_id": seller_id},
            {"$set": {
                "balance": new_balance,
                "total_spent": credits.get("total_spent", 0) + amount,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Log transaction
        transaction = {
            "id": f"ctx_{uuid.uuid4().hex[:12]}",
            "seller_id": seller_id,
            "transaction_type": "spend",
            "amount": -amount,
            "balance_after": new_balance,
            "description": description,
            "reference_id": reference_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.credit_transactions.insert_one(transaction)
        
        return await get_seller_credits(seller_id)
    
    # =========================================================================
    # PUBLIC ENDPOINTS
    # =========================================================================
    
    @router.get("/packages")
    async def get_credit_packages():
        """Get available credit packages"""
        packages = await db.credit_packages.find(
            {"is_active": True}, 
            {"_id": 0}
        ).sort("price", 1).to_list(100)
        
        # Return default packages if none exist
        if not packages:
            packages = [
                {"id": "pkg_starter", "name": "Starter Pack", "description": "Perfect for trying out boosts", "price": 5.0, "credits": 50, "bonus_credits": 0, "is_popular": False},
                {"id": "pkg_popular", "name": "Popular Pack", "description": "Best value for regular sellers", "price": 10.0, "credits": 100, "bonus_credits": 20, "is_popular": True},
                {"id": "pkg_pro", "name": "Pro Pack", "description": "Maximum exposure for power sellers", "price": 25.0, "credits": 250, "bonus_credits": 100, "is_popular": False},
            ]
        return packages
    
    @router.get("/pricing")
    async def get_boost_pricing():
        """Get boost pricing options"""
        pricing = await db.boost_pricing.find(
            {"is_enabled": True}, 
            {"_id": 0}
        ).sort("priority", -1).to_list(100)
        
        # Return default pricing if none exist
        if not pricing:
            pricing = [
                {"id": "bp_featured", "boost_type": "featured", "name": "Featured Placement", "description": "Appear at top of category and search results", "credits_per_hour": 1, "credits_per_day": 10, "min_duration_hours": 1, "max_duration_days": 30, "priority": 5, "is_enabled": True},
                {"id": "bp_homepage", "boost_type": "homepage", "name": "Homepage Spotlight", "description": "Featured on homepage carousel", "credits_per_hour": 3, "credits_per_day": 25, "min_duration_hours": 1, "max_duration_days": 30, "priority": 6, "is_enabled": True},
                {"id": "bp_urgent", "boost_type": "urgent", "name": "Urgent Badge", "description": "Stand out with urgent/highlighted badge", "credits_per_hour": 1, "credits_per_day": 5, "min_duration_hours": 1, "max_duration_days": 30, "priority": 3, "is_enabled": True},
                {"id": "bp_location", "boost_type": "location", "name": "Location Boost", "description": "Top placement in specific location", "credits_per_hour": 2, "credits_per_day": 15, "min_duration_hours": 1, "max_duration_days": 30, "priority": 4, "is_enabled": True},
                {"id": "bp_category", "boost_type": "category", "name": "Category Boost", "description": "Premium placement in category", "credits_per_hour": 2, "credits_per_day": 12, "min_duration_hours": 1, "max_duration_days": 30, "priority": 4, "is_enabled": True},
            ]
        return pricing
    
    @router.get("/calculate")
    async def calculate_boost_cost(
        boost_type: str,
        duration_hours: int = Query(..., ge=1)
    ):
        """Calculate credit cost for a boost"""
        pricing = await db.boost_pricing.find_one(
            {"boost_type": boost_type}, 
            {"_id": 0}
        )
        
        # Use default pricing if not found
        default_pricing = {
            "featured": {"credits_per_hour": 1, "credits_per_day": 10},
            "homepage": {"credits_per_hour": 3, "credits_per_day": 25},
            "urgent": {"credits_per_hour": 1, "credits_per_day": 5},
            "location": {"credits_per_hour": 2, "credits_per_day": 15},
            "category": {"credits_per_hour": 2, "credits_per_day": 12},
        }
        
        if not pricing:
            if boost_type not in default_pricing:
                raise HTTPException(status_code=404, detail="Boost type not found")
            pricing = default_pricing[boost_type]
        
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
    
    # =========================================================================
    # SELLER ENDPOINTS (requires auth)
    # =========================================================================
    
    @router.get("/credits/balance")
    async def get_my_credits(user: dict = Depends(get_current_user)):
        """Get seller's credit balance"""
        return await get_seller_credits(user["user_id"])
    
    @router.get("/credits/history")
    async def get_my_credit_history(
        limit: int = Query(50, le=100),
        user: dict = Depends(get_current_user)
    ):
        """Get seller's credit transaction history"""
        transactions = await db.credit_transactions.find(
            {"seller_id": user["user_id"]},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        return transactions
    
    @router.post("/credits/purchase")
    async def purchase_credits(
        request: Request,
        data: PurchaseCreditsRequest,
        user: dict = Depends(get_current_user)
    ):
        """Purchase credits via Stripe"""
        seller_id = user["user_id"]
        
        # Get package
        package = await db.credit_packages.find_one(
            {"id": data.package_id, "is_active": True}, 
            {"_id": 0}
        )
        
        # Check default packages
        if not package:
            default_packages = {
                "pkg_starter": {"id": "pkg_starter", "name": "Starter Pack", "price": 5.0, "credits": 50, "bonus_credits": 0},
                "pkg_popular": {"id": "pkg_popular", "name": "Popular Pack", "price": 10.0, "credits": 100, "bonus_credits": 20},
                "pkg_pro": {"id": "pkg_pro", "name": "Pro Pack", "price": 25.0, "credits": 250, "bonus_credits": 100},
            }
            package = default_packages.get(data.package_id)
        
        if not package:
            raise HTTPException(status_code=404, detail="Package not found")
        
        # Initialize Stripe
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
        
        # Build URLs
        success_url = f"{data.origin_url}/credits?success=true&session_id={{CHECKOUT_SESSION_ID}}"
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
        payment = {
            "id": f"ptx_{uuid.uuid4().hex[:12]}",
            "seller_id": seller_id,
            "package_id": data.package_id,
            "provider": "stripe",
            "session_id": session.session_id,
            "amount": package["price"],
            "currency": "USD",
            "credits_to_add": package["credits"],
            "bonus_credits": package.get("bonus_credits", 0),
            "status": PaymentStatus.PENDING.value,
            "metadata": {"stripe_session_id": session.session_id},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": None
        }
        await db.payment_transactions.insert_one(payment)
        
        return {
            "checkout_url": session.url,
            "session_id": session.session_id,
            "package": package
        }
    
    @router.get("/credits/payment-status/{session_id}")
    async def check_payment(
        request: Request,
        session_id: str,
        user: dict = Depends(get_current_user)
    ):
        """Check payment status and process if completed"""
        # Get payment transaction
        payment = await db.payment_transactions.find_one(
            {"session_id": session_id},
            {"_id": 0}
        )
        
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # If already completed, return status
        if payment["status"] == PaymentStatus.COMPLETED.value:
            return {"status": "completed", "payment": payment}
        
        # Check with Stripe
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
        
        status = await stripe_checkout.get_checkout_status(session_id)
        
        if status.payment_status == "paid" and payment["status"] != PaymentStatus.COMPLETED.value:
            # Process payment - add credits
            total_credits = payment["credits_to_add"] + payment.get("bonus_credits", 0)
            
            await add_credits(
                seller_id=payment["seller_id"],
                amount=payment["credits_to_add"],
                transaction_type="purchase",
                description=f"Purchased credit package",
                reference_id=payment["id"]
            )
            
            if payment.get("bonus_credits", 0) > 0:
                await add_credits(
                    seller_id=payment["seller_id"],
                    amount=payment["bonus_credits"],
                    transaction_type="bonus",
                    description=f"Bonus credits from package purchase",
                    reference_id=payment["id"]
                )
            
            # Update payment status
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "status": PaymentStatus.COMPLETED.value,
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            return {"status": "completed", "credits_added": total_credits}
        
        elif status.status == "expired":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"status": PaymentStatus.EXPIRED.value}}
            )
            return {"status": "expired"}
        
        return {"status": status.payment_status}
    
    @router.post("/create")
    async def create_boost(
        data: CreateBoostRequest,
        user: dict = Depends(get_current_user)
    ):
        """Create a new boost for a listing"""
        seller_id = user["user_id"]
        
        # Get pricing
        pricing = await db.boost_pricing.find_one(
            {"boost_type": data.boost_type}, 
            {"_id": 0}
        )
        
        # Use default pricing if not found
        default_pricing = {
            "featured": {"name": "Featured Placement", "credits_per_hour": 1, "credits_per_day": 10, "min_duration_hours": 1, "max_duration_days": 30, "priority": 5},
            "homepage": {"name": "Homepage Spotlight", "credits_per_hour": 3, "credits_per_day": 25, "min_duration_hours": 1, "max_duration_days": 30, "priority": 6},
            "urgent": {"name": "Urgent Badge", "credits_per_hour": 1, "credits_per_day": 5, "min_duration_hours": 1, "max_duration_days": 30, "priority": 3},
            "location": {"name": "Location Boost", "credits_per_hour": 2, "credits_per_day": 15, "min_duration_hours": 1, "max_duration_days": 30, "priority": 4},
            "category": {"name": "Category Boost", "credits_per_hour": 2, "credits_per_day": 12, "min_duration_hours": 1, "max_duration_days": 30, "priority": 4},
        }
        
        if not pricing:
            if data.boost_type.value not in default_pricing:
                raise HTTPException(status_code=400, detail="This boost type is not available")
            pricing = default_pricing[data.boost_type.value]
        
        # Validate duration
        min_hours = pricing.get("min_duration_hours", 1)
        max_hours = pricing.get("max_duration_days", 30) * 24
        
        if data.duration_hours < min_hours or data.duration_hours > max_hours:
            raise HTTPException(
                status_code=400, 
                detail=f"Duration must be between {min_hours} hours and {max_hours} hours"
            )
        
        # Check if listing exists and belongs to seller
        listing = await db.listings.find_one({"id": data.listing_id})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        if listing.get("user_id") != seller_id:
            raise HTTPException(status_code=403, detail="You don't own this listing")
        
        # Check listing status
        if listing.get("status") not in ["active", "published", None]:
            raise HTTPException(status_code=400, detail="Cannot boost inactive or expired listings")
        
        # Check for existing active boost of same type (fraud prevention)
        existing_boost = await db.listing_boosts.find_one({
            "listing_id": data.listing_id,
            "boost_type": data.boost_type.value,
            "status": BoostStatus.ACTIVE.value
        })
        
        if existing_boost:
            raise HTTPException(
                status_code=400, 
                detail="This listing already has an active boost of this type"
            )
        
        # Calculate cost
        days = data.duration_hours // 24
        remaining_hours = data.duration_hours % 24
        credit_cost = (days * pricing["credits_per_day"]) + (remaining_hours * pricing["credits_per_hour"])
        
        # Check seller has enough credits
        seller_credits = await get_seller_credits(seller_id)
        if seller_credits["balance"] < credit_cost:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient credits. Need {credit_cost}, have {seller_credits['balance']}"
            )
        
        # Create boost
        now = datetime.now(timezone.utc)
        boost_id = f"boost_{uuid.uuid4().hex[:12]}"
        expires_at = now + timedelta(hours=data.duration_hours)
        
        boost = {
            "id": boost_id,
            "listing_id": data.listing_id,
            "seller_id": seller_id,
            "boost_type": data.boost_type.value,
            "credits_spent": credit_cost,
            "duration_hours": data.duration_hours,
            "started_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
            "status": BoostStatus.ACTIVE.value,
            "location_id": data.location_id,
            "category_id": data.category_id,
            "created_at": now.isoformat()
        }
        
        # Spend credits
        await spend_credits(
            seller_id=seller_id,
            amount=credit_cost,
            description=f"{pricing.get('name', 'Boost')} for {data.duration_hours}h",
            reference_id=boost_id
        )
        
        # Save boost
        await db.listing_boosts.insert_one(boost)
        
        # Update listing with boost info
        await db.listings.update_one(
            {"id": data.listing_id},
            {"$set": {
                f"boosts.{data.boost_type.value}": {
                    "boost_id": boost_id,
                    "expires_at": expires_at.isoformat(),
                    "is_active": True
                },
                "is_boosted": True,
                "boost_priority": pricing.get("priority", 1)
            }}
        )
        
        boost.pop("_id", None)
        return boost
    
    @router.get("/my-boosts")
    async def get_my_boosts(
        active_only: bool = False,
        user: dict = Depends(get_current_user)
    ):
        """Get all my boosts"""
        query = {"seller_id": user["user_id"]}
        if active_only:
            query["status"] = BoostStatus.ACTIVE.value
        
        boosts = await db.listing_boosts.find(
            query, {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        return boosts
    
    @router.get("/listing/{listing_id}")
    async def get_listing_boosts(listing_id: str):
        """Get all boosts for a listing"""
        boosts = await db.listing_boosts.find(
            {"listing_id": listing_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        return boosts
    
    return router
