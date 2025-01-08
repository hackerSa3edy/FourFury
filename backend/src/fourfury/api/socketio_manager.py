import logging
from collections import defaultdict
from typing import Any, cast
import asyncio

import socketio  # type: ignore

from ..settings import settings
from .crud import get_game_by_id, update_game
from .models import Game, MoveInput, get_model_safe, GameMode
from .utils import make_move, validate
from ..core import AIEngine, calculate_row_by_col

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

    # Broadcast the player's move immediately
    updated_game = cast(Game, await update_game(game.id, game.model_dump()))
    await game_manager.broadcast_game(updated_game)

    # Handle AI move if in AI mode
    if game.mode == GameMode.AI and not game.finished_at:
        try:
            # Add delay before AI move
            await asyncio.sleep(0.5)

            ai = AIEngine(game.ai_difficulty or 3)
            ai_move = ai.get_best_move(game.board)
            make_move(game, ai_move)

            # Update and broadcast AI move
            updated_game = cast(Game, await update_game(game.id, game.model_dump()))
            await game_manager.broadcast_game(updated_game)
        except Exception as e:
            logger.error(f"AI move error: {e}")
            # Fallback to random valid move
            import random
            valid_cols = [col for col in range(7) if calculate_row_by_col(game.board, col) is not None]
            if valid_cols:
                make_move(game, random.choice(valid_cols))
                updated_game = cast(Game, await update_game(game.id, game.model_dump()))
                await game_manager.broadcast_game(updated_game)
