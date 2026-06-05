const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'pokedox_ultimate_super_secret_key_2026',
    resave: false,
    saveUninitialized: false
}));

// --- ROUTES DE NAVIGATION (Le squelette du site) ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/api', (req, res) => res.sendFile(path.join(__dirname, 'public', 'api.html')));
app.get('/tickets', (req, res) => res.sendFile(path.join(__dirname, 'public', 'tickets.html')));

// --- API D'INTERFACE (Pour que les données s'affichent) ---
app.get('/api/data/status', (req, res) => {
    res.json({
        online_users: 19,
        status: "Opérationnel",
        tickets: [
            { id: 1, title: "Problème clé API UHQ", status: "Ouvert" },
            { id: 2, title: "Facturation incorrecte", status: "En attente" }
        ],
        plans: [
            { name: "Starter", price: "€5" },
            { name: "Pro", price: "€10" },
            { name: "Premium", price: "€15" },
            { name: "1337", price: "€20" },
            { name: "UHQ", price: "€25" }
        ]
    });
});

// Lancement
app.listen(PORT, () => {
    console.log(`🚀 PokeDox Engine v2.0 lancé sur le port ${PORT}`);
    console.log(`Structure active : Dashboard + API + Tickets`);
});
