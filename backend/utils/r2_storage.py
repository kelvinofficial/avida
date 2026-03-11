"""
Cloudflare R2 Storage utility.
Uploads/downloads objects via the Cloudflare REST API.
"""
import os
import base64
import io
import uuid
import logging
import hashlib
from typing import Optional, Tuple

import httpx
from PIL import Image

logger = logging.getLogger(__name__)

CF_ACCOUNT_ID = os.environ.get("CF_ACCOUNT_ID", "")
CF_R2_TOKEN = os.environ.get("CF_R2_TOKEN", "")
CF_R2_BUCKET = os.environ.get("CF_R2_BUCKET", "")

R2_API_BASE = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/r2/buckets/{CF_R2_BUCKET}/objects"

# Reusable async client
_client: Optional[httpx.AsyncClient] = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(60.0, connect=10.0),
            headers={"Authorization": f"Bearer {CF_R2_TOKEN}"},
        )
    return _client


def is_configured() -> bool:
    return bool(CF_ACCOUNT_ID and CF_R2_TOKEN and CF_R2_BUCKET)


def get_serve_url(path: str, backend_url: str = "") -> str:
    """Get the URL to serve an image through the backend proxy."""
    return f"{backend_url}/api/images/serve/{path}"


async def upload_bytes(
    data: bytes,
    path: str,
    content_type: str = "image/webp",
) -> dict:
    """Upload raw bytes to R2. Returns {"path": ..., "size": ..., "etag": ...}"""
    client = _get_client()
    url = f"{R2_API_BASE}/{path}"
    resp = await client.put(url, content=data, headers={"Content-Type": content_type})
    resp.raise_for_status()
    result = resp.json().get("result", {})
    return {
        "path": result.get("key", path),
        "size": int(result.get("size", len(data))),
        "etag": result.get("etag", ""),
    }


async def download_bytes(path: str) -> Tuple[bytes, str]:
    """Download object from R2. Returns (bytes, content_type)."""
    client = _get_client()
    url = f"{R2_API_BASE}/{path}"
    resp = await client.get(url)
    resp.raise_for_status()
    content_type = resp.headers.get("content-type", "application/octet-stream")
    return resp.content, content_type


def compress_image(
    image_data: bytes,
    max_width: int = 1200,
    max_height: int = 1200,
    quality: int = 80,
    output_format: str = "WEBP",
) -> Tuple[bytes, str]:
    """Compress and resize image. Returns (compressed_bytes, content_type)."""
    img = Image.open(io.BytesIO(image_data))
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    # Resize if needed
    img.thumbnail((max_width, max_height), Image.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format=output_format, quality=quality, optimize=True)
    buf.seek(0)

    mime = {"WEBP": "image/webp", "JPEG": "image/jpeg", "PNG": "image/png"}
    return buf.read(), mime.get(output_format, "image/webp")


def make_thumbnail(
    image_data: bytes,
    size: Tuple[int, int] = (300, 300),
    quality: int = 60,
) -> Tuple[bytes, str]:
    """Create a small thumbnail. Returns (thumb_bytes, content_type)."""
    img = Image.open(io.BytesIO(image_data))
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    img.thumbnail(size, Image.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=quality, optimize=True)
    buf.seek(0)
    return buf.read(), "image/webp"


def decode_base64_image(data_uri: str) -> Tuple[bytes, str]:
    """Decode a base64 data URI into raw bytes + content_type."""
    if data_uri.startswith("data:"):
        header, b64_data = data_uri.split(",", 1)
        content_type = header.split(":")[1].split(";")[0]
    else:
        b64_data = data_uri
        content_type = "image/jpeg"

    return base64.b64decode(b64_data), content_type


async def upload_base64_image(
    data_uri: str,
    listing_id: str,
    image_index: int = 0,
) -> dict:
    """
    Decode a base64 image, compress it, upload to R2.
    Returns {"full_path": ..., "thumb_path": ..., "full_url": ..., "thumb_url": ...}
    """
    raw_bytes, original_ct = decode_base64_image(data_uri)
    uid = uuid.uuid4().hex[:12]

    # Compress full image
    full_bytes, full_ct = compress_image(raw_bytes, max_width=1200, quality=80)
    full_path = f"listings/{listing_id}/{uid}_{image_index}.webp"
    full_result = await upload_bytes(full_bytes, full_path, full_ct)

    # Create and upload thumbnail
    thumb_bytes, thumb_ct = make_thumbnail(raw_bytes, size=(300, 300), quality=60)
    thumb_path = f"listings/{listing_id}/thumb_{uid}_{image_index}.webp"
    thumb_result = await upload_bytes(thumb_bytes, thumb_path, thumb_ct)

    return {
        "full_path": full_result["path"],
        "thumb_path": thumb_result["path"],
        "full_size": full_result["size"],
        "thumb_size": thumb_result["size"],
    }


async def close():
    """Close the HTTP client."""
    global _client
    if _client and not _client.is_closed:
        await _client.aclose()
        _client = None
