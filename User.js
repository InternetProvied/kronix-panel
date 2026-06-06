const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        default: 'Non renseigné' 
    },
    password: { 
        type: String, 
        default: 'oauth_account_secured' 
    },
    discordId: { 
        type: String, 
        default: 'N/A' 
    },
    ipAddress: { 
        type: String, 
        default: '127.0.0.1' 
    },
    avatar: { 
        type: String, 
        default: '' 
    },
    status: { 
        type: String, 
        default: 'Actif' 
    },
    role: { 
        type: String, 
        default: 'user' 
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
