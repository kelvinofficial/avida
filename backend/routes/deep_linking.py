"""
Deep Linking Routes for Mobile App
Handles link generation, tracking, and universal link configuration
"""
from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import uuid
import os

class DeepLinkCreate(BaseModel):
    target_type: str  # listing, profile, category, search, chat
    target_id: Optional[str] = None
    params: Optional[Dict[str, Any]] = None
    campaign: Optional[str] = None
    source: Optional[str] = None
    medium: Optional[str] = None

class ShortLinkResponse(BaseModel):
    short_code: str
    short_url: str
    deep_link: str
    web_url: str
    created_at: str

def create_deep_linking_router(db, get_current_user):
    router = APIRouter()
    
    # Get base URL from environment
    def get_base_url():
        return os.environ.get('APP_BASE_URL', os.environ.get('REACT_APP_BACKEND_URL', 'https://localhost:8001'))
    
    def generate_short_code(length: int = 8) -> str:
        """Generate a random short code"""
        import string
        import random
        chars = string.ascii_letters + string.digits
        return ''.join(random.choice(chars) for _ in range(length))
    
    def build_deep_link(target_type: str, target_id: str = None, params: dict = None) -> str:
        """Build an app deep link URL"""
        scheme = "localmarket"
        
        # Map target types to routes
        routes = {
            "listing": f"listing/{target_id}",
            "profile": f"profile/public/{target_id}",
            "category": f"category/{target_id}",
            "search": "search",
            "chat": f"chat/{target_id}",
            "business": f"business/{target_id}",
            "home": "",
            "offers": "offers",
            "saved": "profile/saved",
            "messages": "messages",
            "post": "post",
        }
        
        route = routes.get(target_type, "")
        deep_link = f"{scheme}://{route}"
        
        # Add query params
        if params:
            query_string = "&".join(f"{k}={v}" for k, v in params.items() if v)
            if query_string:
                deep_link += f"?{query_string}"
        
        return deep_link
    
    def build_web_url(target_type: str, target_id: str = None, params: dict = None) -> str:
        """Build a web fallback URL"""
        base_url = get_base_url()
        
        # Map target types to web routes
        routes = {
            "listing": f"/listing/{target_id}",
            "profile": f"/profile/public/{target_id}",
            "category": f"/category/{target_id}",
            "search": "/search",
            "chat": f"/chat/{target_id}",
            "business": f"/business/{target_id}",
            "home": "/",
            "offers": "/offers",
            "saved": "/profile/saved",
            "messages": "/messages",
            "post": "/post",
        }
        
        route = routes.get(target_type, "/")
        web_url = f"{base_url}{route}"
        
        # Add query params
        if params:
            query_string = "&".join(f"{k}={v}" for k, v in params.items() if v)
            if query_string:
                web_url += f"?{query_string}"
        
        return web_url
    
    @router.post("/deep-links/create", response_model=ShortLinkResponse)
    async def create_deep_link(link_data: DeepLinkCreate, request: Request):
        """Create a trackable short link that redirects to the app or web"""
        user = await get_current_user(request)
        
        short_code = generate_short_code()
        deep_link = build_deep_link(link_data.target_type, link_data.target_id, link_data.params)
        web_url = build_web_url(link_data.target_type, link_data.target_id, link_data.params)
        base_url = get_base_url()
        
        link_record = {
            "id": str(uuid.uuid4()),
            "short_code": short_code,
            "target_type": link_data.target_type,
            "target_id": link_data.target_id,
            "params": link_data.params or {},
            "deep_link": deep_link,
            "web_url": web_url,
            "created_by": user.user_id if user else None,
            # UTM tracking
            "campaign": link_data.campaign,
            "source": link_data.source,
            "medium": link_data.medium,
            # Stats
            "clicks": 0,
            "app_opens": 0,
            "web_opens": 0,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.deep_links.insert_one(link_record)
        
        return ShortLinkResponse(
            short_code=short_code,
            short_url=f"{base_url}/api/l/{short_code}",
            deep_link=deep_link,
            web_url=web_url,
            created_at=link_record["created_at"].isoformat()
        )
    
    @router.get("/deep-links/listing/{listing_id}")
    async def get_listing_share_link(listing_id: str, request: Request, campaign: str = None):
        """Generate a shareable link for a listing"""
        user = await get_current_user(request)
        
        # Check if listing exists
        listing = await db.listings.find_one({"id": listing_id})
        if not listing:
            # Check auto_listings
            listing = await db.auto_listings.find_one({"id": listing_id})
        if not listing:
            # Check property_listings
            listing = await db.property_listings.find_one({"id": listing_id})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        # Check for existing share link
        existing = await db.deep_links.find_one({
            "target_type": "listing",
            "target_id": listing_id,
            "campaign": campaign
        })
        
        if existing:
            base_url = get_base_url()
            return {
                "short_code": existing["short_code"],
                "short_url": f"{base_url}/api/l/{existing['short_code']}",
                "deep_link": existing["deep_link"],
                "web_url": existing["web_url"],
                "created_at": existing["created_at"].isoformat() if isinstance(existing["created_at"], datetime) else existing["created_at"]
            }
        
        # Create new link
        short_code = generate_short_code()
        deep_link = build_deep_link("listing", listing_id)
        web_url = build_web_url("listing", listing_id)
        base_url = get_base_url()
        
        link_record = {
            "id": str(uuid.uuid4()),
            "short_code": short_code,
            "target_type": "listing",
            "target_id": listing_id,
            "params": {},
            "deep_link": deep_link,
            "web_url": web_url,
            "created_by": user.user_id if user else None,
            "campaign": campaign,
            "source": "share",
            "medium": "link",
            "clicks": 0,
            "app_opens": 0,
            "web_opens": 0,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.deep_links.insert_one(link_record)
        
        return {
            "short_code": short_code,
            "short_url": f"{base_url}/api/l/{short_code}",
            "deep_link": deep_link,
            "web_url": web_url,
            "listing_title": listing.get("title", ""),
            "listing_image": listing.get("images", [None])[0] if listing.get("images") else None,
            "created_at": link_record["created_at"].isoformat()
        }
    
    @router.get("/l/{short_code}")
    async def redirect_short_link(short_code: str, request: Request):
        """
        Smart redirect handler for short links.
        Detects device type and redirects appropriately:
        - Mobile with app: Opens app via deep link
        - Mobile without app: Opens web with app store banner
        - Desktop: Opens web version
        """
        link = await db.deep_links.find_one({"short_code": short_code})
        if not link:
            raise HTTPException(status_code=404, detail="Link not found")
        
        # Increment click count
        await db.deep_links.update_one(
            {"short_code": short_code},
            {"$inc": {"clicks": 1}}
        )
        
        # Track the click
        user_agent = request.headers.get("user-agent", "").lower()
        is_mobile = any(x in user_agent for x in ["iphone", "ipad", "android", "mobile"])
        
        click_record = {
            "id": str(uuid.uuid4()),
            "link_id": link["id"],
            "short_code": short_code,
            "user_agent": user_agent,
            "is_mobile": is_mobile,
            "ip_address": request.client.host if request.client else None,
            "referrer": request.headers.get("referer", ""),
            "clicked_at": datetime.now(timezone.utc)
        }
        await db.deep_link_clicks.insert_one(click_record)
        
        # Determine redirect strategy
        if is_mobile:
            # For mobile, try to open app first, fallback to web
            # We use a smart redirect HTML that tries the deep link first
            await db.deep_links.update_one(
                {"short_code": short_code},
                {"$inc": {"app_opens": 1}}
            )
            
            deep_link = link["deep_link"]
            web_url = link["web_url"]
            
            # Return HTML that attempts app open with web fallback
            html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Opening Avida...</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%);
            color: white;
            text-align: center;
        }}
        .container {{
            padding: 40px 20px;
        }}
        h1 {{
            font-size: 24px;
            margin-bottom: 16px;
        }}
        p {{
            opacity: 0.9;
            margin-bottom: 24px;
        }}
        .spinner {{
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 24px;
        }}
        @keyframes spin {{
            to {{ transform: rotate(360deg); }}
        }}
        .btn {{
            display: inline-block;
            padding: 14px 32px;
            background: white;
            color: #2E7D32;
            text-decoration: none;
            border-radius: 30px;
            font-weight: 600;
            margin: 8px;
        }}
        .btn-secondary {{
            background: transparent;
            color: white;
            border: 2px solid white;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <h1>Opening in Avida App...</h1>
        <p>If the app doesn't open automatically, use the buttons below.</p>
        <a href="{deep_link}" class="btn">Open in App</a>
        <a href="{web_url}" class="btn btn-secondary">Continue in Browser</a>
    </div>
    <script>
        // Try to open the app
        var appOpened = false;
        var deepLink = "{deep_link}";
        var webUrl = "{web_url}";
        
        // Set a timeout to redirect to web if app doesn't open
        var timeout = setTimeout(function() {{
            if (!appOpened) {{
                window.location.href = webUrl;
            }}
        }}, 2500);
        
        // Try to open the app
        window.location.href = deepLink;
        
        // Listen for page visibility change (app opened)
        document.addEventListener('visibilitychange', function() {{
            if (document.hidden) {{
                appOpened = true;
                clearTimeout(timeout);
            }}
        }});
    </script>
</body>
</html>
"""
            from fastapi.responses import HTMLResponse
            return HTMLResponse(content=html_content)
        else:
            # Desktop: redirect to web
            await db.deep_links.update_one(
                {"short_code": short_code},
                {"$inc": {"web_opens": 1}}
            )
            return RedirectResponse(url=link["web_url"], status_code=302)
    
    @router.get("/deep-links/stats/{short_code}")
    async def get_link_stats(short_code: str, request: Request):
        """Get statistics for a short link"""
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        link = await db.deep_links.find_one({"short_code": short_code}, {"_id": 0})
        if not link:
            raise HTTPException(status_code=404, detail="Link not found")
        
        # Get click breakdown by day
        pipeline = [
            {"$match": {"short_code": short_code}},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$clicked_at"}},
                "clicks": {"$sum": 1},
                "mobile": {"$sum": {"$cond": ["$is_mobile", 1, 0]}},
                "desktop": {"$sum": {"$cond": ["$is_mobile", 0, 1]}}
            }},
            {"$sort": {"_id": -1}},
            {"$limit": 30}
        ]
        
        daily_stats = await db.deep_link_clicks.aggregate(pipeline).to_list(length=30)
        
        return {
            "link": link,
            "daily_stats": daily_stats,
            "total_clicks": link.get("clicks", 0),
            "app_opens": link.get("app_opens", 0),
            "web_opens": link.get("web_opens", 0)
        }
    
    @router.get("/deep-links/my-links")
    async def get_my_links(
        request: Request,
        skip: int = 0,
        limit: int = 20
    ):
        """Get all deep links created by the current user"""
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        cursor = db.deep_links.find(
            {"created_by": user.user_id},
            {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit)
        
        links = await cursor.to_list(length=limit)
        total = await db.deep_links.count_documents({"created_by": user.user_id})
        
        return {
            "links": links,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    
    @router.get("/deep-links/config")
    async def get_deep_link_config():
        """Get app deep link configuration for client setup"""
        base_url = get_base_url()
        
        return {
            "scheme": "localmarket",
            "ios": {
                "bundle_id": "com.localmarket.app",
                "app_store_id": "123456789",  # Replace with actual App Store ID
                "universal_link_prefix": f"{base_url}/api/l/"
            },
            "android": {
                "package": "com.localmarket.app",
                "play_store_url": "https://play.google.com/store/apps/details?id=com.localmarket.app",
                "intent_filters": [
                    f"{base_url}/listing/*",
                    f"{base_url}/profile/*",
                    f"{base_url}/category/*"
                ]
            },
            "supported_paths": [
                "/listing/:id",
                "/profile/public/:id",
                "/category/:id",
                "/search",
                "/chat/:id",
                "/business/:slug",
                "/offers",
                "/messages"
            ]
        }
    
    # Apple App Site Association endpoint for Universal Links
    @router.get("/.well-known/apple-app-site-association")
    async def apple_app_site_association():
        """Apple App Site Association for iOS Universal Links"""
        return {
            "applinks": {
                "apps": [],
                "details": [
                    {
                        "appID": "TEAMID.com.localmarket.app",
                        "paths": [
                            "/listing/*",
                            "/profile/*",
                            "/category/*",
                            "/api/l/*",
                            "/chat/*",
                            "/business/*"
                        ]
                    }
                ]
            }
        }
    
    # Android Asset Links for App Links
    @router.get("/.well-known/assetlinks.json")
    async def android_asset_links():
        """Android Asset Links for App Links"""
        return [
            {
                "relation": ["delegate_permission/common.handle_all_urls"],
                "target": {
                    "namespace": "android_app",
                    "package_name": "com.localmarket.app",
                    "sha256_cert_fingerprints": [
                        "SHA256_FINGERPRINT_HERE"  # Replace with actual fingerprint
                    ]
                }
            }
        ]
    
    return router
