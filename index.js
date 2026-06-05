const express = require('express');
const session = require('express-session');
const path = require('path');
const passport = require('passport');
const mongoose = require('mongoose');
const DiscordStrategy = require('passport-discord').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();
const PORT = process.env.PORT || 3000;

// Connexion MongoDB
const MONGODB_URI = 'mongodb+srv://kronix_admin:tuXipYz..UVS7Y-@cluster0.yq31hua.mongodb.net/kronix_db?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI).then(async () => {
    console.log('✅ Connecté à MongoDB Atlas');
});

// Modèle Utilisateur
const userSchema = new mongoose.Schema({
    username: String,
    email: { type: String, default: 'Non renseigné' },
    discordId: String,
    avatar: String,
    role: { type: String, default: 'user' } // <--- LE RÔLE EST ICI
});
const User = mongoose.model('User', userSchema);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'kronix_super_secret_key_1234',
    resave: false,
    saveUninitialized: false
}));

// Route Admin (Sécurisée)
app.post('/api/admin/update-role', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: "Accès refusé" });
    }
    const { userId, newPlan } = req.body;
    await User.findByIdAndUpdate(userId, { role: newPlan });
    res.json({ success: true, message: `Rôle mis à jour sur ${newPlan}` });
});

// API User (Pour le Dashboard)
app.get('/api/user', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Non authentifié' });
    res.json(req.session.user);
});

// Routes de navigation
app.get('/dashboard', (req, res) => req.session.user ? res.sendFile(path.join(__dirname, 'public', 'dashboard.html')) : res.redirect('/'));

app.listen(PORT, () => console.log(`🚀 Serveur en ligne sur port ${PORT}`));
