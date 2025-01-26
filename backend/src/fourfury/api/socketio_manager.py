import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, cast

import socketio  # type: ignore

from ..ai.engine import AIEngine
from ..cache import presence_manager, redis_client
from ..core import calculate_row_by_col
from ..session import session_manager
from ..settings import settings
from .crud import get_game_by_id, start_new_game, update_game
from .matchmaking import MatchMaker
from .models import Game, GameMode, MoveInput, PlayerEnum, get_model_safe
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

    async def handle_forfeit(self, game_id: str, username: str) -> None:
        """Handle player forfeit when timeout expires"""
        game = await get_game_by_id(game_id)
        if game and not game.finished_at:
            game.winner = (
                PlayerEnum.PLAYER_2
                if username == game.player_1_username
                else PlayerEnum.PLAYER_1
            )
            game.finished_at = datetime.now(timezone.utc)
            await update_game(game.id, game.model_dump())
            await self.broadcast_game(game)

            # Force player status to offline after forfeit
            await presence_manager.set_player_status(
                str(game.id), username, "offline"
            )

            # Notify players about forfeit and presence change
            await sio.emit(
                "forfeit_game",
                {
                    "username": username,
                    "message": f"{game.player_1 if game.winner != PlayerEnum.PLAYER_1 else game.player_2} has forfeited the game!",
                },
                room=str(game.id),
            )

            # Emit presence change after forfeit
            await sio.emit(
                "countdown_update",
                {"username": username, "countdown": None, "status": "offline"},
                room=str(game.id),
            )

            print(f"Player {username} forfeited game {game_id}")


game_manager = GameManager()


async def listen_for_timeouts():
    """Listen for Redis key expiration events related to player timeouts"""
    pubsub = redis_client.pubsub()
    await pubsub.psubscribe("__keyevent@0__:expired")

    while True:
        message = await pubsub.get_message(ignore_subscribe_messages=True)
        if message:
            key = message["data"]
            print(f"Timeout expired for key: {key}")
            if key.startswith(presence_manager.COUNTDOWN_PREFIX):
                _, game_id, username = key.rsplit(":", 2)
                logger.info(
                    f"Timeout expired for player {username} in game {game_id}"
                )
                print(
                    f"Timeout expired for player {username} in game {game_id}"
                )
                await game_manager.handle_forfeit(game_id, username)


# Start timeout listener when app initializes
asyncio.create_task(listen_for_timeouts())


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
        username = session.get("username")
        game_id = session.get("game_id")

        if username and game_id:
            # Handle disconnection presence
            await presence_update(
                sid, {"game_id": game_id, "status": "offline"}
            )

        if username:
            await matchmaker.cancel_matching(username)

        # Handle game disconnection if player was in a game
        if game_id and username:
            await presence_manager.set_player_status(
                game_id.split(",")[0], username, "offline"
            )

    except Exception as e:
        logger.error(f"Disconnect cleanup error: {e}")

    print(f"Client disconnected: {sid}")


@sio.event
async def join_game_room(sid: str, game_id: str, player_status: str) -> None:
    await sio.enter_room(sid, game_id)
    await game_manager.add_player(sid, game_id)

    # Track player presence immediately when joining
    session = await sio.get_session(sid)
    if session.get("username"):
        username = session["username"]
        # Set initial presence status
        await presence_manager.set_player_status(
            game_id, username, player_status
        )
        if player_status == "offline":
            # Start timeout for disconnected player
            await presence_manager.start_countdown(game_id, username)
            # Notify other players about disconnection and countdown
            await sio.emit(
                "countdown_update",
                {
                    "username": username,
                    "countdown": presence_manager.PLAYER_TIMEOUT,
                    "status": "offline",
                },
                room=game_id,
            )
        else:
            # Player reconnected - stop timeout
            await presence_manager.stop_countdown(game_id, username)
            await sio.emit(
                "countdown_update",
                {"username": username, "countdown": None, "status": "online"},
                room=game_id,
            )

        # Store game_id in session for cleanup
        await sio.save_session(sid, {**session, "game_id": game_id})


@sio.event
async def leave_game(sid: str, game_id: str) -> None:
    await sio.leave_room(sid, game_id)
    await game_manager.remove_player(sid, game_id)
    # Clear player presence
    session = await sio.get_session(sid)
    if session.get("username"):
        await presence_manager.del_player_status(game_id, session["username"])

    await sio.emit(
        "countdown_update",
        {
            "username": session["username"],
            "countdown": None,
            "status": "offline",
        },
        room=game_id,
    )


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
        await join_game_room(sid, str(game.id), "online")

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


@sio.event
async def request_rematch(sid: str, game_id: str) -> None:
    try:
        session = await sio.get_session(sid)
        username = session.get("username")
        game = await get_game_by_id(game_id)

        if not game or not username:
            return None

        # For AI games, create new game immediately
        if game.mode == GameMode.AI:
            new_game = await start_new_game(
                game.player_1_username,
                game.player_1,
                mode=GameMode.AI,
                ai_difficulty=game.ai_difficulty,
                session_id=session.get("session_id"),
            )
            if new_game:
                await sio.emit(
                    "rematch_started", {"game_id": str(new_game.id)}, room=sid
                )
            return

        # Check if opponent is still in game
        opponent_username = (
            game.player_2_username
            if username == game.player_1_username
            else game.player_1_username
        )

        is_opponent_present = (
            await presence_manager.get_player_status(
                game_id, opponent_username
            )
            == "online"
        )

        if not is_opponent_present:
            await sio.emit(
                "rematch_error",
                {"message": "Opponent has left the game"},
                room=sid,
            )
            return

        # Send rematch request to opponent
        await sio.emit(
            "rematch_requested",
            {
                "requestedBy": username,
                "requesterName": game.player_1
                if username == game.player_1_username
                else game.player_2,
            },
            room=str(game.id),
        )

    except Exception as e:
        logger.error(f"Rematch error: {e}")
        await sio.emit(
            "rematch_error", {"message": "Error setting up rematch"}, room=sid
        )


@sio.event
async def accept_rematch(sid: str, game_id: str) -> None:
    try:
        session = await sio.get_session(sid)
        username = session.get("username")
        game = await get_game_by_id(game_id)

        if not game or not username:
            return None

        new_game = await matchmaker.create_rematch(game)
        if new_game:
            await sio.emit(
                "rematch_started",
                {"game_id": str(new_game.id)},
                room=str(game.id),
            )

    except Exception as e:
        logger.error(f"Accept rematch error: {e}")
        await sio.emit(
            "rematch_error", {"message": "Error accepting rematch"}, room=sid
        )


@sio.event
async def decline_rematch(sid: str, game_id: str) -> None:
    try:
        await sio.emit("rematch_declined", room=str(game_id))
    except Exception as e:
        logger.error(f"Decline rematch error: {e}")


@sio.event
async def cancel_rematch(sid: str, game_id: str) -> None:
    try:
        # Notify ALL players in the game room that rematch was cancelled
        await sio.emit("rematch_cancelled", room=str(game_id))

        # Optionally, clean up any game-specific rematch state
        rematch_key = f"rematch:{game_id}"
        await redis_client.delete(rematch_key)
    except Exception as e:
        logger.error(f"Cancel rematch error: {e}")
        await sio.emit(
            "rematch_error",
            {"message": "Error cancelling rematch request"},
            room=sid,
        )


@sio.event
async def presence_update(sid: str, data: dict[str, Any]) -> None:
    """Handle client presence updates"""
    try:
        session = await sio.get_session(sid)
        username = session.get("username")
        game_id = data.get("game_id")
        status = data.get("status", "offline")

        if not all([username, game_id]):
            return

        # Get current game for opponent info
        game = await get_game_by_id(game_id)
        if not game:
            return

        game_id = str(game_id)
        # Update current player's status
        previous_status = await presence_manager.get_player_status(
            game_id, username
        )
        await presence_manager.set_player_status(game_id, username, status)

        # Get current player's countdown
        current_countdown = None
        if status == "offline" and previous_status != "offline":
            await presence_manager.start_countdown(game_id, username)
            current_countdown = presence_manager.PLAYER_TIMEOUT
        elif status == "online" and previous_status == "offline":
            await presence_manager.stop_countdown(game_id, username)
            current_countdown = None
        else:
            current_countdown = await presence_manager.get_countdown_ttl(
                game_id, username
            )

        # Get opponent's status and countdown
        (
            opponent_username,
            opponent_status,
            opponent_countdown,
        ) = await presence_manager.get_opponent_status(game_id, username, game)

        # Emit current player status
        await sio.emit(
            "countdown_update",
            {
                "username": username,
                "countdown": current_countdown,
                "status": status,
            },
            room=game_id,
        )

        # Emit opponent status if available
        if opponent_status is not None:
            await sio.emit(
                "countdown_update",
                {
                    "username": opponent_username,
                    "countdown": opponent_countdown,
                    "status": opponent_status,
                },
                room=game_id,
            )

    except Exception as e:
        logger.error(f"Presence update error: {e}")


@sio.event
async def forfeit(sid: str, game_id: str) -> None:
    """Handle immediate forfeit from player"""
    try:
        session = await sio.get_session(sid)
        username = session.get("username")

        if not username or not game_id:
            return

        await game_manager.handle_forfeit(game_id, username)

    except Exception as e:
        logger.error(f"Forfeit error: {e}")
