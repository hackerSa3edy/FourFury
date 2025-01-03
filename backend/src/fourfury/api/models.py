from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field, NonNegativeInt, ValidationError

from ..constants import PlayerEnum
from ..core import init_board
from .fields import PyObjectId


class MongoDBModel(BaseModel):
    class Meta:
        collection_name: str

    id: PyObjectId
    created_at: datetime = Field(default=datetime.now(timezone.utc))
    updated_at: datetime = Field(default=datetime.now(timezone.utc))

    @classmethod
    def get_collection_name(cls) -> str:
        return cls.Meta.collection_name


class StartGame(BaseModel):
    player_name: str


class Game(MongoDBModel):
    class Meta:
        collection_name = "games"

    player_1: str = Field(max_length=100)
    player_2: str | None = Field(max_length=100, default=None)

    move_number: int = Field(default=1)
    board: list[list[PlayerEnum]] = Field(default=init_board())
    winner: PlayerEnum | None = Field(default=None)

    finished_at: datetime | None = Field(default=None)

    @property
    def next_player_to_move_username(self) -> str | None:
        return self.player_1 if self.move_number % 2 else self.player_2

    @property
    def next_player_to_move_sign(self) -> PlayerEnum:
        return (
            PlayerEnum.PLAYER_1
            if self.move_number % 2
            else PlayerEnum.PLAYER_2
        )


class MoveInput(BaseModel):
    player: str
    column: NonNegativeInt


def get_model_safe(
    model: type[BaseModel], model_data: dict[str, Any]
) -> BaseModel | None:
    try:
        return model(**model_data)
    except ValidationError:
        return None
