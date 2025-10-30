const mongoose = require('mongoose');

const wastePointSchema = new mongoose.Schema({
    wastePointName: {
      type: String,
      required: [true, "กรุณากรอกชื่อจุดรับซื้อขยะ"],
      trim: true,
    },
    location: {
      type: String,
      required: true,
    },
    responsible: {
      type: String,
      required: [true, "กรุณากรอกชื่อผู้รับผิดชอบ"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "กรุณากรอกเบอร์โทรศัพท์"],
      match: [/^0\d{1,2}-?\d{3}-?\d{4}$/, "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง"],
    },
    type: {
      type: String,
      required: [true, "กรุณาเลือกประเภทจุดรับซื้อ"],
    },
    wasteTypes: {
      type: [String],
      required: [true, "กรุณาเลือกประเภทขยะที่รับซื้ออย่างน้อย 1 ประเภท"],
    },
    openTime: {
      type: String, // เช่น "08:00"
      default: null,
    },
    closeTime: {
      type: String, // เช่น "17:00"
      default: null,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    isOpen: {
      type: Boolean,
      default: true, // true = เปิดบริการ, false = ปิดชั่วคราว
    },
    addBy: {
      type: String,
      required: [true, "กรุณาเลือกประเภทจุดรับซื้อ"],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
}, { timestamps: true });

const WastePoint = mongoose.model('WastePoint', wastePointSchema);

module.exports = WastePoint;