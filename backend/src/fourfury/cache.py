import json
import logging
from functools import wraps
from typing import Any, Callable, Optional

import redis.asyncio as redis
from redis.asyncio import Redis

from .settings import settings

logg = logging.getLogger(__name__)

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


# Initialize presence manager
class PresenceManager:
    """
    Manages player presence and disconnection tracking for multiplayer games
    using Redis as a distributed state management system.
    """

    # Configuration constants
    PLAYER_TIMEOUT = 35  # seconds
    PRESENCE_PREFIX = "game:presence"
    COUNTDOWN_PREFIX = "game:countdown"

    def __init__(
        self, redis_client: Redis, logger: Optional[logging.Logger] = None
    ):
        """
        Initialize PresenceManager with Redis client and optional logger.

        Args:
            redis_client (Redis): Async Redis client for state management
            logger (Optional[logging.Logger]): Logger for tracking events and errors
        """
        self._redis = redis_client
        self._logger = logger or logging.getLogger(__name__)

    def _generate_key(self, prefix: str, game_id: str, username: str) -> str:
        """
        Generate a consistent Redis key with standardized format.

        Args:
            prefix (str): Key prefix (presence or countdown)
            game_id (str): Unique game session identifier
            username (str): Player username

        Returns:
            str: Formatted Redis key
        """
        return f"{prefix}:{game_id}:{username}"

    async def set_player_status(
        self, game_id: str, username: str, status: str
    ) -> bool:
        """
        Set player's status with configurable timeout.

        Args:
            game_id (str): Unique game session identifier
            username (str): Player username
            status (str): Current player status

        Returns:
            bool: Whether status was successfully set
        """
        try:
            key = self._generate_key(self.PRESENCE_PREFIX, game_id, username)
            await self._redis.set(key, status, ex=300)
            return True
        except Exception as e:
            self._logger.error(
                f"Failed to set player status: game={game_id}, "
                f"username={username}, error={e}"
            )
            return False

    async def get_player_status(
        self, game_id: str, username: str
    ) -> Optional[str]:
        """
        Retrieve current player status.

        Args:
            game_id (str): Unique game session identifier
            username (str): Player username

        Returns:
            Optional[str]: Player status or None if not found
        """
        try:
            key = self._generate_key(self.PRESENCE_PREFIX, game_id, username)
            return await self._redis.get(key)
        except Exception as e:
            self._logger.warning(
                f"Error retrieving player status: game={game_id}, "
                f"username={username}, error={e}"
            )
            return None

    async def del_player_status(self, game_id: str, username: str) -> bool:
        """
        Delete player status from Redis.

        Args:
            game_id (str): Unique game session identifier
            username (str): Player username

        Returns:
            bool: Whether status was successfully deleted
        """
        try:
            key = self._generate_key(self.PRESENCE_PREFIX, game_id, username)
            deleted_count = await self._redis.delete(key)
            return deleted_count > 0
        except Exception as e:
            self._logger.error(
                f"Failed to delete player status: game={game_id}, "
                f"username={username}, error={e}"
            )
            return False

    async def start_countdown(self, game_id: str, username: str) -> bool:
        """
        Initiate disconnection countdown for a player.

        Args:
            game_id (str): Unique game session identifier
            username (str): Player username

        Returns:
            bool: Whether countdown was successfully started
        """
        try:
            key = self._generate_key(self.COUNTDOWN_PREFIX, game_id, username)
            await self._redis.setex(key, self.PLAYER_TIMEOUT, "disconnected")
            return True
        except Exception as e:
            self._logger.error(
                f"Failed to start countdown: game={game_id}, "
                f"username={username}, error={e}"
            )
            return False

    async def stop_countdown(self, game_id: str, username: str) -> bool:
        """
        Cancel ongoing disconnection countdown.

        Args:
            game_id (str): Unique game session identifier
            username (str): Player username

        Returns:
            bool: Whether countdown was successfully stopped
        """
        try:
            key = self._generate_key(self.COUNTDOWN_PREFIX, game_id, username)
            deleted_count = await self._redis.delete(key)
            return deleted_count > 0
        except Exception as e:
            self._logger.error(
                f"Failed to stop countdown: game={game_id}, "
                f"username={username}, error={e}"
            )
            return False

    async def is_countdown_active(self, game_id: str, username: str) -> bool:
        """
        Check if disconnection countdown is currently active.

        Args:
            game_id (str): Unique game session identifier
            username (str): Player username

        Returns:
            bool: Whether countdown is active
        """
        try:
            key = self._generate_key(self.COUNTDOWN_PREFIX, game_id, username)
            return await self._redis.exists(key) == 1
        except Exception as e:
            self._logger.warning(
                f"Error checking countdown status: game={game_id}, "
                f"username={username}, error={e}"
            )
            return False

    async def get_countdown_ttl(self, game_id: str, username: str) -> int:
        """
        Retrieve remaining time for disconnection countdown.

        Args:
            game_id (str): Unique game session identifier
            username (str): Player username

        Returns:
            int: Remaining countdown time in seconds
        """
        try:
            key = self._generate_key(self.COUNTDOWN_PREFIX, game_id, username)
            ttl = await self._redis.ttl(key)
            return max(ttl, 0)  # Ensure non-negative duration
        except Exception as e:
            self._logger.warning(
                f"Error retrieving countdown TTL: game={game_id}, "
                f"username={username}, error={e}"
            )
            return 0

    async def get_opponent_status(self, game_id: str, username: str, game: Any = None) -> tuple[str | None, int | None]:
        """
        Get opponent's status and countdown.
        Returns (status, countdown_ttl)
        """
        try:
            if game:
                opponent_username = (
                    game.player_2_username
                    if username == game.player_1_username
                    else game.player_1_username
                )
                status = await self.get_player_status(game_id, opponent_username)
                countdown = await self.get_countdown_ttl(game_id, opponent_username)
                return opponent_username, status, countdown
            return None, None
        except Exception as e:
            self._logger.error(f"Error getting opponent status: {e}")
            return None, None

    @classmethod
    def configure_timeout(cls, timeout: int) -> None:
        """
        Optional method to dynamically configure timeout duration.

        Args:
            timeout (int): New timeout duration in seconds
        """
        cls.PLAYER_TIMEOUT = timeout


presence_manager = PresenceManager(redis_client, logg)
