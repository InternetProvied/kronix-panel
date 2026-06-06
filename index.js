const express = require('express');
const session = require('express-session');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect('mongodb+srv://kronix_admin:tuXipYz..UVS7Y-@cluster0.yq31hua.mongodb.net/kronix_db?retryWrites=true&w=majority')
    .then(() => console.log('✅ MongoDB connecté'))
    .catch(err => console.error('❌ Erreur:', err));

const User = mongoose.model('User', new mongoose.Schema({
    username: String,
    email: String,
    role: { type: String, default: 'user' }
}));

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
app.get('/dashboard', (req, res) => req.session.user ? res.sendFile(path.join(__dirname, 'public', 'dashboard.html')) : res.redirect('/'));

app.post('/login', async (req, res) => {
    const { username } = req.body;
    const user = await User.findOne({ username });
    req.session.user = user || { username: 'Admin', role: 'admin' };
    res.redirect('/dashboard');
});

app.post('/api/admin/update-role', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).json({ success: false });
    await User.findByIdAndUpdate(req.body.userId, { role: req.body.newPlan });
    res.json({ success: true });
});

app.get('/api/user', (req, res) => res.json(req.session.user || { error: 'Non connecté' }));

app.listen(PORT, () => console.log(`🚀 Kronix en ligne sur le port ${PORT}`));
