const mongoose = require('mongoose');

const wasteItemSchema = new mongoose.Schema({
  wasteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Waste',
    required: true
  },
  name: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  pricePerUnit: {
    type: Number,
    required: true,
  },
  isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const WasteItem = mongoose.model('WasteItem', wasteItemSchema);

module.exports = WasteItem;