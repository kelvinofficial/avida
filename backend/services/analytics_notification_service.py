"""
Analytics Notification Service
- Weekly email digests for sellers
- SMS alerts for high-value traffic spikes
"""

import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)


class AnalyticsNotificationService:
    """Service for sending analytics notifications via email and SMS"""
    
    def __init__(self, db, email_service=None, sms_service=None):
        self.db = db
        self.email_service = email_service
        self.sms_service = sms_service
    
    # =========================================================================
    # WEEKLY EMAIL DIGEST
    # =========================================================================
    
    async def generate_seller_digest(self, user_id: str, period_days: int = 7) -> Dict[str, Any]:
        """Generate weekly digest data for a seller"""
        now = datetime.now(timezone.utc)
        start_date = (now - timedelta(days=period_days)).isoformat()
        prev_start = (now - timedelta(days=period_days * 2)).isoformat()
        prev_end = start_date
        
        # Get seller info
        user = await self.db.users.find_one(
            {"user_id": user_id},
            {"_id": 0, "name": 1, "email": 1}
        )
        
        if not user:
            return None
        
        # Get seller's listings
        listings = await self.db.listings.find(
            {"user_id": user_id},
            {"id": 1, "title": 1, "price": 1, "status": 1}
        ).to_list(1000)
        
        listing_ids = [l["id"] for l in listings]
        
        if not listing_ids:
            return {
                "user": user,
                "has_listings": False,
                "period_days": period_days
            }
        
        # Current period metrics
        current_views = await self.db.analytics_events.count_documents({
            "listing_id": {"$in": listing_ids},
            "event_type": "view",
            "timestamp": {"$gte": start_date}
        })
        
        current_saves = await self.db.analytics_events.count_documents({
            "listing_id": {"$in": listing_ids},
            "event_type": "save",
            "timestamp": {"$gte": start_date}
        })
        
        current_chats = await self.db.analytics_events.count_documents({
            "listing_id": {"$in": listing_ids},
            "event_type": "chat_start",
            "timestamp": {"$gte": start_date}
        })
        
        current_sales = await self.db.analytics_events.count_documents({
            "listing_id": {"$in": listing_ids},
            "event_type": "purchase",
            "timestamp": {"$gte": start_date}
        })
        
        # Previous period metrics for comparison
        prev_views = await self.db.analytics_events.count_documents({
            "listing_id": {"$in": listing_ids},
            "event_type": "view",
            "timestamp": {"$gte": prev_start, "$lt": prev_end}
        })
        
        # Get top performing listing
        top_listing_pipeline = [
            {
                "$match": {
                    "listing_id": {"$in": listing_ids},
                    "event_type": "view",
                    "timestamp": {"$gte": start_date}
                }
            },
            {
                "$group": {
                    "_id": "$listing_id",
                    "views": {"$sum": 1}
                }
            },
            {"$sort": {"views": -1}},
            {"$limit": 1}
        ]
        
        top_listing_result = await self.db.analytics_events.aggregate(top_listing_pipeline).to_list(1)
        
        top_listing = None
        if top_listing_result:
            listing_doc = await self.db.listings.find_one(
                {"id": top_listing_result[0]["_id"]},
                {"_id": 0, "title": 1, "price": 1}
            )
            if listing_doc:
                top_listing = {
                    "id": top_listing_result[0]["_id"],
                    "title": listing_doc.get("title", ""),
                    "views": top_listing_result[0]["views"]
                }
        
        # Get new badges earned
        new_badges = await self.db.user_badges.find({
            "user_id": user_id,
            "awarded_at": {"$gte": start_date}
        }, {"_id": 0, "badge_name": 1}).to_list(10)
        
        # Calculate change percentages
        view_change = 0
        if prev_views > 0:
            view_change = round((current_views - prev_views) / prev_views * 100, 1)
        elif current_views > 0:
            view_change = 100
        
        return {
            "user": user,
            "has_listings": True,
            "period_days": period_days,
            "metrics": {
                "views": current_views,
                "saves": current_saves,
                "chats": current_chats,
                "sales": current_sales,
                "view_change_percent": view_change,
                "view_trend": "up" if view_change > 0 else ("down" if view_change < 0 else "stable")
            },
            "listings_count": len(listings),
            "active_listings": len([l for l in listings if l.get("status") == "active"]),
            "top_listing": top_listing,
            "new_badges": [b["badge_name"] for b in new_badges],
            "generated_at": now.isoformat()
        }
    
    def build_digest_email_html(self, digest: Dict[str, Any]) -> str:
        """Build HTML email content for weekly digest"""
        user_name = digest["user"].get("name", "Seller")
        metrics = digest["metrics"]
        
        # Trend indicator
        trend_icon = "📈" if metrics["view_trend"] == "up" else ("📉" if metrics["view_trend"] == "down" else "➡️")
        trend_color = "#4CAF50" if metrics["view_trend"] == "up" else ("#F44336" if metrics["view_trend"] == "down" else "#9E9E9E")
        
        # Top listing section
        top_listing_html = ""
        if digest.get("top_listing"):
            top = digest["top_listing"]
            top_listing_html = f'''
            <div style="background-color: #E3F2FD; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h4 style="margin: 0 0 8px 0; color: #1565C0;">🏆 Top Performing Listing</h4>
                <p style="margin: 0; font-weight: 600;">{top["title"][:50]}</p>
                <p style="margin: 4px 0 0 0; color: #666;">{top["views"]} views this week</p>
            </div>
            '''
        
        # New badges section
        badges_html = ""
        if digest.get("new_badges"):
            badges = ", ".join(digest["new_badges"])
            badges_html = f'''
            <div style="background-color: #FFF3E0; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h4 style="margin: 0 0 8px 0; color: #E65100;">🎖️ New Badges Earned!</h4>
                <p style="margin: 0;">{badges}</p>
            </div>
            '''
        
        return f'''
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f5f5f5;">
                <tr>
                    <td style="padding: 40px 20px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            <!-- Header -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; text-align: center;">
                                    <h1 style="margin: 0; color: white; font-size: 28px;">📊 Your Weekly Digest</h1>
                                    <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Hi {user_name}! Here's how your listings performed.</p>
                                </td>
                            </tr>
                            
                            <!-- Metrics Grid -->
                            <tr>
                                <td style="padding: 32px;">
                                    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
                                        <tr>
                                            <td style="width: 50%; padding: 12px; text-align: center; background-color: #f8f9fa; border-radius: 8px;">
                                                <div style="font-size: 32px; font-weight: 700; color: #333;">{metrics["views"]}</div>
                                                <div style="color: #666; font-size: 14px;">Views</div>
                                                <div style="color: {trend_color}; font-size: 12px; margin-top: 4px;">
                                                    {trend_icon} {'+' if metrics["view_change_percent"] > 0 else ''}{metrics["view_change_percent"]}%
                                                </div>
                                            </td>
                                            <td style="width: 8px;"></td>
                                            <td style="width: 50%; padding: 12px; text-align: center; background-color: #f8f9fa; border-radius: 8px;">
                                                <div style="font-size: 32px; font-weight: 700; color: #333;">{metrics["saves"]}</div>
                                                <div style="color: #666; font-size: 14px;">Saves</div>
                                            </td>
                                        </tr>
                                        <tr><td colspan="3" style="height: 12px;"></td></tr>
                                        <tr>
                                            <td style="width: 50%; padding: 12px; text-align: center; background-color: #f8f9fa; border-radius: 8px;">
                                                <div style="font-size: 32px; font-weight: 700; color: #333;">{metrics["chats"]}</div>
                                                <div style="color: #666; font-size: 14px;">Chats Started</div>
                                            </td>
                                            <td style="width: 8px;"></td>
                                            <td style="width: 50%; padding: 12px; text-align: center; background-color: #f8f9fa; border-radius: 8px;">
                                                <div style="font-size: 32px; font-weight: 700; color: #333;">{metrics["sales"]}</div>
                                                <div style="color: #666; font-size: 14px;">Sales</div>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    {top_listing_html}
                                    {badges_html}
                                    
                                    <!-- CTA -->
                                    <div style="text-align: center; margin-top: 24px;">
                                        <a href="https://avida.app/seller/analytics" 
                                           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                                  color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; 
                                                  font-weight: 600; font-size: 16px;">
                                            View Full Analytics
                                        </a>
                                    </div>
                                </td>
                            </tr>
                            
                            <!-- Tips -->
                            <tr>
                                <td style="padding: 0 32px 32px 32px;">
                                    <div style="background-color: #E8F5E9; padding: 16px; border-radius: 8px;">
                                        <h4 style="margin: 0 0 8px 0; color: #2E7D32;">💡 Quick Tips</h4>
                                        <ul style="margin: 0; padding-left: 20px; color: #333; line-height: 1.6;">
                                            <li>Add more photos to boost views by up to 3x</li>
                                            <li>Respond to inquiries within 1 hour for better conversion</li>
                                            <li>Consider boosting your top listing for more visibility</li>
                                        </ul>
                                    </div>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="background-color: #f5f5f5; padding: 24px; text-align: center;">
                                    <p style="margin: 0 0 8px 0; color: #757575; font-size: 14px;">
                                        You received this because weekly digests are enabled.
                                    </p>
                                    <p style="margin: 0; color: #9e9e9e; font-size: 12px;">
                                        <a href="https://avida.app/settings/notifications" style="color: #667eea; text-decoration: none;">
                                            Manage notification preferences
                                        </a>
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        '''
    
    async def send_weekly_digest(self, user_id: str) -> Dict[str, Any]:
        """Send weekly digest email to a seller"""
        digest = await self.generate_seller_digest(user_id, period_days=7)
        
        if not digest:
            return {"success": False, "reason": "User not found"}
        
        if not digest.get("has_listings"):
            return {"success": False, "reason": "No listings"}
        
        # Check if user has email notifications enabled
        settings = await self.db.seller_analytics_settings.find_one({"user_id": user_id})
        if settings and not settings.get("weekly_summary_enabled", True):
            return {"success": False, "reason": "Weekly digest disabled by user"}
        
        if settings and not settings.get("email_notifications_enabled", False):
            return {"success": False, "reason": "Email notifications disabled by user"}
        
        email = digest["user"].get("email")
        if not email:
            return {"success": False, "reason": "No email address"}
        
        # Build and send email
        html_content = self.build_digest_email_html(digest)
        subject = f"📊 Your Weekly Seller Report - {digest['metrics']['views']} views this week!"
        
        if self.email_service:
            try:
                result = await self.email_service.send_email(
                    to_email=email,
                    subject=subject,
                    html_content=html_content
                )
                
                # Log the digest
                await self.db.digest_history.insert_one({
                    "id": f"digest_{uuid.uuid4().hex[:12]}",
                    "user_id": user_id,
                    "email": email,
                    "type": "weekly",
                    "metrics": digest["metrics"],
                    "sent_at": datetime.now(timezone.utc).isoformat(),
                    "status": "sent" if result else "failed"
                })
                
                return {"success": result, "email": email}
            except Exception as e:
                logger.error(f"Failed to send digest: {e}")
                return {"success": False, "reason": str(e)}
        else:
            logger.info(f"Email service not available. Digest would be sent to {email}")
            return {"success": False, "reason": "Email service not configured"}
    
    # =========================================================================
    # SMS ALERTS FOR HIGH-VALUE SPIKES
    # =========================================================================
    
    async def send_spike_sms_alert(
        self,
        user_id: str,
        listing_id: str,
        listing_title: str,
        views: int,
        increase_percent: float
    ) -> Dict[str, Any]:
        """Send SMS alert for high-value traffic spike"""
        
        # Check if user has SMS alerts enabled and phone number
        user = await self.db.users.find_one(
            {"user_id": user_id},
            {"_id": 0, "name": 1, "phone": 1}
        )
        
        if not user or not user.get("phone"):
            return {"success": False, "reason": "No phone number"}
        
        # Check user settings
        settings = await self.db.seller_analytics_settings.find_one({"user_id": user_id})
        
        # Check if SMS alerts are enabled (default: disabled for cost reasons)
        if not settings or not settings.get("sms_spike_alerts_enabled", False):
            return {"success": False, "reason": "SMS alerts not enabled"}
        
        # Check minimum threshold for SMS (only send for significant spikes)
        min_views_for_sms = settings.get("min_views_for_sms_alert", 50)
        min_increase_for_sms = settings.get("min_increase_for_sms_alert", 100)  # 100% increase
        
        if views < min_views_for_sms or increase_percent < min_increase_for_sms:
            return {"success": False, "reason": "Below SMS threshold"}
        
        # Build SMS message (keep under 160 chars for single SMS)
        user_name = user.get("name", "").split()[0][:10]  # First name, max 10 chars
        title_short = listing_title[:20]
        
        message = (
            f"🔥 {user_name}! Your listing '{title_short}' is trending!\n"
            f"{views} views (+{int(increase_percent)}%)\n"
            f"Check avida.app now!"
        )
        
        if self.sms_service and self.sms_service.initialized:
            try:
                result = await self.sms_service.send_sms(
                    phone=user["phone"],
                    message=message,
                    order_id=f"spike_{listing_id[:8]}",
                    notification_type="traffic_spike"
                )
                
                # Log the SMS alert
                await self.db.sms_spike_alerts.insert_one({
                    "id": f"sms_spike_{uuid.uuid4().hex[:12]}",
                    "user_id": user_id,
                    "listing_id": listing_id,
                    "phone": user["phone"],
                    "views": views,
                    "increase_percent": increase_percent,
                    "message": message,
                    "sent_at": datetime.now(timezone.utc).isoformat(),
                    "status": "sent" if result.get("success") else "failed",
                    "error": result.get("reason") if not result.get("success") else None
                })
                
                return result
            except Exception as e:
                logger.error(f"Failed to send spike SMS: {e}")
                return {"success": False, "reason": str(e)}
        else:
            logger.info(f"SMS not available. Alert would be sent to {user['phone']}: {message}")
            return {"success": False, "reason": "SMS service not configured"}
    
    async def check_and_send_spike_alerts(self) -> Dict[str, Any]:
        """Check for high-value spikes and send SMS alerts"""
        now = datetime.now(timezone.utc)
        lookback_start = (now - timedelta(hours=6)).isoformat()  # Check last 6 hours
        
        # Get recent spikes that haven't had SMS sent
        spikes = await self.db.engagement_notifications.find({
            "type": "spike",
            "detected_at": {"$gte": lookback_start},
            "sms_sent": {"$ne": True}
        }).to_list(100)
        
        alerts_sent = 0
        alerts_skipped = 0
        
        for spike in spikes:
            # Only send SMS for high-value spikes (100%+ increase and 50+ views)
            if spike.get("increase_percent", 0) >= 100 and spike.get("recent_views", 0) >= 50:
                result = await self.send_spike_sms_alert(
                    user_id=spike.get("user_id"),
                    listing_id=spike.get("listing_id"),
                    listing_title=spike.get("listing_title", ""),
                    views=spike.get("recent_views", 0),
                    increase_percent=spike.get("increase_percent", 0)
                )
                
                # Mark as SMS processed
                await self.db.engagement_notifications.update_one(
                    {"id": spike["id"]},
                    {"$set": {
                        "sms_sent": True,
                        "sms_result": result.get("success", False),
                        "sms_processed_at": now.isoformat()
                    }}
                )
                
                if result.get("success"):
                    alerts_sent += 1
                else:
                    alerts_skipped += 1
            else:
                alerts_skipped += 1
        
        return {
            "spikes_checked": len(spikes),
            "alerts_sent": alerts_sent,
            "alerts_skipped": alerts_skipped
        }


# Singleton factory
_notification_service = None

def get_analytics_notification_service(db, email_service=None, sms_service=None):
    """Get or create analytics notification service singleton"""
    global _notification_service
    if _notification_service is None:
        _notification_service = AnalyticsNotificationService(db, email_service, sms_service)
    return _notification_service
