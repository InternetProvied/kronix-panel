const express = require('express');
const session = require('express-session');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Stockage temporaire en mémoire des tickets (Simulé pour éviter les crashs BDD)
let tickets = [];

// Middlewares obligatoires
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuration de la session utilisateur
app.use(session({
    secret: 'pokedox_ultra_secret_key_9876',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Protection des pages privées
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect('/');
}

// --- ROUTES D'AUTHENTIFICATION ---
app.get('/', (req, res) => {
    if (req.session.user) return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    // Compte de test par défaut
    if (username.toLowerCase() === 'admin' && password === 'admin') {
        req.session.user = {
            username: 'Admin',
            role: 'Fondateur',
            avatar: 'https://discord.com/assets/1f0bfc0865d324c2587920a7d80c609b.png'
        };
        return res.redirect('/dashboard');
    }
    res.send('<script>alert("Identifiants invalides (Essaye admin / admin)"); window.location.href="/";</script>');
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

// --- ROUTES DE NAVIGATION SÉCURISÉES ---
app.get('/dashboard', isAuthenticated, (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/api-docs', isAuthenticated, (req, res) => res.sendFile(path.join(__dirname, 'public', 'api.html')));
app.get('/tickets', isAuthenticated, (req, res) => res.sendFile(path.join(__dirname, 'public', 'tickets.html')));

app.get('/api/user', (req, res) => {
    if (!req.session.user) return res.status(410).json({ error: 'Non connecté' });
    res.json(req.session.user);
});

// --- LOGIQUE RECHERCHE MULTI-LOOKUP ---
app.get('/api/lookup', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Accès non autorisé.' });
    
    const { query, type } = req.query;
    if (!query) return res.status(400).json({ error: 'Recherche vide.' });

    try {
        if (type === 'ip') {
            const response = await axios.get(`https://ip-api.com/json/${query}`);
            if (response.data.status === 'fail') return res.status(400).json({ error: 'IP invalide.' });
            return res.json({
                success: true, type: 'ip',
                results: { ip: response.data.query, country: response.data.country, city: response.data.city, isp: response.data.isp }
            });
        }
        
        if (type === 'discord_id') {
            const botToken = process.env.DISCORD_BOT_TOKEN;
            if (!botToken) return res.status(500).json({ error: 'Clé API Discord absente sur Render.' });
            try {
                const response = await axios.get(`https://discord.com/api/v10/users/${query}`, {
                    headers: { Authorization: `Bot ${botToken}` }
                });
                return res.json({
                    success: true, type: 'discord_id',
                    results: { id: response.data.id, username: response.data.username, globalName: response.data.global_name, avatar: `https://cdn.discordapp.com/avatars/${response.data.id}/${response.data.avatar}.png` }
                });
            } catch {
                return res.status(404).json({ error: 'ID Discord introuvable.' });
            }
        }

        // Simulation par défaut pour les autres types non connectés à des API officielles
        return res.json({ success: true, type: 'mock', message: `Analyse terminée pour : ${query}` });
    } catch (err) {
        res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
});

// --- ENGIN DE TICKETS ---
app.post('/api/tickets/create', isAuthenticated, (req, res) => {
    const { subject, message } = req.body;
    const newTicket = { id: Date.now(), user: req.session.user.username, subject, message, status: 'Ouvert' };
    tickets.push(newTicket);
    res.redirect('/tickets');
});

app.get('/api/tickets/list', isAuthenticated, (req, res) => res.json(tickets));

app.listen(PORT, () => console.log(`🚀 PokeDox Server opérationnel sur le port ${PORT}`));
