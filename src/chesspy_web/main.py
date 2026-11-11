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

    # Promoção automática para rainha.
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