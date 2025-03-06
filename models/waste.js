const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const wasteSchema = new Schema(
    {
        wasteName: {
            type: String,
            required: true
        },
        pricePerUnit: {
            type: Number,
            required: true
        },
        wasteType: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'WasteType',
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


const myWaste = mongoose.model('Waste', wasteSchema);

module.exports = myWaste;
