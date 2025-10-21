// js/agent-dashboard.js
document.addEventListener('DOMContentLoaded', async function() {
    // Vérifier l'authentification
    const user = await checkAuth();
    if (!user) return;

    // Afficher les infos utilisateur
    document.getElementById('userName').textContent = user.name;
    document.getElementById('welcomeMessage').textContent = `Bienvenue, ${user.name}`;
    document.getElementById('userTeam').textContent = user.prefs?.team || 'GSM';

    // Initialiser les composants
    await initializeDashboard();
    initializePerformanceTab();
    initializeFeedbackTab();
    initializeMailTab();
    initializeMessageTab();

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

    async function initializeDashboard() {
        // Charger les données du mois
        await loadMonthlyStats();
        await loadWeeklyChart();
        await loadCasesChart();
        await loadTeamStats();
        
        // Mettre à jour la date
        const now = new Date();
        document.getElementById('currentMonth').textContent = 
            now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    }

    async function loadMonthlyStats() {
        try {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            const response = await databases.listDocuments(
                DB_ID,
                COLLECTIONS.PERFORMANCE,
                [
                    `userId=${user.$id}`,
                    `date>=${firstDay.toISOString()}`,
                    `date<=${lastDay.toISOString()}`
                ]
            );

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

            document.getElementById('monthResolved').textContent = totalResolved;
            document.getElementById('monthUnreachable').textContent = totalUnreachable;
            document.getElementById('monthUntreated').textContent = totalUntreated;
            document.getElementById('monthRate').textContent = `${resolutionRate}%`;

        } catch (error) {
            console.error('Erreur chargement stats:', error);
        }
    }

    async function loadWeeklyChart() {
        // Implémentation du graphique hebdomadaire
        const ctx = document.getElementById('weeklyChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mer', 'Jeu', 'Ven', 'Sam', 'Dim', 'Lun', 'Mar'],
                datasets: [{
                    label: 'Cas Résolus',
                    data: [12, 19, 15, 17, 14, 16, 18],
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    async function loadCasesChart() {
        // Implémentation du graphique de répartition
        const ctx = document.getElementById('casesChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Résolus', 'Injoignables', 'Non Traités'],
                datasets: [{
                    data: [65, 15, 20],
                    backgroundColor: ['#28a745', '#ffc107', '#dc3545']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    async function loadTeamStats() {
        // Charger les stats de l'équipe
        const teamStatsBody = document.getElementById('teamStatsBody');
        teamStatsBody.innerHTML = `
            <tr>
                <td>Jean Dupont</td>
                <td>45</td>
                <td>12</td>
                <td>8</td>
                <td><span class="badge bg-success">69%</span></td>
            </tr>
            <tr>
                <td>Marie Martin</td>
                <td>38</td>
                <td>15</td>
                <td>10</td>
                <td><span class="badge bg-warning">60%</span></td>
            </tr>
        `;
    }

    function initializePerformanceTab() {
        const form = document.getElementById('performanceForm');
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const performanceData = {
                date: document.getElementById('performanceDate').value,
                caseType: document.getElementById('caseType').value,
                resolved: parseInt(document.getElementById('resolvedCases').value),
                unreachable: parseInt(document.getElementById('unreachableCases').value),
                untreated: parseInt(document.getElementById('untreatedCases').value),
                userId: user.$id,
                team: user.prefs?.team
            };

            try {
                await databases.createDocument(
                    DB_ID,
                    COLLECTIONS.PERFORMANCE,
                    'unique()',
                    performanceData
                );

                alert('Performance enregistrée avec succès!');
                form.reset();
                await loadPerformanceHistory();
                
            } catch (error) {
                console.error('Erreur enregistrement:', error);
                alert('Erreur lors de l\'enregistrement');
            }
        });

        // Charger l'historique
        loadPerformanceHistory();
    }

    async function loadPerformanceHistory() {
        // Charger les 8 derniers jours de performances
        const historyBody = document.getElementById('performanceHistory');
        historyBody.innerHTML = `
            <tr>
                <td>01/10/2024</td>
                <td>Access</td>
                <td><span class="badge bg-success">75%</span></td>
            </tr>
            <tr>
                <td>30/09/2024</td>
                <td>Mail</td>
                <td><span class="badge bg-warning">60%</span></td>
            </tr>
        `;
    }

    function initializeFeedbackTab() {
        const form = document.getElementById('feedbackForm');
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const feedbackData = {
                userId: user.$id,
                nature: document.getElementById('feedbackNature').value,
                visibility: document.getElementById('feedbackVisibility').value,
                message: document.getElementById('feedbackMessage').value,
                date: new Date().toISOString(),
                status: 'Envoyé'
            };

            try {
                await databases.createDocument(
                    DB_ID,
                    COLLECTIONS.FEEDBACKS,
                    'unique()',
                    feedbackData
                );

                alert('Feedback envoyé avec succès!');
                form.reset();
                await loadFeedbackHistory();
                
            } catch (error) {
                console.error('Erreur envoi feedback:', error);
                alert('Erreur lors de l\'envoi du feedback');
            }
        });

        loadFeedbackHistory();
    }

    async function loadFeedbackHistory() {
        // Implémentation similaire pour l'historique des feedbacks
    }

    function initializeMailTab() {
        // Implémentation de la gestion des mails
    }

    function initializeMessageTab() {
        // Implémentation de la messagerie
    }
});