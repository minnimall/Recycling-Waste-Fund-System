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
        img: {
            type: String,
            required: false
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
