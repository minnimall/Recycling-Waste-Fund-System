const mongoose = require('mongoose');

const wastePurchaseSchema = new mongoose.Schema({
  accountId: {
    type: String,
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  purchaseDate: {
    type: Date,
    default: Date.now,
  },
  wasteItems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WasteItem',
  }],
});

const WastePurchase = mongoose.model('WastePurchase', wastePurchaseSchema);

module.exports = WastePurchase;