const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const NotificationSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true, // ใครเป็นผู้ได้รับแจ้งเตือน
//   },
  userId: {
    type: String, // <- แก้จาก ObjectId เป็น String
    required: true
  },
  type: {
    type: String,
    enum: ['system', 'message', 'request', 'announcements','purchase','price_update','round'],
    default: 'system',
  },
  title: {
    type: String,
    required: true, // หัวข้อแจ้งเตือน
    trim: true,
  },
  content: {
    type: String,
    required: true, // รายละเอียดแจ้งเตือน
    trim: true,
  },
  link: {
    type: String, // URL สำหรับกดเข้าไปดูรายละเอียด
    default: null,
  },
  metadata: {
    type: Object, // เก็บข้อมูลเสริม เช่น { postId: "123", commentId: "456" }
    default: {},
  },
  read: {
    type: Boolean,
    default: false, // false = ยังไม่อ่าน
  },
  createdAt: {
    type: Date,
    default: Date.now, // วันที่สร้าง
  }
}, {
  versionKey: false
});

// เพิ่ม index เพื่อให้ query เร็วขึ้น โดยเฉพาะเวลารายการเยอะ
NotificationSchema.index({ userId: 1, createdAt: -1 });

// ✅ ตั้งชื่อโมเดลให้ชัดเจน
const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = Notification;
