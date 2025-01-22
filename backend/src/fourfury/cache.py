import json
from functools import wraps
from typing import Any, Callable

import redis.asyncio as redis

from .settings import settings

redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB,
    decode_responses=True,
)


def cache_key(prefix: str, *args: Any, **kwargs: Any) -> str:
    """Generate a cache key from the function arguments"""
    key_parts = [str(arg) for arg in args]
    key_parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
    return f"{prefix}:{':'.join(key_parts)}"


def redis_cache(
    prefix: str,
    expire: int = 3600,
    serialize_fn: Callable = json.dumps,
    deserialize_fn: Callable = json.loads,
):
    """Decorator to cache function results in Redis"""

    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any):
            key = cache_key(prefix, *args, **kwargs)

            # Try to get from cache first
            cached = await redis_client.get(key)
            if cached:
                return deserialize_fn(cached)

            # If not in cache, execute function
            result = await func(*args, **kwargs)

            # Cache the result
            if result is not None:
                await redis_client.setex(key, expire, serialize_fn(result))

            return result

        return wrapper

    return decorator


async def invalidate_cache(pattern: str) -> None:
    """Invalidate all cache keys matching the pattern"""
    keys = await redis_client.keys(f"{pattern}*")
    if keys:
        await redis_client.delete(*keys)


class PresenceManager:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.PLAYER_TIMEOUT = 35  # seconds
        self.PRESENCE_PREFIX = "presence"
        self.COUNTDOWN_PREFIX = "countdown"

    async def set_player_status(
        self, game_id: str, username: str, status: str
    ) -> None:
        """Set player's status with TTL"""
        key = f"{self.PRESENCE_PREFIX}:{game_id}:{username}"
        await self.redis.setex(key, self.PLAYER_TIMEOUT, status)

    async def get_player_status(self, game_id: str, username: str) -> str:
        """Get player's current status"""
        key = f"{self.PRESENCE_PREFIX}:{game_id}:{username}"
        status = await self.redis.get(key)
        return status or "offline"

    async def start_countdown(self, game_id: str, username: str) -> None:
        """Start disconnect countdown for player"""
        key = f"{self.COUNTDOWN_PREFIX}:{game_id}:{username}"
        await self.redis.setex(key, self.PLAYER_TIMEOUT, "counting")

    async def stop_countdown(self, game_id: str, username: str) -> None:
        """Stop disconnect countdown for player"""
        key = f"{self.COUNTDOWN_PREFIX}:{game_id}:{username}"
        await self.redis.delete(key)

    async def is_countdown_active(self, game_id: str, username: str) -> bool:
        """Check if countdown is active for player"""
        key = f"{self.COUNTDOWN_PREFIX}:{game_id}:{username}"
        return await self.redis.exists(key)

    async def get_countdown_ttl(self, game_id: str, username: str) -> int:
        """Get remaining countdown time"""
        key = f"{self.COUNTDOWN_PREFIX}:{game_id}:{username}"
        return await self.redis.ttl(key)


# Initialize presence manager
presence_manager = PresenceManager(redis_client)
