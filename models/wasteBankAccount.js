const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const wasteBankAccountSchema = new Schema({
    HouseholdID: {
        type: Schema.Types.ObjectId,
        ref: 'Household', // เชื่อมกับตาราง Household
        required: true
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
    Type: { // ชนิดของบัญชี เช่น บ้าน, โรงเรียน, อปท. หรือ ชุมชน
        type: String,
        enum: ['household','school', 'municipality', 'community'],
        required: true
    },
    Balance: {
        type: Number,
        required: true,
        default: 0
    },
    OpenDate: {
        type: Date,
        required: true
    }
}, { timestamps: true });

const WasteBankAccount = mongoose.model('WasteBankAccount', wasteBankAccountSchema);
module.exports = WasteBankAccount;
