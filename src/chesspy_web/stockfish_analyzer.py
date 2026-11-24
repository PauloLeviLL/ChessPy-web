import math
import os
import shutil
from pathlib import Path
from typing import Any

import chess
import chess.engine


CLASSIFICATION_META = {
    "brilliant":  {"symbol": "!!", "label": "Brilhante",  "desc": "Sacrifício ou recurso tático brilhante que mantém a vantagem."},
    "great":      {"symbol": "!",  "label": "Excelente",  "desc": "Melhor lance da posição segundo a engine."},
    "good":       {"symbol": "✓",  "label": "Bom",        "desc": "Lance sólido sem perda relevante."},
    "book":       {"symbol": "B",  "label": "Livro",      "desc": "Lance teórico de abertura."},
    "inaccuracy": {"symbol": "?!", "label": "Imprecisão", "desc": "Deixa escapar parte da vantagem."},
    "mistake":    {"symbol": "?",  "label": "Erro",       "desc": "Erro tático ou posicional significativo."},
    "blunder":    {"symbol": "??", "label": "Capivarada", "desc": "Erro grave que compromete a partida."}
}


def find_stockfish_binary() -> str | None:
    env_path = os.getenv("STOCKFISH_PATH")
    if env_path and os.path.isfile(env_path):
        return env_path

    # Resolve <raiz-do-projeto>/bin/stockfish.exe a partir de src/stockfish_analyzer.py
    project_root = Path(__file__).resolve().parents[1]
    bundled_exe = project_root / "bin" / "stockfish.exe"

    candidates = [
        str(bundled_exe),
        shutil.which("stockfish"),
        "/usr/games/stockfish",
        "/usr/bin/stockfish",
        "bin/stockfish.exe",
        "../bin/stockfish.exe",
    ]
    for path in candidates:
        if path and os.path.isfile(path):
            return path
    return None


def score_to_white_cp_and_text(score: chess.engine.PovScore) -> tuple[int, str]:
    white_score = score.white()
    if white_score.is_mate():
        mate_in = white_score.mate()
        cp = 10000 if (mate_in and mate_in > 0) else -10000
        text = f"+M{mate_in}" if (mate_in and mate_in > 0) else f"-M{abs(mate_in or 0)}"
        return cp, text

    cp = white_score.score(mate_score=10000) or 0
    pawns = cp / 100.0
    text = f"+{pawns:.1f}" if pawns > 0 else f"{pawns:.1f}"
    return cp, text


def cp_to_win_percent(cp: int) -> float:
    clamped = max(-1000, min(1000, cp))
    return 50.0 + 50.0 * (2.0 / (1.0 + math.exp(-0.00368208 * clamped)) - 1.0)


def material_points(board: chess.Board, color: chess.Color) -> int:
    weights = {
        chess.PAWN: 1,
        chess.KNIGHT: 3,
        chess.BISHOP: 3,
        chess.ROOK: 5,
        chess.QUEEN: 9,
    }
    return sum(len(board.pieces(pt, color)) * w for pt, w in weights.items())


def classify_with_win_drop(
    ply: int,
    mover_is_white: bool,
    win_before: float,
    win_after: float,
    played_uci: str,
    best_uci: str | None,
    mat_diff_before: int,
    mat_diff_after: int,
) -> str:
    if ply <= 6:
        return "book"

    drop = (win_before - win_after) if mover_is_white else (win_after - win_before)
    is_best = bool(best_uci and played_uci == best_uci)

    player_mat_delta = (mat_diff_after - mat_diff_before) if mover_is_white else (mat_diff_before - mat_diff_after)
    player_win_after = win_after if mover_is_white else (100.0 - win_after)

    if drop >= 20.0:
        return "blunder"
    if drop >= 10.0:
        return "mistake"
    if drop >= 5.0:
        return "inaccuracy"
    if is_best and player_mat_delta <= -2 and player_win_after >= 65.0:
        return "brilliant"
    if is_best or drop <= 1.2:
        return "great"
    return "good"


def analyze_game_with_stockfish(history: list[dict[str, Any]], time_per_move: float = 0.04) -> dict[str, Any]:
    binary = find_stockfish_binary()
    print(f"[Stockfish] Executando binário em: {binary} | Lances: {len(san_moves)}")
    if not binary:
        raise FileNotFoundError("Binário do Stockfish não encontrado em bin/stockfish.exe.")

    board = chess.Board()
    san_moves: list[str] = []
    for item in history:
        if item.get("white"):
            san_moves.append(item["white"])
        if item.get("black"):
            san_moves.append(item["black"])

    summary = {
        "white": {k: 0 for k in CLASSIFICATION_META},
        "black": {k: 0 for k in CLASSIFICATION_META},
    }

    per_ply: list[dict[str, Any]] = []
    limit = chess.engine.Limit(time=time_per_move, depth=12)

    with chess.engine.SimpleEngine.popen_uci(binary) as engine:
        info0 = engine.analyse(board, limit)
        cp0, text0 = score_to_white_cp_and_text(info0["score"])
        pv0 = info0.get("pv") or []
        best0 = pv0[0] if pv0 else None

        per_ply.append({
            "ply": 0,
            "evalCp": cp0,
            "evalScore": round(cp0 / 100.0, 2),
            "evalText": text0,
            "bestMove": {
                "from": chess.square_name(best0.from_square),
                "to": chess.square_name(best0.to_square),
                "uci": best0.uci(),
            } if best0 else None,
            "classification": None,
            "moverColor": None,
        })

        for idx, san in enumerate(san_moves, start=1):
            mover_is_white = board.turn == chess.WHITE
            mover_key = "white" if mover_is_white else "black"

            prev_entry = per_ply[-1]
            win_before = cp_to_win_percent(prev_entry["evalCp"])
            best_before_uci = prev_entry["bestMove"]["uci"] if prev_entry["bestMove"] else None
            mat_before = material_points(board, chess.WHITE) - material_points(board, chess.BLACK)

            move = board.parse_san(san)
            board.push(move)

            mat_after = material_points(board, chess.WHITE) - material_points(board, chess.BLACK)

            if board.is_checkmate():
                cp_after = 10000 if mover_is_white else -10000
                text_after = "+M0" if mover_is_white else "-M0"
                best_next = None
            else:
                info = engine.analyse(board, limit)
                cp_after, text_after = score_to_white_cp_and_text(info["score"])
                pv = info.get("pv") or []
                best_next = pv[0] if pv else None

            win_after = cp_to_win_percent(cp_after)
            classification = classify_with_win_drop(
                ply=idx,
                mover_is_white=mover_is_white,
                win_before=win_before,
                win_after=win_after,
                played_uci=move.uci(),
                best_uci=best_before_uci,
                mat_diff_before=mat_before,
                mat_diff_after=mat_after,
            )

            summary[mover_key][classification] += 1

            per_ply.append({
                "ply": idx,
                "evalCp": cp_after,
                "evalScore": round(cp_after / 100.0, 2),
                "evalText": text_after,
                "bestMove": {
                    "from": chess.square_name(best_next.from_square),
                    "to": chess.square_name(best_next.to_square),
                    "uci": best_next.uci(),
                } if best_next else None,
                "classification": classification,
                "moverColor": mover_key,
            })

    return {
        "engine": "stockfish",
        "perPly": per_ply,
        "summary": summary,
    }