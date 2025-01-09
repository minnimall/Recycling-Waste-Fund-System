const mongoose = require('mongoose')

const Schema = mongoose.Schema
const mediaSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    youtubeUrl: {
        type: String,
        required: true
    }
}, { timestamps: true })

const myMedia = mongoose.model('Media', mediaSchema)

module.exports = myMedia
