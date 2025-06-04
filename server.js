// server.js - Backend Node.js avec Express et Socket.IO

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Stockage en mémoire des salles et des utilisateurs
// rooms[roomId] = [{ id: socketId, name: username }, ...]
const rooms = {};

// Servir les fichiers statiques du dossier 'public'
app.use(express.static(path.join(__dirname, "public")));

// Route pour la page d'accueil (redirection implicite vers index.html par express.static)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Route pour la page de réunion
app.get("/meet.html", (req, res) => {
    // Vérifier si les paramètres room et user sont présents ? (Optionnel, géré côté client pour l'instant)
    res.sendFile(path.join(__dirname, "public", "meet.html"));
});

// Logique Socket.IO
io.on("connection", (socket) => {
    console.log(`Nouvelle connexion: ${socket.id}`);

    socket.on("join-room", (roomId, userId, username) => {
        console.log(`Utilisateur ${username} (${userId}) rejoint la salle ${roomId}`);
        socket.join(roomId);

        // Ajouter l'utilisateur à la liste de la salle
        if (!rooms[roomId]) {
            rooms[roomId] = [];
        }
        // Éviter les doublons si l'utilisateur se reconnecte rapidement
        if (!rooms[roomId].find(user => user.id === userId)) {
             rooms[roomId].push({ id: userId, name: username });
        }
       

        // Envoyer la liste des utilisateurs actuels au nouvel arrivant
        const usersInRoom = rooms[roomId].filter(user => user.id !== userId);
        socket.emit("all-users", usersInRoom);
        console.log(`Utilisateurs dans la salle ${roomId}:`, rooms[roomId]);

        // Informer les autres utilisateurs de l'arrivée du nouveau
        socket.to(roomId).emit("user-connected", userId, username);

        // Gérer la déconnexion
        socket.on("disconnect", () => {
            console.log(`Utilisateur déconnecté: ${userId} (${username}) de la salle ${roomId}`);
            // Retirer l'utilisateur de la salle
            if (rooms[roomId]) {
                rooms[roomId] = rooms[roomId].filter(user => user.id !== userId);
                // Informer les autres utilisateurs
                socket.to(roomId).emit("user-disconnected", userId);

                // Optionnel : supprimer la salle si elle est vide
                if (rooms[roomId].length === 0) {
                    delete rooms[roomId];
                    console.log(`Salle ${roomId} supprimée car vide.`);
                }
            }
            console.log(`Utilisateurs restants dans la salle ${roomId}:`, rooms[roomId]);
        });

        // Relayer les messages de signalisation WebRTC
        socket.on("offer", (offer, targetSocketId, senderSocketId) => {
            const sender = rooms[roomId]?.find(user => user.id === senderSocketId);
            console.log(`Relai offre de ${sender?.name} (${senderSocketId}) vers ${targetSocketId}`);
            // Envoyer l'offre uniquement au destinataire cible
            io.to(targetSocketId).emit("offer", offer, senderSocketId, sender?.name || 'Inconnu');
        });

        socket.on("answer", (answer, targetSocketId, senderSocketId) => {
             const sender = rooms[roomId]?.find(user => user.id === senderSocketId);
            console.log(`Relai réponse de ${sender?.name} (${senderSocketId}) vers ${targetSocketId}`);
            // Envoyer la réponse uniquement au destinataire cible
            io.to(targetSocketId).emit("answer", answer, senderSocketId);
        });

        socket.on("candidate", (candidate, targetSocketId, senderSocketId) => {
            // console.log(`Relai candidat ICE de ${senderSocketId} vers ${targetSocketId}`);
            // Envoyer le candidat uniquement au destinataire cible
            io.to(targetSocketId).emit("candidate", candidate, senderSocketId);
        });
    });
});

// Démarrer le serveur
server.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});

