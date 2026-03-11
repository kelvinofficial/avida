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
            is_configured, upload_bytes, compress_image, make_thumbnail
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
        ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "webp"

        # Compress full image
        full_bytes, full_ct = compress_image(raw, max_width=1200, quality=80)
        full_path = f"uploads/{user.user_id}/{uid}.webp"
        full_result = await upload_bytes(full_bytes, full_path, full_ct)

        # Create thumbnail
        thumb_bytes, thumb_ct = make_thumbnail(raw, size=(300, 300), quality=60)
        thumb_path = f"uploads/{user.user_id}/thumb_{uid}.webp"
        thumb_result = await upload_bytes(thumb_bytes, thumb_path, thumb_ct)

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
            "full_url": f"/api/images/serve/{full_result['path']}",
            "thumb_url": f"/api/images/serve/{thumb_result['path']}",
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
            "full_url": f"/api/images/serve/{result['full_path']}",
            "thumb_url": f"/api/images/serve/{result['thumb_path']}",
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

    return router
