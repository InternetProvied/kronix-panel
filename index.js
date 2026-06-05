const express = require('express');
const session = require('express-session');
const path = require('path');
const passport = require('passport');
const mongoose = require('mongoose');
const DiscordStrategy = require('passport-discord').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000; 

// ==========================================
// CONFIGURATION MONGODB ATLAS
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
                console.log('✨ Compte Administrateur par défaut injecté.');
            }
        } catch (err) {
            console.error('Erreur initialisation compte Admin :', err);
        }
    })
    .catch(err => console.error('❌ Erreur de connexion MongoDB :', err));

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
// MIDDLEWARES & SESSIONS
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
// STRATÉGIES PASSPORT
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
        }
        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

// ==========================================
// ROUTES DE NAVIGATION
// ==========================================
app.get('/', (req, res) => {
    if (req.session && req.session.user) return res.redirect('/dashboard');
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username: new RegExp(`^${username}$`, 'i'), password: password });
        if (!user) return res.send('<script>alert("Identifiants incorrects"); window.location.href="/";</script>');
        req.session.user = user;
        res.redirect('/dashboard');
    } catch (err) {
        res.status(500).send('Erreur serveur.');
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

app.get('/dashboard', (req, res) => {
    if (!req.session || !req.session.user) return res.redirect('/');
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ==========================================
// MOTEUR DE RECHERCHE ET REQUÊTES EXTERNES (API LOOKUP)
// ==========================================
app.get('/api/lookup', async (req, res) => {
    if (!req.session || !req.session.user) return res.status(401).json({ error: 'Accès refusé.' });

    const { query, type } = req.query;
    if (!query) return res.status(400).json({ error: 'Le champ de recherche est vide.' });

    try {
        // --- OPTION 1 : RECHERCHE PAR ADRESSE IP ---
        if (type === 'ip') {
            const response = await axios.get(`https://ip-api.com/json/${query}?fields=status,message,country,regionName,city,zip,isp,org,as,query`);
            if (response.data.status === 'fail') {
                return res.status(400).json({ error: 'Adresse IP invalide ou introuvable.' });
            }
            return res.json({
                success: true,
                type: 'ip',
                results: {
                    ip: response.data.query,
                    pays: response.data.country,
                    region: response.data.regionName,
                    ville: response.data.city,
                    codePostal: response.data.zip,
                    fai: response.data.isp,
                    organisation: response.data.org
                }
            });
        }

        // --- OPTION 2 : RECHERCHE PAR DISCORD ID ---
        if (type === 'discord_id') {
            // Utilise le Token de ton bot Discord stocké dans tes variables d'environnement Render
            const botToken = process.env.DISCORD_BOT_TOKEN;
            if (!botToken) {
                return res.status(500).json({ error: "Le Token du bot Discord n'est pas configuré sur Render." });
            }

            try {
                const response = await axios.get(`https://discord.com/api/v10/users/${query}`, {
                    headers: { Authorization: `Bot ${botToken}` }
                });

                const user = response.data;
                const avatarURL = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'https://discord.com/assets/1f0bfc0865d324c2587920a7d80c609b.png';
                const bannerURL = user.banner ? `https://cdn.discordapp.com/banners/${user.id}/${user.banner}.png?size=512` : null;

                return res.json({
                    success: true,
                    type: 'discord_id',
                    results: {
                        id: user.id,
                        username: user.username,
                        globalName: user.global_name || 'Aucun nom d\'affichage',
                        avatar: avatarURL,
                        banner: bannerURL,
                        accentColor: user.accent_color ? `#${user.accent_color.toString(16)}` : 'Non définie',
                        bot: user.bot ? 'Oui' : 'Non'
                    }
                });
            } catch (err) {
                return res.status(404).json({ error: "Aucun utilisateur Discord trouvé avec cet ID, ou Token invalide." });
            }
        }

        // --- OPTION 3 : RECHERCHE PAR PSEUDONYME COMPTES SOCIAUX ---
        if (type === 'username') {
            const platforms = [
                { name: 'GitHub', url: `https://github.com/${query}` },
                { name: 'Reddit', url: `https://www.reddit.com/user/${query}` },
                { name: 'TikTok', url: `https://www.tiktok.com/@${query}` }
            ];

            const results = [];
            for (const platform of platforms) {
                try {
                    const check = await axios.get(platform.url, { timeout: 3000, headers: { 'User-Agent': 'Mozilla/5.0' } });
                    if (check.status === 200) {
                        results.push({ site: platform.name, status: 'Profil Public Trouvé', link: platform.url });
                    }
                } catch (e) {
                    results.push({ site: platform.name, status: 'Inconnu ou Privé', link: platform.url });
                }
            }

            return res.json({ success: true, type: 'username', results });
        }

        return res.status(400).json({ error: 'Type de recherche non supporté.' });

    } catch (err) {
        return res.status(500).json({ error: 'Erreur lors de l\'analyse externe.' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur Kronix en ligne sur le port : ${PORT}`);
});
