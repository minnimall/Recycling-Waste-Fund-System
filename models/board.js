const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true,
    },
    department: {
        type: String,
        enum: ['ฝ่ายอำนวยการ', 'ฝ่ายประชาสัมพันธ์/วางแผนดำเนินและติดตามผล','ฝ่ายรับสมัคร','ฝ่ายรับซื้อขยะ','ฝ่ายการเงินและบัญชี',
            'ฝ่ายเบิกถอนเงินฝากธนาคาร','ฝ่ายงานทะเบียนและธุรการ','ฝ่ายจัดการทุนและฌาปนกิจ','ฝ่ายภาพกิจกรรม'],
        required: true
    },
    email: {
        type: String,
        required: true,
    },
    tel: {
        type: String,
        required: true,
    },
    img: {
        type: String,
        required: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});


const Board = mongoose.model('Board', boardSchema);

module.exports = Board;