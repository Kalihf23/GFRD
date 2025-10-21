// js/auth.js
document.addEventListener('DOMContentLoaded', function() {
    // Gestion de l'affichage conditionnel du champ Groupe
    document.getElementById('regTeam').addEventListener('change', function() {
        const groupField = document.getElementById('groupField');
        groupField.style.display = this.value === 'Plaintes Diverses' ? 'block' : 'none';
    });

    // Connexion
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const messageDiv = document.getElementById('loginMessage');

        try {
            messageDiv.innerHTML = '<div class="alert alert-info">Connexion en cours...</div>';
            
            const session = await account.createEmailSession(email, password);
            const user = await account.get();
            
            // Récupérer le rôle depuis les préférences
            const userRole = user.prefs?.role || 'agent';
            
            messageDiv.innerHTML = '<div class="alert alert-success">Connexion réussie! Redirection...</div>';
            
            // Redirection basée sur le rôle
            setTimeout(() => {
                switch(userRole) {
                    case 'agent': window.location.href = 'agent.html'; break;
                    case 'agentT': window.location.href = 'agentT.html'; break;
                    case 'agentC': window.location.href = 'agentC.html'; break;
                    case 'admin': window.location.href = 'admin.html'; break;
                    case 'adminP': window.location.href = 'adminP.html'; break;
                    default: window.location.href = 'agent.html';
                }
            }, 1000);

        } catch (error) {
            console.error('Erreur connexion:', error);
            messageDiv.innerHTML = `<div class="alert alert-danger">Erreur: ${error.message}</div>`;
        }
    });

    // Inscription
    document.getElementById('registerForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const lastName = document.getElementById('regLastName').value;
        const firstName = document.getElementById('regFirstName').value;
        const team = document.getElementById('regTeam').value;
        const group = document.getElementById('regGroup').value;
        const contact = document.getElementById('regContact').value;
        const neighborhood = document.getElementById('regNeighborhood').value;
        const messageDiv = document.getElementById('registerMessage');

        try {
            messageDiv.innerHTML = '<div class="alert alert-info">Création du compte...</div>';

            // Créer le compte Appwrite
            const user = await account.create(
                'unique()', 
                email, 
                password, 
                `${firstName} ${lastName}`
            );

            // Mettre à jour les préférences avec les infos supplémentaires
            await account.updatePrefs({
                role: 'agent',
                team: team,
                group: team === 'Plaintes Diverses' ? group : '',
                contact: contact,
                neighborhood: neighborhood,
                department: 'GSM',
                status: 'pending',
                createdAt: new Date().toISOString()
            });

            // Déconnexion automatique après inscription
            await account.deleteSession('current');

            messageDiv.innerHTML = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle me-2"></i>
                    Compte créé avec succès!<br>
                    <small>Votre compte est en attente d'activation par un administrateur.</small>
                </div>
            `;
            
            document.getElementById('registerForm').reset();

        } catch (error) {
            console.error('Erreur inscription:', error);
            messageDiv.innerHTML = `<div class="alert alert-danger">Erreur: ${error.message}</div>`;
        }
    });
});