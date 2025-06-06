// WebRTC utility functions
const WebRTCUtils = {
    // ICE servers configuration
    iceServers: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
        ]
    },

    // Get user media with specified constraints
    getUserMedia: async (videoConstraints = true, audioConstraints = true) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: videoConstraints,
                audio: audioConstraints
            });
            return {
                success: true,
                stream
            };
        } catch (error) {
            console.error('Error accessing media devices:', error);
            return {
                success: false,
                error
            };
        }
    },

    // Get display media for screen sharing
    getDisplayMedia: async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: 'always'
                },
                audio: false
            });
            return {
                success: true,
                stream
            };
        } catch (error) {
            console.error('Error accessing display media:', error);
            return {
                success: false,
                error
            };
        }
    },

    // Create a new RTCPeerConnection
    createPeerConnection: () => {
        try {
            return new RTCPeerConnection(WebRTCUtils.iceServers);
        } catch (error) {
            console.error('Error creating peer connection:', error);
            return null;
        }
    },

    // Add tracks from a stream to a peer connection
    addTracksToConnection: (peerConnection, stream) => {
        if (!peerConnection || !stream) return;
        
        stream.getTracks().forEach(track => {
            peerConnection.addTrack(track, stream);
        });
    },

    // Create an offer
    createOffer: async (peerConnection) => {
        try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            return {
                success: true,
                offer
            };
        } catch (error) {
            console.error('Error creating offer:', error);
            return {
                success: false,
                error
            };
        }
    },

    // Create an answer
    createAnswer: async (peerConnection) => {
        try {
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            return {
                success: true,
                answer
            };
        } catch (error) {
            console.error('Error creating answer:', error);
            return {
                success: false,
                error
            };
        }
    },

    // Set remote description
    setRemoteDescription: async (peerConnection, description) => {
        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(description));
            return {
                success: true
            };
        } catch (error) {
            console.error('Error setting remote description:', error);
            return {
                success: false,
                error
            };
        }
    },

    // Add ICE candidate
    addIceCandidate: async (peerConnection, candidate) => {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            return {
                success: true
            };
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
            return {
                success: false,
                error
            };
        }
    },

    // Replace tracks in a sender
    replaceTrack: async (sender, track) => {
        try {
            await sender.replaceTrack(track);
            return {
                success: true
            };
        } catch (error) {
            console.error('Error replacing track:', error);
            return {
                success: false,
                error
            };
        }
    },

    // Create a silent audio track
    createSilentAudioTrack: () => {
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const dst = oscillator.connect(ctx.createMediaStreamDestination());
        oscillator.start();
        ctx.resume();
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
    },

    // Create a black video track
    createBlackVideoTrack: ({ width = 640, height = 480 } = {}) => {
        const canvas = Object.assign(document.createElement('canvas'), { width, height });
        canvas.getContext('2d').fillRect(0, 0, width, height);
        const stream = canvas.captureStream();
        return Object.assign(stream.getVideoTracks()[0], { enabled: false });
    },

    // Create a black silent stream
    createBlackSilentStream: () => {
        return new MediaStream([
            WebRTCUtils.createBlackVideoTrack(),
            WebRTCUtils.createSilentAudioTrack()
        ]);
    }
};

// Export for use in other modules
window.WebRTCUtils = WebRTCUtils;
