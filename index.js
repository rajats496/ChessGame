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
// server.js - GLOBAL SCOPE (Top of file)
let timers = { w: 600, b: 600 }; 
let timerInterval = null;

function startTimer(io) {
    if (timerInterval) return; // Don't start a second interval if one exists

    timerInterval = setInterval(() => {
        const turn = chess.turn(); // 'w' or 'b'
        timers[turn]--;

        // Broadcast the update to EVERYONE (players and spectators)
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

app.get("/",(req,resp)=>{
    resp.render('home',{title:"Chess Game "});
})

io.on("connection",(uniquesocket)=>{
    uniquesocket.emit("boardState", chess.fen());
    uniquesocket.emit("timerUpdate", timers);

    if(!player.white){
        player.white=uniquesocket.id;
        uniquesocket.emit("playerRole","w");
    }
    else if(!player.black){
        player.black=uniquesocket.id;
        uniquesocket.emit("playerRole","b");
    }
    else {
        uniquesocket.emit("spectatorRole")
    }

    uniquesocket.on("disconnect" , ()=>{
        if(uniquesocket.id ==player.white) delete player.white;
        else if(uniquesocket.id ==player.black) delete player.black;
    })

    uniquesocket.on("move", (move) => {
        try {
            const result = chess.move(move);
            
            if (result) {
                io.emit("move", move);
                io.emit("boardState", chess.fen());
                startTimer(io);
                // Check for game over using the new version's method names
                if (chess.isGameOver()) { 
                    clearInterval(timerInterval);
                    let winner = "Draw";
                    let reason = "Stalemate";

                    if (chess.isCheckmate()) {
                        // If it's checkmate, the person whose turn it IS just lost
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
        // Reset Logic
        chess.reset();
        timers = { w: 600, b: 600 };
        clearInterval(timerInterval);
        timerInterval = null;
        io.emit("boardState", chess.fen());
        io.emit("timerUpdate", timers);
        io.emit("gameRestarted");
    });

    // Draw offer logic
    uniquesocket.on("offerDraw", () => {
        // .broadcast sends to everyone EXCEPT the sender
        uniquesocket.broadcast.emit("drawOffered");
    });

    uniquesocket.on("acceptDraw", () => {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
        io.emit("gameOver", { winner: "Draw", reason: "Mutual Agreement" });
    });

    uniquesocket.on("declineDraw", () => {
        // Tell the person who offered that it was declined
        uniquesocket.broadcast.emit("drawDeclined");
    });

    // Resignation logic - SINGLE HANDLER ONLY
    uniquesocket.on("resign", () => {
        clearInterval(timerInterval);
        timerInterval = null;
        const loser = (uniquesocket.id === player.white) ? "White" : "Black";
        const winner = (loser === "White") ? "Black" : "White";
        // Emit to ALL clients (including the one who resigned)
        io.emit("gameOver", { winner, reason: "Resignation" });
    });
});

server.listen(4000);