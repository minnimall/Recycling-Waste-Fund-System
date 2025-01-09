const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const wasteTypeSchema = new Schema(
    {
        wasteTypeId: {
            type: String,
            required: true,
            trim: true,
            minlength: 4, // ต้องมีอย่างน้อย 4 ตัวอักษร
        },
        wasteTypeName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 50,
        },
    },
    { timestamps: true }
);


const myWasteType = mongoose.model('WasteType', wasteTypeSchema);

module.exports = myWasteType;
