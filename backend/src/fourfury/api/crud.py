from ..db.client import MongoDBClient
from .fields import PyObjectId
from .models import Game


async def start_new_game(player_name: str) -> Game | None:
    game_data = {"player_1": player_name}
    client = MongoDBClient()
    inserted_result = await client.insert(Game, game_data)

    return await get_game_by_id(inserted_result.inserted_id)


async def get_game_by_id(game_id: PyObjectId) -> Game | None:
    client = MongoDBClient()
    game_data = await client.get(Game, game_id)
    if game_data is None:
        return None

    return Game(**game_data)


async def get_all_games() -> list[Game]:
    client = MongoDBClient()
    games_data = await client.list(Game)
    return [Game(**game_data) for game_data in games_data]


async def delete_all_games() -> int:
    client = MongoDBClient()
    result = await client.delete_all(Game)
    return result.deleted_count
