const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'kronix_v2', resave: false, saveUninitialized: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Connexion BDD
mongoose.connect('mongodb+srv://kronix_admin:tuXipYz..UVS7Y-@cluster0.yq31hua.mongodb.net/kronix_db')
    .then(() => console.log('✅ MongoDB connecté'))
    .catch(err => console.error('❌ Erreur:', err));

// Modèle intégré directement ici
const User = mongoose.model('User', new mongoose.Schema({
    username: String,
    email: { type: String, default: 'Non renseigné' },
    role: { type: String, default: 'user' }
}));

// Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/dashboard', (req, res) => req.session.user ? res.sendFile(path.join(__dirname, 'public', 'dashboard.html')) : res.redirect('/'));

app.post('/login', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    req.session.user = user || { username: req.body.username, role: 'user' };
    res.redirect('/dashboard');
});

app.get('/api/user', (req, res) => res.json(req.session.user || {}));

app.post('/api/admin/update-role', async (req, res) => {
    if (req.session.user?.role !== 'admin') return res.status(403).send('Accès refusé');
    await User.findByIdAndUpdate(req.body.userId, { role: req.body.newPlan });
    res.json({ success: true });
});

app.listen(process.env.PORT || 3000, () => console.log('🚀 Serveur actif'));
