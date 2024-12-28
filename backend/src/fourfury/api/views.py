from fastapi import APIRouter

from ..db.client import MongoDBClient
from .models import Game, StartGame

router = APIRouter(prefix="/games", tags=["Games"])


@router.post("/start", response_model=Game)
async def start_new_game(start_game: StartGame) -> Game:
    # Simulate game creation with player names
    data = {
        "player_1": start_game.player_name,
        "player_2": start_game.player_name,
    }
    client = MongoDBClient()
    inserted_result = await client.insert(Game, data)
    result = await client.get(Game, str(inserted_result.inserted_id))

    return Game(**result)


def get_current_app():
    import importlib

    module = importlib.import_module("fourfury.run")
    field = "app"
    return getattr(module, field)