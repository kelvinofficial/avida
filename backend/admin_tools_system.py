"""
Admin Tools System
- Advanced SEO Meta Tags
- Ultimate Sitemap Generator  
- URL Masking/Shortening
- Polls, Surveys, Feedback
- Cookie Consent Management
- reCAPTCHA Configuration
- WebP Image Conversion
- Invoice PDF Generation
"""

import uuid
import logging
import hashlib
import base64
import io
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# =============================================================================
# SEO META TAGS
# =============================================================================

class SeoMetaTag(BaseModel):
    page_path: str  # e.g., "/", "/about", "/business/{slug}"
    title: Optional[str] = None
    description: Optional[str] = None
    keywords: Optional[List[str]] = None
    og_title: Optional[str] = None
    og_description: Optional[str] = None
    og_image: Optional[str] = None
    og_type: str = "website"
    twitter_card: str = "summary_large_image"
    twitter_title: Optional[str] = None
    twitter_description: Optional[str] = None
    twitter_image: Optional[str] = None
    canonical_url: Optional[str] = None
    robots: str = "index, follow"
    custom_meta: Optional[Dict[str, str]] = None


def create_seo_router(db, get_current_user):
    """Create SEO management router"""
    from fastapi import APIRouter, HTTPException, Request, Depends
    
    router = APIRouter(prefix="/seo", tags=["SEO"])
    
    async def require_admin(request: Request):
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        admin_emails = ["admin@marketplace.com", "admin@example.com"]
        if user.email not in admin_emails:
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    
    @router.get("/meta")
    async def list_meta_tags(admin = Depends(require_admin)):
        """List all SEO meta tag configurations"""
        cursor = db.seo_meta.find({}, {"_id": 0})
        metas = await cursor.to_list(length=100)
        return {"meta_tags": metas}
    
    @router.get("/meta/{page_path:path}")
    async def get_meta_tags(page_path: str):
        """Get meta tags for a specific page (public)"""
        meta = await db.seo_meta.find_one({"page_path": f"/{page_path}"}, {"_id": 0})
        
        if not meta:
            # Return defaults
            return {
                "title": "Avida Marketplace",
                "description": "Your local marketplace for buying and selling",
                "og_type": "website",
                "robots": "index, follow"
            }
        
        return meta
    
    @router.post("/meta")
    async def create_meta_tags(data: SeoMetaTag, admin = Depends(require_admin)):
        """Create SEO meta tags for a page"""
        existing = await db.seo_meta.find_one({"page_path": data.page_path})
        if existing:
            raise HTTPException(status_code=400, detail="Meta tags already exist for this page")
        
        meta_doc = data.dict()
        meta_doc["id"] = str(uuid.uuid4())
        meta_doc["created_at"] = datetime.now(timezone.utc)
        meta_doc["updated_at"] = datetime.now(timezone.utc)
        
        await db.seo_meta.insert_one(meta_doc)
        
        return {"message": "Meta tags created", "id": meta_doc["id"]}
    
    @router.put("/meta/{page_path:path}")
    async def update_meta_tags(page_path: str, data: dict, admin = Depends(require_admin)):
        """Update SEO meta tags for a page"""
        data["updated_at"] = datetime.now(timezone.utc)
        
        result = await db.seo_meta.update_one(
            {"page_path": f"/{page_path}"},
            {"$set": data},
            upsert=True
        )
        
        return {"message": "Meta tags updated"}
    
    @router.delete("/meta/{page_path:path}")
    async def delete_meta_tags(page_path: str, admin = Depends(require_admin)):
        """Delete SEO meta tags for a page"""
        await db.seo_meta.delete_one({"page_path": f"/{page_path}"})
        return {"message": "Meta tags deleted"}
    
    @router.get("/global-settings")
    async def get_global_seo_settings(admin = Depends(require_admin)):
        """Get global SEO settings"""
        settings = await db.app_settings.find_one({"key": "seo_global"})
        return settings.get("value", {}) if settings else {
            "site_name": "Avida Marketplace",
            "site_description": "Your local marketplace",
            "default_og_image": None,
            "google_analytics_id": None,
            "google_tag_manager_id": None,
            "facebook_pixel_id": None
        }
    
    @router.put("/global-settings")
    async def update_global_seo_settings(request: Request, admin = Depends(require_admin)):
        """Update global SEO settings"""
        data = await request.json()
        await db.app_settings.update_one(
            {"key": "seo_global"},
            {"$set": {"key": "seo_global", "value": data, "updated_at": datetime.now(timezone.utc)}},
            upsert=True
        )
        return {"message": "Settings updated"}
    
    return router


# =============================================================================
# URL MASKING / SHORTENING
# =============================================================================

def create_url_masking_router(db, get_current_user):
    """Create URL masking/shortening router"""
    from fastapi import APIRouter, HTTPException, Request, Depends
    from fastapi.responses import RedirectResponse
    
    router = APIRouter(prefix="/short", tags=["URL Shortening"])
    
    async def require_admin(request: Request):
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        admin_emails = ["admin@marketplace.com", "admin@example.com"]
        if user.email not in admin_emails:
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    
    def generate_short_code(length: int = 6) -> str:
        """Generate a short URL code"""
        chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        import random
        return "".join(random.choice(chars) for _ in range(length))
    
    @router.post("/create")
    async def create_short_url(request: Request, admin = Depends(require_admin)):
        """Create a short URL"""
        data = await request.json()
        target_url = data.get("target_url")
        custom_code = data.get("custom_code")
        expires_at = data.get("expires_at")
        
        if not target_url:
            raise HTTPException(status_code=400, detail="target_url required")
        
        # Generate or use custom code
        code = custom_code or generate_short_code()
        
        # Check if code exists
        existing = await db.short_urls.find_one({"code": code})
        if existing:
            raise HTTPException(status_code=400, detail="This short code already exists")
        
        now = datetime.now(timezone.utc)
        short_url = {
            "id": str(uuid.uuid4()),
            "code": code,
            "target_url": target_url,
            "clicks": 0,
            "created_by": admin.user_id,
            "created_at": now,
            "expires_at": expires_at,
            "is_active": True
        }
        
        await db.short_urls.insert_one(short_url)
        
        base_url = "https://analytics-dash-v2.preview.emergentagent.com"
        
        return {
            "short_url": f"{base_url}/s/{code}",
            "code": code,
            "target_url": target_url
        }
    
    @router.get("/list")
    async def list_short_urls(admin = Depends(require_admin)):
        """List all short URLs"""
        cursor = db.short_urls.find({}, {"_id": 0}).sort("created_at", -1)
        urls = await cursor.to_list(length=100)
        return {"urls": urls}
    
    @router.delete("/{code}")
    async def delete_short_url(code: str, admin = Depends(require_admin)):
        """Delete a short URL"""
        await db.short_urls.delete_one({"code": code})
        return {"message": "Short URL deleted"}
    
    @router.get("/stats/{code}")
    async def get_short_url_stats(code: str, admin = Depends(require_admin)):
        """Get statistics for a short URL"""
        url = await db.short_urls.find_one({"code": code}, {"_id": 0})
        if not url:
            raise HTTPException(status_code=404, detail="Short URL not found")
        
        # Get click history
        clicks = await db.short_url_clicks.find({"code": code}, {"_id": 0}).sort("clicked_at", -1).limit(100).to_list(length=100)
        url["click_history"] = clicks
        
        return url
    
    return router


# =============================================================================
# POLLS, SURVEYS, FEEDBACK
# =============================================================================

def create_polls_router(db, get_current_user):
    """Create polls/surveys router"""
    from fastapi import APIRouter, HTTPException, Request, Depends
    
    router = APIRouter(prefix="/polls", tags=["Polls & Surveys"])
    
    async def require_auth(request: Request):
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        return user
    
    async def require_admin(request: Request):
        user = await require_auth(request)
        admin_emails = ["admin@marketplace.com", "admin@example.com"]
        if user.email not in admin_emails:
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    
    @router.post("/admin/create")
    async def create_poll(request: Request, admin = Depends(require_admin)):
        """Create a new poll/survey"""
        data = await request.json()
        
        now = datetime.now(timezone.utc)
        poll = {
            "id": str(uuid.uuid4()),
            "title": data.get("title"),
            "description": data.get("description"),
            "type": data.get("type", "poll"),  # poll, survey, feedback
            "questions": data.get("questions", []),
            "options": data.get("options", []),  # For simple polls
            "allow_multiple": data.get("allow_multiple", False),
            "require_auth": data.get("require_auth", True),
            "show_results": data.get("show_results", True),
            "is_active": data.get("is_active", True),
            "starts_at": data.get("starts_at"),
            "ends_at": data.get("ends_at"),
            "created_by": admin.user_id,
            "created_at": now,
            "total_responses": 0
        }
        
        await db.polls.insert_one(poll)
        
        return {"message": "Poll created", "poll_id": poll["id"]}
    
    @router.get("/admin/list")
    async def list_polls(admin = Depends(require_admin)):
        """List all polls"""
        cursor = db.polls.find({}, {"_id": 0}).sort("created_at", -1)
        polls = await cursor.to_list(length=100)
        return {"polls": polls}
    
    @router.get("/admin/{poll_id}/results")
    async def get_poll_results(poll_id: str, admin = Depends(require_admin)):
        """Get poll results"""
        poll = await db.polls.find_one({"id": poll_id}, {"_id": 0})
        if not poll:
            raise HTTPException(status_code=404, detail="Poll not found")
        
        # Aggregate results
        responses = await db.poll_responses.find({"poll_id": poll_id}, {"_id": 0}).to_list(length=10000)
        
        # Calculate vote counts
        if poll["type"] == "poll":
            vote_counts = {}
            for response in responses:
                for option in response.get("selected_options", []):
                    vote_counts[option] = vote_counts.get(option, 0) + 1
            
            poll["results"] = vote_counts
            poll["total_responses"] = len(responses)
        else:
            poll["responses"] = responses
        
        return poll
    
    @router.delete("/admin/{poll_id}")
    async def delete_poll(poll_id: str, admin = Depends(require_admin)):
        """Delete a poll"""
        await db.polls.delete_one({"id": poll_id})
        await db.poll_responses.delete_many({"poll_id": poll_id})
        return {"message": "Poll deleted"}
    
    # Public endpoints
    @router.get("/active")
    async def get_active_polls():
        """Get active polls (public)"""
        now = datetime.now(timezone.utc)
        query = {
            "is_active": True,
            "$or": [
                {"ends_at": None},
                {"ends_at": {"$gt": now}}
            ]
        }
        cursor = db.polls.find(query, {"_id": 0, "responses": 0})
        polls = await cursor.to_list(length=20)
        return {"polls": polls}
    
    @router.get("/{poll_id}")
    async def get_poll(poll_id: str, request: Request):
        """Get a specific poll"""
        poll = await db.polls.find_one({"id": poll_id, "is_active": True}, {"_id": 0})
        if not poll:
            raise HTTPException(status_code=404, detail="Poll not found")
        
        # Check if user has voted (if authenticated)
        try:
            user = await get_current_user(request)
            if user:
                existing = await db.poll_responses.find_one({"poll_id": poll_id, "user_id": user.user_id})
                poll["user_voted"] = existing is not None
        except:
            poll["user_voted"] = False
        
        return poll
    
    @router.post("/{poll_id}/vote")
    async def vote_on_poll(poll_id: str, request: Request):
        """Submit a vote/response"""
        data = await request.json()
        
        poll = await db.polls.find_one({"id": poll_id, "is_active": True})
        if not poll:
            raise HTTPException(status_code=404, detail="Poll not found")
        
        user = None
        user_id = None
        
        if poll.get("require_auth"):
            user = await require_auth(request)
            user_id = user.user_id
            
            # Check if already voted
            existing = await db.poll_responses.find_one({"poll_id": poll_id, "user_id": user_id})
            if existing:
                raise HTTPException(status_code=400, detail="You have already voted")
        
        now = datetime.now(timezone.utc)
        response = {
            "id": str(uuid.uuid4()),
            "poll_id": poll_id,
            "user_id": user_id,
            "selected_options": data.get("selected_options", []),
            "answers": data.get("answers", {}),  # For surveys
            "feedback": data.get("feedback"),  # For feedback forms
            "created_at": now
        }
        
        await db.poll_responses.insert_one(response)
        
        # Update vote count
        await db.polls.update_one(
            {"id": poll_id},
            {"$inc": {"total_responses": 1}}
        )
        
        # Return results if enabled
        if poll.get("show_results"):
            return await get_poll_results(poll_id, None) if user else {"message": "Vote recorded"}
        
        return {"message": "Vote recorded"}
    
    return router


# =============================================================================
# COOKIE CONSENT
# =============================================================================

def create_cookie_consent_router(db, get_current_user):
    """Create cookie consent management router"""
    from fastapi import APIRouter, HTTPException, Request, Depends
    
    router = APIRouter(prefix="/cookies", tags=["Cookie Consent"])
    
    async def require_admin(request: Request):
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        admin_emails = ["admin@marketplace.com", "admin@example.com"]
        if user.email not in admin_emails:
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    
    @router.get("/settings")
    async def get_cookie_settings():
        """Get cookie consent settings (public)"""
        settings = await db.app_settings.find_one({"key": "cookie_consent"})
        return settings.get("value", {}) if settings else {
            "enabled": True,
            "banner_text": "We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.",
            "privacy_policy_url": "/privacy",
            "cookie_policy_url": "/cookies",
            "position": "bottom",  # bottom, top
            "theme": "dark",  # dark, light
            "categories": [
                {"id": "necessary", "name": "Necessary", "description": "Essential for the website to function", "required": True},
                {"id": "analytics", "name": "Analytics", "description": "Help us understand how visitors interact", "required": False},
                {"id": "marketing", "name": "Marketing", "description": "Used to deliver relevant ads", "required": False}
            ]
        }
    
    @router.put("/settings")
    async def update_cookie_settings(request: Request, admin = Depends(require_admin)):
        """Update cookie consent settings"""
        data = await request.json()
        await db.app_settings.update_one(
            {"key": "cookie_consent"},
            {"$set": {"key": "cookie_consent", "value": data, "updated_at": datetime.now(timezone.utc)}},
            upsert=True
        )
        return {"message": "Settings updated"}
    
    @router.post("/consent")
    async def record_consent(request: Request):
        """Record user's cookie consent preferences"""
        data = await request.json()
        
        consent = {
            "id": str(uuid.uuid4()),
            "session_id": data.get("session_id"),
            "user_id": data.get("user_id"),
            "ip_address": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
            "consented_categories": data.get("categories", ["necessary"]),
            "consent_given": True,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.cookie_consents.insert_one(consent)
        
        return {"message": "Consent recorded", "consent_id": consent["id"]}
    
    return router


# =============================================================================
# RECAPTCHA CONFIGURATION
# =============================================================================

def create_recaptcha_router(db, get_current_user):
    """Create reCAPTCHA management router"""
    from fastapi import APIRouter, HTTPException, Request, Depends
    import httpx
    import os
    
    router = APIRouter(prefix="/recaptcha", tags=["reCAPTCHA"])
    
    async def require_admin(request: Request):
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        admin_emails = ["admin@marketplace.com", "admin@example.com"]
        if user.email not in admin_emails:
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    
    @router.get("/settings")
    async def get_recaptcha_settings(admin = Depends(require_admin)):
        """Get reCAPTCHA settings"""
        settings = await db.app_settings.find_one({"key": "recaptcha"})
        return settings.get("value", {}) if settings else {
            "enabled": False,
            "site_key": None,
            "type": "v3",  # v2, v3, invisible
            "threshold": 0.5,  # For v3
            "protected_forms": ["login", "register", "contact", "listing_create"]
        }
    
    @router.put("/settings")
    async def update_recaptcha_settings(request: Request, admin = Depends(require_admin)):
        """Update reCAPTCHA settings"""
        data = await request.json()
        
        # Don't store secret key in regular settings
        if "secret_key" in data:
            # Store separately or in env
            os.environ["RECAPTCHA_SECRET_KEY"] = data.pop("secret_key")
        
        await db.app_settings.update_one(
            {"key": "recaptcha"},
            {"$set": {"key": "recaptcha", "value": data, "updated_at": datetime.now(timezone.utc)}},
            upsert=True
        )
        return {"message": "Settings updated"}
    
    @router.get("/site-key")
    async def get_site_key():
        """Get reCAPTCHA site key (public)"""
        settings = await db.app_settings.find_one({"key": "recaptcha"})
        if settings and settings.get("value", {}).get("enabled"):
            return {
                "enabled": True,
                "site_key": settings["value"].get("site_key"),
                "type": settings["value"].get("type", "v3")
            }
        return {"enabled": False}
    
    @router.post("/verify")
    async def verify_recaptcha(request: Request):
        """Verify reCAPTCHA token"""
        data = await request.json()
        token = data.get("token")
        
        if not token:
            raise HTTPException(status_code=400, detail="Token required")
        
        settings = await db.app_settings.find_one({"key": "recaptcha"})
        if not settings or not settings.get("value", {}).get("enabled"):
            return {"success": True, "message": "reCAPTCHA disabled"}
        
        secret_key = os.environ.get("RECAPTCHA_SECRET_KEY")
        if not secret_key:
            logger.warning("reCAPTCHA secret key not configured")
            return {"success": True, "message": "reCAPTCHA not configured"}
        
        # Verify with Google
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://www.google.com/recaptcha/api/siteverify",
                data={
                    "secret": secret_key,
                    "response": token,
                    "remoteip": request.client.host if request.client else None
                }
            )
            result = response.json()
        
        threshold = settings["value"].get("threshold", 0.5)
        
        if settings["value"].get("type") == "v3":
            success = result.get("success") and result.get("score", 0) >= threshold
        else:
            success = result.get("success", False)
        
        return {
            "success": success,
            "score": result.get("score"),
            "action": result.get("action")
        }
    
    return router


# =============================================================================
# WEBP IMAGE CONVERSION
# =============================================================================

def create_webp_router(db, get_current_user):
    """Create WebP image conversion router"""
    from fastapi import APIRouter, HTTPException, Request, Depends, UploadFile, File
    
    router = APIRouter(prefix="/images", tags=["Image Processing"])
    
    async def require_admin(request: Request):
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        admin_emails = ["admin@marketplace.com", "admin@example.com"]
        if user.email not in admin_emails:
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    
    @router.get("/settings")
    async def get_image_settings(admin = Depends(require_admin)):
        """Get image processing settings"""
        settings = await db.app_settings.find_one({"key": "image_processing"})
        return settings.get("value", {}) if settings else {
            "auto_convert_webp": True,
            "webp_quality": 80,
            "max_width": 1920,
            "max_height": 1080,
            "thumbnail_size": 300,
            "allowed_formats": ["jpg", "jpeg", "png", "gif", "webp"]
        }
    
    @router.put("/settings")
    async def update_image_settings(request: Request, admin = Depends(require_admin)):
        """Update image processing settings"""
        data = await request.json()
        await db.app_settings.update_one(
            {"key": "image_processing"},
            {"$set": {"key": "image_processing", "value": data, "updated_at": datetime.now(timezone.utc)}},
            upsert=True
        )
        return {"message": "Settings updated"}
    
    @router.post("/convert-webp")
    async def convert_to_webp(file: UploadFile = File(...), quality: int = 80, admin = Depends(require_admin)):
        """Convert an image to WebP format"""
        try:
            from PIL import Image
            
            # Read uploaded file
            contents = await file.read()
            image = Image.open(io.BytesIO(contents))
            
            # Convert to RGB if necessary (for PNG with transparency)
            if image.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = background
            
            # Convert to WebP
            output = io.BytesIO()
            image.save(output, format='WEBP', quality=quality)
            output.seek(0)
            
            # Return as base64
            webp_base64 = base64.b64encode(output.getvalue()).decode()
            
            return {
                "success": True,
                "original_size": len(contents),
                "webp_size": len(output.getvalue()),
                "compression_ratio": round((1 - len(output.getvalue()) / len(contents)) * 100, 1),
                "webp_base64": f"data:image/webp;base64,{webp_base64}"
            }
            
        except ImportError:
            raise HTTPException(status_code=500, detail="PIL/Pillow not installed")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Image conversion failed: {str(e)}")
    
    return router


# =============================================================================
# INVOICE PDF GENERATION
# =============================================================================

def create_invoice_pdf_router(db, get_current_user):
    """Create invoice PDF generation router"""
    from fastapi import APIRouter, HTTPException, Request, Depends
    from fastapi.responses import Response
    
    router = APIRouter(prefix="/invoices-pdf", tags=["Invoice PDF"])
    
    async def require_auth(request: Request):
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        return user
    
    @router.get("/{invoice_id}/pdf")
    async def generate_invoice_pdf(invoice_id: str, user = Depends(require_auth)):
        """Generate PDF for an invoice"""
        invoice = await db.invoices.find_one({"id": invoice_id})
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        if invoice.get("user_id") != user.user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import letter
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter)
            styles = getSampleStyleSheet()
            elements = []
            
            # Header
            elements.append(Paragraph(f"<b>INVOICE #{invoice.get('invoice_number', invoice_id)}</b>", styles['Heading1']))
            elements.append(Spacer(1, 20))
            
            # Invoice details
            elements.append(Paragraph(f"Date: {invoice.get('issued_date', '')[:10]}", styles['Normal']))
            elements.append(Paragraph(f"Status: {invoice.get('status', 'paid').upper()}", styles['Normal']))
            elements.append(Spacer(1, 20))
            
            # Items table
            data = [['Description', 'Amount']]
            data.append([invoice.get('description', 'Premium Subscription'), f"${invoice.get('amount', 0):.2f}"])
            
            table = Table(data, colWidths=[400, 100])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            elements.append(table)
            elements.append(Spacer(1, 20))
            
            # Total
            elements.append(Paragraph(f"<b>Total: ${invoice.get('amount', 0):.2f} {invoice.get('currency', 'USD')}</b>", styles['Heading2']))
            
            # Footer
            elements.append(Spacer(1, 40))
            elements.append(Paragraph("Thank you for your business!", styles['Normal']))
            elements.append(Paragraph("Avida Marketplace", styles['Normal']))
            
            doc.build(elements)
            buffer.seek(0)
            
            return Response(
                content=buffer.getvalue(),
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename=invoice_{invoice.get('invoice_number', invoice_id)}.pdf"}
            )
            
        except ImportError:
            raise HTTPException(status_code=500, detail="ReportLab not installed. Install with: pip install reportlab")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")
    
    @router.post("/{invoice_id}/send")
    async def send_invoice_email(invoice_id: str, user = Depends(require_auth)):
        """Send invoice PDF via email"""
        invoice = await db.invoices.find_one({"id": invoice_id})
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        if invoice.get("user_id") != user.user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get user email
        user_doc = await db.users.find_one({"user_id": user.user_id})
        if not user_doc or not user_doc.get("email"):
            raise HTTPException(status_code=400, detail="No email address found")
        
        # Record that invoice was sent
        await db.invoices.update_one(
            {"id": invoice_id},
            {"$set": {"email_sent": True, "email_sent_at": datetime.now(timezone.utc)}}
        )
        
        return {"message": f"Invoice sent to {user_doc['email']}"}
    
    return router
