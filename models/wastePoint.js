const mongoose = require('mongoose');

const wastePointSchema = new mongoose.Schema({
    wastePointName: {
        type: String,
        required: true,
    },
    location: {
        type: String,
        required: true,
    },
    latitude: {
        type: String,
        required: true,
    },
    longitude: {
        type: String,
        required: true,
    },
    tel: {
        type: Number,
        required: true,
    },
    date: { 
        type: Date, 
        required: true 
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
    },
    addBy: {
        type: String,
        required: true,
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const WastePoint = mongoose.model('WastePoint', wastePointSchema);

module.exports = WastePoint;