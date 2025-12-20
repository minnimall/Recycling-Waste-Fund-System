const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const funeralAssistanceSchema = new Schema({
    // ข้อมูลครัวเรือนที่ขอรับความช่วยเหลือ
    familyID: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Family', 
        required: true 
    },
    
    // ข้อมูลผู้เสียชีวิต
    deceasedInfo: {
        name: { type: String, required: true },
        relationship: { 
            type: String, 
            enum: ['หัวหน้าครัวเรือน', 'คู่สมรส', 'บุตร', 'บิดา/มารดา', 'ญาติ', 'อื่นๆ'],
            required: true 
        },
        dateOfDeath: { type: Date, required: true },
        memberID: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Member',
            default: null // null ถ้าไม่ใช่ member ในระบบ
        }
    },

    // ข้อมูลผู้รับเงินช่วยเหลือ
    beneficiaryInfo: {
        name: { type: String, required: true },
        relationship: { 
            type: String, 
            enum: ['คู่สมรส', 'บุตร', 'บิดา/มารดา', 'พี่/น้อง', 'ญาติ', 'อื่นๆ'],
            required: true 
        }
    },

    // ข้อมูลการเงิน
    financialInfo: {
        totalAmount: { type: Number, required: true }, // จำนวนเงินช่วยเหลือทั้งหมด
        totalAccounts: { type: Number, required: true }, // จำนวนบัญชีที่มีในระบบ
        perAccountAmount: { type: Number, required: true }, // จำนวนเงินที่หักต่อบัญชี
        totalDeductedAccounts: { type: Number, default: 0 }, // จำนวนบัญชีที่หักได้จริง
        totalDeductedAmount: { type: Number, default: 0 } // จำนวนเงินที่หักได้จริงทั้งหมด
    },

    // รายละเอียดบัญชีที่ถูกหัก
    deductedAccounts: [{
        accountID: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'WasteBankAccount',
            required: true 
        },
        familyID: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Family',
            required: true 
        },
        accountNumber: { type: String, required: true },
        accountName: { type: String, required: true },
        deductedAmount: { type: Number, required: true }, // จำนวนเงินที่หักจากบัญชีนี้
        balanceBefore: { type: Number, required: true }, // ยอดคงเหลือก่อนหัก
        balanceAfter: { type: Number, required: true }, // ยอดคงเหลือหลังหัก
        deductedAt: { type: Date, default: Date.now }
    }],

    // บัญชีที่ถูกตัดสิทธิ์
    disqualifiedAccounts: [{
        accountID: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'WasteBankAccount'
        },
        familyID: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Family'
        },
        accountNumber: { type: String },
        accountName: { type: String },
        reason: { 
            type: String,
            enum: ['insufficient_balance', 'insufficient_sales', 'both'],
            default: 'insufficient_balance'
        },
        balanceAtCheck: { type: Number },
        requiredAmount: { type: Number }
    }],

    // หมายเหตุ
    notes: { type: String, default: '' },

    // สถานะ
    status: {
        type: String,
        enum: ['pending', 'approved', 'completed', 'cancelled'],
        default: 'pending'
    },

    // ผู้บันทึก/อนุมัติ
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    },
    approvedAt: {
        type: Date,
        default: null
    },

    // ข้อมูลการตรวจสอบคุณสมบัติ
    eligibilityCheck: {
        membershipMonths: { type: Number }, // จำนวนเดือนที่สมัคร
        totalSales: { type: Number }, // ยอดขายขยะทั้งหมด
        passedMembershipPeriod: { type: Boolean, default: false }, // ผ่านเงื่อนไข 6 เดือน
        passedSalesRequirement: { type: Boolean, default: false }, // ผ่านเงื่อนไข 300 บาท
        isEligible: { type: Boolean, default: false }, // มีสิทธิ์หรือไม่
        checkedAt: { type: Date, default: Date.now }
    },

    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Index สำหรับการค้นหา
funeralAssistanceSchema.index({ familyID: 1, createdAt: -1 });
funeralAssistanceSchema.index({ status: 1 });
funeralAssistanceSchema.index({ 'deceasedInfo.dateOfDeath': -1 });

const FuneralAssistance = mongoose.model('FuneralAssistance', funeralAssistanceSchema);
module.exports = FuneralAssistance;