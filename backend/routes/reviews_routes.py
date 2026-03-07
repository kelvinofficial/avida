"""
Reviews API Routes
Public endpoints for reviews functionality.
"""

from fastapi import APIRouter, HTTPException, Request, Query, Body
from datetime import datetime, timezone
from typing import Optional, List
import uuid
import logging

logger = logging.getLogger(__name__)


def create_reviews_router(db, get_current_user):
    """Create reviews router with dependency injection."""
    router = APIRouter(prefix="/reviews", tags=["Reviews"])
    
    async def require_auth(request: Request):
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        return user

    # =========================================================================
    # PUBLIC ENDPOINTS
    # =========================================================================
    
    @router.get("")
    async def get_all_reviews(
        user_id: Optional[str] = Query(None, description="Filter by reviewed user"),
        reviewer_id: Optional[str] = Query(None, description="Filter by reviewer"),
        listing_id: Optional[str] = Query(None, description="Filter by listing"),
        min_rating: Optional[int] = Query(None, ge=1, le=5),
        max_rating: Optional[int] = Query(None, ge=1, le=5),
        sort: str = Query("newest", description="Sort: newest, oldest, highest, lowest"),
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100)
    ):
        """Get reviews with optional filtering"""
        query = {}
        
        if user_id:
            query["user_id"] = user_id
        if reviewer_id:
            query["reviewer_id"] = reviewer_id
        if listing_id:
            query["listing_id"] = listing_id
        if min_rating:
            query["rating"] = {"$gte": min_rating}
        if max_rating:
            if "rating" in query:
                query["rating"]["$lte"] = max_rating
            else:
                query["rating"] = {"$lte": max_rating}
        
        # Sort options
        sort_options = {
            "newest": ("created_at", -1),
            "oldest": ("created_at", 1),
            "highest": ("rating", -1),
            "lowest": ("rating", 1)
        }
        sort_field, sort_dir = sort_options.get(sort, ("created_at", -1))
        
        total = await db.reviews.count_documents(query)
        skip = (page - 1) * limit
        
        reviews = await db.reviews.find(query, {"_id": 0}) \
            .sort(sort_field, sort_dir) \
            .skip(skip) \
            .limit(limit) \
            .to_list(length=limit)
        
        # Enrich with reviewer info
        for review in reviews:
            reviewer = await db.users.find_one(
                {"user_id": review.get("reviewer_id")},
                {"_id": 0, "name": 1, "picture": 1}
            )
            review["reviewer"] = reviewer
        
        # Get rating breakdown
        pipeline = [
            {"$match": query if query else {}},
            {"$group": {"_id": "$rating", "count": {"$sum": 1}}}
        ]
        breakdown_result = await db.reviews.aggregate(pipeline).to_list(5)
        rating_breakdown = {str(i): 0 for i in range(1, 6)}
        for item in breakdown_result:
            if item["_id"]:
                rating_breakdown[str(item["_id"])] = item["count"]
        
        # Calculate average
        avg_pipeline = [
            {"$match": query if query else {}},
            {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}}
        ]
        avg_result = await db.reviews.aggregate(avg_pipeline).to_list(1)
        average_rating = round(avg_result[0]["avg"], 1) if avg_result and avg_result[0]["avg"] else 0
        
        return {
            "reviews": reviews,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit,
            "average_rating": average_rating,
            "rating_breakdown": rating_breakdown
        }
    
    @router.get("/{review_id}")
    async def get_review(review_id: str):
        """Get a specific review by ID"""
        review = await db.reviews.find_one({"id": review_id}, {"_id": 0})
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        # Get reviewer info
        reviewer = await db.users.find_one(
            {"user_id": review.get("reviewer_id")},
            {"_id": 0, "name": 1, "picture": 1}
        )
        review["reviewer"] = reviewer
        
        # Get reviewed user info
        reviewed_user = await db.users.find_one(
            {"user_id": review.get("user_id")},
            {"_id": 0, "name": 1, "picture": 1}
        )
        review["reviewed_user"] = reviewed_user
        
        return review
    
    @router.post("")
    async def create_review(
        request: Request,
        user_id: str = Body(..., description="User being reviewed"),
        rating: int = Body(..., ge=1, le=5),
        comment: Optional[str] = Body(None),
        listing_id: Optional[str] = Body(None, description="Optional listing reference"),
        order_id: Optional[str] = Body(None, description="Optional order reference")
    ):
        """Create a new review"""
        current_user = await require_auth(request)
        
        if current_user.user_id == user_id:
            raise HTTPException(status_code=400, detail="Cannot review yourself")
        
        # Check if user exists
        target_user = await db.users.find_one({"user_id": user_id})
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check for existing review (one review per user pair, or per listing)
        existing_query = {
            "reviewer_id": current_user.user_id,
            "user_id": user_id
        }
        if listing_id:
            existing_query["listing_id"] = listing_id
        
        existing = await db.reviews.find_one(existing_query)
        if existing:
            raise HTTPException(status_code=400, detail="You have already reviewed this user" + (" for this listing" if listing_id else ""))
        
        review_id = f"review_{uuid.uuid4().hex[:12]}"
        review = {
            "id": review_id,
            "user_id": user_id,  # User being reviewed
            "reviewer_id": current_user.user_id,
            "rating": rating,
            "comment": comment,
            "listing_id": listing_id,
            "order_id": order_id,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.reviews.insert_one(review)
        
        # Update user's average rating
        all_reviews = await db.reviews.find({"user_id": user_id}).to_list(1000)
        if all_reviews:
            avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews)
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"rating": round(avg_rating, 1), "total_ratings": len(all_reviews)}}
            )
        
        review.pop("_id", None)
        return {"message": "Review created successfully", "review": review}
    
    @router.put("/{review_id}")
    async def update_review(
        review_id: str,
        request: Request,
        rating: Optional[int] = Body(None, ge=1, le=5),
        comment: Optional[str] = Body(None)
    ):
        """Update an existing review (only by the reviewer)"""
        current_user = await require_auth(request)
        
        review = await db.reviews.find_one({"id": review_id})
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        if review["reviewer_id"] != current_user.user_id:
            raise HTTPException(status_code=403, detail="You can only edit your own reviews")
        
        update_data = {"updated_at": datetime.now(timezone.utc)}
        if rating is not None:
            update_data["rating"] = rating
        if comment is not None:
            update_data["comment"] = comment
        
        await db.reviews.update_one({"id": review_id}, {"$set": update_data})
        
        # Recalculate user's average rating if rating changed
        if rating is not None:
            user_id = review["user_id"]
            all_reviews = await db.reviews.find({"user_id": user_id}).to_list(1000)
            if all_reviews:
                avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews)
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": {"rating": round(avg_rating, 1), "total_ratings": len(all_reviews)}}
                )
        
        updated_review = await db.reviews.find_one({"id": review_id}, {"_id": 0})
        return {"message": "Review updated successfully", "review": updated_review}
    
    @router.delete("/{review_id}")
    async def delete_review(review_id: str, request: Request):
        """Delete a review (only by the reviewer)"""
        current_user = await require_auth(request)
        
        review = await db.reviews.find_one({"id": review_id})
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        if review["reviewer_id"] != current_user.user_id:
            raise HTTPException(status_code=403, detail="You can only delete your own reviews")
        
        user_id = review["user_id"]
        await db.reviews.delete_one({"id": review_id})
        
        # Recalculate user's average rating
        all_reviews = await db.reviews.find({"user_id": user_id}).to_list(1000)
        if all_reviews:
            avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews)
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"rating": round(avg_rating, 1), "total_ratings": len(all_reviews)}}
            )
        else:
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"rating": 0, "total_ratings": 0}}
            )
        
        return {"message": "Review deleted successfully"}
    
    # =========================================================================
    # STATS ENDPOINTS
    # =========================================================================
    
    @router.get("/stats/summary")
    async def get_review_stats():
        """Get overall review statistics"""
        total_reviews = await db.reviews.count_documents({})
        
        # Rating distribution
        pipeline = [
            {"$group": {"_id": "$rating", "count": {"$sum": 1}}}
        ]
        distribution = await db.reviews.aggregate(pipeline).to_list(5)
        rating_distribution = {str(i): 0 for i in range(1, 6)}
        for item in distribution:
            if item["_id"]:
                rating_distribution[str(item["_id"])] = item["count"]
        
        # Average rating
        avg_pipeline = [
            {"$group": {"_id": None, "avg": {"$avg": "$rating"}}}
        ]
        avg_result = await db.reviews.aggregate(avg_pipeline).to_list(1)
        average_rating = round(avg_result[0]["avg"], 1) if avg_result and avg_result[0]["avg"] else 0
        
        # Top reviewers
        top_reviewers_pipeline = [
            {"$group": {"_id": "$reviewer_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]
        top_reviewers = await db.reviews.aggregate(top_reviewers_pipeline).to_list(5)
        
        return {
            "total_reviews": total_reviews,
            "average_rating": average_rating,
            "rating_distribution": rating_distribution,
            "top_reviewers": top_reviewers
        }
    
    return router
