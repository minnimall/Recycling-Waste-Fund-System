const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const wasteBankAccountSchema = new Schema({
    familyID: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Family', required: true 
    },
    AccountName: {
        type: String,
        required: true
    },
    AccountNumber: {
        type: String,
        required: true,
        unique: true
    },
    Balance: {
        type: Number,
        required: true,
        default: 0
    },
    OpenDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const WasteBankAccount = mongoose.model('WasteBankAccount', wasteBankAccountSchema);
module.exports = WasteBankAccount;
