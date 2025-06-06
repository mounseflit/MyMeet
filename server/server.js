// Server.js - Main Express server file

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');
const xss = require('xss');
const socketHandler = require('./socket');

// Create Express app
const app = express();
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/room.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/room.html'));
});

// Handle Socket.IO connections
socketHandler(io, xss);

// Set port
const PORT = process.env.PORT || 3000;

// Start server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = server;
