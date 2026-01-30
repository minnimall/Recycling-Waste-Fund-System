const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const memberSchema = new Schema({
    familyID: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
    email: { type: String },
    name: { type: String, required: true },
    phone: { type: String },
    joinDate: { type: Date, default: Date.now },

    // ข้อมูลจากแบบฟอร์ม
    idCardNumber: { type: String,required: true,  unique: true },
    birthDate: { type: Date },
    occupation: { type: String },
    age: { type: String },
    nationality: { type: String },
    ethnicity: { type: String },
    religion: { type: String },

    // ผู้รับผลประโยชน์
    beneficiaries: [{
        name: String,
        relation: String,
            distributionType: {
                type: String,
                enum: ['full', 'equal', 'other'],
                default: 'equal'
            },
        distributionDetail: String, // ใช้กรณีเลือก 'other'
        status: {  // ← เพิ่มส่วนนี้
        type: String,
        enum: ['living', 'deceased'],
        default: 'living'
    }
    }],
    Status: { // สถานะสมาชิก เช่น 'living' หรือ 'deceased'
        type: String,
        enum: ['living', 'deceased'],
        required: true,
        default: 'living'
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Member = mongoose.model('Member', memberSchema);
module.exports = Member;