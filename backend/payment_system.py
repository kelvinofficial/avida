"""
Payment Processing System for Escrow Orders
Supports: Stripe (Card), PayPal, Vodacom Mobile Money via Flutterwave
"""

from fastapi import APIRouter, HTTPException, Request, Depends, Body
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import os
import uuid
import logging
import httpx
import hmac
import hashlib

logger = logging.getLogger(__name__)

# Stripe Checkout Integration
try:
    from emergentintegrations.payments.stripe.checkout import (
        StripeCheckout, 
        CheckoutSessionResponse, 
        CheckoutStatusResponse,
        CheckoutSessionRequest
    )
    STRIPE_AVAILABLE = True
except ImportError:
    STRIPE_AVAILABLE = False
    logger.warning("Stripe integration not available")


class PaymentProvider(str, Enum):
    STRIPE = "stripe"
    PAYPAL = "paypal"
    MOBILE_MONEY = "mobile_money"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class CreatePaymentRequest(BaseModel):
    order_id: str
    provider: str  # stripe, paypal, mobile_money
    origin_url: str  # Frontend origin for redirect URLs


class MobileMoneyPaymentRequest(BaseModel):
    order_id: str
    phone_number: str  # Format: 255XXXXXXXXX
    origin_url: str


class PaymentService:
    """Unified payment service handling multiple providers"""
    
    def __init__(self, db):
        self.db = db
        self.stripe_key = os.environ.get('STRIPE_API_KEY')
        self.paypal_client_id = os.environ.get('PAYPAL_CLIENT_ID')
        self.paypal_secret = os.environ.get('PAYPAL_SECRET')
        self.fw_secret_key = os.environ.get('FW_SECRET_KEY')
        self.fw_public_key = os.environ.get('FW_PUBLIC_KEY')
        
    async def create_stripe_payment(
        self,
        order_id: str,
        amount: float,
        currency: str,
        origin_url: str,
        buyer_email: str,
        metadata: Dict[str, str]
    ) -> Dict:
        """Create Stripe checkout session for order payment"""
        if not STRIPE_AVAILABLE or not self.stripe_key:
            raise HTTPException(status_code=500, detail="Stripe not configured")
        
        # Create payment transaction record
        tx_id = f"pay_stripe_{uuid.uuid4().hex[:12]}"
        
        await self.db.payment_transactions.insert_one({
            "id": tx_id,
            "order_id": order_id,
            "provider": PaymentProvider.STRIPE,
            "amount": amount,
            "currency": currency,
            "status": PaymentStatus.PENDING,
            "metadata": metadata,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        try:
            # Build URLs
            webhook_url = f"{origin_url}/api/webhook/stripe"
            success_url = f"{origin_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}&order_id={order_id}"
            cancel_url = f"{origin_url}/checkout/cancel?order_id={order_id}"
            
            # Initialize Stripe checkout
            stripe_checkout = StripeCheckout(api_key=self.stripe_key, webhook_url=webhook_url)
            
            # Create checkout session
            checkout_request = CheckoutSessionRequest(
                amount=float(amount),
                currency=currency.lower(),
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    "order_id": order_id,
                    "tx_id": tx_id,
                    **metadata
                }
            )
            
            session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
            
            # Update transaction with session ID
            await self.db.payment_transactions.update_one(
                {"id": tx_id},
                {"$set": {
                    "session_id": session.session_id,
                    "checkout_url": session.url,
                    "status": PaymentStatus.PROCESSING,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            return {
                "success": True,
                "provider": "stripe",
                "checkout_url": session.url,
                "session_id": session.session_id,
                "tx_id": tx_id
            }
            
        except Exception as e:
            logger.error(f"Stripe payment error: {e}")
            await self.db.payment_transactions.update_one(
                {"id": tx_id},
                {"$set": {"status": PaymentStatus.FAILED, "error": str(e)}}
            )
            raise HTTPException(status_code=500, detail=f"Payment creation failed: {str(e)}")
    
    async def verify_stripe_payment(self, session_id: str) -> Dict:
        """Verify Stripe payment status"""
        if not STRIPE_AVAILABLE or not self.stripe_key:
            raise HTTPException(status_code=500, detail="Stripe not configured")
        
        try:
            stripe_checkout = StripeCheckout(api_key=self.stripe_key, webhook_url="")
            status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
            
            # Find transaction
            transaction = await self.db.payment_transactions.find_one(
                {"session_id": session_id},
                {"_id": 0}
            )
            
            if not transaction:
                raise HTTPException(status_code=404, detail="Transaction not found")
            
            # Update status
            new_status = PaymentStatus.COMPLETED if status.payment_status == "paid" else PaymentStatus.PENDING
            
            if new_status == PaymentStatus.COMPLETED and transaction.get("status") != PaymentStatus.COMPLETED:
                await self.db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {
                        "status": new_status,
                        "payment_status": status.payment_status,
                        "completed_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # Fund the escrow for this order
                if new_status == PaymentStatus.COMPLETED:
                    await self._fund_order_escrow(transaction["order_id"], transaction["id"])
            
            return {
                "success": True,
                "status": status.status,
                "payment_status": status.payment_status,
                "amount": status.amount_total / 100,  # Convert from cents
                "currency": status.currency,
                "order_id": transaction.get("order_id")
            }
            
        except Exception as e:
            logger.error(f"Stripe verification error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def handle_stripe_webhook(self, body: bytes, signature: str) -> Dict:
        """Handle Stripe webhook notifications"""
        if not STRIPE_AVAILABLE or not self.stripe_key:
            return {"status": "skipped", "reason": "Stripe not configured"}
        
        try:
            stripe_checkout = StripeCheckout(api_key=self.stripe_key, webhook_url="")
            webhook_response = await stripe_checkout.handle_webhook(body, signature)
            
            if webhook_response.payment_status == "paid":
                # Find and update transaction
                transaction = await self.db.payment_transactions.find_one(
                    {"session_id": webhook_response.session_id}
                )
                
                if transaction and transaction.get("status") != PaymentStatus.COMPLETED:
                    await self.db.payment_transactions.update_one(
                        {"session_id": webhook_response.session_id},
                        {"$set": {
                            "status": PaymentStatus.COMPLETED,
                            "payment_status": webhook_response.payment_status,
                            "completed_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    
                    # Fund escrow
                    await self._fund_order_escrow(
                        transaction["order_id"], 
                        transaction["id"]
                    )
            
            return {"status": "processed", "event_type": webhook_response.event_type}
            
        except Exception as e:
            logger.error(f"Webhook processing error: {e}")
            return {"status": "error", "error": str(e)}
    
    async def create_paypal_payment(
        self,
        order_id: str,
        amount: float,
        currency: str,
        origin_url: str,
        buyer_email: str,
        metadata: Dict[str, str]
    ) -> Dict:
        """Create PayPal order for payment"""
        if not self.paypal_client_id or not self.paypal_secret:
            raise HTTPException(status_code=500, detail="PayPal not configured")
        
        tx_id = f"pay_paypal_{uuid.uuid4().hex[:12]}"
        
        await self.db.payment_transactions.insert_one({
            "id": tx_id,
            "order_id": order_id,
            "provider": PaymentProvider.PAYPAL,
            "amount": amount,
            "currency": currency,
            "status": PaymentStatus.PENDING,
            "metadata": metadata,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        try:
            # Get PayPal access token
            auth_url = "https://api-m.sandbox.paypal.com/v1/oauth2/token"
            async with httpx.AsyncClient() as client:
                auth_response = await client.post(
                    auth_url,
                    auth=(self.paypal_client_id, self.paypal_secret),
                    data={"grant_type": "client_credentials"},
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                
                if auth_response.status_code != 200:
                    raise HTTPException(status_code=500, detail="PayPal authentication failed")
                
                access_token = auth_response.json()["access_token"]
                
                # Create PayPal order
                success_url = f"{origin_url}/checkout/success?order_id={order_id}&provider=paypal"
                cancel_url = f"{origin_url}/checkout/cancel?order_id={order_id}"
                
                order_payload = {
                    "intent": "CAPTURE",
                    "purchase_units": [{
                        "reference_id": order_id,
                        "custom_id": tx_id,
                        "amount": {
                            "currency_code": currency.upper(),
                            "value": f"{amount:.2f}"
                        }
                    }],
                    "application_context": {
                        "return_url": success_url,
                        "cancel_url": cancel_url,
                        "brand_name": "Marketplace",
                        "landing_page": "NO_PREFERENCE",
                        "user_action": "PAY_NOW"
                    }
                }
                
                order_response = await client.post(
                    "https://api-m.sandbox.paypal.com/v2/checkout/orders",
                    json=order_payload,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    }
                )
                
                if order_response.status_code not in [200, 201]:
                    raise HTTPException(status_code=500, detail="PayPal order creation failed")
                
                paypal_order = order_response.json()
                
                # Get approval URL
                approval_url = None
                for link in paypal_order.get("links", []):
                    if link["rel"] == "approve":
                        approval_url = link["href"]
                        break
                
                if not approval_url:
                    raise HTTPException(status_code=500, detail="PayPal approval URL not found")
                
                # Update transaction
                await self.db.payment_transactions.update_one(
                    {"id": tx_id},
                    {"$set": {
                        "paypal_order_id": paypal_order["id"],
                        "checkout_url": approval_url,
                        "status": PaymentStatus.PROCESSING,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                return {
                    "success": True,
                    "provider": "paypal",
                    "checkout_url": approval_url,
                    "paypal_order_id": paypal_order["id"],
                    "tx_id": tx_id
                }
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"PayPal payment error: {e}")
            await self.db.payment_transactions.update_one(
                {"id": tx_id},
                {"$set": {"status": PaymentStatus.FAILED, "error": str(e)}}
            )
            raise HTTPException(status_code=500, detail=f"PayPal payment failed: {str(e)}")
    
    async def capture_paypal_payment(self, paypal_order_id: str) -> Dict:
        """Capture approved PayPal payment"""
        if not self.paypal_client_id or not self.paypal_secret:
            raise HTTPException(status_code=500, detail="PayPal not configured")
        
        try:
            # Get access token
            async with httpx.AsyncClient() as client:
                auth_response = await client.post(
                    "https://api-m.sandbox.paypal.com/v1/oauth2/token",
                    auth=(self.paypal_client_id, self.paypal_secret),
                    data={"grant_type": "client_credentials"},
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                
                if auth_response.status_code != 200:
                    raise HTTPException(status_code=500, detail="PayPal authentication failed")
                
                access_token = auth_response.json()["access_token"]
                
                # Capture payment
                capture_response = await client.post(
                    f"https://api-m.sandbox.paypal.com/v2/checkout/orders/{paypal_order_id}/capture",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    }
                )
                
                if capture_response.status_code not in [200, 201]:
                    raise HTTPException(status_code=500, detail="PayPal capture failed")
                
                capture_data = capture_response.json()
                
                # Find and update transaction
                transaction = await self.db.payment_transactions.find_one(
                    {"paypal_order_id": paypal_order_id}
                )
                
                if transaction:
                    await self.db.payment_transactions.update_one(
                        {"paypal_order_id": paypal_order_id},
                        {"$set": {
                            "status": PaymentStatus.COMPLETED,
                            "capture_id": capture_data.get("id"),
                            "completed_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    
                    # Fund escrow
                    await self._fund_order_escrow(transaction["order_id"], transaction["id"])
                
                return {
                    "success": True,
                    "status": capture_data.get("status"),
                    "order_id": transaction.get("order_id") if transaction else None
                }
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"PayPal capture error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def create_mobile_money_payment(
        self,
        order_id: str,
        amount: float,
        currency: str,
        phone_number: str,
        buyer_email: str,
        origin_url: str,
        metadata: Dict[str, str]
    ) -> Dict:
        """Create Vodacom Mobile Money payment via Flutterwave"""
        if not self.fw_secret_key:
            raise HTTPException(status_code=500, detail="Flutterwave not configured")
        
        tx_id = f"pay_momo_{uuid.uuid4().hex[:12]}"
        tx_ref = f"TX-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:8]}"
        
        # Normalize phone number to 255... format (Tanzania)
        clean_phone = ''.join(filter(str.isdigit, phone_number))
        if clean_phone.startswith('0'):
            clean_phone = '255' + clean_phone[1:]
        elif not clean_phone.startswith('255'):
            if len(clean_phone) == 9:
                clean_phone = '255' + clean_phone
        
        await self.db.payment_transactions.insert_one({
            "id": tx_id,
            "tx_ref": tx_ref,
            "order_id": order_id,
            "provider": PaymentProvider.MOBILE_MONEY,
            "amount": amount,
            "currency": currency,
            "phone_number": clean_phone,
            "status": PaymentStatus.PENDING,
            "metadata": metadata,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        try:
            redirect_url = f"{origin_url}/checkout/success?order_id={order_id}&provider=mobile_money"
            
            payload = {
                "tx_ref": tx_ref,
                "amount": amount,
                "currency": currency.upper(),
                "email": buyer_email,
                "phone_number": clean_phone,
                "payment_options": "mpesa",
                "meta": {
                    "order_id": order_id,
                    "tx_id": tx_id
                },
                "redirect_url": redirect_url
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.flutterwave.com/v3/charges?type=mpesa",
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {self.fw_secret_key}",
                        "Content-Type": "application/json"
                    },
                    timeout=30
                )
                
                if response.status_code != 200:
                    logger.error(f"Flutterwave error: {response.text}")
                    raise HTTPException(status_code=500, detail="Mobile Money initiation failed")
                
                fw_response = response.json()
                
                if fw_response.get("status") == "success":
                    flw_ref = fw_response["data"].get("flw_ref")
                    
                    await self.db.payment_transactions.update_one(
                        {"id": tx_id},
                        {"$set": {
                            "flw_ref": flw_ref,
                            "status": PaymentStatus.PROCESSING,
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    
                    return {
                        "success": True,
                        "provider": "mobile_money",
                        "tx_ref": tx_ref,
                        "flw_ref": flw_ref,
                        "tx_id": tx_id,
                        "message": "Check your phone to authorize the payment"
                    }
                else:
                    raise HTTPException(
                        status_code=400, 
                        detail=fw_response.get("message", "Mobile Money failed")
                    )
                    
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Mobile Money payment error: {e}")
            await self.db.payment_transactions.update_one(
                {"id": tx_id},
                {"$set": {"status": PaymentStatus.FAILED, "error": str(e)}}
            )
            raise HTTPException(status_code=500, detail=str(e))
    
    async def verify_mobile_money_payment(self, tx_ref: str) -> Dict:
        """Verify Mobile Money payment status"""
        if not self.fw_secret_key:
            raise HTTPException(status_code=500, detail="Flutterwave not configured")
        
        try:
            transaction = await self.db.payment_transactions.find_one(
                {"tx_ref": tx_ref},
                {"_id": 0}
            )
            
            if not transaction:
                raise HTTPException(status_code=404, detail="Transaction not found")
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref={tx_ref}",
                    headers={"Authorization": f"Bearer {self.fw_secret_key}"},
                    timeout=30
                )
                
                if response.status_code != 200:
                    raise HTTPException(status_code=500, detail="Verification failed")
                
                fw_response = response.json()
                
                if fw_response.get("status") == "success":
                    data = fw_response["data"]
                    
                    new_status = PaymentStatus.COMPLETED if data.get("status") == "successful" else PaymentStatus.PENDING
                    
                    if new_status == PaymentStatus.COMPLETED and transaction.get("status") != PaymentStatus.COMPLETED:
                        await self.db.payment_transactions.update_one(
                            {"tx_ref": tx_ref},
                            {"$set": {
                                "status": new_status,
                                "flw_transaction_id": data.get("id"),
                                "completed_at": datetime.now(timezone.utc).isoformat()
                            }}
                        )
                        
                        # Fund escrow
                        await self._fund_order_escrow(transaction["order_id"], transaction["id"])
                    
                    return {
                        "success": True,
                        "status": data.get("status"),
                        "amount": data.get("amount"),
                        "currency": data.get("currency"),
                        "order_id": transaction.get("order_id")
                    }
                else:
                    raise HTTPException(status_code=400, detail="Verification unsuccessful")
                    
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Mobile Money verification error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def handle_flutterwave_webhook(self, body: bytes, verif_hash: str) -> Dict:
        """Handle Flutterwave webhook notifications"""
        if not self.fw_secret_key:
            return {"status": "skipped"}
        
        try:
            import json
            payload = json.loads(body)
            
            tx_ref = payload.get("data", {}).get("tx_ref")
            status = payload.get("data", {}).get("status")
            
            if tx_ref and status == "successful":
                transaction = await self.db.payment_transactions.find_one({"tx_ref": tx_ref})
                
                if transaction and transaction.get("status") != PaymentStatus.COMPLETED:
                    await self.db.payment_transactions.update_one(
                        {"tx_ref": tx_ref},
                        {"$set": {
                            "status": PaymentStatus.COMPLETED,
                            "completed_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    
                    await self._fund_order_escrow(transaction["order_id"], transaction["id"])
            
            return {"status": "received"}
            
        except Exception as e:
            logger.error(f"Flutterwave webhook error: {e}")
            return {"status": "error", "error": str(e)}
    
    async def _fund_order_escrow(self, order_id: str, payment_reference: str):
        """Fund escrow after successful payment"""
        try:
            # Update escrow to funded status
            now = datetime.now(timezone.utc).isoformat()
            
            await self.db.escrow.update_one(
                {"order_id": order_id},
                {"$set": {
                    "status": "funded",
                    "payment_reference": payment_reference,
                    "funded_at": now,
                    "updated_at": now
                }}
            )
            
            # Update order status to paid
            await self.db.orders.update_one(
                {"id": order_id},
                {"$set": {
                    "status": "paid",
                    "updated_at": now
                }}
            )
            
            # Record transaction
            await self.db.transactions.insert_one({
                "id": f"txn_{uuid.uuid4().hex[:12]}",
                "type": "escrow_funded",
                "order_id": order_id,
                "payment_reference": payment_reference,
                "status": "completed",
                "created_at": now
            })
            
            logger.info(f"Escrow funded for order {order_id}")
            
        except Exception as e:
            logger.error(f"Failed to fund escrow for order {order_id}: {e}")
    
    async def get_payment_status(self, tx_id: str) -> Dict:
        """Get payment transaction status"""
        transaction = await self.db.payment_transactions.find_one(
            {"id": tx_id},
            {"_id": 0}
        )
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        return transaction


def create_payment_router(db, get_current_user):
    """Create payment router"""
    
    router = APIRouter(prefix="/payments", tags=["Payments"])
    service = PaymentService(db)
    
    @router.post("/create")
    async def create_payment(
        request: CreatePaymentRequest,
        http_request: Request,
        user = Depends(get_current_user)
    ):
        """Create a payment for an order"""
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Get order details
        order = await db.orders.find_one({"id": request.order_id}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        if order["buyer_id"] != user.user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        if order["status"] != "pending_payment":
            raise HTTPException(status_code=400, detail=f"Order status is {order['status']}, cannot create payment")
        
        # Get user email
        user_doc = await db.users.find_one({"user_id": user.user_id}, {"email": 1})
        buyer_email = user_doc.get("email", "") if user_doc else ""
        
        amount = order["total_amount"]
        currency = order.get("currency", "EUR")
        metadata = {
            "order_id": request.order_id,
            "buyer_id": user.user_id,
            "seller_id": order["seller_id"]
        }
        
        if request.provider == "stripe":
            return await service.create_stripe_payment(
                request.order_id, amount, currency, request.origin_url, buyer_email, metadata
            )
        elif request.provider == "paypal":
            return await service.create_paypal_payment(
                request.order_id, amount, currency, request.origin_url, buyer_email, metadata
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid payment provider")
    
    @router.post("/mobile-money")
    async def create_mobile_money_payment(
        request: MobileMoneyPaymentRequest,
        http_request: Request,
        user = Depends(get_current_user)
    ):
        """Create Mobile Money payment (Vodacom M-Pesa)"""
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        order = await db.orders.find_one({"id": request.order_id}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        if order["buyer_id"] != user.user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        user_doc = await db.users.find_one({"user_id": user.user_id}, {"email": 1})
        buyer_email = user_doc.get("email", "") if user_doc else ""
        
        return await service.create_mobile_money_payment(
            request.order_id,
            order["total_amount"],
            "TZS",  # Tanzania Shillings for Vodacom
            request.phone_number,
            buyer_email,
            request.origin_url,
            {"order_id": request.order_id, "buyer_id": user.user_id}
        )
    
    @router.get("/verify/stripe/{session_id}")
    async def verify_stripe(session_id: str):
        """Verify Stripe payment status"""
        return await service.verify_stripe_payment(session_id)
    
    @router.post("/verify/paypal/{paypal_order_id}")
    async def capture_paypal(paypal_order_id: str):
        """Capture PayPal payment after approval"""
        return await service.capture_paypal_payment(paypal_order_id)
    
    @router.get("/verify/mobile-money/{tx_ref}")
    async def verify_mobile_money(tx_ref: str):
        """Verify Mobile Money payment status"""
        return await service.verify_mobile_money_payment(tx_ref)
    
    @router.get("/status/{tx_id}")
    async def get_payment_status(tx_id: str, user = Depends(get_current_user)):
        """Get payment transaction status"""
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return await service.get_payment_status(tx_id)
    
    @router.post("/webhook/stripe")
    async def stripe_webhook(request: Request):
        """Handle Stripe webhooks"""
        body = await request.body()
        signature = request.headers.get("Stripe-Signature", "")
        return await service.handle_stripe_webhook(body, signature)
    
    @router.post("/webhook/flutterwave")
    async def flutterwave_webhook(request: Request):
        """Handle Flutterwave webhooks"""
        body = await request.body()
        verif_hash = request.headers.get("verif-hash", "")
        return await service.handle_flutterwave_webhook(body, verif_hash)
    
    return router, service
