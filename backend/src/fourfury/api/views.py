from fastapi import APIRouter, HTTPException, status

from .crud import (
    delete_all_games,
    get_all_games,
    get_game_by_id,
    join_new_game,
    start_new_game,
)
from .fields import PyObjectId
from .models import Game, StartGame

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

    return updated_game
