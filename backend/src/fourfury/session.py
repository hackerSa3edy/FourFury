import random
import string
import uuid
from typing import Optional

from .cache import redis_client

SESSION_KEY_PREFIX = "session:"
USERNAME_KEY_PREFIX = "username:"
SESSION_EXPIRY = 24 * 60 * 60  # 24 hours


def generate_session_id() -> str:
    return str(uuid.uuid4())


def generate_username() -> str:
    adjectives = ["Happy", "Lucky", "Mighty", "Swift", "Brave", "Clever"]
    nouns = ["Player", "Gamer", "Knight", "Warrior", "Hero", "Champion"]
    number = "".join(random.choices(string.digits, k=4))
    return f"{random.choice(adjectives)}{random.choice(nouns)}{number}"


def generate_ai_username() -> str:
    ai_names = ["AlphaBot", "OmegaAI", "NeoBot", "QuantumAI", "ZenBot"]
    number = "".join(random.choices(string.digits, k=4))
    return f"{random.choice(ai_names)}{number}"


class SessionManager:
    def __init__(self):
        self.redis = redis_client

    async def create_session(self) -> tuple[str, str]:
        session_id = generate_session_id()
        username = generate_username()

        # Store session-username mapping
        await self.redis.setex(
            f"{SESSION_KEY_PREFIX}{session_id}", SESSION_EXPIRY, username
        )
        await self.redis.setex(
            f"{USERNAME_KEY_PREFIX}{username}", SESSION_EXPIRY, session_id
        )

        return session_id, username

    async def get_username(self, session_id: str) -> Optional[str]:
        return await self.redis.get(f"{SESSION_KEY_PREFIX}{session_id}")

    async def get_session_id(self, username: str) -> Optional[str]:
        return await self.redis.get(f"{USERNAME_KEY_PREFIX}{username}")

    async def validate_session(self, session_id: str, username: str) -> bool:
        stored_username = await self.get_username(session_id)
        return stored_username == username

    async def refresh_session(self, session_id: str) -> None:
        username = await self.get_username(session_id)
        if username:
            await self.redis.expire(
                f"{SESSION_KEY_PREFIX}{session_id}", SESSION_EXPIRY
            )
            await self.redis.expire(
                f"{USERNAME_KEY_PREFIX}{username}", SESSION_EXPIRY
            )

    async def delete_session(self, session_id: str) -> None:
        username = await self.get_username(session_id)
        if username:
            await self.redis.delete(f"{SESSION_KEY_PREFIX}{session_id}")
            await self.redis.delete(f"{USERNAME_KEY_PREFIX}{username}")

    async def create_or_validate_session(
        self, session_id: str | None = None, username: str | None = None
    ) -> tuple[str, str]:
        # If no session provided or invalid session, create new one
        if (
            not session_id
            or not username
            or not await self.validate_session(session_id, username)
        ):
            if session_id:
                await self.delete_session(session_id)
            return await self.create_session()

        # Valid session, refresh it
        await self.refresh_session(session_id)
        return session_id, username


session_manager = SessionManager()
