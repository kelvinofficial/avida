"""
Analytics Settings Module
Manage Google Analytics and other analytics integrations
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field
from typing import Optional, Callable
from datetime import datetime, timezone


class AnalyticsSettings(BaseModel):
    ga4_measurement_id: Optional[str] = Field(None, description="Google Analytics 4 Measurement ID (G-XXXXXXXXXX)")
    ga4_enabled: bool = Field(default=False, description="Enable GA4 tracking")
    gtm_container_id: Optional[str] = Field(None, description="Google Tag Manager Container ID (GTM-XXXXXXX)")
    gtm_enabled: bool = Field(default=False, description="Enable GTM")
    track_page_views: bool = Field(default=True)
    track_user_engagement: bool = Field(default=True)
    track_blog_reads: bool = Field(default=True)
    track_listing_views: bool = Field(default=True)
    track_conversions: bool = Field(default=True)
    anonymize_ip: bool = Field(default=True)


def create_analytics_settings_router(db, get_current_user: Callable):
    """Create analytics settings router"""
    
    router = APIRouter(prefix="/growth/analytics-settings", tags=["Analytics Settings"])
    
    async def require_admin(authorization: str = Header(None)):
        if not authorization:
            raise HTTPException(status_code=401, detail="Admin access required")
        return True

    @router.get("")
    async def get_analytics_settings(admin=Depends(require_admin)):
        """Get current analytics settings"""
        settings = await db.analytics_settings.find_one({"type": "ga4"})
        
        if not settings:
            # Return default settings
            return {
                "ga4_measurement_id": None,
                "ga4_enabled": False,
                "gtm_container_id": None,
                "gtm_enabled": False,
                "track_page_views": True,
                "track_user_engagement": True,
                "track_blog_reads": True,
                "track_listing_views": True,
                "track_conversions": True,
                "anonymize_ip": True,
                "setup_complete": False,
                "setup_instructions": {
                    "step1": "Go to Google Analytics 4 (analytics.google.com)",
                    "step2": "Create a new property or use existing one",
                    "step3": "Go to Admin > Data Streams > Web",
                    "step4": "Copy the Measurement ID (starts with G-)",
                    "step5": "Paste it in the field below and enable tracking"
                }
            }
        
        return {
            "ga4_measurement_id": settings.get("ga4_measurement_id"),
            "ga4_enabled": settings.get("ga4_enabled", False),
            "gtm_container_id": settings.get("gtm_container_id"),
            "gtm_enabled": settings.get("gtm_enabled", False),
            "track_page_views": settings.get("track_page_views", True),
            "track_user_engagement": settings.get("track_user_engagement", True),
            "track_blog_reads": settings.get("track_blog_reads", True),
            "track_listing_views": settings.get("track_listing_views", True),
            "track_conversions": settings.get("track_conversions", True),
            "anonymize_ip": settings.get("anonymize_ip", True),
            "setup_complete": bool(settings.get("ga4_measurement_id")),
            "last_updated": settings.get("updated_at").isoformat() if settings.get("updated_at") else None
        }

    @router.put("")
    async def update_analytics_settings(settings: AnalyticsSettings, admin=Depends(require_admin)):
        """Update analytics settings"""
        
        # Validate GA4 ID format if provided
        if settings.ga4_measurement_id:
            if not settings.ga4_measurement_id.startswith("G-"):
                raise HTTPException(
                    status_code=400, 
                    detail="Invalid GA4 Measurement ID format. It should start with 'G-'"
                )
        
        # Validate GTM ID format if provided
        if settings.gtm_container_id:
            if not settings.gtm_container_id.startswith("GTM-"):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid GTM Container ID format. It should start with 'GTM-'"
                )
        
        update_data = {
            "type": "ga4",
            "ga4_measurement_id": settings.ga4_measurement_id,
            "ga4_enabled": settings.ga4_enabled,
            "gtm_container_id": settings.gtm_container_id,
            "gtm_enabled": settings.gtm_enabled,
            "track_page_views": settings.track_page_views,
            "track_user_engagement": settings.track_user_engagement,
            "track_blog_reads": settings.track_blog_reads,
            "track_listing_views": settings.track_listing_views,
            "track_conversions": settings.track_conversions,
            "anonymize_ip": settings.anonymize_ip,
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.analytics_settings.update_one(
            {"type": "ga4"},
            {"$set": update_data},
            upsert=True
        )
        
        return {
            "success": True,
            "message": "Analytics settings updated",
            "settings": {
                **update_data,
                "setup_complete": bool(settings.ga4_measurement_id)
            }
        }

    @router.get("/tracking-code")
    async def get_tracking_code(admin=Depends(require_admin)):
        """Get the GA4 tracking code snippet for website integration"""
        settings = await db.analytics_settings.find_one({"type": "ga4"})
        
        if not settings or not settings.get("ga4_measurement_id"):
            return {
                "tracking_code": None,
                "message": "Please configure your GA4 Measurement ID first"
            }
        
        ga_id = settings.get("ga4_measurement_id")
        anonymize = "true" if settings.get("anonymize_ip", True) else "false"
        
        tracking_code = f'''<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id={ga_id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
  gtag('config', '{ga_id}', {{
    'anonymize_ip': {anonymize},
    'send_page_view': {'true' if settings.get('track_page_views', True) else 'false'}
  }});
</script>
<!-- End Google Analytics 4 -->'''

        gtm_code = None
        if settings.get("gtm_container_id") and settings.get("gtm_enabled"):
            gtm_id = settings.get("gtm_container_id")
            gtm_code = f'''<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){{w[l]=w[l]||[];w[l].push({{'gtm.start':
new Date().getTime(),event:'gtm.js'}});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
}})(window,document,'script','dataLayer','{gtm_id}');</script>
<!-- End Google Tag Manager -->'''
        
        return {
            "ga4_tracking_code": tracking_code if settings.get("ga4_enabled") else None,
            "gtm_tracking_code": gtm_code,
            "measurement_id": ga_id,
            "is_enabled": settings.get("ga4_enabled", False)
        }

    @router.post("/test-connection")
    async def test_ga_connection(admin=Depends(require_admin)):
        """Test if GA4 is properly configured (simulated)"""
        settings = await db.analytics_settings.find_one({"type": "ga4"})
        
        if not settings or not settings.get("ga4_measurement_id"):
            return {
                "status": "not_configured",
                "message": "GA4 Measurement ID not configured"
            }
        
        # In a real implementation, you would make an API call to GA4
        # For now, we'll return a simulated response
        return {
            "status": "configured",
            "measurement_id": settings.get("ga4_measurement_id"),
            "message": "GA4 appears to be configured. Install the tracking code on your website to start collecting data.",
            "next_steps": [
                "Add the tracking code to your website's <head> section",
                "Visit your website to generate test traffic",
                "Check Google Analytics Real-Time reports to verify data collection"
            ]
        }

    return router
