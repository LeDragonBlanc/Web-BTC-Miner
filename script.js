document.getElementById('startMining').addEventListener('click', function() {
    const btcAddress = document.getElementById('btcAddress').value;
    if (!btcAddress) {
        alert('Veuillez entrer une adresse BTC valide.');
        return;
    }

    // Demander le consentement de l'utilisateur pour utiliser les ressources
    const consent = confirm('Le minage consommera des ressources importantes de votre ordinateur. Souhaitez-vous continuer?');
    
    if (!consent) {
        return;
    }

    startMining(btcAddress);
});

function startMining(btcAddress) {
    const output = document.getElementById('miningOutput');
    output.innerHTML = 'Démarrage du minage pour l\'adresse ' + btcAddress + '...';

    // Connexion au serveur Stratum de CKPool
    const socket = new WebSocket('stratum+tcp://ckpool.org:3333'); // WebSocket vers le serveur Stratum

    socket.onopen = function() {
        output.innerHTML += '<br>Connecté au pool de minage.';
        
        // Envoyer la demande de subscription et d'autorisation
        const subscribeMessage = JSON.stringify({
            id: 1,
            method: "mining.subscribe",
            params: ["JavascriptMiner/0.1"]
        });
        socket.send(subscribeMessage);

        const authorizeMessage = JSON.stringify({
            id: 2,
            method: "mining.authorize",
            params: [btcAddress, ""]
        });
        socket.send(authorizeMessage);
    };

    socket.onmessage = function(event) {
        const data = JSON.parse(event.data);

        if (data.id === 1 && data.result) {
            output.innerHTML += '<br>Subscription réussie.';
        }

        if (data.method === "mining.notify") {
            const job = data.params;

            output.innerHTML += '<br>Nouveau travail reçu. Job ID: ' + job[0];

            mineJob(socket, job);
        }
    };

    socket.onerror = function(error) {
        output.innerHTML += '<br>Erreur : ' + error.message;
    };

    socket.onclose = function() {
        output.innerHTML += '<br>Connexion au pool fermée.';
    };
}

function mineJob(socket, job) {
    const output = document.getElementById('miningOutput');

    const jobId = job[0];
    const prevHash = job[1];
    const coinbase1 = job[2];
    const coinbase2 = job[3];
    const merkleBranch = job[4];
    const version = job[5];
    const nBits = job[6];
    const nTime = job[7];
    const cleanJobs = job[8];

    let nonce;
    let hash;

    for (let i = 0; i < 1000000; i++) { // Boucle sur les nonces
        nonce = Math.floor(Math.random() * 0xFFFFFFFF); // Génération d'un nonce aléatoire

        const header = version + prevHash + merkleBranch.join('') + nTime + nBits + nonce.toString(16).padStart(8, '0');
        hash = CryptoJS.SHA256(CryptoJS.SHA256(header)).toString();

        if (parseInt(hash, 16) < parseInt(nBits, 16)) { // Simplification de la vérification
            output.innerHTML += `<br>Solution trouvée! Nonce: ${nonce}, Hash: ${hash}`;

            const submitMessage = JSON.stringify({
                id: 4,
                method: "mining.submit",
                params: [btcAddress, jobId, nonce.toString(16)]
            });

            socket.send(submitMessage);
            break;
        }
    }

    if (!hash || parseInt(hash, 16) >= parseInt(nBits, 16)) {
        output.innerHTML += `<br>Aucune solution trouvée pour ce travail.`;
    }
}
