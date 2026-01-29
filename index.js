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

// Track inactivity timeouts for each player
let inactivityTimeouts = { white: null, black: null };
let hasGameStarted = false;

// NEW: Keep-alive endpoint for external pinging services
app.get('/ping', (req, res) => {
    res.status(200).json({ 
        status: 'alive', 
        timestamp: new Date().toISOString(),
        activePlayers: {
            white: !!player.white,
            black: !!player.black
        }
    });
});

// NEW: Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

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

function clearInactivityTimeout(playerColor) {
    if (inactivityTimeouts[playerColor]) {
        clearTimeout(inactivityTimeouts[playerColor]);
        inactivityTimeouts[playerColor] = null;
    }
}

function startInactivityTimeout(playerColor, socketId, io) {
    clearInactivityTimeout(playerColor);
    
    inactivityTimeouts[playerColor] = setTimeout(() => {
        if (!hasGameStarted) {
            console.log(`${playerColor} player removed due to inactivity`);
            
            if (playerColor === 'white') {
                delete player.white;
            } else {
                delete player.black;
            }
            
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
                socket.emit("removedForInactivity");
                socket.disconnect(true);
            }
            
            io.emit("playerRemoved", { 
                player: playerColor, 
                reason: "Inactivity - No move within 30 seconds" 
            });
            
            updatePlayerCount(io);
        }
    }, 30000);
}

// Function to update player count for all clients
function updatePlayerCount(io) {
    const playerCount = {
        white: player.white ? true : false,
        black: player.black ? true : false,
        spectators: io.sockets.sockets.size - (player.white ? 1 : 0) - (player.black ? 1 : 0)
    };
    io.emit("playerCount", playerCount);
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
        startInactivityTimeout('white', uniquesocket.id, io);
        console.log("White player connected, 30s inactivity timer started");
    }
    else if(!player.black){
        player.black=uniquesocket.id;
        uniquesocket.emit("playerRole","b");
        startInactivityTimeout('black', uniquesocket.id, io);
        console.log("Black player connected, 30s inactivity timer started");
    }
    else {
        uniquesocket.emit("spectatorRole");
    }
    
    updatePlayerCount(io);

    uniquesocket.on("disconnect" , ()=>{
        if(uniquesocket.id == player.white) {
            clearInactivityTimeout('white');
            delete player.white;
        }
        else if(uniquesocket.id == player.black) {
            clearInactivityTimeout('black');
            delete player.black;
        }
        
        updatePlayerCount(io);
    })

    uniquesocket.on("move", (move) => {
        try {
            const result = chess.move(move);
            
            if (result) {
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
        chess.reset();
        timers = { w: 600, b: 600 };
        clearInterval(timerInterval);
        timerInterval = null;
        hasGameStarted = false;
        
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
        clearInactivityTimeout('white');
        clearInactivityTimeout('black');
        const loser = (uniquesocket.id === player.white) ? "White" : "Black";
        const winner = (loser === "White") ? "Black" : "White";
        io.emit("gameOver", { winner, reason: "Resignation" });
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
