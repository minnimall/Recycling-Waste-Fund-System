const mongoose = require('mongoose')

const Schema = mongoose.Schema
const mediaSchema = new Schema( {
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
    author: {
        type: String,
        required: false
    }
},{ timestamps: true })

const myMedia = mongoose.model('Media', mediaSchema)


module.exports = myMedia