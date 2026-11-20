from __future__ import annotations

import argparse
import io
import json
import urllib.request
from pathlib import Path

import chess.pgn


DEFAULT_USERNAME = "deidaradzn"
DEFAULT_PGN_PATH = Path(__file__).resolve().parent / "friend_games.pgn"
USER_AGENT = "ChessPy-Web-FriendImporter/1.0 (contact: local-dev)"


def game_signature(game: chess.pgn.Game) -> str:
    """Gera uma chave única por partida para evitar duplicatas."""
    link = (game.headers.get("Link") or "").strip()
    if link:
        return f"link:{link}"

    white = (game.headers.get("White") or "").strip().lower()
    black = (game.headers.get("Black") or "").strip().lower()
    date = (game.headers.get("Date") or "").strip()
    end_time = (game.headers.get("EndTime") or "").strip()
    moves = " ".join(move.uci() for move in game.mainline_moves())
    return f"game:{white}|{black}|{date}|{end_time}|{moves}"


def read_games_from_pgn_text(pgn_text: str) -> list[chess.pgn.Game]:
    """Lê todas as partidas válidas de um texto PGN."""
    stream = io.StringIO(pgn_text)
    games: list[chess.pgn.Game] = []
    while True:
        game = chess.pgn.read_game(stream)
        if game is None:
            break
        games.append(game)
    return games


def game_to_pgn_string(game: chess.pgn.Game) -> str:
    """Exporta uma única partida formatada como PGN."""
    exporter = chess.pgn.StringExporter(headers=True, variations=False, comments=False)
    return game.accept(exporter).strip()


def fetch_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_chesscom_pgn_for_month(username: str, year: str, month: str) -> str:
    """Baixa o PGN de um mês específico (YYYY, MM) da API pública do Chess.com."""
    user = username.strip().lower()
    mm = str(month).zfill(2)
    url = f"https://api.chess.com/pub/player/{user}/games/{year}/{mm}/pgn"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read().decode("utf-8", errors="replace")


def fetch_chesscom_all_pgns(username: str, max_months: int | None = None) -> str:
    """Lista os arquivos mensais do jogador e baixa os PGNs (mais recentes primeiro)."""
    user = username.strip().lower()
    archives_url = f"https://api.chess.com/pub/player/{user}/games/archives"
    data = fetch_json(archives_url)
    archives = list(reversed(data.get("archives", [])))
    if max_months is not None:
        archives = archives[:max_months]

    chunks: list[str] = []
    for archive_url in archives:
        # archive_url termina em .../games/YYYY/MM
        parts = archive_url.rstrip("/").split("/")
        if len(parts) >= 2:
            year, month = parts[-2], parts[-1]
            pgn_chunk = fetch_chesscom_pgn_for_month(user, year, month)
            if pgn_chunk.strip():
                chunks.append(pgn_chunk.strip())
    return "\n\n".join(chunks)


def merge_pgn_into_file(
    target_path: Path,
    incoming_pgn_text: str,
    player_name: str | None = DEFAULT_USERNAME,
) -> tuple[int, int, int]:
    """Mescla partidas novas no arquivo PGN sem duplicar.

    Retorna: (adicionadas, duplicadas, ignoradas_por_jogador)
    """
    existing_games: list[chess.pgn.Game] = []
    if target_path.exists():
        existing_text = target_path.read_text(encoding="utf-8", errors="replace")
        existing_games = read_games_from_pgn_text(existing_text)

    seen_signatures = {game_signature(g) for g in existing_games}
    incoming_games = read_games_from_pgn_text(incoming_pgn_text)

    target_player = player_name.strip().lower() if player_name else None
    new_pgn_blocks: list[str] = []
    added = 0
    duplicates = 0
    ignored_player = 0

    for game in incoming_games:
        if target_player:
            white = (game.headers.get("White") or "").strip().lower()
            black = (game.headers.get("Black") or "").strip().lower()
            if target_player not in (white, black):
                ignored_player += 1
                continue

        sig = game_signature(game)
        if sig in seen_signatures:
            duplicates += 1
            continue

        seen_signatures.add(sig)
        new_pgn_blocks.append(game_to_pgn_string(game))
        added += 1

    if new_pgn_blocks:
        existing_clean = (
            target_path.read_text(encoding="utf-8", errors="replace").strip()
            if target_path.exists()
            else ""
        )
        combined = (
            f"{existing_clean}\n\n" + "\n\n".join(new_pgn_blocks)
            if existing_clean
            else "\n\n".join(new_pgn_blocks)
        )
        target_path.write_text(combined + "\n", encoding="utf-8")

    return added, duplicates, ignored_player


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Importa e deduplica partidas PGN do Chess.com para o friend_games.pgn."
    )
    parser.add_argument("--user", default=DEFAULT_USERNAME, help="Usuário no Chess.com")
    parser.add_argument("--file", type=Path, help="Arquivo .pgn local para mesclar")
    parser.add_argument("--year", help="Ano (ex.: 2026) para buscar na API do Chess.com")
    parser.add_argument("--month", help="Mês (ex.: 11) para buscar na API do Chess.com")
    parser.add_argument(
        "--all-months",
        action="store_true",
        help="Busca todos os meses disponíveis do usuário na API do Chess.com",
    )
    parser.add_argument(
        "--max-months",
        type=int,
        default=2,
        help="Quantidade de meses mais recentes ao usar --all-months (padrão: 2)",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=DEFAULT_PGN_PATH,
        help="Caminho do friend_games.pgn de destino",
    )
    args = parser.parse_args()

    if args.file:
        incoming_text = args.file.read_text(encoding="utf-8", errors="replace")
    elif args.year and args.month:
        incoming_text = fetch_chesscom_pgn_for_month(args.user, args.year, args.month)
    elif args.all_months:
        incoming_text = fetch_chesscom_all_pgns(args.user, max_months=args.max_months)
    else:
        # Padrão prático: baixa o mês atual do jogador
        from datetime import datetime

        now = datetime.now()
        incoming_text = fetch_chesscom_pgn_for_month(
            args.user, str(now.year), str(now.month)
        )

    added, duplicates, ignored = merge_pgn_into_file(
        target_path=args.out,
        incoming_pgn_text=incoming_text,
        player_name=args.user,
    )
    print(
        f"Concluído -> Novas: {added} | Duplicadas ignoradas: {duplicates} | "
        f"Outros jogadores ignorados: {ignored} | Arquivo: {args.out}"
    )


if __name__ == "__main__":
    main()