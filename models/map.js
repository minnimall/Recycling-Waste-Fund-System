const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema({
  pointNumber: { type: Number, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  address: { type: String, required: true },
  distanceToNext: { type: Number }, // ระยะทางไปจุดถัดไป (กม.)
  durationToNext: { type: Number }  // เวลาไปจุดถัดไป (นาที)
});

const routeAnalysisSchema = new mongoose.Schema({
  // ข้อมูลพื้นฐาน
  routeName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // ข้อมูลผู้สร้าง
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee', // อ้างอิงถึง model พนักงาน
    required: true
  },
  
  // ข้อมูลจุดในเส้นทาง
  points: [pointSchema],
  
  // สรุปผลการวิเคราะห์
  analysis: {
    totalDistance: { type: Number, required: true }, // กม.
    totalDuration: { type: Number, required: true }, // นาที
    numberOfPoints: { type: Number, required: true },
    isRoundTrip: { type: Boolean, default: true },
    optimizationMethod: { 
      type: String, 
      default: 'TSP-2OPT',
      enum: ['TSP-2OPT', 'NEAREST-NEIGHBOR', 'MANUAL']
    }
  },
  
  // ข้อมูลเส้นทาง (GeoJSON format สำหรับวาดบนแผนที่)
  routeGeometry: {
    type: {
      type: String,
      enum: ['LineString'],
      default: 'LineString'
    },
    coordinates: [[Number]] // Array of [lng, lat] pairs
  },
  
  // Snapshot ของแผนที่ (optional)
  mapSnapshot: {
    imageUrl: String, // URL ของรูปภาพแผนที่
    thumbnailUrl: String, // URL ของภาพขนาดย่อ
    capturedAt: Date
  },
  
  // สถานะและข้อมูลเพิ่มเติม
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'archived'],
    default: 'active'
  },
  
  // ข้อมูลการใช้งาน
  usageStats: {
    timesViewed: { type: Number, default: 0 },
    timesModified: { type: Number, default: 0 },
    lastUsedAt: Date
  },
  
  // Tags สำหรับการค้นหา
  tags: [String],
  
  // Notes
  notes: String

}, {
  timestamps: true, // จะสร้าง createdAt และ updatedAt อัตโนมัติ
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes เพื่อเพิ่มประสิทธิภาพการค้นหา
routeAnalysisSchema.index({ createdBy: 1, createdAt: -1 });
routeAnalysisSchema.index({ status: 1 });
routeAnalysisSchema.index({ 'analysis.numberOfPoints': 1 });
routeAnalysisSchema.index({ tags: 1 });

// Virtual สำหรับคำนวณค่าต่างๆ
routeAnalysisSchema.virtual('totalDistanceKm').get(function() {
  return this.analysis.totalDistance.toFixed(2);
});

routeAnalysisSchema.virtual('totalDurationHours').get(function() {
  return (this.analysis.totalDuration / 60).toFixed(1);
});

// Methods
routeAnalysisSchema.methods.incrementView = function() {
  this.usageStats.timesViewed += 1;
  this.usageStats.lastUsedAt = new Date();
  return this.save();
};

routeAnalysisSchema.methods.incrementModified = function() {
  this.usageStats.timesModified += 1;
  return this.save();
};

// Static methods
routeAnalysisSchema.statics.findByEmployee = function(employeeId) {
  return this.find({ createdBy: employeeId })
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name email');
};

routeAnalysisSchema.statics.findActiveRoutes = function() {
  return this.find({ status: 'active' })
    .sort({ createdAt: -1 });
};

const RouteAnalysis = mongoose.model('RouteAnalysis', routeAnalysisSchema);

module.exports = RouteAnalysis;