const mongoose = require('mongoose');

const Schema = mongoose.Schema
const activitySchema = new Schema( {
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    img: {
        type: String,
        required: false
    },
    isDeleted: {
        type: Boolean,
        default: false // ✅ ค่าเริ่มต้นเป็น false (ยังไม่ถูกลบ)
    }
},{ timestamps: true })

const myActivity = mongoose.model('Activity', activitySchema)


module.exports = myActivity