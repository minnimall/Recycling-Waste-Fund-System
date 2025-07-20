const mongoose = require('mongoose');

const IdeaSchema = new mongoose.Schema(
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
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Family', default: [] }],
    comments: {
    type: [
        {
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'Family' },
        content: String,
        createdAt: { type: Date, default: Date.now }
        }
    ],
    default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Idea', IdeaSchema);
