const express = require('express');
const session = require('express-session');
const path = require('path');
const passport = require('passport');
const mongoose = require('mongoose');
const DiscordStrategy = require('passport-discord').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const axios = require('axios');

const app = express();
// Render définit automatiquement le PORT, sinon on prend 3000 en local
const PORT = process.env.PORT || 3000; 

// ==========================================
// CONNECTER MONGODB ATLAS WITH YOUR CREDENTIALS
// ==========================================
const MONGODB_URI = 'mongodb+srv://kronix_admin:tuXipYz..UVS7Y-@cluster0.yq31hua.mongodb.net/kronix_db?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log('✅ Connecté avec succès à MongoDB Atlas !');
        try {
            const adminExists = await User.findOne({ username: 'Admin' });
            if (!adminExists) {
                const defaultAdmin = new User({
                    username: 'Admin',
                    email: 'admin@kronix.local',
                    password: 'admin', 
                    discordId: '000000000000000000',
                    ipAddress: '127.0.0.1',
                    avatar: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=100&h=100&q=80',
                    status: 'Fondateur'
                });
                await defaultAdmin.save();
                console.log('✨ Compte Administrateur par défaut injecté dans MongoDB Atlas.');
            }
        } catch (err) {
            console.error('Erreur lors de l\'initialisation du compte Admin :', err);
        }
    })
    .catch(err => console.error('❌ Erreur de connexion MongoDB :', err));

// ==========================================
// MODÈLE DE DONNÉES (SCHEMA MONGODB)
// ==========================================
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, default: 'Non renseigné' },
    password: { type: String, default: 'oauth_account_secured' },
    discordId: { type: String, default: 'N/A' },
    ipAddress: { type: String, default: '127.0.0.1' },
    avatar: { type: String, default: '' },
    status: { type: String, default: 'Actif' }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// ==========================================
// CONFIGURATION DES MIDDLEWARES & SESSIONS
// ==========================================
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
    } catch (err) {
        done(err, null);
    }
});

// ==========================================
// CONFIGURATION DES STRATÉGIES PASSPORT (SÉCURISÉES VIA RENDER)
// ==========================================
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID, 
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: 'https://kronix-panel.onrender.com/auth/discord/callback',
    scope: ['identify', 'email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ discordId: profile.id });
        if (!user) {
            user = new User({
                username: profile.username,
                email: profile.email || 'Non renseigné',
                discordId: profile.id,
                avatar: `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`,
                ipAddress: 'Via Discord',
                status: 'Actif'
            });
            await user.save();
            console.log(`✨ Nouveau compte Discord enregistré dans Atlas : ${user.username}`);
        }
        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID, 
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'https://kronix-panel.onrender.com/auth/google/callback'
}, async (token, tokenSecret, profile, done) => {
    try {
        const emailStr = profile.emails && profile.emails[0] ? profile.emails[0].value : 'Non renseigné';
        let user = await User.findOne({ email: emailStr });
        if (!user) {
            user = new User({
                username: profile.displayName,
                email: emailStr,
                discordId: 'N/A',
                avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
                ipAddress: 'Via Google',
                status: 'Actif'
            });
            await user.save();
            console.log(`✨ Nouveau compte Google enregistré dans Atlas : ${user.username}`);
        }
        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

// ==========================================
// ROUTES DE NAVIGATION & D'AUTHENTIFICATION
// ==========================================

app.get('/', (req, res) => {
    if (req.session && req.session.user) return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username: new RegExp(`^${username}$`, 'i'), password: password });
        
        if (!user) {
            return res.send('<script>alert("Identifiants incorrects (Admin / admin)"); window.location.href="/";</script>');
        }
        
        req.session.user = user;
        res.redirect('/dashboard');
    } catch (err) {
        res.status(500).send('Erreur serveur lors de la connexion.');
    }
});

app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    req.session.user = req.user;
    res.redirect('/dashboard');
});

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
    req.session.user = req.user;
    res.redirect('/dashboard');
});

app.get('/api/user', (req, res) => {
    if (!req.session || !req.session.user) return res.status(401).json({ error: 'Non authentifié' });
    res.json(req.session.user);
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

// --- ACCÈS AUX PAGES DU PANEL ---
app.get('/dashboard', (req, res) => {
    if (!req.session || !req.session.user) return res.redirect('/');
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/ddos', (req, res) => {
    if (!req.session || !req.session.user) return res.redirect('/');
    res.sendFile(path.join(__dirname, 'public', 'ddos.html'));
});

app.get('/plans', (req, res) => {
    if (!req.session || !req.session.user) return res.redirect('/');
    res.sendFile(path.join(__dirname, 'public', 'plans.html'));
});

// ==========================================
// MOTEUR DE RECHERCHE DANS LA BDD ATLAS (OSINT)
// ==========================================
app.get('/api/search', async (req, res) => {
    if (!req.session || !req.session.user) return res.status(401).json({ error: 'Accès refusé.' });
    
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Recherche vide.' });

    try {
        const results = await User.find({
            $or: [
                { username: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
                { discordId: { $regex: query, $options: 'i' } },
                { ipAddress: { $regex: query, $options: 'i' } }
            ]
        }).select('-password');

        res.json(results);
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la recherche dans la base de données Atlas.' });
    }
});

// Lancement
app.listen(PORT, () => {
    console.log(`🚀 Serveur Kronix en ligne sur le port : ${PORT}`);
    console.log(`🔹 Base de données MongoDB Atlas activée via Mongoose.`);
});
