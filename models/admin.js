const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    tel: {
        type: String,
        default: null
    },
    email: {
        type: String,
        default: null
    },
    role: {
        type: String,
        default: 'admin'
    }
},{ timestamps: true })

const myAdmin = mongoose.model('Admin', adminSchema)

module.exports = myAdmin