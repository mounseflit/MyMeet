// script.js - Logique Frontend (Refonte)

// --- Détection de la page actuelle ---
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("create-form")) {
        // Nous sommes sur index.html
        handleIndexPage();
    } else if (document.getElementById("lobby-container")) {
        // Nous sommes sur meet.html
        handleMeetPage();
    }
});

// --- Logique pour index.html ---
function handleIndexPage() {
    const createForm = document.getElementById("create-form");
    const usernameCreateInput = document.getElementById("username-create");
    const generateLinkBtn = document.getElementById("generate-link-btn");
    const linkDisplaySection = document.getElementById("link-display-section");
    const meetingLinkInput = document.getElementById("meeting-link");
    const copyLinkBtn = document.getElementById("copy-link-btn");
    const joinNowBtn = document.getElementById("join-now-btn");

    const joinFormLink = document.getElementById("join-form-link");
    const usernameJoinInput = document.getElementById("username-join");
    const joinLinkInput = document.getElementById("join-link-input");

    let generatedRoomId = null;
    let generatedUsername = null;

    // --- Création de réunion ---
    createForm.addEventListener("submit", (event) => {
        event.preventDefault();
        generatedUsername = usernameCreateInput.value.trim();
        if (!generatedUsername) {
            alert("Veuillez entrer votre nom.");
            return;
        }
        // Générer un ID de salle unique (UUID v4 serait mieux en production)
        generatedRoomId = `room-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const meetingUrl = `${window.location.origin}/meet.html?room=${generatedRoomId}`;
        
        meetingLinkInput.value = meetingUrl;
        linkDisplaySection.style.display = "block";
        console.log(`Lien généré: ${meetingUrl} pour ${generatedUsername}`);
    });

    // --- Copier le lien ---
    copyLinkBtn.addEventListener("click", () => {
        meetingLinkInput.select();
        meetingLinkInput.setSelectionRange(0, 99999); // Pour mobile
        try {
            document.execCommand("copy");
            alert("Lien copié dans le presse-papiers !");
        } catch (err) {
            console.error("Erreur lors de la copie du lien: ", err);
            alert("Impossible de copier le lien automatiquement. Veuillez le copier manuellement.");
        }
    });

    // --- Rejoindre maintenant (depuis la création) ---
    joinNowBtn.addEventListener("click", () => {
        if (generatedRoomId && generatedUsername) {
            window.location.href = `/meet.html?room=${generatedRoomId}&user=${encodeURIComponent(generatedUsername)}`;
        } else {
            alert("Erreur : ID de salle ou nom d'utilisateur manquant.");
        }
    });

    // --- Rejoindre avec un lien/code ---
    joinFormLink.addEventListener("submit", (event) => {
        event.preventDefault();
        const username = usernameJoinInput.value.trim();
        const linkOrCode = joinLinkInput.value.trim();

        if (!username) {
            alert("Veuillez entrer votre nom.");
            return;
        }
        if (!linkOrCode) {
            alert("Veuillez entrer le lien ou le code de la réunion.");
            return;
        }

        let roomId = null;
        try {
            // Essayer d'extraire roomId de l'URL
            const url = new URL(linkOrCode);
            roomId = url.searchParams.get("room");
        } catch (e) {
            // Si ce n'est pas une URL valide, supposer que c'est un code direct
            roomId = linkOrCode;
        }

        if (roomId) {
            window.location.href = `/meet.html?room=${roomId}&user=${encodeURIComponent(username)}`;
        } else {
            alert("Lien ou code de réunion invalide.");
        }
    });
}

// --- Logique pour meet.html ---
function handleMeetPage() {
    const lobbyContainer = document.getElementById("lobby-container");
    const meetingRoomContainer = document.getElementById("meeting-room-container");
    const lobbyVideoPreview = document.getElementById("lobby-video-preview");
    const lobbyToggleMicBtn = document.getElementById("lobby-toggle-mic-btn");
    const lobbyToggleCamBtn = document.getElementById("lobby-toggle-cam-btn");
    const usernameLobbyInput = document.getElementById("username-lobby");
    const joinMeetingBtn = document.getElementById("join-meeting-btn");

    const videoGrid = document.getElementById("video-grid");
    const toggleMicBtn = document.getElementById("toggle-mic-btn");
    const toggleCamBtn = document.getElementById("toggle-cam-btn");
    const leaveBtn = document.getElementById("leave-btn");

    let localStream = null;
    let lobbyStream = null; // Stream séparé pour le lobby pour éviter les conflits
    let micEnabled = true;
    let camEnabled = true;
    let roomId = null;
    let username = null;
    let socket = null;
    let peers = {}; // { socketId: RTCPeerConnection }
    let streams = {}; // { socketId: MediaStream }

    // --- Initialisation du Lobby ---
    const urlParams = new URLSearchParams(window.location.search);
    roomId = urlParams.get("room");
    username = urlParams.get("user") || ""; // Récupérer le nom d'utilisateur, peut être vide

    if (!roomId) {
        alert("ID de salle manquant.");
        window.location.href = "/";
        return;
    }

    usernameLobbyInput.value = username; // Pré-remplir si fourni

    // Demander l'accès média pour le lobby
    async function startLobbyPreview() {
        try {
            lobbyStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            lobbyVideoPreview.srcObject = lobbyStream;
            // Initialiser l'état des boutons du lobby
            updateLobbyButtonStates();
        } catch (error) {
            console.error("Erreur accès média pour le lobby:", error);
            alert("Impossible d'accéder à la caméra ou au microphone. Vérifiez les autorisations et rechargez la page.");
            // Désactiver les boutons si l'accès échoue
            lobbyToggleMicBtn.disabled = true;
            lobbyToggleCamBtn.disabled = true;
            joinMeetingBtn.disabled = true;
        }
    }

    // Mettre à jour l'état visuel des boutons du lobby et activer/désactiver les pistes
    function updateLobbyButtonStates() {
        if (!lobbyStream) return;

        // Micro
        lobbyStream.getAudioTracks().forEach(track => track.enabled = micEnabled);
        lobbyToggleMicBtn.innerHTML = micEnabled ? getMicOnIcon() : getMicOffIcon();
        lobbyToggleMicBtn.style.backgroundColor = micEnabled ? "#4a4a4a" : "#d93025";

        // Caméra
        lobbyStream.getVideoTracks().forEach(track => track.enabled = camEnabled);
        lobbyToggleCamBtn.innerHTML = camEnabled ? getCamOnIcon() : getCamOffIcon();
        lobbyToggleCamBtn.style.backgroundColor = camEnabled ? "#4a4a4a" : "#d93025";
        lobbyVideoPreview.style.visibility = camEnabled ? "visible" : "hidden";
        // Ajouter une icône si la caméra est coupée ?
        if (!camEnabled && !lobbyVideoPreview.nextElementSibling?.classList.contains('placeholder-icon')) {
            const placeholder = document.createElement('div');
            placeholder.classList.add('placeholder-icon');
            placeholder.innerHTML = getPersonIcon(); // Utiliser une fonction pour l'icône personne
            lobbyVideoPreview.parentNode.insertBefore(placeholder, lobbyVideoPreview.nextSibling);
        } else if (camEnabled) {
             const placeholder = lobbyVideoPreview.parentNode.querySelector('.placeholder-icon');
             if(placeholder) placeholder.remove();
        }
    }

    lobbyToggleMicBtn.addEventListener("click", () => {
        micEnabled = !micEnabled;
        updateLobbyButtonStates();
    });

    lobbyToggleCamBtn.addEventListener("click", () => {
        camEnabled = !camEnabled;
        updateLobbyButtonStates();
    });

    // --- Rejoindre la réunion depuis le Lobby ---
    joinMeetingBtn.addEventListener("click", () => {
        username = usernameLobbyInput.value.trim();
        if (!username) {
            alert("Veuillez entrer votre nom.");
            return;
        }
        if (!lobbyStream) {
             alert("Impossible de rejoindre sans accès caméra/micro.");
             return;
        }

        // Cacher le lobby, afficher la salle
        lobbyContainer.style.display = "none";
        meetingRoomContainer.style.display = "flex"; // Utiliser flex pour la mise en page

        // Utiliser le stream du lobby comme stream local principal
        localStream = lobbyStream;
        streams["local"] = localStream;

        // Initialiser les contrôles de la salle avec l'état du lobby
        updateMeetingControlStates();

        // Initialiser la connexion Socket.IO et la logique WebRTC
        initializeMeeting();
    });

    // --- Initialisation de la Réunion (après avoir cliqué sur "Rejoindre") ---
    function initializeMeeting() {
        socket = io();

        // Afficher le flux local immédiatement
        addVideoStream("local", localStream, username, true);

        // Joindre la salle
        socket.emit("join-room", roomId, socket.id, username);
        console.log(`Tentative de rejoindre la salle ${roomId} en tant que ${username} (${socket.id})`);

        // --- Logique WebRTC et Socket.IO (sera refactorisée en étape 004) ---
        setupSocketListeners();
        setupWebRTCHandlers();

        // Configurer les boutons de contrôle de la salle
        setupMeetingControls();
    }

    // --- Gestionnaires d'événements Socket.IO --- (Structure de base)
    function setupSocketListeners() {
        socket.on("all-users", (users) => {
            console.log("Utilisateurs déjà présents:", users);
            users.forEach(user => {
                if (user.id !== socket.id) {
                    // Logique d'initiation de connexion Peer (sera refactorisée)
                    initiatePeerConnection(user.id, user.name);
                }
            });
        });

        socket.on("user-connected", (socketId, username) => {
            console.log(`Nouvel utilisateur connecté: ${username} (${socketId})`);
            // Le nouvel arrivant initiera la connexion
        });

        socket.on("user-disconnected", socketId => {
            console.log(`Utilisateur déconnecté: ${socketId}`);
            handlePeerDisconnect(socketId);
        });

        socket.on("offer", (offer, fromSocketId, fromUsername) => {
            console.log(`Offre reçue de ${fromUsername} (${fromSocketId})`);
            handleOffer(offer, fromSocketId, fromUsername);
        });

        socket.on("answer", (answer, fromSocketId) => {
            console.log(`Réponse reçue de ${fromSocketId}`);
            handleAnswer(answer, fromSocketId);
        });

        socket.on("candidate", (candidate, fromSocketId) => {
            // console.log(`Candidat ICE reçu de ${fromSocketId}`);
            handleCandidate(candidate, fromSocketId);
        });
        
        socket.on("connect_error", (err) => {
            console.error("Erreur de connexion Socket.IO:", err);
            alert("Impossible de se connecter au serveur de signalisation. Veuillez vérifier votre connexion et réessayer.");
            // Peut-être rediriger vers l'accueil ou afficher un message persistant
            leaveMeeting(); // Quitter proprement si la connexion échoue
        });
    }

    // --- Fonctions WebRTC (Placeholders/Structure de base) ---
    function setupWebRTCHandlers() {
        // Sera rempli dans l'étape 004
    }

    function initiatePeerConnection(targetSocketId, targetUsername) {
        console.log(`Initiation de la connexion Peer avec ${targetUsername} (${targetSocketId})`);
        // Logique de création RTCPeerConnection, ajout de pistes, création d'offre (étape 004)
        createPeerConnection(targetSocketId, targetUsername, true); // true = isInitiator
    }

    function handleOffer(offer, fromSocketId, fromUsername) {
        // Logique de création RTCPeerConnection, setRemoteDescription, création de réponse (étape 004)
         createPeerConnection(fromSocketId, fromUsername, false); // false = not initiator
         if (peers[fromSocketId]) {
             peers[fromSocketId].setRemoteDescription(new RTCSessionDescription(offer))
                .then(() => peers[fromSocketId].createAnswer())
                .then(answer => peers[fromSocketId].setLocalDescription(answer))
                .then(() => {
                    socket.emit("answer", peers[fromSocketId].localDescription, fromSocketId, socket.id);
                    console.log(`Réponse envoyée à ${fromUsername} (${fromSocketId})`);
                })
                .catch(error => console.error("Erreur gestion offre:", error));
         }
    }

    function handleAnswer(answer, fromSocketId) {
        // Logique setRemoteDescription (étape 004)
        if (peers[fromSocketId]) {
            peers[fromSocketId].setRemoteDescription(new RTCSessionDescription(answer))
                .catch(error => console.error("Erreur setRemoteDescription (réponse):", error));
        }
    }

    function handleCandidate(candidate, fromSocketId) {
        // Logique addIceCandidate (étape 004)
         if (peers[fromSocketId]) {
            peers[fromSocketId].addIceCandidate(new RTCIceCandidate(candidate))
                .catch(error => console.error("Erreur ajout candidat ICE:", error));
        }
    }

    function handlePeerDisconnect(socketId) {
        // Logique de fermeture de connexion et suppression de la vidéo (étape 004)
        if (peers[socketId]) {
            peers[socketId].close();
            delete peers[socketId];
        }
        if (streams[socketId]) {
            const videoContainer = document.getElementById(`container-${socketId}`);
            if (videoContainer) {
                videoContainer.remove();
            }
            delete streams[socketId];
            adjustGridLayout();
        }
    }
    
    function createPeerConnection(targetSocketId, targetUsername, isInitiator) {
        if (peers[targetSocketId]) {
            console.warn(`Connexion Peer déjà existante pour ${targetUsername} (${targetSocketId})`);
            return peers[targetSocketId];
        }
        console.log(`Création connexion Peer pour ${targetUsername} (${targetSocketId}), Initiateur: ${isInitiator}`);
        try {
            const peer = new RTCPeerConnection({
                iceServers: [
                    { urls: "stun:stun.l.google.com:19302" },
                    // Ajouter un serveur TURN ici pour la production
                ]
            });
            peers[targetSocketId] = peer;

            // Ajouter les pistes locales
            localStream.getTracks().forEach(track => {
                try {
                     peer.addTrack(track, localStream);
                } catch (e) {
                    console.error(`Erreur ajout piste ${track.kind} pour ${targetSocketId}:`, e);
                }
            });

            // Gérer la réception de pistes distantes
            peer.ontrack = event => {
                console.log(`Piste ${event.track.kind} reçue de ${targetUsername} (${targetSocketId})`);
                if (!streams[targetSocketId]) {
                    streams[targetSocketId] = new MediaStream();
                    addVideoStream(targetSocketId, streams[targetSocketId], targetUsername);
                }
                streams[targetSocketId].addTrack(event.track);
            };

            // Gérer les candidats ICE
            peer.onicecandidate = event => {
                if (event.candidate) {
                    socket.emit("candidate", event.candidate, targetSocketId, socket.id);
                }
            };

            // Gérer l'état de la connexion
            peer.oniceconnectionstatechange = () => {
                console.log(`État connexion ICE pour ${targetUsername} (${targetSocketId}): ${peer.iceConnectionState}`);
                if (["failed", "disconnected", "closed"].includes(peer.iceConnectionState)) {
                    console.warn(`Connexion Peer fermée ou échouée pour ${targetSocketId}`);
                    // Nettoyer la connexion (peut être redondant avec user-disconnected)
                    // handlePeerDisconnect(targetSocketId);
                }
            };
            
            // Si initiateur, créer l'offre
            if (isInitiator) {
                peer.createOffer()
                    .then(offer => peer.setLocalDescription(offer))
                    .then(() => {
                        socket.emit("offer", peer.localDescription, targetSocketId, socket.id);
                         console.log(`Offre envoyée à ${targetUsername} (${targetSocketId})`);
                    })
                    .catch(error => console.error("Erreur création offre:", error));
            }

            return peer;
        } catch (error) {
            console.error(`Erreur création PeerConnection pour ${targetSocketId}:`, error);
            return null;
        }
    }

    // --- Contrôles de la Réunion --- (Structure de base)
    function setupMeetingControls() {
        toggleMicBtn.addEventListener("click", () => {
            micEnabled = !micEnabled;
            localStream.getAudioTracks().forEach(track => track.enabled = micEnabled);
            updateMeetingControlStates();
        });

        toggleCamBtn.addEventListener("click", () => {
            camEnabled = !camEnabled;
            localStream.getVideoTracks().forEach(track => track.enabled = camEnabled);
            updateMeetingControlStates();
            // Gérer l'affichage/masquage de la vidéo locale et placeholder
            const localVideoContainer = document.getElementById("container-local");
            if (localVideoContainer) {
                const videoElement = localVideoContainer.querySelector('video');
                const placeholder = localVideoContainer.querySelector('.placeholder-icon');
                if (camEnabled) {
                    videoElement.style.display = 'block';
                    if (placeholder) placeholder.remove();
                } else {
                    videoElement.style.display = 'none';
                    if (!placeholder) {
                        const newPlaceholder = document.createElement('div');
                        newPlaceholder.classList.add('placeholder-icon');
                        newPlaceholder.innerHTML = getPersonIcon();
                        // Insérer après la vidéo (ou à la place si elle est retirée du DOM)
                        videoElement.parentNode.insertBefore(newPlaceholder, videoElement.nextSibling);
                    }
                }
            }
            // Informer les autres de l'état de la caméra ? (Optionnel, via socket)
        });

        leaveBtn.addEventListener("click", leaveMeeting);
    }

    // Mettre à jour l'état visuel des boutons de contrôle principaux
    function updateMeetingControlStates() {
        // Micro
        toggleMicBtn.innerHTML = micEnabled ? getMicOnIcon() : getMicOffIcon();
        toggleMicBtn.style.backgroundColor = micEnabled ? "#4a4a4a" : "#d93025";

        // Caméra
        toggleCamBtn.innerHTML = camEnabled ? getCamOnIcon() : getCamOffIcon();
        toggleCamBtn.style.backgroundColor = camEnabled ? "#4a4a4a" : "#d93025";
    }

    // --- Fonction pour quitter la réunion ---
    function leaveMeeting() {
        console.log("Quitter la réunion");
        // Fermer les connexions Peer
        for (const socketId in peers) {
            if (peers[socketId]) {
                peers[socketId].close();
            }
        }
        peers = {};
        streams = {};

        // Arrêter le flux local
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
        // Arrêter aussi le stream du lobby s'il est différent et toujours actif
        if (lobbyStream && lobbyStream !== localStream) {
             lobbyStream.getTracks().forEach(track => track.stop());
             lobbyStream = null;
        }

        // Déconnexion Socket.IO
        if (socket) {
            socket.disconnect();
            socket = null;
        }

        // Rediriger vers l'accueil
        window.location.href = "/";
    }

    // --- Ajout/Gestion des vidéos dans la grille ---
    function addVideoStream(socketId, stream, participantUsername, isLocal = false) {
        if (document.getElementById(`container-${socketId}`)) {
            console.warn(`Le conteneur vidéo pour ${participantUsername} (${socketId}) existe déjà.`);
            // Mettre à jour le stream si nécessaire ?
            const videoElement = document.getElementById(`video-${socketId}`);
            if (videoElement && videoElement.srcObject !== stream) {
                 console.log(`Mise à jour du flux pour ${participantUsername} (${socketId})`);
                 videoElement.srcObject = stream;
            }
            return;
        }
        console.log(`Ajout flux vidéo pour ${participantUsername} (${socketId}), Local: ${isLocal}`);

        const videoContainer = document.createElement("div");
        videoContainer.classList.add("video-container");
        videoContainer.id = `container-${socketId}`;

        const video = document.createElement("video");
        video.id = `video-${socketId}`;
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = isLocal; // Mettre en sourdine son propre flux

        const nameTag = document.createElement("div");
        nameTag.classList.add("participant-name");
        nameTag.textContent = isLocal ? `${participantUsername} (Vous)` : participantUsername;

        videoContainer.appendChild(video);
        videoContainer.appendChild(nameTag);
        
        // Placeholder initial si la caméra est désactivée (pour les pairs distants, on ne sait pas encore)
        // Pour le local, on utilise l'état `camEnabled` actuel
        if (isLocal && !camEnabled) {
             video.style.display = 'none';
             const placeholder = document.createElement('div');
             placeholder.classList.add('placeholder-icon');
             placeholder.innerHTML = getPersonIcon();
             videoContainer.appendChild(placeholder);
        }

        videoGrid.appendChild(videoContainer);
        adjustGridLayout();
    }

    // --- Ajustement de la grille vidéo ---
    function adjustGridLayout() {
        const numParticipants = videoGrid.children.length;
        let cols = Math.ceil(Math.sqrt(numParticipants));
        cols = Math.min(cols, 4); // Max 4 colonnes comme demandé initialement
        cols = Math.max(cols, 1); // Au moins 1 colonne
        videoGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        // Pourrait être amélioré pour gérer les grands nombres (pagination, etc.)
    }

    // --- Fonctions utilitaires pour les icônes SVG ---
    function getMicOnIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/></svg>`;
    }
    function getMicOffIcon() {
        // Icône SVG pour micro coupé (exemple, à remplacer par une meilleure icône si possible)
        return `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0z" fill="none"/><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zm-6.78-1.98L5 6.01V11c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.55-.9l1.2 1.2c-.91.57-1.94.97-3.05 1.18V21H11v-1.07c-3.92-.44-7-3.72-7-7.65H4V9.19l1.2-1.2z"/></svg>`;
    }
    function getCamOnIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0z" fill="none"/><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>`;
    }
    function getCamOffIcon() {
        // Icône SVG pour caméra coupée (exemple)
        return `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0z" fill="none"/><path d="M18 10.48V6c0-1.1-.9-2-2-2H6.83l2 2H16v7.17l2 2V18c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V6c0-.3.08-.58.21-.83l-1.42-1.42L4.21 2 19.5 17.29l1.41-1.41L18 10.48zM4 6.83V18h11.17l-2-2H6v-9.17z"/></svg>`;
    }
     function getPersonIcon() {
        // Icône SVG simple pour représenter un utilisateur sans vidéo
        return `<svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 0 24 24" width="48px" fill="#CCCCCC"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
    }

    // Démarrer le lobby
    startLobbyPreview();

    // Gérer le redimensionnement
    window.addEventListener("resize", adjustGridLayout);
}

