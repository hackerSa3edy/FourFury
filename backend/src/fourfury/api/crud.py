from typing import Any

from ..cache import invalidate_cache, redis_cache
from ..db.client import MongoDBClient
from .fields import PyObjectId
from .models import Game
from .serializers import deserialize_game, serialize_game


async def start_new_game(player_name: str) -> Game | None:
    game_data = {"player_1": player_name}
    client = MongoDBClient()
    inserted_result = await client.insert(Game, game_data)

    return await get_game_by_id(inserted_result.inserted_id)


@redis_cache(
    "game", 3600, serialize_fn=serialize_game, deserialize_fn=deserialize_game
)
async def get_game_by_id(game_id: PyObjectId) -> Game | None:
    client = MongoDBClient()
    game_data = await client.get(Game, game_id)
    if game_data is None:
        return None

    return Game(**game_data)


@redis_cache(
    "games", 1800, serialize_fn=serialize_game, deserialize_fn=deserialize_game
)
async def get_all_games() -> list[Game]:
    client = MongoDBClient()
    games_data = await client.list(Game)
    return [Game(**game_data) for game_data in games_data]


async def delete_all_games() -> int:
    await invalidate_cache("game")
    await invalidate_cache("games")
    client = MongoDBClient()
    result = await client.delete_all(Game)
    return result.deleted_count


async def join_new_game(game: Game, player_name: str) -> Game | None:
    game_data = game.model_dump() | {"player_2": player_name}
    return await update_game(game.id, game_data)


async def update_game(
    game_id: PyObjectId, game_data: dict[str, Any]
) -> Game | None:
    client = MongoDBClient()
    await client.update(Game, game_id, game_data)
    await invalidate_cache(f"game:{game_id}")
    await invalidate_cache("games")
    return await get_game_by_id(game_id)
