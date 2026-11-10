const boardElement = document.getElementById("board");
const statusElement = document.getElementById("status");

const pieceNames = {
    1: "Peao",
    2: "Cavalo",
    3: "Bispo",
    4: "Torre",
    5: "Rainha",
    6: "Rei"
};

const ANIMATION_DURATION = 160;

let gameId = null;
let gameState = null;
let selectedSquare = null;
let dragging = null;
let animation = null;
let busy = false;


// Coordenadas e dimensões

function getSquareName(row, col) {
    return "abcdefgh"[col] + (8 - row);
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
    return element?.closest(".square")?.dataset.square || null;
}


function getBaseSquareColor(row, col) {
    return (row + col) % 2 === 0
        ? [194, 214, 215]
        : [78, 93, 127];
}


function blendColor(base, overlay, alpha) {
    return base.map((channel, index) =>
        Math.round(
            channel * (1 - alpha) + overlay[index] * alpha
        )
    );
}


// Peças

function getPieceImage(piece) {
    const name = pieceNames[piece.type];

    return `/static/sprites/${piece.color}/${name}.png`;
}


function getLegalDestinations(square) {
    return gameState.legal_moves
        .filter(move => move.startsWith(square))
        .map(move => move.slice(2, 4));
}


// Interface

function setStatus(message) {
    statusElement.textContent = message;
}


function updateStatus() {
    if (gameState.checkmate) {
        setStatus(
            gameState.turn === "white"
                ? "Xeque-mate! Pretas venceram."
                : "Xeque-mate! Brancas venceram."
        );

        return;
    }

    if (gameState.stalemate) {
        setStatus("Empate por afogamento.");
        return;
    }

    if (gameState.check_square) {
        setStatus(
            gameState.turn === "white"
                ? "Vez das brancas — Xeque!"
                : "Vez das pretas — Xeque!"
        );

        return;
    }

    setStatus(
        gameState.turn === "white"
            ? "Vez das brancas"
            : "Vez das pretas"
    );
}


function renderBoard() {
    boardElement.innerHTML = "";

    if (!gameState) {
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

            // Último movimento
            if (
                gameState.last_move &&
                (
                    gameState.last_move.from === squareName ||
                    gameState.last_move.to === squareName
                )
            ) {
                color = blendColor(
                    color,
                    [255, 220, 80],
                    85 / 255
                );
            }

            // Rei em xeque
            if (gameState.check_square === squareName) {
                color = blendColor(
                    color,
                    [220, 40, 40],
                    130 / 255
                );
            }

            // Rei vencedor no xeque-mate
            if (gameState.winning_king === squareName) {
                color = blendColor(
                    color,
                    [40, 190, 80],
                    150 / 255
                );
            }

            square.style.backgroundColor =
                `rgb(${color.join(", ")})`;

            // Peça selecionada
            if (selectedSquare === squareName) {
                square.classList.add("selected");
            }

            const piece = gameState.pieces[squareName];

            // Marcadores de movimentos legais
            if (legalDestinations.includes(squareName)) {
                const darkerColor = baseColor.map(
                    channel => Math.max(0, channel - 45)
                );

                if (piece) {
                    const marker = document.createElement("div");

                    marker.className = "capture-marker";
                    marker.style.borderColor =
                        `rgb(${darkerColor.join(", ")})`;

                    marker.style.borderWidth =
                        `${squareSize * 0.05}px`;

                    square.appendChild(marker);

                } else {
                    const marker = document.createElement("div");

                    marker.className = "legal-dot";
                    marker.style.backgroundColor =
                        `rgb(${darkerColor.join(", ")})`;

                    square.appendChild(marker);
                }
            }

            // Desenha a peça, exceto quando está sendo arrastada
            // ou quando está na posição final da animação.
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

            // Coordenadas
            if (row === 7) {
                const file = document.createElement("span");

                file.className = "coordinate file";
                file.textContent = "abcdefgh"[col];

                file.style.color = baseColor[0] === 194
                    ? "rgb(78, 93, 127)"
                    : "rgb(194, 214, 215)";

                square.appendChild(file);
            }

            if (col === 0) {
                const rank = document.createElement("span");

                rank.className = "coordinate rank";
                rank.textContent = 8 - row;

                rank.style.color = baseColor[0] === 194
                    ? "rgb(78, 93, 127)"
                    : "rgb(194, 214, 215)";

                square.appendChild(rank);
            }

            boardElement.appendChild(square);
        }
    }

    // Peça acompanhando o mouse
    if (dragging) {
        const image = createFloatingPiece(
            dragging.piece,
            1.15,
            "dragging-piece"
        );

        dragging.image = image;
        boardElement.appendChild(image);

        positionDraggedPiece(dragging.x, dragging.y);
    }

    // Peça em animação
    if (animation) {
        const image = createFloatingPiece(
            animation.piece,
            0.90,
            "animated-piece"
        );

        animation.image = image;

        const center = getSquareCenter(animation.from);

        image.style.left = `${center.x}px`;
        image.style.top = `${center.y}px`;

        boardElement.appendChild(image);
    }

    // Símbolo de xeque-mate
    if (gameState.checkmate && gameState.losing_king) {
        const center = getSquareCenter(gameState.losing_king);

        const marker = document.createElement("span");

        marker.className = "checkmate-marker";
        marker.textContent = "#";

        marker.style.left =
            `${center.x + squareSize * 0.22}px`;

        marker.style.top =
            `${center.y - squareSize * 0.22}px`;

        marker.style.fontSize =
            `${squareSize * 0.30}px`;

        boardElement.appendChild(marker);
    }

    updateStatus();
}


function createFloatingPiece(piece, size, extraClass) {
    const rect = boardElement.getBoundingClientRect();
    const squareSize = rect.width / 8;

    const image = document.createElement("img");

    image.src = getPieceImage(piece);
    image.alt = pieceNames[piece.type];

    image.className = `floating-piece ${extraClass}`;
    image.draggable = false;

    image.style.width = `${squareSize * size}px`;
    image.style.height = `${squareSize * size}px`;

    return image;
}


// Arrastar peças

function positionDraggedPiece(clientX, clientY) {
    if (!dragging || !dragging.image) {
        return;
    }

    const rect = boardElement.getBoundingClientRect();
    const scale = rect.width / 800;

    const x = clientX - rect.left;
    const y = clientY - rect.top - 12 * scale;

    dragging.image.style.left = `${x}px`;
    dragging.image.style.top = `${y}px`;
}


function startDragging(squareName, event) {
    const piece = gameState.pieces[squareName];

    if (!piece || piece.color !== gameState.turn) {
        return false;
    }

    selectedSquare = squareName;

    const rect = boardElement.getBoundingClientRect();

    dragging = {
        from: squareName,
        piece: piece,
        x: event.clientX,
        y: event.clientY
    };

    renderBoard();

    return true;
}


// Animação dos movimentos

function runMoveAnimation() {
    return new Promise(resolve => {
        const currentAnimation = animation;
        const startTime = performance.now();

        const start = getSquareCenter(currentAnimation.from);
        const end = getSquareCenter(currentAnimation.to);

        function frame(currentTime) {
            const elapsed = currentTime - startTime;

            const progress = Math.min(
                elapsed / ANIMATION_DURATION,
                1
            );

            // Smoothstep, igual ao Pygame.
            const smoothProgress =
                progress * progress * (3 - 2 * progress);

            const currentX =
                start.x + (end.x - start.x) * smoothProgress;

            const currentY =
                start.y + (end.y - start.y) * smoothProgress;

            currentAnimation.image.style.left =
                `${currentX}px`;

            currentAnimation.image.style.top =
                `${currentY}px`;

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


// Comunicação com o Python

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
        gameState = data.state;

        renderBoard();

    } catch (error) {
        setStatus("Erro ao iniciar a partida.");
        console.error(error);
    }
}


async function makeMove(fromSquare, toSquare, animate = true) {
    if (
        busy ||
        !gameId ||
        gameState.checkmate ||
        gameState.stalemate
    ) {
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
        selectedSquare = null;

        if (animate && movingPiece) {
            animation = {
                from: fromSquare,
                to: toSquare,
                piece: movingPiece
            };

            renderBoard();

            await runMoveAnimation();

        } else {
            renderBoard();
        }

    } catch (error) {
        setStatus(error.message);
        console.error(error);

        selectedSquare = null;
        dragging = null;

        renderBoard();

    } finally {
        busy = false;
    }
}


// Eventos do mouse e toque

boardElement.addEventListener("pointerdown", event => {
    if (
        event.button !== 0 ||
        busy ||
        !gameState ||
        gameState.checkmate ||
        gameState.stalemate
    ) {
        return;
    }

    const square = event.target.closest(".square");

    if (!square) {
        return;
    }

    event.preventDefault();

    const squareName = square.dataset.square;

    // Peça própria: inicia o arraste.
    if (startDragging(squareName, event)) {
        return;
    }
});


document.addEventListener("pointermove", event => {
    if (dragging) {
        positionDraggedPiece(event.clientX, event.clientY);
    }
});


document.addEventListener("pointerup", async event => {
    if (
        busy ||
        !gameState
    ) {
        dragging = null;
        return;
    }

    const destination = getSquareAtPoint(
        event.clientX,
        event.clientY
    );

    // Finalização de um arraste.
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
        return;
    }

    // Movimento por dois cliques.
    if (selectedSquare && selectedSquare !== destination) {
        const legalDestinations =
            getLegalDestinations(selectedSquare);

        if (legalDestinations.includes(destination)) {
            await makeMove(
                selectedSquare,
                destination,
                true
            );

            return;
        }

        selectedSquare = null;
        renderBoard();
        return;
    }

    // Seleção de uma peça.
    const piece = gameState.pieces[destination];

    if (piece && piece.color === gameState.turn) {
        selectedSquare = destination;
    } else {
        selectedSquare = null;
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


createGame();