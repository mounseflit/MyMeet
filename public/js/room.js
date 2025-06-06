// Room.js - Main logic for the video conferencing room

// Global variables
let socket;
let localStream;
let screenStream;
let roomId;
let username;
let peers = {};
let isAudioEnabled = true;
let isVideoEnabled = true;
let isScreenSharing = false;
let chatMessages = [];
let meetingStartTime;

// DOM Elements
const joinScreen = document.getElementById('join-screen');
const meetingContainer = document.querySelector('.meeting-container');
const videoContainer = document.getElementById('video-container');
const localPreview = document.getElementById('local-preview');
const usernameInput = document.getElementById('username-input');
const joinMeetingBtn = document.getElementById('join-meeting-btn');
const toggleVideoPreviewBtn = document.getElementById('toggle-video-preview');
const toggleAudioPreviewBtn = document.getElementById('toggle-audio-preview');
const toggleVideoBtn = document.getElementById('toggle-video');
const toggleAudioBtn = document.getElementById('toggle-audio');
const toggleScreenBtn = document.getElementById('toggle-screen');
const toggleChatBtn = document.getElementById('toggle-chat');
const leaveMeetingBtn = document.getElementById('leave-meeting');
const chatPanel = document.getElementById('chat-panel');
const chatMessages_container = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendMessageBtn = document.getElementById('send-message');
const closeChatBtn = document.getElementById('close-chat');
const copyLinkBtn = document.getElementById('copy-link-btn');
const meetingLinkInput = document.getElementById('meeting-link');
const roomIdDisplay = document.getElementById('room-id');
const roomTimer = document.getElementById('room-timer');

// Initialize the application
document.addEventListener('DOMContentLoaded', initialize);

async function initialize() {
    // Get room ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    roomId = urlParams.get('room');
    
    if (!roomId) {
        // Redirect to home if no room ID
        window.location.href = '/';
        return;
    }
    
    // Set meeting link
    const fullUrl = `${window.location.origin}/room.html?room=${roomId}`;
    meetingLinkInput.value = fullUrl;
    roomIdDisplay.textContent = roomId;
    
    // Initialize preview
    await initializePreview();
    
    // Set up event listeners
    setupEventListeners();
}

// Initialize camera/mic preview
async function initializePreview() {
    const result = await WebRTCUtils.getUserMedia();
    
    if (result.success) {
        localStream = result.stream;
        localPreview.srcObject = localStream;
        
        // Check initial device states
        const videoTrack = localStream.getVideoTracks()[0];
        const audioTrack = localStream.getAudioTracks()[0];
        
        isVideoEnabled = videoTrack ? videoTrack.enabled : false;
        isAudioEnabled = audioTrack ? audioTrack.enabled : false;
        
        updateButtonState(toggleVideoPreviewBtn, isVideoEnabled);
        updateButtonState(toggleAudioPreviewBtn, isAudioEnabled);
    } else {
        // Handle error - show notification
        showNotification('Could not access camera or microphone. Please check permissions.', 'error');
        
        // Create empty stream for preview
        localStream = WebRTCUtils.createBlackSilentStream();
        localPreview.srcObject = localStream;
        
        isVideoEnabled = false;
        isAudioEnabled = false;
        
        updateButtonState(toggleVideoPreviewBtn, false);
        updateButtonState(toggleAudioPreviewBtn, false);
    }
}

// Set up all event listeners
function setupEventListeners() {
    // Join screen controls
    toggleVideoPreviewBtn.addEventListener('click', toggleVideoPreview);
    toggleAudioPreviewBtn.addEventListener('click', toggleAudioPreview);
    joinMeetingBtn.addEventListener('click', joinMeeting);
    
    // Meeting room controls
    toggleVideoBtn.addEventListener('click', toggleVideo);
    toggleAudioBtn.addEventListener('click', toggleAudio);
    toggleScreenBtn.addEventListener('click', toggleScreen);
    toggleChatBtn.addEventListener('click', toggleChat);
    leaveMeetingBtn.addEventListener('click', leaveMeeting);
    
    // Chat controls
    sendMessageBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    closeChatBtn.addEventListener('click', toggleChat);
    
    // Copy link
    copyLinkBtn.addEventListener('click', copyMeetingLink);
    
    // Handle window unload
    window.addEventListener('beforeunload', () => {
        if (socket) {
            socket.disconnect();
        }
    });
}

// Toggle video in preview
function toggleVideoPreview() {
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            isVideoEnabled = !videoTrack.enabled;
            videoTrack.enabled = isVideoEnabled;
            updateButtonState(toggleVideoPreviewBtn, isVideoEnabled);
        }
    }
}

// Toggle audio in preview
function toggleAudioPreview() {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            isAudioEnabled = !audioTrack.enabled;
            audioTrack.enabled = isAudioEnabled;
            updateButtonState(toggleAudioPreviewBtn, isAudioEnabled);
        }
    }
}

// Join the meeting
async function joinMeeting() {
    username = usernameInput.value.trim();
    
    if (!username) {
        showNotification('Please enter your name', 'error');
        return;
    }
    
    // Hide join screen, show meeting container
    joinScreen.style.display = 'none';
    meetingContainer.style.display = 'block';
    
    // Start meeting timer
    startMeetingTimer();
    
    // Connect to socket server
    connectToSocketServer();
    
    // Add local video to container
    addLocalVideoElement();
    
    // Update control buttons
    updateButtonState(toggleVideoBtn, isVideoEnabled);
    updateButtonState(toggleAudioBtn, isAudioEnabled);
}

// Connect to socket server
function connectToSocketServer() {
    socket = io();
    
    // Socket event handlers
    socket.on('connect', () => {
        console.log('Connected to server with ID:', socket.id);
        socket.emit('join-room', roomId, username);
    });
    
    socket.on('user-connected', (userId, userName) => {
        console.log('User connected:', userId, userName);
        showNotification(`${userName} joined the meeting`);
        connectToNewUser(userId, userName);
    });
    
    socket.on('user-disconnected', (userId, userName) => {
        console.log('User disconnected:', userId);
        if (peers[userId]) {
            peers[userId].connection.close();
            removeVideoElement(userId);
            delete peers[userId];
            showNotification(`${userName} left the meeting`);
        }
    });
    
    socket.on('signal', async (userId, signal) => {
        handleSignal(userId, signal);
    });
    
    socket.on('chat-message', (message, sender, senderId) => {
        addMessageToChat(message, sender, senderId === socket.id);
    });
    
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        showNotification('Connection error. Please try again.', 'error');
    });
}

// Handle incoming signal
async function handleSignal(userId, signal) {
    const signalData = JSON.parse(signal);
    
    // If we don't have this peer yet, create it
    if (!peers[userId]) {
        peers[userId] = {
            connection: WebRTCUtils.createPeerConnection(),
            userName: signalData.userName || 'Unknown'
        };
        
        setupPeerConnectionListeners(userId);
    }
    
    const peerConnection = peers[userId].connection;
    
    // Handle SDP
    if (signalData.sdp) {
        await WebRTCUtils.setRemoteDescription(peerConnection, signalData.sdp);
        
        if (signalData.sdp.type === 'offer') {
            // Add local tracks to connection
            WebRTCUtils.addTracksToConnection(peerConnection, localStream);
            
            // Create and send answer
            const result = await WebRTCUtils.createAnswer(peerConnection);
            if (result.success) {
                socket.emit('signal', userId, JSON.stringify({
                    sdp: peerConnection.localDescription,
                    userName: username
                }));
            }
        }
    }
    
    // Handle ICE candidate
    if (signalData.ice) {
        await WebRTCUtils.addIceCandidate(peerConnection, signalData.ice);
    }
}

// Set up peer connection event listeners
function setupPeerConnectionListeners(userId) {
    const peerConnection = peers[userId].connection;
    
    // ICE candidate event
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('signal', userId, JSON.stringify({
                ice: event.candidate,
                userName: username
            }));
        }
    };
    
    // Track event
    peerConnection.ontrack = (event) => {
        const stream = event.streams[0];
        addRemoteVideoElement(userId, stream, peers[userId].userName);
    };
    
    // Connection state change
    peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'disconnected' || 
            peerConnection.connectionState === 'failed') {
            removeVideoElement(userId);
            delete peers[userId];
        }
    };
}

// Connect to a new user
async function connectToNewUser(userId, userName) {
    peers[userId] = {
        connection: WebRTCUtils.createPeerConnection(),
        userName: userName
    };
    
    const peerConnection = peers[userId].connection;
    
    // Set up event listeners
    setupPeerConnectionListeners(userId);
    
    // Add local tracks to connection
    WebRTCUtils.addTracksToConnection(peerConnection, localStream);
    
    // Create and send offer
    const result = await WebRTCUtils.createOffer(peerConnection);
    if (result.success) {
        socket.emit('signal', userId, JSON.stringify({
            sdp: peerConnection.localDescription,
            userName: username
        }));
    }
}

// Add local video element to container
function addLocalVideoElement() {
    const videoItem = document.createElement('div');
    videoItem.className = 'video-item';
    videoItem.id = 'local-video-container';
    
    const video = document.createElement('video');
    video.srcObject = localStream;
    video.id = 'local-video';
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true; // Mute local video to prevent feedback
    
    const nameTag = document.createElement('div');
    nameTag.className = 'user-name';
    nameTag.textContent = `${username} (You)`;
    
    videoItem.appendChild(video);
    videoItem.appendChild(nameTag);
    
    // Add muted icon if audio is muted
    if (!isAudioEnabled) {
        const mutedIcon = document.createElement('div');
        mutedIcon.className = 'muted-icon';
        mutedIcon.innerHTML = '<i class="fas fa-microphone-slash"></i>';
        videoItem.appendChild(mutedIcon);
    }
    
    // Add video off icon if video is off
    if (!isVideoEnabled) {
        const videoOffIcon = document.createElement('div');
        videoOffIcon.className = 'video-off-icon';
        videoOffIcon.innerHTML = '<i class="fas fa-video-slash"></i>';
        videoItem.appendChild(videoOffIcon);
    }
    
    videoContainer.appendChild(videoItem);
}

// Add remote video element to container
function addRemoteVideoElement(userId, stream, userName) {
    // Remove existing element if it exists
    removeVideoElement(userId);
    
    const videoItem = document.createElement('div');
    videoItem.className = 'video-item';
    videoItem.id = `video-container-${userId}`;
    
    const video = document.createElement('video');
    video.srcObject = stream;
    video.id = `video-${userId}`;
    video.autoplay = true;
    video.playsInline = true;
    
    const nameTag = document.createElement('div');
    nameTag.className = 'user-name';
    nameTag.textContent = userName;
    
    videoItem.appendChild(video);
    videoItem.appendChild(nameTag);
    
    // Check if remote user has video/audio tracks and their enabled state
    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];
    
    // Add muted icon if audio track is disabled
    if (!audioTrack || !audioTrack.enabled) {
        const mutedIcon = document.createElement('div');
        mutedIcon.className = 'muted-icon';
        mutedIcon.innerHTML = '<i class="fas fa-microphone-slash"></i>';
        videoItem.appendChild(mutedIcon);
    }
    
    // Add video off icon if video track is disabled
    if (!videoTrack || !videoTrack.enabled) {
        const videoOffIcon = document.createElement('div');
        videoOffIcon.className = 'video-off-icon';
        videoOffIcon.innerHTML = '<i class="fas fa-video-slash"></i>';
        videoItem.appendChild(videoOffIcon);
    }
    
    videoContainer.appendChild(videoItem);
}

// Remove video element
function removeVideoElement(userId) {
    const videoItem = document.getElementById(`video-container-${userId}`);
    if (videoItem) {
        videoItem.remove();
    }
}

// Toggle video in meeting
function toggleVideo() {
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            isVideoEnabled = !videoTrack.enabled;
            videoTrack.enabled = isVideoEnabled;
            updateButtonState(toggleVideoBtn, isVideoEnabled);
            
            // Update local video container
            const localVideoContainer = document.getElementById('local-video-container');
            const videoOffIcon = localVideoContainer.querySelector('.video-off-icon');
            
            if (!isVideoEnabled) {
                if (!videoOffIcon) {
                    const icon = document.createElement('div');
                    icon.className = 'video-off-icon';
                    icon.innerHTML = '<i class="fas fa-video-slash"></i>';
                    localVideoContainer.appendChild(icon);
                }
            } else {
                if (videoOffIcon) {
                    videoOffIcon.remove();
                }
            }
            
            // Notify other users about video state
            socket.emit('video-state-change', isVideoEnabled);
        }
    }
}

// Toggle audio in meeting
function toggleAudio() {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            isAudioEnabled = !audioTrack.enabled;
            audioTrack.enabled = isAudioEnabled;
            updateButtonState(toggleAudioBtn, isAudioEnabled);
            
            // Update local video container
            const localVideoContainer = document.getElementById('local-video-container');
            const mutedIcon = localVideoContainer.querySelector('.muted-icon');
            
            if (!isAudioEnabled) {
                if (!mutedIcon) {
                    const icon = document.createElement('div');
                    icon.className = 'muted-icon';
                    icon.innerHTML = '<i class="fas fa-microphone-slash"></i>';
                    localVideoContainer.appendChild(icon);
                }
            } else {
                if (mutedIcon) {
                    mutedIcon.remove();
                }
            }
            
            // Notify other users about audio state
            socket.emit('audio-state-change', isAudioEnabled);
        }
    }
}

// Toggle screen sharing
async function toggleScreen() {
    if (!isScreenSharing) {
        // Start screen sharing
        const result = await WebRTCUtils.getDisplayMedia();
        
        if (result.success) {
            screenStream = result.stream;
            
            // Replace video track in all peer connections
            const videoTrack = screenStream.getVideoTracks()[0];
            
            for (const userId in peers) {
                const peerConnection = peers[userId].connection;
                const senders = peerConnection.getSenders();
                const sender = senders.find(s => s.track && s.track.kind === 'video');
                
                if (sender) {
                    WebRTCUtils.replaceTrack(sender, videoTrack);
                }
            }
            
            // Replace local video
            const localVideo = document.getElementById('local-video');
            localVideo.srcObject = screenStream;
            
            // Update button state
            isScreenSharing = true;
            updateButtonState(toggleScreenBtn, true);
            
            // Handle screen sharing stop
            screenStream.getVideoTracks()[0].onended = () => {
                stopScreenSharing();
            };
            
            // Notify users
            showNotification('Screen sharing started');
            socket.emit('screen-share-started');
        } else {
            showNotification('Could not start screen sharing', 'error');
        }
    } else {
        // Stop screen sharing
        stopScreenSharing();
    }
}

// Stop screen sharing
function stopScreenSharing() {
    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        
        // Replace with camera video track in all peer connections
        const videoTrack = localStream.getVideoTracks()[0];
        
        for (const userId in peers) {
            const peerConnection = peers[userId].connection;
            const senders = peerConnection.getSenders();
            const sender = senders.find(s => s.track && s.track.kind === 'video');
            
            if (sender) {
                WebRTCUtils.replaceTrack(sender, videoTrack);
            }
        }
        
        // Replace local video
        const localVideo = document.getElementById('local-video');
        localVideo.srcObject = localStream;
        
        // Update button state
        isScreenSharing = false;
        updateButtonState(toggleScreenBtn, false);
        
        // Notify users
        showNotification('Screen sharing stopped');
        socket.emit('screen-share-stopped');
    }
}

// Toggle chat panel
function toggleChat() {
    chatPanel.classList.toggle('open');
    
    if (chatPanel.classList.contains('open')) {
        chatInput.focus();
    }
}

// Send chat message
function sendMessage() {
    const message = chatInput.value.trim();
    
    if (message) {
        socket.emit('chat-message', message, username);
        addMessageToChat(message, username, true);
        chatInput.value = '';
    }
}

// Add message to chat
function addMessageToChat(message, sender, isSelf) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isSelf ? 'sent' : 'received'}`;
    
    const senderElement = document.createElement('div');
    senderElement.className = 'sender';
    senderElement.textContent = isSelf ? 'You' : sender;
    
    const contentElement = document.createElement('div');
    contentElement.className = 'content';
    contentElement.textContent = message;
    
    const timeElement = document.createElement('div');
    timeElement.className = 'time';
    timeElement.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageElement.appendChild(senderElement);
    messageElement.appendChild(contentElement);
    messageElement.appendChild(timeElement);
    
    chatMessages_container.appendChild(messageElement);
    chatMessages_container.scrollTop = chatMessages_container.scrollHeight;
    
    // If chat is not open, show notification
    if (!chatPanel.classList.contains('open')) {
        showNotification(`New message from ${sender}`);
    }
}

// Copy meeting link
function copyMeetingLink() {
    meetingLinkInput.select();
    document.execCommand('copy');
    
    showNotification('Meeting link copied to clipboard');
}

// Leave meeting
function leaveMeeting() {
    // Disconnect socket
    if (socket) {
        socket.disconnect();
    }
    
    // Stop all streams
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    
    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
    }
    
    // Close all peer connections
    for (const userId in peers) {
        peers[userId].connection.close();
    }
    
    // Redirect to home
    window.location.href = '/';
}

// Start meeting timer
function startMeetingTimer() {
    meetingStartTime = new Date();
    
    setInterval(() => {
        const now = new Date();
        const diff = now - meetingStartTime;
        
        const hours = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
        const minutes = Math.floor((diff / (1000 * 60)) % 60).toString().padStart(2, '0');
        const seconds = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
        
        roomTimer.textContent = `${hours}:${minutes}:${seconds}`;
    }, 1000);
}

// Update button state
function updateButtonState(button, isEnabled) {
    if (isEnabled) {
        button.classList.add('active');
    } else {
        button.classList.remove('active');
    }
    
    // Update icon
    const icon = button.querySelector('i');
    
    if (button === toggleVideoBtn || button === toggleVideoPreviewBtn) {
        icon.className = isEnabled ? 'fas fa-video' : 'fas fa-video-slash';
    } else if (button === toggleAudioBtn || button === toggleAudioPreviewBtn) {
        icon.className = isEnabled ? 'fas fa-microphone' : 'fas fa-microphone-slash';
    } else if (button === toggleScreenBtn) {
        icon.className = isEnabled ? 'fas fa-stop-circle' : 'fas fa-desktop';
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.getElementById('notification-container').appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}
