const express = require('express');
const session = require('express-session');
const passport = require('passport');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Connexion BDD
mongoose.connect('mongodb+srv://kronix_admin:tuXipYz..UVS7Y-@cluster0.yq31hua.mongodb.net/kronix_db?retryWrites=true&w=majority')
    .then(() => console.log('✅ MongoDB connecté'))
    .catch(err => console.error('❌ Erreur MongoDB:', err));

// Schema avec rôle
const User = mongoose.model('User', new mongoose.Schema({
    username: String,
    email: String,
    role: { type: String, default: 'user' }
}));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'kronix_secret',
    resave: false,
    saveUninitialized: false
}));
app.use(express.static(path.join(__dirname, 'public')));

// Route Admin (Sécurisée)
app.post('/api/admin/update-role', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ success: false });
    }
    const { userId, newPlan } = req.body;
    await User.findByIdAndUpdate(userId, { role: newPlan });
    res.json({ success: true });
});

// Route User
app.get('/api/user', (req, res) => {
    res.json(req.session.user || { error: 'Non connecté' });
});
// Route pour la page d'accueil
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Route pour le Dashboard
app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.listen(PORT, () => console.log(`🚀 Serveur démarré sur port ${PORT}`));
