from __future__ import annotations

import io
import math
import random
from collections import Counter, defaultdict
from pathlib import Path

import chess
import chess.pgn

try:
    from sklearn.neural_network import MLPClassifier
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler

    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False


PIECE_VALUES: dict[chess.PieceType, int] = {
    chess.PAWN: 100,
    chess.KNIGHT: 300,
    chess.BISHOP: 320,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 20000,
}

CENTER_SQUARES = {chess.D4, chess.E4, chess.D5, chess.E5}
EXTENDED_CENTER = {
    chess.C3, chess.D3, chess.E3, chess.F3,
    chess.C4, chess.F4, chess.C5, chess.F5,
    chess.C6, chess.D6, chess.E6, chess.F6,
}


class FriendStyleBot:
    """Bot com livro de aberturas PGN + ML (MLP) + guarda tática contra blunders."""

    def __init__(self, seed: int | None = None) -> None:
        self._rng = random.Random(seed)
        self.position_moves: dict[str, Counter[str]] = defaultdict(Counter)
        self.games_loaded: int = 0
        self.moves_recorded: int = 0
        self.ratings: list[int] = []

        self._X_train: list[list[float]] = []
        self._y_train: list[int] = []
        self._model = None
        self.ml_trained: bool = False

    @staticmethod
    def position_key(board: chess.Board) -> str:
        parts = board.fen(en_passant="fen").split(" ")[:4]
        return " ".join(parts)

    @property
    def average_rating(self) -> int:
        if not self.ratings:
            return 600
        return round(sum(self.ratings) / len(self.ratings))

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

    def _record_rating_from_headers(
        self,
        game: chess.pgn.Game,
        target_color: chess.Color | None,
    ) -> None:
        if target_color == chess.WHITE:
            header_keys = ["WhiteElo"]
        elif target_color == chess.BLACK:
            header_keys = ["BlackElo"]
        else:
            header_keys = ["WhiteElo", "BlackElo"]

        for key in header_keys:
            raw = (game.headers.get(key) or "").strip()
            if raw.isdigit():
                self.ratings.append(int(raw))

    @staticmethod
    def _material_balance(board: chess.Board, perspective: chess.Color) -> float:
        score = 0
        for sq in chess.SQUARES:
            piece = board.piece_at(sq)
            if piece is None or piece.piece_type == chess.KING:
                continue
            val = PIECE_VALUES[piece.piece_type]
            score += val if piece.color == perspective else -val
        return score / 100.0

    @staticmethod
    def _worst_opponent_reply_loss(board_after_move: chess.Board, us: chess.Color) -> float:
        """Estima em centipawns (dividido por 100) a pior perda imediata de material
        que o oponente pode infligir no próximo lance em qualquer casa do tabuleiro.
        """
        if board_after_move.is_checkmate():
            return 0.0

        opp = board_after_move.turn
        worst_loss = 0.0

        for opp_move in board_after_move.legal_moves:
            if not board_after_move.is_capture(opp_move):
                continue

            if board_after_move.is_en_passant(opp_move):
                victim_val = 100
            else:
                victim = board_after_move.piece_at(opp_move.to_square)
                if victim is None or victim.color != us:
                    continue
                victim_val = PIECE_VALUES.get(victim.piece_type, 100)

            attacker = board_after_move.piece_at(opp_move.from_square)
            attacker_val = PIECE_VALUES.get(attacker.piece_type, 100) if attacker else 100

            # Verifica se temos alguma peça defendendo a casa atacada após a captura
            board_after_move.push(opp_move)
            recapturers = board_after_move.attackers(us, opp_move.to_square)
            board_after_move.pop()

            if not recapturers:
                net_loss = victim_val
            else:
                net_loss = max(0, victim_val - attacker_val)

            if net_loss > worst_loss:
                worst_loss = float(net_loss)

        return worst_loss / 100.0

    def extract_move_features(self, board: chess.Board, move: chess.Move) -> list[float]:
        """Extrai o vetor numérico de características de um lance candidato."""
        us = board.turn
        piece = board.piece_at(move.from_square)
        piece_type = piece.piece_type if piece else chess.PAWN
        moving_val = PIECE_VALUES.get(piece_type, 100) / 100.0

        is_pawn = 1.0 if piece_type == chess.PAWN else 0.0
        is_knight = 1.0 if piece_type == chess.KNIGHT else 0.0
        is_bishop = 1.0 if piece_type == chess.BISHOP else 0.0
        is_rook = 1.0 if piece_type == chess.ROOK else 0.0
        is_queen = 1.0 if piece_type == chess.QUEEN else 0.0
        is_king = 1.0 if piece_type == chess.KING else 0.0

        is_capture = 1.0 if board.is_capture(move) else 0.0
        captured_val = 0.0
        if is_capture:
            if board.is_en_passant(move):
                captured_val = 1.0
            else:
                target = board.piece_at(move.to_square)
                if target is not None:
                    captured_val = PIECE_VALUES.get(target.piece_type, 100) / 100.0

        from_rank = chess.square_rank(move.from_square)
        to_rank = chess.square_rank(move.to_square)
        delta_rank = float((to_rank - from_rank) if us == chess.WHITE else (from_rank - to_rank))
        delta_file = float(abs(chess.square_file(move.to_square) - chess.square_file(move.from_square)))

        to_center = 1.0 if move.to_square in CENTER_SQUARES else 0.0
        to_ext_center = 1.0 if move.to_square in EXTENDED_CENTER else 0.0
        is_castle = 1.0 if board.is_castling(move) else 0.0
        is_promo = 1.0 if move.promotion else 0.0

        start_rank = 0 if us == chess.WHITE else 7
        is_development = (
            1.0
            if (piece_type in (chess.KNIGHT, chess.BISHOP) and from_rank == start_rank)
            else 0.0
        )

        mat_before = self._material_balance(board, us)
        total_pieces = len(board.piece_map()) / 32.0
        move_num_norm = min(board.fullmove_number, 60) / 60.0

        board.push(move)
        opp = board.turn
        gives_check = 1.0 if board.is_check() else 0.0
        gives_mate = 1.0 if board.is_checkmate() else 0.0

        attackers = board.attackers(opp, move.to_square)
        defenders = board.attackers(us, move.to_square)
        is_attacked = 1.0 if attackers else 0.0
        is_undefended_attacked = 1.0 if (attackers and not defenders) else 0.0

        worst_reply_loss = self._worst_opponent_reply_loss(board, us)
        net_immediate_gain = captured_val - worst_reply_loss
        board.pop()

        return [
            is_pawn,
            is_knight,
            is_bishop,
            is_rook,
            is_queen,
            is_king,
            is_capture,
            captured_val,
            net_immediate_gain,
            delta_rank,
            delta_file,
            to_center,
            to_ext_center,
            is_castle,
            is_promo,
            is_development,
            gives_check,
            gives_mate,
            is_attacked,
            is_undefended_attacked,
            worst_reply_loss,
            mat_before,
            total_pieces,
            move_num_norm,
        ]

    def _collect_training_sample(self, board: chess.Board, chosen_move: chess.Move) -> None:
        legal_moves = list(board.legal_moves)
        if not legal_moves:
            return

        self._X_train.append(self.extract_move_features(board, chosen_move))
        self._y_train.append(1)

        others = [m for m in legal_moves if m != chosen_move]
        if not others:
            return

        neg_sample = self._rng.sample(others, k=min(4, len(others)))
        for neg_move in neg_sample:
            self._X_train.append(self.extract_move_features(board, neg_move))
            self._y_train.append(0)

    def fit_style_model(self) -> bool:
        """Treina uma rede neural leve (MLP) nos exemplos extraídos do PGN."""
        if not HAS_SKLEARN or len(self._X_train) < 30 or len(set(self._y_train)) < 2:
            self.ml_trained = False
            return False

        pipeline = make_pipeline(
            StandardScaler(),
            MLPClassifier(
                hidden_layer_sizes=(48, 24),
                activation="relu",
                alpha=0.02,
                max_iter=60,
                early_stopping=True,
                n_iter_no_change=6,
                random_state=42,
            ),
        )
        pipeline.fit(self._X_train, self._y_train)
        self._model = pipeline
        self.ml_trained = True
        return True

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

            self._record_rating_from_headers(game, target_color)

            board = game.board()
            for move in game.mainline_moves():
                if move not in board.legal_moves:
                    break

                if target_color is None or board.turn == target_color:
                    key = self.position_key(board)
                    self.position_moves[key][move.uci()] += 1
                    self._collect_training_sample(board, move)
                    recorded_in_batch += 1
                    self.moves_recorded += 1

                board.push(move)

            self.games_loaded += 1

        self.fit_style_model()
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
                    self._collect_training_sample(board, move)
                    recorded += 1
                    self.moves_recorded += 1

                board.push(move)
            self.games_loaded += 1

        self.fit_style_model()
        return recorded

    def _score_candidates(
        self,
        board: chess.Board,
        legal_moves: list[chess.Move],
        level: int,
    ) -> list[tuple[chess.Move, float]]:
        features_batch = [self.extract_move_features(board, m) for m in legal_moves]

        if self.ml_trained and self._model is not None:
            probs = self._model.predict_proba(features_batch)[:, 1]
            ml_probs = [float(p) for p in probs]
        else:
            ml_probs = [0.5 for _ in features_batch]

        # Nível controla o quanto o bot evita pendurar material (1=mais distraído, 10=bem atento)
        blunder_aversion = 0.55 + (level * 0.16)  # 0.71 no nível 1 até 2.15 no nível 10

        scored: list[tuple[chess.Move, float]] = []
        for move, feat, ml_prob in zip(legal_moves, features_batch, ml_probs):
            if feat[17] > 0.5:  # xeque-mate imediato
                return [(move, 100.0)]

            captured_val = feat[7]
            worst_reply_loss = feat[20]
            net_gain = captured_val - worst_reply_loss

            # Base log-prob do ML (estilo do amigo) + avaliação tática real de 1 lance
            style_score = math.log(max(1e-4, ml_prob))
            tactical_score = (captured_val * 0.75) - (worst_reply_loss * blunder_aversion)

            # Bônus leve para desenvolvimento, roque e captura limpa
            positional_nudge = (
                0.25 * feat[15]  # desenvolvimento na abertura
                + 0.35 * feat[13]  # roque
                + 0.12 * feat[11]  # centro
                + (0.20 if net_gain > 0.5 else 0.0)
            )

            total_score = style_score + tactical_score + positional_nudge
            scored.append((move, total_score))

        scored.sort(key=lambda item: item[1], reverse=True)
        return scored

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

        # 1. Posição conhecida no PGN: usa o repertório do amigo, mas filtra blunders óbvios
        if known_counts:
            weighted_moves: list[tuple[chess.Move, float]] = []
            for uci, count in known_counts.items():
                move = legal_uci_map.get(uci)
                if move is not None:
                    weight = float(count**1.5 if eff_level >= 6 else count)
                    weighted_moves.append((move, weight))

            if weighted_moves:
                moves = [item[0] for item in weighted_moves]
                weights = [item[1] for item in weighted_moves]
                return self._rng.choices(moves, weights=weights, k=1)[0]

        # 2. Fora do PGN: combina ML + visão tática de 1 lance
        scored = self._score_candidates(board, legal_moves, eff_level)
        best_score = scored[0][1]

        # Mantém apenas lances próximos do melhor score (evita sortear jogadas suicidas)
        score_window = max(0.35, 1.35 - (eff_level * 0.10))
        viable = [(m, s) for m, s in scored if (best_score - s) <= score_window][:4]

        temperature = max(0.20, 0.85 - (eff_level * 0.065))
        weights = [math.exp((s - best_score) / temperature) for _, s in viable]
        moves = [m for m, _ in viable]
        return self._rng.choices(moves, weights=weights, k=1)[0]