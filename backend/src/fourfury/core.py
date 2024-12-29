from collections.abc import Callable
from dataclasses import dataclass

from .constants import TARGET, M, N, PlayerEnum


@dataclass
class Direction:
    name: str
    condition: Callable[[int, int], bool]
    function: Callable[[list[list[int]], int, int, int], int]
    move_condition: Callable[[int, int, int], bool]
    move_row_col: Callable[[int, int, int], tuple[int, int]]


DIRECTIONS = [
    Direction(
        name="down",
        condition=lambda row, _: row < 3,
        function=lambda board, row, col, i: board[row + i][col],
        move_condition=lambda row, col, i: row + i < N,
        move_row_col=lambda row, col, i: (row + i, col),
    ),
    Direction(
        name="right",
        condition=lambda _, col: col <= 3,
        function=lambda board, row, col, i: board[row][col + i],
        move_condition=lambda row, col, i: col + i < M,
        move_row_col=lambda row, col, i: (row, col + i),
    ),
    Direction(
        name="left down",
        condition=lambda row, col: row <= 2 and col >= 3,
        function=lambda board, row, col, i: board[row + i][col - i],
        move_condition=lambda row, col, i: row + i < N and col - i >= 0,
        move_row_col=lambda row, col, i: (row + i, col - i),
    ),
    Direction(
        name="right down",
        condition=lambda row, col: row <= 2 and col <= 3,
        function=lambda board, row, col, i: board[row + i][col + i],
        move_condition=lambda row, col, i: row + i < N and col + i < M,
        move_row_col=lambda row, col, i: (row + i, col + i),
    ),
]


def init_board() -> list[list[PlayerEnum]]:
    return [[PlayerEnum.EMPTY for _ in range(M)] for _ in range(N)]


def is_valid_move(
    board: list[list[PlayerEnum]], row: int | None, column: int | None
) -> bool:
    if row is None or column is None:
        return False
    if row < 0 or row >= N or column < 0 or column >= M:
        return False
    if board[row][column] != PlayerEnum.EMPTY:
        return False

    return row == N - 1 or board[row + 1][column] != PlayerEnum.EMPTY


def detect_winner(board: list[list[int]]) -> int | None:
    def check_directions(row: int, col: int) -> bool:
        value = board[row][col]

        for direction in DIRECTIONS:
            if direction.condition(row, col):
                for i in range(1, TARGET):
                    if direction.function(board, row, col, i) != value:
                        break
                else:
                    return True
        return False

    for i in range(N):
        for j in range(M):
            if board[i][j] != PlayerEnum.EMPTY and check_directions(i, j):
                return board[i][j]
    return None
