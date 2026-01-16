const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: String, // <- แก้จาก ObjectId เป็น String
    required: true
  },
  type: {
    type: String,
    enum: ['system', 'message', 'request', 'announcements','purchase','price_update','round','complaint-reply','funeral_deduction','funeral_approved','funeral_deduction','funeral_rejected'],
    default: 'system',
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  link: {
    type: String,
    default: null,
  },
  metadata: {
    type: Object,
    default: {},
  },
  read: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, {
  versionKey: false
});

NotificationSchema.index({ userId: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = Notification;
