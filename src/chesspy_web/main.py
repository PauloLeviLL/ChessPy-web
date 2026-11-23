import sys
import threading
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4

import chess
from fastapi import BackgroundTasks, FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

from chesspy_web.controller.game_controller import GameController
from chesspy_web.database import (
    delete_saved_game,
    init_db,
    list_saved_games,
    upsert_saved_game,
)
from chesspy_web.friend_bot import FriendStyleBot


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent.parent

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from import_friend_games import (  # noqa: E402
    DEFAULT_USERNAME,
    fetch_chesscom_pgn_for_month,
    merge_pgn_into_file,
)


FRIEND_USERNAME = DEFAULT_USERNAME
SYNC_COOLDOWN = timedelta(minutes=20)

sample_pgn_path = PROJECT_ROOT / "friend_games.pgn"
if not sample_pgn_path.exists() and (BASE_DIR.parent / "friend_games.pgn").exists():
    sample_pgn_path = BASE_DIR.parent / "friend_games.pgn"

_sync_lock = threading.Lock()
_last_sync_at: datetime | None = None


def _build_friend_bot() -> FriendStyleBot:
    bot = FriendStyleBot()
    if sample_pgn_path.exists():
        bot.train_from_pgn_file(sample_pgn_path, player_name=FRIEND_USERNAME)
        print(
            f"[FriendBot] Carregado de {sample_pgn_path}: "
            f"{bot.games_loaded} partidas, {bot.moves_recorded} lances | "
            f"ML ativo: {bot.ml_trained} ({len(bot._X_train)} amostras) | "
            f"Rating médio: {bot.average_rating}"
        )
    else:
        print(f"[FriendBot] AVISO: friend_games.pgn não encontrado em {sample_pgn_path}")
    return bot


app = FastAPI(
    title="ChessPy-Web",
    description="Jogo de xadrez para navegador.",
    version="1.2.1",
)

init_db()
friend_bot = _build_friend_bot()


def sync_friend_games(force: bool = False) -> dict:
    """Baixa as partidas do mês atual do Chess.com, deduplica e recarrega o bot."""
    global _last_sync_at, friend_bot
    now = datetime.now()

    if not force and _last_sync_at is not None and (now - _last_sync_at) < SYNC_COOLDOWN:
        return {"status": "skipped_cooldown"}

    if not _sync_lock.acquire(blocking=False):
        return {"status": "already_running"}

    try:
        _last_sync_at = datetime.now()
        incoming_pgn = fetch_chesscom_pgn_for_month(
            FRIEND_USERNAME,
            str(_last_sync_at.year),
            str(_last_sync_at.month),
        )
        added, duplicates, ignored = merge_pgn_into_file(
            target_path=sample_pgn_path,
            incoming_pgn_text=incoming_pgn,
            player_name=FRIEND_USERNAME,
        )
        print(
            f"[FriendBot Sync] Novas: {added} | Duplicadas ignoradas: {duplicates} | "
            f"Outros jogadores ignorados: {ignored}"
        )
        if added > 0:
            friend_bot = _build_friend_bot()

        return {
            "status": "synced",
            "added": added,
            "duplicates": duplicates,
            "games_loaded": friend_bot.games_loaded,
            "moves_recorded": friend_bot.moves_recorded,
        }
    except Exception as exc:
        print(f"[FriendBot Sync] Falha ao sincronizar com Chess.com: {exc}")
        return {"status": "error", "detail": str(exc)}
    finally:
        _sync_lock.release()


app.mount(
    "/static",
    StaticFiles(directory=BASE_DIR / "static"),
    name="static",
)

templates = Jinja2Templates(directory=BASE_DIR / "templates")

games: dict[str, GameController] = {}
game_configs: dict[str, dict] = {}


class CreateGameRequest(BaseModel):
    mode: str = "pvp"
    bot_level: int = 4
    player_color: str = "white"
    time_control: str = "10+0"


class MoveRequest(BaseModel):
    from_square: str
    to_square: str


class SaveGameRequest(BaseModel):
    id: str
    date: str | None = None
    mode: str = "10+0 Rápida"
    plies: int
    outcome: str
    resultLabel: str
    pgn: str
    finalPieces: dict
    timeline: list
    history: list


def get_game(game_id: str) -> GameController:
    game = games.get(game_id)

    if game is None:
        raise HTTPException(
            status_code=404,
            detail="Partida não encontrada.",
        )

    return game


def serialize_position(board: chess.Board, last_move=None) -> dict:
    pieces = {}

    for square in chess.SQUARES:
        piece = board.piece_at(square)

        if piece is not None:
            pieces[chess.square_name(square)] = {
                "color": "white" if piece.color == chess.WHITE else "black",
                "type": piece.piece_type,
            }

    check_square = None

    if board.is_check():
        check_square = chess.square_name(board.king(board.turn))

    winning_king = None
    losing_king = None

    if board.is_checkmate():
        winning_king = chess.square_name(board.king(not board.turn))
        losing_king = chess.square_name(board.king(board.turn))

    return {
        "pieces": pieces,
        "turn": "white" if board.turn == chess.WHITE else "black",
        "legal_moves": [move.uci() for move in board.legal_moves],
        "check_square": check_square,
        "checkmate": board.is_checkmate(),
        "stalemate": board.is_stalemate(),
        "last_move": last_move,
        "winning_king": winning_king,
        "losing_king": losing_king,
    }


def get_game_state(game: GameController) -> dict:
    board = game.board.board

    history = []
    white_captures = []
    black_captures = []

    timeline = [
        serialize_position(board.root())
    ]

    replay_board = board.root()

    for index, move in enumerate(board.move_stack):
        san = replay_board.san(move)

        captured_piece = replay_board.piece_at(move.to_square)

        if replay_board.is_en_passant(move):
            captured_square = (
                move.to_square - 8
                if replay_board.turn == chess.WHITE
                else move.to_square + 8
            )
            captured_piece = replay_board.piece_at(captured_square)

        if captured_piece is not None:
            symbol = captured_piece.unicode_symbol()

            if replay_board.turn == chess.WHITE:
                white_captures.append(symbol)
            else:
                black_captures.append(symbol)

        if index % 2 == 0:
            history.append({
                "number": index // 2 + 1,
                "white": san,
                "black": "",
            })
        else:
            history[-1]["black"] = san

        replay_board.push(move)

        last_move = {
            "from": chess.square_name(move.from_square),
            "to": chess.square_name(move.to_square),
        }

        timeline.append(
            serialize_position(replay_board, last_move)
        )

    current_position = serialize_position(
        board,
        {
            "from": chess.square_name(board.peek().from_square),
            "to": chess.square_name(board.peek().to_square),
        } if board.move_stack else None,
    )

    return {
        **current_position,
        "history": history,
        "white_captures": white_captures,
        "black_captures": black_captures,
        "timeline": timeline,
        "total_plies": len(board.move_stack),
    }


@app.get("/")
def home(request: Request, background_tasks: BackgroundTasks):
    background_tasks.add_task(sync_friend_games, False)
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={},
    )


@app.post("/api/friend-bot/sync")
def force_sync_friend_bot():
    return sync_friend_games(force=True)


@app.get("/api/games")
def get_saved_games():
    return list_saved_games()


@app.post("/api/games/history")
def save_game_history(payload: SaveGameRequest):
    record = payload.model_dump()
    if not record.get("date"):
        record["date"] = datetime.now().strftime("%d/%m/%Y")
    record["id"] = record["id"].upper()
    return upsert_saved_game(record)


@app.delete("/api/games/{record_id}")
def remove_saved_game(record_id: str):
    deleted = delete_saved_game(record_id)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Registro não encontrado.",
        )
    return {"deleted": True, "id": record_id.upper()}


@app.post("/api/games")
def create_game(config: CreateGameRequest | None = None):
    game_id = str(uuid4())
    games[game_id] = GameController()
    game_configs[game_id] = (config or CreateGameRequest()).model_dump()

    return {
        "game_id": game_id,
        "config": game_configs[game_id],
        "state": get_game_state(games[game_id]),
    }


@app.get("/api/games/{game_id}")
def read_game(game_id: str):
    return get_game_state(get_game(game_id))


@app.post("/api/games/{game_id}/moves")
def make_move(game_id: str, move_data: MoveRequest):
    game = get_game(game_id)
    board = game.board.board

    try:
        from_square = chess.parse_square(move_data.from_square)
        to_square = chess.parse_square(move_data.to_square)

    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Casa inválida.",
        )

    piece = board.piece_at(from_square)

    if piece is None:
        raise HTTPException(
            status_code=400,
            detail="Não existe peça nessa casa.",
        )

    move_uci = move_data.from_square + move_data.to_square

    if (
        piece.piece_type == chess.PAWN
        and chess.square_rank(to_square) in (0, 7)
    ):
        move_uci += "q"

    if not game.play(move_uci):
        raise HTTPException(
            status_code=400,
            detail="Movimento ilegal.",
        )

    return get_game_state(game)


@app.post("/api/games/{game_id}/bot-move")
def make_bot_move(game_id: str):
    game = get_game(game_id)
    board = game.board.board

    if not list(board.legal_moves):
        raise HTTPException(
            status_code=400,
            detail="Não há movimentos legais para o Bot.",
        )

    config = game_configs.get(game_id, {})
    bot_level = config.get("bot_level", 4)

    key = friend_bot.position_key(board)
    known = dict(friend_bot.position_moves.get(key, {}))

    chosen_move = friend_bot.choose_move(board, level=bot_level)
    if chosen_move is None:
        raise HTTPException(
            status_code=400,
            detail="Não foi possível selecionar um lance para o Bot.",
        )

    origem = f"PGN {known}" if known else ("ML" if friend_bot.ml_trained else "FALLBACK")
    print(f"[FriendBot] Nível: {bot_level} | Lance escolhido: {chosen_move.uci()} | Origem: {origem}")

    if not game.play(chosen_move.uci()):
        raise HTTPException(
            status_code=400,
            detail="Falha ao executar lance do Bot.",
        )

    return get_game_state(game)


@app.post("/api/games/{game_id}/undo")
def undo_move(game_id: str):
    game = get_game(game_id)

    if not game.undo():
        raise HTTPException(
            status_code=400,
            detail="Não existem movimentos para desfazer.",
        )

    return get_game_state(game)


@app.post("/api/games/{game_id}/reset")
def reset_game(game_id: str):
    game = get_game(game_id)
    game.restart()

    return get_game_state(game)