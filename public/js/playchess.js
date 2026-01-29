const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let lastMove = null; // To store the latest move globally

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";
    
    const isCheck = chess.isCheck ? chess.isCheck() : chess.in_check();
    const turn = chess.turn();

    board.forEach((row, rowindex) => {
        row.forEach((square, colindex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add("square", (rowindex + colindex) % 2 === 0 ? "light" : "dark");
            squareElement.dataset.row = rowindex;
            squareElement.dataset.col = colindex;
            const currentSquareNotation = `${String.fromCharCode(97 + colindex)}${8 - rowindex}`;
        if (lastMove && (lastMove.from === currentSquareNotation || lastMove.to === currentSquareNotation)) {
            squareElement.classList.add("last-move");
        }

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add("piece", square.color === "w" ? "white" : "black");
                
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

// NEW: Update role display
function updateRoleDisplay(role) {
    const roleElement = document.getElementById("player-role");
    if (role === 'w') {
        roleElement.innerHTML = '<span class="role-badge white-role">⚪ You are White Player</span>';
        roleElement.className = 'role-display white-player';
    } else if (role === 'b') {
        roleElement.innerHTML = '<span class="role-badge black-role">⚫ You are Black Player</span>';
        roleElement.className = 'role-display black-player';
    } else {
        roleElement.innerHTML = '<span class="role-badge spectator-role">👁️ You are Spectator</span>';
        roleElement.className = 'role-display spectator';
    }
}

// NEW: Update player count display
function updatePlayerCountDisplay(data) {
    const countElement = document.getElementById("player-count");
    countElement.innerHTML = `
        <div class="count-item ${data.white ? 'filled' : 'empty'}">
            <span class="dot white-dot"></span> White: ${data.white ? 'Connected' : 'Waiting...'}
        </div>
        <div class="count-item ${data.black ? 'filled' : 'empty'}">
            <span class="dot black-dot"></span> Black: ${data.black ? 'Connected' : 'Waiting...'}
        </div>
        <div class="count-item">
            <span class="dot spectator-dot"></span> Spectators: ${data.spectators}
        </div>
    `;
}

// --- Socket Listeners ---
socket.on("playerRole", (role) => { 
    playerRole = role; 
    renderBoard();
    updateRoleDisplay(role);
    
    setTimeout(() => {
        if (chess.history().length === 0) {
            alert("⚠️ Warning: You have 30 seconds to make your first move or you'll be removed!");
        }
    }, 5000);
});

socket.on("spectatorRole", () => { 
    playerRole = null; 
    renderBoard();
    updateRoleDisplay(null);
});

socket.on("boardState", (fen) => { 
    chess.load(fen); 
    renderBoard(); 
});

socket.on("move", (move) => { 
    chess.move(move); 
    lastMove = move; // NEW: Store the move object {from: 'e2', to: 'e4'}
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
    alert("Game Reset! You have 30 seconds to make your first move.");
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
    const drawBtn = document.getElementById("draw-btn");
    if (drawBtn) drawBtn.disabled = false;
});

socket.on("removedForInactivity", () => {
    alert("❌ You have been removed from the game due to inactivity!\n\nYou must make your first move within 30 seconds.");
    setTimeout(() => {
        window.location.reload();
    }, 2000);
});

socket.on("playerRemoved", (data) => {
    alert(`${data.player.charAt(0).toUpperCase() + data.player.slice(1)} player was removed:\n${data.reason}`);
});

// NEW: Handle player count updates
socket.on("playerCount", (data) => {
    updatePlayerCountDisplay(data);
});

// NEW: Handle ping to prevent sleep mode
socket.on("ping", () => {
    socket.emit("pong");
});

// --- Helpers ---
function handleMove(source, target) {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: "q",
    };
if (move) {
    renderBoard(); // Your existing board render function
    highlightLastMove(move.from, move.to); // Call the highlight here
}
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

// --- Button Event Listeners ---
const drawBtn = document.getElementById("draw-btn");
const resignBtn = document.getElementById("resign-btn");

drawBtn.addEventListener("click", () => {
    if (!playerRole) return alert("Spectators can't offer draws.");
    
    socket.emit("offerDraw");
    alert("Draw offer sent. Waiting for opponent...");
    drawBtn.disabled = true;
});

resignBtn.addEventListener("click", () => {
    if (!playerRole) return alert("You are a spectator!");
    
    if (confirm("Are you sure you want to resign?")) {
        socket.emit("resign");
    }
});
function highlightLastMove(from, to) {
    // 1. Remove 'last-move' class from all squares
    document.querySelectorAll('.square').forEach(sq => {
        sq.classList.remove('last-move');
    });

    // 2. Add highlight to the 'from' square
    const fromSquare = document.querySelector(`.square[data-square="${from}"]`);
    if (fromSquare) fromSquare.classList.add('last-move');

    // 3. Add highlight to the 'to' square
    const toSquare = document.querySelector(`.square[data-square="${to}"]`);
    if (toSquare) toSquare.classList.add('last-move');
}

// Initial render
renderBoard();
