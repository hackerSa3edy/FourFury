from ..constants import M, N, PlayerEnum
from ..core import DIRECTIONS, calculate_row_by_col, detect_winner


class AIEngine:
    def __init__(self, difficulty: int = 3):
        self.difficulty = min(
            max(difficulty, 1), 5
        )  # Ensure difficulty is between 1-5
        self.max_depth = self._get_depth_from_difficulty()

    def _get_depth_from_difficulty(self) -> int:
        # Map difficulty levels to search depth
        depth_map = {1: 2, 2: 3, 3: 4, 4: 5, 5: 6}
        return depth_map[self.difficulty]

    def evaluate_position(
        self, board: list[list[PlayerEnum]], player: PlayerEnum
    ) -> int:
        score = 0
        opponent = (
            PlayerEnum.PLAYER_1
            if player == PlayerEnum.PLAYER_2
            else PlayerEnum.PLAYER_2
        )

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
                        next_row, next_col = direction.move_row_col(
                            row, col, i
                        )
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
            for col in range(M // 2 - 1, M // 2 + 2):
                if board[row][col] == player:
                    score += 3

        return score

    def minimax(
        self,
        board: list[list[PlayerEnum]],
        depth: int,
        alpha: float,
        beta: float,
        maximizing: bool,
    ) -> tuple[float, int]:
        winner = detect_winner(board)
        if winner is not None:
            return (1000.0 if winner == PlayerEnum.PLAYER_2 else -1000.0) * (
                depth + 1
            ), -1
        if depth == 0:
            return float(
                self.evaluate_position(board, PlayerEnum.PLAYER_2)
            ), -1

        valid_moves = []
        for col in range(M):
            row = calculate_row_by_col(board, col)
            if row is not None:
                valid_moves.append((row, col))

        if not valid_moves:
            return 0.0, -1

        if maximizing:
            max_eval = float("-inf")
            best_move = valid_moves[0][1]
            for row, col in valid_moves:
                board[row][col] = PlayerEnum.PLAYER_2
                eval_score = self.minimax(
                    board, depth - 1, alpha, beta, False
                )[0]
                board[row][col] = PlayerEnum.EMPTY
                if eval_score > max_eval:
                    max_eval = eval_score
                    best_move = col
                alpha = max(alpha, eval_score)
                if beta <= alpha:
                    break
            return max_eval, best_move
        else:
            min_eval = float("inf")
            best_move = valid_moves[0][1]
            for row, col in valid_moves:
                board[row][col] = PlayerEnum.PLAYER_1
                eval_score = self.minimax(board, depth - 1, alpha, beta, True)[
                    0
                ]
                board[row][col] = PlayerEnum.EMPTY
                if eval_score < min_eval:
                    min_eval = eval_score
                    best_move = col
                beta = min(beta, eval_score)
                if beta <= alpha:
                    break
            return min_eval, best_move

    def get_best_move(self, board: list[list[PlayerEnum]]) -> int:
        _, move = self.minimax(
            board, self.max_depth, float("-inf"), float("inf"), True
        )
        return move
