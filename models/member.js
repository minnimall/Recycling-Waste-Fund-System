const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const memberSchema = new Schema({
    familyID: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Family', 
        required: true,
        index: true
    },
    
    name: { 
        type: String, 
        required: true 
    },
    
    idCardNumber: { 
        type: String, 
        required: true, 
        unique: true
    },
    
    phone: { 
        type: String 
    },
    
    birthDate: { 
        type: Date 
    },
    
    age: { 
        type: String
    },
    
    occupation: { 
        type: String 
    },
    
    nationality: { 
        type: String, 
        default: 'ไทย' 
    },
    
    ethnicity: { 
        type: String, 
        default: 'ไทย' 
    },
    
    religion: { 
        type: String, 
        default: 'พุทธ' 
    },
    
    isRepresentative: { 
        type: Boolean, 
        default: false,
        index: true
    },
    
    Status: { 
        type: String,
        enum: ['living', 'deceased'],
        required: true,
        default: 'living',
        index: true
    },
    
    // ====================================
    // 👨‍👩‍👧‍👦 ข้อมูลสมาชิกในครัวเรือน (Array)
    // ====================================
    
    householdMembers: [{
        _id: { 
            type: mongoose.Schema.Types.ObjectId, 
            default: () => new mongoose.Types.ObjectId()
            // แต่ละคนในครัวเรือนมี _id เป็นของตัวเอง
        },
        
        name: { 
            type: String, 
            required: true 
        },
        
        idCardNumber: { 
            type: String, 
            required: false,
            default: ''
        },
        
        phone: { 
            type: String 
        },
        
        birthDate: { 
            type: Date 
        },
        
        age: { 
            type: String 
        },
        
        occupation: { 
            type: String 
        },
        
        nationality: { 
            type: String, 
            default: 'ไทย' 
        },
        
        ethnicity: { 
            type: String, 
            default: 'ไทย' 
        },
        
        religion: { 
            type: String, 
            default: 'พุทธ' 
        },
        
        // ความสัมพันธ์กับหัวหน้าครัวเรือน
        relationToHead: {
            type: String,
            enum: ['หัวหน้าครัวเรือน', 'คู่สมรส', 'บุตร', 'บิดา/มารดา', 'ญาติ', 'อื่นๆ'],
            default: 'ญาติ'
        },
        
        // เงื่อนไขการรับเงินฌาปนกิจ
        funeralBenefitCondition: {
            distributionType: {
                type: String,
                enum: ['full', 'equal', 'other'],
                default: 'equal'
            },
            distributionDetail: String
        },

        status: {
            type: String,
            enum: ['living', 'deceased'],
            default: 'living'
        },
        
        joinDate: { 
            type: Date, 
            default: Date.now 
        }
    }],
    
    joinDate: { 
        type: Date, 
        default: Date.now 
    },
    
    isDeleted: { 
        type: Boolean, 
        default: false 
    }
    
}, { 
    timestamps: true
});


// หาตัวแทนที่มีชีวิต
memberSchema.index({ familyID: 1, isRepresentative: 1, Status: 1 });

// หาสมาชิกทั้งหมดของครัวเรือน
memberSchema.index({ familyID: 1, isDeleted: 1 });

// หาคนจากเลขบัตรประชาชน
memberSchema.index({ idCardNumber: 1 });

const Member = mongoose.model('Member', memberSchema);
module.exports = Member;