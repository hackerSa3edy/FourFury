import logging

from fastapi import (
    APIRouter,
    Body,
    HTTPException,
    Request,
    Response,
    status,
)

from ..session import generate_ai_username, session_manager
from .crud import (
    delete_all_games,
    get_all_games,
    get_game_by_id,
    join_new_game,
    start_new_game,
)
from .fields import PyObjectId
from .models import Game, GameMode, StartGame
from .socketio_manager import game_manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/games", tags=["Games"])


@router.post("/create_session/", response_model=dict[str, str])
async def create_session(
    response: Response,
    request: Request,
) -> dict:
    session_id = request.cookies.get("session_id")
    username = request.cookies.get("username")

    session_id, username = await session_manager.create_or_validate_session(
        session_id, username
    )

    # Set cookies
    response.set_cookie(
        key="session_id", value=session_id, httponly=False, samesite="lax"
    )
    response.set_cookie(
        key="username", value=username, httponly=False, samesite="lax"
    )

    return {"session_id": session_id, "username": username}


@router.post("/start/", response_model=Game)
async def start_game(
    request: Request,
    start_game: StartGame,
) -> Game | None:
    session_id = request.cookies.get("session_id")
    username = request.cookies.get("username")

    if (
        not session_id
        or not username
        or not await session_manager.validate_session(session_id, username)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session"
        )

    if start_game.mode == GameMode.ONLINE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Online mode is not available through this endpoint",
        )

    game = await start_new_game(
        username,  # Use username from cookie
        start_game.player_name,
        start_game.mode,
        start_game.ai_difficulty if start_game.mode == GameMode.AI else None,
        session_id,
    )
    if game is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start game",
        )

    # If AI mode, automatically set player 2 as "AI"
    if game.mode == GameMode.AI:
        game = await join_new_game(game, generate_ai_username(), "AI")

    return game


@router.get("/", response_model=list[Game])
async def get_games(request: Request) -> list[Game]:
    session_id = request.cookies.get("session_id")
    username = request.cookies.get("username")

    if (
        not session_id
        or not username
        or not await session_manager.validate_session(session_id, username)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session"
        )
    return await get_all_games()


@router.get("/{game_id}/", response_model=Game)
async def get_game(
    request: Request,
    game_id: PyObjectId,
) -> Game:
    session_id = request.cookies.get("session_id")
    username = request.cookies.get("username")

    if (
        not session_id
        or not username
        or not await session_manager.validate_session(session_id, username)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session"
        )
    game = await get_game_by_id(game_id)
    if game is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Game not found"
        )

    # Check if the requesting user is a player in the game
    if game.player_2_username is not None:
        if (
            username != game.player_1_username
            and username != game.player_2_username
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a player in this game",
            )

    return game


@router.delete("/", response_model=dict[str, int])
async def delete_games() -> dict[str, int]:
    deleted_count = await delete_all_games()
    return {"deleted_count": deleted_count}


@router.post("/{game_id}/join/", response_model=Game)
async def join_game(
    request: Request,
    game_id: PyObjectId,
    player_name: str = Body(
        ..., embed=True
    ),  # Change this line to accept from body
) -> Game:
    session_id = request.cookies.get("session_id")
    username = request.cookies.get("username")

    if (
        not session_id
        or not username
        or not await session_manager.validate_session(session_id, username)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session"
        )

    game = await get_game_by_id(game_id)
    if game is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Game not found"
        )

    # Add check to prevent self-joining
    if game.player_1_username == username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot join your own game",
        )

    if game.mode == GameMode.ONLINE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot join online games through this endpoint",
        )
    if game.player_2 is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Game is already full",
        )
    updated_game = await join_new_game(
        game, username, player_name
    )  # Use username from cookie
    if updated_game is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to join game",
        )

    await game_manager.broadcast_game(updated_game)
    return updated_game
