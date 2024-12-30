from datetime import datetime, timezone

from pydantic import BaseModel, Field

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
    winner: str | None = Field(default=None)

    finished_at: datetime | None = Field(default=None)
