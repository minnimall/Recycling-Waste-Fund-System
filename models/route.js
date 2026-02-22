const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
    routeName: {
        type: String,
        required: true,
        trim: true
    },
    // จุดทั้งหมดในเส้นทาง
    points: [{
        pointNumber: Number,
        lat: Number,
        lng: Number,
        address: String,
        requestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'wasteSaleRequest',
            required: false
        },
        status: { 
            type: String, 
            enum: ['in-progress', 'complete', 'failed'],
            default: 'in-progress' 
        },
        failReason: { type: String, trim: true }
    }],
    // ข้อมูลสรุปเส้นทาง
    totalDistance: {
        type: Number,
        required: true
    },
    totalDuration: {
        type: Number,
        required: true
    },
    numberOfPoints: {
        type: Number,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: false
    },
    note: {
        type: String,
        trim: true
    },
    wasteSaleRequests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'wasteSaleRequest'
    }],
    status: {
        type: String,
        enum: ['active', 'archived'],
        default: 'active'
    },
    isAllComplete: {
        type: Boolean,
        default: false
    }
    
}, {
    timestamps: true
});

// สร้าง index
routeSchema.index({ createdBy: 1, createdAt: -1 });
routeSchema.index({ routeName: 'text' });

const Route = mongoose.model('Route', routeSchema);

module.exports = Route;