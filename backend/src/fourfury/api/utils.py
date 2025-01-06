from datetime import datetime, timezone

from ..constants import M, N, PlayerEnum
from ..core import (
    calculate_row_by_col,
    detect_winner,
    is_valid_move,
    mark_winner,
)
from .exceptions import (
    CustomError,
    GameFinishedError,
    GameNotFoundError,
    MoveNotValidError,
    NotAllPlayersJoinedError,
    WrongPlayerToMoveError,
)
from .models import Game, Move, MoveInput


def make_move(game: Game, column: int) -> None:
    row = calculate_row_by_col(game.board, column)
    if row is None:
        raise MoveNotValidError()
    move_value = game.next_player_to_move_sign
    move = Move(row=row, column=column, value=move_value)
    game.movees.append(move)
    game.board[row][column] = move_value
    game.move_number += 1

    winner = detect_winner(game.board)
    if winner:
        mark_winner(game.board, winner)
        game.winner = PlayerEnum(winner)
        game.finished_at = datetime.now(timezone.utc)
    elif game.move_number == N * M + 1:
        game.winner = None
        game.finished_at = datetime.now(timezone.utc)


def validate(game: Game, move_input: MoveInput | None) -> str | None:
    try:
        validate_game(game)
        validate_move(game, move_input)
    except CustomError as e:
        return str(e)

    return None


def validate_game(game: Game | None) -> None:
    if game is None:
        raise GameNotFoundError()

    if game.player_2 is None:
        raise NotAllPlayersJoinedError()

    if game.finished_at:
        raise GameFinishedError()


def validate_move(game: Game, move: MoveInput | None) -> None:
    if move is None:
        raise MoveNotValidError()

    if move.player != game.next_player_to_move_username:
        raise WrongPlayerToMoveError()

    row = calculate_row_by_col(game.board, move.column)
    if not is_valid_move(game.board, row, move.column):
        raise MoveNotValidError()
