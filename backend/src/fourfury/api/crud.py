from typing import Any

from ..cache import invalidate_cache, redis_cache
from ..db.client import MongoDBClient
from ..session import generate_ai_username, session_manager
from .fields import PyObjectId
from .models import Game, GameMode
from .serializers import deserialize_game, serialize_game


async def start_new_game(
    player_username: str,
    player_name: str,
    mode: GameMode = GameMode.HUMAN,
    ai_difficulty: int | None = None,
    session_id: str | None = None,
) -> Game | None:
    # Validate session if provided
    if session_id and not await session_manager.validate_session(
        session_id, player_username
    ):
        return None

    # Generate AI username for AI mode
    player_2 = None
    player_2_username = None
    if mode == GameMode.AI:
        player_2 = "AI"
        player_2_username = generate_ai_username()

    game_data = {
        "player_1": player_name,
        "player_1_username": player_username,
        "player_2": player_2,
        "player_2_username": player_2_username,
        "mode": mode,
        "ai_difficulty": ai_difficulty,
    }
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


async def join_new_game(
    game: Game, player_username: str, player_name: str
) -> Game | None:
    game_data = game.model_dump() | {
        "player_2_username": player_username,
        "player_2": player_name,
    }
    return await update_game(game.id, game_data)


async def update_game(
    game_id: PyObjectId, game_data: dict[str, Any]
) -> Game | None:
    client = MongoDBClient()
    await client.update(Game, game_id, game_data)
    await invalidate_cache(f"game:{game_id}")
    await invalidate_cache("games")
    return await get_game_by_id(game_id)
