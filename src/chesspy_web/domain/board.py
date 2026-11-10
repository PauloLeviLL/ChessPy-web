import chess


class ChessBoard:
    """Representa o tabuleiro e controla as regras básicas do xadrez."""

    def __init__(self) -> None:
        self._board = chess.Board()

    @property
    def board(self) -> chess.Board:
        """Retorna o estado atual do tabuleiro."""
        return self._board

    def get_fen(self) -> str:
        """Retorna a posição atual no formato FEN."""
        return self._board.fen()

    def get_turn(self) -> str:
        """Retorna a cor que deve jogar."""
        return "white" if self._board.turn == chess.WHITE else "black"

    def get_legal_moves(self) -> list[str]:
        """Retorna os movimentos legais em notação UCI."""
        return [move.uci() for move in self._board.legal_moves]

    def make_move(self, uci_move: str) -> bool:
        """Executa um movimento legal informado em UCI."""
        try:
            move = chess.Move.from_uci(uci_move)
        except ValueError:
            return False

        if move not in self._board.legal_moves:
            return False

        self._board.push(move)
        return True

    def undo_move(self) -> bool:
        """Desfaz o último movimento, se existir."""
        if not self._board.move_stack:
            return False

        self._board.pop()
        return True

    def reset(self) -> None:
        """Restaura o tabuleiro para a posição inicial."""
        self._board.reset()