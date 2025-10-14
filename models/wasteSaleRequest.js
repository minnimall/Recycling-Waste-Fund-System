const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const wasteSaleRequestSchema = new Schema(
    {
        waste: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Waste',
                required: true
            }
        ],
        weight: {
            type: Number,
            required: false,
            default: 0
        },
        date: {
            type: Date, 
            required: true 
        },
        location: {
            type: String,
            required: true
        },
        locationMoreDetail: {
            type: String,
            required: false
        },
        latitude: {          
            type: Number,
            required: true
        },
        longitude: {         
            type: Number,
            required: true
        },
        img: {
            type: String,
            required: false
        },
        family: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Family',
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'in-progress', 'resolved'],
            default: 'pending'
        },
        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

const wasteSaleRequest = mongoose.model('wasteSaleRequest', wasteSaleRequestSchema);
module.exports = wasteSaleRequest;
