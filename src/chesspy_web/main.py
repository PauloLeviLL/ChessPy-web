from pathlib import Path
from uuid import uuid4

import chess
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

from chesspy_web.controller.game_controller import GameController


BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(
    title="ChessPy-Web",
    description="Jogo de xadrez para navegador.",
    version="1.0.0",
)

app.mount(
    "/static",
    StaticFiles(directory=BASE_DIR / "static"),
    name="static",
)

templates = Jinja2Templates(directory=BASE_DIR / "templates")

games: dict[str, GameController] = {}


class MoveRequest(BaseModel):
    from_square: str
    to_square: str


def get_game(game_id: str) -> GameController:
    game = games.get(game_id)

    if game is None:
        raise HTTPException(
            status_code=404,
            detail="Partida não encontrada.",
        )

    return game


def get_game_state(game: GameController) -> dict:
    board = game.board.board

    pieces = {}

    for square in chess.SQUARES:
        piece = board.piece_at(square)

        if piece is None:
            continue

        pieces[chess.square_name(square)] = {
            "color": "white" if piece.color == chess.WHITE else "black",
            "type": piece.piece_type,
        }

    last_move = None

    if board.move_stack:
        move = board.peek()

        last_move = {
            "from": chess.square_name(move.from_square),
            "to": chess.square_name(move.to_square),
        }

    check_square = None

    if board.is_check():
        check_square = chess.square_name(board.king(board.turn))

    winning_king = None
    losing_king = None

    if board.is_checkmate():
        winning_king = chess.square_name(
            board.king(not board.turn)
        )
        losing_king = chess.square_name(
            board.king(board.turn)
        )

    return {
        "pieces": pieces,
        "turn": game.get_turn(),
        "legal_moves": game.get_legal_moves(),
        "check_square": check_square,
        "checkmate": board.is_checkmate(),
        "stalemate": board.is_stalemate(),
        "last_move": last_move,
        "winning_king": winning_king,
        "losing_king": losing_king,
    }


@app.get("/")
def home(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={},
    )


@app.post("/api/games")
def create_game():
    game_id = str(uuid4())
    games[game_id] = GameController()

    return {
        "game_id": game_id,
        "state": get_game_state(games[game_id]),
    }


@app.get("/api/games/{game_id}")
def read_game(game_id: str):
    game = get_game(game_id)
    return get_game_state(game)


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