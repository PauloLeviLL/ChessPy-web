import math
import os
import shutil
from pathlib import Path
from typing import Any

import chess
import chess.engine


PIECE_PT_NAMES = {
    chess.PAWN: "peão",
    chess.KNIGHT: "cavalo",
    chess.BISHOP: "bispo",
    chess.ROOK: "torre",
    chess.QUEEN: "dama",
    chess.KING: "rei",
}

CLASSIFICATION_META = {
    "brilliant": {
        "symbol": "!!",
        "label": "Brilhante",
        "desc": "Sacrifício ou recurso tático brilhante que mantém ou amplia a vantagem.",
    },
    "great": {
        "symbol": "!",
        "label": "Grande Lance",
        "desc": "Lance preciso e decisivo que encontra a melhor continuação.",
    },
    "best": {
        "symbol": "★",
        "label": "Melhor Lance",
        "desc": "O melhor lance segundo a engine.",
    },
    "excellent": {
        "symbol": "!",
        "label": "Excelente",
        "desc": "Lance muito preciso dentro da margem esperada.",
    },
    "good": {
        "symbol": "✓",
        "label": "Bom",
        "desc": "Lance sólido que mantém a avaliação da posição.",
    },
    "book": {
        "symbol": "B",
        "label": "Livro",
        "desc": "Lance teórico conhecido de abertura.",
    },
    "inaccuracy": {
        "symbol": "?!",
        "label": "Imprecisão",
        "desc": "Permite ao adversário melhorar a posição.",
    },
    "mistake": {
        "symbol": "?",
        "label": "Erro",
        "desc": "Cede vantagem relevante ao adversário.",
    },
    "blunder": {
        "symbol": "??",
        "label": "Capivarada",
        "desc": "Erro grave que compromete a partida.",
    },
}

# Banco compacto de linhas teóricas de abertura (sequências SAN)
OPENING_BOOK_LINES: dict[tuple[str, ...], str] = {
    ("e4",): "Abertura do Peão do Rei",
    ("e4", "e5"): "Jogo Aberto",
    ("e4", "e5", "Nf3"): "Abertura do Cavalo do Rei",
    ("e4", "e5", "Nf3", "Nc6"): "Defesa Simétrica do Cavalo",
    ("e4", "e5", "Nf3", "Nc6", "Bb5"): "Abertura Ruy Lopez",
    ("e4", "e5", "Nf3", "Nc6", "Bb5", "a6"): "Ruy Lopez: Defesa Morphy",
    ("e4", "e5", "Nf3", "Nc6", "Bc4"): "Abertura Italiana",
    ("e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"): "Giuoco Piano",
    ("e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6"): "Defesa Dois Cavalos",
    ("e4", "e5", "Nf3", "Nc6", "d4"): "Abertura Escocesa",
    ("e4", "e5", "Nf3", "Nf6"): "Defesa Petrov",
    ("e4", "c5"): "Defesa Siciliana",
    ("e4", "c5", "Nf3"): "Siciliana Aberta",
    ("e4", "c5", "Nf3", "d6"): "Siciliana: Variante Najdorf/Clássica",
    ("e4", "c5", "Nf3", "Nc6"): "Siciliana: Variante Nc6",
    ("e4", "c5", "Nf3", "e6"): "Siciliana: Variante Paulsen/Taimanov",
    ("e4", "c5", "c3"): "Siciliana Alapin",
    ("e4", "e6"): "Defesa Francesa",
    ("e4", "e6", "d4", "d5"): "Defesa Francesa: Linha Principal",
    ("e4", "c6"): "Defesa Caro-Kann",
    ("e4", "c6", "d4", "d5"): "Defesa Caro-Kann: Linha Principal",
    ("e4", "d5"): "Defesa Escandinava",
    ("e4", "d6"): "Defesa Pirc",
    ("e4", "g6"): "Defesa Moderna",
    ("d4",): "Abertura do Peão da Dama",
    ("d4", "d5"): "Jogo Fechado",
    ("d4", "d5", "c4"): "Gambito da Dama",
    ("d4", "d5", "c4", "e6"): "Gambito da Dama Recusado",
    ("d4", "d5", "c4", "c6"): "Defesa Eslava",
    ("d4", "d5", "c4", "dxc4"): "Gambito da Dama Aceito",
    ("d4", "d5", "Bf4"): "Sistema Londres",
    ("d4", "Nf6"): "Defesa Índia",
    ("d4", "Nf6", "c4", "g6"): "Defesa Índia do Rei",
    ("d4", "Nf6", "c4", "e6"): "Defesa Nimzoíndia / Índia da Dama",
    ("d4", "Nf6", "c4", "e6", "Nc3", "Bb4"): "Defesa Nimzoíndia",
    ("d4", "Nf6", "Bf4"): "Sistema Londres",
    ("c4",): "Abertura Inglesa",
    ("c4", "e5"): "Abertura Inglesa: Siciliana Invertida",
    ("c4", "Nf6"): "Abertura Inglesa: Sistema Índio",
    ("Nf3",): "Abertura Réti",
    ("Nf3", "d5", "c4"): "Abertura Réti",
}


def find_stockfish_binary() -> str | None:
    env_path = os.getenv("STOCKFISH_PATH")
    if env_path and os.path.isfile(env_path):
        if os.name != "nt" and not os.access(env_path, os.X_OK):
            try:
                os.chmod(env_path, 0o755)
            except OSError:
                pass
        if os.name == "nt" or not env_path.lower().endswith(".exe"):
            return env_path

    ignored_suffixes = (
        ".tar",
        ".gz",
        ".xz",
        ".zip",
        ".archive",
        ".md",
        ".txt",
        ".nnue",
        ".py",
        ".db",
        ".json",
    )

    resolved_file = Path(__file__).resolve()
    search_roots: list[Path] = [
        Path("/opt/render/project/src"),
        Path.cwd(),
        *resolved_file.parents,
    ]

    seen_roots: set[Path] = set()
    for root in search_roots:
        if root in seen_roots:
            continue
        seen_roots.add(root)

        bin_dir = root / "bin"
        if not bin_dir.is_dir():
            continue

        for item in sorted(bin_dir.rglob("*")):
            if not item.is_file():
                continue
            name_lower = item.name.lower()
            if name_lower in {"authors", "copying", "license", "readme"}:
                continue
            if name_lower.endswith(ignored_suffixes):
                continue

            if os.name == "nt":
                if name_lower.endswith(".exe") or "stockfish" in name_lower:
                    return str(item)
            else:
                if name_lower.endswith(".exe") or "stockfish" not in name_lower:
                    continue
                if not os.access(item, os.X_OK):
                    try:
                        os.chmod(item, 0o755)
                    except OSError:
                        pass
                return str(item)

    if os.name == "nt":
        for fallback in (
            "bin/stockfish.exe",
            "../bin/stockfish.exe",
            shutil.which("stockfish"),
        ):
            if fallback and os.path.isfile(fallback):
                return fallback
    else:
        for fallback in (
            shutil.which("stockfish"),
            "/usr/games/stockfish",
            "/usr/bin/stockfish",
            "/usr/local/bin/stockfish",
        ):
            if fallback and os.path.isfile(fallback):
                if not os.access(fallback, os.X_OK):
                    try:
                        os.chmod(fallback, 0o755)
                    except OSError:
                        pass
                return fallback

    return None


def score_to_white_cp_and_text(score: chess.engine.PovScore) -> tuple[int, str]:
    white_score = score.white()
    if white_score.is_mate():
        mate_in = white_score.mate()
        cp = 10000 if (mate_in is not None and mate_in > 0) else -10000
        text = (
            f"+M{mate_in}"
            if (mate_in is not None and mate_in > 0)
            else f"-M{abs(mate_in or 0)}"
        )
        return cp, text

    cp = white_score.score(mate_score=10000) or 0
    pawns = cp / 100.0
    text = f"+{pawns:.1f}" if pawns > 0 else f"{pawns:.1f}"
    return cp, text


def cp_to_expected_points(cp: int) -> float:
    """
    Converte centipeões em probabilidade de vitória,
    retornando um valor entre 0.0 e 1.0.

    Utiliza a curva logística publicada pelo Lichess.
    O resultado não representa uma probabilidade de vitória
    real de um jogador específico, pois não considera rating.
    """
    cp = max(-1000, min(1000, int(cp)))

    win_chances = (
        2.0 / (1.0 + math.exp(-0.00368208 * cp))
    ) - 1.0

    win_percent = 50.0 + 50.0 * win_chances

    return max(0.0, min(1.0, win_percent / 100.0))


def material_points(board: chess.Board, color: chess.Color) -> int:
    weights = {
        chess.PAWN: 1,
        chess.KNIGHT: 3,
        chess.BISHOP: 3,
        chess.ROOK: 5,
        chess.QUEEN: 9,
    }
    return sum(len(board.pieces(pt, color)) * w for pt, w in weights.items())


def is_piece_sacrificed(
    board_before: chess.Board,
    move: chess.Move,
    mover_color: chess.Color,
) -> bool:
    """
    Verifica se o lance entrega material líquido ou coloca uma peça valiosa em prise
    com compensação tática.
    """
    piece_values = {
        chess.PAWN: 1,
        chess.KNIGHT: 3,
        chess.BISHOP: 3,
        chess.ROOK: 5,
        chess.QUEEN: 9,
        chess.KING: 0,
    }
    moving_piece = board_before.piece_at(move.from_square)
    if not moving_piece or moving_piece.piece_type in (chess.PAWN, chess.KING):
        return False

    captured = board_before.piece_at(move.to_square)
    captured_val = piece_values[captured.piece_type] if captured else 0
    moving_val = piece_values[moving_piece.piece_type]

    test_board = board_before.copy()
    test_board.push(move)
    opp_color = not mover_color

    if test_board.is_attacked_by(opp_color, move.to_square):
        defenders = len(test_board.attackers(mover_color, move.to_square))
        attackers = len(test_board.attackers(opp_color, move.to_square))
        if (moving_val - captured_val >= 2) and (attackers > defenders or captured_val == 0):
            return True

    return False


def detect_fork_squares(
    board_after: chess.Board,
    target_sq: chess.Square,
    mover_color: chess.Color,
) -> list[str]:
    """Retorna nomes das peças valiosas atacadas simultaneamente pela peça que acabou de mover."""
    valuable = {chess.KNIGHT, chess.BISHOP, chess.ROOK, chess.QUEEN, chess.KING}
    opp_color = not mover_color
    attacked_names: list[str] = []

    for sq in board_after.attacks(target_sq):
        p = board_after.piece_at(sq)
        if p and p.color == opp_color and p.piece_type in valuable:
            attacked_names.append(f"{PIECE_PT_NAMES[p.piece_type]} em {chess.square_name(sq)}")

    return attacked_names if len(attacked_names) >= 2 else []


def generate_coach_commentary(
    board_before: chess.Board,
    played_move: chess.Move,
    best_move: chess.Move | None,
    classification: str,
    player_ep_before: float,
    player_ep_after: float,
    cp_after: int,
    mover_is_white: bool,
    opening_name: str | None,
) -> str:
    """
    Camada 3 ("Treinador"): árvore de decisão + templates didáticos comparando
    o lance jogado com a melhor linha sugerida pelo Stockfish.
    """
    mover_color = chess.WHITE if mover_is_white else chess.BLACK
    opp_color = not mover_color
    ep_drop = max(0.0, player_ep_before - player_ep_after)

    played_san = board_before.san(played_move)
    moving_piece = board_before.piece_at(played_move.from_square)
    moving_name = PIECE_PT_NAMES.get(moving_piece.piece_type, "peça") if moving_piece else "peça"
    to_sq_name = chess.square_name(played_move.to_square)

    board_after = board_before.copy()
    is_capture = board_before.is_capture(played_move)
    captured_piece = board_before.piece_at(played_move.to_square)
    board_after.push(played_move)

    best_san = (
        board_before.san(best_move)
        if (best_move and best_move in board_before.legal_moves)
        else None
    )

    if classification == "book":
        if opening_name:
            return (
                f"Lance teórico da {opening_name} ({played_san}), "
                f"desenvolvendo o plano principal da abertura."
            )
        return f"Lance teórico de abertura ({played_san}), mantendo o desenvolvimento equilibrado."

    if board_after.is_checkmate():
        return (
            f"Xeque-mate! {played_san} encerra a partida "
            f"sem defesa possível para o rei adversário."
        )

    if classification == "brilliant":
        return (
            f"Lance brilhante! Ao jogar {played_san}, você sacrifica material para abrir linhas "
            f"e criar uma iniciativa tática decisiva."
        )

    if classification == "great":
        forks = detect_fork_squares(board_after, played_move.to_square, mover_color)
        if forks:
            return f"Grande lance! {played_san} aplica um ataque duplo sobre {forks[0]} e {forks[1]}."
        if board_after.is_check():
            return f"Grande lance! {played_san} aplica xeque e mantém o controle total da iniciativa."
        if is_capture and captured_piece:
            cap_name = PIECE_PT_NAMES[captured_piece.piece_type]
            return (
                f"Grande lance! {played_san} captura o(a) {cap_name} "
                f"em {to_sq_name} e consolida a vantagem."
            )
        return f"Grande lance! {played_san} é a única continuação precisa para sustentar a vantagem."

    if classification in ("inaccuracy", "mistake", "blunder"):
        best_hint = (
            f" O melhor era {best_san}."
            if best_san and best_san != played_san
            else ""
        )

        player_cp_after = cp_after if mover_is_white else -cp_after
        if player_cp_after <= -9000:
            return f"Capivarada fatal: {played_san} permite sequência de xeque-mate forçado.{best_hint}"

        if moving_piece and moving_piece.piece_type != chess.KING:
            attackers = board_after.attackers(opp_color, played_move.to_square)
            defenders = board_after.attackers(mover_color, played_move.to_square)
            if attackers and not defenders:
                error_label = "Capivarada" if classification == "blunder" else "Erro"
                return (
                    f"{error_label}: {played_san} deixa seu(sua) {moving_name} "
                    f"desprotegido(a) em {to_sq_name}.{best_hint}"
                )

        if best_move and best_move in board_before.legal_moves:
            if best_move.promotion:
                return f"Você deixou passar a promoção de peão com {best_san}.{best_hint}"

            best_cap = board_before.piece_at(best_move.to_square)
            if best_cap and best_cap.piece_type != chess.KING:
                cap_label = PIECE_PT_NAMES[best_cap.piece_type]
                cap_sq = chess.square_name(best_move.to_square)
                return (
                    f"Você perdeu a chance de ganhar o(a) {cap_label} "
                    f"em {cap_sq} jogando {best_san}."
                )

            best_after = board_before.copy()
            best_after.push(best_move)
            best_forks = detect_fork_squares(best_after, best_move.to_square, mover_color)
            if best_forks:
                return (
                    f"{played_san} deixa escapar um ataque duplo ({best_san}) "
                    f"contra {best_forks[0]} e {best_forks[1]}."
                )

        if ep_drop >= 0.22:
            return f"Capivarada: {played_san} compromete seriamente sua posição.{best_hint}"
        if ep_drop >= 0.11:
            return f"Erro: {played_san} cede iniciativa e vantagem relevante ao adversário.{best_hint}"
        return f"Imprecisão: {played_san} enfraquece a coordenação das peças.{best_hint}"

    if board_before.is_castling(played_move):
        return f"Bom lance ({played_san}): coloca o rei em segurança e conecta as torres."

    forks = detect_fork_squares(board_after, played_move.to_square, mover_color)
    if forks:
        return f"Bom lance ({played_san}), pressionando {forks[0]} e {forks[1]}."

    if is_capture and captured_piece:
        cap_name = PIECE_PT_NAMES[captured_piece.piece_type]
        if captured_piece.piece_type == chess.QUEEN:
            return f"Bom lance ({played_san}): simplifica a posição com a troca de damas."
        return f"Bom lance ({played_san}), capturando o(a) {cap_name} em {to_sq_name}."

    if board_after.is_check():
        return f"Bom lance ({played_san}), mantendo pressão com xeque sobre o rei adversário."

    if best_san and best_san != played_san and ep_drop > 0.015:
        return f"Lance sólido ({played_san}), embora {best_san} fosse ligeiramente mais preciso."

    return f"Bom lance ({played_san}), mantendo o equilíbrio e a estrutura da posição."


def classify_move_with_expected_points(
    *,
    expected_points_loss: float,
    is_book_move: bool,
    is_best_move: bool,
    second_best_expected_points_gap: float,
    sacrificed: bool,
    player_expected_before: float,
    player_expected_after: float,
) -> str:
    loss = max(0.0, min(1.0, float(expected_points_loss)))
    loss_percent = loss * 100.0

    if (
        sacrificed
        and (is_best_move or loss_percent <= 1.0)
        and player_expected_after >= 0.35
        and player_expected_before < 0.95
    ):
        return "brilliant"

    critical_turnaround = (
        player_expected_before <= 0.40 and player_expected_after >= 0.50
    ) or (
        player_expected_before <= 0.50 and player_expected_after >= 0.60
    )

    only_good_move = second_best_expected_points_gap >= 0.10

    if is_best_move and (only_good_move or critical_turnaround):
        return "great"

    if is_book_move and loss_percent <= 2.0:
        return "book"

    if is_best_move:
        return "best"

    if loss_percent <= 2.0:
        return "excellent"

    if loss_percent <= 5.0:
        return "good"

    if loss_percent <= 10.0:
        return "inaccuracy"

    if loss_percent <= 20.0:
        return "mistake"

    return "blunder"


def compute_caps2_accuracy(
    move_entries: list[dict[str, float]],
    win_percent_history: list[float],
) -> float:
    if not move_entries:
        return 100.0

    move_accuracies: list[float] = []

    for entry in move_entries:
        loss = max(
            0.0,
            min(100.0, float(entry.get("expected_points_loss", 0.0)) * 100.0),
        )

        if loss <= 0:
            accuracy = 100.0
        else:
            accuracy = (
                103.1668100711649
                * math.exp(-0.04354415386753951 * loss)
                - 3.166924740191411
                + 1.0
            )

        accuracy = max(0.0, min(100.0, accuracy))
        move_accuracies.append(accuracy)

    if any(value <= 0 for value in move_accuracies):
        harmonic_mean = 0.0
    else:
        harmonic_mean = len(move_accuracies) / sum(
            1.0 / value for value in move_accuracies
        )

    weights: list[float] = []

    for entry in move_entries:
        ply = int(entry.get("ply", 0))

        start = max(0, ply - 2)
        end = min(len(win_percent_history), ply + 3)

        window = win_percent_history[start:end]

        if len(window) <= 1:
            deviation = 0.5
        else:
            mean = sum(window) / len(window)
            variance = sum((value - mean) ** 2 for value in window) / len(window)
            deviation = math.sqrt(variance)

        weight = max(0.5, min(12.0, deviation))
        weights.append(weight)

    weighted_total = sum(
        accuracy * weight
        for accuracy, weight in zip(move_accuracies, weights)
    )

    total_weight = sum(weights)

    weighted_mean = weighted_total / total_weight if total_weight > 0 else 0.0

    final_accuracy = (harmonic_mean + weighted_mean) / 2.0

    return round(max(0.0, min(100.0, final_accuracy)), 1)


def analyze_game_with_stockfish(
    history: list[dict[str, Any]],
    time_per_move: float = 0.08,
    depth: int = 12,
) -> dict[str, Any]:
    binary = find_stockfish_binary()
    if not binary:
        raise FileNotFoundError(
            "Binário do Stockfish não encontrado. Configure STOCKFISH_PATH "
            "ou disponibilize o executável no ambiente."
        )

    board = chess.Board()
    san_moves: list[str] = []

    for item in history:
        if not isinstance(item, dict):
            continue
        if item.get("white"):
            san_moves.append(str(item["white"]))
        if item.get("black"):
            san_moves.append(str(item["black"]))

    summary = {
        color: {key: 0 for key in CLASSIFICATION_META}
        for color in ("white", "black")
    }
    accuracy_entries: dict[str, list[dict[str, float]]] = {
        "white": [],
        "black": [],
    }
    per_ply: list[dict[str, Any]] = []
    opening_prefix: list[str] = []

    safe_time = max(0.05, min(float(time_per_move), 3.0))
    safe_depth = max(10, min(int(depth), 24))
    limit = chess.engine.Limit(time=safe_time, depth=safe_depth)

    def evaluate_position(engine: chess.engine.SimpleEngine, position: chess.Board):
        if position.is_checkmate():
            white_cp = -10000 if position.turn == chess.WHITE else 10000
            mate_text = "-M0" if white_cp < 0 else "+M0"
            return white_cp, mate_text, None, 0, 0.0

        if position.is_game_over(claim_draw=True):
            return 0, "0.0", None, 0, 0.0

        infos = engine.analyse(position, limit, multipv=2)
        if isinstance(infos, dict):
            infos = [infos]

        if not infos:
            raise RuntimeError("Stockfish não retornou avaliação para uma posição.")

        best_info = infos[0]
        white_cp, eval_text = score_to_white_cp_and_text(best_info["score"])
        best_pv = best_info.get("pv") or []
        best_move = best_pv[0] if best_pv else None

        second_cp = white_cp
        if len(infos) > 1:
            second_cp, _ = score_to_white_cp_and_text(infos[1]["score"])

        sign = 1 if position.turn == chess.WHITE else -1
        best_cp_for_turn = white_cp * sign
        second_cp_for_turn = second_cp * sign
        second_gap = max(0, best_cp_for_turn - second_cp_for_turn)
        best_expected = cp_to_expected_points(best_cp_for_turn)
        second_expected = cp_to_expected_points(second_cp_for_turn)
        expected_gap = max(0.0, best_expected - second_expected)

        return white_cp, eval_text, best_move, second_gap, expected_gap

    with chess.engine.SimpleEngine.popen_uci(binary) as engine:
        try:
            if "Hash" in engine.options:
                engine.configure({"Hash": 32})
        except (chess.engine.EngineError, chess.engine.EngineTerminatedError):
            pass

        cp_before, text_before, best_before, gap_before, ep_gap_before = evaluate_position(
            engine, board
        )
        win_percent_history = [cp_to_expected_points(cp_before) * 100.0]

        def move_payload(move: chess.Move | None):
            if move is None:
                return None
            return {
                "from": chess.square_name(move.from_square),
                "to": chess.square_name(move.to_square),
                "uci": move.uci(),
            }

        per_ply.append(
            {
                "ply": 0,
                "evalCp": cp_before,
                "evalScore": round(cp_before / 100.0, 2),
                "evalText": text_before,
                "expectedPoints": round(cp_to_expected_points(cp_before), 3),
                "bestMove": move_payload(best_before),
                "secondBestEpGap": round(ep_gap_before, 4),
                "secondBestCpGap": gap_before,
                "cpLoss": 0,
                "classification": None,
                "moverColor": None,
                "commentary": "Posição inicial da partida.",
            }
        )

        for ply, san in enumerate(san_moves, start=1):
            if board.is_game_over(claim_draw=True):
                raise ValueError(
                    f"A partida contém lances após seu término "
                    f"(antes do lance {ply}: {san})."
                )

            mover_color = board.turn
            mover_key = "white" if mover_color == chess.WHITE else "black"
            mover_sign = 1 if mover_color == chess.WHITE else -1

            try:
                move = board.parse_san(san)
            except ValueError as exc:
                raise ValueError(
                    f"Lance SAN inválido no ply {ply}: {san!r}."
                ) from exc

            best_before_uci = best_before.uci() if best_before else None
            is_best_move = bool(best_before_uci and move.uci() == best_before_uci)

            opening_prefix.append(san)
            opening_name = OPENING_BOOK_LINES.get(tuple(opening_prefix))
            is_book_move = opening_name is not None

            sacrificed = is_piece_sacrificed(board, move, mover_color)
            board_before = board.copy()
            board.push(move)

            if board.is_checkmate():
                cp_after = 10000 if mover_color == chess.WHITE else -10000
                text_after = "+M0" if cp_after > 0 else "-M0"
                best_after = None
                gap_after = 0
                ep_gap_after = 0.0
            else:
                cp_after, text_after, best_after, gap_after, ep_gap_after = evaluate_position(
                    engine, board
                )

            player_cp_before = cp_before * mover_sign
            player_cp_after = cp_after * mover_sign
            player_expected_before = cp_to_expected_points(player_cp_before)
            player_expected_after = cp_to_expected_points(player_cp_after)
            expected_points_loss = max(0.0, player_expected_before - player_expected_after)

            if player_cp_before >= 9000 and player_cp_after < 9000:
                cp_loss = 2000
            elif player_cp_after <= -9000 and player_cp_before > -9000:
                cp_loss = 2000
            else:
                cp_loss = min(2000, max(0, player_cp_before - player_cp_after))

            classification = classify_move_with_expected_points(
                expected_points_loss=expected_points_loss,
                is_book_move=is_book_move,
                is_best_move=is_best_move,
                second_best_expected_points_gap=ep_gap_before,
                sacrificed=sacrificed,
                player_expected_before=player_expected_before,
                player_expected_after=player_expected_after,
            )

            summary[mover_key][classification] += 1
            accuracy_entries[mover_key].append({
                "expected_points_loss": expected_points_loss,
                "ply": ply,
            })

            win_percent_history.append(cp_to_expected_points(cp_after) * 100.0)

            commentary = generate_coach_commentary(
                board_before=board_before,
                played_move=move,
                best_move=best_before,
                classification=classification,
                player_ep_before=player_expected_before,
                player_ep_after=player_expected_after,
                cp_after=cp_after,
                mover_is_white=(mover_color == chess.WHITE),
                opening_name=opening_name,
            )

            per_ply.append(
                {
                    "ply": ply,
                    "evalCp": cp_after,
                    "evalScore": round(cp_after / 100.0, 2),
                    "evalText": text_after,
                    "expectedPoints": round(cp_to_expected_points(cp_after), 3),
                    "bestMove": move_payload(best_after),
                    "secondBestEpGap": round(ep_gap_after, 4),
                    "secondBestCpGap": gap_after,
                    "cpLoss": cp_loss,
                    "expectedPointsLoss": round(expected_points_loss, 5),
                    "classification": classification,
                    "moverColor": mover_key,
                    "commentary": commentary,
                }
            )

            cp_before = cp_after
            text_before = text_after
            best_before = best_after
            gap_before = gap_after
            ep_gap_before = ep_gap_after

    white_accuracy = compute_caps2_accuracy(
        accuracy_entries["white"],
        win_percent_history,
    )

    black_accuracy = compute_caps2_accuracy(
        accuracy_entries["black"],
        win_percent_history,
    )

    return {
        "engine": "stockfish",
        "analysisDepth": safe_depth,
        "timePerMove": safe_time,
        "classificationModel": "expected-points-v2-approximation",
        "perPly": per_ply,
        "summary": summary,
        "accuracy": {
            "white": white_accuracy,
            "black": black_accuracy,
        },
        "estimatedRating": {
            "white": None,
            "black": None,
        },
    }