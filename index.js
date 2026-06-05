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

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connecté à MongoDB Atlas'))
    .catch(err => console.error('❌ Erreur MongoDB :', err));

// Schéma utilisateur avec RÔLE
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, default: 'Non renseigné' },
    password: { type: String, default: 'oauth_account_secured' },
    discordId: { type: String, default: 'N/A' },
    ipAddress: { type: String, default: '127.0.0.1' },
    avatar: { type: String, default: '' },
    status: { type: String, default: 'Actif' },
    role: { type: String, default: 'user' } // <--- LE CHAMP RÔLE
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'kronix_super_secret_key_1234',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) { done(err, null); }
});

// Route Admin (Sécurisée)
app.post('/api/admin/update-role', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: "Accès refusé" });
    }
    const { userId, newPlan } = req.body;
    try {
        await User.findByIdAndUpdate(userId, { role: newPlan });
        res.json({ success: true, message: `Rôle mis à jour sur ${newPlan}` });
    } catch (err) {
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

// API User
app.get('/api/user', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Non authentifié' });
    res.json(req.session.user);
});

// Navigation
app.get('/dashboard', (req, res) => req.session.user ? res.sendFile(path.join(__dirname, 'public', 'dashboard.html')) : res.redirect('/'));

// Lancement
app.listen(PORT, () => console.log(`🚀 Kronix en ligne sur le port : ${PORT}`));
