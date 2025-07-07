const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const recycleCenterSchema = new Schema({
    id: {
        type: Number,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['center'],
        default: 'center'
    },
    address: {
        type: String
    },
    lat: {
        type: Number,
        required: true
    },
    lng: {
        type: Number,
        required: true
    },
    hours: {
        type: String
    },
    phone: {
        type: String
    },
    status: {
        type: String,
        enum: ['open', 'closed'],
        default: 'open'
    },
    rating: {
        type: Number,
        min: 0,
        max: 5
    },
    distance: {
        type: String
    },
    wasteTypes: {
        type: [String]
    },
    prices: {
        type: Map,
        of: String
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const RecycleCenter = mongoose.model('RecycleCenter', recycleCenterSchema);

module.exports = RecycleCenter;