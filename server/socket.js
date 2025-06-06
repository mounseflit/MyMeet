// Socket.js - Socket.IO event handlers

// Store active rooms and users
const rooms = {};

module.exports = (io, xss) => {
    // Sanitize string to prevent XSS
    const sanitizeString = (str) => {
        return xss(str);
    };

    io.on('connection', (socket) => {
        console.log('New connection:', socket.id);

        // Join room
        socket.on('join-room', (roomId, username) => {
            roomId = sanitizeString(roomId);
            username = sanitizeString(username);

            console.log(`User ${username} (${socket.id}) joining room ${roomId}`);

            // Create room if it doesn't exist
            if (!rooms[roomId]) {
                rooms[roomId] = {
                    users: {},
                    messages: []
                };
            }

            // Add user to room
            rooms[roomId].users[socket.id] = {
                id: socket.id,
                username: username
            };

            // Join socket room
            socket.join(roomId);

            // Store room ID in socket for later use
            socket.roomId = roomId;
            socket.username = username;

            // Notify other users in the room
            socket.to(roomId).emit('user-connected', socket.id, username);

            // Send previous messages to new user
            if (rooms[roomId].messages.length > 0) {
                rooms[roomId].messages.forEach(msg => {
                    socket.emit('chat-message', msg.message, msg.sender, msg.senderId);
                });
            }
        });

        // Handle WebRTC signaling
        socket.on('signal', (userId, signal) => {
            console.log(`Signal from ${socket.id} to ${userId}`);
            io.to(userId).emit('signal', socket.id, signal);
        });

        // Handle chat messages
        socket.on('chat-message', (message, sender) => {
            const roomId = socket.roomId;
            
            if (!roomId) return;
            
            message = sanitizeString(message);
            sender = sanitizeString(sender);

            console.log(`Chat message in room ${roomId} from ${sender}: ${message}`);

            // Store message
            if (rooms[roomId]) {
                rooms[roomId].messages.push({
                    senderId: socket.id,
                    sender: sender,
                    message: message,
                    timestamp: Date.now()
                });

                // Limit stored messages to 100 per room
                if (rooms[roomId].messages.length > 100) {
                    rooms[roomId].messages.shift();
                }
            }

            // Broadcast to room
            socket.to(roomId).emit('chat-message', message, sender, socket.id);
        });

        // Handle video state change
        socket.on('video-state-change', (isEnabled) => {
            const roomId = socket.roomId;
            if (roomId) {
                socket.to(roomId).emit('user-video-state-change', socket.id, isEnabled);
            }
        });

        // Handle audio state change
        socket.on('audio-state-change', (isEnabled) => {
            const roomId = socket.roomId;
            if (roomId) {
                socket.to(roomId).emit('user-audio-state-change', socket.id, isEnabled);
            }
        });

        // Handle screen sharing started
        socket.on('screen-share-started', () => {
            const roomId = socket.roomId;
            if (roomId) {
                socket.to(roomId).emit('user-screen-share-started', socket.id);
            }
        });

        // Handle screen sharing stopped
        socket.on('screen-share-stopped', () => {
            const roomId = socket.roomId;
            if (roomId) {
                socket.to(roomId).emit('user-screen-share-stopped', socket.id);
            }
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            const roomId = socket.roomId;
            
            console.log(`User disconnected: ${socket.id} from room ${roomId}`);
            
            if (roomId && rooms[roomId]) {
                // Remove user from room
                const username = rooms[roomId].users[socket.id]?.username || 'Unknown';
                delete rooms[roomId].users[socket.id];
                
                // Notify other users
                socket.to(roomId).emit('user-disconnected', socket.id, username);
                
                // Clean up empty rooms
                if (Object.keys(rooms[roomId].users).length === 0) {
                    console.log(`Room ${roomId} is empty, cleaning up`);
                    delete rooms[roomId];
                }
            }
        });
    });
};
