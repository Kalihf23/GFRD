// js/appwrite-config.js
const client = new Appwrite.Client();
const account = new Appwrite.Account(client);
const databases = new Appwrite.Databases(client);

// Configuration Appwrite
client
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('YOUR_APPWRITE_PROJECT_ID'); // À remplacer

// IDs des collections Appwrite
const DB_ID = 'performance_gsm';
const COLLECTIONS = {
    USERS: 'users',
    PERFORMANCE: 'performance',
    FEEDBACKS: 'feedbacks',
    MESSAGES: 'messages',
    MAILS: 'mails',
    CASH_REGISTER: 'cash_register',
    EXPENSES: 'expenses',
    SETTINGS: 'settings'
};

// Vérifier si l'utilisateur est connecté
async function checkAuth() {
    try {
        const user = await account.get();
        return user;
    } catch (error) {
        window.location.href = 'index.html';
        return null;
    }
}

// Récupérer le rôle de l'utilisateur
async function getUserRole() {
    try {
        const user = await account.get();
        // Dans un cas réel, vous récupéreriez cela depuis les préférences utilisateur
        return user.prefs?.role || 'agent';
    } catch (error) {
        return null;
    }
}