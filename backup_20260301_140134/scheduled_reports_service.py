"""
Scheduled Reports Service
Generates and sends periodic analytics reports to admins based on configured settings.
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional
import os

logger = logging.getLogger(__name__)

# SendGrid imports
try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail, Email, To, Content, HtmlContent
    SENDGRID_AVAILABLE = True
except ImportError:
    SENDGRID_AVAILABLE = False
    logger.warning("SendGrid not available. Email reports disabled.")


class ScheduledReportsService:
    """Service for generating and sending scheduled analytics reports."""
    
    def __init__(self, db):
        self.db = db
        self.sendgrid_api_key = os.environ.get("SENDGRID_API_KEY")
        self.from_email = os.environ.get("SENDGRID_FROM_EMAIL", "noreply@marketplace.com")
        self.from_name = os.environ.get("SENDGRID_FROM_NAME", "Marketplace Analytics")
    
    async def get_report_settings(self) -> Dict[str, Any]:
        """Get report configuration settings."""
        settings = await self.db.admin_settings.find_one(
            {"type": "scheduled_reports"},
            {"_id": 0}
        )
        if not settings:
            # Default settings
            return {
                "enabled": True,
                "frequency": "weekly",  # daily, weekly, monthly
                "day_of_week": 1,  # Monday (0=Sunday, 1=Monday, etc.)
                "hour": 9,  # 9 AM UTC
                "admin_emails": [],
                "include_seller_analytics": True,
                "include_engagement_metrics": True,
                "include_platform_overview": True,
                "include_alerts": True
            }
        return settings
    
    async def save_report_settings(self, settings: Dict[str, Any], updated_by: str) -> bool:
        """Save report configuration settings."""
        try:
            await self.db.admin_settings.update_one(
                {"type": "scheduled_reports"},
                {"$set": {
                    "type": "scheduled_reports",
                    **settings,
                    "updated_at": datetime.now(timezone.utc),
                    "updated_by": updated_by
                }},
                upsert=True
            )
            return True
        except Exception as e:
            logger.error(f"Error saving report settings: {e}")
            return False
    
    async def get_seller_analytics_settings(self) -> Dict[str, Any]:
        """Get seller analytics threshold settings."""
        settings = await self.db.admin_settings.find_one(
            {"type": "seller_analytics"},
            {"_id": 0}
        )
        return settings or {"alert_threshold": 100, "low_performance_threshold": 5}
    
    async def get_engagement_settings(self) -> Dict[str, Any]:
        """Get engagement notification settings."""
        settings = await self.db.admin_settings.find_one(
            {"type": "engagement_notifications"},
            {"_id": 0}
        )
        return settings or {
            "milestones": {"firstSale": True, "tenListings": True, "hundredMessages": True, "badgeMilestone": True},
            "triggers": {"inactiveSeller": True, "lowEngagement": True, "challengeReminder": True, "weeklyDigest": True}
        }
    
    async def generate_platform_overview(self) -> Dict[str, Any]:
        """Generate platform overview statistics."""
        now = datetime.now(timezone.utc)
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        
        # User stats
        total_users = await self.db.users.count_documents({})
        new_users_week = await self.db.users.count_documents({"created_at": {"$gte": week_ago}})
        new_users_month = await self.db.users.count_documents({"created_at": {"$gte": month_ago}})
        
        # Listing stats
        total_listings = await self.db.listings.count_documents({"status": {"$ne": "deleted"}})
        active_listings = await self.db.listings.count_documents({"status": "active"})
        new_listings_week = await self.db.listings.count_documents({
            "created_at": {"$gte": week_ago},
            "status": {"$ne": "deleted"}
        })
        sold_listings_week = await self.db.listings.count_documents({
            "status": "sold",
            "updated_at": {"$gte": week_ago}
        })
        
        # Revenue calculation
        total_revenue = 0
        weekly_revenue = 0
        
        async for listing in self.db.listings.find({"status": "sold"}, {"price": 1, "updated_at": 1, "_id": 0}):
            price = listing.get("price", 0)
            total_revenue += price
            updated_at = listing.get("updated_at")
            if updated_at:
                # Handle both naive and aware datetimes
                if updated_at.tzinfo is None:
                    updated_at = updated_at.replace(tzinfo=timezone.utc)
                if updated_at >= week_ago:
                    weekly_revenue += price
        
        return {
            "total_users": total_users,
            "new_users_week": new_users_week,
            "new_users_month": new_users_month,
            "user_growth_rate": round((new_users_week / max(total_users - new_users_week, 1)) * 100, 2),
            "total_listings": total_listings,
            "active_listings": active_listings,
            "new_listings_week": new_listings_week,
            "sold_listings_week": sold_listings_week,
            "total_revenue": total_revenue,
            "weekly_revenue": weekly_revenue
        }
    
    async def generate_seller_analytics(self, settings: Dict[str, Any]) -> Dict[str, Any]:
        """Generate seller analytics with alerts based on thresholds."""
        alert_threshold = settings.get("alert_threshold", 100)
        low_performance_days = settings.get("low_performance_threshold", 5)
        
        now = datetime.now(timezone.utc)
        inactive_threshold = now - timedelta(days=low_performance_days)
        week_ago = now - timedelta(days=7)
        
        # Top sellers by revenue this week
        top_sellers_pipeline = [
            {"$match": {"status": "sold", "updated_at": {"$gte": week_ago}}},
            {"$group": {
                "_id": "$user_id",
                "revenue": {"$sum": "$price"},
                "sales_count": {"$sum": 1}
            }},
            {"$sort": {"revenue": -1}},
            {"$limit": 10}
        ]
        
        top_sellers = []
        async for seller in self.db.listings.aggregate(top_sellers_pipeline):
            user = await self.db.users.find_one({"user_id": seller["_id"]}, {"_id": 0, "name": 1, "email": 1})
            top_sellers.append({
                "user_id": seller["_id"],
                "name": user.get("name", "Unknown") if user else "Unknown",
                "email": user.get("email", "") if user else "",
                "revenue": seller["revenue"],
                "sales_count": seller["sales_count"]
            })
        
        # Low performing sellers (active listings but no activity)
        low_performing_sellers = []
        
        # Find users with active listings who haven't had activity
        active_seller_ids = await self.db.listings.distinct("user_id", {"status": "active"})
        
        for user_id in active_seller_ids[:50]:  # Limit to prevent timeout
            user = await self.db.users.find_one({"user_id": user_id}, {"_id": 0, "name": 1, "email": 1, "last_login": 1})
            if user:
                last_login = user.get("last_login")
                if last_login:
                    # Handle both naive and aware datetimes
                    if last_login.tzinfo is None:
                        last_login = last_login.replace(tzinfo=timezone.utc)
                    if last_login < inactive_threshold:
                        listing_count = await self.db.listings.count_documents({"user_id": user_id, "status": "active"})
                        days_inactive = (now - last_login).days
                        low_performing_sellers.append({
                            "user_id": user_id,
                            "name": user.get("name", "Unknown"),
                            "email": user.get("email", ""),
                            "days_inactive": days_inactive,
                            "active_listings": listing_count
                        })
        
        # Revenue alerts (sellers whose revenue dropped below threshold)
        revenue_alerts = []
        
        # Get sellers with some revenue this month but below threshold
        month_ago = now - timedelta(days=30)
        revenue_pipeline = [
            {"$match": {"status": "sold", "updated_at": {"$gte": month_ago}}},
            {"$group": {
                "_id": "$user_id",
                "monthly_revenue": {"$sum": "$price"}
            }},
            {"$match": {"monthly_revenue": {"$lt": alert_threshold, "$gt": 0}}},
            {"$sort": {"monthly_revenue": 1}},
            {"$limit": 10}
        ]
        
        async for seller in self.db.listings.aggregate(revenue_pipeline):
            user = await self.db.users.find_one({"user_id": seller["_id"]}, {"_id": 0, "name": 1, "email": 1})
            revenue_alerts.append({
                "user_id": seller["_id"],
                "name": user.get("name", "Unknown") if user else "Unknown",
                "email": user.get("email", "") if user else "",
                "monthly_revenue": seller["monthly_revenue"],
                "threshold": alert_threshold
            })
        
        return {
            "top_sellers": top_sellers,
            "low_performing_sellers": low_performing_sellers[:10],
            "revenue_alerts": revenue_alerts,
            "total_active_sellers": len(active_seller_ids),
            "alert_threshold": alert_threshold,
            "low_performance_threshold": low_performance_days
        }
    
    async def generate_engagement_metrics(self, settings: Dict[str, Any]) -> Dict[str, Any]:
        """Generate engagement metrics."""
        now = datetime.now(timezone.utc)
        week_ago = now - timedelta(days=7)
        
        # Get collection names to check existence
        collections = await self.db.list_collection_names()
        
        # Message stats
        total_messages = await self.db.messages.count_documents({}) if "messages" in collections else 0
        messages_week = await self.db.messages.count_documents({
            "created_at": {"$gte": week_ago}
        }) if "messages" in collections else 0
        
        # Favorites
        total_favorites = await self.db.favorites.count_documents({}) if "favorites" in collections else 0
        favorites_week = await self.db.favorites.count_documents({
            "created_at": {"$gte": week_ago}
        }) if "favorites" in collections else 0
        
        # Badge stats
        badges_awarded_week = await self.db.user_badges.count_documents({
            "awarded_at": {"$gte": week_ago}
        }) if "user_badges" in collections else 0
        
        # Challenge stats
        challenges_completed = await self.db.user_challenge_progress.count_documents({
            "completed": True,
            "completed_at": {"$gte": week_ago}
        }) if "user_challenge_progress" in collections else 0
        
        # Milestone achievements
        milestones_achieved = 0
        if settings.get("milestones", {}).get("firstSale"):
            # Count first sale achievements this week
            first_sales = await self.db.user_badges.count_documents({
                "badge_id": {"$regex": "first_sale", "$options": "i"},
                "awarded_at": {"$gte": week_ago}
            }) if "user_badges" in collections else 0
            milestones_achieved += first_sales
        
        return {
            "total_messages": total_messages,
            "messages_this_week": messages_week,
            "total_favorites": total_favorites,
            "favorites_this_week": favorites_week,
            "badges_awarded_this_week": badges_awarded_week,
            "challenges_completed_this_week": challenges_completed,
            "milestones_achieved": milestones_achieved
        }
    
    async def generate_full_report(self) -> Dict[str, Any]:
        """Generate a complete analytics report."""
        report_settings = await self.get_report_settings()
        seller_settings = await self.get_seller_analytics_settings()
        engagement_settings = await self.get_engagement_settings()
        
        report = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "period": "weekly",
            "sections": {}
        }
        
        if report_settings.get("include_platform_overview", True):
            report["sections"]["platform_overview"] = await self.generate_platform_overview()
        
        if report_settings.get("include_seller_analytics", True):
            report["sections"]["seller_analytics"] = await self.generate_seller_analytics(seller_settings)
        
        if report_settings.get("include_engagement_metrics", True):
            report["sections"]["engagement_metrics"] = await self.generate_engagement_metrics(engagement_settings)
        
        if report_settings.get("include_alerts", True):
            # Compile all alerts
            alerts = []
            seller_analytics = report["sections"].get("seller_analytics", {})
            
            for seller in seller_analytics.get("low_performing_sellers", []):
                alerts.append({
                    "type": "inactive_seller",
                    "severity": "warning",
                    "message": f"{seller['name']} has been inactive for {seller['days_inactive']} days with {seller['active_listings']} active listings"
                })
            
            for seller in seller_analytics.get("revenue_alerts", []):
                alerts.append({
                    "type": "low_revenue",
                    "severity": "info",
                    "message": f"{seller['name']} has only ${seller['monthly_revenue']:.2f} revenue this month (threshold: ${seller['threshold']})"
                })
            
            report["sections"]["alerts"] = {
                "total_alerts": len(alerts),
                "alerts": alerts
            }
        
        return report
    
    def format_report_html(self, report: Dict[str, Any]) -> str:
        """Format the report as HTML for email."""
        generated_at = report.get("generated_at", datetime.now(timezone.utc).isoformat())
        sections = report.get("sections", {})
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #2E7D32, #4CAF50); color: white; padding: 30px; border-radius: 12px; margin-bottom: 20px; }}
                .header h1 {{ margin: 0 0 10px 0; font-size: 28px; }}
                .header p {{ margin: 0; opacity: 0.9; }}
                .section {{ background: #fff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }}
                .section h2 {{ color: #2E7D32; margin-top: 0; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }}
                .stat-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin: 16px 0; }}
                .stat-card {{ background: #f8f9fa; padding: 16px; border-radius: 8px; text-align: center; }}
                .stat-value {{ font-size: 28px; font-weight: bold; color: #2E7D32; }}
                .stat-label {{ color: #666; font-size: 14px; }}
                .table {{ width: 100%; border-collapse: collapse; margin: 16px 0; }}
                .table th, .table td {{ padding: 12px; text-align: left; border-bottom: 1px solid #eee; }}
                .table th {{ background: #f8f9fa; font-weight: 600; }}
                .alert {{ padding: 12px 16px; border-radius: 8px; margin: 8px 0; }}
                .alert-warning {{ background: #FFF3E0; border-left: 4px solid #FF9800; }}
                .alert-info {{ background: #E3F2FD; border-left: 4px solid #2196F3; }}
                .alert-success {{ background: #E8F5E9; border-left: 4px solid #4CAF50; }}
                .badge {{ display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }}
                .badge-success {{ background: #E8F5E9; color: #2E7D32; }}
                .badge-warning {{ background: #FFF3E0; color: #E65100; }}
                .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Weekly Analytics Report</h1>
                <p>Generated: {generated_at[:10]}</p>
            </div>
        """
        
        # Platform Overview
        if "platform_overview" in sections:
            overview = sections["platform_overview"]
            html += f"""
            <div class="section">
                <h2>Platform Overview</h2>
                <div class="stat-grid">
                    <div class="stat-card">
                        <div class="stat-value">{overview.get('total_users', 0):,}</div>
                        <div class="stat-label">Total Users</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">+{overview.get('new_users_week', 0)}</div>
                        <div class="stat-label">New Users (7d)</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{overview.get('active_listings', 0):,}</div>
                        <div class="stat-label">Active Listings</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{overview.get('sold_listings_week', 0)}</div>
                        <div class="stat-label">Sales (7d)</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${overview.get('weekly_revenue', 0):,.2f}</div>
                        <div class="stat-label">Revenue (7d)</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{overview.get('user_growth_rate', 0)}%</div>
                        <div class="stat-label">Growth Rate</div>
                    </div>
                </div>
            </div>
            """
        
        # Seller Analytics
        if "seller_analytics" in sections:
            sellers = sections["seller_analytics"]
            html += """
            <div class="section">
                <h2>Seller Performance</h2>
            """
            
            # Top Sellers
            if sellers.get("top_sellers"):
                html += """
                <h3>Top Performers This Week</h3>
                <table class="table">
                    <tr><th>Seller</th><th>Sales</th><th>Revenue</th></tr>
                """
                for seller in sellers["top_sellers"][:5]:
                    html += f"""
                    <tr>
                        <td>{seller['name']}</td>
                        <td>{seller['sales_count']}</td>
                        <td>${seller['revenue']:,.2f}</td>
                    </tr>
                    """
                html += "</table>"
            
            # Low Performing Sellers
            if sellers.get("low_performing_sellers"):
                html += f"""
                <h3>Attention Needed <span class="badge badge-warning">{len(sellers['low_performing_sellers'])} sellers</span></h3>
                <table class="table">
                    <tr><th>Seller</th><th>Days Inactive</th><th>Active Listings</th></tr>
                """
                for seller in sellers["low_performing_sellers"][:5]:
                    html += f"""
                    <tr>
                        <td>{seller['name']}</td>
                        <td>{seller['days_inactive']} days</td>
                        <td>{seller['active_listings']}</td>
                    </tr>
                    """
                html += "</table>"
            
            html += "</div>"
        
        # Engagement Metrics
        if "engagement_metrics" in sections:
            engagement = sections["engagement_metrics"]
            html += f"""
            <div class="section">
                <h2>Engagement Metrics</h2>
                <div class="stat-grid">
                    <div class="stat-card">
                        <div class="stat-value">{engagement.get('messages_this_week', 0):,}</div>
                        <div class="stat-label">Messages (7d)</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{engagement.get('favorites_this_week', 0):,}</div>
                        <div class="stat-label">New Favorites (7d)</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{engagement.get('badges_awarded_this_week', 0)}</div>
                        <div class="stat-label">Badges Awarded</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{engagement.get('challenges_completed_this_week', 0)}</div>
                        <div class="stat-label">Challenges Completed</div>
                    </div>
                </div>
            </div>
            """
        
        # Alerts
        if "alerts" in sections and sections["alerts"].get("alerts"):
            alerts_section = sections["alerts"]
            html += f"""
            <div class="section">
                <h2>Alerts <span class="badge badge-warning">{alerts_section['total_alerts']} items</span></h2>
            """
            for alert in alerts_section["alerts"][:10]:
                alert_class = f"alert-{alert['severity']}"
                html += f"""
                <div class="alert {alert_class}">
                    {alert['message']}
                </div>
                """
            html += "</div>"
        
        html += """
            <div class="footer">
                <p>This is an automated report from your Marketplace Analytics system.</p>
                <p>To manage report settings, visit the Admin Dashboard.</p>
            </div>
        </body>
        </html>
        """
        
        return html
    
    async def send_report_email(self, report: Dict[str, Any], recipient_emails: List[str]) -> bool:
        """Send the report via email."""
        if not SENDGRID_AVAILABLE or not self.sendgrid_api_key:
            logger.warning("SendGrid not configured. Cannot send report email.")
            return False
        
        if not recipient_emails:
            logger.warning("No recipient emails configured for report.")
            return False
        
        try:
            html_content = self.format_report_html(report)
            
            sg = SendGridAPIClient(self.sendgrid_api_key)
            
            for email in recipient_emails:
                message = Mail(
                    from_email=Email(self.from_email, self.from_name),
                    to_emails=To(email),
                    subject=f"Weekly Analytics Report - {datetime.now(timezone.utc).strftime('%B %d, %Y')}",
                    html_content=HtmlContent(html_content)
                )
                
                response = sg.send(message)
                logger.info(f"Report email sent to {email}: {response.status_code}")
            
            return True
        except Exception as e:
            logger.error(f"Error sending report email: {e}")
            return False
    
    async def save_report_history(self, report: Dict[str, Any], sent_to: List[str], success: bool):
        """Save report to history for tracking."""
        try:
            await self.db.report_history.insert_one({
                "type": "weekly_analytics",
                "report": report,
                "sent_to": sent_to,
                "success": success,
                "created_at": datetime.now(timezone.utc)
            })
        except Exception as e:
            logger.error(f"Error saving report history: {e}")
    
    async def run_scheduled_report(self) -> Dict[str, Any]:
        """Run the scheduled report job."""
        logger.info("Running scheduled analytics report...")
        
        settings = await self.get_report_settings()
        
        if not settings.get("enabled", True):
            logger.info("Scheduled reports are disabled.")
            return {"status": "disabled"}
        
        admin_emails = settings.get("admin_emails", [])
        if not admin_emails:
            logger.warning("No admin emails configured for reports.")
            return {"status": "no_recipients"}
        
        # Generate the report
        report = await self.generate_full_report()
        
        # Send the email
        success = await self.send_report_email(report, admin_emails)
        
        # Save to history
        await self.save_report_history(report, admin_emails, success)
        
        return {
            "status": "sent" if success else "failed",
            "recipients": admin_emails,
            "report_id": str(report.get("generated_at"))
        }


# Singleton instance
_reports_service = None

def get_reports_service(db) -> ScheduledReportsService:
    """Get or create the reports service singleton."""
    global _reports_service
    if _reports_service is None:
        _reports_service = ScheduledReportsService(db)
    return _reports_service
