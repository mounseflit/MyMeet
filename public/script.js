// script.js - Logique Frontend

// --- Détection de la page actuelle ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('join-form')) {
        // Nous sommes sur index.html
        handleIndexPage();
    } else if (document.getElementById('video-grid')) {
        // Nous sommes sur meet.html
        handleMeetPage();
    }
});

// --- Logique pour index.html ---
function handleIndexPage() {
    const joinForm = document.getElementById('join-form');
    const usernameInput = document.getElementById('username');
    const createMeetingBtn = document.getElementById('create-meeting-btn');

    joinForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Empêche la soumission standard du formulaire
        const username = usernameInput.value.trim();
        if (username) {
            // Générer un ID de salle unique (simple timestamp pour cet exemple)
            const roomId = Date.now().toString();
            // Rediriger vers la page de réunion
            window.location.href = `/meet.html?room=${roomId}&user=${encodeURIComponent(username)}`;
        } else {
            alert('Veuillez entrer votre nom.');
        }
    });
}

// --- Logique pour meet.html ---
function handleMeetPage() {
    const socket = io(); // Connexion au serveur Socket.IO
    const videoGrid = document.getElementById('video-grid');
    const toggleMicBtn = document.getElementById('toggle-mic-btn');
    const toggleCamBtn = document.getElementById('toggle-cam-btn');
    const leaveBtn = document.getElementById('leave-btn');

    let localStream;
    let roomId;
    let userId;
    let peers = {}; // Stocke les connexions RTCPeerConnection { socketId: RTCPeerConnection }
    let streams = {}; // Stocke les flux { socketId: MediaStream }
    let micEnabled = true;
    let camEnabled = true;

    // --- Récupération des paramètres URL ---
    const urlParams = new URLSearchParams(window.location.search);
    roomId = urlParams.get('room');
    userId = urlParams.get('user') || 'Utilisateur Anonyme';

    if (!roomId) {
        alert('ID de salle manquant.');
        window.location.href = '/'; // Rediriger si pas d'ID
        return;
    }

    // --- Gestion du flux local (Webcam/Micro) ---
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            localStream = stream;
            streams['local'] = stream; // Stocker le flux local
            addVideoStream('local', stream, userId, true); // Afficher le flux local

            // Informer le serveur qu'on a rejoint la salle
            socket.emit('join-room', roomId, socket.id, userId);

            // Initialiser les connexions avec les utilisateurs déjà présents
            socket.on('all-users', (users) => {
                console.log('Utilisateurs déjà présents:', users);
                users.forEach(user => {
                    if (user.id !== socket.id) {
                        createPeerConnection(user.id, user.name);
                        // Envoyer une offre à cet utilisateur
                        peers[user.id].createOffer()
                            .then(offer => {
                                return peers[user.id].setLocalDescription(offer);
                            })
                            .then(() => {
                                socket.emit('offer', offer, user.id, socket.id);
                                console.log(`Offre envoyée à ${user.name} (${user.id})`);
                            })
                            .catch(error => console.error('Erreur création offre:', error));
                    }
                });
            });

            // Gérer l'arrivée de nouveaux utilisateurs
            socket.on('user-connected', (socketId, username) => {
                console.log(`Nouvel utilisateur connecté: ${username} (${socketId})`);
                // Ne rien faire ici pour l'instant, l'offre sera initiée par le nouvel arrivant
                // createPeerConnection(socketId, username);
            });

            // Gérer la déconnexion d'utilisateurs
            socket.on('user-disconnected', socketId => {
                console.log(`Utilisateur déconnecté: ${socketId}`);
                if (peers[socketId]) {
                    peers[socketId].close();
                    delete peers[socketId];
                }
                if (streams[socketId]) {
                    const videoElement = document.getElementById(`video-${socketId}`);
                    if (videoElement) {
                        videoElement.parentElement.remove(); // Supprimer le conteneur vidéo
                    }
                    delete streams[socketId];
                }
            });

            // --- Gestion de la signalisation WebRTC via Socket.IO ---
            socket.on('offer', (offer, fromSocketId, fromUsername) => {
                console.log(`Offre reçue de ${fromUsername} (${fromSocketId})`);
                createPeerConnection(fromSocketId, fromUsername); // Créer la connexion si elle n'existe pas
                peers[fromSocketId].setRemoteDescription(new RTCSessionDescription(offer))
                    .then(() => {
                        return peers[fromSocketId].createAnswer();
                    })
                    .then(answer => {
                        return peers[fromSocketId].setLocalDescription(answer);
                    })
                    .then(() => {
                        socket.emit('answer', answer, fromSocketId, socket.id);
                        console.log(`Réponse envoyée à ${fromUsername} (${fromSocketId})`);
                    })
                    .catch(error => console.error('Erreur gestion offre:', error));
            });

            socket.on('answer', (answer, fromSocketId) => {
                console.log(`Réponse reçue de ${fromSocketId}`);
                if (peers[fromSocketId]) {
                    peers[fromSocketId].setRemoteDescription(new RTCSessionDescription(answer))
                        .catch(error => console.error('Erreur setRemoteDescription (réponse):', error));
                }
            });

            socket.on('candidate', (candidate, fromSocketId) => {
                console.log(`Candidat ICE reçu de ${fromSocketId}`);
                if (peers[fromSocketId]) {
                    peers[fromSocketId].addIceCandidate(new RTCIceCandidate(candidate))
                        .catch(error => console.error('Erreur ajout candidat ICE:', error));
                }
            });

        })
        .catch(error => {
            console.error('Erreur accès média:', error);
            alert('Impossible d\'accéder à la caméra ou au microphone. Vérifiez les autorisations.');
            // Peut-être rediriger ou afficher un message d'erreur plus permanent
        });

    // --- Création de la connexion PeerConnection ---
    function createPeerConnection(targetSocketId, targetUsername) {
        if (peers[targetSocketId]) {
            console.log(`Connexion Peer déjà existante pour ${targetUsername} (${targetSocketId})`);
            return; // Éviter de recréer une connexion existante
        }
        console.log(`Création connexion Peer pour ${targetUsername} (${targetSocketId})`);
        const peer = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }, // Serveur STUN public de Google
                // Ajoutez d'autres serveurs STUN/TURN si nécessaire
            ]
        });

        peers[targetSocketId] = peer;

        // Ajouter les pistes du flux local à la connexion
        localStream.getTracks().forEach(track => {
            peer.addTrack(track, localStream);
        });

        // Gérer la réception de flux distant
        peer.ontrack = event => {
            console.log(`Flux distant reçu de ${targetUsername} (${targetSocketId})`);
            streams[targetSocketId] = event.streams[0];
            addVideoStream(targetSocketId, event.streams[0], targetUsername);
        };

        // Gérer les candidats ICE
        peer.onicecandidate = event => {
            if (event.candidate) {
                socket.emit('candidate', event.candidate, targetSocketId, socket.id);
                // console.log(`Envoi candidat ICE à ${targetUsername} (${targetSocketId})`);
            }
        };

        // Gérer la fermeture de la connexion
        peer.oniceconnectionstatechange = () => {
            console.log(`État connexion ICE pour ${targetUsername} (${targetSocketId}): ${peer.iceConnectionState}`);
            if (peer.iceConnectionState === 'failed' || peer.iceConnectionState === 'disconnected' || peer.iceConnectionState === 'closed') {
                // Gérer la déconnexion ou l'échec
                console.warn(`Connexion Peer fermée ou échouée pour ${targetSocketId}`);
                // Nettoyer si nécessaire (déjà géré par user-disconnected?)
            }
        };

        return peer;
    }

    // --- Ajout d'un flux vidéo à la grille ---
    function addVideoStream(socketId, stream, username, isLocal = false) {
        // Vérifier si la vidéo existe déjà pour éviter les doublons
        if (document.getElementById(`video-${socketId}`)) {
            console.log(`Vidéo pour ${username} (${socketId}) existe déjà.`);
            return;
        }

        console.log(`Ajout flux vidéo pour ${username} (${socketId})`);
        const videoContainer = document.createElement('div');
        videoContainer.classList.add('video-container');
        videoContainer.id = `container-${socketId}`;

        const video = document.createElement('video');
        video.id = `video-${socketId}`;
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true; // Important pour iOS
        video.muted = isLocal; // Mettre en sourdine son propre flux local

        const nameTag = document.createElement('div');
        nameTag.classList.add('participant-name');
        nameTag.textContent = isLocal ? `${username} (Vous)` : username;

        videoContainer.appendChild(video);
        videoContainer.appendChild(nameTag);
        videoGrid.appendChild(videoContainer);

        adjustGridLayout(); // Ajuster la grille après ajout
    }

    // --- Ajustement de la disposition de la grille vidéo ---
    function adjustGridLayout() {
        const numParticipants = videoGrid.children.length;
        // Exemple simple : ajuster le nombre de colonnes
        // Vous pouvez rendre cela plus sophistiqué (ex: max 4 par page, pagination...)
        let cols = Math.ceil(Math.sqrt(numParticipants));
        if (numParticipants <= 2) cols = numParticipants;
        if (numParticipants === 3) cols = 3;
        if (numParticipants >= 4) cols = Math.ceil(numParticipants / Math.ceil(numParticipants/4)); // Essayer de garder ~4 par ligne
        
        // Limiter à 4 colonnes max pour l'affichage principal demandé
        cols = Math.min(cols, 4);

        videoGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        // Pour une grille plus complexe (max 4 visibles, puis pagination), il faudrait une logique différente
        // qui cache/affiche les éléments .video-container.
    }

    // --- Contrôles (Micro, Caméra, Quitter) ---
    toggleMicBtn.addEventListener('click', () => {
        micEnabled = !micEnabled;
        localStream.getAudioTracks().forEach(track => track.enabled = micEnabled);
        toggleMicBtn.innerHTML = micEnabled
            ? `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/></svg><span>Micro</span>` // Icone micro activé
            : `<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><g><rect fill="none" height="24" width="24"/></g><g><g><path d="M12,14c1.66,0,3-1.34,3-3V5c0-1.66-1.34-3-3-3S9,3.34,9,5v6C9,12.66,10.34,14,12,14z"/><path d="M17,11c0,2.76-2.24,5-5,5s-5-2.24-5-5H5c0,3.53,2.61,6.43,6,6.92V21h2v-3.08c3.39-0.49,6-3.39,6-6.92H17z"/></g></g></svg><span>Micro</span>`; // Icone micro coupé (à remplacer par le bon SVG)
        toggleMicBtn.style.backgroundColor = micEnabled ? '#4a4a4a' : '#d93025';
    });

    toggleCamBtn.addEventListener('click', () => {
        camEnabled = !camEnabled;
        localStream.getVideoTracks().forEach(track => track.enabled = camEnabled);
        toggleCamBtn.innerHTML = camEnabled
            ? `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0z" fill="none"/><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg><span>Caméra</span>` // Icone caméra activée
            : `<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><g><rect fill="none" height="24" width="24"/></g><g><g><path d="M18,10.48V6c0-1.1-0.9-2-2-2H6C4.9,4,4,4.9,4,6v12c0,1.1,0.9,2,2,2h10c1.1,0,2-0.9,2-2v-4.48l4,3.98V6.5L18,10.48z M16,18 H6V6h10V18z M10,10.5c0-0.83,0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5v3c0,0.83-0.67,1.5-1.5,1.5S10,14.33,10,13.5V10.5z"/></g></g></svg><span>Caméra</span>`; // Icone caméra coupée (à remplacer par le bon SVG)
        toggleCamBtn.style.backgroundColor = camEnabled ? '#4a4a4a' : '#d93025';
        // Masquer/afficher la vidéo locale si la caméra est coupée
        const localVideoContainer = document.getElementById('container-local');
        if (localVideoContainer) {
             localVideoContainer.style.display = camEnabled ? 'block' : 'none';
             // Pourrait afficher une icone ou un avatar à la place
        }
    });

    leaveBtn.addEventListener('click', () => {
        // Fermer toutes les connexions Peer
        for (const socketId in peers) {
            if (peers[socketId]) {
                peers[socketId].close();
            }
        }
        peers = {};

        // Arrêter le flux local
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }

        // Quitter la salle Socket.IO (le serveur gérera la déconnexion)
        socket.disconnect();

        // Rediriger vers la page d'accueil
        window.location.href = '/';
    });

    // Gérer le redimensionnement de la fenêtre pour ajuster la grille
    window.addEventListener('resize', adjustGridLayout);

    // Ajustement initial de la grille
    adjustGridLayout();
}

