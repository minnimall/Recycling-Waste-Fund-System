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
    firstname:{
        type: String,
        required: true
    },
    lastname:{
        type: String,
        required: true
    },
    tel: {
        type: String,
        default: null,
        unique: true
    },
    email: {
        type: String,
        default: null,
        unique: true
    },
    role: {
        type: String,
        default: 'admin'
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
},{ timestamps: true })

const myAdmin = mongoose.model('Admin', adminSchema)

module.exports = myAdmin