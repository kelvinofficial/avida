"""
App Store Optimization (ASO) Engine
Optimizes app store listings for Google Play and Apple App Store
"""

import os
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
import jwt as pyjwt

logger = logging.getLogger(__name__)

ADMIN_JWT_SECRET = os.environ.get("ADMIN_JWT_SECRET_KEY", "admin-super-secret-key-change-in-production-2024")
ADMIN_JWT_ALGORITHM = "HS256"

# Competitor apps for analysis
COMPETITORS = {
    "jiji": {"name": "Jiji", "regions": ["NG", "KE", "TZ", "UG", "GH"]},
    "olx": {"name": "OLX", "regions": ["ZA", "NG", "KE"]},
    "ebay_kleinanzeigen": {"name": "eBay Kleinanzeigen", "regions": ["DE"]},
    "craigslist": {"name": "Craigslist", "regions": ["US"]},
    "letgo": {"name": "Letgo", "regions": ["US", "ES"]}
}

# High-value keywords by region
REGION_KEYWORDS = {
    "DE": {
        "high_volume": ["kleinanzeigen", "gebrauchtwagen", "wohnung mieten", "handy kaufen", "möbel gebraucht"],
        "medium_volume": ["auto verkaufen", "elektronik günstig", "immobilien", "second hand"],
        "low_competition": ["sicher kaufen verkaufen", "escrow deutschland", "vertrauenswürdig marktplatz"]
    },
    "TZ": {
        "high_volume": ["buy sell tanzania", "cars dar es salaam", "phones tanzania", "property dar"],
        "medium_volume": ["used cars tanzania", "apartments dar es salaam", "electronics tanzania"],
        "low_competition": ["safe marketplace tanzania", "escrow tanzania", "trusted sellers dar"]
    },
    "KE": {
        "high_volume": ["buy sell kenya", "cars nairobi", "phones kenya", "property nairobi"],
        "medium_volume": ["used cars kenya", "apartments nairobi", "electronics kenya"],
        "low_competition": ["safe marketplace kenya", "escrow kenya", "trusted sellers nairobi"]
    },
    "NG": {
        "high_volume": ["buy sell nigeria", "cars lagos", "phones nigeria", "property lagos"],
        "medium_volume": ["used cars nigeria", "apartments lagos", "electronics nigeria"],
        "low_competition": ["safe marketplace nigeria", "escrow nigeria", "trusted sellers lagos"]
    },
    "UG": {
        "high_volume": ["buy sell uganda", "cars kampala", "phones uganda", "property kampala"],
        "medium_volume": ["used cars uganda", "apartments kampala", "electronics uganda"],
        "low_competition": ["safe marketplace uganda", "escrow uganda", "trusted sellers kampala"]
    },
    "ZA": {
        "high_volume": ["buy sell south africa", "cars johannesburg", "phones south africa", "property cape town"],
        "medium_volume": ["used cars south africa", "apartments johannesburg", "electronics south africa"],
        "low_competition": ["safe marketplace south africa", "escrow south africa", "trusted sellers"]
    }
}


class ASOMetadata(BaseModel):
    """App store metadata"""
    platform: str = Field(..., description="Platform: google_play or app_store")
    region: str = Field(default="TZ", description="Target region")
    language: str = Field(default="en", description="Language code")
    
    # Common fields
    app_name: str = Field(..., max_length=30)
    short_description: str = Field(default="", max_length=80)
    
    # Google Play specific
    long_description: str = Field(default="", max_length=4000)
    
    # App Store specific
    subtitle: str = Field(default="", max_length=30)
    keywords: str = Field(default="", max_length=100, description="Comma-separated keywords for App Store")
    promotional_text: str = Field(default="", max_length=170)
    
    # Tracking
    version: int = 1
    is_active: bool = True


class ASOVariant(BaseModel):
    """A/B test variant for ASO"""
    id: str
    name: str
    metadata: ASOMetadata
    metrics: Dict[str, float] = {}
    is_control: bool = False
    created_at: datetime


class GenerateASORequest(BaseModel):
    """Request to generate ASO content"""
    platform: str = Field(..., description="google_play or app_store")
    region: str = Field(default="TZ")
    language: str = Field(default="en")
    focus_keywords: List[str] = Field(default=[])
    competitor_analysis: bool = Field(default=True)


def create_aso_router(db, get_current_user):
    """Create ASO Engine router"""
    router = APIRouter(prefix="/growth/aso", tags=["ASO Engine"])
    
    aso_metadata_collection = db.aso_metadata
    aso_variants_collection = db.aso_variants
    aso_analytics_collection = db.aso_analytics
    admin_users_collection = db.admin_users
    
    async def require_admin(request: Request):
        """Require admin access"""
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                payload = pyjwt.decode(token, ADMIN_JWT_SECRET, algorithms=[ADMIN_JWT_ALGORITHM])
                admin_id = payload.get("sub")
                role = payload.get("role")
                if admin_id and role in ["super_admin", "admin", "moderator"]:
                    admin_doc = await admin_users_collection.find_one({"id": admin_id})
                    if admin_doc and admin_doc.get("is_active", True):
                        return {"admin_id": admin_id, "role": role}
            except Exception:
                pass
        
        user = await get_current_user(request)
        if user:
            admin_emails = ["admin@marketplace.com", "admin@example.com"]
            if user.email in admin_emails:
                return {"admin_id": user.user_id, "role": "admin"}
        
        raise HTTPException(status_code=401, detail="Admin access required")
    
    async def generate_with_ai(prompt: str, system_message: str = None) -> str:
        """Generate content using GPT-5.2"""
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            
            api_key = os.environ.get("EMERGENT_LLM_KEY")
            if not api_key:
                raise ValueError("EMERGENT_LLM_KEY not configured")
            
            chat = LlmChat(
                api_key=api_key,
                session_id=f"aso-{uuid.uuid4()}",
                system_message=system_message or "You are an ASO expert optimizing app store listings."
            ).with_model("openai", "gpt-5.2")
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            return response
            
        except Exception as e:
            logger.error(f"AI generation error: {e}")
            raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")
    
    # ============ GOOGLE PLAY OPTIMIZATION ============
    
    @router.post("/google-play/generate")
    async def generate_google_play_aso(request: GenerateASORequest, admin=Depends(require_admin)):
        """Generate optimized Google Play Store listing"""
        region_kw = REGION_KEYWORDS.get(request.region, REGION_KEYWORDS["TZ"])
        
        prompt = f"""Generate optimized Google Play Store listing for Avida Marketplace.

TARGET REGION: {request.region}
LANGUAGE: {request.language}
FOCUS KEYWORDS: {', '.join(request.focus_keywords) if request.focus_keywords else 'marketplace, buy, sell, safe, escrow'}

HIGH-VOLUME KEYWORDS TO INCLUDE: {', '.join(region_kw['high_volume'])}
LOW-COMPETITION KEYWORDS: {', '.join(region_kw['low_competition'])}

REQUIREMENTS:
1. App Title: Max 30 characters, include primary keyword
2. Short Description: Max 80 characters, compelling hook
3. Long Description: Max 4000 characters, natural keyword density
4. Include trust signals (escrow, verification, safe)
5. Include call-to-action
6. Include feature bullets

OUTPUT FORMAT:
APP_TITLE: [title here]
SHORT_DESCRIPTION: [description here]
LONG_DESCRIPTION:
[full description with formatting]

FEATURE_BULLETS:
- [bullet 1]
- [bullet 2]
- [bullet 3]
- [bullet 4]
- [bullet 5]

UPDATE_NOTES:
[Release notes for app update]
"""
        
        system_message = """You are a senior ASO specialist with expertise in Google Play optimization.
Focus on:
- Keyword density optimization
- Conversion-focused copy
- Trust and safety messaging
- Local relevance
- Competitor differentiation"""

        content = await generate_with_ai(prompt, system_message)
        
        # Parse response
        lines = content.split('\n')
        result = {
            "app_title": "",
            "short_description": "",
            "long_description": "",
            "feature_bullets": [],
            "update_notes": ""
        }
        
        current_section = None
        long_desc_lines = []
        
        for line in lines:
            if line.startswith("APP_TITLE:"):
                result["app_title"] = line.replace("APP_TITLE:", "").strip()[:30]
            elif line.startswith("SHORT_DESCRIPTION:"):
                result["short_description"] = line.replace("SHORT_DESCRIPTION:", "").strip()[:80]
            elif line.startswith("LONG_DESCRIPTION:"):
                current_section = "long_description"
            elif line.startswith("FEATURE_BULLETS:"):
                current_section = "bullets"
            elif line.startswith("UPDATE_NOTES:"):
                current_section = "update_notes"
                result["update_notes"] = ""
            elif current_section == "long_description" and not line.startswith("FEATURE"):
                long_desc_lines.append(line)
            elif current_section == "bullets" and line.startswith("- "):
                result["feature_bullets"].append(line[2:].strip())
            elif current_section == "update_notes":
                result["update_notes"] += line + "\n"
        
        result["long_description"] = '\n'.join(long_desc_lines).strip()[:4000]
        
        # Store the generated metadata
        metadata = {
            "id": str(uuid.uuid4()),
            "platform": "google_play",
            "region": request.region,
            "language": request.language,
            **result,
            "keywords_used": request.focus_keywords + region_kw['high_volume'][:5],
            "created_at": datetime.now(timezone.utc),
            "created_by": admin["admin_id"]
        }
        
        await aso_metadata_collection.insert_one(metadata)
        
        return {
            "success": True,
            "platform": "google_play",
            "region": request.region,
            "metadata": metadata
        }
    
    # ============ APP STORE (iOS) OPTIMIZATION ============
    
    @router.post("/app-store/generate")
    async def generate_app_store_aso(request: GenerateASORequest, admin=Depends(require_admin)):
        """Generate optimized Apple App Store listing"""
        region_kw = REGION_KEYWORDS.get(request.region, REGION_KEYWORDS["TZ"])
        
        prompt = f"""Generate optimized Apple App Store listing for Avida Marketplace.

TARGET REGION: {request.region}
LANGUAGE: {request.language}
FOCUS KEYWORDS: {', '.join(request.focus_keywords) if request.focus_keywords else 'marketplace, buy, sell, safe'}

REQUIREMENTS:
1. App Name: Max 30 characters
2. Subtitle: Max 30 characters (appears below app name)
3. Keyword Field: Max 100 characters, comma-separated, no spaces after commas
4. Promotional Text: Max 170 characters (can be updated without app update)
5. Description: Compelling, feature-focused

OUTPUT FORMAT:
APP_NAME: [name here]
SUBTITLE: [subtitle here]
KEYWORDS: [keyword1,keyword2,keyword3]
PROMOTIONAL_TEXT: [promotional text]
DESCRIPTION:
[full description]

SCREENSHOT_CAPTIONS:
1. [Caption for screenshot 1]
2. [Caption for screenshot 2]
3. [Caption for screenshot 3]
4. [Caption for screenshot 4]
5. [Caption for screenshot 5]
"""
        
        system_message = """You are an ASO expert specializing in Apple App Store optimization.
Focus on:
- Precise keyword selection (100 char limit is critical)
- Emotional hooks in subtitle
- Trust signals
- Feature-benefit language"""

        content = await generate_with_ai(prompt, system_message)
        
        # Parse response
        lines = content.split('\n')
        result = {
            "app_name": "",
            "subtitle": "",
            "keywords": "",
            "promotional_text": "",
            "description": "",
            "screenshot_captions": []
        }
        
        current_section = None
        desc_lines = []
        
        for line in lines:
            if line.startswith("APP_NAME:"):
                result["app_name"] = line.replace("APP_NAME:", "").strip()[:30]
            elif line.startswith("SUBTITLE:"):
                result["subtitle"] = line.replace("SUBTITLE:", "").strip()[:30]
            elif line.startswith("KEYWORDS:"):
                result["keywords"] = line.replace("KEYWORDS:", "").strip()[:100]
            elif line.startswith("PROMOTIONAL_TEXT:"):
                result["promotional_text"] = line.replace("PROMOTIONAL_TEXT:", "").strip()[:170]
            elif line.startswith("DESCRIPTION:"):
                current_section = "description"
            elif line.startswith("SCREENSHOT_CAPTIONS:"):
                current_section = "captions"
            elif current_section == "description" and not line.startswith("SCREENSHOT"):
                desc_lines.append(line)
            elif current_section == "captions" and line.strip() and line[0].isdigit():
                caption = line.split(".", 1)[1].strip() if "." in line else line
                result["screenshot_captions"].append(caption)
        
        result["description"] = '\n'.join(desc_lines).strip()
        
        # Store the generated metadata
        metadata = {
            "id": str(uuid.uuid4()),
            "platform": "app_store",
            "region": request.region,
            "language": request.language,
            **result,
            "created_at": datetime.now(timezone.utc),
            "created_by": admin["admin_id"]
        }
        
        await aso_metadata_collection.insert_one(metadata)
        
        return {
            "success": True,
            "platform": "app_store",
            "region": request.region,
            "metadata": metadata
        }
    
    # ============ KEYWORD ANALYSIS ============
    
    @router.get("/keywords/{region}")
    async def get_keywords_for_region(region: str, admin=Depends(require_admin)):
        """Get keyword suggestions for a region"""
        keywords = REGION_KEYWORDS.get(region.upper(), REGION_KEYWORDS["TZ"])
        
        return {
            "region": region.upper(),
            "keywords": keywords,
            "competitors": [c for c, info in COMPETITORS.items() if region.upper() in info["regions"]]
        }
    
    @router.get("/competitor-analysis/{region}")
    async def get_competitor_analysis(region: str, admin=Depends(require_admin)):
        """Get competitor analysis for a region"""
        regional_competitors = [
            {"id": cid, **cinfo} 
            for cid, cinfo in COMPETITORS.items() 
            if region.upper() in cinfo["regions"]
        ]
        
        # Generate insights
        insights = [
            f"Main competitors in {region.upper()}: {', '.join([c['name'] for c in regional_competitors])}",
            "Focus on safety/escrow messaging to differentiate from competitors",
            "Highlight local payment methods and currency support",
            "Emphasize verified sellers and buyer protection"
        ]
        
        return {
            "region": region.upper(),
            "competitors": regional_competitors,
            "insights": insights,
            "keyword_gaps": REGION_KEYWORDS.get(region.upper(), {}).get("low_competition", [])
        }
    
    # ============ A/B TESTING ============
    
    @router.post("/ab-test/create")
    async def create_ab_test(
        platform: str,
        region: str,
        control_id: str,
        variant_metadata: ASOMetadata,
        admin=Depends(require_admin)
    ):
        """Create an A/B test for ASO"""
        # Get control version
        control = await aso_metadata_collection.find_one({"id": control_id})
        if not control:
            raise HTTPException(status_code=404, detail="Control version not found")
        
        test = {
            "id": str(uuid.uuid4()),
            "platform": platform,
            "region": region,
            "control_id": control_id,
            "variant": {
                "id": str(uuid.uuid4()),
                **variant_metadata.dict()
            },
            "status": "active",
            "metrics": {
                "control": {"impressions": 0, "installs": 0, "ctr": 0},
                "variant": {"impressions": 0, "installs": 0, "ctr": 0}
            },
            "created_at": datetime.now(timezone.utc),
            "created_by": admin["admin_id"]
        }
        
        await aso_variants_collection.insert_one(test)
        
        return {"success": True, "test": test}
    
    @router.get("/ab-test/active")
    async def get_active_ab_tests(admin=Depends(require_admin)):
        """Get all active A/B tests"""
        cursor = aso_variants_collection.find(
            {"status": "active"},
            {"_id": 0}
        )
        tests = await cursor.to_list(50)
        return {"tests": tests}
    
    # ============ METADATA MANAGEMENT ============
    
    @router.get("/metadata")
    async def get_all_metadata(
        platform: Optional[str] = None,
        region: Optional[str] = None,
        admin=Depends(require_admin)
    ):
        """Get all ASO metadata"""
        query = {}
        if platform:
            query["platform"] = platform
        if region:
            query["region"] = region.upper()
        
        cursor = aso_metadata_collection.find(query, {"_id": 0}).sort("created_at", -1)
        metadata = await cursor.to_list(100)
        
        return {"metadata": metadata}
    
    @router.get("/metadata/{metadata_id}")
    async def get_metadata(metadata_id: str, admin=Depends(require_admin)):
        """Get specific ASO metadata"""
        metadata = await aso_metadata_collection.find_one({"id": metadata_id}, {"_id": 0})
        if not metadata:
            raise HTTPException(status_code=404, detail="Metadata not found")
        return metadata
    
    @router.put("/metadata/{metadata_id}/activate")
    async def activate_metadata(metadata_id: str, admin=Depends(require_admin)):
        """Activate a metadata version (deactivate others for same platform/region)"""
        metadata = await aso_metadata_collection.find_one({"id": metadata_id})
        if not metadata:
            raise HTTPException(status_code=404, detail="Metadata not found")
        
        # Deactivate others
        await aso_metadata_collection.update_many(
            {"platform": metadata["platform"], "region": metadata["region"], "id": {"$ne": metadata_id}},
            {"$set": {"is_active": False}}
        )
        
        # Activate this one
        await aso_metadata_collection.update_one(
            {"id": metadata_id},
            {"$set": {"is_active": True}}
        )
        
        return {"success": True, "message": "Metadata activated"}
    
    # ============ ANALYTICS ============
    
    @router.post("/analytics/track")
    async def track_aso_metrics(
        platform: str,
        region: str,
        metrics: Dict[str, Any],
        admin=Depends(require_admin)
    ):
        """Track ASO performance metrics"""
        analytics_entry = {
            "id": str(uuid.uuid4()),
            "platform": platform,
            "region": region,
            "metrics": metrics,  # impressions, installs, ctr, conversion_rate, keyword_rankings
            "date": datetime.now(timezone.utc).date().isoformat(),
            "created_at": datetime.now(timezone.utc)
        }
        
        await aso_analytics_collection.insert_one(analytics_entry)
        return {"success": True, "entry": analytics_entry}
    
    @router.get("/analytics/summary")
    async def get_aso_analytics_summary(
        platform: Optional[str] = None,
        region: Optional[str] = None,
        admin=Depends(require_admin)
    ):
        """Get ASO analytics summary"""
        query = {}
        if platform:
            query["platform"] = platform
        if region:
            query["region"] = region.upper()
        
        # Get recent entries
        cursor = aso_analytics_collection.find(query, {"_id": 0}).sort("created_at", -1).limit(30)
        entries = await cursor.to_list(30)
        
        # Calculate summary
        total_impressions = sum(e.get("metrics", {}).get("impressions", 0) for e in entries)
        total_installs = sum(e.get("metrics", {}).get("installs", 0) for e in entries)
        avg_ctr = sum(e.get("metrics", {}).get("ctr", 0) for e in entries) / len(entries) if entries else 0
        
        return {
            "total_impressions": total_impressions,
            "total_installs": total_installs,
            "average_ctr": round(avg_ctr, 2),
            "recent_entries": entries[:10]
        }
    
    # ============ LOCALIZATION ============
    
    @router.get("/localizations")
    async def get_available_localizations(admin=Depends(require_admin)):
        """Get available localizations"""
        localizations = {
            "DE": {"languages": ["de", "en"], "name": "Germany"},
            "TZ": {"languages": ["sw", "en"], "name": "Tanzania"},
            "KE": {"languages": ["sw", "en"], "name": "Kenya"},
            "UG": {"languages": ["en", "sw"], "name": "Uganda"},
            "NG": {"languages": ["en"], "name": "Nigeria"},
            "ZA": {"languages": ["en", "af"], "name": "South Africa"}
        }
        return {"localizations": localizations}
    
    @router.post("/localize/{metadata_id}")
    async def generate_localization(
        metadata_id: str,
        target_language: str,
        admin=Depends(require_admin)
    ):
        """Generate localized version of ASO metadata"""
        metadata = await aso_metadata_collection.find_one({"id": metadata_id})
        if not metadata:
            raise HTTPException(status_code=404, detail="Metadata not found")
        
        language_names = {"de": "German", "sw": "Swahili", "en": "English", "af": "Afrikaans"}
        target_lang_name = language_names.get(target_language, "English")
        
        prompt = f"""Translate this app store listing to {target_lang_name}.
Maintain SEO optimization and keyword relevance.
Do not use literal translation - adapt for local market.

ORIGINAL CONTENT:
App Name: {metadata.get('app_name', metadata.get('app_title', ''))}
Short Description: {metadata.get('short_description', '')}
Description: {metadata.get('description', metadata.get('long_description', ''))}

OUTPUT FORMAT:
APP_NAME: [translated name, max 30 chars]
SHORT_DESCRIPTION: [translated, max 80 chars]
DESCRIPTION: [full translated description]
"""
        
        content = await generate_with_ai(prompt)
        
        # Parse and store
        lines = content.split('\n')
        localized = {
            "id": str(uuid.uuid4()),
            "parent_id": metadata_id,
            "platform": metadata["platform"],
            "region": metadata["region"],
            "language": target_language,
            "created_at": datetime.now(timezone.utc)
        }
        
        for line in lines:
            if line.startswith("APP_NAME:"):
                localized["app_name"] = line.replace("APP_NAME:", "").strip()[:30]
            elif line.startswith("SHORT_DESCRIPTION:"):
                localized["short_description"] = line.replace("SHORT_DESCRIPTION:", "").strip()[:80]
            elif line.startswith("DESCRIPTION:"):
                localized["description"] = '\n'.join(lines[lines.index(line)+1:]).strip()
        
        await aso_metadata_collection.insert_one(localized)
        
        return {"success": True, "localized": localized}
    
    return router
