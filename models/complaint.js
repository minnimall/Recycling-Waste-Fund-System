const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const replySchema = new Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
            required: true
        },
        replyMessage: {
            type: String,
            required: false,
            trim: true
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    },
    { _id: true }
);

const complaintSchema = new Schema(
    {
        family: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Family',
            required: true
        },
        complaintMessage: {
            type: String,
            required: true
        },
        category: {
            type: String,
            enum: ['waste', 'service', 'noise','sale', 'other'],
            required: true
        },
        image: {
            type: String,
            required: false
        },
        reply: [replySchema],
        status: {
            type: String,
            enum: ['pending', 'in-progress', 'resolved'],
            default: 'pending'
        },
        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);


const Complaint = mongoose.model('complaint', complaintSchema);
module.exports = Complaint;
