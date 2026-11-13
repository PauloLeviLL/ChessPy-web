const boardElement = document.getElementById("board");
const statusElement = document.getElementById("status");
const checkWarningElement = document.getElementById("check-warning");

const historyBody = document.getElementById("move-history-body");
const historyPositionLabel = document.getElementById("history-position-label");

const whiteTimerElement = document.getElementById("timer-white");
const blackTimerElement = document.getElementById("timer-black");

const whiteIndicator = document.getElementById("white-turn-indicator");
const blackIndicator = document.getElementById("black-turn-indicator");

const whitePlayerCard = document.getElementById("white-player-card");
const blackPlayerCard = document.getElementById("black-player-card");

const whiteCapturesElement = document.getElementById("white-captures");
const blackCapturesElement = document.getElementById("black-captures");

const undoButton = document.getElementById("btn-undo");
const resetButton = document.getElementById("btn-reset");
const prevButton = document.getElementById("btn-prev");
const nextButton = document.getElementById("btn-next");

const pieceNames = {
    1: "Peao",
    2: "Cavalo",
    3: "Bispo",
    4: "Torre",
    5: "Rainha",
    6: "Rei"
};

const ANIMATION_DURATION = 160;
const INITIAL_TIME = 600;

let gameId = null;
let gameState = null;

let selectedSquare = null;
let dragging = null;
let animation = null;

let busy = false;
let gameActive = true;

let clockInterval = null;
let clockStarted = false;

let whiteTime = INITIAL_TIME;
let blackTime = INITIAL_TIME;

// Posição atualmente visualizada no histórico.
let viewPly = 0;


// --------------------------------------------------
// POSIÇÕES E COORDENADAS
// --------------------------------------------------

function getSquareName(row, col) {
    return "abcdefgh"[col] + (8 - row);
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

    const col = "abcdefgh".indexOf(squareName[0]);
    const row = 8 - Number(squareName[1]);

    return {
        x: col * squareSize + squareSize / 2,
        y: row * squareSize + squareSize / 2
    };
}


function getSquareAtPoint(x, y) {
    const element = document.elementFromPoint(x, y);

    return element
        ?.closest(".square")
        ?.dataset.square || null;
}


function getBaseSquareColor(row, col) {
    return (row + col) % 2 === 0
        ? [75, 86, 102]
        : [46, 54, 65];
}


function blendColor(base, overlay, alpha) {
    return base.map((channel, index) =>
        Math.round(
            channel * (1 - alpha) + overlay[index] * alpha
        )
    );
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


// --------------------------------------------------
// STATUS DA PARTIDA
// --------------------------------------------------

function updateStatus() {
    const displayedState = getDisplayedState();

    if (!displayedState) {
        return;
    }

    if (viewPly !== gameState.total_plies) {
        statusElement.textContent =
            `Visualizando posição após ${viewPly} jogada(s)`;

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

    statusElement.textContent =
        displayedState.turn === "white"
            ? "Vez das brancas"
            : "Vez das pretas";

    checkWarningElement.textContent =
        displayedState.check_square ? "⚠ Xeque!" : "";
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

    undoButton.disabled = busy || total === 0;
    resetButton.disabled = busy;

    if (viewPly === 0) {
        historyPositionLabel.textContent = "Posição inicial";

    } else if (viewPly === total) {
        historyPositionLabel.textContent = "Posição atual";

    } else {
        historyPositionLabel.textContent =
            `Visualizando jogada ${Math.ceil(viewPly / 2)}`;
    }
}


// --------------------------------------------------
// REVISÃO ANIMADA DAS JOGADAS
// --------------------------------------------------

async function goToPly(ply) {
    if (!gameState || busy) {
        return;
    }

    const targetPly = Math.max(
        0,
        Math.min(ply, gameState.total_plies)
    );

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
                const from = direction > 0
                    ? move.from
                    : move.to;

                const to = direction > 0
                    ? move.to
                    : move.from;

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
    whiteCapturesElement.textContent =
        (gameState.white_captures || []).join(" ") || "Nenhuma";

    blackCapturesElement.textContent =
        (gameState.black_captures || []).join(" ") || "Nenhuma";
}


// --------------------------------------------------
// RELÓGIOS
// --------------------------------------------------

function formatTime(seconds) {
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

    whiteTimerElement.classList.toggle("low-time", whiteTime <= 30);
    blackTimerElement.classList.toggle("low-time", blackTime <= 30);
}


function stopClock() {
    if (clockInterval !== null) {
        clearInterval(clockInterval);
        clockInterval = null;
    }
}


function startClock() {
    if (!clockStarted || !gameActive || !gameState) {
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

                statusElement.textContent =
                    "Tempo esgotado! Pretas venceram.";

                checkWarningElement.textContent = "TEMPO ESGOTADO";
            }

        } else {
            blackTime = Math.max(0, blackTime - 1);

            if (blackTime === 0) {
                gameActive = false;
                stopClock();

                statusElement.textContent =
                    "Tempo esgotado! Brancas venceram.";

                checkWarningElement.textContent = "TEMPO ESGOTADO";
            }
        }

        renderTimers();

    }, 1000);
}


function resetClock() {
    whiteTime = INITIAL_TIME;
    blackTime = INITIAL_TIME;
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

    // Evita repetir uma mensagem que já está visível.
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

            square.style.backgroundColor =
                `rgb(${color.join(", ")})`;

            if (selectedSquare === squareName) {
                square.classList.add("selected");
            }

            const piece = displayedState.pieces[squareName];

            if (legalDestinations.includes(squareName)) {
                const marker = document.createElement("div");

                if (piece) {
                    marker.className = "capture-marker";
                    marker.style.borderWidth =
                        `${Math.max(2, squareSize * 0.05)}px`;
                } else {
                    marker.className = "legal-dot";
                }

                square.appendChild(marker);
            }

            const isDraggingPiece =
                dragging && dragging.from === squareName;

            const isAnimatingPiece =
                animation && animation.to === squareName;

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

    updateStatus();
    updateTurnIndicators();
    renderHistory();
    renderCaptures();
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
    // Eleva levemente a peça no toque para o dedo não tampar a casa de destino
    const touchOffset = isTouch ? (rect.width / 8) * 0.45 : 0;

    dragging.image.style.left = `${clientX - rect.left}px`;
    dragging.image.style.top = `${clientY - rect.top - touchOffset}px`;
}


// --------------------------------------------------
// ARRASTAR PEÇAS
// --------------------------------------------------

function startDragging(squareName, event) {
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

            const smoothProgress =
                progress * progress * (3 - 2 * progress);

            const currentX =
                start.x + (end.x - start.x) * smoothProgress;

            const currentY =
                start.y + (end.y - start.y) * smoothProgress;

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

    viewPly = gameState.total_plies;

    gameActive = !gameState.checkmate && !gameState.stalemate;

    renderBoard();
}


// --------------------------------------------------
// MOVIMENTOS
// --------------------------------------------------

async function makeMove(fromSquare, toSquare, animate = true) {
    if (
        busy ||
        !gameId ||
        !gameActive ||
        gameState.checkmate ||
        gameState.stalemate
    ) {
        return;
    }

    // Se estiver olhando o histórico, retorna à posição atual.
    if (viewPly !== gameState.total_plies) {
        viewPly = gameState.total_plies;
        renderBoard();

        showToast("Você voltou à posição atual da partida.");
        return;
    }

    const legalMove = gameState.legal_moves.some(
        move =>
            move.startsWith(fromSquare) &&
            move.slice(2, 4) === toSquare
    );

    if (!legalMove) {
        selectedSquare = null;
        renderBoard();
        return;
    }

    const movingPiece = gameState.pieces[fromSquare];

    busy = true;

    try {
        const response = await fetch(
            `/api/games/${gameId}/moves`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    from_square: fromSquare,
                    to_square: toSquare
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail || "Movimento não permitido."
            );
        }

        gameState = data;
        viewPly = gameState.total_plies;
        selectedSquare = null;

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

        if (gameState.checkmate || gameState.stalemate) {
            gameActive = false;
            stopClock();

        } else if (!clockStarted && movingPiece?.color === "white") {
            // O relógio só começa após a primeira jogada branca.
            clockStarted = true;
            startClock();
        }

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
}


// --------------------------------------------------
// NOVA PARTIDA / REINICIAR
// --------------------------------------------------

async function resetGame() {
    if (busy || !gameId) {
        return;
    }

    busy = true;
    updateHistoryControls();

    try {
        const response = await fetch(
            `/api/games/${gameId}/reset`,
            {
                method: "POST"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail || "Não foi possível reiniciar."
            );
        }

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
}


// --------------------------------------------------
// DESFAZER JOGADA REAL
// --------------------------------------------------

async function undoMove() {
    if (
        busy ||
        !gameId ||
        gameState.total_plies === 0
    ) {
        return;
    }

    busy = true;
    updateHistoryControls();

    try {
        const response = await fetch(
            `/api/games/${gameId}/undo`,
            {
                method: "POST"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail || "Não foi possível desfazer."
            );
        }

        applyGameState(data);

        if (gameState.total_plies === 0) {
            // Voltou à posição inicial: relógios pausados.
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
// CRIAR PARTIDA
// --------------------------------------------------

async function createGame() {
    try {
        const response = await fetch("/api/games", {
            method: "POST"
        });

        if (!response.ok) {
            throw new Error("Não foi possível criar a partida.");
        }

        const data = await response.json();

        gameId = data.game_id;

        resetClock();
        applyGameState(data.state);

    } catch (error) {
        statusElement.textContent = "Erro ao iniciar a partida.";
        console.error(error);
    }
}


// --------------------------------------------------
// EVENTOS DO TABULEIRO
// --------------------------------------------------

// Bloqueia o menu de contexto ao segurar o dedo no tabuleiro
boardElement.addEventListener("contextmenu", event => {
    event.preventDefault();
});

boardElement.addEventListener("pointerdown", event => {
    if (
        event.button !== 0 ||
        busy ||
        !gameState ||
        !gameActive
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


document.addEventListener("pointermove", event => {
    if (dragging) {
        positionDraggedPiece(event.clientX, event.clientY);
    }
});


document.addEventListener("pointerup", async event => {
    if (busy || !gameState || !gameActive) {
        dragging = null;
        return;
    }

    const destination = getSquareAtPoint(
        event.clientX,
        event.clientY
    );

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

        // Arrastar e soltar não adiciona animação.
        await makeMove(origin, destination, false);
        return;
    }

    if (!destination) {
        return;
    }

    if (selectedSquare && selectedSquare !== destination) {
        const legalDestinations =
            getLegalDestinations(selectedSquare);

        if (legalDestinations.includes(destination)) {
            await makeMove(selectedSquare, destination, true);
            return;
        }

        const targetPiece = gameState.pieces[destination];

        if (
            targetPiece &&
            targetPiece.color === gameState.turn
        ) {
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

        selectedSquare =
            piece && piece.color === gameState.turn
                ? destination
                : null;
    }

    renderBoard();
});


document.addEventListener("pointercancel", () => {
    if (dragging) {
        dragging = null;
        selectedSquare = null;
        renderBoard();
    }
});


// --------------------------------------------------
// CLIQUES NO HISTÓRICO
// --------------------------------------------------

historyBody.addEventListener("click", event => {
    const cell = event.target.closest("td[data-ply]");

    if (!cell || busy) {
        return;
    }

    const ply = Number(cell.dataset.ply);

    if (
        Number.isInteger(ply) &&
        ply <= gameState.total_plies
    ) {
        goToPly(ply);
    }
});


// --------------------------------------------------
// BOTÕES DA PARTIDA
// --------------------------------------------------

undoButton.addEventListener("click", undoMove);
resetButton.addEventListener("click", resetGame);

prevButton.addEventListener("click", previousPosition);
nextButton.addEventListener("click", nextPosition);


// --------------------------------------------------
// BOTÕES DE FUNCIONALIDADES
// --------------------------------------------------

document.querySelectorAll("[data-feature]").forEach(button => {
    button.addEventListener("click", () => {
        const feature = button.dataset.feature;

        if (feature === "play") {
            return;
        }

        const featureNames = {
            analysis: "Análise de partida",
            games: "Histórico de partidas",
            settings: "Configuração de partida"
        };

        showToast(
            `${featureNames[feature]} será implementado em uma próxima etapa.`
        );
    });
});


// --------------------------------------------------
// INICIALIZAÇÃO
// --------------------------------------------------

createGame();