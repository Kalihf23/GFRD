// js/admin-dashboard.js
document.addEventListener('DOMContentLoaded', async function() {
    const user = await checkAuth();
    if (!user) return;

    // Vérifier le rôle
    const userRole = user.prefs?.role;
    if (!['admin', 'adminP'].includes(userRole)) {
        alert('Accès non autorisé');
        window.location.href = 'index.html';
        return;
    }

    // Initialisation
    document.getElementById('userName').textContent = user.name;
    document.getElementById('welcomeMessage').textContent = `Administration - ${user.name}`;

    await initializeAdminDashboard();
    initializePerformanceTab();
    initializeFeedbackTab();
    initializeMailTab();
    initializeMessageTab();
    initializeReportsTab();
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

    async function initializeAdminDashboard() {
        await loadGlobalStats();
        await loadGlobalEvolutionChart();
        await loadTeamPerformanceChart();
        await loadTeamsComparison();

        // Mettre à jour périodiquement les stats
        setInterval(loadGlobalStats, 30000); // Toutes les 30 secondes
    }

    async function loadGlobalStats() {
        try {
            // Compter les agents actifs
            const agentsResponse = await databases.listDocuments(
                DB_ID,
                COLLECTIONS.USERS,
                ['prefs.status=active']
            );
            document.getElementById('totalAgents').textContent = agentsResponse.total;

            // Calculer les stats de performance du mois
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const performanceResponse = await databases.listDocuments(
                DB_ID,
                COLLECTIONS.PERFORMANCE,
                [`date>=${firstDay.toISOString()}`]
            );

            let totalResolved = 0;
            let totalUnreachable = 0;
            let totalUntreated = 0;

            performanceResponse.documents.forEach(record => {
                totalResolved += parseInt(record.resolved) || 0;
                totalUnreachable += parseInt(record.unreachable) || 0;
                totalUntreated += parseInt(record.untreated) || 0;
            });

            const totalCases = totalResolved + totalUnreachable + totalUntreated;
            const resolutionRate = totalCases > 0 ? 
                Math.round((totalResolved / totalCases) * 100) : 0;

            document.getElementById('totalCasTraites').textContent = totalCases;
            document.getElementById('tauxResolution').textContent = `${resolutionRate}%`;

            // Compter les feedbacks non lus
            const feedbacksResponse = await databases.listDocuments(
                DB_ID,
                COLLECTIONS.FEEDBACKS,
                ['status=Envoyé']
            );
            document.getElementById('feedbacksNonLus').textContent = feedbacksResponse.total;
            document.getElementById('feedbackBadge').textContent = feedbacksResponse.total;

        } catch (error) {
            console.error('Erreur chargement stats globales:', error);
        }
    }

    async function loadGlobalEvolutionChart() {
        const ctx = document.getElementById('globalEvolutionChart').getContext('2d');
        
        // Données exemple pour la semaine (mercredi à mardi)
        const labels = ['Mer', 'Jeu', 'Ven', 'Sam', 'Dim', 'Lun', 'Mar'];
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Cas Résolus',
                        data: [120, 150, 130, 110, 90, 140, 160],
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Cas Injoignables',
                        data: [25, 30, 28, 22, 18, 26, 32],
                        borderColor: '#ffc107',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Cas Non Traités',
                        data: [15, 12, 18, 20, 25, 14, 10],
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Nombre de Cas'
                        }
                    }
                }
            }
        });
    }

    async function loadTeamPerformanceChart() {
        const ctx = document.getElementById('teamPerformanceChart').getContext('2d');
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Plaintes Diverses', 'Conservation', 'Outbound', 'Supervision'],
                datasets: [{
                    data: [35, 25, 20, 20],
                    backgroundColor: ['#007bff', '#28a745', '#ffc107', '#dc3545']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    async function loadTeamsComparison() {
        const tableBody = document.getElementById('teamsComparisonTable');
        
        // Données exemple
        const teamsData = [
            { name: 'Plaintes Diverses', agents: 8, resolved: 450, unreachable: 120, untreated: 80, rate: 69, trend: 'up' },
            { name: 'Conservation', agents: 6, resolved: 380, unreachable: 90, untreated: 60, rate: 72, trend: 'up' },
            { name: 'Outbound', agents: 5, resolved: 320, unreachable: 75, untreated: 45, rate: 73, trend: 'stable' },
            { name: 'Supervision', agents: 4, resolved: 280, unreachable: 60, untreated: 40, rate: 74, trend: 'down' }
        ];

        tableBody.innerHTML = teamsData.map(team => `
            <tr>
                <td><strong>${team.name}</strong></td>
                <td>${team.agents}</td>
                <td>${team.resolved}</td>
                <td>${team.unreachable}</td>
                <td>${team.untreated}</td>
                <td>
                    <span class="badge bg-${team.rate >= 70 ? 'success' : team.rate >= 60 ? 'warning' : 'danger'}">
                        ${team.rate}%
                    </span>
                </td>
                <td>
                    <i class="fas fa-arrow-${team.trend === 'up' ? 'up text-success' : team.trend === 'down' ? 'down text-danger' : 'right text-warning'}"></i>
                </td>
            </tr>
        `).join('');
    }

    function initializePerformanceTab() {
        // Remplir les filtres
        fillFilterOptions();
        
        // Appliquer les filtres par défaut (mois en cours)
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        document.getElementById('filterDateStart').valueAsDate = firstDay;
        document.getElementById('filterDateEnd').valueAsDate = lastDay;
        
        applyFilters();
    }

    async function fillFilterOptions() {
        try {
            // Remplir les équipes
            const teams = ['Plaintes Diverses', 'Conservation', 'Outbound', 'Supervision'];
            const teamSelect = document.getElementById('filterTeam');
            teamSelect.innerHTML = '<option value="all">Toutes les équipes</option>';
            teams.forEach(team => {
                teamSelect.innerHTML += `<option value="${team}">${team}</option>`;
            });

            // Remplir les agents
            const agentsResponse = await databases.listDocuments(
                DB_ID,
                COLLECTIONS.USERS,
                ['prefs.status=active']
            );
            const agentSelect = document.getElementById('filterAgent');
            agentSelect.innerHTML = '<option value="all">Tous les agents</option>';
            agentsResponse.documents.forEach(agent => {
                agentSelect.innerHTML += `<option value="${agent.$id}">${agent.prefs?.firstName} ${agent.prefs?.lastName}</option>`;
            });

            // Remplir les types de cas
            const caseTypes = ['Access', 'Mail', 'Feedback', 'Excel', 'Ipacs', 'Remboursement', 'Urgence'];
            const caseTypeSelect = document.getElementById('filterCaseType');
            caseTypeSelect.innerHTML = '<option value="all">Tous les types</option>';
            caseTypes.forEach(type => {
                caseTypeSelect.innerHTML += `<option value="${type}">${type}</option>`;
            });

        } catch (error) {
            console.error('Erreur remplissage filtres:', error);
        }
    }

    async function applyFilters() {
        try {
            const startDate = document.getElementById('filterDateStart').value;
            const endDate = document.getElementById('filterDateEnd').value;
            const selectedTeams = Array.from(document.getElementById('filterTeam').selectedOptions).map(opt => opt.value);
            const selectedAgents = Array.from(document.getElementById('filterAgent').selectedOptions).map(opt => opt.value);
            const selectedCaseTypes = Array.from(document.getElementById('filterCaseType').selectedOptions).map(opt => opt.value);

            // Construire les queries Appwrite
            const queries = [];
            
            if (startDate) queries.push(`date>=${new Date(startDate).toISOString()}`);
            if (endDate) queries.push(`date<=${new Date(endDate + 'T23:59:59').toISOString()}`);
            
            if (!selectedTeams.includes('all') && selectedTeams.length > 0) {
                queries.push(`team in [${selectedTeams.map(t => `"${t}"`).join(',')}]`);
            }
            
            if (!selectedAgents.includes('all') && selectedAgents.length > 0) {
                queries.push(`userId in [${selectedAgents.map(a => `"${a}"`).join(',')}]`);
            }
            
            if (!selectedCaseTypes.includes('all') && selectedCaseTypes.length > 0) {
                queries.push(`caseType in [${selectedCaseTypes.map(t => `"${t}"`).join(',')}]`);
            }

            const response = await databases.listDocuments(
                DB_ID,
                COLLECTIONS.PERFORMANCE,
                queries
            );

            // Calculer les statistiques filtrées
            let totalResolved = 0;
            let totalUnreachable = 0;
            let totalUntreated = 0;

            response.documents.forEach(record => {
                totalResolved += parseInt(record.resolved) || 0;
                totalUnreachable += parseInt(record.unreachable) || 0;
                totalUntreated += parseInt(record.untreated) || 0;
            });

            const totalCases = totalResolved + totalUnreachable + totalUntreated;
            const resolutionRate = totalCases > 0 ? 
                Math.round((totalResolved / totalCases) * 100) : 0;

            // Mettre à jour l'interface
            document.getElementById('filteredTotal').textContent = totalCases;
            document.getElementById('filteredResolved').textContent = totalResolved;
            document.getElementById('filteredUnreachable').textContent = totalUnreachable;
            document.getElementById('filteredUntreated').textContent = totalUntreated;
            document.getElementById('filteredRate').textContent = `${resolutionRate}%`;

            // Mettre à jour le tableau détail
            updatePerformanceDetailTable(response.documents);

            // Mettre à jour le graphique
            updatePerformanceChart(response.documents);

        } catch (error) {
            console.error('Erreur application filtres:', error);
        }
    }

    function updatePerformanceDetailTable(performances) {
        const tableBody = document.getElementById('performanceDetailTable');
        
        tableBody.innerHTML = performances.slice(0, 50).map(perf => {
            const totalCases = (perf.resolved || 0) + (perf.unreachable || 0) + (perf.untreated || 0);
            const rate = totalCases > 0 ? Math.round((perf.resolved / totalCases) * 100) : 0;
            
            return `
                <tr>
                    <td>${new Date(perf.date).toLocaleDateString('fr-FR')}</td>
                    <td>${perf.userName || 'N/A'}</td>
                    <td>${perf.caseType}</td>
                    <td>${perf.resolved || 0}</td>
                    <td>
                        <span class="badge bg-${rate >= 70 ? 'success' : rate >= 50 ? 'warning' : 'danger'}">
                            ${rate}%
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function updatePerformanceChart(performances) {
        const ctx = document.getElementById('performanceAnalysisChart').getContext('2d');
        
        // Grouper par date pour le graphique
        const dailyData = {};
        performances.forEach(perf => {
            const date = new Date(perf.date).toLocaleDateString('fr-FR');
            if (!dailyData[date]) {
                dailyData[date] = { resolved: 0, unreachable: 0, untreated: 0 };
            }
            dailyData[date].resolved += parseInt(perf.resolved) || 0;
            dailyData[date].unreachable += parseInt(perf.unreachable) || 0;
            dailyData[date].untreated += parseInt(perf.untreated) || 0;
        });

        const dates = Object.keys(dailyData).sort();
        const resolvedData = dates.map(date => dailyData[date].resolved);
        const unreachableData = dates.map(date => dailyData[date].unreachable);
        const untreatedData = dates.map(date => dailyData[date].untreated);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Résolus',
                        data: resolvedData,
                        backgroundColor: '#28a745'
                    },
                    {
                        label: 'Injoignables',
                        data: unreachableData,
                        backgroundColor: '#ffc107'
                    },
                    {
                        label: 'Non Traités',
                        data: untreatedData,
                        backgroundColor: '#dc3545'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function resetFilters() {
        document.getElementById('performanceFilters').reset();
        applyFilters();
    }

    function initializeFeedbackTab() {
        loadFeedbacks();
        
        // Définir la période par défaut (20 derniers jours)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 20);
        
        document.getElementById('feedbackDateStart').valueAsDate = startDate;
        document.getElementById('feedbackDateEnd').valueAsDate = endDate;
    }

    async function loadFeedbacks() {
        try {
            const startDate = document.getElementById('feedbackDateStart').value;
            const endDate = document.getElementById('feedbackDateEnd').value;

            const queries = [];
            if (startDate) queries.push(`date>=${new Date(startDate).toISOString()}`);
            if (endDate) queries.push(`date<=${new Date(endDate + 'T23:59:59').toISOString()}`);

            const response = await databases.listDocuments(
                DB_ID,
                COLLECTIONS.FEEDBACKS,
                queries,
                100, // limite
                0,   // offset
                'date',
                'DESC'
            );

            const feedbacksList = document.getElementById('feedbacksList');
            
            feedbacksList.innerHTML = response.documents.map(feedback => `
                <div class="card mb-3 ${feedback.status === 'Envoyé' ? 'border-warning' : ''}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <h6 class="mb-1">
                                    ${feedback.visibility === 'Privé' ? 'Feedback Anonyme' : 
                                      `${feedback.userName || 'Utilisateur'} - ${feedback.userTeam || ''}`}
                                </h6>
                                <small class="text-muted">
                                    ${new Date(feedback.date).toLocaleDateString('fr-FR')} - 
                                    ${feedback.nature}
                                </small>
                            </div>
                            <div>
                                <span class="badge bg-${getFeedbackStatusColor(feedback.status)}">
                                    ${feedback.status}
                                </span>
                                <span class="badge bg-${feedback.visibility === 'Public' ? 'primary' : 'secondary'}">
                                    ${feedback.visibility}
                                </span>
                            </div>
                        </div>
                        <p class="mb-2">${feedback.message}</p>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-primary" onclick="markFeedbackAs('${feedback.$id}', 'En cours')">
                                <i class="fas fa-play me-1"></i>En cours
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="markFeedbackAs('${feedback.$id}', 'Traité')">
                                <i class="fas fa-check me-1"></i>Traité
                            </button>
                            <button class="btn btn-sm btn-outline-info" onclick="replyToFeedback('${feedback.$id}')">
                                <i class="fas fa-reply me-1"></i>Répondre
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Erreur chargement feedbacks:', error);
        }
    }

    function getFeedbackStatusColor(status) {
        switch(status) {
            case 'Envoyé': return 'warning';
            case 'En cours': return 'info';
            case 'Traité': return 'success';
            default: return 'secondary';
        }
    }

    async function markFeedbackAs(feedbackId, status) {
        try {
            await databases.updateDocument(
                DB_ID,
                COLLECTIONS.FEEDBACKS,
                feedbackId,
                { status: status }
            );
            loadFeedbacks();
        } catch (error) {
            console.error('Erreur mise à jour feedback:', error);
        }
    }

    function filterFeedbacks() {
        loadFeedbacks();
    }

    // Initialisation des autres onglets
    function initializeMailTab() {
        // Implémentation similaire
    }

    function initializeMessageTab() {
        // Implémentation similaire
    }

    function initializeReportsTab() {
        // Implémentation des rapports
    }

    function initializeUserManagement() {
        // Implémentation de la gestion utilisateur
    }

    function initializeSettingsTab() {
        // Implémentation des réglages
    }
});

// Fonctions globales
function exportPerformanceData() {
    alert('Fonctionnalité d\'export à implémenter');
}

function generateReport() {
    const reportType = document.getElementById('reportType').value;
    const format = document.getElementById('reportFormat').value;
    
    if (!reportType) {
        alert('Veuillez sélectionner un type de rapport');
        return;
    }

    alert(`Génération du rapport ${reportType} en format ${format}...`);
    // Implémentation de la génération de rapport
}

function previewReport() {
    document.getElementById('reportPreview').style.display = 'block';
    document.getElementById('previewContent').innerHTML = `
        <div class="text-center py-4">
            <i class="fas fa-file-alt fa-3x text-muted mb-3"></i>
            <p>Aperçu du rapport en cours de génération...</p>
        </div>
    `;
}

async function createNewUser() {
    // Implémentation de la création d'utilisateur
}

function saveAppearanceSettings() {
    alert('Paramètres d\'apparence sauvegardés');
}

function scheduleMaintenance() {
    alert('Maintenance planifiée');
}

function archiveNow() {
    alert('Archivage en cours...');
}