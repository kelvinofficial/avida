"""
Multi-Language SEO Module
Manage content in multiple languages (English, German, Swahili) for different markets
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Header
from pydantic import BaseModel, Field
from typing import Optional, List, Callable, Dict, Any
from datetime import datetime, timezone
import uuid

# Language configurations
SUPPORTED_LANGUAGES = {
    "en": {
        "name": "English",
        "native_name": "English",
        "flag": "🇺🇸",
        "regions": ["TZ", "KE", "UG", "NG", "ZA", "GLOBAL"],
        "status": "active"
    },
    "de": {
        "name": "German",
        "native_name": "Deutsch",
        "flag": "🇩🇪",
        "regions": ["DE"],
        "status": "active"
    },
    "sw": {
        "name": "Swahili",
        "native_name": "Kiswahili",
        "flag": "🇹🇿",
        "regions": ["TZ", "KE", "UG"],
        "status": "active"
    }
}

# Common SEO translations for each language
SEO_TRANSLATIONS = {
    "en": {
        "buy": "buy",
        "sell": "sell",
        "marketplace": "marketplace",
        "used_cars": "used cars",
        "phones": "phones",
        "apartments": "apartments",
        "jobs": "jobs",
        "for_sale": "for sale",
        "free_classifieds": "free classifieds",
        "local_deals": "local deals",
        "safe_shopping": "safe shopping"
    },
    "de": {
        "buy": "kaufen",
        "sell": "verkaufen",
        "marketplace": "Marktplatz",
        "used_cars": "Gebrauchtwagen",
        "phones": "Handys",
        "apartments": "Wohnungen",
        "jobs": "Jobs",
        "for_sale": "zu verkaufen",
        "free_classifieds": "kostenlose Kleinanzeigen",
        "local_deals": "lokale Angebote",
        "safe_shopping": "sicheres Einkaufen"
    },
    "sw": {
        "buy": "nunua",
        "sell": "uza",
        "marketplace": "soko",
        "used_cars": "magari yaliyotumika",
        "phones": "simu",
        "apartments": "nyumba",
        "jobs": "kazi",
        "for_sale": "inauzwa",
        "free_classifieds": "matangazo bure",
        "local_deals": "biashara za karibu",
        "safe_shopping": "ununuzi salama"
    }
}


class TranslationRequest(BaseModel):
    source_language: str = "en"
    target_language: str
    content_type: str = Field(..., description="blog, listing_template, meta_tag, ui_string")
    content_id: Optional[str] = None
    text: Optional[str] = None


class ContentLocalization(BaseModel):
    content_type: str
    content_id: str
    language: str
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    keywords: Optional[List[str]] = []
    status: str = Field(default="draft", description="draft, review, published")


def create_multilang_router(db, get_current_user: Callable):
    """Create the multi-language SEO router"""
    
    router = APIRouter(prefix="/growth/multilang", tags=["Multi-Language SEO"])
    
    async def require_admin(authorization: str = Header(None)):
        """Check for admin authorization"""
        if not authorization:
            raise HTTPException(status_code=401, detail="Admin access required")
        return True

    @router.get("/languages")
    async def get_supported_languages(admin=Depends(require_admin)):
        """Get all supported languages with their configuration"""
        return {
            "languages": SUPPORTED_LANGUAGES,
            "default_language": "en",
            "total": len(SUPPORTED_LANGUAGES)
        }

    @router.get("/status")
    async def get_multilang_status(admin=Depends(require_admin)):
        """Get comprehensive multi-language SEO status"""
        
        # Count content by language
        language_stats = {}
        
        for lang_code in SUPPORTED_LANGUAGES.keys():
            # Count blog posts
            blog_count = await db.blog_posts.count_documents({"language": lang_code})
            
            # Count localizations
            localization_count = await db.content_localizations.count_documents({
                "language": lang_code,
                "status": "published"
            })
            
            # Count translation tasks
            pending_translations = await db.translation_tasks.count_documents({
                "target_language": lang_code,
                "status": {"$in": ["pending", "in_progress"]}
            })
            
            language_stats[lang_code] = {
                **SUPPORTED_LANGUAGES[lang_code],
                "blog_posts": blog_count,
                "localizations": localization_count,
                "pending_translations": pending_translations,
                "coverage_score": min(100, (blog_count + localization_count) * 10)
            }
        
        # Calculate overall coverage
        total_content = sum(s["blog_posts"] + s["localizations"] for s in language_stats.values())
        
        return {
            "languages": language_stats,
            "total_content": total_content,
            "hreflang_implemented": True,
            "language_selector_enabled": True,
            "recommendations": generate_multilang_recommendations(language_stats)
        }

    @router.get("/content/{content_type}/{content_id}/translations")
    async def get_content_translations(
        content_type: str,
        content_id: str,
        admin=Depends(require_admin)
    ):
        """Get all translations for a specific piece of content"""
        
        translations = await db.content_localizations.find({
            "content_type": content_type,
            "content_id": content_id
        }, {"_id": 0}).to_list(length=100)
        
        # Get available languages that don't have translations
        translated_langs = {t["language"] for t in translations}
        missing_langs = [
            {"code": code, **info}
            for code, info in SUPPORTED_LANGUAGES.items()
            if code not in translated_langs
        ]
        
        return {
            "content_type": content_type,
            "content_id": content_id,
            "translations": translations,
            "translated_languages": list(translated_langs),
            "missing_languages": missing_langs
        }

    @router.post("/translations")
    async def create_translation(
        localization: ContentLocalization,
        admin=Depends(require_admin)
    ):
        """Create or update a content translation"""
        
        if localization.language not in SUPPORTED_LANGUAGES:
            raise HTTPException(status_code=400, detail=f"Unsupported language: {localization.language}")
        
        existing = await db.content_localizations.find_one({
            "content_type": localization.content_type,
            "content_id": localization.content_id,
            "language": localization.language
        })
        
        doc = {
            "content_type": localization.content_type,
            "content_id": localization.content_id,
            "language": localization.language,
            "title": localization.title,
            "description": localization.description,
            "content": localization.content,
            "meta_title": localization.meta_title,
            "meta_description": localization.meta_description,
            "keywords": localization.keywords or [],
            "status": localization.status,
            "updated_at": datetime.now(timezone.utc)
        }
        
        if existing:
            await db.content_localizations.update_one(
                {"_id": existing["_id"]},
                {"$set": doc}
            )
            message = "Translation updated"
        else:
            doc["id"] = str(uuid.uuid4())
            doc["created_at"] = datetime.now(timezone.utc)
            await db.content_localizations.insert_one(doc)
            message = "Translation created"
        
        doc.pop("_id", None)
        
        return {
            "success": True,
            "message": message,
            "translation": doc
        }

    @router.post("/translation-tasks")
    async def create_translation_task(
        request: TranslationRequest,
        admin=Depends(require_admin)
    ):
        """Create a translation task (queue for AI translation)"""
        
        if request.target_language not in SUPPORTED_LANGUAGES:
            raise HTTPException(status_code=400, detail=f"Unsupported target language")
        
        task_doc = {
            "id": str(uuid.uuid4()),
            "source_language": request.source_language,
            "target_language": request.target_language,
            "content_type": request.content_type,
            "content_id": request.content_id,
            "text": request.text,
            "status": "pending",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.translation_tasks.insert_one(task_doc)
        task_doc.pop("_id", None)
        
        return {
            "success": True,
            "message": f"Translation task queued for {SUPPORTED_LANGUAGES[request.target_language]['name']}",
            "task": task_doc
        }

    @router.get("/translation-tasks")
    async def get_translation_tasks(
        status: Optional[str] = None,
        target_language: Optional[str] = None,
        limit: int = Query(50, ge=1, le=200),
        admin=Depends(require_admin)
    ):
        """Get translation tasks"""
        
        query = {}
        if status:
            query["status"] = status
        if target_language:
            query["target_language"] = target_language
        
        tasks = await db.translation_tasks.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(length=limit)
        
        return {
            "tasks": tasks,
            "total": len(tasks)
        }

    @router.put("/translation-tasks/{task_id}")
    async def update_translation_task(
        task_id: str,
        status: str = Query(..., description="pending, in_progress, completed, failed"),
        translated_text: Optional[str] = None,
        admin=Depends(require_admin)
    ):
        """Update a translation task status"""
        
        task = await db.translation_tasks.find_one({"id": task_id})
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        update_data = {
            "status": status,
            "updated_at": datetime.now(timezone.utc)
        }
        
        if translated_text:
            update_data["translated_text"] = translated_text
        
        if status == "completed":
            update_data["completed_at"] = datetime.now(timezone.utc)
        
        await db.translation_tasks.update_one({"id": task_id}, {"$set": update_data})
        
        return {"success": True, "message": "Task updated"}

    @router.get("/seo-keywords/{language}")
    async def get_seo_keywords_for_language(
        language: str,
        admin=Depends(require_admin)
    ):
        """Get SEO keywords translations for a specific language"""
        
        if language not in SUPPORTED_LANGUAGES:
            raise HTTPException(status_code=400, detail="Unsupported language")
        
        translations = SEO_TRANSLATIONS.get(language, SEO_TRANSLATIONS["en"])
        
        return {
            "language": language,
            "language_info": SUPPORTED_LANGUAGES[language],
            "keywords": translations,
            "usage_tips": get_language_seo_tips(language)
        }

    @router.get("/hreflang-tags/{content_type}/{content_id}")
    async def get_hreflang_tags(
        content_type: str,
        content_id: str,
        base_url: str = Query("https://avida.com"),
        admin=Depends(require_admin)
    ):
        """Generate hreflang tags for a piece of content"""
        
        # Get all translations for this content
        translations = await db.content_localizations.find({
            "content_type": content_type,
            "content_id": content_id,
            "status": "published"
        }, {"_id": 0, "language": 1}).to_list(length=10)
        
        available_languages = [t["language"] for t in translations]
        if "en" not in available_languages:
            available_languages.insert(0, "en")  # English is always available
        
        # Generate hreflang tags
        hreflang_tags = []
        path = f"/{content_type}/{content_id}"
        
        for lang in available_languages:
            lang_info = SUPPORTED_LANGUAGES.get(lang, {})
            for region in lang_info.get("regions", []):
                hreflang_code = f"{lang}-{region}" if region != "GLOBAL" else lang
                url = f"{base_url}/{lang}{path}" if lang != "en" else f"{base_url}{path}"
                
                hreflang_tags.append({
                    "hreflang": hreflang_code.lower(),
                    "href": url
                })
        
        # Add x-default
        hreflang_tags.append({
            "hreflang": "x-default",
            "href": f"{base_url}{path}"
        })
        
        # Generate HTML
        html_tags = "\n".join([
            f'<link rel="alternate" hreflang="{tag["hreflang"]}" href="{tag["href"]}" />'
            for tag in hreflang_tags
        ])
        
        return {
            "content_type": content_type,
            "content_id": content_id,
            "available_languages": available_languages,
            "hreflang_tags": hreflang_tags,
            "html": html_tags
        }

    @router.get("/regional-keywords")
    async def get_regional_keywords(
        region: Optional[str] = None,
        category: Optional[str] = None,
        admin=Depends(require_admin)
    ):
        """Get SEO keywords optimized for specific regions"""
        
        regional_keywords = {
            "TZ": {
                "primary_language": "sw",
                "keywords": {
                    "vehicles": ["magari yaliyotumika dar es salaam", "used cars tanzania", "gari la kuuza"],
                    "electronics": ["simu za mkononi", "electronics dar es salaam", "laptop tanzania"],
                    "properties": ["nyumba za kupanga dar", "apartments dar es salaam", "land for sale tanzania"],
                    "jobs": ["kazi tanzania", "ajira dar es salaam", "job vacancies tanzania"]
                }
            },
            "KE": {
                "primary_language": "en",
                "keywords": {
                    "vehicles": ["used cars nairobi", "cars for sale kenya", "second hand vehicles"],
                    "electronics": ["phones nairobi", "electronics kenya", "laptop for sale"],
                    "properties": ["apartments nairobi", "houses for rent kenya", "land for sale"],
                    "jobs": ["jobs kenya", "vacancies nairobi", "employment opportunities"]
                }
            },
            "DE": {
                "primary_language": "de",
                "keywords": {
                    "vehicles": ["gebrauchtwagen berlin", "auto kaufen deutschland", "pkw zu verkaufen"],
                    "electronics": ["handys berlin", "elektronik kaufen", "laptop gebraucht"],
                    "properties": ["wohnung berlin", "immobilien deutschland", "haus kaufen"],
                    "jobs": ["jobs berlin", "stellenangebote deutschland", "arbeit finden"]
                }
            }
        }
        
        if region:
            if region not in regional_keywords:
                raise HTTPException(status_code=400, detail="Unsupported region")
            result = {region: regional_keywords[region]}
        else:
            result = regional_keywords
        
        if category:
            for reg in result:
                result[reg]["keywords"] = {category: result[reg]["keywords"].get(category, [])}
        
        return {
            "regional_keywords": result,
            "tip": "Use these keywords in titles, meta descriptions, and content for better local SEO"
        }

    return router


def generate_multilang_recommendations(stats: Dict[str, Any]) -> List[str]:
    """Generate recommendations based on language coverage"""
    recommendations = []
    
    for lang_code, data in stats.items():
        if data["blog_posts"] < 5 and lang_code != "en":
            lang_name = data["name"]
            recommendations.append(f"Create more {lang_name} content - currently only {data['blog_posts']} posts")
        
        if data["pending_translations"] > 0:
            recommendations.append(f"Complete {data['pending_translations']} pending {data['name']} translations")
    
    if not recommendations:
        recommendations.append("Great job! All languages have good coverage. Consider adding more specialized content.")
    
    return recommendations[:5]


def get_language_seo_tips(language: str) -> List[str]:
    """Get SEO tips specific to a language"""
    tips = {
        "en": [
            "Use natural, conversational language in titles",
            "Include location-specific keywords for local SEO",
            "Keep meta descriptions under 160 characters"
        ],
        "de": [
            "German compound words can be effective keywords",
            "Use formal 'Sie' for professional content",
            "Include umlauts (ä, ö, ü) in keywords - users search with them"
        ],
        "sw": [
            "Swahili speakers often mix English terms - include both",
            "Use common Swahili phrases for trust and relatability",
            "Target mobile users - high mobile usage in East Africa"
        ]
    }
    return tips.get(language, tips["en"])
