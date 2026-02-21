"""
Image Optimization Utilities for Avida
Handles WebP conversion, thumbnail generation, and image compression.
Target: Reduce image payload by 60-80%
"""

import io
import base64
import logging
from typing import Optional, Tuple
from PIL import Image

logger = logging.getLogger(__name__)

# Configuration
THUMBNAIL_SIZE = (400, 400)  # Max dimensions for thumbnails
PREVIEW_SIZE = (800, 800)    # Max dimensions for preview images
FULL_SIZE = (1920, 1920)     # Max dimensions for full images
WEBP_QUALITY = 80            # Quality for WebP compression (0-100)
JPEG_QUALITY = 85            # Quality for JPEG fallback


def decode_base64_image(base64_string: str) -> Optional[Image.Image]:
    """Decode a base64 string to PIL Image."""
    try:
        # Handle data URI format
        if base64_string.startswith('data:'):
            # Extract the base64 part after the comma
            base64_string = base64_string.split(',', 1)[1]
        
        image_data = base64.b64decode(base64_string)
        return Image.open(io.BytesIO(image_data))
    except Exception as e:
        logger.warning(f"Failed to decode base64 image: {e}")
        return None


def encode_image_to_base64(image: Image.Image, format: str = "WEBP", quality: int = WEBP_QUALITY) -> str:
    """Encode PIL Image to base64 string with data URI prefix."""
    try:
        buffer = io.BytesIO()
        
        # Convert to RGB if necessary (for JPEG/WebP)
        if image.mode in ('RGBA', 'P'):
            # Create white background for transparency
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = background
        elif image.mode != 'RGB':
            image = image.convert('RGB')
        
        image.save(buffer, format=format, quality=quality, optimize=True)
        base64_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        mime_type = "image/webp" if format == "WEBP" else "image/jpeg"
        return f"data:{mime_type};base64,{base64_data}"
    except Exception as e:
        logger.warning(f"Failed to encode image: {e}")
        return ""


def resize_image(image: Image.Image, max_size: Tuple[int, int]) -> Image.Image:
    """Resize image maintaining aspect ratio."""
    image.thumbnail(max_size, Image.Resampling.LANCZOS)
    return image


def create_thumbnail(base64_string: str, size: Tuple[int, int] = THUMBNAIL_SIZE) -> Optional[str]:
    """
    Create a thumbnail from a base64 image string.
    Returns base64 WebP thumbnail.
    """
    image = decode_base64_image(base64_string)
    if not image:
        return None
    
    # Resize to thumbnail
    image = resize_image(image, size)
    
    # Encode to WebP
    return encode_image_to_base64(image, format="WEBP", quality=75)


def optimize_image(base64_string: str, max_size: Tuple[int, int] = PREVIEW_SIZE) -> Optional[str]:
    """
    Optimize an image: resize and convert to WebP.
    Returns optimized base64 WebP image.
    """
    image = decode_base64_image(base64_string)
    if not image:
        return None
    
    # Resize if larger than max size
    if image.size[0] > max_size[0] or image.size[1] > max_size[1]:
        image = resize_image(image, max_size)
    
    # Encode to WebP
    return encode_image_to_base64(image, format="WEBP", quality=WEBP_QUALITY)


def get_image_dimensions(base64_string: str) -> Optional[Tuple[int, int]]:
    """Get dimensions of a base64 image without full decoding."""
    image = decode_base64_image(base64_string)
    if image:
        return image.size
    return None


def estimate_image_size(base64_string: str) -> int:
    """Estimate the file size of a base64 image in bytes."""
    if base64_string.startswith('data:'):
        base64_string = base64_string.split(',', 1)[1]
    # Base64 encoding increases size by ~33%
    return int(len(base64_string) * 3 / 4)


def is_url(image_string: str) -> bool:
    """Check if the image string is a URL rather than base64."""
    return image_string.startswith(('http://', 'https://'))


def extract_thumbnail_url(images: list, index: int = 0) -> Optional[str]:
    """
    Extract thumbnail URL from images list.
    Handles both URL strings and base64 data.
    For base64, returns as-is (caller should handle caching/optimization).
    """
    if not images or index >= len(images):
        return None
    
    img = images[index]
    
    # Handle dict format
    if isinstance(img, dict):
        return img.get('url') or img.get('uri') or img.get('thumbnail')
    
    # Handle string format (URL or base64)
    if isinstance(img, str):
        return img
    
    return None


class ImageOptimizer:
    """
    Image optimization service for batch processing.
    Caches optimized images to avoid re-processing.
    """
    
    def __init__(self):
        self._cache = {}  # Simple in-memory cache
        self._max_cache_size = 100
    
    def get_thumbnail(self, image_source: str) -> str:
        """
        Get or create thumbnail for an image.
        Uses cache to avoid re-processing.
        """
        # Return URLs as-is
        if is_url(image_source):
            return image_source
        
        # Check cache
        cache_key = hash(image_source[:100])  # Use first 100 chars for key
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        # Create thumbnail
        thumbnail = create_thumbnail(image_source)
        if thumbnail:
            # Add to cache (with size limit)
            if len(self._cache) >= self._max_cache_size:
                # Remove oldest entries
                self._cache.clear()
            self._cache[cache_key] = thumbnail
            return thumbnail
        
        # Return original if optimization fails
        return image_source
    
    def optimize_listing_images(self, images: list, thumbnail_only: bool = True) -> dict:
        """
        Optimize images for a listing.
        Returns dict with thumbnail and optionally optimized full images.
        """
        result = {
            "thumbnail": None,
            "images": []
        }
        
        if not images:
            return result
        
        # Get first image as thumbnail
        first_img = extract_thumbnail_url(images, 0)
        if first_img:
            result["thumbnail"] = self.get_thumbnail(first_img)
        
        # If only thumbnail needed, return early
        if thumbnail_only:
            return result
        
        # Optimize all images
        for img in images:
            img_url = extract_thumbnail_url([img], 0)
            if img_url:
                if is_url(img_url):
                    result["images"].append(img_url)
                else:
                    optimized = optimize_image(img_url)
                    result["images"].append(optimized or img_url)
        
        return result


# Singleton instance
image_optimizer = ImageOptimizer()
