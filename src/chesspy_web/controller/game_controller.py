from chesspy_web.domain.board import ChessBoard


class GameController:
    """Controla o fluxo de uma partida de xadrez."""

    def __init__(self) -> None:
        self._game = ChessBoard()

    @property
    def board(self) -> ChessBoard:
        return self._game

    def play(self, move: str) -> bool:
        return self._game.make_move(move)

    def undo(self) -> bool:
        return self._game.undo_move()

    def restart(self) -> None:
        self._game.reset()

    def get_position(self) -> str:
        return self._game.get_fen()

    def get_legal_moves(self) -> list[str]:
        return self._game.get_legal_moves()

    def get_turn(self) -> str:
        return self._game.get_turn()
