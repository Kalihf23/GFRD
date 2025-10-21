// js/agentT-dashboard.js
document.addEventListener('DOMContentLoaded', async function() {
    const user = await checkAuth();
    if (!user) return;

    // Vérifier le rôle
    const userRole = user.prefs?.role;
    if (userRole !== 'agentT') {
        alert('Accès non autorisé');
        window.location.href = 'index.html';
        return;
    }

    // Initialisation
    document.getElementById('userName').textContent = user.name;
    document.getElementById('welcomeMessage').textContent = `Bienvenue, Superviseur ${user.name}`;
    document.getElementById('userTeam').textContent = user.prefs?.team || 'GSM';

    await initializeTasksTab();
    initializeCommonTabs();

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

    async function initializeTasksTab() {
        await loadTasksData();
        initializeCompletionChart();
        loadAlerts();

        // Filtre Outbound
        document.getElementById('outboundFilter').addEventListener('change', loadTasksData);
    }

    async function loadTasksData() {
        try {
            const excludeWeekends = document.getElementById('outboundFilter').checked;
            const lastThreeDays = getLastThreeWorkDays(excludeWeekends);
            
            // Mettre à jour les en-têtes de dates
            document.getElementById('day1Header').textContent = formatDate(lastThreeDays[0]);
            document.getElementById('day2Header').textContent = formatDate(lastThreeDays[1]);
            document.getElementById('day3Header').textContent = formatDate(lastThreeDays[2]);

            // Récupérer les agents de l'équipe
            const agentsResponse = await databases.listDocuments(
                DB_ID,
                COLLECTIONS.USERS,
                [
                    `prefs.team=${user.prefs?.team}`,
                    `prefs.status=active`
                ]
            );

            const tasksTableBody = document.getElementById('tasksTableBody');
            tasksTableBody.innerHTML = '';

            for (const agent of agentsResponse.documents) {
                const row = document.createElement('tr');
                
                // Colonne Agent
                row.innerHTML = `
                    <td>
                        <strong>${agent.prefs?.firstName} ${agent.prefs?.lastName}</strong>
                        <br><small class="text-muted">${agent.email}</small>
                    </td>
                    <td>${agent.prefs?.team}</td>
                `;

                // Colonnes pour les 3 derniers jours
                for (const day of lastThreeDays) {
                    const performance = await getAgentPerformance(agent.$id, day);
                    const statusBadge = getPerformanceStatusBadge(performance, day, agent.prefs?.team);
                    row.innerHTML += `<td>${statusBadge}</td>`;
                }

                // Statut global
                const globalStatus = await getGlobalStatus(agent.$id, lastThreeDays);
                row.innerHTML += `<td>${globalStatus}</td>`;

                tasksTableBody.appendChild(row);
            }

        } catch (error) {
            console.error('Erreur chargement tâches:', error);
        }
    }

    function getLastThreeWorkDays(excludeWeekends = true) {
        const days = [];
        let currentDate = new Date();
        let daysFound = 0;

        while (daysFound < 3) {
            currentDate.setDate(currentDate.getDate() - 1);
            
            if (excludeWeekends) {
                const dayOfWeek = currentDate.getDay();
                // Exclure samedi (6) et dimanche (0)
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    // Vérifier aussi les jours fériés (à implémenter)
                    days.push(new Date(currentDate));
                    daysFound++;
                }
            } else {
                days.push(new Date(currentDate));
                daysFound++;
            }
        }

        return days.reverse();
    }

    function formatDate(date) {
        return date.toLocaleDateString('fr-FR', { 
            weekday: 'short', 
            day: '2-digit', 
            month: '2-digit' 
        });
    }

    async function getAgentPerformance(agentId, date) {
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const response = await databases.listDocuments(
                DB_ID,
                COLLECTIONS.PERFORMANCE,
                [
                    `userId=${agentId}`,
                    `date>=${startOfDay.toISOString()}`,
                    `date<=${endOfDay.toISOString()}`
                ]
            );

            return response.documents.length > 0 ? response.documents[0] : null;
        } catch (error) {
            console.error('Erreur récupération performance:', error);
            return null;
        }
    }

    function getPerformanceStatusBadge(performance, date, team) {
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();
        const dayOfWeek = date.getDay();
        
        // Vérifier si c'est un jour non ouvré pour Outbound
        if (team === 'Outbound' && (dayOfWeek === 0 || dayOfWeek === 6)) {
            return `<span class="badge bg-secondary" title="Jour non ouvré">
                    <i class="fas fa-minus"></i> N/A
                </span>`;
        }

        if (!performance) {
            if (isToday) {
                return `<span class="badge bg-warning" title="En cours...">
                        <i class="fas fa-clock"></i> En attente
                    </span>`;
            } else {
                return `<span class="badge bg-danger" title="Performance non enregistrée">
                        <i class="fas fa-times"></i> Non validé
                    </span>`;
            }
        }

        // Vérifier si les objectifs sont atteints
        const totalCases = (performance.resolved || 0) + (performance.unreachable || 0) + (performance.untreated || 0);
        const isTargetMet = totalCases >= 10; // Exemple: objectif de 10 cas/jour

        if (isTargetMet) {
            return `<span class="badge bg-success" title="Objectif atteint">
                    <i class="fas fa-check"></i> Validé
                </span>`;
        } else {
            return `<span class="badge bg-warning" title="Objectif partiellement atteint">
                    <i class="fas fa-exclamation"></i> Partiel
                </span>`;
        }
    }

    async function getGlobalStatus(agentId, days) {
        let completedDays = 0;
        let totalWorkDays = 0;

        for (const day of days) {
            const performance = await getAgentPerformance(agentId, day);
            if (performance) {
                const totalCases = (performance.resolved || 0) + (performance.unreachable || 0) + (performance.untreated || 0);
                if (totalCases >= 10) { // Objectif de 10 cas/jour
                    completedDays++;
                }
            }
            totalWorkDays++;
        }

        const completionRate = totalWorkDays > 0 ? Math.round((completedDays / totalWorkDays) * 100) : 0;

        if (completionRate >= 80) {
            return `<span class="badge bg-success">Excellent (${completionRate}%)</span>`;
        } else if (completionRate >= 60) {
            return `<span class="badge bg-warning">Moyen (${completionRate}%)</span>`;
        } else {
            return `<span class="badge bg-danger">Insuffisant (${completionRate}%)</span>`;
        }
    }

    function initializeCompletionChart() {
        const ctx = document.getElementById('completionChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'],
                datasets: [{
                    label: 'Taux de Complétion (%)',
                    data: [85, 92, 78, 95, 88],
                    backgroundColor: '#28a745',
                    borderColor: '#1e7e34',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Pourcentage (%)'
                        }
                    }
                }
            }
        });
    }

    function loadAlerts() {
        const alertsList = document.getElementById('alertsList');
        alertsList.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Jean Dupont</strong> - 2 jours non validés
            </div>
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                <strong>Équipe Outbound</strong> - Weekend exclu du calcul
            </div>
        `;
    }

    function initializeCommonTabs() {
        // Initialiser les onglets communs (dashboard, performance, feedback, mail, message)
        // Utiliser le même code que dans agent-dashboard.js
    }
});