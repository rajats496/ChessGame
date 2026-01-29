# ♟️ Real-Time Multiplayer Chess Game

A feature-rich, real-time multiplayer chess game built with Node.js, Socket.IO, and Chess.js. Play chess online with your friends with timers, draw offers, resignations, and automatic inactivity removal.

![Chess Game](https://img.shields.io/badge/Game-Chess-blue)
![Node.js](https://img.shields.io/badge/Node.js-v14+-green)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--time-orange)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🎮 Features

### Core Gameplay
- ✅ **Real-time Multiplayer** - Play chess with anyone in real-time using WebSockets
- ✅ **Spectator Mode** - Watch ongoing games when both player slots are full
- ✅ **Automatic Role Assignment** - First player is White, second is Black, rest are spectators
- ✅ **Legal Move Validation** - Only legal chess moves are allowed
- ✅ **Check Highlighting** - King is highlighted in red when in check
- ✅ **Board Flip** - Black player's board is automatically flipped for better perspective

### Game Controls
- ⏱️ **10-Minute Chess Timer** - Each player gets 10 minutes (600 seconds)
- 🤝 **Draw Offers** - Players can offer and accept/decline draws
- 🏳️ **Resignation** - Players can resign at any time
- 🔄 **Rematch System** - Quick rematch after game ends
- ⚡ **Inactivity Timeout** - Players are removed if they don't make their first move within 30 seconds

### Game End Conditions
- 🏆 **Checkmate** - Traditional chess victory
- ⏰ **Time Out** - Win by opponent running out of time
- 🤝 **Mutual Draw** - Both players agree to draw
- 🏳️ **Resignation** - Opponent resigns
- ⚠️ **Inactivity** - Opponent removed for not moving

### User Interface
- 🎨 **Responsive Design** - Works on all screen sizes
- 📱 **Mobile Friendly** - Optimized for mobile devices
- 🌙 **Dark Theme** - Easy on the eyes
- 🎯 **Drag & Drop** - Intuitive piece movement
- 📊 **Live Timers** - Real-time countdown for both players

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/rajats496/ChessGame.git
   cd ChessGame
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Project Structure**
   ```
   chess-game/
   ├── server.js              # Main server file
   ├── package.json           # Dependencies
   ├── views/
   │   └── home.ejs          # Main game page (index.html)
   └── public/
       ├── css/
       │   └── style.css     # Game styling
       └── js/
           └── playchess.js  # Client-side game logic
   ```

4. **Start the server**
   ```bash
   node server.js
   ```

5. **Open in browser**
   ```
   http://localhost:4000
   ```

## 📦 Dependencies

```json
{
  "express": "^4.18.2",
  "socket.io": "^4.8.1",
  "chess.js": "^0.10.3",
  "ejs": "^3.1.9",
  "cors": "^2.8.5"
}
```

Install all dependencies:
```bash
npm install express socket.io chess.js ejs cors
```

## 🎯 How to Play

### Starting a Game
1. **First Player**: Opens the game → Assigned **White** pieces
2. **Second Player**: Opens the game → Assigned **Black** pieces
3. **Additional Players**: Join as **Spectators**
4. **⚠️ Important**: Make your first move within **30 seconds** or you'll be removed!

### Making Moves
- **Drag and drop** pieces to valid squares
- Only **legal moves** are allowed
- Your timer starts after the first move is made

### Game Controls

#### Offer Draw
1. Click **"Offer Draw"** button
2. Opponent receives a popup to accept/decline
3. If accepted → Game ends in a draw
4. If declined → Game continues

#### Resign
1. Click **"Resign"** button
2. Confirm the resignation
3. Opponent wins immediately

#### Rematch
- After game ends, click **"Yes"** in the popup
- Board resets with same players
- New 30-second inactivity timers start

## 🛠️ Configuration

### Change Timer Duration
In `server.js`, modify the initial timer values (in seconds):
```javascript
let timers = { w: 600, b: 600 }; // 600 seconds = 10 minutes
```

### Change Inactivity Timeout
In `server.js`, modify the timeout duration:
```javascript
}, 30000); // 30000 milliseconds = 30 seconds
```

### Change Server Port
In `server.js`, modify the port:
```javascript
server.listen(4000); // Change 4000 to your desired port
```

## 🌐 Deployment

### Deploy to Heroku
1. Create `Procfile`:
   ```
   web: node server.js
   ```

2. Update port configuration in `server.js`:
   ```javascript
   const PORT = process.env.PORT || 4000;
   server.listen(PORT);
   ```

3. Deploy:
   ```bash
   heroku create your-chess-game
   git push heroku main
   ```

### Deploy to Railway
1. Connect your GitHub repository
2. Railway will auto-detect Node.js
3. Set environment variables if needed
4. Deploy automatically

### Deploy to Render
1. Connect repository
2. Build Command: `npm install`
3. Start Command: `node server.js`
4. Deploy

## 📱 Screenshots

### Main Game Board
- 8x8 Chessboard with classic styling
- Timer displays for both players
- Draw and Resign buttons

### Game States
- **Check**: King highlighted in red
- **Checkmate**: Winner announcement
- **Draw**: Draw notification
- **Time Out**: Time-based victory

## 🔧 Technical Details

### Frontend Technologies
- **HTML5** - Structure
- **TailwindCSS** - Styling framework
- **Vanilla JavaScript** - Game logic
- **Socket.IO Client** - Real-time communication
- **Chess.js** - Chess rules and validation

### Backend Technologies
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - WebSocket implementation
- **EJS** - Template engine

### Key Features Implementation

#### Real-time Communication
```javascript
// Server broadcasts to all clients
io.emit("move", move);

// Server sends to specific client
socket.emit("playerRole", "w");

// Send to all except sender
socket.broadcast.emit("drawOffered");
```

#### Timer System
- Decrements every second
- Switches based on whose turn it is
- Automatically ends game at 0

#### Inactivity Detection
- Starts 30-second countdown on connection
- Clears on first move
- Removes inactive players automatically

## 🐛 Troubleshooting

### Players Not Connecting
- Check if server is running on correct port
- Ensure no firewall blocking Socket.IO
- Verify CORS settings if hosting remotely

### Timers Not Working
- Check browser console for errors
- Ensure Socket.IO connection is established
- Verify timer updates are being received

### Pieces Not Moving
- Verify you're assigned a role (not spectator)
- Check if it's your turn
- Ensure move is legal

### Inactivity Timeout Issues
- Make sure `hasGameStarted` flag resets properly
- Check timeout clearance on moves
- Verify setTimeout duration

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open a Pull Request**

### Ideas for Contribution
- Add move history panel
- Implement chess notation display
- Add sound effects for moves
- Create user accounts and ratings
- Add chat functionality
- Implement different time controls (blitz, rapid, classical)
- Add move hints for beginners
- Create AI opponent option



## 👨‍💻 Author

**rajats496**
- GitHub: [@rajats496](https://github.com/rajats496)
- Repository: [ChessGame](https://github.com/rajats496/ChessGame)

## 🙏 Acknowledgments

- [Chess.js](https://github.com/jhlywa/chess.js) - Chess logic library
- [Socket.IO](https://socket.io/) - Real-time engine
- [TailwindCSS](https://tailwindcss.com/) - Styling framework
- Unicode Chess Pieces - For beautiful piece rendering

## 📊 Project Stats

- **Lines of Code**: ~500
- **Languages**: JavaScript, HTML, CSS
- **Real-time**: Socket.IO WebSockets
- **Game Logic**: Chess.js library

## 🔮 Future Enhancements

- [ ] Move history and notation
- [ ] Undo/Redo moves
- [ ] Save and load games
- [ ] Multiple game rooms
- [ ] Player profiles and ratings
- [ ] Game analysis
- [ ] Opening book integration
- [ ] Puzzle mode
- [ ] Tournament mode
- [ ] Mobile app version

---

⭐ **Star this repo** if you found it helpful!

🐛 **Report issues** on the GitHub issues page

💡 **Suggest features** via pull requests or issues
