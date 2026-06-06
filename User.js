const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    username: String,
    email: { type: String, default: 'Non renseigné' },
    role: { type: String, default: 'user' }
});
module.exports = mongoose.model('User', userSchema);
