"""
Subscription Email & Renewal System
Handles email notifications, auto-renewal, and invoice generation for Premium subscriptions
"""

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, List
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Email Templates
EMAIL_TEMPLATES = {
    "premium_activated": {
        "subject": "Welcome to Premium Verified Business! 🎉",
        "body": """
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #FF8F00, #FFB300); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
        <h1 style="color: white; margin: 0;">Premium Activated! 🎉</h1>
    </div>
    
    <p>Hi {business_name},</p>
    
    <p>Congratulations! Your business profile has been upgraded to <strong>Premium Verified Business</strong>.</p>
    
    <div style="background: #FFF8E1; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #FF8F00; margin-top: 0;">Your Premium Benefits:</h3>
        <ul style="color: #333;">
            <li>✨ Premium diamond badge on your profile</li>
            <li>📊 Priority placement in Featured Sellers</li>
            <li>🔍 Enhanced visibility in search results</li>
            <li>💬 Premium customer support</li>
        </ul>
    </div>
    
    <p><strong>Subscription Details:</strong></p>
    <ul>
        <li>Package: {package_name}</li>
        <li>Amount Paid: ${amount}</li>
        <li>Valid Until: {expires_at}</li>
    </ul>
    
    <p>Thank you for choosing Premium!</p>
    
    <p style="color: #666; font-size: 12px; margin-top: 30px;">
        This email was sent by Avida Marketplace. If you have questions, contact support.
    </p>
</body>
</html>
"""
    },
    "renewal_reminder": {
        "subject": "Your Premium subscription expires in {days_left} days",
        "body": """
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #FFF8E1; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
        <h2 style="color: #FF8F00; margin: 0;">⏰ Subscription Expiring Soon</h2>
    </div>
    
    <p>Hi {business_name},</p>
    
    <p>Your <strong>Premium Verified Business</strong> subscription will expire in <strong>{days_left} days</strong> on {expires_at}.</p>
    
    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Don't lose your Premium benefits!</strong></p>
        <p style="margin: 10px 0 0 0; color: #666;">Renew now to continue enjoying priority placement, the premium badge, and enhanced visibility.</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="{renew_url}" style="background: #FF8F00; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">Renew Now</a>
    </div>
    
    <p style="color: #666; font-size: 12px; margin-top: 30px;">
        If you've enabled auto-renewal, your subscription will be renewed automatically.
    </p>
</body>
</html>
"""
    },
    "renewal_success": {
        "subject": "Your Premium subscription has been renewed ✅",
        "body": """
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #4CAF50; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
        <h2 style="color: white; margin: 0;">✅ Subscription Renewed</h2>
    </div>
    
    <p>Hi {business_name},</p>
    
    <p>Great news! Your <strong>Premium Verified Business</strong> subscription has been successfully renewed.</p>
    
    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Renewal Details:</strong></p>
        <ul style="color: #333;">
            <li>Package: {package_name}</li>
            <li>Amount Charged: ${amount}</li>
            <li>New Expiry Date: {expires_at}</li>
        </ul>
    </div>
    
    <p>Thank you for continuing with Premium!</p>
    
    <p style="color: #666; font-size: 12px; margin-top: 30px;">
        View your invoice at: {invoice_url}
    </p>
</body>
</html>
"""
    },
    "payment_failed": {
        "subject": "⚠️ Payment failed for your Premium subscription",
        "body": """
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #D32F2F; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
        <h2 style="color: white; margin: 0;">⚠️ Payment Failed</h2>
    </div>
    
    <p>Hi {business_name},</p>
    
    <p>We were unable to process your payment for <strong>Premium Verified Business</strong> renewal.</p>
    
    <div style="background: #FFEBEE; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Action Required:</strong></p>
        <p style="margin: 10px 0 0 0;">Please update your payment method to avoid losing your Premium benefits.</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="{update_payment_url}" style="background: #FF8F00; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">Update Payment Method</a>
    </div>
    
    <p style="color: #666;">Your Premium status will expire on {expires_at} if payment is not updated.</p>
</body>
</html>
"""
    },
    "subscription_expired": {
        "subject": "Your Premium subscription has expired",
        "body": """
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #757575; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
        <h2 style="color: white; margin: 0;">Premium Subscription Expired</h2>
    </div>
    
    <p>Hi {business_name},</p>
    
    <p>Your <strong>Premium Verified Business</strong> subscription has expired. Your profile has been downgraded to standard Verified status.</p>
    
    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;"><strong>What you're missing:</strong></p>
        <ul style="color: #666;">
            <li>Premium diamond badge</li>
            <li>Priority placement in Featured Sellers</li>
            <li>Enhanced search visibility</li>
        </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="{renew_url}" style="background: #FF8F00; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">Reactivate Premium</a>
    </div>
</body>
</html>
"""
    },
    "profile_verified": {
        "subject": "Congratulations! Your Business Profile is Now Verified ✓",
        "body": """
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #1976D2, #42A5F5); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
        <h1 style="color: white; margin: 0;">Profile Verified! ✓</h1>
    </div>
    
    <p>Hi {business_name},</p>
    
    <p>Great news! Your business profile has been <strong>verified</strong> by our team.</p>
    
    <div style="background: #E3F2FD; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1976D2; margin-top: 0;">Your Verified Benefits:</h3>
        <ul style="color: #333;">
            <li>✓ Verified business badge on your profile</li>
            <li>✓ Increased trust from buyers</li>
            <li>✓ Better visibility in search results</li>
            <li>✓ Eligible to upgrade to Premium</li>
        </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="{profile_url}" style="background: #1976D2; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">View Your Profile</a>
    </div>
    
    <div style="background: #FFF8E1; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #FF8F00;"><strong>💎 Want even more visibility?</strong></p>
        <p style="margin: 8px 0 0 0; color: #666;">Upgrade to Premium to get priority placement in Featured Sellers, a premium diamond badge, and enhanced visibility!</p>
    </div>
    
    <p>Thank you for being part of Avida Marketplace!</p>
    
    <p style="color: #666; font-size: 12px; margin-top: 30px;">
        This email was sent by Avida Marketplace.
    </p>
</body>
</html>
"""
    },
    "profile_verification_rejected": {
        "subject": "Business Profile Verification Update",
        "body": """
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #757575; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
        <h2 style="color: white; margin: 0;">Verification Update</h2>
    </div>
    
    <p>Hi {business_name},</p>
    
    <p>We've reviewed your business profile verification request. Unfortunately, we were unable to approve it at this time.</p>
    
    <div style="background: #FFF3E0; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Reason:</strong></p>
        <p style="margin: 10px 0 0 0; color: #666;">{rejection_reason}</p>
    </div>
    
    <p><strong>What you can do:</strong></p>
    <ul style="color: #666;">
        <li>Review and update your business profile information</li>
        <li>Ensure your profile has complete and accurate details</li>
        <li>Submit a new verification request once updated</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="{edit_profile_url}" style="background: #2E7D32; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">Update Your Profile</a>
    </div>
    
    <p style="color: #666; font-size: 12px; margin-top: 30px;">
        If you have questions, please contact our support team.
    </p>
</body>
</html>
"""
    },
    "admin_premium_upgrade": {
        "subject": "🎉 Your Business Has Been Upgraded to Premium!",
        "body": """
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #FF8F00, #FFB300); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
        <h1 style="color: white; margin: 0;">💎 Premium Business! 💎</h1>
    </div>
    
    <p>Hi {business_name},</p>
    
    <p>Exciting news! Your business profile has been upgraded to <strong>Premium Verified Business</strong> by our team!</p>
    
    <div style="background: #FFF8E1; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #FF8F00; margin-top: 0;">Your Premium Benefits:</h3>
        <ul style="color: #333;">
            <li>💎 Premium diamond badge on your profile</li>
            <li>📊 Priority placement in Featured Sellers</li>
            <li>🔍 Maximum visibility in search results</li>
            <li>💬 Premium customer support</li>
        </ul>
    </div>
    
    <div style="background: #E8F5E9; padding: 16px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="margin: 0;"><strong>Premium Valid Until:</strong></p>
        <p style="margin: 8px 0 0 0; font-size: 20px; color: #2E7D32; font-weight: bold;">{expires_at}</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="{profile_url}" style="background: #FF8F00; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">View Your Premium Profile</a>
    </div>
    
    <p>Thank you for being a valued member of Avida Marketplace!</p>
    
    <p style="color: #666; font-size: 12px; margin-top: 30px;">
        This upgrade was provided by our admin team. Enjoy your Premium benefits!
    </p>
</body>
</html>
"""
    }
}


class SubscriptionEmailService:
    """Service for sending subscription-related emails"""
    
    def __init__(self, db, sendgrid_client=None):
        self.db = db
        self.sg = sendgrid_client
        self.from_email = os.environ.get("SENDGRID_FROM_EMAIL", "noreply@marketplace.com")
        self.from_name = os.environ.get("SENDGRID_FROM_NAME", "Avida Marketplace")
        self.base_url = os.environ.get("FRONTEND_URL", "https://admin-photography.preview.emergentagent.com")
    
    # Map email templates to preference keys
    TEMPLATE_PREFERENCE_MAP = {
        "premium_activated": "email_premium_updates",
        "renewal_reminder": "email_reminders",
        "subscription_expired": "email_premium_updates",
        "profile_verified": "email_verification_updates",
        "profile_verification_rejected": "email_verification_updates",
        "admin_premium_upgrade": "email_premium_updates",
    }
    
    async def check_user_email_preference(self, user_id: str, template_name: str) -> bool:
        """Check if user has opted in to receive this type of email"""
        preference_key = self.TEMPLATE_PREFERENCE_MAP.get(template_name)
        
        # Transactional emails are always sent (no preference key means required)
        if not preference_key:
            return True
        
        # Get user preferences
        prefs = await self.db.notification_preferences.find_one({"user_id": user_id})
        
        if not prefs:
            # No preferences set, use defaults (all enabled by default)
            return True
        
        # Check specific preference
        return prefs.get(preference_key, True)
    
    async def send_email(self, to_email: str, template_name: str, context: Dict, user_id: str = None) -> bool:
        """Send an email using a template, respecting user preferences"""
        try:
            if not self.sg:
                logger.warning("SendGrid not configured, skipping email")
                return False
            
            # Check user preference if user_id is provided
            if user_id:
                can_send = await self.check_user_email_preference(user_id, template_name)
                if not can_send:
                    logger.info(f"User {user_id} opted out of {template_name} emails, skipping")
                    return False
            
            template = EMAIL_TEMPLATES.get(template_name)
            if not template:
                logger.error(f"Email template not found: {template_name}")
                return False
            
            # Format subject and body with context
            subject = template["subject"].format(**context)
            body = template["body"].format(**context)
            
            from sendgrid.helpers.mail import Mail, Email, To, Content
            
            message = Mail(
                from_email=Email(self.from_email, self.from_name),
                to_emails=To(to_email),
                subject=subject,
                html_content=Content("text/html", body)
            )
            
            response = self.sg.send(message)
            logger.info(f"Email sent to {to_email}: {template_name}, status: {response.status_code}")
            return response.status_code == 202
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False
    
    async def send_premium_activated(self, user_email: str, business_name: str, package_name: str, amount: float, expires_at: str, user_id: str = None):
        """Send premium activation confirmation email"""
        context = {
            "business_name": business_name,
            "package_name": package_name,
            "amount": f"{amount:.2f}",
            "expires_at": expires_at
        }
        return await self.send_email(user_email, "premium_activated", context)
    
    async def send_renewal_reminder(self, user_email: str, business_name: str, days_left: int, expires_at: str):
        """Send renewal reminder email"""
        context = {
            "business_name": business_name,
            "days_left": days_left,
            "expires_at": expires_at,
            "renew_url": f"{self.base_url}/business/edit"
        }
        return await self.send_email(user_email, "renewal_reminder", context)
    
    async def send_renewal_success(self, user_email: str, business_name: str, package_name: str, amount: float, expires_at: str, invoice_id: str):
        """Send renewal success email"""
        context = {
            "business_name": business_name,
            "package_name": package_name,
            "amount": f"{amount:.2f}",
            "expires_at": expires_at,
            "invoice_url": f"{self.base_url}/invoices/{invoice_id}"
        }
        return await self.send_email(user_email, "renewal_success", context)
    
    async def send_payment_failed(self, user_email: str, business_name: str, expires_at: str):
        """Send payment failed email"""
        context = {
            "business_name": business_name,
            "expires_at": expires_at,
            "update_payment_url": f"{self.base_url}/business/edit"
        }
        return await self.send_email(user_email, "payment_failed", context)
    
    async def send_subscription_expired(self, user_email: str, business_name: str):
        """Send subscription expired email"""
        context = {
            "business_name": business_name,
            "renew_url": f"{self.base_url}/business/edit"
        }
        return await self.send_email(user_email, "subscription_expired", context)
    
    async def send_profile_verified(self, user_email: str, business_name: str, profile_identifier: str):
        """Send business profile verified email (admin-initiated)"""
        context = {
            "business_name": business_name,
            "profile_url": f"{self.base_url}/business/{profile_identifier}"
        }
        return await self.send_email(user_email, "profile_verified", context)
    
    async def send_profile_verification_rejected(self, user_email: str, business_name: str, rejection_reason: str):
        """Send business profile verification rejected email"""
        context = {
            "business_name": business_name,
            "rejection_reason": rejection_reason or "Please ensure your profile has complete and accurate information.",
            "edit_profile_url": f"{self.base_url}/business/edit"
        }
        return await self.send_email(user_email, "profile_verification_rejected", context)
    
    async def send_admin_premium_upgrade(self, user_email: str, business_name: str, profile_identifier: str, expires_at: str):
        """Send admin-initiated premium upgrade email"""
        context = {
            "business_name": business_name,
            "expires_at": expires_at,
            "profile_url": f"{self.base_url}/business/{profile_identifier}"
        }
        return await self.send_email(user_email, "admin_premium_upgrade", context)


class AutoRenewalService:
    """Service for handling automatic subscription renewals"""
    
    def __init__(self, db, email_service: SubscriptionEmailService):
        self.db = db
        self.email_service = email_service
    
    async def check_expiring_subscriptions(self):
        """Check for subscriptions expiring soon and send reminders"""
        now = datetime.now(timezone.utc)
        
        # Find profiles expiring in 7 days
        reminder_7_days = now + timedelta(days=7)
        expiring_7d = await self.db.business_profiles.find({
            "is_premium": True,
            "premium_expires_at": {
                "$gte": now,
                "$lte": reminder_7_days
            },
            "renewal_reminder_7d_sent": {"$ne": True}
        }).to_list(length=100)
        
        for profile in expiring_7d:
            user = await self.db.users.find_one({"user_id": profile["user_id"]})
            if user and user.get("email"):
                expires_at = profile["premium_expires_at"]
                days_left = (expires_at - now).days
                await self.email_service.send_renewal_reminder(
                    user["email"],
                    profile["business_name"],
                    days_left,
                    expires_at.strftime("%Y-%m-%d")
                )
                await self.db.business_profiles.update_one(
                    {"id": profile["id"]},
                    {"$set": {"renewal_reminder_7d_sent": True}}
                )
        
        # Find profiles expiring in 3 days
        reminder_3_days = now + timedelta(days=3)
        expiring_3d = await self.db.business_profiles.find({
            "is_premium": True,
            "premium_expires_at": {
                "$gte": now,
                "$lte": reminder_3_days
            },
            "renewal_reminder_3d_sent": {"$ne": True}
        }).to_list(length=100)
        
        for profile in expiring_3d:
            user = await self.db.users.find_one({"user_id": profile["user_id"]})
            if user and user.get("email"):
                expires_at = profile["premium_expires_at"]
                days_left = (expires_at - now).days
                await self.email_service.send_renewal_reminder(
                    user["email"],
                    profile["business_name"],
                    days_left,
                    expires_at.strftime("%Y-%m-%d")
                )
                await self.db.business_profiles.update_one(
                    {"id": profile["id"]},
                    {"$set": {"renewal_reminder_3d_sent": True}}
                )
        
        # Find profiles expiring in 1 day (last warning)
        reminder_1_day = now + timedelta(days=1)
        expiring_1d = await self.db.business_profiles.find({
            "is_premium": True,
            "premium_expires_at": {
                "$gte": now,
                "$lte": reminder_1_day
            },
            "renewal_reminder_1d_sent": {"$ne": True}
        }).to_list(length=100)
        
        for profile in expiring_1d:
            user = await self.db.users.find_one({"user_id": profile["user_id"]})
            if user and user.get("email"):
                await self.email_service.send_renewal_reminder(
                    user["email"],
                    profile["business_name"],
                    1,
                    profile["premium_expires_at"].strftime("%Y-%m-%d")
                )
                await self.db.business_profiles.update_one(
                    {"id": profile["id"]},
                    {"$set": {"renewal_reminder_1d_sent": True}}
                )
        
        logger.info(f"Renewal check: 7d={len(expiring_7d)}, 3d={len(expiring_3d)}, 1d={len(expiring_1d)}")
        return {
            "reminders_sent_7d": len(expiring_7d),
            "reminders_sent_3d": len(expiring_3d),
            "reminders_sent_1d": len(expiring_1d)
        }
    
    async def process_expired_subscriptions(self):
        """Process expired subscriptions and downgrade profiles"""
        now = datetime.now(timezone.utc)
        
        # Find expired premium profiles
        expired = await self.db.business_profiles.find({
            "is_premium": True,
            "premium_expires_at": {"$lt": now}
        }).to_list(length=100)
        
        for profile in expired:
            # Downgrade to verified
            await self.db.business_profiles.update_one(
                {"id": profile["id"]},
                {"$set": {
                    "is_premium": False,
                    "verification_tier": "verified" if profile.get("is_verified") else "none",
                    "premium_expired_at": now,
                    "renewal_reminder_7d_sent": False,
                    "renewal_reminder_3d_sent": False,
                    "renewal_reminder_1d_sent": False,
                    "updated_at": now
                }}
            )
            
            # Send expiration email
            user = await self.db.users.find_one({"user_id": profile["user_id"]})
            if user and user.get("email"):
                await self.email_service.send_subscription_expired(
                    user["email"],
                    profile["business_name"]
                )
            
            # Create notification
            await self.db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": profile["user_id"],
                "type": "premium_expired",
                "title": "Premium Expired",
                "message": "Your Premium Verified Business subscription has expired. Renew to regain premium benefits.",
                "is_read": False,
                "created_at": now
            })
        
        logger.info(f"Processed {len(expired)} expired subscriptions")
        return {"expired_count": len(expired)}
    
    async def attempt_auto_renewal(self, profile_id: str):
        """Attempt to auto-renew a subscription using saved payment method"""
        # Note: This would integrate with Stripe's subscription system
        # For now, we just mark it for manual renewal
        profile = await self.db.business_profiles.find_one({"id": profile_id})
        if not profile:
            return {"success": False, "error": "Profile not found"}
        
        # Check if auto-renewal is enabled and payment method saved
        if not profile.get("auto_renewal_enabled"):
            return {"success": False, "error": "Auto-renewal not enabled"}
        
        # TODO: Implement actual Stripe subscription renewal
        # This would use Stripe's saved payment methods
        
        return {"success": False, "error": "Auto-renewal requires Stripe subscription setup"}


class InvoiceService:
    """Service for generating invoices and receipts"""
    
    def __init__(self, db):
        self.db = db
    
    async def create_invoice(self, transaction_id: str) -> Dict:
        """Create an invoice for a payment transaction"""
        transaction = await self.db.payment_transactions.find_one({"id": transaction_id})
        if not transaction:
            return None
        
        # Get user and profile info
        user = await self.db.users.find_one({"user_id": transaction["user_id"]})
        profile = await self.db.business_profiles.find_one({"id": transaction["business_profile_id"]})
        
        now = datetime.now(timezone.utc)
        invoice_number = f"INV-{now.strftime('%Y%m')}-{str(uuid.uuid4())[:8].upper()}"
        
        invoice = {
            "id": str(uuid.uuid4()),
            "invoice_number": invoice_number,
            "transaction_id": transaction_id,
            "user_id": transaction["user_id"],
            "business_profile_id": transaction["business_profile_id"],
            
            # Billing info
            "billing_name": profile.get("business_name") if profile else user.get("name"),
            "billing_email": user.get("email") if user else None,
            "billing_address": profile.get("address") if profile else None,
            "billing_city": profile.get("city") if profile else None,
            "billing_country": profile.get("country") if profile else None,
            
            # Invoice details
            "items": [{
                "description": f"Premium Verified Business - {transaction.get('package_id', 'Monthly').title()}",
                "quantity": 1,
                "unit_price": transaction["amount"],
                "total": transaction["amount"]
            }],
            "subtotal": transaction["amount"],
            "tax": 0,  # Add tax calculation if needed
            "total": transaction["amount"],
            "currency": transaction["currency"].upper(),
            
            # Payment info
            "payment_method": transaction["payment_method"],
            "payment_status": "paid",
            "paid_at": transaction.get("paid_at") or now,
            
            # Dates
            "invoice_date": now,
            "created_at": now
        }
        
        await self.db.invoices.insert_one(invoice)
        
        # Update transaction with invoice reference
        await self.db.payment_transactions.update_one(
            {"id": transaction_id},
            {"$set": {"invoice_id": invoice["id"]}}
        )
        
        logger.info(f"Created invoice {invoice_number} for transaction {transaction_id}")
        return invoice
    
    async def get_invoice(self, invoice_id: str) -> Dict:
        """Get an invoice by ID"""
        return await self.db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    
    async def get_user_invoices(self, user_id: str, limit: int = 20) -> List[Dict]:
        """Get all invoices for a user"""
        invoices = await self.db.invoices.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(length=limit)
        return invoices
    
    def generate_invoice_html(self, invoice: Dict) -> str:
        """Generate HTML representation of an invoice"""
        return f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; }}
        .header {{ display: flex; justify-content: space-between; margin-bottom: 40px; }}
        .logo {{ font-size: 24px; font-weight: bold; color: #2E7D32; }}
        .invoice-title {{ font-size: 32px; color: #333; }}
        .invoice-number {{ color: #666; }}
        .section {{ margin-bottom: 30px; }}
        .section-title {{ font-size: 14px; color: #666; margin-bottom: 8px; text-transform: uppercase; }}
        table {{ width: 100%; border-collapse: collapse; }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #eee; }}
        th {{ background: #f5f5f5; }}
        .total-row {{ font-weight: bold; font-size: 18px; }}
        .total-row td {{ border-top: 2px solid #333; }}
        .paid-badge {{ background: #4CAF50; color: white; padding: 6px 12px; border-radius: 4px; font-size: 12px; }}
        .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="logo">Avida Marketplace</div>
            <div style="color: #666; margin-top: 8px;">Premium Business Services</div>
        </div>
        <div style="text-align: right;">
            <div class="invoice-title">INVOICE</div>
            <div class="invoice-number">{invoice['invoice_number']}</div>
            <div style="margin-top: 8px;"><span class="paid-badge">PAID</span></div>
        </div>
    </div>
    
    <div style="display: flex; gap: 60px;">
        <div class="section" style="flex: 1;">
            <div class="section-title">Bill To</div>
            <div style="font-weight: bold;">{invoice.get('billing_name', 'N/A')}</div>
            <div>{invoice.get('billing_email', '')}</div>
            <div>{invoice.get('billing_address', '')}</div>
            <div>{invoice.get('billing_city', '')} {invoice.get('billing_country', '')}</div>
        </div>
        <div class="section" style="flex: 1;">
            <div class="section-title">Invoice Details</div>
            <div><strong>Date:</strong> {invoice['invoice_date'].strftime('%B %d, %Y') if isinstance(invoice['invoice_date'], datetime) else invoice['invoice_date']}</div>
            <div><strong>Payment Method:</strong> {invoice['payment_method'].title()}</div>
        </div>
    </div>
    
    <div class="section">
        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th style="text-align: right;">Qty</th>
                    <th style="text-align: right;">Price</th>
                    <th style="text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                {''.join([f'''
                <tr>
                    <td>{item['description']}</td>
                    <td style="text-align: right;">{item['quantity']}</td>
                    <td style="text-align: right;">${item['unit_price']:.2f}</td>
                    <td style="text-align: right;">${item['total']:.2f}</td>
                </tr>
                ''' for item in invoice['items']])}
                <tr class="total-row">
                    <td colspan="3" style="text-align: right;">Total</td>
                    <td style="text-align: right;">${invoice['total']:.2f} {invoice['currency']}</td>
                </tr>
            </tbody>
        </table>
    </div>
    
    <div class="footer">
        <p>Thank you for your business!</p>
        <p>For questions about this invoice, please contact support@avidamarketplace.com</p>
    </div>
</body>
</html>
"""
