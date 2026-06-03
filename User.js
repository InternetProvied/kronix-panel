const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String },
    discordId: { type: String, unique: true, sparse: true },
    googleId: { type: String, unique: true, sparse: true },
    avatar: { type: String }, 
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);