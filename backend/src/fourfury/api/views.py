import logging
from typing import cast

from fastapi import (
    APIRouter,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
    status,
)

from .crud import (
    delete_all_games,
    get_all_games,
    get_game_by_id,
    join_new_game,
    start_new_game,
    update_game,
)
from .fields import PyObjectId
from .models import Game, MoveInput, StartGame, get_model_safe
from .utils import make_move, validate
from .websocket import connection_manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/games", tags=["Games"])


@router.post("/start/", response_model=Game)
async def start_game(start_game: StartGame) -> Game:
    game = await start_new_game(start_game.player_name)
    if game is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start game",
        )
    return game


@router.get("/", response_model=list[Game])
async def get_games() -> list[Game]:
    return await get_all_games()


@router.get("/{game_id}/", response_model=Game)
async def get_game(game_id: PyObjectId) -> Game:
    game = await get_game_by_id(game_id)
    if game is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Game not found"
        )
    return game


@router.delete("/", response_model=dict[str, int])
async def delete_games() -> dict[str, int]:
    deleted_count = await delete_all_games()
    return {"deleted_count": deleted_count}


@router.post("/{game_id}/join/", response_model=Game)
async def join_game(game_id: PyObjectId, player_data: StartGame) -> Game:
    game = await get_game_by_id(game_id)
    if game is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Game not found"
        )
    if game.player_2 is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Game is already full",
        )
    updated_game = await join_new_game(game, player_data.player_name)
    if updated_game is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to join game",
        )

    await connection_manager.broadcast_game(updated_game)

    return updated_game


@router.websocket("/ws/{game_id}/")
async def websocket_endpoint(
    websocket: WebSocket, game_id: PyObjectId
) -> None:
    await connection_manager.connect(websocket, game_id)
    try:
        while True:
            move_data = await websocket.receive_json()
            game = await get_game_by_id(game_id)
            move: MoveInput | None = cast(
                MoveInput, get_model_safe(MoveInput, move_data)
            )
            if game is None:
                logger.warning("Game not found for websocket.")
                continue

            error_msg = validate(game, move)
            if error_msg:
                logger.warning(error_msg)
                continue

            game = cast(Game, game)
            move = cast(MoveInput, move)
            make_move(game, move.column)

            updated_game = cast(
                Game, await update_game(game.id, game.model_dump())
            )

            await connection_manager.broadcast_game(updated_game)
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket, game_id)
