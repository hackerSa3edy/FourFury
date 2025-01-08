from collections.abc import Callable
from dataclasses import dataclass

from .constants import TARGET, M, N, PlayerEnum


@dataclass
class Direction:
    name: str
    condition: Callable[[int, int], bool]
    function: Callable[[list[list[PlayerEnum]], int, int, int], int]
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


def detect_winner(board: list[list[PlayerEnum]]) -> int | None:
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


def mark_winner(board: list[list[PlayerEnum]], winner: int) -> None:
    def find_winner_cells(row: int, col: int) -> None:
        for direction in DIRECTIONS:
            line = []

            i = 0
            while (
                direction.move_condition(row, col, i)
                and direction.function(board, row, col, i) == winner
            ):
                line.append(direction.move_row_col(row, col, i))
                i += 1

            if len(line) >= 4:
                winner_cells.extend(line)

    # find winner cells
    winner_cells: list[tuple[int, int]] = []
    for i in range(N):
        for j in range(M):
            if board[i][j] == winner:
                find_winner_cells(i, j)

    # set winner
    for row, col in set(winner_cells):
        board[row][col] = PlayerEnum.WINNER


def calculate_row_by_col(
    board: list[list[PlayerEnum]], column: int
) -> int | None:
    if column < 0 or column >= M:
        return None

    for row in range(N - 1, -1, -1):
        if board[row][column] == PlayerEnum.EMPTY:
            return row
    return None


class AIEngine:
    def __init__(self, difficulty: int = 3):
        self.difficulty = min(max(difficulty, 1), 5)  # Ensure difficulty is between 1-5
        self.max_depth = self._get_depth_from_difficulty()

    def _get_depth_from_difficulty(self) -> int:
        # Map difficulty levels to search depth
        depth_map = {1: 2, 2: 3, 3: 4, 4: 5, 5: 6}
        return depth_map[self.difficulty]

    def evaluate_position(self, board: list[list[PlayerEnum]], player: PlayerEnum) -> int:
        score = 0
        opponent = PlayerEnum.PLAYER_1 if player == PlayerEnum.PLAYER_2 else PlayerEnum.PLAYER_2

        for row in range(N):
            for col in range(M):
                if board[row][col] == PlayerEnum.EMPTY:
                    continue

                for direction in DIRECTIONS:
                    if not direction.condition(row, col):
                        continue

                    player_count = opponent_count = empty_count = 0
                    line = []

                    # Check sequence of 4
                    for i in range(4):
                        if not direction.move_condition(row, col, i):
                            break
                        next_row, next_col = direction.move_row_col(row, col, i)
                        cell = board[next_row][next_col]
                        line.append(cell)

                    if len(line) != 4:
                        continue

                    # Count pieces in line
                    for cell in line:
                        if cell == player:
                            player_count += 1
                        elif cell == opponent:
                            opponent_count += 1
                        else:
                            empty_count += 1

                    # Score calculation
                    if player_count == 4:
                        score += 1000
                    elif player_count == 3 and empty_count == 1:
                        score += 100
                    elif player_count == 2 and empty_count == 2:
                        score += 10
                    elif opponent_count == 3 and empty_count == 1:
                        score -= 80  # Defensive move
                    elif opponent_count == 2 and empty_count == 2:
                        score -= 8

        # Prefer center columns
        for row in range(N):
            for col in range(M//2 - 1, M//2 + 2):
                if board[row][col] == player:
                    score += 3

        return score

    def minimax(self, board: list[list[PlayerEnum]], depth: int, alpha: int, beta: int, maximizing: bool) -> tuple[int, int]:
        winner = detect_winner(board)
        if winner is not None:
            return (1000 if winner == PlayerEnum.PLAYER_2 else -1000) * (depth + 1), -1
        if depth == 0:
            return self.evaluate_position(board, PlayerEnum.PLAYER_2), -1

        valid_moves = []
        for col in range(M):
            row = calculate_row_by_col(board, col)
            if row is not None:
                valid_moves.append((row, col))

        if not valid_moves:
            return 0, -1

        if maximizing:
            max_eval = float('-inf')
            best_move = valid_moves[0][1]
            for row, col in valid_moves:
                board[row][col] = PlayerEnum.PLAYER_2
                eval_score = self.minimax(board, depth - 1, alpha, beta, False)[0]
                board[row][col] = PlayerEnum.EMPTY
                if eval_score > max_eval:
                    max_eval = eval_score
                    best_move = col
                alpha = max(alpha, eval_score)
                if beta <= alpha:
                    break
            return max_eval, best_move
        else:
            min_eval = float('inf')
            best_move = valid_moves[0][1]
            for row, col in valid_moves:
                board[row][col] = PlayerEnum.PLAYER_1
                eval_score = self.minimax(board, depth - 1, alpha, beta, True)[0]
                board[row][col] = PlayerEnum.EMPTY
                if eval_score < min_eval:
                    min_eval = eval_score
                    best_move = col
                beta = min(beta, eval_score)
                if beta <= alpha:
                    break
            return min_eval, best_move

    def get_best_move(self, board: list[list[PlayerEnum]]) -> int:
        _, move = self.minimax(board, self.max_depth, float('-inf'), float('inf'), True)
        return move
