const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const transactionSchema = new Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WasteBankAccount',
        required: true
    },
    family: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Family',
        required: true
    },
    transactionType: {
        type: String,
        enum: ['withdraw', 'deposit'],
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['สำเร็จ', 'ไม่สำเร็จ'],
        default: 'สำเร็จ'
    },
    transactionDate: {
        type: Date,
        default: Date.now
    },
    note: {
        type: String,
        default: ''
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;