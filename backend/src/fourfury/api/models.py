from datetime import datetime, timezone
from typing import Any
from enum import Enum

from pydantic import (
    BaseModel,
    Field,
    NonNegativeInt,
    ValidationError,
    computed_field,
)
from pymongo import ASCENDING, IndexModel

from ..constants import PlayerEnum
from ..core import init_board
from .fields import PyObjectId


class MongoDBModel(BaseModel):
    class Meta:
        collection_name: str
        indexes: list[IndexModel] = []

    id: PyObjectId
    created_at: datetime = Field(default=datetime.now(timezone.utc))
    updated_at: datetime = Field(default=datetime.now(timezone.utc))

    @classmethod
    def get_collection_name(cls) -> str:
        return cls.Meta.collection_name

    @classmethod
    def get_indexes(cls) -> list[IndexModel]:
        return cls.Meta.indexes


class GameMode(str, Enum):
    HUMAN = "human"
    AI = "ai"
    ONLINE = "online"


class StartGame(BaseModel):
    player_name: str
    mode: GameMode = GameMode.HUMAN
    ai_difficulty: int | None = Field(default=3, ge=1, le=5)


class Move(BaseModel):
    row: NonNegativeInt
    column: NonNegativeInt
    value: PlayerEnum


class Game(MongoDBModel):
    class Meta:
        collection_name = "games"
        indexes = [
            IndexModel([("player_1", ASCENDING)]),
            IndexModel([("player_2", ASCENDING)]),
            IndexModel([("created_at", ASCENDING)]),
            IndexModel([("updated_at", ASCENDING)]),
        ]

    player_1: str = Field(max_length=100)
    player_2: str | None = Field(max_length=100, default=None)

    move_number: int = Field(default=1)
    board: list[list[PlayerEnum]] = Field(default=init_board())
    movees: list[Move] = Field(default_factory=list)
    winner: PlayerEnum | None = Field(default=None)

    finished_at: datetime | None = Field(default=None)

    mode: GameMode = Field(default=GameMode.HUMAN)
    ai_difficulty: int | None = Field(default=None)

    @computed_field
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
    game_id: PyObjectId
    player: str
    column: NonNegativeInt


def get_model_safe(
    model: type[BaseModel], model_data: dict[str, Any]
) -> BaseModel | None:
    try:
        return model(**model_data)
    except ValidationError:
        return None
