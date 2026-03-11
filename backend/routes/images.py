"""
Image routes: upload, serve, and manage images via Cloudflare R2.
"""
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Request, UploadFile, File, HTTPException, Query
from fastapi.responses import Response

logger = logging.getLogger(__name__)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def create_image_router(db, require_auth):
    router = APIRouter(prefix="/images", tags=["Images"])

    @router.post("/upload")
    async def upload_image(
        request: Request,
        file: UploadFile = File(...),
    ):
        """Upload an image to R2 CDN. Returns the image paths for storage."""
        from utils.r2_storage import (
            is_configured, upload_bytes, compress_image, make_thumbnail,
            get_public_url,
        )
        if not is_configured():
            raise HTTPException(status_code=503, detail="Image storage not configured")

        user = await require_auth(request)

        if file.content_type not in ALLOWED_TYPES:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")

        raw = await file.read()
        if len(raw) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large (max 10MB)")

        uid = uuid.uuid4().hex[:12]

        # Compress full image
        full_bytes, full_ct = compress_image(raw, max_width=1200, quality=80)
        full_path = f"uploads/{user.user_id}/{uid}.webp"
        full_result = await upload_bytes(full_bytes, full_path, full_ct)

        # Create thumbnail
        thumb_bytes, thumb_ct = make_thumbnail(raw, size=(300, 300), quality=60)
        thumb_path = f"uploads/{user.user_id}/thumb_{uid}.webp"
        thumb_result = await upload_bytes(thumb_bytes, thumb_path, thumb_ct)

        # Use public CDN URL if available
        full_url = get_public_url(full_result["path"]) or f"/api/images/serve/{full_result['path']}"
        thumb_url = get_public_url(thumb_result["path"]) or f"/api/images/serve/{thumb_result['path']}"

        # Store record in DB
        record = {
            "id": str(uuid.uuid4()),
            "user_id": user.user_id,
            "full_path": full_result["path"],
            "thumb_path": thumb_result["path"],
            "original_filename": file.filename,
            "content_type": full_ct,
            "full_size": full_result["size"],
            "thumb_size": thumb_result["size"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.uploaded_images.insert_one(record)

        return {
            "id": record["id"],
            "full_path": full_result["path"],
            "thumb_path": thumb_result["path"],
            "full_url": full_url,
            "thumb_url": thumb_url,
            "size": full_result["size"],
        }

    @router.post("/upload-base64")
    async def upload_base64(request: Request):
        """Upload a base64 image to R2 CDN."""
        from utils.r2_storage import is_configured, upload_base64_image

        if not is_configured():
            raise HTTPException(status_code=503, detail="Image storage not configured")

        user = await require_auth(request)
        body = await request.json()
        data_uri = body.get("image")
        listing_id = body.get("listing_id", user.user_id)

        if not data_uri:
            raise HTTPException(status_code=400, detail="Missing 'image' field")

        result = await upload_base64_image(data_uri, listing_id, image_index=0)

        return {
            "full_path": result["full_path"],
            "thumb_path": result["thumb_path"],
            "full_url": result["full_url"],
            "thumb_url": result["thumb_url"],
        }

    @router.get("/serve/{path:path}")
    async def serve_image(path: str):
        """Serve an image from R2 with caching headers."""
        from utils.r2_storage import is_configured, download_bytes

        if not is_configured():
            raise HTTPException(status_code=503, detail="Image storage not configured")

        try:
            data, content_type = await download_bytes(path)
        except Exception as e:
            logger.error(f"Failed to serve image {path}: {e}")
            raise HTTPException(status_code=404, detail="Image not found")

        return Response(
            content=data,
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=31536000, immutable",
                "CDN-Cache-Control": "public, max-age=31536000",
            },
        )

    # ── v1 endpoints ──────────────────────────────────────────────────

    @router.delete("/{key:path}")
    async def delete_image(request: Request, key: str):
        """Delete an image from R2 by its key (path)."""
        from utils.r2_storage import is_configured, delete_object

        if not is_configured():
            raise HTTPException(status_code=503, detail="Image storage not configured")

        user = await require_auth(request)

        # Verify ownership: image must belong to the user or user is admin
        record = await db.uploaded_images.find_one(
            {"$or": [{"full_path": key}, {"thumb_path": key}]},
            {"_id": 0, "user_id": 1, "full_path": 1, "thumb_path": 1},
        )
        is_admin = getattr(user, "role", None) == "admin" or getattr(user, "is_admin", False)

        if record and record.get("user_id") != user.user_id and not is_admin:
            raise HTTPException(status_code=403, detail="Not authorized to delete this image")

        try:
            await delete_object(key)
        except Exception as e:
            logger.error(f"R2 delete failed for {key}: {e}")
            raise HTTPException(status_code=500, detail="Failed to delete image")

        # Clean up DB record and associated thumbnail/full image
        if record:
            full_path = record.get("full_path", "")
            thumb_path = record.get("thumb_path", "")
            other_key = thumb_path if key == full_path else full_path
            if other_key:
                try:
                    await delete_object(other_key)
                except Exception:
                    pass
            await db.uploaded_images.delete_one(
                {"$or": [{"full_path": key}, {"thumb_path": key}]}
            )

        # Also clean up references in listings
        await db.listings.update_many(
            {"r2_images.r2_full_path": key},
            {"$pull": {"r2_images": {"r2_full_path": key}}},
        )
        await db.listings.update_many(
            {"r2_images.r2_thumb_path": key},
            {"$pull": {"r2_images": {"r2_thumb_path": key}}},
        )

        return {"deleted": True, "key": key}

    @router.get("/stats")
    async def image_stats(request: Request):
        """Admin: get storage statistics for R2 images."""
        from utils.r2_storage import is_configured

        if not is_configured():
            raise HTTPException(status_code=503, detail="Image storage not configured")

        user = await require_auth(request)

        # Total uploaded images in DB
        total_uploads = await db.uploaded_images.count_documents({})

        # Size aggregation from uploaded_images
        size_pipeline = [
            {"$group": {
                "_id": None,
                "total_full_size": {"$sum": "$full_size"},
                "total_thumb_size": {"$sum": "$thumb_size"},
                "count": {"$sum": 1},
            }}
        ]
        size_result = await db.uploaded_images.aggregate(size_pipeline).to_list(1)
        upload_stats = size_result[0] if size_result else {"total_full_size": 0, "total_thumb_size": 0, "count": 0}

        # R2-migrated listing stats
        total_listings = await db.listings.count_documents({"status": "active"})
        migrated = await db.listings.count_documents({"r2_migrated": True})
        not_migrated = await db.listings.count_documents({"r2_migrated": {"$exists": False}, "status": "active"})

        # Listing image count
        img_pipeline = [
            {"$match": {"r2_migrated": True, "r2_images.0": {"$exists": True}}},
            {"$project": {"img_count": {"$size": "$r2_images"}}},
            {"$group": {"_id": None, "total_images": {"$sum": "$img_count"}}},
        ]
        img_result = await db.listings.aggregate(img_pipeline).to_list(1)
        listing_images = img_result[0]["total_images"] if img_result else 0

        # Per-user upload counts (top 10)
        user_pipeline = [
            {"$group": {"_id": "$user_id", "count": {"$sum": 1}, "size": {"$sum": "$full_size"}}},
            {"$sort": {"count": -1}},
            {"$limit": 10},
            {"$project": {"_id": 0, "user_id": "$_id", "count": 1, "size": 1}},
        ]
        top_uploaders = await db.uploaded_images.aggregate(user_pipeline).to_list(10)

        return {
            "uploads": {
                "total": total_uploads,
                "total_full_size_bytes": upload_stats.get("total_full_size", 0),
                "total_thumb_size_bytes": upload_stats.get("total_thumb_size", 0),
                "total_size_mb": round(
                    (upload_stats.get("total_full_size", 0) + upload_stats.get("total_thumb_size", 0))
                    / (1024 * 1024),
                    2,
                ),
            },
            "listings": {
                "total_active": total_listings,
                "migrated_to_r2": migrated,
                "pending_migration": not_migrated,
                "total_r2_images": listing_images,
                "migration_percent": round(migrated / total_listings * 100, 1) if total_listings else 0,
            },
            "top_uploaders": top_uploaders,
        }

    return router
