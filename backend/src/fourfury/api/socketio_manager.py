import asyncio
import logging
from typing import Any, cast

import socketio  # type: ignore

from ..cache import redis_client
from ..core import AIEngine, calculate_row_by_col
from ..session import session_manager
from ..settings import settings
from .crud import get_game_by_id, update_game
from .matchmaking import MatchMaker
from .models import Game, GameMode, MoveInput, get_model_safe
from .utils import make_move, validate

sio = socketio.AsyncServer(
    async_mode="asgi", cors_allowed_origins=settings.ALLOWED_ORIGINS
)
socket_app = socketio.ASGIApp(sio)

logger = logging.getLogger(__name__)

matchmaker = MatchMaker()


class GameManager:
    def __init__(self) -> None:
        self.redis = redis_client

    async def add_player(self, sid: str, game_id: str) -> None:
        await self.redis.sadd(f"game:{game_id}:players", sid)  # type: ignore
        # Set expiration to clean up inactive games (24 hours)
        await self.redis.expire(f"game:{game_id}:players", 86400)

    async def remove_player(self, sid: str, game_id: str) -> None:
        await self.redis.srem(f"game:{game_id}:players", sid)  # type: ignore

    async def get_players(self, game_id: str) -> set[str]:
        players = await self.redis.smembers(f"game:{game_id}:players")  # type: ignore
        return players

    async def broadcast_game(self, game: Game) -> None:
        game_data = game.model_dump_json()
        await sio.emit("game_update", game_data, room=str(game.id))


game_manager = GameManager()


@sio.event
async def connect(sid: str, environ: dict) -> None:
    try:
        # Get session data from handshake
        auth = environ.get("HTTP_COOKIE", "")
        if not auth:
            print(f"No auth data for client: {sid}")
            return None

        # Extract session_id and username from cookies
        cookies = dict(pair.split("=") for pair in auth.split("; "))
        session_id = cookies.get("session_id")
        username = cookies.get("username")

        if not session_id or not username:
            print(f"Missing session data for client: {sid}")
            return None

        # Validate session
        is_valid = await session_manager.validate_session(session_id, username)
        if not is_valid:
            print(f"Invalid session for client: {sid}")
            return None

        # Store session data
        await sio.save_session(
            sid, {"session_id": session_id, "username": username}
        )

        print(f"Client connected with valid session: {sid}")
        return None

    except Exception as e:
        logger.error(f"Connection error: {e}")
        return None


@sio.event
async def disconnect(sid: str) -> None:
    try:
        session = await sio.get_session(sid)
        player_username = session.get("matching_player")

        if player_username:
            await matchmaker.cancel_matching(player_username)
    except Exception as e:
        logger.error(f"Disconnect cleanup error: {e}")

    print(f"Client disconnected: {sid}")


@sio.event
async def join_game(sid: str, game_id: str) -> None:
    await sio.enter_room(sid, game_id)
    await game_manager.add_player(sid, game_id)


@sio.event
async def leave_game(sid: str, game_id: str) -> None:
    await sio.leave_room(sid, game_id)
    await game_manager.remove_player(sid, game_id)


@sio.event
async def move(sid: str, payload: dict[str, Any]) -> None:
    session = await sio.get_session(sid)
    session_id = session.get("session_id")

    move: MoveInput | None = cast(
        MoveInput, get_model_safe(MoveInput, payload)
    )

    if move is None:
        logger.warning("Invalid move payload")
        return None

    game = await get_game_by_id(move.game_id)
    if game is None:
        logger.warning("Game not found for websocket.")
        return None

    error_msg = await validate(game, move, session_id)
    if error_msg:
        logger.warning(error_msg)
        return None

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
            updated_game = cast(
                Game, await update_game(game.id, game.model_dump())
            )
            await game_manager.broadcast_game(updated_game)
        except Exception as e:
            logger.error(f"AI move error: {e}")
            # Fallback to random valid move
            import random

            valid_cols = [
                col
                for col in range(7)
                if calculate_row_by_col(game.board, col) is not None
            ]
            if valid_cols:
                make_move(game, random.choice(valid_cols))
                updated_game = cast(
                    Game, await update_game(game.id, game.model_dump())
                )
                await game_manager.broadcast_game(updated_game)


@sio.event
async def start_matching(
    sid: str, player_username: str, player_name: str, session_id: str
) -> None:
    try:
        # Try to find a match
        game = await matchmaker.add_to_queue(
            player_username, player_name, session_id
        )
        if not game:
            logger.error("Failed to create or join game")
            return None

        game_data = game.model_dump_json()

        # Join the socket room for this game
        await join_game(sid, str(game.id))

        if game.player_2_username:
            # Match found - notify both players
            await sio.emit(
                "match_found",
                {
                    "game": game_data,
                    "message": "Match found! Game starting...",
                },
                room=str(game.id),
            )
        else:
            # First player waiting - notify status
            await sio.emit(
                "matching_status",
                {
                    "game": game_data,
                    "status": "waiting",
                    "message": "Searching for opponent...",
                },
                room=sid,
            )

        # Store the game ID with the socket for cleanup
        await sio.save_session(
            sid, {"matching_player": player_username, "game_id": str(game.id)}
        )

    except Exception as e:
        logger.error(f"Matching error: {e}")
        await sio.emit(
            "matching_error", {"message": "Error during matchmaking"}, room=sid
        )


@sio.event
async def cancel_matching(sid: str) -> None:
    try:
        session = await sio.get_session(sid)
        player_username = session.get("matching_player")

        if player_username:
            cancelled = await matchmaker.cancel_matching(player_username)
            if cancelled:
                await sio.emit(
                    "matching_cancelled",
                    {"message": "Matchmaking cancelled"},
                    room=sid,
                )

            # Clear the session
            await sio.save_session(sid, {})
    except Exception as e:
        logger.error(f"Cancel matching error: {e}")
        await sio.emit(
            "matching_error",
            {"message": "Error cancelling matchmaking"},
            room=sid,
        )
