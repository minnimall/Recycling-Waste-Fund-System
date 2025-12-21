const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const wasteBankAccountSchema = new Schema({
    familyID: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Family', required: true , unique: true
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
    // ⭐ เพิ่มฟิลด์สำคัญ
    TotalSalesAmount: { 
        type: Number, 
        default: 0,
        comment: 'ยอดขายสะสมตั้งแต่เปิดบัญชี (ไม่รวมการหักฌาปนกิจ)'
    },
    MembershipDate: {
        type: Date,
        default: null,
        comment: 'วันที่เป็นสมาชิก (เมื่อขายครบ 300 บาท)'
    },
    IsMember: {
        type: Boolean,
        default: false,
        comment: 'สถานะสมาชิก (true = เป็นสมาชิกแล้ว)'
    },
    PendingDeductions: {
        type: Number,
        default: 0,
        comment: 'ยอดเงินที่ค้างหัก (จากการหักฌาปนกิจแล้วเงินไม่พอ)'
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const WasteBankAccount = mongoose.model('WasteBankAccount', wasteBankAccountSchema);
module.exports = WasteBankAccount;
