"""
Social Distribution Module
Manage social media content scheduling and distribution across platforms
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Header
from pydantic import BaseModel, Field
from typing import Optional, List, Callable, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid

# Social media platforms configuration
PLATFORMS = {
    "twitter": {
        "name": "Twitter/X",
        "icon": "🐦",
        "max_chars": 280,
        "supports_images": True,
        "supports_links": True,
        "best_times": ["9:00 AM", "12:00 PM", "5:00 PM"],
        "color": "#1DA1F2"
    },
    "linkedin": {
        "name": "LinkedIn",
        "icon": "💼",
        "max_chars": 3000,
        "supports_images": True,
        "supports_links": True,
        "best_times": ["8:00 AM", "10:00 AM", "12:00 PM"],
        "color": "#0077B5"
    },
    "facebook": {
        "name": "Facebook",
        "icon": "📘",
        "max_chars": 63206,
        "supports_images": True,
        "supports_links": True,
        "best_times": ["1:00 PM", "4:00 PM", "7:00 PM"],
        "color": "#1877F2"
    },
    "instagram": {
        "name": "Instagram",
        "icon": "📸",
        "max_chars": 2200,
        "supports_images": True,
        "supports_links": False,
        "best_times": ["11:00 AM", "2:00 PM", "7:00 PM"],
        "color": "#E4405F"
    }
}

POST_STATUSES = ["draft", "scheduled", "published", "failed"]


class SocialPostCreate(BaseModel):
    title: str
    content: str
    platforms: List[str] = []
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    status: str = Field(default="draft")
    campaign_id: Optional[str] = None
    content_type: str = Field(default="blog_promotion", description="blog_promotion, listing, announcement, tip, engagement")
    hashtags: Optional[List[str]] = []


class SocialPostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    platforms: Optional[List[str]] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    status: Optional[str] = None
    hashtags: Optional[List[str]] = None


class ContentToSocialRequest(BaseModel):
    content_type: str = Field(..., description="blog, listing")
    content_id: str
    platforms: List[str]
    custom_message: Optional[str] = None


def create_social_distribution_router(db, get_current_user: Callable):
    """Create the social distribution router"""
    
    router = APIRouter(prefix="/growth/social", tags=["Social Distribution"])
    
    async def require_admin(authorization: str = Header(None)):
        """Check for admin authorization"""
        if not authorization:
            raise HTTPException(status_code=401, detail="Admin access required")
        return True

    @router.get("/platforms")
    async def get_platforms(admin=Depends(require_admin)):
        """Get all supported social media platforms"""
        return {
            "platforms": PLATFORMS,
            "total": len(PLATFORMS)
        }

    @router.get("/posts")
    async def get_posts(
        status: Optional[str] = None,
        platform: Optional[str] = None,
        limit: int = Query(50, ge=1, le=200),
        admin=Depends(require_admin)
    ):
        """Get all social posts"""
        query = {}
        if status:
            query["status"] = status
        if platform:
            query["platforms"] = platform
        
        posts = await db.social_posts.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(length=limit)
        
        # Count by status
        status_counts = {}
        for s in POST_STATUSES:
            status_counts[s] = await db.social_posts.count_documents({"status": s})
        
        return {
            "posts": posts,
            "total": len(posts),
            "by_status": status_counts
        }

    @router.post("/posts")
    async def create_post(
        post: SocialPostCreate,
        admin=Depends(require_admin)
    ):
        """Create a new social post"""
        
        # Validate platforms
        invalid_platforms = [p for p in post.platforms if p not in PLATFORMS]
        if invalid_platforms:
            raise HTTPException(status_code=400, detail=f"Invalid platforms: {invalid_platforms}")
        
        post_doc = {
            "id": str(uuid.uuid4()),
            "title": post.title,
            "content": post.content,
            "platforms": post.platforms,
            "image_url": post.image_url,
            "link_url": post.link_url,
            "scheduled_time": post.scheduled_time,
            "status": post.status,
            "campaign_id": post.campaign_id,
            "content_type": post.content_type,
            "hashtags": post.hashtags or [],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "publish_results": {}
        }
        
        await db.social_posts.insert_one(post_doc)
        post_doc.pop("_id", None)
        
        return {
            "success": True,
            "message": "Post created",
            "post": post_doc
        }

    @router.get("/posts/{post_id}")
    async def get_post(post_id: str, admin=Depends(require_admin)):
        """Get a specific social post"""
        post = await db.social_posts.find_one({"id": post_id}, {"_id": 0})
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        return {"post": post}

    @router.put("/posts/{post_id}")
    async def update_post(
        post_id: str,
        update: SocialPostUpdate,
        admin=Depends(require_admin)
    ):
        """Update a social post"""
        post = await db.social_posts.find_one({"id": post_id})
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        if update.platforms:
            invalid_platforms = [p for p in update.platforms if p not in PLATFORMS]
            if invalid_platforms:
                raise HTTPException(status_code=400, detail=f"Invalid platforms: {invalid_platforms}")
        
        await db.social_posts.update_one({"id": post_id}, {"$set": update_data})
        
        updated_post = await db.social_posts.find_one({"id": post_id}, {"_id": 0})
        
        return {
            "success": True,
            "message": "Post updated",
            "post": updated_post
        }

    @router.delete("/posts/{post_id}")
    async def delete_post(post_id: str, admin=Depends(require_admin)):
        """Delete a social post"""
        result = await db.social_posts.delete_one({"id": post_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Post not found")
        return {"success": True, "message": "Post deleted"}

    @router.post("/posts/{post_id}/publish")
    async def publish_post(post_id: str, admin=Depends(require_admin)):
        """Publish a post to selected platforms (simulated)"""
        post = await db.social_posts.find_one({"id": post_id})
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        # Simulate publishing to each platform
        results = {}
        for platform in post.get("platforms", []):
            # In production, this would call actual API integrations
            results[platform] = {
                "success": True,
                "message": f"Successfully posted to {PLATFORMS[platform]['name']}",
                "post_url": f"https://{platform}.com/post/{uuid.uuid4().hex[:8]}",
                "published_at": datetime.now(timezone.utc).isoformat()
            }
        
        await db.social_posts.update_one(
            {"id": post_id},
            {
                "$set": {
                    "status": "published",
                    "publish_results": results,
                    "published_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        return {
            "success": True,
            "message": "Post published to all platforms",
            "results": results,
            "note": "This is a simulated publish. Connect platform APIs for actual posting."
        }

    @router.post("/generate-from-content")
    async def generate_social_from_content(
        request: ContentToSocialRequest,
        admin=Depends(require_admin)
    ):
        """Generate social media posts from existing content (blog/listing)"""
        
        # Generate platform-specific versions
        generated_posts = []
        
        for platform in request.platforms:
            if platform not in PLATFORMS:
                continue
            
            platform_info = PLATFORMS[platform]
            max_chars = platform_info["max_chars"]
            
            # Generate appropriate content for each platform
            if platform == "twitter":
                content = generate_twitter_post(request.content_type, request.content_id, request.custom_message)
            elif platform == "linkedin":
                content = generate_linkedin_post(request.content_type, request.content_id, request.custom_message)
            else:
                content = generate_generic_post(request.content_type, request.content_id, request.custom_message, max_chars)
            
            generated_posts.append({
                "platform": platform,
                "platform_name": platform_info["name"],
                "icon": platform_info["icon"],
                "content": content,
                "char_count": len(content),
                "max_chars": max_chars,
                "is_valid": len(content) <= max_chars
            })
        
        return {
            "content_type": request.content_type,
            "content_id": request.content_id,
            "generated_posts": generated_posts
        }

    @router.get("/calendar")
    async def get_social_calendar(
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        admin=Depends(require_admin)
    ):
        """Get scheduled posts calendar view"""
        
        query = {"status": "scheduled", "scheduled_time": {"$ne": None}}
        
        if start_date:
            query["scheduled_time"]["$gte"] = datetime.fromisoformat(start_date)
        if end_date:
            query["scheduled_time"]["$lte"] = datetime.fromisoformat(end_date)
        
        posts = await db.social_posts.find(query, {"_id": 0}).sort("scheduled_time", 1).to_list(length=100)
        
        # Group by date
        by_date = {}
        for post in posts:
            if post.get("scheduled_time"):
                date_key = post["scheduled_time"].strftime("%Y-%m-%d") if isinstance(post["scheduled_time"], datetime) else post["scheduled_time"][:10]
                if date_key not in by_date:
                    by_date[date_key] = []
                by_date[date_key].append(post)
        
        return {
            "scheduled_posts": posts,
            "by_date": by_date,
            "total": len(posts)
        }

    @router.get("/analytics")
    async def get_social_analytics(admin=Depends(require_admin)):
        """Get social media posting analytics (simulated)"""
        
        # Get post counts
        total_posts = await db.social_posts.count_documents({})
        published_posts = await db.social_posts.count_documents({"status": "published"})
        scheduled_posts = await db.social_posts.count_documents({"status": "scheduled"})
        
        # Platform breakdown
        platform_stats = {}
        for platform in PLATFORMS:
            count = await db.social_posts.count_documents({"platforms": platform, "status": "published"})
            platform_stats[platform] = {
                "name": PLATFORMS[platform]["name"],
                "icon": PLATFORMS[platform]["icon"],
                "posts_published": count,
                "engagement_rate": round(2.5 + (count * 0.3), 1),  # Simulated
                "reach": count * 150  # Simulated
            }
        
        return {
            "summary": {
                "total_posts": total_posts,
                "published": published_posts,
                "scheduled": scheduled_posts,
                "drafts": total_posts - published_posts - scheduled_posts
            },
            "by_platform": platform_stats,
            "best_performing_content_type": "blog_promotion",
            "recommended_posting_frequency": "3-5 posts per week per platform",
            "is_simulated_data": True
        }

    @router.get("/queue")
    async def get_post_queue(admin=Depends(require_admin)):
        """Get posts scheduled for the next 7 days"""
        
        now = datetime.now(timezone.utc)
        week_later = now + timedelta(days=7)
        
        posts = await db.social_posts.find({
            "status": "scheduled",
            "scheduled_time": {"$gte": now, "$lte": week_later}
        }, {"_id": 0}).sort("scheduled_time", 1).to_list(length=50)
        
        return {
            "queue": posts,
            "total": len(posts),
            "period": "Next 7 days"
        }

    @router.get("/templates")
    async def get_post_templates(admin=Depends(require_admin)):
        """Get social post templates"""
        
        templates = {
            "blog_promotion": {
                "twitter": "📚 New on our blog: {title}\n\n{excerpt}\n\n👉 {link}\n\n#Avida #Marketplace #Tips",
                "linkedin": "🚀 We just published a new article that you won't want to miss!\n\n{title}\n\n{excerpt}\n\nRead the full article: {link}\n\n#Marketplace #OnlineSelling #Avida",
                "facebook": "📖 New Blog Post Alert!\n\n{title}\n\n{excerpt}\n\nRead more: {link}"
            },
            "listing_highlight": {
                "twitter": "🔥 Featured listing: {title}\n\n💰 Price: {price}\n📍 Location: {location}\n\nCheck it out: {link}",
                "linkedin": "✨ Highlighted listing on Avida\n\n{title}\n\n{description}\n\nView listing: {link}",
                "facebook": "🏷️ Check out this listing!\n\n{title}\n\n{description}\n\n👉 {link}"
            },
            "tip_of_the_day": {
                "twitter": "💡 Tip of the Day: {tip}\n\n#AvidaTips #OnlineSelling #SafeShopping",
                "linkedin": "💡 Quick tip for online marketplace success:\n\n{tip}\n\nFollow us for more tips!",
                "facebook": "💡 Daily Tip:\n\n{tip}\n\nShare with someone who needs to see this!"
            },
            "engagement": {
                "twitter": "🤔 Question for our community:\n\n{question}\n\nShare your thoughts below! 👇",
                "linkedin": "We'd love to hear from you!\n\n{question}\n\nShare your experience in the comments.",
                "facebook": "🗣️ Let's talk!\n\n{question}\n\nDrop your answer in the comments!"
            }
        }
        
        return {
            "templates": templates,
            "template_types": list(templates.keys())
        }

    return router


def generate_twitter_post(content_type: str, content_id: str, custom_message: Optional[str]) -> str:
    """Generate a Twitter-optimized post"""
    if custom_message:
        return f"{custom_message[:200]}\n\n👉 https://avida.com/{content_type}/{content_id}\n\n#Avida #Marketplace"
    
    if content_type == "blog":
        return f"📚 Check out our latest article!\n\nDiscover tips and insights for successful buying and selling.\n\n👉 https://avida.com/blog/{content_id}\n\n#Avida #OnlineMarketplace"
    else:
        return f"🔥 New listing alert!\n\nDon't miss this great deal.\n\n👉 https://avida.com/listing/{content_id}\n\n#Avida #Deals"


def generate_linkedin_post(content_type: str, content_id: str, custom_message: Optional[str]) -> str:
    """Generate a LinkedIn-optimized post"""
    if custom_message:
        return f"{custom_message}\n\n🔗 Read more: https://avida.com/{content_type}/{content_id}\n\n#Marketplace #Avida #OnlineShopping"
    
    if content_type == "blog":
        return f"""🚀 New Insights from Avida

We've just published a new article that can help you make the most of online marketplaces.

Whether you're buying or selling, these tips will help you stay safe and successful.

📖 Read the full article: https://avida.com/blog/{content_id}

What challenges have you faced when buying or selling online? Share in the comments!

#Marketplace #OnlineSelling #Avida #EcommerceTips"""
    else:
        return f"""✨ Featured on Avida Marketplace

Check out this great listing that just went live!

Great deals are happening every day on Avida.

🔗 View listing: https://avida.com/listing/{content_id}

#Marketplace #Deals #Avida"""


def generate_generic_post(content_type: str, content_id: str, custom_message: Optional[str], max_chars: int) -> str:
    """Generate a generic social post"""
    if custom_message:
        base = f"{custom_message}\n\nLink: https://avida.com/{content_type}/{content_id}"
    else:
        base = f"Check out this {content_type} on Avida!\n\nhttps://avida.com/{content_type}/{content_id}"
    
    return base[:max_chars]
