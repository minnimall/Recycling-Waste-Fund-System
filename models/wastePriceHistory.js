const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const priceHistorySchema = new Schema(
    {
        wasteId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Waste',
            required: true
        },
        pricePerUnit: {
            type: Number,
            required: true
        },
        percentChange: {
            type: Number, // เช่น +10.5 หรือ -5.2
            required: false
        },
        changeDirection: {
            type: String,
            enum: ['up', 'down', 'none'],
            default: 'none'
        },
        location: {
            type: String,
            required: false
        }
    },
    { timestamps: true }
);

const WastePriceHistory = mongoose.model('WastePriceHistory', priceHistorySchema);

module.exports = WastePriceHistory;
