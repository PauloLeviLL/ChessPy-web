const boardElement = document.getElementById("board");
const boardWrapperElement = document.getElementById("board-wrapper");
const savedArrowsGroup = document.getElementById("saved-arrows-group");
const previewArrowGroup = document.getElementById("preview-arrow-group");

const statusElement = document.getElementById("status");
const checkWarningElement = document.getElementById("check-warning");
const panelSubtitleElement = document.getElementById("panel-subtitle");
const playTabButton = document.getElementById("tab-play");
const newGameAfterEndButton = document.getElementById("btn-new-game-after-end");

const rankCoordinatesElement = document.getElementById("rank-coordinates");
const fileCoordinatesElement = document.getElementById("file-coordinates");
const playSidebarElement = document.getElementById("play-sidebar");

const historyBody = document.getElementById("move-history-body");
const historyPositionLabel = document.getElementById("history-position-label");

const whiteTimerElement = document.getElementById("timer-white");
const blackTimerElement = document.getElementById("timer-black");

const whiteIndicator = document.getElementById("white-turn-indicator");
const blackIndicator = document.getElementById("black-turn-indicator");

const whitePlayerCard = document.getElementById("white-player-card");
const blackPlayerCard = document.getElementById("black-player-card");

const whitePlayerRole = document.getElementById("white-player-role");
const blackPlayerRole = document.getElementById("black-player-role");

const whiteCapturesElement = document.getElementById("white-captures");
const blackCapturesElement = document.getElementById("black-captures");

const undoButton = document.getElementById("btn-undo");
const resetButton = document.getElementById("btn-reset");
const prevButton = document.getElementById("btn-prev");
const nextButton = document.getElementById("btn-next");

// Elementos da aba Análise de partida
const analysisBoardElement = document.getElementById("analysis-board");
const analysisRankCoordsElement = document.getElementById("analysis-rank-coordinates");
const analysisFileCoordsElement = document.getElementById("analysis-file-coordinates");
const analysisBestArrowGroup = document.getElementById("analysis-best-arrow-group");
const analysisPlayedArrowGroup = document.getElementById("analysis-played-arrow-group");
const analysisSavedArrowsGroup = document.getElementById("analysis-saved-arrows-group");
const analysisPreviewArrowGroup = document.getElementById("analysis-preview-arrow-group");
const analysisBadgesLayer = document.getElementById("analysis-badges-layer");

const analysisEvalBlackEl = document.getElementById("analysis-eval-black");
const analysisEvalWhiteEl = document.getElementById("analysis-eval-white");
const analysisEvalScoreEl = document.getElementById("analysis-eval-score");

const analysisPlyLabel = document.getElementById("analysis-ply-label");
const analysisMoveFeedback = document.getElementById("analysis-move-feedback");
const analysisGameBadge = document.getElementById("analysis-game-badge");
const analysisMetaInline = document.getElementById("analysis-meta-inline");
const analysisClassSummaryEl = document.getElementById("analysis-classification-summary");
const analysisAccWhiteEl = document.getElementById("analysis-acc-white");
const analysisAccBlackEl = document.getElementById("analysis-acc-black");
const analysisRatingWhiteEl = document.getElementById("analysis-rating-white");
const analysisRatingBlackEl = document.getElementById("analysis-rating-black");
const analysisMovesBody = document.getElementById("analysis-moves-body");

const analysisBtnStart = document.getElementById("analysis-btn-start");
const analysisBtnPrev = document.getElementById("analysis-btn-prev");
const analysisBtnNext = document.getElementById("analysis-btn-next");
const analysisBtnEnd = document.getElementById("analysis-btn-end");
const analysisBtnFlip = document.getElementById("btn-analysis-flip");
const analysisBtnBackGames = document.getElementById("btn-back-to-games");

const pieceNames = {
    1: "Peao",
    2: "Cavalo",
    3: "Bispo",
    4: "Torre",
    5: "Rainha",
    6: "Rei"
};

const PIECE_VALUES = {
    1: 1.0,
    2: 3.0,
    3: 3.2,
    4: 5.0,
    5: 9.0,
    6: 0.0
};

const MOVE_CLASSIFICATIONS = {
    brilliant: {
        key: "brilliant",
        symbol: "!!",
        label: "Brilhante",
        desc: "Sacrifício ou recurso tático brilhante que mantém ou amplia a vantagem."
    },
    great: {
        key: "great",
        symbol: "!",
        label: "Grande Lance",
        desc: "Lance crítico que encontra a continuação mais precisa."
    },
    best: {
        key: "best",
        symbol: "★",
        label: "Melhor",
        desc: "O lance escolhido pelo Stockfish como primeira opção."
    },
    excellent: {
        key: "excellent",
        symbol: "👍",
        label: "Excelente",
        desc: "Quase tão preciso quanto a melhor opção."
    },
    good: {
        key: "good",
        symbol: "✓",
        label: "Bom",
        desc: "Lance sólido, com pequena perda de pontos esperados."
    },
    book: {
        key: "book",
        symbol: "B",
        label: "Livro",
        desc: "Lance teórico conhecido de abertura."
    },
    inaccuracy: {
        key: "inaccuracy",
        symbol: "?!",
        label: "Imprecisão",
        desc: "Permite ao adversário melhorar a posição."
    },
    mistake: {
        key: "mistake",
        symbol: "?",
        label: "Erro",
        desc: "Cede vantagem relevante ao adversário."
    },
    blunder: {
        key: "blunder",
        symbol: "??",
        label: "Capivarada",
        desc: "Erro grave que compromete a partida."
    }
};

const BOT_LEVELS = {
    1: { name: "Iniciante", elo: "~600 ELO" },
    2: { name: "Novato", elo: "~800 ELO" },
    3: { name: "Casual", elo: "~1000 ELO" },
    4: { name: "Intermediário", elo: "~1200 ELO" },
    5: { name: "Clube", elo: "~1400 ELO" },
    6: { name: "Tático", elo: "~1600 ELO" },
    7: { name: "Avançado", elo: "~1800 ELO" },
    8: { name: "Competitivo", elo: "~2000 ELO" },
    9: { name: "Especialista", elo: "~2200 ELO" },
    10: { name: "Mestre", elo: "~2400 ELO" }
};

const ANIMATION_DURATION = 160;
const SVG_NS = "http://www.w3.org/2000/svg";
const ARROW_SQUARE_SIZE = 100; // viewBox 0..800

// Configuração ativa e rascunho da tela de Configuração de partida.
let draftConfig = {
    mode: "pvp",
    botLevel: 4,
    playerColor: "white",
    timeLabel: "10+0",
    timeCategory: "Rápida",
    baseSeconds: 600,
    incrementSeconds: 0,
    flipped: false
};

let activeConfig = null;
let isMatchConfigured = false;
let resolvedHumanColor = "white";

let gameId = null;
let sessionRecordId = null;
let gameState = null;

let selectedSquare = null;
let dragging = null;
let animation = null;

// Estado das setas desenhadas com botão direito na aba Partida.
const drawnArrows = [];
let isRightDrawing = false;
let arrowStartCell = null;
let arrowHoverCell = null;

// Estado da aba Análise de partida.
let analysisGame = null;
let analysisPly = 0;
let analysisFlipped = false;
let analysisReport = null; // { engine?: "stockfish", perPly: [...], summary: {...} }
const analysisCustomArrows = [];
let isAnalysisRightDrawing = false;
let analysisArrowStart = null;
let analysisArrowHover = null;

let busy = false;
let gameActive = false;

let clockInterval = null;
let clockStarted = false;

let whiteTime = 600;
let blackTime = 600;

// Posição atualmente visualizada no histórico.
let viewPly = 0;

// Estado da página de histórico de partidas.
let savedGames = [];
let selectedSavedGameId = null;
let currentOutcomeFilter = "all";
let currentSearchQuery = "";


function generateRecordId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}


/**
 * Converte uma casa algébrica ("e4") para coordenadas lógicas do tabuleiro (0..7),
 * sempre com a8 = { col: 0, row: 0 } e h1 = { col: 7, row: 7 }.
 * A inversão visual (flipped) é aplicada exclusivamente na camada de renderização.
 */
function squareToCell(squareName) {
    if (!squareName || squareName.length < 2) {
        return null;
    }
    const boardCol = "abcdefgh".indexOf(squareName[0]);
    const boardRow = 8 - Number(squareName[1]);
    if (boardCol < 0 || boardRow < 0 || boardRow > 7) {
        return null;
    }
    return {
        col: boardCol,
        row: boardRow
    };
}


// --------------------------------------------------
// SETAS COM BOTÃO DIREITO (ESTILO CHESS.COM + "L")
// --------------------------------------------------

function sameGridCell(a, b) {
    return Boolean(a && b && a.col === b.col && a.row === b.row);
}

function getLogicalCellFromPointForElement(clientX, clientY, targetEl, flipped = false) {
    if (!targetEl) {
        return null;
    }

    const rect = targetEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
        return null;
    }

    const relX = (clientX - rect.left) / rect.width;
    const relY = (clientY - rect.top) / rect.height;

    if (relX < 0 || relX >= 1 || relY < 0 || relY >= 1) {
        return null;
    }

    let col = Math.floor(relX * 8);
    let row = Math.floor(relY * 8);

    if (flipped) {
        col = 7 - col;
        row = 7 - row;
    }

    return { col, row };
}

function getLogicalCellFromClientPoint(clientX, clientY) {
    return getLogicalCellFromPointForElement(
        clientX,
        clientY,
        boardElement || boardWrapperElement,
        isBoardFlipped()
    );
}

function cellToSvgCenter(cell, flipped = false) {
    const visualCol = flipped ? 7 - cell.col : cell.col;
    const visualRow = flipped ? 7 - cell.row : cell.row;

    return {
        x: visualCol * ARROW_SQUARE_SIZE + ARROW_SQUARE_SIZE / 2,
        y: visualRow * ARROW_SQUARE_SIZE + ARROW_SQUARE_SIZE / 2
    };
}

function logicalCellToSvgCenter(cell) {
    return cellToSvgCenter(cell, isBoardFlipped());
}

function isKnightJump(fromCell, toCell) {
    const dc = Math.abs(toCell.col - fromCell.col);
    const dr = Math.abs(toCell.row - fromCell.row);
    return (dc === 2 && dr === 1) || (dc === 1 && dr === 2);
}

/**
 * Gera o contorno poligonal único da seta (corpo + ponta triangular sem sobreposição).
 * Suporta setas retas/diagonais e dobra ortogonal em "L" para movimentos de cavalo.
 */
function buildChessArrowPathData(fromCell, toCell, flipped = false) {
    const start = cellToSvgCenter(fromCell, flipped);
    const end = cellToSvgCenter(toCell, flipped);

    const shaftHalf = 10.5;
    const headHalf = 25;
    const headLength = 38;
    const startMargin = 24;
    const endMargin = 14;

    if (!isKnightJump(fromCell, toCell)) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 1) {
            return "";
        }

        const ux = dx / dist;
        const uy = dy / dist;
        const px = -uy;
        const py = ux;

        const sx = start.x + ux * startMargin;
        const sy = start.y + uy * startMargin;

        const tipX = end.x - ux * endMargin;
        const tipY = end.y - uy * endMargin;

        const neckX = tipX - ux * headLength;
        const neckY = tipY - uy * headLength;

        const pts = [
            [sx + px * shaftHalf, sy + py * shaftHalf],
            [neckX + px * shaftHalf, neckY + py * shaftHalf],
            [neckX + px * headHalf, neckY + py * headHalf],
            [tipX, tipY],
            [neckX - px * headHalf, neckY - py * headHalf],
            [neckX - px * shaftHalf, neckY - py * shaftHalf],
            [sx - px * shaftHalf, sy - py * shaftHalf]
        ];

        return (
            pts
                .map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
                .join(" ") + " Z"
        );
    }

    const dc = Math.abs(toCell.col - fromCell.col);
    const elbow = dc === 2
        ? { x: end.x, y: start.y }
        : { x: start.x, y: end.y };

    const d1x = elbow.x - start.x;
    const d1y = elbow.y - start.y;
    const len1 = Math.hypot(d1x, d1y);
    const u1x = d1x / len1;
    const u1y = d1y / len1;

    const d2x = end.x - elbow.x;
    const d2y = end.y - elbow.y;
    const len2 = Math.hypot(d2x, d2y);
    const u2x = d2x / len2;
    const u2y = d2y / len2;

    const turn = Math.sign(u1x * u2y - u1y * u2x);

    const inX = -u1y * turn;
    const inY = u1x * turn;

    const sx = start.x + u1x * startMargin;
    const sy = start.y + u1y * startMargin;

    const tipX = end.x - u2x * endMargin;
    const tipY = end.y - u2y * endMargin;

    const neckX = tipX - u2x * headLength;
    const neckY = tipY - u2y * headLength;

    const outerCornerX = elbow.x + u1x * shaftHalf - inX * shaftHalf;
    const outerCornerY = elbow.y + u1y * shaftHalf - inY * shaftHalf;

    const innerCornerX = elbow.x - u1x * shaftHalf + inX * shaftHalf;
    const innerCornerY = elbow.y - u1y * shaftHalf + inY * shaftHalf;

    const p2x = -u2y;
    const p2y = u2x;

    const neckOuterX = neckX + (turn > 0 ? p2x : -p2x) * -shaftHalf;
    const neckOuterY = neckY + (turn > 0 ? p2y : -p2y) * -shaftHalf;

    const headOuterX = neckX + (turn > 0 ? p2x : -p2x) * -headHalf;
    const headOuterY = neckY + (turn > 0 ? p2y : -p2y) * -headHalf;

    const headInnerX = neckX + (turn > 0 ? p2x : -p2x) * headHalf;
    const headInnerY = neckY + (turn > 0 ? p2y : -p2y) * headHalf;

    const neckInnerX = neckX + (turn > 0 ? p2x : -p2x) * shaftHalf;
    const neckInnerY = neckY + (turn > 0 ? p2y : -p2y) * shaftHalf;

    const pts = [
        [sx - inX * shaftHalf, sy - inY * shaftHalf],
        [outerCornerX, outerCornerY],
        [neckOuterX, neckOuterY],
        [headOuterX, headOuterY],
        [tipX, tipY],
        [headInnerX, headInnerY],
        [neckInnerX, neckInnerY],
        [innerCornerX, innerCornerY],
        [sx + inX * shaftHalf, sy + inY * shaftHalf]
    ];

    return (
        pts
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
            .join(" ") + " Z"
    );
}

function createSvgArrowPath(fromCell, toCell, extraClass = "", flipped = false) {
    const d = buildChessArrowPathData(fromCell, toCell, flipped);
    const pathEl = document.createElementNS(SVG_NS, "path");
    pathEl.setAttribute("d", d);
    pathEl.setAttribute("class", extraClass || "chess-arrow-shape");
    return pathEl;
}

function renderSavedArrows() {
    if (!savedArrowsGroup) {
        return;
    }

    savedArrowsGroup.innerHTML = "";
    for (const arrow of drawnArrows) {
        if (!sameGridCell(arrow.from, arrow.to)) {
            savedArrowsGroup.appendChild(
                createSvgArrowPath(arrow.from, arrow.to, "chess-arrow-shape", isBoardFlipped())
            );
        }
    }
}

function renderPreviewArrow() {
    if (!previewArrowGroup) {
        return;
    }

    previewArrowGroup.innerHTML = "";
    if (
        isRightDrawing &&
        arrowStartCell &&
        arrowHoverCell &&
        !sameGridCell(arrowStartCell, arrowHoverCell)
    ) {
        previewArrowGroup.appendChild(
            createSvgArrowPath(
                arrowStartCell,
                arrowHoverCell,
                "chess-arrow-shape preview",
                isBoardFlipped()
            )
        );
    }
}

function toggleArrow(fromCell, toCell) {
    if (sameGridCell(fromCell, toCell)) {
        return;
    }

    const existingIndex = drawnArrows.findIndex(
        item => sameGridCell(item.from, fromCell) && sameGridCell(item.to, toCell)
    );

    if (existingIndex >= 0) {
        drawnArrows.splice(existingIndex, 1);
    } else {
        drawnArrows.push({ from: fromCell, to: toCell });
    }

    renderSavedArrows();
}

function clearDrawnArrows() {
    isRightDrawing = false;
    arrowStartCell = null;
    arrowHoverCell = null;

    if (previewArrowGroup) {
        previewArrowGroup.innerHTML = "";
    }

    if (drawnArrows.length > 0) {
        drawnArrows.length = 0;
        renderSavedArrows();
    }
}


// --------------------------------------------------
// POSIÇÕES E COORDENADAS (COM SUPORTE A INVERSÃO)
// --------------------------------------------------

const BOARD_THEMES = {
    default: {
        label: "Padrão",
        light: [75, 86, 102],
        dark: [46, 54, 65]
    },
    purple: {
        label: "Roxo",
        light: [251, 250, 255],
        dark: [212, 187, 252]
    }
};

let currentBoardTheme = "default";


function isBoardFlipped() {
    return Boolean(activeConfig?.flipped);
}


function getSquareName(visualRow, visualCol, flipped = isBoardFlipped()) {
    const boardRow = flipped ? 7 - visualRow : visualRow;
    const boardCol = flipped ? 7 - visualCol : visualCol;

    return "abcdefgh"[boardCol] + (8 - boardRow);
}


function getDisplayedState() {
    if (!gameState || !gameState.timeline) {
        return gameState;
    }

    return gameState.timeline[viewPly];
}


function getSquareCenter(squareName) {
    const rect = boardElement.getBoundingClientRect();
    const squareSize = rect.width / 8;

    const boardCol = "abcdefgh".indexOf(squareName[0]);
    const boardRow = 8 - Number(squareName[1]);

    const visualCol = isBoardFlipped() ? 7 - boardCol : boardCol;
    const visualRow = isBoardFlipped() ? 7 - boardRow : boardRow;

    return {
        x: visualCol * squareSize + squareSize / 2,
        y: visualRow * squareSize + squareSize / 2
    };
}


function getSquareAtPoint(x, y) {
    const element = document.elementFromPoint(x, y);

    return element?.closest(".square")?.dataset.square || null;
}


function getBaseSquareColor(visualRow, visualCol, flipped = isBoardFlipped()) {
    const boardRow = flipped ? 7 - visualRow : visualRow;
    const boardCol = flipped ? 7 - visualCol : visualCol;
    const theme = BOARD_THEMES[currentBoardTheme] || BOARD_THEMES.default;

    return (boardRow + boardCol) % 2 === 0
        ? theme.light
        : theme.dark;
}


function blendColor(base, overlay, alpha) {
    return base.map((channel, index) =>
        Math.round(channel * (1 - alpha) + overlay[index] * alpha)
    );
}


function updateBoardOrientationUI() {
    const flipped = isBoardFlipped();

    if (rankCoordinatesElement) {
        const ranks = flipped
            ? ["1", "2", "3", "4", "5", "6", "7", "8"]
            : ["8", "7", "6", "5", "4", "3", "2", "1"];
        rankCoordinatesElement.innerHTML = ranks.map(r => `<span>${r}</span>`).join("");
    }

    if (fileCoordinatesElement) {
        const files = flipped
            ? ["h", "g", "f", "e", "d", "c", "b", "a"]
            : ["a", "b", "c", "d", "e", "f", "g", "h"];
        fileCoordinatesElement.innerHTML = files.map(f => `<span>${f}</span>`).join("");
    }

    if (playSidebarElement) {
        playSidebarElement.classList.toggle("flipped-players", flipped);
    }

    renderSavedArrows();
    renderPreviewArrow();
}


function updatePlayerLabels() {
    if (!activeConfig) {
        return;
    }

    if (activeConfig.mode === "bot") {
        const botDesc = `Bot Nível ${activeConfig.botLevel}`;

        if (resolvedHumanColor === "white") {
            whitePlayerRole.textContent = "Você";
            blackPlayerRole.textContent = botDesc;
        } else {
            whitePlayerRole.textContent = botDesc;
            blackPlayerRole.textContent = "Você";
        }
    } else {
        whitePlayerRole.textContent = "Você — Jogador 1";
        blackPlayerRole.textContent = "Jogador 2";
    }
}


// --------------------------------------------------
// PEÇAS
// --------------------------------------------------

function getPieceImage(piece) {
    return `/static/sprites/${piece.color}/${pieceNames[piece.type]}.png`;
}


function getLegalDestinations(square) {
    const displayedState = getDisplayedState();

    if (!displayedState) {
        return [];
    }

    return displayedState.legal_moves
        .filter(move => move.startsWith(square))
        .map(move => move.slice(2, 4));
}


function isBotTurn() {
    if (!activeConfig || activeConfig.mode !== "bot" || !gameState) {
        return false;
    }

    return gameState.turn !== resolvedHumanColor;
}


// --------------------------------------------------
// STATUS DA PARTIDA
// --------------------------------------------------

function updateStatus() {
    const displayedState = getDisplayedState();

    if (!displayedState) {
        return;
    }

    if (newGameAfterEndButton) {
        newGameAfterEndButton.hidden = !isMatchConfigured || gameActive;
    }

    if (viewPly !== gameState.total_plies) {
        statusElement.textContent = `Visualizando posição após ${viewPly} jogada(s)`;
        checkWarningElement.textContent = "MODO DE VISUALIZAÇÃO";
        return;
    }

    if (displayedState.checkmate) {
        statusElement.textContent =
            displayedState.turn === "white"
                ? "Xeque-mate! Pretas venceram."
                : "Xeque-mate! Brancas venceram.";

        checkWarningElement.textContent = "XEQUE-MATE";
        return;
    }

    if (displayedState.stalemate) {
        statusElement.textContent = "Empate por afogamento.";
        checkWarningElement.textContent = "EMPATE";
        return;
    }

    if (isBotTurn() && gameActive) {
        statusElement.textContent = `Bot (Nível ${activeConfig.botLevel}) pensando...`;
    } else {
        statusElement.textContent =
            displayedState.turn === "white"
                ? "Vez das brancas"
                : "Vez das pretas";
    }

    checkWarningElement.textContent = displayedState.check_square ? "⚠ Xeque!" : "";
}


function updateTurnIndicators() {
    const displayedState = getDisplayedState();

    if (!displayedState) {
        return;
    }

    const whiteTurn = displayedState.turn === "white";

    whiteIndicator.classList.toggle("active", whiteTurn);
    blackIndicator.classList.toggle("active", !whiteTurn);

    whitePlayerCard.classList.toggle("active-player", whiteTurn);
    blackPlayerCard.classList.toggle("active-player", !whiteTurn);
}


// --------------------------------------------------
// HISTÓRICO DE JOGADAS
// --------------------------------------------------

function renderHistory() {
    historyBody.innerHTML = "";

    const history = gameState.history || [];

    if (history.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 3;
        cell.className = "empty-history";
        cell.textContent = "Nenhuma jogada realizada.";

        row.appendChild(cell);
        historyBody.appendChild(row);
    } else {
        history.forEach(move => {
            const row = document.createElement("tr");

            const numberCell = document.createElement("td");
            const whiteCell = document.createElement("td");
            const blackCell = document.createElement("td");

            numberCell.textContent = `${move.number}.`;
            whiteCell.textContent = move.white;
            blackCell.textContent = move.black || "—";

            const whitePly = (move.number - 1) * 2 + 1;
            const blackPly = whitePly + 1;

            whiteCell.dataset.ply = whitePly;
            blackCell.dataset.ply = blackPly;

            if (viewPly === whitePly) {
                whiteCell.classList.add("history-move-current");
            }

            if (viewPly === blackPly && move.black) {
                blackCell.classList.add("history-move-current");
            }

            row.appendChild(numberCell);
            row.appendChild(whiteCell);
            row.appendChild(blackCell);

            historyBody.appendChild(row);
        });
    }

    const container = historyBody.closest(".history-table-container");

    if (container && viewPly === gameState.total_plies) {
        container.scrollTop = container.scrollHeight;
    }

    updateHistoryControls();
}


function updateHistoryControls() {
    if (!gameState) {
        return;
    }

    const total = gameState.total_plies;

    prevButton.disabled = busy || viewPly <= 0;
    nextButton.disabled = busy || viewPly >= total;

    undoButton.disabled = busy || !gameActive || total === 0;
    resetButton.disabled = busy;

    if (viewPly === 0) {
        historyPositionLabel.textContent = "Posição inicial";
    } else if (viewPly === total) {
        historyPositionLabel.textContent = "Posição atual";
    } else {
        historyPositionLabel.textContent = `Visualizando jogada ${Math.ceil(viewPly / 2)}`;
    }
}


// --------------------------------------------------
// REVISÃO ANIMADA DAS JOGADAS
// --------------------------------------------------

async function goToPly(ply) {
    if (!gameState || busy) {
        return;
    }

    const targetPly = Math.max(0, Math.min(ply, gameState.total_plies));

    if (targetPly === viewPly) {
        return;
    }

    busy = true;
    selectedSquare = null;
    dragging = null;

    updateHistoryControls();

    try {
        while (viewPly !== targetPly) {
            const direction = targetPly > viewPly ? 1 : -1;

            const currentState = getDisplayedState();
            const nextPly = viewPly + direction;
            const nextState = gameState.timeline[nextPly];

            const move = direction > 0
                ? nextState.last_move
                : currentState.last_move;

            if (move && move.from && move.to) {
                const from = direction > 0 ? move.from : move.to;
                const to = direction > 0 ? move.to : move.from;
                const piece = currentState.pieces[from];

                viewPly = nextPly;

                if (piece) {
                    animation = {
                        from,
                        to,
                        piece,
                        image: null
                    };

                    renderBoard();
                    await runMoveAnimation();
                } else {
                    animation = null;
                    renderBoard();
                }
            } else {
                viewPly = nextPly;
                animation = null;
                renderBoard();
            }
        }
    } finally {
        animation = null;
        busy = false;

        renderBoard();
        updateHistoryControls();
    }
}


function previousPosition() {
    goToPly(viewPly - 1);
}


function nextPosition() {
    goToPly(viewPly + 1);
}


// --------------------------------------------------
// CAPTURAS
// --------------------------------------------------

function renderCaptures() {
    whiteCapturesElement.textContent = (gameState.white_captures || []).join(" ") || "Nenhuma";
    blackCapturesElement.textContent = (gameState.black_captures || []).join(" ") || "Nenhuma";
}


// --------------------------------------------------
// RELÓGIOS (COM ACRÉSCIMO E MODO SEM TEMPO)
// --------------------------------------------------

function isUntimedMatch() {
    return !activeConfig || activeConfig.baseSeconds === 0;
}


function formatTime(seconds) {
    if (isUntimedMatch()) {
        return "∞";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(remainingSeconds).padStart(2, "0")
    );
}


function renderTimers() {
    whiteTimerElement.textContent = formatTime(whiteTime);
    blackTimerElement.textContent = formatTime(blackTime);

    const untimed = isUntimedMatch();
    whiteTimerElement.classList.toggle("low-time", !untimed && whiteTime <= 30);
    blackTimerElement.classList.toggle("low-time", !untimed && blackTime <= 30);
}


function stopClock() {
    if (clockInterval !== null) {
        clearInterval(clockInterval);
        clockInterval = null;
    }
}


function startClock() {
    if (isUntimedMatch() || !clockStarted || !gameActive || !gameState) {
        return;
    }

    stopClock();

    clockInterval = setInterval(() => {
        if (!gameActive || !gameState) {
            return;
        }

        if (gameState.turn === "white") {
            whiteTime = Math.max(0, whiteTime - 1);

            if (whiteTime === 0) {
                gameActive = false;
                stopClock();

                statusElement.textContent = "Tempo esgotado! Pretas venceram.";
                checkWarningElement.textContent = "TEMPO ESGOTADO";
                updateStatus();
                updateHistoryControls();

                saveGameRecord(gameState, "loss", "0-1 (Tempo)");
            }
        } else {
            blackTime = Math.max(0, blackTime - 1);

            if (blackTime === 0) {
                gameActive = false;
                stopClock();

                statusElement.textContent = "Tempo esgotado! Brancas venceram.";
                checkWarningElement.textContent = "TEMPO ESGOTADO";
                updateStatus();
                updateHistoryControls();

                saveGameRecord(gameState, "win", "1-0 (Tempo)");
            }
        }

        renderTimers();
    }, 1000);
}


function resetClock() {
    const initial = activeConfig ? activeConfig.baseSeconds : 600;
    whiteTime = initial;
    blackTime = initial;
    clockStarted = false;

    stopClock();
    renderTimers();
}


// --------------------------------------------------
// NOTIFICAÇÕES EMPILHADAS
// --------------------------------------------------

function showToast(message) {
    let stack = document.getElementById("toast-stack");

    if (!stack) {
        stack = document.createElement("div");
        stack.id = "toast-stack";
        document.body.appendChild(stack);
    }

    const alreadyVisible = Array.from(stack.children).some(
        toast => toast.textContent === message
    );

    if (alreadyVisible) {
        return;
    }

    const toast = document.createElement("div");

    toast.className = "toast-msg";
    toast.textContent = message;

    stack.prepend(toast);

    requestAnimationFrame(() => {
        toast.classList.add("visible");
    });

    setTimeout(() => {
        toast.classList.add("removing");
        toast.classList.remove("visible");

        setTimeout(() => toast.remove(), 250);
    }, 2500);
}


// --------------------------------------------------
// RENDERIZAÇÃO DO TABULEIRO
// --------------------------------------------------

function renderBoard() {
    boardElement.innerHTML = "";

    const displayedState = getDisplayedState();

    if (!displayedState) {
        return;
    }

    const legalDestinations = selectedSquare
        ? getLegalDestinations(selectedSquare)
        : [];

    const rect = boardElement.getBoundingClientRect();
    const squareSize = rect.width / 8;

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const squareName = getSquareName(row, col);
            const square = document.createElement("div");

            const baseColor = getBaseSquareColor(row, col);
            let color = [...baseColor];

            square.className = "square";
            square.dataset.square = squareName;

            if (
                displayedState.last_move &&
                (
                    displayedState.last_move.from === squareName ||
                    displayedState.last_move.to === squareName
                )
            ) {
                color = blendColor(color, [255, 220, 80], 0.33);
            }

            if (displayedState.check_square === squareName) {
                color = blendColor(color, [220, 40, 40], 0.50);
            }

            if (displayedState.winning_king === squareName) {
                color = blendColor(color, [40, 190, 80], 0.58);
            }

            square.style.backgroundColor = `rgb(${color.join(", ")})`;

            if (selectedSquare === squareName) {
                square.classList.add("selected");
            }

            const piece = displayedState.pieces[squareName];

            if (legalDestinations.includes(squareName)) {
                const marker = document.createElement("div");

                if (piece) {
                    marker.className = "capture-marker";
                    marker.style.borderWidth = `${Math.max(2, squareSize * 0.05)}px`;
                } else {
                    marker.className = "legal-dot";
                }

                square.appendChild(marker);
            }

            const isDraggingPiece = dragging && dragging.from === squareName;
            const isAnimatingPiece = animation && animation.to === squareName;

            if (piece && !isDraggingPiece && !isAnimatingPiece) {
                const image = document.createElement("img");

                image.src = getPieceImage(piece);
                image.alt = pieceNames[piece.type];
                image.className = "piece";
                image.draggable = false;

                square.appendChild(image);
            }

            boardElement.appendChild(square);
        }
    }

    if (dragging) {
        const image = createFloatingPiece(dragging.piece, 1.15);

        dragging.image = image;
        boardElement.appendChild(image);

        positionDraggedPiece(dragging.x, dragging.y);
    }

    if (animation) {
        const image = createFloatingPiece(animation.piece, 0.90);

        animation.image = image;

        const center = getSquareCenter(animation.from);

        image.style.left = `${center.x}px`;
        image.style.top = `${center.y}px`;

        boardElement.appendChild(image);
    }

    if (displayedState.checkmate && displayedState.losing_king) {
        const center = getSquareCenter(displayedState.losing_king);

        const marker = document.createElement("span");

        marker.className = "checkmate-marker";
        marker.textContent = "#";

        marker.style.left = `${center.x + squareSize * 0.22}px`;
        marker.style.top = `${center.y - squareSize * 0.22}px`;
        marker.style.fontSize = `${squareSize * 0.30}px`;

        boardElement.appendChild(marker);
    }

    renderSavedArrows();
    renderPreviewArrow();

    updateStatus();
    updateTurnIndicators();
    renderHistory();
    renderCaptures();
}


// --------------------------------------------------
// ANÁLISE DE PARTIDA (3 CAMADAS: STOCKFISH + EP/CAPS2 + TREINADOR)
// --------------------------------------------------

// A análise oficial vem do Stockfish no backend.
// Não existe fallback por contagem de material: ele produzia avaliações
// e classificações que não representavam a posição real.

function getClassificationBadgeStyleKey(classificationKey) {
    return classificationKey === "best" || classificationKey === "excellent"
        ? "good"
        : classificationKey;
}

function formatEvalText(score) {
    if (Math.abs(score) >= 90) {
        return score > 0 ? "+M" : "-M";
    }
    if (score > 0) return `+${score.toFixed(1)}`;
    if (score < 0) return score.toFixed(1);
    return "0.0";
}

function renderEvalBar(score, customText = null, expectedPoints = null) {
    if (!analysisEvalBlackEl || !analysisEvalWhiteEl || !analysisEvalScoreEl) {
        return;
    }

    let whitePct;
    if (typeof expectedPoints === "number") {
        whitePct = 5 + expectedPoints * 90;
    } else {
        const clamped = Math.max(-10, Math.min(10, score));
        whitePct = 50 + (clamped / 10) * 45;
    }

    const blackPct = 100 - whitePct;

    analysisEvalWhiteEl.style.height = `${whitePct.toFixed(1)}%`;
    analysisEvalBlackEl.style.height = `${blackPct.toFixed(1)}%`;
    analysisEvalScoreEl.textContent = customText || formatEvalText(score);
}

function renderAnalysisMetrics() {
    if (
        !analysisAccWhiteEl ||
        !analysisAccBlackEl ||
        !analysisRatingWhiteEl ||
        !analysisRatingBlackEl
    ) {
        return;
    }

    if (!analysisGame || !analysisReport) {
        analysisAccWhiteEl.textContent = "—";
        analysisAccBlackEl.textContent = "—";
        analysisRatingWhiteEl.textContent = "Rating: —";
        analysisRatingBlackEl.textContent = "Rating: —";
        return;
    }

    const wAcc = analysisReport.accuracy?.white;
    const bAcc = analysisReport.accuracy?.black;
    const wRating = null;
    const bRating = null;

    analysisAccWhiteEl.textContent = typeof wAcc === "number" ? `${wAcc.toFixed(1)}%` : "—";
    analysisAccBlackEl.textContent = typeof bAcc === "number" ? `${bAcc.toFixed(1)}%` : "—";
    analysisRatingWhiteEl.textContent =
        typeof wRating === "number" ? `Rating: ~${wRating}` : "Rating: —";
    analysisRatingBlackEl.textContent =
        typeof bRating === "number" ? `Rating: ~${bRating}` : "Rating: —";
}

function renderAnalysisClassificationSummary() {
    if (!analysisClassSummaryEl) {
        return;
    }

    const order = [
        "brilliant",
        "great",
        "best",
        "excellent",
        "good",
        "book",
        "inaccuracy",
        "mistake",
        "blunder"
    ];
    const wSum = analysisReport?.summary?.white || {};
    const bSum = analysisReport?.summary?.black || {};

    analysisClassSummaryEl.innerHTML = "";
    for (const key of order) {
        const meta = MOVE_CLASSIFICATIONS[key];
        const wVal = wSum[key] || 0;
        const bVal = bSum[key] || 0;

        const row = document.createElement("div");
        row.className = "analysis-class-row";

        const labelWrap = document.createElement("span");
        labelWrap.className = "analysis-class-label";

        const badge = document.createElement("span");
        badge.className = `analysis-mini-badge ${getClassificationBadgeStyleKey(key)}`;
        badge.textContent = meta.symbol;

        const textSpan = document.createElement("span");
        textSpan.textContent = meta.label;

        labelWrap.appendChild(badge);
        labelWrap.appendChild(textSpan);

        const wCount = document.createElement("span");
        wCount.className = `analysis-class-count ${wVal > 0 ? "has-val" : ""}`;
        wCount.textContent = String(wVal);

        const bCount = document.createElement("span");
        bCount.className = `analysis-class-count ${
            key === "blunder" && bVal > 0 ? "blunder-val" : (bVal > 0 ? "has-val" : "")
        }`;
        bCount.textContent = String(bVal);

        row.appendChild(labelWrap);
        row.appendChild(wCount);
        row.appendChild(bCount);
        analysisClassSummaryEl.appendChild(row);
    }
}

function getAnalysisMaxPly() {
    if (
        !analysisGame ||
        !Array.isArray(analysisGame.timeline) ||
        analysisGame.timeline.length === 0
    ) {
        return 0;
    }
    return analysisGame.timeline.length - 1;
}

function getAnalysisStateAtPly(ply) {
    if (!analysisGame) {
        return null;
    }
    if (Array.isArray(analysisGame.timeline) && analysisGame.timeline[ply]) {
        return analysisGame.timeline[ply];
    }
    return {
        pieces: analysisGame.finalPieces || {},
        turn: "white",
        last_move: null,
        check_square: null,
        winning_king: null,
        losing_king: null,
        checkmate: false
    };
}

function renderAnalysisArrowsAndBadges(plyInfo, prevPlyInfo = null) {
    if (analysisBestArrowGroup) analysisBestArrowGroup.innerHTML = "";
    if (analysisPlayedArrowGroup) analysisPlayedArrowGroup.innerHTML = "";
    if (analysisSavedArrowsGroup) analysisSavedArrowsGroup.innerHTML = "";
    if (analysisPreviewArrowGroup) analysisPreviewArrowGroup.innerHTML = "";
    if (analysisBadgesLayer) analysisBadgesLayer.innerHTML = "";

    // 1. Seta verde: melhor lance que a engine recomendava para esta jogada (prevPlyInfo.bestMove)
    // ou para a posição inicial (ply 0 -> plyInfo.bestMove)
    const recommendedMove = analysisPly > 0 ? prevPlyInfo?.bestMove : plyInfo?.bestMove;
    if (analysisBestArrowGroup && recommendedMove) {
        const fromCell = squareToCell(recommendedMove.from);
        const toCell = squareToCell(recommendedMove.to);
        if (fromCell && toCell && !sameGridCell(fromCell, toCell)) {
            analysisBestArrowGroup.appendChild(
                createSvgArrowPath(fromCell, toCell, "analysis-best-arrow", analysisFlipped)
            );
        }
    }

    // 2. Seta âmbar: lance efetivamente jogado neste ply + badge de classificação
    const state = getAnalysisStateAtPly(analysisPly);
    if (plyInfo && state?.last_move) {
        const fromCell = squareToCell(state.last_move.from);
        const toCell = squareToCell(state.last_move.to);

        const sameAsBest = Boolean(
            recommendedMove &&
            recommendedMove.from === state.last_move.from &&
            recommendedMove.to === state.last_move.to
        );

        if (
            analysisPlayedArrowGroup &&
            fromCell &&
            toCell &&
            !sameGridCell(fromCell, toCell) &&
            !sameAsBest
        ) {
            analysisPlayedArrowGroup.appendChild(
                createSvgArrowPath(fromCell, toCell, "analysis-played-arrow", analysisFlipped)
            );
        }

        if (
            analysisBadgesLayer &&
            plyInfo.classification &&
            MOVE_CLASSIFICATIONS[plyInfo.classification] &&
            toCell
        ) {
            const meta = MOVE_CLASSIFICATIONS[plyInfo.classification];
            const visualCol = analysisFlipped ? 7 - toCell.col : toCell.col;
            const visualRow = analysisFlipped ? 7 - toCell.row : toCell.row;

            const badge = document.createElement("span");
            badge.className = `move-class-badge ${meta.key}`;
            badge.textContent = meta.symbol;
            badge.style.left = `${((visualCol + 0.82) / 8) * 100}%`;
            badge.style.top = `${((visualRow + 0.22) / 8) * 100}%`;
            analysisBadgesLayer.appendChild(badge);
        }
    }

    // 3. Setas manuais feitas com botão direito na análise
    if (analysisSavedArrowsGroup) {
        for (const arrow of analysisCustomArrows) {
            if (!sameGridCell(arrow.from, arrow.to)) {
                analysisSavedArrowsGroup.appendChild(
                    createSvgArrowPath(arrow.from, arrow.to, "chess-arrow-shape", analysisFlipped)
                );
            }
        }
    }

    if (
        analysisPreviewArrowGroup &&
        isAnalysisRightDrawing &&
        analysisArrowStart &&
        analysisArrowHover &&
        !sameGridCell(analysisArrowStart, analysisArrowHover)
    ) {
        analysisPreviewArrowGroup.appendChild(
            createSvgArrowPath(
                analysisArrowStart,
                analysisArrowHover,
                "chess-arrow-shape preview",
                analysisFlipped
            )
        );
    }
}

function renderAnalysisMoveCell(cellEl, sanText, plyNumber, perPly) {
    if (!sanText) {
        cellEl.textContent = "—";
        return;
    }

    cellEl.dataset.analysisPly = plyNumber;
    const info = perPly[plyNumber];
    const meta = info?.classification ? MOVE_CLASSIFICATIONS[info.classification] : null;

    if (meta) {
        cellEl.innerHTML =
            `<span class="analysis-move-cell">${sanText} ` +
            `<span class="analysis-mini-badge ${getClassificationBadgeStyleKey(meta.key)}">` +
            `${meta.symbol}</span></span>`;
    } else {
        cellEl.textContent = sanText;
    }

    if (analysisPly === plyNumber) {
        cellEl.classList.add("history-move-current");
    }
}

function renderAnalysisMoves() {
    if (!analysisMovesBody) {
        return;
    }

    analysisMovesBody.innerHTML = "";
    const history = analysisGame?.history || [];
    const perPly = analysisReport?.perPly || [];

    if (!history.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 3;
        cell.className = "empty-history";
        cell.textContent = "Nenhuma jogada registrada nesta partida.";
        row.appendChild(cell);
        analysisMovesBody.appendChild(row);
        return;
    }

    history.forEach(move => {
        const row = document.createElement("tr");
        const numTd = document.createElement("td");
        const whiteTd = document.createElement("td");
        const blackTd = document.createElement("td");

        numTd.textContent = `${move.number}.`;

        const whitePly = (move.number - 1) * 2 + 1;
        const blackPly = whitePly + 1;

        renderAnalysisMoveCell(whiteTd, move.white, whitePly, perPly);
        renderAnalysisMoveCell(blackTd, move.black, blackPly, perPly);

        row.appendChild(numTd);
        row.appendChild(whiteTd);
        row.appendChild(blackTd);
        analysisMovesBody.appendChild(row);
    });
}

function renderAnalysisView() {
    if (!analysisBoardElement) {
        return;
    }

    if (analysisRankCoordsElement) {
        const ranks = analysisFlipped
            ? ["1", "2", "3", "4", "5", "6", "7", "8"]
            : ["8", "7", "6", "5", "4", "3", "2", "1"];
        analysisRankCoordsElement.innerHTML = ranks.map(r => `<span>${r}</span>`).join("");
    }

    if (analysisFileCoordsElement) {
        const files = analysisFlipped
            ? ["h", "g", "f", "e", "d", "c", "b", "a"]
            : ["a", "b", "c", "d", "e", "f", "g", "h"];
        analysisFileCoordsElement.innerHTML = files.map(f => `<span>${f}</span>`).join("");
    }

    const maxPly = getAnalysisMaxPly();
    const state = getAnalysisStateAtPly(analysisPly);
    const plyInfo = analysisReport?.perPly?.[analysisPly] || null;
    const prevPlyInfo = analysisPly > 0 ? (analysisReport?.perPly?.[analysisPly - 1] || null) : null;

    if (analysisGameBadge) {
        analysisGameBadge.textContent = analysisGame ? `#${analysisGame.id}` : "—";
    }

    if (analysisMetaInline) {
        analysisMetaInline.textContent = analysisGame ? `${analysisPly} / ${maxPly}` : "0 / 0";
    }

    renderEvalBar(
        plyInfo ? plyInfo.evalScore : 0,
        plyInfo?.evalText || null,
        plyInfo?.expectedPoints ?? null
    );
    renderAnalysisMetrics();
    renderAnalysisClassificationSummary();

    if (analysisPlyLabel) {
        if (!analysisGame) {
            analysisPlyLabel.textContent = "Selecione uma partida no histórico para revisar.";
        } else if (analysisPly === 0) {
            analysisPlyLabel.textContent = `Posição inicial · ${analysisGame.mode}`;
        } else {
            const moveNum = Math.ceil(analysisPly / 2);
            const sideText = analysisPly % 2 === 1 ? "Brancas" : "Pretas";
            const classMeta = plyInfo?.classification
                ? MOVE_CLASSIFICATIONS[plyInfo.classification]
                : null;
            const epText = typeof plyInfo?.expectedPoints === "number"
                ? ` · Chance Brancas: ${Math.round(plyInfo.expectedPoints * 100)}%`
                : "";
            analysisPlyLabel.textContent = classMeta
                ? `Lance ${moveNum} (${sideText}) · ${classMeta.label} (${classMeta.symbol})${epText}`
                : `Lance ${moveNum} (${sideText})${epText}`;
        }
    }

    if (analysisMoveFeedback) {
        if (!analysisGame) {
            analysisMoveFeedback.textContent = "";
        } else if (plyInfo?.commentary) {
            analysisMoveFeedback.textContent = plyInfo.commentary;
        } else if (prevPlyInfo?.bestMove) {
            analysisMoveFeedback.textContent =
                `Melhor lance sugerido: ${prevPlyInfo.bestMove.from}→${prevPlyInfo.bestMove.to}`;
        } else {
            analysisMoveFeedback.textContent = analysisGame.resultLabel || "";
        }
    }

    if (analysisBtnStart) analysisBtnStart.disabled = !analysisGame || analysisPly <= 0;
    if (analysisBtnPrev) analysisBtnPrev.disabled = !analysisGame || analysisPly <= 0;
    if (analysisBtnNext) analysisBtnNext.disabled = !analysisGame || analysisPly >= maxPly;
    if (analysisBtnEnd) analysisBtnEnd.disabled = !analysisGame || analysisPly >= maxPly;

    analysisBoardElement.innerHTML = "";
    if (!state) {
        renderAnalysisMoves();
        renderAnalysisArrowsAndBadges(null, null);
        return;
    }

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const squareName = getSquareName(row, col, analysisFlipped);
            const square = document.createElement("div");
            let color = [...getBaseSquareColor(row, col, analysisFlipped)];

            square.className = "square";
            square.dataset.square = squareName;

            if (
                state.last_move &&
                (state.last_move.from === squareName || state.last_move.to === squareName)
            ) {
                color = blendColor(color, [255, 220, 80], 0.33);
            }

            if (state.check_square === squareName) {
                color = blendColor(color, [220, 40, 40], 0.50);
            }

            if (state.winning_king === squareName) {
                color = blendColor(color, [40, 190, 80], 0.58);
            }

            square.style.backgroundColor = `rgb(${color.join(", ")})`;

            const piece = state.pieces?.[squareName];
            if (piece) {
                const img = document.createElement("img");
                img.src = getPieceImage(piece);
                img.alt = pieceNames[piece.type] || "Peça";
                img.className = "piece";
                img.draggable = false;
                square.appendChild(img);
            }

            analysisBoardElement.appendChild(square);
        }
    }

    renderAnalysisMoves();
    renderAnalysisArrowsAndBadges(plyInfo, prevPlyInfo);
}

function setAnalysisPly(targetPly) {
    if (!analysisGame) {
        return;
    }
    const maxPly = getAnalysisMaxPly();
    analysisPly = Math.max(0, Math.min(targetPly, maxPly));
    renderAnalysisView();
}

async function openGameInAnalysis(game) {
    if (!game) {
        return;
    }

    analysisGame = game;
    analysisReport = null;
    analysisPly = Array.isArray(game.timeline) && game.timeline.length > 0
        ? game.timeline.length - 1
        : 0;
    analysisCustomArrows.length = 0;
    isAnalysisRightDrawing = false;
    analysisArrowStart = null;
    analysisArrowHover = null;

    switchFeatureTab("analysis");
    renderAnalysisView();

    if (!Array.isArray(game.history) || game.history.length === 0) {
        return;
    }

    if (analysisMoveFeedback) {
        analysisMoveFeedback.textContent = "Analisando a partida com Stockfish...";
    }

    try {
        const response = await fetch("/api/games/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ history: game.history })
        });

        if (!response.ok) {
            const detail = await response.text().catch(() => "");
            throw new Error(detail || `Falha na análise (HTTP ${response.status}).`);
        }

        const stockfishReport = await response.json();
        if (
            analysisGame?.id === game.id &&
            stockfishReport.engine === "stockfish" &&
            Array.isArray(stockfishReport.perPly) &&
            stockfishReport.perPly.length === (game.timeline?.length || stockfishReport.perPly.length)
        ) {
            analysisReport = stockfishReport;
            renderAnalysisView();
            showToast("Revisão de partida concluída.");
        } else {
            throw new Error("O Stockfish retornou uma análise incompleta.");
        }
    } catch (error) {
        console.error("Falha na análise com Stockfish:", error);
        if (analysisGame?.id === game.id && analysisMoveFeedback) {
            analysisMoveFeedback.textContent =
                "Não foi possível concluir a análise. As métricas foram ocultadas para não exibir números imprecisos.";
        }
        renderAnalysisView();
        showToast("Não foi possível analisar a partida.");
    }
}


// --------------------------------------------------
// PEÇAS FLUTUANTES
// --------------------------------------------------

function createFloatingPiece(piece, size) {
    const rect = boardElement.getBoundingClientRect();
    const squareSize = rect.width / 8;

    const image = document.createElement("img");

    image.src = getPieceImage(piece);
    image.alt = pieceNames[piece.type];
    image.className = "floating-piece";
    image.draggable = false;

    image.style.width = `${squareSize * size}px`;
    image.style.height = `${squareSize * size}px`;

    return image;
}


function positionDraggedPiece(clientX, clientY, isTouch = false) {
    if (!dragging || !dragging.image) {
        return;
    }

    const rect = boardElement.getBoundingClientRect();
    const touchOffset = isTouch ? (rect.width / 8) * 0.45 : 0;

    dragging.image.style.left = `${clientX - rect.left}px`;
    dragging.image.style.top = `${clientY - rect.top - touchOffset}px`;
}


// --------------------------------------------------
// ARRASTAR PEÇAS
// --------------------------------------------------

function startDragging(squareName, event) {
    if (!isMatchConfigured || isBotTurn()) {
        return false;
    }

    const displayedState = getDisplayedState();
    const piece = displayedState.pieces[squareName];

    if (!piece || piece.color !== displayedState.turn) {
        return false;
    }

    selectedSquare = squareName;

    dragging = {
        from: squareName,
        piece,
        x: event.clientX,
        y: event.clientY,
        image: null
    };

    renderBoard();

    return true;
}


// --------------------------------------------------
// ANIMAÇÃO DE MOVIMENTOS
// --------------------------------------------------

function runMoveAnimation() {
    return new Promise(resolve => {
        const currentAnimation = animation;
        const startTime = performance.now();

        const start = getSquareCenter(currentAnimation.from);
        const end = getSquareCenter(currentAnimation.to);

        function frame(currentTime) {
            const progress = Math.min(
                (currentTime - startTime) / ANIMATION_DURATION,
                1
            );

            const smoothProgress = progress * progress * (3 - 2 * progress);

            const currentX = start.x + (end.x - start.x) * smoothProgress;
            const currentY = start.y + (end.y - start.y) * smoothProgress;

            currentAnimation.image.style.left = `${currentX}px`;
            currentAnimation.image.style.top = `${currentY}px`;

            if (progress < 1) {
                requestAnimationFrame(frame);
            } else {
                animation = null;
                renderBoard();
                resolve();
            }
        }

        requestAnimationFrame(frame);
    });
}


// --------------------------------------------------
// ATUALIZAÇÃO DA PARTIDA
// --------------------------------------------------

function applyGameState(data) {
    gameState = data;

    selectedSquare = null;
    dragging = null;
    animation = null;
    clearDrawnArrows();

    viewPly = gameState.total_plies;

    gameActive = !gameState.checkmate && !gameState.stalemate;

    renderBoard();
}


// --------------------------------------------------
// MOVIMENTOS (HUMANO + RESPOSTA DO BOT)
// --------------------------------------------------

function applyIncrementIfNeeded(movingColor) {
    if (!isUntimedMatch() && activeConfig.incrementSeconds > 0 && clockStarted) {
        if (movingColor === "white") {
            whiteTime += activeConfig.incrementSeconds;
        } else if (movingColor === "black") {
            blackTime += activeConfig.incrementSeconds;
        }
        renderTimers();
    }
}

async function handleGameEndIfNeeded(movingPieceColor) {
    if (gameState.checkmate || gameState.stalemate) {
        gameActive = false;
        stopClock();
        updateStatus();

        if (gameState.checkmate) {
            const whiteWon = gameState.turn !== "white";
            await saveGameRecord(
                gameState,
                whiteWon ? "win" : "loss",
                whiteWon ? "1-0 (Brancas)" : "0-1 (Pretas)"
            );
        } else {
            await saveGameRecord(gameState, "draw", "½-½ (Empate)");
        }
        return true;
    }

    if (!clockStarted && movingPieceColor === "white") {
        clockStarted = true;
        startClock();
    }
    return false;
}

async function triggerBotMoveIfNeeded() {
    if (!gameActive || !isBotTurn() || !gameState || !gameState.legal_moves?.length) {
        return;
    }

    busy = true;
    updateStatus();
    updateHistoryControls();

    try {
        await new Promise(resolve => setTimeout(resolve, 350));

        const response = await fetch(`/api/games/${gameId}/bot-move`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ level: activeConfig.botLevel })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Erro no lance do Bot.");
        }

        const lastMove = data.last_move;
        const movingPiece = lastMove ? gameState.pieces[lastMove.from] : null;

        gameState = data;
        viewPly = gameState.total_plies;
        selectedSquare = null;
        clearDrawnArrows();

        applyIncrementIfNeeded(movingPiece?.color);

        if (movingPiece && lastMove) {
            animation = {
                from: lastMove.from,
                to: lastMove.to,
                piece: movingPiece,
                image: null
            };
            renderBoard();
            await runMoveAnimation();
        } else {
            renderBoard();
        }

        await handleGameEndIfNeeded(movingPiece?.color);
    } catch (error) {
        showToast(error.message);
        console.error(error);
    } finally {
        busy = false;
        updateStatus();
        updateHistoryControls();
    }
}


async function makeMove(fromSquare, toSquare, animate = true) {
    if (
        !isMatchConfigured ||
        busy ||
        !gameId ||
        !gameActive ||
        gameState.checkmate ||
        gameState.stalemate ||
        isBotTurn()
    ) {
        return;
    }

    if (viewPly !== gameState.total_plies) {
        viewPly = gameState.total_plies;
        renderBoard();

        showToast("Você voltou à posição atual da partida.");
        return;
    }

    const legalMove = gameState.legal_moves.some(
        move => move.startsWith(fromSquare) && move.slice(2, 4) === toSquare
    );

    if (!legalMove) {
        selectedSquare = null;
        renderBoard();
        return;
    }

    const movingPiece = gameState.pieces[fromSquare];

    busy = true;

    try {
        const response = await fetch(`/api/games/${gameId}/moves`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from_square: fromSquare,
                to_square: toSquare
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Movimento não permitido.");
        }

        gameState = data;
        viewPly = gameState.total_plies;
        selectedSquare = null;
        clearDrawnArrows();

        applyIncrementIfNeeded(movingPiece?.color);

        if (animate && movingPiece) {
            animation = {
                from: fromSquare,
                to: toSquare,
                piece: movingPiece,
                image: null
            };

            renderBoard();

            await runMoveAnimation();
        } else {
            renderBoard();
        }

        await handleGameEndIfNeeded(movingPiece?.color);
    } catch (error) {
        showToast(error.message);
        console.error(error);

        selectedSquare = null;
        dragging = null;

        renderBoard();
    } finally {
        busy = false;
        updateHistoryControls();
    }

    if (gameActive && isBotTurn()) {
        await triggerBotMoveIfNeeded();
    }
}


// --------------------------------------------------
// NOVA PARTIDA / REINICIAR
// --------------------------------------------------

function goToNewGameSetup() {
    stopClock();
    isMatchConfigured = false;
    gameActive = false;
    clearDrawnArrows();

    if (playTabButton) {
        playTabButton.disabled = true;
    }

    const mobilePlayTab = document.getElementById("mobile-tab-play");
    if (mobilePlayTab) {
        mobilePlayTab.disabled = true;
    }

    if (newGameAfterEndButton) {
        newGameAfterEndButton.hidden = true;
    }

    switchFeatureTab("settings");
}


async function resetGame() {
    if (busy || !gameId || !isMatchConfigured) {
        return;
    }

    if (!gameActive) {
        goToNewGameSetup();
        return;
    }

    if (gameState && gameState.total_plies > 0) {
        await saveGameRecord(gameState, "draw", "½-½ (Interrompida)");
    }

    busy = true;
    updateHistoryControls();

    try {
        const response = await fetch(`/api/games/${gameId}/reset`, {
            method: "POST"
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Não foi possível reiniciar.");
        }

        sessionRecordId = generateRecordId();

        stopClock();
        resetClock();

        applyGameState(data);

        showToast("Partida reiniciada.");
    } catch (error) {
        showToast(error.message);
        console.error(error);
    } finally {
        busy = false;
        updateHistoryControls();
    }

    if (gameActive && isBotTurn()) {
        await triggerBotMoveIfNeeded();
    }
}


// --------------------------------------------------
// DESFAZER JOGADA REAL
// --------------------------------------------------

async function undoMove() {
    if (
        busy ||
        !gameId ||
        !isMatchConfigured ||
        !gameActive ||
        gameState.total_plies === 0
    ) {
        return;
    }

    busy = true;
    updateHistoryControls();

    try {
        const response = await fetch(`/api/games/${gameId}/undo`, {
            method: "POST"
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Não foi possível desfazer.");
        }

        applyGameState(data);

        if (gameState.total_plies === 0) {
            resetClock();
        } else {
            clockStarted = true;

            if (gameActive) {
                startClock();
            } else {
                stopClock();
            }
        }

        showToast("Última jogada desfeita.");
    } catch (error) {
        showToast(error.message);
        console.error(error);
    } finally {
        busy = false;
        updateHistoryControls();
    }
}


// --------------------------------------------------
// INICIAR PARTIDA A PARTIR DA CONFIGURAÇÃO
// --------------------------------------------------

async function startConfiguredGame() {
    if (busy) {
        return;
    }

    if (isMatchConfigured && gameState && gameState.total_plies > 0 && gameActive) {
        await saveGameRecord(gameState, "draw", "½-½ (Interrompida)");
    }

    activeConfig = { ...draftConfig };

    if (activeConfig.mode === "bot") {
        if (activeConfig.playerColor === "random") {
            resolvedHumanColor = Math.random() < 0.5 ? "white" : "black";
        } else {
            resolvedHumanColor = activeConfig.playerColor;
        }
    } else {
        resolvedHumanColor = "white";
    }

    busy = true;

    try {
        const response = await fetch("/api/games", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mode: activeConfig.mode,
                bot_level: activeConfig.botLevel,
                player_color: resolvedHumanColor,
                time_control: activeConfig.timeLabel
            })
        });

        if (!response.ok) {
            throw new Error("Não foi possível criar a partida.");
        }

        const data = await response.json();

        gameId = data.game_id;
        sessionRecordId = generateRecordId();
        isMatchConfigured = true;
        clearDrawnArrows();

        if (playTabButton) {
            playTabButton.disabled = false;
        }

        const mobilePlayTab = document.getElementById("mobile-tab-play");
        if (mobilePlayTab) {
            mobilePlayTab.disabled = false;
        }

        if (newGameAfterEndButton) {
            newGameAfterEndButton.hidden = true;
        }

        updateBoardOrientationUI();
        updatePlayerLabels();
        resetClock();
        applyGameState(data.state);

        switchFeatureTab("play");

        if (activeConfig.mode === "bot" && activeConfig.playerColor === "random") {
            showToast(
                resolvedHumanColor === "white"
                    ? "Sorteio: você joga de Brancas."
                    : "Sorteio: você joga de Pretas."
            );
        }
    } catch (error) {
        showToast(error.message || "Erro ao iniciar a partida.");
        console.error(error);
    } finally {
        busy = false;
        updateHistoryControls();
    }

    if (gameActive && isBotTurn()) {
        await triggerBotMoveIfNeeded();
    }
}


// --------------------------------------------------
// HISTÓRICO DE PARTIDAS SALVAS (SQLITE)
// --------------------------------------------------

const savedGamesBody = document.getElementById("saved-games-body");
const gamesCountLabel = document.getElementById("games-count-label");
const gamesSearchInput = document.getElementById("games-search");

const previewTitle = document.getElementById("preview-game-title");
const previewDate = document.getElementById("preview-game-date");
const previewMiniBoard = document.getElementById("preview-mini-board");
const previewResult = document.getElementById("preview-game-result");
const previewTime = document.getElementById("preview-game-time");
const previewPlies = document.getElementById("preview-game-plies");
const previewPgn = document.getElementById("preview-game-pgn");

const btnInspectAnalysis = document.getElementById("btn-inspect-in-analysis");
const btnDeleteSavedGame = document.getElementById("btn-delete-saved-game");


const PLAYER_ID_STORAGE_KEY = "chesspy_player_id";

function getPlayerId() {
    try {
        let playerId = localStorage.getItem(PLAYER_ID_STORAGE_KEY);
        if (!playerId) {
            playerId = (
                window.crypto?.randomUUID?.() ||
                `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`
            );
            localStorage.setItem(PLAYER_ID_STORAGE_KEY, playerId);
        }
        return playerId;
    } catch {
        return "legacy";
    }
}

function buildModeLabel() {
    if (!activeConfig) {
        return "10+0 Rápida";
    }

    const timePart = activeConfig.timeLabel === "Sem tempo"
        ? "Sem tempo"
        : `${activeConfig.timeLabel} ${activeConfig.timeCategory}`;

    if (activeConfig.mode === "bot") {
        return `Bot Nv.${activeConfig.botLevel} · ${timePart}`;
    }

    return timePart;
}


function buildGameRecord(state, outcome, resultLabel) {
    if (!sessionRecordId) {
        sessionRecordId = generateRecordId();
    }

    const pgnParts = (state.history || []).map(
        move => `${move.number}. ${move.white}${move.black ? " " + move.black : ""}`
    );

    return {
        id: sessionRecordId,
        playerId: getPlayerId(),
        date: new Date().toLocaleDateString("pt-BR"),
        mode: buildModeLabel(),
        plies: state.total_plies,
        outcome,
        resultLabel,
        pgn: pgnParts.join(" ") || "Sem lances",
        finalPieces: state.pieces,
        timeline: state.timeline,
        history: state.history
    };
}


async function saveGameRecord(state, outcome, resultLabel) {
    if (!state || !state.timeline || state.total_plies === 0) {
        return;
    }

    const record = buildGameRecord(state, outcome, resultLabel);

    try {
        const response = await fetch("/api/games/history", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(record)
        });

        if (!response.ok) {
            console.error("Falha ao persistir partida no SQLite:", response.status);
        }
    } catch (error) {
        console.error("Erro ao salvar partida no SQLite:", error);
    }
}


async function loadSavedGames() {
    try {
        const playerId = encodeURIComponent(getPlayerId());
        const response = await fetch(`/api/games?player_id=${playerId}`);

        if (response.ok) {
            const data = await response.json();
            savedGames = Array.isArray(data) ? data : [];
        } else {
            savedGames = [];
        }
    } catch (error) {
        console.error("Erro ao carregar histórico do SQLite:", error);
        savedGames = [];
    }

    if (savedGames.length > 0 && !savedGames.some(game => game.id === selectedSavedGameId)) {
        selectedSavedGameId = savedGames[0].id;
    } else if (savedGames.length === 0) {
        selectedSavedGameId = null;
    }

    renderSavedGamesList();
}


function renderMiniBoard(piecesMap = {}) {
    previewMiniBoard.innerHTML = "";

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const squareName = "abcdefgh"[col] + (8 - row);
            const cell = document.createElement("div");
            const isLight = (row + col) % 2 === 0;

            cell.className = `mini-square ${isLight ? "light" : "dark"}`;

            const piece = piecesMap[squareName];

            if (piece) {
                const img = document.createElement("img");
                img.src = getPieceImage(piece);
                img.alt = "";
                cell.appendChild(img);
            }

            previewMiniBoard.appendChild(cell);
        }
    }
}


function renderGamePreview(game) {
    if (!game) {
        previewTitle.textContent = "Nenhuma partida selecionada";
        previewDate.textContent = "—";
        previewResult.textContent = "—";
        previewTime.textContent = "—";
        previewPlies.textContent = "—";
        previewPgn.textContent = "Jogue e finalize uma partida para registrá-la no histórico.";

        btnInspectAnalysis.disabled = true;
        btnDeleteSavedGame.disabled = true;

        renderMiniBoard({});
        return;
    }

    const fullMoves = Math.ceil(game.plies / 2);

    previewTitle.textContent = `Partida #${game.id}`;
    previewDate.textContent = game.date;
    previewResult.textContent = game.resultLabel;
    previewTime.textContent = game.mode;
    previewPlies.textContent =
        `${fullMoves} jogada${fullMoves === 1 ? "" : "s"} (${game.plies} meio-lances)`;
    previewPgn.textContent = game.pgn;

    btnInspectAnalysis.disabled = false;
    btnDeleteSavedGame.disabled = false;

    renderMiniBoard(game.finalPieces || {});
}


function renderSavedGamesList() {
    const query = currentSearchQuery.trim().toLowerCase();

    const filtered = savedGames.filter(game => {
        const matchesFilter =
            currentOutcomeFilter === "all" || game.outcome === currentOutcomeFilter;

        const matchesSearch =
            !query ||
            game.id.toLowerCase().includes(query) ||
            game.date.toLowerCase().includes(query) ||
            game.mode.toLowerCase().includes(query) ||
            game.resultLabel.toLowerCase().includes(query);

        return matchesFilter && matchesSearch;
    });

    gamesCountLabel.textContent =
        `${filtered.length} partida${filtered.length === 1 ? "" : "s"} registrada${
            filtered.length === 1 ? "" : "s"
        }`;

    savedGamesBody.innerHTML = "";

    if (filtered.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.className = "empty-history";
        cell.textContent = "Nenhuma partida encontrada.";

        row.appendChild(cell);
        savedGamesBody.appendChild(row);

        renderGamePreview(null);
        return;
    }

    if (!filtered.some(game => game.id === selectedSavedGameId)) {
        selectedSavedGameId = filtered[0].id;
    }

    filtered.forEach(game => {
        const row = document.createElement("tr");

        if (game.id === selectedSavedGameId) {
            row.classList.add("selected-row");
        }

        const codeCell = document.createElement("td");
        codeCell.className = "game-code-cell";
        codeCell.textContent = `#${game.id}`;

        const dateCell = document.createElement("td");
        dateCell.textContent = game.date;

        const modeCell = document.createElement("td");
        modeCell.textContent = game.mode;

        const movesCell = document.createElement("td");
        movesCell.textContent = `${Math.ceil(game.plies / 2)} jogadas`;

        const outcomeCell = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = `result-badge ${game.outcome}`;
        badge.textContent = game.resultLabel;
        outcomeCell.appendChild(badge);

        row.appendChild(codeCell);
        row.appendChild(dateCell);
        row.appendChild(modeCell);
        row.appendChild(movesCell);
        row.appendChild(outcomeCell);

        row.addEventListener("click", () => {
            selectedSavedGameId = game.id;
            renderSavedGamesList();
        });

        savedGamesBody.appendChild(row);
    });

    const selectedGame = filtered.find(game => game.id === selectedSavedGameId);
    renderGamePreview(selectedGame);
}


async function deleteSelectedSavedGame() {
    if (!selectedSavedGameId) {
        return;
    }

    const targetId = selectedSavedGameId;
    const playerId = encodeURIComponent(getPlayerId());

    try {
        const response = await fetch(`/api/games/${targetId}?player_id=${playerId}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error("Não foi possível excluir o registro.");
        }

        selectedSavedGameId = null;
        await loadSavedGames();
        showToast("Registro removido do banco de dados.");
    } catch (error) {
        showToast(error.message);
        console.error(error);
    }
}


// --------------------------------------------------
// CONFIGURAÇÃO DE PARTIDA (CONTROLES DA ABA SETTINGS)
// --------------------------------------------------

function renderSettingsMiniBoard() {
    const miniBoard = document.getElementById("settings-mini-board");
    const coordHint = document.getElementById("settings-coord-hint");

    if (!miniBoard) {
        return;
    }

    miniBoard.innerHTML = "";

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const realR = draftConfig.flipped ? 7 - r : r;
            const realC = draftConfig.flipped ? 7 - c : c;
            const sq = document.createElement("div");

            sq.className = "mini-sq " + ((realR + realC) % 2 === 0 ? "light" : "dark");

            if (realR === 0 || realR === 1) sq.textContent = "♟";
            if (realR === 6 || realR === 7) sq.textContent = "♙";

            miniBoard.appendChild(sq);
        }
    }

    if (coordHint) {
        coordHint.textContent = draftConfig.flipped
            ? "Base: Pretas (h8 – a8)"
            : "Base: Brancas (a1 – h1)";
    }
}


function syncSettingsUI() {
    document.querySelectorAll(".mode-option").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.mode === draftConfig.mode);
    });

    const botCard = document.getElementById("bot-card");
    const botBadge = document.getElementById("bot-badge");
    if (botCard) {
        botCard.classList.toggle("disabled-card", draftConfig.mode !== "bot");
    }
    if (botBadge) {
        botBadge.textContent = draftConfig.mode === "bot"
            ? `Nível ${draftConfig.botLevel}/10`
            : "Disponível no modo Bot";
    }

    const slider = document.getElementById("level-slider");
    if (slider) {
        slider.value = draftConfig.botLevel;
    }

    document.querySelectorAll(".step-btn").forEach(btn => {
        btn.classList.toggle("active", Number(btn.dataset.lvl) === draftConfig.botLevel);
    });

    const levelInfo = BOT_LEVELS[draftConfig.botLevel];
    const levelNameEl = document.getElementById("level-name");
    const levelEloEl = document.getElementById("level-elo");
    if (levelNameEl && levelInfo) {
        levelNameEl.textContent = `Nível ${draftConfig.botLevel} — ${levelInfo.name}`;
    }
    if (levelEloEl && levelInfo) {
        levelEloEl.textContent = levelInfo.elo;
    }

    document.querySelectorAll(".king-choice-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.color === draftConfig.playerColor);
    });

    document.querySelectorAll(".time-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.time === draftConfig.timeLabel);
    });

    const flipToggle = document.getElementById("flip-toggle");
    if (flipToggle) {
        flipToggle.checked = draftConfig.flipped;
    }

    const colorNames = {
        white: "Brancas",
        black: "Pretas",
        random: "Aleatório"
    };

    const sumMode = document.getElementById("sum-mode");
    const sumBot = document.getElementById("sum-bot");
    const sumColor = document.getElementById("sum-color");
    const sumTime = document.getElementById("sum-time");
    const sumFlip = document.getElementById("sum-flip");

    if (sumMode) {
        sumMode.textContent = draftConfig.mode === "bot" ? "Contra o Bot" : "Presencial (2P)";
    }
    if (sumBot) {
        sumBot.textContent = draftConfig.mode === "bot"
            ? `Nível ${draftConfig.botLevel} (${levelInfo.name})`
            : "Desativado";
    }
    if (sumColor) {
        sumColor.textContent = draftConfig.mode === "bot"
            ? colorNames[draftConfig.playerColor]
            : "Brancas e Pretas";
    }
    if (sumTime) {
        sumTime.textContent = draftConfig.timeLabel === "Sem tempo"
            ? "Sem tempo"
            : `${draftConfig.timeLabel} (${draftConfig.timeCategory})`;
    }
    if (sumFlip) {
        sumFlip.textContent = draftConfig.flipped ? "Invertido (Pretas)" : "Padrão (Brancas)";
    }

    renderSettingsMiniBoard();
}


function initSettingsControls() {
    const stepsWrap = document.getElementById("level-steps");
    if (stepsWrap) {
        stepsWrap.innerHTML = "";
        for (let i = 1; i <= 10; i++) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "step-btn";
            btn.textContent = i;
            btn.dataset.lvl = i;
            btn.addEventListener("click", () => {
                draftConfig.botLevel = i;
                syncSettingsUI();
            });
            stepsWrap.appendChild(btn);
        }
    }

    document.querySelectorAll(".mode-option").forEach(btn => {
        btn.addEventListener("click", () => {
            draftConfig.mode = btn.dataset.mode;
            syncSettingsUI();
        });
    });

    const slider = document.getElementById("level-slider");
    if (slider) {
        slider.addEventListener("input", event => {
            draftConfig.botLevel = Number(event.target.value);
            syncSettingsUI();
        });
    }

    document.querySelectorAll(".king-choice-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            draftConfig.playerColor = btn.dataset.color;
            if (draftConfig.playerColor === "black") {
                draftConfig.flipped = true;
            } else if (draftConfig.playerColor === "white") {
                draftConfig.flipped = false;
            }
            syncSettingsUI();
        });
    });

    document.querySelectorAll(".time-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            draftConfig.timeLabel = btn.dataset.time;
            draftConfig.timeCategory = btn.dataset.cat;
            draftConfig.baseSeconds = Number(btn.dataset.base);
            draftConfig.incrementSeconds = Number(btn.dataset.inc);
            syncSettingsUI();
        });
    });

    const flipToggle = document.getElementById("flip-toggle");
    if (flipToggle) {
        flipToggle.addEventListener("change", event => {
            draftConfig.flipped = event.target.checked;
            syncSettingsUI();
        });
    }

    const startBtn = document.getElementById("btn-start-configured-game");
    if (startBtn) {
        startBtn.addEventListener("click", startConfiguredGame);
    }

    const resetSettingsBtn = document.getElementById("btn-reset-settings");
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener("click", () => {
            draftConfig = {
                mode: "pvp",
                botLevel: 4,
                playerColor: "white",
                timeLabel: "10+0",
                timeCategory: "Rápida",
                baseSeconds: 600,
                incrementSeconds: 0,
                flipped: false
            };
            syncSettingsUI();
            showToast("Configurações restauradas para o padrão.");
        });
    }

    syncSettingsUI();
}


// --------------------------------------------------
// EVENTOS DO TABULEIRO (PEÇAS + SETAS BOTÃO DIREITO)
// --------------------------------------------------

boardElement.addEventListener("contextmenu", event => {
    event.preventDefault();
});

boardElement.addEventListener("pointerdown", event => {
    if (event.button === 2) {
        event.preventDefault();
        const cell = getLogicalCellFromClientPoint(event.clientX, event.clientY);
        if (!cell) {
            return;
        }
        isRightDrawing = true;
        arrowStartCell = cell;
        arrowHoverCell = cell;
        renderPreviewArrow();
        return;
    }

    if (event.button === 0) {
        clearDrawnArrows();
    }

    if (
        !isMatchConfigured ||
        event.button !== 0 ||
        busy ||
        !gameState ||
        !gameActive ||
        isBotTurn()
    ) {
        return;
    }

    if (viewPly !== gameState.total_plies) {
        showToast("Volte à posição atual para continuar jogando.");
        return;
    }

    const square = event.target.closest(".square");

    if (!square) {
        return;
    }

    event.preventDefault();

    startDragging(square.dataset.square, event);
});


// Eventos do tabuleiro na aba Análise de partida
if (analysisBoardElement) {
    analysisBoardElement.addEventListener("contextmenu", event => {
        event.preventDefault();
    });

    analysisBoardElement.addEventListener("pointerdown", event => {
        if (event.button === 2) {
            event.preventDefault();
            const cell = getLogicalCellFromPointForElement(
                event.clientX,
                event.clientY,
                analysisBoardElement,
                analysisFlipped
            );
            if (!cell) {
                return;
            }
            isAnalysisRightDrawing = true;
            analysisArrowStart = cell;
            analysisArrowHover = cell;
            renderAnalysisArrowsAndBadges(analysisReport?.perPly?.[analysisPly] || null);
            return;
        }

        if (event.button === 0 && analysisCustomArrows.length > 0) {
            analysisCustomArrows.length = 0;
            renderAnalysisArrowsAndBadges(analysisReport?.perPly?.[analysisPly] || null);
        }
    });
}


document.addEventListener("pointermove", event => {
    if (isRightDrawing) {
        arrowHoverCell = getLogicalCellFromClientPoint(event.clientX, event.clientY);
        renderPreviewArrow();
        return;
    }

    if (isAnalysisRightDrawing) {
        analysisArrowHover = getLogicalCellFromPointForElement(
            event.clientX,
            event.clientY,
            analysisBoardElement,
            analysisFlipped
        );
        renderAnalysisArrowsAndBadges(analysisReport?.perPly?.[analysisPly] || null);
        return;
    }

    if (dragging) {
        positionDraggedPiece(
            event.clientX,
            event.clientY,
            event.pointerType === "touch"
        );
    }
});


document.addEventListener("pointerup", async event => {
    if (event.button === 2 && isAnalysisRightDrawing) {
        const endCell =
            getLogicalCellFromPointForElement(
                event.clientX,
                event.clientY,
                analysisBoardElement,
                analysisFlipped
            ) || analysisArrowHover;

        isAnalysisRightDrawing = false;
        if (analysisArrowStart && endCell && !sameGridCell(analysisArrowStart, endCell)) {
            const idx = analysisCustomArrows.findIndex(
                item => sameGridCell(item.from, analysisArrowStart) && sameGridCell(item.to, endCell)
            );
            if (idx >= 0) {
                analysisCustomArrows.splice(idx, 1);
            } else {
                analysisCustomArrows.push({ from: analysisArrowStart, to: endCell });
            }
        }
        analysisArrowStart = null;
        analysisArrowHover = null;
        renderAnalysisArrowsAndBadges(analysisReport?.perPly?.[analysisPly] || null);
        return;
    }

    if (event.button === 2) {
        if (!isRightDrawing) {
            return;
        }

        const endCell = getLogicalCellFromClientPoint(event.clientX, event.clientY) || arrowHoverCell;

        isRightDrawing = false;
        if (previewArrowGroup) {
            previewArrowGroup.innerHTML = "";
        }

        if (arrowStartCell && endCell && !sameGridCell(arrowStartCell, endCell)) {
            toggleArrow(arrowStartCell, endCell);
        }

        arrowStartCell = null;
        arrowHoverCell = null;
        return;
    }

    if (!isMatchConfigured || busy || !gameState || !gameActive || isBotTurn()) {
        dragging = null;
        return;
    }

    const destination = getSquareAtPoint(event.clientX, event.clientY);

    if (dragging) {
        const origin = dragging.from;

        dragging = null;

        if (!destination) {
            selectedSquare = null;
            renderBoard();
            return;
        }

        if (destination === origin) {
            selectedSquare = origin;
            renderBoard();
            return;
        }

        selectedSquare = null;
        renderBoard();

        await makeMove(origin, destination, false);
        return;
    }

    if (!destination) {
        if (selectedSquare) {
            selectedSquare = null;
            renderBoard();
        }
        return;
    }

    if (selectedSquare && selectedSquare !== destination) {
        const legalDestinations = getLegalDestinations(selectedSquare);

        if (legalDestinations.includes(destination)) {
            await makeMove(selectedSquare, destination, true);
            return;
        }

        const targetPiece = gameState.pieces[destination];

        if (targetPiece && targetPiece.color === gameState.turn) {
            selectedSquare = destination;
        } else {
            selectedSquare = null;
        }

        renderBoard();
        return;
    }

    if (selectedSquare === destination) {
        selectedSquare = null;
    } else {
        const piece = gameState.pieces[destination];

        selectedSquare = piece && piece.color === gameState.turn ? destination : null;
    }

    renderBoard();
});


// --------------------------------------------------
// CLIQUES NO HISTÓRICO DA PARTIDA ATUAL E DA ANÁLISE
// --------------------------------------------------

historyBody.addEventListener("click", event => {
    const cell = event.target.closest("td[data-ply]");

    if (!cell || busy || !gameState) {
        return;
    }

    const ply = Number(cell.dataset.ply);

    if (Number.isInteger(ply) && ply <= gameState.total_plies) {
        goToPly(ply);
    }
});

if (analysisMovesBody) {
    analysisMovesBody.addEventListener("click", event => {
        const cell = event.target.closest("td[data-analysis-ply]");
        if (!cell || !analysisGame) {
            return;
        }
        const ply = Number(cell.dataset.analysisPly);
        if (Number.isInteger(ply)) {
            setAnalysisPly(ply);
        }
    });
}


// --------------------------------------------------
// BOTÕES DA PARTIDA, ANÁLISE E HISTÓRICO DE PARTIDAS
// --------------------------------------------------

undoButton.addEventListener("click", undoMove);
resetButton.addEventListener("click", resetGame);

if (newGameAfterEndButton) {
    newGameAfterEndButton.addEventListener("click", goToNewGameSetup);
}

prevButton.addEventListener("click", previousPosition);
nextButton.addEventListener("click", nextPosition);

if (analysisBtnStart) analysisBtnStart.addEventListener("click", () => setAnalysisPly(0));
if (analysisBtnPrev) analysisBtnPrev.addEventListener("click", () => setAnalysisPly(analysisPly - 1));
if (analysisBtnNext) analysisBtnNext.addEventListener("click", () => setAnalysisPly(analysisPly + 1));
if (analysisBtnEnd) analysisBtnEnd.addEventListener("click", () => setAnalysisPly(getAnalysisMaxPly()));
if (analysisBtnFlip) {
    analysisBtnFlip.addEventListener("click", () => {
        analysisFlipped = !analysisFlipped;
        renderAnalysisView();
    });
}
if (analysisBtnBackGames) {
    analysisBtnBackGames.addEventListener("click", () => switchFeatureTab("games"));
}

if (gamesSearchInput) {
    gamesSearchInput.addEventListener("input", event => {
        currentSearchQuery = event.target.value;
        renderSavedGamesList();
    });
}

document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
        document.querySelectorAll(".filter-chip").forEach(
            item => item.classList.remove("active")
        );

        chip.classList.add("active");
        currentOutcomeFilter = chip.dataset.filter;
        renderSavedGamesList();
    });
});

if (btnDeleteSavedGame) {
    btnDeleteSavedGame.addEventListener("click", deleteSelectedSavedGame);
}

if (btnInspectAnalysis) {
    btnInspectAnalysis.addEventListener("click", () => {
        const selectedGame = savedGames.find(game => game.id === selectedSavedGameId);
        if (!selectedGame) {
            showToast("Selecione uma partida para revisar.");
            return;
        }
        openGameInAnalysis(selectedGame);
    });
}


// --------------------------------------------------
// NAVEGAÇÃO ENTRE ABAS (BLOQUEIA PARTIDA SEM CONFIGURAR)
// --------------------------------------------------

function switchFeatureTab(feature) {
    const viewMap = {
        play: document.getElementById("view-play"),
        analysis: document.getElementById("view-analysis"),
        games: document.getElementById("view-games"),
        settings: document.getElementById("view-settings")
    };

    if (!viewMap[feature]) {
        feature = "settings";
    }

    if (feature === "play" && !isMatchConfigured) {
        showToast("Configure a partida antes de jogar.");
        feature = "settings";
    }

    const subtitles = {
        play: activeConfig?.mode === "bot"
            ? `Partida contra o Bot (Nível ${activeConfig.botLevel})`
            : "Partida individual de xadrez",
        analysis: "Revisão e análise lance a lance",
        games: "Registro e revisão de partidas concluídas",
        settings: "Configuração de partida"
    };

    document.querySelectorAll("[data-feature]").forEach(button => {
        button.classList.toggle("active", button.dataset.feature === feature);
    });

    Object.entries(viewMap).forEach(([key, section]) => {
        if (section) {
            section.hidden = key !== feature;
        }
    });

    if (panelSubtitleElement && subtitles[feature]) {
        panelSubtitleElement.textContent = subtitles[feature];
    }

    if (feature === "games") {
        loadSavedGames();
    } else if (feature === "analysis") {
        if (!analysisGame && savedGames.length > 0) {
            openGameInAnalysis(savedGames[0]);
            return;
        }
        renderAnalysisView();
    } else if (feature === "play" && gameState) {
        renderBoard();
    } else if (feature === "settings") {
        syncSettingsUI();
    }
}

document.querySelectorAll("[data-feature]").forEach(button => {
    button.addEventListener("click", () => {
        switchFeatureTab(button.dataset.feature);
    });
});

document.addEventListener("click", event => {
    const themeBtn = event.target.closest("#btn-board-theme");
    if (!themeBtn) {
        return;
    }

    currentBoardTheme = currentBoardTheme === "default" ? "purple" : "default";

    if (currentBoardTheme === "purple") {
        document.documentElement.setAttribute("data-board-theme", "purple");
    } else {
        document.documentElement.removeAttribute("data-board-theme");
    }

    const label = document.getElementById("board-theme-label");
    if (label) {
        label.textContent = `Tabuleiro: ${BOARD_THEMES[currentBoardTheme].label}`;
    }

    if (gameState) {
        renderBoard();
    }
    if (analysisGame && !document.getElementById("view-analysis")?.hidden) {
        renderAnalysisView();
    }
});


// --------------------------------------------------
// SALVAMENTO AUTOMÁTICO AO FECHAR OU RECARREGAR A PÁGINA
// --------------------------------------------------

window.addEventListener("pagehide", () => {
    if (isMatchConfigured && gameState && gameState.total_plies > 0 && gameActive) {
        const record = buildGameRecord(gameState, "draw", "½-½ (Interrompida)");

        const blob = new Blob([JSON.stringify(record)], { type: "application/json" });

        navigator.sendBeacon("/api/games/history", blob);
    }
});


// --------------------------------------------------
// INICIALIZAÇÃO (ABRE NA CONFIGURAÇÃO DE PARTIDA)
// --------------------------------------------------

initSettingsControls();
switchFeatureTab("settings");