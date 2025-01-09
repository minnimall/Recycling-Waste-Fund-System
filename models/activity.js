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
    }
},{ timestamps: true })

const myActivity = mongoose.model('Activity', activitySchema)


module.exports = myActivity