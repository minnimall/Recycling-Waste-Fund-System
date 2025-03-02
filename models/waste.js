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
        stockQuantity: {  // เพิ่มฟิลด์นี้เพื่อเก็บจำนวนขยะในสต๊อก
            type: Number,
            default: 0, // จำนวนเริ่มต้นเป็น 0
            required: true,
            min: 0 // ไม่ให้เป็นค่าลบ
        }
    },
    { timestamps: true }
);


const myWaste = mongoose.model('Waste', wasteSchema);

module.exports = myWaste;
