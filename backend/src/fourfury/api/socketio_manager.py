import logging
from collections import defaultdict
from typing import Any, cast

import socketio  # type: ignore

from ..settings import settings
from .crud import get_game_by_id, update_game
from .models import Game, MoveInput, get_model_safe
from .utils import make_move, validate

sio = socketio.AsyncServer(
    async_mode="asgi", cors_allowed_origins=settings.ALLOWED_ORIGINS
)
socket_app = socketio.ASGIApp(sio)

logger = logging.getLogger(__name__)


class GameManager:
    def __init__(self) -> None:
        self.games: dict[str, Any] = defaultdict(lambda: defaultdict(list))

    def add_player(self, sid: str, game_id: str) -> None:
        self.games[game_id]["players"].append(sid)

    def remove_player(self, sid: str, game_id: str) -> None:
        players = self.games[game_id]["players"]
        if sid in players:
            players.remove(sid)

    async def broadcast_game(self, game: Game) -> None:
        game_data = game.model_dump_json()
        await sio.emit("game_update", game_data, room=str(game.id))


game_manager = GameManager()


@sio.event
async def connect(sid: str, environ: dict) -> None:
    print(f"Client connected: {sid}")


@sio.event
async def disconnect(sid: str) -> None:
    print(f"Client disconnected: {sid}")


@sio.event
async def join_game(sid: str, game_id: str) -> None:
    await sio.enter_room(sid, game_id)
    game_manager.add_player(sid, game_id)


@sio.event
async def leave_game(sid: str, game_id: str) -> None:
    await sio.leave_room(sid, game_id)
    game_manager.remove_player(sid, game_id)


@sio.event
async def move(sid: str, payload: dict[str, Any]) -> None:
    move: MoveInput | None = cast(
        MoveInput, get_model_safe(MoveInput, payload)
    )

    if move is None:
        logger.warning("Invalid move payload")
        return

    game = await get_game_by_id(move.game_id)
    if game is None:
        logger.warning("Game not found for websocket.")
        return

    error_msg = validate(game, move)
    if error_msg:
        logger.warning(error_msg)
        return

    game = cast(Game, game)
    make_move(game, move.column)

    updated_game = cast(Game, await update_game(game.id, game.model_dump()))

    await game_manager.broadcast_game(updated_game)
