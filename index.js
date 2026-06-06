const express = require('express');
const session = require('express-session');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Connexion BDD
mongoose.connect('mongodb+srv://kronix_admin:tuXipYz..UVS7Y-@cluster0.yq31hua.mongodb.net/kronix_db?retryWrites=true&w=majority')
    .then(() => console.log('✅ MongoDB connecté'))
    .catch(err => console.error('❌ Erreur MongoDB:', err));

// Schema Utilisateur
const User = mongoose.model('User', new mongoose.Schema({
    username: String,
    email: String,
    role: { type: String, default: 'user' }
}));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'kronix_super_secret',
    resave: false,
    saveUninitialized: false
}));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// API Admin
app.post('/api/admin/update-role', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).json({ success: false });
    const { userId, newPlan } = req.body;
    await User.findByIdAndUpdate(userId, { role: newPlan });
    res.json({ success: true });
});

app.get('/api/user', (req, res) => res.json(req.session.user || { error: 'Non connecté' }));

app.listen(PORT, () => console.log(`🚀 Serveur actif sur le port ${PORT}`));
