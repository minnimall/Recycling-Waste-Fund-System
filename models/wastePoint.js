const mongoose = require('mongoose');

const wastePointSchema = new mongoose.Schema({
    wastePointName: {
      type: String,
      required: [true, "กรุณากรอกชื่อจุดรับซื้อขยะ"],
      trim: true,
    },
    village: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Village',
      required: false
    },
    location: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: [true, "กรุณาเลือกประเภทจุดรับซื้อ"],
      enum: ['bank', 'center', 'community', 'mobile'],
      default: 'center'
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    latitude: {
      type: Number,
      required: [true, "กรุณาระบุตำแหน่งบนแผนที่"],
    },
    longitude: {
      type: Number,
      required: [true, "กรุณาระบุตำแหน่งบนแผนที่"],
    },
    isOpen: {
      type: Boolean,
      default: true, // true = เปิดบริการ, false = ปิดชั่วคราว
    },
    addBy: {
      type: String,
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
}, { timestamps: true });

const WastePoint = mongoose.model('WastePoint', wastePointSchema);

module.exports = WastePoint;