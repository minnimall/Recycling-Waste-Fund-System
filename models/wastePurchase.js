const mongoose = require('mongoose');

const wastePurchaseSchema = new mongoose.Schema({
  accountId: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WasteBankAccount',
  }],
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
  addBy: {
    type: String,
    required: true,
  },
});

const WastePurchase = mongoose.model('WastePurchase', wastePurchaseSchema);

module.exports = WastePurchase;