"""
Social & Profile Activity Routes
Handles follow system, reviews, user listings, and profile activity (purchases, sales, recently viewed).
"""

from fastapi import APIRouter, HTTPException, Request, Query
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)


def create_social_router(db, require_auth, get_current_user, create_notification):
    """Create social router with dependency injection."""
    router = APIRouter(tags=["social"])

    # =========================================================================
    # FOLLOW SYSTEM
    # =========================================================================

    @router.post("/users/{user_id}/follow")
    async def follow_user(user_id: str, request: Request):
        """Follow a user"""
        current_user = await require_auth(request)
        
        if current_user.user_id == user_id:
            raise HTTPException(status_code=400, detail="Cannot follow yourself")
        
        target_user = await db.users.find_one({"user_id": user_id})
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        existing = await db.follows.find_one({
            "follower_id": current_user.user_id,
            "following_id": user_id
        })
        
        if existing:
            raise HTTPException(status_code=400, detail="Already following this user")
        
        await db.follows.insert_one({
            "id": str(uuid.uuid4()),
            "follower_id": current_user.user_id,
            "following_id": user_id,
            "created_at": datetime.now(timezone.utc)
        })
        
        await create_notification(
            user_id,
            "follow",
            "New Follower",
            f"{current_user.name or 'Someone'} started following you",
            actor_id=current_user.user_id,
            actor_name=current_user.name,
            actor_picture=current_user.picture,
            meta={"follower_id": current_user.user_id}
        )
        
        return {"message": "Now following user", "is_following": True}

    @router.delete("/users/{user_id}/follow")
    async def unfollow_user(user_id: str, request: Request):
        """Unfollow a user"""
        current_user = await require_auth(request)
        
        result = await db.follows.delete_one({
            "follower_id": current_user.user_id,
            "following_id": user_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=400, detail="Not following this user")
        
        return {"message": "Unfollowed user", "is_following": False}

    @router.get("/users/{user_id}/followers")
    async def get_followers(
        user_id: str,
        request: Request,
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100)
    ):
        """Get user's followers"""
        skip = (page - 1) * limit
        
        follows = await db.follows.find(
            {"following_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        follower_ids = [f["follower_id"] for f in follows]
        users = await db.users.find(
            {"user_id": {"$in": follower_ids}},
            {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "verified": 1}
        ).to_list(len(follower_ids))
        
        total = await db.follows.count_documents({"following_id": user_id})
        
        return {"followers": users, "total": total, "page": page}

    @router.get("/users/{user_id}/following")
    async def get_following(
        user_id: str,
        request: Request,
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100)
    ):
        """Get users that user is following"""
        skip = (page - 1) * limit
        
        follows = await db.follows.find(
            {"follower_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        following_ids = [f["following_id"] for f in follows]
        users = await db.users.find(
            {"user_id": {"$in": following_ids}},
            {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "verified": 1}
        ).to_list(len(following_ids))
        
        total = await db.follows.count_documents({"follower_id": user_id})
        
        return {"following": users, "total": total, "page": page}

    # =========================================================================
    # REVIEWS SYSTEM
    # =========================================================================

    @router.post("/users/{user_id}/reviews")
    async def create_review(user_id: str, request: Request):
        """Leave a review for a user"""
        current_user = await require_auth(request)
        body = await request.json()
        
        if current_user.user_id == user_id:
            raise HTTPException(status_code=400, detail="Cannot review yourself")
        
        target_user = await db.users.find_one({"user_id": user_id})
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        rating = body.get("rating")
        comment = body.get("comment", "").strip()
        
        if not rating or rating < 1 or rating > 5:
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
        
        existing = await db.reviews.find_one({
            "reviewer_id": current_user.user_id,
            "user_id": user_id
        })
        
        if existing:
            raise HTTPException(status_code=400, detail="You have already reviewed this user")
        
        review = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "reviewer_id": current_user.user_id,
            "reviewer_name": current_user.name,
            "reviewer_picture": current_user.picture,
            "rating": rating,
            "comment": comment,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.reviews.insert_one(review)
        
        # Update user's average rating
        reviews = await db.reviews.find({"user_id": user_id}).to_list(1000)
        avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
        
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"rating": round(avg_rating, 1), "total_ratings": len(reviews)}}
        )
        
        await create_notification(
            user_id,
            "review",
            "New Review",
            f"{current_user.name or 'Someone'} left you a {rating}-star review",
            actor_id=current_user.user_id,
            actor_name=current_user.name,
            actor_picture=current_user.picture,
            meta={"review_id": review["id"], "reviewer_id": current_user.user_id}
        )
        
        return {"message": "Review submitted", "review": review}

    @router.get("/users/{user_id}/reviews")
    async def get_user_reviews(
        user_id: str,
        request: Request,
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100)
    ):
        """Get reviews for a user"""
        skip = (page - 1) * limit
        
        reviews = await db.reviews.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        total = await db.reviews.count_documents({"user_id": user_id})
        
        # Get rating breakdown
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {"_id": "$rating", "count": {"$sum": 1}}}
        ]
        breakdown_result = await db.reviews.aggregate(pipeline).to_list(5)
        breakdown = {str(i): 0 for i in range(1, 6)}
        for item in breakdown_result:
            breakdown[str(item["_id"])] = item["count"]
        
        return {
            "reviews": reviews,
            "total": total,
            "page": page,
            "rating_breakdown": breakdown
        }

    @router.delete("/reviews/{review_id}")
    async def delete_review(review_id: str, request: Request):
        """Delete own review"""
        current_user = await require_auth(request)
        
        review = await db.reviews.find_one({"id": review_id})
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        if review["reviewer_id"] != current_user.user_id:
            raise HTTPException(status_code=403, detail="Cannot delete this review")
        
        await db.reviews.delete_one({"id": review_id})
        
        # Recalculate user's rating
        user_id = review["user_id"]
        reviews = await db.reviews.find({"user_id": user_id}).to_list(1000)
        
        if reviews:
            avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"rating": round(avg_rating, 1), "total_ratings": len(reviews)}}
            )
        else:
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"rating": 0, "total_ratings": 0}}
            )
        
        return {"message": "Review deleted"}

    # =========================================================================
    # USER LISTINGS
    # =========================================================================

    @router.get("/users/{user_id}/listings")
    async def get_user_listings(
        user_id: str,
        request: Request,
        status: str = Query("active"),
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100)
    ):
        """Get listings for a specific user"""
        skip = (page - 1) * limit
        
        query = {"user_id": user_id, "status": status}
        
        # Get from all collections
        listings = await db.listings.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
        properties = await db.properties.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
        auto_listings = await db.auto_listings.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
        
        for listing in listings:
            listing["type"] = "listing"
        for p in properties:
            p["type"] = "property"
        for a in auto_listings:
            a["type"] = "auto"
        
        all_listings = listings + properties + auto_listings
        all_listings.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        total = len(all_listings)
        paginated = all_listings[skip:skip + limit]
        
        return {"listings": paginated, "total": total, "page": page}

    return router


def create_profile_activity_router(db, require_auth, get_current_user):
    """Create profile activity router with dependency injection."""
    router = APIRouter(prefix="/profile/activity", tags=["profile-activity"])

    @router.get("/listings")
    async def get_my_listings(
        request: Request,
        status: str = Query(None),
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100)
    ):
        """Get user's listings from all collections"""
        user = await require_auth(request)
        
        query = {"user_id": user.user_id}
        if status:
            query["status"] = status
        
        skip = (page - 1) * limit
        
        # Get listings from all collections
        listings = await db.listings.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
        properties = await db.properties.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
        auto_listings = await db.auto_listings.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
        
        # Add type to each and combine
        for listing in listings:
            listing["type"] = "listing"
        for p in properties:
            p["type"] = "property"
        for a in auto_listings:
            a["type"] = "auto"
        
        all_listings = listings + properties + auto_listings
        
        # Sort by created_at descending
        all_listings.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        # Paginate
        total = len(all_listings)
        paginated = all_listings[skip:skip + limit]
        
        return {"listings": paginated, "total": total, "page": page}

    @router.get("/purchases")
    async def get_purchases(
        request: Request,
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100)
    ):
        """Get user's purchases (listings they've bought)"""
        user = await require_auth(request)
        
        skip = (page - 1) * limit
        
        # Get conversations where user is buyer
        conversations = await db.conversations.find(
            {"buyer_id": user.user_id},
            {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        # Get listing details from all collections
        listing_ids = [c["listing_id"] for c in conversations]
        
        listings = await db.listings.find({"id": {"$in": listing_ids}}, {"_id": 0}).to_list(len(listing_ids))
        properties = await db.properties.find({"id": {"$in": listing_ids}}, {"_id": 0}).to_list(len(listing_ids))
        auto_listings = await db.auto_listings.find({"id": {"$in": listing_ids}}, {"_id": 0}).to_list(len(listing_ids))
        
        listings_map = {}
        for listing in listings:
            listings_map[l["id"]] = {**l, "type": "listing"}
        for p in properties:
            listings_map[p["id"]] = {**p, "type": "property"}
        for a in auto_listings:
            listings_map[a["id"]] = {**a, "type": "auto"}
        
        result = []
        for conv in conversations:
            listing = listings_map.get(conv["listing_id"])
            if listing:
                result.append({
                    "conversation_id": conv["id"],
                    "listing": listing,
                    "created_at": conv.get("created_at")
                })
        
        return {"purchases": result, "total": len(result)}

    @router.get("/sales")
    async def get_sales(
        request: Request,
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100)
    ):
        """Get user's sales (listings they've sold)"""
        user = await require_auth(request)
        
        skip = (page - 1) * limit
        query = {"user_id": user.user_id, "status": "sold"}
        
        # Get sold items from all collections
        listings = await db.listings.find(query, {"_id": 0}).sort("updated_at", -1).to_list(500)
        properties = await db.properties.find(query, {"_id": 0}).sort("updated_at", -1).to_list(500)
        auto_listings = await db.auto_listings.find(query, {"_id": 0}).sort("updated_at", -1).to_list(500)
        
        # Add type to each and combine
        for listing in listings:
            listing["type"] = "listing"
        for p in properties:
            p["type"] = "property"
        for a in auto_listings:
            a["type"] = "auto"
        
        all_sales = listings + properties + auto_listings
        all_sales.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
        
        total = len(all_sales)
        paginated = all_sales[skip:skip + limit]
        
        return {"sales": paginated, "total": total, "page": page}

    @router.get("/recently-viewed")
    async def get_recently_viewed(
        request: Request,
        limit: int = Query(20, ge=1, le=50)
    ):
        """Get recently viewed listings"""
        user = await require_auth(request)
        
        # Get from recently_viewed collection
        viewed = await db.recently_viewed.find(
            {"user_id": user.user_id},
            {"_id": 0}
        ).sort("viewed_at", -1).limit(limit).to_list(limit)
        
        # Get listing details from all collections
        listing_ids = [v["listing_id"] for v in viewed]
        
        # Fetch from all listing collections
        listings = await db.listings.find({"id": {"$in": listing_ids}}, {"_id": 0}).to_list(len(listing_ids))
        properties = await db.properties.find({"id": {"$in": listing_ids}}, {"_id": 0}).to_list(len(listing_ids))
        auto_listings = await db.auto_listings.find({"id": {"$in": listing_ids}}, {"_id": 0}).to_list(len(listing_ids))
        
        # Combine all into a map
        listings_map = {}
        for listing in listings:
            listings_map[l["id"]] = {**l, "type": "listing"}
        for p in properties:
            listings_map[p["id"]] = {**p, "type": "property"}
        for a in auto_listings:
            listings_map[a["id"]] = {**a, "type": "auto"}
        
        result = []
        for v in viewed:
            listing = listings_map.get(v["listing_id"])
            if listing:
                result.append({
                    **listing,
                    "viewed_at": v.get("viewed_at")
                })
        
        return {"listings": result}

    @router.post("/recently-viewed/{listing_id}")
    async def add_recently_viewed(listing_id: str, request: Request):
        """Add listing to recently viewed"""
        user = await get_current_user(request)
        if not user:
            return {"message": "Not logged in"}
        
        # Upsert to recently_viewed
        await db.recently_viewed.update_one(
            {"user_id": user.user_id, "listing_id": listing_id},
            {
                "$set": {
                    "user_id": user.user_id,
                    "listing_id": listing_id,
                    "viewed_at": datetime.now(timezone.utc)
                }
            },
            upsert=True
        )
        
        # Keep only last 50 viewed items
        count = await db.recently_viewed.count_documents({"user_id": user.user_id})
        if count > 50:
            oldest = await db.recently_viewed.find(
                {"user_id": user.user_id}
            ).sort("viewed_at", 1).limit(count - 50).to_list(count - 50)
            
            ids_to_delete = [o["_id"] for o in oldest]
            await db.recently_viewed.delete_many({"_id": {"$in": ids_to_delete}})
        
        return {"message": "Added to recently viewed"}

    return router
