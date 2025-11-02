const mongoose = require('mongoose');

const Schema = mongoose.Schema
const RoundSchema = new mongoose.Schema({
    roundName: {
        type: String, 
        required: true 
    }, 
    village: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Village', required: true 
    },
    wastePoint: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'WastePoint',
        required: false
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
    isDeleted: {
        type: Boolean,
        default: false
    }
},{ timestamps: true });

const Round = mongoose.model('round', RoundSchema)
module.exports = Round