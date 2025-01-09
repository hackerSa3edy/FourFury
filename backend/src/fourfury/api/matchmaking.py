from typing import Optional
import json

from ..cache import redis_client
from .crud import start_new_game, join_new_game, get_game_by_id
from .models import Game, GameMode

MATCHMAKING_QUEUE_KEY = "matchmaking:queue"
PLAYER_MATCH_STATUS_KEY = "matchmaking:status:{}"

class MatchMaker:
    def __init__(self):
        self.redis = redis_client

    async def add_to_queue(self, player_name: str) -> Optional[Game]:
        # Check if player is already in queue
        if await self.is_player_in_queue(player_name):
            return None

        # Try to find an existing player in queue
        waiting_player = await self.get_waiting_player()
        waiting_game_id = await self.get_player_game_id(waiting_player) if waiting_player else None

        if waiting_player and waiting_player != player_name and waiting_game_id:
            # Found a match! Remove waiting player from queue
            await self.redis.lrem(MATCHMAKING_QUEUE_KEY, 0, waiting_player)

            # Join second player to existing game
            game = await get_game_by_id(waiting_game_id)
            if game:
                game = await join_new_game(game, player_name)

            # Clear both players' status
            await self.clear_player_status(waiting_player)
            await self.clear_player_status(player_name)

            return game
        else:
            # Create new game for first player
            game = await start_new_game(player_name, mode=GameMode.ONLINE)
            if game:
                # Add player to queue and store game ID
                await self.redis.lpush(MATCHMAKING_QUEUE_KEY, player_name)
                await self.set_player_status(player_name, "waiting")
                await self.set_player_game_id(player_name, str(game.id))
                return game
            return None

    async def set_player_game_id(self, player_name: str, game_id: str) -> None:
        key = f"matchmaking:game:{player_name}"
        await self.redis.setex(key, 3600, game_id)

    async def get_player_game_id(self, player_name: str) -> Optional[str]:
        if not player_name:
            return None
        key = f"matchmaking:game:{player_name}"
        return await self.redis.get(key)

    async def cancel_matching(self, player_name: str) -> bool:
        removed = await self.redis.lrem(MATCHMAKING_QUEUE_KEY, 0, player_name)
        await self.clear_player_status(player_name)
        return removed > 0

    async def is_player_in_queue(self, player_name: str) -> bool:
        queue = await self.redis.lrange(MATCHMAKING_QUEUE_KEY, 0, -1)
        return player_name in queue

    async def get_waiting_player(self) -> Optional[str]:
        player = await self.redis.lindex(MATCHMAKING_QUEUE_KEY, -1)
        return player

    async def set_player_status(self, player_name: str, status: str) -> None:
        key = PLAYER_MATCH_STATUS_KEY.format(player_name)
        await self.redis.setex(key, 3600, status)  # Expire after 1 hour

    async def clear_player_status(self, player_name: str) -> None:
        key = PLAYER_MATCH_STATUS_KEY.format(player_name)
        await self.redis.delete(key)

    async def get_player_status(self, player_name: str) -> Optional[str]:
        key = PLAYER_MATCH_STATUS_KEY.format(player_name)
        return await self.redis.get(key)
