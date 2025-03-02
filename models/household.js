const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const householdSchema = new Schema({
    FamilyName: {
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
        type: String,
        required: true
    },
    Village: {
        type: Schema.Types.ObjectId,
        ref: 'Village', // เชื่อมกับตาราง Village
        required: true
    },
    Type: { // ประเภทครัวเรือน เช่น บ้าน, โรงเรียน, อปท. หรือ ชุมชน
        type: String,
        enum: ['household', 'school', 'municipality', 'community'],
        required: true
    }
}, { timestamps: true });

const Household = mongoose.model('Household', householdSchema);
module.exports = Household;