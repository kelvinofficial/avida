"""
Redis Caching Layer for Avida
High-performance caching for listings, categories, and feed data.
"""

import os
import json
import hashlib
import logging
from typing import Optional, Any, Callable
from datetime import datetime, timezone
from functools import wraps

logger = logging.getLogger(__name__)

# Try to import redis
try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    try:
        import redis
        REDIS_AVAILABLE = True
    except ImportError:
        REDIS_AVAILABLE = False
        logger.warning("Redis not installed. Caching disabled.")

# Cache configuration
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
CACHE_TTL = {
    "homepage_listings": 60,       # 60 seconds for homepage
    "categories": 3600,            # 1 hour for categories
    "featured_listings": 120,      # 2 minutes for featured
    "search_results": 30,          # 30 seconds for search
    "user_profile": 300,           # 5 minutes for profiles
    "listing_detail": 60,          # 1 minute for listing details
}

# In-memory cache fallback (when Redis unavailable)
_memory_cache = {}
_memory_cache_expires = {}


class CacheService:
    """
    Redis-backed caching service with in-memory fallback.
    Provides automatic serialization/deserialization and TTL management.
    """
    
    def __init__(self):
        self.redis_client = None
        self.connected = False
        
    async def connect(self):
        """Initialize Redis connection."""
        if not REDIS_AVAILABLE:
            logger.info("Using in-memory cache (Redis not available)")
            return False
            
        try:
            self.redis_client = redis.from_url(
                REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_timeout=2,
                socket_connect_timeout=2
            )
            # Test connection
            await self.redis_client.ping()
            self.connected = True
            logger.info("Redis cache connected successfully")
            return True
        except Exception as e:
            logger.warning(f"Redis connection failed, using memory cache: {e}")
            self.connected = False
            return False
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        try:
            if self.connected and self.redis_client:
                value = await self.redis_client.get(key)
                if value:
                    return json.loads(value)
            else:
                # Memory cache fallback
                if key in _memory_cache:
                    expires = _memory_cache_expires.get(key, 0)
                    if expires > datetime.now(timezone.utc).timestamp():
                        return _memory_cache[key]
                    else:
                        # Expired
                        del _memory_cache[key]
                        del _memory_cache_expires[key]
        except Exception as e:
            logger.debug(f"Cache get error: {e}")
        return None
    
    async def set(self, key: str, value: Any, ttl: int = 60) -> bool:
        """Set value in cache with TTL."""
        try:
            serialized = json.dumps(value, default=str)
            
            if self.connected and self.redis_client:
                await self.redis_client.setex(key, ttl, serialized)
            else:
                # Memory cache fallback
                _memory_cache[key] = value
                _memory_cache_expires[key] = datetime.now(timezone.utc).timestamp() + ttl
            return True
        except Exception as e:
            logger.debug(f"Cache set error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache."""
        try:
            if self.connected and self.redis_client:
                await self.redis_client.delete(key)
            else:
                _memory_cache.pop(key, None)
                _memory_cache_expires.pop(key, None)
            return True
        except Exception as e:
            logger.debug(f"Cache delete error: {e}")
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern."""
        count = 0
        try:
            if self.connected and self.redis_client:
                async for key in self.redis_client.scan_iter(match=pattern):
                    await self.redis_client.delete(key)
                    count += 1
            else:
                # Memory cache
                keys_to_delete = [k for k in _memory_cache.keys() if pattern.replace("*", "") in k]
                for key in keys_to_delete:
                    _memory_cache.pop(key, None)
                    _memory_cache_expires.pop(key, None)
                    count += 1
        except Exception as e:
            logger.debug(f"Cache delete_pattern error: {e}")
        return count
    
    async def invalidate_listings(self):
        """Invalidate all listing-related caches."""
        patterns = [
            "feed:*",
            "homepage:*",
            "featured:*",
            "category:*",
            "search:*"
        ]
        count = 0
        for pattern in patterns:
            count += await self.delete_pattern(pattern)
        logger.info(f"Invalidated {count} listing cache entries")
        return count


# Singleton instance
cache = CacheService()


def generate_cache_key(*args, **kwargs) -> str:
    """Generate a unique cache key from arguments."""
    key_data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
    return hashlib.md5(key_data.encode()).hexdigest()[:16]


def cached(prefix: str, ttl: int = 60):
    """
    Decorator to cache function results.
    
    Usage:
        @cached("feed", ttl=60)
        async def get_listings(category, page):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            key = f"{prefix}:{generate_cache_key(*args, **kwargs)}"
            
            # Try to get from cache
            cached_value = await cache.get(key)
            if cached_value is not None:
                return cached_value
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Store in cache
            await cache.set(key, result, ttl)
            
            return result
        return wrapper
    return decorator


# Initialize cache on module load
async def init_cache():
    """Initialize cache connection."""
    await cache.connect()
    return cache
