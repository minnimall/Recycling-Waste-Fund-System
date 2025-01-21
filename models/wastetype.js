const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const wasteTypeSchema = new mongoose.Schema(
    {
        wasteTypeId: {
            type: String,
            unique: true, // ป้องกันค่าซ้ำ
            required: true, // บังคับให้ต้องมีค่า
            default: () => new mongoose.Types.ObjectId().toString(), // กำหนดค่าเริ่มต้น
        },
        wasteTypeName: {
            type: String,
            required: [true, 'กรุณาระบุชื่อประเภทขยะ'],
            trim: true,
            maxlength: [50, 'ชื่อประเภทขยะต้องไม่เกิน 50 ตัวอักษร'],
        },
    },
    { timestamps: true }
);


const myWasteType = mongoose.model('WasteType', wasteTypeSchema);

module.exports = myWasteType;
