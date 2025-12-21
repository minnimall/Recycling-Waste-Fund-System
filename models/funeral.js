const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const funeralAssistanceSchema = new Schema({
    // ข้อมูลครัวเรือนที่ขอรับความช่วยเหลือ
    familyID: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Family', 
        required: true 
    },
    
    // ข้อมูลผู้รับผิดชอบในการจัดทำศพ
    responsiblePerson: {
        name: { 
            type: String, 
            required: true,
            comment: 'ชื่อผู้รับผิดชอบในการจัดทำศพ'
        },
        relationshipToDeceased: { 
            type: String, 
            enum: ['หัวหน้าครัวเรือน', 'คู่สมรส', 'บุตร', 'บิดา/มารดา', 'ญาติ', 'อื่นๆ'],
            required: true,
            comment: 'มีความเกี่ยวข้องกับผู้ตายในฐานะ'
        }
    },
    
    // ข้อมูลผู้เสียชีวิต
    deceasedInfo: {
        name: { 
            type: String, 
            required: true,
            comment: 'ชื่อผู้เสียชีวิต'
        },
        age: { 
            type: Number, 
            required: true,
            comment: 'อายุ (ปี)'
        },
        idCardNumber: { 
            type: String, 
            required: true,
            comment: 'หมายเลขบัตรประชาชน'
        },
        address: {
            houseNumber: { 
                type: String, 
                required: true,
                comment: 'อยู่บ้านเลขที่'
            },
            moo: { 
                type: String, 
                required: true,
                comment: 'หมู่ที่'
            },
            subdistrict: { 
                type: String, 
                required: true,
                comment: 'ตำบล'
            },
            district: { 
                type: String, 
                required: true,
                comment: 'อำเภอ'
            },
            province: { 
                type: String, 
                required: true,
                comment: 'จังหวัด'
            },
            postalCode: { 
                type: String, 
                required: true,
                comment: 'รหัสไปรษณีย์'
            }
        },
        phone: { 
            type: String, 
            required: true,
            comment: 'โทรศัพท์'
        },
        causeOfDeath: { 
            type: String, 
            required: true,
            comment: 'ถึงแก่กรรมด้วยสาเหตุ'
        },
        dateOfDeath: { 
            type: Date, 
            required: true,
            comment: 'วันที่เสียชีวิต'
        },
        memberID: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Member',
            default: null,
            comment: 'อ้างอิงถึง Member (ถ้าเป็น member ในระบบ)'
        }
    },

    // ข้อมูลการเงิน
    financialInfo: {
        totalAmount: { 
            type: Number, 
            required: true,
            comment: 'จำนวนเงินช่วยเหลือทั้งหมด'
        },
        totalMemberAccounts: { 
            type: Number, 
            required: true,
            comment: 'จำนวนบัญชีสมาชิกที่มีในระบบ'
        },
        perAccountAmount: { 
            type: Number, 
            required: true,
            comment: 'จำนวนเงินที่หักต่อบัญชี'
        },
        totalDeductedAccounts: { 
            type: Number, 
            default: 0,
            comment: 'จำนวนบัญชีที่หักได้จริง'
        },
        totalDeductedAmount: { 
            type: Number, 
            default: 0,
            comment: 'จำนวนเงินที่หักได้จริงทั้งหมด'
        },
        accountsWithSufficientBalance: {
            type: Number,
            default: 0,
            comment: 'จำนวนบัญชีที่มีเงินพอหัก'
        },
        accountsWithInsufficientBalance: {
            type: Number,
            default: 0,
            comment: 'จำนวนบัญชีที่เงินไม่พอหัก (ติดลบ)'
        }
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
        deductedAmount: { 
            type: Number, 
            required: true,
            comment: 'จำนวนเงินที่หักจากบัญชีนี้'
        },
        balanceBefore: { 
            type: Number, 
            required: true,
            comment: 'ยอดคงเหลือก่อนหัก'
        },
        balanceAfter: { 
            type: Number, 
            required: true,
            comment: 'ยอดคงเหลือหลังหัก (อาจติดลบได้)'
        },
        pendingAmount: {
            type: Number,
            default: 0,
            comment: 'จำนวนเงินที่ค้างหัก (กรณีเงินไม่พอ)'
        },
        status: {
            type: String,
            enum: ['sufficient', 'insufficient_but_deducted'],
            default: 'sufficient',
            comment: 'สถานะการหัก'
        },
        deductedAt: { type: Date, default: Date.now }
    }],

    // หมายเหตุ
    notes: { 
        type: String, 
        default: '',
        comment: 'หมายเหตุเพิ่มเติม'
    },

    // สถานะ
    status: {
        type: String,
        enum: ['pending', 'approved', 'completed', 'cancelled'],
        default: 'completed',
        comment: 'สถานะการดำเนินการ'
    },

    // ผู้บันทึก/อนุมัติ
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true,
        comment: 'ผู้บันทึกข้อมูล'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null,
        comment: 'ผู้อนุมัติ'
    },
    approvedAt: {
        type: Date,
        default: null,
        comment: 'วันที่อนุมัติ'
    },

    // ข้อมูลการตรวจสอบคุณสมบัติ
    eligibilityCheck: {
        isMember: { 
            type: Boolean, 
            default: false,
            comment: 'เป็นสมาชิกแล้วหรือไม่'
        },
        membershipDate: { 
            type: Date,
            comment: 'วันที่เป็นสมาชิก'
        },
        membershipDays: { 
            type: Number,
            comment: 'จำนวนวันที่เป็นสมาชิก'
        },
        totalSalesAmount: { 
            type: Number,
            comment: 'ยอดขายขยะสะสมทั้งหมด'
        },
        passedMembershipPeriod: { 
            type: Boolean, 
            default: false,
            comment: 'ผ่านเงื่อนไข 180 วัน'
        },
        isEligible: { 
            type: Boolean, 
            default: false,
            comment: 'มีสิทธิ์หรือไม่'
        },
        currentBalance: {
            type: Number,
            comment: 'ยอดคงเหลือในบัญชี ณ เวลาตรวจสอบ'
        },
        pendingDeductions: {
            type: Number,
            default: 0,
            comment: 'เงินค้างหัก ณ เวลาตรวจสอบ'
        },
        checkedAt: { 
            type: Date, 
            default: Date.now,
            comment: 'วันที่ตรวจสอบคุณสมบัติ'
        }
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
funeralAssistanceSchema.index({ 'deceasedInfo.idCardNumber': 1 });

const FuneralAssistance = mongoose.model('FuneralAssistance', funeralAssistanceSchema);
module.exports = FuneralAssistance;