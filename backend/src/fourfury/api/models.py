from pydantic import BaseModel


class StartGame(BaseModel):
    player_name: str


class Game(BaseModel):
    player_1: str
    player_2: str
