const express = require('express');
const session = require('express-session');
const path = require('path');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 1. BASE DE DONNÉES LOCALE (TABLEAU JS)
// ==========================================
const localUsersDB = [
    {
        _id: "user_admin_kronix",
        username: "Admin",
        email: "admin@kronix.local",
        password: "admin", // Ton mot de passe admin par défaut
        discordId: "000000000000000000",
        ipAddress: "127.0.0.1",
        avatar: "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=100&h=100&q=80",
        status: "Fondateur"
    }
];

// ==========================================
// 2. CONFIGURATION DES MIDDLEWARES & SESSIONS
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

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// ==========================================
// 3. CONFIGURATION DES STRATÉGIES PASSPORT
// ==========================================
passport.use(new DiscordStrategy({
    clientID: 'TON_DISCORD_CLIENT_ID', 
    clientSecret: 'TON_DISCORD_CLIENT_SECRET',
    callbackURL: 'http://localhost:3000/auth/discord/callback',
    scope: ['identify', 'email']
}, (accessToken, refreshToken, profile, done) => {
    let user = localUsersDB.find(u => u.discordId === profile.id);
    if (!user) {
        user = {
            _id: "user_" + Date.now(),
            username: profile.username,
            email: profile.email || 'Non renseigné',
            discordId: profile.id,
            avatar: `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`,
            password: 'oauth_account_secured',
            ipAddress: 'Via Discord',
            status: 'Actif'
        };
        localUsersDB.push(user);
    }
    return done(null, user);
}));

passport.use(new GoogleStrategy({
    clientID: 'TON_GOOGLE_CLIENT_ID', 
    clientSecret: 'TON_GOOGLE_CLIENT_SECRET',
    callbackURL: 'http://localhost:3000/auth/google/callback'
}, (token, tokenSecret, profile, done) => {
    const emailStr = profile.emails && profile.emails[0] ? profile.emails[0].value : 'Non renseigné';
    let user = localUsersDB.find(u => u.email === emailStr);
    if (!user) {
        user = {
            _id: "user_" + Date.now(),
            username: profile.displayName,
            email: emailStr,
            discordId: 'N/A',
            avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
            password: 'oauth_account_secured',
            ipAddress: 'Via Google',
            status: 'Actif'
        };
        localUsersDB.push(user);
    }
    return done(null, user);
}));

// ==========================================
// 4. ROUTES D'AUTHENTIFICATION & NAVIGATION
// ==========================================

app.get('/', (req, res) => {
    if (req.session && req.session.user) return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = localUsersDB.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (!user) return res.send('<script>alert("Identifiants incorrects."); window.location.href="/";</script>');
    req.session.user = user;
    res.redirect('/dashboard');
});

app.post('/register', (req, res) => {
    const { username, email, password } = req.body;
    const userExists = localUsersDB.find(u => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === email.toLowerCase());
    if (userExists) return res.send('<script>alert("Nom d\'utilisateur ou email déjà pris."); window.location.href="/";</script>');

    const newUser = {
        _id: "user_" + Date.now(),
        username: username,
        email: email || 'Non renseigné',
        password: password, 
        discordId: 'N/A',
        ipAddress: req.ip || '127.0.0.1',
        avatar: "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=100&h=100&q=80",
        status: "Membre"
    };
    localUsersDB.push(newUser);
    req.session.user = newUser;
    res.send('<script>alert("Compte créé avec succès !"); window.location.href="/dashboard";</script>');
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

// Pages du Dashboard
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

// API de Recherche OSINT
app.get('/api/search', (req, res) => {
    if (!req.session || !req.session.user) return res.status(401).json({ error: 'Accès refusé.' });
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Recherche vide.' });
    const lowerQuery = query.toLowerCase();

    const results = localUsersDB.filter(user => {
        return (
            (user.username && user.username.toLowerCase().includes(lowerQuery)) ||
            (user.email && user.email.toLowerCase().includes(lowerQuery)) ||
            (user.discordId && user.discordId.toLowerCase().includes(lowerQuery)) ||
            (user.ipAddress && user.ipAddress.toLowerCase().includes(lowerQuery))
        );
    }).map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
    });
    res.json(results);
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur Kronix en ligne sur : http://localhost:${PORT}`);
});
