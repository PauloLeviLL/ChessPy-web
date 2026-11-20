from __future__ import annotations

import io
import random
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path

import chess
import chess.pgn


PIECE_VALUES: dict[chess.PieceType, int] = {
    chess.PAWN: 100,
    chess.KNIGHT: 300,
    chess.BISHOP: 320,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 20000,
}


@dataclass
class PlayerStyleProfile:
    """Resumo estatístico dos hábitos de jogo extraídos do PGN do amigo."""

    total_moves: int = 0
    captures: int = 0
    checks: int = 0
    castles: int = 0
    piece_counts: Counter[chess.PieceType] = field(default_factory=Counter)
    opening_piece_counts: Counter[chess.PieceType] = field(default_factory=Counter)
    # Direção vertical média de peões/peças do ponto de vista do jogador (+1 = avança, -1 = recua)
    forward_steps: int = 0

    def record_move(self, board: chess.Board, move: chess.Move) -> None:
        piece = board.piece_at(move.from_square)
        if piece is None:
            return

        self.total_moves += 1
        is_cap = board.is_capture(move)
        gives_chk = board.gives_check(move)
        is_castle = board.is_castling(move)

        if is_cap:
            self.captures += 1
        if gives_chk:
            self.checks += 1
        if is_castle:
            self.castles += 1

        self.piece_counts[piece.piece_type] += 1
        if board.fullmove_number <= 10:
            self.opening_piece_counts[piece.piece_type] += 1

        from_rank = chess.square_rank(move.from_square)
        to_rank = chess.square_rank(move.to_square)
        delta_rank = (to_rank - from_rank) if piece.color == chess.WHITE else (from_rank - to_rank)
        self.forward_steps += delta_rank

    @property
    def capture_rate(self) -> float:
        return (self.captures / self.total_moves) if self.total_moves else 0.15

    @property
    def check_rate(self) -> float:
        return (self.checks / self.total_moves) if self.total_moves else 0.05

    @property
    def aggression_bias(self) -> float:
        """Retorna um valor entre -1.0 (recuado/passivo) e +1.0 (avança/agressivo)."""
        if self.total_moves == 0:
            return 0.0
        avg_step = self.forward_steps / self.total_moves
        return max(-1.0, min(1.0, avg_step / 1.2))

    def piece_affinity(self, piece_type: chess.PieceType, opening: bool = False) -> float:
        """Frequência relativa com que o jogador move esse tipo de peça."""
        if opening and sum(self.opening_piece_counts.values()) >= 8:
            total = sum(self.opening_piece_counts.values())
            count = self.opening_piece_counts[piece_type]
            return count / total
        if self.total_moves == 0:
            return 1.0 / 6.0
        return self.piece_counts[piece_type] / self.total_moves


class FriendStyleBot:
    """Bot que imita o repertório e os padrões de estilo do jogador no PGN."""

    def __init__(self, seed: int | None = None) -> None:
        self._rng = random.Random(seed)
        self.position_moves: dict[str, Counter[str]] = defaultdict(Counter)
        self.style = PlayerStyleProfile()
        self.games_loaded: int = 0
        self.moves_recorded: int = 0

    @staticmethod
    def position_key(board: chess.Board) -> str:
        """Chave canônica da posição (peças, turno, roques e en passant)."""
        parts = board.fen(en_passant="fen").split(" ")[:4]
        return " ".join(parts)

    @staticmethod
    def _resolve_target_color(
        game: chess.pgn.Game,
        player_color: chess.Color | None = None,
        player_name: str | None = None,
    ) -> chess.Color | str | None:
        if player_color is not None:
            return player_color

        if player_name:
            target = player_name.strip().lower()
            white = (game.headers.get("White") or "").strip().lower()
            black = (game.headers.get("Black") or "").strip().lower()

            if white == target and black != target:
                return chess.WHITE
            if black == target and white != target:
                return chess.BLACK
            if white == target and black == target:
                return None
            return "SKIP"

        return None

    def train_from_pgn_text(
        self,
        pgn_text: str,
        player_color: chess.Color | None = None,
        player_name: str | None = None,
    ) -> int:
        stream = io.StringIO(pgn_text)
        recorded_in_batch = 0

        while True:
            game = chess.pgn.read_game(stream)
            if game is None:
                break

            target_color = self._resolve_target_color(
                game,
                player_color=player_color,
                player_name=player_name,
            )

            if target_color == "SKIP":
                continue

            board = game.board()
            for move in game.mainline_moves():
                if move not in board.legal_moves:
                    break

                if target_color is None or board.turn == target_color:
                    key = self.position_key(board)
                    self.position_moves[key][move.uci()] += 1
                    self.style.record_move(board, move)
                    recorded_in_batch += 1
                    self.moves_recorded += 1

                board.push(move)

            self.games_loaded += 1

        return recorded_in_batch

    def train_from_pgn_file(
        self,
        pgn_path: str | Path,
        player_color: chess.Color | None = None,
        player_name: str | None = None,
    ) -> int:
        path = Path(pgn_path)
        if not path.exists():
            return 0
        content = path.read_text(encoding="utf-8", errors="replace")
        return self.train_from_pgn_text(
            content,
            player_color=player_color,
            player_name=player_name,
        )

    def train_from_move_sequences(
        self,
        sequences: list[list[str]],
        player_color: chess.Color | None = None,
    ) -> int:
        recorded = 0
        for seq in sequences:
            board = chess.Board()
            for token in seq:
                move: chess.Move | None = None
                try:
                    parsed = board.parse_san(token)
                    if parsed in board.legal_moves:
                        move = parsed
                except ValueError:
                    try:
                        candidate = chess.Move.from_uci(token)
                        if candidate in board.legal_moves:
                            move = candidate
                    except ValueError:
                        move = None

                if move is None:
                    break

                if player_color is None or board.turn == player_color:
                    key = self.position_key(board)
                    self.position_moves[key][move.uci()] += 1
                    self.style.record_move(board, move)
                    recorded += 1
                    self.moves_recorded += 1

                board.push(move)
            self.games_loaded += 1
        return recorded

    def _style_score_move(self, board: chess.Board, move: chess.Move, level: int) -> float:
        """Avalia o quanto um lance se parece com o estilo do jogador no PGN."""
        piece = board.piece_at(move.from_square)
        if piece is None:
            return 0.0

        score = 0.0
        is_opening = board.fullmove_number <= 10
        affinity = self.style.piece_affinity(piece.piece_type, opening=is_opening)

        # 1. Afinidade com o tipo de peça que o amigo costuma mover
        score += affinity * 180.0

        # 2. Alinhamento com a taxa de capturas do amigo
        is_cap = board.is_capture(move)
        if is_cap:
            captured = board.piece_at(move.to_square)
            cap_val = PIECE_VALUES.get(captured.piece_type, 100) if captured else 100
            att_val = PIECE_VALUES.get(piece.piece_type, 100)
            score += (cap_val * 0.25) * (0.6 + self.style.capture_rate * 2.0)
            # Evita trocar dama por peão sem motivo
            if cap_val < att_val - 150:
                score -= 90.0

        # 3. Alinhamento com a frequência de xeques do amigo
        if board.gives_check(move):
            score += 35.0 * (0.5 + self.style.check_rate * 3.0)

        # 4. Tendência de avanço / agressividade do amigo
        from_rank = chess.square_rank(move.from_square)
        to_rank = chess.square_rank(move.to_square)
        delta_rank = (to_rank - from_rank) if piece.color == chess.WHITE else (from_rank - to_rank)
        score += delta_rank * self.style.aggression_bias * 28.0

        # 5. Checagem rápida de segurança: não pendurar peça de alto valor à toa
        board.push(move)
        opp = board.turn
        if board.is_checkmate():
            board.pop()
            return 50_000.0

        attackers = board.attackers(opp, move.to_square)
        defenders = board.attackers(piece.color, move.to_square)
        if attackers and not defenders:
            moving_val = PIECE_VALUES.get(piece.piece_type, 100)
            # Níveis mais altos evitam melhor pendurar peças grandes
            hang_factor = 0.45 if level <= 3 else 0.85
            score -= moving_val * hang_factor
        board.pop()

        # Variação natural para simular escolhas humanas
        score += self._rng.uniform(-22.0, 22.0)
        return score

    def choose_move(
        self,
        board: chess.Board,
        level: int | None = None,
    ) -> chess.Move | None:
        legal_moves = list(board.legal_moves)
        if not legal_moves:
            return None

        eff_level = 4 if level is None else max(1, min(10, int(level)))
        legal_uci_map = {move.uci(): move for move in legal_moves}
        key = self.position_key(board)
        known_counts = self.position_moves.get(key)

        # 1. Posição conhecida no PGN: escolhe pelos lances reais do amigo
        if known_counts:
            weighted_moves: list[tuple[chess.Move, float]] = []
            for uci, count in known_counts.items():
                move = legal_uci_map.get(uci)
                if move is not None:
                    weight = float(count**2 if eff_level >= 6 else count)
                    weighted_moves.append((move, weight))

            if weighted_moves:
                moves = [item[0] for item in weighted_moves]
                weights = [item[1] for item in weighted_moves]
                return self._rng.choices(moves, weights=weights, k=1)[0]

        # 2. Posição fora do PGN: pontua lances pelo perfil de estilo extraído do PGN
        scored = [(self._style_score_move(board, m, eff_level), m) for m in legal_moves]
        scored.sort(key=lambda item: item[0], reverse=True)

        top_k = scored[: min(4, len(scored))]
        best_score = top_k[0][0]
        spread = 140.0 if eff_level <= 4 else 85.0
        candidates = [
            (move, max(1.0, s - (best_score - spread)))
            for s, move in top_k
            if (best_score - s) <= spread
        ]

        if not candidates:
            return scored[0][1]

        moves = [m for m, _ in candidates]
        weights = [w for _, w in candidates]
        return self._rng.choices(moves, weights=weights, k=1)[0]