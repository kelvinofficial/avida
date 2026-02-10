"""
Premium Subscription Payment System
Handles Stripe, PayPal, and M-Pesa payments for Premium Business tier upgrades
"""

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Request, Depends, Body
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# ============================================================================
# SUBSCRIPTION PACKAGES - Fixed prices (never accept from frontend)
# ============================================================================

PREMIUM_PACKAGES = {
    "monthly": {
        "id": "monthly",
        "name": "Premium Monthly",
        "amount": 29.99,
        "currency": "usd",
        "duration_days": 30,
        "description": "Premium Verified Business for 1 month"
    },
    "quarterly": {
        "id": "quarterly", 
        "name": "Premium Quarterly",
        "amount": 79.99,
        "currency": "usd",
        "duration_days": 90,
        "description": "Premium Verified Business for 3 months (save 11%)"
    },
    "yearly": {
        "id": "yearly",
        "name": "Premium Yearly",
        "amount": 249.99,
        "currency": "usd",
        "duration_days": 365,
        "description": "Premium Verified Business for 1 year (save 30%)"
    }
}

# M-Pesa specific packages (in local currencies)
MPESA_PACKAGES = {
    "monthly_kes": {
        "id": "monthly_kes",
        "name": "Premium Monthly (Kenya)",
        "amount": 3500,  # KES
        "currency": "KES",
        "duration_days": 30,
        "description": "Premium Verified Business for 1 month"
    },
    "monthly_tzs": {
        "id": "monthly_tzs", 
        "name": "Premium Monthly (Tanzania)",
        "amount": 75000,  # TZS
        "currency": "TZS",
        "duration_days": 30,
        "description": "Premium Verified Business for 1 month"
    }
}

# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class CreateCheckoutRequest(BaseModel):
    package_id: str = Field(..., description="Package ID (monthly, quarterly, yearly)")
    origin_url: str = Field(..., description="Frontend origin URL for redirect")
    business_profile_id: str = Field(..., description="Business profile to upgrade")

class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str
    package: Dict[str, Any]

class PaymentStatusResponse(BaseModel):
    status: str
    payment_status: str
    package_id: Optional[str] = None
    business_profile_id: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None

class MpesaSTKRequest(BaseModel):
    package_id: str = Field(..., description="Package ID (monthly_kes, monthly_tzs)")
    phone_number: str = Field(..., description="M-Pesa registered phone number")
    business_profile_id: str = Field(..., description="Business profile to upgrade")

# ============================================================================
# STRIPE PAYMENT HANDLERS
# ============================================================================

def create_premium_subscription_router(db, get_current_user):
    """Create the premium subscription router with database and auth dependencies"""
    
    router = APIRouter(prefix="/premium-subscription", tags=["Premium Subscription"])
    
    @router.get("/packages")
    async def get_packages():
        """Get available premium subscription packages"""
        return {
            "stripe_packages": list(PREMIUM_PACKAGES.values()),
            "mpesa_packages": list(MPESA_PACKAGES.values())
        }
    
    @router.post("/stripe/checkout", response_model=CheckoutResponse)
    async def create_stripe_checkout(
        request: Request,
        data: CreateCheckoutRequest,
        user = Depends(get_current_user)
    ):
        """Create Stripe checkout session for premium subscription"""
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Validate package
        package = PREMIUM_PACKAGES.get(data.package_id)
        if not package:
            raise HTTPException(status_code=400, detail="Invalid package ID")
        
        # Validate business profile belongs to user
        profile = await db.business_profiles.find_one({
            "id": data.business_profile_id,
            "user_id": user.user_id
        })
        if not profile:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        # Check if already premium
        if profile.get("is_premium") and profile.get("premium_expires_at"):
            expires_at = profile.get("premium_expires_at")
            if isinstance(expires_at, datetime) and expires_at > datetime.now(timezone.utc):
                raise HTTPException(status_code=400, detail="Business profile is already premium")
        
        try:
            from emergentintegrations.payments.stripe.checkout import (
                StripeCheckout, CheckoutSessionRequest
            )
            
            api_key = os.environ.get("STRIPE_API_KEY")
            if not api_key:
                raise HTTPException(status_code=500, detail="Payment system not configured")
            
            # Build URLs from frontend origin
            host_url = str(request.base_url).rstrip('/')
            webhook_url = f"{host_url}/api/webhook/stripe"
            success_url = f"{data.origin_url}/premium/success?session_id={{CHECKOUT_SESSION_ID}}"
            cancel_url = f"{data.origin_url}/business/edit"
            
            stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
            
            # Create checkout session
            checkout_request = CheckoutSessionRequest(
                amount=float(package["amount"]),
                currency=package["currency"],
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    "package_id": package["id"],
                    "business_profile_id": data.business_profile_id,
                    "user_id": user.user_id,
                    "duration_days": str(package["duration_days"]),
                    "type": "premium_subscription"
                }
            )
            
            session = await stripe_checkout.create_checkout_session(checkout_request)
            
            # Create payment transaction record
            transaction = {
                "id": str(uuid.uuid4()),
                "session_id": session.session_id,
                "payment_method": "stripe",
                "user_id": user.user_id,
                "business_profile_id": data.business_profile_id,
                "package_id": package["id"],
                "amount": package["amount"],
                "currency": package["currency"],
                "duration_days": package["duration_days"],
                "status": "pending",
                "payment_status": "initiated",
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            await db.payment_transactions.insert_one(transaction)
            
            logger.info(f"Stripe checkout created: {session.session_id} for profile {data.business_profile_id}")
            
            return CheckoutResponse(
                checkout_url=session.url,
                session_id=session.session_id,
                package=package
            )
            
        except ImportError:
            raise HTTPException(status_code=500, detail="Payment library not available")
        except Exception as e:
            logger.error(f"Stripe checkout error: {e}")
            raise HTTPException(status_code=500, detail="Failed to create checkout session")
    
    @router.get("/stripe/status/{session_id}", response_model=PaymentStatusResponse)
    async def get_stripe_payment_status(
        session_id: str,
        request: Request,
        user = Depends(get_current_user)
    ):
        """Check Stripe payment status and update database"""
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Get transaction record
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Verify user owns this transaction
        if transaction.get("user_id") != user.user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # If already processed, return cached status
        if transaction.get("payment_status") == "paid":
            return PaymentStatusResponse(
                status="complete",
                payment_status="paid",
                package_id=transaction.get("package_id"),
                business_profile_id=transaction.get("business_profile_id"),
                amount=transaction.get("amount"),
                currency=transaction.get("currency")
            )
        
        try:
            from emergentintegrations.payments.stripe.checkout import StripeCheckout
            
            api_key = os.environ.get("STRIPE_API_KEY")
            host_url = str(request.base_url).rstrip('/')
            webhook_url = f"{host_url}/api/webhook/stripe"
            
            stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
            status_response = await stripe_checkout.get_checkout_status(session_id)
            
            # Update transaction if payment completed
            if status_response.payment_status == "paid" and transaction.get("payment_status") != "paid":
                now = datetime.now(timezone.utc)
                duration_days = transaction.get("duration_days", 30)
                expires_at = now + timedelta(days=duration_days)
                
                # Update transaction
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {
                        "status": "success",
                        "payment_status": "paid",
                        "paid_at": now,
                        "updated_at": now
                    }}
                )
                
                # Upgrade business profile to premium
                await db.business_profiles.update_one(
                    {"id": transaction["business_profile_id"]},
                    {"$set": {
                        "is_verified": True,
                        "is_premium": True,
                        "verification_tier": "premium",
                        "verification_status": "approved",
                        "premium_activated_at": now,
                        "premium_expires_at": expires_at,
                        "premium_payment_id": transaction["id"],
                        "updated_at": now
                    }}
                )
                
                # Create notification
                await db.notifications.insert_one({
                    "id": str(uuid.uuid4()),
                    "user_id": transaction["user_id"],
                    "type": "premium_activated",
                    "title": "Premium Business Activated!",
                    "message": f"Your business profile has been upgraded to Premium Verified Business. Valid until {expires_at.strftime('%Y-%m-%d')}.",
                    "is_read": False,
                    "created_at": now
                })
                
                # Send confirmation email and create invoice
                await _send_premium_activation_email_and_invoice(
                    db, transaction, expires_at, PREMIUM_PACKAGES.get(transaction.get("package_id"))
                )
                
                logger.info(f"Premium activated for profile {transaction['business_profile_id']}")
            
            return PaymentStatusResponse(
                status=status_response.status,
                payment_status=status_response.payment_status,
                package_id=transaction.get("package_id"),
                business_profile_id=transaction.get("business_profile_id"),
                amount=status_response.amount_total / 100 if status_response.amount_total else None,
                currency=status_response.currency
            )
            
        except Exception as e:
            logger.error(f"Error checking payment status: {e}")
            return PaymentStatusResponse(
                status="unknown",
                payment_status=transaction.get("payment_status", "unknown"),
                package_id=transaction.get("package_id"),
                business_profile_id=transaction.get("business_profile_id")
            )
    
    @router.post("/paypal/checkout")
    async def create_paypal_checkout(
        request: Request,
        data: CreateCheckoutRequest,
        user = Depends(get_current_user)
    ):
        """Create PayPal checkout for premium subscription"""
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Validate package
        package = PREMIUM_PACKAGES.get(data.package_id)
        if not package:
            raise HTTPException(status_code=400, detail="Invalid package ID")
        
        # Validate business profile
        profile = await db.business_profiles.find_one({
            "id": data.business_profile_id,
            "user_id": user.user_id
        })
        if not profile:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        # For PayPal, return configuration for frontend SDK
        # The actual payment is handled by PayPal's frontend SDK
        transaction_id = str(uuid.uuid4())
        
        # Create pending transaction
        transaction = {
            "id": transaction_id,
            "payment_method": "paypal",
            "user_id": user.user_id,
            "business_profile_id": data.business_profile_id,
            "package_id": package["id"],
            "amount": package["amount"],
            "currency": package["currency"].upper(),
            "duration_days": package["duration_days"],
            "status": "pending",
            "payment_status": "initiated",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.payment_transactions.insert_one(transaction)
        
        return {
            "transaction_id": transaction_id,
            "paypal_client_id": os.environ.get("PAYPAL_CLIENT_ID"),
            "amount": package["amount"],
            "currency": package["currency"].upper(),
            "package": package
        }
    
    @router.post("/paypal/capture/{transaction_id}")
    async def capture_paypal_payment(
        transaction_id: str,
        order_id: str = Body(..., embed=True),
        user = Depends(get_current_user)
    ):
        """Capture PayPal payment after approval"""
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Get transaction
        transaction = await db.payment_transactions.find_one({"id": transaction_id})
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        if transaction.get("user_id") != user.user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if transaction.get("payment_status") == "paid":
            return {"status": "already_captured", "message": "Payment already processed"}
        
        now = datetime.now(timezone.utc)
        duration_days = transaction.get("duration_days", 30)
        expires_at = now + timedelta(days=duration_days)
        
        # Update transaction
        await db.payment_transactions.update_one(
            {"id": transaction_id},
            {"$set": {
                "status": "success",
                "payment_status": "paid",
                "paypal_order_id": order_id,
                "paid_at": now,
                "updated_at": now
            }}
        )
        
        # Upgrade business profile
        await db.business_profiles.update_one(
            {"id": transaction["business_profile_id"]},
            {"$set": {
                "is_verified": True,
                "is_premium": True,
                "verification_tier": "premium",
                "verification_status": "approved",
                "premium_activated_at": now,
                "premium_expires_at": expires_at,
                "premium_payment_id": transaction_id,
                "updated_at": now
            }}
        )
        
        # Create notification
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": transaction["user_id"],
            "type": "premium_activated",
            "title": "Premium Business Activated!",
            "message": f"Your business profile has been upgraded to Premium Verified Business via PayPal.",
            "is_read": False,
            "created_at": now
        })
        
        # Send confirmation email and create invoice
        await _send_premium_activation_email_and_invoice(
            db, transaction, expires_at, PREMIUM_PACKAGES.get(transaction.get("package_id"))
        )
        
        logger.info(f"PayPal premium activated for profile {transaction['business_profile_id']}")
        
        return {
            "status": "success",
            "message": "Premium subscription activated",
            "expires_at": expires_at.isoformat()
        }
    
    @router.post("/mpesa/stk-push")
    async def initiate_mpesa_payment(
        request: Request,
        data: MpesaSTKRequest,
        user = Depends(get_current_user)
    ):
        """Initiate M-Pesa STK Push for premium subscription"""
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Validate package
        package = MPESA_PACKAGES.get(data.package_id)
        if not package:
            raise HTTPException(status_code=400, detail="Invalid package ID")
        
        # Validate business profile
        profile = await db.business_profiles.find_one({
            "id": data.business_profile_id,
            "user_id": user.user_id
        })
        if not profile:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        # Normalize phone number
        phone = data.phone_number.replace("+", "").replace(" ", "").replace("-", "")
        if phone.startswith("0"):
            phone = "254" + phone[1:]  # Default to Kenya
        elif phone.startswith("7"):
            phone = "254" + phone
        
        transaction_id = str(uuid.uuid4())
        
        # Create pending transaction
        transaction = {
            "id": transaction_id,
            "payment_method": "mpesa",
            "user_id": user.user_id,
            "business_profile_id": data.business_profile_id,
            "package_id": package["id"],
            "amount": package["amount"],
            "currency": package["currency"],
            "duration_days": package["duration_days"],
            "phone_number": phone,
            "status": "pending",
            "payment_status": "stk_sent",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.payment_transactions.insert_one(transaction)
        
        # Note: In production, this would call the actual M-Pesa STK Push API
        # For now, return a simulated response
        return {
            "transaction_id": transaction_id,
            "status": "stk_sent",
            "message": f"Please check your phone ({phone}) and enter your M-Pesa PIN to complete the payment of {package['currency']} {package['amount']}",
            "package": package
        }
    
    @router.get("/my-subscription")
    async def get_my_subscription(user = Depends(get_current_user)):
        """Get current user's premium subscription status"""
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        profile = await db.business_profiles.find_one(
            {"user_id": user.user_id},
            {"_id": 0}
        )
        
        if not profile:
            return {"has_profile": False, "is_premium": False}
        
        # Check if premium is expired
        is_premium = profile.get("is_premium", False)
        expires_at = profile.get("premium_expires_at")
        
        if is_premium and expires_at:
            if isinstance(expires_at, datetime):
                if expires_at < datetime.now(timezone.utc):
                    # Premium expired, downgrade to verified
                    await db.business_profiles.update_one(
                        {"id": profile["id"]},
                        {"$set": {
                            "is_premium": False,
                            "verification_tier": "verified" if profile.get("is_verified") else "none",
                            "updated_at": datetime.now(timezone.utc)
                        }}
                    )
                    is_premium = False
        
        return {
            "has_profile": True,
            "profile_id": profile.get("id"),
            "business_name": profile.get("business_name"),
            "is_verified": profile.get("is_verified", False),
            "is_premium": is_premium,
            "verification_tier": profile.get("verification_tier", "none"),
            "premium_expires_at": expires_at.isoformat() if isinstance(expires_at, datetime) else None
        }
    
    return router


# ============================================================================
# STRIPE WEBHOOK HANDLER
# ============================================================================

async def handle_stripe_webhook(request: Request, db):
    """Handle Stripe webhook events"""
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        
        api_key = os.environ.get("STRIPE_API_KEY")
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        
        stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
        
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.event_type == "checkout.session.completed":
            session_id = webhook_response.session_id
            
            # Check if already processed
            transaction = await db.payment_transactions.find_one({"session_id": session_id})
            if transaction and transaction.get("payment_status") != "paid":
                now = datetime.now(timezone.utc)
                duration_days = transaction.get("duration_days", 30)
                expires_at = now + timedelta(days=duration_days)
                
                # Update transaction
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {
                        "status": "success",
                        "payment_status": "paid",
                        "paid_at": now,
                        "updated_at": now
                    }}
                )
                
                # Upgrade business profile
                await db.business_profiles.update_one(
                    {"id": transaction["business_profile_id"]},
                    {"$set": {
                        "is_verified": True,
                        "is_premium": True,
                        "verification_tier": "premium",
                        "verification_status": "approved",
                        "premium_activated_at": now,
                        "premium_expires_at": expires_at,
                        "premium_payment_id": transaction["id"],
                        "updated_at": now
                    }}
                )
                
                logger.info(f"Webhook: Premium activated for {transaction['business_profile_id']}")
        
        return {"status": "received"}
        
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}


# ============================================================================
# HELPER: SEND EMAIL AND CREATE INVOICE ON SUCCESSFUL PAYMENT
# ============================================================================

async def _send_premium_activation_email_and_invoice(db, transaction: dict, expires_at, package: dict):
    """
    Helper function to send premium activation email and create invoice.
    Called after successful payment (Stripe, PayPal, or M-Pesa).
    """
    try:
        # Import services (may not be available during standalone testing)
        from subscription_services import SubscriptionEmailService, InvoiceService
        from sendgrid import SendGridAPIClient
        
        # Get user and profile info
        user = await db.users.find_one({"user_id": transaction["user_id"]})
        profile = await db.business_profiles.find_one({"id": transaction["business_profile_id"]})
        
        if not user or not profile:
            logger.warning(f"Could not find user/profile for transaction {transaction.get('id')}")
            return
        
        # Initialize SendGrid client
        sendgrid_api_key = os.environ.get("SENDGRID_API_KEY")
        sg_client = SendGridAPIClient(sendgrid_api_key) if sendgrid_api_key else None
        
        # Send confirmation email
        email_service = SubscriptionEmailService(db, sg_client)
        package_name = package.get("name", "Premium Monthly") if package else "Premium Monthly"
        amount = transaction.get("amount", 29.99)
        
        if user.get("email"):
            await email_service.send_premium_activated(
                user["email"],
                profile.get("business_name", "Your Business"),
                package_name,
                amount,
                expires_at.strftime("%B %d, %Y")
            )
            logger.info(f"Sent premium activation email to {user['email']}")
        
        # Create invoice
        invoice_service = InvoiceService(db)
        invoice = await invoice_service.create_invoice(transaction["id"])
        if invoice:
            logger.info(f"Created invoice {invoice.get('invoice_number')} for transaction {transaction['id']}")
        
    except ImportError as e:
        logger.warning(f"Subscription services not available for email/invoice: {e}")
    except Exception as e:
        logger.error(f"Error sending email/creating invoice: {e}")

