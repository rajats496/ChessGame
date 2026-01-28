const express=require('express');
const socket=require('socket.io')
const http=require('http')
const {Chess}=require('chess.js')
const path=require('path')
const cors=require('cors')

 
const app=express();
const server=http.createServer(app);
const io=socket(server);

app.set('view engine','ejs');
app.use(express.static(path.resolve("public")));
app.use(cors());

const chess=new Chess();    
let player={};
let currentplayer="W";
let timers = { w: 600, b: 600 }; 
let timerInterval = null;

// NEW: Track inactivity timeouts for each player
let inactivityTimeouts = { white: null, black: null };
let hasGameStarted = false; // Track if any move has been made

function startTimer(io) {
    if (timerInterval) return;

    timerInterval = setInterval(() => {
        const turn = chess.turn();
        timers[turn]--;

        io.emit("timerUpdate", timers);

        if (timers[turn] <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            io.emit("gameOver", { 
                winner: turn === 'w' ? 'Black' : 'White', 
                reason: "Time Out" 
            });
        }
    }, 1000);
}

// NEW: Clear inactivity timeout for a player
function clearInactivityTimeout(playerColor) {
    if (inactivityTimeouts[playerColor]) {
        clearTimeout(inactivityTimeouts[playerColor]);
        inactivityTimeouts[playerColor] = null;
    }
}

// NEW: Start inactivity timeout for a player
function startInactivityTimeout(playerColor, socketId, io) {
    clearInactivityTimeout(playerColor);
    
    inactivityTimeouts[playerColor] = setTimeout(() => {
        if (!hasGameStarted) {
            console.log(`${playerColor} player removed due to inactivity`);
            
            // Remove the player
            if (playerColor === 'white') {
                delete player.white;
            } else {
                delete player.black;
            }
            
            // Disconnect the socket
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
                socket.emit("removedForInactivity");
                socket.disconnect(true);
            }
            
            // Notify other players
            io.emit("playerRemoved", { 
                player: playerColor, 
                reason: "Inactivity - No move within 30 seconds" 
            });
        }
    }, 30000); // 30 seconds
}

app.get("/",(req,resp)=>{
    resp.render('home',{title:"Chess Game "});
})

io.on("connection",(uniquesocket)=>{
    uniquesocket.emit("boardState", chess.fen());
    uniquesocket.emit("timerUpdate", timers);

    if(!player.white){
        player.white=uniquesocket.id;
        uniquesocket.emit("playerRole","w");
        
        // NEW: Start inactivity timeout for white player
        startInactivityTimeout('white', uniquesocket.id, io);
        console.log("White player connected, 30s inactivity timer started");
    }
    else if(!player.black){
        player.black=uniquesocket.id;
        uniquesocket.emit("playerRole","b");
        
        // NEW: Start inactivity timeout for black player
        startInactivityTimeout('black', uniquesocket.id, io);
        console.log("Black player connected, 30s inactivity timer started");
    }
    else {
        uniquesocket.emit("spectatorRole")
    }

    uniquesocket.on("disconnect" , ()=>{
        // NEW: Clear inactivity timeouts on disconnect
        if(uniquesocket.id == player.white) {
            clearInactivityTimeout('white');
            delete player.white;
        }
        else if(uniquesocket.id == player.black) {
            clearInactivityTimeout('black');
            delete player.black;
        }
    })

    uniquesocket.on("move", (move) => {
        try {
            const result = chess.move(move);
            
            if (result) {
                // NEW: Clear all inactivity timeouts once game starts
                if (!hasGameStarted) {
                    hasGameStarted = true;
                    clearInactivityTimeout('white');
                    clearInactivityTimeout('black');
                    console.log("Game started! Inactivity timeouts cleared.");
                }
                
                io.emit("move", move);
                io.emit("boardState", chess.fen());
                startTimer(io);
                
                if (chess.isGameOver()) { 
                    clearInterval(timerInterval);
                    let winner = "Draw";
                    let reason = "Stalemate";

                    if (chess.isCheckmate()) {
                        winner = chess.turn() === 'w' ? 'Black' : 'White';
                        reason = "Checkmate";
                    }
                    
                    io.emit("gameOver", { winner, reason });
                }
            }
        } catch (err) {
            console.log("Move Error:", err);
        }
    });

    uniquesocket.on("rematchRequest", () => {
        // Reset game state
        chess.reset();
        timers = { w: 600, b: 600 };
        clearInterval(timerInterval);
        timerInterval = null;
        
        // NEW: Reset game started flag
        hasGameStarted = false;
        
        // NEW: Restart inactivity timeouts for both players
        if (player.white) {
            startInactivityTimeout('white', player.white, io);
        }
        if (player.black) {
            startInactivityTimeout('black', player.black, io);
        }
        
        io.emit("boardState", chess.fen());
        io.emit("timerUpdate", timers);
        io.emit("gameRestarted");
        console.log("Game restarted, inactivity timers restarted");
    });

    uniquesocket.on("offerDraw", () => {
        uniquesocket.broadcast.emit("drawOffered");
    });

    uniquesocket.on("acceptDraw", () => {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
        
        // NEW: Clear inactivity timeouts
        clearInactivityTimeout('white');
        clearInactivityTimeout('black');
        
        io.emit("gameOver", { winner: "Draw", reason: "Mutual Agreement" });
    });

    uniquesocket.on("declineDraw", () => {
        uniquesocket.broadcast.emit("drawDeclined");
    });

    uniquesocket.on("resign", () => {
        clearInterval(timerInterval);
        timerInterval = null;
        
        // NEW: Clear inactivity timeouts
        clearInactivityTimeout('white');
        clearInactivityTimeout('black');
        
        const loser = (uniquesocket.id === player.white) ? "White" : "Black";
        const winner = (loser === "White") ? "Black" : "White";
        io.emit("gameOver", { winner, reason: "Resignation" });
    });
});

server.listen(4000);
