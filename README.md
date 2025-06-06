# MeetNow - Video Conferencing App

A modern video conferencing application built with Node.js/Express backend and HTML/CSS/JavaScript frontend. This application allows users to create and join video meetings, chat in real-time, and share their screens.

## Features

- **HD Video Conferencing**: Crystal clear video quality for face-to-face conversations
- **Screen Sharing**: Share your screen with participants to collaborate effectively
- **Live Chat**: Send messages to everyone in the meeting without interrupting the flow
- **Secure Meetings**: Unique meeting codes keep your conversations private
- **Cross-Device Compatibility**: Join from any device with a browser - no downloads required
- **Instant Sharing**: Generate and share meeting links with just one click

## Tech Stack

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

## Getting Started

### Prerequisites

- Node.js (v18.0.0 or higher)
- npm (v8.0.0 or higher)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/video-meet-app.git
cd video-meet-app
```

2. Install dependencies
```bash
npm install
```

3. Start the server
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

### Creating a Meeting

1. Visit the homepage
2. Click "Start Meeting" or generate a unique code
3. Enter your name and join the meeting
4. Share the meeting link with participants

### Joining a Meeting

1. Receive a meeting link
2. Enter your name
3. Join the meeting with video and audio

### In-Meeting Controls

- Toggle video on/off
- Toggle audio on/off
- Share your screen
- Open chat panel
- Leave meeting

## Deployment

### Deploying to Vercel

1. Install Vercel CLI
```bash
npm install -g vercel
```

2. Login to Vercel
```bash
vercel login
```

3. Deploy the application
```bash
vercel
```

4. For production deployment
```bash
vercel --prod
```

## Project Structure

```
video-meet-app/
├── public/                  # Static frontend files
│   ├── css/                 # Stylesheets
│   │   ├── style.css        # Main stylesheet
│   │   └── landing.css      # Landing page styles
│   ├── js/                  # JavaScript files
│   │   ├── landing.js       # Landing page logic
│   │   ├── room.js          # Meeting room logic
│   │   └── webrtc.js        # WebRTC handling
│   ├── assets/              # Images, icons, etc.
│   ├── index.html           # Landing page
│   └── room.html            # Meeting room page
├── server/                  # Backend files
│   ├── server.js            # Main server file
│   ├── socket.js            # Socket.IO handling
│   └── utils/               # Utility functions
│       └── roomManager.js   # Room management logic
├── package.json             # Project dependencies
├── vercel.json              # Vercel deployment configuration
└── README.md                # Project documentation
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- WebRTC for enabling real-time communication
- Socket.IO for simplifying WebSocket implementation
- Bootstrap for responsive UI components
