from pydantic import BaseModel

from .fields import PyObjectId


class MongoDBModel(BaseModel):
    class Meta:
        collection_name: str

    id: PyObjectId

    @classmethod
    def get_collection_name(cls) -> str:
        return cls.Meta.collection_name


class StartGame(BaseModel):
    player_name: str


class Game(MongoDBModel):
    class Meta:
        collection_name = "games"

    player_1: str
    player_2: str
