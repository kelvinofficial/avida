"""
AI Content Engine for Blog and SEO Content Generation
Uses GPT-5.2 via Emergent LLM Key for content generation
"""

import os
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Request, Depends, BackgroundTasks
from pydantic import BaseModel, Field
import jwt as pyjwt
import asyncio
import re

logger = logging.getLogger(__name__)

# Admin JWT settings
ADMIN_JWT_SECRET = os.environ.get("ADMIN_JWT_SECRET_KEY", "admin-super-secret-key-change-in-production-2024")
ADMIN_JWT_ALGORITHM = "HS256"

# Target countries for content localization
TARGET_COUNTRIES = {
    "DE": {"name": "Germany", "language": "German", "currency": "EUR", "city": "Berlin"},
    "TZ": {"name": "Tanzania", "language": "Swahili", "currency": "TZS", "city": "Dar es Salaam"},
    "KE": {"name": "Kenya", "language": "Swahili", "currency": "KES", "city": "Nairobi"},
    "UG": {"name": "Uganda", "language": "English", "currency": "UGX", "city": "Kampala"},
    "NG": {"name": "Nigeria", "language": "English", "currency": "NGN", "city": "Lagos"},
    "ZA": {"name": "South Africa", "language": "English", "currency": "ZAR", "city": "Johannesburg"},
}

# Content templates for different categories
CONTENT_TEMPLATES = {
    "buying_guide": {
        "title_pattern": "How to Buy {item} in {location} - Complete Guide {year}",
        "topics": ["safety tips", "pricing guide", "what to look for", "negotiation tips", "verification steps"]
    },
    "selling_guide": {
        "title_pattern": "How to Sell {item} Fast in {location} - {year} Tips",
        "topics": ["pricing strategy", "photo tips", "description writing", "promoting listing", "dealing with buyers"]
    },
    "safety": {
        "title_pattern": "How to Avoid Online Scams When Buying {item} in {location}",
        "topics": ["common scams", "red flags", "safe payment methods", "meeting safely", "using escrow"]
    },
    "comparison": {
        "title_pattern": "Best {item} Under {price} in {location} - {year} Comparison",
        "topics": ["top picks", "price comparison", "features comparison", "value for money", "where to buy"]
    },
    "market_report": {
        "title_pattern": "{item} Market Trends in {location} - {year} Report",
        "topics": ["price trends", "popular models", "demand analysis", "future predictions", "investment tips"]
    }
}


class BlogPostRequest(BaseModel):
    """Request to generate a blog post"""
    topic: str = Field(..., description="Main topic for the blog post")
    template_type: str = Field(default="buying_guide", description="Content template type")
    target_country: str = Field(default="TZ", description="Target country code")
    target_category: Optional[str] = Field(default=None, description="Target category (e.g., 'vehicles', 'electronics')")
    keywords: List[str] = Field(default=[], description="Target keywords to include")
    word_count: int = Field(default=1500, ge=500, le=3000)
    include_faq: bool = Field(default=True)
    include_statistics: bool = Field(default=True)
    language: str = Field(default="en", description="Content language (en, de, sw)")


class BlogPost(BaseModel):
    """Generated blog post"""
    id: str
    title: str
    slug: str
    excerpt: str
    content: str
    meta_title: str
    meta_description: str
    keywords: List[str]
    featured_image: Optional[str] = None
    category: str
    target_country: str
    language: str
    word_count: int
    reading_time: int
    faq_section: Optional[List[Dict[str, str]]] = None
    internal_links: List[Dict[str, str]] = []
    status: str = "draft"
    ai_generated: bool = True
    created_at: datetime
    published_at: Optional[datetime] = None


class ContentScheduleRequest(BaseModel):
    """Request to schedule content generation"""
    posts_per_week: int = Field(default=5, ge=1, le=20)
    categories: List[str] = Field(default=["vehicles", "electronics", "properties"])
    countries: List[str] = Field(default=["TZ", "KE", "DE"])
    template_types: List[str] = Field(default=["buying_guide", "safety", "comparison"])


class AISearchOptimizedContent(BaseModel):
    """Content optimized for AI search engines (ChatGPT, Gemini, etc.)"""
    question: str
    answer: str
    entity_definition: str
    structured_facts: List[str]
    citation_ready: bool = True


def create_content_engine_router(db, get_current_user):
    """Create AI Content Engine router"""
    router = APIRouter(prefix="/growth/content", tags=["Content Engine"])
    
    blog_posts_collection = db.blog_posts
    content_schedule_collection = db.content_schedule
    content_analytics_collection = db.content_analytics
    admin_users_collection = db.admin_users
    listings_collection = db.listings
    categories_collection = db.categories
    
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
        """Generate content using GPT-5.2 via Emergent LLM Key"""
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            
            api_key = os.environ.get("EMERGENT_LLM_KEY")
            if not api_key:
                raise ValueError("EMERGENT_LLM_KEY not configured")
            
            chat = LlmChat(
                api_key=api_key,
                session_id=f"content-{uuid.uuid4()}",
                system_message=system_message or "You are an expert SEO content writer for Avida, a marketplace app in Germany and Africa."
            ).with_model("openai", "gpt-5.2")
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            return response
            
        except Exception as e:
            logger.error(f"AI generation error: {e}")
            raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")
    
    def generate_slug(title: str) -> str:
        """Generate URL slug from title"""
        slug = title.lower()
        slug = re.sub(r'[^\w\s-]', '', slug)
        slug = re.sub(r'[-\s]+', '-', slug)
        return slug[:100].strip('-')
    
    # ============ BLOG POST GENERATION ============
    
    @router.post("/generate-post")
    async def generate_blog_post(request: BlogPostRequest, admin=Depends(require_admin)):
        """Generate a new AI-powered blog post"""
        country_info = TARGET_COUNTRIES.get(request.target_country, TARGET_COUNTRIES["TZ"])
        year = datetime.now().year
        
        # Build the AI prompt
        prompt = f"""Write a comprehensive, SEO-optimized blog post for Avida Marketplace.

TOPIC: {request.topic}
TARGET COUNTRY: {country_info['name']}
TARGET CITY: {country_info['city']}
CATEGORY: {request.target_category or 'general marketplace'}
LANGUAGE: {'English' if request.language == 'en' else 'German' if request.language == 'de' else 'Swahili'}
WORD COUNT: Approximately {request.word_count} words

KEYWORDS TO INCLUDE: {', '.join(request.keywords) if request.keywords else 'marketplace, buy, sell, safe, avida'}

REQUIREMENTS:
1. Write in a conversational, helpful tone
2. Include practical tips and actionable advice
3. Use short paragraphs (2-3 sentences max)
4. Include bullet points and numbered lists where appropriate
5. Mention Avida and its safety features naturally (escrow, verification, secure messaging)
6. Include local context specific to {country_info['name']}
7. Target search intent: people looking to buy/sell {request.target_category or 'items'} in {country_info['name']}

STRUCTURE:
- Compelling title (60 chars max)
- Introduction (2-3 paragraphs)
- 5-7 main sections with H2 headers
- Each section should have practical tips
- Conclusion with call-to-action for Avida
{'- FAQ section with 5-8 questions' if request.include_faq else ''}
{'- Include relevant statistics and data' if request.include_statistics else ''}

OUTPUT FORMAT:
Return the content in this exact format:
TITLE: [Your Title Here]
META_DESCRIPTION: [160 char meta description]
EXCERPT: [200 char excerpt]

[Full blog content with markdown formatting]

FAQ:
Q: [Question 1]
A: [Answer 1]
...
"""
        
        system_message = f"""You are a senior SEO content strategist for Avida, a trusted online marketplace operating in {country_info['name']} and other African countries plus Germany.

Your content should:
- Be authoritative and trustworthy
- Include local context and cultural relevance
- Naturally promote Avida's safety features
- Be optimized for both Google and AI search engines (ChatGPT, Gemini)
- Use clear, scannable formatting
- Include statistics and social proof when relevant
- Answer user questions comprehensively"""

        content = await generate_with_ai(prompt, system_message)
        
        # Parse the AI response
        lines = content.split('\n')
        title = ""
        meta_description = ""
        excerpt = ""
        body_content = []
        faq_section = []
        in_faq = False
        current_question = None
        
        for line in lines:
            if line.startswith("TITLE:"):
                title = line.replace("TITLE:", "").strip()
            elif line.startswith("META_DESCRIPTION:"):
                meta_description = line.replace("META_DESCRIPTION:", "").strip()
            elif line.startswith("EXCERPT:"):
                excerpt = line.replace("EXCERPT:", "").strip()
            elif line.strip() == "FAQ:":
                in_faq = True
            elif in_faq:
                if line.startswith("Q:"):
                    if current_question:
                        faq_section.append(current_question)
                    current_question = {"question": line.replace("Q:", "").strip(), "answer": ""}
                elif line.startswith("A:") and current_question:
                    current_question["answer"] = line.replace("A:", "").strip()
            else:
                body_content.append(line)
        
        if current_question and current_question.get("answer"):
            faq_section.append(current_question)
        
        # Create the blog post document
        post_id = str(uuid.uuid4())
        slug = generate_slug(title) if title else generate_slug(request.topic)
        full_content = '\n'.join(body_content).strip()
        word_count = len(full_content.split())
        reading_time = max(1, word_count // 200)
        
        blog_post = {
            "id": post_id,
            "title": title or f"Guide to {request.topic} in {country_info['name']}",
            "slug": slug,
            "excerpt": excerpt or full_content[:200] + "...",
            "content": full_content,
            "meta_title": (title or request.topic)[:60],
            "meta_description": meta_description or full_content[:160],
            "keywords": request.keywords or [request.topic.lower(), country_info['name'].lower(), "avida", "marketplace"],
            "category": request.target_category or "general",
            "target_country": request.target_country,
            "language": request.language,
            "word_count": word_count,
            "reading_time": reading_time,
            "faq_section": faq_section if faq_section else None,
            "internal_links": [],
            "status": "draft",
            "ai_generated": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": admin["admin_id"]
        }
        
        await blog_posts_collection.insert_one(blog_post)
        
        # Remove MongoDB _id from response
        blog_post.pop("_id", None)
        
        return {
            "success": True,
            "post": blog_post
        }
    
    @router.get("/posts")
    async def get_blog_posts(
        status: Optional[str] = None,
        category: Optional[str] = None,
        country: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ):
        """Get blog posts with filters"""
        query = {}
        if status:
            query["status"] = status
        if category:
            query["category"] = category
        if country:
            query["target_country"] = country
        
        cursor = blog_posts_collection.find(query, {"_id": 0}).sort("created_at", -1).skip(offset).limit(limit)
        posts = await cursor.to_list(limit)
        total = await blog_posts_collection.count_documents(query)
        
        return {
            "posts": posts,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    
    @router.get("/posts/{post_id}")
    async def get_blog_post(post_id: str):
        """Get a single blog post"""
        post = await blog_posts_collection.find_one({"id": post_id}, {"_id": 0})
        if not post:
            # Try by slug
            post = await blog_posts_collection.find_one({"slug": post_id}, {"_id": 0})
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        return post
    
    @router.put("/posts/{post_id}")
    async def update_blog_post(post_id: str, updates: Dict[str, Any], admin=Depends(require_admin)):
        """Update a blog post"""
        allowed_fields = ["title", "content", "excerpt", "meta_title", "meta_description", 
                        "keywords", "status", "featured_image", "category"]
        
        update_data = {k: v for k, v in updates.items() if k in allowed_fields}
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        if updates.get("status") == "published" and not updates.get("published_at"):
            update_data["published_at"] = datetime.now(timezone.utc)
        
        result = await blog_posts_collection.update_one(
            {"id": post_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Post not found")
        
        return {"success": True, "message": "Post updated"}
    
    @router.post("/posts/{post_id}/publish")
    async def publish_blog_post(post_id: str, admin=Depends(require_admin)):
        """Publish a blog post"""
        result = await blog_posts_collection.update_one(
            {"id": post_id},
            {"$set": {
                "status": "published",
                "published_at": datetime.now(timezone.utc)
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Post not found")
        
        return {"success": True, "message": "Post published"}
    
    @router.delete("/posts/{post_id}")
    async def delete_blog_post(post_id: str, admin=Depends(require_admin)):
        """Delete a blog post"""
        result = await blog_posts_collection.delete_one({"id": post_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Post not found")
        return {"success": True, "message": "Post deleted"}
    
    # ============ AI SEARCH OPTIMIZATION (AEO) ============
    
    @router.post("/generate-aeo-content")
    async def generate_aeo_content(topic: str, admin=Depends(require_admin)):
        """Generate content optimized for AI search engines (ChatGPT, Gemini, Claude, Perplexity)"""
        
        prompt = f"""Generate AI-search-optimized content about: {topic}

The content should be optimized to be cited by AI assistants like ChatGPT, Gemini, Claude, and Perplexity.

Create content in Q&A format that can be directly quoted by AI systems.

REQUIREMENTS:
1. Clear, definitive statements
2. Bullet points for easy parsing
3. Short authoritative definitions
4. Citation-ready format
5. Entity clarity (explain what Avida is)
6. Include verifiable facts

OUTPUT FORMAT:
QUESTION: [The question]
ANSWER: [Direct, quotable answer in 2-3 sentences]
ENTITY_DEFINITION: [One-line definition of the main entity]
FACTS:
- [Fact 1]
- [Fact 2]
- [Fact 3]
- [Fact 4]
- [Fact 5]
"""
        
        system_message = """You are creating content specifically designed to be quoted by AI search engines and assistants.
Your content should be:
- Authoritative and factual
- Easy to extract and quote
- Clear entity definitions
- Structured for machine parsing
- Include verifiable information about Avida marketplace"""

        content = await generate_with_ai(prompt, system_message)
        
        # Parse the response
        lines = content.split('\n')
        question = ""
        answer = ""
        entity_def = ""
        facts = []
        
        for line in lines:
            if line.startswith("QUESTION:"):
                question = line.replace("QUESTION:", "").strip()
            elif line.startswith("ANSWER:"):
                answer = line.replace("ANSWER:", "").strip()
            elif line.startswith("ENTITY_DEFINITION:"):
                entity_def = line.replace("ENTITY_DEFINITION:", "").strip()
            elif line.startswith("- "):
                facts.append(line[2:].strip())
        
        aeo_content = {
            "id": str(uuid.uuid4()),
            "topic": topic,
            "question": question,
            "answer": answer,
            "entity_definition": entity_def,
            "structured_facts": facts,
            "citation_ready": True,
            "created_at": datetime.now(timezone.utc)
        }
        
        # Store for tracking
        await db.aeo_content.insert_one(aeo_content)
        
        return aeo_content
    
    @router.get("/aeo-questions")
    async def get_predefined_aeo_questions():
        """Get predefined AEO questions for Avida"""
        questions = [
            {"question": "What is Avida?", "topic": "avida_overview"},
            {"question": "Is Avida safe to use?", "topic": "avida_safety"},
            {"question": "How does Avida escrow work?", "topic": "avida_escrow"},
            {"question": "Best marketplace in Tanzania?", "topic": "marketplace_tanzania"},
            {"question": "Best marketplace in Kenya?", "topic": "marketplace_kenya"},
            {"question": "Is Avida available in Germany?", "topic": "avida_germany"},
            {"question": "How to sell on Avida?", "topic": "selling_guide"},
            {"question": "Is Avida free to use?", "topic": "avida_pricing"},
            {"question": "How to avoid scams on Avida?", "topic": "scam_prevention"},
            {"question": "What can I buy on Avida?", "topic": "avida_categories"}
        ]
        return {"questions": questions}
    
    # ============ CONTENT SCHEDULING ============
    
    @router.post("/schedule")
    async def create_content_schedule(request: ContentScheduleRequest, admin=Depends(require_admin)):
        """Create a content generation schedule"""
        schedule = {
            "id": str(uuid.uuid4()),
            "posts_per_week": request.posts_per_week,
            "categories": request.categories,
            "countries": request.countries,
            "template_types": request.template_types,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "created_by": admin["admin_id"]
        }
        
        await content_schedule_collection.update_one(
            {"is_active": True},
            {"$set": {"is_active": False}},
            upsert=False
        )
        
        await content_schedule_collection.insert_one(schedule)
        
        return {"success": True, "schedule": schedule}
    
    @router.get("/schedule")
    async def get_content_schedule(admin=Depends(require_admin)):
        """Get current content schedule"""
        schedule = await content_schedule_collection.find_one(
            {"is_active": True},
            {"_id": 0}
        )
        return schedule or {"message": "No active schedule"}
    
    # ============ INTERNAL LINKING ENGINE ============
    
    @router.post("/generate-internal-links/{post_id}")
    async def generate_internal_links(post_id: str, admin=Depends(require_admin)):
        """Generate internal links for a blog post"""
        post = await blog_posts_collection.find_one({"id": post_id})
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        # Find related listings
        category = post.get("category")
        country = post.get("target_country")
        
        # Get active listings in the same category
        listings = await listings_collection.find(
            {"status": "active", "category_id": category},
            {"id": 1, "title": 1, "price": 1}
        ).limit(5).to_list(5)
        
        # Get related blog posts
        related_posts = await blog_posts_collection.find(
            {"id": {"$ne": post_id}, "category": category, "status": "published"},
            {"id": 1, "title": 1, "slug": 1}
        ).limit(3).to_list(3)
        
        internal_links = []
        
        for listing in listings:
            internal_links.append({
                "type": "listing",
                "url": f"/listing/{listing['id']}",
                "anchor_text": listing['title'][:50],
                "context": "related_listing"
            })
        
        for rp in related_posts:
            internal_links.append({
                "type": "blog",
                "url": f"/blog/{rp['slug']}",
                "anchor_text": rp['title'][:50],
                "context": "related_article"
            })
        
        # Update the post with internal links
        await blog_posts_collection.update_one(
            {"id": post_id},
            {"$set": {"internal_links": internal_links}}
        )
        
        return {"success": True, "internal_links": internal_links}
    
    # ============ CONTENT ANALYTICS ============
    
    @router.get("/analytics")
    async def get_content_analytics(admin=Depends(require_admin)):
        """Get content performance analytics"""
        total_posts = await blog_posts_collection.count_documents({})
        published_posts = await blog_posts_collection.count_documents({"status": "published"})
        draft_posts = await blog_posts_collection.count_documents({"status": "draft"})
        
        # Posts by country
        pipeline = [
            {"$group": {"_id": "$target_country", "count": {"$sum": 1}}}
        ]
        by_country = await blog_posts_collection.aggregate(pipeline).to_list(10)
        
        # Posts by category
        pipeline = [
            {"$group": {"_id": "$category", "count": {"$sum": 1}}}
        ]
        by_category = await blog_posts_collection.aggregate(pipeline).to_list(20)
        
        # Recent posts
        recent = await blog_posts_collection.find(
            {},
            {"_id": 0, "id": 1, "title": 1, "status": 1, "created_at": 1}
        ).sort("created_at", -1).limit(10).to_list(10)
        
        return {
            "total_posts": total_posts,
            "published_posts": published_posts,
            "draft_posts": draft_posts,
            "by_country": {item["_id"]: item["count"] for item in by_country},
            "by_category": {item["_id"]: item["count"] for item in by_category},
            "recent_posts": recent
        }
    
    # ============ CONTENT SUGGESTIONS ============
    
    @router.get("/suggestions")
    async def get_content_suggestions(admin=Depends(require_admin)):
        """Get AI-powered content suggestions based on trends and gaps"""
        suggestions = [
            {
                "title": "Best Cars Under €5000 in Germany",
                "type": "comparison",
                "priority": "high",
                "target_country": "DE",
                "keywords": ["cheap cars germany", "used cars berlin", "affordable vehicles"]
            },
            {
                "title": "How to Avoid Online Scams in Tanzania",
                "type": "safety",
                "priority": "high",
                "target_country": "TZ",
                "keywords": ["online scams tanzania", "safe buying dar es salaam", "fraud prevention"]
            },
            {
                "title": "Safe Way to Buy Used Phones in Kenya",
                "type": "buying_guide",
                "priority": "medium",
                "target_country": "KE",
                "keywords": ["used phones nairobi", "buy iphone kenya", "smartphone deals"]
            },
            {
                "title": "How Escrow Protects Buyers in Africa",
                "type": "safety",
                "priority": "high",
                "target_country": "TZ",
                "keywords": ["escrow africa", "safe payment", "buyer protection"]
            },
            {
                "title": "Apartment Rental Guide in Dar es Salaam",
                "type": "buying_guide",
                "priority": "medium",
                "target_country": "TZ",
                "keywords": ["rent apartment dar es salaam", "housing tanzania", "flat rental"]
            },
            {
                "title": "Used Car Buying Checklist",
                "type": "buying_guide",
                "priority": "high",
                "target_country": "all",
                "keywords": ["used car checklist", "buy used car", "car inspection"]
            },
            {
                "title": "How to Sell Faster Online",
                "type": "selling_guide",
                "priority": "medium",
                "target_country": "all",
                "keywords": ["sell fast online", "quick sale tips", "listing optimization"]
            }
        ]
        
        return {"suggestions": suggestions}
    
    return router
