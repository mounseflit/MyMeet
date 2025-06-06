// Room Manager utility functions
const { v4: uuidv4 } = require('uuid');

// Store active rooms
const activeRooms = {};

/**
 * Create a new room or get existing room
 * @param {string} roomId - Optional room ID
 * @returns {string} Room ID
 */
const createOrGetRoom = (roomId = null) => {
    // If no room ID provided, generate a new one
    if (!roomId) {
        roomId = generateRoomId();
    }
    
    // Create room if it doesn't exist
    if (!activeRooms[roomId]) {
        activeRooms[roomId] = {
            id: roomId,
            users: {},
            messages: [],
            createdAt: Date.now()
        };
    }
    
    return roomId;
};

/**
 * Generate a unique room ID
 * @returns {string} Room ID
 */
const generateRoomId = () => {
    // Generate a 5-character room ID
    return Math.random().toString(36).substring(2, 7);
};

/**
 * Add user to room
 * @param {string} roomId - Room ID
 * @param {string} userId - User ID
 * @param {string} username - Username
 * @returns {boolean} Success
 */
const addUserToRoom = (roomId, userId, username) => {
    if (!activeRooms[roomId]) {
        return false;
    }
    
    activeRooms[roomId].users[userId] = {
        id: userId,
        username: username,
        joinedAt: Date.now()
    };
    
    return true;
};

/**
 * Remove user from room
 * @param {string} roomId - Room ID
 * @param {string} userId - User ID
 * @returns {boolean} Success
 */
const removeUserFromRoom = (roomId, userId) => {
    if (!activeRooms[roomId] || !activeRooms[roomId].users[userId]) {
        return false;
    }
    
    delete activeRooms[roomId].users[userId];
    
    // Clean up empty rooms
    if (Object.keys(activeRooms[roomId].users).length === 0) {
        delete activeRooms[roomId];
    }
    
    return true;
};

/**
 * Add message to room
 * @param {string} roomId - Room ID
 * @param {string} userId - User ID
 * @param {string} username - Username
 * @param {string} message - Message content
 * @returns {boolean} Success
 */
const addMessageToRoom = (roomId, userId, username, message) => {
    if (!activeRooms[roomId]) {
        return false;
    }
    
    activeRooms[roomId].messages.push({
        id: uuidv4(),
        userId: userId,
        username: username,
        content: message,
        timestamp: Date.now()
    });
    
    // Limit stored messages to 100 per room
    if (activeRooms[roomId].messages.length > 100) {
        activeRooms[roomId].messages.shift();
    }
    
    return true;
};

/**
 * Get room messages
 * @param {string} roomId - Room ID
 * @returns {Array} Messages
 */
const getRoomMessages = (roomId) => {
    if (!activeRooms[roomId]) {
        return [];
    }
    
    return activeRooms[roomId].messages;
};

/**
 * Get room users
 * @param {string} roomId - Room ID
 * @returns {Object} Users
 */
const getRoomUsers = (roomId) => {
    if (!activeRooms[roomId]) {
        return {};
    }
    
    return activeRooms[roomId].users;
};

/**
 * Check if room exists
 * @param {string} roomId - Room ID
 * @returns {boolean} Room exists
 */
const roomExists = (roomId) => {
    return !!activeRooms[roomId];
};

/**
 * Clean up inactive rooms
 * @param {number} maxAge - Maximum age in milliseconds
 */
const cleanupInactiveRooms = (maxAge = 24 * 60 * 60 * 1000) => {
    const now = Date.now();
    
    Object.keys(activeRooms).forEach(roomId => {
        const room = activeRooms[roomId];
        
        // If room is older than maxAge and has no users, delete it
        if (now - room.createdAt > maxAge && Object.keys(room.users).length === 0) {
            delete activeRooms[roomId];
        }
    });
};

module.exports = {
    createOrGetRoom,
    generateRoomId,
    addUserToRoom,
    removeUserFromRoom,
    addMessageToRoom,
    getRoomMessages,
    getRoomUsers,
    roomExists,
    cleanupInactiveRooms
};
