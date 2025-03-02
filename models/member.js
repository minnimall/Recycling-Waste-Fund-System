const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const memberSchema = new Schema({
    HouseholdID: {
        type: Schema.Types.ObjectId,
        ref: 'Household', // เชื่อมกับตาราง Household
        required: true
    },
    firstname: {
        type: String,
        required: true
    },
    lastname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    tel: {
        type: String,
        required: true
    },
    JoinDate: {
        type: Date,
        default: Date.now
    },
    Status: { // สถานะสมาชิก เช่น 'living' หรือ 'deceased'
        type: String,
        enum: ['living', 'deceased'],
        required: true,
        default: 'living'
    }
}, { timestamps: true });

const Member = mongoose.model('Member', memberSchema);
module.exports = Member;