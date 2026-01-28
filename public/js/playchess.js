const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";
    
    // Check detection logic
    const isCheck = chess.isCheck ? chess.isCheck() : chess.in_check();
    const turn = chess.turn();

    board.forEach((row, rowindex) => {
        row.forEach((square, colindex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add("square", (rowindex + colindex) % 2 === 0 ? "light" : "dark");
            squareElement.dataset.row = rowindex;
            squareElement.dataset.col = colindex;

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add("piece", square.color === "w" ? "white" : "black");
                
                // Highlight King in red if in check
                if (square.type === "k" && square.color === turn && isCheck) {
                    squareElement.classList.add("check-red");
                }

                pieceElement.innerHTML = getPieceUnicode(square);
                pieceElement.draggable = (square.color === playerRole);

                pieceElement.addEventListener("dragstart", (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowindex, col: colindex };
                        e.dataTransfer.setData("text/plain", "");
                    }
                });

                pieceElement.addEventListener("dragend", () => {
                    draggedPiece = null;
                    sourceSquare = null;
                });

                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener("dragover", (e) => e.preventDefault());
            squareElement.addEventListener("drop", (e) => {
                e.preventDefault();
                if (draggedPiece) {
                    const targetSquare = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col),
                    };
                    handleMove(sourceSquare, targetSquare);
                }
            });

            boardElement.appendChild(squareElement);
        });
    });

    if (playerRole === 'b') boardElement.classList.add("flipped");
    else boardElement.classList.remove("flipped");
};

// --- Socket Listeners ---
socket.on("playerRole", (role) => { 
    playerRole = role; 
    renderBoard(); 
});

socket.on("spectatorRole", () => { 
    playerRole = null; 
    renderBoard(); 
});

socket.on("boardState", (fen) => { 
    chess.load(fen); 
    renderBoard(); 
});

socket.on("move", (move) => { 
    chess.move(move); 
    renderBoard(); 
});

socket.on("timerUpdate", (timers) => {
    document.getElementById("white-timer").innerText = `White: ${formatTime(timers.w)}`;
    document.getElementById("black-timer").innerText = `Black: ${formatTime(timers.b)}`;
});

socket.on("gameOver", (data) => {
    const msg = data.winner === "Draw" ? "It's a Draw!" : `${data.winner} wins by ${data.reason}!`;
    if (confirm(msg + "\n\nPlay again?")) {
        socket.emit("rematchRequest");
    }
});

socket.on("gameRestarted", () => { 
    alert("Game Reset!"); 
    // Re-enable buttons after restart
    const drawBtn = document.getElementById("draw-btn");
    if (drawBtn) drawBtn.disabled = false;
});

socket.on("drawOffered", () => {
    if (confirm("Opponent offers a draw. Accept?")) {
        socket.emit("acceptDraw");
    } else {
        socket.emit("declineDraw");
    }
});

socket.on("drawDeclined", () => {
    alert("Draw offer declined.");
    // Re-enable the draw button
    const drawBtn = document.getElementById("draw-btn");
    if (drawBtn) drawBtn.disabled = false;
});

// --- Helpers ---
function handleMove(source, target) {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: "q",
    };
    socket.emit("move", move);
}

function getPieceUnicode(piece) {
    const unicodePieces = {
        p: "♟\uFE0E", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚",
        P: "♙\uFE0E", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔",
    };
    const key = piece.color === "w" ? piece.type.toUpperCase() : piece.type.toLowerCase();
    return unicodePieces[key] || "";
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// --- Button Event Listeners (SINGLE DEFINITION) ---
const drawBtn = document.getElementById("draw-btn");
const resignBtn = document.getElementById("resign-btn");

drawBtn.addEventListener("click", () => {
    if (!playerRole) return alert("Spectators can't offer draws.");
    
    socket.emit("offerDraw");
    alert("Draw offer sent. Waiting for opponent...");
    
    // Temporarily disable to prevent multiple offers
    drawBtn.disabled = true;
});

resignBtn.addEventListener("click", () => {
    if (!playerRole) return alert("You are a spectator!");
    
    if (confirm("Are you sure you want to resign?")) {
        socket.emit("resign");
    }
});

// Initial render
renderBoard();