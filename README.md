# Application de Visioconférence Simple (Type Google Meet)

## Description du Projet

Cette application web est une démonstration de système de visioconférence peer-to-peer (P2P) simple, inspirée de Google Meet. Elle permet aux utilisateurs de créer des salles de réunion virtuelles uniques et d'y participer via leur navigateur web, en partageant leur audio et leur vidéo.

L'application est conçue pour être légère et facile à déployer, utilisant uniquement HTML, CSS, JavaScript pour le frontend, et Node.js avec Express et Socket.IO pour le backend. Aucune base de données n'est requise, la gestion des salles et des participants se fait en mémoire vive sur le serveur.

## Fonctionnement

1.  **Page d'accueil (`index.html`)** :
    *   Un utilisateur entre son nom.
    *   En cliquant sur "Créer une nouvelle réunion", un identifiant de salle unique (basé sur le timestamp) est généré.
    *   L'utilisateur est redirigé vers la page de réunion (`meet.html`) avec l'ID de la salle et son nom dans l'URL (ex: `/meet.html?room=1678886400000&user=Alice`).
    *   Les utilisateurs peuvent également rejoindre une réunion existante s'ils disposent du lien direct.

2.  **Page de Réunion (`meet.html`)** :
    *   L'utilisateur rejoint automatiquement la salle spécifiée dans l'URL.
    *   Son flux vidéo et audio local est capturé (après autorisation du navigateur).
    *   Le client se connecte au serveur via Socket.IO pour la signalisation.
    *   Le serveur informe les autres participants de l'arrivée du nouvel utilisateur.
    *   Des connexions WebRTC (RTCPeerConnection) sont établies entre le nouvel arrivant et chaque participant déjà présent (et vice-versa) pour l'échange direct des flux audio/vidéo.
    *   La signalisation (offres SDP, réponses SDP, candidats ICE) nécessaire à l'établissement des connexions WebRTC transite par le serveur Socket.IO.
    *   Une grille vidéo affiche les flux des participants (y compris le flux local). La disposition s'adapte au nombre de participants (jusqu'à 4 colonnes).
    *   Des contrôles permettent d'activer/désactiver le microphone et la caméra, et de quitter la réunion.
    *   Lorsqu'un utilisateur quitte, les connexions sont fermées et son flux vidéo disparaît pour les autres.

3.  **Backend (`server.js`)** :
    *   Utilise Express.js pour servir les fichiers statiques (HTML, CSS, JS).
    *   Utilise Socket.IO pour gérer les connexions WebSocket et la signalisation :
        *   Gestion des événements `join-room`, `disconnect`.
        *   Maintien en mémoire d'une liste des salles et des participants dans chaque salle (`rooms` object).
        *   Relais des messages de signalisation WebRTC (`offer`, `answer`, `candidate`) entre les clients concernés.

## Technologies Utilisées

*   **Frontend**:
    *   HTML5
    *   CSS3 (avec Flexbox et Grid Layout pour la responsivité)
    *   JavaScript (ES6+) : Manipulation du DOM, API WebRTC (`getUserMedia`, `RTCPeerConnection`), Client Socket.IO
*   **Backend**:
    *   Node.js
    *   Express.js : Framework web pour le routage et le service de fichiers statiques
    *   Socket.IO : Bibliothèque pour la communication WebSocket bidirectionnelle et en temps réel (utilisée pour la signalisation WebRTC)
*   **Protocoles**:
    *   WebRTC : Pour la communication audio/vidéo P2P en temps réel.
    *   WebSocket : Pour la signalisation via Socket.IO.
    *   STUN (Session Traversal Utilities for NAT) : Serveur public Google STUN utilisé pour aider à la découverte d'adresses IP publiques lors de la traversée NAT.

## Instructions de Lancement Local

1.  **Prérequis** :
    *   Node.js et npm (ou yarn) installés sur votre machine.
    *   Un navigateur web compatible WebRTC (Chrome, Firefox, Safari, Edge récents).

2.  **Cloner le dépôt ou télécharger l'archive ZIP** :
    *   Si vous avez l'archive, décompressez-la.
    *   Ouvrez un terminal dans le répertoire racine du projet (`video-conference-app`).

3.  **Installer les dépendances** :
    ```bash
    npm install
    ```

4.  **Démarrer le serveur** :
    ```bash
    node server.js
    ```
    Le serveur devrait démarrer et afficher : `Serveur démarré sur http://localhost:3000`

5.  **Accéder à l'application** :
    *   Ouvrez votre navigateur et allez à l'adresse `http://localhost:3000`.
    *   Entrez votre nom et cliquez sur "Créer une nouvelle réunion".
    *   Autorisez l'accès à votre caméra et microphone si le navigateur le demande.
    *   Pour tester avec plusieurs participants, ouvrez le lien de la réunion (copié depuis la barre d'adresse) dans un autre onglet ou un autre navigateur sur la même machine ou une autre machine sur le même réseau local.

## Instructions de Déploiement

Cette application Node.js peut être déployée sur diverses plateformes PaaS (Platform as a Service).

**Préparation** :
*   Assurez-vous que votre `package.json` contient bien le script `start`: `"start": "node server.js"`.
*   Le code utilise `process.env.PORT` pour écouter sur le port fourni par la plateforme, ce qui est standard.

**Options de Déploiement** :

1.  **Render** :
    *   Connectez votre compte GitHub/GitLab/Bitbucket à Render.
    *   Créez un nouveau "Web Service".
    *   Choisissez votre dépôt contenant le code de l'application.
    *   Configurez les paramètres :
        *   **Runtime** : Node
        *   **Build Command** : `npm install` (ou `yarn install`)
        *   **Start Command** : `node server.js` (ou `npm start`)
    *   Cliquez sur "Create Web Service". Render déploiera l'application et fournira une URL publique.

2.  **Railway** :
    *   Connectez votre compte GitHub à Railway.
    *   Créez un nouveau projet et choisissez "Deploy from GitHub repo".
    *   Sélectionnez votre dépôt.
    *   Railway détectera automatiquement qu'il s'agit d'une application Node.js et utilisera les scripts `build` (si défini) et `start` de `package.json`.
    *   Aucune configuration supplémentaire n'est généralement nécessaire pour les commandes de build et de démarrage si `package.json` est correct.
    *   Railway déploiera l'application et fournira une URL publique.

3.  **Vercel (avec Serverless Functions ou Backend Custom)** :
    *   Vercel est idéal pour le frontend, mais le backend Node.js avec WebSockets nécessite une configuration spécifique.
    *   **Option 1 (Plus complexe) :** Adapter le backend pour utiliser les Serverless Functions de Vercel pour la signalisation (peut être difficile avec la nature stateful de Socket.IO et les salles en mémoire).
    *   **Option 2 (Recommandée si Vercel est un impératif) :** Déployer le frontend sur Vercel et le backend Node.js séparément sur une autre plateforme (comme Render ou Railway) et configurer le client frontend pour se connecter à l'URL du backend déployé.
    *   **Option 3 (Moins courant pour ce type d'app) :** Utiliser la fonctionnalité "Community Runtimes" ou des configurations avancées si Vercel les supporte pour les serveurs Node.js stateful avec WebSockets (vérifier la documentation Vercel la plus récente).

**Important (WebRTC et Déploiement)** :
*   L'application utilise un serveur STUN public. Pour une meilleure fiabilité en production, notamment derrière des NAT/pare-feux complexes, l'ajout d'un serveur TURN (Traversal Using Relays around NAT) serait nécessaire. Les serveurs TURN relaient le trafic média lorsque la connexion P2P directe échoue. Des services comme Twilio ou des solutions open-source (coturn) peuvent fournir des serveurs TURN.
*   Assurez-vous que la plateforme de déploiement autorise les connexions WebSocket persistantes.

## Bonus

*   **Code Commenté** : Le code source (JavaScript et Node.js) inclut des commentaires pour expliquer les parties clés de la logique WebRTC et de la signalisation.
*   **Compatibilité Navigateurs** : L'application a été développée en visant une compatibilité avec les versions récentes de Google Chrome, Mozilla Firefox et Apple Safari, qui supportent bien WebRTC et les technologies web modernes utilisées. Des tests approfondis sur toutes les versions et plateformes sont recommandés pour une application en production.

