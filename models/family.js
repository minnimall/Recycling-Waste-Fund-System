const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const FamilySchema = new mongoose.Schema({
    familyName: { 
        type: String, 
        required: true 
    },
    username: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    address: {
        houseNumber: String,
        moo: String,
        road: String,
        subdistrict: String,
        district: String,
        province: String,
        postalCode: String
    },
    NumFamilyMembers: { 
        type: Number,
        default: 0
    },
    village: { 
        type: mongoose.Schema.Types.ObjectId, 
                ref: 'Village', required: true
    },
    Type: { // ประเภทครัวเรือน เช่น บ้าน, โรงเรียน, อปท. หรือ ชุมชน
        type: String,
        enum: ['household', 'school', 'municipality', 'community'],
        required: true
    },
    role: {
        type: String,
        default: 'user'
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
    },
    { timestamps: true }
);

const Family = mongoose.model('Family', FamilySchema);

module.exports = Family;