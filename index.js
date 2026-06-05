const express = require('express');
const session = require('express-session');
const path = require('path');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'pokedox_ultimate_key',
    resave: false,
    saveUninitialized: false
}));

// Route de recherche (Ta logique OSINT importante)
app.get('/api/lookup', async (req, res) => {
    const { query, type } = req.query;
    try {
        // Ici tu remets tes appels API (IP, Discord, etc.)
        // Exemple basique pour ne pas casser ton code :
        res.json({ success: true, message: `Recherche ${type} effectuée pour ${query}` });
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Routes de navigation
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));

app.listen(PORT, () => console.log(`🚀 Serveur PokeDox opérationnel sur le port ${PORT}`));
