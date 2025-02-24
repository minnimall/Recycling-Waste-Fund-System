const mongoose = require('mongoose');

const Schema = mongoose.Schema
const villageSchema = new Schema({
    villageNumber: {
        type: Number, 
        required: true, 
        unique: true 
    }, 
    villageName: {
        type: String, 
        required: true, 
        unique: true 
    }, 
    location: {
        type: String 
    }, 
},{ timestamps: true })

const Village = mongoose.model('Village', villageSchema)

module.exports = Village