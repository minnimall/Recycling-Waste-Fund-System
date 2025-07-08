const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const wasteTypeSchema = new mongoose.Schema(
    {
        wasteTypeId: {
            type: String,
            unique: true,
            required: true,
            default: () => new mongoose.Types.ObjectId().toString(),
        },
        wasteTypeName: {
            type: String,
            required: [true, 'กรุณาระบุชื่อประเภทขยะ'],
            trim: true,
            maxlength: [50, 'ชื่อประเภทขยะต้องไม่เกิน 50 ตัวอักษร'],
        },
        colorTheme: {
            type: String,
            required: true,
        },
        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);


const myWasteType = mongoose.model('WasteType', wasteTypeSchema);

module.exports = myWasteType;
