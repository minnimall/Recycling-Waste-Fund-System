const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
    content: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const ideaSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Family',
      required: true
    },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['reduce', 'reuse', 'recycle', 'diy', 'community', 'other'],
      required: true
    },
    imageUrl: String,
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Family' }],
    comments: {
      type: [commentSchema],
      default: []
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Idea', ideaSchema);
