from typing import Optional

from ..cache import redis_client
from .crud import get_game_by_id, join_new_game, start_new_game
from .models import Game, GameMode

MATCHMAKING_QUEUE_KEY = "matchmaking:queue"
PLAYER_MATCH_STATUS_KEY = "matchmaking:status:{}"


class MatchMaker:
    def __init__(self):
        self.redis = redis_client

    async def add_to_queue(
        self, player_username: str, player_name: str, session_id: str
    ) -> Optional[Game]:
        # Check if player is already in queue
        if await self.is_player_in_queue(player_username):
            return None

        # Try to find an existing player in queue
        waiting_player = await self.get_waiting_player()
        waiting_game_id = (
            await self.get_player_game_id(waiting_player)
            if waiting_player
            else None
        )

        if (
            waiting_player
            and waiting_player != player_username
            and waiting_game_id
        ):
            # Found a match! Remove waiting player from queue
            await self.redis.lrem(MATCHMAKING_QUEUE_KEY, 0, waiting_player)

            # Join second player to existing game
            game = await get_game_by_id(waiting_game_id)
            if game:
                game = await join_new_game(game, player_username, player_name)

            # Clear both players' status
            await self.clear_player_status(waiting_player)
            await self.clear_player_status(player_username)

            return game
        else:
            # Create new game for first player
            game = await start_new_game(
                player_username,
                player_name,
                mode=GameMode.ONLINE,
                session_id=session_id,
            )
            if game:
                # Add player to queue and store game ID
                await self.redis.lpush(MATCHMAKING_QUEUE_KEY, player_username)
                await self.set_player_status(player_username, "waiting")
                await self.set_player_game_id(player_username, str(game.id))
                return game
            return None

    async def set_player_game_id(
        self, player_username: str, game_id: str
    ) -> None:
        key = f"matchmaking:game:{player_username}"
        await self.redis.setex(key, 3600, game_id)

    async def get_player_game_id(self, player_username: str) -> Optional[str]:
        if not player_username:
            return None
        key = f"matchmaking:game:{player_username}"
        return await self.redis.get(key)

    async def cancel_matching(self, player_username: str) -> bool:
        removed = await self.redis.lrem(
            MATCHMAKING_QUEUE_KEY, 0, player_username
        )
        await self.clear_player_status(player_username)
        return removed > 0

    async def is_player_in_queue(self, player_username: str) -> bool:
        queue = await self.redis.lrange(MATCHMAKING_QUEUE_KEY, 0, -1)
        return player_username in queue

    async def get_waiting_player(self) -> Optional[str]:
        player = await self.redis.lindex(MATCHMAKING_QUEUE_KEY, -1)
        return player

    async def set_player_status(
        self, player_username: str, status: str
    ) -> None:
        key = PLAYER_MATCH_STATUS_KEY.format(player_username)
        await self.redis.setex(key, 3600, status)  # Expire after 1 hour

    async def clear_player_status(self, player_username: str) -> None:
        key = PLAYER_MATCH_STATUS_KEY.format(player_username)
        await self.redis.delete(key)

    async def get_player_status(self, player_username: str) -> Optional[str]:
        key = PLAYER_MATCH_STATUS_KEY.format(player_username)
        return await self.redis.get(key)
