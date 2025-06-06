# Video Conferencing App Architecture

## Overview
This document outlines the architecture for a modern video conferencing application built with Node.js/Express backend and HTML/CSS/JavaScript frontend. The application will enable users to create and join video meetings, chat in real-time, and share their screens.

## Technology Stack

### Backend
- **Node.js**: JavaScript runtime for server-side code
- **Express.js**: Web application framework for Node.js
- **Socket.IO**: Real-time bidirectional event-based communication
- **WebRTC**: Web Real-Time Communication for peer-to-peer audio/video streaming
- **XSS**: For sanitizing user inputs

### Frontend
- **HTML5**: Structure of the web pages
- **CSS3**: Styling with responsive design
- **JavaScript (ES6+)**: Client-side logic
- **Socket.IO Client**: For real-time communication with the server
- **Bootstrap**: For responsive UI components
- **FontAwesome**: For icons

## System Architecture

### Backend Components

1. **Express Server**
   - Serves static files
   - Handles HTTP requests
   - Manages API endpoints

2. **Socket.IO Server**
   - Manages WebSocket connections
   - Handles real-time events
   - Facilitates signaling for WebRTC

3. **Room Management**
   - Tracks active rooms/meetings
   - Manages user connections per room
   - Handles user join/leave events

4. **Chat System**
   - Stores messages per room
   - Broadcasts messages to room participants
   - Sanitizes message content

### Frontend Components

1. **Landing Page**
   - Welcome section with app introduction
   - Create/Join meeting functionality
   - Modern, responsive design

2. **Meeting Room**
   - Video grid for participants
   - Control panel (mute, video toggle, screen share, etc.)
   - Chat sidebar
   - Meeting link sharing

3. **User Authentication**
   - Username input before joining
   - Optional: Persistent user profiles

## Data Flow

1. **Meeting Creation**
   - User visits landing page
   - Clicks "Create Meeting" or enters a specific room code
   - System generates a unique room ID if not provided
   - User is redirected to the meeting room

2. **Joining a Meeting**
   - User receives a meeting link
   - Enters username
   - System connects user to the specified room
   - WebRTC connections established with other participants

3. **Video/Audio Streaming**
   - WebRTC peer connections established between participants
   - Media streams shared directly between peers
   - Server facilitates only the initial signaling

4. **Chat Messages**
   - User sends a message
   - Message is sent to server via Socket.IO
   - Server broadcasts to all participants in the room
   - Messages displayed in chat sidebar

5. **Screen Sharing**
   - User initiates screen sharing
   - Screen capture stream replaces video stream
   - Other participants receive the updated stream

## API Endpoints

1. **GET /** - Serve the landing page
2. **GET /:room** - Join a specific meeting room
3. **Static files** - Serve frontend assets

## Socket.IO Events

1. **join-room** - User joins a meeting room
2. **user-connected** - New user connected to a room
3. **user-disconnected** - User left a room
4. **signal** - WebRTC signaling data
5. **chat-message** - New chat message
6. **toggle-video** - User toggled video state
7. **toggle-audio** - User toggled audio state
8. **share-screen** - User sharing screen

## Directory Structure

```
video-meet-app/
├── public/                  # Static frontend files
│   ├── css/                 # Stylesheets
│   │   ├── style.css        # Main stylesheet
│   │   └── landing.css      # Landing page styles
│   ├── js/                  # JavaScript files
│   │   ├── main.js          # Main application logic
│   │   ├── room.js          # Meeting room logic
│   │   └── webrtc.js        # WebRTC handling
│   ├── assets/              # Images, icons, etc.
│   └── index.html           # Landing page
├── server/                  # Backend files
│   ├── server.js            # Main server file
│   ├── socket.js            # Socket.IO handling
│   └── utils/               # Utility functions
│       └── roomManager.js   # Room management logic
├── package.json             # Project dependencies
└── README.md                # Project documentation
```

## Deployment Considerations

1. **Vercel Deployment**
   - Configure for Node.js
   - Set up environment variables
   - Ensure proper build scripts

2. **STUN/TURN Servers**
   - Use Google's public STUN servers
   - Consider setting up TURN servers for NAT traversal

3. **Scalability**
   - Room-based architecture allows horizontal scaling
   - Consider Redis for distributed socket management in production

## Security Considerations

1. **Input Sanitization**
   - Sanitize all user inputs
   - Prevent XSS attacks

2. **Room Access**
   - Consider optional room passwords
   - Implement host controls

3. **Data Privacy**
   - No recording of meetings by default
   - Clear data when rooms are empty

## Future Enhancements

1. **User Authentication**
   - Optional accounts for regular users
   - OAuth integration

2. **Recording**
   - Meeting recording functionality
   - Cloud storage integration

3. **Virtual Backgrounds**
   - Background blur
   - Custom backgrounds

4. **Breakout Rooms**
   - Sub-rooms within meetings
   - Host management of breakout rooms
