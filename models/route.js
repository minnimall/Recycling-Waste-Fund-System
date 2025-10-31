const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
    routeName: {
        type: String,
        required: true,
        trim: true
    },
    // จุดทั้งหมดในเส้นทาง
    points: [{
        pointNumber: Number,  // ลำดับที่ของจุด
        lat: Number,
        lng: Number,
        address: String
    }],
    // ข้อมูลสรุปเส้นทาง
    totalDistance: {
        type: Number, // ระยะทางรวม (กิโลเมตร)
        required: true
    },
    totalDuration: {
        type: Number, // เวลารวม (นาที)
        required: true
    },
    // จำนวนจุดในเส้นทาง
    numberOfPoints: {
        type: Number,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    note: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['active', 'archived'],
        default: 'active'
    }
    
}, {
    timestamps: true
});

// สร้าง index เพื่อค้นหาเร็วขึ้น
routeSchema.index({ createdBy: 1, createdAt: -1 });
routeSchema.index({ routeName: 'text' }); // สำหรับค้นหาด้วยชื่อ

const Route = mongoose.model('Route', routeSchema);

module.exports = Route;