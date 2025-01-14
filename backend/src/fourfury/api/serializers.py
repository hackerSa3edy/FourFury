import json
from datetime import datetime

from ..constants import PlayerEnum
from .fields import PyObjectId
from .models import Game


# Custom JSON encoder to handle special types
class GameEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, PyObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, PlayerEnum):
            return obj.value
        return super().default(obj)


def serialize_game(game: Game) -> str:
    return json.dumps(game.model_dump(), cls=GameEncoder)


def deserialize_game(game_str: str) -> Game:
    game_dict = json.loads(game_str)
    # Convert board values back to PlayerEnum
    if "board" in game_dict:
        game_dict["board"] = [
            [PlayerEnum(cell) for cell in row] for row in game_dict["board"]
        ]
    if "winner" in game_dict and game_dict["winner"] is not None:
        game_dict["winner"] = PlayerEnum(game_dict["winner"])
    return Game(**game_dict)
