// js/adminP-dashboard.js
document.addEventListener('DOMContentLoaded', async function() {
    const user = await checkAuth();
    if (!user) return;

    // Vérifier le rôle AdminP
    const userRole = user.prefs?.role;
    if (userRole !== 'adminP') {
        alert('Accès réservé aux Administrateurs Principaux');
        window.location.href = 'index.html';
        return;
    }

    // Initialisation
    document.getElementById('userName').textContent = user.name;
    document.getElementById('welcomeMessage').textContent = `Admin Principal - ${user.name}`;

    await initializeAdminPDashboard();
    initializeUserManagement();
    initializeSettingsTab();

    // Gestion de la déconnexion
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('logoutBtn2').addEventListener('click', logout);

    async function logout() {
        try {
            await account.deleteSession('current');
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Erreur déconnexion:', error);
        }
    }

    async function initializeAdminPDashboard() {
        await loadDepartments();
        await loadTeams();
        initializeUserCreationModal();
    }

    async function loadDepartments() {
        try {
            // Récupérer les départements depuis les settings
            const response = await databases.listDocuments(
                DB_ID,
                COLLECTIONS.SETTINGS,
                ['key=departments']
            );

            const departmentsList = document.getElementById('departmentsList');
            let departments = ['GSM']; // Département par défaut

            if (response.documents.length > 0) {
                departments = response.documents[0].value || ['GSM'];
            }

            departmentsList.innerHTML = departments.map(dept => `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    ${dept}
                    ${dept === 'GSM' ? 
                        '<span class="badge bg-primary">Défaut</span>' : 
                        `<button class="btn btn-sm btn-outline-danger" onclick="removeDepartment('${dept}')">
                            <i class="fas fa-trash"></i>
                        </button>`
                    }
                </li>
            `).join('');

            // Mettre à jour le select des départements
            const departmentSelect = document.getElementById('newUserDepartment');
            departmentSelect.innerHTML = departments.map(dept => 
                `<option value="${dept}">${dept}</option>`
            ).join('');

        } catch (error) {
            console.error('Erreur chargement départements:', error);
        }
    }

    async function loadTeams() {
        try {
            // Récupérer les équipes depuis les settings
            const response = await databases.listDocuments(
                DB_ID,
                COLLECTIONS.SETTINGS,
                ['key=teams']
            );

            const teamsList = document.getElementById('teamsList');
            let teams = [
                { name: 'Plaintes Diverses', department: 'GSM', members: 0 },
                { name: 'Conservation', department: 'GSM', members: 0 },
                { name: 'Outbound', department: 'GSM', members: 0 },
                { name: 'Supervision', department: 'GSM', members: 0 }
            ];

            if (response.documents.length > 0) {
                teams = response.documents[0].value || teams;
            }

            // Compter les membres par équipe
            const usersResponse = await databases.listDocuments(
                DB_ID,
                COLLECTIONS.USERS,
                ['prefs.status=active']
            );

            teams.forEach(team => {
                team.members = usersResponse.documents.filter(
                    user => user.prefs?.team === team.name
                ).length;
            });

            teamsList.innerHTML = teams.map(team => `
                <tr>
                    <td>${team.name}</td>
                    <td>${team.department}</td>
                    <td>
                        <span class="badge bg-info">${team.members} membres</span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger" onclick="removeTeam('${team.name}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');

            // Mettre à jour le select des équipes
            const teamSelect = document.getElementById('newUserTeam');
            teamSelect.innerHTML = '<option value="">Choisir une équipe</option>' +
                teams.map(team => 
                    `<option value="${team.name}">${team.name} (${team.department})</option>`
                ).join('');

        } catch (error) {
            console.error('Erreur chargement équipes:', error);
        }
    }

    function initializeUserCreationModal() {
        document.getElementById('departmentForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            await addNewDepartment();
        });

        document.getElementById('teamForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            await addNewTeam();
        });
    }

    async function addNewDepartment() {
        const newDept = document.getElementById('newDepartment').value.trim();
        
        if (!newDept) {
            alert('Veuillez saisir un nom de département');
            return;
        }

        try {
            // Récupérer les départements existants
            const response = await databases.listDocuments(
                DB_ID,
                COLLECTIONS.SETTINGS,
                ['key=departments']
            );

            let departments = ['GSM'];
            if (response.documents.length > 0) {
                departments = response.documents[0].value;
            }

            // Vérifier si le département existe déjà
            if (departments.includes(newDept)) {
                alert('Ce département existe déjà');
                return;
            }

            // Ajouter le nouveau département
            departments.push(newDept);

            // Sauvegarder
            if (response.documents.length > 0) {
                await databases.updateDocument(
                    DB_ID,
                    COLLECTIONS.SETTINGS,
                    response.documents[0].$id,
                    { value: departments }
                );
            } else {
                await databases.createDocument(
                    DB_ID,
                    COLLECTIONS.SETTINGS,
                    'unique()',
                    {
                        key: 'departments',
                        value: departments
                    }
                );
            }

            document.getElementById('newDepartment').value = '';
            await loadDepartments();
            alert('Département ajouté avec succès!');

        } catch (error) {
            console.error('Erreur ajout département:', error);
            alert('Erreur lors de l\'ajout du département');
        }
    }

    async function addNewTeam() {
        const newTeam = document.getElementById('newTeam').value.trim();
        const department = document.getElementById('teamDepartment').value;

        if (!newTeam) {
            alert('Veuillez saisir un nom d\'équipe');
            return;
        }

        try {
            // Récupérer les équipes existantes
            const response = await databases.listDocuments(
                DB_ID,
                COLLECTIONS.SETTINGS,
                ['key=teams']
            );

            let teams = [
                { name: 'Plaintes Diverses', department: 'GSM', members: 0 },
                { name: 'Conservation', department: 'GSM', members: 0 },
                { name: 'Outbound', department: 'GSM', members: 0 },
                { name: 'Supervision', department: 'GSM', members: 0 }
            ];

            if (response.documents.length > 0) {
                teams = response.documents[0].value;
            }

            // Vérifier si l'équipe existe déjà
            if (teams.some(team => team.name === newTeam)) {
                alert('Cette équipe existe déjà');
                return;
            }

            // Ajouter la nouvelle équipe
            teams.push({
                name: newTeam,
                department: department,
                members: 0
            });

            // Sauvegarder
            if (response.documents.length > 0) {
                await databases.updateDocument(
                    DB_ID,
                    COLLECTIONS.SETTINGS,
                    response.documents[0].$id,
                    { value: teams }
                );
            } else {
                await databases.createDocument(
                    DB_ID,
                    COLLECTIONS.SETTINGS,
                    'unique()',
                    {
                        key: 'teams',
                        value: teams
                    }
                );
            }

            document.getElementById('newTeam').value = '';
            await loadTeams();
            alert('Équipe ajoutée avec succès!');

        } catch (error) {
            console.error('Erreur ajout équipe:', error);
            alert('Erreur lors de l\'ajout de l\'équipe');
        }
    }

    async function removeDepartment(department) {
        if (department === 'GSM') {
            alert('Impossible de supprimer le département par défaut GSM');
            return;
        }

        if (!confirm(`Êtes-vous sûr de vouloir supprimer le département "${department}" ?`)) {
            return;
        }

        try {
            // Implémentation de la suppression
            alert(`Département "${department}" supprimé (implémentation à compléter)`);
            await loadDepartments();
        } catch (error) {
            console.error('Erreur suppression département:', error);
        }
    }

    async function removeTeam(teamName) {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer l'équipe "${teamName}" ?`)) {
            return;
        }

        try {
            // Implémentation de la suppression
            alert(`Équipe "${teamName}" supprimée (implémentation à compléter)`);
            await loadTeams();
        } catch (error) {
            console.error('Erreur suppression équipe:', error);
        }
    }

    function initializeUserManagement() {
        // Implémentation étendue de la gestion utilisateur
    }

    function initializeSettingsTab() {
        // Implémentation des réglages avec options supplémentaires
    }
});

// Fonctions globales pour AdminP
async function createNewUser() {
    const lastName = document.getElementById('newUserLastName').value;
    const firstName = document.getElementById('newUserFirstName').value;
    const email = document.getElementById('newUserEmail').value;
    const role = document.getElementById('newUserRole').value;
    const department = document.getElementById('newUserDepartment').value;
    const team = document.getElementById('newUserTeam').value;
    const contact = document.getElementById('newUserContact').value;
    const neighborhood = document.getElementById('newUserNeighborhood').value;
    const sendInvitation = document.getElementById('sendInvitation').checked;
    const activateImmediately = document.getElementById('activateImmediately').checked;

    // Validation
    if (!lastName || !firstName || !email || !role || !department || !team || !contact || !neighborhood) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
    }

    try {
        // Générer un mot de passe temporaire
        const tempPassword = generateTempPassword();

        // Créer l'utilisateur dans Appwrite
        const newUser = await account.create(
            'unique()',
            email,
            tempPassword,
            `${firstName} ${lastName}`
        );

        // Mettre à jour les préférences
        await account.updatePrefs({
            role: role,
            team: team,
            department: department,
            contact: contact,
            neighborhood: neighborhood,
            status: activateImmediately ? 'active' : 'pending',
            createdBy: 'adminP',
            createdAt: new Date().toISOString()
        });

        // Envoyer l'email d'invitation si demandé
        if (sendInvitation) {
            await sendInvitationEmail(email, firstName, tempPassword);
        }

        // Fermer le modal
        bootstrap.Modal.getInstance(document.getElementById('createUserModal')).hide();
        
        alert(`Utilisateur ${firstName} ${lastName} créé avec succès!`);
        
        // Réinitialiser le formulaire
        document.getElementById('createUserForm').reset();

    } catch (error) {
        console.error('Erreur création utilisateur:', error);
        alert('Erreur lors de la création de l\'utilisateur: ' + error.message);
    }
}

function generateTempPassword() {
    return Math.random().toString(36).slice(-8) + 'A1!';
}

async function sendInvitationEmail(email, firstName, tempPassword) {
    // Implémentation de l'envoi d'email
    console.log(`Email d'invitation envoyé à ${email}`);
    console.log(`Mot de passe temporaire: ${tempPassword}`);
    
    // Dans une implémentation réelle, utiliser un service d'email
    alert(`Invitation envoyée à ${email}\nMot de passe temporaire: ${tempPassword}`);
}

function exportUsersList() {
    alert('Export de la liste des utilisateurs (implémentation à compléter)');
}