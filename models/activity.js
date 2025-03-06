const mongoose = require('mongoose');

const Schema = mongoose.Schema
const activitySchema = new Schema( {
    title: {
        type: String,
        required: true,
        unique: true
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
        default: false
    }
},{ timestamps: true })

const myActivity = mongoose.model('Activity', activitySchema)


module.exports = myActivity