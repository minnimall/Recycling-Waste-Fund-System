const mongoose = require('mongoose')

const Schema = mongoose.Schema
const mediaSchema = new Schema({
    title: {
        type: String,
        required: true,
        unique: true
    },
    youtubeUrl: {
        type: String,
        required: true,
        unique: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

const myMedia = mongoose.model('Media', mediaSchema)

module.exports = myMedia
