const mongoose = require('mongoose');

const wasteItemSchema = new mongoose.Schema({
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
});

const WasteItem = mongoose.model('WasteItem', wasteItemSchema);

module.exports = WasteItem;