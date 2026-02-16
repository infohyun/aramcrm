const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Room storage: { code: { white: socketId, black: socketId, createdAt, colors } }
const rooms = {};

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  } while (rooms[code]);
  return code;
}

// Clean up empty/stale rooms every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const code in rooms) {
    const room = rooms[code];
    if (!room.white && !room.black) {
      delete rooms[code];
    } else if (now - room.createdAt > 2 * 60 * 60 * 1000) {
      // Notify remaining players
      if (room.white) io.to(room.white).emit('room-expired');
      if (room.black) io.to(room.black).emit('room-expired');
      delete rooms[code];
    }
  }
}, 10 * 60 * 1000);

function getOpponentId(room, socketId) {
  if (room.white === socketId) return room.black;
  if (room.black === socketId) return room.black === socketId ? room.white : null;
  return null;
}

io.on('connection', (socket) => {
  let currentRoom = null;
  let myColor = null;

  socket.on('create-room', (callback) => {
    // Leave any existing room
    if (currentRoom) leaveRoom();

    const code = generateRoomCode();
    rooms[code] = {
      white: socket.id,
      black: null,
      createdAt: Date.now(),
      roundNumber: 1
    };
    currentRoom = code;
    myColor = 'w';
    socket.join(code);
    callback({ code, color: 'w' });
  });

  socket.on('join-room', (code, callback) => {
    code = code.toUpperCase().trim();
    const room = rooms[code];

    if (!room) {
      callback({ error: 'Room not found' });
      return;
    }
    if (room.white && room.black) {
      callback({ error: 'Room is full' });
      return;
    }

    // Leave any existing room
    if (currentRoom) leaveRoom();

    room.black = socket.id;
    currentRoom = code;
    myColor = 'b';
    socket.join(code);

    callback({ code, color: 'b' });

    // Notify the white player
    if (room.white) {
      io.to(room.white).emit('opponent-joined', { color: 'b' });
    }
  });

  socket.on('move', (moveData) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    const opponentId = room.white === socket.id ? room.black : room.white;
    if (opponentId) {
      io.to(opponentId).emit('opponent-move', moveData);
    }
  });

  socket.on('resign', () => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    const opponentId = room.white === socket.id ? room.black : room.white;
    if (opponentId) {
      io.to(opponentId).emit('opponent-resigned');
    }
  });

  socket.on('offer-draw', () => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    const opponentId = room.white === socket.id ? room.black : room.white;
    if (opponentId) {
      io.to(opponentId).emit('draw-offered');
    }
  });

  socket.on('accept-draw', () => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    const opponentId = room.white === socket.id ? room.black : room.white;
    if (opponentId) {
      io.to(opponentId).emit('draw-accepted');
    }
  });

  socket.on('decline-draw', () => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    const opponentId = room.white === socket.id ? room.black : room.white;
    if (opponentId) {
      io.to(opponentId).emit('draw-declined');
    }
  });

  socket.on('request-rematch', () => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    const opponentId = room.white === socket.id ? room.black : room.white;
    if (opponentId) {
      io.to(opponentId).emit('rematch-requested');
    }
  });

  socket.on('accept-rematch', () => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];

    // Swap colors
    const oldWhite = room.white;
    const oldBlack = room.black;
    room.white = oldBlack;
    room.black = oldWhite;
    room.roundNumber = (room.roundNumber || 1) + 1;

    // Notify both players of their new colors
    if (room.white) {
      io.to(room.white).emit('rematch-started', { color: 'w' });
    }
    if (room.black) {
      io.to(room.black).emit('rematch-started', { color: 'b' });
    }
  });

  function leaveRoom() {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    const opponentId = room.white === socket.id ? room.black : room.white;

    if (room.white === socket.id) room.white = null;
    if (room.black === socket.id) room.black = null;

    socket.leave(currentRoom);

    if (opponentId) {
      io.to(opponentId).emit('opponent-disconnected');
    }

    // Delete room if empty
    if (!room.white && !room.black) {
      delete rooms[currentRoom];
    }

    currentRoom = null;
    myColor = null;
  }

  socket.on('leave-room', () => {
    leaveRoom();
  });

  socket.on('disconnect', () => {
    leaveRoom();
  });
});

// Get LAN IP addresses
function getLanIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

server.listen(PORT, () => {
  console.log('');
  console.log('  Game Hub Server');
  console.log('  ===================');
  console.log(`  Local:    http://localhost:${PORT}`);
  const ips = getLanIPs();
  ips.forEach(ip => {
    console.log(`  Network:  http://${ip}:${PORT}`);
  });
  console.log('');
  console.log('  Games:');
  console.log(`    Hub:        http://localhost:${PORT}/games.html`);
  console.log(`    Chess:      http://localhost:${PORT}/index.html`);
  console.log(`    2048:       http://localhost:${PORT}/2048.html`);
  console.log(`    Snake:      http://localhost:${PORT}/snake.html`);
  console.log(`    Tetris:     http://localhost:${PORT}/tetris.html`);
  console.log(`    Pixel Art:  http://localhost:${PORT}/pixel-art.html`);
  console.log('');
});
